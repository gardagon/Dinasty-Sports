# Relevo: rotación en los colegios, «El curso que viene» al terminar la temporada y puestos de la plantilla (rama `claude/rotacion-y-puestos`, sale de `claude/youthful-clarke-vs0kye`)

Encargo del usuario (21/11/2026) por la sesión de arquitectura. **No he tocado `DECISIONES.md`** (las entradas están sin escribir: ver §5) y no hay pull request. Las medidas son de la ciudad grande, deterministas por semilla; «antes» es el mismo código con el dato `rotacionEn` quitado de las categorías (`datos.ts`), así que lo único que cambia entre «antes» y «después» es la rotación.

## 0. Resumen

1. **Rotación** (§1): en los colegios, en benjamín y alevín, el entrenador rota: el que menos ha jugado esta temporada entra antes en la convocatoria y en el once. Es un dato (`CategoriaDef.rotacionEn: ['colegio']`) y vale igual para el personaje y los PNJ; los clubes de fuera y las demás categorías **no cambian** (medido: sus números salen idénticos). En esos equipos, tras una temporada, **nadie se queda sin jugar** (antes, 2–3 % de los niños tenía 0 minutos y 4–5 % menos de 180) y el reparto de minutos dentro del equipo es más parejo (desviación típica de 438 → 315 minutos en benjamín, 441 → 336 en alevín).
2. **«El curso que viene»** (§2): solo sale cuando termina la temporada. «Termina» se define con el calendario del deporte (`temporadaTerminada`, en `calendario-de-temporada.ts`): los tramos `terminada` (liga cerrada) y `verano`, hasta el reparto del verano.
3. **Puestos de la plantilla** (§3): **no es un fallo.** La columna enseña el puesto que ocupa cada niño en la plantilla (no donde juega), y que ~80 % sea del lado derecho es la pierna buena (20 % de zurdos, lo decidido el 04/11), no un sesgo del reparto: el once siempre tiene sus laterales y extremos de los dos lados. Solo he cambiado el título («Puesto en la plantilla») y puesto una frase de explicación bajo el título de la sección.

## 1. Rotación en los equipos de colegio de benjamín y alevín

### 1.1 Qué hace y dónde está

- **Dato:** `CategoriaDef.rotacionEn?: readonly TipoDeClub[]` (`packages/contracts/src/categories.ts`; `TipoDeClub = 'colegio' | 'club'`). Benjamín y alevín del fútbol de España llevan `rotacionEn: ['colegio']` (`modules/futbol/src/datos.ts`). Un club es «de colegio» si su equipo lleva `colegio` (el del personaje o los de fuera): `rotaElEquipo` (`modules/npcs/src/plantillas.ts`), publicado como `NpcDirectory.rotaElEquipo?(deporte, club, categoria)`. Para rotar también en los clubes de fuera o en otra categoría basta con cambiar ese dato (`['colegio', 'club']`), sin tocar código.
- **Regla** (`modules/futbol/src/convocatoria.ts`): `PARAMETROS_DE_CONVOCATORIA.rotacion.peso = 0.6` y `factorDeRotacion(minutos, media)`: `1 + 0,6 × clamp(1 − minutos / media, 0, 1)`. La preferencia del entrenador por cada jugador (la `prioridad` que ya existía: asistencia y relación) se multiplica por ese factor; `media` son los minutos medios de la plantilla **este curso** (los de otro curso no cuentan) y `minutos` los de cada uno (las estadísticas de verdad de cada jugador, personaje incluido). Con la mitad de los minutos de la media, +30 %; sin haber jugado, +60 %; con la media o más, nada. Así **el que menos ha jugado entra antes**, y «el que lleva más partidos sin ser convocado» es justo el que menos minutos tiene, así que no hace falta guardar un contador nuevo. La convocatoria sigue siendo de 16 y la formación, la misma.
- **Dónde se aplica:** `paraConvocarElEquipo(plantilla, { rotar: { curso }, relacion })` sustituye al `plantilla.map(paraConvocar)` en los cuatro sitios donde se convoca (previa del personaje, día de partido del mundo, `ladoDelPartido`); `rotacionDe(dir, club, categoria, curso)` en `index.ts` decide si rota. `partidoDeLiga` y `ladoDelPartido` reciben el `curso`.
- **Límite que conviene saber:** el +60 % rescata a quien vale más de ~62 % de lo que valen sus compañeros (un 8 frente a 12–13 entra, un 6 no). En benjamín y alevín las diferencias son pequeñas (el personaje ~10 frente a ~12); si se quiere que juegue también quien es mucho peor, es subir el peso (decisión de balance que no he tomado).

### 1.2 Medida: minutos por niño y temporada (`npm run rotacion -- 31,33,35 40`)

