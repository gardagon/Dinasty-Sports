# Medir rendimiento 2 (22/11/2026)

Encargo de la arquitectura (rama `claude/medir-rendimiento-2`, desde `claude/youthful-clarke-vs0kye`): análisis con propuesta a partir de `docs/relevo/revision-rendimiento.md` §6 y §7. **No se ha tocado el juego** (`npm run huella -- 60` idéntica antes y después, §7). Lo que hay son herramientas de medida. No se ha editado `docs/DECISIONES.md`.

Máquina: contenedor de 4 CPU, Node 22.23, Chromium de Playwright; una sola medición a la vez. Todas las cifras son **mediana (mínimo–máximo)** de 3 pasadas salvo que se diga otra cosa. Los resultados en bruto están en `docs/relevo/medir-rendimiento-2/`.

## 0. Resumen

1. **La línea de base del informe anterior ya no es esta.** El informe (`revision-rendimiento.md`) midió la ciudad grande **antes** de `e98bc24` («Fútbol más barato», `docs/relevo/futbol-mas-barato.md`), que está en la rama de partida. Hoy, en escritorio: **crear 7,7 s** (el informe: 32 s), **cruce de semana 0,19 s de motor / 0,30 s con el repintado** (el informe: 0,37–0,88 s). Los «~30 s al crear y 0,5–0,9 s al cruzar de semana» de §7 son hoy, más o menos, **las cifras de un móvil ×4**: crear **33 s**, cruzar de semana **0,8 s de motor / 1,15 s con el repintado** (peor semana 1,3 s).
2. **En un móvil emulado ×6 (más lento): crear 51 s, cruzar de semana 1,2 s de motor / 1,7 s con repintado (peor 2,2 s).** Con la ciudad de prueba: crear 0,8 s (escritorio) / 2,2 s (×4) / 3,5 s (×6) y cruzar de semana 26 / 67 / 93 ms: ahí no hay problema.
3. **Chromium no deja limitar la CPU de un trabajador** («Operation is only supported for pages, not workers»), que es lo que el informe anterior dejó pendiente. Para medir la creación en un móvil se quita `Worker` de la página y crea ella misma (la web ya tiene ese camino): mismo trabajo, en el hilo que sí se limita. En escritorio las dos formas dan lo mismo (7,0–7,2 s en la página frente a 7,5–8,2 s en el trabajador, que además pasa el estado a texto y la página lo abre).
4. **Dónde va el tiempo** (ciudad grande, escritorio):
   - **Crear (7,8 s):** historia deportiva de los PNJ 4,1 s (52 %), reparto de equipos («draft») 2,6 s (33 %), el colegio 0,5 s, capacidades 0,45 s; el resto, < 0,3 s.
   - **Cruce de semana sin liga (75 ms):** `semanaDeportiva` 56 (de ellos `semanaDeNino` 35), capacidades 7, cuerpo 7, estado 2,5, sucesos 2.
   - **Cruce de semana con jornada de liga (241 ms):** pasada semanal de `npcs` 100 ms (`semanaDeportiva` 80), **jornada de liga 79 ms** (+ **32 ms** del manejador `partido.mundo` de `npcs` que aplica los resultados: **111 ms en total**, el 46 %), sucesos 10, `dia.inicio` del fútbol 7, resto 15.
   - El perfil es **plano**: no hay una función que se lleve más del 6 % propio; es trabajo por persona (6.100) y por equipo (~150 lados de partido).
5. **Sucesos de los PNJ con la ciudad grande** (§1): activar solo `lesion` cuesta **+15 ms** por cruce de semana (+13 %); todas las clases con 20 o 100 sucesos de vida, **+40–49 ms** (+34–42 %); por día, +0,2–0,4 ms. Cuesta lo mismo con 20 que con 100 sucesos: lo que pesa es recorrer a las 6.100 personas, no cuántos sucesos hay.
6. **Lo que se puede abaratar sin cambiar un número es poco** (§4): una caché de la «bolsa» del reparto de equipos, **medida**, ahorra ~1 % de crear (con huella idéntica); las demás microcachés estimadas, ≤ 4 %. Lo que de verdad mueve algo con los mismos números es **repartir la historia deportiva entre hilos** (estimado −30 % de crear) y, para la sensación del jugador, **pintar «pasando la semana…» antes de cruzar** (no cuesta CPU). Lo demás cambia la partida.
7. **Recomiendo** (§5): (1) pintar un aviso antes de cruzar de semana y decir «hasta un minuto» donde hoy dice «unos 40 s»; (2) la historia deportiva en hilos (huella idéntica, el mayor ahorro posible de crear); (3) solo si se acepta cambiar números de los PNJ, bloques lejanos de 26 semanas y `SEMANAS_DE_LOS_LEJANOS` 8 → 13.

