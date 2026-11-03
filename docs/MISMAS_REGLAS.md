# Personaje y PNJ: las mismas reglas

Diseño del 02/11/2026, **decidido por el usuario** («tiene mucho más sentido el 1» y «los personajes deberían tener todos no el tope, sino también los puntos de verdad»), con los dos detalles de §9 decididos el 02/11. Va **antes de la F2 del fútbol**: el motor de los partidos y el entrenador necesitan saber cuánto vale de verdad cada jugador en cada habilidad.

---

## 1. El problema

Medido con 12 semillas en la rama del PR #60:

| | Valor medio |
|---|---|
| Potencial genético del personaje en fútbol | 60,4 (niños: 62), **percentil 46**: del montón |
| Nivel de fútbol del personaje al empezar, como lo calcula el juego | 9,5 |
| El mismo personaje con la fórmula de los niños | 12,9 |
| Niños de su categoría | 47 de 8 años (nivel 14,4) y 50 de 9 (16,5) |
| Equipo del colegio en benjamín (lleno al empezar) | el peor 12,8, la media 17,4 |

El personaje no es peor: **se calcula con otro modelo**.

| | Personaje | Niño (hoy) |
|---|---|---|
| Genética | Tope de cada una de las 18 capacidades | Igual |
| Capacidades actuales | Sí, con su valor | **No: solo los topes** |
| Habilidades del deporte | Una por habilidad; empiezan entre 5 y 15 y solo suben entrenando | **No: un solo número por deporte** |
| Su valor | Lo que ha entrenado | Una fórmula: potencial × 75 % de lo que permite su edad × forma del año × ventaja de crianza |
| Sin entrenar | Sus capacidades crecen solas hasta el 45 % de lo que permite su edad | Ya está en el 75 % |
| Al empezar un deporte | Desde cero | En el nivel de su edad, como si llevara años |

El 75 % de los niños se calibró frente a un personaje que entrena muy bien durante años («un rival típico no entrena a diario como el mejor jugador posible»). Pero al empezar la partida el personaje aún no ha entrenado nada.

## 2. El principio

**Una persona es una persona.** El personaje y cualquier PNJ con genética siguen **las mismas reglas** en todo lo que les hace valer algo: genética, capacidades, habilidades de cada deporte, conocimiento, experiencia en un puesto, desarrollo con la edad, caída sin práctica y rendimiento en una competición.

Lo único distinto, a propósito:

- **Quién decide qué hace.** El jugador elige las acciones del personaje. Un PNJ sigue una **rutina**: las sesiones de su club, los partidos o carreras, los ejercicios que elige su entrenador y el verano. Esa rutina se cumple más o menos según su constancia y su forma del año.
- **Cada cuánto se calcula.** El personaje vive día a día (energía, estrés, motivación y salud cambian con cada acción). Un PNJ lleva **los mismos estados que importan para jugar** (corregido el 02/11 con `VISION.md`: datos de verdad para todos): **condición física** (baja con las sesiones y los partidos y se recupera descansando), **moral** (sube y baja con los resultados, los minutos y su relación con el entrenador), **forma** (cómo le va estas semanas) y **salud** (lesiones). Se actualizan cada semana y en cada partido, no cada hora.

## 3. Qué guarda cada PNJ con genética

Niños, jóvenes, hermanos y rivales:

| Dato | Hoy | Con esto |
|---|---|---|
| Genética (topes, perks, desfase, ventaja de crianza) | Sí | Igual |
| **Capacidades actuales** (las 18 de `gen`) | No | **Sí**, con su valor y el máximo alcanzado (para la caída) |
| **Habilidades de cada deporte que practica o ha practicado** | Un número por deporte (`levels`) | **Las mismas habilidades que el personaje** (en fútbol, las 29), con su valor y su máximo |
| **Conocimiento** de cada deporte | No | **Sí** |
| **Años practicando** cada deporte | No | **Sí** (desde cuándo) |
| **Experiencia en cada puesto** (deportes de equipo) | No | **Sí**, guardada partido a partido en los puestos en que ha jugado (F3) |
| **Estado** (condición física, moral, forma, salud) | No | **Sí** (corregido el 02/11 con `VISION.md`: datos de verdad para todos) |
| **Historial** (temporadas, equipos, partidos, minutos, goles, notas) | No | **Sí**: lo que necesitará un ojeador, un entrenador o un mánager (corregido el 02/11 con `VISION.md`: datos de verdad para todos) |

Los adultos (padres, profesores, entrenadores) se quedan como están hasta el futuro módulo de profesiones (decisión del 28/10: las habilidades de los entrenadores son parte de ese módulo). Están preparados para tener lo mismo.

## 4. Cómo crece un PNJ: el mismo motor

