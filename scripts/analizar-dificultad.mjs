#!/usr/bin/env node
// Análisis estadístico de la dificultad: `npm run analizar` (opcional: niveles=60 muestras=20).
//
// Para cada nivel genera `muestras` niveles reales y mide:
//  - resoluble: el solucionador encuentra solución sin habilidades (debe ser 100 %);
//  - movimientos de la solución y esfuerzo de búsqueda (nodos explorados, escala log);
//  - ramificación: jugadas posibles de media en cada turno;
//  - éxito de un jugador casual (sin lluvia): suele hacer la jugada «obvia» (sobre su color, a una
//    columna de su color), a veces una al azar, sin repetir estados. Es el mejor indicador de lo
//    difícil que se siente un nivel;
//  - niebla (bolas ocultas) y ritmo de la lluvia.
// Combina todo en un índice 0–100 y calcula tendencia (Spearman, pendiente), retrocesos y mesetas.
// Escribe docs/analisis-dificultad.md y docs/analisis-dificultad.svg.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CAP, RAIZ, cargarJuego, codificarNivel, crearCodigo, crearLluvia, ganado, progreso, resolver, vecinos } from './lib/juego.mjs';

const { generarNivel, configNivel, ORDEN_COLORES, colorNuevo, planificarLluvia } = await cargarJuego();

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.split('=')));
const NIVELES = Number(args.niveles ?? 60);
const MUESTRAS = Number(args.muestras ?? 20);
const INTENTOS_CASUAL = 8;
const PROB_OBVIA = Number(args.obvia ?? 0.6); // probabilidad de hacer la jugada «obvia»
const MS_JUGADA = Number(args.ms ?? 1500); // tiempo por jugada del jugador casual
const MAX_JUGADAS_CASUAL = Number(args.jugadas ?? 300);

