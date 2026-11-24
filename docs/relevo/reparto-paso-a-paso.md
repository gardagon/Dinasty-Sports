# El reparto de equipos, paso a paso (semilla 33, ciudad grande con hogares)

Para sentarnos con el usuario y decidir en caliente. **No se ha cambiado nada del juego**: solo se ha añadido una herramienta que cuenta el reparto con palabras (`npm run reparto:paso`) y unos avisos de «mirar» en el código (`DIAGNOSTICO.traza`, en `draft.ts` y `plantillas.ts`; no tocan ningún resultado: la huella sale idéntica).

```
npm run reparto:paso -- <semilla> [grande|actual|prueba] [categoría] [club]   (--sin-hogares, --sin-verano, --resumen)
npm run reparto:paso -- 33 grande benjamin
```

La salida completa de la semilla 33 está en `docs/relevo/reparto-paso-a-paso/benjamin-33.md` y `juvenil-33.md` (unas 500 líneas cada una, con una tabla por ronda). Aquí va lo que hay que mirar, con «aquí se decide X; alternativas» después de cada paso. Lo anterior (cuántos equipos fallan, por qué y qué opciones medimos) está en `docs/relevo/equipos-minimo.md`.

## En una página: dónde se crea el problema

| # | Dónde | Qué pasa | Efecto |
|---|---|---|---|
| P1 | Primera ronda | **Cada club pide 2 equipos de 18** (A y B) antes de saber cuántos niños hay. Con 13 clubes eso son **464 de los 554** niños de la bolsa de benjamín. | Para C y D quedan 90 niños. |
| P2 | Cuántos equipos tiene un club | Se decide con **el total de niños del club** («44 ≥ 14 × 3»), nunca con los niños que le tocan a cada equipo. | El colegio del personaje monta un C con 9 niños (A y B ya tienen 18 y 17). |
| P3 | Reparto en A, B, C, D | **Por año de nacimiento** con máximo 18: A = los mayores, B = los nuevos. Cada uno se llena hasta 18 y el C recoge lo que sobra. | El C (o el B, o el D) sale con 7–13. |
| P4 | Ajuste | Quien no cabe en su equipo «por año» o por puesto **vuelve a la bolsa** y el club recalcula `niños ÷ 14`. | Un club de juvenil pasa de 72 a 50 niños en un ajuste. |
| P5 | Verano siguiente | El reparto por año se desequilibra (un grande llega con 41 niños de un año y 1 del otro) y «acomodar a los que no caben» **echa del club** a los sobrantes. | club_grande pasa de 3 equipos y 42 niños a **1 equipo y 18 niños**. |
| P6 | Juvenil | Tres años, y los de 18 ya no van al colegio: 518 mayores frente a 266 de 16 años, con equipos reservados por año. | **97 mayores interesados sin equipo** y equipos de 16 años con 3 a 11. |
| P7 | Máximo 4 equipos y máximo 18 | Con cohortes de 20–30 niños por club y año, **por año y con máximo 18 no hay forma de llegar a 14** (ver «Otras reglas»). | Es la regla, no el azar. |

## Benjamín, semilla 33

### Paso 1. Los niños de la ciudad

| Edad | Niños | Con interés por el deporte | En la bolsa al empezar |
|---|---:|---:|---:|
| 8 | 501 | 286 | 280 |
| 9 | 507 | 279 | 274 |
| Total | 1.008 | 565 | **554** |

Los 554 se reparten por colegios: 9 colegios de fuera con unos 50–67 cada uno y el del personaje con 53. **187 de ellos se quedan en el club de su colegio** (no van a probar fuera: 15 % de base), así que **a los clubes de fuera solo les ven 367**.

> **Aquí se decide:** quién entra en la bolsa (el que tiene algún interés por el deporte: 554 de 565) y quién se queda en su colegio (187). *Alternativas:* contar solo a los que quieren fútbol (menos niños, más realista); o que el colegio vea siempre a sus alumnos antes que los clubes de fuera.

