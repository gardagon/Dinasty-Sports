# Relevo: gente por la calle (análisis y propuesta)

Sesión `claude/gente-por-la-calle` (sale de `claude/youthful-clarke-vs0kye`), 22/11/2026. Encargo de la arquitectura: poner **vecinos y gente parecida por las calles** para poder sembrar sucesos allí. **Solo análisis con propuesta: no se ha cambiado el juego**, ni `DECISIONES.md`, ni los anexos. `npm run huella -- 60` sale idéntica (ver «Comprobaciones»).

Se añadieron cuatro herramientas de medida en `tools/` (no tocan el juego):

| Herramienta | Qué hace |
|---|---|
| `tools/gente-por-la-calle.ts [--pais prueba\|actual\|grande]` | Quién hay en cada sitio del mapa, a cada hora, en un día de clase, un sábado y un día de verano, por tipo de persona (§1) |
| `tools/gente-por-la-calle-visibles.ts [actual\|grande]` | De los que hay en un lugar, cuántos vecinos adultos salen entre las 34–46 personas «cerca» (§1) |
| `tools/gente-por-la-calle-coste.ts [N…] [--crear]` | Añade N vecinos adultos de mentira a la ciudad grande y mide peso, guardado, presencia y pasada semanal; con `--crear`, crea la partida de verdad con más vecinos (§3) |
| `tools/gente-por-la-calle-propuesta.ts [N]` | Aplica **solo en la herramienta** las agendas propuestas en §2 y cuenta cuántos habría en cada calle (A: los que ya hay; B: con N nuevos) |

«Ciudad de prueba» en este documento son tres tamaños: **de prueba** (`PAIS_CIUDAD_DE_PRUEBA`, la de `huella`: 307 personas, 12 vecinos), **actual** (la de por defecto, 1.446 personas, 80 vecinos; es la que usa `npm run rendimiento` sin `--ciudad`) y **grande** (`PAIS_CIUDAD_GRANDE`, 6.113 personas, 80 vecinos).

---

## 0. Implementación de F1 y F2 (23/11/2026)

Encargo de la arquitectura tras las decisiones del usuario (`DECISIONES.md`, 23/11, «Gente por la calle»): **F1 y F2 juntas**, sin subir `CiudadDef.vecinos` (F3 serán los hogares, de otra sesión) y sin bebés ni mascotas todavía. Rama `claude/gente-por-la-calle` (unida con `origin/claude/youthful-clarke-vs0kye`). Las reglas, en `ANEXO_HORARIOS_PNJ.md` («Gente por la calle»).

### Qué hay

| Qué | Dónde |
|---|---|
| Ventanas de calle de 6:30 a 23:59 (pasos de 15 minutos con `p` por paso), marcas `vive`, `perro`, `jubilado`, `adulto`, `pequeno`, `trabaja`+`turno`; tipos nuevos `portero`, `conserje`, `repartidor`; oficio en su lugar; menores de 12 sin ir solos | `packages/contracts/src/agendas.ts` (`VENTANAS_DE_CALLE`, `vecinoEnLaCalle`, `trabajoEnUnLugar`, `TURNOS_DE_TRABAJO`) |
| Marcas por hash estable (sin gastar azar de la partida), etiquetas `perro` y `jubilado` y descripción («…siempre pasea a su perro», «…jubilada») | `ajustarVecinos` (`modules/npcs/src/index.ts`; al crear la partida y cada curso, como `recoge`) |
| Portero, conserje y 3 repartidores (desconocidos, con oficio y lugar de trabajo; azar propio `rngEstable`, no cambia lo que se genera después) | `puestosDeLaCalle` (`modules/npcs`) |
| 4 sucesos nuevos (`buenos_dias`, `banco_al_sol`, `el_portero`, `repartidor_se_equivoca`) y `perro_suelto` reescrito (con su dueño), con 3 versiones de cada texto de entrada y 2 o más de cada resultado | `modules/eventos/src/barrio/calle.ts` |
| Pruebas | `packages/contracts/src/agendas.test.ts` (10 nuevas), `tests/gente-por-la-calle.test.ts` (5), `tests/horarios-de-agendas.test.ts` (todos los tipos nuevos: nadie en un sitio cerrado) |

**Cada suceso de calle lleva dos variantes por papel opcional:** `nuevo` (desconocido: se presenta en el suceso) y `viejo` (ya lo conoces). Nadie empieza conocido.

### Dónde me he apartado de la propuesta (y por qué)

- **Pasos de 15 minutos, no de 10** (en la cuadrícula de cuartos de hora): menos cambios de presencia. Las `p` se escriben por cada 10 minutos y se escalan al paso. Los paseos del perro empiezan a las 6:30 (7:45 la mañana) y siguen de noche hasta las 23:30; vuelta a casa y paseo de noche hasta las 23:59.
- **Marca `adulto`:** la primera versión daba la ventana «de paso» a todos los `vecino` sin colegio, y como hay ~700 jóvenes de 18–19 años en la ciudad grande, a las 7:30 había 47 personas en la calle del colegio y casi ningún vecino. Ahora solo la llevan los `vecino_N` de 18 años o más. **Los jóvenes de 18–19 años siguen sin pisar la calle** (su agenda no cambia).
- **Quien trabaja en un lugar tiene nivel de pertenencia (3):** así sale antes que los clientes en «gente cerca» (en el supermercado se ven 3–4 trabajadores de las 38 personas que se ven, y en el restaurante 8 de 36; antes, 0–2).
- **El conserje sigue en la puerta del colegio en clase y en el recreo** (es lo realista y da pie a «llegar tarde»). Tres tests que miraban «la entrada se vacía» lo excluyen (`conserje_1`).
- **Niños pequeños que viven en una calle:** solo un 0,6 % en cada una (unos 12 por calle en la ciudad grande, 2 en la actual); el resto de los menores de 12 conserva su agenda sin supermercado ni restaurante.
- **`perro` admite una mascota:** `perro: true | string` (el texto sería la referencia a la mascota cuando existan con los hogares). Hoy es la marca en el dueño más la etiqueta `perro`.
- **Partidas anteriores:** las marcas se calculan al empezar el siguiente curso (`ajustarVecinos`); el portero, el conserje y los repartidores solo existen en partidas nuevas. Los sucesos que los piden no salen si no hay nadie (papeles opcionales).

