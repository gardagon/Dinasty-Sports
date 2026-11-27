# El reparto nuevo, en el juego (parte 1, 27/11/2026)

Lo que antes era medida (`docs/relevo/reparto-nuevo-reglas.md`, `veranos-metodo.md` §B17) pasa a ser el juego **en la ciudad grande**, al crear la partida. Los veranos siguen con sus reglas de siempre (parte 2) y los sexos como hasta ahora (parte 3).

## Qué cambia

- **`CiudadDef.repartoNuevo`** (solo `CIUDAD_GRANDE`): con él, `generarTodos` (`modules/npcs/src/index.ts`, `conRepartoNuevo`) crea con el reparto nuevo. La ciudad de ahora, la de prueba y el resto de países siguen con el reparto de siempre; una partida guardada antes no se toca (no se migra nada). `PoblacionGuardada.repartoNuevo` (opcional) marca las partidas creadas así.
- **El reparto de inicio**: primera ronda de 14 por año, subidas por titularidad (infantil y cadete), completar el B mixto, C mixto de colegio y sorteo, paso 7, C y D de benjamín y alevín, equilibrar (8a nunca un B sin A, 8b A con C y B con D, 8c recolocar), tope de 22, equipos de 18 en benjamín y alevín; juvenil con J1–J3 y la cascada del usuario, más **J4**: los clubes sin equipo de juvenil forman uno con los que sobran (14 a 22).
- **Nada lo deshace**: `sinSobrantes`/`acomodarSobrantes` y `plazasDeMas` no recalculan ni sueltan a nadie (lo que era `MEDIDA.respetarReparto`); `fijarEquipos` respeta las letras del reparto al crear (`LETRAS_FIJADAS`); `cubrirGruposVacios` sigue (solo cambia puestos).
- **La partida en equilibrio** (`abandonoPrevio`): al crear, cada niño con interés ha pasado ya por los veranos de su edad con las reglas de abandono de hoy (mismo `dejaElDeporte`, sorteo estable, titularidad y nivel estimados con su talento). Cada categoría empieza en su equilibrio y no cae.
- **Quién ocupa un sitio mientras el curso corre** (`conLetraDelQueLlega`, `fichajes.ts`): si el personaje se apunta y desplaza al peor de un equipo lleno, el desplazado busca club como siempre, pero quien ocupa el sitio de otro entra con su letra y quien entra en un hueco toma la del equipo del club que más se parece a su año (sin pasar de 22). Antes quedaba sin letra y su equipo de origen se quedaba por debajo de 14. **El personaje** entra en el equipo guardado del club que más se parece a su año con plaza (`equipoDelPersonajeEn`), no en un reparto nuevo del club con las reglas viejas.
- **`titulares`** (la alineación que usa el reparto para subir a los titulares) la calcula el módulo (`titularesDelPool`, mismas reglas que `convocarYAlinear`: por grupo de puestos y huecos cubiertos por el que mejor se adapte), en vez de inyectarla la herramienta (un módulo no puede importar otro).
- **Sexos**: nada depende del sexo en esta parte: chicos y chicas se reparten juntos como hoy (`SESGO_DE_SEXO` sigue siendo solo medida, hueco para la parte 3).
- `DIAGNOSTICO.sinRepartoNuevo` apaga el reparto nuevo para comparar con las herramientas de medida; si una herramienta ya pone sus propias variantes (`variantePaso23`), se respetan.

## Comprobaciones (semillas 51–60, ciudad grande con hogares)

- `typecheck` ✅. `npm test`: 135 archivos, 1.483 tests ✅ (760–900 s según la carga; ningún límite de tiempo tocado). `probar-web` y `probar-web:escritorio` ✅.
- `equipos-minimo -- grande con 51-60`: **0 equipos por debajo de 14** al empezar y en el día 6 (la base tenía de 2 a 6 por semilla solo en benjamín), sin jugadores sin letra, y el personaje, apuntado al club de su colegio, queda en un equipo en las 10 semillas (B de benjamín, 17 o 18). Al empezar: benjamín ~29–31 equipos, alevín 24–26, infantil 23–24, cadete 18–21, juvenil 10–12.
- `benjamin -- 31,33` y `51..55`: el personaje juega (primer partido en la semana 4) en todas.
- `sim` y `sim:rapida` (ciudad de prueba, no cambian): **los mismos chequeos y colores que antes**; el ⚠️ «Rendimiento» ya estaba (hogares, 1,79 y 1,86 ms frente a un límite de 1,71–1,73 ms; es ruido de máquina, no del reparto) y «El esfuerzo hace progresar» (+4,6) ya estaba.
- `rendimiento -- 60 --ciudad` (ciudad grande, fútbol instalado, mediana de 3 pasadas), base → nuevo: **crear 15,0 s → 10,0 s**, guardar (copiar) 497 → 455 ms, cargar 291 → 223 ms, acción 7,69 → 6,71 ms, día simulado 301 → 263 ms, semana 2.107 → 1.838 ms, estado **26,3 MB → 25,0 MB** (hay menos jugadores en equipos y menos historial deportivo: `vp` 621 → 398 KB, `hab` 1.429 → 920 KB). Mejora en todo.
- `huella -- 60`: **sin cambio** (futbol 31 `68a5bb79132e 7b9152a7ee30`, aleatorio 2 `e8bca0b138dd`): las huellas usan la ciudad de prueba, que no lleva el reparto nuevo. La huella de la ciudad grande no está en el comando: la referencia nueva del reparto es `equipos-minimo -- grande con 51-60` (arriba).

## Qué queda para la parte 2 y 3

- Los veranos de una partida creada con el reparto nuevo siguen con las reglas de siempre (rehacen los equipos); la parte 2 aplica el verano nuevo (`veranos-metodo.md` v5 + juvenil v5) con `PoblacionGuardada.repartoNuevo` como dato.
- Parte 3: chicas ~10 %, equipos separados desde infantil y femenino solo en clubes externos.
