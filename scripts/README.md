# Scripts

- `stage <name>`: build `demos/<name>` into `.stage/` (`public/`, optional `functions/`). Used by CI and for local tests.
- `check-paths <name> <base> <head>`: fail if the diff touches anything outside `demos/<name>/`. Used by CI.
- `new-demo <name> [--dry-run]`: scaffold a demo, create branch `demo/<name>`, push it and open a draft PR.
- `selftest`: offline checks for the three scripts above. No network, no deploy.
