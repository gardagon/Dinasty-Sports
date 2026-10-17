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
  /** Último minuto en que se entrenó cada stat. */
  lastTrained: Record<StatId, number>;
  /** Estado propio de cada módulo. */
  modules: Record<string, unknown>;
  flags: Record<string, unknown>;
  log: LogEntry[];
  /** Contador de acciones realizadas (estadística y depuración). */
  actionCount: number;
}

export const LOG_LIMIT = 150;
