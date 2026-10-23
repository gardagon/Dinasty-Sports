import type { LogEntry, StatId } from '@ds/contracts';

export const SAVE_VERSION = 1;

/**
 * Estado ÚNICO de la partida. Plano y serializable a JSON:
 * guardar/cargar = JSON.stringify / JSON.parse.
 */
export interface GameState {
  version: number;
  seed: number;
  rng: number;
  playerName: string;
  /** Minuto absoluto de juego. */
  minute: number;
  stats: Record<StatId, number>;
  /** Máximo alcanzado por cada stat (para el suelo de caída). */
  peaks: Record<StatId, number>;
  /** Valor inicial (la caída nunca baja de aquí). */
  baseline: Record<StatId, number>;
  /** Multiplicador oculto de talento por stat. */
  talent: Record<StatId, number>;
  /** Tope genético individual de cada stat que lo tiene (ver `StatDef.genetics`). Ausente = sin tope genético. */
  potential?: Record<StatId, number>;
  /** Genética de los padres, de la que salen los topes del personaje (ver `herencia.ts`). */
  lineage?: Lineage;
  /** Último minuto en que se entrenó cada stat. */
  lastTrained: Record<StatId, number>;
  /** Estado propio de cada módulo. */
  modules: Record<string, unknown>;
  flags: Record<string, unknown>;
  log: LogEntry[];
  /** Contador de acciones realizadas (estadística y depuración). */
  actionCount: number;
}

/** Genética de un progenitor: tope de cada capacidad con herencia directa y puntuación típica de sus rasgos que no son stats. */
export interface ParentGenes {
  familias: Record<string, number>;
  topes: Record<StatId, number>;
}

export interface Lineage {
  padre: ParentGenes;
  madre: ParentGenes;
  /** Puntuación típica de los rasgos heredados que no son stats (p. ej. la altura), del hijo. */
  hijo: Record<string, number>;
  /** De qué progenitor hereda el hijo cada característica de herencia directa. */
  origen: Record<StatId, 'padre' | 'madre'>;
  /** Factor de herencia del nivel inicial de este hijo (0,7 a 0,9). */
  factor?: number;
}

export const LOG_LIMIT = 150;
