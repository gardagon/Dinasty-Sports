# Anexo: pestaña del deporte y clasificaciones

Qué enseña la pestaña «Deporte» de cada deporte y las reglas de las clasificaciones de temporada, con todas las cifras para revisarlas. Código: `modules/atletismo/src/temporada.ts` (reglas puras), `modules/atletismo/src/index.ts` (`vistaDeAtletismo`), `packages/contracts/src/deporte.ts` (contrato), `packages/kit-deporte` (lo común a todos los deportes con club: clubes, entrenador, categorías, verano, tele, sobrecarga) y `apps/web/src/deporte.ts` (interfaz). Estado a 27/10/2026 (validado contra el código).

## 1. Cómo funciona

- Cada módulo de deporte publica un servicio `deporte.<id>` con una **vista** (`DeporteView`). La interfaz recorre los servicios que empiezan por `deporte.` y dibuja la pestaña **«Deporte»** (siempre se llama así; con varios deportes, un selector elige cuál se ve). La interfaz no sabe nada de ningún deporte concreto.
- **Un deporte nuevo** solo tiene que publicar ese servicio. Para tener clasificaciones completas, guardar en su estado la clasificación de cada prueba (como hace atletismo en `resultados`).
- Se guarda la **clasificación completa** (todos los corredores con su marca y club) de cada prueba del **curso en curso y el anterior**; de los cursos más viejos solo queda el resumen (puesto, total y marca). Máximo 200 pruebas guardadas. Medido: ~25 carreras con su clasificación, más el estado y el historial de cada jugador tras medio curso, suman menos de 200 KB de partida.

- **La pestaña está desactivada hasta que practicas el deporte** (hasta apuntarte a un club): se ve «Deporte» en gris, con el motivo al pasar el ratón. En cuanto te apuntas se completa con todo lo de abajo; si dejas el club, vuelve a desactivarse. El módulo marca `DeporteView.inactivo` (texto de qué hacer). Desde el 17/11/2026 **solo se compite en un deporte** (ver §2): normalmente hay un solo club y la pestaña enseña ese deporte. `deportePrincipal` (contracts) y el selector siguen ahí por si una partida antigua trae clubes de dos deportes.

## 2. Clubes: cómo entrar, cambiar y salir

| Qué | Reglas |
|---|---|
| Apuntarte al club del colegio | En la **administración del colegio** (zona dentro del colegio, a 2 minutos de él), con horario: días de clase de 9:00 a 13:30 y de 15:00 a 18:00. Antes de aceptar, la descripción de la acción cuenta **cuándo entrena y cuándo hay carreras**. Al entrar **conoces al entrenador** que lleva tu edad (se presenta). |
| Prueba de un club de fuera | (Solo si no compites en otro deporte: §2.) En la **sala del club** (dentro del estadio; de lunes a viernes de 16:00 a 21:00 y sábados de 9:00 a 14:00), **solo en las horas de entrenamiento del club** (Club Atletismo Ciudad: martes y jueves de 18 a 20; Alto Rendimiento: lunes, martes y jueves de 17 a 20); 150 min. Se puede hacer **estando en otro club**. Exige edad y nivel (Club Atletismo Ciudad: 10 años y nivel 45; Alto Rendimiento: 14 y 65); si no pasas, repetir tras 8 semanas. |
| Si pasas sin tener club | Entras directamente (la inscripción se hace ahí mismo). |
| Si pasas teniendo ya otro club | Te **ofrecen plaza** (vale 8 semanas, `SEMANAS_DE_OFERTA`) y decides con «Aceptar la plaza en…» (en la sala del club, 15 min). |
| Entrenamiento con el club | Los miembros del club están en la **pista** (la del colegio, o el estadio) **10 minutos antes** de la sesión. Entras a la sesión desde entonces y hasta que acaba: la acción dura lo que queda y, si llegas tarde, **solo entrenas la parte proporcional** (modificador `atletismo.llegada_tarde`). **Mientras hay sesión de tu club (y no has entrenado con él ese día) no se puede entrenar por libre.** |
| Pedir consejo al entrenador | «Pedir consejo a tu entrenador» (`atletismo.pedir_consejo`, 15 min): **una vez al día**, con el entrenador de tu club que lleva tu edad y que ya conoces, y solo cuando está libre en su sede (pista del colegio o estadio): antes o después de la sesión. Sube el **conocimiento** (+1, `CONOCIMIENTO_POR_CONSEJO`) y **un poco una habilidad** (+0,3: técnica, ritmo o salida por turnos según el día) y gasta 1 de energía. Hablar con él solo sube la afinidad. |
| Conocimiento de partida | Si los padres del personaje practicaron deporte, empieza con algo de conocimiento de atletismo (primer día): por cada padre aficionado +4, federado +8, profesional +14, del todo si su deporte fue el atletismo y un tercio si fue otro; tope +20 (`conocimientoDeCrianza`). |
| Dejar el club | «Dejar el club de atletismo» en la administración (club del colegio) o en la sala de tu club: sin coste. Quien deja antes el suyo y después acepta, no paga nada. |
| Aceptar la plaza **sin haber dejado antes el otro** | Lo dejas plantado: **estrés +10** (`ESTRES_POR_PLANTON`), con su **entrenador** afinidad −15 y confianza −10 y con **cada miembro de su equipo que conoces** afinidad −6 y confianza −3 (`PLANTON`). |
| Horarios | Un lugar con horario **no desaparece** fuera de él: sale en gris y dice cuándo abre (también al ir allí: se mira la hora a la que llegarías). |
| Entrenadores | Cada club tiene varios, cada uno con las categorías de unas edades (alguno lleva varias): **colegio** 1 (todas las edades); **Club Atletismo Ciudad** 3 (10–13, 14–17, 18 o más); **Alto Rendimiento** 2 (14–17, 18 o más). Los de fuera son personas desconocidas (nombre generado) hasta que te apuntas: se presenta el que lleva tu edad. En el resumen de la pestaña sale **el que lleva tu edad en tu club**, con los días de entreno y las carreras. A futuro cada entrenador tendrá **sus propias habilidades** (según su carácter, su conocimiento del deporte y sus capacidades), mejores en los clubes que en el colegio. |

### Un solo deporte de competición (decidido el 17/11/2026)

El personaje y los PNJ pueden practicar varios deportes por su cuenta, pero **compiten en uno solo y en un solo club o equipo**. Mientras el personaje está en el club o el equipo de un deporte (también el del colegio), en los demás deportes **«Apuntarte al club del colegio», «Apuntarte a…», «Pedir hacer una prueba», «Unirte al entrenamiento de prueba», «Prueba de acceso» y «Aceptar la plaza» salen no disponibles** con el motivo **«Ya compites en <deporte>: déjalo antes»**. Dejar el club (`<deporte>.dejar_club`) abre la puerta. Entrenar por tu cuenta otros deportes (series, balón, tiro…), verlos en la tele, etc. sigue permitido. Dentro del mismo deporte no cambia nada (prueba estando en otro club, plaza ofrecida, plantón). Está en el kit (`motivoDeCompetirEnOtroDeporte`, `club.ts`): mira la pertenencia a clubes (`ClubDirectory.membership`) de las demás fichas de deporte de la partida (`deportes.ficha`), así que ningún deporte conoce a otro. **PNJ:** `Npc.deporte` es uno solo y no hay dos clubes de deportes distintos (lo comprueba `tests/un-deporte.test.ts`). Se podrá abrir cuando haya más deportes.

### Entrenamientos agrupados en la lista (decidido el 17/11/2026)

