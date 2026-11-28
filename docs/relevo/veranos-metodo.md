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

## B3) Tercera versión: los clubes mantienen sus equipos y se ajustan (25/11/2026)

Decisión del usuario: «Mantén los equipos y ajustamos; si después hay que eliminar o crear, se haría. Veo más trabajo deshaciendo y creando que manteniendo y después ajustando con lo nuevo que entra». Aplicado como variante (`DIAGNOSTICO.veranoUsuario`):

- **Cada club conserva sus equipos de cada categoría** (sus letras y cuántos tiene) de un curso al siguiente: se guarda en `DIAGNOSTICO.equiposPrevios` (letras distintas de cada club y categoría del curso que acaba) y **no se recalcula `⌊n/14⌋` al empezar** (se ha quitado el cierre de un club con menos de 14 al principio del barrido).
- Las plantillas se ajustan: salen los que suben, los que abandonan y los que se van; entran los que suben de abajo, los que llegan de otros clubes y los nuevos. Primero se ajusta todo con los equipos que ya hay (el barrido, los colegios con su lista de abandonos, la reorganización por letras en cada club).
- **Solo al final** se elimina un equipo que no llega a 14 ni así (sus niños buscan sitio) y se crea uno nuevo si sobran 14 o más. **Cada club puede abrir hasta dos equipos más** que los que tenía (máximo 4 por club y categoría) durante el barrido.

### Comparación hoy / v2 / v3 (semillas 51–60, media)

| | Equipos antes → tras: hoy / v2 / v3 | <14 tras | Se eliminan | Se crean | Fuera 1.º | Fuera 2.º (juvenil 3.º) | Balance de jugadores | Cambian de club |
|---|---|---|---|---|---|---|---|---|
| benjamín | 18,8 → 15,0 / 13,5 / 13,7 | 0 / 0 / 0 | 4,4 / 7,0 / 8,6 | 0,6 / 1,7 / 3,5 | 7 / 36 / **19** | 0 / 1 / 0 | −8 / −16 / **−10** % | 80 / 56 / 85 |
| alevín | 18,2 → 15,6 / 14,5 / 14,2 | 0,5 / 0 / 0 | 2,9 / 4,9 / 5,3 | 0,3 / 1,2 / 1,3 | 2 / 5 / 3 | 0 / 0 / 0 | −9 / −8 / −7 % | 90 / 57 / 54 |
| infantil chicos | 17,0 → 14,9 / 12,7 / 12,4 | 0,8 / 0 / 0 | 3,3 / 5,4 / 5,6 | 1,2 / 1,1 / 1,0 | 2 / 6 / 7 | 2 / 2 / 3 | −9 / −8 / −9 % | 77 / 50 / 54 |
| cadete chicos | 17,3 → 13,6 / 12,5 / 12,7 | 0,4 / 0 / 0 | 4,5 / 5,0 / 5,0 | 0,8 / 0,2 / 0,4 | 4 / 10 / 4 | 1 / 2 / 1 | −16 / −16 / −14 % | 84 / 48 / 49 |
| juvenil chicos | 13,9 → 14,6 / 13,9 / 14,6 | 0,4 / 0 / 0 | 1,6 / 4,0 / 4,1 | 2,3 / 4,0 / 4,8 | 8 / 10 / 6 | 23 (3.º: 25) / 31 (33) / 27 (29) | −9 / −10 / −5 % | 50 / 44 / 46 |
| infantil chicas | 1,9 → 1,5 / 1,0 / 1,5 | 0 / 0 / 0 | 0,4 / 0,9 / 0,4 | — | 4 / 7 / 2 | 0 / 2 / 0 | −28 / −44 / −16 % | 1 / 1 / 0 |
| cadete chicas | 2,0 → 1,5 / 1,5 / 1,6 | 0,1 / 0 / 0 | 0,5 / 0,5 / 0,5 | — | 2 / 2 / 2 | 0 / 0 / 0 | −33 / −26 / −25 % | 0 / 1 / 0 |
| juvenil chicas | 0 → 2,1 / 2,0 / 2,0 | 0 / 0 / 0 | 0 / 0 / 0 | — | 0 / 6 / 0 | 2 (2) / 2 (2) / 4 (4) | — | 0 / 0 / 0 |

**¿Sube o baja el total de equipos?** Baja en todas las versiones. Chicos (benjamín a juvenil): **85,2 al empezar → 73,7 (hoy), 67,1 (v2), 67,6 (v3)**. Tras el verano hay más equipos que al empezar solo en juvenil (13,9 → 14,6) y en juvenil chicas (0 → 2): salen de la bolsa de niños que no tenían equipo al empezar (juvenil deja fuera a ~100 en el reparto de inicio). En las demás categorías, la gente que abandona (9–31 %) no se compensa con los que entran (los de 8 años solo llenan benjamín).

Equipos de colegio antes → tras (v2 / v3): benjamín 4,9 → 4,2 / 4,2; alevín 3,9 → 3,8 / 3,8; infantil 2,1 → 2,1 / 2,1; cadete 2,3 → 1,4 / 1,4; juvenil 1,0 → 2,2 / 2,2.

Direcciones de los cambios de club (chicos, por semilla; v2 / v3): colegio → pequeño 40 / 40; colegio → mediano 2 / 1; colegio → grande 2 / 4; pequeño → mediano 22 / 12; pequeño → grande 18 / 27; mediano → grande 34 / 44; mediano → pequeño 13 / 13; grande → mediano 9 / 9.

Pasos (chicos, benjamín a cadete, por semilla; v2 / v3): buscan 129 / 129; lo consiguen 100 / 110; vuelven 29 / 19; recuperados de la lista de abandonos 17 / 17 (de 104); equipos de colegio que se deshacen 4 / 4; de colegio a media tabla 40 / 40; desplazados 61 / 72; sobran al reorganizar y encuentran otro club 119 / 209; sin sitio 17 / 21; mercado sin sitio 42 / 15.

**Lectura.** La v3 mejora el benjamín (fuera 36 → 19; balance −16 → −10 %) y se queda en lo de v2 en el resto (alevín −7 %, infantil −9 %, cadete −14 %). Aun así se eliminan más equipos que hoy (benjamín 8,6 frente a 4,4) y se crean más: mantener el nombre de los equipos no mantiene su número, porque el reparto por año de la reorganización final vuelve a decidir cuántos hay. Los de mayor nivel (clubes grandes) ganan equipos en benjamín (2 → 3–4).

## B4) Tres veranos seguidos con la v3 (semillas 51–55, chicos y benjamín y alevín mixtos)

`npx tsx tools/verano-tres.ts <semilla>`. Media de 5 semillas; cada celda: al empezar → tras el verano 1 → 2 → 3.

| | Equipos | Jugadores | Fuera (1.º / 2.º / 3.º) por verano (tras 1 · 2 · 3) | <14 |
|---|---|---|---|---|
| benjamín | 18,6 → 14,4 → 13,8 → 14,2 | 304 → 282 → 285 → 290 | 9/1 · 13/0 · 14/0 | 0 |
| alevín | 17,8 → 14,0 → 11,6 → 11,8 | 295 → 272 → 230 → 237 | 4/0 · 18/8 · 9/2 | 0 |
| infantil | 16,6 → 12,6 → 11,6 → 9,4 | 272 → 253 → 226 → 193 | 5/3 · 5/1 · 7/7 | 0 |
| cadete | 16,8 → 12,2 → 10,6 → 9,6 | 279 → 236 → 211 → 192 | 4/1 · 8/4 · 14/6 | 0 |
| juvenil | 14,4 → 14,8 → 11,4 → 10,8 | 313 → 284 → 232 → 218 | 6/18/26 · 10/7/7 · 8/5/5 | 0 |
| **Total** | **84,2 → 68,0 → 59,0 → 55,8** | **1464 → 1326 → 1183 → 1130** | | |

