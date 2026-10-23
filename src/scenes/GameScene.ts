import Phaser from 'phaser';
import { Colores } from '../constantes';
import { t } from '../i18n';
import type { ColorId } from '../juego/colores';
import {
  CAPACIDAD,
  aplicarMovimiento,
  arriba,
  clonarTubos,
  evaluarMovimiento,
  hayMovimientos,
  intentarSellar,
  invertirTubos,
  nivelCompleto,
  nuevaBola,
  type Bola,
  type Movimiento,
  type Tubo,
} from '../juego/modelo';
import { generarNivel, type Nivel } from '../juego/niveles';
import { claveTextura, colorHex } from '../juego/texturas';
import { iniciarMusicaPartida, reproducirEfecto } from '../sistemas/audio';
import { actualizarGuardado, getGuardado } from '../sistemas/guardado';
import { cargarNivel, guardarNivel } from '../sistemas/nivelGuardado';
import { crearBarraHabilidad, type BarraHabilidad } from '../ui/BarraHabilidad';
import { crearBotonRedondo, iconoDeshacer, iconoPausa, type BotonRedondo } from '../ui/BotonRedondo';
import { alRedimensionar, zonaSegura } from '../ui/layout';
import type { DatosDialogo } from './DialogoScene';

// Cómo empieza la partida: seguir con el nivel guardado, reiniciarlo igual o generar uno nuevo
export type ModoInicio = 'continuar' | 'reiniciar' | 'nuevo';

const PUNTOS_SELLAR = 100;
const PUNTOS_FUSION = 25;
const PUNTOS_ACIERTO = 10; // por bola colocada sobre una de su mismo color
const PUNTOS_CARGA = 150; // puntos para llenar la barra de Gravedad (una sola carga)
const MAX_DESHACER = 5; // deshacer disponibles por nivel

// Estado completo antes de una jugada, para poder deshacerla
interface Instantanea {
  tubos: Tubo[];
  puntos: number;
  carga: number;
  bolasPuntuadas: number[];
  lluviaPendiente: ColorId[];
  lluviaIniciada: boolean;
}

// Medidas calculadas según el tamaño de pantalla
interface Colocacion {
  d: number;           // diámetro de una bola
  anchoTubo: number;
  altoTubo: number;
  centros: { x: number; y: number }[];
}

export class GameScene extends Phaser.Scene {
  private numeroNivel = 1;
  private modo: ModoInicio = 'continuar';
  private nivel!: Nivel;
  private tubos: Tubo[] = [];

  // Vista: el modelo (this.tubos) manda; los sprites solo lo representan
  private sprites = new Map<number, Phaser.GameObjects.Image>();
  private graficosTubo: Phaser.GameObjects.Graphics[] = [];
  private zonasTubo: Phaser.GameObjects.Zone[] = [];
  private col: Colocacion = { d: 1, anchoTubo: 1, altoTubo: 1, centros: [] };

  private seleccionado: number | null = null;
  private bloqueadoHasta = 0; // no se aceptan toques mientras dura una animación
  private terminado = false;

  private puntos = 0;
  private carga = 0;
  private bolasPuntuadas = new Set<number>();

  private lluviaPendiente: ColorId[] = [];
  private lluviaIniciada = false;
  private temporizadorLluvia: Phaser.Time.TimerEvent | null = null;
  private gotaEnEspera = false;

  private historial: Instantanea[] = [];
  private deshacerRestantes = MAX_DESHACER;

  private textoNivel!: Phaser.GameObjects.Text;
  private textoPuntos!: Phaser.GameObjects.Text;
  private textoMonedas!: Phaser.GameObjects.Text;
  private iconoMoneda!: Phaser.GameObjects.Graphics;
  private textoLluvia!: Phaser.GameObjects.Text;
  private avisoLluvia!: Phaser.GameObjects.Text;
  private barra!: BarraHabilidad;
  private botonPausa!: BotonRedondo;
  private botonDeshacer!: BotonRedondo;
  private contadorDeshacer!: Phaser.GameObjects.Text;
  private fondoContador!: Phaser.GameObjects.Graphics;

  constructor() {
    super('Game');
  }

