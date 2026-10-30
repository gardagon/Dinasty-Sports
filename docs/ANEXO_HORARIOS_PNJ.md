# Anexo: horarios de las personas y población de PNJs

Es la referencia de **dónde está cada persona a cada hora** y de **cuántas personas habrá**. Los horarios son dato (`packages/contracts/src/agendas.ts`, función `tramosDe`) y esta tabla es la fuente: si cambias uno, cambia los dos y el test de `agendas.test.ts`.

Estado: **horarios cerrados y población aprobada** (27/10/2026). La población de la sección 4 está generada (391 personas del colegio y del barrio, y al final se añaden 2 bibliotecarios, 5 entrenadores de clubes, los padres y los hermanos). Actualizado el 28/10/2026 (biblioteca y horarios de los lugares).

**Lo que pone el deporte (fase 3 del plan de deportes, 30/10/2026):** las sesiones y las sedes de los clubes y la jornada de competición (los sábados de 9 a 13 en el estadio, en el atletismo) ya no están escritas en `agendas.ts`: salen de los datos del deporte para el país de la partida (`DatosDeDeportePais.clubes` y `competiciones.jornada`, ver `modules/atletismo/src/datos.ts`) y las agendas las reciben en `DatosDeAgenda`. Las tablas de abajo describen los datos de España del atletismo.

**La gente de cada deporte (fase 4, 30/10/2026):** los rivales, los entrenadores y el equipo del colegio los pide cada deporte como dato (`DatosDeDeportePais.poblacion`). Los deportistas ya no son un número fijo: los niños (los del colegio, los de los cuatro colegios de fuera —17 por curso y colegio de 8 a 17 años y los jóvenes de 18 y 19— y los del barrio, todos creados con herencia y sin deporte, ≈ 1.100 personas) los recluta cada deporte por gustos y aptitud en equipos con plantilla definida (`modules/atletismo/src/datos.ts`, ~115 en el atletismo de España, 5-13 por edad). Las cifras de rivales y equipo de las tablas de abajo son orientativas de la versión anterior; los entrenadores de clubes (5) siguen igual.

## 1. Cómo funciona

- Cada persona guarda una lista de **tipos** (`alumno`, `profesor`, `entrenador`, `club`, `rival`, `amigo`, `vecino`, `bibliotecario`). Un tipo aporta **tramos** de la semana: de tal hora a tal hora, en tal lugar.
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

## 2. Horarios por tipo

Minutos y días como en el calendario escolar: **lectivo** = día de clase (no fin de semana ni vacaciones), **libre** = el resto. «Fuera» = fuera del mapa. Los porcentajes son el peso de cada destino (se elige uno por persona y día).

### Alumno (compañero de clase), nivel 2

| Días | Horas | Dónde |
|---|---|---|
| lectivo | 7:30–7:50 | colegio (la entrada, fuera de las aulas), llegando (se les puede hablar) |
| lectivo | 7:50–10:40 y 11:10–14:00 | **en su aula**: los demás alumnos están en sus aulas (fuera del mapa: **ocupados**). **Tus compañeros de clase** (`tuClase`: los 24 de tu clase y los del reparto inicial) están en **tu aula** (`aula`): libres de 7:50 a 8:00 (el aula ya está abierta) y los 5 minutos al acabar cada clase (9:15–9:20, 10:35–10:40, 12:35–12:40, 13:55–14:00); en clase siguen en el aula, a la vista, con el estado **«atendiendo en clase»** (ocupados, sin poder hablarles) |
| lectivo | 10:40–11:10 | **patio** (zona del colegio): el recreo (se les puede hablar) |
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

### Bibliotecario (`bibliotecario`), nivel 2

Dos personas (`bibliotecario_1` y `bibliotecario_2`, `role: vecino`, etiqueta `bibliotecario`): «Bibliotecario/a» en «Biblioteca municipal» (se sabe dónde trabajan; no hace falta preguntar). Turno de **mañana** (`turno: 'manana'`): lunes a viernes 9:00–14:30 y sábados 10:00–14:00; turno de **tarde**: lunes a viernes 14:30–20:00. Trabajan también en vacaciones y festivos. Se generan al final de la población para no cambiar el azar de lo demás.

Los vecinos solo van al supermercado y al restaurante cuando están abiertos (ver la sección 3); un test (`horarios.test.ts`) recorre un curso entero y comprueba que **nadie de ninguna agenda está en un sitio cerrado**.

### Hermano, niveles 1,5 a 3

Viven en casa (los únicos, con los padres, que tienen `casa` en su agenda). Una sola persona lleva un único tipo `hermano` con dos marcas que se recalculan cada curso según su edad.

| Días | Horas | Dónde | Nivel |
|---|---|---|---|
| todos | todo el día | casa | 1,5 (entre la base y el rol: manda sobre «fuera» y cede ante lo demás) |
| lectivo, si tiene de 3 a 17 años (`escolar`) | 7:30–14:00 | colegio como un alumno: llegando en la entrada del colegio y en el recreo en el patio; **en clase (7:50–10:40 y 11:10–14:00), ocupado** (fuera) | 2 |
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

## 2 bis. Calles, lugares y zonas con horario

**El mapa es un grafo** (`construirMapa`, `contracts/lugares.ts`): 4 **calles** donde no se hace nada, **lugares** que dan a una calle y **zonas** dentro de los lugares. Desde casa ya no se va al colegio de golpe: se **sale a la calle**, se ve lo que hay en ella o se va a otra calle y se **entra** en el lugar. «Viajar» enseña, por separado, lo que hay **dentro** del lugar (zonas) y **salir** (la calle); y el «Viaje rápido» (desplegable) salta a **lugares**, nunca a zonas ni a calles, con el mismo coste que el camino, y **solo se ofrece estando en una calle** (desde dentro de un lugar o de una zona hay que salir primero, 29/10).

| Calle | Lugares (minutos entre la calle y su entrada) |
|---|---|
| Calle de tu casa | casa 1, supermercado 4, restaurante 4 |
| Calle del colegio | colegio 1, biblioteca 3 |
| Avenida del Parque | parque 1, gimnasio 5 |
| Avenida del Estadio | estadio 3 |

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
- **Biblioteca** (28/10, decidido con el usuario): lugar nuevo en la calle del colegio (3 min de la calle; 12 min desde tu casa). **Estudiar solo se hace en casa o en la biblioteca**: `estudios.estudiar_*` y `estudios.repaso` van ligadas a `['casa', 'biblioteca']` (antes `['casa', 'colegio']`, es decir, la entrada del colegio). La clase sigue siendo en el aula y la academia, en el colegio. Quien estudia en la biblioteca lo hace igual que en casa (no hay bonus ni penalización todavía).

## 4. Población de PNJs (aprobada y generada)

Son **391 personas persistentes** (más 2 bibliotecarios generados al final) (el plan hablaba de ~410; ver «Total real» más abajo), todas con descripción física desde el principio y desconocidas hasta que se habla con ellas (salvo la familia y quien el juego presente al empezar). Como en el juego de referencia, la pantalla enseña como mucho 40 a la vez.

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
