# Relevo: sucesos, lote 2 (colegio, amigos y casa) — análisis y propuesta

Sesión `claude/sucesos-lote-2` (sale de `claude/youthful-clarke-vs0kye`), 22/11/2026. **Análisis con propuesta: no se ha creado ningún suceso, no se ha tocado el juego, ni `DECISIONES.md` ni los anexos.** Los sucesos se escriben en una segunda fase, cuando el usuario apruebe esto.

Encargo del usuario (citado en el encargo): los sucesos son prioridad alta, «es lo que va a hacer que los días no se vuelvan repetitivos fácilmente; tenemos que mimarlos mucho». La entrada de `DECISIONES.md` «Sucesos: prioridad alta…» **no está en esta rama** (la última entrada es la del 22/11 sobre PNJ que entrenan); lo he tomado del encargo.

**Cómo se ha medido** (todo reproducible, nada de esto queda en el repositorio salvo este documento):

- `npm run sim:eventos -- 180 2` (7 bots × 2 semillas × 180 días). Es la tabla de §1.1.
- Un registro propio de 180 días (semilla 1017) de los bots `equilibrado`, `atleta`, `aleatorio` y `vago`, que anota por cada suceso el día, la hora, el lugar y las personas (un script temporal, no guardado). **No he jugado una partida a mano**: no hay interfaz que pueda manejar desde aquí; los números salen de los bots. **La hora de cada suceso es la de al acabar la acción que lo provocó.**
- Lectura de todos los sucesos de `modules/eventos/src/**` y de los deportes, de `ANEXO_EVENTOS.md`, `PLAN_EVENTOS.md` (§7 a §7 ter), `ANEXO_HORARIOS_PNJ.md`, `ANEXO_RELACIONES.md` y del código del director (`modules/sucesos/src/index.ts`).

---

## 1. Diagnóstico de la repetición

### 1.1 Lo que hay y cuánto sale (`sim:eventos`, 180 días × 2 semillas)

**63 sucesos** (54 base, de ellos unos 18 de perks latentes, y 9 de deporte), en 3 hilos y 55 sueltos. Media de **2,7 eventos por semana** (vago 2,0; empollón 2,3; abandono 2,5; aleatorio 2,8; atleta 3,0; equilibrado 3,1; sobreentrena 3,4). Por año salen **142,6 eventos en total, y 95,8 (el 67 %) son del colegio** (aula y patio); casa, barrio y camino juntos suman **17,9 (el 13 %)**.

Los que más se repiten (veces por año, media de los 7 bots), cada uno con **un único texto**:

| Suceso | Por año | Suceso | Por año |
|---|---|---|---|
| `colegio.pregunta_del_profesor` | 13,5 | `colegio.balon_perdido` | 9,6 |
| `colegio.companero_pide_ayuda` | 12,0 | `colegio.juego_nuevo` | 9,4 |
| `colegio.dia_de_lluvia` | 9,7 | `colegio.nota_por_la_clase` | 9,4 |
| `colegio.pique_en_el_patio` | 8,8 | `atletismo.tarde_al_entrenamiento` | 8,1 (16–18 al que llega tarde) |

Un jugador que cursa un año lee **la misma frase de «Te preguntan a ti» unas 13 veces** y la de «Te piden ayuda» 12. Son 18 detalles de aula y patio con esperas de 15 a 90 días, pero con un solo texto cada uno: las esperas evitan el seguido, no la repetición del año.

### 1.2 Una semana y un curso típicos (bot `equilibrado`, 180 días, semilla 1017)

- **81 eventos en 180 días = 3,15 por semana.** Días **sin ningún evento: 119 de 180 (66 %)**; con 1: 43; con 2 o más: 18. Semanas sin ninguno: 2 de 25 (en el `vago`, 5 de 25; sus días sin evento son 143 de 180).
- **Tres semanas seguidas, como las vería el jugador** (semanas 6 a 8; `lun`, `mar`…):
  - Semana 6: lun `companero_pide_ayuda` y `tarde_al_entrenamiento`; mar `nota_por_la_clase`; sáb `hermano_quiere_jugar`. (4 eventos.)
  - Semana 7: dom `perro_suelto`. (**1 evento.**)
  - Semana 8: mar `dia_de_lluvia` (una línea sin decisión). (**1 evento, y no se decide nada.**)
- Entre los 81 eventos, **solo 29 personas distintas**; las que más salen son el entrenador (9: siempre «llegar tarde»), el hermano (7, todos `hermano_quiere_jugar`), y unos pocos compañeros y profesores (3–4 cada uno).

### 1.3 Qué horas y lugares se quedan vacíos

Reparto de los 81 eventos del `equilibrado` por franja (hora al acabar la acción) y por lugar:

| Franja | Eventos | Qué los provoca | Lugar | Eventos |
|---|---|---|---|---|
| 7:00–8:00 (camino, entrada) | 3 (4 %) | cuando coincide | aula | 30 (37 %) |
| 9:00–10:00 (clases) | 10 (12 %) | detalles del aula | patio | 27 (33 %) |
| **10:00–11:00 (el recreo)** | **35 (43 %)** | detalles del patio | pista del colegio | 13 (16 %) |
| 11:00–14:00 | 12 (15 %) | aula, comida | casa | 10 (12 %) |
| 14:00–17:00 (salida, tarde) | 2 (2 %) | — | gimnasio, parque, barrio | 1 |
| 17:00–19:00 | 14 (17 %) | club y cumples | | |
| 19:00–24:00 (casa, noche) | 5 (6 %) | cena, hermano | | |

Por día de la semana: lun 27, mar 18, mié 9, jue 11, vie 11, **sáb 4, dom 1**. Los fines de semana (2 de cada 7 días) tienen **el 6 % de los eventos**.

Los huecos, de más a menos graves:

1. **Casa a partir de las 17:00 y todo el fin de semana.** El personaje pasa en casa el 48–90 % del tiempo (según el bot) y casa recibe **10 eventos en 180 días**. Hay cuatro detalles de casa (`ayudar_con_la_cena`, `cena_favorita`, `hermano_quiere_jugar`, `noche_sin_sueno`); los tres que salen «al llegar a casa» solo sirven si el bot vuelve a casa entre las 16 y las 21.
2. **Antes de las 8:10.** `companero_de_camino` y `se_hace_tarde` (calle del colegio, 7:15–8:10) y `noche_sin_sueno` salen **0 veces** en `sim:eventos`: los bots no pisan esa calle antes de las 8:10 ni están en casa de noche (ya lo contó el lote 1). Son sucesos ciegos para la simulación; solo se prueban con `pruebas`.
3. **El camino de vuelta y la salida (14:00–14:30).** Nada. En la salida están los hermanos escolares, los compañeros que se reparten por la entrada o el patio y un 15 % de vecinos adultos que **recogen** a los niños (`ANEXO_HORARIOS_PNJ.md`): ninguno tiene suceso.
4. **La tarde en el parque** (15:00–19:00 entre semana, todo el día en fin de semana): los amigos van al parque el 40–60 % de las tardes y los fines de semana, y **no hay ningún suceso con ellos**. Solo `perro_suelto` y `musico_en_la_avenida`, sin personas.
5. **Dentro de la clase**, solo hay `clase.asistida` con un 6 % por clase y siempre lo mismo (una pregunta, una petición, una nota, lluvia). **No existe nada sobre exámenes, notas, boletín, deberes, tutoría, Educación física después del primer día ni el cambio de trimestre**, aunque el juego tiene exámenes con aviso una semana antes (`estudios`). Motivo: **`estudios` no emite ninguna señal de examen ni de boletín** (solo `clase.asistida` y `clase.faltas_excesivas`), así que hoy un suceso no puede engancharse a ellos.
6. **Vacaciones** (`periodo: navidad | semana_santa | verano`): ningún suceso las usa y `sim:eventos` con 180 días ni llega al verano.

### 1.4 Qué personas casi no aparecen

| Persona | Sucesos que la usan hoy | Observación |
|---|---|---|
| **Amigos con nombre** (estado `amigo` / `mejor_amigo`) | solo `cumple` (4/año por jugador) | Ningún suceso mira el estado de la relación salvo el cumple. Los detalles de patio eligen «un conocido cualquiera» (`quien`). **Hacerse amigo no cambia qué te pasa.** |
| **Hermanos** | 1 (`hermano_quiere_jugar`, 3/año) | Y solo «quiere jugar». Nada con un hermano mayor ni con uno pequeño que no duerme. |
| **Padre y madre** | 3 (`ayudar_con_la_cena`, `cena_favorita`, las faltas) | Las faltas (hilo bueno) solo les pasan a bots que faltan a clase. |
| **Profesores y tutor** | 4 (pregunta, se equivoca, tarde a clase, EF) | Ningún suceso es del tutor. No hay un papel «tutor del curso» en el formato (el reparto sale de `rol: 'profesor'` y la asignatura); si se quiere uno fijo habrá que decidirlo. |
| **Vecinos** | 0 | El reparto solo elige a gente conocida (`known: true`) salvo `conocido: false`; los vecinos adultos son desconocidos hasta presentarse y no están por la puerta de casa. El lote 1 ya renunció a un suceso de vecinos por eso. |
| **Rivales fuera de la competición y bibliotecarios** | 0 | |
| **Compañeros** | 6 detalles | Siempre el mismo papel genérico `quien`: ningún compañero llega a ser «el que se sienta a tu lado». |

### 1.5 Resumen en una frase

El juego tiene suficiente **motor** (formato, hilos, memoria, esperas, escenarios) pero muy poco **contenido** y mal repartido: dos tercios en dos sitios (aula y patio, a las 10:40), un solo texto por suceso, ningún suceso sobre amigos con nombre ni sobre la vida fuera del colegio, y **seis marcas de memoria que nadie lee** (`MAPA.md`: `lesionado_hace_poco`, `mintio_a_sus_padres`, `lo_pillaron_mintiendo_en_casa`, `rompio_una_promesa_en_casa`, `le_recomendaron_un_deporte`, `futbol_quiere_cambiar_de_puesto`): las consecuencias no vuelven.

---

## 2. Criterios de calidad propuestos («mimar» un suceso)

Para que los apruebe el usuario. Cada uno dice si el **motor ya lo permite** (✅), se puede hacer con un truco (🟡) o **falta algo** (❌, y qué).