## 1. Sucesos de los PNJ con la ciudad grande (punto 6 de §6)

`npm run eventos:rendimiento -- 500 4 --ciudad --solo-pnj [--pasadas 3]` (nuevo `--ciudad`, `--solo-pnj`, `--pasadas`; ahora da **mediana y rango** y mide también el **cambio de día**, no solo el cierre de semana). Por cruce, con las clases de los PNJ desactivadas, solo `lesion` (lo decidido) y todas con 20 y 100 sucesos de vida. Pasadas: 6 (ciudad del juego y de prueba) y 3 (ciudad grande), 4 semanas por pasada (las 4 primeras tras cargar la partida: **sin jornada de liga**), partida cargada con `cargarPartida` (por eso la base de la ciudad grande, 118 ms, es mayor que los 75 ms de §3: caliente frente a recién cargada).

| Ciudad (personas) | Configuración | Cierre de semana, ms | Δ | Cambio de día, ms | Δ |
|---|---|---|---|---|---|
| Del juego, atletismo (1.420) | Todo desactivado | 8,3 (6,9–9,2) | | 0,50 (0,39–0,63) | |
| | Solo lesiones | 7,9 (7,4–8,4) | −5 % | 0,52 | +4 % |
| | 20 sucesos de vida | 13,4 (11,8–17,4) | +5,1 ms (+61 %) | 0,50 | 0 % |
| | 100 sucesos de vida | 17,1 (16,4–23,1) | +8,8 ms (+106 %) | 0,56 | +10 % |
| De prueba, con fútbol (307) | Todo desactivado | 3,3 (2,8–3,8) | | 0,34 | |
| | Solo lesiones | 3,0 (2,4–5,3) | −8 % | 0,27 | −20 % |
| | 20 sucesos de vida | 5,5 (4,9–6,1) | +2,3 ms (+69 %) | 0,40 | +19 % |
| | 100 sucesos de vida | 8,3 (6,4–9,8) | +5,0 ms (+154 %) | 0,38 | +13 % |
| **Grande, con fútbol (6.113)** | Todo desactivado | **117,6 (117,0–135,7)** | | **1,56 (1,52–1,74)** | |
| | Solo lesiones | 133,1 (131,1–153,4) | **+15,5 ms (+13 %)** | 1,87 (1,86–1,97) | +0,3 ms (+20 %) |
| | 20 sucesos de vida | 166,4 (159,7–167,8) | **+48,8 ms (+41 %)** | 1,92 (1,90–1,92) | +0,4 ms (+23 %) |
| | 100 sucesos de vida | 157,7 (153,8–180,0) | **+40,1 ms (+34 %)** | 1,77 (1,70–1,93) | +0,2 ms (+13 %) |

Lectura: el coste es **proporcional a la gente** (≈ 7–8 µs por persona y semana con todas las clases) y casi no depende de cuántos sucesos haya (20 o 100: la diferencia está dentro del ruido). Con la ciudad grande, activar todas las clases añade ~40–50 ms a un cruce de semana de 75–240 ms; en un móvil, aplicando el factor medido en §2 (×4,3 / ×6,3), **~0,2 s (×4) y ~0,3 s (×6)** más (estimado con ese factor, no medido). Las marcas de personas crecen con el catálogo (488 con 100 sucesos tras 4 semanas): vigilar el peso del estado si se activan.

## 2. Crear y jugar en un móvil (punto 8)

