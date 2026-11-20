# Relevo: reparto de equipos, segunda vuelta (rama `claude/reparto-equipos-2`, sale de `claude/youthful-clarke-vs0kye`)

Encargo del usuario (20/11/2026, en `DECISIONES.md` «Reparto de equipos, segunda vuelta»; **no he tocado `DECISIONES.md`**). Sin pull request. Todas las medidas son de la ciudad grande (`npm run … ` con las semillas del encargo); «antes» es la rama de partida medida en una copia limpia, «después» es esta rama. Las herramientas son deterministas por semilla, pero cualquier cambio del reparto mueve el azar de todo lo demás: las diferencias pequeñas son ruido (abajo, §3, hay una medida del ruido).

## 0. Resumen

1. **Normas por año en el colegio:** ya se aplicaban igual que en los clubes (es el mismo código, `repartirEnEquipos`; medido con la herramienta nueva `npm run equipos-por-anio`). **El personaje ya entraba en el equipo de su año (el B, de primer año), y ahí sigue**; sigue sin ser convocado porque en el B hay 17 niños del mundo más él y se convoca a 16. Lo que sí he encontrado y arreglado: **un fallo de la edad del personaje en los fichajes de verano** (se le sumaba un año de más) y que **un segundo año que no cabe en el A (lleno de otros que valen más) se quedaba en el club sin equipo**: ahora se trata como quien pierde la plaza (§1).
2. **Probar fuera:** ambición 0,5 → **1** y nivel 0,5 → **0** (el cálculo del nivel se queda para los ojeadores). Amigos, igual (§2).
3. **Cierres de los clubes de fuera:** no es por los porcentajes. Con el 90 % en todas las categorías (casi todos los alumnos van a probar fuera) siguen cerrando 49 (frente a 54). Se explica y se proponen cifras, **sin cambiarlas** (§3).
4. **Suceso `futbol.equipo_sin_ninos`** para el personaje cuyo equipo no sigue (por falta de niños o porque su club no tiene equipo en la categoría a la que sube): sale del club y le llega el aviso (§4). Cómo encajaría la misión de convencer a niños, apuntado (§4.3).
5. **Pestaña del deporte:** sección nueva **«El curso que viene»** con cuántos son, quién cambia de categoría y cuántos quedarían (§5). **Hay una pregunta para el usuario sobre qué se ve** (§5.3).

## 1. Los equipos del colegio y el personaje

### 1.1 ¿Aplica el colegio las mismas normas?

Sí. `npm run equipos-por-anio -- 31,33,35,36 1` (4 semillas, al crear y tras el verano 1) cuenta, por club-categoría y número de equipos, los jugadores de primer año / de segundo año de cada equipo (media por club-categoría):

| Equipos del club | Colegios (jugadores 1.º/2.º año) | Clubes de fuera |
|---|---|---|
| 1 (resto de categorías) | A 9,9 / 9,4 (mezclados) | A 5,9 / 13,7 (mezclados) |
| 2 | A 1,6 / 15,3 · B 15,9 / 0 | A 1,4 / 15,8 · B 16,2 / 0 |
| 3 | A 1,0 / 17,1 · B 17,5 / 0 · C 5,8 / 5,9 | A 1,0 / 17,5 · B 17,7 / 0 · C 7,5 / 7,2 |

(En juvenil, con tres años, «segundo año» son el segundo y el tercero.) Las normas se cumplen igual en los dos: A con los de segundo año y algún primero que destaca (1,0–1,6 por equipo), B con los de primer año, C con los dos años. No he cambiado el reparto.

### 1.2 El personaje en `benjamin -- 31,33`

