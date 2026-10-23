# Registro de decisiones

Lo que se decidió y por qué, para que cualquier sesión futura (persona o IA) tenga el contexto.
Añade una entrada nueva al principio cuando tomes una decisión de diseño o de balance.

---

## 23/10/2026 — Diseño de E10: el paso a profesional

- **Pasar a profesional es como subir de categoría:** hay categorías profesionales donde juegan los mejores y se accede a la primera cuando las habilidades permiten ser competitivo en ella.
- **La oferta llega por un ojeador** que ve competir al personaje: el nivel abre la posibilidad, el ojeador la hace realidad. Requiere el sistema de eventos y decisiones.
- **Tres niveles profesionales jugables ya** (no solo como dato), con subida de uno a otro por resultados y nivel.
- **Desde los 16 años, sin límite superior:** si no llega la oferta, sigue en la cantera y puede recibirla más tarde.
- **Aceptar trae más obligaciones, eventos y cosas que hacer.** El personaje puede dejar el colegio, pero si después quiere ser entrenador, agente u otro oficio necesita estudiar, y sin haber terminado el colegio le costará más.
- **Orden de implementación (ajustado el mismo día):** primero se cimienta toda la fase infantil, después se monta el motor completo de eventos y decisiones y solo entonces el nivel profesional. No se hace un motor mínimo antes porque obligaría a una refactorización fuerte. Faltan antes cosas como la genética y la familia.
- **La oferta del ojeador puede no ocurrir y el personaje puede ir a probar por su cuenta.** La subida de nivel profesional no es lineal: a los 16 años se puede ir directamente a élite. Los tres niveles (circuito nacional, internacional y élite) son para atletismo.
- **Titulación en cuatro niveles:** 1 primaria, 2 ESO, 3 bachillerato y 4 universidad. Lo terminado marca lo que cuestan los oficios de después.
- Detalle en `BACKLOG_STATS.md` (E10).

---

## 22/10/2026 — Antes de E10: potencial individual, bots, verano según notas, campeonato y categoría por año de nacimiento

### Tope genético individual por habilidad (E2.7)
- **Cada habilidad tiene un tope genético oculto**, sorteado al crear la partida: media 79 y desviación 9 (la misma distribución que el potencial de los rivales), entre 45 y 100. Cuando haya padres saldrá de la herencia.
- **Por familia:** el 60 % de la genética se comparte dentro de una familia (quien tiene buena genética física la tiene en casi todo lo físico) y el resto es propio de cada habilidad. Familia `fisico`: las 6 capacidades físicas y las 3 habilidades de atletismo. Familia `intelecto`: las 19 asignaturas.
- **El tope hace dos cosas:** ninguna habilidad pasa de él y, **a igual entrenamiento, sube más rápido quien tiene un tope más alto**: velocidad × (tope / 79)², entre ×0,5 y ×1,6 (tope 92 → ×1,36; tope 70 → ×0,79).
- **El jugador no lo ve:** el techo que enseña la interfaz sigue siendo el de la edad y las capacidades. Para pruebas existe `Game.hiddenPotential`.
- **Resultado:** a 10 años ya no todos acaban en el mismo techo (~92): el jugador de 18 años queda en ~82, parecido al potencial medio de los rivales (79).
- **Simulación:** la comparación "el especialista supera al equilibrado" se hace al cabo del primer curso, porque a más años todos llegan a su tope.
- **Efecto secundario:** el balance de estudios baja un poco (equilibrado 68,1 → 61,6; nota media 7,3 → 6,8) porque las asignaturas también tienen tope y velocidad individuales.

### Bots que suben de categoría
- Los bots que entrenan en serio aceptan la propuesta del entrenador cuando está disponible y vuelven a su categoría si sus últimos tres resultados allí son de media tabla para abajo. A 3 años, el bot atleta compite en la categoría superior en 4 de cada 8 semillas.

### Verano según las notas (E9.10)
- **Nota media del curso < 5:** **academia obligatoria** en verano (de lunes a viernes de 10 a 13, una sesión al día). Sesiones exigidas: 25 más 6 por cada punto de nota que falte para el 5 (máximo 45). Cada sesión refuerza las tres asignaturas más flojas. Faltar un día de academia cuenta como falta y sube el estrés. Al terminarla se acaba el castigo (+6 de motivación). **No se repite curso:** si el verano acaba sin terminarla, se empieza el curso con las asignaturas flojas, −8 de motivación y +10 de estrés.
- **Nota ≥ 7,5:** puede pedir a sus padres un **campamento de atletismo** (jornada de 5 horas, una al día, de 9 a 14, ×1,2 de eficiencia, la mejor fuente de mejora y de conocimiento).
- **Entre medias:** **practicar con los amigos** (2 horas al día, menos mejora que entrenar pero baja el estrés y sube carisma y cooperación).
- **Servicio de estudios ampliado** con `summerPath`. Pedir permiso a los padres queda como acción directa hasta que existan la familia (E13.1) y las decisiones (E18).

### Clasificatoria autonómica y final del campeonato (E9.11)
- **Clasificatoria autonómica** (sábado de la semana 25 del curso): 16 corredores (el jugador y 15 de su categoría). Los 8 primeros se clasifican. Ese sábado no hay carrera semanal.
- **Final del campeonato de España** (sábado de la semana 39): 8 corredores, los 7 mejores de la clasificatoria y el jugador si se clasificó; hay medallas (oro, plata y bronce). Quien no se clasifica sigue con su carrera semanal. El campeonato empieza de cero cada curso.
- Dan más motivación y conocimiento que una carrera normal. Se guardan en un historial aparte y no cuentan para la subida de categoría.

