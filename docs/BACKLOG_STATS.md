# Backlog — Stats, habilidades, personalidad y perks

Origen: documentos de diseño del proyecto Godot (`design_stats_personality_system.md` v0.2 y
`cambios_tecnicos_arquitecto_equipo1.md`). **No es una migración 1:1**: es un catálogo de lo que
habría que cambiar para adoptar ideas de ese diseño en este motor. Cada épica indica cuánto
conviene respetar el original (**Fidelidad**) y debe revisarse antes de empezar (ver al final).

Leyenda de estado: 🟢 listo para empezar · 🟡 necesita decisión · ⏸ diferido (depende de algo que no existe) · ❌ descartado

## Decisiones ya tomadas (17/10/2026)

- Ids en **español** (`gen.fuerza`). La regla de ids en inglés del documento original no se adopta.
- `trabajo_equipo` se elimina (choca con una habilidad técnica del fútbol). Se sustituye de forma **provisional** por `cooperacion`.
- `memoria` → `inteligencia`; `disciplina` → `determinacion`. El resto de cambios del documento de stats se aceptan.
- `rendimiento_academico` **no es stat global**: lo gestiona el módulo `estudios` (regla 4 y 5 del `CLAUDE.md`).

## Estado de partida (hoy)

9 genéricas (fuerza, resistencia, velocidad, coordinación / concentración, memoria, disciplina / carisma, trabajo en equipo)
y 4 de estado (energía, salud, estrés, motivación). Usos de las que cambian: `disciplina` (atletismo ×2, estudios ×2,
personaje ×2 incluida la acción `gen.disciplina`), `memoria` (estudios ×3, personaje ×1), `trabajoEquipo` (estudios ×1, npcs ×1).

---

## E1 · Genéricas ampliadas — 🟢 · Fidelidad: alta

Lista objetivo (17 + 1 provisional; el documento dice "20" pero suma 6+6+5+1 = 18 con el académico):

| Grupo | Stats |
|---|---|
| Físicos (6) | velocidad, fuerza, resistencia, **constitucion**\*, **agilidad**\*, coordinacion |
| Mentales (6) | **inteligencia**\*, concentracion, **determinacion**\*, **resiliencia**\*, **atencion**\*, **creatividad**\* |
| Sociales (5+1) | carisma, **comunicacion**\*, **autoridad**\*, **empatia**\*, **picardia**\*, **cooperacion** (provisional) |

\* nuevo o renombrado.

| ID | Tarea | Notas |
|---|---|---|
| E1.1 | Añadir los ids nuevos a `GEN` (contracts) y declararlos en `modules/personaje` con descripción en español | Concordar textos; `constitucion` no se entrena directamente (ver E3) |
| E1.2 | Renombrar `memoria→inteligencia`, `disciplina→determinacion`, `trabajo_equipo→cooperacion` en atletismo, estudios, personaje, npcs y tests | Revisar la acción `gen.disciplina` de personaje: ¿se renombra o se mantiene como hábito? 🟡 |
| E1.3 | Decidir si los renombrados migran partidas guardadas o se rompe compatibilidad | Aún no hay partidas publicadas → recomendado romper |
| E1.4 | Reenganchar `speedFrom` y `cap.from` de atletismo y estudios a los stats nuevos | Depende de la tabla global→técnico (E2.4), que en el original está **pendiente** |
| E1.5 | Ajustar el decay por categoría: mentales sin decay práctico, sociales por falta de interacción, físicos los más sensibles | Ahora todos decaen por días sin practicar. Ver E2.6 |
| E1.6 | Mostrar los grupos nuevos en la web y en los tests de "carga solo con `gen`" | `apps/web/src/main.ts` |
| E1.7 | `npm run sim` antes y después; documentar en `DECISIONES.md` | Sin estas conexiones los nuevos stats serían decorativos: no cerrar E1 sin E1.4 |

## E2 · Estructura de habilidades — 🟡 · Fidelidad: media

El original usa tres capas: stats globales → conocimiento deportivo → habilidades técnicas.

