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

    // Network First strategy for the main page and index.html
    // This ensures we always point to the latest JS/CSS hashes
    if (url.origin === self.location.origin && (url.pathname === '/' || url.pathname === '/index.html')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const clonedResponse = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clonedResponse);
                    });
                    return response;
                })
                .catch(() => {
                    return caches.match(event.request);
                })
        );
        return;
    }

    // Default: Cache First, then Network
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request).catch((err) => {
                console.warn('[SW] Fetch failed:', event.request.url);
                // Return nothing to let the browser handle the failure naturally
                return null;
            });
        })
    );
});
