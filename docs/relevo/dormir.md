# Dormir: el desplegable y la falta de sueño

Rama `claude/dormir`. **Este documento tiene dos partes:** la primera es **lo hecho el 23/11** (fases F1, F2 y F3, tras las decisiones del usuario en `docs/DECISIONES.md`, entrada «Gente por la calle y hogares; dormir»); la segunda es el **análisis original** (22/11), que se conserva como contexto. **Donde el análisis y lo hecho se contradicen, manda lo hecho** (§H.1).

## H. Lo hecho (23/11)

### H.1 Lo que cambia respecto a la propuesta original

| Propuesta del análisis | Decidido y hecho |
|---|---|
| Las obligaciones de noche devuelven la de mañana y las opciones se cortan | **No.** Dormir no mira las obligaciones: cada opción cumple sus horas y quien duerme de más llega tarde o falta a clase. Más adelante habrá despertador. No se ha tocado `GameModule.obligaciones` |
| Hora de levantarse de fin de semana (8:30) | **No.** Las mismas opciones todos los días; el jugador decide cuánto duerme |
| Malus en estudio, deporte, estrés, motivación, salud y lesión | **Solo uno activo:** la energía máxima al despertar. Los demás están **preparados y documentados** para E12 (más abajo y en `docs/BACKLOG_STATS.md`, fila E12.3) |
| Siesta que abona hasta 1 h al día | **Hasta 0,5 h al día** |
| Números del sueño en la lista | **Ninguno:** la lista dice a qué hora te levantas; el diario habla con sensaciones |

### H.2 F1: el desplegable «Dormir…» (`modules/personaje/src/index.ts`, `packages/contracts/src/sueno.ts`)

- Cada opción es una acción con su id, en el desplegable `gen.dormir` («Dormir…», «Hasta cuándo»); disponibles de 21:00 a 5:59, en casa, como antes:
  - `gen.dormir` — «Hasta las 7:00» (la de siempre; **mismo id y mismo efecto**);
  - `gen.dormir_lo_que_toca` — lo que necesita alguien de su edad (`necesidadDeSueno`), redondeado al cuarto de hora;
  - `gen.dormir_descansado` — «Hasta estar descansado»: lo que toca más la deuda recuperable (hasta 2 h). No sale si no se arrastra sueño («Ya has descansado lo que te toca»);
  - `gen.dormir_4h` … `gen.dormir_11h` — «N horas».
- El nombre dice a qué hora te levantas («Dormir 8 horas (te levantas a las 6:00)»).
- **Necesidad por edad** (`necesidadDeSueno`, interpolación lineal): 8 años 9,5 h; 12 años 9; 15 años 9; 18 años 8; 22 a 64 años 7; 75 años 7,5. Fuentes (de memoria, por comprobar): AASM (Paruthi et al. 2016), NSF (Hirshkowitz et al. 2015), AASM+SRS adultos (Watson et al. 2015).
- Huella tras F1: solo cambia `aleatorio` (elige entre las acciones y hay nuevas); el resto, idéntica.

### H.3 F2: la deuda de sueño

- **`gen.sueno`**: stat oculta, horas de sueño atrasado (0–10), inicial 0 (`packages/contracts/src/sueno.ts`).
- **Cada noche** (`pasoDeSuenoDeLaNoche`): `deuda' = clamp(deuda + necesidad − dormidas)`; si sobra, solo se recuperan 2 h por noche como mucho. Sin olvido.
- **Malus activo (el único):** `topeDeEnergiaAlDespertar = 100 − 4 × deudaEfectiva`, con `deudaEfectiva = min(8, max(0, deuda − 1))`: la primera hora no se nota. La energía no baja por dormir: `max(energía, min(tope, energía + 12,5 × horas))`.
- **Siesta:** recupera como mucho 0,5 h de deuda al día (`IdentidadState.siesta`).
- **Semana sana** (constitución +1): la condición de «≥ 50 h de descanso» se sustituye por «deuda ≤ 1 h» (con 7 h por noche eran 49 h).
- **Sensaciones, sin números:** al despertar, «Has dormido poco.» (menos de 7 h, con el −2 de motivación de siempre), «Arrastras sueño: no has dormido lo que tu cuerpo necesita.» (deuda ≥ 2) y «Te sientes descansado: has recuperado el sueño atrasado.».
- **Sucesos** (`modules/eventos`): `cabeceo_en_clase` sale también con deuda ≥ 3 (`alguna: [energía ≤ 50, deuda ≥ 3]`); **nuevo `dormirse_en_clase`** (energía ≤ 20 o deuda ≥ 6; tres salidas: decir la verdad, excusa, hacer como si nada); `noche_sin_sueno` suma deuda (`leer` +0,5 h, `dar_vueltas` +1 h).
- **El fallo del motor, arreglado.** Antes, dormir sumaba la energía en `run`, **antes** de que el reloj cruzase la medianoche, así que el agotamiento del fin de día y el `WEEK_END` veían la energía de después de dormir. Ahora el efecto de dormir va en `ACTION_DONE` (que el motor encola después de los eventos de cambio de día): ven la energía con que te acostaste. Consecuencia (medida): quien se acuesta con menos de 15 de energía sufre «Agotamiento» (−3 de salud) cada noche, y la forma y el riesgo de lesión semanales ya ven el cansancio de verdad. **Los bots «sanos» pierden algo de salud final (de 100 a 85–93)**; ver H.6.
- **Preparados y sin activar** (E12, en `sueno.ts` y en `docs/BACKLOG_STATS.md`): `factorPorSueno(deuda, a)` (concentración y estudio `a = 0,02`; deporte `0,015`) y `fatigaPorSueno(deuda) = 4 × deuda` (riesgo de lesión), más las cifras de estrés, motivación y salud de §3.3. Nadie los llama todavía.
- **Bots** (`sim/src/bots.ts`): equilibrado, empollón, atleta, abandono y `sim:vida` se acuestan según la edad (`horaDormir: 'edad'`: `7:00 + 24 − necesidad − 0,25 h`) y, si arrastran sueño y mañana no hay clase, usan «Hasta estar descansado». **Madrugador** sigue acostándose a las 23:00 a propósito, ahora descansa los días libres (`recupera`) y se cuida como el equilibrado (`energiaMin` 25, antes 15); con 15 se acostaba exhausto y el agotamiento le dejaba la salud a 0. Sobreentrena y vago no cambian (duermen poco a propósito).

### H.4 F3: los PNJ