### Categoría por año de nacimiento
- **Jugador y rivales tienen fecha de nacimiento** (para calcular la edad exacta y los cumpleaños), pero **lo que cuenta para las categorías y competiciones es el año de nacimiento**, como en la vida real: la edad de competición es el año del curso (el de su inicio, en septiembre) menos el año de nacimiento. Dos niños nacidos el mismo año compiten en la misma categoría aunque uno cumpla años antes, y un día de diferencia en Nochevieja separa dos categorías.
- **Año natural en la partida:** como no hay fechas absolutas, se supone que el curso empieza hacia el 10 de septiembre; el año natural cambia a los 113 días (1 de enero). Las funciones `anioNatural`, `primerDiaDelAnio` y `edadDeCompeticion` están en contracts.
- **La edad de competición no cambia durante el curso** y sube un año al empezar el siguiente. Los servicios `identidad` (`seasonAge`) y `npcs` (`age`) publican esa edad. Los rivales nuevos nacen en un día cualquiera del año que les corresponde, y la población queda exactamente en 8 por edad tras cada relevo.
- Antes se usaba la edad al empezar el curso, y las categorías se vaciaban de rivales con los cumpleaños.

### Respuestas y pendientes
- Pendiente: entrenador del club como personaje (E19.7), becas (hasta que haya sistema monetario) y optimizaciones de rendimiento (~960 ms por año simulado).

### Problemas conocidos
- **Las asignaturas comparten la misma distribución de tope que el deporte** (media 79); quizá convenga otra distinta, que dependa de la inteligencia.
- **Practicar con los amigos sube el atletismo del bot vago** de 0 a ~21 en un año (+10): conviene vigilar que no sustituya a entrenar.
- **A 10 años el bot atleta sube menos al podio que el equilibrado** (35 % frente a 48 %) porque pasa a categorías superiores, donde los rivales son más fuertes. Es el efecto buscado, pero habrá que ver si compensa.
- **El campeonato es único** (autonómico y nacional en dos citas): sin fases intermedias ni niveles distintos por categoría.
- **Cifras finales:** 113 tests; simulaciones de 1, 3 y 10 años con los 13 chequeos en verde.

---

## 22/10/2026 — Cierre de E9: categorías, rivales por edad, asignaturas por etapa y clubes

### Fase 1 — Categorías, rivales y desarrollo con la edad
- **Categorías de la federación española de atletismo** (sub-10, sub-12, sub-14, sub-16, sub-18, sub-20, sub-23, absoluta), como dato en el módulo de atletismo; el personaje compite en la que le toca por edad. Las categorías son un dato por país y deporte (`categories.ts` en contracts).
- **Rivales por edad:** población de 96 NPC (8 por edad, de 8 a 19 años) con fecha de nacimiento. Cada curso se van los de 20 años, algún niño de 13 o menos deja el deporte (10 % por curso) y entran niños nuevos de 8. Los rivales son desconocidos hasta que compiten contra ti y solo entonces aparecen en Relaciones.
- **Desarrollo con la edad, igual para todos:** `madurezPorEdad` (contracts) da la fracción de capacidad adulta alcanzable: 0,38 a los 8 años, 0,52 a los 10, 0,66 a los 12, 0,8 a los 14, 0,93 a los 16 y 1 a los 18. Es el techo de lo físico del jugador (estado oculto `gen.madurez`, con el adelanto o retraso propio) y de sus habilidades de atletismo. El nivel máximo de un rival a cada edad es su potencial × (0,3 + 0,7 × madurez): más plano porque ya llevan años entrenando.
- **Subida de categoría:** el entrenador propone competir en la categoría superior solo si destacas mucho en la tuya (podio en 3 de las últimas 5 carreras, con al menos 4 hechas) y serías competitivo arriba (tu nivel alcanza la mediana de la categoría superior). El jugador acepta con una acción y puede volver a su categoría. Si cambia la categoría por edad, la subida se reinicia.
- **Competir contra mayores desarrolla más:** tras cada carrera, lo que se aprende crece con lo fuertes que son los rivales frente al nivel propio.
- **Los 3 mejores rivales de la categoría corren siempre las primeras 8 carreras en ella;** después la serie de 8 rota.
- **Nuevo chequeo en la simulación:** "Los niños no tienen nivel de adulto" (ningún rival de 11 años o menos pasa de 75).
- **Cifras (un año):** atleta 5 % de victorias y 32 % de podios; equilibrado 21 % de podios. El mejor rival de 11 años o menos acaba en 66,6.

### Fase 2 — Asignaturas por etapa
- **Currículo de España** (`curriculo.ts`, como dato): diez cursos, de 3.º de primaria (8 años) a 2.º de bachillerato, con 19 asignaturas. Primaria: lengua, matemáticas, ciencias naturales, ciencias sociales, inglés, educación física y educación artística. ESO: biología y geología, geografía e historia, tecnología, música (1.º y 2.º) y física y química (desde 2.º). Bachillerato: comunes más una modalidad (ciencias o humanidades).
- **Cambios de etapa:** ciencias naturales pasa a biología y geología, ciencias sociales a geografía e historia, artística a música, y en bachillerato física y química a física y química, historia a historia de España, etc. La asignatura nueva **hereda el nivel** de la que sustituye; las que no tienen antecesora (tecnología, filosofía, economía) parten de un 5. Al empezar curso se avisa de lo que entra y lo que sale.
- **Modalidad de bachillerato:** se elige sola al empezar según las notas (ciencias si las de ciencias superan a las de letras). Decidido que así está bien de momento.
- **Nota inicial:** todas parten de un 5 (nivel 38 a 42). La inteligencia y el trabajo marcan la evolución mediante el ritmo de subida y el techo. No hay ventaja inicial para los inteligentes.
- **Solo puntúan y se estudian las asignaturas del curso;** las demás quedan guardadas.
- **Cada curso exige un poco más:** con el mismo nivel, la nota baja 0,15 por curso (valor a revisar con el balance).
- **Servicio de estudios ampliado** con las asignaturas activas y el nombre del curso; la interfaz muestra el curso y solo las asignaturas del curso. Los controles de los viernes se muestran en tabla.
- **Cifras (un año):** estudios del equilibrado 68,1 (+28,0); empollón 77,0; nota media del equilibrado 7,3 y del vago 6,0.

