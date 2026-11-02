import {
  CAPACIDADES_GENETICAS,
  DESARROLLO_NATURAL,
  GRUPO_DE_CAPACIDAD,
  SEMANAS_DE_JUEGO_INFORMAL,
  caidaDeCapacidad,
  evolucionSemanal,
  rngEstable,
  type Entrenamiento,
  type LectorDePersona,
  type RutinaDeDeporte,
} from '@ds/contracts';
import { elegirEjercicios } from '@ds/kit-deporte';
import { EDAD_DE_PARTIDA, capacidadesIniciales, edadDeEmpezar, historiaDe, valoresIniciales } from './capacidades';
import { ritmoEn, type Genetica } from './deportistas';
import {
  acumular,
  enElDia,
  habilidadesIniciales,
  lectorDe,
  practicar,
  prepararTrabajo,
  sesionDeClub,
  topeEfectivo,
  type HabilidadesDe,
  type Trabajo,
} from './rutina';

/**
 * LA SEMANA DE UN NIÑO QUE JUEGA A UN DEPORTE (plan `docs/MISMAS_REGLAS.md`, P2a): una sola función avanza una semana a cualquier niño con la rutina de su club, y la
 * historia que se simula al crear la partida (o al llegar un niño nuevo a un equipo) es esa misma función repetida semana a semana desde que empezó. Lo único que no
 * se hace día a día es el reloj: las sesiones de la semana se aplican juntas y la caída y el desarrollo natural, de golpe (`evolucionSemanal`).
 */

const DIAS_POR_ANIO = 365;
/** El número de la semana (la que cuenta el reloj del juego) que acaba el día `fin`. */
export const semanaQueAcaba = (fin: number): number => Math.floor((fin - 1) / 7);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
/** Semanas que se calculan de golpe al hacer la historia de un niño. */
export const SEMANAS_POR_BLOQUE = 4;
/** Las sesiones del club caen unos días antes del fin de semana (para saber desde cuándo no entrena). */
const DIAS_DESDE_LA_SESION = 2;
/** Antes de esta edad no se cuenta nada del deporte: el prebenjamín es lo más pronto. */
const EDAD_MINIMA = 6;
/** «Nunca» ha entrenado una capacidad con su rutina. */
export const NUNCA = -1e9;
const REGLAS = CAPACIDADES_GENETICAS.map((c) => ({ decay: caidaDeCapacidad(c), natural: DESARROLLO_NATURAL }));
const GRUPOS = CAPACIDADES_GENETICAS.map((c) => GRUPO_DE_CAPACIDAD[c] as 'fisico' | 'mental' | 'social');

/** Lo que `npcs` necesita de un niño para avanzarle una semana (un `Npc` lo cumple). */
export interface NinoDeportista {
  id: string;
  genetica: Genetica;
  nacimiento: number;
  cap: number[];
  pico: number[];
  /** Cuándo entrenó por última vez cada capacidad con su rutina (días de la partida; `NUNCA` si no). */
  capUlt?: number[];
  hab?: Record<string, HabilidadesDe>;
  levels: Record<string, number>;
  ritmo?: Record<string, number>;
  equipo?: string;
  deporte?: string;
  rasgos?: { intereses: Record<string, number> };
}

export type Rendimientos = ReadonlyMap<string, (persona: LectorDePersona) => number>;

/** Cuánto le interesa un deporte (0 a 3): el interés por ese deporte o por el deporte en general, el mayor. */
export const interesDe = (n: Pick<NinoDeportista, 'rasgos'>, deporte: string): number =>
  n.rasgos ? Math.max(n.rasgos.intereses[deporte] ?? 0, n.rasgos.intereses.deporte ?? 0) : 0;

/** Qué parte de las sesiones del club cumple un niño: la que le da su constancia (su ritmo), de un 55 % a un 100 %. */
export const asistencia = (ritmo: number): number => clamp(0.55 + 0.45 * ((ritmo - 0.55) / 0.95), 0.55, 1);

