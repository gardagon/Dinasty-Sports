# Nombres más «nacionales»: propuesta con muestras

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
| a+b+c+d | 13.4 % | 2.7 | 9.1 % | **1.8** | 4.1 % | 9.3 % | 0.0 % | 13.8 % | 1 % | 60 % |

¹ Clases de 24 compañeros (como las del juego). «A primera vista» = nombre de pila o primer apellido de cultura no hispana (lo que se lee en una lista de clase). «Suenan extranjeros» = nombre o algún apellido de cultura no hispana; «solo el apellido» = nombre español/latino con apellido de fuera (Lucas Amrani).

Referencia: hoy 3.6 de cada 20. «Origen no hispano» = el niño tiene algún origen que no es de España ni de Latinoamérica (el suelo que no se baja sin tocar la demografía).
En las mixtas de un origen de aquí con uno de fuera, el apellido español va primero: Hoy 49 % · a 51 % · b 65 % · c 70 % · d 49 % · a+b 65 % · b+c 70 % · a+b+c 70 % · a+b+c+d 70 %.

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


## 5. Qué habría que tocar si se aprueba (no está hecho)

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

## Anexo: muestras (24 compañeros de clase por semilla; `npm run nombres-nacionales`)

✱ = el nombre de pila o el primer apellido suena de fuera (a primera vista); · = solo el segundo apellido.

### A.1 Muestras de hoy (nombres reales del juego)

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

### A.2 Muestras de las opciones (mismos compañeros, con las reglas de cada opción)

#### Opción a

**Semilla 1** — personaje: **Raúl Iglesias Higueras** (España-norte; padres: España (norte) + España (norte)). 1 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 1; · solo el segundo apellido).

| # | Compañero | Origen | |
|--:|---|---|---|
| 1 | Ramón López Salazar | España-sur |  |
| 2 | Claudia Rivas Rodríguez | España-centro |  |
| 3 | Nuria Moya Castillo | España-sur |  |
| 4 | Vicente Gimeno Flores | España-norte + España-centro |  |
| 5 | Benito Ramírez Blanco | España-centro + España-sur |  |
| 6 | Álex Carrillo Esteban | España-centro |  |
| 7 | Óscar Pizarro Martín | España-sur + España-norte |  |
| 8 | Lucas Segura Carmona | España-sur + España-centro |  |
| 9 | Adam Carrasco Domínguez | España-sur |  |
| 10 | Amina Ziani Franco | Latinoamérica + Magreb | ✱ |
| 11 | José Manuel Ortega Reyes | España-centro + España-sur |  |
| 12 | Izan León Cárdenas | España-norte + España-sur |  |
| 13 | Dolores Cortés Gómez | España-norte + España-sur |  |
| 14 | Emma Peña Ibáñez | España-sur + España-centro |  |
| 15 | Adriana Delgado Carrillo | España-sur + España-centro |  |
| 16 | Joel Torres Calderón | España-centro + España-sur |  |
| 17 | Iria Fernandes Vázquez | España-sur |  |
| 18 | Santiago Pérez Toledo | Latinoamérica + España-sur |  |
| 19 | Pablo Pardo Hernández | España-norte + España-centro |  |
| 20 | Luis Beltrán Jiménez | España-sur |  |
| 21 | Agustín Guerrero Osorio | España-centro + España-sur |  |
| 22 | Álex Jara Tapia | España-sur + España-norte |  |
| 23 | Omar Pérez Martín | España-norte |  |
| 24 | Ona Rodríguez Contreras | España-sur + España-centro |  |

**Semilla 2** — personaje: **Dani Fuentes Gil** (España-norte + España-sur; padres: España (norte) + España (sur)). 3 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 3; · solo el segundo apellido).

| # | Compañero | Origen | |
|--:|---|---|---|
| 1 | Santiago Serrano Toledo | España-norte |  |
| 2 | Carolina Rubio López | España-centro |  |
| 3 | Álex Casado Ibáñez | España-centro + España-norte |  |
| 4 | Pablo García Reyes | España-centro |  |
| 5 | Mikołaj Zając | Europa del este | ✱ |
| 6 | Gala Barrios Álvarez | España-sur + España-norte |  |
| 7 | Marta Domingo Ortega | España-sur |  |
| 8 | Martina Jiménez Méndez | España-centro |  |
| 9 | Lorenzo García Castro | España-centro |  |
| 10 | Rebeca Torres Vera | España-centro |  |
| 11 | Triana Vázquez Álvarez | España-sur + España-centro |  |
| 12 | Elias Wolf | Europa del norte | ✱ |
| 13 | Ramón Moreno Aguilar | España-centro + España-sur |  |
| 14 | Alfredo Villar Montes | España-centro + España-sur |  |
| 15 | Elena Sánchez Serrano | España-centro |  |
| 16 | Marcin Krawczyk | Europa del este | ✱ |
| 17 | Josep González Flores | España-centro + España-sur |  |
| 18 | Lucas Ballesteros Muñoz | España-norte + España-sur |  |
| 19 | Manuel Tapia Heredia | España-centro + España-sur |  |
| 20 | Emma Figueroa Gómez | España-sur + Latinoamérica |  |
| 21 | Agustín Higueras Calvo | España-centro + España-sur |  |
| 22 | Oliver Calvo Méndez | España-sur + España-centro |  |
| 23 | Víctor Carrillo Ramos | España-centro + España-sur |  |
| 24 | Belén Maldonado Vallejo | España-norte |  |

**Semilla 3** — personaje: **Rodrigo Climent Villar** (España-sur + España-norte; padres: España (sur) + España (norte)). 3 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 3; · solo el segundo apellido).

| # | Compañero | Origen | |
|--:|---|---|---|
| 1 | Leo Alonso Silva | España-centro |  |
| 2 | Eric Parra Salazar | España-sur |  |
| 3 | Lola Alonso Iglesias | España-sur + España-centro |  |
| 4 | Marta Noguera Climent | España-norte + España-centro |  |
| 5 | Olga Vallejo Nadal | España-sur |  |
| 6 | Hugo Bermúdez Hernández | España-sur |  |
| 7 | Felipe Godoy Martínez | Latinoamérica |  |
| 8 | Yuxin Li Cordero | España-centro + Asia oriental | ✱ |
| 9 | Inés Navarro Nogueira | España-centro + España-norte |  |
| 10 | Joel Zamora Cuesta | España-norte + España-centro |  |
| 11 | Tamara Guzmán Galindo | España-sur + España-centro |  |
| 12 | Renata Velázquez Sánchez | Latinoamérica + España-centro |  |
| 13 | Sofía Esteban Márquez | España-sur |  |
| 14 | Jesús Bautista Cabello | España-sur + España-centro |  |
| 15 | Eugenia Casado Rubio | España-sur + España-centro |  |
| 16 | Saúl Soto Delgado | España-sur + España-norte |  |
| 17 | Jordi Abad Montero | España-norte |  |
| 18 | Ruize Tang Ramírez | Asia oriental + Latinoamérica | ✱ |
| 19 | Jimena Paz Márquez | España-centro + España-sur |  |
| 20 | Andrea Marino Calvo | España-norte + España-centro + España-sur |  |
| 21 | Álvaro Beltrán Castro | España-sur + España-norte |  |
| 22 | Ana Ferrer Cabrera | España-sur + España-centro |  |
| 23 | Lin Liu | Asia oriental | ✱ |
| 24 | Carmen Guzmán Hernández | España-centro + España-norte |  |

**Semilla 4** — personaje: **Axel Paz Correa** (España-sur + Latinoamérica; padres: España (sur) + Latinoamérica). 2 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 1; · solo el segundo apellido).

| # | Compañero | Origen | |
|--:|---|---|---|
| 1 | Aitana Vidal Aguilar | España-sur |  |
| 2 | Daniel Vargas Bautista | España-centro |  |
| 3 | Serhiy Novikov Aguilar | España-centro + Europa del este | ✱ |
| 4 | Gael Ferreira Pérez | España-sur + España-centro |  |
| 5 | Alejandra Domínguez Pérez | España-sur |  |
| 6 | Agustín León Rivas | España-centro + España-norte |  |
| 7 | Francisco Cortés Bermúdez | España-centro + España-sur |  |
| 8 | Ana Toledo Arroyo | España-norte |  |
| 9 | María Pilar Cuesta Quesada | España-sur + España-norte |  |
| 10 | Encarnación Jiménez Lozano | España-sur + España-centro |  |
| 11 | Diana Lorenzo Gómez | España-norte + España-sur + España-centro |  |
| 12 | Marga Castro Moreno | España-norte |  |
| 13 | José Luis Villalba Harris | Latinoamérica + Europa del norte + España-sur | · |
| 14 | Jorge León Román | España-norte + España-centro |  |
| 15 | Juan Silva Hidalgo | España-centro |  |
| 16 | Valeria Calderón Muñoz | España-centro + España-sur |  |
| 17 | Patricia Iglesias Escudero | España-norte |  |
| 18 | Luis Martínez Suárez | Latinoamérica |  |
| 19 | Viviana Romero Sierra | España-centro + Latinoamérica |  |
| 20 | Imanol Crespo Galindo | España-centro + España-norte |  |
| 21 | Jordi Guerrero Gómez | España-norte + España-centro |  |
| 22 | Esteban Bautista Vicente | España-centro + España-sur |  |
| 23 | Samuel Fuentes Romero | España-norte + España-sur |  |
| 24 | Izan Morales Merino | España-sur |  |

