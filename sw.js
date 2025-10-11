// Service Worker for WIZA FOOD CAFE - Enhanced for permissions and notifications
const CACHE_NAME = 'wiza-food-cafe-v1.4.0';
const urlsToCache = [
  '/wizafoodcafe/',
  '/wizafoodcafe/index.html',
  '/wizafoodcafe/styles.css',
  '/wizafoodcafe/script.js',
  '/wizafoodcafe/wfc.png',
  '/wizafoodcafe/logo.png',
  '/wizafoodcafe/manifest.json'
];

// Install event
self.addEventListener('install', event => {
  console.log('Service Worker installing with enhanced permissions support');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache, adding resources:', urlsToCache);
        return cache.addAll(urlsToCache).catch(error => {
          console.log('Cache addAll failed:', error);
          // Continue even if some files fail to cache
        });
      })
  );
  self.skipWaiting();
  console.log('Service Worker installed successfully');
});

// Fetch event - Enhanced caching strategy
self.addEventListener('fetch', event => {
  // Skip non-GET requests and external URLs
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version if available
        if (response) {
          console.log('Serving from cache:', event.request.url);
          return response;
        }

        // Otherwise fetch from network
        return fetch(event.request)
          .then(networkResponse => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Clone the response
            const responseToCache = networkResponse.clone();

            // Add to cache for future visits
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
                console.log('Cached new resource:', event.request.url);
              });

            return networkResponse;
          })
          .catch(error => {
            console.log('Fetch failed; returning offline page:', error);
            // Return offline page or fallback for critical resources
            if (event.request.destination === 'document') {
              return caches.match('/wizafoodcafe/index.html');
            }
            // You could return a custom offline page here
          });
      })
  );
});

// Activate event - Enhanced cleanup
self.addEventListener('activate', event => {
  console.log('Service Worker activating with enhanced permission support');
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
      // Claim clients immediately
      return self.clients.claim();
    })
  );
  console.log('Service Worker activated and ready');
});

// Enhanced Notification click event
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ 
      type: 'window',
      includeUncontrolled: true 
    }).then(clientList => {
      // Focus existing window or open new one
      for (const client of clientList) {
        if (client.url.includes('wizafoodcafe') && 'focus' in client) {
          console.log('Focusing existing window:', client.url);
          return client.focus();
        }
      }
      
      // If no existing window, open new one
      if (clients.openWindow) {
        console.log('Opening new window for notification');
        const url = event.notification.data?.url || 'https://bufferzone-cloud.github.io/wizafoodcafe/';
        return clients.openWindow(url);
      }
    })
  );
});

// Enhanced push notification handler
self.addEventListener('push', event => {
  console.log('Push event received:', event);
  
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    console.log('Error parsing push data:', error);
    data = {
      title: 'WIZA FOOD CAFE',
      body: 'New update available!',
      icon: '/wizafoodcafe/wfc.png'
    };
  }
  
  const options = {
    body: data.body || 'New order update from WIZA FOOD CAFE!',
    icon: data.icon || '/wizafoodcafe/wfc.png',
    badge: '/wizafoodcafe/wfc.png',
    tag: data.tag || 'wiza-food-update',
    requireInteraction: data.requireInteraction || true,
    vibrate: [200, 100, 200, 100, 200],
    actions: [
      {
        action: 'open',
        title: '📱 Open App'
      },
      {
        action: 'dismiss',
        title: '❌ Dismiss'
      }
    ],
    data: {
      url: data.url || 'https://bufferzone-cloud.github.io/wizafoodcafe/',
      orderId: data.orderId,
      type: data.type || 'general'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(
      data.title || '🍔 WIZA FOOD CAFE',
      options
    ).then(() => {
      console.log('Notification shown successfully');
    }).catch(error => {
      console.error('Error showing notification:', error);
    })
  );
});

// Enhanced notification action handler
self.addEventListener('notificationclick', event => {
  console.log('Notification action clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        const url = event.notification.data?.url || 'https://bufferzone-cloud.github.io/wizafoodcafe/';
        
        // Focus existing window or open new one
        for (const client of clientList) {
          if (client.url.includes('wizafoodcafe') && 'focus' in client) {
            return client.focus().then(() => {
              // Send message to the client about the notification
              client.postMessage({
                type: 'NOTIFICATION_ACTION',
                action: event.action,
                data: event.notification.data
              });
            });
          }
        }
        
        // Open new window
        return clients.openWindow(url);
      })
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification, no action needed
    console.log('Notification dismissed by user');
  }
});

