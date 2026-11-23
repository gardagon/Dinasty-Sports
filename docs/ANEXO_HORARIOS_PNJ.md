# Anexo: horarios de las personas y población de PNJs

Es la referencia de **dónde está cada persona a cada hora** y de **cuántas personas habrá**. Los horarios son dato (`packages/contracts/src/agendas.ts`, función `tramosDe`) y esta tabla es la fuente: si cambias uno, cambia los dos y el test de `agendas.test.ts`.

Estado: **horarios cerrados y población aprobada** (27/10/2026). La población de la sección 4 está generada (391 personas del colegio y del barrio, y al final se añaden 2 bibliotecarios, 5 entrenadores de clubes, los padres y los hermanos). Actualizado el 28/10/2026 (biblioteca y horarios de los lugares).

**Lo que pone el deporte (fase 3 del plan de deportes, 30/10/2026):** las sesiones y las sedes de los clubes y la jornada de competición (los sábados de 9 a 13 en el estadio, en el atletismo) ya no están escritas en `agendas.ts`: salen de los datos del deporte para el país de la partida (`DatosDeDeportePais.clubes` y `competiciones.jornada`, ver `modules/atletismo/src/datos.ts`) y las agendas las reciben en `DatosDeAgenda`. Las tablas de abajo describen los datos de España del atletismo.

**23/11/2026 (sesión `gente-por-la-calle`, F1 y F2):** las calles tienen gente (de 6:30 a 23:59): los vecinos adultos viven en una calle, pasean al perro, los jubilados se sientan en un banco, quien tiene un oficio en un lugar está allí en su horario, los menores de 12 años no van solos al supermercado ni al restaurante y hay un portero, un conserje y tres repartidores. Ver «Gente por la calle» en el vecino y `docs/relevo/gente-por-la-calle.md`.

**17/11/2026 (sesión `pnj-2`):** los niños de otros colegios y del barrio tienen horario escolar propio (fuera del mapa), quien tiene una actividad poco después de las clases no desaparece entre una cosa y otra y una parte de los vecinos adultos recoge a un hijo a la salida. Ver la tabla del alumno, la del vecino y las secciones «Niño de otro colegio», «Entre las clases y la actividad» y «Padres que recogen».

**Habilidades reales de los que juegan (P2a-1, 02/11/2026):** los niños que juegan a un deporte con rutina (hoy atletismo y fútbol) llevan las mismas habilidades y conocimiento que el personaje y cada semana entrenan con la rutina de su club (sesiones por semana de cada club en `DatosDeDeporte`, `poblacion.rutina`), según su constancia; su nivel (`levels`) es el rendimiento calculado con ellas. Ver `DECISIONES.md`.

**Colegio de 50 por curso y equipos por categoría (fútbol, 1/11/2026):** todos los cursos del colegio tienen dos clases de 25 (50 alumnos por edad de 9 a 17: 450 en otros cursos, antes 153), unas 300 personas más (≈ 1.420 en total; estado 1.895 → 2.406 KB). Los deportes de equipo reclutan **un equipo por club y categoría** con un mínimo y un máximo (fútbol 11: 14 a 18): primero los interesados hasta el máximo y, si no llegan al mínimo, niños sin interés hasta el mínimo. El equipo del colegio de fútbol es de benjamín a juvenil (~90 jugadores). Las cifras de «Otros cursos» de la tabla de la sección 4 son las de antes (17 por edad).

**La gente de cada deporte (fase 4, 30/10/2026):** los rivales, los entrenadores y el equipo del colegio los pide cada deporte como dato (`DatosDeDeportePais.poblacion`). Los deportistas ya no son un número fijo: los niños (los del colegio, los de los cuatro colegios de fuera —17 por curso y colegio de 8 a 17 años y los jóvenes de 18 y 19— y los del barrio, todos creados con herencia y sin deporte, ≈ 1.100 personas) los recluta cada deporte por gustos y aptitud en equipos con plantilla definida (`modules/atletismo/src/datos.ts`, ~115 en el atletismo de España, 5-13 por edad). Las cifras de rivales y equipo de las tablas de abajo son orientativas de la versión anterior; los entrenadores de clubes (5) siguen igual.

**Población prevista con la ciudad grande (02/11, `CIUDAD_Y_LIGAS.md` §2):** el colegio del personaje igual (2 clases de 25 por curso) y 9 colegios más de 2 clases de 25: ~500 niños por año de nacimiento, ~6.000 personas, con unos 15–20 clubes de fútbol y sus entrenadores. Llega en su propia fase, después del guardado por partes; hasta entonces, la de arriba.

## 1. Cómo funciona

- Cada persona guarda una lista de **tipos** (`alumno`, `profesor`, `entrenador`, `club`, `rival`, `amigo`, `vecino`, `bibliotecario`, `portero`, `conserje`, `repartidor`). Un tipo aporta **tramos** de la semana: de tal hora a tal hora, en tal lugar.
- Dos tramos pueden coincidir. **Manda el de mayor nivel** (el tipo dominante):

| Nivel | Qué es | Ejemplos |
|---|---|---|
| 1 base | estar fuera del mapa | casa propia, trabajo, otro colegio |
| 2 rol | lo que se es | alumno, profesor, vecino |
| 3 pertenencia | a lo que se pertenece | un club, un grupo de amigos, las carreras |
| 4 evento | un acontecimiento temporal | se apunta a tu club, un cumpleaños (con `hasta`: día en que deja de valer) |

