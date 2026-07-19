/* ===== Тесты движка (исполняются внутри eval вместе с app.js) ===== */
let __errors = 0;
function t(name, cond) { if (!cond) { __errors++; console.log('FAIL: ' + name); } else console.log('ok: ' + name); }

/* isCorrect: старые типы */
t('mc верный', isCorrect({ type: 'mc', correct: 2 }, 2));
t('mc неверный', !isCorrect({ type: 'mc', correct: 2 }, 1));
t('input число с запятой', isCorrect({ type: 'input', correct: '0,25' }, '0.25'));
t('input массив ответов', isCorrect({ type: 'input', correct: ['-5', '−5'] }, '−5'));

/* isCorrect: multi */
const mq = { type: 'multi', options: ['a', 'b', 'c', 'd'], correct: [0, 2, 3] };
t('multi верный (порядок не важен)', isCorrect(mq, [3, 0, 2]));
t('multi не хватает', !isCorrect(mq, [0, 2]));
t('multi лишний', !isCorrect(mq, [0, 1, 2, 3]));

/* isCorrect: match */
const qm = { type: 'match', pairs: [['одеть', 'ребёнка'], ['надеть', 'пальто']] };
t('match верный', isCorrect(qm, ['ребёнка', 'пальто']));
t('match перепутан', !isCorrect(qm, ['пальто', 'ребёнка']));

/* SRS */
t('SRS интервалы 1-2-4-7-14', SRS_INT.join(',') === '1,2,4,7,14');
P.mistakes = [
  { id: 'a', subj: 'math', q: { type: 'input', text: 'x', correct: '1' }, box: 1, due: todayStr() },
  { id: 'b', subj: 'math', q: { type: 'input', text: 'y', correct: '2' }, box: 2, due: addDaysStr(3) }
];
t('due: только сегодняшние', dueMistakes().length === 1 && dueMistakes()[0].id === 'a');
t('nextDueInDays = 0 при должке', nextDueInDays() === 0);

/* миграция старых сохранений */
localStorage.setItem('altgtu-trainer', JSON.stringify({ xp: 5, mistakes: [{ id: 'old', subj: 'rus', q: { type: 'input', text: 'z', correct: '3' } }] }));
const loaded = loadP();
t('миграция старых ошибок: box', loaded.mistakes[0].box === 1);
t('миграция старых ошибок: due', loaded.mistakes[0].due === todayStr());
t('daily-счётчики по умолчанию', loaded.daily.lessons === 0 && loaded.daily.blitz === 0);
t('freezes по умолчанию', loaded.freezes === 0);

/* продвижение по коробкам: имитируем верный ответ в режиме ошибок */
P = loaded;
P.mistakes = [{ id: 'm1', subj: 'math', q: { type: 'input', text: 'q1', correct: '7' }, box: 1, due: todayStr() }];
S = { mode: 'mistakes', subj: null, queue: [Object.assign({ _mid: 'm1', _subj: 'math' }, P.mistakes[0].q)], pos: 0, total: 1, origTotal: 1, firstTry: 0, answered: 0, earned: 0 };
submitAnswer(S.queue[0], '7');
t('верный ответ двигает коробку 1→2', P.mistakes[0].box === 2);
t('due переносится на +2 дня (интервал коробки 2)', P.mistakes[0].due === addDaysStr(2));

/* неверный ответ возвращает в коробку 1 */
P.mistakes[0].box = 4;
S = { mode: 'mistakes', subj: null, queue: [Object.assign({ _mid: 'm1', _subj: 'math' }, P.mistakes[0].q)], pos: 0, total: 1, origTotal: 1, firstTry: 0, answered: 0, earned: 0 };
submitAnswer(S.queue[0], '999');
t('неверный ответ сбрасывает в коробку 1', P.mistakes[0].box === 1);

/* выпуск из последней коробки */
P.stats.graduated = 0;
P.mistakes[0].box = 5;
S = { mode: 'mistakes', subj: null, queue: [Object.assign({ _mid: 'm1', _subj: 'math' }, P.mistakes[0].q)], pos: 0, total: 1, origTotal: 1, firstTry: 0, answered: 0, earned: 0 };
submitAnswer(S.queue[0], '7');
t('после 5-й коробки задание выучено', P.mistakes.length === 0 && P.stats.graduated === 1);

