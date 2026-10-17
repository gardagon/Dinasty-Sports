import type { ActionContext, ReadContext } from './context';
import type { StatId } from './stats';

/**
 * Una acción cuesta tiempo de juego. Todas pasan por el mismo pipeline:
 * requisitos → modificadores → coste → entrenamiento → `run` → avance del tiempo → eventos.
 */
export interface ActionDef {
  /** `<idModulo>.<nombre>` */
  id: string;
  name: string;
  description?: string;
  /**
   * Etiquetas: el lenguaje común entre módulos. Los modificadores se enganchan a etiquetas,
   * nunca a ids concretos. Ej.: `fisico`, `mental`, `social`, `estudio`, `entrenamiento`, `ocio`.
   */
  tags: string[];
  /** Duración base en minutos de juego. */
  duration: number | ((ctx: ReadContext) => number);
  /**
   * Cambios directos en stats. Un valor negativo sobre una stat `resource` (energía) es un coste:
   * se escala con los modificadores de coste y bloquea la acción si no alcanza.
   */
  delta?: Record<StatId, number>;
  /** Requisitos mínimos/máximos de stats. */
  requires?: { stat: StatId; min?: number; max?: number; label?: string }[];
  /** Condición libre. Devuelve `true` o el motivo por el que no está disponible. */
  available?: (ctx: ReadContext) => true | string;
  /** Entrenamiento. `amount` = puntos que ganaría un personaje a nivel 0 con eficiencia 1. */
  train?: { stat: StatId; amount: number }[];
  /** Lógica adicional (examen, carrera, relación...). */
  run?: (ctx: ActionContext) => void;
  /** Grupo visual en la interfaz. Por defecto, el nombre del módulo. */
  group?: string;
}

/** Lo que el motor sabe de una acción cuando evalúa modificadores. */
export interface ActionView {
  id: string;
  module: string;
  tags: readonly string[];
}
