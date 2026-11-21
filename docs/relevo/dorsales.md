# Relevo: dorsales, crónica sin nombres de desconocidos y comparación en «Mi equipo» (rama `claude/dorsales`, sale de `claude/youthful-clarke-vs0kye`)

Encargo del usuario (21/11/2026, `DECISIONES.md` «Dorsales, crónica sin nombres de desconocidos y comparación en “Mi equipo”»; **no he tocado `DECISIONES.md`**). Sin pull request. Reglas y cifras: `ANEXO_DEPORTE.md` («Dorsales, crónica…»).

## 1. Qué hay

- **`packages/contracts/src/dorsales.ts`**: `ReglaDeDorsales`, `asignarDorsales`, `dorsalDeCampo`, `dorsalDePortero` (puras, `rngEstable`). Dato del deporte: `PuestosDeDeporte.dorsales`; fútbol: `DORSALES_DE_FUTBOL` (`modules/futbol/src/puestos.ts`). Otro deporte de equipo solo da su regla.
- **PNJ** (`modules/npcs`): `Npc.dorsal` (`Record<deporte, número>`), `repartirDorsales` (se llama al final de `fijarEquipos`), `plantillaDeUnEquipo` devuelve `JugadorDeEquipoView.dorsal` (guardado, o asignado al vuelo a quien llegó después) y `sinDeporte` lo borra.
- **Personaje** (`modules/futbol`): `FutbolState.dorsal: [club, número]`; `dorsalDelPersonaje` (escoge entre los que sus compañeros no llevan; portero, después de los de campo) y `guardarMiDorsal` (al entrenar con el club y al registrar un partido). Hasta entonces sale el mismo número calculado al vuelo.
- **Crónica** (`modules/futbol/src/personaje.ts`): `cronicaDelPartido` nombra por dorsal a quien no se conoce (`dorsales`, `generos`, `lado`); `registrarPartidoDelPersonaje` filtra los nombres a los conocidos (`nombresQueConoce`) y saca los géneros del directorio (`generosDe`).
- **«Mi equipo»** (`CompaneroDeEquipo.dorsal/comparacion`, `viewMiEquipo` en `apps/web/src/deporte.ts`): tras la corrección del usuario (vía la arquitectura), la **descripción de los desconocidos va entera**; el dorsal va delante del nombre o la descripción («7 · Una niña de pelo…») y «Frente a ti: mejor/peor/parecido/—» debajo, en pequeño. (Quité la descripción corta que había hecho antes.)

## 2. Decisiones de diseño que he tomado (no estaban en el encargo; a revisar)

0. **Mi equipo:** una sola columna para la persona (dorsal + descripción entera + comparación en pequeño debajo) y otra de puesto; no hay columnas aparte porque en 390 px no cabían sin acortar.
1. **«Se conserva mientras siga en el equipo» = mientras siga en el club.** Si cambia de letra o de categoría dentro del club, conserva el número (si nadie lo ha cogido); si cambia de club (`sinDeporte` + `reclutarA`), pierde el suyo y recibe uno nuevo.
2. **Costumbre por puesto: 55 %** de los de campo (cifra provisional). El 1 para el portero con un 65 % frente al 13.
3. **Quien se conoce con el partido ya en marcha:** la crónica usa lo que sabías **al registrar** el partido. Los rivales y compañeros pasan a «conocidos» al competir (`competicion.resultado`), así que la crónica de ese partido sigue por dorsal y la del siguiente ya trae sus nombres. Ver la captura (todos salen con dorsal salvo los tres que marqué como conocidos).
4. **Concordancia:** «la 7» / «vuestra 4» para las chicas (por `gender`), «el 7» / «vuestro 4» para los chicos. Con un nombre, su equipo entre paréntesis; con dorsal, no (ya lo dice).
5. **El motor de partido no sabe de dorsales:** solo la presentación. No toca el azar ni la huella de los bots.
6. **Lo que NO he tocado:** la tabla «Plantilla · equipo» (sigue con aspecto largo para desconocidos y sin dorsal; en móvil es ancha), el log del juego y las listas de goleadores, que siguen sin nombrar por dorsal (se podrían apoyar en lo mismo). Las partidas guardadas antes no tienen la regla de dorsales en su población (no se sube `SAVE_VERSION`): no tendrán dorsales hasta una partida nueva.

## 3. Pruebas y mediciones

- `modules/futbol/src/dorsales.test.ts` (únicos, rangos, porteros, costumbre, estabilidad), `modules/futbol/src/personaje.test.ts` (crónica por dorsal, nombres, concordancia), `tests/mi-equipo.test.ts` (dorsales en una partida, comparación «—» → mejor/peor/parecido, dorsales estables).
- Capturas (Playwright, Chromium, deviceScaleFactor 1, ciudad grande, semilla 35; `tools/capturas-dorsales.ts`) en `docs/relevo/dorsales/antes` y `docs/relevo/dorsales/despues`: `mi-equipo-{movil,escritorio}.png` (390 y 1280 px) y `cronica-{movil,escritorio}.png`. Tres compañeros marcados como conocidos para ver nombres y dorsales juntos.
- Peso: `npm run presupuesto -- --peso` 2971 KB (tope 3300; referencia anotada 2968).
- Resultados de `typecheck`, `npm test`, `npm run benjamin -- 31,33` y `npm run probar-web`: ver §4.
