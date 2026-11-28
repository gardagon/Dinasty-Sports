# Los veranos con la población nueva: problemas con las reglas de hoy y con el método nuevo

Solo medida (25/11/2026), sin cambiar el juego y **sin decidir el diseño**. Semillas 51–60, ciudad grande con hogares. `npx tsx tools/verano-sexos.ts <semilla> <m|f> <hoy|nuevo>` y `tools/verano-sexos-tabla.ts <carpeta> 51 60`.

## Cómo está medido

- **Inicio:** el reparto nuevo entero (reparto de `reparto-nuevo-reglas.md` con equilibrar y la extensión de «un equipo de menos de 14 desaparece»), chicas al ~10 % (`--chicas=0.11`) y, desde infantil (12 años), un mundo de chicos (`m`: benjamín y alevín mixtos) y un mundo de chicas (`f`: solo clubes externos, sin equipos de colegio). Las letras que decide el reparto se guardan (`LETRAS_FIJADAS`, que respeta `fijarEquipos`), con el número de equipos por club.
- **Curso entero** hasta la semana 48; foto; y **el verano siguiente**: con las reglas de hoy (`completarUnaCategoria`) o con el método nuevo.
- **Entre sexos:** quien cumple 12 años en el mundo de chicos y es chica sale de él (`pasa_otro_sexo`, ~13 por semilla desde alevín), y en el mundo de chicas las alumnas de un equipo de colegio quedan libres y buscan un club externo; los chicos de 12 años no existen en el mundo de chicas.
- **Método nuevo en el verano (adaptación):** se salta `reclutarEnTodos` y se usa el mismo bloque del reparto de inicio (`draftDeUnaCategoria(..., verano = true)`) en benjamín, alevín, infantil y cadete; **juvenil sigue con las reglas de hoy** (la cascada de juvenil no está adaptada). Los equipos de partida salen de quienes ya están en cada club (con su año nuevo): los de 2.º año forman el A (y el C si son 28 o más, mitad y mitad por nivel), los de 1.º el B (y el D), con 14 a 22 un solo equipo y lo que pasa de 22 vuelve a la bolsa. Después, los mismos pasos: subir titulares (infantil y cadete), completar desde la bolsa (18 o 20), B mixto hasta 20, reagrupar, equipos nuevos con la bolsa (colegio o sorteo entre externos), los que quedan fuera a un B mixto o un A hasta 22 (benjamín y alevín: C y D), y el paso de equilibrar (normalizar, equilibrar letras, recolocar a los que salen).
- **Dos fotos de equipos.** «Reglas de hoy» cuenta los equipos como quedan en el estado de la partida (letra de cada niño); «método nuevo» da además los de la traza del reparto (antes de que el resto de la creación mueva a nadie). Ver el problema 1.

## Problemas que aparecen

