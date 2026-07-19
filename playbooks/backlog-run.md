# Playbook: product-manager run

Executed daily by GitHub Actions. Goal: keep the developer runs fed with a
small, high-quality backlog. You create issues; you NEVER write code.

## Step 0 — Orient
- Read `CLAUDE.md`, `docs/product-vision.md`, the last 3 entries of
  `journal.md`, and the list of open + recently closed issues.
  - List issues with a single call: `gh issue list --state all
  --json number,title,labels --limit 60`. Use titles + labels only —
  do not open individual issues unless a duplicate check is ambiguous.

## Step 1 — Triage first
- Any unlabeled issues (from humans or from developer runs)? For each:
  rewrite into the Claude-task shape if needed (Goal / Definition of done /
  Out of scope), then label `claude-ready` + priority — or `needs-human` if
  it requires a human decision, or close it politely if out of scope per the
  vision (explain why in a comment).

# Step 2 — Top up the queue (only if needed)
- Count open `claude-ready` issues. If **5 or more: stop here** — write your
  journal entry and end the run. Never stockpile.
- Otherwise create up to **3** new issues, taken IN ORDER from the current
  epic in the "Features & epics" section of `docs/product-vision.md`
  (finish an epic's sub-tasks before starting the next epic). Convert the
  next un-issued sub-task(s) into properly-shaped issues.
- Every issue must be: one run of work (≤500 lines), with a checkable
  definition of done and an out-of-scope line. Big ideas get split.
- Never create issues that touch the out-of-scope list in the vision, the
  frozen ADRs, `data/`, or `scripts/` (scope extensions to the data pipeline
  are `needs-human` proposals, not `claude-ready` tasks).
- Duplicate check: compare against the titles + labels from the Step 0
  list only. Open a specific issue only if a title collision is ambiguous.

# Step 3 — Journal
Append your entry to `journal.md` and commit it directly to `main`
(`git add journal.md && git commit -m "chore: PM journal <date>" && git push`).
The Claude app is on the ruleset bypass list, so pushing to `main` is
allowed — no branch, no PR needed for the journal.

```
## <UTC date-time> — PM run
- Triage: <N issues triaged / none>
- Created: #<n> <title>, ... (or "none — queue full")
- Rationale: <1-2 lines linking choices to the current epic>
```

## Hard limits
- Max 3 new issues per run. Queue cap: 5 open `claude-ready`.
- You never modify code, ADRs, workflows, or CLAUDE.md.
- You never close issues a human opened without explaining why.
- Duplicate check before creating: search existing open/closed issues first.
