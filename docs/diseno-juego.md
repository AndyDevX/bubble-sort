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
| Lluvia | Obstáculo: empieza entre el **25 % y el 45 %** del nivel (al azar), con gotas de colores mezclados a ritmo irregular; sus bolas no hay que ordenarlas. Es **justa**: nunca deja el nivel sin solución |
| Giro de gravedad | **Habilidad** con barra de carga (150 pts), una sola carga por nivel |
| Deshacer | Se **compra** en la tienda; sin límite por nivel |
| Tubo de emergencia (tubo extra) | Un tubo de **1 hueco**; se **compra** en la tienda; **máximo uno por nivel** |
| Tienda | Precios altos a propósito: cada compra cuesta **varios niveles** de monedas |
| Plataformas | Navegador móvil y APK Android; **siempre en vertical**, adaptable a cualquier pantalla |

## Controles

- Los tubos responden **al tocar** (no al levantar el dedo) y se puede encadenar jugadas sin
  esperar a que terminen las animaciones: ni la fusión ni las gotas de lluvia bloquean los toques
  (solo el giro de gravedad, deshacer y la entrada de los tubos). Se aceptan varios dedos.
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

- Empieza cuando llevas resuelto **entre el 25 % y el 45 % del nivel** (se sortea en cada
  partida), medido en **bolas bien colocadas**: las
  de cada color apiladas desde el fondo de un tubo (si varios tubos empiezan por el mismo color,
  cuenta el mejor). Se mide el **avance desde el inicio**: las bolas que ya estaban bien por azar
  al empezar (de media un 20–26 %) no cuentan.
- **Alerta de ~2,6 s** antes de la primera gota: sirena de evacuación (cuatro barridos ascendentes), la pantalla parpadea en rojo y
  ámbar y el aviso «¡Empieza a llover!» late. Después aparece el contador «Lluvia: N».
- Las bolas de lluvia caen **congeladas** (escarcha, grietas y borde helado, con un toque de su
  color) para distinguirlas del resto.
- Caen **tandas de 4 bolas de colores nuevos**, todas **mezcladas** (los colores de distintas
  tandas se intercalan), en un tubo al azar con hueco (también en el de emergencia).
- El ritmo es **irregular**: cada gota espera el intervalo del nivel ±40 % y, desde el bloque 2,
  a veces caen **dos casi seguidas** (ráfaga; probabilidad 14 % → 35 % con los bloques). El plan
  se sortea en cada partida (también al reiniciar), así que la lluvia no se repite
  (`src/juego/lluvia.ts`).
- Las gotas **no bloquean los toques**: puedes seguir moviendo mientras caen.
- **Lluvia justa**: antes de cada gota el juego comprueba (con el solucionador) en qué tubos puede
  caer sin dejar el nivel imposible, y elige uno de esos al azar. Si ninguno es seguro en ese
  momento, la gota **espera** (0,7 s) hasta que lo haya; nunca cae al azar por haber esperado.
  Solo cae al azar si el cálculo no da tiempo (móvil muy lento, 4 veces seguidas) o si el
  jugador ya se ha quedado sin solución por sus jugadas.
- Al empezar a llover aparece **un tubo vacío más** (antes de la lluvia el nivel solo tiene 2
  vacíos). Antes había uno por tanda desde el principio y los niveles sobraban de huecos.
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
**Tableros revueltos** (v1.0.4): desde el nivel 4 se generan varios tableros resolubles y se queda
el más difícil: el que menos bolas iguales trae ya juntas, menos jugadas «gratis» ofrece al
empezar (poner una bola sobre otra de su color o fusionar) y más le cuesta al solucionador. Se
eligen entre 4 (bloque 0) y 12 (bloque 4 en adelante), y 6 más en el nivel difícil
(`candidatosPorNivel`, `dificultadTablero`). Resultado: hacen falta ~10 % más movimientos y el
jugador casual gana bastante menos (11–20: 36 % → 25 %).
La dificultad va por **bloques**: un bloque va de un desbloqueo de color al siguiente (y, cuando
ya no quedan colores, cada 10 niveles). Al principio sube con el número de nivel y después con
**cada bloque**, sin estancarse hasta los topes (`configNivel` en `src/juego/niveles.ts`):

