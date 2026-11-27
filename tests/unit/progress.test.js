import { describe as group, it, expect } from 'vitest';
import {
  periodStart, describe, groupByActivity, itemSummary, skillLabel, joinList, series, distinctDays, axisLabels,
  bestAndLatest, laterResult, suggestNext, topicsExplored,
} from '../../src/core/progress.js';

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
const HOUR = 3600000;
const now = new Date('2026-11-27T15:00:00').getTime();
const rec = (module, activity, score, ago, extra = {}) => ({ module, activity, title: `${module} – ${activity}`, score, correct: score / 10, total: 10, timestamp: now - ago, ...extra });
const missed = (...labels) => labels.map((label) => ({ label, result: 'retry' }));

group('progress data', () => {
  it('periods start at midnight', () => {
    expect(periodStart('all', now)).toBe(0);
    expect(new Date(periodStart('7', now)).getDate()).toBe(21);
    expect(new Date(periodStart('7', now)).getHours()).toBe(0);
  });
  it('learn cards and colouring are Completed, games scored; old unknown records still readable', () => {
    expect(describe(rec('abc', 'learn', 100, 0), app).scored).toBe(false);
    expect(describe(rec('abc', 'find', 70, 0), app).scored).toBe(true);
    expect(describe({ module: 'gone', activity: 'x', total: 10, score: 50, timestamp: 1 }, app)).toMatchObject({ scored: true, route: null });
  });
  it('one group per activity with best and latest', () => {
    const g = groupByActivity([rec('money', 'know', 70, 2 * HOUR), rec('money', 'know', 10, HOUR), rec('abc', 'find', 90, 3 * DAY)], app);
    expect(g.map((x) => x.key)).toEqual(['money/know', 'abc/find']);
    expect(g[0]).toMatchObject({ latest: { score: 10 }, best: { score: 70 } });
    expect(g[0].rows).toHaveLength(2);
  });
});

group('short skill labels', () => {
  it('turns money questions into amounts (EN and BM)', () => {
    expect(skillLabel('Which one is one hundred ringgit?')).toBe('RM100');
    expect(skillLabel('Which one is twenty sen?')).toBe('20 sen');
    expect(skillLabel('Which one is ten sen?')).toBe('10 sen');
    expect(skillLabel('Which one is one ringgit fifty sen?')).toBe('RM1.50');
    expect(skillLabel('Which one is twenty-one ringgit?')).toBe('RM21');
    expect(skillLabel('Mana satu dua puluh sen?')).toBe('20 sen');
    expect(skillLabel('RM5')).toBe('RM5');
    expect(skillLabel('Which one is RM5?')).toBe('RM5');
    expect(skillLabel('Pay 20 sen!')).toBe('20 sen');
  });
  it('finds the letter and drops trailing punctuation otherwise', () => {
    expect(skillLabel('Find the letter B')).toBe('B');
    expect(skillLabel('Find all the Qs')).toBe('Find all the Qs');
    expect(skillLabel('Which one is more money?')).toBe('Which one is more money');
  });
  it('item summary uses short, unique labels', () => {
    expect(itemSummary(rec('abc', 'find', 70, 0))).toBeNull();
    const s = itemSummary({ items: [{ label: 'Q', result: 'first' }, ...missed('Which one is ten sen?', 'Which one is ten sen?'), { label: 'D', result: 'wrong' }] });
    expect(s).toEqual({ first: 1, retry: 2, wrong: 1, practise: ['10 sen', 'D'] });
  });
  it('joins with commas and "and" (no "?,")', () => {
    expect(joinList(['RM100', 'RM50', 'RM5', '20 sen'])).toBe('RM100, RM50, RM5 and 20 sen');
    expect(joinList(['a', 'b'], 'dan')).toBe('a dan b');
    expect(joinList(['a'])).toBe('a');
  });
});

group('progress over time', () => {
  it('same-day tries are not a chart; their extra points are labelled with the time', () => {
    const pts = series([rec('money', 'know', 10, HOUR), rec('money', 'know', 70, 2 * HOUR)]);
    expect(pts.map((p) => p.score)).toEqual([70, 10]);
    expect(distinctDays(pts)).toBe(1);
    expect(axisLabels(pts)).toEqual(['date', 'time']);
    expect(laterResult(pts)).toBeNull();
  });
  it('best and latest, with a gentle note only for a dip of 30+ points', () => {
    expect(bestAndLatest(series([rec('money', 'know', 70, 2 * HOUR), rec('money', 'know', 10, HOUR)]))).toEqual({ best: 70, latest: 10, dip: true });
    expect(bestAndLatest(series([rec('money', 'know', 70, 2 * HOUR), rec('money', 'know', 50, HOUR)])).dip).toBe(false);
  });
  it('a later day counts as "played again"', () => {
    const pts = series([rec('abc', 'find', 90, 0), rec('abc', 'find', 60, 2 * DAY)]);
    expect(distinctDays(pts)).toBe(2);
    expect(laterResult(pts)).toMatchObject({ first: { score: 60 }, last: { score: 90 } });
  });
});

group('try next', () => {
  it('picks the lowest BEST score; details come from the latest try; "+ n more"', () => {
    const rows = [
      rec('money', 'know', 10, HOUR, { correct: 1, items: missed('Which one is one hundred ringgit?', 'Which one is fifty ringgit?', 'Which one is five ringgit?', 'Which one is twenty sen?', 'Which one is ten sen?', 'Which one is one ringgit?') }),
      rec('money', 'know', 70, 2 * HOUR),
      rec('abc', 'find', 60, 3 * HOUR), // best 60 < money's best 70
    ];
    expect(suggestNext(rows, app)).toMatchObject({ kind: 'practise', group: { key: 'abc/find' } });
    const s = suggestNext(rows.slice(0, 2), app);
    expect(s).toMatchObject({ kind: 'practise', group: { key: 'money/know' }, items: ['RM100', 'RM50', 'RM5', '20 sen'], more: 2 });
  });
  it('one rushed try does not decide it when the best is fine; then new, then start', () => {
    const s = suggestNext([rec('abc', 'find', 20, HOUR), rec('abc', 'find', 90, 2 * HOUR)], app);
    expect(s.kind).toBe('new');
    expect(s.group.act.id).toBe('train');
    expect(suggestNext([], app)).toMatchObject({ kind: 'start', group: { act: { id: 'learn' } } });
  });
  it('ignores Completed (unscored) activities', () => {
    expect(suggestNext([rec('abc', 'learn', 100, HOUR, { correct: 1, total: 1 })], app).kind).toBe('new');
  });
  it('topics explored counts modules', () => {
    expect(topicsExplored([rec('abc', 'find', 90, 0), rec('abc', 'learn', 100, 0), rec('money', 'know', 70, 0)], app).map((x) => [x.id, x.n])).toEqual([['abc', 2], ['money', 1]]);
  });
});
