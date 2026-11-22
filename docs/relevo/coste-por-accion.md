# Relevo: coste por acción (21/11/2026)

Rama `claude/coste-por-accion` (sale de `claude/youthful-clarke-vs0kye`, `d7bdc36`). Sin pull request. No se ha tocado `DECISIONES.md`. **El juego no cambia**: la huella de `npm run huella -- 60` sale idéntica a la de la rama de partida.

## 0. Resumen

1. **El culpable es «moverse con el grupo»**, no las acciones cortas ni los puestos y pistas. El test de los hermanos (avanzar 3 cursos descansando) pasó de **2,4 s a 18 s (×7)** en ese commit; las acciones cortas y los puestos y pistas no lo movieron.
2. **Causa:** la obligación de `npcs` (la marcha del grupo) pide `presencia.en(aquí, …)` cada vez que se evalúa una acción cortable, y eso construía el **índice de presencia de toda la población** (1.418 personas en la ciudad de prueba, ~6.100 en la grande) en cada intervalo entre cambios de tramo, aunque `aquí` fuera tu casa y allí no hubiera nadie. En el test: 17.471 índices y 24,8 millones de `ubicacionEn` para no encontrar a nadie (`obligCerc = 0`: nunca hubo ≥ 3 personas cerca, así que nunca se miraba el futuro).
3. **Arreglo:** el índice se calcula **lugar a lugar y solo entre las personas que pueden estar allí** (por los destinos de su agenda). Mismo resultado, mucho menos trabajo.
4. **Resultado** (ciudad de prueba, bot equilibrado, 60 días): **1,60 → 1,24 ms por acción** (el objetivo era ~1,2), **61,8 → 48,0 ms por día**, mejor que antes de las acciones cortas (1,47 y 59,4). **Test de los hermanos: 18–20 s → 3,7–3,9 s** (límite 30 s, sin tocarlo). Ciudad grande con fútbol: **6,6 → 4,0 ms por acción** y 257 → 159 ms por día.

Máquina: contenedor de 4 CPU (calibración 7,8–8,4 ms), Node 22, una sola medición a la vez, en serie, sobre un único árbol con `git checkout` entre commits (mismas herramientas: son las del commit medido, que ya traen `rendimiento` con `--pasadas` y `presupuesto`).

## 1. Medición por commits

`npm run rendimiento -- 60 --pasadas 5` (mediana de 5 partidas, ciudad de prueba) y `npm run presupuesto`; el test con `npx tsx tools/rendimiento-hermanos.ts` (ver §4). El ruido entre pasadas es de ±10 %: lo fiable son las diferencias grandes.

| Commit | Qué es | Acciones/día | **ms por acción** | **ms por día** | `esperar` | Semana de juego (máx., presupuesto) | **Test hermanos** |
|---|---|---|---|---|---|---|---|
| `22b74d3` | antes de las acciones cortas | 40,1 | 1,47 | 59,4 | 0,03 ms | 49,8 ms | 2,7 / 3,0 s |
| `047eb24` | acciones cortas unidas | 38,9 | 1,61 | 62,5 | 0,06 ms | 49,8 ms | 3,2 / 2,6 s |
| `d73af2a` | antes de moverse con el grupo (con Mi equipo, caras, fútbol más barato) | 38,9 | 1,58 | 61,5 | 0,06 ms | 79 ms | 2,1 / 2,4 s |
| `42f1eb2` | **moverse con el grupo unido** | 39,3 | 1,65 | 63,5 | **0,25 ms** | **209 ms** | **17,6 / 19,5 s** |
| `4bccd8f` | antes de puestos y pistas (dorsales: solo docs) | 39,3 | 1,59 | 61,9 | 0,49 ms | 199 ms | — |
| `d7bdc36` | ahora (puestos y pistas unidos) | 39,3 | 1,60 | 61,8 | 0,47 ms | 161 ms | 18,0 / 19,9 s |
| **con el arreglo** | `claude/coste-por-accion` | 39,3 | **1,24** | **48,0** | 0,09 ms | 52–102 ms | **3,7–3,9 s** |

Lecturas:

- **Acciones cortas (`22b74d3` → `047eb24`)**: +8 % por acción pero solo +5 % por día (el bot hace menos acciones porque ya no espera «de 5 en 5»; el coste por acción sube porque hay las mismas cosas que hacer entre menos acciones). El test no se mueve (2,6–3,2 s). **No es el problema.**
- **Moverse con el grupo (`d73af2a` → `42f1eb2`)**: por día solo +3 %, pero `esperar` pasa de 0,06 a 0,25 ms, la semana más cara de ~50–80 a ~200 ms y el test de los hermanos de 2,4 a 18 s. El bot casi siempre está en el colegio, donde el índice se pedía de todos modos; el caso patológico es **estar en un sitio donde no hay nadie** (casa, descansando) y repetir miles de acciones cortables. Por eso el coste por acción medio engaña y el test lo delata.
- **Puestos y pistas (`4bccd8f` → `d7bdc36`)**: sin diferencia (61,9 → 61,8 ms por día). **No es el problema** (ni el consejo, ni las pistas, ni las comparaciones de «Mi equipo»: ninguno sale en el perfil).
- Cifras de otras sesiones (1,19 → 1,36 ms al subir moverse con el grupo) salieron en otra máquina o momento; aquí la misma subida es 1,58 → 1,65 y la de 1,47 en origen. Lo que importa es la tabla relativa.
- La columna «Semana de juego (máx.)» baila mucho (es el máximo de 4 semanas, con la máquina compartida), pero el salto de 50 a 160–210 ms con moverse con el grupo se ve en las tres mediciones y desaparece con el arreglo (52, 69 y 102 ms en tres pasadas del presupuesto; el 102 es una pasada con la máquina ocupada).

