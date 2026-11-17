# Relevo: fútbol 2 — prueba de acceso, 4 semanas, calendario de la liga y modo «números» (17/11/2026)

Rama `claude/futbol-2` (sale de `claude/youthful-clarke-vs0kye`). Sin pull request. No toqué `DECISIONES.md`.

## 1. Prueba de acceso: el entrenador dice lo que más necesita — HECHO

**Cómo mido «lo que más necesita» (decisión mía, a revisar):** por **grupo de puestos** del reparto de la plantilla (portero, centrales, laterales, mediocentros, bandas, delanteros). Faltan = cupo del grupo
(`cuposPorGrupo` del máximo del equipo de la categoría del personaje) − jugadores de ese grupo que hay hoy. Con el equipo completo no hay huecos (el máximo es un tope, igual que en `ofertasDePuesto`).
- Nuevo en el contrato `NpcDirectory.huecosPorGrupo?(deporte, club)` → `HuecoDeGrupo[]` (`{ grupo, nombre, puestos, huecos, cupo }`, solo los grupos con falta). Implementado en `modules/npcs/src/plaza.ts`
  (`huecosPorGrupoEnElEquipo`; tocado solo eso y una línea en `modules/npcs/src/index.ts`, por si choca con la otra sesión de PNJ).
- Kit (`club.ts`): `necesidadesDelEquipo`. Ordena los grupos con falta por cuántos faltan y, a igualdad, por qué parte del cupo falta. **Interpretación de «los 2 puestos que más necesita o, si hay más de 2 huecos, varios»:** con
  **1 o 2 grupos** con falta los nombra («lo que más necesito ahora son centrales y laterales»); con **más de 2**, dice «varios puestos» y no nombra ninguno (`GRUPOS_QUE_NOMBRA_EL_ENTRENADOR = 2`). Con 0, solo se presenta. Si
  querías que con 3 o más nombre los 2 que más necesita y añada «y alguno más», es cambiar `necesidadesDelEquipo` y el texto. Nombra **grupos** («centrales»), no puestos sueltos (el CB, el LB…), porque la falta se mide por grupo.
- La señal `club.prueba_empieza` lleva ahora `nGrupos` y `necesita`. El suceso `<deporte>.prueba_de_acceso` (kit, `sucesoDePruebaDeAcceso`) tiene tres variantes: `varios`, `con_necesidad`, `sin_huecos`. En las dos primeras eliges entre
  **todos** los puestos: uno con hueco (lo dijera o no) → te prueba ahí; uno sin hueco → «no es ninguno de los que te he dicho» (o «de X no me hace falta nadie» con «varios») y te prueba donde decida él, o «donde él vea». Como los
  grupos nombrados son todos los que tienen hueco (≤ 2), «hueco dicho o no» solo se distingue en la práctica con «varios».
- Textos del fútbol: `modules/futbol/src/eventos/textos_de_puesto.ts` (campos nuevos `preguntaConNecesidad`, `opcionDePuesto`, `resultadoSinHuecoDicho`; `opcionDeHueco` pasó a `opcionDePuesto`).

## 2. Pedir puesto: el primer entrenamiento cuenta para las 4 semanas — HECHO

Señal compartida nueva `club.peticion_de_puesto` (`SHARED_EVENTS.PETICION_DE_PUESTO`). La emite `futbol.primer_entrenamiento` en `pedir_cambio`, **tanto si sale bien como si sale mal**, y el kit (`comunes.ts`) apunta
`ultimaPeticionDePuesto`. Así, pedirlo en la ficha antes de 28 días es «mal rato» (−3 de afinidad), como ya pasaba entre dos peticiones de la ficha. (Aceptar sin pedir no cuenta.)

## 3. Calendario de la liga — HECHO (propuesta de formato: avisa si no te gusta)

- **Contrato** `packages/contracts/src/calendario-de-temporada.ts`: `situacionDeTemporada` (puro, con el calendario del país y la `TemporadaDeDeporte`) y `situacionDelDeporte` (con los datos del deporte); `diaConFecha`
  («el sábado 13 de octubre»). Dato del deporte: sirve a cualquier deporte con temporada; cada uno solo dice el nombre de su competición. Tramos: pretemporada, competición, parada por vacaciones, terminada, verano.
- **Pestaña** (`DeporteView.temporada.situacion`, mostrado en `apps/web/src/deporte.ts` como «Temporada: …» encima de «Próxima prueba»; es lo único que toqué de `apps/web`). Fútbol: «Pretemporada. La liga empieza el
  sábado 13 de octubre.» (la frase aprobada); atletismo: «Pretemporada. Las carreras empiezan el sábado 13 de octubre.»; en liga «Liga. El verano empieza el lunes …»; parada, terminada y verano en `ANEXO_DEPORTE.md` §3 ter.
  **Es decisión de formato mía** (una línea nueva en la pestaña): si prefieres otro sitio o redacción, es `situacionDeTemporada` y una línea del web.
