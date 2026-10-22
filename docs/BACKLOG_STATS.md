# Backlog — Stats, habilidades, personalidad y perks

Origen: documentos de diseño del proyecto Godot (`design_stats_personality_system.md` v0.2 y
`cambios_tecnicos_arquitecto_equipo1.md`). **No es una migración 1:1**: es un catálogo de lo que
habría que cambiar para adoptar ideas de ese diseño en este motor. Cada épica indica cuánto
conviene respetar el original (**Fidelidad**) y debe revisarse antes de empezar (ver al final).

Leyenda de estado: 🟢 listo para empezar · 🟡 necesita decisión · ⏸ diferido (depende de algo que no existe) · ❌ descartado

## Visión del juego: tres juegos en uno (decidido el 22/10/2026)

| Fase | Qué es | Módulos |
|---|---|---|
| 1. Formación | De niño (8 años) hasta tener la oportunidad de ser profesional y decidir serlo. **Es el foco actual.** | Lo que ya hay: personaje, estudios, atletismo, NPCs |
| 2. Profesional | La carrera como adulto: club, contratos, competición de élite. | Módulos nuevos |
| 3. Retiro | Reconversión a un trabajo ligado al deporte (el suyo u otro): entrenador, representante... | Módulos nuevos, cada uno distinto |

- **Orden de trabajo:** primero que el niño llegue a ser profesional; después se añaden los módulos de las fases 2 y 3 y se evolucionan los existentes en clave RPG.
- **Los eventos y decisiones no son lo primero.** El juego debe poder jugarse sin ellos (aunque sea aburrido): los eventos aportan interés y sirven de puertas a caminos nuevos, no son la base.
- **Calendario cercano a la vida real, con matices:** parón en Navidad y en verano, y una semana de primavera que cierra el segundo trimestre (la Semana Santa en España; hay que ver qué equivalente tiene en otros países).

### Respuestas del 22/10/2026

- **Ritmo de juego: día a día.** Es más fácil reducir a planificación después que ampliar a días. Las partidas serán **largas**, lo que implica muchos eventos y decisiones.
- **Calendario:** el curso empieza en septiembre, con fechas reales (Semana Santa móvil calculada).
- **Modo historia:** el personaje llega nuevo a la ciudad y empieza en un colegio nuevo, sin conocer a nadie. Obliga a desarrollar las relaciones sociales desde cero (ver E13).
- **Oportunidad profesional:** entre los 16 y los 18 años, según nivel y deporte.
- **Inicio del curso:** la segunda semana de septiembre (el día numérico concreto da igual). El día 0 de la partida es el lunes de esa semana.
- **Calendario por país:** hoy solo España, pero el calendario debe ser un dato por país (inicio, vacaciones, semana de primavera, fin de curso) para poder elegirlo en el futuro.
- **Semana Santa:** en España es el primer domingo tras la primera luna llena posterior al equinoccio de primavera (entre el 22 de marzo y el 25 de abril). El juego no tiene lunas y el año de la partida es el año 0, así que se usa una **estimación constante**, igual todos los años y marcada como tal.
- **Deporte de la fase 1:** atletismo primero; el deporte de equipo (fútbol, E7) después como segundo deporte.

### Respuestas del 22/10/2026 (2): asignaturas, categorías, rivales, verano y clubes

