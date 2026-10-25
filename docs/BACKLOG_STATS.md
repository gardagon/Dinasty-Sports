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

- **Conocimiento del deporte** (adapta E2.3), **PWA**, **96 rivales persistentes por edad con padres y herencia**, **series de 8 con rotación**, **clasificación con tablas** tras cada carrera, **clubes**, **currículo de España**, **calendario por país**, **módulo `relaciones`** (E20) y **módulo `familia`**. Detalle y cifras en `DECISIONES.md`.
- **Herramientas de medición:** `npm run sim` (balance a un año), `sim:largo` (tres años) y `sim:vida` (vida entera de un bot que lo entrena todo, hasta los 70 años por defecto).
- Para E7 (deportes de equipo) y E8 (dinastía): la plantilla de competición ya tiene rivales con padres y herencia propia, tabla de resultados y rotación de series, y el motor ya hereda topes de los padres y envejece por categorías.

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
| E2.2 ✅ (parcial) | "Valor efectivo": la habilidad se multiplica por sus secundarias globales (×1,2 cada una) al competir | Hecho el 23/10 solo para el **conocimiento del deporte**: ritmo y salida valen ×0,85 a ×1,15 y técnica la mitad según el conocimiento; lo físico no cambia. Las globales siguen afectando solo a ritmo y techo de crecimiento. Decidir si se añade el resto 🟡 |
| E2.3 ✅ (atletismo) | **Conocimiento deportivo** como bonus/malus (no como techo): stat `conocimiento` por deporte, arranca en 0, sube viendo y compitiendo, decay muy suave | Adaptado del original (allí era techo `min(límite, conocimiento × 1,2)`). **Ajustado el 23/10:** actúa como malus/bonus sobre lo táctico en competición (ritmo y salida ×0,85 a ×1,15; técnica la mitad) y no sobre lo físico; sube rápido al principio y cada vez más despacio (curva 2,5, llega a 100 solo a muy largo plazo). **El techo duro queda pendiente de decisión** (se ve en `DECISIONES.md`). Falta el canal de entrenador y las lecturas tácticas |
| E2.4 | Tabla global → habilidad técnica (qué stat alimenta qué habilidad) | Sección 12 del original: **pendiente allí**. La diseñamos aquí para atletismo y estudios |
| E2.5 | Transferencias de entrenamiento (global→técnica 10–20 %, técnica→relacionada 15–25 %, técnica→global 3–5 %) declaradas en datos | Respetar la regla 4: se haría con `ctx.train`, nunca tocando habilidades de otro módulo |
| E2.6 | Decay con multiplicador por inactividad semanal (con techo) y velocidad según edad | La edad ya existe (E3.1), así que se puede hacer. Hoy: caída diaria tras N días de gracia, igual a cualquier edad. **Ampliado el 24/10:** además de la caída por edad, hace falta una **edad del pico por categoría** (hoy el desarrollo físico llega al 100 % a los 18 y no baja nunca): física ~24 con meseta 22–27 y bajada suave desde los 28; mental sigue subiendo más allá de los 28 con un malus mínimo por edad; social hasta los 30. Medido con `npm run sim:vida` (ver `DECISIONES.md` del 24/10). **Hecho el 24/10** (curvas por edad y caída por encima del tope efectivo; ver «Envejecimiento» en `ARQUITECTURA.md`). Falta que los rivales adultos y los trabajos que frenan el desplome (más adelante) usen las curvas |
| E2.8 ✅ | **Infancia realista (24/10):** capacidades genéricas con arranque 5–20; techo por edad progresivo (30 % del tope a los 8, 55 % a los 12, 82 % a los 16, 91 % a los 18); desarrollo natural (45 % del tope sin entrenar); plasticidad hasta los 16 (×3 a ×1); nivel típico por edad como referencia de «para su edad» (`norm` relativo); rivales con la misma curva ×0,75 | Ver DECISIONES del 24/10. Hecho el 25/10: valores iniciales repartidos (mediana 12, de 5 a 20), equilibrado ~6 y empollón ~8 a tres años, bot perfecto arreglado. Pendiente: revisar el crecimiento de adultos en la fase profesional (E10) y el empollón del primer año (6,9, sube con los años) |
| E2.7 ✅ (rehecho el 23/10) | **Potencial individual por habilidad, ligado al tope hereditario:** cada habilidad (y capacidad física) tiene un tope genético oculto y la velocidad de progreso también depende de él (tope 92 sube más rápido que tope 70, entrenando igual). Ganancia ×1 (<80 % del tope), ×0,5, ×0,2, ×0,05 (>95 %) | Hecho el 22/10 y rehecho el 23/10: el tope sale de los padres (E8.1) para las genéricas y se deriva de ellas para las habilidades deportivas (las asignaturas ya no tienen tope, ver E6.6). Tope típico 62; el ritmo de subida se escala con él (`ESCALA_DE_RITMO` 0,8). Falta los tramos de ganancia por cercanía al tope (hoy se ralentiza por la curva de rendimientos decrecientes hacia el tope) |
| E2.8 | Modificador de energía en la competición (70–100 % ×1, … 0–9 % ×0,3) | Contrastar con la eficiencia por energía que ya existe antes de duplicar |

