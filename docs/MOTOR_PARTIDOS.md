# Motor de los partidos de fútbol (diseño)

Diseño del 01/11/2026, **aprobado con las respuestas del usuario del 01/11 (§0)**; lo que queda de la revisión de la F0 y la F1, en §14. No hay código. Completa [`ANALISIS_FUTBOL.md`](ANALISIS_FUTBOL.md) (decisiones de §0 y potenciador de §3 ter) con lo que ni el addon 2.1 ni el diseño de stats definen: **cómo los valores de los jugadores se convierten en un partido** (marcador, minutos, goles, nota). Entra en la fase F2 del fútbol; las piezas de posición y rol (F3), ocultas y derivadas (F4) y decisiones dentro del partido (F7) se enchufan después sin cambiar la estructura.

---

## 0. Decisiones del usuario (01/11/2026)

1. **Los goles salen de la simulación, sin objetivo previo.** No se facilitan ni se frenan los goles por categoría: si juega el mejor contra el peor con mucha diferencia, o un portero es muy malo, habrá más goles y más diferencia. El banco de partidos solo vigila que el motor no se rompa (§11).
2. **Intensidad elegida antes del partido** (relajado, normal, a tope): aprobada.
3. **Cambios como en la vida real, por categoría** (§6): dato del deporte por país y por categoría y nivel.
4. **La experiencia en un puesto empieza en 0** y se gana jugando en él: mucho al principio y cada vez menos (curva exponencial invertida), más deprisa con inteligencia, atención y conocimiento del fútbol (§3).
5. **Ventaja de jugar en casa:** sí, pequeña. Más adelante quizá con el público.
6. **Tarjetas:** la roja y la acumulación de amarillas suspenden partidos.
7. **Lesiones:** esperan al sistema de salud (los tipos, la duración y la recuperación son suyos). **Pueden ocurrir durante el partido, en cualquier tramo, y en cualquier acción**, no solo al final (precisión del 01/11). El fútbol deja preparado cómo preguntar y avisar (§9), sin refactorizar nada.
8. **Experiencia en el partido (decidido por mí, a petición del usuario):** la experiencia de cada puesto empieza en 0 de verdad, y en el partido pesa desde una base que pone el conocimiento del fútbol (§3).

## 1. Qué tiene que cumplir

Sale de las decisiones ya tomadas:

- **Fútbol 11 desde los 8 años**, liga a doble vuelta los sábados, equipos de la ciudad.
- **Todo se precalcula antes del pitido** (diseño §14); durante el partido solo cambia el **cansancio**.
- **Potenciador por categoría y nivel** del partido, multiplicando, para todos los que juegan (§3 ter del análisis).
- **Valor efectivo:** lo entrenado por un factor de cada capacidad de apoyo, de ×0,6 a ×1,2 frente a lo típico de un adulto, pesando más la primera.
- **El conocimiento es un bonus/malus** al usar las habilidades.
- **Cansancio:** sube durante el partido según la energía con la que se empieza y según la intensidad; la tabla de 5 tramos del addon dice cuánto se rinde. El cansancio general del juego no se cobra otra vez.
- **Rápido y reproducible:** un partido entero en milisegundos; con la misma semilla, el mismo resultado; la suerte de cada persona que no es el jugador sale de un azar propio (`rngEstable`), como en el atletismo, para que lo que haga el jugador no cambie a los demás.

## 2. Principios

1. **Duelos relativos.** Casi todo se decide comparando a unos con otros (el medio campo de uno contra el del otro, el delantero contra el defensa y el portero), con fórmulas que dependen del **cociente** entre los dos valores. Así un partido entre niños flojos y uno entre profesionales se juegan con el mismo motor.
2. **Una parte pequeña contra una dificultad fija** (un pase largo preciso, una falta a la escuadra, un penalti), medida en escala de adulto. Es la parte que sin potenciador hunde a los niños.
3. **Escala de adulto para todos:** antes del partido, cada valor se multiplica por el potenciador de la categoría y el nivel **del partido**. El motor se calibra una sola vez y vale para todas las categorías.
4. **Por tramos:** el partido se juega en **6 tramos de 15 minutos** (3 por parte). En cada uno se recalcula el cansancio de cada jugador; lo demás está precalculado. Seis tramos bastan para que haya remontadas, cambios y cansancio visible sin coste.

