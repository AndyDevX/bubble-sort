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
}

export type Movimiento = { tipo: 'mover' } | { tipo: 'fusionar'; resultado: ColorId };

export interface ResultadoMovimiento {
  movimiento: Movimiento;
  bola: Bola;               // la bola que sale del origen
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

export function evaluarMovimiento(tubos: Tubo[], origen: number, destino: number): Movimiento | null {
  if (origen === destino) return null;
  const desde = tubos[origen];
  const hacia = tubos[destino];
  if (desde.sellado || hacia.sellado) return null;

  const bola = arriba(desde);
  if (!bola) return null;

  const tope = arriba(hacia);
  if (!tope) return { tipo: 'mover' };
  if (tope.color === bola.color) return hacia.bolas.length < CAPACIDAD ? { tipo: 'mover' } : null;

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
  const bola = desde.bolas.pop()!;

  let fusionadaCon: Bola | undefined;
  let creada: Bola | undefined;

  if (mov.tipo === 'mover') {
    hacia.bolas.push(bola);
  } else {
    fusionadaCon = hacia.bolas.pop()!;
    creada = nuevaBola(mov.resultado);
    hacia.bolas.push(creada);
  }

  const sellado = intentarSellar(hacia);
  const reveladas = revelarTopes(tubos);
  return { movimiento: mov, bola, fusionadaCon, creada, reveladas, sellado };
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

export function hayHueco(tubos: Tubo[]): boolean {
  return tubos.some((t) => !t.sellado && t.bolas.length < CAPACIDAD);
}
