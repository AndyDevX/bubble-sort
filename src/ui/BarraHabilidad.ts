import Phaser from 'phaser';
import { crearBotonRedondo, type BotonRedondo } from './BotonRedondo';
import { Botones, Tema, dibujarPastilla, estiloTexto } from './tema';
import { ICONO_GRAVEDAD } from './iconosHabilidad';

export interface BarraHabilidad {
  colocar(x: number, y: number, ancho: number): void;
  setProgreso(progreso: number): void; // 0..1; al llegar a 1 se habilita el botón
}

// Barra que se carga con puntos + botón a la derecha para usar la habilidad. Pista en pastilla
// translúcida y relleno ámbar con brillo (como la barra de progreso del estilo de referencia).
export function crearBarraHabilidad(escena: Phaser.Scene, etiqueta: string, alUsar: () => void): BarraHabilidad {
  const alto = 30;
  const radioBoton = 52;

  const fondo = escena.add.graphics();
  const relleno = escena.add.graphics();
  const texto = escena.add.text(0, 0, etiqueta, estiloTexto(28, Tema.texto)).setOrigin(0, 1);
  const boton: BotonRedondo = crearBotonRedondo(escena, 0, 0, radioBoton, ICONO_GRAVEDAD, alUsar, Botones.verde);
  let izquierdaRelleno = 0;
  let centroY = 0;

  let anchoPista = 300;
  let progreso = 0;
  let mostrado = 0;
  let pulso: Phaser.Tweens.Tween | null = null;

  const pintarRelleno = () => {
    const ancho = (anchoPista - 10) * mostrado;
    const altoRelleno = alto - 10;
    relleno.clear();
    if (ancho < 1) return;
    const x = izquierdaRelleno;
    const y = centroY - altoRelleno / 2;
    const r = Math.min(altoRelleno / 2, ancho / 2);
    relleno.fillStyle(Botones.naranja.relieve).fillRoundedRect(x, y, ancho, altoRelleno, r);
    relleno.fillStyle(Botones.naranja.cara).fillRoundedRect(x, y, ancho, altoRelleno - 4, r);
    if (ancho > 12) relleno.fillStyle(0xffffff, 0.45).fillRoundedRect(x + 5, y + 3, ancho - 10, altoRelleno * 0.3, Math.min(4, r));
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
      dibujarPastilla(fondo, izquierda, y - alto / 2, anchoPista, alto);
      fondo.fillStyle(Tema.pista).fillRoundedRect(izquierda + 4, y - alto / 2 + 4, anchoPista - 8, alto - 8, (alto - 8) / 2);
      izquierdaRelleno = izquierda + 5;
      centroY = y;
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
