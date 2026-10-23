import { COMMIT_BUILD, NUMERO_BUILD, VERSION } from '../constantes';
import type { ColorId } from '../juego/colores';
import type { Tubo } from '../juego/modelo';
import type { ConfigNivel } from '../juego/niveles';

// Registro de depuración: todo lo que pasa en cada nivel (una entrada por partida), con tiempo
// real (incluye pausas) y tiempo de juego (el reloj de Phaser, que se para en pausa). Se guarda en
// localStorage (últimas MAX_ENTRADAS partidas) y se exporta como texto desde la pantalla «Registro».

export interface Evento {
  t: number; // ms reales desde el inicio del nivel
  tj: number; // ms de juego desde el inicio del nivel
  tipo: string;
  d?: Record<string, unknown>;
}

export interface EntradaRegistro {
  id: number;
  nivel: number;
  modo: string;
  fecha: string; // ISO, hora local del dispositivo al empezar
  version: string;
  config: ConfigNivel;
  coloresBase: ColorId[];
  coloresLluvia: ColorId[];
  inicial: string[];
  eventos: Evento[];
  resultado?: { tipo: 'victoria' | 'derrota' | 'salida'; t: number; tj: number; d?: Record<string, unknown> };
  final?: string[];
}

const CLAVE = 'odi-sort:registro';
const MAX_ENTRADAS = 40;
const MAX_EVENTOS = 4000;

// Abreviaturas de color para escribir los tubos de forma compacta
const CORTO: Record<ColorId, string> = {
  rojo: 'ro', azul: 'az', amarillo: 'am', verde: 've', naranja: 'na', morado: 'mo', rosa: 'rs', cian: 'ci',
  lima: 'li', marron: 'ma', blanco: 'bl', azulDivino: 'aD', jade: 'ja', plata: 'pl', amatista: 'at',
  esmeralda: 'es', oro: 'or', carmesi: 'ca',
};

// Cada tubo de abajo arriba: código de color, «?» oculta, «*» ingrediente, «~» lluvia; «#» sellado.
// `indices`: número real de cada tubo cuando se describe solo una parte del tablero.
export function describirTubos(tubos: Tubo[], indices?: number[]): string[] {
  return tubos.map((t, j) => {
    const i = indices?.[j] ?? j;
    const bolas = t.bolas.map((b) => `${CORTO[b.color]}${b.oculta ? '?' : ''}${b.ingrediente ? '*' : ''}${b.lluvia ? '~' : ''}`).join(' ');
    const cap = t.capacidad ? `(cap ${t.capacidad})` : '';
    return `${i}${t.sellado ? '#' : ''}${cap}[${bolas}]`;
  });
}

export const corto = (c: ColorId) => CORTO[c];

function cargar(): EntradaRegistro[] {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE) ?? '[]') as unknown;
    return Array.isArray(datos) ? (datos as EntradaRegistro[]) : [];
  } catch {
    return [];
  }
}

let entradas = cargar();
let actual: EntradaRegistro | null = null;
let inicioReal = 0;
let inicioJuego = 0;
let relojJuego: () => number = () => 0;
let pendiente: ReturnType<typeof setTimeout> | null = null;

function escribir() {
  if (pendiente) clearTimeout(pendiente);
  pendiente = null;
  try {
    localStorage.setItem(CLAVE, JSON.stringify(entradas));
  } catch {
    // Lleno o sin almacenamiento: se recorta a la mitad y se reintenta una vez
    entradas = entradas.slice(-Math.ceil(entradas.length / 2));
    try {
      localStorage.setItem(CLAVE, JSON.stringify(entradas));
    } catch {
      // Sin almacenamiento: el registro dura solo esta sesión
    }
  }
}

function guardar() {
  if (!pendiente) pendiente = setTimeout(escribir, 1000);
}

