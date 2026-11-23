# Relevo: hogares (análisis y propuesta)

Sesión `claude/hogares` (sale de `claude/youthful-clarke-vs0kye`), 23/11/2026. Es la F3 del encargo «gente por la calle y hogares»: padres y madres de los niños que ya existen, adultos sin hijos, niños pequeños y bebés **como personas de verdad**, mascotas preparadas, y cuánto cuesta meter tanta gente. **Solo análisis con propuesta: no se ha cambiado el juego**, ni `DECISIONES.md`, ni los anexos. `npm run huella -- 60` sale idéntica (ver «Comprobaciones»).

Nota: la entrada del 23/11 «Gente por la calle y hogares; dormir» de `DECISIONES.md` **no está en la rama de partida** (la última entrada es «Una partida no depende de las anteriores del mismo proceso»); he trabajado con el texto del encargo.

Herramientas nuevas en `tools/` (no tocan el juego; semilla 31, ciudad grande con atletismo y fútbol):

| Herramienta | Qué hace |
|---|---|
| `tools/hogares-modelo.ts [grande\|actual]` | Mira a los niños que ya hay (edades, apellidos, orígenes) y cuenta cuántas familias, progenitores, abuelos, hermanos y niños de 0 a 7 harían falta (§1, §2, §6) |
| `tools/hogares-coste.ts [personas…] [--sin-agenda]` | Genera con `persona()` los adultos y niños pequeños del modelo, los añade **solo en memoria** a una copia del estado (más allá del modelo completo, rellena con copias de niños con capacidades: el peor caso) y mide peso, cargar, guardar, presencia, lista de acciones y pasada de semana (§6) |

---

## 0. Resumen

1. **El mundo de hoy son 6.113 personas y casi todas son niños:** 5.917 de 8 a 19 años (≈ 500 por edad de 8 a 17, ≈ 450 a los 18 y 19), 190 adultos de 20 o más (profesores, entrenadores, 80 vecinos, bibliotecarios) y los hermanos del personaje. **Ningún niño tiene padres** (salvo los del personaje). Darles familia es lo que dispara la población, no los adultos «de relleno».
2. **Modelo propuesto de hogares con hijos:** ≈ 3.650 familias para los 5.920 niños de 3 a 19 años (media 1,62 por familia), 20 % monoparentales, 5 % con un abuelo en casa. Hacen falta **≈ 6.560 progenitores y 270 abuelos** nuevos.
3. **Coherencia (§2): recomiendo derivar los padres de los hijos** (herencia inversa) y **generar hacia delante** a todo el que aún no existe (bebés, hermanos pequeños). Los apellidos y el origen se invierten **sin pérdida**, y los 13 rasgos de la cara también (la herencia de cada rasgo es de dos valores y se puede invertir exactamente). Los niños ya generados **no cambian** (la huella de sus nombres, rasgos, equipos y deportes se conserva). La alternativa (padres primero y rehacer a los 5.900 niños) cambia todo el mundo.
4. **Población:** de 6.113 a **14.550 (H-mínimo: padres, abuelos y los niños de 0 a 7 que tienen un hermano en el colegio)** o **19.940 (H-completo: todos los niños de 0 a 7 con su familia)**. Con el 40 % de hogares con hijos del INE sería una ciudad de ~33.000. **15.000 es H-mínimo.**
5. **Coste medido (escritorio):** +7,4 MB de estado (16,2 → 23,6 MB, +46 %) en H-mínimo y +12,1 MB (28,3 MB, +75 %) en H-completo; **la pasada semanal no cambia** (los adultos y los pequeños no tienen capacidades); **la presencia sí sube** si los adultos tienen agenda de calle (1.ª consulta de 6,9 a 11–19 ms; con adultos sin agenda, no sube: 4,8 → 5,2 ms). Lo que se rompe **primero** en un móvil es **crear** (ya 33 s a ×4), después el peso de lo guardado y cargado, y mucho después la semana. Los adultos y los pequeños **no cuestan nada por semana**; lo que escala mal es el número de **niños con capacidades** (las «ligas de todo el mundo»).
6. **Recomiendo:** fases H1 (padres y hermanos de los que ya hay, con el vínculo y la recogida de verdad) → H2 (niños de 0 a 7, nacimientos y ciclo anual) → H3 (adultos sin hijos y calles) → H4 (mascotas), y **medir el crear en un móvil antes de H2** (§8).

---

## 1. Modelo de hogar

### 1.1 Qué cifras hay y de dónde salen

Hay **dos poblaciones** que no se deben mezclar:

- **Los hogares con hijos en edad escolar** salen **de los niños que ya existen**: no se eligen porcentajes de «cuántas parejas con hijos hay en una ciudad», se **reparte a los 5.920 niños de 3 a 19 años en familias**. Aquí las cifras que se eligen son el tamaño de la familia y el tipo.
- **Los hogares de relleno** (adultos solos, parejas sin hijos, compañeros de piso, abuelos que viven solos) son adultos que **hoy no hay**. Aquí sí sirven las proporciones del INE, y el número es una perilla (el `vecinos` de la ciudad, hoy 80).

**Lo que sé del INE (Encuesta Continua de Hogares), con fuentes** — lo comprobé en la búsqueda de esta sesión, y lo que no pude confirmar va marcado:

| Dato | Valor | Estado |
|---|---|---|
| Tamaño medio del hogar | **2,50** personas (2,49 en 2017, 2,50 en 2019–2020; proyección 2,49 en 2026 y 2,32 en 2039) | ✅ INE: [ECH 2017](https://www.ine.es/prensa/ech_2017.pdf), [ECH 2019](https://www.ine.es/prensa/ech_2019.pdf), [proyección 2026–2041](https://www.ine.es/dyngs/Prensa/PROH20262041.pdf) |
| Hogares unipersonales | **24,2 %** (2013) y **25,4 %** (2017); en 2026 ~26 % | ✅ [INE np837](https://ine.es/prensa/np837.pdf?origen=app), [ECH 2017](https://www.ine.es/prensa/ech_2017.pdf) |
| Hogares de dos personas | 30,4 % (2018) | ✅ [España en cifras 2019](https://ine.es/prodyser/espa_cifras/2019/24/) |
| Pareja con hijos | ~34 % | ⚠️ visto en una tabla de [España en cifras 2018](https://www.ine.es/prodyser/espa_cifras/2018/24/) sin poder confirmar la categoría exacta |
| Parejas sin hijos ~21 %; monoparentales ~10 % de todos los hogares (≈ 20 % de los hogares con hijos, el 80 % con la madre); otros (varias generaciones, compañeros de piso…) ~10–12 % | | ⚠️ **de memoria, sin confirmar** (la búsqueda no devolvió las tablas). Hay que contrastarlas con las tablas de la ECH antes de dejar nada en un anexo |

Todo lo marcado ⚠️ es **orden de magnitud**: no cambia el diseño y se calibra con una constante.

### 1.2 Hogares con hijos: cuántos y cómo (los 5.920 niños que ya hay)

| Parámetro (en `tools/hogares-modelo.ts`) | Valor propuesto | Por qué |
|---|---|---|
| Niños de 3 a 19 años por familia | 1 → 52 %, 2 → 36 %, 3 o más → 12 % (media **1,62**) | Cuentan solo los de 3 a 19 años: una familia de dos hijos suele tener uno menor de 3 o mayor de 19. ⚠️ calibrado a ojo con la media española de hijos por familia con hijos dependientes |
| Monoparentales | **20 %** de las familias | ⚠️ ver arriba. 80 % con la madre |
| Con un abuelo en casa | **5 %** (1,5 abuelos de media) | ⚠️ estimado; es lo que da «abuelos en el parque» sin llenarlo |
| Tipos | Pareja con hijos 75 %, monoparental 20 %, abuelos que viven con la familia 5 % (se suma a cualquiera de las dos) | |

Resultado: **3.645 familias con hijos, 6.561 progenitores y 273 abuelos** (`npx tsx tools/hogares-modelo.ts`).

Las edades de los padres salen de la del hijo mayor menos la edad a la que tuvieron al primero (madre ≈ 31 ± 4,5, mínimo 18; padre 1–3 años más): con hijos de 8 a 17, los padres tienen 38–52 años (coincide con los 38 a 54 de los padres del personaje); con hijos de 18–19, 45–58. Abuelos: 65–85.

### 1.3 Hermanos entre los niños que ya existen

Hay **~1.750 familias con 2 o más niños** de 3 a 19 años. Ejemplo: dos alumnos de cursos distintos que viven en la misma casa. **El problema es que hoy no se parecen en nada:** cada niño del mundo tiene dos apellidos sorteados por su cuenta.

Medido: **solo 69 parejas** de niños (el 2,3 %) comparten apellidos y origen y se llevan de 1 a 6 años, así que podrían ser hermanos **sin tocar ningún nombre**. Para las otras ~1.680 familias de 2 o más hay tres caminos:

| Camino | Qué cambia | Fidelidad |
|---|---|---|
| **a) Renombrar al pequeño** al emparejar (toma los apellidos del mayor) | El nombre de ~1.700 niños (los menores de cada pareja) cambia; su resto (rasgos, genética, deporte) no | Media: cambia un dato que ya vio el jugador, pero solo el apellido, y solo antes de que lo conozca (al crear la partida) |
| **b) Emparejar solo los 69 naturales** y que el resto de hermanos sean los **nuevos** (los menores de 8 nacen como hermanos de un niño que ya está: §3) | Nada de lo que existe | Alta, pero hay pocos hermanos entre los del colegio (los de 8–19 serían casi todos hijos únicos entre sí) |
| **c) Mixto: b) + a) hasta un porcentaje** | Renombra solo hasta tener la proporción que se quiera de hermanos entre los de 8–19 | Recomendado: ver §8, duda 3 |

