# El volumen de movimientos de un verano (reglas de hoy)

Solo medida (24/11/2026), sin cambiar el juego. `npx tsx tools/verano-volumen.ts <semilla> [grande|actual]` juega un curso entero con el personaje apuntado al colegio (fin de curso = semana 48) y mide el verano siguiente con las reglas de hoy (`renovarDeportistas`: abandono, fichajes de verano, reclutar, completar equipos); `npx tsx tools/verano-volumen-tabla.ts <salidas>` las agrega. Ciudad grande con hogares. Se apoya en `DIAGNOSTICO.alVerano` (la lista en cada paso: `inicio`, `tras abandono`, `tras fichajes`, `tras reclutar`, `fin`) y en `alProbar` y `alDesplazar` que ya existían. Semilla 33 y semillas 31–35 (media y rango).

**Cómo leer las cifras.** Categoría y año = edad de juego en el curso que acaba (los que había) o en el que empieza (los que llegan). «Buscan cambiar de club» = (a) van a probar a otro club por su cuenta, (b) pierden la plaza por mérito, porque sobran al recolocar o porque cierra su equipo, o (c) acaban el colegio y su club era el del colegio; «lo consiguen» = al final del verano juegan en algún club (no siempre otro: tras un cierre pueden quedarse en el mismo). «Cambian de club (en total)» = jugaban en un club y al final juegan en otro. Un niño puede tener más de un motivo.

**Lo que no se puede medir sin cambiar el juego (estimado):** el *tras abandono* de benjamín 1.º año es 0 porque aún no ha entrado nadie (los 8 años entran después); las edades de 8 años y las familias que se mudan se identifican por no existir antes (id nuevo) o por tener 8 años.

## Lo principal (5 semillas)

- **Abandonan** (de los que jugaban): benjamín 9 %, alevín 10 %, infantil 10 %, cadete 18 %, **juvenil 30 %** (de 29 % en 1.º a 36–38 % en 2.º y 3.º).
- **Buscan cambiar de club:** 19–23 % por categoría (unos 110–130 niños por categoría), y **casi todos lo consiguen** (97–100 % en benjamín a cadete; 88 % en juvenil). Cambian de club de verdad unos 80–107 por categoría.
- **Llegan:** a benjamín 1.er año entran de media **130 niños de 8 años** (de 501 de 8 años que hay: juegan ~267) y **137 niños de familias que se mudan** (id nuevo, todos de 8 años en benjamín: los hogares los traen ya con edad); los **«niños nuevos» (existían, no jugaban, empiezan a jugar con otra edad) casi no existen hoy: 0–3 por categoría y verano**. Los otros que vuelven son los apartados del año anterior (juvenil 26 de media, la segunda oportunidad de los que se quedaron sin equipo).
- **Balance neto del verano** (tras todo el verano frente al final del curso): benjamín −7 %, alevín −8 %, infantil −12 %, cadete −12 %, juvenil −15 %: cada categoría pierde más (abandonos) de lo que gana (entradas), salvo benjamín, que recibe a los de 8 años.
- **Antes de rehacer los equipos** (los que siguen y suben de año, sin llegadas): benjamín 248 (solo 2.º año), alevín 504, infantil 484, cadete 480, juvenil 516 (de 688).

## Semilla 33 (ciudad grande con hogares)

### 1–3. Los que había, los que lo dejan y los que buscan club

