// Service Worker — Buku Kelas (Absensi & Nilai IPA)
// Strategi: cache-first untuk aset statis (app shell), network-first sederhana untuk request lain.

const CACHE_VERSION = 'v1';
const CACHE_NAME = `buku-kelas-ipa-${CACHE_VERSION}`;

const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png'
];

// INSTALL: simpan app shell ke cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE: bersihkan cache versi lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('buku-kelas-ipa-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// FETCH: cache-first untuk file yang ada di app shell / same-origin GET,
// jatuh ke jaringan untuk sisanya (mis. Google Apps Script, Google Fonts).
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Hanya tangani GET, biarkan POST (mis. kirim data absensi) langsung ke jaringan.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Untuk request ke domain lain (API, font, dll) — coba jaringan dulu, cache sebagai cadangan.
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Same-origin: cache-first, lalu perbarui cache di latar belakang.
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
