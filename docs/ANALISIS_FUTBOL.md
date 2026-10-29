# Análisis: módulo de fútbol y cómo separar los deportes del resto del juego

Primer análisis (29/10/2026), **pendiente de aprobar**. No se ha cambiado código. Recoge lo que hay hoy, qué del atletismo vale para cualquier deporte, qué está atado al atletismo fuera de su módulo y una propuesta por fases para el fútbol. Al final, las preguntas que hay que decidir antes de empezar.

Contexto previo: `BACKLOG_STATS.md` (E7 competición de equipo, E14 segundo deporte, E15.1 elegir deporte, E19 clubes), `ANEXO_DEPORTE.md` §6 («deportes de equipo: partidos, tablas de liga y plantillas»), `ALMACENAMIENTO.md` §4 (población y guardado con deportes de equipo) y `DECISIONES.md` del 22/10 (fútbol como segundo deporte) y del 17/10 (`cooperacion` provisional hasta el diseño del fútbol).

---

## 1. Qué ya sirve para cualquier deporte

| Pieza | Dónde | Estado para el fútbol |
|---|---|---|
| Pestaña «Deporte» genérica (`deporte.<id>`, `DeporteView`) con selector si hay varios | `contracts/deporte.ts`, `apps/web/src/deporte.ts` | Sirve, pero el contrato está pensado para pruebas con puesto y marca (ver §3.6) |
| Evento compartido `competicion.resultado` | `contracts/events.ts` | Sirve con matices: supone que menos marca es mejor (ver §3.6) |
| Membresía de clubes por deporte, `club.unirse` / `club.salir` / `club.abandono` | `modules/clubes` | Sirve; el catálogo y los horarios no (ver §2) |
| Etiquetas comunes (`entrenamiento`, `competicion`, `club`, `fisico`, `cardio`…) | `contracts/tags.ts` | Sirve: modificadores ajenos (relaciones, perks, clubes) se aplican solos |
| Categorías por edad, edad de competición, madurez y curvas por edad | `contracts` (`categoriaDeEdad`, `edadDeCompeticion`, `factorPorEdad`) | Sirve: el fútbol solo aporta su tabla de categorías |
| Habilidades derivadas de genéricas con tope por herencia y edad | `StatDef.genetics.derivedFrom`, `growth.potentialFactor` | Sirve tal cual |
| Conocimiento del deporte como bonus/malus | `atletismo.conocimiento` | El patrón sirve; hoy está escrito dentro de atletismo |
| Conocimiento de crianza por los padres | `contracts/herencia.ts` (`conocimientoDeCrianza(padres, deporte)`) | Sirve: ya da un tercio si los padres practicaron otro deporte; `familia` ya sortea el fútbol como deporte de los padres |
| Azar estable por persona (`rngEstable`) | `contracts/rng.ts` | Sirve para sortear plantillas y partidos sin depender de lo que haga el jugador |
| Bots que eligen por etiquetas | `sim/src/bots.ts` | Sirve… y por eso es un riesgo (ver §2, punto 7) |

## 2. Qué está atado al atletismo fuera de su módulo

La regla de que un módulo solo importa `contracts` se cumple, pero **el atletismo se ha filtrado como contenido** en sitios que deberían ser genéricos. Para un segundo deporte hay que soltar estos nudos:

