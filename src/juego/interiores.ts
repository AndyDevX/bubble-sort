import type { ColorId } from './colores';

// Interiores propios de los colores especiales. Cada uno imita una imagen de referencia del
// usuario; las paletas (rgb de las rampas) se midieron en esas imágenes (percentiles 5–99 %).
// Todo es determinista (semilla fija): todas las bolas de un color son iguales.
// El vidrio de encima (reflejos, filo) lo pone `dibujarEsfera` en texturas.ts.

export type Interior = (ctx: CanvasRenderingContext2D, c: number, r: number) => void;

type Rgb = [number, number, number];

// ───────────── Utilidades ─────────────

function azar(semilla: number) {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(x: number, y: number, semilla: number): number {
  let h = (x * 374761393 + y * 668265263 + semilla * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const suave = (t: number) => t * t * (3 - 2 * t);

// Ruido de valores suavizado (0..1)
function ruido(x: number, y: number, semilla: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = suave(x - xi);
  const fy = suave(y - yi);
  const a = hash(xi, yi, semilla);
  const b = hash(xi + 1, yi, semilla);
  const c = hash(xi, yi + 1, semilla);
  const d = hash(xi + 1, yi + 1, semilla);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

// Ruido fractal (varias octavas), 0..1
function fbm(x: number, y: number, semilla: number, octavas = 4): number {
  let total = 0;
  let amplitud = 0.5;
  let frecuencia = 1;
  let suma = 0;
  for (let i = 0; i < octavas; i++) {
    total += ruido(x * frecuencia, y * frecuencia, semilla + i * 17) * amplitud;
    suma += amplitud;
    amplitud *= 0.5;
    frecuencia *= 2;
  }
  return total / suma;
}

const limitar = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));

// Rampa de color: paradas [posición 0..1, rgb]
function rampa(paradas: [number, Rgb][], t: number): Rgb {
  t = limitar(t);
  for (let i = 1; i < paradas.length; i++) {
    const [p1, c1] = paradas[i];
    const [p0, c0] = paradas[i - 1];
    if (t <= p1) {
      const k = (t - p0) / (p1 - p0 || 1);
      return [c0[0] + (c1[0] - c0[0]) * k, c0[1] + (c1[1] - c0[1]) * k, c0[2] + (c1[2] - c0[2]) * k];
    }
  }
  return paradas[paradas.length - 1][1];
}

// Pinta cada píxel con una función (x, y en píxeles). Se pinta en un lienzo aparte y se copia con
// drawImage: putImageData ignora el recorte circular de la bola, drawImage lo respeta.
function pintarPixeles(ctx: CanvasRenderingContext2D, color: (x: number, y: number) => Rgb) {
  const { width: ancho, height: alto } = ctx.canvas;
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  const aparte = lienzo.getContext('2d');
  if (!aparte) return;
  const imagen = aparte.createImageData(ancho, alto);
  const d = imagen.data;
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const [r, g, b] = color(x, y);
      const i = (y * ancho + x) * 4;
      d[i] = limitar(r, 0, 255);
      d[i + 1] = limitar(g, 0, 255);
      d[i + 2] = limitar(b, 0, 255);
      d[i + 3] = 255;
    }
  }
  aparte.putImageData(imagen, 0, 0);
  ctx.drawImage(lienzo, 0, 0);
}