### Paso 2. Los clubes

13 clubes con benjamín: **9 de fuera** (1 grande, 3 medianos, 5 pequeños) y **4 de colegio** (el del personaje y tres más). Todos con mínimo 14 y máximo 18. Cada club de fuera «ve» un porcentaje de la bolsa según su atractivo: **grande 60 %, mediano 50 %, pequeño 40 %**; el colegio ve a todos sus alumnos.

Capacidad: 13 clubes × hasta 4 equipos × 18 = 936 plazas para 554 niños; con **34 equipos** de media 16,3 niños bastaría para que **todos** llegaran a 14.

> **Aquí se decide:** cuántos clubes hay (13, por población: 1.008 niños de 8 y 9 años) y cuánto atrae cada uno. *Alternativas:* menos clubes con más niños cada uno (hoy los pequeños apenas llegan a 2 equipos); o ligar el número de clubes a los niños disponibles.

### Paso 3. Primera ronda: todos piden A y B (P1)

Los clubes de fuera van primero, de mayor a menor atractivo; el colegio del personaje y los de colegio, después. **Cada uno quiere llegar a 2 equipos y coge 18 + 18**:

| Club | Ve | Prueban | Se queda con | Cuenta que hace |
|---|---:|---:|---:|---|
| club_grande | 367 | 220 | 36 | 36 ≥ 14 × 2 = 28 → sigue |
| club_mediano | 331 | 166 | 36 | 36 ≥ 28 → sigue |
| club_pequeno | 223 | 89 | 36 | 36 ≥ 28 → sigue |
| club_pequeno5 | 79 | 32 | 32 | 32 ≥ 28 → sigue |
| colegio (del personaje) | 46 | 46 | 36 | 36 ≥ 28 → sigue |

(Los 13 clubes salen con 36, salvo club_pequeno5 con 32.) **Tras la primera ronda quedan 90 niños en la bolsa de 554**, y cada club ya tiene un A y un B llenos.

> **Aquí se decide:** que **cada club tenga dos equipos llenos antes de mirar a nadie más** y el tamaño de cada equipo (18). *Alternativas:* repartir primero el total (554 niños ÷ 14 = hasta 39 equipos posibles; con 13 clubes serían unos 3 equipos de 14–16 por club) y después asignar equipos; o que cada club pida solo los equipos que sus niños de cada año justifican.

### Paso 4. Segunda ronda: C y D con lo que queda (P2)

Se cuentan los equipos que salen con la bolsa a 14 por equipo: **90 ÷ 14 = 6 equipos**, sorteados entre los clubes (como mucho 2 por club): colegio1, club_pequeno3, colegio2, club_mediano3, club_grande y club_pequeno5.

La cuenta de cada club para el equipo 3 es **la del total**:

| Club | Cuenta que hace para montar su 3.er equipo | Resultado | Cuánto tiene de verdad el C |
|---|---|---|---|
| colegio (del personaje) | 44 niños ≥ 14 × 3 = 42 | se monta | **9** (con A 18 y B 17) |
| club_grande | 46 ≥ 42 | se monta | 10 de la bolsa, con A y B ya llenos |
| club_pequeno5 | 32 < 42 | se deshace | — |

> **Aquí se decide: el equipo número t se acepta si el CLUB tiene 14 × t niños**, no si el equipo t tiene 14. Con A y B en 18 + 18 = 36, al club le basta con 6 niños nuevos para «cumplir» el 3.º (36 + 6 = 42). **Es el punto que fabrica los equipos de 9.** *Alternativas:* aceptar el equipo t solo si hay 14 niños **para él** (los que no están ya en un equipo con plaza); o decidir los equipos de todo el club a la vez, de modo que cada uno reciba 14 o más.

### Paso 5. Ajuste y descartes

