import { describe, expect, it } from 'vitest';
import { SERVICES, claveDeDeporte, type ClubDirectory, type DeporteService, type PracticaService } from '@ds/contracts';
import { advanceTo, advanceToWeek, checkInvariants, type Game } from '@ds/core';
import { cargarPartida, nuevaPartida } from '@ds/game';
import type { DeportesState } from '@ds/mod-deportes';
import { hacer } from './ayudas';

/** Deporte practicado (fase 0 del plan de deportes modulares): uno a la vez, o ninguno; lo que no se practica se oculta. */

const practica = (g: Game) => g.service<PracticaService>(SERVICES.practica)!;
const club = (g: Game) => g.service<ClubDirectory>(SERVICES.clubes)!.membership('atletismo');
const vista = (g: Game) => g.service<DeporteService>(claveDeDeporte('atletismo'))!.view();
const delAtletismo = (g: Game) => g.listActions().filter((o) => o.id.startsWith('atletismo.'));

describe('deporte practicado', () => {
  it('sin elegir se empieza practicando el atletismo, como siempre', () => {
    const g = nuevaPartida({ seed: 31 });
    expect(practica(g).practicado()).toBe('atletismo');
    expect(practica(g).historial()).toEqual([{ deporte: 'atletismo', desde: 0 }]);
    expect(delAtletismo(g).length).toBeGreaterThan(5);
    expect(g.listActions().some((o) => o.id === 'deportes.dejar')).toBe(true);
  });

  it('se puede empezar sin deporte: no se ve ninguna de sus acciones y no se pueden forzar', () => {
    const g = nuevaPartida({ seed: 31, deporte: null });
    expect(practica(g).practicado()).toBeNull();
    expect(practica(g).historial()).toEqual([]);
    expect(delAtletismo(g)).toEqual([]);
    advanceTo(g, 'gen.descansar', 0, 16);
    const r = g.perform('atletismo.series');
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/No practicas atletismo/);
    // La pestaña del deporte queda desactivada y dice cómo activarla.
    expect(vista(g).inactivo).toMatch(/No practicas atletismo/);
    expect(g.listActions().some((o) => o.id === 'deportes.empezar.atletismo' && o.name === 'Empezar el atletismo')).toBe(true);
    expect(g.listActions().some((o) => o.id === 'deportes.dejar')).toBe(false);
    expect(checkInvariants(g)).toEqual([]);
  });

  it('«Empezar el atletismo» devuelve sus acciones y su pestaña, sin club al principio', () => {
    const g = nuevaPartida({ seed: 31, deporte: null });
    advanceToWeek(g, 'gen.descansar', 1, 2, 15);
    expect(g.perform('deportes.empezar.atletismo').ok).toBe(true);
    expect(practica(g).practicado()).toBe('atletismo');
    expect(club(g)).toBeUndefined();
    expect(delAtletismo(g).length).toBeGreaterThan(5);
    expect(vista(g).inactivo).toMatch(/Apúntate a un club/);
    expect(hacer(g, 'atletismo.apuntarse_colegio').ok).toBe(true);
    expect(vista(g).inactivo).toBeUndefined();
    expect(practica(g).historial()).toEqual([{ deporte: 'atletismo', desde: 0 }]);
  });

  it('dejar el deporte saca del club, oculta sus acciones y conserva sus habilidades y su historial; se puede volver', () => {
    const g = nuevaPartida({ seed: 31 });
    advanceToWeek(g, 'gen.descansar', 1, 2, 15);
    expect(hacer(g, 'atletismo.apuntarse_colegio').ok).toBe(true);
    expect(club(g)?.id).toBe('colegio');
    const tecnica = g.stat('atletismo.tecnica');
    const dejar = g.preview('deportes.dejar')!;
    expect(dejar.name).toBe('Dejar el atletismo');
    expect(g.perform('deportes.dejar').ok).toBe(true);
    expect(practica(g).practicado()).toBeNull();
    expect(club(g)).toBeUndefined();
    expect(delAtletismo(g)).toEqual([]);
    expect(g.stat('atletismo.tecnica')).toBeCloseTo(tecnica, 0); // la caída viene con los días, no al instante
    const curso = g.time.schoolYear;
    expect(practica(g).historial()).toEqual([{ deporte: 'atletismo', desde: 0, hasta: curso }]);
    // Sin ningún deporte también se vive: el día sigue y el estado es coherente.
    advanceToWeek(g, 'gen.descansar', 3, 0, 10);
    expect(checkInvariants(g)).toEqual([]);
    expect(g.stat('atletismo.tecnica')).toBeLessThanOrEqual(tecnica); // la caída es la de siempre (con el suelo de lo alcanzado)
    // Volver: su historial anterior se conserva y se añade el nuevo tramo.
    expect(g.perform('deportes.empezar.atletismo').ok).toBe(true);
    expect(practica(g).historial()).toHaveLength(2);
    expect(practica(g).historial()[0].hasta).toBe(curso);
  });

  it('el deporte practicado y el historial se guardan y se recuperan', () => {
    const g = nuevaPartida({ seed: 31 });
    g.perform('deportes.dejar');
    const g2 = cargarPartida(JSON.parse(JSON.stringify(g.serialize())));
    expect(g2.moduleState<DeportesState>('deportes').practicado).toBeNull();
    expect(delAtletismo(g2)).toEqual([]);
  });

  it('una partida guardada antes de este módulo sigue practicando el atletismo', () => {
    const g = nuevaPartida({ seed: 31 });
    const guardado = JSON.parse(JSON.stringify(g.serialize()));
    delete guardado.modules.deportes;
    expect(practica(cargarPartida(guardado)).practicado()).toBe('atletismo');
  });
});
