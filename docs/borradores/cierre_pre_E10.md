# Borrador de documentación — cierre previo a E10 (potencial, bots, verano y campeonato)

**Estado: PENDIENTE DE APROBACIÓN.** Nada de esto está aún en `DECISIONES.md`, `BACKLOG_STATS.md`, `ARQUITECTURA.md` ni `README.md`.
Si se aprueba, se copia cada bloque a su archivo y se borra este borrador.

Resultados de referencia (rama `claude/dinasty-sports-repo-access-cewr0r`, sin fusionar; 106 tests):

| Fase | Contenido | Tests | Sim 1 año | Sim 3 años | Sim 10 años |
|---|---|---|---|---|---|
| A | Tope genético individual por habilidad | 93 | 13 ✅ | — | 12 ✅ y 1 aviso (carreras) |
| B | Bots que suben de categoría | 94 | — | — | — |
| C | Verano según notas | 101 | 13 ✅ | 13 ✅ | — |
| D | Clasificatoria y final; categoría por edad de temporada | 106 | 13 ✅ | 13 ✅ | 13 ✅ |

---

## 1. Bloque para `docs/DECISIONES.md` (entrada nueva al principio)

```markdown
## DD/MM/2026 — Antes de E10: potencial individual, bots, verano según notas y campeonato

### Tope genético individual por habilidad (E2.7)
- **Cada habilidad tiene un tope genético oculto**, sorteado al crear la partida: media 79 y desviación 9 (la misma distribución que el potencial de los rivales), entre 45 y 100. Cuando haya padres saldrá de la herencia.
- **Por familia:** el 60 % de la genética se comparte dentro de una familia (quien tiene buena genética física la tiene en casi todo lo físico) y el resto es propio de cada habilidad. Familia `fisico`: las 6 capacidades físicas y las 3 habilidades de atletismo. Familia `intelecto`: las 19 asignaturas.
- **El tope hace dos cosas:** ninguna habilidad pasa de él, y **a igual entrenamiento sube más rápido quien tiene un tope más alto**: velocidad × (tope / 79)², entre ×0,5 y ×1,6 (tope 92 → ×1,36; tope 70 → ×0,79).
- **El jugador no lo ve:** el techo que enseña la interfaz sigue siendo el de la edad y las capacidades. Servicio de pruebas: `Game.hiddenPotential`.
- **Resultado:** a 10 años ya no todos acaban en el mismo techo (~92): el jugador de 18 años queda en ~82, parecido al potencial medio de los rivales (79).
- **Simulación:** la comparación "el especialista supera al equilibrado" se hace al cabo del primer curso, porque a más años todos llegan a su tope.
- **Efecto secundario:** el balance de estudios baja un poco (equilibrado 68,1 → 61,6; nota media 7,3 → 6,8) porque las asignaturas también tienen tope y velocidad individuales.

### Bots que suben de categoría
- Los bots que entrenan en serio aceptan la propuesta del entrenador cuando está disponible, y vuelven a su categoría si sus últimos tres resultados allí son de media tabla para abajo. Al cabo de 3 años, el bot atleta compite en la categoría superior en 4 de cada 8 semillas.

### Verano según las notas (E9.10)
- **Nota media del curso < 5:** **academia obligatoria** en verano (de lunes a viernes de 10 a 13, una sesión al día). Sesiones exigidas: 25 más 6 por cada punto de nota que falte para el 5 (máximo 45). Cada sesión refuerza las tres asignaturas más flojas. Faltar a un día de academia cuenta como falta y sube el estrés. Al terminarla se acaba el castigo (+6 de motivación). **No se repite curso:** si el verano acaba sin terminarla, se empieza el curso con las asignaturas flojas, −8 de motivación y +10 de estrés.
- **Nota ≥ 7,5:** puede pedir a sus padres un **campamento de atletismo** (jornada de 5 horas, una al día, de 9 a 14, ×1,2 de eficiencia, la mejor fuente de mejora y de conocimiento).
- **Entre medias:** **practicar con los amigos** (2 horas al día, menos mejora que entrenar pero baja el estrés y sube carisma y cooperación).
- **Servicio de estudios ampliado** con `summerPath`. Pedir permiso a los padres queda como acción directa hasta que existan la familia (E13.1) y las decisiones (E18).

### Clasificatoria autonómica y final del campeonato (E9.11)
- **Clasificatoria autonómica** (sábado de la semana 25 del curso): 16 corredores (el jugador y 15 de su categoría). Los 8 primeros se clasifican. Ese sábado no hay carrera semanal.
- **Final del campeonato de España** (sábado de la semana 39): 8 corredores, los 7 mejores de la clasificatoria y el jugador si se clasificó; hay medallas (oro, plata y bronce). Quien no se clasifica sigue con su carrera semanal. El campeonato empieza de cero cada curso.
- Dan más motivación y conocimiento que una carrera normal. Se guardan en un historial aparte y no cuentan para la subida de categoría.

### Categoría por edad de temporada
- **La categoría se decide con la edad que se tenía el primer día del curso,** como en la federación (antes se usaba la edad actual y las categorías se vaciaban de rivales con los cumpleaños). Los servicios `identidad` y `npcs` publican esa edad (`seasonAge` y `age`).

### Respuestas y pendientes
- Pendiente: entrenador del club como personaje (E19.7), becas (hasta que haya sistema monetario), optimizaciones de rendimiento (~960 ms por año simulado).

### Problemas conocidos
- **Las asignaturas comparten la misma distribución de tope que el deporte** (media 79); quizá convenga una distinta, y que dependa de la inteligencia.
- **Practicar con los amigos sube el atletismo del bot vago** de 0 a ~21 en un año (+10): conviene vigilar que no sustituya a entrenar.
- **A 10 años el bot atleta sube menos al podio que el equilibrado** (35 % frente a 48 %) porque pasa a categorías superiores, donde los rivales son más fuertes. Es el efecto buscado (más riesgo, más desarrollo), pero habrá que ver si compensa en el balance.
- **El campeonato es único** (autonómico y nacional en dos citas): sin fases intermedias ni distintos niveles por categoría.
```

## 2. Cambios para `docs/BACKLOG_STATS.md`

- E2.7 ✅ (tope genético individual por habilidad, con el progreso ligado al tope; falta que salga de padres, E8).
- E9.10 ✅ y E9.11 ✅ (campeonato en dos citas; sin eventos especiales).
- Añadir: "bots que suben de categoría" ✅ (nota en E9.8).
- E19.7 (entrenador del club como personaje) y becas (E16) siguen pendientes; optimización de rendimiento pendiente (E17).
- Orden propuesto: quitar "antes de E10" y dejar E10 como siguiente paso.

## 3. Cambios para `docs/ARQUITECTURA.md`

- Sección nueva **Tope genético individual:** `StatDef.genetics` (familia, media y desviación), `GameState.potential` y `families`, cómo limita el techo y acelera el progreso, y que la interfaz no lo muestra.
- En **Calendario escolar:** semana de la clasificatoria y de la final (atletismo), y que la categoría usa la edad de temporada.
- En **Currículo escolar:** el camino de verano según las notas (`summerPath`) y la academia obligatoria.

## 4. Cambios para `README.md`

- Sin cambios en la tabla de carpetas. Opcional: una línea sobre el verano y el campeonato en la introducción.