/* блиц: генераторы собираются, blitzAnswer работает */
t('allGenNames > 40', allGenNames().length > 40);
B = { score: 0, combo: 0, answered: 0, end: Date.now() + 60000, timerId: 0, locked: false, q: { type: 'input', correct: '5', text: '2+3' } };
blitzAnswer('5');
t('блиц: верный ответ увеличивает счёт', B.score === 1 && B.combo === 1);
B.locked = false; B.q = { type: 'input', correct: '5', text: '2+3' };
blitzAnswer(null);
t('блиц: пропуск сжигает серию', B.combo === 0 && B.score === 1);
B = null;

/* план: карточка строится */
P.mistakes = [{ id: 'p1', subj: 'rus', q: { type: 'input', text: 'w', correct: '1' }, box: 1, due: todayStr() }];
const html = planCard();
t('planCard содержит план', html.indexOf('План на сегодня') >= 0 && html.indexOf('Повторение (1)') >= 0);

/* заморозка стрика: пропуск одного дня */
P.streak = 6; P.freezes = 1; P.lastDay = daysAgoStr(2);
bumpStreak();
t('заморозка спасает стрик', P.streak === 7 && P.freezes === 0 && P.lastDay === todayStr());
P.streak = 6; P.freezes = 0; P.lastDay = daysAgoStr(2);
bumpStreak();
t('без заморозки стрик сбрасывается', P.streak === 1);
P.streak = 4; P.freezes = 0; P.lastDay = yesterdayStr();
bumpStreak();
t('стрик 5 даёт заморозку', P.streak === 5 && P.freezes === 1);

/* достижения вычислимы */
ACH.forEach(a => a.cond());
t('все достижения вычислимы (' + ACH.length + ')', true);

/* справочник */
t('глоссарий: 40+ терминов', Object.keys(GLOSS).length >= 40);
t('глоссарий: у всех есть определение и категория', Object.keys(GLOSS).every(k => GLOSS[k].t && GLOSS[k].d && ['rus','math','inf'].includes(GLOSS[k].cat)));
t('глоссарий: регулярки построены', Object.keys(GLOSS).every(k => GLOSS_RE[k] instanceof RegExp));
t('регулярка находит склонённую форму', GLOSS_RE['причастие'].test('полные причастия совершенного вида'));
t('регулярка находит термин из двух слов', GLOSS_RE['вводное слово'].test('здесь есть вводные слова и запятые'));
t('smartContinue определён', typeof smartContinue === 'function');
t('inputmode: целые числа', inputModeFor({ type: 'input', correct: '42' }).includes('numeric'));
t('inputmode: десятичные', inputModeFor({ type: 'input', correct: ['0,25', '0.25'] }).includes('decimal'));
t('inputmode: текст — без числовой клавиатуры', inputModeFor({ type: 'input', correct: 'ледовом' }) === '');

/* уровни сложности темы */
t('4 уровня, последний — вступительный', MAX_LEVEL === 4 && LEVEL_TIERS.length === 4 && LEVEL_TIERS[3].name === 'Вступительный');
P.levels = {}; P.doneStatic = {}; P.unitAcc = {};
const advIdx = MATH_COURSE.units.findIndex(u => u.id === 'advanced');
let tq = buildLessonQueue('math', advIdx);
t('уровень 1 «Разминка»: без сложных заданий', tq._tier.name === 'Разминка' && tq.every(q => !q.hard));
P.levels = { math: { advanced: 3 } };
tq = buildLessonQueue('math', advIdx);
t('уровень 4 «Вступительный»: 8 заданий', tq._tier.name === 'Вступительный' && tq.length === 8);
t('в уроке есть генераторные задания', buildLessonQueue('math', 0).some(q => !q._skey));
/* порог точности: уровень не даётся без него */
P.levels = { math: {} };
S = { mode: 'lesson', subj: 'math', unitIdx: 0, queue: [], pos: 0, total: 6, origTotal: 6, firstTry: 2, answered: 6, earned: 0 };
finishQuiz(); /* 33% < 50% */
t('33% точности — уровень не взят', unitLevel('math', 'percent') === 0);
S = { mode: 'lesson', subj: 'math', unitIdx: 0, queue: [], pos: 0, total: 6, origTotal: 6, firstTry: 4, answered: 6, earned: 0 };
finishQuiz(); /* 67% ≥ 50% */
t('67% точности — «Разминка» взята', unitLevel('math', 'percent') === 1);
t('палитра в настройках по умолчанию', defaultP().settings.palette === 'classic');
t('unitAcc в defaultP', typeof defaultP().unitAcc === 'object');

