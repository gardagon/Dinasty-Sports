# PNJ que entrenan por su cuenta, abandono con nivel e interés, compañeros hasta los 20 y valor real al fichar (22/11/2026)

Rama `claude/pnj-entrenan-2` (sale de `claude/youthful-clarke-vs0kye`). Sin pull request. No se ha tocado `DECISIONES.md`. Encargo del usuario, a partir de `docs/relevo/pnj-entrenan-y-abandono.md` y la entrada de DECISIONES «PNJ que entrenan por su cuenta, abandono por nivel e interés, y compañeros hasta los 20».

## 0. Resumen

1. **`PNJ_POR_LIBRE` activado con la intensidad «fuerte»** (hasta 4 sesiones por su cuenta a la semana; base 0,20, interés 0,12, ambición 0,20, sacrificio 0,08, disciplina 0,05, dispersión 0,20; factor por edad 15: 0,9 · 16: 0,75 · 17: 0,6 · 18: 0,7). Está en la rutina del fútbol (`modules/futbol/src/datos.ts`).
2. **Abandono:** activado el nivel (peso 0,6) y el suelo (4 %), y **el interés pesa más** (0,4 → 0,6). **Al PNJ no le subía el interés al jugar** (era fijo, 1–3, desde que nace); ahora **sube con lo que juega**, con la misma regla que el personaje (`SUBIDA_DE_INTERES_POR_HORA`, rendimientos decrecientes), 1,5 horas por sesión (del club o por su cuenta) y a escala 0,015 (`INTERES_AL_JUGAR`, dato `interesAlJugar` de la rutina). Quien más juega, más «agarrado»; quien casi no le interesa (< 1,5) lo deja el doble que quien tiene ≥ 2,5.
3. **Los compañeros de clase siguen en el mundo hasta los 20.** A los 18 pasan a ser `vecino` sin colegio con la etiqueta `excompanero` (mismo id, relación, club e historial) y salen del barrio a los 20, como los `nino_N`. §3.
4. **El valor provisional del primer día de curso sí se veía** (cualquier lectura de `levels` o `vp` de quien acababa de cambiar de club) y **se arregla al fichar**: `conHabilidades` calcula el valor real (con sus habilidades de hoy) de quien tiene habilidades y no tiene `vp`, y lo guarda en `levels` y `vp`. Las herramientas ya medían fuera de ese día (semana 52·k + 1 o + 2, 53, 105); se deja dicho en su cabecera. §4.
5. **Medidas (4 semillas, ciudad grande, cohorte de 8 años, fuera del primer día):** a los 18, nivel medio 27,5 (24,3 antes), mejor 41,2; por curso a los 17–18: ≥ 35: 9,0; ≥ 38: 4,5; ≥ 40: 1,5; **≥ 45: 0**. Juegan 79 a los 18 (48 antes). Equipos de cadete y juvenil: se siguen llenando, más que antes (§5). Coste de la semana igual que antes (§6).

## 1. Qué hay en el código

| Qué | Dónde |
|---|---|
| Datos (cifras provisionales, explicadas) | `modules/futbol/src/datos.ts`: `PNJ_POR_LIBRE` (fuerte), `INTERES_AL_JUGAR`, `ABANDONO_PROPUESTO` (nivel 0,6, interés 0,6, suelo 0,04; se usa como dato del abandono de `POBLACION_ESPANA`); `RutinaDeDeporte.interesAlJugar` en `packages/contracts/src/deporte-datos.ts` |
| Interés que sube al jugar | `conInteresTrasJugar` (`modules/npcs/src/deportistas.ts`); se llama en `semanaDeportiva` con las sesiones de la semana de cada PNJ |
| Compañeros hasta los 20 | `renovarAlumnos` y `aGraduado` (`modules/npcs/src/index.ts`); `renovarDeportistas` (`draft.ts`) deja libre a quien acaba el colegio y estaba en el equipo del colegio; `esAmigoDeNino` en `relaciones` |
| Valor real al fichar | `valorRealAlFichar` en `conHabilidades` (`modules/npcs/src/index.ts`) |
| Herramientas | `tools/pnj-entrenan-informe.ts` (≥ 35, ≥ 38 y el interés por edad y quién lo deja), `tools/analisis-profesionales.ts` (guarda el interés de cada año) |
| Tests | `tests/pnj-por-libre.test.ts` (activado, interés más alto → menos abandono, el interés sube con rendimientos decrecientes, sin dato no cambia), `modules/npcs/src/index.test.ts` (excompañeros), `tests/futbol.test.ts` y `tests/equipos-por-demanda.test.ts` (mundo creado sin `porLibre`: miran el reparto del equipo y del «draft», no el entrenar por su cuenta) |

