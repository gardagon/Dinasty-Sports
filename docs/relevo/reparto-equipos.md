# Relevo: reparto de equipos (rama `claude/reparto-equipos`, sale de `claude/youthful-clarke-vs0kye`)

Encargo del usuario (17–18/11/2026): que el equipo del colegio no se quede vacío. Detalle de diseño en `docs/CIUDAD_Y_LIGAS.md` §3 y §5 (actualizados). **No he tocado `DECISIONES.md`** (la entrada «Equipos: menos clubes de colegio…» ya la puso la arquitectura).

## 1. Qué cambia

1. **4 clubes de colegio** (el del personaje y 3 de los 9 de fuera): `colegiosConClub: 3` en `CIUDAD_GRANDE` (`packages/contracts/src/ciudad.ts`). Los otros 6 colegios nutren a los clubes de fuera. La ciudad de ahora y la de prueba no cambian (por defecto, la mitad).
2. **Quién va a probar fuera** (corrección del usuario del 18/11: **el orden del reparto no cambia**, los clubes de fuera forman antes; el colegio sigue el último):
   - Dato por categoría: `CategoriaDef.probarFuera` (fútbol de España: benjamín 15 %, alevín 25 %, infantil 35 %, cadete 45 %, juvenil 55 %; `modules/futbol/src/datos.ts`). Sin él, `PROBAR_FUERA_POR_DEFECTO` (30 %).
   - Pesos (cifras de partida, datos en `PESOS_DE_PROBAR_FUERA`, `packages/contracts/src/categories.ts`): probabilidad = base × `1 + ambición·0,5 + nivel·0,5 − (amigos − neutro)·0,6`, factor acotado a 0,2–2,5 y techo del 90 %. Ambición y nivel de −1 a 1 (nivel = sitio entre los de su categoría); **amigos**: las personas del mundo aún no tienen amistades entre sí, así que es la parte de sus compañeros de colegio y año que se quedan (con el reparto esperado no cambia nada). Cuando haya amistades de verdad, hay que cambiar solo `amigos` en `modules/npcs/src/probar-fuera.ts`.
   - Sorteo estable por niño, categoría y temporada (`rngEstable('probar-fuera', …)`): no gasta el azar de la partida.
   - Los que se quedan **no los ven los clubes de fuera** hasta que el colegio ha escogido (`protegerAlColegio` en `draftDeUnaCategoria` y `completarUnaCategoria`); los que prueban y no entran siguen en la bolsa de su colegio, que los recoge en su paso de siempre.
   - **Cada verano, los de cualquier año de la bolsa** (no solo primer año) deciden de nuevo.
   - La regla «probar fuera no hace perder la plaza» y los fichajes de verano no cambian.
3. **Plazas de más, en lo último de todo** (`plazasDeMas`, `modules/npcs/src/draft.ts`; al crear y cada verano, tras `sinSobrantes`): el niño con interés que sigue sin equipo entra en un equipo de su colegio o, si no, en el club con el equipo de nivel medio más cercano al suyo, pasándose hasta 2 por equipo (`EquipoGuardado.plazasDeMas`, `PLAZAS_DE_MAS`; el máximo de cada equipo del club en la categoría sube, `maximoPorEquipo`). Primero se respeta el reparto por puestos y solo si no cabe entra en su puesto favorito. No abre equipos que no existen (menos de 14). Cada curso se recalculan (`ajustarPlazasDeMas`). **No toca las convocatorias.**
4. **El personaje** (respuesta del usuario del 18/11): si en verano perdería su plaza por la regla de plaza, **no sale del club**: el equipo le abre una plaza de más y el entrenador le manda un suceso (`futbol.plaza_extra`, `sucesoDePlazaExtra` en `packages/kit-deporte/src/puestos.ts`, textos en `modules/futbol/src/eventos/textos_de_puesto.ts`, señal nueva `club.plaza_extra`) diciéndole que contará menos con él. Por defecto se queda; puede decir que va a probar en otros clubes (la plaza sigue siendo suya hasta que otro lo coja) o preguntar qué mejorar. Si su equipo ya no puede abrir más plazas de más, pasa lo de antes (`club.plaza_perdida`). Prueba del suceso en el propio suceso; `npm run eventos:validar` ✅ (60 sucesos).

## 2. Medidas (antes → después)

Ciudad grande. «Antes» es la rama de partida. `npm run ninos-sin-equipo -- 31,33,35,36,37,38,39,40,41,42,43,44 2` (12 semillas, 2 veranos); `npm run equipos -- 4 2 grande`; `npm run colegios -- 4 2`.