- Ejemplo: un compañero de clase (nivel 2) se apunta a tu club (nivel 3). Sigue yendo a clase, pero en la tarde de entrenamiento está donde entrena el club. Si el club se acaba, se le quita el tipo y vuelve su rutina.
- **Ocupado = fuera:** en clase, en una carrera o en una sesión del club una persona **no se puede hablar contigo**: sigue en su agenda, pero cuenta como fuera del mapa (`TramoDeAgenda.ocupado`: intervalos del tramo en que está ocupada). Antes y después (llegar, el recreo, quedarse un rato al acabar) sí está en el sitio. No puede estar compitiendo y hablando contigo a la vez; lo mismo vale para cualquier acontecimiento parecido que se añada.
- **La jornada:** 4 clases que empiezan a las 8:00, 9:20, 11:20 y 12:40 y duran 75 minutos (acaban a las 9:15, 10:35, 12:35 y 13:55), con un recreo de 10:40 a 11:20. **El aula (zona `aula`, dentro del colegio) se abre 10 minutos antes de cada clase** (7:50 y 11:10): a esa hora la entrada del colegio se vacía y cada alumno se va a su aula. **El recreo (10:40–11:10) es en el patio** (zona `patio`, dentro del colegio): los alumnos están allí y a las 11:10 vuelven a sus aulas. Los 5 minutos al acabar cada clase se pasan en el aula, solo con los compañeros de tu clase. Ver `JORNADA_ESCOLAR` y `HUECO_ENTRE_CLASES` (`contracts/time.ts`).
- **«Fuera»** (`null`) es cualquier sitio que no está en el mapa. Por eso solo los de la familia están en `casa`: los demás tienen su casa fuera del mapa.
- **Azar estable:** a qué sitio va de varios posibles, o si falta ese día, sale de un hash de (persona, día, tramo). No se guarda y no cambia mientras dure el tramo. Es el «azar al llegar a un lugar».
- **Presencia:** el servicio `presencia` (`en(lugar, max)`, `donde(persona)`, `agenda(persona)`) dice quién hay en un lugar ahora. Los de mayor nivel salen primero y el resto en un orden estable; con `max` se limita (la pantalla enseña **entre 34 y 46**: ver «Gente cerca» abajo).
- **Gente cerca (aforo variable):** en un lugar nunca hay siempre 40 personas. `aforoCercano(lugar, clave)` (`contracts/agendas.ts`) da `40 ± 15 %` (de 34 a 46, `GENTE_CERCANA` y `VARIACION_DE_GENTE_CERCANA`) a partir de un hash del lugar y de la clave (el tramo de presencia), así que cambia entre el recreo, la llegada al colegio, etc., pero no al refrescar la pantalla.
- **Letra de clase:** una clase es curso + letra (`3.ºA`, `3.ºB`; `nombreDeClase`, `contracts/personas.ts`). La del jugador es siempre la **A** (`tuClase`); los alumnos de los `curso_*` son de la **B** y el resto reparte A/B por hash, para separar a los niños en clases distintas.
- Se guarda por persona **solo la lista de tipos**. La agenda se calcula y se recuerda en memoria.
- Los desconocidos se ven por su **descripción física** («Una chica de pelo negro liso, ojos marrones oscuros y piel clara») hasta que se habla con ellos.

### Moverse con el grupo (21/11/2026, cifras provisionales)

Las agendas no se enteran de que el personaje está ahí: si estás hablando con los de tu clase y a las 10:40 todos se van al patio, ya no están. Para que no desaparezcan sin más, al **acabar una acción** `npcs` mira la presencia al empezarla y al acabarla (`modules/npcs/src/grupo.ts`; solo si ha cambiado el intervalo entre dos cambios de tramo, así que casi siempre no cuesta nada) y avisa (`presencia.grupo_se_va`, que recoge el suceso `eventos.grupo.se_van`) si:

- el personaje **sigue donde estaba** (las acciones de ir a otro sitio y las decisiones de un suceso no se miran);
- de la gente que tenía **cerca** (los 34–46 que se ven, `aforoCercano`: primero los que conoces) **se ha ido al menos la mitad** (`MOVERSE_CON_EL_GRUPO.proporcion`, 0,5);
- los que se pueden seguir (los que siguen aquí y los que van a un sitio del mapa) se reparten así: **un mismo sitio recibe al menos 3 personas** (`minimo`) **y la mitad o más de ellos**. Quien está ocupado pero a la vista en otro sitio (el equipo en su pista) cuenta como que va allí; quien sigue contigo aunque ahora esté ocupado (los de tu clase al empezar la clase) no se ha ido. Solo se sigue **dentro del mismo lugar** (el colegio y sus zonas, el estadio o el complejo, el club): quien se va a otro lugar cuenta como quien **sale del mapa** (casa, su aula de otro curso): cuenta como que se ha ido, pero no es un destino: no se sabe a dónde va ni se le puede seguir. Por eso, de desconocidos que vuelven a sus aulas de fuera no hay grupo: el aviso sale cuando hay conocidos (o de tu clase) que van a un sitio del mapa.

Lo que se ve en un día de clase si te quedas hablando con los de tu clase: **10:40** del aula al patio, **11:10** del patio al aula (si conoces a compañeros), **14:00** del aula a la entrada del colegio (o al patio: sale el sitio con más gente), y **14:50** de la entrada a la pista (el entrenamiento). Aparte del grupo, **«Me voy»**: si quien conoces y tienes al lado se va solo, dice una línea corta (a dónde, si es un sitio del mapa). La salida de 14:00 a 14:30 que se reparte de cinco en cinco minutos se pregunta una vez, cuando el aula se vacía.

## 2. Horarios por tipo

Minutos y días como en el calendario escolar: **lectivo** = día de clase (no fin de semana ni vacaciones), **libre** = el resto. «Fuera» = fuera del mapa. Los porcentajes son el peso de cada destino (se elige uno por persona y día).

### Alumno (compañero de clase), nivel 2

