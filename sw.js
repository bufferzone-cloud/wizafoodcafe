// Service Worker for WIZA FOOD CAFE - Enhanced with Order Tracking Notifications
const CACHE_NAME = 'wiza-food-cafe-v2.1.0';
const NOTIFICATION_INTERVAL = 30 * 60 * 1000; // 30 minutes for promotional notifications

const urlsToCache = [
  '/wizafoodcafe/',
  '/wizafoodcafe/index.html',
  '/wizafoodcafe/styles.css',
  '/wizafoodcafe/script.js',
  '/wizafoodcafe/wfc.png',
  '/wizafoodcafe/logo.png',
  '/wizafoodcafe/manifest.json',
  '/wizafoodcafe/notification.mp3'
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

// Order status notification templates
const ORDER_STATUS_NOTIFICATIONS = {
  'pending': {
    title: "📥 Order Received!",
    body: "We've received your order and will start preparing it soon.",
    icon: '/wizafoodcafe/wfc.png',
    badge: '/wizafoodcafe/wfc.png',
    vibrate: [200, 100, 200],
    requireInteraction: false,
    actions: [
      { action: 'track-order', title: '📍 Track Order' },
      { action: 'view-orders', title: '📋 View Orders' }
    ]
  },
  'preparing': {
    title: "👨‍🍳 Cooking Your Order!",
    body: "Your food is being prepared in the kitchen. Estimated time: 15-20 minutes.",
    icon: '/wizafoodcafe/wfc.png',
    badge: '/wizafoodcafe/wfc.png',
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: false,
    actions: [
      { action: 'track-order', title: '📍 Track Order' }
    ]
  },
  'ready': {
    title: "🎉 Order Ready!",
    body: "Your order is ready! Delivery will be on the way soon.",
    icon: '/wizafoodcafe/wfc.png',
    badge: '/wizafoodcafe/wfc.png',
    vibrate: [300, 100, 300, 100, 300],
    requireInteraction: true,
    actions: [
      { action: 'track-order', title: '📍 Track Order' },
      { action: 'view-orders', title: '📋 View Details' }
    ]
  },
  'out-for-delivery': {
    title: "🚚 Order On the Way!",
    body: "Your order is out for delivery! Estimated delivery: 10-15 minutes.",
    icon: '/wizafoodcafe/wfc.png',
    badge: '/wizafoodcafe/wfc.png',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    actions: [
      { action: 'track-order', title: '📍 Live Track' }
    ]
  },
  'completed': {
    title: "✅ Order Delivered!",
    body: "Your order has been delivered. Enjoy your meal! 🍽️",
    icon: '/wizafoodcafe/wfc.png',
    badge: '/wizafoodcafe/wfc.png',
    vibrate: [100, 100, 100],
    requireInteraction: false,
    actions: [
      { action: 'rate-order', title: '⭐ Rate Order' },
      { action: 'reorder', title: '🔄 Order Again' }
    ]
  },
  'cancelled': {
    title: "❌ Order Cancelled",
    body: "Your order has been cancelled. Contact support if this is an error.",
    icon: '/wizafoodcafe/wfc.png',
    badge: '/wizafoodcafe/wfc.png',
    vibrate: [500],
    requireInteraction: true,
    actions: [
      { action: 'contact-support', title: '📞 Support' },
      { action: 'reorder', title: '🔄 New Order' }
    ]
  }
};

// Install event
self.addEventListener('install', event => {
  console.log('🚀 Service Worker installing with order tracking notifications');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Opened cache, adding resources');
        return cache.addAll(urlsToCache).catch(error => {
          console.log('❌ Cache addAll failed:', error);
        });
      })
      .then(() => {
        console.log('✅ All resources cached');
        // Start background notification scheduler
        startBackgroundNotifications();
        return self.skipWaiting();
      })
  );
});

// Activate event
self.addEventListener('activate', event => {
  console.log('🔄 Service Worker activating');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker activated');
      // Start notification scheduler
      startBackgroundNotifications();
      return self.clients.claim();
    })
  );
});

