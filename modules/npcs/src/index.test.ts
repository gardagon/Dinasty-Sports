import { describe, expect, it } from 'vitest';
import { SERVICES, madurezPorEdad, type NpcDirectory } from '@ds/contracts';
import { Game, advanceTo, advanceUntil } from '@ds/core';
import { personaje } from '@ds/mod-personaje';
import { npcs, type NpcsState } from './index';

const nueva = () => Game.create([personaje, npcs], { seed: 9 });

describe('módulo NPCs', () => {
  it('genera un reparto y lo publica como servicio', () => {
    const g = nueva();
    const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
    expect(dir.list().length).toBe(100); // 4 del entorno + 8 rivales por cada edad de 8 a 19
    expect(dir.list({ tag: 'atleta' })).toHaveLength(96);
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

  describe('rivales por edad', () => {
    const rivales = (g: Game) => g.moduleState<NpcsState>('npcs').npcs.filter((n) => n.role === 'rival');
    const dir = (g: Game) => g.service<NpcDirectory>(SERVICES.npcs)!;

    it('hay 8 rivales por cada edad de 8 a 19, desconocidos al principio y con nombres únicos', () => {
      const g = nueva();
      for (let edad = 8; edad <= 19; edad++) {
        expect(dir(g).list({ tag: 'atleta', minAge: edad, maxAge: edad })).toHaveLength(8);
      }
      expect(dir(g).list({ tag: 'atleta', minAge: 20 })).toHaveLength(0);
      expect(rivales(g).every((n) => n.known === false)).toBe(true);
      expect(new Set(rivales(g).map((n) => n.name)).size).toBe(rivales(g).length);
    });

    it('nadie supera el techo de su edad: potencial × desarrollo', () => {
      const g = nueva();
      advanceTo(g, 'gen.descansar', 6, 20);
      for (const n of rivales(g)) {
        const edad = (g.time.day - n.nacimiento!) / 365;
        const techo = n.potential.atletismo * (0.3 + 0.7 * madurezPorEdad(edad + (n.desfase ?? 0)));
        expect(n.levels.atletismo).toBeLessThanOrEqual(techo + 1e-6);
      }
    });

    it('los más jóvenes están lejos de su potencial y los mayores cerca', () => {
      const g = nueva();
      const media = (edad: number) => {
        const xs = dir(g).list({ tag: 'atleta', minAge: edad, maxAge: edad });
        return xs.reduce((a, n) => a + n.levels.atletismo, 0) / xs.length;
      };
      expect(media(8)).toBeLessThan(media(12));
      expect(media(12)).toBeLessThan(media(18));
      expect(media(8)).toBeLessThan(50);
    });

    it('cada curso se van los mayores y entran niños nuevos', () => {
      const g = nueva();
      const idsAntes = new Set(rivales(g).map((n) => n.id));
      advanceUntil(g, 'gen.descansar', (t) => t.schoolYear >= 1, 20000);
      const despues = rivales(g);
      // Los cumpleaños están repartidos por el año: justo tras el relevo cada edad tiene ~8, y no hay nadie de 20 o más.
      for (let edad = 8; edad <= 19; edad++) {
        const n = dir(g).list({ tag: 'atleta', minAge: edad, maxAge: edad }).length;
        expect(n).toBeGreaterThanOrEqual(6);
        expect(n).toBeLessThanOrEqual(10);
      }
      // El curso tiene 364 días y los años de edad 365: puede quedar algún rival de más en una edad, nunca de menos.
      expect(despues.length).toBeGreaterThanOrEqual(96);
      expect(despues.length).toBeLessThanOrEqual(100);
      expect(dir(g).list({ tag: 'atleta', minAge: 21 })).toHaveLength(0);
      // Se han ido los de 19 años y han entrado niños de 8 que antes no estaban.
      expect(despues.filter((n) => !idsAntes.has(n.id)).length).toBeGreaterThanOrEqual(8);
      expect(despues.filter((n) => idsAntes.has(n.id)).length).toBeLessThan(96);
    });
  });
});
