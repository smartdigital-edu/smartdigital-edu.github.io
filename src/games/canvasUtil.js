/** Canvas helpers shared by tracing and colouring. */

/** Size a canvas to its CSS box × devicePixelRatio, keeping a fixed logical size. */
export function setupCanvas(canvas, logical = 600) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = logical * dpr;
  canvas.height = logical * dpr;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, dpr, logical };
}

/** Pointer position in logical canvas units. */
export function pointerPos(canvas, e, logical = 600) {
  const r = canvas.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * logical, y: ((e.clientY - r.top) / r.height) * logical };
}

/** Attach freehand drawing with pointer events. draw(from, to) is called per segment. */
export function attachDraw(canvas, { onStart, onSegment, onEnd, logical = 600 }) {
  let last = null;
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    last = pointerPos(canvas, e, logical);
    onStart?.(last);
    onSegment(last, last);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!last) return;
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of events) {
      const p = pointerPos(canvas, ev, logical);
      onSegment(last, p);
      last = p;
    }
  });
  const end = () => { if (last) { last = null; onEnd?.(); } };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', end);
}

/** Scale an SVG path (in a viewBox) to fit the logical canvas with padding. */
export function pathTransform(viewBox = '0 0 100 100', logical = 600, pad = 0.1) {
  const [x, y, w, h] = viewBox.split(/[ ,]+/).map(Number);
  const s = (logical * (1 - pad * 2)) / Math.max(w, h);
  const ox = (logical - w * s) / 2 - x * s;
  const oy = (logical - h * s) / 2 - y * s;
  return { s, ox, oy };
}

/**
 * Coverage of a guide mask by the learner's strokes, sampled on a grid.
 * Returns { coverage: 0..1, off: 0..1 } where off = ink outside the tolerance mask.
 */
export function coverage(guideData, toleranceData, inkData, step = 6, width) {
  let guide = 0; let hit = 0; let ink = 0; let off = 0;
  const w = width;
  const h = guideData.length / 4 / w;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4 + 3;
      const g = guideData[i] > 40;
      const k = inkData[i] > 40;
      if (g) { guide += 1; if (k) hit += 1; }
      if (k) { ink += 1; if (toleranceData[i] <= 40) off += 1; }
    }
  }
  return { coverage: guide ? hit / guide : 0, off: ink ? off / ink : 0 };
}
