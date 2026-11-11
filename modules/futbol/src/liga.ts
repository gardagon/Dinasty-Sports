/**
 * LA LIGA DEL MUNDO (`CIUDAD_Y_LIGAS.md` §4 y §6, F2.3b): en cada categoría de la ciudad, todos los equipos de todos los clubes juegan su liga **los sábados de clase**, esté o no el personaje: divisiones (Primera y Segunda de 10 y el
 * resto en la última, partida en grupos con playoff), calendario a doble vuelta, tabla, y al acabar la temporada los ascensos y descensos con las reglas del filial. Esta parte es el estado y su avance semana a semana, **sin saber de
 * dónde salen los partidos**: quien la llama le da una función que juega un partido (el motor, con las plantillas de verdad). Todo es JSON serializable.
 */
import {
  actualizarDivisiones,
  ascensosYDescensos,
  calendarioDobleVuelta,
  clasificadosAlPlayoff,
  ganadorDelCruce,
  ordenDeAscenso,
  plazasDePlayoff,
  repartirEnDivisiones,
  rondaDePlayoff,
  tablaDeClasificacion,
  type Clasificado,
  type Divisiones,
  type EquipoDeLiga,
  type FilaDeTabla,
  type FormatoDeDivisiones,
  type NombreDeRonda,
  type ResultadoDeLiga,
  type RondaDePlayoff,
} from '@ds/kit-deporte';

/** Un partido de la liga como lo guarda el estado: índices de los dos equipos en su grupo y los goles (local y visitante). */
export type PartidoGuardado = [number, number, number, number];

export interface GrupoDeLiga {
  /** Ids de equipo (`club|letra`). */
  equipos: string[];
  resultados: PartidoGuardado[];
}

/** El playoff de la última división, mientras se juega. */
export interface PlayoffEnCurso {
  plazas: 2 | 4;
  clasificados: Clasificado[];
  ronda: RondaDePlayoff;
  /** Los que han pasado la ronda anterior (o por sorteo de potencia) y esperan: quienes siguen vivos. */
  vivos: string[];
  /** Cuántos partidos de la ronda ya se han jugado (0 = ninguno; 1 = la ida de las rondas a doble partido). */
  partido: 0 | 1;
  /** Goles de cada cruce de la ronda (por `a|b`): un [goles de a, goles de b] por partido jugado. */
  goles: Record<string, [number, number][]>;
  eliminados: { ronda: NombreDeRonda; ids: string[] }[];
  /** Las rondas ya jugadas, con cada cruce (goles de cada partido y, si hubo empate, la tanda de penaltis): para el historial de la temporada. */
  rondas: RondaArchivada[];
  campeon?: string;
  subcampeon?: string;
}

/** Una ronda del playoff ya jugada. */
export interface RondaArchivada {
  ronda: NombreDeRonda;
  /** Cada cruce: los dos equipos (`a`, el mejor sembrado), los goles de `a` y de `b` en cada partido, la tanda de penaltis si hubo empate global (goles de `a` y de `b`) y quién pasó. */
  cruces: { a: string; b: string; partidos: [number, number][]; tanda?: [number, number]; pasa: string }[];
  /** Los que pasaron la ronda sin jugarla. */
  pasan: string[];
}

/** Un grupo de una división ya cerrada: sus equipos, la clasificación final y los resultados, en formato compacto. */
export interface GrupoArchivado {
  equipos: string[];
  /** La clasificación final, de primero a último: [índice del equipo en `equipos`, partidos, ganados, empatados, perdidos, goles a favor, goles en contra] (los puntos son 3 × ganados + empatados). */
  tabla: number[][];
  /** Cada partido de la liga, en el orden jugado: [índice del local, índice del visitante, goles del local, goles del visitante]. */
  partidos: PartidoGuardado[];
}

export interface DivisionArchivada {
  grupos: GrupoArchivado[];
  playoff?: { plazas: number; clasificados: { id: string; grupo: number; puesto: number }[]; rondas: RondaArchivada[]; campeon: string; subcampeon: string };
}

export interface CategoriaArchivada {
  divisiones: DivisionArchivada[];
  /** Los ascensos y descensos: [equipo, división en que jugó (1 = Primera), división en que juega la temporada siguiente], solo de los que cambian. */
  cambios: [string, number, number][];
}

