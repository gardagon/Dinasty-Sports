# Borrador de documentación — cierre de E9 (tres fases)

**Estado: PENDIENTE DE APROBACIÓN.** Nada de esto está aún en `DECISIONES.md`, `BACKLOG_STATS.md`, `ARQUITECTURA.md` ni `README.md`.
Si el resultado se aprueba, se copia cada bloque a su archivo, se rellenan los puntos marcados con **[CONFIRMAR]** y se borra este borrador.

Resultados de referencia (rama `claude/dinasty-sports-repo-access-cewr0r`, sin fusionar):

| Fase | Tests | Simulación 1 año | Simulación 3 años | Simulación 10 años |
|---|---|---|---|---|
| 1. Categorías, rivales por edad, subida de categoría | 62 | 13 chequeos ✅ | 12 ✅ | 1 ⚠️ (especialista vs equilibrado, 91,0 contra 91,3) |
| 2. Asignaturas por etapa | 72 | 13 ✅ | — | 2 ⚠️ (especialista en estudios; carreras sin competencia) |
| 3. Clubes | 86 (con la prueba de partidas antiguas) | 13 ✅ | 1 ⚠️ (atleta 66,9 contra 67,0) | 2 ⚠️ (especialistas empatados con el equilibrado) |

---

## 1. Bloque para `docs/DECISIONES.md` (entrada nueva al principio)

```markdown
## DD/MM/2026 — Cierre de E9: categorías, rivales por edad, asignaturas por etapa y clubes

### Fase 1 — Categorías, rivales y desarrollo con la edad
- **Categorías de la federación española de atletismo** (sub-10, sub-12, sub-14, sub-16, sub-18, sub-20, sub-23, absoluta), como dato en el módulo de atletismo; el personaje compite en la que le toca por edad. Las categorías son un dato por país y deporte (`categories.ts` en contracts).
- **Rivales por edad:** población de 96 NPC (8 por edad, de 8 a 19 años) con fecha de nacimiento. Cada curso se van los de 20 años, algún niño de 13 o menos deja el deporte (10 % por curso) y entran niños nuevos de 8. Los rivales son desconocidos hasta que compiten contra ellos y solo aparecen en Relaciones entonces.
- **Desarrollo con la edad, igual para todos:** `madurezPorEdad` (contracts) da la fracción de capacidad adulta alcanzable: 0,38 a los 8 años, 0,52 a los 10, 0,66 a los 12, 0,8 a los 14, 0,93 a los 16 y 1 a los 18. Es el techo de lo físico del jugador (estado oculto `gen.madurez`, con el adelanto o retraso propio) y de sus habilidades de atletismo. El nivel máximo de un rival a cada edad es su potencial × (0,3 + 0,7 × madurez): más plano porque ya llevan años entrenando.
- **Subida de categoría:** el entrenador propone competir en la categoría superior solo si destacas mucho en la tuya (podio en 3 de las últimas 5 carreras con al menos 4 hechas) y serías competitivo arriba (tu nivel alcanza la mediana de la categoría superior). El jugador acepta con una acción; puede volver a su categoría cuando quiera. Si cambia la categoría por edad, la subida se reinicia.
- **Competir contra mayores desarrolla más:** tras cada carrera, lo que se aprende crece con lo fuertes que son los rivales frente al nivel propio (ritmo, salida y conocimiento).
- **Los 3 mejores rivales de la categoría corren siempre las primeras 8 carreras en ella**; después la serie de 8 rota.
- **Nuevo chequeo en la simulación:** "Los niños no tienen nivel de adulto" (ningún rival de 11 años o menos pasa de 75).
- **Cifras (un año):** atleta 5 % de victorias y 32 % de podios; equilibrado 21 % de podios. El mejor rival de 11 años o menos acaba en 66,6.

### Fase 2 — Asignaturas por etapa
- **Currículo de España** (`curriculo.ts`, como dato): diez cursos, de 3.º de primaria (8 años) a 2.º de bachillerato, con 19 asignaturas. Primaria: lengua, matemáticas, ciencias naturales, ciencias sociales, inglés, educación física y educación artística. ESO: biología y geología, geografía e historia, tecnología, música (1.º y 2.º) y física y química (desde 2.º). Bachillerato: comunes más una modalidad (ciencias o humanidades).
- **Cambios de etapa:** ciencias naturales pasa a biología y geología, ciencias sociales a geografía e historia, artística a música, y en bachillerato física y química a física y química, historia a historia de España, etc. La asignatura nueva **hereda el nivel** de la que sustituye; las que no tienen antecesora (tecnología, filosofía, economía) parten de un 5. Al empezar curso se avisa de lo que entra y lo que sale.
- **Modalidad de bachillerato:** se elige sola al empezar según las notas (ciencias si las asignaturas de ciencias superan a las de letras). **[CONFIRMAR]** si debe ser una decisión del jugador cuando exista el sistema de decisiones.
- **Nota inicial:** todas las asignaturas parten de un 5 (nivel 38 a 42). La inteligencia y el trabajo marcan la evolución mediante el ritmo de subida y el techo de cada asignatura. No hay ventaja inicial para los inteligentes.
- **Solo puntúan y se estudian las asignaturas del curso:** clase, repaso, controles de los viernes, evaluaciones y nota media usan las activas; las demás quedan guardadas.
- **Cada curso exige un poco más:** con el mismo nivel, la nota baja 0,15 por curso. **[CONFIRMAR]** valor.
- **Servicio de estudios ampliado** con las asignaturas activas y el nombre del curso. La interfaz muestra el curso y solo las asignaturas del curso.
- **Controles de los viernes en tabla** (asignatura y nota).
- **Cifras (un año):** estudios del equilibrado 68,1 (+28,0); empollón 77,0; nota media del equilibrado 7,3 y del vago 6,0.

### Fase 3 — Clubes
- **Módulo nuevo `clubes`:** catálogo de España como dato. Club deportivo del colegio (calidad 1), Club Atletismo Ciudad (calidad 2, desde 10 años y nivel 45) y Club de Alto Rendimiento (calidad 3, desde 14 años y nivel 65). Un club puede ofrecer varios deportes; hoy solo atletismo.
- **Reparto de responsabilidades:** el módulo guarda membresías y calidad. Los deportes ponen el contenido de las sesiones y las pruebas, y piden entrar o salir con los eventos compartidos `club.unirse` y `club.salir`. Servicio `clubes` (clubes de un deporte y membresía).
- **Club del colegio:** se empieza sin club; el personaje se apunta los días de clase de 14 a 19 (modo historia). Sesiones los lunes y miércoles de 15 a 17.
- **Sesiones con el club:** 2 horas, una al día, con técnica, ritmo, salida, velocidad, resistencia, coordinación y conocimiento (1,6, la mejor fuente). La eficiencia sube con la calidad del club: ×1 en el colegio, ×1,12 en el de la ciudad y ×1,25 en el de alto rendimiento.
- **Entrenar por tu cuenta sigue existiendo** pero rinde ×0,85 (sin entrenador ni grupo).
- **Pruebas de acceso a los clubes de fuera:** edad mínima, y nivel con algo de azar; si no pasas, no se puede repetir hasta pasadas 8 semanas. Un solo club por deporte (entrar en uno de fuera deja el anterior). Se puede dejar el club.
- **Clasificación con club** de cada corredor y el del jugador. Los rivales tienen club (nombres ficticios).
- **Cifras (un año):** los 13 chequeos en verde; atleta 11 % de victorias... **[RELLENAR con la última simulación al aprobar]**.

### Problemas conocidos y mejoras
- **Saturación a 10 años (importante):** el techo por edad iguala a todo el que entrena (jugador de 18 años ≈ 92 en atletismo), así que el especialista no se distingue del equilibrado, y el jugador supera a los rivales de 18 a 19 años (potencial medio 79). Falta un **potencial individual del jugador** (E2.7) con distribución parecida a la de los rivales, y/o que el progreso dependa del volumen entrenado.
- **Verano según notas** (academia, campamento, amigos) y **clasificatorias/finales** siguen pendientes (E9.10 y E9.11).
- **Repetir curso, becas, entrenador de club externo como NPC, cuotas** y clubes de otros deportes: pendientes.
- **Subida de categoría:** no hay penalización por ser más pequeño que los mayores; los bots no la usan.
- **Rendimiento del motor:** de 330 a unos 850 ms por año simulado por los 96 rivales, 19 asignaturas y los clubes. Dentro del límite (3000 ms); optimizable.
- **Partidas antiguas:** cargan y funcionan (test incluido) pero los rivales antiguos no tienen edad, así que las series se completan con corredores genéricos; para ver todo conviene una partida nueva.
- **Edades de los rivales:** el curso dura 364 días y los años de edad 365; puede haber algún rival de más en una edad.
```

