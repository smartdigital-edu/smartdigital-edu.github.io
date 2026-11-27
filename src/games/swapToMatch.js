/**
 * swapToMatch – tap two items in the bottom row to swap them until every
 * item sits under its matching partner (paint tubes, socks, crayons).
 * Round JSON: { prompt, say?, targetArt, itemArt, colors: [{ key, color, label }] }
 * Score: number of pairs minus wasted swaps (never below 1).
 */
import { el } from '../core/ui.js';
import { shuffleDifferent } from '../core/scoring.js';
import { engineFrom } from './runner.js';
import { ART } from './art.js';

/** Minimum swaps to sort a permutation = n - number of cycles. */
export function minSwaps(order, goal) {
  const pos = new Map(goal.map((k, i) => [k, i]));
  const seen = new Array(order.length).fill(false);
  let cycles = 0;
  for (let i = 0; i < order.length; i += 1) {
    if (seen[i]) continue;
    cycles += 1;
    let j = i;
    while (!seen[j]) { seen[j] = true; j = pos.get(order[j]); }
  }
  return order.length - cycles;
}

function render(q, { stage }, ctx) {
  const { api } = ctx;
  ctx.setPrompt(api.tx(q.prompt), { say: q.say ? api.tx(q.say) : undefined });
  const goal = q.colors.map((c) => c.key);
  let order = shuffleDifferent(goal);
  const best = minSwaps(order, goal);
  let swaps = 0;
  let selected = -1;
  const byKey = Object.fromEntries(q.colors.map((c) => [c.key, c]));

  const top = el('div.swap-row', {}, q.colors.map((c) => el('div.swap-item.swap-target', { role: 'img', 'aria-label': api.tx(c.label), html: ART[q.targetArt](c.color) })));
  const bottom = el('div.swap-row', { role: 'group', 'aria-label': api.t('game.tapTwo') });
  const draw = () => {
    bottom.replaceChildren(...order.map((k, i) => {
      const c = byKey[k];
      const b = el(`button.swap-item${k === goal[i] ? '.matched' : ''}${i === selected ? '.selected' : ''}`, {
        type: 'button', 'aria-label': `${api.tx(c.label)}${k === goal[i] ? ' ✔' : ''}`, 'aria-pressed': String(i === selected), html: ART[q.itemArt](c.color),
        onclick: () => tap(i),
      });
      return b;
    }));
    top.querySelectorAll('.swap-target').forEach((n, i) => n.classList.toggle('matched', order[i] === goal[i]));
  };
  function tap(i) {
    api.sfx.tap();
    if (selected < 0) { selected = i; draw(); bottom.children[i].focus(); return; }
    if (selected === i) { selected = -1; draw(); return; }
    [order[selected], order[i]] = [order[i], order[selected]];
    order = [...order];
    swaps += 1;
    const j = i;
    selected = -1;
    draw();
    bottom.children[j].focus();
    if (order[j] === goal[j]) { ctx.right(bottom.children[j]); if (api.kids) api.speak(api.tx(byKey[order[j]].label)); }
    if (order.every((k, idx) => k === goal[idx])) {
      const wasted = Math.max(0, swaps - best);
      const n = goal.length;
      setTimeout(() => ctx.complete({ correct: Math.max(1, n - wasted), total: n }), 400);
    }
  }
  draw();
  stage.append(el('div.swap-rows', {}, top, bottom), el('p.muted', { style: { textAlign: 'center' } }, api.t('game.tapTwo')));
}

export default engineFrom(render, { unit: 'round' });
