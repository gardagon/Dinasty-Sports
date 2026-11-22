# Por qué los PNJ entrenan por debajo del personaje, y el abandono de los mejores (22/11/2026)

Rama `claude/pnj-entrenan-y-abandono` (sale de `claude/youthful-clarke-vs0kye`). Sin pull request. **El juego por defecto no cambia**: las dos propuestas están detrás de un dato que no se usa (ver §5) y `npm run huella -- 60` sale **idéntica** a la de antes (comprobada al final, con todo el código tocado). `npm run typecheck` y `npm test` (120 archivos, 1.328 tests) en verde. No se ha tocado `DECISIONES.md`. En `draft.ts` solo se ha añadido una función pequeña (`nivelesPorEdad`) y dos líneas que no hacen nada si el dato no está.

## 0. Resumen

1. **Antes de nada: las cifras del informe anterior (`analisis-profesionales.md`) estaban infladas por una foto mal tomada.** La herramienta fotografiaba la cohorte justo en la semana 52 de cada año (el primer día de curso). Ese día, quien ha cambiado de club en verano lleva el valor *provisional* del fichaje (el nivel que le da su potencial a esa edad, hasta 53 frente a 40; **190 de 1.316 jugadores de 13 años o más** en la semilla 31) y la pasada semanal aún no lo ha sustituido por el real. Una semana después (semana 53) ya no queda ninguno. Con la foto corregida (`52·k + 1`), **a los 17–18 el mejor PNJ de cada curso está en ~38 (no 45–52), nadie llega a 40 y nadie a 45**, y los «10 mejores a los 14» eran en buena parte picos de ese día (un niño con 44 a los 14 y 21 a los 15). §1.
2. **Por qué los PNJ entrenan «por debajo» del personaje: es esfuerzo, no una regla distinta.** Un PNJ hace ~1,7 sesiones de club por semana (≈ 23 puntos de entrenamiento); un personaje que hace lo que el bot «deportista» o el «perfecto» (~13 sesiones propias a la semana más el club) hace ~82 (3,6 ×). Un personaje **razonable** (el club y 2–4 sesiones propias a la semana: 29–39 puntos) **no se despega**: a los 12 años está en el nivel medio–p90 de los PNJ. Los PNJ no entrenan por su cuenta ni quedan a jugar (solo el juego informal de antes de entrar al club, y el personaje sí). Cansancio, lesiones y topes son los mismos que los del personaje. §2.
3. **Propuesta medida: una parte de los PNJ, según su interés, su ambición, su sacrificio, su disciplina y su edad, entrena por su cuenta o queda a jugar con las listas del personaje** (`PNJ_POR_LIBRE`, desactivada). Efecto a los 18 (4 semillas, el único cambio es éste): nivel medio 24,3 → 25,9 («libre») / 26,9 («fuerte») / 29,8 («intensa»); habilidades 29,4 % → 31,2 / 32,5 / 35,8 % del tope; el mejor de cada curso 38,5 → 39,5 / 40,4 / 41,8. Coste de la semana (suma de seis cruces): +5 % («libre») y +30 % («fuerte»). **Ni la variante más fuerte lleva a nadie a 45**: el techo lo pone el tope por edad, no las horas. §3.
4. **Abandono: de dónde sale cada salida (cohorte de 8 años, ciudad grande):** el 24–27 % de quien juega a los 15–17 lo deja cada verano por la regla de abandono (es la salida casi única); el equipo, el fin de categorías y el archivo cuentan menos del 2 % hasta los 18; y **el ~7 % de la cohorte que desaparece a los 18 son los compañeros de clase del personaje**, que salen del mundo al acabar el colegio (`renovarAlumnos`, `sale`) y se sustituyen por niños de 8 años. §4.
5. **La regla de abandono no mira lo bueno que eres:** casi todos son «titulares» (los 11 mejores de un equipo de 14–18), así que el motivo «minutos» vale −0,9 para todos, y los mejores 10 % tienen **la misma probabilidad de dejarlo que la media** (11,8 % frente a 10,4 % a los 14; 21,8 % frente a 21,2 % a los 17). Los mejores 10 % de cada edad siguen cada año el 84 % y los de la mitad de abajo el 71 %: la diferencia es pequeña. §4.2.
6. **Propuesta de curva medida: añadir lo bueno que es frente a los de su edad (peso 0,6) y un suelo del 4 % (`ABANDONO_PROPUESTO`, desactivada).** Los mejores 10 % de cada edad pasan de seguir 4 años seguidos el 50 % al **70 %** (cada año, de 15,4 % a 7,3 % los que lo dejan, nunca 0), los de la mitad de abajo del 26 % al 22 %, y a los 18 quedan 44 jugadores por semilla en vez de 48 (−8 %). De los 40 mejores a los 14 (por semilla, 4 semillas) siguen jugando a los 18: 18 → 26. §4.4–4.5.
7. **Recomendaciones:** activar el abandono con nivel (después de medir los equipos que se cierran en juvenil, `npm run equipos`, que no he podido repetir); activar «fuerte» si se quiere más dispersión entre los PNJ (no cambia la escala: el listón de 45 no se alcanza con ninguna); y **bajar el listón de profesional** a lo que da el mundo (§6) o decidir otra palanca (el tope por edad), porque con los números reales el mejor de cada curso a los 18 está en 38–42.