| Nivel | Bloque | Colores a ordenar | Paleta | Tubos | Fusiones | Niebla | Tandas de lluvia | Intervalo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 0 | 3 | 4 | 5 (+1) | 0 | 0 % | 1 | 5,85 s |
| 6 | 1 | 3 | 5 (+naranja) | 5 (+1) | 1 | 25 % | 1 | 5,1 s |
| 12 | 2 | 4 | 6 (+morado) | 6 (+1) | 2 | 55 % | 2 | 4,2 s |
| 24 | 4 | 6 | 8 (+cian) | 8 (+1) | 2 | 60 % | 2 | 2,4 s |
| 29 | 5 | 7 | 9 (+lima) | 9 (+1) | 2 | 60 % | 2 | 2,2 s |
| 40 | 7 | 7 | 11 (+blanco) | 9 (+1) | 2 | 71 % | 3 | 2,05 s |
| 48 | 8 | 8 | 12 (+azul divino) | 10 (+1) | 2 | 72 % | 3 | 1,98 s |
| 64 | 10 | 8 | 14 (+plata) | 10 (+1) | 3 | 75 % | 3 | 1,85 s |
| 103+ | 14+ | 8 | 18 | 10 (+1) | 3 | 80 % | 3 | 1,6 s |

«(+1)»: el tubo vacío que trae la lluvia al empezar.

- **Colores a ordenar**: los marca la paleta (desbloqueados − 2, para dejar sitio a los
  ingredientes; mínimo 3): 3 hasta el nivel 11, 4 desde el 12, 5 desde el 17, 6 desde el 24, 7
  desde el 29 y **8 desde el bloque 8** (nivel 48). Nunca bajan. La primera fusión, en el nivel 6.
- **Con cada bloque**: la niebla sube del 60 % al 80 %, la lluvia acelera de 2,5 s a 1,6 s, llega
  una **tercera tanda** de lluvia (bloque 7) y una **tercera fusión** (bloque 10).
- **Nivel difícil**: el **último nivel de cada bloque** (justo antes del color nuevo) es más
  difícil que el resto del bloque: +15 % de niebla (máx. 85 %), lluvia un 20 % más rápida, una
  tanda de lluvia más y una fusión más. Al empezarlo sale una ventana de **advertencia** («¡Nivel
  difícil!», triángulo de peligro, botón «¡Vamos!»; no al reiniciarlo),
  el título de la partida se ve en naranja («Nivel N · Difícil») y al superarlo da **monedas
  dobles**. Niveles difíciles: 5, 11, 16, 23, 28, 34, 39, 47, 57, 63, 75, 82, 91, 102, 112, 122…
- **Paleta** (18 colores): se empieza con **4 básicos** (rojo, azul, amarillo y verde); después se
  desbloquean los otros 7 básicos y al final los 7 especiales. **Cada desbloqueo llega entre 5 y
  12 niveles después del anterior, nunca antes** (lo pidió el usuario; `SALTOS_DESBLOQUEO`): los
  básicos cada 5–7 niveles para que la curva no se frene y los especiales cada 6–12:

  | Color | Naranja | Morado | Rosa | Cian | Lima | Marrón | Blanco | Azul divino | Jade | Plata | Amatista | Esmeralda | Carmesí | Oro |
  | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
  | Nivel | 6 | 12 | 17 | 24 | 29 | 35 | 40 | 48 | 58 | 64 | 76 | 83 | 92 | 103 |
  | Salto | +5 | +6 | +5 | +7 | +5 | +6 | +5 | +8 | +10 | +6 | +12 | +7 | +9 | +11 |

- Los colores a ordenar y los ingredientes de una fusión siempre están desbloqueados; si la paleta
  no da para todo, el nivel lleva menos colores o ninguna fusión (`npm run simular` lo comprueba).
