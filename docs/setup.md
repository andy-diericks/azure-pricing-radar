# One-time setup (human)

## 1. Create the repo and push
    git init && git add -A && git commit -m "chore: bootstrap autonomous repo"
    git branch -M main
    git remote add origin https://github.com/<you>/azure-pricing-radar.git
    git push -u origin main

## 2. Install the Claude GitHub App
From a local Claude Code session in the repo folder, as repo admin:
    /install-github-app
This installs the app and stores ANTHROPIC_API_KEY as a repo secret.
(Manual alternative: Settings → Secrets and variables → Actions → add
ANTHROPIC_API_KEY, and install the Claude GitHub App on the repo.)

## 3. Create labels
    gh label create claude-ready --color 1D76DB --description "Ready for the autonomous developer"
    gh label create needs-human  --color D93F0B --description "Blocked on a human decision"
    gh label create P1 --color B60205
    gh label create P2 --color FBCA04
    gh label create P3 --color 0E8A16

## 4. Seed the backlog (first issues, in order)
    gh issue create -l claude-ready,P1 -t "Scaffold the app/ dashboard (Vite+React+TS per ADR 0001)" \
      -b "Goal: app/ builds and renders a placeholder page using the ADR 0002 tokens. Done: npm run build passes, screenshot in PR. Out of scope: charts, data loading."
    gh issue create -l claude-ready,P1 -t "Load data/latest and render a price-changes table" \
      -b "Goal: table of the most recent diffs, color-coded by direction per ADR 0002. Done: renders real data from data/, tests included, screenshot in PR."
    gh issue create -l claude-ready,P2 -t "Price history chart per SKU (Recharts)" \
      -b "Goal: clicking a row opens a history chart built from data/diffs. Done: chart renders, tests, screenshot."
    gh issue create -l claude-ready,P2 -t "CI workflow: lint, typecheck, test, build on PRs" \
      -b "Goal: .github/workflows/ci.yml (exception to the workflows read-only rule, granted here). Done: CI green on this PR itself."
    gh issue create -l claude-ready,P3 -t "GitHub Pages deployment of app/" \
      -b "Goal: dashboard published on Pages from main. Done: public URL in README. Exception granted to edit workflows."

## 5. Settings
- Settings → Actions → General → Workflow permissions: "Read and write".
- Enable auto-merge (Settings → General → Pull Requests → Allow auto-merge).
- Branch protection on main: require status checks once CI exists (issue #4).
- Settings → Pages: deploy from GitHub Actions (needed for issue #5).

## 6. Watch it go
The fetch workflow runs hourly; the Claude loop every 2h (or trigger both
manually via the Actions tab → Run workflow). Then read journal.md.
