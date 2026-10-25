# Registro de decisiones

Lo que se decidió y por qué, para que cualquier sesión futura (persona o IA) tenga el contexto.
Añade una entrada nueva al principio cuando tomes una decisión de diseño o de balance.

---

## 25/10/2026 — Hermanos del personaje (E8.10) y dificultad aplazada

- **Dificultad (decidido por el usuario):** la dificultad solo controla cómo empiezan los padres y, en consecuencia, el personaje. No hace falta pantalla de inicio mientras no esté montado el juego completo, al menos en la infancia; se planificará con todas las opciones de creación (E15.1). Los rangos de calidad (fácil, normal, difícil) siguen como dato en `herencia.ts`.
- **Hermanos (decidido con el usuario):**
  1. **Cuántos y de qué edad:** de 0 a 3 (20 %, 45 %, 25 % y 10 %), con una diferencia de edad de −6 a +6 años sin repetir (mayores y menores) y un 4 % de que uno sea mellizo. Con 8 años al empezar, sus edades van de 2 a 14.
  2. **Genética y carácter:** hijos de los mismos padres con el mismo proceso de herencia que el personaje: cada capacidad física de UN padre (la mitad de cada uno, ±20 %) y su potencial en atletismo como los rivales (media de las capacidades físicas heredadas, aptitud ±15 %). Rasgos heredados con `rasgosHeredadosNpc` (origen, apariencia, carácter atenuado, intereses de alguno de los padres con un 60 %, gustos). Los dos apellidos salen de la semilla (`apellidosDeFamilia`), así que los comparten módulos que no dependen entre sí. Dos hermanos se parecen más en carácter que dos desconocidos.
  3. **Vida independiente, como los bots:** viven en `npcs` como personas con rol `familia` y las etiquetas `hermano` y `atleta` (esta, desde los 8 años: los pequeños empiezan al cumplirlos). Practican atletismo, progresan solos con la curva de desarrollo de los rivales (`desarrolloRival`) y compiten en su categoría junto a los rivales. No se retiran con los cursos: siguen cuando el pelotón se renueva. Aún no tienen perks (E5.7) ni ventaja de crianza.
  4. **Con quién te relacionas:** aparecen en la ficha de familia (nombre, edad, nivel; en pruebas, carácter e intereses), en la lista de personas como «Hermano/Hermana» y con las acciones de relación: el catálogo completo si tienen 6 años o más; los más pequeños solo para pasar la tarde (jugar) y tener un detalle. «Pasar la tarde con» sustituye a «Quedar con».
  5. **Vínculo:** empiezan en un valor positivo de 5 a 25 según la compatibilidad (intereses y carácter) y la diferencia de edad (−1,5 por año a partir de 3), con confianza 15. Es un vínculo familiar (`Vinculo.familia`): se enfría con el tiempo pero **no baja de 5 por sí solo** (no se olvida a la familia), aunque sí se puede enemistar con discusiones. Apoyan acciones (`supports`: lo social y las etiquetas de su interés favorito) cuando llegan a afinidad 40.
- **Efectos secundarios:** hacer las paces solo se ofrece cuando hay algo que arreglar (vínculo negativo o intento reciente fallido), lo que limpia la interfaz y reduce el coste; el modificador de apoyo no consulta el directorio si nadie llega a afinidad 40. Año simulado: ~2,4 s (límite 3 s). Los podios del atleta suben a ~23 porque los hermanos suman corredores más flojos.
- **Estado:** `FamilyService.siblings()` (nuevo); `Vinculo.familia`; `SAVE_VERSION` sube a 7.
- **Pendiente:** perks y ventaja de crianza de los hermanos; que se vayan de casa al cumplir 18; que su vida afecte a la del personaje (celos, comparaciones, apoyo de los padres, E20.8); que compitan en otros deportes; entrenar juntos.

---

## 25/10/2026 — Acciones de relación variadas (E20.3)

- **Catálogo por persona** (cada una en su grupo «Relaciones · Nombre»; sigue habiendo un solo contacto al día con cada persona):

| Acción | Con quién | Duración | Afinidad / confianza | Requisito y notas |
|---|---|---|---|---|
| Quedar | compañeros y amigos | 2 h | +5 / +3 | la de siempre; la que más acerca |
| Charlar un rato | compañeros y amigos; rivales ya conocidos (+2 / +1) | 30 min | +2,5 / +1,5 | casi gratis; para mantener el contacto |
| Ayudar con algo | compañeros y amigos | 1 h | +4 / +4,5 | afinidad ≥ 5 (hay que haber charlado o quedado antes); entrena empatía y cooperación |
| Hacer planes | compañeros y amigos | 1 h 30 | +6 / +3 | solo si comparten un interés (el del personaje ≥ 15); rinde ×0,8 a ×1,4 según cuánto le gusta a la otra persona |
| Tener un detalle | compañeros y amigos | 15 min | +3 / +1 | una vez a la semana por persona; ×1,15 a ×1,45 si es de su interés favorito |
| Hablar | entrenador y tutor | 30 min | +4 / +2,5 | como antes |
| Discutir / Plantar cara / Encararte | todos | 30 min | −6 a −14 (−9 a −21 con entrenador o tutor) / −5 | desahoga el estrés (−8) y entrena autoridad y picardía; el carácter agresivo de la otra persona hace que duela más |
| Hacer las paces / Pedir disculpas | todos, solo si el vínculo es negativo | 30 min | éxito: pasa a conocido (−2 y +5 / +5); fallo: −3 / −2 y 5 días de espera | probabilidad 8 %–85 %: sociabilidad, optimismo y honestidad de la otra persona, compatibilidad, y −15 % por cada nivel de enemistad por encima de la antipatía |

- **Personalidad:** el carácter decide cuánto duele discutir (`perdidaPorDiscusion`) y si aceptan las paces (`probabilidadDePaces`); la compatibilidad (×0,7 a ×1,4) ya multiplicaba todas las acciones positivas. Las reglas son funciones puras en `modules/relaciones/src/acciones.ts`, con tests.
- **Los bots nunca discuten ni hacen las paces** (`relacion` en `bots.ts` solo cuenta las constructivas); el bot aleatorio sí puede.
- **Estado:** `RelacionesState.espera` guarda hasta qué día no se repite un detalle o unas paces; `SAVE_VERSION` sube a 6.
- **Rendimiento:** con tantas acciones por persona el año simulado pasó de ~1,4 s a ~3,1 s (límite 3 s). Arreglos: las definiciones de acciones se guardan por persona y el motor las compila una sola vez (`WeakMap`), y de los rivales conocidos solo se ofrecen los 5 con mayor afinidad (a favor o en contra). Queda en ~2,1 s.
- **Efecto en el balance:** el social del vago sube (+7) porque el bot elige entre más acciones; el resto de estrategias no cambia de forma apreciable.
- **Pendiente de E20.3:** regalos con coste (cuando haya dinero, E16), que el carácter de la persona condicione también las acciones positivas (más allá de la compatibilidad), recuerdos o hechos compartidos y el efecto de estas acciones sobre las oportunidades (E20.9). Discutir con un rival o con un entrenador aún no tiene consecuencias más allá de la cifra (por ejemplo, el apoyo que dan).

---

## 25/10/2026 — La aptitud manda en las notas y Educación física / Artística dependen de las skills (E6.7, ajuste)

- **Crítica 1 (usuario):** no tiene sentido que un empollón de aptitud media tenga más media que uno de aptitud alta.
- **Causa:** el equilibrio de cada alumno dependía de las capacidades *actuales*, que se igualan entrenando, y no de la aptitud permanente; y los grupos se medían con asignaturas prácticas que añadían ruido.
- **Cambio:** la aptitud de cada asignatura (`base` + 22, su preparación de partida, que sale del tope de las capacidades de apoyo) fija ahora tanto **cuánto rinde el estudio** (×0,85 con aptitud baja, ×1 con la típica, 60, y hasta ×1,5 con la más alta) como **cuánto se olvida** (×1,4 con aptitud baja, ×0,6 con la más alta). Se aplica a clase, estudiar, repaso y academia. Cae el peso de las capacidades actuales en el olvido.
- **Resultado (2 años, nota media del último año, 6 semillas por grupo):**

| | Aptitud muy baja (p2) | Mediana | Muy alta (p98) |
|---|---|---|---|
| Empollón | 4,0 | 6,8 (asignaturas académicas ~8,4) | 8,6 (mates 9,2, lengua 9,4, mejor 9,7) |
| Equilibrado | 3,5 | 5,7 | 8,2 |
| Atleta | 3,1 | 4,7 | 6,7 |

  Con aptitud media, el empollón (6,8) supera al equilibrado (5,7) y al atleta (4,7); el orden por aptitud es monótono (con 24 semillas: empollón 6,9 · 7,9 · 8,1 en baja · media · alta). Con aptitud alta se llega al 9–10 en las asignaturas ligadas a lo mental. Un alumno con muy buena aptitud saca sobresaliente casi sin esfuerzo (equilibrado 8,2): es el «lo es siempre».
- **Crítica 2 (usuario):** Educación física va con el deporte y lo creativo con las skills; estudiar ayuda, pero importan las skills.
- **Cambio** (`Asignatura.practica`): en las asignaturas prácticas la preparación con la que se llega al examen y el nivel que se enseña mezclan el estudio con una **habilidad** calculada con las capacidades que apoyan la asignatura frente a lo típico de la edad (55 con lo típico, 11 puntos más o menos por cada 10 % de diferencia, mínimo 30 porque participar siempre da algo). Peso de la habilidad: **Educación física 70 %**, **Artística 50 %**, **Música 50 %**, **Tecnología 30 %**.
- **Resultado:** Educación física: atleta y equilibrado 6,5–7,5 (entrenan lo físico), empollón ~5 (no hace deporte). Artística depende de la creatividad y la coordinación de cada uno (5–8).
- **Educación física no se suspende (decidido por el usuario):** nota mínima 5 en cada examen al que se presenta (`Asignatura.notaMinima`); el nivel que se enseña no baja de Regular. Quien falta a clase el día del examen sigue con un 0. El empollón con aptitud media pasa de 6,8 a ~7,0 de media (en las académicas, 8,4); el resto de estrategias no cambia (equilibrado 6,1, atleta 5,1, vago 2,9 en el primer año).
- **Chequeo de simulación:** «El esfuerzo hace progresar» compara la nota media del equilibrado con la del vago (> +1,5; hoy +3,2) y se salta la parte de estudios en simulaciones cortas sin exámenes.

---

## 25/10/2026 — Las notas no se «acumulan»: la aptitud marca de dónde se parte y el olvido tiene suelo (E6.6, ajuste 4)

- **Crítica (usuario):** no tiene sentido que las notas se acumulen con los años; un empollón de sobresaliente lo es siempre.
- **Qué se midió:** todos los alumnos arrancaban en ~5,0–5,2 de nota (preparación ~52) sin importar su aptitud, y subían durante 3 trimestres (empollón 5,7 → 7,6) por pura acumulación; la aptitud casi no se notaba.
- **Cambios:**
  1. **El arranque sale de la aptitud permanente:** la preparación inicial de cada asignatura se calcula a partir del **tope genético** de las capacidades que la apoyan (de 40 a 85 ⇒ de 30 a 92; tope típico 62 ⇒ ~60). Antes salía del nivel inicial de las capacidades, que a los 8 años es bajo y casi igual para todos. `initialFrom` usa el tope si todas las stats de apoyo lo tienen.
  2. **Lo aprendido de base** (`EstudiosState.base`): el olvido diario no baja de la preparación inicial menos 22 puntos. Un alumno brillante conserva un buen nivel aunque no estudie; quien parte bajo no tiene red. Se hereda con la asignatura al cambiar de curso (naturales → biología...).
  3. **Respuesta rápida en lugar de acumulación lenta:** ganancia y olvido ×2,5 en la misma proporción (clase 1,35; estudiar 1,2; repaso 0,9; academia 9; caída diaria 0,9 con factor 0,6–1,5 por capacidades). Como el olvido no baja de la base, el olvido más rápido ya no es duro; el estudio aplicado se nota en semanas, no en años.
- **Resultado (empollón, 16 semillas, 2 años; trimestres):** tope mental bajo 6,0 · 7,0 · 7,4 · 7,2 · 7,4 · 7,7; medio 6,8 · 7,5 · 8,0 · 7,7 · 7,9 · 8,1; alto 7,0 · 7,8 · 7,8 · 7,9 · 7,9 · 7,9. Equilibrado: bajo 5,2 → 6,0; medio 5,8 → 6,6; alto 6,0 → 7,0. Se llega a la meseta en 2–3 trimestres y ya no sube (antes se tardaba un año). Primer año completo: equilibrado 6,0; empollón 7,3; atleta 4,5; vago 2,7 (a 3,1 con el margen anterior de 15: se subió a 22 para que el atleta que no estudia no quede cómodo).
- **Sigue pendiente:** con aptitud alta el empollón no pasa de ~8 de media (el techo lo marcan las capacidades de ese momento, no el tope); y las asignaturas de Educación física y Artística siguen muy por debajo de las demás en quien no entrena coordinación o creatividad (ver la revisión de notas).
- **Guardado:** `EstudiosState` gana `base`; `SAVE_VERSION` sube a 5.
- **Chequeo de simulación:** «El esfuerzo hace progresar» mide los estudios del equilibrado frente al vago (> +3 puntos) y no frente al arranque, porque la preparación parte de la aptitud y el olvido de las vacaciones la baja.

---