1. **`modules/npcs` (el más grande).** Los 108 rivales (`rival_*`, etiqueta `atleta`, `levels.atletismo`, `potential.atletismo`, `APTITUD_ATLETISMO`), los entrenadores (etiqueta `atletismo`, «Entrenador de atletismo», `ENTRENADORES_DE_CLUBES`), el equipo de atletismo del colegio (16 alumnos), los hermanos que empiezan atletismo a los 8 años, `NOMBRES_DE_CLUB` y `clubes.list('atletismo')`. Lo bueno: el progreso diario de los niveles ya es genérico (recorre `levels` con `potential` y `ritmo` por disciplina); lo que está atado es **la generación**.
2. **`modules/clubes`.** El catálogo solo tiene atletismo y **los horarios son del club, no de la sección** (`ClubView.sesiones`): el club del colegio no puede entrenar fútbol en otro horario que atletismo. Hace falta `secciones` por deporte (horario, acceso y entrenadores de cada una).
3. **`contracts/rasgos.ts` (`aptitudDe('deporte')`).** Usa `niveles.atletismo` para saber si alguien ayuda en el deporte. Debería usar el nivel del deporte de la actividad.
4. **`contracts/agendas.ts` y `contracts/lugares.ts`.** El tipo `hermano` «practica atletismo (corre los sábados en el estadio)»; el estadio es «de atletismo»; solo hay pista. Faltan un campo de fútbol (en el colegio y fuera) y agendas de jugadores y entrenadores de fútbol.
5. **`modules/relaciones` al recibir `competicion.resultado`.** Supone que gana quien tiene menos marca (`p.mark > r.mark`) y que los participantes son rivales: en un partido hay compañeros y rivales, y gana el equipo.
6. **Verano.** El campamento y «practicar con los amigos» son acciones de atletismo; `summerPath` (estudios) ya es genérico.
7. **`sim/`.** Los bots usan ids `atletismo.*` (apuntarse, subir de categoría, campamento, tele) y `analysis.ts` mide solo atletismo. Y como el bot entrena todo lo que tenga la etiqueta `entrenamiento`, **en cuanto haya fútbol disponible los bots lo entrenarán también**, se repartirá el tiempo y cambiarán todos los chequeos del atletismo. Es la razón práctica más fuerte para la «puerta» de §3.1.
8. **No existe «elegir deporte».** Hoy el atletismo está siempre activo: se entrena por libre sin club y la pestaña solo se apaga hasta apuntarse a un club. Con dos deportes siempre activos, la lista de acciones se duplicaría.
9. **`modules/atletismo/src/index.ts` mezcla plantilla y deporte** (1 183 líneas). Casi la mitad es genérica de cualquier deporte con club: apuntarse, pruebas de acceso y plazas ofrecidas, dejar el club, sesión con llegada tarde y «no se entrena por libre durante la sesión», pedir consejo al entrenador, sobrecarga, conocimiento, campamento y amigos en verano, verlo en la tele, subir y volver de categoría, conocimiento de crianza. Lo propio del atletismo es el rendimiento, la marca de 400 m, la carrera con series y la clasificación por marcas.

## 3. Propuesta

### 3.1 La puerta: el deporte solo existe si el jugador lo elige

- **Estado «deportes que practico»** con eventos compartidos nuevos `deporte.empezar` y `deporte.dejar` y un servicio `practica` (`practica(id)`, `deportes()`). Lo guarda un módulo pequeño nuevo, `deportes`, para no tocar `personaje` ni `clubes` (que tienen otro trabajo).
- **Cada deporte se apaga solo** si no se practica: sus acciones no salen en la lista (ni grises), no corre su lógica diaria, su pestaña no aparece y sus PNJs propios no se ven en «Gente». Se haría con una ayuda en contracts del estilo de `ligarALugares` (`soloSiPractica(deporte, acciones)`); si hace falta que la acción no salga ni en gris, un campo genérico `ActionDef.oculta(ctx)` en el motor (no sabe de deportes).
- **Dónde se elige:** al crear la partida (E15.1: el formulario ya tiene país y sexo) y, durante el juego, en la administración del colegio o en la sala de un club («Empezar a jugar al fútbol», «Dejar el fútbol»). Para pasar las opciones de la nueva partida a los módulos hace falta un dato genérico en el motor (`CreateOptions.opciones` → `InitContext.opciones`).
- **Sin regresión:** hasta que exista el selector, una partida nueva empieza **practicando atletismo** (lo de hoy). La simulación debe dar exactamente lo mismo con la puerta puesta.

### 3.2 «Despegar» los deportes: un kit de deporte

Opciones valoradas:

| Opción | A favor | En contra |
|---|---|---|
| A. Copiar atletismo y cambiarlo | Rápido | ~500 líneas duplicadas que divergen; cada arreglo, dos veces; con el tercer deporte, tres |
| B. Meter la plantilla en `contracts` | No cambia reglas | `contracts` es «la ley»: vocabulario y funciones puras; las fábricas de acciones son lógica de juego |
| C. **Paquete nuevo `packages/kit-deporte` (`@ds/kit-deporte`)** | Lo común en un sitio, sin estado ni módulo propio; cada deporte sigue siendo un módulo aislado | Cambia la regla 1: un módulo podrá importar `@ds/contracts` **y** `@ds/kit-deporte` |
| D. Módulo «deportes» que hace las sesiones de todos y pide los datos por servicios | Sin cambiar reglas | Acoplamiento en tiempo de ejecución, más difícil de leer y de probar; el módulo central acaba sabiendo de todos |

**Recomiendo C.** El kit solo importa `contracts` (lo vigila `tests/arquitectura.test.ts`, con una regla nueva) y ofrece fábricas configurables y funciones puras:

- `habilidadDeportiva(...)` y `conocimientoDe(deporte)` (las `StatDef` de hoy).
- `accionesDeClub(cfg)`: apuntarse al del colegio, prueba de acceso, aceptar plaza, dejar el club; `sesionDeClub(cfg)` con llegada tarde y bloqueo del entreno libre; `pedirConsejo(cfg)`; `entrenadorDelJugador`.
- `categoriaDelJugador`, subir y volver de categoría.
- Modificadores comunes: sobrecarga, conocimiento, por tu cuenta, campamento.
- Verano (campamento y amigos), verlo en la tele, conocimiento de crianza el primer día.
- Utilidades de la pestaña: recorte de clasificaciones, tablas.

Cada deporte guarda en su estado unos campos comunes (`EstadoBaseDeDeporte`: última sesión, consejo, ofertas, pruebas, sesiones de hoy, tele, verano…) que el kit lee y escribe a través del `ctx` del propio módulo, así que **la regla 5 se mantiene** (el estado solo lo toca su módulo, aunque sea con código del kit).

**El primer paso es refactorizar atletismo sobre el kit sin cambiar nada**: mismos ids, mismo orden de tiradas del azar y `npm run sim` idéntico antes y después (es la prueba de que el kit es correcto). El fútbol se escribe después, ya con el kit.

### 3.3 Población por deporte sin que `npcs` sepa de deportes

Hoy un módulo no puede preguntar «qué deportes hay». Propuesta genérica en el motor: **aportes declarativos**. Un módulo declara datos para un punto de extensión (`GameModule.aportes: { 'npcs.poblacion': [...], 'clubes.secciones': [...] }`) y el registro los junta; quien los consume los lee con `ctx.aportes<T>(clave)`. El motor no sabe qué son (igual que no sabe qué es un servicio).

- `npcs` leería las **especificaciones de población** de cada deporte (etiqueta, edades, cuántos por edad, de qué capacidades sale su potencial, aptitud, clubes, sesgo de carácter e intereses) y generaría con ellas lo que hoy hace a mano para el atletismo. El atletismo pasa a ser un dato (mismo resultado con la misma semilla: hay que cuidar el orden del azar o generar los nuevos deportes al final, como ya se hizo con bibliotecarios y entrenadores).
- `clubes` leería las **secciones** que aporta cada deporte (club, horario, acceso, sede).
- `familia` podría leer los deportes reales en vez de su lista fija.

### 3.4 Cuánta gente: el fútbol no cabe como el atletismo

En atletismo hay 18 rivales por categoría. En fútbol una categoría es una liga de ~10–14 equipos con 12–20 jugadores: unas **200 personas por categoría y más de 1 000 en la cantera**. Con ~950 bytes por persona y el aviso de `ALMACENAMIENTO.md` (fase 2 a partir de ~3 000 personas), propongo un modelo **híbrido**:

