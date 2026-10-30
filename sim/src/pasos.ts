import { SERVICES, faltaViajar, rutaA, type ActionDef, type LugaresService } from '@ds/contracts';
import type { ActionOption, ActionResult, Game } from '@ds/core';

/**
 * Los bots no piensan en el mapa: eligen entre lo que se podría hacer y, si hace falta, el simulador los lleva antes
 * al sitio (como haría una persona). Se les ofrece lo disponible y lo que solo está bloqueado por el lugar; los
 * desplazamientos no se les ofrecen (los hace el simulador).
 */
/** Las presentaciones que sí se ofrecen: las del reparto inicial (los bots tienen que conocer a su tutor y a sus compañeros). */
const PRESENTACIONES_DEL_REPARTO = /^relaciones\.presentarse\.(entrenador|tutor|companero_estudio|companero_social)$/;

export function opcionesDelBot(game: Game): ActionOption[] {
  // Los desplazamientos y las presentaciones (hasta 40 acciones por lugar) no se les ofrecen: ni siquiera se evalúan.
  const omitir = (d: ActionDef) => d.id.startsWith('lugares.') || (d.id.startsWith('relaciones.presentarse.') && !PRESENTACIONES_DEL_REPARTO.test(d.id));
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
    // Los destinos que hacen falta (una zona, como el aula, se alcanza desde la entrada de su lugar).
    const lugares = game.service<LugaresService>(SERVICES.lugares)!;
    for (const parada of rutaA(lugares.mapa(), lugares.actual().id, opt.lugar![0])) {
      const v = game.perform(`lugares.ir_${parada}`);
      if (!v.ok) return { result: v, viaje, traslado: false };
      viaje += v.duration;
    }
  }
  const result = game.perform(choice);
  return { result, viaje, traslado: viaje > 0 && !result.ok };
}
