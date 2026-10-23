#!/usr/bin/env node
// Mide la solubilidad de los niveles SIN habilidades: `npm run simular` (opcional: niveles=50 pruebas=10).
//
// Compila la lógica pura (src/juego) a una carpeta temporal y juega cada nivel con un jugador
// perfecto que tarda un tiempo real por jugada (rápido 0,8 s, normal 1,5 s, lento 2,5 s) mientras
// cae la lluvia, con la misma regla de "lluvia justa" que el juego (GameScene.elegirTuboGota).
// Comprueba además que cada nivel generado tiene solución sin lluvia.
// Termina con error si algún perfil no llega al 100 %: úsalo al cambiar la dificultad.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const salida = mkdtempSync(join(tmpdir(), 'odi-sort-sim-'));
const fuentes = ['modelo', 'colores', 'niveles', 'solucionador'].map((f) => join(RAIZ, 'src', 'juego', f + '.ts'));
execFileSync(join(RAIZ, 'node_modules', '.bin', 'tsc'), ['--ignoreConfig', ...fuentes, '--outDir', salida, '--module', 'esnext', '--target', 'es2022', '--moduleResolution', 'bundler', '--skipLibCheck'], { stdio: 'inherit' });
for (const f of readdirSync(salida)) {
  const ruta = join(salida, f);
  writeFileSync(ruta, readFileSync(ruta, 'utf8').replace(/from '(\.\/[a-zA-Z]+)'/g, "from '$1.js'"));
}
writeFileSync(join(salida, 'package.json'), '{"type":"module"}');
const { generarNivel, configNivel, colorNuevo, ORDEN_COLORES } = await import(pathToFileURL(join(salida, 'niveles.js')).href);
const { buscarFusion, COLORES } = await import(pathToFileURL(join(salida, 'colores.js')).href);

// Orden de desbloqueo: todos los colores una vez, Azul divino el 6.º (lo pidió el usuario), los
// desbloqueos siguen ORDEN_COLORES y el color nuevo sale siempre en su nivel
{
  const errores = [];
  if (ORDEN_COLORES.length !== COLORES.length || new Set(ORDEN_COLORES).size !== COLORES.length) errores.push('ORDEN_COLORES no tiene cada color una vez');
  if (ORDEN_COLORES.indexOf('azulDivino') !== 5) errores.push('Azul divino no es el 6.º');
  const secuencia = [];
  for (let n = 2; n <= 200; n++) {
    const c = colorNuevo(n);
    if (c) secuencia.push([n, c]);
  }
  if (secuencia.length !== ORDEN_COLORES.length - 5 || !secuencia.every(([, c], i) => c === ORDEN_COLORES[5 + i])) errores.push('los desbloqueos no siguen ORDEN_COLORES');
  for (const [n, c] of secuencia) for (let k = 0; k < 30; k++) if (!generarNivel(n).coloresBase.includes(c)) errores.push(`el nivel ${n} no trae su color nuevo (${c})`);
  console.log('Orden de desbloqueo:', secuencia.map(([n, c]) => `${n}:${c}`).join(' '));
  if (errores.length) {
    console.error('ERROR en el orden:', [...new Set(errores)].join('; '));
    process.exit(1);
  }
  console.log('Orden de desbloqueo correcto\n');
}

const CAP = 4;
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.split('=')));
const NIVELES = Number(args.niveles ?? 50);
const PRUEBAS = Number(args.pruebas ?? 10);

