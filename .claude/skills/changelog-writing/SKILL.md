---
name: changelog-writing
description: How to turn data/diffs into user-facing changelog entries and digests — reading diff files, computing percentages, wording standards. Use for any task that writes summaries, digest entries, or human-readable descriptions of price changes.
---

# Writing changelog entries and digests

Quality bar: `docs/examples.md` — read it first; match the GOOD examples,
never the BAD ones. This skill adds the mechanics.

## Reading the source data
- Diffs live in `data/diffs/<YYYY-MM-DD>/<HHMM>-<scope>.json` with shape
  `{scope, at, added[], removed[], changed[{key, before, after}]}`.
  Schema details: `docs/api-notes.md`.
- A "day" of changes = all diff files under that date folder, all scopes.
- `changed` entries: compute `pct = (after.retailPrice - before.retailPrice)
  / before.retailPrice * 100`. Round to 1 decimal. Guard against
  `before.retailPrice === 0` (report as "from free" instead of a %).

## What makes an entry
- One sentence when possible. Structure: WHAT (SKU family + region) →
  HOW MUCH (% and/or absolute) → CONTEXT only if the data shows it
  ("first decrease since <date>" requires checking earlier diffs — only
  claim it if verified).
- Group, don't enumerate: 12 SKUs of the same family moving together is
  ONE entry ("12 Dasv7 SKUs..."), never 12 entries.
- Order within a digest: biggest absolute % first; decreases before
  increases at equal magnitude; new SKUs last.
- Thresholds: ignore changes under 0.5% (rounding noise) unless the SKU
  is high-profile (GPU, Azure OpenAI). If a day has nothing above
  threshold, the digest says exactly that in one line — never pad.

## Wording rules
- State only what the diff shows. No speculation about Microsoft's
  motives, strategy, or future moves. No advice ("now is a good time to
  buy") — we report, we don't recommend.
- Neutral verbs: "dropped", "rose", "appeared", "was removed". Banned:
  "slashed", "skyrocketed", "huge", exclamation marks.
- Regions by their display name ("West Europe"), not ARM name
  ("westeurope"). Prices via the shared formatter, with the unit
  ("per GiB/month", "per 1K tokens").
- Max 1 emoji per digest, only in the title line if at all.

## Definition of done
Every generated entry traces back to a specific diff file. Spot-check
your own output: recompute one percentage by hand before shipping.
