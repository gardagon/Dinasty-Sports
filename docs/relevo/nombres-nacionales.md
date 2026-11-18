# Nombres más «nacionales»: propuesta con muestras

> **Actualización 18/11/2026: el usuario aprobó (a) y (b) con un cambio: el nombre español de la segunda generación al 20 %, no al 35 %; el orden de los apellidos no se toca. Está aplicado en esta rama (§7).** El resto del informe (§0-§6) es el análisis original con las cifras de «hoy» = antes del cambio.

Rama `claude/nombres-nacionales` (sale de `claude/youthful-clarke-vs0kye`). **No se ha cambiado ninguna regla ni cifra del juego**: solo el script de lectura `tools/nombres-nacionales.ts` (`npm run nombres-nacionales -- [semillas=5] [niños=40000]`) y este informe. El usuario no quiere bajar el porcentaje de orígenes (~19 % de fuera, 25 % de niños con algún padre de fuera): quiere probar si con nombres y apellidos más habituales le resulta más normal.

## 0. Resumen y recomendación

1. **Primer hallazgo: lo que se ve no es el 25 %.** Contando como «suena extranjero» un nombre de pila o algún apellido de una cultura **no hispana** (España y Latinoamérica cuentan como «normal»), hoy salen **3,6 de cada 20 compañeros** (18 %), y **2,6 de cada 20 «a primera vista»** (nombre de pila o *primer* apellido, lo que se lee en una lista de clase). Los «5 de 20» de antes contaban el origen, no cómo suena: los de Latinoamérica (≈7 % de los niños) tienen nombre y apellidos hispanos. El juego hoy da una clase de 24 con 1 a 5 «extranjeros» según la semilla (media 3,2 de 24 en las 5 semillas de este informe; 14 % con 20 semillas).
2. **El apellido manda.** De ese 18 %, el **7 %** de todos los niños tiene nombre español y apellido de fuera (Lucas Amrani); solo el **11 %** tiene también el nombre de fuera. Y **toda mezcla de un español con alguien de fuera lleva un apellido de fuera** (uno de cada), así que ninguna regla de nombres lo quita: el límite es la demografía. El suelo sin tocar el 19 % es el 18,5 % de niños con algún origen no hispano.
3. **Lo que más mueve (a): repartir el 19 % como en Madrid** (más latinoamericanos, que ya traen nombres y apellidos hispanos): **3,6 → 2,7 de cada 20** (a primera vista 2,6 → 1,8), sin cambiar el porcentaje de orígenes de fuera (19 %), solo su reparto. Es solo datos (`CIUDAD_GRANDE.demografia`); no toca código.
4. **(b) retoca los nombres de pila, no el número:** no cambia cuántos suenan extranjeros (el apellido sigue), pero **baja a menos de la mitad los nombres de pila de fuera** (2,2 → 1,0 de cada 20 junto con (a)) y quita los «Ilyas Amrani» para dejar «Lucas Amrani». A primera vista, 2,6 → 2,4 solo con (b) y 1,8 → 1,6 con (a).
5. **(c) no ayuda con la medida; empeora un poco.** Hoy el nombre y el primer apellido van de la mano (si el nombre es de fuera, el primer apellido también; si es español, el español va primero), así que la «extranjería» se concentra en el mismo niño. Si el apellido español pasa a ir primero el 70 % *con independencia del nombre*, hay más niños con *algo* de fuera en la parte que se lee primero: 2,6 → 2,8 de cada 20 a primera vista. Solo tendría sentido por realismo (el orden del apellido no depende del nombre), no para que suene más normal. **No lo recomiendo para esta prueba.**
6. **(d) marginal:** nombres compartidos entre culturas, con un 30 %: nombres de fuera 5,1 % → 4,1 % de los niños y casi nada en el total.
7. **Recomendación: (a) + (b)** («a+b»): **2,6 de cada 20 suenan extranjeros (hoy 3,6) y 1,6 a primera vista (hoy 2,6)**; los nombres de pila de fuera bajan de 2,2 a 1,0 de cada 20; la probabilidad de una clase de 24 con 7 o más baja del 6 % al 1 % y la de 3 o menos sube del 34 % al 61 %. **Sin tocar el porcentaje de orígenes (19 % de fuera).** Si aun así parece mucho, la siguiente palanca ya es bajar `ambosExtranjeros`/`mixtas` (el porcentaje), que el usuario ha pedido no tocar todavía. Los cambios de código serían pequeños (ver §5).

Cifras que propongo (asumidas, ver §2 y §3):

| Parámetro | Hoy | Propuesta |
|---|---|---|
| Demografía de la ciudad grande (total de fuera 19 %) | Latinoamérica 6 · Magreb 4 · E. este 3,5 · E. norte 2 · Asia oriental 1,8 · Subsahariana 1,7 | **Latinoamérica 9,9 · E. este 3,0 · E. norte 2,4 · Asia oriental 1,9 · Magreb 1,2 · Subsahariana 0,6** |
| Nombre de pila español, hijo de dos de fuera del mismo origen (nacido aquí) | 0 % | **35 %** |
| Nombre de pila español, mezcla de dos orígenes de fuera (`PROBABILIDAD_DE_NOMBRE_LOCAL`) | 12 % | **35 %** |
| Nombre de pila español, mixta con un origen de aquí | 50 % (por peso) | **65 %** |
| Orden del apellido en las mixtas | sigue al nombre (el español primero ≈ 49 %) | sin cambios (65 % al subir el nombre español) |

## 1. Cómo se ha medido

- **Muestras de «hoy»:** los nombres reales que genera el juego (`nuevaPartida`, ciudad grande, semillas 1 a 5): las 24 personas de «tu clase» (`tipos.tuClase`, 8-9 años; el juego tiene `alumnosPorAula - 1 = 24`) y el nombre del personaje (`identidadDeJugador`). El **origen de los padres de cada compañero no se guarda**: se deduce del origen del niño (un solo origen = los dos padres del mismo origen; dos orígenes = uno de cada). Los del personaje son los reales (`padresDeSemilla`).
- **Muestras de las opciones:** los mismos compañeros (mismos orígenes, mismo orden) con el nombre vuelto a sortear con una copia local y parametrizada de `identidadAlAzar` (`nombres.ts`). Con los parámetros de hoy la copia da lo mismo que el juego (20 semillas, 480 compañeros: **14,4 % frente a 14,4 %**). En (a) los orígenes también cambian (otra demografía en `CIUDAD_GRANDE`, registrada solo dentro del script con otro id), así que los compañeros de (a) no son las mismas personas que los de hoy.
- **Tabla:** 40 000 niños sorteados por opción como hijos de una pareja de la ciudad grande (`origenesDePareja` + `origenHeredado`, que es lo que hace `persona()` con los niños del mundo), con el mismo cuidado de nombres. Los porcentajes de una clase concreta varían mucho (0 a 5 de 24): la tabla es la media; las muestras son ejemplos.
- **«Suena extranjero»** = el nombre de pila no está en las listas de nombres de España/Latinoamérica (jóvenes, adultos y compuestos) **o** algún apellido no está en sus listas de apellidos. «**A primera vista**» = el nombre de pila o el *primer* apellido. Ojo: un nombre de otra cultura que también está en las listas hispanas (Daniel, Sara, Adam, Luca…) cuenta como normal.
- **Homónimos:** no se aplican en las opciones (no cambian nada de esto).

