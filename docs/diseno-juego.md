# Odi Sort — Diseño del juego

Juego de ordenar bolas de colores en tubos, para móvil y siempre en vertical. Se juega en el
navegador (GitHub Pages) y como app Android (Capacitor). Este documento describe **todo lo
jugable**: reglas, mecánicas, puntuación, ayudas, pantallas y decisiones tomadas. La parte
técnica está en [tecnico.md](./tecnico.md).

> Origen: partimos de un documento de requisitos pensado para JavaScript sin motor y HTML/CSS.
> Las ideas se adaptaron a **Phaser 4 + TypeScript**; las decisiones de abajo mandan sobre aquel
> documento.

## Resumen en una frase

Ordena cada color en su tubo antes de que la lluvia te llene los huecos, ayudándote de fusiones,
del giro de gravedad y de las ayudas que compras en la tienda (deshacer y tubo extra).

## Decisiones de diseño

| Tema | Decisión |
| --- | --- |
| Modos | **Un único modo** con todas las mecánicas activas (no hay selector de modos) |
| Flujo | Menú → **Jugar** → partida directamente |
| Niveles | **Aleatorios**, generados por procedimiento y comprobados con un solucionador (siempre tienen solución) |
| Ganar | Al **sellar todos los colores iniciales** del nivel |
| Lluvia | Obstáculo: empieza al **35 %** del nivel y sus bolas no hay que ordenarlas |
| Giro de gravedad | **Habilidad** con barra de carga (150 pts), una sola carga por nivel |
| Deshacer | Se **compra** en la tienda; sin límite por nivel |
| Tubo de emergencia (tubo extra) | Un tubo de **1 hueco**; se **compra** en la tienda; **máximo uno por nivel** |
| Tienda | Precios altos a propósito: cada compra cuesta **varios niveles** de monedas |
| Plataformas | Navegador móvil y APK Android; **siempre en vertical**, adaptable a cualquier pantalla |

## Controles

- **Tocar un tubo** levanta su grupo de bolas de arriba (la de arriba se eleva).
- **Tocar otro tubo** las suelta allí si la jugada es válida.
- Si la jugada no vale y el tubo tocado tiene bolas, pasas a seleccionar ese tubo; si no, el
  tubo tiembla.
- Tocar el mismo tubo otra vez cancela la selección.

## Reglas

### Mover

- Se mueve el **grupo** de bolas seguidas del mismo color de arriba, **tantas como quepan** en el
  destino (con 3 rojas y 2 huecos se mueven 2).
- El destino debe estar **vacío** o tener arriba **el mismo color**.
- Las bolas ocultas que formen parte del grupo también viajan y se revelan.
- Los tubos tienen 4 huecos (el de emergencia, 1).

### Sellar tubos

- 4 bolas del mismo color en un tubo → el tubo **se sella**: se pinta de ese color, recibe un
  tapón y ya no se puede tocar. **+100 puntos**.
- Los ingredientes (ver Alquimia) nunca sellan.

### Ganar

- Se gana al **sellar todos los colores iniciales** del nivel.
- Las bolas de lluvia **no hay que ordenarlas**: pueden quedar en cualquier tubo. Al ganar, la
  lluvia pendiente se cancela.
- Una gota encima de un color sin sellar sí estorba: hay que apartarla para completarlo.

### Perder

- **¡Se desbordó!** — cae una gota y no queda ningún tubo con hueco.
- **Sin salida** — no queda ninguna jugada válida **y** no hay ayudas que puedan desbloquear la
  partida (Gravedad sin cargar y sin tubo extra disponible: comprado y sin usar en este nivel).
- En ambos casos el diálogo ofrece **Deshacer** (si tienes comprados), **Reiniciar nivel**, **Nivel
  nuevo**, **Tienda** y **Menú**. Si compras deshacer en la tienda, al volver aparece el botón.

## Mecánicas (todas activas a la vez)

### Lluvia

- Empieza cuando llevas resuelto el **35 % del nivel**, medido en **bolas bien colocadas**: las
  de cada color apiladas desde el fondo de un tubo (si varios tubos empiezan por el mismo color,
  cuenta el mejor). Se mide el **avance desde el inicio**: las bolas que ya estaban bien por azar
  al empezar (de media un 20–26 %) no cuentan.