## 1. La foto del primer día (corrección del informe anterior)

- **Qué pasa:** al empezar el curso (semana 52 de la partida) `renovarDeportistas` y los fichajes de verano dan a quien entra en un club `levels[deporte]` calculado con su potencial a esa edad (`nivelEn`: techo × forma × ventaja). `vp` (lo que vale en cada puesto, que lee la herramienta primero) se borra al cambiar de club (`sinDeporte`), así que la herramienta caía a `levels`. La pasada semanal (`semanaDeportiva`: «quien acaba de cambiar de club se calcula esta semana») lo sustituye por el valor real en la **semana siguiente**.
- **Medida** (semilla 31, jugadores de 13 años o más): semana 26: 0 con |vp − levels| > 5; **semana 52: 190**, y el top 5 de `levels` es 53/51/51/48/47 frente a 40/38/37/36/36 de `vp`; semana 53: 0.
- **Consecuencia para el informe anterior:** el «máx 57,7 a los 17», los «1–2 profesionales por curso» y «de los 10 mejores a los 14 solo 1 de cada 3–4 sigue» salían de esos picos. La herramienta ahora mide en la semana `52·k + 1`.
- **Aviso para el juego (no lo he tocado):** durante la primera semana de curso, quien ha cambiado de club se ve con el valor del potencial (hasta ~13 puntos por encima del real). Lo ve el juego si mira `levels` en ese momento (p. ej. «Mi equipo»); conviene comprobar qué lee la interfaz.

**Línea de base corregida** (4 semillas, ciudad grande, cohorte de 8 años, `tools/analisis-profesionales.ts`):

| edad | juegan | nivel medio | p90 | máx | habilidades % tope | capacidades % tope | mejor / 3.º / 10.º |
|---|---|---|---|---|---|---|---|
| 8 | 268 | 11,6 | 13,8 | 17,1 | 17,9 | 20,9 | 16,6 / 15,8 / 14,6 |
| 12 | 191 | 16,5 | 20,0 | 26,2 | 21,9 | 27,8 | 26,0 / 24,6 / 21,9 |
| 14 | 153 | 18,9 | 24,1 | 32,5 | 24,2 | 32,8 | 31,0 / 29,5 / 25,9 |
| 16 | 99 | 21,6 | 29,5 | 37,0 | 26,7 | 37,9 | 35,7 / 33,8 / 29,0 |
| 17 | 72 | 23,0 | 31,4 | 37,8 | 28,3 | 39,8 | 36,3 / 34,4 / 29,2 |
| 18 | 48 | 24,3 | 33,8 | 39,8 | 29,4 | 41,5 | 38,5 / 36,0 / 29,2 |

A los 17–18 (último año jugando), por curso y semilla: ≥ 35: 3,25; ≥ 38: 0,50; **≥ 40 (élite): 0,00; ≥ 45 (profesional): 0,00**.

## 2. Por qué los PNJ entrenan por debajo del personaje

### 2.1 Cuánto entrena cada uno

Puntos de entrenamiento por sesión (suma de las cantidades de la lista, como las calcula el juego; `ESCALA_DE_ENTRENAMIENTO` = 1): **sesión del club ≈ 13,1** (2 ejercicios elegidos por el entrenador); entrenar por tu cuenta ≈ 5,0 (media de los 10 de campo que se hacen solo, ya con el ×0,85); quedar a jugar ≈ 2,2 (partidillo, 3 contra 3, tiros y paradas, balón parado).

| Quién | Sesiones de club/semana | Sesiones propias/semana | Puntos de entrenamiento/semana (aprox.) | Nivel a los 12 | Habilidades % tope a los 12 | Nivel a los 14 |
|---|---|---|---|---|---|---|
| **PNJ (club pequeño / mediano / grande)** | 1,55 / 1,79 / 2,97 (media 1,73) | 0 | **≈ 23** | media 16,5 · p90 20,0 · mejor 26,2 | 21,9 % | media 18,9 · p90 24,1 · mejor 32,5 |
| Personaje razonable (club + 2 propias/sem) | 1,46 | 2 | ≈ 29 | 17,6 | 18,4 % | 19,4 |
| Personaje razonable (club + 4 propias/sem) | 1,46 | 4 | ≈ 39 | 20,4 | 21,3 % | 23,2 |
| Bot «deportista de fútbol» (hasta 2 sesiones al día todos los días) | 1,46 | 12,6 (+ 7 de gimnasio) | ≈ 82 | **28,0** | 31,4 % | **33,5** |
| Bot «perfecto» (lo entrena todo, con campamento) | ~1,5 | 12,8 (+ 6 de gimnasio, campamento de verano) | ≈ 83 | **30,9** | 42,5 % | **37,0** |

