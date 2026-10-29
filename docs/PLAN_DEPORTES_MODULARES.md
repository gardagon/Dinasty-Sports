# Plan: deportes que se pueden poner, quitar y cambiar

Plan por fases (29/10/2026), **pendiente de aprobar**. Se pide **antes de nada del fútbol**: que el juego tenga la estructura para incluir y quitar deportes, que **ninguna fase estropee las partidas en curso** y que **el jugador pueda cambiar de deporte en cualquier momento**. El fútbol empieza cuando terminen estas fases; su diseño propio sigue en [`ANALISIS_FUTBOL.md`](ANALISIS_FUTBOL.md) (§3.4 a §3.8). Este plan sustituye a sus §3.1 a §3.3 y a las fases 1 y 2 de su §4.

---

## 1. Tres niveles distintos

| Nivel | Qué es | Quién lo decide | Cuándo cambia |
|---|---|---|---|
| **Instalado** | El módulo del deporte está en el juego (`packages/game/src/modulos.ts`) | El desarrollo | Al publicar una versión |
| **Practicado** | El personaje hace ese deporte ahora (y ha hecho otros antes) | **El jugador** | En cualquier momento de la partida |
| **Visible** | Sus acciones, su pestaña y su gente salen en la interfaz | Sale del anterior | Con el anterior |

Consecuencias:

- **Cambiar de deporte no es instalar ni quitar módulos.** Todos los deportes instalados existen desde el principio de la partida (sus habilidades se crean con su genética aunque nunca se practiquen), pero solo el practicado se ve y funciona. Cambiar de deporte es cambiar un dato del estado.
- **Instalar un deporte nuevo en una versión nueva** debe llegar a las partidas en curso: el motor ya crea al cargar el estado inicial y las stats de un módulo nuevo (`Game.fillMissing`, cada stat con su propio hilo de azar). Falta que `npcs` y `clubes` también generen lo suyo (fases 3 y 4).
- **Retirar un deporte** deja su estado dormido en la partida: el motor recorre siempre el registro, así que lo que no está registrado se ignora. Si vuelve, se recupera tal cual. Hay que vigilarlo con un test (fase 0).

## 2. Qué significa «cambiar de deporte en cualquier momento» (reglas propuestas)

- **Dejar un deporte:** se sale de su club (`club.salir`), sus acciones y su pestaña desaparecen, sus habilidades caen con la caída normal (gracia de 4 días y suelo del 70 % de lo máximo alcanzado: es lo que ya mide el chequeo «Dejar un deporte hace caer las habilidades entre un 3 % y un 40 %») y el conocimiento casi no se olvida (30 días de gracia, suelo del 95 %).
- **Empezar o volver a un deporte:** se puede a mitad de curso. Se entra sin club (se puede entrenar por libre y apuntarse después). Si ya se practicó, se conservan sus habilidades, su historial y sus clasificaciones; se recuperan antes por la memoria muscular.
- **Lo que no se pierde:** las relaciones con entrenadores y compañeros (son personas: siguen ahí), los resultados de los cursos anteriores y el historial («Atletismo: cursos 1 a 3; fútbol: desde el curso 4»).
- **Sin coste por cambiar**, salvo el de dejar el club como hoy (sin coste si se deja antes; plantón si no). Límite propuesto: **un deporte a la vez** de momento. La estructura admite varios (es una lista), pero así no se reparte el tiempo ni se rompen los bots. Abrirlo a dos es cambiar una constante.
- **Sin ningún deporte** también vale (el personaje deja el atletismo y no empieza otro).

## 3. Las fases

Cada fase es un PR que deja todo en verde, con la misma comprobación: **una partida guardada antes de la fase carga y se juega después**, y **`npm run sim` da exactamente lo mismo** salvo en la fase en que se diga lo contrario.

### Fase 0 — Red de seguridad para las partidas en curso

Hoy la política de la alfa es subir `SAVE_VERSION` y descartar las partidas antiguas (`Game.load` las rechaza). Con el objetivo de no estropear partidas, **esa política se acaba aquí**.

- **Migraciones.** El motor guarda la versión del núcleo y **una versión por módulo** (`GameState.versiones`). Cada módulo que cambie la forma de su estado declara cómo convertir el antiguo (`GameModule.versionDeEstado` y `migrarEstado(viejo, desde)`): así cada módulo migra solo lo suyo (regla 5) y el motor no sabe de deportes (regla 6). Los cambios del núcleo van en una cadena propia (`MIGRACIONES[v]`). `Game.load` aplica las que falten en vez de rechazar.
- **Módulos retirados y stats huérfanas:** se cargan sin error, se conservan en el estado y no se usan. Test: guardar con un módulo de prueba, cargar sin él, jugar, volver a cargar con él y ver su estado intacto.
- **Partidas de referencia** en `tests/partidas/` (texto JSON real de la versión actual): recién empezada, a los 60 días con club y carreras, y a los 400 días. Un test las carga con el código nuevo, juega una semana y comprueba invariantes, que no se pierde nada (stats, personas, membresías, resultados) y que vuelve a guardar y cargar igual. Cada fase posterior añade la suya.
- **Regla nueva en `CLAUDE.md`:** cambiar la forma del estado exige migración y partida de referencia; ya no se sube la versión para descartar.
- Sin cambios de juego: `sim` idéntico.

