# Anexo: el dibujo de las personas (receta)

Cómo está montado el visualizador (`packages/retrato`, `@ds/retrato`), qué no se toca y **cómo se añade un peinado, un vello facial o una prenda**. Plan: `docs/PLAN_VISUALIZADOR.md`; los datos que se dibujan: `docs/ANEXO_CUERPO.md`. Si cambias una regla aquí, cambia el código (y al revés).

## 1. Las tres capas

| Capa | Dónde | Qué hace |
|---|---|---|
| 1. Parámetros | `packages/retrato/src/parametros.ts` (`parametrosDe(cuerpo, edad, opciones)`) | Función pura: de un `CuerpoDePersona` y una edad saca todo lo que el dibujo necesita (`Parametros`): madurez de la cara, vejez, anchuras por músculo y grasa, colores, peinado con su largo, calvicie y canas, vello facial con su largo y densidad, arrugas. |
| 2. Dibujo | `cara.ts`, `vello.ts`, `pelo.ts`, `cuerpo.ts`, `cuna.ts`, `lienzo.ts` (`dibujar(parametros, prefijo)`) | De los parámetros a SVG (texto). Determinista. El retrato y la figura entera son **el mismo dibujo con otro encuadre**. |
| 3. Pantallas | `apps/web/src/retrato.ts` | Solo pide el SVG (`retratoDe`, `evolucionDe`, `figuraDe`, `figurasSvg`) y lo coloca: el retrato en la ficha del personaje y en la de cada persona; al pulsarlo, la evolución (fila de etapas con regla y deslizador de edad); y, en la ficha de cada persona, **«Comparar contigo»**: tu personaje a su lado, los dos de cuerpo entero, a escala y como son hoy. |

- `@ds/retrato` **solo importa `@ds/contracts`**; ni los módulos ni el núcleo lo importan (lo vigila `tests/arquitectura.test.ts`).
- **Nada se inventa**: lo poco que se sortea (el lado de la raya, dónde caen las pecas, los mechones) sale de `rngEstable('retrato', semilla de dibujo, …)`, nunca de `Math.random`.
- **Sin recursos externos**: ni imágenes, ni fuentes, ni librerías.
- **Memoria**: `retratoDe`, `evolucionDe` y `figuraDe` guardan el SVG por persona, edad en años y vista (un retrato nuevo tarda ≈ 1,5 ms y pesa ≈ 40 KB).
- **Ids del SVG** (recortes): llevan un prefijo que sale de los parámetros; dos dibujos distintos en la misma página nunca comparten ids.
- **Tema claro y oscuro**: el SVG no lleva fondo ni marco (los pone la web con sus variables); la regla usa `currentColor`.

## 2. El estilo (no se toca)

**«Tinta»** (variante B de las muestras, elegida por el usuario el 15/11): colores planos, **sombra plana de un solo tono con el borde duro** (la luz viene de arriba a la izquierda), **línea oscura de contorno** y detalle alto en la cara. La cabeza se dibuja un **6 % mayor** que la real (`ESCALA_DE_LA_CABEZA`), y la de un niño, más (§4).

Todo lo que es del estilo está en `lienzo.ts`. Una pieza nueva **solo usa estas funciones**, no escribe trazos a mano:

| Función | Para qué |
|---|---|
| `relleno(d, color)` | El color plano de una forma. |
| `sombra(d, color, fuerza)` | Una mancha de sombra plana (se recorta a la forma con `recorte`). |
| `contorno(d, peso)` | La línea de tinta de una forma (peso 1; 0,55 para bordes interiores como la línea de la mejilla). |
| `trazo(d, ancho, opacidad)` | Una línea de detalle: párpado, arruga, pliegue, pelo suelto. |
| `parte(d, color, sombra, banda)` | Una parte del cuerpo o de la ropa: relleno, sombra a la derecha y contorno. |
| `recorte(...ds)` | Un recorte con la unión de varios trazados. |

