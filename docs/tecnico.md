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
- `GameScene` mantiene un `Map<id, Image>` de sprites y bloquea los toques (`bloqueadoHasta`, en
  tiempo de juego) solo durante la gravedad, el deshacer y la entrada de los tubos. Las gotas de
  lluvia y las fusiones **no bloquean**: el modelo cambia al instante y el sprite de la bola
  fusionada se crea ya (alfa 0) para que se pueda seguir jugando con ella. Las llamadas diferidas
  de las animaciones comprueban `generacion` (sube al deshacer) para no tocar sprites de un
  estado ya deshecho.

### Generador de niveles y solucionador

- `src/juego/niveles.ts`: `configNivel(n)` (dificultad) y `generarNivel(n)` (baraja, reparte y
  aplica niebla). Rechaza tableros con un tubo ya resuelto. Genera `candidatosPorNivel(config, n)`
  tableros resolubles y se queda con el de mayor `dificultadTablero` = log2(1 + nodos del
  solucionador) − 1,5 · pares de iguales seguidos − 0,75 · jugadas «gratis» iniciales. Coste en PC:
  hasta ~100 ms en los niveles difíciles altos (8 colores), ~20–35 ms en los normales.
- `nodosHastaSolucion(tubos, límite, objetivo?)`: lo mismo que `tieneSolucion` pero devuelve los
  estados explorados (-1 si no encuentra solución); `tieneSolucion` lo usa por dentro.
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
  con `DialogoScene` (icono `icono-peligro`), pone el título en naranja y paga monedas ×2; `tubosVacios` = 2. La lluvia puede usar un color
  aún no desbloqueado (cae congelada). `colorNuevo(n)` dice qué color se desbloquea en el nivel n (siempre sale en él);
  `GameScene.avisarColorNuevo` lo anuncia con `DialogoScene` (campo `bola`: textura de la bola).

### Lluvia (hielo y niebla)

`src/juego/lluvia.ts` → `planificarLluvia(config, colores)`: sortea en cada partida el umbral de
inicio (25–45 %), el orden de las gotas (todas las tandas mezcladas), su tipo (`hielo` o, desde el
bloque 5, `niebla` con `probNieblaDe`) y la espera antes de cada una (intervalo ±40 %; ráfagas de
140 ms desde el bloque 2); `deshielo` = jugadas que tarda en derretirse el hielo (`deshieloDe`:
4 + ⌊bloque/2⌋ hasta 8, +1 en el difícil). No se guarda con el nivel: reiniciar da otra lluvia.

- **Modelo**: la bola de hielo es `{ lluvia: true, deshielo: n }`. `congelado(tubo)` (`modelo.ts`)
  = la bola de arriba es de hielo; `evaluarMovimiento` no deja sacar de un tubo congelado ni poner
  encima. `sinHielo(tubos)` quita el hielo (para comprobar solución: el hielo siempre se derrite).
- **`GameScene`**: `programarGota` encadena un `delayedCall` por gota. `soltarGota` → hielo en un
  tubo al azar con hueco y sin hielo arriba (si no hay, `esperarGota` 700 ms) o `soltarNiebla`
  (tapa hasta 2 bolas descubiertas que no estén arriba; si no hay, cae hielo). `avanzarDeshielo`
  se llama tras cada jugada del jugador (mover/fusionar y gravedad, en su `delayedCall`, antes de
  `trasJugada`) y `derretir` quita la bola del modelo y la rompe. En `trasJugada`, si no hay
  ninguna jugada, `derretirMasProximo` derrite ya el hielo con menos jugadas pendientes.
  `sincronizarEtiquetasHielo` crea/quita el número de cada bola de hielo según el modelo y
  `update()` solo los mueve con su sprite (sin crear objetos por frame).
- **Deshacer**: la instantánea guarda las bolas con su `deshielo` y su `oculta`, así que deshacer
  devuelve el hielo y la niebla a como estaban (y la lluvia pendiente vuelve a caer).
