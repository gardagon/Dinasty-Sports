# Visualizador de personas: el dibujo

Plan del 15/11/2026, **con las decisiones del usuario**. Es la **fase 2** del visualizador: dibujar a cualquier persona del juego a cualquier edad, con sus rasgos, su altura y su complexión, a partir de los datos que dejó la fase 1 (`docs/PLAN_CUERPO_Y_APARIENCIA.md`, cifras en `docs/ANEXO_CUERPO.md`).

Reparto del trabajo: el diseño es de la sesión de arquitectura y **las decisiones, del usuario**. Quien desarrolla no decide nada que no esté aquí: lo apunta en «Preguntas abiertas» al final y sigue con lo demás; si una duda le bloquea, la manda a la sesión de arquitectura con `send_message`.

Tres etapas:

| Etapa | Quién | Qué |
|---|---|---|
| **2a. Exploración** | Fable | Muestras de estilo con datos reales para que el usuario elija. **Se para al terminar** y espera la elección. |
| **2b. Base** | Fable (la misma sesión) | El dibujo con el estilo elegido: parámetros, retrato, figura entera, evolución, pantallas, cuadrícula de capturas y receta. |
| **2c. Completar** | Sonnet | Más peinados, barbas y ropa siguiendo la receta, y lo que quede de las pantallas. |

---

## 1. Decisiones del usuario (15/11/2026)

| Tema | Decisión |
|---|---|
| Estilo | **Vectorial con volumen** (formas limpias, sombreado suave, proporciones realistas), pero el usuario quiere **ver varios ejemplos** antes de decidir. |
| Detalle de las caras | **Probar con detalle alto**; si no convence, se baja a medio. |
| Pantallas de la primera versión | **La ficha del personaje y la ficha de cada persona** (pestaña Gente). Las listas, plantillas y clasificaciones, más adelante (el diseño debe permitir tamaños pequeños, pero no se integran ahora). |
| Evolución | **Las dos vistas**: una fila de figuras enteras por etapas junto a una regla (para ver la altura) y un deslizador de edad con una figura grande. |
| Vistas | Retrato (cara y hombros) y figura entera a escala (decidido el 13/11). |
| Edades | Hasta los 95 años. Los hermanos pequeños también existen: el dibujo debe valer desde los 3 años. **Por debajo de los 3 años, algo genérico** (una cuna con una manta, sin rasgos de la persona) en vez de dibujarla (decidido por el usuario el 15/11). |
| Parecido familiar | **Los rasgos de la cara (ojos, nariz, boca, cejas, orejas, mentón y pómulos) se heredan**, como los perks (decidido por el usuario el 15/11): el dibujo los lee del juego, no los saca al azar. |
| Peinado, barba y bigote | **Automáticos**, sacados de la persona; más adelante el jugador podrá elegirlos (decidido el 13/11). |
| Ropa | Neutra, con los colores como parámetro (para poner la equipación del club más adelante). |
| Fuera de la primera versión | Expresiones y animación. |

## 2. Los datos: no se inventa nada del cuerpo

Todo sale del juego. La web los lee con `cuerpoDePersona(ctx, id)` (o el `CuerpoService` de `personaje` y de `npcs`, a través de `Game.service`), que devuelve un `CuerpoDePersona` (`packages/contracts/src/cuerpo.ts`):

