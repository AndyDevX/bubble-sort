---
name: publicar
description: Publica cambios de Odi Sort de principio a fin - verificar (build y prueba), documentar, commit y push directo a main, y comprobar que GitHub Pages se actualiza. Úsala cuando el usuario pida "aplica los cambios", "haz commit y push", "súbelo", "publícalo", "actualiza la página/Pages" o al terminar una funcionalidad que deba quedar publicada.
---

# Publicar cambios (Odi Sort)

Flujo acordado con el usuario: los cambios van **directos a `main`** (sin ramas ni PR) y cada
push a `main` publica el juego en GitHub Pages: https://andydevx.github.io/bubble-sort/

## 1. Verificar antes de publicar

1. `npm run build` debe terminar sin errores (incluye `tsc`). Si falla, corrige y repite.
2. Si cambió algo visible o de juego, pruébalo en el navegador (`npm run dev`; en sesiones sin
   pantalla, Playwright con Chromium) y revisa las reglas de `CLAUDE.md`:
   - pantalla adaptable: al menos 360x640, 412x915, 768x1024 y horizontal;
   - textos visibles con `t('clave')` (`src/i18n/es.ts`);
   - nada de APIs de Phaser 3.
3. No des por buena una prueba que no has visto pasar: si algo falla, distingue si es del juego o
   del script de prueba antes de seguir.

## 2. Documentar

- Si cambian reglas del juego → `docs/diseno-juego.md` (tabla «Reglas concretas»).
- Si cambian estructura, comandos o convenciones → `CLAUDE.md`.
- Si se añade o regenera audio: efectos con `python3 scripts/generar-sonidos.py`; canciones en
  `src/assets/musica/`. Si un audio cambia **con el mismo nombre** y debe oírse ya, sube
  `VERSION` en `public/sw.js` (si no, el caché del Service Worker sirve el viejo una visita más).

## 3. Versión (MAJOR.MINOR.PATCH en `package.json`)

Cada despliegue sube el **PATCH** (0.0.8 → 0.0.9). **MINOR** y **MAJOR** solo cuando el usuario
lo pida (al subirlos, el PATCH vuelve a 0). La versión se muestra en el menú («v0.0.9 · build N»).

```bash
npm version patch --no-git-tag-version   # o: minor / major si el usuario lo pide
```

(actualiza `package.json` y `package-lock.json`; no lo repitas si en este mismo cambio ya se ajustó a mano)

## 4. Commit y push a main

```bash
git checkout main && git pull origin main
git add -A && git status --short        # revisa que no se cuelen archivos ajenos (node_modules, dist)
git commit -m "<Resumen en español, en imperativo> (vX.Y.Z)" -m "<viñetas con lo que cambia>"
git push origin main
```

- Mensajes de commit en español: una línea de resumen y viñetas con los cambios.
- Añade al final del mensaje las líneas de atribución que indique la sesión.
- Si el push falla por red, reintenta hasta 4 veces (2 s, 4 s, 8 s, 16 s).

## 5. Comprobar la publicación en GitHub Pages

El workflow `.github/workflows/deploy.yml` («Publicar en GitHub Pages») se lanza solo con el push.

```bash
ID=$(gh run list --repo AndyDevX/bubble-sort --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$ID" --repo AndyDevX/bubble-sort --exit-status
gh run view "$ID" --repo AndyDevX/bubble-sort            # resumen de jobs
gh run view "$ID" --repo AndyDevX/bubble-sort --log-failed   # si falló
```

- El número de build es el `run_number` de esa ejecución: `gh run view "$ID" --repo AndyDevX/bubble-sort --json number --jq .number`.
- Si falla `npm run build` en Actions: corrige, vuelve al paso 1 y publica de nuevo.
- Si falla `configure-pages` con «Not Found»: Pages está desactivado; el usuario debe ir a
  Settings → Pages → Source: **GitHub Actions** y luego relanzar (`gh run rerun "$ID"`).
- Si no hay acceso a `gh` desde la sesión, pide al usuario que mire la pestaña **Actions**.
- La web tarda 1–2 minutos en reflejar el cambio. Puede que la sesión no pueda abrir
  `github.io` (red restringida): en ese caso dilo y pide al usuario que lo compruebe.

## 6. Informar al usuario

Breve y en español:
- qué cambió (y cómo se usa si es algo nuevo);
- qué se probó y con qué resultado (y qué no se pudo comprobar);
- **versión** (vX.Y.Z), hash del commit, **número de build** (el `run_number` del workflow, que es el que sale en el menú) y estado del despliegue con el enlace https://andydevx.github.io/bubble-sort/;
- cómo verlo en local: `git pull` y `npm run dev`.