## 2. (a) Repartir el 19 % como Madrid: datos y propuesta

**Fuentes** (leídas a través de la búsqueda web; **no he podido abrir `ine.es` ni `madrid.es`** desde la sesión: el proxy los rechaza, igual que en el informe de demografía anterior; falta contrastar contra INEbase y el padrón):

| Dato | Cifra | Fuente |
|---|---|---|
| Ciudad de Madrid, población extranjera (padrón 1/1/2026) | 19,4 % de ≈3,5 millones | [Ayuntamiento de Madrid, Primeros resultados 2026](https://www.madrid.es/UnidadesDescentralizadas/UDCEstadistica/Nuevaweb/Demograf%C3%ADa%20y%20poblaci%C3%B3n/Cifras%20de%20poblaci%C3%B3n/PMH/Avance/Primeros_resultados_2026.pdf); resumen en [eldiario.es](https://www.eldiario.es/madrid/somos/madrid-pierde-poblacion-nacimientos-superan-muertes-saldo-migratorio-negativo-pleno-debate-regularizacion_1_13185359.html) |
| **Comunidad** de Madrid, extranjeros 2025 (Censo anual INE) | 1 181 319 (16,6 %): **América 613 650 (51,9 %)**, **Europa 339 445 (28,7 %)** | [Boletín de personas de nacionalidad extranjera en la Comunidad de Madrid (2026-03)](https://gestiona3.madrid.org/bvirtual/BVCM007955-2026-03.pdf) |
| Comunidad de Madrid, Asia y África (boletín anterior, año de referencia algo anterior) | Asia 109 858 (9,8 %), África 107 031 (9,5 %) | [Boletín 2025-09](https://gestiona3.madrid.org/bvirtual/BVCM007955-2025-09.pdf) |

Las cuatro partes suman ≈100 % (51,9 + 28,7 + 9,8 + 9,5 = 99,9), así que son coherentes. **Límites:** el desglose por continente es de la **Comunidad**, no de la ciudad (no he encontrado el de la ciudad); las cifras salen de resúmenes de búsqueda, no de las tablas abiertas; y los juegos de datos del INE usados antes en el informe de demografía (14,6 % extranjeros, 20,2 % nacidos fuera) no cambian.

**Cómo lo traduzco a los orígenes del juego** (19 % de fuera en total, sin tocar la proporción):

| Origen del juego | Cálculo | Peso |
|---|---|--:|
| Latinoamérica | 51,9 % × 19 | **9,9** |
| Europa del este | 28,7 % × 19 = 5,45, la mayor parte (Rumanía, Ucrania, Bulgaria, Polonia…): *supuesto 55 %* | **3,0** |
| Europa del norte | el resto de Europa (Italia, Reino Unido, Francia, Alemania…): *supuesto 45 %* | **2,4** |
| Magreb | África 9,5 % × 19 = 1,8, dominada por Marruecos: *supuesto 2/3* | **1,2** |
| África subsahariana | el otro tercio | **0,6** |
| Asia oriental | Asia 9,8 % × 19 (el juego no tiene Asia meridional ni Filipinas: todo va aquí) | **1,9** |
| España norte/centro/sur | 81 %, igual que hoy (16,2 / 32,4 / 32,4) | 81 |

Los repartos Europa este/norte y Magreb/subsahariana son **supuestos míos** (no hay dato por país a mano); conviene afinarlos cuando se pueda leer INEbase/padrón por nacionalidad (Marruecos, Colombia y Rumanía lideran los colectivos en España según el Censo de 2025 citado en el informe anterior). Se aplica solo a `CIUDAD_GRANDE.demografia` (la ciudad «como Madrid»); las demás ciudades heredan el país, sin cambios.

## 3. (b), (c), (d)

### (b) Segunda generación: más nombres españoles

Reglas de hoy (`nombres.ts`, `origenDelNombre`): hijo con **un solo origen** de fuera (los dos padres del mismo origen): nombre **siempre** de su cultura; mezcla de **dos orígenes de fuera**: 12 % de nombre español (`PROBABILIDAD_DE_NOMBRE_LOCAL`); mezcla con un origen de aquí: por peso, **50 %**. Los niños del mundo son todos nacidos aquí (los extranjeros recién llegados no se generan), así que la cifra de segunda generación aplica a todos.

**Cifra propuesta: 35 %** (un solo origen y mezcla entre dos de fuera) y **65 %** en la mixta con un origen de aquí. **No tengo un dato que la justifique:** no he encontrado estadística de nombres de nacidos en España por nacionalidad de los padres (el INE publica nombres por año, no por origen de los padres); lo que sí hay es que la segunda generación se parece cada vez más a los nativos (Elcano, Funcas: [Panorama Social 41](https://www.funcas.es/wp-content/uploads/2025/09/Panorama-Social-41_WEB.pdf)), y el efecto de nombres como Daniel, Sara o Adam, comunes en ambas lenguas. **Es una decisión de diseño** y la tabla de sensibilidad de abajo muestra qué pasa con 20, 35, 50 y 70 %: cuanto más alta, menos nombres de fuera, pero el número de los que «suenan extranjeros» (por el apellido) no se mueve.

### (c) Hijos de pareja mixta: apellido y orden

**Comprobado en el código:** el niño del mundo de pareja mixta lleva **dos apellidos, uno de cada origen** (siempre un apellido de aquí si uno de los padres lo es: `identidadAlAzar`, `numero = 2` si algún origen es hispano). **Pero el orden sigue al nombre:** va primero el apellido del origen del que ha salido el nombre de pila, o sea, **el español va primero ≈ la mitad de las veces** (49 % medido). En el **personaje** y sus hermanos va el del padre primero (por defecto) y el jugador puede elegir cuál (`ApellidoPrincipal`), sin cambios. Los hijos de dos padres de fuera con una sola cultura llevan **un solo apellido** (regla actual; sin cambios).

**Probado: el apellido español primero en el 70 % de las mixtas** (hoy 49 %; con (b) solo, 65 %, porque sigue al nombre). Justificación posible: por defecto va primero el del padre y en una pareja mixta el progenitor español es el padre la mitad de las veces (≈50 %, lo que sale hoy); el 70 % supone que los padres de un hijo que crece aquí suelen elegir el apellido que se integra mejor. **Es una elección de diseño: no he podido contrastar con el INE** (matrimonios mixtos por nacionalidad del marido y de la mujer; no he abierto la tabla) ni con estadística del orden de apellidos (la búsqueda solo dio casos de México, Chile y Ecuador). **Resultado: no mejora la medida** (2,6 → 2,8 de cada 20 a primera vista, ver el punto 5 del resumen) porque desacopla el nombre del apellido. Si se quiere el orden «español primero» por coherencia con la ley y la costumbre, lo razonable es dejarlo ligado al nombre (como hoy) o hacerlo con (b) subido.

### (d) Otras palancas sin tocar el porcentaje de orígenes

- **(d) Nombres compartidos** (probado): con un 30 %, un hijo de fuera con nombre de su cultura lleva uno que también está en las listas hispanas (Daniel, Sara, Adam, Omar, Luca, Julia, Natalia…), si su cultura los tiene (Rumanía 17 mujeres/5 hombres, británica 8/9, continental 9/9, Magreb 3/2, África del golfo 12/10; **China, Japón/Corea/Vietnam y oeste africano, ninguno**). Efecto: nombres de fuera 5,1 % → 4,1 % de los niños en a+b+c+d frente a a+b+c. Marginal; no hace falta.
- **No probadas, y no las propongo:** hispanizar el apellido de los hijos de fuera («Amrani» → «Amaro»: no es lo que ocurre) y darles dos apellidos aunque su cultura lleve uno (en España los hijos de dos extranjeros suelen conservar el sistema del país de los padres).
- **Palanca que sí haría los nombres más corrientes pero toca el porcentaje:** bajar `ambosExtranjeros` (13 %) y `mixtas` (12 %). No medida aquí.
- **Lo que no cambia:** los adultos (profesores, vecinos, entrenadores) y las semillas guardadas; las partidas existentes conservan su gente.

## 4. Tabla resumen

Media de 40 000 niños por opción (ciudad grande). **De cada 20** = 20 × proporción.

| Opción | Suenan extranjeros | de cada 20 | **A primera vista** | de cada 20 | nombre **y** apellido | solo el apellido | solo el nombre | con origen no hispano | P(≥7 de 24)¹ | P(≤3 de 24)¹ |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| Hoy | 18.1 % | 3.6 | 13.0 % | **2.6** | 11.0 % | 7.1 % | 0.0 % | 18.5 % | 6 % | 34 % |
| a | 13.5 % | 2.7 | 9.2 % | **1.8** | 7.7 % | 5.8 % | 0.0 % | 13.8 % | 1 % | 59 % |
| b | 18.1 % | 3.6 | 11.8 % | **2.4** | 7.5 % | 10.6 % | 0.0 % | 18.4 % | 5 % | 34 % |
| c | 18.3 % | 3.7 | 14.0 % | **2.8** | 11.1 % | 7.1 % | 0.1 % | 18.6 % | 7 % | 34 % |
| d | 18.3 % | 3.7 | 13.3 % | **2.7** | 8.4 % | 9.8 % | 0.0 % | 18.6 % | 6 % | 34 % |
| a+b | 12.9 % | 2.6 | 8.0 % | **1.6** | 5.0 % | 8.0 % | 0.0 % | 13.3 % | 1 % | 61 % |
| b+c | 17.9 % | 3.6 | 12.9 % | **2.6** | 7.3 % | 10.6 % | 0.1 % | 18.3 % | 5 % | 35 % |
| a+b+c | 13.2 % | 2.6 | 9.2 % | **1.8** | 5.1 % | 8.0 % | 0.1 % | 13.6 % | 1 % | 60 % |
| final | 13.3 % | 2.7 | 9.2 % | **1.8** | 6.8 % | 6.5 % | 0.0 % | 13.6 % | 1 % | 60 % |
| a+b+c+d | 13.4 % | 2.7 | 9.1 % | **1.8** | 4.1 % | 9.3 % | 0.0 % | 13.8 % | 1 % | 60 % |

¹ Clases de 24 compañeros (como las del juego). «A primera vista» = nombre de pila o primer apellido de cultura no hispana (lo que se lee en una lista de clase). «Suenan extranjeros» = nombre o algún apellido de cultura no hispana; «solo el apellido» = nombre español/latino con apellido de fuera (Lucas Amrani).

Referencia: hoy 3.6 de cada 20. «Origen no hispano» = el niño tiene algún origen que no es de España ni de Latinoamérica (el suelo que no se baja sin tocar la demografía).
En las mixtas de un origen de aquí con uno de fuera, el apellido español va primero: Hoy 49 % · a 51 % · b 65 % · c 70 % · d 49 % · a+b 65 % · b+c 70 % · a+b+c 70 % · final 50 % · a+b+c+d 70 %.

### Sensibilidad de (b)

| pLocalSolo | pLocalMezcla | pLocalEnMixta | Nombre de fuera, solo b (de 20) | A primera vista, solo b (de 20) | Nombre de fuera, con a | A primera vista, con a |
|--:|--:|--:|--:|--:|--:|--:|
| 0 % | 12 % | 50 % | 2.2 | 2.6 | 1.5 | 1.8 |
| 20 % | 20 % | 60 % | 1.8 | 2.4 | 1.2 | 1.6 |
| 35 % | 35 % | 65 % | 1.5 | 2.3 | 1.0 | 1.6 |
| 50 % | 50 % | 75 % | 1.1 | 2.2 | 0.8 | 1.5 |
| 70 % | 70 % | 85 % | 0.7 | 2.0 | 0.4 | 1.4 |

Las cifras tienen un ruido de ±0,1 de cada 20 entre filas (cada fila usa su propio sorteo: p. ej. «solo b» 2,4 en la tabla y 2,3 aquí).

Comprobación de la copia: con los mismos orígenes (20 semillas, 480 compañeros), el juego da 14.4 % que suenan extranjeros y la copia con los parámetros de hoy, 14.4 %.


## 5. Qué había que tocar (hecho: §7)

- **(a)** `CIUDAD_GRANDE.demografia` en `packages/contracts/src/ciudad.ts`: solo datos. Actualizar `ANEXO_NOMBRES.md` §7 y el pendiente de ciudades en `PAQUETES_DE_PAIS.md`.
- **(b)** Hoy `origenDelNombre` (`nombres.ts`) usa una constante global (`PROBABILIDAD_DE_NOMBRE_LOCAL`, 12 %) y no distingue «un solo origen». Habría que añadir un dato (por país o ciudad, junto a `parejas`: `nombreLocal: { solo, mezcla, mixta }`) y usarlo en `identidadAlAzar`. Cambia las semillas (otros nombres) pero no los orígenes. El personaje y sus hermanos (`identidadDeHijo`) usan la misma función de nombre y se verían afectados igual.
- **(c)** No se propone.
- **(d)** No se propone.
- Probar con `npm test` (hay tests de nombres y de semillas), `npm run huella` y `npm run demografia`.

## 6. Límites de este informe

- Las cifras del padrón de Madrid y del INE vienen de la búsqueda web: `ine.es` y `madrid.es` están bloqueados en la red de la sesión. Los repartos Europa este/norte y Magreb/subsahariana son supuestos.
- Las cifras de (b) (35/35/65 %) y (c) (70 %) son decisiones de diseño, no datos.
- La medición de «suena extranjero» depende de las listas de nombres y apellidos del juego (un nombre que esté en las dos culturas cuenta como normal). La tabla es una media de 40 000 niños; una clase concreta varía mucho (de 0 a 5 de 24).
- Las muestras de (a) son otras personas que las de «hoy» (cambia la demografía). El resto de opciones reutilizan los mismos compañeros de cada semilla.
- Los padres de los compañeros son una deducción a partir de su origen.

## 7. Aplicado (18/11/2026)

**Qué se ha cambiado** (el orden de los apellidos no):
- **(a)** `CIUDAD_GRANDE.demografia` (`packages/contracts/src/ciudad.ts`): Latinoamérica 9,9 · Europa del este 3,0 · Europa del norte 2,4 · Asia oriental 1,9 · Magreb 1,2 · África subsahariana 0,6 (España 81 %; total de fuera sigue en 19 %). La demografía de España y la de las demás ciudades no cambian.
- **(b)** Dato nuevo **`nombreLocalDeLosNacidosAqui`** (0 a 1), opcional, en `PaisDef` y en `CiudadDef` (la ciudad manda sobre el país: `nombreLocalDelLugar`), validado en `validarPais`. La ciudad grande lo trae a **0,2**. Regla (`origenDelNombre`, `nombres.ts`): si el lugar trae el dato y la persona tiene **menos de 25 años** (`EDAD_DE_NOMBRES_JOVENES`) y no tiene origen del país: con **un solo origen** el nombre es del país de juego con esa probabilidad; en una **mezcla sin origen local** esa probabilidad sustituye al 12 % de `PROBABILIDAD_DE_NOMBRE_LOCAL`; la mixta con un origen de aquí sigue como antes (por peso, 50 %). Los adultos no lo usan. **Sin el dato todo sale exactamente como antes** (España, Argentina, Inglaterra, la ciudad de prueba: sus semillas no cambian).
- **Tests** (`nombres.test.ts`, `parejas.test.ts`): la regla (≈20 % en jóvenes de un solo origen, 0 en adultos y sin el dato), la prioridad ciudad-país, la validación y la demografía de la ciudad grande.
- **Docs:** `ANEXO_NOMBRES.md` (§2 y §7) y `PAQUETES_DE_PAIS.md`.

**Resultado medido con los nombres reales del juego** (40 semillas × 24 compañeros, ciudad grande, antes frente a ahora; misma medida de «suena extranjero»):

**Nombres reales del juego, antes y después** (40 semillas × 24 compañeros)

| | Suenan extranjeros | de cada 20 | A primera vista | de cada 20 | Nombre de pila de fuera | de cada 20 | Con origen no hispano |
|---|--:|--:|--:|--:|--:|--:|--:|
| Antes | 17.0 % | 3.4 | 13.1 % | 2.6 | 11.0 % | 2.2 | 17.2 % |
| Ahora | 12.1 % | 2.4 | 8.3 % | 1.7 | 6.0 % | 1.2 | 12.4 % |


Con la copia de las reglas (§4, 40 000 niños): la fila «final» da 2,7 de cada 20 que suenan extranjeros y 1,8 a primera vista (hoy 3,6 y 2,6). En el juego real salen **2,4 y 1,7** (antes 3,4 y 2,6; la diferencia con la tabla se debe a que 40 semillas son una muestra pequeña y a que la copia no aplica los nombres únicos entre homónimos). Los nombres de pila de fuera bajan de 2,2 a 1,2 de cada 20 (el 20 % pesa menos que el 35 % de la propuesta: 1,0). La copia de las reglas coincide con el juego con los mismos orígenes (antes 14,4 % / 14,4 %; ahora 10,6 % / 10,6 %).

**Dos muestras de 20 compañeros** (semilla 2, personaje Dani Fuentes Gil; ✱ = el nombre o el primer apellido suena de fuera). Hoy (4 de 20):
Manuel Santos Carrasco; Marina Oliva Morales; Enzo Iglesias Ibáñez; Domingo Martínez Fuentes; Luka Nikolov ✱; María José Salazar Camacho; Sara León Arias; Cayetana Cordero Román; Marc Urbano Rojas; Marina Varela Galindo; Gloria Martín Vázquez; Pierre Meyer ✱; Esteban Vidal Sáez; Diego Fernandes Redondo; Jessica Alonso Hernández; Sergey Novikov ✱; Jorge Gómez Ballesteros; Daniel Carmona González; Saúl Rodríguez Santana; Assia Oulad Hernández ✱

Ahora (1 de 20):
Manuel Santos Carrasco; Marina Oliva Morales; Enzo Iglesias Ibáñez; Domingo Martínez Fuentes; Franciszek Szymański ✱; Jan Castro Expósito; Ángela Arias Palacios; Diego Lago Tapia; Blanca Hurtado Carmona; Manuel Suárez Ferrer; Yolanda Rodríguez Luna; Valeria García Pizarro; Teresa Robles Fontán; Alba Castillo Montero; Lidia Rodríguez Otero; Alba Mora Garrido; Asier Expósito Hurtado; David Zapata Fuentes; Joel Cabello Díaz; Olga Nadal Flores

(La semilla 2 es un buen caso: por semilla salen 1, 1, 3, 1 y 5 de 24 que suenan extranjeros frente a 1, 5, 5, 2 y 3 de antes; media 2,2 frente a 3,2 de 24. Las muestras completas de las 5 semillas, con origen y padres, están en el anexo.)

**Semillas, huella y rendimiento** (la ciudad grande cambia de gente; España y la ciudad de prueba, no):
- `npm run huella -- 60` y `npm run rendimiento -- 60` **salen idénticos antes y después**: los dos usan España (y la ciudad de prueba), que no llevan los datos nuevos. Los otros caminos (ciudad grande) cambian de gente, como se esperaba: los mismos números de semilla dan otros compañeros, nombres y orígenes. Rendimiento antes/después: crear la partida 744 / 730 ms; estado 2968 / 2968 KB; bot equilibrado 1,49 / 1,58 ms por acción (ruido de la máquina); mismas 1418 personas.
- `npm run benjamin -- 31,33`: igual que antes (semilla 31 con plaza y primer partido en la semana 4; semilla 33 sin plaza).
- `npm run typecheck` en verde; `npm test`: 99 archivos y 1158 tests en verde.
- `npm run probar-web`: **verde** (23 comprobaciones, sin errores de consola), tras un arreglo del script. Con la gente nueva de la semilla 35 (ciudad grande), al avanzar semanas de golpe salió un suceso aleatorio de la vida («Se hace tarde») cuyo cuadro tapaba la pestaña del deporte y el clic agotaba el tiempo; con la rama base pasaba. No era un fallo del juego sino del script, que no contemplaba sucesos ajenos: ahora cierra los sucesos pendientes (la primera opción, o «visto») antes de pulsar la pestaña (`tools/probar-web.ts`). No se ha relajado ninguna comprobación.

## Anexo: muestras (24 compañeros de clase por semilla; `npm run nombres-nacionales`)

✱ = el nombre de pila o el primer apellido suena de fuera (a primera vista); · = solo el segundo apellido.

### A.1 Muestras de hoy (nombres reales del juego, ciudad grande de antes)

#### Hoy: compañeros de clase del personaje (24), con origen y padres

**Semilla 1** — personaje: **Raúl Iglesias Higueras** (España-norte; padres: España (norte) + España (norte)). 1 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 1; · solo el segundo apellido).

| # | Compañero | Origen | Padres (deducidos) | |
|--:|---|---|---|---|
| 1 | Ángel Suárez Corral | España-sur | España-sur y España-sur |  |
| 2 | Ariadna Esteban Marino | España-centro | España-centro y España-centro |  |
| 3 | Valeria Martín Cortés | España-sur | España-sur y España-sur |  |
| 4 | Martín Campos Ramos | España-norte + España-centro | España-norte y España-centro |  |
| 5 | Arnau Guerrero Álvarez | España-centro + España-sur | España-centro y España-sur |  |
| 6 | Urko Martínez Cortés | España-centro | España-centro y España-centro |  |
| 7 | Imanol Maldonado Romero | España-sur + España-norte | España-sur y España-norte |  |
| 8 | Ángel Trujillo Alonso | España-sur + España-centro | España-sur y España-centro |  |
| 9 | Pau Pacheco Sánchez | España-sur | España-sur y España-sur |  |
| 10 | Fatoumata Cissé | Magreb + África subsahariana | Magreb y África subsahariana | ✱ |
| 11 | Enzo Morales Gil | España-centro + España-sur | España-centro y España-sur |  |
| 12 | Fernando Campos Teruel | España-norte + España-sur | España-norte y España-sur |  |
| 13 | Cecilia Cabello Abad | España-norte + España-sur | España-norte y España-sur |  |
| 14 | Valeria Fernandes Martínez | España-sur + España-centro | España-sur y España-centro |  |
| 15 | Guadalupe Aguilar Galán | España-sur + España-centro | España-sur y España-centro |  |
| 16 | Ángel Navarro Reyes | España-centro + España-sur | España-centro y España-sur |  |
| 17 | Vanesa García Carrillo | España-sur | España-sur y España-sur |  |
| 18 | Santino Quiroga Garrido | Latinoamérica + España-sur | Latinoamérica y España-sur |  |
| 19 | Rodrigo Cano Aguilar | España-norte + España-centro | España-norte y España-centro |  |
| 20 | Domingo Andrés Fuentes | España-sur | España-sur y España-sur |  |
| 21 | Yago Vidal Fernández | España-centro + España-sur | España-centro y España-sur |  |
| 22 | Daniel Bernal Alonso | España-sur + España-norte | España-sur y España-norte |  |
| 23 | Lorenzo Rivas Castillo | España-norte | España-norte y España-norte |  |
| 24 | Lola Pons Ponce | España-sur + España-centro | España-sur y España-centro |  |

**Semilla 2** — personaje: **Dani Fuentes Gil** (España-norte + España-sur; padres: España (norte) + España (sur)). 5 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 5; · solo el segundo apellido).

| # | Compañero | Origen | Padres (deducidos) | |
|--:|---|---|---|---|
| 1 | Manuel Santos Carrasco | España-norte | España-norte y España-norte |  |
| 2 | Marina Oliva Morales | España-centro | España-centro y España-centro |  |
| 3 | Enzo Iglesias Ibáñez | España-centro + España-norte | España-centro y España-norte |  |
| 4 | Domingo Martínez Fuentes | España-centro | España-centro y España-centro |  |
| 5 | Luka Nikolov | Europa del este | Europa del este y Europa del este | ✱ |
| 6 | María José Salazar Camacho | España-sur + España-norte | España-sur y España-norte |  |
| 7 | Sara León Arias | España-sur | España-sur y España-sur |  |
| 8 | Cayetana Cordero Román | España-centro | España-centro y España-centro |  |
| 9 | Marc Urbano Rojas | España-centro | España-centro y España-centro |  |
| 10 | Marina Varela Galindo | España-centro | España-centro y España-centro |  |
| 11 | Gloria Martín Vázquez | España-sur + España-centro | España-sur y España-centro |  |
| 12 | Pierre Meyer | Europa del norte | Europa del norte y Europa del norte | ✱ |
| 13 | Esteban Vidal Sáez | España-centro + España-sur | España-centro y España-sur |  |
| 14 | Diego Fernandes Redondo | España-centro + España-sur | España-centro y España-sur |  |
| 15 | Jessica Alonso Hernández | España-centro | España-centro y España-centro |  |
| 16 | Sergey Novikov | Europa del este | Europa del este y Europa del este | ✱ |
| 17 | Jorge Gómez Ballesteros | España-centro + España-sur | España-centro y España-sur |  |
| 18 | Daniel Carmona González | España-norte + España-sur | España-norte y España-sur |  |
| 19 | Saúl Rodríguez Santana | España-centro + España-sur | España-centro y España-sur |  |
| 20 | Assia Oulad Hernández | España-sur + Magreb | España-sur y Magreb | ✱ |
| 21 | Mireia Escudero Elizalde | España-sur + España-centro | España-sur y España-centro |  |
| 22 | Benito Jiménez Santiago | España-sur + España-centro | España-sur y España-centro |  |
| 23 | Joseph Obiang | África subsahariana | África subsahariana y África subsahariana | ✱ |
| 24 | Isabel Torres Delgado | España-norte | España-norte y España-norte |  |

**Semilla 3** — personaje: **Rodrigo Climent Villar** (España-sur + España-norte; padres: España (sur) + España (norte)). 5 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 4; · solo el segundo apellido).

| # | Compañero | Origen | Padres (deducidos) | |
|--:|---|---|---|---|
| 1 | Asier Herrero Pastor | España-centro | España-centro y España-centro |  |
| 2 | Pol Sosa Ruiz | España-sur | España-sur y España-sur |  |
| 3 | Amaia Sanz Pastor | España-sur + España-centro | España-sur y España-centro |  |
| 4 | Candela Reyes Guerrero | España-norte + España-centro | España-norte y España-centro |  |
| 5 | Lucía Prieto Gutiérrez | España-sur | España-sur y España-sur |  |
| 6 | Íñigo Albert Vázquez | España-sur | España-sur y España-sur |  |
| 7 | Valentín Pérez Medina | Latinoamérica | Latinoamérica y Latinoamérica |  |
| 8 | Yun Chen Vicente | España-centro + Asia oriental | España-centro y Asia oriental | ✱ |
| 9 | Begoña Díaz Villar | España-centro + España-norte | España-centro y España-norte |  |
| 10 | Mateo Robles Martín | España-norte + España-centro | España-norte y España-centro |  |
| 11 | Patricia Casas Landa | España-sur + España-centro | España-sur y España-centro |  |
| 12 | Francisca Lozano Tazi | Magreb + España-centro | Magreb y España-centro | · |
| 13 | Martina Fernández Redondo | España-sur | España-sur y España-sur |  |
| 14 | José Mora Alonso | España-sur + España-centro | España-sur y España-centro |  |
| 15 | Sofía Jiménez Carmona | España-sur + España-centro | España-sur y España-centro |  |
| 16 | José Gutiérrez Guzmán | España-sur + España-norte | España-sur y España-norte |  |
| 17 | Lucas Flores Salas | España-norte | España-norte y España-norte |  |
| 18 | Hicham Amrani | Asia oriental + Magreb | Asia oriental y Magreb | ✱ |
| 19 | Domingo Urbano Carmona | España-centro | España-centro y España-centro |  |
| 20 | Daniela Gutiérrez Herrero | España-sur + España-centro | España-sur y España-centro |  |
| 21 | Rayan Benali | Magreb | Magreb y Magreb | ✱ |
| 22 | Francisca Cruz Santiago | España-norte + España-centro | España-norte y España-centro |  |
| 23 | Younes Hamdaoui Carrasco | España-sur + Magreb | España-sur y Magreb | ✱ |
| 24 | Adrián Rodríguez Redondo | España-centro + España-sur | España-centro y España-sur |  |

**Semilla 4** — personaje: **Axel Paz Correa** (España-sur + Latinoamérica; padres: España (sur) + Latinoamérica). 2 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 1; · solo el segundo apellido).

| # | Compañero | Origen | Padres (deducidos) | |
|--:|---|---|---|---|
| 1 | Teo Marino Reyes | España-sur | España-sur y España-sur |  |
| 2 | Eric Vera Vidal | España-centro | España-centro y España-centro |  |
| 3 | Jan Volkov González | España-centro + Europa del este | España-centro y Europa del este | ✱ |
| 4 | Joel Cano Camacho | España-sur + España-centro | España-sur y España-centro |  |
| 5 | Sonia Díaz Gómez | España-sur | España-sur y España-sur |  |
| 6 | Daniel Gómez Flores | España-centro + España-norte | España-centro y España-norte |  |
| 7 | Jan García Benítez | España-centro + España-sur | España-centro y España-sur |  |
| 8 | Cristina Abad Muñoz | España-norte | España-norte y España-norte |  |
| 9 | Noa Herrero Santiago | España-sur + España-norte | España-sur y España-norte |  |
| 10 | Loreto Pérez Osorio | España-sur + España-centro | España-sur y España-centro |  |
| 11 | Margarita Pérez Orozco | España-norte + España-sur + España-centro | España-norte y España-sur y España-centro |  |
| 12 | Olga Toledo Gallardo | España-norte | España-norte y España-norte |  |
| 13 | Urko Cisneros Benmoussa | Magreb + Europa del norte + España-sur | Magreb y Europa del norte y España-sur | · |
| 14 | Álvaro Rey Abad | España-norte + España-centro | España-norte y España-centro |  |
| 15 | Francisco López Esteban | España-centro | España-centro y España-centro |  |
| 16 | Lola Fernández Sosa | España-centro + España-sur | España-centro y España-sur |  |
| 17 | Daniela Olmo Alonso | España-norte | España-norte y España-norte |  |
| 18 | Alejandro González Ibáñez | Latinoamérica | Latinoamérica y Latinoamérica |  |
| 19 | Patricia Núñez Sánchez | España-centro + Latinoamérica | España-centro y Latinoamérica |  |
| 20 | Gerardo Arias Ruiz | España-centro + España-norte | España-centro y España-norte |  |
| 21 | Diego Miranda López | España-norte + España-centro | España-norte y España-centro |  |
| 22 | Emilio Alonso Núñez | España-centro + España-sur | España-centro y España-sur |  |
| 23 | Noah Mur Calderón | España-norte + España-sur | España-norte y España-sur |  |
| 24 | Aitor Blanco López | España-sur | España-sur y España-sur |  |

**Semilla 5** — personaje: **Marcos Giménez Cordero** (España-centro + España-sur; padres: España (centro) + España (sur)). 3 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 2; · solo el segundo apellido).

