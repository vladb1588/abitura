/* ===== Проверка данных курсов (исполняется внутри eval из tests/engine.js) ===== */
var __dataErrors = 0;
function derr(msg) { __dataErrors++; console.log('DATA ERROR: ' + msg); }

function checkQ(q, where) {
  if (!q.text) derr(where + ': нет text');
  if (q.type === 'mc') {
    if (!Array.isArray(q.options) || q.options.length < 2) derr(where + ': mc без options');
    else if (typeof q.correct !== 'number' || q.correct < 0 || q.correct >= q.options.length) derr(where + ': mc correct вне диапазона: ' + q.correct);
  } else if (q.type === 'input') {
    const c = [].concat(q.correct);
    if (!c.length || c.some(x => x === undefined || x === null || String(x) === '')) derr(where + ': пустой correct');
  } else if (q.type === 'multi') {
    if (!Array.isArray(q.options) || !Array.isArray(q.correct)) derr(where + ': multi без options/correct');
    else if (!q.correct.length || q.correct.some(i => typeof i !== 'number' || i < 0 || i >= q.options.length)) derr(where + ': multi correct вне диапазона');
  } else if (q.type === 'match') {
    if (!Array.isArray(q.pairs) || q.pairs.length < 2) derr(where + ': match без pairs');
    else {
      const rights = q.pairs.map(p => p[1]);
      if (new Set(rights).size !== rights.length) derr(where + ': match с повторяющимися правыми частями: ' + rights.join(','));
      if (q.pairs.some(p => !Array.isArray(p) || p.length !== 2 || !p[0] || !p[1])) derr(where + ': match с неполными парами');
    }
  } else derr(where + ': неизвестный type ' + q.type);
}

/* структура всех курсов, включая экспериментальные */
const ALL_COURSES = [MATH_COURSE, INF_COURSE, RUS_COURSE, MORSE_COURSE];
ALL_COURSES.forEach(c => {
  c.units.forEach(u => {
    u.pool.forEach((q, i) => checkQ(q, c.id + '/' + u.id + '/pool#' + i));
    (u.gens || []).forEach(g => { if (!GENS[g]) derr(c.id + '/' + u.id + ': генератор ' + g + ' не найден'); });
    if (!u.theory || !u.theory.length) derr(c.id + '/' + u.id + ': нет теории');
  });
  c.exam.forEach((q, i) => checkQ(q, c.id + '/exam#' + i));
});

/* каждый генератор — 300 прогонов */
Object.keys(GENS).forEach(g => {
  for (let i = 0; i < 300; i++) {
    try { checkQ(GENS[g](), 'gen ' + g); }
    catch (e) { derr('gen ' + g + ' бросил исключение: ' + e.message); break; }
  }
});

/* выборочная сверка вычислимых генераторов */
for (let i = 0; i < 200; i++) {
  let q = MATH_GENS.genTrigId();
  const n = parseInt(q.text.match(/: (\d+) sin/)[1]);
  if (String(n) !== q.correct) derr('genTrigId несоответствие');
  q = MATH_GENS.genThirdAngle();
  const m = q.text.match(/равны (\d+)° и (\d+)°/);
  if (String(180 - m[1] - m[2]) !== q.correct) derr('genThirdAngle несоответствие');
  q = INF_GENS.genDec2Bin();
  const d = parseInt(q.text.match(/число (\d+)/)[1]);
  if (d.toString(2) !== q.correct) derr('genDec2Bin несоответствие');
  q = RUS_GENS.genStress();
  if (new Set(q.options).size !== 4) derr('genStress: повторяющиеся варианты');
  q = RUS_GENS.genWordForm();
  if (new Set(q.options).size !== 4) derr('genWordForm: повторяющиеся варианты');
}

console.log(__dataErrors ? 'ДАННЫЕ: ОШИБОК ' + __dataErrors : 'ДАННЫЕ ЧИСТЫ ✓');
