# Reparto nuevo con chicos y chicas por separado (semillas 51–60)

Solo medida (24/11/2026), sin cambiar el juego. Ciudad grande con hogares, semillas 51–60; reparto nuevo + equilibrar (`reparto-nuevo-reglas.md`). Herramienta: `npm run equipos-minimo -- grande con <semilla> --equilibrar --chicas=0.11 [--solo=m|f]` (`--chicas`: ~10 % de chicas entre los que quieren jugar; `--solo`: desde infantil solo chicos o solo chicas). Cada celda: media (mín–máx).

## 1. Cuántos quieren jugar

| Cat | Chicos | Chicas | % chicas |
|---|---|---|---|
| benjamín | 284 (261–323) | 31 (23–38) | 9,8 % |
| alevín | 278 (257–305) | 31 (22–40) | 10,0 % |
| infantil | 285 (250–307) | 35 (24–45) | 10,9 % |
| cadete | 290 (268–307) | 40 (35–44) | 12,0 % |
| juvenil | 409 (385–431) | 41 (36–46) | 9,1 % |

(Sin sesgo hay ~280 chicos y ~280 chicas por categoría: ~50 %.) Con ~10 % de chicas, el total baja de ~560 a ~315 por categoría, y todo lo que sigue sale con la mitad de niños que las mediciones anteriores.

## 2. Los chicos (benjamín y alevín mixtos; infantil, cadete y juvenil solo chicos)

| Cat | Equipos (A·B·C·D) | Niños/equipo mín | máx | <14 | Sin equipo en el reparto |
|---|---|---|---|---|---|
| benjamín (mixto) | 18,8 (11,3 · 7,5 · 0 · 0) | 14 | 21,9 | 0 | 0 |
| alevín (mixto) | 18,2 (11,5 · 6,7 · 0 · 0) | 14 | 22 | 0 | 0 |
| infantil | 17,0 (9,2 · 6,7 · 1,1 · 0) | 14 | 22 | 0 | 8 (5–11) de 285 |
| cadete | 17,3 (9,8 · 6,5 · 1,0 · 0) | 14 | 21,4 | 0 | 10 (6–16) de 290 |
| juvenil | 13,9 (10,0 · 3,0 · 0,9 · 0) | 19,6 (14–22) | 22 | 0 | 107 (52–188) de 409 (27 · 28 · 21 por año) |

Para comparar, mixto ~50 % (mismas semillas): benjamín 31,7 equipos, alevín 32,0, infantil 29,6, cadete 30,3, juvenil 30,6; mínimo 14, 0 sin equipo salvo juvenil (98).

**¿Sigue funcionando el método?** Sí, con una extensión: con la mitad de niños aparecen B, C o D de menos de 14 (un B de 1, de 7…) en benjamín y alevín; la regla de que un equipo de menos de 14 desaparece y sus niños buscan sitio (nueva, en `reparto-nuevo-reglas.md`) lo resuelve (0 por debajo de 14 en todas las categorías). Quedan 8–10 chicos sin equipo en infantil y cadete (los colegios pequeños no los reúnen) y en juvenil ~26 % de los que querían (igual que antes, un poco más). Hay ~13–19 equipos por categoría para 13 clubes: muchos clubes con un solo equipo.

## 3. Las chicas (benjamín y alevín mixtos con los chicos; infantil, cadete y juvenil, solo chicas)

| Cat | Chicas | Clubes con equipo femenino | Equipos (A·B) | Niñas/equipo | <14 | Sin equipo |
|---|---|---|---|---|---|---|
| infantil | 35 (24–45) | 1,1 (1–2) de 13 | 1,3 (1,1 · 0,2) | 15–22 | 0 | 8 (1–23) |
| cadete | 40 (35–44) | 1,0 de 13 | 1,7 (1,0 · 0,7) | 14–22 | 0 | 6 (0–17) |
| juvenil | 41 (36–46) | 0 de 13 | 0 | — | — | 41 (todas) |

- **Por club y categoría:** ~2,7 chicas interesadas de media por club (35 ÷ 13 en infantil); con 14 por equipo solo un club por categoría llega, y en juvenil ninguno (3 años repartidos entre 13 clubes: ninguno junta 14 de un año ni 14 mezclando).
- **Las chicas son el 10 %, pero el método reparte a cada una a un club por sorteo ponderado**: no concentra, por lo que 35 chicas no forman 2 equipos aunque cabrían (35 ÷ 14 = 2,5).

## 4. Opciones para las chicas (con números; no aplicadas)

Chicas que quieren jugar y equipos posibles de 14 a 22 si se las junta (cota: 14 por equipo; asumiendo que los clubes las reciben de toda la ciudad):

