import { describe, expect, it } from 'vitest';
import { GEN, SERVICES, deudaEfectiva, perk, type IdentityService, type PerksService, type ProfileService } from '@ds/contracts';
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

    it('guarda una foto del cuerpo en cada cumpleaños, en enteros', () => {
      const g = Game.create([personaje], { seed: 3 });
      expect(g.moduleState<IdentidadState>('gen').hc).toBeUndefined();
      pasarDias(g, 366 * 3);
      const hc = g.moduleState<IdentidadState>('gen').hc!;
      expect(hc[0]).toBe(9);
      expect(hc).toHaveLength(1 + 2 * 3);
      expect(hc.every(Number.isInteger)).toBe(true);
    });

    it('hereda la genética del cuerpo (puntuaciones típicas) y distintas partidas la tienen distinta', () => {
      const zs = [1, 2, 3, 4, 5, 6].map((seed) => g_(seed).metabolismo);
      expect(zs.every((z) => typeof z === 'number' && Math.abs(z) < 4)).toBe(true);
      expect(new Set(zs).size).toBeGreaterThan(3);
      function g_(seed: number) { return Game.create([personaje], { seed }).moduleState<IdentidadState>('gen'); }
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
      // Recibe una identidad nueva (7 u 8 años: el día de nacimiento sale de un sorteo que cambia al añadir stats al juego).
      expect(vista(g2).age).toBeGreaterThanOrEqual(7);
      expect(vista(g2).age).toBeLessThanOrEqual(8);
    });
  });

  it('el vigor por edad sube con los años y se aproxima a la curva de cada categoría', () => {
    const g = Game.create([personaje], { seed: 1 });
    const antes = g.stat(GEN.vigorFisico);
    // A los 7-8 años solo se puede tener una parte pequeña del tope; con los años va creciendo (a los 10-11, el vigor mental pasa de 45).
    expect(antes).toBeGreaterThan(25);
    expect(antes).toBeLessThan(35);
    while (g.time.day < 365 * 3) g.perform('gen.descansar');
    expect(g.stat(GEN.vigorFisico)).toBeGreaterThan(antes + 20);
    expect(g.stat(GEN.vigorMental)).toBeGreaterThan(45);
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

  describe('el desplegable «Dormir…»', () => {
    const opcionesDeDormir = (g: Game) => g.listActions().filter((o) => o.id.startsWith('gen.dormir'));

    it('hay las mismas opciones todos los días, también en fin de semana', () => {
      const g = Game.create([personaje], { seed: 1 });
      advanceUntil(g, 'gen.descansar', (t) => t.hour === 22);
      const entreSemana = opcionesDeDormir(g).map((o) => o.id);
      expect(entreSemana).toEqual(expect.arrayContaining(['gen.dormir', 'gen.dormir_lo_que_toca', 'gen.dormir_4h', 'gen.dormir_11h']));
      for (let i = 0; i < 5 * 24 * 12 && !g.time.isWeekend; i++) g.perform('gen.esperar');
      advanceUntil(g, 'gen.descansar', (t) => t.isWeekend && t.hour === 22);
      expect(g.time.isWeekend).toBe(true);
      expect(opcionesDeDormir(g).map((o) => o.id)).toEqual(entreSemana);
    });

    it('cada opción cumple sus horas y no mira las obligaciones', () => {
      const g = Game.create([personaje], { seed: 1 });
      advanceUntil(g, 'gen.descansar', (t) => t.hour === 22);
      expect(g.preview('gen.dormir')!.duration).toBe(9 * 60);
      expect(g.preview('gen.dormir_6h')!.duration).toBe(6 * 60);
      expect(g.preview('gen.dormir_11h')!.duration).toBe(11 * 60);
      // A los 8 años, lo que toca son unas 9 h y media (la edad exacta cambia el cuarto de hora).
      const toca = g.preview('gen.dormir_lo_que_toca')!.duration;
      expect(toca).toBeGreaterThanOrEqual(9 * 60);
      expect(toca).toBeLessThanOrEqual(9.75 * 60);
      const antes = g.time.minute;
      g.perform('gen.dormir_11h');
      expect(g.time.minute - antes).toBe(11 * 60);
    });

    it('el nombre dice a qué hora te levantas y de día no se puede', () => {
      const g = Game.create([personaje], { seed: 1 });
      advanceUntil(g, 'gen.descansar', (t) => t.hour === 22);
      expect(g.preview('gen.dormir_8h')!.name).toBe('Dormir 8 horas (te levantas a las 6:00)');
      advanceUntil(g, 'gen.descansar', (t) => t.hour === 15);
      for (const o of opcionesDeDormir(g)) expect(o.available).toBe(false);
    });

    it('dormir 8 horas recupera la misma energía que hasta las 7:00 desde las 23:00', () => {
      const a = Game.create([personaje], { seed: 3 });
      const b = Game.create([personaje], { seed: 3 });
      for (const g of [a, b]) {
        for (let i = 0; i < 3; i++) g.perform('gen.gimnasio');
        advanceUntil(g, 'gen.descansar', (t) => t.hour === 22);
        while (g.time.minuteOfDay < 23 * 60) g.perform('gen.esperar');
        expect(g.time.minuteOfDay).toBe(23 * 60);
      }
      a.perform('gen.dormir');
      b.perform('gen.dormir_8h');
      expect(a.time.minute).toBe(b.time.minute);
      expect(a.stat(GEN.energia)).toBe(b.stat(GEN.energia));
    });
  });

  describe('el sueño atrasado (gen.sueno)', () => {
    const hasta = (g: Game, hora: number, minuto = 0) => {
      let n = 0;
      while ((g.time.minuteOfDay !== hora * 60 + minuto) && n++ < 2000) g.perform('gen.esperar');
    };
    const nueva = () => {
      const g = Game.create([personaje], { seed: 1 });
      hasta(g, 21);
      return g;
    };

    it('dormir lo que toca no deja deuda; dormir menos la va acumulando noche a noche', () => {
      const g = nueva();
      g.perform('gen.dormir_lo_que_toca');
      expect(g.stat(GEN.sueno)).toBeLessThan(0.3);
      for (let noche = 1; noche <= 3; noche++) {
        const antes = g.stat(GEN.sueno);
        hasta(g, 21);
        g.perform('gen.dormir_8h');
        expect(g.stat(GEN.sueno)).toBeGreaterThan(antes + 1);
      }
    });

    it('la deuda tiene tope y dormir de más recupera como mucho dos horas por noche', () => {
      const g = nueva();
      for (let n = 0; n < 6; n++) {
        hasta(g, 21);
        g.perform('gen.dormir_4h');
      }
      expect(g.stat(GEN.sueno)).toBe(10);
      hasta(g, 21);
      g.perform('gen.dormir_11h');
      // A los 8 años se necesitan unas 9 h y media: dormir 11 h abona 1,5 h (el tope de dos horas por noche se prueba en `sueno.test.ts`).
      expect(g.stat(GEN.sueno)).toBeGreaterThan(8.3);
      expect(g.stat(GEN.sueno)).toBeLessThan(8.7);
    });

    it('«Hasta estar descansado» solo está si arrastras sueño y dura lo que toca más lo recuperable', () => {
      const g = nueva();
      expect(g.preview('gen.dormir_descansado')!.available).toBe(false);
      g.perform('gen.dormir_4h');
      hasta(g, 21);
      const lo = g.preview('gen.dormir_lo_que_toca')!.duration;
      const d = g.preview('gen.dormir_descansado')!;
      expect(d.available).toBe(true);
      expect(d.duration).toBe(lo + 120);
    });

    it('con sueño atrasado la energía no llega a 100 al despertar y se avisa sin números', () => {
      const g = nueva();
      for (let n = 0; n < 3; n++) {
        hasta(g, 21);
        g.perform('gen.dormir_5h');
      }
      hasta(g, 21);
      const r = g.perform('gen.dormir_lo_que_toca');
      expect(g.stat(GEN.energia)).toBeLessThan(100);
      const textos = r.log.map((l) => l.text).join(' ');
      expect(textos).toContain('Arrastras sueño');
      expect(textos).not.toMatch(/\d+(,\d+)? h\b/);
    });

    it('con sueño atrasado se rinde menos en el deporte y en lo mental, y sin él no hay modificador (F2)', () => {
      const g = nueva();
      const sin = g.preview('gen.gimnasio')!;
      expect(sin.modifiers.map((m) => m.id)).not.toContain('gen.sueno');
      for (let n = 0; n < 4; n++) {
        hasta(g, 21);
        g.perform('gen.dormir_4h');
      }
      expect(g.stat(GEN.sueno)).toBeGreaterThan(5);
      advanceUntil(g, 'gen.esperar', (t) => t.hour === 16);
      const gim = g.preview('gen.gimnasio')!;
      const leer = g.preview('gen.leer')!;
      const d = deudaEfectiva(g.stat(GEN.sueno));
      expect(gim.modifiers.map((m) => m.id)).toContain('gen.sueno');
      expect(leer.modifiers.map((m) => m.id)).toContain('gen.sueno');
      // El de lo mental (×(1 − 0,02·d)) pesa más que el del deporte (×(1 − 0,015·d)).
      const f = (p: typeof gim) => p.modifiers.find((m) => m.id === 'gen.sueno')!.result.efficiency!;
      expect(f(gim)).toBeCloseTo(1 - 0.015 * d, 6);
      expect(f(leer)).toBeCloseTo(1 - 0.02 * d, 6);
    });

    it('la noche alivia menos el estrés y la motivación baja 0,7 por hora que falta (F2)', () => {
      const dormir = (id: string, deudaPrevia: number) => {
        const g = nueva();
        for (let n = 0; n < deudaPrevia; n++) {
          hasta(g, 21);
          g.perform('gen.dormir_4h');
        }
        hasta(g, 21);
        const e0 = g.stat(GEN.estres);
        const m0 = g.stat(GEN.motivacion);
        g.perform(id);
        return { estres: g.stat(GEN.estres) - e0, motivacion: g.stat(GEN.motivacion) - m0 };
      };
      const descansado = dormir('gen.dormir_lo_que_toca', 0);
      const atrasado = dormir('gen.dormir_lo_que_toca', 4);
      // Con deuda, el mismo sueño baja menos el estrés (el cierre del día también suma estrés).
      expect(atrasado.estres).toBeGreaterThan(descansado.estres);
      // Dormir 5 h con una necesidad de ~9,5 h (4,5 h de falta): −0,7 × 4,5 = −3,15; el tope es −4 y el antiguo era −2 plano.
      const poco = dormir('gen.dormir_5h', 0);
      expect(poco.motivacion).toBeLessThan(-2.5);
      expect(poco.motivacion).toBeGreaterThan(-4.6);
      // Lo que toca no resta motivación por la noche.
      expect(descansado.motivacion).toBeGreaterThan(-0.5);
    });

    it('la siesta recupera como mucho media hora de deuda al día', () => {
      const g = Game.create([personaje], { seed: 1 });
      for (let n = 0; n < 3; n++) {
        hasta(g, 21);
        g.perform('gen.dormir_4h');
      }
      advanceUntil(g, 'gen.esperar', (t) => t.hour === 14);
      const antes = g.stat(GEN.sueno);
      g.perform('gen.descansar');
      expect(antes - g.stat(GEN.sueno)).toBeCloseTo(0.5, 5);
      g.perform('gen.descansar');
      expect(antes - g.stat(GEN.sueno)).toBeCloseTo(0.5, 5);
    });

    it('el agotamiento de fin de día ve la energía con que te acostaste, no la de después de dormir', () => {
      const g = Game.create([personaje], { seed: 1 });
      hasta(g, 15);
      for (let i = 0; i < 4; i++) g.perform('gen.gimnasio');
      expect(g.stat(GEN.energia)).toBeLessThan(15);
      hasta(g, 23);
      const salud = g.stat(GEN.salud);
      g.perform('gen.dormir');
      expect(g.stat(GEN.energia)).toBeGreaterThan(80);
      expect(g.stat(GEN.salud)).toBeLessThan(salud);
    });
  });
});