Los emparejados tienen que tener **el mismo origen** (los dos hijos de una pareja con el mismo origen, mezcla incluida) y de 1 a 6 años de diferencia (lo mismo que `diferenciasDeEdad` y `DIFERENCIA_MAXIMA_DE_EDAD` para los hermanos del personaje); se **emparejan por colegio y barrio** con cercanía (un hermano en el colegio del personaje y otro en un colegio de fuera es lo normal, y lo da la distribución de los colegios).

### 1.4 Dónde vive cada hogar

Hoy la gente vive «fuera del mapa»: solo la familia del personaje tiene `casa` en su agenda. El mapa tiene cuatro calles (`calle_casa`, `calle_colegio`, `avenida_parque`, `avenida_estadio`), y la propuesta de gente por la calle (F1) pone una marca `vive` en los vecinos. **Unifico las dos ideas:** el hogar tiene `calle` y `portal`.

```
Hogar { id, tipo: 'pareja'|'monoparental'|'solo'|'pareja_sin_hijos'|'piso_compartido'|'abuelos',
        calle: 'calle_casa'|'calle_colegio'|'avenida_parque'|'avenida_estadio'|null,   // null = otro barrio, fuera del mapa
        portal: number }                                                                // el portal de esa calle (el personaje vive en el suyo)
```

- **Cuántos viven en cada calle**: el barrio del mapa no puede tener 5.000 hogares. Una calle son **unos 20–40 portales**. Propongo que solo viva **en las cuatro calles del mapa un 10–15 % de los hogares** (≈ 500–800: 2 a 4 portales en cada calle y el del personaje) y que el resto viva «en otro barrio» (`calle: null`, fuera, como hoy). La proporción por calle se reparte con el colegio (los alumnos del colegio del personaje viven más en `calle_colegio` y `calle_casa`), a calibrar.
- **Quién ve a quién**: quien comparte portal con el personaje es «el vecino del 3.º». Quien comparte calle sale por ella a las 7:00–8:30 (F1). Esto es justo la lista de `Vecinos del portal` de `gente-por-la-calle.md` §2.1, **con nombre, hijos y trabajo**.
- **Dónde se guarda**: `hogar` (un texto de ~12 B) en cada persona y una tabla de hogares en `npcs` (calle y portal, ~25 B por hogar: 5.300 hogares son ~130 KB). Ver §2.5.

### 1.5 Los demás tipos (relleno, perilla)

| Tipo | INE | En la propuesta |
|---|---|---|
| Adultos solos | ~26 % de los hogares | Jóvenes de 22–35 que ya no viven con los padres y mayores de 65; viven en `calle_casa`, `avenida_parque`… |
| Parejas sin hijos | ~21 % ⚠️ | 28–45 años (y mayores con hijos ya fuera) |
| Compañeros de piso jóvenes | parte de «otros» ~10 % ⚠️ | 20–29 años, 2–3 personas. Son **los 18–19 de hoy cuando se vayan** (§3.4) |
| Abuelos que viven solos | parte de «solos» | Los jubilados de F1 (67+): cada uno puede ser abuelo de niños concretos (§5) |

**No se propone rellenar la ciudad a escala INE** (con el 40 % de hogares con hijos serían ~13.300 hogares y **~33.000 personas**). Los hogares de relleno son una perilla; empiezan con los que dan vida a las calles (F3 de la gente por la calle: +150).

---

## 2. Coherencia con lo que ya existe

### 2.1 Qué tienen hoy los niños (y qué guardaron de sus padres inexistentes)

Cada niño del mundo (`persona(..., conGenetica)`, `geneticaDeNino`) sale de **una pareja sorteada y descartada**:

- **Origen:** `origenHeredado(...origenesDePareja(...))` — la lista del origen del niño conserva el orden **[padre, madre]**. De 5.911 niños, 2.045 tienen un solo origen y 3.866 una mezcla (casi todas, entre las regiones de España: «sur + centro» 1.435, «sur + norte»…). **Se puede invertir exactamente**: el origen 1.º es el del padre y el 2.º el de la madre (un origen solo: los dos de ese origen).
- **Apellidos:** `identidadAlAzar` con el origen del niño: dos (cultura hispana, uno de cada origen de la mezcla) o uno (resto del mundo). El nombre completo es lo único que se guarda (`name`). 5.603 de 5.920 tienen 2 o más palabras de apellido.
- **Rasgos:** `rasgosAlAzar({ hijoDePareja })` — **el niño del mundo no hereda de nadie**: sus rasgos de la cara se sortean con la media de su origen. Por eso hoy un niño y su «padre» no se parecerían.
- **Genética deportiva:** `geneticaDeNino` sortea **dos perfiles de padres con calidad** (`calidad: { padre, madre }`) y deja en el niño sus `topes` (cada capacidad, de uno de ellos ±20 %), la ventaja de crianza y **lo que practicó cada padre** (`padres: { padre: 'ninguna'|… }`). Los perfiles se **descartan**; la calidad y la práctica **se guardan**.

Los padres tienen que cuadrar con eso, no contradecirlo: la práctica deportiva, la calidad, el origen y los apellidos ya están decididos.

### 2.2 Tres opciones

| | **A. Padres primero, se rehace a los hijos** | **B. Hijos primero, se derivan los padres** (herencia inversa) | **C. Mixto (recomendada):** B para los que ya existen, A (hacia delante) para todo el que aún no existe |
|---|---|---|---|
| Qué es | Se generan los progenitores con `persona()` y cada niño se vuelve a generar con `rasgosHeredadosNpc` y `geneticaDeHermano` (como hace hoy con los hermanos del personaje) | Cada niño (o par de hermanos) conserva todo; sus padres se construyen para que `rasgosHeredadosNpc` hacia delante pudiera haberlos producido | Los 5.900 niños de hoy quedan como están y sus padres salen invertidos; **los bebés, los hermanos menores de 8 años y los que entran cada curso se generan desde los padres, hacia delante** |
| Huella | **Cambia todo**: nombres, rasgos, genética, equipos, calendario, qué niño está en qué equipo, cada bot. Cambia hasta el azar de lo que se sortea después | Los niños, equipos y partidos **no cambian**. Cambian lo que se añade (presencia, aforo, sucesos) | Igual que B |
| Fidelidad a la visión | Máxima en teoría (las mismas reglas para todos, herencia de verdad desde el principio) | Alta: ver 2.3. Los rasgos discretos y los valores de la cara se invierten **sin pérdida**; los continuos, de forma estadística | Alta, y es la que usa **un solo mecanismo por dirección** |
| Coste de crear | Rehacer 5.900 niños con genética (4 s de historia deportiva + nombres) | +0,6–2 s (43 µs por persona con `persona()`, la inversión algo más) | Igual que B + el de los bebés |
| Riesgo | Alto: todos los informes y calibraciones hechos con estos niños (reparto de equipos, benjamines, balances) habría que rehacerlos | Bajo | Bajo |

