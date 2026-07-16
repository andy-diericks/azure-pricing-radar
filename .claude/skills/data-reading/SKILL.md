---
name: data-reading
description: How to read the data/ folder — snapshot and diff schemas, key format, performance gotchas. Use for any task that loads, parses, or displays files from data/ (tables, charts, digests, stats).
---

# Reading the price data correctly

Authoritative schema doc: `docs/api-notes.md` ("Our data layout"). This
skill covers the practical rules for consuming it. `data/` is strictly
read-only — the fetch pipeline is its only writer.

## The two shapes
- `data/latest/<scope>.json` — CURRENT state. An object keyed by
  `skuId|meterId|type|reservationTerm`, values:
  `{retailPrice, unitPrice, unitOfMeasure, productName, skuName, meterName, armRegionName}`.
  Point-in-time only: it holds no history.
- `data/diffs/<YYYY-MM-DD>/<HHMM>-<scope>.json` — CHANGES. History is
  reconstructed by replaying diffs in chronological order, per key.

## Gotchas
- The composite key's pipe-separated parts can contain empty segments
  (e.g. no reservationTerm) — split carefully, don't assume 4 non-empty
  parts.
- Diff files exist ONLY for hours where something changed. Absence of a
  file means "no changes", never "no data". Don't render gaps as zeros.
- `removed` in a diff means the SKU left the API feed — show as
  "delisted", not as price 0.
- Scopes are independent files; never assume all scopes have the same
  keys or the same diff timestamps.
- Timestamps in diffs are UTC. Convert only at display time.

## Performance rules (the site must stay fast)
- Never load all diff files eagerly. The app builds/consumes a compact
  index; heavy per-SKU history loads lazily on interaction.
- Prefer build-time aggregation: anything computable at build (daily
  summaries, per-SKU series) should be precomputed by the app's build
  step into small JSON artifacts, not recomputed in the browser.
- `latest/` files can be large — never ship them to the client whole;
  the build step extracts what a view needs.
- If a computation feels slow, measure first (log timings), optimize
  second. Never "optimize" unmeasured code.

## When data looks wrong
Don't "fix" data or the pipeline. Open an issue labeled `needs-human`
describing exactly which file and key look anomalous, and journal it.
