import { describe, expect, it } from 'vitest';
import { defineModule, MINUTES_PER_DAY, type GameModule } from '@ds/contracts';
import { Game } from './game';
import { RegistryError } from './registry';
import { checkInvariants } from './invariants';
import { seededRng } from './rng';

const base = defineModule({
  id: 'b',
  name: 'Base',
  stats: [
    { id: 'b.energia', name: 'Energía', category: 'estado', initial: 100, resource: true },
    { id: 'b.estres', name: 'Estrés', category: 'estado', initial: 0 },
    { id: 'b.fuerza', name: 'Fuerza', category: 'generica', initial: 50, talentSpread: 0 },
  ],
  actions: [{ id: 'b.dormir', name: 'Dormir', tags: ['descanso'], duration: 480, delta: { 'b.energia': 100 } }],
  modifiers: [
    {
      id: 'b.fatiga',
      tags: ['*'],
      apply: (ctx) => (ctx.stat('b.energia') < 30 ? { efficiency: 0.5, reason: 'Cansancio' } : null),
    },
  ],
});

const deporte = defineModule({
  id: 'd',
  name: 'Deporte',
  dependsOn: ['b'],
  stats: [
    {
      id: 'd.tecnica',
      name: 'Técnica',
      category: 'habilidad',
      initial: 0,
      talentSpread: 0,
      growth: { cap: { base: 0.5, from: [{ stat: 'b.fuerza', weight: 0.5 }] } },
      decay: { graceDays: 2, ratePerDay: 0.1, floorRatio: 0.5 },
    },
  ],
  actions: [
    {
      id: 'd.entrenar',
      name: 'Entrenar',
      tags: ['fisico'],
      duration: 60,
      delta: { 'b.energia': -20 },
      train: [{ stat: 'd.tecnica', amount: 5 }],
    },
  ],
});

const make = (mods: GameModule<any>[] = [base, deporte]) => Game.create(mods, { seed: 42 });

describe('registro', () => {
  it('rechaza ids sin prefijo, duplicados y dependencias ausentes', () => {
    const malo = defineModule({
      id: 'x',
      name: 'X',
      dependsOn: ['nope'],
      stats: [{ id: 'sinprefijo', name: 'S', category: 'estado', initial: 0 }],
      actions: [{ id: 'x.a', name: 'A', tags: [], duration: 1, train: [{ stat: 'x.noexiste', amount: 1 }] }],
    });
    try {
      Game.create([malo]);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(RegistryError);
      const p = (e as RegistryError).problems.join('\n');
      expect(p).toMatch(/nope/);
      expect(p).toMatch(/sinprefijo/);
      expect(p).toMatch(/x\.noexiste/);
    }
  });
});

describe('pipeline de acciones', () => {
  it('aplica coste, entrenamiento y avanza el tiempo', () => {
    const g = make();
    const t0 = g.time.minute;
    const r = g.perform('d.entrenar');
    expect(r.ok).toBe(true);
    expect(g.time.minute - t0).toBe(60);
    expect(g.stat('b.energia')).toBe(80);
    expect(g.stat('d.tecnica')).toBeGreaterThan(0);
    expect(r.changes['d.tecnica']).toBeGreaterThan(0);
  });

  it('bajar una stat que no es recurso nunca bloquea (p. ej. estrés ya a 0)', () => {
    const relax = defineModule({
      id: 'r',
      name: 'R',
      actions: [{ id: 'r.relax', name: 'Relax', tags: [], duration: 10, delta: { 'b.estres': -5 } }],
    });
    const g = make([base, deporte, relax]);
    expect(g.preview('r.relax')!.available).toBe(true);
  });

  it('bloquea la acción si no hay energía suficiente', () => {
    const g = make();
    for (let i = 0; i < 5; i++) g.perform('d.entrenar');
    const opt = g.preview('d.entrenar')!;
    expect(opt.available).toBe(false);
    expect(g.perform('d.entrenar').ok).toBe(false);
  });

  it('los modificadores por etiqueta cambian la eficiencia', () => {
    const g = make();
    for (let i = 0; i < 4; i++) g.perform('d.entrenar'); // energía 20
    const opt = g.preview('d.entrenar')!;
    expect(opt.efficiency).toBe(0.5);
    expect(opt.modifiers.map((m) => m.id)).toContain('b.fatiga');
  });

  it('rendimientos decrecientes y techo dependiente de genéricas', () => {
    const g = make();
    const gains: number[] = [];
    for (let i = 0; i < 60; i++) {
      if (g.stat('b.energia') < 30) g.perform('b.dormir');
      gains.push(g.perform('d.entrenar').changes['d.tecnica'] ?? 0);
    }
    const cap = g.cap('d.tecnica'); // 100 × (0.5 + 0.5×0.5) = 75
    expect(cap).toBeCloseTo(75);
    expect(g.stat('d.tecnica')).toBeLessThanOrEqual(cap + 1e-9);
    expect(gains[0]).toBeGreaterThan(gains[gains.length - 1]);
  });

  it('caída tras el periodo de gracia, sin bajar del suelo', () => {
    const g = make();
    for (let i = 0; i < 8; i++) {
      if (g.stat('b.energia') < 30) g.perform('b.dormir');
      g.perform('d.entrenar');
    }
    const peak = g.stat('d.tecnica');
    for (let i = 0; i < 40; i++) g.perform('b.dormir'); // ~13 días sin entrenar
    const after = g.stat('d.tecnica');
    expect(after).toBeLessThan(peak);
    expect(after).toBeGreaterThanOrEqual(peak * 0.5 - 1e-9);
  });

  it('emite eventos de cambio de día', () => {
    let finDia = 0;
    const oyente = defineModule({ id: 'o', name: 'O', on: { 'dia.fin': () => void finDia++ } });
    const g = make([base, deporte, oyente]);
    const d0 = g.time.day;
    while (g.time.day < d0 + 3) g.perform('b.dormir');
    expect(finDia).toBe(3);
    expect(g.time.minute % MINUTES_PER_DAY).toBeGreaterThanOrEqual(0);
  });

  it('impide que un módulo modifique directamente habilidades ajenas', () => {
    const intruso = defineModule({
      id: 'i',
      name: 'I',
      actions: [{ id: 'i.trampa', name: 'T', tags: [], duration: 1, run: (ctx) => void ctx.addStat('d.tecnica', 50) }],
    });
    const g = make([base, deporte, intruso]);
    expect(() => g.perform('i.trampa')).toThrow(/no puede cambiar/);
  });
});

describe('determinismo y guardado', () => {
  const jugar = (g: Game, n: number) => {
    const rng = seededRng(7);
    for (let i = 0; i < n; i++) {
      const opts = g.availableActions();
      g.perform(rng.pick(opts).id);
    }
  };

  it('misma semilla + mismas decisiones = misma partida', () => {
    const a = make();
    const b = make();
    jugar(a, 50);
    jugar(b, 50);
    expect(a.serialize()).toEqual(b.serialize());
  });

  it('guardar y cargar conserva el estado y sigue siendo determinista', () => {
    const a = make();
    jugar(a, 20);
    const saved = JSON.parse(JSON.stringify(a.serialize()));
    const b = Game.load([base, deporte], saved);
    expect(b.serialize()).toEqual(a.serialize());
    expect(checkInvariants(b)).toEqual([]);
  });

  it('una partida guardada admite módulos nuevos', () => {
    const a = make([base]);
    const b = Game.load([base, deporte], a.serialize());
    expect(b.stat('d.tecnica')).toBe(0);
  });
});
