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
