/**
 * popBalloon – balloons float up; tap the one with the asked colour.
 * Question JSON: { target: { key, color, label }, colors: [{ key, color, label }] }
 * Respects prefers-reduced-motion (balloons stand still).
 */
import { el, reducedMotion } from '../core/ui.js';
import { shuffle } from '../core/scoring.js';
import { engineFrom } from './runner.js';
import { ART } from './art.js';

function render(q, { stage }, ctx) {
  const { api } = ctx;
  const name = api.tx(q.target.label);
  ctx.setPrompt(api.lang === 'ms' ? `Pecahkan belon ${name}!` : `Pop the ${name} balloon!`, { visual: { color: q.target.color }, size: 'sm' });
  const sky = el('div.sky', { role: 'group' });
  const still = reducedMotion();
  // 6 balloons: the target colour appears twice so it is easy to find.
  const list = shuffle([q.target, q.target, ...shuffle(q.colors.filter((c) => c.key !== q.target.key)).slice(0, 4)]);
  list.forEach((c, i) => {
    const b = el('button.balloon', {
      type: 'button',
      'aria-label': api.tx(c.label),
      html: ART.balloon(c.color),
      style: {
        left: `${4 + i * 16}%`,
        animationDuration: `${7 + Math.random() * 4}s`,
        animationDelay: `${-Math.random() * 8}s`,
        ...(still ? { top: `${15 + (i % 3) * 25}%` } : {}),
      },
      onclick: () => {
        const ok = c.key === q.target.key;
        if (ok) { api.sfx.pop(); b.classList.add('popped'); }
        if (ctx.attempt(ok, b)) sky.querySelectorAll('button').forEach((x) => { x.disabled = true; });
      },
    });
    sky.append(b);
  });
  stage.append(sky);
}

export default engineFrom(render);
