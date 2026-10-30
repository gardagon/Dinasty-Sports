import { SERVICES, faltaViajar, rutaA, tiempoEntre, type LugaresService } from '@ds/contracts';
import type { ActionResult, Game } from '@ds/core';

/** Va a un sitio por el camino que permite el mapa (una zona, desde la entrada de su lugar). */
export function viajarA(game: Game, lugar: string): void {
  const lugares = game.service<LugaresService>(SERVICES.lugares)!;
  for (const parada of rutaA(lugares.mapa(), lugares.actual().id, lugar)) game.perform(`lugares.ir_${parada}`);
}

/** Hace una acción viajando antes al sitio si solo faltaba estar allí (los tests no piensan en el mapa). */
export function hacer(game: Game, id: string): ActionResult {
  const o = game.preview(id);
  if (o && faltaViajar(o)) viajarA(game, o.lugar![0]);
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

/**
 * Espera (de 5 en 5 minutos) en el sitio donde se está y viaja de modo que se llegue a `lugar` a la hora indicada (o en cuanto se pueda, si ya
 * es tarde). Los tests de horarios de colegio necesitan caer en una ventana de minutos concreta (7:50, el recreo...).
 */
export function llegarA(game: Game, lugar: string, hora: number, minuto = 0): void {
  const lugares = game.service<LugaresService>(SERVICES.lugares)!;
  const mapa = lugares.mapa();
  let previo = lugares.actual().id;
  let viaje = 0;
  for (const parada of rutaA(mapa, previo, lugar)) {
    viaje += tiempoEntre(mapa, previo, parada) ?? 0;
    previo = parada;
  }
  while (game.time.minuteOfDay + viaje < hora * 60 + minuto && game.perform('gen.esperar').ok) {
    /* esperar */
  }
  viajarA(game, lugar);
}
