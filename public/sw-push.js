// Service worker helper loaded from the generated sw.js via importScripts
// Handles push events and notification clicks for timer notifications
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
    console.error('Error handling push event in sw-push.js', err);
  }
});

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
