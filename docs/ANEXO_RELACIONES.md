# Anexo: relaciones con las personas (todas las cifras)

Referencia de cómo se habla con la gente y cuánto cambia cada cosa, para revisar y reequilibrar. El código está en `modules/relaciones/src/` (`index.ts`: las acciones; `acciones.ts`: reglas puras; `vinculo.ts`: el vínculo) y los gustos y la compatibilidad, en `packages/contracts/src/rasgos.ts`. Estado a 27/10/2026.

## 1. Cómo funciona

1. **Desconocido → conocido:** a quien no conoces y tienes cerca (entre 34 y 46 en un lugar, según el momento: `aforoCercano`) le preguntas el nombre (2 minutos). **Al empezar solo conoces a tu familia** (padres y hermanos). El entrenador, el tutor y los dos compañeros del reparto son desconocidos como los demás: al tutor y a los compañeros les preguntas el nombre cuando los tienes cerca; al entrenador lo conoces al apuntarte a su club (se presenta). Los rivales se conocen al competir contra ellos. Hasta que no conoces a alguien no aparece en «Relaciones» ni en las pestañas de «Gente» que no son «Aquí», ni hay acciones con él o ella (al tutor se le piden tutorías una vez que lo conoces).
2. **Conocido → vínculo:** con cada persona conocida hay una **afinidad** (−100 a 100) y una **confianza** (0 a 100). De sus valores sale el **estado**: antagonista, enemigo, antipatía, conocido, amigo o mejor amigo.
2 bis. **La familia:** el padre y la madre son personas como los hermanos (siempre conocidas, en «Relaciones» y en «Gente»). Su vínculo empieza más hondo: afinidad de 15 a 35 según la compatibilidad (15 + 40 × (compat − 0,2)) y confianza 30; los hermanos, de 5 a 25 y confianza 15. Con ellos hay las acciones de amistad (pasar la tarde, charlar, ayudar, hacer planes, detalle, discutir y paces); con los padres no hay «Estudiar con» ni planes. Están en casa por la tarde-noche (ver `ANEXO_HORARIOS_PNJ.md`).
3. **Hablar exige que esté contigo** (la **familia** no tiene horario: si está delante, a cualquier hora; el resto, el de cada acción) (entre las 34–46 personas que tienes cerca; presencia de `npcs`, ver `ANEXO_HORARIOS_PNJ.md`). **En clase, en una carrera o en una sesión del club están ocupados**: no se les puede hablar; sí al llegar, en el recreo y al acabar. Si no está, la acción dice «no está aquí» y **no hay forma de contactarla ni de saber dónde anda**: hasta que haya teléfono, solo se habla con quien coincide contigo. (Así el juego no tiene que calcular dónde están todos tus conocidos.) **Una actividad «grande» al día** como máximo con cada persona (quedar, ayudar, hacer planes, detalle, discutir, paces, estudiar); las charlas de 5 minutos van aparte (hasta 6 al día). **Dónde se hace todo esto:** desde la **ficha de la persona** en «Gente» (apartado «Qué hacer con…»), no desde «Qué hacer».
4. **Lo que sube una acción** = ganancia base × **eficiencia**. La eficiencia es el producto de varios factores (sección 3), así que se ve el motivo de cada uno al elegir la acción.
5. Sin verse, lo positivo se **enfría** (sección 4).

## 2. Las acciones

Ganancia y confianza son lo que suman con eficiencia ×1. **Presencia:** todas exigen que la persona esté contigo, entre la gente que tienes cerca (para «Preguntar el nombre», también). **Horario:** «fuera de clase» = fuera de las clases de 8 a 14 de un día lectivo; «+ recreo» = también en el recreo (10:40–11:20, en el colegio).

