# Partidos más reales (24/11/2026)

Encargo de la arquitectura (rama `claude/partidos-reales`, desde `claude/youthful-clarke-vs0kye`), a petición del usuario del 22/11: *«A medio plazo deberíamos planificar la mejora de los partidos de fútbol, ampliando los cálculos para que sea lo más cercano posible a un partido y no solo secciones.»* Más adelante: ligas de todo el mundo (miles de partidos por semana), un visualizador de partidos y una fase de entrenador o mánager.

**Es un análisis con plan por fases. No se ha tocado el juego** (`npm run huella -- 60` idéntica, §7). Lo que hay nuevo es una herramienta aparte, `tools/partidos-reales-prototipo.ts` (`npm run partidos:prototipo -- [partidos] [prueba|grande]`), que simula el mismo partido de cuatro maneras con los jugadores reales de la ciudad y mide el coste. No se ha editado `docs/DECISIONES.md`.

Máquina de las medidas: contenedor de 4 CPU, Node 22, **una sola hebra**, ciudad de prueba con equipos reales de la zona (200 partidos por motor, parejas al azar de cada categoría). Los ms son de ordenador de mesa; en un móvil, ×4 a ×6 (`medir-rendimiento-2.md`).

## 0. Resumen

1. **Hoy** el partido son 6 tramos de 15 minutos en los que se tiran unos dados con cuatro medias de equipo (portería, defensa, creación, ataque). Da marcador, tiros y goles razonables, pero **no hay faltas, tarjetas, córners como cifra, penaltis en juego, pases ni jugadas, ni táctica, ni lesiones**, y el jugador solo deja goles, asistencias, tiros, paradas, minutos y nota (§1).
2. **Más tramos no acerca el partido a la realidad**: con 18 o 30 tramos el motor cuesta lo mismo (0,8 ms) y da el mismo tipo de resultado; solo añade más detalle de cansancio. No es una fase con valor por sí misma (§2.1).
3. **El salto de verdad es el modelo de posesiones y ocasiones con xG (opción B).** En el prototipo cuesta **menos que el motor de hoy** (0,42 ms frente a 0,75 ms, más 0,48 ms de preparar a los jugadores) y da **25 faltas, 4 amarillas, 8 córners, 16 tiros a puerta, xG y ~900 pases por partido**, con estadísticas de verdad para cada jugador (§2.2).
4. **Las jugadas por zonas (C)** cuestan 2,4 ms y dan una crónica con ~800 sucesos y pases por jugador: son lo que pide un visualizador esquemático y las decisiones del motor F7. **La simulación espacial (D)** cuesta 18–33 ms por partido: **solo cabe para el partido del personaje**, nunca para el mundo (§2.3, §2.4).
5. **Dos (en realidad tres) niveles del mismo motor sí son aceptables con la visión**, con una condición medida en el prototipo: un modelo grueso solo vale si pasa un test de distribución. Un Poisson con los goles esperados bien calculados **pasa** la prueba chi² contra el modelo detallado; el mismo Poisson con una fórmula simple de tres parámetros **no la pasa** (χ² de 108 con 7 grados de libertad). Es decir: se puede, pero la fórmula de los goles esperados hay que ajustarla con muchos puntos, y el test tiene que estar en `npm test` (§3).
6. **Lo que más cuesta hoy no es el motor.** De los 111 ms de la jornada de liga con ~75 partidos (1,5 ms por partido), el motor son 31 ms; preparar a los dos equipos (`ladoDelPartido`) son 40 ms y aplicar los resultados a cada jugador (`partido.mundo`) otros 32. Con miles de partidos por semana, ese **resto** (≈1 ms por partido) manda más que cualquier motor de B o C (§2.5).
7. **Recomendación:** hacer B para todos (mismo coste, mucha más información), con el motor construido como una **máquina de estados que avanza por minutos y deja un registro de sucesos común**; eso permite enchufar después C (detallado) para el personaje y los cercanos, un modelo grueso calibrado para los lejanos, el visualizador y las decisiones de F7 sin rehacer nada (§6).

## 1. Cómo funciona hoy

Archivo: `modules/futbol/src/partido.ts` (489 líneas). El diseño y las decisiones del 01/11 están en `docs/MOTOR_PARTIDOS.md`; el día de partido (hora, convocatoria, vestuario) en `dia-de-partido.ts` y no toca el cálculo.

### 1.1 Qué se calcula, tramo a tramo

`jugarPartido(local, visitante, opciones)` (`partido.ts:275`) es una función pura: mismos equipos, mismo `id` y misma semilla (`rngEstable('partido', semilla, id)`, línea 278), mismo resultado. **Un solo flujo de azar para todo el partido**: cualquier dado nuevo que se añada en medio cambia todos los resultados siguientes (por eso, en §4 y §6, cada subsistema tendrá su propio flujo).

Parámetros en `PARAMETROS_DE_PARTIDO` (líneas 28–65):

