# Notas de la sesión de arquitectura

Para quien coordine el proyecto (persona o IA). **La sesión de arquitectura lo lee lo primero** y lo mantiene al día: cuando una pregunta se responde, se quita de aquí y se apunta como decisión en `docs/DECISIONES.md` (y en el plan o anexo que corresponda); cuando algo pendiente se hace, se quita o se marca.

Última actualización: 23/11/2026 (noche), sesión de arquitectura `session_01M4vXXRpLP6RxV6c6wYEDQ8` (22–23/11), que tomó el relevo de la del 17–22/11. **Relevo completo**: se puede seguir en una conversación nueva leyendo este archivo.

---

## 1. Cómo se trabaja (decidido con el usuario)

- **Reparto.** La sesión de arquitectura (Opus) diseña, escribe los encargos, lanza las sesiones de desarrollo (`create_session`, modelo Sonnet), revisa su trabajo (código, tests, capturas) y une sus ramas. Cada sesión de desarrollo trabaja en su rama (`claude/<tema>`), sale de la rama de trabajo, no abre pull request y avisa con `send_message` al terminar.
- **Ninguna decisión de diseño sin autorización del usuario**, salvo arreglar un error (y se le cuenta). La arquitectura propone con su recomendación; el usuario decide. Las sesiones de desarrollo tampoco deciden: apuntan las dudas en su relevo o preguntan con `send_message`, y la arquitectura se las lleva al usuario.
- **Encargos:** cerrados y autosuficientes (qué leer, qué hacer, qué no tocar, qué comprobar antes de avisar: `typecheck`, `npm test` en segundo plano, `eventos:validar`, `benjamin -- 31,33`, `probar-web` y, si toca el mundo, `huella -- 60`). Para lo que es medir o comparar, **análisis con propuesta**, sin cambiar el juego (o con los cambios desactivados detrás de un dato) hasta que el usuario decida.
- **Notas de relevo:** cada sesión escribe las suyas en `docs/relevo/<rama>.md`; la arquitectura junta lo decidido en `DECISIONES.md` y en los anexos al unir.
- **Sesiones cortas y enfocadas**, una por bloque que comparta código. **En paralelo solo si tocan archivos distintos;** si dos van a tocar lo mismo (por ejemplo el kit de deporte o la pestaña del deporte), la segunda espera a que se una la primera.
- **Al reactivar** una sesión parada, recordarle en el mensaje las decisiones que se le mandaron justo antes de pararse (puede que no las leyera).
- **Límite de uso:** las sesiones se paran a menudo por el límite de 5 horas (o el semanal) y **no se reanudan solas**. Revisar con `list_sessions` (`children: true`) las que salen `failed`, mirar `status_detail` (dice cuándo se reinicia) y reactivarlas con `send_message` cuando pase. Pedirles siempre que hagan **commit y push a menudo**, para no perder trabajo.
- **Modelos.** Sonnet 5.5 para todo el desarrollo. **Fable 5.2 requiere créditos desde el 16/11: no lanzarlo sin preguntar.**
- **Al unir ramas** a la rama de trabajo: `npm run typecheck` (tras `npm install` si hay paquetes nuevos) y `npm test` en segundo plano (tarda ~15 min; no lanzar otra suite a la vez, ni unir otra rama mientras corre); resolver conflictos conservando lo de las dos ramas (suelen ser listas de `import`). **No subir el límite de tiempo de ningún test** para que pase: si un test va justo de tiempo, es que algo se ha encarecido (así se encontró el coste de «moverse con el grupo»).
- **Publicar (unir a `main`): cada vez con el visto bueno del usuario.** Pull request desde la rama de trabajo a `main` (sin plantilla), suscribirse a su actividad, unirlo cuando la integración continua («Tipos, tests y simulación de balance», ~15 min) dé verde, y **comprobar después que el flujo «Publicar web (GitHub Pages)» termina bien** (desde #130 va en dos trabajos, construir y publicar; antes fallaba a veces). Tras publicar, el usuario ve la versión en Opciones → «Versión».
- **Partidas guardadas:** la versión de guardado sigue en 21. Las de `main` cargan y lo que falta se rellena al abrir (`GameModule.alCargar`); lo vigila `tests/partidas-de-main.test.ts`. Si un cambio exige subir la versión, decírselo al usuario antes de publicar (tendría que empezar partida nueva).
- **El paquete del fútbol** se instala aparte en el navegador; desde #129 el catálogo lleva la huella del código y el juego ofrece actualizarlo cuando cambia (Opciones → Deportes → «Buscar deportes» → «Actualizar»).
- **Imágenes para el usuario:** con `SendUserFile`. Para revisar capturas grandes, recortarlas antes de mirarlas. El dibujo se revisa a tamaño real, no solo en el zoom.
- **El usuario** juega en Chrome (PC y Android). En Samsung Internet con modo oscuro el retrato sale desvaído y no hay arreglo desde la web (su modo oscuro forzado lo altera todo).

## 2. Estado (23/11/2026, noche)

Rama de trabajo: **`claude/youthful-clarke-vs0kye`**. Publicada en GitHub Pages con #127 (21/11), #128–#131 (22/11), **#132** (23/11: diseño de escritorio A, motor de sucesos, lote 2, arreglos) y **#133** (23/11: dormir, gente por la calle). Después de #133 se ha unido **hogares H1 detrás de `CiudadDef.hogares` desactivado**; no está publicado. Suite: unos 133 archivos y 1.442 tests.

| Bloque | Estado | Dónde |
|---|---|---|
| **Cuerpo y apariencia** para todos | ✅ | `docs/ANEXO_CUERPO.md` |
| **Visualizador de personas** | ✅ base · etapa 2c pendiente | `docs/ANEXO_RETRATOS.md` |
| **Sucesos:** motor con variantes y textos al azar, rotación por familia, señales de examen y boletín, cumpleaños propio, contenido duro por categorías (desactivado por defecto), `sim:eventos` por franja, lugar y persona, bot `madrugador`. **117 sucesos** (lote 2 de casa, colegio y amigos, con 10 hilos; 5 de calle). Ritmo ~5,9 por semana frente al objetivo de 6, con las tardes (14–20 h) todavía flojas | ✅ | `docs/ANEXO_EVENTOS.md`, `docs/relevo/sucesos-lote-2.md`, `docs/relevo/sucesos-motor-2.md` |
| **Fútbol** (reparto, Mi equipo, puestos, entrenamientos, liga…) | ✅ | `docs/ANEXO_DEPORTE.md`, `docs/CIUDAD_Y_LIGAS.md` |
| **PNJ:** horarios, charlar, amistad, entrenan por su cuenta, abandono. **Calles con gente** de 6:30 a 23:59 (marcas `vive`/`perro`/`jubilado`; oficios en su lugar; los menores de 12 no van solos; portero, conserje y repartidores) | ✅ | `docs/ANEXO_HORARIOS_PNJ.md`, `docs/relevo/gente-por-la-calle.md` |
| **Hogares H1** (familias hacia delante: padres primero, hijos que heredan con las reglas del personaje, hermanos pequeños, monoparentales con motivo, recogida por el progenitor, familias que se mudan cada curso) | ✅ detrás de `CiudadDef.hogares` **desactivado**; activarlo lo decide el usuario | `docs/relevo/hogares.md` («H1 implementado») |
| **Dormir:** desplegable (hasta las 7:00, lo que toca, hasta descansado, N horas), deuda por edad (−2,5 de energía máxima por hora), sensaciones, `dormirse_en_clase`, PNJ con la misma regla | ✅ | `docs/relevo/dormir.md`, `packages/contracts/src/sueno.ts`, `docs/BACKLOG_STATS.md` E12.3 |
| **Web de escritorio A** (tres columnas desde 1280 px), aviso «Pasando la semana…» | ✅ | `apps/web/src/escritorio.ts`, `docs/relevo/diseno-escritorio.md` |
| **Rendimiento:** ciudad grande en escritorio: crear 7,7 s, semana 0,19–0,30 s, ~1,3–1,4 ms por acción en `sim:rapida`. El usuario creó una partida en el móvil en ~4 s | ✅ · M2 sin decidir | `docs/relevo/medir-rendimiento-2.md` |
| **Determinismo:** una partida no depende de las anteriores; guardar y cargar da lo mismo (aforo por `día:intervalo`) | ✅ | `docs/relevo/estado-compartido.md` |
| **Peluquería** | Decidido, sin planificar | `docs/PLAN_PELUQUERIA.md` |

## 3. Preguntas para el usuario (pendientes)

- **Salud y lesiones** (`docs/relevo/salud-lesiones.md` §9, 9 dudas) y **partidos más reales** (`docs/relevo/partidos-reales.md` §6.4, 8 dudas): presentadas el 24/11 con recomendación. Orden propuesto: salud F1 + partidos P0 en paralelo; después P1 + salud F2–F4.
- **Hogares:** aprobados el 24/11 la activación por defecto y `FAMILIAS.siguiente` (DECISIONES 24/11). La sesión de hogares los aplica; después, pull request para publicar (visto bueno ya dado) y pedir al usuario que mida en el móvil: crear y pasar de semana.
- **Rendimiento M2:** el usuario creó una partida en el móvil en ~4 s («solo con fútbol»). Confirmar si fue con la ciudad grande. Falta medir el cruce de semana en el móvil.

## 3 bis. Sesiones en curso

**Trabajando (24/11):**
- `session_01M4vXXQ6DoRWA2UGVauypzR` (`claude/hogares`): activar los hogares por defecto, `FAMILIAS.siguiente`, menores de 8 duermen 21:30–7:00. Después: H1 completo y lote 3 de sucesos (orden de DECISIONES 24/11);

Pueden reactivarse con contexto:
- `session_01M4vXXQ6DoRWA2UGVauypzR` (`claude/hogares`): seguir con H1 (trabajo de los progenitores, papel de reparto por parentesco, ficha con el vínculo, niños de los vecinos sin familia, abandono por edad) y con H2;
- `session_01M4vXXQAF9nMwtH72JNPMoS` (`claude/sucesos-lote-2`): más sucesos;
- `session_01M4vXXPqtbBbKjYfQzgtQgH` (calle);
- `session_01M4vXXNhTp4behXGJK95oAE` (dormir);
- `session_01M4vXXNJgqnXmd48HC8S6Eb` (escritorio).

## 4. Pendiente (por orden de prioridad propuesto)

1. **Lo que encuentre el usuario al jugar** (publicado el 23/11). Arreglos pequeños apuntados:
   - ✅ 24/11: el texto de la federación con la ciudad grande y «Nueva partida» y el menú en PC (`docs/relevo/arreglos-24-11.md`);
   - los hermanos menores de 8 duermen 23:00–7:00: pasarlos a 21:30–7:00 (`agendas.ts`).
2. **Hogares:** decidir la activación (§3). Después:
   - H1 completo: el niño se va con su progenitor, el papel «el padre de tu compañero», la ficha con el vínculo, familia para los niños de los vecinos;
   - H2: niños de 0 a 7 y nacimientos (medir crear en el móvil antes);
   - H3: adultos sin hijos y calles;
   - H4: mascotas;
   - H5: ciclo de generaciones.
3. **Sucesos (prioridad alta, «mimarlos»):**
   - más sucesos de tarde (14–20 h) para llegar a 6 por semana; con los hogares, sucesos de familias;
   - lote 3: mudanza de un amigo, tu cumpleaños con fiesta, amigo en casa (E3, E6, E7 de `docs/relevo/sucesos-lote-2.md`).
4. **Planificar a medio plazo (decidido el 22/11):** **partidos de fútbol más reales** (`docs/MOTOR_PARTIDOS.md`) y **lesiones y salud** (E12; el sueño ya dejó preparados sus efectos en `sueno.ts` y en `BACKLOG_STATS.md` E12.3). Análisis de cada uno, con su plan.
5. **Rendimiento:** M2 (historia deportiva en hilos, huella idéntica, −30 % al crear) si el móvil lo pide. Con miles de personas más (hogares, ligas del mundo), revisar la tabla de escalado de `docs/relevo/hogares.md` §6.
6. **Deuda técnica:**
   - **economía del personaje** (paga, ingresos, gastos, qué comprar: el préstamo y el ahorro casi no salen sin ella; luego comida e inventario en la columna izquierda);
   - **relaciones entre PNJ** (que dos amigos acaben de enemigos);
   - despertador.
7. **Calibrar con el usuario** las cifras provisionales:
   - sucesos;
   - pedir puesto, `MARGEN_DE_OTRO_PUESTO` (4), probar fuera;
   - `EFICIENCIA_DE_DEBERES` (0,9);
   - recogida;
   - `ESCALA_DE_ENTRENAMIENTO`;
   - listón de profesional;
   - el sueño, con E12.
8. **Visualizador, etapa 2c**, y **planificar la peluquería**.
9. **Ideas para más adelante:**
   - convencer a niños de jugar en el equipo;
   - especializaciones (portero líbero);
   - deberes que se mandan y se entregan;
   - página del entrenador;
   - plantillas equilibradas por lado;
   - abuelos en los hogares;
   - qué hacen los de 18–19 (trabajo, piso o salir del mundo).
10. **Huecos del mundo:**
    - el interés no baja con el tiempo;
    - los PNJ no van a campamentos;
    - faltan las licencias de la RFEF;
    - ojeadores.
11. **De más calado:** fase 2 (vida adulta), visualizador de partidos, dinastía. **Ideas en `docs/DECISIONES.md`:** comida, acciones dinámicas, minutos de fuerza, personaje chica.

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
| `session_01M4vXXNzsoqtFvnvBsCgua3` | Sonnet | Medir rendimiento 2 (22/11, arquitectura del 22–23/11) |
| `session_01M4vXXNJgqnXmd48HC8S6Eb` | Sonnet | Diseño de escritorio: prototipos y A aplicado (22–23/11) |
| `session_01M4vXXQAF9nMwtH72JNPMoS` | Sonnet | Sucesos lote 2: propuesta, escritura y corrección (22–23/11) |
| `session_01M4vXXMop1ruurfnrJWEBCG` | Sonnet | Motor de sucesos para el lote 2 y contenido duro (22–23/11) |
| `session_01M4vXXPqtbBbKjYfQzgtQgH` | Sonnet | Gente por la calle: análisis, F1+F2 y reparto más barato (22–23/11) |
| `session_01M4vXXNhTp4behXGJK95oAE` | Sonnet | Dormir: análisis y F1–F3 (22–23/11) |
| `session_01M4vXXRa4eRsqGgw7PKJ3S7` | Sonnet | Estado compartido entre partidas (23/11) |
| `session_01M4vXXQ6DoRWA2UGVauypzR` | Sonnet | Hogares: análisis, addendum y H1 detrás de un dato (23/11) |
