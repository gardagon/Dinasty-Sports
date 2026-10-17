import { describe, expect, it } from 'vitest';
import { SERVICES, type StudiesService } from '@ds/contracts';
import { Game, advanceTo } from '@ds/core';
import { personaje } from '@ds/mod-personaje';
import { estudios, notaControl, type EstudiosState } from './index';

const nueva = () => Game.create([personaje, estudios], { seed: 3 });

describe('módulo estudios', () => {
  it('funciona solo con el módulo base', () => {
    const g = nueva();
    expect(g.stat('estudios.matematicas')).toBeGreaterThan(0);
  });

  it('la clase solo está disponible entre semana a primera hora', () => {
    const g = nueva();
    advanceTo(g, 'gen.descansar', 0, 8);
    expect(g.preview('estudios.clase')!.available).toBe(true);
    g.perform('estudios.clase');
    expect(g.time.hour).toBe(14);
    expect(g.preview('estudios.clase')!.available).toBe(false);
    advanceTo(g, 'gen.descansar', 5, 8);
    expect(g.preview('estudios.clase')!.reason).toMatch(/no hay clase/);
  });

  it('cuenta faltas y pone notas los viernes', () => {
    const g = nueva();
    advanceTo(g, 'gen.descansar', 5, 10); // pasa una semana sin ir a clase
    const s = g.moduleState<EstudiosState>('estudios');
    expect(s.faltas).toBe(5);
    expect(s.notas.matematicas.length).toBe(1);
    const svc = g.service<StudiesService>(SERVICES.estudios)!;
    expect(svc.absences()).toBe(5);
    expect(svc.average()).not.toBeNull();
  });

  it('la nota crece con el nivel y baja con el estrés', () => {
    expect(notaControl(80, 20, 0)).toBeGreaterThan(notaControl(30, 20, 0));
    expect(notaControl(60, 95, 0)).toBeLessThan(notaControl(60, 20, 0));
  });
});
