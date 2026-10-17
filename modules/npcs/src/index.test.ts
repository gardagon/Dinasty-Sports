import { describe, expect, it } from 'vitest';
import { SERVICES, type NpcDirectory } from '@ds/contracts';
import { Game, advanceTo } from '@ds/core';
import { personaje } from '@ds/mod-personaje';
import { npcs, type NpcsState } from './index';

const nueva = () => Game.create([personaje, npcs], { seed: 9 });

describe('módulo NPCs', () => {
  it('genera un reparto y lo publica como servicio', () => {
    const g = nueva();
    const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
    expect(dir.list().length).toBe(20);
    expect(dir.list({ tag: 'atleta' })).toHaveLength(16);
    expect(dir.get('entrenador')?.role).toBe('entrenador');
  });

  it('quedar con un compañero sube la afinidad y solo una vez al día', () => {
    const g = nueva();
    advanceTo(g, 'gen.descansar', 5, 11);
    const id = 'npcs.quedar.companero_social';
    const antes = g.moduleState<NpcsState>('npcs').npcs.find((n) => n.id === 'companero_social')!.affinity;
    expect(g.perform(id).ok).toBe(true);
    const despues = g.moduleState<NpcsState>('npcs').npcs.find((n) => n.id === 'companero_social')!.affinity;
    expect(despues).toBeGreaterThan(antes);
    expect(g.preview(id)!.available).toBe(false);
  });

  it('los rivales progresan con los días', () => {
    const g = nueva();
    const nivel = () => g.service<NpcDirectory>(SERVICES.npcs)!.get('rival_1')!.levels.atletismo;
    const antes = nivel();
    advanceTo(g, 'gen.descansar', 6, 20);
    expect(nivel()).toBeGreaterThan(antes);
  });

  it('los rivales son distintos entre sí: unos parten con ventaja y otros con más potencial', () => {
    const rivales = nueva().moduleState<NpcsState>('npcs').npcs.filter((n) => n.role === 'rival');
    const niveles = rivales.map((n) => n.levels.atletismo);
    const potenciales = rivales.map((n) => n.potential.atletismo);
    const ritmos = rivales.map((n) => n.ritmo?.atletismo ?? 1);
    expect(Math.max(...niveles) - Math.min(...niveles)).toBeGreaterThan(8);
    expect(Math.max(...potenciales) - Math.min(...potenciales)).toBeGreaterThan(15);
    expect(Math.max(...ritmos) - Math.min(...ritmos)).toBeGreaterThan(0.2);
    expect(new Set(rivales.map((n) => n.name)).size).toBe(rivales.length);
  });
});
