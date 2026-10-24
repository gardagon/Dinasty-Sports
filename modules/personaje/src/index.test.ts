import { describe, expect, it } from 'vitest';
import { GEN, SERVICES, type IdentityService } from '@ds/contracts';
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

  describe('identidad', () => {
    const vista = (g: Game) => g.service<IdentityService>(SERVICES.identidad)!.view();
    const pasarDias = (g: Game, dias: number) => advanceUntil(g, 'gen.descansar', (t) => t.day >= dias, 30000);

    it('empieza con 8 años, una altura y un peso razonables y una dominancia', () => {
      const v = vista(Game.create([personaje], { seed: 3 }));
      expect(v.age).toBe(8);
      expect(v.heightCm).toBeGreaterThan(115);
      expect(v.heightCm).toBeLessThan(145);
      expect(v.weightKg).toBeGreaterThan(18);
      expect(v.weightKg).toBeLessThan(40);
      expect(typeof v.leftHanded).toBe('boolean');
      expect(v.bodyType).toBe('normal');
    });

    it('cumple años cada 365 días y crece', () => {
      const g = Game.create([personaje], { seed: 3 });
      const antes = vista(g);
      pasarDias(g, 366);
      const despues = vista(g);
      expect(despues.age).toBe(antes.age + 1);
      expect(despues.heightCm).toBeGreaterThan(antes.heightCm);
      expect(g.log.some((l) => /Cumples 9 años/.test(l.text))).toBe(true);
    });

    it('cada partida tiene su propia altura adulta', () => {
      const alturas = [1, 2, 3, 4, 5, 6].map((seed) => vista(Game.create([personaje], { seed })).heightCm);
      expect(new Set(alturas).size).toBeGreaterThan(3);
    });

    it('el sedentarismo sostenido acaba en sobrepeso, y eso se nota en el rendimiento', () => {
      const g = Game.create([personaje], { seed: 3 });
      pasarDias(g, 220);
      expect(vista(g).bodyType).toBe('con_sobrepeso');
      expect(g.preview('gen.gimnasio')!.modifiers.some((m) => m.id === 'gen.complexion')).toBe(true);
    });

    it('una partida guardada antes de la identidad la recibe al cargarla', () => {
      const g = Game.create([personaje], { seed: 3 });
      const guardado = g.serialize();
      delete (guardado.modules as Record<string, unknown>).gen;
      const g2 = Game.load([personaje], guardado);
      expect(vista(g2).age).toBe(8);
    });
  });

  it('el vigor por edad sube con los años y se aproxima a la curva de cada categoría', () => {
    const g = Game.create([personaje], { seed: 1 });
    const antes = g.stat(GEN.vigorFisico);
    expect(antes).toBeGreaterThan(80);
    expect(antes).toBeLessThan(90);
    while (g.time.day < 365 * 3) g.perform('gen.descansar');
    expect(g.stat(GEN.vigorFisico)).toBeGreaterThan(antes);
    expect(g.stat(GEN.vigorMental)).toBeGreaterThan(87);
  });

  it('las genéricas llevan el vigor de su categoría', () => {
    const g = Game.create([personaje], { seed: 1 });
    const de = (id: string) => g.registry.stats.get(id)!.def.growth?.potentialFactor;
    expect(de(GEN.velocidad)).toBe(GEN.vigorFisico);
    expect(de(GEN.inteligencia)).toBe(GEN.vigorMental);
    expect(de(GEN.carisma)).toBe(GEN.vigorSocial);
  });
});