// Oscurece el borde: grosor del vidrio (efecto Fresnel)
function bordeVidrio(ctx: CanvasRenderingContext2D, c: number, r: number, alfa: number, tono = '0,0,0') {
  const borde = ctx.createRadialGradient(c, c, r * 0.68, c, c, r);
  borde.addColorStop(0, `rgba(${tono},0)`);
  borde.addColorStop(1, `rgba(${tono},${alfa})`);
  ctx.fillStyle = borde;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

// ───────────── Azul divino: seda azul sobre azul noche ─────────────
// Referencia: fondo ≈ rgb(0,7,49), capas ≈ rgb(1,33,144), filos ≈ rgb(2,52,175), pico ≈ rgb(37,107,228); sin blanco.
const azulDivino: Interior = (ctx, c, r) => {
  const L = ctx.canvas.width;
  const fondo = ctx.createRadialGradient(c - r * 0.15, c - r * 0.1, r * 0.1, c, c, r);
  fondo.addColorStop(0, 'rgb(1,10,60)');
  fondo.addColorStop(0.6, 'rgb(0,7,49)');
  fondo.addColorStop(1, 'rgb(1,3,24)');
  ctx.fillStyle = fondo;
  ctx.fillRect(0, 0, L, L);

  ctx.globalCompositeOperation = 'lighter';
  // Capas en forma de valle: [y izquierda, y del valle, y derecha, grosor de la capa, intensidad]
  const capas: [number, number, number, number, number][] = [
    [-0.05, 0.55, 0.35, 0.3, 0.45],
    [0.2, 0.78, 0.5, 0.28, 1],
    [0.42, 1.0, 0.72, 0.24, 0.55],
    [0.62, 1.18, 0.92, 0.2, 0.3],
  ];
  for (const [yi, yv, yd, grosor, fuerza] of capas) {
    const filo = () => {
      ctx.beginPath();
      ctx.moveTo(-6, yi * L);
      ctx.bezierCurveTo(L * 0.3, yv * L, L * 0.55, yv * L, L + 6, yd * L);
    };
    const capa = ctx.createLinearGradient(0, yv * L * 0.75, 0, (yv + grosor) * L);
    capa.addColorStop(0, `rgba(1,30,140,${0.3 * fuerza})`);
    capa.addColorStop(1, 'rgba(0,10,70,0)');
    ctx.fillStyle = capa;
    filo();
    ctx.lineTo(L + 6, (yd + grosor) * L);
    ctx.bezierCurveTo(L * 0.55, (yv + grosor) * L, L * 0.3, (yv + grosor) * L, -6, (yi + grosor) * L);
    ctx.closePath();
    ctx.fill();
    // Filo: resplandor por capas (ancho y tenue → estrecho y algo más intenso), sin blanco
    for (const [ancho, alfa] of [
      [14, 0.05],
      [8, 0.08],
      [4, 0.14],
      [1.4, 0.42],
    ]) {
      const brillo = ctx.createLinearGradient(0, 0, L, 0);
      brillo.addColorStop(0, `rgba(2,52,175,${alfa * fuerza * 1.6})`);
      brillo.addColorStop(0.4, `rgba(2,52,175,${alfa * fuerza})`);
      brillo.addColorStop(1, `rgba(2,40,150,${alfa * fuerza * 0.3})`);
      ctx.strokeStyle = brillo;
      ctx.lineWidth = ancho;
      filo();
      ctx.stroke();
    }
  }
  const pico = ctx.createRadialGradient(L * 0.18, L * 0.42, 0, L * 0.18, L * 0.42, L * 0.2);
  pico.addColorStop(0, 'rgba(37,107,228,0.35)');
  pico.addColorStop(1, 'rgba(37,107,228,0)');
  ctx.fillStyle = pico;
  ctx.fillRect(0, 0, L, L);
  ctx.globalCompositeOperation = 'source-over';
  bordeVidrio(ctx, c, r, 0.6, '0,0,10');
};

// ───────────── Plata: nebulosa gris con purpurina ─────────────
// Referencia (gris neutro): 5 % ≈ 76, mediana ≈ 134, 95 % ≈ 225, destellos ≈ 248.
const plata: Interior = (ctx, c, r) => {
  pintarPixeles(ctx, (x, y) => {
    // Nubes alargadas en diagonal
    const u = (x + y * 0.6) * 0.03;
    const v = (y - x * 0.4) * 0.05;
    const n = fbm(u, v, 11);
    const g = rampa(
      [
        [0, [70, 70, 74]],
        [0.45, [128, 128, 134]],
        [0.75, [190, 190, 196]],
        [1, [235, 235, 240]],
      ],
      (n - 0.25) * 1.6,
    );
    return g;
  });
  // Purpurina: puntos finos, más densos en las zonas claras
  const rnd = azar(42);
  const L = ctx.canvas.width;
  for (let i = 0; i < 260; i++) {
    const x = rnd() * L;
    const y = rnd() * L;
    const claro = fbm((x + y * 0.6) * 0.03, (y - x * 0.4) * 0.05, 11);
    if (rnd() > claro * 1.3) continue;
    ctx.fillStyle = `rgba(255,255,255,${0.55 + rnd() * 0.45})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.5 + rnd() * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  // Unos pocos destellos más grandes en cruz
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 3; i++) {
    const x = c + (rnd() - 0.5) * r * 1.4;
    const y = c + (rnd() - 0.5) * r * 1.4;
    const t = 1.5 + rnd() * 1.5;
    ctx.beginPath();
    ctx.moveTo(x - t, y);
    ctx.lineTo(x + t, y);
    ctx.moveTo(x, y - t);
    ctx.lineTo(x, y + t);
    ctx.stroke();
  }
  bordeVidrio(ctx, c, r, 0.45);
};

// ───────────── Jade: satén líquido verde azulado ─────────────
// Referencia: oscuro ≈ rgb(1,62,69), medio ≈ rgb(0,139,132), claro ≈ rgb(163,218,208), brillo ≈ rgb(203,230,227).
const jade: Interior = (ctx, c, r) => {
  pintarPixeles(ctx, (x, y) => {
    // Pliegues: ondas diagonales deformadas por ruido (aspecto de tela/líquido)
    // Pliegues largos en diagonal (de abajo a la izquierda hacia arriba a la derecha), apenas
    // deformados: así parecen tela o líquido que fluye y no manchas
    const u = x * 0.8 + y * 0.6; // a lo ancho de los pliegues
    const v = -x * 0.6 + y * 0.8; // a lo largo
    const deformacion = (fbm(u * 0.012, v * 0.03, 23, 3) - 0.5) * 5 + Math.sin(v * 0.05) * 0.8;
    const f = 0.5 + 0.5 * Math.sin(u * 0.075 + deformacion);
    const base = rampa(
      [
        [0, [1, 62, 69]],
        [0.45, [0, 120, 117]],
        [0.75, [0, 150, 140]],
        [0.92, [100, 196, 182]],
        [1, [163, 218, 208]],
      ],
      f,
    );
    // Brillo satinado estrecho en la cresta de cada pliegue
    const brillo = Math.exp(-(((f - 0.975) / 0.045) ** 2)) * 0.95;
    return [base[0] + (203 - base[0]) * brillo, base[1] + (230 - base[1]) * brillo, base[2] + (227 - base[2]) * brillo];
  });
  bordeVidrio(ctx, c, r, 0.45, '0,20,22');
};

// ───────────── Amatista: barras verticales de luz violeta ─────────────
// Referencia: profundo ≈ rgb(71,24,116), medio ≈ rgb(124,71,187), claro ≈ rgb(196,157,231), extremos ≈ rgb(248,209,254).
const amatista: Interior = (ctx, c, r) => {
  const L = ctx.canvas.width;
  const barras = 9;
  const anchoBarra = L / barras;
  const rnd = azar(7);
  const desplazamientos = Array.from({ length: barras }, () => (rnd() - 0.5) * 0.12);
  pintarPixeles(ctx, (x, y) => {
    const indice = Math.min(barras - 1, Math.floor(x / anchoBarra));
    const dentro = (x - indice * anchoBarra) / anchoBarra;
    // Claro arriba y abajo, violeta profundo en el centro (cada barra un poco desplazada)
    const yy = y / L + desplazamientos[indice];
    const vertical = 1 - Math.sin(limitar(yy) * Math.PI) ** 1.4;
    // Cada barra: borde izquierdo algo más oscuro y un brillo suave a la derecha
    const relieve = (dentro - 0.5) * 0.18;
    return rampa(
      [
        [0, [71, 24, 116]],
        [0.35, [124, 71, 187]],
        [0.7, [196, 157, 231]],
        [1, [248, 209, 254]],
      ],
      vertical * 1.05 + relieve + 0.08,
    );
  });
  bordeVidrio(ctx, c, r, 0.4, '30,0,50');
};

// ───────────── Esmeralda: cristal verde con bokeh y destellos ─────────────
// Referencia: oscuro ≈ rgb(41,78,26), medio ≈ rgb(105,159,67), claro ≈ rgb(198,254,152), luz ≈ rgb(237,255,152).
const esmeralda: Interior = (ctx, c, r) => {
  pintarPixeles(ctx, (x, y) => {
    const n = fbm(x * 0.03, y * 0.03, 31);
    return rampa(
      [
        [0, [30, 64, 20]],
        [0.4, [78, 122, 38]],
        [0.65, [120, 175, 75]],
        [1, [198, 254, 152]],
      ],
      (n - 0.2) * 1.5,
    );
  });
  const L = ctx.canvas.width;
  const rnd = azar(5);
  ctx.globalCompositeOperation = 'lighter';
  // Bokeh: manchas de luz desenfocadas
  for (let i = 0; i < 9; i++) {
    const x = rnd() * L;
    const y = rnd() * L;
    const radio = L * (0.08 + rnd() * 0.12);
    const g = ctx.createRadialGradient(x, y, 0, x, y, radio);
    g.addColorStop(0, `rgba(180,240,110,${0.18 + rnd() * 0.15})`);
    g.addColorStop(1, 'rgba(180,240,110,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, L, L);
  }
  // Facetas del cristal: trazos finos y brillantes en grupos
  for (let i = 0; i < 5; i++) {
    const x = c + (rnd() - 0.5) * r * 1.3;
    const y = c + (rnd() - 0.5) * r * 1.3;
    const angulo = rnd() * Math.PI;
    for (let k = 0; k < 3; k++) {
      const largo = 6 + rnd() * 12;
      const dx = Math.cos(angulo) * largo;
      const dy = Math.sin(angulo) * largo;
      const ox = (rnd() - 0.5) * 6;
      const oy = (rnd() - 0.5) * 6;
      ctx.strokeStyle = `rgba(230,255,190,${0.35 + rnd() * 0.35})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + ox - dx / 2, y + oy - dy / 2);
      ctx.lineTo(x + ox + dx / 2, y + oy + dy / 2);
      ctx.stroke();
    }
  }
  // Luz que entra por arriba a la izquierda
  const luz = ctx.createRadialGradient(L * 0.12, L * 0.2, 0, L * 0.12, L * 0.2, L * 0.3);
  luz.addColorStop(0, 'rgba(237,255,152,0.55)');
  luz.addColorStop(1, 'rgba(237,255,152,0)');
  ctx.fillStyle = luz;
  ctx.fillRect(0, 0, L, L);
  ctx.globalCompositeOperation = 'source-over';
  bordeVidrio(ctx, c, r, 0.45, '10,30,0');
};

