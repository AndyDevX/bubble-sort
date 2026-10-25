import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { SettingsScene } from './scenes/SettingsScene';
import { DialogoScene } from './scenes/DialogoScene';
import { TiendaScene } from './scenes/TiendaScene';
import { ColeccionScene } from './scenes/ColeccionScene';
import { EstadisticasScene } from './scenes/EstadisticasScene';
import { RegistroScene } from './scenes/RegistroScene';
import { setIdioma } from './i18n';
import { getAjustes } from './sistemas/ajustes';
import { registrarCacheOffline } from './sistemas/cacheOffline';
import { EN_CRAZYGAMES } from './plataforma';
import { confirmarArranque, iniciarActualizaciones } from './sistemas/actualizaciones';
import { iniciarAnuncios } from './sistemas/anuncios';
import { usarFuenteDeIdioma } from './ui/tema';
import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-700.css';
import './fuentes.css';
import './style.css';

// App Android: confirmar el arranque antes de cualquier espera (ver confirmarArranque)
confirmarArranque();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#f7e9d4', // Tema.fondoCss (src/ui/tema.ts)
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
  // El build de CrazyGames no lleva la pantalla de registro de depuración
  scene: [BootScene, MenuScene, GameScene, DialogoScene, TiendaScene, ColeccionScene, EstadisticasScene, ...(EN_CRAZYGAMES ? [] : [RegistroScene]), SettingsScene],
};

// En CrazyGames el progreso se guarda con su SDK: hay que iniciarlo antes de leer los ajustes y la
// partida (en la web `iniciarAnuncios` no hace nada y termina al momento)
// Las fuentes Fredoka y Nunito (cirílico, para el ruso; incluidas en el build) tienen que estar
// cargadas antes de crear textos: Phaser dibuja el texto en un canvas y no lo repinta cuando llega
// la fuente. Nunito se carga siempre (son 24 KB) por si se cambia a ruso en Ajustes. Como mucho
// se esperan 3 s.
const fuenteLista = Promise.race([
  Promise.all(
    ['500 32px Fredoka', '700 32px Fredoka', '500 32px Nunito', '700 32px Nunito'].map((fuente) => document.fonts.load(fuente, 'Aaя')),
  ),
  new Promise((listo) => setTimeout(listo, 3000)),
]).catch(() => undefined);

void Promise.all([iniciarAnuncios(), fuenteLista]).then(() => {
  setIdioma(getAjustes().idioma);
  usarFuenteDeIdioma(getAjustes().idioma);

  const juego = new Phaser.Game(config);
  registrarCacheOffline();
  iniciarActualizaciones();

  if (import.meta.env.DEV) {
    Object.assign(window, { juego }); // para depurar desde la consola del navegador
    void import('./sistemas/medidorFps').then(({ mostrarMedidorFps }) => mostrarMedidorFps(juego));
  }
});