| # | Compañero | Origen | Padres (deducidos) | |
|--:|---|---|---|---|
| 1 | África Gil Giménez | España-sur | España-sur y España-sur |  |
| 2 | Susana Domínguez Sanz | España-sur | España-sur y España-sur |  |
| 3 | María Isabel Hernández Ibáñez | España-centro + España-sur | España-centro y España-sur |  |
| 4 | Aitor Parra Otero | España-sur + España-centro | España-sur y España-centro |  |
| 5 | Dolores Moya Moreno | España-norte + España-sur + España-centro | España-norte y España-sur y España-centro |  |
| 6 | Leyre Sierra Torres | España-norte + España-sur | España-norte y España-sur |  |
| 7 | Víctor Méndez Ramos | España-norte + España-sur | España-norte y España-sur |  |
| 8 | Aya Herrera Caballero | España-norte + España-centro | España-norte y España-centro |  |
| 9 | Manuel Carrasco Mora | España-norte + España-centro | España-norte y España-centro |  |
| 10 | José Ramos Morales | España-sur + España-centro | España-sur y España-centro |  |
| 11 | Vega Álvarez Vega | España-sur + España-norte | España-sur y España-norte |  |
| 12 | José Antonio Serrano Cuevas | España-norte + España-sur | España-norte y España-sur |  |
| 13 | Maite Fernández Expósito | España-centro + España-norte | España-centro y España-norte |  |
| 14 | Ángela Cabello Díez | España-centro | España-centro y España-centro |  |
| 15 | Bernat Lara Alonso | España-centro + España-sur | España-centro y España-sur |  |
| 16 | Daniel Santiago Luna | España-sur + España-centro | España-sur y España-centro |  |
| 17 | Jamal Alaoui | Europa del este + Magreb | Europa del este y Magreb | ✱ |
| 18 | Inés González Hidalgo | España-sur + España-norte | España-sur y España-norte |  |
| 19 | Sagrario Moreno Pérez | España-centro + España-sur | España-centro y España-sur |  |
| 20 | Florencia Palacios Dąbrowska | Latinoamérica + Europa del este | Latinoamérica y Europa del este | · |
| 21 | Rubén Castillo Vázquez | España-norte + España-centro | España-norte y España-centro |  |
| 22 | Nawal Berrada | Magreb | Magreb y Magreb | ✱ |
| 23 | Yaiza Montes Marino | España-sur + España-centro + España-norte | España-sur y España-centro y España-norte |  |
| 24 | Irene Salazar Fernández | España-norte | España-norte y España-norte |  |