- Hasta v1.0.4 la lluvia era permanente: «lluvia justa» (el solucionador elegía el tubo para no
  dejar el nivel sin solución) y un tubo vacío extra al empezar a llover. Todo eso se quitó.

### Derrota «Sin solución»

`GameScene.comprobarSolucion` (al final de cada `trasJugada`): `estadoSolucion(sinHielo(tubos),
30000 nodos y 12 ms, coloresBase)` (`solucionador.ts`) devuelve `'si'`, `'no'` (la búsqueda recorrió
**todos** los estados sin solución: es seguro) o `'desconocido'` (se acabó el límite de nodos o de tiempo). Solo con
`'no'` se prueba además con la Gravedad (si está cargada) y con el tubo de emergencia (si queda
uno disponible); si tampoco, derrota `sinSolucion`. Cada búsqueda para a los 12 ms (`MS_COMPROBACION`) para no dar tirones: en el PC la mayoría tarda 2–3 ms, pero los tableros más difíciles llegan a ~130 ms sin ese tope.
**El solucionador debe permitir exactamente las mismas jugadas que el juego** (si permite menos,
daría «Sin solución» en partidas que sí la tienen). Por eso en v1.0.5 se corrigió: un ingrediente
se puede poner sobre una bola normal de su color (y al revés), como en `evaluarMovimiento`.

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
  `docs/analisis-dificultad.md` + `.svg`. El jugador casual juega con la lluvia de hielo y tiempo real (no modela la niebla).
- `scripts/lib/juego.mjs`: compilación de `src/juego` y motor de búsqueda compartidos por ambos
  scripts. `crearLluvia(plan, …)` reproduce la lluvia del juego (plan, alerta, hielo con `HIELO` = `~` en
  el estado, deshielo por jugadas con `trasJugada`, `derretirUno` sin jugadas): si cambia la
  lluvia de `GameScene`, cámbiala también aquí. `vecinos` no deja tocar tubos con hielo arriba.
- **Registro de depuración** (`src/sistemas/registro.ts`, clave `odi-sort:registro`, últimas 40
  partidas, máx. 4000 eventos cada una): `iniciarRegistroNivel` al crear la partida (configuración,
  colores, tablero inicial), `registrar(tipo, datos)` en cada suceso y `cerrarRegistroNivel` al
  ganar, perder o salir (tablero final). Cada evento lleva tiempo **real** (`performance.now`,
  incluye pausas) y **de juego** (`this.time.now`, se para en pausa; se ajusta en el primer
  `update`, porque en `create` el reloj de la escena aún no está al día). Eventos: `inicio`,
  `seleccionar`, `cancelar`, `mover`, `fusion` (tubos afectados después de la jugada), `invalido`,
  `toqueIgnorado` (con el motivo: animación, tubo vacío o sellado), `revelar`, `sellar`,
  `lluviaInicio`, `gota` (tubo, color y deshielo), `niebla` (bolas tapadas), `deshielo`,
  `deshieloForzado` (sin jugadas), `gotaEspera`, `sinSolucion` (tablero y ms de cálculo), `gravedad`, `deshacer`, `tuboExtra`, `dialogo`, `pausa`,
  `reanudar`, `tienda`, `compra`, `compraFallida`, `appOculta`/`appVisible`, `error` (errores de
  JavaScript) y `derrota` (si se deshace). Tubos en texto compacto: código de color de abajo
  arriba, `?` oculta, `*` ingrediente, `~` lluvia, `#` sellado. Exportación: `textoResumen()` y
  `textoCompleto()`; pantalla `RegistroScene` (portapapeles con respaldo `execCommand`, descarga
  con `Blob`).
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
| **APK** | Cada vez que sube el **MAJOR** → `apk.yml` compila `assembleRelease` y crea la Release `vX.0.0` con `odi-sort-vX.0.0.apk` |
| **App instalada** | Entre APK y APK se actualiza sola desde Pages (PATCH y MINOR del mismo MAJOR); ver «Actualizaciones en caliente» |