`tools/rendimiento-web.ts` (`npm run rendimiento:web`) ahora:
- tiene los perfiles `escritorio`, `movil4`, `movil6` y `escritorio-pagina` (`--perfil todos` = los tres primeros) y `--ciudad grande|prueba|ambas`, `--pasadas N`;
- en los de móvil **crea la partida en la página** (quita `Worker`), porque `Emulation.setCPUThrottlingRate` **no admite trabajadores** (probado: `Target.setAutoAttach` + `Target.sendMessageToTarget` → «Operation is only supported for pages, not workers»). La cifra de crear es entonces el trabajo de crear a ×4/×6 **sin** el paso a texto y de vuelta del trabajador (en escritorio el trabajador cuesta ~0,5–1 s más que la página: 7,5–8,2 s frente a 7,0–7,2 s) y con la página quieta mientras dura;
- mide **cruzar de día** (8 cruces seguidos) y **cruzar de semana** (6 seguidas: «descansar» de 5 en 5 minutos hasta justo antes y se cronometra el paso que cruza: motor, y total con repintado y dos `requestAnimationFrame`). La jornada de liga cae en las semanas 4 a 6 de esta serie (las primeras tras la pretemporada);
- guarda, abre y mide el clic de una acción como antes (40 acciones, todas del primer día).
`tools/rendimiento-web-tabla.ts` convierte la salida `--json` en estas tablas. Estado guardado: 16.800 KB (ciudad grande) y 3.036 KB (prueba).

### Ciudad grande + fútbol (6.100 personas), 3 pasadas

| | Escritorio | Móvil ×4 | Móvil ×6 |
|---|---|---|---|
| **Crear («creando el mundo»), s** | **7,7 (7,5–8,2)** | **32,9 (32,2–34,5)** | **50,7 (50,5–51,7)** |
| Cruzar de día: motor, ms | 4,1 (2,2–4,5) | 13,7 (9,1–16,1) | 22,2 (13,6–22,9) |
| Cruzar de día: total con repintado, ms | 42 (38–43) | 86 (84–106) | 137 (123–137) |
| **Cruzar de semana: motor, mediana de 6, ms** | **190 (173–201)** | **811 (762–850)** | **1.206 (1.137–1.212)** |
| **Cruzar de semana: total con repintado, mediana de 6, ms** | **303 (245–311)** | **1.153 (1.044–1.197)** | **1.692 (1.594–1.753)** |
| Cruzar de semana: la peor de 6 (total), ms | 351 (338–390) | 1.265 (1.194–1.346) | 2.229 (2.123–2.396) |
| Acción (clic → repintado): mediana / p90, ms | 26,2 / 40,2 | 47,5 / 87,8 | 72,0 / 160,1 |
| Acción: máximo, ms | 47 | 636 | 1.130 |
| Guardar: a texto en la página, ms | 125 (115–134) | 669 (641–672) | 978 (962–986) |
| Guardar: IndexedDB, ms | 168 (149–178) | 298 (296–333) | 424 (402–432) |
| **Guardar de verdad (por trozos): total, ms** | 166 (162–182) | 757 (621–794) | 1.032 (1.030–1.159) |
| **Guardar de verdad: lo más que se para la página, ms** | **34 (30–35)** | **39 (33–41)** | **34 (31–38)** |
| Abrir de nuevo, ms | 615 (612–617) | 859 (812–952) | 1.157 (1.050–1.159) |

Series de las 6 semanas seguidas (motor, ms; una fila por pasada): escritorio 87/88/80/257/173/191, 99/150/142/247/216/190, 88/96/102/294/229/201; ×4 359/374/378/893/791/762, 294/450/376/908/910/850, 357/692/458/952/830/811; ×6 492/661/522/1.320/1.767/1.206, 513/644/540/1.636/1.494/1.212. **Las semanas 1–3 (sin jornada) valen 0,08–0,15 s en escritorio y las 4–6 (con jornada) 0,17–0,29 s**; en ×4 0,3–0,7 s y 0,76–0,95 s. El cruce de día más caro (máx. de la serie, 0,2–1 s) es el que cae en domingo → lunes y lleva la semana dentro.

