import Phaser from 'phaser';
import { reproducirEfecto } from '../sistemas/audio';
import { Botones, dibujarCaramelo, estiloTexto, type ColoresBoton } from './tema';

// Botón caramelo reutilizable: cara de color con brillo y relieve; al tocarlo la cara se hunde.
export function crearBoton(
  escena: Phaser.Scene,
  x: number,
  y: number,
  texto: string,
  alPulsar: () => void,
  colores: ColoresBoton = Botones.azul,
): Phaser.GameObjects.Container {
  const alto = 112;

  const etiqueta = escena.add.text(0, 0, texto, estiloTexto(46, colores.texto)).setOrigin(0.5);
  // Contorno del color del relieve en los botones de color (se lee mejor el texto blanco)
  if (colores.texto === '#ffffff') etiqueta.setStroke(Phaser.Display.Color.IntegerToColor(colores.relieve).rgba, 7);

  // Mínimo 360 de ancho; si el texto es largo, el botón crece para dejarle margen
  const ancho = Math.max(360, etiqueta.width + 80);

  const fondo = escena.add.graphics();
  const pintar = (hundido: boolean) => etiqueta.setY(dibujarCaramelo(fondo, ancho, alto, 34, colores, hundido));
  pintar(false);

  const boton = escena.add.container(x, y, [fondo, etiqueta]);
  boton.setSize(ancho, alto);
  boton.setInteractive({ useHandCursor: true });

  boton.on('pointerover', () => boton.setScale(1.03));
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

  return boton;
}
