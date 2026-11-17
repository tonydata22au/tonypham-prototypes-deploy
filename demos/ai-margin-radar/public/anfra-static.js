// A static stand-in for the Anfra Data App SDK, for hosting AI Margin Radar without `anfra serve`.
// It implements only what apps/ai-margin-radar.html uses (createApp, createQuery, createFilter,
// mapControl, mapCrossFilter, execute, subscribe, clearSelection, query.select/selectedRows) and
// answers from results recorded from the real SDK (data/, written by record.js). Result objects are
// built like the SDK's toResult(): { columns, rows, meta: { numRows } }.
// shortcut: answers only states recorded (one month at a time, at most one plan selected); others become a query error.
(function (root) {
  'use strict';
  const BASE = new URL('data/', (root.document && document.currentScript && document.currentScript.src) || root.ANFRA_STATIC_BASE || location.href);
  const fetchJson = root.ANFRA_STATIC_FETCH || ((url) => fetch(url).then((res) => {
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Could not load ${url.pathname} (HTTP ${res.status})`);
    return res.json();
  }));
  const files = new Map();
  function load (path) {
    if (!files.has(path)) {
      const p = fetchJson(new URL(path, BASE));
      files.set(path, p);
      p.catch(() => files.delete(path)); // let a failed load be retried
    }
    return files.get(path);
  }

  function toResult (columns, values) {
    const rows = values.map((v) => {
      const row = {};
      columns.forEach((c, i) => { row[c.name] = v[i]; });
      return row;
    });
    return { columns, rows, meta: { numRows: rows.length } };
  }

  class App {
    constructor (declaration) {
      this.declaration = declaration || {};
      this.queries = new Map();
      this.controls = new Map();
      this.mappings = []; // { from: Filter, to: Query, field }
      this.crossFilters = []; // { from: Query, to: Query }
      this.listeners = new Set();
      this.selection = undefined; // { source, fields, rows }
      this.appliedSelection = undefined;
    }

    subscribe (listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
    notify () { this.listeners.forEach((l) => l()); }

    createQuery (name, declaration) {
      if (this.queries.has(name)) throw new Error(`Query '${name}' already exists.`);
      const q = new Query(name, this, declaration);
      this.queries.set(name, q);
      return q;
    }

    createFilter (name, declaration) {
      const f = new Filter(name, this, declaration || {});
      this.controls.set(name, f);
      return f;
    }

    mapControl (control, query, options) {
      this.mappings.push({ from: control, to: query, field: (options && options.field) || control.declaration.field });
    }

    mapCrossFilter (from, to) {
      if (from === to) throw new Error(`Query '${from.name}' cannot cross-filter itself.`);
      this.crossFilters.push({ from, to });
    }

    select (query, rows, fields) {
      const cols = (query.result && query.result.columns) || [];
      const aliases = fields ? [...fields] : cols.filter((c) => !c.isMeasure && !c.adhoc).map((c) => c.name);
      this.selection = rows.length && aliases.length ? { source: query.name, fields: aliases, rows: [...rows] } : undefined;
      this.notify();
    }

    clearSelection () {
      if (!this.selection) return;
      this.selection = undefined;
      this.notify();
    }

    // The selection, when it reaches this query.
    selectionFor (query, phase) {
      const s = phase === 'pending' ? this.selection : this.appliedSelection;
      if (!s || s.source === query.name) return null;
      if (!this.crossFilters.some((e) => e.from.name === s.source && e.to === query)) return null;
      return s;
    }

    // What decides a query's rows: the month, the selected plan and the customer reaching it.
    stateFor (query, phase) {
      const state = { month: 'all', plan: 'all', customer: null, unsupported: null };
      for (const m of this.mappings.filter((x) => x.to === query)) {
        const c = phase === 'pending' ? m.from.condition : m.from.appliedCondition;
        const values = (c && c.values) || [];
        if (!c || c.operator === 'none' || !values.length) continue; // contributes no filter, like the SDK
        if (m.field === 'dim_dates.date_key' && c.operator === 'between') {
          const ym = String(values[0]).slice(0, 7);
          state.month = ym;
          if (String(values[1] || '').slice(0, 7) !== ym) state.unsupported = 'a range over more than one month';
        } else if (m.field === 'customers.customer_id' && c.operator === 'is' && values.length === 1) {
          state.customer = String(values[0]);
        } else state.unsupported = `the ${m.from.name} condition`;
      }
      const s = this.selectionFor(query, phase);
      if (s) {
        const picked = [...new Set(s.rows.map((r) => r[s.fields[0]]))];
        if (s.source !== 'byPlan' || s.fields.length !== 1 || s.fields[0] !== 'plan' || picked.length !== 1) state.unsupported = 'this selection';
        else state.plan = String(picked[0]);
      }
      return state;
    }

    async resolve (query, state) {
      if (state.unsupported) throw new Error(`This static copy has no recorded result for ${state.unsupported}.`);
      const index = await load('index.json');
      if (state.month !== 'all' && !index.months.includes(state.month)) state = { ...state, month: index.emptyMonth };
      if (state.customer !== null) {
        const c = await load(`c/${encodeURIComponent(state.customer)}.json`);
        const columns = index.customerDailyColumns;
        // The plan cross-filter: a customer's plan is fixed (customers.model.aml), so a customer matches it or has no rows.
        if (!c || (state.plan !== 'all' && c.plan !== state.plan)) return toResult(columns, []);
        const days = c.months[state.month] || [];
        return toResult(columns, days.map(([dd, fi, cost]) => [`${state.month}-${String(dd).padStart(2, '0')}`, c.features[fi], cost]));
      }
      const f = await load(`q/${encodeURIComponent(query.name)}/${state.month}__${encodeURIComponent(state.plan)}.json`);
      if (!f) throw new Error(`This static copy has no recorded result for ${query.name} (${state.month}, plan ${state.plan}).`);
      return toResult(f.columns, f.values);
    }

    async execute () {
      const targets = [...this.queries.values()].filter((q) => q.lastSignature === undefined || q.signature('pending') !== q.lastSignature);
      this.controls.forEach((c) => c.commit());
      this.appliedSelection = this.selection;
      const succeeded = []; const failed = [];
      await Promise.all(targets.map(async (q) => {
        const signature = q.signature('applied');
        const run = ++q.run;
        q._state = 'executing'; q._error = undefined; this.notify();
        try {
          const result = await this.resolve(q, this.stateFor(q, 'applied'));
          if (run !== q.run) return; // superseded by a newer execute
          q._state = 'success'; q._result = result; q.lastSignature = signature; succeeded.push(q.name);
        } catch (err) {
          if (run !== q.run) return;
          q._state = 'error'; q._error = err instanceof Error ? err : new Error(String(err)); failed.push(q.name);
        }
        this.notify();
      }));
      return { succeeded, failed };
    }
  }

  class Query {
    constructor (name, app, declaration) {
      if (!declaration || !String(declaration.aql || '').trim()) throw new Error(`Query '${name}' declares no AQL.`);
      this.kind = 'query'; this.name = name; this.app = app; this.declaration = declaration;
      this._state = 'idle'; this._result = undefined; this._error = undefined; this.run = 0; this.lastSignature = undefined;
    }
    get state () { return this._state; }
    get result () { return this._result; }
    get error () { return this._error; }
    signature (phase) { return JSON.stringify(this.app.stateFor(this, phase)); }
    select (rows, options) { this.app.select(this, Array.isArray(rows) ? rows : [rows], options && options.fields); }
    // Matched by value, like the SDK, so a re-run of the source keeps its highlight.
    get selectedRows () {
      const s = this.app.selection;
      if (!s || s.source !== this.name) return [];
      if (!this._result) return s.rows;
      const key = (row) => JSON.stringify(s.fields.map((a) => (row[a] === undefined ? null : row[a])));
      const picked = new Set(s.rows.map(key));
      return this._result.rows.filter((r) => picked.has(key(r)));
    }
    toJSON () { return this.declaration; }
  }

  class Filter {
    constructor (name, app, declaration) {
      this.kind = 'filter'; this.name = name; this.app = app; this.declaration = declaration;
      this.initial = declaration.default; this.pending = declaration.default; this.applied = undefined;
    }
    get condition () { return this.pending; }
    get appliedCondition () { return this.applied; }
    setCondition (condition) { this.pending = condition; this.app.notify(); }
    reset () { this.setCondition(this.initial); }
    commit () { this.applied = this.pending; }
    toJSON () { return this.declaration; }
  }

  root.Anfra = { static: true, createApp: (declaration) => new App(declaration) };
})(typeof window !== 'undefined' ? window : globalThis);
