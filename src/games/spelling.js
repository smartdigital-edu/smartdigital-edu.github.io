/**
 * spelling – "🔊 Hear Word", then tap or drag letters into the boxes.
 * Question JSON: { word, visual?, say?, hint?, extra?: number of distractor letters }
 * Kids mode checks automatically when all boxes are full; quiz mode uses "Check Answer".
 */
import { el, button } from '../core/ui.js';
import { shuffle } from '../core/scoring.js';
import { engineFrom } from './runner.js';
import { createDnD } from './dnd.js';

const ALPHA = 'abcdefghijklmnopqrstuvwxyz';

export function letterTiles(word, extra = 2, rng = Math.random) {
  const letters = word.toLowerCase().replace(/[^a-z]/g, '').split('');
  const pool = ALPHA.split('').filter((c) => !letters.includes(c));
  const distract = shuffle(pool, rng).slice(0, extra);
  return shuffle([...letters, ...distract], rng);
}

export function renderSpelling(q, { prompt, stage }, ctx) {
  const { api } = ctx;
  const word = q.word.toLowerCase();
  const sayWord = () => api.speak(q.say ? api.tx(q.say) : word, { lang: q.lang || 'en', audioSrc: q.audio });
  ctx.setPrompt(api.tx(q.prompt || (api.lang === 'ms' ? 'Dengar dan eja perkataan ini.' : 'Listen and spell the word.')), { visual: q.visual, size: 'lg', say: '' });
  prompt.append(button(api.t('game.hear'), { icon: '🔊', variant: 'secondary', onClick: sayWord }));
  if (q.hint) prompt.append(el('p.muted', { style: { width: '100%', margin: 0, fontSize: '1rem', fontWeight: 400 } }, api.tx(q.hint)));
  setTimeout(sayWord, api.kids ? 1200 : 300);

  const boxes = el('div.slots', { role: 'group', 'aria-label': api.t('game.yourSentence') });
  const bank = el('div.tile-bank', { role: 'group', 'aria-label': api.t('game.wordBank') });
  const slots = word.split('').map((ch, i) => {
    const s = el('button.slot', { type: 'button', 'aria-label': api.t('game.emptyBox', { n: i + 1 }), onclick: () => { if (s._tile) { bank.append(s._tile); s._tile.classList.remove('placed'); s._tile = null; s.textContent = ''; s.classList.remove('filled'); s.setAttribute('aria-label', api.t('game.emptyBox', { n: i + 1 })); } } });
    return s;
  });
  boxes.append(...slots);

  const place = (tile, slot) => {
    const target = slot && !slot._tile ? slot : slots.find((s) => !s._tile);
    if (!target) return;
    target._tile = tile;
    target.textContent = tile._data;
    target.classList.add('filled');
    target.setAttribute('aria-label', api.t('game.letterTile', { letter: tile._data }));
    tile.remove();
    api.sfx.tap();
    if (api.kids && slots.every((s) => s._tile)) check();
  };
  const dnd = createDnD({ onDrop: (tile, slot) => place(tile, slot), onTapTile: (tile) => { place(tile); return true; } });
  slots.forEach((s) => dnd.target(s));
  letterTiles(word, q.extra ?? (api.kids ? 2 : 3)).forEach((ch) => {
    const t = el('button.tile', { type: 'button', 'aria-label': api.t('game.letterTile', { letter: ch }) }, ch);
    dnd.tile(t, ch);
    bank.append(t);
  });

  function check() {
    const given = slots.map((s) => s._tile?._data || '').join('');
    const ok = given === word;
    const over = ctx.attempt(ok, boxes, { answerText: word });
    if (over) { [...slots, ...bank.children, checkBtn].forEach((b) => { b.disabled = true; }); }
    else {
      // let the child try again: return all letters to the bank
      setTimeout(() => slots.forEach((s) => s.click()), 600);
    }
  }
  const checkBtn = button(api.t('game.check'), { icon: '✔', onClick: check });
  stage.append(boxes, el('div', { style: { height: '1rem' } }), bank, el('div.next-row', { style: { marginTop: '1rem' } }, checkBtn));
}

export default engineFrom(renderSpelling);
