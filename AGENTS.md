# Instrucciones para agentes — Odi Sort

Guía para cualquier agente de IA (Claude Code u otros) que trabaje en este repositorio. Léela
entera antes de tocar código. Complementa a [`CLAUDE.md`](CLAUDE.md) (resumen y skills) y a la
documentación de [`docs/`](docs/).

## 1. Contexto

- **Odi Sort**: juego de ordenar bolas en tubos, móvil, vertical. Phaser 4.2 + TypeScript 6 +
  Vite 8, app Android con Capacitor 8.5.
- **Web publicada**: https://andydevx.github.io/bubble-sort/ (cada push a `main` despliega).
- **Idioma**: el usuario escribe en **español**. Todo va en español: respuestas, textos del
  juego, nombres de variables y funciones, comentarios, commits y documentación.
- Lee primero: [docs/diseno-juego.md](docs/diseno-juego.md) (qué es el juego) y
  [docs/tecnico.md](docs/tecnico.md) (cómo está hecho).

## 2. Flujo de trabajo

1. **Entiende la petición** y revisa el código afectado. Si una decisión es del usuario (cambiar
   reglas del juego, `appId`, subir MINOR/MAJOR, borrar contenido), pregunta antes.
2. **Usa las skills del repo** (`.claude/skills/`) cuando apliquen: Phaser (`phaser-core`,
   `input-keyboard-mouse-touch`, `audio-and-sound`…), `game-ui-ux` para interfaz,
   `capacitor-best-practices` para Android, `typescript-pro`, `vite`.
3. **Implementa** siguiendo las reglas de la sección 3.
4. **Prueba de verdad** (sección 5): build, lógica con Node y juego en el navegador con toques
   reales. Revisa capturas de pantalla.
5. **Documenta**: reglas jugables → `docs/diseno-juego.md`; técnica → `docs/tecnico.md`;
   convenciones → `CLAUDE.md` / este archivo.
6. **Publica con la skill `publicar`**: sube el PATCH, commit en español, push **directo a
   `main`** (sin ramas ni PR: así lo pidió el usuario), vigila el despliegue y añade la versión a
   `docs/historial.md`.
7. **Informa** en español y breve: qué cambió, qué se probó y qué **no** se pudo comprobar,
   versión, build y commit.

## 3. Reglas del código

### Phaser 4

- Nada de APIs de Phaser 3 sin comprobarlas en `node_modules/phaser/types/phaser.d.ts`.
  Cambios típicos: `setTintFill` → `setTint().setTintMode(Phaser.TintModes.FILL)`; `preFX`/
  `postFX` → `enableFilters()` + `filters`; `Geom.Point` → `Math.Vector2`; `Math.TAU` = 2π.
- Animaciones con **tweens** (`this.tweens.add`, `this.tweens.chain`); nada de lógica por frame
  en `update()` salvo que sea imprescindible.
- Texturas generadas una vez (`CanvasTexture`, `generateTexture`); no redibujar `Graphics` cada
  frame.

### TypeScript (tsconfig estricto)

- `erasableSyntaxOnly`: **sin `enum`**, sin `namespace`, sin `constructor(public x)`. Usa objetos
  `as const` y asigna propiedades a mano.
- `verbatimModuleSyntax`: los tipos se importan con `import type`.
- `noUnusedLocals/Parameters`: prefija con `_` lo que no uses.
- Estilo: exportaciones con nombre, comillas simples, nombres en español, comentarios breves que
  expliquen el porqué.

### Pantalla (siempre adaptable y vertical)

- Nunca coloques nada con 720/1280 fijos: usa `this.scale.width/height`.
- Coloca la interfaz dentro de `alRedimensionar(this, …)` y lo pegado a los bordes dentro de
  `zonaSegura(this)` (`src/ui/layout.ts`).
- Prueba al menos en 360×640, 412×915, 768×1024 y horizontal.
- No forzar pantalla completa en el navegador ni mostrar avisos de «gira el teléfono».

### Juego

- **El modelo manda**: cambia `this.tubos` primero y anima después. La vista se puede
  reconstruir en cualquier momento con `sincronizarSprites()`.
- La capacidad de un tubo se lee con `capacidadDe(tubo)` (el de emergencia tiene 1).
- Si cambias las reglas de movimiento, **actualiza también `src/juego/solucionador.ts`**: es el
  que garantiza que los niveles tienen solución.
- Todo texto visible sale de `t('clave')` (`src/i18n/es.ts`). Hay 7 idiomas: una clave nueva va en
  los 7 archivos (TypeScript avisa si falta) y hay que comprobar que cabe en alemán, ruso y chino.
- Ayudas compradas (o futuras por anuncios): inventario en `src/sistemas/guardado.ts` y
  catálogo/compra/gasto en `src/sistemas/tienda.ts`.
