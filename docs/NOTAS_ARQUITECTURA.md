# Notas de la sesión de arquitectura

Para quien coordine el proyecto (persona o IA). **La sesión de arquitectura lo lee lo primero** y lo mantiene al día: cuando una pregunta se responde, se quita de aquí y se apunta como decisión en `docs/DECISIONES.md` (y en el plan o anexo que corresponda); cuando algo pendiente se hace, se quita o se marca.

Última actualización: 17/11/2026, tras las respuestas del usuario a las preguntas 1–4 y lanzar tres sesiones de Sonnet.

---

## 1. Cómo se trabaja (decidido con el usuario)

- **Reparto.** La sesión de arquitectura (Opus) diseña, escribe los encargos, lanza las sesiones de desarrollo (`create_session`), revisa su trabajo (código, tests, capturas) y une sus ramas. Las sesiones de desarrollo trabajan cada una en su rama, sin pull request, y avisan con `send_message` al terminar.
- **Ninguna decisión de diseño sin autorización del usuario**, salvo arreglar un error que obligue a deshacer trabajo (y se le cuenta). La arquitectura propone con su recomendación; el usuario decide.
- **Las dudas** de quien desarrolla van a «Preguntas abiertas» del plan correspondiente (o a sus notas de relevo); la arquitectura se las lleva al usuario.
- **Sesiones cortas y enfocadas**, una por bloque de trabajo que comparta código, con un encargo cerrado y notas de relevo. Una sesión muy larga se encarece en cada paso: Fable gastó un bloque entero de 5 horas solo en recargar unos 700.000 tokens de contexto.
- **Sesiones paradas por el límite de uso:** cuando una sesión se para por el límite de 5 horas, no se reanuda sola (solo si el ordenador del usuario está encendido). Revisar con `list_sessions` (`children`) las que salen `failed` y reactivarlas con `send_message` cuando pase el límite.
- **Sesiones en paralelo** solo si tocan archivos distintos. Para no chocar en la documentación, cada una escribe sus notas en `docs/relevo/<rama>.md` y la arquitectura las junta en `DECISIONES.md` y en los planes al unir.
- **Modelos.** Sonnet 5.5 para el desarrollo normal; Fable 5.2 solo para lo de más calado (diseño de sistemas, motor fino, calidad visual), en sesiones nuevas con notas de relevo. **Fable dejó de estar incluido en el plan del usuario el 16/11**: ahora requiere créditos de uso, así que no lanzarlo sin preguntar.
- **Tras unir a `main`, comprobar que se ha publicado:** el flujo «Publicar web (GitHub Pages)» puede fallar por un error de GitHub (el 22/11 falló al desplegar y hubo que relanzarlo). Si falla por un error de GitHub, relanzarlo una vez; si no, buscar la causa.
- **Al unir ramas:** comprobar tipos (`npm run typecheck`, tras `npm install` si hay paquetes nuevos) y tests; si una rama arrastra un archivo grande en su historia, unirla como un solo commit (`git merge --squash`).
- **Imágenes para el usuario:** se le envían con `SendUserFile`. Para revisar capturas grandes, recortarlas antes de mirarlas.

## 2. Estado (17/11/2026)

