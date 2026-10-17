import { describe, expect, it } from 'vitest';
import { GEN } from '@ds/contracts';
import { Game, advanceUntil } from '@ds/core';
import { personaje } from './index';

describe('módulo personaje (gen)', () => {
  it('funciona solo, sin ningún otro módulo', () => {
    const g = Game.create([personaje], { seed: 1 });
    expect(g.stat(GEN.energia)).toBe(90);
    expect(g.availableActions().length).toBeGreaterThan(0);
  });

  it('dormir recupera energía según las horas', () => {
    const g = Game.create([personaje], { seed: 1 });
    for (let i = 0; i < 3; i++) g.perform('gen.gimnasio');
    const antes = g.stat(GEN.energia);
    advanceUntil(g, 'gen.descansar', (t) => t.hour === 22);
    g.perform('gen.dormir');
    expect(g.time.hour).toBe(7);
    expect(g.stat(GEN.energia)).toBeGreaterThan(antes);
  });

  it('el cansancio reduce la eficiencia', () => {
    const g = Game.create([personaje], { seed: 1 });
    advanceUntil(g, 'gen.descansar', (t) => t.hour === 15);
    const fresco = g.preview('gen.gimnasio')!.efficiency;
    for (let i = 0; i < 4; i++) g.perform('gen.gimnasio');
    expect(g.stat(GEN.energia)).toBeLessThan(35);
    const cansado = g.preview('gen.gimnasio')!;
    expect(cansado.efficiency).toBeLessThan(fresco);
    expect(cansado.modifiers.some((m) => m.id === 'gen.cansancio')).toBe(true);
  });
});