- **Misma regla:** `EstadoDeJugador.deuda?` (opcional; ausente = 0). `pasoDeSemanaDelEstado` recibe `sueno` (`suenoHabitual`): aplica **siete noches seguidas** con las funciones del personaje (`pasoDeSuenoDeLaSemana`: cinco de clase y dos libres) y la condición que se recupera no pasa del `topeDeEnergiaAlDespertar` de esa deuda. Sin `sueno`, el paso es idéntico al de antes.
- **Hábito** (`suenoHabitual(edad, disciplina, azar)`, derivado, no se guarda): lo que se queda corto cada noche de clase = hasta los 11 años 0; de 12 a 17, +0,1 por año; adultos +0,3; más `0,6 × (0,5 − determinación)` y un azar estable de ±0,4. Los fines de semana duerme más según lo que falta (hasta +2 h).
- **En `modules/npcs`:** solo una línea en el paso semanal (`sueno: suenoHabitual(...)`) y el import. **No se ha tocado `agendas.ts`.**
- **Medido** (semilla 31): tras 52 semanas, 17 de 109 jugadores con deuda (media 0,7 h; 12 con más de 5 h: adolescentes de poca determinación). Test de equivalencia: `tests/mismas-reglas-estado.test.ts` («el sueño: las mismas reglas…»).
- **Pendiente (queda fuera para no pisar la sesión de la gente por la calle):** pasar el `duerme` de los hermanos de menos de 8 años de 23:00–7:00 a 21:30–7:00 en `agendas.ts` (hoy 8 h para una necesidad de unas 10).

### H.5 Cómo se prueba

`tests/mismas-reglas-estado.test.ts` (sueño), `modules/personaje/src/index.test.ts` («el desplegable «Dormir…»» y «el sueño atrasado»), `packages/contracts/src/sueno.test.ts`; `npm run eventos:validar` y `npm run eventos:mapa` (el nuevo suceso está en `docs/eventos/MAPA.md`).

### H.6 Balance (`npm run sim`, 365 días × 5 semillas)

Antes (rama unida, sin cambios de sueño) frente a después de F2 (con los bots arreglados) y de F3 (idéntico a F2: los bots no ven a los PNJ):

| Chequeo | Antes | Después |
|---|---|---|
| Invariantes y bloqueos | ✅ | ✅ |
| El esfuerzo hace progresar | ✅ atletismo +9,7; nota +5,2 sobre el vago | ✅ +9,7; +5,3 |
| Especialista deportivo / en estudios | ✅ 19,4 vs 19,1; 81,9 vs 77,5 | ✅ 19,4 vs 19,1; 82,0 vs 77,2 |
| Esforzarse rinde más que no hacer nada | ✅ 30,2 vs 20,7 | ✅ 30,1 vs 20,6 |
| Sobreentrenar no compensa | ✅ −6 %, salud final 2 | ✅ −8 %, salud final 0 |
| Las estrategias razonables mantienen la salud | ✅ | ✅ (con el madrugador arreglado; ver abajo) |
| Las carreras son una competición real | ⚠️ (2 % de victorias, 7 % de podios del equilibrado) | ✅ (hoy, equilibrado 4 % de podios): se movió por el azar, no por el sueño |
| Rendimiento | ✅ 1,66 ms/acción (límite 1,74) | ⚠️ 1,82–1,91 ms (límite 1,70–1,78): las dos mediciones corrieron con otras simulaciones a la vez, así que la máquina estaba cargada; el coste nuevo (una acción más en la lista, un manejador más) es pequeño. **Conviene repetirla con la máquina libre** |
| El resto | ✅ | ✅ |

`sim:notas`: «Todo dentro de los objetivos» antes y después (el banco duerme a las 21:00, 10 h). `sim:vida` no se ha comparado.

**Qué cambia en la tabla final (media de las semillas):**
- Salud final: equilibrado 100 → 85, atleta, empollón y abandono 100 → 93; sobreentrena 2 → 0; vago sigue en 100; aleatorio 2 → 1. **Es el arreglo del fallo de `ACTION_DONE`**: quien se acuesta con menos de 15 de energía sufre agotamiento. No es el malus del sueño (los bots que cuidan el sueño casi no tienen deuda).
- Madrugador: con el diseño anterior del bot, 100 → 0 de salud. Era el bot (se acostaba con `energiaMin` 15 y a las 23:00, con una necesidad de 9,5 h); ahora 74 de salud y las mismas notas que el equilibrado.
- Estudios y atletismo, sin diferencias de peso (empollón +0,1; atleta −0,1 a −0,3; equilibrado −0,3). Los bots que se acuestan según la edad a los 8 años lo hacen sobre las 21:15, y **no se nota en la tabla**: a esa hora ya habían acabado casi todo lo útil.
- Huella: F1 solo cambia `aleatorio`; F2 cambia todos los bots (a propósito); F3 solo cambia los mundos con fútbol (los PNJ llevan deuda), no los bots.
- Pendiente de decidir: con la pendiente actual (−4 de energía máxima por hora de deuda efectiva), 1,5 h de falta cada noche llevan la deuda al tope en una semana y media y la energía máxima a 68. Probé −2,5 y no cambia la salud final del madrugador (la causa era el agotamiento por acostarse exhausto), así que **la pendiente se puede suavizar sin efecto en la tabla**; se deja en 4 hasta calibrar con E12. **Decidido con el usuario el 23/11: 2,5** (`ENERGIA_POR_HORA_DE_DEUDA`).

---

# Análisis original (22/11)

## 0. Resumen en diez líneas

