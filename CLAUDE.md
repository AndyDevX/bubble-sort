# Phaser Capacitor Template

Juego: **Odi Sort**. Stack: Phaser 4.2 · Vite 8 · TypeScript 6 · Capacitor 8.
Diseño del juego y decisiones tomadas: `docs/diseno-juego.md`. Guías: `docs/guia-phaser.md`, `docs/guia-typescript.md`.

## Comandos
- `npm run dev` — servidor local (http://localhost:5173)
- `npm run build` — tsc + build a `dist/`
- `npm run compartir` — (con `npm run dev` abierto en otra terminal) túnel público temporal `https://….trycloudflare.com`
- `npm run cap:sync` / `npm run cap:android` — build y sincronizar con nativo
- Publicación web: cada push a `main` compila y publica en GitHub Pages (`.github/workflows/deploy.yml`) → https://andydevx.github.io/bubble-sort/

## Estructura
- `src/main.ts` — GameConfig
- `src/scenes/` — una clase por escena: `BootScene` (carga) → `MenuScene` → `GameScene`; `DialogoScene` (pausa/victoria/derrota) y `SettingsScene` se abren encima
- `src/juego/` — lógica pura sin Phaser: reglas (`modelo.ts`), colores y recetas, generador de niveles y solucionador
- `src/ui/` — componentes (`Boton`, `BotonRedondo` + iconos, `Insignia`, `BarraHabilidad`, `Slider`) y `layout.ts` (colocación adaptable)
- `public/sw.js` — Service Worker: guarda audio y build en el caché del dispositivo (sube `VERSION` para invalidarlo)
- `src/sistemas/` — ajustes y partida guardados, nivel guardado (reiniciar igual), ventajas (tubo de emergencia; futura tienda/anuncios), audio (volumen música/efectos), registro del Service Worker, medidor de FPS (solo dev)
- `src/i18n/` — textos; todo texto visible sale de `t('clave')`
- `public/assets/` — assets estáticos (se cargan como `assets/...`)
- `public/assets/sfx/` — efectos de sonido de vidrio, generados con `python3 scripts/generar-sonidos.py` (Python + ffmpeg); para cambiar un sonido, edita su función en el script y vuelve a ejecutarlo
- `src/assets/musica/` — canciones de las partidas (se detectan solas; aleatorias y sin fin). Súbelas ya comprimidas, **máximo 1,5 MB cada una**: `ffmpeg -i entrada -map_metadata -1 -ar 16000 -c:a libmp3lame -b:a 32k salida.mp3` (no uses 8 kHz en MP3: Safari no lo reproduce bien)
- Audio: nada bloquea el arranque; efectos y canciones se cargan en segundo plano (`cargarAudioEnSegundoPlano`)
- Versión: `MAJOR.MINOR.PATCH` en `package.json`; la skill `publicar` sube el PATCH en cada despliegue (MINOR/MAJOR solo si el usuario lo pide). Se muestra en el menú
- Build: el número de despliegue (`github.run_number`) y el commit se inyectan en el workflow (`VITE_NUMERO_BUILD`, `VITE_COMMIT`) y se muestran en el menú; en local sale «Build dev»

## Skills del proyecto (`.claude/skills/`)
Úsalas según la tarea:
- Publicar: `publicar` — verificar, documentar, commit y push a `main` y comprobar GitHub Pages (úsala siempre al subir cambios)
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

## Pantalla: siempre adaptable y siempre vertical
- Escalado `Scale.EXPAND`: 720x1280 es el tamaño **mínimo**; el juego crece hasta llenar la pantalla (p. ej. 720x1600 en móviles alargados, hasta 960x1280 en tablet). **Nunca** uses 720/1280 fijos para colocar cosas: usa `this.scale.width/height`.
- Coloca la interfaz dentro de `alRedimensionar(this, (ancho, alto) => { ... })` (`src/ui/layout.ts`), que se vuelve a ejecutar al girar, al mostrarse/ocultarse la barra del navegador o al redimensionar.
- Lo pegado a los bordes (barra superior, esquinas) va dentro de `zonaSegura(this)` para no quedar bajo el notch o la barra de gestos.
- En el navegador **no** se fuerza pantalla completa: el juego se adapta al área visible normal.
- Solo vertical: el diseño es vertical; en pantallas anchas (PC, móvil en horizontal) el juego es una columna centrada de proporción máxima 3:4. Sin aviso de «gira el teléfono» (daba falsos positivos).
- Al crear el proyecto Android (`npx cap add android`), fija `android:screenOrientation="portrait"` en la `<activity>` de `AndroidManifest.xml`.
- Prueba cada pantalla nueva al menos en 360x640, 412x915, 768x1024 y en horizontal.

## Rendimiento: 60 fps estables
- Movimiento siempre en función de `delta` (o velocidades de física), nunca valores fijos por frame: así va igual a 60, 90 o 120 Hz.
- No redibujes `Graphics` en cada frame: dibuja una vez o genera una textura (`generateTexture`) y usa imágenes/sprites.
- Reutiliza objetos (grupos/pools) en vez de crear y destruir en bucle; nada de `new` dentro de `update()` si se puede evitar.
- Usa tweens de Phaser para animaciones de UI; evita cambiar `setText` cada frame (solo cuando cambia el valor).
- Mide con el contador de FPS (arriba a la izquierda en `npm run dev`) en un **móvil real**; el navegador del PC o uno simulado no sirven de referencia.

