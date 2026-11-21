# Relevo: comprobación final (17/11/2026)

Rama `claude/comprobacion-final` (sale de `claude/youthful-clarke-vs0kye`). Sin pull request. No se ha tocado `DECISIONES.md`.

## 1. Los dos fallos de las herramientas

**Los dos están en el bot de la herramienta, no en el juego. No hay nada que decidir del diseño** (abajo, una observación que sí es del usuario).

### `npm run benjamin -- 31,33` («el personaje juega en undefined»)

- **Causa:** con la semilla 33 el personaje no puede apuntarse al club del colegio: `futbol.apuntarse_colegio` sale no disponible con «El equipo de tu categoría está completo y todos juegan mejor que tú (el peor, Leo Cruz Urbano, tiene nivel 10 y tú 9)». Es la regla de plaza (`motivoSinPlaza`, `packages/kit-deporte/src/club.ts`), que existe desde antes de los sucesos (14/11, commit `8dcbc45` en adelante). La herramienta hacía `if (posible(...)) hacer(...)` sin mirar el resultado y seguía como si el personaje tuviera equipo (`personaje` vacío → «undefined»). La semilla 31 sí entra, por eso solo fallaba la 33.
- **Colegio sí, clubes de fuera: ver §6.** (Corrección del 17/11: aquí escribí que ningún club de fuera lo coge. Era un error mío: probé los clubes tarde, con el plazo de fichajes ya cerrado. En la semana 3, con el plazo abierto, entra en 3 de los 9 clubes de fuera; el detalle está en la §6.2.)
- **Arreglo (`tools/benjamin.ts`):** si no hay plaza, dice por qué («el personaje NO tiene plaza (motivo del juego)»), y mide lo mismo (semanas hasta el primer partido, convocatoria, asistencia) con el equipo benjamín A del colegio **sin el personaje**; se saltan solo las dos líneas del papel del personaje. Con la 31 la salida es la de siempre. No se usa la prueba de acceso (no cambia nada).

### `npm run probar-web` («tu entrenador no te convoca esta semana»)

- **Causa:** el bot se apuntaba al colegio y esperaba semanas sin ir a ningún entrenamiento. La asistencia a los entrenamientos pesa en la convocatoria (la misma regla que para los PNJ, `previaDelPartido`/`asistenciaDelPersonaje`), así que el entrenador no convocaba a nadie que no apareciera. Lo comprobé en proceso (semilla 35, sin navegador): sin sesiones, «no te convoca» en las semanas 4, 5 y 8; yendo a martes y jueves, sí hay semanas con partido y convocado. No depende de la salida del colegio (14:00–14:30) ni de la prueba de acceso.
- **Arreglo (`tools/probar-web.ts`):** el bot va a las sesiones de su club (`futbol.club_sesion`, en los días y la hora del club) desde la semana en que entra. No he buscado el commit exacto con bisect: la causa es esa regla (el bot nunca fue a un entrenamiento) y no hace falta.

### Observación para el usuario (no es un fallo)
Con la semilla 33, un personaje de nivel 9 no entra en ningún equipo de fútbol en toda la temporada y no hay más camino que entrenar por su cuenta y esperar al verano (plazo de fichajes). Está dicho en el mensaje de la acción («sigue entrenando por tu cuenta y vuelve a intentarlo»), pero si se quiere que siempre haya alguna puerta (p. ej. un equipo «B» sin nivel mínimo), eso es decisión de diseño.

## 2. `npm run probar-web` con sucesos y prueba de acceso

Nuevo tramo **antes** del partido (tras crear la partida), en el navegador:
1. Pide una prueba al primer club de fuera (`pedir_prueba`) en su hora de entrenamiento y se une al entrenamiento de prueba (`prueba`): sale el suceso `futbol.prueba_de_acceso`.
2. Comprueba que sale su **ventana** (título, opciones elegibles), hace una captura, **elige la primera opción con un clic** (si fuera solo un aviso, pulsa «Seguir») y comprueba que la ventana se cierra y que no queda pendiente.
3. Abre el **Diario** y comprueba que «Recuerdos» cuenta el suceso y, si hubo opción, «Elegiste: …».
4. Termina la prueba (`prueba_entrenar`). Si da plaza, juega con ese club; si no (lo normal con la semilla 35), se apunta al colegio. Luego va a los entrenamientos del club y juega el partido como antes, y comprueba la pestaña del deporte.

