#!/usr/bin/env node
// Mide la solubilidad de los niveles SIN habilidades: `npm run simular` (opcional: niveles=50 pruebas=10).
//
// Compila la lógica pura (src/juego) a una carpeta temporal y juega cada nivel con un jugador
// perfecto que tarda un tiempo real por jugada (rápido 0,8 s, normal 1,5 s, lento 2,5 s) mientras
// cae la lluvia de hielo como en el juego (los tubos helados no se tocan hasta que se derriten).
// Comprueba además que cada nivel generado tiene solución sin lluvia.
// Termina con error si algún perfil no llega al 100 %: úsalo al cambiar la dificultad.
import { CAP, cargarJuego, codificarNivel, crearCodigo, crearLluvia, ganado, progreso, quitarHielo, resolver, vecinos } from './lib/juego.mjs';

const { generarNivel, configNivel, colorNuevo, ORDEN_COLORES, COLORES_DE_SALIDA, nivelDesbloqueo, COLORES, SALTO_MINIMO, SALTO_MAXIMO, planificarLluvia } = await cargarJuego();

// Orden de desbloqueo (lo pidió el usuario): todos los colores una vez, se empieza con 4 básicos,
// después el resto de básicos y al final los especiales; cada desbloqueo llega entre 5 y 12 niveles
// después del anterior (nunca menos); los desbloqueos siguen ORDEN_COLORES y el color nuevo sale siempre en su nivel. Además,
// los colores a ordenar siempre están desbloqueados y la curva de colores no baja nunca.
{
  const errores = [];
  if (ORDEN_COLORES.length !== COLORES.length || new Set(ORDEN_COLORES).size !== COLORES.length) errores.push('ORDEN_COLORES no tiene cada color una vez');
  const ESPECIALES = ['azulDivino', 'plata', 'jade', 'amatista', 'esmeralda', 'oro', 'carmesi'];
  if (COLORES_DE_SALIDA !== 4) errores.push(`se empieza con ${COLORES_DE_SALIDA} colores (deben ser 4)`);
  const primerEspecial = ORDEN_COLORES.findIndex((c) => ESPECIALES.includes(c));
  if (primerEspecial < COLORES_DE_SALIDA || ORDEN_COLORES.slice(primerEspecial).some((c) => !ESPECIALES.includes(c))) errores.push('los especiales no van después de todos los básicos');
  let anterior = 0;
  for (let n = 1; n <= 200; n++) {
    const c = configNivel(n);
    if (c.colores < anterior) errores.push(`el nivel ${n} tiene menos colores que el anterior`);
    anterior = c.colores;
    if (c.colores + (c.fusiones > 0 ? 2 : 0) > c.desbloqueados) errores.push(`el nivel ${n} necesita colores no desbloqueados`);
  }
  const niveles = ORDEN_COLORES.slice(COLORES_DE_SALIDA).map(nivelDesbloqueo);
  const media = (niveles.at(-1) - 1) / niveles.length;
  if (SALTO_MINIMO !== 5 || SALTO_MAXIMO !== 12) errores.push('los límites de salto no son 5–12');
  niveles.forEach((n, i) => {
    const salto = n - (i ? niveles[i - 1] : 1);
    if (salto < SALTO_MINIMO || salto > SALTO_MAXIMO) errores.push(`${ORDEN_COLORES[COLORES_DE_SALIDA + i]} llega ${salto} niveles después del anterior (debe ser 5–12)`);
  });
  const secuencia = [];
  for (let n = 2; n <= 200; n++) {
    const c = colorNuevo(n);
    if (c) secuencia.push([n, c]);
  }
  if (secuencia.length !== ORDEN_COLORES.length - COLORES_DE_SALIDA || !secuencia.every(([, c], i) => c === ORDEN_COLORES[COLORES_DE_SALIDA + i])) errores.push('los desbloqueos no siguen ORDEN_COLORES');
  for (const [n, c] of secuencia) for (let k = 0; k < 30; k++) if (!generarNivel(n).coloresBase.includes(c)) errores.push(`el nivel ${n} no trae su color nuevo (${c})`);
  console.log('Orden de desbloqueo:', secuencia.map(([n, c]) => `${n}:${c}`).join(' '), `(media: uno cada ${media.toFixed(1)} niveles)`);
  if (errores.length) {
    console.error('ERROR en el orden:', [...new Set(errores)].join('; '));
    process.exit(1);
  }
  console.log('Orden de desbloqueo correcto\n');
}

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.split('=')));
const NIVELES = Number(args.niveles ?? 50);
const PRUEBAS = Number(args.pruebas ?? 10);


// Una partida: jugada cada `msJugada` mientras llueve hielo. El jugador perfecto planea con el
// hielo como si no se fuera a derretir; si así no hay plan pero sin hielo sí, hace una jugada que
// no estropee nada (y deja que se derrita); si no tiene ninguna, el hielo se derrite ya (como en el
// juego). Pierde si la partida queda sin solución (contando que el hielo se derrite).
function partida(nivel, cod, base, msJugada) {
  let e = codificarNivel(nivel, cod);
  const lluvia = crearLluvia(planificarLluvia(nivel.config, nivel.coloresLluvia), cod, base);
  const inicioBien = progreso(e, base);
  const porHacer = CAP * base.length - inicioBien;
  if (!resolver(e, cod, base)) return 'sinSolucion';
  let plan = null;
  let paso = 1;
  let t = 0;
  for (let jugadas = 0; jugadas < 400; jugadas++) {
    const r = lluvia.tick(e, t);
    if (r.cayo) {
      e = r.e;
      plan = null;
    }
    if (ganado(e, base)) return 'gana';
    if (!plan) {
      plan = resolver(e, cod, base);
      paso = 1;
    }
    if (plan && paso < plan.length) {
      e = plan[paso++];
    } else {
      plan = null;
      if (!resolver(quitarHielo(e), cod, base)) return 'sinSolucion';
      const espera = vecinos(e, cod).find((v) => resolver(quitarHielo(v.e), cod, base, 8000));
      if (espera) e = espera.e;
      else if (lluvia.hayHielo()) {
        e = lluvia.derretirUno(e);
        continue; // derretir no es una jugada
      } else return 'atascado';
    }
    t += msJugada;
    const d = lluvia.trasJugada(e);
    if (d.cambio) {
      e = d.e;
      plan = null;
    }
    if (ganado(e, base)) return 'gana';
    if (!lluvia.iniciada() && lluvia.pendientes() && (progreso(e, base) - inicioBien) / porHacer >= lluvia.umbral) e = lluvia.iniciar(e, t);
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
console.log('nivel colores tubos lluvia       | rápido | normal | lento   (partidas ganadas con lluvia de hielo)');
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
        const e0 = codificarNivel(nivel, cod);
        totales.sinLluvia.total++;
        if (resolver(e0, cod, base, 200000)) totales.sinLluvia.gana++;
      }
      if (partida(nivel, cod, base, ms) === 'gana') gana++;
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