1. **El resto de la creación estropea el reparto de inicio.** La traza del reparto deja 0 equipos por debajo de 14, pero el estado de la partida a la semana 48 tiene, de media, **4,7 (benjamín), 5,5 (alevín), 10,3 (infantil), 12,8 (cadete) y 9,5 (juvenil) equipos de menos de 14** (con equipos de 1 a 2 niños y otros de 23). Pasa porque, tras el reparto, siguen corriendo `cubrirGruposVacios`, `sinSobrantes` y `plazasDeMas`, que mueven niños sin conocer las letras ni el máximo de 22. Ejemplo (benjamín, semilla 51): `club_pequeno2` B de 14 → 6; `colegio3` con un B de 2. Hay que adaptar esas funciones (o saltarlas) para que respeten el reparto.
2. **Con las reglas de hoy un verano deshace muchos equipos:** 20,7 → 15,0 (benjamín), 21,2 → 15,7 (alevín), 22,3 → 15,3 (infantil chicos), 24,5 → 14,3 (cadete), 19,9 → 15,1 (juvenil): se deshacen 5–11 por categoría (en parte equipos pequeños del problema 1, que son los que cierran) y se abren 0–2. Tras el verano quedan 0,1–1,3 equipos por debajo de 14. Pocos niños quedan fuera (benjamín 8 de 1.er año de media, el resto 0–1), salvo juvenil (34 de 2.º año y 31 de 3.º, igual que en el reparto de inicio).
3. **El método nuevo con equipos ya existentes deja a mucha gente fuera:** los equipos de la traza bajan de 18,8 a 13,2 (benjamín), 18,2 a 12,7 (alevín), 17,0 a 12,3 (infantil chicos), 17,3 a 11,6 (cadete), y quedan sin equipo (querían jugar) **43 de 1.er año en benjamín, 26 en alevín, 18 en infantil, 12 en cadete** (más 2.º año: 2, 9, 12, 9). Ninguna por debajo de 14, pero a costa de deshacer ~30 % de los equipos: los equipos de partida salen del reparto por año de los que ya están en el club, y lo que pasa de 22 o no llega a 14 se va a la bolsa; la bolsa (8 años nuevos, mudanzas) no basta para reponer los equipos que se deshacen. Los que jugaban y se quedan fuera: pierden la plaza por mérito (~19–21 en benjamín y alevín), sin hueco (4–8).
4. **Las subidas y bajadas de letra son muchas con las reglas de hoy:** de los que siguen en el mismo club, en infantil **54 suben y 51 bajan** de 180, en cadete 60 y 38 de 171 (con subidas y bajadas de dos letras o más: 7 y 4, 8 y 3). Con el método nuevo, 38 y 31 de 118 en infantil, 45 y 24 de 117 en cadete: menos movimiento porque los equipos de partida son por año. En benjamín no hay bajadas (las subidas son al cambiar de año).
5. **C o D mejores que su A o su B:** antes del verano, con el estado de la partida, hay 0,7–1,5 clubes en infantil, cadete y juvenil con un C mejor que su A (de 3–6 que tienen C); tras el verano con las reglas de hoy, 0 a 0,1; con el método nuevo, 0,3–0,9 en benjamín e infantil y 0,4 en cadete. Los equipos ya existen y no se montan desde cero: el problema casi no aparece.
6. **Chicas:** infantil 1,9 → 1,6 equipos (hoy) o 1,0 (método nuevo, con 22 jugadoras), cadete 2,0 → 1,5; juvenil 0 → 2,1 con las reglas de hoy (la bolsa de 40 chicas, sin equipo en el reparto de inicio, sí forma 2 equipos de ~20 en el verano). Quedan fuera 6 en infantil (1.er año) y 2 en cadete. Volumen: abandonan el 8 % en infantil y el 19 % en cadete, como los chicos.

## Tablas

## Verano con las reglas de hoy (semillas 51–60)

### Equipos: antes → tras el verano

|  | Equipos antes → tras | Por debajo de 14 antes → tras | Se deshacen (por club) | Se abren | Niños por equipo tras (mín–máx) | Clubes con un C mejor que su A (de los que tienen C), antes → tras · D mejor que B |
|---|---|---|---|---|---|---|
| benjamín (mixto) | 20.7 (18.0–25.0) → 15.0 (14.0–17.0) | 4.7 (0.0–8.0) → 0.1 (0.0–1.0) | 7.1 (3.0–9.0) | 1.4 (0.0–3.0) | 16 (13–17) – 20 (20–20) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) · D/B: 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) |
| alevín (mixto) | 21.2 (18.0–24.0) → 15.7 (13.0–17.0) | 5.5 (3.0–10.0) → 0.8 (0.0–2.0) | 5.7 (2.0–10.0) | 0.2 (0.0–1.0) | 13 (11–16) – 20 (19–20) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.1 (0.0–1.0) · D/B: 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) |
| infantil chicos | 22.3 (15.0–28.0) → 15.3 (14.0–16.0) | 10.3 (3.0–16.0) → 1.3 (0.0–3.0) | 8.0 (2.0–13.0) | 1.0 (0.0–2.0) | 13 (10–15) – 20 (20–20) | 0.7 (0.0–2.0) → 0.0 (0.0–0.0) de 4.8 (2.0–7.0) → 1.6 (1.0–3.0) · D/B: 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.1 (0.0–1.0) |
| cadete chicos | 24.5 (18.0–30.0) → 14.3 (13.0–16.0) | 12.8 (7.0–19.0) → 0.2 (0.0–1.0) | 10.8 (6.0–17.0) | 0.6 (0.0–3.0) | 14 (12–16) – 20 (19–20) | 1.5 (0.0–3.0) → 0.0 (0.0–0.0) de 5.9 (0.0–8.0) → 1.1 (0.0–2.0) · D/B: 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) |
| juvenil chicos | 19.9 (9.0–25.0) → 15.1 (11.0–17.0) | 9.5 (0.0–15.0) → 0.6 (0.0–1.0) | 7.0 (0.0–14.0) | 2.2 (0.0–6.0) | 13 (10–16) – 20 (20–20) | 1.2 (0.0–2.0) → 0.1 (0.0–1.0) de 3.1 (0.0–6.0) → 0.8 (0.0–2.0) · D/B: 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) |
| infantil chicas | 1.9 (1.0–3.0) → 1.6 (1.0–3.0) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) | 0.6 (0.0–2.0) | 0.3 (0.0–2.0) | 18 (14–20) – 19 (16–20) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) · D/B: 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) |
| cadete chicas | 2.0 (2.0–2.0) → 1.5 (1.0–2.0) | 0.2 (0.0–1.0) → 0.1 (0.0–1.0) | 0.5 (0.0–1.0) | 0.0 (0.0–0.0) | 17 (13–20) – 18 (14–20) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) · D/B: 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) |
| juvenil chicas | 0.0 (0.0–0.0) → 2.1 (2.0–3.0) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 2.1 (2.0–3.0) | 19 (14–20) – 20 (20–20) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) · D/B: 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) |

