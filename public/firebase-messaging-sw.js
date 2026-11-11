// Firebase Messaging Service Worker — handles background push notifications
// This file MUST stay at /public/firebase-messaging-sw.js (served at /firebase-messaging-sw.js)

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDdcdmnXcuYWft0s49v4aVl-hVBUXjEL2A",
  authDomain: "nexcart-ade79.firebaseapp.com",
  projectId: "nexcart-ade79",
  storageBucket: "nexcart-ade79.firebasestorage.app",
  messagingSenderId: "329261452999",
  appId: "1:329261452999:web:7bb040f5d21513d81db8e2",
});

const messaging = firebase.messaging();

// Background message handler — fires when app is closed or in background
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'NexCart';
  const body = payload.notification?.body || '';
  const image = payload.notification?.image;
  const url = payload.data?.url || '/notifications';

  return self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    image,
    data: { url },
    vibrate: [200, 100, 200],
    requireInteraction: false,
    tag: 'nexcart-' + Date.now(),
  });
});

// Open the linked URL when user taps the notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/notifications';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ('focus' in client) return client.focus();
        }
        return self.clients.openWindow(url);
      })
  );
});