### Medido, antes y después

Todos los «antes» con el commit original (una copia de trabajo limpia), los «después» con el final; mismas semillas.

| Prueba | Antes | Después |
|---|---|---|
| `npm run typecheck` | ✅ | ✅ |
| `npm test` | ✅ | ✅ 131 archivos, 1.412 tests (los 4 que fallaban tras la primera versión se arreglaron: tres miraban una entrada vacía y uno contaba cambios de presencia) |
| `npm run eventos:validar` / `eventos:mapa` | ✅ | ✅ (116 sucesos, 4.906 caminos; `docs/eventos/MAPA.md` regenerado) |
| `npm run benjamin -- 31,33` | — | **idéntico** |
| `npm run probar-web` | — | ✅ el camino entero en Chromium |
| `npm run sim:rapida` | ✅ (rendimiento 1,32–1,67 ms por acción según la pasada, límite 1,49–1,67) | ✅ en la última (1,55 ms, límite 1,57); en otras pasadas ⚠️ de rendimiento por poco (1,51–1,75). El ⚠️ «el esfuerzo hace progresar» (atletismo +4,6) **ya estaba antes** |
| `npm run sim:eventos -- 180 2` | media 5,0 por semana (equilibrado 6,1) | media 5,9 (equilibrado 6,9): **+0,9 por semana por bot** |
| `npm run huella -- 60` | referencia | **cambia** (ver abajo) |

**Ritmo por franja (sim:eventos, todos los bots):** antes de clase (7:00–8:10) **0,6 → 1,0** por semana; recreo, clases y mediodía igual (±0,1); **tarde (17:00–20:00) 0,4 → 0,4** (el equilibrado, 0,6 → 0,5); noche 0,4 → 0,4. Es decir: **el ritmo no sube por la tarde, sube por la mañana**: los bots ven los sucesos de calle sobre todo al salir de casa. Veces al año por bot (media): `buenos_dias` 19,6, `el_portero` 15,6, `banco_al_sol` 7,4, `repartidor_se_equivoca` 4,1, `perro_suelto` 3,2 → 7,4 (en total ~+50 al año, ~+1 por semana). Por lugar: `calle_casa` 0,5 por semana; `parque` y `avenida_parque`, casi nada (los bots van allí fuera de las horas de paseo). Si se quiere más vida por la tarde, hay que subir los `prob` de los sucesos de 17:00–20:00 (`el_portero`, `repartidor_se_equivoca`), no las agendas.

**Gente por calle y hora (`tools/gente-por-la-calle.ts`, ciudad grande; la actual, muy parecida):** antes, **0 personas en las 4 calles a cualquier hora**. Ahora (día de clase): 6:30 → 7 · 7:00 → 7 · 7:30 → 7 (casa 2, colegio 3, avenida 5, ya con el portero y los repartidores) · 8:30 → 1 · 10:00 → 4 · 17:00 → 9 · 18:00 → 7 · 19:00 → 10 (con la gente que vuelve) · 20:00 → 5 · 21:00 → 2 · 22:00 → 3. Sábado 10:00 → 9 (avenida 6); verano 10:00 → 13 (avenida 9). Los vecinos adultos en el mapa: 6–11 antes de las 9:00 (antes, 0), 11–15 de 21:00 a 23:59 (antes, 0). Con 63 adultos no se pasa de 13 a la vez, como estimé en §2.2 para la opción A.

**Los que se ven:** en el supermercado, de las 38 que se ven, 3–4 adultos (antes 0–2); en el restaurante a las 20:00, 8 de 36 (antes 0); en el parque, de 35–41, 0–1 (sigue lleno de niños, rivales y jóvenes).

**Rendimiento, ciudad grande** (`npm run rendimiento -- 30 --ciudad --pasadas 1` y perfil de CPU; **el equipo cambia de ritmo de una hora a otra ±30 %: solo valen las medidas A/B seguidas**): 6.113 → 6.118 personas; **estado 16.210 → 16.233 KB (+23 KB, +0,14 %: 5 personas y las marcas)**; crear, guardar, cargar y listas sin cambio apreciable; pasada semanal de los PNJ igual (100–400 ms según la hora); presencia, primera consulta tras cambio de tramo: igual (3 ms). **Tiempo por acción del bot** (A/B seguidas): 3,54–3,96 → 4,11–4,65 ms (**+15 % aprox.**, ~+0,6 ms). El perfil de CPU de 30 días de bot da +3,3 % en total (+0,48 s, de ellos la presencia ~+0,15 s: `construirAgendasDePresencia` +50 ms, `calcularLugar` +60 ms) y la mayor parte del resto es lo de los sucesos (`presente` pide toda la presencia del lugar, con su vista de cada persona: 1.300 en el parque). Pasar de pasos de 10 a 15 minutos no cambió la medida: el coste no está en el número de cambios de tramo. **Posible mejora, no hecha por no tocar la presencia:** que `presente` mire el índice sin crear la vista de cada persona.

**Huella (`npm run huella -- 60`):** cambia en los 16 bots y semillas, como se esperaba. Motivos: (1) la población crece en 5 personas (portero, conserje, 3 repartidores) y sus nombres entran en el registro (`futbol` cambia incluso al crear la partida: `5a5f4a3a870a → c76abfe26cb7`); (2) el estado de los vecinos lleva las marcas, las etiquetas y las descripciones nuevas; (3) los bots se cruzan con gente en la calle y con 5 sucesos nuevos, y cada decisión es una acción más (acciones de 60 días: equilibrado 2.302 → 2.317, madrugador 2.425 → 2.462, vago 1.469 → 1.520, aleatorio 2.801 → 3.162 con la semilla 2). **Nueva referencia (`npm run huella -- 60`, commit final):**

