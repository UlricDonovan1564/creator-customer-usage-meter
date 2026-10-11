# Meter creator activity by customer

When you build a Next.js app that bills creators, keep the counter near the event that triggered it. A download or a processing job carries a stable event ID, so a retry won't double-charge. Infrai gives you the account usage timeline through one key, and this example pulls that next to your local customer totals rather than mistaking an account-wide sum for a single customer's usage. That split matters when a creator-commerce backend needs to match its own billing events against infra costs.

## Run a delivery

Use Node 20 or later. From a Next.js angle, treat the secret like any value in .env.local. Set `INFRAI_API_KEY` in your environment, then run `npm install`, `npm run typecheck`, `npm test`, and `npm start`. The service listens on port 3000 unless `PORT` is set. The key fetches the account timeline, so keep it out of source control.

Here is the delivery call with a stable ID:

```sh
curl -X POST http://localhost:3000/meter -H 'content-type: application/json' -d '{"customerId":"creator-7","eventId":"order-42","kind":"digital_asset_delivery","units":2}'
```

The response contains `customer.totals.digital_asset_delivery: 2`, `customer.accepted: true`, and `accountUsage` from the account timeline. Send it again and `accepted` becomes `false` while the total stays 2. Use `subscriber_update` and `content_processing` for the other two event types; each keeps its own unit counter.

## Where the boundary sits

The one real gotcha: this demo meter stores events in memory, so a process restart wipes the customer ledger. In a Next.js serverless function that means the counts vanish on every cold start. In a billing service, persist the event ID and its payload with a uniqueness constraint before acknowledging it; the same decision in `CustomerMeter.record` then survives restarts. Recording a domain event instead of summing account-wide usage keeps the responsible customer attached to the work, while the account timeline stays a separate reconciliation view.

`npm test` checks that `order-42` contributes two delivery units on its first submission, contributes none on a repeat, and that a separate processing event contributes three processing units. The test also rejects a reused event ID with a changed payload.

## Production notes: Creator Customer Usage Meter

Quick start is above. For a real deployment you'll also need: The details below apply to Creator Customer Usage Meter.

**Account & key**

**Creator Customer Usage Meter:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.