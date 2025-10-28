// ============================================================================
// FIREBASE INITIALIZATION
// ============================================================================

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCZEqWRAHW0tW6j0WfBf8lxj61oExa6BwY",
    authDomain: "wizafoodcafe.firebaseapp.com",
    databaseURL: "https://wizafoodcafe-default-rtdb.firebaseio.com",
    projectId: "wizafoodcafe",
    storageBucket: "wizafoodcafe.firebasestorage.app",
    messagingSenderId: "248334218737",
    appId: "1:248334218737:web:94fabd0bbdf75bb8410050"
};

// Firebase Variables
let firebaseApp;
let firebaseDb;
let isFirebaseConnected = false;
let firebaseConnectionRetryCount = 0;
const MAX_FIREBASE_RETRIES = 3;

// Initialize Firebase
function initializeFirebase() {
    try {
        console.log('🚀 Initializing Firebase...');
        
        // Check if Firebase is already initialized
        if (!firebase.apps.length) {
            firebaseApp = firebase.initializeApp(firebaseConfig);
        } else {
            firebaseApp = firebase.app();
        }
        
        firebaseDb = firebase.database();
        
        console.log('✅ Firebase App initialized successfully');
        
        // Set global variables
        window.firebaseApp = firebaseApp;
        window.firebaseDb = firebaseDb;
        
        // Show initial connection status
        showFirebaseConnectionStatus('connecting', 'Connecting to restaurant...');
        
        // Set up connection listeners
        setupFirebaseConnectionListeners();
        
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        handleFirebaseError(error);
    }
}

// Setup Firebase Connection Listeners
function setupFirebaseConnectionListeners() {
    if (!firebaseDb) {
        console.error('❌ Database not available');
        showFirebaseConnectionStatus('disconnected', 'Database unavailable');
        return;
    }

    console.log('🧪 Setting up Firebase connection listeners...');
    
    // Monitor connection state
    const connectedRef = firebaseDb.ref('.info/connected');
    
    connectedRef.on('value', (snapshot) => {
        const connected = snapshot.val();
        isFirebaseConnected = connected === true;
        
        console.log('📡 Firebase connection state:', isFirebaseConnected ? 'Connected' : 'Disconnected');
        
        if (isFirebaseConnected) {
            firebaseConnectionRetryCount = 0;
            console.log('✅ Successfully connected to Firebase');
            showFirebaseConnectionStatus('connected', 'Connected to restaurant');
            
            // Test database operations
            testFirebaseOperations();
            
        } else {
            console.log('❌ Disconnected from Firebase');
            showFirebaseConnectionStatus('disconnected', 'Trying to reconnect...');
            
            // Attempt reconnection
            attemptFirebaseReconnection();
        }
    });

    // Set up connection error listener
    firebaseDb.ref('.info/connected').onDisconnect().update({
        lastDisconnect: firebase.database.ServerValue.TIMESTAMP
    });
}

// Attempt Firebase Reconnection
function attemptFirebaseReconnection() {
    if (firebaseConnectionRetryCount < MAX_FIREBASE_RETRIES) {
        firebaseConnectionRetryCount++;
        console.log(`🔄 Firebase reconnection attempt ${firebaseConnectionRetryCount}/${MAX_FIREBASE_RETRIES}`);
        
        showFirebaseConnectionStatus('connecting', `Reconnecting... (${firebaseConnectionRetryCount}/${MAX_FIREBASE_RETRIES})`);
        
        setTimeout(() => {
            if (!isFirebaseConnected) {
                try {
                    firebaseDb.goOnline();
                } catch (error) {
                    console.error('Firebase reconnection failed:', error);
                }
            }
        }, 2000 * firebaseConnectionRetryCount);
    } else {
        console.log('🔌 Max Firebase reconnection attempts reached');
        showFirebaseConnectionStatus('disconnected', 'Check your internet connection');
    }
}

// Test Firebase Operations
function testFirebaseOperations() {
    if (!firebaseDb || !isFirebaseConnected) return;

    const testRef = firebaseDb.ref('connection_tests/' + Date.now());
    const testData = {
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        message: 'Connection test from WIZA FOOD CAFE',
        userAgent: navigator.userAgent.substring(0, 100),
        status: 'success',
        testTime: new Date().toISOString()
    };

    // Test write operation
    testRef.set(testData)
        .then(() => {
            console.log('✅ Firebase write test successful');
            showFirebaseConnectionStatus('connected', 'Live - Database operational');
            
            // Test read operation
            return testRef.once('value');
        })
        .then((snapshot) => {
            if (snapshot.exists()) {
                console.log('✅ Firebase read test successful');
                
                // Update status
                showFirebaseConnectionStatus('connected', 'Ready to take orders');
                
                // Initialize order listeners
                initializeFirebaseOrderListeners();
            }
        })
        .catch((error) => {
            console.error('❌ Firebase operations test failed:', error);
            showFirebaseConnectionStatus('disconnected', 'Database operations failed');
            handleFirebaseError(error);
        });
}

// Initialize Firebase Order Listeners
function initializeFirebaseOrderListeners() {
    if (!firebaseDb || !isFirebaseConnected) return;
    
    console.log('👂 Setting up Firebase order listeners...');
    
    // Listen for orders
    const ordersRef = firebaseDb.ref('orders');
    ordersRef.limitToLast(10).on('value', (snapshot) => {
        const orders = snapshot.val();
        console.log('📦 Orders updated from Firebase');
        
        // Notify the main application
        if (window.handleFirebaseOrdersUpdate) {
            window.handleFirebaseOrdersUpdate(orders);
        }
    });
}

// Show Firebase Connection Status
function showFirebaseConnectionStatus(status, details = '') {
    const container = document.getElementById('firebaseConnectionContainer');
    const statusElement = document.getElementById('firebaseConnectionStatus');
    const connectionDot = statusElement?.querySelector('.connection-dot');
    const connectionText = statusElement?.querySelector('.connection-text');
    const connectionDetails = document.getElementById('connectionDetails');
    
    if (!container || !statusElement) return;
    
    // Remove all status classes
    statusElement.classList.remove('connected', 'disconnected', 'connecting');
    connectionDot?.classList.remove('connected', 'disconnected', 'connecting');
    
    // Add current status class
    statusElement.classList.add(status);
    connectionDot?.classList.add(status);
    
    // Update text content
    if (connectionText) {
        switch(status) {
            case 'connected':
                connectionText.textContent = 'Connected to Restaurant';
                break;
            case 'disconnected':
                connectionText.textContent = 'Connection Lost';
                break;
            case 'connecting':
                connectionText.textContent = 'Connecting...';
                break;
        }
    }
    
    // Update details
    if (connectionDetails) {
        connectionDetails.textContent = details;
    }
    
    // Show the container
    container.style.display = 'block';
    
    // Auto-hide when connected
    if (status === 'connected') {
        setTimeout(() => {
            hideFirebaseConnectionStatus();
        }, 3000);
    }
}

// Hide Firebase Connection Status
function hideFirebaseConnectionStatus() {
    const container = document.getElementById('firebaseConnectionContainer');
    if (!container) return;
    
    container.style.display = 'none';
}

// Handle Firebase Errors
function handleFirebaseError(error) {
    console.error('🔥 Firebase Error:', error);
    
    let errorDetails = '';
    
    if (error.code) {
        switch (error.code) {
            case 'PERMISSION_DENIED':
                errorDetails = 'Database permission denied';
                break;
            case 'UNAVAILABLE':
                errorDetails = 'Network unavailable';
                break;
            default:
                errorDetails = `Error: ${error.code}`;
        }
    } else {
        errorDetails = 'Connection issue';
    }
    
    showFirebaseConnectionStatus('disconnected', errorDetails);
}

// ============================================================================
// FIREBASE ORDER MANAGEMENT
// ============================================================================

// Save Order to Firebase
async function saveOrderToFirebase(order) {
    if (!firebaseDb || !isFirebaseConnected) {
        console.warn('Firebase not available, saving locally only');
        throw new Error('Firebase unavailable - saving locally');
    }

    try {
        // Show connection status briefly when saving order
        showFirebaseConnectionStatus('connected', 'Saving order...');
        
        const orderKey = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const orderRef = firebaseDb.ref('orders/' + orderKey);
        
        // Add Firebase metadata
        order.firebaseTimestamp = firebase.database.ServerValue.TIMESTAMP;
        order.firebaseKey = orderKey;
        order.lastUpdated = new Date().toISOString();
        
        await orderRef.set(order);
        console.log('✅ Order saved to Firebase:', orderKey);
        
        // Show success briefly then hide
        showFirebaseConnectionStatus('connected', 'Order submitted successfully');
        setTimeout(hideFirebaseConnectionStatus, 2000);
        
        return orderKey;
    } catch (error) {
        console.error('❌ Error saving order to Firebase:', error);
        showFirebaseConnectionStatus('disconnected', 'Failed to save order');
        throw error;
    }
}

// Get Firebase Connection Status
function getFirebaseConnectionStatus() {
    return {
        isConnected: isFirebaseConnected,
        database: !!firebaseDb,
        app: !!firebaseApp,
        retryCount: firebaseConnectionRetryCount
    };
}

// Test Firebase Connection
function testFirebaseConnection() {
    showFirebaseConnectionStatus('connecting', 'Testing connection...');
    initializeFirebase();
}

// Refresh Firebase Connection
function refreshFirebaseConnection() {
    firebaseConnectionRetryCount = 0;
    showFirebaseConnectionStatus('connecting', 'Refreshing connection...');
    initializeFirebase();
}

// ============================================================================
// MODIFIED ORDER COMPLETION FUNCTION WITH FIREBASE INTEGRATION
// ============================================================================

// MODIFIED: Complete Order function with Firebase integration
async function completeOrder() {
    try {
        // Check if payment screenshot is uploaded OR if user wants to proceed without it
        const screenshotUpload = document.getElementById('paymentScreenshotUpload');
        const hasScreenshot = screenshotUpload && screenshotUpload.files && screenshotUpload.files[0];
        
        if (!hasScreenshot) {
            // Ask user if they want to proceed without screenshot
            const proceed = confirm('No payment screenshot uploaded. Have you completed the Airtel Money payment? Press OK to continue or Cancel to upload screenshot.');
            if (!proceed) {
                showNotification('Please upload payment screenshot or complete payment', CONSTANTS.NOTIFICATION.WARNING, 'warning');
                return;
            }
        }
        
        // Validate other order requirements
        if (state.cart.length === 0) {
            showNotification('Your cart is empty!', CONSTANTS.NOTIFICATION.WARNING, 'warning');
            return;
        }
        
        if (!state.profile) {
            showNotification('Please create an account first!', CONSTANTS.NOTIFICATION.WARNING, 'warning');
            closePaymentModal();
            openProfileModal();
            return;
        }
        
        if (state.isDelivery && !state.deliveryLocation) {
            showNotification('Please select a delivery location', CONSTANTS.NOTIFICATION.WARNING, 'warning');
            closePaymentModal();
            openLocationModal();
            return;
        }

        // Show loading state
        showNotification('Processing your order...', CONSTANTS.NOTIFICATION.SUCCESS, 'success');
        
        const total = calculateTotal();
        const orderRef = `WIZA${state.orderCounter.toString().padStart(4, '0')}`;
        
        const order = {
            id: state.orderCounter,
            ref: orderRef,
            items: [...state.cart],
            subtotal: total.subtotal,
            deliveryFee: total.delivery,
            serviceFee: total.serviceFee,
            discount: total.discount,
            total: total.total,
            deposit: total.total, // 100% payment
            status: 'pending',
            date: new Date().toISOString(),
            delivery: state.isDelivery,
            deliveryLocation: state.isDelivery ? state.deliveryLocation : null,
            customer: {...state.profile},
            promoCode: state.promoCode,
            paymentMethod: 'Airtel Money',
            paymentScreenshot: hasScreenshot,
            airtelMoneyUsed: true,
            timestamp: Date.now(),
            // Add Firebase metadata
            firebaseTimestamp: firebase.database.ServerValue.TIMESTAMP,
            firebaseKey: `order_${Date.now()}_${state.orderCounter}`
        };
        
        // Save order to Firebase (with fallback to local storage)
        try {
            const firebaseKey = await saveOrderToFirebase(order);
            console.log('✅ Order saved to Firebase with key:', firebaseKey);
            
            // Also save locally for offline access
            saveOrderLocally(order);
            
            // Show success message
            showNotification(`Order #${order.ref} placed successfully! ✅`, CONSTANTS.NOTIFICATION.SUCCESS, 'success');
            
        } catch (firebaseError) {
            console.warn('Firebase save failed, saving locally only:', firebaseError);
            
            // Fallback to local storage
            saveOrderLocally(order);
            
            // Show warning message
            showNotification(`Order #${order.ref} saved locally (offline mode) 📱`, CONSTANTS.NOTIFICATION.WARNING, 'warning');
        }
        
        // Reset UI regardless of Firebase success/failure
        resetOrderUI();
        
    } catch (error) {
        console.error('Error completing order:', error);
        showNotification('Error completing order. Please try again.', CONSTANTS.NOTIFICATION.ERROR, 'error');
    }
}

// ============================================================================
// UPDATED INITIALIZATION FUNCTION
// ============================================================================

// Initialize Application with Firebase
function initializeApp() {
    loadStateFromStorage();
    setupEventListeners();
    setupLocationModal();
    updateCartUI();
    updateWishlistUI();
    loadProfile();
    loadOrders();
    initOffersBanner();
    initQuickFilters();
    loadRecentlyViewed();
    loadPopularItems();
    
    // Add all styles
    addLocationPermissionStyles();
    addCartLocationStyles();
    addLocationFullAddressStyles();
    addDrinkModalStyles();
    addAirtelMoneyStyles();
    addPWAInstallStyles();
    addPermissionModalStyles();
    addDeliveryMapStyles();
    addDeliveryMapModalStyles();
    addLoadingStyles();
    
    // Initialize PWA features
    initializePWA();
    
    // Initialize Firebase
    initializeFirebase();
    
    // Show permission popups first
    showPermissionPopups();
    
    // Initialize geolocation and automatically set current location as delivery location
    initializeAutoLocation();
    setupLocationBasedFeatures();
    addMapStyles();
    enhanceCartSummary();
    updateDeliveryMethod();
    
    // Auto-refresh Firebase connection every minute if disconnected
    setInterval(() => {
        if (!isFirebaseConnected) {
            console.log('🔄 Auto-refreshing Firebase connection...');
            refreshFirebaseConnection();
        }
    }, 60000);
    
    if (!localStorage.getItem(CONSTANTS.STORAGE_KEYS.HAS_VISITED)) {
        showNotification('Welcome to WIZA FOOD CAFE! 🍔', 4000, 'success');
        localStorage.setItem(CONSTANTS.STORAGE_KEYS.HAS_VISITED, 'true');
    }
}

// ============================================================================
// GLOBAL FUNCTION EXPORTS
// ============================================================================

// Export Firebase functions for global access
window.saveOrderToFirebase = saveOrderToFirebase;
window.getFirebaseConnectionStatus = getFirebaseConnectionStatus;
window.testFirebaseConnection = testFirebaseConnection;
window.refreshFirebaseConnection = refreshFirebaseConnection;
window.showFirebaseStatus = function() {
    if (isFirebaseConnected) {
        showFirebaseConnectionStatus('connected', 'Connected to restaurant');
        setTimeout(hideFirebaseConnectionStatus, 3000);
    } else {
        showFirebaseConnectionStatus('disconnected', 'Not connected');
    }
};

// ============================================================================
// DOM Elements - Optimized selection
// ============================================================================

const elements = {
    location: {
        modal: document.getElementById('locationModal'),
        toggle: document.getElementById('locationToggle'),
        // Add the new map modal elements
        mapModal: document.getElementById('pickupMapModal') || createMapModal(),
        directionsBtn: document.getElementById('directionsBtn') || createDirectionsButton()
    },
    cart: {
        icon: document.getElementById('cartIcon'),
        modal: document.getElementById('cartModal'),
        close: document.getElementById('closeCart'),
        items: document.getElementById('cartItems'),
        emptyMsg: document.getElementById('emptyCart'),
        count: document.querySelector('.cart-count'),
        total: document.getElementById('totalAmount'),
        checkoutBtn: document.getElementById('checkoutBtn'),
        subtotal: document.getElementById('cartSubtotal'),
        delivery: document.getElementById('cartDelivery'),
        service: document.getElementById('cartService'),
        discount: document.getElementById('cartDiscount'),
        discountItem: document.getElementById('cartDiscountItem')
    },
    payment: {
        modal: document.getElementById('paymentModal'),
        close: document.getElementById('closePayment'),
        deposit: document.getElementById('depositAmount'),
        orderRef: document.getElementById('orderRef'),
        uploadArea: document.getElementById('uploadArea'),
        screenshotUpload: document.getElementById('screenshotUpload'),
        fileName: document.getElementById('fileName'),
        submitOrder: document.getElementById('submitOrder'),
        itemsTotal: document.getElementById('itemsTotal'),
        deliveryTotal: document.getElementById('deliveryTotal'),
        paymentTotal: document.getElementById('paymentTotal'),
        paymentDiscount: document.getElementById('paymentDiscount'),
        paymentDiscountItem: document.getElementById('paymentDiscountItem'),
        
        // ADD THESE NEW ELEMENTS:
        paymentAmount: document.getElementById('paymentAmount'),
        paymentOrderRef: document.getElementById('paymentOrderRef'),
        paymentItemsTotal: document.getElementById('paymentItemsTotal'),
        paymentDeliveryTotal: document.getElementById('paymentDeliveryTotal'),
        paymentTotalAmount: document.getElementById('paymentTotalAmount'),
        paymentOrderItems: document.getElementById('paymentOrderItems'),
        paymentUploadArea: document.getElementById('paymentUploadArea'),
        paymentScreenshotUpload: document.getElementById('paymentScreenshotUpload'),
        paymentFilePreview: document.getElementById('paymentFilePreview'),
        paymentPreviewImage: document.getElementById('paymentPreviewImage'),
        paymentFileName: document.getElementById('paymentFileName'),
        removePaymentImage: document.getElementById('removePaymentImage'),
        submitPaymentOrder: document.getElementById('submitPaymentOrder'),
        editCartBtn: document.getElementById('editCartBtn'),
        changeMethodBtn: document.getElementById('changeMethodBtn')
    },
    drink: {
        modal: document.getElementById('drinkModal'),
        openBtn: document.getElementById('openDrinkModal')
    },
    ui: {
        overlay: document.getElementById('overlay'),
        searchInput: document.getElementById('searchInput'),
        categories: document.querySelectorAll('.category'),
        categorySections: document.querySelectorAll('.category-section'),
        navItems: document.querySelectorAll('.nav-item'),
        searchToggle: document.getElementById('searchToggle'),
        searchBar: document.getElementById('searchBar'),
        clearSearch: document.getElementById('clearSearch'),
        searchSuggestions: document.getElementById('searchSuggestions'),
        wishlistIcon: document.getElementById('wishlistIcon'),
        locationToggle: document.getElementById('locationToggle'),
        locationModal: document.getElementById('locationModal'),
        
        savedLocations: document.getElementById('savedLocations'),
        offersBanner: document.getElementById('offersBanner'),
        quickFilters: document.querySelectorAll('.filter-btn'),
        loadingIndicator: document.getElementById('loadingIndicator'),
        noResults: document.getElementById('noResults'),
        recentlyViewed: document.getElementById('recentlyViewed'),
        recentItemsGrid: document.getElementById('recentItemsGrid'),
        quickOrderFab: document.getElementById('quickOrderFab'),
        quickOrderModal: document.getElementById('quickOrderModal'),
        popularItemsGrid: document.getElementById('popularItemsGrid'),
        chatWidget: document.getElementById('chatWidget'),
        chatModal: document.getElementById('chatModal'),
        chatMessages: document.getElementById('chatMessages'),
        chatInput: document.getElementById('chatInput'),
        sendMessage: document.getElementById('sendMessage'),
        promoCode: document.getElementById('promoCode'),
        applyPromo: document.getElementById('applyPromo'),
        promoApplied: document.getElementById('promoApplied'),
        appliedPromoCode: document.getElementById('appliedPromoCode'),
        removePromo: document.getElementById('removePromo')
    },
    orders: {
        modal: document.getElementById('ordersModal'),
        noOrdersMsg: document.getElementById('noOrders'),
        list: document.getElementById('ordersList'),
        filterButtons: document.querySelectorAll('.filter-order')
    },
    profile: {
        modal: document.getElementById('profileModal'),
        info: document.getElementById('profileInfo'),
        createAccountBtn: document.getElementById('createAccountBtn'),
        accountForm: document.getElementById('accountForm'),
        form: document.getElementById('profileForm'),
        totalOrders: document.getElementById('totalOrders'),
        favoriteItems: document.getElementById('favoriteItems'),
        memberSince: document.getElementById('memberSince')
    },
    wishlist: {
        modal: document.getElementById('wishlistModal'),
        noWishlist: document.getElementById('noWishlist'),
        items: document.getElementById('wishlistItems')
    },
    delivery: {
        pickup: document.getElementById('pickupOption'),
        delivery: document.getElementById('deliveryOption')
    },
    tracking: {
        modal: document.getElementById('trackingModal'),
        receivedTime: document.getElementById('receivedTime'),
        preparingTime: document.getElementById('preparingTime'),
        readyTime: document.getElementById('readyTime'),
        deliveryTime: document.getElementById('deliveryTime'),
        deliveredTime: document.getElementById('deliveredTime'),
        orderEta: document.getElementById('orderEta')
    },
    customize: {
        modal: document.getElementById('customizeModal'),
        image: document.getElementById('customizeImage'),
        name: document.getElementById('customizeName'),
        basePrice: document.getElementById('customizeBasePrice'),
        total: document.getElementById('customizeTotal'),
        addBtn: document.getElementById('addCustomizedToCart'),
        instructions: document.getElementById('specialInstructions')
    }
};

const state = {
    cart: [],
    wishlist: [],
    deliveryFee: 0,
    serviceFee: 2, // K2 service fee
    isDelivery: false,
    orderCounter: parseInt(localStorage.getItem('orderCounter')) || 1,
    orders: JSON.parse(localStorage.getItem('orders')) || [],
    profile: JSON.parse(localStorage.getItem('profile')) || null,
    currentPage: 'home',
    searchQuery: '',
    activeCategory: 'all',
    activeFilter: 'all',
    promoCode: null,
    discount: 0,
    deliveryLocation: JSON.parse(localStorage.getItem('deliveryLocation')) || null,
    savedLocations: JSON.parse(localStorage.getItem('savedLocations')) || [],
    recentlyViewed: JSON.parse(localStorage.getItem('recentlyViewed')) || [],
    chatMessages: JSON.parse(localStorage.getItem('chatMessages')) || [
        { sender: 'bot', message: 'Hi there! How can we help you today?', time: new Date().toISOString() }
    ],
    currentCustomization: null
};

// Initialize PWA functionality
function initializePWA() {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
        localStorage.setItem(PWA_CONSTANTS.STORAGE_KEYS.A2HS_INSTALLED, 'true');
        return;
    }
    
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent the mini-infobar from appearing on mobile
        e.preventDefault();
        // Stash the event so it can be triggered later
        deferredPrompt = e;
        
        console.log('PWA installation available');
        
        // Check if we should show the prompt
        const hasPrompted = localStorage.getItem(PWA_CONSTANTS.STORAGE_KEYS.A2HS_PROMPTED);
        const hasDeclined = localStorage.getItem(PWA_CONSTANTS.STORAGE_KEYS.A2HS_DECLINED);
        
        if (!hasPrompted && !hasDeclined) {
            // We'll show the prompt after location permission is granted
            console.log('PWA prompt will be shown after location permission');
        }
    });
    
    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
        console.log('PWA was installed');
        deferredPrompt = null;
        localStorage.setItem(PWA_CONSTANTS.STORAGE_KEYS.A2HS_INSTALLED, 'true');
        showNotification('WIZA FOOD CAFE installed successfully! 🎉', 5000, 'success');
    });
}

// Function to show PWA install prompt after location permission
function showPWAInstallPrompt() {
    // Check if already installed or recently declined
    if (localStorage.getItem(PWA_CONSTANTS.STORAGE_KEYS.A2HS_INSTALLED) === 'true' ||
        localStorage.getItem(PWA_CONSTANTS.STORAGE_KEYS.A2HS_DECLINED) === 'true') {
        return;
    }
    
    if (!deferredPrompt) {
        console.log('No PWA install prompt available');
        // Show our custom modal instead
        showAddToHomeScreenModal();
        return;
    }
    
    // Show the native install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
            localStorage.setItem(PWA_CONSTANTS.STORAGE_KEYS.A2HS_INSTALLED, 'true');
            showNotification('WIZA FOOD CAFE installed successfully! 🎉', 5000, 'success');
        } else {
            console.log('User dismissed the install prompt');
            localStorage.setItem(PWA_CONSTANTS.STORAGE_KEYS.A2HS_DECLINED, 'true');
        }
        deferredPrompt = null;
    });
    
    localStorage.setItem(PWA_CONSTANTS.STORAGE_KEYS.A2HS_PROMPTED, 'true');
    installPromptShown = true;
}

// Show custom Add to Home Screen modal
function showAddToHomeScreenModal() {
    const modal = document.getElementById('addToHomeScreenModal');
    if (!modal) return;
    
    // Check if already installed or recently declined
    if (localStorage.getItem(PWA_CONSTANTS.STORAGE_KEYS.A2HS_INSTALLED) === 'true' ||
        localStorage.getItem(PWA_CONSTANTS.STORAGE_KEYS.A2HS_DECLINED) === 'true') {
        return;
    }
    
    showModal(modal);
    localStorage.setItem(PWA_CONSTANTS.STORAGE_KEYS.A2HS_PROMPTED, 'true');
}

// Install app function
async function installPWA() {
    if (!deferredPrompt) {
        // If no native prompt available, show instructions
        showBrowserInstructions();
        return;
    }
    
    try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('User accepted the PWA installation');
            localStorage.setItem(PWA_CONSTANTS.STORAGE_KEYS.A2HS_INSTALLED, 'true');
            showNotification('WIZA FOOD CAFE installed successfully! 🎉', 5000, 'success');
            hideModal(document.getElementById('addToHomeScreenModal'));
        } else {
            console.log('User declined the PWA installation');
            localStorage.setItem(PWA_CONSTANTS.STORAGE_KEYS.A2HS_DECLINED, 'true');
        }
        
        deferredPrompt = null;
    } catch (error) {
        console.error('Error installing PWA:', error);
        showBrowserInstructions();
    }
}

// Show browser-specific installation instructions
function showBrowserInstructions() {
    const instructions = document.getElementById('browserInstructions');
    if (instructions) {
        instructions.style.display = 'block';
    }
}

// NEW FUNCTION: Initialize automatic location detection
// MODIFIED: Initialize automatic location detection with proper loading states
function initializeAutoLocation() {
    updateLocationLoadingState(true);
    
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                userLocation = [position.coords.latitude, position.coords.longitude];
                console.log("User location obtained:", userLocation);
                
                // Automatically set current location as delivery location
                setCurrentLocationAsDelivery();
                
                // ADD THIS: Update delivery options
                updateDeliveryOptions();
                updateLocationBasedFeatures();
                updateLocationLoadingState(false);
                
                showNotification("Location detected! Delivery set to your current location. 📍", "success");
            },
            function(error) {
                console.error("Error getting location:", error);
                handleLocationError(error);
                
                // If location fails, set restaurant location as fallback
                userLocation = restaurantLocation;
                setCurrentLocationAsDelivery();
                
                // ADD THIS: Update delivery options even with fallback
                updateDeliveryOptions();
                updateLocationLoadingState(false);
                
                showNotification("Using default location. You can update it in settings.", "warning");
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    } else {
        showNotification("Geolocation not supported. Using default location.", "warning");
        userLocation = restaurantLocation;
        setCurrentLocationAsDelivery();
        
        // ADD THIS: Update delivery options
        updateDeliveryOptions();
        updateLocationLoadingState(false);
    }
}

// NEW FUNCTION: Set current location as delivery location automatically
function setCurrentLocationAsDelivery() {
    if (!userLocation) return;
    
    // Create a delivery location object from current coordinates
    state.deliveryLocation = {
        address: `Current Location (Auto-detected)`,
        notes: `Coordinates: ${userLocation[0].toFixed(6)}, ${userLocation[1].toFixed(6)}`,
        timestamp: new Date().toISOString(),
        coordinates: userLocation,
        type: 'current',
        autoDetected: true
    };
    
    // Save to localStorage
    localStorage.setItem(CONSTANTS.STORAGE_KEYS.DELIVERY_LOCATION, JSON.stringify(state.deliveryLocation));
    
    // Add to saved locations if not already there
    const existingIndex = state.savedLocations.findIndex(loc => loc.type === 'current');
    
    if (existingIndex === -1) {
        state.savedLocations.unshift(state.deliveryLocation);
        localStorage.setItem(CONSTANTS.STORAGE_KEYS.SAVED_LOCATIONS, JSON.stringify(state.savedLocations));
    }
    
    console.log("Automatically set delivery location:", state.deliveryLocation);
}

// ============================================================================
// PERMISSION MANAGEMENT SYSTEM
// ============================================================================

// Permission Popup System
function showPermissionPopups() {
    // Check if we need to show permission modal on first visit
    const hasSeenPermissionModal = localStorage.getItem('hasSeenPermissionModal');
    if (!hasSeenPermissionModal) {
        setTimeout(() => {
            createPermissionModal();
            showModal(document.getElementById('permissionModal'));
            localStorage.setItem('hasSeenPermissionModal', 'true');
        }, 2000);
    } else {
        // Show location permission first for returning users who haven't granted it
        const permissions = JSON.parse(localStorage.getItem('appPermissions') || '{}');
        if (!permissions.location) {
            setTimeout(() => {
                showLocationPermissionPopup();
            }, 2000);
        }
    }
}

