import { describe, expect, it } from 'vitest';
import { CIUDAD_INICIAL, ensamblarMapa, defineModule, enLugar, rutaA, tiempoEntre, pasosDesde, sePuedeIr, type LugaresService } from '@ds/contracts';
import { Game, advanceTo } from '@ds/core';
import { atletismo, LUGARES_ATLETISMO } from '@ds/mod-atletismo';
import { personaje } from '@ds/mod-personaje';
import { lugares } from './index';

/** El mapa de la ciudad con los sitios que pone el atletismo (el estadio, la pista del colegio, las salas de los clubes). */
const MAPA = ensamblarMapa(CIUDAD_INICIAL, [LUGARES_ATLETISMO]);

/** Va a un sitio por el camino del mapa (el viaje rápido solo se hace desde una calle). */
const ir = (g: Game, lugar: string) => {
  for (const parada of rutaA(MAPA, g.service<LugaresService>('lugares')!.actual().id, lugar)) g.perform(`lugares.ir_${parada}`);
};

const partida = () => Game.create([personaje, lugares, atletismo], { seed: 1 });

describe('módulo lugares', () => {
  it('funciona solo con el módulo base y la partida empieza en casa', () => {
    const g = Game.create([personaje, lugares], { seed: 1 });
    expect(g.service<LugaresService>('lugares')?.actual().id).toBe('casa');
  });

  it('los sitios de un deporte salen del deporte: sin él no hay estadio ni acciones para ir', () => {
    const sin = Game.create([personaje, lugares], { seed: 1 });
    const con = partida();
    const ids = (g: Game) => g.service<LugaresService>('lugares')!.mapa().lugares.map((l) => l.id);
    for (const id of ['avenida_estadio', 'estadio', 'pista_colegio', 'sala_club_ciudad', 'sala_club_alto_rendimiento']) {
      expect(ids(sin)).not.toContain(id);
      expect(sin.preview(`lugares.ir_${id}`)).toBeUndefined();
      expect(ids(con)).toContain(id);
      expect(con.preview(`lugares.ir_${id}`)).toBeDefined();
    }
    expect(ids(con)).toEqual(MAPA.lugares.map((l) => l.id)); // y salen donde dicen, no al final
  });

  it('ir a un sitio cuesta lo que el camino y cambia la ubicación', () => {
    const g = partida();
    const antes = g.time.minute;
    // Desde casa el viaje rápido no existe: hay que salir a la calle (1 min) y de ahí al colegio (el resto del camino).
    expect(g.perform('lugares.ir_colegio').ok).toBe(false);
    expect(g.preview('lugares.ir_colegio')!.reason).toMatch(/solo se hace desde la calle/);
    ir(g, 'colegio');
    expect(g.time.minute - antes).toBe(10);
    expect(g.service<LugaresService>('lugares')?.actual().id).toBe('colegio');
  });

  it('no se puede ir al sitio donde ya se está', () => {
    const g = partida();
    expect(g.perform('lugares.ir_casa').ok).toBe(false);
  });

  it('el viaje rápido cuesta lo que dice la tabla de tiempos', () => {
    const g = partida();
    ir(g, 'parque');
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
    ir(g, 'colegio');
    expect(g.perform('prueba.clase').ok).toBe(true);
  });
});

