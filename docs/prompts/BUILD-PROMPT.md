# Build prompt: demo previews on pages.dev

Copy the prompt below into a coding-agent thread opened in this repository. It describes future implementation. Writing this document did not authorize any deploy, push or account change.

---

## Objective

Implement `docs/plan/PLAN.md` (v6) in this repository, milestones M1 to M5, and pass its acceptance tests (§8). Deliver working scripts, workflows, two example demos, a README, and a short record of the checks you actually ran. A plan, scaffold or mocked run alone is not completion.

Read `docs/plan/PLAN.md`, the repo's instructions and `git status` first. Work on the branch that is already checked out; do not create or switch branches unless asked. Leave unrelated changes alone. `docs/archive/` is history, not a spec.

## Scope

Build exactly this: a `demo/<name>` branch with an open PR gets a public `https://….pages.dev` link, deployed by GitHub Actions with Wrangler to one Cloudflare Pages project (`tonypham-demos`). Closing the PR deletes that branch's deployments.

- Demo types: static sites and Pages Functions only.
- Access: public to anyone with the link.
- Skip: servers that stay running, databases, login-gated demos, custom domains, a demo index page.

Source order when they disagree: the user's current instructions, then `docs/plan/PLAN.md`, then official Cloudflare, Wrangler and GitHub docs, then measured behaviour. Check current docs for Wrangler flags, Pages limits and the Pages-vs-Workers status before relying on memory.

## Deliverables by milestone

- **M1, Cloudflare setup (needs the user).** Give the user a short step list: account, Pages project, API token (Pages edit only), and the two GitHub secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Never ask for token values in chat. Confirm Pages project creation is still offered; if not, stop and report, because the fallback gives `workers.dev`, not `pages.dev`.
- **M2, staging.** `scripts/stage <name>` builds a demo into `.stage/` (`public/`, optional `functions/`), honours optional `demos/<name>/demo.json`, and rejects names that fail `^[a-z][-a-z0-9]{0,22}[a-z0-9]$`. Add `demos/hello-static` and `demos/hello-api`. Prove both run with `wrangler pages dev`.
- **M3, `preview.yml`.** Runs on `pull_request` (opened, synchronize, reopened) for same-repo `demo/*` heads only. Fails if the PR touches anything outside `demos/<name>/`. Deploys with `wrangler pages deploy` from `.stage`, reads the real URL from the deploy result, and posts or updates one PR comment. Pin action versions; give the job minimal `permissions`; never expose secrets to fork PRs.
- **M4, `cleanup.yml`.** On PR close, delete that branch's Pages deployments through the Cloudflare API. Make it runnable by hand (`workflow_dispatch` with a demo name). Reopening the PR must redeploy.
- **M5, `scripts/new-demo <name>`.** Scaffold the folder, create branch `demo/<name>`, and open a draft PR, with a `--dry-run` that changes nothing. Write a README that takes a new user from zero to a live link.

## Checks

Run what you can offline: shell syntax and `shellcheck`, `actionlint` on the workflows, `scripts/stage` on both examples, a negative test for a bad name, and a negative test for a PR that touches another demo's folder. Run live checks (a real deploy, PR, cleanup) only after the user has finished M1 and approves them. Then run each acceptance test in `docs/plan/PLAN.md` §8 and record pass, fail or not run, with the command or URL as evidence.

## Authorization

Ask before anything outward-facing or hard to reverse: pushing, opening or closing PRs, creating Cloudflare resources, changing secrets, deleting deployments. Approval for one action does not cover the next. Never read, print or commit secret values. Use the secrets workflow for credentials.

## Finish

Report what was built, which acceptance tests passed, which were not run and why, and any risk the user must know. Keep `docs/plan/PLAN.md` in step with what you built; do not mark a milestone done without its check.
