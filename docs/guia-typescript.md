# Guía de TypeScript 6 para el juego

Manual de referencia de TypeScript para este proyecto. Todos los fragmentos se han compilado con el `tsconfig.json` del repo y `npm run build`. La guía de Phaser está en [guia-phaser.md](./guia-phaser.md).

## Stack del proyecto

| Herramienta | Versión instalada | Para qué sirve |
| --- | --- | --- |
| Phaser | 4.2.1 | Motor: render WebGL, escenas, física Arcade, input, sonido |
| TypeScript | 6.0.3 | Tipos y detección de errores antes de ejecutar |
| Vite | 8.3.5 | Servidor de desarrollo y build a `dist/` |
| Capacitor | 8.5.3 | Empaquetar el juego como app Android/iOS |
| Node.js | 22.12 o superior | Vite 8 pide ^20.19 o ≥22.12; Capacitor 8 pide ≥22 |

El juego es **vertical, 720×1280, escalado con `Scale.FIT` y pensado para móvil**.

Reglas para no mezclar versiones:

- Muchos tutoriales en internet son de **Phaser 3**. Revisa la sección *Phaser 3 → Phaser 4* de la guía de Phaser antes de copiar código ajeno.
- La referencia fiable es la que ya está instalada: los tipos en `node_modules/phaser/types/phaser.d.ts` y la guía de migración en `node_modules/phaser/changelog/v4/4.0/MIGRATION-GUIDE.md`.
- No actualices de versión mayor (`phaser@5`, `vite@9`…) sin probar: usa `npm ci` para instalar exactamente lo que fija `package-lock.json`.

## TypeScript 6 para el juego

TypeScript es JavaScript con tipos: el editor te avisa si pasas un texto donde va un número o llamas a un método que no existe. El navegador nunca ve TypeScript; Vite lo convierte a JavaScript.

### Lo que exige el tsconfig.json

El proyecto usa TypeScript 6 con opciones estrictas. Estas son las que más notarás:

| Opción | Qué implica | Qué hacer |
| --- | --- | --- |
| `strict` (activo por defecto en TS 6) | No hay `any` implícito y `null` debe comprobarse | Tipa los parámetros y usa `?.` y `??` |
| `erasableSyntaxOnly` | Prohibidos `enum`, `namespace` y `constructor(public x)` | Usa objetos `as const` y asigna propiedades a mano |
| `verbatimModuleSyntax` | Los tipos se importan con `import type` | `import type { Partida } from './tipos'` |
| `noUnusedLocals` / `noUnusedParameters` | Error si algo no se usa | Prefija con `_` los parámetros que no uses: `_time` |

### Variables y tipos básicos

```ts
let vidas: number = 3;          // número (enteros y decimales)
const nombre: string = 'Kira';  // texto
let enSuelo: boolean = false;   // verdadero / falso
const puntos = 0;               // el tipo se infiere: number

const enemigos: string[] = ['slime', 'murciélago'];  // array
const posicion: [number, number] = [100, 200];       // tupla
```

Usa `const` siempre que el valor no cambie y `let` cuando sí; nunca `var`. El proyecto usa comillas simples.

### Funciones

```ts
function calcularDanio(base: number, multiplicador = 1): number {
  return base * multiplicador;
}

const curar = (vida: number, cantidad: number): number => Math.min(vida + cantidad, 100);

function log(mensaje: string, nivel?: 'info' | 'error'): void {
  console.log(nivel ?? 'info', mensaje); // nivel es opcional
}
```

### Interfaces y tipos

```ts
interface EstadisticasEnemigo {
  nombre: string;
  vida: number;
  velocidad: number;
  vuela?: boolean;       // opcional
  readonly id: number;   // no se puede reasignar
}

type Direccion = 'izquierda' | 'derecha' | 'arriba' | 'abajo';

const slime: EstadisticasEnemigo = { id: 1, nombre: 'Slime', vida: 20, velocidad: 60 };
```

### Clases (sin propiedades en el constructor)

Con `erasableSyntaxOnly`, el atajo `constructor(public nombre: string)` da error. Declara la propiedad y asígnala:

```ts
class Personaje {
  nombre: string;
  private vida: number;        // solo dentro de la clase
  protected velocidad = 160;   // también en clases hijas

  constructor(nombre: string, vidaInicial: number) {
    this.nombre = nombre;
    this.vida = vidaInicial;
  }

  recibirDanio(cantidad: number): void {
    this.vida = Math.max(0, this.vida - cantidad);
  }

  get estaVivo(): boolean {
    return this.vida > 0;
  }
}

class Mago extends Personaje {
  constructor() {
    super('Mago', 60);
    this.velocidad = 120;
  }
}
```

### Estados sin enum

`enum` está prohibido en el proyecto. Usa un objeto `as const` y un tipo derivado de él:

```ts
const EstadoJugador = {
  Quieto: 'quieto',
  Corriendo: 'corriendo',
  Saltando: 'saltando',
  Muerto: 'muerto',
} as const;

type EstadoJugador = (typeof EstadoJugador)[keyof typeof EstadoJugador];

let estado: EstadoJugador = EstadoJugador.Quieto;
estado = 'saltando'; // también vale el texto literal
```

### Uniones discriminadas

Ideales para eventos del juego: TypeScript sabe qué campos hay en cada caso.

```ts
type Evento =
  | { tipo: 'danio'; cantidad: number }
  | { tipo: 'curar'; cantidad: number }
  | { tipo: 'morir' };

function procesar(e: Evento): string {
  switch (e.tipo) {
    case 'danio': return `-${e.cantidad}`;
    case 'curar': return `+${e.cantidad}`;
    case 'morir': return 'fin';
  }
}
```

### Genéricos

```ts
class Pool<T> {
  private libres: T[] = [];
  private crear: () => T;

  constructor(crear: () => T) {
    this.crear = crear;
  }

  obtener(): T {
    return this.libres.pop() ?? this.crear();
  }

  devolver(obj: T): void {
    this.libres.push(obj);
  }
}
```

En Phaser casi nunca necesitarás tu propio pool: los grupos de Arcade ya lo hacen (ver *Arquitectura* en la guía de Phaser).

### Null y undefined

```ts
function atacar(objetivo: Personaje | null): boolean {
  objetivo?.recibirDanio(10);          // solo llama si no es null
  return objetivo?.estaVivo ?? false;  // valor por defecto
}

// En Phaser: propiedades que se asignan en create(), no en el constructor
private jugador!: Jugador; // "!" = prometo que se asignará antes de usarla
```

### Módulos: un archivo por cosa

El proyecto usa exportaciones con nombre (`export class BootScene`), no `export default`. Sigue ese estilo:

```ts
// src/tipos.ts
export interface Partida {
  nivel: number;
  record: number;
}

// src/entidades/Jugador.ts
export class Jugador extends Phaser.Physics.Arcade.Sprite { /* ... */ }

// src/scenes/GameScene.ts
import { Jugador } from '../entidades/Jugador';
import type { Partida } from '../tipos'; // solo tipos → import type
```

Para ver todos los errores de tipos de una vez: `npx tsc --noEmit`. `npm run build` ya lo hace antes de compilar.

### Errores de TypeScript frecuentes

| Mensaje | Causa | Solución |
| --- | --- | --- |
| `This syntax is not allowed when 'erasableSyntaxOnly' is enabled` | Usaste `enum`, `namespace` o `constructor(public x)` | Objeto `as const` y propiedades asignadas a mano |
| `must be imported using a type-only import` | Importaste un tipo sin `import type` | `import type { MiTipo } from '...'` |
| `'x' is declared but never used` | `noUnusedLocals` / `noUnusedParameters` | Bórralo o prefija el parámetro con `_` |
| `Parameter 'x' implicitly has an 'any' type` | Falta el tipo de un parámetro | Añade el tipo: `(p: Phaser.Input.Pointer) => ...` |
| `Object is possibly 'null'` | Un valor puede no existir | Comprueba con `if`, `?.` o `??` |

## Recursos

- [Manual de TypeScript](https://www.typescriptlang.org/docs/handbook/intro.html)
