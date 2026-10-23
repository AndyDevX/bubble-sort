// Utilidades compartidas por los scripts de análisis (simular, analizar):
//  - cargarJuego(): compila la lógica pura (src/juego) a una carpeta temporal y la importa;
//  - motor de búsqueda sobre tubos codificados como texto, con las mismas reglas que el juego.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CAP = 4;

export async function cargarJuego() {
  const salida = mkdtempSync(join(tmpdir(), 'odi-sort-sim-'));
  const fuentes = ['modelo', 'colores', 'niveles', 'solucionador', 'lluvia'].map((f) => join(RAIZ, 'src', 'juego', f + '.ts'));
  execFileSync(join(RAIZ, 'node_modules', '.bin', 'tsc'), ['--ignoreConfig', ...fuentes, '--outDir', salida, '--module', 'esnext', '--target', 'es2022', '--moduleResolution', 'bundler', '--skipLibCheck'], { stdio: 'inherit' });
  for (const f of readdirSync(salida)) {
    const ruta = join(salida, f);
    writeFileSync(ruta, readFileSync(ruta, 'utf8').replace(/from '(\.\/[a-zA-Z]+)'/g, "from '$1.js'"));
  }
  writeFileSync(join(salida, 'package.json'), '{"type":"module"}');
  const niveles = await import(pathToFileURL(join(salida, 'niveles.js')).href);
  const colores = await import(pathToFileURL(join(salida, 'colores.js')).href);
  const lluvia = await import(pathToFileURL(join(salida, 'lluvia.js')).href);
  buscarFusion = colores.buscarFusion;
  return { ...niveles, ...colores, ...lluvia };
}

let buscarFusion = () => null;

// Estado: array de strings, una letra por bola (mayúscula = ingrediente). Tubo sellado: '#' + letra.
export function crearCodigo() {
  const letraDe = new Map();
  const colorDe = new Map();
  const letra = (c) => {
    let l = letraDe.get(c);
    if (!l) {
      l = String.fromCharCode(97 + letraDe.size);
      letraDe.set(c, l);
      colorDe.set(l, c);
    }
    return l;
  };
  return { letra, colorDe };
}

// Estado: array de strings. Tubo sellado: '#' + letra del color.
export function vecinos(e, cod) {
  const res = [];
  for (let o = 0; o < e.length; o++) {
    const desde = e[o];
    if (desde === '' || desde[0] === '#') continue;
    const bola = desde[desde.length - 1];
    const mono = desde === bola.repeat(desde.length);
    let grupo = 0;
    while (grupo < desde.length && desde[desde.length - 1 - grupo] === bola) grupo++;
    for (let d = 0; d < e.length; d++) {
      if (d === o) continue;
      const hacia = e[d];
      if (hacia[0] === '#') continue;
      const tope = hacia[hacia.length - 1];
      let nuevo = null;
      let quitar = 1;
      let prioridad = 0;
      if (hacia === '' || tope === bola) {
        if (hacia === '' && mono) continue;
        const libres = CAP - hacia.length;
        if (libres <= 0) continue;
        quitar = Math.min(grupo, libres);
        nuevo = hacia + bola.repeat(quitar);
        prioridad = hacia === '' ? 0 : hacia === bola.repeat(hacia.length) ? 3 : 1;
      } else if (bola === bola.toUpperCase() && tope === tope.toUpperCase()) {
        const r = buscarFusion(cod.colorDe.get(bola.toLowerCase()), cod.colorDe.get(tope.toLowerCase()));
        if (!r) continue;
        nuevo = hacia.slice(0, -1) + cod.letra(r);
        prioridad = 2;
      } else continue;
      const s = [...e];
      s[o] = desde.slice(0, -quitar);
      s[d] = nuevo.length === CAP && nuevo === nuevo[0].repeat(CAP) && nuevo[0] === nuevo[0].toLowerCase() ? '#' + nuevo[0] : nuevo;
      res.push({ e: s, prioridad });
    }
  }
  return res;
}

export const ganado = (e, base) => base.every((l) => e.includes('#' + l));