**La línea de contorno rodea por fuera** (corrección del usuario): nunca pasa por encima de una barba ni del pelo. El orden lo garantiza: contorno de la cara → vello facial (la barba que cuelga tapa la línea del mentón y lleva la suya) → rasgos → pelo (tapa la frente y las orejas y lleva su contorno).

## 3. Unidades y orden de las capas

- **El cuerpo, en centímetros**: x = 0 en el eje de la persona; y = 0 en la coronilla, hacia abajo; los pies, en y = altura.
- **La cabeza, en «unidades de cabeza»** (media altura de la cabeza), dentro de un grupo escalado: y = −1 la coronilla, y = 0 la línea de los ojos de un adulto, y = 1 el mentón. `medidasDeCara` da todas las medidas (`Cara`): anchuras (`w`, `wc` cráneo, `wz` pómulos, `wj` mandíbula, `wm` mentón), `borde(y)` (media anchura de la cara a una altura), ojos (`ex`, `ey`, `ew`, `eh`), nariz (`yn`, `na`), boca (`ym`, `mw`, `lu`, `ll`) y línea del pelo (`yh`).
- **Orden** (de atrás adelante): pelo de detrás → piernas y zapatos → brazos y mangas → cuello → camiseta → orejas → cara y sus sombras → contorno de la cara → vello facial → nariz, boca, ojos, cejas → arrugas y distintivos → pelo de delante.

## 4. La edad y el cuerpo (qué no se toca al ampliar los catálogos)

Decidido por el usuario el 16/11, después de una prueba con las dos versiones lado a lado.

- **Los niños no son adultos en miniatura.** `Parametros.nino` va de 1 (a los 3 años) a 0 (a los 15, con el adelanto o retraso de cada uno) y es lo que se pierde con la pubertad:
  - **La cabeza**: además de la real de su edad (`CABEZA`), se agranda un 24 % × `nino` (`CABEZA_DE_NINO`): a los 3 años ocupa cerca de una cuarta parte de la altura; un adulto, una séptima.
  - **La cara** (`medidasDeCara`, `cara.ts`): más redonda y con mofletes (un rubor plano), ojos mayores y más bajos, nariz pequeña y chata sin puente marcado, boca más pequeña, cejas más finas, mandíbula y mentón sin marcar, sin hueco bajo el pómulo. La forma de la cara y el mentón heredados pesan menos de niño.
  - **El cuerpo** (`cuerpo.ts`): cuello corto, brazos y piernas más cortos, barriga y sin cintura, extremidades algo más rollizas.
- **La pubertad** (`masc`, `fem`): hombros anchos, cuello grueso y mandíbula en el hombre; cintura más estrecha y alta, caderas y pecho en la mujer.
- **Las arrugas** (`Parametros.arrugas`, de 0 a 1, con `arrugasA(edad, envejecimiento)`): dependen de **cómo envejece la piel de cada persona** (`Apariencia.envejecimiento`, heredable, de 0 a 1; `docs/ANEXO_CUERPO.md` §6). Con 0,5 (lo normal) empiezan a los 26 años y llegan a 1 a los 70; quien envejece bien (0) empieza a los 32 y no pasa de 0,7; quien envejece mal (1) empieza a los 20 y llega a 1 hacia los 56. En fórmula: `((edad − (26 + 12 × (0,5 − e))) / 44)^0,85 × (0,7 + 0,6 × e)`, entre 0 y 1. Además, cada una **aparece a su tiempo y se alarga y se marca poco a poco**: el surco de la nariz a la boca y una pata de gallo a los 30; bolsas, entrecejo y una línea en la frente hacia los 40–50; tres patas de gallo, tres líneas de frente, comisuras, mejilla, mandíbula y cuello hacia los 60–70. Para añadir una arruga: `t(trazado, desde)` en `cara.ts`, con `desde` el punto de 0 a 1 en que empieza a verse.
- **La complexión** (`gordo`, `fuerte`): la grasa ensancha la cintura y la cadera y pone barriga (el pantalón nunca es más estrecho que el bajo de la camiseta); el músculo ensancha hombros, pecho y brazos y marca los pectorales; la delgadez afina cintura y extremidades.
- **Las manos**: palma, cuatro dedos de distinto largo y pulgar hacia el cuerpo. **Se ven siempre enteras**: los brazos cuelgan por fuera del tronco y se abren lo que haga falta para que la mano quede fuera de la barriga, la cadera y el bajo de la camiseta (`holguraDeLasManos` en `cuerpo.ts`, con test en todas las complexiones, sexos y edades). Una prenda nueva más ancha que la camiseta debe contar en ese ancho del tronco.
- **Los doce rasgos heredados** (`Parametros.rostro`): cada uno mueve medidas de `medidasDeCara` o de `cara.ts`; el 0 y el 1 deben seguir viéndose distintos (hay un test).
- **Las reglas de la edad** (en contracts): `gradoDeCalvicie`, `CALVICIE`, `fraccionDeCanas`, `EDAD_DEL_VELLO`; y la cuna por debajo de los 3 años (`EDAD_MINIMA_DEL_DIBUJO`).
- **El estilo** (§2) y **las paletas** de la apariencia (`catalogos.ts`): un color por cada valor de `PIEL`, `PELO_COLOR` y `OJOS`.