(Personaje desde los 8 años en la ciudad grande, semilla 31, un solo bot por fila: **es una semilla**, el orden de magnitud es lo que importa. El personaje parte de nivel 10 y 15,8 % de habilidades a los 8; el PNJ medio, de 11,6 y 17,9 %, porque ya trae una historia deportiva. Los puntos por semana son sesiones × lo que sube cada tipo; el club del personaje y el del PNJ se calculan igual.)

**Lectura:**
- **No es una regla distinta:** un personaje razonable (el club y 2–4 sesiones propias) queda en el nivel medio–p90 de los PNJ de su edad. El personaje que «llega a ~80 % de sus topes» lo hace con **~3,6 veces la carga de un PNJ** (13 sesiones propias a la semana más gimnasio): a los 14 el bot perfecto (37,0) supera al mejor PNJ de cada curso (31–32,5).
- **Un PNJ no entrena por su cuenta ni queda a jugar.** Su semana (`semanaDeNino` → `pasoDeSemana`) lleva `informal: false`: solo las sesiones del club (`huecosQueHace`: `sesionesPorSemana` del club × su asistencia, del 55 al 100 % según su constancia). El juego informal solo está en su historia antes de entrar al club (las semanas de `SEMANAS_DE_JUEGO_INFORMAL`). Tampoco van a campamentos. Los que no tienen equipo no entrenan nada (`huecos = []`).
- **Lo que sí es igual que el personaje:** las fórmulas de subida, techo, velocidad y caída (`computeGainVarias`, `computeCap`, `computeSpeed`, `evolucionSemanal`) y los **topes** (`topeEfectivo`, el vigor por edad); el **cansancio y las lesiones** (`pasoDeSemanaDelEstado`: cada sesión cuesta `CARGA.sesion` = 6 puntos de condición, la eficiencia baja con el cansancio y la salud, el riesgo de lesión sube con la fatiga); y el efecto del conocimiento del deporte en la eficiencia de la sesión.
- **Lo que no tiene el PNJ:** la **sobrecarga** del personaje (más de 2 sesiones al día: ×0,6 de eficiencia y daño al cuerpo) no se simula porque ninguno llega a 2 al día (≤ 4 a la semana); si se les da más sesiones, entra por la fatiga de la semana (misma regla que ya los frena), no por la cuenta diaria. Y la dedicación: el personaje elige cuánto entrena; el PNJ, no.

### 2.2 El techo por edad

La subida se frena sola con el tope por edad (`vigor` de cada categoría): el bot perfecto sube 4,7 puntos de habilidad a la semana el primer año y 1,2–1,8 después; el PNJ, 0,5–0,7 y baja a 0,4. Por eso la diferencia de esfuerzo (3,6×) se convierte en una diferencia de nivel de ~1,7–1,8× a los 12–14 años, y por eso (§3) más sesiones de PNJ mueven poco el nivel.

## 3. Propuesta 1: que una parte de los PNJ entrene por su cuenta y quede a jugar

### 3.1 Qué es

Un dato opcional de la rutina del deporte, `RutinaDeDeporte.porLibre` (`PorLibreDeDeporte`, `packages/contracts/src/deporte-datos.ts`), con las listas del propio personaje: los 10 entrenamientos que se hacen solo (`entrenaPorLibre`, ×0,85) y las 4 quedadas (`QUEDADAS_DE_FUTBOL`). Cada semana, cada niño que juega al deporte (esté o no en un equipo) llena cada uno de `maximoPorSemana` huecos con una probabilidad (`propensionPorLibre`):

`base + interés·x + ambición·x + sacrificio·x + disciplina·x + dispersión·N(0,1)`, por un factor por edad (los estudios), acotada a 0–1; la parte aleatoria (`N`) es de cada curso y de cada niño, estable.