- **Antes:** entra en el **B** (es de primer año), con 16 niños del mundo más él (17); se convoca a 16: no lo convocan.
- **Después:** entra en el **B** igual, con **17** niños del mundo más él (18): sigue sin convocarse (cambia la plantilla porque cambia quién va a probar fuera). **Las normas por año no lo cambian: ya iba a su equipo.** El problema es que un equipo de benjamín de 17–18 deja fuera al peor cada semana y el personaje (valor ~10 frente a ~12 de los demás) es de los peores. Opciones que **no he tomado** (decide el usuario): (a) dejarlo; (b) que en benjamín se convoque a toda la plantilla (hasta 18); (c) darle algo de minutos garantizados al que lleva pocas semanas.
- **Lo que sí he corregido** (`equipos-por-anio`, «verano 1»): al empezar el segundo curso el personaje tiene 9 años, es de **segundo año de benjamín y le toca el A**. Con el código de partida, en 1 de 4 semillas (36) se quedaba **en el club sin ningún equipo** (ni A ni B: el A lleno de segundos años que valen más, el B solo de primeros). Ahora, si no cabe en el equipo que le toca, **se trata como quien pierde la plaza**: una plaza de más (1–2 por equipo; el suceso `futbol.plaza_extra`: el entrenador le avisa de que contará menos con él) y, si ni así cabe, sale del club (`club.plaza_perdida`). `draft.ts` (`renovarDeportistas`, tras `completarEquipos`). Tras el verano 1 el personaje tiene equipo en las 4 semillas.
- **Fallo encontrado y arreglado (conviene que lo sepa la arquitectura):** `modules/npcs/src/index.ts`, en el aviso de fin de semana que renueva la gente, calculaba la edad del personaje con `seasonAge + 1`, pero ese aviso llega ya con el reloj en el curso nuevo (`schoolWeek` 0): `seasonAge` ya es la del curso que empieza. El personaje entraba en los fichajes de verano **con un año de más** (categoría y plaza reservada una por encima de la suya: el personaje de 9 años se trataba como un alevín de 10). Ahora usa `seasonAge` tal cual. Cambia la huella solo del personaje en el fútbol.

## 2. Ir a probar fuera: ambición, no nivel

`PESOS_DE_PROBAR_FUERA` (`packages/contracts/src/categories.ts`): **ambición 0,5 → 1**, **nivel 0,5 → 0**, amigos 0,6, mínimo 0,2, máximo 2,5, techo 0,9 (sin cambios). La probabilidad base de cada categoría se multiplica por `1 + ambición` (ambición de −1 a 1). El nivel se sigue calculando (el sitio del niño entre los de su categoría) pero **pesa 0**: **servirá para los ojeadores** más adelante (que un niño bueno lo vea alguien y lo llamen), no para que él decida irse; está anotado en el comentario de la constante, en `probar-fuera.ts` y en `CIUDAD_Y_LIGAS.md` §5.

La ambición (`caracter.ambicion / 50`) tiene media 0 y desviación 0,36 entre los 5.915 niños de una partida (p10 −0,46, p90 0,46): con peso 1 la **media no cambia**, solo se reparte entre niños. Probabilidad de ir a probar según su ambición (p10 / media / p90):

| Categoría (base) | Antes (0,5/0,5, con nivel medio) | Ahora (1/0) |
|---|---|---|
| Benjamín 15 % | 11,6 / 15,0 / 18,4 % | **8,1 / 15,0 / 21,9 %** |
| Infantil 35 % | 26,9 / 35,0 / 43,0 % | **18,9 / 35,0 / 51,1 %** |
| Juvenil 55 % | 42,4 / 55,0 / 67,7 % | **29,7 / 55,0 / 80,3 %** |

(«Antes» sin contar el efecto del nivel, que era mayor: iba de −50 % a +50 % entre el que menos vale y el que más.) **Propuesta de cifras:** ambición 1 como está (el nada ambicioso de verdad, ambición −1, queda en el mínimo de 0,2 × la base; el más ambicioso, en el doble). Si el usuario la quiere aún más marcada, 1,5 (el factor llega al mínimo con ambición −0,53, que ya es el 7 % de los niños).

Efecto en el resto: el colegio del personaje, tabla de §6 (sin cambios que se salgan del ruido). `npm run huella`: solo cambian las del fútbol.

## 3. Los cierres de los clubes de fuera

`npm run colegios -- 4 2` (4 semillas, 2 veranos) con la herramienta ampliada: ahora cuenta aparte los cierres de los clubes de fuera (`colegios.ts`).

**Qué se cierra.** Casi siempre **no es un club que desaparece sino un equipo de varios** (53 de 54 «pierden solo un equipo de varios», con una media de 3,0 equipos antes del cierre; todos los clubes de fuera siguen teniendo equipo: 44,8 de 45 tras el verano 2, igual que antes). Cierra cuando el club tiene menos de 14 por equipo: un club con tres equipos se queda con 27–53 jugadores (42 son los que piden tres). Por categoría, **juvenil 22 y cadete 13** (el 65 %), y por verano 24 el primero y 30 el segundo.

