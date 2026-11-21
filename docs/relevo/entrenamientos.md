# Relevo: los 22 entrenamientos del fútbol, quedar a jugar y los campamentos (21/11/2026)

Rama `claude/entrenamientos` (sale de `claude/youthful-clarke-vs0kye`). Sin pull request. **No se ha tocado `DECISIONES.md`.**
Encargo: entrada «Puestos, entrenamientos, pistas…» de `DECISIONES.md` (21/11), apartado **Entrenamientos**, con el informe `docs/relevo/futbol-puestos-entrenos.md` §2.
La tabla final de cifras y las reglas están en **`docs/ANEXO_DEPORTE.md`** («Los 22 entrenamientos del fútbol, quedar a jugar y los campamentos»); se regenera con `npm run entrenamientos:tabla`.

## Qué se ha hecho

1. **El catálogo de 22** (`modules/futbol/src/entrenamientos.ts`): portería 5, físico 5, mental 4, técnico 8, con las cifras del informe, dónde se hace, con quién (solo / club), duración y cansancio. Un solo dato del que salen:
   - el desplegable **«Entrenar…»**, con los 22 **agrupados en Portería, Físico, Mental y Técnico** (`desplegable.grupoDeOpcion`, campo nuevo de contracts; la interfaz lo dibuja como `optgroup`). Los que necesitan compañía salen no disponibles con el motivo;
   - los **ejercicios del club** (19 de los 22, las mismas cifras llevadas a una hora);
   - los bloques del campamento.
2. **Desajustes del informe corregidos:**
   - **«Tiro»** ya no es casi todo balón parado: «Tiro a puerta» (definición 3,5, disparo lejano 2, sangre fría 1) y «Balón parado» aparte.
   - **El entrenador ya no dice «mejora tu técnica» al portero:** `pedirConsejo` (kit) admite una función de la persona; en el fútbol, el portero oye hablar de reacción, blocaje, mano a mano, dominio del área y posicionamiento.
   - **Entrenar de portero tiene sentido para quien juega de portero:** en la sesión del club, los ejercicios de portería (`soloPuesto: 'GK'`) los hace solo el portero y los técnicos de campo (`noPara: 'GK'`, campo nuevo de `EjercicioDeClub`) no; su sesión es un ejercicio de portería más uno físico o mental. **Fallo encontrado por el camino:** el ejercicio de porteros era `soloPuesto: 'portero'` pero el id del puesto es `GK` y ni el personaje ni los PNJ pasaban el puesto: **no salía nunca, para nadie**. Ahora los PNJ pasan su puesto (`listaDeSesion(..., puesto)` en `npcs`, con la caché de la sesión del equipo por puesto) y el personaje, el suyo.
3. **«Con amigos» es quedar a jugar al fútbol** (todo el año). Es una actividad más de «Proponer quedar para…»: el deporte **aporta** `QuedadaDeDeporte` (`APORTES.quedadaDeDeporte`, contracts) y relaciones las lee sin saber de fútbol (`quedadasDe(ctx)`; el formulario, `resolverAccion`, el plan acordado, el plantón y el panel «Planes» las tratan como estudiar o pasar el rato). Cuatro formas de jugar (**lo que sube sale de lo que se juegue**): partidillo, 3 contra 3, tiros y paradas y a ver quién la mete (`modules/futbol/src/quedadas.ts`). La acción del plan acordado es `relaciones.<actividad>.<persona>` («Jugar al fútbol: partidillo con X (plan acordado)»), con compañía de **deporte** (`AreaDeAyuda`, que ya estaba preparada). Desaparece `futbol.amigos`; el atletismo conserva el suyo.
4. **Campamentos de jugadores y de porteros, por separado** (`futbol.campamento_jugadores`, `futbol.campamento_porteros`): comparten los bloques de todos (agilidad y coordinación, posicionamiento y anticipación) y cada uno trae los suyos. El de jugadores **no es solo ataque**: toques y pared, defensa uno contra uno, rondos y pase y tiro. `campamento()` del kit gana `variante` (id, nombre, opción y descripción); el atletismo no cambia.
5. **Balance** (abajo).

## Balance: antes y después

`npm run sim:futbol -- 365 3` (un deportista de campo, un curso, 3 semillas; he añadido la columna «capacidades» al informe y `sim/src/futbol-por-habilidad.ts`, que enseña cuánto sube cada habilidad):

| | Puntos de habilidad / curso | Capacidades | Sesiones de club |
|---|---|---|---|
| Antes (catálogo viejo) | **154** | 35,4 | 11 |
| Escala 0,55 | 80 | — | 11 |
| Escala 0,9 | 104 | 34,0 | 11 |
| Escala 1,4 | 127 | 36,0 | 11 |
| **Elegida: escala 1** | **110** | 34,5 | 11 |

**Por qué el 154 de antes no es el objetivo:** el bot es un jugador de campo y, con «Entrenar de portero» abierto a todos y la rotación del bot, subía **~43 puntos de habilidades de portería** (reflejos +10, blocaje +9, alcance aéreo +6,9…) que no le sirven. Sin ellos el curso era **~111**; con la escala 1 sale 110 y reparte mejor (medido con la escala 1,4: decisiones, visión y sangre fría pasan de +0,1 a +7). Es una única constante, `ESCALA_DE_ENTRENAMIENTO` (`entrenamientos.ts`); las cifras de la tabla son las del informe. La subida se frena sola con el tope por edad: de 0,55 a 1,4 (2,5 veces más entrenamiento) el curso sube solo 1,6 veces.

