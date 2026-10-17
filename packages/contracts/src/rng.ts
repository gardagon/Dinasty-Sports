/** Generador aleatorio determinista: misma semilla + mismas decisiones = misma partida. */
export interface Rng {
  /** Número en [0, 1). */
  next(): number;
  /** Entero en [min, max] (ambos incluidos). */
  int(min: number, max: number): number;
  /** Real en [min, max). */
  range(min: number, max: number): number;
  chance(probability: number): boolean;
  pick<T>(items: readonly T[]): T;
  /** Aproximación normal (media 0, desviación 1). */
  normal(): number;
}