## 3. Lo que vale cada jugador en el partido

Para cada jugador y cada habilidad que use su puesto, antes del pitido:

```
valor_en_partido = entrenado
                 × factor de cada capacidad de apoyo      (×0,6 a ×1,2 frente a lo típico de un adulto, ya con el potenciador)
                 × conocimiento                           (bonus/malus del kit, ×0,85 a ×1,15 en lo táctico)
                 × potenciador (categoría × nivel del partido)
                 × experiencia en el puesto               (F3; hasta entonces ×1)
                 × forma del día                          (consistencia, F4; hasta entonces ×1)
y en cada tramo  × cansancio                              (tabla de 5 tramos, §6)
```

- **Experiencia en el puesto (F3, decisión 4).** Cada posición y cada rol tienen una experiencia de 0 a 100 que **empieza en 0**. Se gana jugando en ese puesto, con rendimientos decrecientes:

  ```
  gana = (100 − experiencia) × 0,09 × minutos / 90 × aprendizaje
  aprendizaje = 0,7 + 0,6 × media(inteligencia, atención, conocimiento del fútbol)
  ```

  En `aprendizaje`, cada valor se mide frente a lo típico de su edad (lo típico cuenta 0,5): un niño normal aprende ×1, uno muy listo y atento hasta ×1,3 y uno flojo ×0,7.

  Con eso, un curso de titular en un puesto (12 partidos) lleva a unos 65 a un niño normal y a unos 75 a uno listo y atento. Los primeros partidos dan mucho (unos 9 puntos el primero) y llegar a 90 cuesta años. Los entrenamientos con el club dan algo en el puesto que te asigna el entrenador. Las afinidades del addon pasan experiencia de un puesto a otro (un lateral derecho que juega de carrilero aprovecha el 40 %), y la combinada es 70 % posición y 30 % rol.

  **Cómo pesa en el partido (decidido):** el diseño multiplica el valor por `experiencia / 100`. Con la experiencia empezando en 0, el primer partido de cualquier niño valdría 0 (y todos los de 8 años empiezan sin experiencia, así que volverían los 0 a 0). Propuesta: la experiencia empieza en 0 como se pide, pero en el partido pesa **desde una base que pone el conocimiento del fútbol**: `valor × (base + (1 − base) × experiencia / 100)`, con `base = 0,5 + 0,3 × conocimiento / 100`. Quien no ha jugado nunca en un puesto rinde la mitad o algo más según cuánto sepa de fútbol, y con la experiencia llega al 100 %. **Por qué así y no empezando por encima de 0:** la experiencia queda como un dato limpio («nunca has jugado de central») que la interfaz y los eventos pueden contar, y lo que sabe de fútbol en general lo pone el conocimiento, que es lo que lo representa.
- **Experiencia de los demás:** **se guarda de verdad**, partido a partido y con la misma curva, para cada jugador (corregido el 02/11 con `VISION.md`: datos de verdad para todos). Antes decía que se estimaba por los años en su equipo: se descarta.
- **Jugadores que no son el personaje (sustituido el 02/11 por [`MISMAS_REGLAS.md`](MISMAS_REGLAS.md): los PNJ tendrán sus valores reales, así que su valor en cada habilidad se lee igual que el del personaje).** Lo que decía antes: una persona solo tiene un nivel por deporte (`levels.futbol`) y sus 18 capacidades. Su valor en cada habilidad sale de su nivel por un **perfil** que se calcula con sus capacidades (un niño rápido tiene más arrancada y regate que uno lento con el mismo nivel), con un azar estable por persona. No se guardan 29 habilidades por persona.
- **Su puesto:** el que mejor encaja con su perfil, calculado igual. El entrenador de cada equipo hace la alineación (§8).

## 4. Del jugador al equipo: cinco zonas

Cada equipo se resume, antes del partido, en cinco valores. Cada jugador aporta a las zonas según su **puesto** (posición y línea del addon) y, en F3, su **rol**:

