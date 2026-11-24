# Salud y lesiones (E12): análisis y plan por fases

Análisis de la sesión `claude/salud-lesiones` (24/11/2026), por encargo de la arquitectura. **No cambia el juego**: solo este documento (`npm run huella -- 60` idéntica antes y después, §10). No se ha editado `DECISIONES.md`: las decisiones que salgan de §9 las apunta la arquitectura.

Fuentes del repositorio leídas: `VISION.md`, `BACKLOG_STATS.md` (E12), `DECISIONES.md` (salud, lesión, baja, sueño, fatiga), `MOTOR_PARTIDOS.md`, `ANEXO_CUERPO.md`, `MISMAS_REGLAS.md`, `relevo/dormir.md`, `relevo/medir-rendimiento-2.md` y el código de `estado-de-jugador.ts`, `sueno.ts`, `modules/eventos/src/salud/`, `modules/personaje`, `modules/npcs`, el kit de deporte y el fútbol.

## 0. Resumen

1. **Hoy la salud es un modelo de una sola pieza**: una probabilidad semanal de lesión que sube con la fatiga y baja con la constitución, una gravedad uniforme de 1 a 6 semanas, y una salud que solo resta rendimiento. No hay tipos, ni recuperación por fases, ni recaídas, ni enfermedades, ni exposición real (un partido no pesa más que un entrenamiento), ni edad. Los perks de recuperación **no hacen nada** (la etiqueta `recuperacion` no la usa ninguna acción).
2. **Medido con las funciones actuales** (§1.2): un jugador de club se lesiona **0,3–0,5 veces al año** y pasa un **2–3 %** de las semanas de baja. La epidemiología del fútbol base da **~0,5–1 lesiones con baja al año** según la edad (más con la edad y en partido). Le falta frecuencia, sobre todo en partido y en juveniles, y le sobra uniformidad en la gravedad (la mayoría real son de menos de una semana).
3. **Propuesta** (§2): lesiones por **exposición** (horas de partido y de entrenamiento), con **8 tipos** y una duración **en días**, recuperación en **tres fases** (aguda, rehabilitación, vuelta con riesgo de recaída), **médico y fisio** como acciones, **enfermedades comunes** con estacionalidad y contagio por hogar, y un **desgaste crónico** oculto para el agotamiento. Todo son **funciones puras en `contracts`**, las mismas para el personaje y los PNJ.
4. **El coste computacional no es el problema** (§6): medido, un paso semanal de estado cuesta **0,12 µs** y un `rngEstable` también 0,12 µs. Lo caro del mundo grande no es tirar los dados (14.000 personas, estimado: 5–10 ms), sino los sucesos y los avisos por persona (+15 ms por cruce con solo `lesion`, `medir-rendimiento-2.md` §1).
5. **Activar el sueño** (§3) es la primera fase útil: ya está preparado, son tres líneas, y el modelo de lesiones lo necesita como factor. Mueve la huella y el balance (a propósito) solo en los bots.
6. **Recomiendo 7 fases** (§8): F1 cifras puras sin activar (huella idéntica) → F2 efectos del sueño → F3 lesiones tipadas con días y recuperación → F4 enganche con el partido → F5 enfermedades → F6 médico, fisio, sucesos e interfaz → F7 perks, secuelas e historial.
7. **Nueve dudas para el usuario** en §9, cada una con mi recomendación.

---

## 1. Inventario de lo que hay hoy

### 1.1 Qué existe, dónde y con qué cifra

| Pieza | Dónde | Cifra / comportamiento |
|---|---|---|
| **Salud** `gen.salud` | `modules/personaje/src/index.ts:387` (modificador), `estado-de-jugador.ts` (`factorPorSalud`) | 0–100. Por debajo de 60 rinde `×(0,4 + salud/100)` en todo (`gen.salud` modificador, `tags: ['*']`) y lo físico cuesta ×1,2. Con 60 o más no pasa nada |
| **Baja** `gen.baja` | `personaje/index.ts:250` | Semanas, 0–12. Bloquea entrenar con el club (`kit-deporte/src/club.ts:263,326`), competir (`atletismo/src/index.ts:444`) y jugar (`futbol/src/index.ts:1276`) |
| **Riesgo semanal** `riesgoDeLesion` | `estado-de-jugador.ts` | `0,004 × (1 + fatiga/40) × (1,4 − 0,8·constitución/100)`. `fatiga = 100 − energía + 6·sesiones` (`fatigaDeLaSemana`). Constitución 0–100 |
| **Gravedad** `gravedadDeLesion` | idem | Uniforme: baja = 1 a 6 semanas; salud queda en `80 − 9·baja` (de 71 a 26; mínimo 15) |
| **Recuperación** | `pasoDeSemanaDelEstado` (PNJ), `WEEK_END` del personaje | PNJ: salud +25 por semana, baja −1. Personaje: baja −1 por semana; la salud sube +1 al día si estrés < 60 (`personaje/index.ts:553`) |
| **Quién tira el dado** | personaje: `WEEK_END` (`index.ts:511`); PNJ: `semanaDeportiva` (`npcs/index.ts:938`) | `rngEstable('lesion', semilla, id, semana)` y `rngEstable('gravedad', …)`: azar de cada uno, estable |
| **Agotamiento** | `personaje/index.ts:550` | Al cerrar el día, energía < 15 → salud −3 y aviso. Estrés > 75 → salud −2, motivación −3 |
| **Sobrecarga** | `kit-deporte/src/comunes.ts:226` | Más de 2 sesiones al día: salud −4, y el 15 % de las veces −10 y «Molestias musculares». **No produce baja** |
| **Constitución** `gen.constitucion` | `personaje/index.ts:218, 522` | Genérica 0–100; se forja +1 por «semana sana» (≥ 120 min activos, deuda ≤ 1 h, estrés < 60). Perks `constitucion_de_toro` y `endeble`: tope ±8 (`perks.ts:58–59`) |
| **Perks de recuperación** | `perks.ts:64–65`; revelación en `eventos/src/perks/revelaciones.ts` | Eficiencia ×1,15 / ×0,85 con la etiqueta `recuperacion`: **ninguna acción la lleva**, no tienen efecto |
| **Suceso de lesión** | `modules/eventos/src/salud/lesion.ts` | Clase `lesion`, vale para PNJ. Moral −6; decide por carácter: recuperarse bien (salud +5) o forzar (−1 semana de baja, salud −8, moral +2; solo con ≥ 2 semanas) |
| **Aviso a los demás** | `npcs/index.ts:948, 1795`; `events.ts:83` | `persona.lesion` (`LesionDePersonaData`: `npcId`, `semanas`, `deporte`) por cada lesión nueva de PNJ; `persona.estado` cambia el estado de alguien sin lesionar a un sano |
| **Estado del PNJ** | `EstadoDeJugador` | `fisica`, `moral`, `forma`, `salud`, `baja?` (semanas), `deuda?` (sueño). Solo los que juegan lo tienen |
| **Convocatoria y liga** | `futbol/src/convocatoria.ts` | Los de baja no se convocan; los grupos sin gente los cubre quien mejor se adapte |
| **Partido del fútbol** | `MOTOR_PARTIDOS.md` §0.7, §9 | **No hay lesiones en el partido**. Previsto: servicio `salud` y evento `salud.lesion`, sin implementar |
| **Sueño** | `sueno.ts` | Deuda `gen.sueno`, necesidad por edad, tope de energía al despertar (−2,5 por hora efectiva). `factorPorSueno` y `fatigaPorSueno` **preparados sin activar** |
| **Intensidad del partido** | `MOTOR_PARTIDOS.md` §6 | Relajado: «menos riesgo de lesión (cuando exista, E12)»; a tope, más |