- **Qué hace** (`listaPorLibre`): según su ambición (35 % + 40 %·ambición, entre 10 y 90 %) entrena solo —elige entre tres entrenamientos al azar el que más le falta, respetando el puesto (el portero, los de portería; el de campo, no)— o queda a jugar con una de las 4 quedadas.
- **Mismas reglas:** las sesiones se aplican con la misma `sesionDeClub` (conocimiento, techo, caída, desarrollo natural), el entrenar solo rinde el ×0,85 del personaje, y **cuentan como sesiones en la semana del estado** (`sesionesQueHace`): cansan, suben el riesgo de lesión y cuentan para los minutos del cuerpo. En semanas de baja no entrenan.
- **Dónde:** `modules/npcs/src/semana.ts` (`huecosPorLibre`, `propensionPorLibre`, `listaPorLibre`, `HUECO_LIBRE` = 100: los huecos a partir de 100 no son del club), `index.ts` (`semanaDeportiva` y la historia al crear: las dos usan las mismas funciones). Sin el dato, `huecosPorLibre` devuelve `[]` y todo va como siempre.
- **Activarlo:** en `modules/futbol/src/datos.ts`, añadir `porLibre: PNJ_POR_LIBRE` a la `rutina` de `POBLACION_ESPANA` (hoy `PNJ_POR_LIBRE` está definido y exportado pero no se usa). Con la partida guardada: las poblaciones guardan su rutina, así que las partidas antiguas siguen sin él.
- **Cifras provisionales** (`PNJ_POR_LIBRE`): máximo 3 a la semana; base 0,20; interés 0,10; ambición 0,10; sacrificio 0,05; disciplina 0,03; dispersión 0,10; factor por edad 15: 0,9, 16: 0,75, 17: 0,6, 18: 0,7. Con ellas un niño medio hace 0,7 sesiones propias a la semana (sesiones totales 1,73 → 2,43; p90 3,1; p99 4,3). Las variantes medidas:

| Variante | Máx./sem. | base | interés | ambición | sacrificio | disciplina | dispersión | Sesiones/sem. (media · p90 · máx.) |
|---|---|---|---|---|---|---|---|---|
| sin dato (hoy) | – | – | – | – | – | – | – | 1,73 · – · – |
| **libre** (`PNJ_POR_LIBRE`) | 3 | 0,20 | 0,10 | 0,10 | 0,05 | 0,03 | 0,10 | 2,43 · 3,1 · 4,3 |
| **fuerte** | 4 | 0,20 | 0,12 | 0,20 | 0,08 | 0,05 | 0,20 | 2,78 · 3,8 · 5 |
| **intensa** | 5 | 0,30 | 0,15 | 0,25 | 0,10 | 0,05 | 0,25 | (no medido por separado; +3,6 en los más aficionados) |

(Sesiones por semana: semilla 31, 52 semanas, `tools/pnj-entrenan.ts pnj`.)

### 3.2 Efecto (4 semillas, ciudad grande, cohorte de 8 años, 10 cursos)

| | sin dato | libre | fuerte | intensa |
|---|---|---|---|---|
| Nivel medio a los 14 | 18,9 | 20,3 | 20,8 | 22,4 |
| Nivel medio a los 16 | 21,6 | 23,3 | 24,1 | 26,4 |
| Nivel medio a los 18 | 24,3 | 25,9 | 26,9 | 29,8 |
| p90 a los 18 | 33,8 | 34,9 | 34,6 | 37,5 |
| Máximo a los 18 | 39,8 | 40,2 | 41,6 | 43,6 |
| Mejor de cada semilla a los 18 (media) | 38,5 | 39,5 | 40,4 | 41,8 |
| Habilidades % tope a los 18 | 29,4 % | 31,2 % | 32,5 % | 35,8 % |
| Capacidades % tope a los 18 | 41,5 % | 41,4 % | 41,6 % | 41,9 % |
| Juegan a los 18 (de 273 interesados) | 48 | 51 | 48 | 48 |
| A los 17–18, por curso: nivel ≥ 35 | 3,25 | 6,25 | 6,25 | 11,50 |
| ≥ 38 | 0,50 | 2,00 | 2,00 | 4,50 |
| **≥ 40 (élite)** | **0,00** | 0,25 | **1,00** | 1,75 |
| **≥ 45 (profesional)** | **0,00** | 0,00 | 0,00 | 0,00 |
| Los 10 mejores de cada semilla: nivel medio | 33,8 | 35,4 | 35,6 | 38,0 |

(«intensa» se midió con el abandono propuesto también activo (§4); sin él los números serían algo menores. Con 4 semillas, la diferencia de 1–2 niños por encima de un listón no significa nada; las medias por edad sí son estables: ±0,3 entre semillas.)

**Lectura:**
- **Sube el nivel de todos, sobre todo del de arriba** (+1,6 con «libre», +2,6 con «fuerte», +5,5 con «intensa» de media a los 18; el mejor, +1,0 / +1,9 / +3,3), y las habilidades (+1,8 / +3,1 / +6,4 puntos de % del tope). **Las capacidades no cambian** (41–42 %): los entrenamientos propios casi no las tocan y las rige el tope por edad.
- **Ninguna variante lleva a nadie a 45 ni a 50**: con «intensa» (hasta 5 sesiones propias a la semana a quien más afición tiene, ≈ 25–30 puntos más a la semana que hoy) el mejor del mundo a los 18 está en 43,6. Es el tope por edad, no las horas (§2.2).
- **El nivel por edad se queda dentro del rango del personaje razonable** (p. ej. a los 14: PNJ 20,3–22,4 de media; personaje con club + 4 propias, 23,2).
- **No cambia la forma del embudo:** a los 18 juegan 48–51 por semilla en todas las variantes.

