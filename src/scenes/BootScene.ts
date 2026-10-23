import Phaser from 'phaser';
import { generarTexturasBolas } from '../juego/texturas';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  // No se espera a ningún archivo: el audio se carga en segundo plano desde el menú
  create() {
    generarTexturasBolas(this);
    this.scene.start('Menu');
  }
}
