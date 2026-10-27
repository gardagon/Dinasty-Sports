import type { TimeView } from '@ds/contracts';
import type { Game } from './game';

/**
 * Utilidades para tests y simulación.
 * Avanza el reloj repitiendo una acción de espera (p. ej. 'gen.descansar') hasta que se cumpla la condición.
 */
export function advanceUntil(game: Game, waitActionId: string, until: (t: TimeView) => boolean, maxSteps = 2000): void {
  let esperas = 0;
  for (let i = 0; i < maxSteps; i++) {
    if (until(game.time)) return;
    let r = game.perform(waitActionId);
    if (!r.ok && game.preview('gen.esperar')) {
      // Descansar (la siesta) solo se puede en casa: fuera, los tests esperan de 5 en 5 minutos y, si la espera se alarga (más de 2 horas), vuelven a casa.
      if (++esperas > 24 && game.preview('lugares.ir_casa')?.available) game.perform('lugares.ir_casa');
      r = game.perform('gen.esperar');
      if (game.preview(waitActionId)?.available) esperas = 0;
    }
    if (!r.ok) throw new Error(`No se puede esperar con "${waitActionId}": ${r.reason}`);
  }
  throw new Error('advanceUntil: no se alcanzó la condición');
}

/** Atajo: avanzar hasta un día de la semana (0 = lunes) y una hora. */
export function advanceTo(game: Game, waitActionId: string, weekday: number, hour: number): void {
  advanceUntil(game, waitActionId, (t) => t.weekday === weekday && t.hour === hour);
}

/** Atajo: avanzar hasta una semana absoluta concreta, un día de la semana (0 = lunes) y una hora. */
export function advanceToWeek(game: Game, waitActionId: string, week: number, weekday: number, hour: number): void {
  advanceUntil(game, waitActionId, (t) => t.week === week && t.weekday === weekday && t.hour === hour, 20000);
}
