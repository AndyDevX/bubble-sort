import Phaser from 'phaser';
import { generarTexturasBolas } from '../juego/texturas';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Carga aquí tus assets desde /public/assets, p. ej.:
    // this.load.audio('mover', ['assets/mover.ogg', 'assets/mover.mp3']);
  }

  create() {
    generarTexturasBolas(this);
    this.scene.start('Menu');
  }
}