**Recomiendo C.** A no es «más fiel» en nada que el jugador pueda notar y tira trabajo hecho: quedaría para una versión nueva del mundo (si el usuario quisiera una partida «de otra generación»).

### 2.3 Cómo se invierte cada cosa (B)

Todas las tiradas de la inversión usan un generador **estable por hogar** (`rngEstable('hogar', semilla, id)`), no el de la partida: así los hijos y el resto del mundo no se mueven.

| Cosa | Inversión | Exacta o estadística |
|---|---|---|
| **Apellidos** | El 1.º apellido del niño es el 1.º del padre y el 2.º, el 1.º de la madre (regla de `ANEXO_NOMBRES` §3). El segundo apellido de cada padre se sortea con su cultura (no coinciden entre sí). Con un solo apellido, el niño lleva el del padre y la madre mantiene el suyo. Cada apellido va al padre cuyo origen es de esa cultura (se busca el apellido en las listas de `culturas/`) | Exacta |
| **Origen** | El del padre es el 1.º de la lista del niño y el de la madre el 2.º (un origen: ambos iguales) | Exacta |
| **Nombre de pila** | Del origen de cada uno, lista de adultos (`identidadAlAzar` con edad ≥ 25), mismas reglas de homónimos (`nombrePermitido`: no coinciden con nadie de menos de 15 años de diferencia, y el padre y el hijo sí pueden compartir nombre) | — |
| **Rostro (13 rasgos)** | Cada rasgo del niño es un par `[expresado, latente]` = **un valor de cada padre** (orden desconocido, se elige al azar). El padre guarda `[el que dio, otro sorteado con su origen]` y la madre igual. Con dos hermanos, el padre guarda el que dio a cada uno | **Exacta** (la herencia es mendeliana, sin mutación: `ANEXO_CUERPO` §7). Con 3 o más hermanos sería imposible dar a cada uno uno de dos valores: ver 2.4 |
| **Forma, color, distintivos** | De uno de los dos o mezcla según `aparienciaBaseHeredada`: cada padre toma el valor del hijo con probabilidad ~0,5 y el resto sale con su origen | Estadística |
| **Canas, calvicie, barba, envejecimiento** | Son «media de los padres ± ruido»: se reparten con `valor del hijo ± ruido` y la corrección por sexo (la calvicie del hijo es `0,6 × madre + 0,4 × padre`), y la edad de las canas se ajusta a la edad del padre | Estadística |
| **Carácter, intereses, gustos** | Igual: el del padre sale cerca del del hijo con ruido; los intereses del hijo caen dentro de los de sus padres (cada interés pasa con 60 %): el padre recibe los del hijo y alguno propio | Estadística |
| **Estatura y cuerpo** (`estatura`, `metabolismo`, `musculatura`: el hijo es `0,45 × (padre + madre) + 0,6 × z propio`) | **Regresión inversa:** el padre y la madre salen de `0,59 × z del hijo + ruido (σ = 0,86)`: así la herencia hacia delante reproduce la distribución del hijo (media y varianza) | Estadística (comprobable con un test: la media y la correlación de los padres con los hijos) |
| **Genética deportiva** | La calidad (`calidad.padre`, `.madre`) y la práctica (`padres.padre`, `.madre`) **ya están guardadas**: los progenitores las reciben tal cual. Los perfiles de topes (`topes`) de los padres se **derivan de los del hijo** (el padre guarda las capacidades en que el hijo salió a él) y se guardan solo si hay bebés que heredarán de ellos (§3) | Exacta para calidad y práctica |
| **Oficio** | `OFICIOS_DE_PADRES` según la calidad (más calidad → oficios de más nivel) y la práctica; el lugar del trabajo es «fuera» | — |

### 2.4 El caso difícil: tres hermanos o más

Con el mismo par de alelos por padre solo caben **dos** hijos que reciban cada uno uno de los dos valores. Para 3 o más (el 12 % de las familias), la inversión exacta de la cara es imposible. Salidas, por orden de preferencia: (1) **que los 3.º y siguientes sean hermanos nuevos generados hacia delante** (si la familia tiene tres niños en el colegio, el tercero es el que se generó desde los padres, ya sea renombrado o un hermano pequeño nuevo); (2) cuando un rasgo no cuadra, **se mira el valor más cercano** y el hijo se queda con su valor (diferencia de la cara ≤ 1/63, el paso de lo guardado); (3) aceptar una excepción (el sistema no pretende que un humano pueda verificar la cara de un hermano frente a la del padre). Recomiendo (1).

### 2.5 Qué se guarda para el vínculo

Lo mínimo para que «el padre de tu compañero» sea una pregunta con respuesta:

| Campo | Dónde | Peso |
|---|---|---|
| `hogar` (id del hogar) | cada persona | ~12 B |
| `padres: [idPadre, idMadre]` (uno o ninguno si es monoparental o no se conoce) | cada niño | ~30 B |
| Tabla `hogares` (tipo, calle, portal, mascotas) | `npcs` | ~25 B por hogar (5.300 hogares: ~130 KB) |
| Los hijos, los hermanos y los abuelos | **se calculan** con un índice al cargar (de `padres` y `hogar`), no se guardan | 0 |

Además cada progenitor guarda `hijos` solo si hace falta para los sucesos (no).

---

## 3. Niños pequeños y bebés como personas

### 3.1 Qué hay hoy

Los hermanos del personaje de menos de 8 años (de 2 a 7: `diferenciasDeEdad` los permite) **ya son personas**: tienen `tipos` (`hermano` con `duerme` si tienen menos de 8: 23:00–7:00 en casa, durmiendo; `escolar` desde los 3), cuerpo, rasgos heredados con `rasgosHeredadosNpc` y genética con `geneticaDeHermano`. Esa maquinaria es exactamente la que hace falta, y la usa hacia delante.

El mundo, en cambio, **no tiene nadie de menos de 8 años** (salvo esos hermanos): cada curso entran ~500 niños de 8 años que **aparecen de la nada** (`renovarAlumnos`, `ninosDeOtrosColegios(soloEntrantes)`). Es lo que la pregunta del usuario señala: «un vecino con un bebé que deja de aparecer, o que siempre aparece» tiene su respuesta si ese bebé es una persona que crece y entra al colegio a los 8.

### 3.2 Qué datos necesita un bebé

Igual que un niño de 8 años, pero sin capacidades (las gana al cumplir 8, como un hermano del personaje: `conCapacidades` a la entrada):

| | Tiene | Peso |
|---|---|---|
| Identidad | id, nombre, nacimiento, género, hogar, `padres` | ~150 B |
| Rasgos heredados (`rasgosHeredadosNpc`) | origen, apariencia (con cara), carácter (se manifiesta con los años), intereses, gustos | ~650 B |
| Cuerpo | `estatura`, `metabolismo`, `musculatura`, `cuerpo` y `hc` (historial) | ~60–100 B |
| Genética (`geneticaDeHermano`: topes, perks, ventaja) **calculada al nacer** | para que al cumplir 8 entre como los demás sin sortear nada | **~350 B (estimado, no medido)** |
| **Total** | | **≈ 880 B medidos (sin genética) + ~350 B = ~1,2 KB** |

