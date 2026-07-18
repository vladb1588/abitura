/* ===== Абитура — движок ===== */

const COURSES = { math: MATH_COURSE, inf: INF_COURSE, rus: RUS_COURSE };
const GENS = Object.assign({}, MATH_GENS, INF_GENS, RUS_GENS);
const LESSON_LEN = 6;
const SMART_LEN = 8;
const MAX_LEVEL = 3;

/* Кастомные проверки ответов */
const CHECKS = {
  digits5(v) {
    v = String(v).trim();
    if (!/^[1-9]\d{4}$/.test(v)) return false;
    const d = [...v].map(Number);
    const s = d.reduce((a, b) => a + b, 0);
    const p = d.reduce((a, b) => a * b, 1);
    return s === p && s % 3 === 0;
  }
};

/* ---------- Прогресс и настройки ---------- */
function defaultP() {
  return {
    xp: 0, streak: 0, lastDay: '', freezes: 0, seenNews: 0,
    levels: {}, doneStatic: {}, seenTheory: {},
    mistakes: [], examBest: {}, weak: {}, unitAcc: {},
    daily: { day: '', xp: 0, lessons: 0, reviews: 0, blitz: 0 },
    ach: {},
    stats: { lessons: 0, exams: 0, answers: 0, correct: 0, perfect: 0, ai: 0, graduated: 0, blitzBest: 0, history: {} },
    settings: { theme: 'auto', palette: 'classic', bg: 'classic', sound: true, goal: 50, examDate: '', apiKey: '', model: 'claude-opus-4-8' }
  };
}
let P = loadP();
function loadP() {
  const d = defaultP();
  try {
    const raw = localStorage.getItem('altgtu-trainer');
    if (raw) {
      const saved = JSON.parse(raw);
      const merged = Object.assign(d, saved);
      merged.settings = Object.assign(defaultP().settings, saved.settings || {});
      merged.stats = Object.assign(defaultP().stats, saved.stats || {});
      merged.daily = Object.assign(defaultP().daily, saved.daily || {});
      /* миграция старых ошибок на интервальные повторения (система Лейтнера) */
      merged.mistakes.forEach(m => {
        if (!m.box) { m.box = 1; m.due = todayStr(); }
      });
      return merged;
    }
  } catch (e) { /* повреждённые данные — начинаем заново */ }
  return d;
}
function saveP() { localStorage.setItem('altgtu-trainer', JSON.stringify(P)); }

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function daysAgoStr(n) {
  const y = new Date(); y.setDate(y.getDate() - n);
  return y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
}
function yesterdayStr() { return daysAgoStr(1); }
function addDaysStr(n) {
  const y = new Date(); y.setDate(y.getDate() + n);
  return y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
}
function bumpStreak() {
  const t = todayStr();
  if (P.lastDay === t) return;
  if (P.lastDay === yesterdayStr()) {
    P.streak += 1;
  } else if (P.lastDay === daysAgoStr(2) && P.freezes > 0) {
    /* заморозка спасает стрик при пропуске одного дня */
    P.freezes--;
    P.streak += 1;
    toast('❄️', 'Заморозка сработала!', 'Пропущенный день не сбросил стрик. Осталось заморозок: ' + P.freezes);
  } else {
    P.streak = 1;
  }
  P.lastDay = t;
  /* каждые 5 дней стрика — заморозка в награду (максимум 2 в запасе) */
  if (P.streak > 0 && P.streak % 5 === 0 && P.freezes < 2) {
    P.freezes++;
    toast('❄️', 'Заморозка получена!', `Стрик ${P.streak} дней. Заморозка спасёт стрик, если пропустишь день.`);
  }
}
function displayStreak() {
  if (P.lastDay === todayStr() || P.lastDay === yesterdayStr()) return P.streak;
  if (P.lastDay === daysAgoStr(2) && P.freezes > 0) return P.streak; /* ещё спасаем заморозкой */
  return 0;
}

/* ---------- Интервальные повторения (система Лейтнера) ----------
   Ошибка проходит «коробки» 1→5 с интервалами 1-2-4-7-14 дней.
   Верный ответ двигает вперёд, неверный возвращает в начало.
   После 5-й коробки задание считается выученным и уходит из повторений. */
const SRS_INT = [1, 2, 4, 7, 14];
function dueMistakes() {
  const t = todayStr();
  return P.mistakes.filter(m => !m.due || m.due <= t);
}
function nextDueInDays() {
  if (!P.mistakes.length) return null;
  const t = todayStr();
  let best = null;
  P.mistakes.forEach(m => {
    const d = Math.ceil((new Date(m.due) - new Date(t)) / 86400000);
    if (best === null || d < best) best = d;
  });
  return Math.max(0, best);
}

/* XP с учётом дневной цели и истории */
function touchDaily() {
  const t = todayStr();
  if (P.daily.day !== t) P.daily = { day: t, xp: 0, lessons: 0, reviews: 0, blitz: 0 };
}
function addXP(n) {
  P.xp += n;
  const t = todayStr();
  touchDaily();
  const before = P.daily.xp;
  P.daily.xp += n;
  P.stats.history[t] = (P.stats.history[t] || 0) + n;
  if (before < P.settings.goal && P.daily.xp >= P.settings.goal) {
    toast('🎯', 'Дневная цель выполнена!', `+${P.daily.xp} XP сегодня. Так держать!`);
    confetti(60);
    playSound('complete');
  }
}
function dailyXP() { return P.daily.day === todayStr() ? P.daily.xp : 0; }

/* ---------- Достижения ---------- */
const ACH = [
  { id: 'first',    ico: '🎯', title: 'Первый шаг',      desc: 'Пройди первый урок',              cond: () => P.stats.lessons >= 1 },
  { id: 'perfect',  ico: '💎', title: 'Безупречно',       desc: 'Урок со 100% точностью',           cond: () => P.stats.perfect >= 1 },
  { id: 'streak3',  ico: '🔥', title: 'Разогрев',         desc: 'Стрик 3 дня подряд',               cond: () => P.streak >= 3 && displayStreak() >= 3 },
  { id: 'streak7',  ico: '🌋', title: 'Неделя силы',      desc: 'Стрик 7 дней подряд',              cond: () => P.streak >= 7 && displayStreak() >= 7 },
  { id: 'xp500',    ico: '⚡', title: 'Заряжен',          desc: 'Набери 500 XP',                    cond: () => P.xp >= 500 },
  { id: 'xp2000',   ico: '🚀', title: 'На орбите',        desc: 'Набери 2000 XP',                   cond: () => P.xp >= 2000 },
  { id: 'crown',    ico: '👑', title: 'Корона',           desc: 'Прокачай тему до 3 звёзд',         cond: () => Object.values(P.levels).some(s => Object.values(s).some(l => l >= MAX_LEVEL)) },
  { id: 'trio',     ico: '🌟', title: 'Многостаночник',   desc: 'Начни все три предмета',           cond: () => ['math', 'inf', 'rus'].every(s => P.levels[s] && Object.values(P.levels[s]).some(l => l >= 1)) },
  { id: 'examPass', ico: '🎓', title: 'Проходной балл',   desc: 'Сдай пробный экзамен',             cond: () => Object.keys(P.examBest).some(s => P.examBest[s] >= COURSES[s].passMark) },
  { id: 'exam3',    ico: '🥇', title: 'Троеборец',        desc: 'Пройди порог на пробниках по всем трём предметам', cond: () => ['math', 'inf', 'rus'].every(s => P.examBest[s] >= COURSES[s].passMark) },
  { id: 'exam90',   ico: '🏆', title: 'Почти сотка',      desc: '90+ баллов на пробнике',           cond: () => Object.values(P.examBest).some(v => v >= 90) },
  { id: 'cleaner',  ico: '🧹', title: 'Чистая работа',    desc: 'Разбери все свои ошибки',          cond: () => P.stats.cleaned >= 1 },
  { id: 'ai1',      ico: '🤖', title: 'Дружба с ИИ',      desc: 'Реши задание от нейросети',        cond: () => P.stats.ai >= 1 },
  { id: 'blitz10',  ico: '⚡', title: 'Скорострел',       desc: '10 верных ответов за один блиц',   cond: () => (P.stats.blitzBest || 0) >= 10 },
  { id: 'memory',   ico: '📦', title: 'Прокачал память',  desc: 'Доведи ошибку до конца интервалов повторения', cond: () => (P.stats.graduated || 0) >= 1 },
  { id: 'planDay',  ico: '📋', title: 'Идеальный день',   desc: 'Выполни весь план на день',        cond: () => P.daily.day === todayStr() && P.daily.lessons > 0 && P.daily.blitz > 0 && dueMistakes().length === 0 }
];
function checkAch() {
  ACH.forEach(a => {
    if (!P.ach[a.id] && a.cond()) {
      P.ach[a.id] = todayStr();
      toast(a.ico, 'Достижение: ' + a.title, a.desc);
      playSound('complete');
    }
  });
  saveP();
}

/* ---------- Утилиты ---------- */
const app = document.getElementById('app');
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function norm(s) {
  return String(s).trim().toLowerCase()
    .replace(/−|–|—/g, '-')
    .replace(/,/g, '.')
    .replace(/\s+/g, '')
    .replace(/°$/, '');
}
const NUM_RE = /^-?\d+(\.\d+)?$/;
function sortedDigits(s) { return norm(s).replace(/[^0-9]/g, '').split('').sort().join(''); }

function isCorrect(q, val) {
  if (q.type === 'mc') return Number(val) === q.correct;
  if (q.type === 'multi') {
    const sel = [].concat(val).map(Number).sort((a, b) => a - b);
    const need = q.correct.slice().sort((a, b) => a - b);
    return sel.length === need.length && sel.every((v, i) => v === need[i]);
  }
  if (q.type === 'match') {
    return Array.isArray(val) && q.pairs.every((p, i) => val[i] === p[1]);
  }
  if (q.check && CHECKS[q.check] && CHECKS[q.check](val)) return true;
  const answers = [].concat(q.correct);
  if (q.set) return answers.some(a => sortedDigits(a) === sortedDigits(val));
  const nv = norm(val);
  return answers.some(a => {
    const na = norm(a);
    if (na === nv) return true;
    return NUM_RE.test(na) && NUM_RE.test(nv) && Math.abs(parseFloat(na) - parseFloat(nv)) < 1e-9;
  });
}

