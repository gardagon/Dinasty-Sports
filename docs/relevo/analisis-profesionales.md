# Análisis: ¿cuántos llegan a profesionales a los 18 años? (22/11/2026)

Rama `claude/analisis-profesionales` (sale de `claude/youthful-clarke-vs0kye`). Sin pull request. **No se ha cambiado el juego ni `DECISIONES.md`**; solo herramientas de lectura en `tools/`.
Encargo de la sesión de arquitectura: comprobar que, con los entrenamientos nuevos (`docs/relevo/entrenamientos.md`: el club rinde más, una sesión sube ~13 puntos, los PNJ salen un 3–5 % más altos por edad), el balance sigue teniendo sentido de cara a la preparación profesional a los 18: que no lleguen demasiados niños y que no lleguen todos a sus topes.

## 0. Resumen

1. **No llegan demasiados ni llegan a sus topes: es al revés, el techo real está muy por debajo.** Con la cohorte de benjamín de la ciudad grande (≈ 500 niños por curso, ≈ 271 con interés por el fútbol) seguida 10 años, **a los 17–18 la media de habilidades de los que juegan está en el 29 % de su tope y el mejor niño de los 4 cursos llega al 48 %** (en cualquier edad, la mejor habilidad suelta de cualquier niño llega al 83 %) (era el 25 % con los entrenamientos de antes). **0 niños de 4 semillas llegan al 90 %, 95 % o 100 % de sus topes** (ni en capacidades ni en la media de habilidades; ninguna habilidad ni capacidad suelta llega al 95 %: máximos 83 % y 67 %). Las capacidades están al 41 % del tope (igual que antes).
2. **Los entrenamientos nuevos casi no cambian el resultado.** Fracción del tope en habilidades: 24,7 % → 29,1 % (+4,4 puntos); los 10 mejores de cada semilla: 25,1 % → 33,8 % (+8,7). El **nivel de jugador no sube** (media a los 17: 28,5 antes, 27,0 ahora; el ruido entre semillas es mayor que la diferencia). El número de niños por encima de «nivel 45» a los 17–18 por curso es 1,0 antes y 1,0 ahora con las mismas 3 semillas (2,0 con una cuarta).
3. **Cuántos son «profesionales» depende del criterio, y no había ninguno escrito.** Propongo (§1) **nivel ≥ 45 a los 17–18 años** como «profesional» y ≥ 40 como «juvenil de élite»: salen **1–2 profesionales por curso** (de ≈ 270 interesados) y **2–4 de élite**. Con los datos públicos (§3), la cifra real escalada a nuestra ciudad es **≈ 0,7–1 por curso** (0,4 % de los federados; 1–4 % de una cantera grande): **del mismo orden, algo por encima** pero con muy poca muestra.
4. **Lo que sí merece una decisión no está en la escala de entrenamiento, está en el embudo:** de los 267 que juegan a los 8 años, **solo 46–49 siguen a los 18 (17–18 %)**; de los 10 mejores a los 14, **solo 1 de cada 3–4** sigue jugando a los 18; y un 24–27 % de los que juegan a los 17 lo dejan antes de los 18. Y a los 18 años salen del mundo ~10 % de la cohorte (los «archivados»; el pase a sénior/profesional aún no existe). Si se quiere que haya profesionales a los 18, es ahí donde se pierden (§5).
5. **Recomendación: no tocar `ESCALA_DE_ENTRENAMIENTO` (1) ni las curvas por edad.** Subirla a 2 (probado, §4) no acerca a nadie al tope (sigue en 0 ≥ 50 y 0 ≥ 90 %) pero **multiplica por ~3–5 los «de élite»** (2,0–3,7 → 9,7 por curso) y aplana la cabeza: es el margen de seguridad que queda.

## 1. Qué esperamos: el criterio de «profesional» a los 18

**No hay un criterio escrito.** Lo he buscado en `DECISIONES.md` («tope», «curvas por edad», «profesional», «potencial», «sim:vida»), `CIUDAD_Y_LIGAS.md` (§11: «los mejores pasan a sénior y a profesional», sin cifra), `ANALISIS_FUTBOL.md` (decisión 8: lo que el JSON llama «requisitos de debut» es *cuándo podría el personaje entrar en un sénior o en un club de alto nivel*, y encaja con `ClubDeDeporte.acceso`; los clubes de élite serán los de acceso más exigente, pero **no hay clubes de élite ni nivel mínimo escrito** todavía: F5) y el código (`ESCALA_DE_ENTRENAMIENTO`, `CURVAS_POR_EDAD`, `desarrolloRival`). Lo único cuantitativo que existe es la curva de qué fracción del tope se puede tener por edad (física 0,91 a los 18; mental y social algo menos) y el `sim:vida` del bot perfecto (a los 18: físico 44/56 = 79 % del tope, habilidades 49/59 = 83 %; `DECISIONES.md`, 24/10).

**Criterio que uso (propuesto, con lo que hay):** el **nivel de jugador** (`vp.futbol.valor`, 0–100, el que usan las plazas y los equipos) **a los 17–18 años**, medido como el último año que el niño juega (los que lo dejan o salen del mundo a los 18 cuentan con su último año). Tres listones:

| Listón | Nivel | Qué representa |
|---|---|---|
| Titular de un grande | ≈ 33 | Mediana del A de un club grande a los 17–18 (30,5–34,5 según la versión) |
| **Juvenil de élite** | **≥ 40** | Por encima del percentil 75 de los jugadores del A de los grandes (32–37) y del p90 de todos los futbolistas de 17–18 (36–38); ≈ el 5 % de los que juegan a esa edad |
| **Profesional** | **≥ 45** | Los 1–2 mejores de cada curso; ≈ 0,4–0,7 % de los interesados |

**Aviso de circularidad:** el listón de 45 lo elijo mirando la distribución y la cifra real (§3), así que compararlas **no prueba nada por sí solo**. Las pruebas que no dependen de él son: (a) qué fracción del tope alcanzan, (b) cuánto cambia con los entrenamientos nuevos, (c) la forma de la cabeza (el mejor de cada curso frente a la mediana: 45–52 frente a 24–26). Y queda una decisión de diseño abierta: **la escala absoluta**. Un personaje bien entrenado llega a ≈ 80 % de sus topes a los 18 (≈ nivel 90 con un ajuste lineal tosco: nivel ≈ 126 × fracción de habilidades − 9), así que el mejor PNJ (45–52) queda **a la mitad** de lo que puede hacer el jugador. Es coherente con «el jugador que entrena a diario domina», pero quien decida qué es «profesional» para el personaje debe saber que el listón de los PNJ y el del jugador están en escalas muy distintas.

