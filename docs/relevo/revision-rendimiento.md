# Revisión de rendimiento (21/11/2026)

Encargo de la arquitectura (rama `claude/revision-rendimiento`, desde `claude/youthful-clarke-vs0kye`). El usuario pidió medir porque se han metido muchas cosas (cuerpo, visualizador, sucesos, más PNJ, reparto de equipos, demografía, desplegables) sin medirlas. **Solo medir y diagnosticar; no se ha tocado el juego** (la huella es idéntica). Lo que hay de código son herramientas de medición y el chequeo de la simulación.

## 0. Resumen

1. **Ninguna regresión frente a `b7e5032`** (lo publicado antes del 21/11): en los tres escenarios (ciudad de prueba, ciudad grande con fútbol y navegador) los ms por acción, por día y por semana simulados son iguales o algo mejores (ruido ±10 %); el estado pesa +7 % (prueba) y +6 % (ciudad grande), casi todo `rasgos` (+22 %).
2. **El problema no es lo nuevo, es la ciudad grande con fútbol, que es lo que juega el usuario.** Frente a la ciudad de prueba: crear 0,6 s → **32 s**; estado 3 MB → **16 MB**; ms por acción 1,3 → **7,5–9,6**; guardar 60 ms → **~450 ms** (escritorio) y **~1,8 s en el móvil emulado**, en el hilo de la página (congela la pantalla).
3. **El fútbol es el 94 % de ese coste.** La misma ciudad grande solo con atletismo: crear 2,0 s, semana de juego 26–57 ms, `listActions` 6 ms, estado 12,7 MB. Con fútbol: 32 s, **370–875 ms por semana** (la pasada semanal de los ~6.100 PNJ: historia deportiva, plazas, reparto de equipos), 20 ms y 16 MB. En el móvil (×4) una semana son 1,5–3,5 s de pantalla congelada al cruzarla.
4. **El chequeo de Rendimiento de `npm run sim` ya es estable** (§4): la razón ms por acción ÷ calibración valía 0,17–0,20 en `main` y en la rama con el límite en 0,18, es decir, justo en medio del ruido. Ahora mediana + límite 0,22: ✅ las tres veces que se probó.
5. **Presupuesto y vigilante** (§5): `npm run presupuesto` (Node, en veces la calibración: no salta por máquinas lentas) y `npm run rendimiento:web` (Chromium, escritorio y móvil emulado).
6. **Arreglos: ninguno en el juego.** Todo lo que ahorraría tiempo de verdad cambia la partida (huella) o exige una decisión de diseño; van como propuestas (§6).

Máquina: contenedor de 4 CPU (calibración 7,2–7,7 ms), Node 22, una sola medición a la vez. «Antes» = `b7e5032` en un worktree con las mismas herramientas copiadas (`rendimiento.ts`, `rendimiento-web.ts`) y el mismo parche de `sim/src/runner.ts` (país en `Juego`). «Ahora» = esta rama.

## 1. Node: antes y ahora

`npm run rendimiento -- 60 --pasadas 5 [--ciudad]` (mediana de 5 partidas; bot equilibrado 60 días). Se hicieron **dos tandas** por versión y escenario; se dan las dos (la primera en frío cuenta aparte). El ruido entre tandas es ±10 %.

### Ciudad de prueba (España, atletismo; lo que mide `npm run rendimiento` de siempre)

| | `b7e5032` | Ahora |
|---|---|---|
| Crear (caliente / primera en frío) | 560–615 ms / 638–817 ms | 600–670 ms / 694–809 ms |
| Guardar: copiar estado / a texto | 29 ms / 26–31 ms | 33–34 ms / 27 ms |
| Cargar (leer texto y montar) | 18 ms | 19–24 ms |
| Estado | 2.764 KB | **2.969 KB (+7,4 %)** |
| Acciones por día (bot) | 37,3 | 40,3 |
| **ms por acción** | 1,49–1,62 | **1,31–1,36** |
| **ms por día simulado** | 55,7–60,3 | **52,5–54,8** |
| ms por semana simulada | 390–422 | 367–384 |
| `esperar` / presencia tras pasar el tiempo | 0,02–0,03 ms / 0,0006 ms | 0,03–0,04 ms / 0,0007 ms |

Los ms por acción bajan porque el bot hace ahora más acciones al día (más cosas que decidir); el coste por día es el mismo o algo menor.