- **Colores especiales**: cada uno imita una imagen de referencia del usuario, con la paleta
  medida en ella, bajo el mismo vidrio de canica que el resto:

  | Color | Aspecto | Paleta medida (oscuro → claro) |
  | --- | --- | --- |
  | Azul divino | Capas de seda azul sobre azul noche, filos de resplandor (sin blanco) | `rgb(0,7,49)` → `rgb(2,52,175)` → `rgb(37,107,228)` |
  | Plata | Nebulosa gris con purpurina y algún destello | gris 76 → 134 → 248 |
  | Jade | Satén líquido verde azulado con pliegues en diagonal y brillos | `rgb(1,62,69)` → `rgb(0,139,132)` → `rgb(203,230,227)` |
  | Amatista | Barras verticales de luz violeta, claras arriba y abajo | `rgb(71,24,116)` → `rgb(124,71,187)` → `rgb(248,209,254)` |
  | Esmeralda | Cristal verde con bokeh, facetas brillantes y luz arriba a la izquierda | `rgb(41,78,26)` → `rgb(105,159,67)` → `rgb(237,255,152)` |
  | Oro | Luz dorada movida, como llamas desenfocadas, con foco a la izquierda | `rgb(136,91,6)` → `rgb(254,201,66)` → `rgb(255,254,234)` |
  | Carmesí | Cáusticas de agua roja: red de líneas luminosas sobre rojo oscuro | `rgb(72,2,4)` → `rgb(166,7,10)` → `rgb(204,23,26)` |

  «Amatista» es el nombre propuesto para el morado especial (el usuario no tenía uno).
- **Familias**: azul/azul divino, rojo/carmesí, amarillo/oro, verde/esmeralda, cian/jade,
  morado/amatista y blanco/plata. El generador evita juntar dos de la misma familia en un nivel
  cuando hay colores de sobra (con la paleta justa a veces hay que mezclarlas; los especiales se
  distinguen por su dibujo).
- **Aviso**: el color nuevo aparece seguro en el nivel que lo desbloquea y se anuncia en una **ventana** «¡Nuevo color!» (bola grande y su nombre, botón Continuar) cuando
  los tubos terminan de entrar; la partida queda en pausa. Solo la primera vez que se llega al
  nivel (no al reiniciarlo).
- **Lluvia**: usa colores desbloqueados que no estén en el nivel; si no queda ninguno (primeros
  niveles), uno aún por descubrir, que cae **congelado** (no se ve como bola normal).
- **Tubos** = colores + 2 vacíos, y **+1 vacío al empezar la lluvia**.

### Curva de dificultad (medida)

`npm run analizar` genera [analisis-dificultad.md](./analisis-dificultad.md) con un índice 0–100 por
nivel (movimientos, esfuerzo de búsqueda, éxito de un jugador casual **con lluvia y tiempo real**,
niebla y ritmo de la lluvia) y su estadística. Resultado (130 niveles × 15 muestras):

| Niveles | Índice | Éxito del jugador casual |
| --- | --- | --- |
| 1–10 | 12 | 86 % |
| 11–20 | 50 | 25 % |
| 21–30 | 67 | 5 % |
| 31–40 | 74 | 1 % |
| 51–60 | 83 | 1 % |
| 71–130 | ≈ 88 | ≈ 0 % |

- La dificultad **sube con cada desbloqueo**: correlación bloque ↔ índice ρ = 0,98 (nivel ↔ índice
  0,88). Se aplana a partir del nivel ~70, cuando los parámetros llegan a sus topes.
- El **nivel difícil** supera a la media de su bloque en **16 de 16** bloques, por 10,8 puntos de
  media (picos naranjas de la gráfica).
- El «jugador casual» del análisis no planifica (juega la jugada obvia o una al azar), así que su
  éxito es una cota baja: una persona que piensa un par de jugadas gana bastante más. Aun así, la
  idea es que a partir del nivel ~15 haga falta pensar o usar habilidades: con el diseño anterior
  (hasta 5 tubos vacíos) se llegaba muy lejos sin usar ninguna.
- Sin lluvia los niveles son fáciles: la dificultad real la ponen la **lluvia** (tiempo, huecos) y
  la **niebla**.

### Solubilidad (medida)

`npm run simular` juega cada nivel con un jugador perfecto a tres velocidades (0,8 s, 1,5 s y
2,5 s por jugada) mientras llueve. Resultado con 50 niveles × 10 partidas por velocidad:

| Reglas | Sin lluvia | Rápido | Normal | Lento |
| --- | --- | --- | --- | --- |
| Lluvia al azar, sin tubos extra (v0.1.4) | 100 % | 37 % | 10 % | 5 % |
| v0.1.12: 2 vacíos + 1 al llover, lluvia justa que espera | **100 %** | **100 %** | **100 %** | **100 %** |

