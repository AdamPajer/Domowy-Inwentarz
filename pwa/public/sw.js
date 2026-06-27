const CACHE_NAME = 'inwentarz-cache-v1';

// Instalacja i pobranie "szkieletu" aplikacji
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Zapisujemy w telefonie główny plik aplikacji
      return cache.addAll(['/', '/index.html']);
    })
  );
});

// Zastępowanie Dinozaura naszymi plikami
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Jeśli mamy to w pamięci, oddajemy bez łączenia z Vercel!
      // Jeśli nie, próbujemy pobrać z sieci (gdy internet wróci).
      return cachedResponse || fetch(event.request);
    })
  );
});