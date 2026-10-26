import type { Rng } from './rng';

/**
 * Hermanos del personaje: reglas puras compartidas por el módulo que los crea (`npcs`) y el que enseña a la familia (`familia`).
 * Los hermanos se generan con el mismo proceso de herencia que el personaje, a partir de los mismos padres.
 */

const APELLIDOS = ['García', 'Martín', 'López', 'Sánchez', 'Romero', 'Navarro', 'Torres', 'Domínguez', 'Vázquez', 'Ramos', 'Gil', 'Serrano'];

/** Los dos apellidos de la familia, siempre los mismos para una semilla (así los pueden usar varios módulos sin depender uno del otro). */
export function apellidosDeFamilia(seed: number): string {
  // Mezcla barata de la semilla: dos índices distintos y estables.
  let h = (seed ^ 0x9e3779b1) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  const a = h % APELLIDOS.length;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  const b = h % APELLIDOS.length;
  return `${APELLIDOS[a]} ${APELLIDOS[b]}`;
}

/** Probabilidad de tener 0, 1, 2 o 3 hermanos. */
export const PESOS_DE_HERMANOS: readonly number[] = [0.2, 0.45, 0.25, 0.1];

/** Diferencia máxima de edad con el personaje (años), por arriba y por abajo. */
export const DIFERENCIA_MAXIMA_DE_EDAD = 6;

/** Probabilidad de que un hermano sea mellizo (misma edad) del personaje; solo puede haber uno. */
export const PROBABILIDAD_DE_MELLIZO = 0.04;

export function numeroDeHermanos(rng: Rng): number {
  let x = rng.next();
  for (let n = 0; n < PESOS_DE_HERMANOS.length; n++) {
    x -= PESOS_DE_HERMANOS[n];
    if (x < 0) return n;
  }
  return PESOS_DE_HERMANOS.length - 1;
}

/**
 * Diferencias de edad con el personaje de `n` hermanos (negativo: mayor; positivo: menor). Sin repetir, salvo un mellizo
 * (diferencia 0) con poca probabilidad.
 */
export function diferenciasDeEdad(n: number, rng: Rng): number[] {
  const usadas = new Set<number>();
  const lista: number[] = [];
  for (let i = 0; i < n; i++) {
    let d = 0;
    if (!usadas.has(0) && rng.chance(PROBABILIDAD_DE_MELLIZO)) d = 0;
    else {
      do d = rng.int(-DIFERENCIA_MAXIMA_DE_EDAD, DIFERENCIA_MAXIMA_DE_EDAD);
      while (d === 0 || usadas.has(d));
    }
    usadas.add(d);
    lista.push(d);
  }
  return lista;
}
