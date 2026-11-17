# Presentación de los sucesos, 2.ª parte (17/11/2026)

Encargo del usuario vía arquitectura: nombres legibles en modo «números» y aviso «no va contigo» en modo «normal». Rama `claude/sucesos-presentacion-2`.

## Qué hay

1. **Números con nombres** (`modules/sucesos/src/index.ts`, `pistaDe`): cada estadística sale con `ctx.statDef(id).name` («Estrés −1», «Energía −2», «entrena Cooperación»); la relación, con el nombre de la persona del papel («relación con Lucas: afinidad +3»; antes salía el papel crudo). Los negativos llevan el signo menos «−». Si una stat no tiene definición, cae al id.
2. **Aviso «no va contigo»**:
   - Contrato: `OpcionPendiente.ejeEnContra?` (nombre del eje, p. ej. «sociabilidad»). El director lo rellena en las opciones elegibles que chocan con el carácter, que solo pasa con `fueraDeCaracter: 'normales'` (sombreadas/ocultas ya llevan su motivo o no salen). No cambia la config ni el estado.
   - Web (`apps/web/src/presentacion.ts`, `main.ts`): `Preferencias = Presentacion + avisoFueraDeCaracter` (por defecto `true`), en la misma clave de `localStorage`. Casilla en Opciones («Avisar “no va contigo” en las opciones normales»), deshabilitada si el modo no es «normales». La función `avisoDeCaracter` decide el texto («No va contigo (sociabilidad)», cursiva, atenuado). Cambiar solo la casilla **no rehace la partida** (no llega al motor). Elegir la opción mueve el carácter igual que antes.
3. **Tests**: `modules/sucesos/src/index.test.ts` (nombres con números; `ejeEnContra` solo en normales y la pista no cambia), `apps/web/src/presentacion.test.ts` (preferencia por defecto y leída, aviso por modo y casilla, que el aviso no cambia el estado de la partida).
4. **Docs**: tabla de presentación de `docs/ANEXO_EVENTOS.md`.

`npm run typecheck`, `npm test` (90 archivos, 1083 pruebas) y `npm run eventos:validar` en verde.

## Capturas (`docs/relevo/`, Chromium, deviceScaleFactor 1, «Un juego nuevo en el patio» forzado con sociabilidad −45)

- `suceso-presentacion2-ventana-pistas-normales-aviso.png`: la ventana del suceso, pistas en palabras, «Apuntarte» con «No va contigo (sociabilidad)» y «Le va a gustar».
- `suceso-presentacion2-pistas-normales-aviso.png` / `vuelta-a-pistas-normales`: lo mismo en la lista «Pendiente».
- `suceso-presentacion2-numeros-normales-aviso.png`: números con nombres + aviso.
- `suceso-presentacion2-numeros-normales-sin-aviso.png`: números, aviso desactivado.
- `suceso-presentacion2-numeros-sombreadas.png`: sombreadas (sin cambios: motivo en lugar de aviso).

## Dudas / notas para la arquitectura

1. **Consecuencias que no se muestran con números**: `pistaDe` solo enseña `estado`, `relacion`, `entrena` y `restriccion`. No salen `estadoDeJugador`, `familia`, `caracter`, `modificador` ni `marca`/`programa`. Ninguna se muestra hoy con id crudo, así que no hay nada sin nombre legible, pero si se quieren enseñar con números habrá que decidir su nombre (p. ej. `estadoDeJugador` no es una stat del registro). Los efectos dentro de `si/entonces` tampoco se recorren.
2. **Dinero**: es la stat `gen.dinero` con nombre «Dinero»; sale como «Dinero −5». Los números no llevan unidad (€); no lo he cambiado.
3. **Opción «Proponer un cambio…»** de la captura sale «No cumples lo que hace falta» (requisito de carisma): comportamiento existente, no tocado.
4. **Casilla deshabilitada** en sombreadas/ocultas (en vez de ocultarla): decisión de UI mía; si se prefiere ocultarla, es una línea.
5. **Texto del aviso**: «No va contigo (sociabilidad)», el mismo que el de las sombreadas, para no tener dos textos. Si se prefiere más corto («no va contigo» sin eje), es solo `avisoDeCaracter`.
6. La web sigue sin tocar `DECISIONES.md` (lo junta la arquitectura).
