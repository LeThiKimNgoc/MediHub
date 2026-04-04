const CACHE_NAME = 'medihub-offline-v1';

// Lập tức kích hoạt vệ sĩ khi vừa cài đặt
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Chiến thuật: Có mạng thì lấy đồ mới nhất. Mất mạng thì lôi đồ cũ trong kho ra xài.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const resClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, resClone); // Cất giao diện vào két sắt
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request); // Mất mạng -> Lấy từ két sắt ra
      })
  );
});