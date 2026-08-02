# ADR 0004 — Reservation and Savings-Plan Pricing Support

Status: proposed · Date: 2026-08-02

## Context

The Azure Retail Prices API exposes three price types for a given SKU:

- `Consumption` — pay-as-you-go (PAYG), billed per hour of use.
- `Reservation` — 1-year or 3-year upfront commitments that provide
  significant discounts vs PAYG (typically 30–60 % for VMs).
- Savings plan — flexible 1-year or 3-year spend commitments; discounts
  smaller than reservations but no instance-size lock-in.

The dashboard currently tracks only `Consumption` prices. Issues #121–#123
(Epic E4) add support for the other tiers so users can see their effective
discount over time.

This ADR documents the design options and extends the data contract in
`docs/api-notes.md` once an option is chosen.

---

## API mechanics

### Reservation items

Reservation prices are separate top-level items in the API response with
`priceType = "Reservation"` and a `reservationTerm` field. They share the
same `skuId`/`meterId` as the corresponding Consumption item but are
returned only when `priceType eq 'Reservation'` is in the `$filter`.

Example queries (same `api-version=2023-01-01-preview` already in use):

```
# 1-year VM reservations — West Europe
$filter=serviceName eq 'Virtual Machines'
  and armRegionName eq 'westeurope'
  and priceType eq 'Reservation'
  and reservationTerm eq '1 Year'

# 3-year VM reservations — West Europe
$filter=serviceName eq 'Virtual Machines'
  and armRegionName eq 'westeurope'
  and priceType eq 'Reservation'
  and reservationTerm eq '3 Years'
```

Example response item (abbreviated):

```json
{
  "skuId": "DZH318Z08KCH/0045",
  "meterId": "a1b2c3d4-...",
  "skuName": "D2s v5",
  "productName": "Virtual Machines Dsv5 Series",
  "armRegionName": "westeurope",
  "retailPrice": 0.0592,
  "unitPrice": 0.0592,
  "unitOfMeasure": "1 Hour",
  "priceType": "Reservation",
  "reservationTerm": "1 Year",
  "type": "Reservation",
  "savingsPlan": []
}
```

Key observation: `reservationTerm` is already present in `KEY_FIELDS` in
`fetch_prices.py` (`("skuId", "meterId", "type", "reservationTerm")`), so
the snapshot keying logic handles reservation items without code changes.

### Savings-plan data

Savings-plan prices are **nested** inside each Consumption response item
under a `savingsPlan` array (requires `api-version=2023-01-01-preview`,
already in use):

```json
{
  "skuName": "D2s v5",
  "retailPrice": 0.096,
  "priceType": "Consumption",
  "savingsPlan": [
    { "term": "1 Year", "retailPrice": 0.0672, "unitPrice": 0.0672 },
    { "term": "3 Years", "retailPrice": 0.0576, "unitPrice": 0.0576 }
  ]
}
```

Savings-plan prices do **not** appear as top-level items; they cannot be
fetched via a `priceType eq 'SavingsPlan'` filter.

---

## Design options

### Option A — New parallel scope files (no format change)

Add new entries to `SCOPES` for each reservation term:

```python
"vm-eu-west-res-1yr": (
    "serviceName eq 'Virtual Machines' and armRegionName eq 'westeurope'"
    " and priceType eq 'Reservation' and reservationTerm eq '1 Year'"
),
"vm-eu-west-res-3yr": (
    "serviceName eq 'Virtual Machines' and armRegionName eq 'westeurope'"
    " and priceType eq 'Reservation' and reservationTerm eq '3 Years'"
),
```

Creates `data/latest/vm-eu-west-res-1yr.json` etc. alongside existing files.
`build-sku-index.js` reads all reservation scope files and joins them to
existing `SkuRegion` entries by `(skuName, armRegionName)`, populating the
already-declared `reservationPrice1yr` / `reservationPrice3yr` fields in
`SkuRegion`.

Savings-plan prices: extracted from the `savingsPlan` array during the
standard Consumption fetch; stored in a synthetic `vm-eu-west-savings-1yr`
scope file (same format), or attached directly during `build-sku-index.js`
without writing a separate scope file.

**Pros:** no format changes to existing files; existing diff/snapshot
machinery works unchanged; fully reversible.

**Cons:** scope count doubles for VM services (10 VM scopes → 30); each
scope file only changes when prices change, so diffs remain sparse.

### Option B — Augment existing snapshot entries

Modify `fetch_prices.py` to fetch Consumption + Reservation in a single pass
per scope and merge the results into one snapshot file:

```json
"DZH318Z08KCH/0045|a1b2...": {
  "retailPrice": 0.096,
  ...
  "reservationPrice1yr": 0.0592,
  "reservationPrice3yr": 0.0496,
  "savingsPlanPrice1yr": 0.0672,
  "savingsPlanPrice3yr": 0.0576
}
```

**Pros:** single snapshot per scope; one fetch sequence per scope.

**Cons:** breaks the existing data contract (existing snapshot keys map
`skuId|meterId|type|reservationTerm` — adding optional extra fields changes
diff semantics); makes the diff `changed` array noisier (a reservation price
change triggers a diff on the Consumption entry even though the PAYG price
did not change); changes to `KEY_FIELDS` or `TRACKED_FIELDS` must also be
documented in an ADR.

### Option C — Separate `data/reservation/` directory

A new `data/reservation/latest/<scope>.json` hierarchy mirrors
`data/latest/` but contains only reservation-price snapshots. A separate
`data/reservation/diffs/` records reservation price changes independently.

**Pros:** reservation price changes tracked with full history; no coupling
to PAYG snapshots.

**Cons:** duplicates the entire pipeline infrastructure; `build-sku-index.js`
and the dashboard must load from two data roots; roughly 2× the repo-size
growth per pipeline run.

---

## Phase 1 scope recommendation

Regardless of option chosen, limit Phase 1 to:

| Service | Regions | Terms |
|---------|---------|-------|
| Virtual Machines | All current VM regions (westeurope, belgiumcentral, northeurope, francecentral, swedencentral) | 1 Year, 3 Years |

**Why VMs only:** Azure Storage and Azure OpenAI do not have standard
1yr/3yr reservation offers in the Retail Prices API. Including them would
add zero data and unnecessary scope entries.

**Why 5 regions:** matches the current Consumption VM coverage exactly;
users can compare reservation discounts across the same regions they already
track.

---

## ADR / data-contract impact

Under Option A (or C), the existing data-contract section in
`docs/api-notes.md` remains unchanged. The new `SkuRegion` fields
(`reservationPrice1yr`, `reservationPrice3yr`, `savingsPlanPrice`) are
already declared as optional in `app/src/lib/skuIndex.ts` (added in E4.3).

Under Option B, `docs/api-notes.md` must be updated to document the new
optional fields in the snapshot format, and a dedicated ADR section should
record the changed `TRACKED_FIELDS` schema.

A new ADR is **not strictly required** for Option A — the data contract in
`api-notes.md` already covers parallel scope files. This ADR serves as the
design record; it will be updated to "accepted" status when the human
chooses an option and E4.2 implementation begins.

---

## Decision

_Pending human review. See issue #121 for the chosen option._
