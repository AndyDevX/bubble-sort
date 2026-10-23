import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater, type BundleInfo } from '@capgo/capacitor-updater';
import { VERSION } from '../constantes';

// Actualizaciones en caliente de la app Android (Capgo en modo manual, sin sus servidores).
// Cada despliegue en GitHub Pages publica `actualizacion/version.json` y un .zip con el build
// (`.github/workflows/deploy.yml`). Al abrir el juego (y al volver de segundo plano) la app lo
// mira: si hay una versión más nueva del mismo MAJOR, la descarga y la deja preparada para la
// próxima vez que el juego pase a segundo plano o se vuelva a abrir. Un MAJOR nuevo puede traer
// cambios nativos: entonces solo se avisa de que hay un APK nuevo. En el navegador no hace nada
// (allí la web ya es siempre la última).

export const URL_ACTUALIZACION = 'https://andydevx.github.io/bubble-sort/actualizacion/version.json';
export const URL_DESCARGA_APK = 'https://github.com/AndyDevX/bubble-sort/releases/latest';
const MIN_ENTRE_BUSQUEDAS_MS = 10 * 60 * 1000;

interface InfoVersion {
  version: string;
  build: number;
  zip: string; // relativo a version.json
}

export type EstadoActualizacion =
  | { tipo: 'nada' }
  | { tipo: 'descargando'; version: string }
  | { tipo: 'lista'; version: string } // se aplica al salir y volver a entrar
  | { tipo: 'apkNuevo'; version: string }; // MAJOR nuevo: hay que instalar el APK

let estado: EstadoActualizacion = { tipo: 'nada' };
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
  void buscarActualizacion();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void buscarActualizacion();
  });
}

async function buscarActualizacion(): Promise<void> {
  if (buscando || Date.now() - ultimaBusqueda < MIN_ENTRE_BUSQUEDAS_MS) return;
  buscando = true;
  ultimaBusqueda = Date.now();
  try {
    const respuesta = await fetch(`${URL_ACTUALIZACION}?t=${Date.now()}`, { cache: 'no-store' });
    if (!respuesta.ok) return;
    const info = (await respuesta.json()) as InfoVersion;
    const { bundles } = await CapacitorUpdater.list();
    const { bundle: actual } = await CapacitorUpdater.current();

    if (compararVersiones(info.version, VERSION) <= 0) {
      await limpiar(bundles, actual.id);
      return;
    }
    if (partes(info.version)[0] > partes(VERSION)[0]) {
      cambiar({ tipo: 'apkNuevo', version: info.version });
      return;
    }
    // Una versión que ya falló al arrancar (Capgo la marcó con error) no se vuelve a intentar
    if (bundles.some((b) => b.version === info.version && b.status === 'error')) return;

    let paquete = bundles.find((b) => b.version === info.version && b.status === 'success');
    if (!paquete) {
      cambiar({ tipo: 'descargando', version: info.version });
      paquete = await CapacitorUpdater.download({ url: new URL(info.zip, URL_ACTUALIZACION).href, version: info.version });
    }
    await CapacitorUpdater.next({ id: paquete.id });
    await limpiar(bundles, actual.id, paquete.id);
    cambiar({ tipo: 'lista', version: info.version });
  } catch {
    // Sin conexión o descarga fallida: se vuelve a intentar la próxima vez
    if (estado.tipo === 'descargando') cambiar({ tipo: 'nada' });
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
