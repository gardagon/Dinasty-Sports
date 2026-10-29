# Arquitectura de Dinasty Sports

RPG de decisiones: un personaje en edad escolar que estudia, practica un deporte y se relaciona.
Cada acción cuesta **tiempo de juego** y cambia sus características.

El objetivo de la arquitectura es que el juego pueda crecer a decenas de módulos
(deportes, asignaturas, sistemas de NPCs, eventos...) **sin que se convierta en una bola de dependencias**
y sin perder velocidad.

## Capas

```
apps/web            Interfaz (sustituible). Solo habla con @ds/game.
sim/                Equipo de testeo: bots, chequeos de balance, informes.
packages/game       ENSAMBLADOR: el único sitio que lista los módulos.
modules/*           Contenido. Cada módulo solo importa @ds/contracts.
packages/core       Motor genérico: no sabe nada de deportes ni de estudios.
packages/contracts  La "ley": interfaces y vocabulario común. Sin lógica de juego.
```

**Regla de oro:** un módulo **nunca** importa otro módulo ni el núcleo. Solo `@ds/contracts`.
El test `tests/arquitectura.test.ts` lo comprueba y falla si alguien la rompe.

## Los unificadores

Al dividir tanto, el riesgo es la lentitud y el caos de conexiones. Lo resuelven cuatro piezas:

1. **Registro de módulos** (`packages/core/src/registry.ts`). Al arrancar valida todos los
   módulos (ids, referencias, dependencias) y los compila en tablas indexadas por id, por etiqueta
   y por tipo de evento. En partida nadie recorre módulos: se consulta la tabla directamente.
2. **Pipeline único de acciones** (`Game.perform`). Toda acción pasa por los mismos pasos:
   requisitos → modificadores → coste → entrenamiento → lógica propia → avance del tiempo → eventos.
   Las acciones salen de tres sitios: `actions` (fijas), `dynamicActions` (las que dependen del estado, que se listan) y
   `resolverAccion` (acciones con parámetros en el id, como «proponer quedar a esta hora en este sitio»: no se listan, pero
   `preview`/`perform` las encuentran por id; así la interfaz arma el formulario y los bots no las ven).
3. **Modificadores por etiquetas.** Un módulo influye en otro sin conocerlo. Ejemplo: el módulo de
   Relaciones dice "si tu afinidad con alguien es ≥ 40, las acciones con las etiquetas que apoya rinden más".
   Funciona con cualquier deporte futuro que use esas etiquetas.
4. **Eventos y servicios.**
   - Eventos propios (`atletismo.*`) y **compartidos** (`competicion.resultado`). Cualquier deporte
     publica sus resultados igual, y los NPCs reaccionan sin saber de qué deporte se trata.
   - Servicios: un módulo publica una interfaz definida en contracts (`npcs`, `estudios`) y otro la
     consulta con `ctx.service()`. Quien consume debe funcionar también si el servicio no existe.

## Resultados con tabla y plantilla de competición

- `ctx.log(texto, tipo, tabla)` admite una **tabla opcional** (`LogTable`, en contracts: cabecera, filas, fila resaltada y alineación de las columnas).
  La web la muestra en el resultado de la acción y, desplegable, en el Diario. Un deporte nuevo publica así su clasificación sin tocar la interfaz.
- Un deporte consulta a los rivales por el servicio `npcs` (etiqueta `atleta` en atletismo). Los rivales son NPC persistentes
  con herencia propia (potencial, nivel inicial y ritmo) que progresan solos. La serie es de 8: los mejores rivales corren siempre
  las primeras semanas y después las plazas rotan (ver `elegirRivales` en `modules/atletismo`).

## Calendario escolar

El calendario es un **dato por país** (`CalendarioPais`, en contracts), expresado en semanas desde el inicio del curso (52 por curso, sin
fechas absolutas). El motor y los módulos solo consultan el `TimeView`: curso, semana del curso, periodo (`clase`, `navidad`, `semana_santa`,
`verano`), trimestre, `isSchoolDay` e `isEvaluationWeek`. En atletismo, las semifinales del campeonato caen en la semana 38 del curso y la final en la 39. Para un país nuevo basta con otro `CalendarioPais`. Un módulo nuevo debe usar
`isSchoolDay` / `isSchoolHours` (no `isWeekend`) para saber si hay clase, así respeta las vacaciones sin tocar el calendario.