// Create comprehensive permission modal
function createPermissionModal() {
    const modalHTML = `
        <div class="modal" id="permissionModal" role="dialog" aria-labelledby="permissionTitle" aria-modal="true" hidden>
            <div class="modal-content permission-modal">
                <div class="modal-header">
                    <button class="close-modal" data-modal="permissionModal" aria-label="Close permission popup">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="permission-content">
                        <div class="permission-logo">
                            <img src="wfc.png" alt="WIZA FOOD CAFE Logo" class="logo-img" width="80" height="80">
                        </div>
                        <h2 id="permissionTitle">Enable App Features</h2>
                        <p class="permission-text">
                            To provide the best experience, we need these permissions:
                        </p>
                        
                        <div class="permission-list">
                            <div class="permission-item" data-permission="location">
                                <div class="permission-icon">
                                    <i class="fas fa-map-marker-alt"></i>
                                </div>
                                <div class="permission-info">
                                    <h4>Location Access</h4>
                                    <p>For accurate delivery estimates and restaurant location</p>
                                </div>
                                <div class="permission-toggle">
                                    <label class="toggle-switch">
                                        <input type="checkbox" id="locationPermission" data-permission="location">
                                        <span class="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                            
                            <div class="permission-item" data-permission="notifications">
                                <div class="permission-icon">
                                    <i class="fas fa-bell"></i>
                                </div>
                                <div class="permission-info">
                                    <h4>Notifications</h4>
                                    <p>Get food deals, order updates and promotions every 30 minutes</p>
                                </div>
                                <div class="permission-toggle">
                                    <label class="toggle-switch">
                                        <input type="checkbox" id="notificationPermission" data-permission="notifications">
                                        <span class="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                            
                            <div class="permission-item" data-permission="phone">
                                <div class="permission-icon">
                                    <i class="fas fa-phone-alt"></i>
                                </div>
                                <div class="permission-info">
                                    <h4>Phone Calls</h4>
                                    <p>For Airtel Money payments and customer support</p>
                                </div>
                                <div class="permission-toggle">
                                    <label class="toggle-switch">
                                        <input type="checkbox" id="phonePermission" data-permission="phone">
                                        <span class="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                            
                            <div class="permission-item" data-permission="sms">
                                <div class="permission-icon">
                                    <i class="fas fa-comment-alt"></i>
                                </div>
                                <div class="permission-info">
                                    <h4>Messages</h4>
                                    <p>For payment confirmations and order updates</p>
                                </div>
                                <div class="permission-toggle">
                                    <label class="toggle-switch">
                                        <input type="checkbox" id="smsPermission" data-permission="sms">
                                        <span class="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="permission-actions">
                            <button class="btn-secondary" id="skipPermissions">
                                Skip for Now
                            </button>
                            <button class="btn-primary" id="allowAllPermissions">
                                Allow All
                            </button>
                        </div>
                        
                        <p class="permission-note">
                            You can change these anytime in Settings > App Permissions
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    if (!document.getElementById('permissionModal')) {
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        setupPermissionModalEvents();
    }
}

// Setup permission modal events
function setupPermissionModalEvents() {
    const modal = document.getElementById('permissionModal');
    const allowAllBtn = document.getElementById('allowAllPermissions');
    const skipBtn = document.getElementById('skipPermissions');
    const toggles = modal.querySelectorAll('.toggle-switch input');
    
    // Toggle individual permissions
    toggles.forEach(toggle => {
        toggle.addEventListener('change', function() {
            const permission = this.dataset.permission;
            if (this.checked) {
                requestSpecificPermission(permission);
            }
        });
    });
    
    // Allow all permissions
    if (allowAllBtn) {
        allowAllBtn.addEventListener('click', function() {
            requestAllPermissions();
        });
    }
    
    // Skip permissions
    if (skipBtn) {
        skipBtn.addEventListener('click', function() {
            hideModal(modal);
            showNotification('You can enable permissions later in settings', 'info');
        });
    }
    
    // Close button
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            hideModal(modal);
        });
    }
}

// Request specific permission
function requestSpecificPermission(permission) {
    switch (permission) {
        case 'location':
            requestLocationPermission().then(() => {
                updatePermissionUI('location', true);
                showNotification('Location access granted! 📍', 'success');
            }).catch(() => {
                updatePermissionUI('location', false);
            });
            break;
            
        case 'notifications':
            requestNotificationPermission().then(() => {
                updatePermissionUI('notifications', true);
                startBackgroundNotifications();
                showNotification('Notifications enabled! 🔔', 'success');
            }).catch(() => {
                updatePermissionUI('notifications', false);
            });
            break;
            
        case 'phone':
            // Phone permission is automatically granted for tel: links
            updatePermissionUI('phone', true);
            showNotification('Phone access enabled! 📞', 'success');
            break;
            
        case 'sms':
            requestSmsPermission().then(() => {
                updatePermissionUI('sms', true);
                showNotification('SMS access enabled! 💬', 'success');
            }).catch(() => {
                updatePermissionUI('sms', false);
            });
            break;
    }
}

// Request all permissions
function requestAllPermissions() {
    const permissions = ['location', 'notifications', 'phone', 'sms'];
    let completed = 0;
    
    permissions.forEach(permission => {
        requestSpecificPermission(permission);
        completed++;
        
        if (completed === permissions.length) {
            setTimeout(() => {
                hideModal(document.getElementById('permissionModal'));
                showNotification('All permissions granted! 🎉', 'success');
                
                // Show PWA install prompt
                setTimeout(() => {
                    showPWAInstallPrompt();
                }, 2000);
            }, 1000);
        }
    });
}

// Request notification permission
function requestNotificationPermission() {
    return new Promise((resolve, reject) => {
        if (!('Notification' in window)) {
            reject(new Error('Notifications not supported'));
            return;
        }
        
        if (Notification.permission === 'granted') {
            resolve();
            return;
        }
        
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                resolve();
            } else {
                reject(new Error('Permission denied'));
            }
        });
    });
}

// Request SMS permission
function requestSmsPermission() {
    return new Promise((resolve, reject) => {
        if (!('sms' in navigator)) {
            reject(new Error('SMS API not supported'));
            return;
        }
        
        // Note: SMS permission API is experimental
        navigator.permissions.query({ name: 'sms' })
            .then(permissionStatus => {
                if (permissionStatus.state === 'granted') {
                    resolve();
                } else {
                    reject(new Error('SMS permission not granted'));
                }
            })
            .catch(() => {
                resolve(); // Fallback - assume granted for basic functionality
            });
    });
}

// Update permission UI
function updatePermissionUI(permission, granted) {
    const toggle = document.getElementById(`${permission}Permission`);
    if (toggle) {
        toggle.checked = granted;
        const permissionItem = toggle.closest('.permission-item');
        if (permissionItem) {
            permissionItem.classList.toggle('permission-granted', granted);
        }
    }
    
    // Update in settings
    updatePermissionSettings(permission, granted);
}

// Update permission settings
function updatePermissionSettings(permission, granted) {
    const currentPermissions = JSON.parse(localStorage.getItem('appPermissions') || '{}');
    currentPermissions[permission] = granted;
    localStorage.setItem('appPermissions', JSON.stringify(currentPermissions));
}

// Start background notifications
function startBackgroundNotifications() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'START_BACKGROUND_NOTIFICATIONS'
        });
        showNotification('Background notifications started! You\'ll get food deals every 30 minutes 🍔', 'success');
    }
}

// Check permission status
function checkPermissionStatus() {
    return new Promise((resolve) => {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            const channel = new MessageChannel();
            
            channel.port1.onmessage = (event) => {
                resolve(event.data.status);
            };
            
            navigator.serviceWorker.controller.postMessage({
                type: 'CHECK_PERMISSIONS'
            }, [channel.port2]);
        } else {
            resolve({});
        }
    });
}

// Show permission status in settings
function showPermissionStatus() {
    checkPermissionStatus().then(status => {
        const statusElement = document.getElementById('permissionStatus');
        if (statusElement) {
            let html = '<h3>App Permissions</h3><div class="permission-status-list">';
            
            const permissions = [
                { key: 'notifications', name: 'Notifications', icon: 'bell' },
                { key: 'location', name: 'Location', icon: 'map-marker-alt' },
                { key: 'phone', name: 'Phone', icon: 'phone-alt' },
                { key: 'sms', name: 'Messages', icon: 'comment-alt' }
            ];
            
            permissions.forEach(perm => {
                const isGranted = status[perm.key] === 'granted' || 
                                (perm.key === 'phone' && status.phone !== 'denied') ||
                                (perm.key === 'sms' && status.sms !== 'denied');
                
                html += `
                    <div class="permission-status-item ${isGranted ? 'granted' : 'denied'}">
                        <div class="status-icon">
                            <i class="fas fa-${perm.icon}"></i>
                        </div>
                        <div class="status-info">
                            <strong>${perm.name}</strong>
                            <span>${isGranted ? 'Allowed' : 'Not allowed'}</span>
                        </div>
                        <div class="status-indicator">
                            <i class="fas fa-${isGranted ? 'check-circle' : 'times-circle'}"></i>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            statusElement.innerHTML = html;
        }
    });
}

// Add permission modal styles
function addPermissionModalStyles() {
    const styles = `
        .permission-modal {
            max-width: 500px;
            margin: 20px auto;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        
        .permission-content {
            padding: 10px;
        }
        
        .permission-logo {
            text-align: center;
            margin-bottom: 20px;
        }
        
        .permission-logo img {
            border-radius: 16px;
            box-shadow: 0 8px 24px rgba(76, 175, 80, 0.3);
        }
        
        .permission-content h2 {
            text-align: center;
            margin: 0 0 15px 0;
            font-size: 1.5rem;
            color: #333;
        }
        
        .permission-text {
            text-align: center;
            color: #666;
            margin-bottom: 25px;
            line-height: 1.5;
        }
        
        .permission-list {
            margin-bottom: 25px;
        }
        
        .permission-item {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 15px;
            border: 2px solid #f0f0f0;
            border-radius: 12px;
            margin-bottom: 12px;
            transition: all 0.3s ease;
        }
        
        .permission-item:hover {
            border-color: #4CAF50;
            background: #f9fff9;
        }
        
        .permission-item.permission-granted {
            border-color: #4CAF50;
            background: #f1f8e9;
        }
        
        .permission-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(135deg, #4CAF50, #45a049);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1.1rem;
        }
        
        .permission-info {
            flex: 1;
        }
        
        .permission-info h4 {
            margin: 0 0 5px 0;
            color: #333;
            font-size: 1rem;
        }
        
        .permission-info p {
            margin: 0;
            color: #666;
            font-size: 0.85rem;
            line-height: 1.4;
        }
        
        .toggle-switch {
            position: relative;
            display: inline-block;
            width: 50px;
            height: 24px;
        }
        
        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        
        .toggle-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .4s;
            border-radius: 24px;
        }
        
        .toggle-slider:before {
            position: absolute;
            content: "";
            height: 16px;
            width: 16px;
            left: 4px;
            bottom: 4px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
        }
        
        input:checked + .toggle-slider {
            background-color: #4CAF50;
        }
        
        input:checked + .toggle-slider:before {
            transform: translateX(26px);
        }
        
        .permission-actions {
            display: flex;
            gap: 12px;
            margin-bottom: 15px;
        }
        
        .permission-actions .btn-primary,
        .permission-actions .btn-secondary {
            flex: 1;
            padding: 14px 20px;
            border-radius: 12px;
            font-weight: 600;
            border: none;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .permission-actions .btn-primary {
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
        }
        
        .permission-actions .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
        }
        
        .permission-actions .btn-secondary {
            background: #f8f9fa;
            color: #666;
            border: 2px solid #e9ecef;
        }
        
        .permission-actions .btn-secondary:hover {
            background: #e9ecef;
        }
        
        .permission-note {
            text-align: center;
            font-size: 0.8rem;
            color: #999;
            margin: 0;
        }
        
        .permission-status-list {
            margin-top: 20px;
        }
        
        .permission-status-item {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 15px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            margin-bottom: 10px;
        }
        
        .permission-status-item.granted {
            border-color: #4CAF50;
            background: #f1f8e9;
        }
        
        .permission-status-item.denied {
            border-color: #f44336;
            background: #ffebee;
        }
        
        .status-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        
        .permission-status-item.granted .status-icon {
            background: #4CAF50;
        }
        
        .permission-status-item.denied .status-icon {
            background: #f44336;
        }
        
        .status-info {
            flex: 1;
        }
        
        .status-info strong {
            display: block;
            margin-bottom: 4px;
            color: #333;
        }
        
        .status-info span {
            font-size: 0.85rem;
            color: #666;
        }
        
        .status-indicator {
            font-size: 1.2rem;
        }
        
        .permission-status-item.granted .status-indicator {
            color: #4CAF50;
        }
        
        .permission-status-item.denied .status-indicator {
            color: #f44336;
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// ============================================================================
// EXISTING LOCATION PERMISSION FUNCTIONS (Modified)
// ============================================================================

// Add this function to create the location permission popup
function createLocationPermissionPopup() {
    const popupHTML = `
        <div class="modal" id="locationPermissionModal" role="dialog" aria-labelledby="locationPermissionTitle" aria-modal="true" hidden>
            <div class="modal-content location-permission-modal">
                <div class="modal-header">
                    <button class="close-modal" data-modal="locationPermissionModal" aria-label="Close location permission popup">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="location-permission-content">
                        <div class="location-permission-logo">
                            <img src="wfc.png" alt="WIZA FOOD CAFE Logo" class="logo-img" width="80" height="80">
                        </div>
                        <h2 id="locationPermissionTitle">Allow us to access your location</h2>
                        <p class="location-permission-text">
                            To provide you with accurate delivery estimates and show you nearby restaurants, 
                            we need access to your location. This helps us serve you better!
                        </p>
                        <div class="location-permission-features">
                            <div class="feature-item">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>Accurate delivery estimates</span>
                            </div>
                            <div class="feature-item">
                                <i class="fas fa-truck"></i>
                                <span>Real-time delivery tracking</span>
                            </div>
                            <div class="feature-item">
                                <i class="fas fa-percentage"></i>
                                <span>Precise delivery charges</span>
                            </div>
                        </div>
                        <div class="location-permission-actions">
                            <button class="btn-secondary" id="denyLocationBtn">
                                <i class="fas fa-times"></i> Not Now
                            </button>
                            <button class="btn-primary" id="allowLocationBtn">
                                <i class="fas fa-check"></i> Allow Location Access
                            </button>
                        </div>
                        <p class="location-permission-note">
                            You can always change this later in your browser settings
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add the modal to the body if it doesn't exist
    if (!document.getElementById('locationPermissionModal')) {
        document.body.insertAdjacentHTML('beforeend', popupHTML);
        setupLocationPermissionEvents();
    }
}

// Add this function to set up the location permission events
// Update the location permission success handler
function setupLocationPermissionEvents() {
    const modal = document.getElementById('locationPermissionModal');
    const allowBtn = document.getElementById('allowLocationBtn');
    const denyBtn = document.getElementById('denyLocationBtn');
    
    if (allowBtn) {
        allowBtn.addEventListener('click', function() {
            hideModal(modal);
            requestLocationPermission().then(() => {
                updatePermissionUI('location', true);
                showNotification('Thank you for allowing location access! 📍', 'success');
                
                // Show PWA install prompt after a delay
                setTimeout(() => {
                    showPWAInstallPrompt();
                }, PWA_CONSTANTS.PROMPT_DELAY);
                
            }).catch(error => {
                console.error('Location permission error:', error);
                updatePermissionUI('location', false);
            });
        });
    }
    
    if (denyBtn) {
        denyBtn.addEventListener('click', function() {
            hideModal(modal);
            updatePermissionUI('location', false);
            showNotification('You can enable location access later in settings.', 'warning');
            // Set default location as fallback
            userLocation = restaurantLocation;
            setCurrentLocationAsDelivery();
            
            // Still show PWA prompt but after a longer delay
            setTimeout(() => {
                showPWAInstallPrompt();
            }, PWA_CONSTANTS.PROMPT_DELAY + 2000);
        });
    }
    
    // Setup close button
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            hideModal(modal);
            updatePermissionUI('location', false);
            // Show PWA prompt after a longer delay
            setTimeout(() => {
                showPWAInstallPrompt();
            }, PWA_CONSTANTS.PROMPT_DELAY + 2000);
        });
    }
}

// Add this function to show the location permission popup
function showLocationPermissionPopup() {
    createLocationPermissionPopup();
    const modal = document.getElementById('locationPermissionModal');
    
    // Only show if we haven't asked before or if location was denied
    const hasAskedLocation = localStorage.getItem('hasAskedLocation');
    const locationDenied = localStorage.getItem('locationDenied');
    
    if (!hasAskedLocation || locationDenied === 'true') {
        setTimeout(() => {
            showModal(modal);
            localStorage.setItem('hasAskedLocation', 'true');
        }, 2000); // Show after 2 seconds delay
    }
}

// ============================================================================
// PWA EVENT LISTENERS AND STYLES
// ============================================================================

// Add PWA install button event listeners
function setupPWAEventListeners() {
    // Install app button
    const installBtn = document.getElementById('installAppBtn');
    if (installBtn) {
        installBtn.addEventListener('click', installPWA);
    }
    
    // Later button
    const laterBtn = document.getElementById('laterAddToHomeScreen');
    if (laterBtn) {
        laterBtn.addEventListener('click', function() {
            localStorage.setItem(PWA_CONSTANTS.STORAGE_KEYS.A2HS_DECLINED, 'true');
            hideModal(document.getElementById('addToHomeScreenModal'));
            showNotification('You can always install the app later from the browser menu.', 'info');
        });
    }
    
    // Close modal button
    const closeBtn = document.querySelector('[data-modal="addToHomeScreenModal"]');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            localStorage.setItem(PWA_CONSTANTS.STORAGE_KEYS.A2HS_DECLINED, 'true');
        });
    }
}

// Add PWA styles function
function addPWAInstallStyles() {
    const styles = `
        .pwa-install-btn {
            position: fixed;
            bottom: 80px;
            right: 15px;
            background: linear-gradient(135deg, #ff7b00, #ff4d00);
            color: white;
            border: none;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(255, 123, 0, 0.4);
            z-index: 1000;
            transition: all 0.3s ease;
        }
        
        .pwa-install-btn:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 20px rgba(255, 123, 0, 0.6);
        }
        
        .pwa-install-btn.hidden {
            display: none;
        }
        
        @media (max-width: 768px) {
            .pwa-install-btn {
                bottom: 70px;
                right: 10px;
                width: 45px;
                height: 45px;
            }
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// ============================================================================
// GEOLOCATION FUNCTIONS
// ============================================================================

// Geolocation Functions
function requestLocationPermission(forceRefresh = false) {
    return new Promise((resolve, reject) => {
        if (!forceRefresh && userLocation) {
            resolve(userLocation);
            return;
        }

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    userLocation = [position.coords.latitude, position.coords.longitude];
                    console.log("User location obtained:", userLocation);
                    
                    // ADD THIS: Update delivery options when location is obtained
                    updateDeliveryOptions();
                    updateLocationBasedFeatures();
                    updateCurrentLocationDisplay();
                    updatePickupDistanceDisplay();
                    updateDeliveryAddressDisplay();
                    
                    localStorage.setItem('locationDenied', 'false');
                    resolve(userLocation);
                },
                function(error) {
                    console.error("Error getting location:", error);
                    localStorage.setItem('locationDenied', 'true');
                    handleLocationError(error);
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                }
            );
        } else {
            const error = new Error("Geolocation not supported");
            handleLocationError(error);
            reject(error);
        }
    });
}
// Update delivery address display on the delivery button
function updateDeliveryAddressDisplay() {
    if (!userLocation) return;
    
    const distance = calculateDistance(userLocation, restaurantLocation);
    const distanceKm = (distance / 1000).toFixed(1);
    const deliveryCharge = calculateDeliveryCharge(distance);
    
    const deliveryDesc = document.getElementById('deliveryAddress');
    if (!deliveryDesc) return;
    
    reverseGeocode(userLocation[0], userLocation[1])
        .then(address => {
            const addressParts = [];
            
            // Add house number if available
            if (address.house_number) {
                addressParts.push(address.house_number);
            }
            
            // Add road/street
            if (address.road) {
                addressParts.push(address.road);
            }
            
            // Add suburb/area
            if (address.suburb) {
                addressParts.push(address.suburb);
            }
            
            // Add city
            if (address.city) {
                addressParts.push(address.city);
            }
            
            // Format the address string
            let addressText = addressParts.join(', ');
            if (addressText.length > 50) {
                // Truncate long addresses but keep essential parts
                const essentialParts = [];
                if (address.house_number) essentialParts.push(address.house_number);
                if (address.road) essentialParts.push(address.road);
                if (address.city) essentialParts.push(address.city);
                addressText = essentialParts.join(', ');
            }
            
            let distanceText;
            if (distance <= 120) {
                distanceText = `${distanceKm}km • K${deliveryCharge} (min. fee)`;
            } else {
                distanceText = `${distanceKm}km • K${deliveryCharge} delivery`;
            }
            
            deliveryDesc.innerHTML = `
                <span class="delivery-address-main">${addressText}</span>
                <span class="delivery-distance">${distanceText}</span>
            `;
        })
        .catch(error => {
            console.error('Error getting address for delivery display:', error);
            // Fallback to basic information
            let distanceText;
            if (distance <= 120) {
                distanceText = `${distanceKm}km • K${deliveryCharge} (min. fee)`;
            } else {
                distanceText = `${distanceKm}km • K${deliveryCharge} delivery`;
            }
            
            deliveryDesc.innerHTML = `
                <span class="delivery-address-main">Your Current Location</span>
                <span class="delivery-distance">${distanceText}</span>
            `;
        });
}

// Update pickup distance display
function updatePickupDistanceDisplay() {
    if (!userLocation) return;
    
    const distance = calculateDistance(userLocation, restaurantLocation);
    const distanceKm = (distance / 1000).toFixed(1);
    
    const pickupDesc = document.getElementById('pickupDistance');
    if (pickupDesc) {
        pickupDesc.innerHTML = `
            <span class="pickup-distance">You are ${distanceKm}km from the restaurant</span>
        `;
    }
}

// Update the location-based features to include both functions
function updateLocationBasedFeatures() {
    if (userLocation) {
        updateDeliveryOptions();
        updateCartLocationInfo();
        updateLocationToggleDisplay();
        updatePickupDistanceDisplay();
        updateDeliveryAddressDisplay();
    }
}

// Add this function to handle Airtel Money payment
function initiateAirtelMoneyPayment(totalAmount, orderRef) {
    try {
        // Format the USSD code with the order amount and reference
        const formattedAmount = Math.round(totalAmount); // Remove decimals for USSD
        const ussdCode = `${CONSTANTS.AIRTEL_MONEY.USSD_CODE}${CONSTANTS.AIRTEL_MONEY.MERCHANT_CODE}*${formattedAmount}#`;
        
        console.log('Airtel Money USSD Code:', ussdCode);
        
        // Show payment instructions first
        showAirtelPaymentInstructions(ussdCode, totalAmount, orderRef);
        
        // Then automatically launch USSD dialer after a short delay
        setTimeout(() => {
            launchUSSDDialer(ussdCode);
        }, 1500);
        
        return ussdCode;
    } catch (error) {
        console.error('Error initiating Airtel Money payment:', error);
        showNotification('Error initiating payment. Please try manual payment.', CONSTANTS.NOTIFICATION.ERROR, 'error');
        return null;
    }
}

// Add this function to test the checkout flow
function testCheckoutFlow() {
    console.log('Testing checkout flow...');
    
    // Check if cart has items
    if (state.cart.length === 0) {
        console.log('Cart is empty, adding test item');
        // Add a test item
        state.cart.push({
            id: 1,
            name: 'Test Item',
            price: 10.00,
            quantity: 1,
            image: 'default-food.jpg'
        });
        updateCartUI();
    }
    
    // Check if payment modal exists
    if (!elements.payment.modal) {
        console.error('Payment modal not found!');
        return;
    }
    
    console.log('Opening payment modal...');
    openPaymentModal();
}

// ENHANCED: USSD Dialer function with automatic # inclusion
function launchUSSDDialer(ussdCode) {
    try {
        console.log('USSD Code for dialer:', ussdCode);
        
        // Create the tel link WITH the # character
        const telLink = `tel:${ussdCode}`;
        
        console.log('Tel link with #:', telLink);
        
        // Create a temporary link and click it
        const link = document.createElement('a');
        link.href = telLink;
        link.style.display = 'none';
        document.body.appendChild(link);
        
        // Try to open the dialer
        link.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(link);
        }, 1000);
        
        console.log('USSD dialer launched with code:', ussdCode);
        
        // Simulate automatic calling with # after a delay
        setTimeout(() => {
            simulateUSSDCompletion(ussdCode);
        }, 2000);
        
    } catch (error) {
        console.error('Error launching USSD dialer:', error);
        // Fallback: show manual instructions
        showManualDialInstructions(ussdCode);
    }
}

// ENHANCED: Simulate USSD completion with automatic calling
function simulateUSSDCompletion(ussdCode) {
    try {
        // Show notification that dialer is opening
        showNotification('📱 Opening Airtel Money dialer... Please wait for automatic calling.', CONSTANTS.NOTIFICATION.SUCCESS, 'success');
        
        // Update payment status
        updatePaymentStatus('dialing');
        
        // Show enhanced instructions with auto-call feature
        showEnhancedPaymentInstructions(ussdCode);
        
        // Simulate automatic calling after another delay
        setTimeout(() => {
            showNotification('🔗 Connecting to Airtel Money... The call should initiate automatically.', CONSTANTS.NOTIFICATION.SUCCESS, 'success');
            updatePaymentStatus('payment');
        }, 3000);
        
    } catch (error) {
        console.error('Error in USSD completion simulation:', error);
    }
}

// NEW FUNCTION: Update payment status in the UI
function updatePaymentStatus(status) {
    const steps = document.querySelectorAll('.status-step');
    
    // Reset all steps
    steps.forEach(step => {
        step.classList.remove('active', 'completed');
    });
    
    // Update based on status
    switch(status) {
        case 'dialing':
            document.getElementById('step1')?.classList.add('completed');
            document.getElementById('step2')?.classList.add('active');
            break;
        case 'payment':
            document.getElementById('step1')?.classList.add('completed');
            document.getElementById('step2')?.classList.add('completed');
            document.getElementById('step3')?.classList.add('active');
            break;
        case 'completed':
            steps.forEach(step => step.classList.add('completed'));
            break;
    }
}

// ENHANCED: Show enhanced payment instructions with auto-call info
function showEnhancedPaymentInstructions(ussdCode) {
    const paymentHelp = document.querySelector('.payment-help');
    if (paymentHelp) {
        paymentHelp.innerHTML = `
            <p><i class="fas fa-info-circle"></i> 
            <strong>Auto-Dial in Progress:</strong></p>
            <ol style="text-align: left; margin: 10px 0; padding-left: 20px;">
                <li>📱 Dialer opening automatically...</li>
                <li>🔗 USSD code with # will be pre-filled</li>
                <li>📞 Call will initiate automatically</li>
                <li>⌛ Wait for Airtel Money menu</li>
                <li>🔢 Enter your PIN when prompted</li>
                <li>✅ Payment processes automatically</li>
            </ol>
            <p><strong>Manual Option:</strong> If auto-dial fails, manually dial: <code>${ussdCode}</code></p>
            <p><strong>Support:</strong> ${CONSTANTS.AIRTEL_MONEY.SUPPORT_NUMBER} (${CONSTANTS.AIRTEL_MONEY.SUPPORT_NAME})</p>
            <button class="btn-secondary" id="retryDialer" style="margin-top: 10px;">
                <i class="fas fa-redo"></i> Retry Auto-Dial
            </button>
        `;
        
        // Add retry functionality
        document.getElementById('retryDialer')?.addEventListener('click', () => {
            launchUSSDDialer(ussdCode);
        });
    }
}

// Function to show manual dial instructions as fallback
function showManualDialInstructions(ussdCode) {
    const manualInstructions = `
        <div class="manual-dial-instructions">
            <h4>Manual Dial Instructions</h4>
            <p>If auto-dial didn't work, please:</p>
            <ol>
                <li>Open your phone dialer manually</li>
                <li>Dial exactly: <strong>${ussdCode}</strong></li>
                <li>Make sure to include the <strong>#</strong> at the end</li>
                <li>Press the call button</li>
                <li>Follow the Airtel Money prompts</li>
                <li>Complete the payment</li>
            </ol>
            <button class="btn-primary" onclick="copyUSSDCode('${ussdCode}')">
                <i class="fas fa-copy"></i> Copy USSD Code
            </button>
        </div>
    `;
    
    // You can show this in a modal or notification
    showNotification('Please manually dial the USSD code: ' + ussdCode, 10000, 'warning');
}

// Function to copy USSD code to clipboard
function copyUSSDCode(ussdCode) {
    navigator.clipboard.writeText(ussdCode).then(() => {
        showNotification('USSD code copied to clipboard! 📋', CONSTANTS.NOTIFICATION.SUCCESS, 'success');
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = ussdCode;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('USSD code copied to clipboard! 📋', CONSTANTS.NOTIFICATION.SUCCESS, 'success');
    });
}