Salida con la semilla 35 (por defecto): «sale un suceso en su ventana: «La prueba en el club»; 17 opciones elegibles», se elige «Decirle que de pivote», el Diario lo cuenta con «Elegiste: …»; la prueba no da plaza, se apunta al colegio, semana 4 no convocado, semana 5 convocado y se juega el partido. Todo ✓. Capturas nuevas: `6a-suceso-prueba-de-acceso.png` y `6b-diario-recuerdos.png` (en la carpeta de capturas, no se suben al repositorio).

## 3. `npm run sim` completa, antes y después

- **Antes:** `ea716d6` (worktree), justo antes del primer commit del director (`06c2162`, «Sucesos, paso 2»; el paso 1, `ea716d6`, solo es el formato en contracts y no cambia la partida).
- **Después:** esta rama. 365 días × 5 semillas × 7 estrategias.

### Chequeos

Mismos 13 chequeos en los dos, todos ✅ salvo el de Rendimiento (ver abajo); en «después» hay uno más, **«Ritmo de los eventos» ✅: 2,0 eventos por semana de media (máx. 10), 31 distintos**. Ningún chequeo de balance cambia de estado.

| Chequeo | Antes | Después |
|---|---|---|
| Invariantes y bloqueos | ✅ | ✅ |
| El esfuerzo hace progresar | ✅ atletismo +10,1; nota +5,5 sobre el vago | ✅ +10,2; +5,4 |
| Especialista deportivo supera al equilibrado | ✅ 19,8 frente a 19,6 | ✅ igual |
| Especialista en estudios supera al equilibrado | ✅ 81,0 frente a 77,1 | ✅ igual |
| Esforzarse rinde más que no hacer nada | ✅ 30,3 frente a 20,7 | ✅ igual |
| Sobreentrenar no compensa | ✅ −5 %, salud final 1 | ✅ igual |
| Nadie llega a 90 antes de la semana 12 | ✅ | ✅ |
| Caída al dejar el deporte | ✅ pico 14,7 → 10,9 (−26 %) | ✅ igual |
| No hay estrategia dominante | ✅ | ✅ |
| Las carreras son una competición real | ✅ atleta 3 % victorias, 10 % podios | ✅ 2 % y 14 % (ruido de semillas) |
| Los niños no tienen nivel de adulto | ✅ 30,6 | ✅ 30,6 |
| Las estrategias razonables mantienen la salud | ✅ | ✅ |
| Ritmo de los eventos | (no existía) | ✅ 2,0 por semana, 31 distintos |
| **Rendimiento** | ver abajo | ver abajo |

**Rendimiento (⚠️ en las dos versiones cuando la máquina está cargada: no es de los sucesos).** El chequeo compara con una calibración de la máquina que varía mucho entre pasadas (8,7 a 11,7 ms). Ms por acción, tres pasadas:

| | ms por acción | límite del chequeo (calibración) | estado |
|---|---|---|---|
| Antes, con otra simulación a la vez | 1,87 | 1,60 (8,9 ms) | ⚠️ |
| Después, con otra simulación a la vez | 2,01 | 1,56 (8,7 ms) | ⚠️ |
| Antes, sola | 1,97 | 2,10 (11,7 ms) | ✅ |
| Después, sola | 1,99 | 1,63 (9,1 ms) | ⚠️ |

El coste por acción es el mismo con y sin sucesos (1,97 frente a 1,99 ms, dentro del ruido; ya se midió aparte: `docs/relevo/sucesos-rendimiento.md`). Lo que cambia entre pasadas es la calibración, no el juego. Si el aviso molesta, lo que hay que tocar es el chequeo (calibración más estable), no el juego.

### Tablas finales (media por estrategia; primera pasada de cada versión)

**Antes** (`ea716d6`):