## 2. Interés por el fútbol al jugar

Antes: `rasgos.intereses` era fijo para los PNJ (1–3 al nacer). Medido en la cohorte (4 semillas), interés de los que juegan, por edad y quién lo deja ese verano:

| edad | media | < 1,5 | 1,5–2,5 | ≥ 2,5 | dejan el fútbol: interés < 1,5 / 1,5–2,5 / ≥ 2,5 |
|---|---|---|---|---|---|
| 8 | 2,2 | 23,3 % | 36,8 % | 39,9 % | 12,8 % / 9,1 % / 7,3 % |
| 10 | 2,4 | 21,0 % | 37,2 % | 41,8 % | 12,2 % / 7,8 % / 5,9 % |
| 12 | 2,6 | 5,4 % | 26,6 % | 68,1 % | 19,5 % / 9,4 % / 5,8 % |
| 14 | 2,8 | 0,3 % | 16,5 % | 83,2 % | 50,0 % / 19,8 % / 12,5 % |
| 15 | 2,8 | 0,0 % | 13,9 % | 86,1 % | – / 36,4 % / 13,3 % |
| 17 | 2,9 | 0,0 % | 7,3 % | 92,7 % | – / 21,4 % / 17,2 % |

**Calibración de la escala:** a 0,08 todos los que juegan estaban en 3 a los 11 años (el interés dejaba de distinguir); a 0,025, a los 15–16; a **0,015** sigue habiendo reparto de los 8 a los 16 años. El personaje, a escala 1, llega a «le gusta mucho» en pocas semanas. **Pendiente de decidir:** que el interés también baje si se deja de jugar (hoy no baja: quien deja el fútbol no vuelve a jugar de todos modos).

## 3. Compañeros hasta los 20: qué dependía de ello

- **Agenda:** el tipo `alumno` (clase, patio, recreo) se quita al graduarse; se añade `vecino` (sin `escolar`). Sin eso seguirían yendo a clase.
- **Papel (`role`):** pasa a `vecino`, para que no los elijan los sucesos de aula (`quien: { rol: 'companero' }`). Ocupación: al ser `vecino` de 18 o más, sale su oficio (`oficioDeVecino`), como cualquier vecino.
- **Relaciones:** se guardan por id, así que se conservan. El catálogo de la amistad lo daba ser `companero`; para que quien ya era amigo no lo pierda a los 18, `esAmigoDeNino` acepta también a los `excompanero` de cualquier edad con vínculo de amistad (`docs/ANEXO_RELACIONES.md`).
- **Clubes:** quien estaba en el equipo del colegio (que solo llega a 17) queda libre ese verano y los clubes lo fichan (sin esto, el juvenil del colegio llegaba a 29 jugadores). Los que ya estaban en un club se quedan.
- **Población:** + dos cursos de jóvenes (≈ +100). El test de población del colegio admite hasta 80 de diferencia.
- **Archivo:** sigue sin existir (`CIUDAD_Y_LIGAS.md` §11). A los 20 salen del barrio y se borran, como los `nino_N`.
- **No dependían de ello:** profesiones (no hay), `futbol` (`companeros` guarda a los de equipo por id; se lee de la plantilla).

## 4. El valor provisional del primer día de curso

**Se veía.** `reclutarA` pone `levels` = el nivel de su potencial a esa edad (`nivelEn`) y `sinDeporte` borra `vp`; todo lo que valora (`valorEn`/`valorRealDe` lee `vp`, y si no hay lo calcula con sus habilidades, bien) estaba bien, pero **`levels` quedaba provisional hasta la pasada semanal** (semana siguiente): lo leían la herramienta y cualquier lectura de `levels.futbol` (listados de PNJ). **Arreglo:** al empezar el curso, antes de guardar, `conHabilidades` fija `levels` y `vp` de quien tiene habilidades y no `vp` con su valor real de hoy (`valorRealAlFichar`). La pasada semanal lo vuelve a calcular con la semana de entreno. (La medición de la cohorte ya iba a la semana 52·k + 1; no he repetido la foto del día 52·k para comprobar a mano que ya no queda ningún valor provisional: queda por comprobar.)

