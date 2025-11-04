// Service Worker for WIZA FOOD CAFE - Enhanced for background notifications
const CACHE_NAME = 'wiza-food-cafe-v1.5.0';
const NOTIFICATION_INTERVAL = 30 * 60 * 1000; // 30 minutes
const urlsToCache = [
  '/wizafoodcafe/',
  '/wizafoodcafe/index.html',
  '/wizafoodcafe/styles.css',
  '/wizafoodcafe/script.js',
  '/wizafoodcafe/wfc.png',
  '/wizafoodcafe/logo.png',
  '/wizafoodcafe/manifest.json'
];

// Food menu and promotions data for notifications
const FOOD_MENU_NOTIFICATIONS = [
  {
    title: "🍔 Special Deal!",
    body: "Get our famous Wiza Burger with fries for only K85! Limited time offer.",
    tag: "burger-deal",
    data: { type: "promo", category: "quick-fills" }
  },
  {
    title: "🍗 Chicken Lovers!",
    body: "Crispy chicken wings with your choice of sauce - K65. Perfect snack!",
    tag: "chicken-deal",
    data: { type: "promo", category: "savory-bites" }
  },
  {
    title: "🥤 Thirsty?",
    body: "Buy any meal and get 50% off on all drinks! Refresh yourself.",
    tag: "drink-deal",
    data: { type: "promo", category: "drinks" }
  },
  {
    title: "🍕 Pizza Special",
    body: "Medium pizza with 2 toppings for K120! Available all day.",
    tag: "pizza-deal",
    data: { type: "promo", category: "savory-bites" }
  },
  {
    title: "🌯 Wrap it Up!",
    body: "Chicken or beef wraps with fresh veggies - K55 each. Quick and delicious!",
    tag: "wrap-deal",
    data: { type: "menu", category: "light-fresh" }
  },
  {
    title: "🍟 Snack Time!",
    body: "Loaded fries with cheese and toppings - K45. Perfect for sharing!",
    tag: "fries-deal",
    data: { type: "promo", category: "snacks-treats" }
  },
  {
    title: "🎉 Weekend Special",
    body: "Family meal deal: Save 20% on orders over K200 every weekend!",
    tag: "weekend-deal",
    data: { type: "promo", category: "all" }
  },
  {
    title: "☕ Coffee Break",
    body: "Any coffee + pastry for K40. Start your day right!",
    tag: "coffee-deal",
    data: { type: "promo", category: "snacks-treats" }
  }
];

// Install event
self.addEventListener('install', event => {
  console.log('Service Worker installing with background notifications');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache, adding resources');
        return cache.addAll(urlsToCache).catch(error => {
          console.log('Cache addAll failed:', error);
        });
      })
      .then(() => {
        // Start background notification scheduler immediately
        startBackgroundNotifications();
        return self.skipWaiting();
      })
  );
});

// Activate event
self.addEventListener('activate', event => {
  console.log('Service Worker activating with background notifications');
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
    }).then(() => {
      // Start notification scheduler
      startBackgroundNotifications();
      return self.clients.claim();
    })
  );
});

// Background notification scheduler
function startBackgroundNotifications() {
  console.log('Starting background notification scheduler');
  
  // Clear any existing intervals
  if (self.notificationInterval) {
    clearInterval(self.notificationInterval);
  }
  
  // Schedule notifications every 30 minutes
  self.notificationInterval = setInterval(() => {
    sendScheduledNotification();
  }, NOTIFICATION_INTERVAL);
  
  // Send initial notification after 1 minute
  setTimeout(() => {
    sendScheduledNotification();
  }, 60000);
  
  console.log('Background notifications scheduled every 30 minutes');
}

// Send scheduled notification
function sendScheduledNotification() {
  // Check if notifications are permitted
  if (Notification.permission !== 'granted') {
    console.log('Notifications not permitted, skipping scheduled notification');
    return;
  }
  
  const notification = getRandomFoodNotification();
  
  self.registration.showNotification(notification.title, {
    body: notification.body,
    icon: '/wizafoodcafe/wfc.png',
    badge: '/wizafoodcafe/wfc.png',
    tag: notification.tag,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: notification.data,
    actions: [
      {
        action: 'view-menu',
        title: '🍽️ View Menu'
      },
      {
        action: 'order-now',
        title: '🛒 Order Now'
      }
    ]
  }).then(() => {
    console.log('Scheduled notification sent:', notification.tag);
  }).catch(error => {
    console.error('Error sending scheduled notification:', error);
  });
}

// Get random food notification
function getRandomFoodNotification() {
  const randomIndex = Math.floor(Math.random() * FOOD_MENU_NOTIFICATIONS.length);
  return FOOD_MENU_NOTIFICATIONS[randomIndex];
}

// Fetch event
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then(networkResponse => {
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return networkResponse;
          })
          .catch(error => {
            if (event.request.destination === 'document') {
              return caches.match('/wizafoodcafe/index.html');
            }
          });
      })
  );
});

