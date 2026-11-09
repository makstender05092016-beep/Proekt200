/* ПРОЕКТ 200 — визуализации: SVG-чертежи к задачам и интерактивные модели тем */
'use strict';
(function () {
  const C = { ink: '#231a14', red: '#b3261e', gold: '#b8954a', grid: '#e4d8bd', ax: '#5a3d2b', blue: '#2b5d8a', green: '#2f6b3a' };
  const svg = (w, h, body) => `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system,DejaVu Sans,sans-serif" font-size="13">${body}</svg>`;
  const arrowDef = (id, col) => `<defs><marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${col}"/></marker></defs>`;
  const fx = x => P.fmt(x);
  const V = P.V = {};

  /* координатная плоскость с графиками */
  V.plot = function ({ fns = [], pts = [], range = 6, size = 300 }) {
    const s = size / (2 * range), X = x => size / 2 + x * s, Y = y => size / 2 - y * s;
    let b = '';
    for (let i = -range; i <= range; i++) b += `<line x1="${X(i)}" y1="0" x2="${X(i)}" y2="${size}" stroke="${C.grid}"/><line x1="0" y1="${Y(i)}" x2="${size}" y2="${Y(i)}" stroke="${C.grid}"/>`;
    b += arrowDef('ax', C.ax) + `<line x1="0" y1="${Y(0)}" x2="${size - 2}" y2="${Y(0)}" stroke="${C.ax}" stroke-width="1.5" marker-end="url(#ax)"/><line x1="${X(0)}" y1="${size}" x2="${X(0)}" y2="2" stroke="${C.ax}" stroke-width="1.5" marker-end="url(#ax)"/>`;
    b += `<text x="${size - 12}" y="${Y(0) - 6}">x</text><text x="${X(0) + 6}" y="12">y</text><text x="${X(1) - 3}" y="${Y(0) + 14}" font-size="11">1</text><text x="${X(0) - 12}" y="${Y(1) + 4}" font-size="11">1</text>`;
    fns.forEach((f, k) => {
      let d = '', pen = false;
      for (let px = 0; px <= size; px += 2) { const x = (px - size / 2) / s, y = f(x); if (!isFinite(y) || Math.abs(y) > range * 3) { pen = false; continue; } d += (pen ? 'L' : 'M') + px.toFixed(1) + ' ' + Y(y).toFixed(1); pen = true; }
      b += `<path d="${d}" fill="none" stroke="${k ? C.blue : C.red}" stroke-width="2.5"/>`;
    });
    pts.forEach(([x, y]) => { if (Math.abs(x) <= range && Math.abs(y) <= range) b += `<circle cx="${X(x)}" cy="${Y(y)}" r="4.5" fill="${C.ink}"/>`; });
    return svg(size, size, `<rect width="${size}" height="${size}" fill="#fffdf8"/>` + b);
  };
  V.rtri = function (a, b, la, lb, lc) {
    const k = 200 / Math.max(a, b), A = [30, 40 + b * k], B = [30 + a * k, 40 + b * k], Cc = [30, 40];
    const w = Math.max(260, B[0] + 50), h = A[1] + 30;
    return svg(w, h, `<polygon points="${A} ${B} ${Cc}" fill="#f6eedb" stroke="${C.ink}" stroke-width="2"/><rect x="30" y="${A[1] - 14}" width="14" height="14" fill="none" stroke="${C.ink}"/>
<text x="${(A[0] + B[0]) / 2}" y="${A[1] + 20}" text-anchor="middle">${la}</text><text x="12" y="${(A[1] + Cc[1]) / 2}" text-anchor="middle">${lb}</text><text x="${(B[0] + Cc[0]) / 2 + 14}" y="${(B[1] + Cc[1]) / 2 - 6}" fill="${C.red}">${lc}</text>`);
  };
  V.circ = function (ang) {
    const cx = 150, cy = 140, R = 100, a1 = -90 - ang / 2, a2 = -90 + ang / 2, p = d => [cx + R * Math.cos(d * Math.PI / 180), cy + R * Math.sin(d * Math.PI / 180)];
    const A = p(a1), B = p(a2), Cc = p(90 + (ang > 200 ? 0 : 20));
    return svg(300, 270, `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#fffdf8" stroke="${C.ink}" stroke-width="2"/><polyline points="${A} ${cx},${cy} ${B}" fill="none" stroke="${C.blue}" stroke-width="2"/><polyline points="${A} ${Cc} ${B}" fill="none" stroke="${C.red}" stroke-width="2"/>
<circle cx="${cx}" cy="${cy}" r="3" fill="${C.ink}"/><text x="${cx + 6}" y="${cy + 14}">O</text><text x="${A[0] - 16}" y="${A[1] - 4}">A</text><text x="${B[0] + 6}" y="${B[1] - 4}">B</text><text x="${Cc[0] - 4}" y="${Cc[1] + 18}">C</text>`);
  };
  V.trap = function (a, b, h) {
    const k = 220 / b, off = (b - a) / 2 * k, H = Math.max(40, h * k);
    return svg(280, H + 50, `<polygon points="30,${H + 20} ${30 + b * k},${H + 20} ${30 + off + a * k},20 ${30 + off},20" fill="#f6eedb" stroke="${C.ink}" stroke-width="2"/><line x1="${30 + off}" y1="20" x2="${30 + off}" y2="${H + 20}" stroke="${C.red}" stroke-dasharray="4 3"/>
<text x="${30 + b * k / 2}" y="${H + 38}" text-anchor="middle">${b}</text><text x="${30 + off + a * k / 2}" y="14" text-anchor="middle">${a}</text><text x="${36 + off}" y="${H / 2 + 24}" fill="${C.red}">h</text><text x="44" y="${H + 14}" font-size="11">30°</text>`);
  };
  V.box = function (a, b, c, diag) {
    const m = Math.max(a, b, c), k = 120 / m, W = a * k, D = b * k * .5, H = c * k, x0 = 30, y0 = 40 + D + H;
    const P0 = [x0, y0], P1 = [x0 + W, y0], P2 = [x0 + W + D, y0 - D], P3 = [x0 + D, y0 - D], T = p => [p[0], p[1] - H];
    const l = (p, q, st = '') => `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="${C.ink}" stroke-width="1.8" ${st}/>`;
    let s = l(P0, P1) + l(P1, P2) + l(P0, T(P0)) + l(P1, T(P1)) + l(P2, T(P2)) + l(T(P0), T(P1)) + l(T(P1), T(P2)) + l(T(P2), T(P3)) + l(T(P3), T(P0)) + l(P3, P0, 'stroke-dasharray="4 3"') + l(P3, P2, 'stroke-dasharray="4 3"') + l(P3, T(P3), 'stroke-dasharray="4 3"');
    if (diag) s += `<line x1="${P0[0]}" y1="${P0[1]}" x2="${T(P2)[0]}" y2="${T(P2)[1]}" stroke="${C.red}" stroke-width="2.2"/>`;
    s += `<text x="${x0 + W / 2}" y="${y0 + 18}" text-anchor="middle">${a}</text><text x="${P1[0] + D / 2 + 8}" y="${y0 - D / 2 + 12}">${b}</text><text x="${x0 - 16}" y="${y0 - H / 2}">${c}</text>`;
    return svg(Math.max(240, x0 + W + D + 30), y0 + 30, s);
  };
  V.vecs = function (vs, sum) {
    const all = vs.concat(sum ? [[vs[0][0] + vs[1][0], vs[0][1] + vs[1][1]]] : []), m = Math.max(4, ...all.map(v => Math.max(Math.abs(v[0]), Math.abs(v[1])))) + 1;
    const size = 280, s = size / (2 * m), X = x => size / 2 + x * s, Y = y => size / 2 - y * s; let b = arrowDef('va', C.red) + arrowDef('vb', C.blue) + arrowDef('vs', C.green);
    for (let i = -m; i <= m; i++) b += `<line x1="${X(i)}" y1="0" x2="${X(i)}" y2="${size}" stroke="${C.grid}"/><line x1="0" y1="${Y(i)}" x2="${size}" y2="${Y(i)}" stroke="${C.grid}"/>`;
    b += `<line x1="0" y1="${Y(0)}" x2="${size}" y2="${Y(0)}" stroke="${C.ax}"/><line x1="${X(0)}" y1="0" x2="${X(0)}" y2="${size}" stroke="${C.ax}"/>`;
    const ar = (x0, y0, x, y, col, id, lab) => `<line x1="${X(x0)}" y1="${Y(y0)}" x2="${X(x)}" y2="${Y(y)}" stroke="${col}" stroke-width="2.5" marker-end="url(#${id})"/><text x="${X(x) + 5}" y="${Y(y) - 5}" fill="${col}" font-weight="700">${lab}</text>`;
    b += ar(0, 0, vs[0][0], vs[0][1], C.red, 'va', 'a') + ar(0, 0, vs[1][0], vs[1][1], C.blue, 'vb', 'b');
    if (sum) b += ar(0, 0, all[2][0], all[2][1], C.green, 'vs', 'a+b');
    return svg(size, size, `<rect width="${size}" height="${size}" fill="#fffdf8"/>` + b);
  };
  V.scale = function (base, L, d, j) {
    const n = 3 * d, w = 70, h = 260, top = 20, step = (h - 40) / n; let s = `<rect x="${w}" y="${top - 6}" width="60" height="${h - 20}" rx="8" fill="#eef4f8" stroke="${C.ink}"/>`;
    const lvl = top + (n - j) * step; s += `<rect x="${w + 2}" y="${lvl}" width="56" height="${top - 6 + h - 20 - lvl}" fill="#9cc3dd" opacity=".75"/>`;
    for (let i = 0; i <= n; i++) { const y = top + (n - i) * step, major = i % d === 0; s += `<line x1="${w}" y1="${y}" x2="${w + (major ? 26 : 14)}" y2="${y}" stroke="${C.ink}" stroke-width="${major ? 2 : 1}"/>`; if (major) s += `<text x="${w - 6}" y="${y + 4}" text-anchor="end">${base + (i / d) * L}</text>`; }
    s += `<text x="${w + 70}" y="${lvl + 4}" fill="${C.red}">◄ уровень</text><text x="${w + 30}" y="${h + 6}" text-anchor="middle" font-size="11">мл</text>`;
    return svg(220, h + 12, s);
  };
  V.vt = function (pts) {
    const tm = pts[pts.length - 1][0], vm = Math.max(...pts.map(p => p[1])) + 2, W = 280, H = 200, ox = 34, oy = H - 26, sx = (W - 50) / tm, sy = (H - 40) / vm;
    const X = t => ox + t * sx, Y = v => oy - v * sy; let b = arrowDef('ar', C.ax);
    for (let t = 0; t <= tm; t++) b += `<line x1="${X(t)}" y1="${Y(0)}" x2="${X(t)}" y2="${Y(vm)}" stroke="${C.grid}"/><text x="${X(t)}" y="${oy + 15}" text-anchor="middle" font-size="11">${t}</text>`;
    for (let v = 0; v <= vm; v += 2) b += `<line x1="${ox}" y1="${Y(v)}" x2="${X(tm)}" y2="${Y(v)}" stroke="${C.grid}"/><text x="${ox - 5}" y="${Y(v) + 4}" text-anchor="end" font-size="11">${v}</text>`;
    b += `<line x1="${ox}" y1="${oy}" x2="${W - 6}" y2="${oy}" stroke="${C.ax}" marker-end="url(#ar)"/><line x1="${ox}" y1="${oy}" x2="${ox}" y2="8" stroke="${C.ax}" marker-end="url(#ar)"/>`;
    b += `<polygon points="${X(0)},${Y(0)} ${pts.map(p => X(p[0]) + ',' + Y(p[1])).join(' ')} ${X(tm)},${Y(0)}" fill="${C.gold}" opacity=".25"/><polyline points="${pts.map(p => X(p[0]) + ',' + Y(p[1])).join(' ')}" fill="none" stroke="${C.red}" stroke-width="2.5"/>`;
    b += `<text x="${W - 30}" y="${oy - 6}" font-size="11">t, с</text><text x="${ox + 6}" y="14" font-size="11">v, м/с</text>`;
    return svg(W, H, b);
  };
  V.incline = function (deg, moving) {
    const a = deg * Math.PI / 180, L = 230, x0 = 20, y0 = 190, x1 = x0 + L * Math.cos(a), y1 = y0 - L * Math.sin(a);
    const cx = x0 + L * .55 * Math.cos(a), cy = y0 - L * .55 * Math.sin(a), nx = -Math.sin(a), ny = -Math.cos(a), tx = -Math.cos(a), ty = Math.sin(a);
    const bc = [cx + nx * 18, cy + ny * 18];
    const ar = (x, y, dx, dy, col, lab, id) => `<line x1="${x}" y1="${y}" x2="${x + dx}" y2="${y + dy}" stroke="${col}" stroke-width="2.5" marker-end="url(#${id})"/><text x="${x + dx + 4}" y="${y + dy + 4}" fill="${col}" font-weight="700">${lab}</text>`;
    let s = arrowDef('fr', C.red) + arrowDef('fb', C.blue) + arrowDef('fg', C.green) + `<polygon points="${x0},${y0} ${x1},${y0} ${x1},${y1}" fill="#efe4c9" stroke="${C.ink}" stroke-width="2"/>`;
    s += `<g transform="rotate(${-deg} ${bc[0]} ${bc[1]})"><rect x="${bc[0] - 22}" y="${bc[1] - 16}" width="44" height="32" fill="${C.gold}" stroke="${C.ink}"/></g>`;
    s += ar(bc[0], bc[1], 0, 60, C.red, 'mg', 'fr') + ar(bc[0], bc[1], nx * 50, ny * 50, C.blue, 'N', 'fb') + ar(bc[0], bc[1], -tx * 40, -ty * 40, C.green, 'Fтр', 'fg');
    s += `<text x="${x0 + 44}" y="${y0 - 6}">α</text>${moving ? `<text x="${cx - 40}" y="${cy + 46}" font-size="11" fill="${C.ink}">движение ↙</text>` : ''}`;
    return svg(280, 210, s);
  };
  V.lever = function (d1, d2) {
    const k = 200 / (d1 + d2), cx = 30 + d1 * k;
    return svg(280, 150, arrowDef('lv', C.red) + `<rect x="20" y="60" width="240" height="8" fill="#5a3d2b"/><polygon points="${cx},68 ${cx - 14},96 ${cx + 14},96" fill="${C.ink}"/>
<rect x="18" y="68" width="24" height="26" fill="${C.gold}" stroke="${C.ink}"/><text x="30" y="110" text-anchor="middle">груз</text>
<line x1="${30 + (d1 + d2) * k}" y1="20" x2="${30 + (d1 + d2) * k}" y2="58" stroke="${C.red}" stroke-width="2.5" marker-end="url(#lv)"/><text x="${30 + (d1 + d2) * k - 10}" y="16" fill="${C.red}">F</text>
<text x="${(30 + cx) / 2}" y="54" text-anchor="middle">${P.fmt(d1)} м</text><text x="${(cx + 30 + (d1 + d2) * k) / 2}" y="54" text-anchor="middle">${P.fmt(d2)} м</text>`);
  };
  V.res = (x, y, lab, vert) => vert ? `<rect x="${x - 8}" y="${y - 20}" width="16" height="40" fill="#fffdf8" stroke="${C.ink}" stroke-width="2"/><text x="${x + 14}" y="${y + 4}">${lab}</text>` : `<rect x="${x - 20}" y="${y - 8}" width="40" height="16" fill="#fffdf8" stroke="${C.ink}" stroke-width="2"/><text x="${x}" y="${y - 14}" text-anchor="middle">${lab}</text>`;
  V.circuit = function (R1, R2, R3) {
    const w = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C.ink}" stroke-width="2"/>`;
    const rv = (x, y, lab, left) => `<rect x="${x - 10}" y="${y - 14}" width="20" height="28" fill="#fffdf8" stroke="${C.ink}" stroke-width="2"/><text x="${left ? x - 16 : x + 16}" y="${y + 4}" text-anchor="${left ? 'end' : 'start'}">${lab}</text>`;
    let s = w(20, 40, 195, 40) + w(195, 40, 195, 70) + w(150, 70, 240, 70) + w(150, 130, 240, 130) + w(150, 70, 150, 130) + w(240, 70, 240, 130) + w(195, 130, 195, 160) + w(195, 160, 20, 160) + w(20, 40, 20, 88) + w(20, 106, 20, 160);
    s += `<rect x="60" y="30" width="44" height="20" fill="#fffdf8" stroke="${C.ink}" stroke-width="2"/><text x="82" y="22" text-anchor="middle">R₁ = ${R1}</text>`;
    s += rv(150, 100, 'R₂ = ' + R2, true) + rv(240, 100, 'R₃ = ' + R3, false);
    s += `<line x1="8" y1="90" x2="32" y2="90" stroke="${C.ink}" stroke-width="2"/><line x1="13" y1="104" x2="27" y2="104" stroke="${C.ink}" stroke-width="5"/><text x="38" y="102">U</text>`;
    s += `<circle cx="195" cy="70" r="3"/><circle cx="195" cy="130" r="3"/>`;
    return svg(300, 180, `<rect width="300" height="180" fill="#fffdf8"/>` + s);
  };
  V.lens = function (d, F) {
    const f = 1 / (1 / F - 1 / d), sc = 240 / (d + Math.min(Math.abs(f), 3 * F)), cx = 20 + d * sc, cy = 90, h = 40, hi = -h * f / d;
    const ix = cx + f * sc, iy = cy - hi; let s = arrowDef('ob', C.ink) + arrowDef('im', C.red);
    s += `<line x1="0" y1="${cy}" x2="300" y2="${cy}" stroke="${C.ax}" stroke-dasharray="5 4"/><line x1="${cx}" y1="15" x2="${cx}" y2="165" stroke="${C.blue}" stroke-width="3" marker-start="url(#ob)" marker-end="url(#ob)"/>`;
    s += `<circle cx="${cx - F * sc}" cy="${cy}" r="3"/><circle cx="${cx + F * sc}" cy="${cy}" r="3"/><text x="${cx - F * sc - 4}" y="${cy + 16}">F</text><text x="${cx + F * sc - 4}" y="${cy + 16}">F</text>`;
    s += `<line x1="20" y1="${cy}" x2="20" y2="${cy - h}" stroke="${C.ink}" stroke-width="3" marker-end="url(#ob)"/>`;
    const clip = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C.gold}" stroke-width="1.5"/>`;
    if (f > 0 && ix < 300) { s += clip(20, cy - h, cx, cy - h) + clip(cx, cy - h, ix, iy) + clip(20, cy - h, ix, iy) + `<line x1="${ix}" y1="${cy}" x2="${ix}" y2="${iy}" stroke="${C.red}" stroke-width="3" marker-end="url(#im)"/>`; }
    return svg(300, 180, `<rect width="300" height="180" fill="#fffdf8"/>` + s);
  };

  /* ===================== интерактивные модели тем ===================== */
  const VIZ = P.VIZ = {};
  const slider = (id, label, min, max, step, val) => `<div class="ctl"><label>${label} <b id="${id}v">${P.fmt(val)}</b></label><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"></div>`;
  P.slider = slider;
  const bind = (root, ids, fn) => { ids.forEach(id => { const el = root.querySelector('#' + id); el.addEventListener('input', () => { root.querySelector('#' + id + 'v').textContent = P.fmt(+el.value); fn(); }); }); fn(); };
  P.bind = bind;
  const val = (root, id) => +root.querySelector('#' + id).value;
  P.val = val;

  VIZ.graph = function (root) {
    const fams = { 'Линейная kx + b': ['k', 'b', x => 0], 'Парабола a(x−h)²+k': ['a', 'h', 'k'], 'Гипербола k/x': ['k'], 'Показательная aˣ': ['a'], 'Логарифм log_a x': ['a'], 'Синус A·sin(ωx)': ['A', 'ω'] };
    root.innerHTML = `<div class="chips" id="fam">${Object.keys(fams).map((f, i) => `<button class="chip${i ? '' : ' on'}" data-i="${i}">${f}</button>`).join('')}</div><div class="vizbox" id="gv"></div>
${slider('p1', 'a / k / A', -4, 4, .5, 1)}${slider('p2', 'b / h / ω', -4, 4, .5, 1)}${slider('p3', 'k (сдвиг вверх)', -4, 4, .5, 0)}<p class="small muted" id="gi"></p>`;
    let fi = 0;
    const draw = () => {
      const a = val(root, 'p1'), b = val(root, 'p2'), c = val(root, 'p3'); let f, info;
      switch (fi) {
        case 0: f = x => a * x + b + c; info = `y = ${P.fmt(a)}x + ${P.fmt(b + c)}. k — тангенс угла наклона, b — точка пересечения с Oy.`; break;
        case 1: f = x => a * (x - b) ** 2 + c; info = `Вершина (${P.fmt(b)}; ${P.fmt(c)}). a ${a > 0 ? '> 0 — ветви вверх' : a < 0 ? '< 0 — ветви вниз' : '= 0 — прямая'}.`; break;
        case 2: f = x => a / x + c; info = `y = ${P.fmt(a)}/x ${c ? '+ ' + P.fmt(c) : ''}. Асимптоты: x = 0 и y = ${P.fmt(c)}.`; break;
        case 3: { const A = Math.abs(a) || .5; f = x => A ** x + c; info = `Основание ${P.fmt(A)}: функция ${A > 1 ? 'возрастает' : A < 1 ? 'убывает' : 'постоянна'}.`; break; }
        case 4: { const A = Math.abs(a) === 1 || a === 0 ? 2 : Math.abs(a); f = x => (x > 0 ? Math.log(x) / Math.log(A) : NaN) + c; info = `log по основанию ${P.fmt(A)}. Область определения x > 0; график проходит через (1; ${P.fmt(c)}).`; break; }
        default: f = x => a * Math.sin(b * x) + c; info = `Амплитуда ${P.fmt(Math.abs(a))}, период 2π/|ω| ≈ ${b ? P.fmt(P.round(2 * Math.PI / Math.abs(b), 2)) : '∞'}.`;
      }
      root.querySelector('#gv').innerHTML = V.plot({ fns: [f], range: 6, size: 300 }); root.querySelector('#gi').textContent = info;
    };
    root.querySelector('#fam').addEventListener('click', e => { const bt = e.target.closest('button'); if (!bt) return; fi = +bt.dataset.i; P.$$('#fam .chip', root).forEach(x => x.classList.toggle('on', x === bt)); P.snd.play('toggle'); draw(); });
    bind(root, ['p1', 'p2', 'p3'], draw);
  };
  VIZ.circle = function (root) {
    root.innerHTML = `<div class="vizbox" id="cv"></div>${slider('ang', 'Угол α, градусы', 0, 360, 5, 30)}<div class="readout" id="cr"></div>`;
    bind(root, ['ang'], () => {
      const d = val(root, 'ang'), a = d * Math.PI / 180, cx = 150, cy = 150, R = 110, x = cx + R * Math.cos(a), y = cy - R * Math.sin(a);
      root.querySelector('#cv').innerHTML = svg(300, 300, `<rect width="300" height="300" fill="#fffdf8"/><line x1="10" y1="150" x2="290" y2="150" stroke="${C.ax}"/><line x1="150" y1="10" x2="150" y2="290" stroke="${C.ax}"/><circle cx="150" cy="150" r="110" fill="none" stroke="${C.ink}" stroke-width="2"/>
<path d="M${cx + 30} ${cy} A30 30 0 ${d > 180 ? 1 : 0} 0 ${cx + 30 * Math.cos(a)} ${cy - 30 * Math.sin(a)}" fill="none" stroke="${C.gold}" stroke-width="2"/>
<line x1="150" y1="150" x2="${x}" y2="${y}" stroke="${C.ink}" stroke-width="2"/><line x1="${x}" y1="${y}" x2="${x}" y2="150" stroke="${C.red}" stroke-width="3"/><line x1="150" y1="150" x2="${x}" y2="150" stroke="${C.blue}" stroke-width="3"/><circle cx="${x}" cy="${y}" r="6" fill="${C.red}"/>
<text x="${x > 150 ? x - 8 : x + 8}" y="${y < 150 ? y - 10 : y + 20}" text-anchor="${x > 150 ? 'end' : 'start'}">(cos α; sin α)</text><text x="270" y="166">1</text><text x="156" y="36">1</text>`);
      root.querySelector('#cr').innerHTML = `<div><span>α, рад</span>${P.fmt(P.round(a, 3))}</div><div><span style="color:#9cc3dd">cos α</span>${P.fmt(P.round(Math.cos(a), 3))}</div><div><span style="color:#f3b0a8">sin α</span>${P.fmt(P.round(Math.sin(a), 3))}</div><div><span>tg α</span>${Math.abs(Math.cos(a)) < 1e-9 ? '—' : P.fmt(P.round(Math.tan(a), 3))}</div><div><span>Четверть</span>${d % 90 === 0 ? 'на оси' : ['I', 'II', 'III', 'IV'][Math.floor((d % 360) / 90)]}</div>`;
    });
  };
  VIZ.deriv = function (root) {
    root.innerHTML = `<p class="small">f(x) = x³/3 − x² − 3x + 2 (кубическая парабола). Двигайте точку — касательная и значение f′(x₀) пересчитываются.</p><div class="vizbox" id="dv"></div>${slider('x0', 'x₀', -3, 5, .1, 0)}<div class="readout" id="dr"></div>`;
    const f = x => x ** 3 / 3 - x * x - 3 * x + 2, df = x => x * x - 2 * x - 3;
    bind(root, ['x0'], () => {
      const x0 = val(root, 'x0'), k = df(x0), y0 = f(x0), sc = 1 / 1.6, F = x => f(x) * sc, T = x => (y0 + k * (x - x0)) * sc;
      root.querySelector('#dv').innerHTML = V.plot({ fns: [F, T], pts: [[x0, y0 * sc]], range: 6 });
      root.querySelector('#dr').innerHTML = `<div><span>f′(x₀) = k касательной</span>${P.fmt(P.round(k, 3))}</div><div><span>f(x₀)</span>${P.fmt(P.round(y0, 3))}</div><div><span>Поведение</span>${Math.abs(k) < .05 ? 'экстремум (f′=0)' : k > 0 ? 'возрастает' : 'убывает'}</div><div><span>Экстремумы</span>max x=−1; min x=3</div>`;
    });
    root.insertAdjacentHTML('beforeend', '<p class="small muted">Масштаб по оси y сжат в 1,6 раза, чтобы график поместился.</p>');
  };
  VIZ.integral = function (root) {
    root.innerHTML = `<p class="small">Площадь под графиком f(x) = 0,5x² + 1 на [a; b] — это ∫f dx = F(b) − F(a), F(x) = x³/6 + x.</p><div class="vizbox" id="iv"></div>${slider('ia', 'a', -4, 4, .5, 0)}${slider('ib', 'b', -4, 4, .5, 2)}${slider('in', 'Число прямоугольников (приближение)', 2, 40, 1, 6)}<div class="readout" id="ir"></div>`;
    const f = x => .5 * x * x + 1, Fp = x => x ** 3 / 6 + x;
    bind(root, ['ia', 'ib', 'in'], () => {
      let a = val(root, 'ia'), b = val(root, 'ib'); const n = val(root, 'in'); if (b < a) [a, b] = [b, a];
      const size = 300, rg = 5, s = size / (2 * rg), X = x => size / 2 + x * s, Y = y => size / 2 - y * s; let rect = '', sum = 0, h = (b - a) / n;
      for (let i = 0; i < n; i++) { const xm = a + (i + .5) * h, y = f(xm); sum += y * h; rect += `<rect x="${X(a + i * h)}" y="${Y(y)}" width="${h * s}" height="${y * s}" fill="${C.gold}" opacity=".35" stroke="${C.gold}"/>`; }
      root.querySelector('#iv').innerHTML = V.plot({ fns: [f], range: rg }).replace('</svg>', rect + '</svg>');
      root.querySelector('#ir').innerHTML = `<div><span>Точно F(b)−F(a)</span>${P.fmt(P.round(Fp(b) - Fp(a), 4))}</div><div><span>Сумма прямоугольников</span>${P.fmt(P.round(sum, 4))}</div>`;
    });
  };
  VIZ.triangle = function (root) {
    root.innerHTML = `<p class="small">Перетаскивайте вершины пальцем. Сумма углов всегда 180°.</p><div class="vizbox"><svg id="tv" viewBox="0 0 300 260" width="300" height="260" style="touch-action:none"></svg></div><div class="readout" id="tr"></div>`;
    const pts = [[50, 210], [260, 210], [120, 50]], el = root.querySelector('#tv'); let drag = -1;
    const ang = (A, B, Cc) => { const u = [B[0] - A[0], B[1] - A[1]], v = [Cc[0] - A[0], Cc[1] - A[1]]; return Math.acos((u[0] * v[0] + u[1] * v[1]) / Math.hypot(...u) / Math.hypot(...v)) * 180 / Math.PI; };
    const draw = () => {
      const [A, B, Cc] = pts, a = Math.hypot(B[0] - Cc[0], B[1] - Cc[1]) / 20, b = Math.hypot(A[0] - Cc[0], A[1] - Cc[1]) / 20, c = Math.hypot(A[0] - B[0], A[1] - B[1]) / 20;
      const S = Math.abs((B[0] - A[0]) * (Cc[1] - A[1]) - (Cc[0] - A[0]) * (B[1] - A[1])) / 2 / 400, Rr = a * b * c / (4 * S);
      const D = 2 * (A[0] * (B[1] - Cc[1]) + B[0] * (Cc[1] - A[1]) + Cc[0] * (A[1] - B[1])), q = p => p[0] ** 2 + p[1] ** 2;
      const ux = (q(A) * (B[1] - Cc[1]) + q(B) * (Cc[1] - A[1]) + q(Cc) * (A[1] - B[1])) / D, uy = (q(A) * (Cc[0] - B[0]) + q(B) * (A[0] - Cc[0]) + q(Cc) * (B[0] - A[0])) / D;
      el.innerHTML = `<rect width="300" height="260" fill="#fffdf8"/><circle cx="${ux}" cy="${uy}" r="${Rr * 20}" fill="none" stroke="${C.blue}" stroke-dasharray="4 4"/><polygon points="${pts.join(' ')}" fill="#f6eedb" stroke="${C.ink}" stroke-width="2"/>${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="13" fill="${C.red}" opacity=".85"/><text x="${p[0]}" y="${p[1] + 4}" fill="#fff" text-anchor="middle" font-weight="700">${'ABC'[i]}</text>`).join('')}`;
      const aA = ang(A, B, Cc), aB = ang(B, A, Cc);
      root.querySelector('#tr').innerHTML = `<div><span>∠A</span>${P.fmt(P.round(aA, 1))}°</div><div><span>∠B</span>${P.fmt(P.round(aB, 1))}°</div><div><span>∠C</span>${P.fmt(P.round(180 - aA - aB, 1))}°</div><div><span>Стороны a, b, c</span>${[a, b, c].map(x => P.fmt(P.round(x, 1))).join('; ')}</div><div><span>Площадь</span>${P.fmt(P.round(S, 2))}</div><div><span>R описанной</span>${P.fmt(P.round(Rr, 2))}</div>`;
    };
    const pos = e => { const r = el.getBoundingClientRect(), t = e.touches ? e.touches[0] : e; return [(t.clientX - r.left) * 300 / r.width, (t.clientY - r.top) * 260 / r.height]; };
    const down = e => { const p = pos(e); drag = pts.findIndex(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < 30); if (drag >= 0) e.preventDefault(); };
    const move = e => { if (drag < 0) return; e.preventDefault(); const p = pos(e); pts[drag] = [P.clamp(p[0], 15, 285), P.clamp(p[1], 15, 245)]; draw(); };
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move); el.addEventListener('pointerup', () => drag = -1); el.addEventListener('pointercancel', () => drag = -1);
    draw();
  };
  VIZ.solid = function (root) {
    root.innerHTML = `<div class="chips" id="sk">${['Куб', 'Пирамида', 'Призма', 'Цилиндр', 'Конус', 'Сечение куба'].map((n, i) => `<button class="chip${i ? '' : ' on'}" data-i="${i}">${n}</button>`).join('')}</div><div class="lab"><canvas id="sc" height="300"></canvas></div><p class="small muted">Проведите пальцем по рисунку, чтобы вращать тело. Невидимые рёбра — пунктиром не выделяются (каркасная модель).</p><p class="small" id="si"></p>`;
    const cv = root.querySelector('#sc'), ctx = cv.getContext('2d'); let kind = 0, rx = -.45, ry = .6, last = null, raf = 0;
    const shapes = () => {
      const V0 = [], E = []; const add = (p) => V0.push(p) - 1, edge = (a, b) => E.push([a, b]);
      if (kind === 0 || kind === 5) { const c = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]; c.forEach(add); [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(e => edge(...e)); }
      else if (kind === 1) { [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1], [0, 1.2, 0]].forEach(add); [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [1, 4], [2, 4], [3, 4]].forEach(e => edge(...e)); }
      else if (kind === 2) { const t = [0, 1, 2].map(i => [Math.cos(i * 2.094) * 1.1, Math.sin(i * 2.094) * 1.1]); t.forEach(p => add([p[0], -1, p[1]])); t.forEach(p => add([p[0], 1, p[1]])); [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3], [0, 3], [1, 4], [2, 5]].forEach(e => edge(...e)); }
      else { const n = 28; for (let i = 0; i < n; i++) add([Math.cos(i / n * 6.283), -1, Math.sin(i / n * 6.283)]); for (let i = 0; i < n; i++) edge(i, (i + 1) % n);
        if (kind === 3) { for (let i = 0; i < n; i++) add([Math.cos(i / n * 6.283), 1, Math.sin(i / n * 6.283)]); for (let i = 0; i < n; i++) { edge(n + i, n + (i + 1) % n); if (i % 7 === 0) edge(i, n + i); } }
        else { const top = add([0, 1.3, 0]); for (let i = 0; i < n; i += 7) edge(i, top); } }
      return { V0, E };
    };
    const info = ['Куб: V = a³, диагональ a√3, площадь 6a².', 'Правильная четырёхугольная пирамида: V = ⅓Sh.', 'Правильная треугольная призма: V = S·h.', 'Цилиндр: V = πr²h, S_бок = 2πrh.', 'Конус: V = ⅓πr²h, S_бок = πrl.', 'Сечение куба плоскостью через середины трёх рёбер, выходящих из одной вершины, — правильный треугольник; через середины шести рёбер — правильный шестиугольник (показан).'];
    const draw = () => {
      const W = cv.clientWidth || 300; if (cv.width !== W * 2) { cv.width = W * 2; cv.height = 600; }
      ctx.setTransform(2, 0, 0, 2, 0, 0); ctx.clearRect(0, 0, W, 300);
      const { V0, E } = shapes(), s = Math.min(W, 300) * .28, cx = W / 2, cy = 150;
      const pr = p => { let [x, y, z] = p; let c = Math.cos(ry), sn = Math.sin(ry); [x, z] = [x * c + z * sn, -x * sn + z * c]; c = Math.cos(rx); sn = Math.sin(rx); [y, z] = [y * c - z * sn, y * sn + z * c]; const k = 4 / (4 + z); return [cx + x * s * k, cy - y * s * k, z]; };
      const Pp = V0.map(pr); ctx.lineWidth = 2; ctx.strokeStyle = C.ink;
      E.forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(...Pp[a].slice(0, 2)); ctx.lineTo(...Pp[b].slice(0, 2)); ctx.stroke(); });
      if (kind === 5) { const hx = [[0, -1, 1], [1, -1, 0], [1, 0, -1], [0, 1, -1], [-1, 1, 0], [-1, 0, 1]].map(pr); ctx.beginPath(); hx.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fillStyle = 'rgba(179,38,30,.35)'; ctx.fill(); ctx.strokeStyle = C.red; ctx.stroke(); }
      root.querySelector('#si').textContent = info[kind];
    };
    const ptr = e => (e.touches ? e.touches[0] : e);
    cv.addEventListener('pointerdown', e => { last = [e.clientX, e.clientY]; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => { if (!last) return; ry += (e.clientX - last[0]) * .01; rx += (e.clientY - last[1]) * .01; last = [e.clientX, e.clientY]; cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); });
    cv.addEventListener('pointerup', () => last = null);
    root.querySelector('#sk').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; kind = +b.dataset.i; P.$$('#sk .chip', root).forEach(x => x.classList.toggle('on', x === b)); draw(); });
    draw(); void ptr;
  };
  VIZ.vectors = function (root) {
    root.innerHTML = `<div class="vizbox" id="vv"></div>${slider('ax', 'aₓ', -5, 5, 1, 3)}${slider('ay', 'a_y', -5, 5, 1, 1)}${slider('bx', 'bₓ', -5, 5, 1, -1)}${slider('by', 'b_y', -5, 5, 1, 3)}<div class="readout" id="vr"></div>`;
    bind(root, ['ax', 'ay', 'bx', 'by'], () => {
      const a = [val(root, 'ax'), val(root, 'ay')], b = [val(root, 'bx'), val(root, 'by')], dot = a[0] * b[0] + a[1] * b[1], la = Math.hypot(...a), lb = Math.hypot(...b);
      root.querySelector('#vv').innerHTML = V.vecs([a, b], true);
      root.querySelector('#vr').innerHTML = `<div><span>a + b</span>(${a[0] + b[0]}; ${a[1] + b[1]})</div><div><span>|a|, |b|</span>${P.fmt(P.round(la, 3))}; ${P.fmt(P.round(lb, 3))}</div><div><span>a·b</span>${dot}</div><div><span>Угол</span>${la && lb ? P.fmt(P.round(Math.acos(P.clamp(dot / la / lb, -1, 1)) * 180 / Math.PI, 1)) + '°' : '—'}</div>`;
    });
  };
  VIZ.prob = function (root) {
    root.innerHTML = `<p class="small">Подбрасываем игральную кость. Частота события «выпало 6» приближается к вероятности 1/6 ≈ 0,167 при большом числе опытов (закон больших чисел).</p><div class="btns"><button class="btn sm" data-n="1">+1</button><button class="btn sm" data-n="10">+10</button><button class="btn sm" data-n="100">+100</button><button class="btn sm sec" data-n="0">Сброс</button></div><div class="vizbox" id="pv"></div><div class="readout" id="pr"></div>`;
    let cnt = [0, 0, 0, 0, 0, 0], hist = [];
    const draw = () => {
      const n = cnt.reduce((a, b) => a + b, 0), W = 300, H = 160, mx = Math.max(1, ...cnt); let b = '';
      cnt.forEach((c, i) => { const h = c / mx * 110; b += `<rect x="${20 + i * 46}" y="${130 - h}" width="34" height="${h}" fill="${i === 5 ? C.red : C.gold}"/><text x="${37 + i * 46}" y="148" text-anchor="middle">${i + 1}</text><text x="${37 + i * 46}" y="${124 - h}" text-anchor="middle" font-size="11">${c}</text>`; });
      let path = ''; hist.forEach((v, i) => { path += (i ? 'L' : 'M') + (10 + i * 280 / Math.max(1, hist.length - 1)) + ' ' + (300 - v * 600); });
      root.querySelector('#pv').innerHTML = svg(W, H, b) + svg(300, 200, `<rect width="300" height="200" fill="#fffdf8"/><line x1="0" y1="${300 - 600 / 6}" x2="300" y2="${300 - 600 / 6}" stroke="${C.blue}" stroke-dasharray="5 4"/><text x="4" y="${300 - 600 / 6 - 4}" font-size="11" fill="${C.blue}">1/6</text><path d="${path}" fill="none" stroke="${C.red}" stroke-width="2"/>`);
      root.querySelector('#pr').innerHTML = `<div><span>Опытов</span>${n}</div><div><span>Частота «6»</span>${n ? P.fmt(P.round(cnt[5] / n, 3)) : '—'}</div>`;
    };
    root.querySelector('.btns').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const k = +b.dataset.n; if (!k) { cnt = [0, 0, 0, 0, 0, 0]; hist = []; } for (let i = 0; i < k; i++) { cnt[Math.floor(Math.random() * 6)]++; const n = cnt.reduce((a, c) => a + c, 0); if (n % Math.max(1, Math.floor(n / 150)) === 0) hist.push(cnt[5] / n); } P.snd.play('key'); draw(); });
    draw();
  };
  VIZ.stats = function (root) {
    root.innerHTML = `<p class="small">Введите набор чисел через пробел или точку с запятой.</p><input class="txtin" id="sd" value="3 7 7 2 9 12 5 7 4"><div class="vizbox" id="sv"></div><div class="readout" id="sr"></div>`;
    const inp = root.querySelector('#sd');
    const draw = () => {
      const a = inp.value.replace(/,/g, '.').split(/[\s;]+/).map(Number).filter(x => isFinite(x)); if (!a.length) return;
      const n = a.length, mean = a.reduce((s, x) => s + x, 0) / n, srt = a.slice().sort((x, y) => x - y), med = n % 2 ? srt[(n - 1) / 2] : (srt[n / 2 - 1] + srt[n / 2]) / 2, D = a.reduce((s, x) => s + (x - mean) ** 2, 0) / n;
      const mn = srt[0], mx = srt[n - 1], W = 300, sc = x => 20 + (x - mn) / ((mx - mn) || 1) * 260; let b = `<line x1="20" y1="80" x2="280" y2="80" stroke="${C.ax}"/>`;
      const fr = {}; a.forEach(x => fr[x] = (fr[x] || 0) + 1); Object.entries(fr).forEach(([x, c]) => { for (let i = 0; i < c; i++) b += `<circle cx="${sc(+x)}" cy="${70 - i * 14}" r="6" fill="${C.gold}"/>`; });
      b += `<line x1="${sc(mean)}" y1="10" x2="${sc(mean)}" y2="90" stroke="${C.red}" stroke-width="2"/><text x="${sc(mean) + 3}" y="104" fill="${C.red}" font-size="11">среднее</text><line x1="${sc(med)}" y1="10" x2="${sc(med)}" y2="90" stroke="${C.blue}" stroke-width="2" stroke-dasharray="4 3"/><text x="${sc(med) + 3}" y="118" fill="${C.blue}" font-size="11">медиана</text>`;
      root.querySelector('#sv').innerHTML = svg(W, 125, b);
      root.querySelector('#sr').innerHTML = `<div><span>n</span>${n}</div><div><span>Среднее</span>${P.fmt(P.round(mean, 3))}</div><div><span>Медиана</span>${P.fmt(med)}</div><div><span>Размах</span>${P.fmt(mx - mn)}</div><div><span>Дисперсия</span>${P.fmt(P.round(D, 3))}</div><div><span>Ст. откл.</span>${P.fmt(P.round(Math.sqrt(D), 3))}</div>`;
    };
    inp.addEventListener('input', draw); draw();
  };
})();
