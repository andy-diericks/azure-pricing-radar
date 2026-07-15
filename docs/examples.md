# Quality bar — user-facing text

Claude matches this bar for all changelog entries, summaries, and UI copy.

## Changelog entries

GOOD:
- "Premium SSD v2 (West Europe): −8.2% on per-GiB rate — first decrease since Jan 2026."
- "12 new Dasv7 SKUs appeared in Sweden Central; pricing matches West Europe at launch."
- "Azure OpenAI GPT-4o input tokens: +4% in France Central; other EU regions unchanged."

BAD (never ship these):
- "Some prices changed." (no substance)
- "Microsoft has adjusted its pricing strategy." (speculation)
- "HUGE price drop!!! 🔥" (clickbait tone)

## Rules
- Numbers first: percentage, region, SKU family. One sentence when possible.
- State only what the diff shows. Never speculate about Microsoft's intent.
- Neutral, precise, lightly human. No exclamation marks, max 1 emoji per digest.