## E3 · Identidad y cuerpo — 🟡 · Fidelidad: media

| ID | Tarea | Notas |
|---|---|---|
| E3.1 ✅ | Edad, altura (hacia objetivo genético), peso, dominancia lateral | Hecho: empieza con 8 años (`EDAD_INICIAL`) y cumple años cada 365 días. Altura con curva por edad y madurez individual; el objetivo genético ya sale de los padres (E8.2) |
| E3.2 ✅ | Tipo corporal (delgado, normal, atlético, musculado, con sobrepeso) derivado de hábitos acumulados, con modificadores de velocidad, fuerza y constitución | Hecho sin alimentación: hábitos de fuerza, cardio y actividad. Los efectos son modificadores de eficiencia por etiqueta, no por stat. Alimentación como decisión, pendiente |
| E3.3 ✅ | Constitución: sube solo por hábitos sostenidos, no por entrenamiento directo | Hecho: +1 por semana con hábitos sanos (crece muy poco, a revisar). Lesiones y recuperación, pendientes: enlazan con la idea de lesión en `DECISIONES.md` |
| E3.4 | UI filtrada por inteligencia (5 niveles, de sensaciones vagas a "top 10 %") y pistas precisas del entrenador con buena relación | Cambia la web y se apoya en `npcs` (servicio ya existente) |
| E3.5 ✅ | **Rasgos físicos de apariencia** (color y tipo de pelo, color de ojos, tono de piel, forma de cara, rasgos distintivos...), heredables de los padres. Sirven para (1) **encajar gustos** (lo que le atrae a cada persona, para la pareja de E20.6), (2) **dibujar al personaje** y a las demás personas, y (3) reconocer a los hijos como hijos de sus padres | Pedido el 24/10 y **hecho el mismo día** junto a los rasgos de las personas (E20.5): pelo (color y tipo), ojos, piel, cara y distintivos, heredados de los padres, con un origen familiar de 9 orígenes. El dibujo por capas queda para la interfaz (E15). La complexión y la altura (E3.1) ya existen |

## E4 · Ejes de personalidad — ⏸ · Fidelidad: alta en concepto, baja en mecánica

Ocho ejes de −50 a +50: disciplinado↔rebelde, honesto↔manipulador, ambicioso↔satisfecho, relajado↔sacrificado, solitario↔sociable, calmado↔agresivo, temerario↔prudente, optimista↔pesimista. Nunca se muestran como número.

| ID | Tarea | Notas |
|---|---|---|
| E4.1 ✅ | Estado de los ocho ejes en `personaje` y servicio para consultarlos | Hecho el 24/10 dentro del perfil del personaje (servicio `perfil`), heredado de los padres. Los modos personalizado y aleatorio (E4.2) llegan con la creación de personaje |
| E4.2 | Tres modos de inicio: personalizado (reparto de puntos), equilibrado, aleatorio | Aleatorio exige que ningún extremo sea trampa |
| E4.3 | Las decisiones mueven los ejes y **abren o cierran opciones** (`available`) | Necesita un sistema de decisiones/eventos que hoy no existe → bloquea el resto |
| E4.4 | Efectos cruzados con stats (p. ej. pesimismo reduce el efecto de determinación) | Mediante modificadores por etiqueta, sin importar entre módulos |
| E4.5 | Test de "ningún extremo es trampa" en la simulación (bots por perfil) | Encaja con `sim/` |

## E5 · Perks — 🟡 (herencia y efectos hechos; revelación por eventos ⏸) · Fidelidad: media

28 perks (13 pares de opuestos, Ambidiestro y Mano de palo; el original dice 29 en 14 pares + 1 pero su tabla tiene 28). Máximo 3 activos; lo normal es tener 0 o 1.

