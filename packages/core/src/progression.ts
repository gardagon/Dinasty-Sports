/**
 * Las fórmulas de subida y caída viven en `@ds/contracts` (`progresion.ts`): las usan el motor y `npcs`. Este archivo las reexporta para quien las importaba de aquí.
 */
export { DEFAULT_CURVE, ESCALA_DE_RITMO, POTENCIAL_DE_REFERENCIA, computeCap, computeDecay, computeGain, computeSpeed, potentialSpeed, type ProgressionInputs } from '@ds/contracts';
