# El verano del usuario: medida (25/11/2026)

Solo medida, sin cambiar el juego. Semillas 51–60, ciudad grande con hogares, chicas al ~10 %, chicos y chicas por separado desde infantil (`tools/verano-sexos.ts`, `tools/creacion-deshace.ts`).

## A) Primero, explicar y contar

### A1. Por qué la creación deshace el reparto nuevo (problema 1)

En lenguaje llano. El reparto nuevo decide quién va a cada club y a cada equipo (A, B, C, D) con tamaños de 14 a 22. Después, la creación sigue con tres piezas del juego antiguo, que **no conocen** ese reparto ni su máximo de 22:

1. **`cubrirGruposVacios`**: si un equipo se queda sin un grupo de puestos (por ejemplo, sin portero), pone a un suplente de otro puesto a cubrirlo. **Solo cambia de puesto a un niño; no cambia a nadie de club ni de equipo.** No es la causa.
2. **`sinSobrantes` (con `acomodarSobrantes`)**: «quien está en un club está en uno de sus equipos». Para saberlo, no usa el reparto: **vuelve a calcular los equipos del club** a partir de sus niños, del número de equipos del club (`k`) y de un máximo de 18 por equipo (más 1–2 plazas de más), **con los cupos de cada grupo de puestos** (por ejemplo, no más de dos porteros en un equipo de 18). Quien «no cabe» en ninguno de esos equipos recalculados (porque hay más niños que el máximo de 18, o más porteros que el cupo) primero recibe la oferta de cambiar de puesto; si no acepta, **deja el club y busca otro** (en tres rondas; en la última queda apartado). Y luego aplica la regla antigua de contar equipos con el total del club: **si el club se queda con menos de 14 × equipos, cierra un equipo** y vuelve a repartir, y con él salen más niños.
3. **`plazasDeMas`**: al final, al niño con interés que sigue sin equipo lo mete en el club con el equipo más cercano a su nivel, aunque se pase del máximo en 1–2 plazas.

Así, los equipos que el reparto ha dejado en 20 o 22 niños (o con 3 porteros) pierden a los que no caben, y esos niños acaban repartidos en otros clubes con letras que les pone `fijarEquipos`. Por eso salen equipos de 1–6 niños (los que reciben un solo desplazado) y de 23 (los que reciben varios).

**Ejemplo, semilla 51, benjamín** (chicos y chicas mixtos): el reparto deja 311 niños. Al acabar la creación, **274 siguen en el mismo club y equipo, 35 han cambiado de club y 2 han quedado apartados.** Por ejemplo, `club_grande` tiene 2 equipos y 34 niños: «no caben 3», salen; vuelve a mirar, «no caben 1», sale; y otra vez… hasta que se estabiliza. `club_pequeno2`, con 14 + 14 en el reparto, pasa a 14 + 6: 8 de sus niños habían salido (no caben en los equipos que recalcula: máximo de 18 y cupos por puestos; con menos de 28 le toca cerrar un equipo), y el B se queda con 6 mientras otros clubes reciben a esos 8 en equipos que ya tenían 22. Resultado en el estado de la partida: 21 equipos de benjamín, 6 de ellos por debajo de 14 (el menor, 1 niño; el mayor, 23).

**Por categoría (10 semillas, media y rango):** niños que cambian de club tras el reparto: benjamín 44 (10–78), alevín 50 (30–58), infantil 44 (27–62), cadete 50 (20–73), juvenil 56 (28–81) (el 15–18 % de los que reparte); apartados sin equipo: 3,5 · 2,2 · 3,4 · 6,8 · 83; equipos por debajo de 14 en el estado de la partida: **4,7 · 5,5 · 10,3 · 12,8 · 9,5** (benjamín a juvenil), con 0 en el reparto.

**¿Hay más causas durante el curso?** **No.** Se ha medido el estado en la semana 0, la 6 y la 48: **ningún niño cambia de club ni de letra, ninguno lo deja y ninguno entra** entre la semana 0 y la 48 (0 en todas las semillas). Hoy no hay abandonos ni fichajes a mitad de curso: todo ocurre en el verano. Los equipos por debajo de 14 de la semana 48 son los mismos de la semana 0: vienen de la creación. El problema 2 (el verano deshace equipos) tiene entonces la misma raíz: **hay que partir de un estado limpio.** Para que lo sea en las medidas siguientes se añade una bandera (`MEDIDA.respetarReparto`): `sinSobrantes` solo fija las letras (no recoloca) y `plazasDeMas` no actúa.

### A2. Al llegar el verano: quién sale al mercado y cómo queda cada equipo sin ellos

Con el estado limpio (bandera anterior), con las reglas de hoy. «Sale al mercado» = abandona + busca otras oportunidades (va a probar a otro club, hacia uno mejor o un suplente de un grande hacia uno menor). Media y rango de las 10 semillas.

| | Jugaban | Abandonan | % | Buscan fuera (a probar) | % | Salen al mercado | % |
|---|---|---|---|---|---|---|---|
| benjamín (mixto) | 307 (287–339) | 26 (18–34) | 9 % | 35 (29–43) | 11 % | 62 | 20 % |
| alevín (mixto) | 301 (270–321) | 26 (20–35) | 9 % | 38 (29–50) | 13 % | 65 | 22 % |
| infantil chicos | 277 (239–297) | 26 (21–33) | 9 % | 40 (24–53) | 14 % | 66 | 24 % |
| cadete chicos | 279 (258–296) | 50 (37–58) | 18 % | 30 (19–39) | 11 % | 80 | 29 % |
| juvenil chicos | 301 (198–372) | 92 (58–129) | 31 % | 20 (12–27) | 7 % | 112 | 37 % |
| infantil chicas | 33 (22–44) | 3 (1–7) | 9 % | 1 (0–3) | 2 % | 3 | 10 % |
| cadete chicas | 37 (35–43) | 7 (4–9) | 18 % | 1 (0–2) | 2 % | 8 | 21 % |

**Cómo queda cada equipo sin ellos**, por tipo de club (media de equipos por club; por debajo de 14 con el tamaño al acabar el curso, sin los que abandonan, y sin los que abandonan ni buscan fuera):

