import type Phaser from 'phaser';
import { Colores } from '../constantes';

export interface Insignia {
  colocar(x: number, y: number): void;
  setValor(n: number): void;
}

// Círculo pequeño con un número (usos que quedan), para la esquina de un botón
export function crearInsignia(escena: Phaser.Scene): Insignia {
  const fondo = escena.add.graphics().setDepth(3);
  fondo.fillStyle(Colores.fondo).fillCircle(0, 0, 19);
  fondo.lineStyle(3, Colores.primario).strokeCircle(0, 0, 19);
  const texto = escena.add
    .text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '24px', color: '#ffffff', fontStyle: 'bold' })
    .setOrigin(0.5)
    .setDepth(4);

  return {
    colocar(x, y) {
      fondo.setPosition(x, y);
      texto.setPosition(x, y);
    },
    setValor(n) {
      texto.setText(String(n));
    },
  };
}
