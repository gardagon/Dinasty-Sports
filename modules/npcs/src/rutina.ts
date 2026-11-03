import {
  CAPACIDADES_GENETICAS,
  GRUPO_DE_CAPACIDAD,
  HERENCIA,
  NIVEL_TIPICO_DE_REFERENCIA,
  caidaDeCapacidad,
  computeCap,
  computeDecay,
  computeGainVarias,
  computeSpeed,
  efectosDe,
  nivelTipicoPorEdad,
  plasticidadPorEdad,
  potentialSpeed,
  rngEstable,
  statDeCapacidad,
  vigoresPorEdad,
  type Entrenamiento,
  type LectorDePersona,
  type RutinaDeDeporte,
  type StatDef,
  type Vigores,
} from '@ds/contracts';
import { EFECTO_CONOCIMIENTO } from '@ds/kit-deporte';
import type { Genetica } from './deportistas';

/**
 * LA RUTINA DE UN PNJ (plan `docs/MISMAS_REGLAS.md`, P2a). Un niño que juega a un deporte lleva las mismas habilidades que el personaje (las que define el módulo del
 * deporte, que la partida guarda con su población) y las entrena **con las mismas fórmulas del motor** (`computeGain`, `computeCap`, `computeSpeed`, `computeDecay`,
 * en contracts): lo que cambia es quién decide qué hace, que en un PNJ es su rutina (las sesiones de su club según su constancia). El estado de ánimo del día no se
 * simula en un PNJ: llega con el estado y la forma (P2a, segunda parte).
 */

/** Las habilidades de un niño en un deporte, en el orden de `RutinaDeDeporte.stats`: el valor, el máximo alcanzado y el último día que las entrenó. */
export interface HabilidadesDe {
  v: number[];
  pico: number[];
  /** Último día (de la partida) que entrenó cada una (en el orden de `v`): para la caída, como el `lastTrained` por stat del motor. */
  ult: number[];
}

/** Lo que `npcs` necesita saber de un niño para entrenarlo (un `Npc` lo cumple). */
export interface Entrenable {
  id: string;
  genetica: Genetica;
  nacimiento: number;
  cap: number[];
  pico: number[];
}

const DIAS_POR_ANIO = 365;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const redondea = (x: number) => Math.round(x * 100) / 100;
const GEN_DEFS: ReadonlyMap<string, StatDef> = new Map(CAPACIDADES_GENETICAS.map((c) => [c, statDeCapacidad(c, c, '')]));
const INDICE_DE_CAPACIDAD: ReadonlyMap<string, number> = new Map(CAPACIDADES_GENETICAS.map((c, i) => [c, i]));
/** Estados de los que depende el techo de una stat: la madurez y el vigor de cada categoría, sacados de la edad. */
const ESTADOS_DE_EDAD = ['gen.madurez', 'gen.vigor_fisico', 'gen.vigor_tecnico', 'gen.vigor_mental', 'gen.vigor_social'] as const;

/** El tope de una capacidad con el efecto de sus perks (la misma cuenta que el motor al crear al personaje). */
const TOPES_EFECTIVOS = new WeakMap<Genetica, Map<string, number>>();
export function topeEfectivo(g: Genetica, c: string): number {
  let m = TOPES_EFECTIVOS.get(g);
  if (!m) {
    const efecto = efectosDe(g.perks.activos).tope;
    TOPES_EFECTIVOS.set(g, (m = new Map(CAPACIDADES_GENETICAS.map((x) => [x, clamp(g.topes[x] + (efecto[x] ?? 0), 0, 100)]))));
  }
  return m.get(c) ?? clamp(g.topes[c], 0, 100);
}

/** El talento de un niño en cada capacidad, como lo sortea el motor para el personaje. Se calcula una vez. */
const TALENTOS = new Map<string, number[]>();
const claveDeTalento = (semilla: number, id: string): string => `${semilla}|${id}`;
function talentoDeCapacidad(semilla: number, id: string, c: string): number {
  let t = TALENTOS.get(claveDeTalento(semilla, id));
  if (!t) {
    t = CAPACIDADES_GENETICAS.map((x) => 1 + (rngEstable('talento', semilla, id, x).next() * 2 - 1) * (GEN_DEFS.get(x)!.talentSpread ?? 0.15));
    TALENTOS.set(claveDeTalento(semilla, id), t);
  }
  return t[INDICE_DE_CAPACIDAD.get(c)!];
}

