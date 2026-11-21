# Relevo: puestos, entrenamientos y pistas del fútbol (análisis con propuesta)

Rama `claude/futbol-puestos-entrenos` (sale de `claude/youthful-clarke-vs0kye`). Sin pull request. **No se ha cambiado el juego** ni `DECISIONES.md`. Entregables:
- `docs/ANEXO_PUESTOS.md`: la fórmula y las tablas, para leer sin código.
- `tools/puestos.ts` (`npm run puestos`): lectura de los valores de un personaje (nuevo, o de una copia «Exportar»), sin tocar el juego.
- Este informe, con las tres decisiones para el usuario.

Resumen en una línea cada una:
1. **Puestos:** el consejo del profesor es hoy, en buena parte, azar: entre el primer y el sexto puesto de un niño de 8 años hay menos de 2 puntos y el profesor suma un azar de ±2. Propongo comparar con la edad y con el propio niño, y reducir el azar.
2. **Entrenamientos:** hay 4 libres, 1 de club (con 11 ejercicios), campamento y amigos. Propongo un catálogo de 22 para «Entrenar…» (portería 5, físico 5, mental 4, técnico 8).
3. **Pistas:** que el profesor y el entrenador digan *por qué* (cualidades en palabras), *qué te falta* para un puesto y *qué entrenamiento te conviene*, todo sin cifras.

---

## 1. Qué valora el motor en cada puesto

La fórmula y las 16 tablas están en `docs/ANEXO_PUESTOS.md`. En una frase: el valor en un puesto es la media de las habilidades del puesto ponderada por sus pesos (normalizados a 100 %), con el efecto del conocimiento de fútbol y ±0,25 por la pierna.

### 1.1 El caso del usuario

No tengo su partida. Dos formas de usarla: en el juego, «Exportar» y `npm run puestos -- guardado copia.json`; o mirar su ficha de habilidades y pasarlas con `--hab`.

Lo que sí he podido hacer es **reproducir un niño parecido** (portero primero y carrilero/lateral después). Semilla 3 de un personaje nuevo, con unas pocas habilidades subidas (reflejos 16, blocaje 13, resistencia 16, juego colectivo 14, pase 13, anticipación 15, entrada 12):

`npm run puestos -- partida 3 --hab futbol.reflejos=16,futbol.blocaje=13,gen.resistencia=16,futbol.juego_colectivo=14,futbol.pase=13,futbol.anticipacion=15,futbol.entrada=12`

| Puesto | Valor |
|---|---|
| **Portero** | **13,3** |
| **Carrilero derecho** | **12,0** |
| Lateral derecho | 12,0 |
| Interior derecho | 11,7 |
| **Pivote** | **11,6** |
| Carrilero izquierdo / Lateral izquierdo | 11,5 |
| Central | 11,1 |
| … extremos y delanteros | 9,0–10,6 |

Con la semilla 3 sin tocar sale: portero 11,8; extremo derecho 10,6; lateral derecho 10,5; central 10,2… (el niño tiene reflejos 13, mano a mano 14, alcance 14, dominio del área 14, pero control 6 y definición 8).

**Por qué sale portero:** el portero pesa 9 habilidades, 6 exclusivas suyas (reflejos y blocaje, 19 % cada una; mano a mano, alcance aéreo y dominio del área, 13 %). Quien tiene valores medianos en ellas y flojos en lo técnico, sale portero. **Por qué carrilero:** `LCR/RCR` pesan resistencia, pase y juego colectivo (14 % cada uno): lo que se parece a «un niño que corre, pasa y se coloca» sin brillar en nada.

**Comparación con FM (de memoria, a contrastar):**
- *Portero líbero*: en FM pesan pase, anticipación, concentración, serenidad, agilidad. Aquí el portero **no mira** pase, control, sangre fría ni anticipación. Un niño con buena cabeza y pocos reflejos nunca sale «portero líbero» aquí; FM sí lo ve. No hay roles todavía.
- *Mediocentro defensivo*: el Pivote (CDM) coincide casi del todo con los atributos de FM (entrada, marcaje, posicionamiento, anticipación, pase, trabajo en equipo, aguante, decisiones). Faltan fuerza y concentración. En la reproducción sale 5.º (11,6), a 1,7 del portero: el juego «lo ve», pero no lo nombra porque solo da tres puestos y suma azar.
- *Carrilero*: **el nombre engaña.** En FM el carrilero (wing-back) es un lateral que sube: centros, regate, aguante, velocidad. Aquí el equivalente es el **Lateral** (LB/RB). Los `LCR/RCR` («Carrilero izquierdo/derecho») son, por sus pesos, **mediocentros de banda** (box-to-box). Y los `LM/RM` se llaman «Interior» pero son medios de banda con centros y arrancada. En fútbol español, «interior» es el medio centro que juega por dentro a cada lado. Es probable que el usuario lea «carrilero» como FM y se lleve una impresión equivocada.

