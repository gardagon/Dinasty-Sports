# Personaje chica: análisis y plan por fases

Análisis de la sesión `claude/personaje-chica` (24/11/2026), por encargo de la arquitectura. **No cambia el juego**: solo este documento y una herramienta de medida (`tools/chicas-en-equipos.ts`, solo lee). `npm run huella -- 60` idéntica antes y después (§6). No se ha editado `DECISIONES.md`: las decisiones que salgan de §5 las apunta la arquitectura.

Fuentes leídas: `CLAUDE.md`, `VISION.md`, `DECISIONES.md` (entrada del 24/11, líneas 21 y 562), `ANEXO_CUERPO.md`, `ANEXO_RETRATOS.md`, `ANEXO_EVENTOS.md`, `PAQUETES_DE_PAIS.md`, `CIUDAD_Y_LIGAS.md`, `relevo/salud-lesiones.md` y el código citado.

## 0. Resumen

1. **El sexo del personaje está menos cableado de lo que parece**: una constante (`SEXO_DEL_PERSONAJE = 'm'`, 3 usos) y cuatro sitios más con `'m'` fijo (§1). El cuerpo, la herencia de la apariencia y el retrato **ya aceptan `sexo`** porque los PNJ lo usan.
2. **Lo más importante: hoy no existe ningún equipo "de chicos".** Los PNJ nacen 50 % chicas y 50 % chicos (`modules/npcs/src/index.ts:366`), el interés por el fútbol no depende del sexo y la formación de equipos, la liga y la copa **no miran el sexo**. Medido en la ciudad grande (§1.5): **el 47–52 % de los futbolistas ya son chicas, en equipos mixtos, y las hay en los 13 clubes**. Un personaje chica podría hoy jugar sin tocar el fútbol; lo que el usuario tiene que decidir es si eso es lo que quiere (§5, duda 1).
3. **El trabajo gordo no es técnico sino de contenido**: revisar los textos que hablan al personaje en masculino (unos 12 sitios seguros en código y web, y un número por determinar en los 43 archivos de sucesos) y decidir las competiciones.
4. **Coste de equipos femeninos: casi nulo en peso y tiempo** si se reparten los mismos jugadores (+0–10 % de equipos por la fragmentación); **baja un 35–40 %** si se ajusta la proporción de chicas a la realidad (§3).
5. **Recomendación**: 3 fases pequeñas (§4). La A (poder elegir sexo, textos, retrato, nombres, altura) no depende de decidir las ligas y se puede hacer ya; la de competiciones espera la respuesta del usuario.

## 1. Inventario: lo que supone el sexo masculino fijo

### 1.1 Constante del personaje y estado

| Qué | Archivo | Cantidad |
|---|---|---|
| `SEXO_DEL_PERSONAJE = 'm'` | `modules/personaje/src/identidad.ts:18` | 1 definición, 3 usos |
| Uso en la herencia de la apariencia (`perfilHeredado(..., SEXO_DEL_PERSONAJE)`) | `modules/personaje/src/index.ts:210` | 1 |
| Uso en el servicio del cuerpo (`CuerpoDePersona.sexo`), que leen el retrato, la web y los PNJ | `modules/personaje/src/index.ts:573` | 1 |
| Uso en el paso semanal del cuerpo (`pasoDeSemanaDelCuerpo`) | `modules/personaje/src/identidad.ts:117` | 1 |
| `IdentidadState` no guarda el sexo | `identidad.ts:34` | falta el campo (partidas antiguas: `'m'`) |
| La partida no recibe sexo al crearse (`nuevaPartida`, opciones de `Game`) | `packages/core`, `packages/game`, `apps/web/src/main.ts:1618` | falta el dato |

### 1.2 Cuerpo y genética del personaje

