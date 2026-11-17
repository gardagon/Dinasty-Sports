# Relevo: fallos de PNJ que encontró el usuario (17/11/2026)

Rama `claude/pnj-fallos-1` (sale de `claude/youthful-clarke-vs0kye`). Test que los reproduce: `tests/pnj-fallos-1.test.ts` (y `apps/web/src/gente.test.ts` para el 2).

## 1. «Del equipo de atletismo del colegio» y a la vez «Club: Real Ciudad C. F.»

- **¿Está permitido?** No. El modelo guarda un solo `Npc.deporte` por persona y el reclutamiento solo mira a quien tiene `deporte === undefined` (`aspirantesDeEdad`, `modules/npcs/src/plantillas.ts`). No hay ninguna decisión en `DECISIONES.md` ni en los anexos que permita a un PNJ estar en dos equipos. (La frase del anexo de horarios «otros días que el atletismo del colegio para poder hacer los dos» habla del personaje.)
- **Causa:** no estaba en dos deportes a la vez. Alexandra estuvo en el equipo del colegio de atletismo, salió (draft, sustituciones) y fichó por un club de fútbol. `reclutarA` añade a la descripción «Del equipo de X del colegio.» y `sinDeporte` quitaba el deporte, el club y la etiqueta `equipo`, pero **no esa frase**. Se veía un texto de equipo con el nivel y el club de otro deporte.
- **Arreglo:** `sinDeporte` quita del final de la descripción la frase `descripcionDelEquipo` del deporte que deja. Vale para cualquier deporte.
- **Huella** (`npm run huella -- 60`): los bots, idénticos. En las dos partidas con fútbol cambian los dos hashes porque hashean todo el estado de `npcs` y las descripciones cambian. Con el mismo hash sin el campo `description`, antes y después **salen igual**: no cambia ni un nivel, equipo ni puesto.
- **Partidas guardadas:** las que ya tienen la frase vieja la conservan hasta que esa persona vuelva a cambiar de equipo. No he subido la versión de guardado. Si importa, hay que limpiarlo en la migración.

## 2. «Nivel: futbol 15»

- **Causa:** `apps/web/src/gente.ts` (ficha) y `apps/web/src/main.ts` (lista de «Relaciones», pruebas) pintaban `Object.entries(n.levels)` con la clave, que es el id del deporte.
- **Arreglo:** `textoDeNiveles(g, levels)` en `gente.ts` usa el nombre del módulo (`g.registry.moduleNames`; el id del módulo del deporte es el del deporte) y cae al id si no lo encuentra. Sale «Fútbol 15». Toco `apps/web` solo en esas dos líneas y el `import`.

## 3. Niños del parque: se conocen, pero no se puede charlar

- **Reproducción:** sábado por la tarde en el parque hay ~150 niños con rol `vecino`. Se conoce a uno (preguntar el nombre o «Jugar con otros niños») y `relaciones.charlar.<id>` no existe.
- **Causa:** `accionesDe` (`modules/relaciones/src/index.ts`) solo reparte acciones a compañero, amigo, familia, autoridad y rival; para `vecino` devuelve `[]`. Los compañeros de otros cursos y los rivales sí podían charlar (los rivales, solo los 5 más marcados).
- **Arreglo:** los vecinos conocidos menores de 18 años tienen «Charlar un rato» con las mismas cifras que un compañero (ANEXO_RELACIONES §2, actualizado). No he tocado ni cifras ni horarios (`agendas.ts` sin cambios): el horario de la charla es el de siempre (8–22, fuera de clase).
- **Test:** la charla con un vecino conocido existe y está disponible; tras «Jugar con otros niños» se puede charlar con los que se han conocido; con un vecino adulto no hay acción (ver dudas).

## 4. A las 14:00 todos se van del colegio a la vez (encargo añadido por la arquitectura)

