/**
 * multipleChoice – picture/text prompt with 2–4 tappable options.
 * Also exports the Grammar Hub "fill" (choose the word for the blank)
 * and "spot" (tap the wrong word) renderers used by the quiz engine.
 *
 * Question JSON:
 *  { prompt, say?, visual?, sentence?, options: [ "text" | {label, visual, value} ], answer, explanation? }
 */
import { el, visual } from '../core/ui.js';
import { shuffle, checkAnswer } from '../core/scoring.js';
import { engineFrom } from './runner.js';

const optValue = (o) => (typeof o === 'object' ? (o.value ?? o.label) : o);

/** Render "The ___ is red." with a visible blank (and highlight [[words]]). */
export function sentenceNode(text, tx) {
  const s = tx(text);
  const node = el('p.q-sentence');
  s.split(/(___|\[\[.+?\]\])/).forEach((part) => {
    if (part === '___') node.append(el('span.q-blank', { 'aria-label': 'blank' }));
    else if (part.startsWith('[[')) node.append(el('mark', part.slice(2, -2)));
    else if (part) node.append(part);
  });
  return node;
}

export function renderChoice(q, { prompt, stage }, ctx) {
  const { api } = ctx;
  const spokenSentence = q.sentence ? ` ${api.tx(q.sentence).replace(/___/g, 'blank').replace(/\[\[|\]\]/g, '')}` : '';
  ctx.setPrompt(api.tx(q.prompt), { say: q.say ? api.tx(q.say) : `${api.tx(q.prompt)}${spokenSentence}`, visual: q.visual, size: q.visualSize || 'xl', label: q.visualLabel });
  if (q.sentence) prompt.after(sentenceNode(q.sentence, api.tx));
  const opts = q.shuffle === false ? q.options : shuffle(q.options);
  const answerOpt = q.options.find((o) => checkAnswer(q, optValue(o)));
  const answerText = answerOpt ? api.tx(typeof answerOpt === 'object' ? (answerOpt.label ?? answerOpt.value) : answerOpt) : String(q.answer);
  const grid = el('div.choices', { role: 'group' });
  opts.forEach((o) => {
    const obj = typeof o === 'object' ? o : { label: o };
    const label = obj.label != null ? api.tx(obj.label) : '';
    const b = el(`button.choice${obj.visual == null ? '.text-only' : ''}`, {
      type: 'button',
      'aria-label': label || obj.alt || String(optValue(o)),
      onclick: () => {
        const ok = checkAnswer(q, optValue(o));
        b.classList.add(ok ? 'right' : 'wrong');
        if (api.kids && label && obj.speak !== false) api.speak(label);
        const over = ctx.attempt(ok, b, { answerText });
        if (over) {
          grid.querySelectorAll('button').forEach((x) => {
            x.disabled = true;
            const xo = opts[[...grid.children].indexOf(x)];
            if (checkAnswer(q, optValue(xo))) x.classList.add('right');
          });
        } else {
          b.disabled = true;
        }
      },
    }, obj.visual != null ? visual(obj.visual, { size: q.optionSize || 'md' }) : null, label && !obj.hideLabel ? el('span', label) : null);
    grid.append(b);
  });
  stage.append(grid);
}

/** Spot the mistake: tap the incorrect word in the sentence. answer = the wrong word. */
export function renderSpot(q, { stage }, ctx) {
  const { api } = ctx;
  ctx.setPrompt(api.tx(q.prompt || 'Tap the word that is wrong.'));
  const words = api.tx(q.sentence).split(' ');
  const wrap = el('div.spot-words', { role: 'group' });
  const clean = (w) => w.replace(/[.,!?;:]+$/, '');
  words.forEach((w, i) => {
    const b = el('button.choice', {
      type: 'button',
      onclick: () => {
        const ok = q.index != null ? i === q.index : clean(w).toLowerCase() === String(q.answer).toLowerCase();
        b.classList.add(ok ? 'right' : 'wrong');
        const over = ctx.attempt(ok, b, { answerText: q.correction ? `${q.answer} → ${q.correction}` : q.answer });
        if (over) {
          wrap.querySelectorAll('button').forEach((x, j) => {
            x.disabled = true;
            const hit = q.index != null ? j === q.index : clean(words[j]).toLowerCase() === String(q.answer).toLowerCase();
            if (hit) x.classList.add('right');
          });
        }
      },
    }, w);
    wrap.append(b);
  });
  stage.append(wrap);
}

export default engineFrom(renderChoice);
