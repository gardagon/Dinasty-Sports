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

  describe('acciones variadas (E20.3)', () => {
    const id = (suffix: string, n = 'companero_social') => `relaciones.${suffix}.${n}`;
    /** Un sábado a media mañana, con el compañero ya con la afinidad indicada. */
    const conAfinidad = (afinidad: number, estado: string = 'conocido', cambios: Record<string, unknown> = {}) => {
      const g = nueva();
      const guardado = g.serialize();
      const e = guardado.modules.relaciones as RelacionesState;
      e.vinculos.companero_social = { npcId: 'companero_social', afinidad, confianza: 10, estado: estado as never, desde: 0, ultimoContacto: -1, contactos: [], ...cambios };
      guardado.minute = (5 * 1440) + 11 * 60; // sábado 11:00
      return Game.load([personaje, npcs, relaciones], guardado);
    };

    it('cada persona tiene su propio grupo y su catálogo de acciones', () => {
      const g = nueva();
      advanceTo(g, 'gen.descansar', 5, 11);
      const catalogo = ['quedar', 'charlar', 'ayudar', 'planes', 'detalle', 'discutir', 'paces'].map((x) => g.preview(id(x))!);
      expect(catalogo.every((p) => p !== undefined)).toBe(true);
      expect(new Set(g.availableActions().filter((a) => a.id.endsWith('.companero_social')).map((a) => a.group)).size).toBe(1);
      expect(g.availableActions().find((a) => a.id === id('charlar'))!.group).toBe('Relaciones · ' + g.service<NpcDirectory>(SERVICES.npcs)!.get('companero_social')!.name.split(' ')[0]);
      expect(g.preview(id('hablar', 'entrenador'))).toBeDefined();
      expect(g.preview(id('discutir', 'entrenador'))).toBeDefined();
      expect(g.preview(id('paces', 'entrenador'))).toBeDefined();
    });

    it('charlar sube poco y cuesta casi nada; quedar sube más', () => {
      const a = conAfinidad(0);
      const b = conAfinidad(0);
      a.perform(id('charlar'));
      b.perform(id('quedar'));
      const sube = (g: Game) => rel(g).get('companero_social')!.afinidad;
      expect(sube(a)).toBeGreaterThan(0);
      expect(sube(b)).toBeGreaterThan(sube(a));
      expect(a.time.hour).toBe(11);
      expect(a.time.minute % 60).toBe(30);
    });

    it('ayudar exige conocerse un poco y da más confianza que simpatía', () => {
      const frio = conAfinidad(0);
      expect(frio.preview(id('ayudar'))!.available).toBe(false);
      expect(frio.preview(id('ayudar'))!.reason).toMatch(/conoceros/);
      const g = conAfinidad(8);
      const antes = rel(g).get('companero_social')!;
      expect(g.perform(id('ayudar')).ok).toBe(true);
      const despues = rel(g).get('companero_social')!;
      expect(despues.confianza - antes.confianza).toBeGreaterThan(despues.afinidad - antes.afinidad - 1);
    });

    it('hacer planes solo está disponible si comparten algún interés', () => {
      const g = conAfinidad(0);
      const guardado = g.serialize();
      (guardado.modules.gen as IdentidadState).perfil.intereses = {};
      const sin = Game.load([personaje, npcs, relaciones], guardado);
      expect(sin.preview(id('planes'))!.available).toBe(false);
      expect(sin.preview(id('planes'))!.reason).toMatch(/guste a los dos/);
      const intereses = g.service<NpcDirectory>(SERVICES.npcs)!.get('companero_social')!.rasgos!.intereses;
      (guardado.modules.gen as IdentidadState).perfil.intereses = Object.fromEntries(Object.keys(intereses).map((k) => [k, 60]));
      const con = Game.load([personaje, npcs, relaciones], guardado);
      expect(con.preview(id('planes'))!.available).toBe(true);
    });

    it('un detalle solo se puede repetir pasada una semana', () => {
      const g = conAfinidad(0);
      expect(g.perform(id('detalle')).ok).toBe(true);
      expect(g.moduleState<RelacionesState>('relaciones').espera?.['detalle.companero_social']).toBeGreaterThan(g.time.day);
      advanceTo(g, 'gen.descansar', 0, 16); // al día siguiente
      expect(g.preview(id('detalle'))!.available).toBe(false);
      expect(g.preview(id('detalle'))!.reason).toMatch(/hace poco/);
      for (let i = 0; i < 7; i++) advanceTo(g, 'gen.descansar', (g.time.weekday + 1) % 7, 16);
      expect(g.preview(id('detalle'))!.available).toBe(true);
    });

    it('discutir resta afinidad y confianza, desahoga el estrés y entrena la autoridad', () => {
      const g = conAfinidad(30, 'conocido', { confianza: 30 });
      const estres = g.stat('gen.estres');
      const autoridad = g.stat('gen.autoridad');
      expect(g.perform(id('discutir')).ok).toBe(true);
      const v = rel(g).get('companero_social')!;
      expect(v.afinidad).toBeLessThan(30 - 5);
      expect(v.confianza).toBeLessThan(30);
      expect(g.stat('gen.estres')).toBeLessThan(estres);
      expect(g.stat('gen.autoridad')).toBeGreaterThanOrEqual(autoridad);
    });

    it('hacer las paces solo si hay algo que arreglar', () => {
      const g = conAfinidad(5);
      expect(g.preview(id('paces'))!.available).toBe(false);
      expect(g.preview(id('paces'))!.reason).toMatch(/nada que arreglar/);
    });

    it('las paces sacan de la antipatía o, si fallan, obligan a esperar unos días', () => {
      let aciertos = 0;
      let fallos = 0;
      for (let semilla = 1; semilla <= 40 && (!aciertos || !fallos); semilla++) {
        const base = Game.create([personaje, npcs, relaciones], { seed: semilla }).serialize();
        (base.modules.relaciones as RelacionesState).vinculos.companero_social = { npcId: 'companero_social', afinidad: -30, confianza: 20, estado: 'antipatia', desde: 0, ultimoContacto: -1, contactos: [] };
        base.minute = 5 * 1440 + 11 * 60;
        const g = Game.load([personaje, npcs, relaciones], base);
        expect(g.perform(id('paces')).ok).toBe(true);
        const v = rel(g).get('companero_social')!;
        if (v.estado === 'conocido' && v.afinidad > -30) {
          aciertos++;
          expect(v.afinidad).toBeGreaterThanOrEqual(-2);
        } else {
          fallos++;
          expect(v.afinidad).toBeLessThan(-30);
          advanceTo(g, 'gen.descansar', 0, 16);
          expect(g.preview(id('paces'))!.available).toBe(false);
          expect(g.preview(id('paces'))!.reason).toMatch(/todavía no quiere hablar/);
        }
      }
      expect(aciertos).toBeGreaterThan(0);
      expect(fallos).toBeGreaterThan(0);
    });

    it('un rival solo ofrece acciones tras conocerlo', () => {
      const g = nueva();
      advanceTo(g, 'gen.descansar', 5, 11);
      expect(g.preview(id('charlar', 'rival_1'))).toBeUndefined();
    });
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
