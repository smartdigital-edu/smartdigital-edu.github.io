/**
 * Namespaced localStorage helpers (safe when storage is unavailable,
 * e.g. Safari private mode). Each app gets its own namespace.
 */
const NS = typeof __APP__ !== 'undefined' ? __APP__ : 'app';

function safe(fn, fallback) {
  try { return fn(); } catch { return fallback; }
}

export const store = {
  get(key, fallback = null) {
    return safe(() => {
      const raw = localStorage.getItem(`${NS}:${key}`);
      return raw == null ? fallback : JSON.parse(raw);
    }, fallback);
  },
  set(key, value) {
    safe(() => localStorage.setItem(`${NS}:${key}`, JSON.stringify(value)));
  },
  remove(key) {
    safe(() => localStorage.removeItem(`${NS}:${key}`));
  },
};
