const CACHE_NAME = 'relearn-v3'; // Increment version to force clear old cache
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
    const url = new URL(event.request.url);

    // Bypass Service Worker for API calls and external services
    // This ensures Gemini, Supabase, and YouTube requests work reliably
    if (url.pathname.startsWith('/api/') || 
        url.hostname.includes('supabase.co') || 
        url.hostname.includes('googleapis.com')) {
        return; // Direct network access
    }

    // Network First strategy for navigation requests (SPA routing)
    // This ensures we always point to the latest JS/CSS hashes, and serves cached index.html offline
    if (event.request.mode === 'navigate' || (url.origin === self.location.origin && (url.pathname === '/' || url.pathname === '/index.html'))) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const clonedResponse = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        // Store the latest index file mapped to '/' instead of specific route
                        cache.put('/', clonedResponse);
                    });
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

    // Default: Cache First, then Network
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request).catch((err) => {
                console.warn('[SW] Fetch failed:', event.request.url);
                return new Response('Network error', { status: 503, statusText: 'Service Unavailable' });
            });
        })
    );
});
