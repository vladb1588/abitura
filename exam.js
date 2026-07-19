/* ===== Экзамен: выбор, прохождение, таймер, разбор ===== */
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
        <h3>Как это работает</h3>
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
      <button class="back iconbtn" id="exquit">${ic('close')}</button>
      <div class="title">Задание ${EX.pos + 1} из ${EX.qs.length}</div>
      <span class="exam-timer" id="extimer">${fmtTime(EX.deadline - Date.now())}</span>
    </div>
    <div class="exam-nav">${nav}</div>
    <div class="exam-body anim-in">
      <div class="qtext">${q.text}</div>
      ${body}
    </div>
    <div class="exam-controls">
      <button class="btn white" id="exprev" ${EX.pos === 0 ? 'disabled' : ''}>${ic('back')} Назад</button>
      ${EX.pos < EX.qs.length - 1
        ? `<button class="btn blue" id="exnext">Далее ${ic('fwd')}</button>`
        : `<button class="btn red" id="exfinish">Завершить</button>`}
      <button class="btn red" id="exfinish2" title="Завершить" style="flex:0 0 auto;">${ic('check')}</button>
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
      <div class="num">${ic(ok ? 'check' : 'close')} Задание ${i + 1} · ${ok ? 'верно' : 'неверно'}</div>
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
      <div class="big-ic ${passed ? 'gold' : 'neutral'}">${ic(passed ? 'trophy' : 'refresh')}</div>
      <h2>${score} баллов из 100</h2>
      <p class="sub">${timeout ? 'Время вышло! ' : ''}${passed
        ? `Порог пройден! (нужно ${c.passMark})`
        : `Порог ${c.passMark} баллов пока не взят — разбери ошибки ниже и попробуй ещё раз`}</p>
      <div><span class="acc-badge">Верно: ${correct} из ${COURSES[subj].exam.length}</span><span class="xp-badge">${ic('bolt')} +${correct * 2} XP</span></div>
    </div>
    <h3 style="padding:0 22px 6px;">Разбор заданий</h3>
    <div class="exam-review">${rows}</div>
    <div class="bottom-actions">
      <button class="btn wide" id="homeBtn">На главную</button>
    </div>`;
  checkAch();
  document.getElementById('homeBtn').onclick = showHome;
  window.scrollTo(0, 0);
}

