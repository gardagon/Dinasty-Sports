# Anexo: relaciones con las personas (todas las cifras)

Referencia de cómo se habla con la gente y cuánto cambia cada cosa, para revisar y reequilibrar. El código está en `modules/relaciones/src/` (`index.ts`: las acciones; `acciones.ts`: reglas puras; `vinculo.ts`: el vínculo) y los gustos y la compatibilidad, en `packages/contracts/src/rasgos.ts`. Estado a 26/10/2026.

## 1. Cómo funciona

1. **Desconocido → conocido:** a quien no conoces y tienes cerca (hasta 40 en un lugar) le preguntas el nombre (2 minutos). **Al empezar solo conoces a tu familia** (padres y hermanos). El entrenador, el tutor y los dos compañeros del reparto son desconocidos como los demás: al tutor y a los compañeros les preguntas el nombre cuando los tienes cerca; al entrenador lo conoces al apuntarte a su club (se presenta). Los rivales se conocen al competir contra ellos. Hasta que no conoces a alguien no aparece en «Relaciones» ni en las pestañas de «Gente» que no son «Aquí», ni hay acciones con él o ella (al tutor se le piden tutorías una vez que lo conoces).
2. **Conocido → vínculo:** con cada persona conocida hay una **afinidad** (−100 a 100) y una **confianza** (0 a 100). De sus valores sale el **estado**: antagonista, enemigo, antipatía, conocido, amigo o mejor amigo.
2 bis. **La familia:** el padre y la madre son personas como los hermanos (siempre conocidas, en «Relaciones» y en «Gente»). Su vínculo empieza más hondo: afinidad de 15 a 35 según la compatibilidad (15 + 40 × (compat − 0,2)) y confianza 30; los hermanos, de 5 a 25 y confianza 15. Con ellos hay las acciones de amistad (pasar la tarde, charlar, ayudar, hacer planes, detalle, discutir y paces); con los padres no hay «Estudiar con» ni planes. Están en casa por la tarde-noche (ver `ANEXO_HORARIOS_PNJ.md`).
3. **Hablar exige que esté contigo** (entre las 40 personas que tienes cerca; presencia de `npcs`, ver `ANEXO_HORARIOS_PNJ.md`). **En clase, en una carrera o en una sesión del club están ocupados**: no se les puede hablar; sí al llegar, en el recreo y al acabar. Si no está, la acción dice «no está aquí» y **no hay forma de contactarla ni de saber dónde anda**: hasta que haya teléfono, solo se habla con quien coincide contigo. (Así el juego no tiene que calcular dónde están todos tus conocidos.) Un contacto al día como máximo con cada persona.
4. **Lo que sube una acción** = ganancia base × **eficiencia**. La eficiencia es el producto de varios factores (sección 3), así que se ve el motivo de cada uno al elegir la acción.
5. Sin verse, lo positivo se **enfría** (sección 4).

## 2. Las acciones

Ganancia y confianza son lo que suman con eficiencia ×1. **Presencia:** todas exigen que la persona esté contigo, entre la gente que tienes cerca (para «Preguntar el nombre», también). **Horario:** «fuera de clase» = fuera de las clases de 8 a 14 de un día lectivo; «+ recreo» = también en el recreo (10:40–11:20, en el colegio).

