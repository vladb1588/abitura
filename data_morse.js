/* ===== Экспериментальный курс «Азбука Морзе» =====
   Включается в Настройках → Экспериментальное. Учит принимать (код → буква)
   и передавать (буква → код). Ввод: точка «.», тире «-» (можно «·» и «−»),
   пробелы между буквами не обязательны. */

const MORSE_MAP = {
  'а': '·−', 'б': '−···', 'в': '·−−', 'г': '−−·', 'д': '−··', 'е': '·', 'ж': '···−', 'з': '−−··',
  'и': '··', 'й': '·−−−', 'к': '−·−', 'л': '·−··', 'м': '−−', 'н': '−·', 'о': '−−−', 'п': '·−−·',
  'р': '·−·', 'с': '···', 'т': '−', 'у': '··−', 'ф': '··−·', 'х': '····', 'ц': '−·−·', 'ч': '−−−·',
  'ш': '−−−−', 'щ': '−−·−', 'ы': '−·−−', 'ь': '−··−', 'э': '··−··', 'ю': '··−−', 'я': '·−·−',
  '1': '·−−−−', '2': '··−−−', '3': '···−−', '4': '····−', '5': '·····',
  '6': '−····', '7': '−−···', '8': '−−−··', '9': '−−−−·', '0': '−−−−−'
};

/* напевы — классический способ запоминания ритма (вариантов много, это распространённые) */
const MORSE_CHANT = {
  'а': 'ай-даа', 'б': 'баа-ки-те-кут', 'в': 'ви-даа-лаа', 'г': 'гаа-раа-жи', 'д': 'доо-ми-ки',
  'е': 'есть', 'ж': 'же-ле-зис-тоо', 'з': 'заа-каа-ти-ки', 'и': 'и-ди', 'й': 'йош-каа-роо-лаа',
  'к': 'каак-де-лаа', 'л': 'лу-наа-ти-ки', 'м': 'маа-маа', 'н': 'ноо-мер', 'о': 'оо-коо-лоо',
  'п': 'пи-лаа-поо-ёт', 'р': 'ре-шаа-ет', 'с': 'си-ни-е', 'т': 'таам', 'у': 'у-нес-лоо',
  'ф': 'фи-ли-моон-чик', 'х': 'хи-ми-чи-те', 'ц': 'цаа-пли-цаа-пли', 'ч': 'чаа-шаа-тоо-нет',
  'ш': 'шаа-роо-ваа-рыы', 'щ': 'щаа-вам-не-шаа', 'ы': 'ыы-не-наа-доо', 'ь': 'тоо-мяг-кий-знаак',
  'э': 'э-ле-роо-ни-ки', 'ю': 'ю-ли-аа-наа', 'я': 'я-маал-я-маал'
};

function morseEncode(word) {
  return String(word).toLowerCase().split('').map(c => MORSE_MAP[c] || '').filter(Boolean).join(' ');
}

/* озвучка кода: точка 1 ед., тире 3 ед., пауза между буквами (пробел) */
let MORSE_AC = null;
function playMorse(code) {
  try {
    if (!MORSE_AC) MORSE_AC = new (window.AudioContext || window.webkitAudioContext)();
    if (MORSE_AC.state === 'suspended') MORSE_AC.resume();
    const dot = 0.09, freq = 700;
    let t = MORSE_AC.currentTime + 0.06;
    for (const ch of String(code)) {
      let d = 0;
      if (ch === '·' || ch === '.') d = dot;
      else if (ch === '−' || ch === '-') d = dot * 3;
      else { t += dot * 2; continue; } /* пробел между буквами */
      const o = MORSE_AC.createOscillator(), g = MORSE_AC.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.012);
      g.gain.setValueAtTime(0.3, t + Math.max(d - 0.015, 0.02));
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(MORSE_AC.destination);
      o.start(t); o.stop(t + d + 0.03);
      t += d + dot;
    }
  } catch (e) { /* звук не критичен */ }
}

function morsePlayBtn(code) {
  return `<button class="minibtn mplay" type="button" onclick="playMorse('${code}')">${ic('volume')}</button>`;
}
function morseTable(chars) {
  return `<table class="morse-tbl">${chars.map(c => `
    <tr><th>${c.toUpperCase()}</th><td class="mcode">${MORSE_MAP[c]}</td><td class="mn">${MORSE_CHANT[c] || ''}</td><td>${morsePlayBtn(MORSE_MAP[c])}</td></tr>`).join('')}</table>`;
}

