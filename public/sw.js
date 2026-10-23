// Service Worker de Odi Sort: guarda en el dispositivo el audio y los archivos del build
// para que el juego cargue rápido en las siguientes visitas.
//
// - Audio (efectos y canciones): se sirve desde el caché al instante y se actualiza en
//   segundo plano (si cambias un archivo, la versión nueva se usa en la siguiente carga).
// - Archivos del build con huella en el nombre (p. ej. index-CtUvl7ay.js): no cambian
//   nunca, así que se guardan una vez y se reutilizan.
// - Todo lo demás (index.html incluido) va siempre a la red.
//
// Para borrar el caché de todos los jugadores, sube la versión.
const VERSION = 'odi-sort-v3'; // v3: alarma nueva (v2: canciones nuevas); borra lo antiguo del caché

const ES_AUDIO = /\.(mp3|ogg|m4a|wav)$/i;
const CON_HUELLA = /\/assets\/[^/]+-[A-Za-z0-9_-]{8}\.[a-z0-9]+$/i;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    (async () => {
      const claves = await caches.keys();
      await Promise.all(claves.filter((c) => c.startsWith('odi-sort-') && c !== VERSION).map((c) => caches.delete(c)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  if (peticion.method !== 'GET' || peticion.headers.has('range')) return;

  const url = new URL(peticion.url);
  if (url.origin !== self.location.origin) return;

  if (CON_HUELLA.test(url.pathname)) {
    evento.respondWith(primeroCache(peticion));
  } else if (ES_AUDIO.test(url.pathname)) {
    evento.respondWith(cacheYActualizar(evento, peticion));
  }
});

async function guardar(cache, peticion, respuesta) {
  if (respuesta.ok && respuesta.status === 200) await cache.put(peticion, respuesta.clone());
  return respuesta;
}

async function primeroCache(peticion) {
  const cache = await caches.open(VERSION);
  const guardada = await cache.match(peticion);
  if (guardada) return guardada;
  return guardar(cache, peticion, await fetch(peticion));
}

async function cacheYActualizar(evento, peticion) {
  const cache = await caches.open(VERSION);
  const guardada = await cache.match(peticion);
  const deRed = fetch(peticion)
    .then((respuesta) => guardar(cache, peticion, respuesta))
    .catch(() => guardada);
  if (guardada) {
    evento.waitUntil(deRed);
    return guardada;
  }
  return deRed;
}