### Fase 1 — El deporte practicado (la puerta) y cambiar de deporte

Con solo el atletismo, al acabar esta fase **el jugador ya puede dejarlo y volver cuando quiera**.

- **Módulo nuevo `deportes`:** guarda el deporte practicado y el historial (`{ deporte, desde, hasta }`). Publica el servicio `practica` (`practica(id)`, `actuales()`, `historial()`) y escucha los eventos compartidos nuevos `deporte.empezar` y `deporte.dejar` (los emite quien ofrece la acción; el módulo valida el límite de un deporte).
- **Ocultar lo que no se practica:** campo genérico del motor `ActionDef.oculta(ctx)` (no sale ni en gris; distinto de `available`, que la enseña en gris con el motivo) y una ayuda en contracts, `soloSiPractica(deporte, acciones)`, del estilo de `ligarALugares`. Los manejadores diarios del deporte no hacen nada si no se practica y su pestaña se marca como no practicada.
- **Atletismo se pone detrás de la puerta.** Acciones nuevas «Empezar atletismo» y «Dejar el atletismo» en la administración del colegio (dejarlo también sale del club).
- **Nueva partida:** el formulario gana «Deporte» (solo atletismo, como hoy el país); el motor pasa las opciones a los módulos (`CreateOptions.opciones` → `InitContext.opciones`, genérico). Por defecto, atletismo.
- **Partidas en curso:** el estado de `deportes` no existía, así que se crea al cargar. **Se practica el atletismo**, que es lo que tenían todas. Sin migración de otros módulos.
- **Simulación:** los bots empiezan practicando atletismo (mismas cifras). El bot «abandona el deporte» pasa a dejarlo de verdad a las 8 semanas: cambian sus cifras, y el chequeo de la caída debe seguir dentro de lo esperado.

### Fase 2 — Aportes: que un módulo sepa qué deportes hay sin conocerlos

- **Motor:** `GameModule.aportes` (datos declarados para un punto de extensión con nombre, p. ej. `'clubes.secciones'`) y `ctx.aportes<T>(clave)` para leerlos. El registro los junta al arrancar. El motor no sabe qué contienen.
- **Lista de deportes instalados:** cada deporte aporta su ficha (`'deportes.catalogo'`: id, nombre, dónde se empieza). `deportes` la usa para ofrecer «Empezar…» de todos los instalados y la interfaz, para el formulario de nueva partida. `familia` puede sortear el deporte de los padres de esa lista (lo que ya practicaron en partidas en curso se respeta).
- Sin cambios de estado ni de juego: `sim` idéntico.

### Fase 3 — Clubes por deporte

- `ClubView` pasa de un horario por club a **secciones por deporte** (horario, acceso, sede y trámites de cada una). El catálogo de clubes (entidades: colegio, clubes de la ciudad) sigue en `clubes`; **las secciones las aporta cada deporte** (`'clubes.secciones'`). El atletismo aporta exactamente lo de hoy.
- Si un deporte se retira, sus secciones desaparecen; una membresía guardada de un deporte no instalado se conserva sin efecto.
- El modificador de calidad del club y los eventos `club.*` no cambian. El estado de `clubes` (membresías por deporte) no cambia de forma: no hace falta migración.
- `sim` idéntico.

### Fase 4 — La gente de cada deporte

La parte más delicada: hoy `npcs` genera a mano a los rivales, los entrenadores, el equipo del colegio y los hermanos de atletismo.

- **Especificación de población como dato** que aporta cada deporte (`'npcs.poblacion'`): etiqueta, edades, cuántos por edad, de qué capacidades sale su potencial y con qué aptitud, clubes, entrenadores por club y edades, sesgo de carácter e intereses, alumnos del colegio que lo practican. `npcs` genera con ella; el atletismo aporta la suya con los números de hoy.
- **Misma gente con la misma semilla:** el atletismo se genera en el mismo orden y con el mismo azar que hoy (el `sim` debe dar lo mismo). Cada deporte nuevo se genera **después y con su propio azar estable** (`rngEstable` por deporte), como ya se hizo con bibliotecarios y entrenadores de clubes.
- **Deporte instalado después de empezar la partida:** `npcs` guarda qué poblaciones ha generado (`poblaciones: ['atletismo']`) y al cargar crea las que falten. Así una partida en curso recibe la gente del deporte nuevo sin tocar la que ya tiene.
- **Retirar un deporte:** su gente sigue existiendo (son personas con relaciones), deja de competir y su descripción pasa a «Hacía…».
- **Generalizar lo que suponía atletismo:** `aptitudDe('deporte')` mira el nivel del deporte de la actividad; los hermanos eligen deporte de los instalados (los de partidas en curso conservan el suyo); `relaciones` y `npcs` leen de `competicion.resultado` quién ha quedado por delante sin suponer que menos marca es mejor (campo `mayorEsMejor` o puesto de cada participante, opcional para que el atletismo no cambie).
- **Partidas en curso:** migración de `npcs` que añade `poblaciones: ['atletismo']` y, si hace falta, las etiquetas nuevas a su gente.

