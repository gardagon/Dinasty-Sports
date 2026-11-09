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
- **Más clubes de colegio (decisión del usuario, 05/11):** no todos los clubes son independientes. Además del del colegio del personaje, **algunos de los otros colegios tienen su club** (cuáles, como dato de la ciudad; propuesta: la mitad de los colegios de fuera). Funcionan como el del personaje: escogen primero entre sus alumnos, y un alumno entra en el de su colegio con hueco y sin prueba. Así los niños de esos colegios también tienen dónde jugar si les sale mal una prueba, y hay más equipos en la zona.
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

**Con los equipos A–D y la ciudad grande (09/11, entra en el MVP):** las reglas del filial valen para todos los equipos de un club: **dos equipos de un mismo club no están en la misma división, salvo en la última** (y allí, en grupos distintos si los hay); **un equipo no sube a la división de otro mejor de su club** (sube el siguiente); y **si un equipo baja a la división de otro de su club que esté por debajo, ese baja una más**. Los grupos van de 8 a 12 equipos: si en la última división quedan menos de 8, se juntan con la de arriba en lugar de formar un grupo de pocos. Al crear la partida, las divisiones se reparten por lo que vale cada equipo.

**La última división partida en grupos, con playoff (decisión del usuario, 09/11; sustituye a «los grupos van de 8 a 12»):**
- **La Primera y la Segunda, siempre de 10.** Si lo que queda no da para otra división ni cabe en un solo grupo de 12, la última se parte en dos grupos (o más), aunque sean pequeños (por ejemplo, juvenil: 10 + 10 + 7 + 7).
- **Ligas impares:** con un número impar de equipos, cada jornada descansa uno; todos descansan las mismas jornadas, nunca dos seguidas, y el descanso no cuenta como partido.
- **Playoff al acabar la liga**, para compensar las jornadas: lo juegan los 2 o los 4 primeros de cada grupo (según las jornadas que falten hasta unas 18), **también los equipos que no pueden subir** (un filial con otro equipo de su club en Segunda). Con 2 por grupo, semifinales cruzadas (1.º de un grupo contra 2.º del otro) a ida y vuelta y final a partido único; con 4, además cuartos. **El ganador es el campeón de la división.**
- **Suben los 2 finalistas.** Si uno no puede subir por las reglas del filial, el ascenso pasa a los semifinalistas y después a los cuartofinalistas, ordenados por puntos en la liga, después por diferencia de goles y, si siguen iguales, por sorteo.
- **Un equipo de abajo cede su ascenso a uno de arriba de su club:** si el que subiría es, por ejemplo, el C de un club y el que baja de Segunda es el B de ese mismo club, no se cambian: el B mantiene su plaza en Segunda y el C se queda en la última (hay un ascenso y un descenso menos entre esas dos divisiones).

## 5. Los equipos de cada club: A, B, C y D, por puestos (decisión del usuario, 03/11)

Sustituye a los filiales de antes (que eran solo A y B en los grandes, para la F2). Va antes de la P2c.

**Hasta cuatro equipos por club y categoría.** Cuántos tiene cada club sale del «draft» (abajo).

**Todos los clubes reparten por año** (decisión del usuario, 05/11; antes solo los grandes):

| Equipo | Quién juega |
|---|---|
| **A** | Los de segundo año, más los de primer año que destacan (los que serían titulares en el A, como al subir de categoría) |
| **B** | Los de primer año |
| **C**, si el club solo tiene C | Mezcla de los dos años |
| **C y D**, si tiene los dos | El C, los de segundo año (si no llegan, se completa con los de primer año); el D, los de primer año |

En juvenil, que tiene tres años, «segundo año» es segundo y tercero.
- **Subir a un jugador a un equipo de arriba tiene dos límites:** no sube si su equipo se queda con menos de 14 (lo desarmaría) ni si el de arriba está completo.

- **Un primer año en el A de un grande, de 0 a 2 por club y temporada**, casi nunca más. La simulación lo vigila (§9). Si salen muchos más, se sube el listón, sin tocar a nadie en concreto.

