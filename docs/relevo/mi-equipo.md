# Relevo: «Mi equipo» y habilidades por grupos (rama `claude/mi-equipo`, sale de `claude/youthful-clarke-vs0kye`)

Encargo del usuario (21/11/2026, `DECISIONES.md` «“Mi equipo” para el niño» y «Detalles al jugar…»; **no he tocado `DECISIONES.md`**). Sin pull request. Reglas y cifras: `ANEXO_DEPORTE.md` («“Mi equipo” y las habilidades por grupos»).

## 1. Qué hay

**Contratos (`packages/contracts`)**, todo genérico: la web no sabe de fútbol.
- `DeporteView.miEquipo?: MiEquipoView` (título «Equipo B · club», texto y `companeros: CompaneroDeEquipo[]` con `nombre?` solo si lo conoces, `aspecto`, `puesto?` solo si le has visto jugar).
- `DeporteView.gruposDeHabilidades?: GrupoDeHabilidades[]` (título + ids): el grupo es un dato del deporte. Sin él, las habilidades salen seguidas (atletismo no cambia).
- `comparacion.ts`: servicio `comparacion.<deporte>` (`ComparacionService.sobre(npcId)`), como `conversacion.<id>`: la ficha de Gente pinta «Comparado contigo» sin saber de qué deporte es.
- `aspectoDe(n)` (en `services.ts`): la descripción por aspecto de Gente, ahora compartida (antes era una función local de `gente.ts`; `gente.ts` sigue con la suya, no la he tocado).

**Fútbol (`modules/futbol`)**
- `mi-equipo.ts`: reglas puras de la percepción (con tests). `index.ts`: `verACompaneros`/`verElEntrenamiento` (al terminar `futbol.club_sesion` y al registrar un partido del personaje), `miEquipoDeFutbol`, `comparacionDeFutbol`. `habilidades.ts`: `GRUPOS_DE_HABILIDADES` (Portería, Físico, Mental, Técnico y Conocimiento aparte).
- Estado nuevo: `FutbolState.companeros?: Record<npcId, [puesto, diferencia, veces, semana]>`.

**Web (`apps/web`)**: `deporte.ts` (subpestañas «<Deporte> | Mi equipo» si el deporte publica `miEquipo`; habilidades por grupos con `<h4>`), `gente.ts` (`bloqueDeComparacion`, bajo el resumen de la ficha), `main.ts` (el clic de la subpestaña). Sin CSS nuevo: las subpestañas usan `filtros-gente`.

## 2. Cómo se calcula la percepción (decisión mía, a revisar)

- **Qué se compara:** lo que vale cada uno **en su puesto** de la plantilla (`JugadorDeEquipoView.valor`, 0–100; el del personaje, el suyo con su pierna). Es «cómo de buen jugador es en lo suyo», sin mezclar un portero con un delantero en un puesto que ninguno juega.
- **Con error:** a cada vistazo se le suma un ruido normal de desviación **8 puntos** sin conocimiento de fútbol y **3** con el conocimiento a tope (interpolado); el ruido sale de (compañero, día) con `rngEstable`: es el mismo si se vuelve a mirar el mismo día y cambia de un día a otro, y no toca el azar de la partida.
- **Se afina:** se guarda la **media** de lo estimado (hasta 8 vistazos; luego cada uno pesa 1/8). Los entrenamientos (2 por semana) lo van acercando a la realidad; con un solo vistazo se puede equivocar.
- **Umbral:** «parecido» si la diferencia media está a menos de **5 puntos** (`PARAMETROS_DE_PERCEPCION.parecido`); si no, mejor o peor. Se muestra «Crees que eres mejor/peor que él/ella» o «Crees que jugáis más o menos igual de bien»; nunca números.
- **Qué desbloquea ver a alguien:** una sesión del club (todos los de tu equipo no lesionados, en el puesto de su plantilla) o un partido en que estás convocado (los que salieron al campo, en el puesto en que jugaron). Es permanente: aunque cambien de equipo o puesto, lo que viste queda como lo viste.
- **Tamaño:** ~30 bytes por compañero y máximo 60 (`guardados`; se olvidan los vistos hace más): < 2 KB. Lo mido con el test (`< 4000` caracteres con 60) y con `npm run presupuesto -- --peso` (ver §4).

## 3. Decisiones de diseño que he tomado (no estaban en el encargo)

1. **La tabla «Plantilla · equipo»** de la pestaña (nombres, minutos, goles, nota) enseñaba **todos los nombres y todos los puestos**: contradecía el encargo. He aplicado la misma regla (nombre solo de quien conoces, si no su aspecto; puesto «—» hasta verle jugar). Es lo único que he tocado fuera de lo nuevo en `seccionesDeLaTemporada`.
2. **Los puestos siguen siendo de la plantilla, no «dónde jugó el sábado»**, al entrenar; en un partido, el puesto en que jugó de verdad. Siempre queda el último visto.
3. **Quien está lesionado no entrena** (no se le ve en la sesión).
4. **Lo que NO he tocado y también filtra nombres de desconocidos:** la crónica del partido (`nombres` de `cronicaDelPartido`: goles, ocasiones, cambios, con el nombre de todos), el log del juego, y las listas de goleadores. Para el niño deberían salir por aspecto o por camiseta hasta conocerlos. Es un cambio mayor (el motor de partidos y la crónica guardada), **para decidir**.
5. **Desde «Mi equipo» no se puede abrir la ficha** (los desconocidos solo se ven en Gente cuando los tienes cerca). Un enlace de la fila a la ficha es fácil si hace falta; en Gente, «Compañeros» solo lista a los que conoces.
6. **Se compara también con quien no conoces** si le has visto jugar: en su ficha (que solo abres cuando está cerca) sale la comparación debajo de su descripción.

## 4. Pruebas y mediciones

- `modules/futbol/src/mi-equipo.test.ts` (percepción pura y grupos), `tests/mi-equipo.test.ts` (partida de ciudad de prueba: equipo con letra y club, sin nombres de desconocidos en ninguna parte de la vista, puesto y comparación tras entrenar, plantilla coherente), `apps/web/src/deporte.test.ts` (la subpestaña).
- Capturas (Playwright, Chromium, deviceScaleFactor 1, ciudad grande, semilla 35; `tools/capturas-mi-equipo.ts`): en `docs/relevo/mi-equipo/antes` (rama de partida) y `docs/relevo/mi-equipo/despues`. Para la captura se marca a 4 compañeros como conocidos (como si se hubiera presentado).
- Resultados de `typecheck`, `npm test`, `npm run benjamin -- 31,33`, `npm run probar-web` y `npm run presupuesto -- --peso`: ver §5.

## 5. Estado al entregar

(Se rellena al acabar las comprobaciones.)
