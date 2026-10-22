# Diseño de Odi Sort

Juego de ordenar colores en tubos para móvil, en vertical. Partimos del documento de requisitos original (pensado para JavaScript sin motor y HTML/CSS); aquí quedan las reglas y las decisiones adaptadas al stack real: **Phaser 4 + TypeScript**, 60 fps, adaptable a cualquier pantalla y siempre en vertical.

## Decisiones tomadas

| Tema | Decisión |
| --- | --- |
| Modos de juego | **Un único modo** con todas las mecánicas activas (no hay selector de modos) |
| Flujo | Menú → **Jugar** → partida directamente |
| Niveles | **Aleatorios** (generados por procedimiento) |
| Giro de gravedad | **Habilidad**, no modo: se recarga al ir sumando puntos en cada nivel y se muestra con una **barra** |
| Plataforma | Navegador móvil y APK con Capacitor; siempre vertical |

## Regla base

- Estado: matriz de tubos, p. ej. `[['rojo', 'azul'], ['verde', 'amarillo', 'verde', 'amarillo'], [], []]`.
- Capacidad máxima por tubo: 4.
- Mover: el tubo de origen no puede estar vacío; el destino debe tener menos de 4 y estar vacío o tener arriba el mismo color.
- Mutación: `pop()` en origen y `push()` en destino, y después actualizar la vista.

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

## Preguntas abiertas

- ¿Cómo conviven la **Lluvia** (tiempo real) con los niveles? ¿Llueve durante todo el nivel, a partir de cierto nivel, o es un evento?
- ¿Qué se considera **nivel superado**: todos los tubos ordenados, o alcanzar una puntuación?
- ¿Cuántos puntos llenan la barra del Giro de gravedad y cuántas cargas se pueden acumular?
