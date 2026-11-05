# Ciudad grande, clubes, filiales y ligas

Decidido con el usuario el 02/11/2026. Es el mundo del fútbol base en el que juega el personaje: cuántos colegios y niños hay, qué clubes se forman, cómo se reparten en divisiones, qué son los filiales y cómo es la temporada (liga y copa). Parte de `VISION.md` (datos de verdad para todos, el mundo avanza solo) y de `MISMAS_REGLAS.md` (nadie tiene plaza reservada).

## 0. Lo que decidió el usuario

1. **Una ciudad grande, como Madrid o Barcelona:** hay niños y equipos de sobra.
2. **Dos divisiones de 10 equipos** por categoría (no de 14).
3. **Una copa por eliminatorias**, como la Copa del Rey. Un club juega dos torneos, **uno detrás del otro** (primero la liga y después la copa), no a la vez como en la vida real. Es como ya funciona la temporada del atletismo, con la competición regular primero y después semifinales y final.
4. **Filiales:** en los clubes que los tienen, los de primer año de la categoría suelen estar en el filial y en su segundo año pasan al primer equipo. Un primer año que destaca puede subir antes, pero no es lo normal.

## 1. Qué se simula: la zona del personaje

No se puede simular una ciudad de tres millones de habitantes. La federación organiza el fútbol base por zonas, así que **se simula la zona del personaje entera**, con datos de verdad para todos: sus colegios, sus niños, sus clubes y todas sus ligas y copas. El resto de la ciudad aparece más adelante con los **clubes de élite** (F5 de `ANALISIS_FUTBOL.md`), que fichan en toda la ciudad, también en la zona.

Dentro de la zona no se recorta nada: todos los equipos entrenan, todas las ligas se juegan y todos los niños crecen (`VISION.md`, principio 3).

## 2. Población: colegios y niños

