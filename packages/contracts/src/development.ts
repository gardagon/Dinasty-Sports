/**
 * Desarrollo con la edad: cuánto de su techo adulto ha alcanzado el cuerpo. Es compartido porque lo usan
 * el personaje (techo de sus capacidades físicas) y los NPCs (nivel máximo que pueden tener a cada edad):
 * así nadie, jugador o rival, alcanza su potencial antes de madurar.
 */

/** Fracción de la capacidad adulta alcanzable a cada edad (edad en años, valores aproximados). */
const MADUREZ: readonly (readonly [number, number])[] = [
  [6, 0.3],
  [8, 0.38],
  [10, 0.52],
  [12, 0.66],
  [14, 0.8],
  [16, 0.93],
  [18, 1],
];

/** 0..1. Por debajo de 6 años vale lo de 6; a partir de 18, 1. */
export function madurezPorEdad(edad: number): number {
  if (edad <= MADUREZ[0][0]) return MADUREZ[0][1];
  for (let i = 1; i < MADUREZ.length; i++) {
    if (edad <= MADUREZ[i][0]) {
      const [x0, y0] = MADUREZ[i - 1];
      const [x1, y1] = MADUREZ[i];
      return y0 + ((y1 - y0) * (edad - x0)) / (x1 - x0);
    }
  }
  return 1;
}