/** Una temporada cerrada, entera: por categoría y división, las clasificaciones, el playoff, los ascensos y descensos y el resultado de cada partido. Las estadísticas por jugador van con la F2.4. */
export interface TemporadaArchivada {
  curso: number;
  categorias: Record<string, CategoriaArchivada>;
}

export interface DivisionDeLiga {
  grupos: GrupoDeLiga[];
  playoff?: PlayoffEnCurso;
}

export interface LigaDeCategoria {
  divisiones: DivisionDeLiga[];
  /** Jornadas de liga ya jugadas (las mismas en toda la categoría: un sábado, una jornada). */
  jornada: number;
}

/** La liga de una temporada y lo que queda del anterior: las divisiones de la siguiente (tras los ascensos y descensos) y quién ganó cada división. */
export interface LigaDelMundo {
  /** El curso (año escolar) de esta liga. */
  curso: number;
  /** La semilla del azar de la liga (se saca una vez al crearla): con ella todos los partidos de la partida son siempre los mismos. */
  semilla: number;
  categorias: Record<string, LigaDeCategoria>;
  /** ¿Ha acabado la temporada (todas las divisiones de todas las categorías, con su playoff) y se han hecho ya los ascensos y descensos? */
  cerrada?: boolean;
  /** Las divisiones de la próxima temporada (ids de equipo), cuando esta se cierra. */
  siguiente?: Record<string, Divisiones>;
  /** Los campeones de las temporadas anteriores: curso, categoría y el campeón de cada división (la última, el del playoff). */
  campeones: { curso: number; categoria: string; divisiones: string[] }[];
  /** El historial de las temporadas ya cerradas, completo (decisión del usuario, 10/11: se guarda todo lo que el mundo necesita; si pesa, se guarda mejor, no menos). */
  historial?: TemporadaArchivada[];
}

/** Lo que devuelve jugar un partido: el marcador y a quiénes les cambia el estado. */
export interface PartidoJugado {
  goles: [number, number];
  /** Quienes jugaron, de los dos equipos, con su valoración (−1 a +1) para el estado tras el partido. */
  jugadores: { npcId: string; minutos: number; valoracion: number }[];
}
/**
 * Juega un partido de una categoría: `id` es un texto único (curso, categoría, jornada y equipos) para que el azar sea siempre el mismo. Con `tanda`, juega la tanda de penaltis de un cruce empatado del playoff (devuelve quién la
 * gana: 0 = el primer equipo, 1 = el segundo, y los goles de cada uno); sin ella, el mejor sembrado.
 */
export type JugarPartido = ((categoria: string, local: string, visitante: string, id: string) => PartidoJugado) & {
  tanda?: (categoria: string, a: string, b: string, id: string) => { ganador: 0 | 1; goles: [number, number] };
};

const clubDe = (id: string): string => id.split('|')[0];
const tablaDelGrupo = (g: GrupoDeLiga): FilaDeTabla[] =>
  tablaDeClasificacion(g.equipos, g.resultados.map(([l, v, gl, gv]): ResultadoDeLiga => ({ local: g.equipos[l], visitante: g.equipos[v], golesLocal: gl, golesVisitante: gv })));
const jornadasDelGrupo = (g: GrupoDeLiga): number => calendarioDobleVuelta(g.equipos).length;
const jornadasDeLaDivision = (d: DivisionDeLiga): number => Math.max(0, ...d.grupos.map(jornadasDelGrupo));

/** Las tablas de cada grupo de una división (la clasificación de cada uno, de primero a último). */
export const tablasDeLaDivision = (d: DivisionDeLiga): FilaDeTabla[][] => d.grupos.map(tablaDelGrupo);

const comoDivisiones = (liga: LigaDeCategoria): Divisiones => liga.divisiones.map((d) => ({ grupos: d.grupos.map((g) => g.equipos) }));
const aDivisionesDeLiga = (ds: Divisiones): DivisionDeLiga[] => ds.map((d) => ({ grupos: d.grupos.map((equipos) => ({ equipos, resultados: [] })) }));

/** ¿Tiene la división un playoff? La última, cuando está partida en grupos. */
const conPlayoff = (liga: LigaDeCategoria, i: number): boolean => i === liga.divisiones.length - 1 && liga.divisiones[i].grupos.length > 1;

/** ¿Ha acabado la división (su liga y, si tiene, su playoff)? */
const divisionAcabada = (liga: LigaDeCategoria, i: number): boolean => {
  const d = liga.divisiones[i];
  if (liga.jornada < jornadasDeLaDivision(d)) return false;
  return conPlayoff(liga, i) ? d.playoff?.campeon !== undefined : true;
};

