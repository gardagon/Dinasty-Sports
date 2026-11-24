# El reparto nuevo entero, con 10 semillas

Solo medida (`npm run equipos-minimo -- grande con 31-40 --nuevo`; sin `--nuevo` es el reparto actual). No cambia el juego. Ciudad grande con hogares, semillas 31 a 40; ciudad de ahora (`actual`), semillas 3 y 6. Reparto nuevo = benjamín/alevín `paso2-3`+`paso7`; infantil/cadete `paso2-3`+`paso4` (B mixto hasta 20)+`paso5-6`+sueltos a B mixto o A hasta 22; juvenil `juvenil-cascada`.
Con `--nuevo` los equipos se leen de la traza de cada variante: `fijarEquipos` vuelve a repartir las letras por el total del club, así que la partida real aún no conserva C y D (hay que cambiarlo si se adopta). Celdas: media (mínimo–máximo).

## 1. Reparto nuevo, ciudad grande, 10 semillas

| Categoría | Equipos (A·B·C·D medios) | Niños/equipo mín. | máx. | Equipos < 14 | Fuera 1.º/2.º/3.er año |
|---|---|---|---|---|---|
| benjamín | 31,4 (30–32) (13·13·3,7·1,7) | 14 (14–14) | 19,9 (18–22) | 0 | 0 |
| alevín | 31,3 (28–33) (13·13·3,5·1,8) | 13,8 (9–17) | 19,4 (18–22) | 0,1 (0–1) | 0 |
| infantil | 29,6 (27–31) (13·13·3,6·0) | 14,2 (14–16) | 21,1 (20–22) | 0 | 0 |
| cadete | 29,3 (28–31) (13·13·3,3·0) | 14,1 (14–15) | 20,5 (20–21) | 0 | 0 |
| juvenil | 30,6 (29–32) (12,8·9,1·8,7·0) | 18,4 (15–22) | 22 | 0 | 13 (6–21) · 11,8 (0–21) · 66,6 (53–83) |

## 2. Reparto actual, mismas semillas

| Categoría | Equipos | mín. | máx. | Equipos < 14 | Fuera (1.º/2.º/3.º) |
|---|---|---|---|---|---|
| benjamín | 33,1 (32–34) (13·13·7,1) | 8,4 (6–11) | 18,9 | 2,8 (1–5) | 0 |
| alevín | 32,2 (31–34) (13·12,8·6,4) | 9,4 (7–14) | 19 | 2,6 (0–5) | 0 |
| infantil | 32,4 (30–34) (13·12,4·7) | 10,8 (8–16) | 19,3 | 2,0 (0–4) | 0,2 · 0,3 · 0 |
| cadete | 31,7 (30–33) (13·11,9·6,8) | 13,2 (10–16) | 19,1 | 0,9 (0–3) | 0,1 · 0,1 · 0 |
| juvenil | 40,9 (38–43) (13·12,9·10,7·4,3) | 6,4 (3–11) | 19,1 | 6,8 (2–10) | 0 · 23,3 · 27,3 |

## 3. El personaje (benjamín, club de su colegio)

Reparto actual: cae en un equipo < 14 en 3 de 10 (semillas 33, 35, 39: C de 9, 10 y 7). Con el reparto nuevo: en 0 de 10 por construcción (0 equipos < 14 en benjamín en las 10 semillas). La lectura en la partida real (`#PERSONAJE`) sale B de 14 en las 10, pero ahí las letras son las de `fijarEquipos`, no las de la variante.

## 4. Lo raro

- **Alevín, semilla 40**: 1 equipo con 9 (de 28 equipos: 13·13·4·3 con tamaño mínimo 9).
- **Ciudad de ahora (semillas 3 y 6), el reparto nuevo es peor en benjamín y alevín** (6 equipos < 14 con mín. 3–6; actual: 1 y 0,5), también en infantil y cadete (2 frente a 1 y 0): la variante fuerza A y B en todos los clubes (`ponerK(e,2)`, primera ronda de 14 por año) aunque el club no tenga niños para dos equipos (colegio1: 4+3, colegio2: 4+10, club_mediano: 9+9 en benjamín de la semilla 3). Está pensada para la ciudad grande; en la pequeña hay que decidir si un club sin 28 niños tiene un solo equipo.
- Juvenil: quedan fuera 13 de 1.º y 12 de 2.º de media y 67 de 3.º, pero ningún equipo < 14.
