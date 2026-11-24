# Variante juvenil (J1–J3) · semilla 33 · espana_ciudad_grande

**J1.** Cada niño de la bolsa va a un club en un solo reparto (el secuencial de siempre, con un club cogiendo el 60 % de todos antes que el siguiente, no vale sin máximo): si su colegio tiene club y quiere seguir en él, a ese; si no, a un club externo sorteado con peso su atractivo. Sin máximo ni prueba ni cupos de puesto. Cada club con 14 de cada año hace 3 equipos (A = 3.º, B = 2.º, C = 1.º); si no, con 14+ de 3.º y 2.º juntos y 14+ de 1.º, 2 (A = 3.º y 2.º, B = 1.º); si no, uno mixto si llega a 14; si no, sus niños quedan sin equipo. **J2.** De abajo arriba, con la alineación del juego: los del C que serían titulares en el B suben sin dejar al C por debajo de 14 (los mejores primero); el C pasado de 22 descarta a los peores del grupo de puestos que más se pasa de su cupo; lo mismo B→A y A. **J3.** Los descartados buscan equipo en otros clubes (colegios, solo sus alumnos): al equipo de su año si hay hueco (<22) o, si está lleno, si ganan el puesto al peor de su puesto, que baja al equipo de abajo (en cascada) o sale libre; hasta 3 rondas; al final, los que no encuentran, abandonan.

## J1

| Club | Le tocan | 3.º | 2.º | 1.º | Equipos | A | B | C |
|---|---|---|---|---|---|---|---|---|
| colegio | 15 | 0 | 8 | 7 | 1 | 15 | — | — |
| colegio1 | 25 | 0 | 9 | 16 | 1 | 25 | — | — |
| colegio2 | 14 | 0 | 6 | 7 | ninguno | 0 | — | — |
| colegio3 | 26 | 0 | 10 | 14 | 1 | 24 | — | — |
| club_grande | 110 | 33 | 39 | 32 | 3 | 33 | 39 | 32 |
| club_mediano | 68 | 18 | 24 | 22 | 3 | 18 | 24 | 22 |
| club_mediano2 | 93 | 23 | 36 | 31 | 3 | 23 | 36 | 31 |
| club_mediano3 | 77 | 35 | 23 | 19 | 3 | 35 | 23 | 19 |
| club_pequeno | 69 | 20 | 22 | 24 | 3 | 20 | 22 | 24 |
| club_pequeno2 | 65 | 25 | 20 | 20 | 3 | 25 | 20 | 20 |
| club_pequeno3 | 65 | 29 | 19 | 17 | 3 | 29 | 19 | 17 |
| club_pequeno4 | 69 | 20 | 25 | 20 | 3 | 20 | 25 | 20 |
| club_pequeno5 | 88 | 30 | 27 | 28 | 3 | 30 | 27 | 28 |

## J2

| Club | Antes (A · B · C) | Suben C→B | Suben B→A | Descartes (C · B · A) | Después (A · B · C) |
|---|---|---|---|---|---|
| colegio | 15 · 0 · 0 | 0 | 0 | 0 · 0 · 0 | 15 · 0 · 0 |
| colegio1 | 25 · 0 · 0 | 0 | 0 | 0 · 0 · 3 | 22 · 0 · 0 |
| colegio3 | 24 · 0 · 0 | 0 | 0 | 0 · 0 · 2 | 22 · 0 · 0 |
| club_grande | 33 · 39 · 32 | 5 | 5 | 5 · 17 · 16 | 22 · 22 · 22 |
| club_mediano | 18 · 24 · 22 | 4 | 4 | 0 · 2 · 0 | 22 · 22 · 18 |
| club_mediano2 | 23 · 36 · 31 | 6 | 9 | 3 · 11 · 10 | 22 · 22 · 22 |
| club_mediano3 | 35 · 23 · 19 | 3 | 4 | 0 · 0 · 17 | 22 · 22 · 16 |
| club_pequeno | 20 · 22 · 24 | 7 | 7 | 0 · 0 · 5 | 22 · 22 · 17 |
| club_pequeno2 | 25 · 20 · 20 | 5 | 8 | 0 · 0 · 11 | 22 · 17 · 15 |
| club_pequeno3 | 29 · 19 · 17 | 3 | 8 | 0 · 0 · 15 | 22 · 14 · 14 |
| club_pequeno4 | 20 · 25 · 20 | 4 | 7 | 0 · 0 · 5 | 22 · 22 · 16 |
| club_pequeno5 | 30 · 27 · 28 | 8 | 5 | 0 · 8 · 13 | 22 · 22 · 20 |

Total: suben C→B **45**, B→A **57**; descartados **143** (más 13 de clubes que no llegaron a 14).

## J3

| Ronda | Buscan equipo | Lo encuentran | Cascadas | Salen libres por la cascada | Siguen sin sitio |
|---|---|---|---|---|---|
| 1 | 156 | 73 | 73 | 32 | 83 |
| 2 | 115 | 22 | 17 | 15 | 93 |
| 3 | 108 | 14 | 12 | 12 | 94 |

## Resumen final

|  |  |
|---|---|
| Equipos (A · B · C) | 30 (12 · 9 · 9) |
| Niños por equipo: mínimo · máximo · media | 18 · 22 · 21.7 |
| Equipos por debajo de 14 | 0 |
| Niños asignados | 652 |
| Abandonan o se quedan fuera (3.º · 2.º · 1.º año) | 106 (72 · 23 · 11) |

| Equipos por club | Clubes |
|---|---|
| 1 | 3 |
| 2 | 0 |
| 3 | 9 |
| ninguno | 1 |

