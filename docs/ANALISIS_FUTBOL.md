# Análisis: preparación del addon de fútbol

Segunda versión (31/10/2026), **pendiente de aprobar**. No se ha cambiado código. Sustituye al primer análisis del 29/10 (que quedó desfasado al hacerse las fases G a 7 del plan de deportes). Parte de dos documentos del usuario: **`addon_football_v2.json`** (versión 2.1 del addon) y **`desing_stats_personality_system.md`** (diseño de stats, perks y personalidad v0.2, del proyecto original en Godot). Se compara cada cosa con lo que hay en `main` y con `DECISIONES.md`.

---

## 1. El plan de deportes frente a `main`: qué cambió y qué implica para el fútbol

Las fases G a 7 de [`PLAN_DEPORTES_MODULARES.md`](PLAN_DEPORTES_MODULARES.md) están hechas. Encajan con lo propuesto, con estos cambios de diseño (decididos por el usuario en el otro hilo) que el fútbol tiene que respetar:

| Propuesto | Cómo quedó en `main` | Para el fútbol |
|---|---|---|
| Un deporte «practicado» con acciones Empezar/Dejar y lo demás oculto | **No hay «practicado» ni nada oculto.** Se puede hacer cualquier deporte de la partida. El **deporte principal es el del club** al que el personaje entró el último (`deportePrincipal`) | El fútbol se activa **apuntándose a un club de fútbol**. Sin club no hay pestaña ni partidos, pero sí entreno por libre |
| Población híbrida para el fútbol (tu equipo como personas, rivales agregados) | **Todos los niños existen** (~1.100 personas: los del colegio, los de 4 colegios de fuera y los jóvenes de 18-19) y **cada deporte recluta** entre ellos por gustos y aptitud, en equipos con plantilla (`EquipoDeDeporte`). Nadie juega a dos deportes | **Ya no hace falta el modelo híbrido:** los equipos rivales pueden ser personas reales reclutadas. Con unos 90 niños por edad, una liga de 8 equipos de fútbol 7 (unos 12 por equipo, 2 edades) ocupa ~48 por edad: cabe, pero deja poco a los demás deportes (ver §5) |
| Datos por deporte y, dentro, por país | Hecho: `DatosDeDeporte` (categorías, temporada relativa al calendario escolar, competiciones, clubes, sedes, población) con España obligatoria de respaldo | El fútbol aporta sus datos de España (RFEF) y lo demás sale solo |
| Paquetes firmados e instalador | Hecho (`@ds/paquetes`, firma ECDSA, fuentes con GitHub Pages). **Falta la clave:** hay que ejecutar una vez `npm run clave-deportes` y guardar la privada como secreto `DS_CLAVE_PRIVADA` (solo puede hacerlo el usuario); hasta entonces se rechaza todo paquete | El fútbol puede nacer como paquete instalable. El atletismo sigue integrado en el juego |
| Kit de deporte | Hecho; `ConfigDeporte` se quedó en id, nombre, rendimiento y entrenos libres (lo demás pasó a los datos) | El fútbol lo usa para club, entrenador, categorías, verano, tele, sobrecarga y conocimiento |

**Lo que el plan dejó pendiente y el fútbol necesita** (comprobado en el código):

1. **`relaciones` sigue suponiendo que gana quien tiene menos marca** al recibir `competicion.resultado` (`p.mark > r.mark`) y trata a todos los participantes como rivales. En un partido hay compañeros y rivales y gana un equipo. Hay que ampliar el evento (campos opcionales de equipo).
2. **La pestaña del deporte (`DeporteView`) solo sabe de pruebas con puesto y marca.** Hace falta poder enseñar la plantilla, la tabla de la liga y los partidos («Ganado 3-1»).
3. **La temporada (`TemporadaDeDeporte`) solo tiene pretemporada, semifinal y final.** El fútbol base es una **liga a doble vuelta**: hay que admitir otro formato (campo opcional; no rompe al atletismo).
4. **Un equipo por categoría:** hoy un `EquipoDeDeporte` es un club con una plantilla para todas sus edades. Un club de fútbol tiene un equipo por categoría (benjamín, alevín…). Se puede expresar con varios equipos por club, pero conviene que sea explícito.
5. **El chequeo de la simulación solo mide el atletismo** (anotado en la fase 7).

