# Anexo: el cuerpo y la apariencia heredable

Cifras del cuerpo de **todas** las personas (personaje, padres, PNJ). Las reglas son funciones puras en `packages/contracts/src/cuerpo.ts`; los hábitos de los PNJ, en `modules/npcs/src/cuerpo.ts`; las tendencias de canas, calvicie y barba, en `packages/contracts/src/rasgos.ts`. Plan y decisiones: `docs/PLAN_CUERPO_Y_APARIENCIA.md`. Si cambias una cifra aquí, cambia el código (y al revés).

## 1. Altura

`alturaEn(alturaAdulta, edad, madurez)` = `alturaAdulta × fracción(edad + madurez) − pérdida(edad)`. `madurez` es el adelanto (+) o retraso (−) del desarrollo en años: el `madurez` del personaje, el `desfase` de un PNJ con genética (0 si no tiene).

| Edad (+ madurez) | 0 | 2 | 4 | 6 | 8 | 10 | 12 | 14 | 16 | 18 |
|---|---|---|---|---|---|---|---|---|---|---|
| Fracción de la altura adulta | 0,30 | 0,50 | 0,58 | 0,66 | 0,73 | 0,80 | 0,87 | 0,94 | 0,98 | 1 |

Interpolación lineal. **Pérdida en la vejez** (cm): 0 hasta los 50; −0,15 por año de 50 a 70 (−3 cm a los 70); −0,2 por año desde los 70 (−7 cm a los 90; decidido por arquitectura el 14/11).

## 2. Peso

`pesoDe(altura, edad, músculo, grasa)` = `(IMC de referencia(edad) + 0,04 × (músculo − 30) + 0,09 × (grasa − 40)) × altura²` (altura en metros).

| Edad | 6 | 10 | 12 | 14 | 16 | 18 | 30 | 50 | 70 | 90 |
|---|---|---|---|---|---|---|---|---|---|---|
| IMC de referencia | 15,2 | 16,2 | 17,4 | 18,8 | 20,2 | 21,5 | 23 | 24,5 | 24,5 | 23 |

## 3. Músculo y grasa

**Complexión** (sin cambios): `grasa ≥ 65` con sobrepeso; si no, `músculo ≥ 60` musculado; `músculo ≥ 35 y grasa ≤ 45` atlético; `grasa ≤ 25 y músculo ≤ 30` delgado; si no, normal.

**Objetivo semanal** (`objetivoDeCuerpo(hábitos, {edad, madurez, sexo})`), con los minutos de la semana de fuerza y de actividad (la actividad incluye la fuerza, como en el personaje):

- Grasa = `clamp(78 + 8 si es mujer (llega con la pubertad: nada hasta los 13 años, todo a los 18) + metabolismo − (actividad + 60) × 0,1, 20, 80)`. **Metabolismo**: `0,3 × (edad − 30)` entre 0 y 12.
- Músculo = `clamp(12 + fuerza × 0,1, 10, 90)`; × 0,75 si es mujer; − `0,5 × (edad − 40)` desde los 40 (sarcopenia); **tope por desarrollo físico** `15 + 75 × físico/100` (el `fisico` de `vigoresPorEdad(edad, madurez)`: un niño de 8 años no pasa de 37,5; con 13 años y madurez normal ya puede llegar a 60); mínimo 5.
- **Genética del cuerpo** (`QuienEs.metabolismo` y `.musculatura`, puntuaciones típicas con media 0 y desviación 1, limitadas a ±2,5): `metabolismo`, la facilidad para engordar, suma `3 × z` a la grasa objetivo; `musculatura`, la facilidad para ganar músculo, multiplica por `1 + 0,15 × z` el músculo por minuto de fuerza y suma `5 × z` al tope. Igual para todos. El personaje las hereda con `ctx.herencia('metabolismo' | 'musculatura')` (con generador propio, `FAMILIAS_ESTABLES`, para no mover el mundo de la semilla); los padres, de su herencia; los hermanos, `0,45 × (padre + madre) + 0,6 × z propio` (como la estatura); el resto, estable por id (`metabolismoZ`, `musculaturaZ`).
- **Paso semanal**: el cuerpo se acerca al objetivo un **8 %** (`CUERPO.inercia`).

## 4. Hábitos (minutos por semana)

**La actividad física cuenta igual para el personaje y los PNJ** (segunda ronda, 14/11). La base de cualquier semana es la `actividadBasica` de 60 min (en `objetivoDeCuerpo`); encima se suma:

- **Recreo** (menores de 18, solo en edad escolar, 3 a 17 años, y solo los días de clase): se juega de verdad o no cuenta.
  - *Personaje*: «Jugar con otros niños» (`relaciones.jugar_con_otros`) y «Jugar con X» (sufijo `jugar`, 5 minutos) llevan la etiqueta `actividadLigera` y suman sus minutos reales. Son los de los hermanos pequeños también (usan `jugar`).
  - *PNJ*: cada día de clase juegan con una probabilidad **estable por persona de 40 a 90 %** (`0,4 + 0,5 × (0,7 × interés en el deporte/3 + 0,3 × (sociabilidad + 50)/100)`) y suman **30 min** cada recreo que juegan (`RECREO`).
- **Educación física**: los minutos reales de la asignatura según el currículo y los horarios del país (`minutosDeEducacionFisica(pais, curso)`, en `packages/contracts/src/paises/curriculo.ts`: clases a la semana del curso en el horario de 20 huecos × lo que dura una clase; **una sola fuente**: la usan el `EducacionFisicaService` de `estudios` y el cuerpo de los PNJ, al crear la partida y cada semana; las horas de cada asignatura, `HORAS_DE_ASIGNATURA`, también están ahí), solo en semanas con clase y en los cursos que la tienen, **contados al 50 %** (`FRACCION_EN_MOVIMIENTO_DE_EDUCACION_FISICA`: en una clase se está en movimiento la mitad del tiempo; decidido por el usuario el 14/11). *Personaje*: la clase `estudios.clase_N` de Educación física lleva `actividadALaMitad` y suma la mitad de lo que asiste (solo si va). *PNJ*: la suman según su curso (edad de competición − 8) y los días de clase de la semana.
- **Quedar con alguien** (`quedar`, «Pasar la tarde con» y «Quedar con (plan acordado)»): llevan `actividadDeNino`; para menores de **12** años cuenta **la mitad** de la duración, a partir de los 12, nada.
- **Juego libre de fuera del colegio** (tardes, fines de semana y vacaciones), solo PNJ (el personaje, con sus acciones): estable por persona `130 × azar^0,5` (media ≈ 87) + **40 por nivel de interés en el deporte** (0 a 3). Recalibrado a la baja al contar el recreo y la Educación física.
- **Adultos (≥ 18)**: actividad propia estable, sacada de su semilla y de su interés en el deporte: actividad `800 × azar^1,3 + 50 × interés`; fuerza `560 × (0,3 × otro azar + 0,7 × actividad/800)^2,5` (como mucho su actividad: quien se mueve mucho suele hacer algo de fuerza). Se guarda en `Npc.actividad`. En cada cumpleaños cambia: desviación normal de 30 min en la actividad y 15 en la fuerza, y un 5 % de probabilidad de un salto de ±200 min.
- **Si juega a un deporte con rutina**: se **suman** las sesiones de club de la semana: **90 min de actividad y 30 de fuerza por sesión** (`MINUTOS_DE_SESION`, provisional: pendiente de que cada deporte declare sus minutos de fuerza). Quien deja el deporte, o está de baja, se queda con la base.
- **Estado inicial** de quien ya existe al crear la partida (o llega nuevo al empezar un curso): el equilibrio de sus hábitos de fuera del colegio más la mitad (`ESCOLAR_AL_EMPEZAR.peso`) de lo que darían el recreo y la Educación física (los minutos reales de su curso con `minutosDeEducacionFisica`, al 50 %) en una semana media del curso: se acaba de salir de las vacaciones. Más un ruido normal de ±2 de músculo y ±4 de grasa. A los que ya juegan en un club se les suponen 2 sesiones por semana.
- Todos los azares son estables: por semilla de la partida, persona y semana (recreo) o edad (cumpleaños).

## 5. Historial anual

Una foto por persona y cumpleaños: `hc = [edad de la primera foto, músculo, grasa, músculo, grasa, …]`, en enteros (`conFotoDelCumple`, `fotoDeEdad`). Quien ya existía al empezar la partida tiene su primera foto en su primer cumpleaños; antes de ella el dibujo usa la primera que haya. La altura y el peso no se guardan: se recalculan con §1 y §2. El personaje guarda el suyo en `IdentidadState.hc`; los PNJ, en `Npc.hc`.

## 6. Canas, calvicie y barba (`Apariencia`)

Valores numéricos de la generación (no de la edad). El dibujo decidirá con ellas, la edad y la semilla. Se sortean con un generador estable sembrado con el carácter, los intereses y los gustos de la persona, no con el de la partida, para no cambiar el resto del mundo de una semilla.

