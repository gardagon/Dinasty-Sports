# Anexo: nombres, apellidos, orígenes y países

Cómo se ponen nombre y apellidos a las personas, de dónde salen los datos y cómo se amplía (más culturas, más países). Código: `packages/contracts/src/nombres.ts` (reglas) y `packages/contracts/src/culturas/` (datos). Decidido con el usuario el 29/10/2026 (ver `DECISIONES.md`).

## 1. Orden de generación: primero el origen, luego el nombre

Antes, el origen y el aspecto salían de un sorteo y el nombre de una lista fija española, sin relación (una madre de Europa del este podía llamarse «Patricia Robles Martín»). Ahora **cada persona sortea su origen y de él salen su nombre y apellidos**.

- **Los padres** salen de la **semilla** (`padresDeSemilla`, `origenDePadre`): el origen de cada uno es una función de la semilla, así la pantalla de «Nueva partida» (que enseña los apellidos antes de crear la partida) y el motor (que genera sus rasgos y aspecto, `rasgosAlAzar({ origen })`) coinciden. Las partidas ya guardadas conservan los nombres que tenían (se guardan en el estado).
- **El resto** (compañeros, rivales, profesores, vecinos, entrenadores, hermanos): se sortean los rasgos (con su origen) y después el nombre.

## 2. Reglas del nombre de pila (decididas con el usuario)

| Caso | Nombre de pila |
|---|---|
| **Un solo origen** (los dos padres indios, por ejemplo) | Siempre del origen. Nunca uno del país de juego. |
| **Mezcla** de orígenes | Uno de los orígenes de la mezcla, según su peso (el 50 % cada uno si los padres pesan igual). |
| Mezcla **sin el origen del país de juego** | Además, un **12 %** de las veces (`PROBABILIDAD_DE_NOMBRE_LOCAL`) el nombre es del país de juego. |
| **Nacidos aquí** (menos de 25 años) con el dato `nombreLocalDeLosNacidosAqui` (la ciudad grande: **20 %**) | Con un solo origen de fuera o en una mezcla sin origen local, el nombre es del país de juego con esa probabilidad (en el último caso sustituye al 12 %). Sin el dato (España, Argentina, Inglaterra, ciudades sin él), como arriba. Los adultos no lo usan. El dato es del país o de la ciudad (`nombreLocalDelLugar`). |
| Hijo de padres de orígenes distintos | Su origen es la mezcla de los de sus padres, y el nombre sigue la regla de la mezcla. |

- **Compuestos:** José Manuel, María José, Juan Carlos… (lista por cultura, con su probabilidad: en España el 16 % de los adultos y el 3 % de los jóvenes). **Se muestran enteros** («José Manuel»), no solo la primera palabra.
- **Por generación (30/10):** cada cultura tiene lista de nombres «jóvenes» y de «adultos». **Los adultos usan la suya** (85 % de las veces; el resto, algún nombre «joven»). **Los niños y las futuras generaciones (menos de 25 años, `EDAD_DE_NOMBRES_JOVENES`) usan la unión de las dos listas sin repetir** (`unidos`), con los de su generación primero: una niña de 9 años puede llamarse Lucía o Patricia, pero Lucía sale más.
- **Frecuencia:** las listas van del más al menos frecuente y el primero pesa 5 veces lo que el último.

### Cómo se le llama: nombre corto y apodo

- `NpcView.nombreCorto` = **el apodo si lo tiene y, si no, el nombre de pila entero** (`nombreCortoDe`). Sale en las acciones («Charlar un rato con José Manuel»), los diarios y los textos. Cada persona guarda `nombrePila` y `apodo`; las partidas guardadas sin ellos usan la primera palabra del nombre.
- **Apodos al azar:** cada cultura puede dar apodos habituales de un nombre (`Cultura.apodos`: José Manuel → Chema, Josema; Francisco → Paco, Curro; María José → Majo; Mohamed → Momo…). Una persona con un nombre que los tiene lo lleva con un **35 %** (`PROBABILIDAD_DE_APODO`); el sorteo sale de su nombre completo (siempre el mismo, sin gastar azar de la partida).
- **Apodo del jugador:** en la ficha de cada persona que conoces hay un cuadro «Apodo» (hasta 20 letras; vacío lo quita). Es la acción `npcs.apodo.<persona>.<apodo>` (1 minuto; `idDePonerApodo`, `apodoDeId`) y no cambia la relación.

## 3. Apellidos