## 2. Lo que de los documentos ya encaja con el juego

- **Las tres capas** (capacidades globales → conocimiento del deporte → habilidades técnicas del addon) son las del juego: `gen.*`, `<deporte>.conocimiento` y las habilidades del módulo.
- **Los 8 ejes de personalidad** son exactamente los de `contracts/rasgos.ts` (disciplina, honestidad, ambición, sacrificio, sociabilidad, agresividad, prudencia, optimismo), de −50 a +50 y nunca visibles como número.
- **Los perks** son los 28 del catálogo (`contracts/perks.ts`), con activos y *pool* de herencia y latentes. El documento dice «29 en 14 pares + 1» pero su propia tabla tiene 28: coincide con el juego.
- **Dominancia (diestro/zurdo) como identidad** y no como perk, **tipo de cuerpo** por hábitos, **altura** como identidad: ya están en `identidad`.
- **Los tres canales del conocimiento** (competir el que más, entrenar con componente táctico, ver/estudiar el que menos y amplificado por la inteligencia) son los del atletismo y los del kit.
- **La posición la asigna el entrenador** y las habilidades técnicas solo se ven con club (`sport_enrolled`): encaja con la pestaña desactivada sin club.
- **Sistemas que evalúan requisitos usan stats reales, nunca derivadas** (§18 del diseño): compatible con el motor.

## 3. Choques con decisiones ya tomadas (hay que decidir)

