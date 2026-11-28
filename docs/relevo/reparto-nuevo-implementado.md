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

## Equipos de 18 en benjamín y alevín al crear (28/11/2026)

Reglas en `reparto-nuevo-reglas.md` (sección «Benjamín y alevín: equipos de 18»). Medido en el juego real (ciudad grande, con hogares):

- Tamaños al crear (semillas 31 y 32): antes había equipos de 22 (los de colegio y alguno externo) junto a otros de 14; ahora el máximo es 18 (14–18), sin ningún 22.
- `equipos-minimo -- grande con 51-60`: **0 equipos por debajo de 14** al empezar y en el día 6, sin jugadores sin letra.
- Veranos 51 y 52 en el juego real (`verano-tres.ts <semilla> m 8 real`): 0 equipos por debajo de 14 en benjamín a juvenil (las filas «senior» de la herramienta no son equipos de liga).
- `typecheck` ✅; `npm test` 135 archivos, 1.483 tests ✅ (648 s); `sim:rapida` con los mismos ⚠️ de antes («Rendimiento», «El esfuerzo hace progresar»); `huella -- 60` igual que tras la parte 3 (futbol 31 `178e480f9c57 217c677a28d2`, 32 `19438bfe0d50 ce8b54299650`); `rendimiento --ciudad`: crear 5,8–7,0 s, estado 24,0 MB, 242 ms por día simulado.
- `probar-web` y `probar-web:escritorio` ✅: no dependen de la suerte; usan la semilla fija 31 (por defecto), con la que el personaje tiene plaza en el colegio y lo convocan.

### La plaza del personaje NO vuelve a 20/20

`benjamin -- 1..20`: **15 de 20 con plaza** (sin plaza: 6, 8, 10, 11 y 16), igual que antes del cambio. Los equipos de 22 desaparecen, pero un equipo de colegio de exactamente 18 está **completo** (la regla de plaza mide por grupos de puestos: sin hueco, el personaje solo entra si vale más que el peor de su puesto; p. ej. semilla 16: nivel 9 frente a 13). Con la mitad de niños que antes el colegio apenas pasa de 18, y con el mundo anterior (el doble de niños) los equipos del colegio quedaban por debajo del máximo. Sin plaza reservada, la única forma de acercarse a 20/20 es que los equipos de colegio salgan con algún hueco (p. ej. tope de 16–17 en el colegio), que es una decisión de diseño del usuario.

## Colegios: hasta 22, y las cifras de los colegios (28/11/2026)

**Regla** (decisión del usuario): el colegio coge a **todos sus alumnos que quieren jugar, hasta 22 por equipo**; el 18 es el objetivo de los clubes, no el tope del colegio. Se aplica en partidas nuevas de la ciudad grande (`CiudadDef.repartoNuevo`): `poblacionDe` pone `plantillaPorCategoria.max = 22` a los equipos de colegio. Es el mismo dato para el personaje y para los PNJ alumnos (la regla de plaza, `plazaEnElEquipo`, mide con él: con 18 jugadores y máximo 22 hay hueco en cada grupo de puestos, y el personaje entra sin tratos especiales; si el equipo ya tiene 22 entra por mérito, como cualquiera). El reparto de inicio sigue formando equipos de 18 y solo la bolsa que sobra (alumnos del propio colegio) llega a 22. Las partidas guardadas no cambian (su máximo está guardado en su población).

**Cifras** (`npx tsx tools/colegios-cifras.ts 1-20`, creación, media de 20 semillas; cada categoría son 2 cursos de 50 alumnos = 100):

| | alumnos | quieren jugar (chicos / chicas) | juegan en el colegio | juegan en clubes de fuera |
|---|---|---|---|---|
| Colegio del personaje, benjamín | 99 | 29,9 (27,2 / 2,7) | 18,9 | 10,9 |
| Colegio del personaje, alevín | 100 | 26,1 (23,9 / 2,3) | 17,3 | 8,8 |
| Otros colegios con club (3), benjamín | 100 | 29–30 | 18–19 | 10–12 |
| Otros colegios con club (3), alevín | 100 | 26–27 | 17–18 | 9–10 |
| Colegios sin club (6) | 100 | 20–33 | 0 | todos |

Cada colegio con club saca **un equipo (14–18, casi siempre 18) por categoría**. Interés por el fútbol: ~26–30 de cada 100 alumnos de la categoría (≈30 %; chicas ~2,5, porque al crear solo ~11 % de las interesadas lo son).

**Por qué el equipo sale lleno a 18 con ~30 interesados:** 1) ~10 de los ~30 juegan en clubes de fuera: los clubes externos reclutan **antes** que los colegios (primera ronda por atractivo; el 15 % de los alumnos prueba fuera) y lo hacen entre los alumnos de todos los colegios (también de los 6 sin club, que mandan fuera a todos sus interesados); 2) los ~19 que quedan son un equipo de 18 más 1–4 en la bolsa, que entran hasta 22; 3) con ~19 de dos cursos no se puede formar un segundo equipo (14 mínimo). No entra nadie «de fuera» en el equipo del colegio: solo sus alumnos. Esto es lo que ha dado el reparto; si el usuario quiere que los alumnos con interés prefieran su colegio, es un cambio del reparto de inicio (decisión pendiente, no aplicada).

**Medido:** `benjamin -- 1..20`: el personaje tiene plaza en **20 de 20** (media 14,9 semanas convocado; antes del cambio 15 de 20). `equipos-minimo -- grande con 51-60`: 0 por debajo de 14. `typecheck` ✅; `npm test` 135 archivos, 1.483 tests ✅ (673 s); veranos 1 y 2 de la semilla 51 en el juego real: 0 por debajo de 14; `probar-web` y `probar-web:escritorio` ✅.