### Ciudad grande + fútbol (lo que juega el usuario)

| | `b7e5032` | Ahora |
|---|---|---|
| Crear (primera en frío / caliente) | 29,2–31,6 s / 32,6–35,1 s | 30,0–30,8 s / 32,0–36,0 s |
| Guardar: copiar estado / a texto | 217–228 ms / 147–187 ms | 253–278 ms / 169–193 ms |
| Cargar | 128–131 ms | 125–158 ms |
| Estado | 15.197 KB | **16.090 KB (+5,9 %)** |
| Personas | 6.109 | 6.110 |
| `dir.list({})` (lista de todos) | 28–36 ms | 26–29 ms |
| Acciones por día (bot) | 37,5 | 40,1 |
| **ms por acción** | 9,32–9,60 | **7,55–8,35** |
| **ms por día simulado** | 349–359 | **302–336** |
| ms por semana simulada | 2.442–2.515 | 2.117–2.353 |

### Peso del estado por módulo y campo

Todo el peso es de `npcs` (el 99,5 %); el resto de módulos suman < 5 KB.

| Campo de las personas | Prueba `b7e5032` | Prueba ahora | Ciudad grande `b7e5032` | Ciudad grande ahora |
|---|---|---|---|---|
| `genetica` | 1.135 KB | 1.134 KB | 5.034 KB | 5.037 KB |
| `rasgos` | 748 KB | **913 KB (+22 %)** | 3.218 KB | **3.938 KB (+22 %)** |
| `hab` | — | — | 1.377 KB | 1.366 KB |
| `pico` / `cap` | 137 / 137 KB | 137 / 137 KB | 610 / 610 KB | 609 / 609 KB |
| `vp` / `capUlt` | — | — | 598 / 451 KB | 593 / 448 KB |
| `perks` | 70 KB | 70 KB | 309 KB | 314 KB |
| `tipos` | 32 KB | 41 KB | 275 KB | 305 KB |
| **Total estado** | **2.764 KB** | **2.969 KB** | **15.197 KB** | **16.090 KB** |

`genetica` + `rasgos` son el 56 % de la partida con la ciudad grande (9 de 16 MB). El crecimiento desde `b7e5032` es `rasgos` (el cuerpo y el aspecto heredables) y un poco `tipos`.

### Sin fútbol (de dónde viene el coste)

`npx tsx tools/rendimiento-semana.ts --ciudad [--sin-futbol]` (seed 31; «descansar» en pasos de 5 min durante 6 semanas):

| | Ciudad grande **sin** fútbol | Ciudad grande **con** fútbol | Ciudad de prueba |
|---|---|---|---|
| Crear | 2,0 s | **32,8 s** | 0,8 s |
| Cruce de semana (pasada semanal de los PNJ) | 26–57 ms | **368–875 ms** (crece al empezar la temporada: 425, 460, 368, 636, 873, 875) | 10–29 ms |
| Cruce de día (mediana) | 1,3 ms | 2,3 ms | 0,6 ms |
| `listActions()` (todas las acciones) | 6,1 ms | **20,6 ms** (mín 7,6, máx 210) | 3,1 ms |
| Paso normal de 5 min | 0,046 ms | 0,058 ms | 0,044 ms |
| Estado | 12,7 MB | 16,1 MB | 3,0 MB |

Cada acción del jugador cuesta por sí sola muy poco (el paso normal son 0,05 ms); el coste está en el **cruce de semana** y en **listar acciones**. Los 7,5–9,6 ms «por acción» de la ciudad grande son esencialmente (cruces de semana + `listActions` del bot) repartidos entre las acciones.

## 2. Navegador (Chromium, `npm run rendimiento:web`)

Chromium de Playwright, web construida con clave de prueba, fútbol instalado desde su paquete, ciudad grande, semilla 35. Escritorio: 1100×900. Móvil: perfil «Pixel 5» + `Emulation.setCPUThrottlingRate` ×4. Cada acción = clic en el botón y esperar dos `requestAnimationFrame` (tal como la ve el jugador: lo que tarda la página en responder y repintar); 60 acciones elegidas al azar. Guardar = `serializarJSON` + escribir el texto en IndexedDB. Abrir = recargar la página con la partida guardada hasta que hay partida.

