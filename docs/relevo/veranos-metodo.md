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