| Paso | Qué hace | Cifra | Línea |
|---|---|---|---|
| Tramos | 6 de 15 minutos (3 por parte) | `tramos: 6` | 30–31 |
| Cambios | los más cansados salen por un suplente del mismo grupo de puestos, después de los tramos 1, 3 y 4; 5 en total | `CAMBIOS_DE_LIGA` (`index.ts:966`), `hacerCambios` | 397–414 |
| Cansancio | cada jugador sube `7,5 × intensidad × (1,5 − resistencia) × (1 + energía que falta/100)` por tramo (~45 al acabar un jugador típico descansado); el rendimiento baja por la tabla de 5 escalones del addon (×1 … ×0,3) y por la intensidad (×0,93 / ×1 / ×1,07) | `cansancioPorTramo: 7,5` | 199–209 |
| Zonas | cada equipo se resume en 4 valores (portería, defensa, creación, ataque): media de lo que valen los 11 en el campo en las habilidades de la zona, ponderada por lo que su puesto aporta a ella (`PARTICIPACION_DEL_PUESTO`, sale de los pesos del puesto) y por su cansancio; +4 % para el local | `ventajaDeCasa: 0,04` | 188–194, 244–253 |
| Posesión | `creación_propia² / (creación_propia² + creación_rival²)` | | 298 |
| Ataques | **6 por tramo entre los dos equipos** (36 por partido), repartidos con la posesión (cada uno un sorteo con la posesión como probabilidad) | `ataquesPorTramo: 6` | 301–302 |
| Ocasión | un ataque llega a ocasión con `0,47 × 2 × relativo × (absoluto/ref)`: relativo = poder del ataque (0,4 creación + 0,6 ataque) frente a la defensa rival; absoluto = frente a una dificultad fija de 22 | `ocasionBase`, `dificultadDeLaOcasion` | 308–315 |
| Quién tira | sorteo entre los de campo con peso `participación de ataque × (valor de ataque × cansancio)^1,5` | | 317 |
| Gol | `0,19 × 2 × mejorQue(tiro, portero)^1,2`; tiro = 0,6 definición + 0,25 disparo lejano + 0,15 cabeza; portero = media de sus 6 habilidades de portería. Asistente: el 65 % de las veces, sorteado por creación × pase | `golBase`, `potenciaDelGol` | 320–324 |
| Balón parado | 1,2 lanzamientos por tramo y equipo (media), un único lanzador (el mejor) y rematador sorteado por cabeza²; `0,07 × 2 × …` de gol, hasta 0,5 | `balonParadoPorTramo`, `golDeBalonParado` | 331–344 |
| Notas | parten de 6 y suben con goles (+1), asistencias (+0,6), resultado (±0,3) y rendimiento en su zona frente a la media de su grupo; portería y defensa bajan con los goles encajados; se escalan por los minutos | | 371–392 |
| Tanda de penaltis | 5 + muerte súbita, solo para la copa | `PARAMETROS_DE_PENALTIS` | 419–489 |

Con esto, por partido, el motor de hoy da en el prototipo **~28 tiros (ocasiones más balón parado), 3,8 goles** entre parejas al azar de la ciudad (incluye A contra B y diferencias grandes de nivel; los 2,9 de `MOTOR_PARTIDOS.md` §5 son de ligas con equipos parecidos) y **36 sucesos** en la crónica (goles, ocasiones, balón parado y cambios; ~3 KB).

### 1.2 Qué se calcula y qué se resume

- **Se calcula de verdad:** el valor de cada jugador en cada habilidad antes del pitido (`valorEnPartido`, 177–185), su cansancio acumulado, quién está en el campo (cambios), cada ataque como un sorteo, el tirador y el asistente, el portero que enfrenta el tiro.
- **Se resume:** los **11 jugadores a 4 números por equipo** (`valorDeLaZona`). Un duelo concreto —regate contra entrada, un pase largo, un desmarque— no existe: lo que existe es la media del medio campo contra la media de la defensa. Dentro de un tramo no hay orden: los 6 ataques y los 2,4 balones parados salen sin tiempo ni secuencia (el minuto de un gol es el tramo, 15 minutos).
- **No pasa nada entre los jugadores:** el delantero no se enfrenta al central que le marca; el lateral no «sube» ni «baja». El puesto solo pesa en cuánto aporta a cada zona.

### 1.3 Qué datos de cada jugador usa

| Dato | ¿Lo usa? | Cómo |
|---|---|---|
| **Habilidades** (29 en el addon) | 24 sí | 6 de portería, 7 de defensa (con velocidad y fuerza), 6 de creación, 7 de ataque, más `faltas`/`córners`. **No entran en juego abierto** `salto`, `despeje`, `saque_banda`; `penaltis` y `sangre_fria` solo en la tanda |
| **Capacidades de apoyo** (`gen.*`) | sí | el valor de cada habilidad se multiplica por un factor de ×0,6 a ×1,2 según sus capacidades de apoyo frente a un adulto típico (40); velocidad y fuerza entran además directamente en defensa; `resistencia` en el cansancio |
| **Puesto** | sí | solo reparte cuánto aporta a cada zona (`PARTICIPACION_DEL_PUESTO`) y a quién sortea de tirador |
| **Experiencia en el puesto** | **no** | se guarda partido a partido (`experienciaTrasElPartido`) pero **todavía no multiplica el valor en el partido** (F3, `MOTOR_PARTIDOS.md` §3 y §12) |
| **Cansancio** | sí | por tramo, con la resistencia y la energía con que empieza |
| **Conocimiento del fútbol** | sí | `valorEfectivo` con sensibilidad por habilidad (lo táctico del todo, lo técnico a medias, lo físico nada: de ×0,85 a ×1,15) |
| **Potenciador** (categoría × nivel) | sí | `POTENCIADOR_POR_CATEGORIA` (prebenjamín ×4 … sénior ×1) para llevar a todos a escala de adulto; las divisiones aún no tienen segundo factor |
| **Forma y salud del día** (`rinde`) | sí | `factorDeCompeticion(eficienciaDeEstado)` en toda su zona y su tiro |
| **Energía / condición física** | sí | sube el cansancio por tramo |
| **Intensidad** (relajado / normal / a tope) | sí | solo el personaje la elige; los demás, normal |
| Pierna buena, ocultas (consistencia, dureza, agresividad, liderazgo), carácter, cuerpo (altura, peso, músculo) | **no** | están en el juego pero el motor no los lee |

### 1.4 Qué no se modela

Posesión como secuencia de pases (solo un número por tramo), ocasiones con calidad distinta (todas valen igual: un tiro es un tiro, sin xG), jugadas encadenadas, **táctica** (formación fija 1-2-2-3-2-1 de la convocatoria, sin estilo, presión ni consignas; los roles son F3), **cambios** solo automáticos por cansancio (no tácticos, no por marcador, no forzados), **faltas, tarjetas y sanciones** (decisión 6 del diseño, pendiente), penaltis en juego (solo tanda), córners y fueras de juego como estadística, **lesiones** (no existe el servicio `salud` en `packages/contracts/src/services.ts`; la probabilidad sería 0 y el diseño de §9 de `MOTOR_PARTIDOS.md` está sin implementar), efecto del marcador (el que pierde no ataca más), momento de los goles dentro del tramo, tiempo añadido, prórroga, campo, clima o público (la ventaja de casa es un +4 % fijo).

## 2. Opciones para acercarlo a un partido real

