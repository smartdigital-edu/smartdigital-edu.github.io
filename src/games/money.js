/**
 * Malaysian money for the shop games: denominations, spoken amounts (EN/BM),
 * simplified "play money" drawings (inline SVG – deliberately NOT replicas of
 * real banknotes or coins: no portraits, marked "WANG MAINAN"), and the
 * question generators used by the Money module.
 *
 * All values are in sen (RM1 = 100) so arithmetic stays exact.
 */
import { sample, shuffle } from '../core/scoring.js';

/** Colours follow the real series so children learn to recognise them. */
export const DENOMS = [
  { sen: 10, kind: 'coin', metal: 'silver' },
  { sen: 20, kind: 'coin', metal: 'gold' },
  { sen: 50, kind: 'coin', metal: 'gold' },
  { sen: 100, kind: 'note', color: '#3f6fd8', light: '#c9d8ff' },   // RM1 blue
  { sen: 500, kind: 'note', color: '#2e9a4b', light: '#c8efcf' },   // RM5 green
  { sen: 1000, kind: 'note', color: '#d23c3c', light: '#ffd0cc' },  // RM10 red
  { sen: 2000, kind: 'note', color: '#e07b1a', light: '#ffdcb5' },  // RM20 orange
  { sen: 5000, kind: 'note', color: '#1f8f8a', light: '#bdebe8' },  // RM50 teal
  { sen: 10000, kind: 'note', color: '#7b4bc4', light: '#e2d2fb' }, // RM100 purple
];
export const denom = (sen) => DENOMS.find((d) => d.sen === sen);

/* ---------------- words ---------------- */
const EN_ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const MS_ONES = ['kosong', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'lapan', 'sembilan'];

export function numberWord(n, lang) {
  if (lang === 'ms') {
    if (n < 10) return MS_ONES[n];
    if (n === 10) return 'sepuluh';
    if (n === 11) return 'sebelas';
    if (n < 20) return `${MS_ONES[n - 10]} belas`;
    if (n === 100) return 'seratus';
    const t = Math.floor(n / 10); const o = n % 10;
    return `${MS_ONES[t]} puluh${o ? ` ${MS_ONES[o]}` : ''}`;
  }
  if (n < 20) return EN_ONES[n];
  if (n === 100) return 'one hundred';
  const t = Math.floor(n / 10); const o = n % 10;
  return `${EN_TENS[t]}${o ? `-${EN_ONES[o]}` : ''}`;
}

/** Short written amount: "RM5", "20 sen", "RM1.50". */
export function formatAmount(sen) {
  if (sen < 100) return `${sen} sen`;
  return sen % 100 ? `RM${(sen / 100).toFixed(2)}` : `RM${sen / 100}`;
}

/** Spoken amount: "five ringgit" / "lima ringgit", "twenty sen", "one ringgit fifty sen". */
export function amountWords(sen, lang) {
  const rm = Math.floor(sen / 100); const s = sen % 100;
  const parts = [];
  if (rm) parts.push(`${numberWord(rm, lang)} ringgit`);
  if (s) parts.push(`${numberWord(s, lang)} sen`);
  return parts.join(' ') || `${numberWord(0, lang)} sen`;
}

/* ---------------- drawings ---------------- */
let uid = 0;
/** Inline SVG string of a play-money note or coin. */
export function moneySVG(sen) {
  const d = denom(sen);
  if (!d) throw new Error(`Unknown denomination ${sen}`);
  uid += 1;
  const id = `m${uid}`;
  if (d.kind === 'coin') {
    const [c1, c2, ink] = d.metal === 'gold' ? ['#f7d774', '#c99a2e', '#7a5a12'] : ['#eef1f4', '#a9b1bb', '#4a525c'];
    return `<svg viewBox="0 0 100 100" class="money-svg coin" aria-hidden="true">
<defs><radialGradient id="${id}" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient></defs>
<circle cx="50" cy="50" r="47" fill="url(#${id})" stroke="${c2}" stroke-width="3"/>
<circle cx="50" cy="50" r="39" fill="none" stroke="${ink}" stroke-opacity=".35" stroke-width="2" stroke-dasharray="3 3"/>
<g fill="${ink}" fill-opacity=".25">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="50" cy="31" rx="6" ry="10" transform="rotate(${a} 50 50)"/>`).join('')}</g>
<text x="50" y="57" text-anchor="middle" font-size="30" font-weight="800" fill="${ink}" font-family="system-ui,sans-serif">${sen}</text>
<text x="50" y="75" text-anchor="middle" font-size="11" font-weight="700" fill="${ink}" font-family="system-ui,sans-serif">SEN</text>
</svg>`;
  }
  const v = sen / 100;
  return `<svg viewBox="0 0 200 100" class="money-svg note" aria-hidden="true">
