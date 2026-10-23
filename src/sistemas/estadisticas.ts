import { COLORES, type ColorId } from '../juego/colores';

// Estadísticas del jugador en localStorage (pantalla «Estadísticas» del menú).
// Se guardan con un pequeño retraso para no escribir en cada jugada.

export type Habilidad = 'deshacer' | 'tuboExtra' | 'gravedad';

export interface Estadisticas {
  nivelesSuperados: number;
  nivelesGenerados: number;
  nivelesFallidos: number;
  habilidades: Record<Habilidad, number>;
  tubosLlenos: Partial<Record<ColorId, number>>; // tubos sellados por color
  canicasMovidas: Partial<Record<ColorId, number>>; // canicas movidas por el jugador, por color
}

const CLAVE = 'odi-sort:estadisticas';
const RETRASO_GUARDADO_MS = 800;

const vacias = (): Estadisticas => ({
  nivelesSuperados: 0,
  nivelesGenerados: 0,
  nivelesFallidos: 0,
  habilidades: { deshacer: 0, tuboExtra: 0, gravedad: 0 },
  tubosLlenos: {},
  canicasMovidas: {},
});

const entero = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : 0);

function porColor(v: unknown): Partial<Record<ColorId, number>> {
  const salida: Partial<Record<ColorId, number>> = {};
  if (!v || typeof v !== 'object') return salida;
  for (const color of COLORES) {
    const n = entero((v as Record<string, unknown>)[color]);
    if (n > 0) salida[color] = n;
  }
  return salida;
}

function cargar(): Estadisticas {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE) ?? '{}') as Record<string, unknown>;
    const h = (d.habilidades ?? {}) as Record<string, unknown>;
    return {
      nivelesSuperados: entero(d.nivelesSuperados),
      nivelesGenerados: entero(d.nivelesGenerados),
      nivelesFallidos: entero(d.nivelesFallidos),
      habilidades: { deshacer: entero(h.deshacer), tuboExtra: entero(h.tuboExtra), gravedad: entero(h.gravedad) },
      tubosLlenos: porColor(d.tubosLlenos),
      canicasMovidas: porColor(d.canicasMovidas),
    };
  } catch {
    return vacias();
  }
}

let actual = cargar();
let pendiente: ReturnType<typeof setTimeout> | null = null;

function escribir() {
  if (pendiente) clearTimeout(pendiente);
  pendiente = null;
  try {
    localStorage.setItem(CLAVE, JSON.stringify(actual));
  } catch {
    // Sin almacenamiento: las estadísticas duran solo esta sesión
  }
}

function guardar() {
  if (!pendiente) pendiente = setTimeout(escribir, RETRASO_GUARDADO_MS);
}

// Si se cierra o se oculta la página con un guardado pendiente, se escribe ya
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => pendiente && escribir());
  document.addEventListener('visibilitychange', () => document.hidden && pendiente && escribir());
}

export function getEstadisticas(): Readonly<Estadisticas> {
  return actual;
}

export function sumarNivel(tipo: 'nivelesSuperados' | 'nivelesGenerados' | 'nivelesFallidos'): void {
  actual[tipo]++;
  guardar();
}

export function sumarHabilidad(habilidad: Habilidad): void {
  actual.habilidades[habilidad]++;
  guardar();
}

export function sumarColor(tipo: 'tubosLlenos' | 'canicasMovidas', color: ColorId, cantidad = 1): void {
  actual[tipo][color] = (actual[tipo][color] ?? 0) + cantidad;
  guardar();
}

// Total de todos los colores
export function total(tipo: 'tubosLlenos' | 'canicasMovidas'): number {
  return Object.values(actual[tipo]).reduce((a, b) => a + (b ?? 0), 0);
}

export function borrarEstadisticas(): void {
  actual = vacias();
  if (pendiente) clearTimeout(pendiente);
  pendiente = null;
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    // Sin almacenamiento: basta con la copia en memoria
  }
}