## Categorías y desarrollo con la edad

Las categorías por edad son un dato por país y deporte (`CategoriaDef`, `categoriaDeEdad`, en contracts; las de atletismo español están en el
módulo de atletismo). `madurezPorEdad` (contracts) es la fracción de capacidad adulta alcanzable a cada edad: la usan el personaje, como techo de
lo físico (estado oculto `gen.madurez`), y los NPCs, como nivel máximo de cada rival. Los rivales tienen fecha de nacimiento, se renuevan cada
curso y son desconocidos hasta que compiten contra el personaje (`known`).

## Lugares

El mapa de la ciudad es un **dato** (`MapaCiudad`, `CIUDAD_INICIAL`, en contracts): **calles, lugares y zonas** (un grafo: cada lugar da a una calle con `enCalle` y `minutosDeCalle`, las calles se comunican con `entreCalles` y una zona está `dentroDe` un lugar), una tabla de minutos entre cada par (`tiempos`, caminos más cortos que calcula `construirMapa`) y los pasos que se pueden dar desde donde estás (`pasosDesde`, la lista de «Viajar»: dentro del lugar, salir a la calle, lugares de la calle, otras calles). **El viaje rápido (`lugares.ir_<lugar>`) es solo a lugares y solo desde una calle (hay que salir primero de la casa, el colegio o una zona: `sePuedeIr`); las zonas (el aula, el patio, la sala de profesores…) y las calles se alcanzan paso a paso (`sePuedeIr`)** y cuesta lo mismo. Para los bots y los tests, `rutaA` da las paradas necesarias hasta una zona. El módulo `lugares` guarda dónde está el personaje y publica el servicio `lugares`; ir a un sitio es una acción (`lugares.ir_<id>`) que cuesta lo que dice la tabla y emite `lugares.llegada`. Un módulo liga sus acciones a un sitio con `ligarALugares` (contracts): la acción gana `lugar` (que el motor expone en `ActionOption.lugar`) y una comprobación en `available` que va la última, de modo que si solo falta estar allí, `faltaViajar(opcion)` lo detecta y basta con viajar. Sin el módulo `lugares` cargado nada se restringe. Los textos de lugar viven en el dato del mapa, no en el motor.

**Horarios de apertura.** Un lugar puede tener `horario` (tramos por días y horas; `abiertoEn`): fuera de él no desaparece, sale en gris con su horario y no se puede ir ni hacer allí nada. Hoy tienen horario el colegio, la biblioteca, el supermercado, el restaurante, el gimnasio, el estadio y algunas zonas (aula, administración, salas de club); el parque no. Reglas (en `contracts/lugares.ts`, tabla completa en `docs/ANEXO_HORARIOS_PNJ.md`, sección 3): **una zona cierra con su lugar**; para saber si se puede hacer algo se mira la hora a la que se llegaría a **cada** lugar del camino (la entrada del colegio antes que la pista); y si una acción vale en varios sitios (`conLugar`), el destino por defecto es el primero que esté abierto al llegar. Las agendas de las personas deben respetar los horarios: lo vigila `contracts/src/horarios.test.ts`.

## Presencia de personas

Cada persona (`npcs`) guarda una lista de **tipos** (alumno, profesor, entrenador, club, rival, amigo, vecino, hermano, progenitor, bibliotecario) y de ellos sale su agenda: tramos de la semana con un lugar (`contracts/agendas.ts`). Si dos tramos coinciden manda el de mayor nivel (el tipo dominante) y, a igualdad de nivel, el último (así un tramo de domingo puede anular el de «libre»). El módulo `npcs` publica el servicio `presencia` (`en(lugar, max)`, `ocupadosEn(lugar)` —los que están a la vista pero ocupados, con su motivo: «atendiendo en clase», «durmiendo»—, `donde(persona)`, `agenda(persona)`); el azar sale de un hash de persona y día, no se guarda. La pantalla del lugar enseña «Gente aquí» (de 34 a 46 según el momento, `aforoCercano`; los desconocidos, por su descripción física). Las acciones de relación exigen que la persona esté donde tú estás; su eficiencia depende de la compatibilidad, de tus habilidades de comunicación y de la disposición de la otra persona (sociabilidad y gustos). **Los horarios y la población planificada están en [`ANEXO_HORARIOS_PNJ.md`](ANEXO_HORARIOS_PNJ.md) y todas las cifras de las relaciones, en [`ANEXO_RELACIONES.md`](ANEXO_RELACIONES.md).**