**Semilla 5** — personaje: **Marcos Giménez Cordero** (España-centro + España-sur; padres: España (centro) + España (sur)). 3 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 3; · solo el segundo apellido).

| # | Compañero | Origen | |
|--:|---|---|---|
| 1 | Anatoliy Kravchenko | Europa del este | ✱ |
| 2 | Leo Luna Andrés | España-centro |  |
| 3 | María Jesús Ortiz Montes | España-centro + España-sur |  |
| 4 | Marc Vidal Miranda | España-sur + España-centro |  |
| 5 | Carla Ruiz Mur | España-norte + España-sur + España-centro |  |
| 6 | Susana Mesa Ribera | España-norte + España-sur |  |
| 7 | Hugo Paz Salas | España-norte + España-sur |  |
| 8 | Chloe Bermúdez Serrano | España-norte + España-centro |  |
| 9 | Cristian Pons Hormigo | España-norte + España-centro |  |
| 10 | Marcos Ortiz Soto | España-sur + España-centro |  |
| 11 | Elena Zamora Beltrán | España-sur + España-norte |  |
| 12 | Gregorio Salas Rey | España-norte + España-sur |  |
| 13 | Sagrario Vázquez Herrera | España-centro + España-norte |  |
| 14 | Abril Muñoz Gutiérrez | España-centro |  |
| 15 | Bernat Calvo Castro | España-centro + España-sur |  |
| 16 | Enzo García Alonso | España-sur + España-centro |  |
| 17 | Krzysztof Pawlak Delgado | Europa del este + Latinoamérica | ✱ |
| 18 | Noah Teruel López | España-sur + España-centro |  |
| 19 | Francisco Carmona Romero | España-sur + España-centro |  |
| 20 | Julia Esposito Ponce | Latinoamérica + Europa del norte | ✱ |
| 21 | Sebastián Hormigo Guzmán | España-norte + España-centro |  |
| 22 | Verónica Sánchez Arias | Latinoamérica |  |
| 23 | Emma Bernal Caballero | España-sur + España-centro + España-norte |  |
| 24 | Julia González Heredia | España-norte |  |

Suenan extranjeros por semilla: 1, 3, 3, 2, 3 (media 2.4 de 24).

#### Opción b

**Semilla 1** — personaje: **Raúl Iglesias Higueras** (España-norte; padres: España (norte) + España (norte)). 1 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 1; · solo el segundo apellido).

| # | Compañero | Origen | |
|--:|---|---|---|
| 1 | Leo Luna Cisneros | España-sur |  |
| 2 | Maite Pérez Márquez | España-centro |  |
| 3 | Natalia Pascual Moreno | España-sur |  |
| 4 | Samuel Torres Cuesta | España-norte + España-centro |  |
| 5 | Manuel Hernández Ortiz | España-centro + España-sur |  |
| 6 | Agustín Casado Martínez | España-centro |  |
| 7 | Guillermo López Pascual | España-sur + España-norte |  |
| 8 | Telmo Santos Álvarez | España-sur + España-centro |  |
| 9 | Adrián Giménez Cabrera | España-sur |  |
| 10 | Yasmin Kadiri | Magreb + África subsahariana | ✱ |
| 11 | Marcos Uribe Luna | España-centro + España-sur |  |
| 12 | Urko Montero Maldonado | España-norte + España-sur |  |
| 13 | Claudia Heredia Hidalgo | España-norte + España-sur |  |
| 14 | Leyre Lozano Landa | España-sur + España-centro |  |
| 15 | Isabel Ortega Gracia | España-sur + España-centro |  |
| 16 | Joaquín Alonso Rodríguez | España-centro + España-sur |  |
| 17 | Irene Torres Rodríguez | España-sur |  |
| 18 | Domingo Santana Medina | Latinoamérica + España-sur |  |
| 19 | Gabriel Sánchez Izquierdo | España-norte + España-centro |  |
| 20 | Vicente Alonso Gil | España-sur |  |
| 21 | Diego Soler Castillo | España-centro + España-sur |  |
| 22 | Aarón Núñez Jara | España-sur + España-norte |  |
| 23 | Pablo Gómez Muñoz | España-norte |  |
| 24 | Leire Marcos Ramos | España-sur + España-centro |  |

**Semilla 2** — personaje: **Dani Fuentes Gil** (España-norte + España-sur; padres: España (norte) + España (sur)). 5 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 4; · solo el segundo apellido).

| # | Compañero | Origen | |
|--:|---|---|---|
| 1 | Joel Aguilar Flores | España-norte |  |
| 2 | Vega Martín Márquez | España-centro |  |
| 3 | Santiago Sáez Ponce | España-centro + España-norte |  |
| 4 | Teo Cano Fajardo | España-centro |  |
| 5 | Luis Nikolov | Europa del este | ✱ |
| 6 | Noa García Montero | España-sur + España-norte |  |
| 7 | Alma Zapata Vidal | España-sur |  |
| 8 | Cayetana Marín Peña | España-centro |  |
| 9 | Omar Ponce Peña | España-centro |  |
| 10 | Claudia Sánchez Benítez | España-centro |  |
| 11 | Laia Pascual Montes | España-sur + España-centro |  |
| 12 | Jules Schneider | Europa del norte | ✱ |
| 13 | Gabriel Garrido Parra | España-centro + España-sur |  |
| 14 | Saúl Herrero Flores | España-centro + España-sur |  |
| 15 | Laia Gil Morales | España-centro |  |
| 16 | Răzvan Diaconu | Europa del este | ✱ |
| 17 | Xavier Zamora Santos | España-centro + España-sur |  |
| 18 | Ricardo Figueroa Fernández | España-norte + España-sur |  |
| 19 | Daniel Urbano Blanco | España-centro + España-sur |  |
| 20 | Rut Gimeno Messaoudi | España-sur + Magreb | · |
| 21 | Blanca Vera Yáñez | España-sur + España-centro |  |
| 22 | Tomás Corral Mora | España-sur + España-centro |  |
| 23 | Gael Ebang | África subsahariana | ✱ |
| 24 | Martina Garrido Teruel | España-norte |  |

**Semilla 3** — personaje: **Rodrigo Climent Villar** (España-sur + España-norte; padres: España (sur) + España (norte)). 5 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 2; · solo el segundo apellido).

| # | Compañero | Origen | |
|--:|---|---|---|
| 1 | Ismael Morales Gimeno | España-centro |  |
| 2 | Enzo Vidal Santana | España-sur |  |
| 3 | Noa Pérez Delgado | España-sur + España-centro |  |
| 4 | Ruth Sierra Martín | España-norte + España-centro |  |
| 5 | Claudia Arroyo Nogueira | España-sur |  |
| 6 | Nicolás Rodríguez Vidal | España-sur |  |
| 7 | Juan Manuel Ibáñez Funes | Latinoamérica |  |
| 8 | Alma López Su | España-centro + Asia oriental | · |
| 9 | Emma Casas Durán | España-centro + España-norte |  |
| 10 | Julio Díaz Carmona | España-norte + España-centro |  |
| 11 | Noemí Miranda Arias | España-sur + España-centro |  |
| 12 | Montserrat Molina Bouzid | Magreb + España-centro | · |
| 13 | Cecilia Yáñez Gonzalvo | España-sur |  |
| 14 | Juan Antonio Martínez Mora | España-sur + España-centro |  |
| 15 | Inés Reyes Molina | España-sur + España-centro |  |
| 16 | Enzo Sanz Sierra | España-sur + España-norte |  |
| 17 | Moisés García Domínguez | España-norte |  |
| 18 | Jiahao Han | Asia oriental + Magreb | ✱ |
| 19 | Joaquín Robles Romero | España-centro |  |
| 20 | África Nieto Mendoza | España-sur + España-centro |  |
| 21 | Teo Bouhlal | Magreb | ✱ |
| 22 | Andrea Rodríguez Moreno | España-norte + España-centro |  |
| 23 | Luca Espinosa Benali | España-sur + Magreb | · |
| 24 | Jan López Climent | España-centro + España-sur |  |

**Semilla 4** — personaje: **Axel Paz Correa** (España-sur + Latinoamérica; padres: España (sur) + Latinoamérica). 2 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 0; · solo el segundo apellido).

