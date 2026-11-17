# Implementation plan: demo previews on pages.dev

Spec: [docs/plan/PLAN.md](../docs/plan/PLAN.md) (v6) and [docs/prompts/BUILD-PROMPT.md](../docs/prompts/BUILD-PROMPT.md). Tasks: [todo.md](todo.md).

## Scope of this build

Build the code for M2–M5 offline. Write the M1 Cloudflare steps for you to do. Then stop for your review. Live tests (real deploy, PR, cleanup) wait for your review and your go.

Skipped on purpose: a root `package.json`, a demo index page, custom domains, a LICENSE.

## Decisions

- **No root dependencies.** Workflows and docs call `npx wrangler@<pinned major>`, so the repo needs no `package.json`.
- **Scripts in Bash** (`set -euo pipefail`), matching a macOS + Ubuntu runner; `jq` reads `demo.json`.
- **Workflows live on `main`.** A `pull_request` run checks out the merge ref, so `main`'s `scripts/` and workflows apply to every demo branch. Demo branches never need their own copy.
- **Path guard** uses `git diff --name-only <base>...<head>`; any path outside `demos/<name>/` fails the job.
- **Fork guard:** `if: github.event.pull_request.head.repo.full_name == github.repository`, and `pull_request` (not `pull_request_target`), so forks never see secrets.
- **Real URL** comes from Wrangler's output, not from the branch name; one PR comment is found by a hidden marker and updated.
- **Cleanup** lists deployments via the Cloudflare API, filters by branch `demo-<name>`, deletes each with `?force=true`; also runs by `workflow_dispatch` with a name.
- **Branch:** stay on the checked-out `main` (user preference); no new branch.

## Your answers (2026-11-17)

- **Before your review:** offline checks may run, including `brew install shellcheck actionlint`. Live deploy, PR and cleanup wait for your review and go.
- **Commits:** two local commits on `main`, never pushed. First the staged restructure (the exact 20 paths listed in T0, checked before committing), then the build (T1–T7 plus `tasks/`, staged by explicit path). Each commit is checked with `git show --stat --oneline HEAD`.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Pages project creation no longer offered | High | Check in M1; stop and report if gone |
| Wrangler output format changes | Medium | Parse the `pages.dev` URL by regex and fail loudly if absent |
| `shellcheck` / `actionlint` not installed | Low | Install with Homebrew (approved) |
| Workflow can only be proven live | Medium | Offline: `actionlint` + a local run of the path guard; live after your go |