## Pestaña del deporte

Cada módulo de deporte publica el servicio `deporte.<id>` (`contracts/deporte.ts`: resumen, habilidades propias, pruebas de la temporada con su clasificación, clasificaciones del año y cursos anteriores) y la interfaz dibuja la pestaña «Deporte» sin conocer ninguno. Atletismo guarda la clasificación completa de cada carrera del curso en curso y el anterior. Cifras y reglas en [`ANEXO_DEPORTE.md`](ANEXO_DEPORTE.md).

## Currículo escolar

El currículo es un dato por país (`curriculo.ts` en el módulo de estudios): las asignaturas de cada curso, de 3.º de primaria a 2.º de bachillerato.
Todas existen como habilidades; solo puntúan y se estudian las del curso actual. Al cambiar de curso, las asignaturas nuevas heredan el nivel de las
que sustituyen. Cada asignatura es una **preparación 0–100 (= nota esperada × 10)** que se ve como texto (Mal, Regular, Bien, Muy bien, Excelente), sin tope genético: la dificultad la ponen las capacidades de apoyo (arranque con `StatDef.initialFrom`, ritmo de subida y olvido diario). El arranque sale de la aptitud (el tope genético de las capacidades de apoyo); la aptitud fija cuánto rinde el estudio y cuánto se olvida, y el olvido diario no baja de lo aprendido de base (`EstudiosState.base`: preparación inicial − 22); las clases llevan hasta un **nivel natural** que depende de la aptitud (22 + 0,52 × aptitud) y el olvido tira hacia él (un 1,5 % al día de lo que se sabe por encima, más una deriva pequeña), así que estudiar es lo que sube por encima y mantenerlo exige constancia; faltar a una clase resta lo que se da en ella. Los objetivos de nota por aptitud y esfuerzo los vigila el banco de notas (`sim/src/notas.ts`). En Tecnología (`Asignatura.practica` 30 %) la nota mezcla el estudio con una habilidad calculada con las capacidades de apoyo. **Educación física, Artística y Música (`Asignatura.porCapacidades`, 28/10) no se estudian: su nota sale solo de las capacidades que las apoyan frente a lo típico de la edad** (`habilidadDe`), ir a clase entrena esas capacidades (`entrenoDeClase`) y al cerrar el día su stat se pone al nivel que dan; no tienen estudio, repaso, tutoría ni olvido. Educación física tiene nota mínima 5 (`Asignatura.notaMinima`) para quien se presenta. La jornada son 4 clases que empiezan cada 80 minutos (duran 75: acaban 5 minutos antes de la hora de la siguiente, que se pasan en el aula con los compañeros de clase) y un recreo de 40 minutos, de 8:00 a 14:00; solo se entra a clase 10 minutos antes de que empiece y se puede llegar tarde (sube solo la parte asistida: modificador `estudios.llegada_tarde`); en cualquier minuto de esos 10 se puede repasar (`estudios.repaso_previo`) o hablar con alguien al azar (`relaciones.al_azar`), con efecto proporcional al tiempo gastado; el profesor de cada asignatura se presenta al ir a su clase (evento compartido `clase.asistida`); `horarioDeClases` reparte las asignaturas del curso en los 20 huecos de la semana (una asignatura no se repite el mismo día) y cada clase es una acción que sube solo esa asignatura (faltar no se castiga, pero cuenta en `faltas`); no hay controles semanales sino, en cada trimestre, dos parciales y un global (final = 40 % media de parciales + 60 % global; semanas en `CalendarioPais.parciales` y `evaluaciones`), avisados con una semana de antelación. El servicio `estudios` publica las asignaturas activas, el nombre del curso, el nivel en texto, el horario, los próximos exámenes, las notas por asignatura (`grades`) y los boletines (`reports`); la pestaña «Estudios» de la interfaz los muestra, y cada clase es curso + letra (`nombreDeClase`).

## Clubes

El módulo `clubes` guarda las membresías y la calidad de cada club (catálogo como dato por país). Los deportes ponen el contenido de las sesiones
(etiqueta `club`) y las pruebas de acceso, y piden entrar o salir con los eventos compartidos `club.unirse` y `club.salir`. El servicio `clubes`
expone los clubes de un deporte y la membresía del personaje.

