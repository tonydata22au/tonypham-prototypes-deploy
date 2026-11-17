# Demo rules and how to change this repo

This page is for people who add demos by hand or change the scripts. To put a demo online the easy way, see the [README](README.md).

## What are the rules for a demo?

1. **Name.** Use 2 to 24 lowercase letters, digits or dashes, starting with a letter. The exact pattern is `^[a-z][-a-z0-9]{0,22}[a-z0-9]$`.
2. **Branch and folder.** Use the branch `demo/<name>` and put everything in `demos/<name>/`:
   - `public/` holds the website files, or the build output.
   - `functions/` is optional and holds Pages Functions. For example, `functions/api/hello.js` answers at `/api/hello`.
   - `demo.json` is optional, for example `{"build": "npm run build", "output": "dist", "acp": true}`. The build runs inside `demos/<name>/`, after `npm ci` or `npm install` if there is a `package.json`. `"acp": true` adds the "Edit with AI" panel, which is off by default.
3. **PR.** Open a PR from `demo/<name>` into `main`. Leave it open and never merge it.
4. **Link.** CI deploys the demo and comments the public link. Push again to update it.
5. **Take down.** Close the PR. If the cleanup job fails, run the **cleanup** workflow by hand from the Actions tab and type the demo name.

A demo branch may change only `demos/<name>/`. Only the PR's author, or the repo owner, may push to it. CI refuses the deploy otherwise. Never put secrets in a demo, because its link is public.

## How do I check a change to the scripts or workflows?

Run these three checks before you push. All three must pass:

```sh
scripts/selftest
shellcheck scripts/stage scripts/check-paths scripts/new-demo scripts/publish scripts/selftest
actionlint
```

`scripts/selftest` works offline. It never deploys anything. GitHub also runs all three checks on every PR to `main`, and the PR can't merge until they pass. Nobody can push to `main` directly.