### Fase 3 — Clubes
- **Módulo nuevo `clubes`:** catálogo de España como dato. Club deportivo del colegio (calidad 1), Club Atletismo Ciudad (calidad 2, desde 10 años y nivel 45) y Club de Alto Rendimiento (calidad 3, desde 14 años y nivel 65). Un club puede ofrecer varios deportes; hoy solo atletismo.
- **Reparto de responsabilidades:** el módulo guarda membresías y calidad. Los deportes ponen el contenido de las sesiones y las pruebas, y piden entrar o salir con los eventos compartidos `club.unirse` y `club.salir`. Servicio `clubes`.
- **Club del colegio:** se empieza sin club y el personaje se apunta los días de clase de 14 a 19 (modo historia). Sesiones los lunes y miércoles de 15 a 17.
- **Sesiones con el club:** 2 horas, una al día, con técnica, ritmo, salida, velocidad, resistencia, coordinación y conocimiento (1,6, la mejor fuente). La eficiencia sube con la calidad: ×1 en el colegio, ×1,12 en el de la ciudad, ×1,25 en el de alto rendimiento.
- **Entrenar por tu cuenta sigue existiendo** pero rinde ×0,85.
- **Pruebas de acceso a los clubes de fuera:** edad mínima y nivel, con algo de azar; si no pasas, no se repite hasta pasadas 8 semanas. Un solo club por deporte. Se puede dejar el club.
- **Clasificación con el club** de cada corredor. Los rivales tienen club (nombres ficticios).

### Respuestas del 22/10 a los problemas y mejoras
- **Potencial individual por habilidad (E2.7), prioritario antes de E10:** ligado al tope hereditario, y la **velocidad de progreso también depende de él**: quien puede llegar a 92 sube más rápido que quien tiene el tope en 70, entrenando igual.
- **Verano según notas y clasificatorias:** se implementan ya. **No se repite curso:** el castigo es la academia obligatoria en verano para sacar los aprobados.
- **Becas:** pendientes hasta que haya sistema monetario.
- **Entrenador de club:** como personaje (NPC), igual que los demás que se añadan.
- **Los bots deben poder subir de categoría** si cumplen las condiciones acordadas.
- **Rendimiento del motor** (de ~330 a ~850 ms por año simulado): revisar optimizaciones a futuro.
- **Fase alfa:** las partidas se crean desde cero; no se mantiene compatibilidad con guardados antiguos.

### Problemas conocidos
- **Saturación a 10 años:** el techo por edad iguala a todo el que entrena (jugador de 18 años ≈ 92 en atletismo), así que el especialista no se distingue del equilibrado y supera a los rivales de 18 a 19 años (potencial medio 79). Se resuelve con el potencial individual (E2.7).
- **Subida de categoría:** no hay penalización por ser más pequeño que los mayores.
- **Edades de los rivales:** el curso dura 364 días y los años de edad 365; puede haber algún rival de más en una edad.

---

## 22/10/2026 — Asignaturas, categorías, rivales, verano y clubes (decisiones de diseño)

- **Asignaturas:** más de tres y cambiantes con la etapa (currículo de España). Todos parten de un 5 de nota; la inteligencia **para su edad** y el trabajo en clase y en casa marcan la evolución.
- **Categorías por edad: las de la federación española,** como dato por país. En edades tempranas pueden salir y entrar niños.
- **Rivales:** nadie llega a un potencial de 90 en tres años; quien destaca sube de categoría (sobre todo en fútbol), y enfrentarse a mayores desarrolla más.
- **Verano según las notas:** academia obligatoria si son malas (permite pasar de curso), campamento del deporte si son buenas (si lo piden a los padres), amigos si son aceptables (no mejoran igual). Prima el rendimiento escolar.
- **Clubes:** clubes en varios deportes, con categorías en cada uno. Primero el club del colegio (entrenamientos de menor nivel); también clubes fuera del colegio, más profesionales.
- **Clasificatorias:** si hay clasificatorio previo se monta; si no, un evento especial.
- Todo está en `BACKLOG_STATS.md`: E6.4, E6.5, E9.4, E9.8 a E9.11 y la épica nueva E19 (clubes); el orden de trabajo se ha revisado.

---

## 22/10/2026 — E9: calendario escolar y temporada implementados

- **Calendario como dato por país** (`packages/contracts/src/calendar.ts`): España por defecto, en semanas desde el inicio del curso (52 por curso, sin fechas absolutas). Trimestres 1.º (semanas 0 a 14), 2.º (17 a 28) y 3.º (30 a 40); Navidad (15 y 16), Semana Santa (29, estimación constante) y verano (41 a 51). Añadir un país es añadir otro dato; elegir país en la partida queda pendiente.
- **`TimeView` ampliado:** curso (`schoolYear`), semana del curso (`schoolWeek`), periodo (`period`), trimestre (`term`), día lectivo (`isSchoolDay`) y semana de evaluación (`isEvaluationWeek`). `isSchoolHours` ahora solo vale en días lectivos.
- **Vacaciones:** no hay clase ni tutorías; sin clase, las pistas, el entrenador y las retransmisiones usan el horario de fin de semana. El motivo se muestra (por ejemplo "Vacaciones de Navidad: no hay clase").
- **Estudios:** controles de los viernes y faltas solo en días lectivos. **Evaluación de fin de trimestre** (semanas 14, 28 y 40): nota media de los controles del trimestre, con consecuencias en motivación (+6 si ≥ 7, −6 si suspendes) y estrés (+8 si suspendes). Al acabar el 3.er trimestre, nota final del curso. Repetir curso y becas quedan pendientes.
- **Atletismo, temporada:** 4 semanas de pretemporada al empezar cada curso (se entrena, sin carreras); carrera los sábados solo en periodo lectivo (unas 34 al año, no 52); sin carreras en vacaciones. Los 3 mejores rivales corren siempre las primeras 8 **carreras** (antes eran las primeras 8 semanas, que con la pretemporada se quedaban en 4).
- **Interfaz:** la cabecera muestra curso, semana del curso y trimestre o vacaciones.
- **Simulación (un año):** los 12 chequeos en verde. Estudios baja en los bots que no estudian fuera de clase (atleta 49,6 → 40,4; vago 45,6 → 37,1) porque hay ~14 semanas sin clase y las asignaturas decaen en verano; el equilibrado casi no cambia (75,4 → 75,1). Carreras: atleta 23 % de victorias y 65 % de podios; equilibrado 16 %.
- **Simulación de tres años** (`npm run sim:largo`, E9.6): chequeos en verde, 336 ms por año simulado. A tres años los rivales alcanzan su potencial y el atleta gana pocas carreras (4 % de victorias, 39 % de podios): conviene revisar la progresión de los rivales para partidas de diez años.
- **Pendiente:** clasificatorias y finales; campamentos y contenido propio de vacaciones; cursos y categorías por edad (E9.4); repetir curso y becas; elegir país.