**Relaciones.** El módulo `npcs` es la población (reparto, rivales, edad, club, padres de los rivales). El módulo `relaciones` ofrece un catálogo de acciones por persona (quedar, charlar, ayudar, hacer planes, tener un detalle, discutir, hacer las paces; ver `modules/relaciones/src/acciones.ts` para las reglas puras) y guarda el vínculo con cada persona (afinidad −100..100, confianza, estado, contactos) y publica el servicio `relaciones` (`get`, `list`); lee a las personas por el servicio `npcs`. Las acciones `quedar`/`hablar`, el modificador `relaciones.compania` (la ayuda de quien sabe hacer lo que hacéis juntos, según `aptitudDe`) y los cambios por carreras (evento compartido `competicion.resultado`) son suyos. Funciones puras del vínculo en `modules/relaciones/src/vinculo.ts`; estados y nombres concordados en `contracts/relaciones.ts`.

**Herencia.** El motor guarda la genética de los dos padres (`state.lineage`): un perfil de topes por bandas para cada capacidad con herencia directa (`StatDef.genetics` vacío) y, por cada una, de qué padre hereda el hijo. Cada capacidad la toma de UN padre (mitad exacta de cada uno, al azar cuáles) con su tope ±20 % y también el nivel inicial (tope del progenitor × factor × variación de ±30 %, llevado de la escala 22–80 a 0–1 y escalado al rango inicial de la capacidad, 5–20). Las habilidades deportivas (`genetics.derivedFrom`) no se heredan: su tope es la media ponderada de los topes de otras características más una aptitud propia. Las asignaturas ya no tienen tope genético (su dificultad la ponen las capacidades que las apoyan; ver **Estudios**). Las funciones puras viven en `contracts/herencia.ts` (`perfilDePadre`, `repartirHerencia`, `heredarTope`, `nivelInicialHeredado`). El tope típico es 62 (máximo 95, mínimo 10) y el ritmo de subida se escala con él (`potentialSpeed`). Para rasgos que no son stats (la altura) un módulo pide `ctx.herencia('estatura')`; para el perfil de los padres, `ctx.topesDePadres`. La interfaz tiene la pestaña **Estudios** (`apps/web/src/estudios.ts`: colegio, asignaturas, horario, exámenes y calendario, boletines) y **Deporte**, y «Personaje» solo lo genérico; la fecha del calendario sale de `fechaDelDia`. El mapa admite **zonas dentro de lugares** (`LugarDef.dentroDe`, `conZonas`) y **horarios** (`LugarDef.horario`, `abiertoEn`): fuera de horario un lugar sale en gris con su horario, y las acciones ligadas a él con `conLugar` también. `NpcView` lleva también los datos de cada persona (nacimiento, cumpleaños, altura, colegio, clase y lo que el personaje `sabe`; funciones en `contracts/personas.ts`). Los padres también son personas de `npcs` (`progenitores()`, rol `familia`, etiqueta `progenitor`). Los hermanos (0 a 3) se generan en `npcs` con el mismo proceso de herencia (`hermanos()`, con las funciones puras de `contracts/hermanos.ts` y `rasgosHeredadosNpc`) y viven como personas con rol `familia`; `familia` los publica por `FamilyService.siblings()` y comparte con `npcs` los apellidos sacados de la semilla (`apellidosDeFamilia`). El módulo `familia` guarda a los padres como personas (nombre, edad, altura, deporte, apoyo, expectativas) y publica el servicio `familia`; los rivales de `npcs` llevan sus propios padres con perfil de topes físicos. La genética oculta no está en ningún servicio: solo la leen las pruebas y la interfaz de pruebas.

## Tope genético individual

Una stat con `genetics` recibe al crear la partida un tope genético oculto (`GameState.potential`). Las capacidades (`genetics` vacío o solo con `grupo`) lo heredan de los
padres (ver **Herencia** arriba); las habilidades deportivas lo derivan de otras (`genetics.derivedFrom`, más una aptitud propia); las asignaturas no tienen tope. El tope típico es 62 (entre 10 y 95).
El tope limita lo que se puede llegar a ser y **acelera el progreso** de quien lo tiene más alto (`potentialSpeed`, en el núcleo: (tope / 62)² × 0,8, entre ×0,4 y ×1,3).
El techo visible (`Game.cap`) no lo incluye: la interfaz no enseña el tope (salvo la interfaz de pruebas). Para pruebas, `Game.hiddenPotential`, `Game.parentPotential`,
`Game.geneticOrigin`, `Game.parentBias`, `Game.parentQuality` y `Game.agePotential`.