(Medido en `hogares-coste`: adulto 900 B; niño de 0 a 7 con `persona()` sin genética 878 B; un niño de otro colegio con genética 2.887 B; el 70 % del peso del adulto es `rasgos` —649 B— y de ellos 218 apariencia, 162 gustos, 129 carácter.)

### 3.3 Nacimientos

**¿Nace gente cada año en los hogares? Sí, y es la única forma de que la población siga siendo estable y coherente.** El mecanismo, simple y barato (una pasada al cambiar de año, como `renovarAlumnos`):

1. Cada **1 de enero** (o por semanas con una tabla de probabilidades por edad de la madre) se recorren **los hogares** (~5.300), no las personas.
2. Cada pareja o madre sola de 20–44 años tiene un nacimiento con una probabilidad por edad (INE: la tasa de fecundidad es muy baja, ~1,1 hijos por mujer; en el mundo se calibra para mantener **~500 nacimientos por año**, que son los ~500 niños de 8 años que entran cada curso).
3. El bebé se genera hacia delante: apellidos del padre y de la madre, `rasgosHeredadosNpc`, `geneticaDeHermano`, y su `hogar`.
4. Al cumplir 8 años **entra al colegio** como los de hoy (los 500 que entran cada curso son estos, no «aparecen»).

Mortalidad (necesaria si el mundo dura 70 años: `sim:vida`): los mayores de 80 fallecen con la tabla de mortalidad (INE) y la persona **se archiva** (VISION 4): una pasada anual que cuesta lo mismo.

### 3.4 El ciclo de generaciones (la dinastía)

La idea de más calado del usuario encaja aquí **sin mecanismo nuevo**: un bebé del mundo y un hijo del personaje son **la misma cosa** (una persona nacida en un hogar con `padres`). Para que el ciclo cierre hace falta:

- **Irse de casa:** los de 18–19 años de un hogar pasan a un hogar propio (piso compartido de 2–3, o con la pareja) hacia los 20–25 (hoy se «archivan» al acabar los jóvenes sin colegio a los 20: `EDAD_FIN_JOVENES`).
- **Emparejarse:** la relación entre dos adultos jóvenes (§7) crea un hogar de pareja que, con la probabilidad por edad, tiene hijos.
- **Que el personaje forme su hogar:** a partir de ahí es el mismo modelo con el personaje como padre o madre (`padresDeSemilla`/`identidadDeHijo` ya hacen lo que hace falta para el apellido).

Esto es **H4 o posterior**: no se necesita para el primer paso, pero el modelo de H1–H2 lo permite sin rehacer nada (los `padres`, el `hogar` y los nacimientos en hogares son lo único que hace falta).

### 3.5 Tres niveles de bebé

| Nivel | Qué | Personas | Notas |
|---|---|---|---|
| **N0. Sin bebés** | Los progenitores y hermanos mayores; los de 8 años siguen entrando «de la nada», pero **con una familia que se acaba de mudar al barrio** (sus padres se derivan al entrar) | 0 | Lo más barato; es la H1 sola. Plausible (una parte real de los alumnos nuevos cada curso llega de fuera) pero deja el hueco de los bebés |
| **N1. Solo en los hogares que ya hay** | Los niños de 0 a 7 con un hermano en el colegio: 1.603 | +1.603 | **H-mínimo (14.550 personas)**. Sigue sin explicar de dónde viene el resto de los 500 anuales (se «mudan») |
| **N2. Completo** | Todos los de 0 a 7 (4.008) y los hogares jóvenes sin hijo mayor (1.659 hogares, 2.986 progenitores) | +4.008 niños, +2.986 adultos | **H-completo (19.941)**. El único que cierra el ciclo |

---

## 4. Mascotas, solo preparadas

No se implementan. Lo que hay que **dejar libre** para que luego sean un añadido y no una reforma:

```
Mascota { id: 'mascota_12', especie: 'perro'|'gato'|…, nombre, nacimiento,   // misma regla de edad que las personas
          hogar: 'h123', dueno?: 'padre_h123',                               // el hogar manda; el dueño es opcional (quien la pasea)
          paseo?: { franjas, calle? } }                                      // el horario de paseo sale del dueño y de la especie
```

- **Dónde:** dentro del hogar (`hogares[h].mascotas`, un array de 0–2 elementos) **no como personas** (un perro no es del mundo que se juega: no compite, no estudia). Se guardan con datos de verdad (nombre y edad) porque el jugador los verá cada día («el perro de la vecina del 3.º» tiene siempre el mismo nombre).
- **Peso:** ~100 B cada una; ~40 % de hogares con mascota ⚠️ (de memoria; hay que verificarlo) → ~2.100 mascotas = ~0,2 MB.
- **Horario:** el dueño es un progenitor con la marca `perro` de F1; su paseo (6:40–7:40 y 19:30–21:00) pasa a ser el de **su** perro, y el suceso `perro_suelto` puede pedir `{ tipo: 'perro', presente: true }` y recibir **al dueño concreto y el nombre del perro**.
- **Reserva de forma:** el `Hogar` lleva un campo `mascotas?: Mascota[]` (opcional), y `SERVICES.hogares` ofrece `mascotasDe(hogar)`. Nada más: no hay agenda ni presencia de animales.

---

## 5. Horarios

Todo se apoya en un mecanismo que ya existe: el destino de un tramo sale de un hash de **persona, día y tramo** (`azarDe`). Para que una familia vaya junta basta con que el hash de los **miembros de una familia use `hogar` en lugar de `persona`** («familia sale»): mismo sitio, misma hora.

| Qué | Cómo | Cambia |
|---|---|---|
| **Trabajo de los padres** | `OFICIOS_DE_PADRES` (12 oficios con lugar) y `OFICIOS_DE_VECINOS` ya existen; los progenitores trabajan de 8:00/9:00 a 17:00/18:00 «fuera» (como los padres del personaje); los que tienen oficio con lugar del mapa (dependiente, camarero, monitor) **están allí** (F2 de gente por la calle) | La agenda del progenitor de un niño: sale de casa a 7:30–8:30, vuelve a 18:00 |
| **Recoger a los hijos** | Hoy, el 15 % de los vecinos de 25+ con la marca `recoge` van el 80 % de los días a las 13:45–14:30 **sin hijo**. Con hogares, recoge **el progenitor de un niño menor de 12 (o 10) del colegio** (el 80 % de los días) y **se va con su hijo**: es el primer uso del vínculo. Los hermanos de un mismo hogar se van juntos | Cambia `ajustarVecinos` (la marca `recoge` pasa a salir del vínculo y no de un sorteo). Ojo: si recogen los padres de todos los menores de 12 serían del orden de **mil adultos a las 14:00** repartidos entre los colegios de la ciudad (el del personaje, uno de diez, tendría ~100). Se calibra con una proporción por edad (más pequeño, más probable) |
| **Fines de semana en familia** | Sábado y domingo, el hogar elige **un mismo destino** (parque, restaurante, supermercado, casa, calle) con el hash del hogar: los miembros están juntos | Un tramo `hogar` para el fin de semana |
| **Abuelos en el parque** | Los 270 abuelos que viven con la familia (65–85) van al parque por la mañana (10:00–13:00) y por la tarde (17:00–19:30), con el nieto en horario de tarde; los jubilados de F1 (67+) pueden ser abuelos de niños concretos que **no** viven con ellos y recogen a los nietos algunos días | Una marca `abuelo` y el vínculo |
| **Bebés y niños pequeños** | En casa o con un progenitor (el que no trabaja): no tienen agenda propia. `duerme` (menos de 8, 23:00–7:00) ya existe; los de 3 a 7 años van al colegio como hoy los hermanos del personaje (`escolar` desde los 3) | Los hermanos pequeños de hoy ya funcionan: es la regla que se extiende a todos |
| **Dormir** (otra sesión, `claude/dormir`) | Los hogares dan **«en casa, durmiendo»** a todos los miembros de un hogar a la vez (el mismo `hogar` y la misma franja) | Se acopla al sueño de los PNJ de esa sesión: al decidir ese diseño, el hogar debe ser el que reparte `duerme` y no cada persona |

