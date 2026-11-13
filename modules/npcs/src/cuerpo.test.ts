import { describe, expect, it } from 'vitest';
import { PAIS_CIUDAD_DE_PRUEBA, complexion, registrarPais } from '@ds/contracts';
import { Game, advanceToWeek } from '@ds/core';
import { personaje } from '@ds/mod-personaje';
import { lugares } from '@ds/mod-lugares';
import { atletismo } from '@ds/mod-atletismo';
import { actividadDeAdulto, actividadTrasElCumple, conCuerpo, habitosDeNpc, semanaDelCuerpo } from './cuerpo';
import { npcs, type Npc, type NpcsState } from './index';

registrarPais(PAIS_CIUDAD_DE_PRUEBA);

const persona = (id: string, edad: number, extra: Partial<Npc> = {}): Npc =>
  ({ id, name: id, role: 'vecino', gender: 'm', tags: [], levels: {}, potential: {}, nacimiento: -Math.round(edad * 365), ...extra }) as Npc;

describe('cuerpo de los PNJ', () => {
  it('quien tiene fecha de nacimiento recibe su cuerpo (estable, con la misma regla de hábitos) y quien no, no', () => {
    const lista = [persona('a', 10), persona('b', 40), persona('c', 30, { nacimiento: undefined })];
    const con = conCuerpo(lista, 0, 7);
    expect(con[0].cuerpo).toBeDefined();
    expect(con[1].actividad).toBeDefined();
    expect(con[2].cuerpo).toBeUndefined();
    expect(conCuerpo(lista, 0, 7)[0].cuerpo).toEqual(con[0].cuerpo);
    // sin nadie que lo necesite devuelve la misma lista (las cachés dependen de ello)
    expect(conCuerpo(con, 0, 7)).toBe(con);
  });

  it('los hábitos: base por edad más las sesiones del club, que también son fuerza', () => {
    const nino = persona('n', 10);
    const sin = habitosDeNpc(nino, 10, 7);
    const con = habitosDeNpc(nino, 10, 7, 2);
    expect(con.activo - sin.activo).toBe(180);
    expect(con.fuerza - sin.fuerza).toBe(60);
    const adulto = persona('x', 35, { actividad: [300, 100] });
    expect(habitosDeNpc(adulto, 35, 7)).toEqual({ activo: 300, fuerza: 100 });
  });

  it('la actividad de un adulto sale de su semilla y cambia poco en cada cumpleaños', () => {
    const p = persona('adulto', 35);
    expect(actividadDeAdulto(p, 3)).toEqual(actividadDeAdulto(p, 3));
    let a = actividadDeAdulto(p, 3);
    let salto = 0;
    for (let edad = 36; edad < 76; edad++) {
      const b = actividadTrasElCumple(a, p, 3, edad);
      expect(b[0]).toBeGreaterThanOrEqual(0);
      expect(b[1]).toBeLessThanOrEqual(b[0]);
      if (Math.abs(b[0] - a[0]) > 120) salto++;
      a = b;
    }
    expect(salto).toBeLessThan(8);
  });

  it('el cuerpo avanza cada semana hacia su objetivo, con los hábitos de cada uno', () => {
    const lista = conCuerpo([persona('vago', 40, { actividad: [0, 0] }), persona('atleta', 40, { actividad: [900, 500] })], 0, 1);
    lista[0].cuerpo = [20, 50];
    lista[1].cuerpo = [20, 50];
    for (let w = 1; w <= 60; w++) semanaDelCuerpo(lista, w * 7, new Map(), 1);
    expect(complexion(...lista[0].cuerpo!)).toBe('con_sobrepeso');
    expect(['atletico', 'musculado']).toContain(complexion(...lista[1].cuerpo!));
  });

  it('un niño no se pone musculado aunque haga mucho deporte', () => {
    const lista = conCuerpo([persona('nino', 9)], 0, 1);
    for (let w = 1; w <= 80; w++) semanaDelCuerpo(lista, w * 7, new Map([['nino', 12]]), 1);
    expect(complexion(...lista[0].cuerpo!)).not.toBe('musculado');
  });

  it('en una partida, todos los que tienen fecha de nacimiento tienen cuerpo y se mueve con las semanas', () => {
    const g = Game.create([personaje, npcs, lugares, atletismo], { seed: 9 });
    const lista = () => g.moduleState<NpcsState>('npcs').npcs;
    expect(lista().filter((n) => n.nacimiento !== undefined && !n.cuerpo)).toHaveLength(0);
    const antes = new Map(lista().map((n) => [n.id, n.cuerpo!.join()]));
    advanceToWeek(g, 'gen.descansar', 8, 0, 12);
    const despues = lista();
    expect(despues.filter((n) => n.nacimiento !== undefined && !n.cuerpo)).toHaveLength(0);
    expect(despues.filter((n) => n.cuerpo && antes.get(n.id) !== n.cuerpo.join()).length).toBeGreaterThan(despues.length / 2);
  });
});