## 25/10/2026 — Valores iniciales más repartidos, nota del primer año y arreglo del bot perfecto

- **Observación (usuario):** en las primeras semillas todas las capacidades salían entre 10 y 14 (11–17, 11–18 en las otras): sospechoso, porque se había hablado de un rango bajo (5–20 en la implementación, a partir del «1–20» del usuario) y alguien con tope 92 en velocidad puede arrancar en 17, pero que ninguna baje de 10 no es creíble.
- **Causa:** el nivel inicial heredado era `tope del progenitor × factor (0,7–0,9) × (1 ± 20 %) / 100`. Con topes típicos (45–70) eso da 0,3–0,6 y, escalado a 5–20, un efectivo de 8,4–19,5 con p5 = 10,4 y p95 = 15,1.
- **Arreglo** (`nivelInicialHeredado`): la variación sube a ±30 % y el valor se lleva de la escala 22–80 (la que cubren los topes de los padres) a 0–1 antes de escalar al rango inicial. Con 300 semillas: mínimo 5,0; p5 7,8; p25 9,9; **mediana 11,9**; p75 14,0; p95 17,6; máximo 20,0. Quien tiene tope ≥ 85 arranca de media en 16,3 y quien tiene tope ≤ 45 en 9,2. Los promedios de la simulación no cambian.
- **Bot perfecto — la causa real:** `sim:vida` no apuntaba las acciones usadas (`mem.total`), de modo que el criterio «lo menos usado» siempre elegía la primera opción: estudiaba **una sola asignatura** y entrenaba siempre las mismas capacidades. Por eso salía con ~5 de nota y con muchas capacidades sin entrenar. Con el arreglo: notas de 6,8 a 7,9 en primaria, 5–6 en la ESO (más asignaturas con el mismo tiempo) y 7–8 al final; sus 6 mejores capacidades siguen en 23 % a los 8, 52 % a los 12, 81 % a los 18 y 92 % a los 24. Además el bot descansa más (energía mínima 40, o 70 si la salud baja de 60) porque, haciendo todo, se agotaba.
- **Nota del primer año del equilibrado — recalibración de estudios.** Para que el equilibrado ronde el 6 y el empollón el 8 hubo que escalar a la vez la ganancia y el olvido: curva de rendimientos decrecientes 1,0 → 0,6 (se mantiene el ritmo cerca del techo), estudiar una asignatura 3 → 0,48, clase 0,9 → 0,54, repaso 0,6 → 0,36, academia 6 → 3,6 y caída diaria 0,3 → 0,29; techo base 0,5. Con la misma proporción ganancia/olvido el nivel de equilibrio no cambia, pero la caída queda suave (~2 puntos a la semana sin estudiar). Resultado a tres años (4 semillas): equilibrado 6,0–6,4; empollón 7,8–8,1; atleta 3,7–4,3. En el primer año completo: equilibrado 5,8; empollón 6,9 (sube con los años); atleta 4,1; vago 2,1.
- **Lección:** al comparar bots hay que usar la misma memoria (`mem.total`) que `runBot`; un script de diagnóstico sin ella da resultados falsos.
- **Umbral:** «El esfuerzo hace progresar» (simulación rápida, 28 días) pide ahora estudios > +1 (antes > +6): en un mes la preparación apenas se mueve por el olvido diario; el año completo sí sube.

---

## 24/10/2026 — `sim:vida` mide las capacidades que se entrenan: el bot perfecto sí llega (sin tocar el motor)

- **Duda (usuario):** cómo ajustar para que el bot perfecto pueda llegar a ~85 a los 24 con tope 90 sin desmontar la base.
- **Diagnóstico:** se imprimió, por edad, cada capacidad del bot perfecto frente a su tope. Las que entrena (velocidad, resistencia, inteligencia, comunicación, carisma...) llegan al **90–97 % del tope a los 22–24 años** (p. ej. velocidad 61/64, 73/76, 32/35). Las que nunca entrena (constitución, agilidad, autoridad, picardía...) se quedan en el mínimo natural (~45 %). La tabla de `sim:vida` promediaba las 18 capacidades, por eso parecía que solo se llegaba al ~70 %. **No hay que tocar ritmos, curvas ni caídas.**
- **Medición nueva:** `sim:vida` añade la columna **«6 mejores capacidades (% del tope)»**, la media de nivel/tope de las 6 capacidades más cercanas a su tope. Con 3 semillas sale: 8 años 22–25 %, 10: 40 %, 12: 51 %, 14: 62 %, 16: 72 %, **18: 79–80 %**, 20: 84 %, 22: 88 %, **24: 90–91 %**. Es decir, nadie llega al máximo a los 18, el pico llega hacia los 24 y las capacidades al 95 % del tope son 3 de 21 (nadie lo tiene todo). Cuadra con el ejemplo del usuario (tope 90 → ~85 a los 24, unos 7 puntos por año de media y algo más de niño).
- **Observación:** el bot perfecto saca solo ~5 de nota media; sus dos sesiones de estudio diarias reparten poco entre 7–8 asignaturas. Era un problema del bot (`CLAUDE.md`: se arregla el bot, no el juego): se arregló el 25/10 (ver la entrada de esa fecha: `sim:vida` no apuntaba las acciones usadas).

---

## 24/10/2026 — Crecimiento infantil más gradual: techo por edad y desarrollo natural (E2.8, ajuste)

- **Problema (usuario):** el bot equilibrado pasaba de 12 a 35 en un año y casi se paraba después. Un personaje con tope 90 y su mejor momento a los 24 tiene que subir menos de 7 puntos al año si fuera plano; de niño algo más, pero no 23. Además, un niño con 5 no será nunca un adulto con 5, aunque sí con 25 o 30.
- **Causa:** el techo por edad de las capacidades ya valía el 86–90 % del tope a los 8 años, así que el niño podía subir casi a tope de golpe y después la curva de rendimientos decrecientes lo frenaba.
- **Techo por edad más bajo y progresivo** (`CURVAS_POR_EDAD`, fracción del tope alcanzable): a los 8 años 0,30; 10: 0,42; 12: 0,55; 14: 0,68; 16: 0,82; 18: 0,91; y después como antes hasta el máximo (22–30 según categoría).
- **Desarrollo natural** (`GrowthDef.naturalFraction`, 0,45 en todas las genéricas): sin entrenar, una capacidad sube sola hasta el 45 % de su tope efectivo (tope × lo alcanzable por edad), un 5 % de lo que falta cada día. Un adulto que no entrena nunca baja del ~45 % de su tope (≈ 28 con tope 62; ≈ 40 con tope 90), no hacia 5. Este mínimo sube con la edad y baja con el envejecimiento.
- **Plasticidad hasta los 16** (`plasticidadPorEdad`): ×3 a los 8 años, bajando a ×1 a los 16, solo en genéricas. Ritmo de las genéricas 0,3 → 0,5.
- **Nivel típico por edad recalibrado** a lo realmente alcanzable: 12,5 a los 8; 17 a los 10; 22 a los 12; 32 a los 16; 36 a los 18; 40 a los 24; 42 desde los 30.
- **Rivales:** `desarrolloRival` = 0,75 × la curva física por edad del jugador (antes una curva propia más alta). Con 0,9 el atleta dejaba de destacar.
- **Resultado (bot perfecto, `sim:vida`, físico con tope 57):** 8 años 11 → 10 años 20 → 12 años 24 → 16 años 33 → 20 años 37 → 24 años 39. Es decir, ~4 puntos al año de niño y 1–3 después, sin saltos. Un año de partida: capacidades +7 a +9 (antes +23).
- **Cifras (365 días, 13 chequeos en verde):** nota media equilibrado 7,2 (6,4 sin el ajuste de techo; el primer año sigue algo alta), empollón 8,1, atleta 4,5, vago 2,4; atletismo +16 en el equilibrado y en el atleta; podios 18 y 19; victorias del atleta 24 %.
- **Umbral de la simulación rápida:** "El esfuerzo hace progresar" pasa de atletismo > +10 a > +7 (con el techo por edad la subida de los primeros meses es más lenta a propósito: +8,2 en la rápida, +16 en un año completo).
- **Aclarado después (ver la entrada siguiente):** el «70 % del tope a los 24 años» era un artefacto de la medición, no un fallo del motor.

---

## 24/10/2026 — Los niños empiezan con capacidades bajas (5–20) y se miden "para su edad" (E2.8)

- **Motivo (usuario):** un padre con 60 y un niño de 8 años con 40 es poco realista. Debe empezar mucho más bajo (1–20) pero con potencial para crecer rápido.
- **Paso 1 — capacidades «para su edad».** Nueva referencia `nivelTipicoPorEdad(edad)` en `contracts/development.ts` (nivel típico de una genérica: 12,5 a los 8, 30 a los 10, 44 a los 12, 52 a los 14, 57 a los 16, 60 a los 18, 62 desde los 30). `ReadContext.norm` de una **capacidad genérica** ya no es nivel/100 sino nivel relativo al típico de la edad (con el típico equivale a lo que antes era 40/100). Así techos, velocidades y olvido de asignaturas y habilidades no se hunden porque el niño tenga 12. Se verificó antes de tocar nada más que, con el típico constante en 40, **todos los números de la simulación eran idénticos** y los 235 tests pasaban.
- **Paso 2 — arranque bajo y plasticidad.** Rango inicial de las capacidades **30–50 → 5–20**. Las capacidades genéricas suben más rápido de niño: `plasticidadPorEdad` (primero ×2,5, la versión final ×3 está en la entrada «Crecimiento infantil más gradual»; bajando a ×1 a los 16; solo genéricas). El arranque de las asignaturas (`initialFrom`) se calcula también relativo al nivel típico de 8 años.
- **Rivales:** el jugador, con capacidades de 12, no podía competir con rivales de 8 años calibrados contra niveles de 40, así que se rebajaron (primero a 0,35 + 0,65·madurez; la versión final, 0,75 × la curva física, está en la entrada «Crecimiento infantil más gradual»).
- **Asignaturas:** estudiar baja 5 → 3. El peso extra de las capacidades en la velocidad de las asignaturas se mantiene en 2 (con el rango inicial 5–20 la dispersión relativa entre niños es mucho mayor).
- **Cifras (365 días, 5 semillas, 13 chequeos en verde):** capacidades +23 en un año (12 → 35); equilibrado: atletismo 52, nota media 7,7 (a 3 años ~6,5 en matemáticas); empollón 8,5; atleta 4,7; vago 2,4.
- **Hallazgo importante (`sim:vida`):** antes, la caída tenía como suelo el valor inicial (40), y eso escondía que el bot perfecto casi no progresa de adulto (físico 38 → 45 en 22 años). Con el arranque bajo, el suelo ya no ayuda y la meseta del bot perfecto queda en ~36/57 físico a los 24 años (antes 45). Hay que revisar el crecimiento y la caída de adultos cuando se haga la fase profesional (E10); no se toca ahora.
- **Pendiente:** no hay desarrollo natural sin entrenar (un niño que no hace deporte se queda en 12,5 mientras sus compañeros suben); la nota media del equilibrado en el primer año sigue alta (7,7 frente al 6 buscado, a 3 años ya ronda el 6,5).

---

## 24/10/2026 — Asignaturas: techo según las capacidades, para que el empollón llegue al 9 o 10 (E6.6, ajuste 2)

- **Problema medido:** con el balance anterior el empollón se atascaba en ~80 de preparación (nota 8) **sea cual sea su mente**: entre mentes bajas y altas solo había 1,7 puntos. Causas: (1) la curva de rendimientos decrecientes frena casi del todo cerca de 90; (2) las capacidades de los niños son parecidas (40–60), así que la velocidad por capacidades casi no distinguía.
- **Cambio:** las asignaturas recuperan un **techo suave que depende de las capacidades de apoyo**: `techo = 100 × (0,4 + media ponderada de las capacidades de apoyo)` (con ellas a 40 el techo es 80, a 50 es 90 y a 60 llega a 100). La curva baja de 1,3 a 1,0 y el peso de las capacidades en la velocidad se duplica. No es un tope genético: sube cuando mejoran las capacidades y se ve como la marca gris de la barra.
- **Resultado medido en el empollón a 3 años (matemáticas):** mente baja 75, media 82, alta 91. A 1 año: 7,5 de nota media.
- **Para que el equilibrado no suba con el techo:** estudiar 2,5 → 5 (con la curva más suave) y caída diaria 0,2 → 0,3. Equilibrado: 6,3 a 1 año y ~6,6 a 3 años.
- **Pendiente de decidir (efecto secundario):** con la caída a 0,3 el atleta que solo va a clase baja a 3,3 y el vago a 1,9 (preparación 4,6). Es más duro de lo buscado. Opciones: caída más suave si se asiste a clase, o caída 0,25.

---

## 24/10/2026 — Asignaturas: dos parciales y global, y menos fácil (E6.6, ajuste)

