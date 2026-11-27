import { describe, it, expect } from 'vitest';
import { percent, starsFor, shuffle, shuffleDifferent, sample, normalise, checkAnswer, buildAttempt, filterByLevel, formatDuration } from '../../src/core/scoring.js';

/** Deterministic RNG for repeatable shuffles. */
function seeded(seed = 42) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

describe('percent', () => {
  it('rounds to a whole number', () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(2, 3)).toBe(67);
    expect(percent(10, 10)).toBe(100);
  });
  it('handles zero / bad totals and clamps', () => {
    expect(percent(0, 0)).toBe(0);
    expect(percent(5, -1)).toBe(0);
    expect(percent(12, 10)).toBe(100);
    expect(percent(-2, 10)).toBe(0);
  });
});

describe('starsFor', () => {
  it('gives 3 stars at 80% and above', () => { expect(starsFor(80)).toBe(3); expect(starsFor(100)).toBe(3); });
  it('gives 2 stars from 50% to 79%', () => { expect(starsFor(50)).toBe(2); expect(starsFor(79)).toBe(2); });
  it('always rewards at least 1 star', () => { expect(starsFor(0)).toBe(1); expect(starsFor(49)).toBe(1); });
});

describe('shuffle', () => {
  const list = [1, 2, 3, 4, 5, 6, 7, 8];
  it('keeps every item exactly once and does not mutate the input', () => {
    const copy = [...list];
    const out = shuffle(list, seeded());
    expect(out.sort()).toEqual(copy);
    expect(list).toEqual(copy);
  });
  it('is deterministic for the same seed and changes order', () => {
    expect(shuffle(list, seeded(7))).toEqual(shuffle(list, seeded(7)));
    expect(shuffle(list, seeded(7))).not.toEqual(list);
  });
  it('produces every permutation of a small list (roughly uniform)', () => {
    const counts = {};
    const rng = seeded(99);
    for (let i = 0; i < 6000; i += 1) {
      const k = shuffle(['a', 'b', 'c'], rng).join('');
      counts[k] = (counts[k] || 0) + 1;
    }
    expect(Object.keys(counts)).toHaveLength(6);
    Object.values(counts).forEach((c) => expect(c).toBeGreaterThan(800));
  });
  it('shuffleDifferent never returns the original order for 2+ items', () => {
    for (let i = 0; i < 50; i += 1) expect(shuffleDifferent([1, 2])).toEqual([2, 1]);
  });
  it('sample returns n distinct items', () => {
    const s = sample(list, 3, seeded());
    expect(s).toHaveLength(3);
    expect(new Set(s).size).toBe(3);
  });
});

describe('checkAnswer', () => {
  it('ignores case, spaces and curly quotes', () => {
    expect(normalise('  It’s  ')).toBe("it's");
    expect(checkAnswer({ answer: 'an' }, 'An')).toBe(true);
    expect(checkAnswer({ answer: "it's" }, 'It’s')).toBe(true);
    expect(checkAnswer({ answer: 'an' }, 'a')).toBe(false);
  });
  it('compares numbers given as strings', () => {
    expect(checkAnswer({ answer: 7 }, '7')).toBe(true);
    expect(checkAnswer({ answer: 7 }, 8)).toBe(false);
  });
  it('accepts listed alternatives', () => {
    expect(checkAnswer({ answer: 'grey', accept: ['gray'] }, 'Gray')).toBe(true);
  });
  it('checks ordered arrays item by item', () => {
    expect(checkAnswer({ answer: ['A', 'B', 'C'] }, ['a', 'b', 'c'])).toBe(true);
    expect(checkAnswer({ answer: ['A', 'B', 'C'] }, ['A', 'C', 'B'])).toBe(false);
    expect(checkAnswer({ answer: ['A', 'B'] }, ['A'])).toBe(false);
  });
  it('checks built sentences ignoring the final full stop and case', () => {
    const q = { type: 'build', answer: 'The cat is on the mat.' };
    expect(checkAnswer(q, 'The cat is on the mat.')).toBe(true);
    expect(checkAnswer(q, 'the cat is on the mat')).toBe(true);
    expect(checkAnswer(q, 'The mat is on the cat.')).toBe(false);
  });
});

describe('buildAttempt', () => {
  it('computes score % and duration in seconds', () => {
    const a = buildAttempt({ profileId: 'p1', app: 'grammarhub', module: 'nouns', activity: 'quiz', correct: 7, total: 10, startedAt: 1000, endedAt: 46000 });
    expect(a).toMatchObject({ profileId: 'p1', app: 'grammarhub', score: 70, correct: 7, total: 10, duration: 45, timestamp: 46000 });
    expect(a.title).toBe('nouns – quiz');
  });
});

describe('filterByLevel', () => {
  const qs = [1, 2, 3, 4, 5, 6, 1, 2, 3].map((year, i) => ({ id: i, year }));
  it('puts questions at or below the level first', () => {
    const out = filterByLevel(qs, 2, 5, seeded());
    expect(out.slice(0, 4).every((q) => q.year <= 2)).toBe(true);
    expect(out).toHaveLength(5);
    expect(out[4].year).toBe(3); // tops up with the easiest harder question
  });
  it('defaults to year 6 (everything)', () => {
    expect(filterByLevel(qs, undefined).length).toBe(qs.length);
  });
});

describe('formatDuration', () => {
  it('formats m:ss', () => { expect(formatDuration(0)).toBe('0:00'); expect(formatDuration(75)).toBe('1:15'); });
});
