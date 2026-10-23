import type { ColorId } from './colores';
import { CAPACIDAD } from './modelo';
import type { ConfigNivel } from './niveles';

// Plan de lluvia de una partida: cuándo empieza, en qué orden caen las gotas y cuánto se espera
// entre una y otra. Es aleatorio en cada partida (no se guarda con el nivel) para que la lluvia no
// sea repetitiva. Lo usan el juego y los simuladores (`npm run simular` / `analizar`).

export interface Gota {
  color: ColorId;
  esperaMs: number; // tiempo desde la gota anterior (o desde el fin de la alerta, la primera)
}

export interface PlanLluvia {
  umbral: number; // avance del nivel (0..1, bolas bien colocadas) al que empieza a llover
  gotas: Gota[];
  tubosExtra: number; // tubos vacíos que trae la lluvia al empezar (antes no están)
}

export const UMBRAL_MIN = 0.25;
export const UMBRAL_MAX = 0.45;
const RAFAGA_MS = 140; // separación entre las gotas de una ráfaga

export function planificarLluvia(config: ConfigNivel, colores: ColorId[], rnd: () => number = Math.random): PlanLluvia {
  // Todas las gotas mezcladas: los colores de las distintas tandas se intercalan
  const orden: ColorId[] = colores.flatMap((c) => Array<ColorId>(CAPACIDAD).fill(c));
  for (let i = orden.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [orden[i], orden[j]] = [orden[j], orden[i]];
  }
  // Ráfagas (dos gotas casi a la vez) desde el bloque 2, cada vez más frecuentes
  const probRafaga = config.bloque >= 2 ? Math.min(0.35, 0.1 + 0.02 * config.bloque) : 0;
  const gotas = orden.map((color, i) => {
    let esperaMs = Math.round(config.intervaloLluviaMs * (0.6 + rnd() * 0.8)); // ±40 %
    if (i === 0) esperaMs = 0;
    else if (rnd() < probRafaga) esperaMs = RAFAGA_MS;
    return { color, esperaMs };
  });
  return {
    umbral: UMBRAL_MIN + rnd() * (UMBRAL_MAX - UMBRAL_MIN),
    gotas,
    tubosExtra: config.tubosLluvia,
  };
}
