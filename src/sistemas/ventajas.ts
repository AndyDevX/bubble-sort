// Ventajas (usos de habilidades especiales) disponibles en cada nivel.
//
// Demo: el tubo de emergencia se sortea al generar el nivel (PROBABILIDAD_TUBO_EMERGENCIA).
// Más adelante los usos vendrán de la tienda o de ver un anuncio: solo hay que cambiar
// `repartirVentajas` (p. ej. leyendo el inventario guardado) sin tocar la partida.

export interface Ventajas {
  tuboEmergencia: number; // usos del tubo de emergencia en este nivel (máximo 1)
}

export const PROBABILIDAD_TUBO_EMERGENCIA = 0.5;

export function repartirVentajas(): Ventajas {
  return { tuboEmergencia: Math.random() < PROBABILIDAD_TUBO_EMERGENCIA ? 1 : 0 };
}

export function ventajasValidas(v: unknown): v is Ventajas {
  return !!v && typeof (v as Ventajas).tuboEmergencia === 'number';
}
