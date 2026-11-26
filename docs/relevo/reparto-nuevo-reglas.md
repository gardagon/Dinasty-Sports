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

## Paso 8. Último paso: normalizar y equilibrar letras (todas las categorías **salvo juvenil**)

Se aplica **al final**, porque el reparto ha sido «a boleo» y un C puede ser mejor que un A. Bandera de medida: `variantePaso23.equilibrar`. Tres partes, en este orden.

### 8a. Nunca un B sin A (regla general; el usuario, 24/11)

Si un club no puede montar su **A** (el A tiene menos de 14), se juntan **A y B en un único A mixto**:
- si son 14–22, ese es el A del club;
- si pasan de 22, **salen los peores por puesto** (como en el recorte de juvenil: el peor del grupo de puestos que más se pasa de su cupo de 22) y buscan sitio (8c);
- si **no llegan a 14, ese equipo desaparece** y todos sus niños pasan a la bolsa y buscan sitio (8c).
Los equipos C y D del club se corren de letra (C pasa a B, D a C…): nunca hay una letra sin la anterior. **Nota para los veranos:** el curso siguiente ese club podría volver a montar su equipo con alumnos del colegio que decidan volver, si los hay (por decidir con los veranos). En juvenil la regla ya la cumple J1 (3 equipos, 2, uno mixto o ninguno): comprobado, 0 de 260 clubes con B o C sin A.

**Extensión (24/11, medida con chicos y chicas por separado):** un **B, C o D que no llega a 14 con el A completo tampoco existe**: desaparece y sus niños buscan sitio (8c), igual que el A+B de menos de 14. Con la población completa no ocurría (0 casos en 40 semillas); con la mitad de niños (sin las ~45 % de chicas de más) aparece en benjamín y alevín (un B de 1, de 7…).

### 8b. Equilibrar letras

| Letras del club | Qué se hace |
|---|---|
| **A, B, C y D** | **A con C** y **B con D** se juntan y se reparten: al A (y al B) los mejores, primero los titulares de la alineación del juego y luego por valor respetando cupos de puesto; el tamaño de A y de B se mantiene. Si un **«subido» del B al A** ya no entra entre los mejores del A, **vuelve a bajar al B** (compite en el B∪D; el B crece en tantos como bajen, hasta 22; el C encoge). |
| **A, B y C** | Se juntan todos y se monta: **A** = los mejores de 2.º año + los titulares de 1.er año (con el tamaño que tenía); **B** = solo de 1.er año (con el tamaño que tenía); **C** = mixto con lo que sobre. Si con los titulares de 1.º arriba al B no le quedan 14 de 1.er año, el más flojo de esos titulares **se queda en el B** y el A coge al siguiente de 2.º año (repetir hasta 14; regla añadida por Claude y aprobada por el usuario). |
| A y B, o solo A | Sin cambios. |

**Un equipo nunca pasa de 22** (decisión del usuario). Si al equilibrar el C (o el D) sale con más de 22: **primero se llenan el A y el B hasta 22** con los mejores que les valgan (al B, en el caso A, B y C, solo de 1.er año; en A, B, C y D el D llena el B); si aun así sobran, **los que sobran se expulsan, los peores por puesto, y buscan sitio** (8c). No se deja el club sin equilibrar. (Un C así solo ocurre cuando el A y el B no pueden absorber: por ejemplo, un B de solo 1.er año ya completo. Si queda hueco en A o B, ahí van primero.)

El paso mantiene el tamaño de A y de B, salvo el relleno hasta 22 anterior. Si tras todo esto algún equipo del club siguiera fuera de 14–22 (no ha pasado en 20 semillas), el club se queda como estaba y se anota.

### 8c. Los expulsados y los de equipos desaparecidos buscan sitio

Como los descartes de juvenil: por valor (los mejores primero), cada niño busca un equipo de **otro club** (los colegios, solo sus alumnos), de 14 a 21 niños (cabe uno más hasta 22), en este orden de letras: B (si es mixto o el niño es de 1.er año), A, C, D; con `intentarEntrar` solo por hueco y sin prueba, y una segunda pasada sin mirar el cupo del puesto. El que no encuentra sitio queda en la bolsa, fuera ese curso.

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


## Sexos (24/11/2026, medida; **sin aplicar**: el usuario decide)

Orden aprobado: **primero las chicas, después el reparto de ambos sexos y luego los veranos.** Todo como bandera de medida (apagada: la huella no cambia). Resultados con 10 semillas (51–60): `reparto-nuevo-sexos.md`.

