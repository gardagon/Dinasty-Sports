# El reparto nuevo del fútbol base: reglas completas, paso a paso

Especificación para implementarlo (24/11/2026). Hoy existe solo como **banderas de medida apagadas** (`DIAGNOSTICO` en `modules/npcs/src/draft.ts`; herramientas `tools/reparto-paso-a-paso.ts` y `tools/equipos-minimo.ts --nuevo|--equilibrar`), y no cambia el juego. Cifras medidas: `reparto-nuevo-10-semillas.md` y `reparto-nuevo-equilibrar.md`. Diagnóstico: `equipos-minimo.md`.

## Decisiones del usuario (resumen)

- Todo equipo lleva de **14 a 22** jugadores (benjamín a cadete; en juvenil también, pero ahí se acepta que se queden fuera).
- **No** se mueven niños de ningún año del A o B al C ("no es realista").
- Un equipo de 9 no se crea sin más: o se forma en las rondas de movimiento o se deshace y deja libres a los niños.
- Juvenil: "si se quedan fuera, se quedan fuera".
- **Solo ciudad grande con hogares.** No habrá ciudad pequeña en el futuro («el juego no tiene sentido sin gente suficiente»): no hay que adaptar este reparto a la ciudad de ahora (`actual`) ni a la de prueba (en `actual` sale peor que el actual: ver `reparto-nuevo-10-semillas.md` §4).
- Partidas guardadas: la regla nueva se aplica **a partir del verano siguiente**.
- Los veranos (cómo se mueve todo en los años siguientes) se decidirán después.

## Vocabulario

- **Año 1** = primer año de la categoría (benjamín 8, alevín 10, infantil 12, cadete 14, juvenil 16); **resto** = los demás años. Benjamín 8–9, alevín 10–11, infantil 12–13, cadete 14–15, juvenil 16–18.
- **Bolsa**: niños con interés por el deporte (interés > 0) que no tienen equipo en esa categoría. **Quedan** = los de la bolsa que quieren seguir en el club de su colegio (`losQueSeQuedan`); los demás prueban en clubes externos.
- Clubes de la ciudad grande: 9 externos (1 grande, 3 medianos, 5 pequeños; atractivo 60/50/40 %) y 4 de colegio (`colegio`, `colegio1`–`3`: solo reciben a sus alumnos).
- Se procesa **por categoría, de menor a mayor edad** (benjamín → juvenil). Una categoría no deja nada puesto para la siguiente (los máximos se restauran al acabar cada una).
- «Titulares» = la alineación del juego (`convocarYAlinear`: 11 titulares de entre los jugadores del equipo, por puestos). «Mejor» = valor en su puesto (`valorEnSuPuesto`), respetando los cupos por grupo de puestos (`cuposPorGrupo`).
- Entrar en un equipo = `intentarEntrar` con `soloHueco: true` (nadie desplaza a nadie), sin prueba; si hace falta llegar a 14, una segunda pasada con `relajado: true` (sin mirar el cupo del puesto).

## Paso 1. Primera ronda: 14 + 14 (`variantePrimeraRonda`)

Cada club, en el orden de siempre (externos por atractivo, luego colegios con sus alumnos), recoge **los 14 mejores de 1.er año y los 14 mejores del resto**, por valor, sin completar un año con el otro. Los externos pueden tomar a cualquiera; los colegios, solo a sus alumnos. Resultado esperado en la ciudad grande: 13 clubes con A (resto) y B (1.er año) de 14 (benjamín 26 equipos; en juvenil solo 11 de 13 clubes llegan).

## Paso 2. Subir titulares (solo infantil y cadete)

De los 28 de cada club se calcula la alineación del juego. Los de 1.er año que salen titulares **suben del B al A** (se recuerdan como «subidos»: el paso de equilibrar puede devolverlos).

## Paso 3. Completar desde la bolsa

Cada equipo (A con los años de resto, B con 1.er año) se completa desde la bolsa hasta el **máximo: 18 en benjamín y alevín, 20 en infantil y cadete**. Mismo orden y atractivo; solo por hueco y respetando cupos de puesto.

## Paso 4. B mixto hasta 20 (solo infantil y cadete)

El B que sigue por debajo de 14 se completa con niños de **2.º año** de la bolsa (primero los colegios con sus alumnos, luego los externos en el orden de siempre) hasta 20; pasa a ser **mixto**. Si con el cupo no llega a 14, se repite sin mirarlo.

## Paso 5. Reagrupar (solo infantil y cadete)

El club con un equipo (A o B) aún por debajo de 14 junta a todos sus niños de la categoría. Si son **28 o más**, los reparte en dos equipos por nivel (el A, los mejores; `ceil(total/2)` en el A). Si no, **el B desaparece** y sus niños vuelven a la bolsa.

## Paso 6. Equipos nuevos con la bolsa (solo infantil y cadete)

- **6a.** Cada colegio forma un **C mixto de 14 a 20** con sus alumnos de la bolsa que quieren seguir (14 o más). No forma C el que no llegue.
- **6b.** Lo que queda se sortea entre los clubes **externos** (sorteo de siempre, por club y categoría): cada uno monta un equipo nuevo (primero C, luego D) de 14 mientras queden 14 en la bolsa; el resto de la bolsa entra en esos equipos hasta 20. Los que querían su colegio y no han formado C ya los pueden coger los externos.

## Paso 7. Los que quedan fuera (infantil y cadete) · C y D (benjamín y alevín)