describe('mapa de la ciudad', () => {
  const ids = MAPA.lugares.map((l) => l.id);

  it('la tabla de tiempos está completa: todos con todos, y cero con uno mismo', () => {
    for (const a of ids) {
      for (const b of ids) {
        const t = tiempoEntre(MAPA, a, b);
        expect(t, `${a} → ${b}`).toBeDefined();
        if (a === b) expect(t).toBe(0);
        else expect(t).toBeGreaterThan(0);
      }
    }
  });

  it('la tabla es simétrica y no tiene lugares que no existan', () => {
    expect(Object.keys(MAPA.tiempos).sort()).toEqual([...ids].sort());
    for (const a of ids) for (const b of ids) expect(tiempoEntre(MAPA, a, b)).toBe(tiempoEntre(MAPA, b, a));
  });

  it('los caminos del mapa usan sitios que existen y salen en ambos sentidos', () => {
    for (const [a, b] of MAPA.entreCalles) expect(ids).toContain(a), expect(ids).toContain(b);
    for (const l of MAPA.lugares) {
      if (l.enCalle) expect(ids).toContain(l.enCalle);
      if (l.dentroDe) expect(ids).toContain(l.dentroDe);
    }
    // Desde la entrada del colegio: sus zonas y su calle. Desde la calle: sus lugares y las calles vecinas.
    expect(pasosDesde(MAPA, 'colegio').map((p) => `${p.tipo}:${p.lugar}`).sort()).toEqual(['calle:calle_colegio', 'dentro:administracion', 'dentro:aula', 'dentro:patio', 'dentro:pista_colegio', 'dentro:sala_profesores']);
    // Las zonas del colegio salen en este orden: aula, patio, sala de profesores, administración y pista de atletismo.
    expect(pasosDesde(MAPA, 'colegio').filter((p) => p.tipo === 'dentro').map((p) => p.lugar)).toEqual(['aula', 'patio', 'sala_profesores', 'administracion', 'pista_colegio']);
    expect(pasosDesde(MAPA, 'calle_casa').map((p) => `${p.tipo}:${p.lugar}`).sort()).toEqual(['lugar:casa', 'lugar:restaurante', 'lugar:supermercado', 'otra_calle:avenida_parque', 'otra_calle:calle_colegio']);
    // Las zonas solo se enlazan con su lugar.
    expect(pasosDesde(MAPA, 'sala_profesores')).toEqual([{ lugar: 'colegio', minutos: 2, tipo: 'entrada' }]);
  });

  it('el viaje rápido salta a cualquier lugar, pero solo desde una calle y nunca a una zona ni a una calle', () => {
    expect(sePuedeIr(MAPA, 'calle_casa', 'colegio')).toBe(true);
    expect(sePuedeIr(MAPA, 'calle_casa', 'estadio')).toBe(true);
    expect(sePuedeIr(MAPA, 'calle_casa', 'aula')).toBe(false);
    expect(sePuedeIr(MAPA, 'calle_casa', 'calle_colegio')).toBe(true); // calle vecina: un paso, no viaje rápido
    expect(sePuedeIr(MAPA, 'calle_casa', 'avenida_parque')).toBe(true);
    // Desde dentro de un lugar o de una zona no hay viaje rápido: hay que salir.
    expect(sePuedeIr(MAPA, 'casa', 'colegio')).toBe(false);
    expect(sePuedeIr(MAPA, 'colegio', 'parque')).toBe(false);
    expect(sePuedeIr(MAPA, 'aula', 'colegio')).toBe(true); // la entrada del lugar es un paso
    expect(sePuedeIr(MAPA, 'aula', 'estadio')).toBe(false);
    expect(sePuedeIr(MAPA, 'casa', 'aula')).toBe(false);
    expect(sePuedeIr(MAPA, 'casa', 'calle_colegio')).toBe(false);
    expect(sePuedeIr(MAPA, 'colegio', 'aula')).toBe(true);
    expect(sePuedeIr(MAPA, 'casa', 'calle_casa')).toBe(true);
  });

  it('rutaA sale primero a la calle (de la zona al lugar y de este a su calle) y luego hace el viaje rápido', () => {
    expect(rutaA(MAPA, 'casa', 'colegio')).toEqual(['calle_casa', 'colegio']);
    expect(rutaA(MAPA, 'aula', 'parque')).toEqual(['colegio', 'calle_colegio', 'parque']);
    expect(rutaA(MAPA, 'casa', 'aula')).toEqual(['calle_casa', 'colegio', 'aula']);
    expect(rutaA(MAPA, 'calle_casa', 'colegio')).toEqual(['colegio']);
  });

  it('el camino por las calles cuesta lo mismo que el viaje rápido', () => {
    const g = partida();
    const antes = g.time.minute;
    for (const id of ['calle_casa', 'calle_colegio', 'colegio']) expect(g.perform(`lugares.ir_${id}`).ok, id).toBe(true);
    expect(g.time.minute - antes).toBe(tiempoEntre(MAPA, 'casa', 'colegio'));
  });

  it('las zonas cuestan 2 minutos desde su lugar y 2 más que su lugar desde cualquier otro sitio', () => {
    expect(tiempoEntre(MAPA, 'colegio', 'sala_profesores')).toBe(2);
    expect(tiempoEntre(MAPA, 'casa', 'sala_profesores')).toBe(tiempoEntre(MAPA, 'casa', 'colegio')! + 2);
    expect(tiempoEntre(MAPA, 'sala_profesores', 'administracion')).toBe(4);
    expect(tiempoEntre(MAPA, 'sala_club_ciudad', 'sala_profesores')).toBe(tiempoEntre(MAPA, 'estadio', 'colegio')! + 4);
  });

  it('las zonas con horario salen en gris fuera de horario y dicen cuándo abren', () => {
    const g = Game.create([personaje, lugares, atletismo], { seed: 1 });
    advanceTo(g, 'gen.descansar', 0, 7); // lunes, 7:00: la administración abre a las 9:00
    ir(g, 'colegio');
    const o = g.preview('lugares.ir_administracion')!;
    expect(o.available).toBe(false);
    expect(o.reason).toMatch(/cerrado.*9:00 a 13:30/);
    advanceTo(g, 'gen.descansar', 0, 10);
    ir(g, 'colegio'); // (esperar fuera de casa puede haberte llevado a casa)
    expect(g.preview('lugares.ir_administracion')!.available).toBe(true);
    // El sábado, cerrada; la sala de un club abre a las 9.
    advanceTo(g, 'gen.descansar', 5, 10);
    expect(g.preview('lugares.ir_administracion')!.available).toBe(false);
    ir(g, 'estadio');
    expect(g.preview('lugares.ir_sala_club_ciudad')!.available).toBe(true);
  });
});
