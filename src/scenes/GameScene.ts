import Phaser from 'phaser';
import { t } from '../i18n';
import { nombreColor } from '../i18n/nombresColor';
import type { ColorId } from '../juego/colores';
import {
  CAPACIDAD,
  aplicarMovimiento,
  arriba,
  bolasBienColocadas,
  capacidadDe,
  clonarTubos,
  evaluarMovimiento,
  grupoSuperior,
  hayMovimientos,
  intentarSellar,
  invertirTubos,
  nivelCompleto,
  nuevaBola,
  type Bola,
  type Movimiento,
  type Tubo,
} from '../juego/modelo';
import { planificarLluvia, type Gota, type PlanLluvia } from '../juego/lluvia';
import { colorNuevo, generarNivel, type Nivel } from '../juego/niveles';
import { tieneSolucion } from '../juego/solucionador';
import { claveTextura, colorHex } from '../juego/texturas';
import { ORIGEN_TUBO, TUBO_ANCHO } from '../juego/texturasTubo';
import { iniciarEfecto, iniciarMusicaPartida, reproducirEfecto } from '../sistemas/audio';
import { actualizarGuardado, getGuardado } from '../sistemas/guardado';
import { cargarNivel, guardarNivel } from '../sistemas/nivelGuardado';
import { sumarColor, sumarHabilidad, sumarNivel } from '../sistemas/estadisticas';
import { ajustarRelojJuego, cerrarRegistroNivel, corto, describirTubos, iniciarRegistroNivel, reabrirRegistroNivel, registrar } from '../sistemas/registro';
import { cantidadDe, gastar } from '../sistemas/tienda';
import { crearBarraHabilidad, type BarraHabilidad } from '../ui/BarraHabilidad';
import { crearBotonRedondo, iconoPausa, type BotonRedondo } from '../ui/BotonRedondo';
import { ICONO_DESHACER, ICONO_PELIGRO, ICONO_TUBO } from '../ui/iconosHabilidad';
import { crearInsignia, type Insignia } from '../ui/Insignia';
import { alRedimensionar, zonaSegura } from '../ui/layout';
import { crearIconoMoneda } from '../ui/Moneda';
import type { DatosDialogo } from './DialogoScene';

// Cómo empieza la partida: seguir con el nivel guardado, reiniciarlo igual o generar uno nuevo
// No hay «nivel nuevo»: todos los niveles tienen solución, así que solo se reinicia el mismo
export type ModoInicio = 'continuar' | 'reiniciar';

const PUNTOS_SELLAR = 100;
const PUNTOS_FUSION = 25;
const PUNTOS_ACIERTO = 10; // por bola colocada sobre una de su mismo color
const PUNTOS_CARGA = 150; // puntos para llenar la barra de Gravedad (una sola carga)
const MAX_HISTORIAL = 50; // jugadas que se recuerdan para deshacer (los usos salen de la tienda)
const DURACION_ALERTA_LLUVIA = 2600; // ms de aviso (sonido + pantalla parpadeando) antes de la primera gota
const NODOS_LLUVIA_JUSTA = 8000; // límite del solucionador por tubo candidato (rápido en móvil)
const LLUVIA_ESPERA_MS = 700; // si ningún tubo es seguro, la gota lo reintenta tras este tiempo
const PRESUPUESTO_LLUVIA_MS = 40; // tiempo máximo de comprobación por intento (evita tirones)
const MAX_ESPERAS_GOTA = 4; // veces seguidas sin tiempo de cálculo antes de dejar caer la gota al azar

// Estado completo antes de una jugada, para poder deshacerla
interface Instantanea {
  tubos: Tubo[];
  puntos: number;
  carga: number;
  bolasPuntuadas: number[];
  lluviaPendiente: Gota[];
  lluviaIniciada: boolean;
}

// Un tubo en pantalla: capa de atrás (debajo de las bolas) y de delante (reflejos, encima).
// Las animaciones del tubo mueven las dos capas a la vez (`capas(i)`).
interface VistaTubo {
  atras: Phaser.GameObjects.Container;
  delante: Phaser.GameObjects.Container;
  vidrioAtras: Phaser.GameObjects.Image;
  liquido: Phaser.GameObjects.Image;
  vidrioDelante: Phaser.GameObjects.Image;
  tapon: Phaser.GameObjects.Image;
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
  private vistasTubo: VistaTubo[] = [];
  private zonasTubo: Phaser.GameObjects.Zone[] = [];
  private col: Colocacion = { d: 1, anchoTubo: 1, altoTubo: 1, centros: [] };

  private seleccionado: number | null = null;
  private bloqueadoHasta = 0; // no se aceptan toques mientras dura una animación
  private terminado = false;

  private puntos = 0;
  private carga = 0;
  private bolasPuntuadas = new Set<number>();

  private lluviaPendiente: Gota[] = [];
  private planLluvia!: PlanLluvia; // aleatorio en cada partida: umbral, orden y ritmo de las gotas
  private tubosLluviaPuestos = false; // los tubos que trae la lluvia (deshacer no los quita)
  private generacion = 0; // sube al deshacer: las animaciones de jugadas anteriores ya no aplican
  private lluviaIniciada = false;
  private bienAlEmpezar = 0; // bolas bien colocadas por azar al empezar el nivel
  private temporizadorLluvia: Phaser.Time.TimerEvent | null = null;
  private esperasGota = 0;
  private decisionGota: Record<string, unknown> = {}; // cómo se eligió el tubo de la última gota (registro)

  private historial: Instantanea[] = [];
  private tuboUsado = false; // el tubo de emergencia se puede poner una vez por nivel
  // Estadísticas: cada derrota y cada color sellado cuentan una vez por partida (deshacer no duplica)
  private derrotaContada = false;
  private sellosContados = new Set<ColorId>();

  private chispas!: Phaser.GameObjects.Particles.ParticleEmitter;
  private escalaChispa = 0.2; // depende del tamaño de bola
  private flechasGiro!: Phaser.GameObjects.Graphics;

  private textoNivel!: Phaser.GameObjects.Text;
  private textoPuntos!: Phaser.GameObjects.Text;
  private textoMonedas!: Phaser.GameObjects.Text;
  private iconoMoneda!: Phaser.GameObjects.Graphics;
  private textoLluvia!: Phaser.GameObjects.Text;
  private avisoLluvia!: Phaser.GameObjects.Text;
  private veloAlerta!: Phaser.GameObjects.Rectangle;
  private sonidoAlarma: ReturnType<typeof iniciarEfecto> = null;
  private barra!: BarraHabilidad;
  private botonPausa!: BotonRedondo;
  private botonDeshacer!: BotonRedondo;
  private insigniaDeshacer!: Insignia;
  private botonTubo!: BotonRedondo;
  private insigniaTubo!: Insignia;

  constructor() {
    super('Game');
  }

