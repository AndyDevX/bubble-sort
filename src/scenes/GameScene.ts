import Phaser from 'phaser';
import { t } from '../i18n';
import { crearBoton } from '../ui/Boton';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init() {
    // Reinicia aquí el estado de la partida (puntos, vidas...)
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.fadeIn(250);

    this.add
      .text(width / 2, height / 2, t('escenaJuego'), {
        fontFamily: 'sans-serif',
        fontSize: '56px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    crearBoton(this, width / 2, height - 140, t('menu'), () => this.scene.start('Menu'));
  }

  update(_time: number, _delta: number) {
    // Lógica que se ejecuta cada frame
  }
}
