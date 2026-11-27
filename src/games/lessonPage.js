/**
 * lessonPage – title, explanation, key points, examples with audio, then "Start Quiz".
 * Config JSON: { intro, points: [..], examples: [{ text, note }], tip?, quizHref }
 * Words wrapped in [[double brackets]] are highlighted.
 */
import { el, button } from '../core/ui.js';

const rich = (s) => {
  const node = el('span');
  String(s).split(/(\[\[.+?\]\])/).forEach((p) => node.append(p.startsWith('[[') ? el('mark', p.slice(2, -2)) : p));
  return node;
};
const plain = (s) => String(s).replace(/\[\[|\]\]/g, '');

export default function lessonPage(root, config, api) {
  const l = config.lesson;
  root.append(el('article.card.lesson', {},
    el('p.lesson-intro', rich(l.intro)),
    button(api.t('game.listen'), { variant: 'secondary small', icon: '🔊', onClick: () => api.speak(plain(l.intro)) }),
    el('ul.lesson-points', {}, l.points.map((p) => el('li', rich(p)))),
    el('h2', api.t('game.lessonExamples')),
    l.examples.map((ex) => el('div.example', {},
      el('div.text', rich(ex.text), ex.note ? el('span.note', ex.note) : null),
      button('', { variant: 'secondary small', icon: '🔊', aria: `${api.t('game.listen')}: ${plain(ex.text)}`, onClick: () => api.speak(plain(ex.text)) }))),
    l.tip ? el('p.explain', el('strong', '💡 Tip'), rich(l.tip)) : null,
    el('div.next-row', { style: { marginTop: '1rem' } },
      button(api.t('game.startQuiz'), { icon: '🚀', onClick: () => api.navigate(config.quizHref) }))));
}
