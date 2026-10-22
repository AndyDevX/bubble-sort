import Phaser from 'phaser';
import { getAjustes } from './ajustes';

type Sonido = ReturnType<Phaser.Scene['sound']['add']>;

let musicaActual: Sonido | null = null;

// Música de fondo en bucle; si ya suena la misma pista, no la reinicia
export function reproducirMusica(escena: Phaser.Scene, clave: string): void {
  if (musicaActual?.key === clave && musicaActual.isPlaying) return;

  musicaActual?.stop();
  musicaActual?.destroy();
  musicaActual = escena.sound.add(clave, { loop: true, volume: getAjustes().volumenMusica });
  musicaActual.play();
}

export function detenerMusica(): void {
  musicaActual?.stop();
}

export function reproducirEfecto(escena: Phaser.Scene, clave: string): void {
  if (!escena.cache.audio.exists(clave)) return;
  escena.sound.play(clave, { volume: getAjustes().volumenEfectos });
}

// Llamar tras cambiar el volumen de la música para aplicarlo a la pista que suena
export function aplicarVolumenMusica(): void {
  musicaActual?.setVolume(getAjustes().volumenMusica);
}
