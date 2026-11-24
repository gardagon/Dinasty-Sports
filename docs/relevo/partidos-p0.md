# Partidos más reales, P0: las bases sin cambiar los resultados (24/11/2026)

Encargo de la arquitectura tras las respuestas del usuario a `docs/relevo/partidos-reales.md` §6.4 (entrada del 24/11 «Salud y lesiones (E12) y partidos más reales: decisiones» de `DECISIONES.md`). Rama `claude/partidos-reales` (unida a `claude/youthful-clarke-vs0kye`), sin pull request.

**Resultado en una línea:** el motor da **exactamente los mismos partidos** (70 de 70 cifras del banco iguales al céntimo, huella del juego idéntica, hash de 60 partidos idéntico al del motor anterior) y ahora tiene las cuatro bases que necesita el motor nuevo. **La caché de la fuerza es exacta pero no acelera de forma medible la jornada** (§4): se dice tal cual.

## 1. Qué se ha hecho

| Pieza | Dónde | Qué es |
|---|---|---|
| **Banco de realismo** | `tools/partidos-banco.ts` · `npm run partidos:banco -- [partidos] [prueba\|grande] [--guardar-referencia] [--estricto]` | Juega partidos entre equipos reales de la zona y saca 14 cifras por categoría (goles, tiros, 0 a 0, goleadas, local/empate, posesión, goles por línea, nota, suplentes, goles de la primera parte) más el coste y el tamaño del registro. Las compara con la **referencia guardada** (`docs/relevo/partidos-banco-referencia.json`, generada con el **motor anterior**) y con el orden de magnitud de un partido profesional (de memoria, a contrastar). `--estricto` sale con error si algo se sale de su tolerancia |
| **Flujos de azar por subsistema** | `modules/futbol/src/registro.ts` (`flujosDelPartido`) | `resultado` (exactamente el de siempre), `minutos`, `tarjetas`, `lesiones`, `cambios`. Se crean al pedirlos y gastar uno no cambia los demás. Más `azarDeLesionEnPartido(semilla, partido, jugador, momento)`: el azar de lesión **por jugador y momento**, como pidió la sesión de salud |
| **Registro de sucesos común** | `registro.ts` (`SucesoDePartido`, `conMinutos`, `vistaDeCronica`), `ResultadoDePartido.registro` | Lo que pasó en el partido, en orden y **con su minuto** (los minutos salen del flujo `minutos`, así que no cambian el marcador). `ResultadoDePartido.cronica` y `cronicaDelPartido` (`personaje.ts`) leen del registro: la crónica es una **vista derivada**. Un motor nuevo solo tiene que llenar el registro con más tipos (`tiro_fuera`, `falta`, `amarilla`, `corner`, `lesion`…); quien no conoce un tipo, lo ignora |
| **Caché de la fuerza** | `partido.ts` (`valoresBase`), `contracts/lector.ts` (`inmutable`), `npcs/plaza.ts` (`lectorDeUnNpc`) | Lo que vale cada jugador en el partido antes de su estado del día se guarda por lector y potenciador **solo si el lector es una foto** (`inmutable`). `lectorDeUnNpc` devuelve el mismo lector mientras no cambie nada de lo que lo forma (se **comprueba por valores**, no por identidad: los objetos de los niños se rehacen cada semana) |

Nada del motor cambia de comportamiento: el estado del día (`rinde`) se multiplica **después** de la caché, con las mismas operaciones y en el mismo orden (los números salen bit a bit iguales). Los tests nuevos están en `modules/futbol/src/registro.test.ts` (12 casos: huella de 60 partidos, crónica = vista del registro, minutos en su tramo y en orden, flujos independientes, azar de lesión por jugador, caché igual a sin caché, el lector que no es foto no se guarda, el estado del día cuenta).

## 2. Comprobaciones