| ID | Tarea | Notas |
|---|---|---|
| E2.1 | Subtipos de habilidad: entrenable / derivada (calculada de otras) / oculta (solo el motor) | Hoy solo hay `habilidad` plana. ¿Hace falta ya con un solo deporte? 🟡 |
| E2.2 | "Valor efectivo": la habilidad se multiplica por sus secundarias globales (×1,2 cada una) al competir | Hoy las globales solo afectan a ritmo y techo de crecimiento. Decidir si se sustituye o se suma 🟡 |
| E2.3 | **Conocimiento deportivo** por deporte como segundo techo: `techo = min(límite genético, conocimiento × 1,2)`. Sube por competir (principal), entrenar con táctica (secundario) y estudio pasivo × inteligencia | Para atletismo habría que definirlo (¿táctica de carrera?). Diseñar la plantilla de deporte antes de tocar atletismo 🟡 |
| E2.4 | Tabla global → habilidad técnica (qué stat alimenta qué habilidad) | Sección 12 del original: **pendiente allí**. La diseñamos aquí para atletismo y estudios |
| E2.5 | Transferencias de entrenamiento (global→técnica 10–20 %, técnica→relacionada 15–25 %, técnica→global 3–5 %) declaradas en datos | Respetar la regla 4: se haría con `ctx.train`, nunca tocando habilidades de otro módulo |
| E2.6 | Decay con multiplicador por inactividad semanal (con techo) y velocidad según edad | Requiere decidir si el personaje tiene **edad** (E3.1). Hoy: caída diaria tras N días de gracia |
| E2.7 | Límite genético por stat (oculto) y multiplicador de ganancia por cercanía: ×1 (<80 %), ×0,5, ×0,2, ×0,05 (>95 %) | Equivale a un `cap` por personaje en vez de por stat. Sin padres, se generaría al crear la partida |
| E2.8 | Modificador de energía en la competición (70–100 % ×1, … 0–9 % ×0,3) | Contrastar con la eficiencia por energía que ya existe antes de duplicar |

## E3 · Identidad y cuerpo — 🟡 · Fidelidad: media

| ID | Tarea | Notas |
|---|---|---|
| E3.1 | Edad, altura (hacia objetivo genético), peso, dominancia lateral | El juego empieza con edad escolar; ¿se avanza la edad en el año simulado? 🟡 |
| E3.2 | Tipo corporal (delgado, normal, atlético, musculado, con sobrepeso) derivado de hábitos acumulados, con modificadores de velocidad, fuerza y constitución | Necesita registrar hábitos de entrenamiento, descanso y **alimentación** (esta última no existe) |
| E3.3 | Constitución: sube solo por hábitos sostenidos, no por entrenamiento directo | Condiciona lesiones y recuperación; enlaza con la idea de lesión pendiente en `DECISIONES.md` |
| E3.4 | UI filtrada por inteligencia (5 niveles, de sensaciones vagas a "top 10 %") y pistas precisas del entrenador con buena relación | Cambia la web y se apoya en `npcs` (servicio ya existente) |

## E4 · Ejes de personalidad — ⏸ · Fidelidad: alta en concepto, baja en mecánica

Ocho ejes de −50 a +50: disciplinado↔rebelde, honesto↔manipulador, ambicioso↔satisfecho, relajado↔sacrificado, solitario↔sociable, calmado↔agresivo, temerario↔prudente, optimista↔pesimista. Nunca se muestran como número.

| ID | Tarea | Notas |
|---|---|---|
| E4.1 | Estado de los ocho ejes en `personaje` y servicio para consultarlos | JSON serializable (regla 5) |
| E4.2 | Tres modos de inicio: personalizado (reparto de puntos), equilibrado, aleatorio | Aleatorio exige que ningún extremo sea trampa |
| E4.3 | Las decisiones mueven los ejes y **abren o cierran opciones** (`available`) | Necesita un sistema de decisiones/eventos que hoy no existe → bloquea el resto |
| E4.4 | Efectos cruzados con stats (p. ej. pesimismo reduce el efecto de determinación) | Mediante modificadores por etiqueta, sin importar entre módulos |
| E4.5 | Test de "ningún extremo es trampa" en la simulación (bots por perfil) | Encaja con `sim/` |

