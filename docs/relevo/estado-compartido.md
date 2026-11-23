# Relevo: estado compartido entre partidas

_Segunda pasada (a petición de la sesión de arquitectura): el arreglo definitivo es de abajo; el primero (reiniciar el contador al crear y al cargar) se sustituyó._

## Causa
`versionDeIndices` (`modules/npcs/src/index.ts`) era un contador del proceso (`PresenciaService.version`) y `relaciones`, la web y varias herramientas lo usaban como azar del aforo (`aforoCercano(lugar, presencia.version)`). `npcs`, en cambio, usaba `${día}:${intervalo}`. La segunda partida de un proceso seguía contando donde acabó la primera, y guardar y cargar reiniciaba el contador: otro aforo.

Reproducción mínima: `vago` 2 solo → `1463 296d922625c9`; tras `equilibrado` 1 → `1459 bbb8e864cb69`.

## Arreglo
- El azar del aforo es siempre `${día}:${intervalo de presencia}`. Nuevo `PresenciaService.aforo(lugar)` (contracts, calculado en `npcs`); lo usan `relaciones`, `apps/web/src/gente.ts`, `tests/fichas-y-listas.test.ts` y `tools/listas-de-acciones.ts`.
- `PresenciaService.version` queda solo como clave de caché (`ULTIMOS_CERCANOS` de `relaciones`): contador del proceso que no se reinicia ni se guarda ni entra en ningún sorteo. Se quitó el reinicio en `initState` y `alCargar`, que ya no sirve para nada. Se quitó también `indice` (la primera pasada): `version` ya cumple su papel.
- Tests: `tests/estado-compartido.test.ts`: cuatro casos (bots tras otra partida, orden y repetición, guardar y cargar a mitad con JSON, y otra partida antes). Los de los bots fallan sin el arreglo de la primera pasada; los de aforo cubren el nuevo.

## Otras variables globales revisadas
Las demás cachés (`TALENTOS`, `ULTIMOS` de nombres, `HORARIOS`, `CLASES`, `CLASES_CACHE`, `REPASOS_CACHE`, `AGENDAS_COMPARTIDAS`, los `WeakMap` y los `memo*` de `relaciones`) tienen como clave todo lo que determina su valor (semilla, id, nombre, género, contenido): son puras. `PAIS_GENERANDO` se fija y se restablece con try/finally. Los `memo*` de `relaciones` y `MEMORIA` de retrato crecen sin límite entre partidas (memoria, no resultado). No he tocado ninguna.

## Huella (`npm run huella -- 60`)
Es un arreglo: cambian las partidas que usan el aforo. Cada bot da ahora **lo mismo jugado solo (proceso nuevo) que dentro de `huella`** (16/16, comprobado). Valores anteriores = tras la primera pasada (= jugados solos con el código original); originales = `huella` antes de todo.

| bot | original (en `huella`) | primera pasada (= solo antes) | **ahora** |
|---|---|---|---|
| equilibrado 1 | 2338 4eadb1e1c4e3 | 2338 4eadb1e1c4e3 | **2329 215740143df2** |
| equilibrado 2 | 2350 98960037b9be | 2360 b268adb80535 | **2357 f3e28086f4f4** |
| madrugador 1 | 2431 a564b7940fc9 | 2409 33d03ed54b90 | **2412 a5a4826268a8** |
| madrugador 2 | 2439 2d9e678e1f41 | 2439 ef995cb69d17 | **2437 040d5e6f9d04** |
| empollon 1 | 1788 a39de5a256b7 | 1793 87a93783d8e1 | **1790 79b4f0e35a47** |
| aleatorio 1 | 3069 b941a62687af | 2820 319fa2385784 | **3069 b941a62687af** |
| aleatorio 2 | 3035 ffb931227d11 | 2911 1ada8934a891 | **3035 ffb931227d11** |

Sin cambios respecto a la primera pasada: empollon 2 (1830 a008e3c0e063), atleta 1 y 2, sobreentrena 1 y 2, vago 1 y 2 (vago 2 = 1463 296d922625c9), abandono 1 y 2 y los dos de fútbol. `aleatorio` vuelve a sus valores originales (3069 y 3035): no lo he investigado más (el bot elige al azar entre las acciones y es sensible a la lista de cercanos); no es un fallo, solo se anota.

## Comprobaciones
- `npm run typecheck`: ✅
- `npm test`: ✅ 129 archivos, 1388 tests, 400 s.
- `npm run probar-web`: ✅ (todo el camino en Chromium, sin errores en la consola).