| | Resultado |
|---|---|
| `npm run typecheck` | sin errores |
| `npm test` | ver §5 |
| `npm run huella -- 60` | **idéntica** (las 22 líneas, antes y después) |
| `npm run benjamin -- 31,33` | **idéntica** (misma salida que la base, salvo nada) |
| `npm run probar-web` | ver §5 |
| Hash de 60 partidos, motor anterior frente a nuevo | `0ecd749069f0b4a2fab272c8866b1c262cecb53e` en los dos (goles, tramos, tiros, jugadores, alineaciones, jugadas y crónica); fijado en `registro.test.ts` |
| Banco de realismo, referencia del motor anterior frente a motor nuevo (ciudad de prueba, 300 partidos por categoría) | **70 cifras comparadas, 70 exactamente iguales, 0 fuera de tolerancia** |

## 3. Lo que ya enseña el banco (hallazgos, sin tocar el motor)

Con equipos reales de la zona (ciudad de prueba, 300 partidos por categoría, parejas al azar; **no es lo mismo que una liga entre equipos parecidos**: hay más diferencias de nivel y salen más goles):

| Cifra | Benjamín | Alevín | Infantil | Cadete | Juvenil | Profesional adulto (de memoria) |
|---|---|---|---|---|---|---|
| Goles por partido | 4,57 | 3,85 | 3,05 | 3,24 | 2,77 | 2,6–2,8 |
| Tiros (los dos equipos) | 30,7 | 29,0 | 27,8 | 27,4 | 26,2 | 24–26 |
| 0 a 0 (%) | 1,7 | 3,7 | 4,0 | 5,3 | 6,0 | 7–8 |
| Partidos de 6 goles o más (%) | 30,3 | 20,3 | 8,3 | 10,3 | 6,0 | — |
| Gana el local (%) / empate (%) | 43 / 15 | 45 / 20 | 44 / 19 | 42 / 21 | 41 / 21 | 44–46 / 24–27 |
| Goles de delanteros / medio / defensas (% de los de campo) | 18 / 52 / 31 | 18 / 50 / 32 | 16 / 45 / 39 | 21 / 45 / 34 | 16 / 51 / 33 | ≈ 50 / 35–40 / 10–12 |
| Goles en la primera parte (%) | 53 | 49 | 50 | 54 | 54 | ≈ 44 |
| Nota media de los titulares de campo | 6,17 | 6,14 | 6,11 | 6,07 | 6,13 | 6 |

Dos cosas que **el motor de hoy hace mal y el motor nuevo deberá arreglar** (la decisión del usuario fue mantener la calibración de goles y tiros «como referencia»; esto es otra cosa):

1. **Quién marca.** Los delanteros marcan solo el 16–21 % de los goles de campo y los **defensas el 31–39 %** (en el fútbol real, ≈ 50 % y ≈ 10–12 %). Viene del sorteo del tirador (`partido.ts`, peso `participación de ataque × valor^1,5`) y de que todas las zonas de un puesto pesan parecido: un central aporta casi lo mismo al ataque que un mediocentro. Con B (tirador por posición y tipo de tiro) se arregla sin tocar el número de goles.
2. **Cuándo marca.** El 49–54 % de los goles sale en la primera parte (en la realidad, algo menos: ≈ 44 %, porque se juega más cansado al final y hay más espacio). El motor de hoy no da más goles al final porque no hay efecto del marcador ni cansancio que abra el partido.

Además, el motor no da **cifras de faltas, tarjetas, córners, tiros a puerta, xG ni pases** (el banco las muestra como «—» hasta P1).

## 4. Coste por partido, antes y después

Mismas condiciones, 3 pasadas alternadas del código anterior y del nuevo, `npm run liga -- 1 grande` (la jornada de liga de la ciudad grande, ~90 partidos por sábado, solo `ligaDelMundo`: plantillas, convocatoria y motor; **no** incluye `partido.mundo` de `npcs`):

| | Media del sábado (ms) | Mediana del sábado (ms) | Por partido (ms) |
|---|---|---|---|
| Antes (3 pasadas) | 110,3 · 111,2 · 118,5 | 123,5 · 121,2 · 135,5 | 1,2–1,3 |
| Después (3 pasadas) | 110,1 · 111,0 · 113,2 | 118,7 · 121,2 · 121,5 | 1,2–1,3 |

