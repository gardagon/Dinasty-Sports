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

const DEL_REPARTO = ['entrenador', 'tutor', 'companero_estudio', 'companero_social'];

/** Da por conocidas a estas personas (por defecto, las cuatro del reparto inicial): los tests no siempre empiezan preguntando nombres. */
export function conocer(game: Game, ...ids: string[]): Game {
  const s = game.moduleState<{ npcs: { id: string; known?: boolean }[] }>('npcs') as { npcs: { id: string; known?: boolean }[] };
  const quienes = ids.length ? ids : DEL_REPARTO;
  s.npcs = s.npcs.map((n) => (quienes.includes(n.id) ? { ...n, known: true } : n));
  return game;
}
