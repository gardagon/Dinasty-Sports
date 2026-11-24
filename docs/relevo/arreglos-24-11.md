# Relevo — arreglos 24/11 (`claude/arreglos-24-11`)

Sale de `claude/youthful-clarke-vs0kye`. Sin pull request.

## 1. Texto de la federación con la ciudad grande
- **Causa:** `datosDeDeporte` buscaba `paises[ctx.pais.id]` y, para `espana_ciudad_grande`, caía en el respaldo y marcaba `deRespaldo`.
- **Arreglo:** `PaisDef.base?: string` (`packages/contracts/src/paises/tipos.ts`); `conCiudad` y `conCiudadDePrueba` lo rellenan (`pais.base ?? pais.id`); `datosDeDeporte` busca `id` y luego `base`; `validarPais` lo comprueba. Fútbol y atletismo (`modules/*/src/index.ts`, mismo texto) lo heredan sin tocarlos. Documentado en `docs/PAQUETES_DE_PAIS.md` §3 y en `docs/DECISIONES.md`.
- **Nombre:** `paises-propios.ts` registra ahora «España · ciudad grande»; el aviso del tiempo ya está en la pantalla de «Nueva partida» (la nota bajo el país). Las herramientas que escogen el país por su nombre (`probar-web`, `capturar-*`) se actualizaron.
- **Test nuevo** (`tests/datos-de-deporte.test.ts`): una variante de España muestra «Real Federación Española de Atletismo» sin aviso; Argentina sigue mostrándolo.

## 2. «Nueva partida» y menú a pantalla ancha
- `main.ts` (`viewNueva`): las piezas pasan a variables (`mundo`, `persona`, `duro`, `final`); con `usaEscritorio()` se montan en dos columnas, y si no, **el mismo HTML de antes en el mismo orden**. CSS en `escritorio.css` (`html[data-esc] …`): columnas de 1040 px, la derecha fija; el menú de inicio a 760 px con los botones en rejilla de 2.
- **Móvil:** el menú a 390 px sale **idéntico byte a byte** (claro y oscuro). «Nueva partida» a 390 px solo difiere en el texto del desplegable del país (ya no lleva «(se tarda…)»), que es el arreglo 1.
- Capturas en `docs/relevo/arreglos-24-11/` (`antes-*` / `despues-*`, 1920 y 390, claro y oscuro, menú y nueva). Se repiten con `npx tsx tools/capturar-nueva-partida.ts <carpeta> <etiqueta>` (herramienta nueva).
- No se tocó la casilla «Contenido duro» (sale centrada por `.start input { width: 100% }`, ya era así, también en móvil).

## Verificación
- `npm run typecheck`: sin errores.
- `npm run probar-web` y `probar-web:escritorio`: todo ✓, sin errores de consola.
- `npm run huella -- 60`: **idéntica** a la de la rama base (las mismas líneas y hashes).
- `npm test`: 133 archivos, 1446 tests, todos en verde (619 s).

No se tocó `agendas.ts` ni `modules/npcs`.
