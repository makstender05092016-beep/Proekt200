/* ПРОЕКТ 200 — приложение: маршрутизация, экраны, учебный план, звания, статистика */
'use strict';
(function () {
  const { $, $$, esc, fmt, today, DB } = P;
  let view = $('#view');
  let cleanup = null;
  const RANKS = ['Рядовой', 'Ефрейтор', 'Младший сержант', 'Сержант', 'Старшина', 'Младший лейтенант', 'Лейтенант', 'Капитан', 'Майор', 'Полковник', 'Генерал'];
  const RANK_XP = [0, 60, 160, 320, 520, 800, 1150, 1600, 2200, 3000, 4200];
  const RANK_MAST = [0, 0, 1, 2, 4, 6, 9, 13, 18, 26, 38];
  const INTERVALS = [1, 2, 4, 7, 15, 30];
  const MIN_OPTS = [20, 40, 60, 90, 120];

  /* ---------- состояние ---------- */
  const S = {
    get profile() { return DB.get('profile', { name: '', minutes: 40, examDate: '2027-06-01', onboarded: false, diagDone: false, created: today() }); },
    get settings() { return DB.get('settings', { sound: true, vol: 0.5, mode: 'book' }); },
    get topics() { return DB.get('topics', {}); },
    get stats() { return DB.get('stats', { solved: 0, correct: 0, streak: 0, best: 0 }); },
    get days() { return DB.get('days', {}); },
    get ach() { return DB.get('ach', {}); },
    get favs() { return DB.get('favs', []); }
  };
  P.S = S;
  const tState = id => S.topics[id] || { m: 0, att: 0, ok: 0, read: false, box: 0, next: null };
  async function setTopic(id, patch) { const all = { ...S.topics }; all[id] = { ...tState(id), ...patch }; await DB.set('topics', all); }
  const TOP = subj => P.TOPICS.filter(t => t.subj === subj);
  const mastered = t => { const s = tState(t.id); return s.m >= 0.8 && s.att >= 5; };
  const progress = subj => { const L = subj ? TOP(subj) : P.TOPICS; return L.reduce((a, t) => { const s = tState(t.id); return a + Math.min(1, (s.read ? .25 : 0) + .75 * s.m * Math.min(1, s.att / 5)); }, 0) / L.length; };

  /* ---------- запись ответа ---------- */
  P.recordAnswer = async function (task, res, src) {
    const ok = !!res.ok, sc = res.max ? (res.score || 0) / res.max : (ok ? 1 : 0);
    await DB.addAttempt({ topic: task.topic, subj: task.subj, gid: task.gid, ok, src: src || 'practice', d: today() });
    const s = tState(task.topic); await setTopic(task.topic, { att: s.att + 1, ok: s.ok + (ok ? 1 : 0), m: P.round(s.m + 0.3 * (sc - s.m), 4), last: today() });
    const st = { ...S.stats }; st.solved++; if (ok) { st.correct++; st.streak++; st.best = Math.max(st.best, st.streak); } else st.streak = 0; await DB.set('stats', st);
    const ds = { ...S.days }, d = ds[today()] || { s: 0, c: 0 }; d.s++; if (ok) d.c++; ds[today()] = d; await DB.set('days', ds);
    await checkProgress();
  };

  /* ---------- звания и достижения ---------- */
  async function computeXP() {
    const st = S.stats, ds = S.days, active = Object.values(ds).filter(d => d.s >= 5).length;
    const mast = P.TOPICS.filter(mastered).length, read = P.TOPICS.filter(t => tState(t.id).read).length;
    const exams = (await DB.exams()).filter(e => e.finished && e.items.length >= 8 && e.kind !== 'diag');
    const exPts = exams.reduce((a, e) => a + Math.round((e.result ? e.result.pct : 0) / 5), 0);
    return { xp: st.correct * 2 + mast * 40 + read * 8 + exPts + active * 5, mast, read, active, exams: exams.length, best: Math.max(0, ...exams.map(e => e.result ? e.result.pct : 0)) };
  }
  function rankOf(x) { let r = 0; for (let i = 0; i < RANKS.length; i++) if (x.xp >= RANK_XP[i] && x.mast >= RANK_MAST[i]) r = i; return r; }
  P.rankOf = rankOf; P.computeXP = computeXP;
  const ACH = [
    ['first', 'Первая задача', 'Решена первая задача', (x, st) => st.solved >= 1],
    ['c10', 'Десять верных', '10 верных ответов', (x, st) => st.correct >= 10],
    ['c100', 'Сотня', '100 верных ответов', (x, st) => st.correct >= 100],
    ['c500', 'Пятисотка', '500 верных ответов', (x, st) => st.correct >= 500],
    ['s10', 'Без промаха', '10 верных ответов подряд', (x, st) => st.best >= 10],
    ['s25', 'Снайпер', '25 верных ответов подряд', (x, st) => st.best >= 25],
    ['l1', 'Первый конспект', 'Изучена первая тема', x => x.read >= 1],
    ['l10', 'Прилежание', 'Изучено 10 тем', x => x.read >= 10],
    ['lall', 'Полный курс', 'Изучены все 50 тем', x => x.read >= P.TOPICS.length],
    ['m1', 'Освоение', 'Первая освоенная тема', x => x.mast >= 1],
    ['m10', 'Мастер', '10 освоенных тем', x => x.mast >= 10],
    ['d3', 'Режим', '3 дня активной работы (≥5 задач)', x => x.active >= 3],
    ['d14', 'Дисциплина', '14 дней активной работы', x => x.active >= 14],
    ['e1', 'Испытание', 'Пройден первый вариант/испытание', x => x.exams >= 1],
    ['e80', 'Отличник', 'Испытание на 80% и выше', x => x.best >= 80],
    ['diag', 'Личное дело заведено', 'Пройдена входная диагностика', () => S.profile.diagDone],
    ['lab5', 'Лаборант', 'Открыто 5 лабораторий', () => (DB.get('labsSeen', []) || []).length >= 5]
  ];
  async function checkProgress() {
    const x = await computeXP(), st = S.stats, got = { ...S.ach }; let changed = false;
    for (const [id, n, , cond] of ACH) if (!got[id] && cond(x, st)) { got[id] = today(); changed = true; P.toast('🏅 Достижение: ' + n); P.snd.play('award'); }
    if (changed) await DB.set('ach', got);
    const r = rankOf(x), prev = DB.get('rank', 0);
    if (r > prev) { await DB.set('rank', r); const hist = { ...DB.get('rankHist', {}) }; hist[r] = today(); await DB.set('rankHist', hist); promo(r); }
  }
  P.checkProgress = checkProgress;
  function insignia(i, w = 54) {
    const stars = { 5: 1, 6: 2, 7: 4, 8: 1, 9: 3, 10: 1 }[i] || 0, big = i >= 8, stripes = i >= 1 && i <= 3 ? i : 0;
    let s = `<svg viewBox="0 0 60 120" width="${w / 2}" height="${w}"><path d="M4 18L30 4l26 14v98H4z" fill="${i >= 10 ? '#b8954a' : '#7f1913'}" stroke="#231a14" stroke-width="2"/><circle cx="30" cy="16" r="3" fill="#e8d6a8"/>`;
    if (i >= 10) s += `<path d="M8 40l8 10 8-10 8 10 8-10 8 10 4-6" fill="none" stroke="#7f1913" stroke-width="3"/>`;
    for (let k = 0; k < stripes; k++) s += `<rect x="4" y="${90 - k * 10}" width="52" height="5" fill="#e8d6a8"/>`;
    if (i === 4) s += `<rect x="4" y="76" width="52" height="16" fill="#e8d6a8"/>`;
    if (i >= 5 && i <= 7) s += `<rect x="27" y="20" width="6" height="96" fill="#e8d6a8"/>`;
    if (i === 8 || i === 9) s += `<rect x="16" y="20" width="5" height="96" fill="#e8d6a8"/><rect x="39" y="20" width="5" height="96" fill="#e8d6a8"/>`;
    const pos = { 1: [[30, 80]], 2: [[19, 80], [41, 80]], 3: [[19, 80], [41, 80], [30, 60]], 4: [[19, 90], [41, 90], [30, 70], [30, 50]] };
    const key = i === 7 ? 4 : stars; (pos[key] || []).forEach(([x, y]) => { const r = big ? 8 : 5; s += `<path transform="translate(${x} ${y}) scale(${r / 50}) translate(-50 -50)" fill="#ffd27a" d="M50 4l13.4 31.6 34.2 3-26 22.5 7.8 33.5L50 77 20.6 94.6l7.8-33.5-26-22.5 34.2-3z"/>`; });
    return s + '</svg>';
  }
  function promo(r) {
    const d = document.createElement('div'); d.className = 'promo';
    d.innerHTML = `<div><svg class="st" viewBox="0 0 100 100"><use href="#i-star"/></svg><div class="motto" style="color:#e8d6a8;margin-top:12px">ПРИКАЗ ПО ПРОЕКТУ 200</div><h1 style="margin:10px 0">ПРИСВОЕНО ЗВАНИЕ</h1><div style="font-family:var(--sfont);font-size:30px;margin-bottom:12px">«${RANKS[r]}»</div><div style="margin:12px auto">${insignia(r, 90)}</div><p class="small" style="opacity:.85">Основание: подтверждённые учебные достижения.</p><button class="btn gold">Служу знанию!</button></div>`;
    document.body.appendChild(d); P.snd.play('award'); d.querySelector('button').onclick = () => d.remove();
  }

  /* ---------- учебный план ---------- */
  async function getPlan() {
    let pl = DB.get('plan'); if (pl && pl.date === today()) return pl;
    pl = makePlan(pl); await DB.set('plan', pl); return pl;
  }
  function makePlan(prev) {
    const pr = S.profile, budget = pr.minutes || 40, items = [], used = () => items.reduce((a, i) => a + i.min, 0);
    if (prev && prev.items) prev.items.filter(i => !i.done && i.type !== 'exam').forEach(i => { if (!items.find(j => j.type === i.type && j.topic === i.topic)) items.push({ ...i, carried: true }); });
    const add = it => { if (used() + it.min <= budget + 5 && !items.find(j => j.type === it.type && j.topic === it.topic)) items.push({ id: 'i' + Math.random().toString(36).slice(2, 8), done: false, ...it }); };
    const due = P.TOPICS.filter(t => { const s = tState(t.id); return s.read && s.next && s.next <= today(); }).sort((a, b) => tState(a.id).m - tState(b.id).m);
    due.slice(0, 3).forEach(t => add({ type: 'review', topic: t.id, min: 5 }));
    const lessons = subj => { const L = TOP(subj).filter(t => !tState(t.id).read); return subj === 'math' ? L.filter(t => tState(t.id).m < .6).concat(L.filter(t => tState(t.id).m >= .6)) : L; };
    const weakest = subj => TOP(subj).filter(t => tState(t.id).read).sort((a, b) => tState(a.id).m - tState(b.id).m)[0];
    const k = { phys: 0, math: 0 }, LS = { phys: lessons('phys'), math: lessons('math') };
    for (let guard = 0; guard < 8 && used() < budget; guard++) for (const subj of ['phys', 'math']) {
      if (used() >= budget) break;
      const l = LS[subj][k[subj]++]; if (l) { add({ type: 'lesson', topic: l.id, min: 15 }); add({ type: 'practice', topic: l.id, min: 10 }); }
      const w = weakest(subj); if (w) add({ type: 'practice', topic: w.id, min: 10 });
    }
    const daysLeft = P.daysBetween(today(), pr.examDate || '2027-06-01');
    if (budget >= 60 && (daysLeft < 120 || new Date().getDay() === 0)) { const read = P.TOPICS.filter(t => tState(t.id).read); if (read.length >= 3) add({ type: 'exam', topic: read[Math.floor(Math.random() * read.length)].id, min: 20 }); }
    return { date: today(), items, budget };
  }
  async function completePlan(type, topic) {
    const pl = await getPlan(); const it = pl.items.find(i => !i.done && i.topic === topic && (i.type === type || (type === 'practice' && i.type === 'review')));
    if (it) { it.done = true; await DB.set('plan', pl); P.toast('План: пункт выполнен ✓'); }
  }
  const TYPE_N = { lesson: 'Изучить тему', practice: 'Практика', review: 'Повторение', exam: 'Мини-испытание' };
  function planItemHTML(it, edit) {
    const t = P.topicById(it.topic); if (!t) return '';
    return `<li><div class="tap" style="display:flex;gap:10px;align-items:center;padding:10px 0"><button class="num ${it.done ? 'done' : ''}" data-tog="${it.id}" aria-label="Отметить">${it.done ? '✓' : it.min}</button>
<button class="t" style="text-align:left;flex:1" data-go="${it.type === 'lesson' ? 'topic/' + t.id + '/book' : it.type === 'exam' ? 'exam/theme/' + t.id : 'practice/' + t.id + (it.type === 'review' ? '/review' : '')}"><b>${TYPE_N[it.type]}: ${esc(t.title)}</b><small>${t.subj === 'math' ? 'Математика' : 'Физика'} · ${it.min} мин${it.carried ? ' · перенесено' : ''}</small></button>
${edit ? `<button class="chip" data-del="${it.id}">✕</button>` : ''}</div></li>`;
  }

  /* ---------- маршрутизация ---------- */
  const routes = {};
  const R = (name, fn) => routes[name] = fn;
  function go(h) { if (location.hash.slice(1) === h) render(); else location.hash = h; }
  P.go = go;
  function setTop(title, sub, back) { $('#ttl').textContent = title; $('#sub').textContent = sub || 'Знание. Дисциплина. Совершенство.'; $('#backBtn').classList.toggle('hide', !back); $('#topx').innerHTML = ''; }
  async function render() {
    if (cleanup) { try { cleanup(); } catch (e) { } cleanup = null; }
    P.closeModal(); clearInterval(P._timer);
    const h = location.hash.slice(1) || 'home', parts = h.split('/');
    if (!S.profile.onboarded && parts[0] !== 'onboard' && parts[0] !== 'diag' && parts[0] !== 'exam') return go('onboard');
    const fn = routes[parts[0]] || routes.home;
    $$('#nav button').forEach(b => b.classList.toggle('on', h.startsWith(b.dataset.go) || (b.dataset.go === 'home' && parts[0] === 'home')));
    const nv = view.cloneNode(false); view.replaceWith(nv); view = nv;
    try { const c = await fn(...parts.slice(1)); if (typeof c === 'function') cleanup = c; } catch (e) { console.error(e); view.innerHTML = `<div class="card"><h3>Ошибка</h3><p class="small">${esc(e.message)}</p><button class="btn" data-go="home">На главную</button></div>`; }
    window.scrollTo(0, 0);
  }
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-go]'); if (g) { e.preventDefault(); P.snd.play('nav'); go(g.dataset.go); }
  });
  $('#backBtn').onclick = () => { P.snd.play('nav'); history.length > 1 ? history.back() : go('home'); };
  window.addEventListener('hashchange', render);

  const ring = (p, label, col = '#b3261e') => { const r = 34, c = 2 * Math.PI * r; return `<div class="center"><svg class="ring" viewBox="0 0 84 84"><circle cx="42" cy="42" r="${r}" fill="none" stroke="#e7dbc1" stroke-width="8"/><circle cx="42" cy="42" r="${r}" fill="none" stroke="${col}" stroke-width="8" stroke-dasharray="${c * p} ${c}" transform="rotate(-90 42 42)" stroke-linecap="round"/><text x="42" y="47" text-anchor="middle" font-size="17" font-weight="700" fill="#231a14">${Math.round(p * 100)}%</text></svg><div class="lbl" style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#8a6a52">${label}</div></div>`; };
  const bar = (p, cls = '') => `<div class="bar ${cls}"><i style="width:${Math.round(P.clamp(p, 0, 1) * 100)}%"></i></div>`;
  const ico = (id, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24"><use href="#${id}"/></svg>`;

  /* ================= ГЛАВНЫЙ ЭКРАН ================= */
  R('home', async () => {
    setTop('Личное учебное дело № 001', 'Проект 200');
    const pr = S.profile, x = await computeXP(), r = rankOf(x), pl = await getPlan(), daysLeft = P.daysBetween(today(), pr.examDate);
    const doneN = pl.items.filter(i => i.done).length, last = Object.entries(S.topics).filter(([, s]) => s.last).sort((a, b) => (b[1].last > a[1].last ? 1 : -1))[0];
    const dueN = P.TOPICS.filter(t => { const s = tState(t.id); return s.read && s.next && s.next <= today(); }).length;
    view.innerHTML = `
<div class="card form"> <div class="dossier-head">${P.emblem()}<div><div class="lbl">Личное учебное дело № 001</div><h2 style="margin:4px 0">${esc(pr.name || 'Курсант')}</h2>
 <div class="row" style="gap:8px">${insignia(r, 40)}<div><div class="badge r">${RANKS[r]}</div><div class="small muted">${x.xp} очков · освоено тем: ${x.mast}</div></div></div></div></div>
 <div class="sep"></div><div class="goal">Математика — 100 баллов.<br>Физика — 100 баллов.<br><b style="color:var(--red)">Проект 200 — выполнить.</b></div>
 <div class="motto" style="margin-top:6px">Знание. Дисциплина. Совершенство.</div></div>
<div class="card"><div class="grid3" style="grid-template-columns:repeat(3,1fr)">${ring(progress(), 'Общий')}${ring(progress('math'), 'Математика')}${ring(progress('phys'), 'Физика', '#b8954a')}</div>
 <div class="sep"></div><div class="row"><div class="grow small">До экзамена (ориентир ${pr.examDate.split('-').reverse().join('.')}):</div><b class="mono">${daysLeft > 0 ? daysLeft + ' дн.' : '—'}</b></div></div>
<div class="card"><div class="row"><h3 class="grow">План на сегодня</h3><span class="badge">${doneN}/${pl.items.length}</span></div>${bar(pl.items.length ? doneN / pl.items.length : 0, 'k')}
 <ul class="tl">${pl.items.slice(0, 4).map(i => planItemHTML(i)).join('') || '<li class="small muted" style="padding:10px 0">План пуст — откройте «Учебный план».</li>'}</ul><button class="btn sec full" data-go="plan">Весь план · ${pl.budget} мин</button></div>
<div class="card dark"><div class="lbl">Текущие задания</div>
 ${last ? `<button class="tap row" style="padding:8px 0;color:inherit" data-go="topic/${last[0]}/book"><div class="grow"><b>Продолжить: ${esc(P.topicById(last[0]).title)}</b><div class="small" style="opacity:.7">Освоение ${Math.round(last[1].m * 100)}%</div></div>›</button>` : ''}
 <button class="tap row" style="padding:8px 0;color:inherit" data-go="plan"><div class="grow"><b>Повторений к выполнению: ${dueN}</b><div class="small" style="opacity:.7">Интервальное закрепление</div></div>›</button>
 ${!pr.diagDone ? `<button class="tap row" style="padding:8px 0;color:#ffd27a" data-go="diag"><div class="grow"><b>Пройти входную диагностику</b><div class="small" style="opacity:.7">12 задач по математике</div></div>›</button>` : ''}</div>
<div class="grid2">
 <button class="tile tap" data-go="fac/math">${ico('i-compass')}<b>Факультет математики</b><small>21 тема · ${Math.round(progress('math') * 100)}%</small></button>
 <button class="tile tap" data-go="fac/phys">${ico('i-atom')}<b>Факультет физики</b><small>29 тем с нуля · ${Math.round(progress('phys') * 100)}%</small></button>
 <button class="tile tap" data-go="exam">${ico('i-seal')}<b>Экзаменационная комиссия</b><small>Варианты, испытания</small></button>
 <button class="tile tap" data-go="lib">${ico('i-book')}<b>Научная библиотека</b><small>Формулы и определения</small></button>
 <button class="tile tap" data-go="labs">${ico('i-flask')}<b>Лаборатории</b><small>${P.LABS.length} моделей</small></button>
 <button class="tile tap" data-go="awards">${ico('i-medal')}<b>Звания и награды</b><small>${Object.keys(S.ach).length}/${ACH.length} достижений</small></button>
 <button class="tile tap" data-go="stats">${ico('i-chart')}<b>Статистика</b><small>${S.stats.solved} задач решено</small></button>
 <button class="tile tap" data-go="settings">${ico('i-gear')}<b>Настройки</b><small>Звук, данные, офлайн</small></button>
</div>`;
    bindPlanToggles(pl);
  });
  function bindPlanToggles(pl) {
    view.addEventListener('click', async e => {
      const t = e.target.closest('[data-tog]'); if (t) { e.stopPropagation(); const it = pl.items.find(i => i.id === t.dataset.tog); it.done = !it.done; await DB.set('plan', pl); P.snd.play('toggle'); render(); }
      const d = e.target.closest('[data-del]'); if (d) { pl.items = pl.items.filter(i => i.id !== d.dataset.del); await DB.set('plan', pl); render(); }
    });
  }

  R('more', () => {
    setTop('Ещё', 'Разделы');
    view.innerHTML = `<div class="grid2">${[['plan', 'i-plan', 'Учебный план', 'Задания на день'], ['labs', 'i-flask', 'Лаборатории', 'Интерактивные модели'], ['lib', 'i-book', 'Научная библиотека', 'Поиск формул'], ['stats', 'i-chart', 'Статистика', 'Прогресс и ошибки'], ['awards', 'i-medal', 'Звания и награды', 'Удостоверение'], ['settings', 'i-gear', 'Настройки', 'Данные и офлайн']].map(([g, i, b, s]) => `<button class="tile tap" data-go="${g}">${ico(i)}<b>${b}</b><small>${s}</small></button>`).join('')}</div>`;
  });

  /* ================= ФАКУЛЬТЕТЫ ================= */
  R('fac', subj => {
    const m = subj === 'math';
    setTop(m ? 'Факультет математики' : 'Факультет физики', m ? 'Профильный уровень' : 'Курс с абсолютного нуля', true);
    const L = TOP(subj);
    view.innerHTML = `<div class="card red"><div class="row"><svg viewBox="0 0 24 24" width="48" height="48" style="color:#ffd27a">${m ? '<use href="#i-compass"/>' : '<use href="#i-atom"/>'}</svg><div class="grow"><div class="lbl">${m ? 'Циркуль · координатная сетка · формулы' : 'Атом · орбиты · приборы'}</div><h2>${m ? 'Математика' : 'Физика'}</h2><div class="small">${L.length} тем · освоено ${L.filter(mastered).length}</div></div></div>${bar(progress(subj), 'g')}</div>
${!m ? '<div class="note">Курс построен последовательно: каждая тема опирается на предыдущие. Начните с темы 1 и не пропускайте «Математический аппарат физики».</div>' : ''}
<div class="card"><ul class="tl">${L.map(t => { const s = tState(t.id), cls = mastered(t) ? 'done' : s.read ? 'mid' : ''; return `<li><button class="tap" data-go="topic/${t.id}/${S.settings.mode}"><span class="num ${cls}">${t.n}</span><span class="t"><b>${esc(t.title)}</b><small>${esc(t.short)}</small>${s.att ? bar(s.m) : ''}</span>›</button></li>`; }).join('')}</ul></div>
<div class="btns"><button class="btn sec" data-go="practice/mix/${subj}">Смешанная практика</button><button class="btn sec" data-go="exam">Испытания</button></div>`;
  });

  /* ================= ТЕМА ================= */
  R('topic', async (id, tab = 'book') => {
    const t = P.topicById(id); if (!t) return go('home');
    const s = tState(id), m = t.subj === 'math', lab = P.LABS.find(l => l.topic === id);
    setTop(t.title, (m ? 'Математика' : 'Физика') + ' · тема ' + t.n, true);
    const hasModel = t.viz || lab;
    const tabs = [['book', 'Учебник'], ['short', 'Конспект'], ['practice', 'Практика']].concat(hasModel ? [['viz', 'Модель']] : []);
    if (tab === 'book' || tab === 'short') { const st = { ...S.settings, mode: tab }; DB.set('settings', st); }
    let body = '';
    const ftab = `<table class="ftab">${t.f.map(([n, ff]) => `<tr><td>${n}</td><td>${ff}</td></tr>`).join('')}</table>`;
    const errs = `<h3>Типичные ошибки</h3>${t.err.map(e => `<div class="warnbox">⚠ ${e}</div>`).join('')}`;
    if (tab === 'book') {
      body = `<div class="card txt">${t.theory}
${t.defs.length ? '<h3>Определения</h3>' + t.defs.map(([a, b]) => `<div class="def"><b>${a}</b> — ${b}</div>`).join('') : ''}
${t.f.length ? '<h3>Формулы</h3>' + ftab : ''}
<h3>Разобранные примеры</h3>${t.ex.map(([q, a], i) => `<div class="ex"><b>Пример ${i + 1}</b><p>${q}</p><details class="sol"><summary>Решение</summary><p>${a}</p></details></div>`).join('')}
${errs}</div>
<div class="btns">${s.read ? '<span class="badge k" style="align-self:center">Тема изучена ✓</span>' : '<button class="btn" id="markRead">Отметить: тема изучена</button>'}<button class="btn sec" data-go="topic/${id}/practice">К практике →</button></div>`;
    } else if (tab === 'short') {
      body = `<div class="card txt"><h3>Главное</h3><ul>${t.sum.map(x => `<li>${x}</li>`).join('')}</ul>${t.f.length ? '<h3>Формулы и обозначения</h3>' + ftab : ''}${t.defs.length ? '<h3>Определения</h3><ul>' + t.defs.map(([a, b]) => `<li><b>${a}</b> — ${b}</li>`).join('') + '</ul>' : ''}${errs}</div>`;
    } else if (tab === 'practice') {
      const gens = P.gensFor(id), ext = P.EXT.filter(e => e.topic === id);
      body = `<div class="card"><h3>Тренировка</h3><p class="small">Задачи генерируются заново при каждом запуске: числа меняются, решения и проверка рассчитываются автоматически. Типов задач в теме: ${gens.length}.</p>
${bar(s.m)}<p class="small muted">Освоение ${Math.round(s.m * 100)}% · решено ${s.att} · верно ${s.ok}${s.next ? ' · следующее повторение ' + s.next.split('-').reverse().join('.') : ''}</p>
<div class="btns"><button class="btn" data-go="practice/${id}">5 задач</button><button class="btn sec" data-go="practice/${id}/long">10 задач</button></div>
<div class="btns"><button class="btn ghost full" data-go="exam/theme/${id}">Контрольное испытание (8 задач, таймер)</button></div></div>
${ext.length ? `<div class="card"><h3>Задачи с развёрнутым решением</h3><p class="small muted">Эталонное решение и самооценка по критериям. ${P.EXT_NOTE}</p>${ext.map(e => `<button class="tap row" style="padding:10px 0;border-bottom:1px dashed var(--line)" data-ext="${e.id}"><span class="num">${e.num}</span><span class="grow small">${e.q.replace(/<[^>]+>/g, ' ').slice(0, 90)}…</span>›</button>`).join('')}</div>` : ''}`;
    } else if (tab === 'viz') {
      body = `<div class="card" id="vizc">${t.viz ? '' : ''}</div>${lab ? `<button class="btn sec full" data-go="lab/${lab.id}">Открыть лабораторию «${lab.title}» →</button>` : ''}`;
    }
    view.innerHTML = `<div class="seg">${tabs.map(([k, n]) => `<button class="${k === tab ? 'on' : ''}" data-go="topic/${id}/${k}">${n}</button>`).join('')}</div>` + body;
    const mr = $('#markRead'); if (mr) mr.onclick = async () => { await setTopic(id, { read: true, box: s.box || 0, next: P.addDays(today(), 1) }); await completePlan('lesson', id); P.snd.play('ok'); await checkProgress(); render(); };
    view.addEventListener('click', e => { const x = e.target.closest('[data-ext]'); if (x) extModal(P.EXT.find(q => q.id === x.dataset.ext)); });
    if (tab === 'viz') { const vc = $('#vizc'); if (t.viz) { P.VIZ[t.viz](vc); } else if (lab) { vc.innerHTML = '<div class="lab"></div>'; return lab.init(vc); } }
  });
  function extModal(e) {
    P.modal(`<div class="row"><h3 class="grow">Задание ${e.num} · до ${e.max} б.</h3><button class="chip" data-close>✕</button></div><div class="task"><p>${e.q}</p></div>
<textarea class="txtin" placeholder="Запишите ключевые шаги решения и ответ (необязательно)"></textarea>
<details class="sol"><summary>Эталонное решение</summary><div class="task"><p>${e.sol}</p></div></details>
<h3 style="margin-top:12px">Самооценка</h3><p class="small muted">${P.EXT_NOTE}</p><div class="opts">${e.crit.map(([p, txt]) => `<button class="opt" data-p="${p}"><span class="k">${p}</span><span>${txt}</span></button>`).join('')}</div>`, sh => {
      sh.addEventListener('click', async ev => { const o = ev.target.closest('[data-p]'); if (!o) return; const pts = +o.dataset.p; await P.recordAnswer({ topic: e.topic, subj: e.subj, gid: e.id }, { ok: pts === e.max, score: pts, max: e.max }, 'ext'); P.snd.play(pts === e.max ? 'ok' : 'term'); P.toast(`Самооценка записана: ${pts} из ${e.max}`); P.closeModal(); });
    });
  }

  /* ================= ВВОД ОТВЕТА / ЗАДАЧА ================= */
  const UNITS = ['м', 'см', 'км', 'с', 'мин', 'ч', 'кг', 'г', 'м/с', 'км/ч', 'м/с²', 'Н', 'Дж', 'кДж', 'Вт', 'Па', 'кг·м/с', 'А', 'В', 'Ом', 'Кл', 'Тл', 'Гц', 'К', 'моль', 'Н/м'];
  /* рендер задачи. opts: {exam:bool, saved, onAnswer(input), onResult(res)} */
  P.renderTask = function (box, t, opts = {}) {
    const fields = [];
    let html = `<div class="task"><div class="tq">${t.q}</div>${t.viz ? `<div class="vizbox">${t.viz}</div>` : ''}`;
    if (t.type === 'choice') html += `<div class="opts">${t.opts.map((o, i) => `<button class="opt" data-i="${i}"><span class="k">${i + 1}</span><span>${o}</span></button>`).join('')}</div>`;
    else if (t.type === 'match') html += `<div class="match"><div class="small">${t.right.map((x, i) => `<b>${i + 1})</b> ${x}`).join('&nbsp;&nbsp; ')}</div>${t.left.map((l, i) => `<div class="mrow"><span class="ml"><b>${'АБВГ'[i]})</b> ${l}</span><span class="mb" data-row="${i}">${t.right.map((_, j) => `<button data-j="${j}">${j + 1}</button>`).join('')}</span></div>`).join('')}</div>`;
    else if (t.type === 'ext') html += `<textarea class="txtin" placeholder="Запишите решение и ответ">${esc((opts.saved && opts.saved.text) || '')}</textarea><p class="small muted">После завершения варианта откроется эталонное решение и самооценка по критериям.</p>`;
    else {
      const specs = t.steps || [t];
      specs.forEach((sp, i) => { fields.push(sp); html += `<div class="stepi">${t.steps ? `<div class="lbl2">Шаг ${i + 1}. ${sp.q}${sp.unit && !sp.needUnit ? ' (' + sp.unit + ')' : ''}</div>` : ''}<div class="ansrow"><div class="ansf" data-f="${i}"><span class="ph">Ответ${!t.steps && sp.unit && !sp.needUnit ? ', ' + sp.unit : ''}</span></div>${sp.needUnit ? `<input class="unitf" data-u="${i}" placeholder="ед." autocomplete="off" autocapitalize="off" spellcheck="false">` : ''}</div></div>`; });
      if (specs.some(s => s.needUnit)) html += `<div class="chips small" style="margin-top:6px;flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch" id="uchips">${UNITS.map(u => `<button class="chip" data-unit="${u}">${u}</button>`).join('')}</div>`;
      html += `<div class="kp">${['7', '8', '9', '/', '⌫', '4', '5', '6', '−', '(', '1', '2', '3', ',', ')', '0', '√', 'π', '^', 'C'].map(k => `<button class="${/\d/.test(k) ? '' : k === '⌫' || k === 'C' ? 'del' : 'op'}" data-k="${k}">${k}</button>`).join('')}</div>`;
    }
    html += `</div>${opts.exam ? '' : `<button class="btn full" id="chk" style="margin-top:12px">Проверить</button>`}<div id="fb"></div>`;
    box.innerHTML = html;
    const vals = fields.map(() => ''), units = fields.map(() => ''); let cur = 0, choice = null, match = t.type === 'match' ? t.left.map(() => null) : null;
    const sv = opts.saved;
    if (sv) { if (t.type === 'choice') choice = sv; else if (t.type === 'match') match = sv.slice(); else if (t.type !== 'ext') { if (t.steps) { sv.steps.forEach((v, i) => vals[i] = v); (sv.units || []).forEach((v, i) => units[i] = v || ''); } else { vals[0] = sv.value || ''; units[0] = sv.unit || ''; } } }
    const input = () => t.type === 'choice' ? choice : t.type === 'match' ? match : t.type === 'ext' ? { text: box.querySelector('textarea').value, self: sv && sv.self } : t.steps ? { steps: vals.slice(), units: units.slice() } : { value: vals[0], unit: units[0] };
    const paint = () => {
      $$('.ansf', box).forEach((el, i) => { el.classList.toggle('focus', i === cur); el.innerHTML = vals[i] ? esc(vals[i]) + (i === cur ? '<span class="cur"></span>' : '') : (i === cur ? '<span class="cur"></span>' : '') + `<span class="ph">${t.steps ? '' : 'Ответ'}</span>`; });
      $$('[data-u]', box).forEach((el, i) => { if (el.value !== units[+el.dataset.u]) el.value = units[+el.dataset.u]; });
      $$('.opt', box).forEach((el, i) => el.classList.toggle('sel', i === choice));
      if (match) $$('.mb', box).forEach(row => $$('button', row).forEach(b => b.classList.toggle('on', match[+row.dataset.row] === +b.dataset.j)));
    };
    const changed = () => { paint(); if (opts.onAnswer) opts.onAnswer(input()); };
    box.addEventListener('click', e => {
      const k = e.target.closest('[data-k]'); if (k) { P.snd.play('key'); const v = k.dataset.k; if (v === '⌫') vals[cur] = vals[cur].slice(0, -1); else if (v === 'C') vals[cur] = ''; else if (vals[cur].length < 24) vals[cur] += v; changed(); return; }
      const f = e.target.closest('[data-f]'); if (f) { cur = +f.dataset.f; paint(); return; }
      const o = e.target.closest('.opt[data-i]'); if (o && !box.dataset.locked) { choice = +o.dataset.i; P.snd.play('toggle'); changed(); return; }
      const mb = e.target.closest('.mb button'); if (mb && !box.dataset.locked) { match[+mb.parentNode.dataset.row] = +mb.dataset.j; P.snd.play('toggle'); changed(); return; }
      const uc = e.target.closest('[data-unit]'); if (uc) { const i = fields[cur] && fields[cur].needUnit ? cur : fields.findIndex(s => s.needUnit); if (i >= 0) { units[i] = uc.dataset.unit; P.snd.play('toggle'); changed(); } return; }
    });
    $$('[data-u]', box).forEach(el => el.addEventListener('input', () => { units[+el.dataset.u] = el.value; if (opts.onAnswer) opts.onAnswer(input()); }));
    const ta = box.querySelector('textarea'); if (ta && opts.onAnswer) ta.addEventListener('input', () => opts.onAnswer(input()));
    const kd = e => { if (!fields.length || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return; const m = { '-': '−', '.': ',', '*': '·' }; let ch = m[e.key] || e.key; if (/^[\d,−/()^]$/.test(ch) || ch === '·') { vals[cur] += ch === '·' ? '' : ch; changed(); } else if (e.key === 'Backspace') { vals[cur] = vals[cur].slice(0, -1); changed(); } else if (e.key === 'Enter' && $('#chk', box)) $('#chk', box).click(); };
    document.addEventListener('keydown', kd);
    paint();
    const chk = $('#chk', box);
    if (chk) chk.onclick = () => {
      const res = P.check(t, input());
      if (res.invalid) { P.toast(res.msg, 3200); P.snd.play('term'); return; }
      box.dataset.locked = 1; chk.remove(); P.snd.play(res.ok ? 'ok' : 'bad');
      if (t.type === 'choice') { $$('.opt', box).forEach((el, i) => { if (i === t.ans) el.classList.add('right'); else if (i === choice) el.classList.add('wrong'); }); }
      if (t.type === 'match') $$('.mb', box).forEach(row => { const ri = +row.dataset.row; $$('button', row).forEach(b => { const j = +b.dataset.j; if (j === t.ans[ri]) b.classList.add('right'); else if (j === match[ri]) b.classList.add('wrong'); }); });
      $('#fb', box).innerHTML = feedbackHTML(t, res);
      if (opts.onResult) opts.onResult(res);
    };
    return { input, destroy: () => document.removeEventListener('keydown', kd) };
  };
  function ansStr(t) {
    if (t.type === 'choice') return (t.ans + 1) + ') ' + t.opts[t.ans];
    if (t.type === 'match') return t.ans.map(x => x + 1).join('');
    if (t.steps) return t.steps.map((s, i) => `шаг ${i + 1}: ${fmt(s.a)}${s.unit ? ' ' + s.unit : ''}`).join('; ');
    return fmt(t.a) + (t.unit ? ' ' + t.unit : '');
  }
  P.ansStr = ansStr;
  function feedbackHTML(t, res) {
    const sol = t.sol ? `<ol>${t.sol.map(s => `<li>${s}</li>`).join('')}</ol>` : `<p>${t.expl || ''}</p>`;
    if (res.ok) return `<div class="fb ok"><h4>✓ Верно${res.unitNote || ''}</h4>${t.type === 'match' || t.type === 'choice' ? `<p>${t.expl}</p>` : `<details class="sol"><summary>Эталонное решение</summary>${sol}</details>`}</div>`;
    return `<div class="fb bad"><h4>✗ Неверно${res.score ? ` (частично: ${res.score} из ${res.max})` : ''}</h4>
<p><b>1. Где ошибка.</b> ${res.where || 'Итоговый ответ'}.</p><p><b>2. Почему.</b> ${res.why || ''}</p><div><b>3. Как рассуждать.</b>${sol}</div><p><b>4. Верный ответ:</b> ${ansStr(t)}</p></div>`;
  }
  P.feedbackHTML = feedbackHTML;

  /* ================= ПРАКТИКА ================= */
  R('practice', (id, mode) => {
    let ids, title, subj;
    if (id === 'mix') { subj = mode; ids = TOP(subj).filter(t => tState(t.id).read || tState(t.id).att).map(t => t.id); if (!ids.length) ids = TOP(subj).slice(0, 3).map(t => t.id); title = 'Смешанная практика'; mode = 'long'; }
    else { const t = P.topicById(id); ids = [id]; title = t.title; subj = t.subj; }
    const N = mode === 'long' ? 10 : 5, gens = [];
    ids.forEach(tid => P.gensFor(tid).forEach(g => gens.push([g, tid])));
    if (!gens.length) { view.innerHTML = '<div class="card">Для этой темы нет задач.</div>'; return; }
    const rr = P.rng(P.seed()), order = rr.shuffle(gens), results = []; let i = 0, ctl = null;
    setTop(mode === 'review' ? 'Повторение' : 'Практика', title, true);
    const next = () => {
      if (ctl) ctl.destroy();
      if (i >= N) return finish();
      const [gid, tid] = order[i % order.length], task = P.makeTask(gid, P.seed(), { topic: tid });
      view.innerHTML = `<div class="progdots">${Array.from({ length: N }, (_, k) => `<i class="${k < results.length ? (results[k] ? 'ok' : 'bad') : k === i ? 'cur' : ''}"></i>`).join('')}</div><div class="card"><div class="row"><span class="badge">${esc(P.topicById(task.topic).title)}</span><span class="badge ${task.level >= 3 ? 'r' : ''}">${['', 'базовый', 'средний', 'повышенный'][task.level]}</span></div><div id="tb" style="margin-top:8px"></div></div><div id="nx"></div>`;
      ctl = P.renderTask($('#tb'), task, { onResult: async res => { results.push(!!res.ok); await P.recordAnswer(task, res); $('#nx').innerHTML = `<button class="btn full" id="nb">${i + 1 >= N ? 'Итоги' : 'Следующая задача →'}</button>`; $('#nb').onclick = () => { i++; next(); }; } });
    };
    const finish = async () => {
      const ok = results.filter(Boolean).length, pct = ok / N;
      if (id !== 'mix') { const s = tState(id), box = pct >= .8 ? Math.min(5, (s.box || 0) + 1) : Math.max(0, (s.box || 0) - 1); await setTopic(id, { box, next: P.addDays(today(), INTERVALS[box]), read: s.read || pct >= .8 }); await completePlan(mode === 'review' ? 'review' : 'practice', id); }
      P.snd.play(pct >= .8 ? 'award' : 'term');
      view.innerHTML = `<div class="card form center"><div class="lbl">Протокол занятия</div><div class="big" style="margin:10px 0">${ok} / ${N}</div>${bar(pct, pct >= .8 ? 'k' : '')}<p>${pct >= .8 ? 'Отличная работа. Следующее повторение назначено с увеличенным интервалом.' : pct >= .5 ? 'Неплохо. Повторите типичные ошибки и решите ещё серию.' : 'Тема требует внимания: перечитайте учебник и разберите эталонные решения.'}</p>
<div class="btns"><button class="btn" id="again">Ещё серия</button>${id !== 'mix' ? `<button class="btn sec" data-go="topic/${id}/book">К учебнику</button>` : ''}</div><div class="btns"><button class="btn ghost" data-go="plan">Учебный план</button></div></div>`;
      $('#again').onclick = () => render();
    };
    next();
    return () => ctl && ctl.destroy();
  });

  /* ================= ЭКЗАМЕНАЦИОННАЯ КОМИССИЯ ================= */
  R('exam', async (a, b) => {
    if (a === 'theme' && b) { const t = P.topicById(b); const ex = P.buildExam('theme', { subj: t.subj, topics: [b], count: 8, time: 20, title: 'Контрольное испытание: ' + t.title }); await DB.putExam(ex); return go('run/' + ex.id); }
    if (a === 'full') { const ex = P.buildExam('full', { subj: b }); await DB.putExam(ex); return go('run/' + ex.id); }
    setTop('Экзаменационная комиссия', 'ЕГЭ-2027', false);
    const exams = await DB.exams(), open = exams.filter(e => !e.finished), done = exams.filter(e => e.finished);
    view.innerHTML = `<div class="card red"><div class="lbl">Государственная экзаменационная подготовка</div><h2>Пробные экзамены</h2><p class="small">Полный вариант по структуре ЕГЭ, таймер 3 ч 55 мин, автосохранение ответов, проверка и разбор ошибок.</p>
<div class="btns"><button class="btn gold" data-go="exam/full/math">Математика</button><button class="btn gold" data-go="exam/full/phys">Физика</button></div></div>
<div class="note small"><b>Достоверность.</b> ${P.EXAM_SPEC.math.doc}<br>${P.EXAM_SPEC.phys.doc}<br>Задания — авторские, составлены по образцу типов КИМ; открытый банк ФИПИ в приложение не встроен. Шкала перевода в 100-балльную систему не приводится: её утверждает Рособрнадзор.</div>
${open.length ? `<div class="card"><h3>Незавершённые</h3>${open.map(e => `<button class="tap row" style="padding:10px 0" data-go="run/${e.id}"><div class="grow"><b>${esc(e.title)}</b><div class="small muted">${new Date(e.started).toLocaleString('ru-RU')} · ответов ${Object.keys(e.answers).length}/${e.items.length}</div></div><span class="badge r">продолжить</span></button>`).join('')}</div>` : ''}
<div class="card"><h3>Конструктор варианта</h3>
<div class="lbl">Предмет</div><div class="chips" id="bs"><button class="chip on" data-v="math">Математика</button><button class="chip" data-v="phys">Физика</button></div>
<div class="lbl" style="margin-top:10px">Темы</div><div class="chips" id="bt"></div>
<div class="lbl" style="margin-top:10px">Сложность</div><div class="chips" id="bl"><button class="chip on" data-v="0">Любая</button><button class="chip" data-v="1">Базовая</button><button class="chip" data-v="2">До средней</button><button class="chip" data-v="3">Средняя и повышенная</button></div>
<div class="lbl" style="margin-top:10px">Количество заданий</div><div class="chips" id="bn">${[5, 10, 15, 20].map((n, i) => `<button class="chip${i === 1 ? ' on' : ''}" data-v="${n}">${n}</button>`).join('')}</div>
<div class="lbl" style="margin-top:10px">Таймер</div><div class="chips" id="bm">${[[0, 'Без таймера'], [20, '20 мин'], [40, '40 мин'], [60, '60 мин']].map(([v, n], i) => `<button class="chip${i ? '' : ' on'}" data-v="${v}">${n}</button>`).join('')}</div>
<button class="btn full" id="bgo" style="margin-top:12px">Сформировать вариант</button></div>
<div class="card"><h3>Входная диагностика</h3><p class="small">12 задач по ключевым темам математики. Результаты задают стартовый уровень и учебный план.</p><button class="btn sec full" data-go="diag">${S.profile.diagDone ? 'Пройти повторно' : 'Начать диагностику'}</button></div>
<div class="card"><h3>Результаты испытаний</h3>${done.length ? done.slice(0, 20).map(e => `<button class="tap row" style="padding:8px 0;border-bottom:1px dashed var(--line)" data-go="res/${e.id}"><div class="grow"><b class="small">${esc(e.title)}</b><div class="small muted">${new Date(e.started).toLocaleDateString('ru-RU')}</div></div><b class="mono">${e.result ? e.result.sum + '/' + e.result.max : '—'}</b></button>`).join('') : '<p class="small muted">Пока нет завершённых испытаний.</p>'}</div>`;
    let subj = 'math', lvl = 0, cnt = 10, tm = 0, sel = new Set();
    const drawT = () => { $('#bt').innerHTML = TOP(subj).filter(t => P.gensFor(t.id).length).map(t => `<button class="chip${sel.has(t.id) ? ' on' : ''}" data-v="${t.id}">${t.n}. ${esc(t.title)}</button>`).join(''); };
    const chips = (id, fn) => $(id).addEventListener('click', e => { const c = e.target.closest('.chip'); if (!c) return; fn(c); P.snd.play('toggle'); });
    chips('#bs', c => { subj = c.dataset.v; sel.clear(); $$('#bs .chip').forEach(x => x.classList.toggle('on', x === c)); drawT(); });
    chips('#bt', c => { const v = c.dataset.v; sel.has(v) ? sel.delete(v) : sel.add(v); c.classList.toggle('on'); });
    chips('#bl', c => { lvl = +c.dataset.v; $$('#bl .chip').forEach(x => x.classList.toggle('on', x === c)); });
    chips('#bn', c => { cnt = +c.dataset.v; $$('#bn .chip').forEach(x => x.classList.toggle('on', x === c)); });
    chips('#bm', c => { tm = +c.dataset.v; $$('#bm .chip').forEach(x => x.classList.toggle('on', x === c)); });
    drawT();
    $('#bgo').onclick = async () => { const topics = sel.size ? [...sel] : TOP(subj).filter(t => P.gensFor(t.id).length).map(t => t.id); const ex = P.buildExam('theme', { subj, topics, level: lvl, count: cnt, time: tm, title: 'Вариант из конструктора: ' + (subj === 'math' ? 'математика' : 'физика') }); await DB.putExam(ex); go('run/' + ex.id); };
  });
  R('diag', async () => { const ex = P.buildExam('diag'); await DB.putExam(ex); go('run/' + ex.id); });

  R('run', async id => {
    const ex = await DB.getExam(id); if (!ex) return go('exam'); if (ex.finished) return go('res/' + id);
    setTop(ex.title, ex.items.length + ' заданий', true);
    let cur = 0, ctl = null, saveT = null;
    const left = () => ex.limit ? Math.max(0, ex.limit - Math.floor((Date.now() - ex.started) / 1000)) : null;
    const tfmt = s => `${Math.floor(s / 3600)}:${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    const tick = () => { const l = left(); const el = $('#tmr'); if (l === null || !el) return; el.textContent = tfmt(l); if (l <= 0) { clearInterval(P._timer); P.toast('Время вышло. Вариант завершён.'); finishExam(); } };
    const show = () => {
      if (ctl) ctl.destroy(); const it = ex.items[cur], t = P.examTask(it);
      view.innerHTML = `<div class="row" style="margin-bottom:10px">${ex.limit ? '<span class="timer" id="tmr">—</span>' : '<span class="badge">без таймера</span>'}<span class="grow"></span><button class="btn sm sec" id="fin">Завершить</button></div>
<div class="qgrid">${ex.items.map((x, k) => `<button class="${k === cur ? 'cur ' : ''}${ex.answers[x.n] != null ? 'ans' : ''}" data-q="${k}">${x.n}</button>`).join('')}</div>
<div class="card" style="margin-top:12px"><div class="row"><b class="grow">Задание ${it.n}</b><span class="badge">${esc(it.label || '')}</span></div><div id="tb" style="margin-top:8px"></div></div>
<div class="btns"><button class="btn sec" id="prv" ${cur ? '' : 'disabled'}>‹ Назад</button><button class="btn" id="nxt">${cur < ex.items.length - 1 ? 'Далее ›' : 'К завершению'}</button></div>`;
      ctl = P.renderTask($('#tb'), t, { exam: true, saved: ex.answers[it.n], onAnswer: v => { ex.answers[it.n] = v; clearTimeout(saveT); saveT = setTimeout(() => DB.putExam(ex), 400); const b = $(`[data-q="${cur}"]`); if (b) b.classList.add('ans'); } });
      $('#prv').onclick = () => { cur--; show(); }; $('#nxt').onclick = () => { if (cur < ex.items.length - 1) { cur++; show(); } else confirmFinish(); };
      $('#fin').onclick = confirmFinish; $$('[data-q]').forEach(b => b.onclick = () => { cur = +b.dataset.q; show(); }); tick();
    };
    const confirmFinish = () => { const n = Object.keys(ex.answers).length; P.modal(`<h3>Завершить вариант?</h3><p>Дано ответов: ${n} из ${ex.items.length}. После завершения ответы изменить нельзя.</p><div class="btns"><button class="btn" id="yes">Завершить и проверить</button><button class="btn sec" data-close>Продолжить</button></div>`, sh => { $('#yes', sh).onclick = () => { P.closeModal(); finishExam(); }; }); };
    async function finishExam() {
      clearInterval(P._timer); if (ctl) ctl.destroy();
      ex.finished = true; ex.ended = Date.now(); ex.result = P.scoreExam(ex); await DB.putExam(ex);
      for (const it of ex.items) { if (it.ext) continue; const t = P.examTask(it), a = ex.answers[it.n]; let res = { ok: false, score: 0, max: 1 }; if (a != null) { const r = P.check(t, a); if (!r.invalid) res = r; } await P.recordAnswer(t, res, ex.kind); }
      if (ex.kind === 'diag') { const pr = { ...S.profile, diagDone: true }; await DB.set('profile', pr); for (const it of ex.items) { const t = P.examTask(it), a = ex.answers[it.n], r = a != null ? P.check(t, a) : { ok: false }; await setTopic(it.topic, { m: r.ok ? .6 : .1 }); } await DB.set('plan', null); }
      if (ex.kind === 'theme' && ex.topics && ex.topics.length === 1) await completePlan('exam', ex.topics[0]);
      await checkProgress(); P.snd.play('award'); go('res/' + ex.id);
    }
    clearInterval(P._timer); P._timer = setInterval(tick, 1000); show();
    return () => { clearInterval(P._timer); if (ctl) ctl.destroy(); DB.putExam(ex); };
  });

  R('res', async id => {
    const ex = await DB.getExam(id); if (!ex) return go('exam');
    ex.result = P.scoreExam(ex); await DB.putExam(ex);
    setTop('Протокол испытания', ex.title, true);
    const r = ex.result, dur = ex.ended ? Math.round((ex.ended - ex.started) / 60000) : null;
    view.innerHTML = `<div class="card form center"><span class="stamp" style="top:auto;bottom:10px">Проверено</span><div class="lbl">${esc(ex.title)}</div><div class="big" style="margin:10px 0">${r.sum} / ${r.max}</div>${bar(r.pct / 100, r.pct >= 80 ? 'k' : '')}<p class="small">${r.pct}% первичных баллов${dur != null ? ' · время ' + dur + ' мин' : ''}</p>
${ex.kind === 'full' ? '<p class="small muted">Перевод в тестовые баллы не выполняется — официальную шкалу публикует Рособрнадзор.</p>' : ''}${ex.kind === 'diag' ? '<p class="small">Стартовый уровень записан в личное дело, учебный план перестроен.</p>' : ''}</div>
<div class="card"><h3>Разбор по заданиям</h3><p class="small muted">Нажмите на номер, чтобы увидеть задание, ваш ответ и разбор ошибки.</p><div class="qgrid">${r.per.map((p, k) => `<button class="${p.ext ? (p.score == null ? '' : p.score === p.max ? 'ok' : p.score ? 'part' : 'bad') : p.ok ? 'ok' : p.score ? 'part' : 'bad'}" data-r="${k}">${p.n}</button>`).join('')}</div></div>
${r.per.some(p => p.ext) ? `<div class="card"><h3>Самооценка части 2</h3><p class="small muted">${P.EXT_NOTE}</p>${r.per.filter(p => p.ext).map(p => `<button class="tap row" style="padding:8px 0;border-bottom:1px dashed var(--line)" data-r="${r.per.indexOf(p)}"><span class="num">${p.n}</span><span class="grow small">${p.score == null ? 'не оценено' : 'оценка: ' + p.score + ' из ' + p.max}</span>›</button>`).join('')}</div>` : ''}
<div class="btns"><button class="btn" id="again">Новый вариант того же типа</button><button class="btn sec" id="same">Повторить этот же</button></div><div class="btns"><button class="btn ghost" data-go="exam">В комиссию</button></div>`;
    view.addEventListener('click', e => {
      const b = e.target.closest('[data-r]'); if (!b) return; const it = ex.items[+b.dataset.r], t = P.examTask(it), a = ex.answers[it.n];
      if (t.type === 'ext') {
        return P.modal(`<div class="row"><h3 class="grow">Задание ${it.n} · до ${t.max} б.</h3><button class="chip" data-close>✕</button></div><div class="task"><p>${t.q}</p></div><div class="lbl">Ваша запись</div><div class="ex small">${a && a.text ? esc(a.text).replace(/\n/g, '<br>') : '— нет записи —'}</div><details class="sol" open><summary>Эталонное решение</summary><div class="task"><p>${t.sol}</p></div></details><h3>Оцените решение</h3><div class="opts">${t.crit.map(([p, txt]) => `<button class="opt${a && a.self === p ? ' sel' : ''}" data-p="${p}"><span class="k">${p}</span><span>${txt}</span></button>`).join('')}</div>`, sh => sh.addEventListener('click', async ev => { const o = ev.target.closest('[data-p]'); if (!o) return; ex.answers[it.n] = { ...(a || {}), self: +o.dataset.p }; ex.result = P.scoreExam(ex); await DB.putExam(ex); P.closeModal(); render(); }));
      }
      let res = { ok: false, where: 'Ответ не дан', why: 'Задание пропущено.', max: 1 }; if (a != null) { const rr = P.check(t, a); if (!rr.invalid) res = rr; else res = { ok: false, where: 'Ответ не распознан', why: rr.msg, max: 1 }; }
      const ua = a == null ? '—' : t.type === 'choice' ? (a + 1) : t.type === 'match' ? a.map(x => x == null ? '?' : x + 1).join('') : t.steps ? a.steps.map((v, i) => (v || '—') + ' ' + ((a.units || [])[i] || '')).join('; ') : (a.value || '—') + ' ' + (a.unit || '');
      P.modal(`<div class="row"><h3 class="grow">Задание ${it.n}</h3><button class="chip" data-close>✕</button></div><div class="task"><div class="tq">${t.q}</div>${t.viz ? `<div class="vizbox">${t.viz}</div>` : ''}</div><p><b>Ваш ответ:</b> ${esc(ua)}</p>${feedbackHTML(t, res)}`);
    });
    $('#again').onclick = async () => { const nx = ex.kind === 'full' ? P.buildExam('full', { subj: ex.subj }) : ex.kind === 'diag' ? P.buildExam('diag') : P.buildExam('theme', { subj: ex.subj, topics: ex.topics, count: ex.items.length, time: ex.limit ? ex.limit / 60 : 0, title: ex.title }); await DB.putExam(nx); go('run/' + nx.id); };
    $('#same').onclick = async () => { const nx = { ...ex, id: 'ex' + Date.now(), started: Date.now(), answers: {}, finished: false, result: null, ended: null, title: ex.title.replace(/ \(повтор\)$/, '') + ' (повтор)' }; await DB.putExam(nx); go('run/' + nx.id); };
  });

  /* ================= ЛАБОРАТОРИИ ================= */
  R('labs', () => {
    setTop('Виртуальные лаборатории', 'Измени параметры — наблюдай результат', true);
    view.innerHTML = `<div class="card"><ul class="tl">${P.LABS.map((l, i) => `<li><button class="tap" data-go="lab/${l.id}"><span class="num">${i + 1}</span><span class="t"><b>${l.title}</b><small>${l.short}</small></span>›</button></li>`).join('')}</ul></div>`;
  });
  R('lab', async id => {
    const l = P.LABS.find(x => x.id === id); if (!l) return go('labs');
    setTop(l.title, 'Лаборатория', true);
    const seen = new Set(DB.get('labsSeen', [])); if (!seen.has(id)) { seen.add(id); await DB.set('labsSeen', [...seen]); checkProgress(); }
    const t = P.topicById(l.topic);
    view.innerHTML = `<div class="card" id="lb"></div>${t ? `<button class="btn sec full" data-go="topic/${t.id}/book">Теория: ${esc(t.title)} →</button>` : ''}`;
    return l.init($('#lb'));
  });

  /* ================= БИБЛИОТЕКА ================= */
  const CONST = [['Ускорение свободного падения', 'g ≈ 9,8 м/с² (в задачах ЕГЭ часто 10 м/с²)'], ['Гравитационная постоянная', 'G = 6,67·10⁻¹¹ Н·м²/кг²'], ['Число Авогадро', 'N<sub>A</sub> = 6,02·10²³ моль⁻¹'], ['Постоянная Больцмана', 'k = 1,38·10⁻²³ Дж/К'], ['Универсальная газовая постоянная', 'R = 8,31 Дж/(моль·К)'], ['Элементарный заряд', 'e = 1,6·10⁻¹⁹ Кл'], ['Коэффициент в законе Кулона', 'k = 9·10⁹ Н·м²/Кл²'], ['Электрическая постоянная', 'ε<sub>0</sub> = 8,85·10⁻¹² Ф/м'], ['Постоянная Планка', 'h = 6,63·10⁻³⁴ Дж·с'], ['Скорость света в вакууме', 'c = 3·10⁸ м/с'], ['Масса электрона', 'm<sub>e</sub> = 9,1·10⁻³¹ кг'], ['Масса протона', 'm<sub>p</sub> = 1,67·10⁻²⁷ кг'], ['1 электронвольт', '1 эВ = 1,6·10⁻¹⁹ Дж'], ['Удельная теплоёмкость воды', 'c = 4200 Дж/(кг·°C)'], ['Плотность воды', 'ρ = 1000 кг/м³']];
  const UNITS_T = [['Метр (м)', 'основная единица длины SI'], ['Килограмм (кг)', 'основная единица массы SI'], ['Секунда (с)', 'основная единица времени SI'], ['Ампер (А)', 'основная единица силы тока SI'], ['Кельвин (К)', 'основная единица температуры SI; T = t + 273'], ['Моль', 'основная единица количества вещества'], ['Ньютон (Н)', '1 Н = 1 кг·м/с²'], ['Джоуль (Дж)', '1 Дж = 1 Н·м'], ['Ватт (Вт)', '1 Вт = 1 Дж/с'], ['Паскаль (Па)', '1 Па = 1 Н/м²'], ['Кулон (Кл)', '1 Кл = 1 А·с'], ['Вольт (В)', '1 В = 1 Дж/Кл'], ['Ом', '1 Ом = 1 В/А'], ['Тесла (Тл)', '1 Тл = 1 Н/(А·м)'], ['Вебер (Вб)', '1 Вб = 1 Тл·м²'], ['Герц (Гц)', '1 Гц = 1/с'], ['Фарад (Ф)', '1 Ф = 1 Кл/В'], ['Диоптрия (дптр)', '1 дптр = 1/м']];
  function libEntries() {
    const out = [];
    P.TOPICS.forEach(t => { t.f.forEach(([n, b], i) => out.push({ id: t.id + 'f' + i, cat: t.subj, type: 'Формула', name: n, body: b, topic: t.id })); t.defs.forEach(([n, b], i) => out.push({ id: t.id + 'd' + i, cat: t.subj, type: 'Определение', name: n, body: b, topic: t.id })); });
    CONST.forEach(([n, b], i) => out.push({ id: 'c' + i, cat: 'const', type: 'Константа', name: n, body: b }));
    UNITS_T.forEach(([n, b], i) => out.push({ id: 'u' + i, cat: 'const', type: 'Единица SI', name: n, body: b }));
    return out;
  }
  R('lib', () => {
    setTop('Научная библиотека', 'Формулы · определения · константы', true);
    const all = libEntries(); let q = '', cat = 'all', typ = 'all';
    view.innerHTML = `<input class="txtin" id="lq" type="search" placeholder="Поиск: «импульс», «sin», «линза»…" autocomplete="off">
<div class="chips" id="lc" style="margin:10px 0">${[['all', 'Все'], ['math', 'Математика'], ['phys', 'Физика'], ['const', 'Константы и единицы'], ['fav', '★ Избранное']].map(([v, n], i) => `<button class="chip${i ? '' : ' on'}" data-v="${v}">${n}</button>`).join('')}</div>
<div class="chips" id="ly" style="margin-bottom:10px">${[['all', 'Любой тип'], ['Формула', 'Формулы'], ['Определение', 'Определения']].map(([v, n], i) => `<button class="chip${i ? '' : ' on'}" data-v="${v}">${n}</button>`).join('')}</div><div class="card" id="ll"></div>`;
    const strip = s => s.replace(/<[^>]+>/g, '').toLowerCase();
    const draw = () => {
      const favs = new Set(S.favs), L = all.filter(e => (cat === 'all' || e.cat === cat || (cat === 'fav' && favs.has(e.id))) && (typ === 'all' || e.type === typ) && (!q || strip(e.name + ' ' + e.body + ' ' + (e.topic ? P.topicById(e.topic).title : '')).includes(q)));
      $('#ll').innerHTML = `<div class="small muted">Найдено: ${L.length}</div>` + L.slice(0, 150).map(e => { const t = e.topic && P.topicById(e.topic); return `<div class="lib-item"><div class="row"><div class="grow"><span class="badge${e.type === 'Формула' ? ' r' : ''}">${e.type}</span> <b>${e.name}</b></div><button class="fav${favs.has(e.id) ? ' on' : ''}" data-fav="${e.id}" aria-label="В избранное">★</button></div><div class="fm" style="font-size:16px;text-align:left;white-space:normal">${e.body}</div>${t ? `<div class="small"><a href="#topic/${t.id}/book">${esc(t.title)}</a>${t.viz || P.LABS.find(l => l.topic === t.id) ? ` · <a href="#topic/${t.id}/viz">визуализация</a>` : ''}</div>` : ''}</div>`; }).join('');
    };
    $('#lq').addEventListener('input', e => { q = e.target.value.trim().toLowerCase(); draw(); });
    $('#lc').onclick = e => { const c = e.target.closest('.chip'); if (!c) return; cat = c.dataset.v; $$('#lc .chip').forEach(x => x.classList.toggle('on', x === c)); draw(); };
    $('#ly').onclick = e => { const c = e.target.closest('.chip'); if (!c) return; typ = c.dataset.v; $$('#ly .chip').forEach(x => x.classList.toggle('on', x === c)); draw(); };
    $('#ll').onclick = async e => { const f = e.target.closest('[data-fav]'); if (!f) return; const s = new Set(S.favs); s.has(f.dataset.fav) ? s.delete(f.dataset.fav) : s.add(f.dataset.fav); await DB.set('favs', [...s]); P.snd.play('toggle'); draw(); };
    draw();
  });

  /* ================= ПЛАН ================= */
  R('plan', async () => {
    setTop('Учебный план', 'Адаптивное расписание', true);
    const pl = await getPlan(), pr = S.profile, daysLeft = P.daysBetween(today(), pr.examDate);
    view.innerHTML = `<div class="card"><div class="row"><div class="grow"><div class="lbl">Сегодня · ${today().split('-').reverse().join('.')}</div><h3>${pl.items.filter(i => i.done).length} из ${pl.items.length} выполнено</h3></div><b class="mono">${pl.budget} мин</b></div>${bar(pl.items.length ? pl.items.filter(i => i.done).length / pl.items.length : 0, 'k')}
<ul class="tl">${pl.items.map(i => planItemHTML(i, true)).join('') || '<li class="small muted" style="padding:10px 0">Пунктов нет.</li>'}</ul>
<div class="btns"><button class="btn sec" id="add">+ Добавить</button><button class="btn sec" id="regen">Пересобрать</button></div></div>
<div class="note small">План учитывает диагностику, освоение тем, ошибки и интервалы повторения (1, 2, 4, 7, 15, 30 дней). Невыполненные пункты переносятся на следующий день без штрафов — звания зависят только от реальных результатов. До ориентировочной даты экзамена: ${daysLeft} дн.</div>
<div class="card"><h3>Ближайшие повторения</h3>${P.TOPICS.filter(t => tState(t.id).next).sort((a, b) => (tState(a.id).next > tState(b.id).next ? 1 : -1)).slice(0, 8).map(t => `<div class="row small" style="padding:6px 0;border-bottom:1px dashed var(--line)"><span class="grow">${esc(t.title)}</span><span class="mono">${tState(t.id).next.split('-').reverse().join('.')}</span></div>`).join('') || '<p class="small muted">Появятся после изучения тем.</p>'}</div>`;
    bindPlanToggles(pl);
    $('#regen').onclick = async () => { const np = makePlan({ items: pl.items.filter(i => !i.done) }); np.items = pl.items.filter(i => i.done).concat(np.items.filter(i => !pl.items.find(j => j.done && j.topic === i.topic && j.type === i.type))); await DB.set('plan', np); render(); };
    $('#add').onclick = () => P.modal(`<h3>Добавить пункт</h3><div class="lbl">Тип</div><select class="txtin" id="at">${Object.entries(TYPE_N).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select><div class="lbl" style="margin-top:8px">Тема</div><select class="txtin" id="atp">${P.TOPICS.map(t => `<option value="${t.id}">${t.subj === 'math' ? 'М' : 'Ф'}${t.n}. ${esc(t.title)}</option>`).join('')}</select><div class="btns"><button class="btn" id="aok">Добавить</button><button class="btn sec" data-close>Отмена</button></div>`, sh => {
      $('#aok', sh).onclick = async () => { const type = $('#at', sh).value; pl.items.push({ id: 'i' + Date.now(), type, topic: $('#atp', sh).value, min: { lesson: 15, practice: 10, review: 5, exam: 20 }[type], done: false }); await DB.set('plan', pl); P.closeModal(); render(); };
    });
  });

  /* ================= СТАТИСТИКА ================= */
  R('stats', async () => {
    setTop('Статистика', 'Сводка успеваемости', true);
    const st = S.stats, x = await computeXP(), exams = (await DB.exams()).filter(e => e.finished), att = await DB.attempts();
    const weak = P.TOPICS.filter(t => { const s = tState(t.id); return s.att >= 3 && s.m < .5; }).sort((a, b) => tState(a.id).m - tState(b.id).m);
    const ms = P.TOPICS.filter(mastered), ds = S.days, last14 = Array.from({ length: 14 }, (_, i) => P.addDays(today(), i - 13));
    const mx = Math.max(5, ...last14.map(d => (ds[d] || {}).s || 0));
    const bySubj = s => { const a = att.filter(q => q.subj === s); return a.length ? Math.round(a.filter(q => q.ok).length / a.length * 100) : 0; };
    view.innerHTML = `<div class="card"><div class="grid3" style="grid-template-columns:repeat(3,1fr)">${ring(progress(), 'Общий')}${ring(progress('math'), 'Матем.')}${ring(progress('phys'), 'Физика', '#b8954a')}</div></div>
<div class="grid2"><div class="card center"><div class="lbl">Решено задач</div><div class="big">${st.solved}</div></div><div class="card center"><div class="lbl">Верных ответов</div><div class="big">${st.solved ? Math.round(st.correct / st.solved * 100) : 0}%</div></div>
<div class="card center"><div class="lbl">Математика / физика</div><div class="big" style="font-size:24px">${bySubj('math')}% / ${bySubj('phys')}%</div></div><div class="card center"><div class="lbl">Лучшая серия</div><div class="big">${st.best}</div></div></div>
<div class="card"><h3>Активность за 14 дней</h3><div style="display:flex;align-items:flex-end;gap:4px;height:90px">${last14.map(d => { const v = (ds[d] || {}).s || 0, c = (ds[d] || {}).c || 0; return `<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;height:100%" title="${d}: ${v}"><div style="height:${v / mx * 100}%;background:var(--gold);border-radius:3px 3px 0 0;position:relative"><div style="position:absolute;bottom:0;left:0;right:0;height:${v ? c / v * 100 : 0}%;background:var(--ok);border-radius:3px 3px 0 0"></div></div></div>`; }).join('')}</div><p class="small muted">Высота — решено задач, зелёная часть — верно.</p></div>
<div class="card"><h3>Освоенные темы (${ms.length})</h3>${ms.length ? ms.map(t => `<span class="badge k" style="margin:2px">${esc(t.title)}</span>`).join('') : '<p class="small muted">Тема считается освоенной при уровне ≥ 80% и не менее 5 решённых задачах.</p>'}</div>
<div class="card"><h3>Слабые темы</h3>${weak.length ? weak.slice(0, 8).map(t => `<button class="tap row" style="padding:8px 0" data-go="practice/${t.id}"><span class="grow small">${esc(t.title)}</span><span class="badge r">${Math.round(tState(t.id).m * 100)}%</span></button>`).join('') : '<p class="small muted">Не выявлено (нужно хотя бы 3 попытки по теме).</p>'}</div>
<div class="card"><h3>Результаты испытаний</h3>${exams.length ? exams.slice(0, 10).map(e => `<button class="tap row" style="padding:6px 0" data-go="res/${e.id}"><span class="grow small">${esc(e.title)}</span><b class="mono">${e.result ? e.result.pct + '%' : '—'}</b></button>`).join('') : '<p class="small muted">Нет данных.</p>'}</div>
<div class="card"><h3>Очки звания: ${x.xp}</h3><p class="small">Верные ответы ×2 · освоенные темы ×40 · изученные темы ×8 · испытания (процент/5) · активные дни ×5. Время в приложении не учитывается.</p></div>`;
  });

  /* ================= ЗВАНИЯ И НАГРАДЫ ================= */
  R('awards', async () => {
    setTop('Звания и награды', 'Удостоверение и достижения', true);
    const x = await computeXP(), r = rankOf(x), got = S.ach, hist = DB.get('rankHist', {}), pr = S.profile;
    const nx = r < RANKS.length - 1 ? r + 1 : null;
    view.innerHTML = `<div class="cert"><div class="ttl">Союз знания и дисциплины</div><div class="motto">Удостоверение № 001-${String(r).padStart(2, '0')}</div><div style="margin:10px auto">${P.emblem('emblem')}</div><div class="small">Настоящим удостоверяется, что</div><div class="nm">${esc(pr.name || 'Курсант')}</div><div class="small">имеет учебное звание</div><h2 style="color:var(--red);margin:8px 0">${RANKS[r]}</h2><div>${insignia(r, 70)}</div><div class="small muted" style="margin-top:8px">${hist[r] ? 'Присвоено ' + hist[r].split('-').reverse().join('.') : 'Начальное звание'}</div><span class="stamp" style="top:auto;bottom:14px">Проект 200</span></div>
<div class="card" style="margin-top:12px"><h3>Следующее звание</h3>${nx != null ? `<p><b>${RANKS[nx]}</b>: нужно ${RANK_XP[nx]} очков (есть ${x.xp}) и освоенных тем: ${RANK_MAST[nx]} (есть ${x.mast}).</p>${bar(Math.min(x.xp / RANK_XP[nx], x.mast / Math.max(1, RANK_MAST[nx]), 1))}` : '<p>Высшее звание достигнуто.</p>'}</div>
<div class="card"><h3>Табель о рангах</h3>${RANKS.map((n, i) => `<div class="row" style="padding:6px 0;border-bottom:1px dashed var(--line);opacity:${i <= r ? 1 : .55}">${insignia(i, 34)}<span class="grow"><b>${n}</b><div class="small muted">${RANK_XP[i]} очков · ${RANK_MAST[i]} осв. тем</div></span>${i <= r ? '<span class="badge k">✓</span>' : ''}</div>`).join('')}</div>
<div class="card"><h3>Достижения (${Object.keys(got).length}/${ACH.length})</h3>${ACH.map(([id, n, d]) => `<div class="ach${got[id] ? '' : ' off'}"><svg class="md" viewBox="0 0 24 24" style="color:${got[id] ? '#b8954a' : '#8a6a52'}"><use href="#i-medal"/></svg><div class="grow"><b>${n}</b><div class="small muted">${d}${got[id] ? ' · ' + got[id].split('-').reverse().join('.') : ''}</div></div></div>`).join('')}</div>`;
  });

  /* ================= НАСТРОЙКИ ================= */
  const CORE_FILES = ['./', 'index.html', 'styles.css', 'core.js', 'database.js', 'content-math.js', 'content-physics.js', 'tasks.js', 'viz.js', 'labs.js', 'exam.js', 'app.js', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-180.png'];
  R('settings', async () => {
    setTop('Настройки', 'Служебный раздел', true);
    const pr = S.profile, st = S.settings, pers = await DB.persisted();
    view.innerHTML = `<div class="card"><h3>Личные данные</h3><div class="lbl">Имя в личном деле</div><input class="txtin" id="nm" value="${esc(pr.name)}" maxlength="40">
<div class="lbl" style="margin-top:10px">Время занятий в день</div><div class="chips" id="mn">${MIN_OPTS.map(m => `<button class="chip${pr.minutes === m ? ' on' : ''}" data-v="${m}">${m === 120 ? 'более 90' : m} мин</button>`).join('')}</div>
<div class="lbl" style="margin-top:10px">Ориентировочная дата экзамена</div><input class="txtin" type="date" id="ed" value="${pr.examDate}"><p class="small muted">Официальное расписание ЕГЭ-2027 утверждается отдельно; укажите дату, когда она станет известна.</p></div>
<div class="card"><h3>Звук</h3><div class="row"><span class="grow">Звуковое оформление</span><button class="chip${st.sound ? ' on' : ''}" id="so">${st.sound ? 'Вкл.' : 'Выкл.'}</button></div>${P.slider('vol', 'Громкость', 0, 1, .05, st.vol)}<button class="btn sm sec" id="tst">Проверить звук</button><p class="small muted">Звуки синтезируются на устройстве и звучат только в ответ на ваши действия. На iPhone беззвучный режим может заглушать звук.</p></div>
<div class="card"><h3>Данные и резервные копии</h3><p class="small">Хранилище: <b>${DB.mode === 'idb' ? 'IndexedDB' : 'localStorage (резервный режим)'}</b> · постоянное хранение: <b>${pers ? 'разрешено' : 'не подтверждено браузером'}</b></p>
<div class="btns"><button class="btn" id="exp">Экспорт</button><button class="btn sec" id="imp">Импорт</button></div><input type="file" id="impf" accept=".json,application/json" class="hide">
<div class="btns"><button class="btn sm ghost" id="per">Запросить постоянное хранение</button></div>
<p class="small muted">Браузер может очистить данные сайта (например, при нехватке памяти или если Safari долго не открывал сайт). Делайте экспорт регулярно — файл можно сохранить в «Файлы» и импортировать после переустановки. Данные установленного на экран «Домой» приложения и вкладки Safari хранятся раздельно.</p></div>
<div class="card"><h3>Офлайн-режим</h3><div id="off" class="small">Проверка…</div><div class="btns"><button class="btn sm sec" id="recache">Обновить кэш</button></div></div>
<div class="card"><h3>Сброс</h3><button class="btn ghost full" id="wipe">Удалить все данные</button></div>
<div class="card small muted">ПРОЕКТ 200 · версия ${P.VERSION} · формат данных ${DB.SCHEMA}. Без регистрации, рекламы и отправки данных: всё хранится только на этом устройстве. Учебные тексты и задачи — авторские; сведения о структуре ЕГЭ — по материалам ФИПИ (проект КИМ 2027 для математики, КИМ 2026 для физики).</div>`;
    const save = async patch => { await DB.set('profile', { ...S.profile, ...patch }); };
    $('#nm').onchange = e => save({ name: e.target.value.trim() });
    $('#mn').onclick = async e => { const c = e.target.closest('.chip'); if (!c) return; $$('#mn .chip').forEach(x => x.classList.toggle('on', x === c)); await save({ minutes: +c.dataset.v }); await DB.set('plan', null); P.toast('План пересоберётся с новым временем'); };
    $('#ed').onchange = e => e.target.value && save({ examDate: e.target.value });
    $('#so').onclick = async e => { const s = { ...S.settings, sound: !S.settings.sound }; await DB.set('settings', s); P.snd.set(s.sound, s.vol); e.target.classList.toggle('on', s.sound); e.target.textContent = s.sound ? 'Вкл.' : 'Выкл.'; };
    P.bind(view, ['vol'], async () => { const s = { ...S.settings, vol: P.val(view, 'vol') }; P.snd.set(s.sound, s.vol); await DB.set('settings', s); });
    $('#tst').onclick = () => P.snd.play('boot');
    $('#exp').onclick = async () => {
      const data = await DB.exportAll(), txt = JSON.stringify(data), name = `proekt200-${today()}.json`, file = new File([txt], name, { type: 'application/json' });
      try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'ПРОЕКТ 200 — резервная копия' }); return; } } catch (e) { if (e.name === 'AbortError') return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); P.toast('Файл резервной копии сформирован');
    };
    $('#imp').onclick = () => $('#impf').click();
    $('#impf').onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      try { const data = JSON.parse(await f.text()), err = DB.validate(data); if (err) throw new Error(err);
        P.modal(`<h3>Восстановить из копии?</h3><p class="small">Копия от ${new Date(data.exported).toLocaleString('ru-RU')}, версия приложения ${esc(data.appVersion || '?')}. Текущие данные будут заменены.</p><div class="btns"><button class="btn" id="iok">Восстановить</button><button class="btn sec" data-close>Отмена</button></div>`, sh => { $('#iok', sh).onclick = async () => { await DB.importAll(data); P.closeModal(); applySettings(); P.toast('Данные восстановлены'); go('home'); }; });
      } catch (er) { P.toast('Импорт невозможен: ' + er.message, 4000); }
      e.target.value = '';
    };
    $('#per').onclick = async () => { const ok = await DB.persist(); P.toast(ok ? 'Браузер разрешил постоянное хранение' : 'Браузер не подтвердил постоянное хранение (на iOS это решает система)'); render(); };
    $('#wipe').onclick = () => P.modal('<h3>Удалить все данные?</h3><p>Прогресс, ответы, план и достижения будут удалены без возможности восстановления (если нет резервной копии).</p><div class="btns"><button class="btn" id="wok">Удалить</button><button class="btn sec" data-close>Отмена</button></div>', sh => { $('#wok', sh).onclick = async () => { await DB.wipe(); P.closeModal(); go('onboard'); }; });
    const offEl = $('#off');
    const checkOff = async () => {
      if (!('serviceWorker' in navigator) || !('caches' in window)) { offEl.innerHTML = 'Браузер не поддерживает Service Worker — офлайн-режим недоступен.'; return; }
      if (!isSecureContext) { offEl.innerHTML = 'Страница открыта не по HTTPS — Service Worker не работает. Откройте приложение по ссылке GitHub Pages (https://…).'; return; }
      const reg = await navigator.serviceWorker.getRegistration(); const keys = await caches.keys(); let n = 0;
      for (const k of keys.filter(k => k.startsWith('p200-'))) { const c = await caches.open(k); for (const f of CORE_FILES) if (await c.match(new Request(f, { mode: 'same-origin' })) || await c.match(f)) n++; }
      const ok = reg && reg.active && n >= CORE_FILES.length;
      offEl.innerHTML = `Service Worker: <b>${reg && reg.active ? 'активен' : 'не активен'}</b><br>Файлов в кэше: <b>${Math.min(n, CORE_FILES.length)} из ${CORE_FILES.length}</b><br>${ok ? '<span class="badge k">Готово к работе без интернета</span>' : '<span class="badge r">Не все файлы сохранены — откройте приложение с интернетом и нажмите «Обновить кэш»</span>'}`;
    };
    $('#recache').onclick = async () => { const reg = await navigator.serviceWorker?.getRegistration(); if (reg && reg.active) reg.active.postMessage('recache'); P.toast('Обновление кэша…'); setTimeout(checkOff, 2500); };
    checkOff().catch(e => offEl.textContent = 'Ошибка проверки: ' + e.message);
  });

  /* ================= ПЕРВЫЙ ЗАПУСК ================= */
  R('onboard', step => {
    setTop('Проект 200', 'Регистрация личного дела');
    $('#nav').classList.add('hide');
    const pr = S.profile;
    if (!step) {
      view.innerHTML = `<div class="card form center">${P.emblem('emblem')}<h1 style="margin:10px 0">Проект 200</h1><div class="motto">Знание. Дисциплина. Совершенство.</div><div class="sep"></div><div class="goal">Математика — 100 баллов.<br>Физика — 100 баллов.<br><b style="color:var(--red)">Проект 200 — выполнить.</b></div><div class="sep"></div>
<p class="small">Персональная система подготовки к ЕГЭ-2027. Работает без регистрации, данные хранятся только на этом устройстве.</p>
<div class="lbl" style="text-align:left">Как к вам обращаться</div><input class="txtin" id="nm" placeholder="Имя (необязательно)" maxlength="40" value="${esc(pr.name)}">
<div class="lbl" style="text-align:left;margin-top:12px">Сколько времени в день вы готовы заниматься?</div><div class="chips" id="mn" style="justify-content:center">${MIN_OPTS.map(m => `<button class="chip${pr.minutes === m ? ' on' : ''}" data-v="${m}">${m === 120 ? 'более 90' : m} мин</button>`).join('')}</div>
<div class="row" style="margin-top:12px"><span class="grow small" style="text-align:left">Звуковое оформление</span><button class="chip on" id="so">Вкл.</button></div>
<button class="btn full" id="nx" style="margin-top:16px">Завести личное дело</button></div>`;
      let minutes = pr.minutes || 40, snd = true;
      $('#mn').onclick = e => { const c = e.target.closest('.chip'); if (!c) return; minutes = +c.dataset.v; $$('#mn .chip').forEach(x => x.classList.toggle('on', x === c)); };
      $('#so').onclick = e => { snd = !snd; e.target.classList.toggle('on', snd); e.target.textContent = snd ? 'Вкл.' : 'Выкл.'; };
      $('#nx').onclick = async () => { await DB.set('profile', { ...pr, name: $('#nm').value.trim(), minutes }); await DB.set('settings', { ...S.settings, sound: snd }); applySettings(); P.snd.play('boot'); go('onboard/2'); };
      return;
    }
    view.innerHTML = `<div class="card form"><h2>Определение начального уровня</h2><p><b>Математика.</b> Ваш уровень неизвестен — пройдите входную диагностику: 12 задач по ключевым темам (~20–30 минут, без таймера). По результатам приложение отметит сильные и слабые темы и построит план.</p><p><b>Физика.</b> Курс начинается с абсолютного нуля — с темы «Что такое физика». Диагностика не требуется.</p>
<button class="btn full" id="dg">Пройти диагностику</button><button class="btn sec full" id="sk" style="margin-top:8px">Позже — сразу к занятиям</button></div>`;
    const fin = async d => { await DB.set('profile', { ...S.profile, onboarded: true }); await DB.persist(); $('#nav').classList.remove('hide'); go(d ? 'diag' : 'home'); };
    $('#dg').onclick = () => fin(true); $('#sk').onclick = () => fin(false);
  });

  /* ---------- запуск ---------- */
  function applySettings() { const s = S.settings; P.snd.set(s.sound, s.vol); }
  async function boot() {
    await DB.init(); applySettings();
    if (S.profile.onboarded) $('#nav').classList.remove('hide'); else $('#nav').classList.add('hide');
    $('#boot').classList.add('out'); setTimeout(() => $('#boot').remove(), 500);
    await render();
    if ('serviceWorker' in navigator && isSecureContext && !window.P200_SINGLE) {
      try {
        const reg = await navigator.serviceWorker.register('sw.js');
        const showUpd = w => { if (P.$('.upd')) return; const d = document.createElement('div'); d.className = 'upd'; d.innerHTML = '<span class="grow">Доступна новая версия приложения</span><button class="btn sm sec">Обновить</button>'; document.body.appendChild(d); d.querySelector('button').onclick = () => { w.postMessage('skip'); }; };
        if (reg.waiting && navigator.serviceWorker.controller) showUpd(reg.waiting);
        reg.addEventListener('updatefound', () => { const w = reg.installing; w && w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) showUpd(w); }); });
        let reloaded = false; navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloaded) return; reloaded = true; location.reload(); });
      } catch (e) { console.warn('SW', e); }
    }
  }
  boot();
})();
