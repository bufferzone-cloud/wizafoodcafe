// Service Worker for WIZA FOOD CAFE - Enhanced for notifications
const CACHE_NAME = 'wiza-food-cafe-v1.0.0';
const urlsToCache = [
  '/wizafoodcafe/',
  '/wizafoodcafe/index.html',
  '/wizafoodcafe/styles.css',
  '/wizafoodcafe/script.js',
  '/wizafoodcafe/wfc.png',
  '/wizafoodcafe/logo.png',
  // Add other assets you want to cache
];

// Install event
self.addEventListener('install', event => {
  console.log('Service Worker installing');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});

// Activate event
self.addEventListener('activate', event => {
  console.log('Service Worker activating');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // Focus existing window or open new one
      for (const client of clientList) {
        if (client.url === self.registration.scope && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(self.registration.scope);
      }
    })
  );
});

// Notification close event
self.addEventListener('notificationclose', event => {
  console.log('Notification closed:', event);
});
