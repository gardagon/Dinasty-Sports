import { describe, expect, it } from 'vitest';
import { SERVICES, type NpcDirectory, type RelationsService } from '@ds/contracts';
import { Game, advanceTo } from '@ds/core';
import { personaje } from '@ds/mod-personaje';
import { npcs } from '@ds/mod-npcs';
import type { IdentidadState } from '@ds/mod-personaje';
import { relaciones, type RelacionesState } from './index';

const nueva = () => Game.create([personaje, npcs, relaciones], { seed: 9 });
const rel = (g: Game) => g.service<RelationsService>(SERVICES.relaciones)!;

describe('módulo relaciones', () => {
  it('el reparto empieza como conocido y los rivales, sin conocer', () => {
    const g = nueva();
    expect(rel(g).get('entrenador')).toMatchObject({ estado: 'conocido', afinidad: 0, nivel: 0 });
    expect(rel(g).get('rival_1')).toBeUndefined();
    expect(rel(g).list().map((v) => v.npcId)).toContain('companero_social');
    expect(rel(g).list().some((v) => v.npcId === 'rival_1')).toBe(false);
  });

  it('quedar con un compañero sube la afinidad y solo una vez al día', () => {
    const g = nueva();
    advanceTo(g, 'gen.descansar', 5, 11);
    const id = 'relaciones.quedar.companero_social';
    expect(g.perform(id).ok).toBe(true);
    expect(rel(g).get('companero_social')!.afinidad).toBeGreaterThan(0);
    expect(rel(g).get('companero_social')!.confianza).toBeGreaterThan(0);
    expect(g.preview(id)!.available).toBe(false);
  });

  it('quedando casi a diario se llega a ser amigo, y sin verse se enfría', () => {
    const g = nueva();
    const id = 'relaciones.quedar.companero_social';
    for (let dia = 0; dia < 20; dia++) {
      advanceTo(g, 'gen.descansar', (g.time.weekday + 1) % 7, 16);
      if (g.preview(id)?.available === true) g.perform(id);
    }
    expect(['amigo', 'mejor_amigo']).toContain(rel(g).get('companero_social')!.estado);
    const alto = rel(g).get('companero_social')!.afinidad;
    for (let i = 0; i < 90; i++) advanceTo(g, 'gen.descansar', (g.time.weekday + 1) % 7, 8);
    expect(rel(g).get('companero_social')!.afinidad).toBeLessThan(alto);
    expect(rel(g).get('companero_social')!.afinidad).toBeGreaterThanOrEqual(0);
  });

  it('sin contacto no hay vínculos guardados: el estado conocido es implícito', () => {
    expect(nueva().moduleState<RelacionesState>('relaciones').vinculos).toEqual({});
  });

  describe('compatibilidad', () => {
    const conPerfil = (intereses: Record<string, number>) => {
      const guardado = nueva().serialize();
      (guardado.modules.gen as IdentidadState).perfil.intereses = intereses;
      return Game.load([personaje, npcs, relaciones], guardado);
    };
    const factor = (g: Game, accion: string) => {
      advanceTo(g, 'gen.descansar', 5, 11);
      return g.preview(accion)!.modifiers.find((m) => m.id === 'relaciones.compatibilidad')?.result.efficiency ?? 1;
    };

    it('con quien comparte intereses lo que sube la afinidad rinde más que con quien no', () => {
      const ninguno = conPerfil({ cocina: 10 });
      const n = ninguno.service<NpcDirectory>(SERVICES.npcs)!.get('companero_social')!;
      const suyos = Object.fromEntries(Object.keys(n.rasgos!.intereses).map((id) => [id, 90]));
      const igual = conPerfil(suyos);
      const accion = 'relaciones.quedar.companero_social';
      expect(factor(igual, accion)).toBeGreaterThan(factor(ninguno, accion));
      expect(factor(igual, accion)).toBeLessThanOrEqual(1.4);
      expect(factor(ninguno, accion)).toBeGreaterThanOrEqual(0.7);
    });

    it('la mayor afinidad se nota al quedar: más compatibles suben más', () => {
      const n = nueva().service<NpcDirectory>(SERVICES.npcs)!.get('companero_social')!;
      const suyos = Object.fromEntries(Object.keys(n.rasgos!.intereses).map((id) => [id, 90]));
      const sube = (intereses: Record<string, number>) => {
        const g = conPerfil(intereses);
        advanceTo(g, 'gen.descansar', 5, 11);
        g.perform('relaciones.quedar.companero_social');
        return g.service<RelationsService>(SERVICES.relaciones)!.get('companero_social')!.afinidad;
      };
      expect(sube(suyos)).toBeGreaterThan(sube({ cocina: 10 }));
    });

    it('la compatibilidad solo afecta a las acciones de relaciones', () => {
      const g = conPerfil({ cocina: 10 });
      advanceTo(g, 'gen.descansar', 5, 16);
      expect(g.preview('gen.gimnasio')!.modifiers.some((m) => m.id === 'relaciones.compatibilidad')).toBe(false);
    });
  });
});