| # | El documento dice | El juego tiene (y desde cuándo) | Propuesta |
|---|---|---|---|
| 1 | Ids en inglés (`football`, `passing`, `first_touch`…) | **Ids en español** (decidido el 17/10) | `futbol`, `futbol.pase`, `futbol.control`… (tabla en §4). El JSON sirve de diseño; los datos del módulo se escriben con los ids del juego |
| 2 | **El conocimiento es un techo duro:** `techo_técnico = min(límite genético, conocimiento × 1,2)` | **El conocimiento es un bonus/malus** (×0,85 a ×1,15 en lo táctico), no un techo (decidido el 23/10, «el techo duro queda pendiente de decisión») | Decidir: (a) mantener bonus/malus como el atletismo; (b) techo duro solo en el fútbol; (c) techo duro en todos los deportes. Con (b) o (c), un niño de 8 años que empieza con conocimiento 0 tendría techo 0 en todas sus técnicas: haría falta un mínimo (p. ej. techo = máx(15, conocimiento × 1,2)) |
| 3 | **Valor efectivo multiplicativo:** `entrenado × Π(secundaria/100 × 1,2)` | Escala «para su edad»: un niño de 8 tiene sus capacidades en torno a 12 y un adulto típico en torno a 40 | Tal cual hunde los valores: Pase 10 con tres secundarias a 12 da 10 × 0,144³ ≈ 0,03; un adulto típico (40) pierde la mitad por cada secundaria (×0,48). Solo amplifica por encima de 83. La normalización por categoría lo compensa en parte (divide por la media), pero las habilidades con muchas secundarias (Penaltis tiene 5) se disparan en varianza. **Propuesta:** el factor de cada secundaria se mide **frente a lo típico de su edad** (como ya hace el juego con `norm`): típico = ×1, techo ×1,2, suelo ×0,6, y ponderado por el orden de peso |
| 4 | Límite genético = media de los padres × factor ±15 % | **Cada capacidad se hereda de un solo padre ±20 %** (decidido el 22–23/10) | Mantener lo del juego: es genérico, no del fútbol |
| 5 | Rendimiento decreciente por tramos (×1, ×0,5, ×0,2, ×0,05 según cercanía al límite) | Curva continua de rendimientos decrecientes (E2.7: «faltan los tramos») | Mantener la curva; los tramos se pueden añadir al motor más adelante para todos |
| 6 | Decaimiento con multiplicador semanal; **los mentales no decaen** en la vida activa | Caída diaria con días de gracia y suelo; **los mentales sí caen**, muy poco (gracia 10 días, 0,5 %/día, suelo 90 %) | Mantener lo del juego salvo que se quiera aplicar «los mentales no decaen» (cambio general, no del fútbol) |
| 7 | 20 globales: **5 sociales** (sin cooperación) y «rendimiento académico» como global | 18 genéricas con **`cooperacion` provisional «hasta cerrar el diseño del fútbol»** (17/10); lo académico lo lleva el módulo de estudios | El diseño ya cierra el juego en equipo como **derivada** (Juego colectivo = eje sociable × 0,6 + autoridad × 0,4). **Propuesta: quitar `gen.cooperacion`** (hoy la usan estudios, relaciones, el verano del atletismo y la herencia; habría que repartir sus usos) o mantenerla y no usarla en el fútbol. Lo académico se queda como está |
| 8 | Regate tiene como secundaria **«equilibrio» (balance)** | No existe esa capacidad: el propio diseño la eliminó («1:1 con Agilidad + perk Equilibrio natural») | Regate: Agilidad, Creatividad, y el perk `equilibrio_natural`/`desequilibrado` como modificador |
| 9 | Tabla de energía en partido de 5 tramos (×1 a ×0,3) | Ya existe el cansancio general `gen.cansancio` (por debajo de 35 de energía, ×0,5 a ×1) en todas las acciones | Aplicar solo una (si no, se cobra dos veces). **Propuesta:** en el partido, la tabla del addon y no el cansancio general; fuera del partido, el general (era el aviso de E2.9) |
| 10 | Tabla de afinidad entre posiciones por 8 grupos (§14) **y** otra por las 16 posiciones (JSON) | — | Usar la del JSON (más detallada); la de grupos queda como resumen |
| 11 | El diseño cuenta «17 posiciones (16 + portero)» y «36 roles»; el JSON tiene **16 posiciones con portero y 42 roles**. Pase: en §13 sus secundarias son Atención y Comunicación; en §16 y en el JSON, Atención, Visión de juego e Inteligencia | — | Tomar el **JSON** como fuente (16 posiciones, 42 roles, secundarias de §16) |
| 12 | `debut_requirements` (constitución 12, coordinación 10…; umbral 0,6) | No hay fase profesional: E10 está aparcada hasta el motor de eventos | Guardar como dato del addon sin usarlo. Falta saber qué es el umbral 0,6 y en qué escala están los mínimos (en el juego un niño de 8 ya ronda 12) |
| 13 | Estructura de competición: 36 semanas, día de partido 6, 12 partidos en la infancia, 24 en la adolescencia, 38 de profesional | Temporada relativa al calendario escolar; día 6 = **domingo** en el juego (0 = lunes) | 12 partidos = liga de 7 equipos a doble vuelta; 24 = 13 equipos. ¿Día 6 es el domingo o el sábado? Las 36 semanas se ajustan solas al calendario de cada país |
| 14 | Formación: portero, línea 1 ≥ 3, líneas 2+3 ≥ 3, líneas 4+5 ≥ 1 | — | Son reglas de **fútbol 11** (piden al menos 8 de campo). En **fútbol 7** (benjamín y alevín en España, la edad con la que empieza el personaje) hay 6 de campo: faltan sus reglas |
| 15 | En partido, los ejes abren y cierran opciones («Regatear / Tirar / Pasar (desactivado)») | **No hay motor de decisiones** (E18 pendiente) | La primera versión simula el partido sin decisiones del jugador; las decisiones llegan con E18 |
| 16 | La información se filtra por la inteligencia (Persona 5, no Football Manager) | En la alfa se enseñan los números (E3.4 pendiente) | El fútbol enseña lo mismo que el atletismo hasta que exista el filtro |

## 4. Las habilidades del addon en el juego

**40 habilidades** en el JSON: 28 entrenables (14 técnicas de campo, 6 mentales, 2 físicas, 6 de portero) y 12 derivadas (4 mentales, 2 de portero, 4 ocultas). El atletismo tiene 3 más el conocimiento.