| | Escritorio `b7e5032` | Escritorio ahora | Móvil ×4 `b7e5032` | Móvil ×4 ahora |
|---|---|---|---|---|
| Arrancar la página | 666 ms | 718 ms | 481 ms | 563 ms |
| **Crear («creando el mundo»)** | 26,6 s | 27,5 s | 29,5 s (*) | 27,8 s (*) |
| Acción: mediana / p90 | 23,7 / 39,2 ms | 24,6 / 36,1 ms | 47,1 / 69,6 ms | 45,4 / 71,3 ms |
| Acción: máximo | 373 ms | 290 ms | 1.090 ms | 1.588 ms |
| **Guardar: a texto** (hilo de la página) | 267 ms | 284 ms | 1.276 ms | 1.479 ms |
| Guardar: IndexedDB | 173 ms | 180 ms | 349 ms | 359 ms |
| Peso guardado | 15.073 KB | 16.056 KB | 15.073 KB | 16.056 KB |
| **Abrir de nuevo** | 775 ms | 829 ms | 3.245 ms | 3.509 ms |

(*) **El ×4 no llega al trabajador que crea la partida**: la creación sale igual en móvil que en escritorio. La cifra de creación en un móvil real **no está medida**; si fuera 3–4 veces más lenta que este contenedor serían 1,5–2 minutos (estimación, no medida). Para medirla de verdad hace falta un teléfono, o limitar también el trabajador (CDP `Target.setAutoAttach` con sesión por trabajador): pendiente.

Limitaciones de la muestra: las 60 acciones caen en el primer día de juego (no cruzan ninguna semana), así que **no incluyen la pasada semanal** (370–875 ms en escritorio, ×4 en móvil). La muestra de acciones del navegador no representa un día de partido. Una acción de 1,6 s en el móvil es un paso con trabajo extra, no la mediana (probablemente un cruce de día o de semana: no está identificado).

Sin regresión en el navegador: las diferencias entre versiones (±5 %) están dentro del ruido salvo el peso guardado (+6 %), que se refleja en guardar/abrir.

## 3. Puntos calientes (perfil de CPU, `node --cpu-prof`)

Ciudad grande con fútbol. Crear la partida = construir la «historia» de cada persona con el mismo paso semanal que luego se ejecuta en el juego, así que los puntos calientes de crear y de la semana son los mismos. Crear solo (32 s), por tiempo propio:

| # | Función | % |
|---|---|---|
| 1 | `pasoDeSemanas` (`modules/npcs/src/semana.ts`) | 10,9 |
| 2 | `rngEstable` (`packages/contracts/src/rng.ts`): hash FNV de las partes y creación del generador, millones de veces | 10,2 |
| 3 | `elegirEjercicios` (`packages/kit-deporte/src/ejercicios.ts`) | 8,7 |
| 4 | `preferenciaDe` (`modules/npcs/src/plaza.ts`) | 6,3 |
| 5 | `indiceDeHabilidad`, `acumular`, función anónima de `rutina.ts` | 4,5 + 4,1 + 4,2 |
| 6 | función anónima de `semana.ts` | 4,1 |
| 7 | recolector de basura | 3,9 |
| 8 | `listaDeSesion` (`semana.ts`) | 2,8 |
| 9 | `computeCap`, `computeSpeed` (`progresion.ts`), `entrenarStat` | 2,7 + 2,2 + 2,6 |
| 10 | `valorRealDe` (`plaza.ts`) | 2,4 |

El perfil completo de un bot de 60 días (crear + guardar + jugar, 95 s) da el mismo orden, con `semana.ts`, `rngEstable`, `preferenciaDe` y `plaza.ts` encabezando, y añade `agendaConPartido`/`agendaDePersona` (`modules/npcs/src/index.ts`, ~3,5 %) y `ubicacionEn` (1,4 %) del lado del juego, y la copia/serialización del estado.

Qué ha crecido y por qué (frente a `b7e5032`): casi nada en tiempo (iguales dentro del ruido); en peso, `rasgos` +22 % (cuerpo y aspecto). Los costes grandes **ya estaban** en `b7e5032` (creación 29–31 s, 15 MB); no los ha metido ninguna de las cosas nuevas que se temía (cuerpo, visualizador, sucesos, desplegables). Lo que sí ha cambiado el uso es que ahora el usuario juega con la ciudad grande y el fútbol.

### Sucesos (`npm run eventos:rendimiento`)

