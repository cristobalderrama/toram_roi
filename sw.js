// TORAM Calculadora — Service Worker (funciona sin internet).
// La página se sirve desde caché: NO hay descargas automáticas.
// Solo el botón "Actualizar app" de la calculadora descarga la versión
// más reciente, y lo hace en primer plano (con WiFi), aunque los datos
// en segundo plano del teléfono estén apagados.
var CACHE = 'toram-roi-v1';
var CORE = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js'
];
self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      // Solo guarda lo que aún no está en caché (no re-descarga lo que ya hay).
      return c.keys().then(function(keys){
        var have = {};
        keys.forEach(function(r){ have[r.url] = true; });
        return Promise.all(CORE.map(function(u){
          var abs = new URL(u, self.registration.scope).href;
          if (have[abs]) return Promise.resolve();
          return c.add(u).catch(function(){});
        }));
      });
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
// El botón "Actualizar app" pide la versión más reciente (solo cuando el usuario lo toca).
self.addEventListener('message', function(e){
  if (!e.data || e.data.type !== 'UPDATE_APP') return;
  var client = e.source;
  e.waitUntil(
    fetch('./index.html', {cache: 'reload'}).then(function(res){
      if (!res || !res.ok) throw new Error('HTTP ' + (res && res.status));
      return caches.open(CACHE).then(function(c){
        return c.put('./index.html', res.clone()).then(function(){ return c.put('./', res.clone()); });
      });
    }).then(function(){
      if (client) client.postMessage({type: 'UPDATE_RESULT', ok: true});
    }).catch(function(){
      if (client) client.postMessage({type: 'UPDATE_RESULT', ok: false});
    })
  );
});
self.addEventListener('fetch', function(e){
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  var isPage = e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/toram_roi/' || url.pathname === '/toram_roi';
  if (isPage) {
    // Página: desde caché (sin descargas automáticas). Solo el botón "Actualizar app" descarga lo nuevo.
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
