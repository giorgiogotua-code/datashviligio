const CACHE = 'pos-v1'

self.addEventListener('install', () => { self.skipWaiting() })

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)

  // Skip: non-GET, API, Supabase, R2, external
  if (e.request.method !== 'GET') return
  if (url.pathname.startsWith('/api/')) return
  if (url.hostname !== self.location.hostname) return

  const dest = e.request.destination
  if (dest === 'script' || dest === 'style' || dest === 'font' || dest === 'image') {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(e.request).then(cached =>
          cached || fetch(e.request).then(res => {
            if (res.ok) cache.put(e.request, res.clone())
            return res
          })
        )
      )
    )
  }
})