Factores frente al escritorio: crear ×4,3 (en la página: 32,9 / 7,1 s = ×4,6) y ×6,6–7,1; cruzar de semana ×4,3 y ×6,3. Salen un poco por encima del límite porque el recolector de basura también se frena.

### Ciudad de prueba (España, 1.400 personas, atletismo), 3 pasadas

| | Escritorio | Móvil ×4 | Móvil ×6 |
|---|---|---|---|
| Crear, s | 0,8 (0,6–0,8) | 2,2 (1,8–2,3) | 3,5 (3,3–3,6) |
| Cruzar de día: total con repintado, ms | 26 (24–27) | 31 (29–49) | 54 (49–58) |
| Cruzar de semana: motor / total con repintado (mediana de 6), ms | 9 / 26 | 34 / 67 | 52 / 93 |
| Cruzar de semana: la peor (total), ms | 29 | 90 (84–130) | 149 (113–208) |
| Acción: mediana / p90, ms | 26,1 / 27,8 | 34,3 / 42,8 | 43,6 / 80,9 |
| Guardar: a texto / IndexedDB, ms | 17 / 27 | 99 / 58 | 157 / 78 |
| Guardar de verdad: lo más que se para la página, ms | 24 | 23 | 29 |
| Abrir de nuevo, ms | 224 (152–248) | 570 (563–580) | 961 (915–964) |

Limitaciones: (a) ×4 y ×6 son **emulaciones de CPU**, no un teléfono: no emulan memoria, caché ni el calentamiento térmico, y el trabajador de creación va sin límite (por eso se crea en la página); no se sabe qué factor tiene un móvil real (mide con la calibración de `sim/src/analysis.ts` en ese móvil: aquí 5,5 ms para 150.000 iteraciones, mediana de 5; el informe anterior daba 7,2–7,7 en otra pasada: esta máquina es hoy ~30 % más rápida, lo que acerca aún más las cifras a la baja); (b) la muestra de acciones es del primer día; (c) hay que mirar `guardar de verdad`: el guardado por trozos que ya está en la web deja la página parada como mucho 30–40 ms; lo de «a texto» de 0,67–0,98 s es el coste de hacerlo de golpe (no es lo que ve el jugador).

## 3. Desglose de lo caro (punto 3)

Dos herramientas, sin cambiar el juego:
- **Perfil por tramo** (`tools/perfil-segmento.ts` con el inspector de Node y `tools/perfil-resumen.ts`): `crear`, `semanas-sin-liga`, `semanas-con-liga`. Muestreo de 100 µs: **infla los tiempos ~25–80 %** (crear 10,7 s frente a 7,8 s); sirve para el reparto, no para los ms.
- **Instrumentación temporal por bloque, en ms reales** (`docs/relevo/medir-rendimiento-2/instrumentar.py` + `desglose-semana.ts`; en `git checkout` se quita): suma el tiempo de cada manejador de evento del motor y de los bloques de `npcs`, `futbol` y `sucesos`. Para crear, la misma idea sobre `generarTodos`.

### Crear (ciudad grande, escritorio): 7,81 s (7,60–7,85), 3 pasadas

| Bloque (`modules/npcs/src/index.ts`, `generarTodos`) | ms | % |
|---|---|---|
| `conHabilidades`: **historia deportiva** de los que juegan (`historiaDeportiva`) | 4.078 (4.044–4.155) | 52,2 |
| `draftDeEquipos`: **reparto de equipos** | 2.572 (2.483–2.656) | 32,9 |
| `poblarElColegio` | 497 (464–563) | 6,4 |
| `conCapacidades(0)` | 446 (443–448) | 5,7 |
| `reclutarEnTodos` | 94 (87–106) | 1,2 |
| cuerpo, apuntados, entrenadores, reparto de familias, semilla | 37 | 0,5 |