| Acción | Con quién | Min | Afinidad | Confianza | Energía | Estrés | Entrena | Horario | Requisitos y espera |
|---|---|---|---|---|---|---|---|---|---|
| Preguntar el nombre | desconocidos cerca | 2 | — | — | — | — | — | siempre | que esté cerca (aforo de 34 a 46) |
| Quedar | compañeros, amigos | 120 | +5 | +3 | −6 | −6 | carisma 0,8; empatía 0,4; cooperación 0,3 | fuera de clase, 10–22 | — |
| Charlar un rato | compañeros, amigos | **5** (hasta 6 al día: 30 en total) | +2,5 la media hora (≈ +0,42 cada charla de 5 min) | +1,5 la media hora | −1 la media hora | — | comunicación 0,4; empatía 0,2 (la media hora, repartido en las 6 charlas) | desde 7:30 (al llegar al colegio), fuera de clase, en el recreo y en los 5 minutos entre clases (con compañeros de clase), hasta las 22 | máximo 6 charlas al día con cada persona; no gasta el «una actividad grande al día» |
| Ayudar | compañeros, amigos | 60 | +4 | +4,5 | −6 | — | empatía 0,6; cooperación 0,5; determinación 0,2 | fuera de clase, 10–21 | afinidad ≥ 5 |
| Hacer planes | compañeros, amigos | 90 | +6 | +3 | −6 | −6 | carisma 0,5; comunicación 0,3 | fuera de clase, 10–22 | compartir un interés (nivel ≥ 15 del personaje); ganancia × (0,8 + 0,2 × su intensidad) |
| Proponer un plan (hoy o mañana) | compañeros, amigos y hermanos de 6 años o más que tienes delante | 5 | +1 si acepta | — | — | — | — | fuera de clase o recreo, 8–22 (hoy: hasta 16:00) | respuesta según la sección «Planes»; una propuesta por persona y día |
| Charlar con alguien antes de clase (al azar) | una persona al azar de las que hay **en tu aula** (hay que estar dentro: el aula se abre 10 min antes) | lo que quede hasta la clase (1 a 10 min) | 2,5 × minutos/30 | 1,5 × minutos/30 | −1 | — | comunicación 0,4 y empatía 0,2 × minutos/30 | solo en los 10 minutos antes de cada clase, en el colegio | si no la conocías se presenta; no cuenta como charla del día ni como actividad grande |
| Estudiar con (plan acordado) | los mismos | 90 | +2,5 | +2 | −8 | — | concentración 0,6; inteligencia 0,3; cooperación 0,2 | de la hora acordada a 30 min después, **en tu casa** | solo con un plan acordado para ahora (no hace falta que esté entre la gente que tienes cerca); compañía de estudio |
| Tener un detalle | compañeros, amigos | 5 | +3 | +1 | −1 | — | empatía 0,3; creatividad 0,3 | fuera de clase o recreo, 8–22 | una vez cada 7 días; ganancia × (1 + 0,15 × intensidad de su interés favorito) |
| Hablar (entrenador, tutor) | entrenador, profesor | **5** (hasta 6 al día) | +4 la media hora (≈ +0,67 cada charla) | +2,5 la media hora | −3 la media hora | — | comunicación 0,6; carisma 0,3 | entrenador: antes y después de su sesión o carrera (14:45–21:00 en día lectivo, 8:45–14:00 si no); tutor: 14–17 de un día lectivo o recreo | — |
| Charlar (rival) | rivales conocidos (los 5 más marcados) | **5** (hasta 6 al día) | +2 la media hora | +1 la media hora | −1 la media hora | — | comunicación 0,3; carisma 0,2 | fuera de clase, 10–21 | — |
| Discutir / Plantar cara / Encararse | todos | 30 | −(10 + 4 × agresividad/50), ×1,5 con entrenador o tutor | −5 | −4 | −8 | autoridad 0,6; picardía 0,2 | el de cada persona | siempre; es una decisión del jugador |
| Hacer las paces / Pedir disculpas | todos | 30 | éxito: afinidad pasa a −2, estado «conocido» y suma 5 (queda en 3); fallo: −3 | éxito +5; fallo −2 | −3 | +3 | empatía 0,5; comunicación 0,4 | el de cada persona | solo si el estado es negativo; tras un fallo, esperar 5 días; probabilidad en la sección 4 |