Por tipo de club (equipos totales de benjamín a juvenil; al empezar → 1 → 2 → 3): colegio 13,2 → 12,4 → 11,4 → 11,2; los clubes pequeños y medianos se vacían, los grandes crecen:
- benjamín: pequeño 5,8 → 0,8 → 0 → 0; mediano 6,0 → 5,6 → 5,6 → 6,0; grande 2,0 → 4,0 → 3,6 → 3,2;
- alevín: pequeño 6,2 → 3,8 → 1,6 → 1,0; mediano 6,0 → 3,6 → 3,8 → 4,6; grande 2,0 → 2,8 → 3,0 → 3,0;
- infantil: pequeño 6,0 → 3,4 → 2,8 → 2,0; mediano 7,0 → 4,2 → 3,8 → 3,2; grande 2,0 → 2,8 → 3,0 → 3,0;
- cadete: pequeño 6,2 → 3,8 → 2,8 → 1,8; mediano 6,0 → 4,8 → 4,4 → 3,6; grande 2,8 → 3,0 → 2,8 → 3,0;
- juvenil: pequeño 5,8 → 3,6 → 2,4 → 2,4; mediano 4,6 → 6,4 → 5,0 → 4,8; grande 2,6 → 3,0 → 3,0 → 3,0.

**¿Es estable la base? No: todavía no.**
1. **Por debajo de 14 no hay ninguno en ningún verano** (0 en las 5 semillas y los 3 veranos), y los colegios conservan sus equipos casi igual (13,2 → 11,2).
2. **El total de equipos y de jugadores baja cada verano:** equipos 84 → 68 → 59 → 56 (−34 %); jugadores 1464 → 1330 → 1180 → 1130 (−23 %). En parte es el efecto de partir de un mundo recién creado (cada categoría pierde 9–31 % por abandono y solo entra gente en benjamín: cadete 279 → 192, juvenil 313 → 218); ese descenso se frenaría cuando cada edad llegara a su régimen estable (hacia el 5.º o 6.º verano), pero el de **benjamín es estable** (304 → 290: entran los de 8 años) y el de alevín cae (295 → 237), lo que indica que un año de benjamín no repone al siguiente.
3. **Los clubes pequeños desaparecen:** en benjamín, de 5,8 equipos a 0 en dos veranos; en alevín, a 1,0 en tres. Lo que ganan los clubes grandes (hasta 3–4 equipos cada uno en cada categoría) es el efecto del barrido de arriba abajo: los de 8 años y los que prueban llegan antes a los clubes más atractivos, que abren hasta dos equipos más.
4. **Niños fuera:** 9–18 por categoría y verano, de 1.er año sobre todo; en el verano 3 aparecen en infantil 7 de 1.º y 7 de 2.º y en cadete 14 y 6.

## B5) Cuarta versión: los equipos se mantienen de verdad (25/11/2026)

Decisiones del usuario sobre la v3, aplicadas como variante (mismos comandos):

1. **Los equipos se mantienen.** Al final del verano no se vuelve a decidir cuántos equipos tiene cada club: cada uno conserva **los que tenía en cada categoría** (`DIAGNOSTICO.equiposPrevios`). La reorganización por letras reparte a los jugadores **dentro de esos equipos**: con T jugadores y k equipos, hay `min(k, ⌊T/14⌋)` equipos viables; el A se lleva a los de 2.º año y a los mejores de 1.º hasta 22 sin dejar a los siguientes por debajo de 14; el B, los mejores de 1.º que quedan; C y D mixtos. **Se elimina un equipo solo si, después del barrido, de los colegios y de la lista de abandonos, no llega a 14**; **se crea uno solo si sobran 14 o más** que no caben en los que hay (hasta 4 por club).
2. **Benjamines nuevos** (los de 8 años y las mudanzas): **van primero a los equipos ya creados (hasta 22)**. Solo si, tras eso, quedan sin equipo, se abre un equipo más en cada club (hasta dos pasadas), hasta 4 por club y categoría, y **en benjamín los clubes grandes no pasan de 2 equipos**. Explicación de lo que he hecho con el «hasta dos más por club» de la v3: queda como último recurso, pasada a pasada, solo si hay niños sin equipo; los benjamines que no caben en dos pasadas quedan sin equipo ese verano. El mismo orden (primero los equipos que hay, después abrir) vale para los que no caben al reorganizar.
3. **La caída de jugadores en las categorías altas se acepta** como efecto de empezar con un mundo recién creado.

### Comparación hoy / v3 / v4 (semillas 51–60, media)

| | Equipos antes → tras: hoy / v3 / v4 | <14 tras | Se eliminan | Se crean | Fuera 1.º | Fuera 2.º (juvenil 3.º) | Balance de jugadores | Cambian de club |
|---|---|---|---|---|---|---|---|---|
| benjamín | 18,8 → 15,0 / 13,7 / 14,0 | 0 / 0 / 0 | 4,4 / 8,6 / **4,9** | 0,6 / 3,5 / **0,1** | 7 / 19 / 15 | 0 / 0 / 2 | −8 / −10 / −9 % | 80 / 85 / 54 |
| alevín | 18,2 → 15,6 / 14,2 / 14,5 | 0,5 / 0 / 0 | 2,9 / 5,3 / 3,9 | 0,3 / 1,3 / 0,2 | 2 / 3 / 9 | 0 / 0 / 3 | −9 / −7 / −10 % | 90 / 54 / 52 |
| infantil chicos | 17,0 → 14,9 / 12,4 / 13,7 | 0,8 / 0 / 0 | 3,3 / 5,6 / 3,8 | 1,2 / 1,0 / 0,5 | 2 / 7 / 9 | 2 / 3 / 1 | −9 / −9 / −10 % | 77 / 54 / 49 |
| cadete chicos | 17,3 → 13,6 / 12,7 / 13,2 | 0,4 / 0 / 0 | 4,5 / 5,0 / 4,3 | 0,8 / 0,4 / 0,2 | 4 / 4 / 8 | 1 / 1 / 2 | −16 / −14 / −16 % | 84 / 49 / 56 |
| juvenil chicos | 13,9 → 14,6 / 14,6 / 14,7 | 0,4 / 0 / 0 | 1,6 / 4,1 / 1,9 | 2,3 / 4,8 / 2,7 | 8 / 6 / 8 | 23 (25) / 27 (29) / 27 (31) | −9 / −5 / −7 % | 50 / 46 / 42 |
| infantil chicas | 1,9 → 1,5 / 1,5 / 1,7 | 0 / 0 / 0 | 0,4 / 0,4 / 0,2 | — | 4 / 2 / 1 | 0 / 0 / 0 | −28 / −16 / −13 % | 1 / 0 / 1 |
| cadete chicas | 2,0 → 1,5 / 1,6 / 1,7 | 0,1 / 0 / 0 | 0,5 / 0,5 / 0,3 | — | 2 / 2 / 0 | 0 / 0 / 0 | −33 / −25 / −21 % | 0 / 0 / 0 |
| juvenil chicas | 0 → 2,1 / 2,0 / 1,8 | 0 / 0 / 0 | 0 / 0 / 0 | — | 0 / 0 / 2 | 2 (2) / 4 (4) / 5 (6) | — | 0 / 0 / 0 |

**Total de equipos** (chicos, benjamín a juvenil): 85,2 al empezar → **73,7 (hoy), 67,6 (v3), 70,1 (v4)**. Con v4 los equipos que se eliminan vuelven al nivel de hoy (4–5 en benjamín, 4 en infantil y cadete, 2 en juvenil) y los que se crean casi desaparecen (0,1–0,5 salvo juvenil).

Equipos de colegio, antes → tras (v3 / v4): benjamín 4,9 → 4,2 / 3,9; alevín 3,9 → 3,8 / 3,6; infantil 2,1 → 2,1 / 2,1; cadete 2,3 → 1,4 / 1,4; juvenil 1,0 → 2,2 / 2,2.

Direcciones de los cambios de club (chicos, por semilla; v3 / v4): colegio → pequeño 40 / 40; colegio → mediano 1 / 2; colegio → grande 4 / 2; pequeño → mediano 12 / 24; pequeño → grande 27 / 13; mediano → grande 44 / 28; mediano → pequeño 13 / 13; grande → mediano 9 / 9. Con el límite de 2 equipos del grande en benjamín, los niños se reparten más entre los medianos.

Pasos (chicos, benjamín a cadete, por semilla; v3 / v4): buscan 129 / 129; lo consiguen 110 / 91; vuelven 19 / 38; recuperados de la lista de abandonos 17 / 17 (de 104); desplazados 72 / 119; mercado colocado 116 / 169; mercado sin sitio 15 / 47; sobran al reorganizar y encuentran otro club 209 / 80; sin sitio 21 / 0.