### 1.2 Lo que da hoy, medido

Con las funciones reales (`pasoDeSemanaDelEstado`, 20.000 semanas por caso, azar fijo; script en el cuaderno de la sesión, no se añade al repositorio):

| Sesiones por semana | Constitución 20 | Constitución 50 | Constitución 80 |
|---|---|---|---|
| 0 | 0,24 lesiones/año, 1,7 % de semanas de baja | 0,22 / 1,5 % | 0,17 / 1,1 % |
| 2 | 0,38 / 2,6 % | 0,30 / 2,0 % | 0,23 / 1,6 % |
| 3 | 0,45 / 3,1 % | 0,36 / 2,5 % | 0,27 / 1,8 % |
| 5 | 0,58 / 3,9 % | 0,48 / 3,2 % | 0,35 / 2,3 % |

(La condición de equilibrio baja de 100 a 80 al pasar de 0 a 5 sesiones.)

### 1.3 Lo que falta o está mal

1. **Sin exposición.** Un partido de 90 minutos y un entrenamiento pesan igual en el riesgo; la competición solo cansa 8 puntos de condición. La epidemiología dice que el riesgo por hora de partido es ~5 veces el de entrenamiento.
2. **Sin edad ni crecimiento.** Un niño de 8 y un juvenil de 18 tienen el mismo riesgo; en la realidad el segundo se lesiona el doble por hora y el estirón cambia el tipo de lesión.
3. **Sin tipos, sin días.** Todo es «1 a 6 semanas». En la realidad más de la mitad de las lesiones con baja duran menos de una semana (golpes, torceduras leves) y un 10–15 % más de un mes.
4. **Sin historial.** Una lesión no aumenta el riesgo de repetirla, ni deja secuelas.
5. **Recaída solo por «forzar».** Y cuesta solo salud, no riesgo.
6. **La salud pesa poco y se ensucia:** baja por lesión, por agotamiento, por estrés y por sobrecarga, y se cura sola con el tiempo. No distingue enfermedad, lesión y desgaste.
7. **Sin enfermedades.** El resfriado es lo más frecuente en un niño y nunca ocurre; tampoco hay faltas por enfermedad ni contagio entre hermanos pese a tener hogares.
8. **Perks de recuperación sin efecto.**
9. **El suceso de lesión es único** y no sabe de qué lesión se trata.
10. **Los PNJ no se lesionan antes de crear la partida** (`DECISIONES.md` 03/11: «las lesiones no salen en la historia previa»): todos arrancan sanos. Es coherente con los huecos en la historia, pero conviene que un porcentaje arranque de baja (§6).

---

## 2. Modelo propuesto

### 2.0 Principios

- **Una sola copia de las reglas** en `packages/contracts/src/salud.ts` (nuevo, funciones puras), como `estado-de-jugador.ts` y `sueno.ts`. El personaje las lee con sus stats y un PNJ con su `EstadoDeJugador`; un test los ata, como en `mismas-reglas-estado.test.ts`.
- **El azar es de cada persona** (`rngEstable('lesion', semilla, id, …)`): lo que hace el jugador no cambia las tiradas de los demás.
- **Por exposición, no por semana.** La unidad es la hora de actividad (partido, sesión, otra) y el tramo en el partido. El paso semanal del PNJ suma sus horas de la semana y tira una vez (la misma probabilidad acumulada); el personaje y el partido tiran por actividad.
- **Todo es un dato** (tablas de tipos y factores): las cifras se calibran con `sim` sin tocar el código.
- **Sin números para el jugador** (principio 7): sensaciones, sucesos y, con el médico, un diagnóstico en lenguaje corriente.

### 2.1 Cuánto se lesiona uno: la tasa base

Datos de partida (fuentes en §11). Lesiones **con baja** por 1.000 horas de exposición:

| Actividad | Tasa de referencia | Lo que dice la literatura |
|---|---|---|
| Partido de fútbol | **14** | 14,4 (chicos) y 15,0 (chicas) por 1.000 h en fútbol base, frente a 2,8 y 2,6 en entrenamiento (metaanálisis de 2022, de Ste Croix y otros) |
| Entrenamiento del club | **2,8** | idem; academia alemana de élite (U12–U19): 2,6 por 1.000 h en total y el 66 % en entrenamiento |
| Otra actividad física (patio, quedada, gimnasio, carrera) | **1,0** | sin dato directo; menor que el entrenamiento por ser menos intensa y sin contacto organizado. A calibrar |

**Factor de edad** sobre la tasa de referencia (la del juvenil, 16–19):

| Edad | 8–10 | 11–12 | 13–15 | 16–19 | 20+ |
|---|---|---|---|---|---|
| × | 0,5 | 0,65 | 0,9 | 1,0 | 0,9 |

Base: las revisiones dan 3,7 por 1.000 h en edades menores (U9–U16) frente a 7,9 en mayores (U17–U21), casi el doble. El 0,9 de 13–15 recoge el efecto del estirón (más abajo).

**Con estas tasas, un jugador de club** (2 sesiones de 1,5 h, 36 semanas, y 20 partidos de 1,25 h de media por temporada):

| Edad | Entrenamiento | Partido | Total por año |
|---|---|---|---|
| 8–10 | 108 h × 2,8 × 0,5 = 0,15 | 25 h × 14 × 0,5 = 0,18 | **~0,3** |
| 13–15 | 108 h × 2,8 × 0,9 = 0,27 | 25 h × 14 × 0,9 = 0,32 | **~0,6** |
| 16–19, 3 sesiones | 162 h × 2,8 = 0,45 | 25 h × 14 = 0,35 | **~0,8** |

Es decir: **para los pequeños, casi lo mismo que hoy (~0,3); para los mayores, el doble**. Es un punto de partida, no un objetivo: se calibra con `sim:salud` (§4.1) y el usuario decide cuánto realismo quiere (duda 2). El objetivo que propongo para el balance son esas cifras con un margen de ±40 %.

### 2.2 Factores que multiplican la tasa

Todos son multiplicadores sobre la tasa base de la actividad; se aplican igual a todos.

