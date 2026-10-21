# Guía de Phaser 4 para el juego

Manual de referencia de Phaser 4.2 para este proyecto (vertical 720×1280, móvil, control táctil). Todos los fragmentos compilan contra Phaser 4.2.1 con el `tsconfig.json` del repo. La guía de TypeScript está en [guia-typescript.md](./guia-typescript.md).

## Proyecto, configuración y escenas

Un juego de Phaser es un objeto `Phaser.Game` que ejecuta una o varias **escenas**. Cada escena es una pantalla o capa: menú, nivel, interfaz, pausa.

### Arrancar el proyecto

Requiere Node.js 22.12 o superior.

```bash
git clone https://github.com/AndyDevX/bubble-sort.git
cd bubble-sort
npm ci             # instala las versiones exactas del package-lock.json
npm run dev        # http://localhost:5173 (también desde el móvil con la IP de tu PC)
```

### Configuración del juego (src/main.ts)

Esta es la configuración de la plantilla, con dos escenas de ejemplo más (MenuScene y UIScene) para mostrar cómo se registran. Pon las medidas en constantes para usarlas en todo el código:

```ts
// src/constantes.ts
export const ANCHO = 720;
export const ALTO = 1280;

export const Escenas = {
  Boot: 'Boot',
  Menu: 'Menu',
  Game: 'Game',
  UI: 'UI',
} as const;
```

```ts
// src/main.ts
import Phaser from 'phaser';
import { ALTO, ANCHO } from './constantes';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import './style.css';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,          // WebGL (Canvas está obsoleto en Phaser 4)
  parent: 'game',             // <div id="game"> de index.html
  backgroundColor: '#1d1d2b',
  scale: {
    mode: Phaser.Scale.FIT,   // encaja 720x1280 en cualquier pantalla
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: ANCHO,
    height: ALTO,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scene: [BootScene, MenuScene, GameScene, UIScene], // la primera arranca sola
};

new Phaser.Game(config);
```

Si el juego es pixel art, añade `pixelArt: true`. En Phaser 4 `roundPixels` viene desactivado por defecto (en Phaser 3 estaba activado); actívalo con `roundPixels: true` si ves sprites borrosos.

### Ciclo de vida de una escena

Phaser llama a estos métodos en orden:

1. `constructor()` — solo registra la clave con `super(Escenas.Game)`.
2. `init(data)` — recibe datos de la escena anterior. **Reinicia aquí el estado de la partida**: la misma instancia se reutiliza al reiniciar.
3. `preload()` — carga imágenes, sonidos y mapas. Phaser espera a que terminen.
4. `create(data)` — crea los objetos: jugador, enemigos, colisiones, controles.
5. `update(time, delta)` — cada frame (unas 60 veces por segundo; 120 en móviles de 120 Hz). `delta` son los milisegundos desde el frame anterior.

```ts
import Phaser from 'phaser';
import { Escenas } from '../constantes';

export class NivelScene extends Phaser.Scene {
  private nivel = 1;

  constructor() {
    super(Escenas.Game);
  }

  init(data: { nivel?: number }) {
    this.nivel = data.nivel ?? 1;
  }

  preload() {
    this.load.image('fondo', 'assets/fondo.png');
  }

  create() {
    const { width, height } = this.scale; // 720 x 1280
    this.add.image(width / 2, height / 2, 'fondo');
  }

  update(_time: number, delta: number) {
    const segundos = delta / 1000; // mueve cosas "por segundo", no "por frame"
    this.cameras.main.scrollY += 50 * segundos; // 50 px por segundo
  }
}
```

### Cambiar y combinar escenas

| Método | Qué hace | Uso típico |
| --- | --- | --- |
| `this.scene.start(Escenas.Game, { nivel: 2 })` | Detiene la escena actual y arranca otra | Menú → nivel, nivel → siguiente |
| `this.scene.launch(Escenas.UI)` | Arranca otra escena en paralelo, encima | HUD con vidas y puntos |
| `this.scene.pause()` / `resume()` | Congela la lógica, sigue dibujando | Menú de pausa |
| `this.scene.sleep()` / `wake()` | Ni actualiza ni dibuja, conserva el estado | Inventario a pantalla completa |
| `this.scene.restart()` | Reinicia la escena actual | Reintentar tras perder |
| `this.scene.stop(Escenas.UI)` | Detiene una escena | Cerrar el HUD |

Los archivos de `public/assets/` se cargan como `assets/...`. Mantén `base: './'` en `vite.config.ts`: Capacitor lo necesita para encontrar los archivos dentro de la app.