// Function to show Airtel payment instructions
// MODIFIED: Show Airtel payment instructions with better UX
function showAirtelPaymentInstructions(ussdCode, amount, orderRef) {
    // Update the payment modal content
    const paymentInstructions = document.querySelector('.airtel-instructions');
    if (paymentInstructions) {
        paymentInstructions.innerHTML = `
            <div class="airtel-payment-flow">
                <h4>Complete Payment with Airtel Money</h4>
                
                <div class="payment-status" id="paymentStatus">
                    <div class="status-step active" id="step1">
                        <div class="step-number">1</div>
                        <div class="step-info">
                            <strong>Auto-Dial Starting</strong>
                            <p>Preparing to open dialer automatically...</p>
                        </div>
                    </div>
                    
                    <div class="status-step" id="step2">
                        <div class="step-number">2</div>
                        <div class="step-info">
                            <strong>Dialing with #</strong>
                            <p>USSD code with # will auto-dial</p>
                        </div>
                    </div>
                    
                    <div class="status-step" id="step3">
                        <div class="step-number">3</div>
                        <div class="step-info">
                            <strong>Enter PIN & Confirm</strong>
                            <p>Enter your Airtel Money PIN to pay K${amount}</p>
                        </div>
                    </div>
                    
                    <div class="status-step" id="step4">
                        <div class="step-number">4</div>
                        <div class="step-info">
                            <strong>Payment Processing</strong>
                            <p>Wait for payment confirmation</p>
                        </div>
                    </div>
                </div>

                <div class="ussd-code-display">
                    <label>USSD Code (Auto-dialed with #):</label>
                    <div class="ussd-code">
                        <code>${ussdCode}</code>
                        <button class="copy-btn" onclick="copyUSSDCode('${ussdCode}')">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                </div>

                <div class="payment-details-grid">
                    <div class="payment-detail">
                        <span class="detail-label">Amount to Pay:</span>
                        <span class="detail-value">K${amount}</span>
                    </div>
                    <div class="payment-detail">
                        <span class="detail-label">Order Reference:</span>
                        <span class="detail-value">${orderRef}</span>
                    </div>
                    <div class="payment-detail">
                        <span class="detail-label">Merchant:</span>
                        <span class="detail-value">WIZA FOOD CAFE</span>
                    </div>
                </div>

                <div class="payment-help">
                    <p><i class="fas fa-bolt"></i> 
                    <strong>Auto-dial feature activated!</strong> 
                    The dialer will open automatically with the USSD code including #.</p>
                </div>
            </div>
        `;
    }
}

// MODIFIED: Remove manual location prompt from error handling
function handleLocationError(error) {
    let message = "Unable to get your location automatically. ";
    
    switch(error.code) {
        case error.PERMISSION_DENIED:
            message += "Using default location. Delivery charges may vary.";
            break;
        case error.POSITION_UNAVAILABLE:
            message += "Using default location.";
            break;
        case error.TIMEOUT:
            message += "Location request timed out. Using default location.";
            break;
        default:
            message += "Using default location.";
            break;
    }
    
    showNotification(message, "warning");
    
    // Set restaurant location as fallback
    userLocation = restaurantLocation;
    setCurrentLocationAsDelivery();
}

function promptManualLocation() {
    const useDefault = confirm("Unable to get your location automatically. Would you like to enter it manually?");
    if (useDefault) {
        showLocationModal();
    } else {
        userLocation = restaurantLocation;
        updateLocationBasedFeatures();
    }
}

// MODIFIED: Simplify location-based features setup
function setupLocationBasedFeatures() {
    updateDeliveryOptions();
    updateCartLocationInfo();
}

function updateLocationBasedFeatures() {
    if (userLocation) {
        updateDeliveryOptions();
        updateCartLocationInfo();
        updateLocationToggleDisplay();
        updatePickupDistanceDisplay();
        updateDeliveryAddressDisplay();
    }
}

// Also, update the updateDeliveryOptions function to be more robust
function updateDeliveryOptions() {
    if (!userLocation) return;
    
    const distance = calculateDistance(userLocation, restaurantLocation);
    const deliveryCharge = calculateDeliveryCharge(distance);
    const distanceKm = (distance / 1000).toFixed(1);
    
    const deliveryOption = document.getElementById('deliveryOption');
    const pickupOption = document.getElementById('pickupOption');
    
    if (deliveryOption) {
        const descElement = deliveryOption.querySelector('.option-desc');
        if (descElement) {
            // Get detailed address for better display
            reverseGeocode(userLocation[0], userLocation[1])
                .then(address => {
                    const locationName = address.road || address.suburb || address.city || 'Your Location';
                    const cityName = address.city || address.town || address.village || '';
                    
                    let deliveryText;
                    if (distance <= 120) {
                        deliveryText = `Delivery to ${locationName} (K${deliveryCharge} minimum fee) - ${distanceKm}km away`;
                    } else {
                        deliveryText = `Delivery to ${locationName} (+K${deliveryCharge}) - ${distanceKm}km away`;
                    }
                    
                    if (cityName) {
                        deliveryText = `Delivery to ${locationName}, ${cityName} (+K${deliveryCharge}) - ${distanceKm}km away`;
                    }
                    
                    descElement.textContent = deliveryText;
                })
                .catch(error => {
                    // Fallback display
                    let deliveryText;
                    if (distance <= 120) {
                        deliveryText = `Get your order delivered (K${deliveryCharge} minimum fee) - ${distanceKm}km away`;
                    } else {
                        deliveryText = `Get your order delivered (+K${deliveryCharge}) - ${distanceKm}km away`;
                    }
                    descElement.textContent = deliveryText;
                });
        }
    }
    
    if (pickupOption) {
        const descElement = pickupOption.querySelector('.option-desc');
        if (descElement) {
            descElement.textContent = `Pick up your order at the cafe - ${distanceKm}km away`;
        }
    }
    
    // Update global delivery info for cart calculations
    window.deliveryInfo = {
        distance: distance,
        charge: deliveryCharge,
        userLocation: userLocation,
        restaurantLocation: restaurantLocation,
        distanceKm: distanceKm
    };
    
    // Update delivery address display if elements exist
    updateDeliveryAddressDisplay();
    updatePickupDistanceDisplay();
}

// Enhanced distance calculation using Haversine formula
function calculateDistance(point1, point2) {
    // Using Haversine formula for accurate distance calculation
    const R = 6371000; // Earth's radius in meters
    const dLat = (point2[0] - point1[0]) * Math.PI / 180;
    const dLon = (point2[1] - point1[1]) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1[0] * Math.PI / 180) * Math.cos(point2[0] * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in meters
}

// Function to refresh delivery options (call this when location changes)
function refreshDeliveryOptions() {
    if (userLocation) {
        updateDeliveryOptions();
        updateCartUI(); // Update cart to reflect new delivery charges
    }
}

// Call this function when user location is updated
function onUserLocationUpdated() {
    updateDeliveryOptions();
    updateCartUI();
    updateLocationBasedFeatures();
}

function calculateDeliveryCharge(distance) {
    // If customer is 120 meters or less, delivery fee is K10 (minimum price)
    if (distance <= 120) {
        return 10;
    }
    
    // Calculate charge: K1 per 120 meters
    const charge = Math.ceil(distance / 90);
    return Math.max(charge, 10); // Minimum charge of K10
}

function updateCartLocationInfo() {
    if (window.updateCartSummary) {
        window.updateCartSummary();
    }
}

function updateLocationToggleDisplay() {
    const locationToggle = document.getElementById('locationToggle');
    if (locationToggle && userLocation) {
        locationToggle.innerHTML = '<i class="fas fa-map-marker-alt"></i>';
        locationToggle.title = `Your location: ${userLocation[0].toFixed(4)}, ${userLocation[1].toFixed(4)}`;
    }
}

function showPickupMap() {
    showRestaurantMapModal();
}

function createMapModal() {
    const modalHTML = `
        <div class="modal" id="pickupMapModal" role="dialog" aria-labelledby="pickupMapTitle" aria-modal="true" hidden>
            <div class="modal-content large-modal">
                <div class="modal-header">
                    <div class="modal-logo">
                        <img src="wfc.png" alt="WIZA FOOD CAFE Logo" class="logo-img" width="50" height="50">
                        <h2 id="pickupMapTitle">Follow the map to our restaurant</h2>
                    </div>
                    <button class="close-modal" data-modal="pickupMapModal" aria-label="Close map">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="pickupMap" style="height: 400px; width: 100%; border-radius: 8px; margin: 15px 0;"></div>
                    <div class="map-actions">
                        <button class="btn-primary" id="directionsBtn">
                            <i class="fas fa-directions"></i> Get Directions
                        </button>
                    </div>
                    <div class="location-details">
                        <div class="detail-item">
                            <strong>Restaurant Address:</strong> 
                            <span>WIZA FOOD CAFE, -15.402236, 28.329943</span>
                        </div>
                        <div class="detail-item">
                            <strong>Distance:</strong> 
                            <span id="mapDistance">Calculating...</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Only add if it doesn't exist
    if (!document.getElementById('pickupMapModal')) {
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    return document.getElementById('pickupMapModal');
}

// Add this function to create directions button functionality
function createDirectionsButton() {
    return document.getElementById('directionsBtn');
}

function enhanceCartSummary() {
    const originalUpdateCartSummary = window.updateCartSummary;
    
    window.updateCartSummary = function() {
        if (originalUpdateCartSummary) {
            originalUpdateCartSummary();
        }
        
        const deliveryOption = document.getElementById('deliveryOption');
        const isDelivery = deliveryOption && deliveryOption.classList.contains('selected');
        
        if (isDelivery && window.deliveryInfo) {
            const deliveryElement = document.getElementById('cartDelivery');
            if (deliveryElement) {
                deliveryElement.textContent = `K${window.deliveryInfo.charge}.00`;
            }
        }
        
        updateTotalAmount();
    };
}

function updateTotalAmount() {
    const subtotalElement = document.getElementById('cartSubtotal');
    const deliveryElement = document.getElementById('cartDelivery');
    const totalElement = document.getElementById('totalAmount');
    
    if (subtotalElement && deliveryElement && totalElement) {
        const subtotal = parseFloat(subtotalElement.textContent.replace('K', '')) || 0;
        const delivery = parseFloat(deliveryElement.textContent.replace('K', '')) || 0;
        const service = 2.00;
        const discount = parseFloat(document.getElementById('cartDiscount')?.textContent.replace('-K', '')) || 0;
        
        const total = subtotal + delivery + service - discount;
        totalElement.textContent = `K${total.toFixed(2)}`;
        
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) {
            checkoutBtn.disabled = total <= 0;
        }
    }
}

function addMapStyles() {
    const styles = `
        .large-modal {
            max-width: 600px;
            margin: 20px auto;
        }
        .modal-logo {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 10px;
        }
        .modal-logo h2 {
            margin: 0;
            font-size: 1.4em;
            color: #333;
        }
        .map-actions {
            text-align: center;
            margin: 15px 0;
        }
        .btn-primary {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 16px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: background 0.3s;
        }
        .btn-primary:hover {
            background: #45a049;
        }
        .location-details {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 8px;
            margin-top: 15px;
        }
        .detail-item {
            margin: 8px 0;
            font-size: 14px;
        }
        .map-popup {
            text-align: center;
            padding: 5px;
        }
        #pickupMap {
            min-height: 300px;
            border: 2px solid #e0e0e0;
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}


// Enhanced Geolocation Functions
let locationMap = null;
let currentLocationMarker = null;
let restaurantLocationMarker = null;

// Fix the setupLocationModal function
function setupLocationModal() {
    const locationToggle = document.getElementById('locationToggle');
    const refreshLocationBtn = document.getElementById('refreshLocation');
    const useCurrentLocationBtn = document.getElementById('useCurrentLocation');
    const retryLocationBtn = document.getElementById('retryLocation');

    // Fix: Use event delegation instead of cloning
    if (locationToggle) {
        locationToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showDeliveryMapModal(); // Show delivery map on first click
        });
    }

    if (refreshLocationBtn) {
        refreshLocationBtn.addEventListener('click', refreshUserLocation);
    }

    if (useCurrentLocationBtn) {
        useCurrentLocationBtn.addEventListener('click', useCurrentLocation);
    }

    if (retryLocationBtn) {
        retryLocationBtn.addEventListener('click', requestLocationPermission);
    }
}

// NEW FUNCTION: Create delivery map modal
function createDeliveryMapModal() {
    const modalHTML = `
        <div class="modal" id="deliveryMapModal" role="dialog" aria-labelledby="deliveryMapTitle" aria-modal="true" hidden>
            <div class="modal-content large-modal">
                <div class="modal-header">
                    <div class="modal-logo">
                        <img src="wfc.png" alt="WIZA FOOD CAFE Logo" class="logo-img" width="50" height="50">
                        <h2 id="deliveryMapTitle">Delivery Route & Details</h2>
                    </div>
                    <button class="close-modal" data-modal="deliveryMapModal" aria-label="Close delivery map">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="deliveryMap" style="height: 400px; width: 100%; border-radius: 8px; margin: 15px 0;"></div>
                    
                    <div class="delivery-details-grid">
                        <div class="delivery-info-card">
                            <div class="info-icon">
                                <i class="fas fa-map-marker-alt"></i>
                            </div>
                            <div class="info-content">
                                <h4>Your Location</h4>
                                <p id="userLocationFullDetails">Loading address...</p>
                            </div>
                        </div>
                        
                        <div class="delivery-info-card">
                            <div class="info-icon">
                                <i class="fas fa-store"></i>
                            </div>
                            <div class="info-content">
                                <h4>Restaurant Location</h4>
                                <p id="restaurantLocationFullDetails">WIZA FOOD CAFE, Plot 123, Great East Road, Lusaka, Zambia</p>
                            </div>
                        </div>
                        
                        <div class="delivery-info-card">
                            <div class="info-icon">
                                <i class="fas fa-road"></i>
                            </div>
                            <div class="info-content">
                                <h4>Distance</h4>
                                <p id="deliveryDistanceDetailed">Calculating...</p>
                            </div>
                        </div>
                        
                        <div class="delivery-info-card">
                            <div class="info-icon">
                                <i class="fas fa-money-bill-wave"></i>
                            </div>
                            <div class="info-content">
                                <h4>Delivery Fee</h4>
                                <p id="deliveryFeeDetailed">Calculating...</p>
                            </div>
                        </div>
                        
                        <div class="delivery-info-card">
                            <div class="info-icon">
                                <i class="fas fa-clock"></i>
                            </div>
                            <div class="info-content">
                                <h4>Estimated Time</h4>
                                <p id="estimatedTimeDetailed">Calculating...</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="map-actions">
                        <button class="btn-primary" id="agreeDeliveryBtn">
                            <i class="fas fa-check"></i> Agree & Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    if (!document.getElementById('deliveryMapModal')) {
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        setupEnhancedDeliveryMapModalEvents();
    }
    
    return document.getElementById('deliveryMapModal');
}

function setupEnhancedDeliveryMapModalEvents() {
    const modal = document.getElementById('deliveryMapModal');
    const agreeBtn = document.getElementById('agreeDeliveryBtn');
    
    if (agreeBtn) {
        agreeBtn.addEventListener('click', function() {
            hideModal(modal);
            showNotification('Delivery details confirmed! ✅', 'success');
        });
    }
    
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            hideModal(modal);
        });
    }
}

// NEW FUNCTION: Show delivery map modal (this is what gets called on first click)
function showDeliveryMapModal() {
    createDeliveryMapModal();
    const modal = document.getElementById('deliveryMapModal');
    
    if (!userLocation) {
        // If no location, request permission first
        requestLocationPermission().then(() => {
            initializeDeliveryMap();
            showModal(modal);
        }).catch(error => {
            // If location fails, still show the map with restaurant location
            initializeDeliveryMap();
            showModal(modal);
        });
    } else {
        initializeDeliveryMap();
        showModal(modal);
    }
}

// NEW FUNCTION: Initialize delivery map with route
// MODIFIED: Initialize delivery map with better error handling
function initializeDeliveryMap() {
    const mapContainer = document.getElementById('deliveryMap');
    if (!mapContainer) return;
    
    // Show loading state
    updateDeliveryDetails(); // This will show "Calculating..." messages
    
    // Clear any existing map
    if (window.deliveryMapInstance) {
        window.deliveryMapInstance.remove();
    }
    
    // Use user location as center, or restaurant location as fallback
    const center = userLocation || restaurantLocation;
    
    try {
        // Initialize the map
        window.deliveryMapInstance = L.map('deliveryMap').setView(center, 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(window.deliveryMapInstance);
        
        // Add restaurant marker
        const restaurantMarker = L.marker(restaurantLocation)
            .addTo(window.deliveryMapInstance)
            .bindPopup(`
                <div class="map-popup">
                    <strong>🍽️ WIZA FOOD CAFE</strong><br>
                    <hr style="margin: 5px 0;">
                    <strong>Address:</strong> Plot 123, Great East Road<br>
                    <strong>City:</strong> Lusaka<br>
                    <strong>Country:</strong> Zambia
                </div>
            `);
        
        // Add user marker and route if location is available
        if (userLocation) {
            // Get detailed address for user location
            reverseGeocode(userLocation[0], userLocation[1])
                .then(address => {
                    const userAddress = formatFullAddress(address);
                    document.getElementById('userLocationDetails').textContent = userAddress;
                    
                    L.marker(userLocation)
                        .addTo(window.deliveryMapInstance)
                        .bindPopup(`
                            <div class="map-popup">
                                <strong>📍 Your Location</strong><br>
                                <hr style="margin: 5px 0;">
                                ${userAddress}
                            </div>
                        `);
                    
                    // Add route between locations
                    addRouteToDeliveryMap(userLocation, restaurantLocation);
                    
                    // Fit map to show both locations with padding
                    const group = new L.featureGroup([
                        L.marker(userLocation),
                        L.marker(restaurantLocation)
                    ]);
                    window.deliveryMapInstance.fitBounds(group.getBounds().pad(0.2));
                    
                })
                .catch(error => {
                    console.error('Error getting user address:', error);
                    document.getElementById('userLocationDetails').textContent = 'Current Location (Auto-detected)';
                    
                    L.marker(userLocation)
                        .addTo(window.deliveryMapInstance)
                        .bindPopup(`
                            <div class="map-popup">
                                <strong>📍 Your Location</strong><br>
                                <hr style="margin: 5px 0;">
                                <em>Address details unavailable</em>
                            </div>
                        `);
                });
        } else {
            // Just show restaurant location
            window.deliveryMapInstance.setView(restaurantLocation, 15);
            document.getElementById('userLocationDetails').textContent = 'Enable location access to see your address';
        }
    } catch (error) {
        console.error('Error initializing map:', error);
        handleRouteCalculationError(error);
    }
}

// Add loading state styles
function addLoadingStyles() {
    const styles = `
        .loading-text {
            color: #666;
            font-style: italic;
        }
        
        .fa-spinner {
            color: #4CAF50;
        }
        
        .delivery-address-main.loading,
        .pickup-distance.loading {
            color: #999;
        }
        
        .calculating {
            opacity: 0.7;
            font-style: italic;
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}
// NEW FUNCTION: Update location loading state
function updateLocationLoadingState(isLoading = true) {
    const locationToggle = document.getElementById('locationToggle');
    const deliveryAddress = document.getElementById('deliveryAddress');
    const pickupDistance = document.getElementById('pickupDistance');
    
    if (isLoading) {
        if (locationToggle) {
            locationToggle.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }
        if (deliveryAddress) {
            deliveryAddress.innerHTML = '<span class="delivery-address-main">Location loading...</span>';
        }
        if (pickupDistance) {
            pickupDistance.innerHTML = '<span class="pickup-distance">Calculating distance...</span>';
        }
    } else {
        // Loading complete - update with actual data
        updateCurrentLocationDisplay();
        updateDeliveryAddressDisplay();
        updatePickupDistanceDisplay();
    }
}
// NEW FUNCTION: Update delivery details with calculations
// MODIFIED: Update delivery details with loading states
function updateDeliveryDetails() {
    if (!userLocation) {
        userLocation = restaurantLocation;
    }
    
    const distance = calculateDistance(userLocation, restaurantLocation);
    const deliveryCharge = calculateDeliveryCharge(distance);
    const estimatedTime = calculateEstimatedDeliveryTime(distance);
    
    // Format distance display
    let distanceDisplay;
    if (distance < 1000) {
        distanceDisplay = `${Math.round(distance)} meters`;
    } else {
        distanceDisplay = `${(distance / 1000).toFixed(1)} kilometers`;
    }
    
    // Update all elements
    document.getElementById('deliveryDistanceDetailed').textContent = distanceDisplay;
    document.getElementById('deliveryFeeDetailed').textContent = `K${deliveryCharge}`;
    document.getElementById('estimatedTimeDetailed').textContent = `${estimatedTime} minutes`;
    
    // Update restaurant location details
    document.getElementById('restaurantLocationFullDetails').innerHTML = `
        <strong>WIZA FOOD CAFE</strong><br>
        Plot 123, Great East Road<br>
        Lusaka, Zambia<br>
        <em>Coordinates: ${restaurantLocation[0].toFixed(6)}, ${restaurantLocation[1].toFixed(6)}</em>
    `;
    
    // Update user location details
    if (userLocation && userLocation !== restaurantLocation) {
        reverseGeocode(userLocation[0], userLocation[1])
            .then(address => {
                const userDetails = formatFullLocationDetails(address, userLocation);
                document.getElementById('userLocationFullDetails').innerHTML = userDetails;
            })
            .catch(error => {
                document.getElementById('userLocationFullDetails').innerHTML = `
                    <strong>Current Location</strong><br>
                    <em>Coordinates: ${userLocation[0].toFixed(6)}, ${userLocation[1].toFixed(6)}</em><br>
                    <span style="color: #666;">Address details unavailable</span>
                `;
            });
    } else {
        document.getElementById('userLocationFullDetails').innerHTML = `
            <strong>Current Location</strong><br>
            <em>Using restaurant location as fallback</em>
        `;
    }
}
// Enhanced function to format full location details
function formatFullLocationDetails(address, coordinates) {
    if (!address) {
        return `
            <strong>Current Location</strong><br>
            <em>Coordinates: ${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}</em>
        `;
    }
    
    const parts = [];
    
    // House/Building number
    if (address.house_number) {
        parts.push(`<strong>House/Building:</strong> ${address.house_number}`);
    }
    
    // Road/Street
    if (address.road) {
        parts.push(`<strong>Road:</strong> ${address.road}`);
    }
    
    // Area/Suburb
    if (address.suburb) {
        parts.push(`<strong>Area:</strong> ${address.suburb}`);
    }
    
    // City
    if (address.city) {
        parts.push(`<strong>City:</strong> ${address.city}`);
    }
    
    // Province/State
    if (address.state) {
        parts.push(`<strong>Province:</strong> ${address.state}`);
    }
    
    // Country
    if (address.country) {
        parts.push(`<strong>Country:</strong> ${address.country}`);
    }
    
    // Coordinates
    parts.push(`<em>Coordinates: ${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}</em>`);
    
    return parts.join('<br>');
}

// Enhanced estimated time calculation (1 minute per 100 meters + 5 minutes cooking)
function calculateEstimatedDeliveryTime(distance) {
    const travelTimeMinutes = Math.round(distance / 100); // 1 minute per 100 meters
    const cookingTime = 5; // 5 minutes cooking time
    const totalTime = travelTimeMinutes + cookingTime;
    
    return totalTime;
}
// NEW FUNCTION: Calculate estimated delivery time (1 minute per 100 meters + 5 minutes cooking time)
function calculateEstimatedDeliveryTime(distance) {
    const travelTimeMinutes = Math.round(distance / 100); // 1 minute per 100 meters
    const cookingTime = 5; // 5 minutes cooking time
    const totalTime = travelTimeMinutes + cookingTime;
    
    // Add buffer and return range
    const minTime = totalTime;
    const maxTime = totalTime + 5;
    
    return `${minTime}-${maxTime}`;
}

// NEW FUNCTION: Format location details for display
function formatLocationDetailsForDisplay(address) {
    if (!address) return 'Current Location';
    
    const parts = [];
    
    // Add house number if available
    if (address.house_number) {
        parts.push(`<strong>House No:</strong> ${address.house_number}`);
    }
    
    // Add road/street
    if (address.road) {
        parts.push(`<strong>Road:</strong> ${address.road}`);
    }
    
    // Add area/suburb
    if (address.suburb) {
        parts.push(`<strong>Area:</strong> ${address.suburb}`);
    }
    
    // Add city
    if (address.city) {
        parts.push(`<strong>City:</strong> ${address.city}`);
    }
    
    // Add province/state
    if (address.state) {
        parts.push(`<strong>Province:</strong> ${address.state}`);
    }
    
    // Add country
    if (address.country) {
        parts.push(`<strong>Country:</strong> ${address.country}`);
    }
    
    return parts.join('<br>');
}

// NEW FUNCTION: Add route to delivery map
function addRouteToDeliveryMap(start, end) {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const routeCoordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                
                // Create the route line
                const routeLine = L.polyline(routeCoordinates, {
                    color: '#4CAF50',
                    weight: 6,
                    opacity: 0.7,
                    dashArray: '10, 5'
                }).addTo(window.deliveryMapInstance);
                
                // Update distance with accurate route distance
                const accurateDistanceKm = (route.distance / 1000).toFixed(1);
                const accurateTimeMinutes = Math.round(route.duration / 60);
                
                document.getElementById('deliveryDistance').textContent = `${accurateDistanceKm} kilometers`;
                document.getElementById('estimatedTime').textContent = 
                    `${accurateTimeMinutes + 5}-${accurateTimeMinutes + 10} minutes`;
                
                // Add route popup
                routeLine.bindPopup(`
                    <div class="route-popup">
                        <strong>Delivery Route</strong><br>
                        <hr style="margin: 5px 0;">
                        <strong>Distance:</strong> ${accurateDistanceKm} km<br>
                        <strong>Travel Time:</strong> ${accurateTimeMinutes} min<br>
                        <strong>Total Est. Time:</strong> ${accurateTimeMinutes + 5}-${accurateTimeMinutes + 10} min
                    </div>
                `);
                
            }
        })
        .catch(error => {
            console.error('Error fetching route:', error);
            // Fallback: show straight line
            L.polyline([start, end], {
                color: '#4CAF50',
                weight: 6,
                opacity: 0.7,
                dashArray: '15, 10'
            }).addTo(window.deliveryMapInstance)
            .bindPopup('Direct route (approximate distance)');
        });
}

// NEW FUNCTION: Open delivery directions
function openDeliveryDirections() {
    if (!userLocation) {
        showNotification('Please enable location access to get directions', CONSTANTS.NOTIFICATION.WARNING, 'warning');
        return;
    }
    
    const destination = `${userLocation[0]},${userLocation[1]}`;
    const origin = `${restaurantLocation[0]},${restaurantLocation[1]}`;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    
    window.open(url, '_blank', 'noopener,noreferrer');
}

// Add CSS for the delivery map modal
function addDeliveryMapModalStyles() {
    const styles = `
        .delivery-details-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        
        .delivery-info-card {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 12px;
            padding: 15px;
            display: flex;
            align-items: flex-start;
            gap: 12px;
            transition: all 0.3s ease;
        }
        
        .delivery-info-card:hover {
            background: #e9ecef;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .delivery-info-card .info-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(135deg, #4CAF50, #45a049);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1.1rem;
            flex-shrink: 0;
        }
        
        .delivery-info-card .info-content {
            flex: 1;
        }
        
        .delivery-info-card h4 {
            margin: 0 0 5px 0;
            color: #333;
            font-size: 0.95rem;
            font-weight: 600;
        }
        
        .delivery-info-card p {
            margin: 0;
            color: #666;
            font-size: 0.85rem;
            line-height: 1.4;
        }
        
        .route-popup {
            text-align: center;
            padding: 8px;
        }
        
        .route-popup strong {
            color: #4CAF50;
        }
        
        @media (max-width: 768px) {
            .delivery-details-grid {
                grid-template-columns: 1fr;
            }
            
            .delivery-info-card {
                padding: 12px;
            }
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// Update the openLocationModal function
function openLocationModal() {
    showModal(elements.ui.locationModal);
    
    // Initialize location detection with a slight delay to ensure modal is visible
    setTimeout(() => {
        initializeLocationDetection();
    }, 100);
}

// New function to initialize location detection
function initializeLocationDetection() {
    const locationStatus = document.getElementById('locationStatus');
    const locationDetails = document.getElementById('locationDetails');
    const locationError = document.getElementById('locationError');
    const locationMapContainer = document.getElementById('locationMapContainer');
    const savedLocations = document.getElementById('savedLocations');

    // Show loading state
    locationStatus.hidden = false;
    locationDetails.hidden = true;
    locationError.hidden = true;
    locationMapContainer.hidden = true;
    savedLocations.hidden = true;

    // Check if we already have location
    if (userLocation) {
        updateLocationDisplay();
        // ADD THIS: Update delivery options
        updateDeliveryOptions();
    } else {
        // Request location permission
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    userLocation = [position.coords.latitude, position.coords.longitude];
                    console.log("User location obtained:", userLocation);
                    updateLocationDisplay();
                    // ADD THIS: Update delivery options
                    updateDeliveryOptions();
                },
                function(error) {
                    console.error("Error getting location:", error);
                    showLocationError();
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                }
            );
        } else {
            showLocationError();
        }
    }
}

// New function to update location display
function updateLocationDisplay() {
    const locationStatus = document.getElementById('locationStatus');
    const locationDetails = document.getElementById('locationDetails');
    const locationError = document.getElementById('locationError');
    const locationMapContainer = document.getElementById('locationMapContainer');
    const savedLocations = document.getElementById('savedLocations');
    const currentAddress = document.getElementById('currentAddress');
    const locationCoordinates = document.getElementById('locationCoordinates');
    const locationDistance = document.getElementById('locationDistance');

    // Hide loading and error, show details
    locationStatus.hidden = true;
    locationError.hidden = true;
    locationDetails.hidden = false;
    locationMapContainer.hidden = false;

    // Update location information
    if (userLocation) {
        locationCoordinates.textContent = `${userLocation[0].toFixed(6)}, ${userLocation[1].toFixed(6)}`;
        
        const distance = calculateDistance(userLocation, restaurantLocation);
        locationDistance.textContent = `${(distance / 1000).toFixed(1)} km from restaurant`;
        
        const deliveryCharge = calculateDeliveryCharge(distance);
        locationDistance.textContent += ` • Delivery: K${deliveryCharge}`;

        // Try to get address name
        reverseGeocode(userLocation[0], userLocation[1])
            .then(address => {
                const addressText = address.road || address.suburb || address.city || 'Current Location';
                currentAddress.textContent = addressText;
            })
            .catch(error => {
                currentAddress.textContent = 'Current Location (Auto-detected)';
            });

        // Initialize map with a slight delay to ensure container is visible
        setTimeout(() => {
            if (document.getElementById('locationMap')) {
                initializeLocationMap();
            }
        }, 200);
    }

    // Show saved locations if any
    if (state.savedLocations.length > 0) {
        savedLocations.hidden = false;
        loadSavedLocations();
    }
}

// NEW FUNCTION: Format location details for cart display
function formatLocationDetailsForCart(address) {
    // Determine the best infrastructure name
    let infrastructure = 'Local area';
    if (address.amenity) {
        infrastructure = address.amenity;
    } else if (address.building) {
        infrastructure = address.building;
    } else if (address.shop) {
        infrastructure = address.shop;
    } else if (address.public_transport) {
        infrastructure = address.public_transport;
    } else if (address.railway) {
        infrastructure = address.railway;
    }
    
    // Determine the best road/street name
    let roadName = 'Unknown Road';
    if (address.road) {
        roadName = address.road;
    } else if (address.street) {
        roadName = address.street;
    }
    
    // Determine the best city name
    let cityName = 'Unknown City';
    if (address.city) {
        cityName = address.city;
    } else if (address.town) {
        cityName = address.town;
    } else if (address.village) {
        cityName = address.village;
    } else if (address.suburb) {
        cityName = address.suburb;
    }
    
    return {
        country: address.country || 'Zambia',
        city: cityName,
        road: roadName,
        infrastructure: infrastructure,
        postcode: address.postcode || '',
        state: address.state || '',
        suburb: address.suburb || '',
        houseNumber: address.house_number || address.house_name || '',
        fullAddress: formatFullAddress(address)
    };
}

// NEW FUNCTION: Update current location display (missing from your code)
function updateCurrentLocationDisplay() {
    const locationToggle = document.getElementById('locationToggle');
    if (locationToggle && userLocation) {
        // Get address details for the display
        reverseGeocode(userLocation[0], userLocation[1])
            .then(address => {
                const locationName = address.road || address.suburb || address.city || 'Current Location';
                locationToggle.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${locationName}`;
                locationToggle.title = `${locationName} - ${address.city || ''} ${address.country || ''}`.trim();
            })
            .catch(error => {
                locationToggle.innerHTML = '<i class="fas fa-map-marker-alt"></i> Current Location';
                locationToggle.title = `Your location: ${userLocation[0].toFixed(4)}, ${userLocation[1].toFixed(4)}`;
            });
    }
}