/** Las sesiones del club de la semana a las que va un niño (el número de cada una dentro de la semana): cada una la cumple con su probabilidad de asistencia (su azar es solo suyo, el de esa semana). */
export function huecosQueHace(n: Pick<NinoDeportista, 'id' | 'genetica' | 'equipo' | 'ritmo'>, deporte: string, r: RutinaDeDeporte, semana: number): number[] {
  const porSemana = (n.equipo !== undefined ? r.sesionesPorSemana[n.equipo] : undefined) ?? r.sesionesPorDefecto;
  const p = asistencia(n.ritmo?.[deporte] ?? ritmoEn(n.id, n.genetica, deporte));
  const hechas: number[] = [];
  for (let s = 0; s < porSemana; s++) if (rngEstable('asiste', n.id, deporte, semana, s).chance(p)) hechas.push(s);
  return hechas;
}

/** Cuántas sesiones del club hace un niño una semana. */
export const sesionesQueHace = (n: Pick<NinoDeportista, 'id' | 'genetica' | 'equipo' | 'ritmo'>, deporte: string, r: RutinaDeDeporte, semana: number): number => huecosQueHace(n, deporte, r, semana).length;

/** Lo que sube una sesión del club ese día: la lista fija del deporte o los ejercicios que elige el entrenador (con lo que le falta a quien se mira). */
export function listaDeSesion(r: RutinaDeDeporte, nivel: (stat: string) => number, semilla: readonly (string | number)[]): readonly Entrenamiento[] {
  if (r.sesionFija) return r.sesionFija;
  if (!r.ejercicios) return [];
  const elegidos = elegirEjercicios(r.ejercicios, { nivel, semilla, cuantos: r.ejerciciosPorSesion ?? 2 });
  return [...elegidos.flatMap((e) => e.entrena), ...(r.siempre ?? [])];
}

/**
 * Avanza el trabajo `semanas` semanas (acaban en `fin`): el juego informal o las sesiones del club, la caída de las habilidades y el desarrollo natural y la caída de las
 * capacidades. Con una semana es lo que hace el juego cada semana; con varias, de golpe, es lo que se usa para la historia al crear la partida: el **entrenamiento** del
 * bloque se junta (las sesiones sumadas, con las fórmulas cerradas de `computeGainVarias`) pero la **caída y el desarrollo natural siguen yendo semana a semana**, porque una
 * semana sin ir al club cae aunque la de al lado no. `porSemana[w]` son las sesiones de la semana `w` del bloque; `lista(i)` dice qué sube la sesión número `i`.
 */
