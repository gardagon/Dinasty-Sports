/**
 * LA CONVOCATORIA Y LA ALINEACIÓN (`MOTOR_PARTIDOS.md` §8): cada semana el entrenador convoca a 16 de la plantilla (11 titulares y 5 suplentes; con plantillas de 14 a 16, todos los disponibles) y elige los titulares y el puesto
 * de cada uno **con la formación del equipo** (1 portero, 2 centrales, 2 laterales, 3 de medio, 2 de banda y 1 delantero) y lo que vale cada jugador en cada puesto. Los lesionados no se convocan. Son funciones puras: la misma regla para el
 * personaje y para cualquier PNJ; al personaje, además, el entrenador le pesa su asistencia a los entrenamientos y su relación (`prioridadDelEntrenador`).
 *
 * También deja al jugador listo para el motor (`equipoDePartido`: su condición física es la energía con que empieza el partido y su forma y salud pesan en su rendimiento, con los mismos factores del atletismo) y devuelve lo que
 * cambia en su estado al acabar (`jugadoresDelPartido`: como tras una carrera).
 */
import { ESTADO_INICIAL, GEN, eficienciaDeEstado, factorDeCompeticion, type EstadoDeJugador, type JugadorDeEquipoView, type JugadorDelPartido, type LectorDePersona } from '@ds/contracts';
import type { EquipoDePartido, Intensidad, JugadorDePartido, ResultadoDePartido } from './partido';
import { PUESTOS_DE_FUTBOL } from './puestos';

/** Los números de la convocatoria, como datos. */
export const PARAMETROS_DE_CONVOCATORIA = {
  /** Cuántos convoca el entrenador (11 titulares y 5 suplentes). */
  convocados: 16,
  /** Lo que baja la preferencia del entrenador por quien falta a los entrenamientos de las dos últimas semanas (con asistencia 0 y un entrenador muy disciplinado). */
  penalizacionPorFaltar: 0.2,
  /** La relación con el entrenador (0 a 100) suma de −5 % a +5 % a su preferencia. */
  efectoDeLaRelacion: 0.05,
};

const GRUPOS = PUESTOS_DE_FUTBOL.reparto;
const FORMACION = PUESTOS_DE_FUTBOL.equipos!.formacion!;
const grupoDe = (puesto: string): string => GRUPOS.find((g) => g.puestos.includes(puesto))?.grupo ?? puesto;

/** Un jugador al que el entrenador puede convocar: lo que vale en cada puesto y su estado. `prioridad` (por defecto 1) es lo que pesa la preferencia del entrenador por él (la asistencia y la relación, en el personaje). */
export type JugadorParaConvocar = Pick<JugadorDeEquipoView, 'id' | 'puesto' | 'valores' | 'valor' | 'estado'> & { prioridad?: number };

export interface Convocatoria {
  /** Los titulares, con el puesto en que juegan. */
  titulares: { id: string; puesto: string }[];
  /** Los suplentes convocados (en su puesto habitual). */
  suplentes: { id: string; puesto: string }[];
  /** Los que no entran en la convocatoria (incluidos los lesionados). */
  noConvocados: string[];
}

/** Lo que vale un jugador en un puesto: lo que dice su ficha de puestos (o, si no la tiene, su valor en el suyo), por la preferencia del entrenador. */
const valeEn = (j: JugadorParaConvocar, puesto: string): number => (j.valores[puesto] ?? (j.puesto === puesto ? j.valor : 0)) * (j.prioridad ?? 1);

/** El mejor puesto de un grupo para un jugador y lo que vale en él. */
function mejorDelGrupo(j: JugadorParaConvocar, grupo: string): { puesto: string; valor: number } {
  const puestos = GRUPOS.find((g) => g.grupo === grupo)!.puestos;
  return puestos.reduce((m, p) => (valeEn(j, p) > m.valor ? { puesto: p, valor: valeEn(j, p) } : m), { puesto: puestos[0], valor: -1 });
}