function crearCodigo() {
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
function vecinos(e, cod) {
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

const ganado = (e, base) => base.every((l) => e.includes('#' + l));

// DFS con prioridades (como el juego); devuelve el camino de estados o null
function resolver(inicio, cod, base, limite = 40000) {
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
    if (++nodos > limite) return null;
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

function progreso(e, base) {
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

function soltar(e, i, letra) {
  const s = [...e];
  const t = s[i] + letra;
  s[i] = t.length === CAP && t === letra.repeat(CAP) ? '#' + letra : t;
  return s;
}

// Una partida: jugada cada `msJugada`; lluvia 'aleatoria' (como ahora) o 'justa'
function partida(nivel, cod, base, msJugada, modoLluvia) {
  let e = nivel.tubos.map((t) => t.bolas.map((b) => (b.ingrediente ? cod.letra(b.color).toUpperCase() : cod.letra(b.color))).join(''));
  const lluvia = nivel.coloresLluvia.flatMap((c) => Array(CAP).fill(cod.letra(c)));
  const inicioBien = progreso(e, base);
  const porHacer = CAP * base.length - inicioBien;
  let plan = resolver(e, cod, base);
  if (!plan) return 'sinSolucion';
  let t = 0;
  let proximaGota = Infinity;
  let paso = 1;
  let esperas = 0;
  for (let jugadas = 0; jugadas < 400; jugadas++) {
    // Gotas pendientes hasta este instante
    while (lluvia.length && t >= proximaGota) {
      const conHueco = e.map((x, i) => i).filter((i) => e[i][0] !== '#' && e[i].length < CAP);
      if (!conHueco.length) return 'desborde';
      conHueco.sort(() => Math.random() - 0.5);
      let elegido = conHueco[0];
      if (modoLluvia === 'justa') {
        const bueno = conHueco.find((i) => resolver(soltar(e, i, lluvia[0]), cod, base, 8000));
        if (bueno !== undefined) elegido = bueno;
        else if (resolver(e, cod, base, 8000)) {
          // Como el juego: ningún tubo seguro y aún hay solución → la gota espera 700 ms
          proximaGota = t + 700;
          esperas++;
          break;
        }
      }
      e = soltar(e, elegido, lluvia.shift());
      proximaGota += nivel.config.intervaloLluviaMs;
      plan = resolver(e, cod, base);
      paso = 1;
      if (!plan) return 'atascado';
    }
    if (ganado(e, base)) return 'gana';
    if (paso >= plan.length) return 'atascado';
    e = plan[paso++];
    t += msJugada;
    if (ganado(e, base)) return 'gana';
    if (proximaGota === Infinity && lluvia.length && (progreso(e, base) - inicioBien) / porHacer >= 0.35) {
      proximaGota = t + 2600;
    }
  }
  return 'atascado';
}

const perfiles = [
  ['rápido', 800],
  ['normal', 1500],
  ['lento', 2500],
];
const totales = { sinLluvia: { gana: 0, total: 0 } };
console.log(`Niveles 1-${NIVELES}, ${PRUEBAS} partidas por perfil`);
console.log('nivel colores tubos lluvia       | rápido | normal | lento   (partidas ganadas con lluvia justa)');
for (let n = 1; n <= NIVELES; n++) {
  const c = configNivel(n);
  const fila = [];
  for (const [nombre, ms] of perfiles) {
    let gana = 0;
    for (let p = 0; p < PRUEBAS; p++) {
      const nivel = generarNivel(n);
      const cod = crearCodigo();
      const base = nivel.coloresBase.map((col) => cod.letra(col));
      if (nombre === 'rápido') {
        const e0 = nivel.tubos.map((t) => t.bolas.map((b) => (b.ingrediente ? cod.letra(b.color).toUpperCase() : cod.letra(b.color))).join(''));
        totales.sinLluvia.total++;
        if (resolver(e0, cod, base, 200000)) totales.sinLluvia.gana++;
      }
      if (partida(nivel, cod, base, ms, 'justa') === 'gana') gana++;
    }
    totales[nombre] ??= { gana: 0, total: 0 };
    totales[nombre].gana += gana;
    totales[nombre].total += PRUEBAS;
    fila.push(`${String(Math.round((gana / PRUEBAS) * 100)).padStart(5)}%`);
  }
  const tubos = c.colores + c.tubosVacios;
  console.log(`${String(n).padStart(5)} ${String(c.colores).padStart(7)} ${String(tubos).padStart(5)} ${c.lotesLluvia}x${String(c.intervaloLluviaMs).padStart(4)} ms   | ${fila.join(' | ')}`);
}
console.log('');
let todoBien = true;
for (const [k, v] of Object.entries(totales)) {
  const pct = (v.gana / v.total) * 100;
  if (v.gana < v.total) todoBien = false;
  console.log(`${k.padEnd(10)} ${v.gana}/${v.total} = ${pct.toFixed(1)} %`);
}
process.exit(todoBien ? 0 : 1);
