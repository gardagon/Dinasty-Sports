# Diseño de la web para PC: diagnóstico y tres prototipos

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