### 1.2 Hallazgos: pesos y reglas que parecen raros

1. **El consejo es en buena parte azar a esta edad.** Las habilidades de un niño de 8 años están en 5–15 y la diferencia entre su mejor y su sexto puesto suele ser de 1–2 puntos. El profesor suma ±2. Medido sobre 5000 repeticiones con la semilla 3: el portero (el mejor, +1,2 sobre el 2.º) sale entre los tres el 69 % de los días; el 2.º, el 37 %; el 5.º, el 23 %; el 9.º aún sale el 12 %. Con el azar estable «del día», el consejo cambia de un día a otro. (`npm run puestos -- ruido 3`.)
2. **El valor es absoluto, no relativo.** No compara con la edad ni con las otras habilidades del niño. Premia el puesto cuya media sale más alta por azar de partida, no el que *destaca* en él. En unas 30 semillas probadas, el puesto n.º 1 gana al n.º 3 por 0,4–1,3 puntos.
3. **El conocimiento penaliza a los novatos en el medio.** Con conocimiento ~0, las mentales valen ×0,85. Mediocentro pesa un 48 % en mentales (visión, decisiones, juego colectivo, posicionamiento) y el extremo un 9 %: el novato pierde ~7 % de valor en CM/CAM/CDM y ~1,5 % en extremo/lateral. A estas escalas son ~0,8 puntos, tanto como la diferencia entre puestos. Efecto: **a los principiantes se les recomiendan extremos, laterales y portero antes que medios.**
4. **Cuatro habilidades no pesan en ningún puesto** (faltas, córners, penaltis, saque de banda). El entrenamiento «Tiro y remate» dedica 2,6 de sus 6,7 puntos a faltas, penaltis y córners: el 39 % de la sesión no mueve el valor de nadie en su puesto.
5. **El portero:** 77 % en 6 habilidades exclusivas que solo sube «Entrenar de portero» (y el ejercicio del club para porteros). Un niño que no entrena de portero conserva el valor de partida al azar en ellas: de ahí los portero «sorpresa». Y no hay pase/anticipación/sangre fría (ver 1.1).
6. **Capacidades:** solo velocidad, resistencia y fuerza pesan. Coordinación, agilidad, atención y concentración, no. El central no pesa velocidad ni arrancada; el delantero centro no pesa velocidad (los laterales y los delanteros de banda, sí): `ST` y `LST/RST` no son coherentes entre sí.
7. **Izquierdo y derecho son idénticos** (mismos pesos, solo cambia ±0,25 por la pierna): 5 parejas duplicadas de 16 puestos. No es un error; la pierna (±0,25) desempata y hace que los tres del profesor tiendan a ser del mismo lado.
8. **El mediapunta (CAM) cuenta como «delantero»** en el reparto de la plantilla (3 de 18 plazas, con ST, LST y RST), no como creador: los niños muy técnicos compiten por pocas plazas.

### 1.3 Propuestas de ajuste (sin aplicar)

