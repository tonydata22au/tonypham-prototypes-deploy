# Adding a demo

The quick way is `scripts/new-demo <name>`; see the [README](README.md). The rules it follows:

1. Pick a name matching `^[a-z][-a-z0-9]{0,22}[a-z0-9]$`: 2 to 24 characters, lowercase letters, digits and dashes, starting with a letter.
2. Use branch `demo/<name>` and put everything in `demos/<name>/`:
   - `public/`: static files (or the build output).
   - `functions/`: optional Pages Functions, for example `functions/api/hello.js` serves `/api/hello`.
   - `demo.json`: optional, `{"build": "npm run build", "output": "dist"}`. The build runs inside `demos/<name>/`, after `npm ci` or `npm install` if there is a `package.json`.
3. Open a PR from `demo/<name>` into `main`. Leave it open; never merge it.
4. CI deploys it and comments the public link. Push again to update.
5. Close the PR to retire the demo. If the cleanup run fails, run the **cleanup** workflow by hand from the Actions tab with the demo name.

A demo branch may change only `demos/<name>/`; the deploy fails otherwise. Do not put secrets in a demo: its link is public.

Before you push changes to the scripts or workflows, run `scripts/selftest`, `shellcheck scripts/stage scripts/check-paths scripts/new-demo scripts/selftest` and `actionlint`.
