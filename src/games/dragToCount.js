/**
 * dragToCount – drag N objects into the basket, then press Check.
 * Question JSON: { count, emoji, prompt?, say?, a?, b? }   (a + b = count for "Add Them Up")
 */
import { el, button } from '../core/ui.js';
import { engineFrom } from './runner.js';
import { createDnD } from './dnd.js';

function render(q, { stage }, ctx) {
  const { api } = ctx;
  const ms = api.lang === 'ms';
  const text = q.prompt ? api.tx(q.prompt)
    : q.a != null ? (ms ? `Masukkan ${q.a} + ${q.b} ${q.emoji} ke dalam bakul` : `Put ${q.a} + ${q.b} ${q.emoji} in the basket`)
      : (ms ? `Masukkan ${q.count} ke dalam bakul` : `Put ${q.count} in the basket`);
  const say = q.a != null ? (ms ? `${q.a} tambah ${q.b}. Masukkan semuanya ke dalam bakul.` : `${q.a} plus ${q.b}. Put them all in the basket.`) : text;
  ctx.setPrompt(text, { say });
  const pile = el('div.pile', { 'aria-label': 'pile' });
  const basket = el('div.basket', { 'aria-label': 'basket' }, el('div.basket-label', { 'aria-hidden': 'true' }, '🧺'));
  const count = el('p', { style: { textAlign: 'center', fontWeight: 700, fontSize: '1.4rem', margin: 0 }, 'aria-live': 'polite' }, '0');

  const update = () => {
    const n = basket.querySelectorAll('.tile').length;
    count.textContent = String(n);
    return n;
  };
  const dnd = createDnD({
    onDrop(tile, target) {
      (target === basket ? basket : pile).append(tile);
      const n = update();
      api.sfx.pop();
      if (target === basket && api.kids) api.speak(String(n));
    },
    onTapTile(tile) {
      (tile.parentElement === basket ? pile : basket).append(tile);
      const n = update();
      api.sfx.pop();
      if (tile.parentElement === basket && api.kids) api.speak(String(n));
      return true;
    },
  });
  dnd.target(basket);
  dnd.target(pile);
  const total = q.count + 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < total; i += 1) {
    const t = el('button.tile', { type: 'button', 'aria-label': q.emoji }, q.emoji);
    dnd.tile(t, i);
    pile.append(t);
  }
  const check = button(api.t('game.check'), {
    icon: '✔',
    onClick: () => {
      const ok = update() === q.count;
      if (ctx.attempt(ok, basket, { answerText: String(q.count) })) check.disabled = true;
    },
  });
  stage.append(el('div.count-area', {}, pile, basket), count, el('div.next-row', {}, check));
}

export default engineFrom(render);