## Las piezas del juego

Todo lo que aparece en pantalla se crea con `this.add` (sin física) o `this.physics.add` (con física), dentro de `create()`.

### Cargar assets

```ts
preload() {
  this.load.image('fondo', 'assets/fondo.png');
  this.load.spritesheet('heroe', 'assets/heroe.png', { frameWidth: 64, frameHeight: 64 });
  this.load.atlas('enemigos', 'assets/enemigos.png', 'assets/enemigos.json');
  this.load.audio('salto', ['assets/salto.ogg', 'assets/salto.mp3']);
  this.load.tilemapTiledJSON('nivel1', 'assets/nivel1.json');

  this.load.on('progress', (p: number) => console.log(`Cargando ${Math.round(p * 100)}%`));
}
```

Carga todo en `BootScene` (como ya hace la plantilla) y luego pasa al juego. Para generar texturas sin archivos usa `this.make.graphics(...)` + `generateTexture()`. `Create.GenerateTexture` y `TextureManager.generate` ya no existen en Phaser 4.

### Imágenes, sprites y animaciones

```ts
const { width, height } = this.scale;
this.add.image(width / 2, height / 2, 'fondo');
const heroe = this.add.sprite(width / 2, height - 200, 'heroe', 0);

if (!this.anims.exists('correr')) {       // las animaciones son globales
  this.anims.create({
    key: 'correr',
    frames: this.anims.generateFrameNumbers('heroe', { start: 0, end: 5 }),
    frameRate: 10,
    repeat: -1,                             // bucle infinito
  });
}

heroe.play('correr');
heroe.setFlipX(true);
heroe.setScale(2).setDepth(10).setAlpha(0.9);

// Tinte en Phaser 4: color y modo van por separado
heroe.setTint(0xff0000).setTintMode(Phaser.TintModes.FILL); // destello rojo al recibir daño
heroe.clearTint();
```

`setTintFill()` ya no hace nada en Phaser 4. Usa `setTint(color).setTintMode(Phaser.TintModes.FILL)`.

### Input táctil (lo principal en este juego)

En Phaser, ratón y dedo son lo mismo: un `Pointer`. Lo que funciona con el dedo funciona también con el ratón en el PC.

```ts
this.input.addPointer(1); // permite 2 dedos a la vez (1 por defecto + 1)

// Tocar en cualquier parte
this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
  console.log('Toque en', p.worldX, p.worldY);
});

// Botón: área de toque grande (al menos 88 px en 720x1280)
const boton = this.add
  .text(width - 40, 40, 'Pausa', { fontFamily: 'sans-serif', fontSize: '36px', color: '#ffffff' })
  .setOrigin(1, 0)
  .setPadding(16)
  .setInteractive({ useHandCursor: true });
boton.on('pointerdown', () => this.scene.pause());

// Arrastrar un objeto
const ficha = this.add.image(200, 600, 'enemigos', 'slime').setInteractive({ draggable: true });
ficha.on('drag', (_p: Phaser.Input.Pointer, x: number, y: number) => ficha.setPosition(x, y));

// Swipe sencillo
this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
  const dx = p.upX - p.downX;
  if (Math.abs(dx) > 80 && p.getDuration() < 300) {
    console.log(dx > 0 ? 'swipe derecha' : 'swipe izquierda');
  }
});
```

Usa `p.worldX` / `p.worldY` (coordenadas del juego, ya escaladas a 720x1280) en lugar de las de la pantalla del móvil.

### Teclado (opcional, para probar en el PC)

En móvil `this.input.keyboard` puede ser `null`, por eso va con `?.`:

```ts
private teclaEspacio?: Phaser.Input.Keyboard.Key;

create() {
  this.teclaEspacio = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
}

update() {
  if (this.teclaEspacio && Phaser.Input.Keyboard.JustDown(this.teclaEspacio)) {
    // se pulsa una sola vez
  }
}
```

### Física Arcade

Arcade es la física sencilla y rápida: cajas y círculos, gravedad, velocidad y rebote. La configuración tiene gravedad 0 (buena para juegos verticales tipo arcade); añádela por objeto si la necesitas.

