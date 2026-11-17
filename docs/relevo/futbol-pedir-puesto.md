# Relevo: pedir puesto en el fútbol (17/11/2026)

Rama `claude/futbol-pedir-puesto` (sale de `claude/youthful-clarke-vs0kye`). Sin pull request.

## B. Dificultad de pedir otro puesto en el primer entrenamiento — HECHO

**Formato (general, nada de fútbol en el motor):** la tirada admite `ajustes: [{ si: [condiciones], mas: N }]` (`AjusteDeTirada` en `contracts/src/sucesos/tipos.ts`).
Si se cumplen todas las condiciones del ajuste, la dificultad suma `mas` (negativo = más fácil); los que se cumplen se suman y el total se queda entre 0 y 100
(`dificultadDeTirada`, `condiciones.ts`). Se usa en los tres sitios donde se tira o se enseña la probabilidad (`modules/sucesos`: tirada del personaje, tirada de un PNJ
y probabilidad del modo «números»). El catálogo valida que cada ajuste tenga `mas` numérico y al menos una condición, y sus condiciones se comprueban como las demás (papeles del reparto).
No hizo falta tocar nada más: `relacion` y `hecho` ya eran condiciones, y el fútbol ya publicaba `futbol.ventaja_del_mejor_puesto` (lo que vale en su mejor puesto menos lo que vale en el actual, en puntos de valor).

**Cifras PROVISIONALES** (`modules/futbol/src/eventos/primer_entrenamiento.ts`). Base 55 (la de antes) más escalones acumulados:

| Condición | Ajuste |
|---|---|
| Relación con el entrenador: antipatía, enemigo o antagonista | +10 |
| Afinidad ≥ 20 | −5 |
| Afinidad ≥ 40 (≈ amigo) | −5 más (−10 en total) |
| Afinidad ≥ 75 (≈ mejor amigo) | −5 más (−15 en total) |
| Vale ≥ 3 más en el puesto que pide | −5 |
| Vale ≥ 10 más | −5 más (−10 en total) |
| Vale ≥ 20 más | −5 más (−15 en total) |
| Vale ≤ −3 (menos en el puesto que pide) | +8 |
| Vale ≤ −10 | +7 más (+15 en total) |

Sin vínculo con el entrenador (no debería pasar con club) no hay ajuste de relación. Rango total: 25 (amigo íntimo, vale ≥ 20 más) a 80 (enemigo, vale ≤ −10).

**Tabla de ejemplos: dificultad** (la stat es `gen.comunicacion` «para su edad»; ver la probabilidad abajo). Relación: baja = afinidad −20 (antipatía), media = 25, alta = 50 (amigo). Vale más = +15, igual = 0, menos = −6.

| Relación \ Vale | más (+15) | igual (0) | menos (−6) |
|---|---|---|---|
| baja | 55 | 65 | 73 |
| media | 40 | 50 | 58 |
| alta | 35 | 45 | 53 |

Probabilidad de éxito con una comunicación «para su edad» típica (40) y con una alta (60), `probabilidadDeExito` (50 % con stat = dificultad, ±15 puntos por cada 10):

| Dificultad | 35 | 40 | 45 | 50 | 53 | 55 | 58 | 65 | 73 |
|---|---|---|---|---|---|---|---|---|---|
| comunicación 40 | 58 % | 50 % | 43 % | 35 % | 31 % | 28 % | 23 % | 13 % | 5 % |
| comunicación 60 | 88 % | 80 % | 73 % | 65 % | 60 % | 58 % | 53 % | 43 % | 31 % |

Nota de diseño a revisar: el evento solo ofrece pedir el MEJOR puesto, así que `ventaja_del_mejor_puesto` es siempre ≥ 0 hoy y la columna «vale menos» no se alcanza (solo
saldría si un evento futuro pide un puesto concreto que no es el mejor). Las filas negativas ya funcionan (están probadas) para cuando haya un evento así.

**Tests:** `packages/contracts/src/sucesos/sucesos.test.ts` (los ajustes en general) y `tests/eventos-primeros.test.ts` (la tabla de arriba con el evento real). `npm run eventos:validar` en verde.
**Anexo:** `docs/ANEXO_EVENTOS.md` (formato de la tirada y tabla «qué tocar»).

## A. «Pedir jugar…» en la ficha — PARADO, pendiente de decisión (ver abajo)
