# Relevo: moverse con el grupo (rama `claude/moverse-con-el-grupo`)

Encargo de la sesión de arquitectura (decidido por el usuario, DECISIONES 21/11 «Deberes, acciones que pisan otra y moverse con el grupo»): si estás con gente y se va en bloque, que salga «Todos se van al patio, ¿les acompañas?»; si dices que sí, vas con ellos como un viaje rápido que consume esos minutos. No se ha tocado `DECISIONES.md`.

## Qué se hizo

- **La señal** `presencia.grupo_se_va` (`SHARED_EVENTS.GRUPO_SE_VA`, `GrupoSeVaData`, contracts). La emite **`npcs`** (dueño de la presencia) en un handler de `accion.realizada` (`modules/npcs/src/index.ts` + `modules/npcs/src/grupo.ts`). Compara la presencia al empezar y al acabar la acción **solo si ha cambiado el intervalo entre dos cambios de tramo** (si no, vuelve sin hacer nada). Las reglas y cifras están en `docs/ANEXO_HORARIOS_PNJ.md` («Moverse con el grupo») y en `MOVERSE_CON_EL_GRUPO` (`contracts/src/agendas.ts`): sigues donde estabas, se ha ido al menos la mitad de los 34–46 que tenías cerca, y un mismo sitio del mapa recibe a 3 o más y a la mitad o más de los que se pueden seguir.
- **El suceso** `eventos.grupo.se_van` (`modules/eventos/src/grupo/se_van.ts`): `urgencia: 'ahora'` (sin aplazar; si haces otra cosa sin responder, te quedas), opciones «Ir con ellos» y «Quedarte aquí». «Ir con ellos» emite `lugares.ir_a` con el destino de la señal y gasta los `minutos` de la señal (el viaje rápido del mapa). No hay sitios ni horas en el código: sale igual en el recreo, a la salida de clase, en el entrenamiento y en lo que ponga un deporte.
- **Formato de sucesos**: `OpcionDef.minutos` admite `{ deLaSeñal: 'dato' }` (los minutos que traiga la señal que disparó el suceso; 1 si no hay dato; la validación pide un suceso con `al`). `minutosDe` en `modules/sucesos`. Documentado en `ANEXO_EVENTOS.md` («Opciones» y «Moverse con el grupo»).
- **Cómo se dice el sitio**: `haciaLugar(nombre)` y `deLugar(nombre)` (contracts, `lugares.ts`) ponen el artículo por una regla de la lengua («al patio», «a la biblioteca», «a tu aula»); si estás en una zona y van a la entrada de su lugar sale «a la entrada del colegio».
- Refactor pequeño en `npcs`: `agendasDePresencia(ctx, t)` (lo que antes estaba dentro del servicio de presencia, ahora reutilizable para mirar cualquier momento) y `compararCercania` (el orden de a quién se ve primero, que antes estaba suelto en `indiceDePresencia`). El servicio `presencia` se comporta igual.

## Decisiones de diseño que tomé (para que la arquitectura las confirme o cambie)

1. **Quien sale del mapa no se acompaña.** La gente que se va «fuera» (casa, su aula de otro curso) no es un destino: no se sabe a dónde va. Por eso la salida de las 14:30 a casa no se pregunta; lo que sí se pregunta es **la salida del aula a la entrada a las 14:00**, que es cuando el grupo se va de verdad en bloque (el reparto de 14:00 a 14:30 es un goteo que no es un «todos se van»).
2. **«Los que tienes cerca» = la gente que ves** (`aforoCercano`, los conocidos primero), no toda la población del sitio: en el patio hay unos 500 y la mayoría son desconocidos de otras clases. Los que desaparecen del mapa cuentan como que se han ido, pero el grupo se mide entre los que se pueden seguir. Consecuencia buscada: los primeros días, sin conocer a nadie, al acabar el recreo no sale nada (nadie con quien ir); con 2 o más compañeros conocidos sí.
3. **Mínimo 3 personas** en el mismo sitio. Probé con 2: sale mucho más (ver cifras) porque cualquier par de conocidos que cambia de sitio dispara el aviso. Consecuencia: con solo 2 compañeros conocidos no sale al acabar el recreo; hace falta conocer a 3 o más.
4. **Una pregunta por cambio de sitio del grupo**, sin enfriamiento: si te quedas en el aula, cada día vuelve a salir al recreo y a la salida de clase (son dos al día, solo si estás con ellos en ese momento). Si parece mucho, el botón está en `MOVERSE_CON_EL_GRUPO` y, si hace falta, un enfriamiento con una marca (`repite: { espera }` por destino) es trivial.
5. **«Decidir luego» no existe aquí** (es `ahora`), y «Quedarte aquí» cuesta 1 minuto como cualquier decisión de `ahora`.

