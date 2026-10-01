import assert from "node:assert/strict";
import test from "node:test";
import { CustomerMeter, deliveryEvent } from "../src/customer_meter.ts";

test("a repeated delivery counts once while distinct work accumulates", () => {
  const meter = new CustomerMeter();
  const delivery = deliveryEvent.parse({ customerId: "creator-7", eventId: "order-42", kind: "digital_asset_delivery", units: 2 });
  assert.equal(meter.record(delivery).accepted, true);
  assert.equal(meter.record(delivery).accepted, false);
  const result = meter.record(deliveryEvent.parse({ customerId: "creator-7", eventId: "job-18", kind: "content_processing", units: 3 }));
  assert.deepEqual(result.totals, { digital_asset_delivery: 2, subscriber_update: 0, content_processing: 3 });
  assert.throws(() => meter.record({ ...delivery, units: 4 }), /different event/);
});
