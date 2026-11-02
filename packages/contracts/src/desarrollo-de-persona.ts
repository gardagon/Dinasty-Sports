import { factorPorEdad, madurezPorEdad } from './development';
import { GRUPO_DE_CAPACIDAD } from './herencia';
import { computeDecay } from './progresion';
import type { DecayDef } from './stats';

/**
 * EL DESARROLLO DE UNA PERSONA, para todas: el personaje (el motor) y cualquier PNJ con genética (`npcs`) siguen estas reglas (plan `docs/MISMAS_REGLAS.md`).
 * Aquí está lo que hace crecer y caer las 18 capacidades sin entrenar: cuánto de su tope permite cada edad, el desarrollo natural, el envejecimiento y la caída.
 */

/** Fracción diaria de la distancia al tope efectivo que se pierde por envejecimiento. */
export const AJUSTE_POR_EDAD_DIARIO = 0.004;
/** Fracción de lo que falta para el mínimo natural que se gana cada día. */
export const DESARROLLO_NATURAL_DIARIO = 0.05;
/** Sin entrenar, una capacidad crece sola hasta esta fracción de lo que permite su edad. */
export const DESARROLLO_NATURAL = 0.45;
/** Rango del valor inicial de una capacidad (el nivel típico de un niño de 8 años está en el medio). */
export const INICIAL_DE_CAPACIDAD = { min: 5, max: 20 } as const;

/** Caída de cada grupo de capacidades sin practicar. */
export const CAIDA_POR_GRUPO: Readonly<Record<'fisico' | 'mental' | 'social', DecayDef>> = {
  fisico: { graceDays: 5, ratePerDay: 0.01, floorRatio: 0.85 },
  mental: { graceDays: 10, ratePerDay: 0.005, floorRatio: 0.9 },
  social: { graceDays: 14, ratePerDay: 0.004, floorRatio: 0.9 },
};

/** La caída de una capacidad (`gen.*`) según su grupo. */
export const caidaDeCapacidad = (id: string): DecayDef => CAIDA_POR_GRUPO[GRUPO_DE_CAPACIDAD[id] as 'fisico'];

/** Los vigores: qué fracción del tope permite la edad en cada categoría, y la madurez física (todo de 0 a 100). */
export interface Vigores {
  madurez: number;
  fisico: number;
  tecnico: number;
  mental: number;
  social: number;
}

/**
 * Lo que permite la edad. `madurezPropia` es el adelanto (+) o retraso (−) en años del desarrollo físico (el `madurez` del personaje, el `desfase` de un
 * niño): lo físico y lo técnico se adelantan o se retrasan con él mientras se crece (hasta los 24); lo mental y lo social siguen la edad real.
 */
export function vigoresPorEdad(edadReal: number, madurezPropia: number): Vigores {
  const edadCuerpo = edadReal < 24 ? edadReal + madurezPropia : edadReal;
  return {
    madurez: 100 * madurezPorEdad(edadReal + madurezPropia),
    fisico: 100 * factorPorEdad('fisico', edadCuerpo),
    tecnico: 100 * factorPorEdad('tecnico', edadCuerpo),
    mental: 100 * factorPorEdad('mental', edadReal),
    social: 100 * factorPorEdad('social', edadReal),
  };
}

/** Qué vigor limita a una capacidad según su grupo. */
export const vigorDeCapacidad = (id: string, v: Vigores): number => v[GRUPO_DE_CAPACIDAD[id] as 'fisico'];

/** Lo que hace falta para evolucionar una capacidad un día (o una semana) sin entrenarla. */
export interface EntradaDeEvolucion {
  valor: number;
  /** Máximo alcanzado. */
  pico: number;
  /** Valor inicial: la caída nunca baja de él. */
  base: number;
  /** Días desde que se entrenó por última vez. */
  diasSinEntrenar: number;
  /** Tope genético por lo que permite la edad (tope × vigor), si lo hay. */
  techo: number | undefined;
  /** ¿Ha bajado lo que permite la edad desde su máximo (envejecimiento)? */
  envejece: boolean;
}

export interface ReglaDeEvolucion {
  decay?: DecayDef;
  /** Fracción de lo que permite la edad a la que llega sola (`growth.naturalFraction`). */
  natural?: number;
}

/**
 * Un día de una capacidad sin entrenar: primero la caída por no practicar, después el envejecimiento (lo que queda por encima de lo que permite la edad
 * cae hacia ello, despacio) y por último el desarrollo natural (crecer da un mínimo que sube con la edad aunque no se entrene). Es lo que hace el motor cada
 * día con el personaje.
 */
export function evolucionDiaria(r: ReglaDeEvolucion, e: EntradaDeEvolucion): number {
  let v = computeDecay({ decay: r.decay } as never, e.valor, e.diasSinEntrenar, e.pico, e.base);
  if (e.envejece && e.techo !== undefined && v > e.techo) v -= (v - e.techo) * AJUSTE_POR_EDAD_DIARIO;
  if (r.natural && e.techo !== undefined && v < e.techo * r.natural) v += (e.techo * r.natural - v) * DESARROLLO_NATURAL_DIARIO;
  return v;
}

/** x elevado a n: la semana completa (n = 7) se hace con multiplicaciones, que es lo que más se repite al calcular la historia de miles de personas. */
const potencia = (x: number, n: number): number => {
  if (n !== 7) return x ** n;
  const x2 = x * x;
  return x2 * x2 * x2 * x;
};
const NATURAL_SEMANAL = potencia(1 - DESARROLLO_NATURAL_DIARIO, 7);
const ENVEJECER_SEMANAL = potencia(1 - AJUSTE_POR_EDAD_DIARIO, 7);

/**
 * Una semana de lo mismo de una vez (siete días de caída, de envejecimiento y de desarrollo natural), con fórmulas cerradas: para los PNJ, que son
 * muchos y no se simulan día a día. Da lo mismo que siete `evolucionDiaria` dentro de un margen pequeño (lo prueba un test).
 */
export function evolucionSemanal(r: ReglaDeEvolucion, e: EntradaDeEvolucion): number {
  let v = e.valor;
  const d = r.decay;
  if (d) {
    const dias = Math.max(0, Math.min(7, e.diasSinEntrenar + 7 - d.graceDays));
    const suelo = Math.max(e.base, e.pico * d.floorRatio);
    if (dias > 0 && v > suelo) v = suelo + (v - suelo) * potencia(1 - d.ratePerDay, dias);
  }
  if (e.envejece && e.techo !== undefined && v > e.techo) v = e.techo + (v - e.techo) * ENVEJECER_SEMANAL;
  if (r.natural && e.techo !== undefined && v < e.techo * r.natural) {
    const objetivo = e.techo * r.natural;
    v = objetivo - (objetivo - v) * NATURAL_SEMANAL;
  }
  return v;
}
