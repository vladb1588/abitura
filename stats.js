/* ===== Статистика, настройки и старт приложения ===== */
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
      <div class="ico">${ic(a.ico)}</div><h4>${a.title}</h4><p>${a.desc}</p>
    </div>`
  ).join('');

  app.innerHTML = `
    ${topbar('Статистика', true, '')}
    <div class="stats-grid">
      <div class="stat-card"><div class="val">${ic('bolt')} ${P.xp}</div><div class="lbl">Всего опыта</div></div>
      <div class="stat-card"><div class="val">${ic('flame')} ${displayStreak()}</div><div class="lbl">Стрик (дней подряд)${P.freezes ? ' · ' + P.freezes + ' заморозки' : ''}</div></div>
      <div class="stat-card"><div class="val">${acc}%</div><div class="lbl">Точность (${P.stats.correct} из ${P.stats.answers})</div></div>
      <div class="stat-card"><div class="val">${P.stats.lessons}</div><div class="lbl">Уроков пройдено</div></div>
      <div class="stat-card"><div class="val">${ic('timer')} ${P.stats.blitzBest || 0}</div><div class="lbl">Рекорд блица (за минуту)</div></div>
      <div class="stat-card"><div class="val">${ic('refresh')} ${P.stats.graduated || 0}</div><div class="lbl">Выучено через повторения (в очереди ${P.mistakes.length})</div></div>
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
    ${topbar('Настройки', true, '')}
    <div class="settings">
      <div class="set-row">
        <h4>${ic('sun')} Тема</h4>
        ${seg('theme', [{ v: 'light', t: 'Светлая' }, { v: 'dark', t: 'Тёмная' }, { v: 'auto', t: 'Авто' }], st.theme)}
      </div>
      <div class="set-row">
        <h4>${ic('palette')} Палитра</h4>
        ${seg('palette', [
          { v: 'classic', t: '<span class="sw" style="background:#58cc02"></span>Классика' },
          { v: 'ocean', t: '<span class="sw" style="background:#06b6d4"></span>Океан' },
          { v: 'sunset', t: '<span class="sw" style="background:#f97316"></span>Закат' },
          { v: 'grape', t: '<span class="sw" style="background:#a855f7"></span>Виноград' },
          { v: 'mono', t: '<span class="sw" style="background:#3a3a3a"></span>Графит' }], st.palette || 'classic')}
      </div>
      <div class="set-row">
        <h4>${ic('image')} Фон</h4>
        ${seg('bg', [
          { v: 'classic', t: '<span class="sw" style="background:#eceff3"></span>Классика' },
          { v: 'cream', t: '<span class="sw" style="background:#ecd9b0"></span>Бумага' },
          { v: 'mint', t: '<span class="sw" style="background:#bfe6cd"></span>Мята' },
          { v: 'sky', t: '<span class="sw" style="background:#c3ddf7"></span>Небо' },
          { v: 'space', t: '<span class="sw" style="background:#cfc2ee"></span>Космос' }], st.bg || 'classic')}
        <div class="hint">Фон и палитра кнопок настраиваются независимо и работают в обеих темах.</div>
      </div>
      <div class="set-row">
        <h4>${ic('volume')} Звуки</h4>
        ${seg('sound', [{ v: 'on', t: 'Вкл' }, { v: 'off', t: 'Выкл' }], st.sound ? 'on' : 'off')}
      </div>
      <div class="set-row">
        <h4>${ic('target')} Дневная цель</h4>
        ${seg('goal', [{ v: '30', t: '30 XP' }, { v: '50', t: '50 XP' }, { v: '100', t: '100 XP' }, { v: '200', t: '200 XP' }], String(st.goal))}
      </div>
      <div class="set-row">
        <h4>${ic('calendar')} Дата экзамена</h4>
        <input type="date" class="set-input" id="examDate" value="${esc(st.examDate)}">
        <div class="hint">На главном экране появится обратный отсчёт.</div>
      </div>
      <div class="set-row">
        <h4>${ic('flask')} Экспериментальное</h4>
        <div class="exp-row">
          <div><b>ИИ-задания</b><div class="hint" style="margin-top:2px;">Бесконечные задания от нейросети Claude. Нужен свой API-ключ. Пока в тестовом режиме — включи, если хочешь попробовать.</div></div>
          ${seg('showai', [{ v: 'on', t: 'Вкл' }, { v: 'off', t: 'Выкл' }], st.showAI ? 'on' : 'off')}
        </div>
        <div style="height:12px"></div>
        <div class="exp-row">
          <div><b>Курс «Азбука Морзе»</b><div class="hint" style="margin-top:2px;">Научись принимать и передавать морзянку: 6 тем, озвучка кода, напевы. Появится на главной среди предметов.</div></div>
          ${seg('showmorse', [{ v: 'on', t: 'Вкл' }, { v: 'off', t: 'Выкл' }], st.showMorse ? 'on' : 'off')}
        </div>
      </div>
      ${st.showAI ? `
      <div class="set-row">
        <h4>${ic('spark')} ИИ-генератор заданий <span class="ai-badge">AI</span></h4>
        <input type="password" class="set-input" id="apiKey" placeholder="sk-ant-..." value="${esc(st.apiKey)}">
        <div class="hint">API-ключ Anthropic для генерации заданий нейросетью Claude. Получить: console.anthropic.com → API Keys. Ключ хранится только в твоём браузере.</div>
        <div style="height:10px"></div>
        ${seg('model', [{ v: 'claude-opus-4-8', t: 'Opus (умнее)' }, { v: 'claude-sonnet-5', t: 'Sonnet' }, { v: 'claude-haiku-4-5', t: 'Haiku (дешевле)' }], st.model)}
      </div>` : ''}
      <div class="set-row">
        <h4>${ic('save')} Резервная копия</h4>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn blue" id="expBtn">${ic('download')} Экспорт прогресса</button>
          <button class="btn white" id="impBtn">${ic('upload')} Импорт</button>
        </div>
        <input type="file" id="impFile" accept=".json,application/json" style="display:none;">
        <div class="hint">Прогресс хранится в браузере. Сохрани файл, чтобы перенести его на другой компьютер или в другой браузер.</div>
      </div>
      <div class="set-row">
        <h4>${ic('trash')} Данные</h4>
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
      if (name === 'showai') { P.settings.showAI = v === 'on'; saveP(); showSettings(); return; }
      if (name === 'showmorse') { P.settings.showMorse = v === 'on'; syncExperimental(); saveP(); showSettings(); return; }
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
    toast('download', 'Файл сохранён', 'Резервная копия прогресса скачана.');
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
        syncExperimental();
        toast('upload', 'Прогресс восстановлен', `Загружено: ${P.xp} XP, стрик ${P.streak}.`);
        showHome();
      } catch (err) {
        toast('close', 'Не получилось', 'Файл не похож на резервную копию тренажёра.');
      }
    };
    r.readAsText(f);
  };
  const apiKeyEl = document.getElementById('apiKey');
  if (apiKeyEl) apiKeyEl.onchange = e => { P.settings.apiKey = e.target.value.trim(); saveP(); };
  document.getElementById('resetBtn').onclick = () => {
    if (confirm('Точно сбросить весь прогресс? Это действие необратимо.')) {
      const st = P.settings;
      P = defaultP();
      P.settings = st;
      saveP();
      toast('trash', 'Прогресс сброшен', 'Начинаем с чистого листа!');
      showHome();
    }
  };
}

/* ---------- Старт ---------- */
applyTheme();
syncExperimental();
showHome();
