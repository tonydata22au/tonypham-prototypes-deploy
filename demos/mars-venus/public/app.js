/* Swipe the Moment — a 30-second game in the world of
   "Men Are from Mars, Women Are from Venus" (Mars = men, Venus = women, as in the book).
   The first tap picks your planet; every moment then comes from the other planet.
   Every number on screen comes from data/content.json (built from research files) and has sources,
   so players see what the book says AND what research says. Nothing is saved or sent. */
(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const app = $("#app"), panel = $("#panel");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const LIGHT_TEXT = { GREEN: "Research backs it", AMBER: "Partly backed", RED: "Research disagrees", GREY: "Not tested yet" };
  const NAME = { mars: "Mars", venus: "Venus" };
  const other = (side) => (side === "mars" ? "venus" : "mars");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------- icons (thin line, 24px grid)
  const P = {
    toolbox: '<rect x="3" y="9" width="18" height="11"/><path d="M9 9V6h6v3M3 13h18"/>',
    ear: '<path d="M7 9a5 5 0 1 1 10 0c0 3.5-3.5 4-3.5 7.5a2.5 2.5 0 0 1-5 0"/><path d="M10 9a2 2 0 0 1 4 0c0 1.5-1.5 2-1.5 3"/>',
    cave: '<path d="M3 19c0-7 4-12 9-12s9 5 9 12z"/><path d="M9 19c0-3 1.3-5 3-5s3 2 3 5"/>',
    wave: '<path d="M2 12c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2 5-1"/><path d="M2 17c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2 5-1"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    signal: '<path d="M4 5h16v10H9l-5 4z"/>',
    orbit: '<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-20 12 12)"/>',
    gauge: '<path d="M4 17a8 8 0 0 1 16 0"/><path d="M12 17l4-5"/>',
    heat: '<path d="M10 4a2 2 0 0 1 4 0v10a4 4 0 1 1-4 0z"/><path d="M12 10v6"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
    letter: '<rect x="3" y="6" width="18" height="12"/><path d="M3 7l9 6 9-6"/>',
    arrow: '<path d="M5 12h12M13 7l5 5-5 5"/>',
    star: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.3 6L12 16.4l-5.4 3 1.3-6-4.5-4.1 6-.7z"/>',
    planets: '<circle cx="8" cy="12" r="4"/><circle cx="17.5" cy="12" r="2.5"/>',
    left: '<path d="M15 5l-7 7 7 7"/>',
    right: '<path d="M9 5l7 7-7 7"/>',
    hand: '<path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11m0-1.5a1.5 1.5 0 0 1 3 0V12m0-1a1.5 1.5 0 0 1 3 0v4c0 3.3-2.2 6-5.5 6H11c-1.7 0-3-.8-4-2l-3-4.2a1.5 1.5 0 0 1 2.3-1.9L9 15"/>',
  };
  const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || P.star}</svg>`;

  // ---------- planet faces
  const FACE = {
    happy: '<ellipse cx="38" cy="46" rx="3.6" ry="5"/><ellipse cx="62" cy="46" rx="3.6" ry="5"/><path d="M38 61 Q50 71 62 61" fill="none" stroke-width="3.2" stroke-linecap="round"/><ellipse class="blush" cx="28" cy="58" rx="5" ry="3"/><ellipse class="blush" cx="72" cy="58" rx="5" ry="3"/>',
    low: '<ellipse cx="38" cy="47" rx="3.4" ry="4.4"/><ellipse cx="62" cy="47" rx="3.4" ry="4.4"/><path d="M40 66 Q50 59 60 66" fill="none" stroke-width="3.2" stroke-linecap="round"/><path d="M64 54 q2 6 0 8 q-2-2 0-8" fill="#8fd0ff" stroke="none"/>',
    grumpy: '<path d="M32 38 L43 42 M68 38 L57 42" stroke-width="3.2" stroke-linecap="round"/><ellipse cx="38" cy="48" rx="3.4" ry="4.4"/><ellipse cx="62" cy="48" rx="3.4" ry="4.4"/><path d="M40 66 Q50 60 60 66" fill="none" stroke-width="3.2" stroke-linecap="round"/>',
    calm: '<path d="M33 47 Q38 51 43 47 M57 47 Q62 51 67 47" fill="none" stroke-width="3" stroke-linecap="round"/><path d="M40 61 Q50 68 60 61" fill="none" stroke-width="3.2" stroke-linecap="round"/>',
    curious: '<ellipse cx="38" cy="46" rx="3.6" ry="5"/><ellipse cx="62" cy="46" rx="3.6" ry="5"/><circle cx="50" cy="63" r="4" fill="none" stroke-width="3"/>',
    quiet: '<path d="M33 48 L43 48 M57 48 L67 48" stroke-width="3" stroke-linecap="round"/><path d="M42 64 L58 64" stroke-width="3.2" stroke-linecap="round"/>',
  };
  function setFace(el, mood) {
    el.dataset.mood = mood;
    const svg = el.querySelector(".face");
    svg.innerHTML = `<g fill="#1a0b03" stroke="#1a0b03">${FACE[mood] || FACE.calm}</g>`;
    svg.querySelectorAll(".blush").forEach((b) => { b.setAttribute("fill", "#ff9eb5"); b.setAttribute("stroke", "none"); b.setAttribute("opacity", ".55"); });
  }

  // ---------- state ("played" and "coached" last for this visit only; nothing is saved)
  const fresh = () => ({ orbit: 820, heat: 30, good: 0, side: null, quiz: null, hookGood: null, picks: [], suggested: false, deck: [], i: 0, score: {}, t0: performance.now() });
  const S = { content: null, busy: false, played: new Set(), coached: false, ...fresh() };
  const loaded = fetch("data/content.json").then((r) => r.json()).then((c) => (S.content = c)).catch(() => null);
  const idea = (ch) => S.content && S.content.ideas.find((i) => i.chapter === ch);
  const P_EL = { mars: $("#mars"), venus: $("#venus") };
  const me = () => P_EL[S.side], them = () => P_EL[other(S.side)];

  // ---------- top bar + live numbers
  function step(label) { $("#stepLabel").textContent = label; }
  setInterval(() => { const s = Math.floor((performance.now() - S.t0) / 1000); $("#clock").textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; }, 250);
  function animateNum(el, to, upIsGood = false) {
    const from = +el.textContent || 0; if (from === to) return;
    el.classList.remove("up", "down"); el.classList.add((to > from) !== upIsGood ? "up" : "down");
    const t0 = performance.now(), d = reduce ? 1 : 700;
    const tick = (t) => { const k = Math.min(1, (t - t0) / d); el.textContent = Math.round(from + (to - from) * k); if (k < 1) requestAnimationFrame(tick); else setTimeout(() => el.classList.remove("up", "down"), 900); };
    requestAnimationFrame(tick);
  }
  function layout() {
    const px = 70 + ((S.orbit - 200) / 1200) * 190; // distance in km -> gap on screen; Mars always left, Venus right
    P_EL.mars.style.setProperty("--x", `${-px / 2}px`); P_EL.venus.style.setProperty("--x", `${px / 2}px`);
    const tw = Math.max(0, px - 96); $("#tether").style.width = `${tw}px`; $("#tetherKm").textContent = `${S.orbit} km`; $("#tetherKm").style.opacity = tw > 50 ? 1 : 0;
    animateNum($("#tOrbit"), S.orbit); animateNum($("#tHeat"), S.heat); animateNum($("#tSignal"), S.good, true);
  }
  function tags() {
    for (const side of ["mars", "venus"]) {
      const el = P_EL[side]; el.classList.toggle("me", S.side === side);
      el.querySelector(".tag").textContent = S.side === side ? `${NAME[side]} · You` : NAME[side];
    }
  }
  function signal(from, text) {
    const s = $("#signal"); s.classList.remove("quiet"); $("#signalFrom").textContent = from; $("#signalText").textContent = text;
    s.classList.remove("pop"); void s.offsetWidth; s.classList.add("pop");
  }
  const hush = () => $("#signal").classList.add("quiet");

  // ---------- starfield + sparkle bursts
  const cv = $("#stars"), cx = cv.getContext("2d");
  let W, H, stars = [], sparks = [];
  function resize() {
    const d = devicePixelRatio || 1; W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; cx.setTransform(d, 0, 0, d, 0, 0);
    stars = Array.from({ length: Math.round((W * H) / 3500) }, () => ({ x: Math.random() * W, y: Math.random() * H, z: Math.random() * 0.9 + 0.1, p: Math.random() * 6.28 }));
  }
  function frame(t) {
    cx.clearRect(0, 0, W, H);
    for (const s of stars) {
      if (!reduce) { s.x -= s.z * 0.06; if (s.x < 0) s.x = W; }
      const a = reduce ? 0.7 : 0.45 + 0.45 * Math.sin(t / 900 * s.z + s.p);
      cx.fillStyle = `rgba(255,255,255,${a * s.z + 0.1})`; cx.fillRect(s.x, s.y, s.z * 1.6, s.z * 1.6);
    }
    sparks = sparks.filter((p) => (p.life -= 1) > 0);
    for (const p of sparks) { p.x += p.vx; p.y += p.vy; p.vy += 0.02; cx.fillStyle = `rgba(${p.c},${p.life / 60})`; cx.fillRect(p.x, p.y, 2, 2); }
    requestAnimationFrame(frame);
  }
  function burst(good) {
    if (reduce) return;
    const a = P_EL.mars.getBoundingClientRect(), b = P_EL.venus.getBoundingClientRect();
    const x = (a.left + a.right + b.left + b.right) / 4, y = (a.top + a.bottom) / 2;
    for (let k = 0; k < 40; k++) { const ang = Math.random() * 6.28, sp = Math.random() * 2.4 + 0.6; sparks.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 60, c: good ? "140,255,170" : "255,110,110" }); }
  }
  addEventListener("resize", resize); resize(); requestAnimationFrame(frame);

  // ---------- the swipe card (Tinder/Bumble style): drag the card, or tap a round button
  let active = null; // {left, right, onPick}
  function moment({ who, prompt, label, cardIcon, left, right, onPick }) {
    hush();
    const coach = !S.coached;
    const whoHtml = who ? `<i class="pdot ${who}"></i><span class="label">${NAME[who]}</span>` : `<span class="label">Question</span>`;
    const round = (side, o) => `<button class="round" data-side="${side}" aria-label="${esc(o.text)}"><span class="circle">${icon(o.icon || side)}</span><span class="rtext">${esc(o.text)}</span></button>`;
    panel.innerHTML = `
      <div class="stack">
        <div class="tcard back" aria-hidden="true"></div>
        <div class="tcard ${coach ? "coaching" : ""} ${coach && !reduce ? "nudge" : ""}" id="card" tabindex="0" aria-label="${esc(prompt)}. Swipe left or right, or tap a button below.">
          <div class="who">${whoHtml}</div>
          <div class="prompt">${esc(who ? prompt.replace(/^(Venus|Mars): /, "") : prompt)}</div>
          <div class="cardfoot"><span class="label">${esc(label)}</span>${icon(cardIcon)}</div>
          <div class="stamp left">${esc(left.text)}</div><div class="stamp right">${esc(right.text)}</div>
          ${coach ? `<div class="coach">${icon("hand").replace("<svg", '<svg class="hand"')}<span class="label">Swipe the card, or tap a button</span></div>` : ""}
        </div>
      </div>
      <div class="rounds">${round("left", left)}<span class="or label">◀ swipe ▶<br>or tap</span>${round("right", right)}</div>`;
    active = { left, right, onPick };
    panel.querySelectorAll(".round").forEach((b) => b.addEventListener("click", () => pick(b.dataset.side)));
    drag($("#card"));
  }
  function pick(side) {
    if (!active || S.busy) return; S.busy = true; S.coached = true;
    const a = active; active = null;
    const c = $("#card"); if (c) { c.classList.remove("nudge", "coaching"); const co = c.querySelector(".coach"); if (co) co.remove(); c.querySelector(`.stamp.${side}`).style.opacity = 1; c.classList.add(side === "left" ? "fly-left" : "fly-right"); }
    if (navigator.vibrate) navigator.vibrate(12);
    setTimeout(async () => { await loaded; S.busy = false; a.onPick(a[side]); }, reduce ? 0 : 360);
  }
  function drag(card) {
    let x0 = null, dx = 0, t0 = 0;
    const L = card.querySelector(".stamp.left"), R = card.querySelector(".stamp.right");
    const hot = (side) => panel.querySelectorAll(".round").forEach((b) => b.classList.toggle("hot", b.dataset.side === side));
    card.addEventListener("pointerdown", (e) => {
      x0 = e.clientX; dx = 0; t0 = performance.now(); card.setPointerCapture(e.pointerId); card.classList.remove("nudge", "coaching"); card.classList.add("dragging");
      const co = card.querySelector(".coach"); if (co) co.remove();
    });
    card.addEventListener("pointermove", (e) => {
      if (x0 === null) return; dx = e.clientX - x0;
      card.style.transform = `translateX(${dx}px) rotate(${dx / 16}deg)`;
      R.style.opacity = Math.max(0, Math.min(1, dx / 90)); L.style.opacity = Math.max(0, Math.min(1, -dx / 90));
      hot(dx < -25 ? "left" : dx > 25 ? "right" : null);
    });
    const end = () => {
      if (x0 === null) return; x0 = null; card.classList.remove("dragging"); hot(null);
      const fast = Math.abs(dx) / Math.max(1, performance.now() - t0) > 0.6;
      if (Math.abs(dx) > 90 || (fast && Math.abs(dx) > 30)) pick(dx < 0 ? "left" : "right");
      else { card.style.transform = ""; L.style.opacity = 0; R.style.opacity = 0; }
    };
    card.addEventListener("pointerup", end); card.addEventListener("pointercancel", end);
  }
  addEventListener("keydown", (e) => {
    if (!$("#sheet").hidden) { if (e.key === "Escape") closeSheet(); return; }
    if (active && (e.key === "ArrowLeft" || e.key === "ArrowRight")) pick(e.key === "ArrowLeft" ? "left" : "right");
    else if (!S.side && (e.key === "ArrowLeft" || e.key === "ArrowRight")) choose(e.key === "ArrowLeft" ? "mars" : "venus");
  });

  // ---------- after each swipe: how it landed, the book's advice, and the research light
  const REPLY = {
    venus: { good: "…thank you. that helps.", miss: "you're not listening." },
    mars: { good: "…thanks. I appreciate that.", miss: "just let me be." },
  };
  function reveal(chapter, good, next) {
    const i = idea(chapter), o = other(S.side);
    S.played.add(chapter);
    S.orbit = Math.max(200, Math.min(1400, S.orbit + (good ? -140 : 160)));
    S.heat = Math.max(0, Math.min(100, S.heat + (good ? -12 : 22)));
    if (good) S.good++;
    setFace(them(), good ? "happy" : "grumpy"); layout(); burst(good);
    signal(NAME[o], REPLY[o][good ? "good" : "miss"]);
    panel.innerHTML = `
      <h2 class="${good ? "good" : "bad"}">${good ? "Good move" : "Not quite"}</h2>
      <p class="small">${good ? "You two got closer. Tension went down." : "You drifted apart. Tension went up."}</p>
      <span class="label">The book says · ${esc(i.name)}</span>
      <p>${esc(i.why[S.side])}</p>
      <div class="row spread"><span class="light"><i class="dot ${i.light}"></i>${LIGHT_TEXT[i.light]}</span><button class="link" data-receipt="${i.chapter}">Sources</button></div>
      <div class="row" style="margin-top:16px"><button class="btn solid wide" id="next">Next ▶</button></div>`;
    $("#next").addEventListener("click", next); $("#next").focus({ preventScroll: true });
  }

  // ---------- 0 s: which planet are you from?
  function start() {
    Object.assign(S, fresh()); app.classList.remove("compact"); tags();
    for (const el of Object.values(P_EL)) { el.classList.remove("aura-mars", "aura-venus", "pulse"); el.classList.add("pickable"); }
    setFace(P_EL.mars, "calm"); setFace(P_EL.venus, "calm"); layout();
    step("Pick your planet"); signal("Start here", "Which planet are you from?");
    panel.innerHTML = `
      <span class="label">Tap one · based on John Gray's book <i>Men Are from Mars, Women Are from Venus</i></span>
      <div class="pickrow">
        <button class="pickbtn" data-side="mars"><i class="pm"></i>I'm from Mars<small>The men, in the book</small></button>
        <button class="pickbtn" data-side="venus"><i class="pv"></i>I'm from Venus<small>The women, in the book</small></button>
      </div>
      <p style="margin-top:14px"><a class="link" href="how.html">How I built it →</a></p>`;
    panel.querySelectorAll(".pickbtn").forEach((b) => b.addEventListener("click", () => choose(b.dataset.side)));
    active = null;
  }
  for (const side of ["mars", "venus"]) P_EL[side].addEventListener("click", () => { if (!S.side) choose(side); });
  function choose(side) {
    if (S.side) return;
    S.side = side; tags();
    for (const el of Object.values(P_EL)) el.classList.remove("pickable");
    me().classList.add("ignite"); setTimeout(() => me().classList.remove("ignite"), 900); setFace(me(), "happy"); burst(true);
    setTimeout(hook, reduce ? 0 : 450);
  }

  // ---------- about 1 s: the first moment from the other planet
  function hook() {
    step("First moment");
    if (S.side === "mars") {
      setFace(P_EL.venus, "low");
      moment({ who: "venus", prompt: "\"ugh. today was a mess.\"", label: "What do you do?", cardIcon: "signal",
        left: { text: "Fix it", icon: "toolbox", good: false }, right: { text: "Just listen", icon: "ear", good: true },
        onPick: (o) => { S.hookGood = o.good; reveal(2, o.good, quiz); } });
    } else {
      setFace(P_EL.mars, "quiet");
      moment({ who: "mars", prompt: "Mars goes quiet. He won't say why.", label: "What do you do?", cardIcon: "signal",
        left: { text: "Ask what's wrong, now", icon: "signal", good: false }, right: { text: "Give him cave time", icon: "cave", good: true },
        onPick: (o) => { S.hookGood = o.good; reveal(3, o.good, quiz); } });
    }
  }

  // ---------- about 10 s: how Martian are you? (the book's view + the research light)
  function quiz() {
    step("How Martian are you?"); setFace(them(), "calm"); me().classList.add("pulse"); setFace(me(), "curious");
    moment({ prompt: "When you're stressed, you usually…", label: "Be honest", cardIcon: "planets",
      left: { text: "Go quiet", icon: "cave", style: "mars" }, right: { text: "Talk it out", icon: "wave", style: "venus" },
      onPick: (o) => {
        S.quiz = o.style; const el = me(); el.classList.remove("pulse"); setFace(el, "happy"); burst(true);
        const pure = o.style === S.side; if (!pure) el.classList.add(o.style === "venus" ? "aura-venus" : "aura-mars");
        const title = pure ? (S.side === "mars" ? "Very Martian" : "Very Venusian") : (S.side === "mars" ? "Mars, with some Venus" : "Venus, with some Mars");
        const line = o.style === "mars" ? "You go quiet to sort things out, like the book's Mars." : "You talk things out, like the book's Venus.";
        signal("Result", pure ? "Just like the book." : "Not quite like the book.");
        const c1 = idea(1);
        panel.innerHTML = `
          <span class="label">How Martian are you?</span>
          <h2>${title}</h2>
          <div class="meter"><span class="label">Mars</span><i><b style="--at:${o.style === "mars" ? 12 : 88}%"></b></i><span class="label">Venus</span></div>
          <p>${line}</p>
          <div class="row spread"><span class="light"><i class="dot ${c1.light}"></i>${LIGHT_TEXT[c1.light]}</span><button class="link" data-receipt="1">Sources</button></div>
          <p class="small" style="margin-top:8px">The book says men go quiet and women talk. Studies find men and women are alike in most ways.</p>
          <div class="row" style="margin-top:12px"><button class="btn solid wide" id="next">Pick my habits ▶</button></div>`;
        $("#next").addEventListener("click", plan); $("#next").focus({ preventScroll: true });
      } });
  }

  // ---------- about 20 s: pick habits (3 suggested, skipping ones already played this visit)
  const PREF = [9, 13, 8, 4, 10, 12, 1, 5, 6, 11, 7, 3, 2];
  function suggest() {
    const base = S.side === "mars" ? [S.hookGood ? 10 : 2, S.quiz === "mars" ? 3 : 5, 7] : [S.hookGood ? 4 : 3, S.quiz === "mars" ? 6 : 12, 2];
    const fresh3 = [...new Set(base.concat(PREF))].filter((c) => !S.played.has(c)).slice(0, 3);
    return fresh3.length ? fresh3 : base;
  }
  const perHabit = () => (S.picks.length <= 3 ? 2 : 1);
  function plan() {
    step("Pick habits"); app.classList.add("compact");
    if (!S.content) { panel.innerHTML = "<h2>Can't load</h2><p>The game data didn't load. Reload the page to try again.</p>"; return; }
    if (!S.suggested) { S.picks = suggest(); S.suggested = true; } // only once per round, so 'Clear' really clears
    const all = S.content.ideas.map((i) => i.chapter), unplayed = all.filter((c) => !S.played.has(c));
    const rows = [...S.content.ideas].sort((a, b) => a.chapter - b.chapter).map((i) => {
      const on = S.picks.includes(i.chapter);
      return `<li class="habit ${on ? "on" : ""}" data-ch="${i.chapter}">
        <button class="pick" aria-pressed="${on}"><span class="check">${on ? "✓" : ""}</span>${icon(i.icon)}<span>${esc(i.name)}${S.played.has(i.chapter) ? '<span class="played">Played</span>' : ""}</span></button>
        <span class="rank" title="Reader rank">#${i.reader.rank}</span><i class="dot ${i.light}" title="${LIGHT_TEXT[i.light]}"></i>
        <button class="info" data-receipt="${i.chapter}" aria-label="Sources for ${esc(i.name)}">i</button>
      </li>`;
    }).join("");
    const n = S.picks.length, moments = n * perHabit();
    panel.innerHTML = `
      <span class="label">${!S.played.size ? `We ticked 3 that fit your answers` : unplayed.length ? `You've played ${S.played.size} · we ticked 3 you haven't played` : `You've played all ${all.length} · tick any to play again`} · change any</span>
      <h2>Your habits</h2>
      <div class="tools">
        <button class="chip" id="all" aria-pressed="${n === all.length}">Select all</button>
        ${S.played.size && unplayed.length ? `<button class="chip" id="unplayed">Select not played yet</button>` : ""}
        <button class="chip" id="none">Clear</button>
      </div>
      <ul class="habits">${rows}</ul>
      <p class="small"># = how much readers love it (1 = most) · i = sources<br><i class="dot GREEN"></i> research backs it · <i class="dot AMBER"></i> partly · <i class="dot RED"></i> disagrees · <i class="dot GREY"></i> not tested</p>
      <div class="sticky"><button class="btn solid wide" id="launch" ${n ? "" : "disabled"}>${n ? `Start · ${moments} moments (${perHabit()} per habit) ▶` : "Pick at least 1 habit"}</button></div>`;
    const redraw = () => { const st = panel.scrollTop; plan(); panel.scrollTop = st; };
    panel.querySelectorAll(".habit .pick").forEach((b) => b.addEventListener("click", () => {
      const ch = +b.closest(".habit").dataset.ch;
      S.picks = S.picks.includes(ch) ? S.picks.filter((c) => c !== ch) : S.picks.concat(ch);
      redraw();
    }));
    $("#all").addEventListener("click", () => { S.picks = S.picks.length === all.length ? [] : all.slice(); redraw(); });
    $("#none").addEventListener("click", () => { S.picks = []; redraw(); });
    const up = $("#unplayed"); if (up) up.addEventListener("click", () => { S.picks = unplayed.slice(); redraw(); });
    $("#launch").addEventListener("click", launch);
  }

  // ---------- the moments: 2 per habit (1 each when more than 3 are picked), all from the other planet
  function launch() {
    const k = perHabit();
    S.picks.sort((a, b) => a - b);
    const pool = S.picks.map((ch) => shuffle(idea(ch).scenarios.filter((s) => s.for === S.side)).slice(0, k).map((s) => ({ ...s, chapter: ch })));
    S.deck = []; for (let r = 0; r < k; r++) for (const p of pool) if (p[r]) S.deck.push(p[r]);
    if (k === 1) S.deck = shuffle(S.deck);
    S.i = 0; S.score = Object.fromEntries(S.picks.map((c) => [c, { good: 0, n: 0 }]));
    app.classList.remove("compact"); next();
  }
  function next() {
    if (S.i >= S.deck.length) return debrief();
    const m = S.deck[S.i++], flip = Math.random() < 0.5, i = idea(m.chapter);
    const good = { text: m.good, good: true }, miss = { text: m.miss, good: false };
    step(`Moment ${S.i} of ${S.deck.length}`); setFace(them(), ["low", "calm", "quiet"][Math.floor(Math.random() * 3)]); setFace(me(), "calm");
    moment({ who: other(S.side), prompt: m.prompt, label: i.name, cardIcon: i.icon, left: flip ? good : miss, right: flip ? miss : good,
      onPick: (o) => { const sc = S.score[m.chapter]; sc.n++; if (o.good) sc.good++; reveal(m.chapter, o.good, next); } });
  }

  // ---------- results: score, one move for today, and the star map (readers' love vs research)
  const ratio = (s) => (s && s.n ? s.good / s.n : 0);
  function debrief() {
    step("Your results"); app.classList.add("compact"); setFace(P_EL.mars, "happy"); setFace(P_EL.venus, "happy");
    signal("Done", "Nice flying.");
    const total = Object.values(S.score).reduce((a, s) => a + s.n, 0), got = Object.values(S.score).reduce((a, s) => a + s.good, 0);
    const weakest = S.picks.slice().sort((a, b) => ratio(S.score[a]) - ratio(S.score[b]))[0];
    const I = S.content.ideas, gems = I.filter((i) => i.reader.score < 30 && i.light === "GREEN"), both = I.filter((i) => i.reader.score > 50 && i.light === "GREEN");
    panel.innerHTML = `
      <span class="label">Your results · ${NAME[S.side]}</span>
      <div class="row spread"><div class="score">${got}/${total}</div><span class="label" style="text-align:right">good moves<br>distance ${S.orbit} km</span></div>
      <div class="bars">${S.picks.map((c) => `<div class="bar"><span>${esc(idea(c).name)}</span><span>${S.score[c].good}/${S.score[c].n}</span><i style="--w:${Math.round(ratio(S.score[c]) * 100)}%"></i></div>`).join("")}</div>
      <div class="move"><span class="label">Try this today</span><b>${esc(idea(weakest).actions[S.side])}</b></div>
      <span class="label">All 13 habits · what readers love vs what research backs</span>
      ${starMap()}
      <div class="insight"><i class="dot GREEN" style="margin-top:6px"></i><span>Only <b>${both.length}</b> habit is both loved by readers <i>and</i> backed by research: <button class="link" data-receipt="${both[0].chapter}">${esc(both[0].name)}</button></span></div>
      <div class="insight"><i class="dot GREEN" style="margin-top:6px"></i><span><b>${gems.length} hidden gems</b>: readers skip them, but research backs them. Tap a pulsing star to learn more.</span></div>
      <div class="row" style="margin-top:14px"><button class="btn solid" id="again">Play again</button><button class="btn" id="share">Share the game</button></div>
      <p style="margin-top:12px"><a class="link" href="how.html">How I built it →</a></p>
      <p class="foot">This is a game, not therapy. If someone controls or scares you, talk to someone you trust or a helpline.<br>
      Story and advice: John Gray, <i>Men Are from Mars, Women Are from Venus</i> (1992). The book says men and women are very different. Studies find we're alike in most ways. The coloured lights show what research says.
      Reader data: ${S.content.reviewsRead} reviews and ${S.content.quotesChecked} Goodreads quotes, read ${esc(S.content.readOn)}.</p>`;
    panel.scrollTop = 0;
    panel.querySelectorAll(".star").forEach((s) => { s.addEventListener("click", () => openSheet(+s.dataset.ch, true)); s.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSheet(+s.dataset.ch, true); } }); });
    $("#again").addEventListener("click", start);
    $("#share").addEventListener("click", share);
  }
  function starMap() {
    const X = (x) => 34 + x * 270, Y = (y) => 214 - y * 192, lift = (i) => ((i.reader.rank % 3) - 1) * 12; // spread stars that share a light
    const col = { GREEN: "#69db7c", AMBER: "#ffc078", RED: "#ff6b6b", GREY: "#adb5bd" };
    const qx = X(50 / Math.max(...S.content.ideas.map((i) => i.reader.score))), qy = Y(0.68);
    const stars = S.content.ideas.map((i) => {
      const x = X(i.map.x), y = Y(i.map.y) + lift(i), gem = i.reader.score < 30 && i.light === "GREEN", mine = S.picks.includes(i.chapter);
      return `<g class="star" data-ch="${i.chapter}" tabindex="0" role="button" aria-label="${esc(i.name)}: reader rank ${i.reader.rank}, ${LIGHT_TEXT[i.light]}">
        ${gem ? `<circle class="gem" cx="${x}" cy="${y}" r="11" fill="none" stroke="${col[i.light]}"/>` : ""}
        ${mine ? `<circle cx="${x}" cy="${y}" r="8" fill="none" stroke="#fff" stroke-dasharray="2 2"/>` : ""}
        <circle class="core" cx="${x}" cy="${y}" r="${3 + i.map.x * 3}" fill="${col[i.light]}" filter="url(#glow)"/>
        <text x="${x + 8}" y="${y + 3}" fill="rgba(255,255,255,.7)" font-size="8" letter-spacing="1">${i.chapter}</text></g>`;
    }).join("");
    return `<svg class="map" viewBox="0 0 320 250" role="img" aria-label="Star map of the 13 habits: across is how much readers love it, up is how much research backs it">
      <defs><filter id="glow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <line x1="${qx}" y1="16" x2="${qx}" y2="220" stroke="rgba(255,255,255,.2)" stroke-dasharray="3 4"/>
      <line x1="30" y1="${qy}" x2="310" y2="${qy}" stroke="rgba(255,255,255,.2)" stroke-dasharray="3 4"/>
      <g fill="rgba(255,255,255,.45)" font-size="7.5" letter-spacing="1.4">
        <text x="36" y="26">HIDDEN GEMS</text><text x="304" y="26" text-anchor="end">LOVED + BACKED</text>
        <text x="36" y="212">SKIPPED, NOT BACKED</text><text x="304" y="212" text-anchor="end">LOVED, NOT BACKED</text>
        <text x="170" y="242" text-anchor="middle">READERS LOVE IT →</text><text x="12" y="120" transform="rotate(-90 12 120)" text-anchor="middle">RESEARCH BACKS IT →</text>
      </g>${stars}</svg>`;
  }

  // ---------- sources sheet
  function openSheet(ch, fromMap) {
    const i = idea(ch); if (!i) return;
    $("#sheetContent").innerHTML = `
      <span class="label">Sources · from chapter ${i.chapter} of the book: ${esc(i.bookTitle)}</span>
      <h3 id="sheetTitle">${esc(i.name)}</h3>
      <span class="label">The book says${S.side ? ` · to ${NAME[S.side]}` : ""}</span>
      <p>${esc(i.why[S.side || "mars"])}</p>
      <span class="light"><i class="dot ${i.light}"></i>${LIGHT_TEXT[i.light]}</span>
      <p>${esc(i.lightReason)}</p>
      <div class="stats">
        <div><b>#${i.reader.rank}</b><span class="label">reader rank</span></div>
        <div><b>${i.reader.score}</b><span class="label">reader score</span></div>
        <div><b>${i.reader.quoteLikes}</b><span class="label">quote likes</span></div>
        <div><b>${i.reader.mentions}</b><span class="label">review mentions</span></div>
      </div>
      <span class="label">Where this comes from</span>
      <ol>${i.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a><span class="status">${s.status === "read" ? "read in full" : "summary only"}</span></li>`).join("")}</ol>
      <p class="small">${esc(S.content.method)}</p>
      ${fromMap && S.side ? `<button class="btn wide" id="practise">Practise this habit ▶</button>` : ""}`;
    $("#sheet").hidden = false; $("#sheetClose").focus();
    const pr = $("#practise");
    if (pr) pr.addEventListener("click", () => { closeSheet(); S.picks = [ch]; S.deck = shuffle(i.scenarios.filter((s) => s.for === S.side)).map((s) => ({ ...s, chapter: ch })); S.i = 0; S.score = { [ch]: { good: 0, n: 0 } }; app.classList.remove("compact"); next(); });
  }
  function closeSheet() { $("#sheet").hidden = true; }
  $("#sheetClose").addEventListener("click", closeSheet);
  $("#sheet").addEventListener("click", (e) => { if (e.target.id === "sheet") closeSheet(); });
  document.addEventListener("click", (e) => { const r = e.target.closest("[data-receipt]"); if (r) openSheet(+r.dataset.receipt, false); });

  // ---------- helpers
  function shuffle(a) { a = a.slice(); for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; } return a; }
  function toast(t) { const el = document.createElement("div"); el.className = "toast"; el.textContent = t; document.body.appendChild(el); setTimeout(() => el.remove(), 1600); }
  async function share() {
    const data = { title: "Swipe the Moment", text: "Are you from Mars or Venus? A 30-second game: what the book says, and what research says.", url: location.href };
    try { if (navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(location.href); toast("Link copied"); } } catch (_) { /* user closed the share sheet */ }
  }

  start();
})();