| | Ahora | Ciudad grande |
|---|---|---|
| Colegio del personaje | 2 clases de 25 por curso (con el #60) | Igual |
| Otros colegios | 4, con 17 por curso | **9, con 2 clases de 25 por curso** (de 1 a 2 clases, como uno de verdad) |
| Niños por año de nacimiento (8–17) | ~118 | **~500** |
| Jóvenes de 18 y 19 (ya sin colegio) | Pocos | En proporción (~250 por edad) |
| Personas en total | ~1.100 (unas 1.400 con familias y entrenadores) | **~6.000** |

El número de colegios y el de clases por curso son **datos de la ciudad**, no números fijos en el código: así un país o una ciudad distinta trae los suyos (`PAQUETES_DE_PAIS.md`).

**Por qué 500 por año:** con unos 250 interesados en el fútbol por año (aproximadamente la mitad, contando a todos como hasta ahora), una categoría de dos años tiene unos 500 jugadores. En plantillas de 14 a 18 salen **unos 30 equipos por categoría**: Primera (10), Segunda (10) y una Tercera con el resto. Eso son los «equipos de sobra». Si la medida del coste (§8) obliga a ajustar, se toca el número de colegios, nunca los datos de cada persona.

## 3. Clubes

Cada club tiene un **tamaño**, que es un dato y decide cuántos equipos saca por categoría y en qué orden recluta:

| Tamaño | Cuántos en la zona (orientativo) | Equipos por categoría | Recluta |
|---|---|---|---|
| Grande | 4 | Hasta cuatro (A, B, C y D), por año (§5) | Primero, por lo que vale cada niño, en todos los colegios |
| Mediano | 6 | Hasta cuatro, por nivel (§5) | Después |
| Pequeño y club de colegio | 8–10 | Hasta cuatro, por nivel (§5) | Al final. El club de un colegio, antes entre sus propios alumnos |

- **El club del colegio del personaje es un club pequeño más.** Un personaje del montón cabe en él, o en el filial de uno mediano. Llegar al A de un grande exige ser bueno de verdad.
- **Los equipos se abren y se cierran según la demanda** (decisión del usuario, 03/11/2026): el objetivo es que un personaje del montón siempre encuentre equipo en su categoría y que lo difícil sea subir, no entrar. En cada categoría, **si quedan sin equipo al menos tantos interesados como el mínimo de una plantilla (14), un club abre otro equipo** (con su entrenador): el club con menos equipos en la categoría y, a igualdad, el que tiene más demanda y el más grande (hasta 4 por club y categoría). El equipo nuevo nace con los **mejores de los que se habían quedado sin equipo, hasta el mínimo**: con huecos, de modo que quien vale menos también puede entrar por la regla de plaza. **Un club cierra el equipo que no llega al mínimo de jugadores**: se va con su entrenador y los que sobran buscan club. Dentro de cada equipo no cambia nada: si está lleno, entra quien vale más que el peor. Cuando lleguen los filiales (F2), el segundo equipo será el B. Se aplica al crear la partida (que empieza dentro del plazo de fichajes) y cada verano, después de los fichajes y del relleno de las plantillas (`equiposPorDemanda`).
- **El personaje puede apuntarse a cualquier club de la zona** con la regla de plaza (hueco, o ser mejor que el peor del equipo de su categoría), dentro del plazo de fichajes: acción «Apuntarte a…» en la secretaría de los clubes, en el campo municipal (`futbol.apuntarse.<club>`). A todos los clubes de la zona se entra con una **prueba de acceso** (hecha en la parte 3, 08/11; ver §5); la de los clubes de élite del atletismo es la de siempre.
- Cada club tiene su **entrenador por categoría** (y otro para el filial), PNJ con sus datos, como ahora.
- **Esto sustituye a los «clubes de fuera» de `MISMAS_REGLAS.md` §7 bis:** los clubes de fuera son los clubes de la zona. Las reglas de §7 bis siguen igual (reclutan los mejores primero, cada niño decide según su ambición, sus padres y la plaza, y cada verano se ficha).

## 4. Divisiones, ascensos y descensos

- **En cada categoría hay Primera (10 equipos), Segunda (10) y Tercera** con el resto, en grupos de unos 10. Cada categoría tiene sus propias divisiones: que el benjamín A de un club esté en Primera no dice nada de su alevín A.
- **Liga a doble vuelta:** 18 jornadas en un grupo de 10.
- **Ascensos y descensos: suben 2 y bajan 2** entre cada par de divisiones (dato del deporte por país). Con varios grupos en Tercera, suben los campeones y, si hace falta, los mejores segundos.
- **La plaza es del equipo del club** (el «Benjamín A del club X»), no de los niños, que cambian de categoría cada año.
- **Al crear la partida,** las divisiones se reparten por lo que vale cada equipo: los A de los grandes empiezan casi siempre en Primera.

**Reglas del filial** (como en la vida real, adaptadas a tres niveles):
1. **El A y el B de un club no están en la misma división**, salvo en la última (Tercera), y allí en grupos distintos si los hay.
2. **Un filial no sube a la división de su primer equipo:** si queda en puesto de ascenso, sube el siguiente.
3. **Si el primer equipo baja a la división de su filial, el filial baja una más.** Si ya estaba en Tercera, se queda.

## 5. Los equipos de cada club: A, B, C y D, por puestos (decisión del usuario, 03/11)

Sustituye a los filiales de antes (que eran solo A y B en los grandes, para la F2). Va antes de la P2c.

**Hasta cuatro equipos por club y categoría.** Cada club abre los que le permiten sus jugadores.

| Club | Cómo reparte |
|---|---|
| **Grandes** (los «top») | **Por año:** **A**, los de segundo año más los de primer año que destacan (los que serían titulares en el A, como al subir de categoría); **B (filial)**, los de primer año, y solo los mejores; **C**, los de segundo año que no entran en el A; **D**, los de primer año que no entran en el B. En juvenil, que tiene tres años, «segundo año» es segundo y tercero |
| **Medianos, pequeños y el del colegio** | **Por nivel, con los años mezclados**, como los grupos de un colegio: el A con los mejores, el B con los siguientes, y así |

- **Los equipos de más (C y D en un grande) salen de los propios jugadores del club**, no de los que sobran en la ciudad: que el Real Ciudad tenga un C no le abre la puerta del club grande a cualquiera.
- **Un primer año en el A de un grande, de 0 a 2 por club y temporada**, casi nunca más. La simulación lo vigila (§9). Si salen muchos más, se sube el listón, sin tocar a nadie en concreto.

**Todo por puestos** *(hecho: puestos, reparto de la plantilla, regla de plaza por puesto y aceptación según el carácter en la parte 1, 06/11; equipos A–D en la parte 2, 07/11; prueba de acceso, puesto elegido y consejo del profesor en la parte 3, 08/11)*. No tiene sentido un equipo con once delanteros, y nadie (ni un PNJ ni el personaje) se limita a un único puesto: el descarte de un delantero puede ser un gran extremo.
- **Se calcula el nivel de cada jugador en cada puesto** (los 16 del JSON del fútbol: portero, centrales, laterales, mediocentros, bandas, mediapuntas, extremos y delanteros), con sus habilidades y las afinidades de cada puesto (se adelanta esa parte de la F3; los roles y la experiencia en cada puesto siguen en la F3).
- Cada plantilla tiene un **reparto por puestos** (dato del deporte; propuesta para 18: 2 porteros, 3 centrales, 3 laterales, 4 mediocentros, 3 de banda o extremos y 3 delanteros).
- **La regla de plaza va por puesto:** un club mira al candidato en todos los puestos y le ofrece aquel en el que entraría (con hueco en ese puesto o valiendo más que el peor de ese puesto).
- **Cada uno tiene un puesto favorito.** Si el club le ofrece otro, un PNJ lo acepta o no según su carácter (propuesta: más fácil cuanto más disciplinado y sacrificado sea, cuanto más se parezca el puesto al suyo y si en él sería titular). Si acepta, se queda en el equipo en ese puesto; si no, busca sitio en otro club.
- **El personaje igual, decidiendo él:** hace la prueba en el puesto que elige, pero el entrenador le puede proponer otro en la prueba, y él decide si acepta.

**Equipos según la demanda, con movimiento:**
- Primero se llenan todos los equipos.
- Si los que se han quedado sin equipo, **más los suplentes de otros equipos que serían titulares en uno nuevo**, llegan al mínimo, se abre otro equipo: en los clubes pequeños y en el del colegio primero; en los grandes, solo como su C o su D, con sus jugadores. «Mejor ser titular en un equipo nuevo que el 18.º en otro»: cada suplente decide si se va según su ambición.
- Los huecos que dejan los que se van los ocupa cualquiera con la regla de plaza, el personaje incluido. **No hay huecos guardados para nadie**: después de crear la partida y de cada verano, ningún interesado se queda sin equipo mientras haya hueco en su puesto en un club que lo coja.

**Entrar en un club de fuera: una prueba de acceso** *(hecho en la parte 3, 08/11)* (en el del colegio, no):
- Quien quiere entrar en un club que no es el de su colegio (el personaje o un niño) **hace una prueba**, que le puede salir mejor o peor: cuenta su estado, su forma del día y algo de azar, como una competición. **Lo que vale en la prueba es lo que cuenta para la regla de plaza.**
- **Con el equipo lleno en su puesto**, en todos los clubes, hay que superar en la prueba al peor de ese puesto, que sale del club.
- **Con hueco en su puesto (decisión del usuario, 05/11; sustituye al 0,9 de los medianos y el 0,8 de los pequeños):** el candidato se enfrenta en la prueba al **suplente que mejor cubriría ese puesto** si hiciera falta (por ejemplo, si falta un central, el lateral izquierdo suplente, que es quien jugaría de central si no hubiera ninguno). Si hay dos huecos en el puesto, el primer candidato se enfrenta a ese suplente y el segundo al siguiente que mejor lo cubriría (por ejemplo, el mediocentro suplente). **Si ningún suplente puede cubrir el puesto, entra**: el equipo no puede jugar sin él. Igual en todos los clubes de fuera, también en los grandes (cuyos suplentes ya son mejores) y para el personaje y los niños. Los suplentes son los que no están en el once del equipo, por el reparto por puestos. En el club del colegio, con hueco se entra, sin prueba.

**El puesto del personaje y el consejo del profesor de Educación Física:**
- El personaje puede **preguntar a su profesor de Educación Física** qué deporte y qué puesto le irían bien (el puesto, si el deporte lo tiene). El profesor le nombra **varios puestos** en los que podría funcionar, según lo que ve de él (lo que percibe, no los números exactos: `VISION.md`, principio 7).
- **Al apuntarse o al pedir una prueba, el personaje elige dónde quiere jugar**, y la regla de plaza se mide en ese puesto. El entrenador le puede proponer otro puesto en la prueba y él decide si lo acepta (hecho). Los roles y la experiencia en cada puesto, en la F3.
- El puesto favorito de un niño del mundo es, al empezar, aquel en el que más vale.

## 6. La temporada: liga y después copa

| Tramo | Cuándo (calendario de España) |
|---|---|
| Pretemporada | 4 semanas desde el inicio del curso, como ahora |
| Liga | 18 jornadas, los sábados de clase (de octubre a febrero o marzo, saltando vacaciones) |
| Copa | Al acabar la liga, 4 o 5 rondas (abril y mayo) |
| Final de la copa | En el estadio de la ciudad |

**La copa:**
- **La juegan los primeros equipos (A) de todos los clubes de la categoría.** Los filiales no, como en la Copa del Rey. Así cada club juega dos torneos.
- **Cuadro de 16.** Si hay más de 16 clubes, hay una ronda previa entre los peor clasificados de la liga que acaba de terminar. Si hay menos, los mejores clasificados pasan la primera ronda sin jugar.
- **A partido único, en el campo del equipo de división más baja** (si son de la misma, el del sorteo). La final, en el estadio.
- **Si hay empate, penaltis directamente,** sin prórroga, como en muchas copas de fútbol base. Al motor de partidos le hace falta una **tanda de penaltis** (`MOTOR_PARTIDOS.md`): cada penalti es un duelo entre el que tira y el portero, con sus habilidades y su estado.
- El formato es un dato del deporte por país: `TemporadaDeDeporte` admite una liga por divisiones y, detrás, una copa por eliminatorias (campos opcionales, sin romper el atletismo).

Sobran semanas: 18 jornadas más 5 rondas de copa son 23 sábados de los ~30 que tiene un curso.

## 7. El verano: plazo de fichajes y plantillas nuevas

**Decidido por el usuario el 03/11/2026, igual para el personaje y los PNJ y para todos los deportes** (la regla está en el kit del deporte; las fechas, en los datos del deporte por país).

**El plazo de fichajes va del verano a la primera competición del curso** (en el fútbol, la primera jornada de liga; en el atletismo, la primera carrera). Sale de la temporada de cada deporte en cada país (`semanasDePretemporada`) y del calendario del país (`plazoDeFichajesAbierto` en `contracts`). En España, de la semana 42 del curso (el verano) a la 4 del curso siguiente.

- **Dentro del plazo**, cualquiera puede entrar en un club o cambiarse: con hueco, entra; con el equipo lleno, entra quien vale más que el peor (`reglaDePlaza`, la misma para todos), y el desplazado busca otro club con hueco con la misma regla.
- **Fuera del plazo**, quien está en un club no puede cambiarse. Quien no está en ningún club puede entrar solo si hay hueco, sin sacar a nadie. Quien deja su club fuera de plazo no puede entrar en otro del mismo deporte hasta el siguiente plazo. La acción del personaje explica por qué no puede («El plazo de fichajes está cerrado hasta el verano…»).
- **Quien se queda sin equipo** (desplazado por otro que vale más), dentro del mismo plazo:
  1. Busca otro club de su deporte, del más grande al más pequeño, con la misma regla de plaza (si desplaza a su vez a otro, este hace lo mismo).
  2. Si no encuentra, **deja ese deporte al menos ese curso** (puede volver a intentarlo en el siguiente plazo) y busca club en **otro deporte que le interese**, con la misma regla y dentro del mismo plazo.
  3. Si ningún club de ningún deporte lo quiere, **deja el deporte para siempre**: deja de ser deportista y no vuelve a apuntarse.
  - **En el personaje** las restricciones son las mismas y **sale del club como cualquier niño** cuando otro que vale más le quita el sitio; lo único distinto es que las decisiones son suyas y que nunca se le retira del deporte para siempre. Se le avisa («Has perdido tu plaza…», qué ha pasado y qué puede hacer) y elige si prueba en otro club con la regla de plaza, en otro deporte o espera al siguiente plazo.

Cada verano, en este orden y para todos los clubes (todo dentro del plazo):
0. **Antes de empezar, al crear la partida** (que empieza dentro del plazo), se aplica lo mismo: los clubes reclutan, y si quedan sin equipo tantos interesados como el mínimo de una plantilla, abren equipos (§3).
1. Cada jugador sube de categoría si le toca, según su año de nacimiento.
2. **Los clubes fichan** por orden de tamaño (los grandes primero): miran a los mejores de los clubes más pequeños de su categoría (los tres mejores de cada equipo). Cada niño decide si se va según su **ambición** (eje del carácter), lo que **practicaron sus padres** y la **plaza** (con hueco, o siendo mejor que el peor del equipo) (`probabilidadDeFichar`: de 5 % a 95 %). Los desplazados buscan club como se ha dicho.
3. Cada club reparte entre el A y el B (§5) y completa sus plantillas con los interesados que quedan. Después, **los equipos según la demanda** (§3): se cierra el que no llega al mínimo y se abre otro si quedan sin equipo al menos tantos interesados como el mínimo de una plantilla. Quedan sin equipo, como mucho, menos interesados que ese mínimo por categoría.
4. Los ascensos y descensos de la temporada pasada ya están aplicados.

El personaje sigue las mismas reglas, sin plaza reservada. Puede pedir su prueba en un club (F5) o quedarse en el de su colegio.

## 8. Coste y requisitos

Esto multiplica por unas 5 la población, y por más el número de jugadores con datos de fútbol:

| | Cifra (orientativa, a medir) |
|---|---|
| Personas | ~6.000 |
| Jugadores con todos los datos de fútbol | ~2.400 (30 equipos × 16 × 5 categorías) |
| Partidos cada sábado de liga | ~75 |
| Peso de la partida | Hoy ~2 KB por persona: más de 12 MB solo de personas, más el fútbol y el historial |

Por eso:
- **Antes de subir la población hace falta el guardado por partes** (`ALMACENAMIENTO.md` §4, fase 2), y seguramente rasgos compactos (fase 3). Sus disparadores, unas 3.000 personas, se superan con mucho.
- **Tiempos que hay que mantener** (a confirmar con la medida; decisión del usuario, 05/11): **lo que importa es que la partida vaya fluida**: lo que tarda cada acción, avanzar una semana con todos los partidos (menos de ~1 s en un ordenador normal) y guardar sin que se note. **Crear la partida puede pesar** (personas, clubes, historia): hasta unos 30 s está bien, con una pantalla de «creando el mundo». Los tests que crean muchas partidas no deben depender de eso: usan la ciudad pequeña de prueba o un plazo propio por fichero.
- **Medida de fluidez** *(hecha el 05/11, `npm run fluidez`; semilla 31, fútbol y atletismo, 12 semanas de curso con el bot del montón)*: el factor multiplica los colegios de fuera, las clases del colegio del personaje y los vecinos (los clubes no cambian: abren equipos según la demanda, hasta cuatro por categoría, por eso los futbolistas se quedan en ~1.300).

| Población | Personas | Futbolistas | Crear | Estado | Guardar | Cargar | Acción (media / p95 / máx) | Semana (media / máx) |
|---|---|---|---|---|---|---|---|---|
| ×1 | 1.444 | 641 | 8 s | 3,4 MB | 44 ms | 0,1 s | 2 ms / 1 ms / 2,7 s | 0,87 s / 3,2 s |
| ×2 | 2.873 | 1.289 | 40 s | 6,7 MB | 75 ms | 0,2 s | 1 ms / 1,2 ms / 140 ms | 0,78 s / 1,0 s |
| ×5 | 7.061 | 1.319 | 250 s | 14,7 MB | 192 ms | 0,2 s | 1,3 ms / 1,8 ms / 185 ms | 1,24 s / 1,46 s |

  Lo que dice: **guardar y cargar no se notan** ni a ×5; **una acción normal cuesta 1–2 ms**; **una semana entera cuesta ~0,7–0,9 s a ×1** (en el límite) **y ~1,2 s a ×5**; **crear la partida** se sale del margen de 30 s ya a ×2 (40 s) y a ×5 es inviable (250 s: crece más que la población). Dos cosas que se salen: la **primera semana del curso tarda ~2,9 s** (es la acción de apuntarse a un club, que mide al desplazado y le busca club en los demás: 2,4 s, casi todo en valorar a los jugadores de los equipos con las habilidades de cada uno, una caché por llamada) y **crear la partida a ×2 y a ×5**. Pendiente para la P2c: guardar los valores calculados entre llamadas (para la acción de apuntarse) y bajar el coste de crear con más gente.
- **Si algo no cabe, se arregla calculando o guardando mejor, no recortando** (`VISION.md`, principios 4 y 5). El último recurso es tener menos colegios, nunca menos datos por persona.

## 9. Cómo se comprueba

En la simulación (`sim/src/analysis.ts`), con varias semillas:
- **Cada categoría tiene al menos Primera y Segunda llenas,** y la Tercera tiene al menos un grupo.
- **Primeros años en el A de los clubes con filial:** de 0 a 2 por club y temporada de media.
- **Los grandes suelen acabar arriba,** pero no siempre: hay ascensos de pequeños, y algún grande baja de vez en cuando.
- **La copa la gana a menudo un equipo de Primera,** pero no siempre.
- **Un personaje del montón encuentra equipo** cada temporada, y la prueba de cuándo llega al A de un club grande o mediano sale razonable (sin trato especial).
- **Los tiempos y el peso de §8,** con `npm run rendimiento`.

## 10. Por fases

| Paso | Qué | Población |
|---|---|---|
| 1 (en la P2 de `MISMAS_REGLAS.md`; **P2b-1 hecha**) | El número de colegios y de clases pasan a ser datos de la ciudad (con los valores de ahora; `CiudadDef` en `PaisDef.ciudad`, con una versión pequeña de prueba). Varios clubes con tamaño (en el fútbol: grande, mediano, pequeño y el del colegio, que es un pequeño más; los filiales llegan con la F2). Reclutamiento por lo que vale cada niño de verdad y regla de plaza única. Medir con `npm run rendimiento` la población de ahora, el doble y por cinco, con los datos de la P2 | La de ahora |
| 2 (con la F2 del fútbol) | Liga por divisiones con ascensos, descensos y reglas del filial; filiales y reparto entre primer y segundo año; copa con tanda de penaltis. Se prueba con una población de prueba más grande | La de ahora, o la que quepa |
| 3 (fase propia: la ciudad grande) | Guardado por partes (y rasgos compactos si hace falta) y después la población de §2, con su calibración | ~6.000 |

El orden de los pasos 2 y 3 lo decide la medida del paso 1. Si el guardado por partes llega antes, la F2 puede probarse ya con la ciudad grande.

## 11. Quién sigue en el mundo: abandono, archivo, profesiones y gente de fuera (ideas del usuario, 03/11; pendiente de diseño)

Ideas del usuario para tenerlas en cuenta; todavía no se han encargado. Las dos preguntas que hice las contestó el 03/11 (abajo).

**1. Menos equipos en cadete y juvenil, como en la vida real.** A esas edades muchos niños empiezan a hacer otras cosas y dejan el deporte. Propuesta para que salga solo, sin fijar el número de equipos por edad:
- Cada verano, cada deportista decide si sigue. La probabilidad de dejarlo sube con la edad (sobre todo desde cadete) y pesan su interés, su ambición, los minutos o las carreras que tuvo, sus estudios (más en 4.º de la ESO y en bachillerato) y lo que hacen sus padres. El personaje ve los mismos motivos, pero lo de seguir lo decide el jugador.
- Un club solo saca equipo en una categoría si llega al mínimo de la plantilla. Si no llega, ese curso no lo tiene y sus jugadores buscan otro club con la regla de plaza. Los primeros en quedarse sin equipo son los clubes pequeños.
- Con la ciudad grande, los «unos 30 equipos por categoría» de §2 serían menos en cadete y juvenil. Las probabilidades se calibran midiendo cuántos equipos quedan por categoría.

**2. Qué pasa con cada PNJ al salir del colegio (18 años)** o, si ya había salido, al dejar el deporte. Se decide en ese momento y no antes, para que un niño que dejó el deporte a los 15 todavía pueda servir para una profesión a los 18.

| Situación | Qué pasa |
|---|---|
| **Sigue en el deporte** | Sigue con todos sus datos. **Los mejores pasan a sénior y a profesional**, y ahí se siguen simulando |
| **Puede trabajar en una profesión del juego** (ojeador, entrenador, entrenador asistente que entrena unas habilidades concretas, fisioterapeuta…) | Sigue con todos sus datos y puede acabar en ella: así se reutiliza gente del mundo en vez de crearla de cero. El potencial para cada profesión saldrá de sus capacidades, su conocimiento y su historial, cuando se diseñen las profesiones |
| **Ha tenido relación con el personaje** | Sigue: forma parte de su vida |
| **Practicó deporte**, pero lo ha dejado, sin relación con el personaje ni potencial para una profesión | **Se archiva:** queda una ficha pequeña (nombre, sexo, fecha de nacimiento y colegio) y su historial deportivo (temporadas, clubes, categorías y cifras), para que las clasificaciones y las plantillas de cada temporada sigan siendo ciertas. Deja de simularse (sin capacidades, habilidades, estado ni agenda), no aparece por la ciudad y no vuelve |
| **Nunca practicó deporte**, sin relación con el personaje ni potencial para una profesión | **Se borra:** no aparece en ningún historial, así que no hace falta ni archivarlo |

- **«Haber tenido relación con el personaje»** (aprobado por el usuario): que lo conozca, que tengan relación, que haya sido su compañero de equipo o de clase, o que sea de su familia. Haber corrido alguna carrera contra él no cuenta.
- **Por qué no choca con `VISION.md`:** se guarda todo lo que el mundo que se juega necesita, y quien se archiva o se borra ya no está en ese mundo. Es lo que hace Football Manager con los jugadores retirados.
- **Lo que aporta:** con la ciudad grande, buena parte de la población sale del mundo con los años, lo que aligera el guardado y el avance semanal. El archivo casi no cambia, así que encaja con el guardado por partes (`ALMACENAMIENTO.md`).

**3. Gente de fuera para los equipos de nivel nacional.** A medida que el personaje crece (las mejores divisiones juveniles, el sénior y el profesional), las competiciones nacionales necesitan equipos de otras ciudades y de otros países. Se crean cuando hacen falta, para los niveles que existan en ese momento, **con sus datos de verdad y su historia** al crearlos (como los niños de la ciudad en la P1 y la P2) y con nombres de su origen (`ANEXO_NOMBRES.md`). Siguen las mismas reglas que todos y sus ligas se juegan aunque el personaje no esté en ellas.

**Cuándo:**
- El abandono por edad, después de la P2b-2, con las decisiones de verano.
- El archivo y el borrado, junto con el guardado por partes y antes de la ciudad grande (paso 3 de §10).
- La gente de fuera, con los clubes de élite, el sénior y el profesional (F5 en adelante).
- Las profesiones, cuando se diseñen las carreras de después de jugador (entrenador, ojeador, mánager…). Hasta entonces, el potencial para una profesión no existe: hasta que exista, nadie se borra; los que se borrarían se archivan.
