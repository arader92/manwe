// Manwë service worker: caches the app shell so it opens instantly and offline.
const SHELL="manwe-v7";
const FILES=["./","./index.html","./manifest.json","./icon-192.png","./icon-512.png","https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(SHELL).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==SHELL).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  if(u.origin===location.origin||u.hostname==="cdnjs.cloudflare.com"){
    e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(SHELL).then(c=>c.put(e.request,cp));return r}).catch(()=>caches.match(e.request)));
  }
});
self.addEventListener("notificationclick",e=>{e.notification.close();e.waitUntil(clients.matchAll({type:"window"}).then(w=>w.length?w[0].focus():clients.openWindow("./index.html#forecast")))});
// Phase 2: a "push" listener goes here once the alert server is set up.
