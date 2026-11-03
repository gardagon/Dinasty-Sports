# Anexo: pestaña del deporte y clasificaciones

Qué enseña la pestaña «Deporte» de cada deporte y las reglas de las clasificaciones de temporada, con todas las cifras para revisarlas. Código: `modules/atletismo/src/temporada.ts` (reglas puras), `modules/atletismo/src/index.ts` (`vistaDeAtletismo`), `packages/contracts/src/deporte.ts` (contrato), `packages/kit-deporte` (lo común a todos los deportes con club: clubes, entrenador, categorías, verano, tele, sobrecarga) y `apps/web/src/deporte.ts` (interfaz). Estado a 27/10/2026 (validado contra el código).

## 1. Cómo funciona

- Cada módulo de deporte publica un servicio `deporte.<id>` con una **vista** (`DeporteView`). La interfaz recorre los servicios que empiezan por `deporte.` y dibuja la pestaña **«Deporte»** (siempre se llama así; con varios deportes, un selector elige cuál se ve). La interfaz no sabe nada de ningún deporte concreto.
- **Un deporte nuevo** solo tiene que publicar ese servicio. Para tener clasificaciones completas, guardar en su estado la clasificación de cada prueba (como hace atletismo en `resultados`).
- Se guarda la **clasificación completa** (todos los corredores con su marca y club) de cada prueba del **curso en curso y el anterior**; de los cursos más viejos solo queda el resumen (puesto, total y marca). Máximo 200 pruebas guardadas. Medido: ~25 carreras con su clasificación, más el estado y el historial de cada jugador tras medio curso, suman menos de 200 KB de partida.

- **La pestaña está desactivada hasta que practicas el deporte** (hasta apuntarte a un club): se ve «Deporte» en gris, con el motivo al pasar el ratón. En cuanto te apuntas se completa con todo lo de abajo; si dejas el club, vuelve a desactivarse. El módulo marca `DeporteView.inactivo` (texto de qué hacer). Con clubes en varios deportes, la pestaña enseña por defecto el **principal** (el del club en el que entraste último, marcado con ★) y un selector deja ver los demás (`deportePrincipal`, contracts).

## 2. Clubes: cómo entrar, cambiar y salir

| Qué | Reglas |
|---|---|
| Apuntarte al club del colegio | En la **administración del colegio** (zona dentro del colegio, a 2 minutos de él), con horario: días de clase de 9:00 a 13:30 y de 15:00 a 18:00. Antes de aceptar, la descripción de la acción cuenta **cuándo entrena y cuándo hay carreras**. Al entrar **conoces al entrenador** que lleva tu edad (se presenta). |
| Prueba de un club de fuera | En la **sala del club** (dentro del estadio; de lunes a viernes de 16:00 a 21:00 y sábados de 9:00 a 14:00), **solo en las horas de entrenamiento del club** (Club Atletismo Ciudad: martes y jueves de 18 a 20; Alto Rendimiento: lunes, martes y jueves de 17 a 20); 150 min. Se puede hacer **estando en otro club**. Exige edad y nivel (Club Atletismo Ciudad: 10 años y nivel 45; Alto Rendimiento: 14 y 65); si no pasas, repetir tras 8 semanas. |
| Si pasas sin tener club | Entras directamente (la inscripción se hace ahí mismo). |
| Si pasas teniendo ya otro club | Te **ofrecen plaza** (vale 8 semanas, `SEMANAS_DE_OFERTA`) y decides con «Aceptar la plaza en…» (en la sala del club, 15 min). |
| Entrenamiento con el club | Los miembros del club están en la **pista** (la del colegio, o el estadio) **10 minutos antes** de la sesión. Entras a la sesión desde entonces y hasta que acaba: la acción dura lo que queda y, si llegas tarde, **solo entrenas la parte proporcional** (modificador `atletismo.llegada_tarde`). **Mientras hay sesión de tu club (y no has entrenado con él ese día) no se puede entrenar por libre.** |
| Pedir consejo al entrenador | «Pedir consejo a tu entrenador» (`atletismo.pedir_consejo`, 15 min): **una vez al día**, con el entrenador de tu club que lleva tu edad y que ya conoces, y solo cuando está libre en su sede (pista del colegio o estadio): antes o después de la sesión. Sube el **conocimiento** (+1, `CONOCIMIENTO_POR_CONSEJO`) y **un poco una habilidad** (+0,3: técnica, ritmo o salida por turnos según el día) y gasta 1 de energía. Hablar con él solo sube la afinidad. |
| Conocimiento de partida | Si los padres del personaje practicaron deporte, empieza con algo de conocimiento de atletismo (primer día): por cada padre aficionado +4, federado +8, profesional +14, del todo si su deporte fue el atletismo y un tercio si fue otro; tope +20 (`conocimientoDeCrianza`). |
| Dejar el club | «Dejar el club de atletismo» en la administración (club del colegio) o en la sala de tu club: sin coste. Quien deja antes el suyo y después acepta, no paga nada. |
| Aceptar la plaza **sin haber dejado antes el otro** | Lo dejas plantado: **estrés +10** (`ESTRES_POR_PLANTON`), con su **entrenador** afinidad −15 y confianza −10 y con **cada miembro de su equipo que conoces** afinidad −6 y confianza −3 (`PLANTON`). |
| Horarios | Un lugar con horario **no desaparece** fuera de él: sale en gris y dice cuándo abre (también al ir allí: se mira la hora a la que llegarías). |
| Entrenadores | Cada club tiene varios, cada uno con las categorías de unas edades (alguno lleva varias): **colegio** 1 (todas las edades); **Club Atletismo Ciudad** 3 (10–13, 14–17, 18 o más); **Alto Rendimiento** 2 (14–17, 18 o más). Los de fuera son personas desconocidas (nombre generado) hasta que te apuntas: se presenta el que lleva tu edad. En el resumen de la pestaña sale **el que lleva tu edad en tu club**, con los días de entreno y las carreras. A futuro cada entrenador tendrá **sus propias habilidades** (según su carácter, su conocimiento del deporte y sus capacidades), mejores en los clubes que en el colegio. |