| Acción | Con quién | Min | Afinidad | Confianza | Energía | Estrés | Entrena | Horario | Requisitos y espera |
|---|---|---|---|---|---|---|---|---|---|
| Preguntar el nombre | desconocidos cerca | 2 | — | — | — | — | — | siempre | que esté cerca (≤ 40) |
| Quedar | compañeros, amigos | 120 | +5 | +3 | −6 | −6 | carisma 0,8; empatía 0,4; cooperación 0,3 | fuera de clase, 10–22 | — |
| Charlar un rato | compañeros, amigos | 30 | +2,5 | +1,5 | −1 | — | comunicación 0,4; empatía 0,2 | fuera de clase o recreo, 8–22 | — |
| Ayudar | compañeros, amigos | 60 | +4 | +4,5 | −6 | — | empatía 0,6; cooperación 0,5; determinación 0,2 | fuera de clase, 10–21 | afinidad ≥ 5 |
| Hacer planes | compañeros, amigos | 90 | +6 | +3 | −6 | −6 | carisma 0,5; comunicación 0,3 | fuera de clase, 10–22 | compartir un interés (nivel ≥ 15 del personaje); ganancia × (0,8 + 0,2 × su intensidad) |
| Proponer un plan (hoy o mañana) | compañeros, amigos y hermanos de 6 años o más que tienes delante | 2 | +1 si acepta | — | — | — | — | fuera de clase o recreo, 8–22 (hoy: hasta 16:00) | respuesta según la sección «Planes»; una propuesta por persona y día |
| Estudiar con (plan acordado) | los mismos | 90 | +2,5 | +2 | −8 | — | concentración 0,6; inteligencia 0,3; cooperación 0,2 | de la hora acordada a 30 min después, **en tu casa** | solo con un plan acordado para ahora (no hace falta que esté entre la gente que tienes cerca); compañía de estudio |
| Tener un detalle | compañeros, amigos | 15 | +3 | +1 | −1 | — | empatía 0,3; creatividad 0,3 | fuera de clase o recreo, 8–22 | una vez cada 7 días; ganancia × (1 + 0,15 × intensidad de su interés favorito) |
| Hablar (entrenador, tutor) | entrenador, profesor | 30 | +4 | +2,5 | −3 | — | comunicación 0,6; carisma 0,3 | entrenador: 9–14 sin clase y 15–21 con clase; tutor: 14–17 de un día lectivo o recreo | — |
| Charlar (rival) | rivales conocidos (los 5 más marcados) | 30 | +2 | +1 | −1 | — | comunicación 0,3; carisma 0,2 | fuera de clase, 10–21 | — |
| Discutir / Plantar cara / Encararse | todos | 30 | −(10 + 4 × agresividad/50), ×1,5 con entrenador o tutor | −5 | −4 | −8 | autoridad 0,6; picardía 0,2 | el de cada persona | siempre; es una decisión del jugador |
| Hacer las paces / Pedir disculpas | todos | 30 | éxito: afinidad pasa a −2, estado «conocido» y suma 5 (queda en 3); fallo: −3 | éxito +5; fallo −2 | −3 | +3 | empatía 0,5; comunicación 0,4 | el de cada persona | solo si el estado es negativo; tras un fallo, esperar 5 días; probabilidad en la sección 4 |

## 3. Qué multiplica lo que sube (eficiencia)

Todos se multiplican entre sí y con la compañía; con valores corrientes el producto queda cerca de ×1.

| Factor | Rango | De qué depende |
|---|---|---|
| **Compatibilidad** (`relaciones.compatibilidad`) | ×0,7 – ×1,4 | 60 % intereses en común y 40 % parecido de carácter (ejes con pesos: sociabilidad 0,2; disciplina, honestidad, agresividad, optimismo 0,15; ambición 0,1; sacrificio y prudencia 0,05). Compatibilidad 0,25 → ×0,7; 0,5 → ×1,05; ≥ 0,75 → ×1,4. |
| **Habilidad** del personaje (`relaciones.habilidad`) | ×0,8 – ×1,3 | Nivel «para su edad» (0,4 = típico): ×(1 + 0,6 × (nivel − 0,4)). Cada 0,1 por encima suma 0,06. Pesos por acción en la tabla siguiente. |
| **Disposición** de la otra persona (`relaciones.disposicion`) | ×0,75 – ×1,3 | 1 + 0,2 × sociabilidad/50 + 0,05 × optimismo/50 + 0,16 × (agrado − 0,5). El agrado (0 a 1) es lo que encajan el personaje y los **gustos** de esa persona. Con aspecto (ver sección 7), es la atracción completa (50 % rasgos físicos: pelo, ojos, piel y cara; 50 % ejes de carácter que le gustan); sin aspecto, solo el carácter (sin preferencias, 0,5). Frase que se enseña: «Le encanta hablar», «Es de pocas palabras», «Congeniáis de primeras», «No congeniáis de primeras». |
| **Compañía** (`relaciones.compania`) | ×1 – ×1,3 | Solo en lo que hacéis juntos: «Estudiar con…» (área estudio) y «Quedar» / «Hacer planes» (área social). Depende de lo que **sabe hacer la otra persona** en esa área (sección «Ayuda de los demás») y de cuánto os conocéis. No hay perfiles fijos de apoyo: ya no existe «te ayuda en…». |