### Subidas y bajadas de letra (los que siguen en el mismo club; de la letra del curso que acaba a la del que empieza)

|  | Siguen en su club | Misma letra | Suben de letra (C→B, B→A…) | Bajan de letra (A→B, B→C…) | Suben dos o más | Bajan dos o más |
|---|---|---|---|---|---|---|
| benjamín (mixto) | 101 (88–121) | 20 (0–49) | 81 (59–99) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| alevín (mixto) | 199 (170–221) | 93 (72–121) | 65 (48–83) | 40 (14–56) | 0 (0–0) | 0 (0–2) |
| infantil chicos | 180 (155–199) | 75 (51–115) | 54 (45–62) | 51 (30–71) | 7 (2–10) | 4 (1–8) |
| cadete chicos | 171 (141–195) | 74 (48–95) | 60 (54–71) | 38 (25–50) | 8 (0–14) | 3 (0–6) |
| juvenil chicos | 140 (115–160) | 82 (55–107) | 30 (12–58) | 28 (10–46) | 5 (0–15) | 1 (0–3) |
| infantil chicas | 15 (7–20) | 7 (5–9) | 9 (0–14) | 0 (0–2) | 0 (0–0) | 0 (0–0) |
| cadete chicas | 24 (17–31) | 11 (3–16) | 8 (2–12) | 6 (0–15) | 0 (0–0) | 0 (0–0) |
| juvenil chicas | 14 (12–17) | 10 (4–17) | 4 (0–9) | 0 (0–0) | 0 (0–0) | 0 (0–0) |

### Niños que quedan fuera tras el verano, por año (querían jugar y no tienen equipo) y por qué se quedan fuera los que jugaban

