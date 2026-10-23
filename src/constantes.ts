export const NOMBRE_JUEGO = 'Odi Sort';

// Versión del juego (package.json): el PATCH sube en cada despliegue
export const VERSION = import.meta.env.VITE_VERSION;

// Build: cada despliegue en GitHub Pages es un número nuevo; en local es "dev"
export const NUMERO_BUILD = import.meta.env.VITE_NUMERO_BUILD ?? 'dev';
export const COMMIT_BUILD = (import.meta.env.VITE_COMMIT ?? '').slice(0, 7);

export const Colores = {
  fondo: 0x1d1d2b,
  primario: 0x4fc3f7,
  primarioClaro: 0x81d4fa,
  panel: 0x2a2a3d,
  pista: 0x44445e,
} as const;