| Días | Horas | Dónde |
|---|---|---|
| lectivo | 7:30–7:50 | colegio (la entrada, fuera de las aulas), llegando (se les puede hablar) |
| lectivo | 7:50–10:40 y 11:10–14:00 | **en su aula**: los demás alumnos están en sus aulas (fuera del mapa: **ocupados**). **Tus compañeros de clase** (`tuClase`: los 24 de tu clase y los del reparto inicial) están en **tu aula** (`aula`): libres de 7:50 a 8:00 (el aula ya está abierta) y los 5 minutos al acabar cada clase (9:15–9:20, 10:35–10:40, 12:35–12:40, 13:55–14:00); en clase siguen en el aula, a la vista, con el estado **«atendiendo en clase»** (ocupados, sin poder hablarles) |
| lectivo | 10:40–11:10 | **patio** (zona del colegio): el recreo (se les puede hablar) |
| lectivo | 14:00–14:30 | **la salida** (17/11, cifras provisionales: `SALIDA_DEL_COLEGIO`, `agendas.ts`): al acabar las clases salen a la entrada (`colegio`, 70 %) o al patio (30 %), donde se les puede hablar, y **se van repartidos en 30 minutos** (pasos de 5: el 86 % sigue a las 14:00–14:05, el 71 % a las 14:05–14:10… el 14 % a las 14:25–14:30; a las 14:30 no queda nadie). Cada uno tiene su hora de salida fija ese día (el mismo azar en todos los pasos: quien se va no vuelve, y quien se queda se queda donde estaba). Vale también para los hermanos en edad escolar. **Quien tiene una actividad que empieza poco después (el fútbol de las 15:00) no se va: ver «Entre las clases y la actividad»** |
| lectivo | 15:00–19:00 | fuera 55 %, parque 22 %, supermercado 8 %, gimnasio 5 %, **biblioteca 10 %** |
| libre | 10:00–14:00 | fuera 45 %, parque 37 %, supermercado 10 %, **biblioteca 8 %** |
| domingo | 10:00–14:00 | fuera 50 %, parque 40 %, supermercado 10 % (la biblioteca cierra los domingos: este tramo manda sobre el anterior porque, a igualdad de nivel, gana el último) |
| libre | 15:00–20:00 | fuera 55 %, parque 40 %, gimnasio 5 % (sin supermercado: el domingo cierra a las 15:00) |
| sábado | 20:00–22:30 | fuera 80 %, restaurante 20 % |
| resto | | fuera (casa, comer, dormir) |

### Profesor / tutor, nivel 2

| Días | Horas | Dónde |
|---|---|---|
| lectivo | 7:30–7:50 | llegando |
| lectivo | 7:50–10:40 y 11:10–14:00 | dando clase: ocupado |
| lectivo | 10:40–11:20 y 14:00–17:00 | el recreo y las tutorías |

| resto | | fuera |

Cuando no dan clase, el profesorado está en la **sala de profesores** (zona dentro del colegio): el 85 % cada día; el 15 % (un par de ellos, al azar) está fuera: en la entrada (`colegio`) o, en el recreo, en el patio (`patio`). Para hablar con ellos hay que ir a la sala (2 minutos desde el colegio).

### Entrenador, nivel 3

| Días | Horas | Dónde |
|---|---|---|
| las de las sesiones de su club | club del colegio: lunes y miércoles, 14:50–17:15 | pista del colegio; **ocupado de 15:00 a 17:00**, se le habla al llegar y al acabar |
| sábado | 8:45–13:15 | estadio (carreras); **ocupado de 9:00 a 13:00** |
| resto | | fuera |

### Miembro de un club, nivel 3

Las sesiones del club (catálogo de `modules/clubes`). Los miembros están en su pista **10 minutos antes** de empezar (`MARGEN_ANTES_DE_SESION`; desde entonces se puede entrar a entrenar), se quedan **15 minutos después** (`MARGEN_DE_SESION`) y están ocupados durante la sesión:

| Club | Días | Horas | Dónde |
|---|---|---|---|
| Club del colegio | lunes y miércoles | 15:00–17:00 | pista de atletismo del colegio (zona `pista_colegio`, dentro del colegio) |
| Club Atletismo Ciudad | martes y jueves | 18:00–20:00 | estadio |
| Club del colegio (**fútbol**, F1 del fútbol, 1/11) | martes y jueves | 15:00–17:00 | campo de fútbol del colegio (zona `campo_colegio`, dentro del colegio). Otros días que el atletismo del colegio para poder hacer los dos. Partidos de liga: sábados de 9 a 13 en el campo municipal (zona `campo_municipal`, en la avenida del Parque) |
| Club de Alto Rendimiento | lunes, martes y jueves | 17:00–20:00 | estadio |

### Rival, niveles 2 y 3

Fuera de sus sesiones, el colegio (no van al nuestro) y las carreras, algunos pasan por el parque: allí se les puede encontrar (nivel 2: cualquier tramo de nivel 3 manda sobre él).

| Días | Horas | Dónde |
|---|---|---|
| lectivo (nivel 2) | 15:00–19:00 | fuera 85 %, parque 15 % |
| libre (nivel 2) | 10:00–20:00 | fuera 75 %, parque 25 % |
| las sesiones de su club (nivel 3) | según el club (los clubes de fuera del catálogo tienen una de cuatro franjas: L y X 17–19, M y J 18–20, L M y J 17–20, X y V 17–19) | estadio; va el 85 % |
| sábado | 8:45–13:15 | estadio, solo el 40 % (los demás corren otras pruebas o en otros campeonatos); ocupados de 9:00 a 13:00 |
| resto | | fuera (vive y estudia fuera del mapa) |

Las sedes de todos los clubes de fuera son el estadio, de momento.

### Amigo, nivel 3

Se suma a las del alumno y pesa más en el parque:

| Días | Horas | Dónde |
|---|---|---|
| lectivo | 15:00–19:00 | fuera 60 %, parque 40 % |
| libre | 10:00–14:00 y 15:00–20:00 | fuera 40 %, parque 60 % |

### Vecino (genérico), nivel 2

Entre las 9:00 y las 21:00 se queda fuera (50 %) o va al parque (30 %), al supermercado (20 %), al restaurante (15 %) o a la biblioteca (8 %), **solo a los sitios abiertos**. Las visitas son estas (`VISITAS_DE_VECINOS`, `agendas.ts`) y los tramos se parten donde empieza o acaba una (la función `vecino` los calcula):

| Sitio | Días y horas de visita |
|---|---|
| Parque | todos los días 9:00–21:00 |
| Supermercado | lunes a sábado 9:00–21:00; domingo 10:00–15:00 |
| Restaurante | todos los días 13:00–15:00 (abre hasta las 16:00) y 20:00–21:00 |
| Biblioteca | lunes a viernes 9:00–20:00; sábado 10:00–14:00 |

Se evita partir en horas redondas donde no hace falta (p. ej. a las 16:00) para que la presencia no cambie sin motivo dentro de una tarde (hay un test).