1. **Población real de chicas (~10 %).** Dato: licencias RFEF 2024/25, 10,1 % de las licencias de fútbol son de mujeres. Cómo se mide: un **sesgo del interés por el fútbol según el sexo** (`SESGO_DE_SEXO.chicas`, `modules/npcs/src/deportistas.ts`; `interesDe`): solo el 11 % de las chicas conserva su interés por el fútbol (con ~50 % de chicas en el mundo, `0,11/(0,11+1)` deja el 10 % entre los que quieren jugar). Resultado: 9,1–12,0 % de chicas según la categoría (media de 10 semillas: 9,8 · 10,0 · 10,9 · 12,0 · 9,1 de benjamín a juvenil). Para dejarlo como dato del país: un campo por país y deporte (por ejemplo `PaisDef.deportes.futbol.chicas = 0,10`) del que sale esa fracción. **Con los chicos igual, el total de los que quieren jugar cae de ~560 a ~315 por categoría** (el 45 % de la población de jugadores eran chicas): cada categoría queda en ~290 chicos y ~30–40 chicas.
2. **Benjamín y alevín mixtos; desde infantil separados.** Desde infantil (12 años, la edad mínima de infantil) el reparto se hace **por separado**: los chicos con el reparto de arriba y las chicas con el mismo método, cada uno con su propio equipo por club. Cómo se mide: dos mundos de la misma semilla, uno con solo los chicos de infantil, cadete y juvenil (`--solo=m`) y otro con solo las chicas (`--solo=f`), con todos los clubes disponibles para cada sexo (el equipo femenino de un club es independiente del masculino).
2b. **Regla base (el usuario, 24/11): desde infantil los equipos femeninos solo existen en los clubes externos, no en los colegios.** Más chicas por club y se puede formar una liga femenina pequeña. Las alumnas de un colegio que quieran jugar van a un club externo (con el atractivo y el sorteo de siempre; el colegio no las «retiene»: no hay `quedan` desde infantil en el mundo femenino). Medida: `--sin-colegios` (`SESGO_DE_SEXO.sinColegios`).
3. **Chica sin equipo femenino:** hasta alevín juega con chicos (mixto). Desde infantil, solo si no hay equipo femenino a su alcance (decisión 3 del usuario): se mide con los huecos de los equipos de chicos (22 menos su tamaño) frente a las chicas sin equipo, sin aplicarlo.

## Veranos (25/11/2026, medida; sin decidir el diseño): `veranos-sexos.md`

Con el reparto nuevo de inicio, un verano con las reglas de hoy deshace 5–11 equipos por categoría y deja 0,1–1,3 por debajo de 14; el método nuevo adaptado al verano (los mismos pasos con los equipos que ya existen, `draftDeUnaCategoria(..., verano)`) no deja ninguno por debajo de 14 pero deja fuera a 12–43 niños de 1.er año por categoría. Antes de nada hay que arreglar que el resto de la creación (`cubrirGruposVacios`, `sinSobrantes`, `plazasDeMas`) mueve niños tras el reparto sin respetar las letras ni el máximo de 22 (4,7–12,8 equipos de menos de 14 en el estado a la semana 48). Detalle y tablas en `veranos-sexos.md`.

## Verano (25/11/2026, medida; decisiones del usuario en `veranos-metodo.md`)

El verano **no se vuelve a montar desde cero**: cada club conserva los equipos que tenía en cada categoría y solo se elimina un equipo que no llega a 14 (o se crea uno si sobran 14 que no caben). Pasos: la **lista de abandonos** (último recurso de los colegios), los que buscan fuera a una **reserva**, el barrido de los clubes externos de más a menos atractivo, los colegios (con la lista de abandonos; si no llegan a 14, el equipo se deshace y sus niños prueban de la media tabla para abajo) y la reorganización final por letras dentro de los equipos que ya hay (A = 2.º año + los mejores de 1.º, B = 1.º, C mixto; en juvenil A = 3.º, B = 2.º, C = 1.º). **Benjamín y alevín: equipos de 18**; los benjamines nuevos y los demás llenan los equipos que hay hasta 18; con lo que sobra, equipos nuevos de 14 a 18 (en los clubes con menos equipos primero; máximo 4 por club y categoría; 2 los grandes en benjamín); solo los que aun así se quedarían sin equipo entran hasta 22. **La última pasada** deja entrar a quien no cabe sin mirar el cupo de su puesto, y da una última oportunidad a los desplazados que gastaron sus dos pruebas. En juvenil, los que se quedan sin equipo prueban en los clubes por cercanía de nivel (primero el club cuyo nivel —media de sus 11 mejores— se parece más al suyo, luego el siguiente más cercano…), con 6, 4 o 3 pruebas según el interés; si un equipo pasa de 22, en el grupo de puestos más pasado baja el de 1.er año más flojo al equipo de abajo (A→B→C), si no lo hay sale el reserva de 2.º, y en el último equipo sale el más flojo del grupo (hasta 3 rondas) (`docs/relevo/veranos-metodo.md` §B14). `fijarEquipos` y `sinSobrantes` deben respetar las letras que decide el verano (como en el reparto de inicio).
