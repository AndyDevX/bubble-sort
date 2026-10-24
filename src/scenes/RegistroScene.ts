import Phaser from 'phaser';
import { t } from '../i18n';
import { reproducirEfecto } from '../sistemas/audio';
import { borrarRegistro, getRegistro, textoCompleto, textoResumen, type EntradaRegistro } from '../sistemas/registro';
import { ajusteDeLinea, Botones, dibujarPanel, FUENTE, Tema } from '../ui/tema';

const ALTO_LINEA = 34;
const ALTO_BOTON = 84;

// Registro de depuración: lista de las últimas partidas y exportación (copiar o descargar) para
// pasar el resumen o todo el detalle. Se abre encima del menú y vuelve a él al cerrar.
export class RegistroScene extends Phaser.Scene {
  private escenaOrigen = 'Menu';
  private aviso!: Phaser.GameObjects.Text;

  constructor() {
    super('Registro');
  }

  init(data: { origen?: string }) {
    this.escenaOrigen = data.origen ?? 'Menu';
  }

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, Tema.sombra, 0.45).setInteractive();
    const panelAncho = Math.min(680, width - 24);
    const panelAlto = Math.min(height - 40, 1220);
    const arriba = (height - panelAlto) / 2;
    const izquierda = (width - panelAncho) / 2;
    dibujarPanel(this.add.graphics(), izquierda, arriba, panelAncho, panelAlto, 32);

    const entradas = getRegistro();
    this.add
      .text(width / 2, arriba + 60, t('registro'), { fontFamily: FUENTE, fontSize: '50px', color: Tema.texto, fontStyle: 'bold' })
      .setOrigin(0.5);
    this.add
      .text(width / 2, arriba + 110, t('registroPartidas', { n: entradas.length }), { fontFamily: FUENTE, fontSize: '24px', color: Tema.textoSuave })
      .setOrigin(0.5);

    // Lista: una línea por partida, la más reciente arriba
    const botonesAlto = 3 * (ALTO_BOTON + 16);
    const arribaLista = arriba + 150;
    const altoLista = panelAlto - 150 - botonesAlto - 70;
    const caben = Math.max(1, Math.floor(altoLista / ALTO_LINEA));
    const lineas = [...entradas].reverse().slice(0, caben).map((e) => this.lineaCorta(e));
    this.add
      .text(izquierda + 26, arribaLista, lineas.length ? lineas.join('\n') : t('registroVacio'), {
        fontFamily: 'monospace',
        fontSize: '19px',
        color: Tema.texto,
        lineSpacing: ALTO_LINEA - 22,
        wordWrap: ajusteDeLinea(panelAncho - 52),
      })
      .setCrop(0, 0, panelAncho - 52, altoLista);

    this.aviso = this.add
      .text(width / 2, arriba + panelAlto - botonesAlto - 40, '', { fontFamily: FUENTE, fontSize: '24px', color: Tema.positivo })
      .setOrigin(0.5);

    // Botones en dos columnas
    const anchoBoton = (panelAncho - 66) / 2;
    const fila = (n: number) => arriba + panelAlto - botonesAlto + n * (ALTO_BOTON + 16) + ALTO_BOTON / 2 - 10;
    const col = (n: number) => izquierda + 22 + anchoBoton / 2 + n * (anchoBoton + 22);
    this.boton(col(0), fila(0), anchoBoton, t('registroCopiarResumen'), () => this.copiar(textoResumen()));
    this.boton(col(1), fila(0), anchoBoton, t('registroCopiarTodo'), () => this.copiar(textoCompleto()));
    this.boton(col(0), fila(1), anchoBoton, t('registroDescargar'), () => this.descargar());
    this.boton(col(1), fila(1), anchoBoton, t('registroBorrar'), () => {
      borrarRegistro();
      this.scene.restart({ origen: this.escenaOrigen });
    });
    this.boton(width / 2, fila(2), anchoBoton, t('volver'), () => this.cerrar());

    const alCambiarTamano = () => this.scene.restart({ origen: this.escenaOrigen });
    this.scale.once(Phaser.Scale.Events.RESIZE, alCambiarTamano);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, alCambiarTamano));
  }

  private lineaCorta(e: EntradaRegistro): string {
    const r = e.resultado;
    const fin = r ? r.tipo.toUpperCase() : 'EN CURSO';
    const s = Math.round((r?.tj ?? e.eventos.at(-1)?.tj ?? 0) / 1000);
    const jugadas = e.eventos.filter((x) => x.tipo === 'mover' || x.tipo === 'fusion').length;
    return `#${e.id} N${e.nivel}${e.config.dificil ? '!' : ''} ${fin} ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} ${jugadas}j`;
  }

  // Botón compacto (el de la interfaz general mide al menos 360 de ancho)
  private boton(x: number, y: number, ancho: number, texto: string, alPulsar: () => void) {
    const fondo = this.add.graphics();
    const pintar = (color: number) => fondo.clear().fillStyle(color).fillRoundedRect(-ancho / 2, -ALTO_BOTON / 2, ancho, ALTO_BOTON, 22);
    pintar(Botones.azul.cara);
    const etiqueta = this.add
      .text(0, 0, texto, { fontFamily: FUENTE, fontSize: '28px', color: '#ffffff', fontStyle: 'bold', align: 'center', wordWrap: ajusteDeLinea(ancho - 20) })
      .setOrigin(0.5);
    const boton = this.add.container(x, y, [fondo, etiqueta]).setSize(ancho, ALTO_BOTON).setInteractive({ useHandCursor: true });
    boton.on('pointerover', () => pintar(Botones.azul.brillo));
    boton.on('pointerout', () => pintar(Botones.azul.cara));
    boton.on('pointerup', () => {
      reproducirEfecto(this, 'boton');
      alPulsar();
    });
  }

  private mostrarAviso(texto: string, color: string) {
    this.tweens.killTweensOf(this.aviso);
    this.aviso.setText(texto).setColor(color).setAlpha(1);
    this.tweens.add({ targets: this.aviso, alpha: 0, delay: 2500, duration: 400 });
  }

  private async copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      this.mostrarAviso(t('registroCopiado', { n: Math.round(texto.length / 1024) }), Tema.positivo);
      return;
    } catch {
      // Sin API del portapapeles (o sin permiso): método antiguo con un textarea temporal
    }
    const area = document.createElement('textarea');
    area.value = texto;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    if (ok) this.mostrarAviso(t('registroCopiado', { n: Math.round(texto.length / 1024) }), Tema.positivo);
    else this.mostrarAviso(t('registroNoCopiado'), Tema.peligro);
  }

  private descargar() {
    const ahora = new Date();
    const dos = (n: number) => String(n).padStart(2, '0');
    const nombre = `odi-sort-registro-${ahora.getFullYear()}${dos(ahora.getMonth() + 1)}${dos(ahora.getDate())}-${dos(ahora.getHours())}${dos(ahora.getMinutes())}.txt`;
    const url = URL.createObjectURL(new Blob([textoCompleto()], { type: 'text/plain;charset=utf-8' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    this.mostrarAviso(t('registroDescargado', { nombre }), Tema.positivo);
  }

  private cerrar() {
    this.scene.stop();
    this.scene.resume(this.escenaOrigen);
  }
}
