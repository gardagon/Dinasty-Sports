import type { Rng } from './rng';
import type { StatDef, StatId } from './stats';
import type { TimeView } from './time';

/** Tabla opcional que acompaña a una entrada del registro (p. ej. la clasificación de una carrera). */
export interface LogTable {
  header: string[];
  rows: string[][];
  /** Fila a resaltar (p. ej. la del personaje). */
  highlight?: number;
  /** Alineación de cada columna (por defecto, a la izquierda). */
  align?: ('left' | 'right')[];
}

/** Entrada del registro de la partida (lo que le pasa al personaje). */
export interface LogEntry {
  minute: number;
  module: string;
  text: string;
  kind?: 'info' | 'logro' | 'aviso' | 'resultado';
  /** Detalle en forma de tabla; la interfaz lo muestra desplegable. */
  table?: LogTable;
}

export interface GameEvent<T = unknown> {
  type: string;
  data?: T;
}

/**
 * Vista de solo lectura del juego. Es lo que reciben las condiciones,
 * los modificadores y los servicios. Ningún módulo puede modificar nada desde aquí.
 */
export interface ReadContext {
  readonly time: TimeView;
  /** Id del módulo al que pertenece este contexto. */
  readonly moduleId: string;
  stat(id: StatId): number;
  /** Valor normalizado 0..1 respecto al máximo de la característica. */
  norm(id: StatId): number;
  /** Techo alcanzable ahora mismo (depende de las genéricas). */
  cap(id: StatId): number;
  hasStat(id: StatId): boolean;
  statDef(id: StatId): StatDef | undefined;
  /** Estado propio del módulo de este contexto. */
  state<S>(): Readonly<S>;
  flag<T = unknown>(key: string): T | undefined;
  /** Servicio publicado por otro módulo (ver services.ts). `undefined` si ese módulo no está cargado. */
  service<T>(key: string): T | undefined;
  hasModule(moduleId: string): boolean;
}

/** Contexto con permisos de escritura: lo reciben las acciones (`run`) y los manejadores de eventos. */
export interface ActionContext extends ReadContext {
  readonly rng: Rng;
  /** Eficiencia de la acción en curso (producto de todos los modificadores). 1 fuera de acciones. */
  readonly efficiency: number;
  /** Cambio directo (sin progresión). Solo para stats `estado`/`generica` o habilidades propias. */
  addStat(id: StatId, delta: number): number;
  /** Entrenamiento: pasa por la fórmula de progresión (techo, talento, rendimientos decrecientes). Devuelve lo ganado. */
  train(id: StatId, amount: number): number;
  setState<S>(next: S): void;
  updateState<S>(fn: (current: S) => S): void;
  setFlag(key: string, value: unknown): void;
  log(text: string, kind?: LogEntry['kind'], table?: LogTable): void;
  emit<T>(event: GameEvent<T>): void;
}

/** Contexto al crear la partida (para generar el estado inicial de un módulo). */
export interface InitContext {
  readonly rng: Rng;
  readonly seed: number;
  readonly playerName: string;
  /**
   * Genética de un rasgo que no es una stat (p. ej. la altura), como puntuación típica (media 0, desviación 1) de cada
   * progenitor y del hijo. El del hijo mezcla los de sus padres (ver `mezclarZ`). Estable: la misma familia da lo mismo.
   */
  herencia(familia: string): { padre: number; madre: number; hijo: number };
}