**Lectura.** Mantener los equipos de verdad hace lo que quería el usuario: los equipos que se eliminan vuelven al nivel de hoy (en lugar de 7–9 en benjamín) y casi no se crea ninguno. A cambio, **quedan fuera más niños de 1.er año que con la v3** (benjamín 15, alevín 9, infantil 9, cadete 8: la v3 abría equipos y los colocaba): son los que no caben en los equipos que ya existen cuando los clubes no pueden abrir uno más (grandes en benjamín, o menos de 14 sobrantes).

## B6) Tres veranos seguidos con la v4 (semillas 51–55, chicos y benjamín y alevín mixtos)

Media de 5 semillas; al empezar → verano 1 → 2 → 3 (entre paréntesis, v3).

| | Equipos | Jugadores | Fuera 1.º / 2.º tras el verano 1 · 2 · 3 | <14 |
|---|---|---|---|---|
| benjamín | 18,6 → 14,0 → 13,4 → 13,6 (v3: 14,4 → 13,8 → 14,2) | 304 → 277 → 270 → 278 (282 → 285 → 290) | 13/2 · 23/0 · 20/0 | 0 |
| alevín | 17,8 → 14,8 → 13,4 → 12,2 (14,0 → 11,6 → 11,8) | 295 → 270 → 247 → 230 (272 → 230 → 237) | 5/2 · 5/6 · 13/3 | 0 |
| infantil | 16,6 → 13,8 → 12,4 → 11,0 (12,6 → 11,6 → 9,4) | 272 → 250 → 221 → 198 (253 → 226 → 193) | 9/1 · 9/3 · 8/4 | 0 |
| cadete | 16,8 → 12,4 → 12,2 → 11,8 (12,2 → 10,6 → 9,6) | 279 → 228 → 221 → 211 (236 → 211 → 192) | 11/3 · 3/1 · 7/2 | 0 |
| juvenil | 14,4 → 14,0 → 12,4 → 9,8 (14,8 → 11,4 → 10,8) | 313 → 266 → 236 → 191 (284 → 232 → 218) | 10/25/33 · 10/7/7 · 19/12/12 | 0 |
| **Total** | **84,2 → 69,0 → 63,8 → 58,4** (68,0 → 59,0 → 55,8) | **1464 → 1290 → 1193 → 1108** (1326 → 1183 → 1130) | | |

Equipos por tipo de club (al empezar → 1 → 2 → 3; v4):
- benjamín: colegio 4,8 → 3,6 → 3,4 → 3,8; **pequeño 5,8 → 2,4 → 2,0 → 2,0**; mediano 6,0 → 6,0 → 6,0 → 6,0; grande 2,0 → 2,0 → 2,0 → 1,8;
- alevín: colegio 3,6 → 3,6 → 3,4 → 3,2; pequeño 6,2 → 4,0 → 2,8 → 1,8; mediano 6,0 → 5,2 → 5,2 → 5,2; grande 2,0 → 2,0 → 2,0 → 2,0;
- infantil: colegio 1,6 → 2,2 → 1,8 → 1,6; pequeño 6,0 → 3,4 → 3,2 → 2,4; mediano 7,0 → 6,2 → 5,4 → 5,0; grande 2,0 → 2,0 → 2,0 → 2,0;
- cadete: colegio 1,8 → 0,6 → 1,0 → 1,4; pequeño 6,2 → 3,8 → 3,4 → 2,8; mediano 6,0 → 5,2 → 5,0 → 4,8; grande 2,8 → 2,8 → 2,8 → 2,8;
- juvenil: colegio 1,4 → 1,8 → 1,0 → 0,6; pequeño 5,8 → 5,2 → 4,6 → 3,6; mediano 4,6 → 4,8 → 4,6 → 3,8; grande 2,6 → 2,2 → 2,2 → 1,8.
Equipos de colegio (total benjamín a juvenil): 13,2 → 11,8 → 10,6 → 10,6.

**¿Mantienen los clubes pequeños al menos un equipo?** **Sí en parte.** Con v4, en benjamín los 5 clubes pequeños tienen **2 equipos entre todos** (v3: 0 al tercer verano): entre 1 y 3 por semilla (semillas 51–55 en el verano 3: 2, 2, 1, 3, 2), es decir, **de media menos de la mitad de ellos tiene uno**. En alevín, infantil, cadete y juvenil los pequeños bajan poco a poco (alevín 6,2 → 1,8; infantil 6,0 → 2,4; cadete 6,2 → 2,8; juvenil 5,8 → 3,6) pero no desaparecen. Los medianos (3 clubes) mantienen casi todos sus equipos (benjamín 6,0). Los grandes quedan en 2 en benjamín (el tope), 2 en alevín e infantil, 2,8 en cadete.
**¿Siguen saliendo 0 por debajo de 14?** Sí: 0 en los tres veranos y en las cinco semillas.
**Niños fuera:** más que con v3 en benjamín (13/2 → 23/0 → 20/0) y en alevín del tercer verano (13/3) y juvenil (19/12/12 en el verano 3); infantil y cadete, 3–11 de 1.º por verano.
**Estabilidad:** equipos 84 → 58 (−31 %), jugadores 1464 → 1108 (−24 %), igual que con v3 (−34 %, −23 %): sigue siendo el rodaje de un mundo recién creado (abandono en las categorías altas; solo entra gente en benjamín); las categorías de abajo (benjamín 304 → 278) se mantienen.

## B7) Quinta versión: benjamín de 18 (25/11/2026)

Decisión del usuario: **en benjamín los equipos intentan formarse de 18; solo se va a 22 si sobran niños y, si no, se quedarían sin equipo.** Aplicado como variante (`draftDeUnaCategoria(..., 'usuario')`, la regla solo en benjamín; en alevín como dato aparte con `verano = 'usuario-alevin'`, `DIAGNOSTICO.v5Alevin`):

1. En el verano, los benjamines nuevos (los de 8 años y las mudanzas) y los demás llenan **los equipos que hay hasta 18**.
2. Con lo que sobra, **primero se forman equipos nuevos de 14 a 18** donde se pueda: en los clubes con hueco por debajo del límite (4 por club y categoría, 2 los grandes en benjamín), **empezando por los que tienen menos equipos**; solo si quedan 14 o más sin equipo.
3. Solo los que aun así se quedan sin equipo entran en los equipos que ya existen **hasta 22**. En esa última pasada, y en la de los que sobran al reorganizar, quien no cabe por el cupo de su puesto lo intenta sin mirarlo y los desplazados que ya han gastado sus dos pruebas vuelven a intentarlo (hay que decidir si se mantiene: era lo que dejaba benjamines fuera).
4. La reorganización final reparte en equipos de 18 y deja lo que sobra entrar hasta 22 solo si, si no, se quedaría sin equipo.
5. El límite de 2 equipos en benjamín para los clubes grandes se mantiene.

### Comparación v4 / v5 (semillas 51–60, media; benjamín es lo que cambia)

| | Equipos tras (v4 / v5) | Se eliminan | Se crean | Fuera 1.º / 2.º | Niños por equipo (mín · máx · media) | Balance de jugadores |
|---|---|---|---|---|---|---|
| benjamín | 14,0 / **15,6** | 4,9 / **3,5** | 0,1 / 0,3 | 15 / **1** · 2 / 0 | 14,1 · 22 · 19,9 / 14,3 · 22 · **18,8** | −9 / **−4** % |
| alevín | 14,5 / 14,7 | 3,9 / 3,9 | 0,2 / 0,4 | 9 / 1 · 3 / 3 | 14,0 · 22 · 18,7 / 14,0 · 22 · 18,9 | −10 / −8 % |
| infantil | 13,7 / 13,9 | 3,8 / 3,8 | 0,5 / 0,7 | 9 / 0 · 1 / 1 | 14,0 · 22 · 18,3 / 14,0 · 22 · 18,7 | −10 / −6 % |
| cadete | 13,2 / 13,3 | 4,3 / 4,3 | 0,2 / 0,3 | 8 / 1 · 2 / 0 | 14,0 · 22 · 17,9 / 14,0 · 22 · 18,5 | −16 / −12 % |