Cada club recalcula: los que no caben en ningún equipo por año o puesto **vuelven a la bolsa** y el club se queda con `niños ÷ 14` equipos. Ejemplos: club_mediano2 pasa de 36 a 29 niños (7 vuelven: tenía 13 de primer año y 23 de segundo, y el A solo admite 18 de los mayores); club_mediano, de 36 a 33. Después los descartes (35 y 14 niños) se recogen en clubes con menos equipos (club_pequeno y club_pequeno2 pasan de 2 a 3 equipos con 51 y 43 niños).

Al acabar quedan **0 niños de benjamín sin sitio**.

> **Aquí se decide:** que un niño que «no cabe por año» deje de tener equipo en su club y vuelva a la bolsa, en lugar de buscar sitio en otro equipo del mismo club. *Alternativas:* repartirlo en otro equipo del mismo club (aunque sea de otro año); o que el equipo se arme con los años que haya.

### Paso 6. Las letras (A a D): cómo queda cada equipo (P3)

«Hoy» es el resultado de la creación; entre paréntesis, primer año + resto:

| Club (niños) | A | B | C | D |
|---|---:|---:|---:|---:|
| colegio del personaje (24 + 20) | 18 | 17 | **9** | |
| club_grande (21 + 31) | 18 | 16 | 18 | |
| club_mediano (19 + 15) | 18 | 16 | | |
| club_mediano2 (12 + 19) | 19 | **12** | | |
| club_mediano3 (27 + 26) | 18 | 18 | 17 | |
| club_pequeno (29 + 21) | 18 | 18 | 14 | |
| club_pequeno2 (26 + 20) | 19 | 16 | **11** | |
| club_pequeno3, 4 y 5, colegio1, 2 y 3 | todos con A y B de 14 a 19; C de 14 a 18 | | | |

**3 equipos no llegan a 14 y no entran en la liga** (el C del colegio del personaje, el B de club_mediano2 y el C de club_pequeno2): 32 niños que no juegan nunca.

En el club_mediano2 se ve claro: 12 de primer año y 19 de segundo; el A son los mayores (19) y el B, **los de primer año, solo 12**. Con 31 niños, dos equipos de 15–16 (mezclando años) habrían salido bien.

> **Aquí se decide: A = los mayores, B = los de primer año, C = lo que sobra, y cada uno hasta el máximo (P3).** *Alternativas:* equipos iguales por nivel con los dos años mezclados (así lo hacen los clubes medianos y pequeños en el reglamento actual cuando «`porAnio` es falso»); o por año pero dejando que un equipo tome un año más si le falta para 14 (el usuario ha dicho que no: «no es realista»).

### Paso 7. El verano siguiente (P5)

Esto es lo que ocurre un año después, con los mismos niños (los de 8 pasan a 9 y los de 9 salen a alevín):

| Club | Equipos | Niños al empezar el verano | Tras «acomodar a los que no caben» |
|---|---:|---|---|
| club_grande | 3 | 41 (todos de 9 años, 0 de 8) | **1 equipo, 18 niños** (6 y luego 17 y 1 «no caben» y dejan el club) |
| club_mediano | 2 | 29 | 1 equipo, 18 niños |
| club_mediano2 | 2 | 30 | 1 equipo, 18 niños |
| colegio del personaje | 3 | 44 (22 + 22) | 3 equipos: A 19, B 19, **C 7** |

Qué ha pasado en club_grande: llega con 41 niños de 9 años y apenas uno de 8 (los niños de 8 de este curso casi no van a él; y entre el curso pasado y esta traza le han subido de 21 a 41 niños, probablemente por los fichajes de verano, que esta herramienta no cuenta). El A admite 18 mayores y el B solo los de 8 años (hay 1): **los 23 de 9 años que sobran «no caben en ningún equipo» y dejan el club** (`acomodarSobrantes`), el club baja de 3 a 1 equipo y los 24 niños tienen que buscar otro club en el plazo de fichajes. Al final del verano quedan **4 equipos bajo mínimo** (el C del colegio del personaje con 7, entre ellos).