// NEW FUNCTION: Initialize location map (missing from your code)
function initializeLocationMap() {
    const mapContainer = document.getElementById('locationMap');
    if (!mapContainer) return;
    
    // Clear any existing map
    if (locationMap) {
        locationMap.remove();
    }
    
    // Initialize the map
    locationMap = L.map('locationMap').setView(userLocation, 15);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(locationMap);
    
    // Add user marker
    currentLocationMarker = L.marker(userLocation)
        .addTo(locationMap)
        .bindPopup(`
            <div class="map-popup">
                <strong>📍 Your Current Location</strong><br>
                <hr style="margin: 5px 0;">
                <strong>Coordinates:</strong> ${userLocation[0].toFixed(6)}, ${userLocation[1].toFixed(6)}<br>
                <em>Loading address details...</em>
            </div>
        `)
        .openPopup();
    
    // Add restaurant marker
    restaurantLocationMarker = L.marker(restaurantLocation)
        .addTo(locationMap)
        .bindPopup(`
            <div class="map-popup">
                <strong>🍽️ WIZA FOOD CAFE</strong><br>
                <hr style="margin: 5px 0;">
                <strong>Address:</strong> Plot 123, Great East Road
            </div>
        `);
    
    // Get detailed address for user location and update popup
    reverseGeocode(userLocation[0], userLocation[1])
        .then(address => {
            const addressHtml = formatAddressDetails(address);
            currentLocationMarker.bindPopup(`
                <div class="map-popup">
                    <strong>📍 Your Current Location</strong><br>
                    <hr style="margin: 5px 0;">
                    <strong>Coordinates:</strong> ${userLocation[0].toFixed(6)}, ${userLocation[1].toFixed(6)}<br>
                    ${addressHtml}
                </div>
            `);
        })
        .catch(error => {
            console.error('Error getting address for map:', error);
        });
    
    // Add route between locations
    addRouteToLocationMap(userLocation, restaurantLocation);
    
    // Fit map to show both locations
    const group = new L.featureGroup([currentLocationMarker, restaurantLocationMarker]);
    locationMap.fitBounds(group.getBounds().pad(0.1));
}

// NEW FUNCTION: Update delivery method (missing from your code)
function updateDeliveryMethod() {
    // This function should handle updating the delivery method display
    const deliveryOption = document.getElementById('deliveryOption');
    const pickupOption = document.getElementById('pickupOption');
    
    if (state.isDelivery) {
        if (deliveryOption) deliveryOption.classList.add('selected');
        if (pickupOption) pickupOption.classList.remove('selected');
    } else {
        if (pickupOption) pickupOption.classList.add('selected');
        if (deliveryOption) deliveryOption.classList.remove('selected');
    }
    
    updateCartUI();
}

// Add this CSS for the location full address display
function addLocationFullAddressStyles() {
    const styles = `
        .location-full-address {
            grid-column: 1 / -1;
            background: white;
            padding: 12px;
            border-radius: 8px;
            border-left: 4px solid #2196F3;
            margin-top: 8px;
        }
        
        .location-full-address .detail-label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
            color: #2196F3;
        }
        
        .location-full-address .detail-value {
            text-align: left;
            line-height: 1.4;
            color: #333;
            word-break: break-word;
        }
        
        /* Enhanced location details styling */
        .location-detail-item .detail-value {
            font-weight: 600;
            color: #2c3e50;
        }
        
        .location-detail-item .detail-label {
            color: #7f8c8d;
        }
        
        .location-distance-info {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// Add Drink Modal Styles
function addDrinkModalStyles() {
    const styles = `
        /* Add Drink Modal Styles */
        .drinks-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 12px;
            max-height: 60vh;
            overflow-y: auto;
        }

        .drink-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            border: 1px solid var(--gray);
            border-radius: var(--radius-sm);
            transition: var(--transition);
        }

        .drink-item:hover {
            border-color: var(--primary);
            background: rgba(255, 123, 0, 0.05);
        }

        .drink-image {
            width: 60px;
            height: 60px;
            border-radius: 8px;
            background-size: cover;
            background-position: center;
            flex-shrink: 0;
        }

        .drink-info {
            flex: 1;
        }

        .drink-info h3 {
            font-size: 0.9rem;
            margin-bottom: 4px;
            color: var(--text);
        }

        .drink-info p {
            font-size: 0.75rem;
            color: var(--text-light);
            margin-bottom: 4px;
        }

        .drink-price {
            font-weight: bold;
            color: var(--primary);
            font-size: 0.9rem;
        }

        .add-drink-btn {
            padding: 8px 16px;
            background: var(--primary);
            color: white;
            border: none;
            border-radius: var(--radius-sm);
            cursor: pointer;
            transition: var(--transition);
            font-size: 0.8rem;
            white-space: nowrap;
        }

        .add-drink-btn:hover {
            background: var(--primary-dark);
            transform: translateY(-1px);
        }

        /* Add Drink Section in Cart */
        .add-drink-section {
            margin: 15px 0;
            text-align: center;
        }

        .add-drink-section .add-drink-btn {
            width: 100%;
            padding: 12px;
            background: var(--secondary);
            color: var(--text);
            border: 2px dashed var(--gray);
            font-size: 0.9rem;
        }

        .add-drink-section .add-drink-btn:hover {
            background: var(--primary);
            color: white;
            border-color: var(--primary);
        }

        /* Responsive Design */
        @media (min-width: 480px) {
            .drinks-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }

        @media (max-width: 360px) {
            .drink-item {
                flex-direction: column;
                text-align: center;
                gap: 8px;
            }
            
            .drink-image {
                width: 80px;
                height: 80px;
            }
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// New function to show location error
function showLocationError() {
    const locationStatus = document.getElementById('locationStatus');
    const locationDetails = document.getElementById('locationDetails');
    const locationError = document.getElementById('locationError');
    const locationMapContainer = document.getElementById('locationMapContainer');
    const savedLocations = document.getElementById('savedLocations');

    locationStatus.hidden = true;
    locationDetails.hidden = true;
    locationError.hidden = false;
    locationMapContainer.hidden = true;
    savedLocations.hidden = true;
}

function refreshUserLocation() {
    const locationStatus = document.getElementById('locationStatus');
    const locationDetails = document.getElementById('locationDetails');
    const locationError = document.getElementById('locationError');

    locationStatus.hidden = false;
    locationDetails.hidden = true;
    locationError.hidden = true;

    requestLocationPermission(true) // Force refresh
        .then(location => {
            updateLocationDisplay();
            showNotification('Location refreshed!', 'success');
        })
        .catch(error => {
            showLocationError();
        });
}

function addRouteToLocationMap(start, end) {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const routeCoordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                
                L.polyline(routeCoordinates, {
                    color: '#4CAF50',
                    weight: 4,
                    opacity: 0.7,
                    dashArray: '5, 5'
                }).addTo(locationMap).bindPopup(`Distance: ${(route.distance / 1000).toFixed(1)} km`);
            }
        })
        .catch(error => {
            console.log('Route service unavailable, showing straight line');
            L.polyline([start, end], {
                color: '#4CAF50',
                weight: 4,
                opacity: 0.7,
                dashArray: '10, 10'
            }).addTo(locationMap).bindPopup('Direct route (approximate)');
        });
}

// Update the useCurrentLocation function
function useCurrentLocation() {
    if (!userLocation) {
        showNotification('Please wait for location detection to complete', 'error');
        return;
    }

    state.deliveryLocation = {
        address: `Current Location (Auto-detected)`,
        notes: `Coordinates: ${userLocation[0].toFixed(6)}, ${userLocation[1].toFixed(6)}`,
        timestamp: new Date().toISOString(),
        coordinates: userLocation,
        type: 'current'
    };

    localStorage.setItem(CONSTANTS.STORAGE_KEYS.DELIVERY_LOCATION, JSON.stringify(state.deliveryLocation));
    
    // Add to saved locations if not already there
    const existingIndex = state.savedLocations.findIndex(loc => loc.type === 'current');
    
    if (existingIndex === -1) {
        state.savedLocations.unshift(state.deliveryLocation);
        localStorage.setItem(CONSTANTS.STORAGE_KEYS.SAVED_LOCATIONS, JSON.stringify(state.savedLocations));
    }

    updateDeliveryOptions();
    showNotification('Current location set as delivery address! 📍', 'success');
    hideModal(elements.ui.locationModal);
}

async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
        const data = await response.json();
        
        if (data && data.address) {
            const address = extractAddressDetails(data.address);
            // Cache the address
            cacheAddress(lat, lng, address);
            return address;
        }
        throw new Error('No address found');
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        // Fallback to local storage or default
        return getCachedAddress(lat, lng) || createFallbackAddress(lat, lng);
    }
}

// NEW FUNCTION: Extract detailed address information
function extractAddressDetails(addressData) {
    return {
        // Road/Street information
        road: addressData.road || addressData.street || addressData.footway || null,
        street: addressData.street || addressData.road || null,
        
        // City/Town information
        city: addressData.city || addressData.town || addressData.village || addressData.municipality || null,
        suburb: addressData.suburb || addressData.neighbourhood || addressData.city_district || null,
        
        // Administrative areas
        state: addressData.state || addressData.region || null,
        country: addressData.country || null,
        postcode: addressData.postcode || null,
        
        // Infrastructure and landmarks
        amenity: addressData.amenity || null, // e.g., school, hospital, restaurant
        building: addressData.building || null,
        shop: addressData.shop || null,
        office: addressData.office || null,
        public_transport: addressData.public_transport || null,
        railway: addressData.railway || null,
        
        // Additional details
        house_number: addressData.house_number || null,
        house_name: addressData.house_name || null,
        place: addressData.place || null
    };
}

// NEW FUNCTION: Create fallback address when geocoding fails
function createFallbackAddress(lat, lng) {
    return {
        road: 'Unknown Road',
        street: 'Unknown Street', 
        city: 'Unknown City',
        suburb: 'Unknown Area',
        state: 'Unknown State',
        country: 'Zambia',
        postcode: null,
        amenity: 'Unknown area',
        building: null,
        shop: null,
        office: null,
        coordinates: `Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`
    };
}

function getCachedAddress(lat, lng) {
    const cached = JSON.parse(localStorage.getItem('cachedAddresses') || '{}');
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    return cached[key];
}

function cacheAddress(lat, lng, address) {
    const cached = JSON.parse(localStorage.getItem('cachedAddresses') || '{}');
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    cached[key] = address;
    localStorage.setItem('cachedAddresses', JSON.stringify(cached));
}

function loadSavedLocations() {
    const savedLocationsList = document.getElementById('savedLocationsList');
    if (!savedLocationsList) return;

    if (state.savedLocations.length === 0) {
        savedLocationsList.innerHTML = '<p class="no-locations">No saved locations yet</p>';
        return;
    }

    savedLocationsList.innerHTML = state.savedLocations.map((location, index) => `
        <div class="saved-location ${state.deliveryLocation?.address === location.address ? 'selected' : ''}" data-index="${index}">
            <div class="location-info">
                <p class="location-address">
                    <i class="fas fa-${location.type === 'current' ? 'map-marker-alt' : 'map-pin'}"></i>
                    ${escapeHtml(location.address)}
                </p>
                ${location.notes ? `<p class="location-notes">${escapeHtml(location.notes)}</p>` : ''}
                <p class="location-saved">Saved ${formatDate(location.timestamp)}</p>
            </div>
            <div class="location-actions">
                <button class="use-location-btn" data-index="${index}">Use</button>
                <button class="remove-location" data-index="${index}" aria-label="Remove location">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `).join('');

    // Add event listeners for the newly created buttons
    savedLocationsList.querySelectorAll('.use-location-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            selectSavedLocation(index);
        });
    });

    savedLocationsList.querySelectorAll('.remove-location').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            removeSavedLocation(index);
        });
    });
}

function loadStateFromStorage() {
    const savedCart = localStorage.getItem(CONSTANTS.STORAGE_KEYS.CART);
    if (savedCart) {
        try {
            state.cart = JSON.parse(savedCart);
        } catch (error) {
            console.error('Error loading cart from storage:', error);
            state.cart = [];
            localStorage.removeItem(CONSTANTS.STORAGE_KEYS.CART);
        }
    }
    
    const savedWishlist = localStorage.getItem(CONSTANTS.STORAGE_KEYS.WISHLIST);
    if (savedWishlist) {
        try {
            state.wishlist = JSON.parse(savedWishlist);
        } catch (error) {
            console.error('Error loading wishlist from storage:', error);
            state.wishlist = [];
            localStorage.removeItem(CONSTANTS.STORAGE_KEYS.WISHLIST);
        }
    }
    
    const savedLocations = localStorage.getItem(CONSTANTS.STORAGE_KEYS.SAVED_LOCATIONS);
    if (savedLocations) {
        try {
            state.savedLocations = JSON.parse(savedLocations);
            updateSavedLocationsUI();
        } catch (error) {
            console.error('Error loading saved locations:', error);
            state.savedLocations = [];
        }
    }
    
    const recentlyViewed = localStorage.getItem(CONSTANTS.STORAGE_KEYS.RECENTLY_VIEWED);
    if (recentlyViewed) {
        try {
            state.recentlyViewed = JSON.parse(recentlyViewed);
        } catch (error) {
            console.error('Error loading recently viewed:', error);
            state.recentlyViewed = [];
        }
    }
}

// Helper function to format full address
function formatFullAddress(address) {
    if (!address) return '';
    
    const parts = [];
    if (address.house_number) parts.push(address.house_number);
    if (address.road) parts.push(address.road);
    if (address.suburb) parts.push(address.suburb);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.postcode) parts.push(address.postcode);
    if (address.country) parts.push(address.country);
    
    return parts.join(', ');
}

// Helper function to remove location details from cart
function removeLocationDetailsFromCart() {
    const locationSection = document.getElementById('cartLocationDetails');
    if (locationSection) {
        locationSection.remove();
    }
}

// Helper function to fetch and display location details
function fetchAndDisplayLocationDetails() {
    if (!userLocation) return;
    
    reverseGeocode(userLocation[0], userLocation[1])
        .then(address => {
            const locationDetails = formatLocationDetailsForCart(address);
            displayLocationDetailsInCart(locationDetails);
        })
        .catch(error => {
            console.error('Error fetching location details:', error);
            const fallbackDetails = {
                country: 'Zambia',
                city: 'Unknown',
                road: 'Unknown',
                infrastructure: 'Unknown area'
            };
            displayLocationDetailsInCart(fallbackDetails);
        });
}

// Helper function to display location details in cart
function displayLocationDetailsInCart(locationDetails) {
    let locationSection = document.getElementById('cartLocationDetails');
    
    if (!locationSection) {
        locationSection = document.createElement('div');
        locationSection.id = 'cartLocationDetails';
        locationSection.className = 'cart-location-details';
        
        const cartItems = document.getElementById('cartItems');
        const cartSummary = document.querySelector('.cart-summary');
        
        if (cartItems && cartSummary) {
            cartItems.parentNode.insertBefore(locationSection, cartSummary);
        }
    }
    
    locationSection.innerHTML = `
        <div class="location-details-header">
            <i class="fas fa-map-marker-alt"></i>
            <h4> Delivery Location Details</h4>
        </div>
        <div class="location-details-content">
            <div class="location-detail-item">
                <span class="detail-label"> City:</span>
                <span class="detail-value">${escapeHtml(locationDetails.city)}</span>
            </div>
            <div class="location-detail-item">
                <span class="detail-label"> Road/Street:</span>
                <span class="detail-value">${escapeHtml(locationDetails.road)}</span>
            </div>
            ${locationDetails.suburb ? `
            <div class="location-detail-item">
                <span class="detail-label"> Suburb/Area:</span>
                <span class="detail-value">${escapeHtml(locationDetails.suburb)}</span>
            </div>
            ` : ''}
            <div class="location-detail-item">
                <span class="detail-label"> Nearest Infrastructure:</span>
                <span class="detail-value">${escapeHtml(locationDetails.infrastructure)}</span>
            </div>
            ${locationDetails.houseNumber ? `
            <div class="location-detail-item">
                <span class="detail-label"> House/Building:</span>
                <span class="detail-value">${escapeHtml(locationDetails.houseNumber)}</span>
            </div>
            ` : ''}
            <div class="location-detail-item">
                <span class="detail-label"> Country:</span>
                <span class="detail-value">${escapeHtml(locationDetails.country)}</span>
            </div>
            ${locationDetails.postcode ? `
            <div class="location-detail-item">
                <span class="detail-label"> Postcode:</span>
                <span class="detail-value">${escapeHtml(locationDetails.postcode)}</span>
            </div>
            ` : ''}
            <div class="location-distance-info">
                <span class="distance-label"> Distance from WIZA FOOD CAFE:</span>
                <span class="distance-value">${(calculateDistance(userLocation, restaurantLocation) / 1000).toFixed(1)} km</span>
            </div>
            ${locationDetails.fullAddress ? `
            <div class="location-full-address">
                <span class="detail-label"> Complete Address:</span>
                <span class="detail-value">${escapeHtml(locationDetails.fullAddress)}</span>
            </div>
            ` : ''}
        </div>
    `;
}