(Los cambios en alevín, infantil y cadete vienen de la última pasada sin cupo de puesto, que vale para todas las categorías; la regla de 18 es solo de benjamín.) **Por debajo de 14: 0 en todas las categorías.** Total de equipos de los chicos (benjamín a juvenil): 85,2 al empezar → 70,1 (v4), **72,8 (v5)**. **Benjamines fuera: 1 de 1.er año por semilla** (v4: 15; del 0 al 4 según semilla; el que los del mercado sin sitio pasen de 15 a 0).

Equipos por tipo de club en benjamín (antes → tras; v4 / v5): colegio 4,9 → 3,9 / 3,9; **pequeño 5,9 → 2,1 / 3,6**; mediano 6,0 → 6,0 / 6,1; grande 2,0 → 2,0 / 2,0. Los clubes pequeños mantienen más equipos porque los benjamines se reparten primero en equipos de 18 (más huecos) y los equipos nuevos van a los que menos tienen. Las direcciones de los cambios de club no cambian respecto a v4.

**Un dato aparte: la misma regla en alevín** (variante `usuario-alevin`): alevín 14,7 → **15,4** equipos, se eliminan 3,9 → 3,6, se crean 0,4 → 0,8, **fuera 1.º/2.º: 1/3 → 0/0**, balance −8 → −6 %, media de 18,9 → 18,3 niños por equipo, grandes 2,2 → 2,5 equipos, pequeños 3,7 → 3,9. No se aplica por defecto.

## B8) Tres veranos seguidos con la v5 (semillas 51–55)

Media de 5 semillas; al empezar → verano 1 → 2 → 3.

| | Equipos | Jugadores | Fuera 1.º / 2.º tras 1 · 2 · 3 | <14 |
|---|---|---|---|---|
| benjamín | 18,6 → 15,6 → 15,6 → 15,8 | 304 → 290 → 294 → 302 | 1/0 · 2/0 · 3/0 | 0 |
| alevín | 17,8 → 14,8 → 13,4 → 12,8 | 295 → 273 → 253 → 248 | 1/2 · 5/1 · 1/3 | 0 |
| infantil | 16,6 → 14,0 → 12,6 → 11,0 | 272 → 259 → 232 → 206 | 0/1 · 1/0 · 4/3 | 0 |
| cadete | 16,8 → 12,6 → 12,0 → 12,0 | 279 → 241 → 223 → 215 | 1/0 · 1/1 · 1/1 | 0 |
| juvenil | 14,4 → 14,6 → 12,6 → 11,6 | 313 → 286 → 251 → 227 | 4/17/27 · 7/3/3 · 4/3/3 | 0 |
| **Total** | **84,2 → 71,6 → 66,2 → 63,2** (v4: 69,0 → 63,8 → 58,4) | **1464 → 1349 → 1252 → 1198** (v4: 1290 → 1193 → 1108) | | |

Equipos por tipo de club (al empezar → 1 → 2 → 3):
- benjamín: colegio 4,8 → 3,6 → 3,6 → 3,8; **pequeño 5,8 → 4,0 → 3,4 → 3,0**; mediano 6,0 → 6,0 → 6,6 → 7,0; grande 2,0 → 2,0 → 2,0 → 2,0;
- alevín: colegio 3,6 → 3,6 → 3,0 → 2,8; pequeño 6,2 → 4,0 → 3,2 → 2,4; mediano 6,0 → 5,2 → 5,0 → 5,0; grande 2,0 → 2,0 → 2,2 → 2,6;
- infantil: colegio 1,6 → 2,2 → 1,8 → 1,2; pequeño 6,0 → 3,4 → 3,0 → 2,8; mediano 7,0 → 6,2 → 5,4 → 4,6; grande 2,0 → 2,2 → 2,4 → 2,4;
- cadete: colegio 1,8 → 0,6 → 0,6 → 1,2; pequeño 6,2 → 3,8 → 3,4 → 3,0; mediano 6,0 → 5,2 → 5,0 → 4,8; grande 2,8 → 3,0 → 3,0 → 3,0;
- juvenil: colegio 1,4 → 1,8 → 1,0 → 0,6; pequeño 5,8 → 5,2 → 3,8 → 3,4; mediano 4,6 → 5,0 → 4,8 → 4,6; grande 2,6 → 2,6 → 3,0 → 3,0.
Equipos de colegio (benjamín a juvenil): 13,2 → 11,8 → 10,0 → 9,6.

**Lectura.** Benjamín es estable (304 → 302 jugadores; 15,6 equipos en los tres veranos; 0–3 fuera de 1.º; niños por equipo 18,5–19,8 de media y 14–22). **Los clubes pequeños mantienen equipos en benjamín** (pequeño 5,8 → 3,0 equipos entre los 5 clubes: de 2 a 4 por semilla en el verano 3, es decir, 3 de 5 clubes de media). No sale ningún equipo por debajo de 14 en ningún verano. Los jugadores totales caen un −18 % en los tres veranos (v4: −24 %). Los equipos de colegio siguen bajando poco a poco (13,2 → 9,6); en alevín, infantil y cadete los pequeños pierden equipos (alevín 6,2 → 2,4).

## B9) Confirmaciones del usuario (25/11/2026)

1. **La última pasada sin mirar el cupo del puesto** (para el que no cabe) y la **última oportunidad de los desplazados que gastaron sus dos pruebas**, en todas las categorías: queda por defecto en el verano del usuario.
2. **La regla de 18 también en alevín** (equipos de 18; 22 solo si sobran y se quedarían sin equipo; equipos nuevos de 14 a 18 donde se pueda): queda por defecto en benjamín y alevín (`DIAGNOSTICO.v5Alevin` ya no se usa). Todas las cifras de más abajo la llevan.

## B10) Juvenil (semillas 51–60)

Juvenil con el método del verano (equipos que se mantienen, solo se elimina el que no llega a 14, barrido de arriba abajo) y con sus letras: **A = 3.º año, B = 2.º, C = 1.º** (tres equipos con 14 o más de cada año; dos —A de 3.º y 2.º, B de 1.º— con 14 de 3.º y 2.º juntos y 14 de 1.º; si no, uno mixto), mínimo 14 y máximo 22, con **las subidas por titularidad de abajo arriba** (los que serían titulares en el de arriba suben sin dejar al de abajo por debajo de 14) y los que pasan de 22 salen. **No he replicado la cascada de `juvenil-cascada` dentro del club** (el desplazado que baja al equipo de abajo y desplaza a otro de su puesto): los que sobran de un equipo buscan sitio como cualquier niño sin equipo, en otros clubes.

**Los juveniles sin equipo** (los que se quedan fuera, los desplazados y los de equipos eliminados) **prueban en varios equipos según cuánto les gusta el fútbol.** Escala que he usado: interés 3 → hasta **5 pruebas**; interés 2 → 3; interés 1 → 2. Entran si son titulares o su ambición les deja ser reservas (la regla de plaza de hoy). Los de 18 que acaban el colegio siguen como hoy.

### Comparación: hoy / v5 sin tocar juvenil / juvenil nuevo (chicos, media de 10 semillas)

| | hoy | v5 con el juvenil de antes | juvenil nuevo |
|---|---|---|---|
| Equipos antes → tras | 13,9 → 14,6 | 13,9 → 15,3 | 13,9 → **12,9** |
| Se eliminan · se crean | 1,6 · 2,3 | 1,8 · 3,2 | 3,0 · 2,0 |
| <14 tras | 0,4 | 0 | 0 |
| Fuera 1.º · 2.º · 3.º | 8 · 23 · 25 | 4 · 16 · 23 | 14 · 43 · 45 |
| Jugadores tras (balance) | 268 (−9 %) | 298 (+2 %) | **240 (−19 %)** |
| Niños por equipo (mín · máx) | 14 · 20 | 14 · 22 | 14 · 22 |
| Equipos por tipo: colegio · pequeño · mediano · grande | 0,8 · 6,2 · 5,3 · 2,3 | 2,2 · 5,2 · 5,5 · 2,4 | 2,2 · 4,3 · 4,5 · 1,9 |
| Suben · bajan de letra | 36 · 26 | 44 · 26 | 44 · 14 |
| **Buenos fuera** (sobre la mediana de su año; 1.º · 2.º · 3.º) | 0 · 0 · 0 | 0,2 · 0,4 · 0,3 | 0,5 · 1,9 · 1,9 |

