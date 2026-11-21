# Guardar sin congelar la página (21/11/2026)

Encargo de la arquitectura (rama `claude/guardar-sin-congelar`, desde `claude/youthful-clarke-vs0kye`): propuesta 3 de `revision-rendimiento.md` §6 y vigilar el peso de la partida guardada. **No se ha tocado el juego** (solo `apps/web` y `tools/`); la huella no cambia. No se ha tocado `DECISIONES.md`.

## 0. Resumen

1. **Guardar ya no congela la página.** La conversión a texto se hace **por trozos de ~8 ms con pausas**, no en un trabajador (§2: pasarle el estado cuesta lo mismo que convertirlo). La página se detiene como máximo **34 ms (escritorio) y 40 ms (móvil ×4)** en vez de **310 ms y 1.620 ms**. El trabajo total baja a la mitad (el texto por trozos es más rápido que un `JSON.stringify` gigante) y el texto guardado es **byte a byte el mismo**.
2. **El guardado se vuelca a un `Blob`** que IndexedDB guarda sin bloquear (el `put` de la cadena de 16 MB bloqueaba 44 ms en escritorio y 190 ms en el móvil ×4; el del `Blob`, 0 ms) y que se lee de vuelta fuera del hilo. Efecto de rebote bueno: **abrir la partida en el móvil ×4 baja de ~3,5 s a ~1,4 s**; en escritorio queda igual (0,8 s).
3. **Un clic durante un guardado no espera**: la página descarta el texto a medias y lo repite al quedarse quieta (§3). Clic en mitad de un guardado: mediana 29 ms (escritorio) y 50 ms (móvil) frente a 25 y 45–50 ms sin guardar.
4. **Peso vigilado** (§5): `npm run presupuesto` **avisa sin fallar** si el estado pasa de 3.300 KB (ciudad de prueba) o 18.000 KB (grande) y dice qué módulo y campo han crecido frente a una referencia anotada (`tools/peso-base.json`). En Opciones se enseña lo que pesa la partida guardada.
5. `recomendarFrecuencia` retocada: sin tirones, los límites son más holgados (§4).

## 1. Cifras antes y después (`npm run rendimiento:web`, ciudad grande + fútbol, semilla 35)

«Antes» = el guardado de golpe de siempre (`serializarJSON` + `put` de la cadena), medido **en la misma pasada** que el nuevo. «Ahora» = el guardado real del juego (`guardarAhora` del asa de depuración: por trozos, hasta IndexedDB). «La página se detiene» = el hueco más largo de un reloj que no para (un mensaje que se reenvía a sí mismo), que es lo que nota el jugador.

| | Escritorio antes | Escritorio ahora | Móvil ×4 antes | Móvil ×4 ahora |
|---|---|---|---|---|
| **La página se detiene como máximo al guardar** | 310 ms | **34 ms** | 1.617 ms | **40 ms** |
| Trabajo de CPU de guardar (sin pausas) | 281 ms (texto) | 227 ms | 1.610 ms | 664 ms |
| Guardar entero, de punta a punta | 543 ms | 237 ms | 1.950 ms | 692 ms |
| `put` de IndexedDB: lo que bloquea | 44 ms | 0 ms | 189 ms | 0 ms |
| **Clic durante el guardado**: mediana / máx | — | 29 / 68 ms | — | 50 / 129 ms |
| Acción sin guardar: mediana / p90 (referencia) | 25 / 41 ms | igual | 50 / 100 ms | igual |
| **Abrir de nuevo** | 0,8 s | 0,8 s | ~3,5 s | **1,4 s** |
| Peso guardado | 16.056 KB | 16.056 KB | 16.056 KB | 16.056 KB |

(Las pasadas bailan ±10 %. Con 6 clics durante el guardado la «máx» es ruidosa; en una pasada anterior, antes de ajustar la cesión, salió 705 ms en el móvil: era un clic que acababa el guardado de golpe, ver §3.)

Qué mide cada cosa y qué no: la herramienta no tiene el «antes» de un clic durante un guardado (el guardado de golpe, por definición, no se interrumpe: un clic en ese momento esperaría hasta 1,6 s en el móvil). No incluye el guardado de la copia de recuperación al esconder la pestaña (síncrono a propósito, §3). La creación de la partida no ha cambiado (27–32 s).

## 2. Por qué por trozos y no en un trabajador

El estado vive en la página. Un trabajador necesita **una copia**: `postMessage` / `structuredClone` de 16 MB cuesta lo mismo que `JSON.stringify` (0,25–0,3 s en escritorio, ×4 en móvil, en el hilo de la página), así que no quita el bloqueo, solo lo cambia de sitio. Tampoco se puede pasar el objeto por referencia. Habría que mover **el juego entero** al trabajador (render por mensajes), que es otro proyecto. Por trozos sí quita el bloqueo, y es de hecho más rápido en total:

