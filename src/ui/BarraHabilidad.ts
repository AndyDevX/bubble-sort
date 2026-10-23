import Phaser from 'phaser';
import { Colores } from '../constantes';
import { crearBotonRedondo, type BotonRedondo } from './BotonRedondo';
import { ICONO_GRAVEDAD } from './iconosHabilidad';

export interface BarraHabilidad {
  colocar(x: number, y: number, ancho: number): void;
  setProgreso(progreso: number): void; // 0..1; al llegar a 1 se habilita el botón
}

// Barra que se carga con puntos + botón redondo a la derecha para usar la habilidad
export function crearBarraHabilidad(escena: Phaser.Scene, etiqueta: string, alUsar: () => void): BarraHabilidad {
  const alto = 26;
  const radioBoton = 52;

  const fondo = escena.add.graphics();
  const relleno = escena.add.rectangle(0, 0, 1, alto - 8, Colores.primario).setOrigin(0, 0.5);
  const texto = escena.add
    .text(0, 0, etiqueta, { fontFamily: 'sans-serif', fontSize: '28px', color: '#ffffff' })
    .setOrigin(0, 1);
  const boton: BotonRedondo = crearBotonRedondo(escena, 0, 0, radioBoton, ICONO_GRAVEDAD, alUsar);

  let anchoPista = 300;
  let progreso = 0;
  let mostrado = 0;
  let pulso: Phaser.Tweens.Tween | null = null;

  const pintarRelleno = () => {
    relleno.setSize(Math.max(0.001, (anchoPista - 8) * mostrado), alto - 8);
  };

  const actualizarBoton = () => {
    const lleno = progreso >= 1;
    boton.setHabilitado(lleno);
    pulso?.remove();
    pulso = null;
    boton.setScale(1);
    if (lleno) {
      pulso = escena.tweens.add({ targets: boton, scale: 1.08, duration: 500, yoyo: true, repeat: -1 });
    }
  };

  actualizarBoton();

  return {
    colocar(x, y, ancho) {
      anchoPista = ancho - radioBoton * 2 - 24;
      const izquierda = x - ancho / 2;
      fondo.clear();
      fondo.fillStyle(Colores.pista).fillRoundedRect(izquierda, y - alto / 2, anchoPista, alto, alto / 2);
      relleno.setPosition(izquierda + 4, y);
      texto.setPosition(izquierda, y - alto / 2 - 8);
      boton.setPosition(x + ancho / 2 - radioBoton, y);
      pintarRelleno();
    },
    setProgreso(nuevo) {
      const anterior = progreso;
      progreso = Phaser.Math.Clamp(nuevo, 0, 1);
      escena.tweens.addCounter({
        from: mostrado,
        to: progreso,
        duration: 300,
        onUpdate: (tween) => {
          mostrado = tween.getValue() ?? progreso;
          pintarRelleno();
        },
      });
      if ((anterior >= 1) !== (progreso >= 1)) actualizarBoton();
    },
  };
}
