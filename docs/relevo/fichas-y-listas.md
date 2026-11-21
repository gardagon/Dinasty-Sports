# Relevo: fichas, padres que recogen, prueba fuera de plazo y listas agrupadas (17/11/2026)

Rama `claude/fichas-y-listas` (sale de `claude/youthful-clarke-vs0kye`). Sin pull request. No he tocado `DECISIONES.md` ni `modules/npcs/src/draft.ts`. Tests: `tests/fichas-y-listas.test.ts` (nuevo), `apps/web/src/desplegables.test.ts` (ampliado), `packages/contracts/src/agendas.test.ts` y `tests/pnj-2.test.ts` (los padres, ajustados).

## 1. Ficha de alguien que no está a tu lado — HECHO

- **Qué es «a tu lado»:** lo mismo que mira el motor para hablar con alguien: está entre la gente que tienes cerca (`presencia.en(lugar, aforoCercano)`) **o** está aquí pero ocupada (atendiendo en clase, durmiendo). Función `aTuLado(g, n)` en `apps/web/src/gente.ts`. Sin los servicios `lugares` y `presencia` no se restringe nada (como en el motor).
- **Quien no está a tu lado** (compañeros, amigos, familia, rivales, vecinos, profesores y entrenadores: la ficha es una sola): la ficha no enseña **nada** de lo que se podría hacer con ella: ni «Qué hacer con…», ni «Lo que no se puede ahora», ni «Proponer quedar para…», ni «Pedir jugar…». A un **desconocido** que no está a tu lado tampoco se le ofrece «Preguntar su nombre» ni se dice «No la tienes cerca…» (antes la nota daba la pista).
- **Quien está aquí pero ocupada** sigue como antes (la lista con el motivo en gris: sí está a tu lado y es esa la razón de que no se pueda).
- **Lo que he dejado, y por qué:**
  - **El apodo** (`npcs.apodo.…`): no es hablar con nadie, se puede poner a quien conoces estés donde estés. Se queda en todas las fichas de quien conoces.
  - **Los planes ya acordados con su «Cancelar plan»** (no el formulario de proponer): `relaciones.cancelar` no exige presencia (es «avisarle»), también existe en el panel «Planes» de la pantalla principal, y sin él el jugador solo podría plantar al otro, que es peor. **Confirmado por la arquitectura (17/11):** apodo y «Cancelar plan» visibles a distancia, y el listado en gris para quien está a tu lado pero ocupado. Si se quisiera ocultar también, es una línea (`bloqueDePlanes(g, n, true)` en `ficha`) y el botón sigue en el panel «Planes».
- **No toca el motor:** `g.preview` / `g.perform` de esas acciones siguen valiendo a distancia y dicen «no está aquí».
- **Test:** `tests/fichas-y-listas.test.ts` («la ficha de alguien que no está a tu lado»): varios roles lejanos sin ningún `data-do="relaciones.…"` ni «Qué hacer con»/«Lo que no se puede ahora»/«Proponer quedar»/«Pedir»; el apodo se queda; a quien tienes al lado sí se le enseña «Qué hacer con»; el desconocido lejano no ofrece preguntar el nombre.
- **Doc:** `ANEXO_RELACIONES.md` (§ reglas generales, punto 3).

## 2. Padres que recogen — HECHO

- **80 % de los días de clase**, sorteo estable por persona y día **sin gastar el azar de la partida**: campo nuevo de tramo `delDia: { clave, probabilidad }` (`agendas.ts`, motor `ubicacionEn`): si la persona no lo tiene ese día (`azarDe(persona, día, clave, 'dia') >= probabilidad`), el tramo no vale y manda el siguiente en nivel (un vecino cualquiera). Los tramos de llegada y de salida del padre comparten la clave: o están los dos o ninguno. Cifras en `RECOGIDA_DE_NINOS` (`diasDeClase: 0.8`).
- **Edad mínima 25** (`RECOGIDA_DE_NINOS.edadMinima`; antes 18, `EDAD_FIN_COLEGIO`): `ajustarVecinos` (`modules/npcs`). La proporción (15 % de los vecinos adultos) no cambia; hay menos candidatos, así que habrá menos padres en total.
- **Pendiente apuntado** en `ANEXO_HORARIOS_PNJ.md` («Padres que recogen»): la edad está **por revisar**, a veces pueden ser algo más jóvenes y se quiere mezclar padres y abuelos (hoy todos son «vecino adulto» sin distinguir). También en el comentario de `RECOGIDA_DE_NINOS`.
- **Tests:** `agendas.test.ts` (los que van ese día llegan y se van como antes sin entrar y salir; quien no va no pisa la entrada en toda la franja; el 80 % ± 3 puntos en 20 días lectivos con 400 personas; nadie falta siempre ni va siempre, estable) y `pnj-2.test.ts` (nadie menor de 25 recoge; a las 14:00 solo están los que recogen, y la mayoría).
- **Partidas ya empezadas:** como `escolar`/`recoge` anteriores, se recalcula al empezar el siguiente curso.

