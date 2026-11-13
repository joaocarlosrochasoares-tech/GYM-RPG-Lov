const CACHE = 'gymrpg-midina-v6';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Nunca fazer cache de chamadas ao Firebase ou Google Drive API
  if (/firebaseio\.com|firebasedatabase\.app|googleapis\.com|accounts\.google\.com/.test(url.hostname)) return;

  // Estratégia Cache-First para fotos e vídeos da pasta media/ (poupa dados e abre instantaneamente)
  if (url.pathname.includes('/media/')) {
    e.respondWith(
      caches.open(CACHE).then(c => c.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res.status === 200) c.put(e.request, res.clone());
          return res;
        });
      }))
    );
    return;
  }

  // Estratégia Network-First com fallback Offline para o código principal
  e.respondWith(
    fetch(e.request).then(res => {
      if (res && res.status === 200 && url.origin === location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