| Opción | Chicas | Equipos posibles (14–22) | Semillas sin 14 |
|---|---|---|---|
| Por categoría, como los chicos (hoy) | infantil 35, cadete 40, juvenil 41 | 1,3 · 1,7 · 0 (medido) | juvenil, siempre |
| **Equipos femeninos solo en algunos clubes** (concentrar 2–3 clubes por categoría) | infantil 35, cadete 40, juvenil 41 | 2,0 · 2,2 · 2,3 (mín. por cupo 2,1 · 2,0 · 2,2) | 0 de 10 |
| **Juntar categorías** alevín+infantil | 66 | 4,2 (3,0–5,0) | 0 |
| Juntar infantil+cadete | 74 | 4,7 (4,0–5,0) | 0 |
| Juntar cadete+juvenil | 80 | 5,1 (5,0–6,0) | 0 |
| Juntar infantil+cadete+juvenil (un solo femenino de 12 a 18) | 115 | 7,7 (7,0–8,0) | 0 |
| **Que jueguen con chicos** (solo si no hay equipo femenino): chicas sin equipo frente a hueco en equipos de chicos (22 − tamaño) | sin equipo: infantil 8, cadete 6, juvenil 41 | huecos: infantil 97 (69–121), cadete 101 (28–150), **juvenil 4 (0–24)** | — |

Lectura: con las chicas por categoría, solo 1 club de 13 tiene equipo femenino en infantil y cadete y ninguno en juvenil. **Concentrar en 2–3 clubes por categoría** da 2 equipos por categoría (35 chicas caben en 2 equipos de unas 17); **juntar categorías** da 4–8 equipos femeninos (con 4 equipos para infantil-cadete se juega con 3 años de diferencia: 12 a 15). **Jugar con chicos funciona en infantil y cadete (hay cientos de huecos) pero no en juvenil: sus equipos están llenos (hueco de 4 para 41 chicas).** Los colegios solo aceptan a sus alumnas y los clubes solo si hay hueco; no se ha comprobado club a club (cota global).

## 5. Lo raro

- El 10 % de chicas **recorta a la mitad el mundo del fútbol** (de ~560 a ~315 que quieren jugar por categoría): equipos, clubes y la estructura A/B/C/D se quedan pequeños y juvenil deja a 107 chicos sin equipo. Si se quiere el mismo número de jugadores, harían falta más chicos interesados (hoy el interés por el fútbol de los chicos es ~57 %).
- Cadete sale con 12 % de chicas (fluctuación del hash de interés con pocas chicas: 35–44).
- Juvenil chicas: 41 y 0 equipos; con el método de juvenil (J1) no se puede formar ninguno con 13 clubes.
- Benjamín 53: un club pequeño sin ningún equipo (A=B=0) y B de 1 niño antes de la extensión.


## 6. Regla base del usuario: equipos femeninos solo en clubes externos (semillas 51–60)

`--solo=f --sin-colegios`: desde infantil los colegios no tienen equipo y sus alumnas van a los 9 clubes externos con el sorteo de siempre. Resultado (media y rango):

| Cat | Chicas | Equipos femeninos (A·B) | Clubes con equipo (de 9 externos) | Niñas/equipo mín–máx | <14 | Sin equipo | Semillas con ≥2 · ≥4 equipos |
|---|---|---|---|---|---|---|---|
| infantil | 35 (24–45) | 1,9 (1–3) (1,1 · 0,8) | 1,1 (1–2) | 16,4–19,2 | 0 | 2 (0–5) | 8 · 0 |
| cadete | 40 (35–44) | 2,0 (2–2) (1,1 · 0,9) | 1,1 (1–2) | 16,4–21,0 | 0 | 2 (0–4) | 10 · 0 |
| juvenil | 41 (36–46) | 0 | 0 | — | — | 41 (todas) | 0 · 0 |

(Con los colegios como antes: 1,3 · 1,7 · 0 equipos y 8 · 6 · 41 sin equipo.) Quitar los colegios ayuda: **infantil sube de 1,3 a 1,9 equipos y cadete de 1,7 a 2,0**, y las chicas sin equipo bajan de 8 y 6 a 2 y 2; juvenil sigue sin ninguno. Dos equipos por categoría no forman liga (en el resto del juego una división tiene 10–12): **no hay liga femenina con las categorías por separado.**

**¿Hace falta juntar categorías?** Sí, si se quiere una liga de 4 o más equipos. Opciones (sin aplicar; mismas cotas de 14 por equipo): alevín+infantil 66 chicas → 4,2 equipos; infantil+cadete 74 → 4,7; cadete+juvenil 80 → 5,1; un solo femenino de 12 a 18 115 → 7,7 (7–8). Con 7–8 equipos sí es una liga pequeña (7 equipos = 12 jornadas a doble vuelta); con 4–5 apenas (6–10 jornadas). A cambio hay 3–4 años de diferencia entre jugadoras (12 a 18).
