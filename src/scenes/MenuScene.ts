import Phaser from 'phaser';
import { crearBoton } from '../ui/Boton';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height * 0.3, 'Mi Juego', {
        fontFamily: 'sans-serif',
        fontSize: '96px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const jugar = crearBoton(this, width / 2, height * 0.6, 'Jugar', () => {
      jugar.disableInteractive(); // evita arrancar dos veces con un doble toque
      this.cameras.main.fadeOut(250);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start('Game');
      });
    });
  }
}