> **Aquí se decide:** que el reparto por año se mantenga cada verano aunque el club reciba (por fichajes) un solo año, y que quien no cabe **deje el club**. *Alternativas:* si el club tiene 41 niños de un año, hacer 2 equipos de ese año; o que los fichajes del grande tengan en cuenta qué año le falta.

### Paso 8. Otras reglas (solo las cuentas, con los niños que tiene cada club al acabar la creación)

Los números en **negrita** son equipos que no llegarían a 14.

| Club | 8 + 9 años | Hoy | Por año, máx 18 | Por año, máx 22 | Mezclando años, máx 18 |
|---|---|---|---|---|---|
| colegio del personaje | 24 + 20 | 18+17+**9** | **12**+**12**+**10**+**10** | **12**+**12**+20 | 15+15+14 |
| club_grande | 21 + 31 | 18+16+18 | **11**+**10**+16+15 | 21+16+15 | 18+17+17 |
| club_mediano2 | 12 + 19 | 19+**12** | **12**+**10**+**9** | **12**+19 | 16+15 |
| club_pequeno2 | 26 + 20 | 19+16+**11** | **13**+**13**+**10**+**10** | **13**+**13**+20 | 16+15+15 |
| club_pequeno3 | 26 + 25 | 18+16+17 | **13**+**13**+**13**+**12** | **13**+**13**+**13**+**12** | 17+17+17 |

| Regla | Equipos que llegan a 14 | Niños en equipos que no llegan |
|---|---:|---:|
| Hoy | 31 | 32 |
| Por año, máx 18 | 13 | 364 |
| Por año, máx 22 | 21 | 202 |
| Mezclando años, máx 18 | **34** | **0** |
| Mezclando años, máx 22 | 34 | 0 |

(«Por año» es una lectura: cada año de nacimiento en equipos iguales de como mucho 18 o 22. La tabla completa por club está en `benjamin-33.md`.)

> **Aquí se decide:** si el equipo es **de un año** o **de un nivel**. Con 20–30 niños de cada edad por club, **ni 18 ni 22 hacen que cada año llene equipos de 14 o más**; en cambio, mezclando los dos años y haciendo tantos equipos como quepan de 14, **los 34 equipos llegan** y no se queda ningún niño fuera. Es la tabla que más conviene mirar con el usuario.

## Juvenil, semilla 33

Juvenil tiene **tres años** (16, 17 y 18) y los de 18 ya no van al colegio.

| Edad | Niños | En la bolsa |
|---|---:|---:|
| 16 | 500 | 266 |
| 17 | 501 | 279 |
| 18 | 450 | 239 (todos sin colegio) |
| Total | 1.451 | **784** |

**Paso 3 (primera ronda).** Igual que en benjamín: los 13 clubes piden A y B y salen con 36 (32 el colegio2). Pero la mezcla de años es muy desigual: club_grande con **8 de 16 años y 28 mayores**; club_pequeno5 con 5 y 31. **Aquí está el problema: el B de cada club de fuera es de «primer año» (16 años) y solo hay 5–12; los mayores llenan el A (18) y el resto no tiene equipo.**

**Paso 4 (segunda ronda).** Quedan 320 en la bolsa; 320 ÷ 14 = 22 equipos nuevos, de dos por club.

**Paso 5 (ajuste).** El golpe: club_mediano pasa de 72 a 50 niños (22 «no caben» y vuelven a la bolsa), club_mediano2 de 72 a 50, club_mediano3 de 72 a 51 y los tres de 4 a 3 equipos. Luego, descartes en clubes de 3 a 4 equipos y otro ajuste (club_pequeno 72 → 50, club_pequeno2 72 → 49, club_pequeno5 72 → 46).

