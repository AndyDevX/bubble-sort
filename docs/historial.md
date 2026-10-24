# Historial de versiones

Cada despliegue en GitHub Pages es un **build** nuevo y sube el **PATCH** de la versión
(`MAJOR.MINOR.PATCH`). Las versiones 0.0.1–0.0.7 se asignaron después (el versionado empezó en
0.0.8, alineado con el número de build). Cada versión **MAJOR** genera además un **APK**.

Al publicar, añade la nueva versión arriba del todo (lo indica la skill `publicar`).

| Versión | Build | Commit | Fecha | Cambios |
| --- | --- | --- | --- | --- |
| 1.0.10 | 39 | (este) | 2026-10-24 | CrazyGames: el progreso (partida, nivel, ajustes y estadísticas) se guarda con el **Data Module** de su SDK, en la cuenta del jugador. La web y la app siguen con `localStorage` |
| 1.0.9 | 38 | 2da8c8d | 2026-10-24 | **Música libre de derechos para CrazyGames**: 8 pistas CC0 (CoMiGo, Écrivain y hernandack) elegidas por su tono tranquilo o de hielo, alargadas a ~2,5 min y con el volumen igualado. La web y la app no cambian |
| 1.0.8 | 37 | 80901f9 | 2026-10-24 | **Versión para CrazyGames**: build propio (`npm run build:crazygames`) con su SDK de anuncios (entre niveles cada 2 niveles; con recompensa: monedas dobles al ganar y deshacer gratis al perder), sin las canciones de la web y sin Service Worker. Cada versión publica una Release `crazygames-vX.Y.Z` con el .zip. La música libre de derechos queda pendiente (la red del entorno no deja descargarla) |
| 1.0.7 | 36 | 8ee9969 | 2026-10-24 | **Fin de las derrotas «trampa»**: las bolas que añaden las fusiones van en su propio tubo (antes dejaban ~1,25 tubos libres y el 37 % de las primeras jugadas ya no tenía solución); más fusiones para compensar. «Sin solución» explica por qué, dice cuántas jugadas deshacer y deja **seguir jugando**. Análisis de 1000 niveles: 6000/6000 resolubles, curva estable hasta el 1000 |
| 1.0.6 | 35 | ff31351 | 2026-10-24 | **Corrige el nivel 8 imposible de pasar**: el generador ya no deja un ingrediente solo en un tubo ni, hasta el nivel 16, tableros trampa (los que un jugador al azar casi nunca gana). Los niveles guardados de antes se regeneran |
| 1.0.5 | 34 | b367b97 | 2026-10-23 | **Lluvia nueva, temporal**: gotas de **hielo** que bloquean un tubo y se derriten tras 4–8 jugadas (con contador) y, desde el bloque 5, de **niebla** que vuelven a tapar bolas. Ya no aparece un tubo nuevo ni hay «lluvia justa». Derrota **«Sin solución»** cuando es seguro que la partida ya no se puede ganar. El solucionador acepta poner un ingrediente sobre una bola normal de su color, como el juego |
| 1.0.4 | 33 | 9e1ef3f | 2026-10-23 | **Tableros más revueltos**: cada nivel elige el más difícil entre varios tableros resolubles (menos bolas juntas, menos jugadas fáciles al empezar); ~10 % más movimientos para ganar. Se quita «Nivel nuevo» (todos los niveles tienen solución) |
| 1.0.3 | 32 | d5f7562 | 2026-10-23 | Actualización de la app más clara: se instala en cuanto termina de descargarse si estás en el menú, el menú dice «Descargando…» / «Instalando…» o si falló, y cada intento queda en el registro de depuración |
| 1.0.2 | 31 | 66ce5c3 | 2026-10-23 | Lista de pendientes (`docs/pendientes.md`): comprobaciones, seguridad, anuncios y Play Store |
| 1.0.1 | 30 | ca24231 | 2026-10-23 | Revisión de seguridad (`docs/seguridad.md`) y skills de seguridad, workflows y Google Ads. Primera versión que llega a la app por actualización en caliente |
| 1.0.0 | 29 | 616ccfd | 2026-10-23 | **MAJOR: primer APK de Android** en las Releases (`odi-sort-v1.0.0.apk`). Desde aquí la app se actualiza sola con cada versión 1.x publicada en Pages |
| 0.1.13 | 28 | 181b2f7 | 2026-10-23 | Preparación del APK: la app Android se **actualiza sola** desde GitHub Pages (Capgo en modo manual; `actualizacion/version.json` + .zip en cada despliegue). APK release firmado siempre con la misma clave y con la versión del juego |
| 0.1.12 | 27 | 55e1f39 | 2026-10-23 | **Lluvia fluida y variada**: las gotas y las fusiones ya no bloquean los toques; la lluvia empieza entre el 25 y el 45 %, mezcla colores y cambia de ritmo (ráfagas) en cada partida. **Menos tubos vacíos** (2 + 1 al llover, antes hasta 5): ya hace falta pensar o usar habilidades. La lluvia justa espera en vez de caer al azar (corrige un 100 % optimista del simulador) |
| 0.1.11 | 26 | bfba440 | 2026-10-23 | **Registro de depuración**: cada nivel guarda todo lo que pasa (jugadas, toques ignorados, lluvia, habilidades, pausas, errores) con tiempo real y de juego; pantalla «Registro» en el menú para copiar o descargar |
| 0.1.10 | 25 | 484ee75 | 2026-10-23 | La dificultad crece con cada desbloqueo (bloques): más niebla, lluvia más rápida, 3.ª tanda, 3.ª fusión y 8 colores. El último nivel de cada bloque es **difícil**: aviso al empezar y monedas dobles. Análisis: ρ bloque↔dificultad 0,99; el difícil supera a su bloque 16/16 |
| 0.1.9 | 24 | eea684e | 2026-10-23 | Cada color se desbloquea entre 5 y 12 niveles después del anterior (naranja 6 … oro 103); los colores por nivel siguen a la paleta sin bajar nunca. Análisis de dificultad actualizado |
| 0.1.8 | 23 | 7fbdeb6 | 2026-10-23 | Se empieza con 4 colores (el resto de básicos y luego los especiales se desbloquean, uno cada 3,8 niveles de media). Pantalla de **Estadísticas**. Análisis estadístico de la dificultad (`npm run analizar`): sube hasta el nivel ~25 y luego se estanca |
| 0.1.7 | 22 | 4a8ee86 | 2026-10-23 | Los 11 colores básicos, disponibles desde el inicio; los 7 especiales se desbloquean de media cada 4,6 niveles (azul divino 5, jade 10, plata 13, amatista 19, esmeralda 23, carmesí 28, oro 33). Se recuperan en `diseno-juego.md` las secciones de colores especiales borradas por error en 0.1.6 |
| 0.1.6 | 21 | f053ebe | 2026-10-23 | Colores desbloqueados cada 8–12 niveles (salto distinto por color; Azul divino en el 9, Carmesí en el 132). La paleta marca cuántos colores tiene cada nivel |
| 0.1.5 | 20 | 64881f8 | 2026-10-23 | Catálogo **Colores** en el menú (descubiertos con nombre; los demás en negro con «?» y su nivel). Orden de desbloqueo verificado y comprobado en `npm run simular` |
| 0.1.4 | 19 | 173fb15 | 2026-10-23 | 6 colores especiales nuevos con dibujo propio a partir de imágenes de referencia: Plata, Jade, Amatista, Esmeralda, Oro y Carmesí (paleta de 18) |
| 0.1.3 | 18 | 885bcbf | 2026-10-23 | El color nuevo se llama **Azul divino** y se parece más a la referencia: sin líneas blancas, paleta medida de la imagen, barridos diagonales y resplandor azul |
| 0.1.2 | 17 | 606394d | 2026-10-23 | Color nuevo **Medianoche** (azul noche con ondas de seda luminosas), 6.º en desbloquearse; paleta de 12 colores |
| 0.1.1 | 16 | 6d3d5fd | 2026-10-23 | El color nuevo se anuncia en una ventana (bola y nombre) en vez de sobre los tubos |
| 0.1.0 | 15 | b67cc47 | 2026-10-23 | **MINOR**: todos los niveles resolubles sin habilidades (lluvia justa + tubo extra por tanda, medido con `npm run simular`: 100 %). Colores que se desbloquean poco a poco. Alarma de sirena real. Respuesta táctil inmediata. Borrar progreso (botón oculto) |
| 0.0.14 | 14 | cec8c77 | 2026-10-23 | Tubos de ensayo de vidrio realistas (dos capas, reflejos sobre las bolas, tapón que cae), bolas de vidrio e iconos de habilidad nuevos |
| 0.0.13 | 13 | 9cdbe1d | 2026-10-23 | Tubos de ensayo de cristal (boca, fondo redondo, brillo, tapón al sellar) y animaciones: entrada deslizante, bola flotando, aterrizaje con balanceo, chispas, flechas de Gravedad, ola de victoria |
| 0.0.12 | 12 | 912706e | 2026-10-23 | **Tienda**: deshacer (150 / 5 por 600) y tubo extra (500, máx. 1 por nivel) se compran con monedas. Se quitan los 5 deshacer gratis y el sorteo del tubo |
| 0.0.11 | 11 | 9b6e1e2 | 2026-10-23 | Bolas de lluvia congeladas. Alerta de lluvia de ~2,6 s con alarma y pantalla parpadeando en rojo y ámbar |
| 0.0.10 | 10 | ab91c37 | 2026-10-23 | Documentación completa (README, diseño, técnica, historial) e instrucciones para agentes (`AGENTS.md`) |
| 0.0.9 | 9 | 2f20f9d | 2026-10-23 | Proyecto Android (Capacitor 8.5.3, vertical) y workflow que genera el APK en cada versión MAJOR |
| 0.0.8 | 8 | d0982dd | 2026-10-23 | Se gana al sellar los colores iniciales (la lluvia es solo obstáculo). Versionado semántico en el menú |
| 0.0.7 | 7 | bf8cffa | 2026-10-23 | Número de build en el menú. 9 canciones nuevas comprimidas (2,4 MB). Audio cargado en segundo plano |
| 0.0.6 | 6 | 58d6a9f | 2026-10-23 | Tubo de emergencia (1 hueco, 1 por nivel, sorteado en la demo). Animación al deshacer |
| 0.0.5 | 5 | 9e66512 | 2026-10-23 | Inicio de la lluvia medido en bolas bien colocadas |
| 0.0.4 | 4 | 483b694 | 2026-10-23 | Lluvia al 35 % del nivel |
| 0.0.3 | 3 | 2582048 | 2026-10-23 | Deshacer (5 por nivel), reiniciar el mismo nivel o generar uno nuevo. Skill `publicar` |
| 0.0.2 | 2 | c3c7c89 | 2026-10-23 | Acciones del workflow de Pages actualizadas (Node 24) |
| 0.0.1 | 1 | 9d3c389 | 2026-10-23 | Primera publicación en GitHub Pages |

