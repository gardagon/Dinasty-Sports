import { describe, expect, it } from 'vitest';
import type { ReadContext } from '@ds/contracts';
import { Game, advanceTo, advanceToWeek } from '@ds/core';
import { personaje } from '@ds/mod-personaje';
import { atletismo, rendimiento, type AtletismoState } from './index';

const nueva = () => Game.create([personaje, atletismo], { seed: 5 });

describe('módulo atletismo', () => {
  it('compite contra rivales genéricos si no hay NPCs', () => {
    const g = nueva();
    advanceToWeek(g, 'gen.descansar', 5, 5, 10);
    const r = g.perform('atletismo.carrera');
    expect(r.ok).toBe(true);
    const s = g.moduleState<AtletismoState>('atletismo');
    expect(s.carreras).toHaveLength(1);
    expect(s.carreras[0].total).toBe(8);
    expect(s.mejorMarca).not.toBeNull();
    expect(g.preview('atletismo.carrera')!.available).toBe(false);
  });

  it('solo se entrena en horario', () => {
    const g = nueva();
    advanceTo(g, 'gen.descansar', 0, 10);
    expect(g.preview('atletismo.series')!.available).toBe(false);
    advanceTo(g, 'gen.descansar', 0, 16);
    expect(g.preview('atletismo.series')!.available).toBe(true);
  });

  it('la tercera sesión del día sufre sobrecarga', () => {
    const g = nueva();
    advanceTo(g, 'gen.descansar', 5, 8);
    g.perform('atletismo.tecnica');
    g.perform('atletismo.tecnica');
    const tercera = g.preview('atletismo.tecnica')!;
    expect(tercera.modifiers.some((m) => m.id === 'atletismo.sobrecarga')).toBe(true);
  });

  it('el conocimiento del deporte arranca en 0, sube viendo atletismo y da bonus de eficiencia', () => {
    const g = nueva();
    expect(g.stat('atletismo.conocimiento')).toBe(0);
    advanceTo(g, 'gen.descansar', 5, 15);
    const inicial = g.preview('atletismo.series')!;
    expect(inicial.modifiers.some((m) => m.id === 'atletismo.conocimiento')).toBe(true);
    expect(inicial.efficiency).toBeLessThan(1);

    expect(g.perform('atletismo.ver_tele').ok).toBe(true);
    expect(g.stat('atletismo.conocimiento')).toBeGreaterThan(0);
    expect(g.preview('atletismo.ver_tele')!.available).toBe(false);
  });

  it('el conocimiento no es una habilidad: no cambia las habilidades del deporte', () => {
    const g = nueva();
    advanceTo(g, 'gen.descansar', 5, 15);
    const antes = g.stat('atletismo.tecnica');
    g.perform('atletismo.ver_tele');
    expect(g.stat('atletismo.tecnica')).toBe(antes);
  });

  it('no hay carreras en pretemporada ni en vacaciones, pero sí se entrena', () => {
    const g = nueva();
    advanceToWeek(g, 'gen.descansar', 2, 5, 10); // pretemporada
    expect(g.preview('atletismo.carrera')!.available).toBe(false);
    expect(g.preview('atletismo.series')!.available).toBe(true);
    advanceToWeek(g, 'gen.descansar', 5, 5, 10); // temporada
    expect(g.preview('atletismo.carrera')!.available).toBe(true);
    advanceToWeek(g, 'gen.descansar', 15, 5, 10); // Navidad
    expect(g.preview('atletismo.carrera')!.available).toBe(false);
    advanceToWeek(g, 'gen.descansar', 45, 2, 10); // verano, entre semana: las pistas abren por la mañana
    expect(g.preview('atletismo.series')!.available).toBe(true);
  });

  describe('conocimiento: sube rápido al principio y cada vez más despacio', () => {
    const conConocimiento = (k: number) => {
      const guardado = nueva().serialize();
      guardado.stats['atletismo.conocimiento'] = k;
      guardado.peaks['atletismo.conocimiento'] = k;
      return Game.load([personaje, atletismo], guardado);
    };
    const ganancia = (k: number, accion: string) => {
      const g = conConocimiento(k);
      advanceTo(g, 'gen.descansar', 5, 11);
      const antes = g.stat('atletismo.conocimiento');
      expect(g.perform(accion).ok).toBe(true);
      return g.stat('atletismo.conocimiento') - antes;
    };

    it('la primera vez da cerca de un punto y a 70 puntos casi nada', () => {
      const primera = ganancia(0, 'atletismo.rodaje');
      expect(primera).toBeGreaterThan(0.1);
      const a70 = ganancia(70, 'atletismo.ver_tele');
      expect(a70).toBeGreaterThan(0);
      expect(a70).toBeLessThan(0.02);
    });

    it('cuanto más sabes, menos te da lo mismo, y siempre se puede seguir subiendo hacia 100', () => {
      const g0 = ganancia(0, 'atletismo.ver_tele');
      const g40 = ganancia(40, 'atletismo.ver_tele');
      const g80 = ganancia(80, 'atletismo.ver_tele');
      const g95 = ganancia(95, 'atletismo.ver_tele');
      expect(g0).toBeGreaterThan(g40);
      expect(g40).toBeGreaterThan(g80);
      expect(g80).toBeGreaterThan(g95);
      expect(g95).toBeGreaterThan(0);
    });
  });

  describe('conocimiento: malus y bonus sobre lo táctico, no sobre lo físico', () => {
    const rinde = (k: number, ajustes: Record<string, number> = {}) => {
      const guardado = nueva().serialize();
      const fijos: Record<string, number> = { 'gen.velocidad': 50, 'gen.resistencia': 50, 'atletismo.tecnica': 50, 'atletismo.ritmo': 50, 'atletismo.salida': 50, ...ajustes };
      for (const [id, v] of Object.entries(fijos)) {
        guardado.stats[id] = v;
        guardado.peaks[id] = v;
      }
      guardado.stats['atletismo.conocimiento'] = k;
      guardado.peaks['atletismo.conocimiento'] = k;
      const g = Game.load([personaje, atletismo], guardado);
      // Un contexto de lectura mínimo: `rendimiento` solo mira valores y su proporción (todas las stats van de 0 a 100).
      return rendimiento({ stat: (id: string) => g.stat(id), norm: (id: string) => g.stat(id) / 100 } as unknown as ReadContext);
    };

    it('quien no conoce el deporte rinde menos con las mismas habilidades y quien lo conoce a fondo, más', () => {
      expect(rinde(0)).toBeLessThan(rinde(50));
      expect(rinde(100)).toBeGreaterThan(rinde(50));
    });

    it('lo físico no se resiente: la velocidad y la resistencia no dependen del conocimiento', () => {
      const soloFisico = { 'atletismo.tecnica': 0, 'atletismo.ritmo': 0, 'atletismo.salida': 0 };
      expect(rinde(0, soloFisico)).toBeCloseTo(rinde(100, soloFisico), 6);
    });

    it('el efecto es de unos pocos puntos: -15 % en lo táctico sin conocimiento, +15 % con él', () => {
      const tactico = { 'gen.velocidad': 0, 'gen.resistencia': 0 };
      const base = rinde(50, tactico);
      expect(rinde(0, tactico) / base).toBeGreaterThan(0.88);
      expect(rinde(0, tactico) / base).toBeLessThan(0.97);
      expect(rinde(100, tactico) / base).toBeGreaterThan(1.03);
      expect(rinde(100, tactico) / base).toBeLessThan(1.12);
    });
  });
});