<defs><linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="${d.light}"/><stop offset=".55" stop-color="${d.color}" stop-opacity=".55"/><stop offset="1" stop-color="${d.color}"/></linearGradient></defs>
<rect x="2" y="2" width="196" height="96" rx="8" fill="url(#${id})" stroke="${d.color}" stroke-width="3"/>
<rect x="10" y="10" width="180" height="80" rx="5" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2"/>
<g transform="translate(58 52)">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-13" rx="8" ry="13" fill="#e2463f" fill-opacity=".85" transform="rotate(${a})"/>`).join('')}<circle r="5" fill="#ffd166"/></g>
<text x="150" y="66" text-anchor="middle" font-size="44" font-weight="800" fill="#fff" stroke="${d.color}" stroke-width="2" paint-order="stroke" font-family="system-ui,sans-serif">${v}</text>
<text x="18" y="26" font-size="12" font-weight="800" fill="${d.color}" font-family="system-ui,sans-serif">RM${v}</text>
<text x="150" y="86" text-anchor="middle" font-size="10" font-weight="700" fill="#fff" font-family="system-ui,sans-serif">RINGGIT</text>
<text x="18" y="88" font-size="7" font-weight="700" fill="${d.color}" fill-opacity=".8" font-family="system-ui,sans-serif">WANG MAINAN</text>
</svg>`;
}

/* ---------------- question generators ---------------- */
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const say = (en, ms) => ({ en, ms });

/** Denominations by age: little ones start with RM1/RM5/RM10 and gold/silver coins. */
export function denomsFor(age = 4) {
  const base = [10, 20, 50, 100, 500, 1000];
  return age >= 5 ? [...base, 2000, 5000, 10000] : base;
}

/** "Which one is twenty sen?" – pick the right money out of 3. */
export function knowQuestions({ n = 10, age = 4 } = {}) {
  const pool = denomsFor(age);
  return shuffle(Array.from({ length: n }, (_, i) => {
    const answer = pool[i % pool.length];
    const options = shuffle([answer, ...sample(pool.filter((s) => s !== answer), 2)]);
    return {
      type: 'pick',
      say: say(`Which one is ${amountWords(answer, 'en')}?`, `Mana satu ${amountWords(answer, 'ms')}?`),
      hint: say('Tap the correct money', 'Tekan duit yang betul'),
      options: options.map((s) => ({ money: [s] })),
      answer: options.indexOf(answer),
    };
  }));
}

/** "Which is more money?" – two pieces, tap the bigger value. */
export function moreQuestions({ n = 10, age = 4 } = {}) {
  const pool = denomsFor(age);
  return Array.from({ length: n }, () => {
    const [a, b] = sample(pool, 2);
    const options = [a, b];
    return {
      type: 'pick',
      say: say('Which one is more money?', 'Mana satu lebih banyak?'),
      hint: say('Tap the one worth more', 'Tekan yang nilainya lebih banyak'),
      options: options.map((s) => ({ money: [s] })),
      answer: options.indexOf(Math.max(a, b)),
      explain: say(`${amountWords(Math.max(a, b), 'en')} is more than ${amountWords(Math.min(a, b), 'en')}`,
        `${amountWords(Math.max(a, b), 'ms')} lebih banyak daripada ${amountWords(Math.min(a, b), 'ms')}`),
    };
  });
}

/** Break an amount (ringgit) into notes, e.g. 7 -> [500, 100, 100]. */
export function notesFor(rm, allowed = [1000, 500, 100]) {
  const out = [];
  let left = rm * 100;
  for (const d of allowed) while (left >= d) { out.push(d); left -= d; }
  return out;
}

/** "How much money is this?" – a pile of notes, choose the total. */
export function countQuestions({ n = 10, age = 4 } = {}) {
  const max = age >= 5 ? 20 : 10;
  return Array.from({ length: n }, () => {
    const total = rint(2, max);
    // Mostly RM1 notes for small totals so they can be counted one by one.
    const money = shuffle(total <= 5 ? Array(total).fill(100) : notesFor(total, total > 10 ? [1000, 500, 100] : [500, 100]));
    const wrong = sample([total - 2, total - 1, total + 1, total + 2, total + 5].filter((x) => x > 0 && x !== total && x <= max + 5), 2);
    const options = shuffle([total, ...wrong]);
    return {
      type: 'pick',
      show: money,
      say: say('How much money is this altogether?', 'Berapakah jumlah duit ini?'),
      hint: say('Count the money, then tap the total', 'Kira duit, kemudian tekan jumlahnya'),
      options: options.map((rm) => ({ text: `RM${rm}`, sen: rm * 100 })),
      answer: options.indexOf(total),
    };
  });
}

export const SHOP_ITEMS = [
  { emoji: '🍎', en: 'apple', ms: 'epal' }, { emoji: '🍌', en: 'banana', ms: 'pisang' },
  { emoji: '🍞', en: 'bread', ms: 'roti' }, { emoji: '🥛', en: 'milk', ms: 'susu' },
  { emoji: '🧃', en: 'juice', ms: 'jus' }, { emoji: '🍦', en: 'ice cream', ms: 'aiskrim' },
  { emoji: '🥚', en: 'eggs', ms: 'telur' }, { emoji: '🍪', en: 'cookies', ms: 'biskut' },
  { emoji: '🧁', en: 'cupcake', ms: 'kek cawan' }, { emoji: '🍉', en: 'watermelon', ms: 'tembikai' },
];

/** "The apple costs three ringgit. Pay the shopkeeper!" – tap money onto the counter. */
export function payQuestions({ n = 8, age = 4 } = {}) {
  const max = age >= 5 ? 15 : 8;
  return sample(SHOP_ITEMS, Math.min(n, SHOP_ITEMS.length)).map((item) => {
    const price = rint(1, max);
    return {
      type: 'pay',
      item,
      price: price * 100,
      wallet: age >= 5 ? [100, 100, 100, 100, 100, 500, 500, 1000] : [100, 100, 100, 100, 100, 500, 500],
      say: say(`The ${item.en} costs ${amountWords(price * 100, 'en')}. Pay the shopkeeper!`,
        `${item.ms[0].toUpperCase()}${item.ms.slice(1)} berharga ${amountWords(price * 100, 'ms')}. Bayar kepada penjual!`),
      hint: say('Tap money to put it on the counter, then Pay', 'Tekan duit untuk letak di kaunter, kemudian Bayar'),
    };
  });
}

/** Can `amount` be paid exactly from `wallet` (multiset of sen)? */
export function canPay(amount, wallet) {
  const reachable = new Set([0]);
  for (const c of wallet) for (const r of [...reachable]) reachable.add(r + c);
  return reachable.has(amount);
}