| Estrategia | Global | Estudios | Atletismo | Físico | Mental | Social | Salud | Estrés | Nota media | Mejor 400 m | Podios |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Equilibrado | 30.3 | 77.1 (+15.2) | 19.6 (+10.1) | 18.4 (+5.7) | 19.7 (+7.4) | 16.8 (+4.7) | 97 | 0 | 7.9 | 71.17 s | 1.6 |
| Empollón | 27.9 | 81.0 (+19.1) | 9.4 (+0.0) | 13.5 (+0.8) | 19.2 (+6.9) | 16.3 (+4.2) | 100 | 6 | 8.5 | — s | 0.0 |
| Atleta | 25.7 | 56.3 (-5.6) | 19.8 (+10.4) | 18.5 (+5.9) | 18.7 (+6.4) | 15.2 (+3.1) | 99 | 0 | 6.3 | 70.68 s | 2.8 |
| Sobreentrena | 24.0 | 53.1 (-8.8) | 18.8 (+9.4) | 16.5 (+3.8) | 17.2 (+4.8) | 14.5 (+2.4) | 1 | 0 | 5.8 | 71.69 s | 0.6 |
| Vago | 20.7 | 45.2 (-16.7) | 9.4 (+0.0) | 14.0 (+1.4) | 17.4 (+5.0) | 17.5 (+5.4) | 100 | 1 | 2.5 | — s | 0.0 |
| Abandona el deporte | 28.6 | 82.1 (+20.2) | 10.9 (+1.5) | 14.8 (+2.1) | 19.2 (+6.9) | 16.2 (+4.1) | 100 | 6 | 8.4 | 72.94 s | 0.0 |
| Aleatorio | 28.8 | 76.4 (+14.5) | 13.4 (+4.0) | 16.3 (+3.6) | 19.1 (+6.7) | 18.7 (+6.6) | 2 | 6 | 3.8 | 73.43 s | 0.0 |

**Después** (esta rama):

| Estrategia | Global | Estudios | Atletismo | Físico | Mental | Social | Salud | Estrés | Nota media | Mejor 400 m | Podios |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Equilibrado | 30.3 | 77.1 (+15.2) | 19.6 (+10.2) | 18.4 (+5.7) | 19.7 (+7.4) | 16.9 (+4.8) | 100 | 0 | 7.8 | 71.32 s | 1.2 |
| Empollón | 27.9 | 81.0 (+19.1) | 9.4 (+0.0) | 13.5 (+0.8) | 19.2 (+6.9) | 16.3 (+4.2) | 100 | 6 | 8.5 | — s | 0.0 |
| Atleta | 25.7 | 56.4 (-5.5) | 19.8 (+10.4) | 18.5 (+5.9) | 18.7 (+6.4) | 15.2 (+3.1) | 100 | 0 | 6.2 | 70.70 s | 3.8 |
| Sobreentrena | 24.0 | 53.1 (-8.8) | 18.8 (+9.4) | 16.5 (+3.8) | 17.1 (+4.8) | 14.4 (+2.3) | 1 | 0 | 5.8 | 71.90 s | 0.4 |
| Vago | 20.7 | 45.1 (-16.8) | 9.4 (+0.0) | 14.0 (+1.3) | 17.3 (+5.0) | 17.5 (+5.4) | 100 | 1 | 2.4 | — s | 0.0 |
| Abandona el deporte | 28.7 | 82.1 (+20.2) | 10.9 (+1.5) | 14.8 (+2.1) | 19.2 (+6.9) | 16.3 (+4.2) | 100 | 6 | 8.5 | 73.27 s | 0.0 |
| Aleatorio | 28.8 | 76.5 (+14.6) | 13.3 (+3.9) | 16.3 (+3.7) | 19.0 (+6.7) | 18.7 (+6.6) | 3 | 7 | 3.4 | 73.52 s | 0.0 |

Diferencias y por qué:
- **Estudios, atletismo, físico, mental:** iguales o ±0,2 en todas las estrategias. Sin efecto del contenido de los sucesos en el balance.
- **Salud del Equilibrado 97 → 100 y del Atleta 99 → 100; estrés igual:** un suceso o dos que dan descanso o ánimo; sin problema (el chequeo de salud sigue ✅). Social del Equilibrado 16,8 → 16,9.
- **Nota media:** Equilibrado 7,9 → 7,8; Vago 2,5 → 2,4; Aleatorio 3,8 → 3,4 (este es el más ruidoso: es el bot que elige al azar, y los sucesos le cambian la partida entera porque cada elección mueve el azar de todo lo demás).
- **Podios y mejor 400 m del atleta y el equilibrado:** cambian por el ruido de las semillas (el azar de las carreras depende de cuánto pasa antes); el chequeo sigue ✅.
- **Acciones por año:** +0,5 % a +2 % en casi todas las estrategias (los bots eligen las opciones de los sucesos, que son acciones); el Vago, +2 %.
- **Ningún bot se porta mal:** ni acciones fallidas, ni bloqueos, ni stats fuera de rango. No hizo falta tocar `sim/src/bots.ts`.

