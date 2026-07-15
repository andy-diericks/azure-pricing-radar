# Azure Retail Prices API — field notes

Endpoint: `https://prices.azure.com/api/retail/prices`
Auth: **none** (public, unauthenticated).
Docs: https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices

## Key behaviors
- Pagination via `NextPageLink` in the response body; ~100 items per page.
  Follow it until null. Large scopes = many pages; keep filters tight.
- Filtering: OData `$filter` on fields like `serviceName`, `armRegionName`,
  `priceType`, `skuName`, `serviceFamily`. String comparisons are
  case-sensitive.
- `priceType` values: `Consumption`, `Reservation`, `DevTestConsumption`.
  We track `Consumption` by default (reservations have `reservationTerm`).
- Currency defaults to USD. Other currencies via `currencyCode='EUR'`
  query parameter — NOT part of `$filter`.
- The full catalog is ~600k+ items. Never fetch unscoped.
- `meterId` + `skuId` + `type` (+ `reservationTerm`) is the practical
  uniqueness key we use — see `scripts/fetch_prices.py` (`KEY_FIELDS`).
- Savings plan data appears under a nested `savingsPlan` array with
  api-version `2023-01-01-preview`.
- The API occasionally returns transient 5xx; the fetch workflow simply
  retries next hour — do not build complex retry logic.

## Our data layout (contract — do not change without an ADR)
- `data/latest/<scope>.json` — current snapshot per scope,
  `{ "<key>": {retailPrice, unitPrice, unitOfMeasure, productName, skuName, meterName, armRegionName} }`
- `data/diffs/<YYYY-MM-DD>/<HHMM>-<scope>.json` —
  `{scope, at, added[], removed[], changed[{key, before, after}]}`
- The dashboard reads ONLY from `data/`. It never calls the Azure API
  directly (keeps the app static and fast).
