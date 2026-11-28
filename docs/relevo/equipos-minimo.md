# Equipos por debajo del mínimo de la liga: diagnóstico y propuesta (paso 1, 24/11/2026)

Rama `claude/equipos-minimo` (sale de `claude/youthful-clarke-vs0kye`). **No se ha cambiado el juego**: solo la herramienta de medida `tools/equipos-minimo.ts` (`npm run equipos-minimo -- <grande|actual> <con|sin> <semillas, p. ej. 1-10>`) y este informe.

## Respuesta corta

1. **No es un caso raro de los hogares: es un fallo del reparto en equipos de siempre.** Todos los sitios que deciden «¿cuántos equipos tiene este club en esta categoría?» cuentan **el total de niños del club** (`total ≥ 14 × equipos`), pero el reparto en A/B/C/D llena **primero el A y el B hasta el máximo** (18 y hasta 19–20 con plazas de más) y **el C se queda con lo que sobra**. Un club con 46 niños y 3 equipos pasa la cuenta (46 ≥ 42) y acaba en A 19, B 18, **C 9**.
2. **En el 100 % de los 377 equipos bajo mínimo medidos (4 variantes × 10 semillas) el club tenía niños de sobra para que todos sus equipos llegaran a 14** (`total ≥ 14 × equipos`; los otros equipos le sobran de media 9 niños por encima de 14, y faltaban 3,5 por equipo). No es falta de niños: es mal reparto.
3. **Los días 1–6 no son «rondas de movimiento»**: solo hacen aparecer a cada niño en su plantilla (`Npc.apuntado`, solo presentación). Nadie cambia de equipo esos días; los equipos se deciden al crear la partida y cada verano (`draftDeUnaCategoria` y `completarUnaCategoria`). Las cifras «al empezar» y «tras los días 1–6» son casi idénticas (diferencia de 0,1–0,2 equipos, que viene del personaje al apuntarse; ver §2).
4. **Recomendación:** repartir **con el mínimo por equipo** al formar los equipos (opción 3, la de «equilibrar entre A, B y C», que incluye la 1), cambiar las cuatro comprobaciones que cuentan el total del club por una que mire **cada equipo**, y dejar el cierre del equipo (opción 2) solo como red de seguridad para lo que de verdad no llegue. **No subir el máximo a 22** (§3, opción 4): no hace falta y empeora las convocatorias. Dudas para el usuario, al final.

## 1. Por qué se forma un equipo por debajo del mínimo

### Cómo se reparten los niños (con el código)

1. **Al crear la partida** (`draftDeUnaCategoria`, `modules/npcs/src/draft.ts`): cada club de fuera, por atractivo, recluta con una `ronda(e, 2, …)` para su A y su B; después las rondas de C y D (`equiposQueSalen = floor(bolsa / 14)`, como mucho dos más por club), el `ajustar` de cada club, los descartes definitivos y por fin los que quedan van a clubes con equipo. **Cuántos equipos tiene un club por categoría (`equiposPorCategoria`) se decide aquí**, con una cuenta de totales:
   - `draft.ts:203` y `:210`: «si `miembros(e).length < 14 × t` se deshace este paso». `miembros` es **todo el club en la categoría**, no el equipo `t`. Con A y B llenos (36 o más) el C «pasa» con 14×3 = 42 en total y solo 6–10 de verdad.
   - `draft.ts:227` (`ajustar`): `montables = floor(miembros / 14)`; si `montables ≥ k` el club conserva sus k equipos. Otra cuenta de totales.