export function pasoDeSemanas(
  t: Trabajo,
  fin: number,
  semanas: number,
  opciones: { porSemana: readonly (readonly number[])[]; informales: number; lista: (semana: number, hueco: number, lector: LectorDePersona) => readonly Entrenamiento[] },
): void {
  const ultAntes = [...t.hab.ult];
  const capUltAntes = [...t.capUlt];
  // El entrenamiento de todo el bloque junto. Lo que permite la edad se mide a mitad del periodo.
  enElDia(t, fin - DIAS_DESDE_LA_SESION, fin - 3.5 * semanas);
  const lector = lectorDe(t);
  if (opciones.informales > 0) practicar(t, acumular(Array.from({ length: opciones.informales }, () => t.rutina.informal)), 1);
  const sesiones: (readonly Entrenamiento[])[] = [];
  // Qué stats se entrenaron cada semana del bloque: solo esas marcan su «último día entrenado» (con ejercicios distintos cada sesión, las demás siguen sin entrenarse y caen).
  const entrenadasEnLaSemana: Set<string>[] = [];
  opciones.porSemana.forEach((huecos, w) => {
    const ese = new Set<string>(opciones.informales > 0 && w < opciones.informales ? t.rutina.informal.map((e) => e.stat) : []);
    for (const h of huecos) {
      const l = opciones.lista(semanaQueAcaba(fin - 7 * (semanas - 1 - w)), h, lector);
      sesiones.push(l);
      for (const e of l) ese.add(e.stat);
    }
    entrenadasEnLaSemana.push(ese);
  });
  if (sesiones.length) sesionDeClub(t, semanas === 1 ? sesiones.flat() : acumular(sesiones));
  // Cuándo entrenó por última vez cada cosa, semana a semana (empieza como estaba antes del bloque).
  const ultHab = [...ultAntes];
  const ultCap = [...capUltAntes];
  const base = t.capBase;
  for (let w = 0; w < semanas; w++) {
    const finSemana = fin - 7 * (semanas - 1 - w);
    const ese = entrenadasEnLaSemana[w];
    for (let i = 0; i < t.rutina.stats.length; i++) if (ese.has(t.rutina.stats[i].id)) ultHab[i] = finSemana - DIAS_DESDE_LA_SESION;
    for (let i = 0; i < CAPACIDADES_GENETICAS.length; i++) if (ese.has(CAPACIDADES_GENETICAS[i])) ultCap[i] = finSemana - DIAS_DESDE_LA_SESION;
    enElDia(t, finSemana, finSemana - 3.5);
    // Las habilidades que llevan días sin entrenarse pierden hacia su suelo (el máximo entre su valor inicial y su máximo alcanzado por el `floorRatio`).
    for (let i = 0; i < t.rutina.stats.length; i++) {
      const def = t.rutina.stats[i];
      if (!def.decay) continue;
      const dias = clamp(finSemana - ultHab[i] - def.decay.graceDays, 0, 7);
      if (dias <= 0) continue;
      const suelo = Math.max(t.fijos.inicial[i], t.hab.pico[i] * def.decay.floorRatio);
      if (t.hab.v[i] > suelo) t.hab.v[i] = suelo + (t.hab.v[i] - suelo) * (1 - def.decay.ratePerDay) ** dias;
    }
    // Las capacidades: desarrollo natural y caída.
    for (let i = 0; i < CAPACIDADES_GENETICAS.length; i++) {
      const id = CAPACIDADES_GENETICAS[i];
      const techo = (topeEfectivo(t.genetica, id) * t.vigores[GRUPOS[i]]) / 100;
      const diasSin = ultCap[i] <= NUNCA / 2 ? 1e6 : Math.max(0, finSemana - 7 - ultCap[i]);
      const v = evolucionSemanal(REGLAS[i], { valor: t.cap[i], pico: t.capPico[i], base: base[i], diasSinEntrenar: diasSin, techo, envejece: false });
      t.cap[i] = v;
      if (v > t.capPico[i]) t.capPico[i] = v;
    }
  }
  for (let i = 0; i < ultHab.length; i++) t.hab.ult[i] = Math.max(ultHab[i], ultAntes[i]);
  for (let i = 0; i < ultCap.length; i++) t.capUlt[i] = ultCap[i];
}

/** Una semana: ver `pasoDeSemanas`. */
export const pasoDeSemana = (t: Trabajo, fin: number, o: { huecos: readonly number[]; informal: boolean; lista: (semana: number, hueco: number, lector: LectorDePersona) => readonly Entrenamiento[] }): void =>
  pasoDeSemanas(t, fin, 1, { porSemana: [o.huecos], informales: o.informal ? 1 : 0, lista: o.lista });

const redondea = (x: number) => Math.round(x * 100) / 100;

/** Lo que se guarda de un niño tras una semana (o tras su historia). */
export interface Resultado {
  cap: number[];
  pico: number[];
  capUlt: number[];
  hab: HabilidadesDe;
  nivel: number;
}

function resultado(t: Trabajo, rend: (p: LectorDePersona) => number): Resultado {
  return {
    cap: t.cap.map(redondea),
    pico: t.capPico.map(redondea),
    capUlt: t.capUlt,
    hab: { v: t.hab.v.map(redondea), pico: t.hab.pico.map(redondea), ult: [...t.hab.ult] },
    nivel: rend(lectorDe(t)),
  };
}