Habilidades que cuentan en cada acción (pesos que suman 1; el nombre de la habilidad es el de `gen.*`):

| Acción | Habilidades |
|---|---|
| Charlar, Charlar (rival), Hablar | comunicación 0,6; carisma 0,4 |
| Quedar | carisma 0,5; empatía 0,3; comunicación 0,2 |
| Ayudar | empatía 0,5; cooperación 0,5 |
| Hacer planes | carisma 0,5; comunicación 0,5 |
| Tener un detalle | empatía 0,5; creatividad 0,5 |
| Hacer las paces | empatía 0,5; comunicación 0,5 (cuenta en la **probabilidad**, no en la ganancia) |

Las acciones también **entrenan** esas mismas habilidades (columna «Entrena» de la sección 2): hablar mejora el hablar.

### Ayuda de los demás (compañía)

Cada persona tiene una **aptitud** de 0 a 1 en tres áreas (`aptitudDe`, en `contracts/rasgos.ts`; ~0,5 es lo típico), que sale de su carácter, sus intereses y su nivel deportivo. Con los ejes del carácter normalizados a 0–1 (−50 → 0, +50 → 1) y la intensidad del interés entre 0 y 1 (1 a 3 sobre 3), tomando el mayor de los intereses listados:

| Área | Fórmula |
|---|---|
| Estudio | 0,5 × disciplina + 0,15 × ambición + 0,35 × interés (estudio, lectura, tecnología) |
| Social | 0,55 × sociabilidad + 0,25 × optimismo + 0,2 × interés (cine, música, videojuegos) |
| Deporte | 0,6 × nivel de atletismo/100 (20 si no tiene) + 0,4 × interés (deporte, atletismo, fútbol) |

La ayuda es el **+30 % máximo (`AYUDA_MAXIMA`)** × (aptitud − 0,4)/0,4 limitado a 0–1 × afinidad/40 limitado a 0–1. Es decir: hasta aptitud 0,4 (típica o menos) no ayuda (de momento tampoco estorba), con 0,8 ayuda del todo, y cuanto menos os conocéis menos pesa. Cada actividad usa un área: Estudiar con (plan acordado) → estudio; Quedar y Hacer planes → social; entrenar juntos (deporte) pendiente. Un amigo muy estudioso ayuda al estudiar juntos y poco al salir; uno muy sociable, al revés.

## Planes: proponer un día y una hora

Para estudiar (y, más adelante, entrenar) con alguien se le **propone un día y una hora**: «hoy» o «mañana» a las **17:00** (estudiar: 90 min, **en tu casa**). Solo a quien tienes delante (sin teléfono no hay otra forma). La otra persona decide (`responderAPlan`, en `acciones.ts`), en este orden:

| Orden | Regla | Resultado |
|---|---|---|
| 1 | A esa hora tiene **clase, entreno o carrera** (mira su agenda: ocupado o sesión de club/carrera) | no puede |
| 2 | **Otros planes** ese día: tirada estable por persona y día, 25 % (`PLAN.ocupadoPorAzar`) | no puede |
| 3 | **Margen:** tiene un plan contigo el día anterior o el siguiente y la afinidad es menor de 70 (`PLAN.afinidadSinMargen`) | prefiere dejar un día de margen |
| 4 | **Ganas:** acepta si la tirada estable es menor que 0,15 + 0,6 × (afinidad/60, tope 1) + 0,25 × (confianza/100), entre 0,05 y 0,98 | acepta o «no le apetece» |