| Factor | Cifra propuesta | Notas |
|---|---|---|
| **Fatiga** | `(1 + fatiga/40) / 2,2` (neutro con fatiga 48) | La forma actual del modelo, normalizada para que un jugador típico valga ×1. Incluye `fatigaPorSueno` |
| **Deuda de sueño** | `1 + 0,05 · deudaEfectiva` directo, además del camino por la fatiga (`+4·deuda`) | Con deuda de 6 h (efectiva 5): ×1,25 × 1,27 ≈ ×1,6. La literatura da ×1,7 en adolescentes que duermen menos de 8 h (Milewski 2014). Se calibra con `sim` |
| **Constitución** | `1,4 − 0,8·c/100` (como hoy: de ×1,4 a ×0,6) | Sin cambios. Los perks `Constitución de toro` y `Endeble` ya mueven el tope |
| **Edad** | tabla de §2.1 | |
| **Crecimiento (estirón)** | traumáticas ×1,25 y sobrecarga ×1,0 en la ventana del pico de crecimiento (±6 meses); sobrecarga ×1,6 en el año siguiente | Del pico de velocidad de crecimiento: más lesiones traumáticas en el año del pico y más de sobrecarga después (van der Sluis 2014 y revisiones posteriores). La ventana sale de la `madurez` del cuerpo (`ANEXO_CUERPO.md`) |
| **Intensidad** | relajado ×0,7; normal ×1; a tope ×1,35 | Coherente con `MOTOR_PARTIDOS.md` §6 (relajado «menos riesgo», a tope más) |
| **Historial** | misma zona en los últimos 12 meses ×1,5 (baja con el tiempo); en las 2 semanas tras volver ×2 (recaída, §2.4) | Haber tenido una lesión es el mejor predictor de otra; la cifra exacta se contrasta antes de fijarla |
| **Salud baja** | `salud < 60`: `×(1 + (60 − salud)/100)` | Hoy la salud baja resta rendimiento pero no sube el riesgo |
| **Superficie** | césped natural ×1; artificial ×1,1; tierra o mal estado ×1,25; asfalto del patio, contusión ×1,3 | Evidencia débil en niños: **dato del campo** (`CIUDAD`), prioridad baja (F7) |
| **Perks** | `Recuperación rápida` ×0,8 y `lenta` ×1,25 en la **duración** (no en el riesgo); Endeble y Constitución de toro por la constitución | Activa por fin los perks de E5.6 |
| **Sexo** | ligamento cruzado y sobrecarga ×2 en chicas desde el pico de crecimiento; el resto igual | Dato real en la literatura; **duda 9** |
| **Preparación del club** | ×0,8 en clubes con fisio o preparador (los grandes y medianos de `CIUDAD_Y_LIGAS.md`) | Programas de prevención (FIFA 11+: −30 % de lesiones, Soligard 2008). Dato del club; F6 |

### 2.3 Tipos de lesión

Ocho tipos; el **tipo** se sortea cuando ya hay lesión, según el contexto (contacto o no, edad, fatiga, crecimiento). Las cuotas son un punto de partida con base en lo que dicen las series de fútbol base y de élite (muslo, tobillo y rodilla son lo más frecuente; el 84 % de las lesiones es de miembro inferior en la academia alemana), pero **las cuotas por tipo no están contrastadas aquí con una fuente única**: hay que ajustarlas con `sim:salud` y revisarlas.

Gravedad por días de baja, con las categorías del consenso de fútbol (Fuller 2006: *leve* 1–3, *mínima* 4–7, *moderada* 8–28, *grave* más de 28 días):

| Tipo | Cuota | Duración (días) | Cuándo | Recaída (8 semanas) | Sucesos y texto |
|---|---|---|---|---|---|
| **Golpe / contusión** | 22 % | 1–7 (el 80 %, ≤ 3) | Contacto: partido, patio | 2 % | «Un golpe en la espinilla», «un balonazo» |
| **Esguince** (tobillo, rodilla) | 20 % | grado I 4–14; II 14–42; III 42–120. Reparto 65/28/7 | Giro, caída, contacto | 8 % | «Se te dobla el tobillo» |
| **Distensión o rotura muscular** (isquios, cuádriceps, aductores) | 25 % | grado I 7–14; II 21–42; III 60+ | Sin contacto: sprint, fatiga. Sube con la edad | **12 %** | «Un pinchazo en el muslo» |
| **Sobrecarga / tendinopatía / apofisitis** (Osgood, Sever) | 15 % | 14–56, con aviso previo | Carga acumulada; ligada al crecimiento | 15 % | «Te duele la rodilla al bajar escaleras» |
| **Fractura** | 3 % | 28–84 | Contacto fuerte, caída | 1 % | «Una caída mala» |
| **Conmoción** | 3 % | 7–28 con protocolo de vuelta | Choque de cabeza | 3 % | «Un choque de cabezas» |
| **Ligamento cruzado u otra rotura grave** | 1 % | 180–270 | Giro sin contacto | 5 % | «Se te va la rodilla» |
| **Otras** (heridas, cortes, torceduras leves) | 11 % | 1–3 | cualquiera | 1 % | detalles ligeros |

Reparto de gravedad que sale: **~60 % de menos de una semana** (leve y mínima), **~28 % moderada** y **~12 % grave**, que es lo que dan las series de fútbol base. Duración del tipo: tirada en su rango con el azar `gravedad` de la persona, y luego `× constitución` (de ×1,15 con 0 a ×0,85 con 100), `× perk de recuperación`, `× médico o fisio` (§2.4) y `× salud` (con salud < 60 dura más).

**Sobrecarga y molestia: dos pasos.** La sobrecarga no es un golpe: llega avisada. La carga acumulada de la semana por encima de un umbral personal (constitución, edad, crecimiento) produce primero una **molestia** (marca oculta, sin baja, que aparece como sensación y suceso) y, si se sigue cargando, la lesión. Sustituye a las «molestias musculares» del kit (`comunes.ts:226`) y al daño de salud por la tercera sesión: la tercera sesión del día sube el riesgo de sobrecarga en vez de quitar salud directamente.

### 2.4 Recuperación

Una lesión tiene **días de baja** y **tres fases**:

| Fase | Duración | Qué se puede hacer | Qué pasa |
|---|---|---|---|
| **Aguda** | los primeros ~40 % de la baja | Nada físico. Se puede estudiar, ir a clase, ver partidos (E12.4), hablar | La forma baja −2 por semana y las capacidades físicas decaen como sin práctica (el motor ya tiene la caída) |
| **Rehabilitación** | el ~45 % siguiente | Entrenar **sin contacto** (rendimiento ×0,6 y no suma sesión de club), fisio. No se juega | La salud sube; si se hace fisio, la baja se acorta (×0,8) |
| **Vuelta** | 2–6 semanas tras el alta, según tipo | Todo, con **riesgo de recaída** | `riesgo ×2` decayendo linealmente a ×1 (primeras 2 semanas), forma baja, y al jugar la primera vez baja la nota esperada |

**Recaída:** hazard semanal tras el alta = `recaída(tipo)/semanas de vuelta`, decayendo; con «forzar la vuelta» ×3 y la duración cae un 25 % (hoy «una semana menos»). Una recaída es una lesión nueva del mismo tipo y zona, con la duración del tipo +30 %.

