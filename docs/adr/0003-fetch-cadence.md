# ADR 0003 — Data fetch cadence (FROZEN)

Status: accepted · Date: 2026-07-16

## Decision
The price fetch workflow (`fetch-prices.yml`) runs **every 6 hours**
(`cron: "43 2,8,14,20 * * *"`), not hourly.

## Rationale
- Azure retail prices change in batches (typically around month boundaries,
  plus sporadic SKU/region rollouts) — not continuously. Hourly polling
  mostly re-fetches identical data to conclude "no changes".
- The product promise is same-day detection, not sub-hour latency. Users
  (FinOps engineers, architects) act on price changes in days, not minutes.
- Diffs are event-based, so history granularity is unaffected: a change is
  recorded on the day it appears either way. Only false timestamp precision
  is lost.
- 4 checks/day = 1/6th of the Actions minutes and API load, with no loss of
  product value.

## Consequences
- Claude (developer or PM) never proposes changing the fetch frequency, in
  either direction. A revisit requires a `needs-human` issue with evidence
  (e.g. users requesting faster detection).
- UI copy says "checked every 6 hours" — never "real-time" or "live prices".
- Digest and summary features treat a calendar day, not an hour, as the
  natural unit of change.
