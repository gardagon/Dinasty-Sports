# Plan: deportes que se instalan, conviven y se cambian

Plan por fases (29–30/10/2026). **Revisado con las decisiones del usuario del 30/10** (ver §7). Va **antes de nada del fútbol**: que el jugador pueda instalar y desinstalar deportes, practicar varios a la vez y cambiar cuando quiera, sin perder su historial y con los datos de cada país. El diseño propio del fútbol sigue en [`ANALISIS_FUTBOL.md`](ANALISIS_FUTBOL.md) (§3.4 a §3.8) y empieza cuando terminen estas fases.

---

## 1. Cuatro niveles

| Nivel | Qué es | Quién lo decide | Cuándo |
|---|---|---|---|
| **Disponible** | El deporte viene con el juego (catálogo de módulos de deporte) | El desarrollo | Al publicar una versión |
| **Instalado** | El deporte está en **esta partida**: sus habilidades, su estado, su gente y sus clubes existen | **El jugador** | Al crear la partida y en cualquier momento después (Opciones) |
| **Practicado** | El personaje hace ese deporte ahora (**hasta 4 a la vez**) | **El jugador** | En cualquier momento, dentro del juego |
| **Visible** | Sus acciones, su pestaña y su gente salen en la interfaz | Sale de «practicado» | — |

- **Los módulos base están siempre** (personaje, estudios, personas, clubes, familia, relaciones, lugares y el nuevo `deportes`). Solo los deportes se instalan y desinstalan.
- **Instalar un deporte en una partida empezada** crea lo que le falte: sus habilidades (con su genética, como ya hace el motor al cargar: `Game.fillMissing`), su estado, las secciones de sus clubes y **su gente**. Para esto último **primero se buscan personas que ya existen y encajan** (edad, intereses como «fútbol», capacidades) y **después se crean las que falten**. Puede tardar: se enseña una pantalla de espera («Preparando el fútbol: 180 personas…») y el jugador espera.
- **Desinstalar un deporte** lo quita de la partida pero **guarda su historial** (habilidades, resultados, clasificaciones, cursos), que queda dormido: el motor solo recorre lo registrado. Si se vuelve a instalar, se recupera tal cual. Su gente se queda (son personas con relaciones); opcionalmente, las que se crearon solo para ese deporte y el personaje no conoce se pueden archivar para aligerar la partida.
- **«Instalar» significa elegir entre los deportes que trae el juego**, no traer código de fuera: un deporte es código y ejecutar código de un archivo importado sería un riesgo de seguridad. Lo que sí se podrá importar como archivo, igual que un país, son **los datos de un deporte para un país** (§3, fase 3). Más adelante cada deporte puede ser un trozo de la web que solo se descarga si se instala, para que la máquina no cargue lo que no usa.

## 2. Reglas de practicar y cambiar (aprobadas el 30/10)

- **Dejar un deporte:** se sale de su club (`club.salir`), sus acciones y su pestaña desaparecen y sus habilidades caen con la caída normal (gracia de 4 días y suelo del 70 % de lo máximo alcanzado). El conocimiento casi no se olvida (30 días de gracia, suelo del 95 %).
- **Empezar o volver:** a mitad de curso si se quiere. Se entra sin club (se entrena por libre y se apunta después). Si ya se practicó, se recuperan sus habilidades, su historial y sus clasificaciones.
- **No se pierde nada:** relaciones con entrenadores y compañeros, resultados de cursos anteriores, historial por deporte («Atletismo: cursos 1 a 3; fútbol: desde el curso 2»).
- **Sin coste por cambiar**, salvo el plantón de un club si no se deja antes (como hoy). **Sin ningún deporte** también vale.
- **Varios a la vez (hasta 4; se prueba con 2):**
  - **El tiempo manda.** Si dos sesiones de club o dos competiciones coinciden, hay que elegir: el juego avisa del choque al apuntarse («los martes de 18 a 20 coincide con tu club de atletismo»).
  - **El cansancio es uno solo.** Hoy la sobrecarga (más de 2 sesiones al día) se cuenta **por deporte**: con dos deportes se podrían hacer 4 sesiones sin castigo. Pasa a contarse **entre todos los deportes** (todas las acciones con `entrenamiento`).
  - **Lo genérico se comparte** (la velocidad sirve para los dos) y **lo propio no** (cada deporte tiene sus habilidades y su conocimiento).
  - El verano según las notas da campamento **de uno** de los deportes que practicas (se elige) y la pestaña «Deporte» tiene un selector entre los practicados (ya existe).

