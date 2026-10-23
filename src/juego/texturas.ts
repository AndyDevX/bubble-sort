import Phaser from 'phaser';
import { COLORES, PALETA, type ColorId } from './colores';
import type { Bola } from './modelo';

const TAMANO = 128; // se dibujan grandes y se escalan: nítidas en cualquier pantalla

function rgb(hex: number): [number, number, number] {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}

function mezclar(hex: number, con: number, t: number): string {
  const a = rgb(hex);
  const b = rgb(con);
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function dibujarEsfera(ctx: CanvasRenderingContext2D, color: number) {
  const r = TAMANO / 2 - 4;
  const c = TAMANO / 2;
  const degradado = ctx.createRadialGradient(c - r * 0.35, c - r * 0.4, r * 0.1, c, c, r);
  degradado.addColorStop(0, mezclar(color, 0xffffff, 0.55));
  degradado.addColorStop(0.45, mezclar(color, 0xffffff, 0));
  degradado.addColorStop(1, mezclar(color, 0x000000, 0.35));
  ctx.fillStyle = degradado;
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.fill();
}

// Bola congelada (lluvia): conserva su color, mezclado con azul hielo, con escarcha, grietas
// y un borde helado
const AZUL_HIELO = 0xbfefff;

function dibujarHielo(ctx: CanvasRenderingContext2D, color: number) {
  const r = TAMANO / 2 - 4;
  const c = TAMANO / 2;

  // Base: el color de la bola enfriado hacia azul hielo
  const base = ctx.createRadialGradient(c - r * 0.3, c - r * 0.35, r * 0.05, c, c, r);
  base.addColorStop(0, mezclar(color, 0xffffff, 0.8));
  base.addColorStop(0.5, mezclar(color, AZUL_HIELO, 0.58));
  base.addColorStop(1, mezclar(color, 0x0b3d5c, 0.55));
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.clip();

  // Escarcha: manchas blanquecinas semitransparentes
  for (let i = 0; i < 34; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.random() * r;
    const tam = r * (0.1 + Math.random() * 0.28);
    const mancha = ctx.createRadialGradient(c + Math.cos(a) * d, c + Math.sin(a) * d, 0, c + Math.cos(a) * d, c + Math.sin(a) * d, tam);
    mancha.addColorStop(0, `rgba(240,252,255,${0.25 + Math.random() * 0.3})`);
    mancha.addColorStop(1, 'rgba(240,252,255,0)');
    ctx.fillStyle = mancha;
    ctx.fillRect(0, 0, TAMANO, TAMANO);
  }

  // Halo de escarcha hacia el borde
  const halo = ctx.createRadialGradient(c, c, r * 0.62, c, c, r);
  halo.addColorStop(0, 'rgba(220,250,255,0)');
  halo.addColorStop(1, 'rgba(220,250,255,0.6)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, TAMANO, TAMANO);

  // Grietas
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2.4;
  for (let i = 0; i < 8; i++) {
    let x = c + (Math.random() - 0.5) * r * 1.4;
    let y = c + (Math.random() - 0.5) * r * 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let j = 0; j < 4; j++) {
      x += (Math.random() - 0.5) * r * 0.5;
      y += (Math.random() - 0.5) * r * 0.5;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();

  // Borde helado y brillo
  ctx.strokeStyle = 'rgba(200,245,255,0.9)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(c, c, r - 2.5, 0, Math.PI * 2);
  ctx.stroke();
  const brillo = ctx.createRadialGradient(c - r * 0.38, c - r * 0.42, 0, c - r * 0.38, c - r * 0.42, r * 0.35);
  brillo.addColorStop(0, 'rgba(255,255,255,0.85)');
  brillo.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = brillo;
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.fill();
}

function crear(escena: Phaser.Scene, clave: string, dibujar: (ctx: CanvasRenderingContext2D) => void) {
  if (escena.textures.exists(clave)) return;
  const textura = escena.textures.createCanvas(clave, TAMANO, TAMANO);
  if (!textura) return;
  dibujar(textura.getContext());
  textura.refresh();
}

// Se llama una vez al arrancar (BootScene)
export function generarTexturasBolas(escena: Phaser.Scene): void {
  for (const color of COLORES) {
    crear(escena, `bola-${color}`, (ctx) => dibujarEsfera(ctx, PALETA[color]));

    crear(escena, `hielo-${color}`, (ctx) => dibujarHielo(ctx, PALETA[color]));

    // Ingrediente: misma esfera con un anillo discontinuo blanco
    crear(escena, `ing-${color}`, (ctx) => {
      dibujarEsfera(ctx, PALETA[color]);
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 9;
      ctx.setLineDash([14, 10]);
      ctx.beginPath();
      ctx.arc(TAMANO / 2, TAMANO / 2, TAMANO / 2 - 16, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  // Niebla: bola gris con interrogación
  crear(escena, 'bola-oculta', (ctx) => {
    dibujarEsfera(ctx, 0x4a4a66);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `bold ${TAMANO * 0.55}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', TAMANO / 2, TAMANO / 2 + 4);
  });
}

export function claveTextura(bola: Bola): string {
  if (bola.oculta) return 'bola-oculta';
  if (bola.lluvia) return `hielo-${bola.color}`;
  return `${bola.ingrediente ? 'ing' : 'bola'}-${bola.color}`;
}

export function colorHex(color: ColorId): number {
  return PALETA[color];
}
