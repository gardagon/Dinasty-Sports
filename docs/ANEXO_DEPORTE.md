# Anexo: pestaña del deporte y clasificaciones

Qué enseña la pestaña «Deporte» de cada deporte y las reglas de las clasificaciones de temporada, con todas las cifras para revisarlas. Código: `modules/atletismo/src/temporada.ts` (reglas puras), `modules/atletismo/src/index.ts` (`vistaDeAtletismo`), `packages/contracts/src/deporte.ts` (contrato), `packages/kit-deporte` (lo común a todos los deportes con club: clubes, entrenador, categorías, verano, tele, sobrecarga) y `apps/web/src/deporte.ts` (interfaz). Estado a 27/10/2026 (validado contra el código).

## 1. Cómo funciona

- Cada módulo de deporte publica un servicio `deporte.<id>` con una **vista** (`DeporteView`). La interfaz recorre los servicios que empiezan por `deporte.` y dibuja la pestaña **«Deporte»** (siempre se llama así; con varios deportes, un selector elige cuál se ve). La interfaz no sabe nada de ningún deporte concreto.
- **Un deporte nuevo** solo tiene que publicar ese servicio. Para tener clasificaciones completas, guardar en su estado la clasificación de cada prueba (como hace atletismo en `resultados`).
- Se guarda la **clasificación completa** (todos los corredores con su marca y club) de cada prueba del **curso en curso y el anterior**; de los cursos más viejos solo queda el resumen (puesto, total y marca). Máximo 200 pruebas guardadas. Medido: ~25 carreras con su clasificación suman menos de 80 KB de partida.

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
| Resumen | Categoría (y si compites en la superior), federación (con aviso si son los datos de España), club, entrenador (el de tu edad), **entrenamientos** (días y horas del club), **carreras**, mejor marca, carreras del curso, mejor puesto del curso y estado del campeonato (sin disputar, clasificado, no clasificado). |
| Próxima prueba | Pretemporada (primera carrera en la semana 5), vacaciones, la carrera semanal (sábado de 9 a 13), la semifinal (semana 38) o la final (semana 39) si toca. |
| Habilidades | Solo las **propias del deporte** (en atletismo: técnica, ritmo, salida y conocimiento), con la marca del techo actual. Las genéricas (velocidad, resistencia...) se ven en la pestaña del personaje. |
| Carreras | Todas las del curso, la más reciente primero, cada una desplegable con su clasificación completa (corredor, club, tiempo y diferencia con el 1.º). ⭐ marca la mejor marca personal. |
| Clasificaciones | Por **puntos** y por **mejores marcas**, una de cada por categoría en la que hayas competido este curso. Se enseñan los 10 primeros y, si no estás entre ellos, tu fila al final con tu puesto real. |
| Cursos anteriores | Una fila por curso: carreras, mejor puesto y mejor marca. |

## 3 bis. Formato de las carreras (28/10/2026)

- **Hasta 18 corredores** por carrera: el jugador y, como mucho, 17 de los 18 rivales de su categoría (dos edades × 9 por edad).
- **No todos se presentan.** Cada rival decide por sí solo (azar propio, no cambia con lo que haga el jugador) si acude: los **mejores casi nunca faltan** (98 % el primero) y **los peores faltan más** (60 % el último). Quien **quedó último** en su carrera anterior falla aún más (hasta −15 puntos, según lo cerca que estuvo del fondo). Siempre hay al menos 3 rivales.
- **Semifinales** (sábado de la semana 38): dos series de 8 (16 corredores; los otros 2 de los 18 rotan) repartidas por cabezas de serie (los mejores, separados). Pasan a la final los **4 primeros de cada serie**; los 2 siguientes de cada serie son reservas por si algún finalista no acude. En campeonato acude algo más de gente (+8 puntos).
- **Final** (sábado de la semana 39): 8 corredores (los clasificados; si alguno falta entra un reserva). Medallas de oro, plata y bronce.
- La clasificación de la semifinal que se guarda (y puntúa en la temporada) junta las dos series por tiempos; la tabla del registro enseña tu serie.

## 4. Puntos de la clasificación de la temporada (provisional)

**Se dejan así de momento.** Hay que estudiar cómo funcionan las puntuaciones y clasificaciones en la vida real antes de ajustarlas.

