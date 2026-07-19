/* ===== Экраны: главная, курс, теория, квиз, умная тренировка, блиц, что нового ===== */
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
    if (days >= 0) countdown = `<div class="countdown">${ic('calendar')} До экзамена: ${days} дн.</div>`;
  }

  const cards = Object.keys(COURSES).map(s => {
    const c = COURSES[s];
    const pr = courseProgress(s);
    const best = P.examBest[s];
    return `<button class="subject-card" data-subj="${s}">
      <div class="subj-mono subj-${s}">${SUBJ_MONO[s] || ic('book')}</div>
      <div class="info">
        <h3>${c.title}</h3>
        <div class="meta">Тем пройдено: ${pr.done} из ${pr.total}${best !== undefined ? ` · рекорд ${best}/100` : ''}</div>
        <div class="progressbar"><div style="width:${Math.round(pr.done / pr.total * 100)}%"></div></div>
      </div>
      <span class="arrow">${ic('fwd')}</span>
    </button>`;
  }).join('');

  const fresh = P.stats.answers === 0;
  const onboarding = fresh ? `
    <div class="plan onboard">
      <div class="plan-head"><h3>С чего начать</h3></div>
      <div class="onb-step"><span class="onb-n">1</span> Выбери предмет и пройди первый урок — сначала теория, потом практика</div>
      <div class="onb-step"><span class="onb-n">2</span> Возвращайся каждый день: ошибки будут повторяться сами, по науке</div>
      <div class="onb-step"><span class="onb-n">3</span> Раз в неделю сдавай пробный экзамен — привыкай к формату</div>
      <div class="plan-tip">${ic('book')} Непонятное слово в теории? Подчёркнутые термины кликабельны, а весь словарь — по кнопке в шапке.</div>
    </div>` : '';

  const tool = (act, icon, tint, title, sub, badge) => `
    <button class="tool tint-${tint}" data-act="${act}">
      <span class="tool-ic">${ic(icon)}</span>
      <span class="tool-body"><span class="tool-t">${title}${badge || ''}</span><span class="tool-sub">${sub}</span></span>
    </button>`;
  const due = dueMistakes().length;

  app.innerHTML = `
    ${topbar('Абитура')}
    <div class="hero">
      <div class="logo">${ic('cap')}</div>
      <h1>Абитура</h1>
      <p class="sub">Подготовка к вступительным · темы по программе ЕГЭ</p>
      ${countdown}
      <button class="btn cta" id="ctaBtn">${ic('play')} ${fresh ? 'Начать учиться' : 'Продолжить'}</button>
    </div>
    ${onboarding}
    <div class="daily ${dx >= goal ? 'done' : ''}" ${fresh ? 'style="display:none"' : ''}>
      <div class="ring">
        <svg width="56" height="56">
          <circle cx="28" cy="28" r="${R}" fill="none" stroke="var(--gray)" stroke-width="6"/>
          <circle cx="28" cy="28" r="${R}" fill="none" stroke="${dx >= goal ? 'var(--yellow)' : 'var(--green)'}" stroke-width="6"
            stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct / 100)}"/>
        </svg>
        <div class="pct">${dx >= goal ? ic('check') : pct + '%'}</div>
      </div>
      <div>
        <h3>Дневная цель</h3>
        <div class="sub">${dx} / ${goal} XP · ${dx >= goal ? 'выполнена' : 'вперёд!'}</div>
      </div>
    </div>
    ${fresh ? '' : planCard()}
    <h2 class="block-title">Предметы</h2>
    <div class="cards">${cards}</div>
    <h2 class="block-title">Тренировка</h2>
    <button class="tool tool-hero tint-accent" data-act="blitz">
      <span class="tool-ic">${ic('timer')}</span>
      <span class="tool-body"><span class="tool-t">Блиц</span><span class="tool-sub">60 секунд · задания на скорость</span></span>
      <span class="arrow">${ic('fwd')}</span>
    </button>
    <div class="toolgrid">
      ${tool('mistakes', 'refresh', 'blue', 'Повторение', 'ошибки по расписанию', due ? ` <span class="cnt">${due}</span>` : '')}
      ${tool('smart', 'target', 'violet', 'Умная', 'слабые темы')}
      ${tool('examselect', 'note', 'amber', 'Экзамен', 'пробный с таймером')}
      ${P.settings.showAI
        ? tool('ai', 'spark', 'violet', 'ИИ-задания', 'бесконечные, от Claude')
        : tool('news', 'star', 'accent', 'Что нового', 'фичи и обновления', P.seenNews < NEWS_V ? ' <span class="cnt">!</span>' : '')}
    </div>
    ${P.settings.showAI ? `
    <button class="tool tool-slim" data-act="news">
      <span class="tool-ic">${ic('star')}</span>
      <span class="tool-body"><span class="tool-t">Что нового${P.seenNews < NEWS_V ? ' <span class="cnt">!</span>' : ''}</span></span>
      <span class="arrow">${ic('fwd')}</span>
    </button>` : ''}`;
  bindTopbar();
  app.querySelectorAll('.subject-card').forEach(el => el.onclick = () => showCourse(el.dataset.subj));
  app.querySelector('[data-act="mistakes"]').onclick = () => showMistakes();
  app.querySelector('[data-act="smart"]').onclick = startSmart;
  app.querySelector('[data-act="examselect"]').onclick = showExamSelect;
  const aiBtn = app.querySelector('[data-act="ai"]'); if (aiBtn) aiBtn.onclick = () => showAI();
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
    { label: 'Пройди один урок', done: P.daily.lessons > 0 },
    { label: due ? `Повторение (${due})` : 'Повторение выполнено', done: due === 0 },
    { label: 'Блиц-разминка', done: P.daily.blitz > 0 }
  ];
  const doneCount = items.filter(i => i.done).length;
  const tip = TIPS[new Date().getDate() % TIPS.length];
  return `<div class="plan ${doneCount === 3 ? 'alldone' : ''}">
    <div class="plan-head">
      <h3>План на сегодня</h3>
      <span class="plan-count">${doneCount}/3</span>
    </div>
    ${items.map(i => `<div class="plan-item ${i.done ? 'done' : ''}"><span class="chk">${ic(i.done ? 'check' : 'circle')}</span> ${i.label}</div>`).join('')}
    <div class="plan-tip">${ic('bulb')} ${tip}</div>
    ${P.freezes ? `<div class="plan-tip">${ic('snow')} Заморозок стрика в запасе: ${P.freezes}</div>` : ''}
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
    const flagged = unitFlagged(subj, u.id);
    let cls = !unlocked ? 'locked' : lv >= MAX_LEVEL ? 'done' : '';
    if (unlocked && lv < MAX_LEVEL && !nextFound) { cls += ' next'; nextFound = true; }
    const glyph = !unlocked ? ic('lock') : lv >= MAX_LEVEL ? ic('crown') : ic('play');
    const stars = Array.from({ length: MAX_LEVEL }, (_, k) =>
      `<span class="dot ${k < lv ? 'on' : ''}"></span>`).join('');
    return `<div class="unit-row ${flagged ? 'flagged' : ''}" style="animation-delay:${i * 0.03}s">
      <div class="unit-node ${cls}" data-idx="${i}">${glyph}</div>
      <div class="unit-info">
        <h3>${flagged ? `<span class="flag-mark" title="Отмечено как сложное">${ic('flagFill')}</span>` : ''}${u.title}</h3>
        <div class="unit-stars">${stars}</div>
      </div>
      <div class="unit-actions">
        ${unlocked
          ? `<button class="flagbtn ${flagged ? 'on' : ''}" data-flag="${u.id}" title="${flagged ? 'Снять отметку' : 'Отметить как сложную'}">${ic(flagged ? 'flagFill' : 'flag')}</button>
             <button class="minibtn" data-th="${i}">${ic('book')} Теория</button>`
          : `<button class="minibtn" data-open="${i}">${ic('unlock')} Открыть</button>`}
      </div>
    </div>`;
  }).join('');
  app.innerHTML = `
    ${topbar(`<span class="title-mono subj-${subj}">${SUBJ_MONO[subj] || ''}</span>${c.title}`, true)}
    <div class="unit-list">${rows}</div>
    <div class="bottom-actions">
      ${c.exam.length ? `<button class="btn wide ghost" data-act="exam">${ic('note')} Пробный экзамен · ${c.exam.length} заданий, ${c.examTime} мин</button>` : ''}
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
  app.querySelectorAll('[data-flag]').forEach(el => el.onclick = (e) => {
    e.stopPropagation();
    toggleFlag(subj, el.dataset.flag);
    showCourse(subj);
  });
  app.querySelectorAll('[data-open]').forEach(el => el.onclick = () => {
    const i = Number(el.dataset.open);
    const u = c.units[i];
    if (confirm(`Открыть тему «${u.title}» досрочно, не проходя предыдущие?`)) {
      P.unlocked[subj + ':' + u.id] = true;
      saveP();
      showCourse(subj);
    }
  });
  const exBtn = app.querySelector('[data-act="exam"]'); if (exBtn) exBtn.onclick = () => confirmExam(subj);
}

