import type { Rng } from './rng';

/**
 * Herencia genética. Compartida porque la usan el motor (topes del personaje a partir de los de sus padres) y
 * los módulos (rivales con padres, altura, práctica deportiva de la familia).
 *
 * Cada capacidad hereda de UNO de los padres sobre todo: 60 % de un progenitor y 40 % del otro (al azar cuál).
 * Se mezclan los TOPES de los padres, no su nivel actual, y cada capacidad añade una variación propia.
 */
export const HERENCIA = {
  /** Peso del progenitor que más pesa en esa capacidad; el otro pesa el resto (1 − este). */
  pesoMayor: 0.6,
  /** Desviación de la variación propia, como fracción del valor mezclado (0,07 = ±7 %). */
  variacion: 0.07,
  /** Desviación de la variación propia cuando se mezclan puntuaciones típicas (z), p. ej. la altura. */
  variacionZ: 0.4,
} as const;

/** Mezcla los topes de padre y madre: 60/40 (o 40/60) más variación propia, dentro de [min, max]. */
export function mezclarTope(padre: number, madre: number, rng: Rng, min: number, max: number): number {
  const wPadre = rng.chance(0.5) ? HERENCIA.pesoMayor : 1 - HERENCIA.pesoMayor;
  const base = wPadre * padre + (1 - wPadre) * madre;
  return Math.min(max, Math.max(min, base * (1 + HERENCIA.variacion * rng.normal())));
}

/** Desviación de la puntuación típica del hijo tras mezclar a los padres (para reescalar a la del rasgo). */
export const SD_Z_HIJO = Math.sqrt(HERENCIA.pesoMayor ** 2 + (1 - HERENCIA.pesoMayor) ** 2 + HERENCIA.variacionZ ** 2);

/** Igual que `mezclarTope` para una puntuación típica (media 0, desviación 1). */
export function mezclarZ(padre: number, madre: number, rng: Rng): number {
  const wPadre = rng.chance(0.5) ? HERENCIA.pesoMayor : 1 - HERENCIA.pesoMayor;
  return wPadre * padre + (1 - wPadre) * madre + HERENCIA.variacionZ * rng.normal();
}

/** Lo que un adulto ha practicado de un deporte. */
export type Practica = 'ninguna' | 'aficionado' | 'federado' | 'profesional';

export const NIVEL_PRACTICA: Record<Practica, number> = { ninguna: 0, aficionado: 1, federado: 2, profesional: 3 };

export const PRACTICA_TEXTO: Record<Practica, string> = {
  ninguna: 'no hizo deporte',
  aficionado: 'lo practicó por afición',
  federado: 'compitió federado',
  profesional: 'fue profesional',
};

/**
 * Qué practicó un adulto según su tope físico (escala 0..100): más tope, más probable que haya llegado lejos.
 * Se tira de arriba abajo: profesional, federado, aficionado.
 */
export function practicaSegunTope(tope: number, rng: Rng): Practica {
  const z = (tope - 79) / 9;
  const prob = (base: number, pendiente: number, max: number) => Math.min(max, Math.max(0.01, base + pendiente * z));
  if (rng.chance(prob(0.03, 0.04, 0.2))) return 'profesional';
  if (rng.chance(prob(0.12, 0.08, 0.4))) return 'federado';
  if (rng.chance(prob(0.3, 0.05, 0.5))) return 'aficionado';
  return 'ninguna';
}

/**
 * Ventaja inicial de un niño por el deporte de sus padres (se criaron entre zapatillas): multiplica su nivel
 * de partida. De 0,95 (ninguno de los dos) a 1,10 (los dos profesionales).
 */
export function ventajaDeCrianza(padre: Practica, madre: Practica): number {
  return 0.95 + 0.025 * (NIVEL_PRACTICA[padre] + NIVEL_PRACTICA[madre]);
}