// Enhanced Notification click event
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  const action = event.action;
  const notificationData = event.notification.data;
  
  event.waitUntil(
    clients.matchAll({ 
      type: 'window',
      includeUncontrolled: true 
    }).then(clientList => {
      // Focus existing window or open new one
      for (const client of clientList) {
        if (client.url.includes('wizafoodcafe') && 'focus' in client) {
          // Send action data to client
          client.postMessage({
            type: 'NOTIFICATION_ACTION',
            action: action,
            data: notificationData,
            notificationTag: event.notification.tag
          });
          return client.focus();
        }
      }
      
      // If no existing window, open new one with appropriate URL
      let url = 'https://bufferzone-cloud.github.io/wizafoodcafe/';
      
      if (action === 'view-menu' && notificationData.category) {
        url += `#category-${notificationData.category}`;
      } else if (action === 'order-now') {
        url += '#quick-order';
      }
      
      return clients.openWindow(url);
    })
  );
});

// Push notification handler
self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    data = {
      title: 'WIZA FOOD CAFE',
      body: 'New delicious deals waiting for you!',
      icon: '/wizafoodcafe/wfc.png'
    };
  }
  
  const options = {
    body: data.body || 'Check out our latest food specials!',
    icon: data.icon || '/wizafoodcafe/wfc.png',
    badge: '/wizafoodcafe/wfc.png',
    tag: data.tag || 'wiza-food-update',
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [
      {
        action: 'open',
        title: '🍔 View Deals'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(
      data.title || '🍔 WIZA FOOD CAFE',
      options
    )
  );
});

// Message handler for permission requests
self.addEventListener('message', event => {
  const { type, data } = event.data || {};
  
  switch (type) {
    case 'REQUEST_PERMISSIONS':
      handlePermissionRequests(event);
      break;
      
    case 'CHECK_PERMISSIONS':
      handlePermissionCheck(event);
      break;
      
    case 'START_BACKGROUND_NOTIFICATIONS':
      startBackgroundNotifications();
      event.ports[0].postMessage({
        type: 'BACKGROUND_NOTIFICATIONS_STARTED',
        interval: NOTIFICATION_INTERVAL
      });
      break;
      
    case 'STOP_BACKGROUND_NOTIFICATIONS':
      if (self.notificationInterval) {
        clearInterval(self.notificationInterval);
        self.notificationInterval = null;
      }
      event.ports[0].postMessage({
        type: 'BACKGROUND_NOTIFICATIONS_STOPPED'
      });
      break;
      
    default:
      console.log('Unknown message type:', type);
  }
});

// Handle permission requests
function handlePermissionRequests(event) {
  const { permissions, requestId } = event.data;
  const results = {};
  
  permissions.forEach(permission => {
    switch (permission) {
      case 'notifications':
        results.notifications = handleNotificationPermission();
        break;
        
      case 'location':
        results.location = handleLocationPermission();
        break;
        
      case 'background-sync':
        results.backgroundSync = handleBackgroundSyncPermission();
        break;

      case 'sms':
        results.sms = handleSmsPermission();
        break;

      case 'phone':
        results.phone = handlePhonePermission();
        break;
        
      default:
        results[permission] = { supported: false, status: 'unsupported' };
    }
  });
  
  event.ports[0].postMessage({
    type: 'PERMISSION_RESULTS',
    requestId: requestId,
    results: results
  });
}

// Handle permission checks
function handlePermissionCheck(event) {
  const { requestId } = event.data;
  
  const permissionStatus = {
    notifications: 'Notification' in self ? self.Notification.permission : 'unsupported',
    serviceWorker: true,
    backgroundSync: 'sync' in self.registration,
    pushManager: 'pushManager' in self.registration,
    storage: 'caches' in self,
    sms: 'sms' in navigator,
    phone: true,
    ussd: true,
    backgroundNotifications: !!self.notificationInterval
  };
  
  event.ports[0].postMessage({
    type: 'PERMISSION_STATUS',
    requestId: requestId,
    status: permissionStatus
  });
}

// Individual permission handlers
function handleNotificationPermission() {
  return {
    supported: 'Notification' in self,
    currentStatus: self.Notification.permission,
    canRequest: self.Notification.permission === 'default',
    description: 'For food deals and order updates'
  };
}

function handleLocationPermission() {
  return {
    supported: 'geolocation' in navigator,
    note: 'Location permission must be handled in the main app context',
    status: 'delegated',
    description: 'For accurate delivery estimates'
  };
}

function handleBackgroundSyncPermission() {
  const supported = 'sync' in self.registration;
  return {
    supported: supported,
    status: supported ? 'available' : 'unsupported',
    description: 'For offline order synchronization'
  };
}

function handleSmsPermission() {
  const smsSupported = 'sms' in navigator;
  return {
    supported: smsSupported,
    currentStatus: smsSupported ? 'checking' : 'unsupported',
    canRequest: smsSupported,
    description: 'For automatic payment confirmation'
  };
}

function handlePhonePermission() {
  return {
    supported: true,
    currentStatus: 'granted',
    canRequest: false,
    description: 'For Airtel Money USSD payments'
  };
}

// Background sync for orders
self.addEventListener('sync', event => {
  if (event.tag === 'order-sync') {
    event.waitUntil(syncOrders());
  }
});

async function syncOrders() {
  // Sync pending orders when back online
  console.log('Syncing pending orders...');
  return Promise.resolve();
}

console.log('WIZA FOOD CAFE Service Worker loaded with background notifications');
