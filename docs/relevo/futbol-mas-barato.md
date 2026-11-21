# Fútbol más barato (21/11/2026)

Rama `claude/futbol-mas-barato` (desde `claude/youthful-clarke-vs0kye`). Encargo de la arquitectura tras `docs/relevo/revision-rendimiento.md` (propuestas 1, 2 y 5). No se toca `DECISIONES.md`.

## Qué se hizo

1. **`rngEstable` más barato (huella idéntica).** `prefijoEstable`, `rngEstableDesde`, `rngEstableDesde1` (contracts, `rng.ts`): el FNV-1a se calcula parte a parte, así que el hash de las partes constantes se guarda. Usado en `elegirEjercicios` y `huecosQueHace`. `npm run huella -- 60` salió **idéntica** antes y después (comprobado antes de los demás puntos; commit aparte). Test en `packages/contracts/src/rng.test.ts`.
2. **Pasada semanal** (`semanaDeportiva`, `modules/npcs/src/index.ts`, `semana.ts`):
   - La sesión de un equipo (ejercicios) se elige **una vez por equipo, semana y hueco** (es la misma para todos; antes, niño a niño). Efecto secundario: el nivel de las capacidades `gen.*` que entran en la puntuación de ejercicios es el del primer niño, no el de cada uno.
   - **Activos y lejanos:** los niños del club del personaje **y del equipo de su colegio (`colegio`, sus compañeros)** se calculan cada semana; el resto, en **bloques de 8 semanas** (`SEMANAS_DE_LOS_LEJANOS`), cada equipo en su semana (fase estable por equipo), con `pasoDeSemanas(..., grueso)` (una sola evolución de capacidades y caída, con la caída calculada con el patrón semanal exacto de las sesiones). Las sesiones y el estado (cansancio, lesiones, minutos del cuerpo) siguen pasando cada semana para todos. Quien cambia de club (sin `vp`) se calcula esa semana. Un bloque no sabe cuándo se lesionó: la baja se cuenta en las últimas semanas del bloque.
   - `resultado()` calcula el lector una vez; `plantillaDeUnEquipo` y `entrenadorDelEquipo` usan un índice por lista (`indiceDe`, antes recorrían las 6.110 personas por partido); `preferenciaDe` y `valorRealDe`/`valoresPorPuestoDe` con caché por niño.
3. **Crear:** la historia deportiva lejana va en bloques de 13 semanas de una vez (`SEMANAS_POR_BLOQUE_LEJANO`, con ejercicios de 3 sesiones por bloque y caída esperada: `diasDeCaidaPorSemana`); el último trimestre (`SEMANAS_RECIENTES = 13`) sigue en bloques de 4 semanas exactos. `historiaDeportiva(..., conGruesos = false)` da la de siempre (para tests).
4. **Apuntarse (decisión del usuario):** se eligió **calcular el reparto al crear y que cada niño «aparezca» en su día** (sorteo estable `rngEstable('apuntarse', semilla, id, inicioCurso)`), no formar los equipos a lo largo de las semanas: formar equipos en esos días no ahorra nada (el draft cuesta lo mismo; moverlo al juego pondría picos de ~1 s en días sueltos y chocaría con las pruebas de acceso del personaje). Dato: `CategoriaDef.apuntarseEnLosDias = [1, 6]` (días del curso; el 0 es el primer día de clase) en las categorías del fútbol. `Npc.apuntado` (día absoluto), `conApuntados` al crear y cada curso. Solo se filtran las vistas (`plantillaDelEquipo`, `equiposDeLaCategoria`); la regla de plaza, la pretemporada y las pruebas del personaje no cambian. **Decisión de diseño que queda abierta:** si la ventana debe ser más ancha (hoy acaba el día 6, antes del primer cierre de semana, para que la liga siempre vea todos los equipos) habría que hacer que `prepararLiga` espere.

## Medidas (ciudad grande + fútbol, escritorio, contenedor de 4 CPU, `tools/rendimiento-semana.ts --ciudad`)

| | Antes | Después |
|---|---|---|
| Crear | 27–32 s | **~10,4 s** |
| Cruce de semana sin jornada de liga | 355–500 ms | **~100–150 ms** |
| Cruce de semana con jornada de liga (semanas 4–6) | 636–983 ms | **~260–360 ms** |
| `listActions` mediana | 24 ms | 25–29 ms |

**No se llega a <100 ms en todos los cruces.** Lo que queda en las semanas con liga son ~75 partidos del motor (`jugarPartido`, convocatorias: ~100–200 ms) y no se ha tocado (no es la historia ni la pasada semanal); en las semanas sin partidos, la pasada es ~60–70 ms más cuerpo (~13), capacidades (~9) y atletismo. Crear queda en el límite alto del objetivo de 5–10 s: el «draft» son ~5 s (`intentarEntrar`, `aspirantesDeEdad`, `plazasDeMas`) y la generación de personas ~2 s.

## Distribuciones antes/después (`tools/distribuciones-futbol.ts`, semillas 31 y 32, ciudad grande)