Dentro de la **historia deportiva** (perfil, % de `historiaDeportiva`; × 0,8 para pasarlo a ms reales ≈ 3,3 s de 4,1): `pasoGrueso` (los bloques lejanos de 13 semanas) 45 %; `pasoDeSemanas` sin grueso (el último trimestre, bloques de 4 semanas, y el juego informal) 24 %; sesiones y huecos (`huecosPorLibre` 11 %, `huecosQueHace` 3 %); `historiaDe` (capacidades previas) 13 %; `habilidadesIniciales` 4 %. Por funciones: entrenar (`sesionDeClub`/`entrenarStat`) 22 %, elegir la lista de sesión (`listaDeSesion`/`elegirEjercicios`) 16 %, `computeCap` + `computeSpeed` 12 % (las funciones se solapan: la última está dentro de entrenar).
Dentro del **reparto de equipos** (perfil, % de `draftDeEquipos`): `draftDeUnaCategoria` 71 %; `intentarEntrar` 33 %; `aspirantesDeEdad` (la bolsa: recorre las 6.100 personas por edad en cada llamada) 19 %; `plazasDeMas` 15 %; `ofertasAlCandidato` 15 %; `valorRealDe` 11 %; `equiposDelClub` 14 %; `sinSobrantes` 12 %; `colocarDesplazados` 7 %. El tiempo propio está repartido en funciones anónimas de `draft.ts` y `plantillas.ts` (comparadores y filtros).

### Cruce de semana (ms por cruce, mediana de 3 pasadas de 10 semanas)

| Bloque | Sin liga (semanas 1–3) | Con jornada de liga (semanas 4–10) |
|---|---|---|
| **Total del paso que cruza** | **74,9 (73,3–114,0)** | **240,9 (210,2–291,2)** |
| `npcs` `semana.fin` (pasada semanal) | 70,1 | 100,3 (86,8–110,9) |
| · `semanaDeportiva` | 55,7 | 80,4 (68,4–87,3) |
| ·· `semanaDeNino` (la historia de cada niño un paso) | 35,4 | 56,1 (48,2–57,8) |
| ·· estado (cansancio, lesión), medias de equipo | 2,3 + 1,6 | 1,9 + 2,2 |
| · `avanzarCapacidadesEnSitio` | 7,3 | 7,4 |
| · `semanaDelCuerpo` | 7,0 | 11,0 |
| · `conHabilidades`+`conCapacidades`+`conCuerpo` | 1,3 | 2,2 |
| **Jornada de liga** `futbol` `ligaDelMundo` | 0 | **79,0 (68,0–105,8)** |
| · `ladoDelPartido` (plantilla + convocatoria de cada equipo) | | 40,5 (32,7–52,6) |
| · `jugarPartido` (motor del partido) | | 30,8 (28,9–41,0) |
| · `elDiaDeUnJugador`, `contextoDelDia`, `prepararLiga` | | 1,6 + 0,4 + 0 |
| **`npcs` `partido.mundo`** (aplica a cada jugador lo del partido) | 0 | **31,8 (28,3–35,5)** |
| `sucesos` (todos sus manejadores) | 1,9 | 10,0 (9,3–16,5) |
| `npcs` `persona.estado` | 2,5 | 5,5 |
| `futbol` `dia.inicio` / `atletismo` `semana.fin` | 0 / 0 | 6,8 / 5,1 |

Con jornada, **la liga entera cuesta 111 ms (79 + 32) de 241: el 46 %**. Cruce de día (por cruce): 3,2 ms (`sucesos` 1,9, `npcs` `dia.fin` 1,0). Además, el perfil de 7 semanas muestra que **construir el índice de presencia de toda la población** (`agendasDePresencia` → `construirAgendasDePresencia` + `candidatosEn`, llamado por `proximaObligacion`) es el 22 % del tiempo de «descansar» de un día cualquiera (del perfil con liga): en `rendimiento-semana` los pasos normales de 6 semanas suman 576–613 ms con mediana de 0,07 ms, o sea ~14 ms extra por día en el primer paso tras la medianoche (inferido, no medido por separado). Es la causa de que el p90 de acción sea 40 ms con mediana de 26.

Perfil de `semanaDeportiva` (con liga): `semanaDeNino` 430 ms de 661; dentro, `pasoDeSemanas` 292 (`pasoGrueso` 240), `resultado` 119 (de ellos `rendimientoPorPuestos` del fútbol 90); `sesionDeClub`/`entrenarStat` ~110; `huecosPorLibre` 50. De la liga: `plantillaDeUnEquipo` 270 de los 389 de `ladoDelPartido` (`lectorDeUnNpc` 79, `prepararTrabajo` 43); `jugarPartido` 277 (`prepararJugador` 124, `valorEnPartido` 58); `convocarYAlinear` 87.

