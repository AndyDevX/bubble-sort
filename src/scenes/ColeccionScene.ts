import Phaser from 'phaser';
import { Colores } from '../constantes';
import { t } from '../i18n';
import { nombreColor } from '../i18n/nombresColor';
import type { ColorId } from '../juego/colores';
import { nivelDesbloqueo, ORDEN_COLORES } from '../juego/niveles';
import { reproducirEfecto } from '../sistemas/audio';
import { getGuardado } from '../sistemas/guardado';
import { crearBoton } from '../ui/Boton';

const COLUMNAS = 4;
const ALTO_CELDA = 128;
const BOLA_CELDA = 84;
const BOLA_GRANDE = 140;

// Catálogo de colores en el orden en que se desbloquean. Los descubiertos (nivel alcanzado)
// muestran su bola y su nombre; los demás, una canica negra con «?» y el nivel en que aparecen.
// Se abre encima de la escena que la lanza (que queda en pausa) y vuelve a ella al cerrar.
export class ColeccionScene extends Phaser.Scene {
  private escenaOrigen = 'Menu';
  private seleccionado: ColorId = 'rojo';

  constructor() {
    super('Coleccion');
  }

  init(data: { origen?: string; seleccionado?: ColorId }) {
    this.escenaOrigen = data.origen ?? 'Menu';
    const descubiertos = ORDEN_COLORES.filter((c) => this.descubierto(c));
    // Por defecto, el último color descubierto
    this.seleccionado = data.seleccionado ?? descubiertos[descubiertos.length - 1] ?? 'rojo';
  }

  private descubierto(color: ColorId) {
    return getGuardado().mejorNivel >= nivelDesbloqueo(color);
  }

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6).setInteractive();

    const panelAncho = Math.min(660, width - 30);
    const panelAlto = Math.min(height - 40, 1220);
    const arriba = (height - panelAlto) / 2;
    const izquierda = (width - panelAncho) / 2;
    this.add.graphics().fillStyle(Colores.panel).fillRoundedRect(izquierda, arriba, panelAncho, panelAlto, 32);

    const descubiertos = ORDEN_COLORES.filter((c) => this.descubierto(c)).length;
    this.add
      .text(width / 2, arriba + 65, t('colores'), { fontFamily: 'sans-serif', fontSize: '56px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.add
      .text(width / 2, arriba + 120, t('descubiertos', { n: descubiertos, total: ORDEN_COLORES.length }), {
        fontFamily: 'sans-serif',
        fontSize: '28px',
        color: '#aaaacc',
      })
      .setOrigin(0.5);

    // Vista grande del color seleccionado
    const grande = this.add.image(width / 2, arriba + 228, 'bola-bloqueada').setDisplaySize(BOLA_GRANDE, BOLA_GRANDE);
    const nombre = this.add
      .text(width / 2, arriba + 320, '', { fontFamily: 'sans-serif', fontSize: '36px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);
    const detalle = this.add
      .text(width / 2, arriba + 360, '', { fontFamily: 'sans-serif', fontSize: '24px', color: '#81d4fa' })
      .setOrigin(0.5);
    const marca = this.add.graphics();

    const mostrar = (color: ColorId, animar: boolean) => {
      this.seleccionado = color;
      const visto = this.descubierto(color);
      const nivel = nivelDesbloqueo(color);
      grande.setTexture(visto ? `bola-${color}` : 'bola-bloqueada').setDisplaySize(BOLA_GRANDE, BOLA_GRANDE);
      nombre.setText(visto ? nombreColor(color) : t('colorOculto'));
      detalle.setText(visto ? (nivel <= 1 ? t('deSalida') : t('desbloqueadoEn', { n: nivel })) : t('seDesbloqueaEn', { n: nivel }));
      const celda = celdas.get(color);
      if (celda) {
        marca.clear().lineStyle(4, Colores.primario).strokeCircle(celda.x, celda.y, BOLA_CELDA / 2 + 6);
      }
      if (animar) {
        const escala = grande.scaleX;
        grande.setScale(escala * 0.7);
        this.tweens.add({ targets: grande, scale: escala, duration: 260, ease: 'Back.easeOut' });
      }
    };

    // Cuadrícula en orden de desbloqueo
    const anchoCelda = (panelAncho - 40) / COLUMNAS;
    const arribaRejilla = arriba + 410;
    const celdas = new Map<ColorId, { x: number; y: number }>();
    ORDEN_COLORES.forEach((color, i) => {
      const x = izquierda + 20 + anchoCelda * (i % COLUMNAS) + anchoCelda / 2;
      const y = arribaRejilla + ALTO_CELDA * Math.floor(i / COLUMNAS) + BOLA_CELDA / 2;
      const visto = this.descubierto(color);
      celdas.set(color, { x, y });
      const bola = this.add.image(x, y, visto ? `bola-${color}` : 'bola-bloqueada').setDisplaySize(BOLA_CELDA, BOLA_CELDA);
      this.add
        .text(x, y + BOLA_CELDA / 2 + 16, visto ? nombreColor(color) : t('nivelCorto', { n: nivelDesbloqueo(color) }), {
          fontFamily: 'sans-serif',
          fontSize: '20px',
          color: visto ? '#ffffff' : '#66667a',
        })
        .setOrigin(0.5);
      bola.setInteractive({ useHandCursor: true }).on('pointerup', () => {
        reproducirEfecto(this, visto ? 'seleccionar' : 'error', true);
        mostrar(color, true);
      });
    });
    mostrar(this.seleccionado, false);

    crearBoton(this, width / 2, arriba + panelAlto - 75, t('volver'), () => this.cerrar());

    // Al cambiar el tamaño se reconstruye conservando el color elegido
    const alCambiarTamano = () => this.scene.restart({ origen: this.escenaOrigen, seleccionado: this.seleccionado });
    this.scale.once(Phaser.Scale.Events.RESIZE, alCambiarTamano);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, alCambiarTamano));
  }

  private cerrar() {
    this.scene.stop();
    this.scene.resume(this.escenaOrigen);
  }
}
