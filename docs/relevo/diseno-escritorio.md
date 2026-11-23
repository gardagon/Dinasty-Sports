# Diseño de la web para PC: diagnóstico y tres prototipos

> **Actualización 23/11/2026: el usuario eligió el prototipo A y ya está aplicado** (§9 más abajo, capturas en `docs/relevo/diseno-escritorio/aplicado/`). Lo que sigue (§1–§8) es el informe de las pruebas, con las capturas de los tres prototipos.

Sesión de desarrollo `claude/diseno-escritorio` (sale de `claude/youthful-clarke-vs0kye`), 22/11/2026. Encargo: la entrada «Mejorar el diseño de la web para PC» de `docs/DECISIONES.md` y `docs/NOTAS_ARQUITECTURA.md` §4. **No se ha aplicado nada**: los prototipos van detrás de una opción en Opciones, que por defecto deja la web como estaba. El usuario elige uno y después se aplica.

Las capturas están en `docs/relevo/diseno-escritorio/` (PNG recortados, 2,8 MB en total). Se hicieron con `deviceScaleFactor: 2` y se redujeron a 1920 px de ancho para el informe. Las originales (3840×2160) se regeneran con la herramienta nueva (ver §6).

**La partida de las capturas:** semilla 35, España con la ciudad grande, fútbol, 9 semanas de curso, club del colegio (equipo B, benjamín), 3 partidos jugados, una lesión, 36 personas en el mundo, gente alrededor. El bot que la jugó la deja con la salud en 1 y la motivación en 20 (barras rojas): es el bot, no el juego.

## 1. Diagnóstico (diseño actual, en `actual-*`)

### Dónde se desperdicia espacio

1. **El ancho.** `.app` tiene `max-width: 1080px`. A 1920 px quedan 420 px vacíos a cada lado (el 44 % de la pantalla); a 1366 px, 143 px. `actual-1920-hacer.png`.
2. **Solo «Qué hacer» usa dos columnas, y el resto de pestañas, en realidad, solo la mitad.** `.layout` reparte `1.4fr / 1fr` para todas las pestañas, pero fuera de «Qué hacer» la columna derecha (`.side`) está vacía y aun así ocupa su sitio. Resultado: **Deporte, Gente, Personaje, Relaciones y Diario salen en una columna de unos 600 px**: el 31 % del ancho a 1920 y el 42 % a 1366. En `actual-1366-gente.png` la lista de personas ocupa la mitad izquierda y la derecha está en blanco; en `actual-1920-deporte.png` pasa lo mismo.
3. **La altura.** Sin ancho, todo se alarga hacia abajo: la pestaña Deporte mide **unos 7.150 px de alto a 1920** (unas 35 barras de habilidades, la tabla del próximo partido, la crónica del último partido minuto a minuto, la clasificación y la plantilla, apiladas), Personaje unos 3.000 y Gente son 3 páginas de 12 tarjetas en 2 columnas. La plantilla entera (`actual-1920-equipo.png`) es una columna de 21 filas, de 1.800 px.
4. **La cabecera.** El reloj + la fecha ocupan 3 líneas (unos 160 px), después la calle del día, las horas, las cuatro barras de estado en una fila y el dinero: unos 300 px de alto, **y se va al hacer scroll**. En cuanto bajas por Deporte o Gente, ya no ves ni la hora ni la energía.
5. **Los datos largos en las rejillas pequeñas:** la «Federación» de la ficha del deporte (un texto de 100 caracteres en la letra grande de `.identity dd`) estira esa fila.

### Qué datos obligan a saltar de pestaña

