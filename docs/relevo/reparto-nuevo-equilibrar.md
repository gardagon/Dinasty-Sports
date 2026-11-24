# Reparto nuevo + equilibrar letras: 20 semillas (31–50)

Ciudad grande con hogares. `npm run equipos-minimo -- grande con 31-50 --equilibrar` (el reparto nuevo entero y, al final, el paso 8 de `reparto-nuevo-reglas.md`); sin banderas es el reparto actual. Solo medida. Celdas: media (mín–máx).

## 1. Por categoría (equilibrado; equipos, tamaños y fuera no cambian respecto a «nuevo» porque el paso 8 mantiene el tamaño de cada equipo)

**Semillas 31–40**
| Cat | Equipos (A·B·C·D) | Mín | Máx | <14 | Fuera 1.º/2.º/3.º |
|---|---|---|---|---|---|
| benjamín | 31,4 (13·13·3,7·1,7) | 14,1 (14–15) | 19,9 (18–22) | 0 | 0 |
| alevín | 31,3 (13·13·3,5·1,8) | 13,8 (9–17) | 19,4 (18–22) | 0,1 (0–1) | 0 |
| infantil | 29,6 (13·13·3,6·0) | 14,2 (14–16) | 21,1 (20–22) | 0 | 0 |
| cadete | 29,3 (13·13·3,3·0) | 14,1 (14–15) | 20,5 (20–21) | 0 | 0 |
| juvenil (sin equilibrar) | 30,6 (12,8·9,1·8,7·0) | 18,4 (15–22) | 22 | 0 | 13 · 11,8 · 66,6 |

**Semillas 41–50**
| Cat | Equipos | Mín | Máx | <14 | Fuera |
|---|---|---|---|---|---|
| benjamín | 31,7 (13·13·4,4·1,3) | 14,1 (14–15) | 19,6 (18–22) | 0 | 0 |
| alevín | 31,7 (13·13·3,8·1,9) | 14 | 19,6 (18–22) | 0 | 0 |
| infantil | 29,5 (13·13·3,5·0) | 14,1 (14–15) | 20,5 (20–21) | 0 | 0 |
| cadete | 28,7 (13·13·2,7·0) | 14,1 (14–15) | 21 (20–22) | 0 | 0 |
| juvenil | 30,8 (13·9,2·8,6·0) | 17,9 (14–22) | 22 | 0 | 13,7 · 10,8 · 66 |

Reparto actual, 41–50 (para comparar): <14 = 3,0 · 3,1 · 1,8 · 1,1 · 6,4 (benjamín a juvenil); mínimo de niños 9,4 · 7,7 · 10,4 · 10,9 · 6,2; juvenil fuera 0,2 · 25,1 · 28,2.

## 2. Qué cambia el paso de equilibrar

Jugadores que cambian de letra (por semilla, media y rango): 

| Cat | 31–40 | 41–50 |
|---|---|---|
| benjamín | 87 (61–133) | 103,7 (74–141) |
| alevín | 80,9 (39–117) | 85 (70–102) |
| infantil | 52,8 (18–76) | 50,7 (14–75) |
| cadete | 35,5 (8–60) | 35,7 (12–65) |

«Vuelven a bajar del A al B»: **0** en las 20 semillas. No es casualidad: los «subidos» solo existen en infantil y cadete y esas categorías no llegan a tener D (solo A, B y C), así que la regla «A, B, C y D» no se aplica allí; y en benjamín y alevín (con D) no hay subidos. En A, B y C, el titular de 1.er año que sube al A forma parte de la regla (A = mejores de 2.º + titulares de 1.º).

¿Algún C o D mejor que su A o su B? Clubes en que sí, antes → después del paso (en el «después» no queda ninguno por construcción); entre paréntesis, los clubes con ese equipo:

| Cat | C mejor que A, nivel medio | C mejor que A, mejor once | D mejor que B, medio | D mejor que B, once |
|---|---|---|---|---|
| benjamín 31–40 | 5 → 0 (37) | 6 → 0 | 5 → 0 (17) | 4 → 0 |
| benjamín 41–50 | 1 → 0 (44) | 0 → 0 | 2 → 0 (13) | 1 → 0 |
| alevín 31–40 | 7 → 0 (35) | 2 → 0 | 1 → 0 (18) | 0 → 0 |
| alevín 41–50 | 2 → 0 (38) | 1 → 0 | 3 → 0 (19) | 2 → 0 |
| infantil 31–40 | 0 → 0 (36) | 0 → 0 | — | — |
| infantil 41–50 | 1 → 0 (35) | 0 → 0 | — | — |
| cadete 31–40 | 1 → 0 (31) | 0 → 0 | — | — |
| cadete 41–50 | 0 → 0 (27) | 0 → 0 | — | — |

Con el reparto nuevo ya hay pocos casos de C mejor que A (paso 2 sube a los titulares); el paso 8 los resuelve del todo y, sobre todo, mezcla bien A y C (son decenas de jugadores por categoría los que cambian de letra).

## 3. El personaje (benjamín, colegio)

Equipo por debajo de 14: reparto actual **6 de 20** (semillas 33, 35, 39, 43, 45, 47: plantillas de 7 a 13). Reparto nuevo (con o sin equilibrar): **0 de 20**, porque no hay ningún equipo de benjamín por debajo de 14 en las 20 semillas.

## 4. Lo raro

- **Revertidos por rango (2 de ~270 clubes-categoría):** en cadete, `club_pequeno3` (semillas 35 y 36), regla A, B y C: al juntar todos, el B solo de 1.er año se queda en 14–15 y el C mixto saldría con 24–26 (más de 22) → el club se queda como estaba. Antes de añadir la regla «el más flojo de los titulares de 1.º se queda en el B» eran 14 reversiones en las 20 semillas (12 en infantil, con B de 11 o 13 niños de 1.er año, que ahora se resuelven).
- **Alevín, semilla 40: un equipo de 9** (`colegio2`, A de 9): el colegio tiene muy pocos alumnos de 2.º año interesados y el colegio solo puede coger a los suyos; no lo arregla ningún paso. Es el único equipo por debajo de 14 de las 20 semillas.
- **Máximo 22 solo se alcanza en el paso 7** (infantil y cadete) y en benjamín y alevín (C y D); los A y B salen con 18–20.
- Juvenil: sin equipos <14, pero quedan fuera de media ~13 de 1.º, ~11 de 2.º y ~66 de 3.º.
- `fijarEquipos` sigue deshaciendo las letras en la partida real (ver `reparto-nuevo-reglas.md`, «Lo que hay que cambiar»): las cifras salen de los equipos que deja cada paso.