```
equilibrado  1 2317 408a5b98451c
equilibrado  2 2350 fb3f88601cfe
madrugador   1 2400 1df990c2a103
madrugador   2 2462 f821af3c6ccb
empollon     1 1793 3ac155baa19f
empollon     2 1836 6a8ecc490fee
atleta       1 2275 4f55082c6c02
atleta       2 2301 2dae037782c9
sobreentrena 1 2676 4a2307a0cbdf
sobreentrena 2 2666 af61617b99bc
vago         1 1520 931e46d4690d
vago         2 1520 130d61d96ff8
abandono     1 2248 0154784f3de8
abandono     2 2280 943748d79487
aleatorio    1 2996 fbcb0a243f64
aleatorio    2 3162 6e291bcfc8c2
futbol       31 c76abfe26cb7 c713dc0d7302
futbol       32 74ffda179741 4ab344928612
```

 Lo que **no** cambia: `benjamin`, y los bots cuya partida no pisa las calles de los vecinos mantienen sus acciones casi iguales (empollón 1.836 → 1.836).

### Qué queda (para F3 y después)

- **Hogares (F3, otra sesión):** `vive` es hoy por persona; con los hogares debería ser por hogar (todos los de la casa en la misma calle, y el portal). Los padres que recogen siguen sin vínculo con un hijo concreto.
- **Mascotas y bebés:** sin hacer. `perro` ya admite una referencia (`perro: 'id'`); el dueño pasaría a ser quien tenga la mascota.
- **Jóvenes de 18–19 años:** son la mayoría de lo que hay en el mapa de 9:00 a 14:00 y no pisan la calle. Si se quiere que lo hagan, es una decisión del usuario (tienen las mismas reglas que los adultos).
- **Los comercios de calle** (quiosco, panadería, frutería), la señal `calle.cruce` y la salida del club por la calle del estadio: sin tocar (F4).
- **Calibrar** los `prob` de los sucesos con más partidas; la tarde no sube (arriba).

---

## 1. Diagnóstico medido

### 1.1 Lo primero: nadie pisa nunca una calle

**En ninguna de las tres ciudades, a ninguna hora, en ningún día, hay una sola persona en `calle_casa`, `calle_colegio`, `avenida_parque` ni `avenida_estadio`** (las cuatro columnas salen vacías en las tres tablas de cada ciudad). El motivo es de datos: los destinos de todos los tramos de `agendas.ts` son lugares (`colegio`, `parque`, `supermercado`…) o zonas, **nunca una calle**; la gente aparece en un sitio al empezar su tramo y no «viene por la calle». Pero el personaje **sí pisa las calles**: se desplaza calle a calle (el viaje rápido solo sale de una calle) y en cada una emite `lugares.llegada` (de ahí salen `perro_suelto`, `musico_en_la_avenida`, `companero_de_camino`…). Es decir: el personaje cruza el barrio entero cada día y no se encuentra a nadie, aunque en el parque haya 1.300 personas.

(Tampoco las pisan los que entrenan: los del club están en `campo_municipal` o `estadio` desde 10 minutos antes de la sesión, nunca en `avenida_estadio`.)

### 1.2 Cuánta gente hay en el mapa, por hora y tipo de día

Miércoles de la semana 4 (día de clase), sábado de esa semana y miércoles de la semana 45 (verano). Cada celda es **actual / grande**. «Adultos» son los `vecino_N` de 18 años o más que están en algún sitio del mapa (de 61 / 63 que hay). Las columnas de calle (4) son siempre 0 y no se repiten.

**Día de clase**

| Hora | En el mapa | Colegio (entrada / aula / patio) | Parque | Super | Biblioteca | Restaurante | Adultos |
|---|---:|---|---:|---:|---:|---:|---:|
| 6:30–7:00 | 3 / 3 | — (casa: 2 padres y un hermano) | · | · | · | · | 0 |
| 7:30 | 514 / 514 | 502 en la entrada (alumnos) | · | · | · | · | 0 |
| 7:55 | 26 / 26 | 24 en el aula, 2 en casa | · | · | · | · | 0 |
| **8:30** | **0 / 0** | nadie | · | · | · | · | **0** |
| 9:00–12:00 | 89 / 396 | aulas llenas (fuera del mapa) | 44 / 206 | 34 / 135 | 11 / 55 | · | 34 / 37 |
| 10:50 (recreo) | 601 / 908 | 507 en el patio | 44 / 206 | 34 / 135 | 11 / 55 | · | 34 / 37 |
| 13:50 | 87 / 460 | 6 padres que recogen | 32 / 190 | 16 / 105 | 9 / 56 | 24 / 104 | 39 / 40 |
| 14:10 | 382 / 754 | 213 en la entrada, 80 en el patio, 8 padres | 32 / 191 | 14 / 103 | 10 / 56 | 24 / 104 | 40 / 40 |
| 14:40 | 290 / 1.716 | 13 | 107 / 692 | 69 / 444 | 26 / 197 | 64 / 359 | 36 / 37 |
| 15:30 | 542 / 2.190 | 4 | **297 / 1.300** | 135 / 592 | 77 / 265 | · | 30 / 32 |
| 20:00 | 245 / 1.575 | · | 115 / 712 | 85 / 527 | · | 42 / 333 | 32 / 35 |
| 21:00–7:30 | 3 / 3 | — (solo la familia en casa) | · | · | · | · | **0** |

**Sábado** (sin colegio): 8:30 → 1 persona en el mapa (el hermano); 9:00 → 241 / 1.413; 10:00–13:00 → 593 / 2.195 (parque 377 / 1.347, super 143 / 595, biblioteca 71 / 251; adultos 40 / 39); 21:00–22:00 → 93 / 93 (restaurante, sábado noche). **Vacaciones:** casi igual que el sábado, con la biblioteca y el parque algo más llenos de día (10:00 → 611 / 2.509) y el colegio vacío; antes de las 9:00 solo la familia.

