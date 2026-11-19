const CACHE = 'slow-bite-v7';
const ASSETS = ["./styles.css?v=4", "./catalog.js?v=4", "./app.js?v=4", "./", "./index.html", "./styles.css", "./app.js", "./catalog.js", "./manifest.webmanifest", "./icon.svg", "./icons/apple-touch-icon.png", "./icons/icon-192.png", "./icons/icon-512.png", "./assets/burger.webp", "./assets/cat-drink.webp", "./assets/cat-flash.webp", "./assets/cat-food.webp", "./assets/cat-group.webp", "./assets/cat-lunch.webp", "./assets/cat-market.webp", "./assets/cat-medicine.webp", "./assets/cat-produce.webp", "./assets/cat-runner.webp", "./assets/cat-subsidy.webp", "./assets/fruit.webp", "./assets/heytea.webp", "./assets/ice.webp", "./assets/luckin.webp", "./assets/milk.webp", "./assets/noodles.webp", "./assets/pancake.webp", "./assets/qixian.webp", "./assets/tea.webp"];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('slow-bite-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  // A navigation checks the network so a new release is discovered after reinstall/reload.
  if (event.request.mode === 'navigate' || /\.(js|css|webmanifest)$/.test(url.pathname)) {
    event.respondWith(fetch(event.request).then(response => {
      if (!response.ok) throw new Error('Unavailable');
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)));
      return response;
    }).catch(() => caches.match(event.request).then(cached => cached || (event.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
