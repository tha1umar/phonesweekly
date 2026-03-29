const CACHE_NAME = 'phones-weekly-v4';
const ASSETS_TO_CACHE = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap'
];

// URLs to NEVER cache (always fetch fresh)
const NEVER_CACHE = [
    'index.html',
    'firebasedatabase',
    'firebaseio.com',
    'googleapis.com/identitytoolkit',
    'gstatic.com/firebasejs'
];

function shouldNeverCache(url) {
    return NEVER_CACHE.some(pattern => url.includes(pattern));
}

// Install: cache only fonts
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// Fetch: network-first for HTML and Firebase, cache-first for fonts only
self.addEventListener('fetch', event => {
    const url = event.request.url;

    // Always go to network for HTML and Firebase requests
    if (shouldNeverCache(url) || event.request.destination === 'document') {
        event.respondWith(
            fetch(event.request).catch(() => {
                if (event.request.destination === 'document') {
                    return caches.match('./index.html');
                }
            })
        );
        return;
    }

    // Cache-first for everything else (fonts, etc.)
    event.respondWith(
        caches.match(event.request).then(cached => {
            return cached || fetch(event.request).then(response => {
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            });
        })
    );
});