Cada corredor suma los puntos de cada prueba en la que ha corrido contra el personaje. El puesto sale de la marca (menor tiempo, mejor puesto).

| Puesto | 1.º | 2.º | 3.º | 4.º | 5.º | 6.º | 7.º | 8.º | 9.º o más |
|---|---|---|---|---|---|---|---|---|---|
| Carrera semanal | 10 | 8 | 6 | 5 | 4 | 3 | 2 | 1 | 0 |
| Semifinal y final del campeonato (×2) | 20 | 16 | 12 | 10 | 8 | 6 | 4 | 2 | 0 |

- Orden: más puntos primero y, a igualdad, mejor marca.
- Un corredor de la población (rival) es el mismo en todas sus pruebas por su identificador; los corredores genéricos (relleno de las series) se distinguen solo por el nombre.
- Los puntos de un corredor cuentan **solo en las carreras en que ha coincidido con el personaje** (es la clasificación de lo que ves, no de todo el circuito).
- Una clasificación por categoría: si subes a la superior a mitad de curso, aparecen las dos.

## 5. Dónde cambiar cada cosa

| Qué | Dónde |
|---|---|
| Puntos por puesto, factor de campeonato, cursos con clasificación guardada | `modules/atletismo/src/temporada.ts` (`PUNTOS_POR_PUESTO`, `FACTOR_DE_CAMPEONATO`, `CURSOS_CON_CLASIFICACION`) |
| Qué sale en el resumen y la próxima prueba | `modules/atletismo/src/index.ts` (`vistaDeAtletismo`, `proximaPrueba`) |
| Semana de la semifinal y de la final, pretemporada | `modules/atletismo/src/index.ts` (`SEMANA_SEMIFINAL`, `SEMANA_FINAL`, `SEMANAS_PRETEMPORADA`) |
| Corredores por carrera, series, clasificados y probabilidad de acudir | `modules/atletismo/src/temporada.ts` (`CORREDORES_POR_CARRERA`, `CLASIFICADOS_POR_SERIE`, `probabilidadDeAcudir`) |
| Cuánto sube el bono de asistencia en campeonato | `modules/atletismo/src/index.ts` (`BONO_DE_CAMPEONATO`) |
| Cómo se dibuja (y cuándo está desactivada) | `apps/web/src/deporte.ts`, `DeporteView.inactivo` |
| Clubes del atletismo (sesiones, acceso, sedes), jornada de carreras y sitios del mapa (estadio, pista del colegio, salas) | `modules/atletismo/src/datos.ts` (`DATOS_ATLETISMO`, `LUGARES_ATLETISMO`); el catálogo lo arma `modules/clubes/src/index.ts` |
| Plazas ofrecidas, aceptar y estrés por plantón | `packages/kit-deporte/src/club.ts` (`SEMANAS_DE_OFERTA`, `SEMANAS_ENTRE_PRUEBAS`), `modules/clubes/src/index.ts` (`ESTRES_POR_PLANTON`) |
| Sesión de club, llegada tarde, por tu cuenta, consejo del entrenador | `packages/kit-deporte/src/club.ts` (`MINUTOS_ANTES_DE_SESION`, `EFICIENCIA_POR_TU_CUENTA`, `CONOCIMIENTO_POR_CONSEJO`, `HABILIDAD_POR_CONSEJO`); lo que entrena cada sesión, en el módulo del deporte |
| Sobrecarga, campamento, efecto del conocimiento | `packages/kit-deporte/src/comunes.ts` (`SESIONES_SIN_SOBRECARGA`, `EFICIENCIA_CAMPAMENTO`, `EFECTO_CONOCIMIENTO`) |

## 6. Pendiente

- **Estudiar cómo funcionan las clasificaciones y los puntos en el atletismo real** (ligas, circuitos, rankings por marcas) y ajustar la tabla de la sección 3.
- Clasificación **de todo el circuito** (no solo de las carreras que compartes con el personaje) cuando haya calendario completo de competiciones.
- ~~Entrenadores propios de cada club de fuera~~ **Hecho** (`ENTRENADORES_DE_CLUBES`). Pendiente: sus habilidades propias y compañeros de equipo conocidos al entrar.
- Gráfica de la evolución de las marcas a lo largo de los cursos.
- Deportes de equipo: partidos, tablas de liga y plantillas (usarán el mismo contrato con sus propias secciones).