  init(datos?: { modo?: ModoInicio }) {
    // La escena se reutiliza al reiniciar: todo el estado se pone a cero aquí
    this.modo = datos?.modo ?? 'continuar';
    this.numeroNivel = getGuardado().nivel;
    this.tubos = [];
    this.sprites = new Map();
    this.graficosTubo = [];
    this.zonasTubo = [];
    this.seleccionado = null;
    this.bloqueadoHasta = 0;
    this.terminado = false;
    this.puntos = 0;
    this.carga = 0;
    this.bolasPuntuadas = new Set();
    this.lluviaPendiente = [];
    this.lluviaIniciada = false;
    this.temporizadorLluvia = null;
    this.gotaEnEspera = false;
    this.historial = [];
    this.deshacerRestantes = MAX_DESHACER;
  }

  create() {
    this.cameras.main.fadeIn(250);
    iniciarMusicaPartida(this);

    // La configuración inicial del nivel se guarda al generarlo; reiniciar la vuelve a cargar igual
    const guardado = this.modo === 'nuevo' ? null : cargarNivel(this.numeroNivel);
    this.nivel = guardado ?? generarNivel(this.numeroNivel);
    if (!guardado) guardarNivel(this.numeroNivel, this.nivel);
    this.tubos = this.nivel.tubos;
    for (const color of this.nivel.coloresLluvia) {
      for (let i = 0; i < CAPACIDAD; i++) this.lluviaPendiente.push(color);
    }

    // Tubos: gráfico + zona táctil más grande que el tubo
    this.tubos.forEach((_, i) => {
      this.graficosTubo.push(this.add.graphics());
      const zona = this.add.zone(0, 0, 1, 1).setInteractive({ useHandCursor: true });
      zona.on('pointerup', () => this.tocarTubo(i));
      this.zonasTubo.push(zona);
    });

    this.crearInterfaz();
    alRedimensionar(this, (ancho) => this.colocarTodo(ancho));

    // El diálogo de derrota puede pedir deshacer
    const alPedirDeshacer = () => this.deshacer();
    this.events.on('deshacer', alPedirDeshacer);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off('deshacer', alPedirDeshacer));
  }

  // ───────────────────────── Interfaz ─────────────────────────

  private crearInterfaz() {
    const estilo = { fontFamily: 'sans-serif', color: '#ffffff' };

    this.botonPausa = crearBotonRedondo(this, 0, 0, 44, iconoPausa, () => this.pausar());

    this.textoNivel = this.add.text(0, 0, t('nivel', { n: this.numeroNivel }), { ...estilo, fontSize: '40px', fontStyle: 'bold' }).setOrigin(0.5);
    this.textoPuntos = this.add.text(0, 0, t('puntos', { n: 0 }), { ...estilo, fontSize: '28px', color: '#aaaacc' }).setOrigin(0.5);

    this.iconoMoneda = this.add.graphics();
    this.iconoMoneda.fillStyle(0xfdd835).fillCircle(0, 0, 18);
    this.iconoMoneda.lineStyle(4, 0xf9a825).strokeCircle(0, 0, 11);
    this.textoMonedas = this.add.text(0, 0, String(getGuardado().monedas), { ...estilo, fontSize: '32px' }).setOrigin(1, 0.5);

    this.textoLluvia = this.add.text(0, 0, '', { ...estilo, fontSize: '26px', color: '#81d4fa' }).setOrigin(1, 0.5).setVisible(false);
    this.avisoLluvia = this.add
      .text(0, 0, t('empiezaLluvia'), { ...estilo, fontSize: '48px', fontStyle: 'bold', color: '#81d4fa' })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(10);

    this.barra = crearBarraHabilidad(this, t('gravedad'), () => this.usarGravedad());

    this.botonDeshacer = crearBotonRedondo(this, 0, 0, 44, iconoDeshacer, () => this.deshacer());
    // Contador: círculo sobre la esquina superior derecha del botón
    this.fondoContador = this.add.graphics().setDepth(3);
    this.fondoContador.fillStyle(Colores.fondo).fillCircle(0, 0, 19);
    this.fondoContador.lineStyle(3, Colores.primario).strokeCircle(0, 0, 19);
    this.contadorDeshacer = this.add.text(0, 0, '', { ...estilo, fontSize: '24px', fontStyle: 'bold' }).setOrigin(0.5).setDepth(4);
    this.actualizarDeshacer();
  }

  private colocarTodo(ancho: number) {
    const zona = zonaSegura(this);
    const yBarraSuperior = zona.y + 70;

    this.botonPausa.setPosition(zona.x + 70, yBarraSuperior);
    this.textoNivel.setPosition(ancho / 2, yBarraSuperior - 16);
    this.textoPuntos.setPosition(ancho / 2, yBarraSuperior + 26);
    this.textoMonedas.setPosition(zona.x + zona.ancho - 40, yBarraSuperior);
    this.colocarIconoMoneda();
    this.textoLluvia.setPosition(zona.x + zona.ancho - 40, yBarraSuperior + 50);

    // Fila inferior: [deshacer] [barra de Gravedad + botón], centrada
    const yInferior = zona.y + zona.alto - 100;
    const anchoBarra = Math.min(600, zona.ancho - 180);
    const izquierdaFila = ancho / 2 - (88 + 20 + anchoBarra) / 2;
    this.botonDeshacer.setPosition(izquierdaFila + 44, yInferior);
    this.fondoContador.setPosition(izquierdaFila + 44 + 34, yInferior - 34);
    this.contadorDeshacer.setPosition(izquierdaFila + 44 + 34, yInferior - 34);
    this.barra.colocar(izquierdaFila + 108 + anchoBarra / 2, yInferior, anchoBarra);

    // Zona de los tubos: entre la barra superior y la de Gravedad
    const arribaTubos = zona.y + 160;
    const abajoTubos = zona.y + zona.alto - 200;
    this.col = this.calcularColocacion(zona.x + 20, arribaTubos, zona.ancho - 40, abajoTubos - arribaTubos);
    this.avisoLluvia.setPosition(ancho / 2, arribaTubos + 10);

    this.tubos.forEach((_, i) => {
      const c = this.col.centros[i];
      this.graficosTubo[i].setPosition(c.x, c.y).setAngle(0);
      this.dibujarTubo(i);
      const altoZona = this.col.altoTubo + this.col.d * 1.4;
      this.zonasTubo[i].setPosition(c.x, c.y - this.col.d * 0.5).setSize(this.col.anchoTubo * 1.5, altoZona);
      this.zonasTubo[i].input?.hitArea.setTo(0, 0, this.col.anchoTubo * 1.5, altoZona);
    });

    // Cualquier animación en curso se descarta: el modelo ya tiene el estado final
    this.bloqueadoHasta = 0;
    this.sincronizarSprites();
  }

  private colocarIconoMoneda() {
    this.iconoMoneda.setPosition(this.textoMonedas.x - this.textoMonedas.width - 30, this.textoMonedas.y);
  }

  private calcularColocacion(x: number, y: number, ancho: number, alto: number): Colocacion {
    const n = this.tubos.length;
    const filas = n <= 5 ? 1 : 2;
    const columnas = Math.ceil(n / filas);

    // En unidades de diámetro de bola
    const anchoTuboU = 1.3;
    const separacionU = 0.55;
    const altoTuboU = CAPACIDAD + 0.5;
    const espacioLevantarU = 1.4;
    const separacionFilasU = 0.4;

    const dPorAncho = ancho / (columnas * anchoTuboU + (columnas - 1) * separacionU);
    const dPorAlto = alto / (filas * (altoTuboU + espacioLevantarU) + (filas - 1) * separacionFilasU);
    const d = Math.min(dPorAncho, dPorAlto, 120);

    const anchoTubo = d * anchoTuboU;
    const altoTubo = d * altoTuboU;
    const altoFila = d * (altoTuboU + espacioLevantarU);
    const altoTotal = filas * altoFila + (filas - 1) * d * separacionFilasU;
    const arribaInicio = y + (alto - altoTotal) / 2;

    const centros: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) {
      const fila = Math.floor(i / columnas);
      const enFila = fila === filas - 1 ? n - columnas * (filas - 1) : columnas;
      const columna = i - fila * columnas;
      const anchoFila = enFila * anchoTubo + (enFila - 1) * d * separacionU;
      const cx = x + (ancho - anchoFila) / 2 + anchoTubo / 2 + columna * (anchoTubo + d * separacionU);
      const cy = arribaInicio + fila * (altoFila + d * separacionFilasU) + d * espacioLevantarU + altoTubo / 2;
      centros.push({ x: cx, y: cy });
    }
    return { d, anchoTubo, altoTubo, centros };
  }

  private dibujarTubo(i: number) {
    const g = this.graficosTubo[i];
    const tubo = this.tubos[i];
    const { anchoTubo: w, altoTubo: h } = this.col;
    const radio = w * 0.45;
    g.clear();

    if (tubo.sellado) {
      const color = colorHex(tubo.bolas[0].color);
      g.fillStyle(color, 0.22).fillRoundedRect(-w / 2, -h / 2, w, h, radio);
      g.lineStyle(5, color, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, radio);
      // tapón
      g.fillStyle(color, 1).fillRoundedRect(-w / 2 - 6, -h / 2 - 14, w + 12, 18, 8);
    } else {
      g.fillStyle(0xffffff, 0.06).fillRoundedRect(-w / 2, -h / 2, w, h, radio);
      g.lineStyle(4, 0xffffff, 0.35).strokeRoundedRect(-w / 2, -h / 2, w, h, radio);
    }
  }

  // ───────────────────────── Sprites ─────────────────────────

  private posicionHueco(tubo: number, indice: number) {
    const c = this.col.centros[tubo];
    return { x: c.x, y: c.y + this.col.altoTubo / 2 - this.col.d * 0.25 - this.col.d * (indice + 0.5) };
  }

  private posicionLevantada(tubo: number) {
    const c = this.col.centros[tubo];
    return { x: c.x, y: c.y - this.col.altoTubo / 2 - this.col.d * 0.7 };
  }

  private crearSprite(bola: Bola, x: number, y: number) {
    const sprite = this.add.image(x, y, claveTextura(bola)).setDepth(2);
    sprite.setDisplaySize(this.col.d * 0.92, this.col.d * 0.92);
    this.sprites.set(bola.id, sprite);
    return sprite;
  }

  // Coloca cada bola donde dice el modelo y elimina sprites que ya no existen
  private sincronizarSprites() {
    const vivos = new Set<number>();
    this.tubos.forEach((tubo, t) => {
      tubo.bolas.forEach((bola, i) => {
        vivos.add(bola.id);
        const levantada = this.seleccionado === t && i === tubo.bolas.length - 1;
        const pos = levantada ? this.posicionLevantada(t) : this.posicionHueco(t, i);
        let sprite = this.sprites.get(bola.id);
        if (sprite) this.tweens.killTweensOf(sprite);
        else sprite = this.crearSprite(bola, pos.x, pos.y);
        sprite.setTexture(claveTextura(bola)).setPosition(pos.x, pos.y).setAngle(0);
        sprite.setDisplaySize(this.col.d * 0.92, this.col.d * 0.92);
      });
    });
    for (const [id, sprite] of this.sprites) {
      if (!vivos.has(id)) {
        sprite.destroy();
        this.sprites.delete(id);
      }
    }
  }

  private revelar(bolas: Bola[]) {
    for (const bola of bolas) {
      const sprite = this.sprites.get(bola.id);
      if (!sprite) continue;
      sprite.setTexture(claveTextura(bola));
      sprite.setDisplaySize(this.col.d * 0.92, this.col.d * 0.92);
      const escala = sprite.scaleX;
      sprite.setScale(escala * 0.6);
      this.tweens.add({ targets: sprite, scale: escala, duration: 220, ease: 'Back.easeOut' });
    }
  }

  private bloquear(ms: number) {
    this.bloqueadoHasta = Math.max(this.bloqueadoHasta, this.time.now + ms);
  }

  private bloqueado() {
    return this.terminado || this.time.now < this.bloqueadoHasta;
  }

  // ───────────────────────── Jugadas ─────────────────────────

  private tocarTubo(i: number) {
    if (this.bloqueado()) return;
    const tubo = this.tubos[i];

    if (this.seleccionado === null) {
      if (tubo.sellado || tubo.bolas.length === 0) return;
      this.levantar(i);
      return;
    }

    if (this.seleccionado === i) {
      this.bajar(i);
      return;
    }

    const origen = this.seleccionado;
    const mov = evaluarMovimiento(this.tubos, origen, i);
    if (mov) {
      this.guardarInstantanea();
      this.mover(origen, i, mov);
      return;
    }

    // Movimiento no válido: si el tubo tocado tiene bolas, se cambia la selección
    this.bajar(origen);
    if (!tubo.sellado && tubo.bolas.length > 0) {
      this.levantar(i);
    } else {
      this.sacudir(i);
    }
  }

  private levantar(i: number) {
    this.seleccionado = i;
    const sprite = this.sprites.get(arriba(this.tubos[i])!.id);
    if (!sprite) return;
    const pos = this.posicionLevantada(i);
    this.tweens.killTweensOf(sprite);
    this.tweens.add({ targets: sprite, y: pos.y, duration: 120, ease: 'Quad.easeOut' });
    reproducirEfecto(this, 'seleccionar', true);
  }

  private bajar(i: number) {
    this.seleccionado = null;
    const tubo = this.tubos[i];
    const bola = arriba(tubo);
    const sprite = bola && this.sprites.get(bola.id);
    if (!sprite) return;
    const pos = this.posicionHueco(i, tubo.bolas.length - 1);
    this.tweens.killTweensOf(sprite);
    this.tweens.add({ targets: sprite, x: pos.x, y: pos.y, duration: 120, ease: 'Quad.easeIn' });
  }

  private sacudir(i: number) {
    const g = this.graficosTubo[i];
    const x = this.col.centros[i].x;
    this.tweens.killTweensOf(g);
    g.setX(x);
    this.tweens.add({ targets: g, x: x + 8, duration: 50, yoyo: true, repeat: 2, onComplete: () => g.setX(x) });
    reproducirEfecto(this, 'error');
  }

  private mover(origen: number, destino: number, mov: Movimiento) {
    this.seleccionado = null;
    const primerHueco = this.tubos[destino].bolas.length - (mov.tipo === 'fusionar' ? 1 : 0);
    const res = aplicarMovimiento(this.tubos, origen, destino, mov);

    // Acierto: cada bola colocada sobre una de su color puntúa (solo la primera vez en el nivel,
    // para que mover la misma bola de un lado a otro no llene la barra)
    let aciertos = 0;
    if (res.movimiento.tipo === 'mover' && primerHueco > 0) {
      for (const bola of res.bolas) {
        if (this.bolasPuntuadas.has(bola.id)) continue;
        this.bolasPuntuadas.add(bola.id);
        aciertos++;
      }
    }

    // El grupo sale empezando por la de arriba; cada bola cae a su hueco con un pequeño desfase
    const encima = this.posicionLevantada(destino);
    const desfase = 50;
    const duracion = 260 + desfase * (res.bolas.length - 1);
    this.bloquear(duracion);

    const ordenSalida = [...res.bolas].reverse();
    ordenSalida.forEach((bola, n) => {
      const sprite = this.sprites.get(bola.id);
      if (!sprite) return;
      const hueco = this.posicionHueco(destino, primerHueco + res.bolas.indexOf(bola));
      this.tweens.killTweensOf(sprite);
      this.tweens.chain({
        targets: sprite,
        delay: n * desfase,
        tweens: [
          { x: encima.x, y: encima.y, duration: 140, ease: 'Sine.easeInOut' },
          { y: hueco.y, duration: 120, ease: 'Quad.easeIn' },
        ],
      });
    });

    this.time.delayedCall(duracion, () => {
      if (res.movimiento.tipo === 'fusionar' && res.creada) {
        this.animarFusion(res.bolas[0], res.fusionadaCon!, res.creada, this.posicionHueco(destino, primerHueco));
        this.sumarPuntos(PUNTOS_FUSION);
        reproducirEfecto(this, 'fusion');
      } else {
        reproducirEfecto(this, 'mover', true);
      }
      if (aciertos > 0) {
        this.sumarPuntos(aciertos * PUNTOS_ACIERTO);
        this.mostrarPuntosFlotantes(destino, aciertos * PUNTOS_ACIERTO);
      }
      this.revelar(res.reveladas);
      if (res.sellado) this.animarSellado(destino);
      this.trasJugada();
    });
  }

  private mostrarPuntosFlotantes(tubo: number, puntos: number) {
    const pos = this.posicionLevantada(tubo);
    const texto = this.add
      .text(pos.x, pos.y, `+${puntos}`, { fontFamily: 'sans-serif', fontSize: '34px', color: '#81d4fa', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(5);
    this.tweens.add({ targets: texto, y: pos.y - 60, alpha: 0, duration: 700, ease: 'Quad.easeOut', onComplete: () => texto.destroy() });
  }

  private animarFusion(a: Bola, b: Bola, creada: Bola, pos: { x: number; y: number }) {
    for (const bola of [a, b]) {
      const s = this.sprites.get(bola.id);
      if (!s) continue;
      this.sprites.delete(bola.id);
      this.tweens.add({ targets: s, scale: 0, alpha: 0, duration: 160, onComplete: () => s.destroy() });
    }
    if (this.sprites.has(creada.id)) return; // ya creada al recolocar la pantalla
    const nueva = this.crearSprite(creada, pos.x, pos.y);
    const escala = nueva.scaleX;
    nueva.setScale(0);
    this.tweens.add({ targets: nueva, scale: escala, duration: 260, delay: 80, ease: 'Back.easeOut' });
    this.bloquear(340);
  }

  private animarSellado(i: number) {
    this.dibujarTubo(i);
    this.sumarPuntos(PUNTOS_SELLAR);
    reproducirEfecto(this, 'sellar');
    for (const bola of this.tubos[i].bolas) {
      const s = this.sprites.get(bola.id);
      if (!s) continue;
      s.setTexture(claveTextura(bola));
      const escala = s.scaleX;
      this.tweens.add({ targets: s, scale: escala * 1.15, duration: 120, yoyo: true });
    }
  }

  private sumarPuntos(n: number) {
    this.puntos += n;
    this.carga = Math.min(PUNTOS_CARGA, this.carga + n);
    this.textoPuntos.setText(t('puntos', { n: this.puntos }));
    this.barra.setProgreso(this.carga / PUNTOS_CARGA);
  }

  private trasJugada() {
    if (this.terminado) return;

    // Se gana en cuanto todos los tubos están completos (sellados) o vacíos:
    // - si aún no ha caído ninguna gota, la lluvia pendiente se cancela;
    // - si ya cayeron gotas, sus bolas también tienen que estar en tubos completos.
    if (nivelCompleto(this.tubos)) {
      this.victoria();
      return;
    }

    // La lluvia empieza al 50 % de tubos (colores del nivel) sellados
    if (!this.lluviaIniciada && this.lluviaPendiente.length > 0) {
      const sellados = this.tubos.filter((t) => t.sellado && this.nivel.coloresBase.includes(t.bolas[0].color)).length;
      if (sellados / this.nivel.coloresBase.length >= 0.5) this.iniciarLluvia();
    }

    // Sin jugadas posibles y sin Gravedad cargada (que podría desbloquear la partida): se pierde
    if (!hayMovimientos(this.tubos) && this.carga < PUNTOS_CARGA) {
      this.derrota('sinMovimientos');
    }
  }

  // ───────────────────────── Gravedad ─────────────────────────

  private usarGravedad() {
    if (this.bloqueado() || this.carga < PUNTOS_CARGA) return;
    if (this.seleccionado !== null) this.bajar(this.seleccionado);

    this.guardarInstantanea();
    this.carga = 0;
    this.barra.setProgreso(0);

    // Índices de cada bola antes de invertir, para animar desde ahí
    const antes = new Map<number, { tubo: number; indice: number }>();
    this.tubos.forEach((tubo, ti) => tubo.bolas.forEach((b, i) => antes.set(b.id, { tubo: ti, indice: i })));

    const reveladas = invertirTubos(this.tubos);
    const giro = 350;
    const caida = 250;
    this.bloquear(giro + caida + 50);
    reproducirEfecto(this, 'gravedad');

    this.tubos.forEach((tubo, ti) => {
      if (tubo.sellado || tubo.bolas.length === 0) return;
      const g = this.graficosTubo[ti];
      const cy = this.col.centros[ti].y;
      this.tweens.add({ targets: g, angle: 180, duration: giro, ease: 'Sine.easeInOut', onComplete: () => g.setAngle(0) });

      tubo.bolas.forEach((bola, nuevoIndice) => {
        const s = this.sprites.get(bola.id);
        const previo = antes.get(bola.id);
        if (!s || !previo) return;
        const yAntes = this.posicionHueco(ti, previo.indice).y;
        const yEspejo = 2 * cy - yAntes; // el tubo gira: la bola queda arriba
        this.tweens.chain({
          targets: s,
          tweens: [
            { y: yEspejo, duration: giro, ease: 'Sine.easeInOut' },
            { y: this.posicionHueco(ti, nuevoIndice).y, duration: caida, ease: 'Quad.easeIn' },
          ],
        });
      });
    });

    this.time.delayedCall(giro + caida, () => {
      this.revelar(reveladas);
      this.trasJugada();
    });
  }

  // ───────────────────────── Lluvia ─────────────────────────

  private iniciarLluvia() {
    this.lluviaIniciada = true;
    this.actualizarTextoLluvia();
    this.textoLluvia.setVisible(true);
    reproducirEfecto(this, 'lluvia');
    this.tweens.chain({
      targets: this.avisoLluvia,
      tweens: [
        { alpha: 1, scale: { from: 0.7, to: 1 }, duration: 250, ease: 'Back.easeOut' },
        { alpha: 0, duration: 400, delay: 1200 },
      ],
    });
    this.arrancarLluvia();
  }

  private arrancarLluvia() {
    this.temporizadorLluvia?.remove();
    this.temporizadorLluvia = this.time.addEvent({
      delay: this.nivel.config.intervaloLluviaMs,
      loop: true,
      callback: () => this.soltarGota(),
    });
  }

  private pararLluvia() {
    this.temporizadorLluvia?.remove();
    this.temporizadorLluvia = null;
  }

  private actualizarTextoLluvia() {
    this.textoLluvia.setText(t('lluviaRestante', { n: this.lluviaPendiente.length }));
  }

  private soltarGota() {
    if (this.terminado || this.lluviaPendiente.length === 0) return;

    // Si hay una animación en curso, espera un poco (sin duplicar gotas)
    if (this.bloqueado()) {
      if (!this.gotaEnEspera) {
        this.gotaEnEspera = true;
        this.time.delayedCall(200, () => {
          this.gotaEnEspera = false;
          this.soltarGota();
        });
      }
      return;
    }

    const conHueco = this.tubos.map((tubo, i) => ({ tubo, i })).filter(({ tubo }) => !tubo.sellado && tubo.bolas.length < CAPACIDAD);
    if (conHueco.length === 0) {
      this.derrota('lluvia');
      return;
    }

    const { tubo, i } = conHueco[Math.floor(Math.random() * conHueco.length)];
    if (this.seleccionado === i) this.bajar(i);

    const bola = nuevaBola(this.lluviaPendiente.shift()!);
    tubo.bolas.push(bola);
    const sellado = intentarSellar(tubo);
    this.actualizarTextoLluvia();

    const destino = this.posicionHueco(i, tubo.bolas.length - 1);
    const sprite = this.crearSprite(bola, destino.x, -this.col.d);
    const duracion = 450;
    this.bloquear(duracion);
    this.tweens.add({ targets: sprite, y: destino.y, duration: duracion, ease: 'Quad.easeIn' });
    reproducirEfecto(this, 'gota', true);

    this.time.delayedCall(duracion, () => {
      if (sellado) this.animarSellado(i);
      if (this.lluviaPendiente.length === 0) {
        this.temporizadorLluvia?.remove();
        this.textoLluvia.setVisible(false);
      }
      this.trasJugada();
    });
  }

  // ───────────────────────── Fin y pausa ─────────────────────────

  private abrirDialogo(datos: DatosDialogo) {
    this.scene.pause();
    this.scene.launch('Dialogo', datos);
  }

  private pausar() {
    if (this.terminado) return;
    this.abrirDialogo({
      titulo: t('pausa'),
      botones: [
        { texto: t('continuar'), accion: 'continuar' },
        { texto: t('reiniciarNivel'), accion: 'reiniciar' },
        { texto: t('nivelNuevo'), accion: 'nuevo' },
        { texto: t('ajustes'), accion: 'ajustes' },
        { texto: t('menu'), accion: 'menu' },
      ],
    });
  }

  private victoria() {
    this.terminado = true;
    this.pararLluvia();
    this.actualizarDeshacer();
    this.lluviaPendiente = [];
    this.textoLluvia.setVisible(false);

    const monedas = 5 + Math.floor(this.puntos / 10);
    const guardado = getGuardado();
    const siguiente = this.numeroNivel + 1;
    actualizarGuardado({
      nivel: siguiente,
      mejorNivel: Math.max(guardado.mejorNivel, siguiente),
      monedas: guardado.monedas + monedas,
    });
    this.textoMonedas.setText(String(getGuardado().monedas));
    this.colocarIconoMoneda();
    reproducirEfecto(this, 'victoria');

    this.time.delayedCall(600, () =>
      this.abrirDialogo({
        titulo: t('nivelCompletado'),
        texto: t('recompensa', { puntos: this.puntos, monedas }),
        botones: [
          { texto: t('siguiente'), accion: 'siguiente' },
          { texto: t('menu'), accion: 'menu' },
        ],
      }),
    );
  }

  private derrota(motivo: 'lluvia' | 'sinMovimientos') {
    this.terminado = true;
    this.pararLluvia();
    this.actualizarDeshacer();
    this.cameras.main.shake(250, 0.01);
    reproducirEfecto(this, 'derrota');

    this.time.delayedCall(500, () =>
      this.abrirDialogo({
        titulo: motivo === 'lluvia' ? t('derrota') : t('sinSalida'),
        texto: motivo === 'lluvia' ? t('derrotaTexto') : t('sinMovimientos'),
        botones: [
          // Si quedan deshacer, se puede volver atrás en vez de perder
          ...(this.puedeDeshacer() ? [{ texto: t('deshacer', { n: this.deshacerRestantes }), accion: 'deshacer' as const }] : []),
          { texto: t('reiniciarNivel'), accion: 'reiniciar' },
          { texto: t('nivelNuevo'), accion: 'nuevo' },
          { texto: t('menu'), accion: 'menu' },
        ],
      }),
    );
  }

  // ───────────────────────── Deshacer ─────────────────────────

  private guardarInstantanea() {
    this.historial.push({
      tubos: clonarTubos(this.tubos),
      puntos: this.puntos,
      carga: this.carga,
      bolasPuntuadas: [...this.bolasPuntuadas],
      lluviaPendiente: [...this.lluviaPendiente],
      lluviaIniciada: this.lluviaIniciada,
    });
    // Solo hacen falta tantas como deshacer quedan
    while (this.historial.length > this.deshacerRestantes) this.historial.shift();
    this.actualizarDeshacer();
  }

  private puedeDeshacer() {
    return this.deshacerRestantes > 0 && this.historial.length > 0;
  }

  private actualizarDeshacer() {
    this.contadorDeshacer.setText(String(this.deshacerRestantes));
    this.botonDeshacer.setHabilitado(this.puedeDeshacer() && !this.terminado);
  }

  // Vuelve al estado anterior a la última jugada (movimiento o giro de gravedad)
  private deshacer() {
    if (!this.puedeDeshacer() || this.time.now < this.bloqueadoHasta) return;
    const previo = this.historial.pop()!;
    this.deshacerRestantes--;

    this.tubos = clonarTubos(previo.tubos);
    this.puntos = previo.puntos;
    this.carga = previo.carga;
    this.bolasPuntuadas = new Set(previo.bolasPuntuadas);
    this.lluviaPendiente = [...previo.lluviaPendiente];
    this.lluviaIniciada = previo.lluviaIniciada;
    this.seleccionado = null;
    this.terminado = false;

    // La lluvia vuelve a como estaba
    if (this.lluviaIniciada && this.lluviaPendiente.length > 0) this.arrancarLluvia();
    else this.pararLluvia();
    this.actualizarTextoLluvia();
    this.textoLluvia.setVisible(this.lluviaIniciada && this.lluviaPendiente.length > 0);

    this.textoPuntos.setText(t('puntos', { n: this.puntos }));
    this.barra.setProgreso(this.carga / PUNTOS_CARGA);
    this.tubos.forEach((_, i) => this.dibujarTubo(i));
    this.sincronizarSprites();
    this.actualizarDeshacer();
    reproducirEfecto(this, 'seleccionar');
  }

  update(_time: number, _delta: number) {
    // Todo el movimiento va con tweens: no hace falta lógica por frame
  }
}