| Zona | Habilidades que la forman | Quién aporta más |
|---|---|---|
| **Portería** | Reflejos, blocaje, mano a mano, alcance aéreo, dominio del área, posicionamiento | El portero |
| **Defensa** | Marcaje, entrada, posicionamiento, anticipación, juego de cabeza; velocidad y fuerza (capacidades) | Línea 1, después línea 2 |
| **Creación** | Pase, control, visión de juego, toma de decisiones, juego colectivo, técnica | Líneas 2 a 4 |
| **Ataque** | Definición, desmarque, regate, arrancada, disparo lejano, centros, juego de cabeza | Líneas 4 y 5, laterales ofensivos |
| **Balón parado** | Golpeo de falta, córners, penaltis, saque de banda; cabeza de los que rematan | Los lanzadores que elige el entrenador |

- **Pesos por puesto y rol como datos** del addon (una tabla: cuánto aporta un lateral a defensa, creación y ataque). Los roles cambian el reparto (un lateral ofensivo aporta más al ataque y menos a la defensa).
- **La formación** (4-4-2, 4-3-3, 3-5-2…) cumple las reglas del addon (portero, línea 1 ≥ 3, líneas 2+3 ≥ 3, líneas 4+5 ≥ 1) y cambia cuántos jugadores aportan a cada zona.
- **Juego colectivo y liderazgo** suben un poco toda la zona de creación y la de defensa (un equipo que se entiende es más que la suma de sus jugadores).

## 5. El partido, tramo a tramo

En cada tramo de 15 minutos y para cada equipo:

1. **Posesión:** `creación_propia² / (creación_propia² + creación_rival²)`. Un medio campo el doble de bueno tiene el 80 % del balón.
2. **Ataques:** unos 6 por tramo repartidos según la posesión (dato del addon: «ritmo» de la categoría).
3. **Ocasión:** cada ataque llega a ocasión con una probabilidad que compara creación + ataque propios con la defensa rival (curva logística sobre el cociente), por la parte absoluta (dificultad fija).
4. **Quién tira:** se sortea entre los atacantes según su puesto y rol (el delantero centro más que el mediocentro).
5. **Gol:** el tiro se compara con el portero rival (definición, disparo lejano o cabeza según la ocasión, frente a reflejos, mano a mano o alcance aéreo).
6. **Balón parado:** faltas, córners y penaltis salen de las faltas y de los ataques rechazados, y se resuelven con los lanzadores y los rematadores frente a la portería.
7. **Faltas y tarjetas (F4):** cada duelo defensivo puede acabar en falta según la **dureza** y la **agresividad**; con su probabilidad de amarilla y roja. Una expulsión deja al equipo con diez (todas sus zonas ×10/11). **Sanciones (decisión 6):** la roja suspende el partido siguiente y la acumulación de amarillas también (propuesta: un partido cada 5 amarillas). Es un dato del deporte por país, como los cambios.
8. **Ventaja de jugar en casa (decisión 5):** pequeña, +4 % en las zonas del local. Más adelante podrá depender del público.
9. **Tanda de penaltis (para la copa, `CIUDAD_Y_LIGAS.md` §6):** si una eliminatoria acaba en empate, penaltis directamente, sin prórroga. Cinco por equipo y después uno a uno; cada penalti es un duelo entre el que tira (los elige el entrenador por golpeo y compostura) y el portero, con sus habilidades y su estado.

**Prototipo** (no es código del juego; liga de 7 equipos a doble vuelta, 60 temporadas por categoría, jugadores con el nivel típico de su edad):

| Categoría | Sin potenciador | Con potenciador | El mejor equipo gana la liga |
|---|---|---|---|
| Benjamín | 0,48 goles por partido, 62 % de 0 a 0 | 2,97 goles, 6 % de 0 a 0 | 50 % |
| Alevín | 0,89 goles, 43 % de 0 a 0 | 2,86 goles, 7 % | 47 % |
| Infantil | 1,40 goles, 27 % | 2,86 goles, 7 % | 58 % |
| Cadete | 2,00 goles, 17 % | 2,92 goles, 6 % | 48 % |
| Juvenil | 2,73 goles, 7 % | 2,84 goles, 7 % | 67 % |
| Sénior | 2,87 goles, 7 % | 2,99 goles, 5 % | 62 % |

Confirma el problema y la solución: sin potenciador, los benjamines casi no marcan. Con él, todas las categorías se juegan con el mismo motor. **No hay un objetivo de goles por categoría** (decisión 1): el prototipo usa jugadores parecidos entre sí; en el juego, las diferencias de nivel entre equipos y jugadores (más grandes entre niños que entre profesionales) darán más goles y más goleadas donde las haya.

