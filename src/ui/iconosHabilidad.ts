import type Phaser from 'phaser';

// Iconos de las habilidades (Deshacer, Tubo extra, Gravedad), una sola familia:
// trazo grueso azul noche con puntas redondas (contrasta con el botón celeste) y detalles de
// vidrio (tubo y canicas) con la misma luz que el juego: desde arriba a la izquierda.
// Se dibujan una vez a 128 px y el botón los escala.

const TAMANO = 128;
const TINTA = '#1d1d2b';
const GROSOR = 13;

export const ICONO_DESHACER = 'icono-deshacer';
export const ICONO_TUBO = 'icono-tubo';
export const ICONO_GRAVEDAD = 'icono-gravedad';

function sombra(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowOffsetY = 3;
  ctx.shadowBlur = 4;
}

function sinSombra(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = 'transparent';
}

function trazo(ctx: CanvasRenderingContext2D, grosor = GROSOR) {
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = grosor;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function punta(ctx: CanvasRenderingContext2D, x: number, y: number, dx: number, dy: number, tam: number) {
  // (dx, dy): dirección unitaria hacia donde apunta
  const nx = -dy;
  const ny = dx;
  ctx.fillStyle = TINTA;
  ctx.beginPath();
  ctx.moveTo(x + dx * tam, y + dy * tam);
  ctx.lineTo(x - dx * tam * 0.35 + nx * tam * 0.85, y - dy * tam * 0.35 + ny * tam * 0.85);
  ctx.lineTo(x - dx * tam * 0.35 - nx * tam * 0.85, y - dy * tam * 0.35 - ny * tam * 0.85);
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4;
  ctx.strokeStyle = TINTA;
  ctx.fill();
  ctx.stroke();
}

// Canica pequeña de vidrio (mismo estilo que las bolas del juego)
function canica(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, claro: string, medio: string, oscuro: string) {
  const g = ctx.createRadialGradient(x + r * 0.2, y + r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, claro);
  g.addColorStop(0.6, medio);
  g.addColorStop(1, oscuro);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.4, y - r * 0.4, r * 0.24, r * 0.15, -0.75, 0, Math.PI * 2);
  ctx.fill();
}

// Tubo de ensayo pequeño: vidrio claro con contorno de tinta, boca con reborde
function tuboMini(ctx: CanvasRenderingContext2D, ancho: number, alto: number, canicas: [string, string, string][]) {
  const r = ancho / 2;
  const cuerpo = () => {
    ctx.beginPath();
    ctx.moveTo(-r, -alto / 2);
    ctx.lineTo(-r, alto / 2 - r);
    ctx.arc(0, alto / 2 - r, r, Math.PI, 0, true);
    ctx.lineTo(r, -alto / 2);
  };
  // Vidrio
  const vidrio = ctx.createLinearGradient(-r, 0, r, 0);
  vidrio.addColorStop(0, 'rgba(255,255,255,0.85)');
  vidrio.addColorStop(0.5, 'rgba(255,255,255,0.45)');
  vidrio.addColorStop(1, 'rgba(255,255,255,0.75)');
  ctx.fillStyle = vidrio;
  cuerpo();
  ctx.closePath();
  ctx.fill();
  // Canicas desde el fondo
  const rc = r - 6;
  canicas.forEach(([claro, medio, oscuro], i) => canica(ctx, 0, alto / 2 - r - i * (rc * 2 + 1), rc, claro, medio, oscuro));
  // Reflejo vertical
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.roundRect(-r + 5, -alto / 2 + 8, 4, alto * 0.5, 2);
  ctx.fill();
  // Contorno y boca
  trazo(ctx, 6);
  cuerpo();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-r - 6, -alto / 2);
  ctx.lineTo(r + 6, -alto / 2);
  ctx.stroke();
}

const ROSA: [string, string, string] = ['#ffd1e3', '#ec407a', '#7a0f38'];
const AMBAR: [string, string, string] = ['#fff3c4', '#ffb300', '#8a4b00'];
const VERDE: [string, string, string] = ['#d8f5d0', '#43a047', '#14501a'];

// ↶ Flecha en gancho: sale hacia la izquierda y vuelve por la derecha
function dibujarDeshacer(ctx: CanvasRenderingContext2D) {
  sombra(ctx);
  trazo(ctx);
  ctx.beginPath();
  ctx.moveTo(48, 44);
  ctx.lineTo(74, 44);
  ctx.arc(74, 70, 26, -Math.PI / 2, Math.PI / 2, false);
  ctx.lineTo(50, 96);
  ctx.stroke();
  punta(ctx, 40, 44, -1, 0, 22);
  sinSombra(ctx);
}

// Tubo de ensayo inclinado con canicas y un «+» en una moneda de tinta
function dibujarTubo(ctx: CanvasRenderingContext2D) {
  sombra(ctx);
  ctx.save();
  ctx.translate(54, 60);
  ctx.rotate(-0.3);
  tuboMini(ctx, 40, 96, [ROSA, AMBAR]);
  ctx.restore();
  // «+»: círculo de tinta con cruz blanca
  ctx.fillStyle = TINTA;
  ctx.beginPath();
  ctx.arc(94, 88, 20, 0, Math.PI * 2);
  ctx.fill();
  sinSombra(ctx);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(84, 88);
  ctx.lineTo(104, 88);
  ctx.moveTo(94, 78);
  ctx.lineTo(94, 98);
  ctx.stroke();
}

// Dos flechas en círculo alrededor de un tubo boca abajo: girar la gravedad
function dibujarGravedad(ctx: CanvasRenderingContext2D) {
  sombra(ctx);
  const c = TAMANO / 2;
  const r = 48;
  trazo(ctx, 11);
  for (const inicio of [Math.PI * 0.95, Math.PI * 1.95]) {
    const fin = inicio + Math.PI * 0.62;
    ctx.beginPath();
    ctx.arc(c, c, r, inicio, fin, false);
    ctx.stroke();
    // En sentido horario la tangente es (-sin, cos)
    punta(ctx, c + Math.cos(fin) * r, c + Math.sin(fin) * r, -Math.sin(fin), Math.cos(fin), 17);
  }
  ctx.save();
  ctx.translate(c, c + 1);
  ctx.rotate(Math.PI); // boca abajo: las canicas "caen" hacia arriba al girar
  tuboMini(ctx, 32, 66, [VERDE, AMBAR]);
  ctx.restore();
  sinSombra(ctx);
}

function crear(escena: Phaser.Scene, clave: string, dibujar: (ctx: CanvasRenderingContext2D) => void) {
  if (escena.textures.exists(clave)) return;
  const textura = escena.textures.createCanvas(clave, TAMANO, TAMANO);
  if (!textura) return;
  dibujar(textura.getContext());
  textura.refresh();
}

// Se llama una vez al arrancar (BootScene)
export function generarIconosHabilidad(escena: Phaser.Scene): void {
  crear(escena, ICONO_DESHACER, dibujarDeshacer);
  crear(escena, ICONO_TUBO, dibujarTubo);
  crear(escena, ICONO_GRAVEDAD, dibujarGravedad);
}