| ID | Tarea | Notas |
|---|---|---|
| E5.1 ✅ | Estado de perks: activos y pool (el pool lo heredan los hijos aunque no se haya expresado) | Hecho el 24/10 en el módulo base (`gen`); servicio `perks` |
| E5.2 ✅ | Catálogo completo de los 28 como dato, también los que no valen para el deporte favorito; los efectos de contextos que ningún deporte tiene esperan | Hecho el 24/10 en `contracts/perks.ts` |
| E5.3 | Eventos de revelación de los latentes | Depende del sistema de eventos (E18). Hoy se enseñan todos en la fase de pruebas y su efecto cuenta aunque no se hayan revelado |
| E5.4 ✅ | Bonus de perk sobre el tope: `techo = min(100, tope + bonus)` | Hecho el 24/10 (`ctx.bonusDeTope`); las habilidades y asignaturas derivadas se recalculan |
| E5.5 ✅ | **Herencia unificada:** pool único de los dos padres, cada perk se tira por separado (40 % activo, 20 % en el pool, 1 % espontáneo), sin opuestos y con tope de 3 | Decidido el 24/10. Ajustar con pruebas |
| E5.6 | Efectos pendientes: Suertudo y Gafe (ramas por evento), Recuperación rápida y lenta (lesiones, E12), agarre y alta densidad (deportes de equipo), Ambidiestro y Mano de palo | Esperan eventos, lesiones o deportes de equipo |
| E5.7 | Perks en los rivales y en los hijos del personaje (ciclo de generaciones) | Hoy los rivales no llevan perks |

## E6 · Académico — 🟡 · Fidelidad: baja

| ID | Tarea | Notas |
|---|---|---|
| E6.1 | Revisar si la nota media de `estudios` cubre "rendimiento académico" (0–100) | Se publica ya como servicio `estudios` |
| E6.2 | Evaluación trimestral con consecuencias (semanas 12, 24, 36 en el original) | El calendario de este juego es de 365 días; hay que decidir el calendario escolar propio 🟡 |
| E6.3 | La inteligencia y la energía en clase influyen en el rendimiento | Entra con E1.4 |
| E6.6 ✅ | **Asignaturas como preparación de exámenes** (24/10): nivel 0–100 = nota esperada × 10 visto como Mal/Regular/Bien/Muy bien/Excelente, caída diaria suave, clase solo con las asignaturas del día (horario semanal), dos parciales + global por trimestre (40/60) con aviso de una semana (varios el mismo día; faltar = 0), repaso en vacaciones | Ver DECISIONES del 24/10. Sustituye E6.5 y retira E8.5 para asignaturas |
| E6.4 ✅ | **Asignaturas por etapa (currículo de España):** primaria, ESO y bachillerato con materias que cambian (ciencias naturales → biología, ciencias sociales → historia; unas salen, otras entran). Más de tres | Requiere definir el currículo; el cambio de etapa coincide con el cambio de curso (E9.4) 🟡 |
| E6.5 ✅ (sustituido por E6.6) | **Nivel inicial de las asignaturas:** todos parten de un 5 de nota; la inteligencia **para su edad** modula la ganancia y una pequeña ventaja o desventaja inicial | Hoy arrancan en 15 a 30 sobre 100 (nota ≈ 3). Decidido el 22/10 |

## E7 · Competición de equipo — ⏸ · Fidelidad: baja

Posiciones (16), roles (42), experiencia por posición/rol con afinidad, fórmula de partido, normalización por categoría, `week_targets`. Todo depende de un **segundo deporte de equipo**. No se planifica hasta decidir cuál (idea ya recogida en `DECISIONES.md`). Lo reutilizable sin deporte de equipo: modificador de energía (E2.8).

## E8 · Dinastía — 🟡 (herencia hecha; ciclo de generaciones ⏸) · Fidelidad: baja

**Hecho el 23/10/2026 (herencia de la fase infantil):**

