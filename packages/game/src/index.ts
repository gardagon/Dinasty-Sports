import { Game, type CreateOptions, type GameState } from '@ds/core';
import { APORTES, SERVICES, SHARED_EVENTS, type ClubDirectory, type DeporteAnadidoData, type FichaDeDeporte, type GameModule } from '@ds/contracts';
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
  const guardados = catalogoDeDeportes(modulos).map((d) => d.id).filter((id) => id in saved.modules && !(id in (saved.retirados ?? {})));
  return Game.load(guardados.length ? conDeportes(modulos, guardados) : modulos, saved, opciones);
}

/** Los deportes que hay ahora en la partida (los cargados que no se han quitado). */
export function deportesDeLaPartida(game: Game, modulos: readonly GameModule<any>[] = MODULOS): string[] {
  return catalogoDeDeportes(modulos).map((d) => d.id).filter((id) => game.registry.moduleIds.has(id));
}

/** Por qué no se puede quitar un deporte de la partida (o `undefined` si se puede): siempre hace falta uno, y no se deja el deporte de un club al que se pertenece. */
export function motivoParaNoQuitar(game: Game, id: string, modulos: readonly GameModule<any>[] = MODULOS): string | undefined {
  const hay = deportesDeLaPartida(game, modulos);
  if (!hay.includes(id)) return 'Ese deporte no está en la partida.';
  if (hay.length === 1) return 'Siempre hace falta al menos un deporte.';
  const club = game.service<ClubDirectory>(SERVICES.clubes)?.membership(id);
  return club ? 'Primero tienes que dejar tu club de este deporte.' : undefined;
}

/**
 * Añade un deporte del catálogo a una partida empezada: el deporte nace con la partida ya empezada (su estado inicial y sus habilidades), su gente se
 * recluta entre los niños que no juegan a nada (`npcs`), y si el deporte ya estuvo, vuelve con lo que tenía (sus habilidades han seguido cayendo). Devuelve
 * la partida nueva; la de antes no se toca.
 */
export function añadirDeporteALaPartida(game: Game, id: string, modulos: readonly GameModule<any>[] = MODULOS): Game {
  const ficha = catalogoDeDeportes(modulos).find((d) => d.id === id);
  if (!ficha) throw new Error(`No hay ningún deporte «${id}» cargado.`);
  if (game.registry.moduleIds.has(id)) throw new Error(`«${ficha.nombre}» ya está en la partida.`);
  const estado = game.serialize();
  if (estado.retirados) {
    delete estado.retirados[id];
    if (!Object.keys(estado.retirados).length) delete estado.retirados;
  }
  const nueva = Game.load(conDeportes(modulos, [...deportesDeLaPartida(game, modulos), id]), estado, { copiar: false });
  nueva.notificar<DeporteAnadidoData>({ type: SHARED_EVENTS.DEPORTE_ANADIDO, data: { deporte: id } });
  return nueva;
}

/**
 * Quita un deporte de una partida empezada. No se borra nada: la partida guarda las definiciones de sus habilidades para que sigan cayendo y envejeciendo
 * cada día, su estado queda como estaba y su gente sigue viviendo (se renueva cada curso). Al volver a añadirlo todo está al día. Devuelve la partida nueva.
 */
export function quitarDeporteDeLaPartida(game: Game, id: string, modulos: readonly GameModule<any>[] = MODULOS): Game {
  const motivo = motivoParaNoQuitar(game, id, modulos);
  if (motivo) throw new Error(motivo);
  const estado = game.serialize();
  const definiciones = game.registry.modules.find((m) => m.id === id)?.stats ?? [];
  estado.retirados = { ...estado.retirados, [id]: structuredClone(definiciones) };
  return Game.load(conDeportes(modulos, deportesDeLaPartida(game, modulos).filter((d) => d !== id)), estado, { copiar: false });
}