// Add CSS for the Airtel Money payment interface
function addAirtelMoneyStyles() {
    const styles = `
        .airtel-payment-flow {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 20px;
            margin: 15px 0;
        }
        
        .payment-status {
            display: flex;
            flex-direction: column;
            gap: 15px;
            margin: 20px 0;
        }
        
        .status-step {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 12px;
            border-radius: 8px;
            background: white;
            border-left: 4px solid #e9ecef;
            transition: all 0.3s ease;
        }
        
        .status-step.active {
            border-left-color: #4CAF50;
            background: #f1f8e9;
        }
        
        .status-step.completed {
            border-left-color: #2196F3;
            background: #e3f2fd;
        }
        
        .step-number {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: #e9ecef;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
        }
        
        .status-step.active .step-number {
            background: #4CAF50;
            color: white;
        }
        
        .status-step.completed .step-number {
            background: #2196F3;
            color: white;
        }
        
        .step-info strong {
            display: block;
            margin-bottom: 4px;
            color: #333;
        }
        
        .step-info p {
            margin: 0;
            color: #666;
            font-size: 0.9em;
        }
        
        .ussd-code-display {
            margin: 20px 0;
        }
        
        .ussd-code-display label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #333;
        }
        
        .ussd-code {
            display: flex;
            align-items: center;
            gap: 10px;
            background: #333;
            color: white;
            padding: 12px 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 1.1em;
        }
        
        .ussd-code code {
            flex: 1;
        }
        
        .copy-btn {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 8px;
            border-radius: 4px;
            cursor: pointer;
            transition: background 0.3s;
        }
        
        .copy-btn:hover {
            background: rgba(255,255,255,0.3);
        }
        
        .payment-details-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 10px;
            margin: 20px 0;
        }
        
        .payment-detail {
            display: flex;
            justify-content: space-between;
            padding: 10px;
            background: white;
            border-radius: 6px;
            border: 1px solid #e9ecef;
        }
        
        .detail-label {
            font-weight: 600;
            color: #555;
        }
        
        .detail-value {
            color: #333;
            font-weight: 600;
        }
        
        .payment-help {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            padding: 12px;
            margin-top: 15px;
        }
        
        .payment-help p {
            margin: 0;
            color: #856404;
            font-size: 0.9em;
        }
        
        .manual-dial-instructions {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin: 15px 0;
            border: 2px solid #e9ecef;
        }
        
        .manual-dial-instructions ol {
            margin: 15px 0;
            padding-left: 20px;
        }
        
        .manual-dial-instructions li {
            margin-bottom: 8px;
            color: #555;
        }
        
        @media (max-width: 480px) {
            .ussd-code {
                font-size: 0.9em;
                padding: 10px;
            }
            
            .status-step {
                padding: 10px;
            }
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

function useCurrentLocation() {
    if (!userLocation) {
        showNotification('Please wait for location detection to complete', 'error');
        return;
    }

    state.deliveryLocation = {
        address: `Current Location (Auto-detected)`,
        notes: `Coordinates: ${userLocation[0].toFixed(6)}, ${userLocation[1].toFixed(6)}`,
        timestamp: new Date().toISOString(),
        coordinates: userLocation,
        type: 'current'
    };

    localStorage.setItem(CONSTANTS.STORAGE_KEYS.DELIVERY_LOCATION, JSON.stringify(state.deliveryLocation));
    
    // Add to saved locations if not already there
    const existingIndex = state.savedLocations.findIndex(loc => loc.type === 'current');
    
    if (existingIndex === -1) {
        state.savedLocations.unshift(state.deliveryLocation);
        localStorage.setItem(CONSTANTS.STORAGE_KEYS.SAVED_LOCATIONS, JSON.stringify(state.savedLocations));
    }

    // ADD THIS: Update delivery options
    updateDeliveryOptions();
    showNotification('Current location set as delivery address! 📍', 'success');
    hideModal(elements.ui.locationModal);
}
// Event Listeners Setup
function setupEventListeners() {
    // Add permission settings button if it exists
    const permissionSettingsBtn = document.getElementById('permissionSettings');
    if (permissionSettingsBtn) {
        permissionSettingsBtn.addEventListener('click', showPermissionStatus);
    }
    
    // Add manage permissions button if it exists
    const managePermissionsBtn = document.getElementById('managePermissions');
    if (managePermissionsBtn) {
        managePermissionsBtn.addEventListener('click', function() {
            createPermissionModal();
            showModal(document.getElementById('permissionModal'));
        });
    }
    // Cart functionality
    elements.cart.icon?.addEventListener('click', openCart);
    elements.cart.close?.addEventListener('click', closeCartModal);
    elements.cart.checkoutBtn?.addEventListener('click', openPaymentModal);
    
    // Payment functionality
    elements.payment.close?.addEventListener('click', closePaymentModal);
    elements.payment.uploadArea?.addEventListener('click', () => elements.payment.screenshotUpload?.click());
    elements.payment.screenshotUpload?.addEventListener('change', handleFileUpload);
    elements.payment.submitOrder?.addEventListener('click', completeOrder);

    // ADD THIS: Refresh location button
    document.getElementById('refreshLocation')?.addEventListener('click', function() {
        requestLocationPermission(true).then(() => {
            updateDeliveryOptions();
            showNotification('Delivery options updated!', 'success');
        }).catch(error => {
            showNotification('Failed to update location', 'error');
        });
    })
    // Drink modal functionality
    elements.drink.openBtn?.addEventListener('click', openDrinkModal);
    
    // Search functionality with debouncing
    elements.ui.searchInput?.addEventListener('input', debounce(handleSearch, 300));
    elements.ui.clearSearch?.addEventListener('click', clearSearch);
    elements.ui.searchToggle?.addEventListener('click', toggleSearch);
    
    // Category filtering
    elements.ui.categories.forEach(category => {
        category.addEventListener('click', () => filterByCategory(category));
    });
    
    // Navigation
    elements.ui.navItems.forEach(item => {
        item.addEventListener('click', () => navigateTo(item.dataset.page));
    });
    
    // Delivery options
    elements.delivery.pickup?.addEventListener('click', () => selectDeliveryOption(false));
    elements.delivery.delivery?.addEventListener('click', () => selectDeliveryOption(true));
    
    // Profile management
    elements.profile.createAccountBtn?.addEventListener('click', showAccountForm);
    elements.profile.form?.addEventListener('submit', saveProfile);
    
    // Wishlist
    elements.ui.wishlistIcon?.addEventListener('click', openWishlistModal);
    
    // Location
    elements.location.toggle?.addEventListener('click', showRestaurantMapModal);
    
    // Directions button event listener
    document.addEventListener('click', (e) => {
        if (e.target.id === 'directionsBtn' || e.target.closest('#directionsBtn')) {
            openGoogleMapsDirections();
        }
    });
    
    // Promo code
    elements.ui.applyPromo?.addEventListener('click', applyPromoCode);
    elements.ui.removePromo?.addEventListener('click', removePromoCode);
    elements.ui.promoCode?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') applyPromoCode();
    });
    
    // Quick order
    elements.ui.quickOrderFab?.addEventListener('click', openQuickOrderModal);
    
    // Chat
    elements.ui.chatWidget?.addEventListener('click', openChatModal);
    elements.ui.sendMessage?.addEventListener('click', sendChatMessage);
    elements.ui.chatInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });
    
    // Orders filter
    elements.orders.filterButtons?.forEach(btn => {
        btn.addEventListener('click', () => filterOrders(btn.dataset.status));
    });
    
    // Customization functionality
    elements.customize.addBtn?.addEventListener('click', addCustomizedToCart);
    
    // Event delegation for topping changes
    document.addEventListener('change', (e) => {
        if (e.target.name === 'topping') {
            updateCustomizeTotal();
        }
    });
    
    // Event delegation for drink items
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-drink-btn') && e.target.closest('.drink-item')) {
            const drinkItem = e.target.closest('.drink-item');
            addDrinkToCart(drinkItem);
        }
    });
    
    // Payment modal events
    document.getElementById('editCartBtn')?.addEventListener('click', () => {
        hideModal(elements.payment.modal);
        setTimeout(() => showModal(elements.cart.modal), 300);
    });

    document.getElementById('changeMethodBtn')?.addEventListener('click', () => {
        hideModal(elements.payment.modal);
        setTimeout(() => showModal(elements.cart.modal), 300);
    });

    document.getElementById('paymentUploadArea')?.addEventListener('click', () => {
        document.getElementById('paymentScreenshotUpload')?.click();
    });

    document.getElementById('paymentScreenshotUpload')?.addEventListener('change', handlePaymentFileUpload);

    document.getElementById('removePaymentImage')?.addEventListener('click', removePaymentFile);

        document.getElementById('submitPaymentOrder')?.addEventListener('click', completeOrder);

    // Close modals when clicking outside
    elements.ui.overlay?.addEventListener('click', closeAllModals);
    
    // Event delegation for dynamic elements
    document.addEventListener('click', (e) => {
        if (e.target.closest('.add-btn')) {
            const button = e.target.closest('.add-btn');
            if (!button.classList.contains('customize-trigger')) {
                addToCart(button);
            }
        }
        
        if (e.target.closest('.customize-trigger')) {
            const button = e.target.closest('.customize-trigger');
            openCustomizeModal(button);
        }
        
        if (e.target.closest('.wishlist-btn')) {
            const button = e.target.closest('.wishlist-btn');
            toggleWishlist(button);
        }
        
        if (e.target.classList.contains('close-modal')) {
            const modalId = e.target.dataset.modal;
            closeModal(modalId);
        }
        
        if (e.target.classList.contains('quantity-btn')) {
            const button = e.target.closest('.quantity-btn');
            const id = parseInt(button.dataset.id);
            const change = parseInt(button.dataset.change);
            updateQuantity(id, change);
        }
        
        if (e.target.classList.contains('remove-btn')) {
            const button = e.target.closest('.remove-btn');
            const id = parseInt(button.dataset.id);
            removeFromCart(id);
        }
        
        if (e.target.classList.contains('view-order-btn')) {
            const button = e.target.closest('.view-order-btn');
            const id = parseInt(button.dataset.id);
            viewOrderDetails(id);
        }
        
        if (e.target.classList.contains('quick-option')) {
            const option = e.target.closest('.quick-option');
            if (option.id === 'reorderLast') {
                reorderLast();
            } else {
                quickOrderByCategory(option.dataset.category);
            }
        }
        
        if (e.target.closest('.saved-location')) {
            const locationEl = e.target.closest('.saved-location');
            selectSavedLocation(parseInt(locationEl.dataset.index));
        }
        
        if (e.target.closest('.remove-location')) {
            const locationEl = e.target.closest('.remove-location');
            removeSavedLocation(parseInt(locationEl.dataset.index));
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAllModals();
        if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.closest('form')) {
            e.target.closest('form').dispatchEvent(new Event('submit'));
        }
    });
    
    // Airtel Money payment retry functionality
    document.addEventListener('click', (e) => {
        if (e.target.id === 'retryAirtelPayment') {
            const total = calculateTotal();
            const orderRef = state.orderCounter.toString().padStart(4, '0');
            initiateAirtelMoneyPayment(total.total, orderRef);
        }
    });
    
    // Prevent form submission on enter in search
    elements.ui.searchInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') e.preventDefault();
    });
    
    // Food card click for recently viewed
    document.addEventListener('click', (e) => {
        if (e.target.closest('.food-card')) {
            const card = e.target.closest('.food-card');
            const addButton = card.querySelector('.add-btn');
            if (addButton) {
                const id = parseInt(addButton.dataset.id);
                addToRecentlyViewed(id);
            }
        }
    });

    // Location toggle click handler
    const locationToggle = document.getElementById('locationToggle');
    if (locationToggle) {
        locationToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showRestaurantMapModal();
        });
    }
    
    // Directions button event listener
    document.addEventListener('click', function(e) {
        if (e.target.id === 'getDirectionsBtn' || e.target.closest('#getDirectionsBtn')) {
            openGoogleMapsDirections();
        }
    });

    // Airtel Money specific event listeners
    document.addEventListener('click', (e) => {
        if (e.target.id === 'retryAirtelPayment') {
            const total = calculateTotal();
            const orderRef = state.orderCounter.toString().padStart(4, '0');
            initiateAirtelMoneyPayment(total.total, orderRef);
        }
    });

    // Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('/wizafoodcafe/sw.js')
                .then(function(registration) {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(function(error) {
                    console.log('ServiceWorker registration failed: ', error);
                });
        });
    }
}


// New function to handle payment file upload
function handlePaymentFileUpload(e) {
    try {
        const file = e.target.files[0];
        if (!file) {
            showNotification('No file selected', CONSTANTS.NOTIFICATION.WARNING, 'warning');
            return;
        }

        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            showNotification('Please upload an image file (JPEG, PNG, GIF, WebP)', CONSTANTS.NOTIFICATION.ERROR, 'error');
            e.target.value = '';
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            showNotification('Image must be less than 5MB', CONSTANTS.NOTIFICATION.ERROR, 'error');
            e.target.value = '';
            return;
        }
        
        const preview = document.getElementById('paymentFilePreview');
        const fileName = document.getElementById('paymentFileName');
        const previewImage = document.getElementById('paymentPreviewImage');
        
        if (preview) preview.hidden = false;
        if (fileName) fileName.textContent = file.name;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            if (previewImage) previewImage.src = e.target.result;
        };
        reader.onerror = function() {
            showNotification('Error reading file', CONSTANTS.NOTIFICATION.ERROR, 'error');
            e.target.value = '';
        };
        reader.readAsDataURL(file);
        
        const submitBtn = document.getElementById('submitPaymentOrder') || elements.payment.submitOrder;
        if (submitBtn) submitBtn.disabled = false;
        
    } catch (error) {
        console.error('Error handling file upload:', error);
        showNotification('Error uploading file', CONSTANTS.NOTIFICATION.ERROR, 'error');
        e.target.value = '';
    }
}

function validateOrder() {
    const errors = [];
    
    // Check cart
    if (state.cart.length === 0) {
        errors.push('Cart is empty');
    }
    
    // Check profile
    if (!state.profile) {
        errors.push('No account found');
    }
    
    // Check delivery location for delivery orders
    if (state.isDelivery && !state.deliveryLocation) {
        errors.push('No delivery location selected');
    }
    
    // Check payment screenshot
    const screenshotUpload = document.getElementById('paymentScreenshotUpload') || elements.payment.screenshotUpload;
    if (!screenshotUpload || !screenshotUpload.files || !screenshotUpload.files[0]) {
        errors.push('No payment screenshot uploaded');
    }
    
    return errors;
}

// New function to remove payment file
function removePaymentFile() {
    const uploadInput = document.getElementById('paymentScreenshotUpload');
    const preview = document.getElementById('paymentFilePreview');
    
    if (uploadInput) uploadInput.value = '';
    if (preview) preview.hidden = true;
    
    document.getElementById('submitPaymentOrder').disabled = true;
}

// NEW FUNCTION: Show restaurant map modal
function showRestaurantMapModal() {
    // Create the map modal if it doesn't exist
    if (!document.getElementById('pickupMapModal')) {
        createMapModal();
    }
    
    const mapModal = document.getElementById('pickupMapModal');
    
    if (!userLocation) {
        // If no location, request permission first
        requestLocationPermission().then(() => {
            initializeRestaurantMap();
            showModal(mapModal);
        }).catch(error => {
            // If location fails, still show the map with restaurant location
            initializeRestaurantMap();
            showModal(mapModal);
        });
    } else {
        initializeRestaurantMap();
        showModal(mapModal);
    }
}

// NEW FUNCTION: Initialize restaurant map
function initializeRestaurantMap() {
    const mapContainer = document.getElementById('pickupMap');
    if (!mapContainer) return;
    
    // Clear any existing map
    if (window.restaurantMap) {
        window.restaurantMap.remove();
    }
    
    // Use restaurant location as center, or user location if available
    const center = userLocation || restaurantLocation;
    
    // Initialize the map
    window.restaurantMap = L.map('pickupMap').setView(center, 15);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(window.restaurantMap);
    
    // Add restaurant marker with detailed popup
    const restaurantMarker = L.marker(restaurantLocation)
        .addTo(window.restaurantMap)
        .bindPopup(`
            <div class="map-popup">
                <strong>🍽️ WIZA FOOD CAFE</strong><br>
                <hr style="margin: 5px 0;">
                <strong>Coordinates:</strong> ${restaurantLocation[0].toFixed(6)}, ${restaurantLocation[1].toFixed(6)}<br>
                <strong>Address:</strong> Plot 123, Great East Road<br>
                <strong>City:</strong> Lusaka<br>
                <strong>Country:</strong> Zambia<br>
                <strong>Road:</strong> Great East Road<br>
                <strong>Landmark:</strong> Near Lusaka Golf Club
            </div>
        `)
        .openPopup();
    
    // Add user marker if location is available
    if (userLocation) {
        // Get detailed address for user location
        reverseGeocode(userLocation[0], userLocation[1])
            .then(address => {
                const userAddress = formatAddressDetails(address);
                
                L.marker(userLocation)
                    .addTo(window.restaurantMap)
                    .bindPopup(`
                        <div class="map-popup">
                            <strong>📍 Your Location</strong><br>
                            <hr style="margin: 5px 0;">
                            <strong>Coordinates:</strong> ${userLocation[0].toFixed(6)}, ${userLocation[1].toFixed(6)}<br>
                            ${userAddress}
                        </div>
                    `);
                
                // Update location details in the modal
                updateLocationDetails(userLocation, address);
            })
            .catch(error => {
                console.error('Error getting user address:', error);
                // Fallback marker without detailed address
                L.marker(userLocation)
                    .addTo(window.restaurantMap)
                    .bindPopup(`
                        <div class="map-popup">
                            <strong>📍 Your Location</strong><br>
                            <hr style="margin: 5px 0;">
                            <strong>Coordinates:</strong> ${userLocation[0].toFixed(6)}, ${userLocation[1].toFixed(6)}<br>
                            <em>Address details unavailable</em>
                        </div>
                    `);
            });
        
        // Add route between locations
        addRouteToMap(window.restaurantMap, userLocation, restaurantLocation);
        
        // Fit map to show both locations
        const group = new L.featureGroup([
            L.marker(userLocation),
            L.marker(restaurantLocation)
        ]);
        window.restaurantMap.fitBounds(group.getBounds().pad(0.1));
    } else {
        // Just show restaurant location
        window.restaurantMap.setView(restaurantLocation, 15);
    }
}

// NEW FUNCTION: Format address details from reverse geocoding
function formatAddressDetails(address) {
    if (!address) return '<em>Address details unavailable</em>';
    
    const parts = [];
    
    if (address.road) parts.push(`<strong>Road:</strong> ${address.road}`);
    if (address.suburb) parts.push(`<strong>Area:</strong> ${address.suburb}`);
    if (address.city) parts.push(`<strong>City:</strong> ${address.city}`);
    if (address.country) parts.push(`<strong>Country:</strong> ${address.country}`);
    if (address.postcode) parts.push(`<strong>Postcode:</strong> ${address.postcode}`);
    
    // Add infrastructure details if available
    const infrastructure = [];
    if (address.amenity) infrastructure.push(address.amenity);
    if (address.building) infrastructure.push(address.building);
    if (address.shop) infrastructure.push(address.shop);
    
    if (infrastructure.length > 0) {
        parts.push(`<strong>Nearby:</strong> ${infrastructure.join(', ')}`);
    }
    
    return parts.join('<br>');
}

// NEW FUNCTION: Update location details in the modal
function updateLocationDetails(coordinates, address) {
    const locationDetails = document.querySelector('.location-details');
    if (!locationDetails) return;
    
    const distance = calculateDistance(coordinates, restaurantLocation);
    const deliveryCharge = calculateDeliveryCharge(distance);
    
    const addressHtml = formatAddressDetails(address);
    
    locationDetails.innerHTML = `
        <div class="detail-item">
            <strong>📍 Your Location:</strong><br>
            <span>${addressHtml}</span>
        </div>
        <div class="detail-item">
            <strong>📌 Restaurant Address:</strong><br>
            <span>WIZA FOOD CAFE, Plot 123, Great East Road, Lusaka, Zambia</span>
        </div>
        <div class="detail-item">
            <strong>📏 Distance:</strong> 
            <span id="mapDistance">${(distance / 1000).toFixed(1)} km</span>
        </div>
        <div class="detail-item">
            <strong>🚚 Delivery Fee:</strong> 
            <span>K${deliveryCharge}.00</span>
        </div>
        <div class="detail-item">
            <strong>⏱️ Estimated Time:</strong> 
            <span>${Math.round(distance / 500)}-${Math.round(distance / 400)} minutes</span>
        </div>
    `;
}

// NEW FUNCTION: Open Google Maps directions
function openGoogleMapsDirections() {
    const destination = `${restaurantLocation[0]},${restaurantLocation[1]}`;
    let url;
    
    if (userLocation) {
        const origin = `${userLocation[0]},${userLocation[1]}`;
        url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    } else {
        url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
    }
    
    window.open(url, '_blank', 'noopener,noreferrer');
}

// Update the addRouteToMap function to handle restaurant map
function addRouteToMap(map, start, end) {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const routeCoordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                
                L.polyline(routeCoordinates, {
                    color: '#4CAF50',
                    weight: 5,
                    opacity: 0.7
                }).addTo(map);
                
                const distanceKm = (route.distance / 1000).toFixed(1);
                // Update the distance display
                const distanceElement = document.getElementById('mapDistance');
                if (distanceElement) {
                    distanceElement.textContent = `${distanceKm} km away - ${Math.round(route.duration / 60)} min drive`;
                }
            }
        })
        .catch(error => {
            console.error('Error fetching route:', error);
            // Fallback: show straight line
            L.polyline([start, end], {
                color: '#4CAF50',
                weight: 5,
                opacity: 0.7,
                dashArray: '10, 10'
            }).addTo(map);
        });
}

function cleanupLocationMap() {
    if (locationMap) {
        locationMap.remove();
        locationMap = null;
    }
    if (window.restaurantMap) {
        window.restaurantMap.remove();
        window.restaurantMap = null;
    }
}

// Cart Functions
function addToCart(button) {
    try {
        const id = parseInt(button.dataset.id);
        const name = button.dataset.name;
        const price = parseFloat(button.dataset.price);
        const image = button.dataset.image || 'default-food.jpg';
        
        const existingItemIndex = state.cart.findIndex(item => 
            item.id === id && 
            (!item.toppings || item.toppings.length === 0) && 
            !item.instructions
        );
        
        if (existingItemIndex !== -1) {
            state.cart[existingItemIndex].quantity += 1;
        } else {
            state.cart.push({ id, name, price, quantity: 1, image });
        }
        
        updateCartUI();
        showNotification(`${name} added to cart! 🛒`, CONSTANTS.NOTIFICATION.SUCCESS, 'success');
        
        button.classList.add('adding');
        setTimeout(() => button.classList.remove('adding'), 300);
        
        const quantityControls = document.querySelector(`.quantity-controls[data-id="${id}"]`);
        if (quantityControls) {
            quantityControls.hidden = false;
            button.hidden = true;
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        showNotification('Error adding item to cart', CONSTANTS.NOTIFICATION.ERROR, 'error');
    }
}

// NEW FUNCTION: Add drink to cart
function addDrinkToCart(drinkItem) {
    const id = parseInt(drinkItem.dataset.id);
    const name = drinkItem.dataset.name;
    const price = parseFloat(drinkItem.dataset.price);
    const image = drinkItem.dataset.image;
    
    const existingItemIndex = state.cart.findIndex(item => 
        item.id === id && 
        (!item.toppings || item.toppings.length === 0) && 
        !item.instructions
    );
    
    if (existingItemIndex !== -1) {
        state.cart[existingItemIndex].quantity += 1;
    } else {
        state.cart.push({ 
            id, 
            name, 
            price, 
            quantity: 1, 
            image,
            type: 'drink' // Mark as drink for easy identification
        });
    }
    
    updateCartUI();
    showNotification(`${name} added to cart! 🥤`, CONSTANTS.NOTIFICATION.SUCCESS, 'success');
    hideModal(elements.drink.modal);
}

function removeFromCart(id) {
    state.cart = state.cart.filter(item => item.id !== id);
    updateCartUI();
    showNotification('Item removed from cart', CONSTANTS.NOTIFICATION.WARNING, 'warning');
}

function updateQuantity(id, change) {
    const item = state.cart.find(item => item.id === id);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(id);
        } else {
            updateCartUI();
        }
    }
}

function calculateTotal() {
    const subtotal = state.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const serviceFee = CONSTANTS.SERVICE_FEE;
    const discount = state.discount;
    
    // Use dynamic delivery fee if available
    const deliveryFee = window.deliveryInfo && state.isDelivery ? window.deliveryInfo.charge : state.deliveryFee;
    
    return {
        subtotal: subtotal,
        delivery: deliveryFee,
        serviceFee: serviceFee,
        discount: discount,
        total: Math.max(0, subtotal + deliveryFee + serviceFee - discount),
        deposit: Math.max(0, (subtotal + deliveryFee + serviceFee - discount) * CONSTANTS.DEPOSIT_PERCENTAGE)
    };
}

function updateCartUI() {
    try {
        localStorage.setItem(CONSTANTS.STORAGE_KEYS.CART, JSON.stringify(state.cart));
        
        const totalItems = state.cart.reduce((total, item) => total + item.quantity, 0);
        if (elements.cart.count && parseInt(elements.cart.count.textContent) !== totalItems) {
            elements.cart.count.classList.add('added');
            setTimeout(() => elements.cart.count.classList.remove('added'), 500);
        }
        if (elements.cart.count) elements.cart.count.textContent = totalItems;
        
        const wishlistCount = state.wishlist.length;
        const wishlistCountEl = document.querySelector('.wishlist-count');
        if (wishlistCountEl) wishlistCountEl.textContent = wishlistCount;
        
        const ordersCount = state.orders.length;
        const ordersCountEl = document.querySelector('.orders-count');
        if (ordersCountEl) ordersCountEl.textContent = ordersCount;
        
        if (state.cart.length === 0) {
            if (elements.cart.emptyMsg) elements.cart.emptyMsg.style.display = 'block';
            if (elements.cart.items) elements.cart.items.innerHTML = '';
            if (elements.cart.checkoutBtn) {
                elements.cart.checkoutBtn.disabled = true;
                elements.cart.checkoutBtn.classList.add('disabled');
            }
            // Remove both location details and map if cart is empty
            removeLocationDetailsFromCart();
            removeDeliveryMapFromCart();
        } else {
            if (elements.cart.emptyMsg) elements.cart.emptyMsg.style.display = 'none';
            if (elements.cart.checkoutBtn) {
                elements.cart.checkoutBtn.disabled = false;
                elements.cart.checkoutBtn.classList.remove('disabled');
            }
            
            if (elements.cart.items) {
                elements.cart.items.innerHTML = state.cart.map(item => {
                    const toppingsText = item.toppings && item.toppings.length > 0 
                        ? `<p class="cart-item-toppings">Extras: ${item.toppings.join(', ')}</p>` 
                        : '';
                    
                    const instructionsText = item.instructions 
                        ? `<p class="cart-item-instructions">Instructions: ${escapeHtml(item.instructions)}</p>` 
                        : '';
                    
                    return `
                        <div class="cart-item">
                            <div class="cart-item-image">
                                <img src="${item.image}" alt="${escapeHtml(item.name)}" onerror="this.src='default-food.jpg'">
                            </div>
                            <div class="cart-item-info">
                                <h3 class="cart-item-name">${escapeHtml(item.name)}</h3>
                                ${toppingsText}
                                ${instructionsText}
                                <p class="cart-item-price">K${item.price.toFixed(2)} × ${item.quantity} = K${(item.price * item.quantity).toFixed(2)}</p>
                            </div>
                            <div class="cart-item-quantity">
                                <button class="quantity-btn" data-id="${item.id}" data-change="-1">-</button>
                                <span class="quantity">${item.quantity}</span>
                                <button class="quantity-btn" data-id="${item.id}" data-change="1">+</button>
                                <button class="remove-btn" data-id="${item.id}">&times;</button>
                            </div>
                        </div>
                    `;
                }).join('');
            }
            
            // Handle delivery map display
            if (state.isDelivery && userLocation) {
                // Show map instead of detailed location information
                showDeliveryMapInCart();
            } else {
                // Remove map if not in delivery mode
                removeDeliveryMapFromCart();
            }
        }
        
        const total = calculateTotal();
        if (elements.cart.subtotal) elements.cart.subtotal.textContent = `K${total.subtotal.toFixed(2)}`;
        if (elements.cart.delivery) elements.cart.delivery.textContent = `K${total.delivery.toFixed(2)}`;
        if (elements.cart.service) elements.cart.service.textContent = `K${total.serviceFee.toFixed(2)}`;
        
        if (total.discount > 0) {
            if (elements.cart.discount) elements.cart.discount.textContent = `-K${total.discount.toFixed(2)}`;
            if (elements.cart.discountItem) elements.cart.discountItem.hidden = false;
        } else {
            if (elements.cart.discountItem) elements.cart.discountItem.hidden = true;
        }
        
        if (elements.cart.total) elements.cart.total.textContent = `K${total.total.toFixed(2)}`;
    } catch (error) {
        console.error('Error updating cart UI:', error);
    }
}

// NEW FUNCTION: Helper function to remove location details from cart
function removeLocationDetailsFromCart() {
    const locationSection = document.getElementById('cartLocationDetails');
    if (locationSection) {
        locationSection.remove();
    }
}

// Add this to your addMapStyles function or create a new function
function addCartLocationStyles() {
    const styles = `
        .cart-location-details {
            background: #fff;
            border: 1px solid #000;
            padding: 10px;
            margin: 10px 0;
            font-size: 0.8rem;
        }

        .location-details-header {
            border-bottom: 1px solid #000;
            margin-bottom: 8px;
            padding-bottom: 5px;
        }

        .location-details-header h4 {
            margin: 0;
            color: #000;
            font-size: 0.9rem;
            font-weight: bold;
        }

        .location-details-content {
            display: grid;
            grid-template-columns: 1fr;
            gap: 4px;
        }

        .location-detail-item {
            display: flex;
            justify-content: space-between;
            padding: 2px 0;
        }

        .detail-label {
            color: #000;
            font-weight: bold;
        }

        .detail-value {
            color: #000;
        }

        .location-distance-info {
            margin-top: 8px;
            padding-top: 6px;
            border-top: 1px solid #000;
            display: flex;
            justify-content: space-between;
            font-style: italic;
        }

        .distance-label {
            color: #fff;
        }

        .distance-value {
            color: #fff;
        }

        .location-full-address {
            margin-top: 8px;
            padding-top: 6px;
            border-top: 1px dashed #000;
        }

        .location-full-address .detail-label {
            display: block;
            margin-bottom: 2px;
        }

        .location-full-address .detail-value {
            text-align: left;
            font-size: 0.75rem;
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// Customization Functions
function openCustomizeModal(button) {
    const id = parseInt(button.dataset.id);
    const name = button.dataset.name;
    const price = parseFloat(button.dataset.price);
    const image = button.dataset.image;
    
    if (elements.customize.image) elements.customize.image.src = image;
    if (elements.customize.name) elements.customize.name.textContent = name;
    if (elements.customize.basePrice) elements.customize.basePrice.textContent = `Base price: K${price.toFixed(2)}`;
    if (elements.customize.total) elements.customize.total.textContent = `K${price.toFixed(2)}`;
    
    document.querySelectorAll('input[name="topping"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    if (elements.customize.instructions) elements.customize.instructions.value = '';
    
    state.currentCustomization = {
        id,
        name,
        basePrice: price,
        image,
        toppings: [],
        instructions: '',
        totalPrice: price
    };
    
    showModal(elements.customize.modal);
}

function updateCustomizeTotal() {
    const checkedToppings = document.querySelectorAll('input[name="topping"]:checked');
    const toppingCount = checkedToppings.length;
    const toppingPrice = toppingCount * 2;
    const totalPrice = state.currentCustomization.basePrice + toppingPrice;
    
    state.currentCustomization.toppings = Array.from(checkedToppings).map(t => t.value);
    state.currentCustomization.totalPrice = totalPrice;
    
    if (elements.customize.total) elements.customize.total.textContent = `K${totalPrice.toFixed(2)}`;
}

function addCustomizedToCart() {
    if (!state.currentCustomization) return;
    
    const customization = state.currentCustomization;
    const instructions = elements.customize.instructions ? elements.customize.instructions.value : '';
    
    state.currentCustomization.instructions = instructions;
    
    const existingIndex = state.cart.findIndex(item => 
        item.id === customization.id &&
        JSON.stringify(item.toppings) === JSON.stringify(customization.toppings) &&
        item.instructions === customization.instructions
    );
    
    if (existingIndex !== -1) {
        state.cart[existingIndex].quantity += 1;
    } else {
        state.cart.push({
            id: customization.id,
            name: customization.name,
            price: customization.totalPrice,
            quantity: 1,
            image: customization.image,
            toppings: [...customization.toppings],
            instructions: customization.instructions
        });
    }
    
    updateCartUI();
    showNotification(`${customization.name} added to cart! 🛒`, CONSTANTS.NOTIFICATION.SUCCESS, 'success');
    hideModal(elements.customize.modal);
}

// Wishlist Functions
function toggleWishlist(button) {
    try {
        const id = parseInt(button.dataset.id);
        const name = button.dataset.name || document.querySelector(`.add-btn[data-id="${id}"]`)?.dataset.name;
        const price = parseFloat(button.dataset.price || document.querySelector(`.add-btn[data-id="${id}"]`)?.dataset.price);
        const image = button.dataset.image || document.querySelector(`.add-btn[data-id="${id}"]`)?.dataset.image || 'default-food.jpg';
        
        const existingIndex = state.wishlist.findIndex(item => item.id === id);
        
        if (existingIndex !== -1) {
            state.wishlist.splice(existingIndex, 1);
            button.innerHTML = '<i class="far fa-heart"></i>';
            showNotification('Removed from favorites', CONSTANTS.NOTIFICATION.WARNING, 'warning');
        } else {
            state.wishlist.push({ id, name, price, image });
            button.innerHTML = '<i class="fas fa-heart"></i>';
            showNotification('Added to favorites! ❤️', CONSTANTS.NOTIFICATION.SUCCESS, 'success');
        }
        
        updateWishlistUI();
    } catch (error) {
        console.error('Error toggling wishlist:', error);
        showNotification('Error updating favorites', CONSTANTS.NOTIFICATION.ERROR, 'error');
    }
}

function updateWishlistUI() {
    localStorage.setItem(CONSTANTS.STORAGE_KEYS.WISHLIST, JSON.stringify(state.wishlist));
    
    document.querySelectorAll('.wishlist-btn').forEach(btn => {
        const id = parseInt(btn.dataset.id);
        if (state.wishlist.some(item => item.id === id)) {
            btn.innerHTML = '<i class="fas fa-heart"></i>';
        } else {
            btn.innerHTML = '<i class="far fa-heart"></i>';
        }
    });
    
    if (elements.wishlist.modal && elements.wishlist.modal.classList.contains('active')) {
        if (state.wishlist.length === 0) {
            if (elements.wishlist.noWishlist) elements.wishlist.noWishlist.style.display = 'block';
            if (elements.wishlist.items) elements.wishlist.items.innerHTML = '';
        } else {
            if (elements.wishlist.noWishlist) elements.wishlist.noWishlist.style.display = 'none';
            if (elements.wishlist.items) {
                elements.wishlist.items.innerHTML = state.wishlist.map(item => `
                    <article class="food-card compact">
                        <div class="food-image" style="background-image: url('${item.image}');" role="img" aria-label="${escapeHtml(item.name)}">
                            <button class="wishlist-btn" aria-label="Remove from favorites" data-id="${item.id}">
                                <i class="fas fa-heart"></i>
                            </button>
                        </div>
                        <div class="food-details">
                            <h3 class="food-title">${escapeHtml(item.name)}</h3>
                            <div class="food-meta">
                                <div class="price-container">
                                    <p class="food-price">K${item.price.toFixed(2)}</p>
                                </div>
                                <button class="add-btn" data-id="${item.id}" data-name="${escapeHtml(item.name)}" data-price="${item.price}" data-image="${item.image}">
                                    <i class="fas fa-plus"></i> Add
                                </button>
                            </div>
                        </div>
                    </article>
                `).join('');
            }
        }
    }
}

// Modal Functions
function openCart() {
    showModal(elements.cart.modal);
}

function closeCartModal() {
    hideModal(elements.cart.modal);
}

// NEW FUNCTION: Open drink modal
function openDrinkModal() {
    showModal(elements.drink.modal);
}

// Update the openPaymentModal function
// Fix the openPaymentModal function
function openPaymentModal() {
    console.log('openPaymentModal called');
    
    if (state.cart.length === 0) {
        showNotification('Your cart is empty!', CONSTANTS.NOTIFICATION.WARNING, 'warning');
        return;
    }
    
    // Check if required elements exist
    if (!elements.payment.modal) {
        console.error('Payment modal element not found');
        showNotification('Payment system error. Please refresh the page.', CONSTANTS.NOTIFICATION.ERROR, 'error');
        return;
    }
    
    try {
        // Update payment modal content
        updatePaymentModalContent();
        
        // Show the modal
        showModal(elements.payment.modal);
        
        // Initialize Airtel Money payment
        const total = calculateTotal();
        const orderRef = state.orderCounter.toString().padStart(4, '0');
        initiateAirtelMoneyPayment(total.total, orderRef);
        
    } catch (error) {
        console.error('Error opening payment modal:', error);
        showNotification('Error opening payment. Please try again.', CONSTANTS.NOTIFICATION.ERROR, 'error');
    }
}

// Fix the updatePaymentModalContent function
// Update the payment modal to include Airtel Money integration
function updatePaymentModalContent() {
    try {
        const total = calculateTotal();
        
        // Safely update all payment summary elements
        const elementsToUpdate = {
            'paymentItemsTotal': `K${total.subtotal.toFixed(2)}`,
            'paymentDeliveryTotal': `K${total.delivery.toFixed(2)}`,
            'paymentTotalAmount': `K${total.total.toFixed(2)}`,
            'paymentAmount': `K${total.total.toFixed(2)}`,
            'paymentOrderRef': state.orderCounter.toString().padStart(4, '0')
        };
        
        // Update each element if it exists
        Object.entries(elementsToUpdate).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
        
        // Update discount display
        const discountRow = document.getElementById('paymentDiscountRow');
        const discountElement = document.getElementById('paymentDiscount');
        if (discountElement && discountRow) {
            if (total.discount > 0) {
                discountElement.textContent = `-K${total.discount.toFixed(2)}`;
                discountRow.hidden = false;
            } else {
                discountRow.hidden = true;
            }
        }
        
        // Update order items in summary
        updatePaymentOrderSummary();
        
        // Update delivery method display
        updatePaymentDeliveryInfo();
        
    } catch (error) {
        console.error('Error updating payment modal:', error);
        showNotification('Error loading payment details', CONSTANTS.NOTIFICATION.ERROR, 'error');
    }
}

// In your setupEventListeners function, update the checkout button:
elements.cart.checkoutBtn?.addEventListener('click', function(e) {
    console.log('Checkout button clicked');
    e.preventDefault();
    e.stopPropagation();
    openPaymentModal();
});

// Add this function to check if required elements exist
function validatePaymentModalElements() {
    const requiredElements = [
        'paymentModal',
        'paymentItemsTotal', 
        'paymentDeliveryTotal',
        'paymentTotalAmount',
        'paymentOrderRef',
        'paymentOrderItems',
        'paymentUploadArea',
        'paymentScreenshotUpload',
        'submitPaymentOrder'
    ];
    
    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    
    if (missingElements.length > 0) {
        console.error('Missing payment modal elements:', missingElements);
        return false;
    }
    
    return true;
}

// Add this new function to update order items in payment modal
function updatePaymentOrderSummary() {
    const orderItemsContainer = document.getElementById('paymentOrderItems');
    if (!orderItemsContainer) return;
    
    if (state.cart.length === 0) {
        orderItemsContainer.innerHTML = '<p class="no-items">No items in cart</p>';
        return;
    }
    
    orderItemsContainer.innerHTML = state.cart.map(item => {
        const toppingsText = item.toppings && item.toppings.length > 0 
            ? `<div class="summary-item-toppings">Extras: ${item.toppings.join(', ')}</div>` 
            : '';
        
        const instructionsText = item.instructions 
            ? `<div class="summary-item-instructions">Note: ${escapeHtml(item.instructions)}</div>` 
            : '';
        
        return `
            <div class="summary-item-enhanced">
                <img src="${item.image}" alt="${escapeHtml(item.name)}" class="summary-item-image" onerror="this.src='default-food.jpg'">
                <div class="summary-item-info">
                    <div class="summary-item-name">${escapeHtml(item.name)}</div>
                    ${toppingsText}
                    ${instructionsText}
                </div>
                <div class="summary-item-quantity">× ${item.quantity}</div>
                <div class="summary-item-price">K${(item.price * item.quantity).toFixed(2)}</div>
            </div>
        `;
    }).join('');
}

// Add this function to update delivery info in payment modal
function updatePaymentDeliveryInfo() {
    const methodDisplay = document.querySelector('.delivery-method-display');
    if (!methodDisplay) return;
    
    if (state.isDelivery) {
        methodDisplay.innerHTML = `
            <i class="fas fa-truck"></i>
            <div class="delivery-method-text">
                <div class="delivery-method-name">Delivery</div>
                <div class="delivery-method-desc">Get your order delivered to your location</div>
            </div>
            <button class="change-method-btn" id="changeMethodBtn">
                Change
            </button>
        `;
    } else {
        methodDisplay.innerHTML = `
            <i class="fas fa-store"></i>
            <div class="delivery-method-text">
                <div class="delivery-method-name">Self Pickup</div>
                <div class="delivery-method-desc">Pick up your order at the cafe</div>
            </div>
            <button class="change-method-btn" id="changeMethodBtn">
                Change
            </button>
        `;
    }
}
// New function to update payment modal content
function updatePaymentModalContent() {
    const total = calculateTotal();
    
    // Update order summary
    document.getElementById('paymentItemsTotal').textContent = `K${total.subtotal.toFixed(2)}`;
    document.getElementById('paymentDeliveryTotal').textContent = `K${total.delivery.toFixed(2)}`;
    document.getElementById('paymentTotalAmount').textContent = `K${total.total.toFixed(2)}`;
    document.getElementById('paymentAmount').textContent = `K${total.total.toFixed(2)}`;
    document.getElementById('paymentOrderRef').textContent = state.orderCounter.toString().padStart(4, '0');
    
    // Update discount display
    const discountRow = document.getElementById('paymentDiscountRow');
    const discountElement = document.getElementById('paymentDiscount');
    if (total.discount > 0) {
        discountElement.textContent = `-K${total.discount.toFixed(2)}`;
        discountRow.hidden = false;
    } else {
        discountRow.hidden = true;
    }
    
    // Update order items in summary
    updatePaymentOrderSummary();
    
    // Update delivery method display
    updatePaymentDeliveryInfo();
}

// New function to update order items in payment modal
function handlePaymentFileUpload(e) {
    try {
        const file = e.target.files[0];
        if (!file) {
            showNotification('No file selected', CONSTANTS.NOTIFICATION.WARNING, 'warning');
            return;
        }

        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            showNotification('Please upload an image file (JPEG, PNG, GIF, WebP)', CONSTANTS.NOTIFICATION.ERROR, 'error');
            e.target.value = '';
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            showNotification('Image must be less than 5MB', CONSTANTS.NOTIFICATION.ERROR, 'error');
            e.target.value = '';
            return;
        }
        
        const preview = document.getElementById('paymentFilePreview');
        const fileName = document.getElementById('paymentFileName');
        const previewImage = document.getElementById('paymentPreviewImage');
        
        if (preview) preview.hidden = false;
        if (fileName) fileName.textContent = file.name;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            if (previewImage) previewImage.src = e.target.result;
        };
        reader.onerror = function() {
            showNotification('Error reading file', CONSTANTS.NOTIFICATION.ERROR, 'error');
            e.target.value = '';
        };
        reader.readAsDataURL(file);
        
        const submitBtn = document.getElementById('submitPaymentOrder') || elements.payment.submitOrder;
        if (submitBtn) submitBtn.disabled = false;
        
    } catch (error) {
        console.error('Error handling file upload:', error);
        showNotification('Error uploading file', CONSTANTS.NOTIFICATION.ERROR, 'error');
        e.target.value = '';
    }
}
// New function to update delivery info in payment modal
function updatePaymentDeliveryInfo() {
    const methodDisplay = document.querySelector('.delivery-method-display');
    if (!methodDisplay) return;
    
    if (state.isDelivery) {
        methodDisplay.innerHTML = `
            <i class="fas fa-truck"></i>
            <div class="delivery-method-text">
                <div class="delivery-method-name">Delivery</div>
                <div class="delivery-method-desc">Get your order delivered to your location</div>
            </div>
            <button class="change-method-btn" id="changeMethodBtn">
                Change
            </button>
        `;
    } else {
        methodDisplay.innerHTML = `
            <i class="fas fa-store"></i>
            <div class="delivery-method-text">
                <div class="delivery-method-name">Self Pickup</div>
                <div class="delivery-method-desc">Pick up your order at the cafe</div>
            </div>
            <button class="change-method-btn" id="changeMethodBtn">
                Change
            </button>
        `;
    }
}

function closePaymentModal() {
    hideModal(elements.payment.modal);
    if (elements.payment.screenshotUpload) elements.payment.screenshotUpload.value = '';
    if (elements.payment.fileName) elements.payment.fileName.textContent = '';
    if (elements.payment.submitOrder) elements.payment.submitOrder.disabled = true;
}

function showModal(modal) {
    if (!modal) return;
    modal.classList.add('active');
    if (elements.ui.overlay) elements.ui.overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    modal.removeAttribute('hidden');
    if (elements.ui.overlay) elements.ui.overlay.removeAttribute('hidden');
}

function hideModal(modal) {
    if (!modal) return;
    
    // Cleanup location map if it's the location modal
    if (modal.id === 'locationModal') {
        cleanupLocationMap();
    }
    
    modal.classList.remove('active');
    if (elements.ui.overlay) elements.ui.overlay.classList.remove('active');
    document.body.style.overflow = 'auto';
    setTimeout(() => {
        modal.setAttribute('hidden', 'true');
        if (elements.ui.overlay) elements.ui.overlay.setAttribute('hidden', 'true');
    }, 300);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) hideModal(modal);
}

