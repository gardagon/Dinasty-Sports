/**
 * EL PLAYOFF DE LA ÚLTIMA DIVISIÓN (`CIUDAD_Y_LIGAS.md` §4, decisión del usuario del 09/11/2026): cuando la última división está partida en grupos, al acabar la liga juegan los 2 o los 4 primeros de cada grupo (según las jornadas
 * que falten hasta unas 18), **también los equipos que no pueden subir**. Semifinales cruzadas (el 1.º de un grupo contra el 2.º del otro) a ida y vuelta y final a partido único; con 4, además cuartos. El ganador es el campeón de la
 * división y **suben los dos finalistas**; si uno no puede subir por las reglas del filial, el ascenso pasa a los semifinalistas y después a los cuartofinalistas, por puntos en la liga, diferencia de goles y, si siguen igual, sorteo.
 * Funciones puras: quien juega los partidos (el motor) decide el resultado y aquí solo se arma el cuadro y se resuelven las eliminatorias.
 */
import { rngEstable } from '@ds/contracts';
import type { FormatoDeDivisiones } from '@ds/contracts';
import type { FilaDeTabla } from './liga';

/** Un equipo que juega el playoff, con su historial de la liga (para sembrarlo y desempatar). */
export interface Clasificado {
  id: string;
  /** El grupo del que viene (0, 1...) y su puesto en él (1 = campeón). */
  grupo: number;
  puesto: number;
  puntos: number;
  pj: number;
  dg: number;
  gf: number;
}

const ppp = (c: Pick<Clasificado, 'puntos' | 'pj'>): number => (c.pj ? c.puntos / c.pj : 0);

/** Cuántos de cada grupo juegan el playoff: 4 si la liga tiene pocas jornadas (con cuartos, semifinales y final se llega a unas 18), 2 si tiene más. */
export function plazasDePlayoff(jornadasDeLiga: number, f: FormatoDeDivisiones): 2 | 4 {
  const objetivo = f.playoff?.jornadasObjetivo ?? 18;
  const conCuatro = jornadasDeLiga + 5; // cuartos (2) + semifinales (2) + final (1)
  return conCuatro <= objetivo + 1 ? 4 : 2;
}

/** Los clasificados al playoff: los `plazas` primeros de cada grupo, con su puesto y sus números de la liga. */
export function clasificadosAlPlayoff(tablas: readonly (readonly FilaDeTabla[])[], plazas: number): Clasificado[] {
  return tablas.flatMap((t, grupo) => t.slice(0, plazas).map((f, i) => ({ id: f.id, grupo, puesto: i + 1, puntos: f.puntos, pj: f.pj, dg: f.dg, gf: f.gf })));
}

/** El orden de siembra: mejor puesto en su grupo primero y, a igualdad, más puntos por partido, diferencia de goles, goles a favor y, al final, el id. */
export const sembrar = (c: readonly Clasificado[]): Clasificado[] => [...c].sort((a, b) => a.puesto - b.puesto || ppp(b) - ppp(a) || b.dg - a.dg || b.gf - a.gf || (a.id < b.id ? -1 : 1));

export type NombreDeRonda = 'octavos' | 'cuartos' | 'semifinal' | 'final';

export interface CruceDePlayoff {
  /** El mejor sembrado (juega en casa la vuelta, y gana si se empata a todo). */
  a: string;
  b: string;
  idaYVuelta: boolean;
}

export interface RondaDePlayoff {
  nombre: NombreDeRonda;
  cruces: CruceDePlayoff[];
  /** Los que pasan sin jugar (cuando los equipos no son una potencia de dos: los mejores sembrados). */
  pasan: string[];
}

const nombreDeRonda = (equipos: number): NombreDeRonda => (equipos <= 2 ? 'final' : equipos <= 4 ? 'semifinal' : equipos <= 8 ? 'cuartos' : 'octavos');

/** Empareja al mejor sembrado con el peor de los que quedan que no sea de su grupo (si no hay, con el peor) y así hasta acabar: el 1.º de un grupo contra el 2.º del otro. */
function emparejar(semillas: readonly Clasificado[]): [Clasificado, Clasificado][] {
  const quedan = [...semillas];
  const pares: [Clasificado, Clasificado][] = [];
  while (quedan.length > 1) {
    const mejor = quedan.shift()!;
    const peores = [...quedan].reverse();
    const rival = peores.find((x) => x.grupo !== mejor.grupo) ?? peores[0];
    quedan.splice(quedan.indexOf(rival), 1);
    pares.push([mejor, rival]);
  }
  return pares;
}

/** Arma una ronda con los equipos que siguen en el playoff (ordenados por siembra): los mejores pasan sin jugar si no son una potencia de dos. */
export function rondaDePlayoff(equipos: readonly Clasificado[]): RondaDePlayoff {
  const sembrados = sembrar(equipos);
  let potencia = 1;
  while (potencia < sembrados.length) potencia *= 2;
  const libres = potencia - sembrados.length;
  const pasan = sembrados.slice(0, libres);
  const juegan = sembrados.slice(libres);
  const nombre = nombreDeRonda(potencia);
  return { nombre, pasan: pasan.map((c) => c.id), cruces: emparejar(juegan).map(([a, b]) => ({ a: a.id, b: b.id, idaYVuelta: nombre !== 'final' })) };
}

/** Quién pasa un cruce: el que más goles suma (en la ida y la vuelta) y, si empatan, el mejor sembrado (de momento no hay tanda de penaltis). `partidos` son los goles de cada partido como [goles de a, goles de b]. */
export function ganadorDelCruce(a: Clasificado, b: Clasificado, partidos: readonly (readonly [number, number])[]): Clasificado {
  const ga = partidos.reduce((t, p) => t + p[0], 0);
  const gb = partidos.reduce((t, p) => t + p[1], 0);
  if (ga !== gb) return ga > gb ? a : b;
  return sembrar([a, b])[0];
}

/** Lo que deja el playoff: el campeón, el subcampeón y quiénes cayeron en cada ronda (de la primera a las semifinales). */
export interface ResultadoDePlayoff {
  campeon: string;
  subcampeon: string;
  eliminados: { ronda: NombreDeRonda; ids: string[] }[];
}

/**
 * El orden en que suben los equipos de la última división: los dos finalistas (campeón y subcampeón) y, si alguno no puede subir, los semifinalistas que cayeron (por puntos por partido en la liga, diferencia de goles y, si siguen
 * igual, sorteo), después los cuartofinalistas, y así hacia atrás.
 */
export function ordenDeAscenso(r: ResultadoDePlayoff, clasificados: readonly Clasificado[], semilla: number): string[] {
  const por = new Map(clasificados.map((c) => [c.id, c]));
  const ordenar = (ids: readonly string[]): string[] =>
    [...ids].sort((x, y) => {
      const a = por.get(x)!;
      const b = por.get(y)!;
      return ppp(b) - ppp(a) || b.dg - a.dg || rngEstable('sorteo-de-ascenso', semilla, x).next() - rngEstable('sorteo-de-ascenso', semilla, y).next();
    });
  const rondas = [...r.eliminados].reverse(); // de las semifinales hacia atrás
  return [r.campeon, r.subcampeon, ...rondas.flatMap((e) => ordenar(e.ids))];
}