/* На телефоне показываем цифровую клавиатуру, если ответ — точно число */
function inputModeFor(q) {
  if (q.type !== 'input') return '';
  const all = [].concat(q.correct).map(String);
  if (all.every(a => /^\d+$/.test(a))) return ' inputmode="numeric"';
  if (all.every(a => /^[\d.,]+$/.test(a))) return ' inputmode="decimal"';
  return '';
}

function unitLevel(subj, unitId) { return (P.levels[subj] || {})[unitId] || 0; }
function setUnitLevel(subj, unitId, lv) {
  if (!P.levels[subj]) P.levels[subj] = {};
  P.levels[subj][unitId] = lv;
}
function unitUnlocked(subj, idx) {
  if (idx === 0) return true;
  return unitLevel(subj, COURSES[subj].units[idx - 1].id) >= 1;
}
function courseProgress(subj) {
  const c = COURSES[subj];
  const done = c.units.filter(u => unitLevel(subj, u.id) >= 1).length;
  return { done, total: c.units.length };
}

/* ---------- Тема ---------- */
function applyTheme() {
  let t = P.settings.theme;
  if (t === 'auto') t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = t;
  document.documentElement.dataset.palette = P.settings.palette || 'classic';
  document.documentElement.dataset.bg = P.settings.bg || 'classic';
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (P.settings.theme === 'auto') applyTheme();
});
function toggleTheme() {
  const cur = document.documentElement.dataset.theme;
  P.settings.theme = cur === 'dark' ? 'light' : 'dark';
  saveP();
  applyTheme();
}

/* ---------- Звук (WebAudio, без файлов) ---------- */
let AC = null;
function playSound(kind) {
  if (!P.settings.sound) return;
  try {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    const notes = {
      correct: [[660, 0, .09], [880, .09, .14]],
      wrong: [[220, 0, .18], [180, .12, .2]],
      complete: [[523, 0, .1], [659, .1, .1], [784, .2, .1], [1047, .3, .22]]
    }[kind] || [];
    notes.forEach(([f, t, d]) => {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = kind === 'wrong' ? 'sawtooth' : 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, AC.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.22, AC.currentTime + t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + t + d);
      o.connect(g).connect(AC.destination);
      o.start(AC.currentTime + t); o.stop(AC.currentTime + t + d + 0.05);
    });
  } catch (e) { /* звук не критичен */ }
}

/* ---------- Конфетти ---------- */
function confetti(count) {
  const cv = document.getElementById('confetti');
  const ctx = cv.getContext('2d');
  cv.width = innerWidth; cv.height = innerHeight;
  const colors = ['#58cc02', '#1cb0f6', '#ffc800', '#ff4b4b', '#ce82ff', '#ff9600'];
  const parts = Array.from({ length: count || 80 }, () => ({
    x: Math.random() * cv.width, y: -20 - Math.random() * cv.height * 0.4,
    vx: (Math.random() - 0.5) * 3, vy: 2.5 + Math.random() * 3.5,
    s: 6 + Math.random() * 7, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.25,
    c: colors[Math.floor(Math.random() * colors.length)]
  }));
  const t0 = performance.now();
  (function frame(t) {
    ctx.clearRect(0, 0, cv.width, cv.height);
    parts.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
      ctx.restore();
    });
    if (t - t0 < 2200) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, cv.width, cv.height);
  })(t0);
}