- Dos planes el mismo día con la misma persona, nunca. Lo propuesto para un día no se vuelve a preguntar ese día.
- Si acepta (+1 de afinidad), el plan queda guardado. **Hay que llegar a tiempo:** la acción «Estudiar con…» está disponible desde la hora acordada hasta 30 minutos después (`PLAN.cortesia`), en el sitio acordado; si no apareces, al acabar el día **pierdes 4 de afinidad y 3 de confianza** (`PLAN.planton`) y se avisa en el diario.
- Proponer para hoy exige 1 hora de antelación (`PLAN.antelacion`: hasta las 16:00).
- Los planes pendientes se ven en el panel «Planes» de «Qué hacer». Se guardan unos días tras cumplirse (para el margen).

## 4. El vínculo

**Estados** (afinidad; el confianza y los contactos recientes se exigen para subir; salir de un estado exige cruzar el umbral con un margen de 8 para que no parpadee):

| Estado | Para entrar |
|---|---|
| Mejor amigo | afinidad ≥ 75 y confianza ≥ 60 (siendo ya amigo) |
| Amigo | afinidad ≥ 40, confianza ≥ 30 y ≥ 3 contactos en los últimos 14 días |
| Conocido | el resto, entre −15 y 40 |
| Antipatía | afinidad ≤ −15 |
| Enemigo | afinidad ≤ −45 |
| Antagonista | afinidad ≤ −75 |

**Enfriamiento sin contacto** (puntos de afinidad al día, pasados los días de gracia; lo negativo solo se suaviza hasta −20):

| Estado | Días de gracia | Por día |
|---|---|---|
| Mejor amigo | 45 | −0,2 |
| Amigo | 21 | −0,3 |
| Conocido | 7 | −0,4 |
| Antipatía, enemigo, antagonista | 30 | +0,15 (hacia −20) |

La confianza baja 0,1 al día tras 30 días sin verse.

**Discutir:** pierde 10 + 4 × agresividad/50 de afinidad (de 6 con un carácter calmado a 14 con uno agresivo), ×1,5 si es el entrenador o el tutor, y 5 de confianza.

**Probabilidad de hacer las paces** (entre 0,08 y 0,85):
`0,35 + 0,15 × (habilidad − 0,4)/0,4 + 0,2 × sociabilidad/50 + 0,15 × optimismo/50 + 0,1 × honestidad/50 − 0,15 × (|nivel| − 1) + 0,2 × (compatibilidad − 0,4)`,
donde `habilidad` es el nivel (empatía y comunicación, 0 a 1) y `nivel` es 1 con antipatía, 2 con enemigo y 3 con antagonista.

**Competiciones:** el entrenador del deporte sube su afinidad contigo 1 por competir y 3 si quedas en el podio; un rival al que ganas te sube 1 y uno que te gana, −0,5. No cuentan como haber estado juntos.

## 5. Un ejemplo

Charlar con un compañero cualquiera a los 8 años: afinidad base 2,5. Compatibilidad típica 0,4 (×0,9), habilidad típica (×1,0) y disposición de una persona normal sin preferencias de carácter (×1,0): sube 2,5 × 0,9 × 1,0 × 1,0 ≈ **2,3**. Con un amigo sociable (×1,2) que comparte tus intereses (×1,3) y un personaje que habla bien (×1,2): 2,5 × 1,2 × 1,3 × 1,2 ≈ **4,7**. Con un solitario (×0,8) con quien casi no compartes nada (×0,75) y un personaje callado (×0,85): ≈ **1,0**.

## 6. Dónde cambiar cada número

