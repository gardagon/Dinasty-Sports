# Dinasty Sports — guía para trabajar en este repositorio

RPG de decisiones (deporte + vida escolar) en TypeScript, monorepo con npm workspaces.
Si coordinas el proyecto (sesión de arquitectura), lee antes `docs/NOTAS_ARQUITECTURA.md`: cómo se trabaja, el estado y los recordatorios pendientes.
Lee `docs/VISION.md` (qué juego es y sus principios: datos de verdad para todos, las mismas reglas para el personaje y los PNJ, el mundo avanza solo), `docs/ARQUITECTURA.md` antes de cambios grandes y `docs/DECISIONES.md` para el contexto y lo pendiente.
Los horarios de las personas (dónde está cada una a cada hora) y la población prevista de PNJs están en `docs/ANEXO_HORARIOS_PNJ.md`: si cambias un horario, cambia el anexo y `packages/contracts/src/agendas.ts`.
Las cifras de las relaciones (cuánto sube cada acción, habilidades y gustos que influyen, estados) están en `docs/ANEXO_RELACIONES.md`: si cambias una, actualiza el anexo.
Los nombres, apellidos y orígenes de las personas (listas por cultura, reglas de mezcla, homónimos) están en `docs/ANEXO_NOMBRES.md`, y lo que cambia de un país a otro (paquetes de país: calendario, currículo, horarios, gente; las categorías, la temporada y las competiciones de cada deporte son datos del deporte, por país: `docs/PAQUETES_DE_PAIS.md` y `docs/PLAN_DEPORTES_MODULARES.md` §4) en `docs/PAQUETES_DE_PAIS.md`: si cambias una regla o un dato, actualiza el anexo.
El cuerpo de las personas (altura, peso, músculo y grasa con la edad y el sexo, hábitos de los PNJ, historial anual, canas, calvicie, barba y rasgos de la cara heredables, servicio de lectura para el visualizador) está en `docs/ANEXO_CUERPO.md` (plan: `docs/PLAN_CUERPO_Y_APARIENCIA.md`): si cambias una cifra, actualiza el anexo y `packages/contracts/src/cuerpo.ts`.
El dibujo de las personas (paquete `@ds/retrato`: estilo, capas, catálogos de peinados y de vello facial con su largo, y cómo se añade un peinado, una barba o una prenda) está en `docs/ANEXO_RETRATOS.md`: si cambias el dibujo o un catálogo, regenera la cuadrícula (`npm run retratos:cuadricula`), mírala y actualiza el anexo y `packages/contracts/src/retrato.ts`.
Las familias y los hogares (`CiudadDef.hogares`, activado por defecto en las tres ciudades desde el 24/11/2026: cada niño sale de una familia con sus progenitores, hermanos pequeños y trabajo; `modules/npcs/src/hogares.ts`, `FAMILIAS`) están explicados y medidos en `docs/relevo/hogares.md`; con el dato a `false` (o una partida guardada antes) el mundo es el de antes, y para comparar están `PAIS_CIUDAD_*_SIN_HOGARES` y `DS_SIN_HOGARES=1` en las herramientas de medida.
El reparto de los equipos de fútbol al crear la partida con la ciudad grande (`CiudadDef.repartoNuevo`, desde el 27/11/2026: reparto nuevo de inicio, nada lo deshace y la partida empieza en equilibrio; `modules/npcs/src/index.ts` `conRepartoNuevo`, `draft.ts`) está en `docs/relevo/reparto-nuevo-implementado.md` y su especificación en `docs/relevo/reparto-nuevo-reglas.md`; `DIAGNOSTICO.sinRepartoNuevo` lo apaga para comparar, y la ciudad de ahora y la de prueba siguen con el reparto de siempre. Chicos y chicas (partidas nuevas de esa ciudad: ~10 % de chicas, equipos separados por sexo desde infantil, femeninos `<club>_f` solo en clubes externos y sin liga: sus jugadoras simulan partidos sin resultados) están en `docs/relevo/chicos-y-chicas-implementado.md` (`reclutamiento.sexos`, `PoblacionGuardada.sexos`). El verano de esa ciudad (equipos que se mantienen, benjamín y alevín de 18, juvenil por nivel…) es el de `docs/relevo/verano-nuevo-implementado.md` (`conVeranoNuevo`; `tools/verano-tres.ts <semilla> m 8 real` lo mide en el juego tal cual).
La pestaña del deporte y las reglas de las clasificaciones (puntos por puesto, qué se guarda) están en `docs/ANEXO_DEPORTE.md`, que también tiene el catálogo de los 22 entrenamientos del fútbol, las quedadas para jugar y los campamentos (`modules/futbol/src/entrenamientos.ts`: una constante, `ESCALA_DE_ENTRENAMIENTO`, lo calibra).
El mundo del fútbol base (ciudad grande, colegios, clubes, filiales, divisiones, liga y copa) está en `docs/CIUDAD_Y_LIGAS.md`.
Los eventos y decisiones (en el código, «sucesos»: el formato, el director `modules/sucesos`, los eventos base de `modules/eventos` por áreas y los de cada deporte en su paquete, cupos y presentación editables, y cómo se prueba) están en `docs/ANEXO_EVENTOS.md` (plan y decisiones: `docs/PLAN_EVENTOS.md`): un evento nuevo es un archivo de datos, sin tocar el motor ni otros módulos; si cambias el formato o una cifra, actualiza el anexo, y tras añadir o cambiar eventos pasa `npm run eventos:validar` y `npm run eventos:mapa`.
La web a pantalla ancha (diseño de escritorio A, tres columnas, desde 1280 px en «Automático») está en `apps/web/src/escritorio.ts` y `escritorio.css`: **coloca las mismas funciones `view*` de `main.ts`**, así que una pestaña nueva o una pieza nueva sale sola en los dos diseños; para añadir algo a la columna izquierda (comida, inventario…) se añade una pieza a `PIEZAS_IZQUIERDA`. Cómo se decidió, las capturas y lo pendiente: `docs/relevo/diseno-escritorio.md`. Si cambias el HTML de una pieza, mira que `escritorio.css` (los selectores `.esc-*-pag`) siga bien.
Cuando tomes una decisión de diseño o de balance, añade una entrada en `docs/DECISIONES.md`.

