import { describe, expect, it } from 'vitest';
import { SERVICES, type NpcDirectory } from '@ds/contracts';
import { advanceToWeek, type Game } from '@ds/core';
import { MODULOS, añadirDeporteALaPartida, cargarPartida, deportesDeLaPartida, motivoParaNoQuitar, nuevaPartida, quitarDeporteDeLaPartida } from '@ds/game';
import type { NpcsState } from '@ds/mod-npcs';
import { CON_PRUEBA } from './deporte-de-prueba';

/**
 * Deportes en la partida (fase 5 del plan de deportes modulares): añadir uno a una partida empezada, quitarlo sin perder nada y volver a añadirlo.
 */

const solo = (seed = 31) => nuevaPartida({ seed, deportes: ['atletismo'] }, CON_PRUEBA);
const gente = (g: Game, deporte: string) => g.moduleState<NpcsState>('npcs').npcs.filter((n) => n.deporte === deporte && n.genetica);
const conPrueba = (g: Game): Game => añadirDeporteALaPartida(g, 'prueba', CON_PRUEBA);

describe('añadir un deporte a una partida empezada', () => {
  it('el deporte nace con la partida en marcha: sus habilidades, su gente y sus entrenadores; lo que había no cambia', () => {
    const g = solo();
    advanceToWeek(g, 'gen.descansar', 3, 1, 10);
    expect(deportesDeLaPartida(g, CON_PRUEBA)).toEqual(['atletismo']);
    expect(g.registry.stats.has('prueba.tecnica')).toBe(false);
    const antes = JSON.stringify(gente(g, 'atletismo'));
    const dia = g.time.day;

    const h = conPrueba(g);
    expect(deportesDeLaPartida(h, CON_PRUEBA)).toEqual(['atletismo', 'prueba']);
    expect(h.time.day).toBe(dia); // no pasa el tiempo
    expect(h.stat('prueba.tecnica')).toBe(10);
    // Su gente: las plantillas completas (6 + 4 + 4), con su etiqueta y sus entrenadores.
    const jugadores = gente(h, 'prueba');
    expect(jugadores).toHaveLength(14);
    expect(jugadores.every((n) => n.tags.includes('jugador') && n.levels.prueba !== undefined)).toBe(true);
    expect(h.moduleState<NpcsState>('npcs').npcs.filter((n) => n.role === 'entrenador' && n.deporte === 'prueba').map((n) => n.id).sort()).toEqual(['entrenador_prueba', 'entrenador_prueba_club_norte_1']);
    expect(h.moduleState<NpcsState>('npcs').poblaciones!.map((p) => p.deporte)).toEqual(['atletismo', 'prueba']);
    // Los niños que ya jugaban a otro deporte siguen en él; la partida de antes no se ha tocado.
    expect(JSON.stringify(gente(h, 'atletismo'))).toBe(antes);
    expect(JSON.stringify(gente(g, 'atletismo'))).toBe(antes);
    expect(gente(g, 'prueba')).toHaveLength(0);
    // Y la partida sigue: pasan las semanas y los equipos del nuevo deporte siguen llenos.
    advanceToWeek(h, 'gen.descansar', 8, 1, 10);
    expect(gente(h, 'prueba')).toHaveLength(14);
    expect(h.service<NpcDirectory>(SERVICES.npcs)!.list({ tag: 'jugador' }).length).toBe(14);
  });

  it('no se puede añadir dos veces ni uno que no existe', () => {
    const h = conPrueba(solo());
    expect(() => conPrueba(h)).toThrow(/ya está en la partida/);
    expect(() => añadirDeporteALaPartida(h, 'futbol', CON_PRUEBA)).toThrow(/No hay ningún deporte/);
  });

  it('una partida con el deporte añadido se guarda y se carga con él', () => {
    const h = conPrueba(solo());
    const cargada = cargarPartida(JSON.parse(JSON.stringify(h.serialize())), CON_PRUEBA);
    expect(deportesDeLaPartida(cargada, CON_PRUEBA)).toEqual(['atletismo', 'prueba']);
    expect(gente(cargada, 'prueba')).toHaveLength(14);
  });
});

