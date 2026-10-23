# Revisión de seguridad

Fecha: 2026-10-23 (v1.0.0). Hecha con las skills `security-review` (Sentry), `security-best-practices`
(OpenAI), `security-and-hardening` (Addy Osmani) y `android-security-best-practices`. Alcance: `src/`,
`public/sw.js`, `index.html`, `android/`, `capacitor.config.ts`, `.github/workflows/`, dependencias e
historial de git.

## Resumen

Odi Sort es un juego **sin servidor, sin cuentas y sin datos personales**: todo se guarda en el
`localStorage` del dispositivo y el texto se dibuja en el canvas de Phaser. La superficie de ataque
es pequeña y **no hay vulnerabilidades de confianza alta en el código del juego** (no hay `innerHTML`,
`eval`, `postMessage` ni entradas de otros usuarios). Los riesgos reales están en la **cadena de
publicación**: la clave de firma del APK es pública y las actualizaciones en caliente no van firmadas.
Nada es urgente mientras el APK solo lo instales tú; conviene resolverlo antes de repartirlo o de
meter anuncios o pagos.

| ID | Gravedad | Hallazgo | Estado |
| --- | --- | --- | --- |
| S-1 | Media | La clave de firma del APK está en el repo público | Pendiente (decisión del usuario) |
| S-2 | Media-baja | Las actualizaciones en caliente no van firmadas | Pendiente (necesita secretos) |
| S-3 | Baja | `FileProvider` de la plantilla expone todo el almacenamiento externo (sin uso) | Próximo APK |
| S-4 | Baja | Acciones de GitHub fijadas por etiqueta, no por SHA | Opcional |
| S-5 | Baja | 3 avisos moderados de `npm audit` en `@capacitor/cli` (solo desarrollo, iOS) | Aplazado |
| S-6 | Baja | Sin Content-Security-Policy | Aplazado (afecta a anuncios) |
| — | Info | `allowBackup="true"` | Intencionado |
| — | Info | El guardado (monedas, inventario) se puede editar | Aceptado (juego sin conexión) |

## Media

### S-1 · Clave de firma del APK pública

- **Dónde**: `android/firma/odi-sort.jks` y contraseñas en `android/app/build.gradle` (bloque
  `signingConfigs.apk`).
- **Impacto**: cualquiera puede firmar un APK que Android acepte como **actualización** de Odi Sort.
  Si alguien convence a un jugador de instalarlo, ese APK sustituye a la app y lee su
  `localStorage` (solo progreso del juego, sin datos personales).
- **Por qué está así**: desde la sesión de Claude no se pueden crear secretos de GitHub, y una clave
  fija es necesaria para instalar cada APK encima del anterior sin perder el progreso.
- **Arreglo**: generar una clave nueva, guardarla en los secretos del repositorio
  (`APK_KEYSTORE_BASE64`, `APK_KEYSTORE_PASSWORD`) y que `apk.yml` la reconstruya en tiempo de
  compilación; borrar la del repo. **Cambiar la clave obliga a desinstalar una vez** (se pierde el
  progreso de esa instalación), así que cuanto antes, mejor: hoy solo existe el APK 1.0.0.
- **Play Store**: usa *Play App Signing*; la clave de subida debe ser otra y estar en secretos.

### S-2 · Actualizaciones en caliente sin firma

- **Dónde**: `src/sistemas/actualizaciones.ts` (descarga `actualizacion/*.zip` de GitHub Pages) y
  `deploy.yml`.
- **Impacto**: la app ejecuta el código que haya en GitHub Pages. Va por HTTPS y solo se puede
  cambiar con acceso de escritura al repo, el mismo nivel de confianza que la web. Firmar el
  paquete añade una segunda barrera: aunque alguien llegara a publicar en Pages, la app rechazaría
  un paquete sin la firma correcta.
- **Arreglo**: cifrado/firma de extremo a extremo de Capgo (`npx @capgo/cli key create`): clave
  privada en los secretos de GitHub, clave pública en `capacitor.config.ts` (cambio nativo → va en
  el próximo APK). Es el mismo paso que S-1 y conviene hacerlos juntos.
- **Mitigación actual**: activa la **verificación en dos pasos** de la cuenta de GitHub y no des
  acceso de escritura al repo a nadie más.

## Baja

### S-3 · `FileProvider` demasiado amplio

`android/app/src/main/res/xml/file_paths.xml` declara `<external-path path=".">` (plantilla de
Capacitor). Está `exported="false"` y el juego no comparte archivos, así que hoy no es explotable,
pero conviene reducirlo a `cache-path` o quitar el provider. Es un cambio nativo: entra en el
próximo APK (MAJOR).

### S-4 · Acciones fijadas por etiqueta

`deploy.yml` y `apk.yml` usan `actions/*@vN`. Son acciones oficiales de GitHub y los permisos de
cada workflow son mínimos (`contents: read` en Pages; `contents: write` solo en `apk.yml` para crear
la Release). Fijarlas por SHA protege de una etiqueta movida; es opcional.

Los workflows no usan `pull_request_target` ni interpolan datos de terceros en `run:` (solo
`github.sha`, `run_number` y la versión de `package.json`): sin inyección de comandos.

### S-5 · `npm audit`

`npm audit --omit=dev`: **0 vulnerabilidades** en lo que llega al juego. Con dependencias de
desarrollo, 3 moderadas: `uuid` < 11.1.1 a través de `xcode` → `@capacitor/cli` (solo para
proyectos iOS; no se usa en ejecución). El único «arreglo» baja `@capacitor/cli` a 8.4.3 (rompe la
alineación de versiones de Capacitor): se aplaza hasta que Capacitor lo actualice. Revisar en la
próxima subida de Capacitor.

### S-6 · Sin Content-Security-Policy

GitHub Pages no permite cabeceras propias; se podría poner un `<meta http-equiv>` en `index.html`.
Hoy no hay datos de terceros que inyectar, y una CSP estricta chocaría con los SDK de anuncios
(cargan scripts e iframes de Google). Se decidirá junto con los anuncios.

## Informativo

- **`allowBackup="true"`** (`AndroidManifest.xml`): la copia de seguridad de Android guarda el
  progreso y lo restaura en un móvil nuevo. No hay datos sensibles: se deja a propósito.
- **Guardado editable**: monedas e inventario están en `localStorage` y un jugador con acceso al
  dispositivo puede cambiarlos. En un juego sin conexión solo se engaña a sí mismo. **Ojo si llegan
  pagos reales o recompensas con valor**: entonces la validación tiene que ser de servidor.
- **Sin secretos en el historial** de git, salvo la clave del APK (S-1).
- **Service Worker** (`public/sw.js`): solo guarda en caché peticiones GET del mismo origen y
  respuestas 200; no se registra en la app nativa.
- **`config.xml` con `<access origin="*">`**: archivo heredado de Cordova que Capacitor no usa para
  la navegación.
- **Registro de depuración**: solo contiene eventos de la partida (sin datos personales) y sale del
  dispositivo únicamente si el jugador lo copia o lo descarga.
