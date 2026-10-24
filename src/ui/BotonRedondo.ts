import Phaser from 'phaser';
import { reproducirEfecto } from '../sistemas/audio';
import { Botones, dibujarCaramelo, type ColoresBoton } from './tema';

export type DibujarIcono = (g: Phaser.GameObjects.Graphics, colorFondo: number) => void;

export interface BotonRedondo extends Phaser.GameObjects.Container {
  setHabilitado(habilitado: boolean): void;
}

// Botón de icono: cuadrado redondeado caramelo (como los del estilo de referencia). El icono es un
// dibujo a mano (Graphics, en blanco) o la clave de una textura (iconos de habilidad,
// `src/ui/iconosHabilidad.ts`), que se escala al tamaño del botón y baja con la cara al pulsar.
// `radio` es la mitad del lado.
export function crearBotonRedondo(
  escena: Phaser.Scene,
  x: number,
  y: number,
  radio: number,
  icono: DibujarIcono | string,
  alPulsar: () => void,
  colores: ColoresBoton = Botones.azul,
): BotonRedondo {
  const lado = radio * 2;
  const cuerpo = escena.add.graphics();
  const dibujo = escena.add.graphics();
  const imagen = typeof icono === 'string' ? escena.add.image(0, 0, icono).setDisplaySize(radio * 1.45, radio * 1.45) : null;
  const pintar = (hundido: boolean) => {
    const dy = dibujarCaramelo(cuerpo, lado, lado, radio * 0.5, colores, hundido);
    dibujo.clear().setY(dy);
    if (typeof icono !== 'string') icono(dibujo, colores.cara);
    imagen?.setY(dy);
  };
  pintar(false);

  const boton = escena.add.container(x, y, imagen ? [cuerpo, imagen] : [cuerpo, dibujo]) as BotonRedondo;
  boton.setSize(lado, lado);
  boton.setInteractive({ useHandCursor: true });

  boton.on('pointerover', () => boton.setScale(1.04));
  boton.on('pointerout', () => {
    pintar(false);
    boton.setScale(1);
  });
  boton.on('pointerdown', () => pintar(true));
  boton.on('pointerup', () => {
    pintar(false);
    reproducirEfecto(escena, 'boton');
    alPulsar();
  });

  boton.setHabilitado = (habilitado: boolean) => {
    if (habilitado) boton.setInteractive({ useHandCursor: true });
    else boton.disableInteractive();
    boton.setAlpha(habilitado ? 1 : 0.45);
    pintar(false);
  };

  return boton;
}

export const iconoPausa: DibujarIcono = (g) => {
  g.fillStyle(0xffffff);
  g.fillRoundedRect(-15, -18, 10, 36, 3);
  g.fillRoundedRect(5, -18, 10, 36, 3);
};

export const iconoEngranaje: DibujarIcono = (g, colorFondo) => {
  const dientes = 8;
  const puntos: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < dientes * 4; i++) {
    const angulo = (i / (dientes * 4)) * Math.PI * 2;
    const r = i % 4 < 2 ? 34 : 26; // alterna punta del diente y hueco
    puntos.push(new Phaser.Math.Vector2(Math.cos(angulo) * r, Math.sin(angulo) * r));
  }
  g.fillStyle(0xffffff).fillPoints(puntos, true);
  g.fillStyle(colorFondo).fillCircle(0, 0, 11);
};