| ID | Tarea | Notas |
|---|---|---|
| E8.1 ✅ | **Topes genéticos desde los padres (rehecho el 23/10 con el modelo de Godot):** cada padre tiene un perfil de topes por capacidad en cuatro bandas (débil 35–50, normal 50–70, fuerte 70–85, destacado 85–95); con la dificultad normal, 0–1 débiles, 1–2 fuertes y 0–1 destacadas y el resto normales (tope típico ~62). El hijo hereda **cada capacidad de UN solo padre**: la mitad exacta de las capacidades del padre y la otra mitad de la madre, al azar cuáles, con el tope de ese padre ±20 %. No hay punto intermedio | `heredarTope`, `perfilDePadre` y `repartirHerencia` en contracts; `Game.parentPotential` y `Game.geneticOrigin` para pruebas. Sustituye al reparto 60/40 con mezcla |
| E8.2 ✅ | Altura heredada: la media de los dos padres más una variación (estatura sí se promedia) | `ctx.herencia('estatura')` en el contexto de creación |
| E8.3 ✅ | **Rivales con padres completos:** cada rival tiene padre y madre con perfil de topes físicos y deporte practicado; hereda como el personaje (mitad de cada padre ±20 %) y su tope de atletismo es la media más una aptitud propia (±15 %). Lo que practicaron los padres le da ventaja de partida (×0,95 a ×1,10) | Los padres pueden no haber practicado deporte: es lo más frecuente |
| E8.4 ✅ | Interfaz de pruebas: tabla de topes de padre y madre (la flecha marca de cuál se hereda), tope propio y datos de los padres. **Se oculta al pasar a beta** (`MOSTRAR_GENETICA` en `apps/web/src/main.ts`) | Decidido el 23/10 |
| E8.5 ✅ (retirado para asignaturas el 24/10: ya no tienen tope, ver E6.6) | **Todas las genéricas heredan** (físicas, mentales y sociales: 18). Las asignaturas y las habilidades de atletismo **no se heredan**: su tope es la media ponderada de los topes de las genéricas que las apoyan más una aptitud propia (±10 % las asignaturas, ±15 % las habilidades deportivas) | Decidido el 23/10 |
| E8.6 ✅ | **El nivel inicial de las genéricas también sale de los padres** (mismo progenitor del que hereda el tope; factor de herencia de 0,7 a 0,9 por hijo y ±20 %), escalado al rango inicial de cada genérica (30 a 50) | Sustituye a la tirada aleatoria del rango inicial. Godot lo escalaba a 5–20 |
| E8.7 ✅ | **Sesgo de los padres por categoría:** equilibrado, dominante (física, mental o social) o parcial (dos categorías), con pocas fugas; las capacidades altas se centran en las categorías favorecidas y las débiles en la que queda fuera. Suave: unos 9 puntos de diferencia media entre su mejor y su peor categoría | Decidido el 23/10. Los hijos de un padre físico y una madre mental salen equilibrados casi siempre |
| E8.8 ✅ | **Calidad de los padres (0 a 1):** los del jugador en normal están en el percentil 50–60 (calidad 0,5–0,6); el resto del mundo (padres de los rivales) recorre toda la escala. La calidad cambia los recuentos de capacidades fuertes, débiles y destacadas y desplaza las normales | Decidido el 23/10. La dificultad al crear la partida (E15.1) elegirá el rango del jugador: fácil 0,8–0,9, difícil 0,1–0,2 |
| E8.9 ✅ | **Marca del tope genético en las barras de Características (solo durante las pruebas):** segunda marca de color en todas las capacidades, habilidades y asignaturas con tope, junto a la marca gris del techo actual (edad y capacidades que apoyan). Se controla con `MOSTRAR_GENETICA` y **se oculta al pasar a beta** | Decidido el 23/10. Aclara que mentales y sociales también tienen tope aunque no tengan techo por edad |
| E8.10 ✅ | **Curvas de desarrollo y envejecimiento por categoría** (física, técnica, mental y social): tope efectivo = tope genético × fracción por edad. Pico físico a los ~22–27 (no a los 18), mental más allá de los 28 con una bajada mínima y tardía | Hecho el 24/10 (E2.6). Lo medido con el bot perfecto está en `DECISIONES.md` |

**Pendiente en E8:** herencia de perks con dos pools (necesita E5), ciclo de generaciones (hijos del personaje), dificultad al crear la partida (E15.1; los recuentos de bandas de `easy` y `hard` ya están como dato en `RECUENTOS`), hermanos con su propia tirada, y el techo duro del conocimiento (ver E2.3).


Padres con topes genéticos y herencia (hecha, ver abajo), herencia de perks con dos pools y ciclo de generaciones (pendientes). Los rivales ya heredan de sus padres y su práctica deportiva les da ventaja de partida. E2.7 y E5.1 se escriben pensando en que luego encajen aquí.

## E9 · Calendario, curso y temporadas — 🟡 · Fidelidad: baja (el original usa semanas 12/24/36)

Hoy los 365 días son iguales: clase de lunes a viernes de 8 a 14 y carrera cada sábado, sin parar.