## E5 · Perks — ⏸ · Fidelidad: media

29 perks (14 pares + ambidiestro), latentes hasta que un evento los activa. Máximo 2–3 activos.

| ID | Tarea | Notas |
|---|---|---|
| E5.1 | Estado `perks_active` / `perks_latent` (y `perks_inherited_pool` solo si hay dinastía, E8) | Sin hijos, el pool no se usa |
| E5.2 | Elegir un subconjunto para empezar (p. ej. los que afectan a stats que ya existen) | Muchos perks dependen de deportes de equipo o de porteros |
| E5.3 | Eventos de revelación | Depende del sistema de eventos (ver E4.3) |
| E5.4 | Bonus de perk sobre el límite genético: `techo = min(100, límite + bonus)` | Depende de E2.7 |

## E6 · Académico — 🟡 · Fidelidad: baja

| ID | Tarea | Notas |
|---|---|---|
| E6.1 | Revisar si la nota media de `estudios` cubre "rendimiento académico" (0–100) | Se publica ya como servicio `estudios` |
| E6.2 | Evaluación trimestral con consecuencias (semanas 12, 24, 36 en el original) | El calendario de este juego es de 365 días; hay que decidir el calendario escolar propio 🟡 |
| E6.3 | La inteligencia y la energía en clase influyen en el rendimiento | Entra con E1.4 |

## E7 · Competición de equipo — ⏸ · Fidelidad: baja

Posiciones (16), roles (42), experiencia por posición/rol con afinidad, fórmula de partido, normalización por categoría, `week_targets`. Todo depende de un **segundo deporte de equipo**. No se planifica hasta decidir cuál (idea ya recogida en `DECISIONES.md`). Lo reutilizable sin deporte de equipo: modificador de energía (E2.8).

## E8 · Dinastía — ⏸ · Fidelidad: baja

Padres con los stats globales, límites genéticos derivados de los padres (media × factor ± 15 %), herencia de perks con dos pools. Requiere diseñar el ciclo de generaciones, que este juego aún no tiene. E2.7 y E5.1 se escriben pensando en que luego encajen aquí.

## Transversal

| ID | Tarea |
|---|---|
| T1 | Una entrada en `DECISIONES.md` por cada decisión de diseño o de balance |
| T2 | Actualizar `ARQUITECTURA.md` cuando cambie la lista de genéricas o aparezcan servicios nuevos |
| T3 | Cada módulo nuevo o cambiado sigue cargando solo con `gen`; `tests/arquitectura.test.ts` debe seguir en verde |
| T4 | Tras tocar números: `npm run sim` antes y después y comparar chequeos |

## Dudas abiertas y contradicciones del original

- "20 stats" frente a 18 listados.
- El documento de cambios técnicos mantiene `mentality` y la sección 12 (tabla global→técnico) sigue pendiente.
- La lista de ejes aparece como "pendiente: validar los 4 propuestos" y a la vez como cerrada con 8.
- La sección 12 marca los límites genéticos como cerrados, pero la lista de pendientes los repite.
- La normalización por categoría necesita datos de NPCs que no existen (D-09 del original).
- Los 6 stats sociales cuentan `cooperacion` como provisional: revisar cuando se cierre el diseño del fútbol.

## Cómo comprobar que el backlog sigue siendo fiel

1. Antes de empezar una épica, releer su sección del original y anotar qué se mantiene, qué se adapta y qué se descarta.
2. Si algo se adapta o se descarta, apuntarlo en `DECISIONES.md` con el motivo y cambiar la fidelidad aquí.
3. Revisar el orden tras cerrar E1: probablemente E4 y E5 se desbloqueen juntas cuando exista un sistema de eventos.
4. Orden propuesto: E1 → E2 (2.3–2.5 y 2.7) → E6 → E3 → sistema de eventos → E4/E5 → E7/E8.