// ───────────── Oro: luz dorada en movimiento, como llamas desenfocadas ─────────────
// Referencia: sombra ≈ rgb(136,91,6), oro ≈ rgb(231,174,15), claro ≈ rgb(254,201,66), brillo ≈ rgb(255,254,148)–rgb(255,254,234).
const oro: Interior = (ctx, c, r) => {
  const L = ctx.canvas.width;
  pintarPixeles(ctx, (x, y) => {
    // Ruido estirado en vertical: trazos de luz movida
    const n = fbm(x * 0.05, y * 0.012, 41);
    // Foco de luz a la izquierda del centro
    const dx = (x - L * 0.38) / L;
    const dy = (y - L * 0.55) / L;
    const foco = Math.exp(-(dx * dx * 9 + dy * dy * 4));
    const sombra = limitar((x / L - 0.55) * 0.9) * limitar(y / L - 0.35); // abajo a la derecha
    return rampa(
      [
        [0, [136, 91, 6]],
        [0.3, [231, 174, 15]],
        [0.55, [254, 201, 66]],
        [0.8, [255, 254, 148]],
        [1, [255, 254, 234]],
      ],
      n * 0.7 + foco * 0.65 - sombra * 0.6,
    );
  });
  bordeVidrio(ctx, c, r, 0.4, '90,50,0');
};