## 5. Medidas (con la medición corregida, 4 semillas: 31–34)

**Antes** = línea base corregida de `pnj-entrenan-y-abandono.md` §1 (sin nada de esto).

| a los 18 | antes | ahora |
|---|---|---|
| juegan (por semilla) | 48 | 79 |
| nivel medio | 24,3 | 27,5 |
| p90 / máx | 33,8 / 39,8 | 35,0 / 41,7 |
| mejor / 3.º / 10.º | 38,5 / 36,0 / 29,2 | 41,2 / 38,9 / 34,6 |
| habilidades / capacidades, % del tope | 29,4 / 41,5 | 33,1 / 41,7 |
| por curso a los 17–18: ≥ 35 / ≥ 38 / ≥ 40 / ≥ 45 | 3,25 / 0,50 / 0,00 / 0,00 | 9,0 / 4,5 / 1,5 / **0,00** |

Los 10 mejores de cada semilla: nivel medio 33,8 → 37,6. De los 10 mejores a los 14 (40), a los 18: 31 siguen y 9 lo dejan (antes 18 / 20 / 2 que salían del mundo).

**Embudo de abandono por edad** (juegan un año y no el siguiente, % de los que juegan):

| edad (k → k+1) | juegan en k | siguen | lo dejan | sin equipo |
|---|---|---|---|---|
| 8 → 9 | 268 | 90,8 | 9,2 | 0,0 |
| 12 → 13 | 191 | 92,1 | 7,5 | 0,4 |
| 13 → 14 | 177 | 90,9 | 8,9 | 0,1 |
| 14 → 15 | 161 | 85,7 | 13,8 | 0,5 |
| 15 → 16 | 138 | 83,0 | 16,5 | 0,5 |
| 16 → 17 | 115 | 83,0 | 16,6 | 0,4 |
| 17 → 18 | 96 | 82,2 | 17,5 | 0,3 |

(Antes: 16,9 / 21,6 / 24,1 / 26,7 % lo dejaban de los 14 a los 17; nadie sale del mundo a los 18.) **Dejan el fútbol antes de los 18 los que jugaban a los 14:** 1 − (0,857·0,830·0,830·0,822) ≈ 51 % (antes 69 %; el dato público de «todos los deportes» es del 32 %).

**De los mejores:** los mejores 10 % de cada edad siguen cada año el 93,8 % (antes 84,0 %: 4 años seguidos, 77,5 %); del 10 al 50 %, 88,6 %; mitad de abajo, 77,7 % (antes 71,2 %). Los mejores no llegan a cero (6,2 % lo deja).

**Todo el detalle (`tools/pnj-entrenan-informe.ts`):**




#### Nivel y fracción del tope por edad (los que juegan)

| edad | juegan/semilla | nivel medio | p90 | máx | habilidades % tope | capacidades % tope | mejor / 3.º / 10.º (media por semilla) |
|---|---|---|---|---|---|---|---|
| 8 | 268 | 12.0 | 14.6 | 19.5 | 18.3 | 21.1 | 18.4 / 17.1 / 15.5 |
| 9 | 244 | 13.8 | 16.2 | 21.7 | 19.9 | 22.6 | 20.3 / 18.8 / 17.4 |
| 10 | 224 | 15.3 | 18.1 | 23.9 | 21.2 | 24.1 | 22.7 / 21.8 / 19.5 |
| 11 | 206 | 16.7 | 20.0 | 26.4 | 22.4 | 25.8 | 25.4 / 24.0 / 22.1 |
| 12 | 191 | 18.1 | 22.0 | 29.0 | 23.7 | 28.1 | 28.0 / 26.8 / 24.1 |
| 13 | 177 | 19.6 | 24.1 | 30.9 | 25.1 | 30.4 | 30.0 / 28.9 / 26.2 |
| 14 | 161 | 21.1 | 26.3 | 34.1 | 26.7 | 33.1 | 33.2 / 32.2 / 29.1 |
| 15 | 138 | 22.9 | 29.1 | 36.6 | 28.4 | 35.7 | 35.6 / 34.3 / 31.2 |
| 16 | 115 | 24.5 | 31.6 | 38.0 | 30.0 | 38.1 | 37.5 / 36.5 / 32.5 |
| 17 | 96 | 26.1 | 33.3 | 39.4 | 31.8 | 40.1 | 38.9 / 37.1 / 33.4 |
| 18 | 79 | 27.5 | 35.0 | 41.7 | 33.1 | 41.7 | 41.2 / 38.9 / 34.6 |