En la lista de acciones no salen sueltos los entrenamientos por libre de un deporte: sale **una sola acción «Entrenar…» por deporte**, bajo «Entrenar <deporte>», con un desplegable «Entrenamiento» (cada opción con su duración, y «(no disponible)» si no se puede) y, debajo, el botón que lanza la elegida (nombre, duración y el motivo si no está disponible). Las acciones siguen existiendo con sus ids (`atletismo.series`, `futbol.entrena_toques_y_pared`…): sim, bots y tests no cambian. Es un **dato** (`ActionDef.desplegable: { id, nombre, etiqueta, boton }`, contracts → `ActionOption.desplegable` en core): las acciones del mismo `group` y `desplegable.id` se agrupan, y sirve para cualquier otra lista larga. El kit lo pone a los `entrenosLibres` del deporte (`entrenosAgrupados`); la interfaz (`apps/web/src/desplegables.ts`) no sabe de qué deporte se trata. La sesión del club y el resto no se agrupan.

**Más listas agrupadas (17/11, `docs/relevo/fichas-y-listas.md`):** «Estudiar…» (cada asignatura del curso y el repaso general; botón «Estudiar lengua»), «Pedir tutoría…» (cada asignatura), y, cuando hay **dos deportes**, un solo «Campamento…» y «Ver un deporte en la tele…» (y «Practicar con los amigos…» en el atletismo; en el fútbol ya no existe: ver «Quedar a jugar al fútbol») (la opción es el deporte; antes salían dos botones con el mismo nombre). El desplegable gana `opcion` (cómo se llama cada acción dentro de la lista: «Lengua», «Fútbol») y el texto del botón admite `{nombre}` (el nombre completo de la acción) además de `{opcion}`. **Si de un desplegable solo existe una acción** (un deporte instalado), se dibuja como un botón normal. **Acciones del club** (`accionesDeClubes`, `docs/relevo/club-desplegables.md`): «Prueba de acceso…» (desplegable «Club», un club por opción: `<deporte>.prueba.<club>` o, con puestos, los tres pasos `pedir_prueba`, `prueba` y `prueba_entrenar`) y «Aceptar plaza…» (`<deporte>.aceptar_plaza.<club>`) van agrupadas; «Entrenamiento con el club», «Dejar el club» y «Apuntarte al club del colegio» siguen sueltas. Los ids no cambian. El análisis de todas las listas, con `npm run listas` (`tools/listas-de-acciones.ts`).

### Los 22 entrenamientos del fútbol, quedar a jugar y los campamentos (decidido el 21/11/2026; `docs/relevo/entrenamientos.md`)

**Un catálogo de datos** (`modules/futbol/src/entrenamientos.ts`, 22 entradas: portería 5, físico 5, mental 4, técnico 8) del que salen las tres formas de entrenar. Cada entrada dice **qué sube, dónde se hace, con quién, cuánto dura y cuánto cansa**. La tabla de abajo sale de `npm run entrenamientos:tabla`.

- **Por tu cuenta (desplegable «Entrenar…»).** Salen **los 22**, agrupados por apartados (Portería, Físico, Mental, Técnico: `desplegable.grupoDeOpcion`, un campo nuevo del contrato que la interfaz dibuja como `optgroup`). Los que se pueden hacer solos (`solo`) están disponibles en su horario; los que necesitan compañía salen **no disponibles** con el motivo «Hace falta compañía: se trabaja con el entrenador en la sesión del club». Rinden **×0,85** (entrenar sin entrenador). Ids: `futbol.entrena_<id>`. Portería está **abierta a todos** (quien quiera probar de portero puede).
- **Con el club.** Los que llevan `club` son **ejercicios de la sesión del entrenador** (19 de los 22), con las mismas cifras llevadas a una hora de trabajo y **sin el ×0,85**; el conocimiento y el juego colectivo suben siempre (`SIEMPRE`). Los de portería (`soloPuesto: 'GK'`) **solo los hace quien juega de portero**, y los de campo técnicos (`noPara: 'GK'`) **no** los hace el portero: su sesión es un ejercicio de portería más uno físico o mental. Los PNJ eligen con la misma regla (`listaDeSesion` recibe su puesto). **Arregla un fallo de antes:** el ejercicio de porteros era `soloPuesto: 'portero'`, pero el puesto es `GK` y nadie pasaba el puesto: no salía nunca, para nadie.
- **«Tiro a puerta» ya no es casi todo balón parado:** definición 3,5, disparo lejano 2 y sangre fría 1. Faltas, penaltis, córners y saque de banda tienen su entrenamiento propio (T7, «Balón parado»).
- **Pedir consejo al entrenador:** a quien juega de portero le habla de lo suyo (reacción, blocaje, mano a mano, dominio del área, posicionamiento), no de «mejora tu técnica». Es una lista por puesto en el fútbol (`pedirConsejo` del kit admite una función); la **recomendación de entrenamientos** por lo que te falta (pista 3) queda para la sesión de puestos y pistas, que leerá este catálogo.
- **Con amigos ya no es un entrenamiento: es quedar a jugar al fútbol, todo el año.** Es una actividad más de «Proponer quedar para…» (`docs/ANEXO_RELACIONES.md`, «Planes»): el deporte la **aporta** (`APORTES.quedadaDeDeporte`, `QuedadaDeDeporte` en contracts; `modules/futbol/src/quedadas.ts`) y relaciones la lee sin saber de fútbol. Hay una por **forma de jugar** y **lo que sube sale de lo que se juegue**: partidillo (lo del juego informal de siempre), 3 contra 3 (decisiones, visión, juego colectivo), tiros y paradas (tiro y un poco de portería) y a ver quién la mete (balón parado). 120 minutos, en el parque o los campos, −12 de energía y −6 de estrés; sube unas 2 habilidades por rato (frente a las ~11 de una hora de entrenamiento: sienta bien, no se mejora igual). Sin etiqueta `entrenamiento`: no cuenta para la sobrecarga ni sube el conocimiento. El verano ya no tiene «Practicar con los amigos» de fútbol (el atletismo lo conserva).
- **Campamentos de jugadores y de porteros, por separado** (`futbol.campamento_jugadores`, `futbol.campamento_porteros`, en «Campamento…» con las opciones «Fútbol: jugadores» y «Fútbol: porteros»): 5 horas, seis bloques de 50 minutos, ×1,2. Los dos comparten los **bloques de todos** (agilidad y coordinación, posicionamiento y anticipación); el de jugadores añade toques y pared, defensa uno contra uno, rondos y pase y tiro a puerta (**no es solo ataque**: hay defensa, pase y mente); el de porteros, reflejos, balones aéreos, mano a mano y pies de portero. Un solo campamento por día (comparten `ultimoVerano`).

**Balance (`ESCALA_DE_ENTRENAMIENTO` = 1, en `entrenamientos.ts`).** Las cifras de la tabla son las del informe, con una escala única. Medido con `npm run sim:futbol -- 365 3` (un deportista de campo, un curso, tres semillas):

| | puntos de habilidad / curso | capacidades | sesiones de club |
|---|---|---|---|
| Antes | 154 (de ellos ~43 de portería que subía un jugador de campo) | 35,4 | 11 |
| Escala 0,55 | 80 | — | 11 |
| Escala 0,9 | 104 | 34,0 | 11 |
| Escala 1,4 | 127 | 36,0 | 11 |
| **Escala 1 (elegida)** | **110** (el 99 % de los ~111 de campo de antes) | 34,5 | 11 |