Tres semillas, hasta la semana 40 (liga terminada, antes del verano). Minutos de cada jugador de los equipos A–D con 14 o más (estadísticas del curso). Antes → después:

| Tipo · categoría | Jugadores | Media | Peor | P10 | Con 0 min | Con < 180 min | Desv. dentro del equipo |
|---|---|---|---|---|---|---|---|
| **colegio · benjamín** | 469 | 1.051 → 1.051 | 0 → **270** | 450 → **630** | 2 % → **0 %** | 5 % → **0 %** | 438 → **315** |
| **colegio · alevín** | 384 | 1.021 → 1.021 | 0 → **270** | 360 → **630** | 3 % → **0 %** | 4 % → **0 %** | 441 → **336** |
| colegio · infantil | 380 | 1.050 (igual) | 0 | 435 | 1 % | 3 % | 403 |
| fuera · benjamín | 1.124 | 1.066 (igual) | 0 | 375 | 2 % | 4 % | 438 |
| fuera · alevín | 1.132 | 987 (igual) | 0 | 360 | 2 % | 6 % | 431 |
| fuera · infantil | 1.097 | 1.010 (igual) | 0 | 405 | 2 % | 4 % | 415 |

(La media de minutos no cambia: los que juegan más pierden lo que ganan los que juegan menos. Las seis filas de «igual» salen idénticas con y sin el dato: la rotación solo toca donde el dato lo dice.) Los partidos medios por jugador tampoco cambian (15,1 → 15,0 y 14,9 → 14,7).

### 1.3 `npm run benjamin -- 31,33` (el personaje)

La herramienta tiene una parte nueva al final: **la liga entera** con el personaje yendo a todos los entrenamientos del club y a todos los partidos a los que lo convocan (une, vestuario y «Jugar el partido» de verdad, no solo mira el papel). Letras: T titular, s suplente que juega, b convocado sin jugar, `·` no convocado.

| Semilla | Antes | Después |
|---|---|---|
| 31 (colegio, benjamín B) | convocado 18 semanas (1 titular, 10 suplente, 7 sin jugar); **11 PJ, 570 min** | convocado 18 semanas (4 titular, 7 suplente, 7 sin jugar); **11 PJ, 495 min** |
| 33 (colegio, benjamín B) | convocado 9 semanas, no convocado 9; **9 PJ, 675 min** | convocado 11 semanas, no convocado 7; **11 PJ, 810 min** |

**Matiz importante sobre el encargo:** el personaje **no «nunca es convocado»** si va a entrenar: en el primer partido (semana 4: todos con 0 minutos) no lo convocan, pero con asistencia perfecta pasa por delante de los compañeros que faltan a sesiones (la asistencia de los PNJ es de 0,79–0,82 de media) y ya **antes** de la rotación juega buena parte de la liga (570 y 675 minutos). La rotación le da más partidos y minutos donde antes quedaba fuera (semilla 33: de 9 a 11 partidos, +135 minutos) y la deja igual de convocada en la semilla 31 (18 semanas), con más veces de titular (4 frente a 1) y menos de suplente (7 frente a 10): 75 minutos menos, que es ruido de las sustituciones, no de la rotación. En ambas semillas **juega alguna vez a lo largo de la liga yendo a entrenar** (11 partidos). La línea de arriba de la herramienta (primer partido: «Tu entrenador no te convoca esta semana», dentro y fuera de los entrenamientos) sigue igual, porque la rotación no puede dar minutos a quien aún no ha jugado ninguno: el factor empieza en 1 con todos a 0.

### 1.4 Tests (`tests/rotacion.test.ts`)

El dato (solo benjamín y alevín dicen `['colegio']`; `rotaElEquipo` y el servicio: colegio benjamín/alevín sí; colegio infantil/juvenil y clubes de fuera, no); `factorDeRotacion`; sin rotar la preferencia es la de siempre y con ella suben solo los que han jugado menos que la media, sin contar estadísticas de otro curso; una liga sintética de 18 jornadas (18 niños, uno de ellos mucho peor): sin rotar el peor no juega nunca, con rotar juega y nadie se queda sin minutos y el reparto es más parejo; el que lleva muchas semanas sin jugar entra antes que otro igual; y una temporada real de la ciudad de prueba: a lo sumo el 5 % de los niños de los equipos del colegio de benjamín y alevín acaba sin un minuto.

## 2. «El curso que viene» solo al terminar la temporada

