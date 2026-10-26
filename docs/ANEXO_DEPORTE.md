# Anexo: pestaña del deporte y clasificaciones

Qué enseña la pestaña «Deporte» de cada deporte y las reglas de las clasificaciones de temporada, con todas las cifras para revisarlas. Código: `modules/atletismo/src/temporada.ts` (reglas puras), `modules/atletismo/src/index.ts` (`vistaDeAtletismo`), `packages/contracts/src/deporte.ts` (contrato) y `apps/web/src/deporte.ts` (interfaz). Estado a 26/10/2026.

## 1. Cómo funciona

- Cada módulo de deporte publica un servicio `deporte.<id>` con una **vista** (`DeporteView`). La interfaz recorre los servicios que empiezan por `deporte.` y dibuja la pestaña **«Deporte»** (siempre se llama así; con varios deportes, un selector elige cuál se ve). La interfaz no sabe nada de ningún deporte concreto.
- **Un deporte nuevo** solo tiene que publicar ese servicio. Para tener clasificaciones completas, guardar en su estado la clasificación de cada prueba (como hace atletismo en `resultados`).
- Se guarda la **clasificación completa** (todos los corredores con su marca y club) de cada prueba del **curso en curso y el anterior**; de los cursos más viejos solo queda el resumen (puesto, total y marca). Máximo 200 pruebas guardadas. Medido: ~25 carreras con su clasificación suman menos de 80 KB de partida.

## 2. Lo que enseña la pestaña de atletismo

| Sección | Contenido |
|---|---|
| Resumen | Categoría (y si compites en la superior), club, entrenador, mejor marca, carreras del curso, mejor puesto del curso y estado del campeonato (sin disputar, clasificado, no clasificado). |
| Próxima prueba | Pretemporada (primera carrera en la semana 5), vacaciones, la carrera semanal (sábado de 9 a 13), la clasificatoria (semana 25) o la final (semana 39) si toca. |
| Habilidades | Solo las **propias del deporte** (en atletismo: técnica, ritmo, salida y conocimiento), con la marca del techo actual. Las genéricas (velocidad, resistencia...) se ven en la pestaña del personaje. |
| Carreras | Todas las del curso, la más reciente primero, cada una desplegable con su clasificación completa (corredor, club, tiempo y diferencia con el 1.º). ⭐ marca la mejor marca personal. |
| Clasificaciones | Por **puntos** y por **mejores marcas**, una de cada por categoría en la que hayas competido este curso. Se enseñan los 10 primeros y, si no estás entre ellos, tu fila al final con tu puesto real. |
| Cursos anteriores | Una fila por curso: carreras, mejor puesto y mejor marca. |

## 3. Puntos de la clasificación de la temporada (provisional)

**Se dejan así de momento.** Hay que estudiar cómo funcionan las puntuaciones y clasificaciones en la vida real antes de ajustarlas.

Cada corredor suma los puntos de cada prueba en la que ha corrido contra el personaje. El puesto sale de la marca (menor tiempo, mejor puesto).

| Puesto | 1.º | 2.º | 3.º | 4.º | 5.º | 6.º | 7.º | 8.º | 9.º o más |
|---|---|---|---|---|---|---|---|---|---|
| Carrera semanal | 10 | 8 | 6 | 5 | 4 | 3 | 2 | 1 | 0 |
| Clasificatoria autonómica y final (×2) | 20 | 16 | 12 | 10 | 8 | 6 | 4 | 2 | 0 |

- Orden: más puntos primero y, a igualdad, mejor marca.
- Un corredor de la población (rival) es el mismo en todas sus pruebas por su identificador; los corredores genéricos (relleno de las series) se distinguen solo por el nombre.
- Los puntos de un corredor cuentan **solo en las carreras en que ha coincidido con el personaje** (es la clasificación de lo que ves, no de todo el circuito).
- Una clasificación por categoría: si subes a la superior a mitad de curso, aparecen las dos.

## 4. Dónde cambiar cada cosa

| Qué | Dónde |
|---|---|
| Puntos por puesto, factor de campeonato, cursos con clasificación guardada | `modules/atletismo/src/temporada.ts` (`PUNTOS_POR_PUESTO`, `FACTOR_DE_CAMPEONATO`, `CURSOS_CON_CLASIFICACION`) |
| Qué sale en el resumen y la próxima prueba | `modules/atletismo/src/index.ts` (`vistaDeAtletismo`, `proximaPrueba`) |
| Semana de la clasificatoria y de la final, pretemporada | `modules/atletismo/src/index.ts` (`SEMANA_CLASIFICATORIA`, `SEMANA_FINAL`, `SEMANAS_PRETEMPORADA`) |
| Cómo se dibuja | `apps/web/src/deporte.ts` |

## 5. Pendiente

- **Estudiar cómo funcionan las clasificaciones y los puntos en el atletismo real** (ligas, circuitos, rankings por marcas) y ajustar la tabla de la sección 3.
- Clasificación **de todo el circuito** (no solo de las carreras que compartes con el personaje) cuando haya calendario completo de competiciones.
- Gráfica de la evolución de las marcas a lo largo de los cursos.
- Deportes de equipo: partidos, tablas de liga y plantillas (usarán el mismo contrato con sus propias secciones).