- **Ya funciona por sexo** (PNJ y personaje comparten reglas, `contracts/src/cuerpo.ts`): músculo ×0,75 y +8 de grasa desde la pubertad en mujeres (`ANEXO_CUERPO.md`, líneas 27–29), calvicie con tope por sexo, barba no dibujada en mujeres.
- **Fijo en masculino**: la altura adulta del personaje, `171 + z/SD·8` acotada a 150–195 (`identidad.ts`, `initIdentidad`). Los PNJ usan `alturaAdulta(gender, z)` (`contracts/src/personas.ts:139`: chicas media 165, sd 6,5, 148–185). Hay que usar la misma función (nota: es el "hoy el personaje y los PNJ usan curvas de altura distintas" de `DECISIONES.md:594`).
- **No modelado para nadie**: la curva de crecimiento (`CRECIMIENTO`) es una sola para los dos sexos; el estirón de las chicas (≈ 1,5–2 años antes) solo existe si lo da `madurez`, que sale de la misma distribución para todos (`rng.normal()·0,8` en el personaje). Ahora afecta ya a las PNJ; con personaje chica se vería en la comparación de altura. Propuesta: desplazar la media de `madurez` de las chicas (cifra a decidir con `npm run sim:cuerpo`).
- **`ctx.herencia(...).hijo`**: es una puntuación típica, no depende del sexo; basta.

### 1.3 Textos del personaje en masculino

La regla 8 de `CLAUDE.md` obliga a concordar, pero la concordancia del jugador **nunca se ha ejercitado** porque era siempre chico:

- **`modules/sucesos/src/index.ts:412`**: `yo` = `{ nombre, gender: 'm' }` cuando el suceso le pasa al personaje (los 30 `{yo:o|a}` de 17 archivos devuelven siempre `o`). Es **el punto único a cambiar**. Idem `contracts/src/pistas-de-puestos.ts:20` (`yo: tú, 'm'`) y `tools/eventos/banco.ts` (la herramienta de pruebas no ejercita `yo` del personaje en femenino: `eventos:validar` prueba "personas en femenino y masculino", pero `yo` del personaje no cambia con ese parámetro).
- **Textos sin `{yo:…}` que hablan en masculino** (búsqueda por patrones; es un mínimo, no la lista completa):

| Archivo:línea | Texto |
|---|---|
| `modules/futbol/src/index.ts:481` | «Estás lesionado y no puedes jugar» |
| `modules/futbol/src/index.ts:527`, `:538` | «si estás convocado y no vas…» |
| `modules/eventos/src/casa/padres_discuten.ts:45` | «…sepan que estás despierto» |
| `modules/eventos/src/colegio/tutor_se_preocupa.ts:90` | «arreglártelo solo» |
| `modules/eventos/src/amigos/prestado.ts:48` | «Eres un crack» (revisar el tono) |
| `packages/contracts/src/modifiers.ts:15` | ejemplo en un comentario («Estás castigado»); los eventos reales ya usan `castigad{yo:o\|a}` |
| `apps/web/src/main.ts:953` | «Eres hijo único.» |
| `apps/web/src/main.ts:472` | selector de sexo desactivado (la pantalla de "Nueva partida") |

- **Otros sitios que tratan al personaje como chico**: `modules/npcs/src/plantillas.ts:342` (`jugadorComoNpc`, el personaje en las plantillas y listas de equipo: `gender: 'm'`), `modules/npcs/src/cuerpo.ts:180` (valor por defecto).
- **Cantidades de contenido a revisar a mano**: 43 archivos de sucesos (en `modules/eventos/src`, `modules/futbol/src/eventos` y `modules/atletismo/src/eventos`), de los que 17 ya usan `{yo:…}`. Los textos de crónica del partido (`modules/futbol/src/dia-de-partido.ts`, `partido.ts`) hablan de "jugadores" en general y no marcaron nada con la búsqueda.
- **Propuesta de control**: tras el cambio en `index.ts:412`, hacer que `eventos:validar` recorra también cada hilo con el personaje chica y un chequeo de palabras (`-o/-os` tras «estás/eres/te sientes/te quedas…» fuera de `{yo:…}`) que dé la lista completa (≈ ½ día).

### 1.4 Retrato, peinados y nombres