|  | Club | Equipos | Tamaño medio al acabar el curso | sin los que abandonan | sin los que abandonan ni buscan fuera | Por debajo de 14: antes · sin abandonos · sin abandonos ni buscadores |
|---|---|---|---|---|---|---|
| benjamín (mixto) | colegio | 4.9 (4.0–6.0) | 18.0 | 16.4 | 15.3 | 0.0 (0.0–0.0) · 0.7 (0.0–2.0) · 1.3 (0.0–2.0) |
| benjamín (mixto) | pequeno | 5.9 (5.0–8.0) | 14.5 | 13.2 | 11.1 | 0.0 (0.0–0.0) · 3.8 (2.0–5.0) · 5.4 (4.0–8.0) |
| benjamín (mixto) | mediano | 6.0 (6.0–6.0) | 15.7 | 14.4 | 11.7 | 0.0 (0.0–0.0) · 3.1 (2.0–5.0) · 4.7 (2.0–6.0) |
| benjamín (mixto) | grande | 2.0 (2.0–2.0) | 19.5 | 17.9 | 17.5 | 0.0 (0.0–0.0) · 0.1 (0.0–1.0) · 0.5 (0.0–2.0) |
| alevín (mixto) | colegio | 3.9 (3.0–5.0) | 18.9 | 17.1 | 15.8 | 0.0 (0.0–0.0) · 0.7 (0.0–2.0) · 1.1 (0.0–3.0) |
| alevín (mixto) | pequeno | 6.3 (5.0–8.0) | 14.6 | 13.1 | 10.8 | 0.0 (0.0–0.0) · 4.4 (2.0–6.0) · 5.5 (4.0–7.0) |
| alevín (mixto) | mediano | 6.0 (6.0–6.0) | 15.8 | 14.6 | 11.5 | 0.0 (0.0–0.0) · 3.0 (1.0–6.0) · 4.8 (3.0–6.0) |
| alevín (mixto) | grande | 2.0 (2.0–2.0) | 20.1 | 19.0 | 18.8 | 0.0 (0.0–0.0) · 0.1 (0.0–1.0) · 0.1 (0.0–1.0) |
| infantil chicos | colegio | 2.1 (1.0–4.0) | 15.5 | 13.8 | 12.5 | 0.0 (0.0–0.0) · 1.1 (0.0–3.0) · 1.5 (1.0–3.0) |
| infantil chicos | pequeno | 5.8 (4.0–7.0) | 14.8 | 13.1 | 10.7 | 0.0 (0.0–0.0) · 3.7 (1.0–5.0) · 5.2 (3.0–7.0) |
| infantil chicos | mediano | 7.1 (7.0–8.0) | 16.9 | 15.5 | 12.3 | 0.0 (0.0–0.0) · 2.9 (2.0–4.0) · 4.8 (3.0–7.0) |
| infantil chicos | grande | 2.0 (2.0–2.0) | 19.4 | 17.9 | 17.7 | 0.0 (0.0–0.0) · 0.2 (0.0–1.0) · 0.2 (0.0–1.0) |
| cadete chicos | colegio | 2.3 (0.0–4.0) | 15.3 | 11.7 | 10.7 | 0.0 (0.0–0.0) · 2.0 (0.0–3.0) · 2.2 (0.0–4.0) |
| cadete chicos | pequeno | 6.1 (4.0–7.0) | 14.8 | 11.7 | 9.9 | 0.0 (0.0–0.0) · 5.2 (2.0–7.0) · 5.9 (2.0–7.0) |
| cadete chicos | mediano | 6.0 (6.0–6.0) | 16.8 | 13.7 | 11.2 | 0.0 (0.0–0.0) · 3.5 (1.0–5.0) · 4.4 (1.0–6.0) |
| cadete chicos | grande | 2.9 (2.0–3.0) | 18.2 | 16.8 | 16.2 | 0.0 (0.0–0.0) · 0.3 (0.0–1.0) · 0.6 (0.0–2.0) |
| juvenil chicos | colegio | 1.0 (0.0–2.0) | 20.0 | 13.2 | 12.6 | 0.0 (0.0–0.0) · 0.4 (0.0–1.0) · 0.6 (0.0–2.0) |
| juvenil chicos | pequeno | 5.7 (5.0–8.0) | 21.6 | 14.4 | 12.9 | 0.0 (0.0–0.0) · 2.0 (0.0–6.0) · 3.3 (1.0–7.0) |
| juvenil chicos | mediano | 5.1 (3.0–7.0) | 21.9 | 15.6 | 13.5 | 0.0 (0.0–0.0) · 0.9 (0.0–3.0) · 2.8 (1.0–5.0) |
| juvenil chicos | grande | 2.1 (1.0–3.0) | 22.0 | 16.5 | 16.2 | 0.0 (0.0–0.0) · 0.1 (0.0–1.0) · 0.2 (0.0–1.0) |
| infantil chicas | mediano | 0.1 (0.0–1.0) | 14.0 | 14.0 | 11.0 | 0.0 (0.0–0.0) · 0.0 (0.0–0.0) · 0.1 (0.0–1.0) |
| infantil chicas | grande | 1.8 (1.0–2.0) | 17.3 | 15.8 | 15.6 | 0.0 (0.0–0.0) · 0.2 (0.0–1.0) · 0.3 (0.0–1.0) |
| cadete chicas | mediano | 0.1 (0.0–1.0) | 16.0 | 11.0 | 9.0 | 0.0 (0.0–0.0) · 0.1 (0.0–1.0) · 0.1 (0.0–1.0) |
| cadete chicas | grande | 1.9 (1.0–2.0) | 18.8 | 15.5 | 15.1 | 0.0 (0.0–0.0) · 0.5 (0.0–1.0) · 0.8 (0.0–2.0) |


(chicas: solo hay equipos en clubes grandes, y algún mediano; juvenil chicas no tiene equipos en el reparto de inicio.)

## B) El verano del usuario (medida, semillas 51–60)

Variante nueva de medida (bandera `DIAGNOSTICO.veranoUsuario`; `draftDeUnaCategoria(..., 'usuario')` en `modules/npcs/src/draft.ts`; herramientas `tools/verano-sexos.ts <semilla> <m|f> usuario si` y `tools/verano-sexos-tabla.ts <carpeta> 51 60 hoy,usuario`). Parte de un estado limpio (`MEDIDA.respetarReparto`: el reparto de inicio no se deshace) y se compara con las reglas de hoy desde ese mismo estado. Benjamín a cadete, chicos y chicas por separado desde infantil (en el mundo de las chicas los colegios no tienen equipo), y **juvenil aparte**, con sus letras.

### Cómo lo he implementado (y qué he decidido donde la regla era ambigua)

