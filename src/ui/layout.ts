import Phaser from 'phaser';

export interface Area {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

// Elemento oculto que lee los márgenes seguros del sistema (notch, barra de gestos)
let sonda: HTMLDivElement | null = null;

function leerMargenesCss(): { arriba: number; abajo: number; izquierda: number; derecha: number } {
  if (!sonda) {
    sonda = document.createElement('div');
    sonda.style.cssText =
      'position:fixed;visibility:hidden;pointer-events:none;' +
      'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);';
    document.body.appendChild(sonda);
  }
  const estilo = getComputedStyle(sonda);
  return {
    arriba: parseFloat(estilo.paddingTop) || 0,
    abajo: parseFloat(estilo.paddingBottom) || 0,
    izquierda: parseFloat(estilo.paddingLeft) || 0,
    derecha: parseFloat(estilo.paddingRight) || 0,
  };
}

// Zona de la pantalla (en coordenadas del juego) libre de notch y barras del sistema.
// Coloca ahí la interfaz pegada a los bordes (barra superior, botones de las esquinas).
export function zonaSegura(escena: Phaser.Scene): Area {
  const { width, height } = escena.scale.gameSize;
  const factor = width / (escena.scale.displaySize.width || width); // px de CSS → unidades del juego
  const m = leerMargenesCss();
  const arriba = m.arriba * factor;
  const izquierda = m.izquierda * factor;
  return {
    x: izquierda,
    y: arriba,
    ancho: width - izquierda - m.derecha * factor,
    alto: height - arriba - m.abajo * factor,
  };
}

// Llama a `colocar` ahora y cada vez que cambie el tamaño de la pantalla
// (girar, entrar/salir de pantalla completa, redimensionar ventana).
// El tamaño del juego NO es fijo: mínimo 720 de ancho y 1280 de alto, crece según la pantalla.
export function alRedimensionar(escena: Phaser.Scene, colocar: (ancho: number, alto: number) => void): void {
  const alCambiar = (tamano: Phaser.Structs.Size) => colocar(tamano.width, tamano.height);
  escena.scale.on(Phaser.Scale.Events.RESIZE, alCambiar);
  escena.events.once(Phaser.Scenes.Events.SHUTDOWN, () => escena.scale.off(Phaser.Scale.Events.RESIZE, alCambiar));
  colocar(escena.scale.width, escena.scale.height);
}
