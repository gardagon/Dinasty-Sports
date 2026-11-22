# Relevo: retrato desvaído en Samsung Internet con modo oscuro

Rama `claude/retrato-samsung` (sale de `claude/youthful-clarke-vs0kye`). Sin pull request.

## Para el usuario: la página de prueba

Abre en el Samsung (con su modo oscuro activado):

**https://gardagon.github.io/dinasty-sports/?prueba-retrato**

(La web se publica con `.github/workflows/pages.yml` solo desde `main`: la página estará ahí cuando esta rama se fusione en `main`. En local: `npm run dev` y `/?prueba-retrato`.)
No hay enlace desde ningún menú, y no toca la partida ni el guardado. Enseña el mismo retrato (una chica de 16 años, pelo castaño) de 10 formas, cada una con su nombre grande, y una fila de cinco colores de referencia. Hay que decir cuáles se ven con colores plenos y tinta bien visible y cuáles desvaídas:

| | Variante |
|---|---|
| A | SVG en línea (como ahora en el juego) |
| B | `<img>` con el SVG como data URL |
| B2 | `<img>` con el SVG como Blob (`blob:`) |
| C | `<canvas>` dibujado desde el SVG, a la resolución de la pantalla |
| D | PNG generado (canvas → `toDataURL`) en un `<img>` |
| D2 | PNG generado como Blob |
| E | SVG en línea sobre fondo oscuro propio fijo |
| F | SVG como `background-image` CSS |
| G | SVG en línea con doble inversión (`filter: invert(1) hue-rotate(180deg)` dos veces) |
| H | `<img>` con SVG dentro de `<picture>` y `color-scheme: light` |

También imprime la escala de pantalla y el user-agent. Con todo ello, lo que pasa en el Samsung decide la solución.

## Investigación (fuentes; el blog oficial de Samsung no se pudo abrir desde este entorno)

- Samsung Internet tiene «force dark» propio, con ajuste en `internet://flags#force-dark-behavior` (Default / Force Dark Only / Media Query only / Prefer Media Query Over Force Dark): [README de magica11y/samsung-internet-force-dark-behavior](https://github.com/magica11y/samsung-internet-force-dark-behavior), que remite a [Dark Mode in Samsung Internet](https://developer.samsung.com/internet/blog/en/2020/12/15/dark-mode-in-samsung-internet).
- Según resúmenes del blog oficial y del foro de desarrolladores de Samsung ([hilo «Websites' dark mode gets overridden by Samsung Internet's dark mode»](https://forum.developer.samsung.com/t/websites-dark-mode-gets-overridden-by-samsung-internets-dark-mode/22937)): el `color-scheme` (meta o CSS) y `prefers-color-scheme` se admiten desde la 13.2 beta, **pero la opción que los respeta es una bandera** (en la 24.0.7 el force dark era el predeterminado y solo con una bandera experimental respetaba el meta; en la 25.0 se llama «Enable Adaptive Force Dark»). Hay quien reporta que, aun con el meta, sigue pisando estilos, grisando blancos y alterando la opacidad de las imágenes. Una respuesta de Samsung dice que **el desarrollador no puede saltarse el modo oscuro con lógica propia**.
- [ctrl.blog, «Night mode in Samsung Internet»](https://www.ctrl.blog/entry/samsung-internet-night-mode.html) (antiguo): el filtro se aplica a la página, a las imágenes de mapa de bits **y a los SVG**; no hay API para detectarlo.
- [MDN browser-compat-data #17408](https://github.com/mdn/browser-compat-data/issues/17408): por defecto `prefers-color-scheme` no hace nada en Samsung Internet; el modo oscuro automático solo entra si la web no declara tema oscuro, según unos, y según otros pisa el CSS igualmente.
- **No encontré** nada fiable sobre cómo trata `<canvas>`, ni sobre `<img>` SVG frente a PNG, ni una manera documentada de excluir un elemento. Por eso la página de prueba, no una conclusión.

## Qué se ha cambiado

Solo la página de prueba (`apps/web/src/prueba-retrato.ts`, enganchada al principio de `iniciar()` en `main.ts` por `?prueba-retrato` / `#prueba-retrato`) y un test (`prueba-retrato.test.ts`). **No se ha aplicado ninguna solución al retrato ni a la evolución**: la investigación no da una solución clara y segura, y cambiar el SVG en línea por `<img>`/PNG sin saber si ayuda solo costaría rendimiento y calidad. El dibujo del juego queda idéntico (en Chrome no puede cambiar nada: no se toca), así que el rendimiento de la lista de Gente es el mismo.

Comprobado en Chromium (Pixel 5 y escritorio, claro y oscuro): las diez variantes se dibujan y se ven igual (capturas en el scratchpad de la sesión).

## Siguiente paso

Cuando el usuario diga qué variantes se ven bien:
- Si B/B2/D/D2 (imagen) se ven bien: pasar el retrato y la evolución a `<img>` con data URL/Blob del SVG (conserva el vector, nítido en pantallas densas). Cuidado con el rendimiento en Gente (muchas caras): cachear el data URL por clave (`retratoDe` ya memoriza el SVG) y `loading`/`decoding="async"`.
- Si solo C/D (rasterizadas) se ven bien: dibujar a `ancho × devicePixelRatio` píxeles (la página ya lo hace).
- Si ninguna se ve bien: es el ajuste global del navegador (bandera de Samsung); se puede detectar poco; documentarlo en la ayuda de la web.