- **Retrato**: `packages/retrato` y `contracts/src/retrato.ts` ya dibujan los dos sexos (peinados con peso por sexo, `PEINADOS[].peso[sexo]`; vello `VELLOS[0]` en mujeres; pecho/caderas desde `fem`, `parametros.ts:104–105`). **Nada que hacer salvo mirar la cuadrícula** (`npm run retratos:cuadricula`, §3 y 7b/7c) con el personaje. Cuando exista la peluquería (`PLAN_PELUQUERIA.md`) el catálogo de peinados femeninos pasa a importar más.
- **Nombres**: `identidadDeJugador` (`contracts/src/hermanos.ts:49`) pasa `'m'` fijo a `identidadDeHijo` y a `formaDeApellido` ("nombre de pila solo masculino de momento"). Las listas de nombres de mujer ya existen (≈190 en España, `ANEXO_NOMBRES.md`), y `apellidosDeFamilia(seed, genero)` ya acepta género. Cambio: un parámetro `sexo` en `identidadDeJugador` (y que la web lo reciba antes de sortear nombre). Ojo: **el sexo cambia el nombre sorteado de una semilla**; con `'m'` por defecto, las partidas existentes no cambian.
- **Los hermanos y los padres** ya salen 50/50 y con el género correcto (`npcs/index.ts:613–633`). Una hermana de una chica no necesita nada; una de las pruebas de coherencia: el personaje no tiene «hermana/hermano» en sus propios textos.

### 1.5 Deporte: categorías, equipos y compañeras (medido)

**Categorías hoy (datos del país):** fútbol, `modules/futbol/src/datos.ts:16`: prebenjamín (≤7), benjamín 8–9, alevín 10–11, infantil 12–13, cadete 14–15, juvenil 16–18, sénior 19+. Atletismo, `modules/atletismo/src/datos.ts:10`: sub-10, sub-12, sub-14, sub-16, sub-18, sub-20, sub-23, absoluta. **Ninguna distingue sexo**: no hay campo de sexo en `CategoriaDef`, ni en las ligas del kit (`packages/kit-deporte`), ni en la formación de equipos (`modules/npcs/src/{equipos,draft,fichajes,plaza}.ts`), ni en las pruebas del atletismo.

**Medido** (`npx tsx tools/chicas-en-equipos.ts 2 1`: ciudad grande, 2 semillas, al crear y tras el verano 1; futbolistas = PNJ con equipo; equipos = suma de equipos A–D de todos los clubes y colegios):

| Categoría | Equipos hoy | Chicas | Chicos | % chicas | Equipos de chicas si se separan (plantilla 14–18) | Equipos de chicos |
|---|---|---|---|---|---|---|
| benjamín | 32 | 283 | 263 | 52 % | 18 | 16 |
| alevín | 32 | 253 | 284 | 47 % | 16 | 18 |
| infantil | 31 | 259 | 268 | 49 % | 16 | 17 |
| cadete | 31 | 261 | 263 | 50 % | 16 | 16 |
| juvenil | 41 | 312 | 349 | 47 % | 19 | 22 |

(Tras el verano 1: 45–51 % chicas, mismo orden.) **Las chicas están en los 13 clubes con equipo** (los de la zona y los colegios con club). Datos de coste: crear la partida en la ciudad grande, **≈ 11 s**; estado de `npcs`, **≈ 16,6 MB** en JSON.

- **Compañeras hoy**: el personaje chico ya juega con y contra chicas en todas las categorías (mixtas de hecho y sin regla). Por eso los textos de concordancia con las rivales ya funcionan (`futbol/src/index.ts:917`, `textoDelJuicio(…, gender)`).
- **Realismo**: en la federación española las licencias femeninas de fútbol base son una minoría clara (orden de magnitud del 10 % en todo el fútbol; **a confirmar con la federación**, no lo he verificado), y las normas de categorías mixtas varían por federación territorial: lo habitual es que las niñas puedan jugar en equipos de chicos en las categorías más pequeñas (prebenjamín a alevín, y en algunas territoriales hasta infantil/cadete si no hay equipo femenino de su edad) y que las **ligas femeninas propias** empiecen en infantil/cadete (con menos equipos y a veces en fútbol 7 en las pequeñas). **Esos datos deben comprobarse antes de fijar el paquete de país** (`PAQUETES_DE_PAIS.md`: las categorías y competiciones son datos del deporte por país, así que el cambio entra como dato, no como código).
- **El interés por el fútbol no depende del sexo** (`rasgos.ts` no tiene sesgo por sexo en `intereses`): por eso sale el 50 %. Para acercarlo a la realidad hay que meter un sesgo en el interés (dato del país/deporte), no en el motor.
- **Atletismo**: un solo cuadro por edad; los rivales son PNJ de la población (mixta) y el nivel sale de las capacidades del cuerpo (que ya dependen del sexo vía músculo/altura). Con una chica, las marcas saldrán más bajas desde la pubertad sin tocar nada, y se verá "injusto" porque compite en la misma tabla que los chicos. En la realidad las pruebas son por sexo desde sub-12/14 (**a confirmar**).

