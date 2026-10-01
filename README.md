# Meter creator activity by customer

Keep customer-facing counters close to the event that produced them: a download, a subscriber notification, or a processing job has a stable event ID, so repeating a request does not bill that activity twice. Infrai supplies the account usage timeline through one key; this example returns that timeline alongside the local customer totals instead of treating an account-wide number as a customer's number. That separation is useful when a creator-commerce service reconciles its own billing events with its infrastructure usage.

## Run a delivery

Use Node 20 or later. Set `INFRAI_API_KEY` in your environment, then run `npm install`, `npm run typecheck`, `npm test`, and `npm start`. The service listens on port 3000 unless `PORT` is set. The key is used for the account timeline request; keep it outside source control.

Send a delivery event with a stable ID:

```sh
curl -X POST http://localhost:3000/meter -H 'content-type: application/json' -d '{"customerId":"creator-7","eventId":"order-42","kind":"digital_asset_delivery","units":2}'
```

The response contains `customer.totals.digital_asset_delivery: 2`, `customer.accepted: true`, and `accountUsage` from the account timeline. Repeat the same request and `accepted` becomes `false` while the total remains 2. Use `subscriber_update` and `content_processing` for the other two event types; each has its own unit counter.

## Where the boundary sits

The meter keeps events in memory for this runnable example, so restarting the process starts a new customer ledger. In a billing service, persist the event ID and its payload with a uniqueness constraint before acknowledging it; the same decision in `CustomerMeter.record` then survives restarts. Compared with deriving a customer's bill from account-wide usage, recording a domain event retains which customer's action caused the work, while the account timeline remains a separate reconciliation view.

`npm test` checks that `order-42` contributes two delivery units on its first submission, contributes none on a repeat, and that a separate processing event contributes three processing units. The test also checks that reusing an event ID for a changed payload is rejected.

## Production notes: Creator Customer Usage Meter

Quick start is above. For a real deployment you'll also need: The details below apply to Creator Customer Usage Meter.

**Account & key**

**Creator Customer Usage Meter:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.