// Enhanced message handler for permission requests and app communication
self.addEventListener('message', event => {
  console.log('Service Worker received message:', event.data);
  
  const { type, data } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      console.log('Service Worker skipWaiting called');
      break;
      
    case 'REQUEST_PERMISSIONS':
      handlePermissionRequests(event);
      break;
      
    case 'CHECK_PERMISSIONS':
      handlePermissionCheck(event);
      break;
      
    case 'SEND_NOTIFICATION':
      handleCustomNotification(event);
      break;
      
    case 'UPDATE_CACHE':
      handleCacheUpdate(event);
      break;
      
    case 'GET_CACHE_STATUS':
      handleCacheStatus(event);
      break;

    case 'SMS_PERMISSION_REQUEST':
      handleSmsPermissionRequest(event);
      break;

    case 'PHONE_PERMISSION_REQUEST':
      handlePhonePermissionRequest(event);
      break;

    case 'AIRTEL_PAYMENT_STATUS':
      handleAirtelPaymentStatus(event);
      break;
      
    default:
      console.log('Unknown message type:', type);
  }
});

// Handle permission requests from main app
function handlePermissionRequests(event) {
  const { permissions, requestId } = event.data;
  
  console.log('Handling permission requests:', permissions);
  
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
  
  // Send response back to main app
  event.ports[0].postMessage({
    type: 'PERMISSION_RESULTS',
    requestId: requestId,
    results: results,
    timestamp: new Date().toISOString()
  });
}

// Handle permission check requests
function handlePermissionCheck(event) {
  const { requestId } = event.data;
  
  const permissionStatus = {
    notifications: 'Notification' in self && self.Notification.permission,
    serviceWorker: true,
    backgroundSync: 'sync' in self.registration,
    pushManager: 'pushManager' in self.registration,
    storage: 'caches' in self,
    sms: 'sms' in navigator,
    phone: true, // Phone dialing is always available via tel: links
    ussd: true   // USSD dialing is available via tel: links
  };
  
  event.ports[0].postMessage({
    type: 'PERMISSION_STATUS',
    requestId: requestId,
    status: permissionStatus
  });
}

// Handle notification permission
function handleNotificationPermission() {
  return {
    supported: 'Notification' in self,
    currentStatus: self.Notification.permission,
    canRequest: self.Notification.permission === 'default',
    description: 'For order updates and promotions'
  };
}

// Handle location permission (note: service worker can't directly access location)
function handleLocationPermission() {
  return {
    supported: 'geolocation' in self,
    note: 'Location permission must be handled in the main app context',
    status: 'delegated',
    description: 'For accurate delivery estimates'
  };
}

// Handle background sync permission
function handleBackgroundSyncPermission() {
  const supported = 'sync' in self.registration;
  return {
    supported: supported,
    status: supported ? 'available' : 'unsupported',
    description: 'For offline order synchronization'
  };
}

// ============================================================================
// SMS/MESSAGE PERMISSION HANDLING
// ============================================================================

// Handle SMS permission
function handleSmsPermission() {
  const smsSupported = 'sms' in navigator;
  return {
    supported: smsSupported,
    currentStatus: smsSupported ? 'checking' : 'unsupported',
    canRequest: smsSupported,
    description: 'For automatic Airtel Money payment confirmation',
    capabilities: smsSupported ? [
      'Read incoming SMS messages',
      'Detect Airtel Money confirmations',
      'Auto-verify payments'
    ] : ['Manual confirmation required']
  };
}

// Handle SMS permission request
function handleSmsPermissionRequest(event) {
  const { requestId } = event.data;
  
  if (!('sms' in navigator)) {
    event.ports[0].postMessage({
      type: 'SMS_PERMISSION_RESULT',
      requestId: requestId,
      supported: false,
      status: 'unsupported',
      message: 'SMS API not available in this browser'
    });
    return;
  }

  // Note: SMS permission API is experimental and may not work in all browsers
  navigator.permissions.query({ name: 'sms' })
    .then(permissionStatus => {
      event.ports[0].postMessage({
        type: 'SMS_PERMISSION_RESULT',
        requestId: requestId,
        supported: true,
        status: permissionStatus.state,
        canRequest: permissionStatus.state === 'prompt'
      });
    })
    .catch(error => {
      console.log('SMS permission check failed:', error);
      event.ports[0].postMessage({
        type: 'SMS_PERMISSION_RESULT',
        requestId: requestId,
        supported: false,
        status: 'error',
        error: error.message
      });
    });
}

