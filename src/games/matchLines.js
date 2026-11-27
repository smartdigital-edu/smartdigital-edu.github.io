/**
 * matchLines – drag a line from each left item to its matching right item.
 * Tap-left-then-tap-right works too (and with the keyboard).
 * Round JSON: { prompt, say?, pairs: [{ id, left: {visual|text}, right: {visual|text} }] }
 * Score: pairs matched without a wrong attempt.
 */
import { el, visual } from '../core/ui.js';
import { shuffle } from '../core/scoring.js';
import { engineFrom } from './runner.js';

const NS = 'http://www.w3.org/2000/svg';
const COLORS = ['#4D96FF', '#FF6B6B', '#6BCB77', '#C77DFF', '#FF9F45', '#00A6A6'];

function face(side, api) {
  if (side.text != null) return el('span', { style: { fontSize: side.size || '2rem', color: side.color || null } }, api.tx(side.text));
  return visual(side.visual, { size: 'md' });
}

function render(q, { stage }, ctx) {
  const { api } = ctx;
  ctx.setPrompt(api.tx(q.prompt), { say: q.say ? api.tx(q.say) : undefined });
  const board = el('div.match-board');
  const svg = document.createElementNS(NS, 'svg');
  svg.classList.add('match-svg');
  const left = el('div.match-col.left');
  const right = el('div.match-col.right');
  board.append(left, right, svg);
  stage.append(board);

  const pairs = q.pairs;
  const wrongIds = new Set();
  let done = 0;
  let selected = null;
  let live = null;

  const mk = (p, side) => el('button.match-item', {
    type: 'button', dataset: { id: p.id, side },
    'aria-label': api.tx(p[side].label || p[side].text || p[side].visual),
  }, face(p[side], api), el('span.dot', { 'aria-hidden': 'true' }));

  shuffle(pairs).forEach((p) => left.append(mk(p, 'left')));
  shuffle(pairs).forEach((p) => right.append(mk(p, 'right')));

  const dotPos = (item) => {
    const b = board.getBoundingClientRect();
    const r = item.querySelector('.dot').getBoundingClientRect();
    return { x: r.left + r.width / 2 - b.left, y: r.top + r.height / 2 - b.top };
  };
  const line = (a, color) => {
    const l = document.createElementNS(NS, 'line');
    l.setAttribute('x1', a.x); l.setAttribute('y1', a.y); l.setAttribute('x2', a.x); l.setAttribute('y2', a.y);
    l.setAttribute('stroke', color);
    svg.append(l);
    return l;
  };

  function tryMatch(l, r) {
    if (!l || !r || l.classList.contains('done') || r.classList.contains('done')) return false;
    const id = l.dataset.id;
    if (id === r.dataset.id) {
      const color = COLORS[done % COLORS.length];
      const a = dotPos(l);
      const b = dotPos(r);
      const ln = line(a, color);
      ln.setAttribute('x2', b.x); ln.setAttribute('y2', b.y);
      ln.dataset.pair = id;
      l.classList.add('done'); r.classList.add('done');
      l.disabled = r.disabled = true;
      done += 1;
      ctx.right(r);
      if (api.kids) api.speak(api.tx(pairs.find((p) => p.id === id).say || pairs.find((p) => p.id === id).right.label || ''));
      if (done === pairs.length) setTimeout(() => ctx.complete({ correct: pairs.length - wrongIds.size, total: pairs.length }), 500);
      return true;
    }
    wrongIds.add(id);
    ctx.wrong(r);
    return false;
  }

  // Redraw finished lines on resize / orientation change.
  const ro = new ResizeObserver(() => {
    svg.querySelectorAll('line[data-pair]').forEach((ln) => {
      const id = ln.dataset.pair;
      const a = dotPos(left.querySelector(`[data-id="${id}"]`));
      const b = dotPos(right.querySelector(`[data-id="${id}"]`));
      ln.setAttribute('x1', a.x); ln.setAttribute('y1', a.y); ln.setAttribute('x2', b.x); ln.setAttribute('y2', b.y);
    });
  });
  ro.observe(board);

  board.addEventListener('pointerdown', (e) => {
    const item = e.target.closest('.match-item');
    if (!item || item.disabled) return;
    if (item.dataset.side === 'right') {
      if (selected) { tryMatch(selected, item); selected.classList.remove('selected'); selected = null; }
      return;
    }
    e.preventDefault();
    selected?.classList.remove('selected');
    selected = item;
    item.classList.add('selected');
    const a = dotPos(item);
    live = { line: line(a, '#999'), from: item, moved: false };
    board.setPointerCapture(e.pointerId);
  });
  board.addEventListener('pointermove', (e) => {
    if (!live) return;
    const b = board.getBoundingClientRect();
    live.moved = true;
    live.line.setAttribute('x2', e.clientX - b.left);
    live.line.setAttribute('y2', e.clientY - b.top);
  });
  const finish = (e) => {
    if (!live) return;
    const { line: ln, from, moved } = live;
    live = null;
    ln.remove();
    if (!moved) return; // a tap: keep selection, wait for a tap on the right side
    const target = document.elementsFromPoint(e.clientX, e.clientY).map((n) => n.closest?.('.match-item')).find((n) => n && n.dataset.side === 'right');
    if (target) { tryMatch(from, target); from.classList.remove('selected'); selected = null; }
  };
  board.addEventListener('pointerup', finish);
  board.addEventListener('pointercancel', () => { live?.line.remove(); live = null; });
  // keyboard
  board.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const item = e.target.closest('.match-item');
    if (!item) return;
    e.preventDefault();
    if (item.dataset.side === 'left') { selected?.classList.remove('selected'); selected = item; item.classList.add('selected'); }
    else if (selected) { tryMatch(selected, item); selected.classList.remove('selected'); selected = null; }
  });
}

export default engineFrom(render, { unit: 'round' });