**Pruebas** (juvenil nuevo, por semilla): **508 pruebas** en total, **138 niños encuentran equipo** (el 27 % de las pruebas) y **51 de ellos lo hacen después de fallar al menos una vez**.

**Chicas** (hoy / v5 de antes / nuevo): equipos tras 2,1 / 1,9 / 1,8; fuera 1.º · 2.º · 3.º 0 · 2 · 2 / 1 · 3 · 3 / 2 · 5 · 6; jugadoras tras 41 / 37 / 32; buenas fuera 0 / 0,1 / 0,8.

**Lectura.** El juvenil nuevo **deja fuera a más gente que el de antes** (fuera 14 · 43 · 45 frente a 4 · 16 · 23; balance −19 % frente a +2 %): **la escala de pruebas limita**. Con el juvenil de antes, los del mercado probaban sin límite y casi todos acababan en algún equipo; con 2–5 pruebas, los de interés bajo (2 pruebas) y los que no llegan a titulares en los clubes de arriba se quedan sin equipo antes de llegar a los medianos y pequeños, que están al final del barrido. **Los que se quedan fuera no son buenos**: solo 0,5 · 1,9 · 1,9 por semilla están por encima de la mediana de su año (el 4 % de los fuera), así que no se pierden buenos jugadores: se pierde gente de nivel bajo. Si el usuario quiere que nadie con ganas se quede fuera, la escala se puede subir (por ejemplo 4–8–10 pruebas) o quitar.

## B11) Tres veranos seguidos con todo junto (semillas 51–55)

Verano del usuario v5 (benjamín y alevín de 18, última pasada sin cupo) y el juvenil nuevo. Media de 5 semillas; al empezar → verano 1 → 2 → 3 (entre paréntesis, la v5 con el juvenil de antes).

| | Equipos | Jugadores | Fuera 1.º / 2.º en cada verano |
|---|---|---|---|
| benjamín | 18,6 → 15,6 → 15,6 → 16,4 | 304 → 290 → 294 → 306 | 1/0 · 2/0 · 3/0 |
| alevín | 17,8 → 15,2 → 14,0 → 13,4 (14,8 → 13,4 → 12,8) | 295 → 275 → 258 → 251 (273 → 253 → 248) | 0/0 · 0/1 · 0/1 |
| infantil | 16,6 → 14,0 → 12,6 → 11,4 | 272 → 259 → 229 → 211 | 0/1 · 4/0 · 1/2 |
| cadete | 16,8 → 12,6 → 12,0 → 12,2 | 279 → 241 → 223 → 215 | 1/0 · 1/1 · 1/1 |
| juvenil | 14,4 → 13,0 → 10,2 → 8,8 (14,6 → 12,6 → 11,6) | 313 → 241 → 196 → 175 (286 → 251 → 227) | 13/36/45 · 18/17/9 · 19/11/8 |
| **Total** | **84,2 → 70,4 → 64,4 → 62,2** (71,6 → 66,2 → 63,2) | **1464 → 1307 → 1201 → 1158** (1349 → 1252 → 1198) | |

Equipos por tipo de club (al empezar → 1 → 2 → 3): benjamín colegio 4,8 → 3,6 → 3,6 → 4,2, **pequeño 5,8 → 4,0 → 3,4 → 3,4**, mediano 6,0 → 6,0 → 6,6 → 6,8, grande 2,0 en todos; alevín colegio 3,6 → 3,6 → 3,4 → 2,6, pequeño 6,2 → 4,2 → 3,2 → 2,8, mediano 6,0 → 5,2 → 4,8 → 4,8, grande 2,0 → 2,2 → 2,6 → 3,2; infantil colegio 1,6 → 2,2 → 2,0 → 1,6, pequeño 6,0 → 3,4 → 3,0 → 2,4, mediano 7,0 → 6,2 → 5,4 → 5,0, grande 2,0 → 2,4; cadete colegio 1,8 → 0,6 → 0,6 → 1,4, pequeño 6,2 → 3,8 → 3,4 → 3,2, mediano 6,0 → 5,2 → 5,0 → 4,6, grande 2,8 → 3,0; juvenil colegio 1,4 → 1,8 → 1,0 → 0,6, pequeño 5,8 → 4,8 → 3,4 → 3,0, mediano 4,6 → 4,2 → 3,6 → 3,4, grande 2,6 → 2,2 → 2,2 → 1,8. Equipos de colegio (benjamín a juvenil): 13,2 → 11,8 → 10,6 → 10,4.

**Por debajo de 14: 0 en los tres veranos y las cinco semillas.** Los clubes pequeños mantienen equipos en benjamín (de 2 a 4 por semilla en el verano 3). **Juvenil cae con el nuevo** (313 → 175 jugadores y 14,4 → 8,8 equipos, frente a 227 y 11,6 con el de antes) por el límite de pruebas.

## B12) Juvenil v2: pruebas por nivel, escala 6/4/3 y cascada en el club (semillas 51–60)

Aplicadas las tres recomendaciones aprobadas (`veranoUsuario`, `modules/npcs/src/draft.ts`, solo medida; el juego no cambia: `typecheck` y `huella -- 60` idénticos).

- **Primero en clubes de su nivel.** El juvenil sin equipo prueba en una primera fase solo en los clubes donde sería titular. **Estimación:** nivel del club = valor del 11.º mejor jugador de su plantilla juvenil (el titular más flojo de su once); el niño es «de su nivel» si vale al menos eso. Después sigue el barrido de siempre (por atractivo) con las pruebas que le queden.
- **Escala:** interés 3 → 6 pruebas, 2 → 4, 1 → 3.
- **Cascada dentro del club:** si un equipo pasa de 22, baja al de abajo su jugador de 1.er año más flojo (A→B→C); en el último equipo sale ese jugador. Hasta 3 rondas. Es una aproximación a la regla del usuario: no mira el puesto del jugador al bajarlo.

### Juvenil chicos, media de 10 semillas (hoy / juvenil antiguo con v5 / v1 nuevo / **v2**)

| | hoy | antiguo | v1 | **v2** |
|---|---|---|---|---|
| equipos tras el verano | 14,6 | 15,3 | 12,9 | **13,5** |
| se eliminan / se crean | 1,6 / 2,3 | 1,8 / 3,2 | 3,0 / 2,0 | **2,5 / 2,1** |
| menos de 14 | 0,4 | 0 | 0 | **0** |
| fuera 1.º / 2.º / 3.er año | 8 / 23 / 25 | 4 / 16 / 23 | 14 / 43 / 45 | **12 / 36 / 38** |
| jugadores tras | 268 | 298 | 240 | **256** |
| balance | −9 % | +2 % | −19 % | **−14 %** |
| buenos fuera (sobre la mediana de su año) 1.º / 2.º / 3.º | 0 / 0 / 0 | 0,2 / 0,4 / 0,3 | 0,5 / 1,9 / 1,9 | **0,9 / 0,0 / 0,1** |
| pruebas / encuentran equipo / tras fallar | | | 508 / 138 / 51 | **589 / 150 / 56** |
| equipos colegio / pequeño / mediano / grande | 0,8 / 6,2 / 5,3 / 2,3 | 2,2 / 5,2 / 5,5 / 2,4 | 2,2 / 4,3 / 4,5 / 1,9 | **2,2 / 4,4 / 4,8 / 2,1** |

Chicas (juvenil): 1,9 equipos, 33 jugadoras, fuera 2 / 4 / 5 por año, buenas fuera 0,8 (v1: 1,8 equipos, 32, 0,8).

**Lectura:** v2 mejora a v1 en todo (+16 jugadores, +0,6 equipos, 36 menos fuera, casi ningún jugador bueno fuera, 20 % más de pruebas y de colocados), pero **sigue por debajo del juvenil antiguo** en cuántos quedan fuera (86 frente a 43) y en balance (−14 % frente a +2 %). Con 6/4/3 pruebas muchos juveniles gastan las pruebas en clubes llenos. Con el resto de categorías con v5, benjamín–cadete: 71,1 equipos (hoy 73,7).

