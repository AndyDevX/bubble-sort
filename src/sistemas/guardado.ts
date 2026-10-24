import { almacen } from './almacen';

// Progreso de la partida (localStorage o, en CrazyGames, su Data Module: ver almacen.ts)

// Habilidades compradas en la tienda (usos que quedan; no caducan al cambiar de nivel)
export interface Inventario {
  deshacer: number;
  tuboExtra: number;
}

export type Articulo = keyof Inventario;

export interface Guardado {
  nivel: number;       // nivel que toca jugar
  mejorNivel: number;  // récord
  monedas: number;
  inventario: Inventario;
}

const CLAVE_GUARDADO = 'odi-sort:partida';

const POR_DEFECTO: Guardado = { nivel: 1, mejorNivel: 1, monedas: 0, inventario: { deshacer: 0, tuboExtra: 0 } };

function entero(valor: unknown, porDefecto: number, minimo: number): number {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= minimo ? valor : porDefecto;
}

function cargar(): Guardado {
  try {
    const datos = JSON.parse(almacen.getItem(CLAVE_GUARDADO) ?? '{}') as Partial<Record<keyof Guardado, unknown>>;
    // Los guardados anteriores a la tienda no tienen inventario: se empieza con 0
    const inventario = (datos.inventario ?? {}) as Partial<Record<Articulo, unknown>>;
    return {
      nivel: entero(datos.nivel, POR_DEFECTO.nivel, 1),
      mejorNivel: entero(datos.mejorNivel, POR_DEFECTO.mejorNivel, 1),
      monedas: entero(datos.monedas, POR_DEFECTO.monedas, 0),
      inventario: {
        deshacer: entero(inventario.deshacer, 0, 0),
        tuboExtra: entero(inventario.tuboExtra, 0, 0),
      },
    };
  } catch {
    return { ...POR_DEFECTO, inventario: { ...POR_DEFECTO.inventario } };
  }
}

// Se lee la primera vez que se pide (en CrazyGames, después de iniciar su SDK: ver almacen.ts)
let actualCache: ReturnType<typeof cargar> | null = null;
const actualDatos = () => (actualCache ??= cargar());

export function getGuardado(): Readonly<Guardado> {
  return actualDatos();
}

export function actualizarGuardado(cambios: Partial<Guardado>): void {
  actualCache = { ...actualDatos(), ...cambios };
  try {
    almacen.setItem(CLAVE_GUARDADO, JSON.stringify(actualDatos()));
  } catch {
    // Sin almacenamiento disponible: el progreso dura solo esta sesión
  }
}

// Borra todo el progreso (nivel, récord, monedas e inventario). Los ajustes no se tocan.
export function borrarProgreso(): void {
  actualCache = { ...POR_DEFECTO, inventario: { ...POR_DEFECTO.inventario } };
  try {
    almacen.removeItem(CLAVE_GUARDADO);
  } catch {
    // Sin almacenamiento: basta con la copia en memoria
  }
}