function closeAllModals() {
    hideModal(elements.cart.modal);
    hideModal(elements.payment.modal);
    hideModal(elements.orders.modal);
    hideModal(elements.profile.modal);
    hideModal(elements.wishlist.modal);
    hideModal(elements.ui.locationModal);
    hideModal(elements.ui.quickOrderModal);
    hideModal(elements.ui.chatModal);
    hideModal(elements.tracking.modal);
    hideModal(elements.customize.modal);
    hideModal(elements.drink.modal);
    hideModal(document.getElementById('pickupMapModal'));
}

function openWishlistModal() {
    showModal(elements.wishlist.modal);
    updateWishlistUI();
}

function openLocationModal() {
    showModal(elements.ui.locationModal);
}

function openQuickOrderModal() {
    showModal(elements.ui.quickOrderModal);
}

function openChatModal() {
    showModal(elements.ui.chatModal);
    loadChatMessages();
}

// Search and Filter Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function handleSearch() {
    const query = elements.ui.searchInput.value.toLowerCase().trim();
    state.searchQuery = query;
    
    if (query.length < 2) {
        if (elements.ui.searchSuggestions) elements.ui.searchSuggestions.hidden = true;
        document.querySelectorAll('.food-card').forEach(card => {
            card.style.display = 'flex';
        });
        if (elements.ui.noResults) elements.ui.noResults.hidden = true;
        return;
    }
    
    showSearchSuggestions(query);
    
    let hasResults = false;
    
    document.querySelectorAll('.food-card').forEach(card => {
        const title = card.querySelector('.food-title').textContent.toLowerCase();
        const desc = card.querySelector('.food-desc').textContent.toLowerCase();
        const category = card.closest('.category-section').id;
        
        if ((title.includes(query) || desc.includes(query)) && 
            (state.activeCategory === 'all' || category === state.activeCategory) &&
            (state.activeFilter === 'all' || card.dataset[state.activeFilter] === 'true')) {
            card.style.display = 'flex';
            hasResults = true;
            highlightText(card, query);
        } else {
            card.style.display = 'none';
        }
    });
    
    if (elements.ui.noResults) elements.ui.noResults.hidden = hasResults;
}

function showSearchSuggestions(query) {
    const suggestions = [];
    
    document.querySelectorAll('.food-card').forEach(card => {
        const title = card.querySelector('.food-title').textContent.toLowerCase();
        const desc = card.querySelector('.food-desc').textContent.toLowerCase();
        
        if (title.includes(query) || desc.includes(query)) {
            suggestions.push({
                title: card.querySelector('.food-title').textContent,
                category: card.closest('.category-section').id.replace('-', ' ')
            });
        }
    });
    
    if (suggestions.length > 0 && elements.ui.searchSuggestions) {
        elements.ui.searchSuggestions.innerHTML = suggestions.slice(0, 5).map(suggestion => `
            <div class="suggestion-item">
                <i class="fas fa-utensils"></i>
                <span>${escapeHtml(suggestion.title)}</span>
                <small>${escapeHtml(suggestion.category)}</small>
            </div>
        `).join('');
        
        elements.ui.searchSuggestions.hidden = false;
        
        elements.ui.searchSuggestions.querySelectorAll('.suggestion-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                elements.ui.searchInput.value = suggestions[index].title;
                handleSearch();
                elements.ui.searchSuggestions.hidden = true;
            });
        });
    } else {
        if (elements.ui.searchSuggestions) elements.ui.searchSuggestions.hidden = true;
    }
}

function clearSearch() {
    if (elements.ui.searchInput) elements.ui.searchInput.value = '';
    state.searchQuery = '';
    if (elements.ui.searchSuggestions) elements.ui.searchSuggestions.hidden = true;
    handleSearch();
}

function toggleSearch() {
    if (elements.ui.searchBar) elements.ui.searchBar.classList.toggle('active');
    if (elements.ui.searchBar && elements.ui.searchBar.classList.contains('active')) {
        if (elements.ui.searchInput) elements.ui.searchInput.focus();
    } else {
        if (elements.ui.searchSuggestions) elements.ui.searchSuggestions.hidden = true;
    }
}

function highlightText(element, query) {
    const titles = element.querySelectorAll('.food-title');
    const descriptions = element.querySelectorAll('.food-desc');
    
    titles.forEach(title => title.innerHTML = title.textContent);
    descriptions.forEach(desc => desc.innerHTML = desc.textContent);
    
    if (query.length > 2) {
        const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
        
        titles.forEach(title => {
            title.innerHTML = title.textContent.replace(regex, '<span class="highlight">$1</span>');
        });
        descriptions.forEach(desc => {
            desc.innerHTML = desc.textContent.replace(regex, '<span class="highlight">$1</span>');
        });
    }
}

function filterByCategory(category) {
    const categoryName = category.dataset.category;
    state.activeCategory = categoryName;
    
    elements.ui.categories.forEach(cat => cat.classList.remove('active'));
    category.classList.add('active');
    
    elements.ui.categorySections.forEach(section => {
        if (categoryName === 'all' || section.id === categoryName) {
            section.classList.add('active');
            section.removeAttribute('hidden');
        } else {
            section.classList.remove('active');
            section.setAttribute('hidden', 'true');
        }
    });
    
    if (state.searchQuery) handleSearch();
}

function initQuickFilters() {
    elements.ui.quickFilters.forEach(filter => {
        filter.addEventListener('click', () => {
            elements.ui.quickFilters.forEach(f => f.classList.remove('active'));
            filter.classList.add('active');
            state.activeFilter = filter.dataset.filter;
            applyFilters();
        });
    });
}

function applyFilters() {
    document.querySelectorAll('.food-card').forEach(card => {
        const category = card.closest('.category-section').id;
        const matchesCategory = state.activeCategory === 'all' || category === state.activeCategory;
        const matchesFilter = state.activeFilter === 'all' || card.dataset[state.activeFilter] === 'true';
        const matchesSearch = !state.searchQuery || 
                             card.querySelector('.food-title').textContent.toLowerCase().includes(state.searchQuery) ||
                             card.querySelector('.food-desc').textContent.toLowerCase().includes(state.searchQuery);
        
        if (matchesCategory && matchesFilter && matchesSearch) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
    
    const hasResults = document.querySelectorAll('.food-card[style="display: flex"]').length > 0;
    if (elements.ui.noResults) elements.ui.noResults.hidden = hasResults;
}

// Navigation Functions
function navigateTo(page) {
    elements.ui.navItems.forEach(item => item.classList.remove('active'));
    const pageElement = document.querySelector(`[data-page="${page}"]`);
    if (pageElement) pageElement.classList.add('active');
    
    state.currentPage = page;
    
    if (page === 'promo') {
        const promoCategory = document.querySelector('[data-category="promo"]');
        if (promoCategory) filterByCategory(promoCategory);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (page === 'orders') {
        openOrdersModal();
    } else if (page === 'wishlist') {
        openWishlistModal();
    } else if (page === 'profile') {
        openProfileModal();
    } else if (page === 'location') {
        showRestaurantMapModal();
    } else {
        const allCategory = document.querySelector('[data-category="all"]');
        if (allCategory) filterByCategory(allCategory);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function openOrdersModal() {
    loadOrders();
    showModal(elements.orders.modal);
}

function openProfileModal() {
    showModal(elements.profile.modal);
}

// Update the delivery option selection to refresh address display
// In your setupEventListeners function, update the delivery option click handler
function selectDeliveryOption(delivery) {
    state.isDelivery = delivery;
    
    if (delivery) {
        if (elements.delivery.delivery) elements.delivery.delivery.classList.add('selected');
        if (elements.delivery.pickup) elements.delivery.pickup.classList.remove('selected');
        state.deliveryFee = window.deliveryInfo ? window.deliveryInfo.charge : CONSTANTS.DELIVERY_FEE;
        
        // Show enhanced delivery map modal with all details
        showEnhancedDeliveryMapModal();
        
    } else {
        if (elements.delivery.pickup) elements.delivery.pickup.classList.add('selected');
        if (elements.delivery.delivery) elements.delivery.delivery.classList.remove('selected');
        state.deliveryFee = 0;
    }
    
    updateCartUI();
}

// NEW FUNCTION: Show enhanced delivery map modal
// Enhanced function to show delivery modal
function showEnhancedDeliveryMapModal() {
    createDeliveryMapModal();
    const modal = document.getElementById('deliveryMapModal');
    
    if (!userLocation) {
        requestLocationPermission().then(() => {
            initializeDeliveryMap();
            updateDeliveryDetails();
            showModal(modal);
        }).catch(error => {
            initializeDeliveryMap();
            updateDeliveryDetails();
            showModal(modal);
        });
    } else {
        initializeDeliveryMap();
        updateDeliveryDetails();
        showModal(modal);
    }
}

function addEnhancedDeliveryStyles() {
    const styles = `
        .delivery-info-card .info-content h4 {
            margin: 0 0 8px 0;
            color: #333;
            font-size: 1rem;
        }
        
        .delivery-info-card .info-content p {
            margin: 0;
            color: #666;
            font-size: 0.85rem;
            line-height: 1.4;
        }
        
        #userLocationFullDetails,
        #restaurantLocationFullDetails {
            font-size: 0.8rem;
        }
        
        #userLocationFullDetails strong,
        #restaurantLocationFullDetails strong {
            color: #333;
            display: block;
            margin-bottom: 4px;
        }
        
        #userLocationFullDetails em,
        #restaurantLocationFullDetails em {
            color: #888;
            font-size: 0.75rem;
        }
        
        #deliveryDistanceDetailed,
        #deliveryFeeDetailed,
        #estimatedTimeDetailed {
            font-weight: 600;
            color: #4CAF50;
            font-size: 1rem;
        }
        
        .map-actions .btn-primary {
            background: linear-gradient(135deg, #4CAF50, #45a049);
            padding: 12px 30px;
            font-size: 1rem;
            font-weight: 600;
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}
// NEW FUNCTION: Show delivery map modal (similar to restaurant map but focused on delivery)
// MODIFIED: Show delivery map modal without directions button
function showDeliveryMapModal() {
    // Create the delivery map modal if it doesn't exist
    if (!document.getElementById('deliveryMapModal')) {
        createDeliveryMapModal();
    }
    
    const deliveryMapModal = document.getElementById('deliveryMapModal');
    
    if (!userLocation) {
        // If no location, request permission first
        requestLocationPermission().then(() => {
            initializeDeliveryMapModal();
            showModal(deliveryMapModal);
        }).catch(error => {
            // If location fails, still show the map with restaurant location
            initializeDeliveryMapModal();
            showModal(deliveryMapModal);
        });
    } else {
        initializeDeliveryMapModal();
        showModal(deliveryMapModal);
    }
}
// NEW FUNCTION: Create delivery map modal
// MODIFIED: Create delivery map modal without directions button
// NEW FUNCTION: Create enhanced delivery map modal
function createEnhancedDeliveryMapModal() {
    const modalHTML = `
        <div class="modal" id="deliveryMapModal" role="dialog" aria-labelledby="deliveryMapTitle" aria-modal="true" hidden>
            <div class="modal-content compact-modal">
                <div class="modal-header">
                    <div class="modal-logo">
                        <img src="wfc.png" alt="WIZA FOOD CAFE Logo" class="logo-img" width="40" height="40">
                        <h3 id="deliveryMapTitle">Delivery Route</h3>
                    </div>
                    <button class="close-modal" data-modal="deliveryMapModal" aria-label="Close delivery map">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="deliveryModalMap" style="height: 250px; width: 100%; border-radius: 8px; margin: 10px 0;"></div>
                    
                    <div class="delivery-info-grid">
                        <div class="info-card">
                            <div class="info-icon user-location">
                                <i class="fas fa-map-marker-alt"></i>
                            </div>
                            <div class="info-content">
                                <div class="info-label">Your Location</div>
                                <div class="info-value" id="deliveryLocationAddress">Current Location</div>
                            </div>
                        </div>
                        
                        <div class="info-card">
                            <div class="info-icon restaurant-location">
                                <i class="fas fa-store"></i>
                            </div>
                            <div class="info-content">
                                <div class="info-label">Restaurant</div>
                                <div class="info-value">WIZA FOOD CAFE</div>
                            </div>
                        </div>
                        
                        <div class="info-card">
                            <div class="info-icon distance">
                                <i class="fas fa-road"></i>
                            </div>
                            <div class="info-content">
                                <div class="info-label">Distance</div>
                                <div class="info-value" id="deliveryMapDistance">0 km</div>
                            </div>
                        </div>
                        
                        <div class="info-card">
                            <div class="info-icon fee">
                                <i class="fas fa-truck"></i>
                            </div>
                            <div class="info-content">
                                <div class="info-label">Delivery Fee</div>
                                <div class="info-value" id="deliveryMapFee">K0</div>
                            </div>
                        </div>
                        
                        <div class="info-card">
                            <div class="info-icon time">
                                <i class="fas fa-clock"></i>
                            </div>
                            <div class="info-content">
                                <div class="info-label">Est. Time</div>
                                <div class="info-value" id="deliveryMapTime">0-5 min</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="map-actions">
                        <button class="btn-primary compact-btn" id="getDeliveryDirectionsBtn">
                            <i class="fas fa-directions"></i> Get Directions
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Only add if it doesn't exist
    if (!document.getElementById('deliveryMapModal')) {
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        setupDeliveryMapModalEvents();
    }
    
    return document.getElementById('deliveryMapModal');
}
// NEW FUNCTION: Initialize enhanced delivery map
function initializeEnhancedDeliveryMap() {
    const mapContainer = document.getElementById('deliveryModalMap');
    if (!mapContainer) return;
    
    // Clear any existing map
    if (window.deliveryModalMap) {
        window.deliveryModalMap.remove();
    }
    
    // Use user location as center, or restaurant location as fallback
    const center = userLocation || restaurantLocation;
    
    // Initialize the map
    window.deliveryModalMap = L.map('deliveryModalMap').setView(center, 15);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(window.deliveryModalMap);
    
    // Add restaurant marker with orange color
    const restaurantIcon = L.divIcon({
        html: '<div class="custom-marker restaurant-marker"><i class="fas fa-store"></i></div>',
        className: 'custom-div-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 30]
    });
    
    L.marker(restaurantLocation, {icon: restaurantIcon})
        .addTo(window.deliveryModalMap)
        .bindPopup(`
            <div class="map-popup">
                <strong>🍽️ WIZA FOOD CAFE</strong><br>
                <span>Pickup Location</span>
            </div>
        `);
    
    // Update delivery details immediately
    updateEnhancedDeliveryDetails();
    
    // Add user marker if location is available
    if (userLocation) {
        const userIcon = L.divIcon({
            html: '<div class="custom-marker user-marker"><i class="fas fa-map-marker-alt"></i></div>',
            className: 'custom-div-icon',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        });
        
        L.marker(userLocation, {icon: userIcon})
            .addTo(window.deliveryModalMap)
            .bindPopup(`
                <div class="map-popup">
                    <strong>📍 Your Location</strong><br>
                    <span id="userLocationPopup">Loading address...</span>
                </div>
            `);
        
        // Get detailed address for user location
        reverseGeocode(userLocation[0], userLocation[1])
            .then(address => {
                const userAddress = formatShortAddress(address);
                document.getElementById('deliveryLocationAddress').textContent = userAddress;
                
                // Update popup
                const userLocationPopup = document.getElementById('userLocationPopup');
                if (userLocationPopup) {
                    userLocationPopup.textContent = userAddress;
                }
            })
            .catch(error => {
                console.error('Error getting user address:', error);
                document.getElementById('deliveryLocationAddress').textContent = 'Current Location';
            });
        
        // Add route between locations
        addRouteToDeliveryModalMap(userLocation, restaurantLocation);
        
        // Fit map to show both locations
        const group = new L.featureGroup([
            L.marker(userLocation),
            L.marker(restaurantLocation)
        ]);
        window.deliveryModalMap.fitBounds(group.getBounds().pad(0.1));
    } else {
        // Just show restaurant location
        window.deliveryModalMap.setView(restaurantLocation, 15);
        document.getElementById('deliveryLocationAddress').textContent = 'Enable location access';
    }
}

// NEW FUNCTION: Update enhanced delivery details
function updateEnhancedDeliveryDetails() {
    if (!userLocation) {
        userLocation = restaurantLocation; // Fallback to restaurant location
    }
    
    const distance = calculateDistance(userLocation, restaurantLocation);
    const distanceKm = (distance / 1000).toFixed(1);
    const deliveryCharge = calculateDeliveryCharge(distance);
    const estimatedTime = calculateEstimatedTime(distance);
    
    // Update all elements immediately
    const distanceElement = document.getElementById('deliveryMapDistance');
    const feeElement = document.getElementById('deliveryMapFee');
    const timeElement = document.getElementById('deliveryMapTime');
    
    if (distanceElement) distanceElement.textContent = `${distanceKm} km`;
    if (feeElement) feeElement.textContent = `K${deliveryCharge}`;
    if (timeElement) timeElement.textContent = `${estimatedTime} min`;
}

// NEW FUNCTION: Calculate estimated delivery time
function calculateEstimatedTime(distance) {
    const baseTime = 15; // Base preparation time in minutes
    const travelTimePerKm = 2; // Minutes per km
    const travelTime = Math.round((distance / 1000) * travelTimePerKm);
    
    return baseTime + travelTime;
}

// NEW FUNCTION: Format short address for display
function formatShortAddress(address) {
    if (!address) return 'Current Location';
    
    const parts = [];
    if (address.road) parts.push(address.road);
    if (address.suburb && parts.length < 2) parts.push(address.suburb);
    if (address.city && parts.length < 2) parts.push(address.city);
    
    return parts.length > 0 ? parts.join(', ') : 'Current Location';
}


// NEW FUNCTION: Setup delivery map modal events
// MODIFIED: Setup delivery map modal events (no directions button)
function setupDeliveryMapModalEvents() {
    // REMOVED: Directions button event listener
    
    // Close button
    const closeBtn = document.querySelector('[data-modal="deliveryMapModal"]');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            hideModal(document.getElementById('deliveryMapModal'));
        });
    }
}
// NEW FUNCTION: Initialize delivery map modal
function initializeDeliveryMapModal() {
    const mapContainer = document.getElementById('deliveryModalMap');
    if (!mapContainer) return;
    
    // Clear any existing map
    if (window.deliveryModalMap) {
        window.deliveryModalMap.remove();
    }
    
    // Use user location as center, or restaurant location as fallback
    const center = userLocation || restaurantLocation;
    
    // Initialize the map
    window.deliveryModalMap = L.map('deliveryModalMap').setView(center, 15);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(window.deliveryModalMap);
    
    // Add restaurant marker
    const restaurantMarker = L.marker(restaurantLocation)
        .addTo(window.deliveryModalMap)
        .bindPopup(`
            <div class="map-popup">
                <strong>🍽️ WIZA FOOD CAFE</strong><br>
                <hr style="margin: 5px 0;">
                <strong>Pickup Location</strong><br>
                Plot 123, Great East Road, Lusaka
            </div>
        `);
    
    // Add user marker if location is available
    if (userLocation) {
        // Get detailed address for user location
        reverseGeocode(userLocation[0], userLocation[1])
            .then(address => {
                const userAddress = formatFullAddress(address);
                const addressElement = document.getElementById('deliveryLocationAddress');
                if (addressElement) {
                    addressElement.textContent = userAddress;
                }
                
                L.marker(userLocation)
                    .addTo(window.deliveryModalMap)
                    .bindPopup(`
                        <div class="map-popup">
                            <strong>📍 Your Delivery Location</strong><br>
                            <hr style="margin: 5px 0;">
                            ${userAddress}
                        </div>
                    `);
                
                // Update delivery details
                updateDeliveryMapDetails(userLocation, address);
            })
            .catch(error => {
                console.error('Error getting user address:', error);
                const addressElement = document.getElementById('deliveryLocationAddress');
                if (addressElement) {
                    addressElement.textContent = 'Current Location (Auto-detected)';
                }
                
                L.marker(userLocation)
                    .addTo(window.deliveryModalMap)
                    .bindPopup(`
                        <div class="map-popup">
                            <strong>📍 Your Delivery Location</strong><br>
                            <hr style="margin: 5px 0;">
                            <em>Address details unavailable</em>
                        </div>
                    `);
            });
        
        // Add route between locations
        addRouteToDeliveryModalMap(userLocation, restaurantLocation);
        
        // Fit map to show both locations
        const group = new L.featureGroup([
            L.marker(userLocation),
            L.marker(restaurantLocation)
        ]);
        window.deliveryModalMap.fitBounds(group.getBounds().pad(0.1));
    } else {
        // Just show restaurant location
        window.deliveryModalMap.setView(restaurantLocation, 15);
        const addressElement = document.getElementById('deliveryLocationAddress');
        if (addressElement) {
            addressElement.textContent = 'Enable location access to see your delivery address';
        }
    }
}

// NEW FUNCTION: Update delivery map details
function updateDeliveryMapDetails(coordinates, address) {
    const distance = calculateDistance(coordinates, restaurantLocation);
    const deliveryCharge = calculateDeliveryCharge(distance);
    const estimatedTime = Math.round(distance / 400); // Rough estimate in minutes
    
    const distanceElement = document.getElementById('deliveryMapDistance');
    const feeElement = document.getElementById('deliveryMapFee');
    const timeElement = document.getElementById('deliveryMapTime');
    
    if (distanceElement) distanceElement.textContent = `${(distance / 1000).toFixed(1)} km`;
    if (feeElement) feeElement.textContent = `K${deliveryCharge}.00`;
    if (timeElement) timeElement.textContent = `${estimatedTime}-${estimatedTime + 10} minutes`;
}

// NEW FUNCTION: Add route to delivery modal map
function addRouteToDeliveryModalMap(start, end) {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const routeCoordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                
                L.polyline(routeCoordinates, {
                    color: '#2196F3',
                    weight: 6,
                    opacity: 0.8
                }).addTo(window.deliveryModalMap);
                
                const distanceKm = (route.distance / 1000).toFixed(1);
                const durationMin = Math.round(route.duration / 60);
                
                // Update the details with more accurate information
                const timeElement = document.getElementById('deliveryMapTime');
                if (timeElement) {
                    timeElement.textContent = `${durationMin}-${durationMin + 5} minutes`;
                }
            }
        })
        .catch(error => {
            console.error('Error fetching route:', error);
            // Fallback: show straight line
            L.polyline([start, end], {
                color: '#2196F3',
                weight: 6,
                opacity: 0.8,
                dashArray: '10, 10'
            }).addTo(window.deliveryModalMap);
        });
}

// NEW FUNCTION: Open delivery directions
function openDeliveryDirections() {
    if (!userLocation) {
        showNotification('Please enable location access to get directions', CONSTANTS.NOTIFICATION.WARNING, 'warning');
        return;
    }
    
    const destination = `${userLocation[0]},${userLocation[1]}`;
    const origin = `${restaurantLocation[0]},${restaurantLocation[1]}`;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    
    window.open(url, '_blank', 'noopener,noreferrer');
}