| # | Criterio | Qué significa | Motor |
|---|---|---|---|
| **C1** | **Variedad de texto.** Todo suceso que pueda salir más de ~6 veces por año tiene **al menos 3 versiones del texto de entrada** (y, donde se pueda, del resultado), que cambian por contexto (hora, día, relación, estado, carácter, época del curso) **y** por azar entre las que sirven. | Nadie lee la misma frase 13 veces | 🟡/❌ Por contexto ya vale: `variantes` con `si` (hora, `diaDeLaSemana`, `periodo`, `relacion`, `caracter`, `marca`, `hecho`). **Por azar no existe**: «gana la primera variante cuyas condiciones se cumplen». Falta: variantes con `peso` o una lista `textos: [...]` elegida con `rngEstable(semilla, suceso, día)`. Es un cambio pequeño (formato + director + validación + prueba de todos los caminos). Mientras tanto, una variante por contexto cubre unas 3. |
| **C2** | **Hilos con continuidad.** Lo que importa (un secreto, un préstamo, una pelea, un apodo) es un **hilo de 2–4 pasos** en días distintos, no un suceso suelto. Los detalles ligeros se reservan para el color. | Los días se sienten como una historia | ✅ `hilo`, `programa` con `dias`/`proximo`/`elCumpleDe`, `una_por_reparto`, `escenarios`. |
| **C3** | **Memoria que vuelve.** Toda marca que un suceso pone la **lee otro** (o un texto) antes de 2–8 semanas; `npm run eventos:validar` ya avisa de las que nadie lee (hoy 6). Una marca con `dura` caduca. | Lo que haces tiene consecuencias | ✅ `marca`/`quitaMarca` (con `de`), `contador`, `recuerda` + `{recuerdo.x}`, `sobreRecuerdo`. 🟡 El **texto** de un suceso suelto solo puede leer marcas con variantes (`si: [{ marca }]`), no «insertar» el valor de una marca; basta con variantes. |
| **C4** | **Personas con nombre y relación.** Cada suceso que pasa con gente usa un **papel concreto** (la madre, el hermano pequeño, un amigo de afinidad ≥ 40, el profesor de Lengua, quien se sienta a tu lado) y **cambia según el estado del vínculo** (`amigo` ≠ `conocido`). Los papeles genéricos `quien` quedan para el color. Máximo un papel nuevo por suceso, para no abusar de «gente sin nombre». | Que se note quién es quién | ✅ Reparto por `tipo`, `rol`, `relacion` (afinidad, confianza, `estado`), `presente`, `edad`, `asignatura`, `cumpleEn`; `presenta` para conocer a alguien. ❌ El **tutor del curso** no existe como papel; los **vecinos** y quien «recoge» solo salen si `conocido: false` y el texto puede nombrar a un desconocido (a comprobar). Y no hay señal de «he quedado con X» (§4.2). |
| **C5** | **Carácter.** Cada decisión tira a **dos ejes distintos como mínimo**, hay una opción con el extremo contrario de cada eje marcado en el suceso, y alguna variante o el aviso «no va contigo» aprovechan el carácter del personaje. Sin opciones «correctas»: cada una cuesta algo (tiempo, energía, relación, dinero). | Las decisiones dicen quién eres | ✅ `caracter` en la opción, `requiere: [{ caracter }]`, `fueraDeCaracter`, `{ caracter: eje, min }` en `cuando`/`si`. |
| **C6** | **Ritmo objetivo.** Media de **6 eventos por semana** (hoy 2,7), con un mínimo de 4 y un máximo de 9 (el chequeo salta a 10): ≤ 35 % de los días lectivos sin ningún evento (hoy 66 %); ≥ 1 evento por semana **fuera del aula y del patio** y ≥ 1 en **casa o fin de semana**; ninguna semana sin un evento que se decide. La mitad de los detalles sale en **una línea** (`presentacion: 'linea'`) para no llenar de ventanas. | Cada día tiene algo, sin agobiar | ✅ `cupo`, `presentacion`, `sim:eventos`. ❌ **Falta medir**: `sim:eventos` da veces por año y por semana, pero no **por franja, lugar, día de la semana, personas distintas ni días sin evento**. El registro de §1 lo hace en 40 líneas: convertirlo en `npm run sim:eventos -- --reparto` y en chequeos de `sim/src/analysis.ts`. |
| **C7** | **Esperas y rotación.** Esperas de 30–90 días para lo reconocible y, entre sucesos de una misma zona (patio, aula, cena), **no dos iguales seguidos**. Con 18 detalles de colegio y un 12 % de probabilidad, las esperas ya reducen el seguido, pero no «que salga siempre el mismo». | No se siente la repetición | ✅ `repite: { espera }`, `porReparto`. 🟡/❌ La **rotación** («no repetir hasta que hayan salido los demás de su familia», como una baraja) no existe: `peso` es fijo. Falta: `familia: 'patio'` y un peso que baja tras haber salido. Alternativa hoy: esperas largas. |
| **C8** | **Que no salga siempre a la hora de siempre.** El 43 % de los eventos del `equilibrado` salen a las 10:40 porque los del patio se disparan al llegar. Repartir los disparos: entrada (7:30), clases, recreo, **salida (14:00–14:30)**, tarde, noche, fin de semana. En cada suceso, ventanas de hora amplias (30–90 min) y no un minuto fijo. | Que el reloj no sea el mismo | ✅ `al: lugares.llegada` + `cuando.hora`; `cada: 'dia'` + `aguanta` + `hora` (como `noche_sin_sueno`); `al: 'accion.realizada'` con `lugar` y `hora` para «llevas un rato en casa». ❌ Los bots no ven lo de antes de las 8:10 ni la noche: solo `pruebas` (§3.0). |
| **C9** | **Consecuencias visibles.** Cada opción termina con una frase de resultado concreta (qué dice o hace la otra persona), y lo que cambia (afinidad, estrés, dinero, marca) debe notarse **días después** en otro sitio: un comentario, otra variante, una opción que se abre o se cierra. Los efectos invisibles (solo +1 de afinidad) solo valen en los detalles. | No es un número escondido | ✅ `resultado`, `variantes`, `opcionDisponible`/`requiere`. |
| **C10** | **Reglas de escritura.** 2–4 frases, un detalle de los sentidos, diálogo corto entre comillas, tuteo, humor suave, **sin moraleja** ni «deberías». Género concordado con `{x:o\|a}` y papel opcional con variante. Un hilo no puede tener un texto que dependa de algo que el jugador no ha elegido. | Que se lea bien | ✅ La validación comprueba llaves, papeles y género en todos los caminos (`eventos:validar`). |
| **C11** | **Se prueba.** Todo hilo lleva `escenarios`; todo suceso con hora o lugar fino lleva `pruebas`; `eventos:validar`, `eventos:mapa` y `sim:eventos` antes de dar nada por cerrado. | No se rompe lo anterior | ✅ |
| **C12** | **Un hilo fuerte a la vez.** Los hilos de tono serio (la discusión de los padres, el secreto, la pelea, la mudanza) no se abren si ya hay otro abierto: se protege con una marca `hilo_serio_abierto` que se pone al abrir y se quita al cerrar. | Sin saturar de dramas | 🟡 Con `marca` en `cuando` y `fin`. No hay «límite de hilos abiertos» en el director; una marca basta. |

### 2.1 Qué le falta al motor (resumen, para priorizarlo)

| Falta | Para qué | Tamaño | Lo necesitan |
|---|---|---|---|
| **E1.** Variantes y textos al azar (C1) | Que un suceso frecuente no se lea igual | pequeño (formato, director, validación, caminos) | todos los frecuentes |
| **E2.** Señales de `estudios`: `estudios.examen_aviso` (el día antes), `estudios.examen_hecho` (con `asignatura` y `nota`) y `estudios.boletin` (con la nota media), como señales compartidas con su dato; las emite `estudios` (regla 4) | Los exámenes y notas dan sucesos | pequeño (3 emisiones + tipos en `contracts` + tests de `estudios`) | `eventos.colegio.examen`, `eventos.colegio.boletin` |
| **E3.** Señal de relaciones al quedar o pasar un rato con alguien: `relaciones.rato_juntos` con `npcId`, `plan`, `lugar`, `minutos` (como `participants` de las del deporte) | Sucesos de «la quedada con X» (amigo en casa, parque) | pequeño-medio (relaciones emite; sucesos usa `deLaSeñal`) | `eventos.amigos.visita_en_casa`, ampliable |
| **E4.** Hecho `cumple_en_dias` / `es_tu_cumple` (el propio) | Tu cumpleaños | pequeño (hecho común) | `eventos.casa.tu_cumple` |
| **E5.** Rotación por familia (C7) | Variedad | medio | opcional |
| **E6.** `persona.se_va` (un amigo se muda: sale de tu círculo o cambia de colegio) | La mudanza | **medio-grande** (toca `npcs` y agendas) | `eventos.amigos.mudanza` (**propuesta: dejarlo fuera del lote**) |
| **E7.** Amigos en casa (agenda: «visita» en tu casa durante un plan) | Que el amigo esté de verdad en casa | medio (`npcs` + horarios) | `visita_en_casa`, `tu_cumple` |
| **E8.** `sim:eventos` por franja, lugar, día, persona (C6) y bots que se levantan temprano y se acuestan tarde | Medir lo de antes de las 8:10 y la noche | pequeño (herramienta y `bots.ts`) | todos |

---

## 3. Candidatos del lote

**Convenciones** (las del código actual): ids `eventos.<área>.<nombre>` (el área `amigos` es nueva; el registro lo exige con el prefijo del módulo); `menor` = detalle ligero con cupo propio; textos con `{x.nombre}` y `{x:o|a}`; cifras provisionales. **Veces/curso** es una estimación (probabilidad × ocasiones por curso, recortada por la espera, para el jugador que pasa por ahí) y **no** lo que medirán los bots.

### 3.0 Cómo se prueba cada uno

| Cómo | Candidatos |
|---|---|
| **Solo con `pruebas` / `escenarios`** (los bots no pasan por ahí: antes de las 8:10, noche, fin de semana, verano, un hilo largo) | `en_la_puerta`, `copiar_deberes`, `desayuno`, `hermano_no_duerme`, `padres_discuten`, `tarea_del_hogar`, `cena_de_domingo`, `parque_partido`, `verano_aburrido`, `ahorrar_para_algo` (el pago del sábado) y todos los pasos de un hilo a más de 2 semanas |
| **También los medirá `sim:eventos`** | `capitan_de_equipo`, `cambio_de_sitios`, `rumor`, `salida_con_hermano`, `deberes_con_padre`, `regalo_inesperado`, `apuesta_en_el_patio`, `un_amigo_de_un_amigo`, `amigo_que_se_enfria`, los hilos `companero_nuevo`, `tutor_se_preocupa`, `apodo`, `secreto`, `pelea_entre_amigos`, `prestado` |
| **Necesitan algo del motor** (§2.1) | `examen` y `boletin` (E2), `visita_en_casa` (E3, E7), `tu_cumple` (E4, E7), `mudanza` (E6), y cualquier suceso frecuente que quiera textos al azar (E1) |
| **Necesitan algo de los horarios** | `visita_en_casa` y `tu_cumple` (amigos en tu casa durante el plan) |

### 3.1 Detalles ligeros (`menor`): 19

Formato: **id — título.** Disparo y espera · Quién · Opciones (tirada) → consecuencias · Recuerda/programa · Criterios · Ejemplo de texto · Cómo se prueba · Veces/curso.

#### Colegio (6)