| # | Compañero | Origen | |
|--:|---|---|---|
| 1 | José Luis Gil Lozano | España-sur |  |
| 2 | Yago Hernández García | España-centro |  |
| 3 | Josep Higueras Dimitrov | España-centro + Europa del este | · |
| 4 | Nil Álvarez Aranda | España-sur + España-centro |  |
| 5 | Sofía Velasco Romero | España-sur |  |
| 6 | Álex Santana Sáez | España-centro + España-norte |  |
| 7 | Biel Fuentes Quintana | España-centro + España-sur |  |
| 8 | Rocío Santos Silva | España-norte |  |
| 9 | María Pilar Figueroa Gómez | España-sur + España-norte |  |
| 10 | Inés Martínez Bautista | España-sur + España-centro |  |
| 11 | Eva Cruz Zamora | España-norte + España-sur + España-centro |  |
| 12 | Marisol Carrasco Herrera | España-norte |  |
| 13 | Ignacio Castillo Boukhari | Magreb + Europa del norte + España-sur | · |
| 14 | Jorge Moreno Gutiérrez | España-norte + España-centro |  |
| 15 | Pablo Molina Casado | España-centro |  |
| 16 | María Dolores Gil Arroyo | España-centro + España-sur |  |
| 17 | Inés Flores Montero | España-norte |  |
| 18 | Urko Hernández Acosta | Latinoamérica |  |
| 19 | Maribel Herrera Torres | España-centro + Latinoamérica |  |
| 20 | Miguel Pérez Cortés | España-centro + España-norte |  |
| 21 | Marcos Martín Rojas | España-norte + España-centro |  |
| 22 | Alfredo Teruel Muñoz | España-centro + España-sur |  |
| 23 | Leo Bravo Navarro | España-norte + España-sur |  |
| 24 | Héctor Cabrera Núñez | España-sur |  |

**Semilla 5** — personaje: **Marcos Giménez Cordero** (España-centro + España-sur; padres: España (centro) + España (sur)). 3 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 2; · solo el segundo apellido).

| # | Compañero | Origen | |
|--:|---|---|---|
| 1 | Gabriela Bosch Jiménez | España-sur |  |
| 2 | Andrea Jiménez Cordero | España-sur |  |
| 3 | Gloria Díaz Suárez | España-centro + España-sur |  |
| 4 | Eugenio Méndez González | España-sur + España-centro |  |
| 5 | Sofía Escudero Izquierdo | España-norte + España-sur + España-centro |  |
| 6 | Triana Díez Medina | España-norte + España-sur |  |
| 7 | Lorenzo Guerrero Abad | España-norte + España-sur |  |
| 8 | Esther Gómez Rubio | España-norte + España-centro |  |
| 9 | Álvaro Cruz Carrillo | España-norte + España-centro |  |
| 10 | Mariano Landa Cárdenas | España-sur + España-centro |  |
| 11 | Emma Gómez Delgado | España-sur + España-norte |  |
| 12 | Arnau Lozano Mesa | España-norte + España-sur |  |
| 13 | Silvia Santana Miranda | España-centro + España-norte |  |
| 14 | Yaiza Cano Ruiz | España-centro |  |
| 15 | Iker Gallego Gil | España-centro + España-sur |  |
| 16 | Aitor Guerrero Cano | España-sur + España-centro |  |
| 17 | Diego Nistor | Europa del este + Magreb | ✱ |
| 18 | Irene Díaz Alonso | España-sur + España-norte |  |
| 19 | Susana Cabrera Bermúdez | España-centro + España-sur |  |
| 20 | Sol Fernández Gheorghe | Latinoamérica + Europa del este | · |
| 21 | Mariano Gimeno Díaz | España-norte + España-centro |  |
| 22 | Aitana Sebti | Magreb | ✱ |
| 23 | Concepción Serrano Fajardo | España-sur + España-centro + España-norte |  |
| 24 | Concepción Serrano Marín | España-norte |  |

Suenan extranjeros por semilla: 1, 5, 5, 2, 3 (media 3.2 de 24).

#### Opción c

**Semilla 1** — personaje: **Raúl Iglesias Higueras** (España-norte; padres: España (norte) + España (norte)). 1 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 1; · solo el segundo apellido).

| # | Compañero | Origen | |
|--:|---|---|---|
| 1 | Lucas Bravo Aranda | España-sur |  |
| 2 | Abril Gonzalvo Bravo | España-centro |  |
| 3 | Margarita Nogueira Expósito | España-sur |  |
| 4 | Omar Dorado Marín | España-norte + España-centro |  |
| 5 | Biel Rivas Ramos | España-centro + España-sur |  |
| 6 | Santiago Muñoz Mora | España-centro |  |
| 7 | Izan Hernández Yáñez | España-sur + España-norte |  |
| 8 | Vicente Gómez Sanz | España-sur + España-centro |  |
| 9 | Dani Soto Castillo | España-sur |  |
| 10 | Hajar Bennani | Magreb + África subsahariana | ✱ |
| 11 | Ignacio Mateo García | España-centro + España-sur |  |
| 12 | Marcos Ortega Duran | España-norte + España-sur |  |
| 13 | Ariadna Lorente Hernández | España-norte + España-sur |  |
| 14 | Ángela Fernández Sánchez | España-sur + España-centro |  |
| 15 | Chloe Muñoz Luna | España-sur + España-centro |  |
| 16 | Juan Guerrero Pérez | España-centro + España-sur |  |
| 17 | Azahara Núñez Tapia | España-sur |  |
| 18 | Luca Salas Rivero | Latinoamérica + España-sur |  |
| 19 | Teodoro Otero Olmo | España-norte + España-centro |  |
| 20 | Raúl Blanco Bravo | España-sur |  |
| 21 | Noah Morales García | España-centro + España-sur |  |
| 22 | Gonzalo Herrera Expósito | España-sur + España-norte |  |
| 23 | Cristian Martín Ruiz | España-norte |  |
| 24 | Lidia Ferreira Vicente | España-sur + España-centro |  |

**Semilla 2** — personaje: **Dani Fuentes Gil** (España-norte + España-sur; padres: España (norte) + España (sur)). 5 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 4; · solo el segundo apellido).

| # | Compañero | Origen | |
|--:|---|---|---|
| 1 | Alejandro Santiago Mesa | España-norte |  |
| 2 | Nerea Fontán Hernández | España-centro |  |
| 3 | Jan Arias Otero | España-centro + España-norte |  |
| 4 | Vicente Castillo Marcos | España-centro |  |
| 5 | Ivan Kamiński | Europa del este | ✱ |
| 6 | Rocío Galindo Osorio | España-sur + España-norte |  |
| 7 | Mercedes Ibarra Alonso | España-sur |  |
| 8 | Gema Arias Miranda | España-centro |  |
| 9 | Eugenio Vallejo Castro | España-centro |  |
| 10 | Consuelo Vera Lozano | España-centro |  |
| 11 | Eva Salazar Izquierdo | España-sur + España-centro |  |
| 12 | Michael Davies | Europa del norte | ✱ |
| 13 | Raúl Esteban Campos | España-centro + España-sur |  |
| 14 | Alejandro Méndez Díaz | España-centro + España-sur |  |
| 15 | Aroa Carrillo Rodríguez | España-centro |  |
| 16 | Eduard Munteanu | Europa del este | ✱ |
| 17 | David Gómez Nadal | España-centro + España-sur |  |
| 18 | Erik Cortés Vega | España-norte + España-sur |  |
| 19 | Pablo Rodríguez Landa | España-centro + España-sur |  |
| 20 | Valeria Santana Sbai | España-sur + Magreb | · |
| 21 | Almudena Galán Rodríguez | España-sur + España-centro |  |
| 22 | Martín López Romero | España-sur + España-centro |  |
| 23 | Emmanuel Owusu | África subsahariana | ✱ |
| 24 | Lidia Toledo Yáñez | España-norte |  |

**Semilla 3** — personaje: **Rodrigo Climent Villar** (España-sur + España-norte; padres: España (sur) + España (norte)). 5 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 4; · solo el segundo apellido).

| # | Compañero | Origen | |
|--:|---|---|---|
| 1 | Nicolás Ortiz Vázquez | España-centro |  |
| 2 | Daniel Benítez Rojas | España-sur |  |
| 3 | Miriam Fernández Miranda | España-sur + España-centro |  |
| 4 | Carolina Mora Quintana | España-norte + España-centro |  |
| 5 | Abril Bernal Álvarez | España-sur |  |
| 6 | Rodrigo Peña Navarro | España-sur |  |
| 7 | Mateo Acosta López | Latinoamérica |  |
| 8 | Yolanda Huang López | España-centro + Asia oriental | ✱ |
| 9 | Rocío Castro Moya | España-centro + España-norte |  |
| 10 | Iker Suárez Lozano | España-norte + España-centro |  |
| 11 | Daniela Orozco González | España-sur + España-centro |  |
| 12 | Najat Rivas El Idrissi | Magreb + España-centro | ✱ |
| 13 | Esther Lozano Torres | España-sur |  |
| 14 | Juan Carlos Rubio Hernández | España-sur + España-centro |  |
| 15 | Aya León Fontán | España-sur + España-centro |  |
| 16 | Raúl Romero Sánchez | España-sur + España-norte |  |
| 17 | Enzo Medina Velasco | España-norte |  |
| 18 | Ming Han | Asia oriental + Magreb | ✱ |
| 19 | Daniel Valero Rey | España-centro |  |
| 20 | Mar Ribera Silva | España-sur + España-centro |  |
| 21 | Ayoub Rahmani | Magreb | ✱ |
| 22 | Nora Campos Torres | España-norte + España-centro |  |
| 23 | Ricardo Fernández El Fassi | España-sur + Magreb | · |
| 24 | Samuel Heredia López | España-centro + España-sur |  |