**Todo por puestos** *(hecho: puestos, reparto de la plantilla, regla de plaza por puesto y aceptación según el carácter en la parte 1, 06/11; equipos A–D en la parte 2, 07/11; prueba de acceso, puesto elegido y consejo del profesor en la parte 3, 08/11)*. No tiene sentido un equipo con once delanteros, y nadie (ni un PNJ ni el personaje) se limita a un único puesto: el descarte de un delantero puede ser un gran extremo.
- **Se calcula el nivel de cada jugador en cada puesto** (los 16 del JSON del fútbol: portero, centrales, laterales, mediocentros, bandas, mediapuntas, extremos y delanteros), con sus habilidades y las afinidades de cada puesto (se adelanta esa parte de la F3; los roles y la experiencia en cada puesto siguen en la F3).
- Cada plantilla tiene un **reparto por puestos** (dato del deporte; propuesta para 18: 2 porteros, 3 centrales, 3 laterales, 4 mediocentros, 3 de banda o extremos y 3 delanteros).
- **La regla de plaza va por puesto:** un club mira al candidato en todos los puestos y le ofrece aquel en el que entraría (con hueco en ese puesto o valiendo más que el peor de ese puesto).
- **Cada uno tiene un puesto favorito.** Si el club le ofrece otro, un PNJ lo acepta o no según su carácter (propuesta: más fácil cuanto más disciplinado y sacrificado sea, cuanto más se parezca el puesto al suyo y si en él sería titular). Si acepta, se queda en el equipo en ese puesto; si no, busca sitio en otro club.
- **El personaje igual, decidiendo él:** hace la prueba en el puesto que elige, pero el entrenador le puede proponer otro en la prueba, y él decide si acepta.

**Cómo se forman los equipos: un «draft» por rondas** (decisión del usuario, 05/11; sustituye al reparto por orden de tamaño y a los equipos según la demanda). Cada club solo ve a los niños que van a probar con él, no a todos: así hay niños muy buenos en clubes modestos y los equipos quedan más compensados. La idea es hacer las plantillas de 2, 3 o 4 equipos por club y después ajustarlas. Ejemplo con 1.000 interesados en una categoría, cuatro clubes y un colegio:

1. **Primera ronda, los A y B.** Los clubes van por orden de **atractivo** (dato de cada club; los colegios, los últimos, son los menos atractivos):

   | Club | Bolsa | Van a probar | Coge | Vuelven a la bolsa |
   |---|---|---|---|---|
   | Grande | 1.000 | 60 % → 600 | A y B (36) | 564 descartados |
   | Mediano | 400 que no fueron + 564 = 964 | 50 % → 482 | A y B | Los descartados |
   | Pequeño 1 | Los que no fueron + los descartados | 40 % | A y B | Los descartados |
   | Pequeño 2 | Ídem | 40 % | A y B | Los descartados |
   | Cada colegio con club | Sus alumnos que siguen en la bolsa | Todos, sin porcentaje ni prueba | A y B | El resto |

   - **Quién va a probar:** un sorteo en el que pesan la ambición y el interés de cada niño (el ambicioso va más a probar al grande). Si eso hace la función mucho más lenta, al crear la partida el sorteo es simple y lo de la ambición se usa desde el segundo curso, en los cambios de equipo.
   - **Los que van a probar son de los dos años mezclados**, no un porcentaje de cada año. Si al sorteo le faltan niños de un año para el A o el B, se añaden al azar de la bolsa los de ese año que hagan falta.
   - **Cada club coge a los mejores por puesto**, al crear la partida por lo que vale cada uno (en los plazos de fichajes, por su prueba). Puede que no llene los 18 (alguno rechaza el puesto que le ofrecen, o en la bolsa salen 20 delanteros): **con 14 basta**, y la segunda ronda equilibra.
2. **Segunda ronda, los C y D.** Con los que quedan en la bolsa se mira cuántos equipos de 14 a 18 salen (a 14 por equipo; los jugadores, repartidos para que queden parejos). **Esos equipos se sortean** entre clubes y colegios (cada uno, como mucho dos más: C y D), **teniendo en cuenta el año** que pide cada equipo (un D necesita niños de primer año). Después se repite lo de la primera ronda con su porcentaje: si los que van a probar no llegan al mínimo, van al menos el mínimo; si están entre el mínimo y el máximo, entran todos; si pasan del máximo, los que sobran vuelven a la bolsa.
   - Un club con C y D: el C con los de segundo año (si no llegan, se completa con los de primer año); si faltan de primer año para el D, entran los de primer año de la bolsa y los de segundo que no caben en el C vuelven a ella. **Si ni así se monta el D**, ese equipo pasa por sorteo a otro club que no tenga ni C ni D.
   - Si un colegio no llega a formar su C o su D, sus jugadores van a la bolsa final de descartes.
