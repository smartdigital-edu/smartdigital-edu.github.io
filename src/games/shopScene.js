/**
 * shopScene – a story-scene game: an illustrated shop with a shopkeeper who
 * asks the question in a speech bubble, a counter panel, a tray of money to
 * choose from, and a progress bar with dots.
 *
 * Config:
 *  { questions: [...], count?, scene?: { title, subtitle, background?: {img}, character?: {img} } }
 * Question types (see money.js generators):
 *  pick: { say, hint, options: [{ money: [sen...] } | { text, sen }], answer: index, show?: [sen...], explain? }
 *  pay:  { say, hint, item: { emoji, en, ms }, price: sen, wallet: [sen...] }
 */
import { el, clear, animate, button } from '../core/ui.js';
import { shuffle } from '../core/scoring.js';
import { moneySVG, amountWords, formatAmount } from './money.js';
import { shopBackgroundSVG, shopkeeperSVG } from './shopArt.js';
import './shopScene.css';

const T = {
  great: { en: 'Great job!', ms: 'Bagus!' },
  tryAgain: { en: 'Try again!', ms: 'Cuba lagi!' },
  choose: { en: 'Choose your money', ms: 'Pilih duit anda' },
  chooseTotal: { en: 'Choose the total', ms: 'Pilih jumlahnya' },
  wallet: { en: 'Your money', ms: 'Duit anda' },
  counter: { en: 'On the counter', ms: 'Di kaunter' },
  pay: { en: 'Pay', ms: 'Bayar' },
  reset: { en: 'Take back', ms: 'Ambil semula' },
  notEnough: { en: 'Not enough yet. Add more money!', ms: 'Belum cukup. Tambah lagi duit!' },
  tooMuch: { en: 'That is too much. Take some back!', ms: 'Itu terlalu banyak. Ambil semula sedikit!' },
  empty: { en: 'Tap your money to put it on the counter.', ms: 'Tekan duit anda untuk letak di kaunter.' },
  thanks: { en: 'Thank you! Here is your', ms: 'Terima kasih! Ini' },
  listen: { en: 'Listen again', ms: 'Dengar lagi' },
  question: { en: 'Question', ms: 'Soalan' },
  price: { en: 'Price', ms: 'Harga' },
};

/** Short skill label for the parent's progress page: "RM5", "20 sen", "RM1 vs 50 sen". */
function skillOf(q) {
  if (q.type === 'pay') return formatAmount(q.price);
  const vals = q.options.map((o) => o.sen ?? o.money.reduce((a, b) => a + b, 0));
  if (q.options.length === 2 && !q.show) return vals.map(formatAmount).join(' vs '); // which is more?
  return formatAmount(vals[q.answer]);
}

const moneyNode = (sen, cls = '') => el(`span.money${cls}`, { html: moneySVG(sen) });

