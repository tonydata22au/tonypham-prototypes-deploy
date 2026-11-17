// Static-build add-on for the margin copilot: without the local proxy, the visitor pastes their own
// OpenAI key, which stays in this browser and goes only to api.openai.com. Loaded after the app's
// script, it replaces the app's global aiFetch and aiHealth; the tools and the chat loop are unchanged.
// Request shape, model and reasoning effort follow scripts/ai-proxy.mjs.
(function () {
  'use strict';
  const MODEL = 'gpt-5-mini';
  const EFFORT = 'low';
  const STORE = 'amr-openai-key';
  const LOCAL_PROXY = 'http://127.0.0.1:7879';
  // Only probe the proxy when the page itself runs locally: from a public site the probe would
  // trigger the browser's local-network permission prompt for every visitor.
  const PAGE_IS_LOCAL = /^(127\.0\.0\.1|localhost|\[::1\])$/.test(location.hostname);

  let memoryKey = ''; // used when browser storage is blocked
  function readKey () {
    try { return sessionStorage.getItem(STORE) || localStorage.getItem(STORE) || memoryKey; } catch { return memoryKey; }
  }
  function saveKey (key, remember) {
    memoryKey = key;
    try { (remember ? localStorage : sessionStorage).setItem(STORE, key); } catch { /* keep it in memory */ }
    try { (remember ? sessionStorage : localStorage).removeItem(STORE); } catch { /* nothing stored there */ }
  }
  function clearKey () {
    memoryKey = '';
    try { sessionStorage.removeItem(STORE); } catch { /* blocked */ }
    try { localStorage.removeItem(STORE); } catch { /* blocked */ }
  }
  const scrub = (s) => String(s).replace(/sk-[A-Za-z0-9_\-*.]+/g, '[key]');

  // ---- UI: the key form sits where the "needs the local AI proxy" notice was.
  const style = document.createElement('style');
  style.textContent = `
    #ai-key { padding: 10px 12px; margin: 0 14px 10px; border-radius: 10px; background: #f6f5ff; border: 1px solid #d9d4ff; font-size: 12.5px; }
    #ai-key form { display: flex; flex-direction: column; gap: 7px; }
    #ai-key .row { display: flex; gap: 6px; }
    #ai-key input[type=password] { flex: 1; font: 13px system-ui, sans-serif; padding: 6px 8px; border: 1px solid var(--line, #ddd); border-radius: 8px; }
    #ai-key button { border: 0; border-radius: 8px; background: var(--accent, #4b3fd8); color: #fff; font-weight: 600; padding: 6px 12px; cursor: pointer; }
    #ai-key .note { color: var(--muted, #667); }
    #ai-key .err { color: var(--bad, #c0392b); }
    #ai-key-bar { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin: 0 14px 8px; font-size: 12px; color: var(--muted, #667); }
    #ai-key-bar button { border: 0; background: none; color: var(--accent, #4b3fd8); cursor: pointer; font-size: 12px; padding: 0; }`;
  document.head.appendChild(style);

  const box = document.createElement('div');
  box.id = 'ai-key';
  box.hidden = true;
  box.innerHTML = `<form autocomplete="off">
      <label for="ai-key-input"><b>Use your own OpenAI API key</b></label>
      <div class="row"><input id="ai-key-input" type="password" placeholder="sk-…" autocomplete="off" spellcheck="false"><button type="submit">Use key</button></div>
      <label><input id="ai-key-remember" type="checkbox"> Remember in this browser</label>
      <div class="note">Your key stays in your browser and goes only to OpenAI. Use a restricted or low-limit key.</div>
      <div class="err" id="ai-key-err" role="alert"></div>
    </form>`;
  const bar = document.createElement('div');
  bar.id = 'ai-key-bar';
  bar.hidden = true;
  bar.innerHTML = '<span>Using your OpenAI key (stays in this browser).</span><button type="button" id="ai-key-clear">Clear key</button>';
  const off = document.getElementById('ai-off');
  off.parentNode.insertBefore(box, off);
  off.parentNode.insertBefore(bar, off);

  let mode = null; // 'proxy' | 'key'
  function showKeyUi (error) {
    const has = Boolean(readKey());
    box.hidden = has;
    bar.hidden = !has;
    document.getElementById('ai-key-err').textContent = error || '';
    off.hidden = true;
  }

  box.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('ai-key-input');
    const key = input.value.trim();
    input.value = '';
    if (!key) { document.getElementById('ai-key-err').textContent = 'Paste a key first.'; return; }
    saveKey(key, document.getElementById('ai-key-remember').checked);
    aiHealth();
    aiText.focus();
  });
  document.getElementById('ai-key-clear').addEventListener('click', () => { clearKey(); aiHealth(); });

  // ---- transport
  const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

  async function openaiChat (body) {
    const key = readKey();
    if (!key) return json(401, { error: 'Add your OpenAI key above first.' });
    const { messages, tools } = JSON.parse(body);
    const payload = { model: MODEL, messages };
    if (Array.isArray(tools) && tools.length) { payload.tools = tools; payload.tool_choice = 'auto'; }
    payload.reasoning_effort = EFFORT; // gpt-5-mini is a reasoning model
    let res;
    try {
      res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new Error('could not reach OpenAI. Check your connection and try again.');
    }
    if (res.ok) return res;
    const j = await res.json().catch(() => ({}));
    let msg;
    if (res.status === 401) {
      msg = 'OpenAI did not accept this key (401). Clear it and paste a valid one.';
    } else if (res.status === 429) {
      msg = 'OpenAI rate limit or quota reached for this key (429). Wait a moment, or check the key\'s limits and billing.';
    } else {
      msg = `OpenAI returned ${res.status}${j.error && j.error.message ? `: ${scrub(j.error.message)}` : ''}`;
    }
    return json(res.status, { error: msg });
  }

  async function probeProxy () {
    if (!PAGE_IS_LOCAL) return false;
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 1500);
      const res = await fetch(`${LOCAL_PROXY}/health`, { signal: ctl.signal });
      clearTimeout(t);
      return res.ok;
    } catch { return false; }
  }

  // Replaces the app's aiFetch: the local proxy when it answers, otherwise OpenAI with the visitor's key.
  aiFetch = async function (path, body) {
    if (mode === 'proxy') return fetch(`${LOCAL_PROXY}${path}`, body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body });
    if (path === '/health') return json(200, { ok: Boolean(readKey()), model: MODEL });
    if (path === '/chat') return openaiChat(body);
    return json(404, { error: 'not found' });
  };

  // Replaces the app's aiHealth: same status line, plus the key form when there is no proxy.
  aiHealth = async function () {
    const status = document.getElementById('ai-status');
    if (mode !== 'proxy') mode = (await probeProxy()) ? 'proxy' : 'key';
    if (mode === 'proxy') {
      box.hidden = true; bar.hidden = true;
      try {
        const j = await (await aiFetch('/health')).json();
        aiReady = !!j.ok;
        status.textContent = j.ok ? j.model : 'proxy has no API key';
      } catch { aiReady = false; status.textContent = 'offline'; mode = null; }
      off.hidden = aiReady;
    } else {
      aiReady = Boolean(readKey());
      status.textContent = aiReady ? `${MODEL} · your key` : 'needs your OpenAI key';
      showKeyUi();
    }
    status.className = aiReady ? 'ok' : 'off';
    aiSendBtn.disabled = !aiReady || aiBusy;
  };
})();