#### Gente por la calle (`vecino` con `vive`, `perro`, `jubilado`, `pequeno`, `trabaja`; portero, conserje y repartidores; 23/11, cifras provisionales)

Hasta ahora nadie pisaba nunca una calle (los destinos de todos los tramos eran lugares). Ahora, **de 6:30 a 23:59** (`VENTANAS_DE_CALLE`, `agendas.ts`), las calles tienen gente. Las visitas son **pasos de 15 minutos** (todos en la cuadrícula de cuartos de hora, para que los cambios de tramo coincidan) con una probabilidad `p` por paso (azar independiente, estable por persona y día, como la salida del colegio; las `p` de las tablas son por cada 10 minutos y se escalan al paso): en promedio cada persona pasa `pasos × p` pasos por la calle, a horas distintas. Van **antes** del colegio de fuera y de la recogida (clases y esperar a un hijo mandan sobre pasear) y no cambian la presencia dentro de un tramo. Las marcas las pone `ajustarVecinos` al crear la partida y cada curso (como `recoge`; `azarDe(marca, semilla, id)`, sin gastar azar de la partida), solo a los `vecino_N` de 18 años o más, salvo `pequeno` (todos los menores de 12) y `adulto` (los que de verdad son vecinos adultos):

| Marca | A quién | Qué hace |
|---|---|---|
| `vive` | 20 % en `calle_casa`, 15 % en `calle_colegio`, 15 % en `avenida_parque`, 50 % en ninguna. De los menores de 12 años, un 0,6 % en cada una | **Residente adulto (no jubilado):** lun–vie 6:30–8:30 (`p` 0,12), 17:30–21:00 (0,06) y 21:00–23:59 (0,03); días libres 10:00–13:00 (0,07), 18:00–21:00 (0,05) y 21:00–23:59 (0,03), en su calle. **Niño pequeño:** lun–vie 16:30–19:30 y días libres 11:00–13:00 y 17:00–20:00 (0,25), en su calle o en el parque |
| `adulto` | Los `vecino_N` de 18 años o más (no los jóvenes de 18–19 años sin colegio, que no pisan la calle) | De paso (los no jubilados): lun–vie 7:10–8:10 y 14:00–15:00 en `calle_colegio` (0,04); días libres 10:00–14:00 en `avenida_parque` (0,025) |
| `perro` | 15 % de los adultos | Lun–vie 6:30–7:40 (0,25) y 19:30–23:30 (0,14); días libres 8:00–12:00 (0,12) y 19:00–23:30 (0,11), en su calle (si vive en una), `avenida_parque` o `parque`. Se espeja en la etiqueta `perro` y en la descripción («…siempre pasea a su perro»). **De momento es una marca en el dueño**: admite `perro: 'id'` (una mascota) para cuando existan con los hogares, sin cambiar el comportamiento |
| `jubilado` | `vecino_N` de `EDAD_DE_JUBILACION` (67) años o más | Un banco de `avenida_parque` o `parque`: 10:00–13:00 y 17:00–19:30 (0,3); si además vive en una calle, un paseo corto por ella 9:00–11:00 y 16:00–18:00 (0,1). No salen a trabajar. Etiqueta `jubilado` y descripción «…jubilada» |
| `pequeno` | Menores de `EDAD_PARA_IR_SOLO` (12) años, vecinos y alumnos | **No van solos al supermercado ni al restaurante** (se quitan de sus destinos; el resto del reparto no cambia) |
| `trabaja` + `turno` | Los `vecino_N` cuyo oficio es de un lugar (`oficioDeVecino`: dependiente → `supermercado`, camarero y cocinero → `restaurante`, monitor → `gimnasio`), turno de mañana o de tarde al 50 % | **Está en el lugar en su turno, a la vista y se le puede hablar**, el 85 % de los días (`DIAS_DE_TRABAJO`, `delDia`). Supermercado: lun–sáb 9:00–15:00 y 15:00–21:00, domingo 10:00–15:00 (solo el de mañana). Restaurante: comida 13:00–16:00 y cena 20:00–23:00. Gimnasio: 8:00–15:00 y 15:00–22:00. Con nivel de pertenencia (3): sale antes que los clientes en «gente cerca» |

**Caras fijas** (personas del juego, `role: vecino`, desconocidas hasta que se habla con ellas; se generan con su propio azar —`rngEstable`—, no el de la partida, para no cambiar lo que sale después). Todas con nivel 3:

| Quién | Cuántos | Dónde y cuándo |
|---|---|---|
| **Portero** (`portero_1`, etiqueta `portero`, «Portero de tu portal») | 1 | `calle_casa`: lun–sáb 7:00–14:00 y 16:00–20:00, domingo 9:00–13:00; libra el 15 % de los días |
| **Conserje** (`conserje_1`, `conserje`) | 1 | `colegio` (la entrada) mientras el colegio está abierto: días de clase 7:00–19:00 y, en vacaciones, lun–vie 10:00–13:00 y lun y miércoles 14:30–17:30. **Sigue en la puerta en clase y en el recreo** (los tests de «la entrada se vacía» lo excluyen) |
| **Repartidores** (`repartidor_1..3`, `repartidor`) | 3 | `calle_casa` o `calle_colegio`, lun–sáb 10:00–13:00 y 17:00–20:00, paradas de pasos de 15 minutos (0,12 por 10 minutos) |

En la ficha, el portero, el conserje y los repartidores tienen oficio y lugar de trabajo («Portero» en «Tu portal», «Conserje» en el colegio, «Repartidor» en «Empresa de reparto»); del portero y del conserje se sabe dónde trabajan sin preguntar. Nadie de esta lista empieza conocido: se les conoce en los sucesos de calle (`modules/eventos/src/barrio/calle.ts`: «Buenos días», «Un perro suelto» con su dueño, «Un banco al sol», «El portero», «Un reparto»). El test `tests/horarios-de-agendas.test.ts` incluye todos los tipos nuevos: nadie está en un sitio cerrado (los turnos de trabajo caben dentro del horario del lugar). **Presencia:** hay unos 20–50 cambios de tramo más al día (pasos de 15 minutos de 6:30 a 23:59); el test de presencia reutilizada admite hasta 150 cambios en dos días. Medido (A/B, ciudad grande, bot de 30 días): ≈ +3 % de CPU en el perfil, de lo que la presencia es una parte pequeña (+0,15 s).