| ID | Tarea | Notas |
|---|---|---|
| E9.1 ✅ | Calendario por país, definido como dato. **España (estimación, a confirmar):** curso de 52 semanas sin fechas absolutas, contadas desde el lunes de la 2.ª semana de septiembre | Hecho el 22/10 (ver tabla de abajo). Las semanas exactas son una aproximación |
| E9.2 ✅ (parcial) | Vacaciones con contenido propio: sin clase pero con entrenamiento, campamentos, tiempo libre | Hecho: sin clase, horario de fin de semana. Faltan campamentos y contenido propio de vacaciones |
| E9.3 ✅ (parcial) | Temporada deportiva: pretemporada, competición, clasificatorias y finales; carreras que no son todas las semanas | Hecho: pretemporada de 4 semanas y carreras solo en periodo lectivo. Faltan clasificatorias y finales (aprovecharían los 16 rivales y la rotación de series) |
| E9.4 ✅ | Cursos y categorías por edad (decide el **año de nacimiento**, no la fecha exacta; los bots suben de categoría): el niño sube de curso y de categoría al cumplir años. **Categorías de la federación española** (sub-10, sub-12, sub-14, sub-16, sub-18, sub-20, sub-23), como dato por país igual que el calendario; en edades tempranas, algún niño sale y entra otro nuevo | Enlaza con la edad (E3.1) |
| E9.5 ✅ (parcial) | Evaluaciones trimestrales con consecuencias (aprobar, repetir curso, becas) | Hecho: evaluación en las semanas 14, 28 y 40, con consecuencias en motivación y estrés. Faltan repetir curso y becas (necesitan decisiones) |
| E9.6 ✅ | Simulación de 10 años: nuevos chequeos y rendimiento | Hecho: `npm run sim:largo` simula 3 años (336 ms por año). Falta revisar los rivales para partidas de diez años |
| E9.7 ✅ (datos) | Calendario como dato por país, con España por defecto | Hecho el dato (España). Falta poder elegir el país al crear la partida |
| E9.8 ✅ | **Desarrollo realista de los rivales:** curva por edad (nadie alcanza un potencial de 90 en tres años), renovación por cohortes (salen los mayores, entran nuevos con herencia de su edad) y **subida de categoría** de quien destaca (a los 9 años contra niños de 12 si hace falta, sobre todo en fútbol) | Decidido el 22/10. Hoy los rivales llegan a su potencial en ~3 años |
| E9.9 ✅ | **Competir contra mayores desarrolla más:** la ganancia de entrenar y competir crece con el nivel del rival frente al propio | Decidido el 22/10 |
| E9.10 ✅ | **Verano según las notas:** media baja, **academia obligatoria** durante el verano para sacar los aprobados (no se repite curso: ese es el castigo); media alta, campamento deportivo si lo piden a los padres (mejora más); media aceptable, tiempo con amigos (no mejora igual) | Decidido el 22/10. Se implementa a continuación; pedir permiso a los padres encaja con familia (E13.1) y decisiones (E18) |
| E9.11 ✅ | Clasificatorias y finales: si hay un clasificatorio previo, se monta; si no, un evento especial | Decidido el 22/10. Se implementa a continuación como puerta a la oportunidad profesional |

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

### Diseño acordado el 23/10/2026

- **Capacidad:** pasar a profesional funciona como subir de categoría. Hay **categorías profesionales** en las que juegan los mejores, y se puede acceder a la primera cuando las habilidades del personaje permiten ser competitivo en ella. Igual que se sube a un personaje porque destaca.
- **La oferta llega por un ojeador** (nivel y ojeadores): el nivel abre la posibilidad y un ojeador lo ve competir y le hace la oferta. Esto necesita el sistema de eventos y decisiones (E18).
- **Tres niveles profesionales jugables ya,** no solo como dato: se puede subir de nivel profesional dentro de esta entrega.
- **Edad:** desde los 16 años, sin límite superior. Si no llega la oferta, el personaje sigue en la cantera y puede recibirla más tarde.
- **Aceptar no cierra la formación de golpe:** implica **más cosas que hacer, eventos y obligaciones**. El personaje puede **dejar el colegio**, pero si en su etapa profesional o al retirarse quiere prepararse para **entrenador, agente u otro oficio** necesita estudiar, y sin haber terminado el colegio le costará más.

### Ajustes del 23/10/2026

- **E10 queda aparcada hasta cimentar la fase infantil y montar el motor completo de eventos y decisiones.** No se hace un motor mínimo antes: haría falta una refactorización fuerte cuando se construya el definitivo. Todavía faltan cosas que sí se necesitan antes (genética y herencia, familia, salud y lesiones...).
- **La oferta del ojeador puede no ocurrir,** y **el personaje puede ir a probar por su cuenta** (pruebas propias en los clubes y circuitos profesionales).
- **La subida de nivel profesional no es lineal:** quien destaca a los 16 años puede ir directamente a élite. Por eso se modelan los tres niveles.
- **Los tres niveles (circuito nacional, internacional y élite) sirven para atletismo.**
- **Titulación en cuatro niveles:** 1 primaria, 2 ESO, 3 bachillerato y 4 universidad. Lo que haya terminado el personaje marca lo que le cuesta cada oficio de después (entrenador, agente...).

### Tareas