|  | 1.er año | 2.º año | 3.er año | Jugaban y quedan fuera: pierden la plaza por mérito | cierra su equipo | sobran al recolocar | fin de colegio | sin hueco | dejan tras dos plazos |
|---|---|---|---|---|---|---|---|---|---|
| benjamín (mixto) | 8 (0–32) | 0 (0–2) | 0 (0–0) | 0.8 (0.0–2.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) |
| alevín (mixto) | 0 (0–2) | 0 (0–2) | 0 (0–0) | 0.7 (0.0–5.0) | 0.0 (0.0–0.0) | 0.1 (0.0–1.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) |
| infantil chicos | 0 (0–3) | 1 (0–4) | 0 (0–0) | 0.7 (0.0–3.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.1 (0.0–1.0) | 0.0 (0.0–0.0) |
| cadete chicos | 1 (0–5) | 0 (0–2) | 0 (0–0) | 4.5 (0.0–16.0) | 0.0 (0.0–0.0) | 0.3 (0.0–1.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) |
| juvenil chicos | 5 (0–13) | 34 (24–45) | 32 (24–37) | 1.2 (0.0–3.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) |
| infantil chicas | 4 (0–9) | 0 (0–2) | 0 (0–0) | 0.5 (0.0–2.0) | 1.2 (0.0–5.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.9 (0.0–6.0) | 0.0 (0.0–0.0) |
| cadete chicas | 1 (0–3) | 1 (0–2) | 0 (0–0) | 0.0 (0.0–0.0) | 0.7 (0.0–3.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.2 (0.0–2.0) | 0.0 (0.0–0.0) |
| juvenil chicas | 0 (0–2) | 1 (0–4) | 1 (0–3) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) |

### Volumen de movimientos (todos los años de la categoría; media y rango)

|  | Jugaban | Abandonan | % | Buscan cambiar club | % | Lo consiguen | Cambian de club | Siguen y suben | Entran: 8 años | mudanza | vuelven apartados | Pasan al otro sexo | Salen por arriba |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| benjamín (mixto) | 304 (284–342) | 25 (17–34) | 8 % | 79 (57–101) | 26 % | 78 (57–99) | 70 (47–91) | 279 (257–314) | 78 (59–91) | 68 (55–83) | 2 (0–8) | 0 (0–0) | 0 (0–0) |
| alevín (mixto) | 299 (266–321) | 27 (21–33) | 9 % | 93 (78–117) | 31 % | 92 (78–115) | 75 (49–101) | 258 (236–274) | 0 (0–0) | 0 (0–0) | 3 (0–11) | 13 (9–17) | 0 (0–0) |
| infantil chicos | 274 (234–295) | 26 (22–33) | 9 % | 84 (62–102) | 31 % | 84 (62–101) | 65 (41–81) | 248 (207–271) | 0 (0–0) | 0 (0–0) | 2 (0–7) | 0 (0–0) | 0 (0–0) |
| cadete chicos | 273 (233–296) | 47 (38–55) | 17 % | 94 (60–117) | 34 % | 89 (56–115) | 72 (42–102) | 225 (195–256) | 0 (0–0) | 0 (0–0) | 5 (0–19) | 0 (0–0) | 0 (0–0) |
| juvenil chicos | 229 (180–263) | 65 (53–78) | 28 % | 48 (28–64) | 21 % | 47 (27–61) | 38 (19–55) | 157 (127–191) | 0 (0–0) | 0 (0–0) | 29 (18–46) | 0 (0–0) | 0 (0–0) |
| infantil chicas | 32 (20–44) | 3 (1–7) | 8 % | 4 (0–15) | 12 % | 2 (0–10) | 1 (0–9) | 29 (18–43) | 0 (0–0) | 0 (0–0) | 0 (0–2) | 0 (0–0) | 0 (0–0) |
| cadete chicas | 33 (29–36) | 6 (4–8) | 19 % | 2 (0–6) | 6 % | 1 (0–5) | 0 (0–3) | 27 (22–32) | 0 (0–0) | 0 (0–0) | 0 (0–1) | 0 (0–0) | 0 (0–0) |
| juvenil chicas | 0 (0–0) | 0 (0–0) | — | 0 (0–0) | — | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 1 (0–3) | 0 (0–0) | 0 (0–0) |

### Balance: jugaban al final del curso → juegan al empezar el siguiente

|  | Jugaban | Juegan tras el verano | Balance |
|---|---|---|---|
| benjamín (mixto) | 304 (284–342) | 281 (250–304) | -23 (-8 %) |
| alevín (mixto) | 299 (266–321) | 270 (240–295) | -29 (-10 %) |
| infantil chicos | 274 (234–295) | 256 (246–270) | -18 (-6 %) |
| cadete chicos | 273 (233–296) | 243 (219–261) | -30 (-11 %) |
| juvenil chicos | 229 (180–263) | 274 (212–301) | +45 (20 %) |
| infantil chicas | 32 (20–44) | 24 (18–33) | -8 (-26 %) |
| cadete chicas | 33 (29–36) | 25 (19–34) | -8 (-25 %) |
| juvenil chicas | 0 (0–0) | 40 (35–49) | +40 (—) |

## Verano con el método nuevo (semillas 51–60)

### Equipos: antes → tras el verano

|  | Equipos antes → tras | Por debajo de 14 antes → tras | Se deshacen (por club) | Se abren | Niños por equipo tras (mín–máx) | Clubes con un C mejor que su A (de los que tienen C), antes → tras · D mejor que B |
|---|---|---|---|---|---|---|
| benjamín (mixto) | 20.7 (18.0–25.0) → 17.3 (12.0–21.0) | 4.7 (0.0–8.0) → 5.3 (0.0–10.0) | 4.7 (2.0–10.0) | 1.3 (0.0–4.0) | 5 (1–20) – 23 (20–27) | 0.0 (0.0–0.0) → 0.3 (0.0–2.0) de 0.0 (0.0–0.0) → 1.3 (0.0–7.0) · D/B: 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) |
| alevín (mixto) | 21.2 (18.0–24.0) → 15.7 (12.0–19.0) | 5.5 (3.0–10.0) → 3.2 (1.0–6.0) | 5.7 (1.0–9.0) | 0.2 (0.0–1.0) | 1 (1–3) – 22 (20–26) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) · D/B: 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) |
| infantil chicos | 22.3 (15.0–28.0) → 19.0 (14.0–23.0) | 10.3 (3.0–16.0) → 8.2 (3.0–13.0) | 5.7 (2.0–14.0) | 2.4 (0.0–4.0) | 1 (1–2) – 23 (20–27) | 0.7 (0.0–2.0) → 0.9 (0.0–2.0) de 4.8 (2.0–7.0) → 5.8 (3.0–8.0) · D/B: 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) |
| cadete chicos | 24.5 (18.0–30.0) → 14.6 (11.0–18.0) | 12.8 (7.0–19.0) → 3.5 (0.0–6.0) | 10.3 (5.0–17.0) | 0.4 (0.0–4.0) | 3 (1–16) – 22 (20–26) | 1.5 (0.0–3.0) → 0.4 (0.0–3.0) de 5.9 (0.0–8.0) → 1.7 (0.0–5.0) · D/B: 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) |
| juvenil chicos | 19.9 (9.0–25.0) → 15.1 (11.0–17.0) | 9.5 (0.0–15.0) → 0.6 (0.0–1.0) | 7.0 (0.0–14.0) | 2.2 (0.0–6.0) | 13 (10–16) – 20 (20–20) | 1.2 (0.0–2.0) → 0.1 (0.0–1.0) de 3.1 (0.0–6.0) → 0.8 (0.0–2.0) · D/B: 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) |
| infantil chicas | 1.9 (1.0–3.0) → 1.0 (1.0–1.0) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) | 0.9 (0.0–2.0) | 0.0 (0.0–0.0) | 20 (18–20) – 20 (18–20) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) · D/B: 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) |
| cadete chicas | 2.0 (2.0–2.0) → 1.5 (1.0–2.0) | 0.2 (0.0–1.0) → 0.0 (0.0–0.0) | 0.5 (0.0–1.0) | 0.0 (0.0–0.0) | 17 (14–20) – 18 (14–20) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) · D/B: 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) |
| juvenil chicas | 0.0 (0.0–0.0) → 2.1 (2.0–3.0) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 2.1 (2.0–3.0) | 19 (14–20) – 20 (20–20) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) · D/B: 0.0 (0.0–0.0) → 0.0 (0.0–0.0) de 0.0 (0.0–0.0) → 0.0 (0.0–0.0) |

