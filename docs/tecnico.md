# Odi Sort — Documentación técnica

Cómo está construido el juego, cómo se compila, prueba, versiona y publica. La parte jugable está
en [diseno-juego.md](./diseno-juego.md); las reglas para agentes, en [`AGENTS.md`](../AGENTS.md).

## Stack

| Herramienta | Versión | Para qué |
| --- | --- | --- |
| Phaser | 4.2.1 | Motor: WebGL, escenas, input, tweens, audio |
| TypeScript | 6.0.3 | Tipado estricto (`strict`, `erasableSyntaxOnly`, `verbatimModuleSyntax`) |
| Vite | 8.3.x | Servidor de desarrollo y build a `dist/` (`base: './'`) |
| Capacitor | 8.5.3 (`core`, `cli`, `android`) | App Android (proyecto en `android/`) |
| Node.js | 22.12+ | Vite 8 y Capacitor 8 |
| JDK | 21 | Compilar el APK (solo en CI o para Android Studio) |

Guías de referencia del stack: [guia-phaser.md](./guia-phaser.md) y
[guia-typescript.md](./guia-typescript.md).

## Comandos

```bash
npm ci                 # instalar exactamente lo del package-lock.json
npm run dev            # http://localhost:5173 (también por la IP de la red local)
npm run build          # tsc + vite build → dist/
npm run preview        # servir dist/ en local
npm run compartir      # (con npm run dev abierto) túnel público https://….trycloudflare.com
npm run cap:android    # build + sync + abrir Android Studio
python3 scripts/generar-sonidos.py   # regenerar los efectos de sonido (Python + ffmpeg)
```

## Estructura del repositorio

```text
├─ AGENTS.md / CLAUDE.md      instrucciones para agentes
├─ README.md                  portada del proyecto
├─ docs/                      documentación (diseño, técnica, historial, guías)
├─ .claude/skills/            skills de Claude Code (Phaser, Capacitor, UI, Vite, TS, publicar)
├─ .github/workflows/
│  ├─ deploy.yml              cada push a main → GitHub Pages
│  └─ apk.yml                 cada versión MAJOR → APK en una Release
├─ android/                   proyecto nativo de Capacitor (se versiona; no editar assets/public)
├─ public/                    se copia tal cual: favicon, manifest, sw.js, assets/sfx/
├─ scripts/generar-sonidos.py síntesis de los efectos de vidrio
└─ src/
   ├─ main.ts                 GameConfig y arranque
   ├─ constantes.ts           nombre, colores de UI, versión y build
   ├─ vite-env.d.ts           tipos de las variables inyectadas por Vite
   ├─ style.css               lienzo a pantalla completa, columna 3:4 en pantallas anchas
   ├─ assets/musica/          canciones (se detectan solas con import.meta.glob)
   ├─ i18n/                   textos: es.ts + t('clave', { valores })
   ├─ juego/                  lógica pura, sin Phaser (se puede probar con Node)
   ├─ scenes/                 Boot, Menu, Game, Dialogo, Tienda, Settings
   ├─ sistemas/               guardado (con inventario), tienda, audio, caché, FPS
   └─ ui/                     componentes y colocación adaptable
```

## Arquitectura

### Escenas

```text
BootScene ──► MenuScene ──► GameScene
 (texturas)    │  ▲             │
               │  └── Dialogo ◄─┤  pausa / victoria / derrota (Game queda en pausa)
               ├──► Tienda ◄────┤  (también desde Dialogo); vuelve a la escena de origen
               └──► Settings ◄──┘  (también desde Dialogo); vuelve a la escena de origen
```

- **BootScene** genera las texturas de las bolas y pasa al menú al instante (no espera audio).
- **MenuScene** para la música y lanza la **carga del audio en segundo plano**.
- **GameScene** contiene la partida. `init(datos)` recibe `modo`: `continuar` (cargar el nivel
  guardado), `reiniciar` (misma configuración) o `nuevo` (generar otro).
