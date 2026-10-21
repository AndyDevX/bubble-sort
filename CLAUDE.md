# Phaser Capacitor Template

Stack: Phaser 4.2 · Vite 8 · TypeScript 6 · Capacitor 8. Juego vertical 720x1280 (Scale FIT).

## Comandos
- `npm run dev` — servidor local (http://localhost:5173)
- `npm run build` — tsc + build a `dist/`
- `npm run cap:sync` / `npm run cap:android` — build y sincronizar con nativo

## Estructura
- `src/main.ts` — GameConfig
- `src/scenes/` — una clase por escena (`BootScene` carga assets, `GameScene` juego)
- `public/assets/` — assets estáticos (se cargan como `assets/...`)

## Skills del proyecto (`.claude/skills/`)
Úsalas según la tarea:
- Phaser: `phaser-core` (base), `game-setup-and-config`, `sprites-and-images`, `animations`,
  `audio-and-sound`, `input-keyboard-mouse-touch`, `scale-and-responsive`,
  `game-object-components`, `geometry-and-math`, `groups-and-containers`
- Diseño: `game-ui-ux`, `create-game-assets`
- Capacitor: `capacitor-best-practices`, `capacitor-performance`, `debugging-capacitor`
- Herramientas: `typescript-pro`, `vite`

## Convenciones
- Es Phaser 4: no uses APIs ni pipelines de Phaser 3 sin comprobarlo.
- Mantener `base: './'` en Vite (necesario para Capacitor).
- Verificar con `npm run build` antes de dar algo por terminado.
