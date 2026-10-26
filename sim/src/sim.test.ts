import { describe, expect, it } from 'vitest';
import { BOTS } from './bots';
import { runBot } from './runner';
import { simulate } from './index';

describe('simulación rápida', () => {
  it('todas las estrategias juegan 4 semanas sin romper nada', () => {
    const out = simulate({ days: 28, seeds: 1 });
    const integridad = out.checks.find((c) => c.name === 'Invariantes y bloqueos')!;
    expect(integridad.level, integridad.detail).toBe('ok');
    expect(out.checks.filter((c) => c.level === 'fallo')).toEqual([]);
  }, 30_000);

  it('un bot que destaca acepta subir de categoría y compite contra mayores', () => {
    const bot = BOTS.find((b) => b.id === 'atleta')!;
    const carrerasArriba = [1, 2].map((semilla) => runBot(bot, semilla, 1095).extras.carrerasSuperior ?? 0);
    expect(Math.max(...carrerasArriba)).toBeGreaterThan(0);
  }, 60_000);
});
