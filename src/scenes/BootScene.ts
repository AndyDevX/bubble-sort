import Phaser from 'phaser';
import { generarTexturasBolas } from '../juego/texturas';
import { cargarEfectos } from '../sistemas/audio';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    cargarEfectos(this);
  }

  create() {
    generarTexturasBolas(this);
    this.scene.start('Menu');
  }
}
