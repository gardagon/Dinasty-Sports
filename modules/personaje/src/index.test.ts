import { describe, expect, it } from 'vitest';
import { GEN, SERVICES, perk, type IdentityService, type PerksService, type ProfileService } from '@ds/contracts';
import { Game, advanceTo, advanceUntil } from '@ds/core';
import { personaje } from './index';
import type { IdentidadState } from './identidad';

describe('módulo personaje (gen)', () => {
  it('funciona solo, sin ningún otro módulo', () => {
    const g = Game.create([personaje], { seed: 1 });
    expect(g.stat(GEN.energia)).toBe(90);
    expect(g.availableActions().length).toBeGreaterThan(0);
  });

  it('el personaje parte sin dinero y no puede gastar lo que no tiene', () => {
    const g = Game.create([personaje], { seed: 1 });
    expect(g.stat(GEN.dinero)).toBe(0);
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
      expect(v.heightCm).toBeGreaterThan(108);
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
    // A los 8 años solo se puede tener una parte pequeña del tope; con los años va creciendo.
    expect(antes).toBeGreaterThan(25);
    expect(antes).toBeLessThan(35);
    while (g.time.day < 365 * 3) g.perform('gen.descansar');
    expect(g.stat(GEN.vigorFisico)).toBeGreaterThan(antes + 20);
    expect(g.stat(GEN.vigorMental)).toBeGreaterThan(50);
  });

  it('las genéricas llevan el vigor de su categoría', () => {
    const g = Game.create([personaje], { seed: 1 });
    const de = (id: string) => g.registry.stats.get(id)!.def.growth?.potentialFactor;
    expect(de(GEN.velocidad)).toBe(GEN.vigorFisico);
    expect(de(GEN.inteligencia)).toBe(GEN.vigorMental);
    expect(de(GEN.carisma)).toBe(GEN.vigorSocial);
  });

  describe('perks', () => {
    const partidas = Array.from({ length: 1500 }, (_, i) => Game.create([personaje], { seed: i + 1 }));
    const perksDe = (g: Game) => g.service<PerksService>(SERVICES.perks)!.view();

    it('lo normal es tener 0 o 1 perk; nadie tiene más de 3 ni un perk con su opuesto', () => {
      const n = partidas.map((g) => perksDe(g).activos.length);
      for (const g of partidas) {
        const v = perksDe(g);
        expect(v.activos.length).toBeLessThanOrEqual(3);
        for (const a of v.activos) expect(v.activos.map((x) => x.id)).not.toContain(perk(a.id)!.opuesto);
      }
      // La mayoría tiene 0 o 1 (unos 78 %): el umbral deja margen al ruido de 1 500 partidas.
      expect(n.filter((x) => x <= 1).length / n.length).toBeGreaterThan(0.75);
      expect(n.filter((x) => x === 3).length / n.length).toBeLessThan(0.05);
    });

    it('un perk que sube o baja un tope lo cambia desde el nacimiento, aunque sea latente', () => {
      // Quien tiene Pulmones grandes (latente) tiene más tope de resistencia que quien tiene Asmático.
      const con = (id: string) => partidas.filter((g) => perksDe(g).activos.some((x) => x.id === id));
      const media = (gs: Game[]) => gs.reduce((a, g) => a + g.hiddenPotential(GEN.resistencia)!, 0) / gs.length;
      const pulmones = con('pulmones_grandes');
      const asmaticos = con('asmatico');
      expect(pulmones.length).toBeGreaterThan(5);
      expect(asmaticos.length).toBeGreaterThan(5);
      expect(media(pulmones)).toBeGreaterThan(media(asmaticos) + 8);
      expect(perk('pulmones_grandes')!.latente).toBe(true);
    });

    it('Gigante y Enano cambian la altura adulta', () => {
      const alturas = (id: string) => partidas.filter((g) => perksDe(g).activos.some((x) => x.id === id)).map((g) => g.moduleState<IdentidadState>('gen').alturaAdulta);
      const media = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
      const gigantes = alturas('gigante');
      const enanos = alturas('enano');
      expect(gigantes.length).toBeGreaterThan(5);
      expect(enanos.length).toBeGreaterThan(5);
      expect(media(gigantes) - media(enanos)).toBeGreaterThan(12);
    });

    it('el efecto en la eficiencia se aplica aunque el perk sea latente y solo a las acciones con esa etiqueta', () => {
      const guardado = Game.create([personaje], { seed: 1 }).serialize();
      (guardado.modules.gen as IdentidadState).perks = { activos: ['sangre_fria', 'memoria_motora_corta'], pool: [] };
      const g = Game.load([personaje], guardado);
      const entreno = g.preview('gen.gimnasio')!;
      expect(entreno.modifiers.some((m) => m.id === 'gen.perks')).toBe(true);
      expect(g.preview('gen.leer')!.modifiers.some((m) => m.id === 'gen.perks')).toBe(false);
    });

    it('el servicio enseña los activos y el pool con nombre y si son latentes', () => {
      const guardado = Game.create([personaje], { seed: 1 }).serialize();
      (guardado.modules.gen as IdentidadState).perks = { activos: ['asmatico'], pool: ['gigante'] };
      const v = perksDe(Game.load([personaje], guardado));
      expect(v.activos).toEqual([expect.objectContaining({ id: 'asmatico', nombre: 'Asmático', latente: true })]);
      expect(v.pool.map((x) => x.id)).toEqual(['gigante']);
    });
  });

  describe('perfil: origen, apariencia, carácter e intereses', () => {
    const perfilDe = (g: Game) => g.service<ProfileService>(SERVICES.perfil)!.view();

    it('el personaje tiene perfil heredado: origen que suma 1, ocho ejes de carácter y al menos un interés', () => {
      for (let seed = 1; seed <= 50; seed++) {
        const p = perfilDe(Game.create([personaje], { seed }));
        expect(p.origen.reduce((a, x) => a + x.peso, 0)).toBeCloseTo(1, 6);
        expect(Object.keys(p.caracter)).toHaveLength(8);
        for (const v of Object.values(p.caracter)) expect(Math.abs(v)).toBeLessThanOrEqual(50);
        expect(Object.keys(p.intereses).length).toBeGreaterThan(0);
        expect(p.apariencia.peloColor).toBeTruthy();
      }
    });

    it('lo que hace con su tiempo alimenta sus intereses, cada vez menos al subir', () => {
      const g = Game.create([personaje], { seed: 2 });
      const nivel = () => perfilDe(g).intereses.deporte ?? 0;
      const antes = nivel();
      advanceTo(g, 'gen.descansar', 5, 16);
      g.perform('gen.gimnasio');
      expect(nivel()).toBeGreaterThan(antes);
      const guardado = g.serialize();
      (guardado.modules.gen as IdentidadState).perfil.intereses.deporte = 95;
      const alto = Game.load([personaje], guardado);
      advanceTo(alto, 'gen.descansar', 5, 16);
      alto.perform('gen.gimnasio');
      expect(perfilDe(alto).intereses.deporte - 95).toBeLessThan(nivel() - antes);
    });

    it('el resto del perfil no cambia con el tiempo', () => {
      const g = Game.create([personaje], { seed: 3 });
      const antes = JSON.stringify({ ...perfilDe(g), intereses: 0 });
      advanceTo(g, 'gen.descansar', 5, 16);
      g.perform('gen.gimnasio');
      expect(JSON.stringify({ ...perfilDe(g), intereses: 0 })).toBe(antes);
    });
  });
});
