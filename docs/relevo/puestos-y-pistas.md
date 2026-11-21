# Relevo: puestos sin lado, nombres y pistas (21/11/2026)

Rama `claude/puestos-y-pistas` (sale de `claude/youthful-clarke-vs0kye`). Sin pull request. No se ha tocado `DECISIONES.md`. Encargo: la entrada de DECISIONES «Puestos, entrenamientos, pistas, caras según el origen…» (21/11) y el informe `docs/relevo/futbol-puestos-entrenos.md`.

## Qué se ha hecho

### 1. Puestos
- **El consejo compara con los niños de su edad y consigo mismo** (propuesta A). Puntuación de una familia de puestos = (lo que vale el personaje − la mediana de los niños de su edad que ya juegan) + (lo que vale − su propia media) + azar. Código: `modules/npcs/src/consejo.ts` (`consejoDeUnProfesor`; antes en `plaza.ts`). Sin nadie de su edad (menos de 3 que ya jueguen), solo cuenta lo de sí mismo.
- **El azar se mantiene** (±2 puntos estables del día: `AZAR_DEL_CONSEJO`). La propuesta B, descartada.
- **Renombrar** (propuesta C), solo los nombres, no los ids: `LCR/RCR` → «Interior izquierdo/derecho», `LM/RM` → «Medio de banda izquierdo/derecho». Cambiado en `modules/futbol/src/puestos.ts`, `ANEXO_PUESTOS.md`, `CIUDAD_Y_LIGAS.md`, `ANEXO_DEPORTE.md` y comentarios de `tools/`. No quedan «carrilero» en textos del juego (queda una mención de rol al estilo Football Manager en `MOTOR_PARTIDOS.md`, que habla de roles y no del puesto).
- **Puestos sin lado.** Contrato nuevo `PuestosDeDeporte.familias` (`FamiliaDePuestos`: id, nombre y los puestos de los dos lados) y ayudas `familiasDePuestos`, `familiaDePuesto`, `valoresPorFamilia` y `pesosDeFamilia` (`packages/contracts/src/deporte-datos.ts`). El fútbol tiene 11 familias (portero, central, lateral, pivote, interior, mediocentro, medio de banda, mediapunta, extremo, delantero centro, delantero de banda) en `modules/futbol/src/pistas-de-puestos.ts`. El consejo del profesor, las pistas y «Preguntar por un puesto» hablan de familias; el puesto de la plantilla, el que se juega, la pierna buena y «Pedir jugar…» siguen con los 16 puestos. Las partidas anteriores (sin `familias` en el deporte guardado) tratan cada puesto como su familia.

### 2. Pistas, en el orden pedido
- **(a) El porqué del consejo**, en cualidades y sin cifras. `ConsejoDeDeporte.tiene` (cualidades escritas) y `pistas` (plantillas); `fraseDelPorque` (contracts) monta la frase. Se oye en la acción del profesor (`estudios.consejo_educacion_fisica`) y en el primer día de Educación Física (hecho nuevo `estudios.consejo_porque`, el suceso `eventos.estudios.primer_dia_de_educacion_fisica` lo usa en la rama «preguntar»).
- **(b) «Preguntar por un puesto…»**, desplegable con las familias: al profesor de Educación Física en la sala de profesores (`estudios.preguntar_puesto.<deporte>.<familia>`) y al entrenador en su sede (`<deporte>.preguntar_puesto.<familia>`, `preguntarPorUnPuesto` del kit). 15 min, una vez al día cada uno. `NpcDirectory.lecturaDePuesto(deporte, familia)` (acepta también el id de un puesto) da el tramo (`ya` desde el percentil 60 de los de su edad, `cerca` desde el 25, `lejos`, `sinDatos`), lo que tienes y lo que te falta, y las stats que más te frenan.
- **(c) El entrenador recomienda entrenamientos por su nombre** (`recomendarEntrenamiento` en el kit, dentro de `pedir_consejo`): toma lo que más frena al puesto que juegas (sin equipo, aquel en que más vales) y elige el entrenamiento que más sube eso. **No depende de un desplegable fijo**: lee lo que sube cada entrenamiento (`ConfigDeporte.catalogoDeEntrenos`, que en el fútbol sale de las acciones `ENTRENOS_LIBRES` de `futbol.actions`). Con los entrenamientos de hoy elige entre los cuatro; en cuanto el otro equipo añada los nuevos a `ENTRENOS_LIBRES` entran solos (probado con un catálogo inventado en el test). La habilidad que más frena sube 0,3, como el consejo de siempre.
- **Textos en los datos del deporte** (`PuestosDeDeporte.pistas`, `PistasDePuestos`: cualidades por stat, plantillas del porqué, de la lectura y del entrenamiento) con concordancia: `{quien:o|a}` (profesor/a, entrenador/a) y `{yo:o|a}` (el personaje). **El personaje no tiene género en los textos de las acciones** (el suceso lo trata como masculino), así que las frases de hoy son neutras con él.

