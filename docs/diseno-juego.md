# Diseño de Odi Sort

Juego de ordenar colores en tubos para móvil, en vertical. Partimos del documento de requisitos original (pensado para JavaScript sin motor y HTML/CSS); aquí quedan las reglas y las decisiones adaptadas al stack real: **Phaser 4 + TypeScript**, 60 fps, adaptable a cualquier pantalla y siempre en vertical.

## Decisiones tomadas

| Tema | Decisión |
| --- | --- |
| Modos de juego | **Un único modo** con todas las mecánicas activas (no hay selector de modos) |
| Flujo | Menú → **Jugar** → partida directamente |
| Niveles | **Aleatorios** (generados por procedimiento) |
| Giro de gravedad | **Habilidad**, no modo: se recarga al ir sumando puntos en cada nivel y se muestra con una **barra**; una sola carga |
| Lluvia | Empieza al 35 % de completado el nivel (contado en bolas bien colocadas) |
| Sin salida | Si no queda ninguna jugada válida y la Gravedad no está cargada → derrota («No quedan movimientos») |
| Nivel superado | Todos los tubos ordenados |
| Plataforma | Navegador móvil y APK con Capacitor; siempre vertical |

## Regla base

- Estado: matriz de tubos, p. ej. `[['rojo', 'azul'], ['verde', 'amarillo', 'verde', 'amarillo'], [], []]`.
- Capacidad máxima por tubo: 4.
- Mover: el tubo de origen no puede estar vacío; el destino debe tener menos de 4 y estar vacío o tener arriba el mismo color.
- Mutación: se sacan del origen las bolas iguales de arriba (tantas como quepan) y se añaden al destino; después se actualiza la vista.

## Mecánicas (todas activas en el mismo modo)

- **Alquimia (fusión):** diccionario de combinaciones (`'amarillo_azul' → 'verde'`). Si dos colores distintos tienen fusión, en vez de rechazar el movimiento se quitan ambos y se pone el resultado.
- **Niebla:** el estado no cambia; en la vista solo se ve el color de arriba de cada tubo, el resto se dibuja oculto.
- **Giro de gravedad (habilidad):** invierte todos los tubos (`tubo.reverse()`) con una animación de rotación de 180°. Se carga con los puntos del nivel; barra visible en la parte inferior.
- **Lluvia:** caen colores a tubos aleatorios con el tiempo; 4 iguales en un tubo suman puntos y lo vacían; si cae en un tubo lleno, se pierde.

## Pantallas

1. **Menú:** Jugar, Ajustes (engranaje, esquina inferior derecha) y, más adelante, Vestidor/Tienda.
2. **Partida:** arriba pausa, monedas y puntos; en el centro los tubos; abajo la barra y el botón de Giro de gravedad.
3. **Vestidor/Tienda:** arriba el avatar por capas (cuerpo, ropa, ojos, cabeza); abajo cuadrícula con pestañas y objetos bloqueados/desbloqueados.

## Guardado

Partida, economía e inventario en `localStorage` (como ya hacen los ajustes), con este esquema:

```ts
interface Guardado {
  monedas: number;
  inventario: { ropa: string[]; ojos: string[]; cabeza: string[] };
  equipado: { ropa: string; ojos: string; cabeza: string };
  record: number;
}
```

## Reglas concretas (implementadas)

| Tema | Regla |
| --- | --- |
| Mover | Se mueve el **grupo** de bolas seguidas del mismo color de arriba, tantas como quepan en el destino (las ocultas del grupo se mueven y se revelan). Las fusiones son de una en una |
| Tubo completo | 4 bolas del mismo color → el tubo **se sella** (tapón de color, ya no se puede tocar) · +100 pts |
| Nivel superado | En cuanto todos los tubos están sellados o vacíos. Si aún no ha caído ninguna gota, la lluvia pendiente se cancela; si ya cayeron, esas bolas también deben estar en tubos sellados (con una tanda a medias no se puede completar) |
| Lluvia | Empieza al llevar resuelto el **35 %** del nivel, contado en **bolas bien colocadas** (las de cada color apiladas desde el fondo de un tubo; si varios tubos empiezan por el mismo color, cuenta el mejor). Se mide el avance desde el inicio: las bolas que ya estaban bien por azar al empezar no cuentan. Caen tandas de 4 bolas de un color nuevo, una cada pocos segundos, en un tubo al azar con hueco. Si no queda hueco → derrota |
| Alquimia | Algunas bolas llegan "partidas" en dos ingredientes (anillo blanco). Ingrediente sobre ingrediente de su receta → se fusionan en el color resultado · +25 pts |
| Niebla | Las bolas ocultas se ven como «?» y se revelan al quedar arriba (y se quedan reveladas) |
| Puntos | Bola colocada sobre una de su mismo color +10 (cada bola solo puntúa la primera vez en el nivel) · sellar +100 · fusionar +25 |
| Giro de gravedad | Barra que se llena con **150 pts** de los de arriba (una sola carga, se vacía al usarla y al empezar nivel). Invierte todos los tubos sin sellar |
| Deshacer | 5 por nivel: deshace la última jugada (movimiento o giro de gravedad) devolviendo tubos, puntos, barra y lluvia a como estaban. Disponible también en el diálogo de derrota |
| Reiniciar | La configuración inicial de cada nivel se guarda al generarlo (también tras cerrar el juego). «Reiniciar nivel» la vuelve a cargar igual; «Nivel nuevo» genera otra con el mismo número |
| Recompensa | 5 + puntos/10 monedas al superar el nivel; el progreso se guarda |

Dificultad por nivel (`src/juego/niveles.ts` → `configNivel`): de 3 a 7 colores, 0–2 fusiones, niebla del 0 % al 60 %, 1–2 tandas de lluvia y lluvia más rápida. Cada nivel se genera al azar y se comprueba con un solucionador que tiene solución.