**Ciudad de prueba** (307 personas, 12 vecinos, 9 adultos): 10:00 de un día de clase → 11 personas en el mapa (parque 5, super 4, biblioteca 2; 5 adultos), 15:30 → 103, 20:00 → 45; calles, siempre 0.

**De qué tipo son** (grande):

- **Día de clase 9:00–13:00:** en el parque, 189 jóvenes de 18–19 años sin colegio (de otros colegios y antiguos compañeros), 13 vecinos adultos, 3 que recogen y 1 jubilado; en el super, 120 jóvenes y 15 adultos; en la biblioteca, 49 jóvenes, 5 adultos y el bibliotecario. El resto de la población está en clase.
- **Día de clase 15:30:** en el parque, 577 niños de otros colegios o del barrio, 400 rivales, 200 jóvenes, 102 alumnos de tu colegio y **21 adultos** (el 1,7 %); en el super, 418 niños, 131 jóvenes, 37 alumnos y 6 adultos.
- **Sábado 10:00:** en el parque, 683 rivales, 592 niños, 203 jóvenes, 182 alumnos y 14 adultos.
- **20:00 de un día de clase:** en el restaurante, 249 niños de otros colegios, 78 jóvenes y 6 adultos.

### 1.3 Qué significa hoy «se queda fuera» (el 50 % de los vecinos adultos)

- **Fuera = `null` = fuera del mapa:** en su casa, en su trabajo o donde sea; no se guarda dónde. No es «ocupado» (no hay motivo ni estado): simplemente no está en ningún sitio al que puedas ir.
- **De dónde sale el 50 %:** el tramo del vecino (`vecino()` en `agendas.ts`) pone un destino «fuera» con peso 50 al lado de los lugares abiertos (parque 30, supermercado 20, restaurante 15 a la hora de comer y cenar, biblioteca 8). No es el 50 % de la gente sino **el peso de «fuera» frente a lo demás**: 46 % de 9:00 a 13:00 y de 15:00 a 20:00 entre semana, 41 % de 13:00 a 15:00, 43 % de 20:00 a 21:00. Medido, de los 61 adultos de la ciudad actual, a las 9:00 hay 27 fuera y 34 en el mapa (44 % fuera).
- **Se vuelve a sortear en cada cambio de tramo** (9:00, 13:00, 15:00, 20:00…, y los de los fines de semana, que son otros): el mismo vecino puede estar en el parque a las 12:00 y «fuera» a las 13:00. Dentro de un tramo no cambia (hash de persona, día y tramo).
- **Fuera del tramo (antes de las 9:00 y a partir de las 21:00) están siempre fuera, el 100 %.** Esto pesa más que el 50 %: es la razón de que de 8:00 a 9:00 el mapa esté vacío y de que el personaje no se cruce con nadie al salir de casa ni al volver.

### 1.4 Por qué no se les ve

1. **No hay adultos en las calles ni de 7:50 a 9:00 ni de 21:00 a 7:30** (§1.1 y §1.3). Justo cuando el personaje sale de casa o vuelve.
2. **Cuando el personaje está libre (de 14:30 en adelante y los fines de semana) los sitios están llenos de niños, rivales y jóvenes.** En la ciudad grande los adultos son el 1–2 % de los que hay en el parque (19–23 de 1.221–1.331) y entre las 35–46 que se ven salen **0–2** (medido: `gente-por-la-calle-visibles`; en la ciudad actual, 0–4 de 35–41). Son del último escalón al ordenar «gente cerca» (primero los conocidos, después el nivel y la relevancia del tipo —`vecino` es la más baja—, y a igualdad, un hash): comparten escalón con los 2.800 niños y jóvenes que también son `vecino`.
3. **Son desconocidos.** Al empezar solo se conoce a la familia. El reparto de los sucesos solo elige gente conocida salvo `conocido: false`, así que un papel `{ tipo: 'vecino', presente: true }` no sale nunca (lote 1 y lote 2 §1.4). *Ojo:* `presente` mira **toda** la presencia del lugar (`presencia.en(sitio)` sin límite), no solo las 34–46 que se ven; el límite de lo que se ve no es el problema de los sucesos, sí el de la pantalla.
4. **Son muy pocos y no crecen con la ciudad.** `CiudadDef.vecinos` es 80 en la actual y en la grande: **61 y 63 adultos** (el 4,2 % de 1.446 personas y el **1,0 % de 6.113**; solo 8 de 67 años o más y 14 / 10 con la marca `recoge`). La ciudad grande tiene 2.800 niños y jóvenes `vecino` (2.075 niños de otros colegios o del barrio, 701 jóvenes de 18–19).
5. **Los niños y jóvenes tienen la agenda de un adulto fuera del colegio.** Un niño de 8 años puede estar a las 15:30 en el supermercado (418 en la ciudad grande) y a las 20:00 en el restaurante (249): es incoherente y, además, es la mayor parte de lo que llena esos sitios.

---

## 2. Propuesta: quién debería haber por la calle

### 2.0 Cómo ponerlos (sin cambiar el motor)