- **Lo que acabas de hacer** (`viewResult`) solo sale en «Qué hacer» y «Gente». Haces algo desde Deporte (no se puede) o miras otra pestaña y se pierde.
- **Pendiente** (decisiones con plazo) y **Planes**: solo en «Qué hacer». Quien está en Deporte o Diario no los ve.
- **Próxima prueba / siguiente partido y clasificación**: solo en Deporte, y la tabla de la liga está casi al final. Para decidir cómo pasar la semana (entrenar o no, ir al campo) hay que ir a Deporte, bajar y volver a «Qué hacer».
- **El Diario** (qué ha pasado, avisos de salud, partidos) es otra pestaña: no se ve mientras se juega.
- **El personaje** (retrato, edad, altura) está en otra pestaña que no se mira casi nunca, pero es lo que da cara al juego cuando se enseña a otra persona.
- **Gente → ficha → hacer algo con alguien**: la ficha es de una sola columna (`actual-1366-ficha.png`, retrato pequeño, mucho vacío a la derecha) y las acciones quedan debajo del pliegue.

### Ventanas

El suceso mide 520 px de ancho (`actual-1920-suceso.png`): a 1920 px es una tira estrecha sobre una pantalla enorme, con las opciones en una columna y mucho blanco al lado del retrato.

### Qué está bien y se conserva

El papel cuadriculado, la calle del día como reloj, el color de las barras y las tipografías funcionan también en pantalla grande; el problema es la colocación, no el estilo. Las piezas (`view*`) ya son independientes, así que se pueden recolocar sin tocarlas.

## 2. Cómo está hecho (común a los tres)

- **`apps/web/src/escritorio.ts` y `escritorio.css`** (nuevos). La composición recibe las funciones `view*` de `main.ts` en un objeto (`Vistas`) y las coloca; no dibuja nada del juego por su cuenta. Solo añade dos resúmenes pequeños hechos con datos que ya publican los módulos (`IdentityService` y `DeporteView`): el personaje y el deporte (próxima prueba, última prueba y clasificación alrededor del equipo).
- **`main.ts`: 18 líneas añadidas y 2 cambiadas**, sin reorganizar nada: la importación; un `if (usaEscritorio())` al principio de `viewGame` que llama a `viewEscritorio`; la opción dentro de `viewPresentacion()` (sale en Opciones del menú y en Opciones de la partida); un manejador en `change` y otro en `click` (la segunda pestaña del prototipo B); y un `vigilarAncho(render)` para redibujar al cruzar el ancho.
- **Opción en Opciones** → «Diseño»: *Móvil (como ahora)* (por defecto) / *Automático* (escritorio desde 1280 px) / *Escritorio* (siempre, desde 1000 px), y «Prototipo de escritorio»: A / B / C. Se guarda en el navegador (`localStorage`: `ds.diseno`, `ds.prototipo`).
- Todo el CSS nuevo cuelga de `.esc` o de `body:has(.esc)` (las ventanas se dibujan fuera de la página): sin la opción no cambia ni una regla. Usa las variables de color de `style.css`, así que **claro y oscuro** (y los temas) funcionan igual. La página es de altura fija (`100vh`) y cada zona se desplaza por su cuenta: la barra del día nunca desaparece.
- **Móvil:** comprobado a 390 px con la opción en «Automático»/«Escritorio» frente a «Móvil (como ahora)»: las capturas de Qué hacer, Personaje y Deporte son **idénticas byte a byte** (`movil-390-hacer.png`). Con el valor por defecto, no se ejecuta nada nuevo salvo leer la opción.
- Las ventanas (sucesos, opciones, fichas) en escritorio: suceso de 860 px con las opciones en 2 columnas y retrato más grande; opciones de 600 px.

## 3. Prototipos

### A · Tres columnas (el punto de partida de la arquitectura)

- **Arriba, siempre visible:** reloj y fecha | calle del día | las 4 barras de estado en 2×2 | nombre y Opciones/Menú; dinero y aviso de guardado debajo del reloj.
- **Izquierda fija:** el personaje (retrato, edad, altura, peso), lo **pendiente**, los **planes** y el resumen del deporte.
- **Centro:** las pestañas de siempre. «Qué hacer» pasa a dos columnas (acciones | viajar); Personaje con la identidad y las características en dos columnas; Deporte con habilidades y temporada una al lado de la otra y la plantilla en dos columnas; Diario con recuerdos y diario lado a lado; Relaciones en columnas. Lo último que has hecho queda arriba del centro.
- **Derecha fija:** el diario reciente (con scroll).