1. **Hoy dormir casi no tiene consecuencias.** Todos los bots se despiertan **siempre con 100 de energía** (medido, §1.6): la energía se llena con unas 6 h de sueño y el resto se desperdicia. Con menos de 7 h solo hay un −2 de motivación plano (igual con 6,9 h que con 1 h).
2. **No hay memoria**: no existe «deuda de sueño». Trasnochar una vez o diez da lo mismo.
3. **La energía al despertar no llega a ningún sitio donde duela**: el cansancio solo penaliza por debajo de 35, y la lesión y la forma semanales miran la energía **justo después de dormir** (la acción `run` se aplica antes de que el reloj cruce la medianoche; §1.4).
4. **La «semana sana» exige ≥ 50 h de descanso** (`personaje/index.ts:~380`): con 7 h exactas por noche son 49 h. **Si el usuario se acuesta para dormir «las 7 h que tocan», pierde la semana sana.** Hay que cambiar la condición.
5. **Siete horas no valen para un niño.** El personaje empieza a los 8 años; las recomendaciones médicas piden 9–12 h a esa edad (§3.2). Propongo una necesidad por edad (9,5 h a los 8, 7 h de adulto: el 7 del usuario).
6. **Propuesta de modelo:** una sola stat oculta `gen.sueno` = **deuda de sueño en horas** (0–10), que sube con lo que falta cada noche, baja con lo que sobra (con tope de 2 h por noche) y da malus suaves (energía máxima al despertar, concentración, deporte, estrés, motivación, y más adelante lesión y salud).
7. **Desplegable «Dormir…»** (§2): *Hasta la hora de levantarse* (la de siempre, sigue siendo `gen.dormir`), *Hasta estar descansado*, *Lo que toca* y *Dormir N horas*. Ninguna te hace llegar tarde a clase sin que lo veas: se **cortan** con la obligación (mecanismo del 21/11).
8. **PNJ:** el mismo `factorPorSueno` en `contracts`, con una deuda por PNJ que se actualiza cada semana según su hora de acostarse (hábito derivado de edad y carácter, sin guardarlo). Coste: un número por PNJ con estado (~9 KB en toda la población).
9. **Balance:** moverán «El esfuerzo hace progresar» (ya ⚠️ hoy), «Sobreentrenar no compensa» y la comparación con el vago. Los bots hay que arreglarlos (acostarse según la edad). **La consecuencia de diseño es real: a los 8 años casi 10 h de cama dejan menos tarde libre** (§5).
10. **Fases:** F1 desplegable sin modelo (barata, ya permite las noches), F2 deuda y efectos, F3 PNJ, F4 salud y lesión (E12). Siete dudas para el usuario en §6.

---

## 1. Inventario: todo lo que depende hoy de dormir, de la energía y del descanso

### 1.1 La acción de dormir

`modules/personaje/src/index.ts:78` `WAKE_HOUR = 7`; `:134-152` acción `gen.dormir` (lugar: casa, `:240`):

| Qué | Cifra |
|---|---|
| Hora de despertar | siempre las 7:00, también sábado, domingo y vacaciones |
| Cuándo se puede | de 21:00 a 5:59 (`inHours(ctx.time, 21, 6)`); a las 6:00 ya no |
| Duración | hasta las 7:00 (`minutesUntilHour`): de 10 h (a las 21:00) a 1 h (a las 5:59) |
| Energía | `+12,5 × horas`, tope 100 (con 8 h ya son 100) |
| Estrés | `−0,8 × horas` |
| Motivación | **−2 y aviso si < 7 h**: el mismo castigo con 6,9 h que con 1 h (un escalón) |
| Memoria | ninguna: no hay deuda ni recuerdo de la noche anterior |
| Cortable | no (`ActionDef.cortable` por defecto) |
| Etiqueta | `descanso` |

Otras acciones de descanso (`:153-171`): siesta `gen.descansar` (1 h, +8 energía, −2 estrés, cortable, en casa) y «Pasar el rato» (`gen.esperar`, 5 min, cortable). No hay ninguna otra forma de recuperar energía.

### 1.2 Dónde se usa la energía como rendimiento (personaje)

| Dónde | Archivo | Qué hace |
|---|---|---|
| Modificador `gen.cansancio` (todas las acciones, `tags: ['*']`) | `personaje/index.ts:258-265` + `contracts/estado-de-jugador.ts:14` `factorPorCansancio` | energía < 35 → eficiencia de ×1 a ×0,5; **por encima de 35, nada** |
| Modificador de estrés (mental y estudio) | `personaje/index.ts:266-273`, `estado-de-jugador.ts:17` | estrés > 50 → hasta −50 % |
| Modificador de motivación (entrenar y estudiar) | `:274-282`, `estado-de-jugador.ts:20` | ×0,85 a ×1,15 |
| Modificador de salud | `:283-300`, `estado-de-jugador.ts:23` | salud < 60 → ×(0,4 + salud/100) |
| Coste de energía: una acción que gasta más de la que hay **no se puede hacer** | motor (`resource: true`, `:123`) | por eso un bot al límite se queda sin entrenar |
| Fin de día | `personaje/index.ts:~440-455` | energía < 15 → salud −3 y «Agotamiento»; si no y estrés < 60 → salud +1. Estrés > 75 → salud −2, motivación −3 |
| Fin de semana | `:~395-420` | `eficienciaDeEstado` (energía, motivación, forma, salud) → forma; **riesgo de lesión** = `riesgoDeLesion(fatigaDeLaSemana(energía, cargas), constitución)` con `fatiga = 100 − energía + 6 × sesiones` |
| «Semana sana» → +1 constitución | `:~380, :~432` | `activo ≥ 120 min` **y** `descanso ≥ 50 h` **y** estrés < 60. Cuenta toda acción con etiqueta `descanso` (dormir y siesta) |

### 1.3 Costes de energía de las acciones (lo que se gasta cada día)

Ver `rg "GEN.energia"`. Órdenes de magnitud: clase −15/día (`estudios/index.ts:669`), estudiar −10, deberes −10 (×parte), entrenar atletismo −12 a −35 (`atletismo/index.ts:721-840`), sesión de club −25 (`kit-deporte/club.ts:285,722`), partido de fútbol −24/−35 más `cansancio × 0,6` (`futbol/index.ts:1033`, `futbol/personaje.ts:15`), gimnasio −20, ocio −3, paseo −4, leer −5. **Un día de un bot gasta unos 76 puntos** (energía media antes de dormir: 24).

### 1.4 Un detalle del motor que importa

`Game.perform` (`packages/core/src/game.ts:~505-523`) hace **(1) deltas, (2) `run`, (3) `advance(duration)`**. Dormir (`run`) sube la energía **antes** de que el reloj cruce la medianoche. Consecuencias:

- **El «Agotamiento» de fin de día y el `WEEK_END` ven la energía ya recuperada** si se duerme a través de la medianoche (lo normal: se acuesta a las 22–23 h). El riesgo de lesión semanal y la forma casi nunca ven cansancio real (el domingo se duerme y la semana «cierra» con 100 de energía).
- `ACTION_DONE` (donde se suman los minutos de `descanso`) se encola **después** de los eventos de cambio de día: la noche del domingo cuenta en la semana siguiente.
- En una propuesta de deuda de sueño hay que actualizarla **en el `run`** (coherente con la energía) y tenerlo en cuenta al leerla en `DAY_END`.

