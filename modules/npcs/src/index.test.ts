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
    expect(dir.list().length).toBe(7);
    expect(dir.list({ tag: 'atleta' })).toHaveLength(3);
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
});
