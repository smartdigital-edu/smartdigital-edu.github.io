/**
 * Grammar Hub app config. Each topic = lesson page -> choose 5/10/20/40
 * questions -> mixed quiz. Topic content lives in /src/content/grammarhub/<id>.json
 * (lesson + question bank). Questions are filtered by the learner's year level.
 */
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/700.css';
import { filterByLevel } from '../../core/scoring.js';

const files = import.meta.glob('../../content/grammarhub/*.json');
const loadTopic = async (id) => (await files[`../../content/grammarhub/${id}.json`]()).default;

const TOPICS = [
  ['nouns', 'Nouns', '🏷️', '#0B63CE', 'Naming words'],
  ['pronouns', 'Pronouns', '🙋', '#2E7D32', 'I, you, he, she, it, we, they'],
  ['verbs', 'Verbs', '🏃', '#C62828', 'Action words'],
  ['adjectives', 'Adjectives', '🎨', '#6A1B9A', 'Describing words'],
  ['prepositions', 'Prepositions', '📦', '#EF6C00', 'in, on, under, behind…'],
  ['conjunctions', 'Conjunctions', '🔗', '#00838F', 'and, but, or, because, so'],
  ['articles', 'Articles', '🅰️', '#AD1457', 'a, an, the'],
  ['simple-present', 'Simple Present', '⏰', '#1565C0', 'Every day, always, usually'],
  ['simple-past', 'Simple Past', '⏪', '#4E342E', 'Yesterday, last week, ago'],
  ['singular-plural', 'Singular & Plural', '👥', '#558B2F', 'one cat, two cats'],
  ['demonstratives', 'This / That / These / Those', '👉', '#5D4037', 'Pointing words'],
  ['spelling', 'Spelling', '🔊', '#283593', 'Listen and spell'],
  ['build-sentence', 'Build Sentence', '🧱', '#00695C', 'Put words in order'],
];

export default {
  id: 'grammarhub',
  name: 'Grammar Hub',
  bilingual: false,
  kids: false,
  heroEmoji: '📘',
  avatars: ['🧑‍🎓', '👦', '👧', '🧒', '🦉', '🐯', '🐼', '🚀', '⚽', '🎨', '📚', '🌟'],
  levels: [1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: `Year ${n}` })),
  modules: TOPICS.map(([id, title, emoji, color, subtitle]) => ({
    id, title, emoji, color, subtitle,
    direct: 'lesson',
    activities: [
      {
        id: 'lesson', title, emoji, engine: 'lessonPage',
        async build() {
          const t = await loadTopic(id);
          return { lesson: t.lesson, quizHref: `/play/${id}/quiz` };
        },
      },
      {
        id: 'quiz', title: `${title} Quiz`, emoji, engine: 'quiz',
        async build({ profile }) {
          const t = await loadTopic(id);
          // Order: questions at/below the learner's year first, then harder ones.
          const questions = filterByLevel(t.questions, profile?.level ?? 6);
          return { questions, keepOrder: true, countOptions: [5, 10, 20, 40], retry: false };
        },
      },
    ],
  })),
};