| ID | Tarea | Notas |
|---|---|---|
| E10.1 | Fases de vida como estado del personaje: formación, profesional, retiro | La formación no termina al instante al aceptar: hay una transición (ver E10.3) |
| E10.2 | **Población profesional y tres niveles** (p. ej. circuito nacional, internacional y élite) como dato, cada uno con un campo más fuerte: atletas adultos con herencia propia que envejecen y se retiran, como los rivales de la cantera pero en la cima | Calibrar campos (referencia: de cada 100 partidas, unas 55 llegan al primer nivel, 20 al segundo y 3 a la élite) 🟡 |
| E10.3 | **Oferta del ojeador y decisión:** condiciones (16 años o más, nivel competitivo en el nivel profesional), la oferta como evento con opciones (aceptar, pedir tiempo, rechazar) y sus consecuencias | Depende del motor de eventos y decisiones (E18.1 y E18.2) |
| E10.4 | **Transición a profesional:** más obligaciones (entrenamiento y calendario del club profesional), eventos, y la decisión de **dejar el colegio o seguir** | Dejar el colegio libera tiempo pero deja los estudios incompletos |
| E10.5 | **Titulación y futuro** (decidido el 24/10: las asignaturas deben perderse al terminar el colegio; si aparece la universidad, traerá otras asignaturas o un cálculo genérico sin asignaturas según la carrera elegida; hasta los 18 años no es prioritario): el personaje conserva el nivel de estudios que ha terminado (1 primaria, 2 ESO, 3 bachillerato, 4 universidad); cuanto menor, más cuestan los oficios de después (entrenador, agente...) | Marca de estudios que se consultará en la fase 3 |
| E10.6 | **Subir de nivel profesional** (los rivales de la cantera también tendrán su oportunidad de ser profesionales: será como un cambio de categoría, decidido el 24/10): por resultados y nivel, **no lineal** (a los 16 se puede entrar directamente en élite) | Los tres niveles se juegan; incluye ir a probar por cuenta propia |
| E10.7 | Fase 3 (retiro): entrenador, representante u otro trabajo deportivo | Un módulo distinto por oficio; después de la fase 2 |
| E10.8 | Fin de partida | Qué cuenta como terminar y cómo se resume la carrera |

### Orden de trabajo acordado el 23/10/2026

1. **Cimentar toda la fase infantil** (ver lista abajo).
2. **Motor completo de eventos y decisiones** (E18), diseñado una sola vez.
3. **Nivel profesional** (E10): población profesional, tres niveles, oferta del ojeador o prueba por cuenta propia, transición y subida de nivel.

**Qué falta de la fase infantil antes del motor de eventos** (propuesta, por orden):

| Orden | Épica | Qué incluye |
|---|---|---|
| 1 ✅ | Familia y genética (E13.1, E8 en parte) | Hecho el 23/10: padres con perfil, sesgo y calidad; topes, altura y nivel inicial heredados; práctica deportiva de los padres; herencia de los rivales |
| 2 | Modo historia y entorno (E13.0, E19.7) | Llegar a una ciudad y un colegio nuevos sin conocer a nadie; entrenadores de club como personajes |
| 3 | Salud, lesiones y alimentación (E12) y edad en el decay (E1.5, E2.6 ✅) | Edad en el decay y curvas de envejecimiento hechas el 24/10. Falta: lesiones ligadas a la constitución, recuperación, alimentación como hábito (dependen de eventos) |
| 4 | Estructura de habilidades que falta (E2) | Tabla global → habilidad, transferencias, derivadas y ocultas, valor efectivo en competición |
| 5 | Interfaz y partida (E15, E3.4) | Creación de personaje, elegir deporte, información filtrada por inteligencia, varias partidas |
| 6 | Ritmo de juego (E11) | Ayudas opcionales para repetir la rutina o avanzar |

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
| E13.1 ✅ (parcial) | Familia: padres con apoyo, expectativas y tiempo en casa | Hecho el 23/10 en el módulo `familia` (nombre, edad, altura, deporte practicado y los tres valores). Faltan los eventos y decisiones que los mueven, y que apoyen según la relación como el resto de NPCs |
| E13.2 | Rivales con identidad e historia (rivalidades, evolución de relación) | Hoy tienen nivel y nada más |
| E13.3 | Entrenadores y compañeros de club al subir de categoría | Cambian con las categorías y los cursos (E9.4) |
| E13.4 | Relaciones con decay y mantenimiento más ricos | Hoy solo suben con el contacto y bajan sin él. **Pasa a E20.4** |

## E14 · Segundo deporte — 🟡

Valida que la plantilla de deporte funciona sin tocar el motor. **Decidido el 22/10:** atletismo cierra la fase 1 y el deporte de equipo (fútbol, E7) llega después como segundo deporte.

## E15 · Interfaz y partida — 🟢/🟡

