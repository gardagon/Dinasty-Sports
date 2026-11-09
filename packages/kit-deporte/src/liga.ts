import type { FormatoDeDivisiones } from '@ds/contracts';

/**
 * LA LIGA POR DIVISIONES (`CIUDAD_Y_LIGAS.md` §4, decisión del usuario del 09/11/2026): en cada categoría hay Primera y Segunda de 10 equipos y una última división con el resto, en grupos de 8 a 12; liga a doble vuelta; suben 2 y bajan 2;
 * la plaza es del equipo del club (su letra); y las reglas del filial valen para todos los equipos A–D de un club. Es lógica de cualquier deporte de equipo, sin ninguna referencia al fútbol: funciones puras sobre ids de equipo.
 *
 * Las reglas del filial: dos equipos de un mismo club no están en la misma división salvo en la última (y allí, en grupos distintos si los hay); un equipo no sube a la división de otro de su club (sube el siguiente); y si un equipo baja a la
 * división de otro de su club que está por debajo, ese baja una más.
 */

export type { FormatoDeDivisiones };

/** Un equipo que juega la liga: su id (único) y el club al que pertenece, y lo que vale (para repartirlos al crear la partida). */
export interface EquipoDeLiga {
  id: string;
  club: string;
  fuerza?: number;
}

/** Una división: sus grupos (ids de equipo). Las fijas tienen un solo grupo; la última puede tener varios. */
export interface Division {
  grupos: string[][];
}
/** Las divisiones de una categoría, de la primera (la mejor) a la última. */
export type Divisiones = Division[];

const porFuerza = (a: EquipoDeLiga, b: EquipoDeLiga): number => (b.fuerza ?? 0) - (a.fuerza ?? 0) || (a.id < b.id ? -1 : 1);

/** Cuántos grupos tiene una división de `m` equipos: los mínimos para que ninguno pase del máximo, sin que ninguno quede por debajo del mínimo si se puede evitar (si no, uno solo). */
export function gruposDe(m: number, f: FormatoDeDivisiones): number {
  let k = Math.max(1, Math.ceil(m / f.grupo.max));
  while (k > 1 && Math.floor(m / k) < f.grupo.min) k--;
  return k;
}

/**
 * Reparte a los equipos de `ids` (en el orden que se dé, el mejor primero) en `k` grupos equilibrados, de modo que los de un mismo club caigan en grupos distintos siempre que se pueda: cada equipo va al grupo con menos equipos (en
 * un empate, el primero) que aún no tenga uno de su club.
 */
export function repartirEnGrupos(ids: readonly string[], club: (id: string) => string, k: number): string[][] {
  const grupos: string[][] = Array.from({ length: k }, () => []);
  const tope = Math.ceil(ids.length / k);
  for (const id of ids) {
    const abiertos = grupos.filter((g) => g.length < tope);
    const sinClub = abiertos.filter((g) => !g.some((x) => club(x) === club(id)));
    const elegidos = sinClub.length ? sinClub : abiertos;
    const menor = Math.min(...elegidos.map((g) => g.length));
    elegidos.find((g) => g.length === menor)!.push(id);
  }
  return grupos;
}

/** Cuántos equipos tiene cada división para `n` equipos: Primera y Segunda de `tamano` y el resto en la última (si quedan menos del mínimo de un grupo, se juntan con la de arriba). */
export function tamanosDeDivisiones(n: number, f: FormatoDeDivisiones): number[] {
  const tamanos: number[] = [];
  let resto = n;
  for (let i = 0; i < f.fijas && resto > 0; i++) {
    const t = Math.min(f.tamano, resto);
    tamanos.push(t);
    resto -= t;
  }
  if (resto > 0) {
    if (resto < f.grupo.min) tamanos[tamanos.length - 1] += resto;
    else tamanos.push(resto);
  }
  return tamanos;
}

