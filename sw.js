/* Change CACHE whenever publishing an updated game. Existing sessions keep their version. */
const CACHE = 'okyanus-kasifi-v3.0.0';
const FILES = ['./','./index.html','./style.css','./visual-v3.css','./assets/v3/reef.webp','./assets/v3/turtle.webp','./assets/v3/octopus.webp','./assets/v3/fish.webp','./data.js','./app.js','./manifest.webmanifest','./assets/turtle.svg','./assets/octopus.svg','./assets/fish.svg','./vendor/jsQR.js','./vendor/qrcode.js','./qr-kartlari.html','./qr-kartlari.js','./lisanslar.html','./lisanslar/jsQR-APACHE-2.0.txt','./lisanslar/qrcode-generator-MIT.txt','./lisanslar/twemoji-CC-BY-4.0.txt'];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try { await cache.addAll(FILES); } catch (error) { await caches.delete(CACHE); throw error; }
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('okyanus-kasifi-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request, {ignoreSearch:true});
    if(cached) return cached;
    try { return await fetch(event.request); }
    catch { return new Response('Bu sayfa çevrimdışı hazır değil. Oyunun başlangıç sayfasını aç.', {status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}}); }
  })());
});
self.addEventListener('message', event => {
  if(event.data?.type === 'ACTIVATE_UPDATE') { event.waitUntil(self.skipWaiting()); return; }
  if(event.data?.type !== 'CHECK_READY' || !event.ports[0]) return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const results = await Promise.all(FILES.map(file => cache.match(file)));
    event.ports[0].postMessage({ready:results.every(Boolean),version:CACHE});
  })());
});
