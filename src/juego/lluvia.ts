import type { ColorId } from './colores';
import { CAPACIDAD } from './modelo';
import type { ConfigNivel } from './niveles';

// Plan de lluvia de una partida: cuándo empieza, qué cae, en qué orden y cuánto se espera entre
// una gota y otra. Es aleatorio en cada partida (no se guarda con el nivel) para que la lluvia no
// sea repetitiva. Lo usan el juego y los simuladores (`npm run simular` / `analizar`).
//
// La lluvia es un obstáculo **temporal**: no cambia el tablero ni añade tubos.
// - Gota de hielo: cae encima de un tubo y lo bloquea (no se saca ni se pone nada) hasta que se
//   derrite al cabo de `deshielo` jugadas.
// - Gota de niebla (bloques altos): vuelve a tapar con «?» bolas ya descubiertas de un tubo.

// ─── DESACTIVADA (v1.0.15) ───
// La lluvia está apagada hasta que se rehaga: el plan sale siempre vacío, así que en la partida no
// hay alerta, ni gotas, ni contador, y los simuladores juegan sin lluvia. El código (aquí, en
// GameScene y en scripts/lib/juego.mjs) se conserva tal cual para la refactorización: para
// volver a activarla basta con poner `LLUVIA_ACTIVA = true` (y revisar la dificultad).
export const LLUVIA_ACTIVA = false;

export type TipoGota = 'hielo' | 'niebla';

export interface Gota {
  color: ColorId; // color de la bola de hielo (las de niebla no lo usan)
  tipo: TipoGota;
  esperaMs: number; // tiempo desde la gota anterior (o desde el fin de la alerta, la primera)
}

export interface PlanLluvia {
  umbral: number; // avance del nivel (0..1, bolas bien colocadas) al que empieza a llover
  gotas: Gota[];
  deshielo: number; // jugadas que tarda en derretirse cada bola de hielo
}

export const UMBRAL_MIN = 0.25;
export const UMBRAL_MAX = 0.45;
const RAFAGA_MS = 140; // separación entre las gotas de una ráfaga
export const BLOQUE_NIEBLA = 5; // desde este bloque, parte de las gotas son de niebla

/** Jugadas que tarda en derretirse el hielo: 4 al principio, hasta 8; +1 en el nivel difícil. */
export function deshieloDe(config: ConfigNivel): number {
  return 4 + Math.min(4, Math.floor(config.bloque / 2)) + (config.dificil ? 1 : 0);
}

/** Parte de las gotas que son de niebla: ninguna hasta el bloque 5, luego del 20 % al 45 %. */
export function probNieblaDe(config: ConfigNivel): number {
  return config.bloque >= BLOQUE_NIEBLA ? Math.min(0.45, 0.2 + 0.03 * (config.bloque - BLOQUE_NIEBLA)) : 0;
}

export function planificarLluvia(config: ConfigNivel, colores: ColorId[], rnd: () => number = Math.random): PlanLluvia {
  if (!LLUVIA_ACTIVA) return { umbral: 1, gotas: [], deshielo: deshieloDe(config) };
  // Todas las gotas mezcladas: los colores de las distintas tandas se intercalan
  const orden: ColorId[] = colores.flatMap((c) => Array<ColorId>(CAPACIDAD).fill(c));
  for (let i = orden.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [orden[i], orden[j]] = [orden[j], orden[i]];
  }
  // Ráfagas (dos gotas casi a la vez) desde el bloque 2, cada vez más frecuentes
  const probRafaga = config.bloque >= 2 ? Math.min(0.35, 0.1 + 0.02 * config.bloque) : 0;
  const probNiebla = probNieblaDe(config);
  const gotas = orden.map((color, i): Gota => {
    let esperaMs = Math.round(config.intervaloLluviaMs * (0.6 + rnd() * 0.8)); // ±40 %
    if (i === 0) esperaMs = 0;
    else if (rnd() < probRafaga) esperaMs = RAFAGA_MS;
    return { color, tipo: i > 0 && rnd() < probNiebla ? 'niebla' : 'hielo', esperaMs };
  });
  return {
    umbral: UMBRAL_MIN + rnd() * (UMBRAL_MAX - UMBRAL_MIN),
    gotas,
    deshielo: deshieloDe(config),
  };
}