Se eligió 1 porque deja el curso de campo parecido al de antes sin la portería de más (~111) y porque el club rinde **al menos como entrenar por libre por hora** (cada entrenamiento que se hace solo y con el club rinde ×1/0,85 en el club: lo comprueba `entrenamientos.test.ts`). Consecuencia a vigilar: **una sesión del club sube unos 13 puntos de habilidad (dos ejercicios de una hora) en vez de ~6**; el club era la rama que menos rendía por hora. La subida se frena sola con el tope por edad, así que no se dobla el nivel de los niños (ver el relevo para lo que se midió).

**Portería**

| # | Nombre | Sube (por libre, antes de ×0,85) | Dónde | Con quién | Min | Cansa | Hab./h solo | Hab./h club |
|---|---|---|---|---|---|---|---|---|
| P1 | Reflejos y paradas | reflejos 3,5, blocaje 2, mano a mano 1, coordinación 0,5, conocimiento 0,7 | campo_colegio, campo_municipal | solo, club | 60 | −14 | 5,53 | 6,5 |
| P2 | Centros y balones aéreos | alcance aereo 2,5, dominio area 2, blocaje 1,5, salto 0,5, conocimiento 0,7 | campo_colegio, campo_municipal | club | 60 | −14 | — | 6,5 |
| P3 | Mano a mano y salidas | mano a mano 3, dominio area 1,5, anticipacion 1, sangre fria 1, conocimiento 0,7 | campo_colegio, campo_municipal | club | 45 | −12 | — | 8,67 |
| P4 | Pies de portero | despeje 3, pase 1,5, control 1, vision 1, conocimiento 0,6 | campo_colegio, campo_municipal, parque | solo, club | 60 | −10 | 5,53 | 6,5 |
| P5 | Mando del área | dominio area 2,5, posicionamiento 2, decisiones 1, juego colectivo 1, comunicación 0,3, conocimiento 0,7 | campo_municipal | club | 60 | −8 | — | 6,5 |

**Físico**

| # | Nombre | Sube (por libre, antes de ×0,85) | Dónde | Con quién | Min | Cansa | Hab./h solo | Hab./h club |
|---|---|---|---|---|---|---|---|---|
| F1 | Velocidad y arrancadas | arrancada 3,5, velocidad 1,2, agilidad 0,4, conocimiento 0,3 | campo_colegio, campo_municipal, parque | solo, club | 45 | −18 | 3,97 | 4,67 |
| F2 | Carrera continua | resistencia 2,5, conocimiento 0,3 | parque, campo_colegio | solo | 60 | −16 (estrés -4) | 0 | — |
| F3 | Fuerza y saltos | salto 2, entrada 0,5, fuerza 1,5, conocimiento 0,3 | gimnasio | solo, club | 60 | −18 | 2,13 | 2,5 |
| F4 | Agilidad y coordinación | arrancada 1,5, control 0,5, agilidad 1,2, coordinación 1,2, conocimiento 0,3 | campo_colegio, parque | solo, club | 45 | −10 | 2,27 | 2,67 |
| F5 | Saltos y cabeceo | salto 2,5, cabeza 2, fuerza 0,3, conocimiento 0,3 | campo_colegio, campo_municipal | club | 45 | −14 | — | 6 |

**Mental**

| # | Nombre | Sube (por libre, antes de ×0,85) | Dónde | Con quién | Min | Cansa | Hab./h solo | Hab./h club |
|---|---|---|---|---|---|---|---|---|
| M1 | Pizarra y vídeo de jugadas | vision 2, decisiones 1,5, posicionamiento 1,5, conocimiento 1 | casa, biblioteca | solo | 45 | −3 (estrés +2) | 5,67 | — |
| M2 | Posicionamiento y anticipación | posicionamiento 2,5, anticipacion 2,5, desmarque 1, conocimiento 0,6 | campo_colegio, campo_municipal | club | 60 | −14 | — | 6 |
| M3 | Juegos reducidos (3 contra 3) | decisiones 2,5, vision 1,5, juego colectivo 1,5, sangre fria 0,5, conocimiento 0,6 | campo_colegio, campo_municipal, parque | club | 60 | −16 | — | 6 |
| M4 | Bajo presión (marcador, penaltis) | sangre fria 3, penaltis 1, concentración 0,5, conocimiento 0,6 | campo_colegio, campo_municipal | club | 45 | −10 | — | 5,33 |

**Técnico**

| # | Nombre | Sube (por libre, antes de ×0,85) | Dónde | Con quién | Min | Cansa | Hab./h solo | Hab./h club |
|---|---|---|---|---|---|---|---|---|
| T1 | Toques y pared | control 3, pase 2, tecnica 1,5, conocimiento 0,8 | campo_colegio, campo_municipal, parque | solo, club | 60 | −14 | 5,53 | 6,5 |
| T2 | Regate y conducción | regate 3,5, control 1,5, tecnica 1,5, conocimiento 0,8 | campo_colegio, campo_municipal, parque | solo, club | 60 | −14 | 5,53 | 6,5 |
| T3 | Rondos y pase | pase 3, juego colectivo 1,5, vision 1, control 1, conocimiento 0,8 | campo_colegio, campo_municipal, parque | club | 60 | −14 | — | 6,5 |
| T4 | Tiro a puerta | definicion 3,5, disparo lejano 2, sangre fria 1, fuerza 0,3, conocimiento 0,8 | campo_colegio, campo_municipal | solo, club | 60 | −14 | 5,53 | 6,5 |
| T5 | Centros y remates | centros 3, cabeza 2, desmarque 1,5, conocimiento 0,8 | campo_colegio, campo_municipal | club | 60 | −14 | — | 6,5 |
| T6 | Defensa uno contra uno | marcaje 2,5, entrada 2,5, anticipacion 1, posicionamiento 0,5, conocimiento 0,8 | campo_colegio, campo_municipal | club | 60 | −16 | — | 6,5 |
| T7 | Balón parado | faltas 2, penaltis 2, corners 1,5, saque banda 1, conocimiento 0,6 | campo_colegio, campo_municipal | solo, club | 60 | −8 | 5,53 | 6,5 |
| T8 | Malabares y técnica individual | tecnica 3,5, control 2, coordinación 0,5, conocimiento 0,6 | casa, parque | solo | 45 | −8 | 6,23 | — |

**Quedadas**

| Quedada | Sube | Dónde | Min |
|---|---|---|---|
| Jugar al fútbol: partidillo | control 0,3, regate 0,4, definicion 0,3, juego colectivo 0,4, carisma 0,4, cooperacion 0,4 | parque, campo_colegio, campo_municipal | 120 |
| Jugar al fútbol: 3 contra 3 | decisiones 0,5, vision 0,3, juego colectivo 0,5, regate 0,3, control 0,3, carisma 0,3, cooperacion 0,3 | parque, campo_colegio, campo_municipal | 120 |
| Jugar al fútbol: tiros y paradas | definicion 0,4, disparo lejano 0,3, reflejos 0,3, blocaje 0,2, mano a mano 0,2, carisma 0,3, cooperacion 0,3 | campo_colegio, campo_municipal | 120 |
| Jugar al fútbol: a ver quién la mete | faltas 0,4, penaltis 0,4, corners 0,3, saque banda 0,2, sangre fria 0,2, carisma 0,3, cooperacion 0,3 | campo_colegio, campo_municipal | 120 |


### Deportes con puestos (el fútbol): prueba de acceso y pedir puesto (decidido el 17/11/2026)

