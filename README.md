# Demo site: a free public link for every demo

This repo turns a web project into a public link, like `https://demo-my-app.my-demos.pages.dev`, in about a minute. You give it a folder of website files. It puts them on Cloudflare Pages (free web hosting) and posts the link for you. You can also ask an AI agent to do every step for you.

It is for people who build small web demos and want to share them. You need a GitHub account and a little comfort with a terminal.

## Which way do I use it?

There are two ways. Pick one.

| | **Way A: your own copy** | **Way B: join someone's site** |
|---|---|---|
| Who it suits | Anyone | Friends or teammates of the site owner |
| Whose Cloudflare | Your own free account | The owner's |
| Setup time | About 15 minutes, once | About 2 minutes |
| What you need | GitHub and Cloudflare accounts | The owner adds you to their repo |

Most people want **Way A**.

## How does it work?

Each demo gets its own branch and pull request in this repo. A **branch** is a separate copy of the files. A **pull request** (PR) is a page on GitHub that shows that branch. Here is what happens:

1. Your demo's files go into `demos/<name>/` on a branch called `demo/<name>`.
2. A PR opens for that branch. You leave it open and never merge it.
3. GitHub Actions (GitHub's free robot that runs jobs) uploads the files to Cloudflare Pages.
4. The robot posts the public link as a comment on the PR.
5. When you push new files, the same link updates. When you close the PR, the demo goes offline.

## Way A: how do I set up my own copy?

You do this once. It takes about 15 minutes.

1. **Copy the repo.** On this repo's GitHub page, click **Use this template → Create a new repository**. Name it anything, for example `my-demos`. If there is no template button, click **Fork** instead.
2. **Get the tools.** Install [Git](https://git-scm.com), the [GitHub CLI](https://cli.github.com) (`gh`), `jq` and [Node.js](https://nodejs.org) version 22 or newer. Then sign in to GitHub: `gh auth login`.
3. **Download your copy.** Run `gh repo clone <you>/my-demos` and then `cd my-demos`.
4. **Make a free Cloudflare account** at <https://dash.cloudflare.com/sign-up>.
5. **Create a Pages project.** A project is one website on Cloudflare. Pick a name made of lowercase letters, digits and dashes, for example `my-demos`. Run:

   ```sh
   npx wrangler@4.163.0 login
   npx wrangler@4.163.0 pages project create my-demos --production-branch main --force
   ```

   Keep `--force`. Without it, this Wrangler version makes a Cloudflare Workers site with a `workers.dev` link instead of a `pages.dev` one.
6. **Make an API token.** A token is a password that lets GitHub upload to your Cloudflare account. In Cloudflare, open **My Profile → API Tokens → Create Token → Custom token**. Give it one permission: **Account → Cloudflare Pages → Edit**. Copy the token.
7. **Find your account ID.** It is on the right side of **Workers & Pages → Overview**.
8. **Give both to GitHub.** Run these two commands. Each one asks you to paste the value:

   ```sh
   gh secret set CLOUDFLARE_API_TOKEN
   gh secret set CLOUDFLARE_ACCOUNT_ID
   ```

   GitHub stores them as secrets, so nobody can read them back. Never paste the token into a chat, an issue or a file.
9. **Fill in the settings file.** Open `deploy.config` and change both values to yours:

   ```sh
   REPO=<you>/my-demos
   PAGES_PROJECT=my-demos
   ```

   Then save it to GitHub: `git commit -am "Use my settings" && git push`. This is the one time you push to `main`. After this, demos always go on their own branches.

You are ready. Go to [How do I put a demo online?](#how-do-i-put-a-demo-online)

## Way B: how do I join someone's site?

1. Ask the owner to add you as a **collaborator** on their GitHub repo. Accept the email invite.
2. Install the tools and sign in, as in step 2 of Way A.
3. Download their repo: `gh repo clone <owner>/<repo>` and `cd <repo>`.

You can change only the demos you published yourself. The owner can change any demo.

## How do I put a demo online?

First build your project into a folder of plain website files. It must have `index.html` at the top. Many projects make this folder with `npm run build`, and it is often called `dist/` or `build/`.

### Option 1: ask your AI agent

If you use Claude Code or Codex, say **"Deploy to tonypham proto"** (or "deploy my demo") from your project's folder. The agent builds the project, publishes it and replies with the live link. Say "update my demo" to publish again, or "take down my demo" to remove it.

This works because of a **skill**: a small instruction file in `agents/skills/deploy-to-tonypham-proto/`. The skill uses the site named in your `deploy.config`. Your AI tool finds the skill only after you link it, once per computer:

1. Go into your copy of the repo: `cd my-demos`.
2. Run these three lines. They link the skill instead of copying it, so `git pull` keeps it up to date:

   ```sh
   mkdir -p ~/.claude/skills ~/.agents/skills
   ln -sfn "$PWD/agents/skills/deploy-to-tonypham-proto" ~/.claude/skills/deploy-to-tonypham-proto
   ln -sfn "$PWD/agents/skills/deploy-to-tonypham-proto" ~/.agents/skills/deploy-to-tonypham-proto
   ```

   Claude Code looks in `~/.claude/skills`. Codex looks in `~/.agents/skills`. You can run these lines again safely.
3. Close your AI tool and open it again.
4. Check that it worked: type `/deploy-to-tonypham-proto` in Claude Code, or just ask it to deploy.

If you move or delete the repo folder, run the `ln` lines again from the new place. Chat-only apps, like the ChatGPT website, cannot run commands on your computer. Use Claude Code, Codex or Option 2 instead.

### Option 2: run one command yourself

The command switches branches, so run it in a new, untouched clone: `gh repo clone <you>/my-demos fresh && cd fresh`. Then run:

```sh
scripts/publish my-app /full/path/to/dist
```

- `my-app` is the demo's name. Use 2 to 24 lowercase letters, digits or dashes, and start with a letter.
- Add `--dry-run` to check everything first without changing anything.
- Add `--functions /full/path/to/functions` if your project has Cloudflare Pages Functions (small bits of server code, such as `functions/api/hello.js`, which answers at `/api/hello`).

The command makes the branch, opens the PR and waits for the upload, usually about a minute. Then it prints `LIVE:` with your link. If the link is not ready after 4 minutes, it prints the PR link instead, so you can check the robot's progress there.

### Option 3: start a blank demo page

Run `scripts/new-demo my-app --dry-run` to see what will happen, then `scripts/new-demo my-app` to do it. It makes `demos/my-app/public/index.html`, pushes it and opens the PR. Edit the files in `demos/my-app/`, commit and push, and the link updates.

## How do I update or take down a demo?

- **Update:** publish again with the same name, or push new commits to its branch. The link stays the same.
- **Take down:** close the demo's PR on GitHub. The robot deletes it from Cloudflare. Reopen the PR to bring it back.
- **See all your demos:** `gh pr list --search "head:demo/"`.

## How do I edit a demo by chatting with AI?

This part is optional. A demo can show an **Edit with AI** button. You chat with your own AI agent (Claude Code or Codex, on your own paid plan), it changes the demo, and you see the result right away. When you like it, you click **Publish** and the public link updates.

The agent runs only on your computer. It talks to the page through the Agent Client Protocol (ACP), a standard way for apps to chat with coding agents.

1. **Turn it on** for the demo: publish with `--acp`, or add `"acp": true` to `demos/<name>/demo.json`. Use `--no-acp` to turn it off.
2. **Sign in to your agent** once: run `claude` and log in, or run `codex login`.
3. **Start the bridge** in your copy of the repo. The public demo's **Edit with AI** button shows the exact command. It looks like this:

   ```sh
   scripts/acp-bridge my-app --agent claude
   ```

   Use `--agent codex` for Codex.
4. **Open the preview.** After about 10 seconds, the terminal shows **READY!** and the link `http://127.0.0.1:7878/`. Your browser usually opens it by itself. This page exists only on your computer. If something goes wrong, the terminal says **Something needs fixing** and tells you what to do.
5. **Ask for a change.** Click **Edit with AI** and type a request, such as *Make the heading blue and larger*. The page reloads with the change. Click **Stop** to cancel. If the agent asks for permission, click approve or deny.
6. **Publish.** Click **Publish**. About a minute later, the public link shows the new version.
7. **Finish.** Press Ctrl+C in the terminal to stop the bridge.

The bridge works in a separate folder, `.acp/<name>/`, so your own files stay untouched.

## How do I test a demo on my computer?

```sh
scripts/stage my-app
cd .stage && npx wrangler@4.163.0 pages dev public
```

Then open <http://localhost:8788>.

## What is in this repo?

```text
.
├── deploy.config      # your settings: repo name and Cloudflare project name
├── demos/<name>/      # one folder per demo, only on that demo's branch
├── scripts/           # publish, new-demo, stage, check-paths, acp-bridge, selftest
├── acp/               # the "Edit with AI" panel and its test
├── agents/skills/     # the AI agent skill
├── .github/workflows/ # the robot: preview.yml uploads, cleanup.yml removes
├── AGENTS.md          # rules for AI agents working in this repo
└── CONTRIBUTING.md    # demo rules, and how to change the scripts
```

## What must I never do?

- **Never put secrets in a demo.** Every link is public. `scripts/publish` refuses files that look like secrets, such as `.env` or `.pem` files, but check your files too.
- **Never merge a demo PR.** Demos live on their own branches.
- **Never change files outside `demos/<name>/` on a demo branch.** The robot refuses the upload if you do.

More rules are in [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT. See [LICENSE](LICENSE). You can use, copy and change this repo, as long as you keep the copyright notice.
