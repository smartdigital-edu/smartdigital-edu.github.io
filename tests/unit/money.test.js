import { describe, it, expect } from 'vitest';
import {
  numberWord, amountWords, formatAmount, moneySVG, DENOMS, denomsFor, notesFor, canPay,
  knowQuestions, moreQuestions, countQuestions, payQuestions,
} from '../../src/games/money.js';

const value = (o) => o.sen ?? o.money.reduce((a, b) => a + b, 0);

describe('money words', () => {
  it('numbers in English and Malay', () => {
    expect([1, 11, 15, 20, 21, 50, 99, 100].map((n) => numberWord(n, 'en')))
      .toEqual(['one', 'eleven', 'fifteen', 'twenty', 'twenty-one', 'fifty', 'ninety-nine', 'one hundred']);
    expect([1, 10, 11, 15, 20, 21, 50, 99, 100].map((n) => numberWord(n, 'ms')))
      .toEqual(['satu', 'sepuluh', 'sebelas', 'lima belas', 'dua puluh', 'dua puluh satu', 'lima puluh', 'sembilan puluh sembilan', 'seratus']);
  });
  it('spoken and written amounts', () => {
    expect(amountWords(20, 'en')).toBe('twenty sen');
    expect(amountWords(100, 'en')).toBe('one ringgit');
    expect(amountWords(150, 'ms')).toBe('satu ringgit lima puluh sen');
    expect(amountWords(1000, 'ms')).toBe('sepuluh ringgit');
    expect(formatAmount(50)).toBe('50 sen');
    expect(formatAmount(500)).toBe('RM5');
    expect(formatAmount(150)).toBe('RM1.50');
  });
});

describe('money drawings', () => {
  it('draws every denomination as play money, never a replica', () => {
    for (const d of DENOMS) {
      const svg = moneySVG(d.sen);
      expect(svg).toMatch(/^<svg/);
      if (d.kind === 'note') expect(svg).toContain('WANG MAINAN');
    }
  });
});

describe('question generators', () => {
  for (const age of [3, 4, 5, 6]) {
    it(`know-your-money: answer is the asked amount, 3 distinct options (age ${age})`, () => {
      const qs = knowQuestions({ n: 12, age });
      expect(qs).toHaveLength(12);
      for (const q of qs) {
        expect(q.options).toHaveLength(3);
        const vals = q.options.map(value);
        expect(new Set(vals).size).toBe(3);
        expect(q.say.en).toContain(amountWords(vals[q.answer], 'en'));
        expect(q.say.ms).toContain(amountWords(vals[q.answer], 'ms'));
        vals.forEach((v) => expect(denomsFor(age)).toContain(v));
      }
    });
    it(`which-is-more: answer is the bigger of two different amounts (age ${age})`, () => {
      for (const q of moreQuestions({ n: 20, age })) {
        const [a, b] = q.options.map(value);
        expect(a).not.toBe(b);
        expect(value(q.options[q.answer])).toBe(Math.max(a, b));
      }
    });
    it(`count-the-money: the pile adds up to the answer (age ${age})`, () => {
      for (const q of countQuestions({ n: 30, age })) {
        const pile = q.show.reduce((x, y) => x + y, 0);
        expect(q.options[q.answer].sen).toBe(pile);
        expect(new Set(q.options.map((o) => o.sen)).size).toBe(3);
        q.options.forEach((o) => expect(o.sen).toBeGreaterThan(0));
      }
    });
    it(`pay-the-shopkeeper: every price can be paid exactly from the wallet (age ${age})`, () => {
      for (let i = 0; i < 20; i += 1) {
        for (const q of payQuestions({ n: 8, age })) expect(canPay(q.price, q.wallet)).toBe(true);
      }
    });
  }
  it('notesFor breaks ringgit into notes', () => {
    expect(notesFor(7)).toEqual([500, 100, 100]);
    expect(notesFor(16)).toEqual([1000, 500, 100]);
  });
  it('canPay', () => {
    expect(canPay(600, [100, 500])).toBe(true);
    expect(canPay(300, [100, 500])).toBe(false);
  });
});
