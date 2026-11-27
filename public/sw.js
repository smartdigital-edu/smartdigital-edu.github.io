/*
 * Service worker: offline support for the app shell and content.
 *  - Navigations: network first, fall back to the cached index.html.
 *  - Same-origin assets (hashed JS/CSS chunks, JSON content, icons, audio):
 *    stale-while-revalidate, so every activity you have opened once works offline.
 *  - Firebase / Google APIs are never cached here (Firestore has its own offline cache).
 * Bump VERSION to force clients to drop old caches.
 */
const VERSION = 'v1';
const CACHE = `bijak-${VERSION}`;
const SHELL = ['./', './index.html', './sw.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      await cache.addAll(SHELL);
      // Precache every asset referenced by index.html (entry JS + CSS).
      try {
        const html = await (await fetch('./index.html', { cache: 'no-cache' })).text();
        const urls = [...html.matchAll(/(?:src|href)="(\.\/[^"]+)"/g)].map((m) => m[1]);
        await cache.addAll(urls);
      } catch { /* offline during install: runtime caching will fill in */ }
    }).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('bijak-') && k !== CACHE).map((k) => caches.delete(k))))
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
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html')),
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      const network = fetch(req).then((res) => {
        if (res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || network;
    }),
  );
});
