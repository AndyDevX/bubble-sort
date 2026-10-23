// Paleta del juego: 18 colores. El valor es el tono para tintes (tubo sellado, chispas). Los
// especiales (Azul divino, Plata, Jade, Amatista, Esmeralda, Oro, Carmesí) tienen además un dibujo
// propio en interiores.ts.
export const PALETA = {
  rojo: 0xe53935,
  azul: 0x1e88e5,
  azulDivino: 0x1a3cd0, // azul de las capas de seda sobre azul noche (dibujo propio en texturas.ts)
  amarillo: 0xfdd835,
  verde: 0x43a047,
  naranja: 0xfb8c00,
  morado: 0x8e24aa,
  rosa: 0xf06292,
  cian: 0x26c6da,
  lima: 0xc0ca33,
  marron: 0x8d6e63,
  blanco: 0xeceff1,
  plata: 0xc4c8d0, // nebulosa gris con purpurina
  jade: 0x00968a, // satén líquido verde azulado
  amatista: 0x9a5ae0, // barras verticales de luz violeta
  esmeralda: 0x3fae4a, // cristal verde con bokeh
  oro: 0xffc83d, // luz dorada en movimiento
  carmesi: 0xa3060f, // cáusticas de agua roja
} as const;

export type ColorId = keyof typeof PALETA;

export const COLORES = Object.keys(PALETA) as ColorId[];

// Familias de tonos parecidos: el generador evita juntar dos de la misma en un nivel si puede
export const FAMILIA: Record<ColorId, string> = {
  rojo: 'rojo',
  carmesi: 'rojo',
  azul: 'azul',
  azulDivino: 'azul',
  amarillo: 'amarillo',
  oro: 'amarillo',
  verde: 'verde',
  esmeralda: 'verde',
  cian: 'cian',
  jade: 'cian',
  morado: 'morado',
  amatista: 'morado',
  blanco: 'blanco',
  plata: 'blanco',
  naranja: 'naranja',
  rosa: 'rosa',
  lima: 'lima',
  marron: 'marron',
};

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