/**
 * **Al crear la partida las divisiones se reparten por lo que vale cada equipo** (decisión del usuario, 09/11/2026): los mejores en Primera, los siguientes en Segunda y el resto en la última, **sin que dos equipos de un mismo club
 * coincidan en una división que no sea la última** (el mejor se queda con el sitio y el otro baja a la siguiente) y, en la última, en grupos distintos si los hay.
 */
export function repartirEnDivisiones(equipos: readonly EquipoDeLiga[], f: FormatoDeDivisiones): Divisiones {
  const orden = [...equipos].sort(porFuerza);
  const club = new Map(orden.map((e) => [e.id, e.club]));
  const tamanos = tamanosDeDivisiones(orden.length, f);
  const divisiones: Divisiones = [];
  let quedan = orden;
  tamanos.forEach((t, i) => {
    const ultima = i === tamanos.length - 1;
    if (ultima) {
      divisiones.push({ grupos: repartirEnGrupos(quedan.map((e) => e.id), (id) => club.get(id)!, gruposDe(quedan.length, f)) });
      return;
    }
    const dentro: EquipoDeLiga[] = [];
    for (const e of quedan) if (dentro.length < t && !dentro.some((x) => x.club === e.club)) dentro.push(e);
    // Si no hay bastantes clubes distintos, la división se queda más pequeña (los que sobran bajan): la regla del filial manda sobre el tamaño.
    divisiones.push({ grupos: [dentro.map((e) => e.id)] });
    quedan = quedan.filter((e) => !dentro.includes(e));
  });
  return divisiones.filter((d) => d.grupos.some((g) => g.length));
}

// ---------------------------------------------------------------------------------------------------- calendario y tabla

export interface PartidoDeJornada {
  local: string;
  visitante: string;
}

/**
 * El calendario de un grupo a doble vuelta (método del círculo): cada jornada juega todo el mundo una vez (con un número impar, uno descansa); en la segunda vuelta se invierten los campos. Un grupo de 10 tiene 18 jornadas.
 * Las jornadas son para los sábados consecutivos desde el principio de la liga.
 */
export function calendarioDobleVuelta(ids: readonly string[]): PartidoDeJornada[][] {
  const equipos: (string | null)[] = [...ids];
  if (equipos.length % 2 === 1) equipos.push(null);
  const n = equipos.length;
  if (n < 2) return [];
  const ida: PartidoDeJornada[][] = [];
  const rueda = [...equipos];
  // El campo se elige para que nadie juegue muchas veces seguidas en casa o fuera: cada equipo prefiere alternar.
  const racha = new Map<string, { campo: 'L' | 'V'; veces: number }>();
  const penaliza = (id: string, campo: 'L' | 'V'): number => {
    const r = racha.get(id);
    return r && r.campo === campo ? (r.veces + 1) ** 2 : 0;
  };
  const anota = (id: string, campo: 'L' | 'V'): void => {
    const r = racha.get(id);
    racha.set(id, r && r.campo === campo ? { campo, veces: r.veces + 1 } : { campo, veces: 1 });
  };
  for (let j = 0; j < n - 1; j++) {
    const partidos: PartidoDeJornada[] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = rueda[i];
      const b = rueda[n - 1 - i];
      if (a === null || b === null) continue;
      const aEnCasa = penaliza(a, 'L') + penaliza(b, 'V');
      const bEnCasa = penaliza(b, 'L') + penaliza(a, 'V');
      const p: PartidoDeJornada = aEnCasa < bEnCasa || (aEnCasa === bEnCasa && (i + j) % 2 === 0) ? { local: a, visitante: b } : { local: b, visitante: a };
      anota(p.local, 'L');
      anota(p.visitante, 'V');
      partidos.push(p);
    }
    ida.push(partidos);
    rueda.splice(1, 0, rueda.pop()!); // el primero se queda fijo y los demás giran
  }
  return [...ida, ...ida.map((p) => p.map((x) => ({ local: x.visitante, visitante: x.local })))];
}

