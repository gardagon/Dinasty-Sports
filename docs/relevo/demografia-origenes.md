# Demografía de orígenes: ¿salen demasiados extranjeros?

Análisis con propuesta (rama `claude/demografia-origenes`). **No se ha cambiado ninguna cifra del juego.** Solo se añade el script de medida `tools/demografia-origenes.ts` (`npm run demografia -- [semillas] [pais]`; la propuesta se calcula dentro del script con variables de entorno `AMBOS_EXT`, `MIXTA`, `MISMO`).

## 0. Resumen

1. **La sospecha de la arquitectura se confirma, pero solo para el personaje y sus hermanos.** Sus dos padres se sortean por separado: el **46 % de los personajes** tiene al menos un padre de origen extranjero (oficial: ~32 % de los nacimientos en 2021, dato por confirmar en la tabla del INE) y el **81 %** de ellos salen *mestizos* (un padre de aquí, otro de fuera: nombres tipo «Martín Cruz Wiśniewski»). Las parejas de dos extranjeros del mismo origen son solo el 15 % de las parejas de dos extranjeros (en la realidad, la mayoría).
2. **Los compañeros y demás niños NO son hijos de parejas sorteadas**: `persona()` (módulo `npcs`) les sortea el origen igual que a un adulto (`rasgosAlAzar` → `origenAlAzar`). Por eso ahí no hay duplicación: salen ~27 % con algún origen extranjero (el 25 % de la demografía más las mezclas del 10 %). Los «4 o 5 de 20» del usuario (20-25 %) son exactamente ese 25-29 %: el juego hace lo que dice, el problema es **la cifra**, no un fallo.
3. **Oficial** (ver §2): extranjeros por nacionalidad **14,6 %**, nacidos fuera **20,2 %** (1/1/2026); alumnado extranjero **13,5 %**. El juego pone un 27 % de «origen extranjero» en niños: unas 2 veces la nacionalidad y ~1,3 veces los nacidos fuera. Es alto pero **no absurdo** si se cuenta origen familiar (segunda generación y nacionalizados): lo que da la impresión de «demasiados» es, sobre todo, el personaje y su familia.
4. **Propuesta** (§4): bajar la demografía adulta del 25 % al ~19 % y emparejar por tipos (la pareja de dos extranjeros es lo normal, la mixta es la minoría). Resultado medido: adultos 19 %, hijos con algún progenitor extranjero **25 %** (hoy 46,5 %), mestizos 12 % de los hijos (hoy 39 %).

## 1. Lo que sale hoy (medido)

Ciudad grande (`espana_ciudad_grande`), 20 semillas para la población real (más de 100 000 niños de otros colegios, 9 000 alumnos del colegio, 1 600 adultos), 20 000 semillas para el personaje y sus padres, y 200 000 parejas sorteadas aparte. «Extranjero propio» = algún origen no `espana_*`; «sangre ext.» = fracción media de origen extranjero (una mezcla 50/50 cuenta 0,5).

| Grupo | n | Extranjero propio | Sangre ext. | Mezclas (cualquiera)¹ | ≥1 padre ext. |
|---|---:|---:|---:|---:|---:|
| Adultos (todos: vecinos, profesores, entrenadores) | 1 582 | 25,6 % | 23,5 % | 8,8 % | n/a (sorteados solos) |
| Padres del personaje | 40 000 | 26,5 % | 24,7 % | 7,6 % | n/a |
| Alumnos del colegio (8-17) | 9 000 | 27,4 % | 25,5 % | 7,6 % | n/a (sorteados solos) |
| Compañeros de la edad del personaje (8-9) | 1 000 | 28,9 % | 26,9 % | 7,6 % | n/a |
| Niños de otros colegios | 108 000 | 26,8 % | 24,9 % | 8,0 % | n/a |
| **Personaje al crear partida** | 20 000 | **45,7 %** | 24,7 % | **80,9 %** | **45,7 %** |
| Hermanos del personaje | 22 | 31,8 % | 18,2 % | 81,8 % | (los de sus padres) |
| Hijo de dos adultos sorteados por separado | 200 000 | 46,5 % | 25,0 % | 81,5 % | 46,5 % |

