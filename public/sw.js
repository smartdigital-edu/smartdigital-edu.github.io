/*
 * Service worker: offline support for the app shell and content.
 *  - Install: precache index.html and every built JS/CSS chunk (the list is
 *    injected at build time by the 'sw-precache' plugin in vite.config.js), so
 *    every activity works offline even if it was never opened online.
 *  - Navigations: network first, fall back to the cached index.html.
 *  - Other same-origin assets (fonts, icons, audio): stale-while-revalidate.
 *  - Firebase / Google APIs are never cached here (Firestore has its own offline cache).
 * APP and VERSION are injected at build time; VERSION changes whenever any
 * built file changes, so each deploy gets a fresh cache and old chunks are dropped.
 * Both apps (and the staging copies) share one origin on GitHub Pages, so caches
 * are prefixed per app and stage, and cleanup only touches this prefix + a hash.
 */
const APP = 'dev';
const VERSION = 'dev';
const PRECACHE = [];
const PREFIX = `${APP}-`;
const CACHE = `${PREFIX}${VERSION}`;
const SHELL = ['./', './index.html'];
// Hosts such as `vite preview` send "Vary: Origin"; crossorigin module requests
// carry an Origin header that precache requests don't, so ignore Vary on lookup.
const MATCH = { ignoreVary: true };

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll([...new Set([...SHELL, ...PRECACHE])]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      // Only this app's own old versions: "kiddora-<hash>" must not match "kiddora-staging-<hash>".
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k.startsWith(PREFIX) && /^[0-9a-f]{10}$/.test(k.slice(PREFIX.length))).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Firebase, fonts CDN etc.

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
        }
        return res;
      }).catch(async () => (await caches.match('./index.html', MATCH)) || Response.error()),
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req, MATCH);
      const network = fetch(req).then((res) => {
        if (res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => cached || Response.error());
      return cached || network;
    }),
  );
});
