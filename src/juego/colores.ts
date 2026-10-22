// Paleta del juego: 11 colores fácilmente distinguibles
export const PALETA = {
  rojo: 0xe53935,
  azul: 0x1e88e5,
  amarillo: 0xfdd835,
  verde: 0x43a047,
  naranja: 0xfb8c00,
  morado: 0x8e24aa,
  rosa: 0xf06292,
  cian: 0x26c6da,
  lima: 0xc0ca33,
  marron: 0x8d6e63,
  blanco: 0xeceff1,
} as const;

export type ColorId = keyof typeof PALETA;

export const COLORES = Object.keys(PALETA) as ColorId[];

export interface Receta {
  a: ColorId;
  b: ColorId;
  resultado: ColorId;
}

// Alquimia: dos ingredientes se fusionan en el resultado
export const RECETAS: Receta[] = [
  { a: 'amarillo', b: 'azul', resultado: 'verde' },
  { a: 'rojo', b: 'amarillo', resultado: 'naranja' },
  { a: 'rojo', b: 'azul', resultado: 'morado' },
];

export function buscarFusion(x: ColorId, y: ColorId): ColorId | null {
  for (const r of RECETAS) {
    if ((r.a === x && r.b === y) || (r.a === y && r.b === x)) return r.resultado;
  }
  return null;
}