**Médico y fisio** (acciones y datos de la ciudad, no un módulo nuevo):
- **Médico** (centro de salud, `ConversacionService`-like, 1 h): diagnóstico (tipo y rango de días en lenguaje corriente) y alta. **Sin médico**, la lesión es «te duele el tobillo» y la duración real no se enseña.
- **Fisio** (clubes grandes y medianos: gratis en el club; fuera: acción en el centro): rehabilitación guiada, duración ×0,8 en moderada y grave y menos recaída. Sin sistema monetario (E16) se paga con tiempo.
- El **entrenador** reacciona (relación) a quien esconde una molestia y se lesiona, o a quien vuelve antes de tiempo.
- Los **padres** llevan al médico a los menores de 12 años (el 80 % de los días, la misma regla que las recogidas de `hogares.md`).

### 2.5 Enfermedades comunes

Tres, con **días** de duración y el contagio del mundo:

| Enfermedad | Frecuencia | Duración | Efecto |
|---|---|---|---|
| **Resfriado** | niños de 8–12 años: ~5–6 al año; adultos: 2–3 | 3–7 días | Energía máxima −10, rendimiento ×0,9; puede ir a clase y a entrenar (contagia y empeora) |
| **Gripe** | ola anual; un 10–20 % de los niños | 5–10 días | Fiebre: no va a clase ni compite 3–5 días (baja general), rendimiento ×0,6, energía máxima −25 |
| **Gastroenteritis** | 0,5–1 al año | 2–4 días | Un día de cama; después ×0,85 |

(Cifras de resfriados en niños: entre 5 y 12 al año según la fuente; la epidemiología de adultos es 2–3. Dato a calibrar, §4.1.)

**Estacionalidad** (curso escolar, hemisferio norte), factor mensual sobre la tasa de resfriado: ene 1,5; feb 1,4; mar 1,1; abr 0,8; may 0,6; jun 0,5; jul 0,4; ago 0,4; sep 1,0; oct 1,2; nov 1,4; dic 1,5 (media 1). La **gripe** es una **ola** del mundo, con intensidad aleatoria cada año (`rngEstable('gripe', semilla, año)`), centrada en enero y con ±4 semanas: afecta a todos con la misma regla, y es un evento compartido (`salud.epidemia`).

**Factores del individuo:**

| Factor | Cifra |
|---|---|
| Deuda de sueño | `×(1 + 0,25·deudaEfectiva)` (deuda efectiva 4 ⇒ ×2; 8 ⇒ ×3). Las pruebas en adultos dan ×3 con menos de 7 h (Cohen 2009) y más con menos de 6 h (Prather 2015) |
| Estrés | `×(1 + 0,02·max(0, estrés − 50))` (hasta ×2 con estrés 100) |
| Constitución | `1,3 − 0,6·c/100` |
| Desgaste crónico (§2.6) | ×1,3 con 50 o más |
| Contagio | hermano o conviviente enfermo ×2,5 esa semana; la clase con una ola, ×1,3 |
| Edad | niños 8–12: ×1,3; 13–17: ×1; adultos: ×0,6 |

Un enfermo está **ausente**: no va a clase (falta justificada: no cuenta para la asistencia, `DECISIONES.md` sobre faltas), se queda en casa (la agenda lo cambia: `agendas.ts` no se toca en F5, se marca como «en cama» con el estado) y no se le convoca. Es lo que hace creíble que «el compañero no vino».

### 2.6 Salud general: desgaste y agotamiento

`gen.salud` pasa a ser el **estado agudo** (lesión o enfermedad). Para lo crónico se añade **`gen.desgaste`** (oculta, 0–100):

- **Sube** al día con: estrés > 60 (+1), deuda efectiva ≥ 4 (+1), energía < 15 (+2), carga alta (cuarta sesión de la semana en adelante, +0,5).
- **Baja** −2 por día de descanso real (sin clase ni sesión) y −1 por noche bien dormida.
- **≥ 50:** enfermedades ×1,3 y lesiones ×1,15 (el cuerpo «no acaba de recuperarse»).
- **≥ 80:** **agotamiento** (en la salud mental y física del deportista joven, `burnout`): la motivación máxima baja 20, rendimiento ×0,9, y un suceso del tutor o los padres propone una semana de descanso. Se sale con descanso, no con una acción.

Esto absorbe lo que hoy hace `DAY_END` (agotamiento −3 salud, estrés > 75: −2 salud y −3 motivación) con una sola pieza que acumula y se recupera, y es lo que el sueño preparado pide con «deuda ≥ 6 h tres días seguidos → agotamiento crónico» (`dormir.md` §3.3). **No se plantea ninguna enfermedad mental clínica en esta fase**; el desgaste es un estado de carga y recuperación.

### 2.7 Cómo se siente (sin números)

Principio 7: el jugador siente los datos, no los gestiona. Qué ve y cómo:

| Estado | Sensación | Dónde |
|---|---|---|
| Riesgo alto sin lesión (carga + fatiga + sueño) | «Notas las piernas pesadas» / «te molesta el tobillo» (la molestia) | Registro del día y suceso de molestia |
| Lesión | «Un pinchazo en el muslo: tienes que parar». Sin médico no sabes cuánto | Registro, ficha del cuerpo |
| Con diagnóstico | «Una distensión en el muslo: unas tres semanas» | Médico |
| En rehabilitación | «Ya trotas sin dolor» | Fisio, registro semanal |
| Vuelta | «Vuelves, pero con cuidado» (sin número de recaída) | Suceso de alta |
| Enfermo | «Estás destemplado» / «ardes de fiebre» | Despertar |
| Desgaste | «Llevas semanas arrastrándote» | Despertar y tutor |
| Ojos de los demás | «Fulano no ha venido: está con gripe» | Ficha, clase |

En la alfa se pueden enseñar los números (el modo de pruebas actual) con el mismo interruptor del resto de stats.

**Sucesos nuevos** (cada uno es un archivo en `modules/eventos/src/salud/`, sin tocar el motor; formato en `ANEXO_EVENTOS.md`): `molestia` (descansar un día, ir al médico o seguir), `lesion` (se generaliza por tipo con textos por zona), `visita_medico`, `fisio`, `vuelta` (con prudente o ambicioso), `recaida`, `resfriado` (quedarse o ir igual), `gripe`, `contagio_en_casa`, `ola_de_gripe_en_clase`, `agotamiento`, `compañero_lesionado` (visitarlo: relación) y `padres_ante_la_lesion`. El de la bifurcación de E12.4 (estudiar o ver deporte en la baja da más conocimiento) pasa por el estado de «baja» ya existente: la acción de ver partidos del club no se bloquea y rinde más. Hay que tener en cuenta el cupo de sucesos (`PLAN_EVENTOS.md`, 6 por semana de media) y el chequeo «Ritmo de los eventos».

---

## 3. Activar los efectos preparados del sueño