Capturas (1920): `a-1920-claro-hacer.png`, `a-1920-claro-deporte.png`, `a-1920-claro-equipo.png`, `a-1920-claro-personaje.png`, `a-1920-claro-suceso.png`, `a-1920-oscuro-hacer.png`; (1366) `a-1366-claro-ficha.png`.

**Ventajas:** el que menos cambia (el jugador reconoce el juego: sigue habiendo pestañas); lo que antes obligaba a saltar (personaje, pendientes, planes, diario, próxima prueba) se ve siempre; el centro gana el ancho que perdía. Respeta el principio 7 de `VISION.md` (se sienten los datos sin gestionarlos).
**Inconvenientes:** a 1280–1366 px el centro queda en unos 700–800 px (la columna derecha se estrecha y a menos de 1100 px se oculta); hay tres zonas que se desplazan por separado (hay que acostumbrarse); la columna izquierda queda con huecos cuando no hay pendientes ni planes; «Qué hacer» sigue teniendo bastante blanco debajo porque hay pocas acciones.

### B · Dos pestañas a la vez

- Barra del día arriba y, debajo, **dos paneles con su propia barra de pestañas** y su propio scroll (por defecto, «Qué hacer» y «Deporte»). Cada pestaña solo puede estar en un panel a la vez (si eliges en uno la que está en el otro, el otro pasa a otra). Lo último que has hecho y lo pendiente salen en una tira entre la barra y los paneles, solo si hay algo.

Capturas: `b-1920-claro-hacer.png`, `b-1920-claro-gente.png`, `b-1920-oscuro-hacer.png`, `b-1366-claro-diario.png`.

**Ventajas:** es el que más ve a la vez de lo que el jugador elija (Gente y «Qué hacer», Deporte y Diario…) y se adapta a cada uno; la lógica es mínima (una variable más).
**Inconvenientes:** a 1366 px cada panel mide unos 650 px (casi un móvil ancho: las tablas y las plantillas se quedan en una columna); sin retrato ni resumen fijo del personaje; no está pensado para enseñar el juego (no hay nada que mire al espectador por defecto); un panel de acciones junto a uno de gente es útil, pero hay que elegirlo: lo que no se elige, no se ve.

### C · Panel

- «Qué hacer» pasa a llamarse **Panel** y es un tablero con todo a la vista: lugar y acciones | viajar y planes | personaje y deporte | gente aquí | diario (a 1700 px o más, cuatro columnas). Cada tarjeta se desplaza por su cuenta. Las demás pestañas (Personaje, Estudios, Deporte…) ocupan toda la pantalla a pantalla ancha. Lo último que has hecho sale en una tira sobre el panel.

Capturas: `c-1920-claro-hacer.png`, `c-1920-oscuro-hacer.png`, `c-1366-claro-hacer.png`, `c-1920-claro-estudios.png`.

**Ventajas:** es el que mejor **se enseña**: abre con el personaje, el deporte, la gente y el diario a la vez (el «cuadro de mandos» que pide la presentación a otras personas); casi no hay que cambiar de pestaña; lo más cercano a un Football Manager.
**Inconvenientes:** es el que más cambia el juego (la pantalla principal ya no es una lista de acciones sino un tablero); las acciones, que son lo que se hace más veces, quedan en una columna más estrecha; todo es denso: con menos de 1500 px cada tarjeta enseña poco sin scroll; algunas tarjetas quedan huecas (Viajar tiene muy pocas opciones); la ficha de una persona se abre dentro de una tarjeta estrecha.

## 4. Recomendación

**A como diseño de escritorio, y C como «pantalla de presentación» más adelante.**

1. A resuelve los tres problemas del diagnóstico (ancho, cabecera que se va, datos en otras pestañas) con el menor cambio de hábito, y es el más fácil de mantener: sale de la composición existente, con tres columnas y pestañas.
2. B es una idea que se puede **añadir a A después** (un botón «abrir una segunda pestaña» en el centro), no un diseño base: a 1366 px es demasiado estrecho.
3. C luce más, pero decide qué es «Qué hacer»; mejor probarlo con el usuario antes y, si gusta, convertir el Panel en la pestaña de inicio de A (no en un diseño aparte).