- **Asignaturas:** más de tres, que cambian con la etapa (ciencias naturales pasa a biología, ciencias sociales a historia, unas salen y otras entran). El currículo es el de España. Un niño no empieza con nota baja salvo que su inteligencia sea baja **para su edad**: todos parten de un 5 y el trabajo en clase y en casa, con bonus o malus de inteligencia y de otras skills, marca la evolución (o parten con ligera ventaja si son inteligentes).
- **Categorías por edad: las de la federación española** (ligadas a España, como el calendario). En edades tempranas puede desaparecer algún niño y entrar otro nuevo.
- **Rivales:** un niño no puede alcanzar en tres años un potencial de 90. Si uno destaca, lo lógico es que **suba de categoría** (sobre todo en fútbol: a los 9 años contra niños de 12). **Cuanto mayor es el rival contra el que se enfrentan, más se desarrollan.**
- **Clasificatorias:** si hay un clasificatorio previo se monta; si no, un evento especial.
- **Verano según las notas:** notas malas, academia obligatoria (permite pasar de curso); notas buenas, pueden pedir a los padres un campamento del deporte que practican (mejoran más); notas aceptables, juegan o practican con amigos (no mejoran igual). Se prima así el rendimiento escolar.
- **Clubes:** habrá clubes en varios deportes y un club puede tener categorías en distintos deportes. Primero se une al **club del colegio** (entrenamientos de menor nivel); hay también clubes fuera del colegio, más profesionales.

## Notas de la fase alfa

- **No se mantiene compatibilidad con partidas guardadas:** se crean partidas desde cero sin problema (las antiguas cargan, pero sin rivales por edad ni algunas novedades).
- **Bachillerato:** la modalidad se elige sola según las notas, de momento.
- **No se repite curso:** el castigo de las notas malas es la academia obligatoria en verano. Las becas esperan a que haya sistema monetario (E16).

## Decisiones ya tomadas (17/10/2026)

- Ids en **español** (`gen.fuerza`). La regla de ids en inglés del documento original no se adopta.
- `trabajo_equipo` se elimina (choca con una habilidad técnica del fútbol). Se sustituye de forma **provisional** por `cooperacion`.
- `memoria` → `inteligencia`; `disciplina` → `determinacion`. El resto de cambios del documento de stats se aceptan.
- `rendimiento_academico` **no es stat global**: lo gestiona el módulo `estudios` (regla 4 y 5 del `CLAUDE.md`).

## Hecho fuera del plan original

- **Conocimiento del deporte** (adapta E2.3), **PWA**, **16 rivales persistentes con herencia**, **series de 8 con rotación** y **clasificación con tablas** tras cada carrera. Detalle y cifras en `DECISIONES.md`.
- Para E7 (deportes de equipo) y E8 (dinastía): la plantilla de competición ya tiene rivales con herencia propia, tabla de resultados y rotación de series.

## Estado de partida (antes de empezar)

9 genéricas (fuerza, resistencia, velocidad, coordinación / concentración, memoria, disciplina / carisma, trabajo en equipo)
y 4 de estado (energía, salud, estrés, motivación). Usos de las que cambian: `disciplina` (atletismo ×2, estudios ×2,
personaje ×2 incluida la acción `gen.disciplina`), `memoria` (estudios ×3, personaje ×1), `trabajoEquipo` (estudios ×1, npcs ×1).

---

## E1 · Genéricas ampliadas — 🟢 · Fidelidad: alta

Lista objetivo (17 + 1 provisional; el documento dice "20" pero suma 6+6+5+1 = 18 con el académico):

| Grupo | Stats |
|---|---|
| Físicos (6) | velocidad, fuerza, resistencia, **constitucion**\*, **agilidad**\*, coordinacion |
| Mentales (6) | **inteligencia**\*, concentracion, **determinacion**\*, **resiliencia**\*, **atencion**\*, **creatividad**\* |
| Sociales (5+1) | carisma, **comunicacion**\*, **autoridad**\*, **empatia**\*, **picardia**\*, **cooperacion** (provisional) |

\* nuevo o renombrado.