## 3. Prueba fuera de plazo — HECHO

- `motivoSinFichaje` (kit de deporte, `club.ts`) añade, en **los tres motivos de plazo cerrado** (estás en un club; dejaste el tuyo fuera de plazo; ya solo se entra con hueco), **«Las pruebas de acceso se abren {fecha}»**: el primer día (lunes) de la próxima semana con el plazo abierto (`proximaAperturaDelPlazo`, el verano) con `diaConFecha` («el lunes 22 de junio»). Genérico: sale del calendario del país y de la temporada del deporte; lo usan atletismo y fútbol (prueba, pedir prueba, apuntarse, aceptar plaza).
- **Test:** `fichas-y-listas.test.ts` («la prueba de acceso fuera del plazo…»): con club propio, tras dejar el club fuera de plazo (con la misma fecha) y, dentro del plazo, ni rastro de fechas.
- **Doc:** `CIUDAD_Y_LIGAS.md` §7.

## 4. Listas agrupadas

### 4.1 Análisis (`npm run listas`, nuevo: `tools/listas-de-acciones.ts`; `-- --detalle` lista cada acción)

Partida de semilla 31 con atletismo y fútbol; los números son **todas** las acciones del grupo (la lista normal solo enseña las disponibles; «Ver lo que no está disponible» las enseña todas). Solo cambia el número de disponibles según el momento (casa martes 17:00, colegio, estadio, sábado, verano), no los grupos.

| Grupo | Acciones | Qué hay | Encaja en desplegable |
|---|---|---|---|
| **Estudiar** | 34 | 16 «Estudiar <asignatura>» (solo ~5 se cursan; el resto, en gris «No cursas esta asignatura»), el repaso general, 16 «Pedir tutoría de <asignatura>», y «Preguntar al profesor de Educación Física…» | **Sí, claro:** «Estudiar…» (asignaturas + repaso) y «Pedir tutoría…» (asignaturas). **Hecho.** Lo de Educación Física no encaja (otra cosa): suelto |
| **Verano** | 5 | «Campamento de <deporte>» y «Practicar con los amigos» por deporte (los dos botones de «Practicar…» se llaman **igual**), y «Ir a la academia» | **Sí con dos deportes:** «Campamento…» y «Practicar con los amigos…» (opción = deporte). La academia, suelta. **Hecho** |
| **Tiempo libre** | 7 | Leer, videojuegos, crear, pasear, jugar con otros niños, y «Ver <deporte> en la tele» por deporte | Solo «Ver un deporte en la tele…» con dos deportes. **Hecho.** El resto son cosas distintas |
| **Club** | 14 | por deporte: entrenamiento con el club, dejar el club, apuntarte al del colegio, prueba de acceso (o «Pedir hacer una prueba») y aceptar plaza **en cada club** | **Por decidir** (ver 4.3) |
| **Competición** | 8 | subir/volver de categoría, semifinal, final, carrera, unirse a los compañeros, ir al vestuario, jugar el partido | No: cada una es un paso distinto de la jornada |
| **Entrenar <deporte>** | 4–5 | ya agrupados («Entrenar…») + «Pedir consejo a tu entrenador» | Ya hecho en la sesión anterior |
| **Aula** | 5 | charlar antes de clase y las cuatro clases del día (con la hora) | No: son momentos del día, solo una está disponible |
| **Partido** | 3 | «Salir a jugar: relajado / normal / a tope» | **No lo he aplicado:** son 3 y es la decisión importante de la jornada; tres botones a la vista valen más que un desplegable. Si se prefiere, es una línea (`desplegable` en esas acciones) |
| Descanso (3), Puesto (2), Entrenamiento general (1), Colegio (1) | 1–3 | dormir/siesta/pasar el rato; aceptar o rechazar un puesto; gimnasio | No: pocas y distintas |
| **Fichas** (acciones con una persona) | ≈10–20 | charlar, jugar, detalle, preguntas de 2 minutos, discutir, ayudar, quedar… según la relación | No: ya están ordenadas por duración, y las largas (planes, peticiones) ya van en su desplegable (`Proponer quedar para…`, `Pedir jugar…`) |