- **Las personas del mundo** (compañeros, rivales, profesores, vecinos…) llevan los apellidos de su cultura: **dos** (España, Latinoamérica: `Cultura.numeroDeApellidos`) o **uno** (el resto del mundo, **también los niños**: como en la realidad). Una mezcla con un origen hispano lleva dos, uno de cada origen; una mezcla de orígenes no hispanos, uno.
- **La familia del personaje** (los padres, él y sus hermanos) sigue la regla de España: **los hijos llevan el primer apellido del padre y el primero de la madre** (`PaisDeNombres.apellidosDeLosNacidosAqui`), aunque un padre extranjero tenga solo uno. Si la madre es de Europa del este, el segundo apellido del hijo es el de ella («García Kowalski»); no «Robles Martín».
- **Forma femenina:** en las culturas eslavas el apellido cambia según el sexo (`Cultura.femenino`: Kowalski → Kowalska, Ivanov → Ivanova). Se guarda la forma de base y se muestra la de cada persona (`formaDeApellido`): la madre es «Kowalska» y su hijo, «Kowalski».
- **Las familias del mundo (hogares, 24/11/2026, `CiudadDef.hogares`):** los niños de los colegios salen de una familia con sus progenitores (personas del mundo, con la regla de arriba según su cultura) y llevan la **misma regla de España** (`identidadDeHijo`): el primer apellido del padre y el primero de la madre. **Los hermanos comparten esos dos apellidos** (con la forma femenina cuando toque: la hermana de «Kowalski» es «Kowalska»). En un hogar monoparental el progenitor que falta sigue aportando su apellido (el hogar guarda su nombre y el motivo de que no esté). Los nombres completos siguen sin repetirse más de la cuenta (`nombreUnico`, la regla de homónimos de arriba). Los hogares de una partida guardada antes del 24/11 no existen (no se migran): sus niños conservan los nombres de siempre.
- Los padres de una semilla no pueden compartir el primer apellido.

## 4. Homónimos (nombres repetidos)

Se permiten, con límites (`nombrePermitido`, `RegistroDeNombres`): **como mucho 2** personas con el mismo nombre completo y **de momentos distintos**: **15 años o más** de diferencia de nacimiento (`AÑOS_ENTRE_HOMONIMOS`). Así un niño puede llamarse como su padre, pero no hay dos «Nicolás Sánchez Ruiz» en el mismo colegio. (Cuando el personaje tenga hijos habrá que comprobarlo al nombrarlos.)

## 5. Los datos: culturas

`culturas/<región>.ts`; una **reserva** agrupa las culturas de una parte del mundo y cada origen (`OrigenDef.reserva`, en `rasgos.ts`) apunta a una. Una persona elige **una cultura** de la reserva (por su peso) y saca de ella el nombre y los apellidos (no salen mezclas como «Hiroshi Zhang»).

| Reserva | Culturas | Notas |
|---|---|---|
| `espana` | España | ≈190 nombres de mujer y ≈180 de hombre (jóvenes y adultos), 30 compuestos de cada sexo, ≈260 apellidos |
| `latinoamerica` | Latinoamérica hispanohablante | dos apellidos |
| `magreb` | Magreb | un apellido (con «El», «Ait»…) |
| `africa_subsahariana` | África occidental, África central y del golfo (incluye Guinea Ecuatorial) | un apellido |
| `europa_este` | Rumanía, Polonia/Ucrania/Rusia, Bulgaria/Balcanes | un apellido, con forma femenina en las eslavas |
| `europa_norte` | Británica, continental (alemana, francesa, italiana, nórdica, neerlandesa) | un apellido |
| `asia_oriental` | China, Japón/Corea/Vietnam | un apellido |

Cada lista es un texto separado por comas (`lista('a, b, c')`): se pueden añadir o quitar nombres sin tocar el código. `registrarReserva(id, culturas)` añade o sustituye una reserva (lo usará un paquete de país o un mod).

## 6. Países (hecho, fase 2)

El país se elige al crear la partida, se guarda en ella (`GameState.pais`) y **cambia la gente**: la **demografía** de orígenes (`PaisDef.demografia`, que sustituye a `ORIGENES.frecuencia`), los orígenes **locales** (de donde sale el nombre «local» de las mezclas), los **nombres y apellidos** (cada paquete añade sus culturas y orígenes) y cuántos **apellidos** llevan los nacidos allí (en España 2; en **Argentina e Inglaterra, 1: el del padre**, también el personaje y sus hermanos). Todo lo que define un país —calendario, currículo, categorías, horarios— y cómo importar paquetes está en **`PAQUETES_DE_PAIS.md`**.

