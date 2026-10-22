import Phaser from 'phaser';
import { Colores } from '../constantes';
import { crearBoton } from '../ui/Boton';

export type AccionDialogo = 'continuar' | 'jugar' | 'ajustes' | 'menu';

export interface DatosDialogo {
  titulo: string;
  texto?: string;
  botones: { texto: string; accion: AccionDialogo }[];
}

// Ventana sobre la partida (que queda en pausa): pausa, victoria y derrota
export class DialogoScene extends Phaser.Scene {
  private datos: DatosDialogo = { titulo: '', botones: [] };

  constructor() {
    super('Dialogo');
  }

  init(datos: DatosDialogo) {
    this.datos = datos;
  }

  create() {
    const { width, height } = this.scale;
    const { titulo, texto, botones } = this.datos;

    // Fondo oscuro que además bloquea los toques a la partida
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6).setInteractive();

    const separacion = 140;
    const primerBoton = texto ? 270 : 200; // distancia del borde superior al primer botón
    const altoPanel = primerBoton + (botones.length - 1) * separacion + 115;
    const anchoPanel = Math.min(620, width - 60);
    const arriba = (height - altoPanel) / 2;
    this.add
      .graphics()
      .fillStyle(Colores.panel)
      .fillRoundedRect((width - anchoPanel) / 2, arriba, anchoPanel, altoPanel, 32);

    this.add
      .text(width / 2, arriba + 90, titulo, { fontFamily: 'sans-serif', fontSize: '56px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);

    if (texto) {
      this.add
        .text(width / 2, arriba + 165, texto, { fontFamily: 'sans-serif', fontSize: '32px', color: '#aaaacc' })
        .setOrigin(0.5);
    }

    let y = arriba + primerBoton;

    for (const boton of botones) {
      crearBoton(this, width / 2, y, boton.texto, () => this.ejecutar(boton.accion));
      y += separacion;
    }

    const alCambiarTamano = () => this.scene.restart(this.datos);
    this.scale.once(Phaser.Scale.Events.RESIZE, alCambiarTamano);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, alCambiarTamano));
  }

  private ejecutar(accion: AccionDialogo) {
    switch (accion) {
      case 'continuar':
        this.scene.stop();
        this.scene.resume('Game');
        break;
      case 'jugar': // reiniciar el nivel o pasar al siguiente (lo decide el guardado)
        this.scene.start('Game');
        break;
      case 'ajustes':
        this.scene.pause();
        this.scene.launch('Settings', { origen: this.scene.key });
        break;
      case 'menu':
        this.scene.stop('Game');
        this.scene.start('Menu');
        break;
    }
  }
}
