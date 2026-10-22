import { COLORES, RECETAS, type ColorId } from './colores';
import { CAPACIDAD, nuevaBola, type Bola, type Tubo } from './modelo';
import { tieneSolucion } from './solucionador';

export interface ConfigNivel {
  colores: number;          // grupos de 4 a ordenar
  tubosVacios: number;
  fusiones: number;         // bolas del color resultado que llegan partidas en dos ingredientes
  niebla: number;           // 0..1: proporción de bolas (no de arriba) ocultas
  lotesLluvia: number;      // tandas de 4 bolas que caen a partir del 50 %
  intervaloLluviaMs: number;
}

// Dificultad por nivel: todas las mecánicas activas, con intensidad creciente
export function configNivel(nivel: number): ConfigNivel {
  return {
    colores: Math.min(7, 3 + Math.floor((nivel - 1) / 2)),
    tubosVacios: 2,
    fusiones: nivel < 2 ? 0 : nivel < 6 ? 1 : 2,
    niebla: Math.min(0.6, (nivel - 1) * 0.08),
    lotesLluvia: nivel < 8 ? 1 : 2,
    intervaloLluviaMs: Math.max(2500, 6000 - nivel * 200),
  };
}

export interface Nivel {
  tubos: Tubo[];
  coloresBase: ColorId[];
  coloresLluvia: ColorId[]; // un color nuevo por cada tanda de lluvia
  config: ConfigNivel;
}

type Aleatorio = () => number;

function barajar<T>(lista: T[], rnd: Aleatorio): T[] {
  for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  return lista;
}

export function generarNivel(nivel: number, rnd: Aleatorio = Math.random): Nivel {
  const config = configNivel(nivel);

  for (let intento = 0; intento < 200; intento++) {
    const receta = config.fusiones > 0 ? RECETAS[Math.floor(rnd() * RECETAS.length)] : null;
    const reservados = new Set<ColorId>(receta ? [receta.a, receta.b, receta.resultado] : []);

    const libres = barajar(COLORES.filter((c) => !reservados.has(c)), rnd);
    const coloresBase = receta ? [receta.resultado, ...libres.slice(0, config.colores - 1)] : libres.slice(0, config.colores);
    const coloresLluvia = libres.slice(config.colores - (receta ? 1 : 0)).slice(0, config.lotesLluvia);

    const bolas: Bola[] = [];
    for (const color of coloresBase) {
      const partidas = receta && color === receta.resultado ? config.fusiones : 0;
      for (let i = 0; i < CAPACIDAD - partidas; i++) bolas.push(nuevaBola(color));
      for (let i = 0; i < partidas; i++) {
        bolas.push(nuevaBola(receta!.a, true), nuevaBola(receta!.b, true));
      }
    }
    barajar(bolas, rnd);

    const totalTubos = config.colores + config.tubosVacios;
    const tubos: Tubo[] = Array.from({ length: totalTubos }, () => ({ bolas: [], sellado: false }));
    bolas.forEach((b, i) => tubos[Math.floor(i / CAPACIDAD)].bolas.push(b));

    // Ningún tubo debe empezar ya resuelto
    const yaResuelto = tubos.some(
      (t) => t.bolas.length === CAPACIDAD && t.bolas.every((b) => b.color === t.bolas[0].color && !b.ingrediente),
    );
    if (yaResuelto) continue;
    if (!tieneSolucion(tubos)) continue;

    barajar(tubos, rnd);

    // Niebla: oculta una parte de las bolas que no están arriba
    for (const t of tubos) {
      for (let i = 0; i < t.bolas.length - 1; i++) {
        if (rnd() < config.niebla) t.bolas[i].oculta = true;
      }
    }

    return { tubos, coloresBase, coloresLluvia, config };
  }
  throw new Error(`No se pudo generar el nivel ${nivel}`);
}
