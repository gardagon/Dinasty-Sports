# Relevo: PNJ, segunda tanda (17/11/2026)

Rama `claude/pnj-2` (sale de `claude/youthful-clarke-vs0kye`). Encargo de la arquitectura con las decisiones del usuario (`DECISIONES.md`, «Respuestas del usuario: PNJ…»). Tests: `tests/pnj-2.test.ts`, `packages/contracts/src/agendas.test.ts` (secciones nuevas), `apps/web/src/gente.test.ts` y `tests/horarios-de-agendas.test.ts` (tipos nuevos en el recorrido de un curso entero). No he tocado `DECISIONES.md`. No he hecho lo de los PNJ en varios deportes.

## Qué hay hecho, por punto

1. **Niños de otros colegios.** El tipo `vecino` gana la marca `escolar` (como la del `hermano`): los días lectivos, de 7:30 a 14:30, están en su colegio (fuera del mapa); el resto del día siguen la agenda de siempre de un vecino. La pone `ajustarVecinos` (`modules/npcs/src/index.ts`) a los vecinos menores de 18 con colegio de fuera (`nino_*` **y** los `vecino_N` niños: los dos tenían el mismo fallo), al crear la partida y cada curso (`sinDeporte` también la conserva); la quita al cumplir 18 o con `colegio: 'ninguno'`.
   - Si están en un club son `rival` y siguen las sesiones de su club (ya era así). **El equipo de su colegio** (`Club deportivo del colegio N`, `colegioN`) no estaba en el catálogo y caía en el patrón de cuatro franjas de los clubes de fuera, en el estadio: ahora entrena con los mismos días y horas que el del colegio del personaje, en su colegio (`sede: null`, fuera del mapa) — `sesionDelEquipoDeOtroColegio`.
   - Test: nadie de esos niños (>300) está en ningún sitio del mapa a las 11:00 de un martes; el equipo de otro colegio entrena como el del personaje; agendas de contracts.
2. **Salida y actividades de la tarde.** General, en `construirAgenda` (`conEsperaTrasElColegio`): quien va al colegio del personaje (alumno, hermano escolar) y tiene un tramo con `ocupado` (sesión, carrera) y más nivel que el colegio que **empieza como mucho 60 minutos después de las clases** se queda en el colegio (entrada 70 % / patio 30 %, uno de los dos todo el rato) en lugar de repartir su salida, hasta que empieza ese tramo (10 minutos antes de la sesión: el fútbol, a las 14:50 en `campo_colegio`). Cifra en datos: `SALIDA_DEL_COLEGIO.espera`. Motor de agendas: campo nuevo `soloLectivo` en `TramoDeAgenda` (el tramo solo vale los días con colegio, además de sus `dias`). Si el tramo tiene asistencia (< 1), la espera comparte su azar: si ese día no va, se va como los demás.
   - Test: todos los del equipo de fútbol del colegio (más de 30) están en la entrada o el patio a las 14:31 y a las 14:45 y en el campo a las 14:50; los alumnos sin actividad no están a las 14:31; el martes sin sesión no hay espera (contracts).
3. **Padres que recogen.** El tipo `vecino` gana `recoge`: 15 % de los vecinos adultos (`vecino_N` de 18 años o más), sorteado con `azarDe('recoge', semilla, id)` — **sin gastar números del azar de la partida**, así la población no cambia. Los días lectivos llegan a la entrada entre las 13:45 y las 14:00 (pasos de 5: un tercio a las 13:45, dos tercios a las 13:50, todos a las 13:55) y se van entre las 14:05 y las 14:30 (el 83 % sigue a las 14:05… el 17 % a las 14:25; a las 14:30 ninguno). Cifras: `RECOGIDA_DE_NINOS` (`agendas.ts`). Mismo mecanismo `grupoDeAzar` que la salida: quien llega no se va y vuelve. **No se van con su hijo:** ver dudas.
   - Test: la proporción (10–20 %), a las 14:00 en la entrada todos los que recogen y ningún otro vecino, a las 14:31 ninguno y antes de las 13:45 ninguno.
4. **Niños del barrio amigos.** En `modules/relaciones`: un vecino menor de 18 con estado de vínculo «amigo» o «mejor amigo» (el mismo umbral de un compañero que pasa a amigo: afinidad ≥ 40, confianza ≥ 30 y 3 contactos en 14 días, `vinculo.ts`) tiene `accionesDeAmistad` + «Discutir» y vale para proponer/acordar planes (`aceptaPlanes`). Si el vínculo se enfría y vuelve a «conocido», vuelve a solo «Charlar». **El `role` no cambia** (sigue `vecino`): hoy un compañero tampoco cambia de `role` al hacerse amigo; el estado lo da el vínculo.
   - Test: conocido (aunque sea 39 de afinidad) → solo charlar; amigo → exactamente el mismo catálogo que un compañero amigo.