#### Niño de otro colegio (`vecino` con `escolar`, 17/11)

Los niños de otros colegios (`nino_*`) y los del barrio (`vecino_N`) menores de 18 que van a un colegio de fuera llevan la marca `escolar` en su tipo `vecino` (la pone `ajustarVecinos`, de `modules/npcs`, al crear la partida y cada curso; la pierden al cumplir 18 o cuando su colegio pasa a `ninguno`). Los días lectivos, **de 7:30 a 14:30 están en su colegio, que no está en el mapa** (fuera, igual que sus clases y su salida de las 14:00 a las 14:30: la hora a la que acaba el colegio del personaje). El resto del día (tarde, fines de semana, vacaciones) siguen la agenda de un vecino de arriba. Antes tenían la de un vecino adulto a todas horas: un día de clase a las 11:00 podían estar en el parque.

Si están apuntados a un club pasan a ser `rival` (sus sesiones, de su club) y el **equipo de su colegio** (`Club deportivo del colegio 1`, `colegio1`…) entrena con los **mismos días y horas que el del colegio del personaje, pero en su colegio** (`sede: null`: fuera del mapa; `sesionDelEquipoDeOtroColegio`, `modules/npcs`). Antes tenían el patrón de cuatro franjas de los clubes de fuera, en el estadio.

#### Entre las clases y la actividad (17/11)

Quien va al colegio del personaje (alumno o hermano en edad escolar) y tiene un entrenamiento o una actividad (un tramo con `ocupado` y de más nivel que el colegio) que **empieza como mucho `SALIDA_DEL_COLEGIO.espera` (60) minutos después de las clases** no se va a casa. En lugar de repartirse la salida de 14:00 a 14:30, **se queda en el colegio** (en la entrada, 70 %, o en el patio, 30 %: uno de los dos para todo el rato) **hasta que empieza su tramo**, que es 10 minutos antes de la sesión (`MARGEN_ANTES_DE_SESION`): el fútbol de las 15:00, a las 14:50, en el campo del colegio (zona `campo_colegio`); el atletismo del colegio, igual en la pista. Es general: cualquier tramo que empiece en esa ventana (aunque sea en otro lugar) tiene su espera; la hace `conEsperaTrasElColegio` al construir la agenda (campo `soloLectivo` de `TramoDeAgenda`: solo los días con colegio y los días del tramo; si el tramo tiene asistencia, la espera comparte su azar con él: si ese día no va a la actividad, se va como los demás). Las cifras (`espera`, el reparto entrada/patio) son datos de `SALIDA_DEL_COLEGIO` (`agendas.ts`).

#### Padres que recogen (`vecino` con `recoge`, 17/11, cifras provisionales)

Un **15 %** de los vecinos adultos (`RECOGIDA_DE_NINOS.proporcion`; ids `vecino_N` de **25 años o más** (`edadMinima`), sorteados por su id y la semilla con `azarDe`, sin gastar números del azar de la partida) llevan la marca `recoge`. **Van el 80 % de los días de clase** (`diasDeClase`; sorteo estable por persona y día, con el campo de tramo `delDia`: ese día están o no están, sin gastar el azar de la partida; los otros días hacen lo de un vecino). Los días que van, **llegan a la entrada del colegio (`colegio`) entre las 13:45 y las 14:00** (en pasos de 5 minutos: a las 13:45 está un tercio, a las 13:50 dos tercios y a las 13:55 todos) y **se van entre las 14:05 y las 14:30** (en pasos de 5: a las 14:05 sigue el 83 %, a las 14:10 el 67 %… a las 14:25 el 17 %; a las 14:30 no queda nadie). Quien ha llegado se queda hasta su hora y quien se va no vuelve (el mismo mecanismo `grupoDeAzar` que la salida de los alumnos). Antes y después hacen lo de un vecino. **Pendiente de revisar (decisión del usuario, 17/11): la edad mínima.** Los 25 años son provisionales: a veces pueden ser algo más jóvenes, y se quiere mezclar padres y abuelos (hoy todos son «vecino adulto» sin distinguir). **Todavía no hay una relación entre un padre y un hijo concreto** (los únicos padres son los del personaje): no se van «con su hijo»; queda pendiente hasta que exista esa relación.

#### Progenitores de un hogar (`vecino` con `laboral`, 23/11, solo con `CiudadDef.hogares`)

Con los hogares (`docs/relevo/hogares.md`), los adultos de cada familia (`Npc.hogar`, etiqueta `adulto_de_hogar`) son vecinos adultos con marcas propias que pone `ajustarVecinos`:

| Marca | Cuándo | Qué hace |
|---|---|---|
| `vive` | Siempre que el hogar esté en una calle del mapa (el 12 %; el resto vive en otro barrio) | La calle de su hogar (la de las ventanas de calle de `vecino`) |
| `recoge` | Su hogar tiene un hijo en el colegio de **menos de 10 años** (siempre), de 10 (50 %) o de 11 (25 %); en un hogar de dos adultos, **solo uno** (el sorteo es del hogar y la semilla) | Lo de «Padres que recogen» de arriba (el 80 % de los días de clase). Ya no es un sorteo suelto del 15 %: es el progenitor del niño |
| `laboral` | Progenitor menor de `EDAD_DE_JUBILACION` | **De lunes a viernes de 9:00 a 17:00 está «fuera»** (`TRABAJO_DE_PROGENITORES`, `agendas.ts`); **quien recoge sale antes: de 9:00 a 13:30** y esos días está en la entrada del colegio de 13:45 a 14:30. El trabajo va después de lo del barrio y la calle (manda sobre pasear) y antes de recoger (esperar al hijo manda sobre trabajar). Quien además tiene un oficio de un lugar (`trabaja`: dependiente, camarero, cocinero, monitor) está **en ese lugar** en su horario (manda sobre trabajar fuera) |

