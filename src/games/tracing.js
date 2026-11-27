/**
 * tracing – trace a letter, number or shape on canvas. The learner's ink is
 * compared with the guide: enough coverage and staying on the line = pass.
 * Question JSON: { text: "A" }  or  { path: "M…", viewBox: "0 0 100 100", label }
 */
import { el, button } from '../core/ui.js';
import { engineFrom } from './runner.js';
import { setupCanvas, attachDraw, pathTransform, coverage } from './canvasUtil.js';

const L = 600;
const FONT = '700 440px Fredoka, "Baloo 2", "Arial Rounded MT Bold", Arial, sans-serif';

/** Draw the guide shape onto a context: mode 'fill' (letters) or 'stroke' (shapes). */
function drawGuide(c, q, { color, width, dash }) {
  c.save();
  c.strokeStyle = color;
  c.fillStyle = color;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.lineWidth = width;
  if (dash) c.setLineDash(dash);
  if (q.text != null) {
    c.font = FONT;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(q.text, L / 2, L / 2 + 20);
    if (width) c.strokeText(q.text, L / 2, L / 2 + 20);
  } else {
    const { s, ox, oy } = pathTransform(q.viewBox, L, 0.14);
    c.translate(ox, oy);
    c.scale(s, s);
    c.lineWidth = width / s;
    if (dash) c.setLineDash(dash.map((d) => d / s));
    c.stroke(new Path2D(q.path));
  }
  c.restore();
}

function render(q, { stage }, ctx) {
  const { api } = ctx;
  const label = q.label ? api.tx(q.label) : q.text;
  const say = api.lang === 'ms' ? `Surih ${label}` : `Trace ${label}`;
  ctx.setPrompt(say, { say });
  const wrap = el('div.canvas-wrap');
  const guideCv = el('canvas', { 'aria-hidden': 'true' });
  const inkCv = el('canvas', { 'aria-label': api.t('game.traceHint'), role: 'img' });
  wrap.append(guideCv, inkCv);
  stage.append(wrap);

  const { ctx: g } = setupCanvas(guideCv, L);
  const { ctx: ink } = setupCanvas(inkCv, L);
  const isText = q.text != null;
  // Visible guide: soft shape + dotted centre line.
  drawGuide(g, q, { color: '#ece6f5', width: isText ? 0 : 54 });
  drawGuide(g, q, { color: '#b9aed0', width: 4, dash: [2, 14] });

  // Hidden masks for scoring: guide area and a wider tolerance zone.
  const mk = (width) => {
    const cv = document.createElement('canvas');
    const { ctx: m } = setupCanvas(cv, L);
    drawGuide(m, q, { color: '#000', width });
    return m.getImageData(0, 0, cv.width, cv.height).data;
  };
  const guideMask = mk(isText ? 0 : 40);
  const tolMask = mk(isText ? 70 : 110);

  const colors = ['#ff6b6b', '#4d96ff', '#6bcb77', '#c77dff', '#ff9f45'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  attachDraw(inkCv, {
    logical: L,
    onSegment(a, b) {
      ink.strokeStyle = color;
      ink.lineWidth = isText ? 34 : 30;
      ink.lineCap = 'round';
      ink.lineJoin = 'round';
      ink.beginPath();
      ink.moveTo(a.x, a.y);
      ink.lineTo(b.x, b.y);
      ink.stroke();
    },
  });

  const hint = el('p.muted', { style: { textAlign: 'center', margin: '.25rem 0' }, 'aria-live': 'polite' }, api.t('game.traceHint'));
  const check = button(api.t('game.check'), {
    icon: '✔',
    onClick: () => {
      const data = ink.getImageData(0, 0, inkCv.width, inkCv.height).data;
      const res = coverage(guideMask, tolMask, data, 6, inkCv.width);
      const ok = res.coverage >= (q.minCoverage ?? 0.55) && res.off <= 0.35;
      if (!ok) hint.textContent = res.off > 0.35 ? api.t('game.traceOff') : api.t('game.traceMore');
      if (ok) api.sfx.win();
      if (ctx.attempt(ok, wrap)) { check.disabled = true; resetBtn.disabled = true; }
      else if (!ok && !ctx.once) api.speak(hint.textContent);
    },
  });
  const resetBtn = button(api.t('game.clear'), { variant: 'secondary', icon: '🧽', onClick: () => ink.clearRect(0, 0, L, L) });
  stage.append(hint, el('div.next-row', {}, resetBtn, check));
}

export default engineFrom(render);