3. **Ajuste de las plantillas.** Cada club reordena sus equipos (con el azar, uno del D podría ser titular en el A), con los límites de subir de arriba. El que no puede bajar por su año (uno de segundo año no puede ir al D) va a la bolsa de descartes.
4. **Última revisión de los descartes definitivos:** con ellos se monta un equipo en su colegio, si lo tiene, o en un club, según dónde estudie cada uno. Los que siguen sin equipo se quedan apartados ese curso (§7, dos plazos).

**El personaje no entra en los porcentajes:** decide él a qué clubes va a probar, y su prueba sigue la regla de plaza (abajo). Al crear la partida el «draft» se hace sin él; después prueba dentro del plazo.

**Los años siguientes:** un porcentaje pequeño, según su carácter, prueba en otro club (el suplente del grande que prueba en el mediano para ser titular, o el titular del mediano que prueba en el grande). Los ojeadores y los fichajes, más adelante.

**Cada verano, los de primer año pasan por su propio «draft»** (decisión del usuario, 07/11): en cada club, los de primer año suben al A en su segundo año (con los límites de subir) y el club mira qué le falta por puestos para su nuevo B. Los niños de primer año de esa categoría pasan entonces por el mismo «draft» que al crear la partida, solo ellos: cada club, por su atractivo, ve a un porcentaje y coge lo que le falta para su B; los colegios reciben a sus alumnos que no han probado fuera o a los que han rechazado; y los C y D de esa categoría se vuelven a sortear entre clubes y colegios. Así cada colegio tiene cada año su grupo de primer año y no se queda sin equipos (antes los clubes rellenaban todos sus huecos con los nuevos antes que nadie).

**Al montar un equipo, el entrenador ofrece puestos parecidos** (decisión del usuario, 07/11): a quien no cabe en su puesto le ofrece, de más a menos parecido, los de su línea y los cercanos (un lateral, de central; un extremo, de delantero), y cada uno acepta o no según su carácter, hasta llenar el reparto. Solo si aun así no se llega a 14, los que quedan entran en su puesto favorito.

**Continuidad de los equipos (decisión del usuario, 08/11, tras medir por qué los colegios perdían equipos: `npm run colegios`):**
- **Probar fuera no hace perder la plaza.** Quien va a probar a otro club conserva su sitio en su equipo hasta que lo acepten en el otro y acepte él; si no lo cogen, sigue donde estaba. Solo la pierde, como siempre, si otro mejor se la quita con la regla de plaza. Igual en clubes y colegios.
- **El A del colegio debería existir siempre, hasta cadete, pero no es obligatorio** (corregido por el usuario el 08/11): se intenta completar con todo lo de abajo, pero **el mínimo de 14 manda**. Si no hay niños suficientes, no se crea; no se fuerza un equipo con menos de 14. Un B, un C o un D de colegio pueden desaparecer, y en juvenil también el A (abandono por edad).
- **Completar antes de cerrar** (corregido por el usuario el 08/11):
  - **Un C o un D se salva primero con los descartes de la bolsa que acepten jugar en él**; ante quedarse sin equipo, algunos que normalmente rechazarían el puesto lo aceptan (más probable aceptar si es su última opción).
  - **Y con un ascenso en cadena:** si en la categoría de abajo del mismo club hay un jugador que **sería titular en el A o el B de la categoría de arriba**, se le asciende allí, y el que menos vale de ese A o B baja al C (o al D) para salvarlo. Ejemplo: si el club tiene en riesgo su infantil C, un alevín del A que sería titular en el infantil A o B sube, y uno de ese infantil A o B baja al infantil C.
  - **El equipo de abajo que pierde al que sube tiene que quedarse en 14 o más;** si no, se completa a su vez del mismo modo: con uno de su C o de la bolsa.
  - **Es la regla general de siempre:** quien sería titular en la categoría de arriba debe ascender (como el niño que destaca y juega con los mayores), con los límites de no dejar su equipo por debajo de 14 ni entrar en un equipo completo.
  - Se recorren las categorías de la mayor a la menor y benjamín se rehace con los de primer año. Solo se cierra un equipo si ni así llega a 14. Igual para clubes y colegios.