**Semilla 4** — personaje: **Axel Paz Correa** (España-sur + Latinoamérica; padres: España (sur) + Latinoamérica). 2 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 2; · solo el segundo apellido).

| # | Compañero | Origen | |
|--:|---|---|---|
| 1 | Erik Serrano Ibarra | España-sur |  |
| 2 | Domingo Sáez Escudero | España-centro |  |
| 3 | Alexey Parra Volkov | España-centro + Europa del este | ✱ |
| 4 | Fernando Andrés Campos | España-sur + España-centro |  |
| 5 | Emma Ballesteros Guerrero | España-sur |  |
| 6 | Luis Cortés Ferrer | España-centro + España-norte |  |
| 7 | Ricardo Rey Contreras | España-centro + España-sur |  |
| 8 | Montserrat Molina Castro | España-norte |  |
| 9 | Montserrat Caballero Molina | España-sur + España-norte |  |
| 10 | África Sanz Guerrero | España-sur + España-centro |  |
| 11 | Carmen Marín Medina | España-norte + España-sur + España-centro |  |
| 12 | Yolanda Benítez Santos | España-norte |  |
| 13 | Mohamed Hamdaoui Hill | Magreb + Europa del norte + España-sur | ✱ |
| 14 | Dani Gómez Calvo | España-norte + España-centro |  |
| 15 | Marcos Silva Guerrero | España-centro |  |
| 16 | Marina Cabrera Vera | España-centro + España-sur |  |
| 17 | Andrea Palacios Fernández | España-norte |  |
| 18 | Julio Reyes Gómez | Latinoamérica |  |
| 19 | Julia Rivera Álvarez | España-centro + Latinoamérica |  |
| 20 | Jorge Valero Nieto | España-centro + España-norte |  |
| 21 | Manuel Salas López | España-norte + España-centro |  |
| 22 | Luis Miguel Alonso Ferrer | España-centro + España-sur |  |
| 23 | Eloy Muñoz Orozco | España-norte + España-sur |  |
| 24 | Mario Expósito Zamora | España-sur |  |

**Semilla 5** — personaje: **Marcos Giménez Cordero** (España-centro + España-sur; padres: España (centro) + España (sur)). 3 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 3; · solo el segundo apellido).

| # | Compañero | Origen | |
|--:|---|---|---|
| 1 | Sofía Gonzalvo Crespo | España-sur |  |
| 2 | Ariadna Osorio Gil | España-sur |  |
| 3 | Judith Fontán Flores | España-centro + España-sur |  |
| 4 | Nil Vargas Bautista | España-sur + España-centro |  |
| 5 | Julia Galindo Campos | España-norte + España-sur + España-centro |  |
| 6 | Vera Soler Ortiz | España-norte + España-sur |  |
| 7 | Álvaro Delgado Jiménez | España-norte + España-sur |  |
| 8 | Sara Sánchez Ibáñez | España-norte + España-centro |  |
| 9 | Enzo Climent Bravo | España-norte + España-centro |  |
| 10 | Iván Gil Ortega | España-sur + España-centro |  |
| 11 | Raquel Martínez Calvo | España-sur + España-norte |  |
| 12 | Javier Ramírez Díaz | España-norte + España-sur |  |
| 13 | Marta Bernal Suárez | España-centro + España-norte |  |
| 14 | Mireia Soler Navarro | España-centro |  |
| 15 | Pol Mora Rodríguez | España-centro + España-sur |  |
| 16 | Enzo Pardo León | España-sur + España-centro |  |
| 17 | Ismail Hajji | Europa del este + Magreb | ✱ |
| 18 | Carmen Serrano Rodríguez | España-sur + España-norte |  |
| 19 | Idoia Ramírez Iglesias | España-centro + España-sur |  |
| 20 | Ionela Stoica Castro | Latinoamérica + Europa del este | ✱ |
| 21 | Asier Domingo Gil | España-norte + España-centro |  |
| 22 | Meriem Cherkaoui | Magreb | ✱ |
| 23 | Olivia Segura Santos | España-sur + España-centro + España-norte |  |
| 24 | Lucía Ibáñez Aguilar | España-norte |  |

Suenan extranjeros por semilla: 1, 5, 5, 2, 3 (media 3.2 de 24).

#### Opción d

**Semilla 1** — personaje: **Raúl Iglesias Higueras** (España-norte; padres: España (norte) + España (norte)). 1 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 1; · solo el segundo apellido).

| # | Compañero | Origen | |
|--:|---|---|---|
| 1 | Xavi Rodríguez Ortiz | España-sur |  |
| 2 | Daniela Moreno Rodríguez | España-centro |  |
| 3 | Gala Garrido Cabrera | España-sur |  |
| 4 | Manuel Hidalgo Nieto | España-norte + España-centro |  |
| 5 | Hèctor Vargas Mur | España-centro + España-sur |  |
| 6 | Rubén Fuentes Cabello | España-centro |  |
| 7 | Alejandro Ruiz Nadal | España-sur + España-norte |  |
| 8 | Jesús María Gómez Navarro | España-sur + España-centro |  |
| 9 | Hugo Morales Calvo | España-sur |  |
| 10 | Carla Lahlou | Magreb + África subsahariana | ✱ |
| 11 | Marc Soler Cisneros | España-centro + España-sur |  |
| 12 | Tomás Zapata Sánchez | España-norte + España-sur |  |
| 13 | Celia Vázquez Castillo | España-norte + España-sur |  |
| 14 | Inés Lozano Gómez | España-sur + España-centro |  |
| 15 | Concepción Caballero Gutiérrez | España-sur + España-centro |  |
| 16 | Javier Cabello Arroyo | España-centro + España-sur |  |
| 17 | Carla Cruz Hidalgo | España-sur |  |
| 18 | Iker González Sáez | Latinoamérica + España-sur |  |
| 19 | Antonio Duran Álvarez | España-norte + España-centro |  |
| 20 | Leo Sanz Casas | España-sur |  |
| 21 | Jorge Gutiérrez Muñoz | España-centro + España-sur |  |
| 22 | Ángel Fernández Macías | España-sur + España-norte |  |
| 23 | Pablo Rivas Izquierdo | España-norte |  |
| 24 | Alba Romero Pascual | España-sur + España-centro |  |

**Semilla 2** — personaje: **Dani Fuentes Gil** (España-norte + España-sur; padres: España (norte) + España (sur)). 5 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 4; · solo el segundo apellido).

| # | Compañero | Origen | |
|--:|---|---|---|
| 1 | Iván Ramírez Jiménez | España-norte |  |
| 2 | Azahara Redondo Guzmán | España-centro |  |
| 3 | Rodrigo Díaz Rey | España-centro + España-norte |  |
| 4 | Benito Peña Arroyo | España-centro |  |
| 5 | Jan Sokolov | Europa del este | ✱ |
| 6 | Daniela Silva Valero | España-sur + España-norte |  |
| 7 | Aitana Benítez Gutiérrez | España-sur |  |
| 8 | Sara Soto Domínguez | España-centro |  |
| 9 | Tomás Rivas Romero | España-centro |  |
| 10 | Sofía Marín Lorenzo | España-centro |  |
| 11 | Alma Figueroa Blanco | España-sur + España-centro |  |
| 12 | Liam Martin | Europa del norte | ✱ |
| 13 | Pol Santiago López | España-centro + España-sur |  |
| 14 | Josep Cruz García | España-centro + España-sur |  |
| 15 | Carla Durán Blanco | España-centro |  |
| 16 | Daniel Kovač | Europa del este | ✱ |
| 17 | Cayetano Calvo Segura | España-centro + España-sur |  |
| 18 | Daniel Campos Díez | España-norte + España-sur |  |
| 19 | Alfredo Higueras Pastor | España-centro + España-sur |  |
| 20 | Naiara Morales Moussaoui | España-sur + Magreb | · |
| 21 | Rebeca Gómez Pons | España-sur + España-centro |  |
| 22 | Yago Castillo Guerrero | España-sur + España-centro |  |
| 23 | Chidi Abaga | África subsahariana | ✱ |
| 24 | Helena Noguera Benavente | España-norte |  |

**Semilla 3** — personaje: **Rodrigo Climent Villar** (España-sur + España-norte; padres: España (sur) + España (norte)). 5 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 3; · solo el segundo apellido).