Con 500 sucesos generados: arranque ~0 ms (objetivo < 50), **0,031 ms por acción** (añade 0,013 ms; objetivo < 0,02 ms: cumple), pasada diaria +0,31 ms (objetivo < 1 ms). Cierre de semana de los PNJ con sus sucesos de vida: ciudad del juego 11 → 17 ms (20 sucesos de vida) y 23 ms (100). Esa herramienta usa la ciudad de prueba; **no mide la ciudad grande**, donde la base de la semana ya es 400–900 ms: el coste de los sucesos de PNJ por semana crecerá con las personas (proporcional) y conviene medirlo con la ciudad grande antes de activarlos todos (propuesta 6).

## 4. Chequeo de Rendimiento de `npm run sim` (estabilizado)

**Diagnóstico.** El chequeo compara ms por acción con `0,18 × calibración` (carga fija de 150.000 iteraciones, mejor de 5). Medido con `npm run sim:rapida` tres veces por versión:

| | ms por acción | calibración | razón |
|---|---|---|---|
| `b7e5032` | 1,47 / 1,49 / 1,47 | 7,2 / 7,6 / 7,7 | 0,20 / 0,20 / 0,19 → ⚠️ ⚠️ ⚠️ |
| Rama, antes del cambio | 1,36 / 1,29 / 1,30 | 7,5 / 7,7 / 7,6 | 0,18 / 0,17 / 0,17 → ⚠️ ✅ ✅ |

O sea que el motor no es más lento: la razón real es 0,17–0,20 y el límite (0,18) caía justo en el ruido de la calibración (±3 %) y del reparto de acciones entre estrategias. Los «ms por año simulado» son iguales (17,5–18,9 s).

**Cambio** (`sim/src/analysis.ts`, `sim/src/index.ts`; no toca el juego):
- La calibración se mide **al principio, a la mitad y al final** y se usa la **mediana** (antes: media del principio y el final).
- Los ms por acción son la **mediana entre estrategias** de (ms ÷ acciones), no el total: una estrategia que cae en una pasada con la máquina ocupada ya no decide el chequeo.
- `LIMITE_RELATIVO` 0,18 → **0,22** (≈ 1,2–1,3 × la razón actual): solo salta con una pérdida real del ~20–30 %.

Resultado: `npm run sim:rapida` ×3 → ✅ ✅ ✅ (razón 0,168–0,171; límite 1,65–1,68 ms). Con el criterio nuevo `b7e5032` (razón 0,20) también habría salido ✅. No cambia ningún otro chequeo (la tabla de balance no depende de esto).

## 5. Presupuesto propuesto

Los de Node van **en veces la calibración** (cal ≈ 7,5 ms en este contenedor): `npm run presupuesto [-- --ciudad]` los mide (mediana de 3 pasadas) y sale con error si alguno se pasa. El peso del estado no depende de la máquina y se compara en KB. Las cifras del navegador son absolutas (dependen de la máquina; sirven de referencia para esta y para el móvil emulado).

| Medida | Medido (ciudad de prueba) | Presupuesto | Medido (ciudad grande + fútbol) | Presupuesto |
|---|---|---|---|---|
| Crear la partida | 84–88 × cal (0,67–0,74 s) | ≤ 110 × cal (~0,8 s) | 4.170 × cal (32 s) | ≤ 5.500 × cal (~41 s: «unos 40 s» de la pantalla) |
| Guardar (copiar + texto) | 6,6–7,6 × cal (58 ms) | ≤ 12 × cal | 60 × cal (460 ms) | ≤ 75 × cal |
| Cargar | 2,8–3,1 × cal (24 ms) | ≤ 5 × cal | 18 × cal (140 ms) | ≤ 25 × cal |
| ms por acción (bot) | 0,16–0,17 × cal (1,3 ms) | ≤ 0,22 × cal | 0,66 × cal (5,0 ms; 7,5–9,6 con 60 días) | ≤ 1,4 × cal |
| Semana de juego (la más cara de 4) | 5,7–5,9 × cal (43–52 ms) | ≤ 10 × cal | 79 × cal (607 ms; hasta 875 ms) | ≤ 150 × cal (~1,1 s) |
| Estado | 2.978 KB | ≤ 3.300 KB (+11 %) | 16.146 KB | ≤ 18.000 KB (+11 %) |