## 3. Lo que enseña la pestaña de atletismo

| Sección | Contenido |
|---|---|
| Resumen | Categoría (y si compites en la superior), federación (con aviso si son los datos de España), club, entrenador (el de tu edad), **entrenamientos** (días y horas del club), **carreras**, mejor marca, carreras del curso, mejor puesto del curso y lo que llevas del campeonato (tu puesto en las semifinales y finales que has corrido este curso). |
| Próxima prueba | Pretemporada (primera carrera en la semana 5), vacaciones, la carrera semanal (sábado de 9 a 13) o, en la penúltima y la última semana de clase de cada trimestre, la semifinal y la final del campeonato (semanas 14 y 15, 28 y 29, 40 y 41 del curso en España). |
| Habilidades | Solo las **propias del deporte** (en atletismo: técnica, ritmo, salida y conocimiento), con la marca del techo actual. Las genéricas (velocidad, resistencia...) se ven en la pestaña del personaje. |
| Carreras | Todas las del curso, la más reciente primero, cada una desplegable con su clasificación general (corredor, club, serie si hay varias, tiempo y diferencia con el 1.º). ⭐ marca la mejor marca personal. |
| Clasificaciones | Por **puntos** y por **mejores marcas**, una de cada por categoría en la que hayas competido este curso, con **todas las pruebas de la categoría** (corras tú o no). Se enseñan los 10 primeros y, si no estás entre ellos, tu fila al final con tu puesto real. |
| Cursos anteriores | Una fila por curso: carreras, mejor puesto y mejor marca. |

## 3 bis. Formato de las pruebas (decidido el 03/11/2026)

Como en la vida real: en atletismo no hay convocatorias, **corre quien se inscribe**. Es el mismo código para todas las categorías, con o sin el personaje.