`npx tsx tools/distribuciones-futbol.ts salida.json 31,32` y `--comparar antes.json despues.json`. Media del nivel por edad y por equipo A–D, tras crear, 1 y 2 cursos; «ruido» = desviación de la media entre semillas (solo 2 semillas: orientativo).
- Crear: diferencia de la media entre −0,01 y **+0,75** (edades 8–17; +0,75 a los 17, sobre 21,5), p10/p50/p90 casi iguales. Sin sesgo hasta los 10 años; **sesgo al alza de ~0,2–0,9 en los mayores** (la historia de una vez no cae tanto como la semanal).
- Curso 1: +0,17 (10 años), +0,33 (13), +0,52 (15), +0,87 (17); por equipo A/B/C: +0,45 / +0,23 / +0,54. Curso 2: +0,23, +0,34, +0,59, +0,90; A/B/C: +0,47 / +0,28 / +0,79. Los percentiles se mueven igual (p90 17→+1 en el 17). Es del orden de 1–4 % del nivel y mayor que el ruido entre semillas, pero pequeño; a vigilar si se ajusta el balance (`npm run sim:futbol`).
- Con la pasada semanal «sin bloques» (calculada niño a niño pero con la sesión por equipo) la diferencia frente al código anterior es ≤0,2 en media (0,04–0,67 según edad): el ahorro de sesión por equipo es casi gratis; el sesgo viene de los bloques.
- Camino por el que se llegó: una primera versión con bloques de 4–8 semanas dejaba el nivel de quien cambiaba de club en el valor provisional del fichaje (50 frente a 24): se arregló calculando esa semana a quien no tiene `vp`.

## Pendiente / ideas

- Jornada de liga: ~100–200 ms por semana con partidos (motor de partido, `plantillaDeUnEquipo`, `lectorDeUnNpc` por jugador). Es lo que impide <100 ms en esas semanas.
- Crear: el draft (5 s) y la generación (2 s) admiten más caché (comparadores que llaman a `valorEn`, `ofertasAlCandidato` reconstruye la plantilla por candidato).
- Ventana de apuntarse (ver arriba) y si se quiere que la vista de gente enseñe `apuntado`.
- `rendimiento:web` y móvil ×4: ver abajo.

## Comprobaciones

- `npm run typecheck`: sin errores. `npm run eventos:validar`: ✅ (6 avisos de siempre). `npm run benjamin -- 31,33` y `npm run probar-web`: bien («todo el camino funciona en el navegador»).
- `npm test`: la primera pasada dio 6 fallos en 4 archivos, todos por lo nuevo (los niños aún no están apuntados el día 0 y los lejanos se mueven en bloques); se adaptaron los tests que leían plantillas el primer día (`convocatoria-y-estado`, `dia-de-partido-pnj`, `puestos-de-la-plantilla`: avanzan hasta la semana 1) y se puso el equipo del colegio entre los activos (`futbol.test`). Esos 4 archivos pasan; el resto (1.186 tests) ya pasaba. **No he repetido la suite completa tras esos arreglos**: conviene una pasada final de `npm test`.
- `npm run huella -- 60`: la de antes del cambio de `rngEstable` y la de después fueron idénticas. Con el resto de cambios la huella **cambia a propósito** (campo `apuntado`, bloques, historia de una vez): bots y fútbol (ciudad de prueba) distintas.
- `npm run sim:rapida`: ⚠️ «El esfuerzo hace progresar» (atletismo +5,1, esperado >+7) **idéntico en la rama base**; ⚠️ «Rendimiento» 1,61–1,86 ms/acción (razón 0,24) frente a 1,56 (0,22) en la base: ~9 % más lento en la ciudad de prueba con solo atletismo (la base ya está en el límite 0,22 y el ruido es ±10 %); no he encontrado de dónde sale (se arregló un primer 1,86 al volver a escribir `rngEstable` en el sitio). A mirar.
- `npm run sim:futbol -- 365 3`: sin cambios (es del personaje; fútbol 161 puntos por curso, atletismo 40, sin problemas).
- `rendimiento:web` (escritorio y móvil ×4) **no medido** en esta sesión.

## Segunda ronda (revisión de la arquitectura)

- **Sesgo:** la historia lejana pasa a bloques de **13 semanas** (antes 26). Medido con 120 niños de 12 años o más, historia de una vez frente a bloques de 4 semanas exactos: sesgo del nivel +0,27 con 26 semanas → ~0,0 con 13 (las capacidades siguen +3,5 en suma sobre 18 y las habilidades quedan −3,5: se compensan en el nivel). Las capacidades suben algo más con la fórmula cerrada aunque se calcule la caída y el desarrollo natural semana a semana; el origen está en el entrenamiento de capacidades a parámetros constantes dentro del bloque (techo y velocidad medidos a mitad del bloque), no en la caída. No lo he corregido. Distribuciones nuevas (2 semillas, antes/después): al crear, diferencia de la media −0,04 a +0,26 (la mayor, a los 17); curso 1: +0,12 a +0,42; curso 2: +0,17 a +0,38 (equipos A/B/C: +0,2 a +0,5). Queda un sesgo de ~+0,2 puntos por curso (1–2 % del nivel) por los bloques de 8 semanas; el ruido entre semillas es 0,03–0,26. Crear sube a ~10,4 s por esto.
- **⚠ de Rendimiento:** no encuentro un coste nuevo por acción. `listActions` (ciudad grande, `--solo listar`) es igual a la base (10,4 frente a 10,2–11,0 ms). El bot de 60 días en la ciudad de prueba: 1,66–1,87 frente a 1,58–1,71 ms por acción (rangos solapados) y los perfiles de CPU de ambas ramas son prácticamente iguales (`conApuntados` solo se ejecuta al crear y al cambiar de curso; los índices de plantillas no se usan en atletismo). La base ya está en 0,22 del límite, así que lo atribuyo a ruido de ±10 %, más quizá un ~5 % real que no se localiza.