| ID | Tarea | Notas |
|---|---|---|
| E1.1 ✅ | Añadir los ids nuevos a `GEN` (contracts) y declararlos en `modules/personaje` con descripción en español | Concordar textos; `constitucion` no se entrena directamente (ver E3) |
| E1.2 ✅ | Renombrar `memoria→inteligencia`, `disciplina→determinacion`, `trabajo_equipo→cooperacion` en atletismo, estudios, personaje, npcs y tests | Revisar la acción `gen.disciplina` de personaje: Resuelto: era un modificador, pasa a `gen.determinacion` con el mismo efecto |
| E1.3 | Decidir si los renombrados migran partidas guardadas o se rompe compatibilidad | Aún no hay partidas publicadas → recomendado romper |
| E1.4 ✅ | Reenganchar `speedFrom` y `cap.from` de atletismo y estudios a los stats nuevos | Hecho con una tabla propia para atletismo y estudios (ver `DECISIONES.md`). La tabla completa (E2.4) sigue abierta. Con edades se podrán añadir modificadores |
| E1.5 | Ajustar el decay por categoría: mentales sin decay práctico, sociales por falta de interacción, físicos los más sensibles | Ahora todos decaen por días sin practicar. Ver E2.6 |
| E1.6 | Mostrar los grupos nuevos en la web y en los tests de "carga solo con `gen`" | `apps/web/src/main.ts` |
| E1.7 ✅ | `npm run sim` antes y después; documentar en `DECISIONES.md` | Sin estas conexiones los nuevos stats serían decorativos: no cerrar E1 sin E1.4 |

## E2 · Estructura de habilidades — 🟡 · Fidelidad: media

El original usa tres capas: stats globales → conocimiento deportivo → habilidades técnicas.

| ID | Tarea | Notas |
|---|---|---|
| E2.1 | Subtipos de habilidad: entrenable / derivada (calculada de otras) / oculta (solo el motor) | Hoy solo hay `habilidad` plana. ¿Hace falta ya con un solo deporte? 🟡 |
| E2.2 | "Valor efectivo": la habilidad se multiplica por sus secundarias globales (×1,2 cada una) al competir | Hoy las globales solo afectan a ritmo y techo de crecimiento. Decidir si se sustituye o se suma 🟡 |
| E2.3 ✅ (atletismo) | **Conocimiento deportivo** como bonus/malus (no como techo): stat `conocimiento` por deporte, arranca en 0, sube viendo y compitiendo, decay muy suave | Adaptado del original (allí era techo `min(límite, conocimiento × 1,2)`). Falta el canal de entrenador y las lecturas tácticas (ver `DECISIONES.md`) |
| E2.4 | Tabla global → habilidad técnica (qué stat alimenta qué habilidad) | Sección 12 del original: **pendiente allí**. La diseñamos aquí para atletismo y estudios |
| E2.5 | Transferencias de entrenamiento (global→técnica 10–20 %, técnica→relacionada 15–25 %, técnica→global 3–5 %) declaradas en datos | Respetar la regla 4: se haría con `ctx.train`, nunca tocando habilidades de otro módulo |
| E2.6 | Decay con multiplicador por inactividad semanal (con techo) y velocidad según edad | La edad ya existe (E3.1), así que se puede hacer. Hoy: caída diaria tras N días de gracia, igual a cualquier edad |
| E2.7 | **Potencial individual por habilidad, ligado al tope hereditario:** cada habilidad (y capacidad) del personaje tiene un tope genético oculto; **la velocidad de progreso también depende de él**: quien puede llegar a 92 sube más rápido que quien tiene el tope en 70, entrenando exactamente igual. Además, ganancia ×1 (<80 % del tope), ×0,5, ×0,2, ×0,05 (>95 %) | **Prioritario antes de E10** (decidido el 22/10): a 10 años todos los que entrenan alcanzan el mismo techo (~92). Sin padres, el tope se sortea con la misma distribución que el potencial de los rivales (media 79) |
| E2.8 | Modificador de energía en la competición (70–100 % ×1, … 0–9 % ×0,3) | Contrastar con la eficiencia por energía que ya existe antes de duplicar |

## E3 · Identidad y cuerpo — 🟡 · Fidelidad: media

