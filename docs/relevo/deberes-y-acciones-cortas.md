# Relevo: «Hacer deberes…» y acciones que pisan otra (21/11/2026)

Rama `claude/deberes-y-acciones-cortas` (sale de `claude/youthful-clarke-vs0kye`). Sin pull request. No se ha tocado `DECISIONES.md`.
Encargo: entrada «Deberes, acciones que pisan otra y moverse con el grupo» (los dos primeros puntos; **«moverse con el grupo» no se ha hecho**).

## 1. «Hacer deberes…» (30 minutos)

- Acción `estudios.deberes_<asignatura>`, desplegable «Hacer deberes…» (mismo formato que «Estudiar…»), grupo «Estudiar». Aún no hay deberes que entregar: sube la asignatura elegida.
- **Cifra (dato):** `EFICIENCIA_DE_DEBERES = 0,9` en `modules/estudios/src/index.ts`. Todo (energía −10, estrés +6, entrenos de capacidades y la subida de la asignatura) es el de «Estudiar» por `30/90 × 0,9`. Razón: estudiar en ratos cortos cuesta más ponerse y centrarse; tres ratos de deberes dan el 90 % de una sesión de hora y media. Es solo un número: si se quiere igual, 1,0.
- **Dónde** (`LUGARES_DE_DEBERES`, el primero es el destino por defecto): casa, biblioteca, **colegio** (fuera de clase, con el horario del colegio), **parque**, **estadio** y los **campos de fútbol** (`campo_colegio`, `campo_municipal`, solo si existen en la partida). Horas: las de estudiar (7 a 23, fuera del horario de clase). Pensado para esperar al entrenamiento sin irse a casa y volver; el entrenamiento mismo tiene su propia «espera» al llegar. Un lugar que falta (sin fútbol) simplemente no sale.
- **Bots:** no los piden (`omitir` en `sim/src/pasos.ts`, predicado `deberes` en `bots.ts`; el bot que elige entre todas, `aleatorio`, sí los ve). `npm run sim:notas` sin cambios (todo ✅, cifras idénticas: usa `estudiar_*`).

## 2. Una acción que pisa otra consume solo los minutos que faltan

**Mecanismo (genérico, sin contenido de juego en core):**
- `GameModule.obligaciones(ctx): Obligacion[]` (contracts). `Obligacion = { hasta, texto }`: `hasta` es el minuto absoluto hasta el que se puede dedicar el tiempo a otra cosa (inicio de la obligación **menos lo que cuesta llegar**, por el camino parada a parada: `minutosParaLlegar(ctx, lugar)`, contracts/lugares) y `texto` lo que lee el jugador.
- `ActionDef.cortable?: boolean` (por defecto no). Si faltan `n` minutos < duración `d`, en `Game.evaluate` la acción dura `n`, y `eficiencia` y todos los `delta` (también costes) se multiplican por `n/d`. `ActionOption.corte = { deMinutos, minutos, parte, texto }`. El núcleo guarda la obligación más próxima en caché mientras no cambien el minuto, las acciones hechas ni el estado de los módulos (los bots previsualizan muchas seguidas).
- Si la obligación ya ha empezado o se llega justo (`hasta` ≤ ahora), no se corta nada.
- **Interfaz:** la duración del botón y de cada opción de un desplegable sale como «2 min (entras a clase a las 9:00)» (`duracionDe` en `apps/web/src/main.ts`; `viewDesplegable` pasa la opción al formateador).

**Quién declara obligaciones:** `estudios` (próxima clase a la que no se ha ido; «entras a clase a las …» si ya estás en el aula, «para llegar a clase a las …» si hay viaje), kit de deporte (`obligacionDeSesionDeClub`, puesta en `atletismo` y `futbol`), `futbol` (convocatoria, una hora antes del partido) y `relaciones` (plan acordado de hoy sin empezar).

**Qué se corta (dato `cortable: true`):** estudiar, repaso general, hacer deberes, quedar, charlar, ayudar, hacer planes, jugar (con alguien y con otros niños), `gen.descansar/esperar/ocio/leer/crear/pasear/gimnasio`, entrenar por libre (`entrenosAgrupados` en el kit). **No:** viajes, clases, sesión del club, partidos y carreras, exámenes, pruebas de acceso, tutoría y consejos (una al día, a medias no tiene sentido), tener un detalle, discutir, planes acordados, dormir, academia, ver la tele (una al día), campamento. Criterio: se corta lo que se puede dejar a medias sin que pierda sentido y consume tiempo «de relleno»; no lo que es una cita, un evento o cuenta como «una al día».