Suenan extranjeros por semilla: 1, 5, 5, 2, 3 (media 3.2 de 24).

### A.2 Muestras de ahora (nombres reales del juego, ciudad grande con (a) + (b) al 20 %)

#### Ahora: compañeros de clase del personaje (24), con origen y padres

**Semilla 1** — personaje: **Raúl Iglesias Higueras** (España-norte; padres: España (norte) + España (norte)). 1 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 1; · solo el segundo apellido).

| # | Compañero | Origen | Padres (deducidos) | |
|--:|---|---|---|---|
| 1 | Ángel Suárez Corral | España-sur | España-sur y España-sur |  |
| 2 | Ariadna Esteban Marino | España-centro | España-centro y España-centro |  |
| 3 | Valeria Martín Cortés | España-sur | España-sur y España-sur |  |
| 4 | Martín Campos Ramos | España-norte + España-centro | España-norte y España-centro |  |
| 5 | Arnau Guerrero Álvarez | España-centro + España-sur | España-centro y España-sur |  |
| 6 | Urko Martínez Cortés | España-centro | España-centro y España-centro |  |
| 7 | Imanol Maldonado Romero | España-sur + España-norte | España-sur y España-norte |  |
| 8 | Ángel Trujillo Alonso | España-sur + España-centro | España-sur y España-centro |  |
| 9 | Pau Pacheco Sánchez | España-sur | España-sur y España-sur |  |
| 10 | Hiba Haddad Juárez | Latinoamérica + Magreb | Latinoamérica y Magreb | ✱ |
| 11 | Enzo Morales Gil | España-centro + España-sur | España-centro y España-sur |  |
| 12 | Fernando Campos Teruel | España-norte + España-sur | España-norte y España-sur |  |
| 13 | Cecilia Cabello Abad | España-norte + España-sur | España-norte y España-sur |  |
| 14 | Valeria Fernandes Martínez | España-sur + España-centro | España-sur y España-centro |  |
| 15 | Guadalupe Aguilar Galán | España-sur + España-centro | España-sur y España-centro |  |
| 16 | Ángel Navarro Reyes | España-centro + España-sur | España-centro y España-sur |  |
| 17 | Vanesa García Carrillo | España-sur | España-sur y España-sur |  |
| 18 | Santino Quiroga Garrido | Latinoamérica + España-sur | Latinoamérica y España-sur |  |
| 19 | Rodrigo Cano Aguilar | España-norte + España-centro | España-norte y España-centro |  |
| 20 | Domingo Andrés Fuentes | España-sur | España-sur y España-sur |  |
| 21 | Yago Vidal Fernández | España-centro + España-sur | España-centro y España-sur |  |
| 22 | Daniel Bernal Alonso | España-sur + España-norte | España-sur y España-norte |  |
| 23 | Lorenzo Rivas Castillo | España-norte | España-norte y España-norte |  |
| 24 | Lola Pons Ponce | España-sur + España-centro | España-sur y España-centro |  |