### 1.6 Relaciones y sucesos

- **Relaciones**: `modules/relaciones` usa el género de la otra persona (estado de la relación `nombreEstado`, «hablar con ella/él»). No hay nada romántico ni por sexo del personaje (`ANEXO_RELACIONES.md`). **Sin cambios necesarios**, salvo los textos de compañía (`fraseDeCompania`, línea 344), que ya dependen del género del otro.
- **Sucesos que solo tienen sentido para un sexo**: en la búsqueda no aparece ninguno que lo exija (los hilos son escolares y familiares); **a confirmar leyendo los 43 archivos** al hacer la fase A. Contenido nuevo que sí dependerá del sexo: menstruación, ropa deportiva, vestuarios, comentarios sobre el cuerpo (el hilo `cuerpo/altura.ts` ya tiene `{yo:…}` y deberá probarse con una chica).

## 2. Qué hace falta para jugar con una chica

### 2.1 Lo que ya funciona (por las PNJ)

Cuerpo (músculo, grasa, calvicie, barba), herencia, retrato y peinados femeninos, nombres de mujer, padres/hermanas con género correcto, relaciones y textos por género de la otra persona, equipos **mixtos** con chicas y chicos jugando juntos, rivales femeninas con su texto («Jugaste contra ella»).

### 2.2 Lo nuevo

| Pieza | Qué hay que hacer | Esfuerzo |
|---|---|---|
| Estado | `sexo` en `IdentidadState` (por defecto `'m'` en partidas antiguas) y en las opciones de `nuevaPartida`; los 3 usos de la constante leen el estado | Pequeño (≈ 1 h; el guardado antiguo no cambia: `compat-guardado`) |
| Pantalla | Activar el selector (`main.ts:471`) y pasar el sexo al sorteo de nombre, apellidos y padres (antes de «volver a sortear») | Pequeño |
| Altura | `alturaAdulta(sexo, z)` en `initIdentidad`; estirón de las chicas (`madurez`) | Pequeño + calibrar |
| Nombres | Parámetro `sexo` en `identidadDeJugador` | Pequeño |
| Textos | `yo.gender` desde el estado; revisar ≈ 12 textos de §1.3 y los 43 archivos de sucesos; ampliar `eventos:validar` | Medio (contenido) |
| `jugadorComoNpc` | Género del personaje | Trivial |
| Retrato | Mirar la cuadrícula con la chica de 8 a 18 años | Pequeño |
| Lesiones por sexo | Entra con salud: ligamento cruzado y sobrecarga ×2 desde el pico de crecimiento (`salud-lesiones.md` línea 125, duda 9; el servicio de salud ya recibe `sexo?: 'm'\|'f'`) | Va con la fase de salud |
| Menstruación | **Solo preparada**: `menarquia` opcional en el estado del personaje y de los PNJ (edad de la primera regla, sorteo estable) y hueco para el ciclo. **Sin efectos ni textos** hasta que salud la diseñe (efecto en energía, sueño, rendimiento, avisos y tono) | Mínimo (campo) |
| Competiciones | Según la decisión del usuario (§5, duda 1): ninguna, categorías mixtas hasta una edad, o ligas femeninas propias | Variable (ver §3) |
| Atletismo | Marcas y pruebas por sexo (separar tablas y campeonatos) | Medio; aparte |

## 3. Coste de los equipos femeninos con la ciudad grande

Estimado con las medidas de §1.5 (no hay código de ligas separadas que medir; el cálculo es sobre el reparto real de jugadores):

- **Mismos jugadores, separados por sexo** (el reparto actual: ≈ 50 % de chicas): los jugadores no cambian; los equipos pasan de 32/32/31/31/41 a **34/34/33/32/41** por categoría (+0–6 %: la fragmentación por tener que llenar plantillas de 14–18 por sexo), y las ligas, de una por categoría a dos. El coste del día de partido, de la clasificación y del guardado es **proporcional a jugadores y equipos**: **≈ +0–10 %** sobre los ≈ 11 s de crear y los 16,6 MB de `npcs` que hay hoy. Más ligas son más clasificaciones guardadas (pequeñas).
- **Con proporción realista de chicas (10–15 %, interés por el fútbol con sesgo)**: los futbolistas bajan ≈ 35–40 %, **el coste baja** en proporción, y las chicas de una categoría de una zona serían ≈ 55–80, o sea **3–5 equipos femeninos por categoría** en toda la ciudad (con 13 clubes, la mayoría sin equipo femenino). Con ese número hay que decidir si las ligas femeninas son de 1 sola división (de 3–5 equipos no sale una liga de 18 jornadas) o se mezclan categorías (p. ej. infantil+cadete).
- **Para medir de verdad** cuando se decida: `npm run rendimiento -- 60`, `npm run equipos` y `npm run fluidez` con el nuevo reparto (herramientas que ya existen).

