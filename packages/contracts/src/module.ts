import type { ActionDef } from './actions';
import type { ActionContext, GameEvent, InitContext, ReadContext } from './context';
import type { ModifierDef } from './modifiers';
import type { StatDef } from './stats';

export type EventHandler<T = any> = (ctx: ActionContext, event: GameEvent<T>) => void;

/**
 * EL CONTRATO. Un módulo es un objeto declarativo: dice qué características aporta,
 * qué se puede hacer, cómo influye en los demás (por etiquetas) y qué eventos escucha.
 *
 * Regla de oro: un módulo solo importa `@ds/contracts`. Nunca otro módulo ni el núcleo.
 */
export interface GameModule<S = unknown> {
  /** Id corto y único. Prefijo de todos sus stats y acciones. */
  id: string;
  name: string;
  version?: string;
  description?: string;
  /** Módulos que deben estar cargados (normalmente solo `gen`). */
  dependsOn?: string[];
  stats?: StatDef[];
  actions?: ActionDef[];
  /**
   * Acciones que se calculan al registrar los módulos, con lo que todos aportan (`aportes`): son acciones fijas más (con su sitio en la lista, justo
   * detrás de las de `actions`), pero su lista depende de qué módulos están cargados. P. ej. ir a cada sitio del mapa, incluidos los de los deportes.
   */
  accionesSegunAportes?: (aportes: (clave: string) => readonly unknown[]) => ActionDef[];
  /** Acciones que dependen del estado (p. ej. "Quedar con <NPC>"). */
  dynamicActions?: (ctx: ReadContext) => ActionDef[];
  /**
   * Acciones con parámetros en el id (p. ej. «proponer un plan a esta hora en este sitio»): hay demasiadas combinaciones para listarlas, así que no
   * salen en las listas (ni las ven los bots) pero `preview` y `perform` las encuentran por su id. Devuelve `undefined` si el id no es suyo.
   */
  resolverAccion?: (ctx: ReadContext, id: string) => ActionDef | undefined;
  modifiers?: ModifierDef[];
  /** Escucha de eventos: `{ 'dia.fin': (ctx, ev) => ... }`. */
  on?: Record<string, EventHandler>;
  /** Servicios que publica (ver services.ts). */
  services?: Record<string, (ctx: ReadContext) => unknown>;
  /**
   * Aportes: datos declarativos para un punto de extensión que otro módulo (o el kit) define por una clave, p. ej. `deportes.ficha`. El motor
   * los junta de todos los módulos cargados y no sabe qué son (igual que no sabe qué es un servicio); quien los consume los lee con
   * `ctx.aportes<T>(clave)`. Es la forma de que un módulo pregunte «qué deportes hay» sin importar a ninguno. Deben ser JSON serializable.
   */
  aportes?: Record<string, readonly unknown[]>;
  /** Estado propio inicial del módulo (debe ser JSON serializable). */
  initState?: (ctx: InitContext) => S;
}

/** Ayuda de tipado para declarar módulos. */
export function defineModule<S>(module: GameModule<S>): GameModule<S> {
  return module;
}
