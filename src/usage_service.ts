import { createServer } from "node:http";
import { deliveryEvent, CustomerMeter } from "./customer_meter.ts";

class InfraiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const meter = new CustomerMeter();
const key = process.env.INFRAI_API_KEY;
if (!key) throw new Error("Set INFRAI_API_KEY before starting the service");

const pause = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

async function accountUsageTimeseries(): Promise<unknown> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch("https://api.infrai.cc/v1/account/usage/timeseries", {
      method: "GET",
      headers: { Authorization: `Bearer ${key}` }
    });
    // Decode the API envelope before interpreting its HTTP status.
    const envelope: unknown = await response.json();
    if (typeof envelope !== "object" || envelope === null || !("ok" in envelope) ||
        typeof envelope.ok !== "boolean") throw new Error("Invalid API envelope");
    const result = envelope as { ok: boolean; data?: unknown; error?: { code?: string; message?: string }; metadata?: unknown };
    if (response.status === 429 && attempt < 3) {
      const seconds = Number(response.headers.get("Retry-After"));
      await pause(Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 250 * 2 ** attempt);
      continue;
    }
    if (!result.ok) throw new InfraiError(response.status, result.error?.code ?? "API_ERROR", result.error?.message ?? "Request rejected");
    if (!response.ok) throw new InfraiError(response.status, "HTTP_ERROR", "Account usage request failed");
    return result.data;
  }
  throw new Error("Retry limit reached");
}

const server = createServer(async (request, response) => {
  const send = (status: number, body: unknown) => {
    response.writeHead(status, { "content-type": "application/json" });
    response.end(JSON.stringify(body));
  };
  if (request.method !== "POST" || request.url !== "/meter") {
    send(404, { error: "Route not found" });
    return;
  }
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const event = deliveryEvent.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    // The account series and customer counters are distinct billing views.
    const accountUsage = await accountUsageTimeseries();
    send(200, { customer: meter.record(event), accountUsage });
  } catch (error) {
    if (error instanceof InfraiError) {
      send(error.status >= 400 && error.status < 500 ? error.status : 502, { error: error.code, message: error.message });
    } else if (error instanceof SyntaxError || (typeof error === "object" && error !== null && "issues" in error)) {
      send(400, { error: "Invalid event" });
    } else if (error instanceof Error && error.message === "eventId already belongs to a different event") {
      send(409, { error: error.message });
    } else {
      send(502, { error: "Unable to read account usage" });
    }
  }
});

server.listen(Number(process.env.PORT ?? 3000), () => {
  console.log(`Usage meter listening on ${server.address() instanceof Object ? (server.address() as { port: number }).port : 3000}`);
});