---

## 22/10/2026 — Visión: tres juegos en uno y orden de trabajo

- **Tres fases:** formación (de niño hasta hacerse profesional), carrera profesional adulta y retiro con reconversión (entrenador, representante...). Cada fase tiene módulos distintos.
- **Foco actual:** que el niño llegue a ser profesional. Después se añaden los módulos de las otras fases y se evolucionan los existentes en clave RPG.
- **El juego debe poder jugarse sin eventos ni decisiones** (aunque sea aburrido). Los eventos aportan interés y sirven de puertas a caminos nuevos, pero no son la base.
- **Calendario cercano a la vida real, con matices:** parón de Navidad y de verano, y una semana de primavera (Semana Santa en España) que cierra el segundo trimestre.
- **Ritmo de juego día a día:** es más fácil reducir a planificación que ampliar a días. Partidas largas, con muchos eventos y decisiones.
- **Calendario:** el curso empieza en septiembre, fechas reales (Semana Santa móvil calculada).
- **Modo historia:** el personaje llega nuevo a la ciudad y a un colegio nuevo sin conocer a nadie; las relaciones sociales se construyen desde cero (hoy todos los NPCs empiezan conocidos).
- **Oportunidad profesional:** entre los 16 y los 18 años según nivel y deporte. **Atletismo primero**, luego el deporte de equipo.
- **Inicio del curso:** segunda semana de septiembre (el día numérico da igual); el día 0 es ese lunes. Calendario como dato por país, con España por defecto.
- **Semana Santa:** estimación constante (semana 29 del curso, entre finales de marzo y principios de abril), igual todos los años, porque el juego no tiene lunas y su año es el año 0. Calendario completo de España, con trimestres, Navidad, Semana Santa y verano, en `BACKLOG_STATS.md` (E9.1).
- **Backlog ampliado** (`BACKLOG_STATS.md`, E9 a E18): calendario, ciclo de vida, ritmo de juego y planificación, salud, mundo social, segundo deporte, interfaz, recursos, técnica y eventos. Los puntos con 🟡 son preguntas abiertas.

---

## 18/10/2026 — E3: identidad del personaje (edad, altura, peso, dominancia y complexión)

Decisiones de alcance: empezar con **8 años** (constante `EDAD_INICIAL` en `modules/personaje/src/identidad.ts`, por si se sube a 10); entrega = identidad + tipo corporal; la UI filtrada por inteligencia (E3.4) queda para después; **sin alimentación**, el cuerpo se deriva de hábitos.
- **Edad:** años decimales = edad inicial + fracción de año aleatoria + días/365. Cumpleaños con aviso en el diario. Cada año simulado sube la edad en 1.
- **Altura:** objetivo adulto de la semilla (media 171, desviación 8; con padres saldrá de la herencia) y curva de crecimiento por edad (73 % a los 8, 100 % a los 18) desplazada por una "madurez" individual de ±1,5 años (hay quien da el estirón antes o después).
- **Peso:** IMC sano por edad más desviaciones por músculo y grasa.
- **Dominancia:** diestro o zurdo (11 %), solo identidad.
- **Complexión:** delgada, normal, atlética, musculosa o con sobrepeso, a partir de dos variables lentas (músculo y grasa, 0..100) que se acercan cada semana (8 %) a lo que dicen los hábitos. Músculo ← minutos de fuerza (gimnasio, etiqueta nueva `fuerza`); grasa ← minutos físicos (más 60 min semanales de juego libre) con la etiqueta `cardio` para rodajes, series y carreras. Sobrepeso ≥ 65 de grasa tras ~6 meses de sedentarismo.
- **Efectos de la complexión** (modificador `gen.complexion` sobre acciones físicas, simplificación de los modificadores por stat del diseño original): musculosa +10 % en fuerza y −5 % en cardio; delgada +5 % en cardio y −10 % en fuerza; atlética +3 %; sobrepeso −10 % de rendimiento y +15 % de coste.
- **Constitución:** sube +1 por semana con hábitos sanos (≥ 120 min de actividad, ≥ 50 h de descanso y estrés < 60), no entrenándola directamente. Crecimiento lento (unos +4 al año); a revisar.
- **Servicio nuevo `identidad`** (contracts): edad, altura, peso, dominancia y complexión. La web lo muestra al principio de la pestaña Personaje.
- **Simulación:** los 12 chequeos en verde (equilibrado 60,5; atleta supera al equilibrado; carreras con podio del 68 % para el atleta). Complexión al cabo de un año: equilibrado, atleta y sobreentrena, musculosa (los bots van al gimnasio casi a diario); aleatorio, atlética; vago, empollón y quien abandona el deporte, con sobrepeso.
- **Pendiente:** los bots entrenan fuerza a diario (más de 10 h semanales): poco realista para niños, pero útil como extremo. Edad y complexión aún no afectan a la caída ni al crecimiento de stats (eso vendría con los modificadores por edad). Alimentación como decisión. E3.4 (UI filtrada por inteligencia).

---

## 18/10/2026 — Conocimiento: todo entrenamiento suma; la tele no sustituye