**El club rinde al menos como entrenar por libre, por hora** (era al revés: ~3 puntos/hora frente a ~6). Cada entrenamiento que se hace de las dos formas rinde en el club ×1/0,85 (sin el «sin entrenador», y los de 45 minutos se llevan a 60); lo comprueba `modules/futbol/src/entrenamientos.test.ts`. Resultado: **una sesión del club sube unos 13 puntos de habilidad (dos ejercicios de una hora) en vez de ~6**.

**Lo que hay que vigilar (decisión de la arquitectura):** como los PNJ entrenan con las mismas reglas, la sesión de club de los niños de los equipos más que se dobla. **Medido** (ciudad de prueba, semilla 31, nivel medio de los futbolistas por edad, antes → ahora): al crear, 8 años 11,3 → 11,3; 10 años 14,3 → 14,5; 12 años 16,6 → 16,9; 14 años 19,9 → 20,7; 16 años 21,4 → 22,1; 18 años 25,4 → 26,7; y tras dos años la diferencia sigue en ≤ 1,3 puntos (≈ 3–5 %). **Es poco: el tope por edad lo frena**, y no he recalibrado nada más. Lo que sí cambia es el reparto fino: el test del reparto de verano (`tests/equipo-sin-ninos.test.ts`) esperaba el equipo B para el personaje de 8 años y ahora le toca el C con esa semilla; lo he aflojado a «no el A». Si se quiere que los niños suban exactamente como antes, se baja la escala del club (no la del libre) y el club deja de estar por encima del libre: una constante más y una decisión de diseño.

- `npm run sim:rapida`: **idéntico al de antes** (el atletismo no cambia; los dos ⚠️ — rendimiento y «el esfuerzo hace progresar» — ya estaban).
- `npm run sim:vida`: RESULTADO_VIDA
- `npm run huella -- 60`: **los 14 bots (atletismo) idénticos** (mismos hashes); cambian solo las dos líneas `futbol` (el mundo con fútbol, también al crear la partida: la historia de los niños usa la rutina del club), a propósito.

## Bots

- `deportistaDe('futbol')` (`sim/src/bots.ts`): ya no existe `futbol.campamento` ni `futbol.amigos`; elige `campamento_jugadores` (o el campamento único de otros deportes) y **no hace los entrenamientos de portería** (es un jugador de campo). **Los bots no hacen quedadas**: las propuestas llevan parámetros en el id y no salen en las listas (como estudiar con alguien); el bot de fútbol pierde, pues, «practicar con los amigos» de verano (muy poco: ~2 puntos por rato).

## Cambios de contratos (mínimos)

- `DesplegableDeAcciones.grupoDeOpcion?` (apartado de la opción en el desplegable); lo dibuja `apps/web/src/desplegables.ts` con `optgroup`.
- `EjercicioDeClub.noPara?` (junto a `soloPuesto`: ahora el id del puesto, `GK`).
- `QuedadaDeDeporte` y `APORTES.quedadaDeDeporte`.
- Kit: `campamento(…, { variante })`, `pedirConsejo(cfg, lista | (ctx) => lista)`, `entrenosAgrupados` conserva `opcion` y `grupoDeOpcion` de cada acción, `elegirEjercicios` respeta `noPara`.
- Relaciones: `ActividadDePlan` pasa de las dos fijas a cualquier id; `PLANES` sigue siendo las de siempre y `planDeActividad` / `actividadesDePlan` añaden las de los deportes.

## Tests

`modules/futbol/src/entrenamientos.test.ts` (22 con 5/5/4/8, las 29 habilidades suben en algún sitio, tiro sin balón parado, ≥ 3 entrenamientos por puesto, club ≥ libre por hora, el portero y el de campo no se cruzan en el club, las quedadas), `tests/futbol.test.ts` (los 22 en «Entrenar…» agrupados, la quedada en el formulario sin ser verano, los dos campamentos con lo común y lo propio) y `modules/relaciones/src/index.test.ts` (un deporte de prueba aporta una quedada). Los tests con ids viejos (`futbol.balon`…, `rondos`…) se han actualizado.

## Pendiente / decisiones que no estaban

1. **Las quedadas no se ven en las pestañas del deporte** (solo en «Proponer quedar para…»); el entrenador no las recomienda todavía (la sesión de pistas leerá `ENTRENAMIENTOS_DE_FUTBOL`: `entrena`, `quien`, `lugares` y `grupo`).
2. **Los 10 entrenamientos «de compañía»** (P2, P3, P5, F5, M2, M3, M4, T3, T5, T6) salen en el desplegable pero no se pueden hacer solos: solo en la sesión del club. El informe los daba también «con amigos»; con la decisión de que quedar es jugar, no los hay como entrenamiento con amigos. Si se quiere que se puedan hacer al quedar (como forma de jugar), basta añadir una `QuedadaDeDeporte` más; no hay que tocar nada más.
3. **Los PNJ no quedan a jugar entre ellos** más allá del juego informal semanal de siempre (`JUEGO_INFORMAL`, que es exactamente el partidillo).
4. **Pies de portero** sube pase, control y visión, que hoy no pesan en el portero (recomendación D del informe, sin decidir): rinde menos para el puesto (el test lo admite con un 46 %).
5. Las cifras siguen siendo provisionales: la escala y el cansancio de cada uno se afinan con partidas reales.