- **Una calle es un destino más.** `Sitio = LugarId` ya admite `'calle_casa'`, `'calle_colegio'`, `'avenida_parque'`, `'avenida_estadio'`; la presencia se calcula por sitio de cada agenda (`sitiosDeAgenda`), así que no hace falta tocar `npcs`. Hay que comprobarlo con un test (nadie en un sitio cerrado: las calles no tienen horario).
- **Visitas cortas con los mecanismos que ya hay:** pasos de 5–10 minutos con `asistencia` (azar independiente por paso, igual que la salida y la recogida de los niños) y `delDia` (unos días sí y otros no). Con `asistencia = p` en cada paso de una ventana, cada persona pasa por la calle en promedio `n·p` pasos, a horas distintas. Los cambios de tramo caen en minutos compartidos por todos (múltiplos de 5 o de 10), así que la presencia sigue calculándose **una vez por intervalo**.
- **Quién es qué, por marca estable** (como `recoge`: `azarDe(marca, semilla, id)`, sin gastar azar de la partida, en `ajustarVecinos`, que ya se aplica también a partidas anteriores): `vive` (calle de casa, calle del colegio, avenida, o ninguna), `perro`, jubilado (67+), y los oficios que ya hay. Para que un suceso los pueda pedir (`reparto: { tipo: 'perro' }`), se espejan en `tags` (sin tocar el formato de sucesos; la alternativa es un filtro por `tipos` en `PapelDef`).
- **Que se note:** la `description` de quien pasea al perro puede decirlo («Vecina del barrio; siempre pasea a su perro»). Cuesta unos bytes y la ve el jugador sin hacer nada.
- **Personas guardadas, no agregadas.** Todos son `persona()` como el resto: nombre y apellidos por origen, rasgos, cuerpo, `known`. Se conocen preguntando el nombre (2 min) y desde ahí valen «Charlar un rato» y la relación. No hay «un jubilado cualquiera» sin datos.

### 2.1 Los tipos, con opciones

Cifras pensadas para **la ciudad grande** (la de la tabla de §3). «Existentes» = ampliar las agendas de los 63 vecinos adultos que ya hay; «nuevas» = personas que hay que crear (adultos de 25 a 85 años, 0,9 KB cada una).

| Tipo | Cuántos | Edad | Dónde y cuándo (tramos) | Existentes o nuevas | Conocer / charlar |
|---|---|---|---|---|---|
| **Vecinos del portal** que salen y vuelven | A: ~13 de los 63 viven en tu calle. B: ~44 de 213 | 25–66 | `calle_casa`: salir lun–vie 7:00–8:30 (`p` 0,12 por paso de 10 min); volver 17:30–20:30 (0,06); fin de semana 10:00–13:00 y 18:00–20:30 (0,07 / 0,05). Los de la calle del colegio y de la avenida, lo mismo en la suya | A: existentes. B: nuevas | Sí: es quien más veces se cruza; ideal para hilos |
| **Gente que pasea al perro** | A: ~12. B: ~33 (el 15 % de los adultos) | 25–80 | Lun–vie 6:40–7:40 (0,25) y 19:30–21:00 (0,2); fin de semana 9:00–12:00 y 19:00–21:00 (0,12), en `calle_casa`, `avenida_parque` o `parque`. El perro es texto (ver dudas) | Existentes (marca `perro`) | Sí; el dueño es el «papel» de los sucesos de perro |
| **Jubilados** en un banco | A: 8 (todos los de 67+). B: ~23 | 67–85 | Todos los días, `avenida_parque` o `parque` 10:00–13:00 y 17:00–19:30 (0,3 por paso); paseo corto por su calle por la mañana y por la tarde | A: existentes (pocos). B: nuevas | Sí; charlan, juegan al ajedrez, cuentan cosas |
| **Madres y padres con carrito** | ~8–12 (solo en B) | 25–40 | `avenida_parque`/`calle_casa`: lun–vie 10:00–12:00 y 17:00–19:00; sábado 10:00–13:00 | Nuevas (marca `peque`) | Sí; **el bebé es texto, no una persona** (ver dudas) |
| **Tenderos** (supermercado, restaurante, gimnasio; luego quiosco, panadería, frutería) | 4 en el super (dos turnos), 4 en el restaurante, 2 en el gimnasio | 20–65 | **Ya tienen oficio** (`OFICIOS_DE_VECINOS`: dependiente, camarero, cocinero, monitor) pero la agenda no se entera: hoy un dependiente va al super solo como un cliente más, algunos días y a ratos. Propuesta: quien tiene ese oficio **está dentro de su lugar en su horario de apertura** (por turnos, a la vista; «atendiendo» con `motivoOcupado` si no se puede hablar mientras trabaja). El quiosco, la panadería y la frutería no existen como lugares: ver fase 4 | Existentes (oficio → agenda) | Sí. Los de comercios nuevos, más adelante |
| **Repartidores** | 4–6 | 22–55 | Oficio nuevo `repartidor`: lun–sáb 10:00–13:00 y 17:00–20:00, paradas de 10 min en `calle_casa` y `calle_colegio` (0,05 por paso), en `ocupado` («descargando») si hace falta | Nuevas (o 4 taxistas actuales reconvertidos) | Sí |
| **Portero** (tu portal) y **conserje** (colegio) | 1 + 1 | 45–65 | Portero: `calle_casa`, lun–sáb 7:00–14:00 y 16:00–20:00, domingo 9:00–13:00. Conserje: la entrada del colegio (`colegio`) los días de clase 7:00–19:00. Son la cara fija de cada calle | Nuevas | Sí; el primer conocido «de verdad» del barrio |
| **Niños del barrio que juegan en la calle** | A: ~10–20 de los 2.075 (los que `viven` en tu calle); B: igual | 5–12 | Lun–vie 16:30–19:30 y fin de semana 11:00–13:00 y 17:00–20:00 en `calle_casa` o `parque` (`p` 0,25); **y dejan de ir solos al supermercado y al restaurante** | Existentes (no se crea ninguno) | Sí (ya existe «Charlar» y, con amistad, el catálogo de los niños del barrio) |
| **Padres que recogen** (ya existen: 14 / 10) | — | 25+ | Hoy solo en `colegio` de 13:45 a 14:30. Propuesta: que lleguen por `calle_colegio` (13:30–13:45) y se vayan por ella (14:05–14:40) | Existentes | Sí; **sigue pendiente el vínculo padre–hijo** |

### 2.2 Cuánta gente saldría (estimación con `tools/gente-por-la-calle-propuesta.ts`)