### 1.5 Dónde se lee el estado en deporte y sucesos

| Dónde | Archivo | Qué |
|---|---|---|
| Convocatoria y partido del personaje | `futbol/convocatoria.ts:179` | `fisica = lector.stat(GEN.energia)` → `eficienciaDeEstado` → `factorDeCompeticion` |
| Cansancio durante el partido | `futbol/partido.ts:208` | `× (1 + (100 − energía)/100)`: energía con la que empieza |
| Gasto del partido | `futbol/index.ts:1033` | `−round(cansancio × 0,6)` de energía |
| Condiciones de sucesos | `sucesos/index.ts:487` | `ESTADO_DEL_PERSONAJE`: `fisica → gen.energia` |
| `cabeceo_en_clase` | `eventos/colegio/mas_aula.ts:19` | `cuando energía ≤ 50`; con 100 al despertar solo sale si la energía baja durante el día (clase + deberes + entreno) |
| `noche_sin_sueno` | `eventos/casa/detalles.ts:66` | 4 % al día entre 21:30 y 23:59, en clase; «Mañana lo pagarás» (`dar_vueltas`: energía −3, estrés +1). **Hoy ese «pagar» es −3 de energía que dormir borra por completo** |
| Efectos de eventos que tocan energía | `eventos/*/…` | −2 a −3 (camino, patio, casa, barrio): sueltos |

### 1.6 Cuánto duermen de verdad los bots (medido)

Sonda desechable sobre `runBot` (semilla 1017, 120 días; `gen.dormir` por bot):

| Bot | Hora de acostarse (`horaDormir`) | Horas por noche (media; mín–máx) | Energía antes de dormir → al despertar | Siestas |
|---|---|---|---|---|
| equilibrado | 22 | 8,6 (7,6–9,8) | 24 → **100** | 151 |
| empollón | 22 | 8,1 (7,2–10,0) | 25 → **100** | 15 |
| atleta | 22 | 8,6 (8,0–9,8) | 24 → **100** | 232 |
| sobreentrena | 24 | 8,9 (7,2–9,9) | 9 → **99,9** (mín 97,8) | 284 |
| vago | 23 | 7,6 (7,1–7,9) | 100 → **100** | 1288 |
| abandono | 22 | 8,4 (7,2–10,0) | 25 → **100** | 118 |
| aleatorio | (al azar) | 6,5 (1,1–10,0), 91 noches de 120 | 10 → 83 (mín 19,5) | 360 |

Lectura: **los bots duermen 7–9 h (el «sobreentrena» también) y se despiertan siempre llenos**. De 24 a 100 hacen falta 6,1 h: dormir más es gratis y dormir hasta 6 h casi también. Por eso «dormir poco» **no se ha podido comprobar nunca** en `sim`. (`bots.ts:83-122`: `noche = hora ≥ horaDormir || hora < 6`; `horaDormir` 22 en equilibrado, empollón, atleta y abandono; 23 en vago; 24 en sobreentrena, que en realidad duerme de 0:00 a 7:00 = 7 h; `energiaMin` 25–30 hace dormir de día solo si el juego lo permite, que no: cae a la siesta.) `notas.ts:104` duerme a las 21:00 (10 h). `vida.ts:25` usa `horaDormir: 22` y `energiaMin` 40/70 según la salud.

### 1.7 PNJ

- **Los PNJ no duermen.** Los PNJ con deporte llevan un `EstadoDeJugador` (`contracts/estado-de-jugador.ts`): `fisica`, `moral`, `forma`, `salud`, `baja`. Cada semana `pasoDeSemanaDelEstado` (`npcs/index.ts:804`): `fatiga = 100 − fisica + 6 × sesiones`; `fisica = 100 − fatiga × (1 − 0,6)`; es decir, **la fatiga se recupera un 60 % por semana «descansando» sin decir cuánto**. La lesión usa `riesgoDeLesion(fatiga, constitución)`, la misma función que el personaje. La eficiencia (`eficienciaDeEstado`, `npcs/index.ts:1068`) usa los mismos factores `factorPorCansancio` y `factorPorSalud`.
- Los sucesos pueden mover el estado de un PNJ (`npcs/index.ts:~1581`).
- Los adultos y quienes no practican deporte **no tienen estado**: sin energía, sin efectos.
- **Hermanos < 8 años:** `Tramo` `duerme` 23:00–7:00 (`contracts/agendas.ts:65,359-360`, `npcs/index.ts:496`) = 8 h, que es **menos de lo recomendado** a su edad (y solo afecta a que no se les pueda hablar).
- Hábitos del cuerpo (`docs/ANEXO_CUERPO.md` §4) cubren actividad y fuerza por semana, no sueño. El modelo de sueño sería el mismo patrón: un hábito derivado + un paso semanal.

---

## 2. El desplegable de «Dormir»

### 2.1 Cómo se hace con lo que ya existe

- **Mecanismo:** `ActionDef.desplegable` (`contracts/actions.ts:79`), el de «Entrenar…» y las acciones del club. Cada opción es **una acción con su id**; si solo hay una, se dibuja como botón normal.
- `name` y `description` pueden ser función del contexto (`actions.ts:12-13`), así que el nombre de cada opción puede decir **a qué hora te despierta**: «Hasta las 7:00 (9 h)».
- `duration` puede ser función; `cortable` + `GameModule.obligaciones` ya cortan lo que pisa clase, sesión, convocatoria o plan (DECISIONES del 21/11). Dormir no es cortable hoy; **en las nuevas opciones sí lo sería** (§2.4).
- **`gen.dormir` conserva su id y su efecto en F1**: los bots, la huella y los tests (`personaje/index.test.ts`, `familia/index.test.ts`, `sim/src/*`) no cambian. Es la primera opción del desplegable.
- Disponibilidad: igual que hoy, **de 21:00 a 5:59** en casa («Solo de 21:00 a 6:00»). No se propone ampliarla (§6, duda 7).

### 2.2 La hora de levantarse (qué es «la hora de levantarse»)

`horaDeLevantarse(mañana)` = **la última hora que permite llegar a la primera obligación de mañana, con un margen para arreglarse**, y como mucho la hora «de siempre» del tipo de día:

| Mañana es… | Hora de levantarse | Cálculo |
|---|---|---|
| Día de clase | **7:00** (prov.: es `WAKE_HOUR` de hoy) | clase 8:00 − 10 min de antelación (`MINUTOS_ANTES_DE_CLASE`) − 12 min de viaje casa→aula (medido: casa→calle 1 + calle→colegio 9 + colegio→aula 2) − 40 min de arreglarse y desayunar = 6:58 → 7:00 |
| Sábado, domingo o vacaciones | **8:30** (prov.; §6 duda 2) | un valor fijo del tipo de día |
| Cualquier día con obligación temprana (carrera a las 9:00, convocatoria una hora antes del partido, plan acordado) | la más temprana de las dos | la obligación manda: «Hasta las 7:45 (carrera a las 9:00)» |

Hoy las obligaciones solo valen «para hoy» (`GameModule.obligaciones`: «Devuelve solo las de hoy»). A las 23:00 la clase de mañana **todavía no es una obligación**. Hay que ampliarlo: **de noche (21:00–6:00) los módulos que llevan obligaciones devuelven también la primera de mañana** (estudios: la primera clase; kit de deporte: la sesión; fútbol: la convocatoria; relaciones: el plan acordado para mañana). Es un cambio chico en cuatro módulos y en `Game.proximaObligacion` solo en cuanto a qué fecha mira; el motor sigue sin saber qué son.

### 2.3 Las opciones

Caso de referencia para todas: martes, 23:00, 9 años (necesita 9,5 h; §3.2), deuda de 2 h, mañana hay clase a las 8:00. `Δ` es la energía que se recupera (12,5/h, como hoy).

| # | Opción (nombre en la lista) | Te despierta a las… | Cómo se calcula | Si pisa una obligación | Cómo se ve |
|---|---|---|---|---|---|
| 1 | **«Hasta la hora de levantarse»** (`gen.dormir`; la actual) | la de §2.2: 7:00 un día de clase, 8:30 en finde y vacaciones, antes si hay obligación | `duración = horaDeLevantarse − ahora` | **No pisa: la hora ya está calculada contra la obligación** | «Hasta las 7:00 · 8 h» |
| 2 | **«Hasta estar descansado»** (recuperar el sueño atrasado) | `ahora + necesidad + min(deuda, tope de la noche)` | necesidad 9,5 h + deuda 2 h, con **tope de recuperación de 2 h por noche** (§3.1) = 11,5 h → 10:30; si pisa algo, se corta | **Se corta** en la hora de salir (`cortable`): «Hasta las 7:00 · 8 h (entras a clase a las 8:00). Te quedan 3 h 30 min por recuperar». Con la deuda en 0 no está disponible: «Ya has descansado lo que te toca» | «Hasta las 10:30 · 11 h 30 min». Un sábado se puede completar entero |
| 3 | **«Lo que toca»** (las horas exactas sin penalización) | `ahora + necesidad(edad)` | 9,5 h a los 9 años; 7 h un adulto | **Se corta** igual | «Dormir lo que toca · 9 h 30 min (te levantas a las 8:30)» |
| 4 | **«Dormir N horas»** (4, 5, 6, 7, 8, 9, 10 y 11 h; un renglón por valor) | `ahora + N` | N fijo | **Se corta**; lo que no llega se ve en la energía y en la deuda | «Dormir 6 h (te levantas a las 5:00)» |
| 5 (idea) | **«Poner el despertador a las…»** (6:00, 6:30, … 10:00) | la hora elegida | `duración = hora − ahora` | **Se corta** | alternativa a la 4: más natural para quien piensa en «a qué hora me levanto»; sale más larga la lista |

Notas:

- **La 1 es la predeterminada** (la primera disponible); basta el botón «Dormir…» sin abrir el desplegable.
- **Una noche normal**: en la 1 y la 3 las horas dependen de cuándo te acuestas. Quien se acuesta a las 21:30 con la opción 3 se levanta a las 7:00 sin deuda; a las 23:00 se levanta a las 8:30 y **llega tarde a clase** → por eso se corta en 7:00 y el resultado real son 8 h (deuda +1,5).
- **Trasnochar y recuperar (lo que pidió el usuario)**: dormirse a la 1:00 un viernes de colegio; el sábado se elige la 2: 9,5 h + deuda → 12 h; el tope por noche limita la recuperación a 2 h, así que la deuda baja en 2 h y el resto se recupera otro día. Un día de clase solo se puede la 1 (o una cortada).
- **Nunca hace falta una «alarma» para no faltar a clase**: la 1 la lleva puesta. Si alguien quiere **faltar a clase a propósito** no se hace durmiendo (§6, duda 3).
- **Lo que no se enseña** (principio 7): la lista dice **a qué hora te despiertas** y, como mucho, una palabra («descansado», «justo», «con sueño»), no el número de la deuda (§3.5).
- Etiqueta `descanso` en todas, igual que hoy, para la semana sana (que se cambia: §3.4).

### 2.4 Cómo se corta una opción de dormir

`cortable: true` hace que `duration` sea `min(duración, hasta − ahora)` y los efectos se reducen en proporción. **Con dormir es exactamente lo correcto**: dormir 3 h de 5 recupera 3 h de energía y suma la deuda por lo que faltó. Pero hay que fijar que la deuda se calcula con **las horas dormidas** (las reales después del corte), no con las pedidas. Es la misma cuenta si `run` lee `ctx.time` y la duración real.

---

## 3. Modelo de falta de sueño propuesto

### 3.1 La deuda (modelo recomendado) y alternativas

**Recomendado, modelo A: una deuda en horas, una sola stat.** `gen.sueno` (oculta, categoría `estado`, 0–10, inicial 0), como `gen.madurez`: la leen los eventos (`cuando: [{ stat: 'gen.sueno', min: 3 }]`) y los bots, y se ve en los `snapshot` de `sim`.

Cada noche, con `necesidad` = horas necesarias a su edad (§3.2) y `dormidas` = horas reales:

```
falta   = necesidad − dormidas               // + si falta, − si sobra
deuda'  = clamp(deuda + falta, 0, DEUDA_MAX)           // si sobra: baja como mucho TOPE_DE_RECUPERACION por noche
         con falta < 0 → falta = max(falta, −TOPE_DE_RECUPERACION)
```