1. **Al llegar el verano.** Los que abandonan van a la lista de abandonos (los de este verano, por categoría). Los que buscan oportunidades fuera van a una **reserva**: salen de su equipo (no cuentan para el tamaño) pero conservan su sitio y vuelven a él si no encuentran equipo. **Quién busca** es lo de hoy (probabilidad por ambición, lo que practicaron los padres y lo bien que juega en su equipo; un suplente de un grande puede bajar a uno menor): 'sube' (hacia un club con más calidad) o 'baja'. Los colegios son los de más riesgo: sus alumnos que quieren seguir en el colegio no los ven los clubes externos (como en el reparto de inicio).
2. **Clubes externos, de más a menos atractivo** (el orden de `fuera`). En cada uno: **a)** se reorganiza con lo que tiene: con menos de 14 no hay equipo y sus niños pasan al mercado; si no, tiene `⌊n/14⌋` equipos, con capacidad de 22 por equipo. **b)** Los que buscan hacia arriba (reserva) prueban en cada club que sea mejor que el suyo, hasta tres pruebas (este y dos más); los suplentes que buscan hacia abajo, hasta dos, en los clubes siguientes. **c)** Los del mercado (sin equipo, desplazados y equipos deshechos) prueban en cada club sin límite de pruebas. Todos entran con la regla de plaza de hoy (`intentarEntrar`, con prueba): con hueco, entran; si el equipo está lleno, entran si valen más que el peor de su puesto, **que sale al mercado** (decisión: no he implementado «el de 1.º del A baja al B y desplaza a otro» dentro del barrido; ocurre en la reorganización final). La **ambición** decide si les vale ser reservas dentro de `aceptaElPuesto` (como hoy). **d)** Se pasa al siguiente club; los que buscaban y no encajaron siguen probando en los dos siguientes; al acabar, **vuelven y recuperan su hueco**.
3. **Colegios (al final del barrido).** Los de colegio que no encajaron fuera vuelven a su colegio; los alumnos del colegio del mercado que se quedan entran en él; si un equipo de colegio queda por debajo de 14, **tira de la lista de abandonos** (los mejores alumnos del propio colegio de los que abandonaron; se les quita la marca de abandono) hasta 14; si ni así, **el equipo se deshace** y sus niños hacen una ronda en los clubes **de media tabla para abajo** (con 9 externos, del 5.º al 9.º; con 5, del 3.º al 5.º), que pueden provocar más desplazados (otra ronda) y abrir hueco para un C o un D (en esa ronda los clubes aceptan más de un equipo).
4. **Al final, cada club se reorganiza como siempre** (decisión: lo hace la misma regla del reparto de inicio): A = 2.º año + los titulares de 1.º; B = el resto de 1.º; si el A no llega a 14 se completa con los mejores de 1.º; si el B no llega a 14 se une al A hasta 22; lo que pasa de 22 en A o B forma un C mixto (de 14 a 22; el resto, un D); lo que no cabe en ninguno de 14 a 22 queda fuera. Después, el paso de equilibrar (`reparto-nuevo-reglas.md` §8: normalizar, equilibrar letras y recolocar).
5. **Juvenil** (aparte): el mismo barrido, y al final A = 3.º año, B = 2.º, C = 1.º: tres equipos con 14 o más de cada año; dos (A de 3.º y 2.º, B de 1.º) con 14 de 3.º y 2.º juntos y 14 de 1.º; si no, uno mixto con 14 o más; si no, ninguno; hasta 22; sin equilibrar.

### Tablas del verano del usuario (semillas 51–60), con las reglas de hoy como comparación (estado limpio)

### Equipos: antes → tras el verano

|  | Equipos antes → tras | Por debajo de 14 antes → tras | Se deshacen (por club) | Se abren | Niños por equipo tras (mín–máx) | Clubes con un C mejor que su A (de los que tienen C), antes → tras · D mejor que B |
|---|---|---|---|---|---|---|
| benjamín (mixto) | 18.8 (17.0–22.0) → 12.8 (11.0–15.0) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) | 8.0 (6.0–10.0) | 2.0 (0.0–3.0) | 15 (14–16) – 22 (22–22) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) · D/B: 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) |
| alevín (mixto) | 18.2 (17.0–21.0) → 12.9 (11.0–15.0) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) | 5.8 (4.0–10.0) | 0.5 (0.0–2.0) | 14 (14–17) – 22 (22–22) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.9 (0.0–3.0) · D/B: 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) |
| infantil chicos | 17.0 (14.0–19.0) → 11.8 (10.0–13.0) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) | 6.0 (4.0–8.0) | 0.8 (0.0–2.0) | 14 (14–15) – 22 (22–22) | 0.1 (0.0–1.0) → 0.0 (0.0–0.0) de 1.1 (1.0–2.0) → 1.3 (1.0–2.0) · D/B: 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) |
| cadete chicos | 17.3 (13.0–20.0) → 11.3 (8.0–13.0) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) | 6.4 (3.0–8.0) | 0.4 (0.0–1.0) | 15 (14–20) – 22 (22–22) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 1.0 (0.0–2.0) → 1.3 (1.0–2.0) · D/B: 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) |
| juvenil chicos | 13.9 (9.0–18.0) → 12.8 (10.0–16.0) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) | 3.4 (1.0–9.0) | 2.3 (1.0–4.0) | 14 (14–14) – 22 (22–22) | 0.1 (0.0–1.0) → 0.0 (0.0–0.0) de 0.9 (0.0–2.0) → 0.3 (0.0–1.0) · D/B: 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) |
| infantil chicas | 1.9 (1.0–3.0) → 0.8 (0.0–1.0) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) | 1.1 (1.0–2.0) | 0.0 (0.0–0.0) | 14 (0–21) – 14 (0–21) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) · D/B: 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) |
| cadete chicas | 2.0 (2.0–2.0) → 1.0 (1.0–1.0) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) | 1.0 (1.0–1.0) | 0.0 (0.0–0.0) | 21 (16–22) – 21 (16–22) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) · D/B: 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) |
| juvenil chicas | 0.0 (0.0–0.0) → 1.7 (1.0–3.0) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 1.7 (1.0–3.0) | 16 (14–19) – 18 (14–19) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) · D/B: 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) |

### El verano del usuario: pasos (por categoría y mundo; media y rango de las semillas)

| Chicos (benjamín y alevín mixtos) | Lista de abandonos | Buscan fuera (reserva) | Lo consiguen | Vuelven a su sitio | Recuperados de la lista de abandonos | Clubes externos sin equipo (<14) | Equipos de colegio que se deshacen | De colegio a clubes de media tabla | Desplazados en la ronda | Mercado colocado | Mercado sin sitio |
|---|---|---|---|---|---|---|---|---|---|---|---|
| benjamin | 14 (7–20) | 9 (0–16) | 7 (0–13) | 2 (0–5) | 0 (0–3) | 5 (3–8) | 0 (0–2) | 4 (0–25) | 99 (59–125) | 222 (189–259) | 41 (20–64) |
| alevin | 28 (22–35) | 43 (33–52) | 29 (24–35) | 14 (8–25) | 2 (0–7) | 1 (0–2) | 0 (0–1) | 4 (0–13) | 64 (36–84) | 70 (36–92) | 2 (0–10) |
| infantil | 26 (21–34) | 41 (29–50) | 24 (21–29) | 17 (8–28) | 6 (1–11) | 1 (0–2) | 2 (0–2) | 17 (0–24) | 54 (34–82) | 62 (40–90) | 0 (0–0) |
| cadete | 36 (26–46) | 39 (28–45) | 23 (16–30) | 17 (11–25) | 8 (5–11) | 1 (0–2) | 2 (1–3) | 15 (6–29) | 44 (25–75) | 54 (33–76) | 0 (0–1) |

| Chicas (infantil y cadete) | Lista de abandonos | Buscan fuera (reserva) | Lo consiguen | Vuelven a su sitio | Recuperados de la lista de abandonos | Clubes externos sin equipo (<14) | Equipos de colegio que se deshacen | De colegio a clubes de media tabla | Desplazados en la ronda | Mercado colocado | Mercado sin sitio |
|---|---|---|---|---|---|---|---|---|---|---|---|
| infantil | 16 (12–22) | 0 (0–1) | 0 (0–1) | 0 (0–0) | 0 (0–0) | 5 (3–6) | 0 (0–0) | 0 (0–0) | 1 (0–3) | 15 (10–23) | 0 (0–0) |
| cadete | 5 (2–9) | 2 (0–5) | 2 (0–5) | 0 (0–0) | 0 (0–0) | 0 (0–1) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 2 (0–12) | 0 (0–0) |

