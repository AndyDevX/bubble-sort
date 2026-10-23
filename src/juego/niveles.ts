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
}

// Orden de los colores: los 11 básicos están disponibles desde el principio y los 7 especiales
// (con dibujo propio) se desbloquean después, uno a uno. Las recetas de alquimia usan solo básicos.
export const ORDEN_COLORES: ColorId[] = [
  'rojo', 'azul', 'amarillo', 'verde', 'naranja', 'morado', 'rosa', 'cian', 'lima', 'marron', 'blanco',
  'azulDivino', 'jade', 'plata', 'amatista', 'esmeralda', 'carmesi', 'oro',
];
export const COLORES_DE_SALIDA = 11;

// Niveles entre un desbloqueo y el siguiente (3–6, distinto según el color; media ≈ 4,6, es decir,
// más de un color nuevo cada 5 niveles). El primero cuenta desde el nivel 1.
const SALTOS_DESBLOQUEO = [4, 5, 3, 6, 4, 5, 5];

// Nivel en que se desbloquea cada especial (acumulado desde el nivel 1)
const NIVELES_DESBLOQUEO = SALTOS_DESBLOQUEO.reduce<number[]>((lista, salto) => [...lista, (lista.at(-1) ?? 1) + salto], []);

// Cuántos colores hay desbloqueados al jugar un nivel
function desbloqueadosEn(nivel: number): number {
  return COLORES_DE_SALIDA + NIVELES_DESBLOQUEO.filter((n) => n <= nivel).length;
}

// Colores a ordenar: muy pocos al principio y uno más cada vez más niveles
function coloresPorNivel(nivel: number): number {
  if (nivel <= 3) return 3;
  if (nivel <= 7) return 4;
  if (nivel <= 12) return 5;
  if (nivel <= 19) return 6;
  return 7;
}

// Dificultad por nivel: todas las mecánicas activas, con intensidad creciente. Con 11 colores de
// salida siempre caben base (máx. 7) + 2 ingredientes + 2 colores de lluvia.
export function configNivel(nivel: number): ConfigNivel {
  const lotesLluvia = nivel < 9 ? 1 : 2;
  return {
    colores: coloresPorNivel(nivel),
    tubosVacios: 2 + lotesLluvia,
    desbloqueados: desbloqueadosEn(nivel),
    fusiones: nivel < 3 ? 0 : nivel < 9 ? 1 : 2,
    niebla: Math.min(0.6, (nivel - 1) * 0.05),
    lotesLluvia,
    intervaloLluviaMs: Math.max(2500, 6000 - nivel * 150),
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
    // Lluvia: colores desbloqueados que no salen en el nivel (con 11 de salida siempre quedan; por
    // si acaso, se recurre a uno aún por descubrir, que cae congelado)
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
