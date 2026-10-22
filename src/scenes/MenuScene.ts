import Phaser from 'phaser';
import { NOMBRE_JUEGO } from '../constantes';
import { t } from '../i18n';
import { crearBoton } from '../ui/Boton';
import { crearBotonAjustes } from '../ui/BotonAjustes';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height * 0.3, NOMBRE_JUEGO, {
        fontFamily: 'sans-serif',
        fontSize: '96px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const jugar = crearBoton(this, width / 2, height * 0.6, t('jugar'), () => {
      jugar.disableInteractive(); // evita arrancar dos veces con un doble toque
      this.cameras.main.fadeOut(250);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start('Game');
      });
    });

    // Ajustes en la esquina inferior derecha
    crearBotonAjustes(this, width - 90, height - 90, () => {
      this.scene.pause();
      this.scene.launch('Settings', { origen: this.scene.key });
    });
  }
}