| ID | Tarea | Notas |
|---|---|---|
| E15.1 | Creación de personaje (hoy solo el nombre) y elección de deporte al empezar | Aquí entrarían los modos de inicio de la personalidad (E4.2) |
| E15.2 | Filtro de información por inteligencia | Es E3.4 |
| E15.3 | Resumen semanal y gráficas de progreso | Enlaza con E11.3 |
| E15.4 | Varias partidas guardadas | Hoy hay una sola |
| E15.5 | **Cómo enseñar lo que sube una acción** (hoy, en la alfa, el dato exacto de cada cambio hasta milésimas): valorar no enseñar cantidades pero sí marcar qué habilidades suben con la acción elegida, y/o marcar en verde la habilidad cuando cruza un valor entero hacia arriba y en rojo cuando baja | Pedido el 24/10 para más adelante |

## E16 · Recursos y dinero — 🟡 (opcional)

Solo si se quiere: cuotas, material, viajes y, en la fase profesional, sueldo y patrocinios. Hoy los únicos recursos son tiempo y energía.

## E17 · Técnica — 🟢

Generador de azar propio para los rivales; migración de partidas guardadas; rendimiento con diez años simulados; Capacitor si se quiere app de tienda. **Migración de guardados al salir de la alfa** (hoy `SAVE_VERSION` se sube y se descartan; ver `DECISIONES.md` del 24/10).

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

## E20 · Relaciones — 🟡 · Sin equivalente en el original

Registrada el 23/10/2026. **Hoy el módulo `npcs` solo tiene una interacción por persona** ("quedar" con compañeros y amigos, "hablar" con el entrenador): suma afinidad y la afinidad se pierde despacio sin contacto. Para tener amistades profundas, pareja e hijos (E8, ciclo de generaciones) hace falta un sistema de relaciones de verdad. Es el cimiento de lo social en las tres fases del juego, y gran parte de su contenido (conocerse, declararse, discutir, casarse, tener hijos) serán eventos y decisiones (E18).

**Qué hay hoy y qué falta**

| Hoy | Falta |
|---|---|
| Una cifra de afinidad (0 a 100) por NPC | Distintos tipos de vínculo con su propio estado: conocido, amistad, mejor amistad, rivalidad, pareja, familia |
| Una acción por NPC (`quedar` / `hablar`) | Varias acciones con coste, riesgo y efecto distintos (charlar, ayudar, regalar, discutir, hacer las paces, salir juntos) |
| Se pierde afinidad si pasan 7 días sin contacto | Mantenimiento y decaimiento por tipo de vínculo; recuerdos y hechos compartidos |
| El NPC apoya acciones si la afinidad es ≥ 40 | Que el vínculo cambie lo que el NPC hace (apoya, aconseja, exige, se enfada) |
| Los NPCs no tienen vida propia | Personalidad, intereses, edad y agenda de cada NPC |

| ID | Tarea | Notas |
|---|---|---|
| E20.1 ✅ | **Modelo de relación:** cada vínculo con tipo, afinidad, confianza, historia (hechos compartidos) y último contacto, no solo una cifra | Hoy `affinity` y `lastDay` en `Npc`. Debe ser estado del módulo y JSON serializable |
| E20.2 ✅ (parcial) | **Estados y transiciones:** desconocido → conocido → amigo → mejor amigo, y rivalidad; con condiciones para pasar de uno a otro | Enlaza con el modo historia (E13.0): empezar sin conocer a nadie |
| E20.3 | **Acciones de relación variadas:** charlar, ayudar con algo, regalar, quedar según intereses, discutir (elegible), hacer las paces | Cada una con duración, coste, efecto en la afinidad y entrenamiento de las genéricas sociales (carisma, empatía, comunicación) |
| E20.4 ✅ | **Mantenimiento y decaimiento por vínculo:** una amistad fuerte aguanta más sin contacto que una reciente; los motivos de ruptura | Sustituye al decay único de E13.4 |
| E20.5 ✅ | **Personalidad e intereses del NPC:** qué le gusta, qué le molesta, cómo reacciona. Condiciona qué acciones funcionan con él. **Ampliado el 24/10:** también rasgos físicos de apariencia (E3.5) para sus gustos y para dibujarlo | **Hecho el 24/10:** 8 ejes de carácter, 12 intereses, apariencia, origen y gustos en cada persona; compatibilidad (×0,7 a ×1,4) aplicada ya a las acciones de relaciones. Se apoya en los 8 ejes de los documentos de Godot |
| E20.6 | **Pareja (novio/novia):** conocer, tonteo, cita, declararse, ser pareja, ruptura. Con edades y límites adecuados a la fase de la vida | **Decisión pendiente:** desde qué edad y cómo se trata en la fase infantil (¿solo a partir de la adolescencia?) |
| E20.7 | **Hijos y familia propia:** ciclo de generaciones; los hijos heredan genética de sus padres (ya implementado, E8.1) y perks (E5) | Es lo que desbloquea E8 (dinastía). Pertenece a las fases 2 y 3 |
| E20.8 | **Relación con los padres y la familia:** que apoyo, expectativas y tiempo en casa (módulo `familia`) se muevan con lo que haga el personaje | Enlaza con E13.1 |
| E20.9 | **Efectos de las relaciones en el juego:** apoyo en acciones (ya existe), consejos del entrenador, motivación, estrés, oportunidades (un contacto que abre una puerta) | Respetar las reglas: etiquetas, modificadores y eventos entre módulos |
| E20.10 | **Interfaz:** lista de personas con tipo de vínculo, cómo va y qué se puede hacer con cada una | Parte de E15 |
| E20.11 ✅ | **Arquitectura:** módulo `relaciones` aparte de `npcs` | Decidido el 23/10 |
| E20.12 | **Vida propia de los NPCs:** relaciones entre ellos, cambios de club y de ciudad, parejas | Decidido el 23/10. Costoso en rendimiento con 96 rivales: simularlo por semana o por curso, no por día |