## 2. Cómo se ha simulado

- **Herramienta nueva, solo lectura:** `tools/analisis-profesionales.ts` (`npx tsx tools/analisis-profesionales.ts <salida.json> [semillas] [años]`) y `tools/analisis-profesionales-informe.ts` (lee los JSON y escribe las tablas de este informe). **No simplifica nada del juego:** crea la partida entera de la ciudad grande con fútbol (`nuevaPartida`, país `PAIS_CIUDAD_GRANDE`, semillas 31, 32, 33 y, con los entrenamientos nuevos, 34) y avanza el mundo **entero** 520 semanas con `advanceToWeek` (≈ 4 min por semilla con los entrenamientos nuevos, ≈ 12 min con 4 procesos a la vez en la versión vieja). El personaje solo descansa (la cohorte son los PNJ).
- **Cohorte:** los PNJ con 8 años al crear la partida (≈ 499 por semilla, no hermanos del personaje; 267 ya juegan en un equipo de benjamín y 271 tienen interés por el fútbol; los que empiezan más tarde entran cuando un equipo los recluta). Se mide cada año, el mismo día (edad 8 a 18).
- **Qué se guarda por niño y año:** nivel (`vp.futbol.valor`), club (tamaño, colegio, letra), capacidades y habilidades como fracción de su tope (`capacidad / topeEfectivo`, `habilidad / tope por habilidad` con los mismos cálculos que el motor: `rutina.ts`), minutos y partidos acumulados (`est` + `estHist`) y talento de partida (tope medio de las capacidades del fútbol). «Capacidades del fútbol» son las que pide el deporte (`PoblacionGuardada.capacidades`); «habilidades» son las ~28 con tope (sin el conocimiento).
- **Antes y después:** «antes» es el commit `7def8e5` (el primer padre de la unión de `claude/entrenamientos`, `16e6532`), sacado a un `git worktree` aparte. «Después» es la rama actual. **Diferencias que no son los entrenamientos:** en la rama actual hay además la unión de `claude/coste-por-accion` y los cambios de `DECISIONES` posteriores; los relevos dicen que no cambian resultados, pero no lo he podido separar.
- **Semillas:** antes 31–33; después 31–34 (las tablas «después» a 4 semillas; las comparaciones entre versiones y con la escala 2 usan las 3 semillas comunes). Hay mucho ruido entre semillas en la cabeza de la distribución (el mejor de un curso va de 42 a 58 con los mismos entrenamientos), así que **una diferencia de un niño arriba o abajo no significa nada**.
- **Lo que no mide:** el sénior/profesional (no existe aún), a los que dejan el fútbol y siguen creciendo (su nivel se queda en lo último que jugaron) ni el efecto del personaje en su equipo.

## 3. Contexto real (fuentes públicas)

No he encontrado una cifra oficial y sólida de «cuántos federados llegan a Primera, Segunda o Primera Federación»; esto es lo que hay, con sus reservas:

