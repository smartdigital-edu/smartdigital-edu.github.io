/**
 * Minimal UI kit: DOM builder + common widgets (buttons, dialogs, toasts,
 * loader, stars, confetti). No framework – screens are plain functions.
 */
import { t } from './i18n/index.js';

/**
 * el('button.btn.primary', { onclick, 'aria-label': 'x' }, 'Text', childEl)
 * Supports tag#id.class syntax, attributes, `on*` handlers, style objects, dataset.
 */
export function el(spec, attrs = {}, ...children) {
  if (attrs == null || typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs)) {
    children.unshift(attrs);
    attrs = {};
  }
  const [, tag = 'div', rest = ''] = spec.match(/^([a-z0-9-]*)(.*)$/i);
  const node = document.createElement(tag || 'div');
  rest.replace(/([#.])([\w-]+)/g, (_, sym, name) => {
    if (sym === '#') node.id = name; else node.classList.add(name);
  });
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v)) {
        if (sv == null) continue;
        if (sk.startsWith('--')) node.style.setProperty(sk, sv); else node.style[sk] = sv;
      }
    }
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k === 'class') node.className += ` ${v}`;
    else if (k === 'html') node.innerHTML = v;
    else if (k in node && typeof v !== 'string') node[k] = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  append(node, children);
  return node;
}

function append(node, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export const clear = (node) => { while (node.firstChild) node.firstChild.remove(); return node; };

/** Big rounded button with optional emoji icon. */
export function button(label, { icon, variant = 'primary', onClick, aria, type = 'button', cls = '' } = {}) {
  return el(`button.btn.${variant}`, { type, onclick: onClick, 'aria-label': aria || null, class: cls || null },
    icon ? el('span.btn-icon', { 'aria-hidden': 'true' }, icon) : null,
    label ? el('span', label) : null);
}

export function backButton(href) {
  return el('a.btn.ghost.back', { href: href || '#/home', 'aria-label': t('nav.back') },
    el('span.btn-icon', { 'aria-hidden': 'true' }, '⬅'), el('span', t('nav.back')));
}

/** Screen scaffold: title row with back button + content area. */
export function screen(title, { back, actions = [], cls = '' } = {}, ...content) {
  return el(`section.screen${cls ? `.${cls}` : ''}`, {},
    el('div.screen-head', {},
      back !== false ? backButton(back) : el('span'),
      el('h1.screen-title', { tabindex: '-1' }, title),
      el('div.screen-actions', {}, actions)),
    ...content);
}

/* ---------------- toast ---------------- */
let toastTimer;
export function toast(message, { type = 'info', ms = 3200 } = {}) {
  let host = document.getElementById('toast');
  if (!host) {
    host = el('div#toast.toast', { role: 'status', 'aria-live': 'polite' });
    document.body.append(host);
  }
  host.className = `toast show ${type}`;
  host.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => host.classList.remove('show'), ms);
}

/* ---------------- dialogs ---------------- */
/** Accessible modal dialog. Resolves with the value of the button pressed. */
export function dialog({ title, body, buttons }) {
  return new Promise((resolve) => {
    const prev = document.activeElement;
    const close = (val) => {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
      resolve(val);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close(null);
      if (e.key === 'Tab') trapFocus(e, box);
    };
    const box = el('div.dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'dlg-title' },
      el('h2#dlg-title', title),
      body ? (body instanceof Node ? body : el('p', body)) : null,
      el('div.dialog-actions', {}, buttons.map((b) => button(b.label, { variant: b.variant || 'secondary', onClick: () => close(b.value) }))));
    const overlay = el('div.overlay', { onclick: (e) => { if (e.target === overlay) close(null); } }, box);
    document.body.append(overlay);
    document.addEventListener('keydown', onKey);
    (box.querySelector('input, select') || box.querySelector('.btn.primary, .btn.danger') || box.querySelector('button'))?.focus();
  });
}

export function confirmDialog(message, { title = '', danger = true, okLabel } = {}) {
  return dialog({
    title: title || message,
    body: title ? message : null,
    buttons: [
      { label: t('dialog.cancel'), value: false, variant: 'secondary' },
      { label: okLabel || t('dialog.confirm'), value: true, variant: danger ? 'danger' : 'primary' },
    ],
  }).then((v) => v === true);
}