Aplicando las agendas de arriba solo en la herramienta, personas en cada calle en un instante (entre paréntesis, el máximo de los siguientes 20 minutos), ciudad grande:

| | A: los 63 que ya hay | B: 63 + 150 nuevos |
|---|---|---|
| Día de clase 7:00–8:10 (salir de casa) | calle_casa 0–3 · calle_colegio 1–6 · avenida 0–3 | calle_casa 2–8 · calle_colegio 4–13 · avenida 4–9 |
| Día de clase 8:30–17:00 | 0–2 (casi vacío) | 0–7 (el parque, de 10:00 a 13:00, sobre todo jubilados) |
| Día de clase 17:30–20:30 (volver) | 0–2 por calle | 0–9 por calle |
| Sábado 10:00–12:00 | calle_casa 0–2 · avenida 2–7 | calle_casa 3–4 · avenida 11–15 |

**Lectura:** con A (cero personas nuevas) hay gente casi todos los días a la hora de salir y volver, pero poca (hasta 6) y a ratos ninguna: sirve para empezar y probar, no para que el barrio se note. Con B se llega a 5–13 personas en las horas punta, que es lo que parece «una calle con vida» sin llenarla (la pantalla enseña de 34 a 46).

### 2.3 Qué sería «cruzarse»

Tres opciones, de menos a más trabajo:

1. **Coincidir en el mismo sitio a la vez (recomendada, fase 1).** Al llegar a una calle, el personaje ve en «Gente aquí» a quien hay (por su descripción física hasta que pregunte el nombre) y puede hablarle. No hace falta código nuevo: es la presencia. Los sucesos ya pueden engancharse a `lugares.llegada` con `cuando: { señal: 'hasta', es: 'calle_casa' }` y un papel `presente: true`, que mira la presencia completa del lugar.
2. **Una señal para los sucesos** (`calle.cruce`, emitida por `npcs` al llegar a una calle con alguien: quién y de qué tipo). **No hace falta** mientras `lugares.llegada` + `presente` + `tipo`/`edad` cubran el reparto; solo valdría para «te cruzas siempre con la misma persona» (hilo con reparto fijado, que ya existe). Dejarla para la fase 4 y decidirla con casos reales.
3. **Las dos.** Presencia + señal con la lista de quién está, para que un solo suceso reparta varios papeles («el portero y la vecina del 3.º»).

Consideración de horas: el personaje sale de casa entre las 7:00 y las 7:40 y vuelve de 14:00 a 15:00 o a las 17:00–19:00. Las ventanas de §2.1 están puestas para solaparse con eso. Los bots llegan a la calle del colegio después de las 8:10 (lote 1 y 2): para verlo en `sim:eventos` habría que adelantar su salida (es de la sesión de bots) o usar `pruebas`.

---

## 3. Coste

### 3.1 Referencia de la ciudad grande con fútbol (6.113 personas)

`npm run rendimiento -- 30 --ciudad --pasadas 1` y `tools/rendimiento-semana.ts --ciudad`:

| Medida | Valor |
|---|---|
| Crear la partida | 8,5–9,6 s |
| Estado guardado | 16.210 KB (npcs 16.186 KB); un vecino adulto pesa **933 B**, un niño de otro colegio 2.887 B, un compañero 2.839 B |
| Guardar (copiar / a texto) · cargar | 218 / 119 ms · 175 ms |
| Lista de acciones | 19 ms (31 ms la lista de todos) |
| Bot de 30 días | 2,61 ms por acción, 102 ms por día, 715 ms por semana |
| Presencia | 42 cambios de intervalo por día; la primera consulta tras un cambio cuesta 3,0–3,5 ms (máximo 7–8 ms) |
| Pasada semanal de los PNJ | 100–320 ms (la mayor parte son los niños con capacidades) |

### 3.2 Medido: añadir vecinos adultos (`gente-por-la-calle-coste`)

| Vecinos adultos añadidos | Personas | Estado | Guardar | 1.ª consulta de presencia | Pasada semanal |
|---|---:|---:|---:|---:|---:|
| 0 | 6.113 | 16.210 KB | 161–174 ms | 3,0–3,5 ms (máx 7–8) | 100–115 ms |
| +100 | 6.213 | +92 KB | 164 ms | 2,7 ms (máx 4,9) | 100 ms |
| +250 | 6.363 | +230 KB | 176 ms | 3,5 ms (máx 7,3) | 105 ms |
| +500 | 6.613 | +460 KB | 185 ms | 3,2 ms (máx 6,2) | 103 ms |

Con la partida creada de verdad con más vecinos (`--crear`: sube `CiudadDef.vecinos`, y un 25 % de los vecinos son niños, que pesan el triple): **230 vecinos → 6.261 personas, estado +205 KB (+1,3 %), crear 9,0 s** (frente a 8,5 s); **580 vecinos → 6.617 personas, +650 KB (+4 %), 9,2 s**. Los adultos nuevos de la propuesta serían todos adultos (0,93 KB), así que el peso es el de la tabla de arriba. **Nota:** al cambiar `vecinos` cambia el azar de todo el mundo (toda la gente generada después se desplaza), es decir, una partida nueva distinta, y la huella cambia.

Un vecino adulto no tiene capacidades ni genética, por eso no entra en la pasada semanal ni cuesta nada por semana.

### 3.3 Estimado (no se puede medir sin aplicar las agendas)