// Background notification scheduler for promotional notifications
function startBackgroundNotifications() {
  console.log('🔔 Starting background notification scheduler');
  
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
  
  console.log('📅 Background notifications scheduled every 30 minutes');
}

// Send scheduled promotional notification
function sendScheduledNotification() {
  // Check if notifications are permitted
  if (Notification.permission !== 'granted') {
    console.log('🔕 Notifications not permitted, skipping scheduled notification');
    return;
  }
  
  const notification = getRandomFoodNotification();
  
  self.registration.showNotification(notification.title, {
    body: notification.body,
    icon: notification.icon || '/wizafoodcafe/wfc.png',
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
    console.log('✅ Scheduled notification sent:', notification.tag);
  }).catch(error => {
    console.error('❌ Error sending scheduled notification:', error);
  });
}

// Get random food notification for promotions
function getRandomFoodNotification() {
  const randomIndex = Math.floor(Math.random() * FOOD_MENU_NOTIFICATIONS.length);
  return FOOD_MENU_NOTIFICATIONS[randomIndex];
}

// Fetch event - Handle network requests
self.addEventListener('fetch', event => {
  // Skip non-GET requests and cross-origin requests
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version if available
        if (response) {
          console.log('💾 Serving from cache:', event.request.url);
          return response;
        }
        
        // Otherwise fetch from network
        return fetch(event.request)
          .then(networkResponse => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            
            // Clone the response and cache it
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
                console.log('💾 Cached new resource:', event.request.url);
              });
            
            return networkResponse;
          })
          .catch(error => {
            console.error('❌ Fetch failed:', error);
            // If request is for a page, return offline page
            if (event.request.destination === 'document') {
              return caches.match('/wizafoodcafe/index.html');
            }
          });
      })
  );
});

// Enhanced Notification click event for order tracking
self.addEventListener('notificationclick', event => {
  console.log('🔔 Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  const action = event.action;
  const notificationData = event.notification.data || {};
  const notificationTag = event.notification.tag;
  
  event.waitUntil(
    clients.matchAll({ 
      type: 'window',
      includeUncontrolled: true 
    }).then(clientList => {
      // Focus existing window or open new one
      for (const client of clientList) {
        if (client.url.includes('wizafoodcafe') && 'focus' in client) {
          // Send detailed action data to client for order tracking
          client.postMessage({
            type: 'NOTIFICATION_ACTION',
            action: action,
            data: notificationData,
            notificationTag: notificationTag,
            timestamp: new Date().toISOString()
          });
          console.log('📱 Focused existing client');
          return client.focus();
        }
      }
      
      // If no existing window, open new one with appropriate URL
      let url = 'https://bufferzone-cloud.github.io/wizafoodcafe/';
      
      // Handle different notification types and actions
      if (notificationTag.includes('order-')) {
        // Order-related notifications
        url += '#orders';
      } else if (action === 'view-menu') {
        url += '#menu';
      } else if (action === 'order-now' || action === 'reorder') {
        url += '#quick-order';
      } else if (action === 'track-order') {
        url += '#orders';
      } else if (action === 'contact-support') {
        url += '#contact';
      } else if (action === 'rate-order') {
        url += '#profile';
      }
      
      console.log('🆕 Opening new window:', url);
      return clients.openWindow(url);
    })
  );
});

// Push notification handler for real-time order updates
self.addEventListener('push', event => {
  console.log('📨 Push notification received');
  
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    console.log('❌ Error parsing push data, using defaults');
    data = {
      title: 'WIZA FOOD CAFE',
      body: 'New order update available!',
      icon: '/wizafoodcafe/wfc.png',
      tag: 'order-update'
    };
  }
  
  // Determine notification type and configure accordingly
  const isOrderUpdate = data.type === 'order' || data.tag?.includes('order');
  const notificationConfig = isOrderUpdate ? 
    ORDER_STATUS_NOTIFICATIONS[data.status] || {} : 
    {};
  
  // Enhanced notification options
  const options = {
    body: data.body || notificationConfig.body || 'Check out our latest food specials!',
    icon: data.icon || notificationConfig.icon || '/wizafoodcafe/wfc.png',
    badge: '/wizafoodcafe/wfc.png',
    tag: data.tag || notificationConfig.tag || 'wiza-food-update',
    requireInteraction: data.requireInteraction !== undefined ? data.requireInteraction : true,
    vibrate: data.vibrate || notificationConfig.vibrate || [200, 100, 200],
    data: data.data || data,
    actions: data.actions || notificationConfig.actions || [
      {
        action: 'open',
        title: '🍔 View Details'
      },
      {
        action: 'track-order',
        title: '📍 Track Order'
      }
    ]
  };
  
  console.log('📢 Showing push notification:', data.title);
  
  event.waitUntil(
    self.registration.showNotification(
      data.title || '🍔 WIZA FOOD CAFE',
      options
    ).then(() => {
      console.log('✅ Push notification displayed successfully');
    }).catch(error => {
      console.error('❌ Error showing push notification:', error);
    })
  );
});

