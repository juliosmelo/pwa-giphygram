// SW Version
const version = 'static-1.0';

const appAssets = [
    '/',
    'index.html', 
    'main.js', 
    'images/flame.png',
    'images/logo.png',
    'images/sync.png',
    'vendor/bootstrap.min.css',
    'vendor/jquery.min.js'
];


const clearOldGifs = (oldGifs) => {
    caches.open('giphy').then(cache => {
        cache.keys( (keys) => {
            keys.forEach( (key) =>{
                if (!oldGifs.includes(key.url)) cache.delete(key)
            });
        });
    });
}

// SW install Service Worker
self.addEventListener('install', (e) => {
    console.log('Installing cache');
    let cachePromisse = caches.open(version).then( cache => cache.addAll(appAssets));
    e.waitUntil(cachePromisse);
});

// SW activate Service Worker
self.addEventListener('activate', (e) => {
    let cleanedCachePromisse = caches.keys().then( keys => {
        keys.forEach( key => {
            if (key !== version) return caches.delete(key);
        });
    });
    e.waitUntil(cleanedCachePromisse);
})

// Static cache with network fallback
const staticCache = ( req, cache = version) => {
    return caches.match(req).then( cacheResponse => {
        if (cacheResponse) return cacheResponse;
        
        // network fallback
        return fetch(req).then(networkRes => {
            caches.open(cache).then(cache => {
                cache.put(req, networkRes);
            });
            return networkRes.clone();
        });

    });
}

// Fallback network
const fallbackNetworkCache = (req) => {
    return fetch(req).then(networkResponse => {
        if (!networkResponse.ok) throw 'Error fecthing';
        caches.open(version).then(cache => {
            cache.put(req, networkResponse);
        });
        return networkResponse.clone();

    }).catch(err => caches.match(req));
}

// SW fetch
self.addEventListener('fetch', (e) => {
    
    // App shell resources
    if (e.request.url.match(location.origin) ){
        e.respondWith( staticCache(e.request) );
    } else if (e.request.url.match('api.giphy.com/v1/gifs/trending')){
        e.respondWith( fallbackNetworkCache(e.request) );
    } else if (e.request.url.match('giphy.com/media')){
        e.respondWith( staticCache(e.request, 'giphy') );
    }
});

self.addEventListener('message', (e) => {
    if (e.data.action == 'cleanGifMedia') clearOldGifs(e.data.giphys);
});