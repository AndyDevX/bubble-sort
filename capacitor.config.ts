import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.andy.phasertemplate',
  appName: 'Odi Sort',
  webDir: 'dist',
  plugins: {
    // Actualizaciones en caliente (src/sistemas/actualizaciones.ts): modo manual, sin servidores de
    // Capgo. El juego mira `actualizacion/version.json` en GitHub Pages y descarga el .zip del build.
    CapacitorUpdater: {
      autoUpdate: false,
      statsUrl: '', // sin estadísticas a terceros
      appReadyTimeout: 15000, // si un build nuevo no arranca en 15 s, vuelve al anterior
    },
  },
};

export default config;