Cambios de club por dirección (media de las semillas, suma de benjamín a cadete):

| Mundo | Dirección | Niños por semilla |
|---|---|---|
| chicas | colegio → grande | 2.0 |
| chicas | colegio → mediano | 1.6 |
| chicas | colegio → pequeno | 8.1 |
| chicas | grande → mediano | 5.2 |
| chicas | mediano → grande | 11.5 |
| chicas | mediano → pequeno | 4.3 |
| chicas | pequeno → grande | 6.8 |
| chicas | pequeno → mediano | 6.4 |
| chicos | colegio → grande | 2.3 |
| chicos | colegio → mediano | 3.0 |
| chicos | colegio → pequeno | 50.3 |
| chicos | grande → mediano | 11.5 |
| chicos | mediano → grande | 32.0 |
| chicos | mediano → pequeno | 17.2 |
| chicos | pequeno → grande | 15.8 |
| chicos | pequeno → mediano | 27.5 |

Equipos por tipo de club (media por semilla; antes → tras el verano):

|  | colegio | pequeno | mediano | grande |
|---|---|---|---|---|
| benjamín (mixto) | 4.9 (4.0–6.0) → 4.1 (2.0–6.0) | 5.9 (5.0–8.0) → 4.9 (4.0–6.0) | 6.0 (6.0–6.0) → 2.8 (2.0–3.0) | 2.0 (2.0–2.0) → 1.0 (1.0–1.0) |
| alevín (mixto) | 3.9 (3.0–5.0) → 3.8 (3.0–5.0) | 6.3 (5.0–8.0) → 3.7 (3.0–5.0) | 6.0 (6.0–6.0) → 3.4 (3.0–5.0) | 2.0 (2.0–2.0) → 2.0 (2.0–2.0) |
| infantil chicos | 2.1 (1.0–4.0) → 2.1 (1.0–3.0) | 5.8 (4.0–7.0) → 4.0 (3.0–5.0) | 7.1 (7.0–8.0) → 4.0 (4.0–4.0) | 2.0 (2.0–2.0) → 1.7 (1.0–2.0) |
| cadete chicos | 2.3 (0.0–4.0) → 1.4 (0.0–3.0) | 6.1 (4.0–7.0) → 3.9 (2.0–6.0) | 6.0 (6.0–6.0) → 3.4 (3.0–4.0) | 2.9 (2.0–3.0) → 2.6 (2.0–3.0) |

### Subidas y bajadas de letra (los que siguen en el mismo club; de la letra del curso que acaba a la del que empieza)

|  | Siguen en su club | Misma letra | Suben de letra (C→B, B→A…) | Bajan de letra (A→B, B→C…) | Suben dos o más | Bajan dos o más |
|---|---|---|---|---|---|---|
| benjamín (mixto) | 108 (86–131) | 23 (0–56) | 85 (52–109) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| alevín (mixto) | 194 (167–224) | 107 (79–144) | 69 (52–94) | 19 (9–31) | 0 (0–0) | 7 (0–23) |
| infantil chicos | 164 (138–184) | 88 (64–108) | 53 (43–64) | 24 (9–34) | 5 (2–7) | 12 (4–21) |
| cadete chicos | 158 (125–188) | 77 (50–108) | 60 (54–81) | 21 (16–33) | 8 (4–16) | 6 (1–16) |
| juvenil chicos | 160 (128–214) | 100 (68–144) | 42 (18–57) | 17 (0–29) | 5 (0–17) | 3 (0–11) |
| infantil chicas | 13 (0–20) | 5 (0–9) | 9 (0–14) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| cadete chicas | 21 (16–22) | 11 (8–17) | 10 (3–14) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| juvenil chicas | 10 (0–19) | 6 (0–16) | 4 (0–11) | 0 (0–0) | 0 (0–0) | 0 (0–0) |

### Niños que quedan fuera tras el verano, por año (querían jugar y no tienen equipo) y por qué se quedan fuera los que jugaban