**Semilla 2** — personaje: **Dani Fuentes Gil** (España-norte + España-sur; padres: España (norte) + España (sur)). 1 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 1; · solo el segundo apellido).

| # | Compañero | Origen | Padres (deducidos) | |
|--:|---|---|---|---|
| 1 | Manuel Santos Carrasco | España-norte | España-norte y España-norte |  |
| 2 | Marina Oliva Morales | España-centro | España-centro y España-centro |  |
| 3 | Enzo Iglesias Ibáñez | España-centro + España-norte | España-centro y España-norte |  |
| 4 | Domingo Martínez Fuentes | España-centro | España-centro y España-centro |  |
| 5 | Franciszek Szymański | Europa del este | Europa del este y Europa del este | ✱ |
| 6 | Jan Castro Expósito | España-norte + España-centro | España-norte y España-centro |  |
| 7 | Ángela Arias Palacios | España-norte + España-centro | España-norte y España-centro |  |
| 8 | Diego Lago Tapia | España-sur + España-centro | España-sur y España-centro |  |
| 9 | Blanca Hurtado Carmona | España-centro + España-sur | España-centro y España-sur |  |
| 10 | Manuel Suárez Ferrer | España-norte + España-sur | España-norte y España-sur |  |
| 11 | Yolanda Rodríguez Luna | España-norte + España-centro | España-norte y España-centro |  |
| 12 | Valeria García Pizarro | España-sur + España-norte | España-sur y España-norte |  |
| 13 | Teresa Robles Fontán | España-centro + España-sur + España-norte | España-centro y España-sur y España-norte |  |
| 14 | Alba Castillo Montero | España-sur | España-sur y España-sur |  |
| 15 | Lidia Rodríguez Otero | España-sur + España-centro | España-sur y España-centro |  |
| 16 | Alba Mora Garrido | España-centro + España-sur | España-centro y España-sur |  |
| 17 | Asier Expósito Hurtado | España-centro + España-sur | España-centro y España-sur |  |
| 18 | David Zapata Fuentes | España-sur | España-sur y España-sur |  |
| 19 | Joel Cabello Díaz | Latinoamérica + España-sur | Latinoamérica y España-sur |  |
| 20 | Olga Nadal Flores | España-sur | España-sur y España-sur |  |
| 21 | Martín García Núñez | España-sur + España-norte | España-sur y España-norte |  |
| 22 | Sebastián Pérez Vázquez | España-norte + España-centro | España-norte y España-centro |  |
| 23 | Jimena Aguilar Soto | España-sur | España-sur y España-sur |  |
| 24 | Julia Godoy Lucero | Latinoamérica | Latinoamérica y Latinoamérica |  |