## 5. Qué faltaría para aplicarlo de verdad

- **Elegir el prototipo y qué hacer con «Automático» por defecto** (al aplicarlo, pasa a ser el valor por defecto desde 1280 px; en el móvil, igual que ahora).
- Pulir cada pestaña a pantalla ancha: ficha de personas con retrato al lado (hoy usa la misma ficha de una columna), Estudios (la tabla del horario), Relaciones y Opciones; las ventanas de «Opciones» y «Menú» a pantalla ancha; los pocos sitios con `max-width` fijo.
- La columna del diario reciente dibuja **todo el diario** (hasta `LOG_LIMIT`) en cada redibujo y lo corta con scroll: recortar a las últimas ~30 entradas (o `content-visibility`) antes de aplicarlo. Medir con `npm run rendimiento:web`.
- Altura fija (`100vh`): comprobar con zoom del navegador del 125–150 % (un portátil de 1920 con escala 150 % son 1280 px: entra en «Automático» justo), con ventanas bajas (menos de 700 px de alto: la barra del día ocupa unos 135 px; se podría compactar) y con el teclado/barras del navegador en tabletas.
- Accesibilidad: el orden del foco entre las tres zonas, y que los paneles con scroll propio se puedan recorrer con teclado.
- Pruebas: `probar-web` con el modo escritorio (ahora solo comprueba la ruta de móvil) y un test pequeño de `escritorio.ts` (la lógica de «dos pestañas distintas» del B, si se queda).
- **Coordinar con las sesiones que arreglan la interfaz:** si añaden pestañas o cambian una `view*`, solo hay que tocar el objeto `Vistas` y, si cambian la estructura HTML de una pieza, los selectores de `escritorio.css` (los de `.esc-personaje-pag`, `.esc-deporte-pag` y `.esc-relaciones-pag` dependen de cómo salgan las `<section class="sheet">`).

## 6. Verificación

`npm run typecheck` sin errores; `npm test`: 126 archivos, 1367 tests, todos en verde (552 s); `npm run probar-web`: el camino entero en Chromium, sin errores en la consola (con la opción por defecto). Los prototipos se comprobaron con las capturas (§3), no con pruebas automáticas.

## 7. Cómo repetir las capturas

```bash
# una vez (unos 3 min): construye, instala el fútbol, crea la partida, juega 9 semanas y la exporta
DS_TRABAJO=/tmp/ds-escritorio npx tsx tools/capturar-escritorio.ts preparar 35
# las capturas (cada combinación: ~40 s)
DS_TRABAJO=/tmp/ds-escritorio npx tsx tools/capturar-escritorio.ts capturar <carpeta> --disenos movil,a,b,c --anchos 1366,1920,390 --temas claro,oscuro [--solo hacer,deporte,gente,ficha,suceso,…]
```

`movil` es el diseño de ahora; `a`, `b` y `c`, los prototipos. A 390 px los prototipos caen al diseño de móvil.

## 8. Dudas para el usuario

1. ¿Cuál de los tres (o qué mezcla)? Mi propuesta: A ahora y el Panel de C como inicio de A.
2. ¿Quieres que «Qué hacer» siga siendo la pantalla principal, o un panel con todo a la vez (C)?
3. ¿Desde qué ancho se usa el escritorio por defecto? Ahora, 1280 px (portátiles pequeños de 1366 entran; tabletas en horizontal de 1024 no).
4. ¿Lo que se enseña siempre a la izquierda es lo correcto? (retrato, edad, altura, peso, pendientes, planes y deporte). ¿Falta algo (dinero, equipo, próxima cita) o sobra algo?
5. El diario reciente a la derecha enseña los avisos tal cual (hoy «Agotamiento: tu salud se resiente» sale 3 veces al día): ¿filtrar lo repetido? (es de contenido, no de diseño).
6. Los cifras de «solo pruebas» (afinidad, genética, etc.): en la presentación a otras personas ¿se ocultan ya (`MOSTRAR_*`) o se dejan?

