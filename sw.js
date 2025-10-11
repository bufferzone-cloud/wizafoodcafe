// Service Worker for WIZA FOOD CAFE - Enhanced for permissions and notifications
const CACHE_NAME = 'wiza-food-cafe-v1.2.0';
const urlsToCache = [
  '/wizafoodcafe/',
  '/wizafoodcafe/index.html',
  '/wizafoodcafe/styles.css',
  '/wizafoodcafe/script.js',
  '/wizafoodcafe/wfc.png',
  '/wizafoodcafe/logo.png',
];

// Install event
self.addEventListener('install', event => {
  console.log('Service Worker installing with enhanced permissions');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Fetch event
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      }
    )
  );
});

// Activate event
self.addEventListener('activate', event => {
  console.log('Service Worker activating with notification support');
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
  self.clients.claim();
});

// Enhanced Notification click event
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ 
      type: 'window',
      includeUncontrolled: true 
    }).then(clientList => {
      // Focus existing window or open new one
      for (const client of clientList) {
        if (client.url.includes('wizafoodcafe') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('https://bufferzone-cloud.github.io/wizafoodcafe/');
      }
    })
  );
});

// Handle push notifications
self.addEventListener('push', event => {
  console.log('Push event received:', event);
  
  let data = {};
  if (event.data) {
    data = event.data.json();
  }
  
  const options = {
    body: data.body || 'New update from WIZA FOOD CAFE!',
    icon: 'https://bufferzone-cloud.github.io/wizafoodcafe/wfc.png',
    badge: 'https://bufferzone-cloud.github.io/wizafoodcafe/wfc.png',
    tag: 'wiza-food-update',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ],
    data: {
      url: 'https://bufferzone-cloud.github.io/wizafoodcafe/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(
      data.title || 'WIZA FOOD CAFE',
      options
    )
  );
});

// Handle notification actions
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

// Message handler for permission requests
self.addEventListener('message', event => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'REQUEST_PERMISSIONS') {
    handlePermissionRequests(event);
  }
});

// Handle permission requests from main app
function handlePermissionRequests(event) {
  const { permissions } = event.data;
  
  if (permissions.includes('notifications')) {
    // Notification permission is handled by the main app
    event.ports[0].postMessage({
      type: 'PERMISSION_STATUS',
      permission: 'notifications',
      status: 'handled'
    });
  }
}
