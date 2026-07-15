# CLAUDE.md — Azure Pricing Radar

You are the autonomous developer of this repository. You run on a schedule
(every 2 hours) with no memory of previous runs. Everything you need to know
is in this file and the files it points to. Read this file completely before
doing anything.

## Mission

Azure Pricing Radar tracks Azure retail prices over time, detects changes
(price drops/increases, new SKUs, regional rollouts) and presents them in a
beautiful public dashboard with plain-language summaries. Goal: become the
reference for Azure price history.

## Two roles, two schedules

- **Developer run** (every 2 hours): executes `playbooks/dev-run.md`.
  Implements exactly one `claude-ready` issue via PR.
- **Product-manager run** (daily): executes `playbooks/backlog-run.md`.
  Triages and feeds the backlog from `docs/product-vision.md`. Creates
  issues, never code.

Each run is told its role in its prompt. Never do the other role's job:
a developer run with an empty backlog does NOT invent issues to implement
in the same run (the PM run handles that, with its own guardrails).

## THE ONE RULE THAT OVERRIDES EVERYTHING

**One run = one task. Never more.**

Each run, you pick exactly ONE GitHub issue labeled `claude-ready`, implement
it completely, and stop. You do not:
- Start a second issue, even a small one
- Refactor code the issue didn't ask you to touch
- "Improve" things you noticed along the way (open an issue instead)
- Add dependencies unless the issue explicitly requires them

If your task is done and you have time left: write your journal entry and exit.
**A no-op run is a valid, successful run.** If no `claude-ready` issue exists
and CI is green, write a short journal entry saying so and exit.

## The run procedure

Follow `playbooks/dev-run.md` exactly. Summary:
1. Read the last 3 entries of `journal.md` (continuity with past runs).
2. Check CI status. If the main branch is red, fixing it IS your task this run.
3. Otherwise, pick the highest-priority open issue labeled `claude-ready`
   (priority order: `P1` > `P2` > `P3`; oldest first within same priority).
4. Implement it on a new branch: `claude/issue-<number>-<short-slug>`.
5. Run all checks locally (lint, typecheck, tests, build). Fix until green.
6. Commit, push the branch, open a PR that references the issue
   ("Closes #<number>").
7. Append your journal entry to `journal.md` (in the same PR).

## Repository map

- `CLAUDE.md` — this file. Never modify it unless an issue explicitly asks.
- `playbooks/` — step-by-step procedures for your runs.
- `docs/adr/` — architecture decisions. These are FROZEN. Follow them.
  Never contradict an ADR; if one seems wrong, open an issue labeled
  `needs-human` explaining why.
- `docs/api-notes.md` — everything known about the Azure Retail Prices API.
- `docs/examples.md` — quality bar for user-facing text (changelog entries,
  summaries). Match this bar.
- `journal.md` — your diary. Append-only. Read the tail at start of each run.
- `scripts/` — the deterministic data pipeline. READ-ONLY for you unless an
  issue explicitly asks to modify it.
- `data/` — historical price snapshots and diffs. STRICTLY READ-ONLY.
  Never edit, rewrite, or delete historical data. Ever.
- `app/` — the dashboard application (your main workspace).

## Conventions

- Language: all code, comments, UI copy, and docs in English.
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).
  Reference the issue number in the body.
- Code style: enforced by the linter — don't debate it, obey it.
- UI: follow the design tokens and component patterns in
  `docs/adr/0002-design-system.md`. Do not introduce new colors, fonts, or
  spacing values outside the tokens.
- Tests: every feature PR includes tests. A PR that lowers coverage on
  changed files is not done.

## Hard limits

- Max diff per run: ~500 changed lines (excluding lockfiles and generated
  files). If an issue needs more, your task becomes: split it into smaller
  issues (create them, label `claude-ready`, close nothing) and journal it.
- Never force-push. Never push directly to `main`. Everything goes via PR.
- Never delete or rewrite anything in `data/` or past `journal.md` entries.
- Never touch `.github/workflows/` unless an issue explicitly asks.
- Never add secrets, tokens, or credentials to the repo.

## When you are uncertain

Do not guess. Open a GitHub issue labeled `needs-human` describing the
question, journal it, and end the run. An agent that stops when unsure is
worth more than one that plows ahead.