## 9. Diseño A aplicado (23/11/2026)

Encargo de la arquitectura tras elegir el usuario el A (`docs/DECISIONES.md`, 23/11). Rama `claude/diseno-escritorio`, unida antes a `claude/youthful-clarke-vs0kye`.

### Qué cambia

1. **Por defecto «Automático»**: tres columnas desde 1280 px de ancho; por debajo, exactamente la disposición de siempre. **A 390 px las capturas con «Automático» y con «Móvil» son idénticas byte a byte** (Qué hacer, Personaje, Deporte, Gente y Estudios).
2. **Opciones: «Diseño: automático / escritorio / móvil»** (el selector de prototipo ya no sale). B y C siguen en `escritorio.ts` detrás de `OFRECER_PROTOTIPOS = false` (el Panel de C podría ser más adelante la pestaña de inicio de A).
3. **Dinero en la columna izquierda**, como pieza propia (`PIEZAS_IZQUIERDA`: personaje, dinero, pendientes, planes, deporte). **Añadir comida, inventario, etc. es una línea** (una función `(g, vistas) => html` en esa lista); la barra del día ya no enseña el dinero en escritorio.
4. **La posición de cada zona se conserva al redibujar.** Hallazgo: con las zonas que se desplazan por su cuenta, cada acción (que redibuja todo) las devolvía arriba del todo. `main.ts` guarda y restaura el `scrollTop` de cada zona (`guardarScroll`/`restaurarScroll`, con una clave por zona y pestaña: una pestaña distinta empieza arriba).
5. **Pulido a pantalla ancha:**
   - ficha de personas: el retrato a la izquierda y el resto a la derecha (con la evolución abierta, a todo el ancho): `auto-1920-claro-ficha.png`;
   - Estudios: asignaturas y horario de clases lado a lado (con un *container query*: solo si el centro mide 1000 px o más): `auto-1920-oscuro-estudios.png`;
   - Relaciones, Personaje, Deporte («Mi equipo» en dos columnas) y Diario, como en el prototipo;
   - Opciones: la ventana de la partida y la pantalla del menú en dos columnas (`auto-1920-claro-opciones-*.png`); sucesos de 860 px;
   - ventanas bajas (menos de 760 px de alto) y zoom del 125–150 %: la barra del día se compacta (`auto-1536x864`, `auto-1280x720` y `auto-1280x620`).
6. **Diario de la derecha: solo las últimas 30 entradas** (`ENTRADAS_DEL_DIARIO_RECIENTE`; `viewLog(g, max?)`) y `content-visibility: auto`; la pestaña Diario sigue enseñando todo.
7. **Teclado y foco:** en el HTML va primero el centro y luego las columnas (en pantalla se colocan con `grid-template-areas`), así que con Tab se pasa por Opciones, Menú, las pestañas y el contenido de la pestaña antes que por las columnas (medido: `opciones → menú → pestañas (7) → zona del centro → sus botones`). Las zonas con scroll son enfocables (`tabindex="0"`, `role="region"` y nombre) y se recorren con las flechas.
8. **«Pasando la semana…» (M1)**: si una acción cruza de semana, se pinta antes el aviso (reutiliza la ventana «Un momento…»), un `requestAnimationFrame` y después se calcula; un segundo clic mientras tanto no hace nada. No toca el motor.
9. **Textos de la creación**: «unos 40 s» pasa a «hasta un minuto» (la lista de países, el aviso de «Nueva partida» y la pantalla «Creando el mundo…»). Las herramientas que escogen el país por su nombre (`probar-web`, `capturar-*`) se actualizaron.

### Qué se tocó de `main.ts` (para unir con la otra sesión que toca Opciones y Nueva partida)

