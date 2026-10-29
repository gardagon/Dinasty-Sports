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
- Carga y guardado **asíncronos**. El guardado se agrupa cada medio segundo y nunca se hacen dos a la vez (si hay cambios mientras se guarda, se repite al acabar). **Cuándo** se guarda lo decide la frecuencia elegida (§8, por defecto cada día); con «tras cada acción» se fuerza además al cerrar u ocultar la pestaña, y con las demás se escribe una copia de recuperación.
- **Almacenamiento persistente:** tras el primer guardado se pide `navigator.storage.persist()` para que el navegador no borre los datos si falta espacio.
- **Errores visibles:** si no se puede guardar (cuota, modo privado...), la cabecera lo dice y recomienda exportar una copia.
- **Copias de seguridad:** botones Exportar (ahora dentro de «Opciones»; descarga `dinasty-sports-<nombre>-<fecha>.json`, el mismo texto que se guarda) e Importar (también en la pantalla inicial). El archivo se valida y `Game.load` rechaza las versiones que no coinciden.
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
- **Dos pestañas a la vez:** resuelto el 28/10 con `navigator.locks` (`apps/web/src/pestana.ts`): solo la primera pestaña guarda; la otra avisa, no guarda y se recarga sola cuando la primera se cierra. Sin la API de bloqueos (navegadores antiguos) gana el último guardado.
- **Versiones:** en alfa una partida de otra versión se descarta (`SAVE_VERSION`). Desde la beta habrá que migrar: una función por salto de versión (`migraciones[v]`) que convierte el estado.
- **Cuota:** si se llena, el guardado falla con aviso. La exportación es la salida.
- **Privacidad:** todo queda en el navegador de la persona; no se envía nada.

## 6. Cómo probarlo

- `npm test` (incluye `apps/web/src/almacen.test.ts`).
- En un navegador real: empezar una partida, recargar (debe volver al mismo sitio y hora), exportar (en «Opciones» de la partida), cambiar el guardado automático a «Solo a mano», hacer acciones y cerrar la pestaña (al volver debe ofrecer recuperar), «Menú» con cambios sin guardar (debe preguntar), «Menú» → «Nueva partida», «Cargar partida». En las herramientas del navegador, Application → IndexedDB → `dinasty-sports` → `partidas`.

## 7. ¿Una base de datos en un servidor para tener más de 30 000 personas? (29/10/2026)

Pregunta del usuario. **No es lo que se decidió ni lo que hace falta.** Lo decidido (§2) es **IndexedDB, que es una base de datos del propio navegador** (local, en el dispositivo), y se descartó expresamente un servidor. IndexedDB quita el problema del **espacio** (cientos de MB), pero no el del **tiempo de guardar**, porque hoy se guarda la partida entera cada vez.

- **Lo que dicen las medidas** (anexo de horarios §5 y §3 de este documento, equipo de pruebas): el procesador no es el límite; con 30 000 personas, un día entero ~17 ms y la lista de acciones ~15 ms. El límite es el guardado completo: ~28 MB de partida y, con el guardado en texto de hoy (~60 ms con 10 000), **unos 0,2 s cada vez en el equipo de pruebas y varias veces más en un móvil**, cada medio segundo mientras se juega. Se notaría.
- **Un servidor no lo arregla por sí solo:** la partida se simula en el navegador, así que habría que enviar esos 28 MB por la red en cada guardado (peor que escribirlos en local). Solo ayudaría si la simulación también se hiciera en el servidor: es otra arquitectura (cuentas, coste de servidores y sin jugar sin conexión, cuando hoy es una PWA que funciona sin red).
- **Lo que sí permite 30 000 personas o más sin salir del dispositivo** son las fases de §4: guardado incremental (solo las personas que cambian), rasgos compactos (de ~950 a ~500 bytes por persona) y población desde la semilla guardando solo las diferencias (sin límite práctico). Cada una tiene su disparador medido.
- **Un servidor tendría sentido por otros motivos**: jugar la misma partida en el móvil y el ordenador, copias en la nube. Sería una **copia o sincronización** de la partida local, no el almacén con el que se juega.
- Con el modelo híbrido del fútbol (`ANALISIS_FUTBOL.md` §3.4) un deporte de equipo suma cientos de personas, no miles: no obliga a pasar de fase.
- **Con el guardado elegible de §8** el coste de guardar la partida entera deja de notarse en cada acción (una vez al día, a la semana o al mes de juego), así que el límite práctico sube sin cambiar el almacén; lo que sigue creciendo con la población es el tiempo de abrir la partida y la memoria.

## 8. Guardado manual y automático (propuesta del usuario, 30/10/2026; hecho el mismo día)

Hoy se guarda **tras cada acción** (agrupado cada medio segundo) y al cerrar u ocultar la pestaña, y bajo el nombre hay tres botones (Exportar, Importar, Menú). Propuesta (resumen en `PLAN_DEPORTES_MODULARES.md` §6):

- **Botón «Opciones»** en la cabecera de la partida, al lado de «Menú», que reúne: **Guardar partida** (con la última vez que se guardó, en fecha del juego), **guardado automático**, **exportar e importar una copia**, el **instalador de deportes** y los **paquetes de país**.
- **Guardado automático a elegir:** tras cada acción (como ahora), **cada día** (al pasar la medianoche del juego), **cada semana** (al empezar el lunes), **cada mes** (al cambiar de mes en el calendario del juego) o **solo a mano**. Se guarda por partida. **Por defecto, cada día.**
- **Recomendación según la máquina:** el juego mide cuánto tarda cada guardado y sugiere una frecuencia.
- **Salir con los botones del juego** (Menú, Salir) con cambios sin guardar: «Guardar y salir / Salir sin guardar / Cancelar».
- **Cerrar la pestaña:** el navegador no deja preguntar «¿guardar?» con botones propios (solo su aviso genérico, y en el móvil ni eso). Por eso: aviso genérico del navegador (`beforeunload`) si hay cambios y **copia de recuperación**: al ocultarse o cerrarse la pestaña se escribe en IndexedDB una copia aparte (no la partida guardada). Al volver, si es más reciente que la guardada: «Hay una partida sin guardar más reciente: ¿recuperarla?».
- **No cambia el formato** de lo guardado ni las copias de seguridad. Solo toca la interfaz (`apps/web/src/main.ts`, `almacen.ts`).
- **Cómo quedó (fase G):** la lógica probada en tests está en `almacen.ts` (`tocaGuardar`, `recomendarFrecuencia`, `leerFrecuencia`/`escribirFrecuencia`, `guardarRecuperacion`/`leerRecuperacion`/`borrarRecuperacion`); la interfaz (ventanas, `beforeunload`, `visibilitychange`) en `main.ts`. La frecuencia se guarda por partida en `localStorage` (`dinasty-sports.guardado.<id>`) y la copia de recuperación en el mismo almacén con id `recuperacion` (sin cambiar el esquema de IndexedDB; `listar()` la incluye, a filtrar cuando haya selector de partidas). Con «Solo a mano» o frecuencias largas, lo no guardado se pierde si el navegador no llega a escribir la copia (p. ej. el móvil mata la pestaña a mitad de escritura): es el coste de elegirlo.