## 6. Cansancio

- **Empieza en 0** y sube cada tramo:

  ```
  sube = base × intensidad × (1,5 − resistencia frente a lo típico del partido) × (1 + energía que falta al empezar / 100)
  ```

  Calibrado para que un jugador típico, a intensidad normal y descansado, acabe los 90 minutos con unos 45 de cansancio.
- **Rinde según lo que le queda:** `frescura = 100 − cansancio`, con la tabla del addon: 70–100 ×1; 50–69 ×0,9; 30–49 ×0,75; 10–29 ×0,55; menos de 10 ×0,3.
- **Intensidad (decisión del usuario):** hasta que haya decisiones dentro del partido (F7), **se elige antes del partido** al ir a jugarlo:

  | Intensidad | El cansancio sube | Rinde | Además |
  |---|---|---|---|
  | Relajado | ×0,7 | ×0,93 | Menos riesgo de lesión (cuando exista, E12) |
  | Normal | ×1 | ×1 | — |
  | A tope | ×1,4 | ×1,07 | Más faltas; si el cansancio llega al tramo bajo, rinde mucho menos al final |

  Los demás jugadores juegan a intensidad normal (o según su carácter: los sacrificados más a tope, los relajados menos).
- **Al acabar,** el personaje pierde de energía lo que ha acumulado de cansancio (proporcional): es el coste de la acción del partido. El cansancio general (`gen.cansancio`) no se aplica a su rendimiento en el partido, solo a lo que aprende de él (la eficiencia de la acción, como en cualquier acción).
- **Cambios (decisión 3): como en la vida real, por categoría y nivel.** En España no hay una norma única: la fija cada federación territorial y cambia según la liga. Lo encontrado (31/10, a confirmar con las circulares de cada temporada):

  | Liga | Cambios | Fuente |
  |---|---|---|
  | Cadete e infantil, Liga Autonómica y Preferente (Valencia, 2025/26) | Hasta 7, en 3 interrupciones (más el descanso) | Circular 22 de la FFCV |
  | Cadete e infantil, Primera y Segunda Regional (Valencia) | Volantes (se puede volver a entrar), hasta 18 convocados | Circular 22 de la FFCV |
  | Cadete e infantil, Liga Regional (Castilla-La Mancha, 2022/23) | 5, entre 7 suplentes | Bases de competición de Castilla-La Mancha |
  | Juvenil (RFEF) | 5, entre 7 suplentes (norma antigua; no se ha podido confirmar la vigente) | Normas reguladoras del fútbol juvenil de la RFEF |

  Por eso los cambios son un **dato por categoría y nivel** en los datos del deporte por país: cuántos, en cuántas interrupciones, si son volantes y cuántos convocados. Para España, propuesta de partida: las ligas de la ciudad (de nivel regional) con cambios volantes y 18 convocados; las de nivel autonómico y nacional, 7 cambios en 3 interrupciones; juvenil nacional, 5. Con cambios volantes el entrenador reparte los minutos (entran los cansados y vuelven a salir), y eso hace que casi todos los convocados jueguen. El entrenador cambia a los más cansados y a los que peor juegan.

## 7. El personaje dentro del partido

- **Sus acciones** salen del mismo motor: en cada tramo participa en las jugadas de su zona según su puesto y rol (pases, regates, tiros, entradas, paradas si es portero), y cada una sale bien o mal comparando su valor con el del rival directo.
- **Estadísticas del partido:** minutos, goles, asistencias, tiros, paradas, duelos ganados, faltas, tarjetas.
- **Nota de 1 a 10:** parte de 6 y sube o baja con lo que hace (gol +1, asistencia +0,6, acciones por encima o por debajo de lo esperado para su puesto, errores que acaban en gol −0,7), el resultado (±0,3) y, si es portero, paradas y goles encajados. La **consistencia** (F4) da más o menos varianza.
- **Lo que se cuenta:** una crónica corta en el diario («Sábado, alevín: Club Ciudad 2 – 1 Colegio. Jugaste los 90 minutos de lateral derecho, nota 7,2.») con la tabla del partido y la clasificación, como las carreras del atletismo.

## 8. Convocatoria y alineación