| # | Compañero | Origen | |
|--:|---|---|---|
| 1 | Pol Ruiz Merino | España-centro |  |
| 2 | Nicolás Suárez Giménez | España-sur |  |
| 3 | Miriam Gonzalvo Ramos | España-sur + España-centro |  |
| 4 | Concepción Rodríguez Pons | España-norte + España-centro |  |
| 5 | Marta Sánchez Gallego | España-sur |  |
| 6 | Adrián Martínez Carrillo | España-sur |  |
| 7 | Gonzalo Paz Villalba | Latinoamérica |  |
| 8 | Sofía Rodríguez Liu | España-centro + Asia oriental | · |
| 9 | Nerea Vázquez Muñoz | España-centro + España-norte |  |
| 10 | Pedro Ramos Vázquez | España-norte + España-centro |  |
| 11 | Mercedes Ribas Álvarez | España-sur + España-centro |  |
| 12 | Aitana Estévez Moussaoui | Magreb + España-centro | · |
| 13 | Aránzazu Ibáñez Salas | España-sur |  |
| 14 | Ignacio Gracia Gallego | España-sur + España-centro |  |
| 15 | Encarnación Camacho Casas | España-sur + España-centro |  |
| 16 | Francisco José Molina Cordero | España-sur + España-norte |  |
| 17 | Mario Vallejo Castillo | España-norte |  |
| 18 | Adam Aboulkacem | Asia oriental + Magreb | ✱ |
| 19 | Thiago Soto Pardo | España-centro |  |
| 20 | Ona Garrido Otero | España-sur + España-centro |  |
| 21 | Bilal El Khatib | Magreb | ✱ |
| 22 | María Luisa Vidal Márquez | España-norte + España-centro |  |
| 23 | Adam Belkacem Nogueira | España-sur + Magreb | ✱ |
| 24 | Sergi Casado Redondo | España-centro + España-sur |  |

**Semilla 4** — personaje: **Axel Paz Correa** (España-sur + Latinoamérica; padres: España (sur) + Latinoamérica). 2 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 1; · solo el segundo apellido).

| # | Compañero | Origen | |
|--:|---|---|---|
| 1 | Javier Valero Lozano | España-sur |  |
| 2 | Thiago Cuesta Mendoza | España-centro |  |
| 3 | Mario Cabello Florea | España-centro + Europa del este | · |
| 4 | Adrián León Suárez | España-sur + España-centro |  |
| 5 | Alba García Cano | España-sur |  |
| 6 | Hugo Gonzalvo Iglesias | España-centro + España-norte |  |
| 7 | Bernat López Gómez | España-centro + España-sur |  |
| 8 | Margarita Dorado Ibarra | España-norte |  |
| 9 | Paula Sierra Lozano | España-sur + España-norte |  |
| 10 | Yolanda Reyes Escudero | España-sur + España-centro |  |
| 11 | Adriana Galán Hurtado | España-norte + España-sur + España-centro |  |
| 12 | Mar Alonso Benavente | España-norte |  |
| 13 | Khalid Naciri Taylor | Magreb + Europa del norte + España-sur | ✱ |
| 14 | Sergio Nieto Marcos | España-norte + España-centro |  |
| 15 | Esteban Uribe Ferrer | España-centro |  |
| 16 | Amaia Navarro Parra | España-centro + España-sur |  |
| 17 | Rosario Gonzalvo Fuentes | España-norte |  |
| 18 | Julián González Morales | Latinoamérica |  |
| 19 | Triana Lara Sandoval | España-centro + Latinoamérica |  |
| 20 | Asier Sosa Carrasco | España-centro + España-norte |  |
| 21 | Arnau Garrido Pérez | España-norte + España-centro |  |
| 22 | Íñigo Vázquez Orozco | España-centro + España-sur |  |
| 23 | Santiago Herrero Maldonado | España-norte + España-sur |  |
| 24 | José Moreno Herrero | España-sur |  |

**Semilla 5** — personaje: **Marcos Giménez Cordero** (España-centro + España-sur; padres: España (centro) + España (sur)). 3 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 2; · solo el segundo apellido).

| # | Compañero | Origen | |
|--:|---|---|---|
| 1 | Lourdes Aguilar Gallego | España-sur |  |
| 2 | Candela Suárez Medina | España-sur |  |
| 3 | Eva Ferreira Corral | España-centro + España-sur |  |
| 4 | Adam Cortés González | España-sur + España-centro |  |
| 5 | Sira Gómez Garrido | España-norte + España-sur + España-centro |  |
| 6 | Alejandra Fernández Carmona | España-norte + España-sur |  |
| 7 | Eric Mesa Vallejo | España-norte + España-sur |  |
| 8 | Ángela Izquierdo Campos | España-norte + España-centro |  |
| 9 | Marcos Bernal Núñez | España-norte + España-centro |  |
| 10 | Thiago Gallardo Romero | España-sur + España-centro |  |
| 11 | Esther Maldonado Santiago | España-sur + España-norte |  |
| 12 | Manuel Muñoz Ibarra | España-norte + España-sur |  |
| 13 | Jimena González Rivas | España-centro + España-norte |  |
| 14 | Inés Ortiz Franco | España-centro |  |
| 15 | Lorenzo Lozano García | España-centro + España-sur |  |
| 16 | Enzo Navarro Gutiérrez | España-sur + España-centro |  |
| 17 | Ali Tahiri | Europa del este + Magreb | ✱ |
| 18 | Maia Cabrera Villar | España-sur + España-norte |  |
| 19 | Adriana Muñoz Valero | España-centro + España-sur |  |
| 20 | Isabel Rojas Zlatev | Latinoamérica + Europa del este | · |
| 21 | Urko Lorenzo Vallejo | España-norte + España-centro |  |
| 22 | Loubna Sebti | Magreb | ✱ |
| 23 | Estefanía Vargas Bosch | España-sur + España-centro + España-norte |  |
| 24 | Begoña Ferrer Ferreira | España-norte |  |

Suenan extranjeros por semilla: 1, 5, 5, 2, 3 (media 3.2 de 24).

#### Opción a+b

**Semilla 1** — personaje: **Raúl Iglesias Higueras** (España-norte; padres: España (norte) + España (norte)). 1 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 0; · solo el segundo apellido).

| # | Compañero | Origen | |
|--:|---|---|---|
| 1 | Enzo Romero Santiago | España-sur |  |
| 2 | Emma Castillo Alcántara | España-centro |  |
| 3 | Emma Pérez Pizarro | España-sur |  |
| 4 | David Ortiz Santos | España-norte + España-centro |  |
| 5 | Iker Vázquez Marín | España-centro + España-sur |  |
| 6 | Óscar Ramírez Lara | España-centro |  |
| 7 | Joaquín Vicente Toledo | España-sur + España-norte |  |
| 8 | Hugo Sala Santana | España-sur + España-centro |  |
| 9 | Cayetano Santiago Molina | España-sur |  |
| 10 | Valeria Acosta Laaroussi | Latinoamérica + Magreb | · |
| 11 | Daniel Ferreira Flores | España-centro + España-sur |  |
| 12 | Raúl Romero Bermúdez | España-norte + España-sur |  |
| 13 | Emma Ruiz Hernández | España-norte + España-sur |  |
| 14 | Belén Navarro Bermúdez | España-sur + España-centro |  |
| 15 | Paula García Campos | España-sur + España-centro |  |
| 16 | Hugo Oliva Morales | España-centro + España-sur |  |
| 17 | Ainhoa Moya Andrés | España-sur |  |
| 18 | Julio Figueroa González | Latinoamérica + España-sur |  |
| 19 | Diego Calvo León | España-norte + España-centro |  |
| 20 | Dani Cabrera Quintana | España-sur |  |
| 21 | Hugo Aranda Suárez | España-centro + España-sur |  |
| 22 | Erik Vázquez Cárdenas | España-sur + España-norte |  |
| 23 | Diego Pardo Reyes | España-norte |  |
| 24 | Candela Lorenzo Durán | España-sur + España-centro |  |

**Semilla 2** — personaje: **Dani Fuentes Gil** (España-norte + España-sur; padres: España (norte) + España (sur)). 3 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 3; · solo el segundo apellido).

| # | Compañero | Origen | |
|--:|---|---|---|
| 1 | Iván Martín Garrido | España-norte |  |
| 2 | Laia Noguera Ortiz | España-centro |  |
| 3 | Hugo Ponce Galindo | España-centro + España-norte |  |
| 4 | Agustín Santana Rodríguez | España-centro |  |
| 5 | Alejandro Kovač | Europa del este | ✱ |
| 6 | Marta Bautista Estévez | España-sur + España-norte |  |
| 7 | Sara Núñez Díaz | España-sur |  |
| 8 | Lara Rey Alonso | España-centro |  |
| 9 | Pablo Salazar Pastor | España-centro |  |
| 10 | Ruth Márquez Méndez | España-centro |  |
| 11 | Laia Giménez Cano | España-sur + España-centro |  |
| 12 | Pierre Becker | Europa del norte | ✱ |
| 13 | Benito Ballesteros Campos | España-centro + España-sur |  |
| 14 | Ferran Esteban Ferreira | España-centro + España-sur |  |
| 15 | Inés Cano Castro | España-centro |  |
| 16 | Robert Popa | Europa del este | ✱ |
| 17 | José Maldonado Osorio | España-centro + España-sur |  |
| 18 | Arnau Álvarez Merino | España-norte + España-sur |  |
| 19 | Adam Guzmán Fernández | España-centro + España-sur |  |
| 20 | Cecilia Benítez Sanz | España-sur + Latinoamérica |  |
| 21 | Gregorio Abad Álvarez | España-centro + España-sur |  |
| 22 | Nicolás Martínez Lorente | España-sur + España-centro |  |
| 23 | David Miranda Márquez | España-centro + España-sur |  |
| 24 | Andrea Gutiérrez Ramírez | España-norte |  |

