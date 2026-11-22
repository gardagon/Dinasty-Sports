import { rngEstable } from './rng';

/**
 * LOS DORSALES (decidido el 21/11/2026): el número de la camiseta de cada jugador de un equipo, también el personaje. Es un dato del deporte (`PuestosDeDeporte.dorsales`) y una función pura:
 * otro deporte de equipo solo tiene que dar sus reglas. Al azar dentro de lo normal, con algo de costumbre por puesto sin forzarla, y los porteros aparte (el 1, el 13 o, si están cogidos,
 * el primero libre a partir del 16, **después** de que hayan escogido los de campo). El azar es `rngEstable` (no gasta el de la partida).
 */
export interface ReglaDeDorsales {
  /** Los de campo: de qué número a qué número se reparten (el 1 queda para los porteros). */
  campo: { desde: number; hasta: number };
  /** La costumbre de cada puesto: los números que suele llevar (laterales 2 y 3, centrales 4 y 5, delanteros 9…). */
  costumbres: Readonly<Record<string, readonly number[]>>;
  /** Con qué probabilidad un jugador de campo va por la costumbre de su puesto (si alguno de sus números sigue libre); si no, escoge entre todos los libres. */
  pesoDeLaCostumbre: number;
  porteros: {
    /** Los puestos de portero. */
    puestos: readonly string[];
    /** Los números de siempre del portero (en el fútbol, el 1 y el 13), el primero más probable. */
    preferidos: readonly number[];
    /** Si están cogidos, el primero libre a partir de este número. */
    desde: number;
  };
}

export interface JugadorConDorsal {
  id: string;
  puesto: string;
  /** El que ya lleva (guardado); sin él, se le asigna. */
  dorsal?: number;
}

/**
 * Reparte los dorsales de un equipo. Quien ya lleva uno (y no lo repite otro) lo conserva: el dorsal se asigna al entrar en el equipo y se mantiene mientras siga en él. A los que no tienen se les asigna en este orden:
 * primero los de campo (por id, cada uno con su azar estable) y después los porteros. `clave` identifica al equipo (para que su azar no sea el de otro).
 */
export function asignarDorsales(jugadores: readonly JugadorConDorsal[], regla: ReglaDeDorsales, clave: string): Map<string, number> {
  const resultado = new Map<string, number>();
  const ocupados = new Set<number>();
  const orden = [...jugadores].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const j of orden) {
    if (j.dorsal !== undefined && Number.isInteger(j.dorsal) && j.dorsal > 0 && !ocupados.has(j.dorsal)) {
      resultado.set(j.id, j.dorsal);
      ocupados.add(j.dorsal);
    }
  }
  const esPortero = (puesto: string): boolean => regla.porteros.puestos.includes(puesto);
  const pendientes = orden.filter((j) => !resultado.has(j.id));
  for (const j of pendientes.filter((x) => !esPortero(x.puesto))) {
    const n = dorsalDeCampo(j.id, j.puesto, regla, clave, ocupados);
    resultado.set(j.id, n);
    ocupados.add(n);
  }
  for (const j of pendientes.filter((x) => esPortero(x.puesto))) {
    const n = dorsalDePortero(j.id, regla, clave, ocupados);
    resultado.set(j.id, n);
    ocupados.add(n);
  }
  return resultado;
}

/** El dorsal de un jugador de campo que entra en un equipo con estos números ya cogidos. */
export function dorsalDeCampo(id: string, puesto: string, regla: ReglaDeDorsales, clave: string, ocupados: ReadonlySet<number>): number {
  const rng = rngEstable('dorsal', clave, id);
  const costumbre = (regla.costumbres[puesto] ?? []).filter((n) => !ocupados.has(n));
  const vaPorLaCostumbre = rng.chance(regla.pesoDeLaCostumbre);
  if (costumbre.length && vaPorLaCostumbre) return costumbre[Math.floor(rng.next() * costumbre.length)];
  const libres: number[] = [];
  for (let n = regla.campo.desde; n <= regla.campo.hasta; n++) if (!ocupados.has(n)) libres.push(n);
  if (libres.length) return libres[Math.floor(rng.next() * libres.length)];
  // Plantilla de más de lo normal: el primero libre por encima.
  let n = regla.campo.hasta + 1;
  while (ocupados.has(n)) n++;
  return n;
}

/** El dorsal de un portero: el primero libre de los suyos (el primero de la lista con más probabilidad) o, si están cogidos, el primero libre desde `desde`. */
export function dorsalDePortero(id: string, regla: ReglaDeDorsales, clave: string, ocupados: ReadonlySet<number>): number {
  const rng = rngEstable('dorsal', clave, id);
  const libres = regla.porteros.preferidos.filter((n) => !ocupados.has(n));
  if (libres.length) return libres.length === 1 || rng.chance(0.65) ? libres[0] : libres[1];
  let n = regla.porteros.desde;
  while (ocupados.has(n)) n++;
  return n;
}
