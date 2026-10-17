import type { Game } from './game';

/**
 * Reglas que NUNCA deben romperse. La simulación las comprueba tras cada acción.
 * Devuelve la lista de problemas (vacía si todo está bien).
 */
export function checkInvariants(game: Game): string[] {
  const problems: string[] = [];
  for (const { def, min, max } of game.registry.statList) {
    const v = game.stat(def.id);
    if (!Number.isFinite(v)) problems.push(`${def.id} no es un número (${v})`);
    else if (v < min - 1e-6 || v > max + 1e-6) problems.push(`${def.id}=${v.toFixed(3)} fuera de [${min}, ${max}]`);
  }
  if (!Number.isFinite(game.time.minute)) problems.push('El tiempo no es un número');
  return problems;
}