## 5. El look: estilo y largo (decidido por el usuario el 15/11)

Los catálogos están en `packages/contracts/src/retrato.ts`, con ids estables (un futuro «cambiar de look» podrá guardarlos en el estado). **En esta fase no se guarda nada en el estado.**

- **Un PNJ tiene su estilo elegido y lo mantiene toda la vida**: `estiloDePersona(semilla de dibujo, sexo, apariencia)` (pura y estable) da su `Look`: `{ peinado, largoDelPelo (cm), vello, largoDelVello (mm) }`, recién hecho. La barba es **una elección**, no una consecuencia de la herencia: puede ir afeitado aunque tenga mucho vello; solo puede elegir lo que su densidad permite. Las mujeres van sin vello facial.
- **Lo que la edad impone lo aplica el dibujo** (`parametrosDe`): antes de la pubertad no hay vello (`EDAD_DEL_VELLO` = 15 años con su adelanto o retraso; completo a los 19); con calvicie se lleva el peinado que la admite (`peinadoPosible`); las canas y la calvicie llegan con la edad.
- **El personaje**: mientras no exista la peluquería se dibuja con su estilo por defecto, como un PNJ. La sesión que la monte pasará su look en `Opciones.look` (`retratoDe(cuerpo, edad, edadHoy, { look })`).
- **El dibujo recibe el largo**: un corte que ha crecido se ve crecido (desordenado y luego largo); la barba va de sombra a barba larga.

### Peinados (`PEINADOS`)

| id | Nombre | Largo recién hecho (cm) | Calvicie máxima → si no | Premium | Peso (mujer / hombre) |
|---|---|---|---|---|---|
| `afeitada` | Cabeza afeitada | 0 | 1 | no | 0 / 0,04 |
| `al_cero` | Rapado al cero | 0,15 | 1 | no | 0 / 0,05 |
| `rapado` | Rapado | 0,6 | 1 | no | 0,01 / 0,10 |
| `corto` | Corto | 4 | 0,55 → `rapado` | no | 0,05 / 0,40 |
| `flequillo` | Corto con flequillo | 6 | 0,2 → `corto` | no | 0,03 / 0,22 |
| `degradado` | Degradado | 5 | 0,4 → `rapado` | **sí** | 0 / 0,08 |
| `tupe` | Tupé | 9 | 0,25 → `corto` | **sí** | 0 / 0,05 |
| `bob` | Media melena con flequillo | 15 | 0,3 → `melena` | no | 0,13 / 0 |
| `melena` | Melena | 24 | 0,6 → `corto` | no | 0,22 / 0,04 |
| `largo` | Largo | 45 | 0,5 → `melena` | no | 0,25 / 0,01 |
| `coleta` | Coleta | 35 | 0,5 → `corto` | no | 0,13 / 0 |
| `mono` | Moño | 35 | 0,5 → `corto` | no | 0,10 / 0,01 |
| `trenzas` | Dos trenzas | 40 | 0,4 → `coleta` | **sí** | 0,08 / 0 |