| # | Propuesta | Coste | Efecto |
|---|---|---|---|
| A | **Medir contra la edad y contra uno mismo.** El profesor no usa el valor absoluto sino «valor en el puesto − valor medio de sus 16 puestos» (lo que destaca) y/o el percentil entre los niños de su edad que ya juegan | Pequeño (`consejoDeUnProfesor`; ya calcula la mediana) | El consejo sube del azar al perfil. Al ser relativo, el efecto del conocimiento (hallazgo 3) se compensa en parte |
| B | **Bajar el azar de ±2 a ±0,5** y que dependa del ojo del profesor (más con relación y más curso) | Trivial | El consejo deja de bailar de un día a otro |
| C | **Renombrar** `LCR/RCR` → «Interior izquierdo/derecho»; `LM/RM` → «Medio de banda»; y mostrar el Lateral como «Lateral / carrilero». Si se quiere el carrilero de FM, será un **rol** del lateral (F3) | Textos (`NOMBRES` en `puestos.ts`, anexo, textos) | Los nombres dicen lo mismo que en FM y en español |
| D | **Portero con cabeza:** añadir al portero pase 1, control 0,5, anticipación 1, sangre fría 0,5 (sale de decisiones/posicionamiento/despeje) y quitar salto. Alternativa más limpia: dejarlo para el rol «líbero» | Pequeño; se recalibra con `npm run sim` y `npm run sim:partidos` | El niño con buena cabeza puede salir portero líbero |
| E | **Dar peso a las 4 habilidades sueltas**: faltas y córners al mediapunta y a los medios de banda (0,5–1); penaltis al delantero centro (0,5); saque de banda a laterales (0,5) | Pequeño | Entrenar balón parado deja de ser «sin efecto» |
| F | **Capacidades que faltan:** agilidad en portero y lateral; fuerza en pivote; velocidad en central y delantero centro (0,5–1) | Pequeño | Más coherencia entre `ST` y `LST/RST` |
| G | **Conocimiento en el consejo:** que la sensibilidad no baje a los novatos en el consejo (aplicarla solo en el partido) | Pequeño | Quita el sesgo del hallazgo 3 |

Recomiendo **A + B + C** ya (arreglan lo que el usuario nota) y D–G tras el análisis de balance. Todo lo que cambie pesos exige cambiar el anexo y `puestos.ts`, y `npm run sim` + `sim:partidos` + `huella` antes y después.

---

## 2. Entrenamientos

### 2.1 Inventario de hoy

Cifras en «puntos de entrenamiento» antes de eficiencia. Eficiencias: **por tu cuenta ×0,85** (los 4 libres), **campamento ×1,2**, conocimiento de ×0,9 a ×1,15, y sobrecarga ×0,6 a partir de la tercera sesión del día. Libres: lectivos de 15 a 21; sin clase, de 8 a 20.

**Por libre** (`Entrenar…`):

| Acción | Dónde | Min | Energía | Sube | Total habilidad |
|---|---|---|---|---|---|
| Trabajo con balón | colegio, municipal, parque | 60 | −14 | control 2, pase 1,5, regate 1,5, técnica 2; coord 0,5; conocimiento 0,8 | 7,0 |
| Tiro y remate | colegio, municipal | 60 | −14 | definición 2, disparo lejano 1,5, penaltis 1, faltas 1, córners 0,6, cabeza 0,6; fuerza 0,4; conocimiento 0,8 | 6,7 |
| Preparación física | colegio, municipal, parque | 75 | −22 (estrés −2) | arrancada 2,5, salto 1,5; velocidad 1, resistencia 1,2, agilidad 0,5; conocimiento 0,5 | 4,0 (+2,7 capacidades) |
| Entrenar de portero | colegio, municipal | 60 | −14 | reflejos 2, mano a mano 1,2, blocaje 1,5, despeje 1, alcance 1, dominio 1; coord 0,5; conocimiento 0,8 | 7,7 |

Otras con efecto:

| Acción | Dónde / cuándo | Min | Energía | Sube |
|---|---|---|---|---|
| Entrenamiento del club | sede del club; 2–4 días por semana, 2 h | la sesión | −24 | **2 ejercicios** del entrenador (de 11, ~3 puntos de habilidad cada uno) + siempre: conocimiento 1,6, cooperación 0,3, resistencia 0,3 |
| Campamento (verano, buenas notas) | campo municipal, 9–14 | 300 | −35 | control 2, pase 2, regate 1,5, técnica 2, definición 1,5, visión 1,5, posicionamiento 1,5, juego colectivo 2,5, arrancada 1; velocidad 1, resistencia 1, cooperación 0,6, conocimiento 3 (×1,2) |
| Con los amigos (verano, notas aceptables) | parque, 10–19 | 120 | −12, estrés −6 | control 0,3, regate 0,4, definición 0,3, juego colectivo 0,4, carisma 0,4, cooperación 0,4 |
| Ver fútbol en la tele | casa, 1/día | 90 | −2, estrés −4 | conocimiento 0,6, atención 0,2 |
| Pedir consejo al entrenador | sede, 1/día, 15 min | 15 | −1 | conocimiento 1, atención 0,15 y **una** habilidad (técnica, pase, juego colectivo o posicionamiento, rotando por día) +0,3 |