## 3. Qué multiplica lo que sube (eficiencia)

Todos se multiplican entre sí y con la compañía; con valores corrientes el producto queda cerca de ×1.

| Factor | Rango | De qué depende |
|---|---|---|
| **Compatibilidad** (`relaciones.compatibilidad`) | ×0,7 – ×1,4 | 60 % intereses en común y 40 % parecido de carácter (ejes con pesos: sociabilidad 0,2; disciplina, honestidad, agresividad, optimismo 0,15; ambición 0,1; sacrificio y prudencia 0,05). Compatibilidad 0,25 → ×0,7; 0,5 → ×1,05; ≥ 0,75 → ×1,4. |
| **Habilidad** del personaje (`relaciones.habilidad`) | ×0,8 – ×1,3 | Nivel «para su edad» (0,4 = típico): ×(1 + 0,6 × (nivel − 0,4)). Cada 0,1 por encima suma 0,06. Pesos por acción en la tabla siguiente. |
| **Disposición** de la otra persona (`relaciones.disposicion`) | ×0,75 – ×1,3 | 1 + 0,2 × sociabilidad/50 + 0,05 × optimismo/50 + 0,16 × (agrado − 0,5). El agrado (0 a 1) es lo que encajan el personaje y los **gustos** de esa persona. Con aspecto (ver sección 7), es la atracción completa (50 % rasgos físicos: pelo, ojos, piel y cara; 50 % ejes de carácter que le gustan); sin aspecto, solo el carácter (sin preferencias, 0,5). Frase que se enseña: «Le encanta hablar», «Es de pocas palabras», «Congeniáis de primeras», «No congeniáis de primeras». |
| **Compañía** (`relaciones.compania`) | ×1 – ×1,3 | Solo en lo que hacéis juntos: «Estudiar con…» (área estudio) y «Quedar» / «Hacer planes» (área social). Depende de lo que **sabe hacer la otra persona** en esa área (sección «Ayuda de los demás») y de cuánto os conocéis. No hay perfiles fijos de apoyo: ya no existe «te ayuda en…». |

Habilidades que cuentan en cada acción (pesos que suman 1; el nombre de la habilidad es el de `gen.*`):

| Acción | Habilidades |
|---|---|
| Charlar, Charlar (rival), Hablar | comunicación 0,6; carisma 0,4 |
| Quedar | carisma 0,5; empatía 0,3; comunicación 0,2 |
| Ayudar | empatía 0,5; cooperación 0,5 |
| Hacer planes | carisma 0,5; comunicación 0,5 |
| Tener un detalle | empatía 0,5; creatividad 0,5 |
| Hacer las paces | empatía 0,5; comunicación 0,5 (cuenta en la **probabilidad**, no en la ganancia) |

Las acciones también **entrenan** esas mismas habilidades (columna «Entrena» de la sección 2): hablar mejora el hablar.

### Ayuda de los demás (compañía)

Cada persona tiene una **aptitud** de 0 a 1 en tres áreas (`aptitudDe`, en `contracts/rasgos.ts`; ~0,5 es lo típico), que sale de su carácter, sus intereses y su nivel deportivo. Con los ejes del carácter normalizados a 0–1 (−50 → 0, +50 → 1) y la intensidad del interés entre 0 y 1 (1 a 3 sobre 3), tomando el mayor de los intereses listados:

| Área | Fórmula |
|---|---|
| Estudio | 0,5 × disciplina + 0,15 × ambición + 0,35 × interés (estudio, lectura, tecnología) |
| Social | 0,55 × sociabilidad + 0,25 × optimismo + 0,2 × interés (cine, música, videojuegos) |
| Deporte | 0,6 × nivel de atletismo/100 (20 si no tiene) + 0,4 × interés (deporte, atletismo, fútbol) |