## Cifras (`npm run sim:eventos -- 180 2`)

Media de 2 semillas × 180 días, eventos por semana (antes de este cambio: 2,6 de media):

| Mínimo | `grupo.se_van` por año (media de bots) | Eventos por semana (total) |
|---|---|---|
| 3 (el que queda) | 223 (≈ 4,3 por semana; equilibra 422 ≈ 8 por semana, el bot siempre está en el aula en cada cambio) | 7,0 |
| 2 | 592 (≈ 11 por semana) | 14,1 |

Sigue siendo mucho más que el resto de eventos: **decisión pendiente de la arquitectura** (dejarlo, o poner un enfriamiento / limitarlo al recreo y a la salida).

## Para quien toque lo de al lado

- **(Ya enganchado, ver «Tercera tanda» más abajo.)** Antes de engancharlo: mi detección compara el momento en que empieza la acción con el momento en que acaba y mira si ha cambiado el intervalo de presencia, así que funciona igual si la acción se recorta: si la acción acaba **en el minuto en que se va el grupo o después**, el aviso sale al terminarla (si acaba un minuto antes, sale con la siguiente acción que cruce el cambio). El camino hasta el grupo (los `minutos` de la señal, p. ej. 4 de aula a patio) se consume porque es la duración de la decisión «Ir con ellos». Al subir esa rama no hace falta tocar nada de esto salvo que cambie el tag `desplazamiento` / `decision` (los miro para no preguntar dos veces seguidas).
- **Sesiones de fútbol y PNJ (`modules/npcs`, `packages/kit-deporte`):** `modules/npcs/src/index.ts` tiene dos cambios pequeños que pueden dar conflicto al fusionar: el handler `on[CORE_EVENTS.ACTION_DONE]` al principio de `on:` y `agendasDePresencia`/`compararCercania` (movidos, no cambiados). El resto va en `grupo.ts` y `grupo.test.ts`. Los equipos que van del campo al vestuario o del vestuario al campo en el día de partido pueden disparar el aviso («Todos se van al campo de fútbol…»): es lo pedido; si no se quiere mientras el personaje tiene su propio flujo de partido, bastaría una condición en `cuando` del suceso (p. ej. que no sea día de partido del personaje).
- Los bots deciden la pregunta con `decidirSucesos` según su carácter (sociabilidad): unos irán con el grupo y otros no. **Las huellas de los bots cambian** (`npm run huella`) porque ahora hay una decisión más y viajes que antes no había.

## Segunda tanda: decisiones del usuario (mensaje de la arquitectura)

1. **Preferencia en Opciones** «Cuando se va el grupo con el que estás»: Preguntarme (defecto) / Ir siempre con ellos / Quedarme. Es del navegador (`presentacion.ts`: `cuandoSeVaElGrupo`, `respuestaAlGrupo`, `MODOS_DEL_GRUPO`; `main.ts`: `realizar` responde «ir» tras la acción y `viewSuceso` no enseña el aviso). «Quedarme» no gasta tiempo (no se responde; el momento pasa). Con «ir siempre» cuesta los minutos del camino.
2. **Solo dentro del mismo lugar**: `grupoQueSeVa` recibe `sePuedeIr` y `npcs` lo define con el lugar raíz (siguiendo `dentroDe`): colegio y sus zonas, estadio, complejo... Lo demás cuenta como salir del mapa.
3. **No cuenta como suceso**: `SucesoDef.fueraDelRitmo` (contracts); `sim/src/runner.ts` lo deja fuera de `cuentaDeSucesos`, así que `sim:eventos` y el chequeo de ritmo no lo suman. Como sale con una señal no gasta cupo (ya era así).
4. **«Me voy»**: `seVanSolos` (`grupo.ts`): de los **conocidos** entre los que tienes cerca, los que se van aparte del grupo, como mucho 2 por acción. Sale como línea de lo que pasa (`ctx.log(…, 'info')`): «Lucía: «Me voy a tu aula.»» o «Me voy.» si se va fuera del mapa. Elegí la línea y no el diario porque el diario guarda hechos importantes y esto pasa varias veces al día; así solo se ve en el resultado de la acción.

