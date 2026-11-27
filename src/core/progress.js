/**
 * Learning Progress: turns saved attempts into what a parent wants to know.
 * Pure functions (no DOM) so they can be unit-tested.
 *
 * Attempt records (newest fields are optional, older records lack them):
 *   { module, activity, title, correct, total, score, duration, timestamp,
 *     engine?, lang?, items?: [{ label, result: 'first' | 'retry' | 'wrong' }] }
 * "score" = questions answered correctly on the first try, as a whole-number %.
 */
import { amountWords, formatAmount } from '../games/money.js';

/** Activities that are explored rather than scored: shown as "Completed". */
export const UNSCORED_ENGINES = new Set(['learnCards', 'colouring', 'lessonPage']);
/** An activity whose best score is below this is a good one to practise. */
export const PRACTISE_BELOW = 80;
/** A latest score this far below the best gets a gentle "scores can dip" note. */
export const DIP_POINTS = 30;

const DAY = 86400000;

/** Start time of a period: '7', '30' or 'all'. */
export function periodStart(period, now = Date.now()) {
  const days = Number(period);
  if (!days) return 0;
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime() - (days - 1) * DAY;
}

export const dayKey = (t) => new Date(t).toDateString();

/** What a record is: its module/activity in the app config, whether it is scored, and its route. */
export function describe(r, app) {
  const mod = app.modules.find((m) => m.id === r.module);
  const act = mod?.activities.find((a) => a.id === r.activity);
  const engine = r.engine || act?.engine;
  const scored = engine ? !UNSCORED_ENGINES.has(engine) : (r.total || 0) > 1; // unknown old record: guess
  return {
    key: `${r.module}/${r.activity}`,
    mod,
    act,
    scored,
    route: mod && act && !mod.comingSoon ? `#/play/${mod.id}/${act.id}` : null,
  };
}

/**
 * One entry per activity, most recently played first:
 * { key, mod, act, scored, route, latest, best, rows (newest first) }.
 */
export function groupByActivity(rows, app) {
  const groups = new Map();
  [...rows].sort((a, b) => b.timestamp - a.timestamp).forEach((r) => {
    const info = describe(r, app);
    if (!groups.has(info.key)) groups.set(info.key, { ...info, latest: r, best: r, rows: [] });
    const g = groups.get(info.key);
    g.rows.push(r);
    if ((r.score ?? -1) > (g.best.score ?? -1)) g.best = r;
  });
  return [...groups.values()];
}

/* ---------- short skill labels for missed questions ---------- */

let amountIndex;
/** Every spoken amount ("one hundred ringgit", "dua puluh sen"…) → "RM100", "20 sen"; longest first. */
function amounts() {
  if (!amountIndex) {
    const pairs = [];
    for (let sen = 1; sen <= 10000; sen += 1) {
      for (const lang of ['en', 'ms']) pairs.push([amountWords(sen, lang).toLowerCase(), formatAmount(sen)]);
    }
    amountIndex = pairs.sort((a, b) => b[0].length - a[0].length);
  }
  return amountIndex;
}

/**
 * A short label for a question a child missed: amounts become "RM100" / "20 sen",
 * "Find the letter B" becomes "B", other text loses its trailing "?" / "!".
 */
export function skillLabel(text) {
  const s = String(text ?? '').trim();
  if (!s) return '';
  const lower = s.toLowerCase();
  if (/\b(ringgit|sen)\b/.test(lower)) {
    for (const [words, short] of amounts()) {
      const i = lower.indexOf(words);
      if (i < 0) continue;
      const before = lower[i - 1];
      const after = lower[i + words.length];
      if ((!before || !/[a-z-]/.test(before)) && (!after || !/[a-z-]/.test(after))) return short;
    }
  }
  const written = s.match(/\bRM\s?\d+(?:\.\d{2})?\b|\b\d{1,2}\s?sen\b/i); // already short: "RM5", "20 sen"
  if (written) return written[0].replace(/^rm\s?/i, 'RM').replace(/(\d)\s?sen/i, '$1 sen');
  const find = s.match(/^(?:find|cari)\s+(?:the\s+|all the\s+|semua\s+)?(?:letter|number|colour|huruf|nombor|warna)\s+(.+?)[?!.]*$/i);
  if (find) return find[1];
  return s.replace(/[\s?!.,]+$/, '');
}

