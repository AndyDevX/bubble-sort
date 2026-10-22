import Phaser from 'phaser';
import { Colores } from '../constantes';
import { CODIGOS_IDIOMA, getIdioma, nombreDeIdioma, setIdioma, t } from '../i18n';
import { actualizarAjustes, getAjustes } from '../sistemas/ajustes';
import { aplicarVolumenMusica } from '../sistemas/audio';
import { crearBoton } from '../ui/Boton';
import { crearSlider } from '../ui/Slider';

// Se abre encima de la escena que la lanza (que queda en pausa) y vuelve a ella al cerrar
export class SettingsScene extends Phaser.Scene {
  private escenaOrigen = 'Menu';
  private idiomaAlAbrir = getIdioma();

  constructor() {
    super('Settings');
  }

  init(data: { origen?: string }) {
    this.escenaOrigen = data.origen ?? 'Menu';
    this.idiomaAlAbrir = getIdioma();
  }

  create() {
    const { width, height } = this.scale;
    const ajustes = getAjustes();

    // Fondo oscuro que además bloquea los toques a la escena de debajo
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6).setInteractive();

    const panelAncho = 620;
    const panelAlto = 900;
    this.add
      .graphics()
      .fillStyle(Colores.panel)
      .fillRoundedRect((width - panelAncho) / 2, (height - panelAlto) / 2, panelAncho, panelAlto, 32);

    const arriba = (height - panelAlto) / 2;
    const estiloTitulo = { fontFamily: 'sans-serif', fontSize: '64px', color: '#ffffff', fontStyle: 'bold' };
    const estiloEtiqueta = { fontFamily: 'sans-serif', fontSize: '38px', color: '#ffffff' };
    const xEtiqueta = (width - panelAncho) / 2 + 50;
    const anchoSlider = 380;
    const xSlider = width / 2 - 55;

    this.add.text(width / 2, arriba + 90, t('ajustes'), estiloTitulo).setOrigin(0.5);

    // Música
    this.add.text(xEtiqueta, arriba + 200, t('musica'), estiloEtiqueta).setOrigin(0, 0.5);
    crearSlider(this, xSlider, arriba + 270, anchoSlider, ajustes.volumenMusica, (valor) => {
      actualizarAjustes({ volumenMusica: valor });
      aplicarVolumenMusica();
    });

    // Efectos
    this.add.text(xEtiqueta, arriba + 370, t('efectos'), estiloEtiqueta).setOrigin(0, 0.5);
    crearSlider(this, xSlider, arriba + 440, anchoSlider, ajustes.volumenEfectos, (valor) => {
      actualizarAjustes({ volumenEfectos: valor });
    });

    // Idioma: selector con flechas, preparado para cuando haya más idiomas
    this.add.text(xEtiqueta, arriba + 540, t('idioma'), estiloEtiqueta).setOrigin(0, 0.5);
    this.crearSelectorIdioma(width / 2, arriba + 620);

    crearBoton(this, width / 2, arriba + panelAlto - 110, t('volver'), () => this.cerrar());

    // Si cambia el tamaño de la pantalla, se vuelve a construir (los valores ya están guardados)
    const alCambiarTamano = () => this.scene.restart({ origen: this.escenaOrigen });
    this.scale.once(Phaser.Scale.Events.RESIZE, alCambiarTamano);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, alCambiarTamano));
  }

  private crearSelectorIdioma(x: number, y: number) {
    const hayVarios = CODIGOS_IDIOMA.length > 1;
    const colorFlecha = hayVarios ? '#ffffff' : '#66667a';

    const nombre = this.add
      .text(x, y, nombreDeIdioma(getIdioma()), { fontFamily: 'sans-serif', fontSize: '40px', color: '#ffffff' })
      .setOrigin(0.5);

    const cambiar = (paso: number) => {
      const indice = CODIGOS_IDIOMA.indexOf(getIdioma());
      const siguiente = CODIGOS_IDIOMA[(indice + paso + CODIGOS_IDIOMA.length) % CODIGOS_IDIOMA.length];
      setIdioma(siguiente);
      actualizarAjustes({ idioma: siguiente });
      this.scene.restart({ origen: this.escenaOrigen }); // repinta los textos en el nuevo idioma
    };

    const estiloFlecha = { fontFamily: 'sans-serif', fontSize: '56px', color: colorFlecha };
    const izquierda = this.add.text(x - 200, y, '‹', estiloFlecha).setOrigin(0.5).setPadding(24, 8);
    const derecha = this.add.text(x + 200, y, '›', estiloFlecha).setOrigin(0.5).setPadding(24, 8);

    if (hayVarios) {
      izquierda.setInteractive({ useHandCursor: true }).on('pointerup', () => cambiar(-1));
      derecha.setInteractive({ useHandCursor: true }).on('pointerup', () => cambiar(1));
    }

    return nombre;
  }

  private cerrar() {
    const idiomaCambiado = getIdioma() !== this.idiomaAlAbrir;
    this.scene.stop();
    if (idiomaCambiado) {
      // Reinicia la escena de origen (con sus mismos datos) para que muestre los textos nuevos
      const datosOrigen = this.scene.get(this.escenaOrigen).sys.settings.data;
      this.scene.start(this.escenaOrigen, datosOrigen);
    } else {
      this.scene.resume(this.escenaOrigen);
    }
  }
}
