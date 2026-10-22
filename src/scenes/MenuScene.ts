import Phaser from 'phaser';
import { NOMBRE_JUEGO } from '../constantes';
import { t } from '../i18n';
import { crearBoton } from '../ui/Boton';
import { crearBotonAjustes } from '../ui/BotonAjustes';
import { alRedimensionar, zonaSegura } from '../ui/layout';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const titulo = this.add
      .text(0, 0, NOMBRE_JUEGO, {
        fontFamily: 'sans-serif',
        fontSize: '96px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const jugar = crearBoton(this, 0, 0, t('jugar'), () => {
      jugar.disableInteractive(); // evita arrancar dos veces con un doble toque
      this.cameras.main.fadeOut(250);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start('Game');
      });
    });

    const ajustes = crearBotonAjustes(this, 0, 0, () => {
      this.scene.pause();
      this.scene.launch('Settings', { origen: this.scene.key });
    });

    alRedimensionar(this, (ancho, alto) => {
      const zona = zonaSegura(this);
      titulo.setPosition(ancho / 2, alto * 0.3);
      jugar.setPosition(ancho / 2, alto * 0.6);
      // Esquina inferior derecha, respetando notch y barra de gestos
      ajustes.setPosition(zona.x + zona.ancho - 90, zona.y + zona.alto - 90);
    });
  }
}