- **DialogoScene** ejecuta acciones: `continuar`, `deshacer` (evento `'deshacer'` a Game),
  `reiniciar`, `nuevo`, `siguiente`, `tienda`, `ajustes`, `menu`. Si sus datos traen
  `recalcular()`, al reanudarse (volver de la tienda) se rehace con datos nuevos: así el diálogo
  de derrota muestra «Deshacer» en cuanto se compra uno.
- **TiendaScene** (`init({ origen })`) se abre encima del menú, de la partida o de un diálogo y al
  cerrar reanuda la escena de origen. Menú y partida escuchan el evento `RESUME` para repintar
  monedas e inventario.
- **SettingsScene** guarda al momento; si cambia el idioma, reinicia la escena de origen con sus
  mismos datos.

### Modelo y vista

- **El modelo manda** (`src/juego/modelo.ts`): `Tubo { bolas, sellado, capacidad? }` y
  `Bola { id, color, oculta, ingrediente }`. Cada jugada **cambia primero el modelo** y después
  se anima; si la pantalla cambia de tamaño a mitad, la vista se reconstruye desde el modelo
  (`sincronizarSprites`) sin perder nada.
- Funciones clave: `evaluarMovimiento`, `aplicarMovimiento` (grupos, fusiones, sellado,
  revelado), `invertirTubos`, `hayMovimientos`, `nivelCompleto(tubos, coloresIniciales)`,
  `bolasBienColocadas`, `clonarTubos`, `capacidadDe`.
- `GameScene` mantiene un `Map<id, Image>` de sprites y bloquea los toques mientras dura una
  animación (`bloqueadoHasta`, en tiempo de juego).

### Generador de niveles y solucionador

- `src/juego/niveles.ts`: `configNivel(n)` (dificultad) y `generarNivel(n)` (baraja, reparte y
  aplica niebla). Rechaza tableros con un tubo ya resuelto.
- `src/juego/solucionador.ts`: búsqueda en profundidad con tubos codificados como texto y
  estados visitados. Usa **las mismas reglas que el juego** (grupos, fusiones, sellado, capacidad
  de cada tubo). Si las reglas de movimiento cambian, **hay que actualizar también el
  solucionador** (y `scripts/simular-solubilidad.mjs`).
- `tieneSolucion(tubos, limite, coloresObjetivo?)`: sin objetivo exige todo sellado o vacío (al
  generar); con `coloresObjetivo` basta con sellar esos colores (partida con lluvia).
- `configNivel(n)`: `desbloqueados` = 4 de salida (`COLORES_DE_SALIDA`) + los que marca
  `SALTOS_DESBLOQUEO` (cada salto entre `SALTO_MINIMO` = 5 y `SALTO_MAXIMO` = 12 niveles); colores
  por nivel = desbloqueados − 2 (mín. 3; máx. 7, u 8 desde el bloque 8; nunca bajan) y la fusión
  cuando cabe; `bloqueDe(n)` (bloque = desbloqueos alcanzados, y uno cada 10 niveles al final)
  hace crecer niebla, lluvia y fusiones; `esNivelDificil(n)` = último nivel del bloque
  (`config.dificil`: más niebla, lluvia más rápida, +1 tanda, +1 fusión). `GameScene` lo avisa
  con `DialogoScene` (icono `icono-peligro`), pone el título en naranja y paga monedas ×2; `tubosVacios` = 2 + tandas de lluvia. La lluvia puede usar un color
  aún no desbloqueado (cae congelada). `colorNuevo(n)` dice qué color se desbloquea en el nivel n (siempre sale en él);
  `GameScene.avisarColorNuevo` lo anuncia con `DialogoScene` (campo `bola`: textura de la bola).

### Lluvia justa

`GameScene.elegirTuboGota`: baraja los tubos con hueco y, para cada uno, simula la gota y llama a
`tieneSolucion(..., 8000 nodos, coloresBase)`; usa el primero que deja solución. Si ninguno, la
gota espera 700 ms (salvo que el estado actual ya no tenga solución: entonces cae al azar).
Presupuesto de 40 ms por intento para no dar tirones; tras 4 esperas seguidas cae al azar.
Coste medido en PC: mediana 0,6 ms, p95 5 ms, peor 30 ms por comprobación.