| Campo | Qué es | Al azar (adultos del mundo) | Herencia |
|---|---|---|---|
| `canas` | edad (años) a la que empiezan | normal, media 34, sd 6, entre 20 y 60 | media de los padres ± 3 (uniforme) |
| `calvicie` | tendencia a perder pelo, 0 a 1 | hombres: media 0,45, sd 0,25; mujeres: media 0,1, sd 0,1, máximo 0,4 | 0,6 × madre + 0,4 × padre ± 0,1, con el tope del sexo del hijo |
| `barba` | densidad del vello facial, 0 a 1 | normal, media 0,6, sd 0,2 | media de los padres ± 0,1 |
| `envejecimiento` | cómo envejece la piel, de 0 (muy bien) a 1 (mal); 0,5 es lo normal | normal, media 0,5, sd 0,2, entre 0 y 1 | media de los padres ± 0,1 |

**Tendencias por origen** (se suman a la media al azar, en `ORIGENES`): Asia oriental, canas +4 y barba −0,3; Europa del norte, canas −2; España (sur) y Magreb, barba +0,1; África subsahariana, canas +3. En las mujeres la barba se guarda igual (se hereda) pero no se dibuja. El `envejecimiento` no tiene tendencias por origen y se sortea con su propio generador estable (añadirlo no movió el mundo de ninguna semilla; `SAVE_VERSION` 20); el dibujo decide con él y la edad cuándo empiezan las arrugas y cuánto se marcan (`arrugasA`, en `docs/ANEXO_RETRATOS.md` §4). Una partida sin el dato se dibuja como 0,5.

## 7. Rasgos de la cara heredables (`Apariencia.rostro`)

Para que los hijos se parezcan a sus padres (y a veces a un abuelo), la cara se hereda además de la forma, los colores y los distintivos. El origen inclina la media de cada rasgo (decidido el 21/11). Son **13 rasgos, cada uno un número de 0 a 1** (no catálogos de formas: no dependen del estilo de dibujo): `ojosForma` (0 rasgados y estrechos, 1 redondos y abiertos), `ojosTamano`, `narizForma` (0 fina, 1 ancha), `narizTamano`, `bocaGrosor`, `bocaAnchura`, `cejasGrosor`, `cejasForma` (0 rectas, 1 arqueadas), `orejasTamano`, `orejasDespegadas`, `menton`, `pomulos` y **`parpado`** (el pliegue del párpado: 0 sin pliegue visible, con epicanto; 1 pliegue marcado), en `RASGOS_DE_ROSTRO`. `parpado` va el último: las partidas anteriores (24 caracteres) se leen con él a 0,5 sin subir `SAVE_VERSION`.

- **Herencia como los perks**: cada rasgo es un par `[expresado, latente]`. El hijo recibe **uno de los dos valores de cada padre** (al azar) y **uno de los dos que recibe se expresa** (al azar, 50 %). Así saca cada rasgo de uno de sus padres, y 1 de cada 4 veces lo que un padre llevaba latente: el rasgo de un abuelo (`rostroHeredado`).
- **Adultos del mundo** (primera generación, `rostroAlAzar(rng, origen)`): los dos valores de cada rasgo al azar con la **media desplazada por las tendencias de su origen**; hermanos, hijos y el personaje: la herencia anterior desde sus padres, así que las mezclas salen solas (sin mutación).
  - **Cómo se sortea**: cada valor es `u^e` con `u` uniforme en 0–1 y `e = 1/media − 1`; la media es `0,5 + tendencia del origen` (la base del pliegue es 0,62, porque la mayoría de la gente lo tiene visible). Sin tendencia (media 0,5) sigue siendo uniforme; con tendencia, toda la gama sigue saliendo (la gente de cada origen se parece más a su media, pero cualquier cara cabe en cualquiera). Con dos orígenes, cada uno de los dos valores (alelos) sale de uno de ellos, ponderado.
  - **Tendencias** (`OrigenDef.rostro`, desplazamiento de la media; ausente = 0; ajustables, suaves a propósito):

| Origen | Tendencias |
|---|---|
| Asia oriental | `parpado` −0,28 (media 0,34: muchos sin pliegue visible, otros con él), `ojosForma` −0,12, `ojosTamano` −0,06, `narizTamano` −0,06, `narizForma` +0,04, `pomulos` +0,12, `cejasForma` −0,10, `cejasGrosor` −0,03, `menton` −0,05, `bocaAnchura` −0,03 |
| África subsahariana | `narizForma` +0,12, `bocaGrosor` +0,12, `narizTamano` +0,04, `bocaAnchura` +0,04, `ojosTamano` +0,05, `pomulos` +0,03 |
| Europa del norte | `narizForma` −0,07, `bocaGrosor` −0,08, `cejasGrosor` −0,05, `menton` +0,05, `narizTamano` +0,03, `ojosTamano` −0,03 |
| Magreb | `cejasGrosor` +0,08, `narizTamano` +0,05, `ojosTamano` +0,04, `bocaGrosor` +0,02 |
| Latinoamérica | `pomulos` +0,04, `narizForma` +0,03, `ojosForma` −0,03, `parpado` −0,04 |
| Europa del este | `pomulos` +0,04, `narizForma` −0,03 |
| España (sur) | `cejasGrosor` +0,03 |
| España (norte y centro) | ninguna |

  - **Generador propio, sin mover el mundo**: el rostro sale del generador estable de cada persona (`generadorDeRostro`), no del de la partida; añadir el rasgo y las tendencias solo cambia el texto del rostro de las personas (`npm run huella -- 60`: los bots salen idénticos; con el rostro quitado del estado de `npcs`, el mundo con fútbol de las semillas 31 y 32 también; `npm run sim:cuerpo -- 2 31,32` igual).
