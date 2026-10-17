import { describe, expect, it } from 'vitest';
import { Game, advanceTo } from '@ds/core';
import { personaje } from '@ds/mod-personaje';
import { atletismo, type AtletismoState } from './index';

const nueva = () => Game.create([personaje, atletismo], { seed: 5 });

describe('módulo atletismo', () => {
  it('compite contra rivales genéricos si no hay NPCs', () => {
    const g = nueva();
    advanceTo(g, 'gen.descansar', 5, 10);
    const r = g.perform('atletismo.carrera');
    expect(r.ok).toBe(true);
    const s = g.moduleState<AtletismoState>('atletismo');
    expect(s.carreras).toHaveLength(1);
    expect(s.carreras[0].total).toBe(8);
    expect(s.mejorMarca).not.toBeNull();
    expect(g.preview('atletismo.carrera')!.available).toBe(false);
  });

  it('solo se entrena en horario', () => {
    const g = nueva();
    advanceTo(g, 'gen.descansar', 0, 10);
    expect(g.preview('atletismo.series')!.available).toBe(false);
    advanceTo(g, 'gen.descansar', 0, 16);
    expect(g.preview('atletismo.series')!.available).toBe(true);
  });

  it('la tercera sesión del día sufre sobrecarga', () => {
    const g = nueva();
    advanceTo(g, 'gen.descansar', 5, 8);
    g.perform('atletismo.tecnica');
    g.perform('atletismo.tecnica');
    const tercera = g.preview('atletismo.tecnica')!;
    expect(tercera.modifiers.some((m) => m.id === 'atletismo.sobrecarga')).toBe(true);
  });
});
