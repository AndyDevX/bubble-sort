import Phaser from 'phaser';
import { Colores } from '../constantes';
import { t, type ClaveTexto } from '../i18n';
import { reproducirEfecto } from '../sistemas/audio';
import { getGuardado, type Articulo } from '../sistemas/guardado';
import { CATALOGO, cantidadDe, comprar, type Oferta } from '../sistemas/tienda';
import { crearBoton } from '../ui/Boton';
import { iconoDeshacer, iconoTuboExtra, type DibujarIcono } from '../ui/BotonRedondo';
import { crearIconoMoneda } from '../ui/Moneda';

const ICONOS: Record<Articulo, DibujarIcono> = { deshacer: iconoDeshacer, tuboExtra: iconoTuboExtra };
const NOMBRES: Record<string, ClaveTexto> = { deshacer1: 'ofertaDeshacer1', deshacer5: 'ofertaDeshacer5', tubo1: 'ofertaTubo1' };
const DESCRIPCIONES: Record<string, ClaveTexto> = { deshacer1: 'descDeshacer1', deshacer5: 'descDeshacer5', tubo1: 'descTubo1' };

const ALTO_TARJETA = 180;
const SEPARACION_TARJETAS = 20;

// Tienda de habilidades. Se abre encima de la escena que la lanza (Menú, partida o pausa),
// que queda en pausa, y vuelve a ella al cerrar.
export class TiendaScene extends Phaser.Scene {
  private escenaOrigen = 'Menu';
  private textoMonedas!: Phaser.GameObjects.Text;
  private iconoMoneda!: Phaser.GameObjects.Graphics;
  private mensaje!: Phaser.GameObjects.Text;
  private refrescos: (() => void)[] = [];

  constructor() {
    super('Tienda');
  }

  init(data: { origen?: string }) {
    this.escenaOrigen = data.origen ?? 'Menu';
    this.refrescos = [];
  }

  create() {
    const { width, height } = this.scale;

    // Fondo oscuro que además bloquea los toques a la escena de debajo
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6).setInteractive();

    const panelAncho = Math.min(640, width - 40);
    const panelAlto = 1010;
    const arriba = (height - panelAlto) / 2;
    this.add
      .graphics()
      .fillStyle(Colores.panel)
      .fillRoundedRect((width - panelAncho) / 2, arriba, panelAncho, panelAlto, 32);

