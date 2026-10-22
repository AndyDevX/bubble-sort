import { es } from './es';

export type ClaveTexto = keyof typeof es;
export type Textos = Record<ClaveTexto, string>;

// Para añadir un idioma: crea su archivo (p. ej. en.ts) con las mismas claves y regístralo aquí
const IDIOMAS = {
  es,
} satisfies Record<string, Textos>;

export type CodigoIdioma = keyof typeof IDIOMAS;

export const CODIGOS_IDIOMA = Object.keys(IDIOMAS) as CodigoIdioma[];

let idiomaActual: CodigoIdioma = 'es';

export function esIdiomaValido(codigo: string): codigo is CodigoIdioma {
  return codigo in IDIOMAS;
}

export function setIdioma(codigo: CodigoIdioma): void {
  idiomaActual = codigo;
}

export function getIdioma(): CodigoIdioma {
  return idiomaActual;
}

export function nombreDeIdioma(codigo: CodigoIdioma): string {
  return IDIOMAS[codigo].nombreIdioma;
}

// t('nivel', { n: 3 }) → 'Nivel 3'
export function t(clave: ClaveTexto, valores?: Record<string, string | number>): string {
  const texto = IDIOMAS[idiomaActual][clave];
  if (!valores) return texto;
  return texto.replace(/\{(\w+)\}/g, (_, nombre: string) => String(valores[nombre] ?? `{${nombre}}`));
}
