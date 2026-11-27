/**
 * buildSentence – tap (or drag) shuffled words into the right order, then "Check Answer".
 * Question JSON: { answer: "The cat is sleeping.", prompt?, distractors?: ["is"] , explanation? }
 */
import { el, button } from '../core/ui.js';
import { shuffleDifferent, checkAnswer } from '../core/scoring.js';
import { engineFrom } from './runner.js';
import { createDnD } from './dnd.js';

export const splitWords = (sentence) => sentence.trim().split(/\s+/);

export function renderBuild(q, { stage }, ctx) {
  const { api } = ctx;
  ctx.setPrompt(api.tx(q.prompt || 'Put the words in the correct order.'), { say: q.say ? api.tx(q.say) : '' });
  const words = splitWords(q.answer);
  const line = el('div.tile-bank.sentence-line', { role: 'group', 'aria-label': api.t('game.yourSentence'), style: { background: '#fff', border: '3px dashed var(--border)', minHeight: '80px' } });
  const bank = el('div.tile-bank', { role: 'group', 'aria-label': api.t('game.wordBank') });
  const move = (tile) => {
    (tile.parentElement === line ? bank : line).append(tile);
    api.sfx.tap();
  };
  const dnd = createDnD({
    onDrop: (tile, target) => { if (tile.parentElement !== target) target.append(tile); },
    onTapTile: (tile) => { move(tile); return true; },
  });
  dnd.target(line);
  dnd.target(bank);
  shuffleDifferent([...words, ...(q.distractors || [])]).forEach((w, i) => {
    const t = el('button.tile', { type: 'button', style: { fontSize: '1.2rem' } }, w);
    dnd.tile(t, `${w}#${i}`);
    bank.append(t);
  });
  const checkBtn = button(api.t('game.check'), {
    icon: '✔',
    onClick: () => {
      const given = [...line.querySelectorAll('.tile')].map((t) => t.textContent).join(' ');
      const ok = checkAnswer({ type: 'build', answer: q.answer }, given);
      const over = ctx.attempt(ok, line, { answerText: q.answer });
      if (over) { checkBtn.disabled = true; stage.querySelectorAll('.tile').forEach((t) => { t.disabled = true; }); }
    },
  });
  stage.append(el('p.label', api.t('game.yourSentence')), line, el('p.label', api.t('game.wordBank')), bank, el('div.next-row', { style: { marginTop: '1rem' } }, checkBtn));
}

export default engineFrom(renderBuild);
