# Relevo: sucesos en clase (rama `claude/sucesos-en-clase`)

Encargo de la sesión de arquitectura, observado por el usuario jugando: (1) lo que pasa durante otra cosa no debe gastar minutos; (2) no ofrecer «decidir luego» cuando la respuesta es inmediata. No se ha tocado `DECISIONES.md` (la entrada de diseño la escribe la arquitectura).

## Qué se hizo

**Regla 1 — `durante`** (formato, no suceso a suceso):
- `SucesoDef.durante?: boolean` y `ConfigDeSucesos.durante` (señales que pasan dentro de una actividad: `clase.asistida`, `club.sesion_tarde`, `club.impuntual`, `club.prueba_empieza`). `sucesoEsDurante` en `contracts/src/sucesos/tipos.ts`.
- Un suceso `durante`: sus opciones valen **0 minutos** (`duration: 0` de la acción y `minutos: 0` en `SucesoPendiente`) y escribir `minutos` en ellas es un error de validación (`durante: false` para lo que sea una actividad aparte).
- Para poder tener una acción de 0 minutos hubo que tocar el motor: `packages/core/src/game.ts` solo sube a 1 minuto lo que declara `duration > 0` (antes `Math.max(1, …)` para todo). Nada más cambia.

**Regla 2 — `urgencia` con tres valores** (`ahora` por defecto, `aplazable`, `pendiente`):
- `ahora`: se responde en el momento. La ventana no se cierra sin responder (la web ya no enseña «Decidir luego»; dice que hay que responder) y, si el jugador hace **otra acción** sin responder, «el momento pasó»: se aplica la opción por defecto del `plazo` (`pasarElMomento` en `modules/sucesos`). Decidir otro suceso no cuenta, y lo recién abierto en la misma acción sigue ahí.
- `aplazable`: ventana con «Decidir luego»; queda en «Pendiente» hasta que venza el plazo (como antes). `pendiente`: directo a la lista (como antes).
- `SucesoPendiente.aplazable` (contracts) para que la interfaz sepa si ofrece aplazar. Web: solo `viewSuceso` (botón y mensaje) y no apuntar en la agenda lo de 0 minutos.
- Validación: `aplazable`/`pendiente` es error en lo `durante`, en un reparto con `presente: true` o con `presente` en `cuando`.
- Para saber qué «acción» abrió cada pendiente: `ReadContext.actionCount` (contracts + core) y `Pendiente.desde` en el estado de sucesos. En core, `actionCount++` pasa de después de `run` a antes de empezar la acción (solo lo leía el informe de la simulación).

## Clasificación de todos los sucesos con opciones

**Durante (0 minutos, sin aplazar; antes con «Decidir luego» y algunos con minutos):**
| Suceso | Antes | Ahora |
|---|---|---|
| `eventos.colegio.pregunta_del_profesor`, `companero_pide_ayuda`, `nota_por_la_clase`, `cabeceo_en_clase`, `profesor_se_equivoca`, `trabajo_en_grupo` | 1 min, aplazable | 0 min, `ahora` |
| `eventos.estudios.primer_dia_de_educacion_fisica` | «preguntar» 5 min, aplazable | 0 min, `ahora` |
| `eventos.estudios.tarde_a_clase` | 1 min, aplazable | 0 min, `ahora` |
| `futbol.primer_entrenamiento` (`durante: true`, sale con `accion.realizada`) | «preguntar» 5 min (3 variantes), aplazable | 0 min, `ahora` |
| `futbol.tarde_al_entrenamiento`, `atletismo.tarde_al_entrenamiento`, `futbol.tarde_a_la_convocatoria` | 1 min, aplazable | 0 min, `ahora` |
| `futbol.prueba_de_acceso` (kit: `sucesoDePruebaDeAcceso`) | todas las opciones 5 min, aplazable | 0 min, `ahora` |

**Actividad aparte (siguen gastando sus minutos), y no aplazables por pasar en presencia de alguien o en el momento (`ahora`):**
patio (`balon_perdido`, `juego_nuevo` 15 min, `pique_en_el_patio`, `cambio_de_cromos`, `solo_en_el_patio` 5–10 min, `merienda_del_recreo`), camino (`companero_de_camino` 4 min, `se_hace_tarde`), barrio (`perro_suelto`, `musico_en_la_avenida`), casa (`ayudar_con_la_cena` 10 min, `hermano_quiere_jugar` 20 min, `noche_sin_sueno` 20 min: nadie a quien dejarle la respuesta), `eventos.cuerpo.bajito`, `eventos.familia.faltas.charla` (tu madre/padre delante, 5–10 min), `eventos.relaciones.cumple.invitacion` y `reproche` (te lo dicen a la cara), `eventos.perks.pulmones.propuesta` (el entrenador).

**Siguen aplazables (cambian de nombre, no de comportamiento):**
- `eventos.relaciones.cumple.fiesta`: `pendiente` (ya lo era; 120 min).
- `futbol.plaza_extra` y `futbol.equipo_sin_ninos` (kit-deporte, `puestos.ts`): pasan de `ahora` a `aplazable`; son avisos del club al cambiar de temporada, con 3 días de plazo; conservan «Decidir luego».

Sin opciones (no afectan): los avisos y detalles en línea.

## Comprobaciones

- `npm run eventos:validar`: ✅ (448 caminos recorridos). `npm run eventos:mapa`: sin cambios en `MAPA.md`.
- Tests nuevos: `modules/sucesos/src/index.test.ts` (0 minutos con `durante`, `durante: false`, pasar el momento, decidir no lo pierde, aplazable sobrevive y vence, validación) y `tests/eventos-primeros.test.ts` (partida real: el evento de Educación física con 0 minutos y no aplazable; todo el catálogo: qué es durante y que solo se aplazan `cumple.fiesta`, `plaza_extra` y `equipo_sin_ninos`).
- `npm run sim:eventos -- 180 2`: el ritmo casi no cambia: **2,5 → 2,6 eventos por semana de media** (atleta 3,0 → 2,9; aleatorio 2,4 → 2,6; el resto igual). Es azar por minuto del día: quitar los minutos de lo que pasa en clase desplaza un poco las horas de las acciones siguientes, y las tiradas de los sucesos de «al llegar» dependen del minuto. Los mismos 32 de 61 sin salir.
- Resultados de `npm test`, `typecheck`, `benjamin` y `probar-web`: al final de este archivo.

## Ideas / decisiones de diseño que no he tomado

1. **Patio, casa y camino**: sus opciones sin `minutos` valen 1 por defecto («Cambiar cromos», «Devolver el balón»). Como el recreo es una actividad, se podría decidir que `lugares.llegada` con `hasta: patio` también es «durante» (0 min en lo corto y los minutos en lo largo). Lo he dejado como actividad aparte.
2. **Qué hace «pasar el momento»**: aplica la opción por defecto del `plazo`. Para varios sucesos esa opción es la más pasiva («callar»), lo razonable. Los bots y la simulación resuelven siempre con `decidirSucesos` antes de otra acción, así que no cambian.
3. **El motor no bloquea**: la regla solo impide aplazar (web) y pierde el momento si pasas a otra acción; no hay acciones «bloqueadas» mientras hay una pregunta abierta. Si se quisiera bloquear en el motor, es un `available` en las acciones de fuera.
4. `ReadContext.actionCount` es nuevo en contracts/core (pequeño); aviso porque no era de `modules/sucesos`.