Todas las medidas salen de `tools/partidos-reales-prototipo.ts`. **A** es el motor real con los parámetros cambiados; **B, C y D son prototipos escritos para medir**, ajustados «a ojo» en unas pocas pasadas para que den cifras del orden de un partido real entre equipos parecidos; **D está menos ajustado** (marca de más: 4–6 goles, xG por tiro demasiado alto). Sirven para el **coste** y para ver qué estadísticas salen, no como motores calibrados. Los 32 jugadores se preparan una vez por partido con las mismas 24 habilidades que usa `valorEnPartido` (**0,48 ms por partido**, que B, C y D necesitan y el motor de hoy ya lleva dentro).

### 2.0 Resultados (200 partidos por motor)

| Motor | ms por partido (sin preparar) | Goles | Tiros | A puerta | xG | Posesión (σ) | Faltas | Amarillas | Rojas | Córners | Pases | Sucesos | KB del registro | Preguntas de lesión |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Hoy** (6 tramos) | 0,75 | 3,77 | 28,3 | — | — | 53 % (12) | — | — | — | — | — | 36 | 3,1 | 0 |
| **A1** · 18 tramos de 5 min | 0,82 | 3,69 | 28,3 | — | — | 53 % (12) | — | — | — | — | — | 36 | 3,1 | 0 |
| **A2** · 30 tramos de 3 min | 0,77 | 3,31 | 25,9 | — | — | 53 % (12) | — | — | — | — | — | 33 | 3,0 | 0 |
| **B** · posesiones y xG | **0,42** | 2,83 | 31,7 | 16,4 | 2,85 | 53 % (13) | 23,6 | 4,2 | 0,49 | 8,0 | 925 | 63 | 5,2 | 24 |
| **C** · jugadas por zonas | **2,35** | 3,27 | 33,8 | 18,7 | 3,11 | 50 % (10) | 27,2 | 4,5 | 0,43 | 3,7 | 651 | 835 | 34,0 | 47 |
| **D** · espacial, paso de 1 s | **17,95** | 5,63* | 26,6 | 15,1 | 5,32* | 51 % (2) | 5,9* | 1,0* | 0* | 0* | 1.187 | 835 | 42,5 | 1.806 |
| **D** · espacial, paso de 0,5 s | **32,50** | 4,31* | 21,9 | 12,6 | 4,07* | 51 % (2) | 6,0* | 1,1* | 0* | 0* | 1.359 | 980 | 50,1 | 1.806 |

\* Sin calibrar: D no tiene faltas completas, saques de esquina ni expulsiones, y su xG por tiro es demasiado alto. Solo vale el coste. «Sucesos» es el tamaño del registro del partido (lo que leería una crónica o un visualizador), con el JSON tal cual (sin comprimir).

Las «preguntas de lesión» son las veces que el prototipo llamaría al gancho de salud (§4): en B, una por falta; en C, una por falta y una cada ~2 minutos para el que tiene el balón; en D, una por minuto y jugador (más las faltas).

### 2.1 Opción A — Más tramos y más sucesos por tramo

- **Qué es:** el motor de hoy con 18 tramos de 5 minutos (2 ataques y 0,4 balones parados por tramo) o 30 de 3 minutos (1 ataque y 0,24 balones parados por tramo, para que los enteros salgan), cansancio por tramo reescalado y cambios en los mismos minutos.
- **Realismo:** casi el mismo. El número de goles se queda en 3,3–3,8 y los tiros en 26–28. Cada ataque sigue siendo un dado sin jugadores enfrentados.
- **Datos que pasa a usar:** los mismos.
- **Qué permitiría:** goles con minuto (de 5 en 5 o de 3 en 3, no de 15 en 15), cansancio y cambios más finos, y más sitio para añadir faltas y tarjetas por tramo. Nada de pases, ni jugadas, ni xG, ni estadísticas nuevas por jugador.
- **Coste medido:** **0,77–0,82 ms**, igual que hoy (0,75): el coste lo domina preparar a los jugadores, no los tramos.
- **Escala:** igual que hoy.
- **Juicio:** **no merece ser una fase aparte.** Más tramos sin cambiar el modelo no acerca el partido a la realidad; el minuto exacto de los goles y el cansancio fino se consiguen gratis con B.

### 2.2 Opción B — Posesiones y ocasiones (xG)

- **Qué es:** el partido son unas **215 posesiones** (2,45 por minuto) con un reloj de minutos. Cada posesión: quién la tiene (creación frente a creación), si avanza hasta el último tercio (creación + ataque frente a defensa), si acaba en tiro, con qué tipo de tiro (juego, cabeza, lejano) y **qué calidad tiene la ocasión (xG)**; el tirador se sortea por puesto y habilidad de remate, el asistente por pase; el tiro se bloquea, sale fuera, va a puerta, lo para el portero o es gol (la probabilidad de gol de un tiro a puerta es su xG ajustado por el tirador frente al portero). Aparte, **faltas** (por minuto, sorteando al infractor por su entrada y a la víctima por su regate), **amarillas, rojas y doble amarilla**, **penaltis** (un 1,2 % de las faltas), **córners**. El cansancio sube por minuto, no por tramo, y los valores de las zonas se recalculan cada 5 minutos.
- **Realismo:** el de las estadísticas de un partido, no el de cómo se juega. Entre equipos parecidos da en el prototipo **~32 tiros (16 a puerta), xG de 2,85, 24 faltas, 4,2 amarillas, 0,5 rojas, 8 córners, ~900 pases** y marcador de 2,8 goles. Faltan cambios tácticos, estado del marcador, fueras de juego y jugadas con nombre.
- **Datos de los jugadores que pasa a usar:** las 24 habilidades de hoy, más: `entrada` y `regate` (faltas), `cabeza` y `disparo_lejano` por separado en el tipo de tiro, `alcance_aereo`/`blocaje`/`mano_a_mano` del portero por tipo de tiro; con F4 entrarían **dureza y agresividad** (faltas y tarjetas) y **consistencia** (la forma del día).
- **Qué permitiría:**
  - **crónica más rica**: tiros bloqueados, fuera, a puerta con su xG, faltas, tarjetas, córners, penaltis, minuto de cada cosa («min. 34, falta de un 6 sobre ti»);
  - **estadísticas por jugador reales**: tiros, a puerta, xG, faltas, tarjetas, paradas (para `Npc.est` y la ficha);
  - **notas** a partir de lo que de verdad aporta (xG creado y marcado, paradas sobre xG encajado) en vez de goles y rendimiento medio;
  - sanciones por tarjetas (decisión 6) y expulsiones que dejan a un equipo con diez;
  - **táctica simple** como parámetros (ritmo de posesiones, directo/combinativo, presión) que cambian las probabilidades;
  - **decisiones del motor F7 cada 5–15 minutos** (intensidad, cambios, estilo), porque el partido ya es una máquina que avanza por minutos;
  - **no** sirve para un visualizador: no hay lugar ni trayectorias.
