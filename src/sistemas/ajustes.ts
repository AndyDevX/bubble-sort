import { esIdiomaValido, idiomaDelDispositivo, type CodigoIdioma } from '../i18n';
import { almacen } from './almacen';

export interface Ajustes {
  volumenMusica: number;  // 0..1
  volumenEfectos: number; // 0..1
  idioma: CodigoIdioma;
}

const CLAVE_GUARDADO = 'odi-sort:ajustes';

const POR_DEFECTO: Omit<Ajustes, 'idioma'> = {
  volumenMusica: 0.7,
  volumenEfectos: 0.8,
};

function limitar(valor: unknown, porDefecto: number): number {
  return typeof valor === 'number' && Number.isFinite(valor) ? Math.min(1, Math.max(0, valor)) : porDefecto;
}

function cargar(): Ajustes {
  try {
    const datos = JSON.parse(almacen.getItem(CLAVE_GUARDADO) ?? '{}') as Partial<Record<keyof Ajustes, unknown>>;
    return {
      volumenMusica: limitar(datos.volumenMusica, POR_DEFECTO.volumenMusica),
      volumenEfectos: limitar(datos.volumenEfectos, POR_DEFECTO.volumenEfectos),
      idioma: typeof datos.idioma === 'string' && esIdiomaValido(datos.idioma) ? datos.idioma : idiomaDelDispositivo(),
    };
  } catch {
    return { ...POR_DEFECTO, idioma: idiomaDelDispositivo() };
  }
}

// Se lee la primera vez que se pide (en CrazyGames, después de iniciar su SDK: ver almacen.ts)
let actualesCache: ReturnType<typeof cargar> | null = null;
const actualesDatos = () => (actualesCache ??= cargar());

export function getAjustes(): Readonly<Ajustes> {
  return actualesDatos();
}

export function actualizarAjustes(cambios: Partial<Ajustes>): void {
  actualesCache = { ...actualesDatos(), ...cambios };
  try {
    almacen.setItem(CLAVE_GUARDADO, JSON.stringify(actualesDatos()));
  } catch {
    // Sin almacenamiento disponible: los ajustes duran solo esta sesión
  }
}