| ID | Tarea | Notas |
|---|---|---|
| E3.1 ✅ | Edad, altura (hacia objetivo genético), peso, dominancia lateral | Hecho: empieza con 8 años (`EDAD_INICIAL`) y cumple años cada 365 días. Altura con curva por edad y madurez individual; el objetivo genético saldrá de los padres (E8) |
| E3.2 ✅ | Tipo corporal (delgado, normal, atlético, musculado, con sobrepeso) derivado de hábitos acumulados, con modificadores de velocidad, fuerza y constitución | Hecho sin alimentación: hábitos de fuerza, cardio y actividad. Los efectos son modificadores de eficiencia por etiqueta, no por stat. Alimentación como decisión, pendiente |
| E3.3 ✅ | Constitución: sube solo por hábitos sostenidos, no por entrenamiento directo | Hecho: +1 por semana con hábitos sanos (crece muy poco, a revisar). Lesiones y recuperación, pendientes: enlazan con la idea de lesión en `DECISIONES.md` |
| E3.4 | UI filtrada por inteligencia (5 niveles, de sensaciones vagas a "top 10 %") y pistas precisas del entrenador con buena relación | Cambia la web y se apoya en `npcs` (servicio ya existente) |

## E4 · Ejes de personalidad — ⏸ · Fidelidad: alta en concepto, baja en mecánica

Ocho ejes de −50 a +50: disciplinado↔rebelde, honesto↔manipulador, ambicioso↔satisfecho, relajado↔sacrificado, solitario↔sociable, calmado↔agresivo, temerario↔prudente, optimista↔pesimista. Nunca se muestran como número.

| ID | Tarea | Notas |
|---|---|---|
| E4.1 | Estado de los ocho ejes en `personaje` y servicio para consultarlos | JSON serializable (regla 5) |
| E4.2 | Tres modos de inicio: personalizado (reparto de puntos), equilibrado, aleatorio | Aleatorio exige que ningún extremo sea trampa |
| E4.3 | Las decisiones mueven los ejes y **abren o cierran opciones** (`available`) | Necesita un sistema de decisiones/eventos que hoy no existe → bloquea el resto |
| E4.4 | Efectos cruzados con stats (p. ej. pesimismo reduce el efecto de determinación) | Mediante modificadores por etiqueta, sin importar entre módulos |
| E4.5 | Test de "ningún extremo es trampa" en la simulación (bots por perfil) | Encaja con `sim/` |

## E5 · Perks — ⏸ · Fidelidad: media

29 perks (14 pares + ambidiestro), latentes hasta que un evento los activa. Máximo 2–3 activos.

| ID | Tarea | Notas |
|---|---|---|
| E5.1 | Estado `perks_active` / `perks_latent` (y `perks_inherited_pool` solo si hay dinastía, E8) | Sin hijos, el pool no se usa |
| E5.2 | Elegir un subconjunto para empezar (p. ej. los que afectan a stats que ya existen) | Muchos perks dependen de deportes de equipo o de porteros |
| E5.3 | Eventos de revelación | Depende del sistema de eventos (ver E4.3) |
| E5.4 | Bonus de perk sobre el límite genético: `techo = min(100, límite + bonus)` | Depende de E2.7 |

## E6 · Académico — 🟡 · Fidelidad: baja

| ID | Tarea | Notas |
|---|---|---|
| E6.1 | Revisar si la nota media de `estudios` cubre "rendimiento académico" (0–100) | Se publica ya como servicio `estudios` |
| E6.2 | Evaluación trimestral con consecuencias (semanas 12, 24, 36 en el original) | El calendario de este juego es de 365 días; hay que decidir el calendario escolar propio 🟡 |
| E6.3 | La inteligencia y la energía en clase influyen en el rendimiento | Entra con E1.4 |
| E6.4 ✅ | **Asignaturas por etapa (currículo de España):** primaria, ESO y bachillerato con materias que cambian (ciencias naturales → biología, ciencias sociales → historia; unas salen, otras entran). Más de tres | Requiere definir el currículo; el cambio de etapa coincide con el cambio de curso (E9.4) 🟡 |
| E6.5 ✅ | **Nivel inicial de las asignaturas:** todos parten de un 5 de nota; la inteligencia **para su edad** modula la ganancia y una pequeña ventaja o desventaja inicial | Hoy arrancan en 15 a 30 sobre 100 (nota ≈ 3). Decidido el 22/10 |

