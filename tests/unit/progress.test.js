import { describe as group, it, expect } from 'vitest';
import { periodStart, describe, groupByActivity, itemSummary, series, laterResult, suggestNext, topicsExplored } from '../../src/core/progress.js';

const app = {
  modules: [
    { id: 'abc', title: { en: 'ABC' }, activities: [
      { id: 'learn', title: { en: 'Learn ABC' }, engine: 'learnCards' },
      { id: 'find', title: { en: 'Find the Letter' }, engine: 'spaceFind' },
      { id: 'train', title: { en: 'Choo-Choo ABC' }, engine: 'dragToSlot' }] },
    { id: 'money', title: { en: 'Money' }, activities: [{ id: 'know', title: { en: 'Know Your Money' }, engine: 'shopScene' }] },
    { id: 'space', comingSoon: true, title: { en: 'Space' }, activities: [] },
  ],
};
const DAY = 86400000;
const now = new Date('2026-11-27T12:00:00').getTime();
const rec = (module, activity, score, daysAgo, extra = {}) => ({ module, activity, title: `${module} – ${activity}`, score, correct: score / 10, total: 10, timestamp: now - daysAgo * DAY, ...extra });

group('progress', () => {
  it('periods start at midnight', () => {
    expect(periodStart('all', now)).toBe(0);
    expect(new Date(periodStart('7', now)).getDate()).toBe(21);
    expect(new Date(periodStart('7', now)).getHours()).toBe(0);
  });
  it('learn cards and colouring are Completed, games are scored; old unknown records still readable', () => {
    expect(describe(rec('abc', 'learn', 100, 0), app).scored).toBe(false);
    expect(describe(rec('abc', 'find', 70, 0), app).scored).toBe(true);
    const old = describe({ module: 'gone', activity: 'x', total: 10, score: 50, timestamp: 1 }, app);
    expect(old).toMatchObject({ scored: true, route: null });
  });
  it('groups by activity, newest first, with counts', () => {
    const g = groupByActivity([rec('abc', 'find', 60, 3), rec('money', 'know', 70, 1), rec('abc', 'find', 90, 0)], app);
    expect(g.map((x) => x.key)).toEqual(['abc/find', 'money/know']);
    expect(g[0].latest.score).toBe(90);
    expect(g[0].rows).toHaveLength(2);
  });
  it('item summary only when items were saved', () => {
    expect(itemSummary(rec('abc', 'find', 70, 0))).toBeNull();
    const s = itemSummary({ items: [{ label: 'Q', result: 'first' }, { label: 'B', result: 'retry' }, { label: 'B', result: 'retry' }, { label: 'D', result: 'wrong' }] });
    expect(s).toEqual({ first: 1, retry: 2, wrong: 1, practise: ['B', 'D'] });
  });
  it('series and "remembered later" need a later day', () => {
    const pts = series([rec('abc', 'find', 90, 0), rec('abc', 'find', 60, 2)]);
    expect(pts.map((p) => p.score)).toEqual([60, 90]);
    expect(laterResult(pts)).toMatchObject({ first: { score: 60 }, last: { score: 90 } });
    expect(laterResult(series([rec('abc', 'find', 60, 0), rec('abc', 'find', 90, 0)]))).toBeNull();
    expect(laterResult(series([rec('abc', 'find', 60, 0)]))).toBeNull();
  });
  it('try next: lowest latest score under 80, with items needing another try', () => {
    const rows = [rec('money', 'know', 70, 0, { items: [{ label: '10 sen', result: 'retry' }] }), rec('abc', 'find', 93, 0), rec('abc', 'learn', 100, 0)];
    const s = suggestNext(rows, app);
    expect(s.kind).toBe('practise');
    expect(s.group.key).toBe('money/know');
    expect(s.items).toEqual(['10 sen']);
  });
  it('try next: improved later result is not suggested; then something new; then start', () => {
    const s = suggestNext([rec('abc', 'find', 90, 0), rec('abc', 'find', 50, 2)], app);
    expect(s.kind).toBe('new');
    expect(s.group.act.id).toBe('train'); // first scored activity not tried
    expect(suggestNext([], app)).toMatchObject({ kind: 'start', group: { act: { id: 'learn' } } });
  });
  it('topics explored counts modules', () => {
    const tps = topicsExplored([rec('abc', 'find', 90, 0), rec('abc', 'learn', 100, 0), rec('money', 'know', 70, 0)], app);
    expect(tps.map((x) => [x.id, x.n])).toEqual([['abc', 2], ['money', 1]]);
  });
});