export const categoriaAcabada = (liga: LigaDeCategoria): boolean => liga.divisiones.every((_, i) => divisionAcabada(liga, i));

/**
 * Una liga nueva para el curso: los equipos de cada categoría repartidos en divisiones. Si hay divisiones de la temporada anterior (`previas`, tras los ascensos y descensos), se parte de ellas (los equipos que han desaparecido
 * salen y los nuevos empiezan en la última); si no (al crear la partida), por lo que vale cada equipo.
 */
export function nuevaLiga(curso: number, semilla: number, equipos: Record<string, readonly EquipoDeLiga[]>, f: FormatoDeDivisiones, previas?: Record<string, Divisiones>, campeones: LigaDelMundo['campeones'] = [], historial?: TemporadaArchivada[]): LigaDelMundo {
  const categorias: Record<string, LigaDeCategoria> = {};
  for (const [cat, es] of Object.entries(equipos)) {
    if (es.length < 4) continue;
    const divisiones = previas?.[cat] ? actualizarDivisiones(previas[cat], es, f) : repartirEnDivisiones(es, f);
    categorias[cat] = { divisiones: aDivisionesDeLiga(divisiones), jornada: 0 };
  }
  return { curso, semilla, categorias, campeones, ...(historial ? { historial } : {}) };
}

// ---------------------------------------------------------------------------------------------------- una semana de liga

/** Cuántos partidos tiene cada cruce de una ronda: ida y vuelta, o uno (la final). */
const partidosDeLaRonda = (r: RondaDePlayoff): number => (r.cruces[0]?.idaYVuelta ? 2 : 1);

/**
 * Juega un sábado de una categoría: la jornada siguiente de cada grupo que aún no ha acabado su liga y, en la última división (cuando ha acabado su liga), el siguiente partido del playoff. Devuelve la liga nueva y los
 * jugadores que han jugado. No cambia la que recibe.
 */
export function jugarSabadoDeUnaCategoria(categoria: string, liga: LigaDeCategoria, curso: number, f: FormatoDeDivisiones, jugar: JugarPartido, semilla: number): { liga: LigaDeCategoria; jugadores: PartidoJugado['jugadores'] } {
  const nueva: LigaDeCategoria = structuredClone(liga);
  const jugadores: PartidoJugado['jugadores'] = [];
  const maxJornadas = Math.max(...nueva.divisiones.map(jornadasDeLaDivision));
  let jugoLiga = false;
  nueva.divisiones.forEach((d, i) => {
    if (nueva.jornada < jornadasDeLaDivision(d)) {
      for (const g of d.grupos) {
        const cal = calendarioDobleVuelta(g.equipos)[nueva.jornada];
        if (!cal) continue;
        for (const p of cal) {
          const r = jugar(categoria, p.local, p.visitante, `${curso}|${categoria}|J${nueva.jornada + 1}|${p.local}|${p.visitante}`);
          g.resultados.push([g.equipos.indexOf(p.local), g.equipos.indexOf(p.visitante), r.goles[0], r.goles[1]]);
          jugadores.push(...r.jugadores);
        }
      }
      jugoLiga = true;
    } else if (conPlayoff(nueva, i) && d.playoff?.campeon === undefined) {
      jugadores.push(...avanzarPlayoff(categoria, d, curso, f, jugar, nueva.jornada, semilla));
    }
  });
  if (jugoLiga && nueva.jornada < maxJornadas) nueva.jornada++;
  return { liga: nueva, jugadores };
}

/** El playoff de la última división, armado con los clasificados de sus grupos (cuando acaba la liga). */
function armarElPlayoff(d: DivisionDeLiga, f: FormatoDeDivisiones): PlayoffEnCurso {
  const plazas = plazasDePlayoff(jornadasDeLaDivision(d), f);
  const clasificados = clasificadosAlPlayoff(tablasDeLaDivision(d), plazas);
  return { plazas, clasificados, ronda: rondaDePlayoff(clasificados), vivos: clasificados.map((c) => c.id), partido: 0, goles: {}, eliminados: [], rondas: [] };
}

/** Un partido de la semana: lo que sigue al curso y la categoría en su id (`J5|local|visitante` o `PO-semifinal-1|local|visitante`: el id que usa el partido al jugarse) y los dos equipos. */
export interface PartidoDeLaSemana {
  ref: string;
  local: string;
  visitante: string;
}

