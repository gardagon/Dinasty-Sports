# Relevo: retrato desvaído en el móvil (modo oscuro)

Rama `claude/retrato-movil` (sale de `claude/youthful-clarke-vs0kye`). Sin pull request.

## Resultado honesto: no se reproduce

Con Playwright (Chromium instalado), Pixel 5 a escala 2, `colorScheme: 'dark'`, fútbol instalado, ciudad grande, Personaje → «Ver evolución», **`main` se ve bien**: pelo castaño oscuro, tinta visible, colores plenos (`main-oscuro-movil-personaje.png`, `main-oscuro-movil-evolucion.png`). También con la rama (`rama-*`), en claro y oscuro, móvil y escritorio.

Descartado con el volcado de estilos calculados de todos los ascendientes del SVG (`tools/capturar-movil.ts`): `opacity: 1`, `filter: none`, `mix-blend-mode: normal` en todos. La pantalla «creando el mundo» se quita (no queda ningún `.velo`). El SVG del retrato tiene colores fijos (hex), sin variables CSS, `currentColor` ni `<filter>` (salvo la regla de la evolución), así que el tema oscuro de la web **no puede** cambiarlos.

Probado también con el «modo oscuro automático» de Chrome (CDP `Emulation.setAutoDarkModeOverride`) en tema claro y oscuro: oscurece la página, pero el SVG en línea queda intacto (`main-autodark-*.png`).

## Causa probable (no demostrada)

Lo que ve el usuario (tintas casi invisibles, pelo del color de la piel, tonos pastel) es lo que hace el **oscurecimiento forzado del navegador** (modo oscuro automático de Chrome Android o de Samsung Internet): aclara los colores oscuros del dibujo (tinta y pelo) y deja pasteles. Hacía falta que el navegador creyera que la página no trae modo oscuro: `index.html` **no declaraba `<meta name="color-scheme">`**. No puedo comprobarlo en un Android real; el emulador de Chromium no aclara el SVG.

## Qué se ha cambiado

- `apps/web/index.html`: `<meta name="color-scheme" content="light dark">` (la declaración con la que Chrome y Samsung Internet no vuelven a oscurecer la página).
- `style.css`: los SVG de retrato y evolución fuerzan `opacity: 1; filter: none; mix-blend-mode: normal; forced-color-adjust: none; color-scheme: light`.
- Tests: `retrato.test.ts` (la raíz del SVG no lleva opacidad, filtro ni estilo; sin `var(--`, `currentColor`, `<filter>`, `<style>` en el retrato) y `apps/web/src/tema.test.ts` (el meta y la regla CSS).
- La cuadrícula no cambia (el dibujo no se toca): no se regenera.
- `tools/capturar-movil.ts`: el script de las capturas (`npx tsx tools/capturar-movil.ts <carpeta> [oscuro|claro] [movil|escritorio]`, `DS_AUTODARK=1` para el modo oscuro automático).

## «Deporte» en gris: es lo esperado

La pestaña se desactiva mientras ningún deporte tenga club (el personaje no entra en uno hasta unirse a un entrenamiento o pasar una prueba; el día 1–6 no hay equipo). Lo que sí estaba mal: el aviso (`title`) mostraba solo el de atletismo («Apúntate a un club de atletismo…») aunque la partida llevara fútbol. Ahora (`apps/web/src/deporte.ts`) junta los avisos de todos los deportes sin repetir.

## Para la revisión

Si el usuario sigue viéndolo, pedirle: navegador (Chrome/Samsung), si tiene activado «Oscurecer páginas web» (`chrome://flags/#enable-force-dark`) o el modo oscuro de Samsung, y una captura con el menú del navegador abierto.
