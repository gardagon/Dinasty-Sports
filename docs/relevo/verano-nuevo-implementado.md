# El verano nuevo, en el juego (parte 2, 28/11/2026)

El método del usuario (`docs/relevo/veranos-metodo.md`, v5 + juvenil v5) pasa a ser el verano del juego **con la ciudad grande** (`CiudadDef.repartoNuevo`), también para las partidas guardadas antes (desde su siguiente verano). La ciudad de ahora y la de prueba siguen con el verano de siempre.

## Qué hace el verano nuevo

`conVeranoNuevo` (`modules/npcs/src/index.ts`) envuelve la renovación de cada verano (`renovarDeportistas`) y activa el método medido:

- **Los equipos se mantienen**: cada club conserva los equipos que tenía en cada categoría (`equiposPrevios`, sacados de las letras guardadas); solo se cierra el que no llega a 14 después de todo y solo se abre uno si hace falta.
- Lista de abandonos y reserva para los que buscan fuera; barrido de los clubes de arriba abajo, dos pruebas por desplazado y una última pasada sin cupo de puesto; los colegios al final, con su lista de abandonos y cierre si no llegan a 14; reorganización por letras (A = 2.º + los mejores de 1.º, B = 1.º, C/D mixtos).
- **Benjamín y alevín, equipos de 18** (22 solo si sobran) y como mucho 2 equipos los clubes grandes en benjamín.
- **Juvenil**: los cadetes suben al juvenil de su club (los que buscan fuera, con la probabilidad de siempre); el C se alimenta de los que suben y el A y el B, de los de 2.º y 3.º que siguen y los mejores de los que suben; pruebas por cercanía de nivel (6/4/3 según el interés); cascada por puesto; plazas libres al final (sin límite de pruebas ni cupo de puesto); los que iban a abandonar se quedan si su equipo fuera a desaparecer; si desaparece un B, el C pasa a B y el club vuelve a montar su máximo en cuanto puede (`EquipoGuardado.techoDeEquipos`, guardado en la partida).
- Nada de lo que viene después rehace los equipos (`MEDIDA.respetarReparto`), y `fijarEquipos` guarda las letras que decidió el verano (`LETRAS_FIJADAS`, que se limpia antes y después de cada verano).
- Las partidas que pasan por un verano nuevo quedan marcadas (`PoblacionGuardada.repartoNuevo`) y desde entonces quien llega a un equipo entra con una letra de su club y el personaje entra en un equipo guardado (como en las creadas con el reparto nuevo).
- Una herramienta de medida que ya ponga sus propias variantes se respeta; `DIAGNOSTICO.sinRepartoNuevo` apaga el verano nuevo para comparar.
- **El personaje** sigue las reglas de siempre (plaza reservada, plaza de más, `plaza_perdida`); el verano nuevo no lo toca.

## Comprobaciones (ciudad grande con hogares, juego tal cual: `tools/verano-tres.ts <semilla> m 8 real`, semillas 51–60)

Categorías, equipos (jugadores), verano 0 = al crear:

| | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|---|
| benjamín | 30,1 (529) | 29,1 (536) | 28,8 (533) | 29,3 (532) | 29,5 (534) | 29,0 (533) | 29,0 (532) | 29,3 (533) | 29,0 (524) |
| alevín | 25,2 (436) | 24,9 (435) | 23,8 (445) | 24,0 (451) | 24,1 (448) | 24,2 (446) | 24,2 (448) | 23,7 (445) | 23,9 (449) |
| infantil | 23,2 (369) | 19,8 (376) | 19,2 (367) | 18,9 (363) | 19,0 (374) | 18,6 (375) | 18,6 (370) | 18,4 (371) | 18,3 (373) |
| cadete | 18,6 (309) | 16,0 (302) | 16,0 (300) | 15,4 (298) | 15,3 (300) | 15,6 (294) | 15,7 (304) | 15,4 (301) | 15,6 (300) |
| juvenil | 11,1 (243) | 12,1 (257) | 12,0 (254) | 12,6 (260) | 13,1 (272) | 13,6 (279) | 13,6 (278) | 13,9 (282) | 13,7 (282) |
| **total** | 108,2 (1887) | 101,9 (1905) | 99,8 (1899) | 100,2 (1904) | 101,0 (1928) | 101,0 (1928) | 101,1 (1931) | 100,7 (1932) | 100,5 (1930) |

- **Menos de 14: 0 en todos los veranos y semillas.** Categorías estables desde el verano 1 o 2 (total 1.887 → 1.930 jugadores: no caen; infantil y cadete pierden unos equipos al pasar del reparto de inicio, de equipos de 18, al equilibrio). Sin equipo (que quieren jugar, todas las categorías): 51, 51, 36, 41, 34, 33, 38, 38, 41 (un 2 %).
- **Juvenil**: 11,1 → 13,7 equipos y 243 → 282 jugadores (sube despacio, A ≈ 9,4 → 12,0). Clubes que cambian su número de equipos de juvenil en un verano: v1 10/104, v2 3/105, v3 10/111, v4 11/117, v5 11/122, v6 6/122, v7 7/124, v8 4/123 → **62 de 928 (6,7 %): 93 % estables** (objetivo del usuario ~99 %; casi todo son ±1 equipo en un club que crece). Abandonos de juvenil por verano 67–87, recuperados 4–11 (más al final), expulsados a otro club 0–0,2, equipos eliminados 0 (salvo 0,2 en el primero).
- **Partida guardada antes** (creada con el reparto de siempre, 4+3+0+1+7 equipos por debajo de 14 en benjamín, alevín, infantil, cadete y juvenil): tras su primer verano nuevo, **0 por debajo de 14 en todas las categorías**, y tras el segundo también.
- **Coste del verano** (`tools/verano-tres.ts 51 m 2 real|sin`, 2 veces cada uno): **nuevo 3,5–4,3 s frente a 5,9–7,4 s de antes** (la semana de cambio de curso).
- `typecheck` ✅; `npm test`: 134 de 135 archivos en una pasada y **135/135 solo**, ver abajo; `probar-web` y `probar-web:escritorio` ✅; `equipos-minimo -- grande con 51-60`: 0 por debajo de 14 al empezar y en el día 6, 0 sin letra y el personaje con equipo en las 10; `benjamin`: el personaje juega en todas las semillas; `huella -- 60` sin cambio (usa la ciudad de prueba); `sim`/`sim:rapida` con los mismos chequeos y colores (ciudad de prueba: no cambian).
- **Un test va justo de tiempo (ya antes de esta parte):** `tests/eventos.test.ts` («todos los caminos de todos los hilos y sucesos…») tiene un límite de 240 s y tarda **234,5 s solo con este código y 235,7 s con el código de antes** (copia limpia del commit anterior): no es del verano ni del reparto, es lo que cuesta ese test en esta máquina; en la suite entera, con la máquina más cargada, se pasó de 240 s una vez (y otra vez pasó). No he tocado el límite. Se arregla recortando lo que recorre (o dividiéndolo), que es cosa de quien lo escribió.

## Qué queda

La parte 3: chicos y chicas (~10 % de chicas en el fútbol, equipos separados desde infantil, femeninos solo en clubes externos con su simulación sin resultados).