## 2. Perfil (`node --import tsx --cpu-prof`)

Test de los hermanos en `d7bdc36`, por tiempo propio: `ubicacionEn` 18,3 % · función anónima de `npcs` 11,4 % · `indiceDePresencia` 8,8 % · `agendaDePersona` 6,9 % · recolector 6,3 % · `tramosVigentes` 2,9 % · `azarDe` 0,9 %: **~50 % de todo el tiempo es construir el índice de presencia** (`ubicacionEn` hace tres hashes de texto por tramo vigente y persona). Contadores (instrumentación temporal, no se queda): 26.201 llamadas a la obligación, 17.471 índices completos, 24,8 millones de `ubicacionEn`, ninguna con ≥ 3 cercanos.

Se descartaron las otras sospechas:

- **Mirar la presencia de los próximos 120 minutos** (`limitesDeTramos` + `elGrupoSeVa` por cada cambio de tramo): solo ocurre si hay ≥ 3 personas cerca y trabaja con los ~40 cercanos; en el test no ocurre nunca y en el bot es una parte pequeña. No hace falta cambiarlo.
- **`obligaciones` por acción**: el núcleo ya la guarda en caché por minuto, acciones hechas y estado de los módulos (`proximaObligacion`), así que no se calcula por cada acción de un desplegable, sino una vez por paso. El coste estaba dentro de cada cálculo, no en cuántas veces se hace.
- **Consejo, pistas y «Mi equipo»**: sin presencia en el perfil.

## 3. Qué se ha cambiado (solo `modules/npcs/src/index.ts`)

- `sitiosDeAgenda(agenda)`: los destinos de todos los tramos de una agenda (en caché por agenda: las personas con los mismos tipos comparten el objeto).
- `candidatosEn(…)`: las personas que pueden estar en cada lugar ese día (en el orden de la lista), montado una vez por lista de personas, día y versión del calendario de partidos.
- `indiceDePresencia` ya no recorre toda la población: `calcularLugar` mira, la primera vez que se pide un lugar, solo a sus candidatos; el orden por cercanía (`compararCercania`, con el mismo `azar`) y el criterio de «ocupado a la vista» son los de antes. `enDelIndice` lo comparten el servicio de presencia y el aviso del grupo (que antes leía el mapa interno).
- **Mismo resultado por construcción:** quien nunca va a un lugar no puede aparecer en él (`ubicacionEn` solo devuelve destinos de la agenda), las listas salen en el orden de la lista de personas igual que antes y el índice se sigue reutilizando por intervalo. Comprobado con la huella y con los tests de presencia y de moverse con el grupo.
- Lo que no se ha tocado: el motor (`packages/core`), `GameModule.obligaciones`, `ActionDef.cortable`, el consejo, las pistas, «Mi equipo»; ni ningún límite de tiempo de ningún test.

## 4. Herramientas

- `tools/rendimiento-hermanos.ts` (nuevo): `npx tsx tools/rendimiento-hermanos.ts [veces]` mide lo que cuesta de verdad el test de los hermanos, sin la creación de las 200 partidas que vitest hace al cargar el archivo (~2 minutos que **no** cuentan para el límite del test, pero engañan si se mide el archivo entero con `-t`: «import 97 %»). Para el perfil: `node --import tsx --cpu-prof tools/rendimiento-hermanos.ts 1`.
- Para repetir la tabla: `npm run rendimiento -- 60 --pasadas 5` y `npm run presupuesto` en cada commit.

## 5. Para quien toque lo de al lado

- Todo lo que pida `presencia.en(lugar)` ahora es barato para un lugar al que casi nadie va y cuesta lo que cuesta el colegio para el colegio. `presencia.donde(id)` y `presencia.agenda(id)` no cambian.
- Un lugar nuevo no necesita nada: sale de los destinos de las agendas (`contracts/agendas.ts`).
- Si algún día `ubicacionEn` pudiera devolver un sitio que no está entre los destinos de la agenda, `candidatosEn` lo dejaría fuera: hay que mantener la regla («solo destinos de la agenda»).
- Queda margen en la creación de los candidatos por día (`agendaDe` de toda la población una vez al día) y en `ubicacionEn` (tres hashes de texto por tramo); no merece la pena hasta que otro perfil lo ponga arriba.

## 6. Comprobaciones

Con `claude/youthful-clarke-vs0kye` ya unida (dorsales y entrenamientos):

- `npm run typecheck`: sin errores.
- `npm run huella -- 60`: las 16 líneas **idénticas** a las de la rama base (comparadas en la misma máquina, antes y después).
- `npm test`: 117 archivos, **1.306 tests en verde** (363 s, sin otra carga). El test de los hermanos (avanzar 3 cursos) cuesta ~3–4 s en vez de ~19 s; el límite de 30 s no se ha tocado, ni el de ningún otro test.
- `npm run benjamin -- 31,33` y `npm run probar-web` («todo el camino funciona en el navegador», sin errores en la consola): bien.
