// TORAM Calculadora — Service Worker (funciona sin internet).
// Estrategia: la página (HTML) se busca en red primero y se guarda en caché;
// si no hay internet, se sirve la copia guardada. Los archivos estáticos
// (jsPDF, fuentes, iconos) se sirven desde caché cuando ya se guardaron.
var CACHE = 'toram-roi-v1';
var CORE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js'
];
self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return Promise.all(CORE.map(function(u){ return c.add(u).catch(function(){}); }));
    }).then(function(){ return self.skipWaiting(); })
  );
});
self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});
self.addEventListener('fetch', function(e){
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  var isPage = e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/toram_roi/' || url.pathname === '/toram_roi';
  if (isPage) {
    // Página: red primero (siempre lo último), caché si no hay internet.
    e.respondWith(
      fetch(e.request).then(function(res){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
        return res;
      }).catch(function(){
        return caches.match(e.request).then(function(r){ return r || caches.match('./index.html'); });
      })
    );
    return;
  }
  // Estáticos: caché primero, red si falta (y se guarda).
  e.respondWith(
    caches.match(e.request).then(function(hit){
      if (hit) return hit;
      return fetch(e.request).then(function(res){
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
        }
        return res;
      });
    })
  );
});
