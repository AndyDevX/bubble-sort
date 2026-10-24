import Phaser from 'phaser';

// Moneda dibujada (dorada con aro, brillo y una estrella), en el origen del gráfico
export function crearIconoMoneda(escena: Phaser.Scene, radio = 18): Phaser.GameObjects.Graphics {
  const g = escena.add.graphics();
  g.fillStyle(0xc77d0a).fillCircle(0, radio * 0.12, radio);
  g.fillStyle(0xfdd835).fillCircle(0, 0, radio);
  g.lineStyle(radio * 0.16, 0xf5a623).strokeCircle(0, 0, radio * 0.7);
  // Estrella de 5 puntas
  const puntos: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? radio * 0.45 : radio * 0.2;
    puntos.push(new Phaser.Math.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  g.fillStyle(0xf5a623).fillPoints(puntos, true);
  g.fillStyle(0xffffff, 0.6).fillEllipse(-radio * 0.4, -radio * 0.45, radio * 0.5, radio * 0.28);
  return g;
}