- **Alerta de ~2,6 s** antes de la primera gota: sonido de alarma, la pantalla parpadea en rojo y
  ámbar y el aviso «¡Empieza a llover!» late. Después aparece el contador «Lluvia: N».
- Las bolas de lluvia caen **congeladas** (escarcha, grietas y borde helado, con un toque de su
  color) para distinguirlas del resto.
- Caen **tandas de 4 bolas de un color nuevo**, una cada pocos segundos, en un tubo al azar con
  hueco (también en el de emergencia).
- Es solo un obstáculo: ocupa huecos y tapa colores. Se pierde si una gota no encuentra sitio.

### Alquimia (fusión)

- Algunas bolas llegan "partidas" en dos **ingredientes** (bola con anillo blanco discontinuo).
- Ingrediente sobre ingrediente de su receta → se **fusionan** en el color resultado. **+25 pts**.
- Recetas: amarillo + azul = verde · rojo + amarillo = naranja · rojo + azul = morado.

### Niebla

- Algunas bolas empiezan ocultas (se ven como «?»).
- Se revelan al quedar arriba de su tubo y ya se quedan reveladas.

## Ayudas

| Ayuda | Cómo funciona | Límite |
| --- | --- | --- |
| **Giro de gravedad** | Invierte todos los tubos sin sellar (los tubos giran 180° y las bolas caen). La barra se llena con los puntos del nivel | 1 carga (150 pts), se vacía al usarla y al empezar nivel |
| **Deshacer** | Vuelve atrás la última jugada (movimiento o giro), con animación: las bolas hacen el camino de vuelta, las de lluvia suben al cielo, las fusionadas reaparecen. Devuelve también puntos, barra y lluvia | Los que compres; sin límite por nivel |
| **Tubo de emergencia** | Añade un tubo de **1 hueco** (borde naranja). Recibe bolas y lluvia; no gira con la gravedad. Usarlo no se puede deshacer | Los que compres; **máximo 1 por nivel** |

Con 0 usos, la insignia del botón muestra **«+»** y tocarlo abre la tienda (la partida queda en
pausa). Los usos comprados no caducan: se guardan entre niveles y al cerrar el juego.

## Tienda

| Artículo | Precio | Equivale a… |
| --- | --- | --- |
| Deshacer ×1 | **150** monedas | ~3–4 niveles al principio, ~1,5 a partir del 10 |
| Deshacer ×5 | **600** monedas (120 c/u, ahorras 150) | ~6–14 niveles |
| Tubo extra ×1 | **500** monedas | ~5–12 niveles |

- Se abre desde el **menú**, la **pausa**, la **derrota** o tocando una ayuda sin usos.
- Si no llegan las monedas, el precio sale en gris y al tocarlo dice cuántas faltan.
- Referencia de ingresos (nivel bien jugado): nivel 1 ≈ 42 monedas, 5 ≈ 70, 10+ ≈ 97.

## Puntuación y recompensas

| Acción | Puntos |
| --- | --- |
| Colocar una bola sobre otra de su color | **+10** (cada bola solo puntúa la primera vez en el nivel, para que no se pueda farmear moviéndola de un lado a otro) |
| Fusionar ingredientes | **+25** |
| Sellar un tubo | **+100** |

Al superar el nivel: **5 + puntos/10 monedas**. Los puntos también cargan la barra de Gravedad.

## Niveles y dificultad

Cada nivel se genera al azar y un solucionador comprueba que tiene solución (en milisegundos).
La dificultad sube con el número de nivel (`configNivel` en `src/juego/niveles.ts`):

| Nivel | Colores | Tubos | Fusiones | Niebla | Tandas de lluvia | Intervalo de lluvia |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 3 | 5 | 0 | 0 % | 1 | 5,8 s |
| 2 | 3 | 5 | 1 | 8 % | 1 | 5,6 s |
| 3 | 4 | 6 | 1 | 16 % | 1 | 5,4 s |
| 5 | 5 | 7 | 1 | 32 % | 1 | 5,0 s |
| 6 | 5 | 7 | 2 | 40 % | 1 | 4,8 s |
| 8 | 6 | 8 | 2 | 56 % | 2 | 4,4 s |
| 10 | 7 | 9 | 2 | 60 % | 2 | 4,0 s |
| 15+ | 7 | 9 | 2 | 60 % | 2 | 3,0 s → 2,5 s |

