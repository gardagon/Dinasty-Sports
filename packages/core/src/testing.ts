import type { TimeView } from '@ds/contracts';
import type { Game } from './game';

/**
 * Utilidades para tests y simulación.
 * Avanza el reloj repitiendo una acción de espera (p. ej. 'gen.descansar') hasta que se cumpla la condición.
 */
export function advanceUntil(game: Game, waitActionId: string, until: (t: TimeView) => boolean, maxSteps = 2000): void {
  for (let i = 0; i < maxSteps; i++) {
    if (until(game.time)) return;
    const r = game.perform(waitActionId);
    if (!r.ok) throw new Error(`No se puede esperar con "${waitActionId}": ${r.reason}`);
  }
  throw new Error('advanceUntil: no se alcanzó la condición');
}

/** Atajo: avanzar hasta un día de la semana (0 = lunes) y una hora. */
export function advanceTo(game: Game, waitActionId: string, weekday: number, hour: number): void {
  advanceUntil(game, waitActionId, (t) => t.weekday === weekday && t.hour === hour);
}
