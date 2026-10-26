import { faltaViajar } from '@ds/contracts';
import type { ActionResult, Game } from '@ds/core';

/** Hace una acción viajando antes al sitio si solo faltaba estar allí (los tests no piensan en el mapa). */
export function hacer(game: Game, id: string): ActionResult {
  const o = game.preview(id);
  if (o && faltaViajar(o)) game.perform(`lugares.ir_${o.lugar![0]}`);
  return game.perform(id);
}

/** ¿Está disponible esta acción o solo falta ir al sitio? */
export function posible(game: Game, id: string): boolean {
  const o = game.preview(id);
  return !!o && (o.available || faltaViajar(o));
}
