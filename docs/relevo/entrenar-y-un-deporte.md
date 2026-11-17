# Relevo: entrenamientos agrupados y un solo deporte de competición (17/11/2026)

Rama `claude/entrenar-y-un-deporte` (sale de `claude/youthful-clarke-vs0kye`). Sin pull request. No toqué `DECISIONES.md`.

## 1. Entrenamientos agrupados — HECHO

- **Dato:** `ActionDef.desplegable?: { id, nombre, etiqueta, boton }` (contracts, `actions.ts`, tipo `DesplegableDeAcciones`), copiado a `ActionOption.desplegable` (core, `game.ts`). Las acciones del mismo `group` con el mismo `desplegable.id` se agrupan; sirve para cualquier lista larga.
- **Kit:** `entrenosAgrupados(cfg, acciones)` (`club.ts`) pone `{ id: '<deporte>.entrenar', nombre: 'Entrenar…', etiqueta: 'Entrenamiento', boton: 'Entrenar: {opcion}' }` a los `cfg.entrenosLibres`. Lo usan atletismo (series, rodaje, técnica) y fútbol (balón, tiro, físico, portería). La sesión del club, el campamento, etc. no se agrupan. Los ids no cambian: sim, bots y tests igual.
- **Web:** `apps/web/src/desplegables.ts` (nuevo: agrupa, dibuja y guarda lo abierto y lo elegido, con el mismo aspecto que «Pedir jugar…»: botón con ▼/▲ y `formulario-plan`) y cuatro líneas en `main.ts` (`viewActions`, `actionButton` con nombre opcional, `click` y `change`). No toqué `gente.ts`. Cada opción del select lleva su duración y «(no disponible)»; debajo salen la descripción y el botón que lanza la elegida, con su duración y su motivo. Con «Ver lo que no está disponible» desactivado, un desplegable sin ninguna opción disponible se oculta como las demás acciones; con alguna disponible, salen todas (las no disponibles marcadas). Por defecto se elige la primera disponible.
- **Capturas** (Chromium, deviceScaleFactor 1, 480 px): `docs/relevo/entrenar-antes.png` (tres botones sueltos bajo «Entrenar atletismo») y `docs/relevo/entrenar-despues.png` (un «Entrenar…» con el desplegable abierto).

## 2. Un solo deporte de competición — HECHO

- **Kit** (`club.ts`): `motivoDeCompetirEnOtroDeporte(ctx, deporte)` mira `ClubDirectory.membership` de las demás fichas (`deportes.ficha`) de la partida. Ningún deporte importa a otro y no hubo que tocar contracts. `accionesDeClubes` envuelve las acciones de entrada (apuntarse al colegio, apuntarse, pedir prueba, unirse a la prueba, prueba, aceptar plaza): salen no disponibles con **«Ya compites en <deporte>: déjalo antes»** (el nombre sale en minúscula de la ficha). Aceptar o rechazar el cambio de puesto (ya dentro del equipo) no se envuelve. Entrenar por tu cuenta, tele, etc.: sin cambios.
- **PNJ:** `Npc.deporte` es uno solo; comprobado en una partida con atletismo y fútbol (1446 personas, 690 con club, todas con deporte, ninguna con datos de competición `vp`/`letra`/`est` de dos deportes). Lo recoge un test.
- **Bots y herramientas:** `sim/src/bots.ts` (cada bot se apunta solo al club de su deporte), `tools/benjamin.ts` y `tools/probar-web.ts` (solo fútbol) no se apuntan a dos deportes: sin cambios.
- **Partidas ya empezadas con clubes en dos deportes:** conservan las dos membresías hasta que dejen una (no hay migración). `deportePrincipal` y el selector de la pestaña siguen ahí por eso.

## Tests

- `tests/un-deporte.test.ts` (nuevo): bloqueo en los dos sentidos con el motivo, entrenar por libre sigue permitido, dejar el club abre la puerta, PNJ con un solo deporte, y el desplegable en las acciones de los dos deportes.
- `apps/web/src/desplegables.test.ts` (nuevo): agrupación, botón cerrado, desplegable abierto con duración y motivo, elección.

## Docs

`ANEXO_DEPORTE.md` (§1 y §2: «Un solo deporte de competición» y «Entrenamientos agrupados») y `PLAN_DEPORTES_MODULARES.md` (§1 y §2).

## Dudas para la arquitectura

1. ¿Migrar las partidas ya empezadas con dos clubes (que dejen uno al cargar) o dejarlas? Hoy se dejan.
2. ¿Agrupar también otras listas largas (las tutorías y «Estudiar…» de estudios, que son ~30 botones en «Casa»)? Es solo poner `desplegable` a sus acciones; no lo hice porque no estaba en el encargo.
3. Los PNJ que «practican varios deportes por su cuenta» no existen hoy en el modelo (`Npc.deporte` único y sin práctica informal): no se ha añadido nada.

## Comprobado

`npm run typecheck`, `npm test` (96 archivos, 1122 tests), `npm run eventos:validar` (59 sucesos, 434 caminos), `npm run benjamin -- 31,33` y `npm run probar-web` (todo el camino en Chromium, sin errores en la consola): en verde.
`npm run sim:rapida` antes y después: **idéntica** (mismas acciones por bot y semilla y mismos chequeos); solo cambian la hora y la línea de rendimiento (⚠️ 828 acciones/s antes, ✅ 881 después: ruido de la máquina, la de «antes» corrió mientras se instalaban dependencias; el cambio no toca el motor).