/**
 * Los partidos que se juegan este sábado en una categoría, **antes de jugarlos**: la jornada siguiente de cada grupo que aún no ha acabado su liga y, en la última división (cuando ha acabado su liga), el siguiente partido del
 * playoff. Es lo mismo que juega `jugarSabadoDeUnaCategoria`, con los mismos ids: con ello se reparten en horas y campos (`repartirLosPartidos`) y el personaje sabe cuándo y dónde juega.
 */
export function partidosDeLaSemana(liga: LigaDeCategoria, f: FormatoDeDivisiones): PartidoDeLaSemana[] {
  const res: PartidoDeLaSemana[] = [];
  liga.divisiones.forEach((d, i) => {
    if (liga.jornada < jornadasDeLaDivision(d)) {
      for (const g of d.grupos) for (const p of calendarioDobleVuelta(g.equipos)[liga.jornada] ?? []) res.push({ ref: `J${liga.jornada + 1}|${p.local}|${p.visitante}`, local: p.local, visitante: p.visitante });
    } else if (conPlayoff(liga, i) && d.playoff?.campeon === undefined) {
      const po = d.playoff ?? armarElPlayoff(d, f);
      const dos = partidosDeLaRonda(po.ronda) === 2;
      for (const c of po.ronda.cruces) {
        const [local, visitante] = dos && po.partido === 0 ? [c.b, c.a] : [c.a, c.b];
        res.push({ ref: `PO-${po.ronda.nombre}-${po.partido + 1}|${local}|${visitante}`, local, visitante });
      }
    }
  });
  return res;
}

/** Un paso del playoff: se arma si hace falta y se juega el siguiente partido de la ronda; al acabar la ronda pasan los ganadores. */
function avanzarPlayoff(categoria: string, d: DivisionDeLiga, curso: number, f: FormatoDeDivisiones, jugar: JugarPartido, jornada: number, _semilla: number): PartidoJugado['jugadores'] {
  const jugadores: PartidoJugado['jugadores'] = [];
  if (!d.playoff) d.playoff = armarElPlayoff(d, f);
  const p = d.playoff;
  const total = partidosDeLaRonda(p.ronda);
  for (const c of p.ronda.cruces) {
    // La ida es en el campo del peor sembrado (b) y la vuelta, y la final, en el del mejor (a).
    const [local, visitante] = total === 2 && p.partido === 0 ? [c.b, c.a] : [c.a, c.b];
    const r = jugar(categoria, local, visitante, `${curso}|${categoria}|PO-${p.ronda.nombre}-${p.partido + 1}|${local}|${visitante}`);
    const clave = `${c.a}|${c.b}`;
    p.goles[clave] = [...(p.goles[clave] ?? []), local === c.a ? [r.goles[0], r.goles[1]] : [r.goles[1], r.goles[0]]];
    jugadores.push(...r.jugadores);
  }
  if (total === 2 && p.partido === 0) {
    p.partido = 1;
    return jugadores;
  }
  // La ronda ha acabado: pasan los ganadores de cada cruce (más los que pasaron sin jugar) y caen los demás.
  const por = new Map(p.clasificados.map((c) => [c.id, c]));
  // Un cruce empatado (en el global de la ida y la vuelta, o la final) se decide por la tanda de penaltis; sin ella, por el mejor sembrado.
  const tandas: Record<string, [number, number]> = {};
  const ganadores = p.ronda.cruces.map((c) =>
    ganadorDelCruce(por.get(c.a)!, por.get(c.b)!, p.goles[`${c.a}|${c.b}`], jugar.tanda ? () => {
      const t = jugar.tanda!(categoria, c.a, c.b, `${curso}|${categoria}|PO-${p.ronda.nombre}-tanda|${c.a}|${c.b}`);
      tandas[`${c.a}|${c.b}`] = t.goles;
      return t.ganador === 0 ? 'a' : 'b';
    } : undefined),
  );
  const perdedores = p.ronda.cruces.map((c, i) => (ganadores[i].id === c.a ? c.b : c.a));
  p.rondas.push({ ronda: p.ronda.nombre, pasan: [...p.ronda.pasan], cruces: p.ronda.cruces.map((c, i) => ({ a: c.a, b: c.b, partidos: p.goles[`${c.a}|${c.b}`], ...(tandas[`${c.a}|${c.b}`] ? { tanda: tandas[`${c.a}|${c.b}`] } : {}), pasa: ganadores[i].id })) });
  if (p.ronda.nombre === 'final') {
    p.campeon = ganadores[0].id;
    p.subcampeon = perdedores[0];
    return jugadores;
  }
  p.eliminados.push({ ronda: p.ronda.nombre, ids: perdedores });
  p.vivos = [...p.ronda.pasan, ...ganadores.map((g) => g.id)];
  p.ronda = rondaDePlayoff(p.vivos.map((id) => por.get(id)!));
  p.partido = 0;
  p.goles = {};
  void jornada;
  return jugadores;
}