|  | Jugaban | Abandonan | % | Se retiran por edad | Quedan libres al acabar el colegio | Buscan cambiar | % | Lo consiguen | Cambian de club (en total) | Sin club al final (apartados) |
|---|---|---|---|---|---|---|---|---|---|---|
| benjamín · 1.º año | 281 | 20 | 7 % | 0 | 0 | 47 | 17 % | 47 | 48 | 0 |
| benjamín · 2.º año | 277 | 27 | 10 % | 0 | 0 | 77 | 28 % | 76 | 68 | 1 |
| alevín · 1.º año | 281 | 19 | 7 % | 0 | 0 | 67 | 24 % | 66 | 55 | 2 |
| alevín · 2.º año | 244 | 25 | 10 % | 0 | 0 | 56 | 23 % | 49 | 43 | 9 |
| infantil · 1.º año | 263 | 26 | 10 % | 0 | 0 | 55 | 21 % | 48 | 46 | 7 |
| infantil · 2.º año | 258 | 28 | 11 % | 0 | 0 | 69 | 27 % | 69 | 57 | 0 |
| cadete · 1.º año | 276 | 53 | 19 % | 0 | 0 | 63 | 23 % | 63 | 45 | 0 |
| cadete · 2.º año | 267 | 52 | 19 % | 0 | 0 | 62 | 23 % | 62 | 39 | 0 |
| juvenil · 1.º año | 265 | 78 | 29 % | 0 | 0 | 43 | 16 % | 41 | 37 | 2 |
| juvenil · 2.º año | 229 | 88 | 38 % | 0 | 45 | 71 | 31 % | 71 | 65 | 0 |
| juvenil · 3.º año | 184 | 66 | 36 % | 0 | 0 | 0 | 0 % | 0 | 0 | 0 |

Buscan cambiar, por motivo (un niño puede tener más de uno):

|  | A probar fuera (hacia un club mejor) | Suplente que baja a uno menor | Pierde la plaza por mérito | Sobra al recolocar | Cierra su equipo | Fin del colegio |
|---|---|---|---|---|---|---|
| benjamín · 1.º año | 34 | 2 | 31 | 0 | 0 | 0 |
| benjamín · 2.º año | 32 | 2 | 41 | 16 | 0 | 0 |
| alevín · 1.º año | 47 | 3 | 36 | 1 | 0 | 0 |
| alevín · 2.º año | 28 | 0 | 40 | 3 | 2 | 0 |
| infantil · 1.º año | 30 | 1 | 39 | 1 | 1 | 0 |
| infantil · 2.º año | 24 | 0 | 22 | 10 | 18 | 0 |
| cadete · 1.º año | 36 | 1 | 23 | 4 | 8 | 0 |
| cadete · 2.º año | 36 | 1 | 33 | 0 | 4 | 0 |
| juvenil · 1.º año | 23 | 1 | 17 | 0 | 7 | 0 |
| juvenil · 2.º año | 21 | 3 | 9 | 0 | 0 | 45 |
| juvenil · 3.º año | 0 | 0 | 0 | 0 | 0 | 0 |

### 4. Flujo entre categorías por edad (los que siguen jugando pasan al año siguiente)

| De | Pasan a (media) |
|---|---|
| benjamín · 1.º año | benjamín · 2.º año: 261 |
| benjamín · 2.º año | alevín · 1.º año: 250 |
| alevín · 1.º año | alevín · 2.º año: 262 |
| alevín · 2.º año | infantil · 1.º año: 219 |
| infantil · 1.º año | infantil · 2.º año: 237 |
| infantil · 2.º año | cadete · 1.º año: 230 |
| cadete · 1.º año | cadete · 2.º año: 223 |
| cadete · 2.º año | juvenil · 1.º año: 215 |
| juvenil · 1.º año | juvenil · 2.º año: 187 |
| juvenil · 2.º año | juvenil · 3.º año: 96 |
| juvenil · 3.º año | senior · 1.º año: 118 |

### 5. Quién entra (no jugaban al final del curso y juegan al empezar el siguiente)

|  | De 8 años (benjamín, 1.er año) | Familias que se mudan | Niños nuevos (existían, no jugaban) | Apartados que vuelven |
|---|---|---|---|---|
| benjamín · 1.º año | 147 | 122 | 0 | 0 |
| benjamín · 2.º año | 0 | 0 | 2 | 0 |
| alevín · 1.º año | 0 | 0 | 1 | 0 |
| alevín · 2.º año | 0 | 0 | 1 | 0 |
| infantil · 1.º año | 0 | 0 | 0 | 0 |
| infantil · 2.º año | 0 | 0 | 0 | 0 |
| cadete · 1.º año | 0 | 0 | 0 | 2 |
| cadete · 2.º año | 0 | 0 | 0 | 0 |
| juvenil · 1.º año | 0 | 0 | 0 | 0 |
| juvenil · 2.º año | 0 | 0 | 0 | 0 |
| juvenil · 3.º año | 0 | 0 | 2 | 32 |

