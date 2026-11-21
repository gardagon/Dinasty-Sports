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

## Capturas (recortes en `docs/relevo/caras-por-origen/`)

- `ojos-zoom.png`: ojos ampliados; filas: hombre, mujer y niño de 8 años, con rasgos de Asia oriental, y el pliegue en 0 / 0,15 / 0,3 / 0,5 / 0,75 / 1.
- `parpado-claro.png` y `parpado-oscuro.png`: retratos de mujer y hombre de 30 años y de niña y niño de 9, con el pliegue de 0 a 1, en claro y en oscuro.
- `figuras-claro.png` y `figuras-oscuro.png`: figura entera (mujer y hombre con rasgos de Asia oriental, y los dos con rasgos neutros).
- `origenes-claro.png` y `origenes-oscuro.png`: recortes de la sección 4b de la cuadrícula (por origen y mezcla).

## Para la revisión

- **Gafas**: el dibujo todavía no tiene gafas, así que no hay nada que comprobar con ellas; el ojo se pinta antes que las arrugas y los distintivos, y unas gafas irían por encima sin cambiar nada de esto.
- **Tendencias**: las cifras son deliberadamente suaves (un desplazamiento de 0,12 en la media de un rasgo de 0 a 1 deja a muchísima gente en el otro lado). Si quieres más o menos marca, se cambia solo `rostro` de cada origen en `ORIGENES` (y la tabla del anexo).
- A tamaño de cuadrícula el pliegue se aprecia poco (el ojo mide unos 6 píxeles); en el retrato grande y en los recortes de ojos se ve bien. Es una limitación del tamaño de las celdas, no del dibujo.
- Un detalle no resuelto: en la figura entera el ojo es tan pequeño que el epicanto no se distingue; solo se aprecia la apertura menor.
- La cuadrícula (`cuadricula-claro.png` y `cuadricula-oscuro.png`) se ha regenerado una sola vez, al final.

## Resultado final

- `npm run typecheck`: sin errores. `npm test`: 106 archivos, 1207 tests en verde. `npm run probar-web`: todo el camino funciona en el navegador, sin errores de consola.
- Recortes `origenes-claro.png` y `origenes-oscuro.png`: la sección 4b de la cuadrícula ya regenerada (la cuadrícula se regeneró y se subió una sola vez, al final).