/** Lo que no cambia de un niño y un deporte: su talento y su tope genético en cada habilidad. Se calcula una vez. */
export interface Fijos {
  talento: number[];
  tope: (number | undefined)[];
  inicial: number[];
}
const FIJOS = new WeakMap<Genetica, Map<string, Fijos>>();

/** Para pruebas: los valores fijos de un niño en un deporte (su talento y su tope en cada habilidad), para fijarlos a los de otra persona. */
export const fijosDeNino = (id: string, g: Genetica, deporte: string, r: RutinaDeDeporte): Fijos => fijosDe(id, g, deporte, r);
/** Para pruebas: fija el talento de un niño en cada capacidad. */
export const fijarTalentosDeCapacidades = (id: string, talentos: number[], semilla = 0): void => void TALENTOS.set(claveDeTalento(semilla, id), talentos);

function fijosDe(id: string, g: Genetica, deporte: string, r: RutinaDeDeporte): Fijos {
  let porDeporte = FIJOS.get(g);
  if (!porDeporte) FIJOS.set(g, (porDeporte = new Map()));
  let f = porDeporte.get(deporte);
  if (f) return f;
  f = { talento: [], tope: [], inicial: [] };
  const semilla = g.semilla ?? 0;
  for (const def of r.stats) {
    // El talento de cada stat y el rango inicial, como los sortea el motor para el personaje (cada stat, con su propio hilo).
    f.talento.push(1 + (rngEstable('talento', semilla, id, def.id).next() * 2 - 1) * (def.talentSpread ?? 0.15));
    f.inicial.push(typeof def.initial === 'number' ? def.initial : def.initial.min + (def.initial.max - def.initial.min) * rngEstable('inicial-habilidad', semilla, id, def.id).next());
    const d = def.genetics?.derivedFrom;
    if (!d) {
      f.tope.push(undefined);
      continue;
    }
    // El tope de una habilidad: la media ponderada de los topes de las capacidades que la apoyan, por su aptitud propia (como `recalcularDerivados` del motor).
    let suma = 0;
    let peso = 0;
    for (const inf of d) {
      suma += inf.weight * topeEfectivo(g, inf.stat);
      peso += inf.weight;
    }
    const aptitud = 1 + (def.genetics!.aptitude ?? 0.1) * (rngEstable('aptitud-habilidad', semilla, id, def.id).next() * 2 - 1);
    f.tope.push(clamp((suma / peso) * aptitud, HERENCIA.min, 100));
  }
  porDeporte.set(deporte, f);
  return f;
}

/** Las habilidades de un niño que empieza un deporte: dentro del rango inicial de cada una y el conocimiento en 0 (lo que hace el motor con el personaje). */
export function habilidadesIniciales(id: string, g: Genetica, deporte: string, r: RutinaDeDeporte, dia: number): HabilidadesDe {
  const v = fijosDe(id, g, deporte, r).inicial.map((x, i) => redondea(clamp(x, r.stats[i].min ?? 0, r.stats[i].max ?? 100)));
  return { v, pico: [...v], ult: v.map(() => dia) };
}

/** Todo lo que se mueve al entrenar a un niño un día: su edad, sus capacidades y las habilidades del deporte. Se trabaja sobre copias. */
export interface Trabajo {
  id: string;
  genetica: Genetica;
  deporte: string;
  rutina: RutinaDeDeporte;
  fijos: Fijos;
  /** Edad en años (decimal, con su adelanto o retraso de desarrollo para lo físico: ver `vigoresPorEdad`) y sus vigores. */
  edad: number;
  vigores: Vigores;
  cap: number[];
  capPico: number[];
  capBase: readonly number[];
  hab: HabilidadesDe;
  nacimiento: number;
  /** Día en que se trabaja (para marcar el último día entrenado). */
  dia: number;
  /** Último día que entrenó cada capacidad por su rutina (para la caída). */
  capUlt: number[];
}

