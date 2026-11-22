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

/**
 * Llena un equipo de `max` jugadores recorriendo `candidatos` en orden: entra el siguiente de cada grupo de puestos mientras haya cupo en él. Con `ya`, jugadores que ya están en el equipo (cuentan en sus grupos y en el
 * total, que no pasa de `max`).
 */
function llenar(candidatos: readonly MiembroDeClub[], p: PuestosDeDeporte, max: number, ya: readonly MiembroDeClub[] = []): string[] {
  const cupos = cuposPorGrupo(p, max);
  const cuenta: Record<string, number> = {};
  for (const y of ya) {
    const g = grupoDePuesto(p, y.puesto);
    if (g) cuenta[g] = (cuenta[g] ?? 0) + 1;
  }
  const dentro: string[] = [];
  for (const c of candidatos) {
    const g = grupoDePuesto(p, c.puesto);
    if (!g || (cuenta[g] ?? 0) >= (cupos[g] ?? 0) || ya.length + dentro.length >= max) continue;
    cuenta[g] = (cuenta[g] ?? 0) + 1;
    dentro.push(c.id);
  }
  return dentro;
}

const porValor = (a: Pick<MiembroDeClub, 'id' | 'valor'>, b: Pick<MiembroDeClub, 'id' | 'valor'>): number => b.valor - a.valor || (a.id < b.id ? -1 : 1);

/**
 * Reparte a los miembros de un club en una categoría en sus equipos A a D, **todos los clubes por año** (decisión del usuario, 05/11/2026): A, los de segundo año y los de primer año que destacan
 * (con el `liston`); B, los de primer año; con tres equipos, el C es una mezcla de los dos años; con cuatro, el C son los de segundo año (completado con los de primer año si no llegan al mínimo)
 * y el D los de primer año. `nEquipos` es cuántos tiene abiertos (de 1 a 4), `max` los jugadores de cada uno y `minimo` los que necesita un equipo para existir: **un jugador no sube al equipo de
 * arriba si deja a su equipo con menos del mínimo ni si el de arriba está completo**. Con `segundosPrimero`, los de primer año no le quitan el sitio en el A a uno de segundo. Con `porAnio` en falso (compatibilidad), por nivel.
 */
export function repartirEnEquipos(miembros: readonly MiembroDeClub[], p: PuestosDeDeporte, nEquipos: number, max: number, porAnio: boolean, liston = 0, minimo = 14, segundosPrimero = false): EquiposDelClub {
  const equipos: EquiposDelClub = { A: [], B: [], C: [], D: [], sobran: [] };
  const usados = new Set<string>();
  const poner = (letra: LetraDeEquipo, candidatos: readonly MiembroDeClub[], hasta = Infinity): void => {
    for (const id of llenar(candidatos.filter((c) => !usados.has(c.id)), p, max)) {
      if (equipos[letra].length >= hasta) break;
      equipos[letra].push(id);
      usados.add(id);
    }
  };
  if (porAnio) {
    const primeros = miembros.filter((m) => m.anio === 1);
    const segundos = miembros.filter((m) => m.anio === 2);
    const ajustado = (m: MiembroDeClub): number => m.valor - (m.anio === 1 ? liston : 0);
    // Los de primer año que pueden subir al A: los que destacan, sin dejar al B con menos del mínimo (con un solo equipo no hay B al que dejar).
    const puedenSubir = nEquipos >= 2 ? Math.max(0, primeros.length - minimo) : primeros.length;
    const suben = [...primeros].sort((a, b) => ajustado(b) - ajustado(a) || (a.id < b.id ? -1 : 1)).slice(0, puedenSubir);
    // Con `segundosPrimero` (benjamín y alevín: `CategoriaDef.primerAnioNoDesplazaEn`), los de segundo año ocupan el A antes que nadie y los de primer año solo entran en el sitio que quede libre.
    const porAjustado = (a: MiembroDeClub, b: MiembroDeClub): number => ajustado(b) - ajustado(a) || (a.id < b.id ? -1 : 1);
    const paraElA = segundosPrimero ? [...[...segundos].sort(porAjustado), ...[...suben].sort(porAjustado)] : [...segundos, ...suben].sort(porAjustado);
    if (nEquipos >= 1 && segundosPrimero) {
      // Los de segundo año primero, por puestos y, si su grupo está lleno, en el sitio que quede (ya tenían plaza en el club); los de primer año, solo con el sitio libre que quede, respetando los puestos.
      const delSegundo = [...segundos].sort(porAjustado);
      const enSuPuesto = new Set(llenar(delSegundo, p, max));
      const sitio = delSegundo.filter((m) => !enSuPuesto.has(m.id)).slice(0, Math.max(0, max - enSuPuesto.size)).map((m) => m.id);
      const dentro = [...delSegundo.filter((m) => enSuPuesto.has(m.id)), ...delSegundo.filter((m) => sitio.includes(m.id))];
      const arriba = [...dentro.map((m) => m.id), ...llenar([...suben].sort(porAjustado), p, max, dentro)];
      for (const id of arriba) {
        equipos.A.push(id);
        usados.add(id);
      }
    } else if (nEquipos >= 1) poner('A', paraElA);
    if (nEquipos >= 2) poner('B', [...primeros].sort(porValor));
    if (nEquipos === 3) poner('C', [...miembros].sort(porValor));
    if (nEquipos >= 4) {
      poner('C', [...segundos].sort(porValor));
      if (equipos.C.length < minimo) poner('C', [...primeros].sort(porValor), minimo - equipos.C.length);
      poner('D', [...primeros].sort(porValor));
    }
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
