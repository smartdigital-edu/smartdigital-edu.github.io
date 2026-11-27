/**
 * Pure helpers for scoring, shuffling and answer checking.
 * Kept free of DOM access so they are easy to unit test.
 */

/** Percentage 0–100, rounded. total 0 -> 0. */
export function percent(correct, total) {
  if (!total || total < 0) return 0;
  const c = Math.max(0, Math.min(correct, total));
  return Math.round((c / total) * 100);
}

/** 3 stars >= 80%, 2 stars >= 50%, otherwise 1 star (always reward effort). */
export function starsFor(pct) {
  if (pct >= 80) return 3;
  if (pct >= 50) return 2;
  return 1;
}

/** Fisher–Yates shuffle returning a NEW array. rng injectable for tests. */
export function shuffle(list, rng = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Shuffle, but make sure the result differs from the input order when possible. */
export function shuffleDifferent(list, rng = Math.random) {
  if (list.length < 2) return [...list];
  for (let tries = 0; tries < 10; tries += 1) {
    const s = shuffle(list, rng);
    if (s.some((v, i) => v !== list[i])) return s;
  }
  return [...list.slice(1), list[0]];
}

/** Pick n random distinct items. */
export function sample(list, n, rng = Math.random) {
  return shuffle(list, rng).slice(0, Math.max(0, n));
}

/** Normalise text answers: trim, collapse spaces, lower-case, unify quotes. */
export function normalise(value) {
  return String(value ?? '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Normalise a sentence and drop the final punctuation for comparison. */
export function normaliseSentence(value) {
  return normalise(value).replace(/\s*([.,!?])\s*/g, '$1 ').replace(/[.!?]\s*$/, '').trim();
}

/**
 * Check a learner's answer against a question.
 *  - string / number answers compared after normalise()
 *  - array answers (ordered sequences, e.g. sentence words) compared item by item
 *  - q.accept: optional list of alternative correct answers
 */
export function checkAnswer(q, given) {
  const expected = q.answer;
  if (Array.isArray(expected)) {
    if (!Array.isArray(given) || given.length !== expected.length) return false;
    return expected.every((v, i) => normalise(v) === normalise(given[i]));
  }
  if (q.type === 'build') return normaliseSentence(given) === normaliseSentence(expected);
  const ok = normalise(given) === normalise(expected);
  if (ok) return true;
  return Array.isArray(q.accept) && q.accept.some((a) => normalise(a) === normalise(given));
}

/** Build the attempt record saved to scores. */
export function buildAttempt({ profileId, app, module, activity, title, correct, total, startedAt, endedAt = Date.now(), engine, lang, items }) {
  const extra = {};
  if (engine) extra.engine = engine;
  if (lang) extra.lang = lang;
  // Per-question detail for the progress page (kept small).
  if (Array.isArray(items) && items.length) extra.items = items.slice(0, 40).map(({ label, result }) => ({ label: String(label ?? '').slice(0, 60), result }));
  return {
    profileId,
    app,
    module,
    activity,
    title: title || `${module} – ${activity}`,
    correct,
    total,
    score: percent(correct, total),
    duration: Math.max(0, Math.round((endedAt - startedAt) / 1000)),
    timestamp: endedAt,
    ...extra,
  };
}

/** Pick questions for a learner's level: prefer year <= level, top up with others. */
export function filterByLevel(questions, level, count, rng = Math.random) {
  const lvl = Number(level) || 6;
  const fit = shuffle(questions.filter((q) => (q.year ?? 1) <= lvl), rng);
  const rest = shuffle(questions.filter((q) => (q.year ?? 1) > lvl), rng)
    .sort((a, b) => (a.year ?? 1) - (b.year ?? 1));
  return [...fit, ...rest].slice(0, count ?? questions.length);
}

/** mm:ss from seconds. */
export function formatDuration(seconds) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