## 4. Propuestas (puntos 1 y 2 de §6, y otras que han salido)

Gananciales en **escritorio** medidos o estimados; en el **móvil**, ×4,3 (×4) y ×6,5 (×6) con los factores de §2 (estimado, salvo que se diga). «Huella» = si cambia la partida. Todas respetan la visión (mismas reglas para el personaje y los PNJ; nada de estimar un resultado: lo que se calcula se calcula con las mismas funciones).

### 4.1 Con los mismos números (huella idéntica)

| # | Propuesta | Ganancia | Huella | Cómo respeta la visión | Tests que harían falta | Coste |
|---|---|---|---|---|---|---|
| **M1** | **Pintar «pasando la semana…» antes de cruzar** (ahora la página se queda quieta 0,3 s en escritorio, **1,15 s en ×4, 1,7 s en ×6, hasta 2,2 s**; no hay aviso: `grep` de «pasando» en `apps/web/src/main.ts` no da nada). Si la acción cruza de semana, `render()` con el aviso, un `requestAnimationFrame` y después `perform`. | No ahorra CPU: quita la sensación de «se ha colgado». | **Idéntica** (no toca el motor) | No toca reglas. | Prueba de `probar-web`: al pulsar una acción que cruza de semana aparece el aviso antes de que acabe `perform` (con un reloj del `perform`). | **Bajo** |
| **M2** | **Historia deportiva en hilos** (`conHabilidades` → reparto de las 6.100 historias entre N trabajadores y vuelta a ensamblar en el mismo orden). Cada historia depende solo de la persona, su población y la fecha (línea de `conHabilidades` que llama a `historiaDeportiva` con `listaDe` propio de cada niño: no comparte nada), así que el resultado es el mismo. Es el 52 % de crear. | Escritorio (estimado con Amdahl, N = 4, 0,3 s de copia): crear 7,8 → ~5,3 s (−2,5 s, −32 %). Móvil: con 4 núcleos útiles ×4: 33 → ~22 s; con 2–3 efectivos (big.LITTLE), 33 → ~26 s. **No medible con el emulador de CPU** (no emula núcleos). | **Idéntica** si el orden de ensamblado y los azares estables no cambian (se comprueba con `huella-ciudad`) | Mismas funciones, mismo orden, mismos azares por persona. | `huella-ciudad` igual con 1 y con 4 hilos en 3 semillas; test de «historia en hilos = historia en el mismo hilo» para una población pequeña; test del camino sin trabajadores anidados (Safari antiguo, `Worker` ausente) que cae a un solo hilo. | **Medio–alto** (trabajadores anidados, copiar las personas, progreso, cancelar) |
| M3 | Microcachés: (a) **medido**: caché de la «bolsa» del reparto de equipos (`bolsa()` solo se recalcula si cambia la lista: contador `version` en `ListaDeTrabajo`): `aspirantesDeEdad` 741 → 637 ms de perfil (−14 %), ~**−1 % de crear**, `huella-ciudad` idéntica (3 hashes por semilla, 2 semillas); (b) estimado: el azar «libre-curso» de `propensionPorLibre` cacheado por persona y curso (hoy se recalcula con `rngEstable` por semana) y prefijos de `rngEstableDesde1`: ≤ 4 % de crear. | ≤ 5 % de crear (≈ −0,4 s). Cruce de semana: nada apreciable (perfil plano). | Idéntica | Igual. | `huella-ciudad` + `huella` + el test de `rng.test.ts` de prefijos. | Bajo, pero poco rendimiento |
| M4 | **Índice de presencia más barato** (`construirAgendasDePresencia`: ~14 ms en el primer paso de cada día, ×4 ≈ 60 ms): reutilizar las agendas por tipo (ya se comparten) y construir `candidatosEn` por lugar bajo demanda. | ~10 ms por día; mejora el p90 de acción (40 → ~30 ms). | Idéntica | Igual. | Los tests de presencia y de moverse con el grupo; `rendimiento-hermanos`. | Medio |
| M5 | **Motor en un trabajador** (la página no se congela nunca). | Quita toda congelación, pero no CPU. | Idéntica | Igual. | Toda la web habla con `game` en sincrónico: es reescribirla. | **Muy alto**: no lo recomiendo; M1 da casi todo por poco. |

