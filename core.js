/* ===== Ядро: прогресс, настройки, достижения, утилиты, тема, звук, шапка, справочник ===== */
/* ===== Абитура — движок ===== */

const COURSES = { math: MATH_COURSE, inf: INF_COURSE, rus: RUS_COURSE };
const GENS = Object.assign({}, MATH_GENS, INF_GENS, RUS_GENS, typeof MORSE_GENS !== 'undefined' ? MORSE_GENS : {});

/* экспериментальные курсы включаются тумблером в настройках */
function syncExperimental() {
  if (P.settings.showMorse && typeof MORSE_COURSE !== 'undefined') COURSES.morse = MORSE_COURSE;
  else delete COURSES.morse;
}
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
    levels: {}, doneStatic: {}, seenTheory: {}, unlocked: {}, flagged: {},
    mistakes: [], examBest: {}, weak: {}, unitAcc: {},
    daily: { day: '', xp: 0, lessons: 0, reviews: 0, blitz: 0 },
    ach: {},
    stats: { lessons: 0, exams: 0, answers: 0, correct: 0, perfect: 0, ai: 0, graduated: 0, blitzBest: 0, history: {} },
    settings: { theme: 'auto', palette: 'classic', bg: 'classic', sound: true, goal: 50, examDate: '', showAI: false, showMorse: false, apiKey: '', model: 'claude-opus-4-8' }
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
    toast('snow', 'Заморозка сработала!', 'Пропущенный день не сбросил стрик. Осталось заморозок: ' + P.freezes);
  } else {
    P.streak = 1;
  }
  P.lastDay = t;
  /* каждые 5 дней стрика — заморозка в награду (максимум 2 в запасе) */
  if (P.streak > 0 && P.streak % 5 === 0 && P.freezes < 2) {
    P.freezes++;
    toast('snow', 'Заморозка получена!', `Стрик ${P.streak} дней. Заморозка спасёт стрик, если пропустишь день.`);
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
    toast('target', 'Дневная цель выполнена!', `+${P.daily.xp} XP сегодня. Так держать!`);
    confetti(60);
    playSound('complete');
  }
}
function dailyXP() { return P.daily.day === todayStr() ? P.daily.xp : 0; }

/* ---------- Достижения ---------- */
const ACH = [
  { id: 'first',    ico: 'target',  title: 'Первый шаг',      desc: 'Пройди первый урок',              cond: () => P.stats.lessons >= 1 },
  { id: 'perfect',  ico: 'star',    title: 'Безупречно',       desc: 'Урок со 100% точностью',           cond: () => P.stats.perfect >= 1 },
  { id: 'streak3',  ico: 'flame',   title: 'Разогрев',         desc: 'Стрик 3 дня подряд',               cond: () => P.streak >= 3 && displayStreak() >= 3 },
  { id: 'streak7',  ico: 'flame',   title: 'Неделя силы',      desc: 'Стрик 7 дней подряд',              cond: () => P.streak >= 7 && displayStreak() >= 7 },
  { id: 'xp500',    ico: 'bolt',    title: 'Заряжен',          desc: 'Набери 500 XP',                    cond: () => P.xp >= 500 },
  { id: 'xp2000',   ico: 'bolt',    title: 'На орбите',        desc: 'Набери 2000 XP',                   cond: () => P.xp >= 2000 },
  { id: 'crown',    ico: 'crown',   title: 'Корона',           desc: 'Прокачай тему до 3 звёзд',         cond: () => Object.values(P.levels).some(s => Object.values(s).some(l => l >= MAX_LEVEL)) },
  { id: 'trio',     ico: 'spark',   title: 'Многостаночник',   desc: 'Начни все три предмета',           cond: () => ['math', 'inf', 'rus'].every(s => P.levels[s] && Object.values(P.levels[s]).some(l => l >= 1)) },
  { id: 'examPass', ico: 'cap',     title: 'Проходной балл',   desc: 'Сдай пробный экзамен',             cond: () => Object.keys(P.examBest).some(s => P.examBest[s] >= COURSES[s].passMark) },
  { id: 'exam3',    ico: 'medal',   title: 'Троеборец',        desc: 'Пройди порог на пробниках по всем трём предметам', cond: () => ['math', 'inf', 'rus'].every(s => P.examBest[s] >= COURSES[s].passMark) },
  { id: 'exam90',   ico: 'trophy',  title: 'Почти сотка',      desc: '90+ баллов на пробнике',           cond: () => Object.values(P.examBest).some(v => v >= 90) },
  { id: 'cleaner',  ico: 'check',   title: 'Чистая работа',    desc: 'Разбери все свои ошибки',          cond: () => P.stats.cleaned >= 1 },
  { id: 'ai1',      ico: 'spark',   title: 'Дружба с ИИ',      desc: 'Реши задание от нейросети',        cond: () => P.stats.ai >= 1 },
  { id: 'blitz10',  ico: 'timer',   title: 'Скорострел',       desc: '10 верных ответов за один блиц',   cond: () => (P.stats.blitzBest || 0) >= 10 },
  { id: 'memory',   ico: 'refresh', title: 'Прокачал память',  desc: 'Доведи ошибку до конца интервалов повторения', cond: () => (P.stats.graduated || 0) >= 1 },
  { id: 'planDay',  ico: 'check',   title: 'Идеальный день',   desc: 'Выполни весь план на день',        cond: () => P.daily.day === todayStr() && P.daily.lessons > 0 && P.daily.blitz > 0 && dueMistakes().length === 0 }
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
  if (q.morse) {
    /* морзянка: «·»/«.» и «−»/«-» равнозначны, пробелы не важны */
    const mn = s => String(s).replace(/[·•]/g, '.').replace(/[−–—]/g, '-').replace(/[^.\-]/g, '');
    return [].concat(q.correct).some(a => mn(a) === mn(val) && mn(val).length > 0);
  }
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
  const u = COURSES[subj].units[idx];
  if (P.unlocked[subj + ':' + u.id]) return true; /* тему открыли досрочно (пропуск) */
  return unitLevel(subj, COURSES[subj].units[idx - 1].id) >= 1;
}
function unitFlagged(subj, unitId) { return !!P.flagged[subj + ':' + unitId]; }
function toggleFlag(subj, unitId) {
  const k = subj + ':' + unitId;
  if (P.flagged[k]) delete P.flagged[k]; else P.flagged[k] = true;
  saveP();
}
function flaggedList() {
  return Object.keys(P.flagged).map(k => { const [s, id] = k.split(':'); return { subj: s, id }; })
    .filter(x => COURSES[x.subj] && COURSES[x.subj].units.some(u => u.id === x.id));
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
  const icoHtml = ICON[ico] ? ic(ico) : ico; /* имя иконки → SVG, иначе как есть */
  el.innerHTML = `<div class="ico">${icoHtml}</div><div><h4>${esc(title)}</h4><p>${esc(text)}</p></div>`;
  box.appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 450); }, 3600);
}