**Semilla 3** — personaje: **Rodrigo Climent Villar** (España-sur + España-norte; padres: España (sur) + España (norte)). 3 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 2; · solo el segundo apellido).

| # | Compañero | Origen | |
|--:|---|---|---|
| 1 | Marc Suárez Vázquez | España-centro |  |
| 2 | Martín Suárez Vargas | España-sur |  |
| 3 | Ivana Palacios Soler | España-sur + España-centro |  |
| 4 | Beatriz Alonso Sala | España-norte + España-centro |  |
| 5 | Ivana Delgado Lorenzo | España-sur |  |
| 6 | Samuel González Muñoz | España-sur |  |
| 7 | Ricardo Torres Rivero | Latinoamérica |  |
| 8 | Pilar Rodríguez Ma | España-centro + Asia oriental | · |
| 9 | Candela Suárez Ruiz | España-centro + España-norte |  |
| 10 | Fran Ballesteros Alonso | España-norte + España-centro |  |
| 11 | Andrea Giménez Andrés | España-sur + España-centro |  |
| 12 | Claudia Ruiz Bautista | Latinoamérica + España-centro |  |
| 13 | Eugenia Santana Casas | España-sur |  |
| 14 | Luca León Cabrera | España-sur + España-centro |  |
| 15 | Verónica Gallego Rivas | España-sur + España-centro |  |
| 16 | Emilio Luna Zamora | España-sur + España-norte |  |
| 17 | Alejandro Alonso Lorente | España-norte |  |
| 18 | Min-jun Tanaka Pineda | Asia oriental + Latinoamérica | ✱ |
| 19 | Chloe Casas Castro | España-centro + España-sur |  |
| 20 | Laia Pizarro Vallejo | España-norte + España-centro + España-sur |  |
| 21 | Salvador Reyes Ramírez | España-sur + España-norte |  |
| 22 | Gala Rubio Morales | España-sur + España-centro |  |
| 23 | Judith Park | Asia oriental | ✱ |
| 24 | Vega Ferreira Rivera | España-centro + España-norte |  |

**Semilla 4** — personaje: **Axel Paz Correa** (España-sur + Latinoamérica; padres: España (sur) + Latinoamérica). 1 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 0; · solo el segundo apellido).

| # | Compañero | Origen | |
|--:|---|---|---|
| 1 | Teresa Iglesias Nieto | España-sur |  |
| 2 | Biel Izquierdo Herrero | España-centro |  |
| 3 | José Antonio Santiago Stan | España-centro + Europa del este | · |
| 4 | Rubén Calderón Sierra | España-sur + España-centro |  |
| 5 | Lourdes Domínguez Carrasco | España-sur |  |
| 6 | Raúl Díaz Rojas | España-centro + España-norte |  |
| 7 | Ian Carmona Benítez | España-centro + España-sur |  |
| 8 | Daniela Díaz Fernandes | España-norte |  |
| 9 | Antonia Paz Estévez | España-sur + España-norte |  |
| 10 | Jimena Román Rodríguez | España-sur + España-centro |  |
| 11 | Lourdes Ibarra León | España-norte + España-sur + España-centro |  |
| 12 | Blanca Sala Carrillo | España-norte |  |
| 13 | Alfredo Vidal Barrios | Latinoamérica + Europa del norte + España-sur |  |
| 14 | Gonzalo Contreras Martínez | España-norte + España-centro |  |
| 15 | Daniel Pastor Alonso | España-centro |  |
| 16 | Martina González Nadal | España-centro + España-sur |  |
| 17 | Yaiza Galán Peña | España-norte |  |
| 18 | Víctor Esquivel Peralta | Latinoamérica |  |
| 19 | Iria Fontán Flores | España-centro + Latinoamérica |  |
| 20 | Manuel Romero Andrés | España-centro + España-norte |  |
| 21 | Tomás Vidal Peña | España-norte + España-centro |  |
| 22 | Marcos Redondo Martín | España-centro + España-sur |  |
| 23 | Aitor Corral Méndez | España-norte + España-sur |  |
| 24 | Adrián Cruz Herrero | España-sur |  |

**Semilla 5** — personaje: **Marcos Giménez Cordero** (España-centro + España-sur; padres: España (centro) + España (sur)). 3 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 2; · solo el segundo apellido).

| # | Compañero | Origen | |
|--:|---|---|---|
| 1 | Dimitar Popov | Europa del este | ✱ |
| 2 | Yago León Iglesias | España-centro |  |
| 3 | Raquel Lago Cuevas | España-centro + España-sur |  |
| 4 | Thiago Castillo González | España-sur + España-centro |  |
| 5 | Cayetana Álvarez Castro | España-norte + España-sur + España-centro |  |
| 6 | Loreto Alonso Díez | España-norte + España-sur |  |
| 7 | Eduardo Nogueira Romero | España-norte + España-sur |  |
| 8 | Luna Marín Andrés | España-norte + España-centro |  |
| 9 | Álex Marcos Bermúdez | España-norte + España-centro |  |
| 10 | Marcos Rey Valero | España-sur + España-centro |  |
| 11 | Ángela Duran Parra | España-sur + España-norte |  |
| 12 | Ángel Cano Garrido | España-norte + España-sur |  |
| 13 | Adriana Domínguez Torres | España-centro + España-norte |  |
| 14 | Azahara Sánchez Lara | España-centro |  |
| 15 | Javier Suárez Uribe | España-centro + España-sur |  |
| 16 | Andrés Benítez Muñoz | España-sur + España-centro |  |
| 17 | Martín Nowak Acosta | Europa del este + Latinoamérica | ✱ |
| 18 | Félix Carrasco Elizalde | España-sur + España-centro |  |
| 19 | Bernat Orozco Vázquez | España-sur + España-centro |  |
| 20 | Lucía Rodríguez Martin | Latinoamérica + Europa del norte | · |
| 21 | Luca Merino Alonso | España-norte + España-centro |  |
| 22 | Francisca Álvarez Molina | Latinoamérica |  |
| 23 | Ariadna Bermúdez Lorenzo | España-sur + España-centro + España-norte |  |
| 24 | Gloria Navarro García | España-norte |  |

Suenan extranjeros por semilla: 1, 3, 3, 1, 3 (media 2.2 de 24).

#### Opción a+b+c

**Semilla 1** — personaje: **Raúl Iglesias Higueras** (España-norte; padres: España (norte) + España (norte)). 1 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 0; · solo el segundo apellido).

| # | Compañero | Origen | |
|--:|---|---|---|
| 1 | Rodrigo Cruz Aguilar | España-sur |  |
| 2 | María Vera Villar | España-centro |  |
| 3 | Silvia Domínguez Fernández | España-sur |  |
| 4 | Óscar Tapia Soto | España-norte + España-centro |  |
| 5 | Roberto Alonso Zapata | España-centro + España-sur |  |
| 6 | Julio Tapia Aguilar | España-centro |  |
| 7 | Rafael Cabrera Rueda | España-sur + España-norte |  |
| 8 | Xavi Muñoz Otero | España-sur + España-centro |  |
| 9 | Emilio Cuevas Navarro | España-sur |  |
| 10 | Noelia Gómez Bakkali | Latinoamérica + Magreb | · |
| 11 | Roberto Calvo Herrera | España-centro + España-sur |  |
| 12 | Jesús Jiménez Sánchez | España-norte + España-sur |  |
| 13 | Débora Arias Alonso | España-norte + España-sur |  |
| 14 | Aitana Duran Cano | España-sur + España-centro |  |
| 15 | Encarnación Pérez Soler | España-sur + España-centro |  |
| 16 | Omar Gutiérrez Torres | España-centro + España-sur |  |
| 17 | Mireia Rubio García | España-sur |  |
| 18 | Jordi Espinosa Pérez | Latinoamérica + España-sur |  |
| 19 | Luca Marín Medina | España-norte + España-centro |  |
| 20 | Miguel Ángel Ponce Cuesta | España-sur |  |
| 21 | Pablo Urbano Rivas | España-centro + España-sur |  |
| 22 | Diego Segura Sanz | España-sur + España-norte |  |
| 23 | Joaquín Blanco Serrano | España-norte |  |
| 24 | Sara Román Peña | España-sur + España-centro |  |

**Semilla 2** — personaje: **Dani Fuentes Gil** (España-norte + España-sur; padres: España (norte) + España (sur)). 3 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 3; · solo el segundo apellido).

