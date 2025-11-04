// Service Worker for WIZA FOOD CAFE - Enhanced for Order Tracking Notifications
const CACHE_NAME = 'wiza-food-cafe-v2.0.0';
const NOTIFICATION_INTERVAL = 30 * 60 * 1000; // 30 minutes for promotional notifications
const urlsToCache = [
  '/wizafoodcafe/',
  '/wizafoodcafe/index.html',
  '/wizafoodcafe/styles.css',
  '/wizafoodcafe/script.js',
  '/wizafoodcafe/wfc.png',
  '/wizafoodcafe/logo.png',
  '/wizafoodcafe/manifest.json',
  '/wizafoodcafe/default-food.jpg'
];

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js');

// Firebase configuration for service worker
firebase.initializeApp({
  apiKey: "AIzaSyCZEqWRAHW0tW6j0WfBf8lxj61oExa6BwY",
  authDomain: "wizafoodcafe.firebaseapp.com",
  databaseURL: "https://wizafoodcafe-default-rtdb.firebaseio.com",
  projectId: "wizafoodcafe",
  storageBucket: "wizafoodcafe.firebasestorage.app",
  messagingSenderId: "248334218737",
  appId: "1:248334218737:web:94fabd0bbdf75bb8410050"
});

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

// Order status notification templates
const ORDER_STATUS_NOTIFICATIONS = {
  'pending': {
    title: "📥 Order Received!",
    body: "We've received your order and are preparing it.",
    emoji: "📥"
  },
  'preparing': {
    title: "👨‍🍳 Cooking Your Order!",
    body: "Your delicious food is being prepared in our kitchen.",
    emoji: "👨‍🍳"
  },
  'ready': {
    title: "✅ Order Ready!",
    body: "Your order is ready! Delivery will be on the way soon.",
    emoji: "✅"
  },
  'out-for-delivery': {
    title: "🚚 Order On The Way!",
    body: "Your order is out for delivery and will arrive soon.",
    emoji: "🚚"
  },
  'completed': {
    title: "🎉 Order Delivered!",
    body: "Your order has been delivered. Enjoy your meal!",
    emoji: "🎉"
  },
  'cancelled': {
    title: "❌ Order Cancelled",
    body: "Your order has been cancelled. Contact support if needed.",
    emoji: "❌"
  }
};

// Install event
self.addEventListener('install', event => {
  console.log('Service Worker installing with order tracking notifications');
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
  console.log('Service Worker activating with order tracking notifications');
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

// Background notification scheduler for promotional content
function startBackgroundNotifications() {
  console.log('Starting background notification scheduler');
  
  // Clear any existing intervals
  if (self.notificationInterval) {
    clearInterval(self.notificationInterval);
  }
  
  // Schedule promotional notifications every 30 minutes
  self.notificationInterval = setInterval(() => {
    sendScheduledNotification();
  }, NOTIFICATION_INTERVAL);
  
  // Send initial notification after 2 minutes
  setTimeout(() => {
    sendScheduledNotification();
  }, 120000);
  
  console.log('Background notifications scheduled every 30 minutes');
}

// Send scheduled promotional notification
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
    data: {
      ...notification.data,
      type: 'promotional',
      timestamp: new Date().toISOString()
    },
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
    console.log('Scheduled promotional notification sent:', notification.tag);
  }).catch(error => {
    console.error('Error sending scheduled notification:', error);
  });
}

// Get random food notification for promotions
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
            return new Response('Network error happened', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' },
            });
          });
      })
  );
});

