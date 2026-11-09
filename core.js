/* ПРОЕКТ 200 — ядро: утилиты, ГСЧ, разбор выражений, единицы измерения, звук */
'use strict';
const P = window.P = {};
P.VERSION = '1.0.0';
P.$ = (s, r = document) => r.querySelector(s);
P.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
P.esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
P.today = (d = new Date()) => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); };
P.addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return P.today(d); };
P.daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);
P.clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/* ---------- форматирование чисел по-русски ---------- */
P.round = (x, n = 10) => { const k = Math.pow(10, n); return Math.round(x * k) / k; };
P.fmt = (x, n = 6) => {
  if (!isFinite(x)) return String(x);
  let s = String(P.round(x, n));
  if (/e/.test(s)) s = x.toPrecision(4);
  return s.replace('-', '−').replace('.', ',');
};
/* дробь в HTML */
P.F = (a, b) => `<span class="fr"><i>${a}</i><i>${b}</i></span>`;
P.R = a => `<span class="rt">√<i>${a}</i></span>`;

/* ---------- ГСЧ с зерном (для воспроизводимых вариантов) ---------- */
P.rng = seed => {
  let a = (seed >>> 0) || 1;
  const r = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  r.int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  r.pick = arr => arr[Math.floor(r() * arr.length)];
  r.sign = () => (r() < .5 ? -1 : 1);
  r.shuffle = arr => { const b = arr.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  r.intNZ = (lo, hi) => { let v; do v = r.int(lo, hi); while (v === 0); return v; };
  return r;
};
P.seed = () => (Math.random() * 2 ** 31) >>> 0;

/* ---------- безопасный разбор математического выражения (без eval) ---------- */
P.parseExpr = function (src) {
  let s = String(src || '').trim();
  if (!s) return NaN;
  s = s.replace(/\s+/g, '').replace(/[−–—]/g, '-').replace(/[×·*]/g, '*').replace(/[÷:]/g, '/')
    .replace(/,/g, '.').replace(/pi|пи/gi, 'π').replace(/sqrt|корень/gi, '√').replace(/²/g, '^2').replace(/³/g, '^3');
  let i = 0;
  const peek = () => s[i];
  const num = () => { const m = /^\d*\.?\d+(?:e[+-]?\d+)?|^\d+\.?/i.exec(s.slice(i)); if (!m) throw 0; i += m[0].length; return parseFloat(m[0]); };
  function primary() {
    const c = peek();
    if (c === '(') { i++; const v = expr(); if (s[i] !== ')') throw 0; i++; return v; }
    if (c === 'π') { i++; return Math.PI; }
    if (c === '√') { i++; const v = unary(); if (v < 0) throw 0; return Math.sqrt(v); }
    if (/[\d.]/.test(c)) return num();
    throw 0;
  }
  function power() { const b = primary(); if (peek() === '^') { i++; const e = unary(); return Math.pow(b, e); } return b; }
  function unary() { if (peek() === '-') { i++; return -unary(); } if (peek() === '+') { i++; return unary(); } return power(); }
  function term() {
    let v = unary();
    for (;;) {
      const c = peek();
      if (c === '*') { i++; v *= unary(); }
      else if (c === '/') { i++; const d = unary(); v /= d; }
      else if (c === '(' || c === 'π' || c === '√') v *= power();
      else return v;
    }
  }
  function expr() { let v = term(); for (;;) { const c = peek(); if (c === '+') { i++; v += term(); } else if (c === '-') { i++; v -= term(); } else return v; } }
  try { const v = expr(); if (i !== s.length) return NaN; return v; } catch (e) { return NaN; }
};

/* ---------- единицы измерения и размерности ---------- */
/* размерность: [м, кг, с, А, К, моль] */
(function () {
  const U = {
    'м': [1, [1, 0, 0, 0, 0, 0]], 'г': [1e-3, [0, 1, 0, 0, 0, 0]], 'с': [1, [0, 0, 1, 0, 0, 0]], 'мин': [60, [0, 0, 1, 0, 0, 0]], 'ч': [3600, [0, 0, 1, 0, 0, 0]],
    'сут': [86400, [0, 0, 1, 0, 0, 0]], 'А': [1, [0, 0, 0, 1, 0, 0]], 'К': [1, [0, 0, 0, 0, 1, 0]], 'моль': [1, [0, 0, 0, 0, 0, 1]], 'т': [1000, [0, 1, 0, 0, 0, 0]],
    'Н': [1, [1, 1, -2, 0, 0, 0]], 'Дж': [1, [2, 1, -2, 0, 0, 0]], 'Вт': [1, [2, 1, -3, 0, 0, 0]], 'Па': [1, [-1, 1, -2, 0, 0, 0]],
    'Кл': [1, [0, 0, 1, 1, 0, 0]], 'В': [1, [2, 1, -3, -1, 0, 0]], 'Ом': [1, [2, 1, -3, -2, 0, 0]], 'Гц': [1, [0, 0, -1, 0, 0, 0]],
    'Тл': [1, [0, 1, -2, -1, 0, 0]], 'Ф': [1, [-2, -1, 4, 2, 0, 0]], 'Гн': [1, [2, 1, -2, -2, 0, 0]], 'Вб': [1, [2, 1, -2, -1, 0, 0]],
    'эВ': [1.602176634e-19, [2, 1, -2, 0, 0, 0]], 'л': [1e-3, [3, 0, 0, 0, 0, 0]], 'дптр': [1, [-1, 0, 0, 0, 0, 0]], 'рад': [1, [0, 0, 0, 0, 0, 0]],
    'об': [1, [0, 0, 0, 0, 0, 0]], '%': [0.01, [0, 0, 0, 0, 0, 0]], 'атм': [101325, [-1, 1, -2, 0, 0, 0]]
  };
  const PRE = [['мк', 1e-6], ['М', 1e6], ['Г', 1e9], ['к', 1e3], ['м', 1e-3], ['с', 1e-2], ['д', 1e-1], ['н', 1e-9], ['п', 1e-12]];
  const LAT = { m: 'м', kg: 'кг', g: 'г', s: 'с', N: 'Н', J: 'Дж', W: 'Вт', Pa: 'Па', C: 'Кл', V: 'В', A: 'А', K: 'К', Hz: 'Гц', T: 'Тл', h: 'ч', ohm: 'Ом', 'Ω': 'Ом', eV: 'эВ', mol: 'моль' };
  function one(tok) {
    if (LAT[tok]) tok = LAT[tok];
    if (U[tok]) return { f: U[tok][0], d: U[tok][1].slice() };
    for (const [p, k] of PRE) if (tok.startsWith(p) && U[tok.slice(p.length)]) { const u = U[tok.slice(p.length)]; return { f: k * u[0], d: u[1].slice() }; }
    return null;
  }
  P.parseUnit = function (str) {
    let s = String(str || '').trim().replace(/[·*×]/g, '*').replace(/\s+/g, '*').replace(/²/g, '^2').replace(/³/g, '^3').replace(/⁻¹/g, '^-1').replace(/[−–]/g, '-');
    if (!s) return null;
    const res = { f: 1, d: [0, 0, 0, 0, 0, 0] };
    const re = /([*/]?)([A-Za-zА-Яа-яЁёΩ%]+)(?:\^?(-?\d+))?/g;
    let m, used = 0;
    while ((m = re.exec(s))) {
      used += m[0].length;
      const u = one(m[2]); if (!u) return { err: 'неизвестная единица «' + m[2] + '»' };
      const pw = (m[3] ? parseInt(m[3], 10) : 1) * (m[1] === '/' ? -1 : 1);
      res.f *= Math.pow(u.f, pw); for (let k = 0; k < 6; k++) res.d[k] += u.d[k] * pw;
    }
    if (used !== s.length) return { err: 'не удалось разобрать запись единиц' };
    return res;
  };
  const NAMES = [
    [[1, 0, 0, 0, 0, 0], 'длина'], [[0, 1, 0, 0, 0, 0], 'масса'], [[0, 0, 1, 0, 0, 0], 'время'], [[1, 0, -1, 0, 0, 0], 'скорость'],
    [[1, 0, -2, 0, 0, 0], 'ускорение'], [[1, 1, -2, 0, 0, 0], 'сила'], [[2, 1, -2, 0, 0, 0], 'энергия (работа)'], [[2, 1, -3, 0, 0, 0], 'мощность'],
    [[1, 1, -1, 0, 0, 0], 'импульс'], [[-1, 1, -2, 0, 0, 0], 'давление'], [[0, 0, -1, 0, 0, 0], 'частота'], [[2, 0, 0, 0, 0, 0], 'площадь'],
    [[3, 0, 0, 0, 0, 0], 'объём'], [[0, 0, 0, 1, 0, 0], 'сила тока'], [[2, 1, -3, -1, 0, 0], 'напряжение'], [[2, 1, -3, -2, 0, 0], 'сопротивление'],
    [[0, 0, 1, 1, 0, 0], 'заряд'], [[0, 0, 0, 0, 1, 0], 'температура'], [[-3, 1, 0, 0, 0, 0], 'плотность'], [[0, 0, 0, 0, 0, 0], 'безразмерная величина'],
    [[1, 1, -3, -1, 0, 0], 'напряжённость поля'], [[0, 1, -2, -1, 0, 0], 'магнитная индукция'], [[2, 1, -2, -1, 0, 0], 'магнитный поток']
  ];
  P.dimName = d => { for (const [v, n] of NAMES) if (v.every((x, i) => x === d[i])) return n; return 'величина другой размерности'; };
  P.sameDim = (a, b) => a.every((x, i) => x === b[i]);
})();

/* ---------- звук: синтез Web Audio (локально, без файлов) ---------- */
P.snd = (function () {
  let ctx = null, gain = null;
  const st = { on: true, vol: 0.5 };
  function ensure() {
    if (!st.on || st.vol <= 0) return null;
    try {
      if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); gain = ctx.createGain(); gain.connect(ctx.destination); }
      if (ctx.state === 'suspended') ctx.resume();
      gain.gain.value = st.vol * 0.35;
      return ctx;
    } catch (e) { return null; }
  }
  function tone(f, t0, dur, type = 'square', v = 1, f2) {
    const c = ensure(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, c.currentTime + t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, c.currentTime + t0 + dur);
    g.gain.setValueAtTime(0.0001, c.currentTime + t0);
    g.gain.exponentialRampToValueAtTime(v, c.currentTime + t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t0 + dur);
    o.connect(g); g.connect(gain); o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + 0.02);
  }
  function noise(t0, dur, v = .5) {
    const c = ensure(); if (!c) return;
    const n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 6);
    const s = c.createBufferSource(), g = c.createGain(), fl = c.createBiquadFilter();
    fl.type = 'highpass'; fl.frequency.value = 1800; g.gain.value = v;
    s.buffer = b; s.connect(fl); fl.connect(g); g.connect(gain); s.start(c.currentTime + t0);
  }
  const S = {
    key() { noise(0, .03, .6); },
    toggle() { noise(0, .02, .7); tone(140, 0, .04, 'square', .3); },
    nav() { tone(880, 0, .05, 'square', .15); },
    ok() { tone(660, 0, .09, 'square', .25); tone(990, .09, .14, 'square', .25); },
    bad() { tone(220, 0, .12, 'sawtooth', .25); tone(165, .12, .2, 'sawtooth', .25); },
    boot() { [523, 659, 784, 1046].forEach((f, i) => tone(f, i * .08, .1, 'square', .18)); noise(0, .15, .3); },
    award() { [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, i * .12, .25, 'triangle', .35)); },
    term() { tone(1200, 0, .06, 'sine', .3); tone(1200, .1, .06, 'sine', .3); }
  };
  return {
    set(on, vol) { st.on = !!on; st.vol = +vol; },
    play(name) { try { if (st.on && S[name]) S[name](); } catch (e) { } },
    get on() { return st.on; }, get vol() { return st.vol; }
  };
})();