**Por qué.** Dos cosas, y los porcentajes de probar fuera no son la principal:
1. **El mundo se encoge solo.** Los futbolistas de la ciudad pasan de 2.890 al crear a 2.754 tras el verano 1 y 2.424 tras el 2 (−16 %; en la rama de partida y en esta: 2.890 / 2.754 / 2.424 y 2.892 / 2.749 / 2.447), por los que se hacen mayores, los que lo dejan por edad y los que no encuentran equipo en dos plazos (46 por partida acumulado). Con menos niños, menos equipos (clubes de fuera por categoría, benjamín–juvenil: 21,4 / 21,9 / 23,8 / 23,6 / 32,0 equipos al crear y 21,0 / 19,2 / 20,5 / 20,8 / 21,4 tras el verano 2).
2. **Al crear, los clubes de fuera forman antes y se llevan más de su parte** (por orden de atractivo, los colegios al final): tras el reparto inicial los clubes de fuera tienen 367 / 386 / 393 / 408 / 529 jugadores por categoría y, tras el verano 2, 359 / 320 / 331 / 342 / 361 (los colegios, que empiezan con menos, también pierden: 172 → 157, 144 → 113, 125 → 115, 117 → 69, 139 → 60). Es lo que decidió el usuario (el orden del reparto no cambia).

**Medida de las cifras** (mismas 4 semillas y 2 veranos; las tres últimas filas con el mismo código que «después», solo cambia `probarFuera` en `modules/futbol/src/datos.ts`, en una copia, **sin cambiarlo en la rama**):

| `probarFuera` (benjamín… juvenil) | Cierres de clubes de fuera | Equipos de clubes de fuera tras el verano 2 (suma de las 5 categorías) | Equipos de colegios | Colegios con equipo (de 20) | Niños con interés sin equipo | Niños que dejan el fútbol (acum.) |
|---|---|---|---|---|---|---|
| Rama de partida (15, 25, 35, 45, 55) | 56 | 101,3 | 31,3 | 17,5 | 46,5 | 46,0 |
| **Ahora** (ambición en vez de nivel; mismas cifras) | **54** | 102,9 | 32,3 | 17,3 | 20,5 | 46,0 |
| +10 puntos (25, 35, 45, 55, 65) | 53 | 108,9 | 26,7 | 16,5 | 23,5 | 45,3 |
| +15 puntos (30, 40, 50, 60, 70) | 45 | 111,0 | 24,4 | 15,8 | 30,8 | 50,0 |
| 90 % en todas | 49 | — | — | — | — | — |

Lectura: **el total de equipos es casi el mismo (133–136) con cualquier cifra: subir el porcentaje solo mueve equipos del colegio a los clubes de fuera**, y cuesta colegios con equipo (−0,8 a −1,5 de 20). Los cierres no bajan con claridad: 56 / 54 / 53 / 45 / 49 (el ruido de esta medida es de unos ±5), y **con el 90 % en todas las categorías siguen cerrando 49**: no son los porcentajes. **Propuesta: no cambiar los porcentajes por esto.** Si se quiere dar más aire a los clubes de fuera aun así, la menos mala es +15 (30, 40, 50, 60, 70), que baja los cierres de 54 a 45 y cuesta un colegio con equipo y más niños sin equipo (30,8 frente a 20,5). Si lo que molesta es el cierre de un equipo de varios, la palanca es de otro tipo (cuántos equipos abre un club al crear, o que el total no se encoja), y es decisión de diseño que no he tomado.

Las filas de +10 y +15 se midieron con el código de esta rama un par de commits antes (solo faltaba lo del personaje, que no afecta a los niños del mundo); «ahora» es el definitivo.

## 4. El equipo que no sigue: suceso y aviso

### 4.1 Qué hace

- **Señal nueva `club.equipo_sin_ninos`** (`SHARED_EVENTS.EQUIPO_SIN_NINOS`, `EquipoSinNinosData`: `sport`, `clubId`, `motivo` = `pocos` | `sin_categoria`, `jugadores`, `minimo`). La emite `npcs` al empezar el curso (`renovarDeportistas`, tras `completarEquipos`, función `equipoSinNinos` en `draft.ts`) si el club del personaje:
  - **no reúne en su categoría los niños de un equipo contándolo a él** (menos de 14: el equipo se cierra; motivo `pocos`), o
  - **no tiene equipos en la categoría a la que sube** (motivo `sin_categoria`: p. ej. el colegio al acabar el colegio).
