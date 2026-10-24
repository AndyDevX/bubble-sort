import Phaser from 'phaser';
import { alRedimensionar } from './layout';

// Tema visual (v1.0.12): estilo casual claro — fondo crema con manchas suaves, botones «caramelo»
// (cara de color con brillo arriba y relieve oscuro abajo), contadores en pastillas translúcidas,
// insignias rojas y texto marrón con una fuente redondeada. Las canicas y los tubos no cambian.
// Todo color o estilo de texto de la interfaz sale de aquí.

export const FUENTE = '"Fredoka", "Trebuchet MS", sans-serif';

export const Tema = {
  fondo: 0xf7e9d4, // crema
  fondoCss: '#f7e9d4',
  mancha: 0xf0d9bc, // manchas del fondo (un poco más oscuras)
  manchaClara: 0xfbf3e6,
  texto: '#6b4a2f', // marrón para títulos y textos
  textoSuave: '#a0805f', // secundarios (versión, notas)
  textoClaro: '#ffffff', // sobre botones de color
  positivo: '#4f9a2c', // verde (aciertos, mejoras)
  aviso: '#e07b1a', // naranja (nivel difícil, avisos)
  peligro: '#d84a3c', // rojo (errores, faltan monedas)
  info: '#2f7fd0', // azul (puntos flotantes, lluvia)
  panel: 0xfffaf2, // tarjetas y ventanas
  bordePanel: 0xe6cfae,
  sombra: 0x7a5232, // sombras (siempre con alfa bajo)
  pastilla: 0xffffff, // contadores (con alfa)
  pista: 0xe8d6bd, // fondo de barras y sliders
  insignia: 0xef4444,
} as const;

/** Colores de un botón caramelo: cara, relieve (borde inferior) y brillo. */
export interface ColoresBoton {
  cara: number;
  relieve: number;
  brillo: number;
  texto: string;
}

export const Botones = {
  azul: { cara: 0x47a6f2, relieve: 0x2a6fc0, brillo: 0xc4e6ff, texto: '#ffffff' },
  verde: { cara: 0x78c84a, relieve: 0x4a9228, brillo: 0xd6f5bd, texto: '#ffffff' },
  naranja: { cara: 0xffb648, relieve: 0xd9831a, brillo: 0xffe7b8, texto: '#ffffff' },
  rojo: { cara: 0xf2605a, relieve: 0xbd3a33, brillo: 0xffd0cc, texto: '#ffffff' },
  crema: { cara: 0xfff8ee, relieve: 0xd8bf9c, brillo: 0xffffff, texto: '#6b4a2f' },
} satisfies Record<string, ColoresBoton>;

/** Estilo de texto del tema. `negrita` usa el peso 700 de Fredoka (el normal, 500). */
export function estiloTexto(tamano: number, color: string = Tema.texto, negrita = true): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: FUENTE, fontSize: `${tamano}px`, color, fontStyle: negrita ? 'bold' : 'normal' };
}

// ─────────── Fondo ───────────

const CLAVE_FONDO = 'fondo-crema';