// ---------------------------------------------------------------------------------------------------- el final de la temporada

/**
 * Cierra la temporada: los ascensos y descensos de cada categoría (con el playoff de la última división, si lo hubo, para decidir quién sube) y los campeones de cada división. Lo que no haya acabado (una temporada cortada)
 * se decide por la clasificación. Devuelve la liga cerrada, con las divisiones de la siguiente temporada.
 */
export function cerrarTemporada(liga: LigaDelMundo, f: FormatoDeDivisiones, semilla: number): LigaDelMundo {
  const siguiente: Record<string, Divisiones> = {};
  const campeones: LigaDelMundo['campeones'] = [...liga.campeones];
  for (const [cat, l] of Object.entries(liga.categorias)) {
    const tablas = l.divisiones.map(tablasDeLaDivision);
    const ultima = l.divisiones[l.divisiones.length - 1];
    const po = ultima.grupos.length > 1 ? ultima.playoff : undefined;
    const orden = po?.campeon && po.subcampeon ? ordenDeAscenso({ campeon: po.campeon, subcampeon: po.subcampeon, eliminados: po.eliminados }, po.clasificados, semilla) : undefined;
    siguiente[cat] = ascensosYDescensos(comoDivisiones(l), tablas, clubDe, f, orden);
    campeones.push({ curso: liga.curso, categoria: cat, divisiones: l.divisiones.map((d, i) => (i === l.divisiones.length - 1 && po?.campeon ? po.campeon : tablasDeLaDivision(d)[0]?.[0]?.id ?? '')) });
  }
  return { ...liga, cerrada: true, siguiente, campeones, historial: [...(liga.historial ?? []), archivarTemporada(liga, siguiente)] };
}

/**
 * La temporada que se cierra, entera y en formato compacto (`TemporadaArchivada`): por categoría y división, la clasificación final de cada grupo, el playoff, los ascensos y descensos (los equipos que cambian de división) y el
 * resultado de cada partido. Pesa unos 30 KB por temporada con la ciudad grande y no se tira nunca: es el historial de la ciudad.
 */
export function archivarTemporada(liga: LigaDelMundo, siguiente: Record<string, Divisiones>): TemporadaArchivada {
  const categorias: Record<string, CategoriaArchivada> = {};
  for (const [cat, l] of Object.entries(liga.categorias)) {
    const divisiones: DivisionArchivada[] = l.divisiones.map((d) => {
      const grupos = d.grupos.map((g): GrupoArchivado => ({
        equipos: g.equipos,
        tabla: tablaDelGrupo(g).map((f) => [g.equipos.indexOf(f.id), f.pj, f.g, f.e, f.p, f.gf, f.gc]),
        partidos: g.resultados,
      }));
      const po = d.grupos.length > 1 ? d.playoff : undefined;
      return { grupos, ...(po?.campeon && po.subcampeon ? { playoff: { plazas: po.plazas, clasificados: po.clasificados.map((c) => ({ id: c.id, grupo: c.grupo, puesto: c.puesto })), rondas: po.rondas, campeon: po.campeon, subcampeon: po.subcampeon } } : {}) };
    });
    const antes = new Map(l.divisiones.flatMap((d, i) => d.grupos.flatMap((g) => g.equipos.map((id): [string, number] => [id, i + 1]))));
    const cambios: [string, number, number][] = (siguiente[cat] ?? []).flatMap((d, i) => d.grupos.flat().flatMap((id): [string, number, number][] => (antes.has(id) && antes.get(id) !== i + 1 ? [[id, antes.get(id)!, i + 1]] : [])));
    categorias[cat] = { divisiones, cambios };
  }
  return { curso: liga.curso, categorias };
}
