# Anexo: el dibujo de las personas (receta)

Cómo está montado el visualizador (`packages/retrato`, `@ds/retrato`), qué no se toca y **cómo se añade un peinado, un vello facial o una prenda**. Plan: `docs/PLAN_VISUALIZADOR.md`; los datos que se dibujan: `docs/ANEXO_CUERPO.md`. Si cambias una regla aquí, cambia el código (y al revés).

## 1. Las tres capas

| Capa | Dónde | Qué hace |
|---|---|---|
| 1. Parámetros | `packages/retrato/src/parametros.ts` (`parametrosDe(cuerpo, edad, opciones)`) | Función pura: de un `CuerpoDePersona` y una edad saca todo lo que el dibujo necesita (`Parametros`): madurez de la cara, vejez, anchuras por músculo y grasa, colores, peinado con su largo, calvicie y canas, vello facial con su largo y densidad, arrugas. |
| 2. Dibujo | `cara.ts`, `vello.ts`, `pelo.ts`, `cuerpo.ts`, `cuna.ts`, `lienzo.ts` (`dibujar(parametros, prefijo)`) | De los parámetros a SVG (texto). Determinista. El retrato y la figura entera son **el mismo dibujo con otro encuadre**. |
| 3. Pantallas | `apps/web/src/retrato.ts` | Solo pide el SVG (`retratoDe`, `evolucionDe`, `figuraDe`) y lo coloca: el retrato en la ficha del personaje y en la de cada persona; al pulsarlo, la evolución (fila de etapas con regla y deslizador de edad). |

- `@ds/retrato` **solo importa `@ds/contracts`**; ni los módulos ni el núcleo lo importan (lo vigila `tests/arquitectura.test.ts`).
- **Nada se inventa**: lo poco que se sortea (el lado de la raya, dónde caen las pecas, los mechones) sale de `rngEstable('retrato', semilla de dibujo, …)`, nunca de `Math.random`.
- **Sin recursos externos**: ni imágenes, ni fuentes, ni librerías.
- **Memoria**: `retratoDe`, `evolucionDe` y `figuraDe` guardan el SVG por persona, edad en años y vista (un retrato nuevo tarda ≈ 1,5 ms y pesa ≈ 40 KB).
- **Ids del SVG** (recortes): llevan un prefijo que sale de los parámetros; dos dibujos distintos en la misma página nunca comparten ids.
- **Tema claro y oscuro**: el SVG no lleva fondo ni marco (los pone la web con sus variables); la regla usa `currentColor`.

## 2. El estilo (no se toca)

**«Tinta»** (variante B de las muestras, elegida por el usuario el 15/11): colores planos, **sombra plana de un solo tono con el borde duro** (la luz viene de arriba a la izquierda), **línea oscura de contorno** y detalle alto en la cara. La cabeza se dibuja un **6 % mayor** que la real (`ESCALA_DE_LA_CABEZA`).

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

## 4. Qué no se toca al ampliar los catálogos

- **Las proporciones por edad** (`medidasDeCara`, `CABEZA` en `parametros.ts`, las alturas y anchuras de `cuerpo.ts`): cara de niño (ojos más bajos y grandes, mandíbula corta), pubertad (`masc`, `fem`), vejez (`vejez`, `arrugas`).
- **Los doce rasgos heredados** (`Parametros.rostro`): cada uno mueve medidas de `medidasDeCara` o de `cara.ts`; el 0 y el 1 deben seguir viéndose distintos (hay un test).
- **Las reglas de la edad**: `gradoDeCalvicie`, `fraccionDeCanas`, `EDAD_DEL_VELLO` (en contracts) y la cuna por debajo de los 3 años (`EDAD_MINIMA_DEL_DIBUJO`).
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
| `rapado` | Rapado | 0,6 | 1 | no | 0,01 / 0,13 |
| `corto` | Corto | 4 | 0,55 → `rapado` | no | 0,06 / 0,47 |
| `flequillo` | Corto con flequillo | 6 | 0,25 → `corto` | no | 0,05 / 0,26 |
| `degradado` | Degradado | 5 | 0,4 → `rapado` | **sí** | 0 / 0,09 |
| `melena` | Melena | 24 | 0,6 → `corto` | no | 0,34 / 0,04 |
| `largo` | Largo | 45 | 0,5 → `melena` | no | 0,37 / 0,01 |
| `coleta` | Coleta | 35 | 0,5 → `corto` | no | 0,17 / 0 |