**PNJ:** no aplica. Los PNJ no ejecutan acciones: siguen su agenda (`contracts/agendas.ts`, tramos con hora y lugar) y la pasada semanal, así que ya están donde toca a su hora por construcción (no hay nada que pisar).

## Cambios en los bots (`npm run huella -- 60`, `npm run sim:rapida`)

- **Los futbolistas del mundo (huella `futbol`) no cambian** (`7f3c1d058412`, mismos hashes).
- **Bots que cambian a propósito:** las esperas (`gen.esperar`) ahora acaban justo a la hora de salir hacia clase, lo que descuadraba su cuenta de 5 en 5 y los hacía llegar 5 minutos tarde (`tarde_a_clase` pasó de 2 a 35 al año con `equilibrado`, `empollón`, `atleta` y `abandona`). Se arregló el bot, no el juego: ahora sale hacia el aula con tiempo para estar dentro cuando se abre (10 minutos antes; `basicas` en `sim/src/bots.ts`, suma el viaje por tramos). Resultado: **`equilibrado`, `empollón`, `atleta` y `abandona` llegan siempre a tiempo** (antes llegaban unos 2 minutos tarde); `sobreentrena` (siempre tarde por diseño) igual; `vago` y `aleatorio` (decisiones al azar) llegan tarde en proporción parecida (vago 73→82 clases tarde de unas 120; aleatorio, 54→61).
- Huella: `equilibrado` 2413→2329 acciones (60 días), `empollón` 1865→1777, `atleta` 2371→2282, `abandona` 2347→2258; `sobreentrena` ≈ igual, `vago` 1452→1521, `aleatorio` 2874→2822. Son menos acciones porque ahora hay menos esperas «de 5 minutos».
- `sim:rapida`: Invariantes ✅, Ritmo de eventos ✅ (2,9/semana), Rendimiento ✅ (el coste por acción oscila ±10 % entre ejecuciones en esta máquina). Estudios: equilibrado 72,3→70,8; empollón 80,9→81,0; atleta 60,6→60,3. Atletismo: equilibrado 13,4→12,9 (la alerta ⚠️ «El esfuerzo hace progresar: atletismo +4,6 (esperado > +7)» ya existía antes con +5,1: sin cambio de fondo; sale por el recorte de esperas y de entrenos por libre al final del día). El resto de chequeos como antes.

## Para las otras sesiones

- **`packages/kit-deporte/src/club.ts`** (sesión de fútbol/PNJ): añadido `obligacionDeSesionDeClub` y `cortable: true` en `entrenosAgrupados`; puesta en los módulos `atletismo` y `futbol` con una línea (`obligaciones: …`). `futbol` además lleva `obligacionDeLaConvocatoria` (usa `datosDelDiaDePartido` y `estaUnido`, sin tocar su lógica).
- **`modules/sucesos`:** no se ha tocado. Los sucesos que consumen minutos (`minutos` de una opción) no se cortan: el corte solo existe en acciones normales.
- **Los tests que esperan con `gen.descansar` o `gen.esperar`** hasta una hora exacta pueden caer ahora en un minuto distinto si en medio hay una obligación (la espera se corta). Se arregló uno (`tests/integracion.test.ts`, «en vacaciones, si el colegio aún no ha abierto…»: antes dependía de que el reloj cayera en minutos múltiplos de 5).
- `ctx.efficiency` dentro de `run` ya lleva la parte cortada: las acciones cuyo `run` aplica cifras propias deben usarla (como ya hace `interaccion` en relaciones).

## Pendiente / decisiones que quedan para la arquitectura

1. **«Moverse con el grupo»** (tercer punto de la entrada de DECISIONES): no hecho, fuera de este encargo.
2. Quien falta a clase a propósito también ve cortadas sus acciones cortables al acercarse la clase siguiente (la obligación cuenta aunque no se vaya a ir). No molesta mucho (solo recorta el último trozo), pero si se quiere, se puede limitar a los días en que el personaje ha ido a la primera clase.
3. La previsión de la duración se calcula con el reloj de ahora: si hace falta viajar antes (acción ligada a otro sitio), la duración real se recalcula al llegar (con `perform` ya llegado). En el botón se ve la de ahora.
4. `EFICIENCIA_DE_DEBERES` (0,9) es una cifra de partida, por calibrar con el usuario.

## Tests

- `packages/core/src/game.test.ts`: corte proporcional (duración, eficiencia, `delta`, llegada exacta), lo no cortable, lista = previsión.
- `modules/estudios/src/index.test.ts`: deberes (30 min, proporción frente a estudiar, solo fuera de clase, sitios) y estudiar a las 7:55 dura 5 minutos y se entra a tiempo.
- `tests/acciones-cortas.test.ts` (partida entera): resta el viaje al aula, sitios de los deberes, y la sesión del club como obligación.