## E7 · Competición de equipo — ⏸ · Fidelidad: baja

Posiciones (16), roles (42), experiencia por posición/rol con afinidad, fórmula de partido, normalización por categoría, `week_targets`. Todo depende de un **segundo deporte de equipo**. No se planifica hasta decidir cuál (idea ya recogida en `DECISIONES.md`). Lo reutilizable sin deporte de equipo: modificador de energía (E2.8).

## E8 · Dinastía — ⏸ · Fidelidad: baja

Padres con los stats globales, límites genéticos derivados de los padres (media × factor ± 15 %), herencia de perks con dos pools. También el **nivel inicial de los demás niños según la práctica deportiva de sus padres** (hoy los rivales arrancan con un nivel medio de 29, hasta 54: a los 10 años no debería haber niveles altos sin antecedentes en el deporte). Requiere diseñar el ciclo de generaciones, que este juego aún no tiene. E2.7 y E5.1 se escriben pensando en que luego encajen aquí.

## E9 · Calendario, curso y temporadas — 🟡 · Fidelidad: baja (el original usa semanas 12/24/36)

Hoy los 365 días son iguales: clase de lunes a viernes de 8 a 14 y carrera cada sábado, sin parar.

| ID | Tarea | Notas |
|---|---|---|
| E9.1 ✅ | Calendario por país, definido como dato. **España (estimación, a confirmar):** curso de 52 semanas sin fechas absolutas, contadas desde el lunes de la 2.ª semana de septiembre | Hecho el 22/10 (ver tabla de abajo). Las semanas exactas son una aproximación |
| E9.2 ✅ (parcial) | Vacaciones con contenido propio: sin clase pero con entrenamiento, campamentos, tiempo libre | Hecho: sin clase, horario de fin de semana. Faltan campamentos y contenido propio de vacaciones |
| E9.3 ✅ (parcial) | Temporada deportiva: pretemporada, competición, clasificatorias y finales; carreras que no son todas las semanas | Hecho: pretemporada de 4 semanas y carreras solo en periodo lectivo. Faltan clasificatorias y finales (aprovecharían los 16 rivales y la rotación de series) |
| E9.4 ✅ | Cursos y categorías por edad: el niño sube de curso y de categoría al cumplir años. **Categorías de la federación española** (sub-10, sub-12, sub-14, sub-16, sub-18, sub-20, sub-23), como dato por país igual que el calendario; en edades tempranas, algún niño sale y entra otro nuevo | Enlaza con la edad (E3.1) |
| E9.5 ✅ (parcial) | Evaluaciones trimestrales con consecuencias (aprobar, repetir curso, becas) | Hecho: evaluación en las semanas 14, 28 y 40, con consecuencias en motivación y estrés. Faltan repetir curso y becas (necesitan decisiones) |
| E9.6 ✅ | Simulación de 10 años: nuevos chequeos y rendimiento | Hecho: `npm run sim:largo` simula 3 años (336 ms por año). Falta revisar los rivales para partidas de diez años |
| E9.7 ✅ (datos) | Calendario como dato por país, con España por defecto | Hecho el dato (España). Falta poder elegir el país al crear la partida |
| E9.8 ✅ | **Desarrollo realista de los rivales:** curva por edad (nadie alcanza un potencial de 90 en tres años), renovación por cohortes (salen los mayores, entran nuevos con herencia de su edad) y **subida de categoría** de quien destaca (a los 9 años contra niños de 12 si hace falta, sobre todo en fútbol) | Decidido el 22/10. Hoy los rivales llegan a su potencial en ~3 años |
| E9.9 ✅ | **Competir contra mayores desarrolla más:** la ganancia de entrenar y competir crece con el nivel del rival frente al propio | Decidido el 22/10 |
| E9.10 | **Verano según las notas:** media baja, **academia obligatoria** durante el verano para sacar los aprobados (no se repite curso: ese es el castigo); media alta, campamento deportivo si lo piden a los padres (mejora más); media aceptable, tiempo con amigos (no mejora igual) | Decidido el 22/10. Se implementa a continuación; pedir permiso a los padres encaja con familia (E13.1) y decisiones (E18) |
| E9.11 | Clasificatorias y finales: si hay un clasificatorio previo, se monta; si no, un evento especial | Decidido el 22/10. Se implementa a continuación como puerta a la oportunidad profesional |

