import { COLORES, type ColorId } from '../juego/colores';
import { clonarTubos, type Tubo } from '../juego/modelo';
import type { Nivel } from '../juego/niveles';

// Configuración inicial del nivel en curso, para poder reiniciarlo igual
// (también tras cerrar el juego). Se guarda al generar un nivel nuevo.

const CLAVE = 'odi-sort:nivel';

// Copia en memoria por si el navegador no deja guardar (modo privado, almacenamiento lleno)
let enMemoria: string | null = null;

interface NivelGuardado {
  numero: number;
  nivel: Nivel; // (los guardados antiguos traen además `ventajas`, que ya no se usa)
}

const esColor = (c: unknown): c is ColorId => typeof c === 'string' && (COLORES as string[]).includes(c);

function esTuboValido(t: unknown): t is Tubo {
  if (!t || typeof t !== 'object') return false;
  const tubo = t as Partial<Tubo>;
  return (
    typeof tubo.sellado === 'boolean' &&
    Array.isArray(tubo.bolas) &&
    tubo.bolas.every((b) => b && esColor(b.color) && typeof b.oculta === 'boolean' && typeof b.ingrediente === 'boolean')
  );
}

export function guardarNivel(numero: number, nivel: Nivel): void {
  enMemoria = JSON.stringify({ numero, nivel } satisfies NivelGuardado);
  try {
    localStorage.setItem(CLAVE, enMemoria);
  } catch {
    // Sin almacenamiento: reiniciar seguirá funcionando mientras no se cierre el juego
  }
}

// Devuelve una copia del nivel guardado si es del número pedido (con ids de bola nuevos)
export function cargarNivel(numero: number): Nivel | null {
  try {
    let texto: string | null = null;
    try {
      texto = localStorage.getItem(CLAVE);
    } catch {
      // sin acceso al almacenamiento: se usa la copia en memoria
    }
    const datos = JSON.parse(texto ?? enMemoria ?? 'null') as NivelGuardado | null;
    if (!datos || datos.numero !== numero || !datos.nivel) return null;
    const { tubos, coloresBase, coloresLluvia, config } = datos.nivel;
    if (!Array.isArray(tubos) || !tubos.every(esTuboValido)) return null;
    if (!Array.isArray(coloresBase) || !coloresBase.every(esColor)) return null;
    if (!Array.isArray(coloresLluvia) || !coloresLluvia.every(esColor)) return null;
    if (!config || typeof config.intervaloLluviaMs !== 'number') return null;
    return { tubos: clonarTubos(tubos, true), coloresBase, coloresLluvia, config };
  } catch {
    return null;
  }
}

export function borrarNivelGuardado(): void {
  enMemoria = null;
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    // Sin almacenamiento: basta con la copia en memoria
  }
}