// DFS con prioridades (como el juego); devuelve el camino de estados o null
// `info` (opcional) recibe los nodos explorados: mide el esfuerzo de búsqueda
export function resolver(inicio, cod, base, limite = 40000, info = {}) {
  const clave = (e) => [...e].sort().join('|');
  const padre = new Map([[clave(inicio), null]]);
  const estados = new Map([[clave(inicio), inicio]]);
  const pila = [inicio];
  let nodos = 0;
  while (pila.length) {
    const e = pila.pop();
    if (ganado(e, base)) {
      const camino = [];
      let k = clave(e);
      while (k) {
        camino.unshift(estados.get(k));
        k = padre.get(k);
      }
      return camino;
    }
    info.nodos = ++nodos;
    if (nodos > limite) return null;
    const hijos = vecinos(e, cod).sort((a, b) => a.prioridad - b.prioridad);
    for (const h of hijos) {
      const k = clave(h.e);
      if (padre.has(k)) continue;
      padre.set(k, clave(e));
      estados.set(k, h.e);
      pila.push(h.e);
    }
  }
  return null;
}

export function progreso(e, base) {
  let bien = 0;
  for (const l of base) {
    let mejor = 0;
    for (const t of e) {
      if (t === '#' + l) mejor = CAP;
      else if (t[0] === l) {
        let n = 0;
        while (n < t.length && t[n] === l) n++;
        mejor = Math.max(mejor, n);
      }
    }
    bien += mejor;
  }
  return bien;
}

export function soltar(e, i, letra) {
  const s = [...e];
  const t = s[i] + letra;
  s[i] = t.length === CAP && t === letra.repeat(CAP) ? '#' + letra : t;
  return s;
}

// Estado inicial de un nivel generado
export function codificarNivel(nivel, cod) {
  return nivel.tubos.map((t) => t.bolas.map((b) => (b.ingrediente ? cod.letra(b.color).toUpperCase() : cod.letra(b.color))).join(''));
}

// Lluvia como en el juego (GameScene): empieza al llegar al umbral del plan, trae sus tubos vacíos,
// suena la alerta (2,6 s) y las gotas caen según el plan; cada gota va a un tubo al azar entre los
// que dejan el nivel con solución («lluvia justa»); si no hay ninguno, espera 700 ms hasta que lo
// haya. (En el juego, solo si el móvil no llega a calcularlo a tiempo varias veces seguidas cae al
// azar; aquí el cálculo nunca se queda sin tiempo.)
export const ALERTA_MS = 2600;
export function crearLluvia(plan, cod, base, rnd = Math.random) {
  const gotas = plan.gotas.map((g) => ({ letra: cod.letra(g.color), esperaMs: g.esperaMs }));
  let proxima = Infinity;
  let iniciada = false;
  return {
    umbral: plan.umbral,
    iniciada: () => iniciada,
    pendientes: () => gotas.length,
    // Devuelve el tablero con los tubos de la lluvia añadidos
    iniciar(e, t) {
      iniciada = true;
      proxima = t + ALERTA_MS + (gotas[0]?.esperaMs ?? 0);
      return [...e, ...Array(plan.tubosExtra).fill('')];
    },
    // Suelta las gotas que tocan hasta el instante t
    tick(e, t) {
      let cayo = false;
      while (gotas.length && t >= proxima) {
        const conHueco = e.map((_, i) => i).filter((i) => e[i][0] !== '#' && e[i].length < CAP);
        if (!conHueco.length) return { e, cayo, desborde: true };
        conHueco.sort(() => rnd() - 0.5);
        const letra = gotas[0].letra;
        const segura = conHueco.find((i) => resolver(soltar(e, i, letra), cod, base, 8000));
        if (segura === undefined && resolver(e, cod, base, 8000)) {
          proxima += 700;
          break;
        }
        e = soltar(e, segura ?? conHueco[0], letra);
        gotas.shift();
        cayo = true;
        if (gotas.length) proxima += gotas[0].esperaMs;
      }
      return { e, cayo, desborde: false };
    },
  };
}
