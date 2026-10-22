import Phaser from 'phaser';
import { Colores } from '../constantes';

// Botón redondo con un engranaje dibujado (no depende de imágenes ni emojis)
export function crearBotonAjustes(
  escena: Phaser.Scene,
  x: number,
  y: number,
  alPulsar: () => void,
): Phaser.GameObjects.Container {
  const radio = 56;

  const dientes = 8;
  const puntos: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < dientes * 4; i++) {
    const angulo = (i / (dientes * 4)) * Math.PI * 2;
    const r = i % 4 < 2 ? 34 : 26; // alterna punta del diente y hueco
    puntos.push(new Phaser.Math.Vector2(Math.cos(angulo) * r, Math.sin(angulo) * r));
  }

  const grafico = escena.add.graphics();
  const pintar = (color: number) => {
    grafico.clear();
    grafico.fillStyle(color).fillCircle(0, 0, radio);
    grafico.fillStyle(Colores.fondo).fillPoints(puntos, true);
    grafico.fillStyle(color).fillCircle(0, 0, 11);
  };
  pintar(Colores.primario);

  const boton = escena.add.container(x, y, [grafico]);
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
    alPulsar();
  });

  return boton;
}