Informes completos: `sim/reports/ultimo/informe.html` (esta rama; no se sube).

## 4. Comprobado antes de terminar

`npm run typecheck` ✅ · `npm test` ✅ (92 archivos, 1098 tests, 703 s) · `npm run eventos:validar` ✅ (59 sucesos, 368 caminos, 6 avisos que ya había) · `npm run benjamin -- 31,33` ✅ (la 33 ya no falla) · `npm run probar-web` ✅.

## 5. Dudas para la arquitectura
1. ¿Quiere el usuario que un personaje que se queda sin equipo (semilla 33, pasado el plazo) tenga otra puerta? (observación de arriba y §6).
2. El chequeo de Rendimiento de la simulación es inestable por su calibración; propongo estabilizarlo (promedio de varias medidas o una banda más ancha) en una sesión aparte.

## 6. Niños sin equipo (medición del 17/11, sin cambiar el juego)

Rama de trabajo con la prueba de acceso nueva (unida `claude/futbol-2`). Herramienta nueva, solo de lectura: `npm run ninos-sin-equipo -- [semillas] [veranos]` (§6.1), `-- clubes <semilla>` (§6.2) y `-- convocatorias [semillas]` (§6.3). Ciudad grande.

### 6.1 En el colegio del personaje, por categoría

Alumnos del colegio del personaje (los que van a su colegio, de la edad de cada categoría; una categoría abarca dos o tres años de edad). Media de **6 semillas (31, 33, 35, 36, 37, 38)**. «Sin equipo» = sin deporte (no juega en ningún club ni en el colegio) y con interés por el fútbol; «solo deporte» = sin interés por el fútbol pero con interés por el deporte en general; «sin interés» = ninguno de los dos. Máximo de plantilla 18, mínimo 14.

**Al crear la partida**

| Categoría | Alumnos | En el equipo del colegio | En un club de fuera | Sin equipo, con interés por el fútbol | Sin equipo, solo interés por el deporte | Sin interés | ¿Daría para otro equipo? |
|---|---|---|---|---|---|---|---|
| Benjamín | 97,3 | 18,0 | 33,7 | 0,7 | 1,2 | 43,8 | No (0 de 6 semillas) |
| Alevín | 100,5 | 14,7 | 37,7 | 1,0 | 1,8 | 45,3 | No (0 de 6) |
| Infantil | 100,2 | 16,7 | 32,2 | 1,2 | 2,0 | 48,2 | No (0 de 6) |
| Cadete | 100,2 | 17,7 | 35,7 | 1,0 | 3,2 | 42,7 | No (0 de 6) |
| Juvenil | 100,0 | 23,0 | 22,0 | 2,2 | 3,7 | 49,2 | No (0 de 6) |

**Tras el verano 1**

| Categoría | Alumnos | En el equipo del colegio | En un club de fuera | Sin equipo, con interés por el fútbol | Sin equipo, solo interés por el deporte | Sin interés | ¿Daría para otro equipo? |
|---|---|---|---|---|---|---|---|
| Benjamín | 97,3 | 15,2 | 37,2 | 2,0 | 2,7 | 40,3 | No (0 de 6) |
| Alevín | 100,5 | 12,2 | 31,5 | 3,7 | 5,7 | 47,5 | No (0 de 6) |
| Infantil | 100,2 | 13,2 | 32,5 | 3,7 | 4,5 | 46,3 | No (0 de 6) |
| Cadete | 100,3 | 13,0 | 30,5 | 5,3 | 5,7 | 45,8 | No (0 de 6) |
| Juvenil | 100,0 | 10,8 | 25,7 | 7,3 | 10,2 | 46,0 | No con interés por el fútbol; con los de interés general, en 4 de 6 semillas |

