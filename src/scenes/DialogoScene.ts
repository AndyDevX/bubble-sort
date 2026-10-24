import Phaser from 'phaser';
import { Colores } from '../constantes';
import { crearBoton } from '../ui/Boton';

export type AccionDialogo = 'continuar' | 'deshacer' | 'seguir' | 'reiniciar' | 'siguiente' | 'tienda' | 'ajustes' | 'menu';

export interface DatosDialogo {
  titulo: string;
  texto?: string;
  bola?: string; // textura de una bola grande bajo el título (aviso de color nuevo)
  botones: { texto: string; accion: AccionDialogo }[];
  recalcular?: () => DatosDialogo; // si existe, el diálogo se rehace al volver de la tienda o los ajustes
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
    const { titulo, texto, bola, botones } = this.datos;

    // Fondo oscuro que además bloquea los toques a la partida
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6).setInteractive().setDepth(-2);

    const separacion = 140;
    const altoBola = bola ? 170 : 0; // hueco para la bola, entre el título y el texto
    const anchoPanel = Math.min(620, width - 60);
    // El texto se parte en líneas para caber en el panel; su alto real coloca lo demás
    const objetoTexto = texto
      ? this.add
          .text(width / 2, 0, texto, { fontFamily: 'sans-serif', fontSize: '32px', color: '#aaaacc', align: 'center', wordWrap: { width: anchoPanel - 70, useAdvancedWrap: true } })
          .setOrigin(0.5)
      : null;
    const altoTexto = objetoTexto?.height ?? 0;
    const primerBoton = (texto ? 230 + altoTexto : 200) + altoBola; // distancia del borde superior al primer botón
    const altoPanel = primerBoton + (botones.length - 1) * separacion + 115;
    const arriba = (height - altoPanel) / 2;
    this.add
      .graphics()
      .fillStyle(Colores.panel)
      .fillRoundedRect((width - anchoPanel) / 2, arriba, anchoPanel, altoPanel, 32)
      .setDepth(-1);

    this.add
      .text(width / 2, arriba + 90, titulo, { fontFamily: 'sans-serif', fontSize: '56px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);

    if (bola) {
      // Aparece con un salto y queda flotando suavemente
      const imagen = this.add.image(width / 2, arriba + 165 + altoBola / 2 - 20, bola).setDisplaySize(150, 150);
      const escala = imagen.scaleX;
      imagen.setScale(0);
      this.tweens.chain({
        targets: imagen,
        tweens: [
          { scale: escala, duration: 380, ease: 'Back.easeOut' },
          { y: imagen.y - 8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' },
        ],
      });
    }

    objetoTexto?.setY(arriba + 145 + altoBola + altoTexto / 2);

    let y = arriba + primerBoton;

    for (const boton of botones) {
      crearBoton(this, width / 2, y, boton.texto, () => this.ejecutar(boton.accion));
      y += separacion;
    }

    const alCambiarTamano = () => this.scene.restart(this.datos);
    this.scale.once(Phaser.Scale.Events.RESIZE, alCambiarTamano);
    const alReanudar = () => {
      if (this.datos.recalcular) this.scene.restart(this.datos.recalcular());
    };
    this.events.on(Phaser.Scenes.Events.RESUME, alReanudar);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, alCambiarTamano);
      this.events.off(Phaser.Scenes.Events.RESUME, alReanudar);
    });
  }

  private ejecutar(accion: AccionDialogo) {
    switch (accion) {
      case 'continuar':
        this.scene.stop();
        this.scene.resume('Game');
        break;
      case 'deshacer':
      case 'seguir': {
        // Deshacer la última jugada o seguir jugando una partida que ya no tiene solución
        const juego = this.scene.get('Game');
        this.scene.stop();
        this.scene.resume('Game');
        juego.events.emit(accion);
        break;
      }
      case 'reiniciar': // mismo nivel, misma configuración inicial
        this.scene.start('Game', { modo: 'reiniciar' });
        break;
      case 'siguiente': // el guardado ya apunta al siguiente nivel
        this.scene.start('Game', { modo: 'continuar' });
        break;
      case 'tienda':
        this.scene.pause();
        this.scene.launch('Tienda', { origen: this.scene.key });
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
