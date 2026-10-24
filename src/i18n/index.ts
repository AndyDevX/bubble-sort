import { de } from './de';
import { en } from './en';
import { es } from './es';
import { ja } from './ja';
import { pt } from './pt';
import { ru } from './ru';
import { zh } from './zh';

export type ClaveTexto = keyof typeof es;
export type Textos = Record<ClaveTexto, string>;

// Para añadir un idioma: crea su archivo (p. ej. fr.ts) con las mismas claves (tipo `Textos`) y
// regístralo aquí. El orden es el del selector de Ajustes. Si usa otro alfabeto, revisa la fuente
// (`fuenteDeIdioma` en src/ui/tema.ts y la carga en main.ts).
const IDIOMAS = {
  es,
  en,
  pt,
  de,
  ru,
  zh,
  ja,
} satisfies Record<string, Textos>;

export type CodigoIdioma = keyof typeof IDIOMAS;

export const CODIGOS_IDIOMA = Object.keys(IDIOMAS) as CodigoIdioma[];

let idiomaActual: CodigoIdioma = 'es';

export function esIdiomaValido(codigo: string): codigo is CodigoIdioma {
  return codigo in IDIOMAS;
}

/**
 * Idioma del dispositivo (el primero de `navigator.languages` que el juego tenga), para la primera
 * vez que se abre; si no hay ninguno, inglés.
 */
export function idiomaDelDispositivo(): CodigoIdioma {
  const preferidos = typeof navigator === 'undefined' ? [] : navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const etiqueta of preferidos) {
    const codigo = (etiqueta ?? '').toLowerCase().split('-')[0];
    if (esIdiomaValido(codigo)) return codigo;
  }
  return 'en';
}

export function setIdioma(codigo: CodigoIdioma): void {
  idiomaActual = codigo;
  document.documentElement.lang = codigo;
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