| Dato | Cifra | Fuente (año) | Fiabilidad |
|---|---|---|---|
| Jugadores de cantera de un club de primera que llegan a profesionales | **≈ 4 %** | [FFCV, «De niños a hombres» (2017)](https://ffcv.es/wp/blog/2017/12/27/de-ninos-a-hombres) (sin fuente citada) y [Univ. de Essex, estudio de 2024 (IJSSC), 4 % de jóvenes de 13–18 años de academia llegan al máximo nivel](https://www.essex.ac.uk/news/2024/06/27/just-four-per-cent-of-teenage-academy-players-make-it-to-top-tier-football) (muestra de ~200, no es solo España) | Media |
| Jugadores de academia que llegan a la élite, de más pequeños | ≈ 1 % de los sub-9 de las academias de la Premier | Nota de prensa de Essex (2024) citando estudios previos; [Open University](https://www.open.edu/openlearn/health-sports-psychology/euro-2020-will-englands-ruthless-academy-system-show-its-value): «menos del 1 %» de quien pasa por una academia | Media (Inglaterra) |
| Cualquiera que pasa por una academia y llega a jugar un partido como profesional | ≈ 9 % (el 91 % no llega a jugar) | [Sky Sports, «The Route to the Top»](https://www.skysports.com/football/story-telling/11095/13257286/chasing-the-dream-trent-alexander-arnold-and-kyle-walker-discuss-the-embarrassing-problem-in-academy-football) | Baja (periodística, Inglaterra) |
| Federados en España y profesionales | **≈ 936.000 registrados, ≈ 3.500 profesionales (≈ 0,4 %)**, ≈ 15.000 semiprofesionales | [52spain (cita a la RFEF, año sin precisar)](https://www.52spain.com/d/43516-analisis-de-la-poblacion-del-futbol-en-espana-una-vision-completa-desde-las-ligas-profesionales-hasta-los-entusiastas-amateur) | **Baja** (secundaria, sin año); el 29,2 % de los federados españoles son de fútbol ([Ministerio / Statista, 2023](https://es.statista.com/estadisticas/480006/futbol-porcentaje-de-licencias-sobre-el-total-de-federados-espana)) |
| Canteras de LaLiga | 16,3 % de los minutos de LaLiga los juegan canteranos (3 temporadas o más en el club de los 15 a los 21) | CIES Football Observatory, vía [LaLiga](https://www.laliga.com/en-US/news/laliga-clubs-lead-the-way-in-player-training) | Alta, pero mide minutos, no personas |

La RFEF publica los totales por categoría en su memoria de licencias ([LICENCIAS 2324](https://rfef.es/sites/default/files/2024-11/LICENCIAS_2324.pdf)) pero no he podido leer el total nacional por categoría.

**Escalado a nuestra ciudad grande** (≈ 250 niños interesados por año de nacimiento; la cohorte medida tiene 271):

| Base | Tasa | Profesionales por curso |
|---|---|---|
| Todos los interesados (tasa de los registrados, 3.500 / 936.000) | 0,4 % | **≈ 1,0** |
| Los que pasan por un grande (≈ 17 jugadores de la cohorte están en un club grande a los 17–18) × 4 % | 4 % | **≈ 0,7** (con el 1 % de la Premier: 0,2) |
| Rango razonable | | **≈ 0,2–1** |

**Lo que sale en la simulación** (§4): 1,0 (antes) y 1,0–2,0 (ahora) por curso con el listón de 45; 3,0–3,7 con el de 40 (juvenil de élite, que en la vida real incluye a muchos que no llegan a Primera). **Es del mismo orden y ligeramente alto**; con tan poca muestra (3–4 cursos) y un listón elegido a ojo no permite decir más que «no hay una inflación».

## 4. Resultados

### 4.1 Antes y después, con las semillas comunes (31–33), a los 17–18 años

| | Antes | Después (entrenamientos nuevos) | Después con escala ×2 (prueba) |
|---|---|---|---|
| Juegan a los 17–18 (de 271 interesados) | 69 | 68 | 71 |
| Nivel medio a los 17 (año 9) | 28,5 | 27,0 | 30,6 |
| Nivel p90 a los 17 | 41,5 | 39,2 | 41,5 |
| **Capacidades del fútbol, % del tope** (a los 18) | 41,9 | 41,4 | 42,1 |
| **Habilidades, % del tope** (a los 18, los que siguen) | 24,7 | 29,1 | 36,0 |
| Los 10 mejores de cada semilla: nivel medio | 39,8 | 39,6 | 42,9 |
| Los 10 mejores: habilidades % del tope | 25,1 | 33,8 | 43,7 |
| Los 10 mejores: habilidad más alta, % de su tope | 50 | 55 | 67 |
| **Niños ≥ 90 / 95 / 100 % del tope** (media de capacidades o de habilidades) | **0 / 0 / 0** | **0 / 0 / 0** | **0 / 0 / 0** |
| Capacidades (de 18) o habilidades (de ~28) a ≥ 95 % por niño | 0,00 | 0,00 | 0,00 |
| Niños con nivel ≥ 40 por curso | 3,7 | 2,0 | 9,7 |
| Niños con nivel ≥ 45 por curso | 1,0 | 1,0 | 2,0 |
| Niños con nivel ≥ 50 por curso | 0,3 | 0,7 | 0 |
| Niños con nivel ≥ 55 / 60 por curso | 0 / 0 | 0,7 / 0 | 0 / 0 |

(Con las 4 semillas «después»: ≥ 40: 3,0; ≥ 45: 2,0; ≥ 50: 0,8; ≥ 55: 0,8; habilidades 29,1 %; mejores 33,5 %. La semilla 34 trae al mejor y al tercero de los cuatro cursos con 57 y 47: ruido, no efecto.)

Lectura:
- **La escala de entrenamiento mueve las habilidades (+4 puntos a +11 con ×2) pero apenas el nivel**, porque lo frena el tope por edad: con ×2 la cabeza no sube, **se aplana** (los 10 mejores de cada semilla quedan en 38–48 frente a 34–58) y entran muchos más en la franja 40–46 (2,0–3,7 → 9,7 por curso). Es lo que dice el relevo: «lo frena el tope por edad».
- **Las capacidades no cambian en ninguna versión (41–42 %)**: dependen del desarrollo natural (45 % del tope máximo por edad) y los entrenamientos de fútbol apenas las tocan para los PNJ.
- **Nadie llega a sus topes** (máximos de cualquier niño y edad: media de habilidades 37 % antes, 48 % ahora, 57 % con ×2; media de capacidades 46 / 47 / 52 %). La mejor capacidad de los mejores llega al 59–60 % y la mejor habilidad al 50–67 %.** El 95 % que alcanza «el bot perfecto» (6 de 27 capacidades al 95 %) no se ve en los PNJ porque entrenan solo 2 sesiones de club por semana.

### 4.2 Año a año (4 semillas «después»)

| año | edad | juegan | nivel medio | p90 | máx | capacidades % tope | habilidades % tope | mejor / 3.º / 10.º |
|---|---|---|---|---|---|---|---|---|
| 0 | 8 | 268 | 11,6 | 13,8 | 17,1 | 20,9 | 17,9 | 16,6 / 15,8 / 14,6 |
| 2 | 10 | 222 | 15,4 | 19,7 | 31,3 | 23,8 | 20,0 | 28,4 / 26,2 / 22,3 |
| 4 | 12 | 191 | 18,5 | 25,1 | 42,6 | 27,8 | 21,9 | 37,6 / 32,3 / 28,1 |
| 6 | 14 | 153 | 22,2 | 32,3 | 44,4 | 32,8 | 24,2 | 42,0 / 38,8 / 34,0 |
| 8 | 16 | 99 | 27,4 | 38,5 | 52,5 | 37,9 | 26,7 | 48,9 / 44,2 / 38,9 |
| 9 | 17 | 72 | 27,0 | 39,2 | 57,7 | 39,8 | 28,1 | 52,5 / 45,7 / 37,1 |
| 10 | 18 | 48 | 25,3 | 36,1 | 46,6 | 41,4 | 29,1 | 45,9 / 40,2 / 32,7 |

(Las tablas completas de las dos versiones, año a año y por club, están en el anexo de abajo; las cifras de las filas 0–10 salen de ahí. La caída del nivel entre los 17 y los 18 es el embudo de §5, no un fallo del entrenamiento.)

### 4.3 Cómo influyen el club, los minutos y el talento (a los 17–18)

| | Antes (3 semillas) | Después (4 semillas) |
|---|---|---|
| **Club en el que están** | | |
| grande | nivel 30,5 · hab. 30,0 % · ≥ 40: 1,9 % | **nivel 34,2 · hab. 38,5 %** · ≥ 40: 10,2 % |
| mediano | 26,7 · 23,0 % · ≥ 40: 9,3 % | 24,6 · 27,3 % · ≥ 40: 3,5 % |
| pequeño | 21,7 · 21,6 % · 0 % | 23,7 · 25,1 % · 1,2 % |
| colegio | 22,1 · 22,2 % · 0 % | (ninguno llega a esa edad) |
| **Minutos acumulados** | cuartil 1: 5.490 min (98 partidos) … cuartil 4: 10.890 (140) | cuartil 1: 4.910 (98) … cuartil 4: 11.110 (136): sin relación con el nivel (correlación 0,07 antes, 0,08 ahora) |
| **Talento** (tope medio de las capacidades del fútbol) | correlación con el nivel: 0,25 (potencial 0,20) | 0,29 (potencial 0,19) |

- **El club importa y los entrenamientos nuevos lo amplían:** la distancia entre un grande y un mediano en fracción de habilidades pasa de 7 a 11 puntos y el nivel medio del grande se lleva casi 10 puntos al mediano. Con los entrenamientos nuevos los clubes grandes acaban con **el 10 % por encima del listón de 40** y los demás con el 1–4 %; **antes la cabeza estaba en los medianos** (9,3 % frente al 1,9 % del grande), así que la diferencia en la cabeza no es estable entre versiones y semillas (pocos niños); la de la media sí. Es lo esperable (mejor entrenador, más sesiones, mejor selección) y es lo que pide `CIUDAD_Y_LIGAS.md` («llegar al A de un grande exige ser bueno de verdad»). Pero ver §5: los grandes retienen, los pequeños no.
- **Los minutos no influyen** (todos hacen ~8.000 min y ~120 partidos; no pesan en la subida: el entrenamiento es de club, no de partido). Coherente con el diseño, pero conviene saberlo si se quiere que «jugar más» importe.
- **El talento pesa poco** (correlación 0,25–0,29): un niño con mucho tope y uno con poco acaban a 4–5 puntos de nivel de distancia (cuartil alto frente al bajo: 27,8 frente a 23,7 antes; 29,6 frente a 24,4 ahora). El que llega arriba es el que suma talento, club grande y buen ritmo. Si «los topes importan» es un principio (`VISION.md`), la cabeza está bastante comprimida.

## 5. Lo que no es el balance: el embudo

| | Antes | Después |
|---|---|---|
| Interesados que juegan a los 8 / 14 / 16 / 17–18 años | 267 / 152 / 96 / 69 | 268 / 153 / 99 / 72 |
| Siguen jugando a los 18 (año 10) | 49 (18 %) | 48 (17,7 %) |
| De los 10 mejores de cada semilla a los 14, siguen jugando a los 18 | 10 de 30 | 10 de 40 |
| De los que juegan a los 17, dejan el fútbol antes de los 18 | 50 de 207 (24 %) | 78 de 288 (27 %) |
| De los que juegan a los 17, desaparecen del mundo a los 18 (archivados) | 11 (nivel medio 28, máx. 42) | 17 (nivel medio 28, máx. 58) |

- Es una pérdida enorme y **no depende del entrenamiento nuevo** (idéntica antes y después): se debe al abandono por edad y al tope de equipos de las categorías de mayores (`DECISIONES.md` 05/11: «No se sube el tope de equipos en juvenil»; «desde cadete más niños lo dejan»). **Pierde a los mejores:** de cada 10 mejores a los 14 años, 2,5–3 llegan a los 18 jugando.
- A los 17 se llega con 68–72 jugadores por curso en la ciudad; **a esa edad todos los que superan el listón 40 son de un club grande o mediano**.
- Es posible que sea lo que se quiere (la mayoría abandona de verdad: un estudio de academias dice que ≈ 90 % no llega a jugar profesional), pero **con 18 años de nivel 45 como mucho, el cuello de botella para que haya profesionales no es el nivel sino que se quedan pocos**. Un personaje que llegue a la cabeza lo hará por mérito propio, no porque la población lo permita.

## 6. Propuesta

1. **No cambiar nada de lo medido.** Con el criterio propuesto (§1) salen 1–2 profesionales por curso (≈ 0,7–1 en la vida real), nadie llega al 90 % de sus topes y la subida por los entrenamientos nuevos (+4 puntos de habilidades, nivel sin cambio apreciable) cabe en el ruido. **`ESCALA_DE_ENTRENAMIENTO` se queda en 1.** Margen: con 2, «de élite» se multiplica por ~3–5 (9,7 por curso frente a 2,0–3,7) pero nadie pasa de 50 y nadie se acerca al tope.
2. **Si más adelante hay «demasiados»** (por ejemplo al subir la escala para que el club rinda más al personaje): el primer remedio no es bajar la escala general sino **separar la del PNJ de la del personaje** (una constante más; no tocar el club del personaje), y el segundo, **rendimientos decrecientes cerca del tope por habilidad** (hoy ya los frena el tope por edad: con ×2 la cabeza se aplana en 41–48 y no pasa de ahí). No hace falta tocar `CURVAS_POR_EDAD` ni los topes. Coste/efecto: sin medir (no se ha aplicado ninguno; solo se ha medido la escala ×2, arriba).
3. **Decisiones abiertas que sí necesito de la arquitectura** (no son un fallo del balance):
   - **Qué es «profesional» a los 18 para el personaje:** hoy un jugador bien entrenado llega a ≈ 80 % de sus topes y el mejor PNJ a ≈ 40–50 % (nivel 45–52). O el listón del personaje es mucho mayor que el de los PNJ, o hay que decir cuál de los dos manda.
   - **El embudo (§5):** quedan 17 % de los interesados a los 18 y 1 de cada 3–4 de los mejores a los 14. Si se quiere que existan los profesionales de verdad, hay que decidir cuántos equipos de mayores hay (juvenil, sénior) y si los mejores pasan a sénior en vez de «archivarse» (CIUDAD_Y_LIGAS §11, pendiente).
   - **Los minutos no pesan** y **el talento pesa poco** (§4.3): si se quiere que importen, es otra decisión de diseño.
4. **Herramientas** (de solo lectura): `tools/analisis-profesionales.ts` y `tools/analisis-profesionales-informe.ts`. No se han añadido a `package.json` ni a la lista de comandos de `CLAUDE.md` (se pueden añadir si se quieren como `npm run`).

## Anexo: tablas completas

(Generadas con `npx tsx tools/analisis-profesionales-informe.ts antes=… despues=… --umbral=40`; antes: semillas 31–33; después: 31–34. «Umbral 40» es el de élite; el comentario con el umbral de la primera línea no se usa. «Año 10» = 18 años; las filas del año 10 del cuadro de «niveles» cuentan solo a quien sigue en el mundo y jugando; el bloque «A los 18 años» usa el último año jugando.)

<!-- umbral usado: 40 (mediana de 51 titulares del A de clubes grandes a 17–18 años, versión «antes») -->

## Versión «antes» (3 semillas, cohorte de 8 años al crear, hasta el año 10)

### Año a año: nivel (valor de jugador) de la cohorte que juega al fútbol

| año | edad | cohorte | juegan | nivel medio | p10 | p50 | p90 | máx | % ≥ umbral 40 | % ≥ 60 | % ≥ 70 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 8 | 499 | 267 | 11.5 | 9.4 | 11.5 | 13.7 | 16.8 | 0.0 % | 0.0 % | 0.0 % |
| 1 | 9 | 499 | 243 | 13.8 | 11.2 | 13.2 | 17.2 | 26.8 | 0.0 % | 0.0 % | 0.0 % |
| 2 | 10 | 499 | 220 | 15.3 | 12.4 | 14.4 | 19.5 | 31.3 | 0.0 % | 0.0 % | 0.0 % |
| 3 | 11 | 499 | 203 | 16.9 | 13.3 | 15.7 | 23.2 | 32.9 | 0.0 % | 0.0 % | 0.0 % |
| 4 | 12 | 499 | 186 | 18.9 | 14.5 | 17.3 | 25.1 | 42.6 | 0.2 % | 0.0 % | 0.0 % |
| 5 | 13 | 499 | 170 | 20.1 | 15.3 | 18.3 | 28.6 | 39.8 | 0.0 % | 0.0 % | 0.0 % |
| 6 | 14 | 499 | 152 | 22.6 | 16.4 | 20.1 | 32.2 | 50.0 | 2.6 % | 0.0 % | 0.0 % |
| 7 | 15 | 499 | 124 | 24.6 | 17.4 | 21.5 | 37.1 | 49.6 | 5.1 % | 0.0 % | 0.0 % |
| 8 | 16 | 499 | 96 | 26.8 | 18.8 | 24.4 | 38.4 | 49.4 | 7.3 % | 0.0 % | 0.0 % |
| 9 | 17 | 485 | 69 | 28.5 | 19.9 | 26.4 | 41.5 | 51.9 | 13.5 % | 0.0 % | 0.0 % |
| 10 | 18 | 452 | 49 | 26.1 | 19.8 | 24.1 | 35.9 | 45.0 | 4.1 % | 0.0 % | 0.0 % |

(cohorte y juegan: por semilla, media.)

### Año a año: fracción del tope que alcanzan (los que juegan)

| año | capacidades del fútbol: media | habilidades: media | niños con media de capacidades ≥ 90 % | ≥ 95 % | ≥ 100 % | capacidades (de 18) a ≥ 95 % por niño | habilidades (de ~28) a ≥ 95 % por niño | habilidades ≥ 100 % por niño |
|---|---|---|---|---|---|---|---|---|
| 0 | 20.7 % | 17.3 % | 0.0 % | 0.0 % | 0.0 % | 0.00 | 0.00 | 0.00 |
| 1 | 22.0 % | 18.0 % | 0.0 % | 0.0 % | 0.0 % | 0.00 | 0.00 | 0.00 |
| 2 | 23.5 % | 18.7 % | 0.0 % | 0.0 % | 0.0 % | 0.00 | 0.00 | 0.00 |
| 3 | 25.4 % | 19.2 % | 0.0 % | 0.0 % | 0.0 % | 0.00 | 0.00 | 0.00 |
| 4 | 27.8 % | 19.8 % | 0.0 % | 0.0 % | 0.0 % | 0.00 | 0.00 | 0.00 |
| 5 | 30.3 % | 20.5 % | 0.0 % | 0.0 % | 0.0 % | 0.00 | 0.00 | 0.00 |
| 6 | 33.1 % | 21.3 % | 0.0 % | 0.0 % | 0.0 % | 0.00 | 0.00 | 0.00 |
| 7 | 35.9 % | 22.0 % | 0.0 % | 0.0 % | 0.0 % | 0.00 | 0.00 | 0.00 |
| 8 | 38.4 % | 23.0 % | 0.0 % | 0.0 % | 0.0 % | 0.00 | 0.00 | 0.00 |
| 9 | 40.3 % | 23.9 % | 0.0 % | 0.0 % | 0.0 % | 0.00 | 0.00 | 0.00 |
| 10 | 41.9 % | 24.7 % | 0.0 % | 0.0 % | 0.0 % | 0.00 | 0.00 | 0.00 |

### Los mejores de la cohorte (por semilla, media de los 1.º, 3.º y 10.º de cada año) y quién se queda

| año | edad | 1.º | 3.º | 10.º | juegan (de los interesados) |
|---|---|---|---|---|---|
| 0 | 8 | 16.2 | 15.4 | 14.3 | 267 (98.3 %) |
| 1 | 9 | 25.5 | 23.5 | 20.5 | 243 (89.4 %) |
| 2 | 10 | 28.6 | 25.7 | 22.6 | 220 (81.2 %) |
| 3 | 11 | 32.1 | 30.1 | 25.6 | 203 (74.8 %) |
| 4 | 12 | 37.9 | 33.3 | 28.5 | 186 (68.4 %) |
| 5 | 13 | 37.2 | 34.6 | 30.5 | 170 (62.5 %) |
| 6 | 14 | 46.0 | 39.9 | 35.5 | 152 (56.1 %) |
| 7 | 15 | 47.0 | 43.4 | 38.3 | 124 (45.8 %) |
| 8 | 16 | 47.7 | 44.7 | 38.1 | 96 (35.5 %) |
| 9 | 17 | 50.9 | 45.5 | 40.1 | 69 (25.4 %) |
| 10 | 18 | 44.5 | 38.3 | 31.6 | 49 (18.1 %) |

De los 10 mejores de cada semilla a los 14 años (30), siguen jugando a los 18: 10.

### A los 18 años (año 10)

- Cohorte por semilla: 499; con interés por el fútbol: 271; juegan a los 17–18 (último año jugando): 69; jugaban al crear la partida: 267.
- Superan el umbral de profesional (40) por semilla: 31: 3, 32: 5, 33: 3.
- Los 10 mejores niveles de cada semilla (ordenados): 31: 44/42/40/40/37/37/36/36/36/36 · 32: 52/45/44/44/43/39/39/36/34/33 · 33: 50/45/44/40/39/37/37/37/35/34

**Sensibilidad del umbral (a los 18 años):**

| umbral | 40 | 45 | 50 | 55 | 60 | 65 | 70 | 75 | 80 |
|---|---|---|---|---|---|---|---|---|---|
| niños por semilla | 3.7 | 1.0 | 0.3 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| % de los interesados | 1.4 % | 0.4 % | 0.1 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % |
- Los 10 mejores de cada semilla (30): nivel medio 39.8; capacidades del fútbol al 41.2 % de su tope; habilidades al 25.1 %; la capacidad más alta al 59 % y la habilidad más alta al 50 %.

**Referencia: niveles de los jugadores del A de clubes grandes en el año 10 (todas las semillas; el nivel de la plantilla del A de un grande, no solo titulares):**

| edad | n | p25 | p50 | p75 | máx |
|---|---|---|---|---|---|
| 14 | 24 | 24.6 | 27.3 | 29.1 | 41.8 |
| 15 | 26 | 25.5 | 27.1 | 29.2 | 51.9 |
| 16 | 16 | 29.9 | 32.5 | 33.3 | 33.5 |
| 17 | 30 | 28.3 | 30.5 | 32.4 | 37.1 |
| 18 | 21 | 30.0 | 33.1 | 35.4 | 38.6 |

**Todos los futbolistas del mundo por edad en el año 10 (media / p90 / máx):**

| edad | n | media | p90 | máx |
|---|---|---|---|---|
| 14 | 155 | 22.4 | 32.6 | 46.8 |
| 16 | 93 | 26.3 | 37.0 | 51.8 |
| 17 | 80 | 25.6 | 37.0 | 53.3 |
| 18 | 48 | 26.1 | 35.9 | 45.0 |
| 19 | 29 | 25.9 | 34.0 | 37.8 |

### Por el club y los minutos (a los 18 años)

**Club en el que están a esa edad**

| grupo | n/semilla | nivel medio | p90 | % ≥ umbral 40 | cap. fútbol % del tope | habilidades % del tope | minutos acumulados | partidos |
|---|---|---|---|---|---|---|---|---|
| colegio | 2.0 | 22.1 | 24.3 | 0.0 % | 41.3 | 22.2 | 8553 | 113 |
| grande | 17.3 | 30.5 | 36.2 | 1.9 % | 42.6 | 30.0 | 8739 | 127 |
| mediano | 35.7 | 26.7 | 40.0 | 9.3 % | 41.4 | 23.0 | 7954 | 119 |
| pequeno | 14.3 | 21.7 | 24.5 | 0.0 % | 40.4 | 21.6 | 7766 | 120 |

**Club de origen (al crear la partida, a los 8 años; «ninguno»: empezaron más tarde)**

| grupo | n/semilla | nivel medio | p90 | % ≥ umbral 40 | cap. fútbol % del tope | habilidades % del tope | minutos acumulados | partidos |
|---|---|---|---|---|---|---|---|---|
| colegio | 17.7 | 25.3 | 32.5 | 3.8 % | 41.1 | 23.9 | 8133 | 118 |
| grande | 3.7 | 31.3 | 38.6 | 9.1 % | 42.1 | 27.7 | 8823 | 127 |
| mediano | 19.0 | 26.6 | 36.2 | 1.8 % | 42.1 | 25.3 | 8497 | 126 |
| ninguno | 1.0 | 23.1 | 24.6 | 0.0 % | 41.5 | 21.7 | 6615 | 107 |
| pequeno | 28.0 | 26.6 | 40.0 | 8.3 % | 41.2 | 23.8 | 7839 | 119 |

**Equipo (letra) a esa edad**

| grupo | n/semilla | nivel medio | p90 | % ≥ umbral 40 | cap. fútbol % del tope | habilidades % del tope | minutos acumulados | partidos |
|---|---|---|---|---|---|---|---|---|
| A | 52.0 | 25.8 | 35.4 | 3.2 % | 41.4 | 24.4 | 8139 | 122 |
| C | 17.3 | 28.6 | 40.4 | 11.5 % | 41.7 | 24.7 | 8097 | 119 |

**Minutos jugados en toda la carrera (cuartiles)**

| grupo | n/semilla | nivel medio | p90 | % ≥ umbral 40 | cap. fútbol % del tope | habilidades % del tope | minutos acumulados | partidos |
|---|---|---|---|---|---|---|---|---|
| 1 (menos minutos) | 17.7 | 25.3 | 36.3 | 5.7 % | 40.9 | 23.6 | 5487 | 98 |
| 2 | 17.7 | 28.1 | 40.0 | 9.4 % | 41.2 | 24.5 | 7441 | 120 |
| 3 | 17.0 | 25.0 | 34.9 | 0.0 % | 41.5 | 24.2 | 8825 | 128 |
| 4 (más minutos) | 17.0 | 27.5 | 35.9 | 5.9 % | 42.3 | 25.5 | 10894 | 140 |

**Talento de partida (tope medio de las capacidades del fútbol, cuartiles)**

| grupo | n/semilla | nivel medio | p90 | % ≥ umbral 40 | cap. fútbol % del tope | habilidades % del tope | minutos acumulados | partidos |
|---|---|---|---|---|---|---|---|---|
| 1 (menos talento) | 17.7 | 23.7 | 32.3 | 1.9 % | 41.4 | 24.2 | 7595 | 113 |
| 2 | 17.3 | 26.7 | 36.3 | 3.8 % | 41.2 | 24.2 | 7918 | 122 |
| 3 | 17.3 | 27.7 | 37.0 | 7.7 % | 41.6 | 24.6 | 8300 | 124 |
| 4 (más talento) | 17.0 | 27.8 | 35.4 | 7.8 % | 41.7 | 24.8 | 8725 | 124 |

Correlación del nivel final con: tope físico de partida 0.25; minutos jugados 0.07; potencial 0.20.

Los 11 (de 208, todas las semillas) que superan el umbral: club mediano 10, grande 1; tope físico medio 65.6 (cohorte 62.8); minutos medios 7613 (cohorte 8129).

## Versión «despues» (4 semillas, cohorte de 8 años al crear, hasta el año 10)

### Año a año: nivel (valor de jugador) de la cohorte que juega al fútbol

| año | edad | cohorte | juegan | nivel medio | p10 | p50 | p90 | máx | % ≥ umbral 40 | % ≥ 60 | % ≥ 70 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 8 | 502 | 268 | 11.6 | 9.4 | 11.6 | 13.8 | 17.1 | 0.0 % | 0.0 % | 0.0 % |
| 1 | 9 | 502 | 240 | 13.9 | 11.2 | 13.3 | 17.7 | 26.9 | 0.0 % | 0.0 % | 0.0 % |
| 2 | 10 | 502 | 222 | 15.3 | 12.3 | 14.5 | 19.8 | 31.3 | 0.0 % | 0.0 % | 0.0 % |
| 3 | 11 | 502 | 207 | 16.5 | 13.0 | 15.4 | 21.5 | 32.9 | 0.0 % | 0.0 % | 0.0 % |
| 4 | 12 | 502 | 191 | 18.4 | 13.9 | 16.9 | 25.1 | 42.6 | 0.1 % | 0.0 % | 0.0 % |
| 5 | 13 | 502 | 173 | 20.0 | 14.9 | 17.9 | 28.6 | 42.4 | 0.3 % | 0.0 % | 0.0 % |
| 6 | 14 | 502 | 153 | 22.5 | 15.8 | 19.9 | 32.4 | 44.4 | 1.0 % | 0.0 % | 0.0 % |
| 7 | 15 | 502 | 125 | 24.6 | 16.6 | 21.0 | 36.6 | 49.6 | 4.6 % | 0.0 % | 0.0 % |
| 8 | 16 | 502 | 99 | 27.7 | 18.3 | 27.3 | 38.7 | 52.5 | 7.6 % | 0.0 % | 0.0 % |
| 9 | 17 | 489 | 72 | 27.1 | 18.8 | 23.3 | 39.2 | 57.7 | 8.7 % | 0.0 % | 0.0 % |
| 10 | 18 | 454 | 48 | 26.2 | 19.5 | 23.1 | 37.6 | 57.0 | 4.1 % | 0.0 % | 0.0 % |

(cohorte y juegan: por semilla, media.)

### Año a año: fracción del tope que alcanzan (los que juegan)

| año | capacidades del fútbol: media | habilidades: media | niños con media de capacidades ≥ 90 % | ≥ 95 % | ≥ 100 % | capacidades (de 18) a ≥ 95 % por niño | habilidades (de ~28) a ≥ 95 % por niño | habilidades ≥ 100 % por niño |
|---|---|---|---|---|---|---|---|---|
| 0 | 20.9 % | 17.9 % | 0.0 % | 0.0 % | 0.0 % | 0.00 | 0.00 | 0.00 |
| 1 | 22.4 % | 19.1 % | 0.0 % | 0.0 % | 0.0 % | 0.00 | 0.00 | 0.00 |
| 2 | 23.8 % | 20.1 % | 0.0 % | 0.0 % | 0.0 % | 0.00 | 0.00 | 0.00 |
| 3 | 25.6 % | 20.9 % | 0.0 % | 0.0 % | 0.0 % | 0.00 | 0.00 | 0.00 |
| 4 | 27.8 % | 21.9 % | 0.0 % | 0.0 % | 0.0 % | 0.00 | 0.00 | 0.00 |
| 5 | 30.2 % | 23.0 % | 0.0 % | 0.0 % | 0.0 % | 0.00 | 0.00 | 0.00 |
| 6 | 32.8 % | 24.2 % | 0.0 % | 0.0 % | 0.0 % | 0.00 | 0.00 | 0.00 |
| 7 | 35.5 % | 25.5 % | 0.0 % | 0.0 % | 0.0 % | 0.00 | 0.00 | 0.00 |
| 8 | 37.9 % | 26.7 % | 0.0 % | 0.0 % | 0.0 % | 0.00 | 0.00 | 0.00 |
| 9 | 39.8 % | 28.3 % | 0.0 % | 0.0 % | 0.0 % | 0.00 | 0.00 | 0.00 |
| 10 | 41.5 % | 29.4 % | 0.0 % | 0.0 % | 0.0 % | 0.00 | 0.00 | 0.00 |

### Los mejores de la cohorte (por semilla, media de los 1.º, 3.º y 10.º de cada año) y quién se queda

| año | edad | 1.º | 3.º | 10.º | juegan (de los interesados) |
|---|---|---|---|---|---|
| 0 | 8 | 16.6 | 15.8 | 14.6 | 268 (98.3 %) |
| 1 | 9 | 25.6 | 23.0 | 20.4 | 240 (88.0 %) |
| 2 | 10 | 28.4 | 26.2 | 22.3 | 222 (81.6 %) |
| 3 | 11 | 31.8 | 29.1 | 24.9 | 207 (75.9 %) |
| 4 | 12 | 37.6 | 32.3 | 28.1 | 191 (70.2 %) |
| 5 | 13 | 39.3 | 35.4 | 31.3 | 173 (63.4 %) |
| 6 | 14 | 42.0 | 38.8 | 34.0 | 153 (56.0 %) |
| 7 | 15 | 47.0 | 43.0 | 37.4 | 125 (45.8 %) |
| 8 | 16 | 48.9 | 44.2 | 38.9 | 99 (36.2 %) |
| 9 | 17 | 52.5 | 45.7 | 37.1 | 72 (26.4 %) |
| 10 | 18 | 45.9 | 40.2 | 32.7 | 48 (17.7 %) |

De los 10 mejores de cada semilla a los 14 años (40), siguen jugando a los 18: 10.

### A los 18 años (año 10)

- Cohorte por semilla: 502; con interés por el fútbol: 273; juegan a los 17–18 (último año jugando): 72; jugaban al crear la partida: 268.
- Superan el umbral de profesional (40) por semilla: 31: 2, 32: 1, 33: 3, 34: 6.
- Los 10 mejores niveles de cada semilla (ordenados): 31: 43/42/40/39/37/37/37/37/36/36 · 32: 47/40/39/39/38/38/37/36/35/35 · 33: 58/57/44/39/38/38/38/37/37/34 · 34: 57/48/47/47/45/42/39/39/38/38

**Sensibilidad del umbral (a los 18 años):**

| umbral | 40 | 45 | 50 | 55 | 60 | 65 | 70 | 75 | 80 |
|---|---|---|---|---|---|---|---|---|---|
| niños por semilla | 3.0 | 2.0 | 0.8 | 0.8 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| % de los interesados | 1.1 % | 0.7 % | 0.3 % | 0.3 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % |
- Los 10 mejores de cada semilla (40): nivel medio 40.7; capacidades del fútbol al 41.5 % de su tope; habilidades al 33.5 %; la capacidad más alta al 58 % y la habilidad más alta al 56 %.

**Referencia: niveles de los jugadores del A de clubes grandes en el año 10 (todas las semillas; el nivel de la plantilla del A de un grande, no solo titulares):**

| edad | n | p25 | p50 | p75 | máx |
|---|---|---|---|---|---|
| 14 | 26 | 27.3 | 29.0 | 32.5 | 42.1 |
| 15 | 44 | 25.1 | 29.5 | 33.8 | 44.7 |
| 16 | 25 | 31.6 | 34.2 | 35.1 | 41.0 |
| 17 | 20 | 29.3 | 33.5 | 36.2 | 43.5 |
| 18 | 29 | 32.8 | 34.5 | 37.5 | 46.6 |

**Todos los futbolistas del mundo por edad en el año 10 (media / p90 / máx):**

| edad | n | media | p90 | máx |
|---|---|---|---|---|
| 14 | 150 | 22.4 | 33.6 | 43.6 |
| 16 | 93 | 27.6 | 39.5 | 53.5 |
| 17 | 75 | 25.6 | 37.7 | 55.2 |
| 18 | 48 | 26.3 | 37.6 | 57.0 |
| 19 | 26 | 25.3 | 34.1 | 42.9 |

### Por el club y los minutos (a los 18 años)

**Club en el que están a esa edad**

| grupo | n/semilla | nivel medio | p90 | % ≥ umbral 40 | cap. fútbol % del tope | habilidades % del tope | minutos acumulados | partidos |
|---|---|---|---|---|---|---|---|---|
| grande | 14.8 | 34.2 | 41.9 | 10.2 % | 42.1 | 38.5 | 8512 | 125 |
| mediano | 36.0 | 24.6 | 34.2 | 3.5 % | 40.7 | 27.3 | 8147 | 120 |
| pequeno | 21.3 | 23.7 | 34.5 | 1.2 % | 40.4 | 25.1 | 7596 | 113 |

**Club de origen (al crear la partida, a los 8 años; «ninguno»: empezaron más tarde)**

| grupo | n/semilla | nivel medio | p90 | % ≥ umbral 40 | cap. fútbol % del tope | habilidades % del tope | minutos acumulados | partidos |
|---|---|---|---|---|---|---|---|---|
| colegio | 20.0 | 26.1 | 38.1 | 5.0 % | 40.6 | 28.7 | 8232 | 120 |
| grande | 4.3 | 30.1 | 39.1 | 0.0 % | 41.8 | 33.2 | 8026 | 119 |
| mediano | 16.8 | 27.4 | 37.8 | 6.0 % | 41.4 | 30.1 | 8066 | 119 |
| ninguno | 1.3 | 23.5 | 33.1 | 0.0 % | 41.1 | 27.9 | 5610 | 81 |
| pequeno | 29.8 | 25.4 | 37.4 | 3.4 % | 40.7 | 27.9 | 8046 | 120 |

**Equipo (letra) a esa edad**

| grupo | n/semilla | nivel medio | p90 | % ≥ umbral 40 | cap. fútbol % del tope | habilidades % del tope | minutos acumulados | partidos |
|---|---|---|---|---|---|---|---|---|
| A | 56.0 | 25.9 | 36.7 | 2.2 % | 40.9 | 29.0 | 8101 | 120 |
| C | 16.0 | 27.7 | 42.3 | 10.9 % | 40.9 | 28.7 | 7910 | 115 |

**Minutos jugados en toda la carrera (cuartiles)**

| grupo | n/semilla | nivel medio | p90 | % ≥ umbral 40 | cap. fútbol % del tope | habilidades % del tope | minutos acumulados | partidos |
|---|---|---|---|---|---|---|---|---|
| 1 (menos minutos) | 18.3 | 24.8 | 35.2 | 1.4 % | 40.3 | 27.7 | 4911 | 98 |
| 2 | 18.0 | 25.8 | 38.2 | 4.2 % | 40.5 | 27.1 | 7175 | 115 |
| 3 | 18.0 | 28.3 | 38.1 | 5.6 % | 41.2 | 31.4 | 9124 | 127 |
| 4 (más minutos) | 17.8 | 26.3 | 34.5 | 5.6 % | 41.6 | 29.7 | 11112 | 136 |

**Talento de partida (tope medio de las capacidades del fútbol, cuartiles)**

| grupo | n/semilla | nivel medio | p90 | % ≥ umbral 40 | cap. fútbol % del tope | habilidades % del tope | minutos acumulados | partidos |
|---|---|---|---|---|---|---|---|---|
| 1 (menos talento) | 18.3 | 24.4 | 34.2 | 1.4 % | 40.7 | 27.5 | 7258 | 109 |
| 2 | 18.0 | 26.3 | 37.3 | 2.8 % | 40.9 | 29.8 | 7749 | 117 |
| 3 | 18.0 | 24.9 | 34.9 | 2.8 % | 41.0 | 28.5 | 8103 | 121 |
| 4 (más talento) | 17.8 | 29.6 | 39.3 | 9.9 % | 41.0 | 30.1 | 9152 | 129 |

Correlación del nivel final con: tope físico de partida 0.29; minutos jugados 0.08; potencial 0.19.

Los 12 (de 288, todas las semillas) que superan el umbral: club mediano 5, grande 6, pequeno 1; tope físico medio 67.6 (cohorte 63.0); minutos medios 8916 (cohorte 8059).