Lo que está en `sueno.ts` y `BACKLOG_STATS.md` E12.3, y lo que propongo activar. **Una cosa a la vez**, midiendo con `sim` antes y después de cada una (`CLAUDE.md`: «Al cambiar números de balance»).

| Efecto | Cifra preparada | Recomendación | Dónde engancha | Qué se mueve en `sim` |
|---|---|---|---|---|
| **Deporte** `factorPorSueno(d, 0,015)` | ×(1 − 0,015·d) | **Activar** en `eficienciaDeEstado` (personaje y PNJ) | `estado-de-jugador.ts`; modificador `gen.sueno` del personaje | Casi nada: los bots que cuidan el sueño no tienen deuda; solo `sobreentrena`, `vago` y `madrugador` pierden (a propósito) |
| **Concentración y estudio** `factorPorSueno(d, 0,02)` | ×(1 − 0,02·d) | **Activar** (etiquetas `estudio` y `mental`) | modificador nuevo `gen.sueno` | `sim:notas` no cambia (el banco duerme 10 h); las notas del vago y el madrugador bajan |
| **Riesgo de lesión** `fatigaPorSueno = 4·deuda` | suma a `fatigaDeLaSemana` | **Activar** y añadir el factor directo de §2.2 | `fatigaDeLaSemana(…, deuda)` | Lesiones de los bots con poco sueño ×1,3–1,6 |
| **Estrés** | alivio nocturno `×(1 − d/10)`; fin de día `+0,3·d` | **Activar** | `gen.dormir`, `DAY_END` | «Las estrategias razonables mantienen la salud»: vigilar el madrugador |
| **Motivación** | −0,7 por hora que falta esa noche (máx. −4); punto de equilibrio −1·d | **Activar** (sustituye el −2 plano) | `gen.dormir`, `DAY_END` | Muy poco: ya se cobra −2 con menos de 7 h |
| **Salud: «agotamiento crónico»** | deuda ≥ 6 h tres días seguidos: salud −1 al día | **No** como salud directa: **entra en `gen.desgaste`** (§2.6) | `DAY_END` | Sobreentrena llega a salud 0 hoy: se mantiene |
| **Enfermedades** | «resfriados más probables» | **Activar con F5** (§2.5) | | Nuevo |

**Calibración con `sim`** (por orden):
1. `npm run sim` y `npm run sim:notas` antes. Se apuntan los 12 chequeos y la tabla (`CLAUDE.md`).
2. Activar solo rendimiento (deporte y estudio): `sim` otra vez. Deben moverse, y solo, `sobreentrena`, `vago`, `madrugador`, y `aleatorio` (cambia su huella). Si «El esfuerzo hace progresar» baja de +9,7, se explica por el bot, no por el modelo.
3. Estrés y motivación: `sim` otra vez; vigilar «Las estrategias razonables mantienen la salud» (hoy equilibrado 85, atleta 93).
4. Riesgo de lesión: junto con las lesiones tipadas (F3), para no calibrarlo dos veces. Objetivo: con deuda efectiva 5 el riesgo sube a ×1,5–1,8 (Milewski ×1,7). Con `sim:salud` (§4.1).
5. `npm run huella -- 60` **cambia** en las fases 2 a 3, porque los bots tienen deuda: es esperado y se explica. En la fase 1 (cifras sin activar) sale idéntica.

---

## 4. Cómo se calibra

### 4.1 Una herramienta nueva: `npm run sim:salud`

Como `sim:cuerpo` y `sim:eventos`: jugadores de cada edad, deporte y constitución, años de partida con la rutina de club, y compara con los objetivos:

| Qué | Objetivo propuesto |
|---|---|
| Lesiones con baja por jugador de club y año | 0,3 (8–10), 0,6 (13–15), 0,8 (16–19) ± 40 % |
| Tasa por 1.000 h | partido 14 ± 40 %, entrenamiento 2,8 ± 40 % |
| Reparto de gravedad | leve+mínima 55–65 %, moderada 25–30 %, grave 8–15 % |
| Semanas de baja de un jugador de club | 4–8 % |
| Reparto por tipo | cada tipo dentro de ±5 puntos de §2.3 |
| Recaídas | 8–15 % de las lesiones musculares en 8 semanas |
| Efecto del sueño | deuda efectiva 5: riesgo ×1,5–1,8 |
| Efecto de la constitución | de 20 a 80: ×1,7 a ×2 en el riesgo |
| Resfriados | 4–7 al año en 8–12 años; 2–3 en adultos; pico dic–feb |
| Días enfermo al año | 12–25 en niños, 6–12 en adultos |

### 4.2 Qué pasa con la plantilla (el efecto en convocatorias)

Con una indisponibilidad total (lesión + enfermedad) `p` por jugador y semana, la probabilidad de quedarse sin los 14 que mínimo hacen falta (`MOTOR_PARTIDOS.md` §8: 16 convocados, y plantillas de 14 con todos):

| Plantilla | p = 7 % | p = 12 % | p = 18 % |
|---|---|---|---|
| 16 jugadores, menos de 14 disponibles | 9,7 % | 30 % | 57 % |
| 18 jugadores, menos de 14 disponibles | 0,7 % | 5,6 % | 21 % |
| 22 jugadores, menos de 14 disponibles | 0,0 % | 0,1 % | 1,0 % |
| 18 jugadores, menos de 11 (no hay equipo) | 0,00 % | 0,06 % | 0,86 % |

(Cálculo binomial, no es una medida del juego.) Lectura: con la indisponibilidad del 7–12 % que propongo, **las plantillas de 16 se quedan cortas muy a menudo** y las de 18 o más aguantan. Hay que **medir con la ciudad grande** el reparto real de plantillas y, si hace falta, que el reparto de equipos deje 18 en lugar de 16 donde sea posible o que `convocatoria.ts` complete con cadetes del filial (la regla ya existe en «completar antes de cerrar»). No es un recorte: es lo que hace un club real.

---

## 5. En el partido: el punto de enganche

**No se diseña el motor de partidos** (lo hace `claude/partidos-reales`, que todavía no ha subido rama): solo dónde y cómo se engancha la salud, para que ellos lo prevean. Propuesta a acordar.

### 5.1 La pieza: una función pura, no un servicio

`MOTOR_PARTIDOS.md` §9 previó un servicio `salud` (contrato nuevo en `services.ts`) que el fútbol consulta. **Propongo cambiarlo por funciones puras en `contracts/src/salud.ts`**, por la misma razón que `estado-de-jugador.ts` no es un servicio: el partido ya tiene en cada jugador lo que hace falta (constitución, edad, perks, energía, deuda, historial) y el personaje lo lee de sus `gen.*`. Un servicio añadiría un módulo que habría que llamar 10.000 veces por jornada. **Sigue siendo compatible con el espíritu de §9** («sin la pieza, la probabilidad es 0»): el partido solo llama si el deporte lo activa.