2. **Cada verano** (`completarUnaCategoria`): el paso 2 (`draft.ts:475–485`) usa la misma cuenta (`miembros(e).length >= min * k`; si no llega, `montables = floor(n / min)`).
3. **El reparto en letras** (`repartirEnEquipos`, `modules/npcs/src/equipos.ts`) se hace **después y por año** (decisión del usuario del 05/11): A = los de segundo año (más los de primer año que destacan, y en benjamín/alevín los de primer año solo entran si sobra sitio), B = los de primer año, C = lo que no cabe (con 3 equipos, `poner('C', todos)`, `equipos.ts:93`) y D = primer año. Cada equipo se llena hasta `max` (18 más las plazas de más). **No hay ningún paso que mire que cada equipo llegue a 14**; solo hay dos protecciones parciales: `puedenSubir` (`equipos.ts:75`) impide que un primer año suba al A si deja al B bajo 14, y con 4 equipos el C se completa con primeros hasta el mínimo (`equipos.ts:96`). Con 3 equipos (el caso más frecuente: 104 de 158 en la grande con hogares) el C no tiene ninguna protección, ni el B tampoco.
4. **Quien consume la liga** descarta los equipos que no llegan (`equiposDeUnaCategoria`, `plantillas.ts:789`: `conEl < min → continue`): el C de 9 no juega ni un partido. Y el aviso al personaje (`equipoSinNinos`, `draft.ts:744–752`) vuelve a contar el total del club (46 ≥ 14), así que **tampoco le avisa**: el personaje se apunta (`plazaEnElEquipo`, `plaza.ts:39`, mide el hueco con todo el club en la categoría, `max × k`, y solo comprueba que «cabe en un equipo»: nunca que ese equipo llegue a 14), `equipoDelPersonajeEn` lo pone en el C y no juega nunca.

### Por qué el A y el B quedan llenos y el C no llega (trazas)

Ciudad de ahora con hogares, benjamín del colegio (`npm run equipos-minimo -- actual con 3,6 --traza`):

| Semilla | Club | Total | Equipos (k) | A | B | C | Qué pasó |
|---|---|---:|---:|---|---|---|---|
| 3 | colegio, benjamín | 46 | 3 | **19** (0 de 1.º + 19 de 2.º) | **18** (18+0) | **9** (7+2) | 21 de segundo año: 19 al A (18 + 1 plaza de más); 25 de primer año: 18 al B; los 2+7 que no caben van al C. |
| 6 | colegio, benjamín | 44 | 3 | **18** (0+18) | **18** (18+0) | **8** (4+4) | Igual: 2.º año al A, 1.º año al B, el resto al C. |
| 3 | colegio, alevín | 42 | 3 | 18 | 17 | **7** (6+1) | 42 ≥ 42: «pasa» con exactamente 14 × 3 aunque A y B tengan 35. |
| 3 | club grande, juvenil | 51 | 3 | 19 | **13** (13+0) | 19 | Aquí el corto es el **B**: solo recibe a los de primer año (13), mientras el C (de dos años mezclados) tiene 19. |

Patrón general (grande con hogares, 158 equipos bajo mínimo, **medidos al empezar**): el equipo corto es el C en 85, el D en 36 y el B en 37; 104 de los clubes tienen k = 3 y 36 tienen k = 4; **132 de 158 tienen todos los demás equipos a ≥ max − 1** (llenos). Tamaño del corto: de 3 a 13 (mediana 11, 42 casos con 13).

Esto responde a la pregunta del usuario: **el equipo se forma por una cuenta de totales y no se rehace ni se deshace después porque las rondas de movimiento (las de la creación y las de cada verano) nunca miran la plantilla de cada equipo; el A y el B se llenan antes porque el reparto por año los llena primero hasta el máximo.** Con hogares y sin ellos pasa lo mismo (es independiente de los hogares; en la tabla del §2 la ciudad grande sin hogares incluso tiene más).

## 2. Cuántos equipos quedan por debajo del mínimo

`tools/equipos-minimo.ts`, semillas 1 a 10 (media por semilla). «Equipos» son los que tienen jugadores (letra A–D) en cada club y categoría; «bajo» los de menos de 14. «Al empezar» es el reparto completo al crear la partida; «tras los días 1–6» es lo que se ve ya apuntados (Npc.apuntado ≤ día 6) con el personaje apuntado al club de su colegio.

| Variante | Equipos | **Bajo mínimo al empezar** | Jugadores en esos equipos | % de los jugadores | Bajo tras los días 1–6 | Semillas del personaje en un equipo bajo |
|---|---:|---:|---:|---:|---:|---|
| Ciudad de ahora, con hogares | 36,0 | **1,7** | 18,6 | 3,0 % | 1,8 | 4 de 10 (3, 6, 7, 10) |
| Ciudad de ahora, sin hogares | 33,7 | **1,9** | 20,6 | 3,6 % | 2,1 | 2 de 10 (4, 6) |
| **Grande, con hogares** | 171,3 | **15,8** | 165,4 | 5,7 % | 15,9 | 3 de 10 (7, 9, 10) |
| Grande, sin hogares | 166,8 | **18,3** | 188,9 | 6,8 % | 18,5 | 4 de 10 (2, 4, 5, 8) y 1 sin equipo (6) |

