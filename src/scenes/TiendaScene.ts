import Phaser from 'phaser';
import { t, type ClaveTexto } from '../i18n';
import { reproducirEfecto } from '../sistemas/audio';
import { getGuardado, type Articulo } from '../sistemas/guardado';
import { CATALOGO, cantidadDe, comprar, type Oferta } from '../sistemas/tienda';
import { crearBoton } from '../ui/Boton';
import { ICONO_DESHACER, ICONO_TUBO } from '../ui/iconosHabilidad';
import { crearIconoMoneda } from '../ui/Moneda';
import { ajusteDeLinea, Botones, crearVelo, dibujarCaramelo, dibujarPanel, FUENTE, Tema } from '../ui/tema';

const ICONOS: Record<Articulo, string> = { deshacer: ICONO_DESHACER, tuboExtra: ICONO_TUBO };
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
    crearVelo(this);

    const panelAncho = Math.min(640, width - 40);
    const panelAlto = 1010;
    const arriba = (height - panelAlto) / 2;
    dibujarPanel(this.add.graphics(), (width - panelAncho) / 2, arriba, panelAncho, panelAlto, 32);

    this.add
      .text(width / 2, arriba + 80, t('tienda'), { fontFamily: FUENTE, fontSize: '64px', color: Tema.texto, fontStyle: 'bold' })
      .setOrigin(0.5);

    // Saldo
    this.iconoMoneda = crearIconoMoneda(this, 22);
    this.textoMonedas = this.add
      .text(0, arriba + 165, '', { fontFamily: FUENTE, fontSize: '44px', color: Tema.texto, fontStyle: 'bold' })
      .setOrigin(0, 0.5);

    const anchoTarjeta = panelAncho - 60;
    let y = arriba + 230 + ALTO_TARJETA / 2;
    for (const oferta of CATALOGO) {
      this.crearTarjeta(oferta, width / 2, y, anchoTarjeta);
      y += ALTO_TARJETA + SEPARACION_TARJETAS;
    }

    // Aviso de compra hecha o de monedas que faltan
    this.mensaje = this.add
      .text(width / 2, y - ALTO_TARJETA / 2 + 10, t('ganaMonedas'), { fontFamily: FUENTE, fontSize: '28px', color: Tema.textoSuave })
      .setOrigin(0.5);

    crearBoton(this, width / 2, arriba + panelAlto - 90, t('volver'), () => this.cerrar(), Botones.crema);
    this.refrescar();

    // Si cambia el tamaño de la pantalla, se vuelve a construir (las compras ya están guardadas)
    const alCambiarTamano = () => this.scene.restart({ origen: this.escenaOrigen });
    this.scale.once(Phaser.Scale.Events.RESIZE, alCambiarTamano);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, alCambiarTamano));
  }

  private crearTarjeta(oferta: Oferta, x: number, y: number, ancho: number) {
    const izquierda = -ancho / 2;
    const fondo = this.add.graphics();
    fondo.fillStyle(Tema.bordePanel, 0.55).fillRoundedRect(izquierda, -ALTO_TARJETA / 2, ancho, ALTO_TARJETA, 24);
    fondo.fillStyle(0xffffff, 0.75).fillRoundedRect(izquierda + 3, -ALTO_TARJETA / 2 + 3, ancho - 6, ALTO_TARJETA - 10, 22);

    // Icono de la habilidad, igual que su botón en la partida
    const circulo = this.add.graphics({ x: izquierda + 70, y: 0 });
    const bajaIcono = dibujarCaramelo(circulo, 88, 88, 24, Botones.azul);
    const icono = this.add.image(izquierda + 70, bajaIcono, ICONOS[oferta.articulo]).setDisplaySize(64, 64);

    const xTexto = izquierda + 135;
    const anchoTexto = ancho - 135 - 175;
    const nombre = this.add
      .text(xTexto, -42, t(NOMBRES[oferta.id]), { fontFamily: FUENTE, fontSize: '34px', color: Tema.texto, fontStyle: 'bold' })
      .setOrigin(0, 0.5);
    const descripcion = this.add
      .text(xTexto, 4, t(DESCRIPCIONES[oferta.id]), {
        fontFamily: FUENTE,
        fontSize: '24px',
        color: Tema.textoSuave,
        wordWrap: ajusteDeLinea(anchoTexto),
      })
      .setOrigin(0, 0.5);
    const tienes = this.add
      .text(xTexto, 50, '', { fontFamily: FUENTE, fontSize: '24px', color: Tema.info })
      .setOrigin(0, 0.5);

    // Botón de precio: caramelo verde si llegan las monedas, crema si no (se puede tocar igual para
    // saber cuánto falta)
    const anchoBoton = 150;
    const altoBoton = 84;
    const grafBoton = this.add.graphics();
    const moneda = crearIconoMoneda(this, 16).setPosition(-anchoBoton / 2 + 34, 0);
    const precio = this.add
      .text(-anchoBoton / 2 + 58, 0, String(oferta.precio), { fontFamily: FUENTE, fontSize: '36px', color: Tema.texto, fontStyle: 'bold' })
      .setOrigin(0, 0.5);
    const boton = this.add.container(ancho / 2 - anchoBoton / 2 - 20, 0, [grafBoton, moneda, precio]);
    boton.setSize(anchoBoton, altoBoton).setInteractive({ useHandCursor: true });

    const pintar = (hundido = false) => {
      const alcanza = getGuardado().monedas >= oferta.precio;
      const dy = dibujarCaramelo(grafBoton, anchoBoton, altoBoton, 24, alcanza ? Botones.verde : Botones.crema, hundido);
      moneda.setY(dy);
      precio.setY(dy).setColor(alcanza ? '#ffffff' : Tema.textoSuave);
      if (alcanza) precio.setStroke(Phaser.Display.Color.IntegerToColor(Botones.verde.relieve).rgba, 6);
      else precio.setStroke('#000000', 0);
    };

    const tarjeta = this.add.container(x, y, [fondo, circulo, icono, nombre, descripcion, tienes, boton]);

    boton.on('pointerover', () => boton.setScale(1.04));
    boton.on('pointerout', () => {
      pintar();
      boton.setScale(1);
    });
    boton.on('pointerdown', () => pintar(true));
    boton.on('pointerup', () => {
      pintar();
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
      this.mostrarMensaje(t('faltanMonedas', { n: faltan }), Tema.peligro);
      // El saldo tiembla (se recoloca antes por si ya estaba temblando)
      this.tweens.killTweensOf([this.textoMonedas, this.iconoMoneda]);
      this.refrescar();
      this.tweens.add({ targets: [this.textoMonedas, this.iconoMoneda], x: '+=10', duration: 50, yoyo: true, repeat: 2 });
      return;
    }
    reproducirEfecto(this, 'sellar');
    this.mostrarMensaje(t('compraHecha', { n: t(NOMBRES[oferta.id]) }), Tema.positivo);
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
