import { describe, it, expect } from 'vitest';
import { solve, makeOptions } from '../../src/games/arithmetic.js';
import { minSwaps } from '../../src/games/swapToMatch.js';
import { letterTiles } from '../../src/games/spelling.js';
import { splitWords } from '../../src/games/buildSentence.js';

describe('arithmetic', () => {
  it('solves + and -', () => { expect(solve(3, 4, '+')).toBe(7); expect(solve(9, 4, '-')).toBe(5); });
  it('makes distinct options that include the answer and stay in range', () => {
    for (const ans of [0, 1, 10, 20]) {
      const o = makeOptions(ans, 20, 3);
      expect(o).toContain(ans);
      expect(new Set(o).size).toBe(3);
      o.forEach((n) => { expect(n).toBeGreaterThanOrEqual(0); expect(n).toBeLessThanOrEqual(20); });
    }
  });
});

describe('swapToMatch.minSwaps', () => {
  it('counts the minimum swaps to sort', () => {
    expect(minSwaps(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(0);
    expect(minSwaps(['b', 'a', 'c'], ['a', 'b', 'c'])).toBe(1);
    expect(minSwaps(['b', 'c', 'a'], ['a', 'b', 'c'])).toBe(2);
  });
});

describe('spelling.letterTiles', () => {
  it('contains every letter of the word plus distractors', () => {
    const tiles = letterTiles('apple', 3);
    expect(tiles).toHaveLength(8);
    for (const ch of 'apple') expect(tiles.filter((t) => t === ch).length).toBeGreaterThanOrEqual([...'apple'].filter((c) => c === ch).length);
  });
});

describe('buildSentence.splitWords', () => {
  it('splits on whitespace keeping punctuation on words', () => {
    expect(splitWords('  Can you help me, please? ')).toEqual(['Can', 'you', 'help', 'me,', 'please?']);
  });
});