Por categoría, al empezar (equipos bajo / jugadores en ellos):

| | Benjamín | Alevín | Infantil | Cadete | Juvenil |
|---|---:|---:|---:|---:|---:|
| Ciudad de ahora, con hogares | 0,5 / 4,8 | 0,4 / 4,1 | 0,2 / 2,5 | 0,1 / 1,2 | 0,5 / 6,0 |
| Ciudad de ahora, sin hogares | 0,1 / 0,8 | 0,5 / 5,7 | 0,2 / 2,3 | 0,4 / 5,0 | 0,7 / 6,8 |
| Grande, con hogares | 2,8 / 30,3 | 3,4 / 34,8 | 1,7 / 19,8 | 1,2 / 13,8 | **6,7 / 66,7** |
| Grande, sin hogares | 3,0 / 33,6 | 3,3 / 36,4 | 2,4 / 28,0 | 1,8 / 19,8 | **7,8 / 71,1** |

- En la grande **todas las semillas tienen equipos bajo mínimo en casi todas las categorías** (benjamín 9 de 10, alevín 10 de 10, infantil 9 de 10, cadete 7 de 10, juvenil 10 de 10 con hogares). En la ciudad de ahora salen en 1 a 5 de las 10 semillas según la categoría.
- **Juvenil es la peor** (más del 40 % de los equipos bajo mínimo de la grande): tres años mezclados y, con el abandono por edad, clubes con 3 equipos y 50–60 niños.
- Tras los días 1–6 no cambia nada relevante: +0,1 en la ciudad de ahora y la grande con hogares, +0,2 sin hogares. Son las veces que el personaje, al apuntarse, desplaza a un niño y deja su equipo en 13 (el mensaje del diario «X pierde su plaza para dejarte sitio»; no lo he comprobado caso por caso). **No hay nada que «se arregle solo»**: lo que hay el primer día es lo que hay el día 6.
- `npm run benjamin -- 33` (grande con hogares): personaje en el C de benjamín del colegio, plantilla 9, **0 semanas convocado, 0 partidos** (confirmado).

## 3. Opciones, con cifras

Para cada opción hay dos tipos de cifra: las que salen de **simular sobre el estado real** (misma herramienta, 10 semillas) y, para la opción 3, una **prueba en caliente** (un parche de 15 líneas de `repartirEnEquipos`, que se ha **revertido**: el diff está más abajo). Todo por semilla (media de 10). «Libres» = niños que se quedarían sin equipo en esa categoría.

| | Ciudad de ahora, con hogares | Grande, con hogares | Grande, sin hogares |
|---|---:|---:|---:|
| **Hoy**: equipos bajo mínimo · niños en ellos | 1,7 · 18,6 | 15,8 · 165 | 18,3 · 189 |
| Niños que faltan para que todos lleguen a 14 | 5,2 | 55,8 | 67,3 |
| Libres que hay ya en el mundo (interesados sin equipo) | 9,4 | 58 (57 de juvenil) | 41,6 (41 de juvenil) |
| Hueco en los equipos que sí llegan (max 18) | 29 | 115 | 119 |
| Excedente por encima de 14 en los equipos que sí llegan | 121 | 554 | 520 |

### Opción 1. Las rondas de movimiento completan el equipo

Con niños del A o el B que bajan, o de otros clubes o libres.

- **Del A y el B del mismo club (el que sobra):** cabe siempre. Faltan 5,2 / 55,8 / 67,3 niños por semilla y el club los tiene (excedente de 9 por equipo corto). Es la opción 3 vista paso a paso.
- **Libres de la bolsa:** **no alcanza**. En la grande la bolsa de benjamín y alevín es 0 (el draft ya reparte a todos; lo que queda son menos de 14 por categoría por diseño) y de los 58 que hay, 57 son de juvenil. Los libres se pueden usar en juvenil, pero no en las categorías donde está el problema del benjamín.
- **De otros clubes:** técnicamente hay excedente (554 por encima de 14), pero es mover niños entre clubes: rompe el reparto por atractivo, el «me quedo en el club de mi colegio» (decisión del 17/11) y sería un caso nuevo de la regla (no se hace para los niños sin equipo, se hace con prueba y plaza). **No recomendado.**
- Para el personaje: se le da un equipo que juega. Ninguna regla nueva para PNJ o personaje.