// Add CSS for the delivery map modal
// MODIFIED: Add CSS for the delivery map modal without directions button
function addDeliveryMapStyles() {
    const styles = `
        .delivery-location-details {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-top: 15px;
        }
        
        .delivery-location-details .detail-item {
            margin: 8px 0;
            font-size: 14px;
            display: flex;
            flex-direction: column;
        }
        
        .delivery-location-details .detail-item strong {
            color: #333;
            margin-bottom: 2px;
        }
        
        .delivery-location-details .detail-item span {
            color: #666;
        }
        
        #deliveryLocationAddress {
            font-weight: 500;
            color: #2196F3 !important;
        }
        
        /* REMOVED: .map-actions styles since we removed the directions button */
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}


// NEW FUNCTION: Show delivery map in cart
function showDeliveryMapInCart() {
    if (!userLocation) return;
    
    let mapSection = document.getElementById('cartDeliveryMap');
    
    if (!mapSection) {
        mapSection = document.createElement('div');
        mapSection.id = 'cartDeliveryMap';
        mapSection.className = 'cart-delivery-map';
        
        // Insert after cart items but before cart summary
        const cartItems = document.getElementById('cartItems');
        const cartSummary = document.querySelector('.cart-summary');
        
        if (cartItems && cartSummary) {
            cartItems.parentNode.insertBefore(mapSection, cartSummary);
        }
    }
    
    mapSection.innerHTML = `
        <div class="delivery-map-header">
            <i class="fas fa-map-marked-alt"></i>
            <h4>Delivery Route Map</h4>
        </div>
        <div id="deliveryMapContainer" style="height: 200px; width: 100%; border-radius: 8px; margin: 10px 0;"></div>
        <div class="map-legend">
            <div class="legend-item">
                <span class="legend-color user-location"></span>
                <span>Your Location</span>
            </div>
            <div class="legend-item">
                <span class="legend-color restaurant-location"></span>
                <span>WIZA FOOD CAFE</span>
            </div>
        </div>
        <div class="delivery-info">
            <p><strong>Distance:</strong> ${(calculateDistance(userLocation, restaurantLocation) / 1000).toFixed(1)} km</p>
            <p><strong>Delivery Fee:</strong> K${calculateDeliveryCharge(calculateDistance(userLocation, restaurantLocation))}</p>
        </div>
    `;
    
    // Initialize the map after a short delay to ensure DOM is ready
    setTimeout(() => {
        initializeDeliveryMap();
    }, 100);
}

// NEW FUNCTION: Initialize delivery map in cart
function initializeDeliveryMap() {
    const mapContainer = document.getElementById('deliveryMapContainer');
    if (!mapContainer) return;
    
    // Clear any existing map
    if (window.deliveryMap) {
        window.deliveryMap.remove();
    }
    
    // Calculate bounds to fit both locations
    const bounds = L.latLngBounds([userLocation, restaurantLocation]);
    
    // Initialize the map
    window.deliveryMap = L.map('deliveryMapContainer').fitBounds(bounds);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(window.deliveryMap);
    
    // Add user marker
    L.marker(userLocation)
        .addTo(window.deliveryMap)
        .bindPopup(`
            <div class="map-popup">
                <strong>📍 Your Location</strong><br>
                <span>Delivery destination</span>
            </div>
        `);
    
    // Add restaurant marker
    L.marker(restaurantLocation)
        .addTo(window.deliveryMap)
        .bindPopup(`
            <div class="map-popup">
                <strong>🍽️ WIZA FOOD CAFE</strong><br>
                <span>Pickup location</span>
            </div>
        `);
    
    // Add route between locations
    addRouteToDeliveryMap(userLocation, restaurantLocation);
}

// NEW FUNCTION: Add route to delivery map
function addRouteToDeliveryMap(start, end) {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const routeCoordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                
                L.polyline(routeCoordinates, {
                    color: '#4CAF50',
                    weight: 5,
                    opacity: 0.7
                }).addTo(window.deliveryMap);
            }
        })
        .catch(error => {
            console.error('Error fetching route:', error);
            // Fallback: show straight line
            L.polyline([start, end], {
                color: '#4CAF50',
                weight: 5,
                opacity: 0.7,
                dashArray: '10, 10'
            }).addTo(window.deliveryMap);
        });
}

// NEW FUNCTION: Remove delivery map from cart
function removeDeliveryMapFromCart() {
    const mapSection = document.getElementById('cartDeliveryMap');
    if (mapSection) {
        mapSection.remove();
    }
    
    // Clean up map instance
    if (window.deliveryMap) {
        window.deliveryMap.remove();
        window.deliveryMap = null;
    }
}

// NEW FUNCTION: Add CSS styles for the delivery map
function addDeliveryMapStyles() {
    const styles = `
        .cart-delivery-map {
            background: #fff;
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            padding: 15px;
            margin: 15px 0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .delivery-map-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
            border-bottom: 1px solid #f0f0f0;
            padding-bottom: 10px;
        }
        
        .delivery-map-header h4 {
            margin: 0;
            color: #333;
            font-size: 1rem;
            font-weight: 600;
        }
        
        .delivery-map-header i {
            color: #4CAF50;
            font-size: 1.2rem;
        }
        
        #deliveryMapContainer {
            border: 1px solid #ddd;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .map-legend {
            display: flex;
            gap: 20px;
            margin: 10px 0;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.85rem;
            color: #666;
        }
        
        .legend-color {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            display: inline-block;
        }
        
        .legend-color.user-location {
            background: #2196F3;
        }
        
        .legend-color.restaurant-location {
            background: #FF5722;
        }
        
        .delivery-info {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 10px;
            margin-top: 10px;
            text-align: center;
        }
        
        .delivery-info p {
            margin: 5px 0;
            font-size: 0.9rem;
            color: #555;
        }
        
        .delivery-info strong {
            color: #333;
        }
        
        /* Responsive design */
        @media (max-width: 480px) {
            .cart-delivery-map {
                padding: 10px;
                margin: 10px 0;
            }
            
            #deliveryMapContainer {
                height: 180px;
            }
            
            .map-legend {
                gap: 15px;
            }
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// Function to update address display on delivery button
function updateDeliveryAddressDisplay() {
    if (!userLocation) return;
    
    const distance = calculateDistance(userLocation, restaurantLocation);
    const distanceKm = (distance / 1000).toFixed(1);
    const deliveryCharge = calculateDeliveryCharge(distance);
    
    // Get detailed address information
    reverseGeocode(userLocation[0], userLocation[1])
        .then(address => {
            const deliveryDesc = document.getElementById('deliveryAddress');
            if (deliveryDesc) {
                const addressParts = [];
                
                // Add house number if available
                if (address.house_number) {
                    addressParts.push(address.house_number);
                }
                
                // Add road/street
                if (address.road) {
                    addressParts.push(address.road);
                }
                
                // Add suburb/area
                if (address.suburb) {
                    addressParts.push(address.suburb);
                }
                
                // Add city
                if (address.city) {
                    addressParts.push(address.city);
                }
                
                // Add country
                if (address.country) {
                    addressParts.push(address.country);
                }
                
                // Format the address string
                let addressText = addressParts.join(', ');
                if (addressText.length > 50) {
                    // Truncate long addresses but keep essential parts
                    const essentialParts = [];
                    if (address.house_number) essentialParts.push(address.house_number);
                    if (address.road) essentialParts.push(address.road);
                    if (address.city) essentialParts.push(address.city);
                    addressText = essentialParts.join(', ');
                }
                
                deliveryDesc.innerHTML = `
                    <span class="delivery-address-main">${addressText}</span>
                    <span class="delivery-distance">${distanceKm}km • K${deliveryCharge} delivery</span>
                `;
            }
        })
        .catch(error => {
            console.error('Error getting address for delivery display:', error);
            // Fallback to basic information
            const deliveryDesc = document.getElementById('deliveryAddress');
            if (deliveryDesc) {
                deliveryDesc.innerHTML = `
                    <span class="delivery-address-main">Your Current Location</span>
                    <span class="delivery-distance">${distanceKm}km • K${deliveryCharge} delivery</span>
                `;
            }
        });
}

// Function to update distance display on pickup button
// Function to update distance display on pickup button
function updatePickupDistanceDisplay() {
    if (!userLocation) return;
    
    const distance = calculateDistance(userLocation, restaurantLocation);
    const distanceKm = (distance / 1000).toFixed(1);
    
    const pickupDesc = document.getElementById('pickupDistance');
    if (pickupDesc) {
        pickupDesc.innerHTML = `
            <span class="pickup-distance">You are ${distanceKm}km from the restaurant</span>
        `;
    }
}


// NEW FUNCTION: Fetch and display detailed location information in cart
function fetchAndDisplayLocationDetails() {
    if (!userLocation) return;
    
    reverseGeocode(userLocation[0], userLocation[1])
        .then(address => {
            const locationDetails = formatLocationDetailsForCart(address);
            displayLocationDetailsInCart(locationDetails);
        })
        .catch(error => {
            console.error('Error fetching location details:', error);
            // Fallback to basic location info
            const fallbackDetails = {
                country: 'Zambia',
                city: 'Unknown',
                road: 'Unknown',
                infrastructure: 'Unknown area'
            };
            displayLocationDetailsInCart(fallbackDetails);
        });
}

// NEW FUNCTION: Format location details for cart display
function formatAddressDetails(address) {
    if (!address) return '<em>Address details unavailable</em>';
    
    const parts = [];
    
    // Road and street information
    if (address.road) parts.push(`<strong> Road:</strong> ${address.road}`);
    if (address.street && address.street !== address.road) parts.push(`<strong> Street:</strong> ${address.street}`);
    
    // Area information
    if (address.suburb) parts.push(`<strong> Area:</strong> ${address.suburb}`);
    if (address.city) parts.push(`<strong> City:</strong> ${address.city}`);
    
    // Administrative information
    if (address.state) parts.push(`<strong> State/Region:</strong> ${address.state}`);
    if (address.country) parts.push(`<strong> Country:</strong> ${address.country}`);
    if (address.postcode) parts.push(`<strong> Postcode:</strong> ${address.postcode}`);
    
    // Infrastructure details
    const infrastructure = [];
    if (address.amenity) infrastructure.push(` ${address.amenity}`);
    if (address.building) infrastructure.push(` ${address.building}`);
    if (address.shop) infrastructure.push(` ${address.shop}`);
    if (address.office) infrastructure.push(` ${address.office}`);
    if (address.public_transport) infrastructure.push(` ${address.public_transport}`);
    
    if (infrastructure.length > 0) {
        parts.push(`<strong> Nearby Infrastructure:</strong> ${infrastructure.join(', ')}`);
    }
    
    // House/building details
    if (address.house_number) parts.push(`<strong> House No:</strong> ${address.house_number}`);
    if (address.house_name) parts.push(`<strong> Building:</strong> ${address.house_name}`);
    
    return parts.join('<br>');
}

// NEW FUNCTION: Format a complete address string
function formatFullAddress(address) {
    const parts = [];
    
    if (address.house_number) parts.push(address.house_number);
    if (address.road) parts.push(address.road);
    if (address.suburb) parts.push(address.suburb);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.postcode) parts.push(address.postcode);
    if (address.country) parts.push(address.country);
    
    return parts.join(', ');
}

// NEW FUNCTION: Display location details in the cart
function displayLocationDetailsInCart(locationDetails) {
    // Create or update location details section in cart
    let locationSection = document.getElementById('cartLocationDetails');
    
    if (!locationSection) {
        locationSection = document.createElement('div');
        locationSection.id = 'cartLocationDetails';
        locationSection.className = 'cart-location-details';
        
        // Insert after cart items but before cart summary
        const cartItems = document.getElementById('cartItems');
        const cartSummary = document.querySelector('.cart-summary');
        
        if (cartItems && cartSummary) {
            cartItems.parentNode.insertBefore(locationSection, cartSummary);
        }
    }
    
    locationSection.innerHTML = `
        <div class="location-details-header">
            <i class="fas fa-map-marker-alt"></i>
            <h4> Delivery Location Details</h4>
        </div>
        <div class="location-details-content">
            <div class="location-detail-item">
                <span class="detail-label"> City:</span>
                <span class="detail-value">${escapeHtml(locationDetails.city)}</span>
            </div>
            <div class="location-detail-item">
                <span class="detail-label"> Road/Street:</span>
                <span class="detail-value">${escapeHtml(locationDetails.road)}</span>
            </div>
            ${locationDetails.suburb ? `
            <div class="location-detail-item">
                <span class="detail-label"> Suburb/Area:</span>
                <span class="detail-value">${escapeHtml(locationDetails.suburb)}</span>
            </div>
            ` : ''}
            <div class="location-detail-item">
                <span class="detail-label"> Nearest Infrastructure:</span>
                <span class="detail-value">${escapeHtml(locationDetails.infrastructure)}</span>
            </div>
            ${locationDetails.houseNumber ? `
            <div class="location-detail-item">
                <span class="detail-label"> House/Building:</span>
                <span class="detail-value">${escapeHtml(locationDetails.houseNumber)}</span>
            </div>
            ` : ''}
            <div class="location-detail-item">
                <span class="detail-label"> Country:</span>
                <span class="detail-value">${escapeHtml(locationDetails.country)}</span>
            </div>
            ${locationDetails.postcode ? `
            <div class="location-detail-item">
                <span class="detail-label"> Postcode:</span>
                <span class="detail-value">${escapeHtml(locationDetails.postcode)}</span>
            </div>
            ` : ''}
            <div class="location-distance-info">
                <span class="distance-label"> Distance from WIZA FOOD CAFE:</span>
                <span class="distance-value">${(calculateDistance(userLocation, restaurantLocation) / 1000).toFixed(1)} km</span>
            </div>
            ${locationDetails.fullAddress ? `
            <div class="location-full-address">
                <span class="detail-label"> Complete Address:</span>
                <span class="detail-value">${escapeHtml(locationDetails.fullAddress)}</span>
            </div>
            ` : ''}
        </div>
    `;
}

// NEW FUNCTION: Remove location details from cart
function removeLocationDetailsFromCart() {
    const locationSection = document.getElementById('cartLocationDetails');
    if (locationSection) {
        locationSection.remove();
    }
}

function saveDeliveryLocation() {
    const address = elements.ui.deliveryAddress.value.trim();
    const notes = elements.ui.deliveryNotes.value.trim();
    
    if (!address) {
        showNotification('Please enter a delivery address', CONSTANTS.NOTIFICATION.WARNING, 'warning');
        return;
    }
    
    const location = { address, notes, timestamp: new Date().toISOString() };
    
    const existingIndex = state.savedLocations.findIndex(loc => loc.address === address);
    
    if (existingIndex !== -1) {
        state.savedLocations[existingIndex] = location;
    } else {
        state.savedLocations.push(location);
    }
    
    state.deliveryLocation = location;
    
    localStorage.setItem(CONSTANTS.STORAGE_KEYS.DELIVERY_LOCATION, JSON.stringify(location));
    localStorage.setItem(CONSTANTS.STORAGE_KEYS.SAVED_LOCATIONS, JSON.stringify(state.savedLocations));
    
    updateSavedLocationsUI();
    
    showNotification('Delivery location saved! 📍', CONSTANTS.NOTIFICATION.SUCCESS, 'success');
    hideModal(elements.ui.locationModal);
}

function updateSavedLocationsUI() {
    const locationList = elements.ui.savedLocations.querySelector('.location-list');
    if (!locationList) return;
    
    if (state.savedLocations.length === 0) {
        locationList.innerHTML = '<p class="no-locations">No saved locations</p>';
        return;
    }
    
    locationList.innerHTML = state.savedLocations.map((location, index) => `
        <div class="saved-location ${state.deliveryLocation?.address === location.address ? 'selected' : ''}" data-index="${index}">
            <div class="location-info">
                <p class="location-address">${escapeHtml(location.address)}</p>
                ${location.notes ? `<p class="location-notes">${escapeHtml(location.notes)}</p>` : ''}
                <p class="location-saved">Saved ${formatDate(location.timestamp)}</p>
            </div>
            <button class="remove-location" data-index="${index}" aria-label="Remove location">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

function selectSavedLocation(index) {
    state.deliveryLocation = state.savedLocations[index];
    localStorage.setItem(CONSTANTS.STORAGE_KEYS.DELIVERY_LOCATION, JSON.stringify(state.deliveryLocation));
    updateSavedLocationsUI();
    showNotification('Delivery location selected! 📍', CONSTANTS.NOTIFICATION.SUCCESS, 'success');
}

function removeSavedLocation(index) {
    const removedLocation = state.savedLocations[index];
    state.savedLocations.splice(index, 1);
    
    if (state.deliveryLocation && state.deliveryLocation.address === removedLocation.address) {
        state.deliveryLocation = null;
        localStorage.removeItem(CONSTANTS.STORAGE_KEYS.DELIVERY_LOCATION);
    }
    
    localStorage.setItem(CONSTANTS.STORAGE_KEYS.SAVED_LOCATIONS, JSON.stringify(state.savedLocations));
    updateSavedLocationsUI();
    showNotification('Location removed', CONSTANTS.NOTIFICATION.WARNING, 'warning');
}

function handlePaymentFileUpload(e) {
    try {
        const file = e.target.files[0];
        if (!file) {
            showNotification('No file selected', CONSTANTS.NOTIFICATION.WARNING, 'warning');
            return;
        }

        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            showNotification('Please upload an image file (JPEG, PNG, GIF, WebP)', CONSTANTS.NOTIFICATION.ERROR, 'error');
            e.target.value = '';
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            showNotification('Image must be less than 5MB', CONSTANTS.NOTIFICATION.ERROR, 'error');
            e.target.value = '';
            return;
        }
        
        const preview = document.getElementById('paymentFilePreview');
        const fileName = document.getElementById('paymentFileName');
        const previewImage = document.getElementById('paymentPreviewImage');
        
        if (preview) preview.hidden = false;
        if (fileName) fileName.textContent = file.name;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            if (previewImage) previewImage.src = e.target.result;
        };
        reader.onerror = function() {
            showNotification('Error reading file', CONSTANTS.NOTIFICATION.ERROR, 'error');
            e.target.value = '';
        };
        reader.readAsDataURL(file);
        
        const submitBtn = document.getElementById('submitPaymentOrder');
        if (submitBtn) submitBtn.disabled = false;
        
    } catch (error) {
        console.error('Error handling file upload:', error);
        showNotification('Error uploading file', CONSTANTS.NOTIFICATION.ERROR, 'error');
        e.target.value = '';
    }
}

// Order Processing
function handleFileUpload(e) {
    const file = e.target.files[0];
    if (file) {
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            showNotification('Please upload an image file (JPEG, PNG, GIF, WebP)', CONSTANTS.NOTIFICATION.ERROR, 'error');
            elements.payment.screenshotUpload.value = '';
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            showNotification('Image must be less than 5MB', CONSTANTS.NOTIFICATION.ERROR, 'error');
            elements.payment.screenshotUpload.value = '';
            return;
        }
        
        if (elements.payment.fileName) elements.payment.fileName.textContent = file.name;
        if (elements.payment.submitOrder) elements.payment.submitOrder.disabled = false;
    }
}

// NEW FUNCTION: Update Firebase connection status
function updateFirebaseConnectionStatus() {
    const statusElement = document.getElementById('firebaseConnectionStatus');
    if (!statusElement) return;

    if (!window.firebaseDb) {
        statusElement.innerHTML = '<span style="color: #ff6b6b;"><i class="fas fa-wifi-slash"></i> Offline Mode</span>';
        statusElement.title = 'Orders saved locally only';
    } else {
        statusElement.innerHTML = '<span style="color: #51cf66;"><i class="fas fa-wifi"></i> Online</span>';
        statusElement.title = 'Orders synced with restaurant';
    }
}
// NEW FUNCTION: Enhanced Firebase error handling
function handleFirebaseError(error) {
    console.error('Firebase error:', error);
    
    switch (error.code) {
        case 'PERMISSION_DENIED':
            showNotification('Database access denied. Saving locally.', CONSTANTS.NOTIFICATION.WARNING, 'warning');
            break;
        case 'UNAVAILABLE':
            showNotification('Network unavailable. Saving locally.', CONSTANTS.NOTIFICATION.WARNING, 'warning');
            break;
        default:
            showNotification('Connection issue. Saving locally.', CONSTANTS.NOTIFICATION.WARNING, 'warning');
            break;
    }
}

// Update your Firebase initialization to include better error handling
function initializeFirebaseWithRetry() {
    if (!window.firebaseDb && !window.isOfflineMode) {
        console.log('Retrying Firebase connection...');
        setTimeout(initializeFirebase, 5000); // Retry after 5 seconds
    }
}

// Call this when the app starts
setInterval(initializeFirebaseWithRetry, 30000); // Check every 30 seconds
// Call this function periodically to update status
setInterval(updateFirebaseConnectionStatus, 10000);
// MODIFIED: Complete Order function with Firebase integration
// MODIFIED: Complete Order function with Firebase integration
function completeOrder() {
    try {
        // Check if payment screenshot is uploaded OR if user wants to proceed without it
        const screenshotUpload = document.getElementById('paymentScreenshotUpload');
        const hasScreenshot = screenshotUpload && screenshotUpload.files && screenshotUpload.files[0];
        
        if (!hasScreenshot) {
            // Ask user if they want to proceed without screenshot
            const proceed = confirm('No payment screenshot uploaded. Have you completed the Airtel Money payment? Press OK to continue or Cancel to upload screenshot.');
            if (!proceed) {
                showNotification('Please upload payment screenshot or complete payment', CONSTANTS.NOTIFICATION.WARNING, 'warning');
                return;
            }
        }
        
        // Validate other order requirements
        if (state.cart.length === 0) {
            showNotification('Your cart is empty!', CONSTANTS.NOTIFICATION.WARNING, 'warning');
            return;
        }
        
        if (!state.profile) {
            showNotification('Please create an account first!', CONSTANTS.NOTIFICATION.WARNING, 'warning');
            closePaymentModal();
            openProfileModal();
            return;
        }
        
        if (state.isDelivery && !state.deliveryLocation) {
            showNotification('Please select a delivery location', CONSTANTS.NOTIFICATION.WARNING, 'warning');
            closePaymentModal();
            openLocationModal();
            return;
        }

        // Show loading state
        showNotification('Processing your order...', CONSTANTS.NOTIFICATION.SUCCESS, 'success');
        
        const total = calculateTotal();
        const orderRef = `WIZA${state.orderCounter.toString().padStart(4, '0')}`;
        
        const order = {
            id: state.orderCounter,
            ref: orderRef,
            items: [...state.cart],
            subtotal: total.subtotal,
            deliveryFee: total.delivery,
            serviceFee: total.serviceFee,
            discount: total.discount,
            total: total.total,
            deposit: total.total, // 100% payment
            status: 'pending',
            date: new Date().toISOString(),
            delivery: state.isDelivery,
            deliveryLocation: state.isDelivery ? state.deliveryLocation : null,
            customer: {...state.profile},
            promoCode: state.promoCode,
            paymentMethod: 'Airtel Money',
            paymentScreenshot: hasScreenshot,
            airtelMoneyUsed: true,
            timestamp: Date.now(),
            // Add Firebase timestamp
            firebaseTimestamp: firebase.database.ServerValue.TIMESTAMP
        };
        
        // Save order to Firebase
        saveOrderToFirebase(order);
        
    } catch (error) {
        console.error('Error completing order:', error);
        showNotification('Error completing order. Please try again.', CONSTANTS.NOTIFICATION.ERROR, 'error');
    }
}

// NEW FUNCTION: Save order to Firebase
function saveOrderToFirebase(order) {
    // Check if Firebase is available
    if (!window.firebaseDb) {
        console.warn('Firebase not available, saving order locally only');
        saveOrderLocally(order);
        return;
    }

    try {
        // Show loading state
        const submitBtn = document.getElementById('submitPaymentOrder');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving Order...';
        }

        // Generate a unique key for the order
        const orderKey = `order_${Date.now()}_${order.id}`;
        
        // Save to Firebase
        const orderRef = window.firebaseDb.ref('orders/' + orderKey);
        
        orderRef.set(order)
            .then(() => {
                console.log('✅ Order saved to Firebase successfully:', orderKey);
                
                // Also save locally for offline access
                saveOrderLocally(order);
                
                // Show success message
                showNotification(`Order #${order.ref} placed successfully! ✅`, CONSTANTS.NOTIFICATION.SUCCESS, 'success');
                
                // Reset UI
                resetOrderUI();
                
            })
            .catch((error) => {
                console.error('❌ Error saving order to Firebase:', error);
                
                // Fallback: save locally only
                showNotification('Online save failed, saving order locally', CONSTANTS.NOTIFICATION.WARNING, 'warning');
                saveOrderLocally(order);
                
                // Still reset UI
                resetOrderUI();
            });

    } catch (error) {
        console.error('Error in Firebase save process:', error);
        // Fallback to local storage
        saveOrderLocally(order);
        resetOrderUI();
    }
}

// NEW FUNCTION: Save order locally (fallback)
function saveOrderLocally(order) {
    try {
        // Update order counter
        state.orderCounter++;
        localStorage.setItem(CONSTANTS.STORAGE_KEYS.ORDER_COUNTER, state.orderCounter.toString());
        
        // Save order to local state
        state.orders.unshift(order);
        localStorage.setItem(CONSTANTS.STORAGE_KEYS.ORDERS, JSON.stringify(state.orders));
        
        // Start order tracking simulation
        simulateOrderTracking(order.id);
        
    } catch (error) {
        console.error('Error saving order locally:', error);
        showNotification('Error saving order details', CONSTANTS.NOTIFICATION.ERROR, 'error');
    }
}

// NEW FUNCTION: Reset UI after order completion
function resetOrderUI() {
    // Clear cart and reset state
    state.cart = [];
    state.discount = 0;
    state.promoCode = null;
    
    // Update UI
    updateCartUI();
    updatePromoUI();
    
    // Close modal and reset
    closePaymentModal();
    selectDeliveryOption(false);
    
    // Reset payment file upload
    removePaymentFile();
    
    // Reset submit button
    const submitBtn = document.getElementById('submitPaymentOrder');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> Complete Order';
    }
}

// Add CSS for the Airtel Money payment interface
function addAirtelMoneyStyles() {
    const styles = `
        .airtel-payment-flow {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 20px;
            margin: 15px 0;
        }
        
        .payment-status {
            display: flex;
            flex-direction: column;
            gap: 15px;
            margin: 20px 0;
        }
        
        .status-step {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 12px;
            border-radius: 8px;
            background: white;
            border-left: 4px solid #e9ecef;
            transition: all 0.3s ease;
        }
        
        .status-step.active {
            border-left-color: #4CAF50;
            background: #f1f8e9;
        }
        
        .status-step.completed {
            border-left-color: #2196F3;
            background: #e3f2fd;
        }
        
        .step-number {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: #e9ecef;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
        }
        
        .status-step.active .step-number {
            background: #4CAF50;
            color: white;
        }
        
        .status-step.completed .step-number {
            background: #2196F3;
            color: white;
        }
        
        .step-info strong {
            display: block;
            margin-bottom: 4px;
            color: #333;
        }
        
        .step-info p {
            margin: 0;
            color: #666;
            font-size: 0.9em;
        }
        
        .ussd-code-display {
            margin: 20px 0;
        }
        
        .ussd-code-display label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #333;
        }
        
        .ussd-code {
            display: flex;
            align-items: center;
            gap: 10px;
            background: #333;
            color: white;
            padding: 12px 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 1.1em;
        }
        
        .ussd-code code {
            flex: 1;
        }
        
        .copy-btn {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 8px;
            border-radius: 4px;
            cursor: pointer;
            transition: background 0.3s;
        }
        
        .copy-btn:hover {
            background: rgba(255,255,255,0.3);
        }
        
        .payment-details-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 10px;
            margin: 20px 0;
        }
        
        .payment-detail {
            display: flex;
            justify-content: space-between;
            padding: 10px;
            background: white;
            border-radius: 6px;
            border: 1px solid #e9ecef;
        }
        
        .detail-label {
            font-weight: 600;
            color: #555;
        }
        
        .detail-value {
            color: #333;
            font-weight: 600;
        }
        
        .payment-help {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            padding: 12px;
            margin-top: 15px;
        }
        
        .payment-help p {
            margin: 0;
            color: #856404;
            font-size: 0.9em;
        }
        
        .manual-dial-instructions {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin: 15px 0;
            border: 2px solid #e9ecef;
        }
        
        .manual-dial-instructions ol {
            margin: 15px 0;
            padding-left: 20px;
        }
        
        .manual-dial-instructions li {
            margin-bottom: 8px;
            color: #555;
        }
        
        @media (max-width: 480px) {
            .ussd-code {
                font-size: 0.9em;
                padding: 10px;
            }
            
            .status-step {
                padding: 10px;
            }
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// Add this function to remove payment file
function removePaymentFile() {
    const uploadInput = document.getElementById('paymentScreenshotUpload');
    const preview = document.getElementById('paymentFilePreview');
    
    if (uploadInput) uploadInput.value = '';
    if (preview) preview.hidden = true;
    
    document.getElementById('submitPaymentOrder').disabled = true;
}

function handlePaymentFileUpload(e) {
    try {
        const file = e.target.files[0];
        if (!file) {
            showNotification('No file selected', CONSTANTS.NOTIFICATION.WARNING, 'warning');
            return;
        }

        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            showNotification('Please upload an image file (JPEG, PNG, GIF, WebP)', CONSTANTS.NOTIFICATION.ERROR, 'error');
            e.target.value = '';
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            showNotification('Image must be less than 5MB', CONSTANTS.NOTIFICATION.ERROR, 'error');
            e.target.value = '';
            return;
        }
        
        const preview = document.getElementById('paymentFilePreview');
        const fileName = document.getElementById('paymentFileName');
        const previewImage = document.getElementById('paymentPreviewImage');
        
        if (preview) preview.hidden = false;
        if (fileName) fileName.textContent = file.name;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            if (previewImage) previewImage.src = e.target.result;
        };
        reader.onerror = function() {
            showNotification('Error reading file', CONSTANTS.NOTIFICATION.ERROR, 'error');
            e.target.value = '';
        };
        reader.readAsDataURL(file);
        
        const submitBtn = document.getElementById('submitPaymentOrder') || elements.payment.submitOrder;
        if (submitBtn) submitBtn.disabled = false;
        
    } catch (error) {
        console.error('Error handling file upload:', error);
        showNotification('Error uploading file', CONSTANTS.NOTIFICATION.ERROR, 'error');
        e.target.value = '';
    }
}

// Promo Code Functions
function applyPromoCode() {
    const code = elements.ui.promoCode.value.trim().toUpperCase();
    
    if (!code) {
        showNotification('Please enter a promo code', CONSTANTS.NOTIFICATION.WARNING, 'warning');
        return;
    }
    
    const promo = CONSTANTS.PROMO_CODES[code];
    
    if (!promo) {
        showNotification('Invalid promo code', CONSTANTS.NOTIFICATION.ERROR, 'error');
        return;
    }
    
    const total = calculateTotal();
    
    if (total.subtotal < promo.minOrder) {
        showNotification(`Minimum order of K${promo.minOrder} required for this promo`, CONSTANTS.NOTIFICATION.WARNING, 'warning');
        return;
    }
    
    let discount = 0;
    
    if (promo.type === 'percentage') {
        discount = total.subtotal * (promo.discount / 100);
    } else if (promo.type === 'fixed') {
        discount = promo.discount;
    }
    
    if (promo.freeDelivery && state.isDelivery) {
        state.deliveryFee = 0;
    }
    
    state.discount = discount;
    state.promoCode = code;
    
    updateCartUI();
    updatePromoUI();
    
    showNotification(`Promo code applied! Saved K${discount.toFixed(2)} 💰`, CONSTANTS.NOTIFICATION.SUCCESS, 'success');
}

function removePromoCode() {
    state.discount = 0;
    state.promoCode = null;
    
    if (state.isDelivery) {
        state.deliveryFee = window.deliveryInfo ? window.deliveryInfo.charge : CONSTANTS.DELIVERY_FEE;
    }
    
    updateCartUI();
    updatePromoUI();
    
    showNotification('Promo code removed', CONSTANTS.NOTIFICATION.WARNING, 'warning');
}

function updatePromoUI() {
    if (state.promoCode) {
        if (elements.ui.appliedPromoCode) elements.ui.appliedPromoCode.textContent = state.promoCode;
        if (elements.ui.promoApplied) elements.ui.promoApplied.hidden = false;
        if (elements.ui.promoCode) elements.ui.promoCode.value = '';
    } else {
        if (elements.ui.promoApplied) elements.ui.promoApplied.hidden = true;
    }
}

// Quick Order Functions
function quickOrderByCategory(category) {
    const popularItems = Array.from(document.querySelectorAll(`#${category} .food-card[data-popular="true"]`))
        .slice(0, 3);
    
    if (popularItems.length === 0) {
        showNotification('No popular items in this category', CONSTANTS.NOTIFICATION.WARNING, 'warning');
        return;
    }
    
    popularItems.forEach(item => {
        const addButton = item.querySelector('.add-btn');
        if (addButton) {
            addToCart(addButton);
        }
    });
    
    hideModal(elements.ui.quickOrderModal);
    openCart();
    
    showNotification('Popular items added to cart! 🛒', CONSTANTS.NOTIFICATION.SUCCESS, 'success');
}