- **Cada semana el entrenador convoca** a 16 de la plantilla (11 y 5 suplentes; con plantillas de 14, todos) y elige formación y titulares.
- **Ordena a los jugadores** por lo que valen en cada puesto de su formación y, en el caso del personaje, también por:
  - su **asistencia a los entrenamientos** de las dos últimas semanas (quien falta, pierde el puesto);
  - su **relación con el entrenador** (de ×0,95 a ×1,05);
  - el **carácter del entrenador** (uno disciplinado premia más la asistencia).
- **El puesto del personaje** es aquel en el que más vale para el equipo. Más adelante podrá pedir otro.
- **Lo cuenta** el evento `futbol.convocatoria` (titular, suplente o no convocado y en qué puesto) antes del partido. Es el bucle propio del fútbol: entrenar, asistir y llevarse bien con el entrenador para jugar más.

## 9. Después del partido

- **Lo que se aprende** (canal principal del conocimiento): conocimiento del fútbol, las habilidades que más ha usado según su puesto y sus minutos, y la **experiencia en el puesto y el rol** (F3). Quien no juega aprende poco.
- **Motivación:** sube con la victoria, el buen papel y los minutos; baja con el banquillo y las derrotas, más en quien es ambicioso.
- **Relaciones:** el evento compartido `competicion.resultado` con los datos de equipo (marcador, compañeros y rivales), para que `relaciones` y `npcs` reaccionen.
- **Todas las ligas se juegan** (corregido el 02/11 con `VISION.md`: datos de verdad para todos): cada jornada se juegan los partidos de todas las categorías de la ciudad, no solo los de la liga del personaje, y se guardan sus resultados y las estadísticas de cada jugador. El mundo avanza aunque el personaje no mire.
- **Lesiones (decisión 7): durante el partido y en cualquier acción.** El partido entero se calcula dentro de una sola acción, así que un evento no puede interrumpirlo a mitad: el sistema de salud no se enteraría hasta el final. Por eso se usan las dos piezas que ya da el motor:
  1. **Un servicio para preguntar, durante el partido.** En cada tramo (y en las jugadas de contacto, como una entrada dura), el fútbol pregunta al servicio `salud` (contrato nuevo en `contracts/services.ts`) **qué probabilidad hay de lesionarse** con el esfuerzo de ese momento: deporte, minuto, intensidad, cansancio, energía con la que empezó, si va con sobrecarga y el contacto de esa jugada. El servicio solo lee (devuelve una probabilidad, con la constitución, los perks como Endeble o Recuperación lenta, la salud y la edad), y **el fútbol tira el dado con su propio azar**.
  2. **Un evento para avisar.** Si hay lesión, el fútbol saca al jugador (lo cambia o, si no quedan cambios, el equipo juega con uno menos) y emite el evento compartido `salud.lesion` (persona, deporte, momento y contexto). El sistema de salud lo recoge y decide el tipo, la gravedad y la baja.
  3. **En cualquier otra acción** (un entrenamiento, el gimnasio, una carrera del atletismo), igual: la acción pregunta al servicio y avisa con el evento. El kit de deporte puede traer la pieza para que todos los deportes lo hagan igual.

  **Hoy no existe el servicio**, así que la probabilidad es 0 y no pasa nada: el fútbol funciona sin él, como exige la regla de los servicios. Cuando llegue el sistema de salud, lo publicará y las lesiones aparecerán solas, sin tocar el fútbol. Las «molestias musculares» del atletismo por sobrecarga se quedan como están hasta entonces. Todos los jugadores (compañeros y rivales) se lesionan con el mismo servicio, no solo el personaje (corregido el 02/11 con `VISION.md`: datos de verdad para todos).

## 10. Coste y lo que se guarda

- **Un partido:** 22 jugadores, 6 tramos, unas decenas de jugadas: milisegundos. Una jornada de todas las categorías de la ciudad (unos 20 partidos), unas decenas de milisegundos. Con la ciudad grande (`CIUDAD_Y_LIGAS.md`) son unos 75 partidos por sábado: hay que medirlo.
- **Se guarda lo que el mundo necesita** (corregido el 02/11 con `VISION.md`: datos de verdad para todos): el resultado de todos los partidos de todas las ligas y, **de cada jugador**, sus estadísticas de la temporada (partidos, titularidades, minutos, goles, asistencias, tarjetas, nota media) y su historial de temporadas. Del partido del personaje, además, la crónica y sus jugadas. Hay que medir el peso con `npm run rendimiento`; si crece mucho, se resuelve con el guardado por partes (`ALMACENAMIENTO.md`), no guardando menos.
- **No se guarda:** los valores precalculados ni el detalle de las jugadas (se recalculan si hace falta).

