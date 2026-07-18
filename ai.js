/* ===== ИИ-генератор заданий (Claude API) =====
   Прямой вызов из браузера с пользовательским API-ключом.
   Structured outputs гарантируют валидный JSON от модели. */

const AI_SCHEMA = {
  type: 'object',
  properties: {
    question: { type: 'string', description: 'Текст задания на русском. Допустим простой HTML: <br>, <sub>, <sup>, <b>.' },
    kind: { type: 'string', enum: ['mc', 'input'], description: 'mc — выбор из вариантов, input — краткий ответ числом или словом' },
    options: { type: 'array', items: { type: 'string' }, description: 'Для mc — ровно 4 варианта ответа. Для input — пустой массив.' },
    correct: { type: 'string', description: 'Для mc — точный текст правильного варианта (совпадает с одним из options). Для input — краткий ответ.' },
    explanation: { type: 'string', description: 'Короткое пошаговое решение (2–4 предложения).' }
  },
  required: ['question', 'kind', 'options', 'correct', 'explanation'],
  additionalProperties: false
};

const AI_SUBJECT_HINT = {
  math: 'математике (программа внутренних вступительных испытаний вузов: алгебра, функции, начала анализа, тригонометрия, геометрия, вероятность — уровень ЕГЭ)',
  inf: 'информатике (программа внутренних вступительных испытаний вузов: системы счисления, логика, кодирование информации, алгоритмы, программирование, сети, комбинаторика, игры и стратегии — уровень ЕГЭ)',
  rus: 'русскому языку (программа внутренних вступительных испытаний вузов: орфография, пунктуация, орфоэпия, лексические и грамматические нормы — уровень ЕГЭ)'
};

