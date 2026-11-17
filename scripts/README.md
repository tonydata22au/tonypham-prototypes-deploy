# Scripts

- `publish <name> <built-folder> [--functions <dir>] [--acp | --no-acp] [--dry-run]`: put a built project online as `demo/<name>`, new or updated. It opens the draft PR and prints the live link. Run it from a fresh clone. The AI agent skill uses this script.
- `new-demo <name> [--dry-run]`: make a blank demo page, create the branch `demo/<name>`, push it and open a draft PR.
- `stage <name>`: copy `demos/<name>` into `.stage/` (`public/`, plus `functions/` if there is one). CI uses it, and you can use it to test a demo on your computer.
- `check-paths <name> <base> <head>`: fail if a demo branch changes anything outside `demos/<name>/`. CI uses it.
- `acp-bridge <name> [--agent claude|codex]`: chat with your own AI agent to edit a demo that has `"acp": true`, see the change on your computer, then publish it. See the README.
- `selftest`: offline checks for all the scripts above. It never deploys anything.

The scripts read the repo name and the Cloudflare Pages project name from `deploy.config` in the repo's top folder.
