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

## 6. Países (plan, fase 2)

Hoy el país es solo una etiqueta (el selector de «Nueva partida» está desactivado en España). **Lo que cambia con el país**: la demografía de orígenes (`ORIGENES.frecuencia`), qué orígenes son «locales» (`PaisDeNombres.origenesLocales`), la convención de apellidos de los nacidos allí y, a más largo plazo, calendario, currículo y categorías deportivas.

**Paquetes de país (addons importables).** Idea del usuario: cada país es un paquete de datos que se puede importar, igual que los deportes, para no cargar todos los países en cada partida. Un paquete contiene:

1. **Identidad:** id, nombre, idioma de los textos.
2. **Demografía:** pesos de los orígenes del país y los orígenes «locales».
3. **Nombres y apellidos:** las culturas que añade (o sustituye) en `registrarReserva`.
4. **Calendario escolar** (`CalendarioPais`), **currículo** (asignaturas por curso), **categorías deportivas por edad**, **horarios** de colegios y comercios, **festivos**.
5. **Convención de apellidos** de los nacidos allí.

**Primera tanda decidida (29/10):** **España**, **Argentina** y quizá **Inglaterra**. Para cada país nuevo se **copia primero lo de España con el nombre del país** (calendario, currículo, categorías…) para que después solo haya que cambiar los datos sin tocar el código; las partidas nuevas eligen el país y lo guardan en el estado (las antiguas son España). Lo que no tenga paquete usa el de España.

Estado: la fase 1 (este anexo, §1–§5) está hecha; los paquetes de país, el selector activo y el guardado del país en la partida son la fase 2.
