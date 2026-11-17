# Relevo: pedir puesto en el fútbol (17/11/2026)

Rama `claude/futbol-pedir-puesto` (sale de `claude/youthful-clarke-vs0kye`). Sin pull request.

## B. Dificultad de pedir otro puesto en el primer entrenamiento — HECHO

**Formato (general, nada de fútbol en el motor):** la tirada admite `ajustes: [{ si: [condiciones], mas: N }]` (`AjusteDeTirada` en `contracts/src/sucesos/tipos.ts`).
Si se cumplen todas las condiciones del ajuste, la dificultad suma `mas` (negativo = más fácil); los que se cumplen se suman y el total se queda entre 0 y 100
(`dificultadDeTirada`, `condiciones.ts`). Se usa en los tres sitios donde se tira o se enseña la probabilidad (`modules/sucesos`: tirada del personaje, tirada de un PNJ
y probabilidad del modo «números»). El catálogo valida que cada ajuste tenga `mas` numérico y al menos una condición, y sus condiciones se comprueban como las demás (papeles del reparto).
No hizo falta tocar nada más: `relacion` y `hecho` ya eran condiciones, y el fútbol ya publicaba `futbol.ventaja_del_mejor_puesto` (lo que vale en su mejor puesto menos lo que vale en el actual, en puntos de valor).

**Cifras PROVISIONALES** (`modules/futbol/src/eventos/primer_entrenamiento.ts`). Base 55 (la de antes) más escalones acumulados:

| Condición | Ajuste |
|---|---|
| Relación con el entrenador: antipatía, enemigo o antagonista | +10 |
| Afinidad ≥ 20 | −5 |
| Afinidad ≥ 40 (≈ amigo) | −5 más (−10 en total) |
| Afinidad ≥ 75 (≈ mejor amigo) | −5 más (−15 en total) |
| Vale ≥ 3 más en el puesto que pide | −5 |
| Vale ≥ 10 más | −5 más (−10 en total) |
| Vale ≥ 20 más | −5 más (−15 en total) |
| Vale ≤ −3 (menos en el puesto que pide) | +8 |
| Vale ≤ −10 | +7 más (+15 en total) |

Sin vínculo con el entrenador (no debería pasar con club) no hay ajuste de relación. Rango total: 25 (amigo íntimo, vale ≥ 20 más) a 80 (enemigo, vale ≤ −10).

**Tabla de ejemplos: dificultad** (la stat es `gen.comunicacion` «para su edad»; ver la probabilidad abajo). Relación: baja = afinidad −20 (antipatía), media = 25, alta = 50 (amigo). Vale más = +15, igual = 0, menos = −6.

| Relación \ Vale | más (+15) | igual (0) | menos (−6) |
|---|---|---|---|
| baja | 55 | 65 | 73 |
| media | 40 | 50 | 58 |
| alta | 35 | 45 | 53 |

Probabilidad de éxito con una comunicación «para su edad» típica (40) y con una alta (60), `probabilidadDeExito` (50 % con stat = dificultad, ±15 puntos por cada 10):

| Dificultad | 35 | 40 | 45 | 50 | 53 | 55 | 58 | 65 | 73 |
|---|---|---|---|---|---|---|---|---|---|
| comunicación 40 | 58 % | 50 % | 43 % | 35 % | 31 % | 28 % | 23 % | 13 % | 5 % |
| comunicación 60 | 88 % | 80 % | 73 % | 65 % | 60 % | 58 % | 53 % | 43 % | 31 % |

Nota de diseño a revisar: el evento solo ofrece pedir el MEJOR puesto, así que `ventaja_del_mejor_puesto` es siempre ≥ 0 hoy y la columna «vale menos» no se alcanza (solo
saldría si un evento futuro pide un puesto concreto que no es el mejor). Las filas negativas ya funcionan (están probadas) para cuando haya un evento así.

**Tests:** `packages/contracts/src/sucesos/sucesos.test.ts` (los ajustes en general) y `tests/eventos-primeros.test.ts` (la tabla de arriba con el evento real). `npm run eventos:validar` en verde.
**Anexo:** `docs/ANEXO_EVENTOS.md` (formato de la tirada y tabla «qué tocar»).

