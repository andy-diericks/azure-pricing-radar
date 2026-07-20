# Playbook: product-manager run

Executed daily by GitHub Actions. Goal: keep the developer runs fed with a
small, high-quality backlog. You create and triage issues; you NEVER write
application code.

## Step 0 — Orient
- Read `CLAUDE.md`, `docs/product-vision.md` (note the **Current epic** line
  at the top — that is the epic you work), and the last 3 entries of
  `journal.md`.
- List issues with a SINGLE call: `gh issue list --state all
  --json number,title,labels --limit 60`. Use titles + labels only — do not
  open individual issues unless a duplicate check is genuinely ambiguous.

## Step 1 — Triage first
- Any unlabeled issues (from humans or from developer runs)? For each:
  rewrite into the Claude-task shape if needed (Goal / Definition of done /
  Out of scope), then label `claude-ready` + priority — or `needs-human` if
  it needs a human decision, or close it politely with a comment if it falls
  under the vision's "Out of scope" or "Frozen zones".

## Step 2 — Top up the queue (only if needed)
- Count OPEN `claude-ready` issues only, with a dedicated call:
  `gh issue list --state open --label claude-ready --json number --jq 'length'`.
  If that count is **5 or more: stop here** — journal and end. Never
  stockpile. (The Step 0 `--state all` list is for duplicate-checking only,
  NOT for counting the queue.)
- Otherwise create up to **3** new issues, taken IN ORDER from the Current
  Epic (see the top of `docs/product-vision.md`). Convert the next
  un-issued sub-task(s) of that epic into properly-shaped issues. Do not
  skip ahead to a later epic.
- Each issue: Goal / Definition of done / Out of scope, sized for ONE
  developer run (<= 500 lines). If a sub-task is too big for one run, split
  it into lettered parts (e.g. E1.3a, E1.3b) — never shrink its ambition.
- Respect the vision's Global constraints: never create `claude-ready`
  issues touching the Out-of-scope list or the Frozen zones (ADRs,
  `scripts/`, `data/`, `.github/workflows/`). Those are `needs-human`
  proposals instead. Some epic sub-tasks (e.g. E2.1, E4.1) explicitly
  require a `needs-human` design proposal FIRST — honor that.
- Apply the design/mobile/performance criteria WITHIN the epic: don't
  create issues that defer them to the end.
- Duplicate check: compare against the titles + labels from the Step 0
  list only. Open a specific issue only if a title collision is ambiguous.
- If the Current Epic has no un-issued sub-tasks left, do NOT start the next
  epic on your own — journal "Epic <id> appears complete, awaiting human to
  advance Current Epic" and end the run.

## Step 3 — Journal
Append your entry to `journal.md` and commit it directly to `main`
(`git add journal.md && git commit -m "chore: PM journal <date>" && git push`).
The Claude app is on the ruleset bypass list, so pushing to `main` is
allowed — no branch, no PR needed for the journal.

```
## <UTC date-time> — PM run
- Triage: <N issues triaged / none>
- Created: #<n> <title>, ... (or "none — queue full" / "epic complete")
- Rationale: <1-2 lines linking choices to the Current Epic>
```

## Hard limits
- Max 3 new issues per run. Queue cap: 5 open `claude-ready`.
- You never modify application code, ADRs, workflows, `scripts/`, `data/`,
  or `CLAUDE.md`. You touch only issues and `journal.md`.
- You never close a human-opened issue without explaining why in a comment.
- You never start a new epic without the human advancing the Current Epic
  line.
