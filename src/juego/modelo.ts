import { buscarFusion, type ColorId } from './colores';

export const CAPACIDAD = 4;

export interface Bola {
  id: number;
  color: ColorId;
  oculta: boolean;      // niebla: se ve como "?" hasta que queda arriba
  ingrediente: boolean; // alquimia: solo sirve para fusionarse
}

export interface Tubo {
  bolas: Bola[]; // bolas[0] = fondo, la última = arriba
  sellado: boolean;
  capacidad?: number; // por defecto CAPACIDAD; el tubo de emergencia tiene 1
}

export function capacidadDe(tubo: Tubo): number {
  return tubo.capacidad ?? CAPACIDAD;
}

// mover: se mueve el grupo de bolas iguales de arriba (tantas como quepan)
export type Movimiento = { tipo: 'mover'; cantidad: number } | { tipo: 'fusionar'; resultado: ColorId };

export interface ResultadoMovimiento {
  movimiento: Movimiento;
  bolas: Bola[];            // las bolas que salen del origen (de abajo a arriba)
  fusionadaCon?: Bola;      // fusión: la bola de arriba del destino que desaparece
  creada?: Bola;            // fusión: la bola nueva
  reveladas: Bola[];
  sellado: boolean;         // el destino ha quedado sellado
}

let siguienteId = 1;

export function nuevaBola(color: ColorId, ingrediente = false, oculta = false): Bola {
  return { id: siguienteId++, color, oculta, ingrediente };
}

export function arriba(tubo: Tubo): Bola | undefined {
  return tubo.bolas[tubo.bolas.length - 1];
}

// Cuántas bolas seguidas del mismo color hay arriba del tubo (incluidas las ocultas)
export function grupoSuperior(tubo: Tubo): number {
  const tope = arriba(tubo);
  if (!tope) return 0;
  let n = 0;
  for (let i = tubo.bolas.length - 1; i >= 0; i--) {
    const b = tubo.bolas[i];
    if (b.color !== tope.color || b.ingrediente !== tope.ingrediente) break;
    n++;
  }
  return n;
}

export function evaluarMovimiento(tubos: Tubo[], origen: number, destino: number): Movimiento | null {
  if (origen === destino) return null;
  const desde = tubos[origen];
  const hacia = tubos[destino];
  if (desde.sellado || hacia.sellado) return null;

  const bola = arriba(desde);
  if (!bola) return null;

  const tope = arriba(hacia);
  const libres = capacidadDe(hacia) - hacia.bolas.length;
  if (!tope) return { tipo: 'mover', cantidad: Math.min(grupoSuperior(desde), libres) };
  if (tope.color === bola.color) {
    return libres > 0 ? { tipo: 'mover', cantidad: Math.min(grupoSuperior(desde), libres) } : null;
  }

  // Colores distintos: solo si dos ingredientes forman una receta
  if (bola.ingrediente && tope.ingrediente) {
    const resultado = buscarFusion(bola.color, tope.color);
    if (resultado) return { tipo: 'fusionar', resultado };
  }
  return null;
}

// Revela la bola de arriba de cada tubo; devuelve las que se acaban de revelar
export function revelarTopes(tubos: Tubo[]): Bola[] {
  const reveladas: Bola[] = [];
  for (const tubo of tubos) {
    const tope = arriba(tubo);
    if (tope?.oculta) {
      tope.oculta = false;
      reveladas.push(tope);
    }
  }
  return reveladas;
}

// Un tubo se sella con 4 bolas del mismo color (los ingredientes nunca sellan)
export function intentarSellar(tubo: Tubo): boolean {
  if (tubo.sellado || tubo.bolas.length !== CAPACIDAD) return false;
  const color = tubo.bolas[0].color;
  if (!tubo.bolas.every((b) => b.color === color && !b.ingrediente)) return false;
  tubo.sellado = true;
  for (const b of tubo.bolas) b.oculta = false;
  return true;
}

export function aplicarMovimiento(tubos: Tubo[], origen: number, destino: number, mov: Movimiento): ResultadoMovimiento {
  const desde = tubos[origen];
  const hacia = tubos[destino];

  let bolas: Bola[];
  let fusionadaCon: Bola | undefined;
  let creada: Bola | undefined;
  const reveladas: Bola[] = [];

  if (mov.tipo === 'mover') {
    bolas = desde.bolas.splice(desde.bolas.length - mov.cantidad, mov.cantidad);
    // Las ocultas que viajan en el grupo se descubren
    for (const b of bolas) {
      if (b.oculta) {
        b.oculta = false;
        reveladas.push(b);
      }
    }
    hacia.bolas.push(...bolas);
  } else {
    bolas = [desde.bolas.pop()!];
    fusionadaCon = hacia.bolas.pop()!;
    creada = nuevaBola(mov.resultado);
    hacia.bolas.push(creada);
  }

  const sellado = intentarSellar(hacia);
  reveladas.push(...revelarTopes(tubos));
  return { movimiento: mov, bolas, fusionadaCon, creada, reveladas, sellado };
}

// Giro de gravedad: invierte todos los tubos sin sellar
export function invertirTubos(tubos: Tubo[]): Bola[] {
  for (const tubo of tubos) {
    if (!tubo.sellado) tubo.bolas.reverse();
  }
  return revelarTopes(tubos);
}

export function nivelCompleto(tubos: Tubo[]): boolean {
  return tubos.every((t) => t.sellado || t.bolas.length === 0);
}

// ¿Queda alguna jugada válida?
export function hayMovimientos(tubos: Tubo[]): boolean {
  for (let o = 0; o < tubos.length; o++) {
    for (let d = 0; d < tubos.length; d++) {
      if (evaluarMovimiento(tubos, o, d)) return true;
    }
  }
  return false;
}

export function hayHueco(tubos: Tubo[]): boolean {
  return tubos.some((t) => !t.sellado && t.bolas.length < capacidadDe(t));
}

// Copia profunda de los tubos. Con `idsNuevos`, cada bola recibe un id nuevo
// (para cargar un nivel guardado sin chocar con los ids de esta sesión).
export function clonarTubos(tubos: Tubo[], idsNuevos = false): Tubo[] {
  return tubos.map((t) => ({
    sellado: t.sellado,
    ...(t.capacidad !== undefined ? { capacidad: t.capacidad } : {}),
    bolas: t.bolas.map((b) => (idsNuevos ? { ...b, id: nuevaBola(b.color).id } : { ...b })),
  }));
}

// Bolas bien colocadas: para cada color del nivel, las de ese color apiladas desde el fondo
// de un tubo (si varios tubos empiezan por el mismo color, cuenta el mejor, porque al final
// cada color acaba en un solo tubo). Ingredientes y colores de lluvia no cuentan.
export function bolasBienColocadas(tubos: Tubo[], colores: readonly ColorId[]): number {
  const mejor = new Map<ColorId, number>();
  for (const tubo of tubos) {
    const fondo = tubo.bolas[0];
    if (!fondo || fondo.ingrediente || !colores.includes(fondo.color)) continue;
    let n = 0;
    while (n < tubo.bolas.length && tubo.bolas[n].color === fondo.color && !tubo.bolas[n].ingrediente) n++;
    mejor.set(fondo.color, Math.max(mejor.get(fondo.color) ?? 0, n));
  }
  let total = 0;
  for (const n of mejor.values()) total += n;
  return total;
}