// Textura del fondo: crema con manchas grandes y difuminadas (como papel) y algún punto suave.
// Se genera una vez con el canvas 2D (degradados radiales: Graphics no difumina).
function generarFondo(escena: Phaser.Scene): void {
  if (escena.textures.exists(CLAVE_FONDO)) return;
  const ancho = 900;
  const alto = 1600;
  const lienzo = escena.textures.createCanvas(CLAVE_FONDO, ancho, alto);
  if (!lienzo) return;
  const ctx = lienzo.getContext();
  ctx.fillStyle = Tema.fondoCss;
  ctx.fillRect(0, 0, ancho, alto);
  const hex = (c: number, a: number) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;
  // Semilla fija: el fondo es siempre el mismo
  let s = 7;
  const azar = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const mancha = (x: number, y: number, r: number, color: number, a: number) => {
    const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
    g.addColorStop(0, hex(color, a));
    g.addColorStop(0.7, hex(color, a * 0.6));
    g.addColorStop(1, hex(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  for (let i = 0; i < 9; i++) mancha(azar() * ancho, azar() * alto, 260 + azar() * 260, Tema.mancha, 0.55);
  for (let i = 0; i < 7; i++) mancha(azar() * ancho, azar() * alto, 180 + azar() * 200, Tema.manchaClara, 0.7);
  for (let i = 0; i < 26; i++) mancha(azar() * ancho, azar() * alto, 10 + azar() * 22, Tema.mancha, 0.35);
  lienzo.refresh();
}

/**
 * Fondo crema de la escena, siempre cubriendo toda la pantalla (se recoloca al cambiar de
 * tamaño). Las escenas que se abren encima de otra no lo necesitan.
 */
export function crearFondo(escena: Phaser.Scene): Phaser.GameObjects.Image {
  generarFondo(escena);
  const imagen = escena.add.image(0, 0, CLAVE_FONDO).setOrigin(0.5).setDepth(-100);
  alRedimensionar(escena, (ancho, alto) => {
    const escala = Math.max(ancho / 900, alto / 1600);
    imagen.setPosition(ancho / 2, alto / 2).setScale(escala);
  });
  return imagen;
}

/** Velo para las ventanas que se abren encima de otra escena (oscurece en marrón, no en negro). */
export function crearVelo(escena: Phaser.Scene, alfa = 0.45): Phaser.GameObjects.Rectangle {
  const { width, height } = escena.scale;
  return escena.add.rectangle(width / 2, height / 2, width, height, Tema.sombra, alfa).setInteractive().setDepth(-2);
}

/**
 * Panel (tarjeta) crema con borde y sombra suave, como las ventanas del estilo de referencia.
 * Se dibuja en un Graphics para poder repintarlo al cambiar de tamaño.
 */
export function dibujarPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, ancho: number, alto: number, radio = 36): Phaser.GameObjects.Graphics {
  g.clear();
  g.fillStyle(Tema.sombra, 0.18).fillRoundedRect(x + 4, y + 10, ancho, alto, radio);
  g.fillStyle(Tema.bordePanel).fillRoundedRect(x, y, ancho, alto, radio);
  g.fillStyle(Tema.panel).fillRoundedRect(x + 6, y + 6, ancho - 12, alto - 12, radio - 6);
  return g;
}

/** Pastilla translúcida (contadores del HUD: monedas, puntos, lluvia). */
export function dibujarPastilla(g: Phaser.GameObjects.Graphics, x: number, y: number, ancho: number, alto: number): Phaser.GameObjects.Graphics {
  g.clear();
  g.fillStyle(Tema.pastilla, 0.6).fillRoundedRect(x, y, ancho, alto, alto / 2);
  return g;
}

// ─────────── Caramelo (botones) ───────────

/** Alto del relieve inferior de los botones caramelo; al pulsar, la cara baja esta distancia. */
export const RELIEVE = 9;

/**
 * Dibuja un botón caramelo centrado en el origen: sombra, relieve oscuro abajo, cara de color,
 * franja de brillo arriba y dos destellos. Con `hundido`, la cara baja sobre el relieve (pulsado).
 * Devuelve cuánto se desplaza el centro de la cara, para mover el texto o el icono con ella.
 */
export function dibujarCaramelo(g: Phaser.GameObjects.Graphics, ancho: number, alto: number, radio: number, c: ColoresBoton, hundido = false): number {
  const x = -ancho / 2;
  const y = -alto / 2;
  const baja = hundido ? RELIEVE - 3 : 0;
  g.clear();
  g.fillStyle(Tema.sombra, 0.2).fillRoundedRect(x + 2, y + 8, ancho, alto, radio);
  g.fillStyle(c.relieve).fillRoundedRect(x, y + baja, ancho, alto - baja, radio);
  const altoCara = alto - RELIEVE;
  g.fillStyle(c.cara).fillRoundedRect(x, y + baja, ancho, altoCara, radio);
  // Brillo: franja clara en la mitad de arriba y dos destellos blancos a la izquierda
  const r2 = Math.min(radio * 0.7, altoCara * 0.2);
  g.fillStyle(c.brillo, 0.45).fillRoundedRect(x + radio * 0.45, y + baja + altoCara * 0.1, ancho - radio * 0.9, altoCara * 0.36, r2);
  g.fillStyle(0xffffff, 0.85).fillEllipse(x + radio * 0.85, y + baja + altoCara * 0.24, Math.max(6, radio * 0.42), Math.max(4, radio * 0.26));
  g.fillStyle(0xffffff, 0.7).fillCircle(x + radio * 1.35, y + baja + altoCara * 0.2, Math.max(2, radio * 0.09));
  return baja - RELIEVE / 2;
}
