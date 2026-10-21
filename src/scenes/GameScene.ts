import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, 120, 'Phaser + Capacitor', {
        fontFamily: 'sans-serif',
        fontSize: '48px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 190, 'Toca la pantalla para crear bolas', {
        fontFamily: 'sans-serif',
        fontSize: '28px',
        color: '#aaaacc',
      })
      .setOrigin(0.5);

    this.spawnBall(width / 2, height / 2);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.spawnBall(pointer.x, pointer.y);
    });
  }

  private spawnBall(x: number, y: number) {
    const ball = this.physics.add.image(x, y, 'ball');
    ball.setCollideWorldBounds(true);
    ball.setBounce(1, 1);
    ball.setVelocity(Phaser.Math.Between(-400, 400), Phaser.Math.Between(-400, 400));
  }
}