**Calendario de España (estimación constante; semana 0 = lunes de la 2.ª semana de septiembre)**

| Periodo | Semanas del curso | Aproximado |
|---|---|---|
| 1.er trimestre | 0 a 14 | septiembre a mediados de diciembre |
| Navidad (sin clase) | 15 y 16 | del 22 de diciembre al 4 de enero |
| 2.º trimestre | 17 a 28 | enero a finales de marzo |
| Semana Santa (sin clase) | 29 | finales de marzo o principios de abril (dentro del margen del 22 de marzo al 25 de abril) |
| 3.er trimestre | 30 a 40 | abril a mediados de junio |
| Verano (sin clase) | 41 a 51 | finales de junio a principios de septiembre |

- **Sin fechas absolutas:** como el año de la partida es el año 0, el calendario se expresa en semanas desde el inicio del curso. Cada curso tiene 52 semanas; el día suelto que sobra del año (365 días) no importa para el calendario.
- **Reparto de semanas lectivas:** 15 en el 1.er trimestre (0 a 14), 12 en el 2.º (17 a 28) y 11 en el 3.º (30 a 40): 38 en total. Así el 3.º no se queda con solo 9 o 10.
- **Evaluaciones:** al final de cada trimestre (semanas 14, 28 y 40). Son las semanas 12, 24 y 36 del original, adaptadas a un curso de unas 38 semanas lectivas.
- **El día numérico concreto es independiente:** la interfaz puede enseñar solo la semana, el trimestre y el periodo (clase, vacaciones).
- **Otros países:** el calendario es un dato por país (E9.7), así que añadir Francia o Reino Unido no toca el motor.

## E10 · Ciclo de vida y paso a profesional — 🟡 · Fidelidad: media (el original habla de fases de vida y requisitos de debut)

| ID | Tarea | Notas |
|---|---|---|
| E10.1 | Fases de vida como estado del personaje: formación, profesional, retiro | La fase 1 termina al hacerse profesional |
| E10.2 | La **oportunidad profesional**: ventana de 16 a 18 años según nivel y deporte, con requisitos (el original usa constitución, coordinación, determinación, concentración y resiliencia) | Una puerta que se abre y el jugador decide si cruza. Edad y deporte decididos el 22/10; faltan los requisitos concretos de atletismo |
| E10.3 | Cierre de la fase 1 y arranque de la fase 2 | Resumen de lo vivido y estado que pasa a la nueva fase |
| E10.4 | Fase 2 (profesional): club, contratos, patrocinios, competición de élite | Módulos nuevos; diseñar después de cerrar la fase 1 |
| E10.5 | Fase 3 (retiro): entrenador, representante u otro trabajo deportivo | Un módulo distinto por oficio; después de la fase 2 |
| E10.6 | Fin de partida | Qué cuenta como terminar cada fase y cómo se resume la carrera |

## E11 · Ritmo de juego y planificación — 🟡 · Sin equivalente en el original

De los 8 a los 18 años son unos 3.650 días. **Decidido el 22/10: se juega día a día** (reducir a planificación después es más fácil que ampliar); las partidas serán largas y con muchos eventos y decisiones. Lo siguiente es ayuda opcional para no repetir lo mismo diez años.

| ID | Tarea | Notas |
|---|---|---|
| E11.1 | Ayudas opcionales para ir más rápido: repetir la rutina del día anterior, avanzar hasta la siguiente cosa importante, y más adelante planificación por semanas | Por defecto, día a día. Las ayudas no sustituyen el modo manual |
| E11.2 | Avance rápido con interrupciones: parar ante lesiones, carreras, hitos o eventos | Los eventos (E18) son la causa natural de las interrupciones |
| E11.3 | Resumen semanal y de periodo: qué ha pasado, cuánto has mejorado y cómo vas frente a los rivales | Es parte de la interfaz (E15) |

