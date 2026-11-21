# Rendimiento del director de sucesos (17/11/2026)

Encargo: punto 1 de `PLAN_EVENTOS.md` §7 ter: bajar el coste por acción del director (`modules/sucesos`) con 500 sucesos generados.

## Qué cambia

`modules/sucesos/src/index.ts`, solo el director; ni formato ni contenido.

- El coste estaba en los sucesos «al hacer una acción» cuyo dato de señal coincide (p. ej. la etiqueta): cada intento de `intentar` copiaba el reparto, buscaba papeles y **creaba el contexto de condiciones** (cierres y lector de hechos) para descubrir que la primera condición (una marca o un contador) fallaba.
- Ahora `indiceDe` guarda por suceso sus **condiciones ligeras** (`ligeras`): las de `cuando`, ya ordenadas, que solo miran marcas del personaje (sin `de`), contadores, datos de la señal y el `no` de una marca. En `alEvento`, antes de `intentar`, se evalúan con un contexto mínimo (uno por señal, creado solo si hace falta, sin lector de hechos). Si alguna falla, el suceso no puede salir: se salta `intentar`.
- El resultado es el mismo: `intentar` habría devuelto `false` por esas mismas condiciones y el reparto no tiene efectos secundarios (el azar es estable por suceso y día). Se conserva la rama de `aguanta` (si no era el momento, se queda como programado) y, en los de `prob`, no se gasta cupo.
- No se aplica a los sucesos de PNJ (`sujeto`): sus marcas son suyas.

## Medidas (`npm run eventos:rendimiento`, contenedor de desarrollo)

«Por acción, sin cambio de día», catálogo de 500 sucesos. Las cifras bailan: varias pasadas.

| | Antes (3 pasadas) | Después (4 pasadas) | Objetivo |
|---|---|---|---|
| Coste añadido por acción | 0,076 / 0,087 / 0,077 ms | 0,008 / 0,010 / 0,009 / 0,009 ms | < 0,02 ms ✅ |

Arranque y pasada diaria no cambian de orden (arranque 9 ms o menos; ruido ±).

## Comprobaciones

- `npm run huella -- 120`: salida idéntica antes y después.
- `npm test`: 89 archivos, 1076 tests en verde (incluye eventos y arquitectura). `npm run eventos:validar`: todo en orden.
- `npm run sim:rapida` antes y después: salida idéntica salvo la hora de la cabecera (mismos chequeos: 2 ⚠️ en ambos, 0 ❌).

## Lo que no he bajado / pendiente

- Todo el objetivo por acción está cumplido (~0,009 ms). Lo que queda de coste es el recorrido de los candidatos que coinciden en la etiqueta (~25 con 150 sucesos de ese tipo): una lista por candidato y una evaluación de marcas/contadores. Se podría bajar más indexando por marca, pero no hace falta.
- Las condiciones ligeras solo se aplican al personaje. Los sucesos de PNJ (`sujeto`) siguen por `intentar` (no hay ninguno por señal con volumen).
- No se tocó `npm run sim` completa (la rápida es idéntica y el cambio no altera resultados).
