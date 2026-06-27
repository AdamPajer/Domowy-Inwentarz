const CACHE_NAME = 'smart-inventory-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Instalacja Service Workera i zapisanie plików do pamięci podręcznej (Cache)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Zwracanie plików z Cache'u, gdy nie ma internetu (Tryb Offline)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // Zwróć wersję zapisaną (offline)
        }
        return fetch(event.request); // Pobierz z internetu
      })
  );
});