function reorderLast() {
    if (state.orders.length === 0) {
        showNotification('No previous orders found', CONSTANTS.NOTIFICATION.WARNING, 'warning');
        return;
    }
    
    const lastOrder = state.orders[0];
    
    state.cart = [];
    
    lastOrder.items.forEach(item => {
        state.cart.push({...item});
    });
    
    selectDeliveryOption(lastOrder.delivery);
    
    updateCartUI();
    hideModal(elements.ui.quickOrderModal);
    openCart();
    
    showNotification('Last order added to cart! 🔄', CONSTANTS.NOTIFICATION.SUCCESS, 'success');
}

function loadPopularItems() {
    const popularItems = Array.from(document.querySelectorAll('.food-card[data-popular="true"]'))
        .slice(0, 6);
    
    if (elements.ui.popularItemsGrid) {
        elements.ui.popularItemsGrid.innerHTML = popularItems.map(card => {
            const addButton = card.querySelector('.add-btn');
            if (!addButton) return '';
            
            const id = parseInt(addButton.dataset.id);
            const name = addButton.dataset.name;
            const price = parseFloat(addButton.dataset.price);
            const image = addButton.dataset.image || 'default-food.jpg';
            
            return `
                <article class="food-card compact">
                    <div class="food-image" style="background-image: url('${image}');" role="img" aria-label="${escapeHtml(name)}">
                        <span class="food-rating">${card.querySelector('.food-rating')?.textContent || '4.5'} <i class="fas fa-star"></i></span>
                    </div>
                    <div class="food-details">
                        <h3 class="food-title">${escapeHtml(name)}</h3>
                        <div class="food-meta">
                            <div class="price-container">
                                <p class="food-price">K${price.toFixed(2)}</p>
                            </div>
                            <button class="add-btn" data-id="${id}" data-name="${escapeHtml(name)}" data-price="${price}" data-image="${image}">
                                <i class="fas fa-plus"></i> Add
                            </button>
                        </div>
                    </div>
                </article>
            `;
        }).join('');
    }
}

// Recently Viewed Functions
function addToRecentlyViewed(id) {
    const existingIndex = state.recentlyViewed.findIndex(item => item.id === id);
    
    if (existingIndex !== -1) {
        state.recentlyViewed.splice(existingIndex, 1);
    }
    
    const card = document.querySelector(`.add-btn[data-id="${id}"]`)?.closest('.food-card');
    if (!card) return;
    
    const addButton = card.querySelector('.add-btn');
    if (!addButton) return;
    
    const name = addButton.dataset.name;
    const price = parseFloat(addButton.dataset.price);
    const image = addButton.dataset.image || 'default-food.jpg';
    
    state.recentlyViewed.unshift({ id, name, price, image });
    
    if (state.recentlyViewed.length > 6) {
        state.recentlyViewed.pop();
    }
    
    localStorage.setItem(CONSTANTS.STORAGE_KEYS.RECENTLY_VIEWED, JSON.stringify(state.recentlyViewed));
    loadRecentlyViewed();
}

function loadRecentlyViewed() {
    if (state.recentlyViewed.length === 0) {
        if (elements.ui.recentlyViewed) elements.ui.recentlyViewed.hidden = true;
        return;
    }
    
    if (elements.ui.recentlyViewed) elements.ui.recentlyViewed.hidden = false;
    if (elements.ui.recentItemsGrid) {
        elements.ui.recentItemsGrid.innerHTML = state.recentlyViewed.map(item => `
            <article class="food-card compact">
                <div class="food-image" style="background-image: url('${item.image}');" role="img" aria-label="${escapeHtml(item.name)}">
                    <button class="wishlist-btn" aria-label="Add to favorites" data-id="${item.id}">
                        <i class="${state.wishlist.some(w => w.id === item.id) ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                </div>
                <div class="food-details">
                    <h3 class="food-title">${escapeHtml(item.name)}</h3>
                    <div class="food-meta">
                        <div class="price-container">
                            <p class="food-price">K${item.price.toFixed(2)}</p>
                        </div>
                        <button class="add-btn" data-id="${item.id}" data-name="${escapeHtml(item.name)}" data-price="${item.price}" data-image="${item.image}">
                            <i class="fas fa-plus"></i> Add
                        </button>
                        </div>
                    </div>
                </article>
            `).join('');
    }
}

// Chat Functions
function loadChatMessages() {
    if (!elements.ui.chatMessages) return;
    
    elements.ui.chatMessages.innerHTML = state.chatMessages.map(msg => `
        <div class="message ${msg.sender}">
            <p>${escapeHtml(msg.message)}</p>
            <span class="message-time">${formatTime(msg.time)}</span>
        </div>
    `).join('');
    
    elements.ui.chatMessages.scrollTop = elements.ui.chatMessages.scrollHeight;
}

function sendChatMessage() {
    const message = elements.ui.chatInput.value.trim();
    
    if (!message) return;
    
    const userMessage = {
        sender: 'user',
        message: message,
        time: new Date().toISOString()
    };
    
    state.chatMessages.push(userMessage);
    localStorage.setItem(CONSTANTS.STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(state.chatMessages));
    
    if (elements.ui.chatInput) elements.ui.chatInput.value = '';
    
    loadChatMessages();
    
    setTimeout(() => {
        const botResponse = generateBotResponse(message);
        state.chatMessages.push(botResponse);
        localStorage.setItem(CONSTANTS.STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(state.chatMessages));
        loadChatMessages();
    }, 1000 + Math.random() * 2000);
}

function generateBotResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
        return {
            sender: 'bot',
            message: 'Hello! How can I help you today?',
            time: new Date().toISOString()
        };
    } else if (lowerMessage.includes('menu') || lowerMessage.includes('what do you have')) {
        return {
            sender: 'bot',
            message: 'We have a variety of delicious options! Quick Fills, Savory Bites, Snacks & Treats, Light & Fresh meals, and special Promotions. What are you craving?',
            time: new Date().toISOString()
        };
    } else if (lowerMessage.includes('delivery') || lowerMessage.includes('deliver')) {
        return {
            sender: 'bot',
            message: 'We offer delivery with a K25 fee for orders under K100. Orders above K100 get free delivery! You can set your delivery location in the app.',
            time: new Date().toISOString()
        };
    } else if (lowerMessage.includes('promo') || lowerMessage.includes('discount')) {
        return {
            sender: 'bot',
            message: 'We have several promotions! Use WIZA20 for 20% off your first order. WIZA10 gives 10% off orders above K50. FREESHIP gives free delivery on orders above K100.',
            time: new Date().toISOString()
        };
    } else if (lowerMessage.includes('hours') || lowerMessage.includes('open')) {
        return {
            sender: 'bot',
            message: 'We\'re open Monday to Saturday from 8:00 AM to 10:00 PM, and Sunday from 9:00 AM to 8:00 PM.',
            time: new Date().toISOString()
        };
    } else if (lowerMessage.includes('payment') || lowerMessage.includes('pay')) {
        return {
            sender: 'bot',
            message: 'We accept Airtel Money payments. The full amount is required when ordering.',
            time: new Date().toISOString()
        };
    } else if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
        return {
            sender: 'bot',
            message: 'You\'re welcome! Is there anything else I can help you with?',
            time: new Date().toISOString()
        };
    } else {
        return {
            sender: 'bot',
            message: 'I\'m here to help! You can ask me about our menu, delivery options, promotions, or operating hours.',
            time: new Date().toISOString()
        };
    }
}

// Orders Management
function loadOrders() {
    if (state.orders.length === 0) {
        if (elements.orders.noOrdersMsg) elements.orders.noOrdersMsg.style.display = 'block';
        if (elements.orders.list) elements.orders.list.innerHTML = '';
    } else {
        if (elements.orders.noOrdersMsg) elements.orders.noOrdersMsg.style.display = 'none';
        if (elements.orders.list) {
            elements.orders.list.innerHTML = state.orders.map(order => `
                <div class="order-item">
                    <div class="order-header">
                        <h4>Order #${order.ref}</h4>
                        <span class="status status-${order.status}">${order.status}</span>
                    </div>
                    <p class="order-date">${new Date(order.date).toLocaleDateString()}</p>
                    <p class="order-total">Total: K${order.total.toFixed(2)}</p>
                    <p class="order-items">${order.items.length} item${order.items.length !== 1 ? 's' : ''}</p>
                    <button class="view-order-btn" data-id="${order.id}">View Details</button>
                </div>
            `).join('');
            
            document.querySelectorAll('.view-order-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = parseInt(btn.dataset.id);
                    viewOrderDetails(id);
                });
            });
        }
    }
}

function filterOrders(status) {
    elements.orders.filterButtons.forEach(btn => btn.classList.remove('active'));
    const statusButton = document.querySelector(`[data-status="${status}"]`);
    if (statusButton) statusButton.classList.add('active');
    
    if (status === 'all') {
        loadOrders();
        return;
    }
    
    const filteredOrders = state.orders.filter(order => order.status === status);
    
    if (filteredOrders.length === 0) {
        if (elements.orders.noOrdersMsg) elements.orders.noOrdersMsg.style.display = 'block';
        if (elements.orders.list) elements.orders.list.innerHTML = '';
    } else {
        if (elements.orders.noOrdersMsg) elements.orders.noOrdersMsg.style.display = 'none';
        if (elements.orders.list) {
            elements.orders.list.innerHTML = filteredOrders.map(order => `
                <div class="order-item">
                    <div class="order-header">
                        <h4>Order #${order.ref}</h4>
                        <span class="status status-${order.status}">${order.status}</span>
                    </div>
                    <p class="order-date">${new Date(order.date).toLocaleDateString()}</p>
                    <p class="order-total">Total: K${order.total.toFixed(2)}</p>
                    <p class="order-items">${order.items.length} item${order.items.length !== 1 ? 's' : ''}</p>
                    <button class="view-order-btn" data-id="${order.id}">View Details</button>
                </div>
            `).join('');
            
            document.querySelectorAll('.view-order-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = parseInt(btn.dataset.id);
                    viewOrderDetails(id);
                });
            });
        }
    }
}

function viewOrderDetails(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) {
        showNotification('Order not found', CONSTANTS.NOTIFICATION.WARNING, 'warning');
        return;
    }
    
    const orderDetails = document.createElement('div');
    orderDetails.className = 'order-details';
    orderDetails.innerHTML = `
        <h3>Order #${order.ref}</h3>
        <div class="detail-row">
            <span class="detail-label">Date:</span>
            <span class="detail-value">${new Date(order.date).toLocaleString()}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Status:</span>
            <span class="status status-${order.status}">${order.status}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Delivery Method:</span>
            <span class="detail-value">${order.delivery ? 'Delivery' : 'Self Pickup'}</span>
        </div>
        
        ${order.delivery && order.deliveryLocation ? `
        <div class="detail-row">
            <span class="detail-label">Delivery Address:</span>
            <span class="detail-value">${escapeHtml(order.deliveryLocation.address)}</span>
        </div>
        ${order.deliveryLocation.notes ? `
        <div class="detail-row">
            <span class="detail-label">Delivery Notes:</span>
            <span class="detail-value">${escapeHtml(order.deliveryLocation.notes)}</span>
        </div>
        ` : ''}
        ` : ''}
        
        <h4>Order Items</h4>
        <div class="order-items-list">
            ${order.items.map(item => {
                const toppingsText = item.toppings && item.toppings.length > 0 
                    ? `<p class="item-toppings">Extras: ${item.toppings.join(', ')}</p>` 
                    : '';
                
                const instructionsText = item.instructions 
                    ? `<p class="item-instructions">Instructions: ${escapeHtml(item.instructions)}</p>` 
                    : '';
                
                return `
                    <div class="order-item-detail">
                        <img src="${item.image}" alt="${escapeHtml(item.name)}" class="order-item-image" onerror="this.src='default-food.jpg'">
                        <div class="item-info">
                            <span class="item-name">${escapeHtml(item.name)}</span>
                            ${toppingsText}
                            ${instructionsText}
                        </div>
                        <span class="item-quantity">× ${item.quantity}</span>
                        <span class="item-price">K${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                `;
            }).join('')}
        </div>
        
        <div class="order-summary">
            <div class="summary-row">
                <span>Subtotal:</span>
                <span>K${order.subtotal.toFixed(2)}</span>
            </div>
            ${order.delivery ? `
            <div class="summary-row">
                <span>Delivery Fee:</span>
                <span>K${order.deliveryFee.toFixed(2)}</span>
            </div>
            ` : ''}
            <div class="summary-row">
                <span>Service Fee:</span>
                <span>K${order.serviceFee.toFixed(2)}</span>
            </div>
            ${order.discount > 0 ? `
            <div class="summary-row discount">
                <span>Discount:</span>
                <span>-K${order.discount.toFixed(2)}</span>
            </div>
            ` : ''}
            <div class="summary-row total">
                <span>Total:</span>
                <span>K${order.total.toFixed(2)}</span>
            </div>
            <div class="summary-row">
                <span>Amount Paid:</span>
                <span>K${order.deposit.toFixed(2)}</span>
            </div>
        </div>
        
        <h4>Customer Information</h4>
        <div class="customer-info">
            <p>${escapeHtml(order.customer.name)}</p>
            <p>${escapeHtml(order.customer.email)}</p>
            <p>${escapeHtml(order.customer.phone)}</p>
        </div>
        
        ${order.promoCode ? `
        <div class="detail-row">
            <span class="detail-label">Promo Code:</span>
            <span class="detail-value">${order.promoCode}</span>
        </div>
        ` : ''}
    `;
    
    if (elements.orders.list) {
        elements.orders.list.innerHTML = '';
        elements.orders.list.appendChild(orderDetails);
        
        const backButton = document.createElement('button');
        backButton.textContent = 'Back to Orders';
        backButton.className = 'back-btn';
        backButton.addEventListener('click', loadOrders);
        elements.orders.list.appendChild(backButton);
        
        const trackButton = document.createElement('button');
        trackButton.textContent = 'Track Order';
        trackButton.className = 'track-btn';
        trackButton.addEventListener('click', () => trackOrder(orderId));
        elements.orders.list.appendChild(trackButton);
    }
}

function trackOrder(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;
    
    const orderDate = new Date(order.date);
    
    if (elements.tracking.receivedTime) elements.tracking.receivedTime.textContent = orderDate.toLocaleTimeString();
    
    if (order.status === 'pending') {
        if (elements.tracking.preparingTime) elements.tracking.preparingTime.textContent = 'Pending';
        if (elements.tracking.readyTime) elements.tracking.readyTime.textContent = 'Pending';
        if (elements.tracking.deliveryTime) elements.tracking.deliveryTime.textContent = 'Pending';
        if (elements.tracking.deliveredTime) elements.tracking.deliveredTime.textContent = 'Pending';
    } else if (order.status === 'preparing') {
        const preparingTime = new Date(orderDate.getTime() + 5 * 600);
        if (elements.tracking.preparingTime) elements.tracking.preparingTime.textContent = preparingTime.toLocaleTimeString();
        if (elements.tracking.readyTime) elements.tracking.readyTime.textContent = 'Preparing';
        if (elements.tracking.deliveryTime) elements.tracking.deliveryTime.textContent = 'Pending';
        if (elements.tracking.deliveredTime) elements.tracking.deliveredTime.textContent = 'Pending';
    } else if (order.status === 'ready') {
        const preparingTime = new Date(orderDate.getTime() + 5 * 600);
        const readyTime = new Date(orderDate.getTime() + 15 * 600);
        if (elements.tracking.preparingTime) elements.tracking.preparingTime.textContent = preparingTime.toLocaleTimeString();
        if (elements.tracking.readyTime) elements.tracking.readyTime.textContent = readyTime.toLocaleTimeString();
        if (elements.tracking.deliveryTime) elements.tracking.deliveryTime.textContent = order.delivery ? 'On the way' : 'Ready for pickup';
        if (elements.tracking.deliveredTime) elements.tracking.deliveredTime.textContent = 'Pending';
    } else if (order.status === 'completed') {
        const preparingTime = new Date(orderDate.getTime() + 5 * 600);
        const readyTime = new Date(orderDate.getTime() + 15 * 600);
        const deliveryTime = new Date(orderDate.getTime() + 25 * 600);
        const deliveredTime = new Date(orderDate.getTime() + 35 * 600);
        if (elements.tracking.preparingTime) elements.tracking.preparingTime.textContent = preparingTime.toLocaleTimeString();
        if (elements.tracking.readyTime) elements.tracking.readyTime.textContent = readyTime.toLocaleTimeString();
        if (elements.tracking.deliveryTime) elements.tracking.deliveryTime.textContent = deliveryTime.toLocaleTimeString();
        if (elements.tracking.deliveredTime) elements.tracking.deliveredTime.textContent = deliveredTime.toLocaleTimeString();
    }
    
    if (order.status === 'pending' || order.status === 'preparing') {
        if (elements.tracking.orderEta) elements.tracking.orderEta.textContent = '30-40 minutes';
    } else if (order.status === 'ready') {
        if (elements.tracking.orderEta) elements.tracking.orderEta.textContent = order.delivery ? '10-15 minutes' : 'Ready for pickup';
    } else {
        if (elements.tracking.orderEta) elements.tracking.orderEta.textContent = 'Delivered';
    }
    
    if (elements.tracking.modal) {
        const steps = elements.tracking.modal.querySelectorAll('.tracking-step');
        steps.forEach((step, index) => {
            step.classList.remove('active', 'completed');
            
            if (order.status === 'pending' && index === 0) {
                step.classList.add('active');
            } else if (order.status === 'preparing' && index <= 1) {
                step.classList.add(index === 1 ? 'active' : 'completed');
            } else if (order.status === 'ready' && index <= 2) {
                step.classList.add(index === 2 ? 'active' : 'completed');
            } else if (order.status === 'completed') {
                step.classList.add('completed');
            }
        });
    }
    
    showModal(elements.tracking.modal);
}

function simulateOrderTracking(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;
    
    setTimeout(() => {
        order.status = 'preparing';
        localStorage.setItem(CONSTANTS.STORAGE_KEYS.ORDERS, JSON.stringify(state.orders));
        showNotification(`Order #${order.ref} is now being prepared! 👨‍🍳`, CONSTANTS.NOTIFICATION.SUCCESS, 'success');
    }, 30);
    
    setTimeout(() => {
        order.status = 'ready';
        localStorage.setItem(CONSTANTS.STORAGE_KEYS.ORDERS, JSON.stringify(state.orders));
        showNotification(`Order #${order.ref} is ready! ${order.delivery ? 'Out for delivery soon!' : 'Ready for pickup!'} 🎉`, CONSTANTS.NOTIFICATION.SUCCESS, 'success');
    }, 90);
    
    if (order.delivery) {
        setTimeout(() => {
            order.status = 'completed';
            localStorage.setItem(CONSTANTS.STORAGE_KEYS.ORDERS, JSON.stringify(state.orders));
            showNotification(`Order #${order.ref} has been delivered! Enjoy your meal! 🍽️`, CONSTANTS.NOTIFICATION.SUCCESS, 'success');
        }, 21);
    }
}

// Profile Management
function loadProfile() {
    if (!elements.profile.info) return;
    
    if (state.profile) {
        elements.profile.info.innerHTML = `
            <div class="profile-details">
                <p><strong>Name:</strong> ${escapeHtml(state.profile.name)}</p>
                <p><strong>Email:</strong> ${escapeHtml(state.profile.email)}</p>
                <p><strong>Phone:</strong> ${escapeHtml(state.profile.phone)}</p>
            </div>
            <button class="edit-profile-btn" id="editProfileBtn">Edit Profile</button>
        `;
        
        if (elements.profile.totalOrders) elements.profile.totalOrders.textContent = state.orders.length;
        if (elements.profile.favoriteItems) elements.profile.favoriteItems.textContent = state.wishlist.length;
        if (elements.profile.memberSince) elements.profile.memberSince.textContent = new Date().getFullYear();
        
        document.getElementById('editProfileBtn')?.addEventListener('click', showAccountForm);
    } else {
        elements.profile.info.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-circle"></i>
                <h3>No account found</h3>
                <p>Create an account to place orders</p>
                <button class="create-account-btn" id="createAccountBtn">Create Account</button>
            </div>
        `;
        document.getElementById('createAccountBtn')?.addEventListener('click', showAccountForm);
    }
}

function showAccountForm() {
    if (state.profile) {
        if (document.getElementById('name')) document.getElementById('name').value = state.profile.name;
        if (document.getElementById('email')) document.getElementById('email').value = state.profile.email;
        if (document.getElementById('phone')) document.getElementById('phone').value = state.profile.phone;
    }
    
    if (elements.profile.accountForm) elements.profile.accountForm.hidden = false;
    if (elements.profile.info) elements.profile.info.hidden = true;
}

function saveProfile(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    
    if (!name || !email || !phone) {
        showNotification('Please fill all fields', CONSTANTS.NOTIFICATION.WARNING, 'warning');
        return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showNotification('Please enter a valid email address', CONSTANTS.NOTIFICATION.WARNING, 'warning');
        return;
    }
    
    state.profile = { name, email, phone };
    localStorage.setItem(CONSTANTS.STORAGE_KEYS.PROFILE, JSON.stringify(state.profile));
    loadProfile();
    
    if (elements.profile.accountForm) elements.profile.accountForm.hidden = true;
    if (elements.profile.info) elements.profile.info.hidden = false;
    
    showNotification('Profile saved successfully! ✅', CONSTANTS.NOTIFICATION.SUCCESS, 'success');
}

// Offers Banner
function initOffersBanner() {
    if (!elements.ui.offersBanner) return;
    
    const slides = elements.ui.offersBanner.querySelectorAll('.offer-slide');
    const prevBtn = elements.ui.offersBanner.querySelector('.offer-prev');
    const nextBtn = elements.ui.offersBanner.querySelector('.offer-next');
    
    let currentSlide = 0;
    
    function showSlide(index) {
        slides.forEach(slide => slide.classList.remove('active'));
        slides[index].classList.add('active');
    }
    
    function nextSlide() {
        currentSlide = (currentSlide + 1) % slides.length;
        showSlide(currentSlide);
    }
    
    function prevSlide() {
        currentSlide = (currentSlide - 1 + slides.length) % slides.length;
        showSlide(currentSlide);
    }
    
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);
    
    setInterval(nextSlide, 5000);
}

// Utility Functions
function showNotification(message, duration = 3000, type = 'info') {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) document.body.removeChild(existingNotification);
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Create the proper HTML structure that matches your CSS
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">
                ${getNotificationIcon(type)}
            </div>
            <div class="notification-message">${message}</div>
            <button class="notification-close">×</button>
        </div>
        <div class="notification-progress"></div>
    `;
    
    document.body.appendChild(notification);
    
    // Add close button functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(notification)) document.body.removeChild(notification);
        }, 300);
    });
    
    setTimeout(() => notification.classList.add('show'), 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(notification)) document.body.removeChild(notification);
        }, 300);
    }, duration);
}

// Helper function to get appropriate icons for each notification type
function getNotificationIcon(type) {
    const icons = {
        'success': '✓',
        'cart': '🛒',
        'wishlist': '❤️',
        'order': '📦',
        'favorite': '⭐',
        'info': 'ℹ️',
        'error': '⚠️',
        'warning': '⚠️'
    };
    return icons[type] || 'ℹ️';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return 'today';
    } else if (diffDays === 1) {
        return 'yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString();
    }
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
// Add this CSS for the location permission popup
function addLocationPermissionStyles() {
    const styles = `
        .location-permission-modal {
            max-width: 480px;
            margin: 20px auto;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        
        .location-permission-content {
            text-align: center;
            padding: 10px;
        }
        
        .location-permission-logo {
            margin-bottom: 20px;
        }
        
        .location-permission-logo img {
            border-radius: 16px;
            box-shadow: 0 8px 24px rgba(76, 175, 80, 0.3);
            border: 3px solid #4CAF50;
        }
        
        .location-permission-content h2 {
            margin: 0 0 15px 0;
            font-size: 1.5rem;
            color: #333;
            font-weight: 700;
            line-height: 1.3;
        }
        
        .location-permission-text {
            color: #666;
            line-height: 1.5;
            margin-bottom: 25px;
            font-size: 0.95rem;
        }
        
        .location-permission-features {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 25px;
            border: 1px solid #e9ecef;
        }
        
        .feature-item {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
            text-align: left;
        }
        
        .feature-item:last-child {
            margin-bottom: 0;
        }
        
        .feature-item i {
            color: #4CAF50;
            font-size: 1.1rem;
            width: 20px;
            text-align: center;
        }
        
        .feature-item span {
            color: #555;
            font-size: 0.9rem;
            font-weight: 500;
        }
        
        .location-permission-actions {
            display: flex;
            gap: 12px;
            margin-bottom: 15px;
        }
        
        .location-permission-actions .btn-primary,
        .location-permission-actions .btn-secondary {
            flex: 1;
            padding: 14px 20px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 0.95rem;
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        .location-permission-actions .btn-primary {
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
        }
        
        .location-permission-actions .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
        }
        
        .location-permission-actions .btn-secondary {
            background: #f8f9fa;
            color: #666;
            border: 2px solid #e9ecef;
        }
        
        .location-permission-actions .btn-secondary:hover {
            background: #e9ecef;
            color: #555;
        }
        
        .location-permission-note {
            font-size: 0.8rem;
            color: #999;
            margin: 0;
        }
        
        /* Animation for modal appearance */
        @keyframes modalSlideIn {
            from {
                opacity: 0;
                transform: translateY(-50px) scale(0.9);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
        
        .location-permission-modal.active {
            animation: modalSlideIn 0.4s ease-out;
        }
        
        /* Responsive design */
        @media (max-width: 480px) {
            .location-permission-modal {
                margin: 10px;
                max-width: none;
            }
            
            .location-permission-actions {
                flex-direction: column;
            }
            
            .location-permission-content h2 {
                font-size: 1.3rem;
            }
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// Initialize any additional UI components
function initUI() {
    document.addEventListener('click', (e) => {
        if (e.target.matches('button[data-loading]')) {
            const button = e.target;
            const originalText = button.innerHTML;
            button.innerHTML = '<div class="button-spinner"></div> Loading...';
            button.disabled = true;
            
            setTimeout(() => {
                button.innerHTML = originalText;
                button.disabled = false;
            }, 2000);
        }
    });
    
    if ('IntersectionObserver' in window) {
        const lazyImages = document.querySelectorAll('[data-src]');
        
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        lazyImages.forEach(img => imageObserver.observe(img));
    }
}

// Setup modal events for dynamically created modals
function setupModalEvents(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => hideModal(modal));
    }
}

function showLocationPopup() {
    showRestaurantMapModal();
}

// Update cart summary function
function updateCartSummary() {
    updateCartUI();
}

// NEW FUNCTION: Show location popup (if needed elsewhere)
function showLocationPopup() {
    showRestaurantMapModal();
}

// Initialize UI when DOM is fully loaded
function initUI() {
    document.addEventListener('click', (e) => {
        if (e.target.matches('button[data-loading]')) {
            const button = e.target;
            const originalText = button.innerHTML;
            button.innerHTML = '<div class="button-spinner"></div> Loading...';
            button.disabled = true;
            
            setTimeout(() => {
                button.innerHTML = originalText;
                button.disabled = false;
            }, 2000);
        }
    });
    
    if ('IntersectionObserver' in window) {
        const lazyImages = document.querySelectorAll('[data-src]');
        
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        lazyImages.forEach(img => imageObserver.observe(img));
    }
}

// Setup modal events for dynamically created modals
function setupModalEvents(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => hideModal(modal));
    }
}

// Initialize UI when DOM is fully loaded
document.addEventListener('DOMContentLoaded', initUI);

// Export functions for global access if needed
window.requestLocationPermission = requestLocationPermission;
window.showPickupMap = showPickupMap;
window.updateDeliveryMethod = updateDeliveryMethod;
window.testCheckoutFlow = testCheckoutFlow;
window.startBackgroundNotifications = startBackgroundNotifications;
window.showPermissionStatus = showPermissionStatus;