## 2. Cambios para `docs/BACKLOG_STATS.md`

- E9.4 ✅ (categorías por edad de la federación española + cursos por edad).
- E9.8 ✅ (desarrollo realista con la edad, renovación por cohortes, subida de categoría).
- E9.9 ✅ (competir contra mayores desarrolla más).
- E6.4 ✅ y E6.5 ✅ (currículo por etapas y nota inicial de 5; ver decisión sobre la ventaja inicial de los inteligentes).
- E19.1 ✅ (club del colegio), E19.2 ✅ (clubes de fuera con prueba), E19.3 ✅ parcial (varios deportes: soportado en datos, solo atletismo), E19.4 ✅ (calidad del club), E19.5 ✅ parcial (rivales con club) y E19.6 pendiente (ojeadores y eventos).
- E9.10 (verano según notas) y E9.11 (clasificatorias) siguen pendientes.
- Añadir **E2.7** como bloqueante de la fase 1 completa (potencial individual del jugador) por el problema de saturación.
- Orden propuesto: actualizar quitando lo hecho.

## 3. Cambios para `docs/ARQUITECTURA.md`

- Sección nueva **Categorías y desarrollo con la edad:** `CategoriaDef` y `categoriaDeEdad` en contracts; `madurezPorEdad`; `gen.madurez` como techo de lo físico; rivales con edad.
- Sección nueva **Currículo escolar:** datos por curso, herencia entre asignaturas, solo puntúan las activas, servicio `estudios` ampliado.
- Sección nueva **Clubes:** módulo `clubes`, eventos `club.unirse` y `club.salir`, servicio `clubes`, etiqueta `club`, cómo un deporte define sus sesiones y pruebas.
- En "Resultados con tabla": nuevo campo `align` y su uso en tablas con varias columnas.

## 4. Cambios para `README.md`

- Tabla de carpetas: añadir `modules/clubes`; actualizar la descripción de `modules/npcs` (96 rivales por edad con renovación) y `modules/estudios` (currículo por etapas).
- Comando `npm run sim:largo` ya está; mencionar que `--dias 3650` simula la etapa completa de 8 a 18 años.