/** Reparte a los jugadores de un grupo entre los puestos de su formación (lateral izquierdo y derecho, extremos...) de modo que la suma de lo que valen en ellos sea la mayor. */
function repartirEnPuestos(jugadores: readonly JugadorParaConvocar[], slots: readonly string[]): { id: string; puesto: string }[] {
  let mejor: { id: string; puesto: string }[] = [];
  let mejorSuma = -Infinity;
  const usar = (i: number, libres: readonly JugadorParaConvocar[], acc: { id: string; puesto: string }[], suma: number): void => {
    if (i === slots.length || !libres.length) {
      if (suma > mejorSuma) { mejorSuma = suma; mejor = acc; }
      return;
    }
    for (const j of libres) usar(i + 1, libres.filter((x) => x !== j), [...acc, { id: j.id, puesto: slots[i] }], suma + valeEn(j, slots[i]));
  };
  usar(0, jugadores, [], 0);
  return mejor;
}

/**
 * Convoca y alinea: los titulares son, para cada puesto de la formación, los que más valen en él (el reparto de los 11 por grupos se hace por orden de lo que valen en el grupo, sin repetir a nadie), y los suplentes, los
 * mejores de los que quedan (siempre un portero de reserva si lo hay). Con 16 o menos disponibles, se convoca a todos. Los que están de baja no se convocan.
 */
export function convocarYAlinear(jugadores: readonly JugadorParaConvocar[], convocados: number = PARAMETROS_DE_CONVOCATORIA.convocados): Convocatoria {
  const disponibles = jugadores.filter((j) => !j.estado.baja);
  const libres = new Set(disponibles.map((j) => j.id));
  const cupos: Record<string, number> = Object.fromEntries(Object.entries(FORMACION).map(([g, p]) => [g, p.length]));
  const porGrupo: Record<string, JugadorParaConvocar[]> = Object.fromEntries(Object.keys(cupos).map((g) => [g, []]));
  // Primero, en cada grupo, los que juegan en él (su puesto habitual) por lo que valen; así un equipo no se queda sin defensas porque sus delanteros sean muy buenos.
  for (const g of Object.keys(cupos)) {
    for (const j of disponibles.filter((x) => grupoDe(x.puesto) === g).sort((a, b) => mejorDelGrupo(b, g).valor - mejorDelGrupo(a, g).valor || (a.id < b.id ? -1 : 1)).slice(0, cupos[g])) {
      porGrupo[g].push(j);
      libres.delete(j.id);
    }
  }
  // Los grupos a los que les falta gente (por lesiones o porque el equipo no tiene bastantes de ese puesto) los cubre el que mejor se adapte de los demás, por lo que vale en el grupo.
  const pares = disponibles.flatMap((j) => Object.keys(cupos).map((g) => ({ j, g, v: mejorDelGrupo(j, g).valor }))).sort((a, b) => b.v - a.v || (a.j.id < b.j.id ? -1 : 1));
  for (const p of pares) {
    if (!libres.has(p.j.id) || porGrupo[p.g].length >= cupos[p.g]) continue;
    libres.delete(p.j.id);
    porGrupo[p.g].push(p.j);
  }
  const titulares = Object.entries(porGrupo).flatMap(([g, js]) => repartirEnPuestos(js, FORMACION[g]));
  // Los suplentes: un portero de reserva si lo hay y después los mejores por lo que valen en su puesto.
  const resto = disponibles.filter((j) => libres.has(j.id)).sort((a, b) => valeEn(b, b.puesto) - valeEn(a, a.puesto) || (a.id < b.id ? -1 : 1));
  const plazas = Math.max(0, convocados - titulares.length);
  const portero = resto.find((j) => grupoDe(j.puesto) === 'portero');
  const suplentes = [...(portero ? [portero] : []), ...resto.filter((j) => j !== portero)].slice(0, plazas);
  const dentro = new Set([...titulares.map((t) => t.id), ...suplentes.map((s) => s.id)]);
  return { titulares, suplentes: suplentes.map((j) => ({ id: j.id, puesto: j.puesto })), noConvocados: jugadores.filter((j) => !dentro.has(j.id)).map((j) => j.id) };
}

/**
 * Lo que pesa la preferencia del entrenador por un jugador (de ×0,75 a ×1,05): su asistencia a los entrenamientos de las dos últimas semanas (de 0 a 1) cuenta **para todos**, personaje y PNJ: quien falta pierde el puesto, y más
 * con un entrenador disciplinado (de 0 a 1). La relación con el entrenador (de −5 % a +5 %) solo la tiene guardada el personaje: sin ella (PNJ) no cuenta.
 */
