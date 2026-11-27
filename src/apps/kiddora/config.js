/**
 * Kiddora app config: branding, profile levels/avatars and the module →
 * activity → engine map. Each activity's build() returns an engine config
 * from the JSON content (see builders.js).
 */
import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/600.css';
import { B, M } from './builders.js';

const m = (en, ms) => ({ en, ms });
const act = (id, title, emoji, engine, build) => ({ id, title, emoji, engine, build });

export default {
  id: 'kiddora',
  name: 'Kiddora',
  bilingual: true,
  kids: true,
  heroEmoji: '🦄',
  /** Home-screen decorations beside the grid (wide screens only): waving cat on the left, paws reaching in on the right. */
  decor: [
    {
      src: 'images/kiddora/mascot.webp', side: 'left',
      // Cici greets the child once per session (and again when tapped).
      greet: m('Hi! My name is Cici. Welcome to Kiddora! Ready to learn and play? Let\'s go!',
        'Hai! Nama saya Cici. Selamat datang ke Kiddora! Sedia untuk belajar dan bermain? Jom!'),
      // Recorded child-like voice (same on every device); speech is the fallback.
      greetAudio: m('audio/kiddora/cici-hello-en.m4a', 'audio/kiddora/cici-hello-ms.m4a'),
    },
    { src: 'images/kiddora/paws.webp', side: 'right' },
  ],
  avatars: ['🦁', '🐼', '🐰', '🦊', '🐯', '🐨', '🐸', '🐵', '🦄', '🐙', '🐥', '🐶'],
  levels: [3, 4, 5, 6].map((n) => ({ value: n, label: m(`Age ${n}`, `Umur ${n}`) })),
  modules: [
    {
      id: 'abc', tint: '#F25F5C', image: 'images/kiddora/modules/abc.webp', title: m('ABC', 'ABC'), emoji: '🔤', color: '#FFD166',
      activities: [
        act('learn', m('Learn ABC', 'Belajar ABC'), '📚', 'learnCards', B.learnAbc),
        act('match', m('Match the Letters', 'Padankan Huruf'), '🔗', 'matchLines', B.matchLetters),
        act('find', m('Find the Letter', 'Cari Huruf'), '🔍', 'findIt', B.findLetter),
        act('spell', m('Spell it Right', 'Eja dengan Betul'), '✏️', 'spelling', B.spellIt),
        act('trace', m('ABC Tracing', 'Surih ABC'), '✍️', 'tracing', B.abcTracing),
        act('complete', m('Complete the ABC', 'Lengkapkan ABC'), '🧩', 'dragToSlot', B.completeAbc),
        act('sukukata', m('Bijak Suku Kata', 'Bijak Suku Kata'), '🅱️', 'dragToSlot', B.sukuKata),
        act('train', m('Choo-Choo ABC', 'Choo-Choo ABC'), '🚂', 'dragToSlot', B.chooChooAbc),
      ],
    },
    {
      id: 'numbers', tint: '#FBB92F', image: 'images/kiddora/modules/numbers.webp', title: m('123', '123'), emoji: '🔢', color: '#8EECF5',
      activities: [
        act('learn', m('Learn 123', 'Belajar 123'), '📚', 'learnCards', B.learn123),
        act('trace', m('123 Tracing', 'Surih 123'), '✍️', 'tracing', B.tracing123),
        act('match', m('Match the Number', 'Padankan Nombor'), '🔗', 'matchLines', B.matchNumber),
        act('count', m("Let's Count", 'Jom Kira'), '🧮', 'multipleChoice', B.letsCount),
        act('add', m('Addition', 'Tambah'), '➕', 'arithmetic', B.addition),
        act('addup', m('Add Them Up', 'Campurkan Semua'), '🧺', 'dragToCount', B.addThemUp),
        act('subtract', m('Taking Away', 'Tolak'), '➖', 'arithmetic', B.takingAway),
        act('train', m('Choo Choo 123', 'Choo Choo 123'), '🚂', 'dragToSlot', B.chooChoo123),
        act('find', m('Find the Number', 'Cari Nombor'), '🔍', 'findIt', B.findNumber),
      ],
    },
    {
      id: 'colour', tint: '#4AA8F0', image: 'images/kiddora/modules/colour.webp', title: m('Colour', 'Warna'), emoji: '🌈', color: '#FFADAD',
      activities: [
        act('learn', m('Learn Colour', 'Belajar Warna'), '📚', 'learnCards', B.learnColour),
        act('balloon', m('Pop the Balloon', 'Pecahkan Belon'), '🎈', 'popBalloon', B.popBalloon),
        act('match', m('Match the Colour', 'Padankan Warna'), '🔗', 'matchLines', B.matchColour),
        act('paint', m('Match the Paint', 'Padankan Cat'), '🎨', 'swapToMatch', () => B.swap('paint')),
        act('socks', m('Pair the Socks', 'Pasangkan Stokin'), '🧦', 'swapToMatch', () => B.swap('socks')),
        act('crayon', m('Match the Crayon', 'Padankan Krayon'), '🖍️', 'swapToMatch', () => B.swap('crayon')),
        act('find', m('Find the Colour', 'Cari Warna'), '🔍', 'findIt', B.findColour),
      ],
    },
    {
      id: 'body', tint: '#9B6BEA', image: 'images/kiddora/modules/body.webp', title: m('Body Parts', 'Anggota Badan'), emoji: '🧒', color: '#FFC6FF',
      activities: [
        act('learn', m('Learn', 'Belajar'), '📚', 'learnCards', B.learnBody),
        act('choose', m('Choose', 'Pilih'), '👆', 'multipleChoice', B.chooseBody),
        act('match', m('Match', 'Padankan'), '🔗', 'matchLines', B.matchBody),
        act('label', m('Label the Body Part', 'Labelkan Anggota Badan'), '🏷️', 'dragToSlot', B.labelBody),
      ],
    },
    {
      id: 'animals', tint: '#6CBF3A', image: 'images/kiddora/modules/animals.webp', title: m('Animals', 'Haiwan'), emoji: '🐘', color: '#CAFFBF',
      activities: [
        act('learn', m('Learn', 'Belajar'), '📚', 'learnCards', B.learnAnimals),
        act('match', m('Match', 'Padankan'), '🔗', 'matchLines', B.matchAnimals),
        act('find', m('Find', 'Cari'), '🔍', 'findIt', B.findAnimal),
        act('complete', m('Complete the Animal', 'Lengkapkan Haiwan'), '🧩', 'dragToSlot', B.completeAnimal),
      ],
    },
    {
      id: 'food', tint: '#F06292', image: 'images/kiddora/modules/food.webp', title: m('Fruit & Vegetable', 'Buah & Sayur'), emoji: '🍎', color: '#FDFFB6',
      activities: [
        act('fruit', m('Learn Fruit', 'Belajar Buah'), '📚', 'learnCards', B.learnFruit),
        act('sort', m('Fruit or Vegetable', 'Buah atau Sayur'), '🧺', 'sortBuckets', B.fruitOrVeg),
      ],
    },
    {
      id: 'transport', tint: '#3CC6E0', image: 'images/kiddora/modules/transport.webp', title: m('Transport', 'Pengangkutan'), emoji: '🚗', color: '#A0C4FF',
      activities: [
        act('learn', m('Learn', 'Belajar'), '📚', 'learnCards', B.learnTransport),
        act('sort', m('Sort the Transport', 'Asingkan Kenderaan'), '🗂️', 'sortBuckets', B.sortTransport),
        act('guess', m('Guess the Transport', 'Teka Kenderaan'), '❓', 'multipleChoice', B.guessTransport),
      ],
    },
    {
      id: 'shapes', tint: '#F6B52C', image: 'images/kiddora/modules/shapes.webp', title: m('Shapes', 'Bentuk'), emoji: '🔺', color: '#BDB2FF',
      activities: [
        act('learn', m('Learn', 'Belajar'), '📚', 'learnCards', B.learnShapes),
        act('match', m('Match', 'Padankan'), '🔗', 'matchLines', B.matchShapes),
        act('draw', m('Draw the Shape', 'Lukis Bentuk'), '✍️', 'tracing', B.drawShape),
        act('matchme', m('Match Me', 'Padankan Saya'), '🎯', 'matchLines', B.matchMe),
      ],
    },
    {
      id: 'money', tint: '#F2705D', image: 'images/kiddora/modules/money.webp', title: m('Money', 'Duit'), emoji: '💰', color: '#FFE08A',
      activities: [
        act('know', m('Know Your Money', 'Kenali Duit'), '💵', 'shopScene', M.know),
        act('more', m('Which Is More?', 'Mana Lebih Banyak?'), '⚖️', 'shopScene', M.more),
        act('count', m('Count the Money', 'Kira Duit'), '🧮', 'shopScene', M.count),
        act('pay', m('Pay the Shopkeeper', 'Bayar Penjual'), '🛒', 'shopScene', M.pay),
      ],
    },
    {
      id: 'jobs', tint: '#4A8FE6', image: 'images/kiddora/modules/jobs.webp', title: m('Jobs & Profession', 'Pekerjaan'), emoji: '🧑‍🚒', color: '#FFD6A5',
      activities: [act('learn', m('Jobs & Profession', 'Pekerjaan'), '📚', 'learnCards', B.jobs)],
      direct: 'learn',
    },
    {
      id: 'colouring', tint: '#C49AF0', image: 'images/kiddora/modules/colouring.webp', title: m('Colouring', 'Mewarna'), emoji: '🖍️', color: '#9BF6FF',
      activities: [act('book', m('Colouring', 'Mewarna'), '🎨', 'colouring', B.colouring)],
      direct: 'book',
    },
    // Coming soon: picture tile only, not playable yet.
    { id: 'emergency', tint: '#2BB3A3', image: 'images/kiddora/modules/emergency.webp', title: m('Emergency Hero', 'Wira Kecemasan'), emoji: '🚑', color: '#7ED6C4', comingSoon: true, activities: [] },
    { id: 'puzzle', tint: '#4A90E2', image: 'images/kiddora/modules/puzzle.webp', title: m('Puzzle', 'Teka-teki'), emoji: '🧩', color: '#8CC8FF', comingSoon: true, activities: [] },
    { id: 'space', tint: '#7B5CE0', image: 'images/kiddora/modules/space.webp', title: m('Space Adventure', 'Pengembaraan Angkasa'), emoji: '🚀', color: '#9B8CFF', comingSoon: true, activities: [] },
    { id: 'reads', tint: '#F2C46B', image: 'images/kiddora/modules/reads.webp', title: m('Kiddy Reads', 'Kiddy Membaca'), emoji: '📖', color: '#FFE9B5', comingSoon: true, activities: [] },
  ],
};