Ejercicios del club (11): rondos, conducción y regate, finalización, centros y remates, defensa, presión tras pérdida, balón parado, táctica, juego de posición, preparación física, trabajo de porteros (solo porteros).

### 2.2 Los que suben cosas que no encajan con el nombre o con el que lo hace

1. **Campamento:** todo ataque y medio (control, pase, regate, técnica, definición, visión, juego colectivo). **No sube nada de portería ni de defensa** (marcaje, entrada, cabeza). Un portero o un central que va al campamento sale sin mejorar su puesto.
2. **Con los amigos:** solo ataque (regate, definición); igual.
3. **Tiro y remate:** el 39 % del trabajo es faltas, penaltis y córners (sin peso en ningún puesto); y mete «cabeza» (0,6), que no es tiro. El «Tiro» no mejora nada de **portería**.
4. **Preparación física:** sube arrancada y salto como *habilidades*, pero fuerza no sube y resistencia solo 1,2 como capacidad. El nombre promete más: la mitad de los puestos pesan resistencia.
5. **Entrenar de portero:** lo puede hacer cualquiera (no tiene `soloPuesto` como el del club) y no sube anticipación, sangre fría ni posicionamiento, que el portero «de verdad» necesita; sí despeje.
6. **Pedir consejo:** el texto dice «te da un consejo para mejorar tu técnica», aunque seas portero. Rota entre 4 habilidades sin mirar qué te falta.
7. **Balón parado del club** sube cuatro habilidades que no pesan en ningún puesto (ver 1.2.4).
8. **Rendimiento relativo:** por tiempo, el libre rinde más que el club (balón: 7,0 × 0,85 ≈ 6 puntos en 60 min; club: ≈6 en 120 min, más 1,6 de conocimiento). La descripción del club dice «rinde más que entrenar por tu cuenta»; con estas cifras sale al revés por hora. Las ganancias reales dependen de la curva de crecimiento de cada habilidad: **conviene medirlo (`npm run sim:futbol`) antes de calibrar el catálogo nuevo.**

### 2.3 Catálogo ampliado propuesto: 22 entrenamientos

Cifras **provisionales**, coherentes con las de hoy: ~6,5 puntos de habilidad por hora en técnica y portería (lo de hoy: 6,7–7,7), ~5–6 en mental y 4 + capacidades en físico. Energía: ligero −6/−10, medio −12/−16, fuerte −18/−24 (hoy: −14 para 60 min, −22 para 75 min). Todos suben además conocimiento 0,5–0,8 (el físico, 0,3), como hoy.

**Quién:** *solo* = ×0,85 (como hoy); *amigos* = sin esa rebaja (×1), pero hace falta quedar (ver 2.4); *club* = lo propone el entrenador como ejercicio de la sesión (entra en el catálogo del club con las mismas cifras).

**Portería** (prefijo «Portería · » en el desplegable)

| # | Nombre | Sube | Dónde | Quién | Min | Cansa |
|---|---|---|---|---|---|---|
| P1 | Reflejos y paradas | reflejos 3,5, blocaje 2, mano a mano 1; coord 0,5 | colegio, municipal | solo, amigos (uno que tire), club | 60 | medio (−14) |
| P2 | Centros y balones aéreos | alcance aéreo 2,5, dominio del área 2, blocaje 1,5, salto 0,5 | colegio, municipal | amigos, club | 60 | medio (−14) |
| P3 | Mano a mano y salidas | mano a mano 3, dominio del área 1,5, anticipación 1, sangre fría 1 | colegio, municipal | amigos, club | 45 | medio (−12) |
| P4 | Pies de portero | despeje 3, pase 1,5, control 1, visión 1 | colegio, municipal, parque | solo, club | 60 | ligero (−10) |
| P5 | Mando del área | dominio del área 2,5, posicionamiento 2, decisiones 1, juego colectivo 1; comunicación 0,3 | municipal | **club** | 60 | ligero (−8) |

