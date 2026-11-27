/**
 * Learning Progress: turns saved attempts into what a parent wants to know.
 * Pure functions (no DOM) so they can be unit-tested.
 *
 * Attempt records (newest fields are optional, older records lack them):
 *   { module, activity, title, correct, total, score, duration, timestamp,
 *     engine?, lang?, items?: [{ label, result: 'first' | 'retry' | 'wrong' }] }
 */

/** Activities that are explored rather than scored: shown as "Completed". */
export const UNSCORED_ENGINES = new Set(['learnCards', 'colouring', 'lessonPage']);
/** Below this latest score an activity is a good one to practise. */
export const PRACTISE_BELOW = 80;

const DAY = 86400000;

/** Start time of a period: '7', '30' or 'all'. */
export function periodStart(period, now = Date.now()) {
  const days = Number(period);
  if (!days) return 0;
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime() - (days - 1) * DAY;
}

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

/** One entry per activity, most recently played first: latest record, all records (newest first), count. */
export function groupByActivity(rows, app) {
  const groups = new Map();
  [...rows].sort((a, b) => b.timestamp - a.timestamp).forEach((r) => {
    const info = describe(r, app);
    if (!groups.has(info.key)) groups.set(info.key, { ...info, latest: r, rows: [] });
    groups.get(info.key).rows.push(r);
  });
  return [...groups.values()];
}

/** Item summary of one attempt (only for records that saved items). */
export function itemSummary(r) {
  if (!Array.isArray(r.items) || !r.items.length) return null;
  const count = (k) => r.items.filter((i) => i.result === k).length;
  const practise = [...new Set(r.items.filter((i) => i.result !== 'first').map((i) => i.label).filter(Boolean))];
  return { first: count('first'), retry: count('retry'), wrong: count('wrong'), practise };
}

/** Scores of one activity in time order, for the chart. */
export function series(rows) {
  return rows.filter((r) => typeof r.score === 'number').sort((a, b) => a.timestamp - b.timestamp)
    .map((r) => ({ t: r.timestamp, score: r.score, correct: r.correct, total: r.total }));
}

const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

/** First and latest result when the activity was played again on a later day (what they remember later). */
export function laterResult(points) {
  if (points.length < 2) return null;
  const first = points[0];
  const last = points[points.length - 1];
  return sameDay(first.t, last.t) ? null : { first, last };
}

/**
 * The "Try next" suggestion.
 *  practise: the scored activity with the lowest latest result under PRACTISE_BELOW
 *  new:      every result is fine, so an activity not tried in this period
 *  keep:     everything has been tried and is fine
 *  start:    nothing played yet
 */
export function suggestNext(rowsInPeriod, app) {
  const groups = groupByActivity(rowsInPeriod, app).filter((g) => g.route);
  const weak = groups.filter((g) => g.scored && g.latest.score < PRACTISE_BELOW)
    .sort((a, b) => a.latest.score - b.latest.score || b.latest.timestamp - a.latest.timestamp)[0];
  if (weak) return { kind: 'practise', group: weak, items: itemSummary(weak.latest)?.practise.slice(0, 4) || [] };

  const playable = app.modules.filter((m) => !m.comingSoon)
    .flatMap((m) => m.activities.map((a) => ({ mod: m, act: a, scored: !UNSCORED_ENGINES.has(a.engine), route: `#/play/${m.id}/${a.id}` })));
  if (!rowsInPeriod.length) {
    const first = playable[0];
    return first ? { kind: 'start', group: first } : null;
  }
  const tried = new Set(groups.map((g) => `${g.mod.id}/${g.act.id}`));
  const fresh = playable.find((p) => p.scored && !tried.has(`${p.mod.id}/${p.act.id}`));
  if (fresh) return { kind: 'new', group: fresh };
  const lowest = groups.filter((g) => g.scored).sort((a, b) => a.latest.score - b.latest.score)[0];
  return lowest ? { kind: 'keep', group: lowest } : null;
}

/** Modules tried in the period, with how many times. */
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