- **Más cambios de tramo por día:** las ventanas de §2.1 añaden unos **20–60 cambios de presencia al día** (de 42 a 60–100). Cada cambio obliga a recalcular la presencia de los sitios que se consultan (3 ms la primera consulta, 7–8 ms como máximo), pero **solo cuando alguien la pide**: en el juego se pide a cada acción (~40 al día), así que el coste está acotado por las acciones, no por los cambios de tramo: **≤ +1–3 ms por acción** en el peor caso, frente a 2,6 ms por acción hoy. El avance de un día entero (cruces de día, 2,5 ms) no cambia.
- **Agendas distintas:** hoy hay un puñado de agendas distintas de vecino (escolar, recoge, normal). Con las marcas `vive` (4) × `perro` (2) × jubilado (2) hay unas 12–16 combinaciones: se calcula una vez por agenda, no por persona.
- **Estado:** las marcas van dentro de `tipos` (~30 B por persona afectada: unos 2 KB en total para los 63 de hoy) más los `tags` espejados (~10 B).
- **Personas nuevas** (fases 2 y 3): ~10 personas fijas (portero, conserje, repartidores) = 9 KB; +150 adultos = +140 KB (+0,9 %); +100 ms al crear.
- **Sucesos:** los de calle con `presente: true` piden la presencia del lugar (ya se calcula para el aforo). Coste despreciable; lo que hay que vigilar es la **frecuencia** (cupo de detalles, `sim:eventos`), no el tiempo.
- **Huella (`npm run huella`):** cambiará en cuanto cambien las agendas (los bots charlan con quien hay cerca y su presencia cambia) o los niños dejen de ir al super. Hay que acordar con la arquitectura una huella nueva de referencia **al aplicar la fase 1**, y comprobar `tests/horarios` (nadie en un sitio cerrado) y los de agendas.

---

## 4. Qué sucesos permitiría

Todos con `categoria: 'menor'` salvo los hilos, con `disparo: { al: 'lugares.llegada', prob }` y `cuando` por calle y hora. Papel sin persona nueva donde se puede.

| Suceso (ejemplo) | Dónde y cuándo | Papel de reparto | Qué pasa |
|---|---|---|---|
| **Buenos días, vecina** | `calle_casa`, 7:00–8:30 | `{ rol: 'vecino', edad: { min: 25 }, presente: true, conocido: false }` | Saluda al salir; presentarse (`presenta`) o seguir. Si ya la conoces, otra variante |
| **El perro y su dueño** (mejora `perro_suelto`) | `avenida_parque` o `parque`, 6:40–7:40 y 19:30–21:00 | `{ tipo: 'perro', presente: true, conocido: false }` | El perro viene a ti; el dueño se disculpa; devolver la pelota, acariciar (empatía) o apartarte. Hilo: «el perro te reconoce» |
| **Se te cae algo / la bolsa rota** | `calle_casa`, 17:30–20:30 | `{ rol: 'vecino', edad: { min: 25 }, presente: true, conocido: false }` | Ayudar a recoger, mirar o seguir (+ afinidad) |
| **Un banco al sol** (jubilado) | `parque` o `avenida_parque`, 10:00–13:00 y 17:00–19:30 | `{ tipo: 'jubilado', presente: true }` (ya conocido o no) | Te cuenta algo / te propone ajedrez (tirada de inteligencia) / te da un consejo |
| **El portero te dice algo** | `calle_casa`, de día | `{ tipo: 'portero', presente: true }` | Hilo de 2–3 pasos: paquete para tu familia, llaves perdidas, el vecino que se queja |
| **Un repartidor se equivoca de portal** | `calle_casa` o `calle_colegio`, 10:00–13:00 y 17:00–20:00 | `{ tipo: 'repartidor', presente: true, conocido: false }` | Indicar, ayudar con las cajas o ignorar |
| **El carrito en la puerta** | `calle_casa` o `avenida_parque`, 10:00–12:00 y 17:00–19:00 | `{ tipo: 'peque', presente: true, conocido: false }` | Ayudar a subir el carrito (texto: el bebé; no es una persona) |
| **Los de la calle juegan a la pelota** | `calle_casa`, 16:30–19:30 y fines de semana | `{ rol: 'vecino', edad: { max: 12 }, presente: true, conocido: false }` | Te piden jugar (liga con «Jugar con otros niños»), te devuelven la pelota o te regañan |
| **El quiosco / la panadería** (fase 4) | un lugar en `calle_casa` | `{ tipo: 'tendero', presente: true }` | Cromos, pan, un recado de tu madre; ligan con el dinero cuando haya |
| **Una conversación en el colegio a las 14:00** | `colegio` (entrada), 13:45–14:30 | `{ rol: 'vecino', edad: { min: 25 }, presente: true }` (los que recogen) | Un padre pregunta por el entrenamiento; con el vínculo padre–hijo, sería «el padre de tu compañero» |
| **Te felicitan por el partido** | `calle_casa` o `avenida_parque` tras ganar | `{ tipo: 'vecino', presente: true }` + marca de `futbol` | Una vecina o el portero comentan el partido (cierra una marca que hoy nadie lee) |

Es la clase de sucesos que hoy **no se pueden escribir**: con los vecinos fuera de la calle y desconocidos, el lote 1 los descartó y el lote 2 (§1.3 y §1.4) los listó como hueco (calle, camino de vuelta, la salida, la tarde en el parque, vecinos). Cada uno se escribiría con `npm run eventos:nuevo` sin tocar el motor.

---

## 5. Fases, recomendación y dudas

### 5.1 Fases

| Fase | Qué | Personas nuevas | Notas |
|---|---|---|---|
| **F1. Calles con los que ya hay** | Ventanas de calle en la agenda del vecino (`vive`, `perro`, jubilados), niños pequeños que dejan de ir solos al super y al restaurante, `description` y `tags` espejados, el oficio manda sobre el super, restaurante y gimnasio, test de calles (nadie en un sitio cerrado) y anexo de horarios | 0 | Cambia la huella. Entran 4–5 sucesos de calle para probarlo. Con los 63 de hoy, 0–6 personas por calle en hora punta |
| **F2. Puestos fijos** | Portero y conserje, 2–4 repartidores, y quien trabaja en un lugar lo ocupa | ~10 | +9 KB. Primeros hilos (portero, repartidor) |
| **F3. Más vecinos** | `CiudadDef.vecinos`: 80 → ~230 en la ciudad grande (+150 adultos de 25–85, con un 20 % de jubilados y un 15 % con perro); la actual se queda | +150 | +140 KB (0,9 %), +0,5 s al crear; con ellos 5–13 por calle en hora punta. Un solo número, reversible |
| **F4. Opcional** | Lugares de comercios en `calle_casa` (quiosco, panadería, frutería: dato del mapa), señal `calle.cruce`, hogares de vecinos (padre/madre con hijos concretos, `hogar` en los vecinos), bebés | según se decida | Esperan al dinero y al vínculo padre–hijo |

