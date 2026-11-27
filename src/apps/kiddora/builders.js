/**
 * Kiddora activity builders: turn the JSON content in /src/content/kiddora
 * into engine configs. Add items to the JSON and every activity that uses
 * that file picks them up automatically – no code change needed.
 */
import { shuffle, sample } from '../../core/scoring.js';

const content = {
  alphabet: () => import('../../content/kiddora/alphabet.json'),
  numbers: () => import('../../content/kiddora/numbers.json'),
  colours: () => import('../../content/kiddora/colours.json'),
  body: () => import('../../content/kiddora/body.json'),
  animals: () => import('../../content/kiddora/animals.json'),
  food: () => import('../../content/kiddora/food.json'),
  transport: () => import('../../content/kiddora/transport.json'),
  shapes: () => import('../../content/kiddora/shapes.json'),
  jobs: () => import('../../content/kiddora/jobs.json'),
  syllables: () => import('../../content/kiddora/syllables.json'),
  colouring: () => import('../../content/kiddora/colouring.json'),
};
export const load = async (name) => (await content[name]()).default;

const name = (x) => ({ en: x.en, ms: x.ms });
const both = (en, ms) => ({ en, ms });
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const repeat = (emoji, n) => Array.from({ length: n }, () => emoji).join('');
const article = (w) => (/^[aeiou]/i.test(w) ? 'an' : 'the');

/** Speech text helper: { en: 'Find the cat', ms: 'Cari kucing' } */
const say = (en, ms) => ({ en, ms });

/* ---------- generic generators ---------- */

/** Flashcards from items with emoji + names. */
export const cards = (items, extra = {}) => ({ items: items.map((x) => ({ visual: x.emoji, word: name(x), info: x.info, category: x.category, audio: x.audio, ...extra })) });

/** "Tap the X" multiple choice with picture options. */
export function choosePicture(items, { n = 15, options = 3, prompt } = {}) {
  return {
    questions: sample(items, n).map((x) => ({
      prompt: prompt(x),
      options: [x, ...sample(items.filter((y) => y !== x && y.emoji !== x.emoji), options - 1)].map((o) => ({ value: o.en, visual: o.emoji, label: name(o), hideLabel: true, speak: false })),
      answer: x.en,
    })),
  };
}

/** Find-it grid with emoji items. */
export function findGrid(items, { n = 15, size = 6, prompt } = {}) {
  return {
    questions: sample(items, n).map((x) => ({
      prompt: prompt(x),
      answer: x.en,
      items: [x, ...sample(items.filter((y) => y !== x && y.emoji !== x.emoji), size - 1)].map((o) => ({ id: o.en, visual: o.emoji, label: name(o) })),
    })),
  };
}

/** Match-lines rounds: chunks of `per` pairs. left/right map an item to a side. */
export function matchRounds(items, { rounds = 5, per = 4, left, right, prompt }) {
  return {
    questions: Array.from({ length: rounds }, () => ({
      prompt,
      pairs: sample(items, per).map((x, i) => ({ id: `${i}-${x.en ?? x.key ?? x.n}`, left: left(x), right: right(x), say: x.en ? name(x) : undefined })),
    })),
  };
}

/** Sort rounds: `per` random items into category buckets. */
export function sortRounds(items, buckets, { rounds = 5, per = 6, prompt }) {
  return {
    questions: Array.from({ length: rounds }, () => {
      // make sure every bucket appears at least once
      const picks = buckets.map((b) => sample(items.filter((x) => x.bucket === b.id), 1)[0]);
      const rest = sample(items.filter((x) => !picks.includes(x)), per - picks.length);
      return { prompt, buckets, items: shuffle([...picks, ...rest]) };
    }),
  };
}

/**
 * Illustrated train for Choo-Choo ABC / 123: Cici's engine and five wagons. `panels` are the wagons'
 * white windows as [left, top, right, bottom] in % of the picture; the letters/numbers go there.
 */
const TRAIN_ART = {
  src: 'images/kiddora/train.webp',
  ratio: '1744 / 530',
  panels: [[28.84, 35.28, 38.88, 62.83], [42.89, 34.91, 53.27, 64.34], [57.34, 35.28, 67.37, 64.53], [71.85, 35.28, 82.17, 64.34], [86.93, 35.47, 96.5, 64.53]],
};

