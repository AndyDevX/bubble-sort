// Progreso de la partida en localStorage

export interface Guardado {
  nivel: number;       // nivel que toca jugar
  mejorNivel: number;  // récord
  monedas: number;
}

const CLAVE_GUARDADO = 'odi-sort:partida';

const POR_DEFECTO: Guardado = { nivel: 1, mejorNivel: 1, monedas: 0 };

function entero(valor: unknown, porDefecto: number, minimo: number): number {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= minimo ? valor : porDefecto;
}

function cargar(): Guardado {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_GUARDADO) ?? '{}') as Partial<Record<keyof Guardado, unknown>>;
    return {
      nivel: entero(datos.nivel, POR_DEFECTO.nivel, 1),
      mejorNivel: entero(datos.mejorNivel, POR_DEFECTO.mejorNivel, 1),
      monedas: entero(datos.monedas, POR_DEFECTO.monedas, 0),
    };
  } catch {
    return { ...POR_DEFECTO };
  }
}

let actual = cargar();

export function getGuardado(): Readonly<Guardado> {
  return actual;
}

export function actualizarGuardado(cambios: Partial<Guardado>): void {
  actual = { ...actual, ...cambios };
  try {
    localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(actual));
  } catch {
    // Sin almacenamiento disponible: el progreso dura solo esta sesión
  }
}