### 5.2 Recomendación

**F1 + F2 juntas, medir con `sim:eventos` y los sucesos de prueba, y después F3 (+150 adultos).** F1 sola da algo, pero con 63 adultos en 6.000 personas el barrio sigue pareciendo vacío fuera de las horas de entrada y salida; el coste de F3 es de un 1 % de peso y no cuesta nada por semana. La señal `calle.cruce` y los comercios, solo cuando haya sucesos que la pidan. Que cada fase cambie la huella y se acepte la nueva, no que se intente mantenerla.

### 5.3 Dudas para el usuario (cada una con mi recomendación)

1. **¿Cuántos adultos?** A (los 63, sin personas nuevas), B (+150, unos 215 en total) o C (+500, unos 560). *Recomiendo B* (la ciudad grande; la actual sigue con 80): es lo que hace que se note sin llenar la pantalla.
2. **¿Alguien empieza conocido?** Hoy solo la familia. *Recomiendo que nadie*: el portero y los vecinos de tu calle se conocen en un suceso («Buenos días»), que es justo lo que se quiere contar.
3. **¿Los perros son personas, objetos o solo texto?** *Recomiendo texto y una marca en el dueño* (`perro`): un perro no es persona del mundo y los sucesos solo necesitan al dueño.
4. **¿Los bebés de los carritos son personas?** *Recomiendo que no:* el mundo solo genera niños desde los 8 años y un bebé no volvería a salir hasta entonces. Texto, y una marca `peque` en un adulto joven. Si algún día nacen niños en el mundo, se revisa.
5. **¿Los niños pequeños dejan de ir solos al supermercado y al restaurante?** *Recomiendo que sí* (menores de 12, y quizás del gimnasio): arregla algo incoherente y baja el ruido de esos sitios (unos 400 niños menos en el super a las 15:30). Cambia un poco las agendas de alumnos y vecinos niños (anexo de horarios).
6. **¿Los que trabajan en un lugar (dependiente, camarero, monitor) están allí en su horario?** *Recomiendo que sí* y a la vista: ya tienen el oficio y hoy la agenda no lo usa. El quiosco, la panadería y la frutería (lugares nuevos) esperan a F4.
7. **¿Hasta qué hora y desde cuál hay gente por la calle?** *Recomiendo de 6:40 a 21:00* (paseos del perro por la mañana y por la noche, repartidores y portero de día). La noche y la madrugada, vacías.
8. **¿Vínculo padre–hijo y hogares?** Es lo que haría que «un padre que recoge» fuera «el padre de tu compañero». *Recomiendo dejarlo para F4*, cuando se decida cómo se relacionan los vecinos adultos con los niños concretos.
9. **¿Hay que arreglar el orden de «gente cerca»** (los adultos desconocidos van los últimos en el parque)? *Recomiendo no tocarlo:* en las calles habrá poca gente y todos se ven; para el parque, es un problema de la pantalla que se estudia aparte si molesta.
10. **¿Los jóvenes de 18–19 años, que hoy son la mayoría de «adultos» que se ven a mediodía,** siguen con la agenda del vecino? *Recomiendo que sí* por ahora; en F1 pasan por el mismo cambio de calles que los adultos.

### 5.4 Riesgos y lo que hay que vigilar al aplicar

- La **huella** cambia (F1): acordar la referencia nueva y pasar `npm test` (arquitectura, horarios, agendas, eventos) y `npm run sim:eventos` para calibrar la frecuencia de los sucesos de calle (lo que ya se dijo de los bots que no pisan la calle antes de las 8:10).
- **«Moverse con el grupo»** (`ANEXO_HORARIOS_PNJ.md`): solo avisa si ≥ 3 personas van a un mismo sitio del mapa y se va la mitad de los que tienes cerca; quien sale del mapa («fuera») no cuenta. Con grupos pequeños en la calle no debería saltar, pero hay que probarlo con una charla en `calle_casa` a las 8:30.
- **Cupos de sucesos:** más lugares con gente aumenta lo que puede salir; hay que vigilar `sim:eventos` y subir las esperas antes que bajar la probabilidad.
- **Descripción física:** con más adultos, la `description` del vecino («Vecina del barrio») se repite; conviene la variante por marca.
- **Partidas anteriores:** las marcas se calculan en `ajustarVecinos` (como `recoge`), sin migrar; el cambio de `CiudadDef.vecinos` solo afecta a partidas nuevas.

---

## Comprobaciones

- `npm run typecheck`: ✅ (incluye las cuatro herramientas nuevas).
- `npm run huella -- 60`: **idéntica** a la de antes de empezar (ver el commit).
- Medidas: `npx tsx tools/gente-por-la-calle.ts`, `tools/gente-por-la-calle-visibles.ts`, `tools/gente-por-la-calle-coste.ts 0 100 250 500 --crear`, `tools/gente-por-la-calle-propuesta.ts 0` y `… 150`; `npm run rendimiento -- 30 --ciudad --pasadas 1`; `npx tsx tools/rendimiento-semana.ts --ciudad`. Semilla 31 y `deportes: ['atletismo', 'futbol']`.
- **Lo que no se midió:** el efecto real de las ventanas de calle sobre los tiempos (se estima en §3.3 porque exige aplicar las agendas), la frecuencia de sucesos nuevos y la presencia de quien entra a una sesión de club por la calle del estadio (hoy van directos al lugar).
