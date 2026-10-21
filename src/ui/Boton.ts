import Phaser from 'phaser';

// Botón reutilizable: rectángulo redondeado + texto, con feedback al tocar
export function crearBoton(
  escena: Phaser.Scene,
  x: number,
  y: number,
  texto: string,
  alPulsar: () => void,
): Phaser.GameObjects.Container {
  const ancho = 360;
  const alto = 110;

  const fondo = escena.add.graphics();
  const pintar = (color: number) => {
    fondo.clear();
    fondo.fillStyle(color).fillRoundedRect(-ancho / 2, -alto / 2, ancho, alto, 28);
  };
  pintar(0x4fc3f7);

  const etiqueta = escena.add
    .text(0, 0, texto, {
      fontFamily: 'sans-serif',
      fontSize: '48px',
      color: '#1d1d2b',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);

  const boton = escena.add.container(x, y, [fondo, etiqueta]);
  boton.setSize(ancho, alto);
  boton.setInteractive({ useHandCursor: true });

  boton.on('pointerover', () => pintar(0x81d4fa));
  boton.on('pointerout', () => {
    pintar(0x4fc3f7);
    boton.setScale(1);
  });
  boton.on('pointerdown', () => boton.setScale(0.95));
  boton.on('pointerup', () => {
    boton.setScale(1);
    alPulsar();
  });

  return boton;
}
