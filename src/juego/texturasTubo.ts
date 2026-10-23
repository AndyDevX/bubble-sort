import type Phaser from 'phaser';

// Tubos de ensayo de vidrio, dibujados una vez al arrancar en CanvasTexture y escalados.
// Cada tubo son dos capas para que las bolas queden DENTRO del vidrio:
//   - atrás (debajo de las bolas): pared trasera, interior de la boca, cáustica del fondo;
//   - delante (encima de las bolas): contorno, reflejos y la boca con reborde.
// Luz desde arriba a la izquierda, como en las bolas y los iconos.

export const TUBO_ANCHO = 120; // ancho del cuerpo en la textura; se escala a `anchoTubo`
const ALTO_CUERPO = Math.round((TUBO_ANCHO * 4.5) / 1.12); // misma proporción que en GameScene
const ALTO_CUERPO_CORTO = Math.round((TUBO_ANCHO * 1.5) / 1.12); // tubo de emergencia (1 hueco)
const MARGEN_X = 14;
const MARGEN_ARRIBA = 30; // espacio para el reborde y el tapón
const LIENZO_ANCHO = TUBO_ANCHO + MARGEN_X * 2;
const LIENZO_ALTO = MARGEN_ARRIBA + ALTO_CUERPO + 6;

const X0 = MARGEN_X;
const X1 = MARGEN_X + TUBO_ANCHO;
const CX = LIENZO_ANCHO / 2;
const ABAJO = MARGEN_ARRIBA + ALTO_CUERPO; // fondo del tubo (comparten base normal y corto)

// Origen de las imágenes: centro del cuerpo del tubo normal (igual que el centro de colocación)
export const ORIGEN_TUBO = { x: 0.5, y: (MARGEN_ARRIBA + ALTO_CUERPO / 2) / LIENZO_ALTO };

type Rgb = [number, number, number];
const VIDRIO: Rgb = [200, 232, 255];
const VIDRIO_EMERGENCIA: Rgb = [255, 196, 120];

const rgba = ([r, g, b]: Rgb, a: number) => `rgba(${r},${g},${b},${a})`;

// Cuerpo: paredes rectas y fondo semicircular (abierto arriba si `cerrar` es false)
function cuerpo(ctx: CanvasRenderingContext2D, arriba: number, margen = 0, cerrar = true) {
  const r = TUBO_ANCHO / 2 - margen;
  ctx.beginPath();
  ctx.moveTo(CX - r, arriba);
  ctx.lineTo(CX - r, ABAJO - TUBO_ANCHO / 2);
  ctx.arc(CX, ABAJO - TUBO_ANCHO / 2, r, Math.PI, 0, true);
  ctx.lineTo(CX + r, arriba);
  if (cerrar) ctx.closePath();
}

function boca(ctx: CanvasRenderingContext2D, arriba: number, rx: number, ry: number, desde: number, hasta: number) {
  ctx.beginPath();
  ctx.ellipse(CX, arriba, rx, ry, 0, desde, hasta);
}