**Cuidado con «Moverse con el grupo»** (`ANEXO_HORARIOS_PNJ.md`): con familias que van juntas aparecen grupos de 3–5 en el mismo sitio; hay que probar que el aviso no salta de más.

---

## 6. Volumen y rendimiento

### 6.1 Cuántas personas

`npx tsx tools/hogares-modelo.ts` (ciudad grande, semilla 31):

| Paso | Personas | Total |
|---|---:|---:|
| Hoy | 6.113 | 6.113 |
| + progenitores de los niños que ya hay (3.645 familias, 20 % monoparentales) | 6.561 | 12.674 |
| + abuelos que viven con la familia | 273 | 12.947 |
| + niños de 0 a 7 con un hermano en el colegio (40 % de los 4.008 de 0 a 7) | 1.603 | **14.550** (**H-mínimo**, ×2,38) |
| + familias jóvenes sin hijo mayor (1.659 hogares: 2.986 progenitores y 2.405 niños) | 5.391 | **19.941** (**H-completo**, ×3,26) |
| Relleno: adultos sin hijos, pisos, solos | perilla | +0–3.000 |
| Ciudad a escala INE (el 40 % de hogares tendría hijos) | | ~33.000 |

La respuesta a «¿~15.000?»: **sí, con H-mínimo; con los bebés de todo el mundo, 20.000.**

### 6.2 Cuánto cuesta (medido, escritorio)

`npx tsx tools/hogares-coste.ts` (los adultos se generan con `persona()` y **agenda de vecino** —el peor caso: aparecen en el parque, el super y el restaurante—; los bebés, sin agenda; más allá del modelo completo, copias de niños con capacidades y sin equipo). Es una sola máquina de 4 CPU con otros procesos, así que las cifras de tiempo vienen con **ruido de ±20 %**: lo fiable es la tendencia.

| Personas | Estado | Cargar | Guardar (a texto) | 1.ª consulta de presencia (máx) | Lista de acciones | Pasada de semana (motor) |
|---:|---:|---:|---:|---:|---:|---:|
| **6.113** (hoy, ×1) | 16.210 KB | 153 ms | 281 ms | 6,9 (15,0) ms | 8,1 ms | 214 ms |
| **12.226** (×2) | 21.565 KB | 261 ms | 325 ms | 8,9 (17,8) ms | 10,2 ms | 188 ms |
| **14.550** (H-mínimo) | 23.603 KB | 186 ms | 364 ms | 11,2 (18,0) ms | 13,9 ms | 173 ms |
| **19.941** (H-completo) | 28.334 KB | 221 ms | 382 ms | 18,8 (29,5) ms | 16,0 ms | 290 ms |
| **30.565** (×5) | 57.132 KB | 504 ms | 816 ms | 30,8 (73,6) ms | 20,9 ms | 502 ms |
| **61.130** (×10) | 139.212 KB | 3.170 ms | 2.542 ms | 70,5 (126,6) ms | 58,4 ms | 1.786 ms |

Con los adultos **sin agenda** (`--sin-agenda`): a 19.941 personas la 1.ª consulta de presencia es **5,2 ms** (a 6.113: 4,8 ms), es decir, **la presencia no sube con la gente que no sale; sube con la que tiene agenda en lugares del mapa**.

Otras medidas: generar 13.828 personas con `persona()` cuesta **0,6 s** (43–46 µs cada una); un adulto pesa **900 B** y un niño de 0 a 7 **878 B** (más ~12 B de `hogar`), frente a **2.887 B** de un niño con genética. **El ×5 y el ×10 son el peor caso** (copias de niños con capacidades, que pesan el triple y tienen pasada semanal); no son una población realista, sino lo que pasaría con «ligas de todo el mundo».

**Lo que no se midió con esta herramienta:** el tiempo de **crear** para escalas grandes (las copias no pasan por la historia deportiva, que es el 52 % de crear; hay que estimarlo), y los bebés sin su genética (~350 B más, estimado).

### 6.3 Crear, semana y guardado en un móvil ×4

No he repetido las medidas en Chromium con estas poblaciones (la herramienta `rendimiento-web` crea la partida desde cero, no admite un estado inyectado). Aplico el **factor medido en `medir-rendimiento-2.md`** (×4,3 de escritorio a móvil ×4) a lo medido arriba. **Son estimaciones**, no medidas:

| Personas | Crear (est.) | Cruzar de semana, motor | 1.ª consulta presencia | Guardar a texto | Guardar «de verdad» (por trozos): lo más que para la página |
|---|---:|---:|---:|---:|---:|
| 6.113 (hoy) | **33 s** (medido) | **0,81 s** (medido) | ~30 ms | 0,67 s (medido) | **39 ms** (medido) |
| 14.550 (H-mínimo) | ~38–41 s | ~0,75 s | ~48 ms | ~1,6 s | ~40 ms |
| 19.941 (H-completo) | ~41–44 s | ~1,2 s | ~81 ms | ~1,6 s | ~40 ms |
| 30.565 (×5) | ~165 s | ~2,2 s | ~130 ms | ~3,5 s | ~40 ms |
| 61.130 (×10) | ~330 s | ~7,7 s | ~300 ms | ~11 s | ~40 ms |

Crear para H-mínimo y H-completo: los 33 s de hoy más lo que cuesta generar y derivar a las personas nuevas (0,6 s de `persona()`, ×3 por la inversión, ×4,3 del móvil ≈ +3 a +8 s). Para ×5 y ×10 (niños con historia deportiva), crear escala con el número de niños: **7,7 s × N en escritorio, × 4,3 en móvil** (estimado).

### 6.4 Qué se rompe primero

1. **Crear** (el aviso de «hasta un minuto» deja de valer): ya son 33 s a ×4. Los hogares añaden poco (adultos y bebés no tienen historia deportiva, 5–10 s), pero **los niños nuevos de una liga mundial** no: cada 6.000 niños más, +33 s en un móvil.
2. **El peso de lo guardado y cargado:** H-mínimo (24 MB) y H-completo (28 MB) están bien; **57 MB** (×5) empieza a pesar en el móvil (el JSON de 139 MB del ×10 no se podría ni abrir en muchos: cargar 3,2 s en escritorio, ~14 s en móvil, y la memoria del navegador se come varias veces el tamaño del texto). El guardado «por trozos de verdad» (`guardar-sin-congelar.md`) ya limita lo que se para la página a 34–41 ms **sea cual sea el tamaño**: el límite es la memoria.
3. **La presencia con adultos con agenda de calle:** cuesta casi **lineal con quien tiene agenda** (6,9 → 70 ms de la 1.ª consulta tras un cambio de intervalo; ×4,3 = 300 ms en móvil a ×10). Con los progenitores casi todo el día «fuera» o «en casa» apenas se nota (con adultos sin agenda: 4,8 → 5,2 ms).
4. **La pasada semanal, por niños con capacidades** (no por adultos ni bebés: no cuestan nada por semana). A ×10: 1,8 s en escritorio, ~7,7 s en móvil.

### 6.5 Qué haría falta para escalar a «ligas de todo el mundo»

En orden de rentabilidad (todo respetando `VISION.md`: calcular por bloques no es recortar si un test lo demuestra):

| Palanca | Qué quita | Cómo se demuestra que no recorta |
|---|---|---|
| **Estado más compacto de los adultos** (los progenitores no necesitan `gustos` ni cada eje del carácter con precisión: 649 B de 900 son `rasgos`; un adulto compacto de ~400 B) | −30 a −40 % del peso de los 12.500 nuevos (−4 MB de H-completo) | Test: rasgos de un hijo derivados del padre idénticos con el formato nuevo |
| **Trabajadores en paralelo (M2 de `medir-rendimiento-2`)** | Crear: estimado −30 % (la historia deportiva en hilos) | `npm run huella` idéntica |
| **Los adultos sin agenda del mapa no entran en el índice de presencia** | La presencia no escala con los progenitores (ya ocurre: `candidatosEn` parte de los sitios que visita cada agenda) | Test de presencia existente |
| **Guardado por partes ya existe; falta cargar por partes** (los hogares y los lejanos solo se cargan cuando se necesitan: nunca se **recalculan**, solo se **leen** más tarde) | Memoria y tiempo de abrir | Un test que carga por partes y compara |
| **Simular a los lejanos por bloques** (C1 de `medir-rendimiento-2`, hoy «no») | La semana de los que no son del personaje, por bloques de 13–26 semanas | Test: bloque = suma de semanas (principio 5) |
| **Archivar** a quien sale del mundo que se juega (VISION 4) | Mantiene la población constante en vez de crecer | Es la regla de la visión |

