import { Game, type CreateOptions, type GameState } from '@ds/core';
import { APORTES, type FichaDeDeporte, type GameModule } from '@ds/contracts';
import { MODULOS } from './modulos';

export { MODULOS } from './modulos';

/** Los deportes de los módulos (o de los que se indiquen): lo que cada uno aporta como ficha. Sirve para listarlos antes de crear la partida. */
export function catalogoDeDeportes(modulos: readonly GameModule<any>[] = MODULOS): FichaDeDeporte[] {
  return modulos.flatMap((m) => (m.aportes?.[APORTES.fichaDeDeporte] ?? []) as FichaDeDeporte[]);
}

/** Los módulos sin los deportes que no están entre los incluidos (los módulos que no son un deporte se quedan siempre). */
function conDeportes(modulos: readonly GameModule<any>[], incluidos: readonly string[]): readonly GameModule<any>[] {
  const fuera = new Set(catalogoDeDeportes(modulos).map((d) => d.id).filter((id) => !incluidos.includes(id)));
  return modulos.filter((m) => !fuera.has(m.id));
}

/**
 * Nueva partida con todos los módulos (o con los que se indiquen, útil en tests). `deportes` elige qué deportes del catálogo
 * entran en la partida (por defecto, todos los cargados); siempre hace falta al menos uno. El personaje puede hacer cualquiera de
 * ellos; su deporte principal es el del club al que se apunte.
 */
export function nuevaPartida(opts: CreateOptions & { deportes?: readonly string[] } = {}, modulos: readonly GameModule<any>[] = MODULOS): Game {
  const { deportes, ...resto } = opts;
  if (!deportes) return Game.create(modulos, resto);
  const validos = catalogoDeDeportes(modulos).filter((d) => deportes.includes(d.id));
  if (!validos.length) throw new Error('Una partida necesita al menos un deporte.');
  return Game.create(conDeportes(modulos, validos.map((d) => d.id)), resto);
}

/** Carga una partida guardada. `copiar: false` evita copiar el estado cuando acaba de salir de un texto JSON (nadie más lo usa). */
export function cargarPartida(saved: GameState, modulos: readonly GameModule<any>[] = MODULOS, opciones?: { copiar?: boolean }): Game {
  // Los deportes de la partida son los que ya tiene guardados: no se le añade uno que se eligió no incluir.
  const guardados = catalogoDeDeportes(modulos).map((d) => d.id).filter((id) => id in saved.modules);
  return Game.load(guardados.length ? conDeportes(modulos, guardados) : modulos, saved, opciones);
}