| (Node, 16 MB, 4 pasadas) | de golpe | por trozos |
|---|---|---|
| tiempo total | 255–319 ms | **159–218 ms** |

Cómo se trocea (`apps/web/src/serializar.ts`): un generador que va dando las piezas de texto en el orden de `JSON.stringify`; los contenedores grandes (listas de más de 64 objetos, como las personas, y lo que las contiene) se recorren elemento a elemento y el resto se convierte de una vez. Cada ~8 ms se cierra un trozo y se cede con un mensaje (`MessageChannel`, sin el mínimo de 4 ms de `setTimeout`; no con `scheduler.yield`, cuya continuación adelanta a las demás tareas y dejaría sin turno a los temporizadores del juego). El texto es idéntico al de `serializarJSON` (test con listas grandes, `undefined`, funciones y una partida de verdad).

`Game` no enseña su estado vivo (solo `serialize()`, que copia, y `serializarJSON()`), así que se lee `game.s` con un cast (`serializarPartidaPorTrozos`); si algún día `s` no existe, cae al guardado de golpe. **Para la arquitectura**: un getter de solo lectura en `Game` (p. ej. `estadoVivo()`) lo dejaría limpio; no lo he tocado porque no es `apps/web`.

Sobre el `Blob`: se crea trozo a trozo según sale el texto y al final se unen (`new Blob(blobs)` no copia). Crear de golpe un `Blob` de 16 MB costaba 100–130 ms (escritorio) y ~400–500 (×4), por eso no se hace al final. Si un navegador no deja guardar `Blob`s en IndexedDB (algún modo privado), se guarda el texto (`console.warn`). `cargar` acepta las dos formas (partidas guardadas como texto antes de este cambio siguen abriendo), así que **no hace falta migrar nada**.

## 3. Consistencia: el guardado y los clics

La partida sigue viva mientras se trocea; si una acción cambiara el estado a mitad, el texto mezclaría momentos distintos. Regla (`alCambiarElEstado`, que llama `realizar()` de `main.ts`, la única puerta por la que la página cambia el estado: `game.perform` tenía 7 llamadas, todas pasan por ella; `añadir/quitar deporte` y `cargar` crean otro `Game` y no tocan el viejo):

- Un cambio con un guardado a medias **lo descarta** (el clic no espera) y el guardado se repite a los 500 ms de quedarse quieta la pantalla (`escribirPartida`). Lo descartado no deja nada escrito; `sinGuardar` sigue en verdad.
- Para que no se quede sin guardar nunca quien hace clic sin parar: tras **3 descartes seguidos** el siguiente guardado se **acaba de golpe** antes del cambio (a lo sumo lo que costaba antes, 0,3 s / 1,6 s). La cuenta vuelve a 0 con un guardado que acaba.
- Al **esconder o cerrar la pestaña** con guardado tras cada acción se acaba de golpe lo que esté a medias (`terminarSerializacionEnCurso`), para que la escritura salga antes de que la página desaparezca.
- La **copia de recuperación** al esconder la pestaña y la **exportación** siguen siendo síncronas (al esconder nadie ve el tirón; al cerrar no hay tiempo para pausas; exportar es una orden del jugador). No se han tocado.
- Si mientras se guarda se carga, crea o borra otra partida, el texto viejo **no se escribe** (si no, una partida borrada resucitaría): se descarta y, si hay partida nueva, se guarda esa.
- Se mantienen: guardar tras cada acción o espaciado, el aviso de error, la recuperación, la exportación y la pestaña única.

Alternativa descartada: acabar siempre de golpe al llegar un clic. Con ella el clic en mitad de un guardado en el móvil esperaba 0,5–0,7 s (medido: mediana 476 ms), lo que reintroduce justo el tirón.

## 4. `recomendarFrecuencia`

Hasta ahora recomendaba por lo que tardaba guardar en el hilo (< 80 ms «tras cada acción», < 250 «cada día», < 1.000 «cada semana», si no «cada mes»). Ahora el número es **el trabajo de CPU de guardar** (sin pausas) y los límites son 150 / 600 / 2.500 ms: ya no hay tirones, lo que queda es gastar CPU y batería en guardar 16 MB tras cada acción. Con la ciudad grande: escritorio (~230 ms) → «cada día de juego» (antes «cada semana»); móvil ×4 (~660 ms) → «cada semana» (antes «cada mes»). El texto de Opciones cambia a «Guardar tu partida cuesta X de trabajo (sin congelar la pantalla): te recomendamos …». El valor por defecto (`dia`) no cambia.

## 5. Peso de la partida guardada

