/* ==================================================================
   fuzzy.js — tiny fuzzy-logic engine + interactive slide widgets
   TE3002B · Module 3 · Intelligent Control
   No dependencies. Widgets are declared in slides as:
     <div data-widget="mf-explorer" ...></div>
   and are initialised lazily (deck.js) when their slide is shown.
   ================================================================== */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------------
     1. Membership functions & helpers
     --------------------------------------------------------------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const linspace = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
  const round = (v, d = 2) => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);

  const MF = {
    tri(x, [a, b, c]) {
      if (x === b) return 1;
      if (x <= a || x >= c) return 0;
      return x < b ? (x - a) / (b - a) : (c - x) / (c - b);
    },
    trap(x, [a, b, c, d]) {
      if (x < a || x > d) return 0;
      if (x >= b && x <= c) return 1;
      if (x < b) return b === a ? 1 : (x - a) / (b - a);
      return d === c ? 1 : (d - x) / (d - c);
    },
    gauss(x, [c, s, m = 2]) { return Math.exp(-0.5 * Math.pow(Math.abs((x - c) / s), m)); },
    gbell(x, [a, b, c]) { return 1 / (1 + Math.pow(Math.abs((x - c) / a), 2 * b)); },
    sig(x, [a, c]) { return 1 / (1 + Math.exp(-a * (x - c))); },
    singleton(x, [c, tol = 1e-9]) { return Math.abs(x - c) < tol ? 1 : 0; }
  };
  const mf = (spec, x) => MF[spec[0]](x, spec[1]);
  const peakOf = (spec) => {
    const [t, p, pk] = spec;
    if (pk !== undefined) return pk;            // optional explicit peak (used by CoM / weighted average)
    if (t === 'tri') return p[1];
    if (t === 'trap') return (p[1] + p[2]) / 2;
    if (t === 'gauss' || t === 'gbell') return t === 'gauss' ? p[0] : p[2];
    return p[1];
  };

  /* Defuzzification on a sampled output (ys, mu) */
  const Defuzz = {
    centroid(ys, mu) {
      let n = 0, d = 0;
      for (let i = 0; i < ys.length; i++) { n += ys[i] * mu[i]; d += mu[i]; }
      return d > 1e-12 ? n / d : NaN;
    },
    bisector(ys, mu) {
      const tot = mu.reduce((s, v) => s + v, 0); if (tot < 1e-12) return NaN;
      let acc = 0;
      for (let i = 0; i < ys.length; i++) { acc += mu[i]; if (acc >= tot / 2) return ys[i]; }
      return ys[ys.length - 1];
    },
    _maxIdx(mu) { const m = Math.max(...mu); const idx = []; mu.forEach((v, i) => { if (m > 1e-9 && Math.abs(v - m) < 1e-6) idx.push(i); }); return idx; },
    mom(ys, mu) { const I = Defuzz._maxIdx(mu); return I.length ? I.reduce((s, i) => s + ys[i], 0) / I.length : NaN; },
    som(ys, mu) { const I = Defuzz._maxIdx(mu); return I.length ? ys[I[0]] : NaN; },
    lom(ys, mu) { const I = Defuzz._maxIdx(mu); return I.length ? ys[I[I.length - 1]] : NaN; }
  };

  /* Mamdani inference.  sys = {inputs:{name:{range,terms:{t:spec}}}, output:{name,range,terms}, rules:[{if:[[var,term],...], then:term, op:'and'|'or'}]} */
  function mamdani(sys, crisp, opts = {}) {
    const n = opts.n || 301, imp = opts.implication || 'min';
    const ys = linspace(sys.output.range[0], sys.output.range[1], n);
    const agg = new Array(n).fill(0);
    const deg = {};                       // per input term membership
    for (const v in sys.inputs) { deg[v] = {}; for (const t in sys.inputs[v].terms) deg[v][t] = mf(sys.inputs[v].terms[t], crisp[v]); }
    const termStrength = {};
    const rules = sys.rules.map(r => {
      const ms = r.if.map(([v, t]) => deg[v][t]);
      const w = r.op === 'or' ? Math.max(...ms) : Math.min(...ms);
      const spec = sys.output.terms[r.then];
      const clipped = ys.map(y => imp === 'prod' ? w * mf(spec, y) : Math.min(w, mf(spec, y)));
      clipped.forEach((v, i) => { agg[i] = Math.max(agg[i], v); });
      termStrength[r.then] = Math.max(termStrength[r.then] || 0, w);
      return { ms, w, clipped };
    });
    let crispOut;
    const method = opts.defuzz || 'centroid';
    if (method === 'com' || method === 'wavg') {
      let num = 0, den = 0;
      for (const t in termStrength) { num += termStrength[t] * peakOf(sys.output.terms[t]); den += termStrength[t]; }
      crispOut = den > 1e-12 ? num / den : NaN;
    } else crispOut = Defuzz[method](ys, agg);
    return { ys, agg, rules, deg, termStrength, crisp: crispOut };
  }

  /* ---------------------------------------------------------------
     2. Colours & tiny canvas plotting helper
     --------------------------------------------------------------- */
  function colors() {
    const s = getComputedStyle(document.documentElement);
    const g = k => s.getPropertyValue(k).trim();
    return { ink: g('--ink'), ink2: g('--ink-2'), ink3: g('--ink-3'), line: g('--line'), a: g('--accent'), b: g('--accent-2'), c: g('--accent-3'), ok: g('--ok'), bad: g('--bad'), card: g('--card') };
  }
  const PALETTE = () => { const C = colors(); return [C.a, C.b, C.c, '#3a7bd5', '#c2457a', '#5a8f29', '#9a6b2f']; };
  function alpha(hex, a) {
    const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  class Plot {
    constructor(canvas, o = {}) {
      this.cv = canvas;
      if (!canvas._lw) {                       // first Plot on this canvas: set up HiDPI backing store once
        canvas._lw = +canvas.getAttribute('width'); canvas._lh = +canvas.getAttribute('height');
        const dpr = 2; canvas.width = canvas._lw * dpr; canvas.height = canvas._lh * dpr;
        canvas.style.aspectRatio = `${canvas._lw} / ${canvas._lh}`;
        canvas.getContext('2d').scale(dpr, dpr);
      }
      this.W = canvas._lw; this.H = canvas._lh; this.ctx = canvas.getContext('2d');
      this.set(o);
    }
    set(o) {
      this.m = Object.assign({ l: 50, r: 16, t: 14, b: 38 }, o.margin || this.m || {});
      this.box = o.box || this.box || [0, 0, this.W, this.H];      // sub-panel [x,y,w,h]
      this.xr = o.x || this.xr || [0, 1]; this.yr = o.y || this.yr || [0, 1.08];
      return this;
    }
    X(v) { const [bx, , bw] = this.box; return bx + this.m.l + (v - this.xr[0]) / (this.xr[1] - this.xr[0]) * (bw - this.m.l - this.m.r); }
    Y(v) { const [, by, , bh] = this.box; return by + bh - this.m.b - (v - this.yr[0]) / (this.yr[1] - this.yr[0]) * (bh - this.m.t - this.m.b); }
    iX(px) { const [bx, , bw] = this.box; return this.xr[0] + (px - bx - this.m.l) / (bw - this.m.l - this.m.r) * (this.xr[1] - this.xr[0]); }
    clear(all = false) { const b = all ? [0, 0, this.W, this.H] : this.box; this.ctx.clearRect(b[0], b[1], b[2], b[3]); return this; }
    axes({ xlabel = '', ylabel = 'μ', xticks, yticks = [0, 0.5, 1], grid = true, fmt } = {}) {
      const c = this.ctx, C = colors();
      c.save(); c.font = '500 13px Inter, sans-serif'; c.fillStyle = C.ink3; c.strokeStyle = C.line; c.lineWidth = 1;
      xticks = xticks || linspace(this.xr[0], this.xr[1], 6);
      if (grid) yticks.forEach(t => { c.beginPath(); c.moveTo(this.X(this.xr[0]), this.Y(t)); c.lineTo(this.X(this.xr[1]), this.Y(t)); c.stroke(); });
      c.strokeStyle = C.ink3; c.beginPath(); c.moveTo(this.X(this.xr[0]), this.Y(this.yr[0])); c.lineTo(this.X(this.xr[1]), this.Y(this.yr[0])); c.stroke();
      c.textAlign = 'center'; xticks.forEach(t => c.fillText(fmt ? fmt(t) : +t.toFixed(2), this.X(t), this.Y(this.yr[0]) + 17));
      c.textAlign = 'right'; yticks.forEach(t => c.fillText(t, this.X(this.xr[0]) - 8, this.Y(t) + 4));
      c.fillStyle = C.ink2; c.textAlign = 'center'; c.font = '600 13px Inter, sans-serif';
      if (xlabel) c.fillText(xlabel, (this.X(this.xr[0]) + this.X(this.xr[1])) / 2, this.Y(this.yr[0]) + 34);
      if (ylabel) { c.save(); c.translate(this.box[0] + 14, (this.Y(this.yr[0]) + this.Y(this.yr[1])) / 2); c.rotate(-Math.PI / 2); c.fillText(ylabel, 0, 0); c.restore(); }
      c.restore(); return this;
    }
    series(xs, ys, { color = '#000', width = 2.5, fill = 0, dash = null } = {}) {
      const c = this.ctx; c.save();
      c.beginPath(); c.rect(this.X(this.xr[0]) - 2, this.Y(this.yr[1]) - 2, this.X(this.xr[1]) - this.X(this.xr[0]) + 4, this.Y(this.yr[0]) - this.Y(this.yr[1]) + 4); c.clip();
      c.beginPath(); xs.forEach((x, i) => { const px = this.X(x), py = this.Y(ys[i]); i ? c.lineTo(px, py) : c.moveTo(px, py); });
      if (fill) {
        c.lineTo(this.X(xs[xs.length - 1]), this.Y(this.yr[0])); c.lineTo(this.X(xs[0]), this.Y(this.yr[0])); c.closePath();
        c.fillStyle = alpha(color, fill); c.fill();
        c.beginPath(); xs.forEach((x, i) => { const px = this.X(x), py = this.Y(ys[i]); i ? c.lineTo(px, py) : c.moveTo(px, py); });
      }
      if (width) { c.strokeStyle = color; c.lineWidth = width; c.lineJoin = 'round'; if (dash) c.setLineDash(dash); c.stroke(); }
      c.restore(); return this;
    }
    fn(f, o = {}) { const xs = linspace(this.xr[0], this.xr[1], o.n || 500); return this.series(xs, xs.map(f), o); }
    vline(x, { color = '#000', dash = [5, 4], width = 1.5, y0, y1, label } = {}) {
      const c = this.ctx; c.save(); c.strokeStyle = color; c.lineWidth = width; if (dash) c.setLineDash(dash);
      c.beginPath(); c.moveTo(this.X(x), this.Y(y0 ?? this.yr[0])); c.lineTo(this.X(x), this.Y(y1 ?? this.yr[1])); c.stroke();
      if (label) { c.setLineDash([]); c.fillStyle = color; c.font = '600 13px Inter'; c.textAlign = 'center'; c.fillText(label, this.X(x), this.Y(y1 ?? this.yr[1]) - 4); }
      c.restore(); return this;
    }
    hline(y, { color = '#000', dash = [5, 4], width = 1.5, x0, x1, label } = {}) {
      const c = this.ctx; c.save(); c.strokeStyle = color; c.lineWidth = width; if (dash) c.setLineDash(dash);
      c.beginPath(); c.moveTo(this.X(x0 ?? this.xr[0]), this.Y(y)); c.lineTo(this.X(x1 ?? this.xr[1]), this.Y(y)); c.stroke();
      if (label) { c.fillStyle = color; c.font = '600 13px Inter'; c.textAlign = 'left'; c.fillText(label, this.X(x1 ?? this.xr[1]) + 4, this.Y(y) + 4); }
      c.restore(); return this;
    }
    band(x0, x1, color, y = null, h = 8) {
      const c = this.ctx; c.save(); c.fillStyle = color;
      const yy = y === null ? this.Y(this.yr[0]) - h / 2 : y;
      c.fillRect(this.X(x0), yy, this.X(x1) - this.X(x0), h); c.restore(); return this;
    }
    dot(x, y, color, r = 6) { const c = this.ctx; c.save(); c.fillStyle = color; c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(this.X(x), this.Y(y), r, 0, 7); c.fill(); c.stroke(); c.restore(); return this; }
    text(s, px, py, { color, font = '600 14px Inter', align = 'left' } = {}) { const c = this.ctx; c.save(); c.fillStyle = color || colors().ink; c.font = font; c.textAlign = align; c.fillText(s, px, py); c.restore(); return this; }
    marker(x, color, label, row = 0) {
      const c = this.ctx, px = this.X(x), py = this.Y(this.yr[0]);
      c.save(); c.fillStyle = color; c.beginPath(); c.moveTo(px, py); c.lineTo(px - 8, py + 14); c.lineTo(px + 8, py + 14); c.closePath(); c.fill();
      if (label) { c.font = '700 12px Inter'; c.textAlign = 'center'; c.fillText(label, px, py + 28 + row * 14); }
      c.restore(); return this;
    }
  }

  /* Animation helper */
  function tween(ms, step, done) {
    const t0 = performance.now();
    const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    function f(now) { const t = Math.min(1, (now - t0) / ms); step(ease(t)); if (t < 1) requestAnimationFrame(f); else if (done) done(); }
    requestAnimationFrame(f);
  }

  /* DOM helpers */
  const h = (tag, attrs = {}, html = '') => { const e = document.createElement(tag); for (const k in attrs) e.setAttribute(k, attrs[k]); e.innerHTML = html; return e; };
  function slider(parent, label, min, max, step, val, oninput, fmt = v => v) {
    const L = h('label', {}, `<span>${label}</span>`);
    const r = h('input', { type: 'range', min, max, step, value: val });
    const s = h('span', { class: 'val' }, fmt(+val));
    r.addEventListener('input', () => { s.textContent = fmt(+r.value); oninput(+r.value); });
    L.append(r, s); parent.append(L); return r;
  }
  function button(parent, label, onclick, cls = 'btn ghost') { const b = h('button', { class: cls }, label); b.addEventListener('click', onclick); parent.append(b); return b; }
  function canvas(el, w, hgt) { const c = h('canvas', { width: w, height: hgt }); el.append(c); return c; }
  const ds = (el, k, d) => el.dataset[k] !== undefined ? el.dataset[k] : d;
  const parseSpec = s => { const [t, ...p] = s.split(',').map(x => x.trim()); return [t, p.map(Number)]; };

  /* ---------------------------------------------------------------
     3. Widgets
     --------------------------------------------------------------- */
  const W = {};

  /* --- Crisp vs fuzzy "Hot" ------------------------------------- */
  W['crisp-fuzzy'] = el => {
    // Robot example: is the obstacle "close"?  (ultrasonic range 0–3 m, crisp threshold 1.0 m)
    const C = colors(), cv = canvas(el, 1000, 320), P = new Plot(cv, { x: [0, 3] });
    const ctr = h('div', { class: 'ctrls' }); el.append(ctr);
    const out = h('div', { class: 'readout' }); el.append(out);
    let d = 1.4;
    const crisp = x => x <= 1.0 ? 1 : 0, fuzzy = x => MF.sig(x, [-7, 1.0]);
    function draw() {
      P.clear().axes({ xlabel: 'Distance to obstacle measured by the sonar (m)', xticks: [0, 0.5, 1, 1.5, 2, 2.5, 3] });
      P.fn(crisp, { color: C.b, width: 3, n: 900 }).fn(fuzzy, { color: C.a, width: 3, fill: .12 });
      P.vline(d, { color: C.ink2 }).dot(d, crisp(d), C.b).dot(d, fuzzy(d), C.a);
      out.innerHTML = `d = ${d.toFixed(2)} m   crisp μ<sub>Close</sub> = <b style="color:${C.b}">${crisp(d)}</b> (brake: ${crisp(d) ? 'FULL' : 'none'})   fuzzy μ<sub>Close</sub> = <b style="color:${C.a}">${round(fuzzy(d))}</b> (brake ≈ ${Math.round(100 * fuzzy(d))} %)`;
    }
    const r = slider(ctr, 'Distance', 0, 3, 0.01, d, v => { d = v; draw(); }, v => v.toFixed(2) + ' m');
    button(ctr, '▶ Robot approaches', () => tween(3500, t => { d = 2.5 - 2.2 * t; r.value = d; r.nextSibling.textContent = d.toFixed(2) + ' m'; draw(); }));
    ctr.insertAdjacentHTML('beforeend', `<span class="legend"><span><i style="background:${C.b}"></i>crisp (d ≤ 1.0 m)</span><span><i style="background:${C.a}"></i>fuzzy</span></span>`);
    draw();
  };

  /* --- Membership-function explorer ----------------------------- */
  const MF_DEFS = {
    tri: { label: 'Triangular', p: [['a', 2], ['b', 5], ['c', 8]], py: p => `fuzz.trimf(x, [${p.join(', ')}])`, sorted: true },
    trap: { label: 'Trapezoidal', p: [['a', 1], ['b', 3.5], ['c', 6.5], ['d', 9]], py: p => `fuzz.trapmf(x, [${p.join(', ')}])`, sorted: true },
    gauss: { label: 'Gaussian', p: [['c (mean)', 5], ['σ', 1.5]], py: p => `fuzz.gaussmf(x, ${p[0]}, ${p[1]})`, f: p => [p[0], p[1]] },
    gbell: { label: 'Generalized bell', p: [['a (width)', 2], ['b (slope)', 3], ['c (center)', 5]], py: p => `fuzz.gbellmf(x, ${p[0]}, ${p[1]}, ${p[2]})` },
    sig: { label: 'Sigmoidal', p: [['a (slope)', 2], ['c (crossover)', 5]], py: p => `fuzz.sigmf(x, ${p[1]}, ${p[0]})   # skfuzzy: (center, slope)` }
  };
  W['mf-explorer'] = el => {
    const C = colors();
    const types = ds(el, 'types', 'tri,trap,gauss,gbell,sig').split(',');
    const showTerms = ds(el, 'terms', 'false') === 'true';
    const cv = canvas(el, 1000, showTerms ? 290 : 340), P = new Plot(cv, { x: [0, 10] });
    const ctr = h('div', { class: 'ctrls' }); el.append(ctr);
    const pc = h('div', { class: 'ctrls' }); el.append(pc);
    const out = h('div', { class: 'readout' }); el.append(out);
    let type = types[0], params = {}, alphaCut = 0.5;
    types.forEach(t => params[t] = MF_DEFS[t].p.map(q => q[1]));
    const sel = h('select'); types.forEach(t => sel.append(h('option', { value: t }, MF_DEFS[t].label)));
    const L = h('label', {}, '<span>Type</span>'); L.append(sel); ctr.append(L);
    sel.addEventListener('change', () => { type = sel.value; buildParams(); draw(); });
    if (showTerms) slider(ctr, 'α', 0.05, 1, 0.05, alphaCut, v => { alphaCut = v; draw(); }, v => v.toFixed(2));
    function buildParams() {
      pc.innerHTML = '';
      MF_DEFS[type].p.forEach(([name], i) => {
        const range = type === 'sig' && i === 0 ? [-6, 6, 0.1] : (name.startsWith('σ') || name.startsWith('a (w')) ? [0.2, 5, 0.1] : name.startsWith('b (s') ? [0.5, 10, 0.5] : [0, 10, 0.1];
        slider(pc, name, range[0], range[1], range[2], params[type][i], v => { params[type][i] = v; draw(); }, v => v.toFixed(1));
      });
    }
    function spec() {
      let p = params[type].slice(); if (MF_DEFS[type].sorted) p.sort((a, b) => a - b);
      return [type, p];
    }
    function interval(f, pred) {
      const xs = linspace(0, 10, 1001).filter(x => pred(f(x)));
      return xs.length ? [xs[0], xs[xs.length - 1]] : null;
    }
    function draw() {
      const s = spec(), f = x => mf(s, x);
      P.clear().axes({ xlabel: 'Universe of discourse X', xticks: [0, 2, 4, 6, 8, 10] });
      let txt = `${MF_DEFS[type].py(s[1].map(v => +v.toFixed(2)))}`;
      if (showTerms) {
        const sup = interval(f, v => v > 1e-3), core = interval(f, v => v > 1 - 1e-3), cut = interval(f, v => v >= alphaCut);
        if (sup) P.band(sup[0], sup[1], alpha(C.a, .25), null, 10);
        if (core) P.band(core[0], core[1], C.c, null, 10);
        P.hline(alphaCut, { color: C.b, label: 'α' });
        if (cut) { P.band(cut[0], cut[1], alpha(C.b, .9), P.Y(alphaCut) - 3, 6); P.vline(cut[0], { color: C.b, y1: alphaCut }).vline(cut[1], { color: C.b, y1: alphaCut }); }
        const fmtI = I => I ? `[${I[0].toFixed(2)}, ${I[1].toFixed(2)}]` : '∅';
        const supTxt = (type === 'gauss' || type === 'gbell' || type === 'sig') ? 'entire X (μ never reaches exactly 0)' : fmtI(sup);
        txt += `\nsupport ≈ ${supTxt}\ncore    ≈ ${fmtI(core)}${core ? '' : '  (not normal on X)'}\nα-cut   ≈ ${fmtI(cut)}   (α = ${alphaCut.toFixed(2)})`;
      }
      P.fn(f, { color: C.a, width: 3.5, fill: .1 });
      out.textContent = txt;
    }
    buildParams(); draw();
  };

  /* --- Fuzzy set operations (animated morph) -------------------- */
  W['set-ops'] = el => {
    const C = colors(), cv = canvas(el, 1000, 340), P = new Plot(cv, { x: [0, 10] });
    const ctr = h('div', { class: 'ctrls' }); el.append(ctr);
    const out = h('div', { class: 'readout' }); el.append(out);
    const A = x => MF.tri(x, [1, 4, 7]), B = x => MF.trap(x, [4, 6, 8, 10]);
    const ops = {
      'A ∪ B  (max)': (a, b) => Math.max(a, b), 'A ∩ B  (min)': (a, b) => Math.min(a, b),
      '¬A  (1 − μA)': a => 1 - a, 'A · B  (product)': (a, b) => a * b, 'A ⊕ B  (alg. sum)': (a, b) => a + b - a * b
    };
    const xs = linspace(0, 10, 501);
    let cur = xs.map(() => 0), name = null, probe = 5;
    function draw(res) {
      P.clear().axes({ xlabel: 'x', xticks: [0, 2, 4, 6, 8, 10] });
      P.series(xs, xs.map(A), { color: C.a, width: 2, dash: [6, 4] }).series(xs, xs.map(B), { color: C.b, width: 2, dash: [6, 4] });
      if (name) P.series(xs, res, { color: C.c, width: 4, fill: .18 });
      const a = A(probe), b = B(probe); P.vline(probe, { color: C.ink3 }).dot(probe, a, C.a, 5).dot(probe, b, C.b, 5);
      let t = `x = ${probe.toFixed(1)}   μA = ${round(a)}   μB = ${round(b)}`;
      if (name) { const r = ops[name](a, b); P.dot(probe, r, C.c, 7); t += `   →  ${name.split('  ')[0]} = ${round(r)}`; }
      out.textContent = t;
    }
    Object.keys(ops).forEach(k => {
      const bt = button(ctr, k.split('  ')[0], () => {
        ctr.querySelectorAll('.btn').forEach(x => x.classList.remove('on')); bt.classList.add('on');
        const target = xs.map(x => ops[k](A(x), B(x))), from = cur.slice(); name = k;
        tween(700, t => { cur = from.map((v, i) => v + (target[i] - v) * t); draw(cur); });
      });
    });
    slider(ctr, 'probe x', 0, 10, 0.1, probe, v => { probe = v; draw(cur); }, v => v.toFixed(1));
    ctr.insertAdjacentHTML('beforeend', `<span class="legend"><span><i style="background:${C.a}"></i>A</span><span><i style="background:${C.b}"></i>B</span><span><i style="background:${C.c}"></i>result</span></span>`);
    draw(cur);
  };

  /* --- Hedges (very, more-or-less, not) -------------------------- */
  W['hedges'] = el => {
    const C = colors(), cv = canvas(el, 1000, 320), P = new Plot(cv, { x: [0, 3] });
    const ctr = h('div', { class: 'ctrls' }); el.append(ctr);
    const base = { close: x => MF.trap(x, [0, 0, 0.4, 1.2]), far: x => MF.sig(x, [5, 1.8]) };
    const hedges = { none: m => m, 'very (μ²)': m => m * m, 'extremely (μ³)': m => m ** 3, 'more or less (√μ)': m => Math.sqrt(m), 'not (1−μ)': m => 1 - m, 'not very (1−μ²)': m => 1 - m * m };
    let b = 'close', hd = 'none', prev = null;
    function draw(f) {
      P.clear().axes({ xlabel: 'Distance to obstacle (m)', xticks: [0, 0.5, 1, 1.5, 2, 2.5, 3] });
      P.fn(base[b], { color: C.ink3, width: 2, dash: [6, 4] }).fn(f, { color: C.a, width: 3.5, fill: .12 });
    }
    const s1 = h('select'); Object.keys(base).forEach(k => s1.append(h('option', { value: k }, k)));
    const s2 = h('select'); Object.keys(hedges).forEach(k => s2.append(h('option', { value: k }, k)));
    const L1 = h('label', {}, '<span>Base term</span>'); L1.append(s1); const L2 = h('label', {}, '<span>Hedge</span>'); L2.append(s2); ctr.append(L1, L2);
    const update = () => {
      const f1 = prev || (x => base[b](x)); b = s1.value; hd = s2.value;
      const f2 = x => hedges[hd](base[b](x));
      tween(500, t => draw(x => f1(x) + (f2(x) - f1(x)) * t)); prev = f2;
    };
    s1.addEventListener('change', update); s2.addEventListener('change', update);
    draw(base[b]);
  };

  /* --- Relation matrices: union / intersection ------------------ */
  function matGrid(M, rl, cl) {
    const g = h('div', { class: 'mat' }); g.style.gridTemplateColumns = `repeat(${M[0].length + 1}, auto)`;
    g.append(h('div', { class: 'cell hdr' }, ''));
    cl.forEach(c => g.append(h('div', { class: 'cell hdr' }, c)));
    const cells = M.map((row, i) => { g.append(h('div', { class: 'cell hdr' }, rl[i])); return row.map(v => { const c = h('div', { class: 'cell' }, v === null ? '' : (+v).toFixed(1)); g.append(c); return c; }); });
    return { g, cells };
  }
  function wrapMat(title, grid) { const w = h('div'); w.append(h('div', { class: 'mat-title' }, title), grid); return w; }

  W['relation-ops'] = el => {
    const R = [[.8, .1, .1, .7], [0, .8, 0, 0], [.9, 1, .7, .8]];
    const S = [[.4, 0, .9, .6], [.9, .4, .5, .7], [.3, 0, .8, .5]];
    const rl = ['x1', 'x2', 'x3'], cl = ['y1', 'y2', 'y3', 'y4'];
    const row = h('div', { class: 'mat-row' }); el.append(row);
    const gR = matGrid(R, rl, cl), gS = matGrid(S, rl, cl), gT = matGrid(R.map(r => r.map(() => null)), rl, cl);
    const title = h('div', { class: 'mat-title' }, 'R ∪ S');
    const wT = h('div'); wT.append(title, gT.g);
    row.append(wrapMat('R: “x is considerably larger than y”', gR.g), wrapMat('S: “x is very close to y”', gS.g), wT);
    const ctr = h('div', { class: 'ctrls' }); el.append(ctr);
    const out = h('div', { class: 'readout' }, 'Pick an operation, then press Step or Run.'); el.append(out);
    let op = 'max', k = 0, timer = null;
    const N = 12;
    function clearHL() { [gR, gS, gT].forEach(G => G.cells.flat().forEach(c => c.classList.remove('hl-a', 'hl-b', 'hl-c'))); }
    function reset() { clearInterval(timer); k = 0; clearHL(); gT.cells.flat().forEach(c => { c.textContent = ''; c.classList.remove('done'); }); title.textContent = op === 'max' ? 'R ∪ S  (max)' : 'R ∩ S  (min)'; }
    function step() {
      if (k >= N) { clearInterval(timer); clearHL(); return; }
      const i = Math.floor(k / 4), j = k % 4; clearHL();
      const r = R[i][j], s = S[i][j], v = op === 'max' ? Math.max(r, s) : Math.min(r, s);
      gR.cells[i][j].classList.add('hl-a'); gS.cells[i][j].classList.add('hl-b');
      const c = gT.cells[i][j]; c.textContent = v.toFixed(1); c.classList.add('hl-c', 'done');
      out.textContent = `(${rl[i]}, ${cl[j]}):  ${op}(${r.toFixed(1)}, ${s.toFixed(1)}) = ${v.toFixed(1)}`; k++;
    }
    button(ctr, 'Union (max)', () => { op = 'max'; reset(); });
    button(ctr, 'Intersection (min)', () => { op = 'min'; reset(); });
    button(ctr, 'Step ›', step, 'btn');
    button(ctr, '▶ Run', () => { clearInterval(timer); timer = setInterval(step, 550); }, 'btn');
    button(ctr, '↺ Reset', reset);
    reset();
  };

  /* --- Max-min / max-product composition ------------------------ */
  W['composition'] = el => {
    const R1 = [[.4, 1, .2], [.1, 0, .5], [.9, .7, .8]];
    const R2 = [[1, .6, .5, .4, 0], [.4, .8, .7, .3, .3], [.5, 1, .5, .2, .8]];
    const row = h('div', { class: 'mat-row' }); el.append(row);
    const g1 = matGrid(R1, ['x1', 'x2', 'x3'], ['y1', 'y2', 'y3']);
    const g2 = matGrid(R2, ['y1', 'y2', 'y3'], ['z1', 'z2', 'z3', 'z4', 'z5']);
    const gT = matGrid(R1.map(() => R2[0].map(() => null)), ['x1', 'x2', 'x3'], ['z1', 'z2', 'z3', 'z4', 'z5']);
    const tt = h('div', { class: 'mat-title' }, 'R1 ∘ R2  (max-min)'); const wT = h('div'); wT.append(tt, gT.g);
    row.append(wrapMat('R1 = A × B', g1.g), h('div', { class: 'op' }, '∘'), wrapMat('R2 = B × C', g2.g), h('div', { class: 'op' }, '='), wT);
    const ctr = h('div', { class: 'ctrls' }); el.append(ctr);
    const out = h('div', { class: 'readout' }, 'Row of R1 ⨉ column of R2: take min pair-wise, then max.'); el.append(out);
    let k = 0, timer = null, mode = 'min';
    const N = 15;
    const clearHL = () => [g1, g2, gT].forEach(G => G.cells.flat().forEach(c => c.classList.remove('hl-a', 'hl-b', 'hl-c')));
    function reset() { clearInterval(timer); k = 0; clearHL(); gT.cells.flat().forEach(c => { c.textContent = ''; c.classList.remove('done'); }); tt.textContent = mode === 'min' ? 'R1 ∘ R2  (max-min)' : 'R1 ∘ R2  (max-product)'; }
    function step() {
      if (k >= N) { clearInterval(timer); clearHL(); return; }
      const i = Math.floor(k / 5), j = k % 5; clearHL();
      g1.cells[i].forEach(c => c.classList.add('hl-a')); g2.cells.forEach(r => r[j].classList.add('hl-b'));
      const pairs = R1[i].map((a, q) => [a, R2[q][j]]);
      const vals = pairs.map(([a, b]) => mode === 'min' ? Math.min(a, b) : a * b);
      const v = Math.max(...vals);
      const c = gT.cells[i][j]; c.textContent = v.toFixed(mode === 'min' ? 1 : 2); c.classList.add('hl-c', 'done');
      out.textContent = `(x${i + 1}, z${j + 1}):  max( ${pairs.map(([a, b], q) => `${mode}(${a}, ${b})=${vals[q].toFixed(2)}`).join(',  ')} ) = ${v.toFixed(2)}`;
      k++;
    }
    button(ctr, 'max-min', () => { mode = 'min'; reset(); });
    button(ctr, 'max-product', () => { mode = 'prod'; reset(); });
    button(ctr, 'Step ›', step, 'btn');
    button(ctr, '▶ Run', () => { clearInterval(timer); timer = setInterval(step, 700); }, 'btn');
    button(ctr, '↺ Reset', reset);
    reset();
  };

  /* --- Cartesian product heat-map -------------------------------- */
  W['cartesian'] = el => {
    // Robot example: R = "speed is FAST" × "obstacle is CLOSE"  →  collision risk
    const C = colors(), cv = canvas(el, 1000, 400), ctx = cv.getContext('2d');
    const xr = [0, 1], yr = [0, 3];
    const P = new Plot(cv, { x: xr, y: yr, margin: { l: 70, r: 220, t: 14, b: 44 } });
    const ctr = h('div', { class: 'ctrls' }); el.append(ctr);
    const out = h('div', { class: 'readout' }, 'Hover over the map.'); el.append(out);
    const A = x => MF.sig(x, [12, 0.5]), B = y => MF.sig(y, [-5, 1.0]);
    let tnorm = 'min';
    const T = (a, b) => tnorm === 'min' ? Math.min(a, b) : a * b;
    const ramp = v => { // paper → teal → violet
      const s = [[251, 250, 247], [15, 139, 141], [123, 92, 214]];
      const [p, q, t] = v < .6 ? [s[0], s[1], v / .6] : [s[1], s[2], (v - .6) / .4];
      return `rgb(${p.map((c, i) => Math.round(c + (q[i] - c) * t)).join(',')})`;
    };
    function draw(hx, hy) {
      P.clear(); const nx = 90, ny = 60, dx = (xr[1] - xr[0]) / nx, dy = (yr[1] - yr[0]) / ny;
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
        const x = xr[0] + dx * i, y = yr[0] + dy * j;
        ctx.fillStyle = ramp(T(A(x + dx / 2), B(y + dy / 2)));
        ctx.fillRect(P.X(x), P.Y(y + dy), P.X(x + dx) - P.X(x) + 1, P.Y(y) - P.Y(y + dy) + 1);
      }
      P.axes({ xlabel: 'x: robot speed (m/s)  —  A = "fast"', ylabel: 'y: obstacle distance (m) — B = "close"', xticks: [0, 0.25, 0.5, 0.75, 1], yticks: [0, 0.5, 1, 1.5, 2, 2.5, 3], grid: false });
      for (let i = 0; i <= 10; i++) { ctx.fillStyle = ramp(i / 10); ctx.fillRect(820, 330 - i * 28, 26, 28); }
      P.text('risk = 1', 852, 60, { font: '600 13px Inter' }).text('risk = 0', 852, 330, { font: '600 13px Inter' });
      P.text(`T-norm: ${tnorm}`, 820, 370, { color: C.c });
      if (hx !== undefined) { P.vline(hx, { color: C.ink }).hline(hy, { color: C.ink }); }
    }
    cv.addEventListener('mousemove', e => {
      const r = cv.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * P.W, py = (e.clientY - r.top) / r.height * P.H;
      const x = P.iX(px), y = P.yr[0] + (P.Y(P.yr[0]) - py) / (P.Y(P.yr[0]) - P.Y(P.yr[1])) * (P.yr[1] - P.yr[0]);
      if (x < xr[0] || x > xr[1] || y < yr[0] || y > yr[1]) return;
      draw(x, y);
      out.textContent = `speed = ${x.toFixed(2)} m/s,  distance = ${y.toFixed(2)} m   μFast = ${round(A(x))}  μClose = ${round(B(y))}  →  μRisk = ${tnorm}(…) = ${round(T(A(x), B(y)))}`;
    });
    button(ctr, 'min', () => { tnorm = 'min'; draw(); }); button(ctr, 'product', () => { tnorm = 'prod'; draw(); });
    draw();
  };

  /* --- Generalized modus ponens: B' = A' ∘ (A × B) --------------- */
  W['gmp'] = el => {
    const C = colors(), cv = canvas(el, 1000, 330);
    const xr = ds(el, 'x', '0,1').split(',').map(Number), yr = ds(el, 'y', '1,5').split(',').map(Number);
    const sA = parseSpec(ds(el, 'a', 'sig,15,0.5')), sB = parseSpec(ds(el, 'b', 'sig,-3,2.5')), sAp = parseSpec(ds(el, 'ap', 'gauss,0.5,0.04'));
    const labels = ds(el, 'labels', 'x|y').split('|');
    const P1 = new Plot(cv, { x: xr, box: [0, 0, 500, 330] }), P2 = new Plot(cv, { x: yr, box: [500, 0, 500, 330] });
    const ctr = h('div', { class: 'ctrls' }); el.append(ctr);
    const out = h('div', { class: 'readout' }); el.append(out);
    const xs = linspace(xr[0], xr[1], 600), ys = linspace(yr[0], yr[1], 400);
    let c0 = sAp[1][0], w0 = sAp[1][1];
    function draw() {
      const Ap = x => mf([sAp[0], [c0, w0]], x), A = x => mf(sA, x), B = y => mf(sB, y);
      const inter = xs.map(x => Math.min(Ap(x), A(x))); const w = Math.max(...inter); const xm = xs[inter.indexOf(w)];
      P1.clear().axes({ xlabel: labels[0], xticks: linspace(xr[0], xr[1], 5) });
      P1.series(xs, inter, { color: C.c, width: 0, fill: .35 });
      P1.series(xs, xs.map(A), { color: C.a, width: 3 }).series(xs, xs.map(Ap), { color: C.b, width: 3 });
      P1.hline(w, { color: C.c, label: `w=${round(w)}` }).dot(xm, w, C.c);
      P2.clear().axes({ xlabel: labels[1], xticks: linspace(yr[0], yr[1], 5) });
      P2.series(ys, ys.map(B), { color: C.a, width: 2, dash: [6, 4] }).series(ys, ys.map(y => Math.min(w, B(y))), { color: C.c, width: 3.5, fill: .2 });
      P2.hline(w, { color: C.c });
      out.innerHTML = `<span style="color:${C.b}">A′</span> centred at ${round(c0)}  →  degree of match  w = sup<sub>x</sub> min(A′(x), A(x)) = <b>${round(w)}</b>  →  <span style="color:${C.c}">B′(y) = min(w, B(y))</span>`;
    }
    const span = xr[1] - xr[0];
    slider(ctr, 'A′ centre', xr[0], xr[1], span / 200, c0, v => { c0 = v; draw(); }, v => v.toFixed(2));
    slider(ctr, 'A′ width', span / 100, span / 4, span / 400, w0, v => { w0 = v; draw(); }, v => v.toFixed(2));
    ctr.insertAdjacentHTML('beforeend', `<span class="legend"><span><i style="background:${C.a}"></i>A (rule) / B</span><span><i style="background:${C.b}"></i>A′ (fact)</span><span><i style="background:${C.c}"></i>B′ (conclusion)</span></span>`);
    draw();
  };

  /* --- Full Mamdani FIS diagram (step-by-step) ------------------- */
  const SYSTEMS = {
    robot: {   // mobile robot: forward speed from front-sonar distance and |heading error| to the goal
      inputs: {
        Distance: { range: [0, 3], unit: 'm', terms: { near: ['trap', [0, 0, 0.5, 1.2]], medium: ['tri', [0.5, 1.25, 2]], far: ['trap', [1.3, 2, 3, 3]] } },
        Heading: { range: [0, 90], unit: '°', terms: { small: ['trap', [0, 0, 10, 35]], large: ['trap', [15, 45, 90, 90]] } }
      },
      output: { name: 'Speed', range: [0, 0.5], unit: 'm/s', terms: { slow: ['trap', [0, 0, 0.05, 0.2], 0.05], medium: ['tri', [0.1, 0.25, 0.4]], fast: ['trap', [0.3, 0.45, 0.5, 0.5], 0.45] } },
      rules: [{ if: [['Distance', 'far'], ['Heading', 'small']], then: 'fast' }, { if: [['Distance', 'medium'], ['Heading', 'small']], then: 'medium' }, { if: [['Distance', 'near'], ['Heading', 'large']], then: 'slow', op: 'or' }],
      init: { Distance: 1.6, Heading: 20 }
    },
    speed: {
      inputs: {
        Cloud: { range: [0, 100], unit: '%', terms: { Sunny: ['trap', [0, 0, 20, 40]], Partly: ['tri', [20, 50, 80]], Overcast: ['trap', [60, 80, 100, 100]] } },
        Temp: { range: [10, 110], unit: '°F', terms: { Freezing: ['trap', [10, 10, 30, 50]], Cool: ['tri', [30, 50, 70]], Warm: ['tri', [50, 70, 90]], Hot: ['trap', [70, 90, 110, 110]] } }
      },
      output: { name: 'Speed', range: [0, 100], unit: 'mph', terms: { Slow: ['trap', [0, 0, 25, 75], 25], Fast: ['trap', [25, 75, 100, 100], 75] } },
      rules: [{ if: [['Cloud', 'Sunny'], ['Temp', 'Warm']], then: 'Fast' }, { if: [['Cloud', 'Partly'], ['Temp', 'Cool']], then: 'Slow' }],
      init: { Cloud: 25, Temp: 65 }
    },
    crane: {
      inputs: {
        Distance: { range: [-10, 30], unit: 'yd', terms: { neg_close: ['trap', [-10, -10, -5, 0]], zero: ['tri', [-5, 0, 5]], close: ['tri', [0, 5, 10]], medium: ['tri', [5, 10, 30]], far: ['trap', [10, 30, 30, 30]] } },
        Angle: { range: [-90, 90], unit: '°', terms: { neg_big: ['trap', [-90, -90, -50, 0]], neg_small: ['tri', [-50, -5, 0]], zero: ['tri', [-5, 0, 5]], pos_small: ['tri', [0, 5, 50]], pos_big: ['trap', [0, 50, 90, 90]] } }
      },
      output: { name: 'Power', range: [-30, 30], unit: 'kW', terms: { neg_high: ['tri', [-30, -25, -8]], neg_medium: ['tri', [-25, -8, 0]], zero: ['tri', [-8, 0, 8]], pos_medium: ['tri', [0, 8, 25]], pos_high: ['tri', [8, 25, 30]] } },
      rules: [{ if: [['Distance', 'medium'], ['Angle', 'pos_small']], then: 'pos_medium' }, { if: [['Distance', 'medium'], ['Angle', 'zero']], then: 'zero' }, { if: [['Distance', 'far'], ['Angle', 'zero']], then: 'pos_medium' }],
      init: { Distance: 12, Angle: 4 }
    }
  };
  W['fis'] = el => {
    const C = colors(), sys = SYSTEMS[ds(el, 'system', 'speed')];
    const vars = Object.keys(sys.inputs), nR = sys.rules.length;
    const rowH = nR >= 3 ? 98 : 118, Wd = 1100, Hd = rowH * (nR + 1) + 10, cv = canvas(el, Wd, Hd);
    const colW = (Wd - 200) / (vars.length + 1);
    const P = new Plot(cv, { margin: { l: 10, r: 10, t: 22, b: 22 } });
    const ctr = h('div', { class: 'ctrls' }); el.append(ctr);
    const out = h('div', { class: 'readout' }); el.append(out);
    const crisp = Object.assign({}, sys.init);
    let stage = 5, method = ds(el, 'defuzz', 'centroid');
    const stages = ['0 · crisp inputs', '1 · fuzzify', '2 · rule strength (AND = min, OR = max)', '3 · implication (clip)', '4 · aggregation (max)', '5 · defuzzify'];
    const stageEl = h('span', { class: 'stage' });
    function cell(r, col) { return [200 + col * colW, r * rowH, colW, rowH]; }
    function draw() {
      const res = mamdani(sys, crisp, { defuzz: method });
      P.clear(true); const ctx = P.ctx;
      sys.rules.forEach((rule, r) => {
        const lines = rule.if.map(([v, t], k) => `${k ? (rule.op === 'or' ? 'OR' : 'AND') : 'IF'} ${v} is ${t}`).concat([`THEN ${sys.output.name} is ${rule.then}`]);
        const y0 = r * rowH + rowH / 2 - (lines.length * 14) / 2;
        P.text(`R${r + 1}`, 10, y0 - 6, { font: '800 22px Inter', color: C.ink3 });
        lines.forEach((ln, k) => P.text(ln, 10, y0 + 12 + k * 14, { font: '500 12px Inter', color: C.ink2 }));
        rule.if.forEach(([v, t], k) => {
          const col = vars.indexOf(v), spec = sys.inputs[v].terms[t];
          P.set({ box: cell(r, col), x: sys.inputs[v].range, y: [0, 1.05] });
          ctx.strokeStyle = C.line; ctx.strokeRect(...cell(r, col).map((q, i) => i < 2 ? q + 4 : q - 8));
          const xs = linspace(...sys.inputs[v].range, 300); const m = res.rules[r].ms[k];
          P.series(xs, xs.map(x => mf(spec, x)), { color: C.a, width: 2, fill: stage >= 1 ? 0 : .08 });
          if (stage >= 1) {
            P.series(xs, xs.map(x => Math.min(m, mf(spec, x))), { color: C.a, width: 0, fill: .3 });
            P.vline(crisp[v], { color: C.b, dash: null, width: 2 }).hline(m, { color: C.b, x1: crisp[v] }).dot(crisp[v], m, C.b, 5);
            P.text(`${round(m)}`, P.X(crisp[v]) + 8, P.Y(m) - 6, { color: C.b, font: '700 13px Inter' });
          } else P.vline(crisp[v], { color: C.b, dash: null, width: 2 });
          P.text(`${v} is ${t}`, cell(r, col)[0] + 12, cell(r, col)[1] + 18, { font: '600 12px Inter', color: C.ink2 });
        });
        // output cell
        const oc = vars.length, spec = sys.output.terms[rule.then], ys = res.ys;
        P.set({ box: cell(r, oc), x: sys.output.range, y: [0, 1.05] });
        ctx.strokeStyle = C.line; ctx.strokeRect(...cell(r, oc).map((q, i) => i < 2 ? q + 4 : q - 8));
        P.series(ys, ys.map(y => mf(spec, y)), { color: C.c, width: 2, dash: [5, 4] });
        if (stage >= 3) P.series(ys, res.rules[r].clipped, { color: C.c, width: 2.5, fill: .35 });
        if (stage >= 2) { P.hline(res.rules[r].w, { color: C.c }); P.text(`w${r + 1} = ${round(res.rules[r].w)}`, cell(r, oc)[0] + cell(r, oc)[2] - 14, cell(r, oc)[1] + 18, { font: '700 13px Inter', color: C.c, align: 'right' }); }
        P.text(`${sys.output.name} is ${rule.then}`, cell(r, oc)[0] + 12, cell(r, oc)[1] + 18, { font: '600 12px Inter', color: C.ink2 });
      });
      // aggregated row
      const ac = cell(nR, vars.length); P.set({ box: [ac[0], ac[1], ac[2], ac[3]], x: sys.output.range, y: [0, 1.05], margin: { l: 10, r: 10, t: 22, b: 30 } });
      ctx.strokeStyle = C.c; ctx.lineWidth = 1.5; ctx.strokeRect(ac[0] + 4, ac[1] + 4, ac[2] - 8, ac[3] - 8); ctx.lineWidth = 1;
      if (stage >= 4) P.series(res.ys, res.agg, { color: C.c, width: 3, fill: .45 });
      P.axes({ xlabel: '', ylabel: '', yticks: [], xticks: linspace(...sys.output.range, 5), grid: false });
      P.text('aggregated output', ac[0] + 12, ac[1] + 18, { font: '600 12px Inter', color: C.ink2 });
      if (stage >= 5 && !isNaN(res.crisp)) { P.vline(res.crisp, { color: C.b, dash: null, width: 3 }); P.text(`${round(res.crisp, 1)} ${sys.output.unit}`, P.X(res.crisp) + 6, ac[1] + 40, { color: C.b, font: '800 16px Inter' }); }
      P.set({ margin: { l: 10, r: 10, t: 22, b: 22 } });
      // input axes under each column
      vars.forEach((v, col) => { const b = cell(nR, col); P.text(`${v} = ${round(crisp[v], 1)} ${sys.inputs[v].unit}`, b[0] + b[2] / 2, b[1] + 30, { align: 'center', font: '700 16px Inter', color: C.b }); P.text(`${sys.inputs[v].range[0]} … ${sys.inputs[v].range[1]}`, b[0] + b[2] / 2, b[1] + 50, { align: 'center', font: '500 12px Inter', color: C.ink3 }); });
      stageEl.textContent = stages[stage];
      out.textContent = stage >= 5 ? `rule strengths: ${res.rules.map((r, i) => `w${i + 1}=${round(r.w)}`).join('  ')}   →   ${sys.output.name} (${method}) = ${round(res.crisp, 2)} ${sys.output.unit}` : `stage ${stages[stage]}`;
    }
    vars.forEach(v => { const [a, b] = sys.inputs[v].range; slider(ctr, v, a, b, (b - a) / 200, crisp[v], x => { crisp[v] = x; draw(); }, x => x.toFixed(1)); });
    const sel = h('select'); ['centroid', 'com', 'bisector', 'mom', 'som', 'lom'].forEach(m => sel.append(h('option', { value: m }, m === 'com' ? 'center of maxima (CoM)' : m)));
    sel.value = method; sel.addEventListener('change', () => { method = sel.value; draw(); });
    const L = h('label', {}, '<span>Defuzz</span>'); L.append(sel); ctr.append(L);
    button(ctr, '↺ 0', () => { stage = 0; draw(); });
    button(ctr, 'Step ›', () => { stage = Math.min(5, stage + 1); draw(); }, 'btn');
    ctr.append(stageEl);
    stage = +ds(el, 'stage', 5); draw();
  };

  /* --- Defuzzification explorer --------------------------------- */
  W['defuzz'] = el => {
    const C = colors(), cv = canvas(el, 1000, 340), P = new Plot(cv, { x: [0, 10], margin: { l: 50, r: 16, t: 14, b: 70 } });
    const ctr = h('div', { class: 'ctrls' }); el.append(ctr);
    const out = h('div', { class: 'readout' }); el.append(out);
    const presets = {
      'two rules': { T: [['tri', [1, 4, 7]], ['tri', [4, 7, 10]]], h: [0.5, 0.3] },
      'CoG worked example': { T: [['trap', [0, 2, 3, 4]], ['tri', [6, 8, 10]]], h: [0.5, 0] },
      'plateau (MOM vs SOM vs LOM)': { T: [['trap', [0.5, 2, 3.5, 5]], ['trap', [5, 6.5, 8.5, 10]]], h: [0.6, 0.6] }
    };
    let pre = presets[ds(el, 'preset', 'two rules')], hs = pre.h.slice();
    const ys = linspace(0, 10, 2001);
    const show = { centroid: true, bisector: false, mom: true, som: false, lom: false, wavg: false };
    const mcol = { centroid: C.c, bisector: '#3a7bd5', mom: C.b, som: '#5a8f29', lom: '#c2457a', wavg: C.ink };
    function compute() {
      const cl = pre.T.map((s, i) => ys.map(y => Math.min(hs[i], mf(s, y))));
      const agg = ys.map((_, k) => Math.max(...cl.map(c => c[k])));
      const r = { centroid: Defuzz.centroid(ys, agg), bisector: Defuzz.bisector(ys, agg), mom: Defuzz.mom(ys, agg), som: Defuzz.som(ys, agg), lom: Defuzz.lom(ys, agg) };
      const den = hs.reduce((s, v) => s + v, 0); r.wavg = den ? pre.T.reduce((s, sp, i) => s + hs[i] * peakOf(sp), 0) / den : NaN;
      const areas = cl.map(c => c.reduce((s, v) => s + v, 0) * (ys[1] - ys[0]));
      const cents = cl.map(c => Defuzz.centroid(ys, c));
      const at = areas.reduce((s, v) => s + v, 0); r.cos = at ? areas.reduce((s, a, i) => s + a * (cents[i] || 0), 0) / at : NaN;
      return { cl, agg, r, areas, cents };
    }
    let shown = {};
    function draw() {
      const { cl, agg, r, areas, cents } = compute();
      P.clear().axes({ xlabel: '', xticks: [0, 2, 4, 6, 8, 10] });
      pre.T.forEach((s, i) => P.fn(x => mf(s, x), { color: [C.a, C.b][i], width: 1.5, dash: [5, 4] }));
      cl.forEach((c, i) => P.series(ys, c, { color: [C.a, C.b][i], width: 0, fill: .18 }));
      P.series(ys, agg, { color: C.ink, width: 2.5 });
      let row = 0;
      Object.keys(show).forEach(k => { if (show[k] && !isNaN(r[k])) { const x = shown[k] ?? r[k]; P.vline(x, { color: mcol[k], dash: [3, 3], y1: 1 }); P.marker(x, mcol[k], k.toUpperCase(), row++ % 2); } });
      out.textContent = Object.keys(show).filter(k => show[k]).map(k => `${k.padEnd(8)} = ${round(r[k], 3)}`).join('   ') +
        `\nareas: A1 = ${round(areas[0], 3)}  A2 = ${round(areas[1], 3)}   centroids: x̄1 = ${round(cents[0] || 0, 3)}  x̄2 = ${round(cents[1] || 0, 3)}   center of sums = ${round(r.cos, 3)}`;
      return r;
    }
    function animateTo() { const from = Object.assign({}, shown), to = compute().r; tween(450, t => { Object.keys(to).forEach(k => { shown[k] = (from[k] ?? to[k]) + (to[k] - (from[k] ?? to[k])) * t; }); draw(); }); }
    const sel = h('select'); Object.keys(presets).forEach(k => sel.append(h('option', { value: k }, k))); sel.value = ds(el, 'preset', 'two rules');
    const L = h('label', {}, '<span>Preset</span>'); L.append(sel); ctr.append(L);
    const sl = [0, 1].map(i => slider(ctr, `clip h${i + 1}`, 0, 1, 0.01, hs[i], v => { hs[i] = v; animateTo(); }, v => v.toFixed(2)));
    sel.addEventListener('change', () => { pre = presets[sel.value]; hs = pre.h.slice(); sl.forEach((s, i) => { s.value = hs[i]; s.nextSibling.textContent = hs[i].toFixed(2); }); animateTo(); });
    const bar = h('div', { class: 'ctrls' }); el.insertBefore(bar, out);
    Object.keys(show).forEach(k => { const b = button(bar, k, () => { show[k] = !show[k]; b.classList.toggle('on', show[k]); draw(); }); b.classList.toggle('on', show[k]); b.style.borderColor = mcol[k]; });
    shown = compute().r; draw();
  };

  /* --- Printer head: control curve + closed loop ------------------ */
  function printerFLC(opt) {
    const z = opt.zw, nT = opt.terms;
    const E = {}, V = {};
    if (nT === 5) {
      Object.assign(E, { NB: ['trap', [-20, -20, -2 * z, -z]], NS: ['tri', [-2 * z, -z, 0]], Z: ['tri', [-z, 0, z]], PS: ['tri', [0, z, 2 * z]], PB: ['trap', [z, 2 * z, 20, 20]] });
      Object.assign(V, { NB: ['trap', [-12, -12, -6, -3]], NS: ['tri', [-6, -3, 0]], Z: ['tri', [-3, 0, 3]], PS: ['tri', [0, 3, 6]], PB: ['trap', [3, 6, 12, 12]] });
    } else {
      Object.assign(E, { N: ['trap', [-20, -20, -z, 0]], Z: ['tri', [-z, 0, z]], P: ['trap', [0, z, 20, 20]] });
      Object.assign(V, { N: ['trap', [-12, -12, -6, 0]], Z: ['tri', [-6, 0, 6]], P: ['trap', [0, 6, 12, 12]] });
    }
    let rules = Object.keys(E).map(t => ({ if: [['e', t]], then: t }));
    if (opt.buggy && nT === 5) rules = [{ if: [['e', 'NB']], then: 'NB' }, { if: [['e', 'NS']], then: 'NS' }, { if: [['e', 'Z']], then: 'PS' }, { if: [['e', 'PB']], then: 'PB' }];
    const sys = { inputs: { e: { range: [-20, 20], terms: E } }, output: { range: [-12, 12], terms: V }, rules };
    const es = linspace(-20, 20, 401);
    const curve = es.map(e => { const r = mamdani(sys, { e }, { defuzz: opt.defuzz, n: 241 }).crisp; return isNaN(r) ? 0 : r; });
    return { sys, es, curve, at: e => { const k = clamp((e + 20) / 40 * 400, 0, 400), i = Math.floor(k), f = k - i; return i >= 400 ? curve[400] : curve[i] * (1 - f) + curve[i + 1] * f; } };
  }
  function simPlant(ctrl, { p0 = -10, ref = 10, T = 4, dt = 0.002, k = 30, a = 2, b = 6 } = {}) {
    let p = p0, v = 0; const ts = [], ps = [];
    for (let t = 0; t <= T; t += dt) {
      const u = clamp(ctrl(ref - p), -12, 12);
      const acc = k * u - (a + b) * v - a * b * p; v += acc * dt; p += v * dt;
      if (Math.round(t / dt) % 10 === 0) { ts.push(t); ps.push(p); }
    }
    return { ts, ps };
  }
  W['printer'] = el => {
    const C = colors(), cv = canvas(el, 1100, 360);
    const P1 = new Plot(cv, { x: [-20, 20], y: [-12.5, 12.5], box: [0, 0, 480, 360] });
    const P2 = new Plot(cv, { x: [0, 4], y: [-12, 14], box: [480, 0, 620, 360] });
    const ctr = h('div', { class: 'ctrls' }); el.append(ctr);
    const out = h('div', { class: 'readout' }); el.append(out);
    const opt = { zw: 5, terms: +ds(el, 'terms', 5), defuzz: 'centroid', buggy: ds(el, 'buggy', 'false') === 'true' }; let kp = 0.8;
    function draw() {
      const t0 = performance.now(); const F = printerFLC(opt); const tf = performance.now() - t0;
      P1.clear().axes({ xlabel: 'error e (cm)', ylabel: 'voltage (V)', xticks: [-20, -10, 0, 10, 20], yticks: [-12, -6, 0, 6, 12] });
      P1.fn(e => clamp(kp * e, -12, 12), { color: C.ink3, width: 2, dash: [6, 4] });
      P1.series(F.es, F.curve, { color: C.a, width: 3.5 });
      P1.text('control curve  V = f(e)', 60, 26, { color: C.ink2, font: '600 13px Inter' });
      const sP = simPlant(e => kp * e), sF = simPlant(F.at);
      P2.clear().axes({ xlabel: 't (s)', ylabel: 'position (cm)', xticks: [0, 1, 2, 3, 4], yticks: [-10, -5, 0, 5, 10] });
      P2.hline(10, { color: C.ink3, label: 'ref' });
      P2.series(sP.ts, sP.ps, { color: C.ink3, width: 2.5, dash: [6, 4] }).series(sF.ts, sF.ps, { color: C.a, width: 3.5 });
      const ess = x => (10 - x.ps[x.ps.length - 1]).toFixed(2);
      const os = x => Math.max(0, Math.max(...x.ps) - 10).toFixed(2);
      out.textContent = `P (kp=${kp.toFixed(2)}):  steady-state error = ${ess(sP)} cm   overshoot = ${os(sP)} cm\nFuzzy (${opt.terms} terms, ${opt.defuzz}):  steady-state error = ${ess(sF)} cm   overshoot = ${os(sF)} cm   [curve built in ${tf.toFixed(1)} ms]`;
    }
    slider(ctr, 'Zero half-width', 1, 10, 0.5, opt.zw, v => { opt.zw = v; draw(); }, v => v.toFixed(1) + ' cm');
    slider(ctr, 'kp', 0.2, 3, 0.05, kp, v => { kp = v; draw(); }, v => v.toFixed(2));
    const s1 = h('select'); ['5', '3'].forEach(t => s1.append(h('option', { value: t }, t + ' terms'))); s1.value = String(opt.terms);
    s1.addEventListener('change', () => { opt.terms = +s1.value; draw(); });
    const s2 = h('select'); ['centroid', 'bisector', 'mom', 'som', 'lom'].forEach(t => s2.append(h('option', { value: t }, t)));
    s2.addEventListener('change', () => { opt.defuzz = s2.value; draw(); });
    const L1 = h('label', {}, '<span>Terms</span>'); L1.append(s1); const L2 = h('label', {}, '<span>Defuzz</span>'); L2.append(s2); ctr.append(L1, L2);
    if (opt.buggy) { const b = button(ctr, 'buggy rule base: ON', () => { opt.buggy = !opt.buggy; b.textContent = `buggy rule base: ${opt.buggy ? 'ON' : 'OFF'}`; draw(); }, 'btn'); }
    ctr.insertAdjacentHTML('beforeend', `<span class="legend"><span><i style="background:${C.ink3}"></i>P control</span><span><i style="background:${C.a}"></i>fuzzy</span></span>`);
    draw();
  };

  /* --- Inverted pendulum rule table ------------------------------ */
  W['rule-table'] = el => {
    const L = ['NH', 'NL', 'Z', 'PL', 'PH'];
    const given = { 'Z,Z': 'Z', 'Z,NH': 'NH', 'Z,NL': 'NL', 'Z,PL': 'PL', 'Z,PH': 'PH', 'NH,Z': 'NH', 'NL,Z': 'NL', 'PL,Z': 'PL', 'PH,Z': 'PH', 'NL,PL': 'Z', 'PL,NL': 'Z' };
    const t = h('table', { class: 'ruletab' });
    let html = '<tr><th style="font-size:13px">angle ↓ / ω →</th>' + L.map(l => `<th>${l}</th>`).join('') + '</tr>';
    L.forEach(a => { html += `<tr><th>${a}</th>` + L.map(w => { const g = given[`${a},${w}`]; return `<td data-a="${a}" data-w="${w}" class="${g ? 'given' : 'ask'}">${g || '?'}</td>`; }).join('') + '</tr>'; });
    t.innerHTML = html; el.append(t);
    const ctr = h('div', { class: 'ctrls' }); el.append(ctr);
    const out = h('div', { class: 'readout' }, 'Click a “?” cell to propose an output; click again to cycle.'); el.append(out);
    t.querySelectorAll('td.ask').forEach(td => td.addEventListener('click', () => {
      const i = L.indexOf(td.textContent); td.textContent = L[(i + 1) % 5]; td.classList.add('guess');
      out.textContent = `IF angle is ${td.dataset.a} AND angular velocity is ${td.dataset.w} THEN speed is ${td.textContent}`;
    }));
    t.querySelectorAll('td.given').forEach(td => td.addEventListener('click', () => { out.textContent = `Given: IF angle is ${td.dataset.a} AND angular velocity is ${td.dataset.w} THEN speed is ${td.textContent}`; }));
    button(ctr, 'Reveal a consistent completion', () => {
      t.querySelectorAll('td.ask').forEach((td, k) => setTimeout(() => {
        const s = clamp(L.indexOf(td.dataset.a) - 2 + L.indexOf(td.dataset.w) - 2, -2, 2);
        td.textContent = L[s + 2]; td.classList.add('guess');
      }, k * 70));
      out.textContent = 'Pattern: output index ≈ clamp(angle index + ω index). The table is anti-symmetric about the Z diagonal.';
    }, 'btn');
  };

  /* --- ANFIS (1-input, first-order Sugeno) live training ---------- */
  W['anfis'] = el => {
    const C = colors(), cv = canvas(el, 1100, 390);
    const P1 = new Plot(cv, { x: [0, 10], y: [0, 1.0], box: [0, 0, 1100, 262], margin: { l: 50, r: 16, t: 10, b: 12 } });
    const P2 = new Plot(cv, { x: [0, 10], y: [0, 1.05], box: [0, 262, 1100, 128], margin: { l: 50, r: 16, t: 8, b: 30 } });
    const ctr = h('div', { class: 'ctrls' }); el.append(ctr);
    const out = h('div', { class: 'readout' }); el.append(out);
    // Robot example: calibrate a Sharp-type IR range sensor (output voltage → distance).
    // Internally x ∈ [0, 10] is mapped to V = 0.4 … 3.0 V; target distance d = 0.27 / (V − 0.1) m (+ small noise).
    const volt = x => 0.4 + 0.26 * x, fmtV = x => volt(x).toFixed(1) + ' V';
    const target = x => 0.27 / (volt(x) - 0.1);
    const X = linspace(0, 10, 60), Yt = X.map(x => target(x) + (Math.sin(13 * x) * 0.01));
    let N = 3, prem, cons, epoch = 0, timer = null, LR = 0.5;
    function init() { prem = linspace(2, 8, N).map(c => ({ c, s: 1.0 })); cons = Array(2 * N).fill(0); epoch = 0; LR = 0.5; }
    const firing = x => { const w = prem.map(p => MF.gauss(x, [p.c, p.s])); const S = w.reduce((a, b) => a + b, 0) || 1e-12; return w.map(v => v / S); };
    const predict = x => { const wb = firing(x); return wb.reduce((s, w, i) => s + w * (cons[2 * i] * x + cons[2 * i + 1]), 0); };
    const mse = () => X.reduce((s, x, k) => s + (predict(x) - Yt[k]) ** 2, 0) / X.length;
    function lse() {               // forward pass: least squares for consequents (Jang's hybrid rule)
      const m = 2 * N, A = Array.from({ length: m }, () => Array(m).fill(0)), b = Array(m).fill(0);
      X.forEach((x, k) => { const wb = firing(x); const row = []; wb.forEach(w => row.push(w * x, w)); for (let i = 0; i < m; i++) { b[i] += row[i] * Yt[k]; for (let j = 0; j < m; j++) A[i][j] += row[i] * row[j]; } });
      for (let i = 0; i < m; i++) A[i][i] += 1e-6;
      for (let i = 0; i < m; i++) { let p = i; for (let r = i + 1; r < m; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r; [A[i], A[p]] = [A[p], A[i]];[b[i], b[p]] = [b[p], b[i]]; for (let r = i + 1; r < m; r++) { const f = A[r][i] / A[i][i]; for (let c = i; c < m; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; } }
      for (let i = m - 1; i >= 0; i--) { let s = b[i]; for (let c = i + 1; c < m; c++) s -= A[i][c] * cons[c]; cons[i] = s / A[i][i]; }
    }
    function gd() {               // backward pass: gradient descent on premise parameters (numerical gradient + backtracking)
      const base = mse(), eps = 1e-5, keys = [];
      prem.forEach(p => ['c', 's'].forEach(k => keys.push([p, k])));
      const g = keys.map(([p, k]) => { p[k] += eps; const v = (mse() - base) / eps; p[k] -= eps; return v; });
      const saveP = prem.map(p => ({ ...p })), saveC = cons.slice();
      keys.forEach(([p, k], i) => { p[k] -= clamp(LR * g[i], -0.3, 0.3); });
      prem.forEach(p => { p.s = clamp(p.s, 0.3, 5); });
      lse();
      if (mse() > base) { prem.forEach((p, i) => Object.assign(p, saveP[i])); cons = saveC; LR *= 0.5; } else LR *= 1.2;
    }
    function draw() {
      P1.clear().axes({ xlabel: '', ylabel: 'distance (m)', xticks: [], yticks: [0, 0.25, 0.5, 0.75, 1] });
      X.forEach((x, k) => P1.dot(x, Yt[k], C.ink3, 3.5));
      prem.forEach((p, i) => P1.fn(x => cons[2 * i] * x + cons[2 * i + 1], { color: PALETTE()[i % 7], width: 1, dash: [4, 4] }));
      P1.fn(predict, { color: C.c, width: 3.5 });
      P2.clear().axes({ xlabel: '', ylabel: 'μ', xticks: [0, 2, 4, 6, 8, 10], yticks: [0, 1], fmt: fmtV });
      prem.forEach((p, i) => P2.fn(x => MF.gauss(x, [p.c, p.s]), { color: PALETTE()[i % 7], width: 2.5, fill: .08 }));
      out.textContent = `epoch ${String(epoch).padStart(3)}   RMSE = ${(100 * Math.sqrt(mse())).toFixed(2)} cm   rules: ${N}   ` + prem.map((p, i) => `R${i + 1}: IF V ≈ ${volt(p.c).toFixed(2)} V (σ=${(0.26 * p.s).toFixed(2)})`).join('   ');
    }
    function train(n) { for (let i = 0; i < n; i++) { if (!epoch) lse(); gd(); epoch++; } draw(); }
    button(ctr, '▶ Train', () => { clearInterval(timer); let k = 0; timer = setInterval(() => { train(1); if (++k >= 80) clearInterval(timer); }, 60); }, 'btn');
    button(ctr, 'Epoch +1', () => train(1));
    button(ctr, '↺ Reset', () => { clearInterval(timer); init(); draw(); });
    slider(ctr, 'rules (MFs)', 2, 6, 1, N, v => { clearInterval(timer); N = v; init(); draw(); }, v => v);
    ctr.insertAdjacentHTML('beforeend', `<span class="legend"><span><i style="background:${C.ink3}"></i>calibration samples</span><span><i style="background:${C.c}"></i>ANFIS model d(V)</span><span>dashed: rule consequents dᵢ = pᵢV + rᵢ</span></span>`);
    init(); draw();
  };

  /* --- Conveyor belt with fuzzy position controller --------------- */
  W['conveyor'] = el => {
    const C = colors(), cv = canvas(el, 1100, 400), ctx = cv.getContext('2d');
    const P = new Plot(cv, { x: [0, 4], y: [-0.85, 0.85], box: [0, 170, 1100, 230], margin: { l: 60, r: 16, t: 10, b: 34 } });
    const ctr = h('div', { class: 'ctrls' }); el.append(ctr);
    const out = h('div', { class: 'readout' }); el.append(out);
    const mk = s => ({ N: ['trap', [-s * 10, -s * 10, -s, 0]], Z: ['tri', [-s, 0, s]], P: ['trap', [0, s, s * 10, s * 10]] });
    let useVel = true, eW = 0.3;
    function system() {
      const inputs = { e: { range: [-1.5, 1.5], terms: mk(eW) } };
      const output = { range: [-1, 1], terms: { NB: ['tri', [-1.5, -1, -0.5]], NS: ['tri', [-1, -0.5, 0]], Z: ['tri', [-0.5, 0, 0.5]], PS: ['tri', [0, 0.5, 1]], PB: ['tri', [0.5, 1, 1.5]] } };
      let rules;
      if (useVel) {
        inputs.v = { range: [-1, 1], terms: mk(1.5) };
        // e = target − x ; v = ball velocity.  PD-like table: push toward target, brake when already moving that way
        const T = { 'N,N': 'NS', 'N,Z': 'NB', 'N,P': 'NB', 'Z,N': 'PS', 'Z,Z': 'Z', 'Z,P': 'NS', 'P,N': 'PB', 'P,Z': 'PB', 'P,P': 'PS' };
        rules = Object.entries(T).map(([k, o]) => { const [e, v] = k.split(','); return { if: [['e', e], ['v', v]], then: o }; });
      } else rules = [{ if: [['e', 'N']], then: 'NB' }, { if: [['e', 'Z']], then: 'Z' }, { if: [['e', 'P']], then: 'PB' }];
      return { inputs, output, rules };
    }
    let sys = system(), x = -0.1, vb = 0, ub = 0, target = 0.6, t = 0, hist = [], belt = 0, run = false, dropped = false;
    const tauB = 0.3, tauM = 0.08, dt = 1 / 240;   // ball-belt coupling lag, motor lag
    function reset(x0) { x = x0 ?? x; vb = 0; ub = 0; t = 0; hist = [[0, x]]; dropped = false; }
    function stepSim() {
      const cmd = mamdani(sys, { e: target - x, v: vb }, { n: 81 }).crisp || 0;
      ub += (cmd - ub) * dt / tauM; vb += (ub - vb) * dt / tauB; x += vb * dt; belt += ub * dt; t += dt;
      if (Math.abs(x) > 0.75) dropped = true;
    }
    function draw() {
      ctx.clearRect(0, 0, 1100, 170);
      const X0 = 150, X1 = 950, sx = v => X0 + (v + 0.75) / 1.5 * (X1 - X0), by = 105;
      ctx.fillStyle = '#2a2f3a'; ctx.beginPath(); ctx.roundRect(X0 - 24, by - 14, X1 - X0 + 48, 34, 17); ctx.fill();
      ctx.strokeStyle = '#4c5466'; ctx.lineWidth = 2;
      for (let k = 0; k < 40; k++) { const px = X0 + (((k * 22 + belt / 1.5 * (X1 - X0)) % 880) + 880) % 880 - 40; if (px > X0 - 20 && px < X1 + 20) { ctx.beginPath(); ctx.moveTo(px, by - 12); ctx.lineTo(px, by + 18); ctx.stroke(); } }
      [X0 - 6, X1 + 6].forEach(cx => { ctx.fillStyle = '#9aa3b5'; ctx.beginPath(); ctx.arc(cx, by + 3, 11, 0, 7); ctx.fill(); });
      ctx.font = '500 12px Inter'; ctx.fillStyle = C.ink3; ctx.textAlign = 'center';
      [-0.75, -0.5, 0, 0.5, 0.75].forEach(v => { ctx.fillText(`${v} m`, sx(v), by + 42); ctx.fillRect(sx(v) - .5, by + 22, 1, 6); });
      ctx.strokeStyle = C.b; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(sx(target), 20); ctx.lineTo(sx(target), by - 14); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.b; ctx.font = '700 13px Inter'; ctx.fillText(`target ${target.toFixed(2)}`, sx(target), 16);
      const g = ctx.createRadialGradient(sx(x) - 6, by - 38, 3, sx(x), by - 30, 18); g.addColorStop(0, '#fff'); g.addColorStop(1, '#a8acd8');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx(clamp(x, -0.8, 0.8)), by - 30, 16, 0, 7); ctx.fill();
      if (dropped) { ctx.fillStyle = C.bad; ctx.font = '800 20px Inter'; ctx.fillText('ball dropped — reset!', 550, 60); }
      P.clear().axes({ xlabel: 't (s)', ylabel: 'x (m)', xticks: [0, 1, 2, 3, 4], yticks: [-0.6, 0, 0.6] });
      P.hline(target, { color: C.b });
      if (hist.length > 1) P.series(hist.map(q => q[0]), hist.map(q => q[1]), { color: C.a, width: 3 });
      out.textContent = `t = ${t.toFixed(2)} s   x = ${x.toFixed(3)} m   ball v = ${vb.toFixed(3)} m/s   belt cmd = ${ub.toFixed(3)} m/s   inputs: ${useVel ? 'error + velocity (9 rules)' : 'error only (3 rules)'}`;
    }
    function loop() {
      if (!run) return;
      for (let k = 0; k < 4 && t < 4 && !dropped; k++) { stepSim(); if (Math.round(t / dt) % 6 === 0) hist.push([t, x]); }
      draw(); if (t < 4 && !dropped) requestAnimationFrame(loop); else run = false;
    }
    const go = tg => { target = tg; reset(); run = true; requestAnimationFrame(loop); };
    [0.6, -0.6, 0].forEach(tg => button(ctr, `target ${tg}`, () => go(tg), 'btn'));
    button(ctr, 'random start', () => { x = (Math.random() - 0.5) * 1.2; reset(x); draw(); });
    const vb_ = button(ctr, 'velocity input: ON', () => { useVel = !useVel; vb_.textContent = `velocity input: ${useVel ? 'ON' : 'OFF'}`; sys = system(); });
    slider(ctr, 'Z(error) width', 0.1, 1.2, 0.05, eW, v => { eW = v; sys = system(); }, v => v.toFixed(2) + ' m');
    cv.addEventListener('click', e => { const r = cv.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width * 1100, py = (e.clientY - r.top) / r.height * 400; if (py < 150 && px > 150 && px < 950) go(+(((px - 150) / 800) * 1.5 - 0.75).toFixed(2)); });
    reset(-0.1); draw();
  };

  /* ---------------------------------------------------------------
     4. Public API
     --------------------------------------------------------------- */
  global.Fuzzy = { MF, mf, mamdani, Defuzz, linspace, Plot, W, colors, tween,
    init(root) {
      (root || document).querySelectorAll('[data-widget]:not([data-ready])').forEach(el => {
        const fn = W[el.dataset.widget]; el.dataset.ready = '1'; el.classList.add('widget');
        if (fn) { try { fn(el); } catch (e) { console.error('widget', el.dataset.widget, e); el.textContent = 'Widget error: ' + e.message; } }
      });
    }
  };
})(window);
