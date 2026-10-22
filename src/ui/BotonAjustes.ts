import type Phaser from 'phaser';
import { crearBotonRedondo, iconoEngranaje } from './BotonRedondo';

export function crearBotonAjustes(
  escena: Phaser.Scene,
  x: number,
  y: number,
  alPulsar: () => void,
): Phaser.GameObjects.Container {
  return crearBotonRedondo(escena, x, y, 56, iconoEngranaje, alPulsar);
}
