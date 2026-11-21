import { describe, expect, it, vi } from 'vitest';
import { SERVICES, type ClubDirectory, type NpcDirectory } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';
import { hacer, posible } from './ayudas';

vi.setConfig({ testTimeout: 240000, hookTimeout: 240000 });

const partida = (seed = 31) => {
  const g = nuevaPartida({ seed, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
  advanceToWeek(g, 'gen.descansar', 1, 2, 9);
  return g;
};
const clubes = (g: ReturnType<typeof partida>) => g.service<ClubDirectory>(SERVICES.clubes)!;

describe('se compite en un solo deporte', () => {
  it('con el club del colegio de un deporte, no se puede entrar en el de otro (con su motivo); al dejarlo, sí', () => {
    const g = partida();
    expect(hacer(g, 'atletismo.apuntarse_colegio').ok).toBe(true);
    expect(clubes(g).membership('atletismo')).toBeDefined();
    const o = g.preview('futbol.apuntarse_colegio');
    expect(o?.available).toBe(false);
    expect(o?.reason).toBe('Ya compites en atletismo: déjalo antes');
    expect(hacer(g, 'futbol.apuntarse_colegio').ok).toBe(false);
    expect(clubes(g).membership('futbol')).toBeUndefined();
    // Dejar el club abre la puerta.
    expect(hacer(g, 'atletismo.dejar_club').ok).toBe(true);
    expect(g.preview('futbol.apuntarse_colegio')?.reason ?? '').not.toMatch(/Ya compites/);
  });

  it('también al revés, y pedir prueba o aceptar plaza en un club de fuera sale no disponible', () => {
    const g = partida();
    if (!posible(g, 'futbol.apuntarse_colegio')) return; // con algunas semillas el colegio no da plaza (regla de plaza)
    expect(hacer(g, 'futbol.apuntarse_colegio').ok).toBe(true);
    expect(g.preview('atletismo.apuntarse_colegio')?.reason).toBe('Ya compites en fútbol: déjalo antes');
    const deEntrada = g.listActions().filter((a) => /^atletismo\.(apuntarse|prueba|pedir_prueba|aceptar_plaza)/.test(a.id));
    expect(deEntrada.length).toBeGreaterThan(0);
    for (const a of deEntrada) {
      expect(a.available).toBe(false);
      expect(a.reason).toBe('Ya compites en fútbol: déjalo antes');
    }
  });

  it('entrenar por su cuenta otros deportes sigue permitido', () => {
    const g = partida();
    expect(hacer(g, 'atletismo.apuntarse_colegio').ok).toBe(true);
    const libres = g.listActions().filter((a) => /^futbol\.entrena_/.test(a.id));
    expect(libres).toHaveLength(22);
    for (const a of libres) expect(a.reason ?? '').not.toMatch(/Ya compites/);
  });

  it('los PNJ siguen con un solo deporte de competición (`Npc.deporte`): quien tiene club tiene deporte y no lleva datos de competición de otro', () => {
    const g = partida(33);
    advanceToWeek(g, 'gen.descansar', 6, 0, 9);
    const npcs = (g.moduleState('npcs') as { npcs: { id: string; deporte?: string; club?: string; vp?: object; letra?: object; est?: object }[] }).npcs;
    expect(new Set(npcs.map((n) => n.id)).size).toBe(npcs.length);
    const deportistas = npcs.filter((n) => n.club);
    expect(deportistas.length).toBeGreaterThan(0);
    for (const n of deportistas) expect(n.deporte, n.id).toBeTruthy();
    // Y los dos deportes de la partida tienen jugadores, cada uno en el suyo.
    expect(new Set(deportistas.map((n) => n.deporte)).size).toBe(2);
    for (const n of npcs) for (const campo of [n.vp, n.letra, n.est]) expect(Object.keys(campo ?? {}).length, n.id).toBeLessThanOrEqual(1);
  });
});

describe('entrenamientos agrupados', () => {
  it('los entrenamientos por libre de cada deporte llevan el mismo desplegable y siguen existiendo con sus ids', () => {
    const g = partida();
    const lista = g.listActions();
    for (const [dep, ids] of [['atletismo', ['series', 'rodaje', 'tecnica']], ['futbol', ['entrena_toques_y_pared', 'entrena_tiro_a_puerta', 'entrena_velocidad', 'entrena_reflejos']]] as const) {
      const ops = ids.map((i) => lista.find((a) => a.id === `${dep}.${i}`)!);
      for (const o of ops) {
        expect(o, `${dep}.${o?.id}`).toBeDefined();
        expect(o.desplegable).toMatchObject({ id: `${dep}.entrenar`, nombre: 'Entrenar…', etiqueta: 'Entrenamiento', boton: 'Entrenar: {opcion}' });
      }
    }
    // Lo que no es un entrenamiento por libre no se agrupa.
    expect(lista.find((a) => a.id === 'atletismo.club_sesion')?.desplegable).toBeUndefined();
  });
});