De 8 años en el mundo: 503, de ellos juegan 269. Personas nuevas por mudanza (todas las edades, jueguen o no): 456.

### 6. Quién sale por arriba (los que dejan juvenil por edad)

|  | Terminan juvenil (3.º año) | De ellos siguen jugando al empezar el curso (sin categoría) | Abandonan antes (ya contados arriba) |
|---|---|---|---|
| juvenil · 3.º año | 184 | 118 | 66 |

### 7. El balance neto, por año y por categoría (curso que acaba frente a curso que empieza)

Por año de la categoría (personas que había en ese año frente a las que habrá en él: no son las mismas personas, son los tamaños de cada «promoción»):

|  | Había al final del curso | Habrá al empezar, antes de rehacer los equipos (los que suben y siguen) | Habrá tras todo el verano (con las llegadas) |
|---|---|---|---|
| benjamín · 1.º año | 281 | 0 | 269 |
| benjamín · 2.º año | 277 | 261 | 259 |
| alevín · 1.º año | 281 | 250 | 254 |
| alevín · 2.º año | 244 | 262 | 241 |
| infantil · 1.º año | 263 | 219 | 230 |
| infantil · 2.º año | 258 | 237 | 223 |
| cadete · 1.º año | 276 | 230 | 239 |
| cadete · 2.º año | 267 | 223 | 211 |
| juvenil · 1.º año | 265 | 215 | 227 |
| juvenil · 2.º año | 229 | 187 | 185 |
| juvenil · 3.º año | 184 | 96 | 175 |

Por categoría:

|  | Había al final del curso | Al empezar, antes de rehacer los equipos | Tras todo el verano | Balance neto (tras todo el verano frente a había) |
|---|---|---|---|---|
| benjamin | 558 | 261 | 528 | -30 (-5 %) |
| alevin | 525 | 512 | 495 | -30 (-6 %) |
| infantil | 521 | 456 | 453 | -68 (-13 %) |
| cadete | 543 | 453 | 450 | -93 (-17 %) |
| juvenil | 678 | 498 | 587 | -91 (-13 %) |

## Media y rango de 5 semillas (31, 32, 33, 34, 35)

### 1–3. Los que había, los que lo dejan y los que buscan club

|  | Jugaban | Abandonan | % | Se retiran por edad | Quedan libres al acabar el colegio | Buscan cambiar | % | Lo consiguen | Cambian de club (en total) | Sin club al final (apartados) |
|---|---|---|---|---|---|---|---|---|---|---|
| benjamín | 549 (533–564) | 48 (45–51) | 9 % | 0 (0–0) | 0 (0–0) | 109 (91–124) | 20 % | 108 (90–123) | 97 (77–116) | 1 (0–2) |
| alevín | 541 (525–571) | 52 (44–68) | 10 % | 0 (0–0) | 0 (0–0) | 121 (109–125) | 22 % | 118 (109–125) | 91 (85–98) | 4 (0–11) |
| infantil | 549 (521–571) | 55 (44–61) | 10 % | 0 (0–0) | 0 (0–0) | 129 (119–148) | 23 % | 126 (117–148) | 98 (83–116) | 3 (0–7) |
| cadete | 541 (529–567) | 99 (90–108) | 18 % | 0 (0–0) | 0 (0–0) | 110 (85–125) | 20 % | 109 (84–125) | 82 (59–99) | 1 (0–3) |
| juvenil | 688 (678–707) | 208 (183–232) | 30 % | 0 (0–0) | 48 (43–57) | 129 (114–145) | 19 % | 114 (108–122) | 107 (92–120) | 14 (2–22) |