| Qué | Dónde |
|---|---|
| Ganancia, confianza, duración, coste y entrenamiento de cada acción | `modules/relaciones/src/index.ts` (`accionesDeAmistad`, `hablarConAutoridad`, `saludarRival`, `discutir`, `hacerLasPaces`) |
| Pesos de habilidad por acción, pendiente y topes de la habilidad, pesos de la disposición | `modules/relaciones/src/acciones.ts` (`HABILIDADES_DE_ACCION`, `HABILIDAD`, `DISPOSICION`) |
| Aptitudes por área | `packages/contracts/src/rasgos.ts` (`aptitudDe`) |
| Ayuda máxima de la compañía, qué área usa cada actividad | `modules/relaciones/src/index.ts` (`AYUDA_MAXIMA`, `AFINIDAD_AYUDA_COMPLETA`, `AREA_DE_ACCION`) |
| Reglas de los planes (probabilidades, margen, cortesía, plantón) | `modules/relaciones/src/acciones.ts` (`PLAN`, `PLANES`, `responderAPlan`) |
| Castigo por dejar plantado un club (entrenador y equipo) | `modules/relaciones/src/index.ts` (`PLANTON`) |
| Pérdida al discutir, probabilidad de paces, esperas | `modules/relaciones/src/acciones.ts` (`perdidaPorDiscusion`, `probabilidadDePaces`, `ESPERA`) |
| Estados, umbrales y enfriamiento | `modules/relaciones/src/vinculo.ts` (`UMBRALES`, `ENFRIAMIENTO`) |
| Compatibilidad y atracción por gustos | `packages/contracts/src/rasgos.ts` (`compatibilidad`, `factorDeCompatibilidad`, `atraccion`, `EJES`) |
| Horarios y dónde está cada persona | `ANEXO_HORARIOS_PNJ.md` y `packages/contracts/src/agendas.ts` |

Al cambiar cualquiera, ejecutar `npm run sim` antes y después y revisar el área «Social» de la tabla y los tests de `modules/relaciones` y `tests/integracion.test.ts`.

## 7. Reglas decididas y pendientes

**Edad y gustos (decidido con el usuario).** El **aspecto físico cuenta siempre** que corresponda (pesa en la primera impresión, hasta ±0,08 del factor de disposición), pero **no se anuncia** hasta que las dos personas tienen al menos 14 años (`EDAD_ATRACCION_FISICA`): antes, la frase que se enseña sale solo del carácter, así que se nota en la cifra pero no en el motivo. Una cosa es no anunciarse y otra no tenerse en cuenta. Cuándo cuenta y cuándo se anuncia (`usoDelAspecto`, en `acciones.ts`):

| Personaje y otra persona | ¿Cuenta el aspecto? | ¿Se anuncia? |
|---|---|---|
| Los dos de 19 años o menos y alguno de menos de 14 | sí, en silencio | no |
| Los dos de 14 a 19 años | sí | sí |
| Con un adulto (más de 19 años) o con quien no tiene edad (profesorado, entrenador) | **nunca** | no |

La frase anunciada es neutra («Congeniáis de primeras»). La pareja usará esta misma regla (y solo entre edades parecidas).

**Sin teléfono (decidido).** No se puede contactar con quien no está contigo, y tampoco se sabe dónde está. Cuando haya teléfono: llamar, escribir y recibir mensajes.

**Planes (decidido con el usuario; hecho para «estudiar» con compañeros, amigos y hermanos).** «Quedar» y «Hacer planes» siguen siendo inmediatos (un rato con quien tienes delante), pero las actividades largas (estudiar con alguien, y más adelante entrenar con alguien) se **acuerdan**: ver la sección «Planes». Pendiente: el chat/teléfono para proponer a distancia y otros sitios (la biblioteca, si se crea).

**Saludos y otros eventos (apuntado).** Ahora solo hablan contigo si el personaje inicia. Más adelante los demás podrán hablarte: saludarte al verte (eventos), llamarte o escribirte al móvil.