- **Petición del usuario:** el equilibrado sin bonus ni malus debe quedar en torno al **6** (el notable solo si las skills ayudan); quien quiera el campamento tiene que esforzarse, y el atleta tiene que estudiar salvo que sus skills mentales lo salven. Y un examen por trimestre es poco: **dos parciales antes y el global al final**, con la media de los parciales al 40 % y el global al 60 %.
- **Huecos del calendario (decididos por mí, el usuario los revisa):** parciales en las semanas **6 y 11** (1.er trimestre, global en la 14), **21 y 25** (2.º, global en la 28) y **33 y 37** (3.º, global en la 40). Cada parcial está a ≥ 3 semanas del global y de las vacaciones o inicio de trimestre. Se avisan igual que el global (una semana antes) y cada asignatura cae un día fijo de la semana, pudiendo coincidir varias. Dato nuevo `CalendarioPais.parciales` y campo `TimeView.parcial` (0, 1 o 2).
- **Nota final** de cada asignatura = 0,4 × media de los dos parciales + 0,6 × global; lo que no se hace (por faltar a clase o por no estar en la partida) cuenta 0. La tabla del trimestre enseña parcial 1, parcial 2, global y final. `examenes` guarda ahora `asignatura:parcial1|parcial2|global`.
- **Ajuste de balance** (para que sea más difícil): estudiar una asignatura 5 → 2,5; clase 1,2 → 0,9; repaso 2,5 → 0,6 por asignatura (el bot lo elegía a menudo y era la fuente dominante); caída diaria 0,15 → 0,2. La academia sigue en 6.
- **Cifras (365 días, 5 semillas, 13 chequeos en verde):** nota media del equilibrado **8,3 → 6,5**; empollón 9,0 → 7,8; atleta (solo va a clase) 5,6 → 4,6; abandona el deporte 8,5 → 7,2; vago 3,7 → 2,7. Con estos números el campamento (media ≥ 7,5) solo lo alcanza quien estudia a fondo (el empollón queda justo en 7,8).
- **Umbral de la simulación rápida:** el chequeo "El esfuerzo hace progresar" pedía estudios > +8 y daba +7,9 (en la simulación completa sube +11,5): la subida es más lenta a propósito, así que el umbral baja a +6.
- **A vigilar:** el vago llega a Mal (22) en un año; si se considera demasiado duro se baja la caída solo cuando no se asiste a clase.

---

## 24/10/2026 — Asignaturas rediseñadas: estudiar para preparar exámenes (E6.6)

- **Idea del usuario:** que el jugador estudie de cara a exámenes, con un nivel por asignatura que ve en texto, y que sepa qué días no faltar y hasta cuándo estudiar.
- **Preparación en lugar de nivel con tope.** Cada asignatura es una **preparación de 0 a 100 = la nota que se espera sacar × 10**. Se ve como texto: **Mal** (< 4), **Regular** (4–5,9), **Bien** (6–7,4), **Muy bien** (7,5–9,2), **Excelente** (9,3–10). En pruebas se muestra también la cifra (`MOSTRAR_CIFRAS_ASIGNATURAS` en `main.ts`; se ocultará en beta). **Las asignaturas ya no tienen tope genético ni techo** (se retira E8.5 para asignaturas): la dificultad la ponen las capacidades de apoyo (`apoyos`), que fijan dónde se arranca, lo rápido que se sube y lo rápido que se olvida. Un alumno capaz puede llegar a sobresaliente desde el principio.
- **Arranque (decidido: "Ok").** Todos parten en torno a Regular (~52) y se ajusta por las capacidades de base entre 40 y 78. Mecanismo genérico nuevo en el motor: `StatDef.initialFrom` (el inicial sale de la media ponderada del nivel inicial de otras stats; de 34 a 52 ⇒ de `min` a `max`, porque los niños empiezan en torno a 40).
- **Subir:** ir a clase da 1,2 a **las asignaturas que se dan ese día** (decidido: "Sí"); estudiar una asignatura da 5 (90 min), el repaso 2,5 a cada una y la academia 6 a las tres más flojas. Rendimientos decrecientes (curva 1,3) y velocidad por capacidades.
- **Horario semanal:** cada asignatura tiene `horas` a la semana (dato en `curriculo.ts`) y se reparte en esos días de lunes a viernes (`horarioSemanal`). No todas las asignaturas se dan todos los días. El servicio `estudios.timetable(díaSemana)` lo publica.
- **Caída fija y suave (decidido):** 0,15 puntos al día (el motor ya no usa `decay` para ellas, la aplica el módulo cada día) × un factor de 0,6 a 1,5 según las capacidades (peores capacidades, se olvida más). Cae también en fines de semana y vacaciones, **pero en Navidad y Semana Santa se puede repasar** (estudiar y repasar están disponibles fuera del horario escolar). Al empezar un curso todas pierden 3 puntos (los contenidos son más difíciles; sustituye a la penalización por curso de la nota).
- **Exámenes:** se acaban los controles de los viernes. **Un examen global por asignatura y trimestre**, en la semana de evaluación (semanas 14, 28 y 40; ver la entrada posterior, que añade dos parciales), con día fijo por asignatura (`diaDeExamen`): **pueden coincidir varios el mismo día** (decidido). Se **avisan con una semana de antelación** (el domingo anterior a la semana previa) con una tabla día/asignatura, y el servicio `upcomingExams(días)` los publica. Nota = preparación / 10 + azar (σ 0,5 más cuanto peor concentrado) − penalización de estrés alto. **Faltar a clase ese día es un 0** ("No presentado"). La media de los exámenes alimenta la evaluación del trimestre, el boletín y el verano igual que antes (aprobado 5; academia < 5, campamento ≥ 7,5).
- **Estado:** `controlesTrimestre` pasa a `examenes` (nota por asignatura del trimestre en curso); `SAVE_VERSION` sube a 3 (y a 4 al cambiar la clave de `examenes` a `asignatura:tipo` con los parciales).
- **Cifras (365 días, 5 semillas):** los 13 chequeos siguen en verde. Estudios del equilibrado 81,8 (+29,7) y nota media 8,3; empollón 89,5 y 9,0; atleta (solo clase, no estudia) 5,5; vago (no va a clase) 3,7; aleatorio 3,6.
- **A vigilar:** con estas cifras el equilibrado saca 8,3 de media; si resulta demasiado fácil se sube la caída o se baja la ganancia de estudiar. Los exámenes de recuperación y el repaso en vacaciones con aviso de "pendiente de repasar" quedan para cuando exista el motor de eventos.

---

## 24/10/2026 — Resultado de una acción: dato individual de cada cambio (solo alfa)

- **Qué pasaba:** tras una acción la pantalla solo enseñaba los cambios de 0,05 puntos o más. Desde la nueva escala de topes las subidas por acción son más pequeñas (una clase da entre 0,01 y 0,06 por asignatura), así que casi ninguna asignatura aparecía y parecía que no subían.
- **Decisión del usuario:** en la fase alfa se quiere el **dato individual de cada cambio**, sin agrupar ni ocultar. Ahora se enseña cada cambio de 0,0005 puntos o más, con tres decimales cuando es pequeño (+0,017), dos entre 0,1 y 1 y uno por encima.
- **Idea para más adelante** (a valorar, no está hecha): no enseñar cantidades pero sí **marcar qué habilidades suben con la acción elegida**, y/o **marcar en verde la habilidad cuando cruza un valor entero hacia arriba y en rojo cuando baja**. Está en el backlog como E15.5.
- **Sigue abierta** la duda del ritmo temprano de las asignaturas (empiezan al 75–80 % de su techo y suben poco por acción): subir el tope de las asignaturas, bajar el nivel inicial o suavizar la curva al principio. Se decide junto con la revisión de las notas.

## 24/10/2026 — La app se quedaba en blanco con una partida guardada antigua

- **Qué pasó:** al añadir los perks y el perfil al estado del módulo base, una partida guardada antes de ese cambio cargaba, pero al dibujarla fallaba (`Cannot read properties of undefined (reading 'activos')`) y la página quedaba vacía sin ningún aviso. Reproducido con un guardado sin esos campos.
- **Arreglo:** (1) `SAVE_VERSION` sube a 2 y se documenta la regla de la fase alfa: **se sube cada vez que cambia la forma del estado de algún módulo**, y las partidas con otra versión se rechazan con un error claro (`Game.load`); (2) la interfaz descarta la partida guardada que no se pueda cargar **o dibujar**, la borra y enseña la pantalla inicial con un aviso («Tu partida guardada era de una versión anterior y ya no se puede cargar…») en vez de quedarse en blanco. Probado en un navegador con un guardado de la versión 1 y con uno de la versión 2 con datos rotos.
- **Para el jugador:** al abrir la app tras este cambio verá el aviso y tendrá que empezar una partida nueva (no hay compatibilidad entre versiones en la fase alfa, como se decidió).
- **Pendiente:** cuando salga la beta habrá que decidir si se migran los guardados (E17).

## 24/10/2026 — Rasgos de las personas: carácter, intereses, apariencia, origen y gustos (E20.5 y E3.5)

- **Carácter con los 8 ejes de los documentos de Godot** (−50 a +50): disciplinado↔rebelde, honesto↔manipulador, ambicioso↔satisfecho, relajado↔sacrificado, solitario↔sociable, calmado↔agresivo, temerario↔prudente, optimista↔pesimista. Los NPCs salen con una normal de desviación 18 (los extremos son raros) y un sesgo por papel: el entrenador, más disciplinado y ambicioso; el tutor, disciplinado y honesto; el compañero social, sociable y optimista; los rivales, ambiciosos y sacrificados. Nunca se enseñan al jugador como número.
- **Intereses:** 12 (deporte, atletismo, fútbol, estudio y ciencia, lectura, música, arte, videojuegos, naturaleza, tecnología, cine y series, cocina). Un NPC tiene de 2 a 4, con intensidad de 1 a 3 y preferidos por papel. **El personaje no los elige: los hereda y se deducen de lo que hace con su tiempo** (cada hora de una acción que los alimenta sube su interés, con rendimientos decrecientes hacia 100).
- **Creación del personaje:** de momento todo es **heredado** de los padres. Más adelante la creación de personaje dará a elegir entre personalizada y heredada (para el carácter y los intereses; E15.1 y E4.2).
- **Herencia del personaje:** carácter, por eje, 60 % del valor de un progenitor elegido más una variación propia; intereses, algunos de los de sus padres a un nivel bajo (de 28 a 44); apariencia, ver abajo; gustos, al azar.
- **Apariencia (rasgos físicos con ids estables para dibujar por capas):** color de pelo (6) y tipo (4), color de ojos (6), tono de piel (6), forma de cara (5) y distintivos (pecas, hoyuelos, lunares). Cada rasgo viene de **uno de los dos padres** (50/50); lo que tiene gradación (piel, ojos, tipo de pelo) a veces sale intermedio y rara vez un vecino; el pelo rojo es recesivo (solo sale casi seguro si lo tienen los dos); cada distintivo pasa con un 50 % (75 % si lo tienen los dos). Los hijos se parecen a sus padres.
- **Origen familiar (detalle étnico para dar profundidad a personajes y NPCs):** 9 orígenes como dato (España norte, centro y sur, Latinoamérica, Magreb, África subsahariana, Europa del este, Europa del norte y Asia oriental), con una frecuencia en el mundo (España, el 75 %). Cada adulto del mundo tiene uno o dos orígenes (10 % de mezclas) y sus rasgos físicos siguen la tendencia de su origen. **El del hijo es la mezcla a partes iguales de los de sus padres** y su apariencia hereda de los padres, no del origen. Las distribuciones son aproximadas. Más adelante podrá condicionar nombres, costumbres y eventos.
- **Gustos:** cada persona tiene preferencias ocultas de rasgos físicos (pelo, ojos, piel y cara; a veces el suyo propio) y de carácter. Se guardan ya y `atraccion()` ya calcula de 0 a 1 lo que atrae otra persona; se usarán en la pareja (E20.6).
- **Compatibilidad (ya aplicada):** 60 % intereses en común (qué parte de lo que le gusta al NPC le interesa al personaje) y 40 % parecido de carácter (ponderado por eje). El modificador `relaciones.compatibilidad` multiplica entre **×0,7 y ×1,4** lo que sube la afinidad y la eficiencia de las acciones de relaciones con esa persona (una compatibilidad de 0,25 da ×0,7; 0,5, ×1,05; 0,75 o más, ×1,4). Lo típico al empezar es ×0,9 (media de 0,91 con rango de 0,71 a 1,40) porque el personaje todavía comparte pocos intereses; mejora al hacer cosas que a esa persona le gustan. Se ajustará a más acciones si se queda corto.
- **Dónde vive:** catálogo y reglas en `contracts/rasgos.ts`; los de los padres se sortean con el resto de su genética (`state.lineage.rasgos`, `ctx.rasgosDePadres`); los del personaje, en el estado del módulo base (`gen`) con el servicio `perfil`; los de los NPCs, en `npcs`; los de los padres del jugador, en `familia`.
- **Interfaz de pruebas** (`MOSTRAR_GENETICA` y `MOSTRAR_RELACIONES`): origen, apariencia, carácter, intereses y gustos del personaje y de sus padres, y en cada persona su carácter, intereses y la compatibilidad contigo.
- **Pendiente:** dibujar al personaje por capas (E15), los rasgos de apariencia de los hijos del personaje y de los rivales con padres, que el carácter condicione decisiones (E4.3) y los modos personalizado y aleatorio de la creación de personaje (E4.2).

## 24/10/2026 — Perks: rasgos genéticos heredables (E5, primera parte)

Fuente: `design_stats_personality_system.md` (secciones 5 y 11) y `cambios_tecnicos_arquitecto_equipo1.md` de Godot. El catálogo se adapta con las decisiones del usuario.