Buscan cambiar, por motivo (un niño puede tener más de uno):

|  | A probar fuera (hacia un club mejor) | Suplente que baja a uno menor | Pierde la plaza por mérito | Sobra al recolocar | Cierra su equipo | Fin del colegio |
|---|---|---|---|---|---|---|
| benjamín | 60 (49–66) | 3 (2–4) | 69 (49–87) | 6 (0–16) | 0 (0–1) | 0 (0–0) |
| alevín | 70 (64–76) | 3 (2–4) | 71 (64–76) | 8 (4–14) | 1 (0–2) | 0 (0–0) |
| infantil | 64 (54–71) | 2 (0–5) | 72 (61–92) | 7 (6–11) | 7 (0–19) | 0 (0–0) |
| cadete | 61 (48–72) | 3 (0–5) | 54 (43–62) | 2 (1–4) | 11 (5–13) | 0 (0–0) |
| juvenil | 49 (44–57) | 2 (1–4) | 45 (26–57) | 0 (0–0) | 7 (3–10) | 48 (43–57) |

### 4. Flujo entre categorías por edad (los que siguen jugando pasan al año siguiente)

| De | Pasan a (media) |
|---|---|
| benjamín · 1.º año | benjamín · 2.º año: 248 |
| benjamín · 2.º año | alevín · 1.º año: 253 |
| alevín · 1.º año | alevín · 2.º año: 250 |
| alevín · 2.º año | infantil · 1.º año: 239 |
| infantil · 1.º año | infantil · 2.º año: 245 |
| infantil · 2.º año | cadete · 1.º año: 248 |
| cadete · 1.º año | cadete · 2.º año: 232 |
| cadete · 2.º año | juvenil · 1.º año: 210 |
| juvenil · 1.º año | juvenil · 2.º año: 201 |
| juvenil · 2.º año | juvenil · 3.º año: 105 |
| juvenil · 3.º año | senior · 1.º año: 126 |

### 5. Quién entra (no jugaban al final del curso y juegan al empezar el siguiente)

|  | De 8 años (benjamín, 1.er año) | Familias que se mudan | Niños nuevos (existían, no jugaban) | Apartados que vuelven |
|---|---|---|---|---|
| benjamín | 130 (118–147) | 137 (122–149) | 1 (0–2) | 0 (0–1) |
| alevín | 0 (0–0) | 0 (0–0) | 2 (1–3) | 0 (0–0) |
| infantil | 0 (0–0) | 0 (0–0) | 2 (0–3) | 0 (0–0) |
| cadete | 0 (0–0) | 0 (0–0) | 0 (0–0) | 1 (0–2) |
| juvenil | 0 (0–0) | 0 (0–0) | 1 (0–3) | 26 (15–32) |

De 8 años en el mundo: 501 (500–503), de ellos juegan 267 (252–277). Personas nuevas por mudanza (todas las edades, jueguen o no): 504 (456–539).

### 6. Quién sale por arriba (los que dejan juvenil por edad)

|  | Terminan juvenil (3.º año) | De ellos siguen jugando al empezar el curso (sin categoría) | Abandonan antes (ya contados arriba) |
|---|---|---|---|
| juvenil · 3.º año | 185 (174–194) | 126 (118–141) | 59 (53–66) |

### 7. El balance neto, por año y por categoría (curso que acaba frente a curso que empieza)

Por año de la categoría (personas que había en ese año frente a las que habrá en él: no son las mismas personas, son los tamaños de cada «promoción»):