Valen para cualquier deporte con puestos: la regla está en `npcs` y el kit; solo el contenido (familias, cualidades, plantillas) es del fútbol.

## Ejemplos (de `npm run puestos -- pistas <semilla>`; los textos que ve el jugador)

**Personaje A (semilla 5, semana 3)**
- Profesor, en la sala: «En fútbol te veo bien de medio de banda, portero, delantero de banda. Me fijo en esto: te mueves bien sin balón y reaccionas muy rápido.»
- Pregunta por portero (ya): «Para ese puesto, reaccionas muy rápido y cuando te quedas solo ante el delantero mantienes la calma. Ya estás para jugar de portero: lo que te falta es jugar, y lo de ahí fuera se aprende en partidos.»
- Pregunta por lateral (lejos): «Para jugar de lateral: a veces no estás donde hay que estar y te cuesta quitar el balón sin hacer falta. Eso se trabaja con paciencia, no en un mes. Si quieres, empezamos por ahí.»
- Pregunta por mediocentro (cerca): «De mediocentro no te cansas: corres todo el partido y tienes buena técnica con el balón, pero el control se te escapa y a veces no estás donde hay que estar.»
- Entrenador, al pedirle consejo (mediocentro): «Para mediocentro, lo que más te frena: el control se te escapa y a veces no estás donde hay que estar. Esta semana, «Trabajo con balón» por tu cuenta.»

**Personaje B (semilla 11): portero que aún no manda en el área**
- Pregunta por portero (ya): «Para ese puesto, reaccionas muy rápido y mandas en tu área. Ya estás para jugar de portero: lo que te falta es jugar, y lo de ahí fuera se aprende en partidos.»
- Pregunta por lateral (cerca): «De lateral quitas bien el balón y no sueltas a tu hombre, pero aún te falta velocidad y aún te cuesta aguantar un partido entero.»
- Entrenador (lateral): «Para lateral, lo que más te frena: aún te falta velocidad y aún te cuesta aguantar un partido entero. Esta semana, «Preparación física» por tu cuenta.»

**Personaje C (semilla 13)**
- Pregunta por portero (cerca): «De portero reaccionas muy rápido y blocas el balón con seguridad, pero los balones altos se te hacen largos y a veces no estás donde hay que estar.»
- Entrenador (portero): «Para portero, lo que más te frena: los balones altos se te hacen largos y a veces no estás donde hay que estar. Esta semana, «Entrenar de portero» por tu cuenta.»
- Entrenador (lateral, nada del catálogo de hoy sube lo que frena): «Para lateral, lo que más te frena: a veces no estás donde hay que estar y tus centros no llegan donde quieres. Eso se gana jugando partidos y con paciencia.»

## Cosas a saber