Los pesos son provisionales (el usuario los revisará): con ellos, el 47 % de las mujeres lleva melena o largo (antes, el 71 %).

- **Los tres grados al cero** salen del largo, como todo: con menos de 0,05 cm **no hay pelo en ningún sitio** (cabeza afeitada: piel lisa); con menos de 0,4 cm solo se ve **la sombra de donde crece** (rapado al cero: sin línea y pegada al cráneo; respeta la calvicie: donde no hay pelo, no hay sombra); desde ahí, el rapado de siempre. Una cabeza afeitada que crece pasa por la sombra y por el rapado.
- **Calvicie máxima**: grado de calvicie (`gradoDeCalvicie(tendencia, edad)`, de 0 a 1) hasta el que se puede llevar; por encima se lleva el de «si no».
- **Las entradas** (`CALVICIE`, en contracts): en los hombres la calvicie **empieza por las sienes**: hasta el grado 0,3 solo retrocede la línea del pelo en las entradas; de 0,3 a 0,55 sube también por el centro y clarea por arriba; desde 0,55 solo quedan los lados. El grado nunca pasa de la tendencia de la persona: quien tiene poca (hasta 0,3) se queda en entradas toda la vida. En las mujeres (máximo 0,4) sube toda la línea a la vez y baja el volumen.
- **Quien se queda calvo** (`peinadoConCalvicie`, `AL_QUEDARSE_CALVO`, en contracts): cuando la calvicie de un hombre pasa de las entradas (grado > 0,3), **el 20 % se afeita la cabeza y el 15 % se rapa al cero**, de forma estable por persona (su semilla de dibujo) y para siempre; el otro 65 % sigue con su estilo o con el que lo sustituye. Solo vale para quien lleva su estilo por defecto: con un look pedido (`Opciones.look.peinado`) se lleva ese mientras la calvicie lo admita.
- **`tipos`** (opcional): tipos de pelo con los que se puede hacer (hoy todos valen para todos).
- **Premium**: solo se puede hacer y arreglar en la peluquería.
- **Cómo cambia la forma con el largo** (`pelo.ts`): el volumen crece con el largo según el tipo de pelo (`TIPO_DE_PELO` en `catalogos.ts`: borde liso, con ondas o con rizos; volumen; cuánto de su largo se ve colgar: 1 liso, 0,85 ondulado, 0,6 rizado, 0,3 muy rizado). Con menos de 2 cm el borde es liso. Con menos de 9 cm de largo visto es un casco con las orejas a la vista; a partir de ahí tapa las orejas y cuelga (≈ 0,9 unidades de cabeza por cada media cabeza de largo), y por debajo de los hombros cae por delante en dos mechones. Los recogidos (`coleta`, `mono`, `trenzas`) no cuelgan sueltos: el largo alarga la coleta y las trenzas y agranda el moño (en el pelo muy rizado, la coleta es un moño de rizos). El **desorden** va de 0 (recién hecho) a 1 y aparta mechones de su sitio; el flequillo baja hasta las cejas.

### El tinte (preparado; hoy nadie lo lleva)

El `Look` admite `tinteDelPelo` y `tinteDelVello` (colores `#rrggbb`, por separado) y cuánto han crecido desde el tinte (`crecidoDesdeElTinte`, cm; `crecidoDelVelloDesdeElTinte`, mm). Solo es dibujo: la mecánica la pondrá la peluquería.