Ajuste de lo anterior tras revisar que solo el rodaje largo subía el conocimiento.
- **Todo entrenamiento de atletismo suma conocimiento** (se hace con entrenador, sobre todo siendo niños): series 0,8, rodaje largo 1, técnica 1,2. Competir sigue en 2. El gimnasio (entrenamiento general, no de atletismo) no suma.
- **Ver atletismo en la tele baja de 1,5 a 0,6:** ayuda a entender el deporte pero no sustituye a entrenar ni a competir. Un jugador que solo ve la tele llega a ~27 en un año; el equilibrado, a ~64; el atleta, a ~77.
- **Atención e inteligencia pesan más** en el ritmo de subida (0,6 → 0,9 y 0,4 → 0,6). La relación con el entrenador ya mejora la eficiencia de todo lo etiquetado `atletismo` (modificador `npcs.apoyo`), así que también acelera el conocimiento.
- **Simulación:** los 12 chequeos en verde; sin cambios apreciables en atletismo ni estudios.
- **Pendiente (nivel inicial de los demás niños):** hoy los rivales arrancan con un nivel medio de 29 (hasta 54) en la escala de rendimiento; a los 10 años no debería haber nadie con nivel muy alto si sus padres no han practicado el deporte. A revisar con la herencia familiar y la edad: nivel inicial según la práctica deportiva de los padres, y potencial según la genética.

---

## 17/10/2026 — Rivales persistentes y clasificación de la carrera

Motivo: competir contra 3 NPC y 4 corredores inventados en cada carrera era plano; no había forma de saber si mejorabas respecto a alguien concreto.
- **16 rivales NPC persistentes** (`rival_1` a `rival_16`, módulo `npcs`), con nombre y género. Con 16 queda margen para lesiones, clasificatorias y rotaciones futuras.
- **Series de 8 corredores** (el jugador y 7 rivales, no corren los 16). Las primeras 8 semanas corren siempre los 3 mejores rivales (cabezas de serie, por nivel en ese momento); después las plazas rotan entre todos, con más probabilidad para quien lleva más semanas sin correr (peso 1 a 5). Se puede repetir de una semana a otra. Sin el módulo de NPCs, atletismo completa la serie con corredores genéricos.
- **Rivales paralelos, no adaptativos:** cada uno progresa por su cuenta (nivel inicial, potencial y ritmo de progreso propios), sin mirar lo que haga el jugador. No tiene por qué ser el mejor quien más entrena.
- **"Herencia":** el potencial sale de una normal (media 79, desviación 9, entre 55 y 99); el nivel inicial depende de él (media 29, +0,35 por cada punto de potencial sobre 79); el ritmo de progreso (×1 de media, entre 0,55 y 1,5) es su constancia. Unos nacen con ventaja y otros con más techo.
- **Resultado visible:** `ctx.log` admite una tabla opcional (`LogTable`, en contracts). Atletismo publica la clasificación completa (posición, nombre, tiempo y diferencia con el 1º) y la web la muestra en el resultado y, desplegable, en el Diario. Cualquier deporte nuevo puede usarla.
- **Nuevo chequeo en la simulación:** "Las carreras son una competición real" (el atleta gana < 60 % de las carreras, sube al podio algunas veces y supera al equilibrado).
- **Simulación (5 semillas, un año):** atleta, 26 % de victorias y 73 % de podios; equilibrado, 20 % de podios; los 12 chequeos en verde. Con series de 8 la probabilidad base de podio sube a 3/8, así que se subió el nivel de los rivales dos veces (media de potencial 72 → 75 → 79) hasta que el atleta dejó de dominar. La variación entre semillas es grande a propósito (cada partida tiene su grupo de rivales).
- **Partidas antiguas:** conservan sus 3 rivales; los 16 aparecen al empezar una partida nueva.
- **Pendiente:** el azar de los rivales comparte el generador de la partida, así que lo que haga el jugador altera sus tiradas aunque su ritmo sea independiente; rivalidades y eventos con rivales concretos; lesiones y clasificatorias; la pestaña Relaciones muestra el nivel exacto de cada rival (a futuro, filtrado por inteligencia, E3.4).

---

## 17/10/2026 — Conocimiento del deporte (atletismo)

Adapta E2.3 del backlog: en el diseño original el conocimiento era un **techo** de las habilidades; aquí es un **bonus/malus** aparte que no toca la skill.
- **Nueva categoría de stat `conocimiento`** (contracts). Progresa como una habilidad, pero no cuenta como habilidad en las áreas de la simulación.
- **`atletismo.conocimiento`:** arranca en 0 (no conoce el deporte). Sube más rápido con atención (0,6) e inteligencia (0,4). Decay muy suave: 30 días de gracia, 0,3 % diario, suelo al 95 % del máximo alcanzado.
- **Efecto:** modificador `atletismo.conocimiento` sobre entrenar y competir, de ×0,90 (conocimiento 0) a ×1,15 (100). Afecta a lo que ganas entrenando y al "día" en la carrera, no a las habilidades directamente.
- **Fuentes de subida:** competir (2), ver atletismo en la tele (1,5; una vez al día, entre semana de 18 a 23 y fines de semana de 10 a 23; también entrena atención), rodaje largo (0,5, parte táctica).
- **Ritmo de subida ajustado con la simulación:** con 0,6 un jugador que veía la tele a diario llegaba a 96 en un año; con 0,15 llega a ~63 (el que solo entrena y compite, a ~14; quien deja el deporte se queda en ~14).
- **Bots:** equilibrado y atleta ven la tele una vez al día. Los demás no (el vago no la elige: no lleva etiqueta de ocio a propósito).
- **Efecto en la simulación:** los 11 chequeos en verde. Equilibrado: atletismo 67,5 → 67,2 y estudios 76,7 → 75,4 (ver la tele le quita tiempo de estudio). Resto sin cambios apreciables.
- **Pendiente:** hablar con el entrenador no sube el conocimiento (el módulo de NPCs no puede referenciar stats de un deporte; hace falta un canal por etiquetas); usar el conocimiento para lecturas de "quién sale mejor" y opciones tácticas (necesita el sistema de decisiones); el segundo deporte definirá su propio conocimiento.

---

## 17/10/2026 — E1.4 (conexión de stats nuevas) y PWA

### Stats nuevas conectadas
Se mantiene la suma de pesos de antes (ritmo de subida y techo); solo cambia el reparto. Cuando se implementen las edades se podrán añadir modificadores.
- **Atletismo** (cada una conserva `determinacion` 0,2 de ritmo y 0,15 de techo; el techo pesa la mitad que el ritmo):
  técnica ← coordinación 0,4 + agilidad 0,2 · ritmo ← resistencia 0,4 + inteligencia 0,2 · salida ← velocidad 0,4 + fuerza 0,2.
