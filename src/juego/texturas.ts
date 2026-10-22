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
  return `${bola.ingrediente ? 'ing' : 'bola'}-${bola.color}`;
}

export function colorHex(color: ColorId): number {
  return PALETA[color];
}
