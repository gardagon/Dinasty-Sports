# Relevo: motor de sucesos, lote 2 (`claude/sucesos-motor-2`)

Sesión de desarrollo (sale de `claude/youthful-clarke-vs0kye`), 22–23/11/2026. Es el **motor** que necesita el lote 2 (`docs/relevo/sucesos-lote-2.md`); el contenido lo escribe otra sesión después. No se ha creado ni cambiado ningún suceso existente, ni `DECISIONES.md`. Formato nuevo documentado en `docs/ANEXO_EVENTOS.md`.

## Qué hay (E1, E2, E4, E5, E8 y contenido duro)

| | Qué | Dónde |
|---|---|---|
| **E1** | `textos` (entrada) y `resultados` (opción, `exito`, `fallo`) al azar; variantes con `peso`. El azar es `rngEstable(semilla, suceso, día)` (con la opción para el resultado): **nunca** el generador de la partida. Sin `peso`, «gana la primera» como siempre. El texto de entrada elegido se guarda en el pendiente (`texto`) para que no cambie mientras se decide | `contracts/src/sucesos/tipos.ts`, `modules/sucesos/src/index.ts` (`elegirVariante`, `sortearTexto`, `sortearResultado`) |
| E1 validación | Cada texto/resultado de las listas se valida; `texto`+`textos` a la vez es error. `eventos:validar` y `eventos:probar` recorren cada variante y cada versión (cada texto de entrada y cada resultado sale al menos una vez por camino; el hilo sigue solo con la primera versión, para no multiplicar), en los dos géneros. Los caminos salen `[versión 2/3]`. `eventos:probar --sin-duro` | `contracts/.../catalogo.ts`, `tools/eventos/banco.ts` (`recorrer`), `tools/eventos.ts` |
| **E2** | Señales compartidas `estudios.examen_aviso` (por la mañana del día antes, una por examen; el domingo para un examen del lunes), `estudios.examen_hecho` (`asignatura`, `nombre`, `tipo`, `nota`, `presentado`) y `estudios.boletin` (`media`, `aprobado`). Tipos en `contracts/src/events.ts`; las emite `estudios` en los momentos que ya existían (DAY_START para el aviso, `examinar`, `evaluarTrimestre`). **No se ha inventado ninguna regla**: estudios ya tenía exámenes y boletín | `modules/estudios/src/index.ts`; tests en `index.test.ts` |
| **E4** | Hechos comunes `cumple_en_dias` (0 = hoy) y `es_tu_cumple`, leídos del servicio de cuerpo del personaje (`nacimiento`) | `HECHOS_COMUNES`, `hechoComun` |
| **E5** | `familia: 'patio'`: baraja. Un suceso que ya ha salido en la ronda tiene `rotacion.factorTrasSalir` (0,2) de su probabilidad **y** va detrás de los que aún no han salido al repartir el cupo (`cada` y `al`+`prob`). La ronda se reinicia al salir toda la familia (el último queda como salido) o a los `rotacion.maxDias` (120). Estado `rotacion` en el director (JSON); `alCargar` lo rellena en partidas guardadas. Son «uno detrás de otro» probabilísticos: con probabilidad < 1 un repetido puede salir si ningún otro se lleva el cupo | `anotarEnLaBaraja`, `factorDeRotacion` |
| **E8** | `npm run sim:eventos` saca, tras la tabla de siempre, el ritmo objetivo y el reparto por franja, lugar, día (lectivo / fin de semana) y persona (tipo), y personas distintas. Bot **`madrugador`** («Madruga y trasnocha») en `sim/src/bots.ts`: copia del equilibrado que sale a las 7:00, pasa por `calle_colegio` a las ~7:09 y espera allí hasta las 7:49, y de tarde/noche está en casa hasta las 23:00 (despierto: lee, tele…). Medidor en `sim/src/runner.ts` (`runBot(..., { medirRitmo: true })`, solo lectura de servicios; sin pedirlo no añade nada al resultado) | `tools/eventos/reparto.ts`, `sim/src` |
| **Duro** | `duro: ['familia'\|'burlas'\|'peleas']` en suceso, variante y opción. Opción del jugador **por categorías y con interruptor general**, **desactivada por defecto** (`CONTENIDO_DURO_POR_DEFECTO` en `contracts/src/sucesos/duro.ts`, una constante; `CATEGORIAS_DURAS`). Se ofrece en **Opciones** (junto a la presentación) y en la **pantalla de crear partida** con un mensaje breve. Con ella desactivada el director no elige el suceso, ni la variante, ni la opción. **Los PNJ no se ven afectados** (se filtra solo cuando lo vive el personaje; el director no los trataba distinto antes). La validación: la opción por defecto del plazo no puede ser dura; con todo lo duro apagado y con cada categoría apagada, ningún hilo se queda sin camino (error), y avisa de lo que solo se alcanzaba por lo duro. Llega al motor como aporte `sucesos.config` (`presentacion.duro`); no se guarda en la partida: las partidas guardadas cargan con el valor por defecto (desactivado) | `duro.ts`, `apps/web/src/presentacion.ts` |