La ayuda es el **+30 % máximo (`AYUDA_MAXIMA`)** × (aptitud − 0,4)/0,4 limitado a 0–1 × afinidad/40 limitado a 0–1. Es decir: hasta aptitud 0,4 (típica o menos) no ayuda (de momento tampoco estorba), con 0,8 ayuda del todo, y cuanto menos os conocéis menos pesa. Cada actividad usa un área: Estudiar con (plan acordado) → estudio; Quedar y Hacer planes → social; entrenar juntos (deporte) pendiente. Un amigo muy estudioso ayuda al estudiar juntos y poco al salir; uno muy sociable, al revés.

## Planes: proponer un día y una hora

Para estudiar (y, más adelante, entrenar) con alguien se le **propone un día y una hora**: «hoy» o «mañana» a las **17:00** (estudiar: 90 min, **en tu casa**). Solo a quien tienes delante (sin teléfono no hay otra forma). La otra persona decide (`responderAPlan`, en `acciones.ts`), en este orden:

| Orden | Regla | Resultado |
|---|---|---|
| 1 | A esa hora tiene **clase, entreno o carrera** (mira su agenda: ocupado o sesión de club/carrera) | no puede |
| 2 | **Otros planes** ese día: tirada estable por persona y día, 25 % (`PLAN.ocupadoPorAzar`) | no puede |
| 3 | **Margen:** tiene un plan contigo el día anterior o el siguiente y la afinidad es menor de 70 (`PLAN.afinidadSinMargen`) | prefiere dejar un día de margen |
| 4 | **Ganas:** acepta si la tirada estable es menor que 0,15 + 0,6 × (afinidad/60, tope 1) + 0,25 × (confianza/100), entre 0,05 y 0,98 | acepta o «no le apetece» |

- Dos planes el mismo día con la misma persona, nunca. Lo propuesto para un día no se vuelve a preguntar ese día.
- Si acepta (+1 de afinidad), el plan queda guardado. **Hay que llegar a tiempo:** la acción «Estudiar con…» está disponible desde la hora acordada hasta 30 minutos después (`PLAN.cortesia`), en el sitio acordado; si no apareces, al acabar el día **pierdes 4 de afinidad y 3 de confianza** (`PLAN.planton`) y se avisa en el diario.
- Proponer para hoy exige 1 hora de antelación (`PLAN.antelacion`: hasta las 16:00).
- Los planes pendientes se ven en el panel «Planes» de «Qué hacer». Se guardan unos días tras cumplirse (para el margen).

## 4. El vínculo

**Estados** (afinidad; el confianza y los contactos recientes se exigen para subir; salir de un estado exige cruzar el umbral con un margen de 8 para que no parpadee):

| Estado | Para entrar |
|---|---|
| Mejor amigo | afinidad ≥ 75 y confianza ≥ 60 (siendo ya amigo) |
| Amigo | afinidad ≥ 40, confianza ≥ 30 y ≥ 3 contactos en los últimos 14 días |
| Conocido | el resto, entre −15 y 40 |
| Antipatía | afinidad ≤ −15 |
| Enemigo | afinidad ≤ −45 |
| Antagonista | afinidad ≤ −75 |

**Enfriamiento sin contacto** (puntos de afinidad al día, pasados los días de gracia; lo negativo solo se suaviza hasta −20):

| Estado | Días de gracia | Por día |
|---|---|---|
| Mejor amigo | 45 | −0,2 |
| Amigo | 21 | −0,3 |
| Conocido | 7 | −0,4 |
| Antipatía, enemigo, antagonista | 30 | +0,15 (hacia −20) |

La confianza baja 0,1 al día tras 30 días sin verse.

**Discutir:** pierde 10 + 4 × agresividad/50 de afinidad (de 6 con un carácter calmado a 14 con uno agresivo), ×1,5 si es el entrenador o el tutor, y 5 de confianza.

