import type Phaser from 'phaser';

// Solo en desarrollo (npm run dev): muestra los FPS reales en una esquina.
// Es un elemento HTML, así que no añade trabajo al render del juego.
export function mostrarMedidorFps(juego: Phaser.Game): void {
  const medidor = document.createElement('div');
  medidor.style.cssText =
    'position:fixed;top:calc(env(safe-area-inset-top) + 4px);left:4px;z-index:10;' +
    'font:12px monospace;color:#0f0;background:rgba(0,0,0,.6);padding:2px 6px;pointer-events:none;';
  document.body.appendChild(medidor);

  setInterval(() => {
    const fps = Math.round(juego.loop.actualFps);
    medidor.textContent = `${fps} FPS`;
    medidor.style.color = fps >= 58 ? '#0f0' : fps >= 45 ? '#ff0' : '#f44';
  }, 500);
}