- **`npm run presupuesto`** ya no falla por el peso: **avisa** (⚠️, código de salida 0). Con el estado por encima del tope (3.300 KB la ciudad de prueba, 18.000 KB la grande) imprime los campos que han crecido frente a lo anotado en **`tools/peso-base.json`** (`módulo.clave.campo`, antes → ahora, KB). Ejemplo real (rasgos tocados a mano en la referencia):
  ```
  ⚠️  AVISO: el estado de la partida pesa 2968 KB y el tope es 2900 KB (no falla: …).
     Ha crecido frente a la referencia (2968 KB):
     · npcs.npcs.rasgos 700 → 913 KB (+213 KB)
  ```
- `npm run presupuesto -- --peso [--ciudad]` mide **solo el peso** (≈ 1 s la ciudad de prueba, ≈ 35 s la grande).
- `npm run presupuesto -- --peso [--ciudad] --anotar` pone el peso actual como referencia. **Cuando el crecimiento sea a propósito, se anota; si no, el aviso sigue saliendo.** Hoy: prueba 2.968 KB, ciudad grande 16.090 KB.
- **En Opciones** (junto a la recomendación de guardado): «La partida guardada pesa 15,7 MB. La pantalla no se detiene más de 34 ms de una vez.» (tras el primer guardado de la sesión; en bytes del `Blob`).
- No he añadido el aviso a `npm test`: crear la ciudad grande son 30 s y los tests ya tardan 15 minutos; la de prueba sí es barata (~1 s con `--peso`), pero un «test con aviso» no existe en vitest sin fallar. Si la arquitectura lo quiere, la forma es un test normal con `expect(KB).toBeLessThan(3300)` (decisión suya).

## 6. Abrir la partida

Mejora gratis por el `Blob` (§0.2): la lectura del `Blob` (`blob.text()`) va fuera del hilo, y `get` de la cadena de 16 MB costaba ~125–145 ms (escritorio) y ~320–390 ms (×4) en el hilo. Lo que queda es `JSON.parse` + `cargarPartida`, que **no se pueden trocear** (`JSON.parse` es atómico) ni llevar a un trabajador sin copiar el resultado (misma cuenta que en §2); abrir es además una pantalla de «cargando», no una página interactiva congelada. No se ha tocado.

## 7. Qué se ha cambiado

| | |
|---|---|
| `apps/web/src/serializar.ts` (nuevo) | La conversión a texto por trozos (`SerializacionPorTrozos`, `serializarPorTrozos`, `ceder`), `alCambiarElEstado`, `terminarSerializacionEnCurso`. |
| `apps/web/src/almacen.ts` | `PartidaEnBlob`, `serializarPartidaPorTrozos`; `Almacen.guardar` acepta texto o `Blob`; IndexedDB lee y guarda `Blob` (con vuelta al texto si el navegador no puede); `recomendarFrecuencia`/`textoDeRecomendacion` retocadas; `textoDePeso`. |
| `apps/web/src/main.ts` | `escribirPartida` por trozos con descarte y reintento; `realizar()` (puerta única de las acciones); cierre de pestaña; peso y parada máxima en Opciones; `guardarAhora` en el asa de depuración. |
| `apps/web/src/serializar.test.ts` (nuevo), `almacen.test.ts` | Mismo texto que `JSON.stringify` (también como `Blob`), descartes y acabado de golpe, partida real, peso. |
| `tools/rendimiento-web.ts` | Mide el guardado de golpe frente al real, la parada máxima y el clic durante un guardado. |
| `tools/peso.ts`, `tools/peso-base.json` (nuevos), `tools/presupuesto.ts` | Peso por módulo y campo, referencia anotada, aviso sin fallo, `--peso`, `--anotar`, `--tope N` (para probar el aviso). |

## 8. Pendiente / para la arquitectura

- Un getter de solo lectura del estado vivo en `Game` (hoy se lee `game.s` con un cast).
- Móvil real: el ×4 de CPU es una emulación; la parada máxima real dependerá del teléfono (el trozo es de 8 ms de CPU del propio aparato, así que debería quedar en el mismo orden). Sin medir en un teléfono.
- El `Blob` en IndexedDB funciona en Chromium (medido). Firefox y Safari lo admiten desde hace años; hay vuelta al texto si fallara, pero no está probado en ellos.
- Crear la partida y la pasada semanal siguen como en `revision-rendimiento.md` (propuestas 1 y 2: cambian la huella).

## 9. Comprobaciones

- `npm run typecheck`: sin errores.
- `npm test`: 106 archivos, 1.193 tests en verde (820 s).
- `npm run probar-web`: «Todo el camino funciona en el navegador» (sin errores en la consola).
- `npm run huella -- 60`: idéntica a la de antes de los cambios (se comparó con la rama sin ellos; no se toca el juego).
- `npm run rendimiento:web` (escritorio y móvil ×4): las cifras de §1.