| Tipo | Cómo se hace en el juego |
|---|---|
| **Entrenables** (28) | Una `StatDef` por habilidad con `habilidadDeportiva` del kit: tope derivado de sus capacidades, techo por edad, caída. Ids en español: `futbol.pase`, `futbol.control`, `futbol.regate`, `futbol.definicion`, `futbol.tecnica`, `futbol.centros`, `futbol.cabeza`, `futbol.marcaje`, `futbol.entrada`, `futbol.disparo_lejano`, `futbol.faltas`, `futbol.penaltis`, `futbol.corners`, `futbol.saque_banda`; mentales `futbol.vision`, `futbol.posicionamiento`, `futbol.desmarque`, `futbol.anticipacion`, `futbol.decisiones`, `futbol.sangre_fria`; físicas `futbol.arrancada`, `futbol.salto`; portero `futbol.reflejos`, `futbol.mano_a_mano`, `futbol.blocaje`, `futbol.despeje`, `futbol.alcance_aereo`, `futbol.dominio_area` |
| **Derivadas** (6 visibles) | **No son stats:** se calculan al vuelo (como el valor efectivo del atletismo) con los ejes pasados de −50..+50 a 0..100. Agresividad en juego, Liderazgo en campo, Juego colectivo, Creatividad en partido, Comunicación de portero, Excentricidad |
| **Ocultas** (4) | Igual, solo para el motor del partido: Consistencia (varianza partido a partido), Dureza (faltas), Partidos grandes (rendimiento en los importantes), Bajo presión (momentos de tensión) |
| **Conocimiento** | `futbol.conocimiento`, con el kit |
| **Secundarias** | Las que son capacidades salen de `gen.*`; las que son técnicas (Visión, Anticipación, Sangre fría, Salto, Técnica) se leen de la propia habilidad; la **altura** sale de `identidad` |

**Transferencias de entrenamiento** (§15 del diseño), con la regla 4 (un módulo no toca las habilidades de otro):

- **Técnica → técnica relacionada (15–25 %):** dentro del fútbol, sin problema. Falta definir qué es «relacionada» (¿que compartan secundarias? ¿la misma categoría?).
- **Técnica → capacidad (3–5 %):** con `ctx.train(gen.*)`, como hace ya el atletismo.
- **Capacidad → técnica (10–20 %):** el fútbol escucha las acciones de otros módulos (`accion.realizada`, por ejemplo el gimnasio con la etiqueta `fuerza`) y entrena sus técnicas con esa capacidad como secundaria. Se puede, pero sube el coste de cada acción del juego: hay que medirlo.

**Experiencia por posición (16) y por rol (42)**, con las afinidades del JSON: estado propio del fútbol (números por posición y rol, unos 60 valores). La afinidad entre roles está «pendiente» en los dos documentos: se empieza con 1 para el mismo rol y 0 para los demás, como dice el JSON.

## 5. La gente del fútbol

- **Reclutamiento:** el fútbol aporta su `PoblacionDeDeporte` (etiqueta `futbolista`, capacidades de las que sale su potencial, equipos con plantilla, entrenadores) y `npcs` recluta como para el atletismo, primero los interesados en el fútbol (el interés `futbol` ya existe).
- **Cuántos:** una categoría de fútbol 7 con 8 equipos de 12 son 96 niños para dos edades; una de fútbol 11 con 10 equipos de 18, 180. Con unos 90 niños por edad entre 8 y 17 años, el fútbol 11 **no cabe** con personas reales si cada equipo tiene sus 18 de cada categoría. Opciones: ligas más pequeñas en las edades altas, plantillas cortas con jugadores genéricos de relleno (como los «Corredor N» del atletismo cuando no hay personas), o más niños en la ciudad (coste de guardado: ~950 bytes por persona).
- **Nivel de cada jugador:** hoy una persona tiene un solo nivel por deporte (`levels.futbol`). Su posición y su perfil (qué técnicas tiene mejor) pueden salir de sus 18 capacidades (ya las tiene) con un azar estable, sin guardar 28 habilidades por persona.
- **Normalización por categoría:** la media de la categoría sale del nivel de los jugadores de esa categoría.

## 6. Lo que falta en los documentos para hacer el addon