// Firebase Cloud Messaging Push Handler
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message via FCM:', payload);
  
  const notificationTitle = payload.data?.title || 'WIZA FOOD CAFE';
  const notificationBody = payload.data?.body || 'You have a new order update';
  
  const notificationOptions = {
    body: notificationBody,
    icon: '/wizafoodcafe/wfc.png',
    badge: '/wizafoodcafe/wfc.png',
    tag: payload.data?.orderId || 'order-update',
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    data: payload.data || {},
    actions: getNotificationActions(payload.data)
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Get appropriate actions based on notification type
function getNotificationActions(data) {
  const baseActions = [
    {
      action: 'open-app',
      title: '📱 Open App'
    }
  ];

  if (data.type === 'order_update') {
    return [
      {
        action: 'track-order',
        title: '📍 Track Order'
      },
      {
        action: 'view-details',
        title: '👀 View Details'
      },
      ...baseActions
    ];
  } else if (data.type === 'promotional') {
    return [
      {
        action: 'view-menu',
        title: '🍽️ View Menu'
      },
      {
        action: 'order-now',
        title: '🛒 Order Now'
      },
      ...baseActions
    ];
  }

  return baseActions;
}

// Enhanced notification click handler
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event.notification.data);
  
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
          // Send notification data to client
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            action: action,
            data: notificationData,
            notificationTag: event.notification.tag
          });
          
          // Navigate to specific section based on action
          handleNotificationNavigation(client, action, notificationData);
          return client.focus();
        }
      }
      
      // If no existing window, open new one
      return clients.openWindow(getNotificationUrl(action, notificationData));
    })
  );
});

// Handle navigation for existing clients
function handleNotificationNavigation(client, action, data) {
  const url = getNotificationUrl(action, data);
  
  // If client exists, navigate it to the appropriate URL
  if (client.url !== url) {
    client.navigate(url);
  }
}

// Get URL based on notification action and data
function getNotificationUrl(action, data) {
  let baseUrl = 'https://bufferzone-cloud.github.io/wizafoodcafe/';
  let hash = '';
  
  switch (action) {
    case 'track-order':
    case 'view-details':
      if (data.orderId) {
        hash = `#track-order-${data.orderId}`;
      } else if (data.orderRef) {
        hash = `#orders`;
      }
      break;
      
    case 'view-menu':
      if (data.category && data.category !== 'all') {
        hash = `#category-${data.category}`;
      } else {
        hash = `#menu`;
      }
      break;
      
    case 'order-now':
      hash = `#quick-order`;
      break;
      
    default:
      if (data.orderId) {
        hash = `#track-order-${data.orderId}`;
      } else if (data.type === 'order_update') {
        hash = `#orders`;
      }
  }
  
  return baseUrl + hash;
}

// Handle messages from main app
self.addEventListener('message', event => {
  const { type, data } = event.data || {};
  
  console.log('Service Worker received message:', type, data);
  
  switch (type) {
    case 'ORDER_STATUS_UPDATE':
      handleOrderStatusUpdate(data);
      break;
      
    case 'SHOW_ORDER_NOTIFICATION':
      showOrderNotification(data);
      break;
      
    case 'START_BACKGROUND_NOTIFICATIONS':
      startBackgroundNotifications();
      event.ports?.[0]?.postMessage({
        type: 'BACKGROUND_NOTIFICATIONS_STARTED',
        interval: NOTIFICATION_INTERVAL
      });
      break;
      
    case 'STOP_BACKGROUND_NOTIFICATIONS':
      if (self.notificationInterval) {
        clearInterval(self.notificationInterval);
        self.notificationInterval = null;
      }
      event.ports?.[0]?.postMessage({
        type: 'BACKGROUND_NOTIFICATIONS_STOPPED'
      });
      break;
      
    case 'CHECK_PERMISSIONS':
      handlePermissionCheck(event);
      break;
      
    default:
      console.log('Unknown message type:', type);
  }
});

// Handle order status updates from main app
function handleOrderStatusUpdate(orderData) {
  console.log('Handling order status update:', orderData);
  
  const notificationConfig = ORDER_STATUS_NOTIFICATIONS[orderData.status] || {
    title: `Order #${orderData.ref} Updated`,
    body: `Your order status has been updated to ${orderData.status}`,
    emoji: '📦'
  };
  
  const title = `${notificationConfig.emoji} ${notificationConfig.title}`;
  const body = notificationConfig.body;
  
  const notificationOptions = {
    body: body,
    icon: '/wizafoodcafe/wfc.png',
    badge: '/wizafoodcafe/wfc.png',
    tag: `order-${orderData.id}`,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    data: {
      ...orderData,
      type: 'order_update',
      timestamp: new Date().toISOString()
    },
    actions: [
      {
        action: 'track-order',
        title: '📍 Track Order'
      },
      {
        action: 'view-details',
        title: '👀 View Details'
      },
      {
        action: 'open-app',
        title: '📱 Open App'
      }
    ]
  };
  
  self.registration.showNotification(title, notificationOptions)
    .then(() => {
      console.log('Order status notification shown:', orderData.status);
    })
    .catch(error => {
      console.error('Error showing order status notification:', error);
    });
}