### Colegio del personaje: jugadores en su equipo por categoría (media de 12 semillas) y semillas sin equipo (menos de 14)

| Categoría | Al crear | Verano 1 | Verano 2 |
|---|---|---|---|
| Benjamín | 17,3 → **40,0** (0 → 0 de 12) | 17,3 → **39,3** (0 → 0) | 17,7 → **42,0** (0 → 0) |
| Alevín | 17,2 → **36,2** (0 → 0) | 15,1 → **32,6** (1 → 0) | 14,9 → **28,8** (2 → 0) |
| Infantil | 18,0 → **33,4** (0 → 0) | 15,8 → **31,0** (2 → 0) | 15,8 → **27,2** (1 → 0) |
| Cadete | 16,1 → **28,2** (1 → 0) | 13,1 → **24,8** (3 → 1) | 10,8 → **19,8** (6 → 1) |
| Juvenil | 27,1 → **35,3** (0 → 0) | 14,0 → **19,7** (2 → 1) | **1,2 → 14,4** (11 → **3**) |

(Ahora el colegio tiene 2–3 equipos en benjamín–infantil: los que no prueban fuera se quedan.) En juvenil el colegio sigue perdiendo equipo en 3 de 12 semillas al verano 2 (antes 11 de 12): aceptado por el usuario.

### Niños con interés sin equipo (todo el mundo, media de 4 semillas, `equipos`)

| | Al crear | Verano 1 | Verano 2 |
|---|---|---|---|
| Antes | 167,8 | 165,3 | 108,0 |
| Después | 68,3 | **0,0** | **0,5** |

Lo que queda al crear es casi todo juvenil (34 con interés por el fútbol + 34 solo por el deporte, antes 69 + 74): tres edades en la categoría y no caben ni con plazas de más. Dejan el fútbol por no tener equipo en dos plazos (acumulado a 2 veranos): 101,5 → 38,5.

Colegio del personaje, por categoría y semilla, sin equipo con interés por el fútbol (ninos-sin-equipo): al crear 0,7/0,8/1,2/0,8/3,0 → 0,5/0,6/0,9/0,8/1,5 (benjamín…juvenil); verano 2: 1,5/5,6/4,3/8,3/10,9 → 1,1/4,2/3,8/7,2/10,3. (Son alumnos del colegio del personaje sin equipo en ese momento; en cadete y juvenil, sobre todo tras los veranos, siguen quedando algunos aunque haya plazas de más: no he mirado por qué.)

### Clubes de fuera

Equipos (todos los clubes y colegios) por categoría y jugadores: sin cambios grandes (benjamín 30,0 → 31,8 equipos al crear, 523 → 529 jugadores; juvenil 39,5 → 41,5 equipos y 626 → 700 jugadores al crear). Tras el verano 2: benjamín 30,5 → 30,5; alevín 26,5 → 27,0; infantil 27,5 → 26,8; cadete 26,3 → 24,8; juvenil 29,5 → 25,5. Todos los clubes de fuera siguen teniendo equipo (45 de 45). **Los clubes de fuera cierran más equipos** (`colegios`: 22 → 68 cierres de club en 4 semillas y 2 veranos; en la mayoría pierden uno de varios equipos, no el único) porque los alumnos de colegios con club ya no les llegan todos.

Plazas de más: 19,8 jugadores en 6,8 club-categorías al crear; 66,8 en 17,8 tras el verano 1; 44,0 en 17,5 tras el verano 2 (de unos 65 club-categorías; como mucho 2 por equipo). Equipos descompensados por puestos: 0,0 → 0,5 de 65 al crear, 1,5 → 3,8 tras el verano 1 y 0,3 → 2,5 tras el verano 2 (primero se intenta entrar respetando el reparto por puestos; las plazas de más van al final y solo con el favorito si no hay otra).

### Primeros años en el A de un grande (`npm run fichajes`)

**Vigilado y en regla:** primeros años que le quitan el sitio a uno de segundo año del mismo puesto en el A de un club grande: media 0,0, máximo 0, 60 de 60 club-categorías con 2 o menos (igual que antes).

Con el mismo `npm run fichajes` (12 semillas, 3 cursos), un efecto que conviene saber del colegio más lleno: el bot del montón que prueba en el colegio **llega al equipo A del colegio** en el curso 1 en 9 de 12 semillas antes y en 0 ahora (curso 2: 3 → 10; una semilla nunca), porque ahora el colegio saca varios equipos y el A lo ocupan los de segundo año; en cambio llega al A de un grande o mediano antes (curso 1: 0 → 1 y 0 → 2). Entrar en el equipo del colegio sigue siendo fácil (curso 1: 11 → 10 de 12). Cosa de diseño, no un fallo: el A del colegio ya no se regala.

