/* eslint-disable no-undef */
// Custom service worker source used by next-pwa (injectManifest).
// next-pwa will inject the precache manifest into `self.__WB_MANIFEST`.

// Use Workbox from CDN to keep this file small and compatible with injectManifest.
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

if (typeof workbox !== 'undefined') {
  // Precache injected manifest
  workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);

  // Example runtime caching rules (you can extend these if needed)
  workbox.routing.registerRoute(
    ({request}) => request.destination === 'document' || request.destination === 'script' || request.destination === 'style',
    new workbox.strategies.NetworkFirst({ cacheName: 'assets' })
  );
}

// Push handler: show notification when push arrives
self.addEventListener('push', function(event) {
  try {
    const data = event.data ? event.data.json() : { title: 'Timer', body: 'Time is up' };
    const title = data.title || 'Timer ended';
    const options = Object.assign({
      body: data.body || '',
      icon: data.icon || '/icons/icon-192x192.png',
      badge: data.badge || '/icons/icon-192x192.png',
      data: data.data || {},
      vibrate: data.vibrate || [200, 100, 200]
    }, data.options || {});

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('Error handling push event', err);
  }
});

// Notification click opens the app
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = (event.notification && event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (let client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
