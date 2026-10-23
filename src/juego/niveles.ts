import { FAMILIA, RECETAS, type ColorId } from './colores';
import { CAPACIDAD, nuevaBola, type Bola, type Tubo } from './modelo';
import { tieneSolucion } from './solucionador';

export interface ConfigNivel {
  colores: number;          // grupos de 4 a ordenar
  tubosVacios: number;      // 2 + uno por tanda de lluvia (la lluvia nunca llena el tablero)
  desbloqueados: number;    // colores de ORDEN_COLORES desbloqueados (los únicos que se ordenan)
  fusiones: number;         // bolas del color resultado que llegan partidas en dos ingredientes
  niebla: number;           // 0..1: proporción de bolas (no de arriba) ocultas
  lotesLluvia: number;      // tandas de 4 bolas que caen a partir del 35 %
  intervaloLluviaMs: number;
  bloque: number;           // tramo de dificultad: sube con cada desbloqueo (y cada 10 niveles al final)
  dificil: boolean;         // último nivel del bloque: más difícil que el resto, con aviso y monedas dobles
}

// Orden de los colores: se empieza con 4 básicos, después se desbloquean los demás básicos y al
// final los 7 especiales (con dibujo propio). Las recetas de alquimia usan solo básicos.
export const ORDEN_COLORES: ColorId[] = [
  'rojo', 'azul', 'amarillo', 'verde',
  'naranja', 'morado', 'rosa', 'cian', 'lima', 'marron', 'blanco',
  'azulDivino', 'jade', 'plata', 'amatista', 'esmeralda', 'carmesi', 'oro',
];
export const COLORES_DE_SALIDA = 4;

// Niveles entre un desbloqueo y el siguiente: entre 5 y 12, distinto según el color (el primero
// cuenta desde el nivel 1). Los básicos van más seguidos (5–7) para que la curva de colores por
// nivel no se frene; los especiales, más espaciados (6–12).
export const SALTO_MINIMO = 5;
export const SALTO_MAXIMO = 12;
const SALTOS_DESBLOQUEO = [
  5, 6, 5, 7, 5, 6, 5, // naranja, morado, rosa, cian, lima, marrón, blanco
  8, 10, 6, 12, 7, 9, 11, // azul divino, jade, plata, amatista, esmeralda, carmesí, oro
];

// Nivel en que se desbloquea cada color (acumulado desde el nivel 1)
const NIVELES_DESBLOQUEO = SALTOS_DESBLOQUEO.reduce<number[]>((lista, salto) => [...lista, (lista.at(-1) ?? 1) + salto], []);

// Cuántos colores hay desbloqueados al jugar un nivel
function desbloqueadosEn(nivel: number): number {
  return COLORES_DE_SALIDA + NIVELES_DESBLOQUEO.filter((n) => n <= nivel).length;
}

// ───────────── Bloques de dificultad ─────────────
// Un bloque va de un desbloqueo al siguiente. Cuando ya no quedan colores, sigue habiendo un bloque
// nuevo cada BLOQUE_FINAL niveles, así la dificultad no deja de crecer.
const BLOQUE_FINAL = 10;
const ULTIMO_DESBLOQUEO = NIVELES_DESBLOQUEO[NIVELES_DESBLOQUEO.length - 1];

// Nivel en que empieza cada bloque (0 = nivel 1)
function inicioBloque(bloque: number): number {
  if (bloque === 0) return 1;
  if (bloque <= NIVELES_DESBLOQUEO.length) return NIVELES_DESBLOQUEO[bloque - 1];
  return ULTIMO_DESBLOQUEO + (bloque - NIVELES_DESBLOQUEO.length) * BLOQUE_FINAL;
}

export function bloqueDe(nivel: number): number {
  if (nivel < ULTIMO_DESBLOQUEO) return NIVELES_DESBLOQUEO.filter((n) => n <= nivel).length;
  return NIVELES_DESBLOQUEO.length + Math.floor((nivel - ULTIMO_DESBLOQUEO) / BLOQUE_FINAL);
}

// El nivel difícil de cada bloque es el último, justo antes del siguiente desbloqueo
export function esNivelDificil(nivel: number): boolean {
  return nivel > 1 && inicioBloque(bloqueDe(nivel) + 1) === nivel + 1;
}

// Colores a ordenar: muy pocos al principio y uno más cada vez más niveles; 8 desde el bloque 8
function coloresPorNivel(nivel: number, bloque: number): number {
  if (bloque >= 8) return 8;
  if (nivel <= 3) return 3;
  if (nivel <= 7) return 4;
  if (nivel <= 12) return 5;
  if (nivel <= 19) return 6;
  return 7;
}

