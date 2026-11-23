# Relevo: estado compartido entre partidas

## Causa
`versionDeIndices` (`modules/npcs/src/index.ts`) era un contador del proceso. Es `PresenciaService.version` y `relaciones` lo usa como azar del aforo (`aforoCercano(lugar, presencia.version)`). La segunda partida de un proceso seguía contando donde acabó la primera, y por eso su aforo (y todo lo que depende de quién tienes cerca) cambiaba. Incluso `vago` 2 tras `vago` 2 daba otra cosa.

Reproducción mínima: `vago` 2 solo → `1463 296d922625c9`; tras `equilibrado` 1 → `1459 bbb8e864cb69`.

## Arreglo
- `npcs`: el contador vuelve a 0 al crear (`initState`) y al cargar (`alCargar`) una partida.
- `PresenciaService.indice` (contracts): contador del proceso que no se reinicia y no entra en ningún sorteo. `relaciones` lo usa como clave de su caché de cercanos (`ULTIMOS_CERCANOS`), que si no mezclaría partidas porque `version` se repite.
- Test: `tests/estado-compartido.test.ts` (falla sin el arreglo, pasa con él).

## Otras variables globales revisadas
Las demás cachés (`TALENTOS`, `ULTIMOS` de nombres, `HORARIOS`, `CLASES`, `CLASES_CACHE`, `REPASOS_CACHE`, `AGENDAS_COMPARTIDAS`, los `WeakMap` y los `memo*` de `relaciones`) tienen como clave todo lo que determina su valor (semilla, id, nombre, género, contenido): son puras. `PAIS_GENERANDO` se fija y se restablece con try/finally. No he tocado ninguna. Los `memo*` de `relaciones` y `MEMORIA` de retrato crecen sin límite entre partidas (memoria, no resultado).

## Límite (decisión de diseño pendiente)
Si dos partidas se juegan **intercaladas**, el contador seguiría compartido. No ocurre hoy. Arreglarlo exige un id de partida estable en el motor (el estado de módulo se sustituye en cada acción).

## Huella (`npm run huella -- 60`)
Cada bot jugado solo (proceso nuevo) es **idéntico antes y después** (16/16). En la corrida completa, antes y después:

| bot | antes | después (= solo) |
|---|---|---|
| equilibrado 2 | 2350 98960037b9be | 2360 b268adb80535 |
| madrugador 1 | 2431 a564b7940fc9 | 2409 33d03ed54b90 |
| madrugador 2 | 2439 2d9e678e1f41 | 2439 ef995cb69d17 |
| empollon 1 | 1788 a39de5a256b7 | 1793 87a93783d8e1 |
| empollon 2 | 1830 41b7c4779c0e | 1830 a008e3c0e063 |
| vago 2 | 1459 bbb8e864cb69 | 1463 296d922625c9 |
| aleatorio 1 | 3069 b941a62687af | 2820 319fa2385784 |
| aleatorio 2 | 3035 ffb931227d11 | 2911 1ada8934a891 |

Sin cambios: equilibrado 1, atleta, sobreentrena, vago 1, abandono y los dos de fútbol. Las diferencias son las líneas que antes salían contaminadas por el orden.
(El `a1300f5c1d01` del relevo anterior no sale con el `madrugador` ya añadido; la referencia buena es el valor jugado solo.)

## Comprobaciones
- `npm run typecheck`: ✅
- `npm test` y `npm run probar-web`: ver el final de este documento (pendientes al hacer el primer commit).