function dibujarAtras(ctx: CanvasRenderingContext2D, arriba: number, tinte: Rgb) {
  // Pared trasera: más opaca en los bordes (se ve más vidrio de canto) y casi invisible al centro
  const pared = ctx.createLinearGradient(X0, 0, X1, 0);
  pared.addColorStop(0, rgba(tinte, 0.32));
  pared.addColorStop(0.14, rgba(tinte, 0.1));
  pared.addColorStop(0.5, rgba(tinte, 0.05));
  pared.addColorStop(0.86, rgba(tinte, 0.12));
  pared.addColorStop(1, rgba(tinte, 0.34));
  ctx.fillStyle = pared;
  cuerpo(ctx, arriba);
  ctx.fill();

  // Luz concentrada en el fondo redondo
  const caustica = ctx.createRadialGradient(CX + 8, ABAJO - TUBO_ANCHO * 0.3, 0, CX + 8, ABAJO - TUBO_ANCHO * 0.3, TUBO_ANCHO * 0.42);
  caustica.addColorStop(0, 'rgba(255,255,255,0.07)');
  caustica.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = caustica;
  cuerpo(ctx, arriba);
  ctx.fill();

  // Interior de la boca (se ve la abertura en ligera perspectiva) y su borde trasero
  ctx.fillStyle = 'rgba(8,16,28,0.35)';
  boca(ctx, arriba, TUBO_ANCHO / 2 - 2, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(tinte, 0.55);
  ctx.lineWidth = 2.5;
  boca(ctx, arriba, TUBO_ANCHO / 2 - 2, 8, Math.PI, Math.PI * 2);
  ctx.stroke();
}

function dibujarDelante(ctx: CanvasRenderingContext2D, arriba: number, tinte: Rgb) {
  const alto = ABAJO - arriba;

  // Filos del vidrio: bandas claras pegadas a las paredes (Fresnel)
  ctx.save();
  cuerpo(ctx, arriba);
  ctx.clip();
  const filo = ctx.createLinearGradient(X0, 0, X1, 0);
  filo.addColorStop(0, 'rgba(255,255,255,0.3)');
  filo.addColorStop(0.07, 'rgba(255,255,255,0)');
  filo.addColorStop(0.93, 'rgba(255,255,255,0)');
  filo.addColorStop(1, 'rgba(255,255,255,0.22)');
  ctx.fillStyle = filo;
  ctx.fillRect(0, 0, LIENZO_ANCHO, LIENZO_ALTO);

  // Reflejo principal: franja vertical a la izquierda que se desvanece arriba y abajo
  const xr = X0 + TUBO_ANCHO * 0.15;
  const reflejo = ctx.createLinearGradient(0, arriba + 14, 0, ABAJO - TUBO_ANCHO * 0.35);
  reflejo.addColorStop(0, 'rgba(255,255,255,0)');
  reflejo.addColorStop(0.12, 'rgba(255,255,255,0.55)');
  reflejo.addColorStop(0.75, 'rgba(255,255,255,0.4)');
  reflejo.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = reflejo;
  ctx.beginPath();
  ctx.roundRect(xr, arriba + 14, TUBO_ANCHO * 0.075, Math.max(10, alto - 14 - TUBO_ANCHO * 0.35), 5);
  ctx.fill();
  // Uno fino a la derecha, más corto
  const fino = ctx.createLinearGradient(0, arriba + 20, 0, arriba + 20 + alto * 0.4);
  fino.addColorStop(0, 'rgba(255,255,255,0.35)');
  fino.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = fino;
  ctx.beginPath();
  ctx.roundRect(X1 - TUBO_ANCHO * 0.17, arriba + 20, TUBO_ANCHO * 0.035, alto * 0.4, 3);
  ctx.fill();
  ctx.restore();

  // Brillo curvo en el fondo, abajo a la izquierda
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(CX, ABAJO - TUBO_ANCHO / 2, TUBO_ANCHO / 2 - 9, Math.PI * 0.62, Math.PI * 0.88);
  ctx.stroke();

  // Contorno exterior y línea interior (grosor del vidrio)
  ctx.strokeStyle = rgba(tinte, 0.9);
  ctx.lineWidth = 3.5;
  cuerpo(ctx, arriba, 1.5, false);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  cuerpo(ctx, arriba, 6, false);
  ctx.stroke();

  // Boca con reborde (un aro de vidrio más grueso): mitad delantera por encima de todo
  const rx = TUBO_ANCHO / 2 + 9;
  const anillo = ctx.createLinearGradient(0, arriba - 11, 0, arriba + 11);
  anillo.addColorStop(0, 'rgba(255,255,255,0.75)');
  anillo.addColorStop(0.5, rgba(tinte, 0.45));
  anillo.addColorStop(1, rgba(tinte, 0.7));
  ctx.fillStyle = anillo;
  ctx.beginPath();
  ctx.ellipse(CX, arriba, rx, 11, 0, 0, Math.PI * 2);
  ctx.ellipse(CX, arriba, TUBO_ANCHO / 2 - 2, 8, 0, 0, Math.PI * 2, true); // agujero
  ctx.fill('evenodd');
  ctx.strokeStyle = rgba(tinte, 0.95);
  ctx.lineWidth = 2.5;
  boca(ctx, arriba, rx, 11, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 2;
  boca(ctx, arriba, rx - 3, 8.5, Math.PI * 1.1, Math.PI * 1.45);
  ctx.stroke();
}

// Interior blanco (se tiñe del color al sellar) y tapón en grises (se tiñe del color)
function dibujarLiquido(ctx: CanvasRenderingContext2D, arriba: number) {
  const liquido = ctx.createLinearGradient(X0, 0, X1, 0);
  liquido.addColorStop(0, 'rgba(255,255,255,0.9)');
  liquido.addColorStop(0.5, 'rgba(255,255,255,0.55)');
  liquido.addColorStop(1, 'rgba(255,255,255,0.95)');
  ctx.fillStyle = liquido;
  cuerpo(ctx, arriba + 4, 4);
  ctx.fill();
}

function dibujarTapon(ctx: CanvasRenderingContext2D) {
  const arriba = MARGEN_ARRIBA;
  const ancho = TUBO_ANCHO - 10;
  const alto = 40;
  const y = arriba - 24;
  // Cuerpo algo cónico: más ancho arriba, entra en la boca
  const g = ctx.createLinearGradient(CX - ancho / 2, 0, CX + ancho / 2, 0);
  g.addColorStop(0, '#d0d0d0');
  g.addColorStop(0.3, '#ffffff');
  g.addColorStop(1, '#8a8a8a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(CX - ancho / 2 - 4, y + 6);
  ctx.lineTo(CX + ancho / 2 + 4, y + 6);
  ctx.lineTo(CX + ancho / 2 - 4, y + alto);
  ctx.lineTo(CX - ancho / 2 + 4, y + alto);
  ctx.closePath();
  ctx.fill();
  // Cara superior
  ctx.fillStyle = '#f2f2f2';
  ctx.beginPath();
  ctx.ellipse(CX, y + 6, ancho / 2 + 4, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Brillo
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.roundRect(CX - ancho / 2 + 8, y + 14, 8, alto - 20, 4);
  ctx.fill();
}

function crear(escena: Phaser.Scene, clave: string, dibujar: (ctx: CanvasRenderingContext2D) => void) {
  if (escena.textures.exists(clave)) return;
  const textura = escena.textures.createCanvas(clave, LIENZO_ANCHO, LIENZO_ALTO);
  if (!textura) return;
  dibujar(textura.getContext());
  textura.refresh();
}

// Se llama una vez al arrancar (BootScene)
export function generarTexturasTubo(escena: Phaser.Scene): void {
  const arribaNormal = MARGEN_ARRIBA;
  const arribaCorto = ABAJO - ALTO_CUERPO_CORTO;
  crear(escena, 'tubo-atras', (ctx) => dibujarAtras(ctx, arribaNormal, VIDRIO));
  crear(escena, 'tubo-delante', (ctx) => dibujarDelante(ctx, arribaNormal, VIDRIO));
  crear(escena, 'tubo-liquido', (ctx) => dibujarLiquido(ctx, arribaNormal));
  crear(escena, 'tubo-tapon', dibujarTapon);
  crear(escena, 'tubo-corto-atras', (ctx) => dibujarAtras(ctx, arribaCorto, VIDRIO_EMERGENCIA));
  crear(escena, 'tubo-corto-delante', (ctx) => dibujarDelante(ctx, arribaCorto, VIDRIO_EMERGENCIA));
}
