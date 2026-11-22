# Notas de la sesión de arquitectura

Para quien coordine el proyecto (persona o IA). **La sesión de arquitectura lo lee lo primero** y lo mantiene al día: cuando una pregunta se responde, se quita de aquí y se apunta como decisión en `docs/DECISIONES.md` (y en el plan o anexo que corresponda); cuando algo pendiente se hace, se quita o se marca.

Última actualización: 22/11/2026 (noche), sesión de arquitectura `session_01M4vXXRpLP6RxV6c6wYEDQ8`, que tomó el relevo de la del 17–22/11.

---

## 1. Cómo se trabaja (decidido con el usuario)

- **Reparto.** La sesión de arquitectura (Opus) diseña, escribe los encargos, lanza las sesiones de desarrollo (`create_session`, modelo Sonnet), revisa su trabajo (código, tests, capturas) y une sus ramas. Cada sesión de desarrollo trabaja en su rama (`claude/<tema>`), sale de la rama de trabajo, no abre pull request y avisa con `send_message` al terminar.
- **Ninguna decisión de diseño sin autorización del usuario**, salvo arreglar un error (y se le cuenta). La arquitectura propone con su recomendación; el usuario decide. Las sesiones de desarrollo tampoco deciden: apuntan las dudas en su relevo o preguntan con `send_message`, y la arquitectura se las lleva al usuario.
- **Encargos:** cerrados y autosuficientes (qué leer, qué hacer, qué no tocar, qué comprobar antes de avisar: `typecheck`, `npm test` en segundo plano, `eventos:validar`, `benjamin -- 31,33`, `probar-web` y, si toca el mundo, `huella -- 60`). Para lo que es medir o comparar, **análisis con propuesta**, sin cambiar el juego (o con los cambios desactivados detrás de un dato) hasta que el usuario decida.
- **Notas de relevo:** cada sesión escribe las suyas en `docs/relevo/<rama>.md`; la arquitectura junta lo decidido en `DECISIONES.md` y en los anexos al unir.
- **Sesiones cortas y enfocadas**, una por bloque que comparta código. **En paralelo solo si tocan archivos distintos;** si dos van a tocar lo mismo (por ejemplo el kit de deporte o la pestaña del deporte), la segunda espera a que se una la primera.
- **Límite de uso:** las sesiones se paran a menudo por el límite de 5 horas (o el semanal) y **no se reanudan solas**. Revisar con `list_sessions` (`children: true`) las que salen `failed`, mirar `status_detail` (dice cuándo se reinicia) y reactivarlas con `send_message` cuando pase. Pedirles siempre que hagan **commit y push a menudo**, para no perder trabajo.
- **Modelos.** Sonnet 5.5 para todo el desarrollo. **Fable 5.2 requiere créditos desde el 16/11: no lanzarlo sin preguntar.**
- **Al unir ramas** a la rama de trabajo: `npm run typecheck` (tras `npm install` si hay paquetes nuevos) y `npm test` en segundo plano (tarda ~15 min; no lanzar otra suite a la vez, ni unir otra rama mientras corre); resolver conflictos conservando lo de las dos ramas (suelen ser listas de `import`). **No subir el límite de tiempo de ningún test** para que pase: si un test va justo de tiempo, es que algo se ha encarecido (así se encontró el coste de «moverse con el grupo»).
- **Publicar (unir a `main`): cada vez con el visto bueno del usuario.** Pull request desde la rama de trabajo a `main` (sin plantilla), suscribirse a su actividad, unirlo cuando la integración continua («Tipos, tests y simulación de balance», ~15 min) dé verde, y **comprobar después que el flujo «Publicar web (GitHub Pages)» termina bien** (desde #130 va en dos trabajos, construir y publicar; antes fallaba a veces). Tras publicar, el usuario ve la versión en Opciones → «Versión».
- **Partidas guardadas:** la versión de guardado sigue en 21. Las de `main` cargan y lo que falta se rellena al abrir (`GameModule.alCargar`); lo vigila `tests/partidas-de-main.test.ts`. Si un cambio exige subir la versión, decírselo al usuario antes de publicar (tendría que empezar partida nueva).
- **El paquete del fútbol** se instala aparte en el navegador; desde #129 el catálogo lleva la huella del código y el juego ofrece actualizarlo cuando cambia (Opciones → Deportes → «Buscar deportes» → «Actualizar»).
- **Imágenes para el usuario:** con `SendUserFile`. Para revisar capturas grandes, recortarlas antes de mirarlas. El dibujo se revisa a tamaño real, no solo en el zoom.
- **El usuario** juega en Chrome (PC y Android). En Samsung Internet con modo oscuro el retrato sale desvaído y no hay arreglo desde la web (su modo oscuro forzado lo altera todo).

## 2. Estado (22/11/2026)

Rama de trabajo: **`claude/youthful-clarke-vs0kye`**, unida a `main` y publicada en GitHub Pages con #127 (21/11), #128, #129, #130 y #131 (22/11). Lo nuevo se trabaja en ella y se publica con pull request cuando el usuario lo aprueba. Suite: 126 archivos y 1.367 tests en verde.

| Bloque | Estado | Dónde |
|---|---|---|
| **Cuerpo y apariencia** para todos (altura, peso, músculo y grasa, hábitos, canas, calvicie, barba, 13 rasgos de la cara heredables con tendencias por origen) | ✅ | `docs/ANEXO_CUERPO.md`, `packages/contracts/src/cuerpo.ts` |
| **Visualizador de personas** (estilo «tinta», retrato, figura, evolución, catálogos, ojo con pliegue del párpado; niños sin peinados de adulto) | ✅ base · etapa 2c pendiente | `docs/ANEXO_RETRATOS.md`, `packages/retrato` |
| **Sucesos** (motor, 63 sucesos, presentación desde Opciones, «durante una actividad» sin minutos, urgencia `ahora`/`aplazable`/`pendiente`, moverse con el grupo y «Me voy») | ✅ motor · contenido y calibración pendientes | `docs/ANEXO_EVENTOS.md`, `docs/PLAN_EVENTOS.md` |
| **Fútbol:** prueba de acceso como suceso, reparto de equipos (4 clubes de colegio, probar fuera según edad y ambición, plazas de más, rotación en benjamín y alevín de colegio, primeros años que no desplazan en benjamín y alevín, salida del club como suceso), equipos que se forman los días 1–6, «Mi equipo» (dorsales, compañeros sin nombre, comparación, puesto al verle jugar), puestos sin lado («Interior», «Medio de banda»), pistas y «Preguntar por un puesto», 22 entrenamientos y campamentos separados, quedar a jugar, calendario de la liga, el entrenador dice el puesto en el primer entrenamiento, crónica con dorsales | ✅ | `docs/ANEXO_DEPORTE.md`, `docs/CIUDAD_Y_LIGAS.md`, `docs/ANEXO_PUESTOS.md` |
| **PNJ:** horarios (colegio, recogida, salida enlazada con la tarde), charlar con vecinos y rivales, amistad con los niños del barrio, PNJ que entrenan por su cuenta («fuerte»), abandono por nivel e interés, compañeros hasta los 20, demografía y nombres por ciudad | ✅ | `docs/ANEXO_HORARIOS_PNJ.md`, `docs/ANEXO_RELACIONES.md`, `docs/ANEXO_NOMBRES.md` |
| **Vida:** «Hacer deberes», acciones que pisan una obligación (se cortan), listas en desplegables, fichas de quien no está sin acciones | ✅ | DECISIONES 21/11 |
| **Rendimiento:** guardar a trozos, fútbol más barato (crear ~10 s, semana 0,1–0,36 s en la ciudad grande), índice de presencia por lugar, `npm run presupuesto` y aviso del peso | ✅ · pendiente abaratar la jornada de liga y el reparto | `docs/relevo/revision-rendimiento.md`, `docs/relevo/coste-por-accion.md` |
| **Versión visible y actualización** de la app | ✅ | `docs/relevo/version-visible.md` |
| **Peluquería y barbería** | Decidido, sin planificar | `docs/PLAN_PELUQUERIA.md` |

## 3. Preguntas para el usuario (pendientes)

Ninguna abierta a 22/11. Lo que queda por decidir está en §4 como propuesta.

## 3 bis. Sesiones en curso

| Sesión | Rama | Para qué | Estado |
|---|---|---|---|
| `session_01M4vXXNzsoqtFvnvBsCgua3` | `claude/medir-rendimiento-2` | Medir sin cambiar el juego: sucesos de los PNJ con la ciudad grande, crear y jugar en un móvil emulado (también el trabajador), desglose de jornada de liga, reparto e historia; propuestas para abaratar | Lanzada el 22/11 |
| `session_01M4vXXQAF9nMwtH72JNPMoS` | `claude/sucesos-lote-2` | Fase 1: diagnóstico de la repetición, criterios de calidad y ~30 candidatos de colegio, amigos y casa. Para y espera la aprobación del usuario antes de escribirlos | Lanzada el 22/11 |

## 4. Pendiente (por orden de prioridad propuesto)

1. **Probar como jugador lo publicado el 22/11** y corregir los matices que vaya encontrando el usuario (es lo que está haciendo ahora).
2. **Sucesos: prioridad alta** («es lo que hará que los días no se repitan; hay que mimarlos», usuario, 22/11). Lote 2 de colegio, amigos y casa en marcha (§3 bis): primero la propuesta con criterios de calidad, que aprueba el usuario, y después se escriben. Los bots no pasan por la calle del colegio antes de las 8:10 ni están en casa de noche: esos sucesos se prueban con `pruebas`.
3. **Calibrar con el usuario** las cifras provisionales: sucesos (probabilidades, castigos, umbral de «no va con su carácter»), dificultad de pedir puesto, `MARGEN_DE_OTRO_PUESTO` (4), pesos de ir a probar fuera, `EFICIENCIA_DE_DEBERES` (0,9), recogida en el colegio (80 %, edad mínima 25: mezclar padres y abuelos), balance de entrenamientos (`ESCALA_DE_ENTRENAMIENTO` = 1) y listón de profesional (40; élite 35), que se revisa en la fase 2.
4. **Rendimiento:** medición en marcha (§3 bis). Después, abaratar la jornada de liga (~75 partidos por semana) y el reparto de equipos; estado más pequeño (genética y rasgos son el 56 % de los 16 MB de la ciudad grande); `listActions` del fútbol solo cuando hace falta. Propuestas en `docs/relevo/revision-rendimiento.md` §6. Antes de activar más clases de sucesos para los PNJ, medirlas con la ciudad grande.
5. **Visualizador, etapa 2c** (Sonnet, `docs/ANEXO_RETRATOS.md`): más peinados, barbas y ropa; la raíz del tinte con raya o flequillo y el tupé. La cuadrícula pesa ~9 MB: regenerar solo lo que cambie.
6. **Planificar la peluquería** (`docs/PLAN_PELUQUERIA.md`).
7. **Ideas del usuario apuntadas, para más adelante:**
   - misión «convencer a niños de jugar en el equipo» cuando falten (DECISIONES 20/11) y «convencer a un amigo» como alternativa puntual;
   - especializaciones (roles), como el portero líbero, después de probar lo de ahora;
   - deberes que se mandan y se entregan en la siguiente clase, con sucesos;
   - un padre que se va con su hijo, cuando haya familias de PNJ;
   - página del entrenador más detallada (labor de entrenador);
   - plantillas equilibradas por lado (pierna buena).
8. **Huecos conocidos del mundo:** no hay archivo de los PNJ que dejan el mundo; el interés no baja con el tiempo; los PNJ no van a campamentos; faltan las licencias reales de la RFEF para contrastar el abandono; los ojeadores (el nivel servirá para que vean a los buenos).
9. **A medio plazo, planificar (decidido el 22/11):** **partidos de fútbol más reales** (ampliar los cálculos más allá de los tramos, que de momento valen; base `docs/MOTOR_PARTIDOS.md`) y **lesiones** (E12; el motor de partidos ya prevé preguntar por una lesión en cualquier acción, `MOTOR_PARTIDOS.md` §0.7 y §9). Propuesta: un análisis de cada uno (qué hay, qué falta y fases), con su plan, para que lo apruebe el usuario.
10. **Candidatos de más calado** (para decidir con el usuario): fase 2 (vida adulta y profesional), visualizador de los partidos, ciclo de generaciones (la dinastía).
11. **Ideas en `docs/DECISIONES.md` («Pendiente e ideas»):** comida y cuerpo, acciones dinámicas del motor, minutos de fuerza por deporte, personaje chica.

## 5. Sesiones usadas (se pueden archivar)

Todas terminadas y con su trabajo unido a la rama de trabajo (y a `main`). Las marcadas «esta sesión de arquitectura» son de la arquitectura del 17–22/11; las demás, de la anterior. Cada una dejó sus notas en `docs/relevo/<rama>.md`.

| Sesión | Modelo | Para qué |
|---|---|---|
| `session_01M4vXXPzJrHv9DtSjyLXqE5` | Sonnet | Cuerpo y apariencia (fase 1) y rasgos de la cara |
| `session_01M4vXXPCsNVnBTGW3BBP4AZ` | Fable | Visualizador (fase 2) |
| `session_01M4vXXQ3dmjWQXKR2sa8hHq` | Fable | Eventos y decisiones (sin créditos desde el 17/11) |
| `session_01M4vXXRVbGM9S6V9ZhjdaRk` | Sonnet | Rendimiento de los sucesos |
| `session_01M4vXXPgRajgq1mHN3r1gSz` | Sonnet | Presentación de los sucesos desde Opciones |
| `session_01M4vXXQBUogyjnaCrXngzHj` | Sonnet | Contenido de sucesos, lote 1 |
| `session_01M4vXXMyMkGiof9ZYc5bGtg` | Sonnet | Presentación de los sucesos, 2.ª parte (17/11, esta sesión de arquitectura) |
| `session_01M4vXXNN21uMbP1HxxowM28` | Sonnet | Fallos de PNJ, 1 (17/11, esta sesión de arquitectura) |
| `session_01M4vXXRXvf6BQ1H7kanWL2W` | Sonnet | Pedir puesto y prueba de acceso (17/11, esta sesión de arquitectura) |
| `session_01M4vXXNJQUReSzr3J1beLT5` | Sonnet | Comprobación final de los eventos y fallos de benjamin y probar-web (17/11, esta sesión de arquitectura) |
| `session_01M4vXXMfsH6XTt1U1mmKQ1m` | Sonnet | Fútbol 2: prueba con los puestos que más necesita, calendario de la liga, modo números (17/11, esta sesión de arquitectura) |
| `session_01M4vXXR2tusR8NPz4qqh5Rw` | Sonnet | PNJ 2: horarios, recogida, amistad, charlar y rendimiento de los rivales (17/11, esta sesión de arquitectura) |
| `session_01M4vXXNy9srpg9oYKpsTsi8` | Sonnet | «Entrenar…» agrupado y un solo deporte de competición (17/11, esta sesión de arquitectura) |
| `session_01M4vXXRd8gevhzsj2di6xSy` | Sonnet | Demografía de orígenes: análisis y aplicación (17/11, esta sesión de arquitectura) |
| `session_01M4vXXRtH1musiDi91d3e3n` | Sonnet | Fichas, recogida, plazo de pruebas y listas agrupadas (17/11, esta sesión de arquitectura) |
| `session_01M4vXXP3ckZSBmGvQnUnAxe` | Sonnet | Nombres más nacionales: opciones con muestras (17–18/11, esta sesión de arquitectura) |
| `session_01M4vXXNH5rEeQu14t4bGSsU` | Sonnet | Acciones del club en desplegables (18/11, esta sesión de arquitectura) |
| `session_01M4vXXNt52eARrGJ6e6Uscp` | Sonnet | Reparto de equipos: colegios, probar fuera por edad y plazas de más (17–20/11, esta sesión de arquitectura) |
| `session_01M4vXXPf2zMF2zD3iHE79x3` | Sonnet | Reparto de equipos 2 (20/11, esta sesión de arquitectura) |
| `session_01M4vXXS22qpRwXGa4JE7VBv` | Sonnet | Rotación, «El curso que viene» y puestos (21/11, esta sesión de arquitectura) |
| `session_01M4vXXRfGRcayUhG8WXyDCj` | Sonnet | Revisión de rendimiento (21/11, esta sesión de arquitectura) |
| `session_01M4vXXNStiDzD4AGKEshkud` | Sonnet | Guardar sin congelar y vigilar el peso (21/11, esta sesión de arquitectura) |
| `session_01M4vXXMHztRUvbt7XbZW3ft` | Sonnet | Puestos, entrenamientos y pistas: análisis (21/11, esta sesión de arquitectura) |
| `session_01M4vXXMaAyvvsxH4QeZu3rA` | Sonnet | Sucesos en clase sin tiempo ni «mañana» (21/11, esta sesión de arquitectura) |
| `session_01M4vXXPDhEajtkKpPVfbKQS` | Sonnet | Hacer deberes y acciones que pisan otra (21/11, esta sesión de arquitectura) |
| `session_01M4vXXPBodQ2WC6McapR2v8` | Sonnet | Caras según el origen y ojo con pliegue (21/11, esta sesión de arquitectura) |
| `session_01M4vXXPQUdYEGsR1Fs7XmG5` | Sonnet | Fútbol más barato y equipos que se forman al empezar el curso (21/11, esta sesión de arquitectura) |
| `session_01M4vXXPpi9riogRRYhFwJud` | Sonnet | Mi equipo y habilidades agrupadas (21/11, esta sesión de arquitectura) |
| `session_01M4vXXR9ZzuDodhbLuCsMSu` | Sonnet | Moverse con el grupo (21/11, esta sesión de arquitectura) |
| `session_01M4vXXNVXxbCc2nznHngV8k` | Sonnet | Puestos y pistas (21/11, esta sesión de arquitectura) |
| `session_01M4vXXPwp3Qjr84KzsiTdwA` | Sonnet | Dorsales, crónica y columnas de Mi equipo (21/11, esta sesión de arquitectura) |
| `session_01M4vXXPDBij8YJjM9AZGWFY` | Sonnet | Catálogo de entrenamientos y campamentos (21/11, esta sesión de arquitectura) |
| `session_01M4vXXQFX9Ng9KHWSoLso2U` | Sonnet | Coste por acción (21–22/11, esta sesión de arquitectura) |
| `session_01M4vXXPS1A9ScC8LHqc2qXa` | Sonnet | Análisis de profesionales a los 18 (22/11, esta sesión de arquitectura) |
| `session_01M4vXXP9yVZBSgVR7Bp2jZa` | Sonnet | Compatibilidad con main, crónica sin nombres e investigación del personaje sin equipo (22/11, esta sesión de arquitectura) |
| `session_01M4vXXMq6uyW8dV12rHW48q` | Sonnet | Plaza al cambiar de año (22/11, esta sesión de arquitectura) |
| `session_01M4vXXMSfXmoS68SCSee9NG` | Sonnet | Retrato en el móvil y niños calvos (22/11, esta sesión de arquitectura) |
| `session_01M4vXXNju9hqBxXzwJNvdJu` | Sonnet | Versión visible y actualización de la app (22/11, esta sesión de arquitectura) |
| `session_01M4vXXMPTosoA18y2ft67tu` | Sonnet | Retrato en Samsung Internet: investigación y página de prueba (22/11, esta sesión de arquitectura) |
| `session_01M4vXXPnzU1Gedkvetov9Rr` | Sonnet | Primer entrenamiento: «vas a jugar de…» (22/11, esta sesión de arquitectura) |
| `session_01M4vXXMp7cyuMpYVVwYDEFo` | Sonnet | PNJ que entrenan por su cuenta y abandono: análisis (22/11, esta sesión de arquitectura) |
| `session_01M4vXXR2Hh7LzUU4PJqCjP4` | Sonnet | PNJ por su cuenta, abandono por nivel e interés, compañeros hasta los 20 (22/11, esta sesión de arquitectura) |