// Listen for SMS messages (experimental API)
function setupSmsListener() {
  if ('sms' in navigator) {
    navigator.sms.addEventListener('onreceive', (event) => {
      console.log('SMS received in service worker:', event);
      
      // Check if it's an Airtel Money confirmation
      if (isAirtelMoneyConfirmation(event.message)) {
        handleAirtelMoneySms(event.message);
      }
      
      // Broadcast to all clients
      broadcastToClients({
        type: 'SMS_RECEIVED',
        message: event.message,
        timestamp: new Date().toISOString(),
        isAirtelMoney: isAirtelMoneyConfirmation(event.message)
      });
    });
    
    console.log('SMS listener setup complete');
  }
}

// Check if SMS is Airtel Money confirmation
function isAirtelMoneyConfirmation(message) {
  if (!message) return false;
  
  const airtelKeywords = [
    'Airtel Money',
    'You have received',
    'Payment received',
    'Transaction successful',
    'You have sent',
    'confirmed',
    'K'
  ];
  
  const lowerMessage = message.toLowerCase();
  return airtelKeywords.some(keyword => 
    lowerMessage.includes(keyword.toLowerCase())
  );
}

// Handle Airtel Money confirmation SMS
function handleAirtelMoneySms(message) {
  console.log('Airtel Money confirmation SMS detected:', message);
  
  // Extract payment details from SMS
  const amountMatch = message.match(/K(\d+(?:\.\d{2})?)/);
  const referenceMatch = message.match(/(\d{4,})/);
  
  const paymentData = {
    type: 'AIRTEL_MONEY_CONFIRMATION',
    message: message,
    amount: amountMatch ? parseFloat(amountMatch[1]) : null,
    reference: referenceMatch ? referenceMatch[1] : null,
    timestamp: new Date().toISOString()
  };
  
  // Broadcast to all clients
  broadcastToClients({
    type: 'AIRTEL_PAYMENT_DETECTED',
    data: paymentData
  });
  
  // Show notification
  self.registration.showNotification('💰 Payment Confirmed!', {
    body: `Airtel Money payment of K${paymentData.amount} detected`,
    icon: '/wizafoodcafe/wfc.png',
    tag: 'payment-confirmation',
    requireInteraction: true,
    actions: [
      {
        action: 'view-order',
        title: 'View Order'
      }
    ],
    data: {
      type: 'payment',
      amount: paymentData.amount,
      reference: paymentData.reference
    }
  });
}

// ============================================================================
// PHONE/USSD PERMISSION HANDLING
// ============================================================================

// Handle phone permission
function handlePhonePermission() {
  return {
    supported: true, // tel: links are universally supported
    currentStatus: 'granted', // No explicit permission needed for tel: links
    canRequest: false, // No permission prompt needed
    description: 'For Airtel Money USSD payments',
    capabilities: [
      'Auto-dial USSD codes',
      'Open phone dialer',
      'Initiate Airtel Money payments'
    ]
  };
}

// Handle phone permission request
function handlePhonePermissionRequest(event) {
  const { requestId } = event.data;
  
  event.ports[0].postMessage({
    type: 'PHONE_PERMISSION_RESULT',
    requestId: requestId,
    supported: true,
    status: 'granted',
    message: 'Phone dialing available via tel: links'
  });
}

// Handle USSD code dialing requests
function handleUssdDialRequest(ussdCode) {
  // Note: Service workers cannot directly initiate phone calls
  // This would be handled by the main app via tel: links
  console.log('USSD dial request received:', ussdCode);
  
  // Broadcast to main app to handle the dialing
  broadcastToClients({
    type: 'USSD_DIAL_REQUEST',
    ussdCode: ussdCode,
    timestamp: new Date().toISOString()
  });
}

