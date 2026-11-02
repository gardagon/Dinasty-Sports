import { describe, expect, it } from 'vitest';
import { SERVICES, type NpcDirectory } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';
import { claveDeEquipo, edadNpc, plazaEnElEquipo, reclutarDeportistas, reclutarEnTodos, sinDeporte, type Npc, type NpcsState, type PoblacionGuardada } from '@ds/mod-npcs';
import { hacer, posible } from './ayudas';

/**
 * Plantillas por equipo (club, categoría y deporte): un mínimo y un máximo por equipo, interesados primero hasta el máximo, sin interés solo hasta el mínimo,
 * y el personaje solo entra en un equipo completo si es mejor que alguno de los que hay.
 */

const nueva = (seed = 31) => nuevaPartida({ seed, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
const estado = (g: ReturnType<typeof nueva>) => g.moduleState<NpcsState>('npcs') as { -readonly [K in keyof NpcsState]: NpcsState[K] };
const pobDeFutbol = (g: ReturnType<typeof nueva>): PoblacionGuardada => estado(g).poblaciones!.find((p) => p.deporte === 'futbol')!;
const categoriaDe = (pob: PoblacionGuardada, n: Npc, dia = 0) => pob.categorias!.find((c) => c.edadMin <= edadNpc(n, dia)! && edadNpc(n, dia)! <= c.edadMax)!.id;

describe('cada categoría tiene su equipo del colegio', () => {
  it('con 14 a 18 jugadores por categoría (de benjamín a juvenil), y ninguno de otra categoría ni de otro colegio', () => {
    for (const seed of [31, 32, 33]) {
      const g = nueva(seed);
      const pob = pobDeFutbol(g);
      const equipo = estado(g).npcs.filter((n) => n.deporte === 'futbol' && n.genetica);
      const porCategoria = new Map<string, Npc[]>();
      for (const n of equipo) porCategoria.set(categoriaDe(pob, n), [...(porCategoria.get(categoriaDe(pob, n)) ?? []), n]);
      expect([...porCategoria.keys()].sort()).toEqual(['alevin', 'benjamin', 'cadete', 'infantil', 'juvenil']);
      for (const [cat, jugadores] of porCategoria) {
        expect(jugadores.length, `${cat} (semilla ${seed})`).toBeGreaterThanOrEqual(14);
        expect(jugadores.length, `${cat} (semilla ${seed})`).toBeLessThanOrEqual(18);
        expect(jugadores.every((n) => n.equipo === 'colegio' && n.club?.includes('colegio'))).toBe(true);
      }
    }
  });

  it('el colegio tiene dos clases de 25 por curso: unos 50 alumnos de cada edad', () => {
    const g = nueva();
    for (let edad = 9; edad <= 17; edad++) {
      const alumnos = estado(g).npcs.filter((n) => n.tipos?.some((t) => t.tipo === 'alumno') && edadNpc(n, 0) === edad);
      expect(alumnos.length, `edad ${edad}`).toBe(50);
    }
  });
});

describe('reclutamiento por equipo: interesados hasta el máximo, el resto solo hasta el mínimo', () => {
  /** El mundo de una partida con todos los niños sin deporte y sin ningún interés, salvo los `interesados` (ids) a quienes les gusta el fútbol. */
  const sinNadie = (interesados: Set<string>, g = nueva()) => {
    const pob = pobDeFutbol(g);
    const npcs = estado(g).npcs.map((n) => {
      if (!n.genetica) return n;
      const libre = n.deporte === 'futbol' ? sinDeporte(n, pob, false) : n;
      return { ...libre, rasgos: libre.rasgos && { ...libre.rasgos, intereses: interesados.has(n.id) ? { futbol: 3 } : {} } };
    });
    return { npcs, pob };
  };
  const delEquipo = (npcs: Npc[], pob: PoblacionGuardada, cat: string) => npcs.filter((n) => n.deporte === 'futbol' && n.equipo === 'colegio' && categoriaDe(pob, n) === cat);
  const delColegioEnCategoria = (npcs: Npc[], pob: PoblacionGuardada, cat: string) => npcs.filter((n) => n.genetica && n.colegio === undefined && n.tipos?.some((t) => t.tipo === 'alumno') && n.deporte !== 'atletismo' && categoriaDe(pob, n) === cat && edadNpc(n, 0)! >= 8);

  it('con muchos interesados se llega al máximo y no más', () => {
    const g = nueva();
    const base = sinNadie(new Set(), g);
    const todos = new Set(delColegioEnCategoria(base.npcs, base.pob, 'infantil').map((n) => n.id));
    const { npcs, pob } = sinNadie(todos, g);
    const r = reclutarDeportistas(npcs, pob, 0);
    expect(delEquipo(r, pob, 'infantil')).toHaveLength(18);
  });

  it('con pocos interesados se completa con niños sin interés hasta el mínimo, y no más: quedan huecos para el personaje', () => {
    const g = nueva();
    const base = sinNadie(new Set(), g);
    const cinco = new Set(delColegioEnCategoria(base.npcs, base.pob, 'infantil').slice(0, 5).map((n) => n.id));
    const { npcs, pob } = sinNadie(cinco, g);
    const equipo = delEquipo(reclutarEnTodos(npcs, [pob], 0), pob, 'infantil');
    expect(equipo).toHaveLength(14);
    for (const id of cinco) expect(equipo.some((n) => n.id === id)).toBe(true); // los interesados, dentro
  });

  it('solo recluta a los interesados en la primera vuelta; la segunda completa hasta el mínimo', () => {
    const g = nueva();
    const base = sinNadie(new Set(), g);
    const tres = new Set(delColegioEnCategoria(base.npcs, base.pob, 'alevin').slice(0, 3).map((n) => n.id));
    const { npcs, pob } = sinNadie(tres, g);
    expect(delEquipo(reclutarDeportistas(npcs, pob, 0, true), pob, 'alevin')).toHaveLength(3);
    expect(delEquipo(reclutarDeportistas(npcs, pob, 0, false), pob, 'alevin')).toHaveLength(14);
  });

  it('la plaza que ocupa el personaje cuenta: el equipo se queda en el máximo menos uno', () => {
    const g = nueva();
    const base = sinNadie(new Set(), g);
    const todos = new Set(delColegioEnCategoria(base.npcs, base.pob, 'cadete').map((n) => n.id));
    const { npcs, pob } = sinNadie(todos, g);
    const r = reclutarEnTodos(npcs, [pob], 0, new Map([[claveDeEquipo('colegio', 'cadete'), 1]]));
    expect(delEquipo(r, pob, 'cadete')).toHaveLength(17);
  });
});

describe('el personaje y el equipo de su colegio (dificultad normal)', () => {
  it('el equipo de su categoría guarda un hueco: empieza con 17 de 18 y el personaje entra aunque sea peor que todos', () => {
    for (const seed of [31, 32, 33]) {
      const g = nueva(seed);
      const benjamin = estado(g).npcs.filter((n) => n.deporte === 'futbol' && edadNpc(n, 0)! <= 9 && n.genetica);
      expect(benjamin.length).toBeLessThanOrEqual(17);
      expect(g.service<NpcDirectory>(SERVICES.npcs)!.plaza('futbol', 'colegio', 0).estado).toBe('libre');
      advanceToWeek(g, 'gen.descansar', 1, 2, 15);
      expect(hacer(g, 'futbol.apuntarse_colegio').ok).toBe(true);
    }
  });

  it('aunque el equipo se llene del todo, el del colegio no lo rechaza ni echa a nadie', () => {
    const g = nueva();
    const s = estado(g);
    const libres = s.npcs.filter((n) => n.genetica && n.deporte === undefined && n.colegio === undefined && edadNpc(n, 0)! <= 9 && n.tipos?.some((t) => t.tipo === 'alumno')).slice(0, 5);
    s.npcs = s.npcs.map((n) => (libres.some((l) => l.id === n.id) ? { ...n, deporte: 'futbol', equipo: 'colegio', levels: { ...n.levels, futbol: 99 } } : n));
    const antes = s.npcs.filter((n) => n.deporte === 'futbol' && edadNpc(n, 0)! <= 9).length;
    expect(antes).toBeGreaterThanOrEqual(18);
    advanceToWeek(g, 'gen.descansar', 1, 2, 15);
    expect(g.service<NpcDirectory>(SERVICES.npcs)!.plaza('futbol', 'colegio', 0).estado).toBe('libre');
    expect(hacer(g, 'futbol.apuntarse_colegio').ok).toBe(true);
    expect(estado(g).npcs.filter((n) => n.deporte === 'futbol' && edadNpc(n, 0)! <= 9)).toHaveLength(antes);
  });

  it('el curso siguiente el hueco sigue: el equipo de su nueva categoría se queda en el máximo menos uno', () => {
    const g = nueva();
    const base = estado(g);
    const pob = pobDeFutbol(g);
    // Con muchos interesados en alevín, la renovación guarda el hueco del colegio para el personaje (que tendrá 9 años: sigue en benjamín) o su categoría.
    const todos = new Set(base.npcs.filter((n) => n.genetica && n.tipos?.some((t) => t.tipo === 'alumno') && categoriaDe(pob, n) === 'benjamin').map((n) => n.id));
    const npcs = base.npcs.map((n) => (n.genetica ? { ...n, deporte: undefined, equipo: undefined, rasgos: n.rasgos && { ...n.rasgos, intereses: todos.has(n.id) ? { futbol: 3 } : {} } } : n)) as Npc[];
    const r = reclutarEnTodos(npcs, [pob], 0, new Map([[claveDeEquipo('colegio', 'benjamin'), 1]]));
    expect(r.filter((n) => n.deporte === 'futbol' && n.equipo === 'colegio' && categoriaDe(pob, n) === 'benjamin')).toHaveLength(17);
  });
});

describe('equipos que no son del colegio del personaje: completos, solo entra quien es mejor que alguno', () => {
  /** Quita al equipo del colegio la marca de «del colegio del personaje» (como un club de fuera) y lo llena con niños de nivel 99, salvo el peor. */
  const clubDeFuera = (g: ReturnType<typeof nueva>, peorNivel?: number) => {
    const s = estado(g);
    const pob = s.poblaciones!.find((p) => p.deporte === 'futbol')!;
    pob.equipos = pob.equipos.map((e) => ({ ...e, colegio: undefined }));
    const base = s.npcs.filter((n) => n.deporte === 'futbol' && edadNpc(n, 0)! <= 9);
    const libres = s.npcs.filter((n) => n.genetica && n.deporte === undefined && n.colegio === undefined && edadNpc(n, 0)! <= 9 && n.tipos?.some((t) => t.tipo === 'alumno')).slice(0, 18 - base.length);
    let primero = true;
    s.npcs = s.npcs.map((n) => {
      const esDelEquipo = libres.some((l) => l.id === n.id);
      if (!esDelEquipo && !(n.deporte === 'futbol' && edadNpc(n, 0)! <= 9)) return n;
      const nivel = primero && peorNivel !== undefined ? peorNivel : 99;
      primero = false;
      return { ...n, deporte: 'futbol', equipo: 'colegio', levels: { ...n.levels, futbol: nivel } };
    });
    return s.npcs.filter((n) => n.deporte === 'futbol' && edadNpc(n, 0)! <= 9);
  };

  it('todos mejores que él: no entra y se le dice por qué', () => {
    const g = nueva();
    clubDeFuera(g);
    advanceToWeek(g, 'gen.descansar', 1, 2, 15);
    expect(g.service<NpcDirectory>(SERVICES.npcs)!.plaza('futbol', 'colegio', 20).estado).toBe('completo');
    expect(posible(g, 'futbol.apuntarse_colegio')).toBe(false);
    expect(g.preview('futbol.apuntarse_colegio')!.reason ?? '').toMatch(/completo y todos juegan mejor que tú/);
  });

  it('mejor que el peor: entra y el peor queda sin equipo, sin volver a ser reclutado ese curso', () => {
    const g = nueva();
    const equipo = clubDeFuera(g, 1);
    const peor = equipo.find((n) => n.levels.futbol === 1)!;
    advanceToWeek(g, 'gen.descansar', 1, 2, 15);
    expect(g.service<NpcDirectory>(SERVICES.npcs)!.plaza('futbol', 'colegio', 30)).toMatchObject({ estado: 'por_merito', peor: { id: peor.id } });
    expect(hacer(g, 'futbol.apuntarse_colegio').ok).toBe(true);
    const despues = estado(g).npcs.find((n) => n.id === peor.id)!;
    expect(despues.deporte).toBeUndefined();
    expect(despues.apartado).toEqual(['futbol']);
    const otra = reclutarDeportistas(estado(g).npcs, pobDeFutbol(g), 0);
    expect(otra.find((n) => n.id === peor.id)!.deporte).toBeUndefined();
    expect(estado(g).npcs.filter((n) => n.deporte === 'futbol' && edadNpc(n, 0)! <= 9)).toHaveLength(17);
  });
});