**Físico**

| # | Nombre | Sube | Dónde | Quién | Min | Cansa |
|---|---|---|---|---|---|---|
| F1 | Velocidad y arrancadas | arrancada 3,5; velocidad 1,2, agilidad 0,4 | colegio, municipal, parque | solo, amigos, club | 45 | fuerte (−16) |
| F2 | Carrera continua | resistencia 2,5 (capacidad); estrés −4 | parque, colegio | solo, amigos | 60 | medio (−16) |
| F3 | Fuerza y saltos | salto 2, entrada 0,5; fuerza 1,5 | gimnasio | solo, club | 60 | fuerte (−18) |
| F4 | Agilidad y coordinación | arrancada 1,5, control 0,5; agilidad 1,2, coordinación 1,2 | colegio, parque | solo, amigos, club | 45 | ligero (−10) |
| F5 | Saltos y cabeceo | salto 2,5, cabeza 2; fuerza 0,3 | colegio, municipal | amigos, club | 45 | medio (−14) |

**Mental**

| # | Nombre | Sube | Dónde | Quién | Min | Cansa |
|---|---|---|---|---|---|---|
| M1 | Pizarra y vídeo de jugadas | visión 2, decisiones 1,5, posicionamiento 1,5; conocimiento 1 | casa, biblioteca | solo | 45 | no (−3, estrés +2) |
| M2 | Posicionamiento y anticipación | posicionamiento 2,5, anticipación 2,5, desmarque 1 | colegio, municipal | amigos, club | 60 | medio (−14) |
| M3 | Juegos reducidos (3 contra 3) | decisiones 2,5, visión 1,5, juego colectivo 1,5, sangre fría 0,5 | colegio, municipal, parque | amigos, club | 60 | medio (−16) |
| M4 | Bajo presión (marcador, penaltis) | sangre fría 3, penaltis 1; concentración 0,5 | colegio, municipal | amigos, club | 45 | ligero (−10) |

**Técnico**

| # | Nombre | Sube | Dónde | Quién | Min | Cansa |
|---|---|---|---|---|---|---|
| T1 | Toques y pared | control 3, pase 2, técnica 1,5 | colegio, municipal, parque | solo, amigos, club | 60 | medio (−14) |
| T2 | Regate y conducción | regate 3,5, control 1,5, técnica 1,5 | colegio, municipal, parque | solo, amigos, club | 60 | medio (−14) |
| T3 | Rondos y pase | pase 3, juego colectivo 1,5, visión 1, control 1 | colegio, municipal, parque | amigos, club | 60 | medio (−14) |
| T4 | Tiro a puerta | definición 3,5, disparo lejano 2, sangre fría 1; fuerza 0,3 | colegio, municipal | solo, amigos, club | 60 | medio (−14) |
| T5 | Centros y remates | centros 3, cabeza 2, desmarque 1,5 | colegio, municipal | amigos, club | 60 | medio (−14) |
| T6 | Defensa uno contra uno | marcaje 2,5, entrada 2,5, anticipación 1, posicionamiento 0,5 | colegio, municipal | amigos, club | 60 | medio (−16) |
| T7 | Balón parado | faltas 2, penaltis 2, córners 1,5, saque de banda 1 | colegio, municipal | solo, club | 60 | ligero (−8) |
| T8 | Malabares y técnica individual | técnica 3,5, control 2; coordinación 0,5 | casa, parque | solo | 45 | ligero (−8) |

Con esto: «Trabajo con balón» pasa a T1/T2, «Tiro y remate» a T4 + T7 (el balón parado sale de «Tiro»), «Preparación física» a F1–F4 y «Entrenar de portero» a P1–P4. Cada puesto tiene al menos tres entrenamientos que le suben lo que pesa (por ejemplo, el Pivote: T6, M2, T3, F2, M3).

### 2.4 Cómo encaja en el juego (sin cambiar contratos)

