import type { ColorId } from '../juego/colores';
import { t, type ClaveTexto } from './index';

// Nombre visible de cada color (aviso de color nuevo, catálogo)
const NOMBRES_COLOR: Record<ColorId, ClaveTexto> = {
  rojo: 'colorRojo',
  azul: 'colorAzul',
  azulDivino: 'colorAzulDivino',
  amarillo: 'colorAmarillo',
  verde: 'colorVerde',
  naranja: 'colorNaranja',
  morado: 'colorMorado',
  rosa: 'colorRosa',
  cian: 'colorCian',
  lima: 'colorLima',
  marron: 'colorMarron',
  blanco: 'colorBlanco',
  plata: 'colorPlata',
  jade: 'colorJade',
  amatista: 'colorAmatista',
  esmeralda: 'colorEsmeralda',
  oro: 'colorOro',
  carmesi: 'colorCarmesi',
};

export function nombreColor(color: ColorId): string {
  return t(NOMBRES_COLOR[color]);
}