|  | 1.er año | 2.º año | 3.er año | Jugaban y quedan fuera: pierden la plaza por mérito | cierra su equipo | sobran al recolocar | fin de colegio | sin hueco | dejan tras dos plazos |
|---|---|---|---|---|---|---|---|---|---|
| benjamín (mixto) | 49 (29–71) | 6 (0–27) | 0 (0–0) | 1.2 (0.0–4.0) | 0.4 (0.0–3.0) | 24.3 (14.0–43.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) |
| alevín (mixto) | 21 (14–30) | 8 (0–20) | 0 (0–0) | 0.3 (0.0–3.0) | 0.0 (0.0–0.0) | 28.0 (14.0–45.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) |
| infantil chicos | 21 (11–33) | 7 (3–13) | 0 (0–0) | 0.1 (0.0–1.0) | 0.0 (0.0–0.0) | 30.4 (19.0–50.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) |
| cadete chicos | 24 (7–44) | 6 (2–18) | 0 (0–0) | 3.1 (0.0–9.0) | 0.7 (0.0–4.0) | 13.7 (6.0–29.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) |
| juvenil chicos | 12 (0–27) | 46 (31–69) | 49 (28–71) | 2.0 (0.0–5.0) | 0.6 (0.0–2.0) | 26.3 (9.0–51.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) |
| infantil chicas | 12 (8–16) | 3 (0–11) | 0 (0–0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 9.8 (4.0–21.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) |
| cadete chicas | 8 (1–19) | 1 (0–4) | 0 (0–0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 6.4 (0.0–19.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) |
| juvenil chicas | 6 (0–17) | 5 (2–8) | 5 (0–8) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) |

### Volumen de movimientos (todos los años de la categoría; media y rango)

|  | Jugaban | Abandonan | % | Buscan cambiar club | % | Lo consiguen | Cambian de club | Siguen y suben | Entran: 8 años | mudanza | vuelven apartados | Pasan al otro sexo | Salen por arriba |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| benjamín (mixto) | 307 (287–339) | 26 (18–34) | 9 % | 115 (80–142) | 38 % | 89 (64–118) | 55 (39–70) | 281 (259–310) | 56 (42–68) | 51 (39–64) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| alevín (mixto) | 301 (270–321) | 26 (20–35) | 9 % | 80 (54–97) | 27 % | 52 (33–61) | 63 (46–76) | 261 (241–279) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 13 (9–17) | 0 (0–0) |
| infantil chicos | 277 (239–297) | 26 (21–33) | 9 % | 76 (58–95) | 27 % | 45 (27–65) | 61 (43–76) | 251 (208–271) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| cadete chicos | 279 (258–296) | 50 (37–58) | 18 % | 66 (47–97) | 24 % | 48 (33–62) | 60 (49–70) | 230 (214–259) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| juvenil chicos | 301 (198–372) | 92 (58–129) | 31 % | 61 (29–85) | 20 % | 32 (20–56) | 39 (27–55) | 203 (140–243) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| infantil chicas | 33 (22–44) | 3 (1–7) | 9 % | 10 (4–21) | 30 % | 0 (0–0) | 0 (0–0) | 30 (20–43) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| cadete chicas | 37 (35–43) | 7 (4–9) | 18 % | 7 (0–19) | 18 % | 0 (0–1) | 1 (0–2) | 31 (27–35) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| juvenil chicas | 0 (0–0) | 0 (0–0) | — | 0 (0–0) | — | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |

### Balance: jugaban al final del curso → juegan al empezar el siguiente

|  | Jugaban | Juegan tras el verano | Balance |
|---|---|---|---|
| benjamín (mixto) | 307 (287–339) | 240 (215–257) | -67 (-22 %) |
| alevín (mixto) | 301 (270–321) | 253 (221–287) | -48 (-16 %) |
| infantil chicos | 277 (239–297) | 233 (210–249) | -45 (-16 %) |
| cadete chicos | 279 (258–296) | 216 (172–243) | -63 (-23 %) |
| juvenil chicos | 301 (198–372) | 234 (195–284) | -67 (-22 %) |
| infantil chicas | 33 (22–44) | 14 (0–21) | -18 (-56 %) |
| cadete chicas | 37 (35–43) | 21 (16–22) | -16 (-43 %) |
| juvenil chicas | 0 (0–0) | 29 (14–47) | +29 (—) |



### Las reglas de hoy desde el estado limpio (para comparar)

#### Verano con las reglas de hoy (semillas 51–60)

### Equipos: antes → tras el verano

|  | Equipos antes → tras | Por debajo de 14 antes → tras | Se deshacen (por club) | Se abren | Niños por equipo tras (mín–máx) | Clubes con un C mejor que su A (de los que tienen C), antes → tras · D mejor que B |
|---|---|---|---|---|---|---|
| benjamín (mixto) | 18.8 (17.0–22.0) → 15.0 (14.0–16.0) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) | 4.4 (2.0–6.0) | 0.6 (0.0–1.0) | 16 (14–18) – 20 (20–20) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) · D/B: 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) |
| alevín (mixto) | 18.2 (17.0–21.0) → 15.6 (13.0–17.0) | 0.0 (0.0–0.0) → 0.5 (0.0–2.0) | 2.9 (1.0–6.0) | 0.3 (0.0–1.0) | 14 (10–17) – 20 (20–20) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.2 (0.0–1.0) · D/B: 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) |
| infantil chicos | 17.0 (14.0–19.0) → 14.9 (14.0–16.0) | 0.0 (0.0–0.0) → 0.8 (0.0–3.0) | 3.3 (2.0–6.0) | 1.2 (0.0–2.0) | 13 (10–15) – 20 (20–20) | 0.1 (0.0–1.0) → 0.0 (0.0–0.0) de 1.1 (1.0–2.0) → 1.6 (1.0–2.0) · D/B: 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.2 (0.0–1.0) |
| cadete chicos | 17.3 (13.0–20.0) → 13.6 (11.0–15.0) | 0.0 (0.0–0.0) → 0.4 (0.0–1.0) | 4.5 (1.0–7.0) | 0.8 (0.0–2.0) | 14 (11–16) – 20 (20–20) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 1.0 (0.0–2.0) → 1.2 (0.0–2.0) · D/B: 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) |
| juvenil chicos | 13.9 (9.0–18.0) → 14.6 (13.0–17.0) | 0.0 (0.0–0.0) → 0.4 (0.0–2.0) | 1.6 (0.0–3.0) | 2.3 (0.0–5.0) | 14 (11–16) – 20 (20–20) | 0.1 (0.0–1.0) → 0.0 (0.0–0.0) de 0.9 (0.0–2.0) → 1.2 (0.0–2.0) · D/B: 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.1 (0.0–1.0) |
| infantil chicas | 1.9 (1.0–3.0) → 1.5 (1.0–2.0) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) | 0.4 (0.0–2.0) | 0.0 (0.0–0.0) | 18 (14–20) – 19 (16–20) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) · D/B: 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) |
| cadete chicas | 2.0 (2.0–2.0) → 1.5 (1.0–2.0) | 0.0 (0.0–0.0) → 0.1 (0.0–1.0) | 0.5 (0.0–1.0) | 0.0 (0.0–0.0) | 17 (13–20) – 18 (15–20) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) · D/B: 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) |
| juvenil chicas | 0.0 (0.0–0.0) → 2.1 (2.0–3.0) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 2.1 (2.0–3.0) | 19 (14–20) – 20 (20–20) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) · D/B: 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) |

### El mercado al llegar el verano: quién sale y cómo queda cada equipo sin ellos (por tipo de club)