- **Sexo**, **nacimiento** (para la edad de cualquier día) y **semilla de dibujo** estable por persona: lo poco que el dibujo decida al azar (qué peinado, dónde salen las canas, dónde caen las pecas) sale **solo** de esa semilla, nunca de `Math.random`.
- **Rasgos de la cara heredados** (en la apariencia): forma y tamaño de los ojos, forma y tamaño de la nariz, grosor y anchura de la boca, grosor y forma de las cejas, tamaño de las orejas y si son despegadas, mentón y pómulos. **Cada uno es un número de 0 a 1** (no un catálogo de formas) y se hereda como los perks: un valor expresado y otro latente. **El dibujo usa el expresado** y decide cómo se ve cada valor en el estilo elegido; **todo el recorrido de 0 a 1 debe verse distinto y creíble**. Es lo que hace que los hijos se parezcan a sus padres (y a veces a un abuelo): la cara no se inventa con la semilla.
- **Altura** a cualquier edad: `alturaEn(alturaAdulta, edad, madurez)` (crece con su adelanto o retraso y encoge en la vejez).
- **Músculo y grasa** a cualquier edad: los de hoy y, para el pasado, `fotoDeEdad(historial, edad)` (antes de la primera foto, la primera). **Complexión**: `complexion(músculo, grasa)`. **Peso**: `pesoDe(...)`.
- **Apariencia** (`packages/contracts/src/rasgos.ts`): color y tipo de pelo, ojos, piel, forma de la cara y distintivos (pecas, hoyuelos, lunares), cada uno con su catálogo cerrado (`PELO_COLOR`, `PELO_TIPO`, `OJOS`, `PIEL`, `CARA`, `DISTINTIVOS`): **cada valor de cada catálogo debe verse distinto**.
- **Canas, calvicie y barba**: valores de la persona, no de la edad. `canas` es la edad a la que empiezan; `calvicie`, la tendencia de 0 a 1; `barba`, la densidad de 0 a 1 (en las mujeres no se dibuja). El dibujo decide con ellos, la edad y la semilla **cuántas** canas, **cuánta** calvicie y **qué** barba enseña, con una progresión creíble (las canas aumentan poco a poco desde esa edad; la calvicie, según la tendencia, empieza en la juventud o nunca; la barba aparece en la pubertad).

Si hace falta un dato que no está, **no se añade al juego**: se apunta en «Preguntas abiertas».

## 3. Arquitectura

- **Un paquete nuevo, `packages/retrato` (`@ds/retrato`)**, que solo importa `@ds/contracts`. Ni módulos ni `core` lo importan; la web, sí. Añádelo a las comprobaciones de `tests/arquitectura.test.ts`.
- **Tres capas separadas:**
  1. **Parámetros** (`parametrosDe(cuerpo, edad, opciones)`): función pura que traduce los datos y la edad a todo lo que el dibujo necesita (proporciones de cabeza y cuerpo, colores, peinado y su estado, canas, calvicie, barba, arrugas, anchuras por complexión…). Con tests.
  2. **Dibujo**: de los parámetros a SVG (texto), determinista. Retrato y figura entera salen de los mismos parámetros.
  3. **Pantallas**: en `apps/web`, que solo pide el SVG y lo coloca.
- **Catálogos como datos** (peinados, barbas, prendas, paletas), no repartidos por el código: es lo que la etapa 2c ampliará.
- **El estilo de peinado y de barba**: sus ids de catálogo van en contracts (para que un futuro «cambiar de look» pueda guardarlos en el estado); hoy el dibujo usa siempre el que le toca por defecto, sacado de la semilla, el sexo, la edad, el tipo de pelo y la calvicie. En esta fase no se guarda nada en el estado del juego.
- **Rendimiento**: cachear por persona, edad (en años) y vista. Un retrato nuevo debe generarse en pocos milisegundos y no debe notarse al abrir una ficha.
- **Sin recursos externos**: ni imágenes, ni fuentes, ni librerías de dibujo. SVG hecho por el código.
- **Tema claro y oscuro** de la web (`apps/web/src/style.css`): fondos y marcos con sus variables; la piel, el pelo y la ropa son colores propios.

## 4. Etapa 2a: exploración de estilo (y parar)

**Objetivo:** que el usuario elija el estilo viendo dibujos de verdad hechos con datos del juego.

- **Tres personas reales** de una partida con semilla fija, elegidas para que se vea variedad (pieles, tipos de pelo, sexo):
  - **Un chico**: el personaje.
  - **Una chica** de su clase.
  - **Un adulto** con canas tempranas y calvicie alta (por ejemplo, un padre o un profesor).