1. **`eventos.colegio.en_la_puerta` — «Ya están en la entrada».** Disparo: `al: lugares.llegada`, `hasta: colegio`, 7:30–7:50, prob. 0,12; espera 14 días. Quién: un conocido o amigo `presente`. Variantes: **amigo** (afinidad ≥ 40) / **conocido** / **vais justos de tiempo** (`hora` ≥ 7:45). Opciones: charlar cinco minutos (afinidad +1,5; confianza +1) · saludar y entrar (nada) · hacer como que no lo ves (`sociabilidad` −1; afinidad −1 si es amigo). Recuerda: nada. Criterios: C1, C4, C8. *Texto (amigo):* «{quien.Nombre} te espera junto a la verja, con la mochila a medio cerrar. «Hoy hay Mates a primera, ¿tú te has enterado de algo?»». Prueba: solo `pruebas` (hora 7:35, lugar entrada). Veces/curso: ~8 (para quien llega antes de las 7:50).
2. **`eventos.colegio.copiar_deberes` — «¿Me dejas los deberes?».** Disparo: `al: clase.asistida` con `hora` 7:50–8:10 (la primera clase), prob. 0,08; espera 20 días. Quién: compañero conocido (variante por afinidad: `amigo` / `conocido`). Opciones: dejarlo copiar (`honestidad` −1; afinidad +2; entrena `gen.cooperacion`; si la nota media ≥ 7, +0,3 de estrés porque os pilla la profesora) · decir que no (`honestidad` +1; afinidad −2 si es amigo) · proponerle hacerlo juntos en el recreo (5 min; `disciplina` +1; tirada `gen.comunicacion` 45: éxito afinidad +3 y confianza +1; fallo: te quedas sin recreo). Recuerda: marca `dejo_copiar` de la persona (30 días): lo lee `eventos.colegio.profesor_lo_nota` (§ hilo 3, paso 3). Criterios: C3, C4, C5. *Texto:* «Antes de que llegue la profesora, {quien.nombre} te enseña la libreta en blanco. «Se me pasó, de verdad. ¿Me dejas la tuya cinco minutos?»». Prueba: `pruebas`. Veces/curso: ~6.
3. **`eventos.colegio.capitan_de_equipo` — «Hacen los equipos».** Disparo: `al: clase.asistida`, `asignatura = estudios.educacion_fisica`, prob. 0,10; espera 30 días. Variantes **por lo que vales**: `gen.forma` o `gen.velocidad` altas para su edad → te eligen de los primeros; medios → a mitad; bajos → de los últimos. Quién: dos capitanes del reparto (papel `capitan`: compañero conocido; papel `capitana` opcional). Opciones (solo en «último»/«a mitad»): decirle algo a quien te eligió (afinidad +1) · encogerte de hombros (nada) · pedir ser portero (tirada `gen.coordinacion` 40: éxito moral +3; fallo moral −2) · (en «de los primeros») elegir tú a un amigo (afinidad +2, otro compañero −1). Recuerda: contador `eventos.cuenta.ultimo_en_ef` → habilita `eventos.colegio.profesor_ef_pregunta` (idea para otro lote). Criterios: C1, C5, C9. *Texto (último):* «Quedáis tres sin elegir. {capitan.Nombre} se rasca la cabeza y señala al fondo: «Va, tú, que ya no hay más».». Prueba: bots; `pruebas` para las tres variantes. Veces/curso: ~5.
4. **`eventos.colegio.cambio_de_sitios` — «Nuevos sitios».** Disparo: `al: clase.asistida`, `trimestre` cambiado (`hecho: trimestre` con `sobreRecuerdo` o `cada: 'semana'` en la primera de cada trimestre), prob. 0,6 (1 por trimestre); `repite: una_vez_por_curso` ×3 con espera de 60 días. Quién: tutor/profesor + vecino de mesa (compañero elegido al azar; variantes según `relacion`: amigo, conocido, antipatía/enemigo). Opciones: aceptar el sitio · pedir cambio (tirada `gen.comunicacion` 50, más difícil con `autoridad` baja: éxito el cambio; fallo el profesor lo anota, afinidad con él −1) · sentarte al lado de otra persona de tu elección (si hay hueco; amigo +2; vecino anterior −1). Recuerda: marca `vecino_de_mesa` (la persona, 60 días): la leen `copiar_deberes` y el hilo 3 de `companero_nuevo`. Criterios: C3, C4, C9. *Texto (antipatía):* «La profesora reparte los nombres en la pizarra. Tu mesa, esta vez, compartida con {quien.nombreCompleto}. Os miráis sin gracia.». Prueba: `pruebas` (cada variante). Veces/curso: ~3.
5. **`eventos.colegio.rumor` — «Dicen que…».** Disparo: `al: lugares.llegada`, `hasta: patio`, 10:30–11:15, prob. 0,05; espera 60 días. Quién: dos personas: `rumor_de` (un amigo o conocido, afinidad ≥ 15) y `cuenta` (compañero conocido). Opciones: defender a quien se habla (`honestidad` +1; tirada `gen.carisma` 45: éxito `cuenta` se corta y afinidad con `rumor_de` +3; fallo afinidad con `cuenta` −2) · preguntarle a `rumor_de` qué hay de cierto (5 min; confianza +2 si afinidad ≥ 30) · contarlo tú también (`honestidad` −1; afinidad con `cuenta` +1; marca `fue_chismoso` 30 días) · irte. Recuerda: `fue_chismoso` (lo lee el hilo `secreto`: quien se entera deja de confiar). Criterios: C3, C4, C5. *Texto:* «{cuenta.Nombre} baja la voz en el corrillo. «¿Os habéis enterado de lo de {rumor_de.nombre}? Dicen que ayer…»». Prueba: bots (si pasan por el patio). Veces/curso: ~4.
6. **`eventos.colegio.salida_con_hermano` — «Te espera en la puerta».** Disparo: `al: lugares.llegada`, `hasta: colegio` entre 14:00–14:30 (la salida), prob. 0,10; espera 25 días. Quién: `hermano` (tipo hermano, `escolar`, presente en el colegio; si no hay hermano escolar, no sale). Variantes: **pequeño** (≤ 10 años) / **mayor** (≥ 3 años más). Opciones: volver juntos a casa (viaje rápido; afinidad +2; −10 min de tarde) · decirle que vas con tu gente (afinidad −1; amigos +1) · pedirle que te cuente cómo le ha ido (5 min; confianza +2; entrena `gen.empatia` 0,3). Recuerda: marca `hermano_te_espera` (7 días): la lee `eventos.casa.hermano_quiere_jugar` (variante «te lo mereces»). Criterios: C3, C4, C8. *Texto (pequeño):* «Entre el barullo de la salida, {hermano.nombre} te agarra de la mochila. «¡Te estaba esperando! ¿Vamos juntos?»». Prueba: bots (los que salen a las 14:00). Veces/curso: ~5.

#### Amigos (5)

7. **`eventos.amigos.regalo_inesperado` — «Esto es para ti».** Disparo: `al: lugares.llegada`, `hasta: patio` o `colegio`, cualquier hora lectiva, prob. 0,04; espera 45 días; requiere un amigo de afinidad ≥ 45. Quién: `amigo` (estado `amigo`/`mejor_amigo`). Opciones: aceptarlo con gracias (afinidad +2; estrés −1) · devolverle algo tuyo (`gen.dinero` −2 o una merienda: afinidad +3; marca `le_debes_una`, 20 días) · decir que no hacía falta (afinidad +1; confianza −1). Criterios: C4 (solo amigos), C9. *Texto:* «{amigo.Nombre} rebusca en la mochila y te pone un cromo en la mano, con la cara muy seria. «Lo tenía repetido. Es tuyo»». Prueba: bots. Veces/curso: ~4.
8. **`eventos.amigos.apuesta_en_el_patio` — «Te reto».** Disparo: `al: lugares.llegada`, `hasta: patio`, 10:30–11:15, prob. 0,05; espera 45 días. Quién: `retador` (amigo o compañero conocido, edad ± 1). Opciones: aceptar (tirada con `gen.velocidad` 48 −5 por cada ventaja del reto, o `gen.coordinacion` 45, según la variante «carrera» / «puntería»: éxito moral +3 y afinidad +1; fallo moral −1 y afinidad +1) · proponer otra cosa (empate: afinidad +2; tirada `gen.carisma` 45) · pasar (afinidad −1). Variantes por reto (carrera, aguantar la respiración, puntería). Recuerda: contador `eventos.cuenta.retos`. Criterios: C1 (3 variantes), C5. *Texto (carrera):* «{retador.Nombre} señala la valla del fondo. «Te echo una carrera hasta ahí. El que pierda se lleva la mochila del otro»». Prueba: bots. Veces/curso: ~4.
9. **`eventos.amigos.un_amigo_de_un_amigo` — «Te presento a…».** Disparo: `al: lugares.llegada`, `hasta: patio` o `parque`, prob. 0,04; espera 40 días; requiere un amigo (afinidad ≥ 35). Quién: `amigo` y `nuevo` (una persona **desconocida** cercana: papel con `conocido: false`; efecto `presenta: 'nuevo'`). Opciones: dar la mano y charlar (`presenta`; afinidad +1; confianza +1) · quedarte callad{yo:o|a} (`presenta`; nada) · hacer una broma (tirada `gen.carisma` 50: éxito afinidad +2; fallo −1). Crece la red de conocidos. Criterios: C4, C9. *Texto:* «{amigo.Nombre} tira de ti hacia un corrillo. «Mira, este es {nuevo.nombre}, el del curso de arriba. Ya te hablé de {nuevo:él|ella}»». Prueba: `pruebas` (la persona desconocida) y bots. Veces/curso: ~4.
10. **`eventos.amigos.amigo_que_se_enfria` — «Hace días que no hablas».** Disparo: `cada: 'semana'`, prob. 0,25, con la condición de que un `amigo` (estado `amigo`) tenga afinidad entre 20 y 35 y llevéis más de 3 semanas sin verte en actividad (se lee con `hecho` de relaciones: **hoy no existe**; se aproxima con `relacion: afinidad max 35` y estado `amigo`, que es el enfriamiento que ya modela `ANEXO_RELACIONES.md` §4); espera 45 días. Opciones: buscarlo y charlar (5 min; afinidad +2) · mandarle una nota (`creatividad` 40: éxito afinidad +3; fallo −1) · dejarlo pasar (afinidad −1; marca `dejo_enfriar`, 30 días, la lee el hilo `pelea_entre_amigos`). Criterios: C3, C9; «el mundo avanza solo». *Texto:* «Te das cuenta de que con {amigo.nombre} hace semanas que solo cruzas un «hola». Antes os contabais todo.». Prueba: `pruebas` (afinidad 28). Veces/curso: ~3.
11. **`eventos.amigos.parque_partido` — «Falta uno».** Disparo: `al: lugares.llegada`, `hasta: parque`, sábado o domingo (`diaDeLaSemana: [5, 6]`) 10:00–19:00, prob. 0,25 (el parque tiene a los amigos 60 %); espera 14 días. Quién: `amigo` presente + un conocido. Variantes: **fútbol**, **escondite/pilla-pilla** (≤ 10 años), **frisbi/baloncesto** (≥ 11). Opciones: apuntarte (30 min; energía −3; estrés −3; entrena `gen.cooperacion` 0,3; afinidad +2) · mirar desde la banca (afinidad +1) · irte (nada). Recuerda: contador `eventos.cuenta.fines_de_semana_en_el_parque` (desbloquea `un_amigo_de_un_amigo`). Criterios: C1, C8. *Texto (≤ 10):* «En el parque ya juegan al pilla-pilla. {amigo.Nombre} te grita: «¡Venga, que nos falta uno para cuadrar los equipos!»». Prueba: solo `pruebas` (fin de semana). Veces/curso: ~10 (los fines de semana de curso y verano).