---

## 7. Qué permitiría

- **Sucesos con vínculo:** un papel de reparto por relación (`{ relacion: 'progenitor', de: 'compañero' }`), que hoy no existe; se escribiría como un dato (sin tocar el motor, solo ampliando `PapelDef`): «el padre de tu compañero te pregunta por el entrenamiento», «tu amigo se va de la ciudad: su madre te lo cuenta», «su hermana mayor te dice que lo dejes en paz».
- **Hermanos de amigos y familias en el parque** (§5): el parque a las 17:00 con una madre, un padre, un abuelo y sus dos niños pequeños como **la misma familia** que ya has visto.
- **«El vecino del 3.º»:** quien comparte portal contigo con nombre, hijos y trabajo, y que cambia con los años (nacen hijos, se muda, envejece, muere).
- **Relaciones entre PNJ** (lo que el usuario quiere: que dos amigos acaben de enemigos): **el hogar no lo da todo, pero es la mitad**: da el vínculo de **sangre** (estable, no se rompe) y el vínculo de **vecindad** (el mismo portal). La amistad y la enemistad entre PNJ son aristas que cambian: hoy el mundo no tiene relaciones entre PNJ (la `afin` de un PNJ es solo con su entrenador). Una lista de aristas `[a, b, afinidad, confianza]` solo entre pares que **coinciden** (la misma clase, el mismo equipo, el mismo portal) tendría ~5 por niño: ~30.000 aristas × 12 B = ~350 KB. Los hogares dan **de dónde sale la rivalidad** («su padre y el mío») y los conflictos entre familias.
- **Más texto de los sucesos de calle** de `gente-por-la-calle.md` §4 («Buenos días, vecina», «El carrito en la puerta» con un bebé **de verdad**, «Los de la calle juegan a la pelota» con los hermanos de verdad).

---

## 8. Fases, recomendación y dudas

### 8.1 Fases

| Fase | Qué | Personas | Notas |
|---|---|---:|---|
| **H0. Decidir** | Las dudas de §8.3 y esta propuesta | — | |
| **H1. Familias de los que ya hay** | Progenitores (derivados, §2.3) y abuelos; `hogar`, `padres`, tabla de hogares; hermanos entre los niños (según duda 3); recoger con el hijo; trabajo de los padres | +6.834 (+ renombrar a los menores) | Cambia la huella (presencia, aforo, nombres de los menores). Sin bebés: los de 8 años que entran cada curso se «mudan» con sus padres derivados. **Primero con los adultos sin agenda de calle** para medir (la presencia no sube) |
| **H2. Niños de 0 a 7 y nacimientos** | Bebés y pequeños de los hogares (N1 y luego N2), la pasada anual (nacimientos, mortalidad), los de 8 años que entran vienen de aquí | +1.603 (N1) → +6.394 | Antes de empezar: medir crear en un móvil ×4 con la ciudad grande y hogares reales (la herramienta de `rendimiento-web` con una opción de hogares). Los 40 s de móvil empiezan a ser un problema (M2: hilos) |
| **H3. Adultos sin hijos y calles** | La perilla de relleno (solos, parejas, pisos), portero y vecinos del portal con su hogar | +1.000 a +3.000 | Es la F3 de la gente por la calle, ahora con nombre y hogar |
| **H4. Mascotas** | `Mascota` en el hogar y el paseo | ~+0,2 MB | Preparado en §4 |
| **H5. El ciclo** | Irse de casa, emparejarse, hijos del personaje | | La dinastía. Depende de las relaciones entre PNJ |

### 8.2 Recomendación

**Opción C (derivar los padres de los hijos y generar hacia delante a lo nuevo), con H1 y luego H2-N1; medir en móvil antes de N2 y de H3.** Cada fase cambia la huella y se acepta la nueva, no se intenta mantenerla (como en la gente por la calle). **Un test fijo** comprueba, para cada niño, que sus apellidos, su origen y sus alelos de la cara **son los que la herencia de sus padres puede dar**: demuestra la coherencia (como el test de los hermanos del personaje).

### 8.3 Dudas para el usuario (cada una con mi recomendación)

1. **¿Padres derivados de los hijos (C) o rehacer el mundo con los padres primero (A)?** *Recomiendo C:* conserva los 5.900 niños, sus equipos y todo lo calibrado, y es exacta en apellidos, origen y cara.
2. **¿Cuánta población?** H-mínimo (14.550), H-completo (19.941) o más (relleno hasta ~25.000). *Recomiendo H-mínimo primero y medir en móvil antes de pasar a H-completo.*
3. **¿Hermanos entre los niños que ya hay?** Hay 69 parejas naturales; con renombrar al menor salen ~1.700. *Recomiendo renombrar solo hasta un 25–30 % de familias con 2 o más niños en el colegio* (≈ 900 niños con apellido nuevo: nombres que el jugador aún no ha visto) y dejar el resto como hijos únicos entre sí, con hermanos pequeños nuevos en H2.
4. **¿Los progenitores y los bebés se guardan como las demás personas (900 B cada uno)?** Son «parte del mundo que se juega» y la visión pide datos de verdad. *Recomiendo que sí*, y compactar los adultos (−30 %) después, si el peso aprieta.
5. **¿Cuántos hogares viven en las calles del mapa?** *Recomiendo 10–15 % (500–800)*; el resto «en otro barrio» (fuera, como hoy).
6. **¿Quién recoge?** *Recomiendo el progenitor de los menores de 10 años (80 % de los días) y solo hasta los 12 con probabilidad decreciente*, y a su hijo con él. Evita del orden de mil adultos a las 14:00 en toda la ciudad.
7. **¿Nacimientos?** *Sí, desde N1 (H2)*, con una pasada anual calibrada para ~500 nacimientos por año. La mortalidad (archivar) en la misma pasada.
8. **¿Las mascotas viven en el hogar (no son personas)?** *Recomiendo que sí.* Se dejan preparadas (§4).
9. **¿Los 18–19 años se quedan en casa hasta los 20 y luego se «archivan» o se van a pisos?** *Recomiendo quedarse en casa hasta los 20 y, a partir de ahí, piso compartido o archivo (VISION 4)* hasta que exista el ciclo (H5).
10. **¿Las cifras del INE marcadas ⚠️ se contrastan antes de fijarlas en un anexo?** *Recomiendo que sí*: no cambian el diseño, pero un anexo debe citar la tabla.

### 8.4 Riesgos

- **Huella:** cambia al aplicar H1 (los menores renombrados, la presencia, el aforo). Acordar una huella nueva de referencia.
- **La orden de generación importa:** los progenitores y bebés se generan **al final** (como los bibliotecarios) con generador estable por hogar, para no mover el azar del resto.
- **Los nombres de los menores (opción a de §1.3)** se renombran **solo al crear la partida**, antes de que el jugador los vea; las partidas guardadas no se migran.
- **Cuidado con los homónimos:** un niño que se llama como su padre es válido (15 años de diferencia), dos «Nicolás García Ruiz» en el mismo colegio no.
- **La recogida y el parque:** con familias que van juntas y más adultos, «Moverse con el grupo» y el orden de «gente cerca» (los desconocidos van los últimos) hay que revisarlos; con el vínculo, los padres de tus compañeros pasan a ser **conocidos de los conocidos** y sube su orden.
- **Crear en un móvil:** ya 33 s; con H-completo ~41–44 s; con M2 (hilos) −30 %. Medir antes de H2.

