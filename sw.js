// Service Worker for WIZA FOOD CAFE - Enhanced with Firebase Notifications
const CACHE_NAME = 'wiza-food-cafe-v2.1.0';
const NOTIFICATION_INTERVAL = 30 * 60 * 1000; // 30 minutes
const urlsToCache = [
  '/wizafoodcafe/',
  '/wizafoodcafe/index.html',
  '/wizafoodcafe/styles.css',
  '/wizafoodcafe/script.js',
  '/wizafoodcafe/wfc.png',
  '/wizafoodcafe/logo.png',
  '/wizafoodcafe/manifest.json',
  '/wizafoodcafe/firebase-app.js',
  '/wizafoodcafe/firebase-messaging.js'
];

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCZEqWRAHW0tW6j0WfBf8lxj61oExa6BwY",
  authDomain: "wizafoodcafe.firebaseapp.com",
  databaseURL: "https://wizafoodcafe-default-rtdb.firebaseio.com",
  projectId: "wizafoodcafe",
  storageBucket: "wizafoodcafe.firebasestorage.app",
  messagingSenderId: "248334218737",
  appId: "1:248334218737:web:94fabd0bbdf75bb8410050"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

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
  console.log('Service Worker installing with Firebase notifications');
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
  console.log('Service Worker activating with Firebase notifications');
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
      // Start notification scheduler and Firebase messaging
      startBackgroundNotifications();
      initializeFirebaseMessaging();
      return self.clients.claim();
    })
  );
});

// Initialize Firebase Messaging in Service Worker
function initializeFirebaseMessaging() {
  console.log('📱 Initializing Firebase Messaging in Service Worker');
  
  try {
    // Set background message handler for Firebase
    messaging.onBackgroundMessage((payload) => {
      console.log('📨 Received background message:', payload);
      
      const notification = payload.notification;
      const data = payload.data || {};
      
      // Show notification to user
      self.registration.showNotification(notification.title, {
        body: notification.body,
        icon: '/wizafoodcafe/wfc.png',
        badge: '/wizafoodcafe/wfc.png',
        tag: data.orderId || 'wiza-notification',
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data: data,
        actions: [
          {
            action: 'view-order',
            title: '📦 View Order'
          },
          {
            action: 'track-order',
            title: '🚚 Track Order'
          }
        ]
      });
    });
    
    console.log('✅ Firebase Messaging initialized in Service Worker');
  } catch (error) {
    console.error('❌ Error initializing Firebase Messaging:', error);
  }
}

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
  console.log('Notification data:', event.notification.data);
  
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
            notificationTag: event.notification.tag,
            source: 'service-worker'
          });
          
          // Handle specific actions
          handleNotificationAction(client, action, notificationData);
          return client.focus();
        }
      }
      
      // If no existing window, open new one with appropriate URL
      let url = 'https://bufferzone-cloud.github.io/wizafoodcafe/';
      
      if (action === 'view-menu' && notificationData.category) {
        url += `#category-${notificationData.category}`;
      } else if (action === 'order-now') {
        url += '#quick-order';
      } else if (action === 'view-order' && notificationData.orderId) {
        url += `#order-${notificationData.orderId}`;
      } else if (action === 'track-order' && notificationData.orderRef) {
        url += `#track-order-${notificationData.orderRef}`;
      }
      
      return clients.openWindow(url);
    })
  );
});

// Handle notification actions
function handleNotificationAction(client, action, data) {
  const message = {
    type: 'FIREBASE_NOTIFICATION_ACTION',
    action: action,
    data: data,
    timestamp: new Date().toISOString()
  };
  
  // Send message to client for specific actions
  switch (action) {
    case 'view-order':
    case 'track-order':
      message.orderAction = true;
      break;
    case 'view-menu':
      message.menuAction = true;
      break;
    case 'order-now':
      message.orderAction = true;
      break;
  }
  
  client.postMessage(message);
}

// Push notification handler for Firebase
self.addEventListener('push', event => {
  console.log('📨 Push event received:', event);
  
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
    console.log('Push data:', data);
  } catch (error) {
    console.error('Error parsing push data:', error);
    data = {
      notification: {
        title: 'WIZA FOOD CAFE',
        body: 'New delicious deals waiting for you!'
      },
      data: {
        type: 'promo'
      }
    };
  }
  
  const notification = data.notification || {};
  const notificationData = data.data || {};
  
  const options = {
    body: notification.body || 'Check out our latest food specials!',
    icon: '/wizafoodcafe/wfc.png',
    badge: '/wizafoodcafe/wfc.png',
    tag: notificationData.orderId || 'wiza-food-update',
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: notificationData,
    actions: getNotificationActions(notificationData)
  };
  
  event.waitUntil(
    self.registration.showNotification(
      notification.title || '🍔 WIZA FOOD CAFE',
      options
    ).then(() => {
      console.log('✅ Firebase notification displayed successfully');
      
      // Send confirmation to all clients
      return clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'FIREBASE_MESSAGE_RECEIVED',
            payload: data,
            timestamp: new Date().toISOString()
          });
        });
      });
    }).catch(error => {
      console.error('❌ Error showing notification:', error);
    })
  );
});