- **Reiniciar nivel**: misma configuración inicial (guardada al generar el nivel, también tras
  cerrar el juego). Los deshacer y tubos gastados no se devuelven.
- **Nivel nuevo**: otra configuración con el mismo número de nivel.
- Al ganar, «Siguiente» genera el nivel siguiente.

## Pantallas

1. **Menú**: título «Odi Sort», **Jugar**, **Tienda**, monedas (arriba a la derecha), nivel actual, versión y build (abajo a la izquierda) y
   **Ajustes** (engranaje, esquina inferior derecha).
2. **Partida**:
   - Arriba: pausa, nivel y puntos, monedas, contador de lluvia.
   - Centro: los tubos (1 fila hasta 5 tubos, 2 filas a partir de 6).
   - Abajo: **Deshacer** y **Tubo extra** (con los usos comprados, o «+»), barra y botón de
     **Gravedad**.
3. **Pausa**: Continuar · Reiniciar nivel · Nivel nuevo · Tienda · Ajustes · Menú.
4. **Victoria**: puntos y monedas ganadas · Siguiente · Menú.
5. **Derrota**: motivo · Deshacer (si tienes) · Reiniciar nivel · Nivel nuevo · Tienda · Menú.
6. **Tienda**: saldo, una tarjeta por oferta (icono, nombre, «Tienes: N», precio) y Volver.
7. **Ajustes**: volumen de música y de efectos (sliders) e idioma (de momento solo español).

## Aspecto y animaciones

Inspirado en un vídeo de referencia del usuario (solo tubos y animaciones; botones y fondo aún no).

- **Tubos de ensayo de cristal**: boca con reborde, fondo redondo, cristal translúcido azulado y
  brillo vertical. Sellado: el cristal se tiñe del color y lleva un **tapón** encajado. El de
  emergencia, igual pero bajo y con borde naranja.
- **Entrada del nivel**: los tubos llegan deslizándose desde la derecha, uno tras otro.
- **Seleccionar**: la bola sube y queda **flotando** suavemente.
- **Soltar**: las bolas se aplastan un instante al tocar fondo y el tubo **se balancea**. Si caen
  sobre su color, saltan **chispas** de ese color.
- **Fusión** y **sellado**: estallido de chispas; el tubo sellado da un saltito.
- **Gravedad**: unas flechas en círculo aparecen girando sobre los tubos mientras giran.
- **Lluvia**: la bola congelada se aplasta al caer y suelta escarcha.
- **Victoria**: los tubos saltan en ola con chispas antes del diálogo.

## Sonido y música

- **Efectos de vidrio** (sintetizados): seleccionar, mover, gota, sellar, fusión, error,
  gravedad, lluvia, victoria, derrota y botones. Los repetitivos varían un poco de tono.
- **Música**: solo durante la partida, canciones aleatorias y sin fin (nunca la misma dos veces
  seguidas). Se para en el menú. Sonido intencionadamente "degradado".
- Volúmenes independientes en Ajustes; al soltar el slider de efectos suena una muestra.

## Guardado (en el dispositivo)

- **Progreso**: nivel actual, mejor nivel, monedas e **inventario** (deshacer y tubos extra comprados).
- **Nivel en curso**: su configuración inicial (para reiniciarlo igual).
- **Ajustes**: volúmenes e idioma.

## Ideas pendientes (aún no implementadas)

- **Vestidor / Tienda**: avatar por capas (cuerpo, ropa, ojos, cabeza) que se compra con monedas;
  arriba la vista previa y abajo una cuadrícula con pestañas y objetos bloqueados/desbloqueados.
- **Anuncios**: conseguir usos de ayudas viendo un anuncio (la tienda de ayudas ya existe).
- **Más idiomas** (el sistema de textos ya está preparado).