export function prepararTrabajo(n: Entrenable, capBase: readonly number[], deporte: string, r: RutinaDeDeporte, hab: HabilidadesDe, capUlt: number[], dia: number): Trabajo {
  const edad = (dia - n.nacimiento) / DIAS_POR_ANIO;
  return {
    id: n.id,
    genetica: n.genetica,
    deporte,
    rutina: r,
    fijos: fijosDe(n.id, n.genetica, deporte, r),
    edad,
    vigores: vigoresPorEdad(edad, n.genetica.desfase),
    cap: [...n.cap],
    capPico: [...n.pico],
    capBase,
    hab: { v: [...hab.v], pico: [...hab.pico], ult: [...hab.ult] },
    nacimiento: n.nacimiento,
    dia,
    capUlt: [...capUlt],
  };
}

/** Pone el trabajo en un día: su edad y lo que permite (los vigores) cambian con él. */
export function enElDia(t: Trabajo, dia: number, paraLaEdad = dia): void {
  t.dia = dia;
  t.edad = (paraLaEdad - t.nacimiento) / DIAS_POR_ANIO;
  t.vigores = vigoresPorEdad(t.edad, t.genetica.desfase);
}

const INDICES_DE_HABILIDAD = new WeakMap<RutinaDeDeporte, Map<string, number>>();
function indiceDeHabilidad(t: Trabajo, id: string): number {
  let m = INDICES_DE_HABILIDAD.get(t.rutina);
  if (!m) INDICES_DE_HABILIDAD.set(t.rutina, (m = new Map(t.rutina.stats.map((d, i) => [d.id, i]))));
  return m.get(id) ?? -1;
}

/** El lector de persona de un niño en este momento: lo que ve una fórmula de rendimiento (`stat` y `norm`, como el contexto del motor). */
export function lectorDe(t: Trabajo): LectorDePersona {
  const anios = Math.floor(t.edad);
  const stat = (id: string): number => {
    const i = INDICE_DE_CAPACIDAD.get(id);
    if (i !== undefined) return t.cap[i];
    const j = indiceDeHabilidad(t, id);
    if (j >= 0) return t.hab.v[j];
    const e = ESTADOS_DE_EDAD.indexOf(id as (typeof ESTADOS_DE_EDAD)[number]);
    if (e >= 0) return [t.vigores.madurez, t.vigores.fisico, t.vigores.tecnico, t.vigores.mental, t.vigores.social][e];
    return 0;
  };
  const norm = (id: string): number => {
    const n = stat(id) / 100;
    // Las capacidades se miden frente a lo típico de la edad (un niño de 8 con 12 en inteligencia es normal para su edad): igual que el motor.
    return INDICE_DE_CAPACIDAD.has(id) ? Math.min(1, (n * NIVEL_TIPICO_DE_REFERENCIA) / nivelTipicoPorEdad(anios)) : n;
  };
  return { stat, norm };
}

/**
 * Entrena una stat un `amount` con una eficiencia: la misma cuenta que el motor (`trainStat`). Devuelve lo que ha subido. `ahora` es el día en que se entrena.
 */
