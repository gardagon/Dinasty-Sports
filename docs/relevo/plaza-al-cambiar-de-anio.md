# Relevo: la plaza al cambiar de año (rama `claude/plaza-al-cambiar-de-anio`, sale de `claude/youthful-clarke-vs0kye`)

Encargo del usuario (22/11/2026, `DECISIONES.md` «el personaje que perdería su plaza al cambiar de año»; **no he tocado `DECISIONES.md`**). Sin pull request. Medidas en la ciudad grande, deterministas por semilla; «antes» es la rama de partida medida en una copia limpia.

## 0. Resumen

1. **En benjamín y alevín, los de primer año no desplazan a uno de segundo del club** (§1). Es un dato de la categoría: `CategoriaDef.primerAnioNoDesplazaEn` (`['colegio', 'club']` en benjamín y alevín del fútbol), igual que `rotacionEn`.
2. **La salida por perder la plaza es un suceso con opciones**, `futbol.plaza_perdida` (§2). Antes, una línea del diario.
3. **Otros caminos por los que sale del club sin suceso** (§3): casi no hay; uno revisado en el código y sin probar.
4. **Medidas** (§4): la semilla 31 ya no pierde la plaza, la 35 tampoco; **pero la semilla 33 «al crear» pasa a no tener equipo** (§4.2, hay una decisión para el usuario).

## 1. Los de primer año no desplazan

`repartirEnEquipos` (`modules/npcs/src/equipos.ts`) recibe `segundosPrimero` (se lo da `equiposDelClub` según el dato de la categoría y el tipo de club). Con él, el A se llena **primero con los de segundo año**: por puestos y, **si el cupo de su puesto está lleno, en el sitio que quede hasta el máximo del equipo** (ya tenían plaza en el club); los de primer año solo suben en el sitio libre que quede, respetando puestos, y sigue sin dejarse al B con menos de 14. `llenar` admite ahora jugadores ya dentro y no pasa del máximo.

**Qué pasaba en la semilla 31:** no eran 5 primeros años los que le quitaban el sitio: en el verano 1 hay 18 segundos (17 + él) y 2 primeros en el A, y **el personaje (RST, 11,8) quedaba fuera por el cupo de delanteros** (3 segundos del club valen más). Solo ordenar segundos antes que primeros no lo arreglaba; hacía falta que el segundo año del club ocupe «el sitio que quede» aunque su grupo esté lleno. Con eso, el A de ese caso es 18 segundos + 1 primero.

Aplica igual a PNJ y personaje (es el mismo código). Un segundo año **sí puede salir** si hay más segundos que sitio en el A (18 máximo + plazas de más): ahí no lo desplaza ningún primero, sino otro segundo que vale más. Desde infantil no rige el dato.

## 2. El suceso `futbol.plaza_perdida`

- **Señal:** `club.plaza_perdida` (`PlazaPerdidaData`) lleva ahora `participants: [{ npcId }]` (el entrenador de su equipo, buscado en `npcs` con club, deporte y edad de antes del cambio) y `plazoHasta` (**el último día del plazo de fichajes**, p. ej. «el lunes 14 de septiembre», con `semanasDeTemporada(...).primeraCompeticion` y `diaConFecha`). Hace falta porque, al llegar la señal, el personaje ya no es del club y `delDeportePrincipal` no encontraría al entrenador; el suceso toma el papel con `deLaSeñal`.
- **Suceso** (`sucesoDePlazaPerdida`, kit `puestos.ts`; textos en `modules/futbol/src/eventos/textos_de_puesto.ts`, `TEXTOS_DE_PLAZA_PERDIDA`): el entrenador se lo dice y hay tres opciones: **buscar otro club** (el texto da la fecha hasta la que siguen las pruebas), **entrenar por su cuenta** (por defecto a los 3 días) y **preguntar qué mejorar** (afinidad y confianza con el entrenador y +1 de conocimiento del deporte). Aplazable. Los textos no usan palabras con género sobre el personaje (el entrenador va con `{entrenador.Nombre}`); `eventos:validar` los recorre en masculino y femenino.
- **Quitada** la línea del diario del kit (`comunes.ts`). Sigue saliendo del club el módulo de clubes como antes.
- `npm run eventos:validar` ✅ (63 sucesos, 458 caminos); `docs/eventos/MAPA.md` regenerado.
- **Pregunta de diseño:** «buscar otro club» es hoy solo una elección con +2 de motivación; no abre nada (el personaje ya puede pedir pruebas con las acciones de siempre). Si se quiere que lo lleve a algo (p. ej. una misión o una cita), es siguiente paso.

## 3. Otros caminos por los que el personaje sale del club sin suceso