---

## Comprobaciones

- `npm run typecheck`: ✅ (incluye las dos herramientas nuevas).
- `npm run huella -- 60`: **idéntica** a la de antes de empezar (ver el commit).
- Medidas: `npx tsx tools/hogares-modelo.ts grande` (semilla 31); `npx tsx tools/hogares-coste.ts` y `… 6113 19941 --sin-agenda`. Máquina de 4 CPU con otros procesos: los tiempos tienen ruido; el estado y los recuentos son exactos.
- **Lo que no se midió:** crear con hogares reales (solo `persona()` suelto: 43 µs por persona), la inversión de la cara con los alelos (se diseña sobre lo que dice `ANEXO_CUERPO` §7 y `rostroHeredado`, **sin ejecutarla**), la genética de los bebés (~350 B, estimado), nada en Chromium (el móvil ×4 es el factor ×4,3 de `medir-rendimiento-2.md`) y las cifras del INE con ⚠️.

---

# Addendum (23/11/2026): H1 con las familias hacia delante

Decisión del usuario (`DECISIONES.md`, «Hogares: familias hacia delante»): **la opción A**. Se generan primero las familias (adultos en pareja, con hijos hasta cubrir los niños que necesitan los colegios y los clubes) y después, más adelante, parejas sin hijos y adultos que viven solos. Se descarta derivar los padres de los hijos (C de §2.2). Este addendum dice cómo se hace, con un **prototipo medido** (`tools/hogares-prototipo.ts`, fuera del juego). Lo de arriba que choca con esto (§2.3 «Cómo se invierte cada cosa», §2.4, la recomendación C de §8.2) **queda sustituido** por lo de aquí.

## A1. El algoritmo que llena los colegios y los clubes con hijos de familias

**La demanda no cambia: es la que hoy cubren `poblarElColegio` y `ninosDeOtrosColegios`** (ciudad grande: 5.899 niños de 8 a 19 años, 500 por edad de 8 a 17 y 450 a los 18 y 19, en 10 colegios: el propio y 9 de fuera, con los de 18–19 sin colegio). El reparto de equipos, las plazas y las categorías no se enteran: ven los mismos niños por edad y colegio.

1. **Demanda `R[colegio, edad]`** (50 por colegio y edad de 8 a 17; 450 por edad a los 18 y 19; 24 en tu clase de 8 años, ver A5).
2. **De la edad mayor a la menor** (19 → 8): mientras quede demanda a esa edad, se crea **una familia cuyo hijo mayor dentro del mundo tiene esa edad**.
3. **La pareja:** sus orígenes salen de `origenesDePareja` (`parejas` de la ciudad: 13 % dos de fuera, 12 % mixta, 75 % locales; la misma regla de hoy, `ANEXO_NOMBRES` §7); cada uno, con `rasgosAlAzar({ origen, sexo })`, nombre de adulto (`identidadAlAzar`), **calidad** (`calidadDePadreDelMundo`), **perfil de capacidades** (`perfilDePadre`: los topes) y **perks** (`perksDePadre`). La edad de la madre al nacer el mayor, 31 ± 4,5 (19–42); la del padre, +2,5 ± 3. El 20 % son monoparentales (el 80 % con la madre): el otro progenitor **se sortea igual** (sus topes, perks y práctica los hereda el niño) pero **no es una persona del mundo** (vive fuera: se le dará hogar en H3 si hace falta).
4. **Los hijos:** tras el mayor, cada uno tiene un hermano más pequeño con probabilidad 0,55 / 0,30 / 0,20 / 0,15 (1.º, 2.º, 3.º, 4.º), separado por 1–6 años (22/30/22/14/8/4 %) y un 4 % de mellizos. Un hijo cuya edad ya está completa se queda fuera del mundo (no cabe); **los de menos de 8 años se cuentan como pendientes** (A6). Cada hijo **hereda con las funciones del personaje**: `rasgosHeredadosNpc` (origen, forma, color, canas, calvicie, barba, envejecimiento, **cara** por alelos, carácter, intereses), `geneticaDeHermano`-con-padres-de-familia (topes de uno de los dos ±20 %, perks, desfase), `identidadDeHijo` (el primer apellido del padre y el primero de la madre, con las reglas de homónimos), y la estatura y el cuerpo como los hermanos del personaje (`0,45 × (padre + madre) + 0,6 × z propio`).
5. **Colegio:** cada hijo va al colegio de su hermano si queda hueco a su edad (75 %); si no, a uno con demanda restante, ponderado por lo que queda. Así hay hermanos en el mismo colegio y también en otros.
6. **Un test** comprueba que la demanda queda cubierta **exacta** por colegio y edad.

**Prototipo medido** (`npx tsx tools/hogares-prototipo.ts grande 31`):

| | |
|---|---|
| Demanda y cubierta | 5.899 niños, 10 colegios: **cubierta exacta** por colegio y edad (499–500 por edad de 8 a 17; 450 a 18 y 19) |
| Familias | **3.781**: 5.899 hijos y **6.806 adultos residentes** (756 monoparentales); 1 hijo en el mundo: 2.090 familias, 2: 1.315, 3: 327, 4: 47, 5: 2 (media **1,56**; **1.691 familias con hermanos**) |
| Hermanos | Los hermanos comparten apellidos (los dos primeros) salvo la **forma femenina de los apellidos eslavos** (21 familias: «Dąbrowska/Dąbrowski», es la regla de `ANEXO_NOMBRES` §3, no un fallo); el 76 % de las familias con hermanos tiene a todos en el mismo colegio (1.285 de 1.691) |
| Cara | **76.687 de 76.687** rasgos de la cara de los hijos (13 por hijo) **son un valor de su padre o de su madre** (la herencia mendeliana de `ANEXO_CUERPO` §7: ya era exacta, ahora además lo es entre hermanos) |
| Origen | 25,3 % de los hijos con algún origen de fuera (hoy 25 %, `ANEXO_NOMBRES` §7): la demografía se conserva |
| Hijos menores de 8 años que salen como hermanos | **712** |

**Lo que cambia respecto a hoy, bien dicho:** cada niño ya no es un sorteo suelto sino hijo de unos padres sorteados; en conjunto **la distribución de capacidades, orígenes y apellidos es la misma** (los padres se sortean con las mismas funciones y reparto), pero **los hermanos están correlacionados** entre sí, que es lo que se quiere.

## A2. Cómo heredan los hijos (las mismas funciones que el personaje)

| Cosa | Función | Notas |
|---|---|---|
| Rasgos, cara, carácter, intereses | `rasgosHeredadosNpc(rasgosPadre, rasgosMadre, rng, sexo)` | Los hermanos del personaje ya la usan |
| Apellidos y nombre | `identidadDeHijo(rng, género, padre, madre, origen, { edad, pais })` | 1.º del padre + 1.º de la madre; homónimos con `nombrePermitido` |
| Origen | `origenHeredado(padre, madre)` (dentro de `rasgosHeredadosNpc`) | |
| Topes, perks, desfase | `geneticaDeHermano`, con una variante: **la práctica deportiva de cada progenitor se sortea una vez (`practicaSegunTope`) y se guarda en el padre**, no por hijo (hoy `geneticaDeHermano` la saca del id del hijo: dos hermanos «verían» padres que practicaron cosas distintas) | Hace falta `calidad` y `practica` por progenitor |
| Interés por el deporte de los padres | `aficionadoPorLosPadres(rasgos, genetica.padres, rng)` (igual que hoy) | |
| Cuerpo | `estatura`, `metabolismo`, `musculatura` del hijo `0,45 × (p + m) + 0,6 × z propio`; los de los padres, de `estaturaZ(id)`… | |
| **Qué guarda el progenitor para heredar** | `herencia: { t: topes en el orden de CAPACIDADES_GENETICAS, p: perks, c: calidad, u: práctica }` (~250 B) | Sirve para los hijos de hoy y los nacimientos de H2 sin rehacer nada |