// Dificultad por nivel: todas las mecánicas activas, con intensidad que crece con el número de
// nivel al principio y, después, con cada bloque (desbloqueo): más niebla, lluvia más rápida, una
// tercera tanda de lluvia, tres fusiones y 8 colores. Los colores a ordenar (y los 2 ingredientes de
// una fusión) tienen que estar desbloqueados. La lluvia puede usar un color por descubrir (cae
// congelada). El último nivel de cada bloque es «difícil»: más niebla, lluvia más rápida, una tanda
// más y una fusión más.
export function configNivel(nivel: number): ConfigNivel {
  const desbloqueados = desbloqueadosEn(nivel);
  const bloque = bloqueDe(nivel);
  const dificil = esNivelDificil(nivel);

  // Los colores se calculan dejando sitio a los 2 ingredientes (mínimo 3), así no bajan cuando
  // llega la primera fusión; la fusión se activa en cuanto cabe en la paleta.
  const colores = nivel < 3 ? 3 : Math.max(3, Math.min(coloresPorNivel(nivel, bloque), desbloqueados - 2));
  let fusiones = nivel < 3 ? 0 : nivel < 9 ? 1 : bloque >= 10 ? 3 : 2;
  let lotesLluvia = nivel < 9 ? 1 : bloque >= 7 ? 3 : 2;
  // La niebla crece con el nivel hasta el 60 % y después con el bloque, hasta el 80 %
  let niebla = Math.min((nivel - 1) * 0.05, Math.min(0.8, 0.6 + 0.015 * bloque));
  // La lluvia acelera con el nivel hasta 2,5 s y después con el bloque, hasta 1,6 s
  let intervaloLluviaMs = Math.max(6000 - nivel * 150, Math.max(1600, 2500 - 65 * bloque));

  if (dificil) {
    niebla = Math.min(0.85, niebla + 0.15);
    intervaloLluviaMs = Math.max(1300, Math.round(intervaloLluviaMs * 0.8));
    lotesLluvia += 1;
    fusiones = Math.min(4, fusiones + 1);
  }
  if (colores + 2 > desbloqueados) fusiones = 0; // aún no caben los ingredientes

  return {
    colores,
    tubosVacios: 2 + lotesLluvia,
    desbloqueados,
    fusiones,
    niebla,
    lotesLluvia,
    intervaloLluviaMs,
    bloque,
    dificil,
  };
}

// Nivel en que se desbloquea un color (1 = de salida). Se deriva de configNivel, así el catálogo
// nunca puede contradecir al juego.
export function nivelDesbloqueo(color: ColorId): number {
  const posicion = ORDEN_COLORES.indexOf(color);
  for (let n = 1; n < 500; n++) if (configNivel(n).desbloqueados > posicion) return n;
  return Infinity;
}

// Color que se desbloquea al empezar este nivel (para avisar al jugador), o null
export function colorNuevo(nivel: number): ColorId | null {
  if (nivel <= 1) return null;
  const antes = configNivel(nivel - 1).desbloqueados;
  const ahora = configNivel(nivel).desbloqueados;
  return ahora > antes ? ORDEN_COLORES[ahora - 1] : null;
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
    const disponibles = ORDEN_COLORES.slice(0, config.desbloqueados);
    const recetas = RECETAS.filter((r) => [r.a, r.b, r.resultado].every((c) => disponibles.includes(c)));
    const receta = config.fusiones > 0 && recetas.length > 0 ? recetas[Math.floor(rnd() * recetas.length)] : null;
    const reservados = new Set<ColorId>(receta ? [receta.a, receta.b, receta.resultado] : []);

    // El color nuevo del nivel (si lo hay) siempre aparece entre los que hay que ordenar.
    // Después van primero los de familias que aún no salen (para no juntar, p. ej., Oro y Amarillo)
    // y al final los que repiten familia, por si hacen falta.
    const nuevo = colorNuevo(nivel);
    const familias = new Set([...reservados].map((c) => FAMILIA[c]));
    const libres: ColorId[] = [];
    if (nuevo && !reservados.has(nuevo)) {
      libres.push(nuevo);
      familias.add(FAMILIA[nuevo]);
    }
    const repetidos: ColorId[] = [];
    for (const c of barajar(disponibles.filter((c) => !reservados.has(c) && c !== nuevo), rnd)) {
      if (familias.has(FAMILIA[c])) {
        repetidos.push(c);
      } else {
        libres.push(c);
        familias.add(FAMILIA[c]);
      }
    }
    libres.push(...repetidos);
    const coloresBase = receta ? [receta.resultado, ...libres.slice(0, config.colores - 1)] : libres.slice(0, config.colores);
    // Lluvia: colores desbloqueados que no salen en el nivel; si no quedan, uno aún por descubrir
    // (cae congelado, así que no se ve como bola normal antes de tiempo)
    const sinUsar = libres.slice(config.colores - (receta ? 1 : 0));
    const porDescubrir = barajar(ORDEN_COLORES.slice(config.desbloqueados), rnd);
    const coloresLluvia = [...sinUsar, ...porDescubrir].slice(0, config.lotesLluvia);

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