function entrenarStat(t: Trabajo, id: string, amount: number, eficiencia: number, lector: LectorDePersona, veces = 1): number {
  const ci = INDICE_DE_CAPACIDAD.get(id);
  const hi = ci === undefined ? indiceDeHabilidad(t, id) : -1;
  if (ci === undefined && hi < 0) return 0;
  const def = ci === undefined ? t.rutina.stats[hi] : GEN_DEFS.get(id)!;
  const min = def.min ?? 0;
  const max = def.max ?? 100;
  const valor = ci === undefined ? t.hab.v[hi] : t.cap[ci];
  const tope = ci === undefined ? t.fijos.tope[hi] : topeEfectivo(t.genetica, id);
  const talento = ci === undefined ? t.fijos.talento[hi] : talentoDeCapacidad(t.genetica.semilla ?? 0, t.id, id);
  // El tope efectivo es el genético por lo que permite la edad (el vigor de su categoría).
  const factor = def.growth?.potentialFactor;
  const vigor = factor ? lector.stat(factor) : undefined;
  const efectivo = tope === undefined ? undefined : vigor === undefined ? tope : tope * clamp(vigor / 100, 0, 1);
  const techo = computeCap(def, min, max, lector.norm);
  const gain = computeGainVarias(def, {
    value: valor,
    min,
    max,
    cap: efectivo === undefined ? techo : Math.min(efectivo, techo),
    talent: talento,
    speed: computeSpeed(def, lector.norm) * (tope === undefined ? 1 : potentialSpeed(tope)) * (ci === undefined ? 1 : plasticidadPorEdad(Math.floor(t.edad))),
    efficiency: eficiencia,
    amount,
  }, veces);
  if (gain <= 0) return 0;
  if (ci === undefined) {
    t.hab.v[hi] = Math.min(max, valor + gain);
    if (t.hab.v[hi] > t.hab.pico[hi]) t.hab.pico[hi] = t.hab.v[hi];
    t.hab.ult[hi] = t.dia;
  } else {
    t.cap[ci] = Math.min(max, valor + gain);
    if (t.cap[ci] > t.capPico[ci]) t.capPico[ci] = t.cap[ci];
    t.capUlt[ci] = t.dia;
  }
  return gain;
}

/** La eficiencia de una sesión de club por lo que sabe del deporte: ×0,90 (nada) a ×1,15 (todo), como el modificador del kit. */
export function eficienciaPorConocimiento(t: Trabajo, lector: LectorDePersona): number {
  const f = EFECTO_CONOCIMIENTO.min + EFECTO_CONOCIMIENTO.rango * lector.norm(t.rutina.conocimiento);
  return Math.abs(f - 1) < 0.02 ? 1 : f;
}

/** Una práctica (una lista de lo que sube, con una eficiencia): sube cada stat en orden, viendo ya lo que subió la anterior, como las acciones del personaje. */
export function practicar(t: Trabajo, lista: readonly EntrenamientoRepetido[], eficiencia: number): void {
  const lector = lectorDe(t);
  for (const e of lista) entrenarStat(t, e.stat, e.amount, eficiencia, lector, e.veces ?? 1);
}

/** Una sesión del club (o varias juntas, ya sumadas): lo que sube la lista, con la eficiencia que le da lo que sabe del deporte. */
export function sesionDeClub(t: Trabajo, lista: readonly EntrenamientoRepetido[], factor = 1): void {
  const lector = lectorDe(t);
  const e = eficienciaPorConocimiento(t, lector) * factor;
  for (const x of lista) entrenarStat(t, x.stat, x.amount, e, lector, x.veces ?? 1);
}

/** Lo que sube una práctica repetida `veces` veces seguidas (`computeGainVarias`). */
export interface EntrenamientoRepetido extends Entrenamiento {
  veces?: number;
}

/** Junta varias prácticas en una lista: cada stat una vez, con su cantidad media y las veces que se entrena (es lo que se entrena en un bloque de semanas). */
export function acumular(listas: readonly (readonly Entrenamiento[])[]): EntrenamientoRepetido[] {
  const suma = new Map<string, { total: number; veces: number }>();
  for (const l of listas) for (const e of l) {
    const s = suma.get(e.stat) ?? { total: 0, veces: 0 };
    s.total += e.amount;
    s.veces++;
    suma.set(e.stat, s);
  }
  return [...suma].map(([stat, s]) => ({ stat, amount: s.total / s.veces, veces: s.veces }));
}

/** Las listas de capacidades y habilidades de un trabajo, redondeadas para guardarlas. */
export const aGuardarHabilidades = (h: HabilidadesDe): HabilidadesDe => ({ v: h.v.map(redondea), pico: h.pico.map(redondea), ult: [...h.ult] });

export { GRUPO_DE_CAPACIDAD, caidaDeCapacidad };