- `DEUDA_MAX = 10 h` (prov.), `TOPE_DE_RECUPERACION = 2 h por noche` (prov.: dormir 12 h tras trasnochar no da «más» que 2 h de abono).
- Sin olvido: la deuda no desaparece sola (la restricción crónica se acumula; en la bibliografía el rendimiento sigue empeorando semanas con 6 h/noche).
- **Holgura de 1 h** (prov.): los efectos usan `max(0, deuda − 1)` (`deudaEfectiva`): quien se queda corto media hora una noche no se nota.
- **La siesta abona** 0,5 h por hora de siesta, **máximo 1 h al día** (prov.). Hoy el vago hace 1288 siestas en 120 días: con el tope no puede cubrir su deuda con siestas.
- **Las noches en blanco**: un suceso o una acción puede sumar deuda con `{ estado: 'gen.sueno', mas: 1 }` (`noche_sin_sueno` → `dar_vueltas`: +1 h). **Sin cambios en el formato de eventos.**

Alternativas, con su coste:

| Modelo | Qué es | Pros | Contras |
|---|---|---|---|
| **A. Deuda acumulada (recomendado)** | un número, con tope de recuperación | barato (1 número); fácil de explicar; los eventos lo leen; el PNJ lo puede llevar | la deuda alta tarda en irse (es lo que se busca) |
| B. Ventana de las últimas 7 noches | guardar 7 números y mirar la media | refleja «esta semana» tal cual | 7 números por persona (60 KB en la población); el PNJ semanal sería otro modelo |
| C. Solo la noche anterior | `dormido ayer < necesidad` → malus del día | trivial | no premia recuperar, no hay finde de «remontar»; es lo que ya hay con otro nombre |
| D. Deuda con olvido del 10 % diario | `deuda × 0,9 + falta` | la deuda se «estabiliza» sola | con 0,5 h de falta diaria el equilibrio es 5 h: castiga demasiado y se entiende peor |

### 3.2 Horas recomendadas por edad

Fuentes (citadas de memoria; **conviene comprobarlas antes de cerrar**):

| Edad | AASM (Paruthi et al., *J Clin Sleep Med* 2016; avalado por la AAP) | NSF (Hirshkowitz et al., *Sleep Health* 2015) | AASM+SRS adultos (Watson et al., *Sleep* 2015) |
|---|---|---|---|
| 6–12 años | **9–12 h** | 9–11 h (6–13 años) | — |
| 13–18 años | **8–10 h** | 8–10 h (14–17 años) | — |
| 18–25 años | — | 7–9 h | **≥ 7 h** |
| 26–64 años | — | 7–9 h | **≥ 7 h** |
| ≥ 65 años | — | 7–8 h | **≥ 7 h** |

Estas recomendaciones son de **sueño por 24 h** y hablan de una **cantidad suficiente para estar bien**: el 7 que da el usuario es el **mínimo** de un adulto; para un niño de 8–9 años 7 h es **2–3 h menos que el mínimo**.

**Propuesta** (interpolación lineal entre puntos; prov.):

| Edad | Necesidad |
|---|---|
| 8 | **9,5 h** (el juego empieza aquí) |
| 12 | 9,0 h |
| 15 | 9,0 h |
| 18 | 8,0 h |
| 22 a 64 | **7,0 h** (el 7 del usuario) |
| ≥ 70 | 7,5 h |

Por qué 9,5 h y no 10 a los 8 años: 21:30 → 7:00 deja una tarde con sentido (el sueño empieza a las 21:00; 10 h obligarían a acostarse a las 21:00 en punto cada noche). Con 9,5 h el tutor también «pide» acostarse a las 21:30, una hora creíble.

**Implementación:** `necesidadDeSueno(edad)` pura, en `contracts` (junto a `cuerpo.ts` o `estado-de-jugador.ts`), usada por el personaje (su edad decimal, `edadDecimal`) y por cualquier PNJ.

### 3.3 Qué malus da y dónde

Todos usan `deudaEfectiva = max(0, deuda − 1)` y se saturan en 8 h (`min`). Cifras prov. para calibrar con `sim:notas` y `sim`:

| Qué | Efecto con deuda efectiva `d` | Dónde | Cuánto con d = 4 (≈ 5 h de deuda) |
|---|---|---|---|
| **Energía máxima al despertar** | `tope = 100 − 4 × d` (el sueño ya no «llena»: `min(tope, energía + 12,5 × horas)`) | `gen.dormir` `run` | despierta con 84 |
| **Concentración y aprendizaje** (clase, estudio, deberes: etiquetas `estudio`, `mental`) | `×(1 − 0,02 × d)` | modificador nuevo `gen.sueno` (como `gen.estres`) | ×0,92 (−8 %) |
| **Deporte** (etiquetas `entrenamiento`, `competicion`, `fisico`) | `×(1 − 0,015 × d)` | el mismo modificador | ×0,94; el partido y la carrera entran por `eficienciaDeEstado` (abajo) |
| **Estrés** | el alivio nocturno `−0,8 × h` se multiplica por `(1 − d/10)`, y cada día de fin de día `+0,3 × d` | `gen.dormir` y `DAY_END` | +1,2 al día: casi anula el −1 diario de `DAY_END` |
| **Motivación** | se acaba el escalón: `−0,7 × horas que faltan esa noche` (máx. −4); y el punto de equilibrio baja `−1 × d` | `gen.dormir` y `DAY_END` | −4 como mucho por una noche muy corta |
| **Competición** (carrera, partido) | `eficienciaDeEstado` multiplica por `factorPorSueno(deuda)` | `contracts/estado-de-jugador.ts` | es **la única copia** que ven personaje y PNJ (§4) |
| **Lesión** (E12.1) | `fatigaDeLaSemana += 4 × deuda`; `riesgoDeLesion` ya sube con la fatiga: `(1 + fatiga/40)` | `contracts/estado-de-jugador.ts` | con fatiga 10: de ×1,25 a ×1,65 (+32 %) |
| **Salud** (E12.3, más tarde) | deuda ≥ 6 h tres días seguidos → salud −1/día, aviso «Agotamiento crónico» | `DAY_END` | — |

**La función común** (una sola copia, como `factorPorCansancio`):

```ts
export const deudaEfectiva = (deuda: number) => Math.min(8, Math.max(0, deuda - 1));
export const factorPorSueno = (deuda: number, a = 0.02) => 1 - a * deudaEfectiva(deuda);  // estudio 0,02; deporte 0,015
export const topeDeEnergiaAlDespertar = (deuda: number) => 100 - 4 * deudaEfectiva(deuda);
```

Y **el cambio a la «semana sana»**: sustituir `descanso ≥ 50 h` por `deuda media de la semana ≤ 1 h` (o: `descanso ≥ 6,5 × necesidad`); con el 50 h actual, dormir lo que toca a los 22+ años (49 h) suspende la semana.