(130 niveles × 2 partidas × 3 velocidades = 780/780.) **Corrección**: hasta v0.1.11 el simulador
dejaba esperar a la gota sin límite cuando ningún tubo era seguro, pero el juego la soltaba al azar
tras 4 esperas; con eso, el 100 % medido era optimista. Ahora el juego también espera (solo cae al
azar si el cálculo se queda sin tiempo), y simulador y juego hacen lo mismo
(`scripts/lib/juego.mjs`, `crearLluvia`).

- **Reiniciar nivel**: misma configuración inicial (guardada al generar el nivel, también tras
  cerrar el juego). Los deshacer y tubos gastados no se devuelven.
- **No hay «Nivel nuevo»** (se quitó en v1.0.4): todos los niveles tienen solución sin habilidades,
  así que no hace falta cambiar de tablero; solo se puede reiniciar el mismo.
- Al ganar, «Siguiente» genera el nivel siguiente.

## Pantallas

1. **Menú**: título «Odi Sort», **Jugar**, **Tienda**, **Colores** (catálogo), **Estadísticas**, monedas (arriba a la derecha), papelera casi
   invisible arriba a la izquierda para **borrar el progreso** (mantener pulsado 1,5 s y confirmar;
   borra nivel, récord, monedas y compras, conserva los ajustes), nivel actual, versión y build (abajo a la izquierda) y
   **Ajustes** (engranaje, esquina inferior derecha).
2. **Partida**:
   - Arriba: pausa, nivel y puntos, monedas, contador de lluvia.
   - Centro: los tubos (1 fila hasta 5 tubos, 2 filas a partir de 6).
   - Abajo: **Deshacer** y **Tubo extra** (con los usos comprados, o «+»), barra y botón de
     **Gravedad**.
3. **Pausa**: Continuar · Reiniciar nivel · Tienda · Ajustes · Menú.
4. **Victoria**: puntos y monedas ganadas (×2 en los niveles difíciles) · Siguiente · Menú.
5. **Derrota**: motivo · Deshacer (si tienes) · Reiniciar nivel · Tienda · Menú.
6. **Colores** (catálogo): los 18 colores en orden de desbloqueo, en una cuadrícula de 4
   columnas. Los descubiertos (nivel alcanzado ≥ nivel en que aparecen) muestran su bola y su
   nombre; los demás, una **canica negra con «?»** y «Nivel N». Arriba, contador «Descubiertos: N
   de 18» y vista grande del color tocado («Desbloqueado en el nivel N» / «Se desbloquea en el
   nivel N» / «Disponible desde el inicio»).
7. **Estadísticas**: niveles superados, fallidos y generados (y % de victorias); habilidades
   usadas (Deshacer, Tubo extra, Gravedad); tubos llenos y canicas movidas, en total y por color
   (cuadrícula de bolas con su cifra; al tocar una se ve el nombre del color). Una derrota cuenta
   una vez por partida y cada color sellado una vez por partida (deshacer no duplica).
8. **Tienda**: saldo, una tarjeta por oferta (icono, nombre, «Tienes: N», precio) y Volver.
9. **Registro** (depuración; texto «Registro» discreto abajo a la izquierda del menú): lista de las
   últimas partidas y botones **Copiar resumen**, **Copiar todo**, **Descargar .txt** y **Borrar
   registro**. Sirve para pasar a quien desarrolla lo que pasó en cada nivel.
10. **Ajustes**: volumen de música y de efectos (sliders) e idioma (de momento solo español).

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
- **Estadísticas** (`odi-sort:estadisticas`). Borrar el progreso también las borra.
- **Nivel en curso**: su configuración inicial (para reiniciarlo igual).
- **Ajustes**: volúmenes e idioma.

## Ideas pendientes (aún no implementadas)

- **Vestidor / Tienda**: avatar por capas (cuerpo, ropa, ojos, cabeza) que se compra con monedas;
  arriba la vista previa y abajo una cuadrícula con pestañas y objetos bloqueados/desbloqueados.
- **Anuncios**: conseguir usos de ayudas viendo un anuncio (la tienda de ayudas ya existe).
- **Más idiomas** (el sistema de textos ya está preparado).