function trapFocus(e, box) {
  const f = box.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (!f.length) return;
  const first = f[0];
  const last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

/* ---------------- loader ---------------- */
export function loader(text = t('app.ready')) {
  return el('div.loader', { role: 'status' },
    el('div.loader-bounce', { 'aria-hidden': 'true' }, el('span'), el('span'), el('span')),
    el('p', text));
}

/* ---------------- stars ---------------- */
export function stars(n, max = 3) {
  return el('div.stars', { role: 'img', 'aria-label': `${n} / ${max} ★` },
    Array.from({ length: max }, (_, i) => el(`span.star${i < n ? '.on' : ''}`, { 'aria-hidden': 'true', style: { animationDelay: `${i * 0.25}s` } }, '★')));
}

/* ---------------- motion ---------------- */
export const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Restartable CSS animation helper (e.g. 'shake', 'pop'). */
export function animate(node, cls, ms = 600) {
  if (!node) return;
  node.classList.remove(cls);
  void node.offsetWidth; // restart animation
  node.classList.add(cls);
  setTimeout(() => node.classList.remove(cls), ms);
}

/** Canvas confetti burst; skipped for reduced-motion users. */
export function confetti({ count = 120, duration = 2600 } = {}) {
  if (reducedMotion()) return;
  const c = el('canvas.confetti', { 'aria-hidden': 'true' });
  document.body.append(c);
  const ctx = c.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W = (c.width = innerWidth * dpr);
  const H = (c.height = innerHeight * dpr);
  const colors = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C77DFF', '#FF9F45'];
  const parts = Array.from({ length: count }, () => ({
    x: W / 2 + (Math.random() - 0.5) * W * 0.3,
    y: H * 0.35,
    vx: (Math.random() - 0.5) * 16 * dpr,
    vy: (-Math.random() * 14 - 4) * dpr,
    r: (4 + Math.random() * 5) * dpr,
    color: colors[(Math.random() * colors.length) | 0],
    rot: Math.random() * 6,
  }));
  const start = performance.now();
  (function frame(now) {
    const p = (now - start) / duration;
    ctx.clearRect(0, 0, W, H);
    for (const q of parts) {
      q.vy += 0.35 * dpr;
      q.x += q.vx;
      q.y += q.vy;
      q.rot += 0.2;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - p);
      ctx.translate(q.x, q.y);
      ctx.rotate(q.rot);
      ctx.fillStyle = q.color;
      ctx.fillRect(-q.r, -q.r / 2, q.r * 2, q.r);
      ctx.restore();
    }
    if (p < 1) requestAnimationFrame(frame); else c.remove();
  })(start);
}

/** Simple emoji/image "visual" renderer used by every game. */
export function visual(v, { size = 'lg', label } = {}) {
  if (v == null) return null;
  if (typeof v === 'object' && v.img) {
    return el(`img.visual.${size}`, { src: v.img, alt: label || v.alt || '', draggable: 'false' });
  }
  if (typeof v === 'object' && v.shape) {
    // Inline SVG shape: { shape: "M…", fill?: "#hex", outline?: true, viewBox? }
    const fill = v.outline ? 'none' : (v.fill || '#4D96FF');
    const stroke = v.outline ? '#333' : 'rgba(0,0,0,.35)';
    return el(`span.visual.svg.${size}`, {
      role: label ? 'img' : null, 'aria-label': label || null, 'aria-hidden': label ? null : 'true',
      html: `<svg viewBox="${v.viewBox || '0 0 100 100'}" width="1em" height="1em"><path d="${v.shape}" fill="${fill}" stroke="${stroke}" stroke-width="${v.outline ? 4 : 2}" stroke-linejoin="round" ${v.outline ? 'stroke-dasharray="7 5"' : ''}/></svg>`,
    });
  }
  if (typeof v === 'object' && v.emoji) {
    // { emoji, shadow: true } renders a black silhouette (guess the shadow).
    return el(`span.visual.emoji.${size}${v.shadow ? '.shadow' : ''}`, { role: label ? 'img' : null, 'aria-label': label || null, 'aria-hidden': label ? null : 'true' }, v.emoji);
  }
  if (typeof v === 'object' && v.color) {
    return el(`span.visual.swatch.${size}`, { style: { background: v.color }, role: label ? 'img' : null, 'aria-label': label || null });
  }
  return el(`span.visual.emoji.${size}`, { role: label ? 'img' : null, 'aria-label': label || null, 'aria-hidden': label ? null : 'true' }, String(v));
}

/** Preload a list of image URLs (resolves even if some fail). */
export function preloadImages(urls) {
  return Promise.all(urls.map((src) => new Promise((res) => {
    const i = new Image();
    i.onload = i.onerror = () => res();
    i.src = src;
  })));
}