### Envejecimiento: lo alcanzable por edad

El tope genético no se puede tener a cualquier edad. Cada categoría tiene una **curva por edad** (`CURVAS_POR_EDAD` y `factorPorEdad`, en contracts) con la fracción del tope
que se puede tener: crece hasta el pico, se mantiene en la meseta y baja. La física llega al máximo hacia los 22 y se mantiene hasta los 27 (baja con más fuerza desde los 30); la
técnica, hacia los 24 y meseta hasta los 32; la mental sigue subiendo más allá de los 28 y llega a su máximo hacia los 30 con una bajada mínima y muy tardía; la social, hacia los 30.
De niño el techo es bajo y progresivo en las cuatro categorías: a los 8 años solo se puede tener el 30 % del tope, a los 10 un 42 %, a los 12 un 55 %, a los 16 un 82 % y a los 18 un 91 %.

Cómo funciona en el motor, sin que el núcleo sepa de edades: el módulo base mantiene cuatro stats de estado ocultas (`gen.vigor_fisico`, `gen.vigor_tecnico`, `gen.vigor_mental`, `gen.vigor_social`,
0 a 100) que sigue cada día con la edad (la física y la técnica, con el adelanto o retraso propio hasta los 24). Una stat que declara `growth.potentialFactor` apuntando a una de ellas tiene un
**tope efectivo = tope genético × esa fracción**: limita lo que se puede subir y, **si la fracción baja desde su máximo** (envejecimiento), lo que queda por encima del tope efectivo cae hacia él
un 0,4 % de la diferencia cada día. Mientras la fracción crece (juventud) nada se pierde. El ritmo de subida sigue dependiendo del tope genético, no del efectivo.

### Crecimiento de la infancia: arranque bajo, desarrollo natural y «para su edad»

- **Arranque bajo.** Las capacidades genéricas empiezan entre 5 y 20, repartidas según el tope del progenitor del que se heredan (mediana ~12; con tope ≥ 85 se arranca de media en 16 y con tope ≤ 45 en 9), y crecen despacio hacia el techo por edad de arriba.
- **Desarrollo natural** (`GrowthDef.naturalFraction`, 0,45 en las genéricas). Sin entrenar, una capacidad sube sola hasta el 45 % de su tope efectivo (un 5 % de lo que falta cada día): un niño con 5 nunca será un adulto con 5, pero sin entrenar tampoco llegará a su tope.
- **Plasticidad** (`plasticidadPorEdad`): hasta los 16 las genéricas suben más rápido (×3 a los 8 años, ×1 a los 16).
- **Capacidades «para su edad».** `ReadContext.norm` de una capacidad genérica no es nivel/100 sino el nivel relativo al **nivel típico de esa edad** (`nivelTipicoPorEdad`: 12,5 a los 8, 17 a los 10, 22 a los 12, 32 a los 16, 40 a los 24, 42 desde los 30; igual al de referencia, 40, vale lo de antes). Así techos, velocidades y olvido de asignaturas y habilidades no se hunden porque un niño tenga 12. El núcleo obtiene la edad del servicio `identidad` (una vez al día).
- **Arranque derivado** (`StatDef.initialFrom`): el valor inicial de una stat (las asignaturas) sale de la media ponderada del **tope genético** de otras stats (la aptitud permanente) o, si no lo tienen, de su nivel inicial relativo a la edad.
- **Rivales** (`npcs`): su desarrollo por edad es 0,75 × la curva física del jugador (`desarrolloRival`), para que jugador y rivales sigan la misma escala.
- Con esto un personaje que entrena a diario llega al 90 % de su tope en sus 6 mejores capacidades hacia los 24 años y al 80 % a los 18 (ver `sim:vida`).

## Perks

Rasgos genéticos heredables con bonus o malus (`contracts/perks.ts`): catálogo de 28 perks como dato, con sus opuestos, rareza, si son latentes y sus efectos. El motor sortea los perks de los dos padres con el resto de su genética (`state.lineage.perks`) y los expone en el contexto de creación (`ctx.perksDePadres`); el módulo base (`gen`) hereda los del personaje (`heredarPerks`: pool único de los padres, cada perk se tira por separado, sin opuestos, máximo 3 activos y el resto al pool), aplica los efectos sobre los topes con `ctx.bonusDeTope` (el motor recalcula las habilidades derivadas) y sobre la altura, y publica el servicio `perks`. Los efectos sobre la eficiencia de las acciones los aplica el modificador `gen.perks`, por etiquetas. Un perk cuenta desde el nacimiento aunque sea latente; revelarlo con un mensaje será un evento.

