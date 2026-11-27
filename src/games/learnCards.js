/**
 * learnCards – flashcards: picture + word + Listen, Previous / Next.
 * Config JSON: { items: [{ visual, word: {en, ms}, sub?, category?, audio? }], categories?: [{ id, label, visual }] }
 * Bilingual apps show the other language underneath.
 */
import { el, button, clear, visual, animate } from '../core/ui.js';

export default function learnCards(root, config, api) {
  let cat = null;
  let items = config.items;
  let i = 0;
  const seen = new Set();
  const card = el('div.card.flashcard', { 'aria-live': 'polite' });
  const counter = el('span.game-counter');
  const prev = button(api.t('game.prev'), { variant: 'secondary', icon: '⬅', onClick: () => go(-1) });
  const next = button(api.t('game.next'), { icon: '➡', onClick: () => go(1) });
  const tabs = config.categories ? el('div.toolbar', { role: 'tablist' }, [{ id: null, label: { en: 'All', ms: 'Semua' }, visual: '⭐' }, ...config.categories].map((c) => el('button.tool', {
    type: 'button', role: 'tab', 'aria-selected': String(c.id === cat), 'aria-pressed': String(c.id === cat),
    onclick: () => {
      cat = c.id;
      items = cat ? config.items.filter((x) => x.category === cat) : config.items;
      i = 0;
      tabs.querySelectorAll('button').forEach((b, idx) => { const on = (idx === 0 ? null : config.categories[idx - 1].id) === cat; b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-selected', String(on)); });
      draw();
    },
  }, el('span', { 'aria-hidden': 'true' }, c.visual), api.tx(c.label)))) : null;

  const word = (it) => api.tx(it.word);
  const other = (it) => (api.app.bilingual ? api.tx(it.word, api.lang === 'en' ? 'ms' : 'en') : api.tx(it.sub));
  const listen = () => api.speak(api.tx(it().say || it().word), { audioSrc: it().audio?.[api.lang] || (typeof it().audio === 'string' ? it().audio : undefined) });
  const it = () => items[i];

  function draw() {
    const x = it();
    seen.add(x);
    const catObj = config.categories?.find((c) => c.id === x.category);
    clear(card).append(...[
      catObj ? el('span.flashcard-cat', `${catObj.visual} ${api.tx(catObj.label)}`) : null,
      x.text != null ? el('span.big-text', { style: { color: x.color || null } }, api.tx(x.text)) : null,
      x.visual != null ? visual(api.tx(x.visual) || x.visual, { size: x.text != null ? 'lg' : 'xl', label: word(x) }) : null,
      el('div.flashcard-word', word(x)),
      other(x) && other(x) !== word(x) ? el('div.flashcard-sub', other(x)) : null,
      x.info ? el('p.muted', api.tx(x.info)) : null,
      button(api.t('game.listen'), { variant: 'secondary', icon: '🔊', onClick: listen })].filter(Boolean));
    animate(card, 'pop', 400);
    counter.textContent = `${i + 1} / ${items.length}`;
    prev.disabled = i === 0;
    next.querySelector('span:last-child').textContent = i === items.length - 1 ? api.t('game.finish') : api.t('game.next');
    listen();
  }
  function go(d) {
    api.sfx.tap();
    if (d > 0 && i === items.length - 1) { api.finish({ correct: seen.size, total: seen.size }); return; }
    i = Math.max(0, Math.min(items.length - 1, i + d));
    draw();
  }
  // swipe left/right on the card
  let sx = null;
  card.addEventListener('pointerdown', (e) => { sx = e.clientX; });
  card.addEventListener('pointerup', (e) => { if (sx != null && Math.abs(e.clientX - sx) > 60) go(e.clientX < sx ? 1 : -1); sx = null; });

  root.append(el('div.game', {}, tabs, el('div.game-bar', {}, counter), card, el('div.card-nav', {}, prev, next)));
  draw();
}
