# Música del build de CrazyGames

Solo música **libre de derechos de terceros** (CC0 / dominio público, o licencias que permitan su
uso comercial en juegos sin atribución obligatoria). El build `npm run build:crazygames` usa
**únicamente** esta carpeta: las canciones de `src/assets/musica/` no entran.

Mismas reglas que la otra carpeta: `.mp3`/`.ogg`/`.m4a`, máximo 1,5 MB cada una, comprimidas con
`ffmpeg -i entrada -map_metadata -1 -ar 16000 -c:a libmp3lame -b:a 32k salida.mp3`.

Anota cada canción con su autor, enlace y licencia:

| Archivo | Título y autor | Licencia | Enlace |
| --- | --- | --- | --- |
| (vacía de momento) | | | |