## B13) Tres veranos seguidos con todo junto y juvenil v2 (semillas 51–55)

| | inicio | verano 1 | verano 2 | verano 3 |
|---|---|---|---|---|
| equipos (benjamín a juvenil) | 84,2 | 71,2 | 66,4 | **64,6** |
| jugadores | 1464 | 1322 | 1237 | **1202** |
| menos de 14 | 0 | 0 | 0 | **0** |
| juvenil: equipos / jugadores | 14,4 / 313 | 13,8 / 257 | 12,0 / 231 | **11,4 / 219** |
| juvenil fuera sin equipo | 85 | 78 | 19 | **16** |

Con v1 el juvenil caía a 8,8 equipos y 175 jugadores en el verano 3; con v2 queda en 11,4 y 219 (el de «hoy» tenía 11,6 y 227). El total baja a 64,6 equipos (v1: 62,2). Nunca hay equipos por debajo de 14.

## B14) Juvenil v3: pruebas por cercanía de nivel y cascada por puesto (semillas 51–60)

Corregido lo de v2 (`modules/npcs/src/draft.ts`, solo `veranoUsuario`; `typecheck` y `huella -- 60` idénticos). v2 queda en el commit `478d09e`.

1. **Cercanía de nivel.** Nivel de un club = media de sus 11 mejores jugadores juveniles al empezar el barrido (si no tiene, la media de todos los clubes). Cada juvenil sin equipo ordena los clubes externos por la distancia entre su valor y ese nivel y prueba en ese orden (el más cercano, luego el siguiente…) hasta agotar sus pruebas (6/4/3 según el interés). El barrido pasa por los clubes varias veces (6 pasadas con los equipos que hay, 6 abriendo un equipo más, 6 abriendo dos) para que cada uno llegue a su siguiente club. Un jugador flojo empieza por los clubes flojos.
2. **Cascada por puesto.** Si un equipo pasa de 22, en el grupo de puestos más pasado de su cupo baja el de 1.er año más flojo al equipo de abajo (A→B→C); si en ese grupo no hay de 1.er año, sale el reserva de 2.º más flojo; en el último equipo sale el más flojo del grupo. Hasta 3 rondas.
3. **Medidas nuevas** (en `verano usuario`): plazas libres en los equipos que siguen cuando quedan juveniles fuera; jugadores de los clubes que pierden un equipo y cuántos faltaban para el equipo que no sale (1, 2, 3, 4–6, 7 o más).

### Juvenil chicos, media de 10 semillas (hoy / v2 / **v3**)

| | hoy | v2 | **v3** |
|---|---|---|---|
| equipos tras el verano | 14,6 | 13,5 | **13,9** |
| se eliminan / se crean | 1,6 / 2,3 | 2,5 / 2,1 | **2,1 / 2,1** |
| menos de 14 | 0,4 | 0 | **0** |
| fuera 1.º / 2.º / 3.er año | 8 / 23 / 25 | 12 / 36 / 38 | **9 / 37 / 36** |
| jugadores tras | 268 | 256 | **260** |
| balance | −9 % | −14 % | **−13 %** |
| buenos fuera (sobre la mediana de su año) | 0 | 1,0 | **3,6** |
| pruebas / colocados / tras fallar | | 589 / 150 / 56 | **666 / 203 / 92** |
| equipos colegio / pequeño / mediano / grande | 0,8 / 6,2 / 5,3 / 2,3 | 2,2 / 4,4 / 4,8 / 2,1 | **2,2 / 5,1 / 4,6 / 2,0** |

Chicas: 2,0 equipos, 37 jugadoras, fuera 1,3 / 2,8 / 3 por año, buenas fuera 0,7.

**Plazas libres** (v3, por mundo): con 71,5 juveniles sin equipo al acabar el barrido quedan **46 plazas libres en 8,2 equipos** (huecos hasta 22). Los que quedan fuera no llegan a esos equipos: gastan sus pruebas antes (la cercanía de nivel no es el límite; sí lo son las pruebas y el cupo por puesto).

**Equipos eliminados** (v3, por mundo): 1,4 equipos de juvenil perdidos en la última pasada, con 36,6 jugadores en esos clubes. Faltaban: 1 → 0,1; 2 → 0; 3 → 0; 4 a 6 → 0,7; 7 o más → 0,5. **Casi ninguno estaba a 1–3 jugadores de salvarse**: los equipos que se pierden están lejos de los 14.

### El objetivo del usuario: ¿el número de equipos de juvenil se mantiene el 99 % de las veces?

Tres veranos seguidos con todo junto, semillas 51–60 (`tools/verano-tres.ts`, chicos). Equipos de juvenil de cada club antes y después de cada verano:

| | inicio | verano 1 | verano 2 | verano 3 |
|---|---|---|---|---|
| equipos de juvenil (media) | 13,9 | 13,9 | 12,0 | **11,0** |
| jugadores juveniles | 301 | 260 | 229 | **215** |
| sin equipo (quieren jugar) | 96 | 82 | 26 | 24 |
| total de equipos (benjamín a juvenil) | 85,2 | 72,1 | 67,4 | **64,6** |
| menos de 14 | 0 | 0 | 0 | 0 |
| clubes que cambian su nº de equipos de juvenil | | 41 de 116 (35 %) | 34 de 110 (31 %) | 22 de 96 (23 %) |
| mundos (de 10) en que cambia el total | | 9 | 7 | 9 |

Equipos de juvenil por mundo, antes → después: verano 1: 14→13, 15→14, 13→12, 17→14, 13→15, 9→10, 13→13, 14→15, 13→16, 18→17; verano 2: 13→13, 14→11, 12→10, 14→12, 15→12, 10→11, 13→13, 15→15, 16→12, 17→11; verano 3: 13→9, 11→12, 10→9, 12→11, 12→12, 11→12, 13→10, 15→14, 12→11, 11→10.

**No se cumple.** En 322 clubes-verano el número de equipos de juvenil cambia en 97 (30 %); se mantiene el **70 %**, no el 99 %. Además baja de forma sostenida (13,9 → 11,0): cada verano salen los de 3.er año y abandonan unos 90, y entran menos de los que se van (los cadetes de 2.º año suben, pero hay pocos que quieran seguir y, con equipos de mínimo 14, el club pierde un equipo en cuanto su plantilla baja de 14 por año). Dónde se podría actuar (sin hacerlo aún, cambiaría reglas): (a) que un club conserve su equipo con menos de 14 si el año anterior lo tenía, (b) que el reclutamiento de cadete a juvenil sea prioritario para los clubes que bajarían de equipos, (c) que el club recupere jugadores de su lista de abandonos antes de cerrar el equipo (como ya hacen los colegios).

## B15) Juvenil v4: los equipos se mantienen (semillas 51–60)

El juvenil rediseñado por el usuario (`modules/npcs/src/draft.ts`, solo `veranoUsuario`; `typecheck` y `huella -- 60` idénticos). v3 queda en el commit `ea993d5`.

1. **Los cadetes que pasan a juvenil suben al juvenil de su club** (ya eran miembros del club; solo se van los que buscan fuera, con la probabilidad de hoy).
2. **Ningún club elimina equipos de entrada:** se conserva el número de equipos que tenía (`kPrev`); solo pierde uno si ni así reúne 14 por equipo (`min(kPrev, ⌊jugadores/14⌋)`).
3. **El último equipo (C) se alimenta de los cadetes que suben** (1.er año). **El A y el B**, de los de 2.º y 3.º que siguen (el A, los de más edad) más, por titularidad y de abajo arriba, los mejores de los que suben. **Si un equipo no llega a 14**, el de abajo le deja a sus mejores (suben) y, si no puede, el de arriba le deja a sus peores (bajan): en el C se quedan los peores de los que subirían hasta 14.
4. Pruebas por cercanía de nivel (6/4/3) y cascada por puesto (v3).
5. **Los que se quedan sin equipo tras todas las rondas:** vuelven a su club si hay hueco; los demás buscan en las plazas libres que queden en cualquier equipo (por cercanía de nivel; sin límite de pruebas ni cupo de puesto, como la última pasada de las demás categorías). Para que cupieran, en juvenil un equipo sobrante puede entrar en cualquier letra (antes la B era solo de 1.er año).
6. **Al final**, un equipo que ni así llega a 14 se elimina.