- **Edades**: 8, 15, 30 y 70 para los tres (en el adulto se ve el pasado con el historial; antes de la primera foto, la primera).
- **Parecido familiar**: en cada variante, además, el personaje a los 30 junto a su padre y su madre a los 30, para ver que se parece a ellos (los rasgos de la cara son heredados).
- **De 3 a 4 variantes** de estilo vectorial con volumen, todas con **detalle alto** en las caras. Que se diferencien de verdad (por ejemplo, en el tipo de sombreado, el trazo, la proporción de la cabeza o el tratamiento del pelo), no en matices.
- Para cada variante: el retrato de las tres personas a las cuatro edades y **una** figura entera a escala (las tres personas a los 30, junto a una regla). Así se ven también la altura y la complexión.
- **Entrega:** una página HTML autónoma que se genera con un script (`npm run retratos:muestras`) a partir de la partida, con las variantes una al lado de otra, rotuladas, en tema claro y oscuro, y que se vea bien en un móvil. Súbela a la rama y avisa a la sesión de arquitectura, que se la enseñará al usuario.
- **Para aquí.** No construyas la base hasta que llegue la elección del usuario. Las muestras pueden ser código provisional; lo que sí debe ser ya de verdad es la lectura de los datos.

## 5. Etapa 2b: la base

Con el estilo y el detalle elegidos:

1. **El paquete `@ds/retrato`** con las tres capas (§3).
2. **Retrato** (cara y hombros) y **figura entera a escala**: la altura real se nota al ponerlas juntas.
3. **Evolución**, con las dos vistas: una **fila de figuras** por etapas (por ejemplo, 3, 8, 12, 15, 18, 30, 50, 70 y 90, solo las que ya ha vivido o vive) junto a una **regla** en centímetros, y un **deslizador de edad** con una figura grande. Las edades futuras no se enseñan: el historial solo llega hasta hoy.
4. **Pantallas:** el retrato y el acceso a la evolución en la **ficha del personaje** (pestaña del personaje) y en la **ficha de cada persona** (`apps/web/src/gente.ts`). Nada en listas todavía.
5. **Cuadrícula de capturas** (`npm run retratos:cuadricula`): con el Chromium del entorno (Playwright), una cuadrícula de varias personas × edades (la cuna de menos de 3, y de 3 a 95) × los dos sexos, que cubra **todos los valores de cada catálogo** de la apariencia, los extremos de cada rasgo de la cara (0 y 1), **una familia** (padres, hijos y un nieto, para ver el parecido) y casos extremos (calvicie máxima, canas a los 20, barba 0 y 1, sobrepeso, musculado, muy alto, muy bajo), en tema claro y oscuro. **Úsala para revisarte a ti mismo** a lo largo del trabajo (mira las capturas y corrige), y déjala como referencia: quien amplíe los catálogos la regenera y la compara.
6. **Receta** en `docs/ANEXO_RETRATOS.md`: cómo está montado el dibujo, qué no se toca (proporciones por edad, capas, estilo) y **cómo se añade un peinado, una barba o una prenda** paso a paso, con lo que hay que comprobar en la cuadrícula. Es lo que seguirá la etapa 2c.
7. **Tests**: determinismo (misma persona y edad, mismo SVG), parámetros coherentes con la edad (crece hasta los 18, canas y calvicie no retroceden, la barba solo en hombres desde la pubertad), cada valor de los catálogos y los extremos de cada rasgo de la cara producen algo distinto, por debajo de los 3 años sale la cuna, y la arquitectura.

**Criterios para darla por buena** (los revisa la sesión de arquitectura con el usuario, mirando la cuadrícula):

- **Se reconoce a la misma persona** a los 8, a los 30 y a los 70.
- **Se nota el parecido** entre padres e hijos.
- La **altura y la complexión** se aprecian a simple vista.
- **Nada se rompe** en los extremos.

## 6. Etapa 2c: completar (Sonnet)

Siguiendo la receta: más variedad de peinados, barbas y bigotes, y prendas; los ajustes de las pantallas que queden. Cada pieza nueva se comprueba con la cuadrícula. Se planificará al terminar la 2b.

## 7. Entrega y avisos

- Rama propia; commits pequeños y los tests en verde en cada uno; sin pull request.
- Avisa a la sesión de arquitectura con `send_message` al terminar la 2a (con la ruta de la página) y al terminar la 2b (con un resumen y la cuadrícula).
- Al final de la 2b: la suite entera, `npm run typecheck`, `npm run rendimiento -- 60` (no debe empeorar) y una entrada en `docs/DECISIONES.md`; una línea en `CLAUDE.md` que cite `docs/ANEXO_RETRATOS.md`.

## Preguntas abiertas

_(Las rellena quien desarrolla; las responde la sesión de arquitectura con el usuario.)_
