# Relevo: acciones del club en desplegables

Rama `claude/club-desplegables` (sale de `claude/youthful-clarke-vs0kye`). Aplica la propuesta de `fichas-y-listas.md` §4.3, aprobada por el usuario para probarla.

## Qué cambia
- `packages/kit-deporte/src/club.ts` (solo `accionesDeClubes` y `pruebaPorPuestosEnPasos`): `ActionDef.desplegable` en
  - **«Prueba de acceso…»** (`id: <deporte>.prueba`, etiqueta «Club», botón `{nombre}`): `<deporte>.prueba.<club>` (sin puestos) o, en fútbol, los tres pasos (`pedir_prueba.<club>`, `prueba.<club>` «…· entrenamiento de prueba» y `prueba_entrenar.<club>` «…· entrenar a prueba»), todos en el mismo desplegable porque solo salen los que tocan.
  - **«Aceptar plaza…»** (`<deporte>.aceptar_plaza`): `<deporte>.aceptar_plaza.<club>`.
  - Sueltas: «Entrenamiento con el club», «Dejar el club» y «Apuntarte al club del colegio».
- Ids de acciones, lógica y estado sin cambios: sim, bots y huella no deberían moverse.
- Test nuevo: `tests/club-desplegables.test.ts`. `ANEXO_DEPORTE.md` actualizado.

## Capturas (`docs/relevo/club-capturas/`, Chromium, 480 px, deviceScaleFactor 1, miércoles 18:00 en la administración, con «Ver lo que no está disponible»)
- `antes-atletismo-lista.png` / `despues-atletismo-lista.png` / `despues-atletismo-desplegados.png`: 7 → 5 botones (+ el desplegable abierto).
- `antes-futbol-lista.png` / `despues-futbol-desplegados.png`: con atletismo y fútbol en la ciudad grande, 25 botones → 10 (Real Ciudad y los demás clubes pasan a ser opciones).

## Notas
- Con dos deportes salen dos «Prueba de acceso…» y dos «Aceptar plaza…» (uno por deporte, ids distintos): igual que «Entrenamiento con el club». Se podría añadir el deporte al nombre del botón si molesta.
- Si de un desplegable solo existe una acción (un solo club con prueba), se dibuja como botón normal (mecanismo existente).
- El desplegable ofrece por defecto la primera opción disponible; el motivo de no disponibilidad se ve en el botón de debajo.