export default function shopScene(root, config, api) {
  const tx = (v) => api.tx(v);
  const questions = (config.keepOrder ? config.questions : shuffle(config.questions)).slice(0, config.count || config.questions.length);
  const sceneCfg = config.scene || {};
  let index = 0;
  let correct = 0;
  const items = []; // per question, for the parent's progress page

  /* ---------- layout ---------- */
  const bg = sceneCfg.background?.img
    ? el('img.scene-bg', { src: sceneCfg.background.img, alt: '' })
    : el('div.scene-bg', { html: shopBackgroundSVG() });
  const character = el('div.scene-character', {},
    sceneCfg.character?.img ? el('img', { src: sceneCfg.character.img, alt: '' }) : el('div', { html: shopkeeperSVG() }));
  const banner = el('div.scene-banner', {}, el('strong', tx(sceneCfg.title || { en: 'Little Money Explorer', ms: 'Penjelajah Duit Cilik' })),
    el('span', tx(sceneCfg.subtitle || { en: 'Grocery Shop', ms: 'Kedai Runcit' })));
  const bubbleText = el('p.bubble-text');
  const bubble = el('div.scene-bubble', { role: 'status', 'aria-live': 'polite' }, bubbleText);
  const scene = el('div.scene', {}, bg, character, banner, bubble);

  const counterBody = el('div.counter-body');
  const counterHint = el('p.counter-hint');
  const counter = el('div.shop-counter', {}, counterBody, counterHint);

  const trayTitle = el('h3.tray-title');
  const trayBody = el('div.tray-body');
  const trayFoot = el('div.tray-foot');
  const tray = el('section.shop-tray', {}, trayTitle, trayBody, trayFoot);

  const dots = el('div.shop-dots', { 'aria-hidden': 'true' }, questions.map(() => el('span.dot')));
  const countText = el('span.shop-count', { 'aria-live': 'polite' });
  let currentSay = '';
  const replay = button('', { variant: 'secondary small', icon: '🔊', aria: tx(T.listen), onClick: () => api.speak(currentSay) });
  const bar = el('div.shop-bar', {}, el('div.shop-progress', {}, el('span.shop-label', tx(T.question)), countText, dots), replay);

  root.append(el('div.shop-game', {}, scene, counter, tray, bar));

  /* ---------- helpers ---------- */
  function say(text, { speak = true } = {}) {
    bubbleText.textContent = text;
    animate(bubble, 'pop-in', 300);
    if (speak) { currentSay = text; api.speak(text); }
  }
  function mood(kind) {
    character.classList.remove('happy', 'sad');
    void character.offsetWidth; // restart the animation
    character.classList.add(kind);
  }
  function updateProgress() {
    countText.textContent = `${Math.min(index + 1, questions.length)}/${questions.length}`;
    [...dots.children].forEach((d, i) => { d.className = `dot${i < index ? ' done' : i === index ? ' now' : ''}`; });
  }

  function next() {
    if (index >= questions.length) {
      [...dots.children].forEach((d) => { d.className = 'dot done'; });
      api.finish({ correct, total: questions.length, items });
      return;
    }
    updateProgress();
    clear(counterBody); clear(trayBody); clear(trayFoot);
    character.classList.remove('happy', 'sad');
    const q = questions[index];
    (q.type === 'pay' ? renderPay : renderPick)(q);
  }

  function done(firstTry, message) {
    if (firstTry) correct += 1;
    const q = questions[index];
    items.push({ label: skillOf(q), result: firstTry ? 'first' : 'retry' });
    mood('happy');
    api.sfx.correct();
    say(message);
    index += 1;
    setTimeout(next, 2200);
  }

  /* ---------- pick one ---------- */
  function renderPick(q) {
    let missed = false;
    let over = false;
    say(tx(q.say));
    counterHint.textContent = tx(q.hint);
    if (q.show) counterBody.append(el('div.counter-money', {}, q.show.map((s) => moneyNode(s, '.on-counter'))));
    else counterBody.append(el('span.counter-icon', { 'aria-hidden': 'true' }, '🛒'));
    trayTitle.textContent = tx(q.options.some((o) => o.text) ? T.chooseTotal : T.choose);
    const grid = el('div.money-options', { role: 'group', style: { '--n': q.options.length } });
    q.options.forEach((o, i) => {
      const value = o.sen ?? o.money.reduce((a, b) => a + b, 0);
      const spoken = amountWords(value, api.lang);
      const card = el('button.money-card', {
        type: 'button',
        'aria-label': o.text || spoken,
        onclick: () => {
          if (over) return;
          if (i === q.answer) {
            over = true;
            card.classList.add('right');
            animate(card, 'celebrate', 700);
            grid.querySelectorAll('button').forEach((b) => { b.disabled = true; });
            done(!missed, `${tx(T.great)} ${q.explain ? tx(q.explain) : spoken}.`);
          } else {
            missed = true;
            card.classList.add('wrong');
            card.disabled = true;
            animate(card, 'shake', 500);
            api.sfx.wrong();
            mood('sad');
            say(`${api.lang === 'ms' ? 'Itu' : 'That is'} ${spoken}. ${tx(T.tryAgain)}`);
          }
        },
      }, o.text ? el('span.money-total', o.text) : o.money.map((s) => moneyNode(s)));
      grid.append(card);
    });
    trayBody.append(grid);
  }

  /* ---------- pay the shopkeeper ---------- */
  function renderPay(q) {
    let missed = false;
    let over = false;
    say(tx(q.say));
    counterHint.textContent = tx(q.hint);
    trayTitle.textContent = tx(T.wallet);
    const placed = el('div.counter-money.placed', { 'aria-label': tx(T.counter) });
    const total = el('span.counter-total');
    counterBody.append(
      el('div.price-tag', {}, el('span.item', { 'aria-hidden': 'true' }, q.item.emoji), el('span.tag', {}, el('small', tx(T.price)), formatAmount(q.price))),
      el('div.counter-drop', {}, el('small', tx(T.counter)), placed, total),
    );
    const wallet = el('div.wallet', { role: 'group' });
    const sum = () => [...placed.children].reduce((a, n) => a + Number(n.dataset.sen), 0);
    const refresh = () => {
      const s = sum();
      total.textContent = formatAmount(s).replace(/^0 sen$/, 'RM0');
      payBtn.disabled = over || s === 0;
    };
    const coin = (sen) => {
      const b = el('button.money-chip', { type: 'button', 'aria-label': amountWords(sen, api.lang), 'data-sen': sen, html: moneySVG(sen) });
      b.addEventListener('click', () => {
        if (over) return;
        api.sfx.tap();
        (b.parentElement === wallet ? placed : wallet).append(b);
        animate(b, 'pop-in', 250);
        refresh();
      });
      return b;
    };
    [...q.wallet].sort((a, b) => a - b).forEach((s) => wallet.append(coin(s)));
    const payBtn = button(tx(T.pay), {
      icon: '💵',
      onClick: () => {
        const s = sum();
        if (s === q.price) {
          over = true;
          payBtn.disabled = true;
          resetBtn.disabled = true;
          animate(placed, 'celebrate', 700);
          done(!missed, `${tx(T.great)} ${tx(T.thanks)} ${q.item.emoji} ${api.lang === 'ms' ? q.item.ms : q.item.en}.`);
        } else {
          missed = true;
          api.sfx.wrong();
          animate(placed, 'shake', 500);
          mood('sad');
          say(`${s < q.price ? tx(T.notEnough) : tx(T.tooMuch)}`);
        }
      },
    });
    const resetBtn = button(tx(T.reset), {
      variant: 'secondary', icon: '↩',
      onClick: () => { [...placed.children].forEach((n) => wallet.append(n)); refresh(); },
    });
    trayBody.append(wallet);
    trayFoot.append(resetBtn, payBtn);
    refresh();
  }

  next();
}