- **Personas completas** (en `npcs`, con relaciones y agenda): los compañeros de **tu equipo** (≈ 12–18), sus entrenadores y unas pocas **figuras** de cada equipo rival (2–3 que llegas a conocer).
- **Equipos rivales agregados** (en el estado del fútbol): nombre, club, nivel por líneas (portería, defensa, medio, ataque), forma y progreso por curso, sorteados con `rngEstable`. Los nombres del resto de sus jugadores salen de la semilla al dibujar la tabla y no se guardan (es la fase 4 de `ALMACENAMIENTO.md` aplicada solo a ellos).
- Solo se simula en detalle **la liga de tu categoría**; las demás no existen hasta que llegas a ellas.

### 3.5 El fútbol en sí (primera versión)

- **Categorías de la federación española** (dato del módulo): prebenjamín (6–7), benjamín (8–9), alevín (10–11) en **fútbol 7**; infantil (12–13), cadete (14–15) y juvenil (16–18) en **fútbol 11**; después aficionado/sénior. El personaje empieza a los 8: benjamín, fútbol 7.
- **Habilidades propias** (`futbol.*`), derivadas de genéricas como las de atletismo: control y regate, pase, tiro, defensa (entrada y marcaje), juego aéreo, y **visión de juego** (mental). Más `futbol.conocimiento`. **`gen.cooperacion` deja de ser provisional**: es el juego en equipo (y el backlog lo dejaba pendiente de este diseño).
- **Posiciones: empezar por 4** (portero, defensa, centrocampista, delantero) con pesos distintos de habilidades y capacidades. Las 16 posiciones y 42 roles del diseño original (E7) quedan para después.
- **El bucle propio del fútbol: la convocatoria.** Cada semana el entrenador decide titular, suplente o no convocado según tu nivel en tu posición frente al de tus compañeros, tu asistencia a los entrenamientos y tu relación con él. Jugar más minutos desarrolla más; quedarte en el banquillo baja la motivación. Es lo que hace distinto al fútbol del atletismo y engancha con relaciones sin conocerlas (por servicio).
- **Partido semanal de liga** (fin de semana por la mañana, ida y vuelta, pretemporada y parón como el calendario escolar). Fuerza de cada equipo por líneas; goles con una distribución de Poisson según la diferencia de fuerza; tu **nota del partido** (1–10), goles y asistencias según tu posición y tu rendimiento. Clasificación de liga, goleadores y tus estadísticas por curso.
- **Entrenamientos:** sesión con el club (como atletismo, con llegada tarde) y por libre (técnica con balón, tiro, físico) en el campo del colegio, el parque o el campo municipal; ver fútbol en la tele; campamento y amigos en verano (con el kit).
- **Clubes:** sección de fútbol en el club del colegio (otro horario) y una escuela de fútbol y la cantera de un club de la ciudad con prueba de acceso. **Jugar con los mayores** (subir de categoría) usa lo del kit; el backlog ya dice que en fútbol es habitual («a los 9 años contra niños de 12»).
- **Lugares:** zona «Campo de fútbol» en el colegio y un «Campo municipal»; actualizar `ANEXO_HORARIOS_PNJ.md` y `agendas.ts` (jugadores y entrenadores en el campo 10 minutos antes de las sesiones y en los partidos).

### 3.6 Contratos que hay que ampliar (sin romper el atletismo)

- `DeporteView`: secciones libres (`secciones?: { titulo, tabla }[]` para la plantilla y la liga) y `PruebaDeTemporada` con resultado en texto («Ganado 3-1») además de puesto y marca. `ANEXO_DEPORTE.md` ya preveía «el mismo contrato con sus propias secciones».
- `CompetitionResultData`: datos opcionales de equipo (resultado del equipo, marcador, compañeros y rivales por separado) y quién es mejor (`mayorEsMejor` o el resultado de cada participante). `relaciones` y `npcs` deben dejar de suponer que menos marca es ganar.
- `ClubView`: `secciones` por deporte (horario, acceso, sede).
- `aptitudDe('deporte')`: el nivel del deporte de la actividad, no el de atletismo.

### 3.7 Eventos: que se acople sin molestar