### Opción 2. Si al cerrar las rondas no llega, el equipo se deshace

Los niños quedan libres para otros equipos o clubes (el personaje con aviso: ya existe `futbol.equipo_sin_ninos`).

| | Ciudad de ahora, con hogares | Grande, con hogares | Grande, sin hogares |
|---|---:|---:|---:|
| Equipos que se deshacen | 1,7 | 15,8 | 18,3 |
| Niños que pierden equipo | 18,6 | 165 | 189 |
| …de los que caben en los otros equipos de su club (max 18) | 1,3 | 10 | 12 |
| …con plazas de más (+2 por equipo) | 6,8 | 58 | 66 |
| **Libres que quedan** (max 18 · con plazas de más) | **17,3 · 11,8** | **155 · 107** | **177 · 123** |

- Casi nadie cabe en los otros equipos del club: están llenos (esa es justamente la causa). Los niños quedan libres: **un 2,8 % de los jugadores en la ciudad de ahora y un 5,4 % en la grande**, hasta que otros equipos con hueco (115 en toda la grande) los recojan o, si son 14 en una categoría, abran uno (benjamín: 28 libres → 2 equipos posibles, pero solo con alumnos del mismo colegio en un equipo de colegio).
- Para el personaje: pierde el equipo y recibe el aviso. Es lo que pide el usuario («o el equipo se deshace»), pero en el caso del colegio de benjamín (donde todos son alumnos) el niño no tiene adónde ir salvo el club de fuera con prueba y hueco.
- Cambia la huella (cambia el reparto). Cuesta lo mismo que hoy.

### Opción 3. Equilibrar entre A, B y C para no dejar morir el C (recomendada)

Reparto en `repartirEnEquipos` con el mínimo por equipo: si un equipo que existe tiene menos de 14, toma al que menos vale del equipo del club con más sobrante por encima de 14 (los demás no bajan de 14).

**Simulado sobre el estado real** (cuántos niños cambian de equipo respecto a hoy: los «movidos»; y el nivel, medido como la fuerza de la liga: media de los 11 mejores):

| | Ciudad de ahora, con hogares | Grande, con hogares | Grande, sin hogares |
|---|---:|---:|---:|
| Niños que cambian de equipo | 5,2 (0,8 %) | 55,8 (1,9 %) | 67,3 (2,4 %) |
| Equipos y niños sin jugar | 0 · 0 | 0 · 0 | 0 · 0 |
| Fuerza media de los equipos que ceden | 21,34 → 21,34 | 21,46 → 21,46 | 21,91 → 21,91 |
| Fuerza media de los que estaban bajo mínimo | 18,36 → 18,35 | 18,16 → 18,11 | 18,34 → 18,30 |

**Medido de verdad con el parche** (`DS_EQUILIBRAR=1`, diff abajo; semillas 1 a 10):

| | Ciudad de ahora, con hogares | Ciudad de ahora, sin hogares | Grande, con hogares | Grande, sin hogares |
|---|---:|---:|---:|---:|
| Equipos bajo mínimo al empezar: hoy → con el parche | 1,7 → **0,0** | 1,9 → **0,0** | 15,8 → **0,1** | 18,3 → **0,3** |
| Niños en ellos | 18,6 → 0 | 20,6 → 0 | 165 → 1,2 | 189 → 3,5 |
| Personaje en equipo bajo (de 10) | 4 → 1 | 2 → 1 | 3 → 1 | 4 → 2 |