- **Qué hace:** `seccionesDeLaTemporada` solo añade la sección si `temporadaTerminada(situacionDeFutbol(ctx))`. Durante la pretemporada, la liga o una parada por vacaciones en plena temporada no sale.
- **Cómo se define «termina la temporada»** (`packages/contracts/src/calendario-de-temporada.ts`, `temporadaTerminada`): el deporte está en el tramo `terminada` (su competición ha acabado —hoy `liga.cerrada`; la liga se cierra al acabar la última jornada— y todavía hay clase) o `verano` (vacaciones, que salen del calendario del país: `CalendarioPais.tramos`). Acaba con el **reparto del verano**, que llega al empezar el curso nuevo (el aviso de fin de semana que renueva la gente, ya con el reloj en el curso nuevo): desde ahí el tramo es pretemporada y la sección ya no sale. **Copa:** todavía no existe; cuando exista será un tramo entre la liga y el verano y `terminada` pasará a ser el que sigue a la copa, sin cambiar esta función (ya lo dice el comentario). **Arreglo de paso:** una liga cerrada que cae en unas vacaciones (Semana Santa) salía como «parada» («se reanuda el sábado…»); ahora es «terminada» (`situacionDeTemporada` mira `terminada` antes que las vacaciones).
- **Lo que se ve** no cambia: nombres de los que cambian de categoría y 14 niños por equipo (como ya salía).
- **Tests** (`tests/prevision-al-terminar.test.ts`): `temporadaTerminada` en pretemporada, liga, parada de Navidad, liga cerrada (también en Semana Santa) y verano; y una partida entera de la ciudad de prueba, cada dos semanas durante más de un curso: sin sección con la plantilla a la vista y la liga en marcha, con ella con la liga cerrada o en verano, sin ella con el curso nuevo.
- `npm run probar-web` ahora comprueba que **no** sale en mitad de la liga (antes comprobaba que sí). La captura `docs/relevo/reparto-equipos-2/pestana-despues.png` es de la versión anterior (la sección sí salía): la sustituye la lógica de arriba; no la he regenerado porque la sección ya no aparece en esa fecha.

## 3. Puestos de la plantilla: ¿fallo o no? **No es un fallo.**

### 3.1 Qué enseña la columna

`JugadorDeEquipoView.puesto` («el puesto en que juega en su equipo») es el puesto que le dio el club al formar la plantilla, no el que juega cada sábado: en la regla de plaza (`ofertasDePuesto`) el club le ofrece, **en el grupo de puestos que necesita** (portero, central, lateral, medio, banda, delantero), su favorito si es de ese grupo o, si no, aquel de ese grupo en que más vale. Medido (`npm run puestos-del-once -- 31,33`, 309 equipos, 5.420 jugadores): el puesto de plantilla es el mejor de su grupo en el 83 % de los casos (el resto, su favorito) y el mejor de los 16 solo en el 29 %: **no es «el mejor puesto»**, sino «el puesto en la plantilla». Por eso el título pasa de «Puesto» a **«Puesto en la plantilla»** y la sección lleva una frase debajo del título que lo explica (que el entrenador alinea con la formación y cada uno juega donde hace falta).

### 3.2 Por qué casi todos son del lado derecho

- Los puestos de los dos lados **pesan igual** (`LB`/`RB`, `LCR`/`RCR`, `LM`/`RM`, `LW`/`RW`, `LST`/`RST` tienen los mismos pesos: comprobado por test), y los empates se resuelven hacia la **izquierda** (`id` menor), no hacia la derecha. Lo único que separa los lados es **la pierna buena** (decisión del 04/11, `MOTOR_PARTIDOS.md` §3): el lado de la pierna vale +0,25 y el otro −0,25, y hay un **20 % de zurdos** (`PROPORCION_DE_ZURDOS`). Con pesos idénticos, ese ±0,25 decide siempre: el diestro se queda en el puesto derecho de su grupo y el zurdo en el izquierdo. **Resultado: 79,4 % de los puestos con lado son derechos y 20,6 % izquierdos**, igual que la población de piernas (el test lo exige dentro de ±7 puntos). En la captura, 16 con lado: 15 derechos y 1 izquierdo es el extremo de lo esperable (el 80 % de 16 son 12–13).
- Un equipo de 18 tiene 3 laterales de plantilla: con un 20 % de zurdos, el **47 % de los equipos no tiene ningún lateral izquierdo** en la plantilla (201 izquierdos frente a 692 derechos entre los laterales).

### 3.3 Y el once: no sale cojo

El entrenador alinea con la formación del equipo (`PUESTOS_DE_FUTBOL.equipos.formacion`: GK, CB×2, **LB y RB**, CDM y CM×2, **LW y RW**, ST) y reparte a los de cada grupo entre sus puestos (`repartirEnPuestos`) por lo que valen en cada uno. Medido en los 309 equipos: **el once tiene siempre los cuatro puestos de lado** (lateral izquierdo, lateral derecho, extremo izquierdo y extremo derecho: 309 de cada) y, de los 3.399 titulares, **juegan en el puesto de su plantilla el 51 %, en otro puesto de su grupo el 48 % y fuera de su grupo el 1,2 %** (equipos a los que les falta gente de un grupo). Que alguien de la plantilla «carrilero derecho» juegue de pivote o mediocentro es la formación (la formación tiene pivote y mediocentros, no carrileros ni interiores) y que un lateral derecho juegue de izquierdo cuando no hay ningún zurdo cuesta ±0,5 sobre ~10–60 de valor (el efecto de la pierna buena, nada más). Ejemplos (`puestos-del-once`, equipos A de benjamín de colegio):

