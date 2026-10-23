# Pendientes

Lista de lo que queda por hacer, por orden recomendado. **Tú** = lo tiene que hacer el usuario
(cuentas, pagos, decisiones); **Claude** = se hace en una sesión. Marca `[x]` al terminar y borra lo
que ya no aplique. Detalles de seguridad en [seguridad.md](./seguridad.md).

## 1. Comprobar lo que ya está publicado

- [x] **Tú** — Instalar el APK 1.0.0 desde la
  [Release](https://github.com/AndyDevX/bubble-sort/releases/tag/v1.0.0).
- [x] **Tú** — Probar la actualización en caliente: el registro del 23/10 ya viene de la v1.0.3.
- [x] **Tú** — Jugar con la lluvia nueva y pasar un registro.
- [x] **Claude** — Ajustar la dificultad con ese registro: v1.0.4 elige tableros más revueltos y
  quita «Nivel nuevo».
- [ ] **Tú** — Jugar la v1.0.4 y pasar otro registro: ¿la dificultad ya está bien o hace falta más?
  Siguientes palancas si hace falta: más candidatos por nivel, lluvia más rápida o algo menos de
  hueco libre al empezar.

## 2. Seguridad de la publicación (antes de repartir el APK o meter anuncios)

Hacerlo **cuanto antes**: cambiar la clave obliga a desinstalar el APK una vez (se pierde el progreso
de esa instalación), y cuantos menos APK haya repartidos, mejor.

- [ ] **Tú** — Activar la verificación en dos pasos en la cuenta de GitHub.
- [ ] **Claude** — Generar la clave nueva del APK y el par de claves de firma de las actualizaciones
  (Capgo), y dejarte los valores en un archivo temporal para copiarlos.
- [ ] **Tú** — Crear los secretos del repositorio en GitHub → *Settings* → *Secrets and variables*
  → *Actions*:
  - `APK_KEYSTORE_BASE64` — la clave del APK en base64;
  - `APK_KEYSTORE_PASSWORD` — su contraseña;
  - `CAPGO_PRIVATE_KEY` — la clave privada que firma las actualizaciones.
- [ ] **Claude** — **S-1**: que `apk.yml` firme con el secreto; borrar `android/firma/odi-sort.jks` y
  las contraseñas de `android/app/build.gradle`.
- [ ] **Claude** — **S-2**: firmar el .zip en `deploy.yml` y poner la clave pública en
  `capacitor.config.ts` (la app rechaza paquetes sin firma).
- [ ] **Claude** — **S-3**: quitar o reducir el `FileProvider` de la plantilla
  (`android/app/src/main/res/xml/file_paths.xml`).
- [ ] S-1, S-2 y S-3 son cambios nativos: salen juntos en el **próximo APK** (v2.0.0, junto con los
  anuncios si ya están listos).

Menores, sin prisa:

- [ ] **Claude** — **S-4**: fijar las acciones de los workflows por SHA (opcional).
- [ ] **Claude** — **S-5**: volver a pasar `npm audit` al actualizar Capacitor (hoy 3 avisos
  moderados solo en `@capacitor/cli`, que no llega al juego).
- [ ] **Claude** — **S-6**: decidir la Content-Security-Policy junto con los anuncios.

## 3. Anuncios en la app (AdMob) — v2.0.0

- [ ] **Tú** — Decidir si el juego está **dirigido a niños** (si sí, Google limita los anuncios y
  bajan los ingresos).
- [ ] **Tú** — Crear la cuenta de **AdMob** (datos fiscales y de pago), registrar la app y crear
  dos bloques de anuncios: **con recompensa** y **de pantalla completa**. Pasar el *App ID* y los
  dos *Ad unit ID*.
- [ ] **Claude** — Instalar `@capacitor-community/admob` (v8) y montar los anuncios con los **ID de
  prueba** de Google mientras no estén los reales:
  - con recompensa: ver un anuncio → un deshacer, un tubo extra o monedas dobles al ganar;
  - pantalla completa: cada 3–4 niveles, nunca justo después de perder;
  - sin banner (quita espacio a los tubos).
- [ ] **Claude** — Aviso de **consentimiento** (UMP de Google, obligatorio en Europa y Reino Unido).
- [ ] **Claude** — Escribir la **política de privacidad** y publicarla en GitHub Pages.
- [ ] **Claude** — `app-ads.txt` (AdMob lo pide en la web del desarrollador; con `github.io` hace
  falta el repo `AndyDevX.github.io` o un dominio propio).
- [ ] **Claude** — Documentar, subir el **MAJOR (v2.0.0)** y publicar el APK.
- [ ] **Tú** — Probar en el móvil y, cuando funcione, cambiar a los ID reales.

## 4. Play Store (después)

- [ ] **Tú** — Cuenta de desarrollador de Google Play (25 USD, pago único).
- [ ] **Claude** — Cambiar el `appId` (`com.andy.phasertemplate` viene de la plantilla) **antes** de
  la primera publicación: luego ya no se puede.
- [ ] **Claude** — Clave de subida en secretos (Play App Signing), compilación `.aab` en el workflow.
- [ ] **Tú** — Ficha de la tienda (capturas, descripción), formulario de *Data safety* y
  clasificación por edades.
- [ ] **Tú** — Revisar los **derechos de las canciones** incluidas antes de publicar.

## 5. Anuncios en la web (más adelante)

- [ ] **Tú** — Dominio propio (AdSense no suele aprobar subdominios `github.io`).
- [ ] **Claude** — AdSense para juegos HTML5 (*Ad Placement API*) en la versión web.