## 11. Cómo se calibra: el banco de partidos

Una herramienta como el banco de notas (`npm run sim:partidos`): ligas de cada categoría con equipos de la ciudad. Comprueba por categoría:

- que el motor no se rompa, sin objetivo de goles (decisión 1): que no casi todo acabe 0 a 0 ni con goleadas absurdas entre equipos parecidos, y que **a más diferencia de nivel, más goles y más diferencia en el marcador**;
- menos de un 10 % de 0 a 0;
- que el mejor equipo gane la liga entre el 40 % y el 75 % de las veces;
- que un niño subido de categoría rinda menos que en la suya;
- que la nota media de un jugador típico ronde el 6 y la de uno muy bueno el 7,5.

## 12. Cómo se reparte en las fases

| Fase | Qué del motor |
|---|---|
| F2 | Valores con secundarias, conocimiento y potenciador; zonas por puesto con una formación por equipo; tramos, posesión, ocasiones, goles; cansancio e intensidad elegida antes; convocatoria; nota y crónica; banco de partidos |
| F3 | Experiencia en posición y rol con afinidades, roles en las zonas, formaciones distintas |
| F4 | Ocultas (consistencia, dureza y tarjetas, partidos grandes, presión) y derivadas (agresividad, liderazgo, creatividad, comunicación y excentricidad del portero) |
| F7 | Decisiones dentro del partido (con el motor de eventos): intensidad en cada tramo, opciones que abren o cierran los ejes |

## 13. Preguntas para decidir

Todas respondidas el 01/11 (ver §0): experiencia desde 0 con base del conocimiento (decidido por mí), cambios de partida propuestos para España mientras no se confirmen las circulares, un partido de sanción cada 5 amarillas, y lesiones durante el partido y en cualquier acción con el servicio de salud (§9). El motor está listo para la fase F2.

## 14. Lo que la F2 tiene que tener en cuenta (revisión de la F0 y la F1, al día el 03/11)

Hecho desde la revisión del 01/11: los compañeros de equipo ya no cuentan como rivales en `relaciones` (F0), la sobrecarga cuenta todas las sesiones de cualquier deporte y la liga ya no exige semifinal ni final (#59), la plantilla es la de cada equipo de cada categoría (#60), y el entrenador elige los ejercicios de cada sesión (#60). Además, los PNJ entrenan con las mismas fórmulas que el personaje (#63 y #69). Queda:

1. **Cuándo entra el fútbol en el juego.** No está en `MODULOS` (así no cambian `huella` ni `sim`) y en la web todavía no se puede instalar, porque la clave de firma no está configurada: hoy el fútbol solo existe en los tests y en `npm run sim:futbol`. Hay que configurar la clave (`npm run clave-deportes` y el secreto `DS_CLAVE_PRIVADA`, lo hace el usuario), o añadirlo a `MODULOS` en la F2 sin que salga en las partidas de la simulación.
2. **Equilibrio.** La F1 traduce la secundaria «balance» del regate como coordinación. El análisis (§3, punto 8) proponía quitarla y usar el perk `equilibrio_natural` / `desequilibrado` como modificador. No es grave: se puede ajustar con los perks (F4).
3. **Balance de los entrenamientos.** Con los ejercicios del entrenador (dos por sesión), cada sesión entrena menos cosas a la vez. El bot de fútbol (`npm run sim:futbol`) ya entra en el equipo a tiempo (#69). Falta medirlo con el banco de partidos en la F2.
4. **Ligas y copa de la ciudad grande** (`CIUDAD_Y_LIGAS.md`): Primera, Segunda y Tercera con ascensos, descensos y reglas del filial; reparto entre primer y segundo año; copa por eliminatorias con tanda de penaltis (§5, punto 9).
5. **La experiencia por puesto se rellena partido a partido**, para todos los jugadores (las estructuras llegan con la P2).
