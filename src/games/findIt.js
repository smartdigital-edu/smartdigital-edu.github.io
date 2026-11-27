/**
 * findIt – "Find the ___": tap the right item in a grid.
 * Question JSON: { prompt, say?, items: [{ id, visual, label? }], answer: id }
 */
import { el, visual } from '../core/ui.js';
import { shuffle } from '../core/scoring.js';
import { engineFrom } from './runner.js';

function render(q, { stage }, ctx) {
  const { api } = ctx;
  ctx.setPrompt(api.tx(q.prompt), { say: q.say ? api.tx(q.say) : undefined, visual: q.promptVisual, size: 'md' });
  const grid = el('div.find-grid', { role: 'group' });
  shuffle(q.items).forEach((it) => {
    const b = el('button.choice', {
      type: 'button',
      'aria-label': it.label ? api.tx(it.label) : String(it.visual),
      onclick: () => {
        const ok = it.id === q.answer;
        b.classList.add(ok ? 'right' : 'wrong');
        if (ctx.attempt(ok, b)) grid.querySelectorAll('button').forEach((x) => { x.disabled = true; });
        else b.disabled = true;
      },
    }, it.text != null ? el('span.big-text', { style: it.color ? { color: it.color } : null }, api.tx(it.text)) : visual(it.visual, { size: 'lg' }));
    grid.append(b);
  });
  stage.append(grid);
}

export default engineFrom(render);
