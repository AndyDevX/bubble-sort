import { buscarFusion, type ColorId } from './colores';
import { CAPACIDAD, type Tubo } from './modelo';

// Comprueba si un nivel tiene solución (sin tener en cuenta niebla ni lluvia).
// Representa cada tubo como texto: una letra por bola; mayúscula = ingrediente.
// Un tubo sellado se representa con '#'.

interface Codificacion {
  letraDe: Map<ColorId, string>;
  colorDe: Map<string, ColorId>;
}

function codificar(tubos: Tubo[]): { estado: string[]; cod: Codificacion } {
  const letraDe = new Map<ColorId, string>();
  const colorDe = new Map<string, ColorId>();
  const letra = (c: ColorId) => {
    let l = letraDe.get(c);
    if (!l) {
      l = String.fromCharCode(97 + letraDe.size);
      letraDe.set(c, l);
      colorDe.set(l, c);
    }
    return l;
  };
  const estado = tubos.map((t) =>
    t.sellado ? '#' : t.bolas.map((b) => (b.ingrediente ? letra(b.color).toUpperCase() : letra(b.color))).join(''),
  );
  return { estado, cod: { letraDe, colorDe } };
}

function sellable(tubo: string): boolean {
  return tubo.length === CAPACIDAD && tubo === tubo[0].repeat(CAPACIDAD) && tubo[0] === tubo[0].toLowerCase();
}

function completo(estado: string[]): boolean {
  return estado.every((t) => t === '#' || t === '');
}

export function tieneSolucion(tubos: Tubo[], limiteNodos = 40000): boolean {
  const { estado: inicial, cod } = codificar(tubos);

  const fusionar = (x: string, y: string): string | null => {
    const cx = cod.colorDe.get(x.toLowerCase());
    const cy = cod.colorDe.get(y.toLowerCase());
    if (!cx || !cy) return null;
    const r = buscarFusion(cx, cy);
    if (!r) return null;
    let l = cod.letraDe.get(r);
    if (!l) {
      l = String.fromCharCode(97 + cod.letraDe.size);
      cod.letraDe.set(r, l);
      cod.colorDe.set(l, r);
    }
    return l;
  };

  const clave = (e: string[]) => [...e].sort().join('|');
  const visitados = new Set<string>([clave(inicial)]);
  const pila: string[][] = [inicial];
  let nodos = 0;

  while (pila.length > 0) {
    const e = pila.pop()!;
    if (completo(e)) return true;
    if (++nodos > limiteNodos) return false;

    const hijos: { e: string[]; prioridad: number }[] = [];
    for (let o = 0; o < e.length; o++) {
      const desde = e[o];
      if (desde === '#' || desde === '') continue;
      const bola = desde[desde.length - 1];
      const monocolor = desde === bola.repeat(desde.length);

      for (let d = 0; d < e.length; d++) {
        if (d === o) continue;
        const hacia = e[d];
        if (hacia === '#') continue;
        const tope = hacia[hacia.length - 1];

        let nuevoHacia: string | null = null;
        let prioridad = 0;
        if (hacia === '') {
          if (monocolor) continue; // mover un tubo de un solo color a uno vacío no sirve
          nuevoHacia = bola;
        } else if (tope === bola) {
          if (hacia.length >= CAPACIDAD) continue;
          nuevoHacia = hacia + bola;
          prioridad = hacia === bola.repeat(hacia.length) ? 3 : 1;
        } else if (bola === bola.toUpperCase() && tope === tope.toUpperCase()) {
          const r = fusionar(bola, tope);
          if (!r) continue;
          nuevoHacia = hacia.slice(0, -1) + r;
          prioridad = 2;
        } else {
          continue;
        }

        const siguiente = [...e];
        siguiente[o] = desde.slice(0, -1);
        siguiente[d] = sellable(nuevoHacia) ? '#' : nuevoHacia;
        const k = clave(siguiente);
        if (visitados.has(k)) continue;
        visitados.add(k);
        hijos.push({ e: siguiente, prioridad });
      }
    }
    // Los de mayor prioridad se exploran primero (se meten al final de la pila)
    hijos.sort((a, b) => a.prioridad - b.prioridad);
    for (const h of hijos) pila.push(h.e);
  }
  return false;
}