// Handle Airtel payment status updates
function handleAirtelPaymentStatus(event) {
  const { status, orderRef, amount, ussdCode } = event.data;
  
  console.log('Airtel payment status update:', status, orderRef);
  
  // Store payment status in cache for offline access
  const paymentData = {
    status: status,
    orderRef: orderRef,
    amount: amount,
    ussdCode: ussdCode,
    timestamp: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  };
  
  // Store in cache
  caches.open(CACHE_NAME)
    .then(cache => {
      const url = `/payment-status/${orderRef}`;
      const response = new Response(JSON.stringify(paymentData), {
        headers: { 'Content-Type': 'application/json' }
      });
      return cache.put(url, response);
    })
    .then(() => {
      console.log('Payment status cached:', orderRef);
    })
    .catch(error => {
      console.error('Error caching payment status:', error);
    });
  
  // Broadcast status update to all clients
  broadcastToClients({
    type: 'AIRTEL_PAYMENT_STATUS_UPDATE',
    data: paymentData
  });
}

// Handle custom notification requests
function handleCustomNotification(event) {
  const { title, body, icon, data, tag } = event.data;
  
  const options = {
    body: body,
    icon: icon || '/wizafoodcafe/wfc.png',
    badge: '/wizafoodcafe/wfc.png',
    tag: tag || 'custom-notification',
    requireInteraction: true,
    data: data || {},
    actions: [
      {
        action: 'open',
        title: 'Open'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => {
        event.ports[0].postMessage({
          type: 'NOTIFICATION_SENT',
          success: true,
          tag: tag
        });
      })
      .catch(error => {
        event.ports[0].postMessage({
          type: 'NOTIFICATION_SENT',
          success: false,
          error: error.message
        });
      })
  );
}

// Handle cache update requests
function handleCacheUpdate(event) {
  const { urls, strategy } = event.data;
  
  if (strategy === 'add') {
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urls))
      .then(() => {
        event.ports[0].postMessage({
          type: 'CACHE_UPDATED',
          success: true,
          urls: urls
        });
      })
      .catch(error => {
        event.ports[0].postMessage({
          type: 'CACHE_UPDATED',
          success: false,
          error: error.message
        });
      });
  }
}

// Handle cache status requests
function handleCacheStatus(event) {
  caches.open(CACHE_NAME)
    .then(cache => cache.keys())
    .then(requests => {
      const cachedUrls = requests.map(req => req.url);
      event.ports[0].postMessage({
        type: 'CACHE_STATUS',
        cacheName: CACHE_NAME,
        cachedUrls: cachedUrls,
        count: cachedUrls.length
      });
    })
    .catch(error => {
      event.ports[0].postMessage({
        type: 'CACHE_STATUS',
        error: error.message
      });
    });
}

// Background sync for offline functionality
self.addEventListener('sync', event => {
  console.log('Background sync event:', event.tag);
  
  if (event.tag === 'order-sync') {
    event.waitUntil(
      syncOrders().catch(error => {
        console.error('Background sync failed:', error);
      })
    );
  } else if (event.tag === 'payment-sync') {
    event.waitUntil(
      syncPayments().catch(error => {
        console.error('Payment sync failed:', error);
      })
    );
  }
});

// Sync pending orders when back online
async function syncOrders() {
  console.log('Syncing pending orders...');
  // This would sync with your backend
  return Promise.resolve();
}

// Sync payment status when back online
async function syncPayments() {
  console.log('Syncing payment status...');
  // This would sync payment status with your backend
  return Promise.resolve();
}

// Periodic sync for updates (if supported)
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', event => {
    if (event.tag === 'content-update') {
      event.waitUntil(updateContent());
    } else if (event.tag === 'payment-check') {
      event.waitUntil(checkPendingPayments());
    }
  });
}

async function updateContent() {
  console.log('Periodic sync: updating content...');
}

async function checkPendingPayments() {
  console.log('Periodic sync: checking pending payments...');
  // Check for pending Airtel Money payments
}

// Enhanced error handling
self.addEventListener('error', event => {
  console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('Service Worker unhandled rejection:', event.reason);
});

// Helper function to broadcast messages to all clients
function broadcastToClients(message) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage(message);
    });
  });
}

// Initialize SMS listener when service worker activates
self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim().then(() => {
      // Setup SMS listener if supported
      setupSmsListener();
    })
  );
});

console.log('WIZA FOOD CAFE Service Worker loaded with SMS & Phone permissions support');
