import { describe, expect, it } from 'vitest';
import { simulate } from './index';

describe('simulación rápida', () => {
  it('todas las estrategias juegan 4 semanas sin romper nada', () => {
    const out = simulate({ days: 28, seeds: 1 });
    const integridad = out.checks.find((c) => c.name === 'Invariantes y bloqueos')!;
    expect(integridad.level, integridad.detail).toBe('ok');
    expect(out.checks.filter((c) => c.level === 'fallo')).toEqual([]);
  });
});