- **«Todavía no hay calendario»:** el calendario de partidos (rival, día, hora, campo) no existe hasta que se crea la liga, el lunes de la primera semana de competición. En fútbol, antes de eso «Próxima prueba» dice
  «Todavía no hay calendario de partidos: se publica al empezar la liga.» y las acciones de jugar dicen «Todavía no hay partidos: la liga empieza el sábado …». (La fecha de inicio sí se sabe siempre: sale del calendario del país.)
- **El entrenador:** (a) en el primer entrenamiento, una frase más en las dos variantes («Una cosa más: la liga empieza el sábado 13 de octubre; el calendario de partidos se publica ese día, cuando empiece»;
  hecho nuevo `futbol.calendario`, que cambia según el tramo: ya en marcha, vacaciones, terminada); (b) **al publicarse el calendario**, una línea en el diario con su nombre y la primera jornada (día, hora, rival, en casa o fuera),
  una vez por curso (`FutbolState.calendarioAvisado`; solo si la liga aún no tiene jornadas jugadas, para que una partida ya empezada no lo repita).
- **Atletismo:** solo la línea de la pestaña (las carreras no tienen calendario de emparejamientos: son cada sábado de clase). `proxima` de atletismo no cambia (el test de integración sigue esperando «semana 5»).
- **Copa:** no existe en el código; no hay tramo de copa. Cuando se implemente será otro tramo entre la liga y el verano (está anotado en el contrato y el anexo).

## 4. Modo «números» — HECHO

`pistaDe` (`modules/sucesos/src/index.ts`) enseña también: `estadoDeJugador` con el nombre de la stat del personaje que lo hace («Motivación +3», «Forma −2», «Energía −4», «Salud +1», «Baja por lesión (semanas) +1»; con
«(de Lucas)» si es de otra persona del reparto), la familia («familia (tu madre): apoyo +2, expectativas −1»), el carácter («honestidad −3») y el dinero con euros («Dinero −5 €»). Sin metagaming nuevo ni nada complicado: es
temporal. Sigue sin recorrer `si/entonces` ni las ramas de las tiradas.

## Tests

- `tests/futbol-2.test.ts` (nuevo): la prueba de acceso (las 3 variantes con la señal, y con la partida entera que el texto coincide con el servicio), las 4 semanas (sale bien, sale mal, aceptar no cuenta), el calendario
  (pestaña de fútbol y de atletismo en pretemporada, línea del diario al publicarse con la ciudad grande, hecho del entrenador).
- `packages/contracts/src/calendario-de-temporada.test.ts` (nuevo): todos los tramos y otro deporte.
- `modules/sucesos/src/index.test.ts`: el modo «números» con estado de juego, familia, carácter y dinero.
- `npm run typecheck`, `npm run eventos:validar` (59 sucesos, 434 caminos) y `npm test`: ver el final de este archivo.

## Captura

`docs/relevo/pestana-del-deporte-pretemporada.png`: la pestaña «Deporte» del fútbol en la semana 2 del curso (pretemporada), con «Temporada: Pretemporada. La liga empieza el sábado 13 de octubre.» y «Próxima prueba:
Todavía no hay calendario de partidos: se publica al empezar la liga.» (Chromium, deviceScaleFactor 1, semilla 7, ciudad por defecto, club del colegio).

## Dudas para la arquitectura

1. **Qué cuenta como «huecos»** (§1): por grupo y con 2 como tope para nombrar. ¿Prefieres nombrar siempre los 2 grupos de más falta (con «varios» solo como añadido) o por puestos concretos?
2. **Dónde se ve el tramo** (§3): una línea «Temporada» en la pestaña. ¿Basta o quieres además algo en la pantalla «Qué hacer» o el diario al cambiar de tramo (p. ej. «Empieza la liga»)?
3. **Fecha de inicio de la liga:** es el día más temprano de la jornada (sábado) aunque el juvenil juegue el domingo; con el calendario de partidos publicado, la línea del diario ya da el día y la hora exactos del equipo del personaje.
4. **Efectos de `si/entonces` y tiradas** siguen sin enseñarse en modo números (a propósito).
5. `benjamin` y `probar-web` fallaban ya en la rama base (ver `futbol-pedir-puesto.md`): no los he tocado ni comprobado.
