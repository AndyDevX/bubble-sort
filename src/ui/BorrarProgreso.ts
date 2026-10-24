import Phaser from 'phaser';
import { t } from '../i18n';
import { reproducirEfecto } from '../sistemas/audio';
import { crearBoton } from './Boton';
import { ajusteDeLinea, Botones, dibujarPanel, FUENTE, Tema } from './tema';

const MANTENER_MS = 1500; // pulsación larga necesaria: evita borrar por un toque accidental
const RADIO = 26;

export interface BotonBorrarProgreso {
  colocar(x: number, y: number): void;
}

// Papelera pequeña y casi transparente. Hay que mantenerla pulsada (un aro se va llenando) y
// después confirmar en una ventana: dos pasos para que nadie borre su partida sin querer.
export function crearBotonBorrarProgreso(escena: Phaser.Scene, alBorrar: () => void): BotonBorrarProgreso {
  const icono = escena.add.graphics();
  icono.lineStyle(3, Tema.sombra, 1);
  icono.strokeRect(-9, -6, 18, 20); // cubo
  icono.lineBetween(-13, -10, 13, -10); // tapa
  icono.lineBetween(-4, -14, 4, -14); // asa
  icono.lineBetween(-3, -2, -3, 10);
  icono.lineBetween(3, -2, 3, 10);
  const aro = escena.add.graphics();
  const boton = escena.add.container(0, 0, [icono, aro]).setAlpha(0.22);
  boton.setSize(RADIO * 2.4, RADIO * 2.4).setInteractive({ useHandCursor: true });

  const pista = escena.add
    .text(0, 0, t('mantenBorrar'), { fontFamily: FUENTE, fontSize: '22px', color: Tema.textoSuave })
    .setOrigin(0, 0.5)
    .setAlpha(0);

  let carga: Phaser.Tweens.Tween | null = null;
  const progreso = { valor: 0 };
  const pintarAro = () => {
    aro.clear();
    if (progreso.valor <= 0) return;
    aro.lineStyle(5, 0xff5252, 1);
    aro.beginPath();
    aro.arc(0, 0, RADIO, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progreso.valor);
    aro.strokePath();
  };
  const cancelar = () => {
    carga?.stop();
    carga = null;
    progreso.valor = 0;
    pintarAro();
    boton.setAlpha(0.22);
  };

  boton.on('pointerdown', () => {
    boton.setAlpha(0.9);
    escena.tweens.killTweensOf(pista);
    pista.setAlpha(1);
    escena.tweens.add({ targets: pista, alpha: 0, delay: 1800, duration: 400 });
    carga = escena.tweens.add({
      targets: progreso,
      valor: 1,
      duration: MANTENER_MS,
      onUpdate: pintarAro,
      onComplete: () => {
        cancelar();
        mostrarConfirmacion(escena, alBorrar);
      },
    });
  });
  boton.on('pointerup', cancelar);
  boton.on('pointerout', cancelar);

  return {
    colocar(x, y) {
      boton.setPosition(x, y);
      pista.setPosition(x + RADIO + 14, y);
    },
  };
}

function mostrarConfirmacion(escena: Phaser.Scene, alBorrar: () => void) {
  const { width, height } = escena.scale;
  reproducirEfecto(escena, 'error');
  const velo = escena.add.rectangle(width / 2, height / 2, width, height, Tema.sombra, 0.45).setInteractive().setDepth(20);
  const ancho = Math.min(620, width - 60);
  const alto = 560;
  const arriba = (height - alto) / 2;
  const panel = escena.add.graphics().setDepth(20);
  dibujarPanel(panel, (width - ancho) / 2, arriba, ancho, alto, 32);
  panel.lineStyle(4, 0xff5252, 0.8).strokeRoundedRect((width - ancho) / 2, arriba, ancho, alto, 32);
  const titulo = escena.add
    .text(width / 2, arriba + 80, t('borrarTitulo'), { fontFamily: FUENTE, fontSize: '48px', color: Tema.peligro, fontStyle: 'bold' })
    .setOrigin(0.5)
    .setDepth(20);
  const texto = escena.add
    .text(width / 2, arriba + 175, t('borrarTexto'), {
      fontFamily: FUENTE,
      fontSize: '30px',
      color: Tema.texto,
      align: 'center',
      wordWrap: ajusteDeLinea(ancho - 80),
    })
    .setOrigin(0.5)
    .setDepth(20);

  const piezas: Phaser.GameObjects.GameObject[] = [velo, panel, titulo, texto];
  const cerrar = () => piezas.forEach((p) => p.destroy());
  const borrar = crearBoton(escena, width / 2, arriba + 320, t('borrarSi'), () => {
    cerrar();
    alBorrar();
  }, Botones.rojo).setDepth(20);
  const volver = crearBoton(escena, width / 2, arriba + 450, t('cancelar'), cerrar, Botones.crema).setDepth(20);
  piezas.push(borrar, volver);
}