  init(datos?: { modo?: ModoInicio }) {
    // La escena se reutiliza al reiniciar: todo el estado se pone a cero aquí
    this.modo = datos?.modo ?? 'continuar';
    this.numeroNivel = getGuardado().nivel;
    this.tubos = [];
    this.sprites = new Map();
    this.vistasTubo = [];
    this.zonasTubo = [];
    this.seleccionado = null;
    this.bloqueadoHasta = 0;
    this.terminado = false;
    this.puntos = 0;
    this.carga = 0;
    this.bolasPuntuadas = new Set();
    this.lluviaPendiente = [];
    this.tubosLluviaPuestos = false;
    this.generacion = 0;
    this.lluviaIniciada = false;
    this.temporizadorLluvia = null;
    this.esperasGota = 0;
    this.historial = [];
    this.tuboUsado = false;
    this.derrotaContada = false;
    this.sellosContados = new Set();
    this.sonidoAlarma = null;
  }

  create() {
    this.cameras.main.fadeIn(250);
    iniciarMusicaPartida(this);

    // La configuración inicial del nivel se guarda al generarlo; reiniciar la vuelve a cargar igual
    const guardado = cargarNivel(this.numeroNivel);
    // El color nuevo se anuncia solo la primera vez que se llega al nivel (no al reiniciarlo)
    const primeraVez = !guardado && this.modo === 'continuar';
    if (guardado) {
      this.nivel = guardado;
    } else {
      this.nivel = generarNivel(this.numeroNivel);
      guardarNivel(this.numeroNivel, this.nivel);
      sumarNivel('nivelesGenerados');
    }
    this.bienAlEmpezar = bolasBienColocadas(this.nivel.tubos, this.nivel.coloresBase);
    this.tubos = this.nivel.tubos;
    this.planLluvia = planificarLluvia(this.nivel.config, this.nivel.coloresLluvia);
    if (this.planLluvia.tubosExtra === undefined) this.planLluvia.tubosExtra = 0; // nivel guardado por una versión anterior
    this.lluviaPendiente = [...this.planLluvia.gotas];

    // Tubos: gráfico + zona táctil más grande que el tubo
    this.tubos.forEach((_, i) => {
      this.vistasTubo.push(this.crearVistaTubo());
      const zona = this.add.zone(0, 0, 1, 1).setInteractive({ useHandCursor: true });
      // Al tocar (no al levantar el dedo): respuesta inmediata
      zona.on('pointerdown', () => this.tocarTubo(i));
      this.zonasTubo.push(zona);
    });

    iniciarRegistroNivel({
      nivel: this.numeroNivel,
      modo: `${this.modo}${guardado ? ' (nivel guardado)' : ' (generado)'}`,
      config: this.nivel.config,
      coloresBase: this.nivel.coloresBase,
      coloresLluvia: this.nivel.coloresLluvia,
      tubos: this.tubos,
      reloj: () => this.time.now,
    });
    this.events.once(Phaser.Scenes.Events.UPDATE, () => ajustarRelojJuego());

    this.crearInterfaz();
    this.crearEfectos();
    alRedimensionar(this, (ancho) => this.colocarTodo(ancho));
    this.animarEntrada();
    // Aviso de nivel difícil (también al pedir «Nivel nuevo»; no al reiniciarlo) o de color nuevo
    if (this.esDificil() && this.modo !== 'reiniciar') this.avisarNivelDificil();
    else if (primeraVez) this.avisarColorNuevo();

    // El diálogo de derrota puede pedir deshacer
    const alPedirDeshacer = () => this.deshacer();
    this.events.on('deshacer', alPedirDeshacer);
    // Al volver de la tienda (directa o desde la pausa) puede haber cambiado el inventario
    const alReanudar = () => {
      registrar('reanudar');
      this.actualizarInventario();
    };
    const alPausar = () => registrar('pausa');
    this.events.on(Phaser.Scenes.Events.RESUME, alReanudar);
    this.events.on(Phaser.Scenes.Events.PAUSE, alPausar);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      // Si se sale sin ganar ni perder (menú, reiniciar, nivel nuevo), el nivel queda como «salida»
      cerrarRegistroNivel('salida', { puntos: this.puntos }, this.tubos);
      this.events.off('deshacer', alPedirDeshacer);
      this.events.off(Phaser.Scenes.Events.RESUME, alReanudar);
      this.events.off(Phaser.Scenes.Events.PAUSE, alPausar);
      this.pararLluvia(); // también corta la alarma si estaba sonando
    });
  }

  // ───────────────────────── Interfaz ─────────────────────────

  private crearInterfaz() {
    const estilo = { fontFamily: 'sans-serif', color: '#ffffff' };

    this.botonPausa = crearBotonRedondo(this, 0, 0, 44, iconoPausa, () => this.pausar());

    this.textoNivel = this.add
      .text(0, 0, this.esDificil() ? t('nivelTituloDificil', { n: this.numeroNivel }) : t('nivel', { n: this.numeroNivel }), {
        ...estilo,
        fontSize: '40px',
        fontStyle: 'bold',
        color: this.esDificil() ? '#ff8a65' : '#ffffff',
      })
      .setOrigin(0.5);
    this.textoPuntos = this.add.text(0, 0, t('puntos', { n: 0 }), { ...estilo, fontSize: '28px', color: '#aaaacc' }).setOrigin(0.5);

    this.iconoMoneda = crearIconoMoneda(this);
    this.textoMonedas = this.add.text(0, 0, String(getGuardado().monedas), { ...estilo, fontSize: '32px' }).setOrigin(1, 0.5);

    this.textoLluvia = this.add.text(0, 0, '', { ...estilo, fontSize: '26px', color: '#81d4fa' }).setOrigin(1, 0.5).setVisible(false);
    this.avisoLluvia = this.add
      .text(0, 0, t('empiezaLluvia'), { ...estilo, fontSize: '52px', fontStyle: 'bold', color: '#ffd54f', stroke: '#7f1d1d', strokeThickness: 8 })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(10);
    // Velo de color que parpadea sobre toda la pantalla durante la alerta (no bloquea los toques)
    this.veloAlerta = this.add.rectangle(0, 0, 1, 1, 0xff3b30).setOrigin(0).setAlpha(0).setDepth(9);

    this.barra = crearBarraHabilidad(this, t('gravedad'), () => this.usarGravedad());

    this.botonDeshacer = crearBotonRedondo(this, 0, 0, 44, ICONO_DESHACER, () => this.pulsarDeshacer());
    this.insigniaDeshacer = crearInsignia(this);
    this.actualizarDeshacer();

    this.botonTubo = crearBotonRedondo(this, 0, 0, 44, ICONO_TUBO, () => this.pulsarTubo());
    this.insigniaTubo = crearInsignia(this);
    this.actualizarTuboEmergencia();
  }

  // Un solo emisor de chispas para todo el nivel (se reutiliza en cada estallido)
  private crearEfectos() {
    this.chispas = this.add
      .particles(0, 0, 'chispa', {
        emitting: false,
        lifespan: { min: 380, max: 700 },
        speed: { onEmit: () => Phaser.Math.Between(70, 230) * this.escalaChispa * 5 },
        angle: { min: 0, max: 360 },
        rotate: { min: 0, max: 360 },
        scale: {
          onEmit: () => this.escalaChispa * Phaser.Math.FloatBetween(0.6, 1.2),
          onUpdate: (_p: Phaser.GameObjects.Particles.Particle, _k: string, t: number, valor: number) => valor * (1 - t * 0.08),
        },
        alpha: { start: 1, end: 0 },
        gravityY: 260,
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(6);

    // Dos flechas en círculo con un aro: aparecen girando al usar la Gravedad
    const g = this.add.graphics().setDepth(7).setAlpha(0);
    const r = 90;
    g.lineStyle(10, 0xffffff, 0.9).strokeCircle(0, 0, r + 34);
    g.lineStyle(16, 0xffffff, 1);
    for (const inicio of [Phaser.Math.DegToRad(-40), Phaser.Math.DegToRad(140)]) {
      const fin = inicio + Phaser.Math.DegToRad(120);
      g.beginPath();
      g.arc(0, 0, r - 20, inicio, fin);
      g.strokePath();
      const px = Math.cos(fin) * (r - 20);
      const py = Math.sin(fin) * (r - 20);
      const tx = -Math.sin(fin);
      const ty = Math.cos(fin);
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(px + tx * 30, py + ty * 30, px - ty * 22, py + tx * 22, px + ty * 22, py - tx * 22);
    }
    this.flechasGiro = g;
  }

  private estallarChispas(x: number, y: number, color: number, cantidad: number) {
    this.chispas.setParticleTint(color);
    this.chispas.explode(cantidad, x, y);
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

    // Fila inferior: [deshacer] [tubo de emergencia] [barra de Gravedad + botón], centrada
    const yInferior = zona.y + zona.alto - 100;
    const anchoBarra = Math.min(560, zona.ancho - 290);
    const izquierdaFila = ancho / 2 - (88 + 16 + 88 + 20 + anchoBarra) / 2;
    this.botonDeshacer.setPosition(izquierdaFila + 44, yInferior);
    this.insigniaDeshacer.colocar(izquierdaFila + 44 + 34, yInferior - 34);
    this.botonTubo.setPosition(izquierdaFila + 148, yInferior);
    this.insigniaTubo.colocar(izquierdaFila + 148 + 34, yInferior - 34);
    this.barra.colocar(izquierdaFila + 212 + anchoBarra / 2, yInferior, anchoBarra);

    // Zona de los tubos: entre la barra superior y la de Gravedad
    const arribaTubos = zona.y + 160;
    const abajoTubos = zona.y + zona.alto - 200;
    this.col = this.calcularColocacion(zona.x + 20, arribaTubos, zona.ancho - 40, abajoTubos - arribaTubos);
    this.escalaChispa = this.col.d / 330;
    this.avisoLluvia.setPosition(ancho / 2, arribaTubos + 10);
    this.veloAlerta.setSize(ancho, this.scale.height);

    this.tubos.forEach((_, i) => {
      const c = this.col.centros[i];
      for (const capa of this.capas(i)) {
        this.tweens.killTweensOf(capa);
        capa.setPosition(c.x, c.y).setAngle(0).setScale(1);
      }
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
    const anchoTuboU = 1.12; // tubo de ensayo: la bola casi llena el ancho
    const separacionU = 0.72;
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

  private crearVistaTubo(): VistaTubo {
    const imagen = (clave: string) => this.add.image(0, 0, clave).setOrigin(ORIGEN_TUBO.x, ORIGEN_TUBO.y);
    const vidrioAtras = imagen('tubo-atras');
    const liquido = imagen('tubo-liquido').setVisible(false);
    const vidrioDelante = imagen('tubo-delante');
    const tapon = imagen('tubo-tapon').setVisible(false);
    return {
      atras: this.add.container(0, 0, [vidrioAtras, liquido]).setDepth(0),
      delante: this.add.container(0, 0, [vidrioDelante, tapon]).setDepth(3),
      vidrioAtras,
      liquido,
      vidrioDelante,
      tapon,
    };
  }

  private capas(i: number): [Phaser.GameObjects.Container, Phaser.GameObjects.Container] {
    const v = this.vistasTubo[i];
    return [v.atras, v.delante];
  }

  // Tubo de ensayo de vidrio (texturas de `texturasTubo.ts`): solo cambia al sellarse o recolocar.
  // Sellado: el interior se tiñe del color y aparece el tapón.
  private dibujarTubo(i: number) {
    const v = this.vistasTubo[i];
    const tubo = this.tubos[i];
    const corto = capacidadDe(tubo) < CAPACIDAD; // el de emergencia (1 hueco), con la misma base
    const escala = this.col.anchoTubo / TUBO_ANCHO;
    v.vidrioAtras.setTexture(corto ? 'tubo-corto-atras' : 'tubo-atras');
    v.vidrioDelante.setTexture(corto ? 'tubo-corto-delante' : 'tubo-delante');
    const sellado = tubo.sellado && tubo.bolas.length > 0 && !corto;
    if (sellado) {
      const color = colorHex(tubo.bolas[0].color);
      v.liquido.setTint(color).setAlpha(0.3);
      v.tapon.setTint(color);
    }
    v.liquido.setVisible(sellado);
    this.tweens.killTweensOf(v.tapon);
    v.tapon.setVisible(sellado).setY(0).setAlpha(1);
    for (const img of [v.vidrioAtras, v.liquido, v.vidrioDelante, v.tapon]) img.setScale(escala);
  }

  // ───────────────────────── Sprites ─────────────────────────

  private posicionHueco(tubo: number, indice: number) {
    const c = this.col.centros[tubo];
    return { x: c.x, y: c.y + this.col.altoTubo / 2 - this.col.d * 0.1 - this.col.d * (indice + 0.5) };
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
    if (bolas.length) registrar('revelar', { n: bolas.length, colores: bolas.map((b) => corto(b.color)).join(' ') });
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
    if (this.bloqueado()) {
      registrar('toqueIgnorado', { tubo: i, motivo: this.terminado ? 'terminado' : 'animación', faltanMs: Math.round(this.bloqueadoHasta - this.time.now) });
      return;
    }
    const tubo = this.tubos[i];

    if (this.seleccionado === null) {
      if (tubo.sellado || tubo.bolas.length === 0) {
        registrar('toqueIgnorado', { tubo: i, motivo: tubo.sellado ? 'sellado' : 'vacío' });
        return;
      }
      this.levantar(i);
      return;
    }

    if (this.seleccionado === i) {
      registrar('cancelar', { tubo: i });
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
    const arribaOrigen = arriba(this.tubos[origen]);
    const arribaDestino = arriba(tubo);
    registrar('invalido', {
      de: origen,
      a: i,
      bola: arribaOrigen ? corto(arribaOrigen.color) : null,
      destino: tubo.sellado ? 'sellado' : arribaDestino ? corto(arribaDestino.color) : 'vacío',
      libres: capacidadDe(tubo) - tubo.bolas.length,
    });
    this.bajar(origen);
    if (!tubo.sellado && tubo.bolas.length > 0) {
      this.levantar(i);
    } else {
      this.sacudir(i);
    }
  }

  private levantar(i: number) {
    this.seleccionado = i;
    const tope = arriba(this.tubos[i])!;
    registrar('seleccionar', { tubo: i, bola: corto(tope.color), oculta: tope.oculta, ingrediente: tope.ingrediente, grupo: grupoSuperior(this.tubos[i]) });
    const sprite = this.sprites.get(tope.id);
    if (!sprite) return;
    const pos = this.posicionLevantada(i);
    this.tweens.killTweensOf(sprite);
    this.tamanoNormal(sprite);
    // Sube y queda flotando suavemente mientras está seleccionada
    this.tweens.chain({
      targets: sprite,
      tweens: [
        { y: pos.y, duration: 120, ease: 'Quad.easeOut' },
        { y: pos.y - this.col.d * 0.08, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' },
      ],
    });
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
    this.tamanoNormal(sprite);
    this.tweens.add({ targets: sprite, x: pos.x, y: pos.y, duration: 120, ease: 'Quad.easeIn' });
  }

  // Una animación cortada a medias (p. ej. el aplastamiento al aterrizar) no debe dejar la bola deformada
  private tamanoNormal(sprite: Phaser.GameObjects.Image) {
    sprite.setDisplaySize(this.col.d * 0.92, this.col.d * 0.92).setAlpha(1);
  }

  private sacudir(i: number) {
    const capas = this.capas(i);
    const x = this.col.centros[i].x;
    this.tweens.killTweensOf(capas);
    for (const capa of capas) capa.setX(x);
    this.tweens.add({ targets: capas, x: x + 8, duration: 50, yoyo: true, repeat: 2, onComplete: () => capas.forEach((c) => c.setX(x)) });
    reproducirEfecto(this, 'error');
  }

  private mover(origen: number, destino: number, mov: Movimiento) {
    this.seleccionado = null;
    const primerHueco = this.tubos[destino].bolas.length - (mov.tipo === 'fusionar' ? 1 : 0);
    const res = aplicarMovimiento(this.tubos, origen, destino, mov);
    for (const bola of res.bolas) sumarColor('canicasMovidas', bola.color);

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

    registrar(res.movimiento.tipo === 'fusionar' ? 'fusion' : 'mover', {
      de: origen,
      a: destino,
      n: res.bolas.length,
      bola: corto(res.bolas[0].color),
      ...(res.creada ? { resultado: corto(res.creada.color) } : {}),
      aciertos,
      reveladas: res.reveladas.length,
      sellado: res.sellado,
      tubos: describirTubos([this.tubos[origen], this.tubos[destino]], [origen, destino]).join(' '),
    });

    // El grupo sale empezando por la de arriba; cada bola cae a su hueco con un pequeño desfase
    const encima = this.posicionLevantada(destino);
    const desfase = 50;
    const duracion = 260 + desfase * (res.bolas.length - 1);
    // El modelo ya está actualizado: se puede seguir jugando mientras las bolas vuelan. En una
    // fusión, la bola nueva tiene sprite desde ya (invisible hasta que se fusionan las de dentro).
    if (res.creada && !this.sprites.has(res.creada.id)) {
      const pos = this.posicionHueco(destino, primerHueco);
      this.crearSprite(res.creada, pos.x, pos.y).setAlpha(0);
    }
    const generacion = this.generacion;

    const ordenSalida = [...res.bolas].reverse();
    ordenSalida.forEach((bola, n) => {
      const sprite = this.sprites.get(bola.id);
      if (!sprite) return;
      const hueco = this.posicionHueco(destino, primerHueco + res.bolas.indexOf(bola));
      this.tweens.killTweensOf(sprite);
      this.tamanoNormal(sprite);
      this.tweens.chain({
        targets: sprite,
        delay: n * desfase,
        tweens: [
          { x: encima.x, y: encima.y, duration: 140, ease: 'Sine.easeInOut' },
          { y: hueco.y, duration: 120, ease: 'Quad.easeIn', onComplete: () => this.aterrizar(sprite) },
        ],
      });
    });
    this.time.delayedCall(duracion, () => this.balancearTubo(destino));

    this.time.delayedCall(duracion, () => {
      if (generacion !== this.generacion) return; // se deshizo antes de que terminara la animación
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
        // Chispas del color donde la bola toca a su pareja
        const contacto = this.posicionHueco(destino, primerHueco);
        this.estallarChispas(contacto.x, contacto.y + this.col.d * 0.45, colorHex(res.bolas[0].color), 10 + aciertos * 4);
      }
      this.revelar(res.reveladas);
      if (res.sellado) this.animarSellado(destino);
      this.trasJugada();
    });
  }

  // La bola se aplasta un instante al tocar fondo
  private aterrizar(sprite: Phaser.GameObjects.Image) {
    this.tamanoNormal(sprite); // parte del tamaño real aunque otra animación la dejara deformada
    const sx = sprite.scaleX;
    const sy = sprite.scaleY;
    this.tweens.add({ targets: sprite, scaleX: sx * 1.12, scaleY: sy * 0.86, duration: 70, yoyo: true, ease: 'Quad.easeOut', onComplete: () => this.tamanoNormal(sprite) });
  }

  // El tubo se balancea un poco al recibir bolas
  private balancearTubo(i: number) {
    const capas = this.capas(i);
    this.tweens.killTweensOf(capas);
    for (const capa of capas) capa.setAngle(0);
    this.tweens.chain({
      targets: capas,
      tweens: [
        { angle: 3, duration: 70, ease: 'Sine.easeOut' },
        { angle: -2, duration: 110, ease: 'Sine.easeInOut' },
        { angle: 0, duration: 90, ease: 'Sine.easeIn' },
      ],
    });
  }

  // Al empezar el nivel los tubos entran deslizándose desde la derecha, uno tras otro
  private animarEntrada() {
    const desfase = 60;
    const duracion = 520;
    const distancia = this.scale.width;
    this.tubos.forEach((tubo, i) => {
      const objetivos: (Phaser.GameObjects.Container | Phaser.GameObjects.Image)[] = [...this.capas(i)];
      for (const bola of tubo.bolas) {
        const s = this.sprites.get(bola.id);
        if (s) objetivos.push(s);
      }
      for (const o of objetivos) {
        const x = o.x;
        o.x = x + distancia;
        this.tweens.add({ targets: o, x, delay: i * desfase, duration: duracion, ease: 'Back.easeOut' });
      }
    });
    this.bloquear(duracion + desfase * this.tubos.length);
  }

  // Al llegar a un nivel que desbloquea un color: ventana con la bola nueva (la partida queda en
  // pausa y no se tapa nada). Se abre cuando los tubos ya han entrado.
  // El nivel guardado conserva su configuración (los de versiones anteriores no traen `dificil`)
  private esDificil() {
    return this.nivel.config.dificil === true;
  }

  // Antes de un nivel difícil: ventana de advertencia (la partida queda en pausa)
  private avisarNivelDificil() {
    this.time.delayedCall(this.bloqueadoHasta - this.time.now + 100, () => {
      if (this.terminado) return;
      reproducirEfecto(this, 'error');
      this.cameras.main.shake(200, 0.006);
      this.abrirDialogo({
        titulo: t('nivelDificil'),
        bola: ICONO_PELIGRO,
        texto: t('nivelDificilTexto'),
        botones: [{ texto: t('aceptarReto'), accion: 'continuar' }],
      });
    });
  }

  private avisarColorNuevo() {
    const color = colorNuevo(this.numeroNivel);
    if (!color) return;
    this.time.delayedCall(this.bloqueadoHasta - this.time.now + 100, () => {
      if (this.terminado) return;
      reproducirEfecto(this, 'sellar');
      this.abrirDialogo({
        titulo: t('nuevoColor'),
        bola: `bola-${color}`,
        texto: nombreColor(color),
        botones: [{ texto: t('continuar'), accion: 'continuar' }],
      });
    });
  }

  // Celebración: los tubos saltan en ola con chispas
  private animarVictoria() {
    this.tubos.forEach((tubo, i) => {
      const objetivos: (Phaser.GameObjects.Container | Phaser.GameObjects.Image)[] = [...this.capas(i)];
      for (const bola of tubo.bolas) {
        const s = this.sprites.get(bola.id);
        if (s) objetivos.push(s);
      }
      this.tweens.add({
        targets: objetivos,
        y: `-=${this.col.d * 0.35}`,
        delay: i * 70,
        duration: 160,
        yoyo: true,
        ease: 'Quad.easeOut',
        onStart: () => {
          if (!tubo.sellado || tubo.bolas.length === 0) return;
          const c = this.col.centros[i];
          this.estallarChispas(c.x, c.y - this.col.altoTubo / 2, colorHex(tubo.bolas[0].color), 14);
        },
      });
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
    const nueva = this.sprites.get(creada.id) ?? this.crearSprite(creada, pos.x, pos.y);
    this.estallarChispas(pos.x, pos.y, colorHex(creada.color), 16);
    if (nueva.alpha === 1) return; // ya se ve (el jugador la movió o se recolocó la pantalla)
    const escala = nueva.scaleX;
    nueva.setScale(0).setAlpha(1);
    this.tweens.add({ targets: nueva, scale: escala, duration: 260, delay: 80, ease: 'Back.easeOut' });
  }

  private animarSellado(i: number) {
    this.dibujarTubo(i);
    const colorSellado = this.tubos[i].bolas[0].color;
    registrar('sellar', { tubo: i, color: corto(colorSellado), lluvia: this.tubos[i].bolas[0].lluvia === true, puntos: this.puntos + PUNTOS_SELLAR });
    if (!this.sellosContados.has(colorSellado)) {
      this.sellosContados.add(colorSellado);
      sumarColor('tubosLlenos', colorSellado);
    }
    const capas = this.capas(i);
    const c = this.col.centros[i];
    const color = colorHex(this.tubos[i].bolas[0].color);
    this.tweens.killTweensOf(capas);
    for (const capa of capas) capa.setAngle(0).setScale(1);
    // El tapón baja hasta encajar en la boca
    const tapon = this.vistasTubo[i].tapon;
    tapon.setY(-this.col.d * 0.6).setAlpha(0);
    this.tweens.add({ targets: tapon, y: 0, alpha: 1, duration: 220, ease: 'Bounce.easeOut' });
    this.tweens.add({ targets: capas, scaleX: 1.08, scaleY: 1.04, duration: 130, yoyo: true, ease: 'Quad.easeOut' });
    for (let k = 0; k < CAPACIDAD; k++) this.estallarChispas(c.x, this.posicionHueco(i, k).y, color, 6);
    this.estallarChispas(c.x, c.y - this.col.altoTubo / 2, 0xffffff, 10);
    this.sumarPuntos(PUNTOS_SELLAR);
    reproducirEfecto(this, 'sellar');
    for (const bola of this.tubos[i].bolas) {
      const s = this.sprites.get(bola.id);
      if (!s) continue;
      s.setTexture(claveTextura(bola));
      this.tamanoNormal(s);
      const escala = s.scaleX;
      this.tweens.add({ targets: s, scale: escala * 1.15, duration: 120, yoyo: true, onComplete: () => this.tamanoNormal(s) });
    }
  }

  // Avance del nivel (0..1) en bolas bien colocadas, sin contar las que ya lo estaban por azar al empezar
  private progresoNivel(): number {
    const total = CAPACIDAD * this.nivel.coloresBase.length;
    const ahora = bolasBienColocadas(this.tubos, this.nivel.coloresBase);
    const porHacer = total - this.bienAlEmpezar;
    return porHacer > 0 ? Math.max(0, ahora - this.bienAlEmpezar) / porHacer : 1;
  }

  private sumarPuntos(n: number) {
    this.puntos += n;
    this.carga = Math.min(PUNTOS_CARGA, this.carga + n);
    this.textoPuntos.setText(t('puntos', { n: this.puntos }));
    this.barra.setProgreso(this.carga / PUNTOS_CARGA);
  }

  private trasJugada() {
    if (this.terminado) return;

    // Se gana al sellar todos los colores iniciales; la lluvia pendiente se cancela y las
    // bolas de lluvia que hayan caído pueden quedar en cualquier tubo
    if (nivelCompleto(this.tubos, this.nivel.coloresBase)) {
      this.victoria();
      return;
    }

    // La lluvia empieza al llevar resuelto el 35 % del nivel, contado en bolas bien colocadas
    if (!this.lluviaIniciada && this.lluviaPendiente.length > 0 && this.progresoNivel() >= this.planLluvia.umbral) {
      this.iniciarLluvia();
    }

    // Sin jugadas posibles y sin ayudas que puedan desbloquear la partida (Gravedad o tubo de emergencia): se pierde
    if (!hayMovimientos(this.tubos) && this.carga < PUNTOS_CARGA && !this.tuboDisponible()) {
      this.derrota('sinMovimientos');
    }
  }

  // ───────────────────────── Gravedad ─────────────────────────

  private usarGravedad() {
    if (this.bloqueado() || this.carga < PUNTOS_CARGA) return;
    if (this.seleccionado !== null) this.bajar(this.seleccionado);

    this.guardarInstantanea();
    sumarHabilidad('gravedad');
    registrar('gravedad', { puntos: this.puntos });
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

    // Flechas que giran sobre los tubos con un destello
    const centroY = (this.col.centros[0].y + this.col.centros[this.col.centros.length - 1].y) / 2;
    const tamano = Math.min(1.2, this.col.altoTubo / 260);
    this.tweens.killTweensOf(this.flechasGiro);
    this.flechasGiro.setPosition(this.scale.width / 2, centroY).setAngle(0).setScale(tamano * 0.6).setAlpha(0);
    this.tweens.add({ targets: this.flechasGiro, angle: 360, duration: giro + caida + 150, ease: 'Cubic.easeInOut' });
    this.tweens.chain({
      targets: this.flechasGiro,
      tweens: [
        { alpha: 0.85, scale: tamano, duration: 180, ease: 'Back.easeOut' },
        { alpha: 0, scale: tamano * 1.15, duration: 250, delay: giro + caida - 260, ease: 'Quad.easeIn' },
      ],
    });
    this.estallarChispas(this.scale.width / 2, centroY, 0xfff3c4, 18);

    this.tubos.forEach((tubo, ti) => {
      if (tubo.sellado || tubo.bolas.length === 0 || capacidadDe(tubo) < CAPACIDAD) return;
      const capas = this.capas(ti);
      const cy = this.col.centros[ti].y;
      this.tweens.add({ targets: capas, angle: 180, duration: giro, ease: 'Sine.easeInOut', onComplete: () => capas.forEach((c) => c.setAngle(0)) });

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
    registrar('lluviaInicio', {
      progreso: Math.round(this.progresoNivel() * 100) + ' %',
      umbral: Math.round(this.planLluvia.umbral * 100) + ' %',
      gotas: this.lluviaPendiente.length,
      orden: this.lluviaPendiente.map((g) => corto(g.color)).join(' '),
      esperasMs: this.lluviaPendiente.map((g) => g.esperaMs).join(' '),
      tubosNuevos: this.tubosLluviaPuestos ? 0 : this.planLluvia.tubosExtra,
    });
    this.pararLluvia();
    this.lluviaIniciada = true;
    // La lluvia trae sus propios tubos vacíos (antes no estaban: el nivel empieza más justo)
    if (!this.tubosLluviaPuestos) {
      this.tubosLluviaPuestos = true;
      for (let k = 0; k < this.planLluvia.tubosExtra; k++) this.agregarTubo({ bolas: [], sellado: false });
    }
    this.actualizarTextoLluvia();
    this.textoLluvia.setVisible(true);
    this.mostrarAlertaLluvia();
    // La primera gota cae al terminar la alerta; después, cada una con su espera del plan
    this.programarGota(DURACION_ALERTA_LLUVIA + (this.lluviaPendiente[0]?.esperaMs ?? 0));
  }

  // Añade un tubo al tablero (lluvia o emergencia). En las jugadas guardadas para deshacer el
  // tubo ya existía (vacío): deshacer no lo quita.
  private agregarTubo(nuevo: Tubo) {
    this.tubos.push(nuevo);
    for (const previo of this.historial) previo.tubos.push({ ...nuevo, bolas: [] });
    const i = this.tubos.length - 1;
    this.vistasTubo.push(this.crearVistaTubo());
    const zona = this.add.zone(0, 0, 1, 1).setInteractive({ useHandCursor: true });
    zona.on('pointerdown', () => this.tocarTubo(i));
    this.zonasTubo.push(zona);
    this.colocarTodo(this.scale.width); // con un tubo más cambia la colocación
    const capas = this.capas(i);
    for (const capa of capas) capa.setScale(0);
    this.tweens.add({ targets: capas, scale: 1, duration: 300, ease: 'Back.easeOut' });
  }

  private programarGota(ms: number) {
    this.temporizadorLluvia?.remove();
    this.temporizadorLluvia = this.time.delayedCall(ms, () => this.soltarGota());
  }

  // Alerta de peligro (~2,6 s): sonido de alarma, pantalla parpadeando en rojo y ámbar y el
  // aviso latiendo
  private mostrarAlertaLluvia() {
    this.sonidoAlarma?.destroy();
    this.sonidoAlarma = iniciarEfecto(this, 'alarma');
    const pulso = DURACION_ALERTA_LLUVIA / 8;
    let rojo = true;
    this.veloAlerta.setFillStyle(0xff3b30).setAlpha(0);
    this.tweens.add({
      targets: this.veloAlerta,
      alpha: 0.26,
      duration: pulso,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.easeInOut',
      onRepeat: () => {
        rojo = !rojo;
        this.veloAlerta.setFillStyle(rojo ? 0xff3b30 : 0xffb300);
      },
      onComplete: () => this.veloAlerta.setAlpha(0),
    });
    this.tweens.chain({
      targets: this.avisoLluvia,
      tweens: [
        { alpha: 1, scale: { from: 0.7, to: 1 }, duration: 250, ease: 'Back.easeOut' },
        { scale: 1.1, duration: 250, yoyo: true, repeat: 3, ease: 'Sine.easeInOut' },
        { alpha: 0, duration: 300 },
      ],
    });
  }

  private ocultarAlertaLluvia() {
    // La alarma se corta si la alerta termina antes (victoria, derrota, deshacer, salir)
    if (this.sonidoAlarma?.isPlaying) this.sonidoAlarma.destroy();
    this.sonidoAlarma = null;
    this.tweens.killTweensOf([this.veloAlerta, this.avisoLluvia]);
    this.veloAlerta.setAlpha(0);
    this.avisoLluvia.setAlpha(0).setScale(1);
  }

  // Reanuda la lluvia (tras deshacer): la siguiente gota con su espera del plan
  private arrancarLluvia() {
    this.programarGota(this.lluviaPendiente[0]?.esperaMs || 200);
  }

  private pararLluvia() {
    this.temporizadorLluvia?.remove();
    this.temporizadorLluvia = null;
    this.ocultarAlertaLluvia();
  }

  private actualizarTextoLluvia() {
    this.textoLluvia.setText(t('lluviaRestante', { n: this.lluviaPendiente.length }));
  }

  // Reintenta soltar la gota más tarde (sin duplicar gotas)
  private esperarGota(ms: number) {
    registrar('gotaEspera', { ms, motivo: ms === LLUVIA_ESPERA_MS ? 'ningún tubo seguro' : 'animación en curso', ...(ms === LLUVIA_ESPERA_MS ? this.decisionGota : {}) });
    this.programarGota(ms);
  }

  // Lluvia justa: la gota cae en un tubo al azar entre los que dejan el nivel con solución sin
  // habilidades. Si ninguno lo deja, devuelve null (la gota espera) salvo que el jugador ya no
  // tenga solución por sus propias jugadas: entonces cae al azar, como siempre.
  // Cada intento tiene un presupuesto de tiempo para no dar tirones; si se agota, se reintenta
  // y, tras varias esperas seguidas, la gota cae al azar para que la lluvia nunca se quede parada.
  private elegirTuboGota(candidatos: number[], color: ColorId): number | null {
    Phaser.Utils.Array.Shuffle(candidatos);
    if (this.esperasGota >= MAX_ESPERAS_GOTA) {
      this.esperasGota = 0;
      this.decisionGota = { decision: 'al azar tras varias esperas', candidatos: candidatos.length };
      return candidatos[0];
    }
    const objetivo = this.nivel.coloresBase;
    const inicio = performance.now();
    let probados = 0;
    for (const i of candidatos) {
      if (performance.now() - inicio > PRESUPUESTO_LLUVIA_MS) break;
      probados++;
      const prueba = clonarTubos(this.tubos);
      prueba[i].bolas.push({ ...nuevaBola(color), lluvia: true });
      intentarSellar(prueba[i]);
      if (tieneSolucion(prueba, NODOS_LLUVIA_JUSTA, objetivo)) {
        this.esperasGota = 0;
        this.decisionGota = { decision: 'segura', candidatos: candidatos.length, probados, calculoMs: Math.round(performance.now() - inicio) };
        return i;
      }
    }
    const calculoMs = Math.round(performance.now() - inicio);
    if (calculoMs <= PRESUPUESTO_LLUVIA_MS && !tieneSolucion(this.tubos, NODOS_LLUVIA_JUSTA, objetivo)) {
      this.decisionGota = { decision: 'al azar: el jugador ya no tiene solución', candidatos: candidatos.length, probados, calculoMs };
      return candidatos[0]; // el jugador ya no tiene solución: lluvia normal
    }
    // Ningún tubo seguro: la gota espera a que el jugador haga sitio (la lluvia nunca deja el nivel
    // imposible). Solo si el móvil se queda sin tiempo de cálculo varias veces seguidas, cae al azar.
    if (calculoMs > PRESUPUESTO_LLUVIA_MS) this.esperasGota++;
    else this.esperasGota = 0;
    this.decisionGota = { decision: calculoMs > PRESUPUESTO_LLUVIA_MS ? 'sin tiempo de cálculo' : 'ningún tubo seguro', candidatos: candidatos.length, probados, calculoMs, esperas: this.esperasGota };
    return null;
  }

  private soltarGota() {
    if (this.terminado || this.lluviaPendiente.length === 0) return;

    // Si hay una animación en curso, espera un poco
    if (this.bloqueado()) {
      this.esperarGota(200);
      return;
    }

    const conHueco = this.tubos.map((tubo, i) => ({ tubo, i })).filter(({ tubo }) => !tubo.sellado && tubo.bolas.length < capacidadDe(tubo));
    if (conHueco.length === 0) {
      registrar('gotaSinHueco', { color: corto(this.lluviaPendiente[0].color) });
      this.derrota('lluvia');
      return;
    }

    const color = this.lluviaPendiente[0].color;
    const i = this.elegirTuboGota(conHueco.map((c) => c.i), color);
    if (i === null) {
      // Ningún tubo es seguro ahora mismo: la gota espera un poco a que el jugador mueva
      this.esperarGota(LLUVIA_ESPERA_MS);
      return;
    }
    const tubo = this.tubos[i];
    if (this.seleccionado === i) this.bajar(i);

    const bola: Bola = { ...nuevaBola(this.lluviaPendiente.shift()!.color), lluvia: true };
    tubo.bolas.push(bola);
    const sellado = intentarSellar(tubo);
    registrar('gota', { tubo: i, color: corto(bola.color), quedan: this.lluviaPendiente.length, ...this.decisionGota, tubos: describirTubos([tubo], [i]).join(' ') });
    this.actualizarTextoLluvia();

    const destino = this.posicionHueco(i, tubo.bolas.length - 1);
    const sprite = this.crearSprite(bola, destino.x, -this.col.d);
    const duracion = 450; // la caída es solo animación: no bloquea los toques
    this.tweens.add({
      targets: sprite,
      y: destino.y,
      duration: duracion,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.aterrizar(sprite);
        this.estallarChispas(destino.x, destino.y + this.col.d * 0.4, 0xe1f5fe, 8);
      },
    });
    reproducirEfecto(this, 'gota', true);
    if (this.lluviaPendiente.length > 0) this.programarGota(this.lluviaPendiente[0].esperaMs);

    const generacion = this.generacion;
    this.time.delayedCall(duracion, () => {
      if (generacion !== this.generacion) return; // se deshizo mientras caía
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
    registrar('dialogo', { titulo: datos.titulo, botones: datos.botones.map((b) => b.accion).join(',') });
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
        { texto: t('tienda'), accion: 'tienda' },
        { texto: t('ajustes'), accion: 'ajustes' },
        { texto: t('menu'), accion: 'menu' },
      ],
    });
  }

  private victoria() {
    this.terminado = true;
    this.pararLluvia();
    this.actualizarDeshacer();
    this.actualizarTuboEmergencia();
    this.lluviaPendiente = [];
    this.textoLluvia.setVisible(false);

    sumarNivel('nivelesSuperados');
    const monedas = (5 + Math.floor(this.puntos / 10)) * (this.esDificil() ? 2 : 1);
    cerrarRegistroNivel('victoria', { puntos: this.puntos, monedas, lluviaPendiente: this.lluviaPendiente.length }, this.tubos);
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
    this.animarVictoria();

    this.time.delayedCall(950, () =>
      this.abrirDialogo({
        titulo: t('nivelCompletado'),
        texto: t(this.esDificil() ? 'recompensaDoble' : 'recompensa', { puntos: this.puntos, monedas }),
        botones: [
          { texto: t('siguiente'), accion: 'siguiente' },
          { texto: t('menu'), accion: 'menu' },
        ],
      }),
    );
  }

  private derrota(motivo: 'lluvia' | 'sinMovimientos') {
    this.terminado = true;
    cerrarRegistroNivel('derrota', { motivo, puntos: this.puntos, deshacerDisponible: this.puedeDeshacer() }, this.tubos);
    if (!this.derrotaContada) {
      this.derrotaContada = true;
      sumarNivel('nivelesFallidos');
    }
    this.pararLluvia();
    this.actualizarDeshacer();
    this.actualizarTuboEmergencia();
    this.cameras.main.shake(250, 0.01);
    reproducirEfecto(this, 'derrota');

    const dialogo = (): DatosDialogo => ({
      titulo: motivo === 'lluvia' ? t('derrota') : t('sinSalida'),
      texto: motivo === 'lluvia' ? t('derrotaTexto') : t('sinMovimientos'),
      botones: [
        // Con deshacer comprados se puede volver atrás en vez de perder
        ...(this.puedeDeshacer() ? [{ texto: t('deshacer', { n: cantidadDe('deshacer') }), accion: 'deshacer' as const }] : []),
        { texto: t('reiniciarNivel'), accion: 'reiniciar' },
        { texto: t('tienda'), accion: 'tienda' },
        { texto: t('menu'), accion: 'menu' },
      ],
      // Al volver de la tienda el diálogo se rehace (puede que ahora haya deshacer)
      recalcular: dialogo,
    });
    this.time.delayedCall(500, () => this.abrirDialogo(dialogo()));
  }

  // Abre la tienda encima de la partida (al tocar una ayuda sin usos)
  private abrirTienda() {
    if (this.bloqueado()) return;
    registrar('tienda');
    this.scene.pause();
    this.scene.launch('Tienda', { origen: this.scene.key });
  }

  private actualizarInventario() {
    this.textoMonedas.setText(String(getGuardado().monedas));
    this.colocarIconoMoneda();
    this.actualizarDeshacer();
    this.actualizarTuboEmergencia();
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
    while (this.historial.length > MAX_HISTORIAL) this.historial.shift();
    this.actualizarDeshacer();
  }

  private puedeDeshacer() {
    return cantidadDe('deshacer') > 0 && this.historial.length > 0;
  }

  // Sin usos, la insignia muestra «+» y el botón lleva a la tienda
  private actualizarDeshacer() {
    const quedan = cantidadDe('deshacer');
    this.insigniaDeshacer.setValor(quedan > 0 ? quedan : '+');
    this.botonDeshacer.setHabilitado(!this.terminado && (quedan === 0 || this.historial.length > 0));
  }

  private pulsarDeshacer() {
    if (cantidadDe('deshacer') === 0) this.abrirTienda();
    else this.deshacer();
  }

  // Vuelve al estado anterior a la última jugada (movimiento o giro de gravedad). Gasta un deshacer.
  private deshacer() {
    if (!this.puedeDeshacer() || this.time.now < this.bloqueadoHasta) return;
    if (!gastar('deshacer')) return;
    reabrirRegistroNivel(); // si venía de una derrota, el nivel vuelve a estar en curso
    registrar('deshacer', { quedan: cantidadDe('deshacer'), trasDerrota: this.terminado, historial: this.historial.length - 1 });
    sumarHabilidad('deshacer');
    const previo = this.historial.pop()!;
    this.generacion++;

    // Tubo de cada bola antes de deshacer, para animar el camino de vuelta
    const dondeEstaban = new Map<number, number>();
    this.tubos.forEach((tubo, t) => tubo.bolas.forEach((b) => dondeEstaban.set(b.id, t)));

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
    this.animarHaciaModelo(dondeEstaban);
    this.actualizarDeshacer();
    this.actualizarTuboEmergencia();
    reproducirEfecto(this, 'mover', true);
  }

  // Lleva cada bola desde donde está ahora a donde dice el modelo (el movimiento "al revés"):
  // las que cambian de tubo suben, cruzan y bajan; las nuevas aparecen; las que sobran se van
  private animarHaciaModelo(dondeEstaban: Map<number, number>) {
    const subir = 110;
    const cruzar = 140;
    const bajar = 110;
    const tamano = this.col.d * 0.92;
    const vivos = new Set<number>();

    this.tubos.forEach((tubo, t) => {
      tubo.bolas.forEach((bola, i) => {
        vivos.add(bola.id);
        const destino = this.posicionHueco(t, i);
        let sprite = this.sprites.get(bola.id);

        if (!sprite) {
          // Vuelve una bola que había desaparecido (p. ej. al deshacer una fusión)
          sprite = this.crearSprite(bola, destino.x, destino.y);
          const escala = sprite.scaleX;
          sprite.setScale(0);
          this.tweens.add({ targets: sprite, scale: escala, duration: 220, delay: subir + cruzar, ease: 'Back.easeOut' });
          return;
        }

        this.tweens.killTweensOf(sprite);
        sprite.setTexture(claveTextura(bola)).setDisplaySize(tamano, tamano).setAlpha(1).setAngle(0);
        const tuboAntes = dondeEstaban.get(bola.id);
        if (tuboAntes !== undefined && tuboAntes !== t) {
          const desde = this.posicionLevantada(tuboAntes);
          const encima = this.posicionLevantada(t);
          this.tweens.chain({
            targets: sprite,
            tweens: [
              { x: desde.x, y: desde.y, duration: subir, ease: 'Quad.easeOut' },
              { x: encima.x, y: encima.y, duration: cruzar, ease: 'Sine.easeInOut' },
              { y: destino.y, duration: bajar, ease: 'Quad.easeIn' },
            ],
          });
        } else if (sprite.x !== destino.x || sprite.y !== destino.y) {
          this.tweens.add({ targets: sprite, x: destino.x, y: destino.y, duration: subir + cruzar, ease: 'Sine.easeInOut' });
        }
      });
    });

    // Bolas que ya no están: las de lluvia vuelven al cielo, el resto se desvanece
    for (const [id, sprite] of this.sprites) {
      if (vivos.has(id)) continue;
      this.sprites.delete(id);
      this.tweens.killTweensOf(sprite);
      const deLluvia = sprite.texture.key.startsWith('hielo-');
      this.tweens.add({
        targets: sprite,
        ...(deLluvia ? { y: -this.col.d } : { scale: 0 }),
        alpha: 0,
        duration: subir + cruzar,
        ease: 'Quad.easeIn',
        onComplete: () => sprite.destroy(),
      });
    }

    this.bloquear(subir + cruzar + bajar + 20);
  }

  // ───────────────────────── Tubo de emergencia ─────────────────────────

  // Se puede poner si aún no se usó en este nivel y queda alguno comprado
  private tuboDisponible() {
    return !this.tuboUsado && cantidadDe('tuboExtra') > 0;
  }

  private actualizarTuboEmergencia() {
    const quedan = cantidadDe('tuboExtra');
    this.insigniaTubo.setValor(quedan > 0 ? quedan : '+');
    this.botonTubo.setHabilitado(!this.terminado && !this.tuboUsado);
  }

  private pulsarTubo() {
    if (cantidadDe('tuboExtra') === 0) this.abrirTienda();
    else this.usarTuboEmergencia();
  }

  // Añade un tubo con un solo hueco (máximo uno por nivel). Gasta un tubo extra.
  private usarTuboEmergencia() {
    if (!this.tuboDisponible() || this.bloqueado()) return;
    if (!gastar('tuboExtra')) return;
    registrar('tuboExtra', { quedan: cantidadDe('tuboExtra') });
    sumarHabilidad('tuboExtra');
    if (this.seleccionado !== null) this.bajar(this.seleccionado);

    this.tuboUsado = true;
    this.agregarTubo({ bolas: [], sellado: false, capacidad: 1 });
    this.bloquear(300);
    reproducirEfecto(this, 'fusion');
    this.actualizarTuboEmergencia();
  }

  update(_time: number, _delta: number) {
    // Todo el movimiento va con tweens: no hace falta lógica por frame
  }
}
