import Phaser from 'phaser';
import { generarTexturasBolas } from '../juego/texturas';
import { generarTexturasTubo } from '../juego/texturasTubo';
import { generarIconosHabilidad } from '../ui/iconosHabilidad';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  // No se espera a ningún archivo: el audio se carga en segundo plano desde el menú
  create() {
    generarTexturasBolas(this);
    generarTexturasTubo(this);
    generarIconosHabilidad(this);
    this.scene.start('Menu');
  }
}