- **Coste medido:** **0,42 ms + 0,48 ms de preparar = 0,90 ms**, **menos que el motor de hoy** (0,75 ms con su propia preparación y sin ninguna estadística nueva). Registro de 63 sucesos, 5,2 KB (JSON sin comprimir).
- **Escala** (solo motor + preparación; ver §2.5 para lo que lo rodea): 75 partidos = 0,07 s; 1.000 = 0,9 s; 5.000 = 4,5 s; 10.000 = 9 s.

### 2.3 Opción C — Jugadas encadenadas por zonas

- **Qué es:** el campo son **12 zonas** (4 filas × 3 pasillos). Hay un jugador con el balón en una zona; cada vez elige una acción (pase corto, pase largo, regate, tiro, centro) y el resultado sale de **su** habilidad frente a la de los rivales de esa zona (los que defienden a esa altura según su puesto, anticipación frente a pase, entrada y marcaje frente a regate). Una jugada es una cadena de acciones hasta que se pierde el balón, se tira o hay falta. Los jugadores se desplazan por zonas con su puesto y con quién ataca. Unas **800 acciones por partido**, cada una con quién, dónde y contra quién.
- **Realismo:** alto en lo estadístico (en el prototipo, 34 tiros, 19 a puerta, 27 faltas, 4,5 amarillas, 650 pases, posesión de 50 % ± 10) y reconocible en la forma: el delantero recibe, el central despeja, el extremo regatea. Faltan tácticas con intención (el equipo no «decide» pasar atrás) y el movimiento sin balón.
- **Datos de los jugadores que pasa a usar:** casi todo, y **cada uno por separado** (no una media de zona): pase, visión, control, desmarque, regate, entrada, marcaje, anticipación, posicionamiento, decisiones, juego colectivo; los **puestos y los roles** pasan a decir en qué zona está cada uno (F3); entra la **experiencia en el puesto** y las ocultas (consistencia, dureza); `centros`, `saque_banda`, `salto` y `despeje` dejan de estar sin uso.
- **Qué permitiría:**
  - **crónica rica**: «jugada de 7 pases por la derecha, el 7 centra, el 9 remata de cabeza y el portero se la saca»;
  - **estadísticas completas por jugador**: pases y precisión, regates, entradas, pases clave, faltas, xG creado y marcado (lo que en FM se ve como ficha);
  - **notas** por contribución real en cada puesto;
  - **táctica de verdad**: formación, roles, consignas (juego directo, por bandas, presión alta) como pesos de las acciones y de las zonas;
  - **visualizador esquemático** (pizarra): cada suceso lleva zona y jugadores, suficiente para animar una pizarra o un mapa de calor sin simular el campo;
  - **decisiones durante el partido (F7)**: se puede parar en cualquier acción, cambiar la consigna o el jugador, y seguir;
  - base de la **fase de mánager** (hacer ajustes y ver que cambian jugadas, no solo un número).
- **Coste medido:** **2,35 ms + 0,48 ms = 2,8 ms**. Registro de 835 sucesos y **34 KB** de JSON (estimo 8–10 KB con un formato compacto; no medido): no se puede guardar el registro de todos los partidos.
- **Escala:** 75 partidos = 0,2 s; 1.000 = 2,8 s; 5.000 = 14 s; 10.000 = 28 s. Inviable para todo el mundo; razonable para decenas de partidos por semana.

### 2.4 Opción D — Simulación espacial con posiciones

- **Qué es:** 22 jugadores y el balón en un campo de 105 × 68 m. Cada paso (1 s o 0,5 s) todos se mueven hacia su sitio (ancla de su puesto desplazada hacia el balón y según quién ataca) a una velocidad que sale de su capacidad `velocidad` y su cansancio; el que lleva el balón conduce, decide cada 1–3 s entre tirar o pasar (al compañero mejor situado con la línea libre de rivales); los rivales cerca disputan el balón; los pases viajan y pueden interceptarse. 5.400 o 10.800 pasos por partido.
- **Realismo:** el máximo posible (hay desmarques, líneas de pase, distancias, carreras), pero **un modelo espacial bien hecho es una caja negra con decenas de parámetros** de movimiento, decisión y física que calibrar. El prototipo (unas 150 líneas) solo demuestra el coste; no está calibrado y no pretende dar un partido creíble.
- **Datos de los jugadores que pasa a usar:** además de lo de C, **capacidades físicas con unidades** (velocidad en m/s, resistencia como capacidad de repetir sprints, fuerza y **altura/peso/músculo de `cuerpo.ts`** para los duelos aéreos y de balón), `salto`, equilibrio, **pierna buena** (hacia qué lado conduce y centra), visión espacial.
- **Qué permitiría:** el **visualizador real** (posiciones a lo largo del tiempo), mapas de calor y distancia recorrida por jugador, fuera de juego, pressing y líneas de verdad, y una fase de mánager donde la táctica se ve en el campo.
- **Coste medido:** **18 ms (paso de 1 s) o 32,5 ms (paso de 0,5 s)** por partido; 1.800 preguntas de lesión por partido si se pregunta por minuto y jugador.
- **Escala:** 75 partidos = 1,4–2,5 s (ya no cabe en el presupuesto de una semana); 1.000 = 18–33 s; 5.000 = 90–165 s; 10.000 = 3–5,5 minutos. **Solo cabe para el partido del personaje** (y quizá el que está viendo), nunca para el mundo; en un móvil (×4–×6) son 0,1–0,2 s para un partido: bien.

### 2.5 Lo que cuesta alrededor del motor (medido en el juego, no en el prototipo)

`docs/relevo/medir-rendimiento-2.md`, ciudad grande, jornada de liga con ~75 partidos (111 ms de 241 ms del cruce de semana, el 46 %):

