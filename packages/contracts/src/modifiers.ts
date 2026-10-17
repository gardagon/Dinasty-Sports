import type { ActionView } from './actions';
import type { ReadContext } from './context';

/** Resultado de un modificador. Todos los campos son multiplicadores (1 = sin efecto). */
export interface ModifierResult {
  /** Multiplica lo que se gana entrenando. */
  efficiency?: number;
  /** Multiplica los costes (deltas negativos). */
  cost?: number;
  /** Multiplica la duración. */
  duration?: number;
  /** Texto corto para explicar al jugador por qué rinde más o menos. */
  reason?: string;
}

/**
 * El nexo entre módulos. Un modificador se engancha a etiquetas de acción,
 * así un módulo puede afectar a otro sin conocerlo.
 * Ej.: "si la energía está baja, las acciones `*` rinden menos".
 */
export interface ModifierDef {
  id: string;
  /** Etiquetas a las que se aplica. `'*'` = todas las acciones. */
  tags: string[];
  apply: (ctx: ReadContext, action: ActionView) => ModifierResult | null | undefined;
}

export interface AppliedModifier {
  id: string;
  module: string;
  result: ModifierResult;
}
