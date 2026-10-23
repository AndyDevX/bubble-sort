# Historial de versiones

Cada despliegue en GitHub Pages es un **build** nuevo y sube el **PATCH** de la versión
(`MAJOR.MINOR.PATCH`). Las versiones 0.0.1–0.0.7 se asignaron después (el versionado empezó en
0.0.8, alineado con el número de build). Cada versión **MAJOR** genera además un **APK**.

Al publicar, añade la nueva versión arriba del todo (lo indica la skill `publicar`).

| Versión | Build | Commit | Fecha | Cambios |
| --- | --- | --- | --- | --- |
| 0.1.6 | 21 | (este) | 2026-10-23 | Colores desbloqueados cada 8–12 niveles (salto distinto por color; Azul divino en el 9, Carmesí en el 132). La paleta marca cuántos colores tiene cada nivel |
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