### Juvenil chicos, media de 10 semillas (hoy / v3 / **v4**)

| | hoy | v3 | **v4** |
|---|---|---|---|
| equipos tras el verano | 14,6 | 13,9 | **14,8** |
| equipos A / B / C (antes: 10,0 / 3,0 / 0,9) | 9,8 / 3,5 / 1,2 | 10,9 / 2,0 / 1,0 | **11,2 / 2,8 / 0,8** |
| se eliminan / se crean | 1,6 / 2,3 | 2,1 / 2,1 | **0,7 / 1,6** |
| menos de 14 | 0,4 | 0 | **0** |
| fuera 1.º / 2.º / 3.er año | 8 / 23 / 25 | 9 / 37 / 36 | **0 / 19 / 19** |
| jugadores tras | 268 | 260 | **303** |
| balance | −9 % | −13 % | **+2 %** |
| buenos fuera | 0 | 3,6 | **0** |
| pruebas / colocados en el barrido | | 666 / 203 | **548 / 148** |
| plazas libres al final (con juveniles fuera) | | 46 | **22,6 (11,2)** |
| vuelven a su club | | | **2,3** |
| entran por las plazas libres | | | **31,1** |
| equipos eliminados: equipos / jugadores | | 1,4 / 36,6 | **0,3 / 8,6** (faltaban 1: 0,1; 4–6: 0,2; 7 o más: 0) |
| equipos colegio / pequeño / mediano / grande | 0,8 / 6,2 / 5,3 / 2,3 | 2,2 / 5,1 / 4,6 / 2,0 | **2,2 / 5,5 / 5,0 / 2,1** |

Chicas: 2,0 equipos, 37 jugadoras, fuera 1,3 / 2,8 / 3 por año (no cambian).

Quedan fuera 34 juveniles por mundo en el momento de contar (parte de ellos, expulsados por la reorganización final tras el paso de las plazas libres: 3,3 por mundo).

### Tres veranos seguidos (semillas 51–60, chicos; antes v3: 13,9 → 13,9 → 12,0 → 11,0)

| | inicio | verano 1 | verano 2 | verano 3 |
|---|---|---|---|---|
| equipos de juvenil | 13,9 | **14,8** | **13,2** | **11,9** |
| A / B / C | 10,0 / 3,0 / 0,9 | 11,2 / 2,8 / 0,8 | 10,1 / 2,4 / 0,7 | 8,8 / 2,4 / 0,7 |
| jugadores juveniles | 301 | 303 | 263 | 234 |
| sin equipo (quieren jugar) | 96 | 39 | 7 | 7 |
| total de equipos (benjamín a juvenil) | 85,2 | 73,0 | 68,7 | 65,3 |
| menos de 14 | 0 | 0 | 0 | 0 |
| clubes que cambian su nº de equipos de juvenil | | 23 de 116 (20 %) | 16 de 112 (14 %) | 17 de 103 (17 %) |
| mundos (de 10) en que cambia el total | | 8 | 9 | 6 |

Equipos de juvenil por mundo, antes → después: verano 1: 14→15 15→13 13→13 17→17 13→15 9→11 13→16 14→15 13→14 18→19; verano 2: 15→14 13→11 13→12 17→15 15→12 11→10 16→16 15→14 14→13 19→15; verano 3: 14→13 11→11 12→11 15→12 12→12 10→10 16→13 14→14 13→11 15→12.

**Mejora mucho, pero no llega al 99 %.** En 331 clubes-verano el número de equipos de juvenil cambia en 56 (17 %): se mantiene el **83 %** (con v3, el 70 %). Ya no sobran juveniles (de 96 sin equipo a 7), se eliminan 0,3 equipos por verano en el barrido y el primer verano incluso crea equipos. **Pero el total de juveniles baja verano a verano (303 → 263 → 234)** y, con el mínimo de 14, el club pierde un equipo cuando su plantilla ya no da para 14 por equipo. La causa no es el reparto sino la población: abandonan ~90 al año y se retiran los de 3.º, y entran menos de los que se van (solo los cadetes que quieren seguir). Con equipos que se mantienen pero sin más gente, el ajuste sale en los clubes pequeños y, a la larga, en los A de menos jugadores. Palancas posibles (sin aplicar): (a) que el C pueda bajar de 14 un año (un equipo 'de 12 a 13') si el club lo tenía, (b) más inflow (reclutar en el mercado a quien no jugaba, como en benjamín), (c) menos abandonos en juvenil.

## B16) Juvenil v5 y ocho veranos seguidos (semillas 51–60, chicos)

Matices del usuario (`modules/npcs/src/draft.ts`, solo `veranoUsuario`; `typecheck` y `huella -- 60` idénticos; v4 en el commit `6477b8f`):

1. **Se recupera a quien abandona si deja a su equipo sin los 14.** Si el club (externo) tiene menos de `14 × equipos que tenía` jugadores de juvenil, quienes iban a abandonar *de ese club* no abandonan: se quedan, los mejores primero, hasta cubrir lo que falta. Si la reorganización expulsa a uno de ellos, no abandona: va al club que lo necesita (el que tiene menos de 14 por equipo), por cercanía de nivel.
2. **Si desaparece un B, el C pasa a ser el B** (los equipos se reparten siempre por orden: A, B, C; si un club solo da para dos, el segundo es el de los de 1.er año). **Al año siguiente, si se puede, se vuelve a crear:** cada club recuerda el máximo de equipos de juvenil que ha tenido (`techoJ`) y vuelve a montarlo en cuanto la plantilla da para 14 por equipo; los de 1.er año (los cadetes que suben) alimentan el último.

### Juvenil por verano (media de 10 semillas; el verano 0 es el inicio)

| verano | equipos | A / B / C | jugadores | sin equipo | abandonos | recuperados | expulsados a otro club | equipos eliminados | C→B | B recreados |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 13,9 | 10,0 / 3,0 / 0,9 | 301 | 96 | | | | | | |
| 1 | 14,8 | 11,2 / 2,7 / 0,9 | 303 | 48 | 96,3 | 9,4 | 0,2 | 0,3 | 0 | 1,6 |
| 2 | 13,6 | 10,2 / 2,6 / 0,8 | 276 | 8 | 90,8 | 13,4 | 0,3 | 0,2 | 0,1 | 0 |
| 3 | 12,4 | 9,1 / 2,5 / 0,8 | 248 | 8 | 73,1 | 12,9 | 1,2 | 0,1 | 0 | 0,1 |
| 4 | 11,8 | 8,5 / 2,5 / 0,8 | 234 | 6 | 67,9 | 14,9 | 1,2 | 0 | 0 | 0 |
| 5 | 11,6 | 8,4 / 2,4 / 0,8 | 226 | 4 | 60,0 | 14,0 | 0,9 | 0,1 | 0 | 0,2 |
| 6 | 11,1 | 7,9 / 2,4 / 0,8 | 216 | 3 | 56,1 | 16,6 | 1,5 | 0,1 | 0 | 0,1 |
| 7 | 10,3 | 7,2 / 2,4 / 0,7 | 203 | 4 | 50,2 | 15,5 | 1,4 | 0,1 | 0,1 | 0,1 |
| 8 | 9,7 | 6,9 / 2,2 / 0,6 | 188 | 2 | 45,4 | 11,5 | 0,8 | 0,3 | 0,1 | 0 |

### Estabilidad del número de equipos de juvenil (% de clubes que cambian en cada verano)

v1: 23/116 (20 %) · v2: 12/112 (11 %) · v3: 14/103 (14 %) · v4: 6/91 (7 %) · v5: 6/87 (7 %) · v6: 7/84 (8 %) · v7: 10/80 (12 %) · v8: 6/72 (8 %). Mundos (de 10) en que cambia el total: 8, 7, 8, 4, 4, 5, 6, 5.
**Total: 84 de 745 clubes-verano cambian (11,3 %); de los veranos 4 a 8, 35 de 414 (8,5 %): ~91 % estables, no el 99 %.** Frente a v4 (83 %) mejora, y los equipos eliminados son rarísimos (0,1–0,3 por verano). Lo que queda no es eliminar equipos de entrada sino **perder jugadores**: los A bajan (11,2 → 6,9) porque los que quedan son menos.

