import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater, type BundleInfo } from '@capgo/capacitor-updater';
import { VERSION } from '../constantes';

// Actualizaciones en caliente de la app Android (Capgo en modo manual, sin sus servidores).
// Cada despliegue en GitHub Pages publica `actualizacion/version.json` y un .zip con el build
// (`.github/workflows/deploy.yml`). Al abrir el juego (y al volver de segundo plano) la app lo
// mira: si hay una versión más nueva del mismo MAJOR, la descarga. Si el jugador está en el menú
// se instala en ese momento (el juego se recarga); si está jugando, queda preparada y se instala
// al volver al menú o al salir de la app. Un MAJOR nuevo puede traer cambios nativos: entonces
// solo se avisa de que hay un APK nuevo. En el navegador no hace nada.
// Cada paso se apunta en un historial (`odi-sort:actualizaciones`) que sale en el registro de
// depuración, para poder diagnosticar en el móvil.

export const URL_ACTUALIZACION = 'https://andydevx.github.io/bubble-sort/actualizacion/version.json';
export const URL_DESCARGA_APK = 'https://github.com/AndyDevX/bubble-sort/releases/latest';
const MIN_ENTRE_BUSQUEDAS_MS = 2 * 60 * 1000;
const CLAVE_HISTORIAL = 'odi-sort:actualizaciones';
const MAX_HISTORIAL = 30;

interface InfoVersion {
  version: string;
  build: number;
  zip: string; // relativo a version.json
}

export type EstadoActualizacion =
  | { tipo: 'nada' }
  | { tipo: 'descargando'; version: string }
  | { tipo: 'lista'; version: string } // descargada: se instala en el menú o al salir y volver
  | { tipo: 'instalando'; version: string }
  | { tipo: 'apkNuevo'; version: string } // MAJOR nuevo: hay que instalar el APK
  | { tipo: 'error'; motivo: string };

let estado: EstadoActualizacion = { tipo: 'nada' };
let paqueteListo: string | null = null;
const oyentes = new Set<(e: EstadoActualizacion) => void>();
let ultimaBusqueda = 0;
let buscando = false;

export const getEstadoActualizacion = (): EstadoActualizacion => estado;

/** Avisa de cada cambio de estado; devuelve la función para dejar de escuchar. */
export function alCambiarActualizacion(fn: (e: EstadoActualizacion) => void): () => void {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

function cambiar(nuevo: EstadoActualizacion): void {
  estado = nuevo;
  oyentes.forEach((fn) => fn(estado));
}

/** Historial de intentos (para el registro de depuración). */
export function historialActualizaciones(): string[] {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_HISTORIAL) ?? '[]') as unknown;
    return Array.isArray(datos) ? datos.filter((l): l is string => typeof l === 'string') : [];
  } catch {
    return [];
  }
}

function apuntar(texto: string): void {
  try {
    const lineas = [...historialActualizaciones(), `${new Date().toLocaleString()} · v${VERSION} · ${texto}`];
    localStorage.setItem(CLAVE_HISTORIAL, JSON.stringify(lineas.slice(-MAX_HISTORIAL)));
  } catch {
    // Sin almacenamiento el historial simplemente no se guarda
  }
}

const mensajeError = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 160);

const partes = (v: string) => v.split('.').map((n) => Number.parseInt(n, 10) || 0);

/** >0 si a es más nueva que b. */
export function compararVersiones(a: string, b: string): number {
  const [pa, pb] = [partes(a), partes(b)];
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
}

export function iniciarActualizaciones(): void {
  if (!Capacitor.isNativePlatform()) return;
  // Lo primero: confirmar que este build arranca (si no, Capgo vuelve al anterior)
  void CapacitorUpdater.notifyAppReady();
  apuntar('arranque');
  void buscarActualizacion();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void buscarActualizacion();
  });
}

/** Instala ya la versión descargada (recarga el juego). Solo desde el menú, nunca en partida. */
export function instalarActualizacion(): void {
  if (!paqueteListo || estado.tipo !== 'lista') return;
  cambiar({ tipo: 'instalando', version: estado.version });
  apuntar(`instalando ${estado.version}`);
  CapacitorUpdater.set({ id: paqueteListo }).catch((e: unknown) => {
    apuntar(`error al instalar: ${mensajeError(e)}`);
    cambiar({ tipo: 'error', motivo: mensajeError(e) });
  });
}

async function buscarActualizacion(): Promise<void> {
  if (buscando || paqueteListo || Date.now() - ultimaBusqueda < MIN_ENTRE_BUSQUEDAS_MS) return;
  buscando = true;
  ultimaBusqueda = Date.now();
  try {
    const respuesta = await fetch(`${URL_ACTUALIZACION}?t=${Date.now()}`, { cache: 'no-store' });
    if (!respuesta.ok) throw new Error(`version.json respondió ${respuesta.status}`);
    const info = (await respuesta.json()) as InfoVersion;
    const { bundles } = await CapacitorUpdater.list();
    const { bundle: actual } = await CapacitorUpdater.current();

    if (compararVersiones(info.version, VERSION) <= 0) {
      apuntar(`al día (publicada ${info.version})`);
      await limpiar(bundles, actual.id);
      return;
    }
    if (partes(info.version)[0] > partes(VERSION)[0]) {
      apuntar(`APK nuevo disponible: ${info.version}`);
      cambiar({ tipo: 'apkNuevo', version: info.version });
      return;
    }
    // Una versión que ya falló al arrancar (Capgo la marcó con error) no se vuelve a intentar
    if (bundles.some((b) => b.version === info.version && b.status === 'error')) {
      apuntar(`${info.version} ya falló al arrancar: no se reintenta`);
      return;
    }

    let paquete = bundles.find((b) => b.version === info.version && b.status !== 'error' && b.status !== 'downloading');
    if (!paquete) {
      apuntar(`descargando ${info.version}`);
      cambiar({ tipo: 'descargando', version: info.version });
      paquete = await CapacitorUpdater.download({ url: new URL(info.zip, URL_ACTUALIZACION).href, version: info.version });
    }
    // Por si se sale de la app antes de volver al menú: se instala al pasar a segundo plano
    await CapacitorUpdater.next({ id: paquete.id });
    await limpiar(bundles, actual.id, paquete.id);
    paqueteListo = paquete.id;
    apuntar(`${info.version} lista (${paquete.status})`);
    cambiar({ tipo: 'lista', version: info.version });
  } catch (e) {
    // Sin conexión o descarga fallida: se vuelve a intentar al volver a la app
    apuntar(`error: ${mensajeError(e)}`);
    cambiar({ tipo: 'error', motivo: mensajeError(e) });
    ultimaBusqueda = 0;
  } finally {
    buscando = false;
  }
}

/** Borra los paquetes descargados que ya no sirven (cada uno ocupa unos 4 MB). */
async function limpiar(bundles: BundleInfo[], ...conservar: string[]): Promise<void> {
  for (const b of bundles) {
    if (conservar.includes(b.id) || b.id === 'builtin' || b.status === 'error') continue;
    await CapacitorUpdater.delete({ id: b.id }).catch(() => undefined);
  }
}