- **Lo que lee el dibujo**: `rostroExpresado(apariencia)` da el valor expresado de cada rasgo; `rostroDe(apariencia)` da los pares completos. `CuerpoDePersona.apariencia` ya lo lleva.
- **Cómo se guarda**: un texto de 26 caracteres (`Apariencia.rostro`: dos por rasgo, expresado y latente, con 64 niveles cada uno: pasos de 1/63), para que el estado no crezca más de un 2 % (en datos sueltos serían 26 números por persona). `empaquetarRostro` y `rostroDe` convierten. Las partidas sin ese dato (anteriores) se leen como todo a 0,5.
- **Sin mover el mundo de cada semilla** (de antes): los sortea un generador estable propio de cada persona (sembrado con su carácter, sus intereses y sus gustos, como las canas, la calvicie y la barba), no el de la partida: los nombres, los equipos y todo lo que se sortea después no cambia.
- **Sin mutación**: los valores de los hijos son siempre alguno de los de sus padres; la variedad de la población viene toda de la primera generación.

## 8. Servicio de lectura

`CuerpoService` (`SERVICES.cuerpoPersonaje` y `SERVICES.cuerpoNpcs`): `de(id)` devuelve un `CuerpoDePersona` (id, sexo, nacimiento, altura adulta, madurez, músculo y grasa de hoy, metabolismo y musculatura, historial, apariencia y semilla de dibujo estable) y `ids()` lista las personas. `cuerpoDePersona(ctx, id)` pregunta a los dos. El padre y la madre son PNJ (`npcs`), así que los da el servicio de `npcs`.

## 9. Calibración (`npm run sim:cuerpo`)

Proporción con complexión «con sobrepeso» (media de varias semillas, al empezar y tras dos o tres años de partida, que es justo después de las vacaciones):

| Grupo | Objetivo | Medido |
|---|---|---|
| Niños de 8 a 12 | 5–12 % | 6–11 % |
| Jóvenes de 13 a 17 | 5–12 % | 6–11 % |
| Adultos de 18 a 39 | 10–20 % | ≈ 15 % |
| Adultos de 40 a 64 | 20–30 % | ≈ 28 % |
| Niños y jóvenes que juegan con rutina | < 3 % | 0–2 % |
| «Delgado» entre los adultos | 8–15 % | ≈ 12 % (18–39) y ≈ 10 % (40–64) |

Ningún menor de 12 años «musculado»; entre los adultos de 18 a 39, «atlético» o «musculado» ≈ 16 %.

Arquetipos de niño de 10 años (grasa objetivo en equilibrio a lo largo del curso, con el calendario de España y sin juego libre; límite del sobrepeso: 65), igual para chicos y chicas hasta la pubertad:

| Arquetipo | Grasa | Año con sobrepeso |
|---|---|---|
| Solo Educación física, metabolismo medio (z = 0) | 65,1–69,2 | 100 % |
| Solo Educación física, metabolismo alto (z = −1,5) | 60,6–64,7 | 0 % |
| Recreos (4 de 5) y Educación física | 53,9–64,8 | 0 % |
| Nada (ni recreo ni Educación física) | 72 | 100 % |

Los márgenes son de unas décimas: están justo en el límite de 65 por cómo se definió el objetivo. **Decididos por el usuario (14/11):** el extra de +8 de grasa de las mujeres llega con la pubertad (0 hasta los 13 años, pleno a los 18) y el 9–14 % de sobrepeso de los jóvenes de 13 a 17 años se acepta tal cual, sin más calibración. En la población real (con juego libre) las proporciones por grupo son las de la tabla de arriba, medidas en el momento de empezar (tras las vacaciones) y tras dos o tres años: 8 a 12 años, 5–8 %; 13 a 17 años, 9–14 %; los extremos de cada instantánea quedan un punto y medio fuera de 5–12 %.