### 4.2 Lo aplicado

- **Contracts:** `DesplegableDeAcciones` gana `opcion?` (cómo se llama la acción dentro del desplegable: «Lengua», «Fútbol») y el botón admite `{nombre}` (nombre completo de la acción: «Estudiar lengua») además de `{opcion}`.
- **Web** (`desplegables.ts`, una línea en `main.ts`): si de un desplegable **solo existe una acción** en toda la lista (un deporte instalado, no dos) se dibuja un botón normal; así «Practicar con los amigos» con un deporte queda como antes.
- **Estudios** (`modules/estudios`): `estudios.estudiar` («Estudiar…», etiqueta «Asignatura»: las asignaturas y «Repaso general (todas las del curso)») y `estudios.tutoria` («Pedir tutoría…»). Los ids no cambian: sim, bots y tests igual.
- **Kit** (`comunes.ts`): `verano.campamento`, `verano.amigos` y `tiempo_libre.tele`: con dos deportes, uno solo por tipo de acción.
- **Capturas** (Chromium, deviceScaleFactor 1, 480 px, martes 17:00 en casa):
  - Antes: `listas-estudiar-antes.png` (lo disponible: las asignaturas del curso sueltas) y `listas-estudiar-antes-con-no-disponibles.png` (con «Ver lo que no está disponible»: 16 asignaturas, 16 tutorías… un muro de botones).
  - `listas-estudiar-despues.png`: «Estudiar…» abierto; `listas-tutorias-despues.png`: «Estudiar…» y «Pedir tutoría…» abiertos (con «Ver lo que no está disponible»).
- **Doc:** `ANEXO_DEPORTE.md` (sección de entrenamientos agrupados, ampliada).

### 4.3 Propuesta para las acciones del club (NO aplicada: decide el usuario)

Captura de la lista de hoy (`listas-club-antes.png`, con atletismo; con fútbol y sus clubes salen más: prueba y plaza de «Real Ciudad C. F.» y «Unión Deportiva del Barrio»): siete botones, casi todos en gris. La propuesta (prototipo hecho solo para la captura y retirado: `listas-club-propuesta.png`):

- **«Prueba de acceso…»** → desplegable «Club» con **un club por opción** (`atletismo.prueba.<club>` / `futbol.pedir_prueba.<club>`); debajo, la descripción del club y el botón «Prueba de acceso: <club>» con su motivo.
- **«Aceptar plaza…»** → desplegable «Club» (`<deporte>.aceptar_plaza.<club>`). Solo se puede aceptar la de un club cuya prueba has superado: con «Ver lo que no está disponible» desactivado, solo salen los que tienen oferta (casi nunca hay más de uno), y a menudo ni existe el botón.
- Sueltos, como hoy: «Entrenamiento con el club», «Dejar el club» y «Apuntarte al club del colegio» (una por deporte; con dos deportes son dos botones con el mismo nombre: se podrían agrupar por deporte igual que «Practicar con los amigos…»).
- Cambia poco el número de botones con un solo deporte (de 7 a 5), y mucho con fútbol (de 14 a 8 y sin los grises de los clubes que no te interesan). Coste: una línea por acción en `accionesDeClubes` (`club.ts`) y una opción `opcion` con el nombre del club. **Pregunta para el usuario:** ¿le gusta que la prueba de acceso y aceptar plaza se elijan en un desplegable por club?

## Dudas para la arquitectura

1. (Resuelta: «Cancelar plan» y el apodo se quedan visibles a distancia, confirmado por la arquitectura.)
2. **La edad de los padres que recogen** (25) sigue por revisar, con la mezcla padres/abuelos (apuntado en el anexo).
3. **«Salir a jugar»** (3 botones de intensidad) no se ha agrupado; decidir si el usuario lo prefiere en desplegable.
4. **El desplegable de asignaturas** muestra, con «Ver lo que no está disponible», las asignaturas que no cursas en gris; sin ese interruptor, solo las que sí. Si se prefiere no enseñar nunca las que no son del curso, hay que ocultarlas en el módulo de estudios (hoy salen como «No cursas esta asignatura este curso»).
5. **Huella:** al cambiar la edad mínima y el 80 % de días cambia la agenda de miles de vecinos adultos (menos padres en la entrada del colegio): los bots que charlan con quien tienen cerca verán gente distinta, como en la sesión anterior. No he medido la huella de los bots porque los desplegables no cambian ids ni lógica.