Decisión del usuario recibida de la arquitectura (22/11) y aplicada: desactivado por defecto, categorías con interruptor general, dos sitios en la web, partidas guardadas con el valor por defecto. En `main.ts` solo se ha tocado: el import, `viewPresentacion` (se añade `viewContenidoDuro` **antes** de `viewOpcionesDeDiseno()`, que sigue ahí), un bloque en `viewNueva`, una rama del manejador `change` y la comparación de `cambiarPresentacion`. Se unió `origin/claude/youthful-clarke-vs0kye` a la rama sin conflictos.

## Para quien escriba el contenido

- Una variante con `peso` solo entra en el sorteo si **la primera que se cumple** también lo lleva; mézclalas con cuidado: pon `peso` en todas las del sorteo y una final sin peso (o `si: []`) fuera de él.
- `eventos:probar` ya enseña todas las versiones; `eventos:validar` las recorre (462 caminos hoy: no hay contenido nuevo).
- `{señal.x}` en los textos de `estudios.*`: hace falta `ejemploDeSeñal` como siempre. El aviso de examen sale una vez por examen (varios el mismo día = varias señales; un suceso suelto con `repite` por defecto solo sale una vez al día).
- **Propuesta**: ningún suceso existente lleva `familia`. Para medir la rotación, los candidatos naturales son los de `modules/eventos/src/colegio/patio.ts` (`familia: 'patio'`) y los de `aula.ts` (`'aula'`). No lo he tocado.
- Aviso de diseño: el texto/ejemplo de un suceso duro nunca debería ser necesario para entender el hilo (si se quita lo duro, el resto debe tener sentido).

## Huella (`npm run huella -- 60`)

Antes y después: **idénticas** en todos los bots y en el fútbol, **salvo `vago` semilla 2** (`1463 a1300f5c1d01` → `1459 bbb8e864cb69`) y las dos líneas nuevas del bot `madrugador`. Causa comprobada: no es el juego sino el orden. `huella` corre todos los bots en un mismo proceso y el bot nuevo va **antes** que `vago`; ejecutando el mismo script sin `madrugador`, `vago` 2 da exactamente `1463 a1300f5c1d01`. O sea, **hay estado compartido entre partidas dentro de un proceso** (preexistente; no lo he buscado) que hace que el resultado de una dependa de lo que se ha jugado antes. Lo dejo anotado como hallazgo; las partidas con un suceso nuevo y las opciones nuevas por defecto no cambian.

## Medidas: `npm run sim:eventos -- 180 2` (8 bots × 2 semillas × 180 días)

Sin contenido nuevo (63 sucesos, 30 sin salir nunca) el ritmo sigue siendo el de antes (2,6 por semana de media; el objetivo es 6). Lo útil es que ya se mide: **el 61 % de los días de clase no tiene ningún evento** (objetivo ≤ 35 %), solo 0,5 por semana ocurren fuera del aula y del patio, 0,3 en casa o en fin de semana, y el 19 % de las semanas no tienen ningún evento con decisión. El bot `madrugador` confirma el hueco: «antes de clase (7:00–8:10)» y «noche» tienen 0,1–0,2 y ~0 eventos por semana **aunque el bot esté allí**: no hay sucesos para esas franjas (lo que escribirá el lote 2).

## Reparto de los eventos (media de 2 semillas × 180 días)

### Ritmo objetivo