/** Item summary of one attempt (only for records that saved items). `practise` = unique short labels. */
export function itemSummary(r) {
  if (!Array.isArray(r.items) || !r.items.length) return null;
  const count = (k) => r.items.filter((i) => i.result === k).length;
  const practise = [...new Set(r.items.filter((i) => i.result !== 'first').map((i) => skillLabel(i.label)).filter(Boolean))];
  return { first: count('first'), retry: count('retry'), wrong: count('wrong'), practise };
}

/** "a, b and c" (or "a, b dan c"). */
export function joinList(list, and = 'and') {
  if (list.length <= 1) return list.join('');
  return `${list.slice(0, -1).join(', ')} ${and} ${list[list.length - 1]}`;
}

/* ---------- progress over time ---------- */

/** Scores of one activity in time order. */
export function series(rows) {
  return rows.filter((r) => typeof r.score === 'number').sort((a, b) => a.timestamp - b.timestamp)
    .map((r) => ({ t: r.timestamp, score: r.score, correct: r.correct, total: r.total }));
}

/** The chart only makes sense across different days; otherwise show a same-day summary. */
export const distinctDays = (points) => new Set(points.map((p) => dayKey(p.t))).size;

/**
 * Axis label kind for each point: the first point of a day shows the date,
 * later points on the same day show the time, so a date never repeats.
 */
export function axisLabels(points) {
  const seen = new Set();
  return points.map((p) => {
    const k = dayKey(p.t);
    if (seen.has(k)) return 'time';
    seen.add(k);
    return 'date';
  });
}

/** Best and latest score, and whether the latest is well below the best (a gentle note, never "dropped"). */
export function bestAndLatest(points) {
  if (!points.length) return null;
  const best = Math.max(...points.map((p) => p.score));
  const latest = points[points.length - 1].score;
  return { best, latest, dip: best - latest >= DIP_POINTS };
}

/** First and latest result when the activity was played again on a later day (what they remember later). */
export function laterResult(points) {
  if (points.length < 2) return null;
  const first = points[0];
  const last = points[points.length - 1];
  return dayKey(first.t) === dayKey(last.t) ? null : { first, last };
}

/* ---------- Try next ---------- */

/**
 * The "Try next" suggestion.
 *  practise: the scored activity with the lowest BEST score under PRACTISE_BELOW
 *            (so one rushed try doesn't decide it alone); details come from its latest try
 *  new:      every best score is fine, so a scored activity not tried in this period
 *  keep:     everything has been tried and is fine
 *  start:    nothing played yet
 */
export function suggestNext(rowsInPeriod, app, { show = 4 } = {}) {
  const groups = groupByActivity(rowsInPeriod, app).filter((g) => g.route);
  const scored = groups.filter((g) => g.scored);
  const weak = scored.filter((g) => g.best.score < PRACTISE_BELOW)
    .sort((a, b) => a.best.score - b.best.score || b.latest.timestamp - a.latest.timestamp)[0];
  if (weak) {
    const missed = itemSummary(weak.latest)?.practise || [];
    return { kind: 'practise', group: weak, items: missed.slice(0, show), more: Math.max(0, missed.length - show) };
  }
  const playable = app.modules.filter((m) => !m.comingSoon)
    .flatMap((m) => m.activities.map((a) => ({ mod: m, act: a, scored: !UNSCORED_ENGINES.has(a.engine), route: `#/play/${m.id}/${a.id}` })));
  if (!rowsInPeriod.length) {
    const first = playable[0];
    return first ? { kind: 'start', group: first } : null;
  }
  const tried = new Set(groups.map((g) => `${g.mod.id}/${g.act.id}`));
  const fresh = playable.find((p) => p.scored && !tried.has(`${p.mod.id}/${p.act.id}`));
  if (fresh) return { kind: 'new', group: fresh };
  const lowest = [...scored].sort((a, b) => a.best.score - b.best.score)[0];
  return lowest ? { kind: 'keep', group: lowest } : null;
}

/** Modules tried in the period (most played first). */
export function topicsExplored(rows, app) {
  const counts = new Map();
  rows.forEach((r) => {
    const { mod } = describe(r, app);
    const id = mod?.id || r.module;
    const label = mod ? null : String(r.title || r.module || '').split(' – ')[0]; // module no longer in the app
    counts.set(id, { mod, id, label, n: (counts.get(id)?.n || 0) + 1 });
  });
  return [...counts.values()].sort((a, b) => b.n - a.n);
}