## E12 · Salud, lesiones y alimentación — 🟡

| ID | Tarea | Notas |
|---|---|---|
| E12.1 | Lesiones y recuperación, ligadas a la constitución y a la sobrecarga | Hoy salud 0 solo resta rendimiento. Pendiente ya en `DECISIONES.md` |
| E12.2 | Alimentación como decisión (o mínima derivada de hábitos) | Hoy el peso depende solo de la actividad |
| E12.3 | Sueño crónico y enfermedades | Dormir poco hoy solo resta motivación |
| E12.4 | Una lesión grave como bifurcación: estudiar o ver deporte durante la baja puede dar más conocimiento | Idea del original; mejor con eventos |

## E13 · Mundo social base — 🟡

| ID | Tarea | Notas |
|---|---|---|
| E13.0 | **Modo historia: llegar a una ciudad y un colegio nuevos sin conocer a nadie.** Los NPCs empiezan desconocidos: hay que conocerlos, presentarse y construir las relaciones desde cero | Cambia lo actual (hoy todos los NPCs son conocidos y empiezan con afinidad de 15 a 35). Pide acciones y eventos de conocer gente y un estado "desconocido" |
| E13.1 | Familia: padres como NPCs (apoyo, tiempo en casa, expectativas) | El rol `familia` existe sin NPCs. Enlaza con la herencia (E8) |
| E13.2 | Rivales con identidad e historia (rivalidades, evolución de relación) | Hoy tienen nivel y nada más |
| E13.3 | Entrenadores y compañeros de club al subir de categoría | Cambian con las categorías y los cursos (E9.4) |
| E13.4 | Relaciones con decay y mantenimiento más ricos | Hoy solo suben con el contacto y bajan sin él |

## E14 · Segundo deporte — 🟡

Valida que la plantilla de deporte funciona sin tocar el motor. **Decidido el 22/10:** atletismo cierra la fase 1 y el deporte de equipo (fútbol, E7) llega después como segundo deporte.

## E15 · Interfaz y partida — 🟢/🟡

| ID | Tarea | Notas |
|---|---|---|
| E15.1 | Creación de personaje (hoy solo el nombre) y elección de deporte al empezar | Aquí entrarían los modos de inicio de la personalidad (E4.2) |
| E15.2 | Filtro de información por inteligencia | Es E3.4 |
| E15.3 | Resumen semanal y gráficas de progreso | Enlaza con E11.3 |
| E15.4 | Varias partidas guardadas | Hoy hay una sola |

## E16 · Recursos y dinero — 🟡 (opcional)

Solo si se quiere: cuotas, material, viajes y, en la fase profesional, sueldo y patrocinios. Hoy los únicos recursos son tiempo y energía.

## E17 · Técnica — 🟢

Generador de azar propio para los rivales; migración de partidas guardadas; rendimiento con diez años simulados; Capacitor si se quiere app de tienda.

## E18 · Eventos y decisiones — 🟢 el motor, ⏸ el contenido

| ID | Tarea | Notas |
|---|---|---|
| E18.1 | Motor: eventos con condiciones, probabilidad, una sola vez o con espera entre apariciones, programados, por umbral y ligados a NPCs | Textos como datos, con concordancia de género |
| E18.2 | Decisiones: opciones con requisitos, costes y consecuencias | Pueden abrir o cerrar acciones: son las **puertas** |
| E18.3 | Personalidad (E4), perks latentes (E5), autoridad y picardía | Contenido que depende del motor |
| E18.4 | Lecturas tácticas y opciones tácticas en la carrera, a partir del conocimiento | Hoy el conocimiento solo da bonus |
| E18.5 | Hitos que abren caminos: ojeadores, selecciones, clasificatorias, becas, la oportunidad profesional (E10.2) | Puertas del ciclo de vida |
| E18.6 | Colegio, familia y rivalidades como fuente de eventos | Dependen de E13 |

