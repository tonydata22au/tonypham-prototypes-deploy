# Agent guide

This repo is a demo site. Each demo is a branch `demo/<name>` with a PR that stays open. GitHub Actions deploys it to Cloudflare Pages and comments a public link. The repo name and the Cloudflare Pages project name are in `deploy.config`. See [README.md](README.md).

## When the user asks to deploy a demo

Follow [agents/skills/deploy-to-tonypham-proto/SKILL.md](agents/skills/deploy-to-tonypham-proto/SKILL.md). In short: build the user's project to a static folder with `index.html`, run `scripts/publish <name> <absolute-built-folder>` from a fresh clone of the repo in `deploy.config`, and report the `LIVE:` link. That request is approval to push a demo branch and open or update its draft PR, nothing more.

## Rules

- A demo branch changes only `demos/<name>/`. CI fails the PR otherwise.
- Demo links are public. Never publish secrets or private data. Never print, read or commit tokens, and never set GitHub or Cloudflare secrets.
- Never merge a demo PR and never push demo work to `main`.
- Ask first before anything else outward-facing: pushing to `main`, closing other PRs, deleting deployments, changing workflows or secrets.
- Wrangler is pinned (`wrangler@4.163.0`) and uses the hidden `--force` flag to stay on classic Pages (`pages.dev`). Do not change either without testing a live deploy.

## Checks before pushing script or workflow changes

```sh
scripts/selftest
shellcheck scripts/stage scripts/check-paths scripts/new-demo scripts/publish scripts/selftest
actionlint
```