¹ Incluye mezclas entre regiones de España (norte/centro/sur), que no son extranjeras: «mezclas con extranjero» es 4,4 % en niños sorteados solos y **44,6 %** en el personaje.

Por origen (niños de otros colegios / alumnos / personaje): Latinoamérica 8,7 / 8,9 / 16,3 %; Magreb 5,4 / 5,8 / 10,2 %; Europa del este 4,4 / 4,5 / 8,6 %; África subsahariana 3,4 / 3,4 / 6,4 %; Asia oriental 3,3 / 3,4 / 6,4 %; Europa del norte 2,2 / 2,1 / 4,3 %. (El personaje duplica cada origen porque cuenta si *alguno* de sus dos padres lo tiene.)

**Emparejamiento de los padres.** Cada padre se sortea por separado (`origenDePadre`, `padresDeSemilla`) con la demografía general: no hay endogamia. En 200 000 parejas: ≥1 extranjero 46,5 %; los dos extranjeros 7,3 % (solo el **14,9 %** de ellos del mismo origen); un extranjero y otro no (hijo mestizo) 39,2 %. Es decir, **la mayoría de los hijos con padre extranjero son mestizos (85 %)**, y su nombre y apellidos mezclan culturas.

**Una muestra de 20 compañeros** de 8-9 años: media de 5,8 con algún origen extranjero; el 86 % de las veces ≥4. Coincide con lo que ve el usuario.

## 2. Datos oficiales

**Limitación importante:** `ine.es`, `madrid.es` y `educacionfpydeportes.gob.es` **no se resuelven desde esta sesión** (la red no los permite: `getaddrinfo ENOTFOUND`), así que **no he podido abrir las tablas de INEbase**. Las cifras de abajo salen de los resúmenes de la búsqueda web que citan notas de prensa del INE y del Ministerio; hay que **verificarlas contra la fuente** antes de darlas por buenas. No he encontrado en lo que pude ver: población 0-14 por nacionalidad/país de nacimiento, desglose por continente ni «ambos progenitores extranjeros».

