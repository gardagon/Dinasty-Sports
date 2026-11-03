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
| Grande | 4 | A y B (filial) | Primero, por lo que vale cada niño, en todos los colegios |
| Mediano | 6 | A, y B si tiene interesados de sobra | Después |
| Pequeño y club de colegio | 8–10 | Solo A | Al final. El club de un colegio, antes entre sus propios alumnos |

- **El club del colegio del personaje es un club pequeño más.** Un personaje del montón cabe en él, o en el filial de uno mediano. Llegar al A de un grande exige ser bueno de verdad.
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

## 5. Filiales: primer y segundo año

En los clubes con filial, cada verano el entrenador reparte a sus jugadores:

- **Los de segundo año van al A y los de primer año, al B.** En juvenil, que tiene tres años, los de primer año van al B y los de segundo y tercero, al A.
- **Un primer año sube al A si destaca:** si sería titular en el A, es decir, uno de los 11 mejores por su rendimiento, con el mismo «lector de persona» que usan todos (`MISMAS_REGLAS.md`).
- **Un segundo año se queda en el B** si en el A no tiene sitio entre los 18 mejores. Si no le vale, puede irse a otro club en verano (§7).
- Los clubes sin filial mezclan los dos años en su A, como ahora.

**Lo que se espera:** por club con filial y temporada, de 0 a 2 primeros años en el A, casi nunca más. La simulación lo vigila (§9). Si salen muchos más, el umbral está mal: se sube el listón, sin tocar a nadie en concreto.

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
  - **En el personaje** las restricciones son las mismas (ningún club lo coge si no hay hueco o no es mejor que el peor), pero las decisiones son del jugador: si otro que vale más le ocupa el sitio se le avisa («Has perdido tu plaza…») y él elige si prueba en otro club, en otro deporte o en el siguiente plazo. **Nunca se le retira a la fuerza**: sigue siendo del club (aunque deje de contar como uno de los jugadores del equipo).

Cada verano, en este orden y para todos los clubes (todo dentro del plazo):
1. Cada jugador sube de categoría si le toca, según su año de nacimiento.
2. **Los clubes fichan** por orden de tamaño (los grandes primero): miran a los mejores de los clubes más pequeños de su categoría (los tres mejores de cada equipo). Cada niño decide si se va según su **ambición** (eje del carácter), lo que **practicaron sus padres** y la **plaza** (con hueco, o siendo mejor que el peor del equipo) (`probabilidadDeFichar`: de 5 % a 95 %). Los desplazados buscan club como se ha dicho.
3. Cada club reparte entre el A y el B (§5) y completa sus plantillas con los interesados que quedan. **Nadie interesado se queda sin equipo** mientras haya plazas en algún club de la zona: con una ciudad grande, las hay.
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
- **Tiempos que hay que mantener** (a confirmar con la medida): avanzar una semana con todos los partidos en menos de ~1 s en un ordenador normal, crear la partida en pocos segundos con un aviso de «creando el mundo», y guardar sin que se note.
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
