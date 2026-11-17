// AI-edit panel, added by scripts/stage to demos with "acp": true in demo.json.
// On the public site it explains how to start scripts/acp-bridge.
// On the bridge's local preview (127.0.0.1) it chats with your own ACP agent.
(() => {
  const me = document.currentScript;
  const name = me?.dataset.demo || "";
  const local = location.hostname === "127.0.0.1"; // the bridge serves only 127.0.0.1 (wrangler dev uses localhost)
  const host = document.createElement("div");
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>
    :host { all: initial; }
    * { box-sizing: border-box; font: 14px/1.4 system-ui, sans-serif; }
    .fab { position: fixed; right: 16px; bottom: 16px; z-index: 2147483647; padding: 10px 14px;
      border: 0; border-radius: 999px; background: #111; color: #fff; cursor: pointer; }
    .box { position: fixed; right: 16px; bottom: 64px; z-index: 2147483647; width: min(380px, calc(100vw - 32px));
      max-height: 70vh; display: flex; flex-direction: column; gap: 8px; padding: 12px;
      background: #fff; color: #111; border: 1px solid #ccc; border-radius: 12px; box-shadow: 0 8px 24px #0003; }
    .box[hidden] { display: none; }
    .log { overflow: auto; flex: 1; display: flex; flex-direction: column; gap: 6px; min-height: 80px; }
    .you { align-self: flex-end; background: #e8f0ff; padding: 6px 10px; border-radius: 10px; white-space: pre-wrap; }
    .bot { white-space: pre-wrap; }
    .info { color: #555; font-size: 12px; }
    .err { color: #b00020; }
    code { font-family: ui-monospace, monospace; font-size: 12px; background: #f2f2f2; padding: 2px 4px; border-radius: 4px; word-break: break-all; }
    form, .row { display: flex; gap: 6px; flex-wrap: wrap; }
    textarea { flex: 1; min-height: 40px; resize: vertical; padding: 6px; border: 1px solid #bbb; border-radius: 8px; }
    button { padding: 6px 10px; border: 1px solid #888; border-radius: 8px; background: #f7f7f7; color: #111; cursor: pointer; }
    button:disabled { opacity: .5; cursor: default; }
  </style>
  <button class="fab" aria-expanded="false" aria-controls="box">Edit with AI</button>
  <div class="box" id="box" role="dialog" aria-label="Edit this demo with your AI agent" hidden></div>`;
  document.body.append(host);
  const fab = root.querySelector(".fab");
  const box = root.querySelector(".box");
  const key = `acp-open-${name}`;
  const toggle = (open) => {
    box.hidden = !open;
    fab.setAttribute("aria-expanded", String(open));
    sessionStorage.setItem(key, open ? "1" : "");
  };
  fab.onclick = () => toggle(box.hidden);
  const el = (tag, cls, text) => Object.assign(document.createElement(tag), { className: cls || "", textContent: text || "" });

  if (!local) {
    const cmd = `scripts/acp-bridge ${name} --agent claude`;
    box.append(
      el("p", "", "Change this demo by chatting with your own AI agent (Claude Code or Codex, on your subscription)."),
      el("p", "info", "You need write access to tonydata22au/tonypham-prototypes-deploy. In a clone of it, run:"),
      el("code", "", cmd),
      el("p", "info", "Use --agent codex for Codex. It opens a local preview with the chat. You can change only demos whose PR you opened."),
    );
    const copy = el("button", "", "Copy command");
    copy.onclick = () => navigator.clipboard.writeText(cmd).then(() => (copy.textContent = "Copied"));
    box.append(copy);
    toggle(!!sessionStorage.getItem(key));
    return;
  }

  const log = el("div", "log");
  log.setAttribute("aria-live", "polite");
  const form = el("form");
  const input = el("textarea");
  input.placeholder = "Ask for a change, e.g. make the heading blue";
  input.setAttribute("aria-label", "Message to your agent");
  const send = el("button", "", "Send");
  send.type = "submit";
  form.append(input, send);
  const row = el("div", "row");
  const stop = el("button", "", "Stop");
  const publish = el("button", "", "Publish");
  row.append(stop, publish);
  box.append(log, form, row);

  const post = (path, body) => fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body || {}) });
  const add = (node) => { log.append(node); log.scrollTop = log.scrollHeight; return node; };
  let bot = null;
  const setBusy = (b) => { send.disabled = b; publish.disabled = b; stop.disabled = !b; };
  setBusy(false);

  form.onsubmit = (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    post("/_acp/prompt", { text });
  };
  input.onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } };
  stop.onclick = () => post("/_acp/cancel");
  publish.onclick = () => post("/_acp/publish");

  const events = new EventSource("/_acp/events");
  events.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.type !== "text") bot = null;
    if (m.type === "you") add(el("div", "you", m.text));
    else if (m.type === "text") (bot ||= add(el("div", "bot"))).textContent += m.text;
    else if (m.type === "info") add(el("div", "info", m.text));
    else if (m.type === "error") add(el("div", "info err", m.text));
    else if (m.type === "busy") setBusy(m.busy);
    else if (m.type === "reload" && !m.replay) { sessionStorage.setItem(key, "1"); location.reload(); }
    else if (m.type === "permission") {
      const p = add(el("div", "info", `Allow: ${m.title}?`));
      if (m.answered) return;
      const btns = el("div", "row");
      for (const o of m.options) {
        const b = el("button", "", o.name);
        b.onclick = () => { post("/_acp/permission", { id: m.id, optionId: o.optionId }); btns.remove(); p.textContent += ` ${o.name}`; };
        btns.append(b);
      }
      add(btns);
    }
  };
  events.onerror = () => setBusy(true);
  toggle(sessionStorage.getItem(key) !== "");
})();
