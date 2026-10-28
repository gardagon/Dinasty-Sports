import { describe, expect, it } from 'vitest';
import type { Rng } from './rng';
import { DIFERENCIA_MAXIMA_DE_EDAD, apellidosDeFamilia, apellidosDePadres, diferenciasDeEdad, identidadDeJugador, numeroDeHermanos } from './hermanos';

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

describe('apellidos de la familia', () => {
  it('cada progenitor tiene dos apellidos, los cuatro son distintos y los hijos llevan el primero de cada uno', () => {
    for (let semilla = 1; semilla <= 200; semilla++) {
      const { padre, madre } = apellidosDePadres(semilla);
      expect(new Set([...padre, ...madre]).size).toBe(4);
      expect(apellidosDeFamilia(semilla)).toBe(`${padre[0]} ${madre[0]}`);
      expect(apellidosDePadres(semilla)).toEqual({ padre, madre }); // estable
    }
  });
});

describe('identidad del personaje al crear la partida', () => {
  it('lleva el primer apellido del padre y de la madre, en el orden que se elija, y es estable', () => {
    for (let semilla = 1; semilla <= 200; semilla++) {
      const { padre, madre } = apellidosDePadres(semilla);
      const a = identidadDeJugador(semilla, 'padre');
      const b = identidadDeJugador(semilla, 'madre');
      expect(a).toMatchObject({ delPadre: padre[0], delMadre: madre[0], apellidos: `${padre[0]} ${madre[0]}` });
      expect(b.apellidos).toBe(`${madre[0]} ${padre[0]}`);
      expect(a.nombre).toBe(b.nombre);
      expect(a.completo).toBe(`${a.nombre} ${a.apellidos}`);
      expect(identidadDeJugador(semilla)).toEqual(a);
    }
  });

  it('otra semilla cambia el nombre y los apellidos (volver a sortear), con variedad', () => {
    const nombres = new Set<string>();
    const apellidos = new Set<string>();
    for (const semilla of [...Array.from({ length: 300 }, (_, k) => k + 1), 0x7ffffffe, 2 ** 31 - 1, 123456789, 987654321, 2000000000]) {
      const i = identidadDeJugador(semilla);
      nombres.add(i.nombre);
      apellidos.add(i.delPadre);
      apellidos.add(i.delMadre);
      expect(i.delPadre).not.toBe(i.delMadre);
      expect(i.nombre, `semilla ${semilla}`).toMatch(/^\p{L}+$/u);
    }
    expect(nombres.size).toBeGreaterThan(15);
    expect(apellidos.size).toBe(12);
  });
});
