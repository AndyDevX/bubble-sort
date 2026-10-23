import Phaser from 'phaser';
import { Colores } from '../constantes';
import { reproducirEfecto } from '../sistemas/audio';

// Botón reutilizable: rectángulo redondeado + texto, con feedback al tocar
export function crearBoton(
  escena: Phaser.Scene,
  x: number,
  y: number,
  texto: string,
  alPulsar: () => void,
): Phaser.GameObjects.Container {
  const alto = 110;

  const etiqueta = escena.add
    .text(0, 0, texto, {
      fontFamily: 'sans-serif',
      fontSize: '48px',
      color: '#1d1d2b',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);

  // Mínimo 360 de ancho; si el texto es largo, el botón crece para dejarle margen
  const ancho = Math.max(360, etiqueta.width + 72);

  const fondo = escena.add.graphics();
  const pintar = (color: number) => {
    fondo.clear();
    fondo.fillStyle(color).fillRoundedRect(-ancho / 2, -alto / 2, ancho, alto, 28);
  };
  pintar(Colores.primario);

  const boton = escena.add.container(x, y, [fondo, etiqueta]);
  boton.setSize(ancho, alto);
  boton.setInteractive({ useHandCursor: true });

  boton.on('pointerover', () => pintar(Colores.primarioClaro));
  boton.on('pointerout', () => {
    pintar(Colores.primario);
    boton.setScale(1);
  });
  boton.on('pointerdown', () => boton.setScale(0.95));
  boton.on('pointerup', () => {
    boton.setScale(1);
    reproducirEfecto(escena, 'boton');
    alPulsar();
  });

  return boton;
}
