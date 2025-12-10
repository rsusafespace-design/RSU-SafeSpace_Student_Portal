// firebase-messaging-sw.js
// Service worker for Firebase Cloud Messaging

importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');

// Firebase config (same as in firebase_config.js)
const firebaseConfig = {
  apiKey: "AIzaSyD4eMHzsieWnIH6nHLgBl1PDTiIETeVmnA",
  authDomain: "rsu-safespace.firebaseapp.com",
  databaseURL: "https://rsu-safespace-default-rtdb.firebaseio.com",
  projectId: "rsu-safespace",
  storageBucket: "rsu-safespace.firebasestorage.app",
  messagingSenderId: "490237933031",
  appId: "1:490237933031:web:0d17829f4359da952db942",
  measurementId: "G-YY33W1QM2N"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message ', payload);

  const notificationTitle = payload.notification.title || 'SafeSpace';
  const notificationOptions = {
    body: payload.notification.body || 'You have a new notification',
    icon: payload.notification.icon || '/safespace.png',
    badge: '/safespace.png',
    tag: payload.data?.tag || 'default',
    requireInteraction: true
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Optional: Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received.');

  event.notification.close();

  // This looks to see if the current is already open and focuses if it is
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let client of windowClients) {
        if (client.url.includes('index.html') && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window/tab with the target URL
      if (clients.openWindow) {
        return clients.openWindow('/index.html');
      }
    })
  );
});