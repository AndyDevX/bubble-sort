import Phaser from 'phaser';
import canciones from 'virtual:musica';
import { getAjustes } from './ajustes';

type Sonido = ReturnType<Phaser.Scene['sound']['add']>;

// Canciones de las partidas (las detecta Vite al compilar, `virtual:musica` en vite.config.ts):
// src/assets/musica en la web y la app; en el build de CrazyGames, solo src/assets/musica-crazygames
// (música libre de derechos, ver su LEEME.md), sin las canciones de la otra carpeta.
const PISTAS = canciones.map((url, i) => ({ clave: `musica-${i}`, url }));

let musicaActual: Sonido | null = null;
let ultimaClave: string | null = null;
let musicaActiva = false;

function pistasCargadas(escena: Phaser.Scene) {
  return PISTAS.filter((p) => escena.cache.audio.exists(p.clave));
}

// Elige una canción al azar (distinta de la anterior si hay más de una) y, al acabar, otra
function siguientePista(escena: Phaser.Scene) {
  if (!musicaActiva) return;
  const disponibles = pistasCargadas(escena);
  if (disponibles.length === 0) return;

  const candidatas = disponibles.length > 1 ? disponibles.filter((p) => p.clave !== ultimaClave) : disponibles;
  const pista = candidatas[Math.floor(Math.random() * candidatas.length)];

  musicaActual?.destroy();
  musicaActual = escena.sound.add(pista.clave, { volume: getAjustes().volumenMusica });
  ultimaClave = pista.clave;
  musicaActual.once(Phaser.Sound.Events.COMPLETE, () => siguientePista(escena));
  musicaActual.play();
}

// Carga en segundo plano lo que falte del audio (no bloquea la escena: se puede ver y jugar
// mientras tanto). Primero los efectos, que son pequeños, y después las canciones.
// Si la escena se cierra a medias, la siguiente que llame a esto retoma lo que falte.
export function cargarAudioEnSegundoPlano(escena: Phaser.Scene, alCargarUna?: () => void): void {
  let pendientes = 0;
  for (const efecto of EFECTOS) {
    if (escena.cache.audio.exists(efecto)) continue;
    escena.load.audio(efecto, [`assets/sfx/${efecto}.ogg`, `assets/sfx/${efecto}.mp3`]);
    pendientes++;
  }
  for (const p of PISTAS) {
    if (escena.cache.audio.exists(p.clave)) continue;
    escena.load.audio(p.clave, p.url);
    pendientes++;
  }
  if (pendientes === 0) return;
  if (alCargarUna) escena.load.on(Phaser.Loader.Events.FILE_COMPLETE, alCargarUna);
  escena.load.once(Phaser.Loader.Events.COMPLETE, () => {
    if (alCargarUna) escena.load.off(Phaser.Loader.Events.FILE_COMPLETE, alCargarUna);
  });
  escena.load.start();
}

// Música de las partidas: aleatoria y sin fin. Si ya suena, sigue la misma canción.
export function iniciarMusicaPartida(escena: Phaser.Scene): void {
  musicaActiva = true;
  if (musicaActual?.isPlaying) return;
  siguientePista(escena);
  // Si aún no había ninguna cargada, empieza en cuanto termine la primera
  cargarAudioEnSegundoPlano(escena, () => {
    if (musicaActiva && !musicaActual?.isPlaying) siguientePista(escena);
  });
}

export function detenerMusica(): void {
  musicaActiva = false;
  musicaActual?.destroy(); // destroy también detiene y quita el aviso de "canción terminada"
  musicaActual = null;
}

// Efectos de sonido (vidrio), generados con scripts/generar-sonidos.py
export const EFECTOS = [
  'seleccionar',
  'mover',
  'error',
  'fusion',
  'sellar',
  'gravedad',
  'lluvia',
  'gota',
  'victoria',
  'derrota',
  'boton',
  'alarma',
] as const;

export type Efecto = (typeof EFECTOS)[number];

// Efecto largo que hay que poder cortar (p. ej. la alarma de la lluvia): devuelve la instancia.
// El gestor de sonido es global, así que quien lo inicia debe pararlo si la escena se cierra.
export function iniciarEfecto(escena: Phaser.Scene, efecto: Efecto): Sonido | null {
  if (!escena.cache.audio.exists(efecto)) return null;
  const volumen = getAjustes().volumenEfectos;
  if (volumen <= 0) return null;
  const sonido = escena.sound.add(efecto, { volume: volumen });
  sonido.once(Phaser.Sound.Events.COMPLETE, () => sonido.destroy());
  sonido.play();
  return sonido;
}

// `variar`: cambia un poco el tono al azar para que los sonidos repetidos no cansen
export function reproducirEfecto(escena: Phaser.Scene, efecto: Efecto, variar = false): void {
  if (!escena.cache.audio.exists(efecto)) return;
  const volumen = getAjustes().volumenEfectos;
  if (volumen <= 0) return;
  escena.sound.play(efecto, { volume: volumen, rate: variar ? Phaser.Math.FloatBetween(0.9, 1.1) : 1 });
}

// Llamar tras cambiar el volumen de la música para aplicarlo a la pista que suena
export function aplicarVolumenMusica(): void {
  musicaActual?.setVolume(getAjustes().volumenMusica);
}