export function prioridadDelEntrenador(o: { asistencia: number; relacion?: number; disciplinaDelEntrenador: number }): number {
  const P = PARAMETROS_DE_CONVOCATORIA;
  // La relación con el entrenador la tiene guardada el personaje; los PNJ no (sin ella, neutra, como una relación de 50).
  const relacion = 1 + P.efectoDeLaRelacion * (2 * (Math.min(100, Math.max(0, o.relacion ?? 50)) / 100) - 1);
  const falta = P.penalizacionPorFaltar * (1 - Math.min(1, Math.max(0, o.asistencia))) * (0.5 + 0.5 * Math.min(1, Math.max(0, o.disciplinaDelEntrenador)));
  return relacion * (1 - falta);
}

/** El jugador de una plantilla (`plantillaDelEquipo`) como lo mira el entrenador: con su preferencia por la asistencia de las dos últimas semanas y, solo en el personaje, su relación con el entrenador (0 a 100). */
export const paraConvocar = (j: JugadorDeEquipoView, relacion?: number): JugadorParaConvocar => ({ id: j.id, puesto: j.puesto, valores: j.valores, valor: j.valor, estado: j.estado, prioridad: prioridadDelEntrenador({ asistencia: j.asistencia, relacion, disciplinaDelEntrenador: j.disciplinaDelEntrenador }) });

/** El equipo listo para el motor: cada convocado con el puesto de su alineación, su condición física como energía al empezar y su forma y salud en su rendimiento (`factorDeCompeticion(eficienciaDeEstado(estado, false))`, como en el atletismo). */
export function equipoDePartido(id: string, nombre: string, plantilla: readonly JugadorDeEquipoView[], c: Convocatoria, intensidad: Intensidad = 'normal'): EquipoDePartido {
  const porId = new Map(plantilla.map((j) => [j.id, j]));
  const jugador = (x: { id: string; puesto: string }, titular: boolean): JugadorDePartido => {
    const j = porId.get(x.id)!;
    const estado = j.estado ?? ESTADO_INICIAL;
    return { id: j.id, nombre: j.nombre, puesto: x.puesto, lector: j.lector, energia: estado.fisica, rinde: factorDeCompeticion(eficienciaDeEstado(estado, false)), titular };
  };
  return { id, nombre, intensidad, jugadores: [...c.titulares.map((x) => jugador(x, true)), ...c.suplentes.map((x) => jugador(x, false))] };
}

/**
 * Lo que deja el partido en el estado de quienes jugaron: de −1 (lo peor) a +1 (lo mejor), mitad por el resultado del equipo y mitad por su nota (de 1 a 10; el 6 es lo normal). Con ello cambian su moral y su forma como tras una carrera
 * (`trasUnaCompeticion`); quien no jugó no cambia.
 */
export function jugadoresDelPartido(r: ResultadoDePartido, lado: 0 | 1): JugadorDelPartido[] {
  const resultado = Math.sign(r.goles[lado] - r.goles[1 - lado]);
  return Object.entries(r.jugadores)
    .filter(([id]) => r.alineaciones[lado].includes(id))
    .filter(([, s]) => s.minutos > 0)
    .map(([npcId, s]) => ({ npcId, minutos: s.minutos, valoracion: Math.max(-1, Math.min(1, 0.5 * resultado + 0.5 * ((s.nota - 6) / 2))) }));
}

/**
 * El estado del personaje como el de cualquier jugador: su energía es la condición física, su motivación la moral, y su forma y su salud (con la baja por lesión) son las mismas. Con él el personaje entra en el partido por las mismas reglas que
 * los PNJ (`equipoDePartido`).
 */
export function estadoDelPersonaje(lector: LectorDePersona): EstadoDeJugador {
  const baja = lector.stat(GEN.baja);
  return { fisica: lector.stat(GEN.energia), moral: lector.stat(GEN.motivacion), forma: lector.stat(GEN.forma), salud: lector.stat(GEN.salud), ...(baja > 0 ? { baja } : {}) };
}

/**
 * La valoración del partido de un jugador (de −1 a +1) como el puesto de una carrera (`valoracionDelPuesto`), para que el personaje reaccione con el resultado de competición que ya conoce (`COMPETITION_RESULT`) igual que tras una
 * carrera: cambian su motivación y su forma exactamente como lo haría `trasUnaCompeticion` a un PNJ.
 */
export const posicionEquivalente = (valoracion: number): { position: number; total: number } => ({ total: 21, position: Math.round(1 + (1 - Math.max(-1, Math.min(1, valoracion))) * 10) });
