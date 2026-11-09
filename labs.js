/* ПРОЕКТ 200 — виртуальные лаборатории (Canvas, физически корректные модели) */
'use strict';
(function () {
  const S = P.slider, B = P.bind, V = P.val, f = (x, n = 2) => P.fmt(P.round(x, n));
  const COL = { ink: '#231a14', red: '#b3261e', gold: '#b8954a', blue: '#2b5d8a', green: '#2f6b3a', grid: '#e4d8bd', bg: '#fbf7ec' };
  function setup(cv, H) {
    const W = cv.clientWidth || 320, dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + 'px';
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.font = '13px -apple-system,DejaVu Sans,sans-serif'; return { c, W, H };
  }
  function arrow(c, x, y, dx, dy, col, lab) {
    const L = Math.hypot(dx, dy); if (L < 2) return; c.strokeStyle = c.fillStyle = col; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + dx, y + dy); c.stroke();
    const a = Math.atan2(dy, dx); c.beginPath(); c.moveTo(x + dx, y + dy); c.lineTo(x + dx - 10 * Math.cos(a - .4), y + dy - 10 * Math.sin(a - .4)); c.lineTo(x + dx - 10 * Math.cos(a + .4), y + dy - 10 * Math.sin(a + .4)); c.fill();
    if (lab) { c.font = 'bold 13px -apple-system,sans-serif'; c.fillText(lab, x + dx + 5 * Math.sign(dx || 1), y + dy + (dy > 0 ? 14 : -4)); }
  }
  const ro = (root, items) => { root.querySelector('.readout').innerHTML = items.map(([k, v]) => `<div><span>${k}</span>${v}</div>`).join(''); };
  const loop = fn => { let id = 0, last = performance.now(), alive = true; const st = t => { if (!alive) return; const dt = Math.min(.05, (t - last) / 1000); last = t; fn(dt); id = requestAnimationFrame(st); }; id = requestAnimationFrame(st); return () => { alive = false; cancelAnimationFrame(id); }; };
  const g0 = 9.8;
  const LABS = P.LABS = [];
  const L = (id, title, short, topic, init) => LABS.push({ id, title, short, topic, init });

  L('incline', 'Наклонная плоскость', 'Масса, угол, трение → силы и ускорение', 'p11', root => {
    root.innerHTML = `<div class="lab"><canvas height="260"></canvas></div>${S('m', 'Масса m, кг', .5, 10, .5, 2)}${S('al', 'Угол α, °', 0, 60, 1, 30)}${S('mu', 'Коэффициент трения μ', 0, 1, .01, .3)}<div class="btns"><button class="btn sm" id="go">▶ Отпустить брусок</button></div><div class="readout"></div><p class="small muted">Модель: g = 9,8 м/с², коэффициенты трения покоя и скольжения считаются равными, длина плоскости 2 м.</p>`;
    const cv = root.querySelector('canvas'); let s = 0, v = 0, run = false;
    const calc = () => { const m = V(root, 'm'), a = V(root, 'al') * Math.PI / 180, mu = V(root, 'mu'), N = m * g0 * Math.cos(a), Fd = m * g0 * Math.sin(a), still = Math.tan(a) <= mu + 1e-12, Ftr = still ? Fd : mu * N, acc = still ? 0 : g0 * (Math.sin(a) - mu * Math.cos(a)); return { m, a, mu, N, Fd, still, Ftr, acc }; };
    const draw = () => {
      const { c, W, H } = setup(cv, 260), k = calc(), Lp = Math.min(W - 40, 300), x0 = 20, y0 = H - 20, x1 = x0 + Lp * Math.cos(k.a), y1 = y0 - Lp * Math.sin(k.a);
      c.fillStyle = COL.bg; c.fillRect(0, 0, W, H); c.fillStyle = '#e6d8b5'; c.strokeStyle = COL.ink; c.lineWidth = 2; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y0); c.lineTo(x1, y1); c.closePath(); c.fill(); c.stroke();
      const pos = 1 - Math.min(1, s / 2), bx = x0 + (Lp * (.15 + .75 * pos)) * Math.cos(k.a), by = y0 - (Lp * (.15 + .75 * pos)) * Math.sin(k.a);
      c.save(); c.translate(bx, by); c.rotate(-k.a); c.fillStyle = COL.gold; c.fillRect(-22, -30, 44, 30); c.strokeRect(-22, -30, 44, 30); c.restore();
      const cx = bx - 15 * Math.sin(k.a), cy = by - 15 * Math.cos(k.a), sc = 60 / (k.m * g0);
      arrow(c, cx, cy, 0, k.m * g0 * sc, COL.red, 'mg'); arrow(c, cx, cy, -Math.sin(k.a) * k.N * sc, -Math.cos(k.a) * k.N * sc, COL.blue, 'N');
      arrow(c, cx, cy, Math.cos(k.a) * k.Ftr * sc, -Math.sin(k.a) * k.Ftr * sc, COL.green, 'Fтр');
      c.fillStyle = COL.ink; c.fillText('α = ' + V(root, 'al') + '°', x0 + 40, y0 - 6);
      ro(root, [['N = mg cos α', f(k.N) + ' Н'], ['mg sin α', f(k.Fd) + ' Н'], ['Fтр', f(k.Ftr) + ' Н' + (k.still ? ' (покоя)' : '')], ['Ускорение a', f(k.acc) + ' м/с²'], ['Состояние', k.still ? 'покой: tg α ≤ μ' : 'скольжение вниз'], ['Время спуска 2 м', k.still ? '—' : f(Math.sqrt(4 / k.acc)) + ' с'], ['Скорость', f(v) + ' м/с']]);
    };
    const stop = loop(dt => { if (run) { const k = calc(); v += k.acc * dt; s += v * dt; if (s >= 2 || k.still) { run = false; if (s >= 2) { s = 2; P.snd.play('term'); } } } draw(); });
    root.querySelector('#go').onclick = () => { s = 0; v = 0; run = true; P.snd.play('toggle'); };
    B(root, ['m', 'al', 'mu'], () => { s = 0; v = 0; run = false; });
    return stop;
  });

  L('newton', 'Законы Ньютона', 'Сила, масса, ускорение тележки и график v(t)', 'p8', root => {
    root.innerHTML = `<div class="lab"><canvas height="270"></canvas></div>${S('F', 'Сила тяги F, Н', 0, 20, .5, 6)}${S('m', 'Масса тележки m, кг', .5, 10, .5, 2)}${S('mu', 'Коэффициент трения μ', 0, .5, .01, .05)}<div class="btns"><button class="btn sm" id="go">▶ Пуск</button><button class="btn sm sec" id="rs">Сброс</button></div><div class="readout"></div><p class="small muted">Второй закон Ньютона: a = (F − μmg)/m. Если F ≤ μmg — тележка покоится (трение покоя уравновешивает тягу). Колёса тележки заменены коэффициентом сопротивления μ.</p>`;
    const cv = root.querySelector('canvas'); let x = 0, v = 0, t = 0, run = false, hist = [];
    const acc = () => { const F = V(root, 'F'), m = V(root, 'm'), mu = V(root, 'mu'), fr = mu * m * g0; return F > fr ? (F - fr) / m : (v > 0 ? -Math.min(fr - F, fr) / m : 0); };
    const draw = () => {
      const { c, W, H } = setup(cv, 270); c.fillStyle = COL.bg; c.fillRect(0, 0, W, H); const F = V(root, 'F'), m = V(root, 'm'), mu = V(root, 'mu');
      c.fillStyle = COL.ink; c.fillRect(0, 100, W, 3); const px = 30 + (x * 20) % (W - 80), w = 30 + m * 4;
      c.fillStyle = COL.red; c.fillRect(px, 100 - 34, w, 30); c.fillStyle = COL.ink; c.beginPath(); c.arc(px + 10, 96, 6, 0, 7); c.arc(px + w - 10, 96, 6, 0, 7); c.fill();
      arrow(c, px + w, 82, F * 4, 0, COL.blue, 'F'); const frd = v > 0 || F > mu * m * g0 ? mu * m * g0 : F; if (frd > 0) arrow(c, px, 90, -frd * 4, 0, COL.green, 'Fтр');
      const gx = 40, gy = H - 20, gw = W - 60, gh = 120; c.strokeStyle = COL.ink; c.lineWidth = 1; c.strokeRect(gx, gy - gh, gw, gh); c.fillStyle = COL.ink; c.fillText('v(t), м/с', gx + 4, gy - gh + 14); c.fillText('t', gx + gw - 10, gy - 4);
      const vm = Math.max(5, ...hist.map(h => h[1])), tm = Math.max(5, t); c.strokeStyle = COL.red; c.lineWidth = 2; c.beginPath(); hist.forEach(([tt, vv], i) => { const X = gx + tt / tm * gw, Y = gy - vv / vm * gh; i ? c.lineTo(X, Y) : c.moveTo(X, Y); }); c.stroke();
      ro(root, [['Ускорение a', f(acc(), 3) + ' м/с²'], ['Скорость v', f(v) + ' м/с'], ['Время t', f(t, 1) + ' с'], ['Путь', f(x) + ' м'], ['Импульс p = mv', f(m * v) + ' кг·м/с'], ['Сила трения', f(F > mu * m * g0 || v > 0 ? mu * m * g0 : F) + ' Н']]);
    };
    const stop = loop(dt => { if (run) { const a = acc(); v = Math.max(0, v + a * dt); x += v * dt; t += dt; hist.push([t, v]); if (hist.length > 600) hist.shift(); if (t > 20) run = false; } draw(); });
    root.querySelector('#go').onclick = () => { run = !run; P.snd.play('toggle'); };
    root.querySelector('#rs').onclick = () => { x = v = t = 0; hist = []; run = false; };
    B(root, ['F', 'm', 'mu'], () => { });
    return stop;
  });

  L('friction', 'Силы и трение', 'Тянем брусок под углом: трение покоя и скольжения', 'p9', root => {
    root.innerHTML = `<div class="lab"><canvas height="220"></canvas></div>${S('F', 'Сила тяги F, Н', 0, 40, .5, 10)}${S('be', 'Угол тяги к горизонту β, °', 0, 60, 1, 20)}${S('m', 'Масса m, кг', .5, 10, .5, 3)}${S('mu', 'Коэффициент трения μ', 0, 1, .01, .4)}<div class="readout"></div><p class="small muted">N = mg − F sin β; максимальная сила трения покоя μN. Если F cos β ≤ μN, брусок покоится и трение равно F cos β.</p>`;
    const cv = root.querySelector('canvas'); let x = 0, v = 0;
    const calc = () => { const F = V(root, 'F'), b = V(root, 'be') * Math.PI / 180, m = V(root, 'm'), mu = V(root, 'mu'), N = Math.max(0, m * g0 - F * Math.sin(b)), Fx = F * Math.cos(b), Fmax = mu * N, slide = Fx > Fmax + 1e-9, Ftr = slide ? Fmax : Fx, a = slide ? (Fx - Fmax) / m : 0; return { F, b, m, mu, N, Fx, Fmax, slide, Ftr, a, lift: F * Math.sin(b) > m * g0 }; };
    const stop = loop(dt => {
      const k = calc(); if (k.slide) { v += k.a * dt; x += v * dt; } else v = 0;
      const { c, W, H } = setup(cv, 220); c.fillStyle = COL.bg; c.fillRect(0, 0, W, H); c.fillStyle = COL.ink; c.fillRect(0, 160, W, 3);
      const bx = 40 + (x * 30) % (W - 140); c.fillStyle = COL.gold; c.fillRect(bx, 110, 70, 50); c.strokeRect(bx, 110, 70, 50);
      const cx = bx + 35, cy = 135, sc = 70 / Math.max(k.m * g0, k.F, 1);
      arrow(c, cx, cy, 0, k.m * g0 * sc, COL.red, 'mg'); arrow(c, cx, cy, 0, -k.N * sc, COL.blue, 'N'); arrow(c, cx + 35, cy - 10, k.F * Math.cos(k.b) * sc, -k.F * Math.sin(k.b) * sc, COL.ink, 'F'); arrow(c, cx - 35, 158, -k.Ftr * sc, 0, COL.green, 'Fтр');
      ro(root, [['N', f(k.N) + ' Н'], ['F cos β', f(k.Fx) + ' Н'], ['μN (макс. трение покоя)', f(k.Fmax) + ' Н'], ['Fтр', f(k.Ftr) + ' Н ' + (k.slide ? '(скольжения)' : '(покоя)')], ['Ускорение', f(k.a) + ' м/с²'], ['Состояние', k.lift ? 'отрыв от опоры!' : k.slide ? 'скользит' : 'покоится']]);
    });
    B(root, ['F', 'be', 'm', 'mu'], () => { v = 0; });
    return stop;
  });

  L('fall', 'Свободное падение', 'Падение на Земле, Луне и Марсе, стробоскоп', 'p6', root => {
    root.innerHTML = `<div class="chips" id="pl"><button class="chip on" data-g="9.8">Земля 9,8</button><button class="chip" data-g="1.6">Луна 1,6</button><button class="chip" data-g="3.7">Марс 3,7</button></div><div class="lab"><canvas height="320"></canvas></div>${S('h', 'Высота h, м', 1, 100, 1, 45)}<div class="btns"><button class="btn sm" id="go">▶ Бросить</button></div><div class="readout"></div><p class="small muted">Сопротивление воздуха не учитывается. Точки — положения тела через равные промежутки времени: расстояния растут как 1 : 3 : 5 : 7…</p>`;
    const cv = root.querySelector('canvas'); let g = 9.8, t = 0, run = false;
    root.querySelector('#pl').onclick = e => { const b = e.target.closest('button'); if (!b) return; g = +b.dataset.g; P.$$('#pl .chip', root).forEach(x => x.classList.toggle('on', x === b)); t = 0; run = false; };
    const stop = loop(dt => {
      const h = V(root, 'h'), T = Math.sqrt(2 * h / g); if (run) { t += dt; if (t >= T) { t = T; run = false; P.snd.play('term'); } }
      const { c, W, H } = setup(cv, 320), top = 20, bot = H - 20, sc = (bot - top) / h, y = top + g * t * t / 2 * sc;
      c.fillStyle = COL.bg; c.fillRect(0, 0, W, H); c.fillStyle = COL.ink; c.fillRect(0, bot, W, 3);
      for (let i = 0; i <= 10; i++) { const yy = top + i * (bot - top) / 10; c.fillRect(30, yy, 8, 1); c.fillText(f(h - i * h / 10, 0), 2, yy + 4); }
      const dtS = T / 8; c.fillStyle = 'rgba(179,38,30,.35)'; for (let k = 0; k * dtS <= t; k++) { c.beginPath(); c.arc(W / 2, top + g * (k * dtS) ** 2 / 2 * sc, 7, 0, 7); c.fill(); }
      c.fillStyle = COL.red; c.beginPath(); c.arc(W / 2, y, 10, 0, 7); c.fill(); if (t > 0) arrow(c, W / 2 + 18, y, 0, Math.min(80, g * t * 2), COL.blue, 'v');
      ro(root, [['Время падения √(2h/g)', f(T) + ' с'], ['Скорость у земли √(2gh)', f(Math.sqrt(2 * g * h)) + ' м/с'], ['t', f(t) + ' с'], ['v = gt', f(g * t) + ' м/с'], ['Пройдено gt²/2', f(g * t * t / 2) + ' м']]);
    });
    root.querySelector('#go').onclick = () => { t = 0; run = true; P.snd.play('toggle'); };
    B(root, ['h'], () => { t = 0; run = false; });
    return stop;
  });

  L('projectile', 'Движение тела, брошенного под углом', 'Траектория, дальность, высота подъёма', 'p6', root => {
    root.innerHTML = `<div class="lab"><canvas height="260"></canvas></div>${S('v0', 'Начальная скорость v₀, м/с', 1, 40, 1, 20)}${S('al', 'Угол α, °', 0, 90, 1, 45)}${S('h0', 'Начальная высота h₀, м', 0, 30, 1, 0)}<div class="btns"><button class="btn sm" id="go">▶ Бросок</button></div><div class="readout"></div><p class="small muted">x = v₀cos α·t; y = h₀ + v₀sin α·t − gt²/2 (g = 9,8 м/с², без сопротивления воздуха). При h₀ = 0 наибольшая дальность — при 45°.</p>`;
    const cv = root.querySelector('canvas'); let t = 0, run = false;
    const stop = loop(dt => {
      const v0 = V(root, 'v0'), a = V(root, 'al') * Math.PI / 180, h0 = V(root, 'h0'), vx = v0 * Math.cos(a), vy = v0 * Math.sin(a), T = (vy + Math.sqrt(vy * vy + 2 * g0 * h0)) / g0, Lr = vx * T, Hm = h0 + vy * vy / (2 * g0);
      if (run) { t += dt * 1.5; if (t >= T) { t = T; run = false; P.snd.play('term'); } }
      const { c, W, H } = setup(cv, 260), sx = (W - 40) / Math.max(Lr, 10, 165 * 0 + 10), sy = (H - 40) / Math.max(Hm, 10), s = Math.min(sx, sy), X = x => 20 + x * s, Y = y => H - 20 - y * s;
      c.fillStyle = COL.bg; c.fillRect(0, 0, W, H); c.fillStyle = COL.ink; c.fillRect(0, Y(0), W, 2);
      c.strokeStyle = COL.gold; c.setLineDash([5, 4]); c.beginPath(); for (let k = 0; k <= 60; k++) { const tt = T * k / 60; const px = X(vx * tt), py = Y(h0 + vy * tt - g0 * tt * tt / 2); k ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke(); c.setLineDash([]);
      const x = vx * t, y = h0 + vy * t - g0 * t * t / 2; c.fillStyle = COL.red; c.beginPath(); c.arc(X(x), Y(y), 8, 0, 7); c.fill();
      arrow(c, X(x), Y(y), vx * 2, 0, COL.blue, 'vₓ'); arrow(c, X(x), Y(y), 0, -(vy - g0 * t) * 2, COL.green, 'v_y');
      ro(root, [['Время полёта', f(T) + ' с'], ['Дальность', f(Lr) + ' м'], ['Макс. высота', f(Hm) + ' м'], ['vₓ (постоянна)', f(vx) + ' м/с'], ['v_y(t)', f(vy - g0 * t) + ' м/с'], ['|v|', f(Math.hypot(vx, vy - g0 * t)) + ' м/с']]);
    });
    root.querySelector('#go').onclick = () => { t = 0; run = true; P.snd.play('toggle'); };
    B(root, ['v0', 'al', 'h0'], () => { t = 0; run = false; });
    return stop;
  });

  L('collide', 'Столкновение тел', 'Упругий и неупругий удар: импульс и энергия', 'p17', root => {
    root.innerHTML = `<div class="chips" id="ty"><button class="chip on" data-t="e">Абсолютно упругий</button><button class="chip" data-t="i">Абсолютно неупругий</button></div><div class="lab"><canvas height="170"></canvas></div>${S('m1', 'm₁, кг', .5, 10, .5, 2)}${S('m2', 'm₂, кг', .5, 10, .5, 1)}${S('v1', 'v₁, м/с', -6, 6, .5, 3)}${S('v2', 'v₂, м/с', -6, 6, .5, -1)}<div class="btns"><button class="btn sm" id="go">▶ Столкнуть</button></div><div class="readout"></div>`;
    const cv = root.querySelector('canvas'); let ty = 'e', x1 = 0, x2 = 0, u1 = 0, u2 = 0, hit = false, run = false;
    const after = () => { const m1 = V(root, 'm1'), m2 = V(root, 'm2'), v1 = V(root, 'v1'), v2 = V(root, 'v2'); if (ty === 'i') { const u = (m1 * v1 + m2 * v2) / (m1 + m2); return [u, u]; } return [((m1 - m2) * v1 + 2 * m2 * v2) / (m1 + m2), ((m2 - m1) * v2 + 2 * m1 * v1) / (m1 + m2)]; };
    const reset = () => { x1 = -3; x2 = 3; u1 = V(root, 'v1'); u2 = V(root, 'v2'); hit = false; run = false; };
    root.querySelector('#ty').onclick = e => { const b = e.target.closest('button'); if (!b) return; ty = b.dataset.t; P.$$('#ty .chip', root).forEach(x => x.classList.toggle('on', x === b)); reset(); };
    const stop = loop(dt => {
      const m1 = V(root, 'm1'), m2 = V(root, 'm2'), r1 = .3 + m1 * .04, r2 = .3 + m2 * .04;
      if (run) { x1 += u1 * dt; x2 += u2 * dt; if (!hit && x2 - x1 <= r1 + r2 && u1 - u2 > 0) { [u1, u2] = after(); hit = true; P.snd.play('key'); } if (Math.abs(x1) > 8 || Math.abs(x2) > 8) run = false; }
      const { c, W, H } = setup(cv, 170), s = W / 16, X = x => W / 2 + x * s; c.fillStyle = COL.bg; c.fillRect(0, 0, W, H); c.fillStyle = COL.ink; c.fillRect(0, 120, W, 2);
      c.fillStyle = COL.red; c.fillRect(X(x1) - r1 * s, 120 - 2 * r1 * s, 2 * r1 * s, 2 * r1 * s); c.fillStyle = COL.blue; c.fillRect(X(x2) - r2 * s, 120 - 2 * r2 * s, 2 * r2 * s, 2 * r2 * s);
      arrow(c, X(x1), 50, u1 * 10, 0, COL.red, 'v₁'); arrow(c, X(x2), 30, u2 * 10, 0, COL.blue, 'v₂');
      const v1 = V(root, 'v1'), v2 = V(root, 'v2'), [a1, a2] = after(), p0 = m1 * v1 + m2 * v2, p1 = m1 * a1 + m2 * a2, E0 = m1 * v1 * v1 / 2 + m2 * v2 * v2 / 2, E1 = m1 * a1 * a1 / 2 + m2 * a2 * a2 / 2;
      ro(root, [['v₁′ после', f(a1) + ' м/с'], ['v₂′ после', f(a2) + ' м/с'], ['Импульс до / после', f(p0) + ' / ' + f(p1)], ['Eк до / после', f(E0) + ' / ' + f(E1) + ' Дж'], ['Перешло в тепло', f(E0 - E1) + ' Дж'], ['Сближаются?', v1 - v2 > 0 ? 'да' : 'нет — удара не будет']]);
    });
    root.querySelector('#go').onclick = () => { reset(); run = true; P.snd.play('toggle'); };
    B(root, ['m1', 'm2', 'v1', 'v2'], reset);
    return stop;
  });

  L('ohm', 'Закон Ома', 'Напряжение, сопротивление, сила тока, вольт-амперная характеристика', 'p23', root => {
    root.innerHTML = `<div class="lab"><canvas height="300"></canvas></div>${S('U', 'Напряжение U, В', 0, 24, .5, 12)}${S('R', 'Сопротивление R, Ом', 1, 100, 1, 20)}<div class="readout"></div><p class="small muted">I = U/R. График I(U) для резистора — прямая; чем больше R, тем положе прямая.</p>`;
    const cv = root.querySelector('canvas'); let ph = 0;
    const stop = loop(dt => {
      const U = V(root, 'U'), R = V(root, 'R'), I = U / R; ph += I * dt * 3;
      const { c, W, H } = setup(cv, 300); c.fillStyle = COL.bg; c.fillRect(0, 0, W, H);
      c.strokeStyle = COL.ink; c.lineWidth = 2; c.strokeRect(30, 20, W - 60, 90); c.fillStyle = COL.bg; c.fillRect(W / 2 - 30, 12, 60, 16); c.strokeRect(W / 2 - 30, 12, 60, 16); c.fillStyle = COL.ink; c.fillText('R = ' + R + ' Ом', W / 2 - 28, 10);
      c.fillRect(24, 55, 12, 2); c.fillRect(27, 65, 6, 4); c.fillText('U', 40, 66);
      c.fillStyle = '#ffd27a'; const per = 2 * (W - 60) + 180; for (let k = 0; k < 14; k++) { let d = ((k / 14) * per + ph * 40) % per, x, y; if (d < W - 60) { x = 30 + d; y = 20; } else if (d < W - 60 + 90) { x = W - 30; y = 20 + d - (W - 60); } else if (d < 2 * (W - 60) + 90) { x = W - 30 - (d - (W - 60) - 90); y = 110; } else { x = 30; y = 110 - (d - 2 * (W - 60) - 90); } c.beginPath(); c.arc(x, y, 3.5, 0, 7); c.fill(); }
      const gx = 50, gy = H - 25, gw = W - 80, gh = 140; c.strokeStyle = COL.ink; c.lineWidth = 1; c.strokeRect(gx, gy - gh, gw, gh); c.fillStyle = COL.ink; c.fillText('I, А', gx + 4, gy - gh + 14); c.fillText('U, В', gx + gw - 30, gy - 4);
      c.strokeStyle = COL.red; c.lineWidth = 2; c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx + gw, gy - Math.min(1, (24 / R) / 2.4) * gh); c.stroke();
      c.fillStyle = COL.red; c.beginPath(); c.arc(gx + U / 24 * gw, gy - Math.min(1, I / 2.4) * gh, 5, 0, 7); c.fill();
      ro(root, [['Сила тока I = U/R', f(I, 3) + ' А'], ['Мощность P = UI', f(U * I) + ' Вт'], ['Теплота за 1 мин', f(U * I * 60, 0) + ' Дж'], ['Проводимость 1/R', f(1 / R, 3) + ' См']]);
    });
    B(root, ['U', 'R'], () => { });
    return stop;
  });

  L('circuit', 'Электрические цепи', 'Последовательное, параллельное и смешанное соединение', 'p24', root => {
    root.innerHTML = `<div class="chips" id="md"><button class="chip on" data-m="s">Последовательно</button><button class="chip" data-m="p">Параллельно</button><button class="chip" data-m="x">R₁ + (R₂ ∥ R₃)</button></div><div class="lab"><canvas height="230"></canvas></div>${S('U', 'Напряжение U, В', 1, 36, 1, 12)}${S('r1', 'R₁, Ом', 1, 50, 1, 6)}${S('r2', 'R₂, Ом', 1, 50, 1, 3)}${S('r3', 'R₃, Ом', 1, 50, 1, 6)}<div class="readout"></div>`;
    const cv = root.querySelector('canvas'); let md = 's';
    root.querySelector('#md').onclick = e => { const b = e.target.closest('button'); if (!b) return; md = b.dataset.m; P.$$('#md .chip', root).forEach(x => x.classList.toggle('on', x === b)); draw(); };
    const solve = () => {
      const U = V(root, 'U'), R = [V(root, 'r1'), V(root, 'r2'), V(root, 'r3')]; let Rt, I = [], Uu = [];
      if (md === 's') { Rt = R[0] + R[1] + R[2]; const i = U / Rt; I = [i, i, i]; Uu = R.map(r => i * r); }
      else if (md === 'p') { Rt = 1 / (1 / R[0] + 1 / R[1] + 1 / R[2]); Uu = [U, U, U]; I = R.map(r => U / r); }
      else { const R23 = R[1] * R[2] / (R[1] + R[2]); Rt = R[0] + R23; const i = U / Rt, u23 = i * R23; I = [i, u23 / R[1], u23 / R[2]]; Uu = [i * R[0], u23, u23]; }
      return { U, R, Rt, I, Uu };
    };
    const draw = () => {
      const { c, W, H } = setup(cv, 230), k = solve(); c.fillStyle = COL.bg; c.fillRect(0, 0, W, H); c.strokeStyle = COL.ink; c.lineWidth = 2; c.font = '12px -apple-system,sans-serif';
      const res = (x, y, i, vert) => { c.fillStyle = '#fffdf8'; vert ? (c.fillRect(x - 9, y - 18, 18, 36), c.strokeRect(x - 9, y - 18, 18, 36)) : (c.fillRect(x - 20, y - 9, 40, 18), c.strokeRect(x - 20, y - 9, 40, 18)); c.fillStyle = COL.ink; const lab = `R${i + 1}: ${f(k.I[i])} А, ${f(k.Uu[i])} В`; if (vert) { const right = x > W - 120; c.textAlign = right ? 'right' : 'left'; c.fillText(lab, right ? x - 13 : x + 13, y + 4); c.textAlign = 'left'; } else c.fillText(lab, x - 40, y - 13); };
      const ln = (a, b, cc, d) => { c.beginPath(); c.moveTo(a, b); c.lineTo(cc, d); c.stroke(); };
      ln(20, 30, 20, 200); ln(20, 200, W - 20, 200); c.fillStyle = COL.ink; c.fillRect(10, 105, 20, 3); c.fillRect(14, 114, 12, 5); c.fillText('U', 32, 118);
      if (md === 's') { ln(20, 30, W - 20, 30); ln(W - 20, 30, W - 20, 200); res(W * .25, 30, 0); res(W * .55, 30, 1); res(W - 20, 115, 2, true); }
      else if (md === 'p') { ln(20, 30, W - 20, 30); [.35, .6, .85].forEach((p, i) => { ln(W * p, 30, W * p, 200); res(W * p, 115, i, true); }); }
      else { ln(20, 30, W * .5, 30); res(W * .3, 30, 0); ln(W * .5, 30, W * .5, 200); ln(W * .5, 60, W * .85, 60); ln(W * .85, 60, W * .85, 170); ln(W * .5, 170, W * .85, 170); res(W * .5, 115, 1, true); res(W * .85, 115, 2, true); }
      ro(root, [['Общее сопротивление', f(k.Rt) + ' Ом'], ['Общий ток', f(k.U / k.Rt) + ' А'], ['Общая мощность', f(k.U * k.U / k.Rt) + ' Вт'], ...k.R.map((r, i) => ['P' + (i + 1), f(k.I[i] * k.Uu[i]) + ' Вт'])]);
    };
    B(root, ['U', 'r1', 'r2', 'r3'], draw);
    window.addEventListener('resize', draw); return () => window.removeEventListener('resize', draw);
  });

  L('pendulum', 'Маятник', 'Математический маятник: период, энергия, большие амплитуды', 'p18', root => {
    root.innerHTML = `<div class="lab"><canvas height="280"></canvas></div>${S('l', 'Длина нити l, м', .1, 3, .05, 1)}${S('th', 'Начальный угол θ₀, °', 2, 80, 1, 15)}${S('gg', 'g, м/с²', 1, 25, .1, 9.8)}${S('dm', 'Затухание (сопротивление)', 0, .5, .01, 0)}<div class="btns"><button class="btn sm" id="go">↺ Перезапуск</button></div><div class="readout"></div><p class="small muted">Модель решает точное уравнение θ″ = −(g/l)·sin θ методом Рунге — Кутты. Формула T = 2π√(l/g) верна при малых углах; сравните с измеренным периодом при больших амплитудах.</p>`;
    const cv = root.querySelector('canvas'); let th = 0, w = 0, t = 0, lastCross = null, Tm = 0, prev = 0;
    const reset = () => { th = V(root, 'th') * Math.PI / 180; w = 0; t = 0; lastCross = null; Tm = 0; prev = th; };
    const stop = loop(dt => {
      const l = V(root, 'l'), g = V(root, 'gg'), dm = V(root, 'dm'), F = (a, b) => -g / l * Math.sin(a) - dm * b, n = 8, h = dt / n;
      for (let i = 0; i < n; i++) { const k1a = w, k1b = F(th, w), k2a = w + h / 2 * k1b, k2b = F(th + h / 2 * k1a, w + h / 2 * k1b), k3a = w + h / 2 * k2b, k3b = F(th + h / 2 * k2a, w + h / 2 * k2b), k4a = w + h * k3b, k4b = F(th + h * k3a, w + h * k3b);
        th += h / 6 * (k1a + 2 * k2a + 2 * k3a + k4a); w += h / 6 * (k1b + 2 * k2b + 2 * k3b + k4b); t += h;
        if (prev < 0 && th >= 0 && w > 0) { if (lastCross !== null) Tm = t - lastCross; lastCross = t; } prev = th; }
      const { c, W, H } = setup(cv, 280), px = W / 2, py = 20, Lp = 220 * Math.min(1, l / 3) + 20, bx = px + Lp * Math.sin(th), by = py + Lp * Math.cos(th);
      c.fillStyle = COL.bg; c.fillRect(0, 0, W, H); c.fillStyle = COL.ink; c.fillRect(px - 40, 14, 80, 6); c.strokeStyle = COL.ink; c.lineWidth = 1.5; c.beginPath(); c.moveTo(px, py); c.lineTo(bx, by); c.stroke();
      c.setLineDash([3, 4]); c.beginPath(); c.moveTo(px, py); c.lineTo(px, py + Lp + 20); c.stroke(); c.setLineDash([]);
      c.fillStyle = COL.red; c.beginPath(); c.arc(bx, by, 14, 0, 7); c.fill();
      const Ek = .5 * (l * w) ** 2, Ep = g * l * (1 - Math.cos(th)), E = Ek + Ep || 1; c.fillStyle = COL.blue; c.fillRect(W - 50, H - 20 - Ek / E * 100, 14, Ek / E * 100); c.fillStyle = COL.gold; c.fillRect(W - 30, H - 20 - Ep / E * 100, 14, Ep / E * 100); c.fillStyle = COL.ink; c.fillText('Eк Eп', W - 54, H - 6);
      ro(root, [['T = 2π√(l/g)', f(2 * Math.PI * Math.sqrt(l / g), 3) + ' с'], ['T измеренный', Tm ? f(Tm, 3) + ' с' : 'измеряется…'], ['Частота ν = 1/T', f(1 / (2 * Math.PI * Math.sqrt(l / g)), 3) + ' Гц'], ['Угол θ', f(th * 180 / Math.PI, 1) + '°'], ['Скорость груза', f(Math.abs(w * l)) + ' м/с']]);
    });
    root.querySelector('#go').onclick = () => { reset(); P.snd.play('toggle'); };
    B(root, ['l', 'th', 'gg', 'dm'], reset);
    return stop;
  });

  L('waves', 'Механические волны', 'Амплитуда, частота, скорость → длина волны', 'p19', root => {
    root.innerHTML = `<div class="chips" id="wt"><button class="chip on" data-t="t">Поперечная</button><button class="chip" data-t="l">Продольная</button></div><div class="lab"><canvas height="220"></canvas></div>${S('A', 'Амплитуда A, см', 1, 4, .1, 2)}${S('nu', 'Частота ν, Гц', .2, 2, .05, .5)}${S('v', 'Скорость волны v, м/с', .5, 4, .1, 2)}<div class="readout"></div><p class="small muted">λ = v/ν. Красная частица колеблется на месте — волна переносит энергию, а не вещество. Шкала по горизонтали: 10 м на ширину экрана.</p>`;
    const cv = root.querySelector('canvas'); let t = 0, ty = 't';
    root.querySelector('#wt').onclick = e => { const b = e.target.closest('button'); if (!b) return; ty = b.dataset.t; P.$$('#wt .chip', root).forEach(x => x.classList.toggle('on', x === b)); };
    const stop = loop(dt => {
      t += dt; const A = V(root, 'A'), nu = V(root, 'nu'), v = V(root, 'v'), lam = v / nu, { c, W, H } = setup(cv, 220), sx = W / 10, mid = H / 2;
      c.fillStyle = COL.bg; c.fillRect(0, 0, W, H); c.strokeStyle = COL.grid; c.beginPath(); c.moveTo(0, mid); c.lineTo(W, mid); c.stroke();
      const ph = x => 2 * Math.PI * (nu * t - x / lam);
      if (ty === 't') { c.strokeStyle = COL.blue; c.lineWidth = 2; c.beginPath(); for (let px = 0; px <= W; px += 3) { const x = px / sx, y = mid - A * 15 * Math.sin(ph(x)) * (x <= v * t ? 1 : 0); px ? c.lineTo(px, y) : c.moveTo(px, y); } c.stroke();
        for (let k = 0; k <= 40; k++) { const x = k / 4, y = mid - A * 15 * Math.sin(ph(x)) * (x <= v * t ? 1 : 0); c.fillStyle = k === 12 ? COL.red : COL.ink; c.beginPath(); c.arc(x * sx, y, k === 12 ? 6 : 2.5, 0, 7); c.fill(); } }
      else { for (let k = 0; k <= 80; k++) { const x0 = k / 8, dx = (x0 <= v * t ? 1 : 0) * A * .08 * Math.sin(ph(x0)); c.strokeStyle = k === 24 ? COL.red : COL.ink; c.lineWidth = k === 24 ? 3 : 1.5; c.beginPath(); c.moveTo((x0 + dx) * sx, mid - 50); c.lineTo((x0 + dx) * sx, mid + 50); c.stroke(); } }
      c.fillStyle = COL.gold; c.fillRect(0, H - 14, lam * sx, 4); c.fillStyle = COL.ink; c.fillText('λ = ' + f(lam) + ' м', 4, H - 18);
      ro(root, [['Длина волны λ = v/ν', f(lam) + ' м'], ['Период T = 1/ν', f(1 / nu) + ' с'], ['Циклическая частота ω', f(2 * Math.PI * nu) + ' рад/с'], ['Макс. скорость частицы Aω', f(A / 100 * 2 * Math.PI * nu, 3) + ' м/с']]);
    });
    B(root, ['A', 'nu', 'v'], () => { t = 0; });
    return stop;
  });

  L('optics', 'Геометрическая оптика', 'Тонкая линза и закон преломления', 'p27', root => {
    root.innerHTML = `<div class="chips" id="om"><button class="chip on" data-m="lens">Тонкая линза</button><button class="chip" data-m="refr">Преломление</button></div><div class="lab"><canvas height="260"></canvas></div><div id="oc"></div><div class="readout"></div>`;
    const cv = root.querySelector('canvas'), oc = root.querySelector('#oc'); let md = 'lens';
    const ctls = () => { oc.innerHTML = md === 'lens' ? S('F', 'Фокусное расстояние F, см (− — рассеивающая)', -30, 30, 1, 10) + S('d', 'Расстояние до предмета d, см', 2, 60, 1, 25) + S('hh', 'Высота предмета, см', 1, 6, .5, 3) : S('n1', 'n₁ (первая среда)', 1, 2.4, .01, 1) + S('n2', 'n₂ (вторая среда)', 1, 2.4, .01, 1.5) + S('a', 'Угол падения α, °', 0, 89, 1, 40); B(root, md === 'lens' ? ['F', 'd', 'hh'] : ['n1', 'n2', 'a'], draw); };
    root.querySelector('#om').onclick = e => { const b = e.target.closest('button'); if (!b) return; md = b.dataset.m; P.$$('#om .chip', root).forEach(x => x.classList.toggle('on', x === b)); ctls(); };
    function draw() {
      const { c, W, H } = setup(cv, 260); c.fillStyle = COL.bg; c.fillRect(0, 0, W, H); const ln = (a, b, cc, d, col, w = 1.5) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(a, b); c.lineTo(cc, d); c.stroke(); };
      if (md === 'lens') {
        let F = V(root, 'F'); if (F === 0) F = 1; const d = V(root, 'd'), h = V(root, 'hh'), fi = 1 / (1 / F - 1 / d), G = fi / d, sc = W / 140, cx = W * .45, cy = H / 2, X = x => cx + x * sc, Y = y => cy - y * sc * 1.6;
        ln(0, cy, W, cy, COL.ink, 1); ln(cx, 10, cx, H - 10, COL.blue, 3); c.fillStyle = COL.blue; c.fillText(F > 0 ? 'собирающая' : 'рассеивающая', cx + 4, 16);
        [-F, F].forEach(x => { c.fillStyle = COL.ink; c.beginPath(); c.arc(X(x), cy, 3, 0, 7); c.fill(); c.fillText('F', X(x) - 3, cy + 15); });
        const ox = X(-d), oy = Y(h); arrow(c, ox, cy, 0, oy - cy, COL.ink, '');
        const ix = X(fi), iy = Y(-G * h);
        const far = (x, y, dx, dy, col) => { const k = 3 * W / Math.hypot(dx, dy); ln(x, y, x + dx * k, y + dy * k, col); };
        const sg = Math.sign(F);
        ln(ox, oy, cx, oy, COL.gold); far(cx, oy, sg * F * sc, sg * (cy - oy), COL.gold); // параллельный луч → через фокус
        far(ox, oy, cx - ox, cy - oy, COL.gold); // луч через оптический центр не преломляется
        if (isFinite(fi) && fi < 0) { c.setLineDash([4, 4]); ln(cx, oy, ix, iy, COL.red, 1); ln(cx, cy, ix, iy, COL.red, 1); c.setLineDash([]); }
        if (isFinite(fi) && Math.abs(fi) < 500) arrow(c, ix, cy, 0, iy - cy, COL.red, '');
        ro(root, [['f = 1/(1/F − 1/d)', isFinite(fi) ? f(fi, 1) + ' см' : '∞ (d = F)'], ['Увеличение Γ = |f|/d', f(Math.abs(G)) ], ['Изображение', !isFinite(fi) || Math.abs(fi) > 1e5 ? 'не образуется' : (fi > 0 ? 'действительное, перевёрнутое' : 'мнимое, прямое') + (Math.abs(G) > 1 ? ', увеличенное' : Math.abs(G) < 1 ? ', уменьшенное' : ', равное')], ['Оптическая сила D', f(100 / F) + ' дптр']]);
      } else {
        const n1 = V(root, 'n1'), n2 = V(root, 'n2'), a = V(root, 'a') * Math.PI / 180, sb = n1 * Math.sin(a) / n2, cx = W / 2, cy = H / 2, R = 120;
        c.fillStyle = `rgba(43,93,138,${(n1 - 1) / 2})`; c.fillRect(0, 0, W, cy); c.fillStyle = `rgba(43,93,138,${(n2 - 1) / 2})`; c.fillRect(0, cy, W, cy);
        ln(0, cy, W, cy, COL.ink, 1); c.setLineDash([4, 4]); ln(cx, 10, cx, H - 10, COL.ink, 1); c.setLineDash([]);
        ln(cx - R * Math.sin(a), cy - R * Math.cos(a), cx, cy, COL.red, 3); ln(cx, cy, cx + R * Math.sin(a), cy - R * Math.cos(a), sb > 1 ? COL.red : 'rgba(179,38,30,.35)', sb > 1 ? 3 : 1.5);
        if (sb <= 1) { const b = Math.asin(sb); ln(cx, cy, cx + R * Math.sin(b), cy + R * Math.cos(b), COL.red, 3); }
        c.fillStyle = COL.ink; c.fillText('n₁ = ' + f(n1), 8, 18); c.fillText('n₂ = ' + f(n2), 8, H - 8);
        ro(root, [['sin β = n₁sin α/n₂', sb > 1 ? '> 1' : f(sb, 3)], ['Угол преломления β', sb > 1 ? '—' : f(Math.asin(sb) * 180 / Math.PI, 1) + '°'], ['Предельный угол', n1 > n2 ? f(Math.asin(n2 / n1) * 180 / Math.PI, 1) + '°' : 'нет (n₁ ≤ n₂)'], ['Явление', sb > 1 ? 'полное внутреннее отражение' : 'преломление + частичное отражение']]);
      }
    }
    ctls(); window.addEventListener('resize', draw); return () => window.removeEventListener('resize', draw);
  });

  L('gas', 'Движение молекул (идеальный газ)', 'Температура, объём, давление — модель МКТ', 'p20', root => {
    root.innerHTML = `<div class="lab"><canvas height="240"></canvas></div>${S('T', 'Температура T, К', 50, 1000, 10, 300)}${S('Vw', 'Объём (ширина сосуда), %', 30, 100, 1, 100)}${S('N', 'Число молекул', 10, 200, 10, 80)}<div class="readout"></div><p class="small muted">Молекулы движутся хаотично и упруго ударяются о стенки (взаимодействие между ними не учитывается — модель идеального газа). Давление измеряется по импульсу, переданному стенкам. Средняя скорость ~ √T, поэтому pV/(NT) остаётся примерно постоянным.</p>`;
    const cv = root.querySelector('canvas'); let mol = [], imp = 0, tacc = 0, pMeas = 0;
    const init = () => { const n = V(root, 'N'); mol = Array.from({ length: n }, () => { const a = Math.random() * 6.283; return { x: Math.random(), y: Math.random(), a, s: .6 + Math.random() * .8 }; }); imp = 0; tacc = 0; pMeas = 0; };
    const stop = loop(dt => {
      const T = V(root, 'T'), vw = V(root, 'Vw') / 100, { c, W, H } = setup(cv, 240), bw = (W - 20) * vw, bh = H - 20, vs = Math.sqrt(T / 300) * .5;
      c.fillStyle = COL.bg; c.fillRect(0, 0, W, H); c.strokeStyle = COL.ink; c.lineWidth = 3; c.strokeRect(10, 10, bw, bh); c.fillStyle = '#d8c9a8'; c.fillRect(10 + bw, 10, 12, bh);
      const ar = bw / bh;
      mol.forEach(m => { const vx = Math.cos(m.a) * m.s * vs, vy = Math.sin(m.a) * m.s * vs; m.x += vx * dt / ar; m.y += vy * dt;
        if (m.x < 0) { m.x = -m.x; m.a = Math.PI - m.a; imp += 2 * Math.abs(vx); } if (m.x > 1) { m.x = 2 - m.x; m.a = Math.PI - m.a; imp += 2 * Math.abs(vx); }
        if (m.y < 0) { m.y = -m.y; m.a = -m.a; imp += 2 * Math.abs(vy); } if (m.y > 1) { m.y = 2 - m.y; m.a = -m.a; imp += 2 * Math.abs(vy); }
        if (m.x > 1) m.x = 1; c.fillStyle = `hsl(${P.clamp(240 - m.s * vs * 200, 0, 240)},70%,45%)`; c.beginPath(); c.arc(10 + m.x * bw, 10 + m.y * bh, 3.5, 0, 7); c.fill(); });
      tacc += dt; if (tacc > 1) { const per = 2 * (ar + 1); pMeas = imp / tacc / per; imp = 0; tacc = 0; }
      ro(root, [['Средняя скорость ~ √T', f(Math.sqrt(T / 300), 3) + '·v₃₀₀'], ['Давление (отн. ед.)', f(pMeas * 100, 2)], ['pV/(N·T)·10⁴', pMeas ? f(pMeas * 100 * vw / mol.length / T * 1e4, 2) : '…'], ['Средняя Eк молекулы', f(1.5 * 1.38e-23 * T * 1e21, 2) + '·10⁻²¹ Дж']]);
    });
    B(root, ['T', 'Vw'], () => { imp = 0; tacc = 0; }); root.querySelector('#N').addEventListener('input', init); init();
    return stop;
  });
})();