## E19 · Clubes — 🟡 · Sin equivalente en el original

Decidido el 22/10/2026: habrá clubes en distintos deportes y un club puede tener categorías en varios deportes. Hoy el entrenamiento está disponible para todos en las pistas, sin club.

| ID | Tarea | Notas |
|---|---|---|
| E19.1 ✅ | **Club del colegio:** el primero al que se une el personaje (modo historia: colegio nuevo). Entrenamientos de menor nivel | Sesiones con entrenador del colegio y horario fijo |
| E19.2 ✅ | **Clubes fuera del colegio:** más profesionales (mejor entrenamiento y competición), con acceso por pruebas | Posibles cuotas y desplazamientos (E16) 🟡 |
| E19.3 ✅ | Club con varios deportes y categorías en cada uno | Estructura de datos: club → deportes → categorías |
| E19.4 ✅ | La calidad del club modifica la eficiencia de entrenar, el conocimiento y la competición | Modificador por club, sin que los deportes se conozcan |
| E19.5 ✅ | Los rivales y compañeros pertenecen a clubes | Enlaza con los 16 rivales actuales y con E13 |
| E19.6 | Cambiar de club: pruebas, ojeadores y subida de nivel | Camino hacia la oportunidad profesional (E10.2); necesita eventos (E18) |
| E19.7 | **Entrenador del club como personaje (NPC)**, igual que el resto de personajes que se añadan: nombre, relación, apoyo | Hoy los entrenadores de los clubes de fuera no existen como personajes; el único entrenador es el del colegio |

## Transversal

| ID | Tarea |
|---|---|
| T1 | Una entrada en `DECISIONES.md` por cada decisión de diseño o de balance |
| T2 | Actualizar `ARQUITECTURA.md` cuando cambie la lista de genéricas o aparezcan servicios nuevos |
| T3 | Cada módulo nuevo o cambiado sigue cargando solo con `gen`; `tests/arquitectura.test.ts` debe seguir en verde |
| T4 | Tras tocar números: `npm run sim` antes y después y comparar chequeos |

## Dudas abiertas y contradicciones del original

- "20 stats" frente a 18 listados.
- El documento de cambios técnicos mantiene `mentality` y la sección 12 (tabla global→técnico) sigue pendiente.
- La lista de ejes aparece como "pendiente: validar los 4 propuestos" y a la vez como cerrada con 8.
- La sección 12 marca los límites genéticos como cerrados, pero la lista de pendientes los repite.
- La normalización por categoría necesita datos de NPCs que no existen (D-09 del original).
- Los 6 stats sociales cuentan `cooperacion` como provisional: revisar cuando se cierre el diseño del fútbol.

## Cómo comprobar que el backlog sigue siendo fiel

1. Antes de empezar una épica, releer su sección del original y anotar qué se mantiene, qué se adapta y qué se descarta.
2. Si algo se adapta o se descarta, apuntarlo en `DECISIONES.md` con el motivo y cambiar la fidelidad aquí.
3. Revisar el orden tras cerrar E1: probablemente E4 y E5 se desbloqueen juntas cuando exista un sistema de eventos.
4. Orden propuesto (22/10/2026, revisado tras el cierre de E9): **antes de E10**, E2.7 (potencial individual por habilidad y progreso según el tope), E9.10 (verano según notas con academia obligatoria), E9.11 (clasificatorias y finales) y bots que suben de categoría; después E10 ciclo de vida y oportunidad profesional → E11 ritmo de juego → E12 salud y lesiones → E13 familia y NPCs (con E19.7) → E15 interfaz → E14 segundo deporte → E18 eventos y decisiones (con E4/E5) → fases 2 y 3. Pendientes sin fecha: becas (hasta que haya sistema monetario, E16), optimizaciones de rendimiento.