```ts
// packages/contracts/src/salud.ts (propuesta, no existe)
interface ConsultaDeRiesgo {
  actividad: 'partido' | 'sesion' | 'otra';
  horas: number;                 // 0,25 por tramo de partido
  contacto?: number;             // 0 a 1: duelos, entradas y faltas de esa jugada o tramo
  intensidad?: 'relajado' | 'normal' | 'a_tope';
  persona: { edad: number; sexo?: 'm' | 'f'; constitucion: number; salud: number;
             fatiga: number; deuda: number; desgaste?: number;
             madurezDelEstiron?: number; historial?: UltimaLesion[]; perks?: string[];
             superficie?: string };
}
riesgoDeLesion(q: ConsultaDeRiesgo): number           // probabilidad en esa exposición
sortearLesion(q, azarTipo, azarDuracion): Lesion      // tipo, zona y días
```

### 5.2 Qué pide al motor de partidos

| Punto | Qué | Por qué |
|---|---|---|
| **Cuándo** | En cada tramo de 15 minutos, para cada jugador en el campo | Para que pueda pasar «en cualquier tramo» (decisión del usuario, 01/11) |
| **Exposición** | Horas del tramo (0,25) y **jugadas de contacto** del jugador en el tramo (duelos, entradas, faltas): si el motor las cuenta, el riesgo las pondera; si no, un valor por puesto (`PARTICIPACION_DEL_PUESTO`) | El contacto concentra los golpes y las fracturas; sin él, tipo muscular |
| **Azar propio** | `rngEstable('lesion-partido', semilla, idDelJugador, idDelPartido, tramo)`, **sin tocar el azar del partido** | Que añadir lesiones no cambie los goles antes de la lesión, y que el personaje no altere a los demás |
| **Salida** | `ResultadoDePartido.lesiones: { jugador, tramo, minuto, tipo, zona, dias }[]` | El motor las devuelve; no las aplica |
| **Qué hace el partido** | El jugador sale; entra un suplente si quedan cambios; si no, **juega con uno menos** (todas sus zonas × 10/11, como una expulsión, `MOTOR_PARTIDOS.md` §5.7) | Es lo que `MOTOR_PARTIDOS.md` §9 ya dijo. Lo hace el motor de partidos, la lesión solo avisa |
| **Cómo se aplica** | Personaje: evento compartido `salud.lesion` que recoge `personaje` (pone la baja y los efectos). PNJ: el manejador `partido.mundo` de `npcs` pone `estado.lesion` | Misma regla: lo aplica quien guarda el estado |
| **Después** | `competicion.resultado` ya existe; los minutos reales jugados salen del resultado (el que se lesiona en el tramo 3 jugó 45) | Para `historial` y para que no cobre la semana otra vez |

**Sin doble cuenta:** el paso semanal del PNJ **no** cuenta los partidos que sí resuelve el motor (solo sesiones y otra actividad), y el personaje igual. Para una carrera de atletismo (`competicion.mundo`) el mismo patrón: el deporte llama a la misma función con `actividad: 'partido'`-like (nueva etiqueta `competicion`) y avisa.

**Lo que se necesita de `partidos-reales`:** (a) si cuenta jugadas de contacto por jugador y tramo; (b) que `jugarPartido` devuelva el cuadro de lesiones y acepte `jugadoresFueraDeCombate` para retirar a alguien a mitad; (c) coordinar el nombre y la forma del evento `salud.lesion`; (d) un momento definido para el cambio forzado. **Pregunta abierta para esa sesión:** si el motor pasa a más de 6 tramos, la tasa por tramo es `base × horas` y no cambia.

### 5.3 Qué ve el jugador del partido

Si se lesiona el personaje, el partido sigue (el resultado es de la sesión de partidos) y el diario cuenta **cuándo** y **cómo** («En el minuto 62, en un salto, caes mal sobre el tobillo»). La decisión «seguir jugando con la molestia» pertenece a las decisiones dentro del partido (F7 del fútbol) y queda fuera.

---

## 6. PNJ: la misma regla

### 6.1 Reglas

- **La misma función** que el personaje (`riesgoDeLesion`, `sortearLesion`, `pasoDeSuenoDeLaSemana`, enfermedad…), con los inputs del PNJ: `Npc.cap` (constitución), `genetica.perks`, edad, `EstadoDeJugador` y `suenoHabitual` (derivado, ya existe). Un test de equivalencia como el de `mismas-reglas-estado.test.ts`: misma persona, mismo resultado en personaje y PNJ.
- **Estado:** `EstadoDeJugador` gana `lesion?: { t: tipo, d: días restantes, f: fase, z?: zona }` y `desgaste?`; `baja` pasa a derivarse de `lesion.d` (`Math.ceil(d/7)`) para no tocar a quien ya lo lee (convocatoria, kit, fútbol, atletismo, `estadoDeJuego.baja`). `enfermedad?: { t, d }`. `SAVE_VERSION` sube y se migra (los antiguos `baja` en semanas pasan a `d = 7·baja`).
- **Paso semanal** (`pasoDeSemanaDelEstado`): suma las horas de la semana (sesiones × h; las de partido las pone el motor) y tira una vez; si hay lesión sortea tipo y duración. Una sola tirada por persona y semana, el coste que hay hoy.
- **Para los que no tienen estado** (adultos, niños sin deporte, padres, vecinos): **enfermedad derivada y sin estado** (como `suenoHabitual`): `enfermo(id, semana)` sale de un azar estable y del calendario (hogar, ola, estación). Es suficiente porque no tienen consecuencias de juego más que estar ausentes. **Duda 5.** Alternativa: estado completo para todos (más pesado, y casi nunca importa).
- **Antes de crear la partida:** un porcentaje de los PNJ con estado arranca de baja o enfermo según la fase del año (la historia previa no los lesiona hoy: `DECISIONES.md` 03/11). Con p ≈ 5–8 % de semanas de baja y p ≈ 5 % de enfermos en enero, el 8–12 % de los jugadores empieza no disponible. Sale de una sola tirada estable por persona al crear (no simula años de lesiones: «calcular por bloques no es recortar» exige que dé lo mismo que simularlo, y un test lo comprueba como el de la historia deportiva).

### 6.2 Lo que cambia en el mundo

- **Convocatorias y liga:** ya excluyen a los de baja (`convocatoria.ts`). Con las tasas de §2, un equipo típico tiene 1–2 de baja cada semana. Ver §4.2: las plantillas de 16 se quedarán cortas con frecuencia.
- **Atletismo:** `competicion.mundo` ya excluye a los de baja de las carreras. La misma regla.
- **Abandono:** una lesión grave puede subir la probabilidad de dejarlo el verano siguiente (`abandono.ts`: es el sexto motivo de la lista; dato del deporte, F7).
- **Moral:** una lesión larga baja la moral (el suceso ya lo hace: −6); la vuelta la sube.
- **Relaciones:** el compañero lesionado se puede visitar; ya hay sucesos de grupo.

### 6.3 Coste con el mundo grande (6.100 jugadores con estado; unas 14.000 personas con hogares)

Medido con un microbench (`pasoDeSemanaDelEstado` y `rngEstable`, 200.000 repeticiones):