```ts
const jugador = this.physics.add.sprite(width / 2, height - 300, 'heroe');
jugador.setCollideWorldBounds(true);
jugador.setBounce(0.1);
jugador.setVelocityX(160);                    // píxeles por segundo
jugador.body.setSize(40, 56).setOffset(12, 8); // caja de colisión más ajustada
jugador.body.setGravityY(900);                // gravedad solo para este objeto

const plataformas = this.physics.add.staticGroup(); // no se mueven
plataformas.create(width / 2, height - 40, 'suelo').setScale(4, 1).refreshBody();

const monedas = this.physics.add.group({ allowGravity: false });
const enSuelo = jugador.body.blocked.down;
```

### Colisiones y solapamientos

```ts
// collider: chocan y se bloquean
this.physics.add.collider(jugador, plataformas);

// overlap: se atraviesan, pero ejecuta una función
this.physics.add.overlap(jugador, monedas, (_j, moneda) => {
  (moneda as Phaser.Physics.Arcade.Sprite).disableBody(true, true);
  this.puntos += 10;
});
```

### Cámaras

```ts
this.physics.world.setBounds(0, 0, width, 6000);  // mundo más alto que la pantalla
this.cameras.main.setBounds(0, 0, width, 6000);
this.cameras.main.startFollow(jugador, true, 0.1, 0.1); // seguimiento suave
this.cameras.main.setZoom(1.5);
this.cameras.main.shake(200, 0.01);   // temblor
this.cameras.main.fadeOut(500);       // fundido a negro
```

Los textos de interfaz no deben moverse con la cámara: `texto.setScrollFactor(0)`, o mejor, ponlos en una `UIScene` aparte.

### Filtros (sustituyen a preFX, postFX y máscaras)

En Phaser 4 los efectos se llaman **filtros** y funcionan en cualquier objeto o cámara. `internal` afecta solo al objeto; `external`, a su entorno.

```ts
heroe.enableFilters();
heroe.filters?.internal.addGlow(0xffff00, 4);      // brillo amarillo
this.cameras.main.filters.external.addBlur();     // desenfoque de toda la escena (pausa)
```

No existen `preFX`, `postFX` ni `BitmapMask`; las máscaras se hacen con `filters.internal.addMask(...)`.

### Tilemaps (niveles hechos con Tiled)