| Parte | ms por jornada | ms por partido |
|---|---|---|
| `ladoDelPartido` (plantilla, lectores y convocatoria de cada equipo) | 40,5 | 0,54 |
| `jugarPartido` (el motor) | 30,8 | 0,41 |
| `partido.mundo` de `npcs` (aplica a cada jugador lo del partido) | 31,8 | 0,42 |
| Otros (`elDiaDeUnJugador`, `contextoDelDia`) | 2,0 | 0,03 |
| **Total** | **~111** | **~1,5** |

**Con miles de partidos por semana, el motor deja de ser lo principal**: 5.000 partidos son 7,4 s por semana **ya con el motor de hoy** (75 → 5.000 ×66), de los cuales solo ~2 s son el motor. El presupuesto de `CIUDAD_Y_LIGAS.md` §8 (menos de ~1 s al avanzar una semana en un ordenador normal) no se alcanza con miles de partidos pase lo que pase, y menos en un móvil. Hace falta, **aunque no se cambie el motor**:

1. no volver a leer lectores y convocatorias cada semana de los equipos lejanos: guardar por equipo su **resumen de fuerza** (los valores que hoy se calculan en `prepararJugador`) y actualizarlo cuando cambia (calcular por semanas no es recortar);
2. no actualizar jugador a jugador en el mundo lejano lo que no se va a ver: guardar las estadísticas del partido por jugador de forma compacta y aplicar el efecto a la persona (moral, experiencia, forma) en bloques, como ya se hace con los niños no activos (bloques de 8 semanas, `futbol-mas-barato.md`);
3. los partidos de la jornada son **independientes** entre sí dado lo que se sabía el lunes: se pueden repartir entre hilos de trabajo (el motor es una función pura). No se ha medido el reparto; es la vía natural para «miles».

### 2.6 Cuadro comparativo

| | Hoy | A (más tramos) | B (posesiones y xG) | C (zonas) | D (espacial) |
|---|---|---|---|---|---|
| Realismo estadístico | bajo-medio | bajo-medio | **medio-alto** | alto | alto (sin calibrar) |
| Qué ve cada jugador | 6 stats | igual | tiros, xG, faltas, tarjetas, paradas… | + pases, regates, entradas, pases clave | + distancia, sprints, mapa de calor |
| Crónica | goles y ocasiones | igual | + faltas, tarjetas, córners, minutos | jugadas con nombre | igual que C con posiciones |
| Táctica | no | no | parámetros simples | formación, roles, consignas | espacios y líneas |
| Visualizador | no | no | no | pizarra esquemática | sí, completo |
| F7 (decisiones en el partido) | por tramos de 15' | por tramos finos | cada 5–15' | en cualquier acción | en cualquier momento |
| ms por partido (con preparar) | 0,75 | 0,8 | **0,9** | **2,8** | **18–33** |
| 5.000 partidos por semana | 3,8 s | 3,9–4,1 s | **4,5 s** | 14 s | 90–165 s |
| ¿Para todo el mundo? | sí | sí | **sí** | no | no |
| Tamaño del registro (JSON) | 3 KB | 3 KB | 5 KB | 34 KB | 43–50 KB |

## 3. Dos niveles del mismo motor

**¿Es aceptable?** Sí, **si se cumplen cuatro condiciones**. La visión dice «las mismas reglas» y «calcular de otra forma solo si un test demuestra que da lo mismo en distribución»; y `medir-rendimiento-2.md` rechazó una fórmula sencilla para los lejanos justamente porque no había tal test. Aquí sí se puede hacer el test, y el prototipo lo hace.

### 3.1 Qué se propone: tres niveles

| Nivel | Para qué partidos | Cómo se calcula | Coste por partido |
|---|---|---|---|
| **1. Detallado** | el del personaje, el que está viendo como espectador y (a decidir) los de su equipo y sus rivales directos | C (o D para el del personaje cuando haya visualizador) | 2,8 ms (C), 18–33 ms (D) |
| **2. Medio** | todos los de la zona del personaje (las ~75 por jornada de hoy) | B: posesiones y xG, todas las estadísticas por jugador | 0,9 ms |
| **3. Grueso** | las ligas lejanas (miles por semana) | goles esperados de cada equipo a partir de sus fuerzas, Poisson, y reparto de goles, tiros y tarjetas entre los jugadores por pesos de xG y por puesto | ~0,5 µs el marcador (medido); el reparto entre jugadores no está medido (estimo decenas de µs) |

Los tres leen los **mismos datos reales de los jugadores** (los 24 valores en el partido) y devuelven lo mismo: marcador, estadísticas por jugador, minutos y tarjetas. Lo que cambia es el detalle del registro de sucesos, no las reglas.

### 3.2 El test: lo que se midió

El prototipo ajusta un modelo de Poisson por equipo a lo que da B y lo compara con **otra tanda** de 1.500 partidos por casilla, con una prueba chi² de los goles totales (cubos 0 a 7+) y de la diferencia de goles (−4 a +4). Equipos sintéticos de infantil con el de casa valiendo ×r.

**Versión 1 — fórmula de tres parámetros** (`λ_a = 1,36·r^3,04`, `λ_b = 1,36·r^−7,9`, la mejor de 6.000 pruebas aleatorias). Valor crítico al 95 %: ≈ 14,1 con 7 gl, 15,5 con 8 gl.

| r | Goles totales: detallado / grueso | χ² goles totales | χ² diferencia | Gana el mejor: detallado / grueso | Empate |
|---|---|---|---|---|---|
| 1 | 2,10 / 2,65 | **108,6** | **45,1** | 41 % / 37 % | 30 % / 25 % |
| 1,1 | 2,48 / 2,47 | 11,0 | **31,6** | 71 % / 66 % | 20 % / 21 % |
| 1,25 | 3,44 / 2,90 | **73,0** | **49,7** | 92 % / 89 % | 7 % / 9 % |
| 1,5 | 4,58 / 4,79 | 7,6 | 13,1 | 98 % / 98 % | 1 % / 1 % |

**No pasa** en tres de las cuatro casillas: la forma de la curva de goles frente a la diferencia de nivel no es una potencia simple.

**Versión 2 — Poisson con los goles esperados exactos de cada casilla** (el mejor caso posible para un Poisson):