export interface ResultadoDeLiga {
  local: string;
  visitante: string;
  golesLocal: number;
  golesVisitante: number;
}

export interface FilaDeTabla {
  id: string;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
  dg: number;
  puntos: number;
}

/** La clasificación de un grupo (3 puntos por victoria y 1 por empate): por puntos, diferencia de goles, goles a favor y, al final, el id. */
export function tablaDeClasificacion(ids: readonly string[], resultados: readonly ResultadoDeLiga[]): FilaDeTabla[] {
  const filas = new Map(ids.map((id): [string, FilaDeTabla] => [id, { id, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, puntos: 0 }]));
  for (const r of resultados) {
    const a = filas.get(r.local);
    const b = filas.get(r.visitante);
    if (!a || !b) continue;
    for (const [x, gf, gc] of [[a, r.golesLocal, r.golesVisitante], [b, r.golesVisitante, r.golesLocal]] as const) {
      x.pj++;
      x.gf += gf;
      x.gc += gc;
      x.dg = x.gf - x.gc;
      if (gf > gc) { x.g++; x.puntos += 3; } else if (gf === gc) { x.e++; x.puntos++; } else x.p++;
    }
  }
  return [...filas.values()].sort((a, b) => b.puntos - a.puntos || b.dg - a.dg || b.gf - a.gf || (a.id < b.id ? -1 : 1));
}

// ---------------------------------------------------------------------------------------------------- ascensos y descensos

/**
 * Los candidatos a subir de una división inferior, por orden: con un solo grupo, la clasificación; con varios (la última), los campeones (de mejor a peor por puntos por partido) y, si hacen falta más, los mejores segundos, y así.
 */
function candidatosAAscender(tablas: readonly FilaDeTabla[][]): FilaDeTabla[] {
  if (tablas.length === 1) return tablas[0];
  const ppp = (f: FilaDeTabla): number => (f.pj ? f.puntos / f.pj : 0);
  const profundidad = Math.max(...tablas.map((t) => t.length));
  const res: FilaDeTabla[] = [];
  for (let puesto = 0; puesto < profundidad; puesto++) {
    res.push(...tablas.map((t) => t[puesto]).filter((f): f is FilaDeTabla => !!f).sort((a, b) => ppp(b) - ppp(a) || b.dg - a.dg || b.gf - a.gf || (a.id < b.id ? -1 : 1)));
  }
  return res;
}

/**
 * Los ascensos y descensos de final de temporada (`tablas[división][grupo]`: la clasificación final de cada grupo). Entre cada par de divisiones bajan los `bajan` últimos de la de arriba y suben los `suben` mejores de la de abajo,
 * con las reglas del filial: un equipo no sube a una división en la que se queda otro de su club (sube el siguiente de su clasificación), y si un equipo baja a la división de otro de su club, ese baja una más (y entonces sube uno más de
 * la división de abajo para mantener los tamaños). La última división no tiene descensos y sus grupos se vuelven a repartir (los de un mismo club, en grupos distintos).
 */