- **Se van menos de los colegios:** el porcentaje que cambia de club cada verano, en torno al 5–10 % por equipo como estaba diseñado, y menos en los colegios (pesan los amigos).
- **Puestos: el entrenador ofrece siempre el puesto en que mejor ve al jugador**, por lo que vale en cada uno, y si no lo acepta, los parecidos de más a menos (también al recolocar a los suyos al empezar el curso, no solo al montar un equipo). **Unos niños tienen un puesto favorito concreto y otros, un grupo** (portería, defensa, medio o ataque; las bandas, en el medio y los extremos, en el ataque), elegido entre los puestos que mejor encajan con sus habilidades: los de grupo aceptan cualquier puesto de su grupo, así que el riesgo de rechazo por el puesto es menor (corregido por el usuario el 08/11). Fuera de lo suyo, casi siempre aceptan (pocos rechazos, según su carácter): «al final, si un niño quiere jugar al fútbol, juega».
- **Cuántos tienen puesto favorito y cómo se forma (decisión del usuario, 08/11; sustituye al 60 % concreto y 40 % por grupo del #98):** a los 8 años la mayoría todavía no sabe dónde rinde mejor: **en torno al 60 % no tiene puesto definido** (acepta cualquiera), **un 30 % tiene un puesto concreto y un 10 %, una zona** (portería, defensa, medio o ataque). **La preferencia se va formando con los años**, según el tiempo que juega en un puesto y lo bien que lo hace en él: quien no la tenía acaba prefiriendo una zona y después un puesto. Así los equipos de pequeños se completan con facilidad y las preferencias firmes llegan en las categorías de mayores. (Hasta que haya partidos, en la F2, el tiempo en un puesto es el de las temporadas que lo ha ocupado en su equipo.) Proporciones y ritmo, como datos.
- **Un grupo de puestos vacío (por ejemplo, sin portero)** lo cubre el que mejor se adapte de los que **no son titulares**, aunque no le guste, para no debilitar dos puestos en vez de uno. Como última opción casi siempre acepta.

**¿Titular en un club peor o en el C o el D de uno mejor?** (decisión del usuario, 07/11) Es una decisión de cada uno: un PNJ, según su carácter (el ambicioso prefiere el grande aunque sea en el D; el que quiere jugar, o tiene amigos, ser titular en el mediano); el personaje, eligiendo él, con lo que le dice cada club sin números («con nosotros entrenarías cuatro días, pero en el D» frente a «aquí serías titular en el A»). Para que pese:
- **Cada equipo tiene su entrenamiento:** sus sesiones por semana y su entrenador (dato por equipo: el A de un grande, más sesiones y el mejor entrenador; sus equipos de abajo, menos).
- **Cada club tiene sus instalaciones y su zona propia de entrenamiento** (un campo en el mapa), con una calidad que ayuda a mejorar: el grande, a priori, las mejores. Las comparten todos sus equipos.
- **Los minutos dan experiencia en el puesto** (con los partidos, en la F2): jugar más en un club peor también hace crecer.

**Entrar en un club de fuera: una prueba de acceso** *(hecho en la parte 3, 08/11)* (en el del colegio, no):
- Quien quiere entrar en un club que no es el de su colegio (el personaje o un niño) **hace una prueba**, que le puede salir mejor o peor: cuenta su estado, su forma del día y algo de azar, como una competición. **Lo que vale en la prueba es lo que cuenta para la regla de plaza.**
- **Con el equipo lleno en su puesto**, en todos los clubes, hay que superar en la prueba al peor de ese puesto, que sale del club.
- **Con hueco en su puesto (decisión del usuario, 05/11; sustituye al 0,9 de los medianos y el 0,8 de los pequeños):** el candidato se enfrenta en la prueba al **suplente que mejor juega en ese puesto**, por malo que sea en él y por poco que se parezca a su puesto (no hay umbral de parecido): si falta un central, quizá el lateral izquierdo suplente; si falta un portero, el suplente que mejor para. Así siempre hay alguien con quien enfrentarse. **Con varios huecos en el puesto, el candidato se enfrenta al que cubriría el último**: con dos huecos, el mejor suplente cubre el primero y el candidato se enfrenta al segundo; con tres, al tercero. **Si hay más huecos que suplentes, entra.** Igual para el personaje y para los niños, en todos los clubes de fuera. Los suplentes son los que no están en el once del equipo, por el reparto por puestos. En el club de su colegio, con hueco se entra, sin prueba.
- **El máximo de la plantilla es un tope:** con el equipo completo nadie entra por un hueco de su grupo de puestos; hace falta superar al peor del puesto. Al empezar el curso, antes de abrir plazas a los de fuera, **el entrenador recoloca a sus propios jugadores**: los que sobran en un grupo pasan a los puestos que faltan (por lo que valen en cada puesto y si lo aceptan por su carácter); si aún sobran, se abre otro equipo (demanda) o los que menos valen buscan otro club como cualquier desplazado.

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
  3. Si ningún club de ningún deporte lo quiere en ese plazo, **se queda apartado ese curso** y lo vuelve a intentar en el siguiente plazo. **Solo deja el deporte para siempre si en dos plazos seguidos ningún club lo quiere** (decisión del usuario, 05/11: entrar depende de un día de prueba, y una prueba mala no puede acabar con una carrera).
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
- **Medida de fluidez** *(`npm run fluidez`; semilla 31, fútbol y atletismo; el factor multiplica los colegios de fuera, las clases del colegio del personaje y los vecinos, y con ello el número de clubes; 12 semanas de curso con el bot del montón y, aparte, 53 para ver el cambio de curso)*, **con el «draft» solo al crear la partida, los clubes en proporción a la población y los valores por puesto guardados cada semana**. La semana es lo que tarda el juego en avanzar sus acciones (sin lo que tarda el bot en mirar qué hacer):

| Población | Personas | Clubes de la zona | Futbolistas | Crear | Estado | Guardar | Acción (media / p95) | Apuntarse | Semana normal | Cambio de curso |
|---|---|---|---|---|---|---|---|---|---|---|
| ×1 | 1.447 | 2 | 628 | 6,4 s | 3,5 MB | 37 ms | 1,1 ms / 0,9 ms | 26 ms | 0,15 s | **0,47 s** |
| ×2 | 2.873 | 4 | 1.341 | 12 s | 7,1 MB | 74 ms | 2,1 ms / 1,3 ms | 26 ms | 0,30 s | **1,3 s** |
| ×5 | 7.139 | 11 | 3.501 | 39 s | 17,6 MB | 208 ms | 5,4 ms / 2,4 ms | 84 ms | 0,6–0,7 s | **4,8 s** |

  **Lo que sale:** el cambio de curso a ×5 baja de 8,5 s (con el «draft» cada año) a **4,8 s** (el límite era ~5 s), a ×1 son 0,5 s; apuntarse, por debajo de 100 ms; la semana normal, por debajo de 1 s; guardar (<300 ms) y cargar no se notan. Lo que más costaba del cambio de curso era recorrer a todas las personas cada vez que un club miraba su plantilla (`ListaDeTrabajo` lo evita: sabe quién juega en cada equipo).
- **Medida con la ciudad grande del diseño** *(`CIUDAD_GRANDE` en `packages/contracts/src/ciudad.ts`, país `PAIS_CIUDAD_GRANDE`: el colegio del personaje igual y 9 colegios de fuera de 2 clases de 25 por curso; 9 clubes de la zona —uno cada 700 personas: 1 grande, 3 medianos, 5 pequeños— y 5 colegios de fuera con club; `CIUDAD=grande npm run fichajes`, `npm run equipos -- 3 3 grande`, `npm run fluidez -- 53 grande`)*:

| Personas | Futbolistas | Crear | Estado | Guardar | Acción (media / p95) | Apuntarse | Semana normal | Cambio de curso |
|---|---|---|---|---|---|---|---|---|
| 6.110 | 3.026 | 38 s | 15,3 MB | 174 ms | 4,8 ms / 1,6 ms | 121 ms | 0,6 s | 3,3 s |

  Dentro de los límites (apuntarse, que midió 121 ms, queda en 80–85 ms con el juego en marcha y 24 ms recién creada la partida). Detalle de equipos, interesados sin equipo y quién deja el fútbol en `DECISIONES.md` (07/11/2026).
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

**1. Menos equipos en cadete y juvenil, como en la vida real.** A esas edades muchos niños empiezan a hacer otras cosas y dejan el deporte. Propuesta para que salga solo, sin fijar el número de equipos por edad: **Decidido el 07/11: se hace ya; hecho el 08/11** (`abandono.ts`, datos del deporte; medidas en `DECISIONES.md`) (antes de subir el tope de equipos en juvenil): cuando por el abandono queden menos equipos en una categoría de la zona, la competición pasa a ligas provinciales y nacionales, con equipos de fuera de la ciudad (punto 3; diseño pendiente, con la F2).
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