Lo que **no** sale de esta tabla: el cruce de semana. Con el perfil plano y la liga repartida entre `ladoDelPartido` (40 ms), motor (31) y `partido.mundo` (32), ninguna caché sencilla pasa de 10–20 ms; para bajar de verdad hay que cambiar la partida (4.2) o paralelizar (M2 no sirve ahí: el motor del juego es secuencial).

### 4.2 Que cambian los números (decisión de diseño; `sim`, `benjamin` y `distribuciones-futbol` a repetir)

| # | Propuesta | Ganancia (estimada, no medida) | Huella | Visión | Tests |
|---|---|---|---|---|---|
| **C1** | **Bloques lejanos de 26 semanas** (`SEMANAS_POR_BLOQUE_LEJANO` 13 → 26): `pasoGrueso` es el 45 % de la historia ≈ 23 % de crear y su coste es proporcional al número de bloques. | Crear −11 % (−0,9 s; ×4: −3,8 s). | Cambia (sesgo al alza ya conocido de ~0,2–0,9 puntos con 13; con 26 hay que medirlo). | Es el mismo cálculo para todos los PNJ lejanos; el personaje no usa bloques. Hace falta el test que muestra que el bloque da «lo mismo» (como el de 13) con la tolerancia que decida la arquitectura. | `tools/distribuciones-futbol.ts` antes/después; test del bloque contra semana a semana. |
| **C2** | `SEMANAS_DE_LOS_LEJANOS` 8 → 13 (los que no son del club del personaje ni de su colegio se calculan 1 vez cada 13 semanas en vez de 8). | `semanaDeNino` −38 % de los lejanos: ~−10–15 ms por cruce (−5 %). Casi no se nota. | Cambia | Igual que C1. | Igual. |
| C3 | Reparto de equipos: menos vueltas (`vuelta < 8`, `plazasDeMas`) o bolsa por edad indexada. | Crear −0,4 a −0,8 s. | Cambia si se quitan vueltas; **idéntica** si solo se indexa (sería M3 grande) | Igual. | `huella-ciudad`, test del reparto. |
| — | **No recomendado:** resolver la jornada de liga de los equipos lejanos con una fórmula en vez del motor del partido (−30 ms por cruce): es lo que la visión prohíbe («las mismas reglas»): los partidos del mundo se juegan con el mismo motor que los del personaje. | | | | |

Orden por ganancia y coste: M1 (barato, sensación) → M2 (mayor ahorro posible con los mismos números) → C1 (si se acepta cambiar números) → M3/M4/C2/C3 (poco).

## 5. Las dudas de §7 con datos

**¿Se admiten ~30 s al crear y 0,5–0,9 s al cruzar de semana (×4 en el móvil)?**
- Frente al informe, **el escritorio ya cumple de sobra** (7,7 s y 0,3 s). Lo que queda es el móvil: **×4: crear 33 s, cruce 0,8 s de motor (1,15 s con repintado), peor 1,3 s; ×6: 51 s, 1,2 s (1,7 s), peor 2,2 s.** Con la ciudad de prueba (la que se juega por defecto) todo está por debajo de 0,15 s en ×6 salvo guardar de golpe (0,16 s) y abrir (1 s).
- Crear se hace una vez y en un trabajador, con la pantalla de progreso: 33 s en ×4 son aceptables y coinciden con el texto de la pantalla («unos 40 s»); 51 s en ×6 ya no, y el texto debería decir «hasta un minuto en móviles lentos» (dato en `apps/web/src/paises-propios.ts`: decisión de quien lo lleve). No sabemos qué factor tiene el teléfono del usuario: **la medida que falta es cronometrar `calibrar()` o la creación en el teléfono**.
- Cruzar de semana pasa una vez por semana de juego: una congelación de ~1 s en ×4 es tolerable **con el aviso de M1**; sin él parece un cuelgue.
- **Mi recomendación:** aceptar las cifras de escritorio y de ×4; hacer M1 ya; pedir una medida en un teléfono real antes de decidir M2; y no activar más clases de sucesos de PNJ sin mirar §1 (+15 a +50 ms por cruce de semana en escritorio, ~+0,2–0,3 s en ×4/×6).
- **El presupuesto de `revision-rendimiento.md` §5 está desfasado** (crear ≤ 5.500 × cal ≈ 41 s, semana ≤ 150 × cal ≈ 1,1 s): hoy (cal = 5,5 ms) crear son ~1.430 × cal y la semana con liga ~44 × cal (sin liga ~14 × cal); con la calibración de entonces (7,5 ms) serían ~1.040 y ~32. Recalibrar los topes es decisión de la arquitectura.