**Probabilidad de hacer las paces** (entre 0,08 y 0,85):
`0,35 + 0,15 × (habilidad − 0,4)/0,4 + 0,2 × sociabilidad/50 + 0,15 × optimismo/50 + 0,1 × honestidad/50 − 0,15 × (|nivel| − 1) + 0,2 × (compatibilidad − 0,4)`,
donde `habilidad` es el nivel (empatía y comunicación, 0 a 1) y `nivel` es 1 con antipatía, 2 con enemigo y 3 con antagonista.

**Competiciones:** el entrenador del deporte sube su afinidad contigo 1 por competir y 3 si quedas en el podio; un rival al que ganas te sube 1 y uno que te gana, −0,5. No cuentan como haber estado juntos.

## 5. Un ejemplo

Charlar con un compañero cualquiera a los 8 años: afinidad base 2,5. Compatibilidad típica 0,4 (×0,9), habilidad típica (×1,0) y disposición de una persona normal sin preferencias de carácter (×1,0): sube 2,5 × 0,9 × 1,0 × 1,0 ≈ **2,3**. Con un amigo sociable (×1,2) que comparte tus intereses (×1,3) y un personaje que habla bien (×1,2): 2,5 × 1,2 × 1,3 × 1,2 ≈ **4,7**. Con un solitario (×0,8) con quien casi no compartes nada (×0,75) y un personaje callado (×0,85): ≈ **1,0**.

### Datos de las personas: edad, cumpleaños, altura, colegio y clase

**Todas las personas tienen fecha de nacimiento (y por tanto cumpleaños) y altura** (`nacimiento`, `alturaCm` en `NpcView`; reglas en `contracts/personas.ts`). Pero el personaje solo conoce lo que ve o lo que ha preguntado (`NpcView.sabe`):

| Dato | Qué se ve sin preguntar | Cómo se llega a saber |
|---|---|---|
| **Edad y cumpleaños** | A simple vista, cuánto mayor o menor es respecto a ti (bandas de abajo). La familia (padres y hermanos): edad y cumpleaños exactos | Acción «Preguntar cuántos años tiene y cuándo cumple» (2 min): da los años y el día. En la ficha son **dos datos aparte**: «Edad: 8 años» y «Cumpleaños: 26/04» (día/mes del calendario) |
| **Altura** | Siempre a simple vista respecto a la tuya (bandas de abajo); de la familia, la cifra en cm. **No se pregunta** | — |
| **Profesión** (adultos) | Lo básico a simple vista en el profesorado y los entrenadores («Profesor», «Entrenador»); de los vecinos, nada | Acción «Preguntar a qué se dedica» (2 min); a los profesores, también al ir a su clase; a los entrenadores, al apuntarte a su club. Da el detalle («Profesor de lengua», «Entrenador de atletismo», «Camarero»…) |
| **Lugar de trabajo** (adultos) | Por defecto el del profesorado y los entrenadores: «Colegio Cervantes» o el club. De los vecinos, «Desconocido». Los jubilados no tienen | Acción «Preguntar dónde trabaja» (2 min) |
| **Colegio** | **Solo para niños en edad escolar** (3 a 17 años). **Por defecto**, el tuyo si es compañero («Colegio Cervantes»; alumnos y hermanos en edad escolar). Quien va a otro (rivales, vecinos de 3 a 17 años; nombres provisionales `colegio1`…`colegio4`) es «Desconocido» | Acción «Preguntar a qué colegio va» (2 min) |
| **Clase** | Solo se enseña a los compañeros de colegio. Por defecto, la de tu clase («Tu clase»); la de los demás es «Desconocida». Una clase es **curso + letra**: «3.ºA (tu clase)» la tuya, «3.ºB» los compañeros de `curso_*`, y los demás alumnos de ese curso reparten A/B por hash («3.ºA», «3.ºB»); si no la conoces, «Clase de los de N años» | Acción «Preguntar a qué clase va» (2 min): da curso y letra |

