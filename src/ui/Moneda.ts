import type Phaser from 'phaser';

// Moneda dibujada (círculo dorado con aro), en el origen del gráfico
export function crearIconoMoneda(escena: Phaser.Scene, radio = 18): Phaser.GameObjects.Graphics {
  const g = escena.add.graphics();
  g.fillStyle(0xfdd835).fillCircle(0, 0, radio);
  g.lineStyle(radio * 0.22, 0xf9a825).strokeCircle(0, 0, radio * 0.61);
  return g;
}