**Paso 6. Cómo quedan al acabar la creación:** 33 equipos llegan a 14 y **8 no**. Se ven bien dos cosas:
- A y C (los mayores) están **llenos con 19** en casi todos los clubes y B y D (los de 16 años) quedan cortos: club_grande B **10**, club_mediano3 D **7**, club_pequeno4 D **3**, club_mediano2 D 11.
- **97 mayores interesados (48 de 17 años y 49 de 18) se quedan sin equipo** (apartados ese curso), mientras hay equipos con 3–11 niños de 16.

| Año | Interesados | Plazas (equipos reservados × 19) | Qué pasa |
|---|---:|---|---|
| Mayores (17 y 18 años) | 518 | 24 equipos (A y C) = 456 | **faltan unas 60 plazas (orden de magnitud): 97 sin equipo** |
| 16 años | 266 | 17 equipos (B y D) = 323 | **sobran unas 57 plazas: equipos de 3 a 11** |

> **Aquí se decide:** que **los equipos estén reservados por año**: A y C para mayores, B y D para los de 16; el máximo es de 4 equipos por club. Con dos años mayores y uno solo de 16, la mitad de los equipos se queda sin niños y la otra mitad se desborda. *Alternativas:* equipos de juvenil por nivel con los tres años mezclados (como los medianos y pequeños en el reglamento); más de 4 equipos por club en juvenil (hasta 5); o dos equipos «primer año» (B y D) menos.

**Otras reglas en juvenil:** hoy 33 equipos llegan y **80 niños** quedan en equipos que no llegan. Por año con máximo 18: 15 equipos y 438 niños sin equipo; por año con máximo 22: 34 equipos y 74 niños; **mezclando años con máximo 18: 42 equipos y 13 niños; con máximo 22: 42 equipos y 0**. (Tabla por club en `juvenil-33.md`.)

**Paso 7 (verano).** Se repite el patrón: club_grande «acomoda» 15 niños y se queda con 4 equipos justos, club_pequeno2 echa a 22 y baja de 4 a 3 equipos. Al final del verano 3 equipos siguen bajo mínimo (el D de club_grande con 8, el D de club_mediano3 con 8, el B de club_pequeno2 con 12).

## Cómo lo hace un club de verdad

Un club real **empieza por lo que tiene**, no por lo que le gustaría tener. Con el colegio del personaje en benjamín como ejemplo (24 niños de 8 años y 20 de 9):

| Paso | Un club de verdad | Lo que hace el juego hoy |
|---|---|---|
| 1 | Cuenta cuántos tiene de cada año: **24 y 20**. | Lo sabe, pero lo usa solo para ordenar los equipos. |
| 2 | Calcula cuántos equipos **puede** sacar: 44 niños → **3 equipos de 14–15** (o 2 de 22 si admite convocatorias). | Quiere 2 y luego un tercero porque «44 ≥ 42». |
| 3 | Reparte los niños **entre los equipos por igual**, aunque mezcle años en los de abajo. | Llena el A (18) y el B (18) y deja el resto al C (8). |
| 4 | Si le falta alguno para un equipo, **ficha** o pide al colegio (o decide no sacar ese equipo). | El equipo se arma con lo que sobra y puede salir con 9. |
| 5 | Si le sobra gente, hace **lista de espera** o sube el máximo. | Los que no caben por año dejan el club (club_grande: 24 niños). |

El hueco de la estructura es el paso 2: el juego **decide el número de equipos antes de saber cuántos hay de cada año** y con la cuenta del total del club.

## Qué decidir con el usuario (en este orden)

