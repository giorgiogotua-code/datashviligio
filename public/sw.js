// Network-first service worker.
// Cache-first was serving stale JS after deploys (e.g. an old POS cart),
// so we prefer the network and only fall back to cache when offline.
const CACHE = 'pos-v2'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)

  // Only handle same-origin GET; let API/Supabase/R2/cross-origin pass through.
  if (e.request.method !== 'GET') return
  if (url.hostname !== self.location.hostname) return
  if (url.pathname.startsWith('/api/')) return

  // Network-first: always try the latest, fall back to cache when offline.
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache successful static assets for offline use.
        const dest = e.request.destination
        if (res.ok && (dest === 'script' || dest === 'style' || dest === 'font' || dest === 'image')) {
          const copy = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, copy))
        }
        return res
      })
      .catch(() => caches.match(e.request))
  )
})
