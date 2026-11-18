---
name: deploy-to-tonypham-proto
description: Deploy the current project as a public demo link on the user's demo site (a GitHub repo built from this template, hosted on Cloudflare Pages). Use when the user says "deploy to tonypham proto", "deploy my demo", "publish this demo", "put this on my demo site", "update my demo", or "take down my demo".
---

# Deploy a demo

The user's demo site is a GitHub repo. Each demo is a branch `demo/<name>` with a pull request (PR) that stays open. CI deploys it to Cloudflare Pages and comments a public `https://demo-<name>.<project>.pages.dev` link on the PR.

A request like "deploy my demo" is the user's approval to push a branch and open or update a draft PR in that repo. Do nothing else outward without asking.

## Find the site

This skill lives inside the user's clone of the demo repo. Read its settings:

```sh
cfg="$(cd "<this skill's folder>" && pwd -P)/../../../deploy.config"
repo="$(sed -n 's/^REPO=//p' "$cfg")"
```

`repo` is the target, as `owner/name`. Do not ask the user where to deploy. If `deploy.config` is missing or `REPO` is empty, stop and tell the user to fill it in (see the repo's README).

## Steps

1. **Pick the project.** Use the project in the current working directory unless the user names another.
2. **Pick the name.** Use the name the user gives. Otherwise take the project's folder or `package.json` name: lowercase letters, digits and dashes, 2 to 24 characters, starting with a letter (`^[a-z][-a-z0-9]{0,22}[a-z0-9]$`). If the project was published before, reuse its name: run `gh pr list --repo "$repo" --state all --search "head:demo/<name>"`. If that name belongs to a different project, pick another and tell the user.
3. **Build to a folder of static files.**
   - If there is a `package.json` with a `build` script, run it. The output is usually `dist/`, `build/`, `out/` or `_site/`.
   - If the project is already plain HTML, use the folder that holds `index.html`.
   - The folder must contain `index.html` at its top level.
   - Optional server code: only if the project already has Cloudflare Pages Functions (a `functions/` folder, for example `functions/api/hello.js`). Pass it with `--functions`.
   - If the project needs a server that stays running, a database, or a login, stop and tell the user. This site hosts static files and Pages Functions only.
4. **Check the account.** Run `gh auth status`. The active account must be able to push to `$repo` (the owner or a collaborator). A collaborator can update only demos whose PR they opened; CI refuses others.
5. **Publish from a fresh clone.** Use absolute paths:
   ```sh
   d="$(mktemp -d)" && gh repo clone "$repo" "$d"
   "$d/scripts/publish" <name> <absolute-built-folder> [--functions <absolute-functions-folder>]
   ```
   Add `--dry-run` first if unsure; it checks the inputs and changes nothing. Every demo gets the "Edit with AI" panel; tell the user they can edit it by running `scripts/acp-bridge <name>` in a clone of the repo. The script creates or updates `demo/<name>`, pushes, opens or reopens the draft PR, waits up to 4 minutes and prints `LIVE: <url>`.
6. **Report** the live link, the PR link and the demo name. Say the link is public to anyone who has it.

## Updating and taking down

- **Update:** run the same command again with the same name. The same link shows the new version.
- **Take down:** close the PR: `gh pr close <number> --repo "$repo"`. CI deletes that demo's deployments. Reopening the PR brings it back.

## Rules

- The link is public. Never publish `.env` files, keys, tokens or private data. The script refuses files that look like secrets, but check the build output yourself too.
- Change only `demos/<name>/`. Never push to `main`, never merge a demo PR, never touch another demo.
- Never print, read or commit tokens. Do not set GitHub or Cloudflare secrets.
- If `scripts/publish` fails, show the user the exact error. Do not work around it by pushing by hand.
- If the deploy is not confirmed in 4 minutes, give the user the PR link and say the check is still running.
