// Forester 임업 월보 — service worker
// news.json은 항상 네트워크 우선(최신 소식), 실패 시 캐시. 나머지 앱 파일은 캐시 후 백그라운드 갱신.
const CACHE = 'forester-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  if (url.pathname.endsWith('/news.json')) {
    e.respondWith(
      fetch(e.request, {cache: 'no-store'})
        .then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put('/news.json', copy)); return r; })
        .catch(() => caches.match('/news.json'))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(hit => {
      const net = fetch(e.request).then(r => {
        if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
        return r;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