El resto del día (de 6:30 a 9:00, de 17:00 a 23:59 y los fines de semana) hacen lo de un vecino adulto. **Pendiente:** el hijo no se va con su progenitor (ambos salen del colegio por su propio azar); los 80 vecinos de siempre no tienen la marca `laboral`.

### Bibliotecario (`bibliotecario`), nivel 2

Dos personas (`bibliotecario_1` y `bibliotecario_2`, `role: vecino`, etiqueta `bibliotecario`): «Bibliotecario/a» en «Biblioteca municipal» (se sabe dónde trabajan; no hace falta preguntar). Turno de **mañana** (`turno: 'manana'`): lunes a viernes 9:00–14:30 y sábados 10:00–14:00; turno de **tarde**: lunes a viernes 14:30–20:00. Trabajan también en vacaciones y festivos. Se generan al final de la población para no cambiar el azar de lo demás.

Los vecinos solo van al supermercado y al restaurante cuando están abiertos (ver la sección 3); un test (`horarios.test.ts`) recorre un curso entero y comprueba que **nadie de ninguna agenda está en un sitio cerrado**.

### Hermano, niveles 1,5 a 3

Viven en casa (los únicos, con los padres, que tienen `casa` en su agenda). Una sola persona lleva un único tipo `hermano` con dos marcas que se recalculan cada curso según su edad.

| Días | Horas | Dónde | Nivel |
|---|---|---|---|
| todos | todo el día | casa | 1,5 (entre la base y el rol: manda sobre «fuera» y cede ante lo demás) |
| lectivo, si tiene de 3 a 17 años (`escolar`) | 7:30–14:30 (la salida se reparte de 14:00 a 14:30, como la de un alumno) | colegio como un alumno: llegando en la entrada del colegio y en el recreo en el patio; **en clase (7:50–10:40 y 11:10–14:00), ocupado** (fuera) | 2 |
| todos los días, si tiene menos de 8 años (`duerme`) | 23:00–7:00 | casa, **durmiendo**: se le ve en casa pero no se le puede hablar (`motivoOcupado`) | 2,25 |
| sábado, si practica atletismo (`deporte`) | 8:45–13:15 | estadio; va el 40 %, como los rivales; ocupado de 9:00 a 13:00 | 3 |

Al cumplir los 18 dejan el colegio (la marca `escolar` se quita al empezar el curso); al cumplir los 3 años entran. La marca `deporte` sigue a que tengan nivel de atletismo (desde los 8). Otros deportes y sesiones de club propias, pendientes.

### Padre y madre (`progenitor`), nivel 2

Son personas del juego (ids `padre` y `madre`, rol `familia`, siempre conocidas) con las que te relacionas como con un hermano. Su puesto de trabajo no es un lugar del mapa: cuando trabajan están «fuera». Cuando se llegue a la fase profesional habrá que valorar cuántos lugares se añaden o se desbloquean.

| Días | Horas | Dónde |
|---|---|---|
| lectivo | 6:30–8:00 y 18:30–24:00 | casa |
| libre | 9:00–24:00 | casa 85 %, fuera 15 % |
| resto | | fuera (trabajo) |

### El día de partido de los deportes con liga (el fútbol), nivel 4

(`MOTOR_PARTIDOS.md` §15; decisión del usuario, 11/11/2026.) Los deportes de equipo con liga ponen el **día de partido** como un acontecimiento (nivel 4: manda sobre todo lo demás ese día), calculado cada semana con el calendario de partidos (el servicio `partidos`, no una agenda fija) y con **las mismas reglas que el personaje**:

| Quién | Cuándo | Dónde |
|---|---|---|
| **Jugador convocado** (el entrenador convoca a 16 una hora antes) | Desde que llega (a la hora de la convocatoria más su retraso: **puntual, de 0 a 8 minutos; impuntual, de 11 a 30**; el 15 % de los de carácter medio es impuntual y el 2 % no se presenta) hasta media hora antes del partido | En el campo (se puede hablar con él) |
| | De media hora antes a la hora del partido | En el vestuario del campo |
| | Durante el partido (90 minutos) | En el campo, **ocupado** («jugando el partido»: se le ve, no se le puede hablar) |
| | Media hora después | En el vestuario |
| **Entrenador** de un equipo que juega | Los mismos tramos, sin retraso: en el campo desde la convocatoria | |

Los convocados se calculan con la misma regla que el personaje (`convocarYAlinear`); **el sorteo de quién no se presenta es solo a los convocados** (más probable cuanto menos disciplinado): su equipo juega sin él, con los que quedan de los citados, y **recibe una falta** (su asistencia baja 0,5 las dos semanas siguientes, como el personaje). Mientras esperan en el campo ven el partido anterior de su campo y **ganan conocimiento del fútbol** como el personaje (hasta 1,5 si lo ven entero); quien llega tarde ve menos. Con más de 10 minutos de retraso, **pierde con su entrenador lo mismo que el personaje** (−3 de afinidad y −1 de confianza, cifras provisionales; sin olvido semanal) y eso pesa en su prioridad de convocatoria (`ANEXO_RELACIONES.md`).

## 2 bis. Calles, lugares y zonas con horario

**El mapa es un grafo** (`construirMapa`, `contracts/lugares.ts`): 4 **calles** donde no se hace nada, **lugares** que dan a una calle y **zonas** dentro de los lugares. Desde casa ya no se va al colegio de golpe: se **sale a la calle**, se ve lo que hay en ella o se va a otra calle y se **entra** en el lugar. «Viajar» enseña, por separado, lo que hay **dentro** del lugar (zonas) y **salir** (la calle); y el «Viaje rápido» (desplegable) salta a **lugares**, nunca a zonas ni a calles, con el mismo coste que el camino, y **solo se ofrece estando en una calle** (desde dentro de un lugar o de una zona hay que salir primero, 29/10).

| Calle | Lugares (minutos entre la calle y su entrada) |
|---|---|
| Calle de tu casa | casa 1, supermercado 4, restaurante 4 |
| Calle del colegio | colegio 1, biblioteca 3 |
| Avenida del Parque | parque 1, gimnasio 5 |
| Avenida del Estadio | estadio 3 |