describe('quitar un deporte y volver a añadirlo', () => {
  /** Una partida con los dos deportes y la habilidad del segundo bien alta. */
  const dosConHabilidad = (): Game => {
    const estado = conPrueba(solo()).serialize();
    estado.stats['prueba.tecnica'] = estado.peaks['prueba.tecnica'] = 60;
    return cargarPartida(estado, CON_PRUEBA);
  };

  it('siempre queda uno, y no se deja un deporte del que se es socio de un club', () => {
    expect(motivoParaNoQuitar(solo(), 'atletismo', CON_PRUEBA)).toMatch(/al menos un deporte/);
    const g = dosConHabilidad();
    expect(motivoParaNoQuitar(g, 'prueba', CON_PRUEBA)).toBeUndefined();
    expect(g.perform('prueba.unirse').ok).toBe(true);
    expect(motivoParaNoQuitar(g, 'prueba', CON_PRUEBA)).toMatch(/dejar tu club/);
    expect(() => quitarDeporteDeLaPartida(g, 'prueba', CON_PRUEBA)).toThrow(/dejar tu club/);
  });

  it('el deporte quitado desaparece de la partida, pero sus habilidades siguen cayendo y su gente sigue viviendo', () => {
    const g = dosConHabilidad();
    const h = quitarDeporteDeLaPartida(g, 'prueba', CON_PRUEBA);
    expect(deportesDeLaPartida(h, CON_PRUEBA)).toEqual(['atletismo']);
    expect(h.registry.moduleIds.has('prueba')).toBe(false);
    expect(h.registry.stats.get('prueba.tecnica')!.def.hidden).toBe(true); // no se ve en la interfaz
    expect(h.stat('prueba.tecnica')).toBe(60);
    const dia = h.time.day;
    advanceToWeek(h, 'gen.descansar', 12, 1, 10);
    expect(h.time.day).toBeGreaterThan(dia);
    const cae = h.stat('prueba.tecnica');
    expect(cae).toBeLessThan(60); // sigue cayendo
    expect(cae).toBeGreaterThanOrEqual(36); // pero no por debajo de su suelo (60 % de lo que llegó a tener)
    // Su gente: el siguiente curso se renuevan sus equipos sin el módulo.
    const ids = gente(h, 'prueba').map((n) => n.id);
    expect(ids).toHaveLength(14);
    advanceToWeek(h, 'gen.descansar', 53, 1, 10);
    expect(gente(h, 'prueba')).toHaveLength(14);
    expect(gente(h, 'prueba').some((n) => !ids.includes(n.id))).toBe(true);
  });

  it('al guardar y cargar una partida con un deporte quitado, no vuelve solo, y sus habilidades se conservan', () => {
    const h = quitarDeporteDeLaPartida(dosConHabilidad(), 'prueba', CON_PRUEBA);
    advanceToWeek(h, 'gen.descansar', 6, 1, 10);
    const cargada = cargarPartida(JSON.parse(JSON.stringify(h.serialize())), CON_PRUEBA);
    expect(deportesDeLaPartida(cargada, CON_PRUEBA)).toEqual(['atletismo']);
    expect(cargada.stat('prueba.tecnica')).toBe(h.stat('prueba.tecnica'));
  });

  it('al volver tras un año, el deporte vale lo que valdría si lo hubiera dejado: habilidades caídas, historial intacto y la gente al día', () => {
    const g = dosConHabilidad();
    const quitada = quitarDeporteDeLaPartida(g, 'prueba', CON_PRUEBA);
    advanceToWeek(quitada, 'gen.descansar', 53, 1, 10); // un curso entero
    const habilidad = quitada.stat('prueba.tecnica');
    expect(habilidad).toBeLessThan(60);
    const vuelve = añadirDeporteALaPartida(quitada, 'prueba', CON_PRUEBA);
    expect(deportesDeLaPartida(vuelve, CON_PRUEBA)).toEqual(['atletismo', 'prueba']);
    expect(vuelve.stat('prueba.tecnica')).toBe(habilidad); // no se reinicia ni se congela: es lo que tocaba
    expect(vuelve.serialize().retirados).toBeUndefined();
    // No se duplica su población: sigue habiendo una sola de prueba y los equipos tienen su plantilla.
    expect(vuelve.moduleState<NpcsState>('npcs').poblaciones!.filter((p) => p.deporte === 'prueba')).toHaveLength(1);
    expect(gente(vuelve, 'prueba')).toHaveLength(14);
    expect(new Set(vuelve.moduleState<NpcsState>('npcs').npcs.map((n) => n.id)).size).toBe(vuelve.moduleState<NpcsState>('npcs').npcs.length);
    // Y se puede seguir jugando.
    advanceToWeek(vuelve, 'gen.descansar', 56, 1, 10);
    expect(MODULOS.length).toBeGreaterThan(0);
  }, 60000);
});
