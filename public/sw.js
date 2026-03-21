// sw.js — EimemesChat AI Service Worker
// v3 — Immediate update on every deploy via network-first for HTML

const CACHE_NAME = 'eimemeschat-v3';

const SHELL_ASSETS = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

// ── Install ───────────────────────────────────────────────────────
self.addEventListener('install', event => {
  // Skip waiting — activate immediately, don't wait for old SW to die
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS))
  );
});

// ── Activate ──────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  // Claim all clients immediately — new SW takes over right away
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Delete ALL old caches
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      ),
    ])
  );
});

// ── Fetch ─────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API, Firebase, external — always network, never cache
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('google') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('groq') ||
    url.hostname.includes('fonts.googleapis') ||
    url.hostname.includes('cdn.jsdelivr') ||
    url.hostname.includes('cdnjs')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // HTML navigation — NETWORK FIRST, always get latest
  // This is the key fix: index.html always comes from network
  // so new deployments are reflected immediately
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache the fresh response
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match('/index.html')) // offline fallback
    );
    return;
  }

  // JS/CSS/images — cache first (they have hashed filenames from Vite so safe)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// ── Tell all open tabs to reload when new SW activates ────────────
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