**Semilla 3** — personaje: **Rodrigo Climent Villar** (España-sur + España-norte; padres: España (sur) + España (norte)). 3 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 1; · solo el segundo apellido).

| # | Compañero | Origen | Padres (deducidos) | |
|--:|---|---|---|---|
| 1 | Asier Herrero Pastor | España-centro | España-centro y España-centro |  |
| 2 | Pol Sosa Ruiz | España-sur | España-sur y España-sur |  |
| 3 | Amaia Sanz Pastor | España-sur + España-centro | España-sur y España-centro |  |
| 4 | Candela Reyes Guerrero | España-norte + España-centro | España-norte y España-centro |  |
| 5 | Lucía Prieto Gutiérrez | España-sur | España-sur y España-sur |  |
| 6 | Íñigo Albert Vázquez | España-sur | España-sur y España-sur |  |
| 7 | Joaquín Medina Silva | Latinoamérica | Latinoamérica y Latinoamérica |  |
| 8 | Ainhoa Gómez Domingo | España-sur + España-norte | España-sur y España-norte |  |
| 9 | Gabriela Flores Gonzalvo | España-norte + España-sur | España-norte y España-sur |  |
| 10 | Alba Guzmán Hoffmann | Latinoamérica + Europa del norte | Latinoamérica y Europa del norte | · |
| 11 | Patricia Casas Landa | España-sur + España-centro | España-sur y España-centro |  |
| 12 | Francisca Lozano Ledesma | Latinoamérica + España-centro | Latinoamérica y España-centro |  |
| 13 | Martina Fernández Redondo | España-sur | España-sur y España-sur |  |
| 14 | José Mora Alonso | España-sur + España-centro | España-sur y España-centro |  |
| 15 | Sofía Jiménez Carmona | España-sur + España-centro | España-sur y España-centro |  |
| 16 | José Gutiérrez Guzmán | España-sur + España-norte | España-sur y España-norte |  |
| 17 | Lucas Flores Salas | España-norte | España-norte y España-norte |  |
| 18 | Nicolás López Li | Asia oriental + Latinoamérica | Asia oriental y Latinoamérica | · |
| 19 | Idoia Bermúdez Núñez | España-centro + España-sur | España-centro y España-sur |  |
| 20 | Ona Yáñez Fernández | España-norte + España-centro + España-sur | España-norte y España-centro y España-sur |  |
| 21 | Rodrigo García Ferrer | España-sur + España-norte | España-sur y España-norte |  |
| 22 | Chloe Arias Iglesias | España-sur + España-centro | España-sur y España-centro |  |
| 23 | Juan Cao | Asia oriental | Asia oriental y Asia oriental | ✱ |
| 24 | Marc Uribe Corral | España-centro + España-sur + España-norte | España-centro y España-sur y España-norte |  |

