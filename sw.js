'use strict';

const CACHE_NAME = 'haushaltsbuch-pwa-v1';

// Nur Dateien, die beim Installieren des Service Workers zwingend
// vorhanden sein müssen. Icons werden bei Nutzung automatisch gecacht.
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Keine fremden Domains in diesem einfachen PWA-Cache speichern.
  if (url.origin !== self.location.origin) {
    return;
  }

  // HTML-Navigation: online möglichst aktuelle Version laden.
  // Offline auf die gecachte App zurückfallen.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put('./index.html', copy));
          }
          return response;
        })
        .catch(() =>
          caches.match('./index.html')
            .then(cached => cached || caches.match('./'))
        )
    );
    return;
  }

  // CSS, JS, Manifest, Icons usw.: Cache first.
  event.respondWith(
    caches.match(request)
      .then(cached => {
        if (cached) {
          return cached;
        }

        return fetch(request).then(response => {
          if (
            response &&
            response.status === 200 &&
            response.type === 'basic'
          ) {
            const copy = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, copy));
          }

          return response;
        });
      })
  );
});