`npm run simular [niveles=50 pruebas=10]` (`scripts/simular-solubilidad.mjs`) compila
`src/juego` a una carpeta temporal y mide la solubilidad con lluvia; termina con error si algún
nivel no llega al 100 %.

### Deshacer

- Antes de cada jugada se guarda una **instantánea** (tubos clonados, puntos, carga, bolas
  puntuadas, lluvia). Se guardan como mucho `MAX_HISTORIAL` (50); cada deshacer gasta un uso del
  inventario (`gastar('deshacer')`).
- Al deshacer se restaura y `animarHaciaModelo` anima cada bola de su posición actual a la del
  modelo restaurado.
- Al añadir el tubo de emergencia se añade también (vacío) a las instantáneas.

### Entrada táctil

- Las zonas de los tubos usan `pointerdown` (respuesta al tocar) y `input.activePointers: 3` en
  `main.ts` (toques rápidos con varios dedos).
- Mover no bloquea la entrada: el modelo cambia al instante y las bolas pueden recibir otra jugada
  en pleno vuelo (`killTweensOf` + `tamanoNormal`). Solo bloquean la fusión, el giro de gravedad,
  deshacer, la entrada del nivel y el tubo de emergencia.

### Pantalla adaptable

- `Scale.EXPAND` con 720×1280 como tamaño **mínimo**: el juego crece hasta llenar la pantalla.
- Toda la interfaz se coloca en `alRedimensionar(this, (ancho, alto) => …)` y lo pegado a los
  bordes dentro de `zonaSegura(this)` (notch y barra de gestos) — `src/ui/layout.ts`.
- En pantallas anchas, `style.css` limita el lienzo a una columna de proporción 3:4.
- Los tubos se colocan en 1 fila (≤ 5) o 2 filas, con el tamaño de bola calculado según el
  espacio disponible.

### Audio

- `src/sistemas/audio.ts`:
  - `cargarAudioEnSegundoPlano(escena)`: encola lo que falte (primero efectos, luego canciones) y
    arranca el cargador **sin bloquear**. Si la escena se cierra a medias, la siguiente retoma.
  - `iniciarMusicaPartida` / `detenerMusica`: playlist aleatoria sin fin (no repite la anterior).
  - `reproducirEfecto(escena, efecto, variar?)`: efectos con volumen de Ajustes y tono variable.
  - `iniciarEfecto(escena, efecto)`: efecto largo que devuelve la instancia para poder cortarlo
    (la alarma de la lluvia). El gestor de sonido es **global**: lo que no se pare sigue sonando
    al cambiar de escena.
- **Efectos** en `public/assets/sfx/` (ogg + mp3), generados con `scripts/generar-sonidos.py`.
- **Canciones** en `src/assets/musica/`: MP3 32 kbps a 16 kHz, **máximo 1,5 MB** cada una. No
  usar MP3 a 8 kHz (MPEG-2.5): Safari no lo reproduce bien.

### Texturas

- Bolas dibujadas una vez al arrancar en `CanvasTexture` de 128 px (esfera con degradado,
  ingrediente con anillo discontinuo, oculta con «?», **congelada** para la lluvia: `hielo-<color>`,
  según `bola.lluvia`) — `src/juego/texturas.ts`. Todo es procedural (sin imágenes de terceros).
- `chispa`: estrella blanca con halo para las partículas. `GameScene` crea **un solo emisor**
  (`crearEfectos`, `emitting: false`) y lo reutiliza con `estallarChispas(x, y, color, n)`
  (`setParticleTint` + `explode`); el tamaño se escala con el diámetro de bola.
- Bolas: `dibujarEsfera` (canica de vidrio) la comparten bola, ingrediente y oculta. Los colores
  especiales tienen interior propio en `src/juego/interiores.ts` (`INTERIORES`: azulDivino, plata,
  jade, amatista, esmeralda, oro, carmesi), hecho con ruido fractal determinista (semilla fija),
  rampas de color medidas en las referencias y trazos/gradientes de Canvas; el vidrio de encima es
  común. El valor de `PALETA` es el tono para tintes (tubo sellado, chispas).
- `pintarPixeles` (interiores por píxel) pinta en un lienzo aparte y lo copia con `drawImage`:
  **`putImageData` ignora el recorte** (`clip`) y la bola saldría cuadrada.