- **28 perks, no 29:** el documento dice «29 en 14 pares + 1 único», pero su tabla tiene 13 pares de opuestos más Ambidiestro y Mano de palo (28). Ambidiestro y Mano de palo se tratan como opuestos entre sí. Si falta un par, se añade más adelante.
- **Qué son:** genética pura (físicos, morfológicos, sensoriales), no personalidad (eso son los ejes de actitud, E4). No se ganan ni se pierden. El máximo de activos es **3**, pero lo normal es tener 0 o 1: tres es excepcional; con las probabilidades de abajo, 8 de cada 10 personajes tienen 0 o 1 y menos del 5 % tienen 3.
- **Pool de perks:** lo que un personaje lleva y no activa pasa a su pool, que sus hijos pueden heredar (un perk puede saltarse una generación).
- **Herencia unificada (idea de Crusader Kings III):** se juntan los perks de los dos padres (activos y pool) en una sola lista, sin importar de cuál vienen, y cada perk se tira por separado. Las probabilidades (se ajustarán con pruebas): un padre lo tiene activo, 40 %; lo lleva solo en el pool, 20 %; si lo tienen los dos, se combinan (activos ambos: 64 %); aparición espontánea sin padres, 1 % por perk (los excepcionales, menos: Ambidiestro ×0,3, Mano de palo ×0,5). Los padres de la generación 0 tienen 2 % por perk activo y 1,5 % en el pool. Un perk y su opuesto no conviven (el sobrante va al pool); si salen más de tres, los demás van al pool. **Se baja el 60–80 % del original** porque con él casi todo pasaría al hijo y habría poca variedad.
- **Todos los perks entran,** valgan o no para el deporte favorito: el deporte favorito no implica que los perks te beneficien. Los efectos que dependen de etiquetas que ningún deporte tiene todavía (`agarre`, `alta_densidad`, `recuperacion`) esperan a los deportes que las usen.
- **Efectos:** bonus o malus de ±8 puntos sobre el tope genético de la capacidad (`techo = min(100, tope + bonus)`), con efectos secundarios según el documento (Constitución de toro −3 de velocidad, Fibroso +6 de velocidad y agilidad y −4 de resistencia, Enano +4 de agilidad), multiplicadores de eficiencia por etiqueta (memoria motora ×1,1 o ×0,9 en entrenamiento, sangre fría ×1,08 o nervioso ×0,92 en competición) y centímetros de altura adulta (Gigante +10, Enano −10). Las habilidades y asignaturas derivadas recalculan su tope con el de las capacidades. Quedan sin efecto hasta que haya eventos o lesiones: Suertudo y Gafe, Recuperación rápida y lenta; y sin uso en atletismo: Manos, Visión, Ambidiestro y Mano de palo.
- **Latentes y revelación:** unos perks son latentes y otros se ven desde el principio (los morfológicos obvios), pero **sus efectos cuentan desde el nacimiento aunque no se hayan revelado**. Revelarlos con un mensaje es un evento, así que espera al motor de eventos (E18). En la fase de pruebas se enseñan todos (`MOSTRAR_GENETICA`), también los de los padres y el pool, sin mensajes.
- **Dónde vive:** el catálogo y las reglas de herencia en `contracts/perks.ts`; los perks de los padres se sortean con el resto de la genética de los padres (`state.lineage.perks`); los del personaje viven en el estado del módulo base (`gen`), que los hereda y aplica sus efectos; el servicio `perks` los publica y el servicio `familia` enseña los de los padres. Los rivales no llevan perks por ahora.
- **Balance:** los 13 chequeos siguen en verde a un año.

## 24/10/2026 — Curvas de desarrollo y envejecimiento por categoría (implementadas)

Con la medición de abajo (entrada siguiente) se implementa lo propuesto, con los matices del usuario: lo mental sigue subiendo más allá de los 28 y su envejecimiento es mínimo y tardío.

- **Curvas por edad como dato** (`CURVAS_POR_EDAD`, `factorPorEdad`, en contracts): la fracción del tope genético que se puede tener a cada edad. Física: 0,86 a los 8, máximo entre los 22 y los 27, 0,97 a los 30, 0,82 a los 40, 0,68 a los 50, 0,45 a los 70. Técnica: máximo a los 24 y meseta hasta los 32, cae más despacio que la física. Mental: sigue subiendo hasta los 30, meseta hasta los 55 y apenas baja después (0,92 a los 70). Social: máximo a los 30 y casi sin bajada.
- **Mecanismo** (`growth.potentialFactor`): el módulo base mantiene cuatro stats ocultas de vigor (física, técnica, mental y social) que siguen la edad cada día; la física y la técnica se adelantan o retrasan con la madurez propia hasta los 24. El tope efectivo es tope genético × vigor. Si el vigor baja desde su máximo, lo que queda por encima cae hacia el tope efectivo un 0,4 % de la diferencia al día; mientras el vigor crece, no se pierde nada. El ritmo de subida sigue dependiendo del tope genético. El núcleo no sabe de edades ni de categorías.
- **Se queda como estaba** (por decisión de que los rivales solo juegan hasta los 19): el desarrollo de los rivales sigue la fórmula `0,45 + 0,55 × madurez`. Cuando haya rivales adultos tendrán que usar la curva física.
- **Los jóvenes no pierden nada:** las curvas empiezan en 0,86–0,90 a los 8 años (no 0,66) porque el nivel inicial de las genéricas (30 a 50) ya está cerca del 65 % de su tope; con curvas más bajas los niños no podían progresar y los chequeos de balance caían.

**Resultado con el bot perfecto (semilla 1, 70 años, sin problemas):**

| Edad | Física (nivel/tope) | Mental | Social | Habilidades | Capacidades al 95 % del tope |
|---|---|---|---|---|---|
| 8 | 38/56 | 39/67 | 40/64 | 31/61 | 0/28 |
| 18 | 44/56 | 45/67 | 49/64 | 49/59 | 3/27 |
| 24 | 45/56 | 47/67 | 52/64 | 52/59 | 4/27 |
| 30 | 45/56 | 47/67 | 53/64 | 53/59 | 6/27 |
| 40 | 42/56 | 48/67 | 54/64 | 53/59 | 4/27 |
| 50 | 38/56 | 48/67 | 55/64 | 52/59 | 6/27 |
| 60 | 31/56 | 48/67 | 56/64 | 50/59 | 4/27 |
| 70 | 26/56 | 47/67 | 56/64 | 47/59 | 1/27 |

- **Lo físico llega al máximo hacia los 24–30 y después baja** (de 45 a los 30 a 26 a los 70), la técnica baja más despacio y lo mental y lo social se mantienen casi intactos. Con un atleta concreto (velocidad, tope 64): 47 a los 9 años, 58 a los 16, 62 a los 24, 63 a los 28 y después 61, 57, 53 y 47 a los 32, 36, 40 y 47.
- **El jugador sigue sin llegar al tope en todo:** como mucho 6 de 27 capacidades al 95 % de su tope.
- **Balance:** los 13 chequeos siguen en verde a 1, 3 y 10 años. A 10 años el atleta sube al podio en el 20 % de las carreras y el equilibrado en el 31 % (antes del cambio, 67 a 77 %): los rivales ya no se quedan por debajo de quien entrena a diario. El resto de la simulación casi no cambia (en el primer año, atletismo +35, estudios +12).
- **Rendimiento:** unos 1,4 s por año simulado (límite 3 s), 98 s para los 70 años.
- **Respuestas del usuario a los hallazgos de adulto:**
  - **Rivales:** también tendrán su oportunidad de ser profesionales; será como un cambio de categoría (E10.2 y E10.6). Entonces usarán la curva física por edad.
  - **Asignaturas:** deben perderse al terminar el colegio. Si aparece la universidad, traerá otras asignaturas o un cálculo genérico sin asignaturas según la carrera elegida. Hasta los 18 años no es prioritario (E10.5).
  - **Clubes tras el colegio y trabajos:** llegarán con la fase profesional; los trabajos y otras actividades que frenen el desplome, más adelante.
  - **Rendimiento:** ~1,4 s por año simulado, correcto para pruebas; habrá que revisarlo en una partida real.
  - **Ajustes:** es probable que haya que retocar las curvas y los números; para eso harán falta muchas pruebas y tests.

## 24/10/2026 — Edad del pico y límite global: primero se mide (herramienta `sim:vida`)

**Pregunta del usuario:** ¿estamos teniendo en cuenta que un jugador no debe llegar al tope en todas sus habilidades y que el pico físico no es a los 18 sino hacia los 23–25 (con lo mental subiendo más allá de los 28 y envejeciendo mucho más tarde)?

**Respuesta:** hoy no, ninguna de las dos cosas está modelada. El desarrollo físico (`madurezPorEdad`) llega al 100 % a los 18 años y se queda ahí; no hay bajada por edad (E2.6 pendiente); y no hay límite global de capacidades. Antes de añadirlos, se mide con una herramienta nueva.

- **Datos externos** (búsqueda del 24/10): el pico en el 400 m ronda los 21–25 años; en atletismo en general, los 23–28 según la prueba (medallistas olímpicos hacia los 27); en fútbol, 25–26 en velocidad, resistencia y explosividad (un solo estudio, con caída pasados los 32). No se encontró una edad de pico para lo técnico ni lo mental.
- **Decisión del usuario:** lo mental puede seguir subiendo después de los 28 y, como mucho, lleva un malus mínimo por edad que lo compensa; el envejecimiento mental llega mucho más tarde. Más adelante los trabajos y otras actividades harán que algunas habilidades sigan subiendo y evitarán el desplome; eso queda para más adelante.
- **Herramienta nueva `npm run sim:vida`** (`sim/src/vida.ts`): lleva a un bot "perfecto" (entrena deporte, estudios, gimnasio, lectura, relaciones y ocio cuidando el sueño y el estrés) los años que se pida y enseña, por edad, el nivel frente al tope de cada categoría y cuántas capacidades están al 95 % de su tope. Tarda ~1 s por año simulado.

**Medición con el modelo actual** (semilla 1, 70 años, sin problemas ni bloqueos):

| Edad | Física (nivel/tope) | Mental | Social | Habilidades | Conocimiento | Capacidades al 95 % del tope | Nota media |
|---|---|---|---|---|---|---|---|
| 8 | 39/60 | 39/66 | 40/67 | 32/63 | 0 | 0/28 | — |
| 18 | 44/60 | 48/66 | 52/67 | 52/60 | 91 | 5/27 | 4,8 |
| 28 | 44/60 | 50/66 | 54/67 | 53/60 | 95 | 7/27 | 3,4 |
| 40 | 44/60 | 50/66 | 55/67 | 55/60 | 96 | 8/27 | 1,7 |
| 70 | 45/60 | 51/66 | 57/67 | 55/60 | 98 | 10/27 | 0,0 |

- **Límite global:** no hace falta de momento. Aun entrenando todo a diario durante 20 años, el bot perfecto solo tiene al 95 % del tope 7 de 27 capacidades (lo físico queda en el 73 % de su tope, lo mental en el 76 % y lo social en el 81 %). Las curvas duras ya impiden que nadie llegue al máximo en todo. Se vuelve a medir cuando haya curvas por edad.
- **Edad del pico:** confirmado que no existe. Los niveles se estancan a los 16–18 y se quedan igual hasta los 70; no hay mejora hacia los 24 ni bajada después.
- **Hallazgos al llegar a adulto:** (1) las asignaturas se pierden: la nota media cae de 4,8 a 0,0 hacia los 50 años porque tras 2.º de bachillerato no hay estudios (no hay universidad ni trabajo); (2) el bot compite siempre en la categoría absoluta y queda último de 8 ante los rivales, que solo llegan a los 19 años y no avanzan con el jugador; (3) no hay acciones de club disponibles tras el colegio. Es lo esperado (la fase profesional y adulta no existe todavía), pero hay que tenerlo presente al hacer las curvas.
- **Rendimiento y estabilidad:** 70 años simulados en ~63 s sin invariantes rotos.

**Siguiente paso (hecho el mismo día, ver la entrada anterior):** curvas de desarrollo por categoría como dato (física hasta ~24 y meseta 22–27 con bajada suave desde los 28; mental sigue subiendo más allá de los 28 con un malus mínimo por edad y envejecimiento mucho más tardío; social hasta los 30; conocimiento casi sin bajada), aplicadas también al desarrollo de los rivales.

## 23/10/2026 — Marca del tope genético en las barras (solo durante las pruebas)

- Las barras de Características dibujaban una marca vertical que el jugador tomaba por el tope genético. No lo era: es el **techo actual** (edad y capacidades que apoyan), y por eso solo salía en lo físico, las asignaturas y el deporte; las mentales y sociales no tienen techo por edad y no dibujaban nada.
- Se añade una **segunda marca de color con el tope genético** en todas las barras que tienen tope, y el texto de ayuda explica cuál es cuál. **Es una ayuda de pruebas:** va detrás de `MOSTRAR_GENETICA` (`apps/web/src/main.ts`) y desaparece al pasar a beta, junto con la tabla de genética, el sesgo y la calidad de los padres y las cifras de relaciones (`MOSTRAR_RELACIONES`). Antes de la beta hay que poner ambas constantes a `false`.

## 23/10/2026 — Calidad de los padres: los del jugador en el percentil 50–60 y el resto del mundo, variado

Todos los padres se generaban igual, así que todos los niños partían de una calidad global casi idéntica. Ahora cada padre tiene una **calidad** de 0 a 1:

- **Los padres del jugador** salen con calidad 0,5–0,6 en dificultad normal (percentil 50–60: ligeramente por encima de la mediana). En fácil serán 0,8–0,9 y en difícil 0,1–0,2 (`CALIDAD_DE_PADRES_DEL_JUGADOR`; la dificultad queda para cuando todo esté estable).
- **El resto del mundo** (los padres de los 96 rivales y los que se añadan) recorre toda la escala 0–1: hay padres globalmente muy buenos y otros flojos. Así los rivales, y los hijos en general, tienen más variedad.
- **Qué cambia con la calidad:** los recuentos de capacidades débiles, fuertes y destacadas se interpolan entre las tablas de Godot (difícil en 0, normal en 0,5, fácil en 1) y las capacidades normales se desplazan: con calidad alta se estrechan por abajo (sube su media), con calidad baja por arriba. La media global de un padre va de unos 56 (calidad 0) a unos 69 (calidad 1), y todas las normales siguen dentro de su banda 50–69,9.
- **Resultado:** en el mundo, la media global de un padre tiene desviación 4,2 (percentil 5 en 56, percentil 95 en 69). Los padres del jugador quedan en 62,5 de media. Los rivales tienen tope de atletismo con desviación 8 (de 44 a 79).
- **Aclaración:** esto es una desviación de Godot (allí las bandas eran fijas y la dificultad solo cambiaba los recuentos); se hace así para tener padres de calidad muy distinta. Se puede suavizar con `DESPLAZAMIENTO_NORMAL`.

## 23/10/2026 — Sesgo de los padres por categoría

Los padres de Godot repartían las bandas al azar entre las 18 capacidades, así que casi todos eran parecidos en cada categoría (física, mental, social). Se añade un sesgo suave por padre para que haya padres "más físicos", "más mentales" o "más sociales" y, de ahí, hijos de perfil distinto. Al mezclar a un padre físico con una madre mental salen hijos equilibrados (cada capacidad viene de uno u otro) y, con menos probabilidad, hijos especializados.

- **Tabla de sesgos** (dato en `herencia.ts`, `SESGOS`): equilibrado 40 % (como antes), dominante en física, mental o social 10 % cada una, parcial física-mental, física-social o mental-social 10 % cada una.
- **Dominante:** una categoría reúne las capacidades destacadas y fuertes y las débiles caen en las otras dos. **Parcial:** las dos categorías favorecidas reúnen las altas y la que queda fuera tiene las más bajas en general.
- **Fugas** (15 %): una capacidad fuerte (nunca una destacada) puede caer fuera del sesgo y una débil puede caer dentro, pero entonces no es de las peores (42,5 a 49,9).
- **Sesgo suave:** las capacidades normales se inclinan hacia arriba en las categorías favorecidas (55 a 69,9) y hacia abajo en las demás (50 a 64,9). Mejor y peor categoría de un padre difieren 9 puntos de media (antes 8), con casos de 16 o más; no es pronunciado, como se pidió. Los recuentos por banda no cambian: la calidad global de un padre sigue siendo casi la misma (la dificultad al crear la partida la variará más adelante).
- Cada capacidad define su categoría (`genetics.grupo`: `fisico`, `mental`, `social`). El motor no sabe de qué va; solo agrupa. La interfaz de pruebas muestra el sesgo de cada padre.
- Las medias son de **topes**, no de habilidades: de los padres no guardamos ningún nivel alcanzado (lo de "tenía tope 90 y se quedó en 70 por lesiones" llegará con las lesiones y los eventos).

## 23/10/2026 — Herencia rehecha con el modelo de Godot (E8, E2.7, E2.3)

Tras revisar el documento de arquitectura y el código de Godot (`family_generator.gd`), se rehace la herencia que se había hecho antes con otro modelo (mezcla 60/40 con familias correlacionadas, tope medio 79).

- **Padres con perfil:** cuatro bandas fijas (débil 35–50, normal 50–70, fuerte 70–85, destacado 85–95) y la dificultad cambia cuántas capacidades caen en cada una (normal: 0–1 débiles, 1–2 fuertes, 0–1 destacadas). Cada capacidad se tira por separado, sin correlación entre las de un mismo padre *(matizado después: ver «Sesgo de los padres por categoría» y «Calidad de los padres»)*. Así los padres ya no son planos ni de media 80: el tope típico es ~62.
- **Herencia de UN padre por capacidad, sin punto intermedio:** de las 18 capacidades, 9 vienen del padre y 9 de la madre (al azar cuáles) y cada una toma el tope de ese padre ±20 %. Si un padre es muy fuerte y la madre muy débil, el hijo sale fuerte o débil, no intermedio. Se mantiene ±20 % de momento y se valorará si es demasiado.
- **Todas las genéricas heredan** (físicas, mentales y sociales). Las asignaturas y las habilidades de atletismo **no se heredan**: su tope es la media ponderada de los topes de las genéricas que las apoyan más una aptitud propia (±10 % las asignaturas, ±15 % las habilidades). Los `apoyos` de las asignaturas se afinan (opción B): Educación física con coordinación, agilidad, resistencia y determinación (sin velocidad); empatía en Sociales, Historia, Historia de España y Filosofía; picardía en Economía; determinación en Matemáticas, Física, Química, Física y química y Latín; carisma en Lengua e Inglés. Nunca depende de las notas de los padres.
- **El nivel inicial de las genéricas sale de los padres**, igual que en Godot: el mismo progenitor del que hereda el tope, por un factor de herencia (0,7 a 0,9) y ±20 %, escalado al rango inicial de la genérica (30 a 50). Así no hace falta otro método para generar hijos.
- **Escala:** se adopta la de Godot (tope típico 62, máximo 95, mínimo 10). Como el ritmo de subida y los rivales se diseñaron con topes de ~79, se recalibra: el ritmo se multiplica por 0,8 (`ESCALA_DE_RITMO`) y la referencia pasa de 79 a 62; el ritmo de las habilidades de atletismo baja de 0,5 a 0,36 (con los topes más bajos se acercaban al techo demasiado deprisa); el desarrollo de los rivales sube de `0,3 + 0,7 × madurez` a `0,45 + 0,55 × madurez`. En el primer curso el atleta sube al podio el 35 % de las carreras y el equilibrado el 30 % (antes 11 %): más competitivo, no dominante. **Las notas bajan**: la media del equilibrado pasa de 7,2 a 6,2, porque el tope de las asignaturas (derivado de las genéricas) ronda 62 en vez de 79. Es consecuencia de la escala y habrá que valorar si se quiere subir el tope típico de las asignaturas. **Pendiente de valorar:** a 3 y 10 años los 13 chequeos siguen en verde, pero el jugador que entrena a diario sube al podio en el 67 a 77 % de las carreras (a 10 años, el atleta gana el 47 %). Los rivales se quedan por debajo de quien entrena a diario; hay que decidir si es lo que se quiere (para ser profesional hay que destacar) o si los rivales deben crecer más deprisa. **Respuesta del usuario (mismo día):** no se toca el balance ahora; entrenar a diario no será gratis: habrá lesiones y otras consecuencias (E12) y las vacaciones permitirán compensar parte de lo no entrenado con el bonus de verano por buenas notas (campamento). Se revisa cuando estén esas piezas.
- **Conocimiento, aclaración:** no hay techo duro. El malus ya hace que quien tiene una velocidad espectacular pero ningún conocimiento rinda menos que otro con menos velocidad y mucho conocimiento (ejemplo: velocidad 80 sin conocimiento rinde 56,3 y velocidad 65 con conocimiento al máximo, 58,9, con las demás habilidades iguales).
- **Conocimiento del deporte:** actúa como **malus o bonus sobre las habilidades que dependen de entender la carrera**, no sobre lo físico: quien conoce poco falla en colocación, ritmo y salida (×0,85) y quien lo conoce a fondo saca más de lo que da su cuerpo (×1,15). La velocidad y la resistencia no cambian. La sensibilidad es 1 para ritmo y salida y 0,5 para técnica. Sigue habiendo un efecto leve en la eficiencia de entrenar y competir (×0,90 a ×1,15).
- **Crecimiento del conocimiento:** cualquiera puede llegar a 100, pero rápido al principio y cada vez más despacio (tasa 0,3 y curva 2,5): la primera carrera da cerca de 1 punto y a 70 puntos ver atletismo en la tele da menos de 0,02. Con un bot que entrena a diario llega a ~57 el primer año, ~77 el tercero y ~90 el décimo.
- **Pendiente de decidir:** el usuario se inclina por un **techo duro** del conocimiento, pero su propia explicación (no te hace más lento, fallas la colocación, el experto clava el ángulo) describe un malus/bonus. Un techo duro tal cual (`min(tope, conocimiento × 1,2)`) bloquearía a quien empieza con conocimiento 0, así que no se ha implementado; si se quiere, la alternativa es un techo suave (tope ×0,75 sin conocimiento hasta ×1,0 con él).
- **Lo que se mantiene de antes:** altura heredada como media de los dos padres, práctica deportiva de los padres según su tope físico medio y ventaja de partida de los rivales por criarse entre zapatillas. La dificultad al crear la partida queda para cuando todo esté estable (los recuentos de `facil` y `dificil` ya están como dato).

## 23/10/2026 — E20 fase 1: módulo `relaciones`

- **Escala de −100 a 100 con el 0 como "conocido".** Estados: antagonista (−3), enemigo (−2), antipatía (−1), conocido (0), amigo (1), mejor amigo (2). Entrar en un estado exige cruzar su umbral; salir exige cruzarlo con 8 puntos de margen (histéresis). Amigo pide además confianza ≥ 30 y 3 contactos en 14 días; mejor amigo, afinidad ≥ 75 y confianza ≥ 60.
- **Enfriamiento:** lo positivo cae hacia 0 tras unos días sin verse (conocido 7 días a 0,4 por día, amigo 21 a 0,3, mejor amigo 45 a 0,2); lo negativo solo sube hasta −20 (primera antipatía, tras 30 días) y no vuelve a conocido sin reconciliarse. La confianza cae a 0,1 por día pasados 30 días.
- **Arranque en 0:** el reparto ya no empieza con afinidad de 15 a 35. El apoyo (afinidad ≥ 40) tarda unos pocos contactos más en activarse; la simulación sigue en verde.
- **Migración desde `npcs`:** afinidad, acciones de relación y apoyo salen de `npcs` (ahora solo población y rivales) y viven en `relaciones`. `NpcView.affinity` desaparece; se consulta el servicio `relaciones`. El vínculo solo se guarda cuando hay contacto o un cambio; el resto es "conocido" implícito, así que las partidas nuevas empiezan con el estado vacío.
- **Interfaz:** muestra el estado de cada persona (concordado en género); las cifras salen solo si `MOSTRAR_RELACIONES` está activo.

## 23/10/2026 — Nueva épica E20: Relaciones

- Hoy cada NPC tiene una sola interacción (quedar o hablar) y una cifra de afinidad. Para tener amistades profundas, pareja e hijos hace falta un sistema de relaciones de verdad, así que se registra la épica **E20** en `BACKLOG_STATS.md`: modelo de relación con tipos y estados, acciones variadas, mantenimiento por vínculo, personalidad de los NPCs, pareja, hijos y familia propia.
- Las partes que necesitan eventos (declararse, rupturas, hijos) esperan al motor de eventos (E18). La base se puede hacer con acciones.
- **Respuestas del mismo día:** módulo `relaciones` aparte de `npcs`; los tipos de vínculo propuestos y la pareja a partir de los 14 años; el vínculo se ve como un estado (los umbrales numéricos solo durante el desarrollo, se ocultan en beta); los NPCs viven su propia vida (relaciones entre ellos, cambios de club y de ciudad).

## 23/10/2026 — Familia y genética (E8 y E13.1, primera parte)

> ⚠ **Parcialmente sustituida** por «Herencia rehecha con el modelo de Godot» (arriba). Ya no son ciertos: la herencia 60/40 con mezcla, la parte compartida por familia (0,85) y el tope típico de 79. Siguen vigentes: el módulo `familia`, la práctica deportiva de los padres (ahora según su tope físico medio), la ventaja de partida de los rivales (×0,95 a ×1,10) y la interfaz de pruebas.

- **Herencia por capacidad:** el tope genético del personaje sale de los **topes** de sus padres (no de su nivel): 60 % de un progenitor y 40 % del otro, al azar cuál por capacidad, más una variación del 7 % propia. La distribución general se mantiene (media ~79, desviación ~8,5).
- **Parte compartida por familia** en cada progenitor sube de 0,6 a 0,85: al mezclar dos padres la correlación entre capacidades de una misma familia se diluye, y así el hijo conserva ~0,4.
- **Módulo `familia`** (padre y madre): nombre, edad, altura, deporte practicado, apoyo, expectativas y tiempo en casa. Estos tres valores no hacen nada aún; los moverán los eventos y decisiones. Su genética la guarda el motor (`state.lineage`), no el módulo.
- **Práctica deportiva de los padres** según su tope físico (profesional, federado, aficionado o ninguna); lo más frecuente es que no hayan practicado deporte.
- **Rivales con padres completos:** cada uno tiene padre y madre (nombre, tope de atletismo, práctica). Su tope sale de los suyos y su nivel inicial se multiplica por entre 0,95 y 1,10 según lo que practicaron. La simulación sigue en verde (13 chequeos).
- **El jugador ve la genética mientras dure la fase de pruebas** (tabla de topes y datos de los padres); se oculta al pasar a beta cambiando `MOSTRAR_GENETICA`.
- Aparcado: modo historia (cuando la base funcione bien), y salud, alimentación y lesiones (dependerán de eventos).

## 23/10/2026 — Diseño de E10: el paso a profesional