### Equipos según el reparto (la traza de cada paso final, antes de que el resto de la creación mueva a nadie): al empezar → tras el verano

|  | Equipos | Por debajo de 14 | Niños por equipo mín–máx |
|---|---|---|---|
| benjamín (mixto) | 18.8 (17.0–22.0) → 13.2 (12.0–16.0) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) | 14 (14–14)–22 (21–22) → 18 (14–22)–22 (22–22) |
| alevín (mixto) | 18.2 (17.0–21.0) → 12.7 (11.0–15.0) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) | 14 (14–14)–22 (22–22) → 16 (14–20)–22 (22–22) |
| infantil chicos | 17.0 (14.0–19.0) → 12.3 (10.0–14.0) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) | 14 (14–14)–22 (22–22) → 14 (14–14)–22 (22–22) |
| cadete chicos | 17.3 (13.0–20.0) → 11.6 (10.0–13.0) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) | 14 (14–14)–21 (18–22) → 15 (14–16)–22 (22–22) |
| juvenil chicos | 13.9 (9.0–18.0) → 0.0 (0.0–0.0) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) | 20 (14–22)–22 (22–22) → 0 (0–0)–0 (0–0) |
| infantil chicas | 1.9 (1.0–3.0) → 1.0 (1.0–1.0) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) | 16 (14–22)–19 (16–22) → 22 (21–22)–22 (21–22) |
| cadete chicas | 2.0 (2.0–2.0) → 1.5 (1.0–2.0) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) | 16 (14–21)–21 (19–22) → 18 (14–22)–19 (14–22) |
| juvenil chicas | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) | 0.0 (0.0–0.0) → 0.0 (0.0–0.0) | 0 (0–0)–0 (0–0) → 0 (0–0)–0 (0–0) |