/* ---------- Клавиатура ---------- */
let KEYH = null;
document.addEventListener('keydown', e => { if (KEYH) KEYH(e); });

/* ---------- Шапка ---------- */
function statPill() {
  return `<div class="statpill">
    <span class="stat fire" title="Стрик">${ic('flame')}${displayStreak()}</span>
    <span class="stat xp" title="Опыт">${ic('bolt')}${P.xp}</span>
  </div>`;
}
function topbar(title, backFn, extra) {
  let right;
  if (extra !== undefined) right = extra;
  else if (backFn) right = statPill();
  else right = statPill() + `
    <button class="iconbtn" id="themeBtn" title="Тема">${ic(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon')}</button>
    <button class="iconbtn" id="glossBtn" title="Справочник терминов">${ic('book')}</button>
    <button class="iconbtn" id="statsBtn" title="Статистика">${ic('chart')}</button>
    <button class="iconbtn" id="setBtn" title="Настройки">${ic('sliders')}</button>`;
  return `<div class="topbar">
    ${backFn ? `<button class="back iconbtn">${ic('back')}</button>` : ''}
    <div class="title">${title}</div>
    ${right}
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
    <h3>${g.t}</h3>
    <p class="term-def">${g.d}</p>
    ${g.ex ? `<div class="term-ex">${esc(g.ex)}</div>` : ''}
    <div id="wikiOut" class="term-wiki"></div>
    <div class="btns">
      ${g.wiki ? `<button class="btn blue" id="wikiBtn">${ic('globe')} Загрузить из Википедии</button>` : ''}
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
  const CATS = { rus: 'Русский язык', math: 'Математика', inf: 'Информатика' };
  const q = (filter || '').toLowerCase();
  const keys = Object.keys(GLOSS).filter(k =>
    !q || k.includes(q) || GLOSS[k].t.toLowerCase().includes(q) || GLOSS[k].d.toLowerCase().includes(q));
  const groups = Object.keys(CATS).map(cat => {
    const items = keys.filter(k => GLOSS[k].cat === cat);
    if (!items.length) return '';
    return `<h3 class="section-title">${CATS[cat]}</h3>` + items.map(k =>
      `<div class="gloss-item" data-k="${k}"><b>${GLOSS[k].t}</b><span>${GLOSS[k].d.slice(0, 80)}…</span></div>`).join('');
  }).join('');
  app.innerHTML = `${topbar('Справочник', true, '')}
    <div class="gloss-search"><input class="set-input" id="glossQ" placeholder="🔍 Найти термин…" value="${esc(filter || '')}"></div>
    <div class="gloss-list">${groups || `<div class="empty"><div class="big">${ic('question')}</div><p>Ничего не нашлось</p></div>`}</div>`;
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