- **Pelo**: se ve del color teñido, sin canas; al crecer se ven **las raíces** del color natural (con sus canas) junto al cuero cabelludo, tan anchas como lo crecido. Cuando lo crecido alcanza el largo, ya no queda tinte.
- **Cómo se ven las raíces**: el paso del color natural al teñido es **gradual** (cuatro capas alrededor de la línea de nacimiento, de más ancha y tenue a más estrecha y opaca), **sigue la textura del pelo** (mechones del color natural, con la forma de su tipo de pelo, que se meten en el teñido) y **recibe la misma sombra** que el resto del pelo (se pinta debajo de la sombra y de los mechones a tinta).
- **Dónde están las raíces** (`nace` en `pelo.ts`): se miden desde la línea por donde el pelo nace a la vista, nunca desde el borde de fuera (que son las puntas): la **línea del pelo en la frente** si va peinado hacia atrás o hacia arriba (corto, rapado, tupé, degradado, coleta, moño, trenzas); **la raya** si cuelga con raya (melena, largo); **la coronilla** si lleva flequillo (el flequillo que cae sobre la frente son puntas). Un peinado nuevo debe decir cuál es la suya. La cola de la coleta, el moño y las trenzas son puntas: van del color teñido.
- **Barba**: como es corta, se ve de un color entre el teñido y el natural según la parte que ha crecido.
- Las cejas no se tiñen.

### Vello facial (`VELLOS`)

| id | Nombre | Largo recién hecho (mm) | Densidad mínima | Premium | Peso |
|---|---|---|---|---|---|
| `afeitado` | Afeitado | 0 | 0 | no | 0,50 |
| `bigote` | Bigote | 5 | 0,3 | no | 0,06 |
| `perilla` | Perilla | 6 | 0,3 | no | 0,06 |
| `candado` | Candado | 6 | 0,4 | **sí** | 0,05 |
| `barba_corta` | Barba corta | 6 | 0,45 | no | 0,19 |
| `barba_perfilada` | Barba perfilada | 5 | 0,5 | **sí** | 0,07 |
| `barba_larga` | Barba larga | 30 | 0,6 | no | 0,07 |

- **Densidad mínima**: la `Apariencia.barba` (0 a 1) que hace falta (`velloPosible`). El peso es el reparto entre los hombres que pueden llevarlo: algo más de la mitad van afeitados.
- **Cómo cambia con el largo** (`vello.ts`): menos de 0,3 mm, nada (solo la sombra de una barba cerrada); hasta 3 mm, sombra de pocos días (más oscura cuanto más larga y más densa); desde 3 mm, mancha tupida con su línea; desde 5 mm cuelga por debajo del mentón (1 unidad de cabeza cada 120 mm, como mucho 0,5).
- **Zonas** (`ZONA` en `vello.ts`): toda la barba (línea de la mejilla natural), perfilada (línea más baja y recta), solo bigote, bigote y mentón (perilla), o bigote y mentón unidos alrededor de la boca (candado). «Afeitado» con largo es la barba entera que crece.

## 6. Cómo se añade una pieza

Antes y después: **`npm run retratos:cuadricula`** y mirar la captura (§7).

### Un peinado

1. Añádelo a `PEINADOS` (`packages/contracts/src/retrato.ts`): id, nombre, largo recién hecho, calvicie máxima, `siNo`, `premium` y pesos. Añádelo a la tabla de este anexo.
2. En `pelo.ts`, decide cómo va **arreglado**: la forma sale del largo, así que casi todo está hecho. Si es pelo que no cuelga, cae en la rama del casco (línea del pelo o flequillo); si cuelga, en la de la raya y las cortinas; si va recogido, añade su caso junto a `coleta`. Usa `casco(lados, arriba)` para el contorno, `tr(puntos)` para un borde con el tipo de pelo (liso, ondas o rizos) y `tramo(puntos, 'liso')` para los bordes interiores. Recorre los puntos **en el sentido de las agujas del reloj** (los rizos salen hacia fuera).
3. Devuelve los trazados en `formas` (por delante de la cara) o `atras` (por detrás del cuerpo): el relleno, la sombra, los mechones, las canas y el contorno los pone `pintar`.
4. Comprueba en la cuadrícula (sección 5): los cuatro tipos de pelo, los dos sexos, la calvicie (7a), las canas, un niño de 3 años y un anciano; que no asome piel por encima del pelo ni el pelo tape los ojos; y la sección 5b (crecido).

### Un vello facial