**A los 17–18 (último año jugando):** juegan 96 por semilla. Por curso: nivel ≥ 35: 9.00; ≥ 38: 4.50. Nivel ≥ 45 (profesional) por curso: 0.00 (por semilla: 0/0/0/0); ≥ 40 (élite): 1.50 (2/2/1/1); ≥ 50: 0.00. Cursos ≥ 40: 1.6 % de los que juegan.
Los 10 mejores de cada semilla: nivel medio 37.6.

#### Interés por el fútbol de los que juegan (0 a 3)

| edad | media | < 1,5 | 1,5–2,5 | ≥ 2,5 | de ellos, dejan el fútbol ese verano: interés < 1,5 / 1,5–2,5 / ≥ 2,5 |
|---|---|---|---|---|---|
| 8 | 2.2 | 23.3 % | 36.8 % | 39.9 % | 12.8 % / 9.1 % / 7.3 % |
| 9 | 2.3 | 22.4 % | 37.0 % | 40.6 % | 11.5 % / 7.8 % / 6.3 % |
| 10 | 2.4 | 21.0 % | 37.2 % | 41.8 % | 12.2 % / 7.8 % / 5.9 % |
| 11 | 2.5 | 14.4 % | 35.0 % | 50.5 % | 16.0 % / 8.3 % / 4.1 % |
| 12 | 2.6 | 5.4 % | 26.6 % | 68.1 % | 19.5 % / 9.4 % / 5.8 % |
| 13 | 2.7 | 1.7 % | 18.2 % | 80.1 % | 16.7 % / 15.5 % / 7.2 % |
| 14 | 2.8 | 0.3 % | 16.5 % | 83.2 % | 50.0 % / 19.8 % / 12.5 % |
| 15 | 2.8 | 0.0 % | 13.9 % | 86.1 % | – / 36.4 % / 13.3 % |
| 16 | 2.9 | 0.0 % | 9.6 % | 90.4 % | – / 22.7 % / 15.9 % |
| 17 | 2.9 | 0.0 % | 7.3 % | 92.7 % | – / 21.4 % / 17.2 % |

**Embudo:** de 273 interesados, juegan a los 8: 268, 14: 161, 16: 115, 17: 96, 18: 79.
**Los 10 mejores de cada semilla a los 14 (40), a los 18:** sigue 31, lo deja 9. De los que juegan a los 17: dejan antes de los 18 17.8 %.

#### Adónde va quien juega un año y al siguiente no (por semilla, media)

| edad (año k → k+1) | juegan en k | siguen | sale del mundo | lo deja (abandono) | sin equipo (no dejado) |
|---|---|---|---|---|---|
| 8 → 9 | 268 | 90.8 % | 0.0 % | 9.2 % | 0.0 % |
| 9 → 10 | 244 | 91.8 % | 0.0 % | 8.0 % | 0.2 % |
| 10 → 11 | 224 | 92.0 % | 0.0 % | 7.9 % | 0.1 % |
| 11 → 12 | 206 | 92.2 % | 0.0 % | 7.3 % | 0.5 % |
| 12 → 13 | 191 | 92.1 % | 0.0 % | 7.5 % | 0.4 % |
| 13 → 14 | 177 | 90.9 % | 0.0 % | 8.9 % | 0.1 % |
| 14 → 15 | 161 | 85.7 % | 0.0 % | 13.8 % | 0.5 % |
| 15 → 16 | 138 | 83.0 % | 0.0 % | 16.5 % | 0.5 % |
| 16 → 17 | 115 | 83.0 % | 0.0 % | 16.6 % | 0.4 % |
| 17 → 18 | 96 | 82.2 % | 0.0 % | 17.5 % | 0.3 % |

