import { describe, expect, it } from 'vitest';
import { necesidadDeSueno } from './sueno';

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