- **Pasar a profesional es como subir de categoría:** hay categorías profesionales donde juegan los mejores y se accede a la primera cuando las habilidades permiten ser competitivo en ella.
- **La oferta llega por un ojeador** que ve competir al personaje: el nivel abre la posibilidad, el ojeador la hace realidad. Requiere el sistema de eventos y decisiones.
- **Tres niveles profesionales jugables ya** (no solo como dato), con subida de uno a otro por resultados y nivel.
- **Desde los 16 años, sin límite superior:** si no llega la oferta, sigue en la cantera y puede recibirla más tarde.
- **Aceptar trae más obligaciones, eventos y cosas que hacer.** El personaje puede dejar el colegio, pero si después quiere ser entrenador, agente u otro oficio necesita estudiar, y sin haber terminado el colegio le costará más.
- **Orden de implementación (ajustado el mismo día):** primero se cimienta toda la fase infantil, después se monta el motor completo de eventos y decisiones y solo entonces el nivel profesional. No se hace un motor mínimo antes porque obligaría a una refactorización fuerte. Faltan antes cosas como la genética y la familia.
- **La oferta del ojeador puede no ocurrir y el personaje puede ir a probar por su cuenta.** La subida de nivel profesional no es lineal: a los 16 años se puede ir directamente a élite. Los tres niveles (circuito nacional, internacional y élite) son para atletismo.
- **Titulación en cuatro niveles:** 1 primaria, 2 ESO, 3 bachillerato y 4 universidad. Lo terminado marca lo que cuestan los oficios de después.
- Detalle en `BACKLOG_STATS.md` (E10).

---

## 22/10/2026 — Antes de E10: potencial individual, bots, verano según notas, campeonato y categoría por año de nacimiento

### Tope genético individual por habilidad (E2.7)

> ⚠ **Sustituido el 23/10/2026** por «Herencia rehecha con el modelo de Godot»: el tope ya no se sortea (media 79, por familia) sino que sale de los padres (típico 62) y el de habilidades y asignaturas se deriva de las genéricas. Se conserva por el razonamiento (el tope limita y acelera) y por los problemas que motivaron el cambio.
- **Cada habilidad tiene un tope genético oculto**, sorteado al crear la partida: media 79 y desviación 9 (la misma distribución que el potencial de los rivales), entre 45 y 100. Cuando haya padres saldrá de la herencia.
- **Por familia:** el 60 % de la genética se comparte dentro de una familia (quien tiene buena genética física la tiene en casi todo lo físico) y el resto es propio de cada habilidad. Familia `fisico`: las 6 capacidades físicas y las 3 habilidades de atletismo. Familia `intelecto`: las 19 asignaturas.
- **El tope hace dos cosas:** ninguna habilidad pasa de él y, **a igual entrenamiento, sube más rápido quien tiene un tope más alto**: velocidad × (tope / 79)², entre ×0,5 y ×1,6 (tope 92 → ×1,36; tope 70 → ×0,79).
- **El jugador no lo ve:** el techo que enseña la interfaz sigue siendo el de la edad y las capacidades. Para pruebas existe `Game.hiddenPotential`.
- **Resultado:** a 10 años ya no todos acaban en el mismo techo (~92): el jugador de 18 años queda en ~82, parecido al potencial medio de los rivales (79).
- **Simulación:** la comparación "el especialista supera al equilibrado" se hace al cabo del primer curso, porque a más años todos llegan a su tope.
- **Efecto secundario:** el balance de estudios baja un poco (equilibrado 68,1 → 61,6; nota media 7,3 → 6,8) porque las asignaturas también tienen tope y velocidad individuales.

### Bots que suben de categoría
- Los bots que entrenan en serio aceptan la propuesta del entrenador cuando está disponible y vuelven a su categoría si sus últimos tres resultados allí son de media tabla para abajo. A 3 años, el bot atleta compite en la categoría superior en 4 de cada 8 semillas.

### Verano según las notas (E9.10)
- **Nota media del curso < 5:** **academia obligatoria** en verano (de lunes a viernes de 10 a 13, una sesión al día). Sesiones exigidas: 25 más 6 por cada punto de nota que falte para el 5 (máximo 45). Cada sesión refuerza las tres asignaturas más flojas. Faltar un día de academia cuenta como falta y sube el estrés. Al terminarla se acaba el castigo (+6 de motivación). **No se repite curso:** si el verano acaba sin terminarla, se empieza el curso con las asignaturas flojas, −8 de motivación y +10 de estrés.
- **Nota ≥ 7,5:** puede pedir a sus padres un **campamento de atletismo** (jornada de 5 horas, una al día, de 9 a 14, ×1,2 de eficiencia, la mejor fuente de mejora y de conocimiento).
- **Entre medias:** **practicar con los amigos** (2 horas al día, menos mejora que entrenar pero baja el estrés y sube carisma y cooperación).
- **Servicio de estudios ampliado** con `summerPath`. Pedir permiso a los padres queda como acción directa hasta que existan la familia (E13.1) y las decisiones (E18).

### Clasificatoria autonómica y final del campeonato (E9.11)
- **Clasificatoria autonómica** (sábado de la semana 25 del curso): 16 corredores (el jugador y 15 de su categoría). Los 8 primeros se clasifican. Ese sábado no hay carrera semanal.
- **Final del campeonato de España** (sábado de la semana 39): 8 corredores, los 7 mejores de la clasificatoria y el jugador si se clasificó; hay medallas (oro, plata y bronce). Quien no se clasifica sigue con su carrera semanal. El campeonato empieza de cero cada curso.
- Dan más motivación y conocimiento que una carrera normal. Se guardan en un historial aparte y no cuentan para la subida de categoría.

### Categoría por año de nacimiento
- **Jugador y rivales tienen fecha de nacimiento** (para calcular la edad exacta y los cumpleaños), pero **lo que cuenta para las categorías y competiciones es el año de nacimiento**, como en la vida real: la edad de competición es el año del curso (el de su inicio, en septiembre) menos el año de nacimiento. Dos niños nacidos el mismo año compiten en la misma categoría aunque uno cumpla años antes, y un día de diferencia en Nochevieja separa dos categorías.
- **Año natural en la partida:** como no hay fechas absolutas, se supone que el curso empieza hacia el 10 de septiembre; el año natural cambia a los 113 días (1 de enero). Las funciones `anioNatural`, `primerDiaDelAnio` y `edadDeCompeticion` están en contracts.
- **La edad de competición no cambia durante el curso** y sube un año al empezar el siguiente. Los servicios `identidad` (`seasonAge`) y `npcs` (`age`) publican esa edad. Los rivales nuevos nacen en un día cualquiera del año que les corresponde, y la población queda exactamente en 8 por edad tras cada relevo.
- Antes se usaba la edad al empezar el curso, y las categorías se vaciaban de rivales con los cumpleaños.

### Respuestas y pendientes
- Pendiente: entrenador del club como personaje (E19.7), becas (hasta que haya sistema monetario) y optimizaciones de rendimiento (~960 ms por año simulado).

### Problemas conocidos
- **Las asignaturas comparten la misma distribución de tope que el deporte** (media 79); quizá convenga otra distinta, que dependa de la inteligencia. *(Resuelto el 23/10/2026: el tope de las asignaturas se deriva de las genéricas que las apoyan.)*
- **Practicar con los amigos sube el atletismo del bot vago** de 0 a ~21 en un año (+10): conviene vigilar que no sustituya a entrenar.
- **A 10 años el bot atleta sube menos al podio que el equilibrado** (35 % frente a 48 %) porque pasa a categorías superiores, donde los rivales son más fuertes. Es el efecto buscado, pero habrá que ver si compensa.
- **El campeonato es único** (autonómico y nacional en dos citas): sin fases intermedias ni niveles distintos por categoría.
- **Cifras finales:** 113 tests; simulaciones de 1, 3 y 10 años con los 13 chequeos en verde.

---

## 22/10/2026 — Cierre de E9: categorías, rivales por edad, asignaturas por etapa y clubes

### Fase 1 — Categorías, rivales y desarrollo con la edad
- **Categorías de la federación española de atletismo** (sub-10, sub-12, sub-14, sub-16, sub-18, sub-20, sub-23, absoluta), como dato en el módulo de atletismo; el personaje compite en la que le toca por edad. Las categorías son un dato por país y deporte (`categories.ts` en contracts).
- **Rivales por edad:** población de 96 NPC (8 por edad, de 8 a 19 años) con fecha de nacimiento. Cada curso se van los de 20 años, algún niño de 13 o menos deja el deporte (10 % por curso) y entran niños nuevos de 8. Los rivales son desconocidos hasta que compiten contra ti y solo entonces aparecen en Relaciones.
- **Desarrollo con la edad, igual para todos:** `madurezPorEdad` (contracts) da la fracción de capacidad adulta alcanzable: 0,38 a los 8 años, 0,52 a los 10, 0,66 a los 12, 0,8 a los 14, 0,93 a los 16 y 1 a los 18. Es el techo de lo físico del jugador (estado oculto `gen.madurez`, con el adelanto o retraso propio) y de sus habilidades de atletismo. El nivel máximo de un rival a cada edad es su potencial × (0,3 + 0,7 × madurez): más plano porque ya llevan años entrenando.
- **Subida de categoría:** el entrenador propone competir en la categoría superior solo si destacas mucho en la tuya (podio en 3 de las últimas 5 carreras, con al menos 4 hechas) y serías competitivo arriba (tu nivel alcanza la mediana de la categoría superior). El jugador acepta con una acción y puede volver a su categoría. Si cambia la categoría por edad, la subida se reinicia.
- **Competir contra mayores desarrolla más:** tras cada carrera, lo que se aprende crece con lo fuertes que son los rivales frente al nivel propio.
- **Los 3 mejores rivales de la categoría corren siempre las primeras 8 carreras en ella;** después la serie de 8 rota.
- **Nuevo chequeo en la simulación:** "Los niños no tienen nivel de adulto" (ningún rival de 11 años o menos pasa de 75).
- **Cifras (un año):** atleta 5 % de victorias y 32 % de podios; equilibrado 21 % de podios. El mejor rival de 11 años o menos acaba en 66,6.

### Fase 2 — Asignaturas por etapa
- **Currículo de España** (`curriculo.ts`, como dato): diez cursos, de 3.º de primaria (8 años) a 2.º de bachillerato, con 19 asignaturas. Primaria: lengua, matemáticas, ciencias naturales, ciencias sociales, inglés, educación física y educación artística. ESO: biología y geología, geografía e historia, tecnología, música (1.º y 2.º) y física y química (desde 2.º). Bachillerato: comunes más una modalidad (ciencias o humanidades).
- **Cambios de etapa:** ciencias naturales pasa a biología y geología, ciencias sociales a geografía e historia, artística a música, y en bachillerato física y química a física y química, historia a historia de España, etc. La asignatura nueva **hereda el nivel** de la que sustituye; las que no tienen antecesora (tecnología, filosofía, economía) parten de un 5. Al empezar curso se avisa de lo que entra y lo que sale.
- **Modalidad de bachillerato:** se elige sola al empezar según las notas (ciencias si las de ciencias superan a las de letras). Decidido que así está bien de momento.
- **Nota inicial:** todas parten de un 5 (nivel 38 a 42). La inteligencia y el trabajo marcan la evolución mediante el ritmo de subida y el techo. No hay ventaja inicial para los inteligentes.
- **Solo puntúan y se estudian las asignaturas del curso;** las demás quedan guardadas.
- **Cada curso exige un poco más:** con el mismo nivel, la nota baja 0,15 por curso (valor a revisar con el balance).
- **Servicio de estudios ampliado** con las asignaturas activas y el nombre del curso; la interfaz muestra el curso y solo las asignaturas del curso. Los controles de los viernes se muestran en tabla.
- **Cifras (un año):** estudios del equilibrado 68,1 (+28,0); empollón 77,0; nota media del equilibrado 7,3 y del vago 6,0.

### Fase 3 — Clubes
- **Módulo nuevo `clubes`:** catálogo de España como dato. Club deportivo del colegio (calidad 1), Club Atletismo Ciudad (calidad 2, desde 10 años y nivel 45) y Club de Alto Rendimiento (calidad 3, desde 14 años y nivel 65). Un club puede ofrecer varios deportes; hoy solo atletismo.
- **Reparto de responsabilidades:** el módulo guarda membresías y calidad. Los deportes ponen el contenido de las sesiones y las pruebas, y piden entrar o salir con los eventos compartidos `club.unirse` y `club.salir`. Servicio `clubes`.
- **Club del colegio:** se empieza sin club y el personaje se apunta los días de clase de 14 a 19 (modo historia). Sesiones los lunes y miércoles de 15 a 17.
- **Sesiones con el club:** 2 horas, una al día, con técnica, ritmo, salida, velocidad, resistencia, coordinación y conocimiento (1,6, la mejor fuente). La eficiencia sube con la calidad: ×1 en el colegio, ×1,12 en el de la ciudad, ×1,25 en el de alto rendimiento.
- **Entrenar por tu cuenta sigue existiendo** pero rinde ×0,85.
- **Pruebas de acceso a los clubes de fuera:** edad mínima y nivel, con algo de azar; si no pasas, no se repite hasta pasadas 8 semanas. Un solo club por deporte. Se puede dejar el club.
- **Clasificación con el club** de cada corredor. Los rivales tienen club (nombres ficticios).

