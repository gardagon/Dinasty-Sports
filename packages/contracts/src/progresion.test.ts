import { describe, expect, it } from 'vitest';
import { computeGain, computeGainVarias } from './progresion';
import type { StatDef } from './stats';

const def = (curve: number): StatDef => ({ id: 'x.y', name: 'Y', category: 'habilidad', initial: 5, growth: { rate: 0.36, curve } }) as StatDef;
const entrada = (value: number, cap = 60) => ({ value, min: 0, max: 100, cap, talent: 1.1, speed: 0.9, efficiency: 1, amount: 2 });

/** Aplicar `veces` prácticas seguidas, una a una, con `computeGain`. */
function unaAUna(d: StatDef, value: number, veces: number, cap = 60): number {
  let v = value;
  for (let i = 0; i < veces; i++) v += computeGain(d, entrada(v, cap));
  return v - value;
}

describe('varias prácticas seguidas de golpe', () => {
  for (const curve of [1.5, 2, 2.5, 1]) {
    for (const [valor, veces] of [[8, 8], [20, 8], [35, 16], [10, 2]] as const) {
      it(`da lo mismo que una a una (curva ${curve}, desde ${valor}, ${veces} veces): diferencia < 4 %`, () => {
        const d = def(curve);
        const exacto = unaAUna(d, valor, veces);
        const junto = computeGainVarias(d, entrada(valor), veces);
        expect(Math.abs(junto - exacto)).toBeLessThan(Math.max(0.02, exacto * 0.04));
      });
    }
  }

  it('con una vez es la ganancia de siempre, y nunca pasa del techo', () => {
    const d = def(1.5);
    expect(computeGainVarias(d, entrada(10), 1)).toBe(computeGain(d, entrada(10)));
    expect(computeGainVarias(d, entrada(59), 500)).toBeLessThanOrEqual(1 + 1e-9);
    expect(computeGainVarias(d, entrada(60), 5)).toBe(0);
  });

  it('sumar las cantidades en una sola práctica sobrestima la subida (ignora los rendimientos decrecientes de dentro): por eso existe', () => {
    const d = def(1.5);
    const sumado = computeGain(d, { ...entrada(20), amount: 2 * 16 });
    const exacto = unaAUna(d, 20, 16);
    expect(sumado).toBeGreaterThan(exacto * 1.05);
    expect(computeGainVarias(d, entrada(20), 16)).toBeLessThan(sumado);
  });
});
