# Motor de los partidos de fútbol (diseño)

Propuesta del 01/11/2026, **pendiente de aprobar**. No hay código. Completa [`ANALISIS_FUTBOL.md`](ANALISIS_FUTBOL.md) (decisiones de §0 y potenciador de §3 ter) con lo que ni el addon 2.1 ni el diseño de stats definen: **cómo los valores de los jugadores se convierten en un partido** (marcador, minutos, goles, nota). Entra en la fase F2 del fútbol; las piezas de posición y rol (F3), ocultas y derivadas (F4) y decisiones dentro del partido (F7) se enchufan después sin cambiar la estructura.

---

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

- **Experiencia (F3):** el diseño multiplica por `experiencia / 100`, lo que deja a cero a quien juega por primera vez en un puesto. Propuesta: **×0,75 a ×1** (`0,75 + 0,25 × experiencia combinada / 100`), con la experiencia combinada de posición (70 %) y rol (30 %) y sus afinidades del addon.
- **Jugadores que no son el personaje:** una persona solo tiene un nivel por deporte (`levels.futbol`) y sus 18 capacidades. Su valor en cada habilidad sale de su nivel por un **perfil** que se calcula con sus capacidades (un niño rápido tiene más arrancada y regate que uno lento con el mismo nivel), con un azar estable por persona. No se guardan 29 habilidades por persona.
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
7. **Faltas y tarjetas (F4):** cada duelo defensivo puede acabar en falta según la **dureza** y la **agresividad**; con su probabilidad de amarilla y roja. Una expulsión deja al equipo con diez (todas sus zonas ×10/11).
8. **Ventaja de jugar en casa:** pequeña (propuesta: +4 % en las zonas del local).

**Prototipo** (no es código del juego; liga de 7 equipos a doble vuelta, 60 temporadas por categoría, jugadores con el nivel típico de su edad):

| Categoría | Sin potenciador | Con potenciador | El mejor equipo gana la liga |
|---|---|---|---|
| Benjamín | 0,48 goles por partido, 62 % de 0 a 0 | 2,97 goles, 6 % de 0 a 0 | 50 % |
| Alevín | 0,89 goles, 43 % de 0 a 0 | 2,86 goles, 7 % | 47 % |
| Infantil | 1,40 goles, 27 % | 2,86 goles, 7 % | 58 % |
| Cadete | 2,00 goles, 17 % | 2,92 goles, 6 % | 48 % |
| Juvenil | 2,73 goles, 7 % | 2,84 goles, 7 % | 67 % |
| Sénior | 2,87 goles, 7 % | 2,99 goles, 5 % | 62 % |

Confirma el problema y la solución: sin potenciador, los benjamines casi no marcan. Con él, todas las categorías quedan en cifras de fútbol real. Si se quiere que los partidos de niños sean más abiertos (más goles, más goleadas), basta un **ritmo por categoría** en los datos (más ataques por tramo), sin tocar el motor.

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
- **Cambios:** el entrenador cambia a los más cansados o a los que peor juegan a partir del tramo 4 (propuesta: 5 cambios por partido; en el fútbol base el número cambia según la federación y en algunas no hay límite, así que es un dato del deporte por país).

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
- **Clasificación:** se juegan todos los partidos de la jornada de su liga (solo los de su categoría) y se actualiza la tabla.

## 10. Coste y lo que se guarda

- **Un partido:** 22 jugadores, 6 tramos, unas decenas de jugadas: milisegundos. Una jornada de 3 o 4 partidos, igual.
- **Se guarda poco:** del partido del personaje, el marcador, sus estadísticas y nota, los goleadores y la crónica; de los demás partidos de su liga, solo el marcador. La clasificación se calcula con los marcadores. Con 12 jornadas por curso, unos pocos KB.
- **No se guarda:** los valores precalculados ni el detalle de las jugadas (se recalculan si hace falta).

## 11. Cómo se calibra: el banco de partidos

Una herramienta como el banco de notas (`npm run sim:partidos`): ligas de cada categoría con equipos de la ciudad. Comprueba por categoría:

- goles por partido en un rango realista (propuesta: entre 2,5 y 3,5 en sénior; algo más en los niños si se quiere);
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

1. **Goles por categoría:** ¿todas en torno a 3 (como sale ahora) o partidos de niños más abiertos (4–5 goles, más goleadas)?
2. **Intensidad antes del partido** (relajado, normal, a tope) hasta que haya decisiones dentro: ¿vale?
3. **Cambios y minutos:** ¿5 cambios, o sin límite como en algunas federaciones de fútbol base? ¿Todos los convocados juegan algún minuto?
4. **Experiencia:** ¿×0,75 a ×1 en vez de ×0 a ×1, para que jugar por primera vez en un puesto no deje el valor a cero?
5. **Ventaja de jugar en casa:** ¿pequeña (+4 %) o ninguna?
6. **Tarjetas:** ¿la roja o varias amarillas suspenden el partido siguiente?
7. **Lesiones en el partido:** ¿se dejan para E12 (salud y lesiones) o se empieza con algo sencillo?