## A. Prueba de acceso como acción + suceso, y «Pedir jugar…» en la ficha — HECHO (rediseño decidido por el usuario el 17/11)

Primera propuesta (pedir puesto en la ficha de un entrenador desconocido, en la prueba) **descartada**: el usuario decidió dos piezas.

**1. La prueba de acceso (clubes con puestos; kit, `club.ts`):** tres acciones y un suceso.
- `<d>.pedir_prueba.<club>` «Pedir hacer una prueba en X» (10 min, trámites del club, en sus horas; mismas condiciones de siempre: baja, plazo, edad, 8 semanas entre pruebas). Dice cuándo entrena el equipo (`textoDeSesiones`; el club tiene un solo horario: no hay horario por categoría). Estado: `pruebaPedida[club] = semana`.
- `<d>.prueba.<club>` «Unirte al entrenamiento de prueba» (5 min; **solo sale tras pedirla**, y sin prueba en curso): emite `club.prueba_empieza` con los huecos del equipo (`huecosDelEquipo`: puestos donde un candidato de 100 entraría «por hueco», con `NpcDirectory.plaza`) y el entrenador del club que lleva tu edad (`entrenadorDeClub`, conocido o no). Estado: `pruebaEnCurso = { club, puesto? }`.
- Suceso `<d>.prueba_de_acceso` (`sucesoDePruebaDeAcceso(cfg, textos)`, kit; textos del fútbol en `modules/futbol/src/eventos/textos_de_puesto.ts`): el entrenador se presenta (`presenta` → pasa a conocido). Con ≥ 2 huecos pregunta dónde quieres jugar: una opción por puesto, **ocultas salvo los huecos** (condición sobre el dato `huecos` de la señal), más «donde él vea»; elegir emite `club.prueba_puesto`, que el kit apunta en `pruebaEnCurso.puesto`. Con 0 o 1 hueco: aviso, solo se presenta. Plazo de 1 día, por defecto «donde él vea».
- `<d>.prueba_entrenar.<club>` «Entrenar a prueba con el equipo» (145 min; **no sale mientras el suceso espera respuesta**): hace lo que hacía la prueba (`pruebaPorPuestos`), midiendo la plaza en el puesto en que te han probado (el elegido; sin él, el que más vales prefiriendo hueco, y si no entras ahí pero sí en otro, te lo proponen, como antes). Al acabar, el log dice qué tal ha ido. Borra `pruebaPedida` y `pruebaEnCurso` y anota la semana de la prueba.
- Desaparecen `<d>.elegir_puesto.<puesto|ninguno>` y el campo `puestoElegido`. (Las partidas guardadas con ese campo lo ignoran.) Los clubes **sin puestos** (atletismo) mantienen su acción de prueba de siempre (`<d>.prueba.<club>`, 150 min).
- **Lo que he interpretado** (revisar): (a) Decidido por el usuario: pedir un puesto SIN hueco es posible; el entrenador dice que no pero te deja quedarte, y te prueba en el puesto que decida él. Hecho: el suceso ofrece todos los puestos (los huecos con respuesta afirmativa y el resto con la negativa) más «donde él vea». (b) Pedir y unirse se pueden hacer seguidos en la misma sesión (los dos exigen estar en horas del club): «te presentas a esa hora» es hoy el mismo tramo. (c) El número de huecos que se ofrece es el real del equipo (en el club mediano de la semilla 7, 7 puestos: CB, LB, RB, CDM, LCR, RCR, CM).