/* ---------- Экран: теория ---------- */
function showTheory(subj, unitIdx, thenLesson) {
  KEYH = null;
  const c = COURSES[subj];
  const u = c.units[unitIdx];
  if (thenLesson) { P.seenTheory[subj + ':' + u.id] = true; saveP(); }
  const cards = u.theory.map((t, i) => `<div class="theory-card" style="animation-delay:${i * 0.07}s"><h3>${t.title}</h3>${t.html}</div>`).join('');
  app.innerHTML = `
    ${topbar(`<span class="title-mono subj-${subj}">${SUBJ_MONO[subj] || ''}</span>${u.title}`, true, '')}
    <div class="theory">${cards}</div>
    <div class="bottom-actions">
      <button class="btn wide" data-act="go">${thenLesson ? 'Начать урок' : 'К практике'}</button>
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

  // приоритет: отмеченные «сложные» темы + слабые по счётчику ошибок
  const weak = Object.entries(P.weak).sort((a, b) => b[1] - a[1]).map(e => e[0]);
  const allGenUnits = [];
  Object.keys(COURSES).forEach(s => COURSES[s].units.forEach(u => {
    if (u.gens && u.gens.length) allGenUnits.push(s + ':' + u.id);
  }));
  const flaggedKeys = Object.keys(P.flagged).filter(k => allGenUnits.includes(k));
  // сначала отмеченные, затем слабые (без дублей)
  const source = [...new Set([...flaggedKeys, ...weak.filter(k => allGenUnits.includes(k))])];
  let guard = 0;
  while (queue.length < SMART_LEN && guard++ < 80) {
    const key = source.length && Math.random() < 0.75 ? pick(source.slice(0, 5)) : pick(allGenUnits);
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
  if (!queue.length) { toast('question', 'Пусто', 'В этой теме пока нет заданий.'); return; }
  S = { mode: 'lesson', subj, unitIdx, queue, pos: 0, total: queue.length, origTotal: queue.length, firstTry: 0, answered: 0, earned: 0 };
  if (queue._adaptive) toast('flame', 'Адаптивная сложность', 'Точность в теме высокая — задания будут посложнее.');
  renderQuiz();
}

function startSmart() {
  const queue = buildSmartQueue();
  if (!queue.length) { toast('question', 'Пока нечего тренировать', 'Пройди пару уроков — и умная тренировка заработает.'); return; }
  S = { mode: 'smart', queue, pos: 0, total: queue.length, origTotal: queue.length, firstTry: 0, answered: 0, earned: 0 };
  renderQuiz();
}

function showMistakes(force) {
  if (!P.mistakes.length) {
    KEYH = null;
    app.innerHTML = `${topbar('Повторение', true, '')}
      <div class="empty"><div class="big">${ic('check')}</div><p>Ошибок нет! Реши пару уроков — если ошибёшься, задания появятся здесь и будут повторяться по науке: через 1, 2, 4, 7 и 14 дней.</p></div>`;
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
          <h3>На сегодня всё повторено!</h3>
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
const MODE_LABEL = { lesson: 'Задание', mistakes: 'Повторение', smart: 'Умная тренировка', ai: 'Задание от ИИ' };

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
      <button class="quit iconbtn">${ic('close')}</button>
      <div class="progressbar"><div style="width:${progress}%"></div></div>
      <span class="stat xp">${ic('bolt')}${S.earned}</span>
    </div>
    <div class="quiz-body anim-in">
      <div class="qtype-row">
        <div class="qtype">${q._retry ? 'Повтор' : (q.hard ? 'Повышенная сложность' : MODE_LABEL[S.mode] || 'Задание')}</div>
        ${hasTheory ? `<button class="minibtn" id="quizTheory">${ic('book')} Теория</button>` : ''}
      </div>
      <div class="qtext">${q.text}</div>
      ${body}
    </div>
    <div class="quiz-footer">
      <div class="quiz-btns">
        <button class="btn white" id="skipQBtn">Пропустить</button>
        <button class="btn" id="checkBtn" disabled>Проверить</button>
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
            toast('refresh', 'Выучено навсегда!', 'Задание прошло все интервалы повторения и покинуло «Ошибки».');
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
      <div class="fico">${ic(ok ? 'check' : 'close')}</div>
      <div>
        <h3>${ok ? pick(['Отлично!', 'Верно!', 'Так держать!', 'Именно так!', 'Красота!']) : (skipped ? 'Пропущено' : 'Неверно')}</h3>
        ${!ok ? `<div class="expl"><b>Правильный ответ: ${esc(correctText)}</b></div>` : ''}
        ${q.expl ? `<div class="expl">${q.expl}</div>` : ''}
      </div>
    </div>
    <button class="btn ${ok ? '' : 'red'} wide" id="contBtn">Продолжить</button>`;

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
      : 'Все ошибки разобраны';
  } else if (S.mode === 'smart') {
    bonus = 10;
    addXP(bonus);
    title = 'Тренировка завершена!';
    sub = 'Умная тренировка подтягивает твои слабые темы';
  } else {
    title = 'ИИ-раунд завершён!';
    sub = 'Нейросеть может генерировать задания бесконечно';
  }
  saveP();
  const earned = S.earned + bonus;
  const subj = S.subj, mode = S.mode;

  if (acc >= 80) { confetti(acc === 100 ? 120 : 70); playSound('complete'); }

  app.innerHTML = `
    <div class="result">
      <div class="big-ic ${acc >= 80 ? 'gold' : acc >= 50 ? 'ok' : 'neutral'}">${ic(acc === 100 ? 'crown' : acc >= 80 ? 'star' : acc >= 50 ? 'check' : 'refresh')}</div>
      <h2>${title}</h2>
      <p class="sub">${sub}</p>
      <div><span class="xp-badge">${ic('bolt')} +${earned} XP</span><span class="acc-badge">${ic('target')} Точность ${acc}%</span></div>
      <div style="margin-top:30px;">
        <button class="btn wide" id="okBtn">Продолжить</button>
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
const NEWS_V = 2; /* увеличивай при заметных обновлениях — на кнопке появится «!» */

const FEATURES = [
  { ico: 'volume', title: 'Азбука Морзе (эксперимент)', desc: 'Полный курс: 6 тем от точек и тире до слов и SOS, озвучка кода, напевы. Включается в настройках.', act: 'settings' },
  { ico: 'timer', title: 'Блиц: 60 секунд', desc: 'Задания вперемешку из всех предметов на скорость. Серии, рекорды, бонусный XP.', act: 'blitz' },
  { ico: 'refresh', title: 'Повторение по науке', desc: 'Ошибки возвращаются через 1–2–4–7–14 дней — ровно когда мозг начинает забывать (система Лейтнера).', act: 'mistakes' },
  { ico: 'target', title: 'Адаптивная сложность', desc: 'Точность в теме ≥80% — задания становятся сложнее, ниже 50% — проще. Само подстраивается.' },
  { ico: 'book', title: 'Справочник терминов', desc: 'Подчёркнутые слова в теории кликабельны: определение, пример и статья из Википедии.', act: 'gloss' },
  { ico: 'bulb', title: 'Теория из задания', desc: 'Забыл правило посреди урока? Кнопка «Теория» в углу задания откроет её, не сбив прогресс.' },
  { ico: 'sliders', title: 'Палитры и фоны', desc: '4 цвета кнопок и 5 фонов — собери своё оформление, всё работает в светлой и тёмной темах.', act: 'settings' },
  { ico: 'spark', title: 'ИИ-задания', desc: 'Claude придумывает бесконечные новые задания по любой теме — со своим API-ключом.', act: 'ai' },
  { ico: 'note', title: 'Резервная копия', desc: 'Экспорт и импорт прогресса файлом — перенеси стрик и XP на другой компьютер или телефон.', act: 'settings' },
  { ico: 'snow', title: 'Заморозки стрика', desc: 'Каждые 5 дней стрика — заморозка в запас (до 2). Пропустил день — стрик уцелеет.' },
  { ico: 'check', title: 'План на сегодня', desc: 'Урок + повторение + блиц: три компонента эффективной тренировки с галочками на главной.' }
];

const CHANGELOG = [
  { d: '19 июля 2026', items: ['Курс «Азбука Морзе» в экспериментальном разделе: приём и передача, озвучка, напевы, слова и SOS', 'Флаг «сложная тема» и досрочная разблокировка тем', 'Единый набор SVG-иконок вместо эмодзи во всём приложении', 'Проект разбит на модули'] },
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
      <b>${ic(f.ico)} ${f.title}${f.act ? ` <span class="arrow-sm">${ic('fwd')}</span>` : ''}</b>
      <span>${f.desc}</span>
    </div>`).join('');
  const log = CHANGELOG.map(c => `
    <div class="theory-card">
      <h3>${c.d}</h3>
      <ul>${c.items.map(i => `<li>${i}</li>`).join('')}</ul>
    </div>`).join('');
  app.innerHTML = `${topbar('Что нового', true, '')}
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
  app.innerHTML = `${topbar('Блиц', true, '')}
    <div class="theory">
      <div class="theory-card">
        <h3>60 секунд. Максимум задач.</h3>
        <p>Быстрые задания вперемешку из всех трёх предметов. Верный ответ — <b>+2 XP</b>, серия из 5 подряд — <b>+5 XP</b> бонусом.</p>
        <p>Ошибся или пропустил — серия сгорает, но время идёт. Вперёд!</p>
        ${P.stats.blitzBest ? `<p class="sub">Твой рекорд: <b>${P.stats.blitzBest}</b> верных за минуту</p>` : ''}
      </div>
      <button class="btn orange wide" id="blitzGo">Старт!</button>
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
      <button class="quit iconbtn">${ic('close')}</button>
      <div class="blitz-track"><div id="blitzbar" style="width:${left / BLITZ_MS * 100}%"></div></div>
      <span class="stat" style="color:var(--orange)">${ic('timer')}<span id="blitztime">${Math.ceil(left / 1000)}</span></span>
      <span class="stat xp">${ic('check')}${B.score}</span>
    </div>
    <div class="quiz-body anim-in" id="blitzbody">
      <div class="qtype">Блиц ${B.combo >= 2 ? `· серия ×${B.combo}` : ''}</div>
      <div class="qtext">${q.text}</div>
      ${body}
    </div>
    <div class="quiz-footer">
      <button class="btn white wide" id="skipBtn">Пропустить</button>
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
    if (B.combo % 5 === 0) { addXP(5); toast('flame', 'Серия ' + B.combo + '!', '+5 XP бонусом'); }
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
      <div class="big-ic ${record && score > 0 ? 'gold' : 'neutral'}">${ic(record && score > 0 ? 'medal' : score >= 8 ? 'bolt' : 'timer')}</div>
      <h2>${score} верных за минуту</h2>
      <p class="sub">${record && score > 0 ? 'Новый рекорд! +10 XP бонусом' : P.stats.blitzBest ? 'Рекорд: ' + P.stats.blitzBest : ''}</p>
      <div>
        <span class="acc-badge">Отвечено: ${answered}</span>
        <span class="xp-badge">${ic('bolt')} +${score * 2 + (record && score > 0 ? 10 : 0)} XP</span>
      </div>
      <div style="margin-top:30px; display:flex; flex-direction:column; gap:10px;">
        <button class="btn orange wide" id="againBtn">Ещё раз</button>
        <button class="btn white wide" id="okBtn">На главную</button>
      </div>
    </div>`;
  checkAch();
  document.getElementById('againBtn').onclick = startBlitz;
  document.getElementById('okBtn').onclick = showHome;
  KEYH = e => { if (e.key === 'Enter') startBlitz(); };
}