Todo está en el kit de deporte (`packages/kit-deporte/src/club.ts` y `puestos.ts`), para cualquier deporte con `puestosDelDeporte`; los textos, en el paquete del deporte (`modules/futbol/src/eventos/textos_de_puesto.ts`).

- **La prueba de acceso, en tres pasos y un suceso** (los clubes de fuera; el del colegio no hace prueba): **«Pedir hacer una prueba en X»** (en los trámites del club, en sus horas; 10 min; te dicen cuándo entrena el equipo que te toca) → **«Unirte al entrenamiento de prueba de X»** (5 min; solo sale tras pedirla): sale el suceso `<deporte>.prueba_de_acceso`, en el que el entrenador **se presenta** (pasa a ser conocido) y dice **lo que más necesita**: con huecos en **1 o 2 grupos de puestos** los nombra («lo que más necesito son centrales y laterales»); con huecos en más de 2, dice que necesita en **varios**; sin huecos solo se presenta. Tú eliges entre **todos** los puestos (más «donde él vea»): si en el que eliges hay hueco (lo dijera o no), te prueba ahí; si no, te dice que no es ninguno de esos y te prueba donde decida él. **Cómo se mide «lo que más necesita»:** por grupo de puestos del reparto de la plantilla (portero, centrales, laterales, mediocentros, bandas, delanteros), cuántos jugadores le faltan = cupo del grupo (el reparto del máximo del equipo, `cuposPorGrupo`) menos los que hay de ese grupo en el equipo de tu categoría (`NpcDirectory.huecosPorGrupo`); sin huecos si el equipo está completo. Se nombran los grupos con más faltas (a igualdad, aquel en que falta mayor parte del cupo) mientras no pasen de 2 (`GRUPOS_QUE_NOMBRA_EL_ENTRENADOR`) → **«Entrenar a prueba con el equipo»** (145 min; no sale mientras el suceso espere respuesta): al acabar te dicen qué tal ha ido y **la plaza se mide en el puesto en que te han probado** (el elegido; si no, el que más vales, prefiriendo un hueco). Si no pasas, repetir tras 8 semanas, como siempre. Las acciones «Pedir jugar de <puesto> en las pruebas» y «Dejar que el club decida…» **ya no existen**.
- **Pedir otro puesto estando en el equipo:** en la ficha de tu entrenador, «Pedir jugar…» con un desplegable de puestos (servicio de conversación `conversacion.<deporte>`, `ConversacionService`; la interfaz no sabe de qué deporte es). Lanza la acción `<deporte>.pedir_puesto.<entrenador>.<puesto>` (5 min; no sale en la lista general) y decide el suceso `<deporte>.pedir_puesto` con una tirada de comunicación (`ajustesDePedirPuesto`). Si lo concede, es el cambio de puesto de siempre (`club.cambio_de_puesto`). **El cambio de puesto que se pide en el primer entrenamiento** (`futbol.primer_entrenamiento`, «Pedirle jugar de…») **cuenta para las 4 semanas** de la ficha: lanza `club.peticion_de_puesto` (salga bien o mal) y el kit apunta `ultimaPeticionDePuesto`, así que pedirlo en la ficha antes de 28 días es «mal rato» (−3 de afinidad). **Para no preguntar todo el rato** (pendiente de que el usuario elija; los dos mecanismos están hechos y son datos editables en `ConfigDeporte.pedirPuesto`): una **espera** (`esperaDias`, hoy 0 = sin espera) y un **mal rato** (`enfadoSiPocoTiempo`, hoy 28 días (4 semanas) y −3 de afinidad: si se lo pides pasado menos tiempo, se lo toma mal).

### La plantilla del equipo: qué es el puesto, y la rotación en los colegios (decidido el 21/11/2026; `docs/relevo/rotacion-y-puestos.md`)

- **La columna «Puesto en la plantilla»** (antes «Puesto») es el puesto que ocupa cada niño en la plantilla, no donde juega cada sábado: el que más vale de los de su grupo (el club le hizo hueco en ese grupo) o su favorito. **Que casi todos sean del lado derecho no es un fallo:** los puestos de los dos lados pesan igual y solo cambia la pierna buena (±0,25: en torno al 20 % de zurdos), así que ~80 % de los puestos con lado son derechos; el entrenador alinea con la formación del equipo (lateral izquierdo y derecho, extremos izquierdo y derecho…), de modo que el once siempre tiene los dos lados (medido y vigilado por `tests/puestos-de-la-plantilla.test.ts` y `npm run puestos-del-once`). La sección lo explica debajo del título.
- **Rotación en los equipos de colegio de benjamín y alevín** (`CIUDAD_Y_LIGAS.md` §5, `CategoriaDef.rotacionEn`): el entrenador rota para que todos jueguen algo a lo largo de la liga; la convocatoria y el once pesan lo poco que ha jugado cada uno esta temporada. Igual para el personaje y los PNJ. Se mide con `npm run rotacion` y `npm run benjamin`.

### «Mi equipo» y las habilidades por grupos (decidido el 21/11/2026; `docs/relevo/mi-equipo.md`)

Todo es genérico (contratos `DeporteView.miEquipo`, `DeporteView.gruposDeHabilidades` y `ComparacionService`): la web no sabe de fútbol; vale para cualquier deporte de equipo con puestos. Código del fútbol: `modules/futbol/src/mi-equipo.ts` (reglas puras), `index.ts` (`miEquipoDeFutbol`, `verACompaneros`) y `habilidades.ts` (`GRUPOS_DE_HABILIDADES`).

- **Subpestaña «Mi equipo»**, dentro de la pestaña del deporte (al lado de la del deporte; solo si el deporte publica `miEquipo`). Título: «Equipo B · <club>». Tabla de compañeros (tú, resaltado, el primero): **quien conoces sale con su nombre; quien no, con la descripción de su aspecto** (la de Gente: `aspectoDe`, en contracts) y «aún no sabes cómo se llama». **El puesto solo se enseña si le has visto jugar** («—» hasta entonces). Primero los que conoces, por nombre, y luego los demás por descripción.
- **Qué desbloquea ver a alguien** (`verACompaneros`): **entrenar con el club** (cada sesión `<deporte>.club_sesion`: ves entrenar a los compañeros de tu equipo que no están lesionados, cada uno en el puesto que ocupa en la plantilla) y **un partido en que estás en la convocatoria** (juegas, o lo ves desde el banquillo): los compañeros que salieron al campo, en el puesto en que jugaron. Se guarda por persona en `FutbolState.companeros`: `[puesto, diferencia, veces, semana]`.
- **La comparación («Crees que eres mejor / peor que él», o «jugáis más o menos igual de bien»)**, en la ficha de Gente (bloque «Comparado contigo», de los servicios `comparacion.<deporte>`), solo de quien has visto jugar y sin números. **Cómo se calcula** (lo que ve un niño, no el dato exacto): la diferencia entre lo que vale él en su puesto y lo que vales tú en el tuyo (0–100), **más un error** distinto cada día (sale del compañero y del día), de desviación 8 puntos sin conocimiento de fútbol y 3 con el conocimiento al máximo (`PARAMETROS_DE_PERCEPCION.ruido`). Cada vez que lo ves de nuevo se hace la **media** de lo estimado (hasta 8 veces; después cada vistazo pesa 1/8): con los entrenamientos la impresión se afina. **Parecido** si la diferencia media está a menos de 5 puntos (`parecido`); a partir de ahí, mejor o peor.
- **Tamaño del guardado:** cuatro datos por compañero (≈ 30 bytes) y un máximo de 60 compañeros (`guardados`: se olvidan los vistos hace más): < 2 KB.
- **La plantilla de la sección «Plantilla · equipo»** (la tabla con minutos, goles y nota) sigue la misma regla: el nombre solo de quien conoces (de los demás, su aspecto) y el puesto solo de quien has visto jugar.
- **Habilidades por grupos:** el deporte las publica en `gruposDeHabilidades` (título y habilidades de cada grupo) y la web pone un título por grupo. Fútbol: **Portería, Físico, Mental, Técnico** y, aparte, **Conocimiento** (el grupo de cada habilidad es el `grupo` de su definición en `habilidades.ts`). Sin `gruposDeHabilidades`, se enseñan seguidas (atletismo).

