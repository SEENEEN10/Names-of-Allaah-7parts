/* ─────────────────────────────────────────────────────────────
   بأسمائه نحيا — Service Worker  v3
   Strategy:
     • Precache the tiny shell pages (index + 7 reader shells, font).
       Each shell is now ~39 KB — total precache < 400 KB.
     • Content chunks (~185 KB each) are NOT precached upfront;
       they are fetched on demand and cached stale-while-revalidate,
       so the first chunk of a name appears in <1 s on mobile and
       every subsequent visit is served from cache instantly.
   Bump CACHE_VERSION to push a full refresh to all visitors.
   ──────────────────────────────────────────────────────────── */
/* v3 — switched from self-contained 5-7 MB partN.html pages to
   lightweight 39 KB shells + on-demand chunk loading.
   Cache key bumped so existing visitors discard the old cache.   */
const CACHE_VERSION = 'asma-v5-2026-05-09-qareeb';

/* Only precache the shell files — tiny and needed for every visit */
const SHELL = [
  './',
  'index.html',
  'assets/uthmanic-hafs.otf',
  'part1.html',
  'part2.html',
  'part3.html',
  'part4.html',
  'part5.html',
  'part6.html',
  'part7.html',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache =>
      Promise.all(SHELL.map(url =>
        cache.add(new Request(url, { cache: 'reload' })).catch(() => {})
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  /* Only handle same-origin requests */
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_VERSION).then(cache =>
      cache.match(req).then(cached => {
        const isContentRequest =
          url.pathname.endsWith('.html') ||
          url.pathname.includes('/chapters/');
        const requestToFetch = isContentRequest
          ? new Request(req, { cache: 'reload' })
          : req;
        const network = fetch(requestToFetch).then(res => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        }).catch(() => cached);
        /* Content is network-first so text updates reach returning visitors. */
        if (isContentRequest) return network;
        /* Static assets stay cache-first for fast repeat visits. */
        return cached || network;
      })
    )
  );
});