1. **¿Un equipo es de un año o de un nivel?** (P3, P6, P7). Las cuentas dicen que, por año y con 18 o 22, los equipos no llegan a 14 en benjamín ni en juvenil; mezclando años, sí (benjamín 34 de 34, juvenil 42 con 13 niños fuera a 18 y 0 a 22). Si se mantiene «por año», habrá que decidir qué hacer con los años sueltos (¿un equipo de 24?).
2. **¿Cómo se decide el número de equipos de un club?** (P2). Hoy, `niños del club ≥ 14 × equipos`. Alternativa: `equipos = niños ÷ 14` repartidos por igual, y solo se monta el equipo t si hay 14 niños para él.
3. **¿Cada club pide 18 + 18 antes que nadie?** (P1). 13 clubes de 36 son 464 niños: casi toda la bolsa. Alternativa: pedir primero lo que el total permite.
4. **¿Qué pasa con quien no cabe?** (P4, P5). Hoy deja el club. Alternativas: otro equipo del mismo club antes de irse; o una lista de espera con aviso al personaje.
5. **Máximo por equipo y por categoría** (P7). 18 hoy (más 2 plazas de más); 22 solo si hay convocatorias (16 por partido): en benjamín y alevín, mejor evitarlo.
6. **Juvenil** (P6). Equipos reservados por año con 4 máximo no encajan con tres años de edad y 18 sin colegio; ¿por nivel? ¿hasta 5 equipos?

No se ha implementado nada de esto: las cifras de «Otras reglas» son solo cuentas sobre los niños de cada club, no una prueba del juego (el efecto en los fichajes, los ascensos y la liga solo se sabría al aplicar la regla).

## Variante paso1-14x2 (semilla 33): la primera ronda con 14 de cada año

`npm run reparto:paso -- 33 grande benjamin --variante paso1-14x2` (y `juvenil`): cada club recoge 14 de 1.er año y 14 del resto de años, sin completar con el otro año; el resto igual (orden, atractivo, colegios con sus alumnos). Se para tras la primera ronda. Es una bandera de medida (`DIAGNOSTICO.variantePrimeraRonda`, apagada por defecto: la huella no cambia). Salidas completas en `reparto-paso-a-paso/variante-paso1-14x2-*.md`.

| | Benjamín | Juvenil |
|---|---:|---:|
| Equipos formados (uno por año con 14 o más) | 26 | 22 |
| Niños asignados | 364 | 344 (36 en equipos de menos de 14 de su año) |
| Bolsa antes · después | 554 · 190 | 784 · 440 |
| Quedan de 1.er año · del resto | 98 · 92 | 101 · 339 |
| …se quedan en su colegio | 35 · 40 | 16 · 19 |
| …quieren probar fuera | 63 · 52 | 85 · 320 (170 sin colegio) |

Benjamín: los 13 clubes llegan a 14 + 14. Juvenil: 11 de 13 llegan; el colegio del personaje (6 + 12) y colegio2 (5 + 13) se quedan sin equipo por año, porque los clubes de fuera van primero y se llevan a sus alumnos.

## Variante paso2-3 (semilla 33): subir titulares y completar desde la bolsa

`npm run reparto:paso -- 33 grande benjamin --variante paso2-3` (sale de benjamín a cadete; juvenil queda fuera). Sobre el paso 1 (14 + 14): **paso 2**, solo infantil y cadete: de los 28 de cada club se calcula la alineación del juego (`convocarYAlinear`) y los de 1.er año que salen titulares suben al A; **paso 3**: cada equipo (A con el resto de años, B con 1.er año) se completa desde la bolsa hasta 18 (benjamín y alevín) o 20 (infantil y cadete), con el mismo orden, atractivo y colegios, sin prueba. Los niños entran «solo por hueco» y respetando los cupos por puesto (nadie desplaza a nadie). Salida completa: `reparto-paso-a-paso/variante-paso2-3-33.md`. Bandera de medida `DIAGNOSTICO.variantePaso23`, apagada por defecto.

> **Corrección (24/11):** una primera versión de esta variante dejaba que un niño nuevo desplazara a otro del equipo (regla de plaza por mérito) y contaba a los desplazados como si siguieran en él; las plantillas salían 2–6 niños más llenas de lo real y la bolsa, más grande. Las cifras de abajo son las corregidas.