### Dorsales, crónica sin nombres de desconocidos y comparación en «Mi equipo» (decidido el 21/11/2026; `docs/relevo/dorsales.md`)

- **Dorsales** (`packages/contracts/src/dorsales.ts`, dato del deporte `PuestosDeDeporte.dorsales`: `ReglaDeDorsales`; fútbol: `DORSALES_DE_FUTBOL` en `modules/futbol/src/puestos.ts`). Cada jugador de cada equipo lleva el número de su camiseta, también el personaje.
  - **Los de campo:** al azar del 2 al 25; el 55 % de las veces (`pesoDeLaCostumbre`) va por la **costumbre de su puesto** si alguno de sus números sigue libre (lateral derecho 2, izquierdo 3, centrales 4 o 5, pivote 6, medios 8 o 6, bandas 7 u 11, mediapunta 10, extremos 11 y 7, delanteros 9, 11 o 10); si no, cualquier libre. Con más de 24 de campo, el primero libre desde el 26.
  - **Los porteros:** el 1 o el 13 (el 1, con un 65 %) y, si están cogidos, el primero libre desde el 16. **Escogen después de los de campo** (un de campo puede haber cogido el 13).
  - **Estable y sin gastar el azar de la partida:** `rngEstable('dorsal', equipo, id)`. Se asigna al entrar en el equipo y se conserva **mientras siga en el club** (aunque cambie de letra o de categoría); `asignarDorsales` respeta lo guardado y solo da número a quien no lo tiene (si dos repiten, el segundo se reasigna). Se pierde al dejar el deporte (`sinDeporte`).
  - **Guardado ligero:** PNJ, `Npc.dorsal: Record<deporte, número>` (`repartirDorsales`, al fijar los equipos en verano y al crear la partida; `plantillaDeUnEquipo` da número, sin guardarlo, a quien llegó después); personaje, `FutbolState.dorsal: [club, número]` (lo escoge entre los que sus compañeros no llevan). Coste: ≈ +3 KB en el estado de una partida nueva (`npm run presupuesto -- --peso`). Las partidas guardadas por una versión anterior (sin la regla de dorsales en su población) la reciben al cargar (`GameModule.alCargar`, ver «Las partidas guardadas por la versión anterior» más abajo): los dorsales de los PNJ se asignan al vuelo hasta el reparto del verano.
  - `JugadorDeEquipoView.dorsal` lo publican los directorios; el motor de partido no lo usa.
- **La crónica del partido** (`cronicaDelPartido`, `OpcionesDeCronica`): **el nombre solo de quien el personaje ya conoce** (`known`, mirado al registrar el partido; **jugar contra alguien no te da su nombre**, ver «Los rivales no se conocen al jugar»); de quien no, **el dorsal con concordancia**: los de tu lado, «vuestro 4» / «vuestra 4»; los rivales, «el 7 del Rayo» / «la 7 del Rayo» (el equipo sin su letra; «de La Salle», «de la Escuela…» con su artículo: `jugadorPorSuDorsal`). **Y, la primera vez que sale en la crónica, cómo es** (`descripciones`: la de Gente, `aspectoDe`, en minúscula y entre paréntesis: «Vuestro 7 (un niño de pelo negro liso, ojos marrones y piel clara) marca, asistido por vuestra 4 (una niña de pelo rubio…)»; después, solo el número; los de tu equipo y los rivales igual). Con un nombre se pone su equipo entre paréntesis («Carla (Rayo A) dispara…»); con un dorsal no hace falta. El personaje, siempre «tú». Sin nombre ni dorsal, «un jugador». Los textos son de los de siempre: lo único que cambia es cómo se nombra a cada uno.
- **«Mi equipo», dorsal y comparación** (corrección del usuario, 21/11): **la descripción de quien no conoces se queda entera** (la de Gente, `aspectoDe`); el dorsal y la comparación se añaden como datos más. Dos columnas, «Nº · Compañero» y «Puesto»: en la primera, **el dorsal delante del nombre o de la descripción** («7 · Una niña de pelo castaño…», siempre visible: va en la espalda, y sirve para reconocerle fuera del campo) y, **debajo y en pequeño, «Frente a ti: mejor / peor / parecido»** (la misma comparación de la ficha de Gente, `CompaneroDeEquipo.comparacion`; «—» hasta que le has visto jugar; tu fila, sin ella). Cabe en el móvil sin quitar información.

### Los rivales no se conocen al jugar (decidido el 22/11/2026; `docs/relevo/compatibilidad-y-cronica.md`)

**Jugar un partido contra alguien no te da su nombre.** Te da **cómo es** (su aspecto, el de Gente) **y su dorsal**, que quedan apuntados para reconocerle si luego te lo cruzas, como con los compañeros. El nombre se sabe como en el resto del juego: presentarse, preguntárselo, hablar…

- **`npcs`** ya no marca `known` al llegar `competicion.resultado` **de un partido** (`CompetitionResultData.equipo` presente). Una **carrera individual** sí sigue dando a conocer a quien corre a tu lado (atletismo, sin cambios).
- **`FutbolState.rivales`**: `{ id: [equipo, dorsal, semana] }` de los rivales que salieron al campo en un partido que el personaje vio (jugó, estaba en el banquillo o lo siguió desde fuera; **no** si estaba convocado y no se presentó). Se olvidan los de hace más a partir de 120 (`PARAMETROS_DE_PERCEPCION.rivalesGuardados`, `recordarRivales`); ≈ 25 bytes por rival.
- **Gente:** en la ficha de un rival con quien se ha jugado, el bloque de comparación del deporte dice «Jugaste contra él: el 7 del Rayo.» (`ComparacionService.sobre`; si además se le ha visto jugar, se añade «Crees que eres mejor…»). Sin nombre.
- **La tabla «Plantilla · equipo»** (la de tu equipo; no hay una del rival) lleva el **dorsal delante** de cada jugador («7 · Una niña de pelo…» o «7 · Marta» si la conoces). **Las listas de goleadores** son las columnas G y A de esa tabla, con los mismos nombres.
- **Lo que no cambia:** la relación con los rivales (`relaciones` sigue subiendo 1 / bajando 0,5 el vínculo con quien ganas o te gana: es una relación que se guarda aunque no sepas su nombre; sin conocerle no aparece en «Relaciones» ni en «Gente» ni hay acciones con él hasta que se presenta). Los eventos que piden un rival conocido siguen pidiéndolo.

### Las partidas guardadas por la versión anterior (22/11/2026; `docs/relevo/compatibilidad-y-cronica.md`)