- Datos guardados (`localStorage`): valida al leer y ten valores por defecto (ver
  `docs/tecnico.md`). Si cambias el formato, sigue aceptando el anterior.

### Audio

- Carga **siempre en segundo plano** (`cargarAudioEnSegundoPlano`); nada debe bloquear el
  arranque.
- Canciones en `src/assets/musica/`, **máximo 1,5 MB cada una**:
  `ffmpeg -i entrada -map_metadata -1 -ar 16000 -c:a libmp3lame -b:a 32k salida.mp3`.
  No uses MP3 a 8 kHz (Safari).
- Efectos: edita `scripts/generar-sonidos.py` y ejecútalo; no los edites a mano. Al regenerar,
  **todos** los `.ogg` cambian de bytes (cabecera aleatoria) aunque suenen igual: sube solo los
  que hayas cambiado (`git checkout --` el resto).
- Si reemplazas un audio con el mismo nombre, sube `VERSION` en `public/sw.js`.

### Android

- `android/` se versiona; **no edites** `android/app/src/main/assets/public` (se regenera con
  `npx cap sync`).
- `@capacitor/core`, `cli` y `android` en la misma versión.
- El APK lo genera `.github/workflows/apk.yml` cuando sube el **MAJOR**. No subas el MAJOR sin
  que el usuario lo pida.
- La app Android se actualiza sola desde Pages dentro del mismo MAJOR (`src/sistemas/actualizaciones.ts`).
  Si cambias algo **nativo** (plugins, permisos, `android/`, `capacitor.config.ts`), eso no llega por
  ahí: díselo al usuario, hace falta un APK nuevo (subir el MAJOR).
- **No cambies** `android/firma/odi-sort.jks`: con otra clave el APK no se instala encima del
  anterior y el jugador pierde el progreso.

## 4. Versionado y publicación

- Versión `MAJOR.MINOR.PATCH` en `package.json`. **PATCH +1 en cada despliegue**
  (`npm version patch --no-git-tag-version`). MINOR/MAJOR solo a petición del usuario.
- Build = `github.run_number` del workflow de Pages; se ve en el menú junto a la versión y el
  commit.
- Cada MAJOR → APK en una Release (`vX.0.0`).
- Comprueba el despliegue con `gh run list/watch/view --repo AndyDevX/bubble-sort`.

## 5. Cómo probar (y trampas conocidas)

### Lógica pura

Compila `src/juego/` a JS en una carpeta temporal y ejecútalo con Node:

```bash
npx tsc -p . --noEmit false --outDir /tmp/salida --module esnext \
  --verbatimModuleSyntax false --allowImportingTsExtensions false --rootDir src
# añade ".js" a los imports relativos y un package.json {"type":"module"} en la salida
```

Genera cientos de niveles y comprueba `tieneSolucion`, tiempos y casos límite.

**Actualizaciones de la app**: `confirmarArranque()` (Capgo `notifyAppReady`) debe seguir siendo lo
primero que hace `main.ts`, antes de cualquier `await` o temporizador. Si se retrasa, la app Android
descarta cada versión nueva y se queda en la del APK (pasó de v1.0.12 a v1.0.15).

**Lluvia desactivada** (v1.0.15): `LLUVIA_ACTIVA = false` en `src/juego/lluvia.ts`. No borres su
código (se va a refactorizar); si la reactivas, vuelve a medir y ajustar la dificultad.

**Solubilidad**: si cambias la dificultad (`configNivel`), las reglas o la lluvia, ejecuta
`npm run simular` (50 niveles × 3 velocidades de jugador con lluvia). Debe salir 100 % en todo:
el usuario exige que **todos los niveles se puedan resolver sin habilidades**. Para ver cómo sube
la dificultad, `npm run analizar` (regenera `docs/analisis-dificultad.md`).
**Trampa**: el simulador solo vale si imita la lluvia real. `crearLluvia` (`scripts/lib/juego.mjs`)
debe hacer lo mismo que `GameScene` (plan de `lluvia.ts`, dónde cae el hielo, cuándo se derrite).
Hasta v0.1.11 no coincidían y el 100 % era optimista.
**Trampa**: la derrota «Sin solución» se fía del solucionador (`estadoSolucion`). Si el
solucionador permite **menos** jugadas que `evaluarMovimiento`, el jugador pierde partidas que sí
tenían solución. Cualquier cambio en las reglas de movimiento va en los dos sitios (y en
`scripts/lib/juego.mjs`).
**Trampa**: «tiene solución» no basta para que un nivel sea justo. Un tablero puede tener una sola
salida y castigar casi cualquier jugada (nivel 8 de v1.0.5). Si tocas el generador, mira también
`exitoAlAzar` en los primeros niveles. Si cambias cómo se reparten los tableros, sube
`VERSION_GENERADOR` para que los niveles guardados se regeneren.
Mira también la tabla «Cómo pierde» de `npm run analizar`: si el jugador casual muere por «Sin
solución» en la jugada 2–3, hay tableros trampa (en v1.0.6 las bolas de las fusiones dejaban
~1,25 tubos libres).