**Decisiones del 23/10/2026**

1. **Módulo aparte:** `relaciones` (vínculos) separado de `npcs` (población y rivales). Se comunican por servicios y eventos.
2. **Escala con positivos y negativos que arranca en 0.** Todo el que aparece ya se conoce: 0 es **conocido** y por sí solo nada baja de ahí a desconocido. Positivos: amigo, mejor amigo (y pareja, familia más adelante). Negativos: nivel −1 antipatía, −2 enemigo, −3 antagonista. Los vínculos positivos se enfrían hacia conocido; los negativos solo se suavizan hasta la primera antipatía (−1) y no vuelven a conocido sin reconciliarse (hacer las paces).
3. **La rivalidad no es un indicador:** nace de **eventos**, y es la parte negativa de la escala (antipatía, enemigo, antagonista).
4. **Pareja a los 14 años** (dato que se puede cambiar). Cada NPC tiene sus **preferencias propias ocultas**, sin ligarlas al género del personaje; un NPC puede rechazar al jugador.
5. **Estado visible, umbrales ocultos:** el jugador ve el estado del vínculo; las cifras se muestran solo en desarrollo (`MOSTRAR_RELACIONES` en `apps/web/src/main.ts`) y se ocultan en beta.
6. **Discutir es una acción elegible** (da decisiones aun sin motor de eventos).
7. **Los NPCs viven su propia vida:** cambian de club, se mudan, forman amistades y parejas entre ellos, no solo existen en relación con el personaje. Se simula por semana y solo el círculo cercano.

**Fase 1 hecha el 23/10/2026** (E20.1, E20.2 parcial, E20.4, E20.11): módulo `relaciones` con vínculo (afinidad −100..100, confianza 0..100, estado, contactos), histéresis, enfriamiento por estado y suavizado de lo negativo; la afinidad, las acciones `quedar`/`hablar` (ahora `relaciones.*`) y el apoyo (`relaciones.apoyo`) pasan de `npcs` a `relaciones`; las carreras mueven al entrenador y a los rivales. Todos arrancan en 0 (antes 15 a 35). Falta: acciones variadas (fase 2), interfaz completa (fase 3), vida propia (fase 4).

**Fase 2 (parcial) hecha el 24/10/2026:** rasgos e intereses de cada persona (E20.5): 8 ejes de carácter, 12 intereses, apariencia, origen familiar y gustos, y la compatibilidad (×0,7 a ×1,4) aplicada ya a las acciones de relaciones. **Falta de la fase 2:** acciones variadas (charlar, ayudar, discutir, hacer las paces; E20.3), que el carácter de la persona decida cómo reacciona, y ajustar la compatibilidad a más acciones si se queda corta.

**Orden:** la base (E20.1 a E20.4) se puede construir con acciones y sin eventos; las partes de pareja, hijos y rupturas (E20.6, E20.7) necesitan el motor de eventos (E18). Se trabaja después de cimentar lo que quede de la fase infantil y antes del motor definitivo de eventos, para que el motor se diseñe sabiendo qué necesitan las relaciones.

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
4. Orden propuesto (22/10/2026, tras cerrar lo previo a E10): **E10 ciclo de vida y oportunidad profesional** (siguiente paso) → E11 ritmo de juego → E12 salud y lesiones → E13 familia y NPCs (con E19.7, entrenador del club como personaje) → E15 interfaz → E14 segundo deporte → E18 eventos y decisiones (con E4/E5) → fases 2 y 3. Pendientes sin fecha: becas (hasta que haya sistema monetario, E16) y optimizaciones de rendimiento (E17).
