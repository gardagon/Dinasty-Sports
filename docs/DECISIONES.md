# Registro de decisiones

Lo que se decidió y por qué, para que cualquier sesión futura (persona o IA) tenga el contexto.
Añade una entrada nueva al principio cuando tomes una decisión de diseño o de balance.

---

## 17/10/2026 — Ampliar características (decisiones previas)

Se estudian los documentos de diseño de la versión Godot para enriquecer al personaje. No es una migración: es un catálogo adaptable. Backlog en `BACKLOG_STATS.md`.
- **Ids en español**, sin adoptar la regla de ids en inglés del original.
- **`trabajo_equipo` se elimina** (choca con una habilidad del fútbol) y se sustituye de forma provisional por `cooperacion`.
- **`memoria` → `inteligencia`** y **`disciplina` → `determinacion`**; se añaden constitución, agilidad, resiliencia, atención, creatividad, comunicación, autoridad, empatía y picardía.
- **El rendimiento académico se queda en `estudios`**, no es stat global.
- **Implementado E1.1 y E1.2:** 19 genéricas en total (6 físicas, 6 mentales, 6 sociales con `cooperacion` provisional) y 4 de estado. El modificador `gen.disciplina` pasa a `gen.determinacion` con el mismo efecto (menos coste de energía en entrenar y estudiar).
- **Simulación antes/después:** los 11 chequeos siguen en verde. Las medias "Global", "Mental" y "Social" bajan unos 5–10 puntos porque los 11 stats nuevos aún no se entrenan ni influyen en nada (se conectan en E1.4); no es un cambio de balance. Estudios y atletismo apenas varían (±1 punto).
- `constitucion` no tiene aún forma de subir (se forjará con hábitos, E3).

---

## 17/10/2026 — Base del proyecto

### Diseño de juego
- **RPG de decisiones**, no de acción. Un personaje en edad escolar estudia, practica un deporte y se relaciona.
- **El tiempo es de juego, no real.** Cada acción declara su duración en minutos de juego. La partida empieza un lunes a las 7:00.
- **Primer deporte: atletismo (400 m)**, elegido por ser el más sencillo de modelar (individual, sin posiciones ni tácticas). Es la plantilla para los siguientes deportes.
- **NPCs desde el MVP**, aunque sencillos. Dan profundidad y ya tienen utilidad: con afinidad ≥ 40 mejoran las acciones con las etiquetas que apoyan. Tienen género para concordar los textos.
- **Plataforma objetivo:** móvil, con versión web/PC. Interfaz web mobile-first, empaquetable con Capacitor más adelante.

### Técnica
- **TypeScript** en monorepo con npm workspaces. Un único lenguaje para motor, interfaz, tests y simulación.
- **Regla de oro:** un módulo solo importa `@ds/contracts`. Lo vigila `tests/arquitectura.test.ts`.
- **Unificadores** para que dividir mucho no implique lentitud: registro compilado, pipeline único de acciones, modificadores por etiquetas, eventos compartidos y servicios. Detalle en `ARQUITECTURA.md`.
- **Guardado:** un único JSON. Las stats y los módulos nuevos se inicializan solos al cargar una partida antigua.
- **Azar determinista** con semilla guardada, para que tests y simulaciones sean reproducibles.
- **Recursos (`resource: true`):** solo la energía cuenta como coste que bloquea acciones. Antes cualquier delta negativo bloqueaba, y bajar el estrés cuando ya estaba a 0 impedía descansar; lo detectaron los tests.

### Rendimiento
- Los contextos de lectura se crean una vez por módulo y se reutilizan: de 0,66 ms a 0,11 ms por acción.
- Referencia actual: un año simulado tarda unos 200 ms.

### Balance (primer ajuste con la simulación)
Problemas detectados por los bots y cómo se corrigieron:

| Problema | Ajuste |
|---|---|
| Progresión demasiado rápida (+72 de atletismo en un año, podio en 51 de 52 carreras) | Ritmo de habilidades 1 → 0,5 y de genéricas 0,6 → 0,3 |
| Estrés siempre a 0 y salud siempre a 100, incluso sobreentrenando | Dormir baja menos el estrés; estudiar y competir lo suben más; entrenar con sobrecarga resta salud y puede causar molestias |
| Ir a clase sin estudiar ya subía mucho las asignaturas | La clase entrena 0,5 por asignatura (antes 1) |
| Podio trivial: solo 3 rivales NPC | Carreras de 8 corredores (NPCs + rivales genéricos de relleno) |
| La salud baja solo afectaba a lo físico | Ahora reduce el rendimiento de todo |
| Bot empollón quemado (estrés 90, salud 0) | Era el bot: hacía ocio solo después de estudiar. Se corrigió el bot, no el juego. Conclusión válida: estudiar sin descanso es contraproducente |

Resultado: los 11 chequeos de sentido del juego en verde. Resumen del año simulado:
- El equilibrado tiene la mejor puntuación global.
- Cada especialista gana en lo suyo.
- Sobreentrenar rinde un 14 % menos y deja la salud en 2.
- El vago queda último.
- Dejar el deporte cuesta un 29 %.

---

## Pendiente e ideas

- **Consecuencias de la salud muy baja:** ahora el bot que sobreentrena llega a salud 0 sin más castigo que rendir menos. Idea: lesión o baja médica que bloquee entrenar unos días.
- **Segundo deporte:** validará que la plantilla de deporte funciona sin tocar el motor.
- **Más vida para los NPCs:** eventos, conversaciones, rivalidades.
- **Beca deportiva:** usar el servicio `estudios` (nota media) desde un deporte.
- **Publicar la web:** activar GitHub Pages (Settings → Pages → Source: GitHub Actions).
- **App instalable en el móvil:** añadir manifiesto web (pantalla de inicio) y, más adelante, Capacitor.
- **Acciones de GitHub:** actualizar versiones cuando GitHub retire Node 20 en los runners (ahora sale un aviso, no un error).