- Entonces **no** salen los avisos de plaza (`plaza_extra`, `plaza_perdida`): sale este, que lo dice claramente («tendrás que buscarte uno, como todos los demás»).
- **Sale del club como cualquier niño sin equipo** (lo hace `clubes`, igual que con `club.plaza_perdida`). **Esto lo he decidido yo** al leer «tiene que buscarse equipo, como el resto»: si se prefiere que siga en el club sin equipo, es quitar el manejador de `modules/clubes/src/index.ts`.
- **Suceso `futbol.equipo_sin_ninos`** (`sucesoDeEquipoSinNinos` en el kit, `packages/kit-deporte/src/puestos.ts`; textos con concordancia en `modules/futbol/src/eventos/textos_de_puesto.ts`, `TEXTOS_DE_EQUIPO_SIN_NINOS`, sin palabras con género para el personaje). Dos variantes (`pocos`, `sin_categoria`), sin reparto (avisa el club, no una persona: al llegar la señal ya no es de ese club, y `delDeportePrincipal` exige serlo) y dos opciones sin consecuencias de juego: moverse ya (+2 de motivación) o esperar (−2, la de por defecto). `npm run eventos:validar` ✅ (61 sucesos, 448 caminos); `docs/eventos/MAPA.md` regenerado.

### 4.2 Tests

`tests/equipo-sin-ninos.test.ts`: `equipoSinNinos` (con equipo lleno no avisa; con 6 niños, `pocos`; sin la categoría, `sin_categoria`); la señal hace salir del club y llega el suceso con su texto (las dos variantes); el personaje tiene equipo tras el primer verano (A) o sale; la sección «El curso que viene» (sin números del motor, peligro, equipos que cerrarían, club sin la categoría).

### 4.3 Misión «convencer a niños de jugar en el equipo» (no hecha; cómo encajaría)

Es la idea de `reparto-equipos.md` §3 con lo nuevo: **el suceso `equipo_sin_ninos` podría salir antes**, no al cerrar: un `programa`/umbral cuando la sección «El curso que viene» diga «corre peligro» (`quedan < minimo`) durante la temporada. Esa misma cuenta (`NpcDirectory.previsionDelClub`) dice cuántos faltan (`minimo − quedan`) y sería el objetivo de la misión: **convencer a N niños que hoy no juegan en el club** (los `apartados` y los sin equipo con interés por el fútbol, de su colegio y año; y los amigos del personaje, relación `amigo`, que juegan en otro club). Cada convencido es una señal compartida (`club.fichar_amigo`) que `npcs` recoge y aplica con `intentarEntrar` (`sinPrueba`, plaza de más si hace falta) y marcando que ese verano no sortea irse a probar fuera. Las opciones del suceso de aviso («moverte ya») serían el gancho: llevar a la misión en lugar de a buscar club. Pide decidir cuántos intentos, qué tirada (sociabilidad / comunicación) y qué pasa si no llega a tiempo (el aviso de ahora).

## 5. La página del equipo

### 5.1 Qué había y qué hay

La sección **«Plantilla · <equipo>»** (jugador, puesto, partidos, titularidades, minutos, goles, asistencias y nota de la temporada, de verdad, de todos) ya existía. Se queda igual. Añado, justo debajo, **«El curso que viene · <categoría>»** (`seccionDePrevision`, `modules/futbol/src/index.ts`; datos de `NpcDirectory.previsionDelClub` → `previsionDelClubDe` en `modules/npcs/src/plantillas.ts`, tipo `PrevisionDelClubView` en `contracts`):

| Fila | Qué dice |
|---|---|
| Niños de tu club en <categoría> | Cuántos son ahora, tú incluido |
| Cambian de categoría al acabar la temporada | Cuántos y **quiénes** (nombres, con la categoría a la que pasan; «ya no tiene categoría» si no hay otra) |
| Siguen en <categoría> | Cuántos |
| Llegan de la categoría de abajo / Suben contigo | Los del club que hoy no están en la categoría del curso que viene y pasan a ella |
| Equipos de tu club en <siguiente> | Cuántos, y que cada uno necesita 14 niños |
| Seguros el curso que viene en <siguiente> | Cuántos habrá, tú incluido, frente a lo que piden los equipos |

