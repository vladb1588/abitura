/* ===== Тесты движка и данных: node tests/engine.js =====
   Загружает всё приложение в Node со стаб-DOM и гоняет:
   1) проверку структуры данных всех курсов (пулы, экзамены, генераторы ×300);
   2) юнит-кейсы движка из tests/engine-cases.js.
   Важно: const/let не покидают eval, поэтому кейсы исполняются тем же eval. */

/* --- стаб-DOM: универсальный прокси --- */
function uni() {
  const f = function () { return uni(); };
  return new Proxy(f, {
    get(t, k) {
      if (k === Symbol.toPrimitive) return () => '';
      if (k === Symbol.iterator) return function* () {};
      if (k === 'length') return 0;
      if (k === 'dataset') return {};
      if (k === 'style') return {};
      if (k === 'classList') return { add() {}, remove() {}, toggle() {}, contains() { return false; } };
      return uni();
    },
    set() { return true; },
    apply() { return uni(); }
  });
}
global.window = { matchMedia: () => ({ matches: false, addEventListener() {} }), AudioContext: undefined };
global.document = {
  getElementById: () => uni(),
  addEventListener() {},
  documentElement: { dataset: {} },
  createElement: () => uni(),
  querySelectorAll: () => []
};
global.localStorage = { _s: {}, getItem(k) { return this._s[k] || null; }, setItem(k, v) { this._s[k] = v; }, removeItem(k) { delete this._s[k]; } };
global.confirm = () => true;
global.innerWidth = 800; global.innerHeight = 600;
global.performance = { now: () => 0 };
global.requestAnimationFrame = () => {};
global.setInterval = () => 0; global.clearInterval = () => {};

const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..') + path.sep;

/* порядок как в index.html */
const FILES = [
  'data_math.js', 'data_inf.js', 'data_rus.js', 'glossary.js',
  'icons.js', 'data_morse.js', 'core.js', 'screens.js', 'exam.js', 'stats.js'
];
const src = FILES.map(f => fs.readFileSync(dir + f, 'utf8')).join('\n') +
  '\n' + fs.readFileSync(path.join(__dirname, 'data-cases.js'), 'utf8') +
  '\n' + fs.readFileSync(path.join(__dirname, 'engine-cases.js'), 'utf8');
eval(src);
