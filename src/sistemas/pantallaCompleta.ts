import Phaser from 'phaser';
import { Capacitor } from '@capacitor/core';

// En el navegador de un móvil, pasa a pantalla completa con el primer toque.
// Los navegadores solo lo permiten como respuesta a un gesto del usuario, nunca al cargar.
export function activarPantallaCompletaEnMovil(juego: Phaser.Game): void {
  const { os, fullscreen } = juego.device;

  if (os.desktop) return;                     // PC: no forzamos nada
  if (Capacitor.isNativePlatform()) return;   // dentro de la app ya es pantalla completa
  if (!fullscreen.available) return;          // p. ej. Safari en iPhone no lo permite

  const pedirPantallaCompleta = () => {
    if (juego.scale.isFullscreen) return;
    juego.scale.startFullscreen();
  };

  // Escuchamos en el documento para que funcione en cualquier escena.
  // Si el usuario sale (gesto "atrás"), el siguiente toque la recupera.
  document.addEventListener('pointerup', pedirPantallaCompleta);

  // Bloquear en vertical una vez en pantalla completa (solo algunos navegadores Android lo admiten)
  juego.scale.on(Phaser.Scale.Events.ENTER_FULLSCREEN, () => {
    const orientacion = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    orientacion.lock?.('portrait').catch(() => {
      // No soportado: no pasa nada
    });
  });
}