- **Oficios de los vecinos adultos** (`OFICIOS_DE_VECINOS`, por hash del id): dependiente/a (Supermercado), camarero/a y cocinero/a (Restaurante), monitor/a de gimnasio (Gimnasio municipal), oficinista (Oficina del centro), enfermero/a (Hospital), albañil (Obras), taxista (Taxi); a partir de 67 años, jubilado/a. Los padres no tienen profesión de momento.
- Las preguntas se hacen a quien conoces y tienes delante, en su ficha («Qué hacer con…»), fuera de clase o en el recreo; solo se ofrece lo que aún no sabes y lo que aplica. Suben un poco la relación (+0,4 afinidad, +0,2 confianza) pero no cuentan como charla ni como actividad grande.
- Las dos fechas (nacimiento y cumpleaños) usan el año de 365 días del juego. Los padres tienen de 38 a 54 años (salen de la semilla, igual en `familia` y `npcs`); los hermanos, la edad que ya tenían; los compañeros de tu clase, 8 años como tú; el entrenador y el tutor, de 28 a 55/60 años.
- **Altura:** la altura adulta depende de la estatura heredada (hombre 178 ± 7 cm, mujer 165 ± 6,5; de los padres y hermanos, de su herencia; del resto, de un hash de su id) y crece con la edad (fracción de la adulta: 50 % a los 2 años, 66 % a los 6, 80 % a los 10, 94 % a los 14, 100 % a los 18).

| Banda | Edad (diferencia en años) | Altura (diferencia en cm) | Texto |
|---|---|---|---|
| De los tuyos | 0 a 1 | 0 a 3 | «De tu edad, más o menos» / «De tu altura, más o menos» |
| Un poco | 2 a 3 | 4 a 9 | «Un poco mayor/menor que tú» / «Un poco más alto/bajo que tú» |
| Bastante | 4 a 7 | 10 a 19 | «Bastante más mayor/menor…» / «Bastante más alto/bajo…» |
| Mucho | 8 o más | 20 o más | «Mucho más mayor/menor…» / «Mucho más alto/bajo…» |

Pendiente: los cumpleaños como acontecimientos (felicitar, regalos, que te feliciten), y que alguien se fije en tu edad o tu altura.

### Cómo se llama a quien no conoces (según su edad)

Quien no conoces se ve por su aspecto con un nombre que depende de su edad (`nombreSegunEdad`, `EDADES_DE_TRATO`, en `contracts/rasgos.ts`). Sin fecha de nacimiento se usa la edad aparente (`edadAparente`): profesorado y entrenadores 40 años, padres 42, compañeros 8.

| Edad | Chico / chica | Género masculino | Género femenino |
|---|---|---|---|
| menos de 12 | niño / niña | Un niño | Una niña |
| 12 a 25 | chico / chica | Un chico | Una chica |
| 26 a 54 | hombre / mujer | Un hombre | Una mujer |
| 55 a 69 | señor / señora | Un señor | Una señora |
| 70 o más | anciano / anciana | Un anciano | Una anciana |

### Apellidos de la familia

Los padres llevan **dos apellidos cada uno** (los cuatro distintos) y los hijos, **el primero del padre y el primero de la madre** (`apellidosDePadres`, `apellidosDeFamilia`, en `contracts/hermanos.ts`).

### Profesores

Cada profesor da una asignatura (tabla `PROFESOR_DE_ASIGNATURA` en `modules/npcs/src/index.ts`). **Se presenta la primera vez que vas a su clase** (evento `clase.asistida`), así que conoces a tus profesores yendo a clase.

## 6. Dónde cambiar cada número