## 4. Fases y recomendación

| Fase | Contenido | Depende de decisión | `huella` |
|---|---|---|---|
| **A. Elegir sexo, sin tocar el deporte** | Estado + selector, nombre/apellidos/padres por sexo, altura, `yo.gender`, textos y validación, menarquia solo como campo, retrato | No (el deporte sigue mixto, como ya es) | Idéntica con `'m'` por defecto |
| **B. Estirón y lesiones por sexo** | Estirón de las chicas; lesiones por sexo con la fase de salud | Duda 4 y la fase de salud | Cambia (se recalibra) |
| **C. Competiciones** | Según la duda 1: mixtas hasta cierta edad y ligas femeninas propias (como dato del país), sesgo de interés por el fútbol, atletismo por sexo | Duda 1, 2 y 3 | Cambia |
| **D. Menstruación** | Diseño y efectos con salud | Duda 5 | Cambia |

**Recomendación**: hacer **A** ya (es lo que el usuario pide: poder elegir) y dejar el deporte tal como está, porque **ya es mixto de hecho y funcionaría**; después B con salud; C solo cuando el usuario decida el mundo. A y C son independientes: A no cierra ninguna puerta de C.

## 5. Dudas para el usuario (cada una con recomendación)

1. **¿Qué mundo quiere para una chica en el fútbol?** (a) Seguir con equipos mixtos en todas las categorías (lo que hay: la mitad de los jugadores son chicas); (b) mixtos en benjamín y alevín y **ligas femeninas propias desde infantil** (como la federación, más o menos); (c) ligas femeninas separadas desde benjamín. **Recomiendo (b)**: es lo más fiel y no cuesta nada hasta infantil. *(Se necesitan datos reales de la federación del paquete de país; no los he confirmado.)*
2. **¿Cuántas chicas juegan al fútbol?** Hoy salen el 50 % (el interés no depende del sexo). Con (b) en el mundo real habría pocas en infantil y cadete y sería difícil llenar equipos. **Recomiendo** un sesgo de interés por sexo (dato del país) para acercarse a la realidad sin llegar a que una chica no encuentre equipo, y comprobar con `tools/chicas-en-equipos.ts` que cada categoría femenina llena al menos 3 equipos.
3. **Si no hay equipo femenino en su edad o su club, ¿puede jugar en uno de chicos?** Recomiendo **sí hasta alevín y, después, solo si no hay equipo femenino cerca** (como en las territoriales), con la regla de plaza de siempre.
4. **¿Se modela el estirón más temprano de las chicas?** Recomiendo **sí**: desplazar la `madurez` media (≈ +1,5 años) para los dos tipos de persona, y comprobar con `sim:cuerpo`. Afecta también a las PNJ de ahora y cambia la `huella`.
5. **Menstruación**: ¿con qué tono y qué efectos? Recomiendo **solo el campo ahora** y diseñarla dentro de la fase de salud con la misma regla para el personaje y las PNJ.
6. **Atletismo por sexo**: ¿pruebas y marcas separadas por sexo? Recomiendo **sí, en una fase aparte** (cambia el reparto de rivales y los campeonatos).
7. **¿Dónde se cambia el sexo?** Recomiendo **solo al crear la partida** (nada de cambiarlo después), como el nombre.

## 6. Comprobación

- `npm run typecheck` y `npm run huella -- 60`: ver el mensaje de cierre; no se cambia ningún archivo del juego.
- Herramienta añadida: `tools/chicas-en-equipos.ts` (`npx tsx tools/chicas-en-equipos.ts [semillas] [veranos]`), solo lectura; no está en `package.json`. Los números de §1.5 son de 2 semillas y 1 verano: con 3 o más se pueden afinar, pero el orden de magnitud no cambiará.
