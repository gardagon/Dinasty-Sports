import { describe, expect, it } from 'vitest';
import { CIUDAD_INICIAL, defineModule, enLugar, rutaMasCorta, vecinosDe, type LugaresService } from '@ds/contracts';
import { Game } from '@ds/core';
import { personaje } from '@ds/mod-personaje';
import { lugares } from './index';

const partida = () => Game.create([personaje, lugares], { seed: 1 });

describe('módulo lugares', () => {
  it('funciona solo con el módulo base y la partida empieza en casa', () => {
    const g = partida();
    expect(g.service<LugaresService>('lugares')?.actual().id).toBe('casa');
  });

  it('ir a un sitio cuesta lo que el camino y cambia la ubicación', () => {
    const g = partida();
    const antes = g.time.minute;
    const r = g.perform('lugares.ir_colegio');
    expect(r.ok).toBe(true);
    expect(g.time.minute - antes).toBe(10);
    expect(g.service<LugaresService>('lugares')?.actual().id).toBe('colegio');
  });

  it('no se puede ir al sitio donde ya se está', () => {
    const g = partida();
    expect(g.perform('lugares.ir_casa').ok).toBe(false);
  });

  it('el viaje rápido cuesta la ruta más corta (nunca más que el camino directo)', () => {
    const g = partida();
    g.perform('lugares.ir_parque');
    const svc = g.service<LugaresService>('lugares')!;
    expect(svc.ruta('colegio')?.minutos).toBe(8);
    expect(svc.vecinos().map((v) => v.lugar.id).sort()).toEqual(['casa', 'colegio']);
  });

  it('enLugar deja pasar a una acción solo en el sitio indicado', () => {
    const prueba = defineModule({
      id: 'prueba',
      name: 'Prueba',
      actions: [{ id: 'prueba.clase', name: 'Clase', tags: [], duration: 5, available: (ctx) => enLugar(ctx, 'colegio') }],
    });
    const g = Game.create([personaje, lugares, prueba], { seed: 1 });
    expect(g.perform('prueba.clase').ok).toBe(false);
    g.perform('lugares.ir_colegio');
    expect(g.perform('prueba.clase').ok).toBe(true);
  });
});

describe('mapa de la ciudad', () => {
  it('todos los lugares son alcanzables desde el inicio', () => {
    for (const l of CIUDAD_INICIAL.lugares) expect(rutaMasCorta(CIUDAD_INICIAL, CIUDAD_INICIAL.inicio, l.id)).not.toBeNull();
  });

  it('los caminos son en ambos sentidos y la ruta pasa por el sitio más rápido', () => {
    expect(vecinosDe(CIUDAD_INICIAL, 'colegio').map((v) => v.lugar).sort()).toEqual(['casa', 'parque']);
    expect(rutaMasCorta(CIUDAD_INICIAL, 'colegio', 'casa')?.minutos).toBe(10);
  });
});
