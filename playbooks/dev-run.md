# Playbook: scheduled development run

Executed on a schedule by GitHub Actions. Goal: advance the project by
exactly ONE unit of work, leaving the repository green.

## Step 0 — Orient (always)
- Read `CLAUDE.md` in full.
- Read the last 3 entries of `journal.md`.
- Run `gh pr list --author "@me"` — if a previous run's PR is open and CI
  failed on it, fixing that PR is your task this run (skip to Step 2 on that
  branch).

## Step 1 — Choose the task (exactly one)
Priority order:
1. `main` branch CI is red -> task = fix it.
2. An open PR from a previous run has failing checks -> task = fix that PR.
3. Highest-priority open issue labeled `claude-ready` (`P1` first, then
   `P2`, then `P3`; oldest first within a priority). Comment on the issue:
   "Taking this in run <run-id>." so runs never double-book.
4. Nothing above applies -> write a journal entry ("No-op: backlog empty,
   CI green") and END THE RUN. Do not invent work. A no-op is a valid,
   successful run.

## Step 2 — Implement
- Branch: `claude/issue-<number>-<short-slug>` from latest `main`.
- Stay strictly inside the issue's scope. Anything you notice that is out of
  scope: open a new issue (no label — the PM triages it), don't fix it now.
- Respect every ADR in `docs/adr/`. Respect the frozen zones — never modify
  `data/`, `scripts/`, `.github/workflows/`, or `CLAUDE.md` unless THIS
  issue explicitly carries the exception to do so.
- Consult the relevant project skills in `.claude/skills/` when the task
  matches (chart work -> chart-design; anything reading `data/` ->
  data-reading; summaries/digests -> changelog-writing).
- Keep the diff under ~500 changed lines (excluding lockfiles/generated
  files). If the issue needs more, your task instead becomes: split it into
  smaller issues (create them, label `claude-ready`), journal it, and end.

## Step 3 — Verify (definition of done)
All of the following must pass locally before you open the PR:
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

If the issue is UI-facing: run the app, take screenshots of the affected
views at BOTH desktop and 390px width, and attach them to the PR. Design,
mobile, and performance are acceptance criteria, not afterthoughts (see the
vision's items 6-8).

## Step 4 — Ship
- Commit(s) following Conventional Commits, referencing the issue.
- Append your journal entry to `journal.md` on the SAME branch (format
  below), so it lands in the PR.
- Push and open a PR: title = issue title; body = what / why / how tested;
  screenshots if UI; and "Closes #<number>".
- Enable auto-merge on the PR: `gh pr merge <number> --auto --squash`.
  Never merge directly to `main` — auto-merge fires only once CI is green.
  The human handles anything that can't go green.

## Journal entry format
```
## <UTC date-time> — run <run-id>
- Task: #<issue> <title> (or "no-op" / "CI fix")
- Did: <2-4 lines: what changed and why>
- Decisions: <any judgment call you made, or "none">
- Noticed for later: <observations, or "nothing">
```

## Failure behavior
- Can't make the checks pass after honest attempts -> push the branch as a
  DRAFT PR titled "WIP (blocked): ...", explain what's blocking in the PR
  body, label the issue `needs-human`, journal it, end the run.
- Anything ambiguous in the issue -> comment your question on the issue,
  label it `needs-human`, pick NOTHING else, journal, end the run.
- A frozen zone needs changing but the issue grants no exception -> do not
  touch it; open a `needs-human` issue describing what's needed, journal,
  end the run.

## Hard limits
- ONE task per run. Never start a second issue in the same run.
- Never force-push. Never push code directly to `main` — everything ships
  via PR + auto-merge.
- Never delete or rewrite anything in `data/` or past `journal.md` entries.
- Never modify `.github/workflows/` (you cannot push workflow files anyway;
  put the full file content in a `needs-human` issue for the human to apply).