- `FAMILIA` (colores.ts): el generador pone primero los colores de familias aún no usadas.
- Catálogo: `ColeccionScene` (overlay con `origen`, como la tienda). `nivelDesbloqueo(color)` se
  deriva de `configNivel`, así el catálogo no puede contradecir al juego; un color está
  descubierto si `mejorNivel >= nivelDesbloqueo(color)`. Textura `bola-bloqueada`. Los nombres de
  los colores están en `src/i18n/nombresColor.ts` (`nombreColor`).
- `npm run simular` comprueba además el **orden de desbloqueo**: cada color una vez, Azul divino
  se empieza con 4 básicos, luego el resto de básicos y al final los especiales, cada desbloqueo
  entre 5 y 12 niveles después del anterior, los desbloqueos siguen `ORDEN_COLORES`, el color nuevo sale en su nivel,
  la curva de colores no baja y los colores necesarios están desbloqueados.
- `npm run analizar [niveles=60 muestras=20 obvia=0.6 ms=1500]` (`scripts/analizar-dificultad.mjs`):
  índice de dificultad por nivel y estadística (Spearman, pendientes, retrocesos, mesetas) →
  `docs/analisis-dificultad.md` + `.svg`. El jugador casual juega con lluvia justa y tiempo real.
- `scripts/lib/juego.mjs`: compilación de `src/juego` y motor de búsqueda compartidos por ambos
  scripts.
- Estadísticas (`src/sistemas/estadisticas.ts`, clave `odi-sort:estadisticas`): contadores que
  `GameScene` suma (niveles generados/superados/fallidos, habilidades, tubos llenos y canicas
  movidas por color); se guardan con 800 ms de retraso y al ocultar la página. Pantalla:
  `EstadisticasScene`.
- Tubos (`src/juego/texturasTubo.ts`): texturas `tubo-atras`, `tubo-delante`, `tubo-liquido`,
  `tubo-tapon` y `tubo-corto-*` (emergencia), dibujadas una vez con degradados de Canvas y
  escaladas a `anchoTubo / TUBO_ANCHO` con origen `ORIGEN_TUBO`. Cada tubo en pantalla
  (`VistaTubo`) son **dos contenedores**: atrás (profundidad 0, bajo las bolas) y delante
  (profundidad 3, reflejos y tapón sobre las bolas). Las animaciones del tubo mueven ambos con
  `capas(i)`; `colocarTodo` cancela sus tweens al recolocar. Sellar = teñir `liquido` y `tapon`.
- Iconos de habilidad (`src/ui/iconosHabilidad.ts`): texturas `icono-deshacer`, `icono-tubo`,
  `icono-gravedad` (128 px). `crearBotonRedondo` acepta la clave de textura en lugar de un dibujo.

### Guardado (`localStorage`)

| Clave | Contenido | Módulo |
| --- | --- | --- |
| `odi-sort:partida` | `{ nivel, mejorNivel, monedas, inventario: { deshacer, tuboExtra } }` | `sistemas/guardado.ts` |
| `odi-sort:nivel` | `{ numero, nivel (configuración inicial) }` (los antiguos traen `ventajas`, que se ignora) | `sistemas/nivelGuardado.ts` |
| `odi-sort:ajustes` | `{ volumenMusica, volumenEfectos, idioma }` | `sistemas/ajustes.ts` |

Todas las lecturas validan los datos y vuelven a valores por defecto si algo no cuadra.
`borrarProgreso()` y `borrarNivelGuardado()` borran partida y nivel (no los ajustes); los usa el
botón oculto del menú (`src/ui/BorrarProgreso.ts`). Si el
navegador no deja guardar, el nivel se mantiene en memoria.

### Tienda e inventario

- `src/sistemas/tienda.ts`: `CATALOGO` (ofertas con `articulo`, `cantidad` y `precio`),
  `comprar(oferta)` (cobra y suma al inventario; `false` si no llegan las monedas),
  `gastar(articulo)` y `cantidadDe(articulo)`.
- El inventario vive en `odi-sort:partida` (`sistemas/guardado.ts`); los guardados sin inventario
  empiezan con 0.
