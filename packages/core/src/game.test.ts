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

describe('tope genético individual', () => {
  /** 18 capacidades con herencia directa (como las genéricas del juego), una derivada de dos y una sin tope. */
  const IDS = Array.from({ length: 18 }, (_, i) => `g.c${i}`);
  const genetico = defineModule({
    id: 'g',
    name: 'Genética',
    stats: [
      { id: 'g.energia', name: 'Energía', category: 'estado', initial: 100, resource: true },
      ...IDS.map((id) => ({ id, name: id, category: 'generica' as const, initial: { min: 30, max: 50 }, talentSpread: 0, genetics: {} })),
      { id: 'g.a', name: 'A', category: 'habilidad', initial: 5, talentSpread: 0, genetics: { derivedFrom: [{ stat: 'g.c2', weight: 1 }] } },
      {
        id: 'g.deriv',
        name: 'Derivada',
        category: 'habilidad',
        initial: 5,
        talentSpread: 0,
        genetics: { derivedFrom: [{ stat: 'g.c0', weight: 0.75 }, { stat: 'g.c1', weight: 0.25 }], aptitude: 0.1 },
      },
      { id: 'g.sin', name: 'Sin tope', category: 'habilidad', initial: 5, talentSpread: 0 },
    ],
    actions: [
      {
        id: 'g.entrenar',
        name: 'Entrenar',
        tags: ['fisico'],
        duration: 60,
        delta: { 'g.energia': -1 },
        train: [{ stat: 'g.a', amount: 3 }],
      },
      { id: 'g.descansar', name: 'Descansar', tags: ['descanso'], duration: 60, delta: { 'g.energia': 100 } },
    ],
  });
  const nueva = (seed: number) => Game.create([genetico], { seed });
  const media = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
  const partidas = Array.from({ length: 300 }, (_, i) => nueva(i + 1));

  it('cada stat con genética tiene un tope entre 10 y 95; las demás, ninguno', () => {
    for (const g of partidas.slice(0, 30)) {
      for (const id of [...IDS, 'g.a', 'g.deriv']) {
        expect(g.hiddenPotential(id)).toBeGreaterThanOrEqual(10);
        expect(g.hiddenPotential(id)).toBeLessThanOrEqual(95);
      }
      expect(g.hiddenPotential('g.sin')).toBeUndefined();
    }
  });

  it('es determinista con la semilla y distinto entre partidas', () => {
    expect(nueva(7).hiddenPotential('g.c3')).toBe(nueva(7).hiddenPotential('g.c3'));
    const topes = new Set(Array.from({ length: 10 }, (_, i) => Math.round(nueva(i + 1).hiddenPotential('g.c3')!)));
    expect(topes.size).toBeGreaterThan(5);
  });

  describe('herencia', () => {
    it('cada padre tiene un perfil: la mayoría de capacidades normales y alguna débil, fuerte o destacada', () => {
      for (const g of partidas) {
        for (const lado of ['padre', 'madre'] as const) {
          const t = IDS.map((id) => g.parentPotential(lado, id)!);
          for (const v of t) {
            expect(v).toBeGreaterThanOrEqual(35);
            expect(v).toBeLessThanOrEqual(95);
          }
          expect(t.filter((v) => v < 50).length).toBeLessThanOrEqual(1);
          expect(t.filter((v) => v >= 70 && v < 85).length).toBeGreaterThanOrEqual(1);
          expect(t.filter((v) => v >= 70 && v < 85).length).toBeLessThanOrEqual(2);
          expect(t.filter((v) => v >= 85).length).toBeLessThanOrEqual(1);
        }
      }
    });

    it('los padres no son planos: tienen puntos fuertes y la media ronda los 62', () => {
      const medias = partidas.map((g) => media(IDS.map((id) => g.parentPotential('padre', id)!)));
      expect(media(medias)).toBeGreaterThan(59);
      expect(media(medias)).toBeLessThan(66);
      const rangos = partidas.map((g) => {
        const t = IDS.map((id) => g.parentPotential('madre', id)!);
        return Math.max(...t) - Math.min(...t);
      });
      expect(media(rangos)).toBeGreaterThan(25);
    });

    it('de las 18 capacidades, 9 se heredan del padre y 9 de la madre', () => {
      for (const g of partidas) {
        expect(IDS.filter((id) => g.geneticOrigin(id) === 'padre')).toHaveLength(9);
        expect(IDS.filter((id) => g.geneticOrigin(id) === 'madre')).toHaveLength(9);
      }
    });

    it('cada tope sale del de UN padre ±20 %, sin punto intermedio', () => {
      for (const g of partidas) {
        for (const id of IDS) {
          const base = g.parentPotential(g.geneticOrigin(id)!, id)!;
          const hijo = g.hiddenPotential(id)!;
          expect(hijo).toBeGreaterThanOrEqual(Math.max(10, base * 0.8) - 1e-9);
          expect(hijo).toBeLessThanOrEqual(Math.min(95, base * 1.2) + 1e-9);
        }
      }
    });

    it('si un padre es muy fuerte y la madre muy débil, el hijo sale fuerte o débil, no intermedio', () => {
      let lejosDelMedio = 0;
      let total = 0;
      for (const g of partidas) {
        for (const id of IDS) {
          const p = g.parentPotential('padre', id)!;
          const m = g.parentPotential('madre', id)!;
          if (Math.abs(p - m) < 25) continue;
          total++;
          const medio = (p + m) / 2;
          // Tomado de un padre ±20 %, queda del lado de ese padre salvo que su variación llegue al medio.
          if (Math.abs(g.hiddenPotential(id)! - medio) > Math.abs(p - m) / 2 * 0.3) lejosDelMedio++;
        }
      }
      expect(total).toBeGreaterThan(50);
      expect(lejosDelMedio / total).toBeGreaterThan(0.8);
    });

    it('el nivel inicial también sale de los padres, dentro del rango inicial (30 a 50) y sin pasar del tope', () => {
      for (const g of partidas) {
        for (const id of IDS) {
          expect(g.stat(id)).toBeGreaterThanOrEqual(Math.min(30, g.hiddenPotential(id)!) - 1e-9);
          expect(g.stat(id)).toBeLessThanOrEqual(Math.min(50, g.hiddenPotential(id)!) + 1e-9);
        }
      }
      // Quien hereda de un padre más fuerte parte más alto.
      const xs: number[] = [];
      const ys: number[] = [];
      for (const g of partidas) {
        for (const id of IDS) {
          xs.push(g.parentPotential(g.geneticOrigin(id)!, id)!);
          ys.push(g.stat(id));
        }
      }
      const mx = media(xs), my = media(ys);
      let c = 0, sx = 0, sy = 0;
      for (let i = 0; i < xs.length; i++) {
        c += (xs[i] - mx) * (ys[i] - my);
        sx += (xs[i] - mx) ** 2;
        sy += (ys[i] - my) ** 2;
      }
      expect(c / Math.sqrt(sx * sy)).toBeGreaterThan(0.5);
    });

    it('la media y la dispersión de los topes de los hijos son las esperadas (≈62)', () => {
      const v = partidas.flatMap((g) => IDS.map((id) => g.hiddenPotential(id)!));
      const m = media(v);
      const sd = Math.sqrt(media(v.map((x) => (x - m) ** 2)));
      expect(m).toBeGreaterThan(59);
      expect(m).toBeLessThan(66);
      expect(sd).toBeGreaterThan(8);
      expect(sd).toBeLessThan(15);
    });

    it('un tope derivado sale de los topes de las genéricas que lo apoyan, más una aptitud de ±10 %', () => {
      for (const g of partidas) {
        const base = 0.75 * g.hiddenPotential('g.c0')! + 0.25 * g.hiddenPotential('g.c1')!;
        expect(g.hiddenPotential('g.deriv')!).toBeGreaterThanOrEqual(Math.max(10, base * 0.9) - 1e-9);
        expect(g.hiddenPotential('g.deriv')!).toBeLessThanOrEqual(Math.min(95, base * 1.1) + 1e-9);
      }
      // No es una copia: la aptitud lo mueve.
      const iguales = partidas.filter((g) => Math.abs(g.hiddenPotential('g.deriv')! - (0.75 * g.hiddenPotential('g.c0')! + 0.25 * g.hiddenPotential('g.c1')!)) < 0.01);
      expect(iguales.length).toBeLessThan(10);
    });

    it('la misma semilla da los mismos padres y otra semilla, otros distintos', () => {
      expect(nueva(5).parentPotential('padre', 'g.c0')).toBe(nueva(5).parentPotential('padre', 'g.c0'));
      expect(nueva(5).parentPotential('padre', 'g.c0')).not.toBe(nueva(6).parentPotential('padre', 'g.c0'));
    });
  });

  /** Partida con el tope de `g.a` fijado a mano. */
  const conTope = (tope: number) => {
    const guardado = nueva(3).serialize();
    guardado.potential!['g.a'] = tope;
    return Game.load([genetico], guardado);
  };

  it('nadie pasa de su tope, por mucho que entrene', () => {
    const g = conTope(60);
    for (let i = 0; i < 400; i++) {
      g.perform('g.entrenar');
      g.perform('g.descansar');
    }
    expect(g.stat('g.a')).toBeLessThanOrEqual(60 + 1e-6);
    expect(g.stat('g.a')).toBeGreaterThan(50);
  });

  it('con el mismo entrenamiento, quien tiene un tope más alto sube más rápido', () => {
    const alto = conTope(92);
    const bajo = conTope(70);
    for (let i = 0; i < 20; i++) {
      alto.perform('g.entrenar');
      alto.perform('g.descansar');
      bajo.perform('g.entrenar');
      bajo.perform('g.descansar');
    }
    const ganAlto = alto.stat('g.a') - 5;
    const ganBajo = bajo.stat('g.a') - 5;
    expect(ganAlto).toBeGreaterThan(ganBajo * 1.3);
  });

  it('el techo visible no revela el tope genético', () => {
    const a = conTope(50);
    const b = conTope(95);
    expect(a.cap('g.a')).toBe(b.cap('g.a'));
  });

});
