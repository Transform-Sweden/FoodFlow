// FoodFlow service worker — lets the app open (and keep working) even
// with no signal, once it's been loaded at least once. This has nothing
// to do with your data: your meals, recipes and shopping list all still
// live in the browser's local storage exactly as before. This file only
// caches the app's own page so it can open offline instead of failing.
//
// Strategy: try the network first (so you always get the latest version
// when you're online), and only fall back to the cached copy if that
// fails — e.g. no signal, or airplane mode.

const CACHE_NAME = "foodflow-cache-v2";

self.addEventListener("install", () => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {

    // Only GET requests can be cached/replayed this way.
    if(event.request.method !== "GET") return;

    // Only handle FoodFlow's own files and the Firebase library files.
    // Live sync traffic to Firebase's servers must go straight through.
    let url = new URL(event.request.url);
    if(url.origin !== self.location.origin && url.hostname !== "www.gstatic.com") return;

    event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {

            try {

                let response = await fetch(event.request);

                if(response && response.status === 200){
                    cache.put(event.request, response.clone());
                }

                return response;

            } catch (networkError) {

                let cached = await cache.match(event.request);

                if(cached) return cached;

                throw networkError;

            }

        })
    );

});