| r | Goles totales: detallado / grueso | χ² goles totales | χ² diferencia | Gana el mejor | Empate |
|---|---|---|---|---|---|
| 1 | 2,10 / 2,18 | 3,7 | 4,1 | 41 % / 40 % | 30 % / 30 % |
| 1,1 | 2,48 / 2,47 | 8,0 | 6,2 | 71 % / 70 % | 20 % / 20 % |
| 1,25 | 3,44 / 3,37 | 5,2 | 3,5 | 92 % / 91 % | 7 % / 7 % |
| 1,5 | 4,58 / 4,63 | 9,6 | 10,4 | 98 % / 98 % | 1 % / 2 % |

**Pasa en todas.** Lo que falla en la versión 1 es la **media**, no la forma de la distribución: con las medias bien puestas, el Poisson por equipo reproduce el reparto de goles, la diferencia y las victorias y empates del modelo detallado.

**Lo que esto prueba y lo que no:**
- Prueba que **un grueso es posible** y que el test es barato (unos 12.000 partidos de B, unos segundos).
- **No prueba** que valga con equipos reales: aquí la fuerza es un solo número. Con equipos reales los goles esperados dependen de cuatro valores por equipo (portería, defensa, creación, ataque) y habría que ajustar `λ(fuerzas)` con una malla de muchas combinaciones (por ejemplo, regresión sobre decenas de miles de partidos del nivel medio), y comprobar con otra tanda de equipos reales.
- No comprueba todavía las estadísticas por jugador (reparto de goles, tiros y tarjetas): habría que añadirlas a la misma prueba (proporción de goles por línea, tarjetas por partido, nota media por puesto).
- Compara con B, que es un prototipo. El test real debe hacerse con el motor del juego.

### 3.3 Las cuatro condiciones

1. **El test está en `npm test`** y falla si el grueso se separa del medio en goles totales, diferencia, victorias/empates, tiros y tarjetas (con tolerancias fijadas por el banco, §5) y en el reparto por jugador (goles por línea, nota media por puesto). Cada vez que se toque B, se reajusta `λ` y se vuelve a pasar.
2. **Las entradas son las mismas**: los valores reales de los jugadores y su estado. El grueso nunca inventa jugadores ni usa «nivel de liga» en lugar de ellos.
3. **El nivel se fija antes del partido y no se recalcula**: se decide al publicarse el calendario (el lunes) o, para los espectadores, cuando empieza el partido. Un partido jugado de una manera no se vuelve a jugar de otra al acercarse el personaje (los resultados guardados son datos). Un partido que el personaje ve sube a nivel 1 desde el pitido inicial.
4. **Los lejanos siguen siendo personas**: los goles, tiros y tarjetas se reparten entre jugadores concretos, que acumulan sus estadísticas y su historial (principio 4 de la visión: datos de verdad). Lo que desaparece es solo el registro de jugadas, no el dato.

## 4. Enganche con las lesiones

La sesión `claude/salud-lesiones` define el servicio y el evento; aquí se define **dónde pregunta el motor y qué entrega**. Hoy no existe nada en `packages/contracts/src/services.ts` y `MOTOR_PARTIDOS.md` §0.7 y §9 dejaron dicho: durante el partido, en cualquier tramo y en cualquier acción; el servicio solo lee y devuelve la probabilidad, **el fútbol tira el dado con su propio azar**, y si hay lesión el fútbol emite `salud.lesion`.

### 4.1 Cuándo pregunta

| Momento | Motor B / C | Qué pasa al motor |
|---|---|---|
| **Contacto** (falta recibida, entrada o duelo, choque aéreo, caída tras un regate) | en cada suceso de ese tipo, para la **víctima y, con otra probabilidad, el infractor**; con la intensidad del contacto (falta = 1, duelo = 0,5, aéreo = 0,6) | es el momento natural y el que más se parece a la vida real |
| **Carga sin contacto** (carrera, sprint, remate, cambio de ritmo) | cada minuto, para cada jugador en el campo, con su cansancio, intensidad y energía inicial | las lesiones musculares aparecen con cansancio y sobrecarga |
| **Tramo** (hoy) | una pregunta por jugador y tramo (6 por partido) | solo en el motor actual y en el nivel grueso |
| **Nivel grueso (3)** | una sola vez por partido y jugador, con la suma de los riesgos por minuto | la probabilidad total es la integral de lo anterior |

### 4.2 Qué entrega el motor al servicio

```
riesgoDeLesion({ persona, minuto, accion: 'falta_recibida' | 'duelo' | 'choque_aereo' | 'carrera' | 'sprint' | 'remate' | 'entrada' | 'caida',
                 contacto: 0..1, intensidad, cansancio, energiaInicial, sobrecarga, edad, categoria, superficie? }) → { p }
```

El motor pasa `accion` y el servicio decide la **zona del cuerpo y el tipo** (un sprint, isquiotibial; una entrada, tobillo o rodilla; un choque aéreo, cabeza), no el fútbol.

### 4.3 Para que no cueste una locura

Con la pregunta por minuto y jugador son **1.800 llamadas por partido** (D) o 24–47 (B/C, solo contactos). Para miles de partidos, **el servicio devuelve una sola vez por jugador y partido un perfil de riesgo** (la tasa base por minuto de cada tipo de acción, con constitución, perks, salud y edad ya aplicados) y el motor lo multiplica por el cansancio y el contacto del momento: una llamada por jugador y partido (32), no 1.800. En el nivel grueso el motor sortea cuántas lesiones habrá (Poisson con la suma de los riesgos) y a quién, con los mismos pesos.

### 4.4 Lo que tiene que hacer el motor cuando hay lesión

1. el jugador sale: lo cambia un suplente de su grupo (si quedan cambios) o el equipo juega con diez; el cambio forzado cuenta en el máximo;
2. se emite el evento compartido `salud.lesion` con persona, deporte, minuto, acción, contacto, infractor (si hubo falta) y contexto (cansancio, intensidad, marcador);
3. el sistema de salud decide tipo, gravedad y baja; el fútbol no sabe nada más;
4. con la tarjeta: una falta que lesiona a otro puede subir la probabilidad de amarilla o roja (regla del fútbol).

### 4.5 Un requisito que importa para el juego actual