**2. Ya en el equipo: «Pedir jugar…» en la ficha de tu entrenador.**
- **Servicio común de conversación** (contracts, `conversacion.ts`): `ConversacionService.peticiones(npcId)` → `{ nombre, etiqueta, opciones[], sugerida, boton, minutos, prefijoDeAccion, motivo? }`. Cada módulo publica `conversacion.<id>`; `apps/web/src/gente.ts` (`bloqueDePeticiones`) dibuja las de la persona sin saber de qué trata (desplegable + botón con el id de la acción = prefijo + valor), igual que «Proponer quedar para…». En `apps/web` solo se ha tocado `gente.ts`.
- Kit (`puestos.ts`): `servicioDePedirPuesto(cfg)` (sale solo en la ficha de **tu** entrenador, con los demás puestos y el que más vales sugerido) y `resolverPedirPuesto(cfg)` (la acción `<d>.pedir_puesto.<entrenador>.<puesto>`, 5 min, no se lista; el módulo la pone en su `resolverAccion`). Disponible con el entrenador en su sede (como «Pedir consejo») y sin esperar (ver abajo).
- **Suceso `<d>.pedir_puesto`** (`sucesoDePedirPuesto(cfg, textos)`): sin opciones y con una **tirada de comunicación** con la dificultad de B (`ajustesDePedirPuesto`, mismas cifras provisionales; aquí la «ventaja» la calcula la acción: lo que vale en el puesto pedido menos lo que vale en el suyo, de verdad con signo, así que «vale menos» sí se alcanza). Concedido = `club.cambio_de_puesto` de siempre.
- **Ampliación general del formato** (documentada en `ANEXO_EVENTOS.md`): el efecto `{ tirada, exito: [efectos], fallo: [efectos] }` permite una tirada en un suceso **sin opciones** (el jugador ya eligió en otro sitio). Usa las mismas `ajustes`. Validado (stat, dificultad, ajustes) y recorrido en `eventos:validar`.
- **Para no preguntar todo el rato (el usuario aún no ha elegido; las dos cosas están hechas y son datos editables en `ConfigDeporte.pedirPuesto`, valores de partida en `PEDIR_PUESTO`):** *espera* (`esperaDias`, hoy **0 = sin espera**) y *mal rato* (`enfadoSiPocoTiempo`, hoy **28 días (4 semanas) y −3 de afinidad**: si se lo pides pasado menos tiempo desde la última vez, se lo toma mal, además de la tirada). **Decidido por el usuario: sin espera que bloquee; plazo de 4 semanas (`dias: 28`, editable) y, si se pregunta antes, mal rato: −3 de afinidad con el entrenador (cifra PROVISIONAL, la misma que llegar tarde a una convocatoria; se suma a la tirada normal).**
- **¿Sigue teniendo sentido el cambio de puesto del primer entrenamiento (`futbol.primer_entrenamiento`, opción «pedir_cambio»)?** Lo dejo: es una petición con contexto (el entrenador te acaba de decir dónde juegas), no la acción general, y usa las mismas cifras (`ajustesDePedirPuesto`, con el hecho `futbol.ventaja_del_mejor_puesto`). Lo que sí se solapa: pedirlo ahí no cuenta para la espera/mal rato de la ficha (`ultimaPeticionDePuesto`); si se quiere, es una línea. Si el usuario prefiere quitarlo y dejar solo la ficha, se borra la opción y su variante queda en «aceptar / preguntar».

**Tests:** `tests/prueba-de-acceso.test.ts` (los tres pasos, el suceso y que no queda «elegir puesto» en la lista), `tests/pedir-puesto.test.ts` (el servicio en la ficha del entrenador y no en otras, la acción por id, el mal rato), `tests/equipos-por-demanda.test.ts` (con el flujo nuevo, vía `hacerPruebaDeAcceso` de `tests/ayudas.ts`), `tests/eventos-primeros.test.ts` (tabla de B) y `packages/contracts/src/sucesos/sucesos.test.ts`.
**Anexos:** `ANEXO_EVENTOS.md` (efecto `tirada`, ajustes, sucesos del kit), `ANEXO_DEPORTE.md` (prueba y pedir puesto), `CIUDAD_Y_LIGAS.md` (el puesto se habla con el entrenador).
**Comprobado:** `npm run typecheck`, `npm run eventos:validar`, y el resultado de `npm test`, `npm run benjamin -- 31,33` y `npm run probar-web` (ambos usan `apuntarse_colegio`, no la prueba) en el mensaje final. Captura de la ficha: `docs/relevo/futbol-pedir-puesto-ficha.png`.