## 3. Las fases

Estamos en alfa: **las partidas empezadas se pueden descartar** cuando cambie la forma del estado (se sube `SAVE_VERSION`, como hasta ahora). Lo que **sí** debe funcionar dentro de una misma versión es instalar y desinstalar deportes en una partida empezada. Cada fase es un PR que deja todo en verde; en las de reorganización, **`npm run sim` debe dar exactamente lo mismo** (es la prueba de que no se rompe nada).

### Fase G — Guardado manual y automático (independiente, se puede hacer ya)

Propuesta del usuario; detalle en [`ALMACENAMIENTO.md`](ALMACENAMIENTO.md) §8. Solo toca la interfaz, no choca con las demás fases y reduce lo que cuesta guardar partidas grandes.

### Fase 0 — Deportes instalados por partida

- `GameState.deportesInstalados` (lista de ids). El ensamblador (`packages/game`) separa **módulos base** y **catálogo de deportes**; `nuevaPartida` y `cargarPartida` montan la partida con los base y los deportes instalados en ella.
- **Instalar** = volver a montar la partida con un deporte más (lo nuevo se crea al cargar) y avisar a los módulos con el evento compartido `deporte.instalado`, para que creen lo suyo. **Desinstalar** = montarla sin él: su estado se conserva en el guardado y no se usa. Hay que probar que una partida con un estado «dormido» carga, se juega, se guarda y vuelve a cargar sin perderlo.
- **Interfaz:** en «Nueva partida», qué deportes instalar (hoy solo atletismo, marcado); en «Opciones», instalar y desinstalar, con la pantalla de espera y aviso de lo que se conserva.
- Una partida que tiene instalado un deporte que esta versión no trae **no se abre** y se avisa (igual que con un país no cargado).
- `sim` idéntico (las partidas de la simulación instalan atletismo).

### Fase 1 — Deporte practicado (hasta 4) y cambiar de deporte

- **Módulo `deportes`** (base): qué deportes se practican y el historial (`{ deporte, desde, hasta }`). Servicio `practica` (`practica(id)`, `actuales()`, `historial()`), eventos compartidos `deporte.empezar` y `deporte.dejar`, límite `MAX_DEPORTES_A_LA_VEZ = 4`.
- **Ocultar lo que no se practica:** campo genérico del motor `ActionDef.oculta(ctx)` (no sale ni en gris) y una ayuda en contracts, `soloSiPractica(deporte, acciones)`. Los manejadores diarios del deporte no hacen nada si no se practica.
- **Cansancio común:** la sobrecarga pasa de atletismo al módulo `deportes`, contando las sesiones de todos los deportes (con uno solo, las mismas cifras de hoy).
- **Atletismo detrás de la puerta:** «Empezar atletismo» y «Dejar el atletismo» en la administración del colegio. La nueva partida pregunta qué deportes se practican al empezar (de los instalados).
- `sim`: los bots empiezan practicando atletismo (mismas cifras). El bot «abandona el deporte» pasa a dejarlo de verdad: sus cifras cambian y el chequeo de la caída debe seguir en lo esperado.

### Fase 2 — Aportes: saber qué deportes hay sin conocerlos

- **Motor:** `GameModule.aportes` (datos declarados para un punto de extensión con nombre) y `ctx.aportes<T>(clave)`. El motor no sabe qué contienen.
- **Ficha de cada deporte** (`'deportes.catalogo'`): id, nombre, dónde se empieza. `deportes` ofrece «Empezar…» de todos los instalados; la interfaz los usa en «Nueva partida» y «Opciones»; `familia` sortea de ahí el deporte de los padres.
- `sim` idéntico.

### Fase 3 — Datos de cada deporte por país

Lo que cambia con el país **y** con el deporte. Hoy solo están las categorías (`PaisDef.categorias`), y el atletismo tiene textos de España escritos en el código («campeonato de España», «federación española»).