Las partidas de `main` (`SAVE_VERSION` 21) cargan con las nuevas funciones **sin subir la versión**: lo que falta se rellena al cargar. `GameModule.alCargar(estado, ctx)` (contratos) es el gancho de migración suave (solo con un estado ya existente, idempotente). `npcs` lo usa para completar cada población guardada (`completarPoblaciones`): `puestos.dorsales`, `puestos.familias`, `puestos.pistas` y `CategoriaDef.apuntarseEnLosDias` con lo que pide ahora el deporte (solo lo que falta; lo guardado no se toca). Lo demás se lee con valores por defecto: `Npc.apuntado` ausente = ya apuntado (la plantilla no se oculta), `Npc.dorsal` ausente = asignado al vuelo, el párpado de la cara (24 en vez de 26 caracteres) = medio (0,5), `FutbolState.dorsal/companeros/rivales` vacíos. Las preferencias de la web (`leerPresentacion`) completan lo que falte. Lo vigila `tests/partidas-de-main.test.ts` con dos partidas guardadas por `main`; `npm run compat -- <archivo>` comprueba una partida (la ciudad grande, de 17 MB, con partidos) cargándola y jugando semanas y un cambio de curso.

### Los niños se apuntan a su equipo en los primeros días del curso (decidido el 21/11/2026; `docs/relevo/futbol-mas-barato.md`)

**Chicos y chicas** (ciudad grande, partidas nuevas, 28/11/2026; `docs/relevo/chicos-y-chicas-implementado.md`): ~10 % de chicas; benjamín y alevín mixtos; desde infantil, equipos separados (los femeninos, en los clubes externos, `<club>_f`); las jugadoras de los equipos femeninos juegan un partido simulado a la semana sin resultados ni clasificación. No cambia nada de lo de abajo para los chicos.

**Los equipos al crear la partida con la ciudad grande** (`CiudadDef.repartoNuevo`, 27/11/2026) salen del reparto nuevo (`docs/relevo/reparto-nuevo-implementado.md`): sin equipos por debajo de 14, con letras guardadas que el personaje y la búsqueda de club respetan (el personaje entra en el equipo de su club que más se parece a su año y tiene plaza). El resto de lo de aquí es igual.

El primer día de clase ya no hay niños en los equipos: **cada niño con equipo se apunta un día de los primeros del curso** (`CategoriaDef.apuntarseEnLosDias`, dato de cada categoría; fútbol: `[1, 6]`, del segundo al séptimo día, antes de acabar la primera semana; cifra provisional). El reparto de los equipos (el «draft») se calcula como siempre, al crear la partida y cada verano; lo que cambia es **cuándo aparece cada niño**: un sorteo estable suyo (`Npc.apuntado`, `conApuntados`). Hasta su día no sale en la plantilla del equipo (`plantillaDelEquipo`) ni cuenta para los equipos que se enseñan (`equiposDeLaCategoria`: un equipo que aún no llega a su mínimo de apuntados no se enseña). No cambia la regla de plaza, la pretemporada, la convocatoria del primer partido (cuatro semanas después), `benjamín` ni las pruebas de acceso del personaje.

### El equipo el curso que viene y el equipo que no sigue (decidido el 20/11/2026; `docs/relevo/reparto-equipos-2.md`)

Todo en el kit (`sucesoDeEquipoSinNinos`, `puestos.ts`) y los datos del deporte; los textos, en el paquete del deporte (`modules/futbol/src/eventos/textos_de_puesto.ts`). Sirve para cualquier deporte con equipos por categoría.

- **Sección «El curso que viene · <categoría>» en la pestaña del deporte, solo cuando termina la temporada** (decisión del usuario, 21/11/2026: desde que acaba la liga —y la copa, cuando la haya— hasta el reparto del verano, para no ocupar sitio durante el curso; «termina la temporada» es `temporadaTerminada` de `calendario-de-temporada.ts`: los tramos `terminada` —la liga cerrada con clase todavía, también si cae en unas vacaciones— y `verano`, que sale del calendario del país; con la liga en marcha, la pretemporada o una parada de Navidad no sale; con el curso nuevo y su reparto del verano, tampoco), después de «Plantilla» (cuando hay liga; `seccionDePrevision` en `modules/futbol/src/index.ts`, datos de `NpcDirectory.previsionDelClub`): lo que vería un niño de su club. Cuántos son en su categoría frente a los que pide un equipo (14), **quién cambia de categoría al acabar la temporada** (los nombres, con la categoría a la que pasan; «ya no tiene categoría» si no hay otra), cuántos siguen, cuántos llegan (de la categoría de abajo del club, o los compañeros que suben con él) y **cuántos habrá el curso que viene**, con una frase: «Tu equipo corre peligro» (faltarían N), «no corre peligro» (con «aunque por poco» a 2 o menos del mínimo) o «tu club no tiene equipo en esa categoría». **No enseña lo que vale ningún jugador ni números del motor.** Solo cuenta a quien ya es del club: los que se apunten o se vayan en verano no se saben (la sección lo dice). Es la misma cuenta que dispara el aviso de abajo.
- **Suceso `<deporte>.equipo_sin_ninos`** (señal `club.equipo_sin_ninos`, `EquipoSinNinosData`): al empezar el curso, tras los fichajes y el reparto de verano, si el club del personaje no reúne en su categoría los niños de un equipo contándolo a él (el equipo se cierra: motivo `pocos`) o no tiene equipos en la categoría a la que sube (motivo `sin_categoria`), le llega el aviso y **sale del club como cualquier niño sin equipo** (lo hace el módulo de clubes, como con `club.plaza_perdida`): tiene que buscarse equipo en el plazo, como el resto. Dos opciones sin consecuencias de juego (moverse ya o esperar; la de por defecto es esperar). Sin entrenador en el reparto: al llegar la señal ya no es del club. Sustituye a los avisos de plaza (`plaza_extra`, `plaza_perdida`) en ese caso. Una misión para convencer a otros niños de jugar queda para más adelante (`docs/relevo/reparto-equipos-2.md` §4).

### La salida del club por perder la plaza y los de primer año que no desplazan (22/11/2026; `docs/relevo/plaza-al-cambiar-de-anio.md`)

- **Suceso `<deporte>.plaza_perdida`** (`sucesoDePlazaPerdida`, `puestos.ts` del kit; señal `club.plaza_perdida`, `PlazaPerdidaData`): al empezar el curso, si otro jugador que vale más le ocupa el sitio al personaje y ni con una plaza de más cabe, **sale del club** (lo hace el módulo de clubes) y **su entrenador se lo cuenta** con tres opciones: buscar otro club (el texto dice hasta qué día siguen abiertas las pruebas: `{señal.plazoHasta}`, el último día del plazo de fichajes, calculado con la temporada del deporte y el calendario del país), **entrenar por su cuenta** (la de por defecto, a los 3 días) o preguntarle qué tiene que mejorar. Aplazable, sin cupo. Antes era una línea del diario (se ha quitado). Como al llegar la señal el personaje ya no es de ese club, **el entrenador y la fecha viajan en la señal** (`participants: [{ npcId }]`, el entrenador de su equipo, y `plazoHasta`), y el suceso toma el papel con `deLaSeñal`. Los textos (`TEXTOS_DE_PLAZA_PERDIDA`, `modules/futbol/src/eventos/textos_de_puesto.ts`) hablan del personaje sin palabras con género; si se añade alguna, `{yo:o|a}`. Lo pueden usar otros deportes con puestos: solo hay que dar sus textos.
- **Los de primer año no desplazan en benjamín y alevín** (`CategoriaDef.primerAnioNoDesplazaEn`, `CIUDAD_Y_LIGAS.md` §5): es el reparto en equipos (`repartirEnEquipos`, parámetro `segundosPrimero`), no el kit. Se mide con `npm run equipos-por-anio`, `npm run ninos-sin-equipo` y `npm run fichajes`.