- **Las fórmulas del motor se comparten.** Las de progresión de `packages/core/src/progression.ts` (ganancia, techo, velocidad, caída, curva de edad, desarrollo natural y ritmo según el tope) son puras: pasan a `contracts` y las usan el motor (para el personaje) y `npcs` (para los PNJ). No hay dos copias que puedan separarse.
- **Desarrollo natural:** igual que el personaje. Sin entrenar, cada capacidad sube sola hasta el 45 % de lo que permite su edad.
- **Su rutina** es lo que habría hecho un personaje en su lugar:
  - va a las sesiones de su club (sus días y su calidad) **según su constancia**, la que ya sale de su determinación, concentración y resiliencia (`ritmoEn`), y su forma del año;
  - entrena **lo que elige su entrenador**: en fútbol, los mismos dos ejercicios que el personaje cuando están en el mismo equipo;
  - compite (carreras, partidos según sus minutos);
  - en verano, algo menos.
- **Cada semana, no cada día.** Para que no pese, la rutina de una semana se aplica de una vez (siete días de desarrollo y caída, las sesiones de la semana y su competición). Un test comprueba que da lo mismo que día a día (dentro de un margen).

## 5. Al crear la partida: la historia de cada niño

Los niños de 9 a 19 años que ya juegan a un deporte llevan años. Cada uno tiene su **edad de empezar** (decidido, §9), con un azar estable: **desde los 6** los muy interesados o con padres deportistas, **entre los 8 y los 10 la mayoría**, y algunos más tarde. Sus valores iniciales son los de **haber seguido su rutina desde entonces**.

**Antes de empezar en un club, juego informal.** Todo niño (y el personaje, §7) ha jugado un poco a los deportes que le gustan, con amigos o en el patio: es la misma rutina que «practicar con los amigos» (poco rendimiento, sin entrenador), unas semanas al año según su interés por ese deporte. No cuenta como años practicando.

Simular años de rutina para ~1.400 personas al crear la partida puede ser lento. Dos formas, a elegir **midiendo**:

1. **Simularlo de verdad**, semana a semana, desde los 6 años de cada uno. Es exacto, pero hay que medir cuánto tarda (objetivo: menos de 2 s, con la pantalla de espera que ya existe).
2. **Una fórmula cerrada** («valor tras N años de rutina a este ritmo») calibrada contra la simulación, con un test que las compare.

## 6. El rendimiento: una función para todos

- La función de rendimiento de cada deporte (la de las pruebas de acceso, la carrera o el partido) se escribe sobre un **lector de persona** (`stat(id)`, `norm(id)`), no sobre el contexto del personaje. Así se aplica igual al personaje y a cualquier PNJ.
- **Atletismo** deja de usar el número fijo `levels.atletismo`: el rendimiento de cada rival sale de sus capacidades y sus tres habilidades reales. `NpcView.levels` sigue dando un número por deporte (el rendimiento), calculado una vez por semana, para no romper lo que lo lee.
- **El entrenador** ya puede saber dónde pone a cada uno: con las habilidades reales calcula lo que vale cada jugador en cada puesto (F3) y hace la alineación. El reclutamiento y la plaza del equipo también comparan rendimientos reales.

## 7. El personaje al llegar

- **Llega a la ciudad sin haber practicado ningún deporte en un club** (cero años de práctica; decidido, §9). A partir de ahí sigue exactamente las mismas reglas.
- **Pero sí trae algo de casa y del patio:**
  - **conocimiento** de cada deporte por lo que practicaron sus padres (ya existe: `conocimientoDeCrianza`);
  - **un pequeño plus de haber jugado un poco**, sobre todo en sus deportes favoritos: el **juego informal** de §5, con la misma regla que los niños. Según su interés por cada deporte (0 a 3, los intereses que hereda de sus padres): ninguno, unas 4, 8 o 12 semanas de juego con amigos. Da algo en las habilidades de ese deporte (y un poco de conocimiento), no años de práctica: un niño que lleva dos años en un club sigue por delante.
- Frente a sus compañeros de 8 años que empiezan este curso, está igual. Frente a los que empezaron a los 6, por detrás, y es lo realista: con constancia los alcanza.
- **Sin plaza reservada en ningún equipo** (corregido por el usuario el 02/11: había entrado en este documento como decidida sin que lo estuviera). Un sitio guardado lo metería en el equipo **como el peor**, y así difícilmente jugaría: no es realista ni sirve. El personaje entra como cualquier niño: si el equipo tiene hueco (no ha llegado a su máximo) o, si está completo, si es mejor que alguno de los que hay. Lo que se espera es que, con las mismas reglas que los demás (§2), un personaje del montón pueda ganarse el sitio entrenando por su cuenta y con el juego informal. **Tras la P2 se mide con semillas** cuánto le cuesta entrar. Si un personaje del montón casi nunca entra, se revisa con una regla para todos (más equipos o plantillas en el colegio cuando hay muchos interesados), nunca con un trato especial al personaje. La dificultad ya existe en parte en el motor (la calidad de los padres del personaje); se deja fija en «normal» hasta la creación de personaje.