Qué dice:
- **Casi nadie con interés se queda sin jugar**: 0,7 a 2,2 por categoría al crear, 2 a 7 tras un verano. Los demás alumnos o están en el equipo del colegio (12–23), o ya juegan en un club de fuera (22–38), o no tienen interés por el fútbol (40–49, casi la mitad del colegio).
- **Un segundo equipo del colegio no se llenaría** con los que quedan: haría falta 14 y no pasan de 7 con interés por el fútbol (de 6 solo en juvenil). Solo en juvenil, tras un verano, sumando los que solo tienen interés por el deporte, algunas semillas llegarían.
- **Más preocupante que sobrar es que el equipo del colegio no llegue a 14**: tras un verano el equipo del colegio baja de ~18 a 11–15 de media, y a veces desaparece (semilla 33 alevín: **0** ya al crear; semilla 38 benjamín tras el verano 1: **0**). Entonces sus alumnos no tienen equipo del colegio, y es lo que le pasa al personaje de la semilla 33 en alevín. (Es el cierre de equipos que no llegan al mínimo, ya documentado en `CIUDAD_Y_LIGAS.md` §3.)
- Por semilla (alumnos / en el equipo / en club / sin equipo con interés), al crear: 31 benjamín 97/18/34/0, alevín 101/18/37/0; 33 benjamín 97/18/35/1, alevín 100/**0**/40/0; 35 benjamín 97/18/31/0, alevín 100/18/33/3; 36 98/18/34/1 y 101/18/47/0; 37 97/18/38/1 y 100/16/31/1; 38 98/18/30/1 y 101/18/38/2.

### 6.2 «No llega» en los clubes de fuera, semilla 33

Personaje de la semilla 33 en la semana 3 (plazo de fichajes abierto): **nivel 9,5** (el club del colegio dice 9); su mejor puesto es central (CB) con **9,6**; en el resto de puestos vale 8–9. Ningún club tiene nivel mínimo (todos «sin mínimo»): lo que cuenta es la regla de plaza, por puesto. La tabla usa lo que vale él hoy; la prueba real suma un azar del día (de ahí que alguna casilla cambie).

| Club | Su plaza hoy (con lo que vale) | Peor del equipo en su puesto (valor) | Él en ese puesto | Huecos en el equipo | **Resultado de la prueba real (semana 3)** | Por qué, en palabras sencillas |
|---|---|---|---|---|---|---|
| club_grande (Real Ciudad) | completo | Aurora Castro, 11,4 | 10 | CDM, LCR, RCR, CM | **No pasa** («no llegas») | De central el equipo está lleno y hasta el peor central vale 11,4 frente a sus 10. Los huecos son de centrocampista, donde vale 9: tampoco llega. |
| club_mediano (UD del Barrio) | por mérito | Matías Aguirre, 9,5 | 10 | ninguno | **Pasa**, de central | Está lleno, pero el peor central vale 9,5 y él 10: le quita el puesto por muy poco. |
| club_mediano2 | no llega | Gala Álvarez, 11,8 | 10 | CB, LM, RM, CAM, LW, RW, ST, LST, RST | **No pasa** («no llegas») | Hay hueco de central, pero en la prueba se mide con el suplente que mejor cubriría ese hueco, y las centrales del club valen ~11,8: no llega. |
| club_mediano3 | completo | Álvaro Dorado, 10,4 | 10 | ninguno | **No pasa** («completo, juegan mejor») | Equipo lleno y el peor central vale 10,4: por una décima. |
| club_pequeno (Los Pinos) | por mérito | Enzo Parra, 9,4 | 10 | ninguno | **Pasa**, de central | Lleno, pero el peor central vale 9,4 y él 10. |
| club_pequeno2 | no llega | Irene Cortés, 11,4 | 10 | CB, LB, RB | **No pasa** («no llegas») | Hay hueco de central y de lateral, pero se mide con el suplente que lo cubriría (vale ~11): no llega. |
| club_pequeno3 | completo | Aroa Fernandes, 10,1 | 10 | CDM, LCR, RCR, CM | **No pasa** («no llegas») | Lleno de centrales (peor 10,1, por una décima); los huecos son de centrocampista y ahí vale 9. |
| club_pequeno4 | no llega | Claudia Sierra, 10,5 | 10 | 11 puestos (CB, LB, RB, CDM, LCR, RCR, CM, CAM, ST, LST, RST) | **No pasa** («no llegas») | Equipo muy corto de jugadores (11 huecos) pero el suplente que cubriría el hueco de central vale más que él (10,5 frente a 10): no llega. |
| club_pequeno5 | completo | Nabil Slimani, 9,7 | 10 | ninguno | **Pasa**, de central | Lleno, pero el peor central vale 9,7 y él 10. |