    this.add
      .text(width / 2, arriba + 80, t('tienda'), { fontFamily: 'sans-serif', fontSize: '64px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);

    // Saldo
    this.iconoMoneda = crearIconoMoneda(this, 22);
    this.textoMonedas = this.add
      .text(0, arriba + 165, '', { fontFamily: 'sans-serif', fontSize: '44px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0, 0.5);

    const anchoTarjeta = panelAncho - 60;
    let y = arriba + 230 + ALTO_TARJETA / 2;
    for (const oferta of CATALOGO) {
      this.crearTarjeta(oferta, width / 2, y, anchoTarjeta);
      y += ALTO_TARJETA + SEPARACION_TARJETAS;
    }

    // Aviso de compra hecha o de monedas que faltan
    this.mensaje = this.add
      .text(width / 2, y - ALTO_TARJETA / 2 + 10, t('ganaMonedas'), { fontFamily: 'sans-serif', fontSize: '28px', color: '#aaaacc' })
      .setOrigin(0.5);

    crearBoton(this, width / 2, arriba + panelAlto - 90, t('volver'), () => this.cerrar());
    this.refrescar();

    // Si cambia el tamaño de la pantalla, se vuelve a construir (las compras ya están guardadas)
    const alCambiarTamano = () => this.scene.restart({ origen: this.escenaOrigen });
    this.scale.once(Phaser.Scale.Events.RESIZE, alCambiarTamano);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, alCambiarTamano));
  }

  private crearTarjeta(oferta: Oferta, x: number, y: number, ancho: number) {
    const izquierda = -ancho / 2;
    const fondo = this.add.graphics();
    fondo.fillStyle(0x34344d).fillRoundedRect(izquierda, -ALTO_TARJETA / 2, ancho, ALTO_TARJETA, 24);

    // Icono de la habilidad, igual que su botón en la partida
    const icono = this.add.graphics({ x: izquierda + 70, y: 0 });
    icono.fillStyle(Colores.primario).fillCircle(0, 0, 44);
    ICONOS[oferta.articulo](icono, Colores.primario);

    const xTexto = izquierda + 135;
    const anchoTexto = ancho - 135 - 175;
    const nombre = this.add
      .text(xTexto, -42, t(NOMBRES[oferta.id]), { fontFamily: 'sans-serif', fontSize: '34px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0, 0.5);
    const descripcion = this.add
      .text(xTexto, 4, t(DESCRIPCIONES[oferta.id]), {
        fontFamily: 'sans-serif',
        fontSize: '24px',
        color: '#aaaacc',
        wordWrap: { width: anchoTexto },
      })
      .setOrigin(0, 0.5);
    const tienes = this.add
      .text(xTexto, 50, '', { fontFamily: 'sans-serif', fontSize: '24px', color: '#81d4fa' })
      .setOrigin(0, 0.5);

    // Botón de precio: azul si llegan las monedas, gris si no (se puede tocar igual para saber cuánto falta)
    const anchoBoton = 150;
    const altoBoton = 84;
    const grafBoton = this.add.graphics();
    const moneda = crearIconoMoneda(this, 16).setPosition(-anchoBoton / 2 + 34, 0);
    const precio = this.add
      .text(-anchoBoton / 2 + 58, 0, String(oferta.precio), { fontFamily: 'sans-serif', fontSize: '36px', color: '#1d1d2b', fontStyle: 'bold' })
      .setOrigin(0, 0.5);
    const boton = this.add.container(ancho / 2 - anchoBoton / 2 - 20, 0, [grafBoton, moneda, precio]);
    boton.setSize(anchoBoton, altoBoton).setInteractive({ useHandCursor: true });

    const pintar = (claro = false) => {
      const alcanza = getGuardado().monedas >= oferta.precio;
      const color = alcanza ? (claro ? Colores.primarioClaro : Colores.primario) : Colores.pista;
      grafBoton.clear().fillStyle(color).fillRoundedRect(-anchoBoton / 2, -altoBoton / 2, anchoBoton, altoBoton, 22);
      precio.setColor(alcanza ? '#1d1d2b' : '#9a9ab0');
    };

    const tarjeta = this.add.container(x, y, [fondo, icono, nombre, descripcion, tienes, boton]);

    boton.on('pointerover', () => pintar(true));
    boton.on('pointerout', () => {
      pintar();
      boton.setScale(1);
    });
    boton.on('pointerdown', () => boton.setScale(0.94));
    boton.on('pointerup', () => {
      boton.setScale(1);
      this.intentarComprar(oferta, tarjeta);
    });

    this.refrescos.push(() => {
      tienes.setText(t('tienes', { n: cantidadDe(oferta.articulo) }));
      pintar();
    });
  }

  private intentarComprar(oferta: Oferta, tarjeta: Phaser.GameObjects.Container) {
    const faltan = oferta.precio - getGuardado().monedas;
    if (!comprar(oferta)) {
      reproducirEfecto(this, 'error');
      this.mostrarMensaje(t('faltanMonedas', { n: faltan }), '#ff8a80');
      // El saldo tiembla (se recoloca antes por si ya estaba temblando)
      this.tweens.killTweensOf([this.textoMonedas, this.iconoMoneda]);
      this.refrescar();
      this.tweens.add({ targets: [this.textoMonedas, this.iconoMoneda], x: '+=10', duration: 50, yoyo: true, repeat: 2 });
      return;
    }
    reproducirEfecto(this, 'sellar');
    this.mostrarMensaje(t('compraHecha', { n: t(NOMBRES[oferta.id]) }), '#a5d6a7');
    this.tweens.killTweensOf(tarjeta);
    tarjeta.setScale(1);
    this.tweens.add({ targets: tarjeta, scale: 1.04, duration: 110, yoyo: true, ease: 'Quad.easeOut' });
    this.refrescar();
  }

  private mostrarMensaje(texto: string, color: string) {
    this.tweens.killTweensOf(this.mensaje);
    this.mensaje.setText(texto).setColor(color).setAlpha(1);
    this.tweens.add({ targets: this.mensaje, alpha: 0.35, delay: 1800, duration: 400 });
  }

  // Saldo e inventario: solo se repintan al comprar (no cada frame)
  private refrescar() {
    this.textoMonedas.setText(String(getGuardado().monedas));
    // Moneda + número centrados juntos
    const anchoTotal = 44 + 14 + this.textoMonedas.width;
    const inicio = this.scale.width / 2 - anchoTotal / 2;
    this.iconoMoneda.setPosition(inicio + 22, this.textoMonedas.y);
    this.textoMonedas.setX(inicio + 58);
    for (const refrescar of this.refrescos) refrescar();
  }

  private cerrar() {
    this.scene.stop();
    this.scene.resume(this.escenaOrigen);
  }
}
