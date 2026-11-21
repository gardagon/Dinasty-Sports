# Presentación de los sucesos desde «Opciones» (17/11/2026)

Encargo: punto 2 de `PLAN_EVENTOS.md` §7 ter. Elegir en la pantalla de Opciones de la web cómo se presentan los sucesos, sin cambiar los valores por defecto.

## Qué hay

- Dos selectores en «Opciones» (con partida, en la ventana; y en la pantalla de Opciones del menú, antes de jugar):
  - **Consecuencias antes de elegir**: `pistas` (en palabras, por defecto), `numeros`, `nada`.
  - **Opciones que no van con tu carácter**: `normales` (por defecto), `sombreadas` (con el motivo), `ocultas`.
- `apps/web/src/presentacion.ts`: la preferencia (leer/escribir en `localStorage`, saneada, sin romper si el navegador lo bloquea) y `moduloDePresentacion`, un módulo **sin estado** que solo aporta `sucesos.config` (`presentacion.consecuencias` y `fueraDeCaracter`). Con los valores por defecto no aporta nada.
- `apps/web/src/main.ts`: la web siempre añade ese módulo a `modulosActuales`; al cambiar un selector se guarda la preferencia y se **rehace la partida en marcha** con `cargarPartida(game.serialize(), …)`, como ya hace «añadir/quitar deporte». El estado no cambia.
- Tests: `apps/web/src/presentacion.test.ts` (valores por defecto, lectura saneada, almacenamiento bloqueado, que llega a `sucesos.config()` y que el estado guardado es idéntico).

## Capturas (`docs/relevo/`, Chromium, suceso «Un juego nuevo en el patio» forzado desde Diario)

Con el carácter puesto a sociabilidad −45 para que «Apuntarte» (+2 de sociabilidad) no encaje:

- `suceso-ventana-pistas-normales.png` y `suceso-pistas-normales.png`: pistas en palabras, todo normal («Le va a gustar»).
- `suceso-numeros-sombreadas.png`: cifras («gen.estres -1») y «Apuntarte» sombreada con «No va contigo (sociabilidad)».
- `suceso-pistas-sombreadas.png`, `suceso-pistas-ocultas.png` (desaparece «Apuntarte»), `suceso-nada-normales.png`.
- `opciones-*.png`: la pantalla de Opciones con cada combinación.

Se cambió el modo con el suceso ya pendiente y se vio la lista «Pendiente» actualizada al instante; tras recargar la página la elección se mantiene.

## Notas y preguntas para la sesión de arquitectura

1. **Preferencia del navegador, no de la partida.** Se guarda como la frecuencia de guardado (fuera de la partida), una sola para todas las partidas. Si se prefiere por partida o dentro del guardado, es un cambio pequeño: dilo.
2. **Módulo `presentacion` en la web.** La config se lee al construir el registro (aportes estáticos), por eso hay que rehacer la partida al cambiar. Alternativa si molesta recargar: que el director leyera la config de un servicio mutable (toca `modules/sucesos`; no lo he hecho por «sin cambios de diseño»). El módulo no guarda estado, pero su id aparece en la lista de módulos del registro de esas partidas.
3. **Textos de las pistas/números en pruebas**: con `numeros` sale el id crudo de la stat («gen.estres -1»). Es lo que da el motor hoy; si se quiere con el nombre legible, es cosa del módulo `sucesos`/la web (pendiente de decisión).
4. **Pista «Le va a gustar» para una opción que no encaja con el carácter** en modo `normales`: es el comportamiento actual de `pistas`; solo lo anoto por si se quiere avisar también ahí.
5. No he tocado `docs/DECISIONES.md` ni `docs/PLAN_EVENTOS.md`, ni `docs/ANEXO_EVENTOS.md` (la tabla de §4 sigue valiendo; podría añadirse una línea diciendo que la web lo ofrece en Opciones).