### APK de Android

- El proyecto `android/` se generó con `npx cap add android` y **se versiona** (es código fuente).
  Lo que hay en `android/app/src/main/assets/public` se regenera con `npx cap sync` y está en
  `.gitignore`.
- Orientación fija en vertical (`android:screenOrientation="portrait"` en `AndroidManifest.xml`).
- `appId`: `com.andy.phasertemplate` (heredado de la plantilla). **Cambiarlo antes de publicar en
  una tienda**: una vez publicado, cambiarlo crea otra app distinta.
- El APK es **release** y se instala directamente permitiendo «orígenes desconocidos». Va
  firmado siempre con la misma clave, `android/firma/odi-sort.jks` (alias `odi-sort`, contraseña
  `odisort-apk`, en `android/app/build.gradle`), para que cada APK nuevo se instale **encima** del
  anterior sin perder el progreso. **No la cambies ni la borres**: con otra clave Android obliga a
  desinstalar (y se pierde el progreso). Está en el repositorio a propósito porque desde la sesión
  no se pueden crear secretos; para la Play Store se usará otra clave de subida guardada en los
  secretos del repositorio.
- `versionName` = versión de `package.json` y `versionCode` = MAJOR·1000000 + MINOR·1000 + PATCH
  (`android/app/build.gradle`): siempre crece.
- El APK lleva el mismo número de build que el despliegue de Pages del mismo commit.
- Se puede lanzar a mano desde la pestaña **Actions** → «APK por versión MAJOR» → *Run workflow*
  (deja el APK como artefacto, sin Release).

### Actualizaciones en caliente (app Android)

Para no reinstalar el APK en cada versión, la app descarga el juego nuevo desde GitHub Pages con
`@capgo/capacitor-updater` en **modo manual** (sin cuenta ni servidores de Capgo; `statsUrl` vacío).

1. `deploy.yml` comprime `dist/` en `actualizacion/odi-sort-X.Y.Z.zip` y escribe
   `actualizacion/version.json` (`version`, `build`, `commit`, `zip`).
2. Al abrirse (y al volver de segundo plano, como mucho cada 2 min) la app
   (`src/sistemas/actualizaciones.ts`) llama a `notifyAppReady()` y lee `version.json`:
   - versión más nueva del **mismo MAJOR** → `download` + `next`. Si el jugador está en el **menú**
     (sin ventanas encima), se instala en ese momento con `set` (el juego se recarga; el menú dice
     «Descargando…» y luego «Instalando…»). Si está jugando, se instala al volver al menú o, por
     `next`, al pasar la app a segundo plano. **Hasta v1.0.2 solo se instalaba al salir y volver a
     entrar después de terminar la descarga**, y no había rastro de los errores;
   - **MAJOR nuevo** → no descarga (puede traer cambios nativos); el menú avisa de que hay app nueva
     y al tocarlo abre las Releases en el navegador;
   - si un build nuevo no llega a `notifyAppReady` en 15 s (`appReadyTimeout`), Capgo vuelve al
     anterior y esa versión no se reintenta.
3. Cada paso (arranque, al día, descargando, lista, error y su motivo) se apunta en
   `odi-sort:actualizaciones` (últimas 30 líneas) y sale en la cabecera del **registro de
   depuración**: si una actualización no llega, el registro dice por qué.
4. Los paquetes viejos se borran (unos 4 MB cada uno). Al instalar un APK nuevo, Capgo descarta los
   descargados y usa el que trae el APK (`resetWhenUpdate`).

Lo que **sí** necesita APK nuevo (y por tanto subir el MAJOR): plugins o permisos nuevos, cambios en
`android/` o en `capacitor.config.ts`, o subir de versión Capacitor.

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
- La clave del APK está en el repositorio (vale para instalar a mano, no para la Play Store); no hay build para iOS.
- Las canciones incluidas pueden tener derechos de autor: tenlo en cuenta antes de publicar en
  una tienda.
