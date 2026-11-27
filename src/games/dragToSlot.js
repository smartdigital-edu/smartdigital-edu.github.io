/**
 * dragToSlot – drag tiles into the right slots.
 * Layouts:
 *   row    : sequence with gaps (Complete the ABC, syllables)
 *   train  : same as row, drawn as train carriages (Choo-Choo ABC / 123)
 *   figure : labels positioned on an SVG figure (Label the Body Part)
 *   half   : choose the missing half of an animal (Complete the Animal)
 * Question JSON:
 *   { layout, prompt, say?, slots: [{ answer, fixed?, x?, y? }], tiles: [values], figure?: "<svg…>", emoji? }
 */
import { el, clear } from '../core/ui.js';
import { shuffle } from '../core/scoring.js';
import { engineFrom } from './runner.js';
import { createDnD } from './dnd.js';

const halfNode = (emoji, side) => el(`span.half.${side}-half`, { 'aria-hidden': 'true' }, el('span', emoji));

function tileContent(q, value, api) {
  if (q.layout === 'half') return halfNode(value, 'right');
  return api.tx(value);
}

function render(q, { stage }, ctx) {
  const { api } = ctx;
  ctx.setPrompt(api.tx(q.prompt), { say: q.say ? api.tx(q.say) : undefined });
  const open = q.slots.filter((s) => !s.fixed);
  let filled = 0;
  let mistakes = 0;

  const dnd = createDnD({
    onDrop(tile, slot) {
      if (slot.classList.contains('filled')) return;
      const ok = String(tile._data) === String(slot._data.answer);
      if (!ok) {
        mistakes += 1;
        ctx.wrong(tile);
        if (ctx.once) finish();
        return;
      }
      clear(slot).append(tileContent(q, tile._data, api));
      slot.classList.add('filled', 'right');
      slot.setAttribute('aria-label', String(api.tx(tile._data)));
      tile.remove();
      filled += 1;
      ctx.right(slot);
      if (api.kids && q.layout !== 'half') api.speak(String(api.tx(slot._data.say || tile._data)));
      if (filled === open.length) finish();
    },
  });
  const finish = () => ctx.attempt(mistakes === 0, board, { answerText: open.map((s) => api.tx(s.answer)).join(', ') });

  const makeSlot = (s, i) => {
    const node = el(`div.slot${s.fixed ? '.fixed' : ''}`, {
      'aria-label': s.fixed ? String(api.tx(s.answer)) : api.t('game.emptyBox', { n: i + 1 }),
      style: s.x != null ? { left: `${s.x}%`, top: `${s.y}%` } : null,
    }, s.fixed ? (q.layout === 'half' ? halfNode(s.answer, 'right') : api.tx(s.answer)) : '');
    if (!s.fixed) dnd.target(node, s);
    return node;
  };

  let board;
  if (q.layout === 'figure') {
    board = el('div.figure-board', { html: q.figure });
    q.slots.forEach((s, i) => board.append(makeSlot(s, i)));
  } else if (q.layout === 'half') {
    board = el('div.half-board', { role: 'img', 'aria-label': api.tx(q.prompt) }, halfNode(q.emoji, 'left'), makeSlot(q.slots[0], 0));
  } else if (q.layout === 'train') {
    board = el('div.train', {}, el('span.engine', { 'aria-hidden': 'true' }, '🚂'), q.slots.map(makeSlot));
  } else {
    board = el('div.slots', {}, q.slots.map(makeSlot));
  }

  const bank = el(`div.tile-bank${q.layout === 'half' ? '.half-tiles' : ''}`, { 'aria-label': api.t('game.dragHint') });
  shuffle(q.tiles).forEach((v) => {
    const t = el('button.tile', { type: 'button', 'aria-label': q.layout === 'half' ? String(v) : String(api.tx(v)) }, tileContent(q, v, api));
    dnd.tile(t, v);
    bank.append(t);
  });
  stage.append(board, el('p.muted', { style: { textAlign: 'center', margin: '.5rem 0' } }, api.t('game.dragHint')), bank);
}

export default engineFrom(render);