// ───────────── Carmesí: cáusticas de agua roja ─────────────
// Referencia: fondo ≈ rgb(72,2,4)–rgb(107,4,16), líneas ≈ rgb(166,7,10)–rgb(204,23,26), cruces casi blancos.
const carmesi: Interior = (ctx, c, r) => {
  const L = ctx.canvas.width;
  const rnd = azar(13);
  const semillas = Array.from({ length: 24 }, () => [rnd() * L * 1.2 - L * 0.1, rnd() * L * 1.2 - L * 0.1]);
  pintarPixeles(ctx, (x, y) => {
    // Coordenadas onduladas: las celdas parecen ondas de agua, no polígonos
    const wx = x + Math.sin(y * 0.09) * 4 + (fbm(x * 0.04, y * 0.04, 51, 2) - 0.5) * 10;
    const wy = y + Math.sin(x * 0.08) * 4;
    let d1 = Infinity;
    let d2 = Infinity;
    for (const [sx, sy] of semillas) {
      const d = Math.hypot(wx - sx, wy - sy);
      if (d < d1) {
        d2 = d1;
        d1 = d;
      } else if (d < d2) d2 = d;
    }
    const e = d2 - d1; // 0 en las fronteras entre celdas
    const linea = Math.exp(-e / 0.9);
    const halo = Math.exp(-e / 5);
    const fondo = fbm(x * 0.025, y * 0.025, 61);
    const base = rampa(
      [
        [0, [60, 1, 3]],
        [0.5, [90, 2, 9]],
        [1, [115, 5, 18]],
      ],
      fondo,
    );
    return [base[0] + halo * 45 + linea * 120, base[1] + halo * 2 + linea * 25, base[2] + halo * 4 + linea * 22];
  });
  bordeVidrio(ctx, c, r, 0.5, '20,0,0');
};

export const INTERIORES: Partial<Record<ColorId, Interior>> = { azulDivino, plata, jade, amatista, esmeralda, oro, carmesi };