### 3.4 Cómo afecta a lo que ya existe, una por una

| Existente | Con el modelo |
|---|---|
| `gen.cansancio` (< 35) | se queda; ahora hay una causa nueva (energía máxima baja) que puede dejar el techo cerca |
| `cabeceo_en_clase` (energía ≤ 50) | **sale casi nunca hoy** (despertar con 100). Con deuda: añadir `cabeceo` por deuda ≥ 2 (suceso nuevo en `modules/eventos`, sin tocar el motor) |
| `noche_sin_sueno` | `dar_vueltas` y `leer`: **+1 h de deuda** (hoy solo energía que dormir borra) |
| Agotamiento (`energía < 15` en `DAY_END`) | pasa a verse algo más (el tope de energía lo acerca): hay que vigilarlo con `sim` |
| Constitución por «semana sana» | cambia la condición de descanso (§3.3) |
| Motivación −2 a < 7 h | se sustituye por −0,7 × h que faltan |
| Partido y carrera | `convocatoria.ts:179` lee la deuda para `eficienciaDeEstado` (misma regla que el PNJ) |

### 3.5 Cómo se ve para el jugador (principio 7: siente los datos, no los gestiona)

- **En la alfa se pueden enseñar los números** (como el resto de stats). La deuda es oculta (`hidden`, como `madurez`), así que **no sale en la tarjeta de estado**; sí la energía.
- **Cuando se pulse el botón:** la lista dice **a qué hora te despiertas**, nunca «deuda = 3,5». El resultado del `log` da la sensación: «Te despiertas con la cabeza pesada», «Has dormido bien», «Arrastras sueño de varios días».
- **El jugador no sabe cuánto necesita**: un consejo del tutor («A tu edad se necesitan unas nueve horas y media») como suceso con `hechos` o el consejo que ya existe para estudios; solo entonces la opción 3 puede llevar el número («Lo que toca · 9 h 30 min»). Hasta entonces: «Dormir lo que toca».
- **La señal más visible** es la que ya tiene el juego: la energía, el cabeceo, las notas y el partido.

---

## 4. PNJ: la misma regla

**Principio:** las mismas reglas para el personaje y los PNJ (`docs/MISMAS_REGLAS.md` §2): lo que cambia es **quién decide y cada cuánto se calcula**. El personaje duerme cada noche; el PNJ **una vez por semana** a partir de un hábito.

- **Una sola copia de las reglas en `contracts`**: `necesidadDeSueno(edad)`, `deudaEfectiva`, `factorPorSueno`, `topeDeEnergia…`, y los dos pasos: `pasoDeSuenoDeLaNoche(deuda, necesidad, dormidas)` (personaje) y `pasoDeSuenoDeLaSemana(deuda, necesidad, { laborables, libres })` (PNJ).
- **Hábito de cada PNJ** (derivado, **no se guarda**; `rngEstable`, como los hábitos del cuerpo de `ANEXO_CUERPO.md` §4): hora de acostarse en día de clase = `21:30 + 0,25 h × (edad − 8)` (los adolescentes se acuestan más tarde, hasta ~23:30 a los 16, prov.) `+ carácter` (poca disciplina: hasta +45 min; mucha: −15 min) `± azar de ±30 min` estable; en día libre una hora más tarde. Despiertan a las 7:00 (lectivo) y a las 8:30 (libre), las mismas horas de §2.2.
- **Paso semanal** (junto a `pasoDeSemanaDelEstado`, `npcs/index.ts:804`): `deuda = clamp(deuda + 5 × faltaLaborable + 2 × faltaLibre, 0, 10)` con el mismo tope de recuperación por noche (así 5 noches + 2 equivale a las 7 noches del personaje; **test de equivalencia** como el de `tests/mismas-reglas-estado.test.ts`).
- **Efectos en el PNJ:** `eficienciaDeEstado` multiplica por `factorPorSueno`; `fatigaDeLaSemana` suma `4 × deuda` (entra en el riesgo de lesión y baja la `fisica` de la semana siguiente: sin cambios en `riesgoDeLesion`).
- **Quién:** los PNJ con `EstadoDeJugador` (los que practican deporte). Los demás no tienen energía hoy y no se modelan (sería gratis ampliarlo cuando los adultos tengan estado).
- **Hermanos < 8 años:** pasar su `duerme` de 23:00–7:00 a **21:30–7:00** (9,5 h), para que concuerde con la necesidad de su edad. **Esto cambia el mundo** (quién se puede hablar de noche, huella) y va en su fase.

**Coste:**
- Guardado: `EstadoDeJugador.deuda?` (opcional, un número redondeado a décimas): ~1.400 personas × 8 bytes ≈ **11 KB sobre 2,4 MB (< 0,5 %)**; al cargar una partida vieja vale 0.
- Cálculo: una función aritmética por PNJ y semana, dentro del paso semanal que ya existe (sin bucles nuevos).
- `npm run rendimiento -- 60` lo comprueba (no debería moverse).

---

## 5. Efecto en el balance

### 5.1 Qué chequeos de `npm run sim` pueden moverse

Línea base medida (`sim:rapida`, 84 días × 2 semillas): ✅ todos salvo **⚠️ «El esfuerzo hace progresar»: Equilibrado atletismo +4,6 (esperado > +7)** (ya estaba así antes).

| Chequeo | Qué puede pasar | Por qué |
|---|---|---|
| **El esfuerzo hace progresar** (⚠️ hoy) | puede empeorar | los bots se acostarían antes (§5.2): **~1 h menos de tarde** al día de entrenamiento y estudio para niños de 8–9 años |
| **Esforzarse rinde más que no hacer nada** (✅ 25,5 vs 19,0) | se mantiene o mejora | el vago duerme 7,6 h a 23:20 y haría 1288 siestas: tendría deuda y malus |
| **Sobreentrenar no compensa** (✅ −11 %, salud final 1) | **más holgado** | duerme de 0:00 a 7:00 (7 h) con necesidad 9,5 → 2,5 h de deuda por noche hasta el tope: ×0,88 en deporte y energía máxima 68 |
| **Las estrategias razonables mantienen la salud** (✅) | vigilar | si se acorta la noche y sube el estrés, pero solo con deuda ≥ 6 h (F4) |
| **Especialista supera al equilibrado** (✅ atleta 14,2 vs 12,9; empollón 81,0 vs 70,7) | mantener | si todos pierden por igual, la diferencia no cambia |
| **No hay estrategia dominante**, **Nadie llega a 90…**, **Invariantes** | sin cambio previsto | — |
| `sim:notas` (banco de notas) | **sin cambio** si duerme a las 21:00 (10 h ≥ 9,5 h) | `notas.ts:104`; quien se acuesta a las 22:00 ya tendría 0,5 h de falta |
| `sim:vida` (70 años) | cambia de niño; adulto igual | `vida.ts:25` con `horaDormir: 22` da 9 h ≥ 7 h; de niño le falta 0,5 h |
| `npm run huella` | **cambia solo por lo esperado**: el bot «aleatorio» elige entre las acciones disponibles y las opciones nuevas cambian su secuencia (F1); los otros bots solo pierden la huella en F2 | por eso la F1 no usa `gen.dormir` de otra forma que la actual |