- **Estudios** (ritmo suma 1; techo suma 0,45 con el mismo reparto):
  matemáticas ← inteligencia 0,5 + concentración 0,5 · lengua ← inteligencia 0,35 + comunicación 0,35 + concentración 0,3 · ciencias ← inteligencia 0,4 + atención 0,3 + creatividad 0,3.
- **Qué entrena a los nuevos:** ir a clase → atención · estudiar lengua → comunicación · estudiar ciencias → creatividad · hablar con el entrenador y tutoría → comunicación (+ carisma) · quedar con un compañero → carisma, empatía y cooperación · perder una carrera → resiliencia (+0,8; ganar, +0,2).
- **Sin fuente de subida todavía:** `constitucion` (E3), `autoridad` y `picardia` (necesitan eventos/decisiones).

### Simulación antes/después de E1.4
Los 11 chequeos siguen en verde. Estudios baja algo: equilibrado 80,2 → 76,7 y empollón 89,4 → 84,6 (nota media 8,5 → 8,2 y 9,4 → 9,0). Causa: las asignaturas dependen ahora de stats que arrancan igual de bajos pero se entrenan menos que la concentración. Atletismo apenas varía (±1). No se ajusta ahora; revisar si al implementar edades se mueve más.

### PWA
- La web ya es instalable: manifiesto (`apps/web/public/manifest.webmanifest`), iconos (192, 512, maskable y Apple), service worker (`sw.js`, red primero para la página y copia guardada para el resto, funciona sin conexión) y registro solo en producción.
- Verificado en Chromium contra la compilación de producción: service worker activo, manifiesto e iconos con 200.
- Al cambiar `sw.js` hay que subir `VERSION` para limpiar la caché antigua.
- Pendiente: app nativa con Capacitor (no necesaria para instalar desde el navegador).
- **Publicación automática:** `pages.yml` se lanza en cada push a `main` (además de a mano). Antes había que lanzarlo a mano tras cada fusión.

---

## 17/10/2026 — Ampliar características (decisiones previas)

Se estudian los documentos de diseño de la versión Godot para enriquecer al personaje. No es una migración: es un catálogo adaptable. Backlog en `BACKLOG_STATS.md`.
- **Ids en español**, sin adoptar la regla de ids en inglés del original.
- **`trabajo_equipo` se elimina** (choca con una habilidad del fútbol) y se sustituye de forma provisional por `cooperacion`.
- **`memoria` → `inteligencia`** y **`disciplina` → `determinacion`**; se añaden constitución, agilidad, resiliencia, atención, creatividad, comunicación, autoridad, empatía y picardía.
- **El rendimiento académico se queda en `estudios`**, no es stat global.
- **Implementado E1.1 y E1.2:** 19 genéricas en total (6 físicas, 6 mentales, 6 sociales con `cooperacion` provisional) y 4 de estado. El modificador `gen.disciplina` pasa a `gen.determinacion` con el mismo efecto (menos coste de energía en entrenar y estudiar).
- **Simulación antes/después:** los 11 chequeos siguen en verde. Las medias "Global", "Mental" y "Social" bajan unos 5–10 puntos porque los 11 stats nuevos aún no se entrenan ni influyen en nada (se conectan en E1.4); no es un cambio de balance. Estudios y atletismo apenas varían (±1 punto).
- `constitucion` no tiene aún forma de subir (se forjará con hábitos, E3).

---

## 17/10/2026 — Base del proyecto

### Diseño de juego
- **RPG de decisiones**, no de acción. Un personaje en edad escolar estudia, practica un deporte y se relaciona.
- **El tiempo es de juego, no real.** Cada acción declara su duración en minutos de juego. La partida empieza un lunes a las 7:00.
- **Primer deporte: atletismo (400 m)**, elegido por ser el más sencillo de modelar (individual, sin posiciones ni tácticas). Es la plantilla para los siguientes deportes.
- **NPCs desde el MVP**, aunque sencillos. Dan profundidad y ya tienen utilidad: con afinidad ≥ 40 mejoran las acciones con las etiquetas que apoyan. Tienen género para concordar los textos.
- **Plataforma objetivo:** móvil, con versión web/PC. Interfaz web mobile-first, empaquetable con Capacitor más adelante.

### Técnica
- **TypeScript** en monorepo con npm workspaces. Un único lenguaje para motor, interfaz, tests y simulación.
- **Regla de oro:** un módulo solo importa `@ds/contracts`. Lo vigila `tests/arquitectura.test.ts`.
- **Unificadores** para que dividir mucho no implique lentitud: registro compilado, pipeline único de acciones, modificadores por etiquetas, eventos compartidos y servicios. Detalle en `ARQUITECTURA.md`.
- **Guardado:** un único JSON. Las stats y los módulos nuevos se inicializan solos al cargar una partida antigua.
- **Azar determinista** con semilla guardada, para que tests y simulaciones sean reproducibles.
- **Recursos (`resource: true`):** solo la energía cuenta como coste que bloquea acciones. Antes cualquier delta negativo bloqueaba, y bajar el estrés cuando ya estaba a 0 impedía descansar; lo detectaron los tests.

### Rendimiento
- Los contextos de lectura se crean una vez por módulo y se reutilizan: de 0,66 ms a 0,11 ms por acción.
- Referencia actual: un año simulado tarda unos 200 ms.

### Balance (primer ajuste con la simulación)
Problemas detectados por los bots y cómo se corrigieron:

| Problema | Ajuste |
|---|---|
| Progresión demasiado rápida (+72 de atletismo en un año, podio en 51 de 52 carreras) | Ritmo de habilidades 1 → 0,5 y de genéricas 0,6 → 0,3 |
| Estrés siempre a 0 y salud siempre a 100, incluso sobreentrenando | Dormir baja menos el estrés; estudiar y competir lo suben más; entrenar con sobrecarga resta salud y puede causar molestias |
| Ir a clase sin estudiar ya subía mucho las asignaturas | La clase entrena 0,5 por asignatura (antes 1) |
| Podio trivial: solo 3 rivales NPC | Carreras de 8 corredores (NPCs + rivales genéricos de relleno) |
| La salud baja solo afectaba a lo físico | Ahora reduce el rendimiento de todo |
| Bot empollón quemado (estrés 90, salud 0) | Era el bot: hacía ocio solo después de estudiar. Se corrigió el bot, no el juego. Conclusión válida: estudiar sin descanso es contraproducente |

Resultado: los 11 chequeos de sentido del juego en verde. Resumen del año simulado:
- El equilibrado tiene la mejor puntuación global.
- Cada especialista gana en lo suyo.
- Sobreentrenar rinde un 14 % menos y deja la salud en 2.
- El vago queda último.
- Dejar el deporte cuesta un 29 %.

---

### 23/10/2026 — Familia y genética (E8 y E13.1, primera parte)

- **Herencia por capacidad:** el tope genético del personaje sale de los **topes** de sus padres (no de su nivel): 60 % de un progenitor y 40 % del otro, al azar cuál por capacidad, más una variación del 7 % propia. La distribución general se mantiene (media ~79, desviación ~8,5).
- **Parte compartida por familia** en cada progenitor sube de 0,6 a 0,85: al mezclar dos padres la correlación entre capacidades de una misma familia se diluye, y así el hijo conserva ~0,4.
- **Módulo `familia`** (padre y madre): nombre, edad, altura, deporte practicado, apoyo, expectativas y tiempo en casa. Estos tres valores no hacen nada aún; los moverán los eventos y decisiones. Su genética la guarda el motor (`state.lineage`), no el módulo.
- **Práctica deportiva de los padres** según su tope físico (profesional, federado, aficionado o ninguna); lo más frecuente es que no hayan practicado deporte.
- **Rivales con padres completos:** cada uno tiene padre y madre (nombre, tope de atletismo, práctica). Su tope sale de los suyos y su nivel inicial se multiplica por entre 0,95 y 1,10 según lo que practicaron. La simulación sigue en verde (13 chequeos).
- **El jugador ve la genética mientras dure la fase de pruebas** (tabla de topes y datos de los padres); se oculta al pasar a beta cambiando `MOSTRAR_GENETICA`.
- Aparcado: modo historia (cuando la base funcione bien), y salud, alimentación y lesiones (dependerán de eventos).

### 23/10/2026 — Nueva épica E20: Relaciones

- Hoy cada NPC tiene una sola interacción (quedar o hablar) y una cifra de afinidad. Para tener amistades profundas, pareja e hijos hace falta un sistema de relaciones de verdad, así que se registra la épica **E20** en `BACKLOG_STATS.md`: modelo de relación con tipos y estados, acciones variadas, mantenimiento por vínculo, personalidad de los NPCs, pareja, hijos y familia propia.
- Las partes que necesitan eventos (declararse, rupturas, hijos) esperan al motor de eventos (E18). La base se puede hacer con acciones.
- **Respuestas del mismo día:** módulo `relaciones` aparte de `npcs`; los tipos de vínculo propuestos y la pareja a partir de los 14 años; el vínculo se ve como un estado (los umbrales numéricos solo durante el desarrollo, se ocultan en beta); los NPCs viven su propia vida (relaciones entre ellos, cambios de club y de ciudad).

### 23/10/2026 — E20 fase 1: módulo `relaciones`

- **Escala de −100 a 100 con el 0 como "conocido".** Estados: antagonista (−3), enemigo (−2), antipatía (−1), conocido (0), amigo (1), mejor amigo (2). Entrar en un estado exige cruzar su umbral; salir exige cruzarlo con 8 puntos de margen (histéresis). Amigo pide además confianza ≥ 30 y 3 contactos en 14 días; mejor amigo, afinidad ≥ 75 y confianza ≥ 60.
- **Enfriamiento:** lo positivo cae hacia 0 tras unos días sin verse (conocido 7 días a 0,4 por día, amigo 21 a 0,3, mejor amigo 45 a 0,2); lo negativo solo sube hasta −20 (primera antipatía, tras 30 días) y no vuelve a conocido sin reconciliarse. La confianza cae a 0,1 por día pasados 30 días.
- **Arranque en 0:** el reparto ya no empieza con afinidad de 15 a 35. El apoyo (afinidad ≥ 40) tarda unos pocos contactos más en activarse; la simulación sigue en verde.
- **Migración desde `npcs`:** afinidad, acciones de relación y apoyo salen de `npcs` (ahora solo población y rivales) y viven en `relaciones`. `NpcView.affinity` desaparece; se consulta el servicio `relaciones`. El vínculo solo se guarda cuando hay contacto o un cambio; el resto es "conocido" implícito, así que las partidas nuevas empiezan con el estado vacío.
- **Interfaz:** muestra el estado de cada persona (concordado en género); las cifras salen solo si `MOSTRAR_RELACIONES` está activo.

### 23/10/2026 — Herencia rehecha con el modelo de Godot (E8, E2.7, E2.3)

Tras revisar el documento de arquitectura y el código de Godot (`family_generator.gd`), se rehace la herencia que se había hecho antes con otro modelo (mezcla 60/40 con familias correlacionadas, tope medio 79).