- **Jornada normal**: una sola prueba por categoría, abierta. **Corre todo el que se presenta**: el personaje siempre que decide competir y cada PNJ según su decisión de acudir (los de baja no). Nadie se queda fuera por falta de plazas ni se completa la prueba con quien no acudió. Con menos de 2 corredores no se corre.
- **No todos se presentan.** Cada atleta decide por sí solo (azar propio: no cambia con lo que haga el personaje) si acude: los **mejores casi nunca faltan** (98 % el primero) y **los peores faltan más** (60 % el último). Quien **quedó último** en su prueba anterior falla aún más (hasta −15 puntos). En las pruebas de campeonato acude algo más de gente (+8 puntos).
- **Series de 8 como mucho, equilibradas**: `ceil(n / 8)` series con el mismo número de corredores en cada una o uno de diferencia (13 → 7 y 6; 17 → 6, 6 y 5), repartidos por cabezas de serie en serpentina (1.º a la A, 2.º y 3.º a la B, 4.º a la A…). El máximo por serie es un dato del deporte por país (`formatoDeCarrera.maxPorSerie`).
- **Una clasificación conjunta por tiempos**, juntando todas las series. Cada atleta guarda en su historial su puesto en la general y su serie. Las marcas de cada rival salen de su propio azar (el personaje no lo cambia), pero **sus puestos, su historial, su moral y su forma salen de esa prueba, con el personaje dentro si corre**.
- **Campeonato al final de cada trimestre** (tres por curso). En España: semifinal la penúltima semana de clase del trimestre y final la última (semanas 14 y 15, 28 y 29, 40 y 41 del curso). Esas semanas no hay jornada normal; las demás semanas de competición, sí.
  - **Semifinal**: los **16 mejores de la clasificación del trimestre** en su categoría; el 17.º y el 18.º son reservas que cubren las bajas y ausencias. Si aun así quedan menos de 16, se corre con los que hay, en series equilibradas (15 → 8 y 7; 11 → 6 y 5; con 8 o menos, una serie). El personaje entra por su puesto en esa clasificación, como cualquiera (si no ha corrido jornadas del trimestre, no tiene puntos y no entra).
  - **Final (8)**: los **4 primeros de cada serie** de la semifinal. Si en una serie no hay 4, o un clasificado no acude, entra su reserva (el siguiente de su serie, hasta 2) y, si no hay, el mejor tiempo de los no clasificados. Si quedan menos de 8 en total, corren todos los que quedan. Hay medallas.
- La clasificación guardada (y que puntúa en la temporada) de cada prueba es la general de todas las series juntas; la tabla del registro enseña la serie de cada corredor.
- Lesiones: quien está de baja no entrena con el club ni compite, sea PNJ o el personaje (ver `MISMAS_REGLAS.md`).

## 4. Puntos de la clasificación de la temporada (provisional)

**Se dejan así de momento.** Hay que estudiar cómo funcionan las puntuaciones y clasificaciones en la vida real antes de ajustarlas.

Cada corredor suma los puntos de **todas las pruebas de su categoría en las que ha corrido** (con o sin el personaje). El puesto es el de la clasificación general (menor tiempo, mejor puesto).

| Puesto | 1.º | 2.º | 3.º | 4.º | 5.º | 6.º | 7.º | 8.º | 9.º o más |
|---|---|---|---|---|---|---|---|---|---|
| Carrera semanal | 10 | 8 | 6 | 5 | 4 | 3 | 2 | 1 | 0 |
| Semifinal y final del campeonato (×2) | 20 | 16 | 12 | 10 | 8 | 6 | 4 | 2 | 0 |

- Orden: más puntos primero y, a igualdad, mejor marca.
- Hay **dos clasificaciones por categoría**: la de la **temporada** (todo el curso) y la del **trimestre** (se pone a cero al empezar cada trimestre); esta última es la que da las plazas de la semifinal.
- Un corredor de la población es el mismo en todas sus pruebas por su identificador; el personaje es `yo`.
- Se guardan como números cortos por corredor (`pt`, `pr`, `mm`) en el estado del atletismo (`tablas`), no las pruebas enteras del mundo.
- Una clasificación por categoría: si subes a la superior a mitad de curso, aparecen las dos.

## 5. Dónde cambiar cada cosa

