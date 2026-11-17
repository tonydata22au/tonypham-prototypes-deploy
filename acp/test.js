// Offline check of scripts/acp-bridge with a fake ACP agent. Run by scripts/selftest.
// `node acp/test.js agent` is the fake agent: it asks one permission, then edits index.html.
"use strict";
const fs = require("node:fs");
const path = require("node:path");

if (process.argv[2] === "agent") {
  const out = (m) => process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", ...m })}\n`);
  let pending = null;
  require("node:readline").createInterface({ input: process.stdin }).on("line", (line) => {
    const m = JSON.parse(line);
    if (m.method === "initialize") out({ id: m.id, result: { protocolVersion: 1, agentCapabilities: {}, authMethods: [] } });
    else if (m.method === "session/new") out({ id: m.id, result: { sessionId: "s1" } });
    else if (m.method === "session/prompt") {
      pending = m.id;
      out({ id: 900, method: "session/request_permission", params: { sessionId: "s1", toolCall: { toolCallId: "t1", title: "Edit index.html" },
        options: [{ optionId: "allow", name: "Allow", kind: "allow_once" }, { optionId: "deny", name: "Deny", kind: "reject_once" }] } });
    } else if (m.id === 900) {
      if (m.result.outcome.optionId === "allow") fs.writeFileSync("public/index.html", "<html><body>edited</body></html>");
      out({ method: "session/update", params: { sessionId: "s1", update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "done" } } } });
      out({ id: pending, result: { stopReason: "end_turn" } });
    }
  });
  return;
}

const { spawn } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const tmp = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "acp-"));
const demo = path.join(tmp, "demos", "zz-acp");
fs.mkdirSync(path.join(demo, "public"), { recursive: true });
fs.writeFileSync(path.join(demo, "demo.json"), '{"acp": true}');
fs.writeFileSync(path.join(demo, "public", "index.html"), "<html><body>hi</body></html>");
const port = 20000 + Math.floor(Math.random() * 20000);
const base = `http://127.0.0.1:${port}`;
const bridge = spawn(path.join(root, "scripts", "acp-bridge"), ["zz-acp"], {
  env: { ...process.env, ACP_WORKDIR: tmp, ACP_PORT: String(port), ACP_AGENT_CMD: `node ${JSON.stringify(__filename)} agent` },
  stdio: ["ignore", "pipe", "inherit"],
});
let fails = 0;
const check = (ok, label) => { console.log(`${ok ? "PASS" : "FAIL"}  acp: ${label}`); if (!ok) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const post = (p, body, origin = base) => fetch(base + p, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
const events = async () => {
  const ac = new AbortController();
  const res = await fetch(`${base}/_acp/events`, { signal: ac.signal });
  const reader = res.body.getReader();
  let text = "";
  const t = setTimeout(() => ac.abort(), 300);
  try { for (;;) { const { value, done } = await reader.read(); if (done) break; text += Buffer.from(value).toString(); } } catch { /* aborted */ }
  clearTimeout(t);
  return text.split("\n").filter((l) => l.startsWith("data: ")).map((l) => JSON.parse(l.slice(6)));
};
const until = async (fn, label) => { for (let i = 0; i < 50; i++) { if (await fn()) return check(true, label); await sleep(100); } check(false, label); };

(async () => {
  try {
    await until(async () => (await events().catch(() => [])).some((m) => m.type === "busy" && !m.busy), "bridge starts and the agent connects");
    const page = await (await fetch(`${base}/`)).text();
    check(page.includes('src="/_acp/panel.js" data-demo="zz-acp"'), "preview page has the panel");
    check((await fetch(`${base}/_acp/panel.js`)).status === 200, "panel.js is served");
    check((await fetch(`http://localhost:${port}/`)).status === 403, "wrong Host is refused (DNS rebinding)");
    check((await post("/_acp/prompt", { text: "x" }, "https://evil.example")).status === 403, "other websites cannot send prompts");
    check((await fetch(`${base}/%2e%2e/%2e%2e/demo.json`)).status !== 200, "no path traversal out of the preview");
    check((await post("/_acp/prompt", { text: "make it say edited" })).status === 202, "prompt accepted");
    let perm;
    await until(async () => (perm = (await events()).find((m) => m.type === "permission")), "permission request reaches the panel");
    await post("/_acp/permission", { id: perm.id, optionId: "allow" });
    await until(async () => (await events()).some((m) => m.type === "reload"), "page reload after the turn");
    check((await (await fetch(`${base}/`)).text()).includes("edited"), "preview shows the agent's edit");
    const log = await events();
    check(log.some((m) => m.type === "text" && m.text === "done") && log.find((m) => m.type === "permission").answered, "chat history replays");
  } finally {
    bridge.kill();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  process.exit(fails ? 1 : 0);
})();