- **Desplegable «Entrenar…»:** cada acción lleva `desplegable.opcion`; basta con ponerla con prefijo de grupo («Portería · Reflejos y paradas», «Físico · Resistencia», «Mental · …», «Técnico · …») para que salgan agrupadas por orden. Si se quiere un grupo visual, `DesplegableDeAcciones` podría ganar un campo opcional `grupoDeOpcion` (cambio de contrato pequeño; la interfaz no sabe de fútbol).
- **Alta:** cada acción nueva se añade a `ENTRENOS_LIBRES` (el modificador ×0,85 y el desplegable salen de esa lista) y al mapa de lugares (`ligarALugares`). El catálogo del club (`EJERCICIOS_DE_FUTBOL`) coge las versiones «club» con los mismos números. El gimnasio y la biblioteca ya existen como lugares.
- **Con amigos:** hoy «con los amigos» solo existe en verano (`conLosAmigos`). Para el resto del año hace falta que haya con quién: lo natural es colgarlo del sistema de «Proponer quedar para…» con la actividad «entrenar» y el ejercicio elegido (decisión de diseño aparte); mientras tanto, las opciones «solo» del catálogo y las del club.
- **Portería abierta a todos**, no solo a porteros (como hoy el libre): el niño que quiere probar de portero puede.
- **Campamento:** repartir por grupos como el club (el entrenador elige ejercicios de todas las zonas) en lugar de una lista de ataque.
- **Balance:** un test de que cada habilidad entrenable (29) sube en al menos un entrenamiento libre; hoy faltas, córners, penaltis y saque de banda solo suben con «Tiro y remate». Correr `npm run sim`, `sim:futbol` y `huella` antes y después.

---

## 3. Pistas para el jugador

Principio 7 (`VISION.md`): el jugador siente los datos; no los ve. Hoy el profesor dice «en fútbol te veo bien de lateral derecho, extremo derecho o central» y, si le preguntas en qué se ha fijado, «cómo te mueves, qué se te da mejor» (texto fijo, no depende de nada). La propuesta: que **diga lo que ha visto de verdad**, con las mismas reglas para todos.

### 3.1 Qué lee el profesor (el entrenador, más y mejor)

- **Cualidades en palabras**, a partir de las capacidades y habilidades con las que más destacas (comparadas con los de tu edad, no en valor absoluto) y que pesan en el puesto. Nuevo en `ConsejoDeDeporte`: `motivos` (ids de las 2–3 que más aportan) y `faltas` (las que más te frenan).
- **Precisión según quién:** el profesor de EF te ve en clase (vago, tres puestos, a veces falla); tu **entrenador**, con sesiones y partidos, ve más: puede decir un puesto y por qué. La relación con ellos y el curso afinan el consejo (menos azar).
- Frases por tramos, nunca cifras («de los mejores de tu equipo», «por encima de tu edad», «aún te cuesta»). `nivelDe` del partido usa umbrales absolutos (40/60/80): para niños de 8–12 no sirve; hay que usar el percentil de la edad y la plantilla (`nivelesDelEquipo` ya existe).

### 3.2 Qué podría decir, con ejemplos

**a) Qué puestos y por qué** (profesor de EF; al preguntar en la sala de profesores o al preguntarle «en qué te has fijado»):

| Situación | Texto |
|---|---|
| Rápido y se mueve bien | «Eres de los más rápidos de la clase y arrancas muy bien: de extremo o de lateral te veo útil.» |
| Buena cabeza, poca técnica | «Estás siempre donde hay que estar y lees bien lo que va a pasar. De central o de pivote darías mucho.» |
| Reflejos y coordinación | «Reaccionas muy rápido y no tienes miedo al balón: pregúntale a tu entrenador por la portería.» |
| Aguante y colocación | «No te cansas, corres todo el partido y te mueves con el equipo: de medio, por dentro o por la banda, te veo bien.» |
| Sin destacar | «Todavía no destacas en nada concreto; pruébalo todo. A estas edades eso es normal.» |
| Dos puestos de dos mundos (portero y medio) | «Te veo bien de portero y también de medio. Para decidir: ¿te gusta más parar o jugarla?» |

**b) Qué te falta para un puesto que quieres** (acción nueva «Preguntar por un puesto», en la sala de profesores o con el entrenador; eliges el puesto del desplegable):