**Infantil y cadete.** Máximo 22 solo en este paso. Los que siguen en la bolsa van, por valor, a un **B mixto** de un club al que puedan ir (primero colegios con sus alumnos, luego externos por atractivo) y, si no caben, a un **A**; si no entran por el cupo de su puesto, lo intentan sin mirarlo. Con 10 semillas: nadie queda fuera.

**Benjamín y alevín (en lugar de los pasos 4 a 6, sobre el paso 3).**
- 6a. Cada colegio forma con sus alumnos de la bolsa que quieren seguir: **C de 2.º año + D de 1.º** (14 o más cada uno, de 14 a 22) si hay para ambos; si no, un **C mixto** de 14 a 22; si no llega a 14, nada y pasan a los externos.
- 6b. Con los demás se cuentan los equipos posibles: `pares = min(⌊r2/14⌋, ⌊p2/14⌋)` (C de 2.º + D de 1.º) y `mixtos = ⌊(r2 + p2 − 28·pares)/14⌋` C mixtos (r2 = niños de 2.º año, p2 = de 1.º). Se reparten entre los externos con el sorteo de siempre; el resto de la bolsa entra hasta 22.
- Un equipo de un solo año lleva de 14 a 22, igual que los mixtos (precisión del usuario).

## Paso 8. Equilibrar letras (todas las categorías **salvo juvenil**)

Se aplica **al final**, porque el reparto ha sido «a boleo» y un C puede ser mejor que un A. Bandera de medida: `variantePaso23.equilibrar`. Por club:

| Letras del club | Qué se hace |
|---|---|
| **A, B, C y D** | **A con C** y **B con D** se juntan y se reparten: al A (y al B) los mejores, primero los titulares de la alineación del juego y luego por valor respetando cupos de puesto; el tamaño de A y de B se mantiene. Si un **«subido» del B al A** ya no entra entre los mejores del A, **vuelve a bajar al B** (compite en el B∪D; el B crece en tantos como bajen, hasta 22; el C encoge). |
| **A, B y C** | Se juntan todos y se monta: **A** = los mejores de 2.º año + los titulares de 1.er año (con el tamaño que tenía); **B** = solo de 1.er año (con el tamaño que tenía); **C** = mixto con lo que sobre. Si con los titulares de 1.º arriba al B no le quedan 14 de 1.er año, el más flojo de esos titulares **se queda en el B** y el A coge al siguiente de 2.º año (repetir hasta 14). |
| A y B, o solo A | Sin cambios. |

Mínimo 14, máximo 22: si algún equipo del club saldría fuera de ese rango, **el club se queda como estaba** (y se anota: 2 casos en 20 semillas, ver `reparto-nuevo-equilibrar.md`).

## Paso 9. Juvenil (`variantJuvenil`, cascada del usuario) — sin equilibrar

- **J1.** Cada niño de la bolsa va a un club en un solo reparto, sin máximo, prueba ni cupos: su colegio si tiene club y quiere seguir; si no, un externo sorteado con peso por atractivo. Club con 14+ de cada año → 3 equipos (A 3.º, B 2.º, C 1.º); con 14+ de 3.º y 2.º juntos y 14+ de 1.º → 2 (A 3.º y 2.º, B 1.º); si no, uno mixto de 14+; si no, sin equipo.
- **J2.** De abajo arriba, con la alineación del juego: C→B y B→A los que serían titulares sin bajar de 14 al de abajo (los mejores primero); por encima de 22 se descarta al peor del grupo de puestos que más se pasa de su cupo.
- **J3** (3 rondas). Los descartados buscan equipo en otros clubes (colegios, solo sus alumnos), en el equipo de su año. Si está lleno y el que llega gana el puesto al peor de su puesto, ese **baja al equipo de abajo**: con hueco entra; si no, allí desplaza a alguien de su puesto de su año o más joven (el más joven y, entre ellos, el más flojo), que sigue bajando; si no lo hay, **sale libre el reserva** del puesto. El del último equipo sale libre. Los que quedan libres se quedan fuera.

## Lo que hay que cambiar en el código (fuera de las banderas de medida)

1. **`fijarEquipos` hoy deshace C y D.** Al acabar la creación vuelve a repartir las letras por el total del club (A con 2.º año y siguientes, B con 1.º, C con lo que sobra, hasta el máximo): en la ciudad grande con la variante entera salen 2 equipos con hasta 51 niños (`equipos-minimo --nuevo`, antes de leer los equipos de la traza). Tiene que **respetar las letras que decide el reparto** (`Npc.letra` fijado por el paso 8 y el 9, no recalculado).
2. El número de equipos de un club **no se decide con el total** (`miembros < minimo·t`, `montables = ⌊n/14⌋`, `equipoSinNinos`): sale de los equipos que de verdad se han formado (cada uno de 14 a 22).
3. El mismo reparto sirve **para el verano** (renovación: `fichajesDeVerano → reclutarEnTodos → completarEquipos`): pendiente de decidir; mientras, una partida guardada antes sigue como estaba hasta el verano siguiente.
4. La liga ya descarta los equipos de menos de 14 (`equiposDeUnaCategoria`); `plazaEnElEquipo` no mira el tamaño del equipo: con este reparto no hace falta, pero conviene comprobarlo con la plaza del personaje.
5. Un máximo de 22 por equipo (hoy 18 + hasta 2 «plazas de más»): hay que decidir cómo convive con `PLAZAS_DE_MAS`.
6. Ciudad pequeña / de prueba: **no se adapta** (decisión del usuario).