Resumen: **con el plazo abierto entra en 3 de los 9 clubes** (los tres, por mérito de 0,3 a 0,6 puntos sobre el peor central; es una moneda al aire según el día de la prueba). En los otros 6 no: «equipo completo y todos valen más» (2) o «hay hueco, pero el suplente que lo cubriría vale más» (4; el mensaje del juego dice «no llegas a lo que pide el club en ese puesto»). **No hay hueco en un puesto que no sea el suyo que le sirva**: donde hay huecos (centrocampistas, laterales) vale 9 como mucho y no supera a los suplentes. El nivel mínimo del club no interviene. Con el plazo cerrado (pasadas las primeras semanas), ya solo entran los clubes con hueco y sin sacar a nadie, y ahí entra muy poco.

### 6.3 Convocatorias con la plantilla actual (14–18)

El entrenador convoca como mucho **16** (11 titulares y 5 suplentes: `PARAMETROS_DE_CONVOCATORIA.convocados`); con 16 o menos disponibles convoca a todos (menos los lesionados). Medido en los **450 equipos** de la ciudad (semillas 31, 33, 35; sábado de la semana 6):

| Plantilla | Equipos | Convocados (media) | Se quedan fuera (media) |
|---|---|---|---|
| 14 | 10 | 13,8 | 0,2 |
| 15 | 15 | 14,6 | 0,4 |
| 16 | 29 | 15,5 | 0,5 |
| 17 | 46 | 15,9 | 1,1 |
| 18 | 350 | 16,0 | 2,0 |
| **Todos** | 450 | 15,9 (plantilla media 17,6) | **1,7 (un 10 % de la plantilla)**; lesionados ese sábado: 0,4 por equipo |

Casi todos los equipos (350 de 450, el 78 %) están en el máximo de 18: se quedan fuera **2 por partido** y los demás juegan, aunque sea de suplentes. Los que no se presentan (sorteo de ausencias) reducen aún los que juegan, pero no los citados. Es decir, **ampliar el equipo no haría falta por convocatorias: el que queda sin equipo es un niño que no entró en la plantilla, no uno del banquillo**.

## 7. Por qué el equipo del colegio sale vacío o casi vacío (diagnóstico del 17/11, sin cambiar el juego)

Herramientas: `npm run ninos-sin-equipo -- colegio <semillas> <veranos>` (caso por caso: de dónde salen y adónde van los alumnos, y los cierres del verano con `DIAGNOSTICO.alCerrar`) y la tabla de §6.1 ahora con **12 semillas y 2 veranos**, que cuenta en cuántas el colegio se queda sin equipo.

### Con qué frecuencia (12 semillas; colegio con menos de 14 en la categoría = sin equipo)

| Categoría | Al crear | Tras el verano 1 | Tras el verano 2 | Jugadores del equipo del colegio (media, al crear → verano 1 → verano 2) |
|---|---|---|---|---|
| Benjamín | 0 de 12 | 1 de 12 | 2 de 12 | 17,9 → 16,4 → 14,8 |
| Alevín | 1 de 12 | 3 de 12 | 3 de 12 | 16,2 → 14,7 → 13,3 |
| Infantil | 0 de 12 | 3 de 12 | 3 de 12 | 17,2 → 14,9 → 12,9 |
| Cadete | 0 de 12 | 3 de 12 | 6 de 12 | 17,8 → 14,1 → 10,9 |
| Juvenil | 0 de 12 | 4 de 12 | 9 de 12 | 24,3 → 10,6 → 3,7 |

Al crear la partida es raro (1 caso de 60). Con los veranos empeora y se acumula en las categorías mayores. Los que se quedan fuera tampoco darían para otro equipo (nunca llegan a 14 con interés por el fútbol salvo en juvenil, verano 2).

### Los casos

- **Semilla 33, alevín, al crear (0 jugadores):** el colegio tiene 41 alumnos de la categoría con interés por el fútbol o el deporte (bolsa de los clubes: 21 de primer año y 20 de segundo) y **los 41 acaban en clubes de fuera** (20 + 20; 1 sin equipo). No es una cuestión de que falten niños: es que ninguno queda para el colegio. Con las otras categorías de esa semilla no pasa (benjamín 18).
- **Semilla 38, benjamín, al crear → verano 1:** al crear tiene 18; en el verano el director avisa de que **el equipo se queda con 12 jugadores (montables 0) y se cierra**. Tras el verano, de los 47 alumnos con interés (23 de primer año y 24 de segundo), **46 juegan en clubes de fuera** y ninguno en el colegio. Los 7 de 8 años que había en el equipo pasan a otro club y 4 quedan sin equipo.
- **Semilla 33, verano 1:** cierran a la vez alevín (se queda con 9), infantil (8) y juvenil (10): equipos que ya iban justos o vacíos. Los 9 que jugaban en el colegio con 9 años pasan a un club de fuera y 1 se queda sin equipo.
- **Semilla 31, verano 1:** el colegio solo cierra por debajo del mínimo en juvenil (queda con 21 con 2 equipos y baja a 1): es lo normal.