|  | Club | Equipos | Tamaño medio al acabar el curso | sin los que abandonan | sin los que abandonan ni buscan fuera | Por debajo de 14: antes · sin abandonos · sin abandonos ni buscadores |
|---|---|---|---|---|---|---|
| benjamín (mixto) | colegio | 4.9 (4.0–6.0) | 18.0 | 16.4 | 15.3 | 0.0 (0.0–0.0) · 0.7 (0.0–2.0) · 1.3 (0.0–2.0) |
| benjamín (mixto) | pequeno | 5.9 (5.0–8.0) | 14.5 | 13.2 | 11.1 | 0.0 (0.0–0.0) · 3.8 (2.0–5.0) · 5.4 (4.0–8.0) |
| benjamín (mixto) | mediano | 6.0 (6.0–6.0) | 15.7 | 14.4 | 11.7 | 0.0 (0.0–0.0) · 3.1 (2.0–5.0) · 4.7 (2.0–6.0) |
| benjamín (mixto) | grande | 2.0 (2.0–2.0) | 19.5 | 17.9 | 17.5 | 0.0 (0.0–0.0) · 0.1 (0.0–1.0) · 0.5 (0.0–2.0) |
| alevín (mixto) | colegio | 3.9 (3.0–5.0) | 18.9 | 17.1 | 15.8 | 0.0 (0.0–0.0) · 0.7 (0.0–2.0) · 1.1 (0.0–3.0) |
| alevín (mixto) | pequeno | 6.3 (5.0–8.0) | 14.6 | 13.1 | 10.8 | 0.0 (0.0–0.0) · 4.4 (2.0–6.0) · 5.5 (4.0–7.0) |
| alevín (mixto) | mediano | 6.0 (6.0–6.0) | 15.8 | 14.6 | 11.5 | 0.0 (0.0–0.0) · 3.0 (1.0–6.0) · 4.8 (3.0–6.0) |
| alevín (mixto) | grande | 2.0 (2.0–2.0) | 20.1 | 19.0 | 18.8 | 0.0 (0.0–0.0) · 0.1 (0.0–1.0) · 0.1 (0.0–1.0) |
| infantil chicos | colegio | 2.1 (1.0–4.0) | 15.5 | 13.8 | 12.5 | 0.0 (0.0–0.0) · 1.1 (0.0–3.0) · 1.5 (1.0–3.0) |
| infantil chicos | pequeno | 5.8 (4.0–7.0) | 14.8 | 13.1 | 10.7 | 0.0 (0.0–0.0) · 3.7 (1.0–5.0) · 5.2 (3.0–7.0) |
| infantil chicos | mediano | 7.1 (7.0–8.0) | 16.9 | 15.5 | 12.3 | 0.0 (0.0–0.0) · 2.9 (2.0–4.0) · 4.8 (3.0–7.0) |
| infantil chicos | grande | 2.0 (2.0–2.0) | 19.4 | 17.9 | 17.7 | 0.0 (0.0–0.0) · 0.2 (0.0–1.0) · 0.2 (0.0–1.0) |
| cadete chicos | colegio | 2.3 (0.0–4.0) | 15.3 | 11.7 | 10.7 | 0.0 (0.0–0.0) · 2.0 (0.0–3.0) · 2.2 (0.0–4.0) |
| cadete chicos | pequeno | 6.1 (4.0–7.0) | 14.8 | 11.7 | 9.9 | 0.0 (0.0–0.0) · 5.2 (2.0–7.0) · 5.9 (2.0–7.0) |
| cadete chicos | mediano | 6.0 (6.0–6.0) | 16.8 | 13.7 | 11.2 | 0.0 (0.0–0.0) · 3.5 (1.0–5.0) · 4.4 (1.0–6.0) |
| cadete chicos | grande | 2.9 (2.0–3.0) | 18.2 | 16.8 | 16.2 | 0.0 (0.0–0.0) · 0.3 (0.0–1.0) · 0.6 (0.0–2.0) |
| juvenil chicos | colegio | 1.0 (0.0–2.0) | 20.0 | 13.2 | 12.6 | 0.0 (0.0–0.0) · 0.4 (0.0–1.0) · 0.6 (0.0–2.0) |
| juvenil chicos | pequeno | 5.7 (5.0–8.0) | 21.6 | 14.4 | 12.9 | 0.0 (0.0–0.0) · 2.0 (0.0–6.0) · 3.3 (1.0–7.0) |
| juvenil chicos | mediano | 5.1 (3.0–7.0) | 21.9 | 15.6 | 13.5 | 0.0 (0.0–0.0) · 0.9 (0.0–3.0) · 2.8 (1.0–5.0) |
| juvenil chicos | grande | 2.1 (1.0–3.0) | 22.0 | 16.5 | 16.2 | 0.0 (0.0–0.0) · 0.1 (0.0–1.0) · 0.2 (0.0–1.0) |
| infantil chicas | mediano | 0.1 (0.0–1.0) | 14.0 | 14.0 | 11.0 | 0.0 (0.0–0.0) · 0.0 (0.0–0.0) · 0.1 (0.0–1.0) |
| infantil chicas | grande | 1.8 (1.0–2.0) | 17.3 | 15.8 | 15.6 | 0.0 (0.0–0.0) · 0.2 (0.0–1.0) · 0.3 (0.0–1.0) |
| cadete chicas | mediano | 0.1 (0.0–1.0) | 16.0 | 11.0 | 9.0 | 0.0 (0.0–0.0) · 0.1 (0.0–1.0) · 0.1 (0.0–1.0) |
| cadete chicas | grande | 1.9 (1.0–2.0) | 18.8 | 15.5 | 15.1 | 0.0 (0.0–0.0) · 0.5 (0.0–1.0) · 0.8 (0.0–2.0) |

### Subidas y bajadas de letra (los que siguen en el mismo club; de la letra del curso que acaba a la del que empieza)

|  | Siguen en su club | Misma letra | Suben de letra (C→B, B→A…) | Bajan de letra (A→B, B→C…) | Suben dos o más | Bajan dos o más |
|---|---|---|---|---|---|---|
| benjamín (mixto) | 102 (86–124) | 21 (0–55) | 81 (58–103) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| alevín (mixto) | 187 (163–206) | 84 (60–113) | 65 (52–84) | 38 (13–53) | 0 (0–0) | 0 (0–2) |
| infantil chicos | 166 (133–193) | 70 (47–104) | 51 (39–62) | 46 (34–63) | 5 (1–11) | 5 (2–8) |
| cadete chicos | 156 (125–181) | 63 (41–84) | 58 (50–68) | 35 (28–46) | 5 (0–12) | 2 (0–5) |
| juvenil chicos | 146 (109–174) | 84 (61–107) | 36 (14–67) | 26 (16–43) | 5 (0–14) | 2 (0–3) |
| infantil chicas | 16 (8–20) | 6 (4–10) | 9 (0–14) | 1 (0–3) | 0 (0–0) | 0 (0–0) |
| cadete chicas | 24 (17–30) | 10 (3–15) | 9 (2–13) | 6 (0–14) | 0 (0–0) | 0 (0–0) |
| juvenil chicas | 16 (13–18) | 11 (5–17) | 5 (0–12) | 0 (0–0) | 0 (0–0) | 0 (0–0) |

### Niños que quedan fuera tras el verano, por año (querían jugar y no tienen equipo) y por qué se quedan fuera los que jugaban

