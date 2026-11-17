# Notas de la sesión de arquitectura

Para quien coordine el proyecto (persona o IA). **La sesión de arquitectura lo lee lo primero** y lo mantiene al día: cuando una pregunta se responde, se quita de aquí y se apunta como decisión en `docs/DECISIONES.md` (y en el plan o anexo que corresponda); cuando algo pendiente se hace, se quita o se marca.

Última actualización: 17/11/2026, tras las respuestas del usuario a las preguntas 1–4 y lanzar tres sesiones de Sonnet.

---

## 1. Cómo se trabaja (decidido con el usuario)

- **Reparto.** La sesión de arquitectura (Opus) diseña, escribe los encargos, lanza las sesiones de desarrollo (`create_session`), revisa su trabajo (código, tests, capturas) y une sus ramas. Las sesiones de desarrollo trabajan cada una en su rama, sin pull request, y avisan con `send_message` al terminar.
- **Ninguna decisión de diseño sin autorización del usuario**, salvo arreglar un error que obligue a deshacer trabajo (y se le cuenta). La arquitectura propone con su recomendación; el usuario decide.
- **Las dudas** de quien desarrolla van a «Preguntas abiertas» del plan correspondiente (o a sus notas de relevo); la arquitectura se las lleva al usuario.
- **Sesiones cortas y enfocadas**, una por bloque de trabajo que comparta código, con un encargo cerrado y notas de relevo. Una sesión muy larga se encarece en cada paso: Fable gastó un bloque entero de 5 horas solo en recargar unos 700.000 tokens de contexto.
- **Sesiones en paralelo** solo si tocan archivos distintos. Para no chocar en la documentación, cada una escribe sus notas en `docs/relevo/<rama>.md` y la arquitectura las junta en `DECISIONES.md` y en los planes al unir.
- **Modelos.** Sonnet 5.5 para el desarrollo normal; Fable 5.2 solo para lo de más calado (diseño de sistemas, motor fino, calidad visual), en sesiones nuevas con notas de relevo. **Fable dejó de estar incluido en el plan del usuario el 16/11**: ahora requiere créditos de uso, así que no lanzarlo sin preguntar.
- **Al unir ramas:** comprobar tipos (`npm run typecheck`, tras `npm install` si hay paquetes nuevos) y tests; si una rama arrastra un archivo grande en su historia, unirla como un solo commit (`git merge --squash`).
- **Imágenes para el usuario:** se le envían con `SendUserFile`. Para revisar capturas grandes, recortarlas antes de mirarlas.

## 2. Estado (17/11/2026)

Rama de trabajo: **`claude/youthful-clarke-vs0kye`**, con todo lo de abajo unido, subido y la suite entera en verde (1.079 tests). **No está unida a la rama principal**: hacerlo es decisión del usuario.

| Bloque | Estado | Dónde |
|---|---|---|
| **Cuerpo y apariencia para todos** (fase 1 del visualizador): altura, peso, músculo y grasa con la edad, el sexo y la genética (metabolismo, musculatura) para el personaje y todos los PNJ; hábitos (recreo, Educación física, juego libre, sesiones de club, adultos); historial anual; canas, calvicie, barba, envejecimiento de la piel y 12 rasgos de la cara heredables | ✅ | `docs/PLAN_CUERPO_Y_APARIENCIA.md`, `docs/ANEXO_CUERPO.md`, `packages/contracts/src/cuerpo.ts` |
| **Visualizador de personas** (fase 2, Fable): estilo «tinta», retrato, figura entera a escala, evolución, comparar con el personaje, cuna para menores de 3, catálogos de peinados y vello facial (premium, calvos que se afeitan), largo del pelo y la barba, tinte con raíces | ✅ base · etapa 2c pendiente | `docs/PLAN_VISUALIZADOR.md`, `docs/ANEXO_RETRATOS.md`, `packages/retrato`, `packages/contracts/src/retrato.ts` |
| **Eventos y decisiones (E18, «sucesos»)**: formato como datos, director, eventos base en `modules/eventos` y deportivos en cada deporte, hilos, herramienta (`eventos:nuevo`, `validar`, `probar`, `mapa`), interfaz, presentación desde Opciones, PNJ solo con lesiones, 57 sucesos de prueba, ~0,009 ms por acción | ✅ motor · contenido y calibración pendientes | `docs/PLAN_EVENTOS.md` (§7 ter: lo que queda), `docs/ANEXO_EVENTOS.md` |
| **Peluquería y barbería** | Decidido, sin planificar | `docs/PLAN_PELUQUERIA.md` |