/* ---------- Тосты ---------- */
function toast(ico, title, text) {
  const box = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<div class="ico">${ico}</div><div><h4>${esc(title)}</h4><p>${esc(text)}</p></div>`;
  box.appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 450); }, 3600);
}

/* ---------- Клавиатура ---------- */
let KEYH = null;
document.addEventListener('keydown', e => { if (KEYH) KEYH(e); });

/* ---------- Шапка ---------- */
function topbar(title, backFn, extra) {
  return `<div class="topbar">
    ${backFn ? `<button class="back">←</button>` : ''}
    <div class="title">${title}</div>
    ${extra !== undefined ? extra : `
      <span class="stat fire" title="Стрик">🔥 ${displayStreak()}</span>
      <span class="stat xp" title="Опыт">⚡ ${P.xp}</span>
      <button class="iconbtn" id="themeBtn" title="Тема">${document.documentElement.dataset.theme === 'dark' ? '☀️' : '🌙'}</button>
      <button class="iconbtn" id="glossBtn" title="Справочник терминов">📖</button>
      <button class="iconbtn" id="statsBtn" title="Статистика">📊</button>
      <button class="iconbtn" id="setBtn" title="Настройки">⚙️</button>`}
  </div>`;
}
function bindTopbar(backFn) {
  const b = app.querySelector('.back'); if (b && backFn) b.onclick = backFn;
  const t = document.getElementById('themeBtn'); if (t) t.onclick = () => { toggleTheme(); rerenderTop(); };
  const s = document.getElementById('statsBtn'); if (s) s.onclick = showStats;
  const g = document.getElementById('setBtn'); if (g) g.onclick = showSettings;
  const gl = document.getElementById('glossBtn'); if (gl) gl.onclick = () => showGlossary();
}

/* ---------- Справочник терминов ---------- */
/* Подсветка терминов в тексте: обходим текстовые узлы и оборачиваем
   первое вхождение каждого термина в кликабельный span.
   cat ограничивает словарь предметом: в математике не подсвечиваем
   русскую «приставку» (кило-/мега- — это не морфема!) и наоборот. */
function linkTerms(root, cat) {
  if (typeof GLOSS === 'undefined') return;
  const keys = Object.keys(GLOSS).filter(k => !cat || GLOSS[k].cat === cat);
  const found = {};
  const walk = (node) => {
    if (node.nodeType === 3) {
      for (const key of keys) {
        if (found[key]) continue;
        const m = GLOSS_RE[key].exec(node.nodeValue);
        if (!m) continue;
        /* проверяем, что слева не буква (граница слова для кириллицы) */
        const before = m.index > 0 ? node.nodeValue[m.index - 1] : ' ';
        if (/[а-яёА-ЯЁa-zA-Z]/.test(before)) continue;
        found[key] = true;
        const rest = node.splitText(m.index);
        rest.splitText(m[1].length);
        const span = document.createElement('span');
        span.className = 'term';
        span.textContent = rest.nodeValue;
        span.onclick = (e) => { e.stopPropagation(); showTermModal(key); };
        rest.parentNode.replaceChild(span, rest);
        return; /* в этом узле — не больше одного термина, идём дальше по DOM */
      }
    } else if (node.nodeType === 1 && !node.classList.contains('term')) {
      [...node.childNodes].forEach(walk);
    }
  };
  walk(root);
}

function showTermModal(key) {
  const g = GLOSS[key];
  if (!g) return;
  const old = document.querySelector('.modal-bg');
  if (old) old.remove();
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal">
    <h3>📖 ${g.t}</h3>
    <p class="term-def">${g.d}</p>
    ${g.ex ? `<div class="term-ex">${esc(g.ex)}</div>` : ''}
    <div id="wikiOut" class="term-wiki"></div>
    <div class="btns">
      ${g.wiki ? `<button class="btn blue" id="wikiBtn">🌐 Загрузить из Википедии</button>` : ''}
      <button class="btn white" id="closeM">Закрыть</button>
    </div>
  </div>`;
  document.body.appendChild(bg);
  bg.onclick = (e) => { if (e.target === bg) bg.remove(); };
  bg.querySelector('#closeM').onclick = () => bg.remove();
  const wb = bg.querySelector('#wikiBtn');
  if (wb) wb.onclick = async () => {
    const out = bg.querySelector('#wikiOut');
    out.textContent = 'Загружаю…';
    try {
      const res = await fetch('https://ru.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(g.wiki));
      if (!res.ok) throw new Error();
      const data = await res.json();
      out.innerHTML = `<p>${esc(data.extract || 'Статья не найдена.')}</p>
        <a href="https://ru.wikipedia.org/wiki/${encodeURIComponent(g.wiki)}" target="_blank" rel="noopener">Открыть статью полностью →</a>`;
      wb.remove();
    } catch (e) {
      out.textContent = 'Не получилось загрузить — нужен интернет. Попробуй позже.';
    }
  };
}

/* Теория темы поверх урока — можно подсмотреть, не теряя прогресс захода */
function showTheoryModal(subj, unitId) {
  const u = COURSES[subj].units.find(x => x.id === unitId);
  if (!u) return;
  const old = document.querySelector('.modal-bg');
  if (old) old.remove();
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal theory-modal">
    <h3>${u.icon} ${u.title} — теория</h3>
    <div class="theory-modal-cards">
      ${u.theory.map(t => `<div class="theory-card"><h3>${t.title}</h3>${t.html}</div>`).join('')}
    </div>
    <div class="btns"><button class="btn white" id="closeTh">ВЕРНУТЬСЯ К ЗАДАНИЮ</button></div>
  </div>`;
  document.body.appendChild(bg);
  bg.querySelectorAll('.theory-card').forEach(c => linkTerms(c));
  bg.onclick = (e) => { if (e.target === bg) bg.remove(); };
  bg.querySelector('#closeTh').onclick = () => bg.remove();
}

function showGlossary(filter) {
  KEYH = null;
  const CATS = { rus: '📖 Русский язык', math: '📐 Математика', inf: '💻 Информатика' };
  const q = (filter || '').toLowerCase();
  const keys = Object.keys(GLOSS).filter(k =>
    !q || k.includes(q) || GLOSS[k].t.toLowerCase().includes(q) || GLOSS[k].d.toLowerCase().includes(q));
  const groups = Object.keys(CATS).map(cat => {
    const items = keys.filter(k => GLOSS[k].cat === cat);
    if (!items.length) return '';
    return `<h3 class="section-title">${CATS[cat]}</h3>` + items.map(k =>
      `<div class="gloss-item" data-k="${k}"><b>${GLOSS[k].t}</b><span>${GLOSS[k].d.slice(0, 80)}…</span></div>`).join('');
  }).join('');
  app.innerHTML = `${topbar('📖 Справочник', true, '')}
    <div class="gloss-search"><input class="set-input" id="glossQ" placeholder="🔍 Найти термин…" value="${esc(filter || '')}"></div>
    <div class="gloss-list">${groups || '<div class="empty"><div class="big">🤷</div><p>Ничего не нашлось</p></div>'}</div>`;
  bindTopbar(showHome);
  const inp = document.getElementById('glossQ');
  inp.oninput = () => {
    const v = inp.value;
    /* перерисовываем только список, чтобы не терять фокус */
    clearTimeout(inp._t);
    inp._t = setTimeout(() => { showGlossary(v); document.getElementById('glossQ').focus(); }, 250);
  };
  app.querySelectorAll('.gloss-item').forEach(el => el.onclick = () => showTermModal(el.dataset.k));
}
let rerenderTop = () => showHome();

/* ---------- Экран: главная ---------- */
const TIPS = [
  'Решать задачи эффективнее, чем перечитывать теорию: мозг запоминает то, что вспоминает сам.',
  'Интервальные повторения дают до +200% к долговременному запоминанию — не пропускай «Повторение».',
  'Чередуй предметы в один день (интерливинг) — так знания закрепляются прочнее, чем «блоками».',
  'Короткие занятия каждый день работают лучше, чем один длинный марафон раз в неделю.',
  'Ошибка — это не провал, а точка роста: задание вернётся ровно тогда, когда начнёт забываться.',
  'Пробный экзамен раз в неделю — лучший способ привыкнуть к формату и таймеру.',
  'Перед сном повторённый материал запоминается лучше — загляни в «Повторение» вечером.'
];
function showHome() {
  KEYH = null;
  rerenderTop = showHome;
  touchDaily();
  const goal = P.settings.goal;
  const dx = Math.min(dailyXP(), goal);
  const pct = Math.round(dx / goal * 100);
  const R = 24, C = 2 * Math.PI * R;

  let countdown = '';
  if (P.settings.examDate) {
    const days = Math.ceil((new Date(P.settings.examDate) - new Date(todayStr())) / 86400000);
    if (days >= 0) countdown = `<div class="countdown">📅 До экзамена: ${days} дн.</div>`;
  }

  const cards = Object.keys(COURSES).map(s => {
    const c = COURSES[s];
    const pr = courseProgress(s);
    const best = P.examBest[s];
    return `<div class="subject-card" data-subj="${s}">
      <div class="icon">${c.icon}</div>
      <div class="info">
        <h3>${c.title}</h3>
        <div class="meta">Пройдено тем: ${pr.done} из ${pr.total}${best !== undefined ? ` · Лучший балл: ${best}/100` : ''}</div>
        <div class="progressbar"><div style="width:${Math.round(pr.done / pr.total * 100)}%"></div></div>
      </div>
      <div class="arrow">›</div>
    </div>`;
  }).join('');

  const fresh = P.stats.answers === 0;
  const onboarding = fresh ? `
    <div class="plan onboard">
      <div class="plan-head"><h3>👋 С чего начать</h3></div>
      <div class="plan-item">1️⃣ Выбери предмет и пройди первый урок — сначала теория, потом практика</div>
      <div class="plan-item">2️⃣ Возвращайся каждый день: ошибки будут повторяться сами, по науке</div>
      <div class="plan-item">3️⃣ Раз в неделю сдавай пробный экзамен — привыкай к формату</div>
      <div class="plan-tip">📖 Непонятное слово в теории? Подчёркнутые термины кликабельны, а весь словарик — за кнопкой 📖 сверху.</div>
    </div>` : '';

  app.innerHTML = `
    ${topbar('Абитура')}
    <div class="hero">
      <div class="logo">🎓</div>
      <h1>Абитура</h1>
      <p class="sub">Внутренние вступительные в любой вуз · темы = программа ЕГЭ · учись каждый день</p>
      ${countdown}
      <button class="btn cta" id="ctaBtn">${fresh ? '▶ НАЧАТЬ УЧИТЬСЯ' : '▶ ПРОДОЛЖИТЬ'}</button>
    </div>
    ${onboarding}
    <div class="daily ${dx >= goal ? 'done' : ''}" ${fresh ? 'style="display:none"' : ''}>
      <div class="ring">
        <svg width="58" height="58">
          <circle cx="29" cy="29" r="${R}" fill="none" stroke="var(--gray)" stroke-width="7"/>
          <circle cx="29" cy="29" r="${R}" fill="none" stroke="${dx >= goal ? 'var(--yellow)' : 'var(--green)'}" stroke-width="7"
            stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct / 100)}"/>
        </svg>
        <div class="pct">${dx >= goal ? '✓' : pct + '%'}</div>
      </div>
      <div>
        <h3>Дневная цель</h3>
        <div class="sub">${dx} / ${goal} XP ${dx >= goal ? '· выполнена! 🎉' : '· вперёд!'}</div>
      </div>
    </div>
    ${fresh ? '' : planCard()}
    <div class="cards">${cards}</div>
    <div class="toolgrid">
      <button class="btn orange span2" data-act="blitz">⚡ Блиц: 60 секунд</button>
      <button class="btn blue" data-act="mistakes">🔁 Повторение${dueMistakes().length ? ` <span class="due-badge">${dueMistakes().length}</span>` : ''}</button>
      <button class="btn" data-act="smart">🧠 Умная тренировка</button>
      <button class="btn red" data-act="examselect">⏱️ Пробный экзамен</button>
      <button class="btn purple" data-act="ai">🤖 ИИ-задания <span class="ai-badge">AI</span></button>
      <button class="btn white" data-act="news">✨ Что нового${P.seenNews < NEWS_V ? ' <span class="due-badge">!</span>' : ''}</button>
    </div>`;
  bindTopbar();
  app.querySelectorAll('.subject-card').forEach(el => el.onclick = () => showCourse(el.dataset.subj));
  app.querySelector('[data-act="mistakes"]').onclick = () => showMistakes();
  app.querySelector('[data-act="smart"]').onclick = startSmart;
  app.querySelector('[data-act="examselect"]').onclick = showExamSelect;
  app.querySelector('[data-act="ai"]').onclick = () => showAI();
  app.querySelector('[data-act="blitz"]').onclick = showBlitz;
  app.querySelector('[data-act="news"]').onclick = showWhatsNew;
  document.getElementById('ctaBtn').onclick = smartContinue;
}

/* Кнопка «Продолжить»: сама решает, что сейчас полезнее всего */
function smartContinue() {
  /* 1. есть ошибки к повторению — повторяем (интервалы важнее всего) */
  if (dueMistakes().length) { showMistakes(); return; }
  /* 2. иначе — следующий незавершённый урок в наименее прокачанном предмете */
  let best = null;
  Object.keys(COURSES).forEach(s => {
    const c = COURSES[s];
    for (let i = 0; i < c.units.length; i++) {
      if (!unitUnlocked(s, i)) break;
      const lv = unitLevel(s, c.units[i].id);
      if (lv < MAX_LEVEL) {
        const pr = courseProgress(s);
        const score = pr.done / pr.total;
        if (!best || score < best.score) best = { subj: s, idx: i, score };
        break;
      }
    }
  });
  if (best) {
    const u = COURSES[best.subj].units[best.idx];
    if (!P.seenTheory[best.subj + ':' + u.id]) showTheory(best.subj, best.idx, true);
    else startLesson(best.subj, best.idx);
    return;
  }
  /* 3. всё пройдено — блиц для беглости */
  showBlitz();
}

/* План на сегодня: урок (новое) + повторение (интервалы) + блиц (беглость) */
function planCard() {
  const due = dueMistakes().length;
  const items = [
    { ico: '📗', label: 'Пройди один урок', done: P.daily.lessons > 0 },
    { ico: '🔁', label: due ? `Повтори ошибки (${due})` : 'Повторение выполнено', done: due === 0 },
    { ico: '⚡', label: 'Блиц-разминка', done: P.daily.blitz > 0 }
  ];
  const doneCount = items.filter(i => i.done).length;
  const tip = TIPS[new Date().getDate() % TIPS.length];
  return `<div class="plan ${doneCount === 3 ? 'alldone' : ''}">
    <div class="plan-head">
      <h3>📋 План на сегодня</h3>
      <span class="plan-count">${doneCount}/3${doneCount === 3 ? ' 🎉' : ''}</span>
    </div>
    ${items.map(i => `<div class="plan-item ${i.done ? 'done' : ''}"><span class="chk">${i.done ? '✅' : '⬜'}</span> ${i.ico} ${i.label}</div>`).join('')}
    <div class="plan-tip">💡 ${tip}</div>
    ${P.freezes ? `<div class="plan-tip">❄️ Заморозок стрика в запасе: ${P.freezes}</div>` : ''}
  </div>`;
}

/* ---------- Экран: карта курса ---------- */
function showCourse(subj) {
  KEYH = null;
  rerenderTop = () => showCourse(subj);
  const c = COURSES[subj];
  let nextFound = false;
  const rows = c.units.map((u, i) => {
    const lv = unitLevel(subj, u.id);
    const unlocked = unitUnlocked(subj, i);
    let cls = !unlocked ? 'locked' : lv >= MAX_LEVEL ? 'done' : '';
    if (unlocked && lv < MAX_LEVEL && !nextFound) { cls += ' next'; nextFound = true; }
    const stars = '★'.repeat(lv) + `<span class="off">${'★'.repeat(MAX_LEVEL - lv)}</span>`;
    return `<div class="unit-row" style="animation-delay:${i * 0.03}s">
      <div class="unit-node ${cls}" data-idx="${i}">${!unlocked ? '🔒' : lv >= MAX_LEVEL ? '👑' : u.icon}</div>
      <div class="unit-info">
        <h3>${u.title}</h3>
        <div class="unit-stars">${stars}</div>
      </div>
      <div class="unit-actions">
        ${unlocked ? `<button class="minibtn" data-th="${i}">📘 Теория</button>` : ''}
      </div>
    </div>`;
  }).join('');
  app.innerHTML = `
    ${topbar(c.icon + ' ' + c.title, true)}
    <div class="unit-list">${rows}</div>
    <div class="bottom-actions">
      <button class="btn red wide" data-act="exam">⏱️ Пробный экзамен (${c.exam.length} заданий, ${c.examTime} мин)</button>
    </div>`;
  bindTopbar(showHome);
  app.querySelectorAll('.unit-node').forEach(el => {
    const i = Number(el.dataset.idx);
    if (!unitUnlocked(subj, i)) return;
    el.onclick = () => {
      const u = c.units[i];
      if (!P.seenTheory[subj + ':' + u.id]) showTheory(subj, i, true);
      else startLesson(subj, i);
    };
  });
  app.querySelectorAll('[data-th]').forEach(el => el.onclick = () => showTheory(subj, Number(el.dataset.th), false));
  app.querySelector('[data-act="exam"]').onclick = () => confirmExam(subj);
}

/* ---------- Экран: теория ---------- */
function showTheory(subj, unitIdx, thenLesson) {
  KEYH = null;
  const c = COURSES[subj];
  const u = c.units[unitIdx];
  if (thenLesson) { P.seenTheory[subj + ':' + u.id] = true; saveP(); }
  const cards = u.theory.map((t, i) => `<div class="theory-card" style="animation-delay:${i * 0.07}s"><h3>${t.title}</h3>${t.html}</div>`).join('');
  app.innerHTML = `
    ${topbar(u.icon + ' ' + u.title, true, '')}
    <div class="theory">${cards}</div>
    <div class="bottom-actions">
      <button class="btn wide" data-act="go">${thenLesson ? 'НАЧАТЬ УРОК' : 'К ПРАКТИКЕ'}</button>
    </div>`;
  bindTopbar(() => showCourse(subj));
  app.querySelectorAll('.theory-card').forEach(card => linkTerms(card, subj));
  app.querySelector('[data-act="go"]').onclick = () => {
    P.seenTheory[subj + ':' + u.id] = true;
    saveP();
    startLesson(subj, unitIdx);
  };
}

/* ---------- Сборка очередей ---------- */
function buildLessonQueue(subj, unitIdx) {
  const u = COURSES[subj].units[unitIdx];
  const queue = [];
  let fresh = [];
  u.pool.forEach((q, qi) => {
    const key = subj + ':' + u.id + ':' + qi;
    if (!P.doneStatic[key]) fresh.push(Object.assign({ _skey: key }, q));
  });
  /* адаптивная сложность: точность в теме высокая → сложные задания в приоритете,
     низкая → сложные в конец очереди */
  const rec = P.unitAcc[subj + ':' + u.id];
  const acc = rec && rec.a >= 8 ? rec.c / rec.a : null;
  const adaptive = acc !== null && acc >= 0.8;
  fresh = shuffle(fresh);
  if (adaptive) fresh.sort((x, y) => (y.hard ? 1 : 0) - (x.hard ? 1 : 0));
  else if (acc !== null && acc < 0.5) fresh.sort((x, y) => (x.hard ? 1 : 0) - (y.hard ? 1 : 0));
  queue.push(...fresh.slice(0, LESSON_LEN));
  /* генераторов теперь много — свежие задания в каждом уроке.
     В урок всегда идёт минимум 3 сгенерированных, чтобы не заучивать пул наизусть */
  const genNames = (u.gens || []).filter(g => GENS[g]);
  if (genNames.length && queue.length > LESSON_LEN - 3) queue.length = LESSON_LEN - 3;
  let guard = 0;
  while (queue.length < LESSON_LEN && genNames.length && guard++ < 60) {
    const g = GENS[pick(genNames)];
    const q = g();
    if (!queue.some(x => x.text === q.text)) queue.push(q);
  }
  guard = 0;
  while (queue.length < LESSON_LEN && u.pool.length && guard++ < 30) {
    const q = u.pool[rnd(0, u.pool.length - 1)];
    if (!queue.some(x => x.text === q.text)) queue.push(Object.assign({}, q));
    if (queue.length >= u.pool.length) break;
  }
  const out = shuffle(queue);
  out._adaptive = adaptive;
  return out;
}

/* Умная тренировка: ошибки к повторению + генераторы по слабым темам (интерливинг) */
function buildSmartQueue() {
  const queue = [];
  const due = dueMistakes();
  shuffle(due.length ? due : P.mistakes).slice(0, 3).forEach(m => queue.push(Object.assign({ _mid: m.id, _subj: m.subj }, m.q)));

  // слабые темы по счётчику ошибок
  const weak = Object.entries(P.weak).sort((a, b) => b[1] - a[1]).map(e => e[0]);
  const allGenUnits = [];
  Object.keys(COURSES).forEach(s => COURSES[s].units.forEach(u => {
    if (u.gens && u.gens.length) allGenUnits.push(s + ':' + u.id);
  }));
  const source = weak.filter(k => allGenUnits.includes(k));
  let guard = 0;
  while (queue.length < SMART_LEN && guard++ < 80) {
    const key = source.length && Math.random() < 0.7 ? pick(source.slice(0, 5)) : pick(allGenUnits);
    const [s, uid] = key.split(':');
    const u = COURSES[s].units.find(x => x.id === uid);
    const g = GENS[pick(u.gens)];
    if (!g) continue;
    const q = g();
    if (!queue.some(x => x.text === q.text)) queue.push(Object.assign({ _subj: s, _unit: uid }, q));
  }
  return shuffle(queue);
}

let S = null; // текущая квиз-сессия

function startLesson(subj, unitIdx) {
  const queue = buildLessonQueue(subj, unitIdx);
  if (!queue.length) { toast('🤷', 'Пусто', 'В этой теме пока нет заданий.'); return; }
  S = { mode: 'lesson', subj, unitIdx, queue, pos: 0, total: queue.length, origTotal: queue.length, firstTry: 0, answered: 0, earned: 0 };
  if (queue._adaptive) toast('🔥', 'Адаптивная сложность', 'Точность в теме высокая — задания будут посложнее.');
  renderQuiz();
}

function startSmart() {
  const queue = buildSmartQueue();
  if (!queue.length) { toast('🤷', 'Пока нечего тренировать', 'Пройди пару уроков — и умная тренировка заработает.'); return; }
  S = { mode: 'smart', queue, pos: 0, total: queue.length, origTotal: queue.length, firstTry: 0, answered: 0, earned: 0 };
  renderQuiz();
}

function showMistakes(force) {
  if (!P.mistakes.length) {
    KEYH = null;
    app.innerHTML = `${topbar('Повторение', true, '')}
      <div class="empty"><div class="big">🎉</div><p>Ошибок нет! Реши пару уроков — если ошибёшься, задания появятся здесь и будут повторяться по науке: через 1, 2, 4, 7 и 14 дней.</p></div>`;
    bindTopbar(showHome);
    return;
  }
  const due = dueMistakes();
  if (!due.length && !force) {
    KEYH = null;
    const inDays = nextDueInDays();
    const boxes = [0, 0, 0, 0, 0];
    P.mistakes.forEach(m => boxes[Math.min((m.box || 1), 5) - 1]++);
    app.innerHTML = `${topbar('Повторение', true, '')}
      <div class="theory">
        <div class="theory-card">
          <h3>✅ На сегодня всё повторено!</h3>
          <p>Задания вернутся, когда мозг начнёт их забывать — так работает <b>метод интервальных повторений</b>. Следующее повторение: ${inDays === 0 ? 'сегодня' : inDays === 1 ? 'завтра' : 'через ' + inDays + ' дн.'}</p>
          <div class="srs-boxes">${boxes.map((n, i) =>
            `<div class="srs-box ${n ? '' : 'empty'}"><div class="n">${n}</div><div class="l">${SRS_INT[i]} дн.</div></div>`).join('')}</div>
          <p class="sub">В очереди повторений: ${P.mistakes.length}. Чем правее коробка — тем прочнее знание.</p>
        </div>
        <button class="btn blue wide" id="earlyBtn">Повторить досрочно</button>
      </div>`;
    bindTopbar(showHome);
    document.getElementById('earlyBtn').onclick = () => showMistakes(true);
    return;
  }
  const src = due.length ? due : P.mistakes;
  const items = shuffle(src).slice(0, 8).map(m => Object.assign({ _mid: m.id, _subj: m.subj }, m.q));
  S = { mode: 'mistakes', queue: items, pos: 0, total: items.length, origTotal: items.length, firstTry: 0, answered: 0, earned: 0 };
  renderQuiz();
}

/* ---------- Квиз ---------- */
const MODE_LABEL = { lesson: 'Задание', mistakes: '🔁 Повтор ошибки', smart: '🧠 Умная тренировка', ai: '🤖 Задание от ИИ' };

function renderQuiz() {
  const q = S.queue[S.pos];
  const progress = Math.round(S.answered / S.total * 100);
  let body;
  if (q.type === 'mc') {
    body = `<div class="options">${q.options.map((o, i) =>
      `<button class="option" data-i="${i}"><span class="key">${i + 1}</span><span>${o}</span></button>`).join('')}</div>`;
  } else if (q.type === 'multi') {
    body = `<div class="multi-hint">☑️ Выбери <b>все</b> верные варианты</div>
      <div class="options">${q.options.map((o, i) =>
      `<button class="option" data-i="${i}"><span class="key">${i + 1}</span><span>${o}</span></button>`).join('')}</div>`;
  } else if (q.type === 'match') {
    const rights = shuffle(q.pairs.map(p => p[1]));
    body = `<div class="multi-hint">🔗 Подбери пару для каждой строки</div>
      <div class="match-list">${q.pairs.map((p, i) => `
      <div class="match-row" data-i="${i}">
        <div class="match-left">${p[0]}</div>
        <select class="match-sel">
          <option value="">— выбери —</option>
          ${rights.map(r => `<option value="${esc(r)}">${r}</option>`).join('')}
        </select>
      </div>`).join('')}</div>`;
  } else {
    body = `<input class="answer-input" id="ans" autocomplete="off"${inputModeFor(q)} placeholder="Введите ответ...">`;
  }
  /* из какой темы задание — чтобы показать кнопку «Теория» */
  const thSubj = S.mode === 'lesson' ? S.subj : q._subj;
  const thUnit = S.mode === 'lesson' ? COURSES[S.subj].units[S.unitIdx].id : q._unit;
  const hasTheory = thSubj && thUnit && COURSES[thSubj] && COURSES[thSubj].units.some(u => u.id === thUnit);

  app.innerHTML = `
    <div class="quiz-head">
      <button class="quit">✕</button>
      <div class="progressbar"><div style="width:${progress}%"></div></div>
      <span class="stat xp">⚡ ${S.earned}</span>
    </div>
    <div class="quiz-body anim-in">
      <div class="qtype-row">
        <div class="qtype">${q._retry ? '🔁 Повтор' : (q.hard ? '🏆 Повышенная сложность' : MODE_LABEL[S.mode] || 'Задание')}</div>
        ${hasTheory ? `<button class="minibtn" id="quizTheory">📘 Теория</button>` : ''}
      </div>
      <div class="qtext">${q.text}</div>
      ${body}
    </div>
    <div class="quiz-footer">
      <div class="quiz-btns">
        <button class="btn white" id="skipQBtn">ПРОПУСТИТЬ</button>
        <button class="btn" id="checkBtn" disabled>ПРОВЕРИТЬ</button>
      </div>
    </div>`;

  if (hasTheory) document.getElementById('quizTheory').onclick = () => showTheoryModal(thSubj, thUnit);
  const checkBtn = document.getElementById('checkBtn');
  document.getElementById('skipQBtn').onclick = () => {
    const skipVal = q.type === 'mc' ? -1 : (q.type === 'multi' || q.type === 'match') ? [] : '';
    submitAnswer(q, skipVal, true);
  };
  let selected = null;

  app.querySelector('.quit').onclick = () => {
    if (confirm('Выйти? Прогресс этого захода не сохранится.')) {
      const subj = S.mode === 'lesson' ? S.subj : null;
      const wasAI = S.mode === 'ai';
      S = null; KEYH = null;
      if (subj) showCourse(subj); else if (wasAI) showAI(); else showHome();
    }
  };

  const selectOption = (i) => {
    app.querySelectorAll('.option').forEach(o => o.classList.remove('sel'));
    const el = app.querySelector(`.option[data-i="${i}"]`);
    if (!el) return;
    el.classList.add('sel');
    selected = i;
    checkBtn.disabled = false;
  };

  if (q.type === 'mc') {
    app.querySelectorAll('.option').forEach(el => el.onclick = () => selectOption(Number(el.dataset.i)));
    KEYH = e => {
      const n = Number(e.key);
      if (n >= 1 && n <= q.options.length) selectOption(n - 1);
      if (e.key === 'Enter' && selected !== null) checkBtn.click();
    };
  } else if (q.type === 'multi') {
    const toggle = (i) => {
      const el = app.querySelector(`.option[data-i="${i}"]`);
      if (!el) return;
      el.classList.toggle('sel');
      checkBtn.disabled = !app.querySelector('.option.sel');
    };
    app.querySelectorAll('.option').forEach(el => el.onclick = () => toggle(Number(el.dataset.i)));
    KEYH = e => {
      const n = Number(e.key);
      if (n >= 1 && n <= q.options.length) toggle(n - 1);
      if (e.key === 'Enter' && app.querySelector('.option.sel')) checkBtn.click();
    };
  } else if (q.type === 'match') {
    const sels = app.querySelectorAll('.match-sel');
    sels.forEach(s => s.onchange = () => {
      checkBtn.disabled = [...sels].some(x => !x.value);
    });
    KEYH = e => { if (e.key === 'Enter' && !checkBtn.disabled) checkBtn.click(); };
  } else {
    const inp = document.getElementById('ans');
    inp.focus();
    inp.oninput = () => { checkBtn.disabled = !inp.value.trim(); };
    inp.onkeydown = e => { if (e.key === 'Enter' && inp.value.trim()) checkBtn.click(); };
    KEYH = null;
  }

  checkBtn.onclick = () => {
    let val;
    if (q.type === 'mc') val = selected;
    else if (q.type === 'multi') val = [...app.querySelectorAll('.option.sel')].map(el => Number(el.dataset.i));
    else if (q.type === 'match') val = [...app.querySelectorAll('.match-row')].map(r => r.querySelector('.match-sel').value);
    else val = document.getElementById('ans').value;
    submitAnswer(q, val);
  };
}

function submitAnswer(q, val, skipped) {
  const ok = isCorrect(q, val);
  S.answered++;
  P.stats.answers++;
  /* точность по теме — для адаптивной сложности */
  const wkey = (q._subj || S.subj || '') + ':' + (q._unit || (S.mode === 'lesson' ? COURSES[S.subj].units[S.unitIdx].id : ''));
  const validKey = wkey.indexOf(':') > 0 && !wkey.endsWith(':');
  if (validKey && !q._retry) {
    const r = P.unitAcc[wkey] = P.unitAcc[wkey] || { a: 0, c: 0 };
    r.a++; if (ok) r.c++;
  }

  if (ok) {
    P.stats.correct++;
    const gain = q._retry ? 5 : (q.hard ? 15 : 10);
    addXP(gain);
    S.earned += gain;
    if (!q._retry) {
      S.firstTry++;
      if (q._skey) P.doneStatic[q._skey] = true;
      if (q._mid) {
        /* интервальное повторение: верный ответ двигает ошибку в следующую «коробку» */
        const m = P.mistakes.find(x => x.id === q._mid);
        if (m) {
          m.box = (m.box || 1) + 1;
          if (m.box > SRS_INT.length) {
            P.mistakes = P.mistakes.filter(x => x.id !== q._mid);
            P.stats.graduated++;
            toast('📦', 'Выучено навсегда!', 'Задание прошло все интервалы повторения и покинуло «Ошибки».');
          } else {
            m.due = addDaysStr(SRS_INT[m.box - 1]);
          }
        }
      }
      if (q._ai) P.stats.ai++;
    }
    playSound('correct');
  } else {
    playSound('wrong');
    // счётчик слабых тем
    if (validKey) P.weak[wkey] = (P.weak[wkey] || 0) + 1;
    // вернуть в конец очереди и записать в ошибки
    const again = Object.assign({}, q, { _retry: true });
    S.queue.push(again);
    S.total++;
    if (!q._retry && !q._mid) {
      const plain = Object.assign({}, q);
      delete plain._skey; delete plain._retry; delete plain._mid; delete plain._ai;
      P.mistakes.push({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 7), subj: q._subj || S.subj || '', q: plain, box: 1, due: addDaysStr(1) });
      if (P.mistakes.length > 100) P.mistakes = P.mistakes.slice(-100);
    } else if (!q._retry && q._mid) {
      /* неверный ответ возвращает ошибку в первую «коробку» */
      const m = P.mistakes.find(x => x.id === q._mid);
      if (m) { m.box = 1; m.due = addDaysStr(1); }
    }
  }
  saveP();

  const footer = app.querySelector('.quiz-footer');
  let correctText;
  if (q.type === 'mc') correctText = q.options[q.correct];
  else if (q.type === 'multi') correctText = q.correct.map(i => q.options[i]).join(' · ');
  else if (q.type === 'match') correctText = q.pairs.map(p => `${p[0]} → ${p[1]}`).join('; ');
  else correctText = [].concat(q.correct)[0];
  footer.classList.add(ok ? 'ok' : 'bad');
  footer.innerHTML = `
    <div class="feedback ${ok ? 'okc' : 'badc'}">
      <div class="fico">${ok ? '✅' : '❌'}</div>
      <div>
        <h3>${ok ? pick(['Отлично!', 'Верно!', 'Так держать!', 'Именно так!', 'Красота!']) : (skipped ? 'Пропущено' : 'Неверно')}</h3>
        ${!ok ? `<div class="expl"><b>Правильный ответ: ${esc(correctText)}</b></div>` : ''}
        ${q.expl ? `<div class="expl">${q.expl}</div>` : ''}
        ${!ok ? `<div class="expl">Задание вернётся в конце 🔁</div>` : ''}
      </div>
    </div>
    <button class="btn ${ok ? '' : 'red'} wide" id="contBtn">ПРОДОЛЖИТЬ</button>`;

  if (q.type === 'mc') {
    app.querySelectorAll('.option').forEach((el, i) => {
      el.disabled = true; el.onclick = null;
      if (i === q.correct) el.classList.add('correct');
      else if (i === Number(val) && !ok) el.classList.add('wrong');
    });
  } else if (q.type === 'multi') {
    const sel = [].concat(val).map(Number);
    app.querySelectorAll('.option').forEach((el, i) => {
      el.disabled = true; el.onclick = null;
      el.classList.remove('sel');
      if (q.correct.includes(i)) el.classList.add('correct');
      else if (sel.includes(i)) el.classList.add('wrong');
    });
  } else if (q.type === 'match') {
    app.querySelectorAll('.match-row').forEach((row, i) => {
      const s = row.querySelector('.match-sel');
      s.disabled = true;
      s.classList.add(s.value === q.pairs[i][1] ? 'ok' : 'bad');
    });
  } else {
    const inp = document.getElementById('ans');
    if (inp) { inp.disabled = true; if (!ok) inp.classList.add('wrong'); }
  }

  const cont = document.getElementById('contBtn');
  cont.focus();
  const next = () => {
    S.pos++;
    if (S.pos >= S.queue.length) finishQuiz();
    else renderQuiz();
  };
  cont.onclick = next;
  KEYH = e => { if (e.key === 'Enter') next(); };
}

function finishQuiz() {
  KEYH = null;
  bumpStreak();
  let bonus = 0, title, sub;
  const acc = Math.round(S.firstTry / S.origTotal * 100);

  touchDaily();
  if (S.mode === 'lesson') {
    bonus = 20;
    addXP(bonus);
    P.stats.lessons++;
    P.daily.lessons++;
    if (acc === 100) P.stats.perfect++;
    const u = COURSES[S.subj].units[S.unitIdx];
    const lv = unitLevel(S.subj, u.id);
    if (lv < MAX_LEVEL) setUnitLevel(S.subj, u.id, lv + 1);
    title = 'Урок пройден!';
    sub = `Тема «${u.title}»: уровень ${unitLevel(S.subj, u.id)} из ${MAX_LEVEL}`;
  } else if (S.mode === 'mistakes') {
    title = 'Повторение завершено!';
    P.daily.reviews++;
    if (!P.mistakes.length) { P.stats.cleaned = (P.stats.cleaned || 0) + 1; }
    const due = dueMistakes().length;
    sub = P.mistakes.length
      ? (due ? `К повторению сегодня осталось: ${due}` : `Всё повторено! Задания вернутся по расписанию (в очереди ${P.mistakes.length}).`)
      : 'Все ошибки разобраны 🎉';
  } else if (S.mode === 'smart') {
    bonus = 10;
    addXP(bonus);
    title = 'Тренировка завершена!';
    sub = 'Умная тренировка подтягивает твои слабые темы';
  } else {
    title = 'ИИ-раунд завершён!';
    sub = 'Нейросеть может генерировать задания бесконечно 🤖';
  }
  saveP();
  const earned = S.earned + bonus;
  const subj = S.subj, mode = S.mode;

  if (acc >= 80) { confetti(acc === 100 ? 120 : 70); playSound('complete'); }

  app.innerHTML = `
    <div class="result">
      <div class="big">${acc === 100 ? '💎' : acc >= 80 ? '🏆' : acc >= 50 ? '💪' : '📚'}</div>
      <h2>${title}</h2>
      <p class="sub">${sub}</p>
      <div><span class="xp-badge">⚡ +${earned} XP</span><span class="acc-badge">🎯 Точность ${acc}%</span></div>
      <div style="margin-top:30px;">
        <button class="btn wide" id="okBtn">ПРОДОЛЖИТЬ</button>
      </div>
    </div>`;
  checkAch();
  const done = () => {
    S = null;
    if (mode === 'lesson') showCourse(subj);
    else if (mode === 'ai') showAI();
    else showHome();
  };
  document.getElementById('okBtn').onclick = done;
  KEYH = e => { if (e.key === 'Enter') done(); };
}

/* ---------- Что нового: витрина возможностей + журнал обновлений ---------- */
const NEWS_V = 1; /* увеличивай при заметных обновлениях — на кнопке появится «!» */

const FEATURES = [
  { ico: '⚡', title: 'Блиц: 60 секунд', desc: 'Задания вперемешку из всех предметов на скорость. Серии, рекорды, бонусный XP.', act: 'blitz' },
  { ico: '📦', title: 'Повторение по науке', desc: 'Ошибки возвращаются через 1–2–4–7–14 дней — ровно когда мозг начинает забывать (система Лейтнера).', act: 'mistakes' },
  { ico: '🔥', title: 'Адаптивная сложность', desc: 'Точность в теме ≥80% — задания становятся сложнее, ниже 50% — проще. Само подстраивается.' },
  { ico: '📖', title: 'Справочник терминов', desc: 'Подчёркнутые слова в теории кликабельны: определение, пример и статья из Википедии.', act: 'gloss' },
  { ico: '📘', title: 'Теория из задания', desc: 'Забыл правило посреди урока? Кнопка «Теория» в углу задания откроет её, не сбив прогресс.' },
  { ico: '🖌️', title: 'Палитры и фоны', desc: '4 цвета кнопок и 5 фонов — собери своё оформление, всё работает в светлой и тёмной темах.', act: 'settings' },
  { ico: '🤖', title: 'ИИ-задания', desc: 'Claude придумывает бесконечные новые задания по любой теме — со своим API-ключом.', act: 'ai' },
  { ico: '💾', title: 'Резервная копия', desc: 'Экспорт и импорт прогресса файлом — перенеси стрик и XP на другой компьютер или телефон.', act: 'settings' },
  { ico: '❄️', title: 'Заморозки стрика', desc: 'Каждые 5 дней стрика — заморозка в запас (до 2). Пропустил день — стрик уцелеет.' },
  { ico: '📋', title: 'План на сегодня', desc: 'Урок + повторение + блиц: три компонента эффективной тренировки с галочками на главной.' }
];

const CHANGELOG = [
  { d: '18 июля 2026', items: ['Фоновые темы: Бумага, Мята, Небо, Космос', 'Вкладка «Что нового»', '+20 генераторов — в каждом уроке минимум 3 оригинальных задания', 'Русский тоже генерируется: корни, Н/НН, паронимы, -тся/-ться', 'Адаптивная сложность', 'Вертикальные дроби вместо «примеров в строчку»', '4 палитры кнопок'] },
  { d: '17 июля 2026', items: ['Публикация на GitHub Pages — теперь это сайт', 'Универсальная версия: подходит для вступительных любого вуза', '+26 заданий из открытых билетов ТУСУР', 'Кнопки «Теория» и «Пропустить» прямо в уроке', 'Шпаргалка по 16-ричной системе'] },
  { d: 'раньше', items: ['Справочник терминов с Википедией', 'Блиц-режим и заморозки стрика', 'Интервальные повторения ошибок', 'Новые типы заданий: выбор нескольких и сопоставление пар', 'ИИ-генератор заданий', 'Экспорт и импорт прогресса'] }
];

function showWhatsNew() {
  KEYH = null;
  P.seenNews = NEWS_V;
  saveP();
  const acts = { blitz: showBlitz, mistakes: () => showMistakes(), gloss: () => showGlossary(), ai: () => showAI(), settings: showSettings };
  const feats = FEATURES.map((f, i) => `
    <div class="gloss-item feat" ${f.act ? `data-act="${f.act}"` : ''} style="animation-delay:${i * 0.03}s">
      <b>${f.ico} ${f.title}${f.act ? ' <span class="arrow-sm">›</span>' : ''}</b>
      <span>${f.desc}</span>
    </div>`).join('');
  const log = CHANGELOG.map(c => `
    <div class="theory-card">
      <h3>🗓️ ${c.d}</h3>
      <ul>${c.items.map(i => `<li>${i}</li>`).join('')}</ul>
    </div>`).join('');
  app.innerHTML = `${topbar('✨ Что нового', true, '')}
    <h3 class="section-title">Возможности, о которых стоит знать</h3>
    <div class="gloss-list">${feats}</div>
    <h3 class="section-title">Журнал обновлений</h3>
    <div class="theory" style="padding-top:6px;">${log}</div>`;
  bindTopbar(showHome);
  app.querySelectorAll('.feat[data-act]').forEach(el => el.onclick = () => acts[el.dataset.act]());
}

/* ---------- Блиц: 60 секунд на скорость ---------- */
let B = null;
const BLITZ_MS = 60000;

function allGenNames() {
  const names = [];
  Object.keys(COURSES).forEach(s => COURSES[s].units.forEach(u => (u.gens || []).forEach(g => {
    if (GENS[g]) names.push(g);
  })));
  return names;
}

function showBlitz() {
  KEYH = null;
  app.innerHTML = `${topbar('⚡ Блиц', true, '')}
    <div class="theory">
      <div class="theory-card">
        <h3>⚡ 60 секунд. Максимум задач.</h3>
        <p>Быстрые задания вперемешку из всех трёх предметов. Верный ответ — <b>+2 XP</b>, серия из 5 подряд — <b>+5 XP</b> бонусом.</p>
        <p>Ошибся или пропустил — серия сгорает, но время идёт. Вперёд!</p>
        ${P.stats.blitzBest ? `<p class="sub">🏅 Твой рекорд: <b>${P.stats.blitzBest}</b> верных за минуту</p>` : ''}
      </div>
      <button class="btn orange wide" id="blitzGo">СТАРТ!</button>
    </div>`;
  bindTopbar(showHome);
  document.getElementById('blitzGo').onclick = startBlitz;
}

function startBlitz() {
  B = { score: 0, combo: 0, answered: 0, end: Date.now() + BLITZ_MS, timerId: null, locked: false };
  B.timerId = setInterval(() => {
    const bar = document.getElementById('blitzbar');
    const left = B.end - Date.now();
    if (left <= 0) { finishBlitz(); return; }
    if (bar) {
      bar.style.width = (left / BLITZ_MS * 100) + '%';
      bar.classList.toggle('low', left < 10000);
    }
    const t = document.getElementById('blitztime');
    if (t) t.textContent = Math.ceil(left / 1000);
  }, 100);
  nextBlitzQ();
}

function nextBlitzQ() {
  if (!B) return;
  B.locked = false;
  const names = allGenNames();
  let q = null, guard = 0;
  while (!q && guard++ < 20) {
    const g = GENS[pick(names)];
    if (g) q = g();
  }
  if (!q) { finishBlitz(); return; }
  B.q = q;
  const left = Math.max(0, B.end - Date.now());
  let body;
  if (q.type === 'mc') {
    body = `<div class="options">${q.options.map((o, i) =>
      `<button class="option" data-i="${i}"><span class="key">${i + 1}</span><span>${o}</span></button>`).join('')}</div>`;
  } else {
    body = `<input class="answer-input" id="bans" autocomplete="off"${inputModeFor(q)} placeholder="Ответ + Enter">`;
  }
  app.innerHTML = `
    <div class="quiz-head">
      <button class="quit">✕</button>
      <div class="blitz-track"><div id="blitzbar" style="width:${left / BLITZ_MS * 100}%"></div></div>
      <span class="stat" style="color:var(--orange)">⏱ <span id="blitztime">${Math.ceil(left / 1000)}</span></span>
      <span class="stat xp">✔ ${B.score}</span>
    </div>
    <div class="quiz-body anim-in" id="blitzbody">
      <div class="qtype">⚡ Блиц ${B.combo >= 2 ? `· серия ×${B.combo}` : ''}</div>
      <div class="qtext">${q.text}</div>
      ${body}
    </div>
    <div class="quiz-footer">
      <button class="btn white wide" id="skipBtn">ПРОПУСТИТЬ →</button>
    </div>`;

  app.querySelector('.quit').onclick = () => {
    clearInterval(B.timerId); B = null; KEYH = null; showHome();
  };
  document.getElementById('skipBtn').onclick = () => blitzAnswer(null);

  if (q.type === 'mc') {
    app.querySelectorAll('.option').forEach(el => el.onclick = () => blitzAnswer(Number(el.dataset.i)));
    KEYH = e => {
      const n = Number(e.key);
      if (n >= 1 && n <= q.options.length) blitzAnswer(n - 1);
    };
  } else {
    const inp = document.getElementById('bans');
    inp.focus();
    inp.onkeydown = e => { if (e.key === 'Enter' && inp.value.trim()) blitzAnswer(inp.value); };
    KEYH = null;
  }
}

function blitzAnswer(val) {
  if (!B || B.locked) return;
  B.locked = true;
  const ok = val !== null && isCorrect(B.q, val);
  B.answered++;
  P.stats.answers++;
  if (ok) {
    P.stats.correct++;
    B.score++;
    B.combo++;
    addXP(2);
    if (B.combo % 5 === 0) { addXP(5); toast('🔥', 'Серия ' + B.combo + '!', '+5 XP бонусом'); }
    playSound('correct');
  } else {
    B.combo = 0;
    if (val !== null) playSound('wrong');
  }
  const body = document.getElementById('blitzbody');
  if (body) body.classList.add(ok ? 'flash-ok' : 'flash-bad');
  saveP();
  setTimeout(() => { if (B) nextBlitzQ(); }, ok ? 250 : 550);
}

function finishBlitz() {
  if (!B) return;
  clearInterval(B.timerId);
  KEYH = null;
  const score = B.score, answered = B.answered;
  B = null;
  touchDaily();
  P.daily.blitz++;
  bumpStreak();
  const record = score > (P.stats.blitzBest || 0);
  if (record) { P.stats.blitzBest = score; if (score > 0) { addXP(10); } }
  saveP();
  if (record && score >= 5) { confetti(100); playSound('complete'); }
  app.innerHTML = `
    <div class="result">
      <div class="big">${record && score > 0 ? '🏅' : score >= 8 ? '⚡' : '⏱'}</div>
      <h2>${score} верных за минуту</h2>
      <p class="sub">${record && score > 0 ? 'Новый рекорд! +10 XP бонусом' : P.stats.blitzBest ? 'Рекорд: ' + P.stats.blitzBest : ''}</p>
      <div>
        <span class="acc-badge">Отвечено: ${answered}</span>
        <span class="xp-badge">⚡ +${score * 2 + (record && score > 0 ? 10 : 0)} XP</span>
      </div>
      <div style="margin-top:30px; display:flex; flex-direction:column; gap:10px;">
        <button class="btn orange wide" id="againBtn">ЕЩЁ РАЗ</button>
        <button class="btn white wide" id="okBtn">НА ГЛАВНУЮ</button>
      </div>
    </div>`;
  checkAch();
  document.getElementById('againBtn').onclick = startBlitz;
  document.getElementById('okBtn').onclick = showHome;
  KEYH = e => { if (e.key === 'Enter') startBlitz(); };
}

/* ---------- Экзамен ---------- */
let EX = null;

function showExamSelect() {
  KEYH = null;
  const btns = Object.keys(COURSES).map(s => {
    const c = COURSES[s];
    return `<button class="btn blue wide" data-s="${s}">${c.icon} ${c.title} — ${c.exam.length} заданий, ${c.examTime} мин</button>`;
  }).join('');
  app.innerHTML = `${topbar('Пробный экзамен', true, '')}
    <div class="theory">
      <div class="theory-card">
        <h3>⏱️ Как это работает</h3>
        <p>Полная имитация внутреннего вступительного испытания: реальные задания вузовских демовариантов, таймер, шкала 100 баллов. Формат у вузов похожий — потренировавшись здесь, не растеряешься нигде.</p>
        <ul>
          <li>Математика: 20 заданий, 180 минут, типичный проходной — 40 баллов;</li>
          <li>Информатика: 20 заданий, 180 минут, типичный проходной — 46 баллов;</li>
          <li>Русский язык: 20 заданий, 100 минут, типичный проходной — 40 баллов.</li>
        </ul>
        <p>Можно свободно переходить между заданиями и менять ответы до завершения.</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;">${btns}</div>
    </div>`;
  bindTopbar(showHome);
  app.querySelectorAll('[data-s]').forEach(el => el.onclick = () => confirmExam(el.dataset.s));
}

function confirmExam(subj) {
  const c = COURSES[subj];
  if (confirm(`Начать пробный экзамен по предмету «${c.title}»?\n${c.exam.length} заданий, ${c.examTime} минут.`)) startExam(subj);
}

function startExam(subj) {
  KEYH = null;
  const c = COURSES[subj];
  EX = {
    subj,
    qs: c.exam,
    answers: new Array(c.exam.length).fill(null),
    pos: 0,
    deadline: Date.now() + c.examTime * 60000,
    timerId: null
  };
  renderExam();
  EX.timerId = setInterval(() => {
    const el = document.getElementById('extimer');
    if (!el) return;
    const left = EX.deadline - Date.now();
    if (left <= 0) { finishExam(true); return; }
    el.textContent = fmtTime(left);
    el.classList.toggle('low', left < 10 * 60000);
  }, 1000);
}

function fmtTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
  return (h ? h + ':' : '') + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
}

function renderExam() {
  const q = EX.qs[EX.pos];
  const nav = EX.qs.map((_, i) =>
    `<button class="${EX.answers[i] !== null && EX.answers[i] !== '' ? 'answered' : ''} ${i === EX.pos ? 'current' : ''}" data-n="${i}">${i + 1}</button>`
  ).join('');
  let body;
  if (q.type === 'mc') {
    body = `<div class="options">${q.options.map((o, i) =>
      `<button class="option ${EX.answers[EX.pos] === i ? 'sel' : ''}" data-i="${i}"><span class="key">${i + 1}</span><span>${o}</span></button>`).join('')}</div>`;
  } else {
    body = `<input class="answer-input" id="exans" autocomplete="off"${inputModeFor(q)} placeholder="Ваш ответ..." value="${esc(EX.answers[EX.pos] || '')}">`;
  }
  app.innerHTML = `
    <div class="topbar">
      <button class="back" id="exquit">✕</button>
      <div class="title">Задание ${EX.pos + 1} из ${EX.qs.length}</div>
      <span class="exam-timer" id="extimer">${fmtTime(EX.deadline - Date.now())}</span>
    </div>
    <div class="exam-nav">${nav}</div>
    <div class="exam-body anim-in">
      <div class="qtext">${q.text}</div>
      ${body}
    </div>
    <div class="exam-controls">
      <button class="btn white" id="exprev" ${EX.pos === 0 ? 'disabled' : ''}>← Назад</button>
      ${EX.pos < EX.qs.length - 1
        ? `<button class="btn blue" id="exnext">Далее →</button>`
        : `<button class="btn red" id="exfinish">Завершить</button>`}
      <button class="btn red" id="exfinish2" style="flex:0 0 auto;">🏁</button>
    </div>`;

  document.getElementById('exquit').onclick = () => {
    if (confirm('Прервать экзамен? Результат не сохранится.')) {
      clearInterval(EX.timerId); EX = null; showHome();
    }
  };
  app.querySelectorAll('.exam-nav button').forEach(el => el.onclick = () => { saveCurrent(); EX.pos = Number(el.dataset.n); renderExam(); });
  const prev = document.getElementById('exprev');
  if (prev) prev.onclick = () => { saveCurrent(); if (EX.pos > 0) { EX.pos--; renderExam(); } };
  const next = document.getElementById('exnext');
  if (next) next.onclick = () => { saveCurrent(); EX.pos++; renderExam(); };
  const fin = document.getElementById('exfinish');
  if (fin) fin.onclick = () => { saveCurrent(); askFinish(); };
  document.getElementById('exfinish2').onclick = () => { saveCurrent(); askFinish(); };

  if (q.type === 'mc') {
    app.querySelectorAll('.exam-body .option').forEach(el => el.onclick = () => {
      EX.answers[EX.pos] = Number(el.dataset.i);
      app.querySelectorAll('.exam-body .option').forEach(o => o.classList.remove('sel'));
      el.classList.add('sel');
      const navBtn = app.querySelector(`.exam-nav [data-n="${EX.pos}"]`);
      if (navBtn) navBtn.classList.add('answered');
    });
  } else {
    const inp = document.getElementById('exans');
    inp.oninput = () => { EX.answers[EX.pos] = inp.value; };
    inp.onkeydown = e => { if (e.key === 'Enter') { saveCurrent(); if (EX.pos < EX.qs.length - 1) { EX.pos++; renderExam(); } } };
  }

  function saveCurrent() {
    const cq = EX.qs[EX.pos];
    if (cq.type !== 'mc') {
      const inp = document.getElementById('exans');
      if (inp) EX.answers[EX.pos] = inp.value;
    }
  }
}

function askFinish() {
  const unanswered = EX.answers.filter(a => a === null || a === '').length;
  const msg = unanswered
    ? `Не отвечено заданий: ${unanswered}. Всё равно завершить экзамен?`
    : 'Завершить экзамен и узнать результат?';
  if (confirm(msg)) finishExam(false);
}

function finishExam(timeout) {
  clearInterval(EX.timerId);
  const c = COURSES[EX.subj];
  let correct = 0;
  const rows = EX.qs.map((q, i) => {
    const a = EX.answers[i];
    const ok = a !== null && a !== '' && isCorrect(q, a);
    if (ok) correct++;
    const userAns = a === null || a === '' ? '<i>нет ответа</i>' : (q.type === 'mc' ? esc(q.options[a]) : esc(a));
    const rightAns = q.type === 'mc' ? esc(q.options[q.correct]) : esc([].concat(q.correct)[0]);
    return `<div class="review-item ${ok ? 'ok' : 'bad'}">
      <div class="num">Задание ${i + 1} · ${ok ? '✅ верно' : '❌ неверно'}</div>
      <div class="qq">${q.text}</div>
      <div class="aa">Ваш ответ: <b>${userAns}</b>${ok ? '' : ` · Правильный: <b>${rightAns}</b>`}</div>
      ${q.expl ? `<div class="expl">${q.expl}</div>` : ''}
    </div>`;
  }).join('');

  const score = Math.round(correct / EX.qs.length * 100);
  const passed = score >= c.passMark;
  addXP(correct * 2);
  bumpStreak();
  P.stats.exams++;
  if (P.examBest[EX.subj] === undefined || score > P.examBest[EX.subj]) P.examBest[EX.subj] = score;
  saveP();
  const subj = EX.subj;
  EX = null;

  if (passed) { confetti(140); playSound('complete'); }

  app.innerHTML = `
    <div class="result" style="padding-bottom:20px;">
      <div class="big">${passed ? '🎉' : '😤'}</div>
      <h2>${score} баллов из 100</h2>
      <p class="sub">${timeout ? '⏰ Время вышло! ' : ''}${passed
        ? `Порог пройден! (нужно ${c.passMark})`
        : `Порог ${c.passMark} баллов пока не взят — разбери ошибки ниже и попробуй ещё раз`}</p>
      <div><span class="acc-badge">Верно: ${correct} из ${COURSES[subj].exam.length}</span><span class="xp-badge">⚡ +${correct * 2} XP</span></div>
    </div>
    <h3 style="padding:0 22px 6px;">Разбор заданий</h3>
    <div class="exam-review">${rows}</div>
    <div class="bottom-actions">
      <button class="btn wide" id="homeBtn">НА ГЛАВНУЮ</button>
    </div>`;
  checkAch();
  document.getElementById('homeBtn').onclick = showHome;
  window.scrollTo(0, 0);
}

/* ---------- Статистика ---------- */
function showStats() {
  KEYH = null;
  const acc = P.stats.answers ? Math.round(P.stats.correct / P.stats.answers * 100) : 0;

  // график за 14 дней
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    days.push({ label: d.getDate(), xp: P.stats.history[key] || 0 });
  }
  const maxXP = Math.max(...days.map(d => d.xp), 1);
  const chart = days.map(d =>
    `<div class="col"><div class="bar ${d.xp ? '' : 'zero'}" style="height:${Math.max(3, Math.round(d.xp / maxXP * 100))}%"></div><div class="day">${d.label}</div></div>`
  ).join('');

  const bests = Object.keys(COURSES).map(s =>
    `<div class="stat-card"><div class="val">${P.examBest[s] !== undefined ? P.examBest[s] : '—'}</div><div class="lbl">${COURSES[s].icon} ${COURSES[s].title}: лучший балл</div></div>`
  ).join('');

  const achs = ACH.map(a =>
    `<div class="ach ${P.ach[a.id] ? 'earned' : 'locked'}">
      <div class="ico">${a.ico}</div><h4>${a.title}</h4><p>${a.desc}</p>
    </div>`
  ).join('');

  app.innerHTML = `
    ${topbar('📊 Статистика', true, '')}
    <div class="stats-grid">
      <div class="stat-card"><div class="val">⚡ ${P.xp}</div><div class="lbl">Всего опыта</div></div>
      <div class="stat-card"><div class="val">🔥 ${displayStreak()}</div><div class="lbl">Стрик (дней подряд)${P.freezes ? ' · ❄️×' + P.freezes : ''}</div></div>
      <div class="stat-card"><div class="val">${acc}%</div><div class="lbl">Точность (${P.stats.correct} из ${P.stats.answers})</div></div>
      <div class="stat-card"><div class="val">${P.stats.lessons}</div><div class="lbl">Уроков пройдено</div></div>
      <div class="stat-card"><div class="val">⚡ ${P.stats.blitzBest || 0}</div><div class="lbl">Рекорд блица (за минуту)</div></div>
      <div class="stat-card"><div class="val">📦 ${P.stats.graduated || 0}</div><div class="lbl">Выучено через повторения (в очереди ${P.mistakes.length})</div></div>
    </div>
    <h3 class="section-title">Активность за 14 дней</h3>
    <div class="chart">${chart}</div>
    <h3 class="section-title">Пробные экзамены (${P.stats.exams})</h3>
    <div class="stats-grid" style="grid-template-columns:1fr 1fr 1fr;">${bests}</div>
    <h3 class="section-title">Достижения (${Object.keys(P.ach).length} из ${ACH.length})</h3>
    <div class="ach-grid">${achs}</div>`;
  bindTopbar(showHome);
}

/* ---------- Настройки ---------- */
function showSettings() {
  KEYH = null;
  const st = P.settings;
  const seg = (name, opts, cur) => `<div class="seg" data-set="${name}">${opts.map(o =>
    `<button class="${o.v === cur ? 'on' : ''}" data-v="${o.v}">${o.t}</button>`).join('')}</div>`;

  app.innerHTML = `
    ${topbar('⚙️ Настройки', true, '')}
    <div class="settings">
      <div class="set-row">
        <h4>🎨 Тема</h4>
        ${seg('theme', [{ v: 'light', t: '☀️ Светлая' }, { v: 'dark', t: '🌙 Тёмная' }, { v: 'auto', t: '🖥️ Авто' }], st.theme)}
      </div>
      <div class="set-row">
        <h4>🖌️ Палитра</h4>
        ${seg('palette', [{ v: 'classic', t: '🟢 Классика' }, { v: 'ocean', t: '🌊 Океан' }, { v: 'sunset', t: '🌅 Закат' }, { v: 'grape', t: '🍇 Виноград' }], st.palette || 'classic')}
      </div>
      <div class="set-row">
        <h4>🌆 Фон</h4>
        ${seg('bg', [{ v: 'classic', t: '⬜ Классика' }, { v: 'cream', t: '📜 Бумага' }, { v: 'mint', t: '🌿 Мята' }, { v: 'sky', t: '☁️ Небо' }, { v: 'space', t: '🌌 Космос' }], st.bg || 'classic')}
        <div class="hint">Фон и палитра кнопок настраиваются независимо и работают в обеих темах.</div>
      </div>
      <div class="set-row">
        <h4>🔊 Звуки</h4>
        ${seg('sound', [{ v: 'on', t: 'Вкл' }, { v: 'off', t: 'Выкл' }], st.sound ? 'on' : 'off')}
      </div>
      <div class="set-row">
        <h4>🎯 Дневная цель</h4>
        ${seg('goal', [{ v: '30', t: '30 XP' }, { v: '50', t: '50 XP' }, { v: '100', t: '100 XP' }, { v: '200', t: '200 XP' }], String(st.goal))}
      </div>
      <div class="set-row">
        <h4>📅 Дата экзамена</h4>
        <input type="date" class="set-input" id="examDate" value="${esc(st.examDate)}">
        <div class="hint">На главном экране появится обратный отсчёт.</div>
      </div>
      <div class="set-row">
        <h4>🤖 ИИ-генератор заданий <span class="ai-badge">AI</span></h4>
        <input type="password" class="set-input" id="apiKey" placeholder="sk-ant-..." value="${esc(st.apiKey)}">
        <div class="hint">API-ключ Anthropic для генерации заданий нейросетью Claude. Получить: console.anthropic.com → API Keys. Ключ хранится только в твоём браузере.</div>
        <div style="height:10px"></div>
        ${seg('model', [{ v: 'claude-opus-4-8', t: 'Opus (умнее)' }, { v: 'claude-sonnet-5', t: 'Sonnet' }, { v: 'claude-haiku-4-5', t: 'Haiku (дешевле)' }], st.model)}
      </div>
      <div class="set-row">
        <h4>💾 Резервная копия</h4>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn blue" id="expBtn">📤 Экспорт прогресса</button>
          <button class="btn white" id="impBtn">📥 Импорт</button>
        </div>
        <input type="file" id="impFile" accept=".json,application/json" style="display:none;">
        <div class="hint">Прогресс хранится в браузере. Сохрани файл, чтобы перенести его на другой компьютер или в другой браузер.</div>
      </div>
      <div class="set-row">
        <h4>🗑️ Данные</h4>
        <button class="btn red" id="resetBtn">Сбросить весь прогресс</button>
        <div class="hint">Удалит XP, стрик, уровни тем, ошибки и достижения. Настройки останутся.</div>
      </div>
    </div>`;
  bindTopbar(showHome);

  app.querySelectorAll('.seg').forEach(segEl => {
    segEl.querySelectorAll('button').forEach(b => b.onclick = () => {
      const name = segEl.dataset.set, v = b.dataset.v;
      if (name === 'theme') { P.settings.theme = v; applyTheme(); }
      if (name === 'palette') { P.settings.palette = v; applyTheme(); }
      if (name === 'bg') { P.settings.bg = v; applyTheme(); }
      if (name === 'sound') { P.settings.sound = v === 'on'; if (v === 'on') playSound('correct'); }
      if (name === 'goal') P.settings.goal = Number(v);
      if (name === 'model') P.settings.model = v;
      saveP();
      segEl.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    });
  });
  document.getElementById('examDate').onchange = e => { P.settings.examDate = e.target.value; saveP(); };
  document.getElementById('expBtn').onclick = () => {
    const blob = new Blob([JSON.stringify(P, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'altgtu-trainer-' + todayStr() + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('📤', 'Файл сохранён', 'Резервная копия прогресса скачана.');
  };
  document.getElementById('impBtn').onclick = () => document.getElementById('impFile').click();
  document.getElementById('impFile').onchange = e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (!data || typeof data !== 'object' || typeof data.xp !== 'number') throw new Error('bad');
        if (!confirm('Заменить текущий прогресс данными из файла?')) return;
        localStorage.setItem('altgtu-trainer', JSON.stringify(data));
        P = loadP();
        applyTheme();
        toast('📥', 'Прогресс восстановлен', `Загружено: ${P.xp} XP, стрик ${P.streak}.`);
        showHome();
      } catch (err) {
        toast('❌', 'Не получилось', 'Файл не похож на резервную копию тренажёра.');
      }
    };
    r.readAsText(f);
  };
  document.getElementById('apiKey').onchange = e => { P.settings.apiKey = e.target.value.trim(); saveP(); };
  document.getElementById('resetBtn').onclick = () => {
    if (confirm('Точно сбросить весь прогресс? Это действие необратимо.')) {
      const st = P.settings;
      P = defaultP();
      P.settings = st;
      saveP();
      toast('🗑️', 'Прогресс сброшен', 'Начинаем с чистого листа!');
      showHome();
    }
  };
}

/* ---------- Старт ---------- */
applyTheme();
showHome();
