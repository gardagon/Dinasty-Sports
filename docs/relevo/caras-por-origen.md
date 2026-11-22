# Relevo: caras según el origen y pliegue del párpado

Rama `claude/caras-por-origen` (sale de `claude/youthful-clarke-vs0kye`). Sin pull request.

## Qué se ha hecho

1. **El origen influye en la forma de la cara** (`packages/contracts/src/rasgos.ts`).
   - `OrigenDef.rostro?`: desplazamiento de la media de cada rasgo (de 0,5; de 0,62 en el pliegue). Datos editables en `ORIGENES`; tabla de cifras en `docs/ANEXO_CUERPO.md` §7.
   - `rostroAlAzar(rng, origen)`: cada valor es `u^e` con `e = 1/media − 1` (media 0,5 → uniforme, sin tendencia). Toda la gama sigue saliendo en todos los orígenes: las tendencias son suaves. Con dos orígenes, cada valor (alelo) sale de uno de ellos.
   - Los hijos heredan como antes (pares expresado/latente, sin mutación), así que las mezclas salen solas (test).
2. **Rasgo nuevo `parpado`** (pliegue del párpado, 0 sin pliegue y con epicanto, 1 pliegue marcado). Va **el último** de `RASGOS_DE_ROSTRO`: el texto del rostro pasa de 24 a 26 caracteres y las partidas antiguas (24) se leen con él a 0,5, así que **no se sube `SAVE_VERSION`**. Media base 0,62 (`MEDIA_DE_ROSTRO`); Asia oriental −0,28 (media 0,34).
3. **Dibujo del ojo** (`packages/retrato/src/cara.ts`), todo continuo con el rasgo (`docs/ANEXO_RETRATOS.md` §4):
   - pliegue marcado: línea del pliegue más alta, nace en la esquina de dentro;
   - pliegue bajo (≈ 0,3): línea pegada al ojo que nace a media altura («de capucha»), con opacidad `(parpado − 0,08)/0,5`;
   - sin pliegue: sin línea, el ojo se abre hasta un 10 % menos y aparece el epicanto (la esquina de dentro baja y se afila, con un pliegue de piel fino). En niños se ve algo aunque el rasgo sea alto.
4. **Cuadrícula**: sección nueva «4b. El origen en la cara y el pliegue del párpado» (el rasgo de 0 a 1 en mujer y hombre; la media de Asia oriental, España (centro), África subsahariana, Europa del norte y Magreb y una mezcla Asia × España, con variación; niños de 8 años con el rasgo de 0 a 1).

## Comprobaciones

- Tests nuevos (`rasgos.test.ts`): medias por origen sobre 3.000–4.000 personas dentro de ±40 % de lo configurado, con mucha gente al otro lado de la media; mezclas entre los dos orígenes; hijos de padres de Asia oriental frente a mixtos y de aquí; partidas antiguas de 24 caracteres; determinismo. En `retrato.test.ts`: cada paso del rasgo (21) da un dibujo distinto, sin NaN y sin saltos en la apertura del ojo, a 4, 10, 30 y 70 años.
- `npm run huella -- 60`: los 14 bots salen **idénticos**. Las dos filas de fútbol cambian porque hashean el estado de `npcs`, que incluye el texto del rostro; con `rostro` excluido del hash, el mundo con fútbol de las semillas 31 y 32 es **idéntico** al de antes (comprobado con un script temporal, no subido).
- `npm run sim:cuerpo -- 2 31,32`: salida idéntica.
- `npm run typecheck`, `npm test` y `npm run probar-web`: ver el final de este archivo.

## Segunda ronda (correcciones de la arquitectura)

- **Ojo** (continuo con el rasgo; `lisa = 1 − parpado/0,7`): apertura hasta un **23 %** menor, rabillo de fuera más alto que la esquina de dentro, línea de pestañas hasta un 40 % más pesada, una franja de piel del párpado que tapa algo del iris por arriba (menos blanco) y epicanto más marcado en el lagrimal (esquina de dentro más baja y afilada, pliegue de piel y línea más oscuros).
- **Tendencias más visibles en conjunto**, siempre suaves una a una (tabla en `ANEXO_CUERPO.md` §7). Asia oriental: `parpado` −0,34, `ojosForma` −0,16, `narizForma` +0,12 (puente más bajo y aletas más anchas), `pomulos` +0,20, `cejasForma` −0,18. África subsahariana: nariz +0,16 y labios +0,18. Europa del norte: nariz y labios más finos, mentón +0,08. Magreb: nariz y cejas más marcadas.
- **Pómulos**: la cara se ensancha algo más con ellos (`wz = w × (0,88 + 0,15 × pomulos)`, antes 0,895 + 0,115): a ancho de retrato es lo que más ayuda junto con el ojo.
- **Cuadrícula 4b**: fila nueva «solo cara» (el mismo pelo, piel y ojos en todos) para adultos y niños de 8 años por origen y mezcla.

## Capturas (recortes en `docs/relevo/caras-por-origen/`)

- `retratos-tamano-real.png`: a tamaño real, mujer y hombre adultos (30) y niña y niño de 8 años; de izquierda a derecha, Asia oriental, España (centro) y la mezcla Asia × España, con el mismo pelo, piel y ojos. La media de Asia oriental se distingue a primera vista de la de España, y la mezcla queda a medio camino.
- `ojos-zoom.png`: ojos ampliados. Fila de arriba, mujer; la de abajo, hombre. Columnas: Asia oriental, España, mezcla y África subsahariana a los 30; Asia oriental, España y mezcla a los 8.
- `origenes-claro.png` y `origenes-oscuro.png`: la sección 4b de la cuadrícula (pliegue de 0 a 1, cada origen con variación, solo cara y niños).
- `figuras-claro.png` y `figuras-oscuro.png`: figura entera a los 30; de izquierda a derecha: mujer y hombre de Asia oriental, mujer y hombre de la mezcla, mujer y hombre de España. A su tamaño no se ve el epicanto, pero sí el ojo más estrecho.

## Para la revisión

- **Gafas**: el dibujo todavía no tiene gafas, así que no hay nada que comprobar con ellas; el ojo se pinta antes que las arrugas y los distintivos, y unas gafas irían por encima sin cambiar nada de esto.
- **Tendencias**: las cifras son deliberadamente suaves (un desplazamiento de 0,12 en la media de un rasgo de 0 a 1 deja a muchísima gente en el otro lado). Si quieres más o menos marca, se cambia solo `rostro` de cada origen en `ORIGENES` (y la tabla del anexo).
- En las celdas de la cuadrícula (retrato pequeño) la diferencia se nota, pero el pliegue por sí solo no: lo que distingue a Asia oriental es el conjunto (ojo, cejas, nariz, pómulos).
- La cuadrícula (`cuadricula-claro.png` y `cuadricula-oscuro.png`) se ha regenerado una sola vez, al final.

## Resultado final

- `npm run typecheck`: sin errores. `npm test`: 106 archivos, 1207 tests en verde. `npm run probar-web`: todo el camino funciona en el navegador, sin errores de consola.
- Recortes `origenes-claro.png` y `origenes-oscuro.png`: la sección 4b de la cuadrícula ya regenerada (la cuadrícula se regeneró y se subió una sola vez, al final).