### Respuestas del 22/10 a los problemas y mejoras
- **Potencial individual por habilidad (E2.7), prioritario antes de E10:** ligado al tope hereditario, y la **velocidad de progreso también depende de él**: quien puede llegar a 92 sube más rápido que quien tiene el tope en 70, entrenando igual.
- **Verano según notas y clasificatorias:** se implementan ya. **No se repite curso:** el castigo es la academia obligatoria en verano para sacar los aprobados.
- **Becas:** pendientes hasta que haya sistema monetario.
- **Entrenador de club:** como personaje (NPC), igual que los demás que se añadan.
- **Los bots deben poder subir de categoría** si cumplen las condiciones acordadas.
- **Rendimiento del motor** (de ~330 a ~850 ms por año simulado): revisar optimizaciones a futuro.
- **Fase alfa:** las partidas se crean desde cero; no se mantiene compatibilidad con guardados antiguos.

### Problemas conocidos
- **Saturación a 10 años:** el techo por edad iguala a todo el que entrena (jugador de 18 años ≈ 92 en atletismo), así que el especialista no se distingue del equilibrado y supera a los rivales de 18 a 19 años (potencial medio 79). Se resuelve con el potencial individual (E2.7).
- **Subida de categoría:** no hay penalización por ser más pequeño que los mayores.
- **Edades de los rivales:** el curso dura 364 días y los años de edad 365; puede haber algún rival de más en una edad.

---

## 22/10/2026 — Asignaturas, categorías, rivales, verano y clubes (decisiones de diseño)

- **Asignaturas:** más de tres y cambiantes con la etapa (currículo de España). Todos parten de un 5 de nota; la inteligencia **para su edad** y el trabajo en clase y en casa marcan la evolución.
- **Categorías por edad: las de la federación española,** como dato por país. En edades tempranas pueden salir y entrar niños.
- **Rivales:** nadie llega a un potencial de 90 en tres años; quien destaca sube de categoría (sobre todo en fútbol), y enfrentarse a mayores desarrolla más.
- **Verano según las notas:** academia obligatoria si son malas (permite pasar de curso), campamento del deporte si son buenas (si lo piden a los padres), amigos si son aceptables (no mejoran igual). Prima el rendimiento escolar.
- **Clubes:** clubes en varios deportes, con categorías en cada uno. Primero el club del colegio (entrenamientos de menor nivel); también clubes fuera del colegio, más profesionales.
- **Clasificatorias:** si hay clasificatorio previo se monta; si no, un evento especial.
- Todo está en `BACKLOG_STATS.md`: E6.4, E6.5, E9.4, E9.8 a E9.11 y la épica nueva E19 (clubes); el orden de trabajo se ha revisado.

---

## 22/10/2026 — E9: calendario escolar y temporada implementados

- **Calendario como dato por país** (`packages/contracts/src/calendar.ts`): España por defecto, en semanas desde el inicio del curso (52 por curso, sin fechas absolutas). Trimestres 1.º (semanas 0 a 14), 2.º (17 a 28) y 3.º (30 a 40); Navidad (15 y 16), Semana Santa (29, estimación constante) y verano (41 a 51). Añadir un país es añadir otro dato; elegir país en la partida queda pendiente.
- **`TimeView` ampliado:** curso (`schoolYear`), semana del curso (`schoolWeek`), periodo (`period`), trimestre (`term`), día lectivo (`isSchoolDay`) y semana de evaluación (`isEvaluationWeek`). `isSchoolHours` ahora solo vale en días lectivos.
- **Vacaciones:** no hay clase ni tutorías; sin clase, las pistas, el entrenador y las retransmisiones usan el horario de fin de semana. El motivo se muestra (por ejemplo "Vacaciones de Navidad: no hay clase").
- **Estudios:** controles de los viernes y faltas solo en días lectivos. **Evaluación de fin de trimestre** (semanas 14, 28 y 40): nota media de los controles del trimestre, con consecuencias en motivación (+6 si ≥ 7, −6 si suspendes) y estrés (+8 si suspendes). Al acabar el 3.er trimestre, nota final del curso. Repetir curso y becas quedan pendientes.
- **Atletismo, temporada:** 4 semanas de pretemporada al empezar cada curso (se entrena, sin carreras); carrera los sábados solo en periodo lectivo (unas 34 al año, no 52); sin carreras en vacaciones. Los 3 mejores rivales corren siempre las primeras 8 **carreras** (antes eran las primeras 8 semanas, que con la pretemporada se quedaban en 4).
- **Interfaz:** la cabecera muestra curso, semana del curso y trimestre o vacaciones.
- **Simulación (un año):** los 12 chequeos en verde. Estudios baja en los bots que no estudian fuera de clase (atleta 49,6 → 40,4; vago 45,6 → 37,1) porque hay ~14 semanas sin clase y las asignaturas decaen en verano; el equilibrado casi no cambia (75,4 → 75,1). Carreras: atleta 23 % de victorias y 65 % de podios; equilibrado 16 %.
- **Simulación de tres años** (`npm run sim:largo`, E9.6): chequeos en verde, 336 ms por año simulado. A tres años los rivales alcanzan su potencial y el atleta gana pocas carreras (4 % de victorias, 39 % de podios): conviene revisar la progresión de los rivales para partidas de diez años.
- **Pendiente:** clasificatorias y finales; campamentos y contenido propio de vacaciones; cursos y categorías por edad (E9.4); repetir curso y becas; elegir país.

---

## 22/10/2026 — Visión: tres juegos en uno y orden de trabajo

- **Tres fases:** formación (de niño hasta hacerse profesional), carrera profesional adulta y retiro con reconversión (entrenador, representante...). Cada fase tiene módulos distintos.
- **Foco actual:** que el niño llegue a ser profesional. Después se añaden los módulos de las otras fases y se evolucionan los existentes en clave RPG.
- **El juego debe poder jugarse sin eventos ni decisiones** (aunque sea aburrido). Los eventos aportan interés y sirven de puertas a caminos nuevos, pero no son la base.
- **Calendario cercano a la vida real, con matices:** parón de Navidad y de verano, y una semana de primavera (Semana Santa en España) que cierra el segundo trimestre.
- **Ritmo de juego día a día:** es más fácil reducir a planificación que ampliar a días. Partidas largas, con muchos eventos y decisiones.
- **Calendario:** el curso empieza en septiembre, fechas reales (Semana Santa móvil calculada).
- **Modo historia:** el personaje llega nuevo a la ciudad y a un colegio nuevo sin conocer a nadie; las relaciones sociales se construyen desde cero (hoy todos los NPCs empiezan conocidos).
- **Oportunidad profesional:** entre los 16 y los 18 años según nivel y deporte. **Atletismo primero**, luego el deporte de equipo.
- **Inicio del curso:** segunda semana de septiembre (el día numérico da igual); el día 0 es ese lunes. Calendario como dato por país, con España por defecto.
- **Semana Santa:** estimación constante (semana 29 del curso, entre finales de marzo y principios de abril), igual todos los años, porque el juego no tiene lunas y su año es el año 0. Calendario completo de España, con trimestres, Navidad, Semana Santa y verano, en `BACKLOG_STATS.md` (E9.1).
- **Backlog ampliado** (`BACKLOG_STATS.md`, E9 a E18): calendario, ciclo de vida, ritmo de juego y planificación, salud, mundo social, segundo deporte, interfaz, recursos, técnica y eventos. Los puntos con 🟡 son preguntas abiertas.

---

## 18/10/2026 — E3: identidad del personaje (edad, altura, peso, dominancia y complexión)

Decisiones de alcance: empezar con **8 años** (constante `EDAD_INICIAL` en `modules/personaje/src/identidad.ts`, por si se sube a 10); entrega = identidad + tipo corporal; la UI filtrada por inteligencia (E3.4) queda para después; **sin alimentación**, el cuerpo se deriva de hábitos.
- **Edad:** años decimales = edad inicial + fracción de año aleatoria + días/365. Cumpleaños con aviso en el diario. Cada año simulado sube la edad en 1.
- **Altura:** objetivo adulto de la semilla (media 171, desviación 8; con padres saldrá de la herencia) y curva de crecimiento por edad (73 % a los 8, 100 % a los 18) desplazada por una "madurez" individual de ±1,5 años (hay quien da el estirón antes o después).
- **Peso:** IMC sano por edad más desviaciones por músculo y grasa.
- **Dominancia:** diestro o zurdo (11 %), solo identidad.
- **Complexión:** delgada, normal, atlética, musculosa o con sobrepeso, a partir de dos variables lentas (músculo y grasa, 0..100) que se acercan cada semana (8 %) a lo que dicen los hábitos. Músculo ← minutos de fuerza (gimnasio, etiqueta nueva `fuerza`); grasa ← minutos físicos (más 60 min semanales de juego libre) con la etiqueta `cardio` para rodajes, series y carreras. Sobrepeso ≥ 65 de grasa tras ~6 meses de sedentarismo.
- **Efectos de la complexión** (modificador `gen.complexion` sobre acciones físicas, simplificación de los modificadores por stat del diseño original): musculosa +10 % en fuerza y −5 % en cardio; delgada +5 % en cardio y −10 % en fuerza; atlética +3 %; sobrepeso −10 % de rendimiento y +15 % de coste.
- **Constitución:** sube +1 por semana con hábitos sanos (≥ 120 min de actividad, ≥ 50 h de descanso y estrés < 60), no entrenándola directamente. Crecimiento lento (unos +4 al año); a revisar.
- **Servicio nuevo `identidad`** (contracts): edad, altura, peso, dominancia y complexión. La web lo muestra al principio de la pestaña Personaje.
- **Simulación:** los 12 chequeos en verde (equilibrado 60,5; atleta supera al equilibrado; carreras con podio del 68 % para el atleta). Complexión al cabo de un año: equilibrado, atleta y sobreentrena, musculosa (los bots van al gimnasio casi a diario); aleatorio, atlética; vago, empollón y quien abandona el deporte, con sobrepeso.
- **Pendiente:** los bots entrenan fuerza a diario (más de 10 h semanales): poco realista para niños, pero útil como extremo. Edad y complexión aún no afectan a la caída ni al crecimiento de stats (eso vendría con los modificadores por edad). Alimentación como decisión. E3.4 (UI filtrada por inteligencia).

---

## 18/10/2026 — Conocimiento: todo entrenamiento suma; la tele no sustituye

Ajuste de lo anterior tras revisar que solo el rodaje largo subía el conocimiento.
- **Todo entrenamiento de atletismo suma conocimiento** (se hace con entrenador, sobre todo siendo niños): series 0,8, rodaje largo 1, técnica 1,2. Competir sigue en 2. El gimnasio (entrenamiento general, no de atletismo) no suma.
- **Ver atletismo en la tele baja de 1,5 a 0,6:** ayuda a entender el deporte pero no sustituye a entrenar ni a competir. Un jugador que solo ve la tele llega a ~27 en un año; el equilibrado, a ~64; el atleta, a ~77.
- **Atención e inteligencia pesan más** en el ritmo de subida (0,6 → 0,9 y 0,4 → 0,6). La relación con el entrenador ya mejora la eficiencia de todo lo etiquetado `atletismo` (modificador `npcs.apoyo`), así que también acelera el conocimiento.
- **Simulación:** los 12 chequeos en verde; sin cambios apreciables en atletismo ni estudios.
- **Pendiente (nivel inicial de los demás niños):** hoy los rivales arrancan con un nivel medio de 29 (hasta 54) en la escala de rendimiento; a los 10 años no debería haber nadie con nivel muy alto si sus padres no han practicado el deporte. A revisar con la herencia familiar y la edad: nivel inicial según la práctica deportiva de los padres, y potencial según la genética.

---

## 17/10/2026 — Rivales persistentes y clasificación de la carrera

Motivo: competir contra 3 NPC y 4 corredores inventados en cada carrera era plano; no había forma de saber si mejorabas respecto a alguien concreto.
- **16 rivales NPC persistentes** (`rival_1` a `rival_16`, módulo `npcs`), con nombre y género. Con 16 queda margen para lesiones, clasificatorias y rotaciones futuras.
- **Series de 8 corredores** (el jugador y 7 rivales, no corren los 16). Las primeras 8 semanas corren siempre los 3 mejores rivales (cabezas de serie, por nivel en ese momento); después las plazas rotan entre todos, con más probabilidad para quien lleva más semanas sin correr (peso 1 a 5). Se puede repetir de una semana a otra. Sin el módulo de NPCs, atletismo completa la serie con corredores genéricos.
- **Rivales paralelos, no adaptativos:** cada uno progresa por su cuenta (nivel inicial, potencial y ritmo de progreso propios), sin mirar lo que haga el jugador. No tiene por qué ser el mejor quien más entrena.
- **"Herencia"** *(sustituida el 23/10/2026: el tope del rival sale ahora de sus padres, ver «Herencia rehecha»)*: el potencial sale de una normal (media 79, desviación 9, entre 55 y 99); el nivel inicial depende de él (media 29, +0,35 por cada punto de potencial sobre 79); el ritmo de progreso (×1 de media, entre 0,55 y 1,5) es su constancia. Unos nacen con ventaja y otros con más techo.
- **Resultado visible:** `ctx.log` admite una tabla opcional (`LogTable`, en contracts). Atletismo publica la clasificación completa (posición, nombre, tiempo y diferencia con el 1º) y la web la muestra en el resultado y, desplegable, en el Diario. Cualquier deporte nuevo puede usarla.
- **Nuevo chequeo en la simulación:** "Las carreras son una competición real" (el atleta gana < 60 % de las carreras, sube al podio algunas veces y supera al equilibrado).
- **Simulación (5 semillas, un año):** atleta, 26 % de victorias y 73 % de podios; equilibrado, 20 % de podios; los 12 chequeos en verde. Con series de 8 la probabilidad base de podio sube a 3/8, así que se subió el nivel de los rivales dos veces (media de potencial 72 → 75 → 79) hasta que el atleta dejó de dominar. La variación entre semillas es grande a propósito (cada partida tiene su grupo de rivales).
- **Partidas antiguas:** conservan sus 3 rivales; los 16 aparecen al empezar una partida nueva.
- **Pendiente:** el azar de los rivales comparte el generador de la partida, así que lo que haga el jugador altera sus tiradas aunque su ritmo sea independiente; rivalidades y eventos con rivales concretos; lesiones y clasificatorias; la pestaña Relaciones muestra el nivel exacto de cada rival (a futuro, filtrado por inteligencia, E3.4).