|  | 1.er año | 2.º año | 3.er año | Jugaban y quedan fuera: pierden la plaza por mérito | cierra su equipo | sobran al recolocar | fin de colegio | sin hueco | dejan tras dos plazos |
|---|---|---|---|---|---|---|---|---|---|
| benjamín (mixto) | 7 (2–17) | 0 (0–3) | 0 (0–0) | 2.5 (0.0–10.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.1 (0.0–1.0) | 0.0 (0.0–0.0) |
| alevín (mixto) | 2 (0–10) | 1 (0–4) | 0 (0–0) | 2.4 (0.0–9.0) | 0.2 (0.0–2.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.1 (0.0–1.0) | 0.0 (0.0–0.0) |
| infantil chicos | 2 (0–9) | 2 (0–4) | 0 (0–0) | 5.7 (0.0–17.0) | 0.3 (0.0–3.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.3 (0.0–2.0) | 0.0 (0.0–0.0) |
| cadete chicos | 4 (0–17) | 1 (0–6) | 0 (0–0) | 9.5 (0.0–18.0) | 0.1 (0.0–1.0) | 0.1 (0.0–1.0) | 0.0 (0.0–0.0) | 0.2 (0.0–1.0) | 0.0 (0.0–0.0) |
| juvenil chicos | 8 (0–14) | 23 (9–37) | 25 (10–43) | 6.1 (1.0–15.0) | 0.0 (0.0–0.0) | 0.1 (0.0–1.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) |
| infantil chicas | 4 (0–8) | 1 (0–2) | 0 (0–0) | 0.6 (0.0–3.0) | 1.2 (0.0–5.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 1.8 (0.0–9.0) | 0.0 (0.0–0.0) |
| cadete chicas | 2 (0–5) | 0 (0–1) | 0 (0–0) | 0.3 (0.0–2.0) | 0.4 (0.0–3.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.3 (0.0–1.0) | 0.0 (0.0–0.0) |
| juvenil chicas | 1 (0–2) | 2 (0–4) | 2 (0–3) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) |

### Volumen de movimientos (todos los años de la categoría; media y rango)

|  | Jugaban | Abandonan | % | Buscan cambiar club | % | Lo consiguen | Cambian de club | Siguen y suben | Entran: 8 años | mudanza | vuelven apartados | Pasan al otro sexo | Salen por arriba |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| benjamín (mixto) | 307 (287–339) | 26 (18–34) | 9 % | 88 (67–108) | 29 % | 86 (67–106) | 80 (69–102) | 281 (259–310) | 77 (58–100) | 70 (60–80) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| alevín (mixto) | 301 (270–321) | 26 (20–35) | 9 % | 109 (82–145) | 36 % | 106 (82–141) | 90 (62–121) | 261 (241–279) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 13 (9–17) | 0 (0–0) |
| infantil chicos | 277 (239–297) | 26 (21–33) | 9 % | 100 (82–135) | 36 % | 94 (76–124) | 77 (65–114) | 251 (208–271) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| cadete chicos | 279 (258–296) | 50 (37–58) | 18 % | 108 (88–120) | 39 % | 99 (78–105) | 84 (69–95) | 230 (214–259) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| juvenil chicos | 301 (198–372) | 92 (58–129) | 31 % | 69 (44–97) | 23 % | 63 (41–85) | 50 (33–69) | 203 (140–243) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| infantil chicas | 33 (22–44) | 3 (1–7) | 9 % | 4 (0–18) | 13 % | 2 (0–11) | 1 (0–8) | 30 (20–43) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| cadete chicas | 37 (35–43) | 7 (4–9) | 18 % | 3 (0–9) | 7 % | 2 (0–6) | 1 (0–3) | 31 (27–35) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| juvenil chicas | 0 (0–0) | 0 (0–0) | — | 0 (0–0) | — | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |

### Balance: jugaban al final del curso → juegan al empezar el siguiente

|  | Jugaban | Juegan tras el verano | Balance |
|---|---|---|---|
| benjamín (mixto) | 307 (287–339) | 281 (260–308) | -26 (-8 %) |
| alevín (mixto) | 301 (270–321) | 274 (244–292) | -28 (-9 %) |
| infantil chicos | 277 (239–297) | 253 (239–275) | -25 (-9 %) |
| cadete chicos | 279 (258–296) | 235 (203–259) | -45 (-16 %) |
| juvenil chicos | 301 (198–372) | 269 (241–294) | -33 (-11 %) |
| infantil chicas | 33 (22–44) | 23 (18–30) | -10 (-29 %) |
| cadete chicas | 37 (35–43) | 25 (18–34) | -12 (-33 %) |
| juvenil chicas | 0 (0–0) | 41 (36–50) | +41 (—) |


## Lectura de la medida B (25/11/2026)

Resumen (media de 10 semillas; hoy = reglas de hoy desde el estado limpio, usuario = el verano del usuario como lo he implementado):

| | Equipos (antes → tras) hoy / usuario | Jugadores: balance hoy / usuario | Fuera 1.º · 2.º año hoy / usuario |
|---|---|---|---|
| benjamín | 18,8 → 15,0 / 12,8 | −8 % / −22 % | 7 · 0 / 49 · 6 |
| alevín | 18,2 → 15,6 / 12,9 | −9 % / −16 % | 2 · 1 / 21 · 8 |
| infantil chicos | 17,0 → 14,9 / 11,8 | −9 % / −16 % | 2 · 2 / 21 · 7 |
| cadete chicos | 17,3 → 13,6 / 11,3 | −16 % / −23 % | 4 · 1 / 24 · 6 |
| juvenil chicos | 13,9 → 14,6 / 12,8 | −11 % / −22 % | 8 · 23 · 25 / 12 · 46 · 49 |
| infantil chicas | 1,9 → 1,5 / 0,8 | −29 % / −56 % | 4 · 1 / 12 · 3 |
| cadete chicas | 2,0 → 1,5 / 1,0 | −33 % / −43 % | 2 · 0 / 8 · 1 |
| juvenil chicas | 0 → 2,1 / 1,7 | — | 1 · 2 · 2 / 6 · 5 · 5 |

Lo que sale bien: **ningún equipo por debajo de 14** (hoy quedan 0–0,8 por categoría) y los equipos suben de nivel por arriba: los niños se mueven **hacia arriba en la tabla** (chicos, por semilla: de colegio a club pequeño 50, de pequeño a mediano 28, de mediano a grande 32, de pequeño a grande 16; hacia abajo: de mediano a pequeño 17, de grande a mediano 12), y hay menos subidas y bajadas de letra (infantil 53 suben y 24 bajan frente a 51 y 46; cadete 60 y 21 frente a 58 y 35).

Lo que sale mal, y por qué (no es un fallo del diseño del usuario sino de cómo lo he podido implementar; hay que decidir):
1. **Mucha más gente fuera (24–30 niños por categoría «sobran al recolocar»).** Al final cada club vuelve a hacer su A y su B por año con un máximo de 22 y un C solo si sobran 14. El barrido admite niños con un tope por club (22 × equipos) pero **no por año**: un club con 30 de 1.er año y 10 de 2.º pasa de 22 en el B y lo que sobra no llega a 14 para un C, así que sale. Falta decidir qué hace el barrido con el tope por año (ver el punto 3 de abajo).
2. **El mercado se queda sin sitio en benjamín** (41 de 1.er año sin equipo): entran los de 8 años y los de familias que se mudan y los clubes ya están llenos tras reorganizarse; hoy los clubes admiten hasta 2 plazas de más y abren equipos con la bolsa (el usuario no ha pedido que la bolsa abra equipos nuevos en el verano, salvo la media tabla de los colegios).
3. **Muchos desplazados** en la ronda (benjamín 99, alevín 64, infantil 54, cadete 44 por semilla): un niño que gana plaza por mérito desplaza a otro peor, que va al mercado y desplaza a otro. En vez de dejar que el desplazado entre en otro club en la misma ronda, se podría limitar a una prueba por niño.
4. **Los equipos de colegio no bajan casi** (benjamín 4,9 → 4,1; alevín 3,9 → 3,8; infantil 2,1 → 2,1; cadete 2,3 → 1,4): pierden niños hacia los clubes de fuera (50 por semilla de colegio a pequeño), pero el que más equipos deshace son los clubes pequeños y medianos (benjamín pequeño 5,9 → 4,9, mediano 6,0 → 2,8). Con la regla de la lista de abandonos solo se recuperan 0, 2, 6 y 8 niños (de 14, 28, 26 y 36 abandonos).
5. **Chicas:** infantil 0,8 equipos y 14 jugadoras, cadete 1,0 y 21: casi todas están en 1 equipo; con la reserva, buscan 10 de 33 y ninguna lo consigue (no hay club mejor con equipo femenino). Quedan 12 de 1.er año sin equipo en infantil (hoy 4).
6. **Juvenil:** con sus letras sale con 12,8 equipos (hoy 14,6) y 46 de 2.º año y 49 de 3.º fuera (hoy 23 y 25): los equipos por año de juvenil necesitan 14 de un año por club y el barrido no los concentra.

## B2) El verano del usuario, segunda versión (25/11/2026)

Decisiones del usuario sobre los cinco puntos de la primera medida, aplicadas como variante (`DIAGNOSTICO.veranoUsuario`, mismos comandos):

1. **Nadie se queda fuera por no caber al reorganizar:** quien no cabe en un equipo de 14 a 22 busca otro equipo, en su club si hay sitio en otra letra y, si no, en otros clubes con el barrido de siempre (tres vueltas como máximo; dos pruebas por niño).
2. **Los equipos se montan así** (la reorganización final de cada club): el A son los de 2.º año **más los mejores de 1.º hasta 22**, sin dejar al B por debajo de 14; el B, los mejores de 1.º que quedan; el C (y el D) mixtos con lo que pasa de 22. Con 30 de 1.º y 10 de 2.º: A = 10 + 12 = 22 y B = 18. No hay tope por año en el barrido. (El fallo de la primera versión: el A solo llevaba a los 11 titulares de 1.º, así que el B se pasaba de 22 y lo que sobraba no llegaba a 14 para un C.)
3. **Los benjamines nuevos** (los de 8 años y las mudanzas) entran a buscar equipo y cada club puede abrir **un equipo más** que los que tiene (`min(4, ⌊n/14⌋ + 1)`) mientras dura el barrido.
4. **Dos pruebas por niño desplazado** (antes, sin límite).
5. **Colegios:** quien no tiene ambición no busca fuera del colegio aunque sea bueno (salvo que se quede sin equipo); los demás siguen la probabilidad de hoy.

### Comparación: hoy / primera versión (v1) / segunda (v2) — media de 10 semillas

| | Equipos tras | <14 tras | Se deshacen | Fuera 1.º | Fuera 2.º (3.º en juvenil: 25 / 49 / 33) | Balance de jugadores | Cambian de club | Suben / bajan letra |
|---|---|---|---|---|---|---|---|---|
| benjamín | 15,0 / 12,8 / 13,5 | 0 / 0 / 0 | 4,4 / 8,0 / 7,0 | 7 / 49 / **36** | 0 / 6 / 1 | −8 / −22 / **−16** % | 80 / 54 / 56 | 80 / 85 / 82 · 0 / 0 / 0 |
| alevín | 15,6 / 12,9 / 14,5 | 0,5 / 0 / 0 | 2,9 / 5,8 / 4,9 | 2 / 20 / **5** | 0 / 8 / 0 | −9 / −16 / **−8** % | 90 / 63 / 57 | 65 / 68 / 78 · 38 / 19 / 38 |
| infantil chicos | 14,9 / 11,8 / 12,7 | 0,8 / 0 / 0 | 3,3 / 6,0 / 5,4 | 2 / 20 / **6** | 2 / 7 / 2 | −9 / −16 / **−8** % | 77 / 61 / 50 | 50 / 53 / 66 · 46 / 24 / 36 |
| cadete chicos | 13,6 / 11,3 / 12,5 | 0,4 / 0 / 0 | 4,5 / 6,4 / 5,0 | 4 / 24 / **10** | 1 / 6 / 2 | −16 / −23 / **−16** % | 84 / 60 / 48 | 58 / 60 / 70 · 35 / 21 / 29 |
| juvenil chicos | 14,6 / 12,8 / 13,9 | 0,4 / 0 / 0 | 1,6 / 3,4 / 4,0 | 8 / 12 / 10 | 23 / 46 / 31 | −9 / −21 / **−10** % | 50 / 39 / 44 | 36 / 42 / 39 · 26 / 17 / 32 |
| infantil chicas | 1,5 / 0,8 / 1,0 | 0 / 0 / 0 | 0,4 / 1,1 / 0,9 | 4 / 12 / 7 | 0 / 3 / 2 | −28 / −59 / −44 % | 1 / 0 / 1 | 9 / 8 / 9 · 1 / 0 / 0 |
| cadete chicas | 1,5 / 1,0 / 1,5 | 0,1 / 0 / 0 | 0,5 / 1,0 / 0,5 | 2 / 8 / 2 | 0 / 1 / 0 | −33 / −43 / −26 % | 0 / 1 / 1 | 9 / 10 / 10 · 6 / 0 / 5 |
| juvenil chicas | 2,1 / 1,7 / 2,0 | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 6 / 6 | 2 / 5 / 2 | — | 0 / 0 / 0 | 5 / 4 / 0 · 0 / 0 / 9 |

Pasos del verano (chicos, suma de benjamín a cadete por semilla; v1 / v2): buscan fuera 132 / 129; lo consiguen 82 / 100; **vuelven 50 / 29**; recuperados de la lista de abandonos 17 / 17 (de 104 abandonos); equipos de colegio que se deshacen 4 / 4; de colegio a clubes de media tabla 40 / 40; desplazados en el barrido 260 / **61**; mercado colocado 408 / 221; mercado sin sitio 43 / 42; **los que sobran al reorganizar y encuentran otro club (v2): 119; sin sitio: 17**; en su club en otra letra: 0.

Dirección de los cambios de club (chicos, por semilla; v1 / v2): colegio → pequeño 40 / 40, colegio → mediano 3 / 2, colegio → grande 2 / 2, pequeño → mediano 19 / 22, pequeño → grande 12 / 18, mediano → grande 26 / 34, mediano → pequeño 12 / 13, grande → mediano 9 / 9.

Equipos de colegio, antes → tras (v1 / v2): benjamín 4,9 → 4,1 / 4,2; alevín 3,9 → 3,8 / 3,8; infantil 2,1 → 2,1 / 2,1; cadete 2,3 → 1,4 / 1,4; juvenil 1,0 → 2,2 / 2,2.

### Lectura de la segunda versión

- **Mejora mucho:** nadie queda fuera por no caber (los que sobran, 17 por semilla, son los que no encuentran sitio en dos pruebas); los jugadores caen lo mismo que hoy en alevín e infantil (−8 %), −16 % en cadete y benjamín; los desplazados bajan de 260 a 61.
- **Sigue peor que hoy en benjamín** (36 niños de 1.er año fuera): son los del mercado (8 años y mudanzas), 42 por semilla sin sitio. Los clubes abren un equipo más (`k + 1`) pero los equipos de partida ya son 14–22 y el mercado, con unos 100 niños más, no cabe: hoy los clubes admiten 2 plazas de más y la bolsa abre equipos (C, D) en el club que toca sin límite. Si se quiere, que cada club pueda abrir hasta dos equipos más durante el barrido.
- **Los colegios casi no pierden equipos** (benjamín −0,7, cadete −0,9) y en juvenil ganan (1,0 → 2,2): el diseño mueve a los niños hacia arriba en la tabla, pero los equipos de colegio se mantienen porque sus alumnos sin ambición no se van. Los clubes que pierden equipos son los pequeños y medianos.
- **Chicas:** casi igual que antes (infantil 1,0 equipos, cadete 1,5; juvenil 2,0): el tope es el número de chicas, no el método. En juvenil chicas aparecen 9 bajadas de letra (el equipo B de chicas aparece y se reparte con el A).
- **Juvenil chicos** (aparte): 13,9 equipos y 31 de 2.º y 33 de 3.º fuera (hoy 23 y 25; v1 46 y 49): sigue por encima de hoy porque un equipo por año necesita 14 de cada año en el club.