**Desde el 23/11 las calles tienen gente** (de 6:30 a 23:59, ver «Gente por la calle» en el vecino): antes los tramos solo llevaban a lugares y nadie pisaba nunca una calle. `avenida_estadio` sigue sin vecinos.

Entre calles: casa–colegio 8, casa–parque 4, colegio–parque 6, colegio–estadio 6, parque–estadio 6 minutos. El tiempo entre dos sitios cualesquiera es el camino más corto (por ejemplo, casa → colegio: 1 + 8 + 1 = 10).

Las zonas del colegio salen en este orden en «Viajar»: **aula, patio, sala de profesores, administración y pista de atletismo**.

Algunos lugares son **zonas dentro de otro** (`LugarDef.dentroDe`): se llega desde la entrada de su lugar y entrar o salir cuesta **2 minutos** (`MINUTOS_ENTRE_ZONAS`); entre dos zonas del mismo lugar, 4.

| Zona | Dentro de | Horario | Para qué |
|---|---|---|---|
| Tu aula | colegio | días de clase, de 7:50 al recreo (10:40) y de 11:10 a 14:00 (se abre 10 minutos antes de cada clase) | dar clase, repasar y charlar con los compañeros antes de empezar |
| Patio | colegio | el del colegio (la gente está en el recreo, 10:40–11:10) | el recreo: jugar con los compañeros y con otros niños |
| Sala de profesores | colegio | el del colegio | donde está el profesorado fuera de clase |
| Administración del colegio | colegio | días de clase, 9:00–13:30 y 15:00–18:00 | apuntarse y darse de baja del club del colegio |
| Pista de atletismo del colegio | colegio | el del colegio | entrenar el club del colegio (sesiones) y correr o hacer técnica por tu cuenta |
| Sala del Club Atletismo Ciudad | estadio | L–V 16:00–21:00; sábados 9:00–14:00 | prueba de acceso, inscripción, aceptar plaza y darse de baja |
| Sala del Club de Alto Rendimiento | estadio | L–V 16:00–21:00; sábados 9:00–14:00 | ídem |

Un lugar con horario no desaparece cuando está cerrado: sale en gris y dice cuándo abre. Las acciones que se hacen allí también se ven en gris (con el horario) en vez de pedir que vayas.

## 3. Horarios de apertura de los lugares

Decididos con el usuario (28/10): además del aula, la administración y las salas de club, cierran **el colegio, el supermercado y el restaurante**. Todos los horarios son datos de `packages/contracts/src/lugares.ts` (`horario` de cada lugar).

| Lugar | Horario |
|---|---|
| Colegio (entrada y todas sus zonas) | días de clase, 7:00–19:00. En vacaciones y festivos: de lunes a viernes 10:00–13:00 (la academia de verano) y lunes y miércoles 14:30–17:30 (las sesiones del club del colegio) |
| Supermercado | lunes a sábado 9:00–21:00; domingo 10:00–15:00 |
| Restaurante | todos los días 13:00–16:00 y 20:00–23:00 |
| Gimnasio | todos los días 8:00–22:00 |
| Estadio (y las salas de club de dentro, que además tienen su horario) | todos los días 8:00–21:00 |
| Biblioteca | lunes a viernes 9:00–20:00; sábados 10:00–14:00; domingos cerrada |
| Parque | siempre abierto (sin horario) |

- **Las zonas cierran con su lugar:** si el colegio está cerrado, también lo están la pista, el patio y la sala de profesores, aunque no tengan horario propio.
- **A la hora de llegar a la entrada:** para saber si se puede hacer algo en una zona se mira la hora a la que se llegaría a la **entrada** de su lugar (se pasa por ella), no solo a la zona. Si ya estás dentro, vale la hora de llegada a la zona.
- **Varios sitios posibles:** si una acción vale en varios sitios (series: pista del colegio, estadio o parque) y el primero estaría cerrado al llegar, se va a uno abierto (`conLugar` pone primero los abiertos).
- **Consecuencia en el juego:** entrenar por tu cuenta en la pista del colegio solo se puede en horario del colegio; fuera de él, el estadio o el parque. Subir y volver de categoría, que se hacen en la sede del club, requieren el colegio abierto (un sábado no se puede).
- Los comercios todavía no tienen acciones (comprar, comer fuera): esperan al dinero.
- **Biblioteca** (28/10, decidido con el usuario): lugar nuevo en la calle del colegio (3 min de la calle; 12 min desde tu casa). **Estudiar solo se hace en casa o en la biblioteca** (y, desde el 21/11, «Hacer deberes…», 30 min, también en el colegio fuera de clase, el parque y los campos —estadio y campos de fútbol—, para esperar al entrenamiento; ver `docs/relevo/deberes-y-acciones-cortas.md`): `estudios.estudiar_*` y `estudios.repaso` van ligadas a `['casa', 'biblioteca']` (antes `['casa', 'colegio']`, es decir, la entrada del colegio). La clase sigue siendo en el aula y la academia, en el colegio. Quien estudia en la biblioteca lo hace igual que en casa (no hay bonus ni penalización todavía).

## 4. Población de PNJs (aprobada y generada)

Son **391 personas persistentes** (más 2 bibliotecarios y, desde el 23/11, 5 caras fijas de la calle, generados al final) (el plan hablaba de ~410; ver «Total real» más abajo), todas con descripción física desde el principio y desconocidas hasta que se habla con ellas (salvo la familia y quien el juego presente al empezar). Como en el juego de referencia, la pantalla enseña como mucho 40 a la vez.