Importación de `escritorio`; una línea en `viewPresentacion()` (`${viewOpcionesDeDiseno()}`, **no** toca los selectores de contenido); `viewLog(g, max?)`; el bloque de `viewGame` que llama a `viewEscritorio`; `guardarScroll`/`restaurarScroll` en `render()`; dos manejadores (`change` del selector, `click` de la segunda pestaña, que ya no se usa en A) y el bloque del clic en una acción (M1); `vigilarAncho(render)`; y los dos textos «un minuto». Nada reformateado.

### Verificación

- `npm run typecheck`: sin errores.
- `npm test`: 127 archivos, 1376 tests, todos en verde (597 s).
- Test nuevo `apps/web/src/escritorio.test.ts` (9 tests): el diseño por defecto y los anchos; las opciones; que B y C no se ofrecen; cada pieza se dibuja una sola vez (el resultado de lo último se «gasta» al dibujarlo); el orden del foco y las zonas enfocables; la columna izquierda (incluido el dinero) y la posición del scroll.
- `npm run probar-web` (móvil, 480 px) y **`npm run probar-web:escritorio`** (nuevo: 1440×900): los dos recorren el camino entero sin errores de consola. Ambos comprueban también la disposición que toca (tres columnas / de siempre) y que al cruzar de semana aparece «Pasando la semana…» antes de calcular y se quita al acabar (se acerca la partida al final de la semana y se pulsa una acción que la cruza).
- **`npm run huella -- 60`:** **idéntica** a la de antes de tocar nada (las mismas líneas y los mismos hashes; los cambios son solo de la web).
- **Coste de redibujar** (`tools/capturar-escritorio.ts --medir`: media de 20 `render()` con la partida de las capturas): **A, 22–30 ms** por redibujo a 1366 y 1920 (con el diario de 30 entradas, el retrato y el resumen del deporte) frente a **16 ms** con la disposición de siempre. `npm run rendimiento:web` (nuevo `--ancho`; ciudad de prueba, 40 acciones, escritorio): a **1100 px** (disposición de siempre) **mediana 23,1 ms, p90 25,5 ms, máx 27,9 ms**; a **1440 px** (tres columnas) **mediana 23,4 ms, p90 38,8 ms, máx 40,2 ms**. Cruzar de día: 21 ms → 23 ms; de semana, total con repintado 15–40 ms → 22–37 ms. Es decir, la mediana no cambia y el peor caso sube unos 12 ms, muy por debajo de lo que se nota.

### Lo que queda y lo que no he hecho

- **El Menú (la pantalla de inicio y «Nueva partida») sigue a 460 px de ancho**, centrado: solo se ensanchó Opciones. Hacer lo mismo con «Nueva partida» toca la pantalla que lleva la otra sesión (`claude/sucesos-motor-2`); mejor después de unir.
- **El foco se pierde al redibujar** (como en todo el juego: cada acción repinta con `innerHTML`). Con el teclado, tras pulsar una acción hay que volver a tabular. No lo he cambiado: es de la web entera, no del diseño (se arreglaría recordando el `data-do` enfocado).
- «Qué hacer» deja bastante blanco debajo cuando hay pocas acciones; es lo que hay que mostrar, pero la columna del centro podría llevar algo más (la ficha del lugar con un mapa, por ejemplo).
- La casilla «Avisar “no va contigo”» sale centrada en la pantalla de Opciones (viene de `.start input { width: 100% }`, que ya estaba): no la he tocado.
- **Un fallo de contenido que se vio en las capturas:** el nombre del país «España · ciudad grande (se tarda hasta un minuto en crear)» se cuela en el texto de la federación («Real Federación Española de Fútbol (con los datos de España: España · ciudad grande (se tarda… en crear) aún no tiene los suyos)»). Ya pasaba con «unos 40 s»; la advertencia no debería formar parte del nombre del país. Es de `PAIS_CIUDAD_GRANDE`/`paises-propios.ts`, no del diseño.
- No se ha probado en un navegador de teléfono real ni en una pantalla táctil grande (tableta horizontal ≥ 1280 px entra en «Automático»).

