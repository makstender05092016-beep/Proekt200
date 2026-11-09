/* ПРОЕКТ 200 — хранилище: IndexedDB с резервом в localStorage, экспорт/импорт */
'use strict';
P.DB = (function () {
  const NAME = 'proekt200', VER = 1, SCHEMA = 1;
  let db = null, mode = 'idb';
  const mem = {}; // кэш kv в памяти для синхронного чтения

  function open() {
    return new Promise(res => {
      if (!('indexedDB' in window)) { mode = 'ls'; return res(); }
      let req;
      try { req = indexedDB.open(NAME, VER); } catch (e) { mode = 'ls'; return res(); }
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
        if (!d.objectStoreNames.contains('attempts')) { const s = d.createObjectStore('attempts', { keyPath: 'id', autoIncrement: true }); s.createIndex('topic', 'topic'); }
        if (!d.objectStoreNames.contains('exams')) d.createObjectStore('exams', { keyPath: 'id' });
      };
      req.onsuccess = () => { db = req.result; res(); };
      req.onerror = () => { mode = 'ls'; res(); };
      req.onblocked = () => { mode = 'ls'; res(); };
    });
  }
  const tx = (store, rw) => db.transaction(store, rw ? 'readwrite' : 'readonly').objectStore(store);
  const p = r => new Promise((ok, no) => { r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
  const lsKey = (s, k) => 'p200:' + s + ':' + k;
  function lsAll(s) { const out = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('p200:' + s + ':')) try { out.push(JSON.parse(localStorage.getItem(k))); } catch (e) { } } return out; }

  async function loadKV() {
    if (mode === 'idb') {
      const s = tx('kv'); const keys = await p(s.getAllKeys()); const vals = await p(tx('kv').getAll());
      keys.forEach((k, i) => mem[k] = vals[i]);
    } else {
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('p200:kv:')) try { mem[k.slice(8)] = JSON.parse(localStorage.getItem(k)); } catch (e) { } }
    }
  }
  const api = {
    async init() { await open(); try { await loadKV(); } catch (e) { mode = 'ls'; await loadKV(); } return mode; },
    get mode() { return mode; },
    get(k, def) { return k in mem ? mem[k] : def; },
    async set(k, v) {
      mem[k] = v;
      try { if (mode === 'idb') await p(tx('kv', 1).put(v, k)); else localStorage.setItem(lsKey('kv', k), JSON.stringify(v)); }
      catch (e) { console.warn('save fail', e); P.toast('Ошибка сохранения: ' + (e && e.name || e)); }
    },
    async addAttempt(a) {
      a.ts = a.ts || Date.now();
      if (mode === 'idb') { a.id = await p(tx('attempts', 1).add(a)); }
      else { a.id = Date.now() + Math.random(); localStorage.setItem(lsKey('attempts', a.id), JSON.stringify(a)); }
      return a;
    },
    async attempts() { return mode === 'idb' ? p(tx('attempts').getAll()) : lsAll('attempts'); },
    async putExam(e) { if (mode === 'idb') await p(tx('exams', 1).put(e)); else localStorage.setItem(lsKey('exams', e.id), JSON.stringify(e)); },
    async exams() { const l = mode === 'idb' ? await p(tx('exams').getAll()) : lsAll('exams'); return l.sort((a, b) => b.started - a.started); },
    async getExam(id) { return mode === 'idb' ? p(tx('exams').get(id)) : JSON.parse(localStorage.getItem(lsKey('exams', id)) || 'null'); },
    async delExam(id) { if (mode === 'idb') await p(tx('exams', 1).delete(id)); else localStorage.removeItem(lsKey('exams', id)); },

    async exportAll() {
      return { app: 'ПРОЕКТ 200', schema: SCHEMA, appVersion: P.VERSION, exported: new Date().toISOString(), kv: { ...mem }, attempts: await api.attempts(), exams: await api.exams() };
    },
    validate(data) {
      if (!data || typeof data !== 'object') return 'Файл не является резервной копией';
      if (data.app !== 'ПРОЕКТ 200') return 'Это не резервная копия «ПРОЕКТ 200»';
      if (typeof data.schema !== 'number') return 'Не указана версия формата данных';
      if (data.schema > SCHEMA) return `Копия создана более новой версией (формат ${data.schema}). Обновите приложение.`;
      if (!data.kv || !Array.isArray(data.attempts) || !Array.isArray(data.exams)) return 'Повреждённая структура данных';
      return null;
    },
    async importAll(data) {
      const err = api.validate(data); if (err) throw new Error(err);
      await api.wipe();
      for (const [k, v] of Object.entries(data.kv)) await api.set(k, v);
      for (const a of data.attempts) { const c = { ...a }; if (mode === 'idb') delete c.id; await api.addAttempt(c); }
      for (const e of data.exams) await api.putExam(e);
    },
    async wipe() {
      Object.keys(mem).forEach(k => delete mem[k]);
      if (mode === 'idb') { for (const s of ['kv', 'attempts', 'exams']) await p(tx(s, 1).clear()); }
      else { const ks = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('p200:')) ks.push(k); } ks.forEach(k => localStorage.removeItem(k)); }
    },
    async persist() { try { if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist(); } catch (e) { } return false; },
    async persisted() { try { if (navigator.storage && navigator.storage.persisted) return await navigator.storage.persisted(); } catch (e) { } return false; },
    SCHEMA
  };
  return api;
})();