**Semilla 4** — personaje: **Axel Paz Correa** (España-sur + Latinoamérica; padres: España (sur) + Latinoamérica). 1 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 1; · solo el segundo apellido).

| # | Compañero | Origen | Padres (deducidos) | |
|--:|---|---|---|---|
| 1 | Yolanda Marino Reyes | España-sur | España-sur y España-sur |  |
| 2 | Eric Vera Vidal | España-centro | España-centro y España-centro |  |
| 3 | Jan Volkov González | España-centro + Europa del este | España-centro y Europa del este | ✱ |
| 4 | Joel Cano Camacho | España-sur + España-centro | España-sur y España-centro |  |
| 5 | Sonia Díaz Gómez | España-sur | España-sur y España-sur |  |
| 6 | Daniel Gómez Flores | España-centro + España-norte | España-centro y España-norte |  |
| 7 | Jan García Benítez | España-centro + España-sur | España-centro y España-sur |  |
| 8 | Cristina Abad Muñoz | España-norte | España-norte y España-norte |  |
| 9 | Noa Herrero Santiago | España-sur + España-norte | España-sur y España-norte |  |
| 10 | Loreto Pérez Osorio | España-sur + España-centro | España-sur y España-centro |  |
| 11 | Margarita Pérez Orozco | España-norte + España-sur + España-centro | España-norte y España-sur y España-centro |  |
| 12 | Olga Toledo Gallardo | España-norte | España-norte y España-norte |  |
| 13 | Urko Cisneros Luna | Latinoamérica + Europa del norte + España-sur | Latinoamérica y Europa del norte y España-sur |  |
| 14 | Álvaro Rey Abad | España-norte + España-centro | España-norte y España-centro |  |
| 15 | Francisco López Esteban | España-centro | España-centro y España-centro |  |
| 16 | Lola Fernández Sosa | España-centro + España-sur | España-centro y España-sur |  |
| 17 | Daniela Olmo Alonso | España-norte | España-norte y España-norte |  |
| 18 | Santiago González Ibáñez | Latinoamérica | Latinoamérica y Latinoamérica |  |
| 19 | Patricia Núñez Sánchez | España-centro + Latinoamérica | España-centro y Latinoamérica |  |
| 20 | Gerardo Arias Ruiz | España-centro + España-norte | España-centro y España-norte |  |
| 21 | Diego Miranda López | España-norte + España-centro | España-norte y España-centro |  |
| 22 | Emilio Alonso Núñez | España-centro + España-sur | España-centro y España-sur |  |
| 23 | Noah Mur Calderón | España-norte + España-sur | España-norte y España-sur |  |
| 24 | Aitor Blanco López | España-sur | España-sur y España-sur |  |

