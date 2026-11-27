/**
 * spaceFind – "Letter Space Rescue": find every copy of a letter among the stars.
 * Astronaut Cici waits by her rocket; each star the child finds flies into one of the
 * rocket's windows. Wrong stars shake and dim.
 *
 * Question JSON:
 *   { target, items: [letters…] (8), prompt, say?, title, foundText ("{n} of {total} found"),
 *     scene: { src, ratio, windows: [[cx, cy, w, h] in %] } }
 */
import { el } from '../core/ui.js';
import { shuffle } from '../core/scoring.js';
import { engineFrom } from './runner.js';
import './spaceFind.css';

const STAR = 'M50 6 C54 6 56 9 58 13 L66 30 L85 33 C90 34 93 36 94 40 C95 44 93 47 90 50 L76 63 L80 82 C81 87 80 90 76 92 C73 94 69 93 65 91 L50 82 L35 91 C31 93 27 94 24 92 C20 90 19 87 20 82 L24 63 L10 50 C7 47 5 44 6 40 C7 36 10 34 15 33 L34 30 L42 13 C44 9 46 6 50 6 Z';

const starSvg = () => `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="${STAR}" fill="url(#sf-gold)" stroke="#e8a400" stroke-width="2"/><path d="${STAR}" fill="none" stroke="#fff6b8" stroke-width="3" opacity=".55" transform="translate(50 50) scale(.86) translate(-50 -50)"/></svg>`;

function render(q, { stage }, ctx) {
  const { api } = ctx;
  const prompt = api.tx(q.prompt);
  const say = q.say ? api.tx(q.say) : prompt;
  ctx.setPrompt(prompt, { say }); // speaks it; the scene shows its own header bar
  const total = q.items.filter((x) => x === q.target).length;
  let found = 0;

  const foundEl = el('span.sf-found', { 'aria-live': 'polite' });
  const setFound = () => { foundEl.textContent = api.tx(q.foundText).replace('{n}', found).replace('{total}', total); };
  setFound();

  const windows = (q.scene.windows || []).map(([cx, cy, w, h]) => el('span.sf-window', {
    style: { left: `${cx - w / 2}%`, top: `${cy - h / 2}%`, width: `${w}%`, height: `${h}%` },
  }));

  const stars = el('div.sf-stars', { role: 'group', 'aria-label': prompt });
  shuffle(q.items).forEach((letter) => {
    const b = el('button.sf-star', { type: 'button', 'aria-label': letter, html: starSvg() }, el('span.sf-letter', letter));
    b.addEventListener('click', () => {
      if (b.disabled) return;
      b.disabled = true;
      if (letter !== q.target) {
        b.classList.add('wrong');
        ctx.attempt(false, b);
        return;
      }
      found += 1;
      b.classList.add('found');
      const win = windows[found - 1];
      if (win) { win.textContent = letter; win.classList.add('filled'); }
      setFound();
      if (found === total) ctx.attempt(true, b);
      else { ctx.right(b); api.speak(String(letter)); }
    });
    stars.append(b);
  });

  stage.append(el('div.sf-scene', { style: { aspectRatio: q.scene.ratio } },
    el('div.sf-defs', { 'aria-hidden': 'true', html: '<svg width="0" height="0"><defs><linearGradient id="sf-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe45c"/><stop offset=".55" stop-color="#ffd21f"/><stop offset="1" stop-color="#f6b800"/></linearGradient></defs></svg>' }),
    el('img.sf-bg', { src: q.scene.src, alt: '', draggable: 'false' }),
    el('div.sf-bar', {},
      el('span.sf-title', api.tx(q.title)),
      el('button.sf-say', { type: 'button', 'aria-label': api.t('game.listen'), onclick: () => api.speak(say) },
        el('span.sf-speaker', { 'aria-hidden': 'true' }, '🔊'), el('span', prompt)),
      foundEl),
    ...windows,
    stars));
}

export default engineFrom(render);