| Qué | Dónde |
|---|---|
| Ganancia, confianza, duración, coste y entrenamiento de cada acción | `modules/relaciones/src/index.ts` (`accionesDeAmistad`, `hablarConAutoridad`, `saludarRival`, `discutir`, `hacerLasPaces`) |
| Pesos de habilidad por acción, pendiente y topes de la habilidad, pesos de la disposición | `modules/relaciones/src/acciones.ts` (`HABILIDADES_DE_ACCION`, `HABILIDAD`, `DISPOSICION`) |
| Bandas de edad y altura, cumpleaños, estaturas, colegios de fuera | `packages/contracts/src/personas.ts` |
| Aptitudes por área | `packages/contracts/src/rasgos.ts` (`aptitudDe`) |
| Ayuda máxima de la compañía, qué área usa cada actividad | `modules/relaciones/src/index.ts` (`AYUDA_MAXIMA`, `AFINIDAD_AYUDA_COMPLETA`, `AREA_DE_ACCION`) |
| Reglas de los planes (probabilidades, margen, cortesía, plantón) | `modules/relaciones/src/acciones.ts` (`PLAN`, `PLANES`, `responderAPlan`) |
| Castigo por dejar plantado un club (entrenador y equipo) | `modules/relaciones/src/index.ts` (`PLANTON`) |
| Pérdida al discutir, probabilidad de paces, esperas | `modules/relaciones/src/acciones.ts` (`perdidaPorDiscusion`, `probabilidadDePaces`, `ESPERA`) |
| Estados, umbrales y enfriamiento | `modules/relaciones/src/vinculo.ts` (`UMBRALES`, `ENFRIAMIENTO`) |
| Compatibilidad y atracción por gustos | `packages/contracts/src/rasgos.ts` (`compatibilidad`, `factorDeCompatibilidad`, `atraccion`, `EJES`) |
| Horarios y dónde está cada persona | `ANEXO_HORARIOS_PNJ.md` y `packages/contracts/src/agendas.ts` |

Al cambiar cualquiera, ejecutar `npm run sim` antes y después y revisar el área «Social» de la tabla y los tests de `modules/relaciones` y `tests/integracion.test.ts`.

## 7. Reglas decididas y pendientes

**Edad y gustos (decidido con el usuario).** El **aspecto físico cuenta siempre** que corresponda (pesa en la primera impresión, hasta ±0,08 del factor de disposición), pero **no se anuncia** hasta que las dos personas tienen al menos 14 años (`EDAD_ATRACCION_FISICA`): antes, la frase que se enseña sale solo del carácter, así que se nota en la cifra pero no en el motivo. Una cosa es no anunciarse y otra no tenerse en cuenta. Cuándo cuenta y cuándo se anuncia (`usoDelAspecto`, en `acciones.ts`):

| Personaje y otra persona | ¿Cuenta el aspecto? | ¿Se anuncia? |
|---|---|---|
| Los dos de 19 años o menos y alguno de menos de 14 | sí, en silencio | no |
| Los dos de 14 a 19 años | sí | sí |
| Con un adulto (más de 19 años) o con quien no tiene edad (profesorado, entrenador) | **nunca** | no |

La frase anunciada es neutra («Congeniáis de primeras»). La pareja usará esta misma regla (y solo entre edades parecidas).

**Sin teléfono (decidido).** No se puede contactar con quien no está contigo, y tampoco se sabe dónde está. Cuando haya teléfono: llamar, escribir y recibir mensajes.

**Planes (decidido con el usuario; hecho para «estudiar» con compañeros, amigos y hermanos).** «Quedar» y «Hacer planes» siguen siendo inmediatos (un rato con quien tienes delante), pero las actividades largas (estudiar con alguien, y más adelante entrenar con alguien) se **acuerdan**: ver la sección «Planes». Pendiente: el chat/teléfono para proponer a distancia y otros sitios (la biblioteca, si se crea).

**Saludos y otros eventos (apuntado).** Ahora solo hablan contigo si el personaje inicia. Más adelante los demás podrán hablarte: saludarte al verte (eventos), llamarte o escribirte al móvil.