### 3.3 Coste (`tools/rendimiento-semana.ts --ciudad`, ciudad grande con fútbol, 6 cruces de semana, ms)

| | sin dato | libre | fuerte |
|---|---|---|---|
| Cruces de semana | 135 / 86 / 109 / 213 / 377 / 315 | 141 / 97 / 131 / 218 / 372 / 332 | 181 / 102 / 172 / 373 / 347 / 413 |
| Mediana / suma de las seis | 174 / 1.235 ms | 179 / 1.291 ms | 264 / 1.588 ms |
| Crear | 12,0 s | 11,9 s | 13,2 s |
| Paso de un día (mediana) | 2,70 ms | 2,49 ms | 3,98 ms |

«Libre» cuesta ~+5 % por semana (dentro del ruido); «fuerte», ~+30 % (181 frente a 135 ms en un cruce sin liga; 413 frente a 315 con jornada), y sigue por debajo del límite de 1 s. El coste crece con las sesiones (cada sesión propia hace un `practicar` más por niño y semana).

### 3.4 Recomendación (propuesta 1)

- **Activar «fuerte»** (o «libre» si el coste importa: +30 % frente a +5 % en la pasada semanal): da más dispersión entre PNJ (los de afición alta llegan a 4–5 sesiones a la semana: «mucho tiempo fuera jugando») con +2,6 de nivel a los 18 sin cambiar la escala del personaje. Es el cambio que pedía el usuario y es del mismo orden que un personaje razonable.
- **No esperar que cambie los profesionales:** con ninguna variante hay PNJ de 45; la palanca para eso es el tope por edad o el listón (§6).
- **Pendiente:** campamentos para los PNJ (en verano, según interés): no se han implementado; las cifras de `propension` son un primer ajuste a mano, no una calibración; y no he medido si cambia el reparto de puestos o la convocatoria (los PNJ con extras tienen más cansancio).

## 4. Abandono de los mejores

### 4.1 De dónde sale cada salida

Cohorte de 8 años de la ciudad grande (≈ 500 por semilla; 273 con interés por el fútbol; 4 semillas), **medida sin el sesgo del primer día** (§1). «Siguen / sale del mundo / lo deja / sin equipo» son los que jugaban el año k y no el k+1:

| edad (k → k+1) | juegan en k | siguen | sale del mundo | lo deja (abandono) | sin equipo (no dejado) |
|---|---|---|---|---|---|
| 8 → 9 | 268 | 89,3 % | 0 | 9,3 % | 1,4 % |
| 10 → 11 | 222 | 92,2 % | 0 | 7,6 % | 0,1 % |
| 12 → 13 | 191 | 90,3 % | 0 | 9,3 % | 0,4 % |
| 13 → 14 | 173 | 88,1 % | 0 | 11,4 % | 0,4 % |
| 14 → 15 | 153 | 81,6 % | 0 | 16,9 % | 1,5 % |
| 15 → 16 | 125 | 77,6 % | 0 | 21,6 % | 0,8 % |
| 16 → 17 | 99 | 72,9 % | 2,8 % | 24,1 % | 0,3 % |
| 17 → 18 | 72 | 67,0 % | 5,9 % | 26,7 % | 0,3 % |

1. **Reglas de abandono** (`abandono.ts`, datos de `reclutamiento.abandono`; se aplica cada verano en `renovarDeportistas`): es la salida casi única. Base por edad 0,10 hasta los 13, 0,12 a los 14, 0,18, 0,24, 0,30 y 0,36 a los 18, multiplicada por 1 + Σ pesos × motivos (interés 0,4, ambición 0,25, minutos 0,3, estudios 0,3, padres 0,15). Probabilidad media medida de dejarlo por edad: 6 % (8–12), 7 %, 12 % (14), 16 %, 19 %, 22 % (17); coincide con lo que se ve.
2. **Falta de equipo**: <1,5 % cada año (`sin equipo`: apartados que luego se recolocan o, tras dos plazos sin club, `dejado`). A los 18 no pesa.
3. **Fin de categorías**: en el fútbol, `reclutamiento.edades.max` = 19 y las categorías llegan a juvenil (18); como no existe el sénior, quien cumple 19 se retira (`retirado`) — queda fuera de la ventana de los 18 años que se mide.
4. **«Archivo»**: no hay archivo todavía (`CIUDAD_Y_LIGAS.md` §11: «pendiente»). Lo que hoy desaparece del mundo a los 18 son **los compañeros de clase del personaje** (`renovarAlumnos`: `role === 'companero'` y edad ≥ `EDAD_FIN_COLEGIO` (18) → `sale`: se borran y entran niños de 8 años sin deporte). **35 por semilla = el 7,1 % de la cohorte presente**, todos `companero`; son el 2,8 % de los que juegan a los 16 y el 5,9 % de los que juegan a los 17. Los niños de otros colegios (`nino_*`) no salen hasta los 20.