| # | Compañero | Origen | |
|--:|---|---|---|
| 1 | Leo Macías Gómez | España-norte |  |
| 2 | Mía Gutiérrez Trujillo | España-centro |  |
| 3 | Xavier Hidalgo Navarro | España-centro + España-norte |  |
| 4 | Yago Navarro Fernández | España-centro |  |
| 5 | Răzvan Dumitru | Europa del este | ✱ |
| 6 | Mercedes Ibarra López | España-sur + España-norte |  |
| 7 | María Díaz Jiménez | España-sur |  |
| 8 | Nerea Medina Alonso | España-centro |  |
| 9 | Salvador Pardo Oliva | España-centro |  |
| 10 | Paloma Ramírez Aranda | España-centro |  |
| 11 | Iria Parra Ribas | España-sur + España-centro |  |
| 12 | Manuel Fischer | Europa del norte | ✱ |
| 13 | Aarón Cárdenas León | España-centro + España-sur |  |
| 14 | Mariano Palacios Cruz | España-centro + España-sur |  |
| 15 | Maia Rodríguez Nieto | España-centro |  |
| 16 | Andrés Matei | Europa del este | ✱ |
| 17 | Eric Molina López | España-centro + España-sur |  |
| 18 | Adam Parra Caballero | España-norte + España-sur |  |
| 19 | Imanol Álvarez Méndez | España-centro + España-sur |  |
| 20 | Candela Espinosa Sosa | España-sur + Latinoamérica |  |
| 21 | Leo Márquez Martín | España-centro + España-sur |  |
| 22 | Julián Villar Olmo | España-sur + España-centro |  |
| 23 | Ramón Arroyo Herrero | España-centro + España-sur |  |
| 24 | Carmen Merino Iglesias | España-norte |  |

**Semilla 3** — personaje: **Rodrigo Climent Villar** (España-sur + España-norte; padres: España (sur) + España (norte)). 3 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 2; · solo el segundo apellido).

| # | Compañero | Origen | |
|--:|---|---|---|
| 1 | Telmo Velasco Andrés | España-centro |  |
| 2 | Teo Bautista Herrera | España-sur |  |
| 3 | Natalia Hurtado Méndez | España-sur + España-centro |  |
| 4 | Gemma Bermúdez Calvo | España-norte + España-centro |  |
| 5 | Malena Herrero Prieto | España-sur |  |
| 6 | Hugo Rodríguez Peña | España-sur |  |
| 7 | Gonzalo Ibarra Duarte | Latinoamérica |  |
| 8 | Rosa Serrano Ye | España-centro + Asia oriental | · |
| 9 | Aroa Gonzalvo Costa | España-centro + España-norte |  |
| 10 | Álvaro Martín Pascual | España-norte + España-centro |  |
| 11 | Paula García Jara | España-sur + España-centro |  |
| 12 | Olivia Díez Ramos | Latinoamérica + España-centro |  |
| 13 | Leire Marín Rivera | España-sur |  |
| 14 | Hugo Torres Fernández | España-sur + España-centro |  |
| 15 | Daniela Marín Pérez | España-sur + España-centro |  |
| 16 | Rubén Valero Fernandes | España-sur + España-norte |  |
| 17 | Gonzalo Morales Pérez | España-norte |  |
| 18 | Dong-hyun Kim Suárez | Asia oriental + Latinoamérica | ✱ |
| 19 | Lorena Calderón Román | España-centro + España-sur |  |
| 20 | Alba Sánchez Pérez | España-norte + España-centro + España-sur |  |
| 21 | Raúl Navarro Benavente | España-sur + España-norte |  |
| 22 | Olivia Fernández Campos | España-sur + España-centro |  |
| 23 | Itziar Zhu | Asia oriental | ✱ |
| 24 | Emma Higueras Marín | España-centro + España-norte |  |

**Semilla 4** — personaje: **Axel Paz Correa** (España-sur + Latinoamérica; padres: España (sur) + Latinoamérica). 2 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 1; · solo el segundo apellido).

| # | Compañero | Origen | |
|--:|---|---|---|
| 1 | Gloria Marcos Ramírez | España-sur |  |
| 2 | José Luis Ramos Martín | España-centro |  |
| 3 | Hristo Ivanov Soler | España-centro + Europa del este | ✱ |
| 4 | Salvador Moreno Garrido | España-sur + España-centro |  |
| 5 | Natalia Teruel Flores | España-sur |  |
| 6 | Emilio Blanco Ramos | España-centro + España-norte |  |
| 7 | Hèctor Romero Fernández | España-centro + España-sur |  |
| 8 | Silvia Santana Lara | España-norte |  |
| 9 | Malena Campos Figueroa | España-sur + España-norte |  |
| 10 | Lourdes Parra León | España-sur + España-centro |  |
| 11 | Iria Sosa Sierra | España-norte + España-sur + España-centro |  |
| 12 | Verónica Montero Vera | España-norte |  |
| 13 | Gael Medina Dubois | Latinoamérica + Europa del norte + España-sur | · |
| 14 | José Luis Prieto Torres | España-norte + España-centro |  |
| 15 | Hèctor Núñez Sanz | España-centro |  |
| 16 | Alicia García Carrasco | España-centro + España-sur |  |
| 17 | Cecilia Mora Alcántara | España-norte |  |
| 18 | Benjamín Zárate Gutiérrez | Latinoamérica |  |
| 19 | Natalia Domínguez Ruiz | España-centro + Latinoamérica |  |
| 20 | Agustín Rubio Espinosa | España-centro + España-norte |  |
| 21 | Hugo Valero Elizalde | España-norte + España-centro |  |
| 22 | Fran Salazar Elizalde | España-centro + España-sur |  |
| 23 | Moisés Ortiz Rodríguez | España-norte + España-sur |  |
| 24 | Pablo Jiménez Bosch | España-sur |  |

**Semilla 5** — personaje: **Marcos Giménez Cordero** (España-centro + España-sur; padres: España (centro) + España (sur)). 3 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 2; · solo el segundo apellido).

| # | Compañero | Origen | |
|--:|---|---|---|
| 1 | Ramón Stan | Europa del este | ✱ |
| 2 | Xavier Ortega Vargas | España-centro |  |
| 3 | Cayetana Beltrán Marino | España-centro + España-sur |  |
| 4 | Biel Hernández González | España-sur + España-centro |  |
| 5 | Ángela Fuentes Ribera | España-norte + España-sur + España-centro |  |
| 6 | Gala Ibáñez Silva | España-norte + España-sur |  |
| 7 | Pablo Vargas Iglesias | España-norte + España-sur |  |
| 8 | Alicia Vallejo Montero | España-norte + España-centro |  |
| 9 | Álex Ferrer Cortés | España-norte + España-centro |  |
| 10 | Íñigo Serrano Arias | España-sur + España-centro |  |
| 11 | Francisca Higueras Teruel | España-sur + España-norte |  |
| 12 | Hugo Méndez Guerrero | España-norte + España-sur |  |
| 13 | Susana Santos Sanz | España-centro + España-norte |  |
| 14 | Isabel Rodríguez Escudero | España-centro |  |
| 15 | Diego Rodríguez Albert | España-centro + España-sur |  |
| 16 | Mario Calvo Cano | España-sur + España-centro |  |
| 17 | Marcin Wójcik Suárez | Europa del este + Latinoamérica | ✱ |
| 18 | Leo Díez Montero | España-sur + España-centro |  |
| 19 | José Manuel Velasco Arias | España-sur + España-centro |  |
| 20 | Candela Godoy White | Latinoamérica + Europa del norte | · |
| 21 | Izan Román Campos | España-norte + España-centro |  |
| 22 | Montserrat García Figueroa | Latinoamérica |  |
| 23 | Lara Blanco Guerrero | España-sur + España-centro + España-norte |  |
| 24 | Andrea Yáñez Muñoz | España-norte |  |

Suenan extranjeros por semilla: 1, 3, 3, 2, 3 (media 2.4 de 24).

#### Opción a+b+c+d

**Semilla 1** — personaje: **Raúl Iglesias Higueras** (España-norte; padres: España (norte) + España (norte)). 1 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 0; · solo el segundo apellido).

| # | Compañero | Origen | |
|--:|---|---|---|
| 1 | Unai Casado González | España-sur |  |
| 2 | Teresa Ribas Salazar | España-centro |  |
| 3 | Joana Nogueira Sánchez | España-sur |  |
| 4 | Eugenio Romero Sáez | España-norte + España-centro |  |
| 5 | Guillermo Molina Prieto | España-centro + España-sur |  |
| 6 | Erik Salazar Vega | España-centro |  |
| 7 | Álex Ibarra Cruz | España-sur + España-norte |  |
| 8 | Joel Trujillo Suárez | España-sur + España-centro |  |
| 9 | Alejandro Gutiérrez Cortés | España-sur |  |
| 10 | Lorena Ríos Alaoui | Latinoamérica + Magreb | · |
| 11 | Daniel Vázquez Flores | España-centro + España-sur |  |
| 12 | Dani Cortés Abad | España-norte + España-sur |  |
| 13 | Leire Jiménez Redondo | España-norte + España-sur |  |
| 14 | Bianca Domingo García | España-sur + España-centro |  |
| 15 | Mireia Vargas Flores | España-sur + España-centro |  |
| 16 | Ignacio Salas Calderón | España-centro + España-sur |  |
| 17 | Verónica Castro Carrasco | España-sur |  |
| 18 | Raúl Durán Cáceres | Latinoamérica + España-sur |  |
| 19 | Jesús Gil Álvarez | España-norte + España-centro |  |
| 20 | Marcos Vega Martínez | España-sur |  |
| 21 | Mateo Hormigo Hernández | España-centro + España-sur |  |
| 22 | Biel Morales Gómez | España-sur + España-norte |  |
| 23 | Álex Rubio Iglesias | España-norte |  |
| 24 | Lara Mendoza Gonzalvo | España-sur + España-centro |  |