- **Un tipo común, `DatosDeDeporte`** (contracts, JSON serializable): categorías (nombres y edades), **temporada** (cuándo hay competición, pretemporada, semifinales y final, con su ancla: el curso escolar del país o el año natural, porque en algunos países la temporada no sigue al colegio), nombres de las competiciones y de la federación, clubes y sus secciones (fase 4) y puntos de las clasificaciones.
- **Dónde se busca, en este orden** (el primero que lo tenga gana):
  1. el **paquete de país**, si trae datos de ese deporte (`PaisDef.deportes[deporte]`, que sustituye a `PaisDef.categorias`);
  2. el **módulo del deporte**, si trae datos propios para ese país;
  3. el **modelo de España del módulo del deporte**, copiado con el nombre del país.

  Es lo mismo que ya hacen los países (`copiaDeEspana`), aplicado a cada deporte.
- **Importable:** «Importar datos de un deporte para un país (.json)», validado con errores en español, igual que los paquetes de país (`paquetes.ts`).
- El atletismo pasa sus constantes de temporada y sus textos de España a `DatosDeDeporte` de España. `sim` idéntico en España.

### Fase 4 — Clubes con secciones por deporte

- `ClubView` pasa de un horario por club a **secciones por deporte** (horario, acceso, sede y trámites de cada una). El catálogo de clubes (colegio, clubes de la ciudad) sigue en `clubes`; las secciones salen de los datos del deporte por país (fase 3).
- Una membresía de un deporte desinstalado se conserva sin efecto. Los choques de horario entre secciones de deportes practicados se avisan.
- `sim` idéntico.

### Fase 5 — La gente de cada deporte

Hoy `npcs` genera a mano a los rivales, los entrenadores, el equipo del colegio y los hermanos de atletismo.

- **Lo que necesita cada deporte, como dato** (`'npcs.poblacion'`): cuántos por edad, de qué capacidades sale su potencial, entrenadores por club y edades, alumnos del colegio que lo practican, sesgo de carácter e intereses. El atletismo aporta lo de hoy.
- **Reclutar y completar:** al instalar un deporte, `npcs` busca primero personas que ya existen y encajan (edad, interés en ese deporte, capacidades, que no estén ya en demasiados deportes) y les da nivel en él; **después crea las que falten**. Una persona puede hacer varios deportes (ya guarda un nivel por disciplina). La gente nueva se crea con su propio azar estable por deporte, sin cambiar la que ya existe.
- **Misma gente con la misma semilla** en partidas nuevas con solo atletismo: se genera en el mismo orden y con el mismo azar que hoy (`sim` idéntico).
- `npcs` guarda qué deportes ha poblado; al instalar uno nuevo lo puebla (con la pantalla de espera) y al desinstalarlo marca a su gente como «hacía…» y deja de hacerla progresar en él.
- **Lo que suponía atletismo se generaliza:** `aptitudDe('deporte')` mira el deporte de la actividad; los hermanos eligen deporte de los instalados; `relaciones` y `npcs` leen de `competicion.resultado` quién ha quedado por delante sin suponer que menos marca es mejor (campo opcional para que el atletismo no cambie).
- Cambia la forma del estado de `npcs`: se sube `SAVE_VERSION`.

### Fase 6 — El kit de deporte

Ver §4. El atletismo se reescribe sobre el kit sin cambiar ids, textos ni el orden del azar: `sim` idéntico.

### Fase 7 — Validación con dos deportes a la vez

- **Dos deportes de prueba** que solo existen en los tests, hechos con el kit (unas 100 líneas cada uno). Demuestran que un deporte se añade **sin tocar nada fuera de su módulo** y prueban, en una partida empezada: instalar uno, practicar los dos con el atletismo a la vez, dejar uno, desinstalarlo, cargar, volver a instalarlo y recuperar su historial.
- **Simulación:** cada bot elige deportes; `analysis.ts` mide los deportes de cada bot (no el atletismo fijo); un bot con **dos deportes** (el cansancio común no se salta, los dos progresan menos que uno solo pero más que nada) y un bot que **cambia de deporte** a mitad de curso.
- **Medida con 4 deportes instalados:** tamaño de la partida, tiempo de instalar (la espera) y coste por acción y por día. Con eso se ve si hace falta adelantar fases de `ALMACENAMIENTO.md`.
- **Documentación:** `ARQUITECTURA.md`, `ANEXO_DEPORTE.md`, `PAQUETES_DE_PAIS.md` y `CLAUDE.md` (checklist «Al añadir un deporte»).

