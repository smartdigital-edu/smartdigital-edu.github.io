/**
 * Shared question runner used by every quiz-style engine.
 * Handles: randomised order, question counter, progress bar, star score,
 * feedback (sound + icon + text, never colour alone), shake on wrong,
 * celebration on correct, explanations, and reporting the final result.
 *
 * An engine supplies render(q, view, ctx):
 *   view = { prompt, stage }           DOM containers to fill
 *   ctx.setPrompt(text, opts)          show + speak the instruction
 *   ctx.attempt(ok, node, info)        judge one answer; returns true when the question is over
 *   ctx.complete({ correct, total })   finish a multi-part round (match lines, sorting…)
 *
 * Each question is also recorded for the parent's progress page as { label, result }:
 * result 'first' (right first time), 'retry' (right after another try) or 'wrong' (single-attempt mode).
 *   ctx.once                           true = single attempt per question (Grammar Hub)
 */
import { el, clear, animate, button, visual } from '../core/ui.js';
import { shuffle } from '../core/scoring.js';

export function runQuestions(root, config, render, api) {
  const once = config.retry === false || (!api.kids && config.retry !== true);
  const pool = config.keepOrder ? [...config.questions] : shuffle(config.questions);
  const questions = pool.slice(0, config.count || pool.length);
  const unitKey = config.unit === 'round' ? 'game.round' : 'game.question';
  let index = 0;
  let correct = 0;
  let total = 0;
  const items = [];

  const counter = el('span.game-counter', { 'aria-live': 'polite' });
  const starEl = el('span.game-stars', { 'aria-label': 'score' });
  const bar = el('span');
  const prompt = el('div.prompt');
  const stage = el('div.stage');
  const feedback = el('div.feedback', { role: 'status', 'aria-live': 'assertive' });
  const after = el('div.after');
  root.append(el('div.game', {},
    el('div.game-bar', {}, counter, starEl),
    el('div.progress', { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': questions.length }, bar),
    prompt, stage, feedback, after));

  function updateBar() {
    counter.textContent = api.t(unitKey, { n: Math.min(index + 1, questions.length), total: questions.length });
    starEl.textContent = `⭐ ${correct}`;
    bar.style.width = `${(index / questions.length) * 100}%`;
    bar.parentElement.setAttribute('aria-valuenow', index);
  }

  function next() {
    if (index >= questions.length) {
      bar.style.width = '100%';
      api.finish({ correct, total, items });
      return;
    }
    updateBar();
    clear(prompt); clear(stage); clear(after);
    feedback.className = 'feedback';
    feedback.textContent = '';
    const q = questions[index];
    let missed = false;
    let finished = false;
    let promptText = '';

    const end = (res, result) => {
      if (finished) return;
      finished = true;
      const plain = typeof q.answer === 'string' ? q.answer : null; // letter/number ids (not option indexes)
      const label = res.answerText || q.target || plain || q.item || promptText;
      items.push({ label: String(api.tx(label) ?? '').slice(0, 60), result });
      correct += res.correct;
      total += res.total;
      starEl.textContent = `⭐ ${correct}`;
      index += 1;
      if (once && (q.explanation || res.answerText)) {
        const nextBtn = button(index >= questions.length ? api.t('game.finish') : api.t('game.next'), { icon: '➜', onClick: next });
        after.append(
          q.explanation || res.answerText ? el('div.explain', {},
            res.correct < res.total && res.answerText ? el('strong', api.t('game.answerWas', { answer: res.answerText })) : null,
            q.explanation ? el('span', `${api.t('game.explanation')} ${api.tx(q.explanation)}`) : null) : null,
          el('div.next-row', {}, nextBtn));
        nextBtn.focus();
      } else {
        setTimeout(next, res.correct ? 1100 : 1500);
      }
    };

    const ctx = {
      once,
      api,
      setPrompt(text, { say, visual: v, size = 'lg', label } = {}) {
        clear(prompt);
        promptText = text || '';
        const spoken = say ?? text;
        if (v != null) prompt.append(visual(v, { size, label }));
        if (text) prompt.append(el('span.prompt-text', text));
        if (spoken) {
          prompt.append(button('', { variant: 'secondary small say-btn', icon: '🔊', aria: api.t('game.listen'), onClick: () => api.speak(spoken) }));
          if (api.kids) api.speak(spoken);
        }
      },
      attempt(ok, node, info = {}) {
        if (finished) return true;
        if (ok) {
          api.sfx.correct();
          animate(node, 'celebrate', 700);
          showFeedback(true, info);
          end({ correct: once ? 1 : missed ? 0 : 1, total: 1, answerText: info.answerText }, missed && !once ? 'retry' : 'first');
          return true;
        }
        api.sfx.wrong();
        animate(node, 'shake', 500);
        missed = true;
        if (once) {
          showFeedback(false, info);
          end({ correct: 0, total: 1, answerText: info.answerText }, 'wrong');
          return true;
        }
        showFeedback(false, { tryAgain: true });
        return false;
      },
      wrong(node) { // a wrong move inside a multi-part round
        missed = true;
        api.sfx.wrong();
        animate(node, 'shake', 500);
        showFeedback(false, { tryAgain: true });
      },
      right(node) { // a right move inside a multi-part round
        api.sfx.correct();
        animate(node, 'celebrate', 700);
        feedback.className = 'feedback';
      },
      complete(res) {
        api.sfx.correct();
        showFeedback(res.correct >= res.total * 0.5, {});
        end(res, res.correct >= res.total ? 'first' : once ? 'wrong' : 'retry');
      },
    };

    function showFeedback(ok, { tryAgain } = {}) {
      feedback.className = `feedback show ${ok ? 'ok' : 'bad'}`;
      const text = ok ? api.t(api.kids ? 'game.great' : 'game.correct') : api.t(tryAgain ? 'game.tryAgain' : 'game.wrong');
      feedback.textContent = `${ok ? '✔' : '✖'} ${text}`;
      if (api.kids && (ok || tryAgain)) setTimeout(() => api.speak(text), 350);
    }

    render(q, { prompt, stage, after }, ctx);
  }

  next();
}

/** Default export helper: wrap a render function as an engine. */
export const engineFrom = (render, defaults = {}) => (root, config, api) => runQuestions(root, { ...defaults, ...config }, render, api);