**Semilla 2** — personaje: **Dani Fuentes Gil** (España-norte + España-sur; padres: España (norte) + España (sur)). 3 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 3; · solo el segundo apellido).

| # | Compañero | Origen | |
|--:|---|---|---|
| 1 | Eduardo Román Barrios | España-norte |  |
| 2 | Berta Garrido Silva | España-centro |  |
| 3 | Diego Duran Guerrero | España-centro + España-norte |  |
| 4 | Álvaro Sanz Fuentes | España-centro |  |
| 5 | Xavier Tudor | Europa del este | ✱ |
| 6 | Vega Jara Carrillo | España-sur + España-norte |  |
| 7 | Chloe Ribas Calderón | España-sur |  |
| 8 | Andrea Orozco Jiménez | España-centro |  |
| 9 | Xavier Márquez Lara | España-centro |  |
| 10 | Daniela León Muñoz | España-centro |  |
| 11 | Sofía Arias Moreno | España-sur + España-centro |  |
| 12 | Jean Ferrari | Europa del norte | ✱ |
| 13 | Rodrigo Vargas Zapata | España-centro + España-sur |  |
| 14 | Alfonso Vega Sáez | España-centro + España-sur |  |
| 15 | Almudena Cárdenas Martínez | España-centro |  |
| 16 | Daniel Preda | Europa del este | ✱ |
| 17 | Biel López Martínez | España-centro + España-sur |  |
| 18 | Rafael Rojas Hidalgo | España-norte + España-sur |  |
| 19 | Ferran Ribas Castillo | España-centro + España-sur |  |
| 20 | Ainhoa Palacios Martínez | España-sur + Latinoamérica |  |
| 21 | Manuel Camacho López | España-centro + España-sur |  |
| 22 | Nil Figueroa Crespo | España-sur + España-centro |  |
| 23 | Rafael Moreno Navarro | España-centro + España-sur |  |
| 24 | Nuria Ibáñez González | España-norte |  |

**Semilla 3** — personaje: **Rodrigo Climent Villar** (España-sur + España-norte; padres: España (sur) + España (norte)). 3 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 3; · solo el segundo apellido).

| # | Compañero | Origen | |
|--:|---|---|---|
| 1 | Hèctor Cabrera Bravo | España-centro |  |
| 2 | David Cortés Garrido | España-sur |  |
| 3 | Diana Rivas Ferrer | España-sur + España-centro |  |
| 4 | Alba Mateo Rubio | España-norte + España-centro |  |
| 5 | Cecilia Esteban Cruz | España-sur |  |
| 6 | Lucas Méndez Blanco | España-sur |  |
| 7 | Julián Escobar Godoy | Latinoamérica |  |
| 8 | Fang Cheng Durán | España-centro + Asia oriental | ✱ |
| 9 | Olivia Merino Escudero | España-centro + España-norte |  |
| 10 | Rodrigo Campos Santiago | España-norte + España-centro |  |
| 11 | Leyre Mora Méndez | España-sur + España-centro |  |
| 12 | Olivia Marino Carrizo | Latinoamérica + España-centro |  |
| 13 | Milagros Vidal Núñez | España-sur |  |
| 14 | Sebastián Corral Aguilar | España-sur + España-centro |  |
| 15 | Inés Silva Ibarra | España-sur + España-centro |  |
| 16 | José Carlos Medina Aguilar | España-sur + España-norte |  |
| 17 | Pau Gallego Montes | España-norte |  |
| 18 | Iker Xu Sosa | Asia oriental + Latinoamérica | ✱ |
| 19 | Eugenia Esteban Romero | España-centro + España-sur |  |
| 20 | Daniela Martínez Fuentes | España-norte + España-centro + España-sur |  |
| 21 | Iván Sanz Sáez | España-sur + España-norte |  |
| 22 | Milagros Calderón Ramos | España-sur + España-centro |  |
| 23 | Juan Ma | Asia oriental | ✱ |
| 24 | Ana Bravo Méndez | España-centro + España-norte |  |

**Semilla 4** — personaje: **Axel Paz Correa** (España-sur + Latinoamérica; padres: España (sur) + Latinoamérica). 1 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 0; · solo el segundo apellido).

| # | Compañero | Origen | |
|--:|---|---|---|
| 1 | Claudia Vargas Molina | España-sur |  |
| 2 | Jan Fernández Pascual | España-centro |  |
| 3 | Óscar Prieto Georgescu | España-centro + Europa del este | · |
| 4 | José María Mora García | España-sur + España-centro |  |
| 5 | Jessica Díez Lozano | España-sur |  |
| 6 | Oliver Bernal Bermúdez | España-centro + España-norte |  |
| 7 | Arturo Prieto Nadal | España-centro + España-sur |  |
| 8 | María Nieves Expósito Gallego | España-norte |  |
| 9 | Nora Martínez Gutiérrez | España-sur + España-norte |  |
| 10 | Almudena Campos Climent | España-sur + España-centro |  |
| 11 | Laura Hernández Otero | España-norte + España-sur + España-centro |  |
| 12 | Leire Martín Pascual | España-norte |  |
| 13 | Leo Ortega Méndez | Latinoamérica + Europa del norte + España-sur |  |
| 14 | Miguel Santiago Vicente | España-norte + España-centro |  |
| 15 | Lorenzo Teruel Carrillo | España-centro |  |
| 16 | Alejandra Romero Campos | España-centro + España-sur |  |
| 17 | Vera Sala Bautista | España-norte |  |
| 18 | José Suárez Ibarra | Latinoamérica |  |
| 19 | Constanza Vicente Martínez | España-centro + Latinoamérica |  |
| 20 | Hèctor Noguera Lorente | España-centro + España-norte |  |
| 21 | Ismael León Lozano | España-norte + España-centro |  |
| 22 | Adam Herrera Martín | España-centro + España-sur |  |
| 23 | Gabriel Pérez Marino | España-norte + España-sur |  |
| 24 | Dani Jiménez Vázquez | España-sur |  |

**Semilla 5** — personaje: **Marcos Giménez Cordero** (España-centro + España-sur; padres: España (centro) + España (sur)). 3 de 24 suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: 2; · solo el segundo apellido).

| # | Compañero | Origen | |
|--:|---|---|---|
| 1 | Arnau Ionescu | Europa del este | ✱ |
| 2 | Dani Ponce Estévez | España-centro |  |
| 3 | Alba Miranda Rodríguez | España-centro + España-sur |  |
| 4 | Unai Soler Ramírez | España-sur + España-centro |  |
| 5 | Inés Nieto Aranda | España-norte + España-sur + España-centro |  |
| 6 | Amaia Cuevas Pascual | España-norte + España-sur |  |
| 7 | Teo Soto Morales | España-norte + España-sur |  |
| 8 | Sonia Martín Duran | España-norte + España-centro |  |
| 9 | Moisés Suárez Marino | España-norte + España-centro |  |
| 10 | Miguel Álvarez Giménez | España-sur + España-centro |  |
| 11 | Belén Bermúdez Núñez | España-sur + España-norte |  |
| 12 | Imanol Abad Esteban | España-norte + España-sur |  |
| 13 | Lorena Morales Espinosa | España-centro + España-norte |  |
| 14 | Inés Toledo Martín | España-centro |  |
| 15 | Samuel Díaz Giménez | España-centro + España-sur |  |
| 16 | Cesar Quesada Carrasco | España-sur + España-centro |  |
| 17 | Bogdan Rusu Navarro | Europa del este + Latinoamérica | ✱ |
| 18 | Jaime Rojas Calderón | España-sur + España-centro |  |
| 19 | Nil Quesada Navarro | España-sur + España-centro |  |
| 20 | Andrea Funes Roberts | Latinoamérica + Europa del norte | · |
| 21 | Mikel Ponce Suárez | España-norte + España-centro |  |
| 22 | Emma Reyes Escobar | Latinoamérica |  |
| 23 | Adriana Zamora Ruiz | España-sur + España-centro + España-norte |  |
| 24 | Gabriela Ortiz Díez | España-norte |  |

Suenan extranjeros por semilla: 1, 3, 3, 1, 3 (media 2.2 de 24).