| Operación | Coste |
|---|---|
| `pasoDeSemanaDelEstado` completo | 0,12 µs |
| `rngEstable(…).next()` | 0,12 µs |

Con esto, **estimado** (no medido en el juego completo):

| Pieza | Cálculo | Coste por cruce de semana (escritorio) |
|---|---|---|
| Tirar lesión y enfermedad de 6.100 jugadores | 6.100 × (0,12 + 0,12 + resto ≈ 1) | ~ 5–8 ms |
| Enfermedad derivada de 14.000 personas | 14.000 × ~0,5 µs | ~ 7 ms |
| Tiradas por tramo en los partidos (77 partidos × 22 × 6) | ~ 10.000 tiradas × ~1 µs | ~ 10 ms, dentro de los 79 ms de la liga |
| Sucesos por persona de la clase `lesion` | medido, `medir-rendimiento-2.md` §1 | **+15,5 ms** (+13 %) |
| Sucesos de enfermedad (clase nueva) | 7–8 µs por persona y semana | **+40–50 ms** si se activa para todos; **sin sucesos** para los no jugadores es ~0 |
| **Total propuesto** | | **~ 35–45 ms** sobre un cruce de 75–240 ms; en un móvil ×4,3 son ~0,15–0,2 s. Es lo que ya costaba activar los sucesos de PNJ |

**Peso en el guardado** (estimado): `estado.lesion` solo existe en quien está lesionado (~6 % de los jugadores, ~ 10 bytes en JSON); el historial de lesiones por persona seguiría el patrón de `Npc.historial` (totales por tipo + las últimas 12 en forma de números cortos): ~ 40–80 bytes por jugador de club, **~ 250–500 KB** con 6.100 jugadores a 10 años, el 2–3 % de los 16.800 KB del mundo grande. Sin recortes (principio 4). **Se mide** con `npm run rendimiento` en F3 antes de aceptar.

**Qué no se hace:** la lesión de los PNJ lejanos no se simula con una fórmula agregada («las mismas reglas»; la misma razón por la que `medir-rendimiento-2.md` rechaza resolver la liga lejana con una fórmula).

---

## 7. Efecto en el balance (qué chequeos de `sim` se mueven)

Línea de base (`npm run sim`, `dormir.md` H.6): 12 chequeos en ✅ salvo la velocidad de la máquina. Qué puede pasar al activar lo de arriba, por chequeo:

| Chequeo | Qué pasa | Fase | Por qué |
|---|---|---|---|
| **El esfuerzo hace progresar** (+9,7 atletismo; +5,3 de nota) | Baja algo | F2, F3, F5 | Las bajas por lesión (~3–5 % de las semanas) y las enfermedades (~5–7 % de los días con rendimiento ×0,8) quitan tiempo útil: **−3 a −6 % de entrenamiento y estudio**. Hay que explicarlo, o enseñar a los bots a descansar y volver con cuidado |
| **Esforzarse rinde más que no hacer nada** (30,1 frente a 20,6) | Se mantiene o mejora | F2, F3 | El vago duerme poco y se lesiona y enferma más |
| **Sobreentrenar no compensa** (−8 %, salud final 0) | Más holgado | F2, F3 | Sobrecarga con riesgo propio; más lesiones y baja |
| **Las estrategias razonables mantienen la salud** | **Es el que más vigilar** | F3, F5 | Hoy se mide por `gen.salud` final < 50. Con lesiones y enfermedades la salud sube y baja más. Riesgo: un bot razonable acaba con 40 en un mal momento. Se mide la salud **media** o el estado a final de semana, no el instante: ajuste del chequeo explicado, no el del juego |
| **Especialista supera al equilibrado** | Se mantiene | | El efecto es parecido para todos |
| **Las carreras son una competición real** | Se mueve por el azar | F3 | El personaje y los rivales faltan a algunas pruebas |
| **No hay estrategia dominante** | Se mantiene | | |
| **Rendimiento** (ms por acción, 1,66–1,9) | Se vigila | F2 | Un modificador nuevo (`gen.sueno`) cuesta ~ 0,02 ms por acción; ya hay umbrales de rendimiento |
| **Ritmo de los eventos** (aviso con > 10 por semana) | Puede dar ⚠️ | F6 | Los sucesos nuevos de salud. Se pone un cupo de salud propio y se mide con `sim:eventos` |
| `sim:notas` | Sin cambio | F2 | El banco duerme 10 h; con enfermedades baja la nota 0,1–0,2: se mide |
| `sim:vida` | Cambia | F3, F5 | Se lesiona y enferma toda la vida: nivel frente a tope por edad baja 1–3 puntos |
| `sim:futbol`, `benjamin` | Cambia | F4 | Plantillas con bajas (§4.2); el test de benjamín cuenta ya a los disponibles |
| `npm run huella` | **Cambia** en F2, F3, F4, F5 (a propósito); **idéntica** en F1 | | |

**Los bots se arreglan, el juego no** (`CLAUDE.md`): en F3 hay que enseñarles a no entrenar de baja (ya lo impide la acción), a ir al médico y a descansar cuando hay molestia o enfermedad. Los bots que no lo hagan (`sobreentrena`, `aleatorio`) deben salir peor, que es lo que se busca.

---

## 8. Fases (mi recomendación)

Cada fase cierra con `npm run check` y, donde se indica, `sim` antes y después.

| Fase | Qué | Cambia el juego | Chequeos / medidas | Esfuerzo |
|---|---|---|---|---|
| **F1** | `contracts/src/salud.ts`: tablas de tipos, factores, funciones puras (`riesgoDeLesion`, `sortearLesion`, recuperación, recaída, enfermedad, desgaste) con tests de rango y de equivalencia. **Sin llamarlas.** Más `npm run sim:salud` (epidemiología) y actualizar `ANEXO` nuevo `docs/ANEXO_SALUD.md` | **No** (`huella` idéntica) | `sim:salud` contra los objetivos de §4.1 | Medio |
| **F2** | **Activar el sueño** (§3): deporte, estudio, estrés, motivación, fatiga. Los PNJ por `eficienciaDeEstado`. Sin tocar aún las lesiones | Sí, solo los bots con deuda | `sim` antes/después; `sim:notas`; `huella` cambia (explicar) | Pequeño |
| **F3** | **Lesiones tipadas con días** para el personaje y los PNJ: `EstadoDeJugador.lesion`, recuperación en fases, recaída, perks, constitución. `baja` derivada. Sucesos: se generaliza `eventos.salud.lesion`. Medir peso y coste con `rendimiento` y `eventos:rendimiento` | Sí | `sim`, `sim:salud`, `sim:vida`; migración `SAVE_VERSION`; plantillas (§4.2) | **Grande** |
| **F4** | **Partido**: tirada por tramo y por actividad (atletismo igual), `ResultadoDePartido.lesiones`, evento `salud.lesion`. **Coordinado con `partidos-reales`** | Sí | `sim:futbol`, `benjamin`, test del partido | Medio; depende de la otra sesión |
| **F5** | **Enfermedades**: resfriado, gripe, gastroenteritis, estacionalidad, contagio por hogar, ola de gripe, ausencia en clase. Derivada para los que no tienen estado | Sí | `sim`, `sim:notas`; coste de PNJ | Medio |
| **F6** | **Médico, fisio, sucesos de salud, interfaz** (sensaciones sin números, lista del cuerpo, «Pendiente»), `gen.desgaste` y agotamiento; revisar el chequeo de salud | Sí | `sim:eventos`; `eventos:validar` y `eventos:mapa`; cupo de salud | Grande |
| **F7** | Secuelas de lesiones graves, historial de lesiones por persona y su efecto en el abandono; superficie y preparación del club; datos por sexo | Sí | `sim:vida` | Pequeño y medio |

