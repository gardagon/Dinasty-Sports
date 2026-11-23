/**
 * EL SUEÑO (`docs/relevo/dormir.md`, decisiones del 23/11): cuánto necesita dormir una persona según su edad, y (fase 2) la deuda de sueño que deja dormir menos.
 * Reglas puras: las usa el personaje y, en la fase 3, cualquier PNJ con estado. Cifras provisionales.
 */

/** La hora a la que se levanta uno un día de clase: la de «Hasta las 7:00». */
export const HORA_DE_LEVANTARSE = 7;

/**
 * Horas de sueño que necesita una persona de esa edad para estar descansada (interpolación lineal entre estos puntos). Provisional; el 7 de un adulto es del usuario.
 * Las recomendaciones habituales (AASM 2016, NSF 2015): 9–12 h de 6 a 12 años, 8–10 de 13 a 18, 7 o más de adulto.
 */
const NECESIDAD_POR_EDAD: readonly (readonly [edad: number, horas: number])[] = [
  [8, 9.5],
  [12, 9],
  [15, 9],
  [18, 8],
  [22, 7],
  [65, 7],
  [75, 7.5],
];

export function necesidadDeSueno(edad: number): number {
  const t = NECESIDAD_POR_EDAD;
  if (edad <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) {
    if (edad <= t[i][0]) {
      const [e0, h0] = t[i - 1];
      const [e1, h1] = t[i];
      return h0 + ((h1 - h0) * (edad - e0)) / (e1 - e0);
    }
  }
  return t[t.length - 1][1];
}

// ---------------------------------------------------------------------------------------------------- la deuda de sueño (fase 2)

/** La deuda máxima, en horas. */
export const DEUDA_DE_SUENO_MAX = 10;
/** Lo que se recupera como mucho de la deuda en una noche, en horas: dormir doce horas tras trasnochar no abona más. */
export const TOPE_DE_RECUPERACION_POR_NOCHE = 2;
/** Una siesta recupera como mucho esto de deuda al día, en horas (decidido el 23/11). */
export const TOPE_DE_SIESTA_AL_DIA = 0.5;
/** De la deuda no se nota la primera hora: quedarse corto una noche no pasa factura. */
export const MARGEN_DE_DEUDA = 1;
/** La deuda a partir de la cual se nota (se avisa con una sensación y salen los sucesos de sueño). */
export const DEUDA_QUE_SE_NOTA = 2;

/** La deuda tras una noche en la que se necesitaba `necesidad` horas y se durmieron `dormidas`: sube con lo que falta y baja con lo que sobra (con tope por noche). */
export function pasoDeSuenoDeLaNoche(deuda: number, necesidad: number, dormidas: number): number {
  const falta = necesidad - dormidas;
  const cambio = falta >= 0 ? falta : Math.max(falta, -TOPE_DE_RECUPERACION_POR_NOCHE);
  return Math.min(DEUDA_DE_SUENO_MAX, Math.max(0, deuda + cambio));
}

/** La deuda que cuenta para los efectos (hasta 8 h: más no empeora). */
export const deudaEfectiva = (deuda: number): number => Math.min(8, Math.max(0, deuda - MARGEN_DE_DEUDA));

/** Lo máximo que se llena la energía al despertar con esa deuda: 100 sin deuda y hasta −32 con mucha. Es el único malus activo del sueño atrasado. */
export const topeDeEnergiaAlDespertar = (deuda: number): number => 100 - 4 * deudaEfectiva(deuda);

/**
 * PREPARADO PARA LA SALUD Y LAS LESIONES (E12), SIN ACTIVAR (decidido el 23/11; cifras de `docs/relevo/dormir.md` §3.3, provisionales). Nadie lo llama todavía:
 * - `factorPorSueno`: lo que rinde con esa deuda; `a` = 0,02 para concentración y estudio y 0,015 para el deporte. Cabe en `eficienciaDeEstado` (personaje y PNJ).
 * - `fatigaPorSueno`: lo que suma a `fatigaDeLaSemana` (y por tanto al riesgo de lesión).
 */
export const factorPorSueno = (deuda: number, a = 0.02): number => 1 - a * deudaEfectiva(deuda);
export const fatigaPorSueno = (deuda: number): number => 4 * deuda;
