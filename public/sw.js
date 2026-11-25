// Smart Budget service worker — makes the app open without a connection.
// - Page (HTML): network first, so a new version is picked up as soon as there
//   is a connection; the cached copy is used only when offline.
// - Built assets (/assets/*, hashed file names) and fonts: cache first.
// Firebase / API requests are never touched.
const CACHE = 'sb-shell-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

const isFont = (url) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  const sameOrigin = url.origin === self.location.origin
  const inScope = sameOrigin && url.pathname.startsWith(new URL(self.registration.scope).pathname)

  if (req.mode === 'navigate' && inScope) {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(self.registration.scope, copy)) }
          return res
        })
        .catch(() => caches.match(self.registration.scope).then(r => r || Response.error()))
    )
    return
  }

  if ((inScope && !url.pathname.endsWith('/sw.js')) || isFont(url)) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)) }
        return res
      }))
    )
  }
})

// ── Push notifications from the home server (Firebase Cloud Messaging) ──
// The server sends data-only messages: { title, body, tag, url }.
self.addEventListener('push', (event) => {
  let p = {}
  try { p = event.data ? event.data.json() : {} } catch { p = {} }
  const d = p.data || p.notification || p
  const title = d.title || 'תקציב חכם'
  event.waitUntil((async () => {
    // If the app is open and in view, the app itself already shows the change.
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    if (wins.some(w => w.visibilityState === 'visible' && w.focused)) return
    await self.registration.showNotification(title, {
      body: d.body || '',
      tag: d.tag || undefined,
      icon: `${self.registration.scope}icon.png`,
      badge: `${self.registration.scope}icon.png`,
      dir: 'rtl', lang: 'he',
      data: { url: d.url || self.registration.scope },
    })
  })())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const open = wins.find(w => w.url.startsWith(self.registration.scope))
    if (open) { await open.focus(); return }
    await self.clients.openWindow(url)
  })())
})