**Semilla 5** — personaje: **Marcos Giménez Cordero** (España-centro + España-sur; padres: España (centro) + España (sur)). 5 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 2; · solo el segundo apellido).

| # | Compañero | Origen | Padres (deducidos) | |
|--:|---|---|---|---|
| 1 | Raúl Wójcik | Europa del este | Europa del este y Europa del este | ✱ |
| 2 | Susana Domínguez Sanz | España-norte | España-norte y España-norte |  |
| 3 | María Isabel Hernández Ibáñez | España-centro + España-sur | España-centro y España-sur |  |
| 4 | Aitor Parra Otero | España-sur + España-centro | España-sur y España-centro |  |
| 5 | Dolores Moya Moreno | España-norte + España-sur + España-centro | España-norte y España-sur y España-centro |  |
| 6 | Leyre Sierra Torres | España-norte + España-sur | España-norte y España-sur |  |
| 7 | Víctor Méndez Ramos | España-norte + España-sur | España-norte y España-sur |  |
| 8 | Aya Herrera Caballero | España-norte + España-centro | España-norte y España-centro |  |
| 9 | Manuel Carrasco Mora | España-norte + España-centro | España-norte y España-centro |  |
| 10 | José Ramos Morales | España-sur + España-centro | España-sur y España-centro |  |
| 11 | Vega Álvarez Vega | España-sur + España-norte | España-sur y España-norte |  |
| 12 | José Antonio Serrano Cuevas | España-norte + España-sur | España-norte y España-sur |  |
| 13 | Maite Fernández Expósito | España-centro + España-norte | España-centro y España-norte |  |
| 14 | Ángela Cabello Díez | España-centro | España-centro y España-centro |  |
| 15 | Bernat Lara Alonso | España-centro + España-sur | España-centro y España-sur |  |
| 16 | Daniel Santiago Luna | España-sur + España-centro | España-sur y España-centro |  |
| 17 | Daniel Martínez Stan | Europa del este + Latinoamérica | Europa del este y Latinoamérica | · |
| 18 | Alejandro González Rubio | España-sur + España-centro | España-sur y España-centro |  |
| 19 | Gerardo Moreno Pérez | España-sur + España-centro | España-sur y España-centro |  |
| 20 | Florencia Palacios Koch | Latinoamérica + Europa del norte | Latinoamérica y Europa del norte | · |
| 21 | Rubén Castillo Vázquez | España-norte + España-centro | España-norte y España-centro |  |
| 22 | Nancy García Godoy | Latinoamérica | Latinoamérica y Latinoamérica |  |
| 23 | Malena Fernández Walker | Latinoamérica + Europa del norte | Latinoamérica y Europa del norte | · |
| 24 | Yaiza Wilson | Europa del norte | Europa del norte y Europa del norte | ✱ |

Suenan extranjeros por semilla: 1, 1, 3, 1, 5 (media 2.2 de 24).