El motor de eventos (E18) está por hacer. El fútbol **no debe depender de él**, pero debe dejarle los enganches:

- Emitir eventos propios con datos completos: `futbol.convocatoria`, `futbol.partido` (resultado, minutos, goles, nota), `futbol.debut` (primer partido de titular), y el compartido `competicion.resultado`.
- Publicar en su servicio lo que un evento necesitaría consultar (posición, minutos del curso, puesto en la liga, si es titular).
- Las «puertas» (ojeador, selección, capitanía) serán eventos que escuchan esto; el módulo solo publica.

### 3.8 Simulación

- Un bot **futbolista** (elige fútbol) y que los bots elijan su deporte al empezar (los actuales, atletismo: así sus cifras no cambian).
- `analysis.ts` mide **el deporte del bot**, no atletismo fijo; chequeos propios del fútbol: el futbolista llega a titular, su equipo no gana siempre la liga, los minutos crecen con el nivel.
- `npm run sim` antes y después de cada fase.

## 4. Fases (cada una, un PR que deja todo en verde)

| Fase | Qué | Cómo se sabe que está bien |
|---|---|---|
| 0 | Decidir las preguntas de §5 | Entrada en `DECISIONES.md` |
| 1 | **Puerta de deporte** (módulo `deportes`, eventos, servicio, opciones de partida) y **aportes** en el motor | Atletismo elegido por defecto; `npm run sim` idéntico; test que carga el atletismo sin practicarlo y no ofrece nada |
| 2 | **Kit de deporte** y atletismo reescrito sobre él; `clubes` con secciones; población de `npcs` por aportes; `aptitudDe` y `relaciones` genéricas | `npm run sim` idéntico (mismos ids y azar); `arquitectura.test.ts` con la regla del kit |
| 3 | **Fútbol mínimo**: habilidades, entreno libre y con el club del colegio, categorías, plantilla propia como personas, equipos rivales agregados, liga semanal con convocatoria y nota, pestaña | Test que carga el fútbol solo con `gen`; bot futbolista; chequeos nuevos; el atletismo no cambia |
| 4 | Clubes de fuera con prueba, jugar con los mayores, verano, tele, goleadores, cursos anteriores | `ANEXO_DEPORTE.md` ampliado con el fútbol |
| 5 | Posiciones y roles detallados (E7), tácticas y lecturas con el conocimiento cuando haya eventos | Depende de E18 |

Coste orientativo: la fase 1 es pequeña; la 2 es la más delicada (refactor sin cambiar cifras) pero acelera todos los deportes futuros; la 3 es la grande.

**Para no pisar otros trabajos en curso:** la fase 2 toca `npcs`, `clubes`, `relaciones` y `contracts`, que comparten otras líneas de trabajo (roles por carácter, eventos). Conviene hacerla en un PR corto y fusionarla pronto; las fases 3 y 4 viven casi enteras en `modules/futbol` y en el kit.

## 5. Preguntas para decidir

1. **¿Uno o varios deportes a la vez?** Propongo **uno al empezar** y poder añadir un segundo más adelante (el tiempo ya lo limita solo), o cambiar dejando el anterior.
2. **¿Se aprueba el kit de deporte (`@ds/kit-deporte`)?** Cambia la regla 1 de `CLAUDE.md`: los módulos podrán importar `contracts` y el kit (nunca otro módulo ni el núcleo).
3. **¿Fútbol 7 hasta alevín y fútbol 11 desde infantil**, como en España?
4. **Equipos:** hoy el personaje solo puede ser chico. ¿Equipos masculinos, o mixtos en las categorías pequeñas como pasa en muchas escuelas?
5. **¿Modelo híbrido** (tu equipo y unas pocas figuras rivales como personas; el resto, equipos agregados)?
6. **Posiciones:** ¿empezar por 4 y que el entrenador te asigne la tuya según tus capacidades (con la opción de pedir otra)?
7. **¿Fútbol sala?** Lo dejo fuera de esta primera versión (sería otra disciplina del mismo módulo más adelante).
