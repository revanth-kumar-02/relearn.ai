const CACHE_NAME = 'relearn-v5'; // v5: Added Web Push Support
const ASSETS = [
    '/',
    '/index.html',
    '/logo.png',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    // Skip waiting to activate the new SW immediately
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('activate', (event) => {
    // Clean up old caches
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Claim control of all clients immediately
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Only handle HTTP/HTTPS requests (bypasses chrome-extension, mailto, etc.)
    if (!event.request.url.startsWith('http')) return;

    // Only handle GET requests
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Bypass Service Worker for local API calls or Supabase/external database requests
    if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase.co')) {
        return; // Direct network access
    }

    // Bypass Service Worker for other third-party origins (except Google Fonts)
    if (url.origin !== self.location.origin) {
        if (!url.hostname.includes('googleapis.com') && !url.hostname.includes('fonts.gstatic.com')) {
            return; // Direct network access
        }
    }

    // Network First strategy for navigation requests (SPA routing)
    // This ensures we always point to the latest JS/CSS hashes, and serves cached index.html offline
    if (event.request.mode === 'navigate' || (url.origin === self.location.origin && (url.pathname === '/' || url.pathname === '/index.html'))) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Only cache successful status 200 responses to prevent polluting the cache with error pages
                    if (response.status === 200) {
                        const clonedResponse = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            // Store the latest index file mapped to '/' instead of specific route
                            cache.put('/', clonedResponse);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match('/').then(cached => {
                        return cached || new Response('Offline and not cached', { status: 503, statusText: 'Service Unavailable' });
                    });
                })
        );
        return;
    }

    // Default: Cache First, then Network (with dynamic caching for local assets & fonts)
    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) {
                return response; // Serve from cache if found
            }

            return fetch(event.request).then((networkResponse) => {
                // Ensure we got a valid response
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }

                // Dynamically cache local assets (js, css, images, fonts, icons)
                const shouldCache = url.pathname.includes('/assets/') ||
                                    url.pathname.endsWith('.js') ||
                                    url.pathname.endsWith('.css') ||
                                    url.pathname.endsWith('.png') ||
                                    url.pathname.endsWith('.jpg') ||
                                    url.pathname.endsWith('.svg') ||
                                    url.pathname.endsWith('.ico') ||
                                    url.pathname.endsWith('.woff2');

                if (shouldCache) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }

                return networkResponse;
            }).catch((err) => {
                console.warn('[SW] Fetch failed:', event.request.url);
                return new Response('Network error', { status: 503, statusText: 'Service Unavailable' });
            });
        })
    );
});

// ==========================================
// Web Push Notifications Event Handlers
// ==========================================

self.addEventListener('push', (event) => {
    let payload = {
        title: 'Relearn.ai Notification',
        body: 'You have a new update in Relearn.ai!',
        icon: '/logo.png',
        url: '/'
    };

    if (event.data) {
        try {
            const parsed = event.data.json();
            payload = { ...payload, ...parsed };
        } catch (e) {
            payload.body = event.data.text();
        }
    }

    const options = {
        body: payload.body,
        icon: payload.icon || '/logo.png',
        badge: '/logo.png',
        data: { url: payload.url || '/' },
        vibrate: [100, 50, 100],
        tag: payload.tag || 'relearn-push-notification',
        renotify: true
    };

    event.waitUntil(
        self.registration.showNotification(payload.title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.focus();
                    if (client.navigate && targetUrl !== '/') {
                        client.navigate(targetUrl);
                    }
                    return;
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }
        })
    );
});