Las únicas salidas son las del módulo de clubes (`modules/clubes/src/index.ts`):
1. `club.plaza_perdida` → **ahora con suceso** (este encargo).
2. `club.equipo_sin_ninos` → ya tenía suceso (`futbol.equipo_sin_ninos`, relevo anterior).
3. `club.salir` (la acción «Dejar el club»): voluntaria, lleva su línea del diario; no necesita suceso.
4. Cambiar de club sin dejar el anterior (plantón): tiene línea de diario y estrés; es decisión del jugador.

**Hueco revisado en el código, sin probar:** el personaje que **pasa de la categoría más alta** (en `renovarDeportistas` / emisión de `npcs`, `categoriaDe(pob, edadProxima)` es `undefined` y se salta) **no se procesa y sigue siendo del club sin equipo**, sin aviso. Es el equivalente de `sin_categoria` a la edad máxima. Lo apunto para la arquitectura; no lo he tocado.

## 4. Medidas (antes → después)

### 4.1 `equipos-por-anio -- 31,33,35,36 1`

| Semilla | Al crear | Verano 1 |
|---|---|---|
| 31 | B → B | **sin equipo → B/A con equipo** (sigue en el club) |
| 33 | B → **sin equipo** (§4.2) | A → A |
| 35 | B → B | **sin equipo → con equipo** |
| 36 | B → B | A → A |

Equipos por año (jugadores primer/segundo año): sin cambio en colegios de 2 equipos (A 1,7/15,1 → 1,6/15,1); con 3 equipos el A de los colegios pasa de 1,2/16,8 a **0,2/18,1** (los de primer año ya no entran), y en los clubes de fuera de 3 equipos de 1,2/17,3 a 0,7/17,9. (Hay más club-categorías de otro tamaño porque el reparto de la partida se mueve: ruido de azar.)

### 4.2 Lo que no esperaba: semilla 33 al crear

Con el cambio, en la semilla 33 el personaje (primero de benjamín, CM) entra en el club del colegio pero **no cabe en ningún equipo** (`equiposDelClub` con él: A 18, B 13, sobra él). Antes, uno o dos primeros años subían al A y dejaban sitio en el B. **Es un fallo que ya existía** pero que este cambio destapa: la comprobación de plaza al apuntarse (`motivoSinPlaza`) mira el club entero y no el cupo de su puesto en su equipo, y a la creación no hay «plaza de más» para él (solo en `renovarDeportistas`). **Propuesta, no hecha:** que al apuntarse (y a la creación) se compruebe con `equipoDelPersonajeEn` y se le abra una plaza de más como en verano. Decisión del usuario/arquitectura.

### 4.3 `ninos-sin-equipo` (6 semillas, 2 veranos)

Todo dentro del ruido: «colegio sin equipo» **0 de 6** en todas las categorías antes y después; niños con interés sin equipo en el colegio: benjamín al crear 1,0 → 1,0, alevín 0,8 → 0,8; verano 1 benjamín 1,8 → 1,5, alevín 3,8 → 3,8. Más niños en el equipo del colegio en alevín (31,8 → 33,0 al crear; 29,8 → 32,2 en el verano 1).

### 4.4 `fichajes` (12 semillas, 3 cursos)

«Primeros años que le quitan el sitio a uno de segundo en el A de un club grande»: **media 0,0, máximo 0, 60 de 60 con 2 o menos** (igual). El personaje de partida entra en el colegio en **12 de 12** (antes 11 de 12), en club_grande 7 de 12 (8) y en club_mediano 10 de 12 (8). Equipos descompensados por puestos 187 → 186 de 300. Futbolistas al empezar 593,7 → 603,0. El resto, ruido.

### 4.5 `benjamin -- 31,33`

Semilla 31: B con 17 en la plantilla, no convocado sin el personaje 1 de 17, igual que antes. Semilla 33: **sin plaza de equipo** (§4.2).

## 5. Tests

`tests/plaza-al-cambiar-de-anio.test.ts`: el reparto (sin la regla, el primer año estrella desplaza al segundo flojo; con ella, no; con sitio libre siguen subiendo), el dato (solo benjamín y alevín), el suceso (sale del club, texto con la fecha, opciones, ya no hay línea del diario) y la semilla 31 de la ciudad grande (sigue en el club). Actualizados `tests/fichajes.test.ts` (el aviso ahora es el suceso) y `tests/eventos-primeros.test.ts` (nuevo aplazable). `npm test`: 120 archivos, 1327 tests ✅.

## 6. Para decidir

1. **El personaje sin equipo al crear (§4.2)**: comprobar el cupo al apuntarse y dar plaza de más.
2. **Personaje que acaba la última categoría (§3)**: sigue en el club sin equipo y sin aviso.
3. **«Buscar otro club» (§2)**: ¿que haga algo más que subir la motivación?