// Empieza el registro de un nivel. `reloj` da el tiempo de juego (this.time.now de la escena).
export function iniciarRegistroNivel(datos: {
  nivel: number;
  modo: string;
  config: ConfigNivel;
  coloresBase: ColorId[];
  coloresLluvia: ColorId[];
  tubos: Tubo[];
  reloj: () => number;
}): void {
  if (actual && !actual.resultado) cerrarRegistroNivel('salida', { motivo: 'nuevo nivel sin cerrar el anterior' });
  relojJuego = datos.reloj;
  inicioReal = performance.now();
  inicioJuego = relojJuego();
  actual = {
    id: (entradas.at(-1)?.id ?? 0) + 1,
    nivel: datos.nivel,
    modo: datos.modo,
    fecha: new Date().toISOString(),
    version: `v${VERSION} · build ${NUMERO_BUILD}${COMMIT_BUILD ? ` · ${COMMIT_BUILD}` : ''}`,
    config: { ...datos.config },
    coloresBase: [...datos.coloresBase],
    coloresLluvia: [...datos.coloresLluvia],
    inicial: describirTubos(datos.tubos),
    eventos: [],
  };
  entradas.push(actual);
  if (entradas.length > MAX_ENTRADAS) entradas = entradas.slice(-MAX_ENTRADAS);
  registrar('inicio', { modo: datos.modo, ancho: window.innerWidth, alto: window.innerHeight });
}

// El reloj de la escena no está al día durante create (se actualiza en el primer fotograma): la
// partida llama a esto en su primer update para que el tiempo de juego empiece en 0
export function ajustarRelojJuego(): void {
  inicioJuego = relojJuego() - (performance.now() - inicioReal);
}

const tiempos = () => ({ t: Math.round(performance.now() - inicioReal), tj: Math.round(relojJuego() - inicioJuego) });

// Añade un evento al nivel en curso (si no hay ninguno, no hace nada)
export function registrar(tipo: string, d?: Record<string, unknown>): void {
  if (!actual || actual.resultado || actual.eventos.length >= MAX_EVENTOS) return;
  actual.eventos.push({ ...tiempos(), tipo, ...(d ? { d } : {}) });
  guardar();
}

export function cerrarRegistroNivel(tipo: 'victoria' | 'derrota' | 'salida', d?: Record<string, unknown>, tubos?: Tubo[]): void {
  if (!actual || actual.resultado) return;
  actual.resultado = { tipo, ...tiempos(), ...(d ? { d } : {}) };
  if (tubos) actual.final = describirTubos(tubos);
  escribir();
}

// Una derrota se puede deshacer: el nivel vuelve a estar en curso
export function reabrirRegistroNivel(): void {
  if (actual?.resultado?.tipo === 'derrota') {
    const { t, tj, d } = actual.resultado;
    actual.eventos.push({ t, tj, tipo: 'derrota', d });
    actual.resultado = undefined;
    actual.final = undefined;
    guardar();
  }
}

export function getRegistro(): readonly EntradaRegistro[] {
  return entradas;
}

export function borrarRegistro(): void {
  entradas = actual && !actual.resultado ? [actual] : [];
  escribir();
}

// Errores de JavaScript: van al nivel en curso
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => registrar('error', { mensaje: e.message, origen: `${e.filename}:${e.lineno}:${e.colno}` }));
  window.addEventListener('unhandledrejection', (e) => registrar('error', { mensaje: String(e.reason) }));
  window.addEventListener('pagehide', () => pendiente && escribir());
  document.addEventListener('visibilitychange', () => {
    registrar(document.hidden ? 'appOculta' : 'appVisible');
    if (document.hidden && pendiente) escribir();
  });
}

// ───────────── Exportación ─────────────

const mmss = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const reloj = (ms: number) => {
  const m = Math.floor(ms / 60000);
  const s = ((ms % 60000) / 1000).toFixed(3).padStart(6, '0');
  return `${String(m).padStart(2, '0')}:${s}`;
};
const cuenta = (e: EntradaRegistro, tipo: string) => e.eventos.filter((x) => x.tipo === tipo).length;

function pausado(e: EntradaRegistro): number {
  let total = 0;
  let desde: number | null = null;
  for (const x of e.eventos) {
    if (x.tipo === 'pausa') desde = x.t;
    if (x.tipo === 'reanudar' && desde !== null) {
      total += x.t - desde;
      desde = null;
    }
  }
  return total;
}

function configCorta(c: ConfigNivel): string {
  return `${c.colores} colores · ${c.colores + c.tubosVacios} tubos · ${c.fusiones} fusiones · niebla ${Math.round(c.niebla * 100)} % · lluvia ${c.lotesLluvia}×4 cada ${(c.intervaloLluviaMs / 1000).toFixed(2)} s · paleta ${c.desbloqueados} · bloque ${c.bloque ?? '-'}${c.dificil ? ' · DIFÍCIL' : ''}`;
}