// Message handler for communication with main app
self.addEventListener('message', event => {
  const { type, data } = event.data || {};
  const port = event.ports && event.ports[0];
  
  console.log('📩 Message received:', type);
  
  switch (type) {
    case 'REQUEST_PERMISSIONS':
      handlePermissionRequests(event);
      break;
      
    case 'CHECK_PERMISSIONS':
      handlePermissionCheck(event);
      break;
      
    case 'START_BACKGROUND_NOTIFICATIONS':
      startBackgroundNotifications();
      if (port) {
        port.postMessage({
          type: 'BACKGROUND_NOTIFICATIONS_STARTED',
          interval: NOTIFICATION_INTERVAL
        });
      }
      break;
      
    case 'STOP_BACKGROUND_NOTIFICATIONS':
      if (self.notificationInterval) {
        clearInterval(self.notificationInterval);
        self.notificationInterval = null;
      }
      if (port) {
        port.postMessage({
          type: 'BACKGROUND_NOTIFICATIONS_STOPPED'
        });
      }
      break;
      
    case 'ORDER_STATUS_UPDATE':
      handleOrderStatusUpdate(event);
      break;
      
    case 'SHOW_ORDER_NOTIFICATION':
      showOrderNotification(data);
      break;
      
    case 'TRACK_ORDER':
      handleOrderTracking(event);
      break;
      
    case 'TEST_NOTIFICATION':
      testNotification(data);
      break;
      
    default:
      console.log('❓ Unknown message type:', type);
      if (port) {
        port.postMessage({
          type: 'ERROR',
          message: 'Unknown message type'
        });
      }
  }
});

// Handle order status updates from the main app
function handleOrderStatusUpdate(event) {
  const { order, oldStatus, newStatus } = event.data;
  
  console.log(`🔄 Order status update: ${order.ref} from ${oldStatus} to ${newStatus}`);
  
  const notificationConfig = ORDER_STATUS_NOTIFICATIONS[newStatus];
  if (!notificationConfig) {
    console.log('❌ No notification config for status:', newStatus);
    return;
  }
  
  const options = {
    body: notificationConfig.body,
    icon: notificationConfig.icon,
    badge: notificationConfig.badge,
    tag: `order-${order.ref}-${newStatus}`,
    requireInteraction: notificationConfig.requireInteraction,
    vibrate: notificationConfig.vibrate,
    data: {
      orderRef: order.ref,
      orderId: order.id,
      status: newStatus,
      oldStatus: oldStatus,
      isDelivery: order.delivery?.isDelivery || false,
      total: order.total,
      timestamp: new Date().toISOString()
    },
    actions: notificationConfig.actions
  };
  
  event.waitUntil(
    self.registration.showNotification(notificationConfig.title, options)
      .then(() => {
        console.log(`✅ Order notification sent: ${order.ref} - ${newStatus}`);
      })
      .catch(error => {
        console.error('❌ Error sending order notification:', error);
      })
  );
}

