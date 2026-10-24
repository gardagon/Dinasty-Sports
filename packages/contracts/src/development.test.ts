import { describe, expect, it } from 'vitest';
import { CURVAS_POR_EDAD, factorPorEdad, type CategoriaEdad } from './development';

const categorias = Object.keys(CURVAS_POR_EDAD) as CategoriaEdad[];
const edades = Array.from({ length: 83 }, (_, i) => 8 + i);

describe('curvas de desarrollo por edad', () => {
  it('siempre valen entre 0 y 1 y llegan a 1 en su pico', () => {
    for (const c of categorias) {
      for (const e of edades) {
        expect(factorPorEdad(c, e)).toBeGreaterThan(0);
        expect(factorPorEdad(c, e)).toBeLessThanOrEqual(1);
      }
      expect(Math.max(...edades.map((e) => factorPorEdad(c, e)))).toBe(1);
    }
  });

  it('crecen hasta el pico y no suben después', () => {
    for (const c of categorias) {
      const pico = edades.find((e) => factorPorEdad(c, e) === 1)!;
      for (let e = 8; e < pico; e++) expect(factorPorEdad(c, e + 1)).toBeGreaterThanOrEqual(factorPorEdad(c, e));
      for (let e = pico; e < 90; e++) expect(factorPorEdad(c, e + 1)).toBeLessThanOrEqual(factorPorEdad(c, e) + 1e-9);
    }
  });

  it('el pico físico está entre los 21 y los 25 años, no a los 18', () => {
    const pico = edades.find((e) => factorPorEdad('fisico', e) === 1)!;
    expect(pico).toBeGreaterThanOrEqual(21);
    expect(pico).toBeLessThanOrEqual(25);
    expect(factorPorEdad('fisico', 18)).toBeLessThan(1);
  });

  it('lo físico baja antes y más que lo técnico, y lo mental y lo social casi no bajan', () => {
    expect(factorPorEdad('fisico', 40)).toBeLessThan(factorPorEdad('tecnico', 40));
    expect(factorPorEdad('tecnico', 40)).toBeLessThan(factorPorEdad('mental', 40));
    expect(factorPorEdad('fisico', 50)).toBeLessThan(0.75);
    expect(factorPorEdad('mental', 50)).toBe(1);
    expect(factorPorEdad('social', 50)).toBe(1);
  });

  it('lo mental sigue subiendo más allá de los 28', () => {
    expect(factorPorEdad('mental', 28)).toBeLessThan(factorPorEdad('mental', 30));
    expect(factorPorEdad('mental', 30)).toBe(1);
  });
});
