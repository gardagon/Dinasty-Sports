import { describe, expect, it } from 'vitest';
import { SERVICES, type PracticaService } from '@ds/contracts';
import { Game } from '@ds/core';
import { personaje } from '@ds/mod-personaje';
import { deportes } from './index';

const nuevo = (deporte?: string | null) => Game.create([personaje, deportes], { seed: 1, deporte });
const practica = (g: Game) => g.service<PracticaService>(SERVICES.practica)!;

describe('módulo deportes', () => {
  it('funciona solo con el módulo base: sin ningún deporte cargado no ofrece acciones', () => {
    const g = nuevo();
    expect(practica(g).practicado()).toBe('atletismo');
    expect(g.listActions().filter((o) => o.module === 'deportes')).toEqual([]);
  });

  it('se puede empezar sin ningún deporte (null) y el historial va vacío', () => {
    const g = nuevo(null);
    expect(practica(g).practicado()).toBeNull();
    expect(practica(g).historial()).toEqual([]);
  });
});