#### Casa (8)

12. **`eventos.casa.desayuno` — «El desayuno de las prisas».** Disparo: `cada: 'dia'`, prob. 0,10, lugar `casa`, 6:30–7:30 de un día lectivo; `aguanta` 1; espera 12 días. Quién: `tutor` (madre o padre, presente). Variantes por el estado: **estrés alto** («no lo has dormido bien») / **vas bien de tiempo** / **has dormido poco** (energía ≤ 50). Opciones: desayunar con calma (10 min; energía +2; afinidad +1) · coger algo y salir (energía −1; estrés +1) · discutir por la ropa/la mochila (`agresividad` +1; afinidad −1; estrés +2). Criterios: C1, C8, C4. *Texto:* «{tutor.Nombre} ya está en la cocina cuando bajas, con el café humeando. «Siéntate, que hoy no llegas tarde»». Prueba: solo `pruebas` (6:45). Veces/curso: ~9.
13. **`eventos.casa.deberes_con_padre` — «¿Y esos deberes?».** Disparo: `al: lugares.llegada`, `hasta: casa`, 17:00–20:00, día lectivo, prob. 0,06; espera 20 días. Quién: `tutor`. Variantes por **nota media** (< 5: sin prisa pero preocupad{tutor:o|a}; 5–7: normal; ≥ 7: orgullo), y por la marca `rompio_una_promesa_en_casa` (de las faltas): «a ver si esta vez lo haces». Opciones: sentarte con {tutor:él|ella} (30 min; entrena `gen.concentracion` 0,3; afinidad +2; expectativas +1) · decir que ya los has hecho (tirada `gen.picardia` 45: éxito nada; fallo afinidad −3, estrés +2, marca `mintio_a_sus_padres`) · pedirle ayuda con algo concreto (afinidad +3; confianza +2). Recuerda: **lee** `rompio_una_promesa_en_casa` y `mintio_a_sus_padres` (cierra dos de las marcas sin lector). Criterios: C3, C4, C9. *Texto (nota baja):* «{tutor.Nombre} deja el móvil sobre la mesa cuando te ve entrar. «¿Qué tal el cole? ¿Y ese cuaderno?». Sabe más de lo que dice.». Prueba: bots y `pruebas` (variantes). Veces/curso: ~6.
14. **`eventos.casa.hermano_no_duerme` — «Ruidos en el pasillo».** Disparo: `cada: 'dia'`, prob. 0,05, lugar `casa`, 22:00–23:30; `aguanta` 1; espera 21 días. Quién: `hermano` (menor de 10 años). Opciones: dejarle un hueco en la cama (energía −2; afinidad +3) · llevarlo con tus padres (afinidad +1; confianza −1 con él) · decirle que se vuelva a su cuarto (afinidad −2; `agresividad` +1). Recuerda: marca `hermano_te_necesita` (10 días): la lee `hermano_quiere_jugar`. Criterios: C4, C8, C3. *Texto:* «Alguien arrastra los pies junto a tu puerta. Se abre un poco. «¿Estás despiert{yo:o|a}? He tenido un sueño raro…». Es {hermano.nombre}.». Prueba: `pruebas` (hora 22:30). Veces/curso: ~5.
15. **`eventos.casa.tarea_del_hogar` — «Sábado de limpieza».** Disparo: `cada: 'dia'`, sábado, prob. 0,25, lugar `casa`, 10:00–13:00; `aguanta` 1; espera 21 días. Quién: `tutor` y, si hay, `hermano` (opcional, con variante). Variantes: **tu cuarto**, **la compra** (con dinero: −3 € que te devuelven), **el balcón**. Opciones: hacerlo bien (30–45 min; estrés +1; afinidad +2; expectativas +1) · hacerlo rápido y mal (tirada `gen.picardia` 45: éxito nada; fallo afinidad −2) · negociar (a cambio de salir luego: tirada `gen.comunicacion` 50). Criterios: C1, C8, C9. *Texto (el cuarto):* ««Hoy te toca tu cuarto, que ya no se ve el suelo», dice {tutor.nombre} desde el pasillo, con la fregona en la mano.». Prueba: solo `pruebas`. Veces/curso: ~7.
16. **`eventos.casa.cena_de_domingo` — «¿Qué tal la semana?».** Disparo: `cada: 'dia'`, domingo, prob. 0,30, lugar `casa`, 20:30–22:00; `aguanta` 2; espera 21 días. Quién: `tutor` y `hermano` (opcional). **Es el lector de las marcas sueltas**: variantes por `lesionado_hace_poco` («¿cómo llevas el tobillo?»), `lo_pillaron_mintiendo_en_casa`, `prometio_no_faltar`, `hecho: faltas_del_trimestre`, nota media, el último resultado (`contador` de `competicion.resultado`) y la hora de entrenar. Una variante `por defecto` (nada que comentar). Opciones: contar la verdad (afinidad +1; confianza +2) · contar lo bueno y callarte lo malo (tirada `gen.picardia` 45: éxito nada; fallo −2 de confianza) · cambiar de tema. Recuerda: quita `lesionado_hace_poco` (la marca caduca tras 14 días si no) y puede poner `confia_en_ti`. Criterios: **C3 (cierra 3 marcas sin lector)**, C4, C1 (7 variantes). *Texto (con `lesionado_hace_poco`):* «Cenáis los tres en la mesa de la cocina. {tutor.Nombre} te mira el pie por debajo. «¿Y qué te dijo el fisio de lo del otro día?»». Prueba: `pruebas` (cada marca). Veces/curso: ~6.
17. **`eventos.casa.verano_aburrido` — «Una tarde sin nada».** Disparo: `cada: 'dia'`, `periodo: verano`, prob. 0,12, lugar `casa`, 16:00–19:00; `aguanta` 2; espera 10 días. Quién: ninguno (o `hermano` presente en variante). Variantes: **calor**, **sin planes**, **todos están fuera**. Opciones: salir a ver quién anda por el parque (viaje; se abre `parque_partido`) · tumbarte a leer o a dibujar (entrena `gen.creatividad` 0,3; estrés −3) · jugar a la consola/ver la tele (energía +1; motivación −1) · llamar a un amigo (se abre «proponer quedar»: **no existe**, solo la mención). Criterios: C1, C8. *Texto (sin planes):* «Son las cuatro y el ventilador solo mueve el calor de un lado a otro. Nadie ha dicho nada de esta tarde.». Prueba: solo `pruebas` (periodo verano). Veces/curso: ~8 (solo en los 2 meses de verano). Nota: `sim:eventos` con 180 días no llega al verano.
18. **`eventos.casa.tele_con_el_hermano` — «¿Qué vemos?».** Disparo: `al: lugares.llegada`, `hasta: casa`, 18:00–21:00, prob. 0,04; espera 30 días. Quién: `hermano` (≥ 5 años). Opciones: ver lo suyo (30 min; afinidad +2) · ver lo tuyo (afinidad −1) · turnarse con un trato (tirada `gen.comunicacion` 45: éxito afinidad +3; fallo −1). Criterios: C1, C4. *Texto:* «El mando está en el suelo, y {hermano.nombre} y tú lo habéis visto a la vez.». Prueba: bots. Veces/curso: ~4.

> **Los ligeros de §3.1 son 18**: colegio 6 (nº 1–6), amigos 5 (nº 7–11), casa 7 (nº 12–18).

### 3.2 Hilos de varios pasos: 12

Formato: **hilo — título.** Instancias · Quién · Pasos (disparo, espera, opciones con tirada y consecuencias) · Marcas y lo que programa · Criterios · Texto de ejemplo · Prueba · Veces/curso.

**Colegio (4)**

**H1. `eventos.colegio.companero_nuevo` — «Un compañero nuevo».** `instancias: una` (uno por curso, `repite: una_vez_por_curso`). Reparto: `nuevo` = compañero **desconocido** (`conocido: false`, `rol: companero`), más el `profesor` de la primera clase.
- **Paso 1 — `llegada`** (`al: clase.asistida`, prob. 0,15 en las 3 primeras semanas de clase, espera de curso). El profesor lo presenta («{nuevo.nombre} viene de otro colegio») y pide que alguien se siente con él; `presenta: nuevo`. Opciones: ofrecerte (afinidad +2, marca `sento_a_nuevo`) · mirar a otro lado (afinidad −0; marca `ignoro_a_nuevo`) · recomendarle un amigo (afinidad −1, marca `nuevo_con_otro`).
- **Paso 2 — `primera_semana`** (programado, 5–8 días; `cuando`: recreo en el patio). Variantes por marca: si `sento_a_nuevo`, {nuevo.Nombre} te busca para comer juntos; si no, lo ves **solo** en el escalón. Opciones: sentaros juntos (afinidad +3, confianza +2) · presentarle a tu grupo (tirada `gen.carisma` 45: éxito afinidad +3 con él y +1 con tu grupo; fallo −1) · seguir con lo tuyo.
- **Paso 3 — `un_mes_despues`** (programado, 21–30 días; `cuando`: clase). Resultado por la afinidad acumulada: pasa a **amigo** (marca `nuevo_es_amigo`, `afinidad ≥ 30`) o a **conocido** (`nuevo_se_fue_con_otros`). Una línea sin decisión; el jugador solo ve cómo le va.
- Criterios: C2, C3, C4, C9. *Texto (paso 1):* ««Chicos, un momento». La profesora abre la puerta y entra seguida de {nuevo.nombreCompleto}, con la mochila abrazada. «Viene de otro colegio. ¿Quién se ofrece a ayudar{nuevo:lo|la} con los primeros días?»». Escenarios: te ofreces / ignoras / otro; pasos separados por días. Prueba: `escenarios`; bots (parte). Veces/curso: ~1–2.

**H2. `eventos.colegio.tutor_se_preocupa` — «El tutor quiere hablar contigo».** `instancias: una`. Reparto: `profesor` (el que da Lengua o Matemáticas; `rol: profesor`, `asignatura`). Disparo `umbral: [{ hecho: nota_media, max: 5 }]` (cuando pasa de no cumplirse a cumplirse).
- **Paso 1 — `llamada`** (al umbral, en clase). «Quédate un momento.» Opciones: ir a hablar (5 min; confianza +2) · poner excusas (tirada `gen.picardia` 45: fallo afinidad −2) · decirle que te cuesta (`honestidad` +1; confianza +3; entrena `gen.comunicacion`).
- **Paso 2 — `plan`** (programado, 2–4 días, tutoría 14:00–17:00 en la sala de profesores). Propone un plan: repaso en recreos (−motivación, +estudio), una tutoría semanal (acción `estudios.tutoria`) o nada (solo para quien se negó). Opciones: aceptar el plan (modificador `estudio` ×1,10 durante 28 días; −10 min por semana) · aceptar la mitad · negarte (afinidad −3; sigue el paso 3 con tono duro).
- **Paso 3 — `seguimiento`** (programado, 28 días). Variantes por `sobreRecuerdo: nota_media`: **subió** (afinidad +3, motivación +4, marca `levanto_la_nota`) o **no** (llama a casa: `familia: tutor apoyo −2, expectativas +3`; el profesor sigue siendo amable).
- Criterios: C2, C3, C9. *Texto:* «{profesor.Nombre} guarda los exámenes en la cartera y te mira por encima de las gafas. «¿Te puedo decir una cosa sin que te enfades? Sé que puedes más que esto»». Escenarios: nota sube/no; plan aceptado/negado. Prueba: bots (los que bajan la nota: `vago`, `aleatorio`). Veces/curso: ~1 al jugador con notas bajas.