**Nada de esto cambia las capacidades reales de los adultos:** siguen sin tenerlas (hasta las profesiones), y el progenitor solo **guarda** sus topes para que los hereden.

## A3. Cómo encaja con la historia deportiva y el reparto de equipos

- **No cambia nada aguas abajo:** `conCapacidades`, `reclutarEnTodos`, el *draft*, `conHabilidades` y la historia (4 s + 2,6 s de crear) trabajan sobre los mismos 5.899 niños, con las mismas edades y colegios, y con `genetica.padres`, `ventaja` y `topes` en el mismo formato. Las **plazas** y las categorías son por edad: igual.
- **Lo que sí cambia (y es la ley):** la huella (otra partida distinta), y que **hermanos** con aptitudes parecidas pueden acabar en equipos de cualquier club (cada uno decide por su interés y su ambición, no por la familia). `sim`, `benjamin -- 31,33` y las distribuciones del fútbol se miden con el dato activo frente a lo de ahora (Paso 2).
- **Los adultos no entran en ninguna plantilla ni en ningún equipo**.

## A4. Qué pasa con las partidas guardadas

- **Sin hogares y sin migrar.** El dato va en la ciudad (`CiudadDef.hogares?: boolean`, ausente = desactivado; una partida guarda el id de su país y, con él, su ciudad): una partida de antes sigue con sus 6.113 personas **tal cual** y carga igual. `hogar`, `padres` y `herencia` son **campos opcionales** de `Npc` que las partidas de antes no tienen.
- **Con el dato desactivado, la huella es idéntica** (el camino viejo no se toca: la rama nueva solo existe con el dato activado). Lo comprueba `npm run huella -- 60`.
- Las **partidas nuevas** con el dato activado traen familias; no hay forma de «activarlo a mitad de partida» (no se pretende).
- Un test: una partida **sin** hogares, guardada antes de este cambio, carga y avanza un curso.

## A5. Los casos especiales de hoy

| Caso | Qué pasa con el dato activado |
|---|---|
| **El reparto inicial** (`tutor`, `companero_estudio`, `companero_social`, el entrenador) | Los dos compañeros (niños de 8 años de tu clase con sesgos de carácter a mano) **también tienen padres** (los vecinos más probables de «el padre de tu compañero»): se generan con su familia y **se les empuja el carácter** hacia su sesgo después de heredar. El tutor y el entrenador son adultos sin familia en H1 |
| **Tu clase y las clases del colegio** | Los huecos (`clase_N`, `curso_N`, `alumno_N`, `nino_N`) siguen siendo los mismos ids y roles; el hijo de una familia **ocupa** el hueco que le toca |
| **Los 80 vecinos** (60 adultos y 20 niños de 5 a 17) | Los niños de 8 a 17 pasan a ser hijos de familias y cuentan para la demanda (su hueco ya existe); los **60 adultos se quedan** como adultos sin hijos hasta H3 |
| **Tus hermanos y tus padres** | Sin cambios (su generación ya es hacia delante, con los padres de la semilla) |
| **Los jóvenes de 18–19 años** | Siguen en casa (decisión 9): son hijos de su familia |

## A6. Los nuevos cada curso, los que salen y los hermanos pequeños (decisiones nuevas, ver A8)

- **Los menores de 8 años que salen como hermanos (712 con estos parámetros):** si se generan **ya** como personas, son los que **entran al colegio** los 7 cursos siguientes (unos 100 por curso), así los de 8 años que entran no «aparecen de la nada». Pesan ~1,2 KB cada uno (0,85 MB). *Recomiendo generarlos ya en H1* (cuesta 0,1 s y evita la incoherencia de «tu compañero de 9 años no tiene hermanos pequeños»); los **nacimientos** (decisión 7) llegan en H2.
- **Los que entran con 8 años cada curso (~500):** primero salen de esos hermanos pequeños (~100); el resto **llegan con su familia nueva** (una familia se «muda al barrio»; sus hermanos mayores, si los hay, no entran: la familia se genera con el hijo mayor del mundo a los 8 años y los demás menores como pendientes). Es la regla de hoy (entran 500 niños) con familia. En H2, con nacimientos, esto se sustituye por los nacidos.
- **Quien sale:** los jóvenes de 20 años dejan el barrio (como hoy). **Una familia sin ningún hijo en el mundo se archiva con quien la conoce o se borra** (VISION 4, principio de «quien sale del mundo que se juega»): si el personaje conoce a alguno de sus miembros se conserva, archivada (con su historial); si nadie la conoce, se borra. Sin esto la población crecería unos 690 adultos por curso (500 niños nuevos → unas 380 familias nuevas × 1,8 adultos); con esto queda estable. Una pasada por curso, junto a `renovarAlumnos`.

## A7. Coste medido con el prototipo

`npx tsx tools/hogares-prototipo.ts grande 31` (4 CPU con otros procesos; ±20 % de ruido):

| Medida | Resultado |
|---|---|
| **Generar las familias** (3.781 familias: 6.806 adultos y 5.899 hijos) | **0,82 s** (65 µs por persona; 220 µs por familia) |
| Referencia de hoy: crear los mismos 5.899 niños con `persona()` | 0,54 s |
| **Lo que añade a crear**, escritorio | **≈ +0,3 s** (de ~8 s: un 4 %); en un móvil ×4 (factor ×4,3 de `medir-rendimiento-2.md`), **≈ +1,2 s** (de ~33 s). El resto de crear (historia deportiva y *draft*, el 85 %) **no cambia** porque los niños son los mismos 5.899 |
| Peso de un **hijo** (sin capacidades; con el `hogar`, `padres`, estatura…) | **1.939 B** (con las capacidades llegará a ~2,9 KB como hoy) |
| Peso de un **adulto con su herencia** (rasgos 650 B + `herencia` ~250 B) | **1.013 B** |
| **Peso añadido** (6.806 adultos) | **≈ 6,7 MB** (16,2 → ~23 MB, +41 %); + 0,85 MB si se generan los 712 hermanos pequeños |
| Pasada semanal, acción, presencia | Como en §6.2 (**los adultos no cuestan por semana**; la presencia sube solo si tienen agenda en el mapa) |

Conclusión: **crear no es el problema de H1** (los 6.800 adultos cuestan 0,3 s de más). El coste de H1 es el **peso del guardado** (+7 MB). El tiempo sube de verdad con H2 (los bebés con su historia) y con las ligas de todo el mundo (§6.5).

## A8. Decisiones abiertas para el usuario (cada una con mi recomendación)

1. **Hermanos menores de 8 años: ¿se generan ya en H1 (≈ 712) o esperan a H2?** *Recomiendo ya:* cuestan 0,85 MB y 0,1 s, y de ellos salen ~100 de los 500 niños que entran cada curso; sin ellos, todos los que entran «se mudan».
2. **Una familia sin hijos en el mundo: ¿se borra (si nadie la conoce) o se archiva siempre?** *Recomiendo borrar si nadie la conoce y archivar si el personaje conoce a alguien* (VISION 4). Hace falta antes de H2, si no la población crece.
3. **Familias monoparentales: ¿el otro progenitor es una persona?** *Recomiendo que no en H1* (hereda de él pero no está en el mundo); en H3 se le puede dar un hogar propio (adulto que vive solo).
4. **Los dos compañeros del reparto inicial** (estudioso y sociable, con sesgos hechos a mano): ¿familia generada hacia delante y se les empuja el carácter hacia el sesgo? *Recomiendo que sí* (así tienen padres como los demás).
5. **¿La práctica deportiva de cada progenitor se guarda en el adulto (`herencia.u`)?** Es un cambio de `geneticaDeHermano` (hoy la saca por hijo). *Recomiendo que sí:* si no, dos hermanos tienen padres con deportes distintos.
6. **Los entrantes de cada curso: «familia nueva que se muda» hasta H2.** *Recomiendo que sí.*

**Estas seis no cambian el diseño ni el coste:** se pueden decidir mientras se implementa. Ninguna bloquea el Paso 2 salvo la 1 y la 2, que cambian qué se genera y qué se borra.