### Las demás categorías en los mismos veranos (equipos y, entre paréntesis, jugadores)

| | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|---|
| benjamín | 18,8 (307) | 15,6 (293) | 16,1 (297) | 16,1 (303) | 16,0 (297) | 15,7 (298) | 15,7 (296) | 15,9 (298) | 15,2 (289) |
| alevín | 18,2 (301) | 15,4 (281) | 14,3 (262) | 13,8 (252) | 14,0 (255) | 14,3 (258) | 13,8 (251) | 13,7 (252) | 13,8 (254) |
| infantil | 17,0 (277) | 14,0 (260) | 12,8 (232) | 11,8 (219) | 10,8 (209) | 10,2 (199) | 10,1 (200) | 10,2 (200) | 10,1 (200) |
| cadete | 17,3 (279) | 13,3 (244) | 12,2 (230) | 11,9 (215) | 10,3 (197) | 9,4 (185) | 9,0 (175) | 8,6 (167) | 8,4 (167) |
| **total** | 85,2 (1466) | 73,1 (1381) | 69,0 (1297) | 66,0 (1237) | 62,9 (1191) | 61,2 (1166) | 59,7 (1138) | 58,7 (1120) | 57,2 (1098) |

Menos de 14: 0 en todos los veranos. Sin equipo (todas las categorías): 97, 53, 18, 15, 14, 16, 12, 13, 10.

**¿Se estabiliza?** Cada categoría se estabiliza **más tarde que la anterior**, como una cascada: benjamín desde el verano 1 (~296 jugadores, 15–16 equipos), alevín desde el 3 (~254, 14), infantil desde el 6 (~200, 10), cadete aún baja en el 8 (167, 8,4; parece llegar a ~160 hacia el 9–10), **juvenil sigue bajando en el 8 (188 jugadores, 9,7 equipos)**: ni el número de juveniles ni de equipos se recupera aún; cada categoría de arriba hereda el descenso de la de abajo y le cuesta unos tres veranos más. Estimación: el juvenil se estabilizaría cerca de los 150 jugadores y 7–8 equipos hacia el verano 11–12; el mundo entero, en unos 57–54 equipos (frente a 85 al empezar), porque el reparto inicial tenía equipos de 18 y los veranos los dejan en los jugadores que de verdad quieren jugar. Palancas si se quiere más (sin aplicar): más entrada en cada categoría (reclutar a quien no jugaba, como en benjamín), menos abandonos, o dejar que un equipo baje de 14 un año.

## B17) La partida empieza en equilibrio (semillas 51–60, chicos, 8 veranos)

Medida, sin cambiar el juego (`DIAGNOSTICO.equilibrioInicial`, apagado por defecto; `typecheck` y `huella -- 60` idénticos; commits `d58e49d` y `d09d6da`). `tools/verano-tres.ts <semilla> m 8 eq`.

**Cómo está hecho.** Al crear el mundo, antes de reclutar (`generarTodos`, `abandonoPrevio` en `draft.ts`), cada niño con interés por el fútbol y edad de categoría (8 a 18) pasa por los veranos de su edad (de 9 años hasta la de hoy) con **la misma función de abandono del juego** (`dejaElDeporte`, mismas bases por edad y mismos motivos: interés, ambición, estudios, padres, minutos y nivel) y su sorteo estable de siempre con un curso anterior al 0. Quien lo habría dejado queda anotado (`dejado`) y no se recluta; en el juego real eso es exactamente lo que le pasa a quien abandona. Como al crear no hay equipos, la titularidad y lo bueno que es frente a los de su edad se **estiman con su talento** (media de sus topes frente a los de su edad con interés; el 65 % mejor cuenta como titular, 11 de 17). Es un cálculo directo, no una simulación año a año: da lo mismo en distribución porque aplica a cada niño el mismo sorteo que le tocaría verano tras verano; la única aproximación es la titularidad/nivel de los años pasados (se toma el talento de hoy). No incluye la recuperación del juvenil (el abandono evitado cuando el equipo se quedaría sin 14), que necesita clubes.
**J4:** con cohortes más pequeñas, muchos clubes no reúnen 14 juveniles en el primer reparto y los que sobran no tenían adónde ir; los clubes sin equipo, de más a menos atractivo, forman uno con los que sobran (14 a 22). Sin J4 el juvenil empezaba con 86 jugadores en 3,9 equipos (y 60 sin equipo); con J4, 136 en 6,3 (y 10 sin equipo).

### Por categoría y verano: equipos (jugadores). Verano 0 = al crear

| | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|---|
| benjamín | 18,1 (293) | 15,5 (293) | 15,8 (295) | 16,0 (297) | 15,4 (293) | 15,8 (302) | 16,4 (303) | 15,7 (296) | 15,2 (288) |
| alevín | 14,6 (240) | 13,4 (245) | 13,7 (250) | 13,6 (250) | 13,8 (253) | 13,7 (251) | 13,8 (248) | 13,9 (255) | 13,8 (256) |
| infantil | 10,3 (187) | 10,0 (189) | 9,9 (186) | 10,1 (193) | 10,3 (198) | 10,7 (202) | 10,6 (199) | 10,3 (198) | 9,9 (197) |
| cadete | 8,6 (154) | 8,2 (149) | 7,9 (154) | 8,1 (158) | 8,2 (160) | 8,3 (162) | 8,6 (170) | 8,5 (168) | 8,4 (168) |
| juvenil | 6,3 (136) | 6,6 (143) | 6,7 (141) | 6,7 (138) | 6,8 (146) | 6,9 (150) | 7,2 (156) | 7,5 (161) | 7,6 (163) |
| **total** | 57,9 (1010) | 53,7 (1019) | 54,0 (1026) | 54,5 (1036) | 54,5 (1049) | 55,4 (1068) | 56,6 (1076) | 55,9 (1078) | 54,9 (1072) |

Las categorías **arrancan en su equilibrio y no caen** (antes, el total bajaba de 85 a 57 equipos y de 1466 a 1098 jugadores): benjamín ~293 (objetivo 290–300), alevín 240–256 (~250), infantil 186–202 (~200), cadete 149–170 (~160), juvenil 136–163 (~150). **Menos de 14: 0 en todos los veranos**; sin equipo (todas las categorías): 10, 13, 11, 12, 14, 12, 10, 13, 14 (los que quieren jugar y no tienen sitio; antes 97 al empezar). Los equipos de benjamín pasan de 18,1 (al crear) a 15,5 en el verano 1: el reparto inicial los hace de 14 a 18 y el primer verano los deja en el equilibrio (benjamín y alevín de 18).

### Estabilidad del juvenil (% de clubes que cambian su número de equipos de juvenil)

v1: 3/66 (5 %) · v2: 1/67 (1 %) · v3: 0/67 (0 %) · v4: 5/70 (7 %) · v5: 1/69 (1 %) · v6: 3/72 (4 %) · v7: 3/75 (4 %) · v8: 3/77 (4 %). Mundos (de 10) en que cambia el total: 3, 1, 0, 5, 1, 3, 3, 3. Equipos eliminados por verano: 0. Expulsados que van a otro club: 1 a 3 por verano; abandonos recuperados: 7 a 10 de ~40 abandonos.
**Total: 19 de 563 clubes-verano cambian (3,4 %): ~97 % estables** (con v5 sin equilibrio, ~91 %; con v4, 83 %). No llega al 99 % pedido, pero casi todos los cambios son de ±1 equipo en un club y el total de juvenil solo sube despacio (6,3 → 7,6 equipos; 136 → 163 jugadores) porque los A de los clubes vuelven a abrir el equipo que el primer reparto no había formado.

### Coste de crear (ciudad grande, tiempo de `nuevaPartida`, medido tres semillas dos veces)

Sin equilibrio: 9,6 · 9,5 · 8,2 · 8,5 · 9,0 · 9,6 s (media 9,1 s). Con equilibrio: 7,5 · 7,0 · 8,7 · 8,5 · 8,4 · 8,3 s (media 8,1 s). **No cuesta más: sale ~1 s más rápido** (hay unos 270 jugadores menos que colocar en los equipos y `abandonoPrevio` son ~10 000 sorteos). El peso del estado también baja (menos jugadores en equipos).

