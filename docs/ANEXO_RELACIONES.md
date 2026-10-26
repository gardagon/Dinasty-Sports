# Anexo: relaciones con las personas (todas las cifras)

Referencia de cómo se habla con la gente y cuánto cambia cada cosa, para revisar y reequilibrar. El código está en `modules/relaciones/src/` (`index.ts`: las acciones; `acciones.ts`: reglas puras; `vinculo.ts`: el vínculo) y los gustos y la compatibilidad, en `packages/contracts/src/rasgos.ts`. Estado a 26/10/2026.

## 1. Cómo funciona

1. **Desconocido → conocido:** a quien no conoces y tienes cerca (hasta 40 en un lugar) le preguntas el nombre (2 minutos). Los del reparto inicial (entrenador, tutor y dos compañeros) ya se conocen y los rivales se conocen al competir contra ellos.
2. **Conocido → vínculo:** con cada persona conocida hay una **afinidad** (−100 a 100) y una **confianza** (0 a 100). De sus valores sale el **estado**: antagonista, enemigo, antipatía, conocido, amigo o mejor amigo.
3. **Hablar exige que esté contigo** (entre las 40 personas que tienes cerca; presencia de `npcs`, ver `ANEXO_HORARIOS_PNJ.md`). Si no está, la acción dice «no está aquí» y **no hay forma de contactarla ni de saber dónde anda**: hasta que haya teléfono, solo se habla con quien coincide contigo. (Así el juego no tiene que calcular dónde están todos tus conocidos.) Un contacto al día como máximo con cada persona.
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
| Tener un detalle | compañeros, amigos | 15 | +3 | +1 | −1 | — | empatía 0,3; creatividad 0,3 | fuera de clase o recreo, 8–22 | una vez cada 7 días; ganancia × (1 + 0,15 × intensidad de su interés favorito) |
| Hablar (entrenador, tutor) | entrenador, profesor | 30 | +4 | +2,5 | −3 | — | comunicación 0,6; carisma 0,3 | entrenador: 9–14 sin clase y 15–21 con clase; tutor: 14–17 de un día lectivo o recreo | — |
| Charlar (rival) | rivales conocidos (los 5 más marcados) | 30 | +2 | +1 | −1 | — | comunicación 0,3; carisma 0,2 | fuera de clase, 10–21 | — |
| Discutir / Plantar cara / Encararse | todos | 30 | −(10 + 4 × agresividad/50), ×1,5 con entrenador o tutor | −5 | −4 | −8 | autoridad 0,6; picardía 0,2 | el de cada persona | siempre; es una decisión del jugador |
| Hacer las paces / Pedir disculpas | todos | 30 | éxito: afinidad pasa a −2, estado «conocido» y suma 5 (queda en 3); fallo: −3 | éxito +5; fallo −2 | −3 | +3 | empatía 0,5; comunicación 0,4 | el de cada persona | solo si el estado es negativo; tras un fallo, esperar 5 días; probabilidad en la sección 4 |

## 3. Qué multiplica lo que sube (eficiencia)

Todos se multiplican entre sí y con el apoyo; con valores corrientes el producto queda cerca de ×1.

| Factor | Rango | De qué depende |
|---|---|---|
| **Compatibilidad** (`relaciones.compatibilidad`) | ×0,7 – ×1,4 | 60 % intereses en común y 40 % parecido de carácter (ejes con pesos: sociabilidad 0,2; disciplina, honestidad, agresividad, optimismo 0,15; ambición 0,1; sacrificio y prudencia 0,05). Compatibilidad 0,25 → ×0,7; 0,5 → ×1,05; ≥ 0,75 → ×1,4. |
| **Habilidad** del personaje (`relaciones.habilidad`) | ×0,8 – ×1,3 | Nivel «para su edad» (0,4 = típico): ×(1 + 0,6 × (nivel − 0,4)). Cada 0,1 por encima suma 0,06. Pesos por acción en la tabla siguiente. |
| **Disposición** de la otra persona (`relaciones.disposicion`) | ×0,75 – ×1,3 | 1 + 0,2 × sociabilidad/50 + 0,05 × optimismo/50 + 0,16 × (agrado − 0,5). El agrado (0 a 1) es lo que encaja el **carácter** del personaje con lo que a esa persona le gusta en los demás (sus gustos de carácter: ejes como sociable, calmado u optimista; sin preferencias, 0,5). **El aspecto físico no cuenta** (ver sección 7). Frase que se enseña: «Le encanta hablar», «Es de pocas palabras», «Congeniáis de primeras», «No congeniáis de primeras». |
| **Apoyo** (`relaciones.apoyo`) | ×1 – ×1,3 | Quien te cae bien (afinidad ≥ 40) y apoya la etiqueta de una acción (entrenador: atletismo; tutor y compañero aplicado: estudio...) suma min(0,15, (afinidad − 40)/400) cada uno, hasta +0,3. Afecta a **todas** las acciones con esa etiqueta, no solo a las de relaciones. |

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
| Pérdida al discutir, probabilidad de paces, esperas | `modules/relaciones/src/acciones.ts` (`perdidaPorDiscusion`, `probabilidadDePaces`, `ESPERA`) |
| Estados, umbrales y enfriamiento | `modules/relaciones/src/vinculo.ts` (`UMBRALES`, `ENFRIAMIENTO`) |
| Compatibilidad y atracción por gustos | `packages/contracts/src/rasgos.ts` (`compatibilidad`, `factorDeCompatibilidad`, `atraccion`, `EJES`) |
| Horarios y dónde está cada persona | `ANEXO_HORARIOS_PNJ.md` y `packages/contracts/src/agendas.ts` |

Al cambiar cualquiera, ejecutar `npm run sim` antes y después y revisar el área «Social» de la tabla y los tests de `modules/relaciones` y `tests/integracion.test.ts`.

## 7. Reglas decididas y pendientes

**Edad y gustos (decidido con el usuario).** La primera impresión depende solo de los **gustos de carácter**, no de la atracción física, **al menos hasta los 14 años** (`EDAD_ATRACCION_FISICA`, en `rasgos.ts`). Los gustos de aspecto físico están guardados pero no se usan, y cuando exista la pareja solo podrán usarse entre personas de edades parecidas a partir de los 14: **nunca entre un adulto y un menor**. La frase que se enseña es neutra.

**Sin teléfono (decidido).** No se puede contactar con quien no está contigo, y tampoco se sabe dónde está. Cuando haya teléfono: llamar, escribir y recibir mensajes.

**Planes a futuro (decidido, sin hacer).** Hoy «Quedar» y «Hacer planes» son inmediatos: pasar un rato con quien tienes delante. Más adelante se podrán **proponer planes** por el chat (p. ej. ir a estudiar a tu casa, o a la biblioteca si se crea) para otro momento:
- El plan **queda guardado** (quién, dónde, cuándo y qué).
- **Te obliga a ir** al sitio a la hora acordada, y entonces aparece la opción de empezar la quedada.
- Hacerlo **sube la relación**; **no presentarte la baja**.
- La otra persona **puede rechazar** el plan (según su disposición, su agenda y la relación).
- Necesita el teléfono (o el chat) y un sitio donde quedar.

**Saludos y otros eventos (apuntado).** Ahora solo hablan contigo si el personaje inicia. Más adelante los demás podrán hablarte: saludarte al verte (eventos), llamarte o escribirte al móvil.
