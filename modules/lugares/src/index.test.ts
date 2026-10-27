import { describe, expect, it } from 'vitest';
import { CIUDAD_INICIAL, defineModule, enLugar, tiempoEntre, pasosDesde, sePuedeIr, type LugaresService } from '@ds/contracts';
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
    // Desde un lugar, los pasos son su calle y sus zonas (no otros lugares).
    expect(svc.pasos()).toEqual([{ lugar: expect.objectContaining({ id: 'avenida_parque' }), minutos: 1, tipo: 'calle' }]);
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

  it('los caminos del mapa usan sitios que existen y salen en ambos sentidos', () => {
    for (const [a, b] of CIUDAD_INICIAL.entreCalles) expect(ids).toContain(a), expect(ids).toContain(b);
    for (const l of CIUDAD_INICIAL.lugares) {
      if (l.enCalle) expect(ids).toContain(l.enCalle);
      if (l.dentroDe) expect(ids).toContain(l.dentroDe);
    }
    // Desde la entrada del colegio: sus zonas y su calle. Desde la calle: sus lugares y las calles vecinas.
    expect(pasosDesde(CIUDAD_INICIAL, 'colegio').map((p) => `${p.tipo}:${p.lugar}`).sort()).toEqual(['calle:calle_colegio', 'dentro:administracion', 'dentro:aula', 'dentro:pista_colegio', 'dentro:sala_profesores']);
    expect(pasosDesde(CIUDAD_INICIAL, 'calle_casa').map((p) => `${p.tipo}:${p.lugar}`).sort()).toEqual(['lugar:casa', 'lugar:restaurante', 'lugar:supermercado', 'otra_calle:avenida_parque', 'otra_calle:calle_colegio']);
    // Las zonas solo se enlazan con su lugar.
    expect(pasosDesde(CIUDAD_INICIAL, 'sala_profesores')).toEqual([{ lugar: 'colegio', minutos: 2, tipo: 'entrada' }]);
  });

  it('el viaje rápido salta a cualquier lugar, pero nunca a una zona ni a una calle', () => {
    expect(sePuedeIr(CIUDAD_INICIAL, 'casa', 'colegio')).toBe(true);
    expect(sePuedeIr(CIUDAD_INICIAL, 'casa', 'aula')).toBe(false);
    expect(sePuedeIr(CIUDAD_INICIAL, 'casa', 'calle_colegio')).toBe(false);
    expect(sePuedeIr(CIUDAD_INICIAL, 'colegio', 'aula')).toBe(true);
    expect(sePuedeIr(CIUDAD_INICIAL, 'casa', 'calle_casa')).toBe(true);
    expect(sePuedeIr(CIUDAD_INICIAL, 'aula', 'colegio')).toBe(true);
  });

  it('el camino por las calles cuesta lo mismo que el viaje rápido', () => {
    const g = partida();
    const antes = g.time.minute;
    for (const id of ['calle_casa', 'calle_colegio', 'colegio']) expect(g.perform(`lugares.ir_${id}`).ok, id).toBe(true);
    expect(g.time.minute - antes).toBe(tiempoEntre(CIUDAD_INICIAL, 'casa', 'colegio'));
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
    g.perform('lugares.ir_colegio');
    const o = g.preview('lugares.ir_administracion')!;
    expect(o.available).toBe(false);
    expect(o.reason).toMatch(/cerrado.*9:00 a 13:30/);
    advanceTo(g, 'gen.descansar', 0, 10);
    g.perform('lugares.ir_colegio'); // (esperar fuera de casa puede haberte llevado a casa)
    expect(g.preview('lugares.ir_administracion')!.available).toBe(true);
    // El sábado, cerrada; la sala de un club abre a las 9.
    advanceTo(g, 'gen.descansar', 5, 10);
    expect(g.preview('lugares.ir_administracion')!.available).toBe(false);
    g.perform('lugares.ir_estadio');
    expect(g.preview('lugares.ir_sala_club_ciudad')!.available).toBe(true);
  });
});
