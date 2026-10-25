import { describe, expect, it } from 'vitest';
import type { Rng } from './rng';
import { DIFERENCIA_MAXIMA_DE_EDAD, apellidosDeFamilia, diferenciasDeEdad, numeroDeHermanos } from './hermanos';

function createRng(semilla: number): Rng {
  let s = semilla | 0 || 1;
  const next = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
  return {
    next,
    int: (a, b) => a + Math.floor(next() * (b - a + 1)),
    range: (a, b) => a + next() * (b - a),
    chance: (p) => next() < p,
    pick: (xs) => xs[Math.floor(next() * xs.length)],
    normal: () => {
      let t = 0;
      for (let i = 0; i < 12; i++) t += next();
      return t - 6;
    },
  };
}

describe('hermanos (reglas puras)', () => {
  it('los apellidos de una familia salen de la semilla y son estables', () => {
    expect(apellidosDeFamilia(5)).toBe(apellidosDeFamilia(5));
    expect(new Set(Array.from({ length: 50 }, (_, i) => apellidosDeFamilia(i))).size).toBeGreaterThan(20);
    expect(apellidosDeFamilia(1).split(' ')).toHaveLength(2);
  });

  it('el número de hermanos reparte 0, 1, 2 y 3 como 20 %, 45 %, 25 % y 10 %', () => {
    const rng = createRng(3);
    const cuenta = [0, 0, 0, 0];
    const N = 8000;
    for (let i = 0; i < N; i++) cuenta[numeroDeHermanos(rng)]++;
    [0.2, 0.45, 0.25, 0.1].forEach((p, n) => expect(Math.abs(cuenta[n] / N - p)).toBeLessThan(0.03));
  });

  it('las diferencias de edad están en ±6, no se repiten y como mucho hay un mellizo', () => {
    const rng = createRng(11);
    for (let i = 0; i < 500; i++) {
      const ds = diferenciasDeEdad(3, rng);
      expect(ds).toHaveLength(3);
      expect(new Set(ds).size).toBe(3);
      expect(ds.filter((d) => d === 0).length).toBeLessThanOrEqual(1);
      for (const d of ds) expect(Math.abs(d)).toBeLessThanOrEqual(DIFERENCIA_MAXIMA_DE_EDAD);
    }
  });
});
