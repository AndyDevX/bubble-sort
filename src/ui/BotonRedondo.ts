import Phaser from 'phaser';
import { Colores } from '../constantes';
import { reproducirEfecto } from '../sistemas/audio';

export type DibujarIcono = (g: Phaser.GameObjects.Graphics, colorFondo: number) => void;

export interface BotonRedondo extends Phaser.GameObjects.Container {
  setHabilitado(habilitado: boolean): void;
}

// Botón circular con un icono dibujado a mano (no depende de imágenes ni emojis)
export function crearBotonRedondo(
  escena: Phaser.Scene,
  x: number,
  y: number,
  radio: number,
  dibujarIcono: DibujarIcono,
  alPulsar: () => void,
): BotonRedondo {
  const grafico = escena.add.graphics();
  const pintar = (color: number) => {
    grafico.clear();
    grafico.fillStyle(color).fillCircle(0, 0, radio);
    dibujarIcono(grafico, color);
  };
  pintar(Colores.primario);

  const boton = escena.add.container(x, y, [grafico]) as BotonRedondo;
  boton.setSize(radio * 2, radio * 2);
  boton.setInteractive({ useHandCursor: true });

  boton.on('pointerover', () => pintar(Colores.primarioClaro));
  boton.on('pointerout', () => {
    pintar(Colores.primario);
    boton.setScale(1);
  });
  boton.on('pointerdown', () => boton.setScale(0.92));
  boton.on('pointerup', () => {
    boton.setScale(1);
    reproducirEfecto(escena, 'boton');
    alPulsar();
  });

  boton.setHabilitado = (habilitado: boolean) => {
    if (habilitado) boton.setInteractive({ useHandCursor: true });
    else boton.disableInteractive();
    boton.setAlpha(habilitado ? 1 : 0.4);
    pintar(Colores.primario);
  };

  return boton;
}

export const iconoPausa: DibujarIcono = (g) => {
  g.fillStyle(Colores.fondo);
  g.fillRoundedRect(-15, -18, 10, 36, 3);
  g.fillRoundedRect(5, -18, 10, 36, 3);
};

export const iconoEngranaje: DibujarIcono = (g, colorFondo) => {
  const dientes = 8;
  const puntos: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < dientes * 4; i++) {
    const angulo = (i / (dientes * 4)) * Math.PI * 2;
    const r = i % 4 < 2 ? 34 : 26; // alterna punta del diente y hueco
    puntos.push(new Phaser.Math.Vector2(Math.cos(angulo) * r, Math.sin(angulo) * r));
  }
  g.fillStyle(Colores.fondo).fillPoints(puntos, true);
  g.fillStyle(colorFondo).fillCircle(0, 0, 11);
};

// Dos flechas en círculo: giro de gravedad
export const iconoGiro: DibujarIcono = (g) => {
  const r = 22;
  g.lineStyle(7, Colores.fondo);
  for (const inicio of [Phaser.Math.DegToRad(-60), Phaser.Math.DegToRad(120)]) {
    const fin = inicio + Phaser.Math.DegToRad(130);
    g.beginPath();
    g.arc(0, 0, r, inicio, fin);
    g.strokePath();
    // punta de flecha al final del arco
    const px = Math.cos(fin) * r;
    const py = Math.sin(fin) * r;
    const tx = -Math.sin(fin);
    const ty = Math.cos(fin);
    g.fillStyle(Colores.fondo);
    g.fillTriangle(px + tx * 12, py + ty * 12, px - ty * 9, py + tx * 9, px + ty * 9, py - tx * 9);
  }
};