## 7 bis. Los clubes de fuera fichan a los que destacan (propuesta del usuario, 02/11)

**Con la ciudad grande (`CIUDAD_Y_LIGAS.md`, 02/11), los clubes de fuera son los clubes de la zona** (grandes, medianos y pequeños, con filiales). El club del colegio es uno pequeño más. Las reglas de abajo siguen igual; las cifras de «unos 54 interesados por categoría» eran de la ciudad pequeña.

Para que un personaje del montón pueda entrar en el equipo de su colegio sin trato especial, y porque es lo que pasa en la realidad (los que quieren mejorar acaban en un club):

- **Los clubes de fuera reclutan primero**, los de más calidad antes, entre los niños de todos los colegios, **por lo que vale cada uno de verdad**. Ya funciona así en atletismo.
- **No se van todos los buenos:** cada niño decide según su **ambición** (eje de carácter), lo que practicaron sus padres y que el club tenga plaza. Algunos se quedan en el colegio con sus amigos.
- **Cada verano los clubes fichan** a los que más han destacado esa temporada en los equipos de colegio: las plantillas cambian de verdad.
- El equipo del colegio se queda con los que juegan por gusto o aún no destacan. Con unos 54 interesados por categoría, si los clubes se llevan a 12–15 de los mejores, un niño del montón queda por la mitad de los que optan a las 18 plazas.
- **En la P2 hacen falta clubes de fútbol de fuera** (con sus equipos por categoría), aunque el personaje no pueda aún pedir su prueba de acceso (eso sigue en la F5 del fútbol).
- **Tras la P2 se mide con semillas** cuánto le cuesta entrar a un personaje del montón. Si aún es muy difícil, se ajusta el número de clubes o de plazas, nunca con un trato especial al personaje.

## 8. Lo que no cambia y lo que hay que vigilar

- **Cambia la partida** (`npm run huella` deja de servir para comparar con antes) y el **balance del atletismo**: los rivales de 8 años que empiezan este curso serán más flojos que ahora. Hay que pasar `npm run sim` antes y después, y recalibrar la rutina (las sesiones por semana de cada club) para que un rival que lleva años quede donde quedaba.
- **Peso de la partida.** Unas 1.400 personas × 18 capacidades (valor y máximo) más las habilidades de los que practican (fútbol: 29 por futbolista) dan unos 350 KB más sobre 2,4 MB (+15 %). Hay que medirlo con `npm run rendimiento`. Si hiciera falta, se guardan con un decimal.
- **El test que lo ata, para no volver a tocarlo:** un PNJ y el personaje con **la misma genética y la misma rutina** acaban con los mismos valores (dentro de un margen pequeño). Si alguien cambia una regla para uno solo, el test falla.

## 9. Decidido el 02/11

1. **Edad de empezar de los niños:** desde los 6 los muy interesados o con padres deportistas, entre los 8 y los 10 la mayoría, algunos más tarde (§5).
2. **El personaje al llegar:** sin años de práctica en un club, pero con conocimiento (lo que practicaron sus padres) y un pequeño plus de haber jugado un poco a los deportes, más en sus favoritos (§7). Para que sea la misma regla para todos, ese plus es el **juego informal** que también tienen los niños antes de entrar en un club (§5).

## 10. Fases

| Fase | Qué |
|---|---|
| **P1** ✅ (#63) | Fórmulas de progresión compartidas en `contracts`. Capacidades reales de los PNJ con desarrollo natural y caída semanales. Historia al crear la partida (§5, midiendo), con la edad de empezar decidida. Test de equivalencia de capacidades |
| **P2** (P2a-1 ✅ en el #69: habilidades, conocimiento, rutina, juego informal, lector de persona y ejercicios por equipo; quedan P2a-2: estado e historial; P2b: clubes de la zona; P2c: medidas) | Habilidades, conocimiento, estado e historial de cada deporte en los PNJ; clubes de fuera que reclutan y fichan a los que destacan (§7 bis); con la rutina de su club (y los ejercicios del entrenador) y el juego informal antes de empezar; el mismo juego informal da al personaje su plus inicial según su interés (§7). Rendimiento con lector de persona para todos; atletismo lo usa. Medir con semillas cuánto le cuesta al personaje entrar en el equipo de su colegio (sin plaza reservada, §7). Recalibrar la simulación. Test de equivalencia de habilidades |

Después, la **F2 del fútbol** usa los valores reales para el entrenador, la alineación y el partido.
