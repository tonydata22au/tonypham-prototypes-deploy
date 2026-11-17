# Adding a demo

1. Pick a name matching `^[a-z][-a-z0-9]{0,22}[a-z0-9]$` (short, lowercase, dashes).
2. Create branch `demo/<name>` and put everything in `demos/<name>/`:
   - `public/`: static files (or the build output).
   - `functions/`: optional Pages Functions.
   - `demo.json`: optional, `{"build": "npm run build", "output": "dist"}`.
3. Open a PR from `demo/<name>` into `main`. Leave it open; never merge it.
4. CI deploys it and comments the public link. Push again to update.
5. Close the PR to retire the demo.

A demo branch may change only `demos/<name>/`. Do not put secrets in a demo: its link is public.

The automation is described in [docs/plan/PLAN.md](docs/plan/PLAN.md) and is not built yet.