Navegador (`npm run rendimiento:web`), ciudad grande + fútbol; **presupuesto propuesto** (hoy / tope):

| | Escritorio hoy | Escritorio tope | Móvil ×4 hoy | Móvil ×4 tope |
|---|---|---|---|---|
| Acción, mediana (clic → repintado) | 25 ms | ≤ 40 ms | 45 ms | ≤ 80 ms |
| Acción, p90 | 36 ms | ≤ 70 ms | 71 ms | ≤ 130 ms |
| Guardar (a texto + IndexedDB) | 0,46 s | ≤ 0,7 s | 1,8 s | ≤ 2,5 s |
| Abrir de nuevo | 0,8 s | ≤ 1,5 s | 3,5 s | ≤ 5 s |
| Crear («creando el mundo») | 27 s | ≤ 45 s | sin medir (ver §2) | — |

**Cómo se vigila sin ser frágil.** (a) `npm run presupuesto` (≈ 40 s la ciudad de prueba, ≈ 4 min con `--ciudad`) en cada unión; no va dentro de `npm test` porque son minutos y miden tiempo. (b) Lo único determinista, el peso del estado, es candidato a test normal de `npm test` (crear la ciudad de prueba son 0,7 s; si se quiere, `expect(KB).toBeLessThan(3300)`); no lo he añadido porque cambia los tests y la decisión de qué tope es de la arquitectura. (c) `npm run rendimiento:web` (≈ 3 min) antes de publicar. (d) Si un tope salta, **repetir**: la pasada baila ±10 %; solo cuenta si salta dos veces seguidas.

## 6. Propuestas, ordenadas por ganancia y coste

Ninguna se ha hecho: todas cambian la partida (la huella) o piden una decisión de diseño.

| # | Propuesta | Ganancia | Coste / riesgo |
|---|---|---|---|
| 1 | **Pasada semanal de los PNJ del fútbol más barata con la ciudad grande** (370–875 ms → objetivo < 100 ms): resolver por equipo/club en lugar de por persona (la historia deportiva `pasoDeSemanas`, `preferenciaDe`/`valorRealDe`, `elegirEjercicios`); o solo los niños «activos» (en club, convocables o cercanos) cada semana y el resto en bloques de 4 semanas con la fórmula cerrada, como ya se hace en la historia inicial. | Semana: 0,4–0,9 s → < 0,1 s; en el móvil quita la congelación de 1,5–3,5 s al cruzar de semana. Lo mismo que la creación (fútbol = 30 de los 32 s). | Alto: cambia los números de cada PNJ (**huella distinta**, `sim` y `benjamin` a repetir) y es una decisión de diseño («las mismas reglas para el personaje y los PNJ»). Pasarlo a la arquitectura. |
| 2 | **Crear con la ciudad grande en 32 s → ~5–10 s**: el 94 % es el fútbol de ~6.100 personas (con atletismo solo, 2 s). Historia en bloques de 4 semanas con la fórmula cerrada también para el fútbol (el atletismo ya lo hace), o historia deportiva solo de los que juegan. | Crear: −20 a −25 s en escritorio, mucho más en móvil real. | Alto, mismo motivo que 1. Además, de aquí sale la mitad de 1 gratis si se comparte la implementación. |
| 3 | **Guardar fuera del hilo de la página** (ahora `serializarJSON` de 16 MB bloquea 0,3 s en escritorio y 1,5 s en el móvil emulado en cada guardado): serializar en un trabajador (como ya se crea la partida) o, al menos, partir el texto en trozos con `await` entre ellos; y subir la recomendación de guardado espaciado (`recomendarFrecuencia`) para la ciudad grande. | Quita la congelación de cada guardado. | Medio. No cambia la partida (huella igual). Es la más barata de las «grandes»; el estado hay que copiarlo al trabajador (`structuredClone` ~ 0,25 s) o serializarlo allí con un estado ya clonado. |
| 4 | **Estado más pequeño**: `genetica` + `rasgos` son 9 de los 16 MB (56 %); `rasgos` creció un 22 % con el cuerpo y el aspecto. Guardar los números redondeados (3 decimales) y/o en listas en lugar de objetos con claves, o recalcular lo derivable de la semilla en lugar de guardarlo. | −30 a −50 % de peso → guardar/abrir/copiar proporcionalmente. | Medio; cambia el formato de guardado (subir la versión y migrar) y los números si se redondea (huella). |
| 5 | **`rngEstable` más barato** (10 % de crear y de la semana): precalcular el hash de las partes constantes por persona (por ejemplo `semilla|id|`) y mezclar solo las variables. Da los mismos números si el hash final es el mismo. | 5–8 % de crear y de la pasada semanal. | Bajo si se mantiene el hash exacto (huella idéntica comprobable con `npm run huella`); lo he dejado porque la ganancia es pequeña y toca contracts. |
| 6 | **Medir los sucesos de PNJ con la ciudad grande** antes de activar todas las clases: `eventos:rendimiento` solo usa la ciudad de prueba; con la grande la base de la semana son 400–900 ms y +55–105 % de los sucesos de vida (medido en prueba) serían medio segundo más. | Evita un susto al activar los sucesos de vida. | Bajo: añadir `--ciudad` a `tools/eventos-rendimiento.ts`. |
| 7 | **`listActions` con fútbol: 20,6 ms (6 sin él)**; el clic ya cuesta ~25 ms en escritorio y ~45 ms en el móvil emulado. Está dentro del presupuesto; si se quiere bajar, calcular las acciones del fútbol solo cuando la pestaña del deporte o el club están a la vista. | 10–15 ms por clic. | Bajo/medio; no urgente. |
| 8 | Medir en un teléfono real (o limitar también el trabajador de creación, ver §2): no sabemos cuánto tarda crear la partida en un móvil. | Un dato que falta; puede decidir la prioridad de 2. | Bajo. |