**Orden y por qué:** F1 sin riesgo y deja el terreno medible. F2 es lo que el usuario ya aprobó preparar y es pequeño. F3 es el corazón y cambia la partida; conviene hacerlo antes de enganchar el partido (F4) para tener los datos del jugador. F4 espera a que `partidos-reales` fije el contacto. F5 y F6 pueden ir en paralelo con distinta gente (F5 es de datos y de `npcs`; F6 de eventos e interfaz). Si hay que recortar, **F1 a F4 forman el mínimo** (lesiones reales en partido y entrenamiento); F5 a F7 son las capas de riqueza.

---

## 9. Dudas para el usuario (cada una con mi recomendación)

1. **¿La baja pasa a días?** Hoy es en semanas (`gen.baja`, 0–12). El 60 % de las lesiones reales dura menos de una semana. **Recomiendo días** (`lesion.d`), con `baja` en semanas derivada; cambia el estado guardado y se migra.
2. **¿Cuánto se lesiona uno?** Mi punto de partida es ~0,3 al año a los 8–10, ~0,6 a los 13–15 y ~0,8 de los 16 a los 19 años, y 4–8 % de las semanas de baja. Es más que hoy (0,3–0,5, 2–3 %). **Recomiendo ese realismo**, con el personaje igual que los demás (sin trato especial), y revisarlo tras jugar.
3. **¿Secuelas de las lesiones graves?** El diseño de stats habla de «tope 90, se quedó en 70 por lesiones». **Recomiendo sí, pequeñas y solo en las graves** (más de 28 días, ~12 % de las lesiones): constitución −1 a −3 o un perk de molestia crónica («rodilla delicada») que se revela con los años; en F7.
4. **¿Médico y fisio con dinero?** No hay sistema monetario (E16). **Recomiendo tiempo** como coste en F6 (una acción de 1 h), gratis en los clubes con fisio, y dinero cuando exista.
5. **¿Enfermedad completa para toda la población o derivada para los que no juegan?** **Recomiendo derivada** (sin estado, como `suenoHabitual`) para quien no tiene estado, y completa para los jugadores. Los datos son de verdad donde importan.
6. **¿Cuánto bloquea una enfermedad?** **Recomiendo:** el resfriado no obliga a nada (rendimiento ×0,9, contagia) y la gripe te deja 3–5 días en casa sin clase ni deporte; la falta no cuenta como falta injustificada. El jugador puede ir enfermo a una cita ligera pero lo paga.
7. **Lesión en el partido: ¿automático o decisión?** **Recomiendo automático** (sale del campo, `MOTOR_PARTIDOS.md` §9) y la decisión de seguir jugando se deja para las decisiones dentro del partido (F7 del fútbol).
8. **¿Qué enseña la interfaz?** **Recomiendo** sensaciones sin números; el diagnóstico (tipo y rango de días) solo con el médico; en la alfa, los números detrás del interruptor ya existente.
9. **Chicas y chicos: ¿una tasa distinta?** La literatura da más lesión de ligamento cruzado y más sobrecarga en chicas tras el estirón, y el juego tiene sexo y los mismos datos para todos. **Recomiendo incluirlo** solo en esos dos tipos, como dato, y documentarlo; si el usuario prefiere no distinguir, se quita sin tocar el resto.

---

## 10. Comprobaciones de esta sesión

- `npm run typecheck`, `npm run huella -- 60` (idéntica: se guardó la salida **antes** de escribir este documento y se compara después) y commit y push en `claude/salud-lesiones`. Ver el mensaje de cierre.
- No se ha tocado código, tests ni `DECISIONES.md`.

## 11. Fuentes

Búsquedas hechas el 24/11/2026. Las que se leyeron en resumen (no el artículo completo) o se citan de memoria van marcadas. **Las cifras de este documento son puntos de partida: hay que contrastarlas con los artículos antes de fijarlas.**

- Epidemiología del fútbol base (metaanálisis de chicos y chicas, hasta 19 años): [de Ste Croix y otros, 2021/22](https://eprints.glos.ac.uk/10010/) (partido 14,4 y 15,0, entrenamiento 2,8 y 2,6 por 1.000 h).
- Revisión de fútbol juvenil de alto nivel (3,7 por 1.000 h en edades menores, 7,9 en mayores): [Sports Medicine, 2019](https://link.springer.com/10.1007/s40279-019-01169-8).
- Academia alemana de élite, U12–U19, 138 jugadores (2,6 por 1.000 h; el 66 % en entrenamiento; el 84 % de miembro inferior; tobillo, muslo y rodilla): [Injury Patterns and Incidence in an Elite Youth Football Academy](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10573676/).
- Crecimiento y lesiones: [Sport injuries aligned to peak height velocity in talented pubertal soccer players (van der Sluis y otros, 2014)](https://pubmed.ncbi.nlm.nih.gov/24022568/); más traumáticas en el año del pico y más de sobrecarga después.
- Sueño y lesiones deportivas: [Chronic lack of sleep is associated with increased sports injuries in adolescent athletes (Milewski y otros, 2014)](https://pubmed.ncbi.nlm.nih.gov/25028798/), y el metaanálisis [PMC6446394](https://pmc.ncbi.nlm.nih.gov/articles/PMC6446394) (el riesgo relativo de ~1,7 a 2,0 de las dos estimaciones; **la que es la ajustada no se pudo confirmar**).
- Sueño y resfriado: Cohen y otros, *JAMA* 2009 (menos de 7 h, ~3 veces más resfriados) y Prather y otros, *Sleep* 2015 (menos de 6 h, >4 veces), **solo resumen en fuentes secundarias**. Resfriados al año: adultos 2–3, niños entre 4 y 12 según la fuente ([ejemplo](https://www.webmd.com/cold-and-flu/common_cold_overview)).
- Categorías de gravedad por días de baja: Fuller y otros, 2006, declaración de consenso sobre lesiones de fútbol (**de memoria**, no verificada en esta sesión).
- Reparto de lesiones por tipo y recaídas musculares (~12 %), efecto de los programas de prevención (FIFA 11+, Soligard 2008) y la lesión previa como predictor: **de memoria, sin verificar**; las cuotas de §2.3 son del desarrollador, para calibrar con `sim:salud`.
