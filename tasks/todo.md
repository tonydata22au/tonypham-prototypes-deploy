# Tasks

- [x] T0: commit the staged restructure on `main` (local only, never pushed)
  - Expected staged paths (20, recorded 2026-11-17 with `git diff --cached --name-status`):
    - Added: `.editorconfig`, `.gitattributes`, `.github/workflows/.gitkeep`, `CONTRIBUTING.md`, `demos/README.md`, `docs/plan/PLAN.md`, `docs/prompts/BUILD-PROMPT.md`, `scripts/README.md`
    - Modified: `README.md`
    - Renamed: `docs/PLAN.md` → `docs/archive/PLAN-v5.2-mac-gitops.md`
    - Deleted: `docs/reviews/astra-review-{1,2,3}.md`, `astra-review-4-rubric.md`, `astra-review-5-rescore.md`, `astra-review-6-final.md`, `astra-thread-round-{1,2,3,4}.md`
  - Before committing: run `git diff --cached --name-status` and compare with the list above. Any extra, missing or changed path → stop and ask the user; do not commit.
  - Do this first, before any T1–T7 edit, so no build file can be staged with it. Do not stage `tasks/`.
  - Verify after: `git show --stat --oneline HEAD` lists exactly those 20 paths; `git diff --cached --name-only` is empty; `git status --porcelain` shows only `?? tasks/` (build work still uncommitted).

- [x] T1: `scripts/stage <name>` (M2)
  - Acceptance: rejects bad names; copies `demos/<name>/public` (or runs `demo.json` build and copies its output) to `.stage/public`, and `functions/` to `.stage/functions`; clears old `.stage/`; `.stage/` is git-ignored.
  - Verify: `scripts/stage hello-static`, `scripts/stage hello-api`, `scripts/stage Bad_Name` exits non-zero; `shellcheck`.
  - Files: `scripts/stage`, `.gitignore`
- [x] T2: example demos (M2)
  - Acceptance: `demos/hello-static/public/index.html`; `demos/hello-api/public/index.html` + `functions/api/hello.js` returning JSON.
  - Verify: `npx wrangler pages dev` from `.stage` serves the page and `/api/hello` (local, offline check; allowed before your review).
  - Files: `demos/hello-static/**`, `demos/hello-api/**`
- [x] T3: `scripts/check-paths <name> <base> <head>` path guard
  - Acceptance: exits non-zero if any changed path is outside `demos/<name>/`.
  - Verify: local git test with a commit touching another demo.
  - Files: `scripts/check-paths`
- [x] T4: `.github/workflows/preview.yml` (M3)
  - Acceptance: same-repo `demo/*` PRs only; name regex; path guard; stage; deploy; one updated PR comment with the real URL; pinned actions; minimal permissions.
  - Verify: `actionlint`.
  - Files: `.github/workflows/preview.yml`, remove `.github/workflows/.gitkeep`
- [x] T5: `.github/workflows/cleanup.yml` (M4)
  - Acceptance: on PR close or `workflow_dispatch` (name input), deletes all deployments of branch `demo-<name>`.
  - Verify: `actionlint`.
  - Files: `.github/workflows/cleanup.yml`
- [x] T6: `scripts/new-demo <name> [--dry-run]` (M5)
  - Acceptance: validates name; scaffolds `demos/<name>/public/index.html`; creates `demo/<name>`, commits, pushes, opens a draft PR with `gh`; `--dry-run` prints steps and changes nothing.
  - Verify: `--dry-run` run leaves `git status` unchanged; `shellcheck`.
  - Files: `scripts/new-demo`
- [x] T7: docs (M1 + M5)
  - Acceptance: README has M1 Cloudflare setup steps and zero-to-live-link steps; CONTRIBUTING, `scripts/README.md` and PLAN status match what exists.
  - Files: `README.md`, `CONTRIBUTING.md`, `scripts/README.md`, `docs/plan/PLAN.md`

## Checkpoint: build done → stop for your review

- [x] Offline checks listed above recorded (pass/fail)
- [x] Build commit (local only, never pushed): stage by explicit path only — `scripts/`, `demos/hello-static/`, `demos/hello-api/`, `.github/workflows/`, `.gitignore`, `README.md`, `CONTRIBUTING.md`, `docs/plan/PLAN.md`, `tasks/` — never `git add -A`.
  - Before committing: `git diff --cached --name-status` shows only T1–T7 files and `tasks/`; anything else → stop and ask.
  - Verify after: `git show --stat --oneline HEAD` lists only those files; `git log --oneline -3` shows build commit on top of the T0 restructure commit; `git status --porcelain` is empty.
- [x] You review the build

## After your go (not in this build)

- [x] M1 done; live acceptance tests from PLAN §8 passed, each with its own approval (fork-PR test not run)