- **El profesor solo habla de un deporte si rindes al menos el 90 % de la mediana de los de tu edad que ya lo juegan** (regla de antes, intacta). En la semana 3 de muchas semillas (3, 7, 11, 13, 31, 33) no ve nada claro en fútbol y no nombra puestos; «Preguntar por un puesto» sí contesta, porque es una pregunta tuya. Es lo esperado, pero quizá se note.
- **«Delantero de banda»** es el nombre que he dado a la familia de `LST/RST` (los «Delantero izquierdo/derecho»), para distinguirlos del «Delantero centro» sin repetir «extremo». Si se quiere otro nombre, es un dato en `pistas-de-puestos.ts`.
- Con los cuatro entrenamientos libres de hoy, la recomendación se repite mucho («Trabajo con balón» para casi todo lo técnico y «Preparación física» para lo físico): mejorará con el catálogo de 22. Las cualidades de balón parado (faltas, córners, penaltis, saque de banda) no pesan en ningún puesto y no salen en las pistas (hallazgo 1.2.4 del informe).
- Cuando algo frena al puesto pero ningún entrenamiento lo sube, el entrenador dice «eso se gana jugando partidos y con paciencia» (`entrenamiento.sinEntreno`).
- Una pista pregunta, otra recomienda: en un puesto «ya» (`ya`) el entrenador sigue diciendo lo que más frena. Es coherente (estar «para ese puesto» no es no tener nada que mejorar), pero se puede suavizar.
- El suceso de la prueba de acceso y «Pedir jugar…» siguen con los 16 puestos con lado (lo importante ahí es el hueco concreto): el entrenador dirá «lateral izquierdo» porque necesita ese lado. No se ha tocado.

## Decisiones de diseño que he tomado (para que la arquitectura las revise o las apunte en DECISIONES)

1. Umbrales de «Preguntar por un puesto»: percentil 60 (`ya`) y 25 (`cerca`) entre los niños de su edad que ya juegan (`UMBRALES_DE_LECTURA`); mínimo 3 de ellos para comparar.
2. Se nombran como mucho 2 cualidades a favor y 2 en contra (`CUALIDADES_QUE_SE_NOMBRAN`); se compara stat a stat con una muestra de 40 niños de su edad (los de id menor).
3. «Preguntar por un puesto» tiene su propio límite de una vez al día por profesor/entrenador, aparte de la tutoría y el consejo.
4. El porqué y las lecturas usan los valores sin el efecto del conocimiento (stat a stat) y la puntuación de las familias con el efecto del conocimiento (el `rendimientoPorPuestos` de siempre): conviene revisar si se quiere lo mismo en los dos (propuesta G del informe).

## Cómo se prueba
`tests/puestos-y-pistas.test.ts` (familias y nombres; consejo relativo con niños inventados —un puesto en que vale más que los de su edad sube aunque en absoluto valga menos, y sin compañeros cuenta frente a sí mismo—; lectura de un puesto; textos y género; elección de entrenamientos con un catálogo inventado y con los de hoy; con el juego entero y con el entrenador delante). `npm run puestos -- pistas <semilla> [familia…]` enseña los textos.

## Comprobaciones (21/11)
- `npm run typecheck`, `npm run eventos:validar` (61 sucesos, todo en orden), `npm run benjamin -- 31,33` y `npm run probar-web` (todo el camino en el navegador, sin errores en la consola): bien.
- `npm test`: 1242 de 1243 pasaron a la primera; el que falló (`tests/futbol.test.ts`, «fútbol empaquetado») fue porque cambié un texto de `pistas-de-puestos.ts` mientras corría la suite (compara el módulo compilado aparte con el integrado). Repetido solo, junto a `paquetes-de-deporte`, pasa.
- `npm run huella -- 120`: las 14 huellas de los bots salen **idénticas** a las de antes. Las dos de la partida con fútbol (ciudad de prueba, tres veranos) **cambian a propósito**: la población guardada lleva ahora `familias` y `pistas` y los nombres nuevos de los puestos. No se sube `SAVE_VERSION`: los dos campos son opcionales y una partida anterior los lee como «cada puesto es su familia» y «sin pistas con palabras» (el consejo y las pistas hablan entonces con el nombre de cada puesto o no dan porqué).
