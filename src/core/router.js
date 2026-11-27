/**
 * Hash router (works on GitHub Pages without server rewrites).
 * Routes: { '/play/:module/:activity': handler }. Handlers receive
 * ({ params, query }) and render into the outlet.
 */
const routes = [];
let notFound = () => {};
let beforeEach = () => true;

export function route(pattern, handler) {
  const keys = [];
  const re = new RegExp(`^${pattern.replace(/\/:(\w+)/g, (_, k) => { keys.push(k); return '/([^/]+)'; })}/?$`);
  routes.push({ re, keys, handler, pattern });
}

export const setNotFound = (fn) => { notFound = fn; };
export const setGuard = (fn) => { beforeEach = fn; };

export function parseHash(hash = location.hash) {
  const raw = hash.replace(/^#/, '') || '/';
  const [path, qs = ''] = raw.split('?');
  return { path: path || '/', query: Object.fromEntries(new URLSearchParams(qs)) };
}

export function navigate(path, { replace = false } = {}) {
  const target = `#${path}`;
  if (location.hash === target) { resolve(); return; }
  if (replace) { history.replaceState(null, '', target); resolve(); }
  else location.hash = target;
}

export const currentPath = () => parseHash().path;

export async function resolve() {
  const { path, query } = parseHash();
  for (const r of routes) {
    const m = path.match(r.re);
    if (!m) continue;
    const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
    const ok = await beforeEach({ path, pattern: r.pattern, params, query });
    if (ok === false) return;
    if (typeof ok === 'string') { navigate(ok, { replace: true }); return; }
    await r.handler({ params, query, path });
    return;
  }
  notFound({ path });
}

export function startRouter() {
  window.addEventListener('hashchange', resolve);
  resolve();
}