---

## 17/10/2026 — Conocimiento del deporte (atletismo)

Adapta E2.3 del backlog: en el diseño original el conocimiento era un **techo** de las habilidades; aquí es un **bonus/malus** aparte que no toca la skill.
- **Nueva categoría de stat `conocimiento`** (contracts). Progresa como una habilidad, pero no cuenta como habilidad en las áreas de la simulación.
- **`atletismo.conocimiento`:** arranca en 0 (no conoce el deporte). Sube más rápido con atención (0,6) e inteligencia (0,4). Decay muy suave: 30 días de gracia, 0,3 % diario, suelo al 95 % del máximo alcanzado.
- **Efecto:** modificador `atletismo.conocimiento` sobre entrenar y competir, de ×0,90 (conocimiento 0) a ×1,15 (100). Afecta a lo que ganas entrenando y al "día" en la carrera, no a las habilidades directamente.
- **Fuentes de subida:** competir (2), ver atletismo en la tele (1,5; una vez al día, entre semana de 18 a 23 y fines de semana de 10 a 23; también entrena atención), rodaje largo (0,5, parte táctica).
- **Ritmo de subida ajustado con la simulación:** con 0,6 un jugador que veía la tele a diario llegaba a 96 en un año; con 0,15 llega a ~63 (el que solo entrena y compite, a ~14; quien deja el deporte se queda en ~14).
- **Bots:** equilibrado y atleta ven la tele una vez al día. Los demás no (el vago no la elige: no lleva etiqueta de ocio a propósito).
- **Efecto en la simulación:** los 11 chequeos en verde. Equilibrado: atletismo 67,5 → 67,2 y estudios 76,7 → 75,4 (ver la tele le quita tiempo de estudio). Resto sin cambios apreciables.
- **Pendiente:** hablar con el entrenador no sube el conocimiento (el módulo de NPCs no puede referenciar stats de un deporte; hace falta un canal por etiquetas); usar el conocimiento para lecturas de "quién sale mejor" y opciones tácticas (necesita el sistema de decisiones); el segundo deporte definirá su propio conocimiento.

---

## 17/10/2026 — E1.4 (conexión de stats nuevas) y PWA

### Stats nuevas conectadas
Se mantiene la suma de pesos de antes (ritmo de subida y techo); solo cambia el reparto. Cuando se implementen las edades se podrán añadir modificadores.
- **Atletismo** (cada una conserva `determinacion` 0,2 de ritmo y 0,15 de techo; el techo pesa la mitad que el ritmo):
  técnica ← coordinación 0,4 + agilidad 0,2 · ritmo ← resistencia 0,4 + inteligencia 0,2 · salida ← velocidad 0,4 + fuerza 0,2.
- **Estudios** (ritmo suma 1; techo suma 0,45 con el mismo reparto):
  matemáticas ← inteligencia 0,5 + concentración 0,5 · lengua ← inteligencia 0,35 + comunicación 0,35 + concentración 0,3 · ciencias ← inteligencia 0,4 + atención 0,3 + creatividad 0,3.
- **Qué entrena a los nuevos:** ir a clase → atención · estudiar lengua → comunicación · estudiar ciencias → creatividad · hablar con el entrenador y tutoría → comunicación (+ carisma) · quedar con un compañero → carisma, empatía y cooperación · perder una carrera → resiliencia (+0,8; ganar, +0,2).
- **Sin fuente de subida todavía:** `constitucion` (E3), `autoridad` y `picardia` (necesitan eventos/decisiones).

### Simulación antes/después de E1.4
Los 11 chequeos siguen en verde. Estudios baja algo: equilibrado 80,2 → 76,7 y empollón 89,4 → 84,6 (nota media 8,5 → 8,2 y 9,4 → 9,0). Causa: las asignaturas dependen ahora de stats que arrancan igual de bajos pero se entrenan menos que la concentración. Atletismo apenas varía (±1). No se ajusta ahora; revisar si al implementar edades se mueve más.

### PWA
- La web ya es instalable: manifiesto (`apps/web/public/manifest.webmanifest`), iconos (192, 512, maskable y Apple), service worker (`sw.js`, red primero para la página y copia guardada para el resto, funciona sin conexión) y registro solo en producción.
- Verificado en Chromium contra la compilación de producción: service worker activo, manifiesto e iconos con 200.
- Al cambiar `sw.js` hay que subir `VERSION` para limpiar la caché antigua.
- Pendiente: app nativa con Capacitor (no necesaria para instalar desde el navegador).
- **Publicación automática:** `pages.yml` se lanza en cada push a `main` (además de a mano). Antes había que lanzarlo a mano tras cada fusión.

---

## 17/10/2026 — Ampliar características (decisiones previas)

Se estudian los documentos de diseño de la versión Godot para enriquecer al personaje. No es una migración: es un catálogo adaptable. Backlog en `BACKLOG_STATS.md`.
- **Ids en español**, sin adoptar la regla de ids en inglés del original.
- **`trabajo_equipo` se elimina** (choca con una habilidad del fútbol) y se sustituye de forma provisional por `cooperacion`.
- **`memoria` → `inteligencia`** y **`disciplina` → `determinacion`**; se añaden constitución, agilidad, resiliencia, atención, creatividad, comunicación, autoridad, empatía y picardía.
- **El rendimiento académico se queda en `estudios`**, no es stat global.
- **Implementado E1.1 y E1.2:** 19 genéricas en total (6 físicas, 6 mentales, 6 sociales con `cooperacion` provisional) y 4 de estado. El modificador `gen.disciplina` pasa a `gen.determinacion` con el mismo efecto (menos coste de energía en entrenar y estudiar).
- **Simulación antes/después:** los 11 chequeos siguen en verde. Las medias "Global", "Mental" y "Social" bajan unos 5–10 puntos porque los 11 stats nuevos aún no se entrenan ni influyen en nada (se conectan en E1.4); no es un cambio de balance. Estudios y atletismo apenas varían (±1 punto).
- `constitucion` no tiene aún forma de subir (se forjará con hábitos, E3).

---

## 17/10/2026 — Base del proyecto

### Diseño de juego
- **RPG de decisiones**, no de acción. Un personaje en edad escolar estudia, practica un deporte y se relaciona.
- **El tiempo es de juego, no real.** Cada acción declara su duración en minutos de juego. La partida empieza un lunes a las 7:00.
- **Primer deporte: atletismo (400 m)**, elegido por ser el más sencillo de modelar (individual, sin posiciones ni tácticas). Es la plantilla para los siguientes deportes.
- **NPCs desde el MVP**, aunque sencillos. Dan profundidad y ya tienen utilidad: con afinidad ≥ 40 mejoran las acciones con las etiquetas que apoyan. Tienen género para concordar los textos.
- **Plataforma objetivo:** móvil, con versión web/PC. Interfaz web mobile-first, empaquetable con Capacitor más adelante.

### Técnica
- **TypeScript** en monorepo con npm workspaces. Un único lenguaje para motor, interfaz, tests y simulación.
- **Regla de oro:** un módulo solo importa `@ds/contracts`. Lo vigila `tests/arquitectura.test.ts`.
- **Unificadores** para que dividir mucho no implique lentitud: registro compilado, pipeline único de acciones, modificadores por etiquetas, eventos compartidos y servicios. Detalle en `ARQUITECTURA.md`.
- **Guardado:** un único JSON. Las stats y los módulos nuevos se inicializan solos al cargar una partida antigua.
- **Azar determinista** con semilla guardada, para que tests y simulaciones sean reproducibles.
- **Recursos (`resource: true`):** solo la energía cuenta como coste que bloquea acciones. Antes cualquier delta negativo bloqueaba, y bajar el estrés cuando ya estaba a 0 impedía descansar; lo detectaron los tests.

### Rendimiento
- Los contextos de lectura se crean una vez por módulo y se reutilizan: de 0,66 ms a 0,11 ms por acción.
- Referencia actual: un año simulado tarda unos 200 ms.

### Balance (primer ajuste con la simulación)
Problemas detectados por los bots y cómo se corrigieron:

| Problema | Ajuste |
|---|---|
| Progresión demasiado rápida (+72 de atletismo en un año, podio en 51 de 52 carreras) | Ritmo de habilidades 1 → 0,5 y de genéricas 0,6 → 0,3 |
| Estrés siempre a 0 y salud siempre a 100, incluso sobreentrenando | Dormir baja menos el estrés; estudiar y competir lo suben más; entrenar con sobrecarga resta salud y puede causar molestias |
| Ir a clase sin estudiar ya subía mucho las asignaturas | La clase entrena 0,5 por asignatura (antes 1) |
| Podio trivial: solo 3 rivales NPC | Carreras de 8 corredores (NPCs + rivales genéricos de relleno) |
| La salud baja solo afectaba a lo físico | Ahora reduce el rendimiento de todo |
| Bot empollón quemado (estrés 90, salud 0) | Era el bot: hacía ocio solo después de estudiar. Se corrigió el bot, no el juego. Conclusión válida: estudiar sin descanso es contraproducente |

Resultado: los 11 chequeos de sentido del juego en verde. Resumen del año simulado:
- El equilibrado tiene la mejor puntuación global.
- Cada especialista gana en lo suyo.
- Sobreentrenar rinde un 14 % menos y deja la salud en 2.
- El vago queda último.
- Dejar el deporte cuesta un 29 %.

---

## Pendiente e ideas

- **Revelación de los perks latentes** con mensajes: espera al motor de eventos (E18). Hoy se enseñan todos en pruebas.
- **Dibujar al personaje por capas** a partir de la apariencia y la creación de personaje con los modos personalizado y heredado (E15.1, E4.2).
- **Rasgos de los hijos del personaje y de los padres de los rivales** (ciclo de generaciones, E8).
- **Antes de la beta:** poner `MOSTRAR_GENETICA` y `MOSTRAR_RELACIONES` a `false` en `apps/web/src/main.ts` (genética, perks, sesgo y calidad de los padres, apariencia, carácter, intereses y cifras de relaciones).

- **Medir el rendimiento en una partida real** (en las simulaciones, ~1,4 s por año simulado, dentro del límite de 3 s).
- **Ajustar las curvas por edad y los topes** con muchas pruebas y tests (`sim:vida`, `sim:largo`).
- **Rivales adultos y profesionales** (E10): usarán la curva física por edad; hoy solo juegan hasta los 19.

- **Equilibrio del jugador que entrena a diario:** sube al podio en el 67 a 77 % de las carreras a 3 y 10 años. Se revisará cuando estén las lesiones (E12), el bonus de verano por buenas notas y el resto de piezas; no se toca antes.
- **Notas más bajas tras la nueva escala:** la media del equilibrado pasa de 7,2 a ~6,2 (el tope de las asignaturas ronda 62). Valorar si se quiere subir el tope típico de las asignaturas.
- **Conocimiento:** sin techo duro; es malus y bonus sobre lo táctico. Si el efecto (×0,85 a ×1,15) se queda corto, subirlo.
- **Dificultad al crear la partida (E15.1):** los rangos de calidad de los padres del jugador (fácil, normal, difícil) ya están como dato; falta la pantalla.
- **Hermanos** con su propia tirada de herencia (Godot genera 0 a 3).
- **Relaciones, fase 2 de E20:** acciones variadas (charlar, ayudar, discutir, hacer las paces), intereses y rasgos de los NPCs.
- **Nivel alcanzado de los padres** (frente a su tope) y su historia de lesiones: llegará con las lesiones y los eventos.

- **Consecuencias de la salud muy baja:** ahora el bot que sobreentrena llega a salud 0 sin más castigo que rendir menos. Idea: lesión o baja médica que bloquee entrenar unos días.
- **Segundo deporte:** validará que la plantilla de deporte funciona sin tocar el motor.
- **Más vida para los NPCs:** eventos, conversaciones, rivalidades (los 16 rivales de atletismo ya existen y progresan; falta que sean personajes con historia).
- **Plan de características, personalidad y perks:** ver `BACKLOG_STATS.md`. E1 y E3 (menos E3.4) hechas; siguiente paso a decidir: el sistema de eventos y decisiones, que desbloquea personalidad, perks, autoridad, picardía y las lecturas tácticas.
- **Modificadores por edad:** la edad ya existe pero no afecta a la subida ni a la caída de stats (decay por edad, ritmo de crecimiento; E2.6).
- **Alimentación y lesiones:** el peso y la complexión dependen solo de hábitos de actividad; falta alimentación como decisión y lesiones ligadas a la constitución.
- **UI filtrada por inteligencia (E3.4):** hoy la identidad y las stats se ven siempre con todo detalle.
- **Beca deportiva:** usar el servicio `estudios` (nota media) desde un deporte.
- **App nativa en el móvil:** la PWA ya se instala desde el navegador; Capacitor solo si hace falta tienda de aplicaciones.
- **Acciones de GitHub:** actualizar versiones cuando GitHub retire Node 20 en los runners (ahora sale un aviso, no un error).