// Show custom order notification
function showOrderNotification(orderData) {
  const title = `Order #${orderData.ref} ${getStatusEmoji(orderData.status)}`;
  const body = getStatusMessage(orderData);
  
  self.registration.showNotification(title, {
    body: body,
    icon: '/wizafoodcafe/wfc.png',
    badge: '/wizafoodcafe/wfc.png',
    tag: `order-${orderData.id}`,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: {
      ...orderData,
      type: 'order_update',
      timestamp: new Date().toISOString()
    },
    actions: [
      {
        action: 'track-order',
        title: '📍 Track'
      },
      {
        action: 'open-app',
        title: '📱 Open'
      }
    ]
  });
}

// Helper function to get status emoji
function getStatusEmoji(status) {
  const emojis = {
    'pending': '📥',
    'preparing': '👨‍🍳',
    'ready': '✅',
    'out-for-delivery': '🚚',
    'completed': '🎉',
    'cancelled': '❌'
  };
  return emojis[status] || '📦';
}

// Helper function to get status message
function getStatusMessage(order) {
  const messages = {
    'pending': 'Order received and being processed',
    'preparing': 'Your food is being prepared in our kitchen',
    'ready': order.delivery?.isDelivery ? 'Ready for delivery' : 'Ready for pickup',
    'out-for-delivery': 'Out for delivery - arriving soon!',
    'completed': 'Order delivered successfully - enjoy your meal!',
    'cancelled': 'Order has been cancelled'
  };
  return messages[order.status] || 'Order status updated';
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
    backgroundNotifications: !!self.notificationInterval,
    fcm: true
  };
  
  event.ports?.[0]?.postMessage({
    type: 'PERMISSION_STATUS',
    requestId: requestId,
    status: permissionStatus
  });
}

// Background sync for offline orders
self.addEventListener('sync', event => {
  if (event.tag === 'order-sync') {
    console.log('Background sync triggered for orders');
    event.waitUntil(syncPendingOrders());
  }
});

// Sync pending orders when back online
async function syncPendingOrders() {
  try {
    // This would sync any pending orders that were created offline
    console.log('Syncing pending orders...');
    
    // Send message to main app to sync orders
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_PENDING_ORDERS',
        timestamp: new Date().toISOString()
      });
    });
    
    return Promise.resolve();
  } catch (error) {
    console.error('Error syncing orders:', error);
    return Promise.reject(error);
  }
}

// Periodic sync for background updates
self.addEventListener('periodicsync', event => {
  if (event.tag === 'order-updates') {
    console.log('Periodic sync for order updates');
    event.waitUntil(checkForOrderUpdates());
  }
});

// Check for order updates in background
async function checkForOrderUpdates() {
  try {
    console.log('Checking for order updates in background...');
    
    // Notify main app to check for updates
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'CHECK_ORDER_UPDATES',
        timestamp: new Date().toISOString()
      });
    });
    
    return Promise.resolve();
  } catch (error) {
    console.error('Error checking for updates:', error);
    return Promise.reject(error);
  }
}

// Handle push subscription changes
self.addEventListener('pushsubscriptionchange', event => {
  console.log('Push subscription changed');
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then(subscription => {
        // Send new subscription to server
        return fetch('/wizafoodcafe/update-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            oldSubscription: event.oldSubscription,
            newSubscription: subscription
          })
        });
      })
  );
});

console.log('WIZA FOOD CAFE Service Worker loaded with Firebase order tracking notifications');
