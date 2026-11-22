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

## Segunda ronda (datos nuevos del usuario)

**Dato:** juega con la PWA instalada en Android y con **Samsung Internet** (en Chrome del mismo móvil el retrato se ve bien); además, el niño de 8 años sale **calvo** también en Chrome.

### 1. Samsung Internet (modo oscuro forzado)
- Samsung Internet es Chromium con su propio «Usar modo oscuro en las páginas web», que reajusta los colores de las webs que no declaran modo oscuro. No se puede emular aquí: `--force-dark-mode`/`WebContentsForceDark` no hacen nada en el Chromium de escritorio y el override de CDP (`setAutoDarkModeOverride`) oscurece la página pero deja el SVG intacto (y no respeta el meta, porque es un override).
- Lo que hacemos (ya en la rama): `<meta name="color-scheme" content="light dark">` (declarar los dos temas es lo que hace que Chromium/Samsung no apliquen el suyo), `color-scheme` ya está en `:root` para los dos temas, y los SVG del dibujo llevan `color-scheme: light; forced-color-adjust: none; opacity: 1; filter: none`. **Sin probar en un Samsung real**: pedir al usuario que confirme tras actualizar la app.
- Si siguiera igual: es su ajuste global (Ajustes → Aspecto → «Usar modo oscuro en las páginas web» / «Modo oscuro de la página»); desactivarlo, o usar Chrome, lo confirma.

### 2. La PWA y su caché (comprobado, no es la causa)
`apps/web/public/sw.js`: navegación **red primero** (la copia es solo respaldo sin conexión), el resto con copia primero y refresco en segundo plano. Los JS y CSS de Vite llevan hash en el nombre, así que un `index.html` nuevo apunta a archivos nuevos: no se mezcla un dibujo viejo con estilos nuevos. `skipWaiting` + `clients.claim` activan el worker nuevo al instante. Sin conexión se sirve lo guardado. El manifiesto (`standalone`, `theme_color` oscuro) no toca el dibujo. Conclusión: la app se actualiza en la siguiente apertura con conexión; el `meta` nuevo llegará con ella.

### 3. El niño calvo (causa encontrada y arreglada)
Es un fallo real, del catálogo de peinados: los hombres tienen un 4 % de «Cabeza afeitada» (largo 0) y un 5 % de «Rapado al cero» (0,15 cm), y el estilo es fijo de por vida, así que **algún niño sale calvo** (con menos de 0,05 cm no se dibuja pelo; con menos de 0,4 solo una sombra). No es del pliegue del párpado ni de las caras por origen.
**Arreglo** (`packages/retrato/src/parametros.ts`): hasta la pubertad (`edadFisica < EDAD_DEL_VELLO`) quien tendría un largo < 0,4 cm lleva «rapado» (0,6 cm); desde ahí vuelve su estilo. Test nuevo en `retrato.test.ts` (1 500 semillas × sexo × 3, 8 y 12 años: largo ≥ 0,5; y de adultos sigue habiendo cabezas al cero). No hay que regenerar la cuadrícula (sus niños llevan peinado pedido o no caen en esos dos estilos; no se ha cambiado ninguna otra hoja).