**H3. `eventos.colegio.apodo` — «Un mote».** `instancias: una`. Reparto: `quien` (compañero conocido, afinidad ≤ 30). Tono: **bromista, sin acoso** (ver dudas).
- **Paso 1 — `nace`** (`al: lugares.llegada`, `patio`, 10:30–11:15, prob. 0,03, espera 120 días). Alguien te llama de una forma («Rayo», «Profe»…) por algo que acabas de hacer (variantes por stat: lento/rápido, nota alta/baja, altura). Opciones: reírte (`optimismo` +1; afinidad +1; marca `acepto_el_mote`) · cortarlo en seco (`agresividad` +1; tirada `gen.autoridad` 45: éxito se corta y afinidad −1; fallo se extiende y estrés +2) · responder con otro mote (tirada `gen.picardia` 45: éxito risas y afinidad +2; fallo afinidad −2).
- **Paso 2 — `se_extiende`** (programado, 7–14 días; `cuando` patio o salida). Ahora otros lo repiten. Según la marca: con `acepto_el_mote` es cariño («¡Eh, Rayo!»); sin ella, molesta. Opciones: unirte (afinidad +1 con todos) · pedir que lo dejen (tirada `gen.carisma` 45) · irte.
- **Paso 3 — `se_olvida_o_se_queda`** (programado, 30–45 días). Una línea: el mote se **queda** (marca `tiene_mote` 180 días; los demás lo usan en textos de otros sucesos) o se olvida. Lo lee `eventos.colegio.pregunta_del_profesor` (variante: el profesor sonríe al oírlo).
- Criterios: C2, C3 (marca con lector), C5. *Texto:* «Has corrido la última vuelta tan deprisa que {quien.nombre} grita desde la valla: «¡Eso, Rayo!». Algunos se ríen. No sabes si te gusta.». Prueba: `escenarios`. Veces/curso: ~1 (una cada 4 meses).

**H4. `eventos.colegio.examen` — «Mañana, examen» (necesita E2).** `instancias: una_por_reparto` (una por asignatura examinada). Reparto: `profesor` de la asignatura de la señal (`asignaturaDeLaSeñal`).
- **Paso 1 — `aviso`** (`al: estudios.examen_aviso`, el día antes, tarde). Opciones: estudiar esta noche (60 min; energía −4; estrés +3; entrena `estudios.<asignatura>`) · repasar un rato y dormir (30 min; energía −1; estrés +1) · pasar (estrés −3; nada). Marca `estudio_para_el_examen` (1 día) según la elección. Lo leen las variantes del paso 2.
- **Paso 2 — `salida_del_examen`** (`al: estudios.examen_hecho`, 14:00–15:00). Variantes por la **nota** (`señal: nota`): ≥ 7 → te sale una sonrisa; 5–7 → rutinario; < 5 → te cae. Un amigo te pregunta («¿Cómo te ha ido?»). Opciones: contarlo con sinceridad (afinidad +1) · presumir (`honestidad` −1; tirada `gen.carisma` 45) · irte sin hablar (estrés +1).
- **Paso 3 — `comentan_las_notas`** (programado, 7–10 días). Se entregan las notas y se comparan. Variantes por tu nota frente a la del compañero. Marca `bien_en_` o `mal_en_` según la nota (60 días): la leen la cena de domingo y los deberes con el padre.
- Criterios: C2, C3, C9. *Texto (paso 1):* ««Mañana, el examen de {señal.asignaturaNombre}», ha repetido la profesora al salir. En la mochila, el libro sigue sin abrir.». Prueba: `escenarios` con las señales de ejemplo. Veces/curso: ~6 (6 parciales/globales con 3 trimestres).

**Amigos (4)**

**H5. `eventos.amigos.secreto` — «Me tienes que prometer una cosa».** `instancias: una_por_reparto`. Reparto: `amigo` (afinidad ≥ 40) y `curioso` (compañero conocido, para el paso 2).
- **Paso 1 — `confesion`** (`al: lugares.llegada`, patio o parque, prob. 0,02, espera 90 días). {amigo.Nombre} te cuenta algo suyo (le gusta alguien; suspendió y no lo dice en casa; se ha hecho una herida jugando). Opciones: prometer (marca `guardo_un_secreto`; confianza +3; `honestidad` +1) · decir que no puedes prometer nada (confianza −1; afinidad −1) · quitarle importancia (afinidad +1).
- **Paso 2 — `te_preguntan`** (programado, 3–7 días, patio o entrada). {curioso.Nombre} sospecha y te pregunta directamente. Opciones: callar (tirada `gen.carisma` 45: éxito se rinde; fallo insiste) · contarlo (`honestidad` −2; marca `conto_el_secreto`) · mentir con un secreto falso (tirada `gen.picardia` 50: éxito se lo cree y marca `mintio_por_un_amigo`; fallo `se_sospecha`).
- **Paso 3 — `se_entera`** (programado, 7–14 días). Si `conto_el_secreto`: {amigo.Nombre} se entera (marca de persona `te_delato`; afinidad −8, confianza −10) → propone el paso 4 · si no: te da las gracias (afinidad +4; marca `mejor_amigo_en_potencia`).
- **Paso 4 — `rota_la_confianza`** (solo si se supo, 3–5 días): disculparte (tirada `gen.empatia` 50: éxito afinidad +3 sin recuperar; fallo −3) · no hacer nada · decir que fue un accidente (`honestidad` −1; tirada `gen.picardia` 55).
- Criterios: C2, C3, C5, C12. *Texto (paso 1):* «{amigo.Nombre} tira de ti hasta la esquina del patio. «¿Me prometes que no se lo dices a nadie? A nadie, ¿eh?»». Escenarios: guarda / cuenta / se entera. Prueba: `escenarios`. Veces/curso: ~2.

**H6. `eventos.amigos.pelea_entre_amigos` — «No me hables de {b.nombre}».** `instancias: una_por_reparto`. Reparto: dos amigos `a` y `b` con afinidad ≥ 25 contigo y **entre ellos** (papel `b` ≠ `a`; la relación entre ellos no existe en el modelo de vínculos: se **aproxima** con que ambos sean amigos tuyos, ver dudas).
- **Paso 1 — `en_medio`** (`al: lugares.llegada`, patio, prob. 0,03, espera 90 días; o tras `dejo_enfriar` de §3.1 nº 10). Los dos se han peleado y cada uno te cuenta su versión. Opciones: ponerte de parte de `a` (afinidad +3 con `a`, −3 con `b`) · de parte de `b` (a la inversa) · decir que sois los tres amigos (tirada `gen.carisma` 50: éxito los dos +1; fallo ambos −1) · alejarte (nada; marca `no_se_metio` 14 días).
- **Paso 2 — `se_alejan`** (programado, 7–10 días). Un amigo lleva dos semanas con otro grupo. Variantes por tu elección: el que quedó mal te saluda frío; el otro te busca. Opciones: invitar a los dos a algo (plan; tirada `gen.comunicacion` 50) · buscar a uno por separado · dejarlo.
- **Paso 3 — `hacen_las_paces`** (programado, 21–35 días). Según lo hecho: se reconcilian contigo en medio (afinidad +3 con ambos, marca `unio_a_amigos`) o quedan separados (marca `amigos_separados`; afinidad de ambos −1 contigo, que pasa a verte «de un bando»).
- Criterios: C2, C3, C4, C5, C12. *Texto:* «{a.Nombre} entra en tu aula con los puños cerrados. «No quiero ni oír hablar de {b.nombre}. ¿Tú de qué lado estás?»». Escenarios: cada rama. Prueba: `escenarios`. Veces/curso: ~1–2.

**H7. `eventos.amigos.prestado` — «¿Me dejas cinco euros?».** `instancias: una_por_reparto`. Reparto: `amigo` (afinidad ≥ 30) con `gen.dinero` ≥ 5 del jugador (condición del suceso).
- **Paso 1 — `peticion`** (`al: lugares.llegada`, patio o parque, prob. 0,03; espera 90 días). Opciones: prestarlo (`gen.dinero` −5; afinidad +3; marca `presto_dinero` 60 días) · decir que no tienes (afinidad −1; **la marca `miente_sobre_el_dinero` si de verdad tenías**) · prestarle menos (`gen.dinero` −2; afinidad +1).
- **Paso 2 — `lo_devuelve`** (programado, 10–20 días). Variantes por el carácter del amigo (su `honestidad`, leída del PNJ): **devuelve** (+5 € y afinidad +2) o **se hace el olvidadizo** (nada).
- **Paso 3 — `reclamar`** (programado, 10 días; solo si no devolvió). Opciones: reclamarlo con calma (tirada `gen.comunicacion` 45: éxito te lo devuelve y afinidad +1; fallo afinidad −2) · dejarlo (marca `perdono_una_deuda`; afinidad +2, dinero −5 definitivo) · discutir (afinidad −6; acción `relaciones.discutir`).
- Criterios: C2, C3, C5, C9. *Texto (paso 3):* «{amigo.Nombre} pasa a tu lado sin mirar. Hace un mes que te debe cinco euros y ni lo ha mencionado.». Escenarios. Prueba: `escenarios`; bots con dinero. Veces/curso: ~1–2.

**H8. `eventos.amigos.mudanza` — «Nos mudamos» (necesita E6; propuesta: fuera del lote).** `instancias: una_por_reparto`. Reparto: `amigo` (estado `mejor_amigo` o afinidad ≥ 60).
- Paso 1 aviso («me voy en verano») → paso 2 despedida (fiesta, regalo, carta) → paso 3 último día de curso → paso 4 «una carta» meses después (afinidad se mantiene en +x si escribiste).
- Es el mejor hilo emocional del lote, pero **hoy un PNJ no puede irse** del mundo (hace falta `persona.se_va`/cambio de colegio en `npcs`) y la despedida pide al amigo en casa (E7). **Recomiendo dejarlo para el lote 3** (dudas).

**Casa (4)**

**H9. `eventos.casa.padres_discuten` — «Se oyen voces».** `instancias: una`. Reparto: `padre`, `madre` (ambos), `hermano` (opcional).
- **Paso 1 — `voces`** (`cada: dia`, prob. 0,02, lugar `casa`, 22:00–23:30 en día lectivo; espera 180 días; sin dramas: **solo se permite si `familia.apoyo` ≥ 50**, para no tocar a familias ya tensas). Las voces tras la puerta; no se entiende nada. Opciones: asomarte (tirada `gen.empatia` 40: éxito afinidad +2 con quien te ve; fallo, te pillan) · taparte con la almohada (nada) · ir al cuarto de tu hermano (afinidad +2 con él; menos estrés).
- **Paso 2 — `a_la_mañana_siguiente`** (programado, 1 día; `desayuno`). Hay un silencio raro en la cocina; variantes por tu elección. Opciones: preguntar qué pasaba (tirada `gen.comunicacion` 45: éxito confianza +3; fallo «cosas de mayores») · hacer como si nada (nada) · contar algo gracioso del colegio para romper el hielo (`optimismo` +1; tirada `gen.carisma` 45).
- **Paso 3 — `se_arregla`** (programado, 7–14 días). Una línea de cena: vuelven a reírse (marca `la_casa_se_calma`, `familia.apoyo` +2) o queda un poso (la cena de domingo lo menciona).
- Criterios: C2, C3, C9, C12; **tono delicado: dudas §5**. *Texto (paso 1):* «Desde tu cama oyes a tus padres, en la cocina, hablar bajo y rápido. Una frase se te cuela por la rendija: «…y siempre dices lo mismo»».. Prueba: `escenarios`. Veces/curso: ~0,5 (una vez cada dos cursos).

