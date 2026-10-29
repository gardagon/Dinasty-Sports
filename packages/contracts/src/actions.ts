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
  /**
   * Si devuelve `true`, la acción no se lista (ni la ven la interfaz ni los bots) aunque exista: es para lo que no tiene sentido
   * enseñar ahora (p. ej. las acciones de un deporte que no se practica). Además hay que impedirla en `available`.
   */
  oculta?: (ctx: ReadContext) => boolean;
  /** Condición libre. Devuelve `true` o el motivo por el que no está disponible. */
  available?: (ctx: ReadContext) => true | string;
  /** Entrenamiento. `amount` = puntos que ganaría un personaje a nivel 0 con eficiencia 1. */
  train?: { stat: StatId; amount: number }[];
  /** Lógica adicional (examen, carrera, relación...). */
  run?: (ctx: ActionContext) => void;
  /** Grupo visual en la interfaz. Por defecto, el nombre del módulo. */
  group?: string;
  /**
   * Dónde se hace (ids de `lugares`; el primero es el sitio al que va quien quiere hacerla). Es solo información: quien la declara
   * debe además exigirlo en `available` (ver `conLugar`, en contracts). Sin esto, la acción vale en cualquier parte.
   */
  lugar?: readonly string[] | ((ctx: ReadContext) => readonly string[]);
}

/** Lo que el motor sabe de una acción cuando evalúa modificadores. */
export interface ActionView {
  id: string;
  module: string;
  tags: readonly string[];
}