/* пометка сложных тем + разблокировка */
P.flagged = {}; P.unlocked = {};
t('flagged/unlocked в defaultP', typeof defaultP().flagged === 'object' && typeof defaultP().unlocked === 'object');
toggleFlag('math', 'trig');
t('toggleFlag ставит отметку', unitFlagged('math', 'trig') === true);
toggleFlag('math', 'trig');
t('toggleFlag снимает отметку', unitFlagged('math', 'trig') === false);
const trigIdx = MATH_COURSE.units.findIndex(u => u.id === 'trig');
P.levels = {};
t('тема закрыта без прогресса', unitUnlocked('math', trigIdx) === false);
P.unlocked['math:trig'] = true;
t('разблокировка открывает тему', unitUnlocked('math', trigIdx) === true);
P.flagged = { 'math:trig': true };
t('flaggedList возвращает отмеченные', flaggedList().some(x => x.subj === 'math' && x.id === 'trig'));
P.flagged = {}; P.unlocked = {};

/* что нового + фоны */
t('фон в настройках по умолчанию', defaultP().settings.bg === 'classic');
t('seenNews в defaultP', defaultP().seenNews === 0);
t('FEATURES заполнен', FEATURES.length >= 8 && FEATURES.every(f => f.ico && f.title && f.desc));
t('CHANGELOG заполнен', CHANGELOG.length >= 3 && CHANGELOG.every(c => c.d && c.items.length));
t('showWhatsNew определён', typeof showWhatsNew === 'function');

/* азбука Морзе */
t('карта: А=·−, С=···, О=−−−', MORSE_MAP['а'] === '·−' && MORSE_MAP['с'] === '···' && MORSE_MAP['о'] === '−−−');
t('morseEncode слова', morseEncode('дом') === '−·· −−− −−');
t('morse-ввод: точки/дефисы', isCorrect({ type: 'input', morse: true, correct: '·−' }, '.-'));
t('morse-ввод: пробелы не важны', isCorrect({ type: 'input', morse: true, correct: '−·· −−− −−' }, '-.. --- --'));
t('morse-ввод: неверный код отвергается', !isCorrect({ type: 'input', morse: true, correct: '·−' }, '-.'));
t('morse-ввод: мусор не проходит', !isCorrect({ type: 'input', morse: true, correct: '·−' }, 'абв'));
P.settings.showMorse = true; syncExperimental();
t('тумблер включает курс', COURSES.morse === MORSE_COURSE);
t('курс: 6 тем, пул и генераторы у всех', MORSE_COURSE.units.length === 6 && MORSE_COURSE.units.every(u => u.pool.length >= 3 && u.gens.length >= 2 && u.gens.every(g => GENS[g])));
let mErr = 0;
Object.keys(MORSE_GENS).forEach(g => { for (let i = 0; i < 150; i++) { const q = MORSE_GENS[g](); if (!q.text || q.correct === undefined || (q.type === 'mc' && (q.correct < 0 || q.correct >= q.options.length))) mErr++; } });
t('морзе-генераторы: 150 прогонов чисты', mErr === 0);
let encOk = true;
for (let i = 0; i < 100; i++) { const q = MORSE_GENS['genM_m2_enc'](); if (!isCorrect(q, q.correct)) encOk = false; }
t('enc-генератор согласован с проверкой', encOk);
let wOk = true;
[].concat(MRS_W2, MRS_W3, MRS_W4).forEach(w => { if ([...w].some(c => !MORSE_MAP[c])) wOk = false; });
t('все слова кодируются без пропусков', wOk);
P.settings.showMorse = false; syncExperimental();
t('тумблер выключает курс', COURSES.morse === undefined);

const __total = __errors + (typeof __dataErrors !== 'undefined' ? __dataErrors : 0);
console.log(__total ? 'ОШИБОК: ' + __total : 'ВСЕ ТЕСТЫ ПРОШЛИ ✓');
process.exit(__total ? 1 : 0);