- **Calvicie máxima**: grado de calvicie (`gradoDeCalvicie(tendencia, edad)`, de 0 a 1) hasta el que se puede llevar; por encima se lleva el de «si no». Por encima de 0,55 solo quedan los lados, sea cual sea el estilo.
- **`tipos`** (opcional): tipos de pelo con los que se puede hacer (hoy todos valen para todos).
- **Premium**: solo se puede hacer y arreglar en la peluquería.
- **Cómo cambia la forma con el largo** (`pelo.ts`): el volumen crece con el largo según el tipo de pelo (`TIPO_DE_PELO` en `catalogos.ts`: borde liso, con ondas o con rizos; volumen; cuánto de su largo se ve colgar: 1 liso, 0,85 ondulado, 0,6 rizado, 0,3 muy rizado). Con menos de 9 cm de largo visto es un casco con las orejas a la vista; a partir de ahí tapa las orejas y cuelga (≈ 0,9 unidades de cabeza por cada media cabeza de largo), y por debajo de los hombros cae por delante en dos mechones. El **desorden** va de 0 (recién hecho) a 1 y aparta mechones de su sitio; el flequillo baja hasta las cejas.

### Vello facial (`VELLOS`)

| id | Nombre | Largo recién hecho (mm) | Densidad mínima | Premium | Peso |
|---|---|---|---|---|---|
| `afeitado` | Afeitado | 0 | 0 | no | 0,52 |
| `bigote` | Bigote | 5 | 0,3 | no | 0,06 |
| `perilla` | Perilla | 6 | 0,3 | no | 0,07 |
| `barba_corta` | Barba corta | 6 | 0,45 | no | 0,2 |
| `barba_perfilada` | Barba perfilada | 5 | 0,5 | **sí** | 0,07 |
| `barba_larga` | Barba larga | 30 | 0,6 | no | 0,08 |

- **Densidad mínima**: la `Apariencia.barba` (0 a 1) que hace falta (`velloPosible`). El peso es el reparto entre los hombres que pueden llevarlo: algo más de la mitad van afeitados.
- **Cómo cambia con el largo** (`vello.ts`): menos de 0,3 mm, nada (solo la sombra de una barba cerrada); hasta 3 mm, sombra de pocos días (más oscura cuanto más larga y más densa); desde 3 mm, mancha tupida con su línea; desde 5 mm cuelga por debajo del mentón (1 unidad de cabeza cada 120 mm, como mucho 0,5).
- **Zonas** (`ZONA` en `vello.ts`): toda la barba (línea de la mejilla natural), perfilada (línea más baja y recta), solo bigote, o bigote y mentón. «Afeitado» con largo es la barba entera que crece.

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

Secciones: 1) personas de la partida de la cuna a los 95; 2) una familia (padres, hijos y un nieto); 3) todos los valores de cada catálogo de la apariencia en los dos sexos; 4) el 0 y el 1 de cada rasgo de la cara; 5) peinados × tipo de pelo y un corte que crece; 6) vello facial por estilo, largo y densidad; 7) calvicie máxima, canas a los 20, complexiones, alturas extremas y la evolución entera.

**Criterios**: se reconoce a la misma persona a los 8, a los 30 y a los 70; se nota el parecido entre padres e hijos; la altura y la complexión se aprecian a simple vista; nada se rompe en los extremos.

## 8. Tests (`packages/retrato/src/retrato.test.ts`)

Determinismo; SVG entero y sin números rotos en los extremos; la cuna por debajo de los 3 años; crece hasta los 18; canas, calvicie y arrugas no retroceden; vello facial solo en hombres desde la pubertad y solo con densidad suficiente; cada valor de cada catálogo, cada peinado, cada vello y los extremos de cada rasgo dan dibujos distintos; el largo se nota; la elección de estilo es estable y respeta la genética.

## 9. Las muestras de estilo (etapa 2a)

`npm run retratos:muestras` (código provisional en `tools/retratos/`, independiente del paquete) vuelve a generar la página con las cuatro variantes de estilo que vio el usuario (`docs/muestras/retratos.html`, que no se sube).