## Antes de publicar en la web (2026-10-21 / 22)

| Commit | Cambios |
| --- | --- |
| 2d4db5f | Caché de audio en el dispositivo (Service Worker) y +10 pts por colocar bien cada bola |
| bad04ee | Efectos de sonido de vidrio generados por síntesis |
| 4ed0471 | Ganar al completar todos los tubos; canciones comprimidas al 50 % |
| a4124e8 | Música de fondo aleatoria y sin fin en las partidas |
| d98e5d5 | Mover grupos de bolas iguales; derrota «Sin salida» |
| 5ea98c5 | Quitar el aviso de «Gira el teléfono» |
| 66e691f | **Partida jugable**: tubos, sellado, alquimia, niebla, lluvia, giro de gravedad, pausa, victoria y derrota |
| 86ee51b | Quitar la pantalla completa automática |
| bd60fa2 | Pantalla adaptable (`Scale.EXPAND`), base para 60 fps y documento de diseño |
| 2434f7d | Pantalla completa automática en el móvil (luego retirada) |
| 5531b0d | Menú de ajustes (volumen e idioma); el juego pasa a llamarse **Odi Sort** |
| eeb7a27 | Menú de inicio y plantilla de la escena de juego |
| dc72243 | Guías de TypeScript 6 y Phaser 4 |
| a8ef7b7 | Plantilla inicial con skills de Claude Code |