Diseña el nivel en [Tiled](https://www.mapeditor.org), expórtalo como JSON y cárgalo:

```ts
const mapa = this.make.tilemap({ key: 'nivel1' });
const tiles = mapa.addTilesetImage('nombreEnTiled', 'tiles'); // puede ser null
if (tiles) {
  const suelo = mapa.createLayer('Suelo', tiles, 0, 0);
  suelo?.setCollisionByProperty({ colisiona: true });
  if (suelo) this.physics.add.collider(jugador, suelo);
}
const inicio = mapa.findObject('Objetos', (o) => o.name === 'inicio');
```

El primer argumento de `addTilesetImage` debe coincidir con el nombre del tileset en Tiled.

### Sonido

```ts
this.sound.play('salto', { volume: 0.5 });

const musica = this.sound.add('musica', { loop: true, volume: 0.3 });
musica.play();
this.sound.mute = true; // silenciar todo
```

Los navegadores y WebView de móvil bloquean el audio hasta el primer toque. Por eso conviene empezar con una pantalla "Toca para empezar".

### Texto, temporizadores, tweens y vectores

```ts
const marcador = this.add.text(32, 32, 'Puntos: 0', {
  fontFamily: 'sans-serif',
  fontSize: '36px',
  color: '#ffffff',
});
marcador.setText(`Puntos: ${this.puntos}`);

this.time.delayedCall(1000, () => console.log('1 segundo después'));
this.time.addEvent({ delay: 2000, loop: true, callback: () => console.log('cada 2 s') });

this.tweens.add({ targets: ficha, y: ficha.y - 20, duration: 600, yoyo: true, repeat: -1 });

const dir = new Phaser.Math.Vector2(3, 4).normalize(); // Geom.Point ya no existe
```

Cuidado con `Phaser.Math.TAU`: en Phaser 4 vale 2π (en Phaser 3 valía π/2). Para π/2 usa `Phaser.Math.PI_OVER_2`.

## Arquitectura: cómo organizar el código cuando crece

La regla principal: las escenas coordinan y las entidades se gobiernan solas. Si una escena pasa de unas 300 líneas, mueve lógica a clases.

### Estructura de carpetas

```text
bubble-sort/
├─ public/assets/        imágenes, sonidos, mapas JSON
├─ src/
│  ├─ main.ts            GameConfig y new Phaser.Game
│  ├─ constantes.ts      medidas, claves de escenas y eventos
│  ├─ tipos.ts           interfaces compartidas
│  ├─ scenes/            BootScene, GameScene, UIScene...
│  ├─ entidades/         Jugador, Enemigo, Bala...
│  └─ sistemas/          guardado, audio, oleadas...
├─ capacitor.config.ts
└─ vite.config.ts
```

### Entidades: clases que extienden Sprite

El patrón es: heredar de `Phaser.Physics.Arcade.Sprite`, añadirse a la escena en el constructor y exponer métodos con la lógica propia. Ejemplo de una entidad que sigue el dedo en horizontal:

```ts
// src/entidades/Jugador.ts
import Phaser from 'phaser';

export class Jugador extends Phaser.Physics.Arcade.Sprite {
  private velocidadMax = 1400;

  constructor(escena: Phaser.Scene, x: number, y: number) {
    super(escena, x, y, 'jugador');
    escena.add.existing(this);          // dibujarlo
    escena.physics.add.existing(this);  // darle física
    this.setCollideWorldBounds(true);
  }

  seguir(objetivoX: number) {
    const distancia = objetivoX - this.x;
    if (Math.abs(distancia) < 4) {
      this.setVelocityX(0);
      return;
    }
    this.setVelocityX(Phaser.Math.Clamp(distancia * 12, -this.velocidadMax, this.velocidadMax));
  }
}
```

En la escena: `this.jugador = new Jugador(this, x, y)` en `create()` y `this.jugador.seguir(this.objetivoX)` en `update()`, guardando `objetivoX` desde `pointerdown` / `pointermove`.

### Estado compartido: el registry

`this.registry` es un almacén global que ven todas las escenas y avisa cuando algo cambia. Es la forma más simple de conectar el juego con el HUD:

```ts
// GameScene
init() {
  this.registry.set('puntos', 0);   // reiniciar en init(), no en el constructor
  this.registry.set('vidas', 3);
}
// ...al recoger algo:
this.registry.inc('puntos', 10);

// UIScene
create() {
  const texto = this.add.text(32, 48, '', { fontFamily: 'sans-serif', fontSize: '36px' });
  const pintar = () => texto.setText(`Puntos: ${this.registry.get('puntos')}`);

  pintar();
  this.registry.events.on('changedata', pintar);
  // Quitar el listener al cerrar la escena, o se duplicará en cada partida
  this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    this.registry.events.off('changedata', pintar);
  });
}
```

Para lanzar el HUD sin duplicarlo al reiniciar: `if (!this.scene.isActive(Escenas.UI)) this.scene.launch(Escenas.UI);`.

### Eventos entre escenas

Para avisos puntuales ("nivel completado", "jefe derrotado"), emite eventos desde una escena y escúchalos en otra:

```ts
// GameScene
this.events.emit('nivel-completado', this.nivel);

// UIScene
const juego = this.scene.get(Escenas.Game);
const alCompletar = (nivel: number) => console.log(`Nivel ${nivel} superado`);
juego.events.on('nivel-completado', alCompletar);
this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => juego.events.off('nivel-completado', alCompletar));
```

### Guardar la partida

`localStorage` funciona en el navegador y dentro de la app de Capacitor:

```ts
// src/sistemas/guardado.ts
import type { Partida } from '../tipos';

export function guardar(p: Partida): void {
  localStorage.setItem('partida', JSON.stringify(p));
}

export function cargar(): Partida | null {
  const datos = localStorage.getItem('partida');
  return datos ? (JSON.parse(datos) as Partida) : null;
}
```

Para datos que no deben perderse en móvil (el sistema puede borrar el almacenamiento web), usa el plugin `@capacitor/preferences` en la versión 8.x, la misma mayor que `@capacitor/core`.

### Grupos como pool de objetos

Para balas, monedas o enemigos que aparecen muchas veces, reutiliza objetos en vez de crearlos y destruirlos:

```ts
this.estrellas = this.physics.add.group({ maxSize: 20 });

const e = this.estrellas.get(x, -40, 'estrella') as Phaser.Physics.Arcade.Image | null;
if (e) {                                   // null = no quedan libres
  e.enableBody(true, x, -40, true, true);  // reactivar uno reciclado
  e.setVelocity(0, 400);
}

// Al recogerla o al salir de pantalla, devolverla al pool:
e?.disableBody(true, true);
```

## Phaser 3 → Phaser 4: qué cambia al copiar tutoriales

Si un tutorial o una respuesta de internet usa algo de la columna izquierda, es de Phaser 3 y en este proyecto fallará o no hará nada. Fuente: la guía de migración incluida en `node_modules/phaser/changelog/v4/4.0/MIGRATION-GUIDE.md`.

| Phaser 3 | Phaser 4 |
| --- | --- |
| `sprite.setTintFill(0xff0000)` | `sprite.setTint(0xff0000).setTintMode(Phaser.TintModes.FILL)` |
| `sprite.preFX.addGlow()` / `postFX` | `sprite.enableFilters(); sprite.filters?.internal.addGlow()` |
| `new Phaser.Display.Masks.BitmapMask(...)` | `sprite.filters?.internal.addMask(objeto)` |
| `Phaser.Geom.Point` | `Phaser.Math.Vector2` |
| `Phaser.Math.TAU` (π/2) | `Phaser.Math.PI_OVER_2`; `TAU` ahora es 2π |
| `Phaser.Math.PI2` | `Phaser.Math.TAU` |
| `Phaser.Struct.Set` / `Map` | `Set` / `Map` nativos de JavaScript |
| `sprite.setPipeline('Light2D')` | `sprite.setLighting(true)` |
| `roundPixels` activado por defecto | Desactivado por defecto: actívalo en la config si hace falta |
| `RenderTexture.draw()` dibuja al momento | Hay que llamar a `render()` después de dibujar |
| `Mesh`, `Plane`, Camera3D | Eliminados |
| Pipelines WebGL propios | Render nodes (solo si haces shaders avanzados) |

Lo que **no** cambia: escenas, carga de assets, sprites, animaciones, input, física Arcade, tilemaps, sonido, tweens y temporizadores.

## Errores comunes, depuración y publicación

La mayoría de fallos vienen de claves mal escritas, de usar algo antes de crearlo o de código de Phaser 3.

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| Cuadro verde con raya en lugar de la imagen | La clave o la ruta del asset no coincide | Revisa la consola (404) y que la clave sea idéntica en `load` y `add` |
| `Property 'preFX' does not exist` (u otro método) | Código de Phaser 3 | Busca el equivalente en la tabla de migración |
| El objeto atraviesa a otro | Falta el `collider` o no tiene física | `this.physics.add...` o `physics.add.existing(this)` |
| Va más rápido en móviles de 120 Hz | Mueves con valores fijos por frame | Usa velocidades de física o multiplica por `delta / 1000` |
| El HUD o los eventos se duplican al reiniciar | Listeners no eliminados | `off` en el evento `SHUTDOWN` de la escena |
| No suena el audio en móvil | Sin toque previo del usuario | Empieza con "Toca para empezar" |
| Valores de la partida anterior | Estado inicializado en el constructor | Reinicia el estado en `init()` |
| Pantalla en blanco dentro de la app Android | Rutas absolutas en el build | Mantén `base: './'` en `vite.config.ts` |

Los errores de compilación de TypeScript están en [guia-typescript.md](./guia-typescript.md#errores-de-typescript-frecuentes).

### Depurar

- `arcade: { debug: true }` en la configuración muestra cajas de colisión y velocidades.
- DevTools del navegador (F12) con el modo dispositivo para simular el móvil en vertical. Vite genera source maps, así que verás el código TypeScript.
- `npx tsc --noEmit` muestra todos los errores de tipos de una vez.
- Rendimiento: `this.game.loop.actualFps`.
- Dentro de la app Android: abre `chrome://inspect` en el PC con el móvil conectado por USB para ver la consola del WebView.

### Compilar y publicar

```bash
npm run build          # tsc + vite build → dist/
npm run preview        # probar la versión final en local
npm run cap:android    # build + sincronizar + abrir Android Studio
```

Para web, sube el contenido de `dist/` a [itch.io](https://itch.io) (como juego HTML en un .zip), GitHub Pages o Netlify. Para instalar plugins de Capacitor, usa siempre la misma versión mayor que `@capacitor/core` (8): por ejemplo `npm i @capacitor/preferences@^8`.

### Recursos (todos de Phaser 4)

- [Documentación de Phaser](https://docs.phaser.io): comprueba que la página diga Phaser 4.
- [Ejemplos de Phaser](https://phaser.io/examples): cada ejemplo indica la versión; fíate de los de v4.
- En el proyecto: `node_modules/phaser/types/phaser.d.ts` (todas las clases y métodos), `node_modules/phaser/changelog/v4/` (cambios por versión) y las skills de `.claude/skills/`.
- [Tiled](https://www.mapeditor.org) para diseñar niveles y [Kenney](https://kenney.nl/assets) para assets gratuitos.
