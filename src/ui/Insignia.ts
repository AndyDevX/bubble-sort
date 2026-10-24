import type Phaser from 'phaser';
import { Tema, estiloTexto } from './tema';

export interface Insignia {
  colocar(x: number, y: number): void;
  setValor(valor: number | string): void;
}

// Insignia roja con borde blanco y un número (usos que quedan) o un «+» (comprar), para la esquina
// de un botón (como los avisos «!» del estilo de referencia)
export function crearInsignia(escena: Phaser.Scene): Insignia {
  const fondo = escena.add.graphics().setDepth(3);
  fondo.fillStyle(Tema.sombra, 0.2).fillCircle(1, 3, 21);
  fondo.fillStyle(0xffffff).fillCircle(0, 0, 21);
  fondo.fillStyle(Tema.insignia).fillCircle(0, 0, 17);
  fondo.fillStyle(0xffffff, 0.35).fillEllipse(-5, -7, 12, 7);
  const texto = escena.add.text(0, 0, '', estiloTexto(24, '#ffffff')).setOrigin(0.5).setDepth(4);

  return {
    colocar(x, y) {
      fondo.setPosition(x, y);
      texto.setPosition(x, y - 1);
    },
    setValor(valor) {
      texto.setText(String(valor));
    },
  };
}
