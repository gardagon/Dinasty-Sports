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
3. **Modificadores por etiquetas.** Un módulo influye en otro sin conocerlo. Ejemplo: el módulo de
   NPCs dice "si tu afinidad con alguien es ≥ 40, las acciones con las etiquetas que apoya rinden más".
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
`verano`), trimestre, `isSchoolDay` e `isEvaluationWeek`. En atletismo, la clasificatoria autonómica cae en la semana 25 del curso y la final en la 39. Para un país nuevo basta con otro `CalendarioPais`. Un módulo nuevo debe usar
`isSchoolDay` / `isSchoolHours` (no `isWeekend`) para saber si hay clase, así respeta las vacaciones sin tocar el calendario.

## Categorías y desarrollo con la edad

Las categorías por edad son un dato por país y deporte (`CategoriaDef`, `categoriaDeEdad`, en contracts; las de atletismo español están en el
módulo de atletismo). `madurezPorEdad` (contracts) es la fracción de capacidad adulta alcanzable a cada edad: la usan el personaje, como techo de
lo físico (estado oculto `gen.madurez`), y los NPCs, como nivel máximo de cada rival. Los rivales tienen fecha de nacimiento, se renuevan cada
curso y son desconocidos hasta que compiten contra el personaje (`known`).

## Currículo escolar

El currículo es un dato por país (`curriculo.ts` en el módulo de estudios): las asignaturas de cada curso, de 3.º de primaria a 2.º de bachillerato.
Todas existen como habilidades; solo puntúan y se estudian las del curso actual. Al cambiar de curso, las asignaturas nuevas heredan el nivel de las
que sustituyen. El servicio `estudios` publica las asignaturas activas y el nombre del curso.

## Clubes

El módulo `clubes` guarda las membresías y la calidad de cada club (catálogo como dato por país). Los deportes ponen el contenido de las sesiones
(etiqueta `club`) y las pruebas de acceso, y piden entrar o salir con los eventos compartidos `club.unirse` y `club.salir`. El servicio `clubes`
expone los clubes de un deporte y la membresía del personaje.

**Relaciones.** El módulo `npcs` es la población (reparto, rivales, edad, club, padres de los rivales). El módulo `relaciones` guarda el vínculo con cada persona (afinidad −100..100, confianza, estado, contactos) y publica el servicio `relaciones` (`get`, `list`); lee a las personas por el servicio `npcs`. Las acciones `quedar`/`hablar`, el modificador `relaciones.apoyo` y los cambios por carreras (evento compartido `competicion.resultado`) son suyos. Funciones puras del vínculo en `modules/relaciones/src/vinculo.ts`; estados y nombres concordados en `contracts/relaciones.ts`.

**Herencia.** El motor guarda la genética de los dos padres (`state.lineage`): un perfil de topes por bandas para cada capacidad con herencia directa (`StatDef.genetics` vacío) y, por cada una, de qué padre hereda el hijo. Cada capacidad la toma de UN padre (mitad exacta de cada uno, al azar cuáles) con su tope ±20 % y también el nivel inicial, escalado al rango inicial de la capacidad. Las habilidades y asignaturas (`genetics.derivedFrom`) no se heredan: su tope es la media ponderada de los topes de otras características más una aptitud propia. Las funciones puras viven en `contracts/herencia.ts` (`perfilDePadre`, `repartirHerencia`, `heredarTope`, `nivelInicialHeredado`). El tope típico es 62 (máximo 95, mínimo 10) y el ritmo de subida se escala con él (`potentialSpeed`). Para rasgos que no son stats (la altura) un módulo pide `ctx.herencia('estatura')`; para el perfil de los padres, `ctx.topesDePadres`. El módulo `familia` guarda a los padres como personas (nombre, edad, altura, deporte, apoyo, expectativas) y publica el servicio `familia`; los rivales de `npcs` llevan sus propios padres con perfil de topes físicos. La genética oculta no está en ningún servicio: solo la leen las pruebas y la interfaz de pruebas.

## Tope genético individual

Una stat con `genetics` (familia, media y desviación) recibe al crear la partida un tope genético oculto (`GameState.potential`), sorteado con una parte
compartida por familia (`GameState.families`). El tope limita lo que se puede llegar a ser y **acelera el progreso** de quien lo tiene más alto
(`potentialSpeed`, en el núcleo). El techo visible (`Game.cap`) no lo incluye: la interfaz no enseña el tope. Para pruebas, `Game.hiddenPotential`.

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
