import Phaser from 'phaser';
import { Botones, Tema, estiloTexto } from './tema';

export interface Slider {
  setValor(valor: number): void;
}

// Slider horizontal de 0 a 1. Se puede tocar en cualquier punto de la pista o arrastrar.
export function crearSlider(
  escena: Phaser.Scene,
  x: number,
  y: number,
  ancho: number,
  valorInicial: number,
  alCambiar: (valor: number) => void,
  alSoltar?: (valor: number) => void,
): Slider {
  const altoPista = 16;
  const radioTirador = 28;
  const izquierda = x - ancho / 2;

  const grafico = escena.add.graphics();
  // Tirador: bola blanca con borde y sombra
  const tirador = escena.add.graphics({ x: 0, y });
  tirador.fillStyle(Tema.sombra, 0.2).fillCircle(1, 4, radioTirador);
  tirador.fillStyle(Botones.crema.relieve).fillCircle(0, 0, radioTirador);
  tirador.fillStyle(0xffffff).fillCircle(0, -2, radioTirador - 4);
  const porcentaje = escena.add.text(x + ancho / 2 + 30, y, '', estiloTexto(32, Tema.texto)).setOrigin(0, 0.5);

  let valor = Phaser.Math.Clamp(valorInicial, 0, 1);
  let arrastrando = false;

  const pintar = () => {
    grafico.clear();
    grafico.fillStyle(Tema.pista).fillRoundedRect(izquierda, y - altoPista / 2, ancho, altoPista, altoPista / 2);
    if (valor > 0) {
      grafico
        .fillStyle(Botones.azul.cara)
        .fillRoundedRect(izquierda, y - altoPista / 2, Math.max(altoPista, ancho * valor), altoPista, altoPista / 2);
    }
    tirador.setX(izquierda + ancho * valor);
    porcentaje.setText(`${Math.round(valor * 100)}%`);
  };

  const moverA = (punteroX: number) => {
    const nuevo = Phaser.Math.Clamp((punteroX - izquierda) / ancho, 0, 1);
    if (nuevo === valor) return;
    valor = nuevo;
    pintar();
    alCambiar(valor);
  };

  // Zona táctil más alta que la pista para que sea fácil de tocar con el dedo
  const zona = escena.add.zone(x, y, ancho + radioTirador * 2, radioTirador * 3).setInteractive({ useHandCursor: true });
  zona.on('pointerdown', (p: Phaser.Input.Pointer) => {
    arrastrando = true;
    tirador.setScale(1.15);
    moverA(p.worldX);
  });

  const alMover = (p: Phaser.Input.Pointer) => {
    if (arrastrando && p.isDown) moverA(p.worldX);
  };
  const terminarArrastre = () => {
    if (!arrastrando) return;
    arrastrando = false;
    tirador.setScale(1);
    alSoltar?.(valor);
  };
  escena.input.on('pointermove', alMover);
  escena.input.on('pointerup', terminarArrastre);
  escena.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    escena.input.off('pointermove', alMover);
    escena.input.off('pointerup', terminarArrastre);
  });

  pintar();

  return {
    setValor(nuevo: number) {
      valor = Phaser.Math.Clamp(nuevo, 0, 1);
      pintar();
    },
  };
}