async function aiGenerateTask(subj, unit, difficulty) {
  const st = P.settings;
  const example = unit && unit.pool.length ? unit.pool[0].text.replace(/<[^>]+>/g, ' ').slice(0, 220) : '';
  const sys = `Ты — опытный составитель заданий для подготовки абитуриентов к внутренним вступительным испытаниям вузов (аналог ЕГЭ). Составляй корректные задания с однозначным ответом. Для input-заданий ответ — число или одно слово (десятичные дроби через запятую). Формулы записывай простым HTML (<sub>, <sup>), без LaTeX. Не используй картинки, таблицы и графики — задание должно решаться по тексту.`;
  const user = `Составь одно ${difficulty === 'hard' ? 'задание повышенной сложности' : 'задание базового уровня'} по ${AI_SUBJECT_HINT[subj]}.
${unit ? `Тема: «${unit.title}».` : 'Тему выбери сам из программы.'}
${example ? `Пример стиля заданий по этой теме: «${example}…»` : ''}
Придумай новое задание (не копируй пример), с другими числами и формулировкой. Проверь решение дважды: ответ обязан быть верным.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': st.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: st.model || 'claude-opus-4-8',
      max_tokens: 2000,
      system: sys,
      output_config: { format: { type: 'json_schema', schema: AI_SCHEMA } },
      messages: [{ role: 'user', content: user }]
    })
  });

  if (!res.ok) {
    let msg = 'Ошибка API (' + res.status + ')';
    try { msg = (await res.json()).error.message || msg; } catch (e) { /* нет тела */ }
    if (res.status === 401) msg = 'Неверный API-ключ. Проверь его в настройках.';
    if (res.status === 429) msg = 'Слишком много запросов — подожди минуту.';
    throw new Error(msg);
  }
  const data = await res.json();
  if (data.stop_reason === 'refusal') throw new Error('Модель отклонила запрос, попробуй ещё раз.');
  const textBlock = (data.content || []).find(b => b.type === 'text');
  if (!textBlock) throw new Error('Пустой ответ модели.');
  const t = JSON.parse(textBlock.text);

  // Преобразуем в формат вопроса тренажёра
  const q = { text: t.question, expl: t.explanation, hard: difficulty === 'hard', _ai: true, _subj: subj, _unit: unit ? unit.id : '' };
  if (t.kind === 'mc' && Array.isArray(t.options) && t.options.length >= 2) {
    const idx = t.options.findIndex(o => norm(o) === norm(t.correct));
    if (idx >= 0) {
      q.type = 'mc';
      q.options = t.options.map(esc);
      q.correct = idx;
      return q;
    }
  }
  q.type = 'input';
  q.correct = t.correct;
  return q;
}

/* ---------- Экран ИИ-генератора ---------- */
let AI_SEL = { subj: 'math', unit: '', diff: 'base', count: 3 };

function showAI() {
  KEYH = null;
  if (!P.settings.apiKey) {
    app.innerHTML = `${topbar('🤖 ИИ-задания', true, '')}
      <div class="theory">
        <div class="theory-card">
          <h3>🤖 Бесконечные задания от Claude</h3>
          <p>Нейросеть будет придумывать <b>новые уникальные задания</b> по любой теме программы — с решением и разбором. Идеально, когда встроенные генераторы уже примелькались.</p>
          <p>Для работы нужен API-ключ Anthropic:</p>
          <ul>
            <li>зайди на <b>console.anthropic.com</b>;</li>
            <li>создай ключ в разделе <b>API Keys</b>;</li>
            <li>вставь его в настройках приложения.</li>
          </ul>
          <p class="sub">Ключ хранится только в твоём браузере и отправляется только в API Anthropic.</p>
        </div>
        <button class="btn purple wide" id="goSet">ОТКРЫТЬ НАСТРОЙКИ</button>
      </div>`;
    bindTopbar(showHome);
    document.getElementById('goSet').onclick = showSettings;
    return;
  }

  const subjBtns = Object.keys(COURSES).map(s =>
    `<button class="${AI_SEL.subj === s ? 'on' : ''}" data-v="${s}">${COURSES[s].icon} ${COURSES[s].title}</button>`).join('');
  const units = COURSES[AI_SEL.subj].units;
  const unitOpts = `<option value="">🎲 Случайная тема</option>` + units.map(u =>
    `<option value="${u.id}" ${AI_SEL.unit === u.id ? 'selected' : ''}>${u.icon} ${u.title}</option>`).join('');

  app.innerHTML = `${topbar('🤖 ИИ-задания', true, '')}
    <div class="settings">
      <div class="set-row">
        <h4>Предмет</h4>
        <div class="seg" id="aiSubj">${subjBtns}</div>
      </div>
      <div class="set-row">
        <h4>Тема</h4>
        <select class="set-input" id="aiUnit">${unitOpts}</select>
      </div>
      <div class="set-row">
        <h4>Сложность</h4>
        <div class="seg" id="aiDiff">
          <button class="${AI_SEL.diff === 'base' ? 'on' : ''}" data-v="base">Базовая</button>
          <button class="${AI_SEL.diff === 'hard' ? 'on' : ''}" data-v="hard">🏆 Повышенная</button>
        </div>
      </div>
      <div class="set-row">
        <h4>Сколько заданий</h4>
        <div class="seg" id="aiCount">
          ${[1, 3, 5].map(n => `<button class="${AI_SEL.count === n ? 'on' : ''}" data-v="${n}">${n}</button>`).join('')}
        </div>
      </div>
      <button class="btn purple wide" id="aiGo">✨ СГЕНЕРИРОВАТЬ И РЕШАТЬ</button>
      <p class="sub" style="text-align:center;">Модель: ${esc(P.settings.model)} · за ошибки в ИИ-заданиях XP тоже начисляется, а промахи попадают в «Мои ошибки»</p>
    </div>`;
  bindTopbar(showHome);

  document.querySelectorAll('#aiSubj button').forEach(b => b.onclick = () => { AI_SEL.subj = b.dataset.v; AI_SEL.unit = ''; showAI(); });
  document.querySelectorAll('#aiDiff button').forEach(b => b.onclick = () => {
    AI_SEL.diff = b.dataset.v;
    document.querySelectorAll('#aiDiff button').forEach(x => x.classList.toggle('on', x === b));
  });
  document.querySelectorAll('#aiCount button').forEach(b => b.onclick = () => {
    AI_SEL.count = Number(b.dataset.v);
    document.querySelectorAll('#aiCount button').forEach(x => x.classList.toggle('on', x === b));
  });
  document.getElementById('aiUnit').onchange = e => { AI_SEL.unit = e.target.value; };
  document.getElementById('aiGo').onclick = runAI;
}

async function runAI() {
  const units = COURSES[AI_SEL.subj].units;
  const unit = AI_SEL.unit ? units.find(u => u.id === AI_SEL.unit) : null;

  app.innerHTML = `${topbar('🤖 ИИ-задания', true, '')}
    <div class="ai-load">
      <div class="ai-spinner"></div>
      <p id="aiStatus">Claude придумывает задания…</p>
      <p class="sub" style="margin-top:8px;">Обычно это занимает 10–30 секунд</p>
    </div>`;
  bindTopbar(showHome);

  try {
    const jobs = Array.from({ length: AI_SEL.count }, () => {
      const u = unit || units[rnd(0, units.length - 1)];
      return aiGenerateTask(AI_SEL.subj, u, AI_SEL.diff);
    });
    let done = 0;
    jobs.forEach(p => p.then(() => {
      done++;
      const el = document.getElementById('aiStatus');
      if (el) el.textContent = `Готово ${done} из ${jobs.length}…`;
    }).catch(() => {}));

    const results = await Promise.allSettled(jobs);
    const tasks = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    if (!tasks.length) {
      const err = results.find(r => r.status === 'rejected');
      throw (err && err.reason) || new Error('Не удалось сгенерировать задания.');
    }
    if (tasks.length < AI_SEL.count) toast('⚠️', 'Частично готово', `Сгенерировано ${tasks.length} из ${AI_SEL.count} заданий.`);

    S = { mode: 'ai', queue: tasks, pos: 0, total: tasks.length, origTotal: tasks.length, firstTry: 0, answered: 0, earned: 0 };
    renderQuiz();
  } catch (e) {
    toast('❌', 'Не получилось', e.message || 'Ошибка генерации');
    showAI();
  }
}