### 4.2 Por qué los mejores se pierden como los demás

- **A los 14, los 10 mejores de cada semilla (40): a los 18 siguen 18 (45 %), 20 lo dejan, 2 salen del mundo** (antes, con los picos del primer día, parecía 1 de cada 3–4).
- **La regla de abandono no distingue el nivel.** Probabilidad de dejarlo por edad (la del juego, con los datos de cada uno), todos frente a los mejores 10 % de su edad: 12: 6,0 % / 5,1 %; 14: 11,8 % / 10,4 %; 15: 16,1 % / 14,9 %; 16: 19,5 % / 19,0 %; 17: 21,8 % / 21,2 %. Motivos medios de los mejores 10 %: interés −0,5, ambición ~0, **minutos −1,00** (todos son titulares: `titularesDelCurso` marca como titulares a los 11 que más valen de equipos de 14–18, así que casi todos lo son: −0,92 de media), estudios 0–0,4, padres +0,5.
- Por tramo de nivel (cada año de 14 a 17, `k → k+1`): mejores 10 %: siguen 84,0 %, lo dejan 15,4 %; del 10 al 50 %: 80,4 % / 17,5 %; mitad de abajo: 71,2 % / 27,4 %. Seguir 4 años seguidos (si la tasa fuera constante): 50 % / 42 % / 26 %.

### 4.3 Datos públicos para la curva

No he encontrado una curva oficial de abandono por edad del fútbol federado español. Lo que hay, con sus reservas:

| Dato | Cifra | Fuente | Reserva |
|---|---|---|---|
| Abandono de todos los deportes organizados entre 8.º y 12.º curso (EE. UU.) | **32 % de media** en 4–5 años (65 % en baloncesto femenino, el mayor) | [Mapping Attrition among U.S. Adolescents in Competitive, Organized School and Community Sports](https://www.dyu.edu/sites/default/files/2023-02/mapping-attrition-us-sports.pdf) | EE. UU., todos los deportes; no distingue el fútbol |
| «El 70 % deja el deporte organizado a los 13» | 70–72 % | Hedstrom y Gould (2004, Michigan State), citado por [NFHS](https://nfhs.org/stories/stop-the-exodus-we-need-to-keep-youth-involved-in-sports); [Aspen Institute: sin fuente original](https://tucson.com/sports/article_a4b73604-114a-56e0-8bde-4625d90b292b.html) | Sin fuente trazable; no la uso |
| Jugadores de academia inglesa que salen del sistema antes de los 16 | ≈ 50 % | Premier League (2012), citada en [Frontiers in Sports and Active Living, 2022](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2022.941482/full) | Selección del club, no abandono voluntario |
| De los becados a los 16 en Inglaterra, no juegan en los 5 primeros niveles a los 18 | ≈ 98 % | Calvin (2017), mismo estudio de Frontiers | Selección, no abandono |
| Academia: llegan al máximo nivel | 4 % | [Univ. de Essex (2024)](https://www.essex.ac.uk/news/2024/06/27/just-four-per-cent-of-teenage-academy-players-make-it-to-top-tier-football) (ya citado en el informe anterior) | Muestra de ~200 |

- **Las licencias de la RFEF por categoría** ([`LICENCIAS_2324.pdf`](https://rfef.es/sites/default/files/2024-11/LICENCIAS_2324.pdf) y las memorias anteriores) darían la caída de cadete a juvenil, pero **el host `rfef.es` está bloqueado en este entorno** y no he podido leerlas. **Pendiente:** si se quiere una curva citada con datos españoles, leerlas con una máquina con acceso y calcular licencias(edad n+1)/licencias(edad n) (no equivale a abandono: incluye cambios de modalidad y de federación).
- **Qué dice lo poco que hay:** nuestro modelo da 1 − (0,816·0,776·0,729·0,670) = **69 % de los que juegan a los 14 dejan el fútbol antes de los 18**; el 32 % de «todos los deportes» a 4–5 años es la mitad. El fútbol federado selecciona más (plazas limitadas) y es plausible que sea más alto, pero **el nuestro parece alto**. No lo he cambiado: la propuesta de abajo no toca la media; la media sería otra decisión (p. ej. multiplicar `baseDeLaEdad` de 14 a 18 por 0,75; no medido).
- **Para «los buenos abandonan menos pero no cero»**: lo único con apoyo es que quien es seleccionado por nivel permanece mucho más (el 50 % de academia que sale antes de los 16 y el 98 % de los becados que no llegan lo hacen por selección, no por abandono voluntario); el suelo no tiene un número público: lo he fijado en **4 % anual**, que a lo largo de 4 años deja a ~85 % de los que no tendrían ningún otro motivo.

### 4.4 Propuesta 2 (desactivada)

- **Dato:** `ABANDONO_PROPUESTO` (`modules/futbol/src/datos.ts`) = `{ pesos: { nivel: 0,6 }, suelo: 0,04 }`; se mezcla con `reclutamiento.abandono` de `POBLACION_ESPANA`. Para activarla: añadir esas dos cifras a `abandono` (`pesos.nivel` y `suelo`).
- **Qué hace:** nuevo motivo `nivel` (`abandono.ts`): lo bueno que es cada uno frente a los de su edad que juegan (`nivelesPorEdad` en `draft.ts`: puntuación típica de su valor frente a la media y la desviación de su edad), `fuerza = −z/2` acotada a ±1; con peso 0,6 el mejor (z ≥ 2) baja el factor en 0,6 y el peor (z ≤ −2) lo sube en 0,6. `suelo`: probabilidad mínima de dejarlo cada verano (4 %), «no todos los mejores triunfan, por mentalidad o por temas personales» (el motivo es el mismo para el personaje: `motivosDeAbandono` lo da con su texto, «Es de los mejores de su edad»). Sin `pesos.nivel` el nivel no cuenta y el suelo es 0 (test: `tests/pnj-por-libre.test.ts`).
- **Lo que no toca:** el interés, la ambición, los estudios y los padres, ni las bases por edad; ni los que salen del mundo a los 18.

### 4.5 Efecto (4 semillas)

| | sin propuesta | abandono con nivel | las dos propuestas («libre» + abandono con nivel) |
|---|---|---|---|
| Mejores 10 % de cada edad: siguen cada año / lo dejan (14–17) | 84,0 % / 15,4 % | **91,6 % / 7,3 %** | 90,8 % / 8,6 % |
| … seguir 4 años seguidos | 50 % | **70,5 %** | 68 % |
| Del 10 al 50 %: siguen / lo dejan | 80,4 % / 17,5 % | 79,6 % / 18,7 % | 81,2 % / 17,1 % |
| Mitad de abajo: siguen / lo dejan | 71,2 % / 27,4 % | 68,4 % / 30,4 % | 69,0 % / 29,6 % |
| De los 10 mejores a los 14 (por semilla), a los 18: siguen / lo dejan / salen del mundo | 18 / 20 / 2 (de 40) | **26** / 12 / 2 | 26 / 13 / 1 |
| Juegan a los 16 / 17 / 18 (por semilla) | 99 / 72 / 48 | 90 / 67 / 44 | 95 / 68 / 46 |
| De los que juegan a los 17, dejan antes de los 18 | 33,0 % | 36,1 % | 32,6 % |
| Nivel medio a los 18 / mejor de cada curso | 24,3 / 38,5 | 26,3 / 38,2 | 28,2 / 39,8 |
| A los 17–18, por curso: ≥ 35 / ≥ 38 / ≥ 40 | 3,25 / 0,50 / 0,00 | 5,00 / 1,00 / 0,00 | 8,25 / 2,25 / 0,25 |

(La columna «sin propuesta» es la línea base corregida del §1.) Con «intensa» + abandono con nivel: mejores 10 % siguen 90,0 % / 9,4 %; 4 años seguidos, 65,6 %.

**Lectura:**
- **Los mejores abandonan menos y no cero**: de 15,4 % a 7,3 % cada año (más del doble que el suelo del 4 %: el interés, los estudios y los padres siguen contando); de los 40 mejores a los 14, 26 siguen a los 18 frente a 18. Es lo que pedía el encargo: «los buenos abandonen menos pero no cero».
- **Los de abajo abandonan algo más** (27,4 % → 30,4 %): al ser simétrico, la media sube un poco (hay menos plazas llenas de gente que va muy por detrás): a los 18 quedan 44 jugadores frente a 48 (−8 %). Si se quiere mantener el número, bajar un poco `baseDeLaEdad` o poner un peso menor.
- **Efecto sobre el nivel:** más buenos que siguen = nivel medio a los 18 más alto (+2,0 sin tocar el entrenamiento) y más jugadores de ≥ 35 (3,25 → 5,00); el mejor de cada curso no cambia (38,2): el techo sigue siendo el tope por edad.
- **No medido:** cuántos equipos de juvenil y de cadete se cierran (con 8 % menos de jugadores a los 18). Hay que pasar `npm run equipos` y mirar los equipos de juvenil antes de activarla.

## 5. Qué hay en el código (todo desactivado)

| Qué | Dónde | Cómo se activa |
|---|---|---|
| Entrenar por su cuenta / quedar a jugar de los PNJ | `PorLibreDeDeporte` (contracts); `huecosPorLibre`, `propensionPorLibre`, `listaPorLibre`, `HUECO_LIBRE` (`modules/npcs/src/semana.ts`); enganches en `index.ts` (historia y `semanaDeportiva`); dato `PNJ_POR_LIBRE` (`modules/futbol/src/datos.ts`, exportado) | `porLibre: PNJ_POR_LIBRE` en la `rutina` de `POBLACION_ESPANA` |
| Abandono con el nivel y un suelo | `pesos.nivel` y `suelo` en `reclutamiento.abandono` (contracts); motivo `nivel` en `abandono.ts`; `nivelesPorEdad` en `draft.ts` (única parte nueva de ese archivo); dato `ABANDONO_PROPUESTO` (exportado) | añadir `pesos.nivel` y `suelo` a `abandono` |
| Medidas | `tools/analisis-profesionales.ts` (la foto corregida; guarda quién lo deja y la probabilidad de abandono), `tools/pnj-entrenan-informe.ts`, `tools/pnj-entrenan.ts` (PNJ por semana y personaje con bots), `tools/propuestas-pnj.ts` (activa las propuestas solo para medir con `PNJ_LIBRE` y `PNJ_ABANDONO`), `tools/rendimiento-semana.ts` (acepta las mismas variables) | – |

Con el dato desactivado, nada de esto cambia el juego: `npm run huella -- 60` es idéntica (16 de 16 líneas) a la de la rama base. Tests nuevos: `tests/pnj-por-libre.test.ts` (6: sin el dato no cambia nada; con él, el aficionado hace más que el desganado, nunca pasa del máximo, es estable, respeta el puesto y la escala del personaje; el abandono con nivel protege al mejor, castiga al que va por detrás y no baja del suelo).

Cómo repetir: `PNJ_LIBRE=1 PNJ_ABANDONO=1 npx tsx tools/analisis-profesionales.ts salida.json 31 10` (una semilla, ~6 min con 4 a la vez) y `npx tsx tools/pnj-entrenan-informe.ts etiqueta=salida.json,…`.

## 6. Recomendaciones y decisiones para el usuario

1. **El listón de «profesional» (≥ 45 a los 17–18) no lo alcanza nadie** con los datos reales, ni con la propuesta más fuerte; con la base, el mejor de cada curso está en 38–40 y el ≥ 40 (élite) es 0 por curso. Con el entrenamiento de PNJ «fuerte» y el abandono con nivel: ≥ 38: 2,25 por curso, ≥ 40: 0,25; con «intensa»: ≥ 40: 1,75. Opciones: (a) **bajar el listón a ≈ 38 (profesional) y ≈ 35 (élite)** y volver a medir (con las propuestas: 2–4 y 6–11 por curso, frente a ~0,7–1 de la vida real escalada, `analisis-profesionales.md` §3); (b) subir el tope por edad o la escala del PNJ (no probado: lo frena el tope, no la escala); (c) dejarlo como está y decir que sobresalir exige al personaje, no al mundo.
2. **Activar la propuesta del abandono con nivel**, tras `npm run equipos` (ver si se cierran equipos de juvenil por tener un 8 % menos a los 18). Es lo que el encargo pedía y sale limpio.
3. **Activar el entrenamiento de PNJ «fuerte»** si se quiere más dispersión y gente que «dedica mucho tiempo fuera». Cuesta ~+30 % en la pasada semanal (~+0,1 s en la semana con liga), por debajo del límite de 1 s.
4. **Los compañeros de clase del personaje que desaparecen a los 18** (35 por semilla): hoy se borran sin pasar a ningún sitio y los mejores de ellos son parte de los «mejores que no siguen». Tiene sentido retenerlos como los de otros colegios (que siguen hasta los 20) o archivarlos (`CIUDAD_Y_LIGAS.md` §11) y que los buenos pasen a sénior cuando exista; no lo he tocado (no es un cambio mínimo y toca `renovarAlumnos`).
5. **Corregir lo del primer día** (§1): comprobar que la interfaz («Mi equipo», fichajes) no enseña el valor provisional del fichaje durante la primera semana, y que el informe anterior se lea con esa salvedad (su §4–6 sobre «1–2 profesionales por curso» y «1 de cada 3–4 de los mejores sigue» salían de ese pico).
6. **Pendiente de medir:** datos de licencias de la RFEF por categoría (host bloqueado en esta sesión); el efecto en las plantillas y la convocatoria; campamentos de verano para PNJ; la vida del personaje razonable hasta los 18 (solo hasta los 12–14 años: el bot perfecto de 8 a 14 llegó al 50 % de habilidades; a los 18 no lo he vuelto a medir en esta sesión).