## Guardado

`GameState` es JSON plano y la interfaz lo guarda en IndexedDB (copias de seguridad en JSON; plan y fases en [`ALMACENAMIENTO.md`](ALMACENAMIENTO.md)). Su formato lleva una versión (`SAVE_VERSION`). En la fase alfa **no se mantiene compatibilidad**: se sube la versión cada vez que cambia la forma del estado de algún módulo; `Game.load` rechaza las partidas de otra versión y la interfaz descarta cualquier guardado que no se pueda cargar o dibujar y vuelve a la pantalla inicial con un aviso.

## Rasgos de las personas

Cada persona tiene carácter (8 ejes de −50 a +50), intereses, apariencia física (pelo, ojos, piel, cara y distintivos con ids estables para dibujar por capas), origen familiar (uno o dos de 9) y gustos. El catálogo, el sorteo, la herencia y la compatibilidad son funciones puras en `contracts/rasgos.ts`.
Los de los padres del jugador se sortean al crear la partida con el resto de su genética (`state.lineage.rasgos`, `ctx.rasgosDePadres`); el módulo base (`gen`) hereda el perfil del personaje (cada rasgo físico, de uno de los padres; el carácter atenuado; algunos intereses) y publica el servicio `perfil`;
sus intereses suben con lo que hace (evento `action.done`, por etiquetas). `npcs` da rasgos a todo el reparto y a los rivales (con sesgo por papel) y `familia` a los padres. El módulo `relaciones` multiplica entre ×0,7 y ×1,4 lo que sube la afinidad según la compatibilidad (modificador `relaciones.compatibilidad`).

## Año de nacimiento y categorías

Jugador y rivales tienen fecha de nacimiento (edad exacta y cumpleaños), pero las categorías usan el año de nacimiento: la **edad de competición**
es el año del curso menos el año de nacimiento (`edadDeCompeticion`, `anioNatural`, en contracts). Es constante durante el curso y la publican los
servicios `identidad` (`seasonAge`) y `npcs` (`age`). La partida supone que el curso empieza hacia el 10 de septiembre.

## Identidad del personaje

El módulo `gen` publica el servicio `identidad` (contracts): edad, altura, peso, dominancia y complexión (`BodyType`).
La complexión se deriva de hábitos acumulados por etiquetas: `fuerza` forma músculo y `fisico`/`cardio` gasta grasa. Un deporte
nuevo solo tiene que etiquetar sus entrenamientos con `fuerza` o `cardio` para que cuenten. La lógica pura está en
`modules/personaje/src/identidad.ts` (edad inicial y parámetros del cuerpo ajustables ahí).

## Características del personaje

| Categoría | Ejemplos | Cómo cambian |
|---|---|---|
| `generica` | fuerza, velocidad, inteligencia, carisma | Se entrenan (lento). Son el **techo** y la **velocidad** de las habilidades. Hay 19: 6 físicas, 6 mentales y 6 sociales (`cooperacion` es provisional). |
| `habilidad` | matemáticas, técnica de carrera | Se entrenan. Cada módulo define las suyas. |
| `conocimiento` | conocimiento de atletismo | Progresa como una habilidad pero no lo es: actúa como bonus/malus (modificador sobre las acciones y valor efectivo de las habilidades tácticas en competición, nunca sobre lo físico), sube rápido al principio y cada vez más despacio, y se olvida muy despacio. Un deporte nuevo debería definir el suyo. |
| `estado` | energía, salud, estrés, motivación | Cambian directamente. Modulan la eficiencia de todo. |

**Subida** (`packages/core/src/progression.ts`):
`ganancia = cantidad × eficiencia × ritmo × talento × velocidad(genéricas) × (1 − progreso hacia el techo)^curva`

- El **techo** depende de las genéricas: para correr mejor también hace falta coordinación y resistencia.
- El **talento** es un multiplicador oculto por característica, fijado por la semilla de la partida.

**Caída:** tras `graceDays` sin practicar, se pierde `ratePerDay` de la distancia al suelo.
El suelo es el máximo alcanzado × `floorRatio` ("memoria muscular"). Nunca baja del valor inicial.

