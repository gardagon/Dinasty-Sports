# Dinasty Sports — guía para trabajar en este repositorio

RPG de decisiones (deporte + vida escolar) en TypeScript, monorepo con npm workspaces.
Lee `docs/ARQUITECTURA.md` antes de cambios grandes.

## Reglas que no se rompen

1. **Un módulo (`modules/*`) solo importa `@ds/contracts`.** Nunca otro módulo, nunca `@ds/core`
   (salvo en sus `*.test.ts`). Lo vigila `tests/arquitectura.test.ts`.
2. **Los módulos se comunican solo por:** etiquetas + modificadores, eventos (propios `modulo.*` o
   compartidos de `SHARED_EVENTS`), servicios definidos en `packages/contracts/src/services.ts`,
   y referencias por id a las stats genéricas `gen.*`.
3. **Ids con prefijo del módulo** (`atletismo.tecnica`, `estudios.clase`). El registro lo exige.
4. **Un módulo no cambia directamente las habilidades de otro:** usa `ctx.train()`. `ctx.addStat()`
   solo vale para stats `estado` o propias. El motor lanza un error si no.
5. **El estado de un módulo es JSON serializable** y solo lo modifica ese módulo.
6. **`packages/core` no contiene contenido de juego.** Nada de deportes, asignaturas ni textos de juego.
7. **Lo que necesitan varios módulos va a contracts** (tipos de eventos compartidos, interfaces de servicio).
8. Textos del juego en español. Los NPCs tienen género: concuerda los textos (`gender`).

## Comandos

```bash
npm install
npm run dev              # interfaz web en local
npm test                 # tests (incluye arquitectura e integración)
npm run typecheck
npm run sim              # simulación de balance completa (365 días × 5 semillas)
npm run sim:rapida
npm run check            # tipos + tests + simulación rápida
npm run nuevo-modulo -- <id> "<Nombre>"
```

## Al cambiar números de balance

Ejecuta `npm run sim` antes y después, y compara los chequeos y la tabla final.
Si un chequeo pasa a ⚠️ o ❌, explica por qué o ajusta. Los umbrales están en `sim/src/analysis.ts`.
Si un bot se comporta de forma poco razonable, arregla el bot (`sim/src/bots.ts`), no el juego.

## Al añadir un módulo

Usa el generador. El módulo debe tener un test que lo cargue solo con `gen`.
Si es un deporte: etiqueta propia + `entrenamiento`/`competicion`, emite `competicion.resultado`.
