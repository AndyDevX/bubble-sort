import Phaser from 'phaser';
import { t } from '../i18n';
import { crearBoton } from '../ui/Boton';
import { alRedimensionar, zonaSegura } from '../ui/layout';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init() {
    // Reinicia aquí el estado de la partida (puntos, vidas...)
  }

  create() {
    this.cameras.main.fadeIn(250);

    const texto = this.add
      .text(0, 0, t('escenaJuego'), {
        fontFamily: 'sans-serif',
        fontSize: '56px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const menu = crearBoton(this, 0, 0, t('menu'), () => this.scene.start('Menu'));

    alRedimensionar(this, (ancho, alto) => {
      const zona = zonaSegura(this);
      texto.setPosition(ancho / 2, alto / 2);
      menu.setPosition(ancho / 2, zona.y + zona.alto - 140);
    });
  }

  update(_time: number, _delta: number) {
    // Lógica que se ejecuta cada frame. Mueve cosas con `delta` (ms), nunca con valores fijos por frame.
  }
}