1. **Cómo se resuelve un partido:** de los valores precalculados al marcador, los minutos, los goles y la nota del jugador. Propuesta: fuerza de cada equipo por líneas, goles con una distribución de Poisson según la diferencia, y la nota y las acciones del jugador según su posición y sus valores en partido.
2. **La convocatoria:** cómo decide el entrenador titular, suplente o no convocado (nivel en su posición frente a los compañeros, asistencia a los entrenamientos, relación con él). Es lo que hace distinto al fútbol del atletismo.
3. **Qué acciones hay y qué entrena cada una:** sesión de club, entreno por libre (técnica con balón, tiro, físico, porteros), ver fútbol, verano. Y cuánto sube cada habilidad.
4. **Fútbol 7:** posiciones (¿las mismas 16 o un subconjunto?), reglas de formación y en qué edades.
5. **Categorías y temporada de España** (RFEF: prebenjamín, benjamín, alevín, infantil, cadete, juvenil), clubes y horarios, el campo (lugar nuevo) y la jornada.
6. **Lesiones por contacto:** E12 está pendiente; el fútbol las hará más visibles.

## 7. Cómo se montaría (propuesta)

- **Módulo `modules/futbol`** con el kit, tipo `equipo` en su ficha, empaquetable como los de prueba de la fase 7:
  - `datos.ts`: datos de España (categorías, temporada en liga, clubes, sedes, población), posiciones, roles y afinidades del JSON con ids en español.
  - `habilidades.ts`: las 28 `StatDef` y las secundarias de cada una.
  - `derivadas.ts`: derivadas y ocultas, funciones puras.
  - `partido.ts`: el motor del partido, funciones puras (con tests y sin estado).
  - `plantilla.ts`: equipos, convocatoria y posición.
  - `index.ts`: el módulo (acciones, servicio `deporte.futbol`, eventos `futbol.convocatoria`, `futbol.partido`).
- **Antes del fútbol, cambios pequeños en el vocabulario común** (§1, puntos 1 a 4): resultado de equipo en `competicion.resultado`, secciones libres en la pestaña, liga en la temporada y equipos por categoría. Son campos opcionales: no rompen al atletismo ni a los paquetes ya hechos.

**Fases del fútbol** (cada una, un PR):

| Fase | Qué |
|---|---|
| F0 | Vocabulario común: resultado de equipo, secciones en la pestaña, liga en la temporada, equipos por categoría |
| F1 | Habilidades, conocimiento, entreno por libre y club del colegio (con el kit) |
| F2 | Gente del fútbol, equipos por categoría y liga con partido simulado (fuerza por líneas, marcador, nota), convocatoria y pestaña con tabla de liga |
| F3 | Posiciones, roles y experiencia con afinidades; formaciones de fútbol 7 y 11 |
| F4 | Derivadas y ocultas en el partido; transferencias de entrenamiento |
| F5 | Clubes de fuera con prueba de acceso, jugar con los mayores, verano, tele, goleadores |
| F6 | Decisiones dentro del partido con los ejes, cuando exista el motor de eventos (E18) |

## 8. Preguntas para decidir

1. **Conocimiento:** ¿bonus/malus (como el atletismo) o techo duro como dice el diseño? Si es techo, ¿solo en el fútbol o en todos los deportes? (§3, punto 2)
2. **Valor efectivo:** ¿vale la propuesta de medir cada secundaria frente a lo típico de su edad, con ×1 para lo típico y ×1,2 de techo? (§3, punto 3)
3. **`gen.cooperacion`:** ¿se quita ahora que el juego en equipo es una derivada, o se mantiene? (§3, punto 7)
4. **Energía en el partido:** ¿la tabla del addon en lugar del cansancio general? (§3, punto 9)
5. **Fútbol 7:** ¿en qué edades, con qué posiciones y qué reglas de formación? (§3, punto 14)
6. **Plantillas en fútbol 11:** ¿ligas más pequeñas, jugadores genéricos de relleno o más gente en la ciudad? (§5)
7. **Día de partido:** ¿el 6 del JSON es el domingo o el sábado?
8. **`debut_requirements`:** ¿en qué escala están los mínimos y qué significa el umbral 0,6?
9. **Fuente de datos:** ¿el JSON del addon se queda como documento de diseño y los datos del módulo se escriben con los ids del juego (propuesta), o quieres que el módulo lea un JSON con ese formato?
10. **Mentales sin caída:** el diseño dice que las capacidades mentales no decaen en la vida activa y en el juego decaen muy poco. ¿Se cambia (para todo el juego)? (§3, punto 6)
