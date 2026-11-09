/* ПРОЕКТ 200 — Экзаменационная комиссия: структура вариантов, сборка, подсчёт баллов */
'use strict';
(function () {
  /* Структура по проекту КИМ ЕГЭ-2027 (ФИПИ, август 2026) для математики и по КИМ 2026 для физики.
     Номера заданий части 1 сгруппированы по темам приближённо — сверяйтесь с утверждённой демоверсией. */
  P.EXAM_SPEC = {
    math: {
      title: 'Профильная математика', time: 235, doc: 'Проект КИМ ЕГЭ-2027 (ФИПИ, август 2026): 20 заданий, максимум 33 первичных балла. Распределение тем по номерам части 1 в тренажёре ориентировочное.',
      part1: [
        [1, 'Планиметрия', ['m_rtri', 'm_tri_angle', 'm_inscribed', 'm_trap']], [2, 'Векторы', ['m_vec']], [3, 'Стереометрия', ['m_box', 'm_cyl', 'm_scale']],
        [4, 'Классическая вероятность', ['m_prob']], [5, 'Вероятности сложных событий', ['m_prob_ind', 'm_prob_atl']], [6, 'Случайные величины (новое)', ['m_rv']],
        [7, 'Вычисления и преобразования', ['m_pow', 'm_root', 'm_log', 'm_trigval', 'm_trig_id', 'm_frac']], [8, 'Производная и первообразная', ['m_deriv_val', 'm_integral', 'm_antider']],
        [9, 'Уравнения', ['m_lin', 'm_quad', 'm_expeq', 'm_logeq']], [10, 'Прикладная задача', ['m_model']], [11, 'Текстовая задача', ['m_motion', 'm_work', 'm_mix']],
        [12, 'Графики и функции', ['m_parabola_read', 'm_line2pts', 'm_vertex', 'm_extr']], [13, 'Экономическая задача (краткий ответ, по проекту 2027)', ['m_credit_diff', 'm_annuity', 'm_deposit']]
      ],
      part2: [14, 15, 16, 17, 18, 19, 20]
    },
    phys: {
      title: 'Физика', time: 235, doc: 'Структура КИМ ЕГЭ 2026: 26 заданий, максимум 45 первичных баллов; по данным о проекте 2027 изменений не заявлено. Баллы части 1 в тренажёре упрощены (число — 1, соответствие — 2), поэтому максимум тренировочного варианта отличается от 45.',
      part1: [
        [1, 'Кинематика', ['p_accel', 'p_vt', 'p_fall', 'p_uni']], [2, 'Динамика', ['p_n2', 'p_lift', 'p_fric', 'p_incl', 'p_hooke', 'p_grav']], [3, 'Законы сохранения', ['p_drop', 'p_kin', 'p_inel', 'p_work', 'p_power', 'p_imp']],
        [4, 'Статика, колебания, волны', ['p_lever', 'p_period', 'p_pend', 'p_wave', 'p_arch']], [5, 'Механика: анализ явлений', ['p_concept'], { topics: ['p7', 'p8', 'p9', 'p11', 'p14', 'p17', 'p18', 'p19'] }], [6, 'Механика: соответствие', ['p_match'], { area: 'mech' }],
        [7, 'МКТ', ['p_moles', 'p_iso', 'p_ekin_T']], [8, 'Термодинамика', ['p_heat', 'p_first', 'p_carnot']], [9, 'МКТ и термодинамика: анализ', ['p_concept'], { topics: ['p20', 'p21'] }], [10, 'Термодинамика: соответствие', ['p_match'], { area: 'thermo' }],
        [11, 'Электростатика', ['p_coul', 'p_cap']], [12, 'Постоянный ток', ['p_ohm', 'p_pel', 'p_emf', 'p_circ']], [13, 'Магнетизм и индукция', ['p_ampere', 'p_lorentz', 'p_ind', 'p_rod']], [14, 'Оптика', ['p_lens', 'p_dioptr', 'p_refr']],
        [15, 'Электродинамика: анализ', ['p_concept'], { topics: ['p22', 'p23', 'p24', 'p25', 'p26', 'p27'] }], [16, 'Электродинамика: соответствие', ['p_match'], { area: 'electro' }],
        [17, 'Квантовая физика', ['p_photo', 'p_decay']], [18, 'Ядерная физика', ['p_nucl']], [19, 'Измерения', ['p_scale']], [20, 'Методология и основы', ['p_concept'], { topics: ['p1', 'p2', 'p4', 'p28'] }]
      ],
      part2: [21, 22, 23, 24, 25, 26]
    }
  };

  P.buildExam = function (kind, o = {}) {
    const r = P.rng(o.seed || P.seed()), items = [];
    if (kind === 'full') {
      const sp = P.EXAM_SPEC[o.subj];
      sp.part1.forEach(([n, label, gens, ex]) => { const gid = r.pick(gens), opts = {}; if (ex && ex.topics) opts.topic = r.pick(ex.topics); if (ex && ex.area) opts.area = ex.area; items.push({ n, label, gid, seed: P.seed(), opts, part: 1 }); });
      sp.part2.forEach(n => { const pool = P.EXT.filter(e => e.subj === o.subj && e.num === n); if (pool.length) { const e = r.pick(pool); items.push({ n, label: 'Развёрнутый ответ', ext: e.id, part: 2 }); } });
      return { id: 'ex' + Date.now(), kind, subj: o.subj, title: 'Пробный ЕГЭ: ' + sp.title, started: Date.now(), limit: sp.time * 60, items, answers: {}, finished: false };
    }
    if (kind === 'theme' || kind === 'control') {
      let gens = []; (o.topics || []).forEach(t => P.gensFor(t).forEach(g => { const L = P.GEN[g].level; if (!o.level || (o.level === 1 && L === 1) || (o.level === 2 && L <= 2) || (o.level === 3 && L >= 2)) gens.push([g, t]); }));
      if (!gens.length) (o.topics || []).forEach(t => P.gensFor(t).forEach(g => gens.push([g, t])));
      gens = r.shuffle(gens); const n = o.count || 10;
      for (let i = 0; i < n && gens.length; i++) { const [gid, t] = gens[i % gens.length]; items.push({ n: i + 1, label: P.topicById(t).title, gid, seed: P.seed(), opts: { topic: t }, part: 1 }); }
      return { id: 'ex' + Date.now(), kind, subj: o.subj, title: o.title || 'Тематическое испытание', started: Date.now(), limit: o.time ? o.time * 60 : null, items, answers: {}, finished: false, topics: o.topics };
    }
    if (kind === 'diag') {
      const T = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm8', 'm10', 'm11', 'm13', 'm14', 'm17'];
      T.forEach((t, i) => { const gs = P.gensFor(t).filter(g => P.GEN[g].level <= 2); items.push({ n: i + 1, label: P.topicById(t).title, gid: r.pick(gs), seed: P.seed(), opts: { topic: t }, part: 1, topic: t }); });
      return { id: 'ex' + Date.now(), kind, subj: 'math', title: 'Входная диагностика: математика', started: Date.now(), limit: null, items, answers: {}, finished: false };
    }
  };
  P.examTask = it => it.ext ? Object.assign({ type: 'ext' }, P.EXT.find(e => e.id === it.ext)) : P.makeTask(it.gid, it.seed, it.opts);
  P.scoreExam = function (ex) {
    let sum = 0, max = 0; const per = ex.items.map(it => {
      const t = P.examTask(it), a = ex.answers[it.n];
      if (t.type === 'ext') { const m = t.max, s = a && a.self != null ? a.self : null; max += m; sum += s || 0; return { n: it.n, max: m, score: s, ext: true }; }
      let res = { ok: false, score: 0, max: t.type === 'match' ? 2 : 1 };
      if (a != null) { const r = P.check(t, a); if (!r.invalid) res = r; }
      max += res.max; sum += res.score || 0; return { n: it.n, max: res.max, score: res.score || 0, ok: res.ok, answered: a != null };
    });
    return { sum, max, per, pct: max ? Math.round(sum / max * 100) : 0 };
  };
})();
