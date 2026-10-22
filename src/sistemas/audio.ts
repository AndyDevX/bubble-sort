import Phaser from 'phaser';
import { getAjustes } from './ajustes';

type Sonido = ReturnType<Phaser.Scene['sound']['add']>;

// Todas las canciones de src/assets/musica (las detecta Vite al compilar)
const PISTAS = Object.values(
  import.meta.glob<string>('../assets/musica/*.{mp3,ogg,m4a}', { eager: true, query: '?url', import: 'default' }),
).map((url, i) => ({ clave: `musica-${i}`, url }));

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

// Carga en segundo plano las canciones que falten (no bloquea la escena)
export function precargarMusica(escena: Phaser.Scene, alCargarUna?: () => void): void {
  const faltan = PISTAS.filter((p) => !escena.cache.audio.exists(p.clave));
  if (faltan.length === 0) return;
  for (const p of faltan) escena.load.audio(p.clave, p.url);
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
  precargarMusica(escena, () => {
    if (musicaActiva && !musicaActual?.isPlaying) siguientePista(escena);
  });
}

export function detenerMusica(): void {
  musicaActiva = false;
  musicaActual?.destroy(); // destroy también detiene y quita el aviso de "canción terminada"
  musicaActual = null;
}

export function reproducirEfecto(escena: Phaser.Scene, clave: string): void {
  if (!escena.cache.audio.exists(clave)) return;
  escena.sound.play(clave, { volume: getAjustes().volumenEfectos });
}

// Llamar tras cambiar el volumen de la música para aplicarlo a la pista que suena
export function aplicarVolumenMusica(): void {
  musicaActual?.setVolume(getAjustes().volumenMusica);
}