// Get appropriate actions based on notification type
function getNotificationActions(data) {
  if (data.orderId || data.orderRef) {
    return [
      {
        action: 'view-order',
        title: '📦 View Order'
      },
      {
        action: 'track-order',
        title: '🚚 Track Order'
      }
    ];
  } else {
    return [
      {
        action: 'view-menu',
        title: '🍽️ View Menu'
      },
      {
        action: 'order-now',
        title: '🛒 Order Now'
      }
    ];
  }
}

// Message handler for communication with main app
self.addEventListener('message', event => {
  const { type, data, payload } = event.data || {};
  
  console.log('Service Worker received message:', type, data);
  
  switch (type) {
    case 'REQUEST_PERMISSIONS':
      handlePermissionRequests(event);
      break;
      
    case 'CHECK_PERMISSIONS':
      handlePermissionCheck(event);
      break;
      
    case 'START_BACKGROUND_NOTIFICATIONS':
      startBackgroundNotifications();
      event.ports[0]?.postMessage({
        type: 'BACKGROUND_NOTIFICATIONS_STARTED',
        interval: NOTIFICATION_INTERVAL
      });
      break;
      
    case 'STOP_BACKGROUND_NOTIFICATIONS':
      if (self.notificationInterval) {
        clearInterval(self.notificationInterval);
        self.notificationInterval = null;
      }
      event.ports[0]?.postMessage({
        type: 'BACKGROUND_NOTIFICATIONS_STOPPED'
      });
      break;
      
    case 'INIT_FIREBASE_MESSAGING':
      initializeFirebaseMessaging();
      event.ports[0]?.postMessage({
        type: 'FIREBASE_MESSAGING_INITIALIZED',
        status: 'success'
      });
      break;
      
    case 'SEND_TEST_NOTIFICATION':
      sendTestNotification(payload);
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
  
  event.ports[0]?.postMessage({
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
    backgroundNotifications: !!self.notificationInterval,
    firebaseMessaging: !!messaging
  };
  
  event.ports[0]?.postMessage({
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

// Send test notification
function sendTestNotification(payload) {
  const testNotification = {
    title: payload?.title || '🧪 Test Notification',
    body: payload?.body || 'This is a test notification from WIZA FOOD CAFE',
    tag: 'test-notification',
    data: {
      type: 'test',
      timestamp: new Date().toISOString()
    }
  };
  
  self.registration.showNotification(testNotification.title, {
    body: testNotification.body,
    icon: '/wizafoodcafe/wfc.png',
    badge: '/wizafoodcafe/wfc.png',
    tag: testNotification.tag,
    data: testNotification.data
  });
}

// Background sync for orders
self.addEventListener('sync', event => {
  if (event.tag === 'order-sync') {
    console.log('Background sync triggered for orders');
    event.waitUntil(syncOrders());
  }
});

async function syncOrders() {
  try {
    // Get pending orders from IndexedDB or cache
    const pendingOrders = await getPendingOrders();
    
    if (pendingOrders.length > 0) {
      console.log(`Syncing ${pendingOrders.length} pending orders...`);
      
      // Send each pending order to Firebase
      for (const order of pendingOrders) {
        await syncOrderToFirebase(order);
      }
      
      console.log('Order sync completed successfully');
    }
  } catch (error) {
    console.error('Error syncing orders:', error);
  }
}

// Get pending orders from storage
async function getPendingOrders() {
  // This would typically use IndexedDB
  // For now, return empty array
  return [];
}

// Sync individual order to Firebase
async function syncOrderToFirebase(order) {
  // Implementation for syncing orders to Firebase
  // This would use the Firebase REST API or similar
  return Promise.resolve();
}

// Periodic sync for background updates
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', event => {
    if (event.tag === 'content-update') {
      console.log('Periodic sync for content updates');
      event.waitUntil(updateCachedContent());
    }
  });
}

// Update cached content
async function updateCachedContent() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const requests = urlsToCache.map(url => new Request(url));
    
    for (const request of requests) {
      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          await cache.put(request, networkResponse);
          console.log('Updated cache for:', request.url);
        }
      } catch (error) {
        console.log('Failed to update:', request.url, error);
      }
    }
  } catch (error) {
    console.error('Error updating cached content:', error);
  }
}

console.log('🚀 WIZA FOOD CAFE Service Worker loaded with Firebase notifications');