| Dato | Cifra | Año | Fuente |
|---|---|---|---|
| Población residente | 49 570 725 | 1/1/2026 (provisional) | INE, Estadística Continua de Población: <https://ine.es/dyngs/Prensa/ECP4T25.htm> |
| Nacidos en el extranjero | 10 004 581 (**20,2 %**, cálculo propio) | 1/1/2026 | ídem |
| Nacionalidad extranjera | 7 243 561 (**14,6 %**, cálculo propio) | 1/1/2026 | ídem |
| Extranjeros (Censo anual) | 6 911 971 (**14,1 %**); mayores colectivos: Marruecos 968 999, Colombia 676 534, Rumanía 609 270 | 1/1/2025 | INE, Censo anual: <https://ine.es/dyngs/Prensa/CensoVar2025.htm> |
| Nacimientos totales | 318 005 | 2024 | INE, Movimiento Natural de la Población: <https://ine.es/dyngs/Prensa/MNP2024.htm> |
| Nacimientos de madre con nacionalidad extranjera | 81 339 (**25,6 %**; 24,4 % en 2023) | 2024 | ídem |
| Nacimientos de madre nacida en el extranjero | 105 814 (**33,3 %**; 31,3 % en 2023) | 2024 | INE vía [El Debate](https://www.eldebate.com/sociedad/20251119/crecen-nacimientos-madres-extranjeras-mientras-madres-espanolas-siguen-desplomando_356668.html) (no verificado en INE) |
| Nacimientos con ≥1 progenitor extranjero | **32,4 %** | 2021 | Observatorio Demográfico CEU San Pablo con datos INE (vía búsqueda; fuente secundaria) |
| Alumnado extranjero, enseñanzas de régimen general | 1 175 063 (**13,5 %**) | curso 2025-26, avance | Ministerio de Educación: <https://www.educacionfpydeportes.gob.es/dam/jcr:e7a0bdc6-411e-4a1d-9758-746d87ac5837/nota-avance2025-26.pdf> |
| Alumnado extranjero por etapa | Primaria 13,7 %, ESO 11,7 %, Infantil 10,8 % | 2025 (SEIE) | Ministerio de Educación, Sistema Estatal de Indicadores (vía búsqueda; no verificado) |
| Ciudad de Madrid, población extranjera | **19,4 %** de 3 497 277 | 1/1/2026 | Ayuntamiento de Madrid: <https://www.madrid.es/UnidadesDescentralizadas/UDCEstadistica/Nuevaweb/Demograf%C3%ADa%20y%20poblaci%C3%B3n/Cifras%20de%20poblaci%C3%B3n/PMH/Avance/Primeros_resultados_2026.pdf> |

Notas: (a) otro resumen dice que Barcelona, Palma, Alicante y Madrid superan el 30 % «de población extranjera»: probablemente es *nacidos fuera* (no se ha podido contrastar; no lo uso). (b) Cataluña, 5-14 años, «origen extranjero» ronda el 15 % (periodístico, sin verificar).
Falta, para cerrarlo bien, bajar de INEbase: población 0-14 y 15-64 por país de nacimiento (continente) y nacimientos por nacionalidad de ambos progenitores (tabla 6.x del MNP).

## 3. Comparación y diagnóstico

| Grupo | Juego hoy | Oficial (orientativo) | Diferencia |
|---|---:|---:|---|
| Adultos con origen extranjero | 25,6 % | nacidos fuera 20,2 % (todas las edades); nacionalidad 14,6 % | +5 pts sobre nacidos fuera: el juego cuenta además la 2.ª generación, pero el 25 % de partida es algo alto para el país entero. Madrid ciudad (19,4 % por nacionalidad) lo justifica solo en parte. |
| Niños y compañeros (origen familiar) | 27-29 % | alumnado extranjero 13,5 % (nacionalidad); nacimientos con ≥1 progenitor extranjero ~32 % (2021) | Coherente con «origen familiar» si el jugador lo mide por nombre/apellido; el doble del alumnado «extranjero» por nacionalidad. |
| Personaje: ≥1 padre extranjero | **46 %** | ~25-32 % de los nacimientos | **+15-20 pts: es el fallo estructural** (padres sorteados por separado). |
| Personaje mestizo (un padre de aquí, otro de fuera) | **39 %** de todos los personajes | minoría de los hijos con padre extranjero (la mayoría de parejas con extranjeros son de dos extranjeros; cifra exacta pendiente de INEbase) | Muy sobrerrepresentado. |
| Parejas de dos extranjeros del mismo origen | 15 % | mayoría (endogamia fuerte) | Falta emparejamiento por origen. |
| Origen por continente | Latinoamérica 8, Magreb 5, E. este 4, Subsah. 3, Asia 3, E. norte 2 | Sin tabla leída. Marruecos, Colombia y Rumanía lideran las nacionalidades extranjeras (Censo 2025) | Reparto plausible en orden; sin verificar el nivel por continente. Europa del norte 2 % parece algo alto frente a su peso, no frente a la intuición del jugador. |

Por qué «4-5 de 20»: el 27 % de los niños tiene algún origen extranjero (una persona de cada cuatro), más el nombre/apellido de la mezcla visible en todos los casos (el 12 % de mezclas sin origen local usa nombre local, pero el apellido extranjero se ve siempre). Y en el personaje y su familia se duplica: padre y madre sorteados por separado, mezclados casi siempre.

## 4. Propuesta (sin aplicar)

Dos cambios independientes:

**A. Emparejamiento por tipos (el que más pesa, y el que arregla al personaje).** En vez de sortear dos adultos libres, sortear el *tipo de pareja* y después los orígenes:

| Parámetro | Valor propuesto |
|---|---:|
| Pareja de dos extranjeros | 13 % |
| Pareja mixta (uno de fuera) | 12 % |
| Pareja de dos de aquí | 75 % |
| En las parejas de dos extranjeros, mismo origen | 70 % |

Aplicable a `origenDePadre` (los padres del personaje salen de la semilla: el sorteo del tipo debe ser función de la semilla), a los hermanos (heredan de esos padres, ya está) y a los niños del mundo (`persona(..., conGenetica)`): hoy se sortean como adultos y no como hijos de una pareja; para que el mundo siga la misma regla, cada niño nuevo debería sortearse como hijo de una pareja de este tipo.

**B. Demografía adulta (`ORIGENES.frecuencia`, ver `rasgos.ts`)** bajada del 25 % al 19 %:

| Origen | Hoy | Propuesta |
|---|---:|---:|
| España norte / centro / sur | 15 / 30 / 30 (= 75 %) | 16,2 / 32,4 / 32,4 (= 81 %) |
| Latinoamérica | 8 | 6,0 |
| Magreb | 5 | 4,0 |
| Europa del este | 4 | 3,5 |
| África subsahariana | 3 | 1,7 |
| Asia oriental | 3 | 1,8 |
| Europa del norte | 2 | 2,0 |
| **Total extranjero** | **25** | **19** |

(Pesos dados sin normalizar en la tabla del juego: suman 1,0 con España=0,75. Los de la propuesta suman 1,00.) Ajustar al alza si se prefiere acercar la ciudad grande (Madrid 19,4 % por nacionalidad, más por nacidos fuera). Esto es un nivel «razonable» con las fuentes que he podido ver; lo ideal es afinar con la tabla por continente de INEbase.

### Resultado medido (200 000 parejas, `npm run demografia`)

| Variante | Adulto extranjero | Hijo con ≥1 padre extranjero | Hijo, los dos padres | Hijo mestizo (solo un padre) | Mestizos entre los hijos con padre extranjero |
|---|---:|---:|---:|---:|---:|
| **Hoy** (parejas libres, 25 %) | 26,8 % | **46,5 %** | 7,2 % | 39,4 % | 85 % |
| Solo bajar la demografía (parejas libres, 19 %) | 20,5 % | 36,9 % | 4,2 % | 32,6 % | 89 % |
| Solo emparejar por tipos (demografía actual) | 19,0 % | 25,0 % | 13,0 % | 12,0 % | 48 % |
| **Propuesta** (A + B) | 19,0 % | **25,0 %** | 13,0 % | 12,0 % | 48 % |

Con la propuesta, entre 20 compañeros saldrían de media ~4-5 con algún origen extranjero si se les sortea como hijos de pareja (25 %) y ~4 si se queda el sorteo como adulto (20,5 %: «extranjero propio» sube algo por las mezclas del 10 %): el cambio visible está sobre todo en el personaje y su familia (de 46 % a 25 %) y en que el hijo mestizo deja de ser la norma.

Nota sobre el tipo de pareja: el 13/12 es un supuesto razonable (nacimientos ≥1 progenitor extranjero ~25-32 %, con parejas de dos extranjeros algo más de la mitad); **hay que contrastarlo con la tabla del INE de nacimientos por nacionalidad de ambos progenitores**.

## 5. Qué decidir

1. ¿Aplicar A (emparejamiento por tipos) a los padres de la semilla? Es el cambio más claro. Rompe las semillas existentes (otro padre/madre/origen/nombre para la misma semilla; las partidas guardadas conservan los suyos) y cambia el `huella`.
2. ¿Aplicar B (demografía 25 → 19 %)? Cambia toda la población del mundo; `ANEXO_NOMBRES.md` y `PAQUETES_DE_PAIS.md` (demografía de España) habría que actualizarlos. Argentina e Inglaterra tienen su propia tabla y no se tocan.
3. ¿Sortear los niños del mundo como hijos de una pareja? Es el único cambio que toca el módulo `npcs` (y su `persona()`); quedan los compañeros como hijos de padres «virtuales» sin crearlos.
4. Antes de aplicar, abrir INEbase (tablas citadas en §2) con una red que permita `ine.es` y afinar los porcentajes por continente y por tipo de pareja.
