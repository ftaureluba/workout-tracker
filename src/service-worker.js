/* eslint-disable no-undef */
// Custom service worker source used by next-pwa (injectManifest).
// next-pwa will inject the precache manifest into `self.__WB_MANIFEST`.

// Use Workbox from CDN to keep this file small and compatible with injectManifest.
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

if (typeof workbox !== 'undefined') {
  // Precache injected manifest
  workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);

  // Caching rules for HTML documents, scripts, styles, and background fetched pages
  workbox.routing.registerRoute(
    ({ request, url }) => {
      // Exclude API routes and Next.js data routes
      if (url.pathname.startsWith('/api') || url.pathname.startsWith('/_next/data')) {
        return false;
      }
      const acceptHeader = request.headers.get('accept') || '';
      return request.destination === 'document' ||
             request.destination === 'script' ||
             request.destination === 'style' ||
             acceptHeader.includes('text/html');
    },
    new workbox.strategies.NetworkFirst({ cacheName: 'assets' })
  );

  // Cache the workout API endpoint with a network-first strategy
  // This allows users to start workouts offline if the data was previously cached
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.match(/^\/api\/workouts\/[^/]+$/),
    new workbox.strategies.NetworkFirst({ 
      cacheName: 'workout-data',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        }),
      ],
    })
  );

  // Global catch handler: serve the precached offline.html if any page navigation fails
  workbox.routing.setCatchHandler(async ({ request }) => {
    if (request.destination === 'document') {
      return (await workbox.precaching.matchPrecache('/offline.html')) || Response.error();
    }
    return Response.error();
  });
}

// Push handler: show notification when push arrives
self.addEventListener('push', function (event) {
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

    // Always show the notification. On iOS and other restrictive environments,
    // checking for visible clients can cause notifications to be swallowed.
    // We also forward the payload to any open clients so the page can react
    // (play sound, update UI, etc.) but the system notification is always shown.
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
        // Forward to open clients for in-page handling
        for (const client of windowClients) {
          try {
            client.postMessage({ type: 'push', data });
          } catch (e) {
            // ignore
          }
        }
        // Always show the system notification
        return self.registration.showNotification(title, options);
      })
    );
  } catch (err) {
    console.error('Error handling push event', err);
  }
});

// Notification click opens the app
self.addEventListener('notificationclick', function (event) {
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