### Causa (no es un defecto del código; es cómo está diseñado)

1. **Los clubes de fuera eligen antes que el colegio.** En el «draft» (`draftDeUnaCategoria`, `docs/CIUDAD_Y_LIGAS.md` §3) cada club de fuera ve entre el 40 y el 60 % de toda la ciudad (por atractivo) y se queda con los mejores por puesto para su A y su B; **después** el colegio recibe solo «sus alumnos que siguen en la bolsa». El colegio es el menos atractivo, por diseño. Cada club monta A y B (hasta 36) y luego C y D con lo que sobra, así que absorben casi todo: al crear, de los ~55 alumnos con interés de una categoría, ~34 juegan en un club de fuera y ~18 en el colegio (de 0 a 20 según la semilla).
2. **El mínimo de 14 es duro** (decisión del usuario del 08/11: «el A del colegio debería existir siempre hasta cadete, pero no es obligatorio; el mínimo de 14 manda»). Si al colegio le quedan 13, no hay equipo, y los 13 se van a otros clubes o se quedan sin equipo (cierre).
3. **El verano lo agrava.** Cada categoría abarca 2–3 años: los de segundo año suben a la categoría siguiente (donde el colegio puede no tener equipo) y los de primer año entran por el mismo «draft» con los clubes primero. «Completar antes de cerrar» (bolsa y ascenso en cadena) rescata a algunos, pero si la bolsa del colegio está vacía no hay con qué. Una vez que un colegio pierde un curso, **sus jugadores se reparten por clubes y no vuelven**: por eso el efecto se acumula (juvenil, 9 de 12 semillas sin equipo al segundo verano).
4. **No es un fallo de reclutamiento ni de bajas sin reponer:** no hay niños que «deberían estar» y no se rellenen; los niños existen y están jugando, en otro club. Tampoco he visto bajas del verano sin reponer (los 12 semillas × 2 veranos muestran pocos «han dejado el fútbol»).

### Opciones (decide el usuario; no he tocado nada)

| Opción | Qué cambia | Efecto esperado | Coste / riesgo |
|---|---|---|---|
| A. **Prioridad al colegio con sus alumnos** | Que el colegio reciba antes (o a la vez) a sus alumnos con interés, hasta su mínimo de 14, y los clubes cojan del resto | El colegio del personaje siempre tiene equipo de benjamín a cadete; los clubes pierden alumnos de ese colegio | Rompe «cada club ve a niños que van a probar con él»; los clubes quedan peor surtidos; hay que volver a medir `equipos` y `colegios` |
| B. **Mínimo menor para el colegio** (p. ej. 11) | Un equipo de colegio de 11–13 sigue existiendo | Casi todos los casos de §6 (12, 11, 9–10) se salvan; equipos más justos (sin suplentes) | Partidos de 11 sin banquillo; convocatoria sin rotación; decisión de diseño de plantillas |
| C. **Equipo mixto por edades** | El colegio junta dos categorías vecinas si no llega en ninguna | El personaje siempre juega | Rompe las categorías por edad y las ligas |
| D. **Incluir a los de «solo deporte»** con prioridad en el colegio | Rellenar con alumnos de interés general (hoy 2–7 por categoría, sin equipo) | Salva 1–3 casos | Pocos casos; juega gente sin interés por el fútbol |
| E. **Dejarlo como está** | Nada | El personaje que se queda sin colegio prueba en un club (con el plazo abierto entra en ~3 de 9 clubes, §6.2) y se acepta que lo difícil sea entrar | El colegio de las categorías mayores desaparece en pocos veranos (juvenil, 9 de 12 al verano 2) |

Recomendación: **A**, quizá con **B** como red (mínimo 12 para el colegio): el personaje empieza en el colegio y ese equipo no puede desaparecer por el reparto, que es lo que el usuario espera del club del colegio. Pero cambia el reparto de toda la ciudad, así que hay que medir antes y después.