| Cifra | Objetivo | equilibrado | madrugador | empollon | atleta | sobreentrena | vago | abandono | aleatorio | todos | |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Eventos por semana (media) | 6 (entre 4 y 9) | 2.9 | 2.9 | 2.4 | 2.7 | 2.9 | 1.9 | 2.4 | 2.4 | 2.6 | ⚠️ |
| % de semanas con menos de 4 | — | 66.0 % | 68.0 % | 70.0 % | 76.0 % | 66.0 % | 86.0 % | 82.0 % | 78.0 % | 74.0 % | |
| % de semanas con más de 9 | 0 | 0.0 % | 0.0 % | 0.0 % | 2.0 % | 2.0 % | 0.0 % | 2.0 % | 0.0 % | 0.8 % | ⚠️ |
| % de días de clase sin ningún evento | ≤ 35 % | 55.8 % | 57.1 % | 61.3 % | 59.2 % | 58.8 % | 69.2 % | 61.3 % | 62.5 % | 60.6 % | ⚠️ |
| Fuera del aula y del patio, por semana | ≥ 1 | 0.7 | 0.7 | 0.3 | 0.6 | 0.6 | 0.3 | 0.3 | 0.5 | 0.5 | ⚠️ |
| En casa o en fin de semana, por semana | ≥ 1 | 0.3 | 0.3 | 0.3 | 0.2 | 0.3 | 0.3 | 0.1 | 0.5 | 0.3 | ⚠️ |
|    de ellos, en casa | — | 0.3 | 0.3 | 0.3 | 0.2 | 0.2 | 0.3 | 0.1 | 0.4 | 0.3 | ✅ |
|    de ellos, en fin de semana | — | 0.1 | 0.1 | 0.0 | 0.1 | 0.1 | 0.1 | 0.0 | 0.2 | 0.1 | ✅ |
| % de semanas sin ningún evento que se decide | 0 | 12.0 % | 10.0 % | 28.0 % | 14.0 % | 22.0 % | 28.0 % | 22.0 % | 16.0 % | 19.0 % | ⚠️ |

_La última columna es el veredicto sobre la media de todos los bots._

### Por franja horaria (eventos por semana)

| franja | equilibrado | madrugador | empollon | atleta | sobreentrena | vago | abandono | aleatorio | todos |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| madrugada (0:00–7:00) | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| antes de clase (7:00–8:10) | 0.2 | 0.2 | 0.2 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 |
| clases de la mañana (8:10–10:40) | 0.7 | 0.7 | 0.7 | 0.7 | 0.7 | 1.1 | 0.7 | 1.0 | 0.8 |
| recreo (10:40–11:20) | 1.1 | 1.0 | 1.0 | 1.0 | 1.1 | 0.2 | 0.9 | 0.3 | 0.8 |
| clases tras el recreo (11:20–14:00) | 0.4 | 0.5 | 0.4 | 0.5 | 0.5 | 0.4 | 0.5 | 0.6 | 0.5 |
| mediodía (14:00–17:00) | 0.1 | 0.0 | 0.0 | 0.0 | 0.1 | 0.0 | 0.0 | 0.1 | 0.0 |
| tarde (17:00–20:00) | 0.4 | 0.5 | 0.1 | 0.4 | 0.3 | 0.1 | 0.2 | 0.2 | 0.3 |
| noche (20:00–24:00) | 0.0 | 0.0 | 0.0 | 0.0 | 0.1 | 0.0 | 0.0 | 0.1 | 0.0 |

### Por lugar (eventos por semana)

| lugar | equilibrado | madrugador | empollon | atleta | sobreentrena | vago | abandono | aleatorio | todos |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| aula | 1.1 | 1.1 | 1.1 | 1.1 | 1.1 | 1.4 | 1.1 | 1.6 | 1.2 |
| patio | 1.1 | 1.0 | 1.0 | 1.0 | 1.1 | 0.2 | 0.9 | 0.3 | 0.8 |
| casa | 0.3 | 0.3 | 0.3 | 0.2 | 0.2 | 0.3 | 0.1 | 0.4 | 0.3 |
| pista_colegio | 0.3 | 0.3 | 0.0 | 0.4 | 0.3 | 0.0 | 0.1 | 0.0 | 0.2 |
| parque | 0.0 | 0.0 | 0.0 | 0.0 | 0.1 | 0.0 | 0.0 | 0.1 | 0.0 |
| gimnasio | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| calle_casa | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| avenida_parque | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| sala_profesores | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |

### Por día de la semana (eventos por semana)

| día | equilibrado | madrugador | empollon | atleta | sobreentrena | vago | abandono | aleatorio | todos |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| lunes | 1.0 | 0.9 | 0.6 | 0.9 | 1.0 | 0.4 | 0.7 | 0.5 | 0.7 |
| martes | 0.5 | 0.6 | 0.6 | 0.5 | 0.6 | 0.4 | 0.5 | 0.5 | 0.5 |
| miércoles | 0.5 | 0.5 | 0.4 | 0.4 | 0.5 | 0.4 | 0.4 | 0.4 | 0.4 |
| jueves | 0.4 | 0.4 | 0.3 | 0.4 | 0.4 | 0.4 | 0.3 | 0.4 | 0.4 |
| viernes | 0.4 | 0.5 | 0.4 | 0.4 | 0.4 | 0.3 | 0.4 | 0.5 | 0.4 |
| sábado | 0.1 | 0.1 | 0.0 | 0.0 | 0.1 | 0.1 | 0.0 | 0.1 | 0.1 |
| domingo | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |

### Lectivo o fin de semana (eventos por semana)

| Día | equilibrado | madrugador | empollon | atleta | sobreentrena | vago | abandono | aleatorio | todos |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| día de clase (lunes a viernes) | 2.8 | 2.8 | 2.4 | 2.7 | 2.8 | 1.8 | 2.3 | 2.3 | 2.5 |
| fin de semana | 0.1 | 0.1 | 0.0 | 0.1 | 0.1 | 0.1 | 0.0 | 0.2 | 0.1 |

### Por persona (tipo) (eventos por semana)

| persona | equilibrado | madrugador | empollon | atleta | sobreentrena | vago | abandono | aleatorio | todos |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| companero | 1.3 | 1.3 | 1.2 | 1.3 | 1.2 | 0.5 | 1.1 | 0.6 | 1.1 |
| profesor | 0.4 | 0.4 | 0.4 | 0.4 | 0.4 | 0.9 | 0.4 | 1.0 | 0.5 |
| familia | 0.2 | 0.2 | 0.2 | 0.1 | 0.2 | 0.3 | 0.1 | 0.4 | 0.2 |
| entrenador | 0.3 | 0.3 | 0.0 | 0.3 | 0.3 | 0.0 | 0.1 | 0.0 | 0.2 |


Personas distintas con las que le pasa algo en la partida (media por bot): equilibrado 29.0 · madrugador 30.0 · empollon 25.5 · atleta 27.5 · sobreentrena 30.0 · vago 16.0 · abandono 26.0 · aleatorio 17.5 · todos 25.2.

_Eventos totales de todos los bots: 1059 en 411.4 semanas de juego._


## Comprobaciones

- `npm run typecheck`: ✅. `npm run eventos:validar`: ✅ (63 sucesos, 462 caminos, los mismos 6 avisos de marcas). `npm run eventos:mapa`: ✅ (sin cambios). `npm run probar-web`: ✅ (todo el camino en Chromium). `npm run huella -- 60`: ver arriba.
- Tests nuevos: `modules/estudios` (señales de exámenes y boletín), `modules/sucesos/src/motor2.test.ts` (textos, variantes con peso, resultados forzados, duro por suceso/variante/opción/categoría, cumpleaños, rotación y `alCargar`), `tests/eventos-versiones.test.ts` (la herramienta enseña cada versión y lo que queda sin duro), `apps/web/src/presentacion.test.ts` (duro por defecto, guardado y llegada al motor).
- `npm test` completo: ver la última línea de este documento.

## Pendiente / dudas (nada decidido por mí)

1. Estado compartido entre partidas en un mismo proceso (arriba): conviene encontrarlo (afecta a `huella` y quizá a la reproducibilidad).
2. `sim`/`sim:rapida` ahora incluyen al bot `madrugador` (8 bots): las tablas y los chequeos de `npm run sim` lo cuentan como uno más; no he cambiado umbrales. Si se prefiere que la comparación de siempre use los 7, se puede marcar el bot como aparte.
3. Los chequeos de ritmo objetivo (media 6, ≤ 35 % de días sin evento…) se muestran en `sim:eventos`, pero **no** se han añadido a `sim/src/analysis.ts` (saldrían ⚠️ hasta que haya contenido).
