const RELEASE = {id:'development'}; // BUILD_RELEASE
const PRECACHE = []; // BUILD_ASSETS
const PREFIX = `slow-bite:${new URL(self.registration.scope).pathname}:`;
const CACHE = PREFIX + RELEASE.id;
const INDEX = new URL('./index.html', self.registration.scope).href;

self.addEventListener('install', event => {
  // A failed or interrupted download must never replace the working release.
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try {
      const results = await Promise.allSettled(PRECACHE.map(async asset => {
        const url = new URL(asset.url, self.registration.scope);
        const response = await fetch(new Request(url, {cache:'reload'}));
        if (!response.ok) throw new Error('Release download failed');
        const bytes = await response.clone().arrayBuffer();
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        const hash = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2,'0')).join('');
        if (hash !== asset.sha256) throw new Error('Release assets do not match');
        await cache.put(url, response);
      }));
      const failed = results.find(result => result.status === 'rejected');
      if (failed) throw failed.reason;
    } catch (error) {
      await caches.delete(CACHE);
      throw error;
    }
    // Wait for the user's update button. The first install activates normally.
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'GET_RELEASE') event.ports[0]?.postMessage(RELEASE);
  if (event.data?.type === 'ACTIVATE_RELEASE' && event.data.id === RELEASE.id) {
    event.waitUntil(self.skipWaiting());
  }
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await self.clients.claim();
    // Keep previous release assets for any other window still running old code.
    // Only this app's caches are considered; browser storage is never cleared.
    const clients = await self.clients.matchAll({type:'window', includeUncontrolled:true});
    if (clients.length <= 1) {
      const keys = await caches.keys();
      await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)));
    }
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  if (url.pathname === new URL('version.json', self.registration.scope).pathname) {
    // Never answer a version check from the offline cache.
    event.respondWith(fetch(new Request(event.request, {cache:'no-store'})));
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (event.request.mode === 'navigate') {
      return (await cache.match(INDEX)) || fetch(event.request);
    }
    return (await cache.match(event.request)) || (await caches.match(event.request)) || fetch(event.request);
  })());
});