/** Consecutive sequence with gaps (Complete the ABC / Choo-Choo). */
export function sequence(list, { n = 10, len = 5, gaps = 2, layout = 'row', prompt, distract = 2, art }) {
  return {
    questions: Array.from({ length: n }, () => {
      const start = rint(0, list.length - len);
      const seq = list.slice(start, start + len);
      const hide = new Set(sample(range(0, len - 1), gaps));
      const missing = seq.filter((_, i) => hide.has(i));
      const others = sample(list.filter((x) => !seq.includes(x)), distract);
      return {
        layout,
        prompt,
        art,
        slots: seq.map((v, i) => ({ answer: v, fixed: !hide.has(i) })),
        tiles: [...missing, ...others],
      };
    }),
  };
}

/* ---------- per-activity builders ---------- */

export const B = {
  /* Jobs */
  async jobs() { return cards((await load('jobs')).jobs); },

  /* Colouring */
  async colouring() { return load('colouring'); },

  /* ABC */
  async learnAbc({ lang }) {
    const { letters } = await load('alphabet');
    return {
      items: letters.map((l) => ({
        text: `${l.letter} ${l.letter.toLowerCase()}`,
        visual: { en: l.en.emoji, ms: l.ms.emoji },
        word: { en: `${l.letter} for ${l.en.word}`, ms: `${l.letter} untuk ${l.ms.word}` },
        say: { en: `${l.letter} for ${l.en.word}`, ms: `${l.letter} untuk ${l.ms.word}` },
      })),
      lang,
    };
  },
  async matchLetters() {
    const { letters } = await load('alphabet');
    return matchRounds(letters.map((l) => ({ key: l.letter, en: l.letter, ms: l.letter })), {
      rounds: 6, per: 4,
      prompt: both('Match the big letter to the small letter', 'Padankan huruf besar dengan huruf kecil'),
      left: (x) => ({ text: x.key, size: '2.4rem' }),
      right: (x) => ({ text: x.key.toLowerCase(), size: '2.4rem' }),
    });
  },
  async findLetter() {
    const { letters } = await load('alphabet');
    const L = letters.map((l) => l.letter);
    return {
      questions: sample(L, 15).map((c) => ({
        prompt: both(`Find the letter ${c}`, `Cari huruf ${c}`),
        answer: c,
        items: shuffle([c, ...sample(L.filter((x) => x !== c), 5)]).map((x) => ({ id: x, text: x, label: x })),
      })),
    };
  },
  async spellIt({ lang }) {
    const { spellWords } = await load('alphabet');
    return {
      countOptions: [5, 10, 15, 20],
      questions: spellWords[lang].map((w) => ({ word: w.word, visual: w.emoji, say: w.word, lang, extra: 2 })),
    };
  },
  async abcTracing() {
    const { letters } = await load('alphabet');
    return { count: 10, keepOrder: false, questions: letters.map((l) => ({ text: l.letter })) };
  },
  async completeAbc() {
    const L = (await load('alphabet')).letters.map((l) => l.letter);
    return sequence(L, { n: 10, len: 5, gaps: 2, prompt: both('Complete the ABC', 'Lengkapkan ABC') });
  },
  async chooChooAbc() {
    const L = (await load('alphabet')).letters.map((l) => l.letter);
    return sequence(L, { n: 10, len: 5, gaps: 3, layout: 'train', art: TRAIN_ART, prompt: both('Fill the train with the missing letters', 'Isi kereta api dengan huruf yang hilang') });
  },
  async sukuKata() {
    const { words, families } = await load('syllables');
    return {
      questions: words.map((w) => {
        const hide = rint(0, w.parts.length - 1);
        const ans = w.parts[hide];
        const fam = families[ans[0]] || [];
        const distract = sample(fam.filter((s) => s !== ans), 2);
        const filler = distract.length < 2 ? sample(Object.values(families).flat().filter((s) => s !== ans), 2 - distract.length) : [];
        return {
          layout: 'row',
          prompt: `${w.emoji}  Lengkapkan perkataan: ${w.word}`,
          say: `Lengkapkan perkataan ${w.word}`,
          slots: w.parts.map((p, i) => ({ answer: p, fixed: i !== hide, say: w.word })),
          tiles: [ans, ...distract, ...filler],
        };
      }),
    };
  },

  /* 123 */
  async learn123() {
    const { numbers, objects } = await load('numbers');
    return {
      items: numbers.map((x, i) => ({
        text: String(x.n),
        visual: x.n > 0 && x.n <= 10 ? repeat(objects[i % objects.length], x.n) : undefined,
        word: name(x),
      })),
    };
  },
  async tracing123() { return { count: 10, questions: range(0, 9).map((n) => ({ text: String(n) })) }; },
  async matchNumber() {
    const { numbers, objects } = await load('numbers');
    return matchRounds(numbers.filter((x) => x.n >= 1 && x.n <= 10).map((x) => ({ ...x, key: x.n, obj: objects[rint(0, objects.length - 1)] })), {
      rounds: 5, per: 4,
      prompt: both('Match the number to the right group', 'Padankan nombor dengan kumpulan yang betul'),
      left: (x) => ({ text: String(x.n), size: '2.4rem' }),
      right: (x) => ({ text: repeat(x.obj, x.n), size: x.n > 6 ? '1rem' : '1.4rem' }),
    });
  },
  async letsCount() {
    const { objects } = await load('numbers');
    return {
      questions: range(1, 15).map(() => {
        const n = rint(1, 10);
        const o = objects[rint(0, objects.length - 1)];
        const opts = shuffle([n, ...sample(range(1, 10).filter((x) => x !== n), 2)]);
        return {
          prompt: both('How many can you count?', 'Berapa banyak yang kamu kira?'),
          visual: repeat(o, n), visualSize: n > 6 ? 'md' : 'lg',
          options: opts.map((x) => ({ value: x, label: String(x) })),
          answer: n,
        };
      }),
    };
  },
  async addition({ profile }) {
    const max = (profile?.level ?? 4) >= 5 ? 20 : 10;
    const { objects } = await load('numbers');
    return {
      questions: range(1, 15).map(() => {
        const a = rint(0, max / 2);
        const b = rint(0, Math.min(max - a, max / 2));
        return { a, b, op: '+', emoji: objects[rint(0, objects.length - 1)], max };
      }),
    };
  },
  async addThemUp() {
    const { objects } = await load('numbers');
    return {
      questions: range(1, 10).map(() => {
        const a = rint(1, 5);
        const b = rint(1, 5);
        return { a, b, count: a + b, emoji: objects[rint(0, objects.length - 1)] };
      }),
    };
  },
  async takingAway({ profile }) {
    const max = (profile?.level ?? 4) >= 5 ? 20 : 10;
    const { objects } = await load('numbers');
    return {
      questions: range(1, 15).map(() => {
        const a = rint(2, Math.min(max, 12));
        const b = rint(1, a - 1);
        return { a, b, op: '-', emoji: objects[rint(0, objects.length - 1)], max };
      }),
    };
  },
  async chooChoo123() {
    return sequence(range(1, 20).map(String), { n: 10, len: 5, gaps: 2, layout: 'train', art: TRAIN_ART, prompt: both('Put the missing numbers on the train', 'Letakkan nombor yang hilang di atas kereta api') });
  },
  async findNumber() {
    const N = range(0, 20).map(String);
    return {
      questions: sample(N, 15).map((c) => ({
        prompt: both(`Find the number ${c}`, `Cari nombor ${c}`),
        answer: c,
        items: shuffle([c, ...sample(N.filter((x) => x !== c), 5)]).map((x) => ({ id: x, text: x, label: x })),
      })),
    };
  },

  /* Colour */
  async learnColour() {
    const { colours } = await load('colours');
    return { items: colours.map((c) => ({ visual: { color: c.color }, word: name(c), info: { en: c.things.join(' '), ms: c.things.join(' ') } })) };
  },
  async popBalloon() {
    const { colours } = await load('colours');
    const pool = colours.filter((c) => !['white', 'silver', 'gold', 'darkgreen', 'lightblue'].includes(c.key)).map((c) => ({ key: c.key, color: c.color, label: name(c) }));
    return { questions: range(1, 15).map((i) => ({ target: pool[i % pool.length], colors: pool })) };
  },
  async matchColour() {
    const { colours } = await load('colours');
    return matchRounds(colours.filter((c) => c.key !== 'white'), {
      rounds: 5, per: 4,
      prompt: both('Match each colour to a thing of the same colour', 'Padankan warna dengan benda yang sama warnanya'),
      left: (c) => ({ visual: { color: c.color }, label: name(c) }),
      right: (c) => ({ visual: c.things[rint(0, c.things.length - 1)], label: name(c) }),
    });
  },
  async swap(kind) {
    const { colours } = await load('colours');
    const pool = colours.filter((c) => !['white', 'silver', 'lightblue', 'darkgreen'].includes(c.key));
    const arts = { paint: ['blob', 'tube'], socks: ['sock', 'sock'], crayon: ['bucket', 'crayon'] }[kind];
    const prompts = {
      paint: both('Swap the paint tubes so each one matches its paint', 'Tukar tiub cat supaya sama dengan warna catnya'),
      socks: both('Swap the socks to make matching pairs', 'Tukar stokin supaya berpasangan'),
      crayon: both('Swap the crayons to match the paint buckets', 'Tukar krayon supaya sama dengan baldi cat'),
    };
    return {
      questions: range(1, 5).map((i) => ({
        prompt: prompts[kind], targetArt: arts[0], itemArt: arts[1],
        colors: sample(pool, i < 3 ? 3 : 4).map((c) => ({ key: c.key, color: c.color, label: name(c) })),
      })),
    };
  },
  async findColour() {
    const { colours } = await load('colours');
    const pool = colours.filter((c) => !['silver', 'gold', 'lightblue', 'darkgreen', 'grey'].includes(c.key));
    return {
      questions: range(1, 15).map((i) => {
        const c = pool[i % pool.length];
        const thing = c.things[rint(0, c.things.length - 1)];
        const others = sample(pool.filter((x) => x !== c), 5).map((x) => ({ id: x.key, visual: x.things[rint(0, x.things.length - 1)], label: name(x) }));
        return {
          prompt: both(`Find something ${c.en}`, `Cari benda berwarna ${c.ms}`),
          promptVisual: { color: c.color },
          answer: c.key,
          items: [{ id: c.key, visual: thing, label: name(c) }, ...others],
        };
      }),
    };
  },

  /* Body */
  async learnBody() { return cards((await load('body')).parts); },
  async chooseBody() {
    const { parts } = await load('body');
    return choosePicture(parts, { prompt: (x) => both(`Which one is the ${x.en}?`, `Yang mana satu ${x.ms}?`) });
  },
  async matchBody() {
    const { parts } = await load('body');
    return matchRounds(parts, {
      rounds: 5, per: 4,
      prompt: both('Match the picture to the word', 'Padankan gambar dengan perkataan'),
      left: (x) => ({ visual: x.emoji, label: name(x) }),
      right: (x) => ({ text: name(x), size: '1.2rem' }),
    });
  },
  async labelBody({ lang }) {
    const { parts, figure } = await load('body');
    const byId = Object.fromEntries(parts.map((p) => [p.id, p]));
    return {
      questions: range(1, 5).map(() => {
        const chosen = sample(figure.slots, 4);
        return {
          layout: 'figure',
          figure: figure.svg,
          prompt: both('Drag each word to the right body part', 'Seret perkataan ke bahagian badan yang betul'),
          slots: chosen.map((s) => ({ answer: byId[s.id][lang], x: s.x, y: s.y })),
          tiles: chosen.map((s) => byId[s.id][lang]),
        };
      }),
    };
  },

  /* Animals */
  async learnAnimals() {
    const a = await load('animals');
    return { ...cards(a.animals), categories: a.categories };
  },
  async matchAnimals() {
    const { animals } = await load('animals');
    return matchRounds(animals, {
      rounds: 5, per: 4,
      prompt: both('Match each animal to its shadow', 'Padankan haiwan dengan bayang-bayangnya'),
      left: (x) => ({ visual: x.emoji, label: name(x) }),
      right: (x) => ({ visual: { emoji: x.emoji, shadow: true }, label: name(x) }),
    });
  },
  async findAnimal() {
    const { animals } = await load('animals');
    return findGrid(animals, { prompt: (x) => both(`Find the ${x.en}`, `Cari ${x.ms}`) });
  },
  async completeAnimal() {
    const { animals, halves } = await load('animals');
    const pool = animals.filter((a) => halves.includes(a.id));
    return {
      questions: sample(pool, 10).map((x) => ({
        layout: 'half',
        prompt: both(`Find the other half of the ${x.en}`, `Cari separuh lagi ${x.ms}`),
        emoji: x.emoji,
        slots: [{ answer: x.emoji }],
        tiles: [x.emoji, ...sample(pool.filter((y) => y !== x), 2).map((y) => y.emoji)],
      })),
    };
  },

  /* Food */
  async learnFruit() { return cards((await load('food')).fruits); },
  async fruitOrVeg() {
    const { fruits, vegetables } = await load('food');
    const items = [...fruits.map((x) => ({ visual: x.emoji, label: name(x), bucket: 'fruit' })), ...vegetables.map((x) => ({ visual: x.emoji, label: name(x), bucket: 'veg' }))];
    return sortRounds(items, [
      { id: 'fruit', label: both('Fruit', 'Buah'), visual: '🧺' },
      { id: 'veg', label: both('Vegetable', 'Sayur'), visual: '🥗' },
    ], { rounds: 5, per: 6, prompt: both('Is it a fruit or a vegetable?', 'Buah atau sayur?') });
  },

  /* Transport */
  async learnTransport() {
    const t = await load('transport');
    return { ...cards(t.items), categories: t.categories };
  },
  async sortTransport() {
    const t = await load('transport');
    return sortRounds(t.items.map((x) => ({ visual: x.emoji, label: name(x), bucket: x.category })),
      t.categories.map((c) => ({ id: c.id, label: c.label, visual: c.visual })),
      { rounds: 5, per: 6, prompt: both('Where does it travel: land, air or water?', 'Ia bergerak di mana: darat, udara atau air?') });
  },
  async guessTransport() {
    const { items } = await load('transport');
    return {
      questions: sample(items, 15).map((x) => ({
        prompt: both('Guess the transport from its shadow!', 'Teka kenderaan daripada bayang-bayangnya!'),
        visual: { emoji: x.emoji, shadow: true },
        options: [x, ...sample(items.filter((y) => y !== x), 2)].map((o) => ({ value: o.en, visual: o.emoji, label: name(o) })),
        answer: x.en,
      })),
    };
  },

  /* Shapes */
  async learnShapes() {
    const { shapes } = await load('shapes');
    return { items: shapes.map((s) => ({ visual: { shape: s.path, fill: s.fill }, word: name(s), info: { en: s.things.join(' '), ms: s.things.join(' ') } })) };
  },
  async matchShapes() {
    const { shapes } = await load('shapes');
    return matchRounds(shapes, {
      rounds: 5, per: 4,
      prompt: both('Match the shape to a thing with the same shape', 'Padankan bentuk dengan benda yang sama bentuknya'),
      left: (s) => ({ visual: { shape: s.path, fill: s.fill }, label: name(s) }),
      right: (s) => ({ visual: s.things[0], label: name(s) }),
    });
  },
  async drawShape() {
    const { shapes } = await load('shapes');
    return { count: 10, questions: shapes.map((s) => ({ path: s.path, viewBox: '0 0 100 100', label: name(s), minCoverage: 0.5 })) };
  },
  async matchMe() {
    const { shapes } = await load('shapes');
    return matchRounds(shapes, {
      rounds: 5, per: 4,
      prompt: both('Match each coloured shape to its outline', 'Padankan bentuk berwarna dengan garis luarnya'),
      left: (s) => ({ visual: { shape: s.path, fill: s.fill }, label: name(s) }),
      right: (s) => ({ visual: { shape: s.path, outline: true }, label: name(s) }),
    });
  },
};

export { article };

/* ---------- money (shop scene) ---------- */
const age = (ctx) => Number(ctx?.profile?.level) || 4;
const shop = (subtitle) => ({ title: both('Little Money Explorer', 'Penjelajah Duit Cilik'), subtitle });
async function money() { return import('../../games/money.js'); }
export const M = {
  async know(ctx) { const g = await money(); return { scene: shop(both('Know Your Money', 'Kenali Duit')), questions: g.knowQuestions({ n: 10, age: age(ctx) }) }; },
  async more(ctx) { const g = await money(); return { scene: shop(both('Which Is More?', 'Mana Lebih Banyak?')), questions: g.moreQuestions({ n: 10, age: age(ctx) }) }; },
  async count(ctx) { const g = await money(); return { scene: shop(both('Count the Money', 'Kira Duit')), questions: g.countQuestions({ n: 8, age: age(ctx) }) }; },
  async pay(ctx) { const g = await money(); return { scene: shop(both('Pay the Shopkeeper', 'Bayar Penjual')), questions: g.payQuestions({ n: 6, age: age(ctx) }) }; },
};