// Show custom order notification
function showOrderNotification(data) {
  const { title, body, orderRef, status, actions } = data;
  
  const options = {
    body: body,
    icon: '/wizafoodcafe/wfc.png',
    badge: '/wizafoodcafe/wfc.png',
    tag: `order-${orderRef}-${status}`,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: data,
    actions: actions || [
      { action: 'track-order', title: '📍 Track Order' },
      { action: 'view-orders', title: '📋 View Orders' }
    ]
  };
  
  self.registration.showNotification(title, options)
    .then(() => {
      console.log(`✅ Custom order notification sent: ${orderRef}`);
    })
    .catch(error => {
      console.error('❌ Error sending custom order notification:', error);
    });
}

// Handle order tracking requests
function handleOrderTracking(event) {
  const { orderId, orderRef } = event.data;
  const port = event.ports && event.ports[0];
  
  console.log(`📍 Tracking order: ${orderRef}`);
  
  // In a real implementation, you might set up background sync
  // or periodic updates for order tracking
  
  if (port) {
    port.postMessage({
      type: 'ORDER_TRACKING_STARTED',
      orderId: orderId,
      orderRef: orderRef,
      timestamp: new Date().toISOString(),
      message: 'Real-time order tracking activated'
    });
  }
}

// Handle permission requests
function handlePermissionRequests(event) {
  const { permissions, requestId } = event.data;
  const port = event.ports && event.ports[0];
  
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
  
  if (port) {
    port.postMessage({
      type: 'PERMISSION_RESULTS',
      requestId: requestId,
      results: results
    });
  }
}

// Handle permission checks
function handlePermissionCheck(event) {
  const { requestId } = event.data;
  const port = event.ports && event.ports[0];
  
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
    orderTracking: true
  };
  
  if (port) {
    port.postMessage({
      type: 'PERMISSION_STATUS',
      requestId: requestId,
      status: permissionStatus
    });
  }
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

// Test notification function
function testNotification(data) {
  const { type, orderRef } = data || {};
  const port = event.ports && event.ports[0];
  
  let testData;
  
  if (type === 'order') {
    testData = {
      title: "🧪 Test Order Notification",
      body: `This is a test notification for order ${orderRef || 'TEST123'}`,
      orderRef: orderRef || 'TEST123',
      status: 'preparing',
      isDelivery: true,
      total: 85.50
    };
    
    showOrderNotification(testData);
  } else {
    // Send a promotional test notification
    sendScheduledNotification();
  }
  
  if (port) {
    port.postMessage({
      type: 'TEST_NOTIFICATION_SENT',
      data: testData
    });
  }
}

// Background sync for orders
self.addEventListener('sync', event => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'order-sync') {
    event.waitUntil(syncOrders());
  } else if (event.tag === 'notification-sync') {
    event.waitUntil(syncNotifications());
  }
});

// Sync pending orders when back online
async function syncOrders() {
  try {
    console.log('📡 Syncing order updates...');
    
    // Here you would typically:
    // 1. Check for any pending order status updates
    // 2. Sync with Firebase
    // 3. Update local storage
    // 4. Show notifications for any new updates
    
    // For now, we'll just log success
    console.log('✅ Order sync completed');
    return Promise.resolve();
  } catch (error) {
    console.error('❌ Order sync failed:', error);
    return Promise.reject(error);
  }
}

// Sync notifications when back online
async function syncNotifications() {
  try {
    console.log('📢 Syncing notifications...');
    
    // Sync any pending notifications
    // This could include:
    // - Promotional notifications that were scheduled while offline
    // - Order updates that need to be shown
    
    console.log('✅ Notification sync completed');
    return Promise.resolve();
  } catch (error) {
    console.error('❌ Notification sync failed:', error);
    return Promise.reject(error);
  }
}

// Handle periodic sync (if supported)
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', event => {
    if (event.tag === 'order-updates') {
      console.log('🕒 Periodic sync for order updates');
      event.waitUntil(syncOrders());
    }
  });
}

// Error handling for service worker
self.addEventListener('error', event => {
  console.error('💥 Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('💥 Service Worker unhandled rejection:', event.reason);
});

console.log('🚀 WIZA FOOD CAFE Service Worker loaded successfully!');
console.log('🔔 Features: Order tracking, push notifications, background sync');
console.log('📱 Version: 2.1.0 - Enhanced Order Tracking');
