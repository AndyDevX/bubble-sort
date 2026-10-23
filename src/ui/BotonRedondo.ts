import Phaser from 'phaser';
import { Colores } from '../constantes';
import { reproducirEfecto } from '../sistemas/audio';

export type DibujarIcono = (g: Phaser.GameObjects.Graphics, colorFondo: number) => void;

export interface BotonRedondo extends Phaser.GameObjects.Container {
  setHabilitado(habilitado: boolean): void;
}

// Botón circular. El icono es un dibujo a mano (Graphics) o la clave de una textura
// (iconos de habilidad, `src/ui/iconosHabilidad.ts`), que se escala al tamaño del botón.
export function crearBotonRedondo(
  escena: Phaser.Scene,
  x: number,
  y: number,
  radio: number,
  icono: DibujarIcono | string,
  alPulsar: () => void,
): BotonRedondo {
  const grafico = escena.add.graphics();
  const pintar = (color: number) => {
    grafico.clear();
    grafico.fillStyle(color).fillCircle(0, 0, radio);
    if (typeof icono !== 'string') icono(grafico, color);
  };
  pintar(Colores.primario);

  const hijos: Phaser.GameObjects.GameObject[] = [grafico];
  if (typeof icono === 'string') hijos.push(escena.add.image(0, 0, icono).setDisplaySize(radio * 1.6, radio * 1.6));
  const boton = escena.add.container(x, y, hijos) as BotonRedondo;
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
