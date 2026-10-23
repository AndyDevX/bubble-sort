# Odi Sort

Juego de ordenar bolas de colores en tubos, para móvil y siempre en vertical, hecho con
**Phaser 4 + TypeScript** y empaquetado para Android con **Capacitor**.

**Jugar ahora:** https://andydevx.github.io/bubble-sort/

## Cómo se juega

Toca un tubo para levantar sus bolas de arriba y toca otro para soltarlas: solo pueden caer en un
tubo vacío o sobre su mismo color. Junta 4 iguales para **sellar** el tubo. Ganas al sellar todos
los colores del nivel… mientras la **lluvia** intenta llenarte los huecos.

Mecánicas: lluvia, alquimia (fusionar ingredientes), niebla (bolas ocultas), giro de gravedad,
deshacer y tubo extra (se compran con monedas en la **tienda**). Todo el detalle en
[docs/diseno-juego.md](docs/diseno-juego.md).

## Empezar a desarrollar

Necesitas **Node.js 22.12+**.

```bash
git clone https://github.com/AndyDevX/bubble-sort.git
cd bubble-sort
npm ci
npm run dev        # http://localhost:5173 (también desde el móvil con la IP de tu PC)
```

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga al guardar |
| `npm run build` | Comprueba tipos y genera `dist/` |
| `npm run preview` | Sirve `dist/` en local |
| `npm run simular` | Mide que todos los niveles se pueden resolver sin habilidades (con lluvia) |
| `npm run analizar` | Análisis estadístico de la curva de dificultad (`docs/analisis-dificultad.md`) |
| `npm run compartir` | Con `npm run dev` abierto, crea un enlace público temporal |
| `npm run cap:android` | Compila, sincroniza y abre el proyecto en Android Studio |

## Publicación

- **Web:** cada push a `main` se publica solo en GitHub Pages (un **build** nuevo cada vez).
- **Versión:** `MAJOR.MINOR.PATCH`; el PATCH sube en cada despliegue y se muestra en el menú.
- **APK:** cada versión **MAJOR** genera un APK de Android en las *Releases* del repositorio. Entre
  un APK y el siguiente, la app se **actualiza sola** desde GitHub Pages (sin reinstalar).

## Documentación

| Documento | Contenido |
| --- | --- |
| [docs/diseno-juego.md](docs/diseno-juego.md) | Todo lo jugable: reglas, mecánicas, ayudas, puntos, niveles, pantallas |
| [docs/tecnico.md](docs/tecnico.md) | Arquitectura, sistemas, guardado, audio, versionado, despliegue y APK |
| [docs/historial.md](docs/historial.md) | Versiones y builds publicados |
| [docs/seguridad.md](docs/seguridad.md) | Revisión de seguridad: hallazgos y pendientes |
| [docs/analisis-dificultad.md](docs/analisis-dificultad.md) | Curva de dificultad medida (generado por `npm run analizar`) |
| [AGENTS.md](AGENTS.md) | Instrucciones para agentes de IA que trabajen en el repo |
| [docs/guia-phaser.md](docs/guia-phaser.md) · [docs/guia-typescript.md](docs/guia-typescript.md) | Manuales del stack |
