# 📊 Azure Pricing Radar

> The missing price history for Azure.

Tracks Azure retail prices over time, detects price drops, increases, new
SKUs and regional rollouts — visualized in a live dashboard with
plain-language summaries.

**The twist:** this repository is autonomously maintained and improved by
[Claude Code](https://code.claude.com) every 2 hours. Read its
[development journal](journal.md) to watch it build.

<!-- Screenshot of the dashboard goes here as soon as it exists (issue #2) -->

## How it works

1. ⏱️ **Every hour** — a deterministic GitHub Action pulls scoped data from the
   public [Azure Retail Prices API](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices),
   diffs it against the last snapshot, and commits changes to `data/`.
2. 🤖 **Every 2 hours** — Claude Code wakes up, picks exactly one
   `claude-ready` issue from the backlog, implements it via PR, and logs what
   it did in [`journal.md`](journal.md).
3. 🧑‍💻 **The human** — feeds the backlog, reviews the journal, merges what
   auto-merge didn't.

## Current data scopes

Virtual Machines (West Europe) · Storage (West Europe) · Azure OpenAI (EU regions).
More scopes are added incrementally — suggest one by opening an issue.

## Contributing

Open an issue! The autonomous developer works from the backlog, so a
well-written issue (see the "Claude task" template) is the best contribution.
Human PRs are welcome too.

## License

MIT