## Reglas que no se rompen

1. **Un módulo (`modules/*`) solo importa `@ds/contracts` y el kit de deporte (`@ds/kit-deporte`).** Nunca otro módulo,
   nunca `@ds/core` (salvo en sus `*.test.ts`). El kit solo importa `@ds/contracts`. Lo vigila `tests/arquitectura.test.ts`.
2. **Los módulos se comunican solo por:** etiquetas + modificadores, eventos (propios `modulo.*` o
   compartidos de `SHARED_EVENTS`), servicios definidos en `packages/contracts/src/services.ts`,
   y referencias por id a las stats genéricas `gen.*`.
3. **Ids con prefijo del módulo** (`atletismo.tecnica`, `estudios.clase`). El registro lo exige.
4. **Un módulo no cambia directamente las habilidades de otro:** usa `ctx.train()`. `ctx.addStat()`
   solo vale para stats `estado` o propias. El motor lanza un error si no.
5. **El estado de un módulo es JSON serializable** y solo lo modifica ese módulo.
6. **`packages/core` no contiene contenido de juego.** Nada de deportes, asignaturas ni textos de juego.
7. **Lo que necesitan varios módulos va a contracts** (tipos de eventos compartidos, interfaces de servicio).
8. Textos del juego en español. Los NPCs tienen género: concuerda los textos (`gender`).

## Comandos