### Subidas y bajadas de letra (los que siguen en el mismo club; de la letra del curso que acaba a la del que empieza)

|  | Siguen en su club | Misma letra | Suben de letra (C→B, B→A…) | Bajan de letra (A→B, B→C…) | Suben dos o más | Bajan dos o más |
|---|---|---|---|---|---|---|
| benjamín (mixto) | 103 (92–124) | 23 (1–48) | 80 (57–104) | 1 (0–5) | 0 (0–0) | 0 (0–2) |
| alevín (mixto) | 160 (139–190) | 81 (56–117) | 62 (46–74) | 18 (6–27) | 0 (0–0) | 0 (0–0) |
| infantil chicos | 118 (95–145) | 50 (36–72) | 38 (28–57) | 31 (13–53) | 4 (1–6) | 4 (2–7) |
| cadete chicos | 117 (86–153) | 48 (24–66) | 45 (37–62) | 24 (15–32) | 7 (3–15) | 4 (0–8) |
| juvenil chicos | 140 (115–160) | 82 (55–107) | 30 (12–58) | 28 (10–46) | 5 (0–15) | 1 (0–3) |
| infantil chicas | 15 (6–18) | 6 (4–9) | 8 (0–13) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| cadete chicas | 24 (15–31) | 12 (8–14) | 7 (2–12) | 5 (0–12) | 0 (0–0) | 0 (0–0) |
| juvenil chicas | 14 (12–17) | 10 (4–17) | 4 (0–9) | 0 (0–0) | 0 (0–0) | 0 (0–0) |

### Niños que quedan fuera tras el verano, por año (querían jugar y no tienen equipo) y por qué se quedan fuera los que jugaban