/** Una semana de un niño que ya tiene sus habilidades: `fin` es el día en que acaba. `lista` es la sesión de esa semana (la misma para todo su equipo). */
export function semanaDeNino(
  n: NinoDeportista,
  deporte: string,
  r: RutinaDeDeporte,
  rend: (p: LectorDePersona) => number,
  fin: number,
  lista: (semana: number, hueco: number, lector: LectorDePersona) => readonly Entrenamiento[],
): Resultado {
  const t = prepararTrabajo(n, valoresIniciales(n.id, n.genetica), deporte, r, n.hab![deporte], n.capUlt ?? CAPACIDADES_GENETICAS.map(() => NUNCA), fin - 7);
  const enClub = n.deporte === deporte && n.equipo !== undefined;
  pasoDeSemana(t, fin, { huecos: enClub ? huecosQueHace(n, deporte, r, semanaQueAcaba(fin)) : [], informal: false, lista });
  return resultado(t, rend);
}

/**
 * La historia de un niño que juega a un deporte: desde que empezó a jugar con los amigos (unas semanas antes de entrar en el club, según su interés) y desde que
 * entró en el club (`edadDeEmpezar`, sin pasar de su edad), cada semana hasta `dia`. Es la misma `pasoDeSemana` que la del juego: el valor al empezar la partida es el
 * de haber seguido su rutina. La caída y el desarrollo natural de las capacidades también se simulan semana a semana en ese tramo.
 */
export function historiaDeportiva(
  n: NinoDeportista,
  deporte: string,
  r: RutinaDeDeporte,
  rend: (p: LectorDePersona) => number,
  dia: number,
  listaDe: (semana: number, hueco: number, lector: LectorDePersona) => readonly Entrenamiento[],
  bloque = SEMANAS_POR_BLOQUE,
): Resultado {
  const interes = clamp(Math.round(interesDe(n, deporte)), 0, 3);
  const edadAhora = (dia - n.nacimiento) / DIAS_POR_ANIO;
  const empezo = clamp(edadDeEmpezar(n.id, deporte, interes, n.genetica.padres), EDAD_MINIMA, Math.max(EDAD_MINIMA, edadAhora));
  const diaClub = n.nacimiento + empezo * DIAS_POR_ANIO;
  const desde = Math.max(n.nacimiento + EDAD_MINIMA * DIAS_POR_ANIO, diaClub - SEMANAS_DE_JUEGO_INFORMAL[interes] * 7);
  // Sus capacidades al empezar a jugar: las de los 8 años si aún no los tiene; si no, lo que han desarrollado sin más desde entonces.
  const previas = desde <= n.nacimiento + EDAD_DE_PARTIDA * DIAS_POR_ANIO ? capacidadesIniciales(n.id, n.genetica) : historiaDe(n.id, n.genetica, n.nacimiento, desde);
  const t = prepararTrabajo(
    { id: n.id, genetica: n.genetica, nacimiento: n.nacimiento, cap: previas.cap, pico: previas.pico },
    valoresIniciales(n.id, n.genetica),
    deporte,
    r,
    habilidadesIniciales(n.id, n.genetica, deporte, r, desde),
    CAPACIDADES_GENETICAS.map(() => NUNCA),
    desde,
  );
  // Por bloques de `SEMANAS_POR_BLOQUE` semanas (un test comprueba que da lo mismo que semana a semana): primero el juego informal, después el club.
  let fin = desde;
  while (fin + 7 <= dia) {
    const faltan = Math.floor((dia - fin) / 7);
    // Un bloque no cruza la entrada en el club: se parte en el juego informal y la rutina del club.
    const hastaElClub = Math.floor((diaClub - fin) / 7);
    const informal = hastaElClub > 0;
    // El juego informal se hace semana a semana (son pocas y así es exactamente lo que hace el personaje); la rutina del club, por bloques.
    const semanas = informal ? 1 : Math.min(bloque, faltan);
    fin += 7 * semanas;
    const porSemana = Array.from({ length: semanas }, (_, w) => (informal ? [] : huecosQueHace(n, deporte, r, semanaQueAcaba(fin - 7 * (semanas - 1 - w)))));
    pasoDeSemanas(t, fin, semanas, { porSemana, informales: informal ? semanas : 0, lista: listaDe });
  }
  enElDia(t, dia);
  return resultado(t, rend);
}