```bash
npm install
npm run dev              # interfaz web en local
npm test                 # tests (incluye arquitectura e integración)
npm run typecheck
npm run sim              # simulación de balance completa (365 días × 5 semillas)
npm run sim:rapida
npm run sim:vida         # vida entera de un bot que lo entrena todo (70 años por defecto): nivel frente a tope por edad (y % del tope de sus 6 mejores capacidades)
npm run sim:notas        # banco de notas: nota media por aptitud y rutina de estudio frente a los objetivos
npm run huella -- 120     # huella exacta de las partidas de los bots: antes y después de una reorganización debe salir igual
npm run rendimiento -- 60  # dónde se va el tiempo: crear, guardar, cargar, ms por acción y peso del estado por módulo y campo
npm run clave-deportes   # genera el par de claves con que se firman los deportes (la privada, a un secreto DS_CLAVE_PRIVADA de GitHub)
npm run publicar-deportes -- <carpeta>  # empaqueta y firma TODOS los deportes (también los que no van dentro del juego, como el fútbol: `"dsDeporte": true` en su package.json) en <carpeta>/deportes (necesita DS_CLAVE_PRIVADA)
npm run probar-web       # el camino entero en un Chromium de verdad: instalar el fútbol, crear una partida («creando el mundo») y jugar un día de partido (~2 min)
npm run probar-web:escritorio  # el mismo camino con una ventana de ordenador (1440×900): el diseño de escritorio y el aviso «Pasando la semana…»
npx tsx tools/capturar-escritorio.ts preparar|capturar  # capturas de la web a 1366/1920/390 px, en claro y oscuro (docs/relevo/diseno-escritorio.md §6)
npm run sim:cuerpo -- 2 31,32  # el cuerpo de la población: proporción por complexión y grupo de edad frente a los objetivos del plan del cuerpo
npm run partidos:banco -- 300   # banco de realismo de los partidos: goles, tiros, goles por línea, posesión… por categoría, frente a la referencia del motor anterior (`docs/relevo/partidos-p0.md`); `--guardar-referencia` solo si el cambio de motor es a propósito
npm run partidos:prototipo -- 200  # los cuatro motores de prueba (más tramos, posesiones y xG, zonas, espacial): coste y estadísticas (`docs/relevo/partidos-reales.md`)
npm run sim:futbol -- 365 3  # cuánto se aprende en un curso con el club: deportista de fútbol frente al de atletismo (mismo plan)
npm run sim:futbol-habilidades -- 365 3  # cuánto sube cada habilidad del fútbol en un curso con el bot de campo (para calibrar el catálogo de entrenamientos)
npm run entrenamientos:tabla  # la tabla de los 22 entrenamientos del fútbol con las cifras finales (docs/ANEXO_DEPORTE.md)
npm run benjamin -- 31,33  # la regla de benjamín (todos nuevos en el club) con la ciudad grande: semanas hasta el primer partido y primera convocatoria
npm run equipos-minimo -- grande con 1-10  # (con `--nuevo|--equilibrar` el reparto nuevo entero; con `--chicas=0.11 --solo=m|f` chicos y chicas por separado desde infantil, `docs/relevo/reparto-nuevo-sexos.md`) cuántos equipos de fútbol quedan por debajo del mínimo de la liga (14) tras el reparto, por categoría y semilla (docs/relevo/equipos-minimo.md; `actual|grande`, `con|sin` hogares)
npm run reparto:paso -- 33 grande benjamin  # el reparto de una categoría paso a paso y en texto (clubes, rondas, por qué cada club tiene N equipos, quién queda fuera, el verano siguiente; docs/relevo/reparto-paso-a-paso.md)
npm run retratos:cuadricula  # la cuadrícula de capturas del dibujo de las personas (docs/retratos): catálogos, rasgos, familia, peinados, barbas y extremos, en claro y oscuro
npm run retratos:muestras    # las muestras de las cuatro variantes de estilo que vio el usuario (provisional)
npm run eventos:nuevo -- eventos.<área>.<nombre> "Título"  # crea un evento base con la plantilla comentada y lo apunta en el índice
npm run eventos:validar  # todos los eventos: forma, referencias, textos, memoria, escenarios y todos los caminos (también dentro de npm test)
npm run eventos:probar -- <hilo o suceso> [--elige a,b] [--masculino]  # enseña todos sus caminos con los textos que vería el jugador
npm run eventos:mapa     # docs/eventos/MAPA.md: hilos, quién programa a quién y las marcas con que se hablan
npm run eventos:rendimiento  # lo que cuestan los sucesos: con 500 generados (arranque, por acción, por día) y con las clases de los PNJ activadas o no
npm run sim:eventos -- 180 2  # cuántas veces sale cada evento por año con cada bot (para calibrar probabilidades y cupos)
npm run check            # tipos + tests + simulación rápida
npm run nuevo-modulo -- <id> "<Nombre>"
```

## Al cambiar números de balance

Ejecuta `npm run sim` antes y después, y compara los chequeos y la tabla final.
Si un chequeo pasa a ⚠️ o ❌, explica por qué o ajusta. Los umbrales están en `sim/src/analysis.ts`.
Si un bot se comporta de forma poco razonable, arregla el bot (`sim/src/bots.ts`), no el juego.

## Al añadir un módulo

Usa el generador. El módulo debe tener un test que lo cargue solo con `gen`.
Si es un deporte: etiqueta propia + `entrenamiento`/`competicion`, emite `competicion.resultado`, y monta lo común
(club, entrenador, categorías, verano, tele, sobrecarga, conocimiento) con el kit de deporte (`packages/kit-deporte`) en vez de copiarlo.
El plan para instalar, quitar y cambiar de deporte está en `docs/PLAN_DEPORTES_MODULARES.md`.
