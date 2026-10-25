# Anexo: horarios de las personas y población de PNJs

Es la referencia de **dónde está cada persona a cada hora** y de **cuántas personas habrá**. Los horarios son dato (`packages/contracts/src/agendas.ts`, función `tramosDe`) y esta tabla es la fuente: si cambias uno, cambia los dos y el test de `agendas.test.ts`.

Estado: **horarios cerrados y población aprobada** (25/10/2026). La población de la sección 4 está generada (391 personas).

## 1. Cómo funciona

- Cada persona guarda una lista de **tipos** (`alumno`, `profesor`, `entrenador`, `club`, `rival`, `amigo`, `vecino`). Un tipo aporta **tramos** de la semana: de tal hora a tal hora, en tal lugar.
- Dos tramos pueden coincidir. **Manda el de mayor nivel** (el tipo dominante):

| Nivel | Qué es | Ejemplos |
|---|---|---|
| 1 base | estar fuera del mapa | casa propia, trabajo, otro colegio |
| 2 rol | lo que se es | alumno, profesor, vecino |
| 3 pertenencia | a lo que se pertenece | un club, un grupo de amigos, las carreras |
| 4 evento | un acontecimiento temporal | se apunta a tu club, un cumpleaños (con `hasta`: día en que deja de valer) |

- Ejemplo: un compañero de clase (nivel 2) se apunta a tu club (nivel 3). Sigue yendo a clase, pero en la tarde de entrenamiento está donde entrena el club. Si el club se acaba, se le quita el tipo y vuelve su rutina.
- **«Fuera»** (`null`) es cualquier sitio que no está en el mapa. Por eso solo los de la familia están en `casa`: los demás tienen su casa fuera del mapa.
- **Azar estable:** a qué sitio va de varios posibles, o si falta ese día, sale de un hash de (persona, día, tramo). No se guarda y no cambia mientras dure el tramo. Es el «azar al llegar a un lugar».
- **Presencia:** el servicio `presencia` (`en(lugar, max)`, `donde(persona)`, `agenda(persona)`) dice quién hay en un lugar ahora. Los de mayor nivel salen primero y el resto en un orden estable; con `max` se limita (la pantalla enseña 40, como el juego de referencia).
- Se guarda por persona **solo la lista de tipos**. La agenda se calcula y se recuerda en memoria.
- Los desconocidos se ven por su **descripción física** («Una chica de pelo negro liso, ojos marrones oscuros y piel clara») hasta que se habla con ellos.

## 2. Horarios por tipo

Minutos y días como en el calendario escolar: **lectivo** = día de clase (no fin de semana ni vacaciones), **libre** = el resto. «Fuera» = fuera del mapa. Los porcentajes son el peso de cada destino (se elige uno por persona y día).

### Alumno (compañero de clase), nivel 2

| Días | Horas | Dónde |
|---|---|---|
| lectivo | 7:50–14:00 | colegio (clases de 8:00 a 14:00; el recreo es de 10:40 a 11:20, también en el colegio) |
| lectivo | 15:00–19:00 | fuera 60 %, parque 25 %, supermercado 10 %, gimnasio 5 % |
| libre | 10:00–14:00 | fuera 50 %, parque 40 %, supermercado 10 % |
| libre | 15:00–20:00 | fuera 50 %, parque 40 %, supermercado 5 %, gimnasio 5 % |
| sábado | 20:00–22:30 | fuera 80 %, restaurante 20 % |
| resto | | fuera (casa, comer, dormir) |

### Profesor / tutor, nivel 2

| Días | Horas | Dónde |
|---|---|---|
| lectivo | 7:30–17:00 | colegio (clases hasta las 14:00 y tutorías de 14:00 a 17:00) |
| resto | | fuera |

### Entrenador, nivel 3

| Días | Horas | Dónde |
|---|---|---|
| las de las sesiones de su club | club del colegio: lunes y miércoles, 15:00–17:00 | colegio (pistas) |
| sábado | 9:00–13:00 | estadio (carreras) |
| resto | | fuera |