### Simulación, huella y rendimiento

- `npm run sim:rapida`: ✅ salvo dos ⚠️ que no vienen de esto: «Rendimiento» (1,70 ms por acción frente a un límite de 1,26 ms; ya se sabía inestable, §5 de `comprobacion-final.md`; salió con otras cuatro mediciones corriendo a la vez) y «El esfuerzo hace progresar» (atletismo +5,1 frente a +7): **sale igual en la rama de partida** (`sim:rapida` medido antes de mi cambio: atletismo +5,1 y también ⚠️ en Rendimiento, 1,51 ms por acción), y la huella de los bots de atletismo es idéntica; no viene de este cambio.
- `npm run huella -- 60`: las huellas de los bots de atletismo (`abandono`, `aleatorio`) son **idénticas**; solo cambian las del fútbol (semillas 31 y 32), como se espera de un reparto distinto.
- `npm run rendimiento -- 60`: igual (crear 664 → 669 ms, 2968 KB, 1,65 → 1,65 ms por acción): esa medida no usa el fútbol ni la ciudad grande.

### Tests

Al cambiar el reparto fallaron 18 tests cuyas premisas eran las de antes; no por fallos del juego. Cambios en tests (todos explicados en su sitio): topes de plantilla «máximo del equipo» → `capacidadConPlazasDeMas` (las plazas de más pueden pasar del máximo); el colegio saca varios equipos de benjamín, así que los tests que lo llenan a mano usan `colegioConUnEquipoDeBenjamin` (`tests/ayudas.ts`) y los de convocatoria y día de partido usan `conFutbolFuerte` (con los colegios llenos un personaje del montón puede quedarse fuera de la convocatoria: es el «corre el riesgo de no jugar» de las plazas de más y del equipo lleno, no un fallo); el test del personaje desplazado espera ahora la plaza de más (y la salida del club cuando el equipo ya no puede abrir más); `club_mediano` con 1 categoría de dos equipos en vez de 2; y el test de ver partidos de otros mira solo la categoría del personaje (el colegio tiene ahora un B en otra categoría). `capacidadDe` (para quien entra por la regla de plaza) **no** cuenta las plazas de más: solo el último paso del reparto y el reparto en equipos las cuentan (`capacidadConPlazasDeMas`, `plazasDeMas` en `OpcionesDeEntrada`).

## 3. Cosas que quedan para decidir o ver

- **Convocatorias del que entra con plaza de más** (no he tocado nada, como se pidió): el que no da el nivel ya juega poco porque entra detrás del once y de los suplentes. Si hace falta más (menos minutos garantizados, convocatoria más estricta para quien lleva «plaza de más», o que el entrenador lo recuerde en la ficha), habría que marcarlo en el jugador y se propone aparte.
- **Otros casos en que el personaje se queda colgado y esto no cubre:** (1) su equipo se cierra por quedar bajo el mínimo (el cierre no toca al personaje, pero el equipo puede dejar de existir); (2) sube de categoría y su club no tiene equipo en la nueva; (3) lo echan por otra razón fuera del plazo. Para el (2) y el (3) valdría el mismo suceso con otro disparo; no lo he hecho.
- **«Convencer a un amigo» (no hecho, como se pidió).** Encajaría como un suceso del personaje (`futbol.convencer_amigo`) que sale cuando su equipo del colegio está al borde de cerrarse (14–15 jugadores al empezar la temporada o un verano que lo deja en 13 o menos): el reparto lo elige entre los **amigos del personaje** (relación `amigo`) que juegan en otro club o no juegan, con una tirada de sociabilidad (ajustada por afinidad), y si sale, el amigo entra en el equipo del colegio vía una señal compartida (`club.fichar_amigo`) que recoge `npcs` y aplica con una plaza de más si hace falta. El gancho natural es `plazasDeMas`/`intentarEntrar` con `sinPrueba` y el sorteo estable de «probar fuera» (el amigo convencido no sortea ese verano).
- **Amigos entre PNJ:** `amigos` en `probar-fuera.ts` es un sustituto (compañeros de su año que se quedan); cuando existan amistades entre PNJ, es el único sitio que hay que cambiar.
- **Cifras de partida:** los pesos de ambición, nivel y amigos son míos (0,5, 0,5 y 0,6) y están sin revisar con el usuario; son una constante en `contracts`, no por país.
