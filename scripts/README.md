# Scripts

- `stage <name>`: build `demos/<name>` into `.stage/` (`public/`, optional `functions/`). Used by CI and for local tests.
- `check-paths <name> <base> <head>`: fail if the diff touches anything outside `demos/<name>/`. Used by CI.
- `new-demo <name> [--dry-run]`: scaffold a demo, create branch `demo/<name>`, push it and open a draft PR.
- `publish <name> <built-folder> [--functions <dir>] [--dry-run]`: publish a built project as `demo/<name>` (new or update), open the draft PR, and print the live link. Run it from a fresh clone. This is what the AI-agent skill calls.
- `selftest`: offline checks for the scripts above (publish: validation and dry run only). No network, no deploy.
