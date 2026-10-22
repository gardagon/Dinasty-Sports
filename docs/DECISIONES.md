# Registro de decisiones

Lo que se decidió y por qué, para que cualquier sesión futura (persona o IA) tenga el contexto.
Añade una entrada nueva al principio cuando tomes una decisión de diseño o de balance.

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
