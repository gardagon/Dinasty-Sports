import { faltaViajar, type ActionDef } from '@ds/contracts';
import type { ActionOption, ActionResult, Game } from '@ds/core';

/**
 * Los bots no piensan en el mapa: eligen entre lo que se podría hacer y, si hace falta, el simulador los lleva antes
 * al sitio (como haría una persona). Se les ofrece lo disponible y lo que solo está bloqueado por el lugar; los
 * desplazamientos no se les ofrecen (los hace el simulador).
 */
export function opcionesDelBot(game: Game): ActionOption[] {
  // Los desplazamientos y las presentaciones (hasta 40 acciones por lugar) no se les ofrecen: ni siquiera se evalúan.
  const omitir = (d: ActionDef) => d.id.startsWith('lugares.') || d.id.startsWith('relaciones.presentarse.');
  return game.listActions({ omitir }).filter((o) => o.available || faltaViajar(o));
}

export interface Paso {
  result: ActionResult;
  /** Minutos que se han ido en viajar antes de la acción. */
  viaje: number;
  /** La acción no se pudo hacer tras el viaje (pasó la hora, p. ej.): no es un fallo del bot. */
  traslado: boolean;
}

/** Hace lo elegido, viajando antes si solo faltaba estar en el sitio. */
export function hacer(game: Game, opts: readonly ActionOption[], choice: string): Paso {
  const opt = opts.find((o) => o.id === choice);
  let viaje = 0;
  if (opt && faltaViajar(opt)) {
    const v = game.perform(`lugares.ir_${opt.lugar![0]}`);
    if (!v.ok) return { result: v, viaje: 0, traslado: false };
    viaje = v.duration;
  }
  const result = game.perform(choice);
  return { result, viaje, traslado: viaje > 0 && !result.ok };
}
