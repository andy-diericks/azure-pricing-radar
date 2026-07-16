# 📊 Azure Pricing Radar

> The missing price history for Azure.

Microsoft publishes Azure retail prices, but not their **history**. When a
VM gets cheaper, a new SKU family appears, or Azure OpenAI token prices move
in one region and not another — that information exists for a moment, then
vanishes into the next price sheet.

**Azure Pricing Radar** records it. Every 6 hours, it checks the public
[Azure Retail Prices API](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices),
detects what changed — price drops, increases, new SKUs, regional rollouts —
and keeps the full history in this repository, visualized in a live
dashboard.

**🔗 Live dashboard:** https://andy-diericks.github.io/azure-pricing-radar/

<!-- screenshot of the dashboard here -->

## 🤖 The twist: an AI builds this

This repository is autonomously maintained and developed by
[Claude Code](https://code.claude.com), running on GitHub Actions:

| Agent | Schedule | Job |
|---|---|---|
| 📥 Data pipeline | every 6h | Fetch scoped prices, diff against last snapshot, commit changes (deterministic, no AI) |
| 🧑‍💻 AI developer | every 4h | Pick exactly **one** `claude-ready` issue, implement it, open a PR, log it in the journal |
| 📋 AI product manager | daily | Triage issues and top up the backlog from the [product vision](docs/product-vision.md) |

The developer works under a strict constitution ([CLAUDE.md](CLAUDE.md)):
one task per run, everything via pull request, frozen architecture decisions
([docs/adr/](docs/adr/)), and a hard rule that doing nothing is better than
inventing work. Every run writes a diary entry —
**read the [development journal](journal.md)** to watch the project build
itself, decision by decision.

A human (hi 👋) reviews pull requests, answers the agent's questions
(issues labeled `needs-human`), and steers by editing the product vision.

## 🔍 What it tracks today

- **Virtual Machines** — West Europe
- **Storage** — West Europe
- **Azure OpenAI** — West Europe, Sweden Central, France Central

Scopes grow deliberately over time. Want one added? Open an issue.

## ⚙️ How the data works

- `data/latest/` — current snapshot per scope
- `data/diffs/<date>/` — every detected change, timestamped: additions,
  removals, and price moves with before/after values
- The dashboard is a static site (Vite + React) built from this data —
  no backend, no tracking, no accounts

Prices are checked every 6 hours ([why not more often?](docs/adr/0003-fetch-cadence.md)) —
this is a radar for same-day detection, not a real-time ticker.

## 🤝 Contributing

The best contribution is a **well-written issue**: the AI developer works
from the backlog, so a clear Goal + Definition of done (see the "Claude
task" template) often becomes shipped code within hours. Human pull
requests are welcome too — CI treats everyone equally.

## 📜 License

MIT — data is sourced from Microsoft's public Retail Prices API.