**La sesión del club es una obligación (21/11).** Hasta que empieza, las acciones cortables (entrenar por libre, estudiar, charlar, ocio…) no la pisan: duran solo lo que falta, restando lo que cuesta llegar a la sede, y se llega a tiempo (`obligacionDeSesionDeClub` en el kit; ver `ARQUITECTURA.md`, Tiempo). Los entrenamientos por libre son cortables (`entrenosAgrupados`).

## 3. Lo que enseña la pestaña de atletismo

| Sección | Contenido |
|---|---|
| Resumen | Categoría (y si compites en la superior), federación (con aviso si son los datos de España), club, entrenador (el de tu edad), **entrenamientos** (días y horas del club), **carreras**, mejor marca, carreras del curso, mejor puesto del curso y lo que llevas del campeonato (tu puesto en las semifinales y finales que has corrido este curso). |
| Temporada | En qué tramo de la temporada está el deporte y cuándo empieza el siguiente (ver §3 ter). |
| Próxima prueba | Pretemporada (primera carrera en la semana 5), vacaciones, la carrera semanal (sábado de 9 a 13) o, en la penúltima y la última semana de clase de cada trimestre, la semifinal y la final del campeonato (semanas 14 y 15, 28 y 29, 40 y 41 del curso en España). |
| Habilidades | Solo las **propias del deporte** (en atletismo: técnica, ritmo, salida y conocimiento), con la marca del techo actual. Las genéricas (velocidad, resistencia...) se ven en la pestaña del personaje. |
| Carreras | Todas las del curso, la más reciente primero, cada una desplegable con su clasificación general (corredor, club, serie si hay varias, tiempo y diferencia con el 1.º). ⭐ marca la mejor marca personal. |
| Clasificaciones | Por **puntos** y por **mejores marcas**, una de cada por categoría en la que hayas competido este curso, con **todas las pruebas de la categoría** (corras tú o no). Se enseñan los 10 primeros y, si no estás entre ellos, tu fila al final con tu puesto real. |
| Cursos anteriores | Una fila por curso: carreras, mejor puesto y mejor marca. |

## 3 bis. Formato de las pruebas (decidido el 03/11/2026)

Como en la vida real: en atletismo no hay convocatorias, **corre quien se inscribe**. Es el mismo código para todas las categorías, con o sin el personaje.

- **Jornada normal**: una sola prueba por categoría, abierta. **Corre todo el que se presenta**: el personaje siempre que decide competir y cada PNJ según su decisión de acudir (los de baja no). Nadie se queda fuera por falta de plazas ni se completa la prueba con quien no acudió. Con menos de 2 corredores no se corre.
- **No todos se presentan.** Cada atleta decide por sí solo (azar propio: no cambia con lo que haga el personaje) si acude: los **mejores casi nunca faltan** (98 % el primero) y **los peores faltan más** (60 % el último). Quien **quedó último** en su prueba anterior falla aún más (hasta −15 puntos). En las pruebas de campeonato acude algo más de gente (+8 puntos).
- **Series de 8 como mucho, equilibradas**: `ceil(n / 8)` series con el mismo número de corredores en cada una o uno de diferencia (13 → 7 y 6; 17 → 6, 6 y 5), repartidos por su **marca de inscripción** en serpentina (1.º a la A, 2.º y 3.º a la B, 4.º a la A…): la mejor marca de la temporada en la categoría y, si no tiene, la que se espera de su nivel (como en la vida real; no usa datos ocultos). El máximo por serie es un dato del deporte por país (`formatoDeCarrera.maxPorSerie`).
- **Una clasificación conjunta por tiempos**, juntando todas las series. Cada atleta guarda en su historial su puesto en la general y su serie. Las marcas de cada rival salen de su propio azar (el personaje no lo cambia), pero **sus puestos, su historial, su moral y su forma salen de esa prueba, con el personaje dentro si corre**.
- **Campeonato al final de cada trimestre** (tres por curso). En España: semifinal la penúltima semana de clase del trimestre y final la última (semanas 14 y 15, 28 y 29, 40 y 41 del curso). Esas semanas no hay jornada normal; las demás semanas de competición, sí.
  - **Semifinal**: los **16 mejores de la clasificación del trimestre** en su categoría; el 17.º y el 18.º son reservas que cubren las bajas y ausencias. Si aun así quedan menos de 16, se corre con los que hay, en series equilibradas (15 → 8 y 7; 11 → 6 y 5; con 8 o menos, una serie). El personaje entra por su puesto en esa clasificación, como cualquiera (si no ha corrido jornadas del trimestre, no tiene puntos y no entra).
  - **Final (8)**: los **4 primeros de cada serie** de la semifinal. Si en una serie no hay 4, o un clasificado no acude, entra su reserva (el siguiente de su serie, hasta 2) y, si no hay, el mejor tiempo de los no clasificados. Si quedan menos de 8 en total, corren todos los que quedan. Hay medallas.
- La clasificación guardada (y que puntúa en la temporada) de cada prueba es la general de todas las series juntas; la tabla del registro enseña la serie de cada corredor.
- Lesiones: quien está de baja no entrena con el club ni compite, sea PNJ o el personaje (ver `MISMAS_REGLAS.md`).

## 3 ter. En qué tramo de la temporada está el deporte (decidido el 17/11/2026)

El usuario llevaba 2 semanas de pretemporada sin saber si se había saltado algo. Ahora **todos los deportes con temporada** dicen en la pestaña («Temporada: …», encima de «Próxima prueba»; `DeporteView.temporada.situacion`) y con la misma frase:

| Tramo | Texto (ejemplos) | Cuándo |
|---|---|---|
| Pretemporada | «Pretemporada. La liga empieza el sábado 13 de octubre.» / «Pretemporada. Las carreras empiezan el sábado 13 de octubre.» | Las semanas de clase antes de `semanasDePretemporada`; la fecha es el día más temprano de la jornada (`competiciones.jornada.dias`) de la primera semana de competición |
| Liga (o carreras) | «Liga. El verano empieza el lunes 10 de junio.» | Desde la primera semana de competición, en semanas de clase |
| Parada | «Liga, parada por las vacaciones. Se reanuda el sábado 5 de enero.» | Navidad y Semana Santa |
| Terminada | «Liga terminada. El verano empieza el lunes …» | La liga ha cerrado (`liga.cerrada`) antes del verano |
| Verano | «Verano. La pretemporada empieza el lunes … y la liga empieza el sábado ….» | Vacaciones de verano: el curso que viene |

Es dato del deporte (`TemporadaDeDeporte` + el calendario del país): `situacionDeTemporada` / `situacionDelDeporte` en `packages/contracts/src/calendario-de-temporada.ts`; cada deporte solo dice cómo se llama su competición («la liga», «las carreras»). La fecha del día usa el calendario de la partida (el día 0 es el lunes 10 de septiembre). **Todavía no hay copa** (`CIUDAD_Y_LIGAS.md` §6): cuando se implemente será otro tramo entre la liga y el verano. **«La temporada ha terminado»** (`temporadaTerminada`): los tramos «Terminada» y «Verano» (desde que acaba la competición hasta el reparto del verano, que llega con el curso nuevo); con copa, «terminada» será lo que sigue a la copa. Una liga cerrada que cae en unas vacaciones (Semana Santa) ya es «terminada», no una parada.