// Generador pseudoaleatorio con semilla: el análisis da lo mismo cada vez que se ejecuta
let semilla = 12345;
const azar = () => {
  semilla = (semilla + 0x6d2b79f5) >>> 0;
  let t = semilla;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const clave = (e) => [...e].sort().join('|');

// Jugador casual con lluvia y tiempo real (como una persona): una jugada cada MS_JUGADA, suele
// hacer la jugada «obvia» y a veces una cualquiera, sin memoria de posiciones (solo evita deshacer
// su última jugada). La lluvia empieza al 35 % del nivel y es «justa», como en el juego. Pierde si
// la lluvia no encuentra hueco, si se queda sin jugadas o tras MAX_JUGADAS_CASUAL jugadas.
function jugadorCasual(inicio, cod, base, nivel) {
  let e = inicio;
  let anterior = null;
  const lluvia = crearLluvia(planificarLluvia(nivel.config, nivel.coloresLluvia, azar), cod, base, azar);
  const inicioBien = progreso(e, base);
  const porHacer = CAP * base.length - inicioBien;
  let t = 0;
  for (let j = 0; j < MAX_JUGADAS_CASUAL; j++) {
    const r = lluvia.tick(e, t);
    if (r.desborde) return false;
    e = r.e;
    if (ganado(e, base)) return true;
    const claveAnterior = anterior && clave(anterior);
    const opciones = vecinos(e, cod).filter((v) => clave(v.e) !== claveAnterior);
    if (!opciones.length) return false;
    let elegida;
    if (azar() < PROB_OBVIA) {
      const mejor = Math.max(...opciones.map((o) => o.prioridad));
      const buenas = opciones.filter((o) => o.prioridad === mejor);
      elegida = buenas[Math.floor(azar() * buenas.length)];
    } else {
      elegida = opciones[Math.floor(azar() * opciones.length)];
    }
    anterior = e;
    e = elegida.e;
    t += MS_JUGADA;
    if (!lluvia.iniciada() && lluvia.pendientes() && (progreso(e, base) - inicioBien) / porHacer >= lluvia.umbral) e = lluvia.iniciar(e, t);
  }
  return ganado(e, base);
}

const media = (l) => l.reduce((a, b) => a + b, 0) / (l.length || 1);
const desviacion = (l) => Math.sqrt(media(l.map((x) => (x - media(l)) ** 2)));

function rangos(l) {
  const orden = l.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const r = Array(l.length);
  for (let i = 0; i < orden.length; ) {
    let j = i;
    while (j + 1 < orden.length && orden[j + 1][0] === orden[i][0]) j++;
    for (let k = i; k <= j; k++) r[orden[k][1]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return r;
}
function pearson(x, y) {
  const mx = media(x);
  const my = media(y);
  const num = x.reduce((a, xi, i) => a + (xi - mx) * (y[i] - my), 0);
  const den = Math.sqrt(x.reduce((a, xi) => a + (xi - mx) ** 2, 0) * y.reduce((a, yi) => a + (yi - my) ** 2, 0));
  return den ? num / den : 0;
}
const spearman = (x, y) => pearson(rangos(x), rangos(y));
function pendiente(x, y) {
  const mx = media(x);
  const my = media(y);
  return x.reduce((a, xi, i) => a + (xi - mx) * (y[i] - my), 0) / x.reduce((a, xi) => a + (xi - mx) ** 2, 0);
}

// ───────────── Medición ─────────────
const filas = [];
let resolubles = 0;
let total = 0;
const inicio = Date.now();
for (let n = 1; n <= NIVELES; n++) {
  const c = configNivel(n);
  const movs = [];
  const nodos = [];
  const ramas = [];
  const ocultas = [];
  let exitos = 0;
  for (let m = 0; m < MUESTRAS; m++) {
    const nivel = generarNivel(n, azar);
    const cod = crearCodigo();
    const base = nivel.coloresBase.map((col) => cod.letra(col));
    const e0 = codificarNivel(nivel, cod);
    const info = {};
    const camino = resolver(e0, cod, base, 300000, info);
    total++;
    if (camino) {
      resolubles++;
      movs.push(camino.length - 1);
      nodos.push(Math.log10(info.nodos));
      ramas.push(media(camino.slice(0, -1).map((e) => vecinos(e, cod).length)));
    }
    const bolas = nivel.tubos.flatMap((t) => t.bolas);
    ocultas.push(bolas.filter((b) => b.oculta).length / bolas.length);
    for (let k = 0; k < INTENTOS_CASUAL; k++) if (jugadorCasual(e0, cod, base, nivel)) exitos++;
  }
  filas.push({
    n,
    colores: c.colores,
    paleta: c.desbloqueados,
    tubos: `${c.colores + c.tubosVacios}+${c.tubosLluvia}`,
    fusiones: c.fusiones,
    lluvia: c.lotesLluvia,
    intervalo: c.intervaloLluviaMs / 1000,
    nuevo: colorNuevo(n),
    bloque: c.bloque,
    dificil: c.dificil,
    movs: media(movs),
    movsDe: desviacion(movs),
    nodos: media(nodos),
    rama: media(ramas),
    casual: exitos / (MUESTRAS * INTENTOS_CASUAL),
    niebla: media(ocultas),
    ritmo: (c.lotesLluvia * 4) / (c.intervaloLluviaMs / 1000), // bolas de lluvia por segundo de intervalo
  });
}

// ───────────── Índice compuesto (0–100) ─────────────
const norm = (clave) => {
  const v = filas.map((f) => f[clave]);
  const min = Math.min(...v);
  const max = Math.max(...v);
  return (x) => (max > min ? (x - min) / (max - min) : 0);
};
const nMovs = norm('movs');
const nNodos = norm('nodos');
const nNiebla = norm('niebla');
const nRitmo = norm('ritmo');
for (const f of filas) {
  f.indice = 100 * (0.25 * nMovs(f.movs) + 0.15 * nNodos(f.nodos) + 0.3 * (1 - f.casual) + 0.15 * nNiebla(f.niebla) + 0.15 * nRitmo(f.ritmo));
}

// ───────────── Estadística ─────────────
const ns = filas.map((f) => f.n);
const indices = filas.map((f) => f.indice);
const rho = spearman(ns, indices);
const rhoCasual = spearman(ns, filas.map((f) => f.casual));
// Retroceso: el índice baja >5 puntos respecto al nivel anterior (salvo justo tras un nivel difícil,
// que es más difícil a propósito)
const retrocesos = filas.filter((f, i) => i > 0 && !filas[i - 1].dificil && f.indice < filas[i - 1].indice - 5);
const tramos = [];
for (let a = 1; a <= NIVELES; a += 10) {
  const t = filas.filter((f) => f.n >= a && f.n < a + 10);
  if (!t.length) continue;
  tramos.push({
    nombre: `${a}–${Math.min(a + 9, NIVELES)}`,
    indice: media(t.map((f) => f.indice)),
    indiceDe: desviacion(t.map((f) => f.indice)),
    casual: media(t.map((f) => f.casual)),
    movs: media(t.map((f) => f.movs)),
    pend: t.length > 1 ? pendiente(t.map((f) => f.n), t.map((f) => f.indice)) : 0,
  });
}
const meseta = tramos.filter((t) => Math.abs(t.pend) < 0.3).map((t) => t.nombre);

// Por bloque (de un desbloqueo al siguiente): índice medio de los niveles normales y del difícil
const bloques = [];
for (const b of [...new Set(filas.map((f) => f.bloque))]) {
  const f = filas.filter((x) => x.bloque === b);
  const normales = f.filter((x) => !x.dificil);
  const dificil = f.find((x) => x.dificil);
  bloques.push({
    bloque: b,
    niveles: `${f[0].n}–${f[f.length - 1].n}`,
    normal: media(normales.map((x) => x.indice)),
    casualNormal: media(normales.map((x) => x.casual)),
    dificil: dificil ? dificil.indice : null,
    casualDificil: dificil ? dificil.casual : null,
    nivelDificil: dificil?.n ?? null,
  });
}
const completos = bloques.filter((b) => b.dificil !== null && b.normal > 0);
const rhoBloques = spearman(bloques.map((b) => b.bloque), bloques.map((b) => b.normal));
const dificilesMayores = completos.filter((b) => b.dificil > b.normal).length;
const ventajaDificil = media(completos.map((b) => b.dificil - b.normal));
const segundos = ((Date.now() - inicio) / 1000).toFixed(0);

// ───────────── Informe ─────────────
const fmt = (x, d = 1) => x.toFixed(d).replace('.', ',');
const pct = (x) => `${Math.round(x * 100)} %`;
let md = `# Análisis de dificultad

Generado con \`npm run analizar\` (niveles 1–${NIVELES}, ${MUESTRAS} niveles por número, ${INTENTOS_CASUAL} partidas
de jugador casual por nivel; semilla fija). No editar a mano: vuelve a ejecutar el script.

## Resumen

- **Resolubles sin habilidades**: ${resolubles}/${total} (${pct(resolubles / total)}). Con lluvia, \`npm run simular\`.
- **Tendencia**: correlación de Spearman nivel ↔ índice **ρ = ${fmt(rho, 2)}** (1 = sube siempre);
  nivel ↔ éxito del jugador casual ρ = ${fmt(rhoCasual, 2)} (negativa = cada vez gana menos).
- **Retrocesos** (el índice baja más de 5 puntos respecto al nivel anterior): ${retrocesos.length ? retrocesos.map((f) => f.n).join(', ') : 'ninguno'}.
- **Mesetas** (tramos de 10 niveles con pendiente casi nula): ${meseta.length ? meseta.join(', ') : 'ninguna'}.
- **Por bloque** (de un desbloqueo al siguiente): bloque ↔ índice medio de sus niveles normales
  ρ = ${fmt(rhoBloques, 2)}. El **nivel difícil** supera a la media de su bloque en
  ${dificilesMayores}/${completos.length} bloques, de media por **${fmt(ventajaDificil)} puntos**.

Índice = 25 % movimientos de la solución + 15 % esfuerzo de búsqueda + 30 % fracaso del jugador
casual + 15 % niebla + 15 % ritmo de la lluvia (cada medida normalizada entre el mínimo y el máximo
de los niveles analizados).

![Índice de dificultad por nivel](analisis-dificultad.svg)

## Por bloques

| Bloque | Niveles | Índice niveles normales | Éxito casual normales | Nivel difícil | Índice difícil | Éxito casual difícil |
| --- | --- | --- | --- | --- | --- | --- |
${bloques.map((b) => `| ${b.bloque} | ${b.niveles} | ${fmt(b.normal)} | ${pct(b.casualNormal)} | ${b.nivelDificil ?? '—'} | ${b.dificil === null ? '—' : fmt(b.dificil)} | ${b.casualDificil === null ? '—' : pct(b.casualDificil)} |`).join('\n')}

## Por tramos

| Niveles | Índice (media ± desv.) | Pendiente (puntos/nivel) | Éxito casual | Movimientos |
| --- | --- | --- | --- | --- |
${tramos.map((t) => `| ${t.nombre} | ${fmt(t.indice)} ± ${fmt(t.indiceDe)} | ${fmt(t.pend, 2)} | ${pct(t.casual)} | ${fmt(t.movs)} |`).join('\n')}

## Por nivel

| Nivel | Bloque | Colores | Paleta | Tubos | Fusiones | Lluvia | Intervalo | Movimientos | log₁₀ nodos | Ramificación | Éxito casual | Niebla | Índice |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${filas
  .map(
    (f) =>
      `| ${f.dificil ? `**${f.n}** ⚠` : f.n} | ${f.bloque} | ${f.colores} | ${f.paleta}${f.nuevo ? ` (+${f.nuevo})` : ''} | ${f.tubos} | ${f.fusiones} | ${f.lluvia} | ${fmt(f.intervalo, 2)} s | ${fmt(f.movs)} ± ${fmt(f.movsDe)} | ${fmt(f.nodos, 2)} | ${fmt(f.rama)} | ${pct(f.casual)} | ${pct(f.niebla)} | ${fmt(f.indice)} |`,
  )
  .join('\n')}
`;
writeFileSync(join(RAIZ, 'docs', 'analisis-dificultad.md'), md);

// Gráfica SVG: índice (línea) y éxito del jugador casual (barras)
const W = 900;
const H = 340;
const m = { i: 50, d: 20, a: 30, b: 40 };
const x = (n) => m.i + ((n - 1) / Math.max(1, NIVELES - 1)) * (W - m.i - m.d);
const y = (v) => H - m.b - (v / 100) * (H - m.a - m.b);
const barras = filas
  .map((f) => `<rect x="${x(f.n) - 4}" y="${y(f.casual * 100)}" width="8" height="${H - m.b - y(f.casual * 100)}" fill="#81d4fa" opacity="0.35"/>`)
  .join('');
const linea = filas.map((f) => `${x(f.n).toFixed(1)},${y(f.indice).toFixed(1)}`).join(' ');
const puntosDificiles = filas
  .filter((f) => f.dificil)
  .map((f) => `<circle cx="${x(f.n).toFixed(1)}" cy="${y(f.indice).toFixed(1)}" r="4.5" fill="#ff7043" stroke="#1d1d2b" stroke-width="1.5"/>`)
  .join('');
const ejes = [0, 25, 50, 75, 100]
  .map((v) => `<line x1="${m.i}" x2="${W - m.d}" y1="${y(v)}" y2="${y(v)}" stroke="#44445e"/><text x="${m.i - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`)
  .join('');
const marcas = filas
  .filter((f) => f.n === 1 || f.n % 10 === 0)
  .map((f) => `<text x="${x(f.n)}" y="${H - m.b + 18}" text-anchor="middle">${f.n}</text>`)
  .join('');
const desbloqueos = filas
  .filter((f) => f.nuevo)
  .map((f) => `<line x1="${x(f.n)}" x2="${x(f.n)}" y1="${m.a}" y2="${H - m.b}" stroke="#ffd54f" stroke-dasharray="3 4" opacity="0.5"/>`)
  .join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="sans-serif" font-size="12" fill="#aaaacc">
<rect width="${W}" height="${H}" fill="#1d1d2b"/>${ejes}${desbloqueos}${barras}
<polyline points="${linea}" fill="none" stroke="#4fc3f7" stroke-width="3"/>${puntosDificiles}${marcas}
<text x="${W / 2}" y="18" text-anchor="middle" fill="#ffffff" font-size="14">Índice (línea) · niveles difíciles (puntos naranjas) · éxito casual % (barras) · desbloqueos (amarillo)</text>
<text x="${W / 2}" y="${H - 6}" text-anchor="middle">Nivel</text>
</svg>
`;
writeFileSync(join(RAIZ, 'docs', 'analisis-dificultad.svg'), svg);

console.log(`Analizados ${total} niveles en ${segundos} s`);
console.log(`Resolubles sin habilidades: ${resolubles}/${total}`);
console.log(`Spearman nivel↔índice ρ = ${rho.toFixed(3)} · nivel↔éxito casual ρ = ${rhoCasual.toFixed(3)}`);
console.log(`Bloques: ρ bloque↔índice normal = ${rhoBloques.toFixed(3)} · difícil > media del bloque en ${dificilesMayores}/${completos.length} (+${ventajaDificil.toFixed(1)} puntos de media)`);
console.log(`Retrocesos (>5 puntos): ${retrocesos.map((f) => f.n).join(', ') || 'ninguno'} · Mesetas: ${meseta.join(', ') || 'ninguna'}`);
console.log('Tramo     índice          pendiente  éxito casual  movimientos');
for (const t of tramos) {
  console.log(`${t.nombre.padEnd(9)} ${t.indice.toFixed(1).padStart(5)} ± ${t.indiceDe.toFixed(1).padEnd(5)}  ${t.pend.toFixed(2).padStart(6)}     ${pct(t.casual).padStart(5)}        ${t.movs.toFixed(1)}`);
}
console.log('Informe: docs/analisis-dificultad.md');
process.exit(resolubles === total ? 0 : 1);