- En la partida, si un botón de ayuda no tiene usos, su insignia muestra «+» y tocarlo abre la
  tienda. El límite de un tubo extra por nivel es `tuboUsado` (estado de la escena).
- Para añadir un artículo: nuevo campo en `Inventario`, oferta en `CATALOGO` y textos/icono en
  `TiendaScene`.

### Caché sin conexión

`public/sw.js` (Service Worker, solo en navegador y con HTTPS o localhost):

- Audio: se sirve del caché y se actualiza en segundo plano.
- Archivos del build con huella en el nombre: se guardan una vez.
- `index.html`: siempre de la red.
- Sube `VERSION` para vaciar el caché de todos los jugadores (p. ej. al reemplazar canciones).

### Textos

Todo texto visible sale de `t('clave', { valores })` (`src/i18n/`). Para añadir un idioma se
crea un archivo con las mismas claves que `es.ts` y se registra en `src/i18n/index.ts`.

### Rendimiento (60 fps)

- Todo el movimiento con **tweens** (sin lógica por frame en `update`).
- Texturas dibujadas una vez; los `Graphics` solo se redibujan al cambiar de estado o de tamaño.
- `fps.target: 60` con `smoothStep`; no se limita a 60 para no dar tirones en pantallas de
  90/120 Hz.
- En `npm run dev` hay un contador de FPS arriba a la izquierda. Medir en un **móvil real**.

## Versionado, builds y despliegue

| Concepto | Cómo funciona |
| --- | --- |
| **Versión** | `MAJOR.MINOR.PATCH` en `package.json`. El **PATCH** sube en cada despliegue (lo hace la skill `publicar`). **MINOR/MAJOR** solo cuando lo pide el usuario |
| **Build** | Número de despliegue = `github.run_number` del workflow de Pages. Se inyecta como `VITE_NUMERO_BUILD` junto al commit (`VITE_COMMIT`) |
| **Menú** | Muestra «v0.0.9 · build 9 · 2f20f9d» (en local, «build dev») |
| **Web** | Cada push a `main` → `deploy.yml` → https://andydevx.github.io/bubble-sort/ |
| **APK** | Cada vez que sube el **MAJOR** → `apk.yml` compila `assembleDebug` y crea la Release `vX.0.0` con `odi-sort-vX.0.0.apk` |

### APK de Android

- El proyecto `android/` se generó con `npx cap add android` y **se versiona** (es código fuente).
  Lo que hay en `android/app/src/main/assets/public` se regenera con `npx cap sync` y está en
  `.gitignore`.
- Orientación fija en vertical (`android:screenOrientation="portrait"` en `AndroidManifest.xml`).
- `appId`: `com.andy.phasertemplate` (heredado de la plantilla). **Cambiarlo antes de publicar en
  una tienda**: una vez publicado, cambiarlo crea otra app distinta.
- El APK es de **depuración** (clave debug): se instala directamente permitiendo «orígenes
  desconocidos». Para la Play Store hará falta una compilación **release firmada** con un
  keystore guardado en los secretos del repositorio.
- Se puede lanzar a mano desde la pestaña **Actions** → «APK por versión MAJOR» → *Run workflow*
  (deja el APK como artefacto, sin Release).

## Pruebas

No hay tests automáticos en el repo; las comprobaciones se hacen así:

- **Lógica** (`src/juego/`): se compila a JS en una carpeta temporal y se ejecuta con Node
  (generar cientos de niveles, comprobar que tienen solución, casos de reglas).
- **Juego**: Chromium sin pantalla con Playwright (`executablePath: '/opt/pw-browsers/chromium'`
  en las sesiones en la nube), con toques reales. En desarrollo el juego se expone en
  `window.juego` para leer el estado (`juego.scene.getScene('Game')`).
- Ver en [`AGENTS.md`](../AGENTS.md) los trucos y trampas conocidas de estas pruebas.

## Limitaciones conocidas

- Los FPS medidos en navegadores sin GPU no son representativos.
- El APK es de depuración; no hay firma release ni build para iOS.
- Las canciones incluidas pueden tener derechos de autor: tenlo en cuenta antes de publicar en
  una tienda.
