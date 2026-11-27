/**
 * arithmetic – addition / subtraction with pictures.
 * Question JSON: { a, b, op: '+'|'-', emoji, options?: [n...] }
 * Options are generated around the answer when not supplied.
 */
import { el } from '../core/ui.js';
import { shuffle } from '../core/scoring.js';
import { engineFrom } from './runner.js';

export function solve(a, b, op) { return op === '-' ? a - b : a + b; }

export function makeOptions(answer, max = 20, n = 3) {
  const set = new Set([answer]);
  let d = 1;
  while (set.size < n) {
    if (answer + d <= max) set.add(answer + d);
    if (set.size < n && answer - d >= 0) set.add(answer - d);
    d += 1;
  }
  return shuffle([...set]);
}

function group(n, emoji, crossed = 0) {
  return el('div.sum-group', { 'aria-hidden': 'true' },
    Array.from({ length: n }, (_, i) => el(`span${i >= n - crossed ? '.gone' : ''}`, emoji)));
}

function render(q, { stage }, ctx) {
  const { api } = ctx;
  const ans = solve(q.a, q.b, q.op);
  const sentence = `${q.a} ${q.op === '-' ? '−' : '+'} ${q.b} = ?`;
  const spoken = q.op === '-'
    ? (api.lang === 'ms' ? `${q.a} tolak ${q.b}, tinggal berapa?` : `${q.a} take away ${q.b}. How many are left?`)
    : (api.lang === 'ms' ? `${q.a} tambah ${q.b} jadi berapa?` : `${q.a} plus ${q.b}. How many altogether?`);
  ctx.setPrompt(sentence, { say: spoken });
  stage.append(el('div.sum', { role: 'img', 'aria-label': spoken },
    q.op === '-' ? group(q.a, q.emoji, q.b) : [group(q.a, q.emoji), el('span', '+'), group(q.b, q.emoji)],
    el('span', '='), el('span', '?')));
  const choices = el('div.choices', { role: 'group', style: { marginTop: '1rem' } });
  (q.options || makeOptions(ans, q.max || 20)).forEach((n) => {
    const b = el('button.choice', {
      type: 'button',
      onclick: () => {
        const ok = n === ans;
        b.classList.add(ok ? 'right' : 'wrong');
        api.speak(String(n));
        if (ctx.attempt(ok, b, { answerText: String(ans) })) choices.querySelectorAll('button').forEach((x) => { x.disabled = true; });
        else b.disabled = true;
      },
    }, el('span.big-text', { style: { fontSize: '2.6rem' } }, String(n)));
    choices.append(b);
  });
  stage.append(choices);
}

export default engineFrom(render);
