import { Game, type CreateOptions, type GameState } from '@ds/core';
import type { GameModule } from '@ds/contracts';
import { MODULOS } from './modulos';

export { MODULOS } from './modulos';

/** Nueva partida con todos los módulos (o con los que se indiquen, útil en tests). */
export function nuevaPartida(opts: CreateOptions = {}, modulos: readonly GameModule<any>[] = MODULOS): Game {
  return Game.create(modulos, opts);
}

export function cargarPartida(saved: GameState, modulos: readonly GameModule<any>[] = MODULOS): Game {
  return Game.load(modulos, saved);
}
