# Relevo: el entrenador dice el puesto en el primer entrenamiento (22/11/2026)

Rama `claude/primer-entrenamiento-puesto` (sale de `claude/youthful-clarke-vs0kye`). Sin pull request. No se ha tocado `DECISIONES.md`.

## Qué se ha hecho

En `futbol.primer_entrenamiento` (el suceso que ya existía, con sus opciones y la tirada de `pedir_cambio`) el entrenador ahora dice el puesto **sin lado**, con el nombre del juego, el segundo puesto en que encaja y, si es otro que el que pidió en la prueba, lo recuerda.

- **Frase del deporte** (`fraseDelPuestoInicial`, `packages/contracts/src/pistas-de-puestos.ts`). Pura y genérica: vale para cualquier deporte con puestos y `pistas.primerEntrenamiento`. Los textos son datos del fútbol (`modules/futbol/src/pistas-de-puestos.ts`, `primerEntrenamiento: { vas, pedido, otro }`).
- **Segundo puesto** (`otraFamiliaDeEncaje`): como el consejo y las pistas, habla de **familias** (`valoresPorFamilia`: la media de los dos lados). Es la familia, distinta de la suya, que más vale a no más de `MARGEN_DE_OTRO_PUESTO` = 4 puntos de la suya (**cifra provisional**). Sin ninguna cerca no se dice nada.
- **Puesto pedido en la prueba**: antes se perdía al acabar la prueba. Ahora `pruebaPorPuestos` (kit, `club.ts`) lo guarda en `EstadoBaseDeDeporte.puestoPedido` (opcional, no sube `SAVE_VERSION`); `unirseA` lo borra si se entra sin prueba (club del colegio). Si la familia del puesto que le dan es otra, la frase usa `pedido`.
- **Hecho nuevo** `futbol.frase_del_puesto` (servicio de hechos del fútbol). El suceso lo usa en las dos variantes y lo exige en `cuando`.
- **Género**: la frase puede llevar `{yo:o|a}`. Para eso `componerTexto` (contracts, `sucesos/texto.ts`) ahora concuerda también el texto que devuelve un hecho si lleva llaves. Cambio pequeño y compatible (un hecho sin llaves sale igual).
- Se mantiene la opción de **pedir otro puesto** con su tirada, y aceptar sin más. Cambio de texto en `en_otro_sitio`: ya no repite «te ves más de [puesto]» (la opción `pedir_cambio` sigue nombrando el puesto con lado, que es lo que se pide de verdad).

## Ejemplos (los textos que ve el jugador)

- Sin segundo puesto: «De inicio vas a jugar de interior.»
- Con segundo puesto: «De inicio vas a jugar de interior, pero a lo mejor más adelante te pongo de lateral.»
- Pidió portero y le dan interior, personaje masculino: «Me dijiste portero en la prueba, y se te veía convencido. De inicio vas a jugar de interior.»
- Pidió portero, personaje femenino, con segundo puesto: «Me dijiste portero en la prueba, y se te veía convencida. De inicio vas a jugar de interior, pero a lo mejor más adelante te pongo de lateral.»
- En el suceso (`npm run eventos:probar -- futbol.primer_entrenamiento`): «Al acabar, Lucía te llama aparte. «Te he estado mirando. De inicio vas a jugar de lateral, pero a lo mejor más adelante te pongo de extremo. Es donde mejor te veo. Una cosa más: la liga empieza…».» y, en la variante de «te necesito ahí»: «… Ya sé que a lo mejor te ves en otro sitio, pero ahora mismo te necesito ahí. …».

## Pruebas

- `tests/primer-entrenamiento-puesto.test.ts`: puesto sin lado; con y sin segundo puesto (límite exacto del margen); puesto pedido distinto (masculino y femenino) y mismo puesto del otro lado (no se recuerda); sin texto en el deporte; el suceso con la frase (con pedido y segundo puesto), aceptar sin más, `{yo:o|a}` dentro de la frase.
- `tests/prueba-de-acceso.test.ts`: la prueba deja apuntado el puesto pedido.
- Los tests y pruebas del suceso que fijaban hechos a mano llevan ahora `futbol.frase_del_puesto`.

## Cosas a saber

- El suceso solo sale si el deporte da la frase (puesto conocido en alguna familia y texto en los datos): sin eso no sale, como sin puesto.
- El nombre del puesto en la frase es el de la **familia** («Delantero de banda», «Medio de banda»…); el de la opción de pedir y el de la plantilla siguen con lado.
- El texto del hecho se concuerda al componer el suceso, pero el validador no revisa las llaves de dentro (solo las de la plantilla del suceso): las cubre el test.
- Una partida guardada antes de este cambio no tiene `puestoPedido`: la frase sale sin «Me dijiste…».

## Comprobaciones

`npm run typecheck`, `npm run eventos:validar` (63 sucesos, todo en orden), `npm run eventos:probar -- futbol.primer_entrenamiento`, `npm run benjamin -- 31,33` y `npm run probar-web` (sin errores de consola): bien. `npm test` (en segundo plano, sin tocar archivos mientras corría): 125 archivos, 1358 tests, todos pasan.
