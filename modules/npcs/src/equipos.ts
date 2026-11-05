import { cuposPorGrupo, grupoDePuesto, type PuestosDeDeporte } from '@ds/contracts';

/**
 * LOS EQUIPOS DE UN CLUB (`CIUDAD_Y_LIGAS.md` §5, decisión del usuario del 03/11/2026): hasta cuatro equipos por club y categoría.
 * - **Los grandes, por año:** A (los de segundo año, más los de primer año que serían titulares en él), B (los de primer año, solo los mejores), C (los de segundo año que no entran en el A) y D
 *   (los de primer año que no entran en el B). En juvenil, «segundo año» es segundo y tercero.
 * - **Medianos, pequeños y el del colegio, por nivel, con los años mezclados:** el A con los mejores, el B con los siguientes, y así.
 * Cada equipo respeta el reparto por puestos (`cuposPorGrupo`). Son funciones puras: los equipos se calculan de quienes hay en el club, no se guardan.
 */

/** Un jugador de un club en una categoría: su puesto, lo que vale en él y en qué año de la categoría está (1 = primero). */
export interface MiembroDeClub {
  id: string;
  puesto: string;
  valor: number;
  anio: 1 | 2;
}

export type LetraDeEquipo = 'A' | 'B' | 'C' | 'D';
export const LETRAS: readonly LetraDeEquipo[] = ['A', 'B', 'C', 'D'];

export interface EquiposDelClub {
  A: string[];
  B: string[];
  C: string[];
  D: string[];
  /** Los que no caben en ningún equipo (por puestos o porque no hay más equipos). */
  sobran: string[];
}

/** Llena un equipo de `max` jugadores recorriendo `candidatos` en orden: entra el siguiente de cada grupo de puestos mientras haya cupo en él. */
function llenar(candidatos: readonly MiembroDeClub[], p: PuestosDeDeporte, max: number): string[] {
  const cupos = cuposPorGrupo(p, max);
  const cuenta: Record<string, number> = {};
  const dentro: string[] = [];
  for (const c of candidatos) {
    const g = grupoDePuesto(p, c.puesto);
    if (!g || (cuenta[g] ?? 0) >= (cupos[g] ?? 0)) continue;
    cuenta[g] = (cuenta[g] ?? 0) + 1;
    dentro.push(c.id);
  }
  return dentro;
}

const porValor = (a: Pick<MiembroDeClub, 'id' | 'valor'>, b: Pick<MiembroDeClub, 'id' | 'valor'>): number => b.valor - a.valor || (a.id < b.id ? -1 : 1);

/**
 * Reparte a los miembros de un club en una categoría en sus equipos A a D. `nEquipos` es cuántos tiene abiertos (de 1 a 4), `max` los jugadores de cada uno, `porAnio` si es un club grande
 * (por año) o no (por nivel) y `liston` los puntos que un jugador de primer año necesita de más sobre uno de segundo para ser titular en el A de un grande.
 */
export function repartirEnEquipos(miembros: readonly MiembroDeClub[], p: PuestosDeDeporte, nEquipos: number, max: number, porAnio: boolean, liston = 0): EquiposDelClub {
  const equipos: EquiposDelClub = { A: [], B: [], C: [], D: [], sobran: [] };
  const usados = new Set<string>();
  const poner = (letra: LetraDeEquipo, candidatos: readonly MiembroDeClub[]): void => {
    for (const id of llenar(candidatos.filter((c) => !usados.has(c.id)), p, max)) {
      equipos[letra].push(id);
      usados.add(id);
    }
  };
  if (porAnio) {
    const primeros = miembros.filter((m) => m.anio === 1);
    const segundos = miembros.filter((m) => m.anio === 2);
    // El A: los de segundo año y los de primer año que, con el listón, valen más que ellos (los que serían titulares).
    const paraElA = [...miembros].sort((a, b) => b.valor - (b.anio === 1 ? liston : 0) - (a.valor - (a.anio === 1 ? liston : 0)) || (a.id < b.id ? -1 : 1));
    if (nEquipos >= 1) poner('A', paraElA);
    if (nEquipos >= 2) poner('B', [...primeros].sort(porValor));
    if (nEquipos >= 3) poner('C', [...segundos].sort(porValor));
    if (nEquipos >= 4) poner('D', [...primeros].sort(porValor));
  } else {
    const todos = [...miembros].sort(porValor);
    LETRAS.slice(0, nEquipos).forEach((l) => poner(l, todos));
  }
  equipos.sobran = miembros.filter((m) => !usados.has(m.id)).map((m) => m.id);
  return equipos;
}

/**
 * Los suplentes de un equipo: los que no están entre los titulares. Los titulares son, en cada grupo de puestos, los que más valen hasta los que dice la formación (`titulares`: 1 portero, 2
 * centrales, 2 laterales, 3 mediocentros, 2 de banda y 1 delantero en el fútbol).
 */
export function suplentesDe(equipo: readonly Pick<MiembroDeClub, 'id' | 'puesto' | 'valor'>[], p: PuestosDeDeporte, titulares: Readonly<Record<string, number>>): string[] {
  const cuenta: Record<string, number> = {};
  const titular = new Set<string>();
  for (const m of [...equipo].sort(porValor)) {
    const g = grupoDePuesto(p, m.puesto);
    if (!g || (cuenta[g] ?? 0) >= (titulares[g] ?? 0)) continue;
    cuenta[g] = (cuenta[g] ?? 0) + 1;
    titular.add(m.id);
  }
  return equipo.filter((m) => !titular.has(m.id)).map((m) => m.id);
}
