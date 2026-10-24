import { Capacitor } from '@capacitor/core';
import { EN_CRAZYGAMES } from '../plataforma';

// Registra el Service Worker (public/sw.js) que guarda el audio y el build en el dispositivo.
// Solo funciona en conexiones seguras: localhost o HTTPS (p. ej. el túnel de `npm run compartir`);
// por la IP local (http://192.168…) el navegador no lo permite y simplemente no se activa.
export function registrarCacheOffline(): void {
  if (!('serviceWorker' in navigator)) return;
  if (Capacitor.isNativePlatform()) return; // en la app los archivos ya están en el teléfono
  if (EN_CRAZYGAMES) return; // en CrazyGames el juego va en un iframe de su web: el caché es cosa suya

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Sin Service Worker el juego funciona igual, solo sin caché propio
    });
  });
}
