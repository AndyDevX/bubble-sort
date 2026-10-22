import { esIdiomaValido, type CodigoIdioma } from '../i18n';

export interface Ajustes {
  volumenMusica: number;  // 0..1
  volumenEfectos: number; // 0..1
  idioma: CodigoIdioma;
}

const CLAVE_GUARDADO = 'odi-sort:ajustes';

const POR_DEFECTO: Ajustes = {
  volumenMusica: 0.7,
  volumenEfectos: 0.8,
  idioma: 'es',
};

function limitar(valor: unknown, porDefecto: number): number {
  return typeof valor === 'number' && Number.isFinite(valor) ? Math.min(1, Math.max(0, valor)) : porDefecto;
}

function cargar(): Ajustes {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_GUARDADO) ?? '{}') as Partial<Record<keyof Ajustes, unknown>>;
    return {
      volumenMusica: limitar(datos.volumenMusica, POR_DEFECTO.volumenMusica),
      volumenEfectos: limitar(datos.volumenEfectos, POR_DEFECTO.volumenEfectos),
      idioma: typeof datos.idioma === 'string' && esIdiomaValido(datos.idioma) ? datos.idioma : POR_DEFECTO.idioma,
    };
  } catch {
    return { ...POR_DEFECTO };
  }
}

let actuales = cargar();

export function getAjustes(): Readonly<Ajustes> {
  return actuales;
}

export function actualizarAjustes(cambios: Partial<Ajustes>): void {
  actuales = { ...actuales, ...cambios };
  try {
    localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(actuales));
  } catch {
    // Sin almacenamiento disponible: los ajustes duran solo esta sesión
  }
}
