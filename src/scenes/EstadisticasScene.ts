import Phaser from 'phaser';
import { t, type ClaveTexto } from '../i18n';
import { nombreColor } from '../i18n/nombresColor';
import { ORDEN_COLORES } from '../juego/niveles';
import { getEstadisticas, total, type Habilidad } from '../sistemas/estadisticas';
import { crearBoton } from '../ui/Boton';
import { ICONO_DESHACER, ICONO_GRAVEDAD, ICONO_TUBO } from '../ui/iconosHabilidad';
import { Botones, crearVelo, dibujarCaramelo, dibujarPanel, FUENTE, Tema } from '../ui/tema';

const COLUMNAS = 6;
const ALTO_FILA = 80;
const BOLA = 50;

// Funciones (no constantes): la fuente depende del idioma actual
const estiloSeccion = () => ({ fontFamily: FUENTE, fontSize: '30px', color: Tema.info, fontStyle: 'bold' });
const estiloNumero = () => ({ fontFamily: FUENTE, fontSize: '46px', color: Tema.texto, fontStyle: 'bold' });
const estiloEtiqueta = () => ({ fontFamily: FUENTE, fontSize: '22px', color: Tema.textoSuave });

// Estadísticas del jugador. Se abre encima del menú (que queda en pausa) y vuelve a él al cerrar.
export class EstadisticasScene extends Phaser.Scene {
  private escenaOrigen = 'Menu';

  constructor() {
    super('Estadisticas');
  }

  init(data: { origen?: string }) {
    this.escenaOrigen = data.origen ?? 'Menu';
  }

  create() {
    const { width, height } = this.scale;
    const e = getEstadisticas();
    crearVelo(this);

    const panelAncho = Math.min(660, width - 30);
    const panelAlto = Math.min(height - 40, 1220);
    const arriba = (height - panelAlto) / 2;
    const izquierda = (width - panelAncho) / 2;
    dibujarPanel(this.add.graphics(), izquierda, arriba, panelAncho, panelAlto, 32);
    this.add
      .text(width / 2, arriba + 65, t('estadisticas'), { fontFamily: FUENTE, fontSize: '56px', color: Tema.texto, fontStyle: 'bold' })
      .setOrigin(0.5);

    // Niveles: tres cifras en fila y el porcentaje de victorias
    this.add.text(width / 2, arriba + 135, t('estNiveles'), estiloSeccion()).setOrigin(0.5);
    const cifras: [ClaveTexto, number][] = [
      ['estSuperados', e.nivelesSuperados],
      ['estFallidos', e.nivelesFallidos],
      ['estGenerados', e.nivelesGenerados],
    ];
    cifras.forEach(([clave, valor], i) => {
      const x = izquierda + (panelAncho / 3) * (i + 0.5);
      this.add.text(x, arriba + 190, String(valor), estiloNumero()).setOrigin(0.5);
      this.add.text(x, arriba + 232, t(clave), estiloEtiqueta()).setOrigin(0.5);
    });
    const jugados = e.nivelesSuperados + e.nivelesFallidos;
    if (jugados > 0) {
      this.add
        .text(width / 2, arriba + 268, t('estVictorias', { n: Math.round((e.nivelesSuperados / jugados) * 100) }), estiloEtiqueta())
        .setOrigin(0.5);
    }

    // Habilidades usadas, con su icono
    this.add.text(width / 2, arriba + 325, t('estHabilidades'), estiloSeccion()).setOrigin(0.5);
    const habilidades: [Habilidad, string, ClaveTexto][] = [
      ['deshacer', ICONO_DESHACER, 'estDeshacer'],
      ['tuboExtra', ICONO_TUBO, 'estTuboExtra'],
      ['gravedad', ICONO_GRAVEDAD, 'gravedad'],
    ];
    habilidades.forEach(([habilidad, icono, clave], i) => {
      const x = izquierda + (panelAncho / 3) * (i + 0.5);
      dibujarCaramelo(this.add.graphics({ x: x - 34, y: arriba + 385 }), 60, 60, 18, Botones.azul);
      this.add.image(x - 34, arriba + 385, icono).setDisplaySize(48, 48);
      this.add.text(x + 10, arriba + 385, String(e.habilidades[habilidad]), { ...estiloNumero(), fontSize: '40px' }).setOrigin(0, 0.5);
      this.add.text(x, arriba + 432, t(clave), estiloEtiqueta()).setOrigin(0.5);
    });

    // Tubos llenos y canicas movidas, por color
    let y = arriba + 500;
    y = this.rejillaColores(t('estTubos', { n: total('tubosLlenos') }), e.tubosLlenos, izquierda, panelAncho, y);
    this.rejillaColores(t('estCanicas', { n: total('canicasMovidas') }), e.canicasMovidas, izquierda, panelAncho, y + 20);

    crearBoton(this, width / 2, arriba + panelAlto - 75, t('volver'), () => this.cerrar(), Botones.crema);

    const alCambiarTamano = () => this.scene.restart({ origen: this.escenaOrigen });
    this.scale.once(Phaser.Scale.Events.RESIZE, alCambiarTamano);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, alCambiarTamano));
  }

  // Título de sección y una cuadrícula de bolas con su cifra (solo colores con al menos 1).
  // Devuelve la y donde termina.
  private rejillaColores(titulo: string, datos: Partial<Record<string, number>>, izquierda: number, ancho: number, y: number): number {
    this.add.text(izquierda + ancho / 2, y, titulo, estiloSeccion()).setOrigin(0.5);
    const colores = ORDEN_COLORES.filter((c) => (datos[c] ?? 0) > 0);
    if (colores.length === 0) {
      this.add.text(izquierda + ancho / 2, y + 55, t('estNinguno'), estiloEtiqueta()).setOrigin(0.5);
      return y + 90;
    }
    const anchoCelda = (ancho - 40) / COLUMNAS;
    colores.forEach((color, i) => {
      const x = izquierda + 20 + anchoCelda * (i % COLUMNAS) + anchoCelda / 2;
      const yy = y + 60 + ALTO_FILA * Math.floor(i / COLUMNAS);
      const bola = this.add.image(x, yy, `bola-${color}`).setDisplaySize(BOLA, BOLA);
      bola.setInteractive();
      const cifra = this.add.text(x, yy + BOLA / 2 + 12, String(datos[color]), { ...estiloEtiqueta(), color: Tema.texto }).setOrigin(0.5);
      // Al tocar una bola se ve el nombre del color en lugar de la cifra
      bola.on('pointerdown', () => cifra.setText(nombreColor(color)));
      bola.on('pointerup', () => cifra.setText(String(datos[color])));
      bola.on('pointerout', () => cifra.setText(String(datos[color])));
    });
    return y + 60 + ALTO_FILA * Math.ceil(colores.length / COLUMNAS) - 20;
  }

  private cerrar() {
    this.scene.stop();
    this.scene.resume(this.escenaOrigen);
  }
}
