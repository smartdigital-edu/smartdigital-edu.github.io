/**
 * colouring – free colouring canvas: brush, tap-fill (flood fill), eraser,
 * brush size, palette + colour picker, undo, clear and save as PNG.
 * Config JSON: { pictures: [{ id, name, viewBox, paths: ["M…"] }], palette: ["#hex"] }
 * Two layers: paint (bottom, editable) and outline (top, fixed). Flood fill
 * treats the outline layer as walls, so brush strokes never "leak" a fill.
 */
import { el, button, clear } from '../core/ui.js';
import { setupCanvas, attachDraw, pathTransform, pointerPos } from './canvasUtil.js';

const L = 600;

export default function colouring(root, config, api) {
  const palette = config.palette;
  const state = { tool: 'fill', color: palette[0], size: 18, picture: config.pictures[0] };
  const undo = [];

  const wrap = el('div.canvas-wrap');
  const paintCv = el('canvas', { role: 'img', 'aria-label': api.tx(state.picture.name) });
  const lineCv = el('canvas.top', { 'aria-hidden': 'true' });
  wrap.append(paintCv, lineCv);
  const { ctx: paint, dpr } = setupCanvas(paintCv, L);
  const { ctx: line } = setupCanvas(lineCv, L);

  function drawOutline(pic) {
    line.clearRect(0, 0, L, L);
    const { s, ox, oy } = pathTransform(pic.viewBox, L, 0.06);
    line.save();
    line.translate(ox, oy);
    line.scale(s, s);
    line.lineWidth = 5 / s;
    line.lineJoin = 'round';
    line.lineCap = 'round';
    line.strokeStyle = '#222';
    pic.paths.forEach((p) => line.stroke(new Path2D(p)));
    line.restore();
  }
  function resetPaint() {
    paint.save();
    paint.setTransform(1, 0, 0, 1, 0, 0);
    paint.fillStyle = '#fff';
    paint.fillRect(0, 0, paintCv.width, paintCv.height);
    paint.restore();
  }
  const snapshot = () => {
    undo.push(paint.getImageData(0, 0, paintCv.width, paintCv.height));
    if (undo.length > 25) undo.shift();
  };

  function choosePicture(pic) {
    state.picture = pic;
    undo.length = 0;
    resetPaint();
    drawOutline(pic);
    paintCv.setAttribute('aria-label', api.tx(pic.name));
    picks.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b._pic === pic)));
    api.speak(api.tx(pic.name));
  }

  /* -------- flood fill (scanline) -------- */
  function floodFill(px, py, hex) {
    const W = paintCv.width;
    const H = paintCv.height;
    const x0 = Math.floor(px * dpr);
    const y0 = Math.floor(py * dpr);
    if (x0 < 0 || y0 < 0 || x0 >= W || y0 >= H) return;
    const img = paint.getImageData(0, 0, W, H);
    const walls = line.getImageData(0, 0, W, H).data;
    const d = new Uint32Array(img.data.buffer);
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const fill = (255 << 24) | (b << 16) | (g << 8) | r; // little-endian RGBA
    const start = d[y0 * W + x0];
    if (start === fill || walls[(y0 * W + x0) * 4 + 3] > 100) return;
    const tol = 48;
    const sr = start & 255; const sg = (start >> 8) & 255; const sb = (start >> 16) & 255;
    const same = (i) => {
      if (walls[i * 4 + 3] > 100) return false;
      const c = d[i];
      return Math.abs((c & 255) - sr) + Math.abs(((c >> 8) & 255) - sg) + Math.abs(((c >> 16) & 255) - sb) <= tol;
    };
    const stack = [[x0, y0]];
    while (stack.length) {
      const [x, y] = stack.pop();
      let xl = x;
      while (xl >= 0 && same(y * W + xl)) xl -= 1;
      xl += 1;
      let up = false; let down = false;
      for (let xi = xl; xi < W && same(y * W + xi); xi += 1) {
        d[y * W + xi] = fill;
        if (y > 0) { const s = same((y - 1) * W + xi); if (s && !up) { stack.push([xi, y - 1]); up = true; } else if (!s) up = false; }
        if (y < H - 1) { const s = same((y + 1) * W + xi); if (s && !down) { stack.push([xi, y + 1]); down = true; } else if (!s) down = false; }
      }
    }
    paint.putImageData(img, 0, 0);
  }

  /* -------- input -------- */
  paintCv.addEventListener('pointerdown', (e) => {
    if (state.tool !== 'fill') return;
    snapshot();
    const p = pointerPos(paintCv, e, L);
    floodFill(p.x, p.y, state.color);
    api.sfx.pop();
  });
  attachDraw(paintCv, {
    logical: L,
    onStart() { if (state.tool !== 'fill') snapshot(); },
    onSegment(a, b) {
      if (state.tool === 'fill') return;
      paint.strokeStyle = state.tool === 'eraser' ? '#ffffff' : state.color;
      paint.lineWidth = state.size;
      paint.lineCap = 'round';
      paint.lineJoin = 'round';
      paint.beginPath();
      paint.moveTo(a.x, a.y);
      paint.lineTo(b.x, b.y);
      paint.stroke();
    },
  });

  /* -------- toolbar -------- */
  const toolBtn = (id, icon, key) => el('button.tool', {
    type: 'button', 'aria-pressed': String(state.tool === id), dataset: { tool: id },
    onclick: () => { state.tool = id; tools.querySelectorAll('[data-tool]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === id))); },
  }, el('span', { 'aria-hidden': 'true' }, icon), api.t(key));
  const sizeIn = el('input.size-range', { type: 'range', min: 4, max: 60, value: state.size, 'aria-label': api.t('game.size'), oninput: (e) => { state.size = Number(e.target.value); } });
  const tools = el('div.toolbar', {},
    toolBtn('fill', '🪣', 'game.fill'),
    toolBtn('brush', '🖌️', 'game.brush'),
    toolBtn('eraser', '🧽', 'game.eraser'),
    el('label.tool', {}, el('span', { 'aria-hidden': 'true' }, '⚪'), sizeIn),
    el('button.tool', { type: 'button', onclick: () => { if (undo.length) paint.putImageData(undo.pop(), 0, 0); } }, el('span', { 'aria-hidden': 'true' }, '↩️'), api.t('game.undo')),
    el('button.tool', { type: 'button', onclick: () => { snapshot(); resetPaint(); } }, el('span', { 'aria-hidden': 'true' }, '🗑️'), api.t('game.clear')),
    el('button.tool', { type: 'button', onclick: savePng }, el('span', { 'aria-hidden': 'true' }, '💾'), api.t('game.save')));

  const swatches = el('div.palette', { role: 'radiogroup', 'aria-label': api.t('game.colour') });
  const setColor = (c) => {
    state.color = c;
    if (state.tool === 'eraser') tools.querySelector('[data-tool=fill]').click();
    swatches.querySelectorAll('.swatch-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.c === c)));
  };
  palette.forEach((c) => swatches.append(el('button.swatch-btn', { type: 'button', 'aria-label': c, 'aria-pressed': String(c === state.color), dataset: { c }, style: { background: c }, onclick: () => setColor(c) })));
  swatches.append(el('input.color-picker', { type: 'color', value: '#ff69b4', 'aria-label': api.t('game.pickColour'), oninput: (e) => setColor(e.target.value) }));

  const picks = el('div.picture-pick', { role: 'group', 'aria-label': api.t('game.pictures') });
  config.pictures.forEach((pic) => {
    const b = el('button', {
      type: 'button', 'aria-label': api.tx(pic.name), 'aria-pressed': 'false', onclick: () => choosePicture(pic),
      html: `<svg viewBox="${pic.viewBox}" aria-hidden="true">${pic.paths.map((p) => `<path d="${p}" fill="none" stroke="#333" stroke-width="3"/>`).join('')}</svg>`,
    });
    b._pic = pic;
    picks.append(b);
  });

  function savePng() {
    const out = document.createElement('canvas');
    out.width = paintCv.width;
    out.height = paintCv.height;
    const o = out.getContext('2d');
    o.drawImage(paintCv, 0, 0);
    o.drawImage(lineCv, 0, 0);
    const a = el('a', { href: out.toDataURL('image/png'), download: `${api.app.id}-${state.picture.id}.png` });
    document.body.append(a);
    a.click();
    a.remove();
  }

  clear(root).append(el('div.game', {}, picks, swatches, wrap, tools,
    el('div.next-row', {}, button(api.t('game.done'), { icon: '✔', onClick: () => api.finish({ correct: 1, total: 1 }) }))));
  choosePicture(state.picture);
}