### 5.2 Cómo arreglar los bots (los bots se arreglan; el juego, no)

- `bots.ts:99` pasar de una hora fija (`horaDormir: 22`) a **`horaDeAcostarse(game)`** = `7:00 − necesidad(edad) − 15 min` (para los bots que cuidan el sueño: equilibrado, empollón, atleta, abandono, vida). Los que tienen **perfil de dormir poco** (`sobreentrena: 24`, `vago: 23`) se quedan como están a propósito.
- Un bot que cuida el sueño usa **«Hasta estar descansado»** los días libres cuando `gen.sueno ≥ 1` (`game.stat('gen.sueno')`).
- `aleatorio` se queda al azar: es el que prueba las opciones nuevas y las cortadas.
- Tras el cambio, `sim` antes/después: si «El esfuerzo hace progresar» baja de +4,6 a, por ejemplo, +3,5, hay que **explicarlo** (menos horas útiles de tarde por la necesidad de sueño de un niño, no por el modelo) o recalibrar el umbral con la misma regla que `CLAUDE.md` ya da para las cifras de balance.
- **La implicación de diseño** que sí hay que decidir (duda 1 y 4): un niño de 8 años necesita 9,5 h; con 7:00 de levantarse, **a las 21:30 se acuesta**. Antes se podía usar hasta las 22:00–24:00.

---

## 6. Fases, recomendación y dudas para el usuario

### Fases

| Fase | Qué | ¿Cambia el juego? | Tamaño |
|---|---|---|---|
| **F1. El desplegable sin modelo** | `desplegable` «Dormir…» con las 4 opciones; `horaDeLevantarse` (lectivo 7:00, libre 8:30, obligación de mañana); `obligaciones` de noche devuelven la de mañana (estudios, kit, fútbol, relaciones); opciones `cortable`. Energía +12,5/h y estrés −0,8/h **como hoy**; el −2 de motivación sigue. `gen.dormir` idéntica | Solo `aleatorio` en la huella | Pequeña (un día) |
| **F2. La deuda y sus efectos** | `gen.sueno` oculta; `necesidadDeSueno(edad)`; tope de energía; modificador `gen.sueno`; estrés y motivación proporcionales; semana sana por deuda; `noche_sin_sueno` suma deuda; `cabeceo` por deuda; bots por edad; aviso de «arrastras sueño» | **Sí** (todos los bots) | Media; calibrar con `sim`, `sim:notas`, `sim:vida` |
| **F3. PNJ** | `EstadoDeJugador.deuda`, hábitos, paso semanal, `factorPorSueno` en `eficienciaDeEstado`; hermanos a 21:30; test de equivalencia | **Sí** (mundo, huella) | Media |
| **F4. Salud y lesión (E12)** | fatiga `+4 × deuda`, agotamiento crónico, enfermedades (E12.3) | Sí | Con E12 |

**Recomendación:** hacer **F1 ya** (es lo que el usuario pide y no cambia el balance; amplía lo que se puede hacer de noche), y **F2 + F3 seguidas** (el principio 2: que el jugador no tenga una regla que los PNJ no sigan durante mucho tiempo), con F4 dentro de E12. Cada fase se mide con `sim` antes y después.

### Dudas para el usuario (cada una con mi recomendación)

1. **¿Las 7 h valen para todas las edades?** Para un niño de 8–12 años las recomendaciones médicas habituales son 9–12 h (§3.2). → **Recomiendo una necesidad por edad (9,5 h a los 8 años, 7 h a partir de los 22)**; el 7 del usuario es la de un adulto.
2. **¿Hasta qué hora se duerme en fin de semana y vacaciones?** → **Recomiendo 8:30 fija** en «Hasta la hora de levantarse» (y las 7:00 lectivas). Alternativa: «te despiertas solo» (hora de acostarse + necesidad, entre 7:30 y 10:00): más real, menos predecible.
3. **¿Se puede dormir a propósito y faltar a clase?** → **No con «Dormir»**: todas las opciones se cortan para llegar. Faltar a clase, si se quiere, será una decisión explícita aparte (no se hace sin querer).
4. **¿Cuánto castiga?** (cifras de §3.3: −8 % en estudio y −6 % en deporte con unas 5 h de deuda; energía máxima 84) → **Recomiendo suave al principio**, sin tocar salud hasta E12, y subir con `sim`. Hay que decidir si los 8 años deben notar la falta de sueño tanto como un adulto.
5. **¿Se enseña cuánto hay que dormir?** → **Alfa con números; después, el tutor lo dice una vez** y la lista habla de horas de despertar y de sensaciones (principio 7).
6. **¿La siesta paga deuda?** → **Sí, hasta 1 h al día** (0,5 h por hora de siesta), para no anular la deuda con 1288 siestas.
7. **¿Se amplía la hora de dormir (hoy 21:00–6:00)?** → **No**: la deuda ya hace que acostarse tarde cueste algo; ampliarlo a las 20:00 solo abarata dormir y no resuelve nada. Sí conviene permitirlo si el personaje está enfermo (futuro).

---

## Apéndice: lo que se ha medido y cómo

- Línea base: `npm run huella -- 60` y `npm run sim:rapida` en esta rama (la huella de los 7 bots × 2 semillas y de las dos partidas con fútbol salió idéntica antes y después de este documento).
- Sonda (no se deja en el repositorio): se envolvió `Game.prototype.perform` para anotar, en cada `gen.dormir`, la hora de empezar, las horas (`duration/60`) y la energía antes y después, y se llamó `runBot` con cada bot (semilla 1017, 120 días). Salieron los datos de §1.6.
- Tiempo de viaje casa → aula: `rutaA` + `tiempoEntre` (`contracts/lugares.ts`): 1 + 9 + 2 = 12 min.