Y una frase: **«Tu equipo corre peligro»** (con los que ya son del club faltarían N para formar un equipo; es **la misma cuenta que dispara el suceso del §4**), **«Con los que ya son del club hay niños para X de los K equipos… cerrarían K−X, y el tuyo podría ser uno de ellos»**, **«no corre peligro»** (con «aunque por poco» a 2 o menos) o **«tu club no tiene equipo en esa categoría»**. Cuenta solo a quien ya es del club (los que se apunten o se vayan en verano no se saben, y la sección lo dice) y usa lo que vería un niño: quiénes son, su año de nacimiento y su categoría; **nada de lo que vale cada uno ni números del motor** (hay una prueba que lo comprueba).

Capturas con Playwright y Chromium (`npm run probar-web`, deviceScaleFactor 1, semilla 35; el personaje, primer año de benjamín, en el B): `docs/relevo/reparto-equipos-2/pestana-antes.png` (antes: «Plantilla», «Tu temporada») y `docs/relevo/reparto-equipos-2/pestana-despues.png` (después: con «El curso que viene»). `probar-web` comprueba ya que la sección sale.

### 5.2 Notas

- La sección sale con la temporada en marcha (junto a «Plantilla»); sirve para verlo antes del cierre. En benjamín el aviso de equipos que cerrarían es cuestión de lectura: cada verano llegan niños nuevos (todos nuevos en el club), no se sabe cuántos, y la frase lo dice.
- `cuenta solo a quien ya es del club`: no estima los que llegarán de la bolsa. Una estimación con datos de verdad (cuántos niños del colegio y año hay sin equipo) sería posible, pero ya sería ver lo que el niño no ve.

### 5.3 Pregunta para el usuario (qué se ve)

La sección enseña **los nombres de los que suben de categoría** y **el mínimo de 14 niños por equipo**. Lo he considerado visible para un niño (los compañeros y su edad se ven; el entrenador diría que hacen falta 14). Si el usuario prefiere que **no** salga el mínimo (solo «tu equipo corre peligro») o que salgan **solo cuántos** suben y no sus nombres, es un cambio de `seccionDePrevision`. **No enseño:** el nivel de nadie, el reparto en equipos del año que viene, ni los niños que irán a probar fuera (no se saben).

## 6. Medidas (antes → después)

Ciudad grande. `ninos-sin-equipo` con 12 semillas (31, 33, 35 a 44) y 2 veranos; `equipos -- 4 2 grande`; `colegios -- 4 2`; `fichajes`; `benjamin -- 31,33`.

### Colegio del personaje: jugadores en su equipo por categoría (media de 12 semillas) y semillas sin equipo (menos de 14)

| Categoría | Al crear | Verano 1 | Verano 2 |
|---|---|---|---|
| Benjamín | 38,7 → **40,8** (0 → 0 de 12 sin equipo) | 35,0 → **36,8** (0 → 0) | 36,2 → **35,8** (0 → 0) |
| Alevín | 34,6 → **35,3** (0 → 0) | 32,7 → **34,1** (0 → 0) | 28,9 → **31,3** (0 → 0) |
| Infantil | 32,3 → **31,7** (0 → 0) | 29,8 → **29,8** (0 → 0) | 27,0 → **27,0** (0 → 0) |
| Cadete | 26,8 → **28,1** (0 → 0) | 22,7 → **23,8** (0 → 0) | 19,5 → **20,2** (1 → 1) |
| Juvenil | 31,3 → **32,8** (0 → 0) | 19,3 → **21,5** (1 → 1) | 12,8 → **15,0** (4 → 4) |

Niños con interés por el fútbol sin equipo en ese colegio (al crear / verano 1 / verano 2): benjamín 0,8 / 1,6 / 1,0 → 0,8 / 1,3 / 0,9; alevín 0,8 / 3,0 / 4,9 → 0,8 / 3,3 / 4,8; infantil 1,2 / 2,7 / 3,9 → 1,2 / 2,7 / 4,3; cadete 1,4 / 4,5 / 5,9 → 1,4 / 4,7 / 6,4; juvenil 1,1 / 5,4 / 10,9 → 1,4 / 5,6 / 11,0. **Todo dentro del ruido: la ambición en vez del nivel no cambia lo que se midió en la ronda anterior.**

### Toda la ciudad (`equipos`, media de 4 semillas)