## 3. Preguntas para el usuario (pendientes)

Cuando el usuario responda, quitar la pregunta de aquí, apuntar la decisión en `docs/DECISIONES.md` y encargar lo que toque.

1. **Unir a la principal:** decidido esperar a cerrarlo todo (DECISIONES, 17/11). Unir publica en GitHub Pages; la partida guardada de la versión publicada (v17) no carga en la nueva (v21) y se descarta con un aviso.
2. **Niños sin equipo y equipos del colegio que se cierran** (`docs/relevo/comprobacion-final.md` §6 y §7, `npm run ninos-sin-equipo`). Con interés y sin equipo quedan pocos (0,7–2,2 por categoría; 2–7 tras un verano): no llegan para un segundo equipo. El entrenador convoca a 16 y deja fuera ~2. Con el plazo de fichajes abierto, el personaje de la semilla 33 entra en 3 de los 9 clubes. **El problema real son los equipos del colegio que se cierran:** al crear la partida es raro (1 de 60), pero tras los veranos se acumula (juvenil sin equipo en 4 de 12 semillas tras el verano 1 y en 9 de 12 tras el 2; cadete, 3 y 6). Causa: en el reparto, los clubes de fuera eligen antes que el colegio; el mínimo de 14 es duro (decisión del 08/11); y los jugadores de un equipo cerrado se van a clubes y no vuelven. Opciones: A) el colegio tiene prioridad con sus propios alumnos hasta su mínimo; B) mínimo menor para el colegio (11–12); C) equipo mixto de edades; D) contar también a los que solo tienen interés por el deporte en general; E) dejarlo. **Recomendación:** A, con B como red. Además, que la prueba fuera de plazo diga cuándo se abre el plazo de fichajes.
3. **Dudas de PNJ 2** (`docs/relevo/pnj-2.md`):
   - a) **Un padre que se va con su hijo:** no existe esa relación entre PNJ. **Recomendación:** dejarlo para cuando haya familias de PNJ (encaja con el ciclo de generaciones).
   - b) ¿**Recogen todos los días** de clase? **Recomendación:** el 80 % de los días.
   - c) **Edad mínima** de los padres que recogen (hoy, 18). **Recomendación:** 25.
   - d) La **ficha de un rival o vecino que no tienes cerca** ya no enseña sus acciones en gris con el motivo (efecto del arreglo de rendimiento). Volver a enseñarlas exige que la ficha le diga al motor a quién mira. **Recomendación:** sí, por coherencia con el resto de fichas; es barato.
4. **¿Agrupar también «Estudiar…» y las tutorías?** En «Casa» hay unos 30 botones. Basta con poner el desplegable a esas acciones. También se podría hacer con las acciones del club, que salen casi todas en gris (prueba y plaza en cada club). **Recomendación:** sí, a las dos, con el mismo mecanismo; es una tarea corta.

## 3 bis. Sesiones en curso

| Sesión | Rama | Encargo |
|---|---|---|

**Unidas el 17/11:** `claude/sucesos-presentacion-2` (nombres del juego y aviso «no va contigo»; sus dudas, en §3.3) `claude/futbol-pedir-puesto` (prueba de acceso como evento y «Pedir jugar…» en la ficha del entrenador; sus dudas, en §3.1) y `claude/pnj-fallos-1` (dos deportes, nombres de los niveles, charlar con los niños del barrio y salida del colegio). Las dudas de las tres, respondidas el 17/11 (DECISIONES) y encargadas a `claude/pnj-2` y `claude/futbol-2`.



## 4. Pendiente (por orden de prioridad propuesto)

0 ter. **Revisión de rendimiento (pedida por el usuario el 17/11; se están metiendo muchas cosas nuevas sin medirlas como se debería).** Cuando estén unidas las sesiones en curso: `npm run rendimiento -- 60`, `npm run eventos:rendimiento`, crear, guardar y cargar una partida, y el peso del estado; comparar con las cifras de referencia de DECISIONES (~1,0 ms por acción el 28/10; 1,97 ms ahora en la simulación) y con la versión publicada (`main`). Buscar qué ha crecido y por qué; estabilizar el chequeo de Rendimiento de `npm run sim` (hoy da ⚠️ o ✅ según la carga de la máquina, con una calibración que varía entre 8,7 y 11,7 ms), y proponer un presupuesto por acción y por día que se vigile en cada unión. Medir también en el navegador (Chromium) y en un perfil de móvil.



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