**La ganancia medible es nula o muy pequeña (≤ 4 %, dentro del ruido).** La caché **sí funciona**: en una temporada de la ciudad grande acierta en el **48 %** de los jugadores preparados (20.726 de 42.788; los que no aciertan son los que cambian de habilidades cada semana, que son los del equipo del personaje y los que entrenan a diario). Pero lo que ahorra es poco frente al total. Perfil de 7 semanas con liga (`tools/perfil-segmento.ts semanas-con-liga --ciudad`), inclusivo:

| | ms (7 semanas) | % del tramo |
|---|---|---|
| `ligaDelMundo` | 834 | 17,0 % |
| · `ladoDelPartido` (plantilla 244 + convocatoria 112) | 380 | 7,7 % |
| · `jugarPartido` | 350 | 7,1 % |
| ·· de ello `prepararJugador` → `valoresBase` (ya con caché) | 121 → 112 | 2,5 % → 2,3 % |
| ·· de ello el resto (dados: sorteos, `Math.pow` por candidato, cambios) | ~230 | 4,7 % |

**Conclusión honesta:** con el motor de hoy, lo que cuesta la jornada son la **construcción de las plantillas** (`plantillaDeUnEquipo`, `convocarYAlinear`) y los **dados**, no la preparación de los valores. La caché de la fuerza es el enchufe correcto y exacto para el motor nuevo (B y C preparan 24 habilidades por jugador, 0,48 ms por partido) y no estorba, pero **no resuelve el coste de la jornada por sí sola**. Si se quiere abaratar la jornada con miles de partidos, lo que toca es `plantillaDeUnEquipo` + `convocarYAlinear` por equipo (`partidos-reales.md` §2.5, punto 1: guardar la plantilla ya convocada por equipo y semana cuando no cambia nadie) y el reparto de la jornada entre hilos. No lo hago en P0 porque cambia dónde se guarda el estado y hay que decidirlo; **lo dejo propuesto, con la medida que lo justifica**.

Coste del motor por partido, en el banco (equipos repetidos 300 veces, así que la caché acierta casi siempre): 0,83 ms con el motor anterior frente a 0,40 ms con el nuevo. **Esa cifra no es la del juego**: allí los jugadores casi nunca se repiten dentro de una semana. Se deja en el banco solo como el coste del motor «con los lectores calientes».

## 5. Resultados de la batería final

(Se rellena al acabar `npm test` y `probar-web`; ver abajo.)

## 6. Lo que queda para P1 y quién lo necesita

- **Para P1 (motor B):** el motor sale del registro, de los flujos y de la caché; falta escribirlo. El banco ya tiene sitio para las cifras nuevas (faltas, tarjetas, córners, a puerta, xG, pases) y se pasará con `--guardar-referencia` **una sola vez**, cuando el cambio de motor esté decidido.
- **Para la sesión de salud:** el azar de lesión por jugador y momento ya existe (`azarDeLesionEnPartido`); falta su función de perfil de riesgo por jugador y partido. Se le ha enviado la firma que necesito (una llamada por jugador y partido, no por minuto).
- **Decisiones que no son mías:** (a) abaratar `plantillaDeUnEquipo`/`convocarYAlinear` guardando la plantilla convocada (§4); (b) si el goleador por posición (§3.1) se arregla ya, dentro de B, o antes con el motor de hoy, que **sí cambiaría resultados** y la huella del mundo del fútbol.

## 7. Entrada propuesta para `DECISIONES.md` (no editada)

> **24/11/2026 — Partidos, P0: bases sin cambiar resultados.** Registro de sucesos con minutos (la crónica es una vista), flujos de azar por subsistema (el del resultado, el de siempre), caché exacta de los valores por jugador (`LectorDePersona.inmutable`) y banco de realismo (`npm run partidos:banco`) con la referencia del motor anterior. Huella idéntica. La caché no acelera la jornada de forma medible (aciertos 48 %): el coste del sábado está en las plantillas y la convocatoria. Hallazgo del banco: los defensas marcan el 31–39 % de los goles y los delanteros el 16–21 % (real ≈ 10–12 % y ≈ 50 %); se arregla con el motor nuevo.