**Fútbol, además:** en pretemporada «Próxima prueba» dice «Todavía no hay calendario de partidos: se publica al empezar la liga» (los emparejamientos, horas y campos se calculan el lunes de la primera semana de competición, cuando se crea la liga); las acciones de jugar dicen «Todavía no hay partidos: la liga empieza el sábado …»; **el entrenador lo dice en el primer entrenamiento** («Una cosa más: la liga empieza el sábado 13 de octubre; el calendario de partidos se publica ese día, cuando empiece») y, **al publicarse el calendario, una línea en el diario** («Se ha publicado el calendario de la liga: … te lo cuenta. La primera jornada es el sábado 13 de octubre a las 11:00: X – Y, en casa»), una vez por curso (`FutbolState.calendarioAvisado`).

## 4. Puntos de la clasificación de la temporada (provisional)

**Se dejan así de momento.** Hay que estudiar cómo funcionan las puntuaciones y clasificaciones en la vida real antes de ajustarlas.

Cada corredor suma los puntos de **todas las pruebas de su categoría en las que ha corrido** (con o sin el personaje). El puesto es el de la clasificación general (menor tiempo, mejor puesto).

| Puesto | 1.º | 2.º | 3.º | 4.º | 5.º | 6.º | 7.º | 8.º | 9.º o más |
|---|---|---|---|---|---|---|---|---|---|
| Carrera semanal | 10 | 8 | 6 | 5 | 4 | 3 | 2 | 1 | 0 |
| Semifinal y final del campeonato (×2) | 20 | 16 | 12 | 10 | 8 | 6 | 4 | 2 | 0 |

- Orden: más puntos primero y, a igualdad, mejor marca.
- Hay **dos clasificaciones por categoría**: la de la **temporada** (todo el curso) y la del **trimestre** (se pone a cero al empezar cada trimestre); esta última es la que da las plazas de la semifinal.
- Un corredor de la población es el mismo en todas sus pruebas por su identificador; el personaje es `yo`.
- Se guardan como números cortos por corredor (`pt`, `pr`, `mm`) en el estado del atletismo (`tablas`), no las pruebas enteras del mundo.
- Una clasificación por categoría: si subes a la superior a mitad de curso, aparecen las dos.

## 5. Dónde cambiar cada cosa

| Qué | Dónde |
|---|---|
| Puntos por puesto, factor de campeonato, cursos con clasificación guardada | `modules/atletismo/src/temporada.ts` (`PUNTOS_POR_PUESTO`, `FACTOR_DE_CAMPEONATO`, `CURSOS_CON_CLASIFICACION`) |
| Qué sale en el resumen y la próxima prueba | `modules/atletismo/src/index.ts` (`vistaDeAtletismo`, `proximaPrueba`) |
| Semanas de la semifinal y la final de cada trimestre (relativas al final del trimestre) y pretemporada | `modules/atletismo/src/datos.ts` (`temporada.campeonatoPorTrimestre`, `temporada.semanasDePretemporada`); el cálculo, `semanasDeTemporada` en `packages/contracts/src/deporte-datos.ts` |
| Máximo de corredores por serie, plazas de la semifinal (16) y reservas (2), plazas de la final (8) y clasificados por serie (4) | `modules/atletismo/src/datos.ts` (`temporada.formatoDeCarrera`) |
| Reparto en series, plazas con reservas, finalistas y clasificación acumulada | `modules/atletismo/src/temporada.ts` (`repartirEnSeries`, `clasificarPrueba`, `plazasConReservas`, `finalistasDe`, `anotarEnTabla`) |
| Quién acude, convocatoria única y pruebas del mundo | `modules/atletismo/src/index.ts` (`convocar`, `correrPrueba`, `registrar`, `carrerasDelMundo`) |
| Probabilidad de acudir | `modules/atletismo/src/temporada.ts` (`probabilidadDeAcudir`) |
| Cuánto sube el bono de asistencia en campeonato | `modules/atletismo/src/index.ts` (`BONO_DE_CAMPEONATO`) |
| Cómo se dibuja (y cuándo está desactivada) | `apps/web/src/deporte.ts`, `DeporteView.inactivo` |
| Clubes del atletismo (sesiones, acceso, sedes), jornada de carreras y sitios del mapa (estadio, pista del colegio, salas) | `modules/atletismo/src/datos.ts` (`DATOS_ATLETISMO`, `LUGARES_ATLETISMO`); el catálogo lo arma `modules/clubes/src/index.ts` |
| Plazas ofrecidas, aceptar y estrés por plantón | `packages/kit-deporte/src/club.ts` (`SEMANAS_DE_OFERTA`, `SEMANAS_ENTRE_PRUEBAS`), `modules/clubes/src/index.ts` (`ESTRES_POR_PLANTON`) |
| Sesión de club, llegada tarde, por tu cuenta, consejo del entrenador | `packages/kit-deporte/src/club.ts` (`MINUTOS_ANTES_DE_SESION`, `EFICIENCIA_POR_TU_CUENTA`, `CONOCIMIENTO_POR_CONSEJO`, `HABILIDAD_POR_CONSEJO`); lo que entrena cada sesión, en el módulo del deporte |
| Sobrecarga, campamento, efecto del conocimiento | `packages/kit-deporte/src/comunes.ts` (`SESIONES_SIN_SOBRECARGA`, `EFICIENCIA_CAMPAMENTO`, `EFECTO_CONOCIMIENTO`) |

## 6. Pendiente

- **Estudiar cómo funcionan las clasificaciones y los puntos en el atletismo real** (ligas, circuitos, rankings por marcas) y ajustar la tabla de la sección 3.
- ~~Clasificación de todo el circuito~~ **Hecho** (03/11): la clasificación cuenta todas las pruebas de la categoría.
- ~~Entrenadores propios de cada club de fuera~~ **Hecho** (`ENTRENADORES_DE_CLUBES`). Pendiente: sus habilidades propias y compañeros de equipo conocidos al entrar.
- Gráfica de la evolución de las marcas a lo largo de los cursos.
- Fútbol (F1, 1/11): `modules/futbol` con las 29 habilidades, el conocimiento, el entreno por libre y el club del colegio; sin partidos todavía (la pestaña enseña habilidades y datos del club, con «Partidos» vacío). Ver `ANALISIS_FUTBOL.md` §7.
- Deportes de equipo: partidos, tablas de liga y plantillas. **El contrato ya lo admite (fútbol F0, 1/11):** `DeporteView.secciones` (bloques libres con título, texto y tabla), `PruebaDeTemporada.resultado` (texto como «Ganado 3-1» en lugar de «Xº de Y»), `temporada.nombreDePruebas` («Partidos» en vez de «Carreras») y `TemporadaDeDeporte.liga` (vueltas y equipos por categoría; `jornadasDeLiga`). Atletismo no usa nada de esto.


### Pistas sobre los puestos (decidido el 21/11/2026; `docs/ANEXO_PUESTOS.md` §6 y §7, `docs/relevo/puestos-y-pistas.md`)

Para cualquier deporte con puestos (kit y `npcs`), con los textos en los datos del deporte (`PuestosDeDeporte.familias` y `.pistas`): el consejo del profesor de Educación Física nombra **puestos sin lado** y dice **por qué** en cualidades; la acción **«Preguntar por un puesto…»** (desplegable, profesor en la sala de profesores y entrenador en su sede) dice qué te falta para él; y el **entrenador recomienda entrenamientos por su nombre** según lo que frena a tu puesto, leyendo lo que sube cada entrenamiento (`ConfigDeporte.catalogoDeEntrenos`). Los puestos de LCR/RCR se llaman ahora «Interior» y los de LM/RM, «Medio de banda».
