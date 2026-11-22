# Versión visible y actualización de la app (rama `claude/version-visible`)

## Qué hay

- **Versión en Opciones** (pantalla y ventana de la partida, sección «Versión»): commit corto, fecha de compilación (UTC), rama y número de PR (si el mensaje del commit lo dice: «Merge pull request #128», «(#128)»). En el menú, en pequeño: «versión a1b2c3d · 22 nov».
  La inyecta `apps/web/vite.config.ts` (`define` → `__DS_VERSION__`): en CI `GITHUB_SHA`, `GITHUB_REF_NAME` y la hora de la compilación; en local `git`; sin git, «desarrollo». Variables para forzarla: `DS_VERSION_ID`, `DS_FECHA`, `DS_RAMA`. No hace falta tocar `pages.yml`.
- **`version.json`** publicado junto a la web (mismo plugin de Vite). `apps/web/src/version.ts` lo pide **sin caché** y compara.
- **Aviso «Hay una versión nueva — Actualizar»** (barra abajo, también durante la partida): se comprueba al abrir, cada 30 min y al volver a la pestaña tras ≥ 5 min. «Actualizar» **guarda la partida** (si no se puede guardar, no recarga y lo dice), baja los deportes con código nuevo, borra las copias del service worker y recarga. La partida y los deportes viven en IndexedDB: no se tocan. Botón **«Buscar actualización»** en Opciones («Estás al día» / «No se pudo comprobar»). Código: `actualizacion.ts` (lógica con dependencias inyectables) + `main.ts`.
- **Deportes con código nuevo** (ver abajo, la causa más probable): el catálogo trae `huella` del código; el aviso también salta por «una versión nueva de Fútbol», y en Opciones → Deportes sale «Actualizar» aunque la versión no haya cambiado.

## Por qué un navegador podía quedarse con lo viejo

Hallazgos, de más a menos probable para lo de «Mi equipo» (#128):

1. **El fútbol es un paquete instalado en IndexedDB y nunca se actualizaba.** «Mi equipo» está en `modules/futbol`, que no va dentro del juego: se instala una vez desde Opciones y se guarda en el navegador. La web nueva no lo cambia. Y la lista de Opciones solo ofrecía «Actualizar» si `version` del catálogo ≠ la instalada, pero `modules/futbol/package.json` sigue en `0.2.0` desde hace mucho aunque el código cambió: **nunca aparecía el botón**. Arreglo: compara también la huella del código (`esActualizacion` en `@ds/paquetes`; el catálogo la lleva en `huella`, los antiguos sin ella siguen comparando solo versiones). Se pasó a probar en `tests/paquetes-de-deporte.test.ts`.
2. **El catálogo de deportes venía de la caché del service worker** (copia primero, refresco después): «Buscar deportes» enseñaba el catálogo de la visita anterior. Ahora lo que no es `assets/` va a la red primero.
3. **`fetch` del service worker pasaba por la caché HTTP**: GitHub Pages sirve con `Cache-Control: max-age=600`, así que `index.html` (navegación «red primero») podía ser una copia de hasta 10 minutos. Ahora `cache: 'no-cache'` (revalida siempre). `sw.js` sube a `v2` (limpia las cachés viejas).
4. Una pestaña o PWA que se deja abierta días no vuelve a pedir nada hasta cerrarla: ahora el aviso lo detecta solo.

(Los JS y CSS de Vite llevan hash en el nombre: no es causa.)

## Qué tiene que hacer el usuario una vez (para salir de la vieja)

1. Abrir el juego con conexión y esperar unos segundos (si pasaron < 10 min desde la última publicación, recargar una vez más). Ir a **Opciones → «Versión»**: debe salir un commit y una fecha. Si **no existe esa sección**, sigue con la vieja: cerrar la pestaña/app del todo, volver a abrirla (con conexión) o recargar sin caché (`Ctrl+Shift+R`); en el móvil, cerrar la app instalada y abrirla de nuevo.
2. Ir a **Opciones → Deportes → «Buscar deportes»**. Si el Fútbol sale con **«Actualizar»**, pulsarlo (el aviso de abajo hace lo mismo). Tras actualizar, «Mi equipo» aparece en la pestaña Deporte (las partidas que ya usan el fútbol siguen: es el mismo deporte).
3. Si aun así no: Opciones → Deportes → Desinstalar el Fútbol (no se deja con una partida que lo use) y volver a instalarlo; o Ajustes del navegador → borrar datos del sitio **conservando** una copia de seguridad (Opciones → Exportar) — último recurso, borra la partida.
4. A partir de aquí no hay que hacer nada: el aviso sale solo.

Para comparar con otro dispositivo: el commit de «Versión» debe coincidir con el último de `main` (Actions → «Publicar web»).

## Pruebas

- `apps/web/src/version.test.ts`, `actualizacion.test.ts` (comparación, aviso, guardar antes de recargar, sin conexión no quita el aviso); `tests/paquetes-de-deporte.test.ts` (huella).
- **`npm run probar-actualizacion`** (~1 min, Chromium): construye dos compilaciones con distinta versión, sirve con `max-age=600` como Pages, abre la app con el service worker activo y crea una partida, publica la segunda, comprueba el aviso, pulsa «Actualizar» y verifica que corre la nueva y la partida (personaje y minuto, incluido lo jugado sin guardar) sigue. También «Estás al día» y la versión en Opciones y en el menú.
- No probado aquí: el flujo con el fútbol publicado (la huella está probada en test, no en el navegador) y un Chrome real con el service worker viejo (`v1`) instalado.

## Notas

- `limpiarCopias()` pide `registration.update()` y borra las `caches`; si se cae la red justo después, la app no abre sin conexión hasta la siguiente visita con red.
- Si se cambia la estrategia del service worker, subir `VERSION` en `apps/web/public/sw.js`.
- Retrato/Samsung Internet: no se ha tocado más que `style.css` (tres reglas nuevas al final) y `main.ts` (sin tocar el dibujo).
