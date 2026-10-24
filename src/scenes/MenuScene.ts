import Phaser from 'phaser';
import { COMMIT_BUILD, NOMBRE_JUEGO, NUMERO_BUILD, VERSION } from '../constantes';
import { t } from '../i18n';
import { cargarAudioEnSegundoPlano, detenerMusica } from '../sistemas/audio';
import { borrarProgreso, getGuardado } from '../sistemas/guardado';
import { borrarNivelGuardado } from '../sistemas/nivelGuardado';
import { borrarEstadisticas } from '../sistemas/estadisticas';
import { cargaTerminada, enJuego } from '../sistemas/anuncios';
import { EN_CRAZYGAMES } from '../plataforma';
import { alCambiarActualizacion, getEstadoActualizacion, instalarActualizacion, URL_DESCARGA_APK, type EstadoActualizacion } from '../sistemas/actualizaciones';
import { crearBoton } from '../ui/Boton';
import { crearBotonAjustes } from '../ui/BotonAjustes';
import { crearBotonBorrarProgreso } from '../ui/BorrarProgreso';
import { alRedimensionar, zonaSegura } from '../ui/layout';
import { crearIconoMoneda } from '../ui/Moneda';
import { Botones, crearFondo, dibujarPastilla, estiloTexto, FUENTE, Tema } from '../ui/tema';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    // La música es solo de las partidas: aquí se para y se adelanta la carga
    crearFondo(this);
    detenerMusica();
    cargarAudioEnSegundoPlano(this);
    cargaTerminada();
    enJuego(false);

    // Título: grande, azul con contorno blanco y sombra marrón (estilo caramelo)
    const titulo = this.add
      .text(0, 0, NOMBRE_JUEGO, estiloTexto(112, '#3d8fe0'))
      .setOrigin(0.5)
      .setStroke('#ffffff', 14)
      .setShadow(0, 8, 'rgba(122, 82, 50, 0.35)', 6, true, true);

    const jugar = crearBoton(this, 0, 0, t('jugar'), () => {
      jugar.disableInteractive(); // evita arrancar dos veces con un doble toque
      this.cameras.main.fadeOut(250);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start('Game');
      });
    }, Botones.verde);

    const tienda = crearBoton(this, 0, 0, t('tienda'), () => {
      this.scene.pause();
      this.scene.launch('Tienda', { origen: this.scene.key });
    }, Botones.naranja);

    const colores = crearBoton(this, 0, 0, t('colores'), () => {
      this.scene.pause();
      this.scene.launch('Coleccion', { origen: this.scene.key });
    });

    const estadisticas = crearBoton(this, 0, 0, t('estadisticas'), () => {
      this.scene.pause();
      this.scene.launch('Estadisticas', { origen: this.scene.key });
    });

    // Monedas arriba a la derecha (se actualizan al volver de la tienda)
    const iconoMoneda = crearIconoMoneda(this, 22);
    const monedas = this.add
      .text(0, 0, String(getGuardado().monedas), { fontFamily: FUENTE, fontSize: '40px', color: Tema.texto, fontStyle: 'bold' })
      .setOrigin(1, 0.5);
    // Pastilla translúcida detrás de la moneda y la cifra
    const pastilla = this.add.graphics().setDepth(-1);
    const colocarMonedas = () => {
      iconoMoneda.setPosition(monedas.x - monedas.width - 36, monedas.y);
      dibujarPastilla(pastilla, iconoMoneda.x - 34, monedas.y - 30, monedas.x - iconoMoneda.x + 56, 60);
    };
    const alReanudar = () => {
      monedas.setText(String(getGuardado().monedas));
      colocarMonedas();
    };
    this.events.on(Phaser.Scenes.Events.RESUME, alReanudar);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.RESUME, alReanudar));

    const nivel = this.add
      .text(0, 0, t('nivel', { n: getGuardado().nivel }), { fontFamily: FUENTE, fontSize: '32px', color: Tema.textoSuave })
      .setOrigin(0.5);

    // Versión y build abajo a la izquierda (el engranaje ocupa la esquina derecha)
    const build = this.add
      // En CrazyGames solo la versión (build y commit son datos de depuración)
      .text(0, 0, EN_CRAZYGAMES ? `v${VERSION}` : [t('version', { v: VERSION, n: NUMERO_BUILD }), COMMIT_BUILD].filter(Boolean).join(' · '), {
        fontFamily: FUENTE,
        fontSize: '24px',
        color: Tema.textoSuave,
      })
      .setOrigin(0, 1);

    // Registro de depuración: texto discreto encima de la versión (no existe en CrazyGames)
    const registro = EN_CRAZYGAMES
      ? null
      : this.add
          .text(0, 0, t('registro'), { fontFamily: FUENTE, fontSize: '26px', color: Tema.textoSuave })
          .setOrigin(0, 1)
          .setPadding(10, 10)
          .setInteractive({ useHandCursor: true })
          .on('pointerup', () => {
            this.scene.pause();
            this.scene.launch('Registro', { origen: this.scene.key });
          });

    // Aviso de actualización de la app (solo en Android; en el navegador no aparece nunca)
    const aviso = this.add
      .text(0, 0, '', { fontFamily: FUENTE, fontSize: '26px', color: Tema.positivo, align: 'center' })
      .setOrigin(0.5)
      .setPadding(10, 10);
    const mostrarActualizacion = (e: EstadoActualizacion) => {
      aviso.removeAllListeners('pointerup').disableInteractive();
      if (e.tipo === 'nada') return aviso.setText('');
      if (e.tipo === 'error') return aviso.setText(t('actualizacionError')).setColor(Tema.textoSuave);
      const clave = (
        { descargando: 'actualizacionDescargando', lista: 'actualizacionInstalando', instalando: 'actualizacionInstalando', apkNuevo: 'actualizacionApk' } as const
      )[e.tipo];
      aviso.setText(t(clave, { v: e.version })).setColor(e.tipo === 'apkNuevo' ? Tema.aviso : Tema.positivo);
      if (e.tipo === 'apkNuevo') {
        // Una URL externa la abre el navegador del teléfono, no el juego
        aviso.setInteractive({ useHandCursor: true }).on('pointerup', () => (window.location.href = URL_DESCARGA_APK));
      }
      // Descargada y en el menú (sin ventanas encima): se instala ya; el juego se recarga
      if (e.tipo === 'lista') {
        const intentar = () => {
          if (this.scene.isActive() && !this.scene.isPaused()) instalarActualizacion();
          else this.time.delayedCall(1000, intentar); // hay una ventana abierta: se espera
        };
        this.time.delayedCall(1200, intentar);
      }
      return aviso;
    };
    mostrarActualizacion(getEstadoActualizacion());
    const dejarDeEscuchar = alCambiarActualizacion(mostrarActualizacion);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, dejarDeEscuchar);

    const ajustes = crearBotonAjustes(this, 0, 0, () => {
      this.scene.pause();
      this.scene.launch('Settings', { origen: this.scene.key });
    });

    // Borrar progreso: arriba a la izquierda, casi invisible y con pulsación larga + confirmación
    const borrar = crearBotonBorrarProgreso(this, () => {
      borrarProgreso();
      borrarNivelGuardado();
      borrarEstadisticas();
      this.scene.restart({ borrado: true });
    });
    if ((this.sys.settings.data as { borrado?: boolean } | undefined)?.borrado) {
      const aviso = this.add
        .text(0, 0, t('progresoBorrado'), { fontFamily: FUENTE, fontSize: '30px', color: Tema.positivo })
        .setOrigin(0.5);
      this.tweens.add({ targets: aviso, alpha: 0, delay: 1800, duration: 500 });
      alRedimensionar(this, (ancho, alto) => aviso.setPosition(ancho / 2, alto * 0.5 - 100));
    }

    alRedimensionar(this, (ancho, alto) => {
      const zona = zonaSegura(this);
      titulo.setPosition(ancho / 2, alto * 0.3);
      // Cuatro botones en columna, centrados en la parte baja (130 px entre ellos)
      const primero = alto * 0.5;
      jugar.setPosition(ancho / 2, primero);
      tienda.setPosition(ancho / 2, primero + 130);
      colores.setPosition(ancho / 2, primero + 260);
      estadisticas.setPosition(ancho / 2, primero + 390);
      nivel.setPosition(ancho / 2, primero + 490);
      aviso.setPosition(ancho / 2, primero + 550).setWordWrapWidth(ancho - 80);
      monedas.setPosition(zona.x + zona.ancho - 40, zona.y + 60);
      colocarMonedas();
      // Esquina inferior derecha, respetando notch y barra de gestos
      ajustes.setPosition(zona.x + zona.ancho - 90, zona.y + zona.alto - 90);
      build.setPosition(zona.x + 30, zona.y + zona.alto - 30);
      registro?.setPosition(zona.x + 20, zona.y + zona.alto - 62);
      borrar.colocar(zona.x + 46, zona.y + 60);
    });
  }
}
