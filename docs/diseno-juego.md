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
| Niveles | **Aleatorios**, generados por procedimiento y comprobados con un solucionador: **todos tienen solución sin habilidades**, también con la lluvia (ver «Solubilidad») |
| Colores | Pocos al principio (3) y se van **desbloqueando** con los niveles; ventana «¡Nuevo color!» |
| Ganar | Al **sellar todos los colores iniciales** del nivel |
| Lluvia | Obstáculo: empieza al **35 %** del nivel y sus bolas no hay que ordenarlas. Es **justa**: nunca deja el nivel sin solución |
| Giro de gravedad | **Habilidad** con barra de carga (150 pts), una sola carga por nivel |
| Deshacer | Se **compra** en la tienda; sin límite por nivel |
| Tubo de emergencia (tubo extra) | Un tubo de **1 hueco**; se **compra** en la tienda; **máximo uno por nivel** |
| Tienda | Precios altos a propósito: cada compra cuesta **varios niveles** de monedas |
| Plataformas | Navegador móvil y APK Android; **siempre en vertical**, adaptable a cualquier pantalla |

## Controles

- Los tubos responden **al tocar** (no al levantar el dedo) y se puede encadenar jugadas sin
  esperar a que terminen las animaciones (solo la fusión hace esperar). Se aceptan varios dedos.
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
- **Alerta de ~2,6 s** antes de la primera gota: sirena de evacuación (cuatro barridos ascendentes), la pantalla parpadea en rojo y
  ámbar y el aviso «¡Empieza a llover!» late. Después aparece el contador «Lluvia: N».
- Las bolas de lluvia caen **congeladas** (escarcha, grietas y borde helado, con un toque de su
  color) para distinguirlas del resto.
- Caen **tandas de 4 bolas de un color nuevo**, una cada pocos segundos, en un tubo al azar con
  hueco (también en el de emergencia).
- **Lluvia justa**: antes de cada gota el juego comprueba (con el solucionador) en qué tubos puede
  caer sin dejar el nivel imposible, y elige uno de esos al azar. Si ninguno es seguro en ese
  momento, la gota espera un poco. Si el jugador ya se ha quedado sin solución por sus jugadas,
  la lluvia cae normal.
- Cada tanda de lluvia trae **un tubo vacío más** en el nivel: la lluvia nunca llena el tablero.
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

| Nivel | Colores a ordenar | Paleta desbloqueada | Tubos | Fusiones | Niebla | Tandas de lluvia | Intervalo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 3 | 5 | 6 | 0 | 0 % | 1 | 5,85 s |
| 3 | 3 | 6 (+azul divino) | 6 | 1 | 10 % | 1 | 5,55 s |
| 4 | 4 | 7 (+morado) | 7 | 1 | 15 % | 1 | 5,4 s |
| 8 | 5 | 8 (+rosa) | 8 | 1 | 35 % | 1 | 4,8 s |
| 9 | 5 | 9 (+cian) | 9 | 2 | 40 % | 2 | 4,65 s |
| 13 | 6 | 10 (+lima) | 10 | 2 | 60 % | 2 | 4,05 s |
| 19 | 6 | 11 (+marrón) | 10 | 2 | 60 % | 2 | 3,15 s |
| 20 | 7 | 11 | 11 | 2 | 60 % | 2 | 3,0 s |
| 22+ | 7 | 12 (+blanco) | 11 | 2 | 60 % | 2 | 2,7 s → 2,5 s |

- **Colores**: 3 hasta el nivel 3, 4 hasta el 7, 5 hasta el 12, 6 hasta el 19 y 7 a partir del 20.
- **Paleta** (12 colores): empieza con rojo, azul, amarillo, verde y naranja; se desbloquea uno
  nuevo cada pocos niveles: **azul divino** (6.º, nivel 3), morado, rosa, cian, lima, marrón y blanco.
- **Azul divino** (id `azulDivino`): imita una imagen de referencia del usuario (ondas de seda
  azul sobre azul noche). Paleta medida en la referencia, **sin blanco**: fondo ≈ `rgb(0,7,49)`,
  capas hasta ≈ `rgb(1,33,144)`, filos ≈ `rgb(2,52,175)` y solo el pico de la onda principal
  ≈ `rgb(37,107,228)`. Capas translúcidas en barridos diagonales con filos de resplandor azul
  suave (no líneas blancas); encima, el vidrio común de todas las canicas (reflejo de ventana más
  sutil por ser tan oscura).
- **Aviso**: el color nuevo aparece seguro en el nivel que lo desbloquea y se anuncia en una **ventana** «¡Nuevo color!» (bola grande y su nombre, botón Continuar) cuando
  los tubos terminan de entrar; la partida queda en pausa. Solo la primera vez que se llega al
  nivel (no al reiniciarlo ni con «Nivel nuevo»).
- **Tubos** = colores + 2 vacíos + 1 por tanda de lluvia.

### Solubilidad (medida)

`npm run simular` juega cada nivel con un jugador perfecto a tres velocidades (0,8 s, 1,5 s y
2,5 s por jugada) mientras llueve. Resultado con 50 niveles × 10 partidas por velocidad:

| Reglas | Sin lluvia | Rápido | Normal | Lento |
| --- | --- | --- | --- | --- |
| Antes (lluvia al azar, sin tubos extra) | 100 % | 37 % | 10 % | 5 % |
| Ahora (lluvia justa + tubo extra por tanda) | **100 %** | **100 %** | **100 %** | **100 %** |

Antes, a partir del nivel 8 las dos tandas de lluvia llenaban exactamente todos los huecos: aunque
el nivel tenía solución sin lluvia, la lluvia al azar lo hacía imposible muchas veces.

- **Reiniciar nivel**: misma configuración inicial (guardada al generar el nivel, también tras
  cerrar el juego). Los deshacer y tubos gastados no se devuelven.
- **Nivel nuevo**: otra configuración con el mismo número de nivel.
- Al ganar, «Siguiente» genera el nivel siguiente.

## Pantallas

1. **Menú**: título «Odi Sort», **Jugar**, **Tienda**, monedas (arriba a la derecha), papelera casi
   invisible arriba a la izquierda para **borrar el progreso** (mantener pulsado 1,5 s y confirmar;
   borra nivel, récord, monedas y compras, conserva los ajustes), nivel actual, versión y build (abajo a la izquierda) y
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

- **Luz única**: todo (bolas, tubos, iconos) se ilumina desde arriba a la izquierda.
- **Tubos de ensayo de vidrio realistas**: boca con aro de vidrio en perspectiva, paredes más
  visibles en los cantos, reflejos verticales **por delante de las bolas** (las bolas quedan dentro
  del vidrio) y luz en el fondo redondo. Sellado: el interior se tiñe del color y cae un **tapón**
  que encaja con un rebote. El de emergencia es bajo y de vidrio ámbar.
- **Bolas de vidrio** (canicas): núcleo claro, luz concentrada abajo a la derecha, reflejo nítido
  arriba a la izquierda y filo claro.
- **Iconos de habilidad** (una sola familia, trazo azul noche sobre el botón celeste, con detalles de
  vidrio): Deshacer (flecha en gancho), Tubo extra (tubo de ensayo con canicas y «+»), Gravedad
  (dos flechas en círculo alrededor de un tubo boca abajo).
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
- **Alarma de lluvia**: no es de vidrio; sirena de evacuación real (onda de sierra saturada que
  sube de 320 a 920 Hz, cuatro veces, con eco de sala).
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
