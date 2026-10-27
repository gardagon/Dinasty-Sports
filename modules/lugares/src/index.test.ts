import { describe, expect, it } from 'vitest';
import { CIUDAD_INICIAL, defineModule, enLugar, tiempoEntre, vecinosDe, type LugaresService } from '@ds/contracts';
import { Game, advanceTo } from '@ds/core';
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

  it('el viaje rápido cuesta lo que dice la tabla de tiempos', () => {
    const g = partida();
    g.perform('lugares.ir_parque');
    const svc = g.service<LugaresService>('lugares')!;
    expect(svc.minutosA('colegio')).toBe(8);
    expect(svc.vecinos().map((v) => v.lugar.id).sort()).toEqual(['casa', 'colegio', 'gimnasio', 'restaurante']);
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
  const ids = CIUDAD_INICIAL.lugares.map((l) => l.id);

  it('la tabla de tiempos está completa: todos con todos, y cero con uno mismo', () => {
    for (const a of ids) {
      for (const b of ids) {
        const t = tiempoEntre(CIUDAD_INICIAL, a, b);
        expect(t, `${a} → ${b}`).toBeDefined();
        if (a === b) expect(t).toBe(0);
        else expect(t).toBeGreaterThan(0);
      }
    }
  });

  it('la tabla es simétrica y no tiene lugares que no existan', () => {
    expect(Object.keys(CIUDAD_INICIAL.tiempos).sort()).toEqual([...ids].sort());
    for (const a of ids) for (const b of ids) expect(tiempoEntre(CIUDAD_INICIAL, a, b)).toBe(tiempoEntre(CIUDAD_INICIAL, b, a));
  });

  it('los caminos directos usan lugares del mapa y salen en ambos sentidos', () => {
    for (const [a, b] of CIUDAD_INICIAL.directos) expect(ids).toContain(a), expect(ids).toContain(b);
    expect(vecinosDe(CIUDAD_INICIAL, 'colegio').map((v) => v.lugar).sort()).toEqual(['administracion', 'casa', 'estadio', 'parque', 'sala_profesores']);
    // Las zonas solo se enlazan con su lugar.
    expect(vecinosDe(CIUDAD_INICIAL, 'sala_profesores')).toEqual([{ lugar: 'colegio', minutos: 2 }]);
  });

  it('las zonas cuestan 2 minutos desde su lugar y 2 más que su lugar desde cualquier otro sitio', () => {
    expect(tiempoEntre(CIUDAD_INICIAL, 'colegio', 'sala_profesores')).toBe(2);
    expect(tiempoEntre(CIUDAD_INICIAL, 'casa', 'sala_profesores')).toBe(tiempoEntre(CIUDAD_INICIAL, 'casa', 'colegio')! + 2);
    expect(tiempoEntre(CIUDAD_INICIAL, 'sala_profesores', 'administracion')).toBe(4);
    expect(tiempoEntre(CIUDAD_INICIAL, 'sala_club_ciudad', 'sala_profesores')).toBe(tiempoEntre(CIUDAD_INICIAL, 'estadio', 'colegio')! + 4);
  });

  it('las zonas con horario salen en gris fuera de horario y dicen cuándo abren', () => {
    const g = Game.create([personaje, lugares], { seed: 1 });
    advanceTo(g, 'gen.descansar', 0, 7); // lunes, 7:00: la administración abre a las 9:00
    const o = g.preview('lugares.ir_administracion')!;
    expect(o.available).toBe(false);
    expect(o.reason).toMatch(/cerrado.*9:00 a 13:30/);
    advanceTo(g, 'gen.descansar', 0, 10);
    expect(g.preview('lugares.ir_administracion')!.available).toBe(true);
    // El sábado, cerrada; la sala de un club abre a las 9.
    advanceTo(g, 'gen.descansar', 5, 10);
    expect(g.preview('lugares.ir_administracion')!.available).toBe(false);
    expect(g.preview('lugares.ir_sala_club_ciudad')!.available).toBe(true);
  });
});
