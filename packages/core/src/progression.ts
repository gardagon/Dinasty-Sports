import type { StatDef } from '@ds/contracts';

/**
 * Fórmulas de subida y caída. Puras (sin estado) para poder probarlas y
 * ajustarlas desde la simulación sin tocar el motor.
 */

export interface ProgressionInputs {
  value: number;
  min: number;
  max: number;
  /** Techo actual (ya calculado). */
  cap: number;
  talent: number;
  /** Multiplicador por genéricas (ya calculado, ~1 = neutro). */
  speed: number;
  efficiency: number;
  amount: number;
}

export const DEFAULT_CURVE = 1.5;

/**
 * Ganancia = cantidad × eficiencia × ritmo × talento × velocidadGenéricas × (1 − progreso hacia el techo)^curva
 * El progreso se mide entre el mínimo y el techo: cuanto más cerca del techo, más cuesta.
 */
export function computeGain(def: StatDef, i: ProgressionInputs): number {
  if (i.amount <= 0 || i.efficiency <= 0) return 0;
  if (i.value >= i.cap) return 0;
  const rate = def.growth?.rate ?? 1;
  const curve = def.growth?.curve ?? DEFAULT_CURVE;
  const span = Math.max(1e-9, i.cap - i.min);
  const progress = Math.min(1, Math.max(0, (i.value - i.min) / span));
  const diminishing = Math.pow(1 - progress, curve);
  const gain = i.amount * i.efficiency * rate * i.talent * i.speed * diminishing;
  return Math.min(gain, i.cap - i.value);
}

/** Techo = max × clamp(base + Σ peso × genéricaNormalizada). */
export function computeCap(def: StatDef, min: number, max: number, norm: (id: string) => number): number {
  const cap = def.growth?.cap;
  if (!cap) return max;
  let f = cap.base;
  for (const inf of cap.from ?? []) f += inf.weight * norm(inf.stat);
  f = Math.min(1, Math.max(0.05, f));
  return min + (max - min) * f;
}

/**
 * Quien tiene un tope genético más alto progresa más rápido con el mismo entrenamiento: (tope / 62)², con el tope típico
 * (62) en ×0,8. El 0,8 es la escala: el ritmo de subida se diseñó con topes de ~79 y ahora el tope típico es 62, así que
 * un niño normal tarda en llegar a su tope lo mismo que antes (el tope es más bajo y el ritmo también).
 * Va de ×0,4 a ×1,3 (tope 95 → ×1,3; tope 70 → ×1,0; tope 45 → ×0,42).
 */
export const POTENCIAL_DE_REFERENCIA = 62;
export const ESCALA_DE_RITMO = 0.8;
export function potentialSpeed(potential: number): number {
  return Math.min(1.3, Math.max(0.4, ESCALA_DE_RITMO * (potential / POTENCIAL_DE_REFERENCIA) ** 2));
}

/** Velocidad = 1 + Σ peso × (genéricaNormalizada − 0.5). Mínimo 0.2. */
export function computeSpeed(def: StatDef, norm: (id: string) => number): number {
  let s = 1;
  for (const inf of def.growth?.speedFrom ?? []) s += inf.weight * (norm(inf.stat) - 0.5);
  return Math.max(0.2, s);
}

/**
 * Caída diaria. Devuelve el nuevo valor.
 * Si han pasado más días de gracia que `graceDays`, pierde `ratePerDay` de la distancia al suelo.
 * Suelo = max(valorInicial, máximoAlcanzado × floorRatio).
 */
export function computeDecay(
  def: StatDef,
  value: number,
  daysSinceTrained: number,
  peak: number,
  baseline: number,
): number {
  const d = def.decay;
  if (!d || daysSinceTrained <= d.graceDays) return value;
  const floor = Math.max(baseline, peak * d.floorRatio);
  if (value <= floor) return value;
  return value - (value - floor) * d.ratePerDay;
}
