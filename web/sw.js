// Service worker: makes the game installable on phones (Add to Home Screen)
// and playable offline. Strategy: network-first with cache fallback, so a
// fresh deploy always wins when online, and the cached copy carries the game
// when there's no connection. /api/* (saves, multiplayer rooms) is never
// cached — those must always hit the real server.
const CACHE = 'acr-26.8.1';

// The full app shell, precached at install so the game works offline even if
// the player installs it and immediately loses connection.
const PRECACHE = [
    './',
    'index.html',
    'manifest.webmanifest',
    'fonts/baloo2.css',
    'fonts/baloo2-latin.woff2',
    'src/main.js',
    'src/config.js',
    'src/core/GameEngine.js',
    'src/core/Player.js',
    'src/entities/Building.js',
    'src/entities/Entity.js',
    'src/entities/Proj.js',
    'src/entities/Tower.js',
    'src/render/Pixel.js',
    'src/entities/Troop.js',
    'src/ai/EnemyAI.js',
    'src/models/Card.js',
    'src/multiplayer/MultiplayerManager.js',
    'images/eraser.png',
    'images/pixel/sprites.json',
    'images/pixel/font/sheet.png',
    'images/pixel/font/metrics.json',
    'icons/icon-192.png',
    'icons/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE)
            .then(cache => cache.addAll(PRECACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return; // e.g. the visit counter
    if (url.pathname.startsWith('/api/')) return;    // saves + multiplayer: live only

    event.respondWith(
        fetch(req)
            .then(res => {
                if (res.ok) {
                    const clone = res.clone();
                    caches.open(CACHE).then(cache => cache.put(req, clone));
                }
                return res;
            })
            .catch(() =>
                // ignoreSearch: the page loads src/main.js?v=X but we precache src/main.js
                caches.match(req, { ignoreSearch: true }).then(hit => {
                    if (hit) return hit;
                    if (req.mode === 'navigate') return caches.match('index.html');
                    return Response.error();
                })
            )
    );
});