| Situación | Texto |
|---|---|
| Quieres ser portero y te falta salir | «De portero reaccionas muy bien, pero cuando se plantan solos delante, dudas: te falta salir y decidir rápido.» |
| Quieres ser delantero centro | «Te mueves bien sin balón; ante el portero se te encoge la mano. Falta pulso y repetir tiros.» |
| Quieres ser pivote | «Quitas bien el balón; te falta darlo mejor al primer toque.» |
| Ya vales mucho | «Ya estás para ese puesto. Lo que te falta es jugar: lo de ahí fuera se aprende en partidos.» |
| No encaja con tu perfil | «Para ese puesto te falta aguante y arranque, y eso se trabaja con paciencia, no en un mes. Si quieres, empezamos por correr más.» |

**c) Qué entrenamientos te convienen** (el entrenador, al pedirle consejo; hoy elige una habilidad por turnos del día):

| Situación | Texto |
|---|---|
| Te falta lo técnico | «Esta semana, toques y pared por tu cuenta: tus controles se te escapan.» |
| Quiere ser portero | «Para portero, hazte con "mano a mano y salidas" y "reflejos y paradas"; y pídele a un amigo que te tire.» |
| Cansancio | «Te noto justo de resistencia: salir a correr por el parque tres días te vendrá bien.» |
| Mental | «Ves jugadas pero decides tarde: juega partidillos de 3 contra 3, que te obligan a decidir.» |
| Ya entrenas lo que toca | «Vas bien. Sigue con lo del club, y los fines de semana, balón parado.» |

La elección sale de la misma regla: `faltas` del puesto que el niño juega (o pide) → los entrenamientos del catálogo (2.3) que más suben esas habilidades. El texto menciona el entrenamiento por nombre y se **avisa en pistas, no en números** (coherente con `presentacion.consecuencias: pistas`).

### 3.3 Implementación (propuesta; no hecha)

1. `ConsejoDeDeporte` gana `motivos` y `faltas` (contrato). `consejoDeUnProfesor` (en `npcs`) los saca del mismo cálculo. El texto se compone en `estudios` (profesor) y en el kit (entrenador) con una tabla de «cualidades en palabras» por habilidad/capacidad (ej.: reflejos → «reaccionas muy rápido»; arrancada → «arrancas muy bien»; resistencia → «aguantas todo el partido»).
2. `pedirConsejo` pasa de `HABILIDADES_DE_CONSEJO` por turnos a elegir la habilidad que más frena a tu puesto (la rotación sirve de desempate) y nombra el entrenamiento recomendado.
3. Acción nueva «Preguntar por un puesto» (cuesta 15 min, 1 vez al día, solo si el profesor/entrenador está) con una pestaña de la ficha como alternativa más tarde.
4. Un evento `eventos.deporte.…` de base (solo datos, `docs/ANEXO_EVENTOS.md`) para que el profesor lo diga solo, una vez al curso, si has cambiado mucho.
5. Todo con `rngEstable` y la misma regla para PNJ (principio 2): un entrenador PNJ lo usa para proponer puestos y ejercicios.

---

## Decisiones que necesita el usuario

1. **Puestos:** ¿aplicar A + B + C ya (comparar con la edad, menos azar, renombrar `LCR/RCR` a «Interior» y `LM/RM` a «Medio de banda»)? ¿Quiere D (portero con cabeza) y E–G tras medir, o esperar a los roles?
2. **Entrenamientos:** ¿vale el catálogo de 22 (cifras provisionales; hay que medirlas con `sim:futbol`)? ¿«Con amigos» solo en verano o también con quedadas el resto del año? ¿Quiere el campamento repartido por grupos?
3. **Pistas:** ¿qué quiere ver primero: el *por qué* del consejo, «Preguntar por un puesto» o el entrenador que recomienda entrenamientos? Recomiendo ese orden.

## Limitaciones

- No he tenido la partida del usuario: el caso es una reproducción. `npm run puestos -- guardado copia.json` lo calcula exacto.
- Los atributos de FM y sus nombres en español están escritos de memoria, sin contrastar con el juego ni con una fuente; conviene que el usuario compruebe la tabla de la sección 1.1 y del anexo (§5).
- Las cifras del catálogo son provisionales; el balance real (curvas de crecimiento) no está medido.
- Se miraron unas 30 semillas (`npm run puestos -- buscar 1 37`, ~30 s por semilla); ninguna daba a la vez portero y carrilero entre los tres primeros, por eso el caso es una reproducción con habilidades ajustadas.
