import { Game, type CreateOptions, type GameState } from '@ds/core';
import type { GameModule } from '@ds/contracts';
import { MODULOS } from './modulos';

export { MODULOS } from './modulos';

/** Nueva partida con todos los módulos (o con los que se indiquen, útil en tests). */
export function nuevaPartida(opts: CreateOptions = {}, modulos: readonly GameModule<any>[] = MODULOS): Game {
  return Game.create(modulos, opts);
}

/** Carga una partida guardada. `copiar: false` evita copiar el estado cuando acaba de salir de un texto JSON (nadie más lo usa). */
export function cargarPartida(saved: GameState, modulos: readonly GameModule<any>[] = MODULOS, opciones?: { copiar?: boolean }): Game {
  return Game.load(modulos, saved, opciones);
}