### Fase 5 — El kit de deporte y el atletismo encima

- **Paquete `packages/kit-deporte` (`@ds/kit-deporte`)**: lo común de cualquier deporte con club y entrenador, sacado del atletismo: habilidades y conocimiento, acciones de club (apuntarse, prueba, plaza, dejar), sesión con llegada tarde, pedir consejo, categorías y subir de categoría, sobrecarga, verano, tele y conocimiento de crianza. No tiene estado ni es un módulo: trabaja con el estado del deporte que lo usa (`EstadoBaseDeDeporte`, con **los mismos nombres de campo que ya usa el atletismo**, para no migrar nada).
- **Cambia la regla 1:** los módulos pueden importar `@ds/contracts` y `@ds/kit-deporte`; el kit solo `@ds/contracts`. `tests/arquitectura.test.ts` lo vigila.
- **El atletismo se reescribe sobre el kit** sin cambiar ids, textos ni el orden del azar: `sim` idéntico y las partidas de referencia cargan igual.

### Fase 6 — Validación: un deporte de prueba y la simulación multideporte

- **Deporte de prueba** que solo existe en los tests (p. ej. `deporte_prueba`, unas 100 líneas con el kit). Demuestra que un deporte se pone **sin tocar nada fuera de su módulo y de `modulos.ts`** y que todo funciona: añadirlo a una partida guardada en curso, empezar a practicarlo, ganar club y gente, dejarlo, quitarlo del juego y cargar la partida, y volver a ponerlo.
- **Simulación:** cada bot elige deporte al empezar; `analysis.ts` mide el deporte de cada bot, no el atletismo fijo; bot nuevo que **cambia de deporte** a mitad de curso con chequeos propios (lo dejado cae dentro de lo esperado, lo nuevo progresa, nada se rompe). `sim:vida` también puede cambiar de deporte.
- **Documentación:** `ARQUITECTURA.md` (niveles, aportes, kit, migraciones), `ANEXO_DEPORTE.md` (cambiar de deporte), `CLAUDE.md` (reglas nuevas y checklist «Al añadir un deporte»).

**Después de la fase 6 empieza el fútbol** (diseño en `ANALISIS_FUTBOL.md`), que debería tocar solo `modules/futbol`, `modulos.ts`, los datos del mapa y las agendas.

## 4. Resumen

| Fase | Qué deja hecho | Partidas en curso | `sim` |
|---|---|---|---|
| 0 | Migraciones por módulo, módulos retirados sin error, partidas de referencia | Se cargan (se acaba descartar por versión) | Idéntico |
| 1 | Deporte practicado, ocultar lo no practicado, dejar y volver al atletismo, deporte en la nueva partida | Practican atletismo | Idéntico (salvo el bot que abandona) |
| 2 | Aportes en el motor y catálogo de deportes instalados | Sin cambios | Idéntico |
| 3 | Clubes con secciones por deporte | Sin migración | Idéntico |
| 4 | Población de cada deporte por datos; deportes nuevos llegan a partidas en curso | Migración de `npcs` | Idéntico |
| 5 | Kit de deporte y atletismo sobre él (cambia la regla 1) | Sin migración | Idéntico |
| 6 | Deporte de prueba, bots multideporte y cambio de deporte | Probado con partidas de referencia | Nuevos chequeos |

Orden: 0 primero porque protege todo lo demás; 1 justo después porque ya cumple el objetivo (cambiar de deporte) con lo que hay; 2–5 sueltan los nudos de uno en uno, del más pequeño al más grande; 6 lo demuestra. Las fases 3 y 4 tocan `clubes`, `npcs` y `relaciones`, que comparten otras líneas de trabajo: conviene hacerlas en PR cortos y fusionarlos pronto.

## 5. Para decidir

1. **¿Se acaba ya la política de descartar partidas por versión** (fase 0), o solo se mantienen compatibles las partidas a partir de ahora?
2. **¿Un deporte a la vez** de momento (la estructura admite varios)?
3. **¿Reglas de cambio de §2** (sin coste, se conserva todo, se puede volver; se sale del club)?
4. **¿Kit de deporte** con el cambio de la regla 1 (fase 5)?
