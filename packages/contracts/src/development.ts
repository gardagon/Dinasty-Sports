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


/**
 * Curvas de desarrollo y envejecimiento por categoría. Dan, a cada edad, qué fracción del tope genético se puede tener:
 * crece hasta el pico, se mantiene en la meseta y después baja. Es un dato (otro deporte u otro país podría tener otras).
 *
 * - físico: llega al máximo hacia los 22 y se mantiene hasta los 27 (los velocistas y los futbolistas rinden al máximo entre los
 *   23 y los 26), después baja con más fuerza a partir de los 30.
 * - técnico (habilidades deportivas): máximo hacia los 24 y meseta hasta los 32; cae más despacio que lo físico porque la
 *   experiencia compensa.
 * - mental: sigue subiendo más allá de los 28 hasta los 30 y se mantiene hasta los 55; el envejecimiento llega mucho más tarde y es mínimo.
 * - social: máximo hacia los 30 y casi sin bajada.
 */
export type CategoriaEdad = 'fisico' | 'tecnico' | 'mental' | 'social';

type Curva = readonly (readonly [number, number])[];

export const CURVAS_POR_EDAD: Record<CategoriaEdad, Curva> = {
  fisico: [[8, 0.3], [10, 0.42], [12, 0.55], [14, 0.68], [16, 0.82], [18, 0.91], [20, 0.96], [22, 1], [27, 1], [30, 0.97], [35, 0.9], [40, 0.82], [50, 0.68], [60, 0.55], [70, 0.45], [90, 0.3]],
  tecnico: [[8, 0.3], [10, 0.42], [12, 0.55], [14, 0.68], [16, 0.82], [18, 0.91], [20, 0.94], [24, 1], [32, 1], [40, 0.93], [50, 0.82], [60, 0.7], [70, 0.58], [90, 0.4]],
  mental: [[8, 0.3], [10, 0.42], [12, 0.55], [14, 0.68], [16, 0.82], [18, 0.91], [22, 0.96], [30, 1], [55, 1], [60, 0.98], [70, 0.92], [80, 0.82], [90, 0.7]],
  social: [[8, 0.3], [10, 0.42], [12, 0.55], [14, 0.68], [16, 0.82], [18, 0.91], [22, 0.96], [30, 1], [60, 1], [70, 0.96], [80, 0.9], [90, 0.8]],
};

/**
 * Nivel TÍPICO de una capacidad genérica a cada edad (0–100). Es la referencia de "para su edad": un niño de 8 con 12 en
 * inteligencia es normal para su edad, como un adulto con 55. Las fórmulas que miran el nivel de las capacidades (techo y
 * velocidad de las asignaturas y habilidades) lo comparan con este valor y no con el absoluto.
 */
export const NIVEL_TIPICO_DE_REFERENCIA = 40;
const NIVEL_TIPICO_POR_EDAD: readonly (readonly [number, number])[] = [
  [8, 12.5],
  [10, 17],
  [12, 22],
  [14, 27],
  [16, 32],
  [18, 36],
  [24, 40],
  [30, 42],
  [90, 42],
];
/**
 * Plasticidad de la infancia: multiplicador de la velocidad con la que suben las capacidades genéricas. Un niño aprende y se
 * desarrolla más rápido que un adulto: ×3 a los 8 años, bajando hasta ×1 a los 16.
 */
export function plasticidadPorEdad(edad: number): number {
  return 1 + 2 * Math.min(1, Math.max(0, (16 - edad) / 8));
}

/** Nivel típico al empezar la partida (8 años): el rango inicial de las capacidades se centra aquí. */
export const NIVEL_TIPICO_INICIAL = 12.5;

export function nivelTipicoPorEdad(edad: number): number {
  const c = NIVEL_TIPICO_POR_EDAD;
  if (edad <= c[0][0]) return c[0][1];
  for (let i = 1; i < c.length; i++) {
    if (edad <= c[i][0]) {
      const [x0, y0] = c[i - 1];
      const [x1, y1] = c[i];
      return y0 + ((y1 - y0) * (edad - x0)) / (x1 - x0);
    }
  }
  return c[c.length - 1][1];
}

/** Fracción del tope genético alcanzable a una edad, para una categoría (0..1). Antes de la primera edad vale lo de esa edad. */
export function factorPorEdad(categoria: CategoriaEdad, edad: number): number {
  const c = CURVAS_POR_EDAD[categoria];
  if (edad <= c[0][0]) return c[0][1];
  for (let i = 1; i < c.length; i++) {
    if (edad <= c[i][0]) {
      const [x0, y0] = c[i - 1];
      const [x1, y1] = c[i];
      return y0 + ((y1 - y0) * (edad - x0)) / (x1 - x0);
    }
  }
  return c[c.length - 1][1];
}