**Recursos:** las stats marcadas como `resource` (energía) son las únicas cuyo delta negativo es
un coste: bloquea la acción si no alcanza y se escala con los modificadores de coste.

## Tiempo

El tiempo es de juego, en minutos. La partida empieza un lunes a las 7:00. Cada acción declara su
duración, que puede ser una función (dormir dura hasta las 7:00). Al cruzar la medianoche el núcleo
aplica la caída y emite `dia.fin`, `semana.fin` y `dia.inicio`.

## Guardado

El estado es un único objeto JSON (`GameState`). Guardar = `game.serialize()`.
Al cargar, las características y los módulos nuevos se inicializan solos, así que añadir
un módulo **no rompe partidas existentes**. El azar es determinista (semilla guardada en el estado).

## Cómo añadir un módulo

```bash
npm run nuevo-modulo -- natacion "Natación"
npm install
npm test
```

El generador crea el módulo con su test y lo registra en `packages/game/src/modulos.ts`.

Checklist de un módulo nuevo:

- [ ] Ids con prefijo del módulo (`natacion.*`).
- [ ] Etiquetas del vocabulario común (`TAGS` en contracts) para que los modificadores ajenos le afecten.
- [ ] Si es un deporte, emite `competicion.resultado` al competir.
- [ ] Test que lo cargue **solo** con `gen` (demuestra que es independiente).
- [ ] `npm run sim` y revisar el informe de balance.

## Equipo de testeo (sim/)

Hay siete estrategias de bot: equilibrado, empollón, atleta, sobreentrena, vago, abandona el deporte y aleatorio.
Cada una juega N días con varias semillas. Eligen sobre todo por **etiquetas**, así que entrenan
cualquier deporte nuevo sin tocar su código. Después se ejecutan chequeos de sentido del juego:

- Integridad: ninguna stat fuera de rango, ningún bloqueo.
- Rendimiento del motor (ms por año simulado).
- El esfuerzo hace progresar, y especializarse compensa en lo suyo.
- No hacer nada nunca es lo mejor, y sobreentrenar no compensa.
- Nadie llega a 90 antes de la semana 12.
- Dejar un deporte hace caer las habilidades entre un 3 % y un 40 %.
- No hay una estrategia que gane en todo.
- Las carreras son una competición real: el atleta no las gana todas, sube al podio algunas veces y supera al equilibrado.
- Las estrategias razonables mantienen la salud.

Informe: `sim/reports/ultimo/informe.html` (gráficas semana a semana por área y estrategia).

**Vida entera (`npm run sim:vida`, `sim/src/vida.ts`).** Lleva a un bot "perfecto" (entrena deporte, estudios, gimnasio, lectura, relaciones y ocio cuidando el sueño y el estrés) muchos años (70 por defecto) y enseña, por edad, el nivel frente al tope de cada categoría, cuántas capacidades están al 95 % de su tope y cuánto del tope han alcanzado sus 6 mejores capacidades (las que entrena de verdad: la media de las 18 incluye las que nunca entrena y engaña). Sirve para ver a qué edad llega al máximo, que nadie llegue al tope en todo y cómo envejece. Tarda ~6 s por año simulado en el contenedor de desarrollo (medido el 28/10; la cifra antigua de ~1,4 s era de otra máquina). No forma parte de `npm run sim` ni de los chequeos: se lanza a mano.

**Banco de notas (`npm run sim:notas`, `sim/src/notas.ts`; test `sim/src/notas.test.ts`).** Alumnos con la misma aptitud en todas las asignaturas (floja 40, típica 60, brillante 85) siguen rutinas fijas durante un curso (ni clase ni estudio, solo clase, clase + ~1 h al día, clase + 3 h al día) y se compara su nota media con los objetivos (`OBJETIVOS`): típico 5–6 solo con clase, 6,5–7,5 con ~1 h, 7,5–8,5 con 3 h; brillante 6,5–7 solo con clase; flojo 6–7 con 3 h. Solo carga `gen` y `estudios`, así que es rápido y no depende de los bots. Si un cambio de balance de estudios lo rompe, ajusta las constantes de `modules/estudios` (nivel natural, olvido, rendimiento del estudio) o, si el objetivo ha cambiado, `OBJETIVOS` y la entrada de `DECISIONES.md`.