| | Al crear | Verano 1 | Verano 2 |
|---|---|---|---|
| Clubes de fuera con equipo | 45,0 de 45 → 45,0 | 45,0 → 45,0 | 45,0 → 44,8 |
| Colegios con equipo (de 20) | 20,0 → 20,0 | 20,0 → 20,0 | 17,5 → 17,3 |
| Interesados sin equipo | 87,8 → 84,8 | 13,0 → 17,3 | 46,5 → 20,5 |
| Dejan el fútbol (acum.) | 0 → 0 | 43,5 → 39,0 | 46,0 → 46,0 |
| Equipos descompensados por puestos (de ~65) | 0,0 → 0,0 | 3,0 → 3,5 | 2,5 → 2,0 |
| Plazas de más (jugadores, club-categorías) | 7,8 en 5,8 → 9,5 en 7,3 | 44,5 en 11,8 → 46,0 en 13,5 | 40,0 en 15,8 → 30,5 en 15,5 |

### `fichajes` (12 semillas, 3 cursos)

Primeros años que le quitan el sitio a uno de segundo en el A de un club grande: **0,0 de media, máximo 0, 60 de 60 club-categorías con 2 o menos** (igual que antes). El personaje de partida entra en algún club en 12 de 12 semillas, como antes. Bot del montón que entra en el equipo A del colegio: curso 1: 0, curso 2: 11 → 12 de 12 (antes 11, curso 2). Niños que dejan el deporte por no encontrar club: 5,8 / 3,3 → 8,8 / 4,3 (cursos 1 y 2), por partida.

### `equipos-por-anio` (el personaje)

| Semilla | Al crear (antes → después) | Verano 1 (antes → después) |
|---|---|---|
| 31 | B (16 en la plantilla) → B (17) | A → A |
| 33 | B → B | A → A (19 → 18) |
| 35 | B → B | A → A |
| 36 | B → B | **sin equipo → A** |

### `benjamin -- 31,33`

Antes: B con 16 niños del mundo más él; no convocado. Después: B con 17 niños del mundo más él; **no convocado** (ver §1.2).

### Simulación, huella y rendimiento

- `npm run sim:rapida`: las mismas dos ⚠️ que en la rama de partida (medidas a la vez que otras simulaciones): «Rendimiento» (1,49 → 1,53 ms por acción, límite 1,22–1,24: inestable con otras cosas corriendo, ya conocido) y «El esfuerzo hace progresar» (atletismo +5,1 en las dos). Nada cambia por mí.
- `npm run huella -- 60`: **idénticas** las de los bots de atletismo (`abandono`, `aleatorio`); cambian solo las del fútbol (semillas 31 y 32), como se espera de un reparto distinto.
- `npm run rendimiento -- 60`: crear 697 → 680 ms, 2.968 KB → 2.968 KB, 1,60 → 1,71 ms por acción (ruido; no usa el fútbol ni la ciudad grande).

### Tests

`npm test`: todo en verde. Un test falló y lo he **cambiado** con explicación: `tests/continuidad.test.ts` («los futbolistas que siguen están en el mismo club», umbral 0,85 con **una** semilla). Con ambición 1 salía 0,848. Medido con 8 semillas en la ciudad de prueba: rama de partida **0,853 de media (de 0,828 a 0,876 según la semilla)**; con ambición 0,5 / 0,8 / 1 (sin nivel): 0,845 / 0,855 / 0,845. **No hay efecto de la ambición: el test estaba en la media y pasaba por azar de la semilla 31.** Ahora mide la media de 4 semillas (31–34) y exige más del 80 %, con la medida en el comentario. Si el usuario prefiere otra cifra (la intención de diseño era «solo cambia el 5–10 % por equipo»), es esa línea.

## 7. Lo que queda para decidir

1. **Cifras de probar fuera:** ambición 1 / nivel 0 (§2). Confirmar o cambiar a 1,5.
2. **Porcentajes por categoría:** mi propuesta es no tocarlos por los cierres (§3); +15 puntos es la alternativa.
3. **Qué se ve en «El curso que viene»:** nombres de los que suben y el mínimo de 14 (§5.3).
4. **Si el personaje cuyo equipo no sigue sale del club** (§4.1): lo he hecho porque «tiene que buscarse equipo, como el resto».
5. **El personaje en un equipo de benjamín de 17–18 sin ser convocado** (§1.2): dejarlo, convocar a todos en benjamín, o minutos garantizados.
6. **Misión de convencer a niños** (§4.3): cuando se quiera.
7. **Qué pasa cuando el personaje que no está en ningún club se apunta a un equipo que no existe** (club-categoría con menos de 14): no lo he mirado; `plazaEnElEquipo` no mira el mínimo de un equipo. Pendiente por si el usuario lo ve.