| Qué | Dónde |
|---|---|
| Puntos por puesto, factor de campeonato, cursos con clasificación guardada | `modules/atletismo/src/temporada.ts` (`PUNTOS_POR_PUESTO`, `FACTOR_DE_CAMPEONATO`, `CURSOS_CON_CLASIFICACION`) |
| Qué sale en el resumen y la próxima prueba | `modules/atletismo/src/index.ts` (`vistaDeAtletismo`, `proximaPrueba`) |
| Semanas de la semifinal y la final de cada trimestre (relativas al final del trimestre) y pretemporada | `modules/atletismo/src/datos.ts` (`temporada.campeonatoPorTrimestre`, `temporada.semanasDePretemporada`); el cálculo, `semanasDeTemporada` en `packages/contracts/src/deporte-datos.ts` |
| Máximo de corredores por serie, plazas de la semifinal (16) y reservas (2), plazas de la final (8) y clasificados por serie (4) | `modules/atletismo/src/datos.ts` (`temporada.formatoDeCarrera`) |
| Reparto en series, plazas con reservas, finalistas y clasificación acumulada | `modules/atletismo/src/temporada.ts` (`repartirEnSeries`, `clasificarPrueba`, `plazasConReservas`, `finalistasDe`, `anotarEnTabla`) |
| Quién acude, convocatoria única y pruebas del mundo | `modules/atletismo/src/index.ts` (`convocar`, `correrPrueba`, `registrar`, `carrerasDelMundo`) |
| Probabilidad de acudir | `modules/atletismo/src/temporada.ts` (`probabilidadDeAcudir`) |
| Cuánto sube el bono de asistencia en campeonato | `modules/atletismo/src/index.ts` (`BONO_DE_CAMPEONATO`) |
| Cómo se dibuja (y cuándo está desactivada) | `apps/web/src/deporte.ts`, `DeporteView.inactivo` |
| Clubes del atletismo (sesiones, acceso, sedes), jornada de carreras y sitios del mapa (estadio, pista del colegio, salas) | `modules/atletismo/src/datos.ts` (`DATOS_ATLETISMO`, `LUGARES_ATLETISMO`); el catálogo lo arma `modules/clubes/src/index.ts` |
| Plazas ofrecidas, aceptar y estrés por plantón | `packages/kit-deporte/src/club.ts` (`SEMANAS_DE_OFERTA`, `SEMANAS_ENTRE_PRUEBAS`), `modules/clubes/src/index.ts` (`ESTRES_POR_PLANTON`) |
| Sesión de club, llegada tarde, por tu cuenta, consejo del entrenador | `packages/kit-deporte/src/club.ts` (`MINUTOS_ANTES_DE_SESION`, `EFICIENCIA_POR_TU_CUENTA`, `CONOCIMIENTO_POR_CONSEJO`, `HABILIDAD_POR_CONSEJO`); lo que entrena cada sesión, en el módulo del deporte |
| Sobrecarga, campamento, efecto del conocimiento | `packages/kit-deporte/src/comunes.ts` (`SESIONES_SIN_SOBRECARGA`, `EFICIENCIA_CAMPAMENTO`, `EFECTO_CONOCIMIENTO`) |

## 6. Pendiente

- **Estudiar cómo funcionan las clasificaciones y los puntos en el atletismo real** (ligas, circuitos, rankings por marcas) y ajustar la tabla de la sección 3.
- ~~Clasificación de todo el circuito~~ **Hecho** (03/11): la clasificación cuenta todas las pruebas de la categoría.
- ~~Entrenadores propios de cada club de fuera~~ **Hecho** (`ENTRENADORES_DE_CLUBES`). Pendiente: sus habilidades propias y compañeros de equipo conocidos al entrar.
- Gráfica de la evolución de las marcas a lo largo de los cursos.
- Fútbol (F1, 1/11): `modules/futbol` con las 29 habilidades, el conocimiento, el entreno por libre y el club del colegio; sin partidos todavía (la pestaña enseña habilidades y datos del club, con «Partidos» vacío). Ver `ANALISIS_FUTBOL.md` §7.
- Deportes de equipo: partidos, tablas de liga y plantillas. **El contrato ya lo admite (fútbol F0, 1/11):** `DeporteView.secciones` (bloques libres con título, texto y tabla), `PruebaDeTemporada.resultado` (texto como «Ganado 3-1» en lugar de «Xº de Y»), `temporada.nombreDePruebas` («Partidos» en vez de «Carreras») y `TemporadaDeDeporte.liga` (vueltas y equipos por categoría; `jornadasDeLiga`). Atletismo no usa nada de esto.
