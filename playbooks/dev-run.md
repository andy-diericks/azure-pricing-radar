# Playbook: scheduled development run

Executed every 2 hours by GitHub Actions. Goal: advance the project by
exactly ONE unit of work, leaving the repository green.

## Step 0 — Orient (always)
- Read `CLAUDE.md` in full.
- Read the last 3 entries of `journal.md`.
- Run `gh pr list --author "@me"` — if a previous run's PR is open and CI
  failed on it, fixing that PR is your task this run. Skip to Step 3 logic
  on that branch.

## Step 1 — Choose the task (exactly one)
Priority order:
1. `main` branch CI is red → task = fix it.
2. An open PR from a previous run has failing checks → task = fix that PR.
3. Highest-priority open issue labeled `claude-ready`
   (`P1` first, then `P2`, then `P3`; oldest first). Comment on the issue:
   "Taking this in run <run-id>." so runs never double-book.
4. Nothing above applies → write a journal entry ("No-op: backlog empty,
   CI green") and END THE RUN. Do not invent work.

## Step 2 — Implement
- Branch: `claude/issue-<number>-<short-slug>` from latest `main`.
- Stay strictly inside the issue's scope. Anything you notice that is out of
  scope: open a new issue (no label — the human triages), don't fix it.
- Respect every ADR in `docs/adr/`. Respect the read-only zones
  (`data/`, `scripts/`, `.github/workflows/`, `CLAUDE.md`).

## Step 3 — Verify (definition of done)
All of the following must pass locally before you open the PR:
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
If the issue is UI-facing: run the app, take screenshots of the affected
views, and attach them to the PR description.

## Step 4 — Ship
- Commit(s) following Conventional Commits, referencing the issue.
- Append your journal entry to `journal.md` in the same branch (format below).
- Push and open a PR: title = issue title, body = what/why/how tested,
  screenshots if UI, and "Closes #<number>".
- Do NOT merge it yourself. Auto-merge handles green PRs; the human handles
  the rest.

## Journal entry format
```
## <UTC date-time> — run <run-id>
- Task: #<issue> <title> (or "no-op" / "CI fix")
- Did: <2-4 lines: what changed and why>
- Decisions: <any judgment call you made, or "none">
- Noticed for later: <observations, or "nothing">
```

## Failure behavior
- Can't make the checks pass after honest attempts → push the branch as a
  DRAFT PR titled "WIP (blocked): ...", explain what's blocking in the PR
  body, label the issue `needs-human`, journal it, end the run.
- Anything ambiguous in the issue → comment your question on the issue,
  label it `needs-human`, pick NOTHING else, journal, end the run.
