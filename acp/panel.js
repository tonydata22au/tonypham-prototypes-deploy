// AI-edit panel, added by scripts/stage to every demo, first thing in the <head> of index.html.
// On the public site it explains how to start scripts/acp-bridge.
// On the bridge's local preview (127.0.0.1) it chats with your own ACP agent.
(() => {
  // The panel never floats over the demo: the page becomes a shell with the demo in a frame
  // and a strip of its own below it, so no layout (full-screen apps, fixed buttons) can be covered.
  if (window.name === "acp-demo") return; // inside our frame: the demo runs as built
  const me = document.currentScript;
  const name = me?.dataset.demo || "";
  const repo = me?.dataset.repo || "this demo's GitHub repo";
  const local = location.hostname === "127.0.0.1"; // the bridge serves only 127.0.0.1 (wrangler dev uses localhost)
  // scripts/stage puts this script first in <head>. <plaintext> turns the rest of the page into
  // hidden text, so the demo loads and runs only in the frame, and the page still finishes loading
  // normally (window.stop() left Chrome and Safari blank: they never painted).
  document.write('<plaintext style="display:none">');
  document.addEventListener("DOMContentLoaded", () => {
    const head = document.createElement("head");
    head.innerHTML = `<meta name="viewport" content="width=device-width, initial-scale=1"><style>
      html, body { margin: 0; height: 100%; }
      body { display: grid; grid-template: 1fr auto / 1fr auto; background: #111; }
      * { box-sizing: border-box; font: 14px/1.4 system-ui, sans-serif; }
      .demo { grid-area: 1 / 1; width: 100%; height: 100%; border: 0; background: #fff; }
      .bar { grid-area: 2 / 1 / 3 / 3; display: flex; justify-content: flex-end; padding: 4px 8px; }
      .bar .fab { padding: 6px 14px; border: 1px solid #555; border-radius: 999px; background: #222; color: #fff; }
      .box { grid-area: 1 / 2; width: min(380px, 100vw); min-height: 0; display: flex; flex-direction: column; gap: 8px; padding: 12px;
        overflow: auto; background: #fff; color: #111; border-left: 1px solid #ccc; }
      @media (max-width: 700px) {
        body { grid-template: 1fr auto auto / 1fr; }
        .box { grid-area: 2 / 1; width: auto; max-height: 50vh; border: 0; border-top: 1px solid #ccc; }
        .bar { grid-area: 3 / 1; }
      }
      .box[hidden] { display: none; }
      .log { overflow: auto; flex: 1; display: flex; flex-direction: column; gap: 6px; min-height: 80px; }
      .you { align-self: flex-end; background: #e8f0ff; padding: 6px 10px; border-radius: 10px; white-space: pre-wrap; }
      .bot { white-space: pre-wrap; }
      .info { color: #555; font-size: 12px; }
      .err { color: #b00020; }
      p { margin: 0; }
      code { font-family: ui-monospace, monospace; font-size: 12px; background: #f2f2f2; padding: 2px 4px; border-radius: 4px; word-break: break-all; }
      form, .row { display: flex; gap: 6px; flex-wrap: wrap; }
      textarea { flex: 1; min-height: 40px; resize: vertical; padding: 6px; border: 1px solid #bbb; border-radius: 8px; }
      button { padding: 6px 10px; border: 1px solid #888; border-radius: 8px; background: #f7f7f7; color: #111; cursor: pointer; }
      button:disabled { opacity: .5; cursor: default; }
    </style>`;
    const body = document.createElement("body");
    body.innerHTML = `<iframe class="demo" name="acp-demo" title="Demo" allow="fullscreen; autoplay; clipboard-write"></iframe>
    <div class="box" id="box" role="dialog" aria-label="Edit this demo with your AI agent" hidden></div>
    <div class="bar"><button class="fab" aria-expanded="false" aria-controls="box">Edit with AI</button></div>`;
    document.documentElement.replaceChildren(head, body);
    const frame = body.querySelector(".demo");
    frame.onload = () => {
      try { // keep the tab title and address bar in step with the demo
        document.title = frame.contentDocument.title;
        history.replaceState(null, "", frame.contentWindow.location.href);
        frame.contentWindow.focus(); // keyboard controls work without a first click
      } catch { /* the demo navigated to another site */ }
    };
    frame.src = location.href;
    const fab = body.querySelector(".fab");
    const box = body.querySelector(".box");
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
        el("p", "info", `You need write access to ${repo}. In a clone of it, run:`),
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
      else if (m.type === "reload" && !m.replay) frame.contentWindow.location.reload(); // the chat stays put
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
  });
})();