**Cada subsistema necesita su propio flujo de azar** (`rngEstable('partido-lesiones', semilla, id)`, `…-tarjetas`, `…-jugadas`): con un único flujo, **añadir una pregunta de lesión que devuelve 0 cambiaría todos los marcadores siguientes**. Con flujos separados, activar el servicio no cambia los resultados de un partido en el que nadie se lesiona, y se puede comprobar con la huella.

## 5. Calibración con la realidad

### 5.1 Qué se ha podido leer, y qué no

**Aviso:** la red de este entorno solo deja un buscador, no leer las páginas originales (`theanalyst.com`, `fbref.com`, `uefa.com` no se pudieron abrir; la lectura falló con error de resolución DNS). **Las cifras de abajo salen de los resúmenes de la búsqueda o de memoria, y hay que contrastarlas con la fuente original antes de usarlas como objetivo.** Las marcadas «memoria» son órdenes de magnitud muy conocidos del fútbol profesional, pero no las he podido citar con enlace.

**Leídas en resultados de búsqueda:**

| Dato | Cifra | Fuente |
|---|---|---|
| Goles por partido, canteras del FC Barcelona (fútbol 11, equipo dominante) | 4,7 en todo el formativo amateur (2014/15); 3,8 y después 4,0 en cadetes e infantiles (dos temporadas seguidas, según el resumen); fútbol 7: 6,2 (2015/16) | [fcbarcelona.es](https://www.fcbarcelona.es/es/noticias/1067528/mas-goles-marcados-que-la-temporada-pasada) |
| Tiros por partido, La Liga 2024-25 | ≈ 24 (los dos equipos) | resumen de [The Analyst](https://theanalyst.com/articles/top-five-league-stats-goals-cards-time-wasting) en la búsqueda; no abierto |
| Amarillas por partido | 4,78 en La Liga en una temporada antigua; 3,42 en la Premier 2022-23 | mismo resumen; temporadas y fuente a confirmar |
| Faltas por partido de un equipo | 17,3 el equipo con más de La Liga en una temporada reciente (un equipo, no el total del partido) | resumen de búsqueda, sin enlace propio |
| Goles a lo largo del partido en juveniles | los sub-17 y sub-19 marcan más al final de los partidos si el nivel de los equipos es igual | estudio portugués de 2.591 goles de la 2019/2020 (resumen de búsqueda; sin abrir) |
| Comparación Youth League frente a Champions | existe un análisis de goles | [uefa.com](https://www.uefa.com/uefayouthleague/news/028c-1ab12b4c8df2-0e5d4d0d3ca5-1000--goals-analysis-youth-league-vs-champions-league/) (no abierto) |

**De memoria (fútbol profesional adulto; contrastar con FBref/Opta antes de usar):** goles por partido ≈ 2,6–2,8 en las cinco grandes ligas; tiros ≈ 24–26 los dos equipos, a puerta ≈ 8–9; xG por tiro ≈ 0,10–0,11; conversión de tiros ≈ 10–11 %; córners ≈ 10; faltas ≈ 22–26; amarillas ≈ 3,5–4,5; rojas ≈ 0,1; penaltis ≈ 0,3 por partido; precisión de pase ≈ 80–85 % con ~800–900 pases entre los dos; victorias locales ≈ 45 %, empates ≈ 25 %, visitantes ≈ 30 %; el delantero marca la mitad de los goles y los defensas ~10 %.

**Lo que no he encontrado:** estadísticas publicadas **por categoría de fútbol base español** (goles, tiros, tarjetas). Las federaciones (FFCV, la regional de cada ciudad) publican resultados y actas por competición, pero no las he podido leer. Los datos de actas (resultado, amonestados y expulsados por partido) sí existen en las páginas públicas y se podrían muestrear a mano.

### 5.2 Cómo se compara con lo que hay

Con la decisión 1 del diseño («los goles salen de la simulación, sin objetivo previo»), el banco **no debe forzar goles por categoría**. Propongo dos anclas:

1. **El motor se calibra una sola vez, en escala de adulto** (como dice el diseño, §2 punto 3): con jugadores del nivel típico de adulto y sin potenciador, B debe parecerse a un partido de las cinco grandes ligas (goles, tiros, tarjetas, faltas, córners, posesión, precisión de pase). Los prototipos de este informe están ajustados a ojo a ese rango (B y C dan 2,8–3,3 goles, 32–34 tiros, 24–27 faltas, 4–4,5 amarillas, 8 córners en B).
2. **Fútbol base: solo rangos amplios de cordura**, dejando que las diferencias de nivel entre equipos den más goles donde las haya (ver el dato de la cantera del Barça: un equipo dominante en fútbol 11 de 12 a 15 años marca 3,8–4 goles; no es un promedio de liga). Rango sugerido en cada categoría: entre 2 y 5 goles por partido entre equipos parecidos, 0-0 por debajo del 10 % (ya en `MOTOR_PARTIDOS.md` §11), amarillas entre 1 y 5.

### 5.3 El banco de partidos que lo vigila

Ampliación de `npm run sim:partidos` (`tools/partidos.ts`) con un bloque de **realismo** por categoría, que compara con los rangos de arriba y se imprime con `⚠️`/`❌` como las otras tablas:

- partido: goles, tiros, a puerta, **xG por tiro**, conversión, córners, faltas, amarillas, rojas, penaltis, posesión (media y σ), pases y precisión de pase, 0-0, goleadas (≥ 6), **empates**, victorias locales;
- jugador: reparto de goles por línea (delanteros ≈ la mitad, defensas ≈ 10 %), notas por puesto (6 de media), minutos de suplentes, tarjetas por jugador y temporada, **minuto de los goles** (más al final), efecto de una expulsión (el equipo con diez marca menos);
- liga: el mejor gana (40–75 %) como hoy, y **ventaja de casa** (≈ 45 % de victorias locales);
- **nivel grueso frente a medio**: la tabla del §3.2 con equipos reales y el reparto por jugador, con los χ² y su valor crítico;
- y la fotografía de **coste** (ms por partido, KB del registro) para que un cambio que lo triplique salte.

## 6. Fases, recomendación y dudas

### 6.1 Fases propuestas

| Fase | Qué | Cambia el juego | Notas |
|---|---|---|---|
| **P0** | Preparar el terreno sin cambiar resultados: (a) el **banco de realismo** de §5.3 con el motor de hoy (da el punto de partida); (b) **flujos de azar separados por subsistema**; (c) guardar por equipo el **resumen de fuerza** y no recalcularlo cada semana (§2.5); (d) un **formato de registro de sucesos común** (tipo, minuto, equipo, jugadores, xG, zona opcional) y la `salud` como gancho de no hacer nada | no (huella idéntica) | quita lo que hoy domina el coste y deja los enchufes |
| **P1** | **Motor B** para todos: posesiones y xG, faltas, tarjetas con sanciones, córners, penaltis, minutos exactos, efecto del marcador, cambios por minutos, estadísticas por jugador y nota por contribución; la crónica deriva de su registro; el servicio de lesiones se enchufa | sí (cambian resultados; las partidas guardadas conservan los que ya jugaron) | coste igual o menor que hoy |
| **P2** | **Nivel grueso** (Poisson calibrado con B y test de distribución en `npm test`) y **reparto del trabajo de la jornada** entre hilos | no para la zona; sí para las ligas nuevas | solo cuando existan las ligas del mundo |
| **P3** | **Motor C** para el personaje, el espectador y los cercanos: jugadas por zonas, estadísticas completas, táctica y roles (F3), crónica rica, experiencia en el puesto aplicada; decisiones durante el partido (F7) | sí, solo en el nivel 1 | requiere que el motor sea una **máquina de estados reanudable** |
| **P4** | **Visualizador**, primero esquemático sobre los sucesos de C (pizarra y mapa de calor); luego, si el usuario lo quiere, **D** para el partido del personaje | no afecta al mundo | D cabe solo para un partido a la vez |
| **P5** | **Fase de mánager** sobre C: formaciones y consignas que se ven en las jugadas | — | |

La **opción A no es una fase**: sus ventajas se obtienen dentro de B.

### 6.2 Una restricción de diseño que hay que fijar desde P1

El motor tiene que ser una **máquina de estados con el estado en JSON** (regla 5: el estado de un módulo es JSON serializable): `estado = avanzar(estado, decisiones, minutos)`. Así se puede parar cada N minutos para preguntar al personaje (F7), guardar la partida a mitad de un partido, ver un partido «en directo» minuto a minuto, o reanudar tras un error. Los prototipos B, C y D son un bucle con variables locales, no un estado serializable: convertirlos a estado explícito es sencillo pero no está hecho ni medido.

### 6.3 Recomendación

**Hacer P0 y P1 antes de nada.** B es el único camino que baja el coste y sube muchísimo la información, y todo lo que el usuario quiere después (jugadas, visualizador, F7, mánager) se apoya en lo mismo: registro común, máquina de estados, un azar por subsistema, estadística de verdad por jugador. Dejar C y D como el «nivel 1» que se enchufa más tarde sin tocar el resto. **Para los miles de partidos, empezar por la mitad del trabajo que no es el motor** (P0.c y el reparto en hilos) y dejar el nivel grueso para cuando haya ligas que lo necesiten, con el test dentro de `npm test`.

### 6.4 Dudas para el usuario (cada una con mi recomendación)

1. **¿Qué buscas primero: estadísticas más reales (B) o ver los partidos jugar (C, D, visualizador)?** *Recomiendo B primero*: es más barato, no se pierde nada y C/D se apoyan en él.
2. **¿Aceptas tres niveles (detallado, medio, grueso) con la condición de que un test de distribución en `npm test` los mantenga iguales?** *Recomiendo que sí*, con el test obligatorio y las cuatro condiciones de §3.3 (nivel fijado antes del partido, mismos datos de entrada, siempre jugadores reales con sus estadísticas).
3. **¿Qué es «cercano» para el nivel detallado?** *Recomiendo:* el partido del personaje y los que ve como espectador (nivel 1); todos los de su zona en nivel 2; y, a partir de ligas del mundo, el resto en nivel 3. Los partidos de «rivales próximos» o «de su grupo» quedan en nivel 2 salvo que el usuario quiera verlos con jugadas.
4. **¿Pregunta de lesiones por contacto y por minuto, o más barata?** *Recomiendo* contactos y carga por minuto en los niveles 1 y 2, con un **perfil de riesgo por jugador y partido** que devuelve el servicio de salud una sola vez (§4.3), y la suma en el nivel 3.
5. **¿Con qué realismo se calibra el fútbol base?** *Recomiendo anclar el motor al fútbol de adultos (con datos que se contrasten con FBref/Opta) y dejar solo rangos amplios en benjamín a juvenil* (decisión 1: sin objetivo de goles por categoría). Si prefieres un objetivo por categoría, hay que **tener datos de actas del fútbol base**: ¿puedes dar acceso a las de tu federación o permitir en la red de las sesiones los dominios de estadísticas (`theanalyst.com`, `fbref.com`)? Yo no he ampliado permisos.
6. **¿El motor nuevo puede cambiar los resultados futuros de la liga?** *Recomiendo que sí*, conservando los partidos ya jugados y las crónicas guardadas (el formato de `MomentoDeCronica` se mantiene como vista derivada del registro nuevo).
7. **¿Quieres ver el partido «en directo» (minuto a minuto, con la opción de cambiar cosas), o solo el resultado y la crónica al acabar?** *Recomiendo diseñar para lo primero* (máquina de estados) y empezar por lo segundo. Decide cuándo hace falta el visualizador.
8. **¿Qué se guarda de cada partido?** *Recomiendo* el registro entero solo para los partidos del personaje (compacto: estimo ~8–10 KB con C), y para todos los demás, el resultado y las estadísticas por jugador (el diseño actual); el resto se puede volver a calcular con la misma semilla y los mismos datos de entrada.

## 7. Comprobaciones

- No se ha tocado ningún archivo del juego (`modules/`, `packages/`, `apps/`): los cambios son este informe, `tools/partidos-reales-prototipo.ts` y una línea de `package.json` (`partidos:prototipo`).
- Reproducir: `npm run partidos:prototipo -- 200` (~2–3 min); con `grande` como segundo argumento, ciudad grande (más lento al crear la partida).

## 8. Resultado de las comprobaciones finales

- `npm run typecheck`: sin errores (código de salida 0).
- `npm run huella -- 60`: las 22 líneas (16 de bots y 2×2 de la ciudad de prueba con fútbol) **idénticas** antes y después (`diff` vacío).
