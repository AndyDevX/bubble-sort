import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { SettingsScene } from './scenes/SettingsScene';
import { DialogoScene } from './scenes/DialogoScene';
import { TiendaScene } from './scenes/TiendaScene';
import { setIdioma } from './i18n';
import { getAjustes } from './sistemas/ajustes';
import { registrarCacheOffline } from './sistemas/cacheOffline';
import './style.css';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1d1d2b',
  scale: {
    // EXPAND: 720x1280 es el tamaño mínimo; el juego crece para llenar la pantalla sin franjas.
    // Las escenas colocan su interfaz con alRedimensionar() (src/ui/layout.ts).
    mode: Phaser.Scale.EXPAND,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 720,
    height: 1280,
  },
  fps: {
    target: 60,
    smoothStep: true, // suaviza picos de delta para que el movimiento no dé tirones
  },
  render: {
    powerPreference: 'high-performance',
  },
  input: {
    activePointers: 3, // varios dedos: un toque rápido con otro dedo no se pierde
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 } },
  },
  scene: [BootScene, MenuScene, GameScene, DialogoScene, TiendaScene, SettingsScene],
};

setIdioma(getAjustes().idioma);

const juego = new Phaser.Game(config);
registrarCacheOffline();

if (import.meta.env.DEV) {
  Object.assign(window, { juego }); // para depurar desde la consola del navegador
  void import('./sistemas/medidorFps').then(({ mostrarMedidorFps }) => mostrarMedidorFps(juego));
}