|  | 1.er año | 2.º año | 3.er año | Jugaban y quedan fuera: pierden la plaza por mérito | cierra su equipo | sobran al recolocar | fin de colegio | sin hueco | dejan tras dos plazos |
|---|---|---|---|---|---|---|---|---|---|
| benjamín (mixto) | 43 (12–73) | 2 (0–5) | 0 (0–0) | 20.7 (5.0–39.0) | 0.0 (0.0–0.0) | 0.2 (0.0–2.0) | 0.0 (0.0–0.0) | 5.3 (0.0–17.0) | 0.0 (0.0–0.0) |
| alevín (mixto) | 26 (4–51) | 9 (0–19) | 0 (0–0) | 19.0 (8.0–29.0) | 0.0 (0.0–0.0) | 0.2 (0.0–1.0) | 0.0 (0.0–0.0) | 7.5 (0.0–25.0) | 0.0 (0.0–0.0) |
| infantil chicos | 18 (8–32) | 12 (6–29) | 0 (0–0) | 18.8 (8.0–30.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 4.2 (0.0–20.0) | 0.0 (0.0–0.0) |
| cadete chicos | 12 (0–25) | 9 (0–22) | 0 (0–0) | 9.3 (2.0–21.0) | 0.0 (0.0–0.0) | 0.3 (0.0–1.0) | 0.0 (0.0–0.0) | 1.3 (0.0–6.0) | 0.1 (0.0–1.0) |
| juvenil chicos | 4 (0–13) | 34 (24–46) | 31 (24–37) | 1.2 (0.0–3.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) |
| infantil chicas | 6 (0–10) | 0 (0–1) | 0 (0–0) | 0.2 (0.0–1.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 2.9 (0.0–8.0) | 0.0 (0.0–0.0) |
| cadete chicas | 2 (0–5) | 0 (0–1) | 0 (0–0) | 0.1 (0.0–1.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) |
| juvenil chicas | 0 (0–2) | 1 (0–4) | 1 (0–3) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) |

### Volumen de movimientos (todos los años de la categoría; media y rango)

|  | Jugaban | Abandonan | % | Buscan cambiar club | % | Lo consiguen | Cambian de club | Siguen y suben | Entran: 8 años | mudanza | vuelven apartados | Pasan al otro sexo | Salen por arriba |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| benjamín (mixto) | 304 (284–342) | 25 (17–34) | 8 % | 93 (79–114) | 31 % | 72 (59–87) | 78 (65–92) | 279 (257–314) | 59 (40–86) | 52 (34–68) | 1 (0–5) | 0 (0–0) | 0 (0–0) |
| alevín (mixto) | 299 (266–321) | 27 (21–33) | 9 % | 102 (86–124) | 34 % | 82 (68–96) | 103 (76–127) | 258 (236–274) | 0 (0–0) | 0 (0–0) | 0 (0–1) | 13 (9–17) | 0 (0–0) |
| infantil chicos | 274 (234–295) | 26 (22–33) | 9 % | 97 (65–114) | 35 % | 78 (55–84) | 95 (71–127) | 248 (207–271) | 0 (0–0) | 0 (0–0) | 0 (0–2) | 0 (0–0) | 0 (0–0) |
| cadete chicos | 273 (233–296) | 47 (38–55) | 17 % | 93 (70–112) | 34 % | 83 (65–110) | 79 (46–100) | 225 (195–256) | 0 (0–0) | 0 (0–0) | 1 (0–7) | 0 (0–0) | 0 (0–0) |
| juvenil chicos | 229 (180–263) | 65 (53–78) | 28 % | 48 (28–64) | 21 % | 47 (27–61) | 38 (19–55) | 157 (127–191) | 0 (0–0) | 0 (0–0) | 29 (18–46) | 0 (0–0) | 0 (0–0) |
| infantil chicas | 32 (20–44) | 3 (1–7) | 8 % | 1 (0–4) | 3 % | 1 (0–3) | 1 (0–13) | 29 (18–43) | 0 (0–0) | 0 (0–0) | 0 (0–2) | 0 (0–0) | 0 (0–0) |
| cadete chicas | 33 (29–36) | 6 (4–8) | 19 % | 1 (0–3) | 3 % | 1 (0–3) | 0 (0–4) | 27 (22–32) | 0 (0–0) | 0 (0–0) | 1 (0–2) | 0 (0–0) | 0 (0–0) |
| juvenil chicas | 0 (0–0) | 0 (0–0) | — | 0 (0–0) | — | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 1 (0–3) | 0 (0–0) | 0 (0–0) |

### Balance: jugaban al final del curso → juegan al empezar el siguiente

|  | Jugaban | Juegan tras el verano | Balance |
|---|---|---|---|
| benjamín (mixto) | 304 (284–342) | 249 (235–300) | -55 (-18 %) |
| alevín (mixto) | 299 (266–321) | 244 (216–284) | -56 (-19 %) |
| infantil chicos | 274 (234–295) | 223 (188–247) | -51 (-19 %) |
| cadete chicos | 273 (233–296) | 212 (186–236) | -60 (-22 %) |
| juvenil chicos | 229 (180–263) | 274 (212–301) | +45 (20 %) |
| infantil chicas | 32 (20–44) | 20 (18–20) | -12 (-39 %) |
| cadete chicas | 33 (29–36) | 26 (18–36) | -8 (-23 %) |
| juvenil chicas | 0 (0–0) | 40 (35–49) | +40 (—) |