### Registro de partidas (depuración)

El usuario puede pasar el texto de **Menú → Registro → Copiar resumen / Copiar todo / Descargar**.
Cada nivel trae configuración, tablero inicial y final, y todos los eventos con tiempo real y de
juego (formato en `docs/tecnico.md`). Úsalo para reproducir fallos: busca `toqueIgnorado`
(respuesta táctil), `gota`/`niebla`/`deshielo` (lluvia), `sinSolucion`, `error` (excepciones) y el resultado.

### Juego en el navegador

- Arranca un servidor de prueba en **otro puerto**: `npx vite --port 4190 --strictPort`.
- Playwright con Chromium (`executablePath: '/opt/pw-browsers/chromium'` en la nube), contexto
  móvil (`devices['Pixel 7']` o `{ viewport, hasTouch: true, isMobile: true }`) y
  `page.touchscreen.tap`.
- En desarrollo el juego está en `window.juego`: `juego.scene.getScene('Game')` da acceso al
  estado (`tubos`, `puntos`, `historial`, `tuboUsado`…).
- Coordenadas del juego → pantalla:
  `x = rect.x + gx * rect.width / juego.scale.width` (igual para `y`), con `rect` el
  `getBoundingClientRect()` del `<canvas>`.

**Trampas:**

- Sin GPU, el **reloj de Phaser va más lento** que el real: no esperes con tiempos fijos; espera
  a `g.time.now >= g.bloqueadoHasta` antes de cada toque.
- Los **FPS** de un navegador sin GPU no sirven de referencia.
- Si una prueba falla, **comprueba primero el script**: ya pasó que un helper no pasaba sus
  argumentos a `page.evaluate`, que tras recargar la página se perdían variables de `window`, o
  que un planificador de prueba reasignaba los colores en cada paso.
- En Canvas 2D, **`putImageData` ignora `clip()`**: para pintar píxeles dentro de la bola, píntalos
  en un lienzo aparte y cópialo con `drawImage` (ver `pintarPixeles` en `src/juego/interiores.ts`).
- Al reescribir una sección de un `.md` cortando «desde el texto A hasta el texto B», revisa
  antes qué hay entre A y B: en la 0.1.6 se borraron así, sin querer, las viñetas de colores
  especiales de `docs/diseno-juego.md`. Comprueba el `git diff` de la documentación.
- **No mates procesos con `pkill -f '<patrón>'`** si el patrón aparece en tu propio comando: matas
  tu terminal (salida 144). Usa `kill $(lsof -t -i:PUERTO)`.
- Desde la nube no se puede abrir `*.github.io` ni cambiar la configuración de Pages por API:
  pide al usuario que lo compruebe.
- No se puede escuchar el audio: verifica que carga, su duración y su espectrograma, y pide al
  usuario que lo escuche.

## 6. Qué no hacer

- No crear ramas ni PR (salvo que el usuario lo pida): se trabaja directo en `main`.
- No subir `node_modules`, `dist` ni los assets generados de Android.
- No meter archivos de audio sin comprimir ni de más de 1,5 MB.
- No usar `enum`, APIs de Phaser 3, posiciones fijas ni polling en `update()`.
- No dar por probado algo que no se ha visto pasar; decir explícitamente lo que no se pudo
  comprobar.

### CrazyGames

- Hay dos builds: `npm run build` (web y app) y `npm run build:crazygames`. Si añades algo que solo
  tiene sentido en uno (anuncios, enlaces externos, Service Worker, audio), usa `EN_CRAZYGAMES`
  (`src/plataforma.ts`) y comprueba que el otro build no lo arrastra.
- **Trampa**: `import.meta.glob` empaqueta los archivos de todas las carpetas que mencione el
  código, aunque la rama no se use. Por eso la música va por `virtual:musica` (vite.config.ts).
  Comprueba con `ls dist-crazygames/assets` que no se cuela ninguna canción de `src/assets/musica/`.
- El build de CrazyGames no lleva herramientas de depuración (registro, medidor de FPS, build y
  commit en el menú). Si añades alguna, déjala fuera con `EN_CRAZYGAMES` o `import.meta.env.DEV`.
- En CrazyGames no puede haber enlaces externos ni anuncios propios, y el juego debe funcionar con
  bloqueador de anuncios. Las Releases `crazygames-v…` se crean con `--latest=false`.
- Desde la sesión no se puede descargar el SDK real ni probar anuncios de verdad: las pruebas usan
  un SDK simulado (Playwright, `page.route` a `sdk.crazygames.com`).
