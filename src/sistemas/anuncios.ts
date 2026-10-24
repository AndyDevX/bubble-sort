import Phaser from 'phaser';
import { EN_CRAZYGAMES } from '../plataforma';
import { usarDataModule } from './almacen';
import { registrar } from './registro';

// Anuncios (solo en el build de CrazyGames; en la web y en la app no hay ninguno y todo esto no
// hace nada). Usa el SDK v3 de CrazyGames, que `index.html` carga en ese build:
// - entre niveles («midgame»): al pulsar «Siguiente» tras ganar, como mucho cada 2 niveles (el SDK
//   además los limita a uno cada 3 minutos). Nunca tras perder;
// - con recompensa («rewarded»): los pide el jugador (deshacer gratis al perder, monedas dobles al
//   ganar).
// Durante el anuncio el sonido se silencia y la partida no avanza; si no hay anuncio (bloqueador,
// sin conexión, sin inventario) el juego sigue igual, sin recompensa.
// Además se avisa al SDK de cuándo se está cargando y cuándo se juega (lo pide CrazyGames), y el
// progreso pasa a guardarse en su Data Module (`almacen.ts`).

interface SdkCrazyGames {
  init(): Promise<void>;
  ad: {
    requestAd(tipo: 'midgame' | 'rewarded', callbacks: { adStarted?: () => void; adFinished?: () => void; adError?: (error: unknown) => void }): void;
  };
  game: { gameplayStart(): void; gameplayStop(): void; loadingStart(): void; loadingStop(): void };
}

const sdk = (): SdkCrazyGames | undefined => (window as unknown as { CrazyGames?: { SDK?: SdkCrazyGames } }).CrazyGames?.SDK;

let listo = false;
let enPartida = false;
let nivelesSinAnuncio = 0;
let mostrando = false;

export async function iniciarAnuncios(): Promise<void> {
  if (!EN_CRAZYGAMES) return;
  const s = sdk();
  if (!s) return; // el script del SDK no cargó (sin conexión o bloqueado): el juego va sin anuncios
  try {
    // Si el SDK no responde en 5 s, el juego arranca igual (sin anuncios, guardando en el navegador)
    await Promise.race([s.init(), new Promise((_, fallo) => setTimeout(() => fallo(new Error('sin respuesta')), 5000))]);
    listo = true;
    usarDataModule();
    s.game.loadingStart();
  } catch {
    listo = false;
  }
}

/** Hay SDK de anuncios (para mostrar o no los botones de «ver anuncio»). */
export const hayAnuncios = (): boolean => listo;

/** El juego terminó de cargar (menú visible). */
export function cargaTerminada(): void {
  if (listo) sdk()?.game.loadingStop();
}

/** Empieza o se para el juego activo (partida en marcha, sin ventanas encima). */
export function enJuego(si: boolean): void {
  if (!listo || si === enPartida || mostrando) return;
  enPartida = si;
  if (si) sdk()?.game.gameplayStart();
  else sdk()?.game.gameplayStop();
}

function pedir(tipo: 'midgame' | 'rewarded', escena: Phaser.Scene): Promise<boolean> {
  const s = sdk();
  if (!listo || !s || mostrando) return Promise.resolve(false);
  return new Promise((resolver) => {
    const silenciado = escena.sound.mute;
    const jugaba = enPartida;
    enJuego(false);
    mostrando = true;
    const terminar = (visto: boolean, error?: unknown) => {
      mostrando = false;
      escena.sound.mute = silenciado;
      registrar('anuncio', { tipo, visto, ...(error ? { error: String(error) } : {}) });
      if (jugaba) enJuego(true);
      resolver(visto);
    };
    s.ad.requestAd(tipo, {
      adStarted: () => {
        escena.sound.mute = true;
      },
      adFinished: () => terminar(true),
      adError: (error) => terminar(false, error),
    });
  });
}

/** Al pasar de nivel tras ganar: un anuncio como mucho cada 2 niveles. */
export async function anuncioEntreNiveles(escena: Phaser.Scene): Promise<void> {
  nivelesSinAnuncio++;
  if (nivelesSinAnuncio < 2) return;
  if (await pedir('midgame', escena)) nivelesSinAnuncio = 0;
}

/** Anuncio con recompensa: true si se vio entero (y hay que dar la recompensa). */
export const anuncioRecompensa = (escena: Phaser.Scene): Promise<boolean> => pedir('rewarded', escena);
