# tonypham-prototypes-deploy

A place to keep the demos I make. Each demo lives on its own `demo/<name>` branch with an open pull request (PR). GitHub Actions deploys it to Cloudflare Pages and comments a public `https://….pages.dev` link on the PR. Closing the PR takes the demo down.

Status: built and live-tested on 2026-11-17 (deploy, PR comment, update on push, Pages Function, path guard, close and reopen). See [the plan](docs/plan/PLAN.md).

## One-time setup (Cloudflare and GitHub)

You only do this once.

1. **Create a Cloudflare account** at <https://dash.cloudflare.com/sign-up> (free plan).
2. **Create the Pages project.** Run `npx wrangler@4.163.0 login`, then `npx wrangler@4.163.0 pages project create tonypham-demos --production-branch main --force`. The `--force` flag is needed: without it, Wrangler 4.163 hands the command to Cloudflare Workers, which gives `workers.dev` links, not `pages.dev`.
3. **Create an API token.** In the dashboard, open *My Profile → API Tokens → Create Token → Custom token*. Give it one permission: *Account → Cloudflare Pages → Edit*, limited to your account. Copy the token.
4. **Find your account ID.** It is on the right side of *Workers & Pages → Overview*.
5. **Add two GitHub secrets.** In this repo on GitHub, open *Settings → Secrets and variables → Actions → New repository secret*. Add `CLOUDFLARE_API_TOKEN` (the token) and `CLOUDFLARE_ACCOUNT_ID` (the ID). Or, from a terminal: `gh secret set CLOUDFLARE_API_TOKEN` and `gh secret set CLOUDFLARE_ACCOUNT_ID`; each one asks for the value.

Never paste the token into chat, an issue or a file in this repo.

## Make a demo, from zero to a live link

You need `git`, `gh` (signed in with `gh auth login`), `jq`, and Node.js 22 or newer.

1. Start on a clean `main`: `git switch main && git pull`.
2. Preview what will happen: `scripts/new-demo my-demo --dry-run`. Nothing changes.
3. Create it: `scripts/new-demo my-demo`. This makes `demos/my-demo/public/index.html`, the branch `demo/my-demo`, pushes it and opens a draft PR.
4. Wait about a minute. The PR gets a comment with the link, such as `https://demo-my-demo.tonypham-demos.pages.dev`.
5. Edit files in `demos/my-demo/`, commit and push. The same link updates.
6. To take the demo down, close the PR. Reopen it to bring the demo back.

List your live demos with `gh pr list --search "head:demo/"`.

## Let an AI agent deploy it for you

From any project, tell Claude Code or Codex: **"Deploy to tonypham proto"**. The agent builds the project, runs `scripts/publish` from a fresh clone of this repo, and gives you the live link. Say "update my demo" to redeploy, or "take down my demo" to close its PR.

This works because of a skill (`agents/skills/deploy-to-tonypham-proto/SKILL.md`) linked into `~/.agents/skills/` and `~/.claude/skills/`, plus short notes in `~/.claude/CLAUDE.md` and `~/.codex/AGENTS.md`. The skill is linked, not copied, so it follows this folder: if you move or delete the clone, link it again with `ln -s <this-folder>/agents/skills/deploy-to-tonypham-proto ~/.agents/skills/`. Chat-only apps (the ChatGPT website or app) cannot run commands on your computer, so use Codex, or run `scripts/publish` yourself.

You can also run it by hand from a fresh clone: `scripts/publish my-demo /path/to/dist` (add `--functions /path/to/functions` for Pages Functions, or `--dry-run` to check first).

## Edit a demo by chatting with your own AI agent

A demo can show an **Edit with AI** button. Behind it, you chat with your own agent (Claude Code or Codex, signed in with your own subscription) through the Agent Client Protocol (ACP). The agent edits the demo, the page reloads to show the change, and **Publish** updates the public link.

1. Turn it on for the demo: publish with `--acp` (or add `"acp": true` to `demos/<name>/demo.json`). It is off by default. `--no-acp` turns it off.
2. Sign in to your agent once: run `claude` and log in, or `codex login`.
3. In a clone of this repo, run `scripts/acp-bridge <name>` (add `--agent codex` for Codex). It needs Node.js 22+, `git` and `gh`.
4. Open <http://127.0.0.1:7878/>, click **Edit with AI** and ask for a change. Approve tool calls when the agent asks.
5. Click **Publish**. About a minute later the public link shows the new version.

The bridge works in a separate folder, `.acp/<name>/`, on the `demo/<name>` branch, so your own checkout is untouched. On the public site the button only shows these steps: your agent never runs on anyone else's computer.

Who can change what: anyone with write access to this repo can use it, but only on demos whose PR they opened. The bridge checks this, and CI refuses pushes from anyone else (the repo owner can change any demo).

## Step-by-step guide: edit a demo (for non-technical users)

**Before you start (one time only)**

You need three free tools:
- **Git** — download from [git-scm.com](https://git-scm.com)
- **GitHub CLI (gh)** — download from [cli.github.com](https://cli.github.com)
- **Node.js** — download from [nodejs.org](https://nodejs.org) (version 22 or newer)

You also need a **Claude** or **ChatGPT** account with a paid subscription.

Sign in to GitHub once by opening Terminal and typing:
```
gh auth login
```

**Step 1: Sign in to your AI**

Open Terminal. For Claude, type `claude`. For ChatGPT, type `codex login`. Sign in when prompted. (Do this once.)

**Step 2: Get the demo files**

```
gh repo clone tonydata22au/tonypham-prototypes-deploy
cd tonypham-prototypes-deploy
```

**Step 3: Start the chat bridge**

Open the demo's public page and click the **Edit with AI** button (bottom right, black). Copy the command it shows and paste it into Terminal. It looks like:

```
scripts/acp-bridge demo-name --agent claude
```

Use `--agent codex` for ChatGPT.

**Step 4: Open your local preview**

Terminal prints: **Preview with chat: http://127.0.0.1:7878/**. Open that address in your browser. This page is only on your computer.

**Step 5: Ask for a change**

Click **Edit with AI** and type a request in plain English:

> Make the heading blue and larger

Press Enter. The AI works and the page reloads with your change.

**Step 6: Keep editing or start over**

Ask for more changes the same way. Click **Stop** to cancel mid-way. If the AI asks permission, you'll see buttons to approve or deny. To start over: close Terminal (Ctrl+C) and re-run Step 3.

**Step 7: Publish**

Click **Publish** in the panel. About 1 minute later, the public link shows your version.

**Step 8: Done**

Press Ctrl+C in Terminal to close the bridge.

## Try a demo on your computer

```sh
scripts/stage my-demo
cd .stage && npx wrangler@4.163.0 pages dev public
```

Then open <http://localhost:8788>.

## Layout

```text
.
├── demos/<name>/      # one folder per demo: public/, optional functions/, optional demo.json
├── scripts/           # stage, check-paths, new-demo, publish, selftest
├── .github/workflows/ # preview.yml (deploy + comment), cleanup.yml (delete on close)
├── AGENTS.md          # rules for AI agents working in this repo (CLAUDE.md points to it)
├── agents/            # skill that lets AI agents deploy here
├── docs/              # plan/, prompts/, archive/
└── tasks/             # build plan and task list
```

## Rules

See [CONTRIBUTING.md](CONTRIBUTING.md).
