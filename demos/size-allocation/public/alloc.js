// Size and store allocation: synthetic data and allocation logic. Pure functions, no DOM.
// Classic script (not an ES module) so index.html also works when opened from disk.
(function (root) {
  const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const WEEKS = 26;
  const N_STYLES = 60;
  // Regional body-size skew, in size steps: the reason one chain-wide curve fails.
  const REGIONS = [
    { name: 'Tokyo', skew: -0.8 }, { name: 'Seoul', skew: -0.7 }, { name: 'Singapore', skew: -0.6 },
    { name: 'Ho Chi Minh City', skew: -0.9 }, { name: 'Milan', skew: -0.2 }, { name: 'Madrid', skew: -0.2 },
    { name: 'Paris', skew: 0 }, { name: 'London', skew: 0.2 }, { name: 'Amsterdam', skew: 0.5 },
    { name: 'Stockholm', skew: 0.5 }, { name: 'New York', skew: 0.5 }, { name: 'Chicago', skew: 0.7 },
  ];
  const STORES_PER_CITY = [4, 3, 3, 3, 3, 3, 4, 4, 3, 3, 4, 3]; // 40 stores
  const CHAIN_MEAN = 2.4; // between M and L
  const CURVE_SD = 1.1;

  function rng(seed) { // mulberry32
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function poisson(r, lambda) {
    const L = Math.exp(-lambda);
    let k = 0, p = 1;
    do { k++; p *= r(); } while (p > L);
    return k - 1;
  }
  function normal(r) { return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r()); }
  function curve(mean) {
    const w = SIZES.map((_, i) => Math.exp(-((i - mean) ** 2) / (2 * CURVE_SD ** 2)));
    const s = w.reduce((a, b) => a + b, 0);
    return w.map((x) => x / s);
  }
  function normalise(v) {
    const s = v.reduce((a, b) => a + b, 0);
    return s > 0 ? Array.from(v, (x) => x / s) : Array.from(v, () => 1 / v.length);
  }

  // Split an integer total by shares so the parts sum exactly to the total (largest remainder).
  function split(total, shares) {
    const raw = shares.map((s) => s * total);
    const out = raw.map(Math.floor);
    let left = total - out.reduce((a, b) => a + b, 0);
    const order = raw.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
    for (let k = 0; left > 0; k = (k + 1) % order.length, left--) out[order[k][1]]++;
    return out;
  }

  const idx = (st, sy, z, w) => ((st * N_STYLES + sy) * SIZES.length + z) * WEEKS + w;

  // Two seasons of weekly store x style x size data. History was allocated by one chain-wide curve.
  function generate(seed = 2026) {
    const r = rng(seed);
    const stores = [];
    REGIONS.forEach((reg, c) => {
      for (let k = 1; k <= STORES_PER_CITY[c]; k++) {
        stores.push({ name: `${reg.name} ${String(k).padStart(2, '0')}`, city: reg.name,
          traffic: 0.6 + r(), curve: curve(CHAIN_MEAN + reg.skew + 0.15 * normal(r)) });
      }
    });
    const pop = Array.from({ length: N_STYLES }, () => Math.exp(0.6 * normal(r)));
    const season = Array.from({ length: WEEKS }, (_, w) => 0.8 + 0.4 * Math.sin((Math.PI * w) / WEEKS));
    const chain = curve(CHAIN_MEAN);
    const S = stores.length, Z = SIZES.length, n = S * N_STYLES * Z * WEEKS;
    const histDemand = new Uint16Array(n), histSales = new Uint16Array(n), histEnd = new Uint16Array(n);
    const histPlan = new Float64Array(S * Z); // units planned per store-size: last season's size mix
    const nextDemand = new Uint16Array(n);
    for (let st = 0; st < S; st++) {
      for (let sy = 0; sy < N_STYLES; sy++) {
        const base = 10 * pop[sy] * stores[st].traffic; // true weekly units per style-store
        // History policy: every 4 weeks, top up to 4 weeks x 1.2 of a noisy forecast, split by the chain curve.
        const plan = split(Math.round(base * (0.85 + 0.3 * r()) * 4 * 1.2), chain);
        for (let z = 0; z < Z; z++) histPlan[st * Z + z] += plan[z];
        for (let z = 0; z < Z; z++) {
          let onHand = 0;
          for (let w = 0; w < WEEKS; w++) {
            if (w % 4 === 0) { const ship = Math.max(0, plan[z] - onHand); onHand += ship; }
            const lam = base * season[w] * stores[st].curve[z];
            const i = idx(st, sy, z, w);
            histDemand[i] = poisson(r, lam);
            histSales[i] = Math.min(histDemand[i], onHand);
            onHand -= histSales[i];
            histEnd[i] = onHand;
            nextDemand[i] = poisson(r, lam);
          }
        }
      }
    }
    return { seed, stores, sizes: SIZES, weeks: WEEKS, nStyles: N_STYLES, chain, season,
      histDemand, histSales, histEnd, histPlan, nextDemand };
  }

  // Weekly demand rate (deseasoned) for every style x size in one store.
  // A size that sells out fast still shows its rate: units sold / weeks it started with stock.
  // A size that never had stock shows nothing, so it borrows the store's size ratio
  // (that size's rate vs the other sizes, from styles where both had stock).
  function storeRates(data, st) {
    const Z = data.sizes.length, W = data.weeks;
    const rates = [], seen = [];
    for (let sy = 0; sy < data.nStyles; sy++) {
      rates.push(new Array(Z).fill(0)); seen.push(new Array(Z).fill(false));
      for (let z = 0; z < Z; z++) {
        let sold = 0, exposure = 0;
        for (let w = 0; w < W; w++) {
          const i = idx(st, sy, z, w);
          sold += data.histSales[i];
          // shortcut: a sell-out week counts as half a week of stock; use daily stock snapshots when real data has them.
          if (data.histEnd[i] > 0) exposure += data.season[w];
          else if (data.histSales[i] > 0) exposure += 0.5 * data.season[w];
        }
        if (exposure > 0) { rates[sy][z] = sold / exposure; seen[sy][z] = true; }
      }
    }
    for (let z = 0; z < Z; z++) {
      let mine = 0, others = 0;
      for (let sy = 0; sy < data.nStyles; sy++) {
        if (!seen[sy][z]) continue;
        mine += rates[sy][z];
        for (let o = 0; o < Z; o++) if (o !== z && seen[sy][o]) others += rates[sy][o];
      }
      const ratio = others > 0 ? mine / others : 0;
      for (let sy = 0; sy < data.nStyles; sy++) {
        if (seen[sy][z]) continue;
        let rest = 0;
        for (let o = 0; o < Z; o++) if (o !== z && seen[sy][o]) rest += rates[sy][o];
        rates[sy][z] = ratio * rest;
      }
    }
    return rates;
  }

  // A week that ends with zero stock is a stockout week: its sales are a floor on demand, not demand.
  function correctedDemand(data, st, sy, z, rates = storeRates(data, st)) {
    const out = [];
    for (let w = 0; w < data.weeks; w++) {
      const i = idx(st, sy, z, w);
      const s = data.histSales[i];
      out.push(data.histEnd[i] === 0 ? Math.max(s, rates[sy][z] * data.season[w]) : s);
    }
    return out;
  }

  // Forecast per style-store (weekly) and one size curve per store, from history.
  function learn(data, correct = true) {
    const S = data.stores.length, Z = data.sizes.length, W = data.weeks;
    const styleStore = new Float64Array(S * data.nStyles);
    const storeCurve = [], stockShare = [];
    for (let st = 0; st < S; st++) {
      const bySize = new Array(Z).fill(0);
      const rates = correct ? storeRates(data, st) : null;
      for (let sy = 0; sy < data.nStyles; sy++) {
        let tot = 0;
        for (let z = 0; z < Z; z++) {
          let d = 0;
          if (correct) d = correctedDemand(data, st, sy, z, rates).reduce((a, b) => a + b, 0);
          else for (let w = 0; w < W; w++) d += data.histSales[idx(st, sy, z, w)];
          bySize[z] += d; tot += d;
        }
        styleStore[st * data.nStyles + sy] = tot / W;
      }
      storeCurve.push(normalise(bySize));
      stockShare.push(normalise(data.histPlan.slice(st * Z, st * Z + Z)));
    }
    return { styleStore, storeCurve, stockShare };
  }

  // Replay the held-out season. Every leadTime weeks, top each SKU up to its share of
  // leadTime x weekly forecast x (1 + safety). Both methods get the same style-store totals.
  function simulate(data, model, method, { leadTime = 4, safety = 0.1 } = {}) {
    const S = data.stores.length, Z = data.sizes.length, W = data.weeks;
    const res = { demand: 0, sold: 0, lost: 0, received: 0, leftover: 0, planned: 0,
      bySize: Array.from({ length: S }, () => ({ demand: new Array(Z).fill(0), received: new Array(Z).fill(0), lost: new Array(Z).fill(0), leftover: new Array(Z).fill(0) })) };
    for (let st = 0; st < S; st++) {
      const shares = method === 'baseline' ? model.stockShare[st] : model.storeCurve[st];
      for (let sy = 0; sy < data.nStyles; sy++) {
        const total = Math.round(model.styleStore[st * data.nStyles + sy] * leadTime * (1 + safety));
        const target = split(total, shares);
        res.planned += total;
        for (let z = 0; z < Z; z++) {
          let onHand = 0;
          for (let w = 0; w < W; w++) {
            if (w % leadTime === 0) {
              const ship = Math.max(0, target[z] - onHand);
              onHand += ship; res.received += ship; res.bySize[st].received[z] += ship;
            }
            const d = data.nextDemand[idx(st, sy, z, w)];
            const s = Math.min(d, onHand);
            onHand -= s;
            res.demand += d; res.sold += s; res.lost += d - s;
            res.bySize[st].demand[z] += d; res.bySize[st].lost[z] += d - s;
          }
          res.leftover += onHand;
          res.bySize[st].leftover[z] += onHand;
        }
      }
    }
    res.sellThrough = res.received ? res.sold / res.received : 0;
    res.lostPct = res.demand ? res.lost / res.demand : 0;
    return res;
  }

  // Monday moves: per top-up, which store-size targets change most when switching from
  // last season's mix to the store's own size curve. Positive = send more, negative = send fewer.
  function mondayMoves(data, model, { leadTime = 4, safety = 0.1 } = {}, n = 3) {
    const moves = [];
    data.stores.forEach((store, st) => {
      const delta = new Array(data.sizes.length).fill(0);
      for (let sy = 0; sy < data.nStyles; sy++) {
        const total = Math.round(model.styleStore[st * data.nStyles + sy] * leadTime * (1 + safety));
        const base = split(total, model.stockShare[st]), cur = split(total, model.storeCurve[st]);
        base.forEach((b, z) => { delta[z] += cur[z] - b; });
      }
      delta.forEach((d, z) => moves.push({ store: store.name, size: data.sizes[z], delta: d }));
    });
    moves.sort((a, b) => b.delta - a.delta);
    return { more: moves.slice(0, n), fewer: moves.slice(-n).reverse() };
  }

  // Golden questions: plain-English questions with known answers at the default settings.
  // Questions 1-4 are answered from raw fact rows, not the metric code; question 5 pins the simulation result.
  const DEFAULTS = { leadTime: 4, safety: 0.1, correct: true };
  const GOLDEN = [
    { q: 'How many store, style and size combinations does the plan cover?', expected: 14400 },
    { q: 'How many items were sold last season, added up from the raw sales rows?', expected: 737314 },
    { q: 'Which size ended the most weeks with no stock left last season?', expected: 'XXL' },
    { q: 'Which city’s customers want the largest share of sizes XL and XXL?', expected: 'Chicago' },
    { q: 'With the starting settings, how many extra items does each store’s own mix sell?', expected: 80151 },
  ];
  function answerGolden(data) {
    const Z = data.sizes.length, W = data.weeks;
    let sold = 0;
    const outWeeks = new Array(Z).fill(0), bigByCity = {}, allByCity = {};
    for (let i = 0; i < data.histSales.length; i++) {
      sold += data.histSales[i];
      const z = Math.floor(i / W) % Z;
      if (data.histEnd[i] === 0) outWeeks[z]++;
      const city = data.stores[Math.floor(i / (W * Z * data.nStyles))].city;
      allByCity[city] = (allByCity[city] || 0) + data.histDemand[i];
      if (z >= 4) bigByCity[city] = (bigByCity[city] || 0) + data.histDemand[i];
    }
    const topCity = Object.keys(allByCity).sort((a, b) => bigByCity[b] / allByCity[b] - bigByCity[a] / allByCity[a])[0];
    const model = learn(data, DEFAULTS.correct);
    const avoided = simulate(data, model, 'baseline', DEFAULTS).lost - simulate(data, model, 'curve', DEFAULTS).lost;
    const answers = [data.stores.length * data.nStyles * Z, sold, data.sizes[outWeeks.indexOf(Math.max(...outWeeks))], topCity, avoided];
    return GOLDEN.map((g, i) => ({ ...g, answer: answers[i], pass: answers[i] === g.expected }));
  }

  const api = { SIZES, DEFAULTS, GOLDEN, split, curve, generate, storeRates, correctedDemand, learn, simulate, mondayMoves, answerGolden, idx };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Alloc = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
