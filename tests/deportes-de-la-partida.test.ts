import { describe, expect, it } from 'vitest';
import { SERVICES, deportePrincipal, type ClubDirectory, type ClubView } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { cargarPartida, nuevaPartida } from '@ds/game';
import { hacer, posible } from './ayudas';

/**
 * Los deportes de la partida y el deporte principal: se eligen al crear la partida (al menos uno), no se empieza practicando
 * ninguno, se puede hacer cualquiera por libre, y el principal es el del club al que se apunta el personaje.
 */

const clubes = (g: ReturnType<typeof nuevaPartida>) => g.service<ClubDirectory>(SERVICES.clubes)!;
const club = (id: string, desde: number): ClubView => ({ id, nombre: id, esColegio: false, calidad: 1, deportes: [], sesiones: { weekdays: [], desde: 0, hasta: 0 }, desde });

describe('deporte principal', () => {
  it('sin club no hay principal; al apuntarse a un club de un deporte, ese es el principal; al dejarlo, ninguno', () => {
    const g = nuevaPartida({ seed: 31 });
    expect(deportePrincipal(clubes(g), ['atletismo'])).toBeNull();
    advanceToWeek(g, 'gen.descansar', 1, 2, 15);
    expect(hacer(g, 'atletismo.apuntarse_colegio').ok).toBe(true);
    expect(deportePrincipal(clubes(g), ['atletismo'])).toBe('atletismo');
    expect(hacer(g, 'atletismo.dejar_club').ok).toBe(true);
    expect(deportePrincipal(clubes(g), ['atletismo'])).toBeNull();
  });

  it('con clubes en varios deportes gana el último en el que entró (y a igualdad, el primero)', () => {
    const dir = (m: Record<string, ClubView>): ClubDirectory => ({ list: () => [], membership: (s) => m[s] });
    expect(deportePrincipal(dir({ a: club('x', 3), b: club('y', 9) }), ['a', 'b'])).toBe('b');
    expect(deportePrincipal(dir({ a: club('x', 5), b: club('y', 5) }), ['a', 'b'])).toBe('a');
    expect(deportePrincipal(dir({}), ['a', 'b'])).toBeNull();
    expect(deportePrincipal(undefined, ['a'])).toBeNull();
  });

  it('no se ofrece empezar ni dejar un deporte: se entra y se sale de los clubes, y se puede entrenar sin ser de ninguno', () => {
    const g = nuevaPartida({ seed: 31 });
    advanceToWeek(g, 'gen.descansar', 1, 0, 16);
    expect(g.listActions().some((o) => /^deportes\./.test(o.id) || /^(Empezar|Dejar) (el|la) (?!club)/.test(o.name))).toBe(false);
    expect(posible(g, 'atletismo.tecnica')).toBe(true); // sin club (si hace falta, solo hay que ir a la pista)
  });
});

describe('deportes en la partida', () => {
  it('se elige al crearla y se conserva al guardar y cargar', () => {
    const g = nuevaPartida({ seed: 31, deportes: ['atletismo'] });
    expect(g.registry.moduleIds.has('atletismo')).toBe(true);
    const g2 = cargarPartida(JSON.parse(JSON.stringify(g.serialize())));
    expect(g2.registry.moduleIds.has('atletismo')).toBe(true);
  });

  it('siempre hace falta al menos uno y se rechaza uno que no existe', () => {
    expect(() => nuevaPartida({ seed: 31, deportes: [] })).toThrow(/al menos un deporte/);
    expect(() => nuevaPartida({ seed: 31, deportes: ['curling'] })).toThrow(/al menos un deporte/);
  });
});