5. **Vecinos adultos conocidos:** «Charlar un rato» con las mismas cifras que los niños (ANEXO_RELACIONES, filas y párrafo nuevo antes de §4). Los bibliotecarios (papel `vecino`) entran también.
6. **Rivales:** quitado `RIVALES_CON_ACCIONES`. Todos los rivales conocidos tienen «Charlar (rival)», «Encararte» y las paces si hacen falta. **Coste: ver abajo, sube cuando se conocen muchos.**
7. **«Club: colegio»:** el entrenador lleva el id del club en `NpcView.club` (la lógica lo compara: `relaciones` y `npcs`), así que no lo he cambiado. `apps/web/src/gente.ts` ahora pinta `nombreDeClub(g, n.club)`: busca el id en `ClubDirectory.list(deporte)` de los deportes cargados y, si no lo encuentra (un jugador, que ya lleva el nombre, o un club de fuera del catálogo), deja el texto. Sale «Club deportivo del colegio» o «Real Ciudad C. F.».

## Huella y rendimiento (antes → después)

`npm run huella -- 60`:

| bot / semilla | acciones antes → después | hash |
|---|---|---|
| equilibrado 1, 2 | 2417 → 2417; 2419 → 2419 | cambia |
| empollón, atleta, sobreentrena, abandono (1 y 2) | iguales | iguales |
| vago 1 / 2 | 1485 → 1485; 1296 → 1298 | = / cambia |
| aleatorio 1 / 2 | 2732 → 2619; 2707 → 2642 | cambian |
| fútbol 31, 32 (hash de todo `npcs`) | — | cambian los dos, al crear y tras 3 veranos |

Es lo esperado: los bots que charlan con quien tienen cerca ven gente distinta (los niños de otros colegios ya no están en el parque en clase y hay padres en la entrada a las 14:00). En el mundo con fútbol cambia el hash porque cambia `tipos` de miles de vecinos (`escolar`, `recoge`). **Con el mismo hash sin el campo `tipos` (script suelto, mismo mundo, antes y después) salen idénticos** (`015829c119f1 → 781441b0aef2` y `005d7251630f → 7208d5dfc278` en las dos): no cambia ni un nivel, equipo, puesto ni fichaje.

`npm run rendimiento -- 60` (las dos tomas seguidas en la misma máquina, antes en un worktree del commit de partida):

| | antes | después |
|---|---|---|
| Crear la partida | 767 ms | 766 ms |
| Estado | 2931 KB | 2940 KB (+9 KB: `escolar` y `recoge` en `tipos`) |
| Copiar+texto / cargar | 86,8 / 20,4 ms | 93,4 / 21,5 ms |
| ms por acción (bot equilibrado, 2415 acciones) | 1,80 | 1,89 (+5 %, en el ruido de medida; entre dos tomas de «antes» la diferencia era mayor) |

**Aviso: los rivales sin tope cuestan** cuando se conocen muchos. Los bots no conocen rivales, así que no se ve arriba; lo he medido a parte (mundo con fútbol, ciudad grande, sábado a las 11:00, ms por `availableActions` + esperar, media de 20):

| personas conocidas | antes | después |
|---|---|---|
| ninguna (como al empezar) | 4,8 | 4,2 |
| 30 rivales | 2,3 | 3,1 |
| 413 rivales (todos) | 2,9 | **16,3** |
| 491 vecinos (todos; antes no tenían charla) | 7,8 | 9,6 |
| 901 (rivales y vecinos) | 7,2 | 19,2 |

Unos 0,03 ms por rival conocido y paso (el motor evalúa 2 acciones más cada uno). Con las decenas de rivales que se conocen en una temporada es despreciable; con todos, cada acción tarda ~13 ms más. Si preocupa, la salida natural es ofrecer las acciones de un rival (y de un vecino) solo cuando está cerca o en la lista visible, no siempre (cambia lo que pueden hacer los tests con `g.preview` a distancia). No lo he hecho.

## Partidas guardadas

No he tocado la versión de guardado. `escolar` y `recoge` se ponen **al crear la partida y al empezar cada curso** (`ajustarVecinos` es idempotente), así que una partida ya empezada los recibe en el siguiente curso; hasta entonces sus niños siguen con la agenda de vecino. Mismo caso de la frase «Del equipo de…» de la sesión anterior.

## Dudas para la arquitectura (no las he decidido)

1. **Padres que se van con su hijo.** El usuario dijo «si se puede… cuando exista esa relación»: no existe (los vecinos no tienen hijos, y el hijo de un `recoge` sería un alumno del colegio del personaje o uno de fuera, que está fuera del mapa). Opción: un campo `hijo: <id>` en el `recoge` y que el hijo comparta con él el azar de salida (el motor puede hacerlo con un campo más en el tramo). Habría que decidir quién es el hijo (¿mismo apellido?) y si sale en su ficha.
2. **¿Cada día lectivo?** Los padres que recogen lo hacen todos los días de clase. Podría ser un 80 % de los días, o solo a ciertas edades del hijo.
3. **Edad de los padres:** he tomado literalmente «vecinos adultos» (`vecino_N` de 18 años o más), con 18 años incluidos. Quizá convenga un mínimo mayor.
4. **Niños que son rivales** (en un club de otro colegio) no llevan `escolar`: su mañana ya era «fuera» y no cambia nada visible, pero si luego se les añade algo que dependa del colegio habrá que dárselo.
5. **Rendimiento** de los rivales sin tope (arriba).
6. **El estado «amigo» de los niños del barrio no cambia su agenda** (no se les asigna el tipo `amigo`, que de todas formas hoy no se asigna a nadie, ni a los compañeros amigos).
7. Los **planes** (proponer quedar) con un niño del barrio amigo usan las mismas reglas que con un compañero; los he dejado habilitados pero solo está probado que las acciones existen.