**Después de la fase 7 empieza el fútbol**: debería tocar solo `modules/futbol`, su catálogo de datos por país, el mapa y las agendas.

## 4. El kit de deporte, explicado

Todos los deportes con club necesitan **las mismas piezas**: apuntarse al club del colegio, la prueba de acceso de un club de fuera y la plaza que te ofrecen, entrenar con el club (y llegar tarde), no entrenar por libre durante la sesión, pedir consejo al entrenador, el campamento de verano, verlo en la tele, subir a la categoría superior, el conocimiento del deporte y lo que traes de casa. Hoy esas piezas están escritas **dentro del atletismo**.

Para el fútbol hay dos caminos:

- **Copiarlas en el fútbol.** Es rápido, pero con 4 deportes la misma pieza estaría escrita 4 veces: un arreglo (p. ej. en la llegada tarde) habría que hacerlo 4 veces, y los deportes acabarían comportándose distinto sin querer.
- **Sacarlas a una «caja de piezas» común** (el kit) que cada deporte usa con sus propios datos (sus horarios, sus habilidades, sus textos). Cada pieza se escribe una vez y todos los deportes se comportan igual en lo que es igual.

Para el jugador **no cambia nada**; para desarrollar, cada deporte nuevo es más o menos un tercio del código y más fiable. El único coste es una regla: hoy un módulo solo puede usar `contracts` (el vocabulario común) y pasaría a poder usar también el kit. El kit, a su vez, solo puede usar `contracts`; ningún deporte puede usar a otro deporte ni al motor. El test de arquitectura lo seguiría vigilando. **Recomiendo hacerlo.**

## 5. Resumen

| Fase | Qué deja hecho | `sim` | Partidas |
|---|---|---|---|
| G | Guardar a mano y guardado automático elegible | Sin efecto | — |
| 0 | Deportes instalados por partida; instalar y desinstalar conservando el historial | Idéntico | Se descartan (versión nueva) |
| 1 | Deporte practicado (hasta 4), cambiar de deporte, cansancio común | Idéntico (salvo el bot que abandona) | Se descartan |
| 2 | Aportes y catálogo de deportes | Idéntico | — |
| 3 | Datos de cada deporte por país, con España de respaldo e importables | Idéntico | Se descartan |
| 4 | Clubes con secciones por deporte | Idéntico | — |
| 5 | Gente de cada deporte: reclutar y completar | Idéntico | Se descartan |
| 6 | Kit de deporte y atletismo encima | Idéntico | — |
| 7 | Dos deportes de prueba, bots con varios deportes, medida con 4 | Chequeos nuevos | — |

Las fases 3, 4 y 5 tocan `contracts/paises`, `clubes`, `npcs` y `relaciones`, que comparten el trabajo de países y otras líneas: conviene hacerlas en PR cortos y fusionarlos pronto.

## 6. Pendiente de decidir

1. **Kit de deporte (§4):** ¿sí?
2. **Orden de los datos por país (fase 3):** propongo que el paquete de país mande sobre los datos del módulo del deporte (así un país importado puede corregir un deporte sin esperar a una versión nueva). ¿O al revés?
3. **Guardado (`ALMACENAMIENTO.md` §8):** ¿se guarda siempre al cerrar la pestaña aunque el automático sea semanal o mensual?
4. **Archivar gente al desinstalar:** ¿se archivan las personas creadas solo para ese deporte que el personaje no conoce, o se conservan siempre?

## 7. Decisiones del usuario (30/10/2026)

- **Deportes como complementos de la partida:** se instalan y desinstalan los que se quieran y conviven mientras la máquina lo soporte; el historial de un deporte se guarda y se mantiene; al instalar uno se crean o se reubican personas según haga falta, aunque tarde (se avisa y se espera).
- **Alfa:** se pueden descartar las partidas empezadas.
- **Varios deportes a la vez:** hasta 4 en paralelo; probar con 2.
- **Reglas de cambio (§2):** valen, asegurando que no se rompe nada y que queda listo para futuros deportes.
- **Países:** calendarios, categorías y nombres cambian con cada país **y** cada deporte; si un módulo no trae datos propios para un país, se usa el modelo de España en el mismo formato.
- **Guardado:** botón de guardar en Opciones y guardado automático con la frecuencia que elija el jugador (diario, semanal, mensual), según lo que aguante su máquina.