**H10. `eventos.casa.ahorrar_para_algo` — «Lo que quieres de verdad».** `instancias: una`. Reparto: `tutor` (el que más apoya).
- **Paso 1 — `deseo`** (`cada: semana`, prob. 0,10, lugar `casa`, fin de semana por la mañana; espera 120 días). Quieres algo (una pelota de verdad, unas zapatillas, un juego): el precio sale del `gen.dinero` actual × 2. Opciones: pedírselo (tirada `gen.comunicacion` 45: éxito te dan la mitad; fallo «ya veremos») · proponer ahorrar y que ponga la otra mitad (`disciplina` +1; marca `ahorra_para`) · olvidarlo.
- **Paso 2 — `la_paga`** (programado, 7 días, sábado). Una paga o un trato de tareas: variantes por la marca. Opciones: aceptar las tareas (se encadena con `tarea_del_hogar`) · pedir más (tirada `gen.carisma` 50) · gastarlo en otra cosa (`gen.dinero` −3; marca `se_gasto_la_paga`).
- **Paso 3 — `la_compra`** (programado, 21–35 días, sábado; `cuando`: `gen.dinero` ≥ precio). Opciones: comprarlo (`gen.dinero` −precio; motivación +6; marca `compro_lo_que_queria`) · esperar a una oferta · gastarlo en otra cosa (afinidad con el tutor −1).
- Criterios: C2, C3, C5, C9. *Texto:* «Llevas toda la semana mirando las zapatillas del escaparate. «¿De cuánto hablamos?», pregunta {tutor.nombre}, sin levantar la vista del periódico.». Escenarios (con dinero). Prueba: `escenarios`. Veces/curso: ~1.

**H11. `eventos.casa.boletin` — «Las notas de la evaluación» (necesita E2).** `instancias: una` por trimestre. Reparto: `tutor`.
- **Paso 1 — `se_entregan`** (`al: estudios.boletin`, en el colegio). Opciones: abrirlas en la entrada (variantes por nota media) · guardarlas sin mirar · enseñárselas a un amigo (afinidad +1). Marca `nota_del_trimestre` (con el valor).
- **Paso 2 — `en_casa`** (programado, mismo día por la tarde, lugar casa, `tutor` presente). Variantes por nota media y por `rompio_una_promesa_en_casa`: **buenas** (premio: cena favorita), **normales**, **malas** (charla: `familia.expectativas` +4). Opciones: enseñarlas tú · esconder el boletín (tirada `gen.picardia` 50: fallo `lo_pillaron_mintiendo_en_casa`) · pedir perdón antes de que pregunte (`honestidad` +1).
- **Paso 3 — `consecuencia`** (programado, 21 días). Un **modificador** de estudio o de ocio según lo hablado (castigo de ocio de 7 días o premio de una salida).
- Criterios: C2, C3, C9. *Texto:* «El sobre pesa lo mismo que siempre, pero hoy lo notas más. {tutor.Nombre} sale de la cocina y lo ve en tus manos.». Escenarios. Prueba: `escenarios`. Veces/curso: ~3 (una por trimestre).

**H12. `eventos.casa.tu_cumple` — «Tu cumpleaños» (necesita E4 y E7).** `instancias: una` por año. Reparto: `tutor`, y amigos de afinidad ≥ 35 como invitados.
- Paso 1 — `planear` (tres días antes: elegir a quién invitar, máximo 3 → afinidad) → paso 2 — `fiesta` (en casa, 17:00–20:00: asisten los invitados; variantes por quién viene y quién no) → paso 3 — `recuerdo` (una línea con el balance: marca `cumple_recordado` y `contador` de invitados).
- **Necesita**: un hecho para saber que mañana es tu cumple y **amigos en tu casa** (las agendas dejan «casa» solo a la familia). Recomiendo dejarlo para el lote 3 junto con E7.

> **Hilos de §3.2: 12, de los cuales 4 necesitan motor o horarios** (`examen` y `boletin`: E2; `mudanza`: E6; `tu_cumple`: E4 y E7). **Los 8 que se pueden escribir hoy**: `companero_nuevo`, `tutor_se_preocupa`, `apodo`, `secreto`, `pelea_entre_amigos`, `prestado`, `padres_discuten`, `ahorrar_para_algo`. **Con E2, los 2 de las notas (`examen`, `boletin`)** son los más baratos de desbloquear.

### 3.3 Resumen del lote

| Reparto | Ligeros | Hilos | Pasos de los hilos |
|---|---|---|---|
| Colegio | 6 | 4 (H1 `companero_nuevo`, H2 `tutor_se_preocupa`, H3 `apodo`, H4 `examen`) | 3 + 3 + 3 + 3 |
| Amigos | 5 | 4 (H5 `secreto`, H6 `pelea_entre_amigos`, H7 `prestado`, H8 `mudanza`) | 4 + 3 + 3 + 4 |
| Casa | 7 | 4 (H9 `padres_discuten`, H10 `ahorrar_para_algo`, H11 `boletin`, H12 `tu_cumple`) | 3 + 3 + 3 + 3 |
| **Total** | **18** | **12** (8 se pueden escribir hoy) | **38 pasos** |

**30 candidatos = 18 ligeros + 12 hilos**, unos 56 sucesos contando los pasos. Sin los 4 hilos que necesitan motor o horarios (`examen`, `boletin`, `mudanza`, `tu_cumple`) quedan 18 ligeros + 8 hilos (26 candidatos, 18 + 25 = 43 sucesos).

---

## 4. Frecuencia esperada

### 4.1 Frente a lo que hay

| | Hoy (medido, 7 bots) | Con el lote (estimación, **jugador que pasa por todo**) | Con el lote (lo que medirán los bots) |
|---|---|---|---|
| Eventos por semana | **2,7** | ~6,5 (+3,8) | ~4,5–5,5 (los bots no ven la mitad de casa) |
| Por año | 142,6 | ~330 | ~240–280 |
| Colegio (aula + patio + entrada) | 95,8 (**67 %**) | ~140 (**43 %**) | ~140 |
| Casa y fin de semana | 17,9 (13 %) | ~130 (**39 %**) | ~50 |
| Amigos con nombre | ~7 (solo cumples) | ~50 | ~35 |
| Días sin ningún evento | 66 % de los lectivos | **~30 %** | ~45 % |
| Eventos distintos por curso | 22 | ~55 | ~40 |

**Cómo sale la cuenta.** Los 18 ligeros suman unas **100–110 veces por curso** (con las esperas puestas: media de ~6 cada uno). Los hilos: 8 hilos de contenido × 1–2 aperturas × 3–4 pasos = **~50 pasos**; los 2 de las notas añaden ~9 pasos por curso (3 trimestres × 3); `secreto`, `pelea` y `prestado` son `una_por_reparto` y pueden abrirse con varias personas a lo largo de los años.

### 4.2 Cupos

- **`cupo.menor`: 2 al día y 8 a la semana.** Los ligeros nuevos y los antiguos suman unos **4,5 a la semana** de media (el 55 % del cupo semanal), pero **el cupo diario (2) se toca a menudo en días de clase con recreo**: aula (6 % × 4 clases) + patio (varios al 4–5 %) + entrada. Hace falta cuidar que los nuevos del patio no se pisen con los antiguos: **la rotación (E5/C7) importa más que subir el cupo.** Recomiendo **no tocar `cupo.menor`** y repartir los disparos (entrada, salida, tarde, noche).
- **`cupo.base`: 1 al día y 4 a la semana.** Solo gastan base los que arrancan con `cada` (los hilos `padres_discuten`, `ahorrar_para_algo`, el `tutor` si usa `cada`). Salen unos **6–8 al curso**: lejos del cupo. Los hilos que arrancan por señal o umbral (`companero_nuevo`, `tutor_se_preocupa`, `examen`, `boletin`) **no gastan cupo**.
- **Chequeo de ritmo (`FRECUENCIA_DE_SUCESOS`): máx. 10 por semana y máx. 30 al año por suceso.** Ningún candidato debería pasar de 12 al año (los más frecuentes: `parque_partido` ~10, `desayuno` ~9, `en_la_puerta` ~8, `verano_aburrido` ~8). **No se roza el máximo de 30.** `atletismo.tarde_al_entrenamiento` ya lo supera en el bot que llega tarde siempre (16–18 al año): conviene dejarlo como está.
- **Presentación.** Para no llenar de ventanas, la mitad de los ligeros salen sin decisión en **una línea** (`presentacion: 'linea'`), y los de decisión son los de las personas con nombre.

---

## 5. Dudas para el usuario (cada una con mi recomendación)

1. **Ritmo objetivo: ¿6 eventos por semana de media (hoy 2,7), con ≥ 35 % de los días lectivos sin nada como máximo?** *Recomiendo sí*: 6 de media, entre 4 y 9, con la mitad en una línea. Se mide con `sim:eventos` ampliado (E8) antes de dar nada por bueno.
2. **¿Se hace antes una pequeña sesión de motor, con E1 (variantes al azar), E2 (señales de exámenes y boletín) y E8 (medida por franja, lugar y persona)?** *Recomiendo sí, y antes del contenido*: son pequeños (formato y emisiones), desbloquean 2 hilos (`examen`, `boletin`) y arreglan lo que más se nota en el diagnóstico (13 lecturas del mismo texto). Sin E1 la alternativa es una variante por contexto (unas 3 por suceso).
3. **¿Se deja fuera del lote lo que necesita motor grande (`mudanza`: E6; `tu_cumple` y `visita_en_casa`: E7, E4)?** *Recomiendo sí*, para el lote 3: necesitan que un PNJ salga del mundo y que los amigos estén en tu casa; son los más emocionantes, pero tocan `npcs` y horarios.
4. **Temas sensibles: ¿qué tono para la discusión de los padres, el mote, el rumor y el secreto?** *Recomiendo incluirlos con tono suave y sin gravedad*: discusión de padres solo si el apoyo familiar es ≥ 50 y siempre se arregla, el mote es bromista (no acoso), nunca violencia ni daño a nadie; cada hilo con un final que se puede arreglar. Si el usuario prefiere, `padres_discuten` se cambia por una **cena silenciosa** sin la pelea.
5. **Dinero y niños: ¿se admiten un préstamo entre amigos (H7) y una paga con tareas (H10) a esta edad?** *Recomiendo sí* con cifras pequeñas (2–5 €, 10–20 € para lo ahorrado): el juego ya tiene `gen.dinero` y gastos (cumple: 10 €).
6. **Los bots no ven lo de antes de las 8:10, la noche ni el fin de semana. ¿Se añade un bot «madrugador y noctámbulo» a `sim/src/bots.ts` o se prueba solo con `pruebas`?** *Recomiendo añadir un bot* (sesión de bots), porque si no el 40 % del lote no se mide; mientras, todos con `pruebas`.
7. **Papel del tutor: ¿hace falta un tutor de curso fijo (un profesor concreto por clase) o vale «el profesor de Lengua o Matemáticas»?** *Recomiendo el segundo*: ya funciona (`asignatura`) y evita tocar horarios; un tutor fijo se decide cuando se hagan los hilos de tutoría largos.
8. **Vínculo entre dos amigos (pelea): hoy el modelo no sabe qué relación hay entre dos PNJ.** *Recomiendo aproximarlo* (los dos son amigos tuyos con afinidad ≥ 25) y que **no** haya efecto en la relación entre ellos hasta que exista (mundo avanza solo, fase posterior).
9. **Hilos de tono serio: ¿uno a la vez?** *Recomiendo sí* (C12, con una marca `hilo_serio_abierto`): `secreto`, `pelea`, `padres_discuten`, `mudanza`; los demás pueden convivir.
10. **Orden de escritura (fase 2).** *Recomiendo:* (1) la sesión de motor; (2) casa y fin de semana, que es lo más vacío (`desayuno`, `tarea_del_hogar`, `cena_de_domingo`, `hermano_no_duerme`, `deberes_con_padre`, `parque_partido`); (3) los hilos `companero_nuevo`, `tutor_se_preocupa`, `secreto`, `prestado`; (4) los detalles de colegio y amigos; (5) `examen`, `boletin`, `apodo`, `pelea`, `padres_discuten`, `ahorrar_para_algo`. Cada tanda con `eventos:validar`, `eventos:mapa` y `sim:eventos`.

