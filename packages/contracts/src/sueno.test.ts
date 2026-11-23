import { describe, expect, it } from 'vitest';
import { TOPE_DE_RECUPERACION_POR_NOCHE, deudaEfectiva, necesidadDeSueno, pasoDeSuenoDeLaNoche, topeDeEnergiaAlDespertar } from './sueno';

describe('necesidad de sueño por edad', () => {
  it('9,5 h a los 8 años, bajando hasta 7 h desde los 22', () => {
    expect(necesidadDeSueno(8)).toBe(9.5);
    expect(necesidadDeSueno(22)).toBe(7);
    expect(necesidadDeSueno(40)).toBe(7);
  });
  it('nunca sube con la edad hasta los 65 y no tiene saltos', () => {
    let previa = necesidadDeSueno(6);
    for (let e = 6; e <= 65; e += 0.25) {
      const n = necesidadDeSueno(e);
      expect(n).toBeLessThanOrEqual(previa + 1e-9);
      expect(previa - n).toBeLessThan(0.2);
      previa = n;
    }
  });
});

describe('la deuda de sueño', () => {
  it('sube con lo que falta, baja con lo que sobra y tiene tope por noche y máximo', () => {
    expect(pasoDeSuenoDeLaNoche(0, 7, 5)).toBe(2);
    expect(pasoDeSuenoDeLaNoche(2, 7, 7)).toBe(2);
    expect(pasoDeSuenoDeLaNoche(5, 7, 12)).toBe(5 - TOPE_DE_RECUPERACION_POR_NOCHE);
    expect(pasoDeSuenoDeLaNoche(0.5, 7, 12)).toBe(0);
    expect(pasoDeSuenoDeLaNoche(9, 9.5, 4)).toBe(10);
  });
  it('la primera hora no se nota y la energía máxima baja con la deuda efectiva', () => {
    expect(deudaEfectiva(1)).toBe(0);
    expect(topeDeEnergiaAlDespertar(0.8)).toBe(100);
    expect(topeDeEnergiaAlDespertar(5)).toBe(84);
    expect(topeDeEnergiaAlDespertar(10)).toBe(100 - 4 * 8);
  });
});
