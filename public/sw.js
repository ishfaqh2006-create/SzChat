const CACHE_NAME = 'szchat-v4-push-notifications';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          client.postMessage({ type: 'RELOAD_PAGE' });
        }
      });
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body || 'New message received',
        icon: data.icon || 'https://api.dicebear.com/7.x/bottts/svg?seed=szchat_app_logo',
        badge: data.icon || 'https://api.dicebear.com/7.x/bottts/svg?seed=szchat_app_logo',
        tag: data.chatId ? `chat-${data.chatId}` : 'szchat-msg',
        renotify: true,
        data: {
          url: data.url || '/',
          chatId: data.chatId,
        },
      };

      event.waitUntil(
        self.registration.showNotification(data.title || 'SzChat', options)
      );
    } catch {
      event.waitUntil(
        self.registration.showNotification('SzChat', {
          body: event.data.text(),
          tag: 'szchat-msg',
        })
      );
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notificationData = event.notification.data || {};
  const targetUrl = notificationData.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if (notificationData.chatId) {
            client.postMessage({ type: 'OPEN_CHAT', chatId: notificationData.chatId });
          }
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
