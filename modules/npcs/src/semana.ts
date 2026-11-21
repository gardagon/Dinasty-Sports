import {
  CAPACIDADES_GENETICAS,
  DESARROLLO_NATURAL,
  GRUPO_DE_CAPACIDAD,
  SEMANAS_DE_JUEGO_INFORMAL,
  caidaDeCapacidad,
  evolucionSemanal,
  prefijoEstable,
  rngEstable,
  rngEstableDesde1,
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
/** Los niños que no están cerca del personaje (no son de su club) se calculan cada tantas semanas, de golpe (cifra provisional: ver `semanaDeportiva`). */
export const SEMANAS_DE_LOS_LEJANOS = 8;
/** Las sesiones del club caen unos días antes del fin de semana (para saber desde cuándo no entrena). */
const DIAS_DESDE_LA_SESION = 2;
/**
 * La historia lejana (todo lo anterior al último trimestre antes de la fecha) se calcula en bloques de `SEMANAS_POR_BLOQUE_LEJANO` semanas **de una sola vez** (`grueso` de `pasoDeSemanas`, con los ejercicios de
 * `MUESTRA_DE_SESIONES_LEJANAS` sesiones por bloque): es lo que cuesta crear la partida con la ciudad grande (cifras provisionales, `docs/CIUDAD_Y_LIGAS.md` §8). Lo reciente, que es lo que se ve y de lo que
 * parten los PNJ, sigue yendo en bloques de `SEMANAS_POR_BLOQUE` semanas con la caída y el desarrollo natural semana a semana.
 */
export const SEMANAS_RECIENTES = 13;
export const SEMANAS_POR_BLOQUE_LEJANO = 26;
export const MUESTRA_DE_SESIONES_LEJANAS = 3;
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

/** El rendimiento de un deporte (de 0 a 100) y, si tiene puestos, lo que vale la persona en cada uno. */
export type FuncionDeRendimiento = ((persona: LectorDePersona) => number) & { puestos?: (persona: LectorDePersona) => Record<string, number> };
export type Rendimientos = ReadonlyMap<string, FuncionDeRendimiento>;

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
  const prefijo = prefijoEstable('asiste', n.genetica.semilla ?? 0, n.id, deporte, semana);
  for (let s = 0; s < porSemana; s++) if (rngEstableDesde1(prefijo, s).chance(p)) hechas.push(s);
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
  opciones: {
    porSemana: readonly (readonly number[])[];
    informales: number;
    /** Cuánto rinde por su estado (cansancio, ánimo, salud y forma); 1 = normal. */
    eficiencia?: number;
    lista: (semana: number, hueco: number, lector: LectorDePersona) => readonly Entrenamiento[];
    /**
     * Todo el bloque de una vez, también la caída y el desarrollo natural (`evolucionSemanal` con todas las semanas, contando solo lo que pasa desde el último día entrenado): es lo que se hace con quien no se mira semana a semana
     * y con la historia lejana. Con `muestra`, de las sesiones del bloque solo se eligen los ejercicios de esa cantidad (repartidas por el bloque) y lo que suben se cuenta por todas.
     */
    grueso?: boolean | { muestra: number };
  },
): void {
  if (opciones.grueso) return pasoGrueso(t, fin, semanas, opciones, typeof opciones.grueso === 'object' ? opciones.grueso.muestra : Infinity);
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
  if (sesiones.length) sesionDeClub(t, semanas === 1 ? sesiones.flat() : acumular(sesiones), opciones.eficiencia ?? 1);
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

/**
 * Los días que se espera que cae una habilidad en una semana si la entrena esa semana con probabilidad `p` (y tarda `gracia` días en empezar a caer): `k` semanas sin entrenar (probabilidad `p·(1−p)^k`) son `7k + 2` días desde su
 * último día entrenado, y cada semana cae los que pasan de `gracia`, hasta 7.
 */
function diasDeCaidaPorSemana(p: number, gracia: number): number {
  let esperados = 0;
  let prob = p;
  for (let k = 0; k < 8; k++) {
    esperados += prob * clamp(7 * k + DIAS_DESDE_LA_SESION - gracia, 0, 7);
    prob *= 1 - p;
  }
  return esperados + prob * 7;
}

/** El bloque de `pasoDeSemanas` con `grueso`: ver allí. */
function pasoGrueso(
  t: Trabajo,
  fin: number,
  semanas: number,
  opciones: { porSemana: readonly (readonly number[])[]; informales: number; eficiencia?: number; lista: (semana: number, hueco: number, lector: LectorDePersona) => readonly Entrenamiento[] },
  muestra: number,
): void {
  const ultAntes = [...t.hab.ult];
  const capUltAntes = [...t.capUlt];
  enElDia(t, fin - DIAS_DESDE_LA_SESION, fin - 3.5 * semanas);
  const lector = lectorDe(t);
  if (opciones.informales > 0) practicar(t, acumular(Array.from({ length: opciones.informales }, () => t.rutina.informal)), 1);
  const huecos: { semana: number; hueco: number }[] = [];
  opciones.porSemana.forEach((hs, w) => {
    for (const h of hs) huecos.push({ semana: semanaQueAcaba(fin - 7 * (semanas - 1 - w)), hueco: h });
  });
  // Si se eligen los ejercicios de todas las sesiones (sin `muestra`) se sabe en qué semanas se entrena cada stat y la caída se cuenta como en la semana a semana.
  const porSemanas: Set<string>[] | undefined = muestra === Infinity ? Array.from({ length: semanas }, (_, w) => new Set<string>(opciones.informales > 0 && w < opciones.informales ? t.rutina.informal.map((e) => e.stat) : [])) : undefined;
  // Cuántas veces se entrena cada stat en el bloque (las sesiones de todas las semanas; con `muestra`, las de las elegidas escaladas a todas).
  const veces = new Map<string, number>();
  if (opciones.informales > 0) for (const e of t.rutina.informal) veces.set(e.stat, (veces.get(e.stat) ?? 0) + opciones.informales);
  if (huecos.length) {
    // Con muestra: solo se eligen los ejercicios de unas pocas sesiones repartidas por el bloque; cada stat se cuenta tantas veces como la que más sesiones habría tenido (proporcional).
    const paso = huecos.length > muestra ? huecos.length / muestra : 1;
    const elegidas: (readonly Entrenamiento[])[] = [];
    for (let i = 0; i < huecos.length; i += paso) {
      const h = huecos[Math.floor(i)];
      elegidas.push(opciones.lista(h.semana, h.hueco, lector));
    }
    if (porSemanas) {
      let k = 0;
      opciones.porSemana.forEach((hs, w) => {
        for (let j = 0; j < hs.length; j++) for (const e of elegidas[k++]) porSemanas[w].add(e.stat);
      });
    }
    const lote = acumular(elegidas);
    const escala = huecos.length / elegidas.length;
    for (const e of lote) {
      if (escala !== 1) e.veces = (e.veces ?? 1) * escala;
      veces.set(e.stat, (veces.get(e.stat) ?? 0) + (e.veces ?? 1));
    }
    sesionDeClub(t, lote, opciones.eficiencia ?? 1);
  }
  const base = t.capBase;
  const ultHab = [...ultAntes];
  const ultCap = [...t.capUlt];
  enElDia(t, fin, fin - 3.5 * semanas);
  // La caída: en la semana a semana, una habilidad cae los días que lleva sin entrenarse por encima de su plazo de gracia. Aquí no se sabe en qué semanas toca cada una: se usa lo que se espera de ella, con la
  // probabilidad de entrenarla una semana (`1 − e^(−veces por semana)`) y lo que cae en cada hueco entre sesiones (`diasDeCaidaPorSemana`). Lo que no se entrena en todo el bloque cae desde su último día entrenado.
  const diasDeCaida = (stat: string, gracia: number, ultimo: number): number => {
    if (porSemanas) {
      // Semana a semana, solo la aritmética: cuántos días de la semana pasan del plazo de gracia desde la última vez que se entrenó.
      let ult = ultimo;
      let total = 0;
      for (let w = 0; w < semanas; w++) {
        const finSemana = fin - 7 * (semanas - 1 - w);
        if (porSemanas[w].has(stat)) ult = finSemana - DIAS_DESDE_LA_SESION;
        total += clamp(finSemana - ult - gracia, 0, 7);
      }
      return total;
    }
    const n = veces.get(stat);
    if (!n) return clamp(fin - ultimo - gracia, 0, 7 * semanas);
    return semanas * diasDeCaidaPorSemana(1 - Math.exp(-n / semanas), gracia);
  };
  for (let i = 0; i < t.rutina.stats.length; i++) if (veces.has(t.rutina.stats[i].id)) ultHab[i] = fin - DIAS_DESDE_LA_SESION;
  for (let i = 0; i < CAPACIDADES_GENETICAS.length; i++) if (veces.has(CAPACIDADES_GENETICAS[i])) ultCap[i] = fin - DIAS_DESDE_LA_SESION;
  for (let i = 0; i < t.rutina.stats.length; i++) {
    const def = t.rutina.stats[i];
    if (!def.decay) continue;
    const dias = diasDeCaida(def.id, def.decay.graceDays, ultAntes[i]);
    if (dias <= 0) continue;
    const suelo = Math.max(t.fijos.inicial[i], t.hab.pico[i] * def.decay.floorRatio);
    if (t.hab.v[i] > suelo) t.hab.v[i] = suelo + (t.hab.v[i] - suelo) * (1 - def.decay.ratePerDay) ** dias;
  }
  for (let i = 0; i < CAPACIDADES_GENETICAS.length; i++) {
    const id = CAPACIDADES_GENETICAS[i];
    const techo = (topeEfectivo(t.genetica, id) * t.vigores[GRUPOS[i]]) / 100;
    // `evolucionSemanal` mide los días sin entrenar al empezar el bloque y cuenta `7·semanas + días − gracia` de caída: se le da el que da la caída esperada.
    const gracia = REGLAS[i].decay?.graceDays ?? 0;
    const antes = capUltAntes[i];
    const caida = diasDeCaida(id, gracia, antes <= NUNCA / 2 ? -1e6 : antes);
    const diasSin = caida <= 0 ? -1e6 : caida - 7 * semanas + gracia;
    const v = evolucionSemanal(REGLAS[i], { valor: t.cap[i], pico: t.capPico[i], base: base[i], diasSinEntrenar: diasSin, techo, envejece: false }, semanas);
    t.cap[i] = v;
    if (v > t.capPico[i]) t.capPico[i] = v;
  }
  for (let i = 0; i < ultHab.length; i++) t.hab.ult[i] = Math.max(ultHab[i], ultAntes[i]);
  for (let i = 0; i < ultCap.length; i++) t.capUlt[i] = ultCap[i];
}

/** Una semana: ver `pasoDeSemanas`. */
export const pasoDeSemana = (t: Trabajo, fin: number, o: { huecos: readonly number[]; informal: boolean; eficiencia?: number; lista: (semana: number, hueco: number, lector: LectorDePersona) => readonly Entrenamiento[] }): void =>
  pasoDeSemanas(t, fin, 1, { porSemana: [o.huecos], informales: o.informal ? 1 : 0, eficiencia: o.eficiencia, lista: o.lista });

const redondea = (x: number) => Math.round(x * 100) / 100;

/** Lo que se guarda de un niño tras una semana (o tras su historia). */
export interface Resultado {
  cap: number[];
  pico: number[];
  capUlt: number[];
  hab: HabilidadesDe;
  nivel: number;
  /** Lo que vale en cada puesto del deporte (sin contar la pierna), si el deporte los tiene. */
  puestos?: Record<string, number>;
  /** Cuántas sesiones del club ha hecho esa semana (para su cansancio). */
  sesiones: number;
}

/** Lo que vale en cada puesto, si el rendimiento del deporte los da. */
const puestosDe = (rend: (p: LectorDePersona) => number, t: Trabajo): Record<string, number> | undefined => (rend as { puestos?: (p: LectorDePersona) => Record<string, number> }).puestos?.(lectorDe(t));

function resultado(t: Trabajo, rend: (p: LectorDePersona) => number, sesiones = 0): Resultado {
  const lector = lectorDe(t); // un solo lector para el nivel y los puestos
  const puestos = (rend as { puestos?: (p: LectorDePersona) => Record<string, number> }).puestos?.(lector);
  return {
    sesiones,
    cap: t.cap.map(redondea),
    pico: t.capPico.map(redondea),
    capUlt: t.capUlt,
    hab: { v: t.hab.v.map(redondea), pico: t.hab.pico.map(redondea), ult: [...t.hab.ult] },
    nivel: rend(lector),
    ...(puestos ? { puestos } : {}),
  };
}

/**
 * Las sesiones del club de un bloque de `semanas` semanas (acaba en `fin`), una lista por semana (la más antigua primero): cada una, las que hace por su asistencia. Un bloque no sabe en qué
 * semana se lesionó: si está de baja (le quedan `bajaRestante` semanas), se cuentan como perdidas las últimas semanas del bloque, tantas como le quedan de baja.
 */
export function huecosDelBloque(n: Pick<NinoDeportista, 'id' | 'genetica' | 'equipo' | 'ritmo' | 'deporte'>, deporte: string, r: RutinaDeDeporte, fin: number, semanas: number, bajaRestante = 0): number[][] {
  if (n.deporte !== deporte || n.equipo === undefined) return Array.from({ length: semanas }, () => []);
  const sanas = semanas - Math.min(semanas, bajaRestante);
  return Array.from({ length: semanas }, (_, w) => (w < sanas ? huecosQueHace(n, deporte, r, semanaQueAcaba(fin - 7 * (semanas - 1 - w))) : []));
}

/**
 * Una semana de un niño que ya tiene sus habilidades: `fin` es el día en que acaba. `lista` es la sesión de esa semana (la misma para todo su equipo). Con `bloque` (las sesiones de cada
 * una de las últimas semanas, ver `huecosDelBloque`) avanza varias semanas de golpe, con las fórmulas cerradas de la historia: es lo que se hace con los niños que no se miran cada semana.
 */
export function semanaDeNino(
  n: NinoDeportista,
  deporte: string,
  r: RutinaDeDeporte,
  rend: (p: LectorDePersona) => number,
  fin: number,
  lista: (semana: number, hueco: number, lector: LectorDePersona) => readonly Entrenamiento[],
  /** Su estado: de baja no va a las sesiones, y con él rinde más o menos en ellas. */
  estado?: { baja: boolean; eficiencia: number },
  bloque?: readonly (readonly number[])[],
): Resultado {
  const semanas = bloque?.length ?? 1;
  const t = prepararTrabajo(n, valoresIniciales(n.id, n.genetica), deporte, r, n.hab![deporte], n.capUlt ?? CAPACIDADES_GENETICAS.map(() => NUNCA), fin - 7 * semanas);
  if (bloque) {
    pasoDeSemanas(t, fin, semanas, { porSemana: bloque, informales: 0, eficiencia: estado?.eficiencia, lista, grueso: true });
    return resultado(t, rend, bloque[semanas - 1].length);
  }
  const enClub = n.deporte === deporte && n.equipo !== undefined && !estado?.baja;
  const huecos = enClub ? huecosQueHace(n, deporte, r, semanaQueAcaba(fin)) : [];
  pasoDeSemana(t, fin, { huecos, informal: false, eficiencia: estado?.eficiencia, lista });
  return resultado(t, rend, huecos.length);
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
  /** Con `false`, también la historia lejana va en bloques de `bloque` semanas con la caída semana a semana (para comprobar que la de una sola vez se parece). */
  conGruesos = true,
): Resultado {
  const interes = clamp(Math.round(interesDe(n, deporte)), 0, 3);
  const edadAhora = (dia - n.nacimiento) / DIAS_POR_ANIO;
  const empezo = clamp(edadDeEmpezar(n.id, deporte, interes, n.genetica.padres, n.genetica.semilla ?? 0), EDAD_MINIMA, Math.max(EDAD_MINIMA, edadAhora));
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
    // Lejos de la fecha, el bloque es largo y de una sola vez; sin pasarse hacia lo reciente ni hacia la entrada en el club.
    const hastaLoReciente = Math.floor((dia - 7 * SEMANAS_RECIENTES - fin) / 7);
    const lejos = conGruesos && !informal && hastaLoReciente >= SEMANAS_POR_BLOQUE_LEJANO;
    const semanas = informal ? 1 : lejos ? SEMANAS_POR_BLOQUE_LEJANO : Math.min(bloque, faltan);
    fin += 7 * semanas;
    const porSemana = Array.from({ length: semanas }, (_, w) => (informal ? [] : huecosQueHace(n, deporte, r, semanaQueAcaba(fin - 7 * (semanas - 1 - w)))));
    pasoDeSemanas(t, fin, semanas, { porSemana, informales: informal ? semanas : 0, lista: listaDe, ...(lejos ? { grueso: { muestra: MUESTRA_DE_SESIONES_LEJANAS } } : {}) });
  }
  enElDia(t, dia);
  return resultado(t, rend);
}


/**
 * Lo que gana de conocimiento del deporte un jugador por algo que no es entrenar (ver el partido anterior de su campo el día de partido): sube su habilidad de conocimiento como una práctica (con los rendimientos decrecientes de siempre).
 * Devuelve sus habilidades nuevas.
 */
export function conMasConocimiento(n: NinoDeportista, deporte: string, r: RutinaDeDeporte, dia: number, cantidad: number): HabilidadesDe {
  const t = prepararTrabajo(n, valoresIniciales(n.id, n.genetica), deporte, r, n.hab?.[deporte] ?? habilidadesIniciales(n.id, n.genetica, deporte, r, dia), n.capUlt ?? CAPACIDADES_GENETICAS.map(() => NUNCA), dia);
  practicar(t, [{ stat: r.conocimiento, amount: cantidad }], 1);
  return { v: t.hab.v.map(redondea), pico: t.hab.pico.map(redondea), ult: [...t.hab.ult] };
}
