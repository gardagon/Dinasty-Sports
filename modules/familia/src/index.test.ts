import { describe, expect, it } from 'vitest';
import { SERVICES, type FamilyService } from '@ds/contracts';
import { Game } from '@ds/core';
import { personaje } from '@ds/mod-personaje';
import { familia } from './index';

const nueva = (seed: number) => Game.create([personaje, familia], { seed });
const padres = (g: Game) => g.service<FamilyService>(SERVICES.familia)!;

describe('módulo familia', () => {
  it('funciona solo con el módulo base: un padre y una madre adultos', () => {
    const f = padres(nueva(1));
    const [padre, madre] = f.parents();
    expect(padre.gender).toBe('m');
    expect(madre.gender).toBe('f');
    for (const p of [padre, madre]) {
      expect(p.edad).toBeGreaterThanOrEqual(35);
      expect(p.edad).toBeLessThanOrEqual(56);
      for (const v of [p.apoyo, p.expectativas, p.tiempoEnCasa]) expect(v).toBeGreaterThanOrEqual(0);
    }
    expect(f.apellidos.split(' ')).toHaveLength(2);
  });

  it('es determinista por semilla y varía entre semillas', () => {
    expect(padres(nueva(7)).parents()).toEqual(padres(nueva(7)).parents());
    const nombres = new Set(Array.from({ length: 12 }, (_, i) => padres(nueva(i + 1)).parents()[0].nombre));
    expect(nombres.size).toBeGreaterThan(3);
  });

  it('el deporte solo lo tiene quien lo practicó, y la mayoría no llegó a federado', () => {
    const todos = Array.from({ length: 200 }, (_, i) => padres(nueva(i + 1)).parents()).flat();
    for (const p of todos) expect(p.deporte === undefined).toBe(p.practica === 'ninguna');
    const altos = todos.filter((p) => p.practica === 'federado' || p.practica === 'profesional').length;
    expect(altos / todos.length).toBeGreaterThan(0.05);
    expect(altos / todos.length).toBeLessThan(0.35);
  });

  it('la edad de los padres avanza con el tiempo', () => {
    const g = nueva(3);
    const antes = padres(g).parents()[0].edad;
    for (let i = 0; i < 400; i++) g.perform('gen.dormir');
    expect(padres(g).parents()[0].edad).toBeGreaterThanOrEqual(antes);
  });
});