- **Padres con perfil:** cuatro bandas fijas (débil 35–50, normal 50–70, fuerte 70–85, destacado 85–95) y la dificultad cambia cuántas capacidades caen en cada una (normal: 0–1 débiles, 1–2 fuertes, 0–1 destacadas). Cada capacidad se tira por separado, sin correlación entre las de un mismo padre. Así los padres ya no son planos ni de media 80: el tope típico es ~62.
- **Herencia de UN padre por capacidad, sin punto intermedio:** de las 18 capacidades, 9 vienen del padre y 9 de la madre (al azar cuáles) y cada una toma el tope de ese padre ±20 %. Si un padre es muy fuerte y la madre muy débil, el hijo sale fuerte o débil, no intermedio. Se mantiene ±20 % de momento y se valorará si es demasiado.
- **Todas las genéricas heredan** (físicas, mentales y sociales). Las asignaturas y las habilidades de atletismo **no se heredan**: su tope es la media ponderada de los topes de las genéricas que las apoyan más una aptitud propia (±10 % las asignaturas, ±15 % las habilidades). Los `apoyos` de las asignaturas se afinan (opción B): Educación física con coordinación, agilidad, resistencia y determinación (sin velocidad); empatía en Sociales, Historia, Historia de España y Filosofía; picardía en Economía; determinación en Matemáticas, Física, Química, Física y química y Latín; carisma en Lengua e Inglés. Nunca depende de las notas de los padres.
- **El nivel inicial de las genéricas sale de los padres**, igual que en Godot: el mismo progenitor del que hereda el tope, por un factor de herencia (0,7 a 0,9) y ±20 %, escalado al rango inicial de la genérica (30 a 50). Así no hace falta otro método para generar hijos.
- **Escala:** se adopta la de Godot (tope típico 62, máximo 95, mínimo 10). Como el ritmo de subida y los rivales se diseñaron con topes de ~79, se recalibra: el ritmo se multiplica por 0,8 (`ESCALA_DE_RITMO`) y la referencia pasa de 79 a 62; el ritmo de las habilidades de atletismo baja de 0,5 a 0,36 (con los topes más bajos se acercaban al techo demasiado deprisa); el desarrollo de los rivales sube de `0,3 + 0,7 × madurez` a `0,45 + 0,55 × madurez`. En el primer curso el atleta sube al podio el 35 % de las carreras y el equilibrado el 30 % (antes 11 %): más competitivo, no dominante. **Las notas bajan**: la media del equilibrado pasa de 7,2 a 6,2, porque el tope de las asignaturas (derivado de las genéricas) ronda 62 en vez de 79. Es consecuencia de la escala y habrá que valorar si se quiere subir el tope típico de las asignaturas. **Pendiente de valorar:** a 3 y 10 años los 13 chequeos siguen en verde, pero el jugador que entrena a diario sube al podio en el 67 a 77 % de las carreras (a 10 años, el atleta gana el 47 %). Los rivales se quedan por debajo de quien entrena a diario; hay que decidir si es lo que se quiere (para ser profesional hay que destacar) o si los rivales deben crecer más deprisa. **Respuesta del usuario (mismo día):** no se toca el balance ahora; entrenar a diario no será gratis: habrá lesiones y otras consecuencias (E12) y las vacaciones permitirán compensar parte de lo no entrenado con el bonus de verano por buenas notas (campamento). Se revisa cuando estén esas piezas.
- **Conocimiento, aclaración:** no hay techo duro. El malus ya hace que quien tiene una velocidad espectacular pero ningún conocimiento rinda menos que otro con menos velocidad y mucho conocimiento (ejemplo: velocidad 80 sin conocimiento rinde 56,3 y velocidad 65 con conocimiento al máximo, 58,9, con las demás habilidades iguales).
- **Conocimiento del deporte:** actúa como **malus o bonus sobre las habilidades que dependen de entender la carrera**, no sobre lo físico: quien conoce poco falla en colocación, ritmo y salida (×0,85) y quien lo conoce a fondo saca más de lo que da su cuerpo (×1,15). La velocidad y la resistencia no cambian. La sensibilidad es 1 para ritmo y salida y 0,5 para técnica. Sigue habiendo un efecto leve en la eficiencia de entrenar y competir (×0,90 a ×1,15).
- **Crecimiento del conocimiento:** cualquiera puede llegar a 100, pero rápido al principio y cada vez más despacio (tasa 0,3 y curva 2,5): la primera carrera da cerca de 1 punto y a 70 puntos ver atletismo en la tele da menos de 0,02. Con un bot que entrena a diario llega a ~57 el primer año, ~77 el tercero y ~90 el décimo.
- **Pendiente de decidir:** el usuario se inclina por un **techo duro** del conocimiento, pero su propia explicación (no te hace más lento, fallas la colocación, el experto clava el ángulo) describe un malus/bonus. Un techo duro tal cual (`min(tope, conocimiento × 1,2)`) bloquearía a quien empieza con conocimiento 0, así que no se ha implementado; si se quiere, la alternativa es un techo suave (tope ×0,75 sin conocimiento hasta ×1,0 con él).
- **Lo que se mantiene de antes:** altura heredada como media de los dos padres, práctica deportiva de los padres según su tope físico medio y ventaja de partida de los rivales por criarse entre zapatillas. La dificultad al crear la partida queda para cuando todo esté estable (los recuentos de `facil` y `dificil` ya están como dato).

## Pendiente e ideas

- **Consecuencias de la salud muy baja:** ahora el bot que sobreentrena llega a salud 0 sin más castigo que rendir menos. Idea: lesión o baja médica que bloquee entrenar unos días.
- **Segundo deporte:** validará que la plantilla de deporte funciona sin tocar el motor.
- **Más vida para los NPCs:** eventos, conversaciones, rivalidades (los 16 rivales de atletismo ya existen y progresan; falta que sean personajes con historia).
- **Plan de características, personalidad y perks:** ver `BACKLOG_STATS.md`. E1 y E3 (menos E3.4) hechas; siguiente paso a decidir: el sistema de eventos y decisiones, que desbloquea personalidad, perks, autoridad, picardía y las lecturas tácticas.
- **Modificadores por edad:** la edad ya existe pero no afecta a la subida ni a la caída de stats (decay por edad, ritmo de crecimiento; E2.6).
- **Alimentación y lesiones:** el peso y la complexión dependen solo de hábitos de actividad; falta alimentación como decisión y lesiones ligadas a la constitución.
- **UI filtrada por inteligencia (E3.4):** hoy la identidad y las stats se ven siempre con todo detalle.
- **Beca deportiva:** usar el servicio `estudios` (nota media) desde un deporte.
- **App nativa en el móvil:** la PWA ya se instala desde el navegador; Capacitor solo si hace falta tienda de aplicaciones.
- **Acciones de GitHub:** actualizar versiones cuando GitHub retire Node 20 en los runners (ahora sale un aviso, no un error).
