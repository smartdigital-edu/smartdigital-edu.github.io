/**
 * sortBuckets – drag each item into the right category bucket.
 * Round JSON: { prompt, say?, buckets: [{ id, label, visual }], items: [{ visual, label, bucket }] }
 */
import { el, visual } from '../core/ui.js';
import { shuffle } from '../core/scoring.js';
import { engineFrom } from './runner.js';
import { createDnD } from './dnd.js';

function render(q, { stage }, ctx) {
  const { api } = ctx;
  ctx.setPrompt(api.tx(q.prompt), { say: q.say ? api.tx(q.say) : undefined });
  const wrong = new Set();
  let placed = 0;
  const dnd = createDnD({
    onDrop(tile, bucket) {
      const item = tile._data;
      if (item.bucket !== bucket._data.id) {
        wrong.add(item);
        ctx.wrong(tile);
        return;
      }
      bucket.querySelector('.bucket-items').append(visual(item.visual, { size: 'sm', label: api.tx(item.label) }));
      tile.remove();
      placed += 1;
      ctx.right(bucket);
      if (api.kids) api.speak(api.tx(item.label));
      if (placed === q.items.length) setTimeout(() => ctx.complete({ correct: q.items.length - wrong.size, total: q.items.length }), 400);
    },
  });
  const buckets = el('div.buckets', {}, q.buckets.map((b) => {
    const node = el('div.bucket', { role: 'button', 'aria-label': api.tx(b.label) },
      el('div.bucket-head', {}, visual(b.visual, { size: 'sm' }), el('span', api.tx(b.label))),
      el('div.bucket-items'));
    dnd.target(node, b);
    return node;
  }));
  const bank = el('div.tile-bank');
  shuffle(q.items).forEach((it) => {
    const t = el('button.tile', { type: 'button', 'aria-label': api.tx(it.label), style: { fontSize: '2.4rem', fontFamily: 'var(--emoji)' } }, it.visual);
    dnd.tile(t, it);
    bank.append(t);
  });
  stage.append(bank, el('p.muted', { style: { textAlign: 'center', margin: '.5rem 0' } }, api.t('game.dragHint')), buckets);
}

export default engineFrom(render, { unit: 'round' });