## 6. Cómo repetir cada medida

| Medida | Comando |
|---|---|
| Sucesos de PNJ con la ciudad grande (§1) | `npm run eventos:rendimiento -- 500 4 --ciudad --solo-pnj --pasadas 3` |
| Web: crear, día, semana, guardar, abrir (§2) | `npx tsx tools/rendimiento-web.ts --perfil todos --ciudad ambas --pasadas 3 --acciones 40 --json > salida.txt; npx tsx tools/rendimiento-web-tabla.ts salida.txt` (~35 min). Escritorio creando en la página: `--perfil escritorio-pagina` |
| Crear y cruces de semana en Node | `npx tsx tools/rendimiento-semana.ts --ciudad` (3 veces) |
| Perfil de un tramo (§3) | `npx tsx tools/perfil-segmento.ts crear\|semanas-sin-liga\|semanas-con-liga --ciudad --salida /tmp/p; npx tsx tools/perfil-resumen.ts /tmp/p/crear.cpuprofile [--top 25 \| --bloques a,b \| --bajo función]` |
| Ms por bloque (§3) | `python3 docs/relevo/medir-rendimiento-2/instrumentar.py; cp docs/relevo/medir-rendimiento-2/desglose-semana.ts tools/.desglose-tmp.ts; npx tsx tools/.desglose-tmp.ts 3; git checkout -- modules packages; rm tools/.desglose-tmp.ts` |
| Mismo mundo con la ciudad grande (para las propuestas) | `npx tsx tools/huella-ciudad.ts 31,32 12` (base: `fea622039f06 / 3387ee3325d8` y `3a41eaa44fdd / b4cddd23aae9`) |
| Huella de siempre | `npm run huella -- 60` |

## 7. Comprobaciones

- `npm run typecheck`: sin errores.
- `npm run huella -- 60`: las 16 líneas **idénticas** a las de antes de empezar (apuntadas al principio, `docs/relevo/medir-rendimiento-2/` y comparadas con `diff`).
- Prototipo de M3(a) (caché de la bolsa): se probó y **se descartó** (`git checkout`), con `huella-ciudad` idéntica; no queda en el código.
- `npm test`: 126 archivos, **1.367 tests en verde** (444 s, sin otra carga).
- `npm run probar-web`: «Todo el camino funciona en el navegador», sin errores en la consola (la web no se ha tocado, solo `tools/rendimiento-web.ts`).
- Calibración de esta máquina durante las medidas: 5,46 ms (mediana de 5).

## 8. Dudas para la arquitectura (no tomadas)

- ¿Se actualiza el texto de la pantalla («unos 40 s») y el presupuesto de `revision-rendimiento.md` §5 a las cifras de hoy?
- ¿Se hace M1 (aviso antes de cruzar de semana)? Es de la web, no del motor.
- ¿Se quiere M2? Cambia la arquitectura de la creación (trabajadores anidados).
- ¿Se mide en un teléfono real antes de decidir? Con la calibración (`calibrar()`) en el teléfono se sabe el factor real.
- Cambiar los bloques lejanos (C1/C2) es una decisión de diseño y de balance (la tabla de `distribuciones-futbol` la tiene que mirar quien lleve el fútbol).