/* группы букв по темам (от простых ритмов к сложным) */
const MRS_U1 = ['е', 'и', 'с', 'х', 'т', 'м', 'о', 'ш'];
const MRS_U2 = ['а', 'у', 'в', 'ж', 'н', 'д', 'б'];
const MRS_U3 = ['г', 'з', 'к', 'л', 'п', 'р', 'ф'];
const MRS_U4 = ['й', 'ц', 'ч', 'щ', 'ы', 'ь', 'э', 'ю', 'я'];
const MRS_DIG = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

/* слова только из уже изученных букв */
const MRS_W2 = ['дом', 'сон', 'нос', 'шум', 'сад', 'вода', 'сова', 'мост', 'жест', 'небо', 'туман', 'ужин', 'душ', 'мода', 'обед'];
const MRS_W3 = ['парк', 'полка', 'глаз', 'шкаф', 'карта', 'лампа', 'глобус', 'кран', 'флаг', 'заказ', 'палка', 'узор', 'гроза', 'школа', 'запад'];
const MRS_W4 = ['чай', 'щука', 'юла', 'яхта', 'цирк', 'этаж', 'мышь', 'ключ', 'язык', 'ночь', 'число', 'сила', 'якорь', 'пейзаж', 'цель'];

const MORSE_GENS = {};
(function makeMorseGens() {
  const units = [
    { id: 'm1', letters: MRS_U1, words: null },
    { id: 'm2', letters: MRS_U2, words: MRS_W2 },
    { id: 'm3', letters: MRS_U3, words: MRS_W3 },
    { id: 'm4', letters: MRS_U4, words: MRS_W4 },
    { id: 'm5', letters: MRS_DIG, words: null },
    { id: 'm6', letters: null, words: MRS_W3.concat(MRS_W4) }
  ];
  units.forEach(u => {
    if (u.letters) {
      /* передача: буква → код */
      MORSE_GENS['genM_' + u.id + '_enc'] = () => {
        const ch = pick(u.letters);
        const chant = MORSE_CHANT[ch] ? ` Напев: «${MORSE_CHANT[ch]}».` : '';
        return {
          text: `Запишите кодом Морзе: <b class="mbig">${ch.toUpperCase()}</b><br><span class="sub">точка — «.», тире — «-»</span>`,
          type: 'input', morse: true, correct: MORSE_MAP[ch],
          expl: `${ch.toUpperCase()} = <span class="mcode">${MORSE_MAP[ch]}</span>.${chant}`
        };
      };
      /* приём: код → буква (со звуком) */
      MORSE_GENS['genM_' + u.id + '_dec'] = () => {
        const ch = pick(u.letters);
        const wrong = shuffle(u.letters.filter(c => c !== ch)).slice(0, 3);
        const pos = rnd(0, 3);
        const options = wrong.map(c => c.toUpperCase());
        options.splice(pos, 0, ch.toUpperCase());
        return {
          text: `Что закодировано? <span class="mcode mbig">${MORSE_MAP[ch]}</span> ${morsePlayBtn(MORSE_MAP[ch])}`,
          type: 'mc', options, correct: pos,
          expl: `<span class="mcode">${MORSE_MAP[ch]}</span> — это <b>${ch.toUpperCase()}</b>${MORSE_CHANT[ch] ? ` (напев: «${MORSE_CHANT[ch]}»)` : ''}.`
        };
      };
    }
    if (u.words) {
      /* передача слова */
      MORSE_GENS['genM_' + u.id + '_wenc'] = () => {
        const w = pick(u.words);
        return {
          text: `Передайте слово «<b>${w}</b>» кодом Морзе.<br><span class="sub">буквы разделяйте пробелом</span>`,
          type: 'input', morse: true, correct: morseEncode(w),
          expl: `${w} → <span class="mcode">${morseEncode(w)}</span>`
        };
      };
      /* приём слова */
      MORSE_GENS['genM_' + u.id + '_wdec'] = () => {
        const w = pick(u.words);
        return {
          text: `Примите слово: <span class="mcode">${morseEncode(w)}</span> ${morsePlayBtn(morseEncode(w))}`,
          type: 'input', correct: w,
          expl: `<span class="mcode">${morseEncode(w)}</span> → <b>${w}</b>`
        };
      };
    }
  });
  /* числа */
  MORSE_GENS['genM_num_enc'] = () => {
    const n = rnd(10, 99);
    return {
      text: `Передайте число <b class="mbig">${n}</b> кодом Морзе.<br><span class="sub">цифры разделяйте пробелом</span>`,
      type: 'input', morse: true, correct: morseEncode(String(n)),
      expl: `${n} → <span class="mcode">${morseEncode(String(n))}</span>`
    };
  };
  MORSE_GENS['genM_num_dec'] = () => {
    const n = rnd(10, 99);
    return {
      text: `Примите число: <span class="mcode">${morseEncode(String(n))}</span> ${morsePlayBtn(morseEncode(String(n)))}`,
      type: 'input', correct: String(n),
      expl: `Это число <b>${n}</b>.`
    };
  };
})();