- **Causa:** el tramo de cada alumno acababa a las 14:00 en punto (`colegio()` en `packages/contracts/src/agendas.ts`) y no había nada hasta las 15:00 (fuera, 100 %). Dentro de un tramo todos están en su sitio y al acabarlo todos desaparecen. Los hermanos en edad escolar usan el mismo tramo. Los profesores siguen en tutorías hasta las 17:00.
- **Arreglo:** la salida se reparte de 14:00 a 14:30 en 6 pasos de 5 minutos. Cada alumno tiene una hora de salida fija ese día y, mientras no se va, está en la entrada del colegio (70 %) o en el patio (30 %), donde se le puede hablar. Para que nadie vuelva ni cambie de sitio entre pasos, `TramoDeAgenda` gana el campo opcional `grupoDeAzar`: los tramos con el mismo grupo comparten el azar de cada persona (si va y a qué sitio). Es el único cambio del motor de agendas.
- **Cifras provisionales** (`SALIDA_DEL_COLEGIO`): 30 minutos de salida, pasos de 5, 70 % entrada / 30 % patio. Siguen a las 14:00–14:05 el 86 % de los alumnos, y luego 71, 57, 43, 29 y 14 %. Anexo actualizado.
- **Test:** `tests/pnj-fallos-1.test.ts` (salida): antes de las 14:00 solo se ve a tu clase; a las 14:05, más de 300 personas; baja en cada paso, nadie que se ha ido vuelve, y a las 14:31 no queda ninguno.
- **Huella (`npm run huella -- 60`):** los bots equilibrado, vago y aleatorio cambian (acciones 2414→2419, 1487→1485, 2724→2732, 2612→2707); atleta, empollón, abandono y el mundo con fútbol, idénticos. Es lo esperado: entre las 14:00 y las 14:30 hay gente en la entrada y el patio que antes no estaba, y los bots que charlan con quien tienen cerca eligen a otras personas. Ningún nivel ni equipo cambia en el mundo con fútbol.
- **Rendimiento (`npm run rendimiento -- 60`):** sin diferencia apreciable (ms por acción 1,75 → 1,76; crear la partida y el estado, dentro del ruido de medida). Hay 6 cambios de tramo más por día lectivo en el índice de presencia.
- **Los padres: no lo he hecho.** No existen como personas: los únicos padres son los del personaje (`progenitor`), que no van al colegio. Los niños de otros colegios y los vecinos adultos comparten el tipo `vecino` y no se distinguen por edad en la agenda. Opciones para «padres que recogen»: (a) un campo nuevo en el tipo `vecino` (p. ej. `recoge: true`) asignado al ~15 % de los vecinos adultos al generarlos, con llegada entre 13:45 y 14:00 y salida entre 14:05 y 14:30 a la entrada del colegio (cambia la generación y la huella); (b) que los padres del personaje aparezcan a veces a la entrada (cambia la vida familiar). Recomiendo (a).
- **Hallazgo aparte:** los niños de otros colegios (`nino_*`, rol `vecino`) usan la agenda de un vecino adulto: en un día lectivo a las 11:00 también pueden estar en el parque, aunque «van a otro colegio». Convendría darles su propio tramo escolar. No lo he tocado.

## Dudas para la arquitectura (no las he decidido)

1. **¿Qué más se puede hacer con un niño del barrio?** Solo he dado «charlar» (lo que pidió el usuario). Quedar, ayudar, detalle, planes, discutir y paces siguen sin existir para los vecinos. Opciones: (a) dejarlo así; (b) darles todo el catálogo de amistad como a un compañero; (c) que pasen a ser `amigo` al llegar a cierto estado y entonces tengan todo. Mi recomendación: (c), porque encaja con «las mismas reglas para todos».
2. **Vecinos adultos conocidos:** no tienen ninguna acción (solo se les puede preguntar). ¿Se les permite charlar?
3. **Rivales:** solo tienen acciones los 5 con la relación más marcada (`RIVALES_CON_ACCIONES`). Un rival conocido en el parque con poca relación puede quedarse sin «charlar» si ya hay 5 más marcados. No lo he tocado.
4. **Un PNJ en dos deportes:** hoy es imposible por modelo (`Npc.deporte` único), pero el personaje sí puede hacer atletismo y fútbol a la vez. Si se quiere «las mismas reglas», hay que decidir si los PNJ también pueden.