**De los 14 a los 18 años, por lo bueno que es cada uno frente a los de su edad (cada año k → k+1):**

| tramo | casos | siguen | lo dejan | salen del mundo | prob. de seguir 4 años (si la tasa fuera constante) |
|---|---|---|---|---|---|
| mejores 10 % | 211 | 93.8 % | 6.2 % | 0.0 % | 77.5 % |
| del 10 al 50 % | 813 | 88.6 % | 11.4 % | 0.0 % | 61.5 % |
| mitad de abajo | 1013 | 77.7 % | 22.3 % | 0.0 % | 36.4 % |

Desaparecen del mundo entre los 17 y los 18: 0 por semilla (0.0 % de la cohorte presente); por papel: .


**Equipos** (`npm run equipos -- 4 3`, ciudad grande; ahora frente al commit base): clubes con equipo 44,5 de 45 tras el verano 3 (45); colegios con equipo 19 de 20 (16,3); futbolistas 2.375 (2.289). Equipos / futbolistas tras el verano 3:

| | benjamín | alevín | infantil | cadete | juvenil |
|---|---|---|---|---|---|
| base | 31,0 / 505 | 27,0 / 437 | 25,3 / 415 | 23,3 / 388 | 23,0 / 381 |
| ahora | 29,8 / 509 | 27,0 / 432 | 25,3 / 412 | 22,5 / 385 | 26,5 / 446 |

Cadete y juvenil **se siguen llenando** (el juvenil, mejor que antes: había 23 equipos y 381 jugadores). `npm run colegios`: colegios con equipo (de 5 por semilla) tras el verano 3: 4,0 / 4,0 / 4,0 / 3,7 / 3,7 (benjamín a juvenil); cierres de colegio 37 (4 enteros, 33 pierden uno de varios); tras un cierre hay equipo (14+) en la categoría de arriba en 15 de 16 casos. `npm run ninos-sin-equipo`: sin equipo con interés por el fútbol, al crear 0,8–1,8 por categoría y 2,0–11,7 tras el verano 1 (juvenil el mayor; daría para otro equipo en 1 de 6 semillas) . No he medido este número en el commit base, así que no hay comparación.

## 6. Coste de la semana (`tools/rendimiento-semana.ts --ciudad`)

| | base (sin dato) · informe anterior | fuerte · informe anterior | ahora |
|---|---|---|---|
| Cruces de semana (ms) | 135 / 86 / 109 / 213 / 377 / 315 | 181 / 102 / 172 / 373 / 347 / 413 | 150 / 104 / 137 / 231 / 310 / 320 |
| Suma de las seis | 1.235 | 1.588 | **1.252** |
| Crear | 12,0 s | 13,2 s | 11,6 s |
| Paso de un día (mediana) | 2,70 ms | 3,98 ms | 2,50 ms |

(Esta máquina es distinta de la de la sesión anterior; el coste de «fuerte» más el interés es del orden del base y muy por debajo del límite de 1 s por cruce.)

## 7. Para el usuario: el listón de profesional

Con todo esto el mejor de cada curso a los 17–18 está en 40–41 y **nadie llega a 45** (0 por curso en 4 semillas × 10 cursos); ≥ 40 son 1,5 por curso, ≥ 38, 4,5, ≥ 35, 9. Opciones: (a) listón de profesional ≈ 38–40 y de élite ≈ 35; (b) subir el tope por edad; (c) dejarlo (sobresalir exige al personaje).

## 8. Pendiente / dudas

- **Archivo** (§11 de `CIUDAD_Y_LIGAS.md`): los que salen a los 20 se borran sin archivo ni sénior.
- El interés no baja con el tiempo.
- Campamentos de verano para PNJ (no hechos).
- Sin equipo: el juvenil es la categoría con más niños sin equipo tras el verano 1 (11,7 por colegio y semilla con interés por el fútbol).
- Los tests `futbol.test.ts` y `equipos-por-demanda.test.ts` crean el mundo sin `porLibre`: con él, el club pequeño de la ciudad de tres clubes se queda sin benjamín en el «draft» desde la bolsa con azar nulo (sensible a los valores). El mundo real está bien (`npm run equipos`).
