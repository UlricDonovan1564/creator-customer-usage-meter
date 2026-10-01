import { z } from "zod";

export const deliveryEvent = z.object({
  customerId: z.string().min(1),
  eventId: z.string().min(1),
  kind: z.enum(["digital_asset_delivery", "subscriber_update", "content_processing"]),
  units: z.number().int().positive()
}).strict();

export type DeliveryEvent = z.infer<typeof deliveryEvent>;

export class CustomerMeter {
  private readonly events = new Map<string, DeliveryEvent>();

  record(event: DeliveryEvent) {
    const previous = this.events.get(event.eventId);
    if (previous && JSON.stringify(previous) !== JSON.stringify(event)) {
      throw new Error("eventId already belongs to a different event");
    }
    if (!previous) this.events.set(event.eventId, event);

    const totals = {
      digital_asset_delivery: 0,
      subscriber_update: 0,
      content_processing: 0
    };
    for (const item of this.events.values()) {
      if (item.customerId === event.customerId) totals[item.kind] += item.units;
    }
    return { customerId: event.customerId, accepted: !previous, totals };
  }
}