| | Benjamín | Alevín | Infantil | Cadete |
|---|---:|---:|---:|---:|
| Paso 2: suben al A (de 182) | — | — | 58 | 66 |
| Paso 2: clubes con el B por debajo de 14 | — | — | 13 de 13 | 13 de 13 |
| Paso 3: equipos | 26 | 26 | 26 | 26 |
| Niños por equipo (mín · máx · media) | 17 · 18 · 17,9 | 16 · 18 · 17,8 | 10 · 20 · 17,9 | 12 · 21 · 18,0 |
| Equipos por debajo de 14 | 0 | 0 | 6 | 4 |
| Niños asignados | 466 | 462 | 465 | 468 |
| Bolsa: 1.er año · resto | 47 · 41 | 47 · 13 | 0 · 58 | 2 · 73 |

## Variante paso4 (semilla 33): completar el B con niños de 2.º año (solo infantil y cadete)

`--variante paso4` (hasta 20) o `--variante paso4-14` (hasta 14). Sobre paso2-3: el B que no llega a 14 con niños de 1.er año se completa con niños de 2.º año de la bolsa (primero los colegios con sus alumnos, después el resto en el orden de siempre); el B pasa a ser mixto. Si con el cupo por puesto no llega a 14, entran sin mirar el cupo hasta 14. Salidas: `variante-paso4-hasta-20-33.md` y `…-hasta-14-33.md`.

| | Infantil hasta 20 | Infantil hasta 14 | Cadete hasta 20 | Cadete hasta 14 |
|---|---:|---:|---:|---:|
| B que se completan | 5 | 5 | 3 | 3 |
| Entran de 2.º año | 34 | 10 | 15 | 4 |
| Niños por equipo (mín · máx · media) | 13 · 20 · 19,2 | 13 · 20 · 18,3 | 13 · 21 · 18,6 | 13 · 21 · 18,2 |
| Equipos por debajo de 14 | 2 | 2 | 1 | 1 |
| Niños asignados | 499 | 475 | 483 | 472 |
| Bolsa: 1.er año · resto | 0 · 24 | 0 · 48 | 2 · 58 | 2 · 69 |

## Variante paso5-6 (semilla 33): reagrupar y sortear la bolsa (infantil y cadete, B mixto hasta 20)

`--variante paso5-6`. **Paso 5:** el club con un equipo que sigue bajo 14 junta a todos sus niños de la categoría y los divide en dos equipos por nivel (el A, los mejores); si no llegan los dos a 14, el B desaparece y sus niños vuelven a la bolsa. **Paso 6a:** cada colegio forma un C mixto (14 a 20) con sus alumnos de la bolsa que quieren seguir en su colegio. **Paso 6b:** lo que queda se sortea entre los clubes externos (el mismo sorteo de siempre, por club y categoría; los que querían su colegio y no han formado C ya los pueden ver los de fuera): cada uno monta un equipo nuevo (C y luego D) de 14 mientras queden 14 en la bolsa, y el resto de la bolsa entra en esos equipos hasta 20. Salida: `variante-paso5-6-33.md`.

| | Infantil | Cadete |
|---|---:|---:|
| Paso 5: clubes que se reagrupan | colegio y colegio2 (A 20 + B 13 → 17 + 16) | colegio (A 17 + B 13 → 15 + 15) |
| Paso 6a: colegios que forman C | ninguno (0 alumnos que quieran seguir) | ninguno (1 en colegio1) |
| Paso 6b: equipos nuevos | 1 (club_mediano, C: 14 + 6 = 20) | 4 (club_grande C 18; club_pequeno3, club_mediano3 y club_pequeno5, C de 14) |
| Equipos (A · B · C · D) | 27 (13 · 13 · 1 · 0) | 30 (13 · 13 · 4 · 0) |
| Niños por equipo (mín · máx · media) | 16 · 20 · 19,2 | 14 · 21 · 18,1 |
| Equipos por debajo de 14 | 0 | 0 |
| Niños asignados | 519 | 543 |
| Se quedan fuera | 4 (de 2.º año, de colegios sin club; querían probar fuera) | 0 |