- **`benjamin`**: semilla 33 (la que falla): **de 0 semanas convocado a 13 (13 titular, 1.170 minutos)**; plantilla 14. Semilla 31 (bien hoy): 20 semanas convocado (3 titular, 16 suplente, 765 min) → 22 (4 titular, 17 suplente, 885 min). El primer partido sigue siendo la semana 4.
- **Rotación y convocatorias:** el entrenador cita a 16 (`PARAMETROS_DE_CONVOCATORIA.convocados`); con plantillas de 14 a 16 se cita a todos. Los equipos donantes bajan de 18–19 a 15–16: **entran todos en la convocatoria cada semana** (hoy 2–3 se quedan fuera) y no hay más rotación que hacer. Es decir, más minutos para todos, no menos.
- **Nivel:** casi no cambia, porque se mueven los que menos valen (fuera de los 11 titulares); el equipo que estaba bajo mínimo gana 14 niños en vez de 9 y su media apenas se mueve (−0,05 a +0,0).
- **Huella:** cambia **solo** `futbol 31` y `futbol 32` (`68a5bb79132e 7b9152a7ee30` → `6595c8222ff4 974ae5f116ae`; `d82c5d4d0b31 d922f96a7249` → `029a01e91e4b 11ab702047d6`); los bots sin fútbol, idénticos. Coste: un bucle de como mucho 60 pasos por club y categoría.
- **Lo que el parche no resuelve y hay que tratar:** (a) en la grande **juvenil deja 13 jugadores por semilla sin letra** (clubes con k = 3 y 54–60 niños, que ya no se liberan al ajustar: hay que decidir si pasan a un cuarto equipo o a la bolsa); (b) un 0,1–0,3 de equipos que siguen cortos (casos con el total justo o tras desplazar el personaje a alguien); (c) el parche **no respeta el reparto por años ni por puestos** al mover niños (mueve al peor del equipo que más sobra, de cualquier año y puesto); (d) las cuatro comprobaciones de totales (§1) siguen contando mal y habría que cambiarlas para que el draft **forme el equipo número t con niños suficientes para él**, no solo para el club.

### Opción 4. Como último recurso, subir el máximo hacia 22 (por categoría)

Modelo: se deshace el equipo corto y sus niños pasan a los otros equipos del club hasta el máximo (22). Como el reparto llena primero el A y el B, subir el máximo **sin tocar la cuenta** empeoraría el C (A 22, B 22 y el C con aún menos).

| Libres que quedan | Ciudad de ahora, con hogares | Grande, con hogares | Grande, sin hogares |
|---|---:|---:|---:|
| Todas las categorías con max 22 | 6,0 | 49,6 | 60,2 |
| Solo infantil, cadete y juvenil con 22 (benjamín y alevín con 18) | 12,0 | 91,0 | 99,5 |
| Max 18 (hoy, opción 2) | 17,3 | 155 | 177 |

- Aun con 22 sigue habiendo niños sin equipo: 50 por semilla en la grande (1,7 %), y se **deshacen igualmente los 15,8 equipos bajo mínimo** (el equipo que muere es el C).
- Convocatorias: con 22 hay 6 jugadores sin citar cada semana (con 18, 2 y, con 14–16, ninguno). Eso es justo lo que el usuario quiere evitar en las categorías bajas.
- **No recomendado:** el reparto equilibrado (opción 3) resuelve el 98–99 % sin ampliar nada. Si algún día hace falta, solo en cadete y juvenil, donde el máximo no cambia el efecto sobre los niños pequeños.

### Resumen de las opciones (grande con hogares, por semilla)

| | Equipos que no juegan | Niños sin equipo o sin jugar | Efecto en `benjamin` (semilla 33) | Rotación y nivel | Huella |
|---|---:|---:|---|---|---|
| Hoy | 15,8 | 165 (5,7 %) | 0 semanas convocado | — | la actual |
| 1. Completar (del A y B) | 0 | 0 | como la 3 | como la 3 | cambia |
| 2. Deshacer | 15,8 | 155 libres (107 con plazas de más) | pierde el equipo + aviso | sin efecto en los que quedan | cambia |
| **3. Equilibrar** | **~0** | **~1** (+13 sin letra en juvenil) | **13 semanas convocado, titular** | todos citados; nivel igual | cambia (solo fútbol) |
| 4. Subir a 22 | 15,8 | 50 (91 solo infantil+) | pierde el equipo, o juega en A/B de 22 | 6 sin citar por semana | cambia |

## 4. Recomendación y dudas para el usuario

**Recomiendo la opción 3**, con la opción 2 como red de seguridad. En orden:

1. **`repartirEnEquipos` (`equipos.ts`) con el mínimo por equipo** (el parche de abajo es la idea; la versión de verdad respetaría puestos y, si se quiere, el año).
2. **Cambiar las cuatro comprobaciones de totales** por el tamaño de cada equipo calculado con ese reparto (`equiposDelClub`): `draft.ts:203` y `:210` (cada paso `t`), `:227` (`ajustar`), `:475–485` (verano) y `equipoSinNinos` (`draft.ts:744`); y que `equiposDeUnaCategoria` (`plantillas.ts:789`) siga descartando lo que no llegue (red de seguridad).
3. **El personaje**: al apuntarse, si el equipo en que quedaría no llega a 14 (con él), decírselo igual que las otras acciones (`reason`) en vez de dejarle apuntarse a un equipo que no juega. Con el reparto equilibrado casi nunca pasará.
4. Tests y medida: `npm run equipos-minimo` debe dar 0 en las 4 variantes; `npm run benjamin -- 31,33` con convocatoria en la 33; actualizar `huella` (solo `futbol 31/32`), `ANEXO_DEPORTE.md`, `CIUDAD_Y_LIGAS.md` §3/§5 y una entrada en `DECISIONES.md`.

**Dudas para el usuario**

1. **El reparto por años.** Para llegar a 14, el C (o el B) toma niños del A o del B **de cualquier año**: hoy A son los de segundo año y B los de primer año. Moverlos rompe un poco esa regla (en la grande, 56 niños por semilla, un 1,9 % de los jugadores, cambian de equipo). ¿Vale, o prefieres que baje solo el del mismo año y, si no hay, que el equipo se deshaga (opción 2)?
2. **Juvenil.** Con el reparto equilibrado, clubes con 3 equipos y 54–60 niños dejan niños sin letra. ¿Cuarto equipo cuando haya 56 o más, o plazas de más, o a la bolsa?
3. **Si de verdad no llega** (el total del club es menor que 14 × equipos): ¿se deshace el último equipo y sus niños pasan a los otros del club hasta el máximo (con plazas de más) y los que sobren a la bolsa? Para el personaje, el aviso que ya existe.
4. **Compatibilidad con partidas guardadas:** como los equipos se guardan (`Npc.letra`), una partida anterior mantiene su reparto hasta el siguiente verano, cuando se recalcula con la regla nueva. ¿Está bien, o se rehace al cargar?
5. **Timing:** ahora `modules/npcs` lo tocan otras sesiones (abaratar los hogares) y `modules/futbol` el motor de partidos; el cambio es sobre todo `equipos.ts` y `draft.ts`. Avisa cuándo aplicarlo.

## Cómo reproducir

```bash
npm run equipos-minimo -- actual con 1-10        # ciudad de ahora con hogares; sin hogares: sin; grande con/sin: grande con|sin 1-10
npm run equipos-minimo -- actual con 3,6 --traza # cada equipo bajo mínimo con los demás equipos de su club
npm run benjamin -- 33                            # el personaje con el equipo de 9
```

Salida: `#BAJO` (cada equipo bajo mínimo, con tamaño por año de cada equipo del club), `#RESUMEN` (por categoría y momento), `#SIM` (las opciones sobre el estado real) y `#PERSONAJE` (en qué equipo cae). Los números de este informe salen de 10 semillas (1–10) por variante.

## El parche de prueba de la opción 3 (revertido, no aplicado)

En `repartirEnEquipos`, justo antes de `equipos.sobran = …` (con `DS_EQUILIBRAR=1` para compararlo con lo de ahora):

```ts
if (porAnio) {
  const valor = new Map(miembros.map((m) => [m.id, m.valor]));
  const letras = LETRAS.slice(0, nEquipos);
  for (let vuelta = 0; vuelta < 60; vuelta++) {
    const corto = letras.find((l) => equipos[l].length > 0 && equipos[l].length < minimo);
    const donante = [...letras].filter((l) => l !== corto && equipos[l].length > minimo).sort((a, b) => equipos[b].length - equipos[a].length)[0];
    if (!corto || !donante) break;
    const peor = [...equipos[donante]].sort((a, b) => valor.get(a)! - valor.get(b)! || (a < b ? -1 : 1))[0];
    equipos[donante] = equipos[donante].filter((x) => x !== peor);
    equipos[corto].push(peor);
  }
}
```