| Grupo | Cuántos | Detalle |
|---|---|---|
| **Tu clase** | 24 compañeros (25 con el personaje) | 25 alumnos por aula. Son compañeros de clase del mismo curso; están en el colegio a las mismas horas. Cambian de curso contigo. |
| **Tu curso, otra clase** | 25 | La otra línea del curso: coinciden en el recreo y el patio. |
| **Otros cursos** | ~150 | Alumnos de los demás cursos del colegio (en torno a 15 por curso): llenan el patio y el parque. No solo de la edad del personaje. |
| **Profesores** | 12 | El tutor, un profesor por asignatura y el de educación física. |
| **Entrenadores de los clubes de fuera** | 5 | Club Atletismo Ciudad: 3 (10–13, 14–17 y 18 o más); Alto Rendimiento: 2 (14–17 y 18 o más). Ver `ANEXO_DEPORTE.md`. |
| **Equipo del colegio del primer deporte (atletismo)** | ~16 + entrenador | Salen de las clases anteriores: unos 3–4 de tu clase, otros de tu curso y de los demás. Al tener el tipo `club` van a las sesiones del club del colegio. |
| **Rivales** | 96 (8 por edad, de 8 a 19) | Se reparten en **12 clubes y colegios de fuera**: los dos del catálogo del personaje (Club Atletismo Ciudad y Club de Alto Rendimiento) y diez con nombres provisionales (`colegio1`…`colegio4`, `club1`…`club6`), unos 8 por club. Sedes en el estadio. Los que son de otro colegio no están en el nuestro. |
| **Vecinos** | ~80 | De todas las edades. Parque, supermercado, restaurante, gimnasio y biblioteca. |
| **Bibliotecarios** | 2 | Turno de mañana y turno de tarde en la biblioteca. |
| **Caras fijas de la calle** | 5 | El portero de tu portal, el conserje del colegio y 3 repartidores (23/11; ver «Gente por la calle»). |
| **Familia** | 2 padres + 0 a 3 hermanos | Son personas con las que te relacionas: los padres en casa (ver «Padre y madre») y los hermanos en casa, en el colegio y en su deporte (ver «Hermano»). |
| **Total real generado** | **403 + 2 padres + 5 entrenadores de clubes + 2 bibliotecarios + los hermanos** | 4 del reparto inicial (desconocidos al empezar, como el resto), 22 compañeros más de tu clase, 25 de la otra clase, 153 de otros cursos (17 por cada edad de 9 a 17), 11 profesores más, 108 rivales y 80 vecinos |

**Nombres (29–30/10):** cada persona sortea primero su origen y de él salen el nombre y los apellidos (ver `ANEXO_NOMBRES.md`); puede haber **dos homónimos como mucho, con 15 años o más de diferencia** (antes eran únicos). **Horarios de apertura y país:** los de este anexo son los de España; cada país puede traer los suyos (`PAQUETES_DE_PAIS.md`).

Reglas de generación:

- Todos persistentes: se generan al crear la partida (con su semilla) y se guardan.
- Los alumnos suben de curso cada año con su clase; los que cumplen 18 salen y entra un niño de 8 años con los mismos tipos (así el equipo del colegio sigue en 16).
- Cada persona tiene sus **tipos** al nacer; los acontecimientos los cambian (un compañero se apunta a tu club: se le añade `club`).
- Cuantos más tipos de nivel alto tiene, antes aparece en las listas de «Gente aquí».

## 5. Cuánta gente aguanta el juego

Medido con la población clonada hasta cada tamaño (sin hacer nada más, en este equipo de pruebas):

| Personas | Guardado | Guardar (serializar + JSON) | Lista de acciones | 1.ª consulta de presencia tras un cambio de tramo | 1 día entero |
|---|---|---|---|---|---|
| 400 | 0,4 MB | 10 ms | 1,3 ms | 1,7 ms | 1,6 ms |
| 2 000 | 1,9 MB | 53 ms | 1,7 ms | 4,1 ms | 2,7 ms |
| 10 000 | 9,4 MB | 285 ms | 4,6 ms | 13,9 ms | 7,4 ms |
| 50 000 | 47 MB | 1 975 ms | 26 ms | — | 27 ms |

- **El procesador no es el límite.** Con las consultas resueltas una vez (presencia entre cambios de tramo, consultas de personas por filtro) hasta decenas de miles de personas siguen dando milisegundos. Ejecutar una acción cuesta lo mismo con 400 que con 50 000.
- **El límite es el guardado.** Cada persona pesa ~950 bytes (535 son sus rasgos: aspecto, carácter, intereses y gustos). Se guarda en IndexedDB (cientos de MB), así que el espacio no limita; lo que se nota es lo que tarda cada guardado: unos 60 ms con 10 000 personas (ver `docs/ALMACENAMIENTO.md`). La interfaz agrupa los guardados (cada medio segundo, no en cada acción).
- **Qué hacer cuando lleguen los deportes de equipo, si hiciera falta (de menor a mayor esfuerzo; fases en `docs/ALMACENAMIENTO.md`):**
  1. **Compactar los rasgos** (ids numéricos en vez de textos): de 535 a unos 60 bytes por persona.
  2. **Guardar solo lo que cambia:** la población sale de la semilla (es determinista) y la partida guarda solo las diferencias (la conoces, está en tu club, su nivel). Sin límite práctico.
- **Presencia:** nadie aparece ni desaparece mientras no cambie un tramo: dentro de un tramo cada persona está siempre en el mismo sitio (su destino sale de un hash de persona, día y tramo, no del minuto). Por eso la presencia de toda la población se calcula **una vez por intervalo entre dos cambios de tramo de cualquier agenda** (unas 25 veces al día: 7:30, 10:00, 14:00, 15:00...) y se reutiliza. Un test avanza de 6 en 6 minutos durante dos días y comprueba que lo reutilizado coincide, a cualquier minuto, con calcular persona a persona. En clase son los mismos 25 durante las cuatro clases y el recreo.

## 6. Pendiente

- ~~Pestaña del deporte~~ **Hecha** (ver `ANEXO_DEPORTE.md`).
- ~~Horarios de apertura~~ **Hechos** (sección 3): colegio, supermercado, restaurante, gimnasio, estadio y biblioteca; el parque no tiene horario. Pendiente: acciones en los comercios.
- **Eventos y decisiones:** pendientes de todo lo demás.

**Compañeros hasta los 20 (22/11/2026):** los compañeros de colegio que acaban a los 18 ya no se borran: pasan a ser jóvenes del barrio sin colegio (id `alumno_N`/`clase_N`/`curso_N`, rol `vecino`, etiqueta `excompanero`) hasta los 20, como los `nino_N` de otros colegios (18–19 años: `jovenesPorEdad`), y entran niños de 8 años en el colegio como siempre. La población total sube en dos cursos de jóvenes (≈ +100 con la ciudad grande y el colegio de 50 por curso).