/* ---------- мелкий UI ---------- */
P.toast = function (msg, ms = 2200) {
  let t = P.$('#toast'); if (t) t.remove();
  t = document.createElement('div'); t.id = 'toast'; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
};
P.modal = function (html, onMount) {
  P.closeModal();
  const m = document.createElement('div'); m.id = 'modal';
  m.innerHTML = `<div class="sheet">${html}</div>`;
  m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) P.closeModal(); });
  document.body.appendChild(m); if (onMount) onMount(m.firstChild);
  return m.firstChild;
};
P.closeModal = () => { const m = P.$('#modal'); if (m) m.remove(); };

/* SVG-эмблема ПРОЕКТ 200 */
P.emblem = (cls = 'emblem') => `<svg class="${cls}" viewBox="0 0 200 200" aria-label="Эмблема ПРОЕКТ 200">
<defs><path id="arcT" d="M30 100a70 70 0 0 1 140 0"/><path id="arcB" d="M26 100a74 74 0 0 0 148 0"/></defs>
<circle cx="100" cy="100" r="96" fill="#7f1913"/><circle cx="100" cy="100" r="90" fill="none" stroke="#b8954a" stroke-width="3"/>
<circle cx="100" cy="100" r="68" fill="#b3261e" stroke="#e8d6a8" stroke-width="2"/>
<g fill="#e8d6a8">${Array.from({ length: 24 }, (_, i) => { const a = i * Math.PI / 12; return `<circle cx="${100 + 80 * Math.cos(a)}" cy="${100 + 80 * Math.sin(a)}" r="1.6"/>`; }).join('')}</g>
<path transform="translate(100 62) scale(.38) translate(-50 -50)" fill="#ffd27a" d="M50 4l13.4 31.6 34.2 3-26 22.5 7.8 33.5L50 77 20.6 94.6l7.8-33.5-26-22.5 34.2-3z"/>
<text x="100" y="128" text-anchor="middle" font-family="Avenir Next Condensed,Arial Narrow,DejaVu Sans Condensed,sans-serif" font-weight="800" font-size="56" fill="#fffdf8" letter-spacing="1">200</text>
<text x="100" y="146" text-anchor="middle" font-family="Avenir Next Condensed,Arial Narrow,sans-serif" font-weight="700" font-size="11" fill="#e8d6a8" letter-spacing="3">ПРОЕКТ</text>
</svg>`;