**Orden recomendado:** 3 (barato, quita la congelación al guardar) → 6 y 8 (medir lo que falta) → 1 y 2 juntos (decisión de diseño de la arquitectura; son lo que de verdad cambia la experiencia con la ciudad grande) → 4 → 5, 7.

## 7. Dudas / decisiones para la arquitectura (no tomadas)

- **¿Se admite que la ciudad grande cree la partida en ~30 s y cruce de semana en ~0,5–0,9 s (×4 en el móvil)?** Es lo que ya había en `b7e5032` y lo que pone el texto «unos 40 s» de la pantalla, pero ahora es lo que va a jugar el usuario, también en el móvil. Si no: propuestas 1 y 2 (cambian números de los PNJ).
- **Tope de estado** (3.300 KB prueba, 18.000 KB ciudad grande): ¿se vigila en `npm test`?
- Subir `LIMITE_RELATIVO` a 0,22 es una decisión de calibración que dejo a la vista en `sim/src/analysis.ts` (el límite anterior dependía del azar); no he tocado `DECISIONES.md`, como se pidió.

## 8. Herramientas y cambios en el repositorio

| | |
|---|---|
| `tools/rendimiento.ts` | Ahora con `--ciudad` (ciudad grande + fútbol), `--pasadas N` (mediana y rango), `--json`; calcula ms por día y semana simulados. |
| `tools/rendimiento-semana.ts` | Desglose: crear, cruce de semana, cruce de día, paso normal, `listActions`; `--ciudad`, `--sin-futbol`, `--solo crear\|semanas\|listar` (para perfilar). |
| `tools/rendimiento-web.ts` (`npm run rendimiento:web`) | Chromium: crear, acción, guardar, abrir; escritorio y móvil ×4. |
| `tools/presupuesto.ts` (`npm run presupuesto`) | El presupuesto de §5 en veces la calibración. |
| `sim/src/runner.ts` | `Juego.pais`: la simulación puede jugar en una ciudad dada. |
| `sim/src/analysis.ts`, `sim/src/index.ts` | Chequeo de Rendimiento estable (§4). |

Cómo repetir: `npm run rendimiento -- 60 --pasadas 5 --ciudad --json`, `npx tsx tools/rendimiento-semana.ts --ciudad`, `npm run rendimiento:web`, `npm run presupuesto -- --ciudad`; perfil: `node --import tsx --cpu-prof tools/rendimiento-semana.ts --ciudad --solo semanas`.

## 9. Comprobaciones

- `npm run typecheck`: sin errores.
- `npm run huella -- 60`: idéntica a la de la rama antes de los cambios (`8102f8c`; no se toca el juego).
- `npm run benjamin -- 31,33` y `npm run probar-web`: funcionan («todo el camino funciona en el navegador»).
- `npm test`: 105 archivos, 1.187 tests en verde (790 s).