const MORSE_COURSE = {
  id: 'morse',
  title: 'Азбука Морзе',
  icon: '·−',
  examTime: 0,
  passMark: 0,
  exam: [],
  units: [
    {
      id: 'm1', title: 'Точка и тире', icon: '·',
      theory: [
        { title: 'Как устроена азбука', html: `
          <p>Каждый знак — последовательность <b>точек</b> (короткий сигнал) и <b>тире</b> (длинный). Правила ритма:</p>
          <ul>
            <li>тире = <b>3 точки</b> по длительности;</li>
            <li>пауза между точками/тире внутри буквы = 1 точка;</li>
            <li>пауза между буквами = 3 точки, между словами = 7.</li>
          </ul>
          <p>Учить лучше <b>ритмом, а не подсчётом</b>: жми кнопки ${ic('volume')} в таблицах и запоминай звучание. Помогают <b>напевы</b>: слоги с «аа» — тире, короткие — точки.</p>
          <div class="ex">«маа-маа» = − − (буква М), «си-ни-е» = ··· (буква С).</div>` },
        { title: 'Первые 8 букв: только точки и только тире', html: `
          <p>Е И С Х — только точки (1–4). Т М О Ш — только тире (1–4). Полярные ритмы — их путают реже всего:</p>
          ${morseTable(MRS_U1)}` }
      ],
      pool: [
        { text: 'Какая буква — самая короткая в азбуке Морзе (одна точка)?', type: 'mc',
          options: ['Е', 'И', 'Т', 'О'], correct: 0,
          expl: 'Е = · (одна точка). И = ··, Т = −, О = −−−. Самым частым буквам достались самые короткие коды.' },
        { text: 'Запишите кодом Морзе букву <b class="mbig">Ш</b>.<br><span class="sub">точка — «.», тире — «-»</span>', type: 'input', morse: true, correct: '−−−−',
          expl: 'Ш = <span class="mcode">−−−−</span> (напев: «шаа-роо-ваа-рыы»).' },
        { text: 'Что закодировано? <span class="mcode mbig">···</span>', type: 'mc',
          options: ['С', 'Х', 'И', 'Т'], correct: 0,
          expl: '··· — это С («си-ни-е»). Х = ····, И = ··, Т = −.' }
      ],
      gens: ['genM_m1_enc', 'genM_m1_dec']
    },
    {
      id: 'm2', title: 'Частые буквы', icon: '·−',
      theory: [
        { title: 'А У В Ж и Н Д Б', html: `
          <p>Первая группа начинается с точек и заканчивается тире, вторая — наоборот. Слушай ритм:</p>
          ${morseTable(MRS_U2)}
          <p>Уже можно передавать целые слова: «дом» = <span class="mcode">−·· −−− −−</span>.</p>` }
      ],
      pool: [
        { text: 'Запишите кодом Морзе букву <b class="mbig">А</b>.<br><span class="sub">точка — «.», тире — «-»</span>', type: 'input', morse: true, correct: '·−',
          expl: 'А = <span class="mcode">·−</span> (напев: «ай-даа»).' },
        { text: 'Что закодировано? <span class="mcode mbig">−··</span>', type: 'mc',
          options: ['Д', 'Б', 'Н', 'В'], correct: 0,
          expl: '−·· — это Д («доо-ми-ки»). Б = −···, Н = −·, В = ·−−.' },
        { text: 'Примите слово: <span class="mcode">−·· −−− −−</span>', type: 'input', correct: 'дом',
          expl: '−·· = Д, −−− = О, −− = М → «дом».' }
      ],
      gens: ['genM_m2_enc', 'genM_m2_dec', 'genM_m2_wenc', 'genM_m2_wdec']
    },
    {
      id: 'm3', title: 'Буквы Г–Ф', icon: '−·',
      theory: [
        { title: 'Г З К Л П Р Ф', html: `
          <p>Смешанные ритмы. К и Р — «зеркальные» (−·− и ·−·), не перепутай:</p>
          ${morseTable(MRS_U3)}` }
      ],
      pool: [
        { text: 'Запишите кодом Морзе букву <b class="mbig">К</b>.<br><span class="sub">точка — «.», тире — «-»</span>', type: 'input', morse: true, correct: '−·−',
          expl: 'К = <span class="mcode">−·−</span> (напев: «каак-де-лаа»).' },
        { text: 'Что закодировано? <span class="mcode mbig">·−−·</span>', type: 'mc',
          options: ['П', 'Р', 'Л', 'Ф'], correct: 0,
          expl: '·−−· — это П («пи-лаа-поо-ёт»). Р = ·−·, Л = ·−··, Ф = ··−·.' },
        { text: 'Примите слово: <span class="mcode">·−−· ·− ·−· −·−</span>', type: 'input', correct: 'парк',
          expl: 'П-А-Р-К → «парк».' }
      ],
      gens: ['genM_m3_enc', 'genM_m3_dec', 'genM_m3_wenc', 'genM_m3_wdec']
    },
    {
      id: 'm4', title: 'Редкие буквы', icon: '−·−−',
      theory: [
        { title: 'Й Ц Ч Щ Ы Ь Э Ю Я', html: `
          <p>Последняя группа — и весь алфавит твой. Ъ встречается редко: обычно его передают как Ь или пропускают, Ё = Е.</p>
          ${morseTable(MRS_U4)}` }
      ],
      pool: [
        { text: 'Что закодировано? <span class="mcode mbig">−·−−</span>', type: 'mc',
          options: ['Ы', 'Й', 'Ь', 'Я'], correct: 0,
          expl: '−·−− — это Ы («ыы-не-наа-доо»). Й = ·−−−, Ь = −··−, Я = ·−·−.' },
        { text: 'Запишите кодом Морзе букву <b class="mbig">Я</b>.<br><span class="sub">точка — «.», тире — «-»</span>', type: 'input', morse: true, correct: '·−·−',
          expl: 'Я = <span class="mcode">·−·−</span> (напев: «я-маал-я-маал»).' },
        { text: 'Примите слово: <span class="mcode">−−−· ·− ·−−−</span>', type: 'input', correct: 'чай',
          expl: 'Ч-А-Й → «чай».' }
      ],
      gens: ['genM_m4_enc', 'genM_m4_dec', 'genM_m4_wenc', 'genM_m4_wdec']
    },
    {
      id: 'm5', title: 'Цифры', icon: '···−−',
      theory: [
        { title: 'Система цифр', html: `
          <p>Цифры — всегда 5 знаков, и в них есть логика:</p>
          <ul>
            <li>1–5: сначала точки (сколько цифра), потом тире до пяти знаков;</li>
            <li>6–9 и 0: сначала тире, потом точки.</li>
          </ul>
          ${morseTable(MRS_DIG)}` }
      ],
      pool: [
        { text: 'Запишите кодом Морзе цифру <b class="mbig">5</b>.', type: 'input', morse: true, correct: '·····',
          expl: '5 = <span class="mcode">·····</span> — пять точек.' },
        { text: 'Что закодировано? <span class="mcode mbig">−−−−−</span>', type: 'mc',
          options: ['0', '9', '1', '8'], correct: 0,
          expl: '−−−−− — это 0 (пять тире).' },
        { text: 'Примите число: <span class="mcode">·−−−− −−−−−</span>', type: 'input', correct: '10',
          expl: '·−−−− = 1, −−−−− = 0 → 10.' }
      ],
      gens: ['genM_m5_enc', 'genM_m5_dec', 'genM_num_enc', 'genM_num_dec']
    },
    {
      id: 'm6', title: 'Слова и сигналы', icon: '···−−−···',
      theory: [
        { title: 'Передача текста', html: `
          <p>Буквы внутри слова разделяй паузой в 3 точки (на письме — пробел), слова — паузой в 7 точек (на письме — « / »).</p>
          <p>Служебные знаки:</p>
          <ul>
            <li><b>вопросительный знак</b> ··−−·· ${morsePlayBtn('··−−··')}</li>
            <li><b>точка</b>: ······ (отечественная практика) или ·−·−·− (международная);</li>
            <li><b>SOS</b> ···−−−··· ${morsePlayBtn('···−−−···')} — передаётся слитно, без пауз между буквами.</li>
          </ul>
          <div class="ex">SOS выбрали не как аббревиатуру, а за ритм: три точки, три тире, три точки — ни с чем не спутаешь.</div>` }
      ],
      pool: [
        { text: 'Передайте сигнал <b class="mbig">SOS</b> кодом Морзе.', type: 'input', morse: true, correct: '···−−−···',
          expl: 'SOS = <span class="mcode">···−−−···</span> — слитно: три точки, три тире, три точки.' },
        { text: 'Что означает код <span class="mcode mbig">··−−··</span>?', type: 'mc',
          options: ['Вопросительный знак', 'Точка', 'Запятая', 'Конец связи'], correct: 0,
          expl: '··−−·· — вопросительный знак.' },
        { text: 'Примите слово: <span class="mcode">−− −−− ·−· −−·· ·</span>', type: 'input', correct: 'морзе',
          expl: 'М-О-Р-З-Е → «морзе». Сэмюэл Морзе — изобретатель кода.' }
      ],
      gens: ['genM_m6_wenc', 'genM_m6_wdec', 'genM_num_dec']
    }
  ]
};