export function resumenEntrada(e: EntradaRegistro): string {
  const r = e.resultado;
  const fin = r ? `${r.tipo.toUpperCase()}${r.d?.motivo ? ` (${String(r.d.motivo)})` : ''}` : 'EN CURSO';
  const duracion = r ?? e.eventos.at(-1) ?? { t: 0, tj: 0 };
  const lluvia = e.eventos.find((x) => x.tipo === 'lluviaInicio');
  const fecha = new Date(e.fecha);
  return [
    `#${e.id} · Nivel ${e.nivel}${e.config.dificil ? ' (difícil)' : ''} · ${e.modo} · ${fecha.toLocaleDateString()} ${fecha.toLocaleTimeString()}`,
    `  ${fin} · juego ${mmss(duracion.tj)} · real ${mmss(duracion.t)} (pausado ${mmss(pausado(e))})`,
    `  jugadas ${cuenta(e, 'mover') + cuenta(e, 'fusion')} (fusiones ${cuenta(e, 'fusion')}, inválidas ${cuenta(e, 'invalido')}, toques ignorados ${cuenta(e, 'toqueIgnorado')}) · selecciones ${cuenta(e, 'seleccionar')}`,
    `  deshacer ${cuenta(e, 'deshacer')} (derrotas deshechas ${cuenta(e, 'derrota')}) · tubo extra ${cuenta(e, 'tuboExtra')} · gravedad ${cuenta(e, 'gravedad')} · sellados ${cuenta(e, 'sellar')} · reveladas ${e.eventos.filter((x) => x.tipo === 'revelar').reduce((a, x) => a + Number(x.d?.n ?? 0), 0)}`,
    `  lluvia ${lluvia ? `desde ${mmss(lluvia.tj)}` : 'no empezó'} · gotas ${cuenta(e, 'gota')}/${e.config.lotesLluvia * 4} · esperas ${cuenta(e, 'gotaEspera')} · errores ${cuenta(e, 'error')}`,
    `  ${r?.d?.puntos !== undefined ? `${String(r.d.puntos)} pts · ` : ''}${r?.d?.monedas !== undefined ? `+${String(r.d.monedas)} monedas · ` : ''}${configCorta(e.config)}`,
  ].join('\n');
}

function cabecera(): string {
  return [
    `Odi Sort — registro de depuración (${new Date().toLocaleString()})`,
    `Versión: v${VERSION} · build ${NUMERO_BUILD}${COMMIT_BUILD ? ` · ${COMMIT_BUILD}` : ''}`,
    `Dispositivo: ${navigator.userAgent}`,
    `Pantalla: ${window.innerWidth}×${window.innerHeight} @${window.devicePixelRatio}x`,
    `Partidas registradas: ${entradas.length}`,
    'Tubos: de abajo arriba; «?» oculta, «*» ingrediente, «~» lluvia, «#» sellado.',
    'Tiempos: [real | juego] desde el inicio del nivel (el de juego se para en pausa).',
  ].join('\n');
}

export function textoResumen(): string {
  return `${cabecera()}\n\n${[...entradas].reverse().map(resumenEntrada).join('\n\n')}\n`;
}

const valor = (v: unknown) => (typeof v === 'object' ? JSON.stringify(v) : String(v));

export function textoCompleto(): string {
  const bloques = [...entradas].reverse().map((e) => {
    const lineas = e.eventos.map((x) => `[${reloj(x.t)} | ${reloj(x.tj)}] ${x.tipo}${x.d ? ' ' + Object.entries(x.d).map(([k, v]) => `${k}=${valor(v)}`).join(' ') : ''}`);
    return [
      '═'.repeat(60),
      resumenEntrada(e),
      `  versión ${e.version} · base ${e.coloresBase.map(corto).join(' ')} · lluvia ${e.coloresLluvia.map(corto).join(' ')}`,
      '  inicial:',
      ...e.inicial.map((t) => `    ${t}`),
      '  eventos:',
      ...lineas.map((l) => `    ${l}`),
      ...(e.final ? ['  final:', ...e.final.map((t) => `    ${t}`)] : []),
    ].join('\n');
  });
  return `${cabecera()}\n\n${bloques.join('\n\n')}\n`;
}