### Miembro de un club, nivel 3

Las sesiones del club (catálogo de `modules/clubes`):

| Club | Días | Horas | Dónde |
|---|---|---|---|
| Club del colegio | lunes y miércoles | 15:00–17:00 | colegio (pistas) |
| Club Atletismo Ciudad | martes y jueves | 18:00–20:00 | estadio |
| Club de Alto Rendimiento | lunes, martes y jueves | 17:00–20:00 | estadio |

### Rival, niveles 2 y 3

Fuera de sus sesiones, el colegio (no van al nuestro) y las carreras, algunos pasan por el parque: allí se les puede encontrar (nivel 2: cualquier tramo de nivel 3 manda sobre él).

| Días | Horas | Dónde |
|---|---|---|
| lectivo (nivel 2) | 15:00–19:00 | fuera 85 %, parque 15 % |
| libre (nivel 2) | 10:00–20:00 | fuera 75 %, parque 25 % |
| las sesiones de su club (nivel 3) | según el club (los clubes de fuera del catálogo tienen una de cuatro franjas: L y X 17–19, M y J 18–20, L M y J 17–20, X y V 17–19) | estadio; va el 85 % |
| sábado | 9:00–13:00 | estadio, solo el 40 % (los demás corren otras pruebas o en otros campeonatos) |
| resto | | fuera (vive y estudia fuera del mapa) |

Las sedes de todos los clubes de fuera son el estadio, de momento.

### Amigo, nivel 3

Se suma a las del alumno y pesa más en el parque:

| Días | Horas | Dónde |
|---|---|---|
| lectivo | 15:00–19:00 | fuera 60 %, parque 40 % |
| libre | 10:00–14:00 y 15:00–20:00 | fuera 40 %, parque 60 % |

### Vecino (genérico), nivel 2

| Días | Horas | Dónde |
|---|---|---|
| todos | 9:00–21:00 | fuera 50 %, parque 30 %, supermercado 15 %, restaurante 5 % |
| resto | | fuera |

### Padre y madre

De momento no están en el sistema de presencia (viven con el personaje, y su puesto de trabajo no es un lugar del mapa). Cuando se llegue a la fase profesional habrá que valorar cuántos lugares se añaden o se desbloquean.

## 3. Comercios (horarios de apertura, sin implementar)

Supuesto: **supermercado** de 9:00 a 21:00 de lunes a sábado y de 10:00 a 15:00 el domingo; **restaurante** de 13:00 a 16:00 y de 20:00 a 23:00. Los lugares existen pero no tienen acciones ni cierran todavía.

## 4. Población de PNJs (aprobada y generada)

Son **391 personas persistentes** (el plan hablaba de ~410; ver «Total real» más abajo), todas con descripción física desde el principio y desconocidas hasta que se habla con ellas (salvo la familia y quien el juego presente al empezar). Como en el juego de referencia, la pantalla enseña como mucho 40 a la vez.

| Grupo | Cuántos | Detalle |
|---|---|---|
| **Tu clase** | 24 compañeros (25 con el personaje) | 25 alumnos por aula. Son compañeros de clase del mismo curso; están en el colegio a las mismas horas. Cambian de curso contigo. |
| **Tu curso, otra clase** | 25 | La otra línea del curso: coinciden en el recreo y el patio. |
| **Otros cursos** | ~150 | Alumnos de los demás cursos del colegio (en torno a 15 por curso): llenan el patio y el parque. No solo de la edad del personaje. |
| **Profesores** | 12 | El tutor, un profesor por asignatura y el de educación física. |
| **Equipo de atletismo del colegio** | ~16 + entrenador | Salen de las clases anteriores: unos 3–4 de tu clase, otros de tu curso y de los demás. Al tener el tipo `club` van a las sesiones del club del colegio. |
| **Rivales** | 96 (8 por edad, de 8 a 19) | Se reparten en **12 clubes y colegios de fuera**: los dos del catálogo del personaje (Club Atletismo Ciudad y Club de Alto Rendimiento) y diez con nombres provisionales (`colegio1`…`colegio4`, `club1`…`club6`), unos 8 por club. Sedes en el estadio. Los que son de otro colegio no están en el nuestro. |
| **Vecinos** | ~80 | De todas las edades. Parque, supermercado, restaurante y gimnasio. |
| **Familia** | 2 padres + (hermanos más adelante) | Ya existen. |
| **Total real generado** | **391** | 4 del reparto inicial, 22 compañeros más de tu clase, 25 de la otra clase, 153 de otros cursos (17 por cada edad de 9 a 17), 11 profesores más, 96 rivales y 80 vecinos |

