import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Carga aquí tus assets desde /public/assets, p. ej.:
    // this.load.image('player', 'assets/player.png');
  }

  create() {
    // Textura generada para no depender de archivos externos
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x4fc3f7);
    g.fillCircle(32, 32, 32);
    g.generateTexture('ball', 64, 64);
    g.destroy();

    this.scene.start('Menu');
  }
}