```
colegio benjamin A: plantilla [RW RST RB RST RB RCR RCR GK RW LW RB GK CB RCR RST CB CB RCR]
  once: GK CB CB LB(plantilla RB) RB CDM(plantilla RCR) CM(plantilla RCR) CM(plantilla RCR) LW RW ST(plantilla RST)
colegio1 benjamin A: plantilla [LCR ST RST ST LB RM GK RB CB GK CB RB LW RCR LM RCR RCR CB]
  once: GK CB CB LB RB CDM(plantilla LCR) CM(plantilla RCR) CM(plantilla RCR) LW(plantilla LM) RW(plantilla RM) ST
```

**«Antes y después» de los once:** no he cambiado ningún reparto ni ninguna cifra de puestos (no hay fallo que arreglar), así que los once son idénticos antes y después; las cifras de arriba son las del código actual y las vigila el test.

### 3.4 Tests (`tests/puestos-de-la-plantilla.test.ts`)

Los puestos de los dos lados pesan igual; con las mismas habilidades el diestro rinde igual de mejor a la derecha que el zurdo a la izquierda (espejo, sin sesgo); el lado de los puestos de plantilla sigue a la pierna de la población (20 % ± 7); el puesto de plantilla es el mejor de su grupo en más del 75 %; el once de todos los equipos tiene sus 11 con GK, LB, RB, LW, RW, ST y 2 CB, y menos del 5 % juega fuera de su grupo; y el título de la columna y la frase de la sección.

### 3.5 Una idea que no he hecho (decisión de diseño para el usuario)

Si se prefiere que las plantillas lleguen **equilibradas por lado** (que cada club, al formarlas, busque al menos un lateral izquierdo y un extremo izquierdo aunque cueste valer algo menos), sería cambiar el reparto por grupos (`reparto`, `cuposPorGrupo`) para que algún cupo sea por lado. Hoy no hace falta para que el once salga bien (el efecto de jugar en el lado «malo» es de ±0,5), pero sí haría que la columna se vea más equilibrada y que la experiencia en cada puesto (que se gana jugando) se reparta entre lados. No la he tomado.

## 4. Verificación

- `npm run typecheck` ✅. `npm test`: 105 archivos, 1.187 tests ✅ (incluye los tres archivos nuevos). `npm run eventos:validar` ✅ (61 sucesos, 448 caminos). `npm run benjamin -- 31,33` ✅ (§1.3). `npm run probar-web` ✅ (con la comprobación nueva de que «El curso que viene» no sale a mitad de liga).
- `npm run sim:rapida`: las mismas dos ⚠️ que en la rama de partida (medida en una copia limpia): «Rendimiento» (1,44 → 1,32 ms por acción, inestable con otras cosas corriendo) y «El esfuerzo hace progresar» (atletismo +5,1 en las dos). Nada cambia por mí.
- `npm run huella -- 60`: **idénticas** las de los bots de atletismo; cambian solo las del fútbol (semillas 31 y 32: `9afe5450f55b`→`7f3c1d058412` y `b19caa6c5038`→`57c6c24e456a`), como se espera de una rotación que cambia convocatorias y minutos.

## 5. Para quien tome las decisiones (no he escrito en `DECISIONES.md`)

1. **Rotación:** peso 0,6 (`PARAMETROS_DE_CONVOCATORIA.rotacion.peso`) y la lista de categorías/club (`rotacionEn`). Subir el peso da minutos también a quien es mucho peor; bajarlo, menos rotación.
2. **Rotación fuera del colegio / en más categorías:** es poner `['colegio', 'club']` o añadir la categoría en `datos.ts`.
3. **«El curso que viene»:** aparece desde que acaba la liga hasta el reparto del verano; con copa, hasta después de la copa.
4. **Puestos:** no es un fallo; título cambiado a «Puesto en la plantilla». Opcional: plantillas equilibradas por lado (§3.5).
5. **El personaje sin entrenar** (la medida de `benjamin` de §1.3 es yendo a todos los entrenamientos): sin ir a entrenar el entrenador lo penaliza (la preferencia baja hasta un 20 %, `penalizacionPorFaltar`) y la rotación (hasta +60 %) lo compensa en parte; no lo he medido.