- **Argentina:** culturas «criolla» e «italiana» (nombres argentinos; apellidos españoles/de la región o italianos), origen propio (aspecto), demografía con mayoría argentina.
- **Inglaterra:** británicos, Asia del sur (india/sikh —«Singh» pasa a «Kaur» en las mujeres— y paquistaní/bangladesí), afrocaribeños británicos y el resto de orígenes con su peso.
- Los orígenes que añade un paquete llevan `frecuencia: 0` (su peso está en la demografía de su país): así no cambian la población de España.

## 7. Cuánta gente es de fuera y cómo se emparejan los padres (demografía de orígenes)

Decidido con el usuario el 17/11/2026 tras medir el mundo con `npm run demografia` y compararlo con el INE (informe: `docs/relevo/demografia-origenes.md`). Antes los dos padres de una persona se sorteaban por separado con la demografía (25 % de origen extranjero): el 46 % de los personajes tenía algún padre de fuera y el 39 % salía mestizo.

- **Demografía de España** (`ORIGENES.frecuencia`): ~19 % de origen extranjero. España norte/centro/sur 16,2/32,4/32,4 %; Latinoamérica 6; Magreb 4; Europa del este 3,5; África subsahariana 1,7; Asia oriental 1,8; Europa del norte 2. No pretende copiar la realidad (INE: 14,6 % de nacionalidad extranjera y 20,2 % de nacidos fuera en 2026), sino acercarse a ella con la riqueza de culturas que busca el juego.
- **Parejas por tipo** (`PaisDef.parejas`, `ParejasDef` en `rasgos.ts`, `origenesDePareja`): se sortea primero el **tipo de pareja** y luego los orígenes de cada uno: **13 %** dos de fuera (el **70 %** del mismo origen), **12 %** mixta (uno de fuera y otro de aquí, el orden al azar) y **75 %** las dos de aquí. «De fuera» = origen que no está en `origenesLocales`.
- **A quién se aplica:** a los **padres del personaje** (`origenDePadre`: una sola tirada de la semilla, `rngEstable('origen', seed, 'pareja')`) y a los **niños del mundo** (`persona(..., conGenetica)`: compañeros, niños de otros colegios y vecinos niños se sortean como hijos de una pareja; `rasgosAlAzar({ hijoDePareja })`). Los **adultos** del mundo (vecinos, profesores, entrenadores) siguen sorteándose sueltos con la demografía. Los hermanos heredan de los padres, como siempre.
- **Sin `parejas`** (Argentina e Inglaterra: `copiaDeEspana` no hereda las de España), los padres se sortean por separado con su demografía **exactamente como antes**: sus semillas no cambian (lo comprueba `parejas.test.ts`).
- **Resultado medido** (España, ciudad grande): adultos 20,6 % con origen de fuera; personaje y niños con algún padre de fuera 25,0 % (antes 45,7 % y 27 %); personaje mestizo 12,0 % (antes 38,5 %); parejas de dos de fuera del mismo origen 70 % (antes 15 %).
- **Por ciudad:** `CiudadDef.demografia`, `CiudadDef.parejas` y `CiudadDef.nombreLocalDeLosNacidosAqui` (opcionales) sustituyen a los del país en esa ciudad (`demografiaDelLugar`, `parejasDelLugar`, `nombreLocalDelLugar`). Una ciudad sin ellos hereda los del país. **La ciudad grande (18/11/2026, `docs/relevo/nombres-nacionales.md`):** demografía **de una ciudad como Madrid**: el mismo 19 % de fuera, pero repartido como la Comunidad de Madrid (América 51,9 %, Europa 28,7 %, Asia 9,8 %, África 9,5 %): Latinoamérica 9,9; Europa del este 3,0; Europa del norte 2,4; Asia oriental 1,9; Magreb 1,2; África subsahariana 0,6 (España: 6; 3,5; 2; 1,8; 4; 1,7). Más latinoamericanos = más nombres y apellidos hispanos, sin cambiar el porcentaje de orígenes. Y `nombreLocalDeLosNacidosAqui: 0.2`. Los repartos Europa este/norte y Magreb/subsahariana son supuestos (sin dato por país). **No cambia el orden de los apellidos** (el de la mezcla sigue al nombre).
- **Cambia las semillas** de España: los mismos números de semilla dan otros padres, origen y nombres. Las partidas guardadas conservan los suyos (se guardan en el estado).