---

## 6. Comprobaciones hechas en esta fase

- `npm run eventos:validar`: ✅ sin cambios (63 sucesos, 462 caminos, los mismos 6 avisos de marcas sin lector de antes).
- `git status`: solo cambia este archivo. El script temporal de medida (`tools/_medir_tmp.ts`) se ha borrado; si se quiere conservar, es la base de E8 (medida por franja, lugar, día y persona).
- Las cifras de §4 son **estimaciones de diseño**, no medidas: hasta que haya contenido escrito no hay otra cosa que medir.

---

# Fase 2: escribir los sucesos (23/11/2026)

El usuario aprobó la propuesta (`docs/DECISIONES.md`, 22/11, «Sucesos, lote 2: decisiones sobre la propuesta»; comprobado en la rama de trabajo antes de empezar). Se unió el motor (`sucesos-motor-2`) a esta rama. Se escribió por tandas, con un commit por tanda, `eventos:validar`, `eventos:mapa` y `sim:eventos -- 180 2` en cada una. **Resumen: 49 sucesos nuevos (18 detalles ligeros y 10 hilos con 31 pasos); el catálogo pasa de 63 a 112. Ritmo con los bots: de 2,6 a 4,2 por semana (el objetivo es 6, no se llega); los demás chequeos del ritmo objetivo de «fuera del aula y del patio» y «en casa o en fin de semana» pasan a ✅.** Detalle y qué falta abajo.

## Tandas 1 y 2 (casa, fin de semana, parque y cuatro hilos)

| Archivo | Sucesos |
|---|---|
| `casa/dia_a_dia.ts` | `desayuno` (3 textos + variante «cansado»), `deberes_con_padre` (variantes por promesa rota, nota baja o alta), `hermano_no_duerme` (3 textos), `tele_con_el_hermano` |
| `casa/fin_de_semana.ts` | `tarea_del_hogar` (3 textos), `cena_de_domingo` (**lee** `lesionado_hace_poco`, `lo_pillaron_mintiendo_en_casa`, `rompio_una_promesa_en_casa`, `mintio_a_sus_padres`, `levanto_la_nota` y la nota media; 3 textos por defecto), `verano_aburrido` |
| `amigos/parque.ts` | `parque_partido` (fin de semana, con un amigo de estado `amigo`/`mejor_amigo`; versión para ≤ 10 años) |
| `colegio/companero_nuevo.ts` | hilo de 3 pasos: llegada → primera semana (3 versiones según lo que hiciste) → un mes después (amigos / conocidos / otros) |
| `colegio/tutor_se_preocupa.ts` | hilo de 3 pasos con el profesor de Lengua o de Matemáticas: la llamada → el plan (modificador de estudio) → el seguimiento (la nota sube o no, `sobreRecuerdo`) |
| `amigos/secreto.ts` | hilo de 4 pasos por amigo: la confesión → te preguntan → se entera (se supo / se sospechó / se guardó) → rota la confianza (arreglable) |
| `amigos/prestado.ts` | hilo de 3 pasos por amigo: petición (5 €, 2 €, no) → devolución (según cuánto os queréis: seguro, al azar o se le olvida) → reclamar |
| `casa/detalles.ts` (editado) | `familia: 'cena'` en `ayudar_con_la_cena` y `cena_favorita` (la cena de domingo también) para la rotación |

**Cambios fuera del contenido (pequeños; revisar):**

1. **Arreglo en el director** (`modules/sucesos/src/index.ts`, `espontaneos`): **`aguanta` no funcionaba con `cada: 'dia'`/`'semana'`.** El suceso se tiraba solo a medianoche (`dia.inicio`), y si sus condiciones de hora o lugar no se cumplían en ese momento se perdía; `aguanta` solo se miraba en los sucesos por señal. Por eso `casa.noche_sin_sueno` salía **0 veces** en `sim:eventos` aunque el bot estuviera despierto a las 22:00. Ahora, si a un `cada` le toca pero no es el momento y tiene `aguanta`, queda esperando como un programado (se mira tras cada acción). Es lo que decía `ANEXO_EVENTOS.md`. Efecto visible: `noche_sin_sueno` pasa de 0 a ~7 por año. Tests de `modules/sucesos`: ✅.
2. **`dado.diaDeLaSemana`** (0 = lunes) para las `pruebas` y `escenarios` (`HechosDePrueba`, `tools/eventos/banco.ts`): sin él no se pueden probar los sucesos de fin de semana.
3. En los escenarios con días de espera hay que **separar el paso de los días del del sitio** (`{ pasan: { dias: 9 }, dado: { lugar: 'casa' } }` y luego `{ pasan: { dias: 0 }, dado: { lugar: 'patio' } }`): si no, el suceso programado sale solo durante los días que pasan y vence con su opción por defecto.

**Hallazgos para la arquitectura:**

- **El personaje empieza con 0 € y no tiene ingresos** (`gen.dinero` inicial 0). `eventos.amigos.prestado` pide ≥ 2 € y casi nunca saldrá hasta que exista la economía del personaje (la deuda técnica ya anotada); lo mismo pasará con `ahorrar_para_algo` (tanda 4). Están escritos y probados con `escenarios`.
- Los bots actúan en bloques largos (leer ≈ 45 min): las ventanas de hora de los `cada` deben ser **anchas** (≥ 1,5 h) para medirse; en el juego, con pasos de 5 minutos, no importa.
- `tools/eventos` y la prueba del banco no pueden lanzar señales que no sean compartidas (`lugares.llegada` no vale): se fuerza el suceso con `sale`.

## Tandas 3 y 4 (colegio, amigos y los seis hilos que faltaban)

| Archivo | Sucesos |
|---|---|
| `colegio/entrada_y_clase.ts` | `en_la_puerta` (entrada del colegio, 7:30–7:50), `copiar_deberes` y `cambio_de_sitios` (al entrar en el aula antes de la primera clase; el segundo deja la marca `vecino_de_mesa` que lee el primero), `capitan_de_equipo` (Educación física; tres versiones según velocidad y coordinación: te eligen de los primeros, a mitad o de los últimos, cada una con sus opciones) |
| `colegio/corrillo.ts` | `rumor` (dos personas: quien cuenta y de quien se habla), `salida_con_hermano` (14:00–14:30, hermano en edad escolar) |
| `amigos/detalles.ts` | `regalo_inesperado` (lee `perdono_una_deuda` del préstamo), `apuesta_en_el_patio`, `un_amigo_de_un_amigo` (presenta a alguien que no conocías), `amigo_que_se_enfria` (amigo con afinidad 20–35) |
| `colegio/examen.ts` | hilo de 3 pasos con las **señales de examen**: la víspera (modificador de estudio de un día si repasas) → la nota (versiones: no presentado, bien tras repasar, mal sin repasar, bien, regular, mal) → las notas comentadas en el patio. **Uno por semana de exámenes** (`instancias: 'una'` y espera de 5 días: la primera versión salía un hilo por examen, 61 al año) |
| `casa/boletin.ts` | hilo de 3 pasos con `estudios.boletin`: el sobre en el colegio → en casa (según nota, promesa rota, mentira) → consecuencia semanas después (premio, plan de estudio o nada) |
| `colegio/apodo.ts` | hilo de 3 pasos. **Duro `burlas`:** variante «mote feo» (solo si quien lo pone tiene afinidad ≤ 10 contigo) y opción «devolvérselo con un mote feo de verdad». Sin lo duro: el mote suave, entero |
| `amigos/pelea.ts` | hilo de 3 pasos con dos amigos. **Duro `peleas`:** variante «a empujones» y opción «meterte en medio y separarlos». Sin lo duro: discusión y paces; contigo la afinidad cambia, entre ellos no |
| `casa/padres_discuten.ts` | hilo de 3 pasos, solo si el apoyo familiar es ≥ 50. **Duro `familia`:** variante «bronca» (solo si hay una mentira descubierta o la nota media es < 5) y opción «salir y pedirles que paren». Sin lo duro: la tensión sorda; siempre se arregla |
| `casa/ahorrar.ts` | hilo de 3 pasos (20 € y 10 €; ver «el personaje empieza con 0 €» arriba). El dinero llega por el trato de tareas de este mismo hilo |

**Rotación (`familia`)**: `patio` (los 7 detalles del patio ya existentes y los nuevos que van al patio), `aula` (7 existentes y `copiar_deberes`, `capitan_de_equipo`, `cambio_de_sitios`), `camino` (los 2 del camino y `en_la_puerta`), `cena` (3), `parque` (los 3 del barrio y `parque_partido`).

**Contenido duro**: tres categorías usadas (`burlas`, `peleas`, `familia`), cada una en una variante y una opción; **ningún hilo se queda sin camino** sin lo duro (`eventos:validar` recorre 748 caminos más con todo lo duro apagado, y no avisa de nada). Las opciones por defecto del plazo no son duras.

## Medidas

**`npm run eventos:validar`**: ✅ (112 sucesos, 4.834 caminos, 748 más sin lo duro; 2 avisos de familias de un solo suceso o marcas de fútbol anteriores: `perdono_una_deuda` ya lo lee `regalo_inesperado`). **`npm run typecheck`**: ✅. **`npm test`** (dos veces, antes y después de ajustar cifras): ✅ 128 archivos, 1.384 tests, ~10 min. **`npm run eventos:mapa`**: hecho (13 hilos, 112 sucesos).

**`npm run sim:eventos -- 180 2`** (8 bots × 2 semillas), objetivo frente a medido:

| Cifra | Objetivo | Antes del lote (motor 2) | Ahora (todos los bots) | `madrugador` |
|---|---|---:|---:|---:|
| Eventos por semana (media) | 6 (entre 4 y 9) | 2,6 | **4,2** ⚠️ | 5,0 |
| % de semanas con menos de 4 | — | 74 % | 44 % | 32 % |
| % de semanas con más de 9 | 0 | 0,8 % | 2,5 % ⚠️ | 4 % |
| % de días de clase sin ningún evento | ≤ 35 % | 60,6 % | **46,4 %** ⚠️ | 37,9 % |
| Fuera del aula y del patio, por semana | ≥ 1 | 0,5 | **1,8** ✅ | 2,2 |
| En casa o en fin de semana, por semana | ≥ 1 | 0,3 | **1,4** ✅ | 1,5 |
| % de semanas sin ningún evento que se decide | 0 | 19 % | 6,5 % ⚠️ | 4 % |

Por franja (todos): antes de clase 0,1 → 0,6; recreo 0,8 → 1,1; mediodía 0,0 → 0,2; tarde 0,3 → 0,4; **noche 0,0 → 0,4**. El fin de semana pasa de 0,1 a 0,5. Eventos distintos por partida: 29 → 61.

**`npm run sim:rapida`, antes y después** (`fcfd1f5` frente a esta rama): **ningún chequeo cambia de ✅/⚠️** (el de «El esfuerzo hace progresar» sigue ⚠️ como antes, atletismo +4,6). «Ritmo de los eventos» pasa de 3,0 a 5,2 por semana (✅, máx. 10; 29 → 61 distintos). El rendimiento por acción sube de 1,27 a 1,50 ms (límite 2,2 ms: más sucesos que mirar, y la medida baila un 20 %). Los demás valores, iguales dentro del ruido (p. ej., empollón 81,0 → 81,1).

## Lo que queda por debajo del objetivo (y qué se podría hacer)

1. **Ritmo 4,2 con los bots frente a 6.** Se ha llegado a donde llegan los bots sin pasarse de los cupos ni de las ~10 veces al año de cada suceso: el techo de cada detalle lo ponen la probabilidad y la espera (3–10 al año). Palancas, de más a menos barata: subir `prob` en los de aula y patio (hoy 0,04–0,08); acortar más las esperas de los del lote 1 (algunos aún de 45–90 días); más detalles de **mediodía (14:00–17:00)** y **tarde (17:00–20:00)**, que siguen en 0,2–0,4 por semana; y que el bot `vago` (que no sale de casa) tenga algo que le pase en casa entre semana. Un jugador real hace más cosas que un bot (parque, amigos, fines de semana), así que cabe esperar algo más que lo medido: no he podido comprobarlo.
2. **46 % de días de clase sin evento (objetivo ≤ 35 %).** Pesa el `vago` (58 %) y el `aleatorio` (50 %); los bots que van al colegio y al patio, 38–47 %.
3. **Sucesos que los bots no miden**: `parque_partido`, `amigo_que_se_enfria`, `verano_aburrido` (el sim de 180 días no llega al verano) y `en_la_puerta` (el `madrugador` espera en la calle hasta las 7:49 y entra cuando la entrada se vacía). Están probados con `pruebas` y `escenarios`. El préstamo y el ahorro casi no salen porque el personaje no tiene dinero.
4. **No hay suceso de «fuera de casa en fin de semana» más allá del parque**, ni de vecinos en la calle (pendiente de decisión del usuario, no se han escrito).

## Hallazgos para la arquitectura

1. **`aguanta` con `cada` no funcionaba** (corregido; ver arriba). Conviene que quien revise el director mire ese cambio (`modules/sucesos/src/index.ts`, `espontaneos`): los sucesos `cada` que esperan a que llegue su hora ahora salen sin gastar cupo (como los programados).
2. **`clase.asistida` llega con la hora de después de la clase** (el director procesa el evento tras avanzar el tiempo): un suceso de «antes de que llegue el profesor» no puede colgar de esa señal. Los míos del principio de clase cuelgan de `lugares.llegada` a `aula`. Los que ya existían hablan de lo que pasó en la clase, y encajan.
3. **El personaje empieza con 0 € y no tiene ingresos.** El hilo del préstamo y el del ahorro están escritos, pero casi no salen. La economía del personaje (paga, tareas, qué comprar) sería lo siguiente para que valgan.
4. **No hay forma de forzar una variante con `peso` en un escenario**: el hilo se cuenta en el banco con las condiciones; por eso las variantes aleatorias de `devolucion` (préstamo) se decidieron por afinidad (cuanto más cerca, más fiable) y la de «mote feo» por la afinidad de quien lo pone: es más lógico y se puede probar. `peso` solo queda en el reparto de textos.
5. **El banco de pruebas no lanza señales no compartidas** (`lugares.llegada`): se fuerza el suceso con `sale`. En los escenarios con días de espera hay que separar el paso de los días del paso del sitio (ver arriba).
6. **Estado compartido entre partidas en un mismo proceso** (hallazgo de la sesión del motor): no lo he tocado.
7. Mapa de marcas (`MAPA.md`): quedan sin lector solo `le_recomendaron_un_deporte` y `futbol_quiere_cambiar_de_puesto` (de antes); `lesionado_hace_poco`, `mintio_a_sus_padres`, `lo_pillaron_mintiendo_en_casa` y `rompio_una_promesa_en_casa` ya los leen `cena_de_domingo` y `deberes_con_padre`.

## Fuera del lote (lote 3), como se decidió

`mudanza` (E6), `tu_cumple` (E4 + E7) y `visita_en_casa` (E3 + E7). El hecho `es_tu_cumple`/`cumple_en_dias` del motor sigue sin usarse.

## Pasada de corrección de continuidad (23/11/2026)

A petición de la arquitectura, tras leer los caminos con `eventos:probar` (y `--sin-duro`). **Nota sobre la herramienta:** `eventos:probar` recorre el producto de todas las variantes y opciones, sin mirar condiciones ni marcas, así que algunos caminos que enseña (p. ej. `se_calma[hablaron]` tras elegir «normal») **no pueden darse en el juego**: `hablaron` solo sale si la marca `pregunto_a_sus_padres` está puesta, y solo se pone si preguntar salió bien. Aun así se corrigió lo que sí podía chocar.

**Corregido**

| Hilo | Problema | Arreglo |
|---|---|---|
| `padres_discuten` | La marca `hablo_con_su_tutor` parecía del tutor del colegio | Renombrada `pregunto_a_sus_padres` |
| `padres_discuten` | «Anoche te oí en la cocina» cuando solo te asomaste o saliste a por agua | «Anoche te vi despiert{yo:o\|a}» (vale para los tres caminos que ponen `se_acerco_a_sus_padres`) |
| `padres_discuten` | «No pasa nada» y «gracias por preguntar» se repetían en tres pasos seguidos | Cada frase aparece una vez |
| `secreto` | Si decías «no puedo prometer nada», tu amigo no te contaba nada y aun así te preguntaban «¿tú sabes algo?» | Ese camino cierra el hilo |
| `secreto` | «Te corta el paso en el pasillo» (no hay pasillo en los sitios donde sale) | «Al salir de clase» |
| `apodo` | Si cortabas el mote en seco, el paso siguiente decía que «otros han empezado a usarlo» | Cortarlo con éxito cierra el hilo |
| `pelea` | Los textos de la discusión decían «entra en tu aula» y «en el pasillo» pero sale en el patio | Textos en el patio |
| `prestado` | Al discutir y reclamar delante de todos, tu amigo decía «ahí tienes tu dinero» pero no lo recibías | Recibes el dinero (con el coste de afinidad) |
| `ahorrar` | El segundo texto hablaba de «botas o una pelota» y los pasos siguientes de «las zapatillas» | Mismo objeto en todos |
| `ahorrar` | La opción «tú ahorras y {tutor} pone la otra mitad» nunca cumplía lo que prometía | Marca `trato_a_mitades` y opción «comprarlas con tus 10 € y lo que pone tu madre/padre» en la compra |
| `examen` | «Decir que has sacado mucho más de lo que sacaste» aunque hubieras sacado buena nota | «Exagerar un poco tu nota» |
| `tutor_se_preocupa` | Si la nota bajaba, el seguimiento decía «no ha cambiado mucho» | Variante `peor` (usa `sobreRecuerdo`) |
| `tarea_del_hogar` | Un resultado hablaba de «la casa huele a limpio» aunque la tarea fuera la compra o el balcón | «Todo está en su sitio» |
| `en_la_puerta` | Texto con «examen sorpresa… es mentira» (confuso) | Otro más simple |

Revisados sin cambios: `companero_nuevo`, `boletin` y los demás detalles sueltos (lectura rápida con el mismo criterio: lo dado por hecho, lugares y momentos, nombre de las marcas y textos seguidos que se parezcan).

**No hecho:** el aviso de validación «una variante final lee una marca que en algún camino no se pone»: no es barato, porque `eventos:probar` y el validador no distinguen caminos posibles de imposibles; haría falta que la herramienta propague las marcas por camino y respete las condiciones (hoy no lo hace).

**Comprobaciones:** `typecheck` ✅, `eventos:validar` ✅ (112 sucesos, 4.738 caminos y 718 sin lo duro), `eventos:mapa` ✅.

## Los caminos que mejor quedan (para enseñárselos al usuario)

1. **`eventos.amigos.secreto`**, prometer → te preguntan → lo cuentas → se sabe → pedir perdón con éxito (`--elige prometer`): un hilo con cuatro pasos en días distintos donde lo que decides en el segundo (callar, contar, despistar) cambia lo que pasa en el tercero y si hay cuarto.
2. **`eventos.casa.cena_de_domingo`** con `lesionado_hace_poco` (`eventos:probar -- eventos.casa.cena_de_domingo`): una marca que dejó otro suceso semanas antes cambia lo que te preguntan en casa; es la prueba de que la memoria vuelve.
3. **`eventos.colegio.companero_nuevo`**, ofrecerte → sentaros → amigos: el mismo día, una semana y un mes después; si no te ofreces, cambia la primera semana (te ve solo) y el final.
4. **`eventos.casa.padres_discuten`** con `--sin-duro` (tensión sorda) frente a la versión con «familia» (bronca): mismo hilo, dos tonos, y en los dos se arregla; la opción de preguntar a la mañana siguiente cambia la cena de una semana después.

## Dos detalles de `companero_nuevo` (23/11/2026)

1. **Título con género:** el formato sí concuerda los títulos (`{nuevo:Un compañero nuevo|Una compañera nueva}`); aplicado. El resto de títulos del lote son neutros o no nombran a nadie (revisado).
2. **Nombres repetidos en `eventos:probar`:** la herramienta pone un mismo nombre de prueba a todos los papeles de un género (solo es de la herramienta). **Pero al mirar el director resultó que en el juego tampoco se impedía que dos papeles recayeran en la misma persona** (`repartir` no excluía a quien ya tenía otro papel; con filtros iguales, como `a` y `b` de `pelea`, podía coincidir). Corregido en `modules/sucesos/src/index.ts`: `repartir` recibe a quienes ya tienen papel y los descarta. Tests de `modules/sucesos` y `tests/eventos` ✅.
