/** Content sanity checks: every question bank is complete and answerable. */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';

const dir = 'src/content/grammarhub';
const topics = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')));

describe('Grammar Hub content', () => {
  it('has all 13 KSSR topics', () => { expect(topics).toHaveLength(13); });
  for (const t of topics) {
    describe(t.id, () => {
      it('has a real lesson with 4–6 examples', () => {
        expect(t.lesson.intro.length).toBeGreaterThan(30);
        expect(t.lesson.examples.length).toBeGreaterThanOrEqual(4);
        expect(t.lesson.examples.length).toBeLessThanOrEqual(6);
      });
      it('has at least 40 questions, each answerable with an explanation and year 1–6', () => {
        expect(t.questions.length).toBeGreaterThanOrEqual(40);
        for (const q of t.questions) {
          expect(q.year).toBeGreaterThanOrEqual(1);
          expect(q.year).toBeLessThanOrEqual(6);
          expect(q.explanation, q.id).toBeTruthy();
          if (q.options) expect(q.options, q.id).toContain(q.answer);
          if (q.type === 'fill') expect(q.sentence, q.id).toContain('___');
          if (q.type === 'spelling') expect(q.word, q.id).toMatch(/^[a-z]+$/);
        }
      });
      it('has unique question ids', () => {
        expect(new Set(t.questions.map((q) => q.id)).size).toBe(t.questions.length);
      });
    });
  }
  it('contains no placeholder text', () => {
    const all = readdirSync(dir).map((f) => readFileSync(`${dir}/${f}`, 'utf8')).join('\n').toLowerCase();
    for (const bad of ['lorem', 'content goes here', 'todo', 'placeholder', 'tbd']) expect(all).not.toContain(bad);
  });
});

describe('Kivokid content', () => {
  const k = (f) => JSON.parse(readFileSync(`src/content/kiddora/${f}.json`, 'utf8'));
  it('has 26 letters with English and Malay words', () => {
    const { letters } = k('alphabet');
    expect(letters).toHaveLength(26);
    letters.forEach((l) => { expect(l.en.word).toBeTruthy(); expect(l.ms.word).toBeTruthy(); });
  });
  it('has at least 15 items in each learning set', () => {
    expect(k('jobs').jobs.length).toBeGreaterThanOrEqual(15);
    expect(k('animals').animals.length).toBeGreaterThanOrEqual(15);
    expect(k('colours').colours.length).toBeGreaterThanOrEqual(15);
    expect(k('shapes').shapes.length).toBeGreaterThanOrEqual(15);
    expect(k('transport').items.length).toBeGreaterThanOrEqual(15);
    expect(k('food').fruits.length).toBeGreaterThanOrEqual(15);
    expect(k('body').parts.length).toBeGreaterThanOrEqual(15);
    expect(k('syllables').words.length).toBeGreaterThanOrEqual(15);
  });
  it('has 10 colouring pictures', () => { expect(k('colouring').pictures).toHaveLength(10); });
  it('syllables join back into the word', () => {
    k('syllables').words.forEach((w) => expect(w.parts.join('')).toBe(w.word));
  });
});