1. Añádelo a `VELLOS` (contracts) y a la tabla de este anexo.
2. En `vello.ts`, dale su zona en `ZONA`; si es una zona nueva, dibújala con las medidas de `Cara` (línea de la mejilla, `mw`, `ym`, `yn`, `na`, `wj`, `wm`) y con `relleno` + `contorno(d, 0.55)`; por debajo de 3 mm, solo la sombra.
3. Comprueba en la cuadrícula (secciones 6a y 6b): densidad alta y mínima, todos los largos, las canas (7a), las formas de cara (3e) y que **la línea de contorno no pasa por encima**.

### Una prenda

1. Los colores son parámetros (`Opciones.camiseta`, `Opciones.pantalon`; por defecto `ROPA` en `catalogos.ts`): para una equipación basta pasarlos.
2. Una prenda nueva se dibuja en `cuerpo.ts` con las medidas del cuerpo (hombros `sw`, pecho `cw`, cintura `ww`, cadera `hw`, alturas `yS`, `yW`, `yH`, `yC`) y con `parte(d, color)`. Añade a `Opciones` y a `Parametros` qué prenda es.
3. Comprueba en la cuadrícula (7b y 7c): todas las complexiones, los dos sexos, un niño y los dos extremos de altura.

## 7. La cuadrícula de capturas

`npm run retratos:cuadricula [semilla]` genera `docs/retratos/cuadricula.html` (no se sube: pesa mucho) y la captura con el Chromium del entorno en `docs/retratos/cuadricula-claro.png` y `cuadricula-oscuro.png` (sí se suben: son la referencia). Con `--secciones=carpeta` guarda además cada sección por separado para mirarla de cerca; con `--sin-capturas` solo escribe la página.

Secciones: 1) personas de la partida de la cuna a los 95; 2) una familia (padres, hijos y un nieto); 3) todos los valores de cada catálogo de la apariencia en los dos sexos; 4) el 0 y el 1 de cada rasgo de la cara; 5) peinados × tipo de pelo, un corte que crece, los tres grados al cero, las entradas por tendencia y edad, y el tinte con raíces en todos los tipos de pelo y peinados; 6) vello facial por estilo, largo y densidad; 7) calvicie máxima, canas a los 20, el envejecimiento de la piel (0, 0,5 y 1 a los 30, 50 y 70), quien se queda calvo y cambia de estilo, complexiones, alturas extremas, la comparación del personaje con otra persona y la evolución entera.

**Criterios**: se reconoce a la misma persona a los 8, a los 30 y a los 70; se nota el parecido entre padres e hijos; la altura y la complexión se aprecian a simple vista; nada se rompe en los extremos.

## 8. Tests (`packages/retrato/src/retrato.test.ts`)

Determinismo; la cabeza de un niño de 3 años cerca de una cuarta parte de la altura; los tres grados al cero; las entradas; el tinte y sus raíces; la comparación sin cifras; SVG entero y sin números rotos en los extremos; la cuna por debajo de los 3 años; crece hasta los 18; canas, calvicie y arrugas no retroceden; vello facial solo en hombres desde la pubertad y solo con densidad suficiente; cada valor de cada catálogo, cada peinado, cada vello y los extremos de cada rasgo dan dibujos distintos; el largo se nota; la elección de estilo es estable y respeta la genética.

## 9. La comparación y las cifras

`figurasSvg(figuras, { cifras })` pone varias personas a escala junto a la regla; cada figura puede llevar o no su altura (`cifras`). En la ficha de una persona, «Comparar contigo» pone al personaje a su lado, los dos como son hoy. **Criterio de las cifras** (el del resto de la ficha): las del personaje, siempre; las de la familia, también; de quien no es de la familia no se dan años ni centímetros (ni los números de la regla).

## 10. Las muestras de estilo (etapa 2a)

`npm run retratos:muestras` (código provisional en `tools/retratos/`, independiente del paquete) vuelve a generar la página con las cuatro variantes de estilo que vio el usuario (`docs/muestras/retratos.html`, que no se sube).