export function ascensosYDescensos(divisiones: Divisiones, tablas: readonly (readonly FilaDeTabla[])[][], club: (id: string) => string, f: FormatoDeDivisiones): Divisiones {
  const L = divisiones.length;
  // La clasificación de cada división como una lista, de mejor a peor (en la última, con varios grupos, por rondas de puestos).
  const orden: string[][] = divisiones.map((_, i) => (i === L - 1 ? candidatosAAscender(tablas[i].map((t) => [...t])) : tablas[i][0]).map((x) => x.id));
  const resultado: string[][] = divisiones.map(() => []);
  /** Cuántos ha hecho bajar una más la regla del filial al pasar de una división a la siguiente: la de abajo pierde esos y sube uno más de la que tiene debajo. */
  const empujadosAqui: number[] = divisiones.map(() => 0);
  /** Los que llegan a cada división desde arriba: los que bajan y los que baja una más la regla del filial. */
  const llegan: string[][] = divisiones.map(() => []);
  let pool = [...orden[0]];
  for (let i = 0; i < L; i++) {
    if (i === L - 1) {
      resultado[i] = [...pool, ...llegan[i]];
      break;
    }
    const bajan = pool.slice(-f.bajan);
    const propios = pool.filter((id) => !bajan.includes(id));
    // Suben los primeros de la división de abajo (de su clasificación) que no coincidan con un equipo de su club en ésta: los que se quedan, los que bajan hasta aquí desde arriba y los que suben con ellos.
    const abajo = [...orden[i + 1]];
    const suben: string[] = [];
    const hace = f.suben + (i > 0 ? (empujadosAqui[i] ?? 0) : 0);
    for (const id of abajo) if (suben.length < hace && ![...propios, ...llegan[i], ...suben].some((x) => club(x) === club(id))) suben.push(id);
    for (const id of abajo) if (suben.length < hace && !suben.includes(id)) suben.push(id);
    resultado[i] = [...propios, ...llegan[i], ...suben];
    // Los que bajan van a la división de abajo; el que se quede allí con un equipo de su club entre los que bajan, baja una más (salvo que la de abajo sea la última: allí pueden coincidir).
    const restoAbajo = abajo.filter((id) => !suben.includes(id));
    const empuja = i + 1 < L - 1 ? restoAbajo.filter((id) => bajan.some((b) => club(b) === club(id))) : [];
    empujadosAqui[i + 1] = empuja.length;
    if (empuja.length) llegan[i + 2].push(...empuja);
    llegan[i + 1].push(...bajan);
    pool = abajo.filter((id) => !suben.includes(id) && !empuja.includes(id));
  }
  return resultado.map((ids, i) => ({ grupos: i === L - 1 ? repartirEnGrupos(ids, club, gruposDe(ids.length, f)) : [ids] })).filter((d) => d.grupos.some((g) => g.length));
}

/**
 * Las divisiones de una temporada nueva a partir de las anteriores, con los equipos que hay ahora: los que han desaparecido salen y los nuevos empiezan en la última división (con los grupos repartidos otra vez). Si ya no hay equipos
 * para tantas divisiones, se rehacen con lo que hay por lo que valían (la última recoge a los que sobran).
 */
export function actualizarDivisiones(previas: Divisiones, actuales: readonly EquipoDeLiga[], f: FormatoDeDivisiones): Divisiones {
  const hay = new Map(actuales.map((e) => [e.id, e]));
  const club = (id: string): string => hay.get(id)!.club;
  const tamanos = tamanosDeDivisiones(actuales.length, f);
  const conservados = previas.map((d) => d.grupos.map((g) => g.filter((id) => hay.has(id))).flat());
  const colocados = new Set(conservados.flat());
  const nuevos = actuales.filter((e) => !colocados.has(e.id)).sort(porFuerza).map((e) => e.id);
  if (tamanos.length !== previas.length || conservados.some((c, i) => i < tamanos.length - 1 && c.length > tamanos[i])) {
    // Cambia el número de divisiones o una de las fijas se ha quedado grande: se reparte de nuevo por el orden de lo que había (las divisiones anteriores, de arriba abajo, y los nuevos al final).
    const orden = [...conservados.flat(), ...nuevos].map((id) => hay.get(id)!);
    return repartirEnDivisiones(orden.map((e, i) => ({ ...e, fuerza: orden.length - i })), f);
  }
  const ultima = previas.length - 1;
  return previas.map((_, i) => {
    const ids = i === ultima ? [...conservados[i], ...nuevos] : conservados[i];
    return { grupos: i === ultima ? repartirEnGrupos(ids, club, gruposDe(ids.length, f)) : [ids] };
  }).filter((d) => d.grupos.some((g) => g.length));
}
