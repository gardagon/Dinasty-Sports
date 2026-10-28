# Almacenamiento y guardado de partidas

Plan y estado de cómo se guarda el juego. Decidido el 25/10/2026.

## 1. Qué se guarda y cuánto pesa

`GameState` es JSON plano (ver `docs/ARQUITECTURA.md`, «Guardado»). Casi todo el peso son las personas:

| Qué | Tamaño |
|---|---|
| Una persona (con aspecto, carácter, intereses, gustos) | ~950 bytes (535 de rasgos) |
| Partida con ~393 personas | ~0,4 MB |
| 2 000 / 10 000 / 50 000 personas | 1,9 / 9,4 / 47 MB |


## 2. Decisión: IndexedDB para guardar, JSON para las copias de seguridad

- **IndexedDB es el almacén vivo.** Cientos de MB o más, escritura asíncrona y varias partidas.
- **JSON es el formato de lo que se guarda y de la copia de seguridad** (exportar e importar un archivo): se guarda el texto JSON de la partida, que es lo mismo que se exporta. No sirve como almacén: el navegador no puede escribir archivos en silencio (cada guardado sería una descarga) y no hay una API de ficheros que funcione en todos los navegadores.
- **Por qué no SQLite (OPFS/WASM) ni un servidor:** más peso y más trabajo del que hace falta para guardar un estado entero. Se reconsidera si algún día hay que consultar la población sin cargarla.

## 3. Fase 1 (hecha): capa de almacén

- `apps/web/src/almacen.ts`: interfaz `Almacen` (`cargar`, `guardar`, `borrar`, `listar`) con dos implementaciones: `AlmacenIndexedDB` y `AlmacenEnMemoria` (para los tests y para los navegadores que no dejan usar IndexedDB, como algunos modos privados: se avisa de que la partida se perderá al cerrar).
- **Se guarda el texto JSON** de la partida (`Game.serializarJSON`), no el objeto. Medido en Chromium con 10 000 personas (9 MB): copiar el estado 226 ms + escribir el objeto 80 ms bloqueando el navegador (~300 ms), frente a convertir a texto 52 ms + escribir el texto 10 ms (~60 ms); leer y analizar el texto (56 ms) también gana a leer el objeto (85 ms). Al cargar, el estado recién leído del texto no se copia otra vez (`Game.load(..., { copiar: false })`).
- Esquema v1: base `dinasty-sports` con dos tablas: `resumen` (id, nombre, fecha, versión: pequeña, para listar partidas sin leerlas) y `datos` (id → texto JSON). Se escriben en la misma transacción. Preparado para **varias partidas** (la actual es `actual`).
- Carga y guardado **asíncronos**. El guardado se agrupa cada medio segundo, nunca se hacen dos a la vez (si hay cambios mientras se guarda, se repite al acabar) y se fuerza al cerrar o ocultar la pestaña.
- **Almacenamiento persistente:** tras el primer guardado se pide `navigator.storage.persist()` para que el navegador no borre los datos si falta espacio.
- **Errores visibles:** si no se puede guardar (cuota, modo privado...), la cabecera lo dice y recomienda exportar una copia.
- **Copias de seguridad:** botones Exportar (descarga `dinasty-sports-<nombre>-<fecha>.json`, el mismo texto que se guarda) e Importar (también en la pantalla inicial). El archivo se valida y `Game.load` rechaza las versiones que no coinciden.
- **Tests** (`almacen.test.ts`, con `fake-indexeddb`): contrato común a las dos implementaciones, persistencia entre conexiones, una partida de más de 5 MB con 6 000 personas extra, la copia (no cambia aunque la partida siga) y el JSON.

## 4. Fases siguientes (con su disparador)

No se hacen hasta que se cumpla la condición; medir antes.

| Fase | Qué | Disparador |
|---|---|---|
| 2 | **Guardado incremental por colecciones.** La partida se guarda en trozos: el núcleo (tiempo, stats, módulos pequeños) y una colección por módulo grande (`npcs`, una entrada por persona). Solo se escriben las entradas que han cambiado. | Un guardado completo tarda más de ~100 ms (hoy: 10 ms con 400 personas; ~3 000 personas). |
| 3 | **Compactar los rasgos** (ids numéricos en vez de textos): de 535 a ~60 bytes por persona. | Cuando se pase de ~3 000 personas o de ~3 MB guardados. |
| 4 | **Población desde la semilla y guardar solo las diferencias** (si la conoces, tu club, su nivel...). Exige que la generación de cada persona sea determinista y estable entre versiones. | Más de ~50 000 personas o deportes de equipo con ligas completas. |

Requisitos de la fase 2 que conviene cuidar desde ya:

- Cada colección se identifica por módulo y por id estable de la entrada (las personas ya los tienen).
- Detectar cambios por **referencia del objeto**: lo que no cambia debe conservar su objeto. Hoy `npcs` recrea todas las personas cada día (`DAY_END`); habrá que recrear solo las que cambian (los rivales que progresan).
- Un módulo declararía qué colecciones tiene (en contracts, sin que el núcleo sepa de personas): algo como `colecciones: { personas: { leer(estado), escribir(estado, entradas) } }`.

## 5. Riesgos y decisiones abiertas

- **Safari en iPhone** borra los datos de una web sin uso en 7 días, salvo que esté instalada en la pantalla de inicio (esta es una PWA instalable). Mitigación: pedir persistencia (hecho), recomendar instalar y exportar copias.
- **Dos pestañas a la vez:** gana el último guardado. Pendiente (no urgente): bloquear con `navigator.locks` para que solo una pestaña guarde.
- **Versiones:** en alfa una partida de otra versión se descarta (`SAVE_VERSION`). Desde la beta habrá que migrar: una función por salto de versión (`migraciones[v]`) que convierte el estado.
- **Cuota:** si se llena, el guardado falla con aviso. La exportación es la salida.
- **Privacidad:** todo queda en el navegador de la persona; no se envía nada.

## 6. Cómo probarlo

- `npm test` (incluye `apps/web/src/almacen.test.ts`).
- En un navegador real: empezar una partida, recargar (debe volver al mismo sitio y hora), exportar, «Nueva partida», importar. En las herramientas del navegador, Application → IndexedDB → `dinasty-sports` → `partidas`.