|  | Había al final del curso | Habrá al empezar, antes de rehacer los equipos (los que suben y siguen) | Habrá tras todo el verano (con las llegadas) |
|---|---|---|---|
| benjamín · 1.º año | 272 (263–282) | 0 (0–0) | 267 (252–277) |
| benjamín · 2.º año | 277 (270–285) | 248 (238–261) | 242 (231–259) |
| alevín · 1.º año | 275 (254–291) | 253 (244–264) | 260 (250–277) |
| alevín · 2.º año | 266 (244–280) | 250 (234–262) | 235 (219–248) |
| infantil · 1.º año | 270 (263–282) | 239 (219–247) | 253 (230–262) |
| infantil · 2.º año | 278 (258–293) | 245 (237–259) | 233 (223–249) |
| cadete · 1.º año | 274 (253–301) | 248 (230–262) | 259 (239–271) |
| cadete · 2.º año | 267 (261–279) | 232 (219–255) | 219 (206–246) |
| juvenil · 1.º año | 275 (265–288) | 210 (202–221) | 223 (213–233) |
| juvenil · 2.º año | 228 (215–236) | 201 (187–208) | 192 (185–200) |
| juvenil · 3.º año | 185 (174–194) | 105 (96–119) | 172 (159–192) |

Por categoría:

|  | Había al final del curso | Al empezar, antes de rehacer los equipos | Tras todo el verano | Balance neto (tras todo el verano frente a había) |
|---|---|---|---|---|
| benjamin | 549 (533–564) | 248 (238–261) | 510 (501–528) | -40 (-7 %) |
| alevin | 541 (525–571) | 504 (484–524) | 496 (480–514) | -46 (-8 %) |
| infantil | 549 (521–571) | 484 (456–506) | 485 (453–511) | -64 (-12 %) |
| cadete | 541 (529–567) | 480 (453–517) | 478 (450–516) | -63 (-12 %) |
| juvenil | 688 (678–707) | 516 (498–540) | 587 (570–600) | -101 (-15 %) |


## Notas

- Hoy no existen «niños nuevos» que empiecen a jugar a una edad distinta de 8 años de forma apreciable (0–3 por categoría y verano: niños que ya existían, nunca se apuntaron y entran por hueco). El usuario dice que de momento no los habría: coincide.
- En juvenil, 3.º año (18 años): ~185 terminan, ~126 siguen jugando fuera de las categorías base (sin categoría; categoría `senior` del deporte) y ~59 abandonan.
- Los de 17 años (2.º año de juvenil) acaban el colegio al cumplir 18: ~48 quedan libres de su club de colegio y buscan otro (son los «Fin del colegio» de la tabla de motivos).
- Ciudad de ahora (semilla 3): `npx tsx tools/verano-volumen.ts 3 actual` (no es la ciudad de referencia; no se recoge aquí).

## Por sexo, desde infantil (dato; aviso del usuario: allí los equipos irán separados por sexo)

|  | Sexo | Jugaban | Abandonan | % | Buscan cambiar | % | Entran | Tras todo el verano | Balance |
|---|---|---|---|---|---|---|---|---|---|
| infantil | chicas | 276 (264–288) | 27 (24–31) | 10 % | 69 (60–76) | 25 % | 1 (0–2) | 242 (232–248) | -34 (-12 %) |
| infantil | chicos | 273 (254–294) | 28 (17–35) | 10 % | 60 (51–72) | 22 % | 1 (0–2) | 244 (209–270) | -30 (-11 %) |
| cadete | chicas | 264 (238–296) | 50 (40–65) | 19 % | 57 (44–66) | 22 % | 0 (0–1) | 236 (211–253) | -29 (-11 %) |
| cadete | chicos | 277 (259–297) | 49 (43–54) | 18 % | 52 (41–59) | 19 % | 1 (0–1) | 242 (226–263) | -35 (-13 %) |
| juvenil | chicas | 348 (321–370) | 108 (83–127) | 31 % | 68 (58–77) | 19 % | 13 (4–20) | 292 (280–310) | -56 (-16 %) |
| juvenil | chicos | 340 (310–367) | 101 (89–107) | 30 % | 61 (51–68) | 18 % | 14 (10–21) | 295 (273–308) | -45 (-13 %) |


Hoy el mundo tiene ~50 % de chicas y la realidad es ~10 %: el reparto y los veranos habrá que repetirlos por sexo. Con las reglas de hoy, chicas y chicos abandonan, cambian y entran casi igual (diferencias de 1–3 puntos, dentro del rango entre semillas).