## Tercera tanda: enganchado a las acciones cortas

Con la rama `deberes-y-acciones-cortas` ya unida (`GameModule.obligaciones`, `ActionDef.cortable`, el corte en `Game.evaluate`):
- **`npcs` declara una obligación** (`obligaciones` en `modules/npcs/src/index.ts`): mira, con **los mismos cercanos que el aviso** (`presencia.en(aqui, aforoCercano(…))` con la misma clave), los próximos cambios de tramo (hasta `MOVERSE_CON_EL_GRUPO.mirarMinutos` = 120 minutos) y, si en alguno se va el grupo (`elGrupoSeVa`, la misma función que usa el aviso), devuelve `{ hasta: ese minuto, texto: 'se va el grupo al patio a las 10:40' }`. Las acciones `cortable` (charlar, esperar, estudiar, descansar…) duran solo hasta ese momento, con su efecto en proporción, y al acabar sale el aviso (la acción acaba exactamente en el minuto del cambio, que es cuando mi detección ya ve el intervalo nuevo). `hasta` no resta el viaje: ese camino se consume al decir que sí.
- Refactor en `npcs`: `elGrupoSeVa` y `haciaTextoDe` son compartidos por el aviso y la obligación (antes estaba todo dentro del handler).
- **«Me voy» solo en acciones de hasta 30 minutos** (`despedidaHasta`): una acción larga (descansar, estudiar en casa) llenaba el registro de «Hermano: Me voy» cada mañana y desplazaba líneas que un test de calendario busca (`Parcial 1: nota media`); además, en una acción larga no estás pendiente de quién se va.
- Test: `tests/moverse-con-el-grupo.test.ts` («con la rama de acciones cortas…»: una acción larga se corta a las 11:10 con el texto de la obligación y luego sale «Todos se van a tu aula»).
- Cifras de la segunda tanda (`sim:eventos -- 180 2`, antes de unir acciones cortas): **2,7 eventos por semana de media** (el aviso del grupo no cuenta: `fueraDelRitmo`; antes 7,0). `eventos:validar`, `benjamin` y `probar-web` en verde; `npm test` 1223/1224 (el fallo era el del registro lleno de «Me voy», arreglado).

## Resultado final y rendimiento

- **Verde, con todo unido (incluida la rama de acciones cortas):** `typecheck`, `eventos:validar` (452 caminos), `benjamin -- 31,33` (sin cambios), `probar-web`, `npm test` **109 archivos, 1234 tests**.
- **Ritmo:** `sim:eventos -- 180 2` = **2,7 eventos por semana** de media (antes de este trabajo, 2,6; el aviso del grupo no cuenta, `fueraDelRitmo`).
- **Coste (`npm run rendimiento -- 60`, bot equilibrado):** sin el grupo 1,19 ms por acción; con él, primero 1,86 y tras optimizar **1,36** (+14 %). Dos tests de `npcs` (`index.test.ts`: el cambio de curso y los hermanos) se pasaban de tiempo con la primera versión; ahora pasan. Optimizaciones: `agendasDePresencia` se recuerda por lista y minuto, y el aviso reutiliza el índice de presencia ya calculado en lugar de recorrer toda la población. Si hiciera falta más: la obligación (`obligaciones`) se recalcula en cada previsión de una acción cortable (la caché del núcleo ya la limita por minuto y estado).
- Las huellas de los bots cambian (hay una decisión más y viajes nuevos).