Reglas de generación:

- Todos persistentes: se generan al crear la partida (con su semilla) y se guardan.
- Los alumnos suben de curso cada año con su clase; los que cumplen 18 salen y entra un niño de 8 años con los mismos tipos (así el equipo del colegio sigue en 16).
- Cada persona tiene sus **tipos** al nacer; los acontecimientos los cambian (un compañero se apunta a tu club: se le añade `club`).
- Cuantos más tipos de nivel alto tiene, antes aparece en las listas de «Gente aquí».

## 5. Cuánta gente aguanta el juego

Medido con la población clonada hasta cada tamaño (sin hacer nada más, en este equipo de pruebas):

| Personas | Guardado | Guardar (serializar + JSON) | Lista de acciones | 1.ª consulta de presencia en cada tramo de 10 min | 1 día entero |
|---|---|---|---|---|---|
| 400 | 0,4 MB | 10 ms | 1,3 ms | 1,7 ms | 1,6 ms |
| 2 000 | 1,9 MB | 53 ms | 1,7 ms | 4,1 ms | 2,7 ms |
| 10 000 | 9,4 MB | 285 ms | 4,6 ms | 13,9 ms | 7,4 ms |
| 50 000 | 47 MB | 1 975 ms | 26 ms | — | 27 ms |

- **El procesador no es el límite.** Con las consultas resueltas una vez (presencia por tramo de 10 minutos, consultas de personas por filtro) hasta decenas de miles de personas siguen dando milisegundos. Ejecutar una acción cuesta lo mismo con 400 que con 50 000.
- **El límite es el guardado.** Cada persona pesa ~950 bytes (535 son sus rasgos: aspecto, carácter, intereses y gustos). El navegador deja unos 5 MB en `localStorage`: **unas 5 000 personas** con el formato actual. La interfaz agrupa los guardados (cada medio segundo, no en cada acción), pero con miles de personas cada guardado se nota.
- **Qué hacer cuando lleguen los deportes de equipo (de menor a mayor esfuerzo):**
  1. **Compactar los rasgos** (ids numéricos en vez de textos): de 535 a unos 60 bytes, unas 15 000 personas en 5 MB.
  2. **Guardar solo lo que cambia:** la población sale de la semilla (es determinista) y la partida guarda solo las diferencias (la conoces, está en tu club, su nivel). Sin límite práctico.
  3. **IndexedDB** en lugar de `localStorage` (cientos de MB), si hiciera falta guardar mucho.
- **Presencia:** se calcula para toda la población una vez por tramo de 10 minutos y se reutiliza. Por eso todos los tramos de los horarios empiezan y acaban en minutos múltiplos de 10 (hay un test que lo comprueba).

## 6. Pendiente

- **Preguntar el nombre** como acción (cuesta tiempo) que pasa de desconocido a conocido.
- **Panel «Gente»** con filtros y barras de relación, como el de referencia.
- **Pestaña del deporte:** habilidades, clasificación de todas las carreras del año y demás.
- **Horarios de apertura** de los comercios y de los lugares (cerrado según la hora).
- **Eventos y decisiones:** pendientes de todo lo demás.
