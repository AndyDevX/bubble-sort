import Phaser from 'phaser';
import { COMMIT_BUILD, NOMBRE_JUEGO, NUMERO_BUILD, VERSION } from '../constantes';
import { t } from '../i18n';
import { cargarAudioEnSegundoPlano, detenerMusica } from '../sistemas/audio';
import { borrarProgreso, getGuardado } from '../sistemas/guardado';
import { borrarNivelGuardado } from '../sistemas/nivelGuardado';
import { crearBoton } from '../ui/Boton';
import { crearBotonAjustes } from '../ui/BotonAjustes';
import { crearBotonBorrarProgreso } from '../ui/BorrarProgreso';
import { alRedimensionar, zonaSegura } from '../ui/layout';
import { crearIconoMoneda } from '../ui/Moneda';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    // La música es solo de las partidas: aquí se para y se adelanta la carga
    detenerMusica();
    cargarAudioEnSegundoPlano(this);

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

    const tienda = crearBoton(this, 0, 0, t('tienda'), () => {
      this.scene.pause();
      this.scene.launch('Tienda', { origen: this.scene.key });
    });

    // Monedas arriba a la derecha (se actualizan al volver de la tienda)
    const iconoMoneda = crearIconoMoneda(this, 22);
    const monedas = this.add
      .text(0, 0, String(getGuardado().monedas), { fontFamily: 'sans-serif', fontSize: '40px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(1, 0.5);
    const colocarMonedas = () => iconoMoneda.setPosition(monedas.x - monedas.width - 36, monedas.y);
    const alReanudar = () => {
      monedas.setText(String(getGuardado().monedas));
      colocarMonedas();
    };
    this.events.on(Phaser.Scenes.Events.RESUME, alReanudar);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.RESUME, alReanudar));

    const nivel = this.add
      .text(0, 0, t('nivel', { n: getGuardado().nivel }), { fontFamily: 'sans-serif', fontSize: '32px', color: '#aaaacc' })
      .setOrigin(0.5);

    // Versión y build abajo a la izquierda (el engranaje ocupa la esquina derecha)
    const build = this.add
      .text(0, 0, [t('version', { v: VERSION, n: NUMERO_BUILD }), COMMIT_BUILD].filter(Boolean).join(' · '), {
        fontFamily: 'sans-serif',
        fontSize: '24px',
        color: '#66667a',
      })
      .setOrigin(0, 1);

    const ajustes = crearBotonAjustes(this, 0, 0, () => {
      this.scene.pause();
      this.scene.launch('Settings', { origen: this.scene.key });
    });

    // Borrar progreso: arriba a la izquierda, casi invisible y con pulsación larga + confirmación
    const borrar = crearBotonBorrarProgreso(this, () => {
      borrarProgreso();
      borrarNivelGuardado();
      this.scene.restart({ borrado: true });
    });
    if ((this.sys.settings.data as { borrado?: boolean } | undefined)?.borrado) {
      const aviso = this.add
        .text(0, 0, t('progresoBorrado'), { fontFamily: 'sans-serif', fontSize: '30px', color: '#a5d6a7' })
        .setOrigin(0.5);
      this.tweens.add({ targets: aviso, alpha: 0, delay: 1800, duration: 500 });
      alRedimensionar(this, (ancho, alto) => aviso.setPosition(ancho / 2, alto * 0.55 - 110));
    }

    alRedimensionar(this, (ancho, alto) => {
      const zona = zonaSegura(this);
      titulo.setPosition(ancho / 2, alto * 0.3);
      jugar.setPosition(ancho / 2, alto * 0.55);
      tienda.setPosition(ancho / 2, alto * 0.55 + 140);
      nivel.setPosition(ancho / 2, alto * 0.55 + 250);
      monedas.setPosition(zona.x + zona.ancho - 40, zona.y + 60);
      colocarMonedas();
      // Esquina inferior derecha, respetando notch y barra de gestos
      ajustes.setPosition(zona.x + zona.ancho - 90, zona.y + zona.alto - 90);
      build.setPosition(zona.x + 30, zona.y + zona.alto - 30);
      borrar.colocar(zona.x + 46, zona.y + 60);
    });
  }
}