Rama de trabajo: **`claude/youthful-clarke-vs0kye`**, unida a `main` el 21/11 (#127) y el 22/11 (#128; 1.335 tests en verde). Lo nuevo se trabaja aquí y se une a `main` con pull request cuando el usuario lo apruebe.

| Bloque | Estado | Dónde |
|---|---|---|
| **Cuerpo y apariencia para todos** (fase 1 del visualizador): altura, peso, músculo y grasa con la edad, el sexo y la genética (metabolismo, musculatura) para el personaje y todos los PNJ; hábitos (recreo, Educación física, juego libre, sesiones de club, adultos); historial anual; canas, calvicie, barba, envejecimiento de la piel y 12 rasgos de la cara heredables | ✅ | `docs/PLAN_CUERPO_Y_APARIENCIA.md`, `docs/ANEXO_CUERPO.md`, `packages/contracts/src/cuerpo.ts` |
| **Visualizador de personas** (fase 2, Fable): estilo «tinta», retrato, figura entera a escala, evolución, comparar con el personaje, cuna para menores de 3, catálogos de peinados y vello facial (premium, calvos que se afeitan), largo del pelo y la barba, tinte con raíces | ✅ base · etapa 2c pendiente | `docs/PLAN_VISUALIZADOR.md`, `docs/ANEXO_RETRATOS.md`, `packages/retrato`, `packages/contracts/src/retrato.ts` |
| **Eventos y decisiones (E18, «sucesos»)**: formato como datos, director, eventos base en `modules/eventos` y deportivos en cada deporte, hilos, herramienta (`eventos:nuevo`, `validar`, `probar`, `mapa`), interfaz, presentación desde Opciones, PNJ solo con lesiones, 57 sucesos de prueba, ~0,009 ms por acción | ✅ motor · contenido y calibración pendientes | `docs/PLAN_EVENTOS.md` (§7 ter: lo que queda), `docs/ANEXO_EVENTOS.md` |
| **Peluquería y barbería** | Decidido, sin planificar | `docs/PLAN_PELUQUERIA.md` |

## 3. Preguntas para el usuario (pendientes)

Cuando el usuario responda, quitar la pregunta de aquí, apuntar la decisión en `docs/DECISIONES.md` y encargar lo que toque.

1. ~~**Unir a la principal**~~ **Unida el 21/11** (gardagon/Dinasty-Sports#127, integración continua en verde): publicada en GitHub Pages. La rama de trabajo sigue siendo `claude/youthful-clarke-vs0kye`, al día con `main`.
2. ~~**Reparto de equipos 2, lo que queda**~~ Respondido el 21/11 (DECISIONES, «Rotación en el fútbol de colegio…») y encargado a `claude/rotacion-y-puestos`.
2. ~~**Rendimiento con la ciudad grande y el fútbol**~~ Respondido el 21/11 (DECISIONES, «Rendimiento: guardar sin congelar…») y encargado a `claude/guardar-sin-congelar` y `claude/futbol-mas-barato`.
3. ~~**Tu equipo, para el niño**~~ Decidido el 21/11 (DECISIONES, «“Mi equipo” para el niño»). **Encargo listo para cuando se una `claude/futbol-mas-barato`** (las dos tocan la plantilla y la pestaña del deporte): subpestaña «Mi equipo», compañeros sin nombre si no los conoces, comparación y puesto que se desbloquean al entrenar y jugar con ellos, y habilidades agrupadas.
5. **Balance de los entrenamientos nuevos** (`docs/relevo/entrenamientos.md`): para que el club rinda más que entrenar por libre (como dice su descripción), una sesión del club sube ~13 puntos de habilidad en vez de ~6. Por curso, el jugador sube igual que antes en lo que pesa en su puesto (antes ~43 puntos eran portería que subía un jugador de campo). Los PNJ salen un 3–5 % más altos por edad (los frena el tope por edad). Opciones: aceptarlo; bajar solo la escala del club (entonces el club ya no supera al libre); o subir el libre a la par y bajar los dos. **Recomendación:** aceptarlo y vigilar los niveles por edad, porque el progreso por curso del jugador no cambia.
1. **Publicar el versionado y la página de prueba del retrato** (`?prueba-retrato`): aprobado el 22/11. Tras publicar: Opciones → Deportes → «Buscar deportes» → «Actualizar» el Fútbol, y que diga qué variantes del retrato se ven bien en Samsung con modo oscuro.

## 3 bis. Sesiones en curso

| Sesión | Rama | Encargo |
|---|---|---|
| `session_01M4vXXMp7cyuMpYVVwYDEFo` | `claude/pnj-entrenan-y-abandono` | Análisis con propuesta (desactivada): PNJ que entrenan por su cuenta o quedan a jugar; abandono de los mejores |

**Unidas el 17/11:** `claude/sucesos-presentacion-2` (nombres del juego y aviso «no va contigo»; sus dudas, en §3.3) `claude/futbol-pedir-puesto` (prueba de acceso como evento y «Pedir jugar…» en la ficha del entrenador; sus dudas, en §3.1) y `claude/pnj-fallos-1` (dos deportes, nombres de los niveles, charlar con los niños del barrio y salida del colegio). Las dudas de las tres, respondidas el 17/11 (DECISIONES) y encargadas a `claude/pnj-2` y `claude/futbol-2`.



## 4. Pendiente (por orden de prioridad propuesto)

0 ter. **Hecha el 21/11** (`docs/relevo/revision-rendimiento.md`; decisiones en §3). **Revisión de rendimiento (pedida por el usuario el 17/11; se están metiendo muchas cosas nuevas sin medirlas como se debería).** Cuando estén unidas las sesiones en curso: `npm run rendimiento -- 60`, `npm run eventos:rendimiento`, crear, guardar y cargar una partida, y el peso del estado; comparar con las cifras de referencia de DECISIONES (~1,0 ms por acción el 28/10; 1,97 ms ahora en la simulación) y con la versión publicada (`main`). Buscar qué ha crecido y por qué; estabilizar el chequeo de Rendimiento de `npm run sim` (hoy da ⚠️ o ✅ según la carga de la máquina, con una calibración que varía entre 8,7 y 11,7 ms), y proponer un presupuesto por acción y por día que se vigile en cada unión. Medir también en el navegador (Chromium) y en un perfil de móvil.



1. ~~**Comprobación final de los eventos**~~ **Hecha el 17/11** (también los fallos de `benjamin` y `probar-web`). (`docs/PLAN_EVENTOS.md` §7 ter, punto 4): `npm run sim` completa antes y después (explicar cualquier chequeo que cambie) y añadir los eventos a `npm run probar-web`. Sesión corta de Sonnet.
2. **Más contenido de sucesos**, por lotes y áreas, con la herramienta y el estilo del lote 1 (`docs/relevo/sucesos-contenido-1.md`). Ojo: los bots no pasan por la calle del colegio antes de las 8:10 ni están en casa de noche, así que esos sucesos no salen en la simulación (se cubren con `pruebas`).
3. **Calibrar las cifras de los sucesos** con el usuario (probabilidades, castigos, umbral de «no va con su carácter»).
4. **Visualizador, etapa 2c (Sonnet)**, siguiendo `docs/ANEXO_RETRATOS.md`: más peinados, barbas y ropa; mejorar la raíz del tinte en los peinados con raya o flequillo (se ve como un destello «estrellado») y el tupé (se parece al corto). Ojo con el tamaño: la cuadrícula de referencia (`docs/retratos/*.png`) son ~9 MB y cada vez que se regenera y se sube crece el repositorio.
5. **Planificar la peluquería** (`docs/PLAN_PELUQUERIA.md`): ritmos de crecimiento, precios, horario y calle; el catálogo de estilos ya está en `packages/contracts/src/retrato.ts`.
6. **Candidatos de más calado** (para decidir con el usuario): un **visualizador de los partidos de fútbol** (podría reutilizar el dibujo de las personas), el **ciclo de generaciones** (hijos del personaje: la dinastía) y **salud y lesiones** (E12).
7. **Ideas apuntadas en `docs/DECISIONES.md` («Pendiente e ideas»):** comida y cuerpo (lo que se come entra en las reglas del cuerpo como entrada propia), acciones dinámicas del motor (aplazado), sucesos para más clases de PNJ (cuestan +10–12 ms por semana: solo con decisión del usuario), minutos de fuerza por deporte, personaje chica.

## 5. Sesiones usadas (se pueden archivar)

Todas creadas desde la sesión de arquitectura anterior; su trabajo ya está unido a la rama de trabajo.

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
