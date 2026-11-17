# Relevo: sucesos de contenido (lote 1)

Sesión `claude/sucesos-contenido-1`. Encargo: punto 3 de `docs/PLAN_EVENTOS.md` §7 ter (contenido, sin tocar el motor ni el formato). No se ha editado `DECISIONES.md` ni `PLAN_EVENTOS.md`.

## Qué se ha añadido

**Atletismo** (`modules/atletismo/src/eventos/`, aportado con `APORTE_DE_SUCESOS` en el módulo, como el fútbol):

| Suceso | Cuándo | Opciones |
|---|---|---|
| `atletismo.tarde_al_entrenamiento` | señal `club.sesion_tarde` con `sport = atletismo`; espera 21 días | disculparse (−1 afinidad), excusa (picardía 40; fallo −3/−1 confianza), **recuperar** (calentar deprisa y entrar en la serie; resistencia 40; fallo −2 y −3 energía), nada (−2) |

Igual que el del fútbol salvo la tercera salida, propia de la pista, y la espera: 21 días en vez de 6 (con 6, un bot que llega tarde casi siempre lo veía 54 veces al año; con 14, 27).

**Quince detalles ligeros** (`categoria: 'menor'`, textos con género, azar propio de cada uno). Cada archivo se creó con `npm run eventos:nuevo`, y agrupa los de su zona como `aula.ts` y `patio.ts`:

| Zona / archivo | Suceso | Disparo (prob.) | Espera (días) | Opciones y consecuencias |
|---|---|---|---|---|
| Aula `colegio/mas_aula.ts` | `cabeceo_en_clase` | `clase.asistida` (0,03), energía ≤ 50 | 12 | aguantar (concentración 40), agua (+2 energía), dormir (−2 afinidad con el profesor) |
| | `profesor_se_equivoca` | `clase.asistida` (0,03) | 90 | avisar (inteligencia 45: +2 afinidad / +3 estrés), apuntarlo para luego (+1), callar |
| | `trabajo_en_grupo` | `clase.asistida` (0,03) | 75 | repartir (+1), liderar (autoridad ≥ 12; −1 afinidad), dejárselo (−2) |
| Patio `colegio/mas_patio.ts` | `cambio_de_cromos` | llegada al patio (0,04), recreo | 60 | cambiar (+2), regatear (picardía 45), pasar |
| | `solo_en_el_patio` | ídem | 60 | sentarte (+3 afinidad, +2 confianza, empatía), invitar (+2), seguir |
| | `merienda_del_recreo` | ídem | 60 | aceptar (+2 afinidad, +2 energía), rechazar (−1) |
| Casa `casa/detalles.ts` | `ayudar_con_la_cena` | llegada a casa (0,04), 19–21 h, con un progenitor | 15 | ayudar (+2), protestando (+1), luego (−1) |
| | `cena_favorita` | llegada a casa (0,03), 19–21 h | 30 | aviso: −2 estrés, +1 afinidad |
| | `hermano_quiere_jugar` | llegada a casa (0,025), 16–20 h, con un hermano | 40 | jugar (+3), luego (−1), ganar (inteligencia 40) |
| | `noche_sin_sueno` | cada día (0,04), en casa desde las 21:30 | 20 | leer, agua, dar vueltas (−3 energía) |
| Barrio `barrio/detalles.ts` | `perro_suelto` | llegada al parque o a la avenida (0,02) | 60 | quieto, acariciar (empatía 40), correr |
| | `musico_en_la_avenida` | llegada a la avenida (0,03), 16–20 h | 40 | escuchar (−3 estrés), moneda (−1 dinero), seguir |
| | `moneda_en_la_acera` | llegada a una calle (0,01) | 90 | aviso: +1 dinero |
| Camino `camino/detalles.ts` | `companero_de_camino` | llegada a la calle del colegio (0,04), 7:15–8:10 | 45 | ir juntos (+2), carrera (velocidad 40), solo (−1) |
| | `se_hace_tarde` | llegada a la calle del colegio (0,03), 7:45–8:05 | 60 | correr (velocidad 40), andar, atajo |

Todas las cifras son **provisionales**. Cada suceso lleva sus `pruebas` donde hay horario o estado que comprobar (camino, cabeceo, noche); `npm run eventos:validar` recorre además todos los caminos en masculino y femenino.

## Qué se probó

- `npm run eventos:validar`: ✅ (57 sucesos; 298 caminos recorridos; 6 avisos que ya había, de marcas sin lector).
- `npm run eventos:mapa`: `docs/eventos/MAPA.md` regenerado.
- `npm run sim:eventos`: ver «Frecuencia» abajo.
- `npm test`: ✅ 89 archivos, 1076 tests (incluidos arquitectura y eventos). Con el atletismo en 21 días no se volvió a pasar `sim:eventos` completo; la cifra de arriba es la de 14.

## Frecuencia (cifras de `sim:eventos`)

Referencia sin mis cambios: 365 días × 2 semillas, 1,1–1,7 eventos por semana por bot (1,4 de media); 120 × 1, 1,2–1,6.
Con ellos (365 × 2, con la espera del atletismo en 14 días): 1,4–2,9 por bot, 2,2 de media, es decir, **unos 0,8 más por semana**, de los que algo menos de un tercio es el del atletismo (27 al año a quien llega tarde casi siempre; con 21 días baja a unos 18 y la media a ~2,0). Los quince detalles suman unos 35 al año por partida. **El cupo de detalles (2 al día, 8 a la semana) no llega a tocarse**, pero queda por encima de «1,2–2,3»: quien decida el ritmo debería mirar la cifra y, si hace falta, subir las esperas o bajar `prob` (ver abajo).

## Cosas que se vieron y conviene saber

- **Los bots no ven los sucesos de horario fino.** Llegan a la calle del colegio después de las 8:10 y no están en casa tarde, así que `companero_de_camino`, `se_hace_tarde` y `noche_sin_sueno` salen 0 veces en `sim:eventos`. Se comprueban con `pruebas` (hora y lugar) y con `eventos:validar`; en una partida a mano, con `sucesos.forzar.<id>`. Si se quiere verlos en la simulación, la rutina de los bots tendría que salir de casa antes (no se ha tocado: es de la sesión de bots).
- **Las vecinas y vecinos adultos no están en la calle cuando se llega** (ni son «conocidos»: son desconocidos hasta hablar). Un detalle de vecino con papel `{ tipo: 'vecino', presente: true }` no salió nunca en la simulación; se cambió por uno sin personas (`musico_en_la_avenida`). Si se quiere uno de vecinos, hace falta antes que los agendas los dejen cerca de la puerta de casa.
- `cabeceo_en_clase` salió muy poco (energía ≤ 50 casi nunca ocurre a los bots).

## Para quien siga

- Subir o bajar la frecuencia sin tocar el texto: el `prob` del disparo y la `espera` de `repite` (un suceso saturado por la espera ya no sube con más `prob`).
- Más detalles del mismo estilo: `npm run eventos:nuevo -- eventos.<área>.<nombre> "Título"` y copiar la forma de estos archivos (constantes de disparo y de papel arriba, una lista de `suceso`).
