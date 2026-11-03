import { describe, expect, it } from 'vitest';
import { SERVICES, type NpcDirectory } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol, rendimiento as rendimientoDeFutbol } from '@ds/mod-futbol';
import { claveDeEquipo, edadNpc, reclutarDeportistas, reclutarEnTodos, reglaDePlaza, sinDeporte, valorRealDe, valoracionDe, type Npc, type NpcsState, type PoblacionGuardada } from '@ds/mod-npcs';
import { hacer, posible } from './ayudas';

/**
 * Plantillas por equipo (club, categoría y deporte): un mínimo y un máximo por equipo, interesados primero hasta el máximo, sin interés solo hasta el mínimo,
 * y el personaje solo entra en un equipo completo si es mejor que alguno de los que hay.
 */

const nueva = (seed = 31) => nuevaPartida({ seed, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
const estado = (g: ReturnType<typeof nueva>) => g.moduleState<NpcsState>('npcs') as { -readonly [K in keyof NpcsState]: NpcsState[K] };
const pobDeFutbol = (g: ReturnType<typeof nueva>): PoblacionGuardada => estado(g).poblaciones!.find((p) => p.deporte === 'futbol')!;
const categoriaDe = (pob: PoblacionGuardada, n: Npc, dia = 0) => pob.categorias!.find((c) => c.edadMin <= edadNpc(n, dia)! && edadNpc(n, dia)! <= c.edadMax)!.id;

describe('cada club de la zona tiene su equipo por categoría', () => {
  it('cada club (grande, mediano, pequeño y el del colegio) tiene de 14 a 18 jugadores por categoría, de benjamín a juvenil: salen llenos con la población de ahora', () => {
    for (const seed of [31, 32]) {
      const g = nueva(seed);
      const pob = pobDeFutbol(g);
      const equipo = estado(g).npcs.filter((n) => n.deporte === 'futbol' && n.genetica);
      const porEquipo = new Map<string, Npc[]>();
      for (const n of equipo) porEquipo.set(`${n.equipo}|${categoriaDe(pob, n)}`, [...(porEquipo.get(`${n.equipo}|${categoriaDe(pob, n)}`) ?? []), n]);
      for (const club of ['club_grande', 'club_mediano', 'club_pequeno', 'colegio']) {
        for (const cat of ['benjamin', 'alevin', 'infantil', 'cadete', 'juvenil']) {
          const jugadores = porEquipo.get(`${club}|${cat}`) ?? [];
          expect(jugadores.length, `${club} ${cat} (semilla ${seed})`).toBeGreaterThanOrEqual(14);
          expect(jugadores.length, `${club} ${cat} (semilla ${seed})`).toBeLessThanOrEqual(18);
        }
      }
      // El equipo del colegio solo tiene alumnos del colegio; ningún equipo tiene jugadores de otra categoría.
      expect(equipo.filter((n) => n.equipo === 'colegio').every((n) => n.club?.includes('colegio') && (n.colegio === undefined || n.colegio === 'propio'))).toBe(true);
      expect([...new Set(equipo.map((n) => categoriaDe(pob, n)))].sort()).toEqual(['alevin', 'benjamin', 'cadete', 'infantil', 'juvenil']);
    }
  }, 60000);

  it('los clubes escogen por tamaño y por lo que vale cada niño: los jugadores del club grande valen más que los del mediano, y estos más que los del pequeño', () => {
    const g = nueva();
    const pob = pobDeFutbol(g);
    const media = (club: string, cat: string) => {
      const xs = estado(g).npcs.filter((n) => n.deporte === 'futbol' && n.equipo === club && categoriaDe(pob, n) === cat).map((n) => n.levels.futbol);
      return xs.reduce((a, b) => a + b, 0) / xs.length;
    };
    for (const cat of ['alevin', 'infantil', 'cadete']) {
      expect(media('club_grande', cat), cat).toBeGreaterThan(media('club_mediano', cat));
      expect(media('club_mediano', cat), cat).toBeGreaterThan(media('club_pequeno', cat));
    }
  }, 60000);

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
    // Se aísla el equipo del colegio (los demás clubes escogerían antes a los mejores): aquí se prueba la plantilla de un equipo.
    const pob = { ...pobDeFutbol(g), equipos: pobDeFutbol(g).equipos.filter((e) => e.club === 'colegio') };
    const npcs = estado(g).npcs.map((n) => {
      if (!n.genetica) return n;
      const libre = n.deporte === 'futbol' ? sinDeporte(n, pobDeFutbol(g), false) : n;
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

describe('el personaje entra en el equipo de su colegio como cualquier niño', () => {
  /** Los jugadores del equipo de benjamín (la categoría del personaje a los 8 años). */
  const benjamin = (g: ReturnType<typeof nueva>) => estado(g).npcs.filter((n) => n.deporte === 'futbol' && n.equipo === 'colegio' && edadNpc(n, 0)! <= 9);
  /** Llena el equipo hasta el máximo con niños de nivel `nivel` (el del peor, `peorNivel`, si se dice). */
  const llenar = (g: ReturnType<typeof nueva>, nivel: number, peorNivel?: number) => {
    const s = estado(g);
    const base = benjamin(g);
    const libres = s.npcs.filter((n) => n.genetica && n.deporte === undefined && n.colegio === undefined && edadNpc(n, 0)! <= 9 && n.tipos?.some((t) => t.tipo === 'alumno')).slice(0, 18 - base.length);
    let primero = true;
    s.npcs = s.npcs.map((n) => {
      const delEquipo = libres.some((l) => l.id === n.id) || (n.deporte === 'futbol' && n.equipo === 'colegio' && edadNpc(n, 0)! <= 9);
      if (!delEquipo) return n;
      const nv = primero && peorNivel !== undefined ? peorNivel : nivel;
      primero = false;
      return { ...n, deporte: 'futbol', equipo: 'colegio', levels: { ...n.levels, futbol: nv } };
    });
    return benjamin(g);
  };
  const plaza = (g: ReturnType<typeof nueva>, nivel: number) => g.service<NpcDirectory>(SERVICES.npcs)!.plaza('futbol', 'colegio', nivel);

  it('no se le guarda ningún hueco: el equipo de su categoría empieza lleno cuando hay interesados de sobra', () => {
    const llenos = [31, 32, 33].map((seed) => benjamin(nueva(seed)).length);
    expect(llenos.every((n) => n >= 14 && n <= 18)).toBe(true);
    expect(Math.max(...llenos)).toBe(18);
  }, 60000);

  it('con hueco, entra aunque sea peor que todos', () => {
    const g = nueva();
    advanceToWeek(g, 'gen.descansar', 1, 2, 15);
    const equipo = llenar(g, 99);
    // Se va uno: hay hueco.
    const s = estado(g);
    s.npcs = s.npcs.map((n) => (n.id === equipo[0].id ? { ...n, deporte: undefined, equipo: undefined } : n));
    expect(plaza(g, 0).estado).toBe('libre');
    expect(hacer(g, 'futbol.apuntarse_colegio').ok).toBe(true);
  });

  it('completo y peor que todos: no entra y se le dice por qué', () => {
    const g = nueva();
    advanceToWeek(g, 'gen.descansar', 1, 2, 15); // cada semana se recalcula el nivel de los jugadores: se fija después
    llenar(g, 99);
    expect(plaza(g, 20).estado).toBe('completo');
    expect(posible(g, 'futbol.apuntarse_colegio')).toBe(false);
    expect(g.preview('futbol.apuntarse_colegio')!.reason ?? '').toMatch(/completo y todos juegan mejor que tú/);
  });

  it('completo pero mejor que el peor: entra y el peor queda sin equipo, sin volver a ser reclutado ese curso', () => {
    const g = nueva();
    advanceToWeek(g, 'gen.descansar', 1, 2, 15);
    const equipo = llenar(g, 99, 1);
    const peor = equipo.find((n) => n.levels.futbol === 1)!;
    expect(plaza(g, 30)).toMatchObject({ estado: 'por_merito', peor: { id: peor.id } });
    expect(hacer(g, 'futbol.apuntarse_colegio').ok).toBe(true);
    const despues = estado(g).npcs.find((n) => n.id === peor.id)!;
    expect(despues.deporte).toBeUndefined();
    expect(despues.apartado).toEqual(['futbol']);
    const otra = reclutarDeportistas(estado(g).npcs, pobDeFutbol(g), 0);
    expect(otra.find((n) => n.id === peor.id)!.deporte).toBeUndefined();
    expect(benjamin(g)).toHaveLength(17);
  });
});

describe('la plaza en un equipo completo tiene una sola regla, para el personaje y para los niños del mundo', () => {
  it('con hueco, libre; completo, entra quien vale más que el peor; en un empate no entra', () => {
    const equipo = [
      { id: 'a', nombre: 'A', valor: 30 },
      { id: 'b', nombre: 'B', valor: 20 },
      { id: 'c', nombre: 'C', valor: 40 },
    ];
    expect(reglaDePlaza(equipo, 4, 1).estado).toBe('libre');
    expect(reglaDePlaza(equipo, 3, 25)).toMatchObject({ estado: 'por_merito', peor: { id: 'b' } });
    expect(reglaDePlaza(equipo, 3, 20).estado).toBe('completo');
    expect(reglaDePlaza(equipo, 3, 10)).toMatchObject({ estado: 'completo', peor: { id: 'b' } });
  });

  it('un niño del mundo entra por la misma regla: con el equipo completo con los más flojos, los mejores los sustituyen y el equipo acaba con los que más valen', () => {
    const g = nueva();
    const pob0 = pobDeFutbol(g);
    // Solo el equipo del colegio, con plantilla de 3 en la categoría infantil: lo que se prueba es la regla, no el tamaño.
    const pob: PoblacionGuardada = { ...pob0, equipos: pob0.equipos.filter((e) => e.club === 'colegio').map((e) => ({ ...e, categorias: ['infantil'], plantillaPorCategoria: { min: 3, max: 3 } })) };
    const libres = estado(g).npcs.map((n) => (n.genetica ? { ...(n.deporte === 'futbol' ? sinDeporte(n, pob0, false) : n), rasgos: n.rasgos && { ...n.rasgos, intereses: { futbol: 3 } } } : n));
    const equipo = (npcs: Npc[]) => new Set(npcs.filter((n) => n.deporte === 'futbol' && n.equipo === 'colegio').map((n) => n.id));
    const rend = new Map([['futbol', rendimientoDeFutbol]]);
    const recluta = (npcs: Npc[]) => equipo(reclutarDeportistas(npcs, pob, 0, true, new Map(), valoracionDe(rend)));
    // Los tres que más valen son los que forman el equipo cuando todos quieren jugar.
    const mejores = recluta(libres);
    expect(mejores.size).toBe(3);
    // Se parte de un equipo con los tres que menos valen (los únicos interesados), que lo llenan.
    const val = valoracionDe(rend);
    const candidatos = libres.filter((n) => n.genetica && n.colegio === undefined && n.tipos?.some((t) => t.tipo === 'alumno') && edadNpc(n, 0)! >= 12 && edadNpc(n, 0)! <= 13);
    const porValor = [...candidatos].sort((a, b) => valorRealDe(a, pob, val, 0)! - valorRealDe(b, pob, val, 0)! || (a.id < b.id ? -1 : 1));
    const peores = new Set(porValor.slice(0, 3).map((n) => n.id));
    const soloEllos = libres.map((n) => (n.rasgos ? { ...n, rasgos: { ...n.rasgos, intereses: peores.has(n.id) ? { futbol: 3 } : {} } } : n));
    const conLosPeores = reclutarDeportistas(soloEllos, pob, 0, true, new Map(), valoracionDe(rend));
    expect(equipo(conLosPeores)).toEqual(peores);
    // Ahora a todos les interesa: como el equipo está completo, los mejores entran en lugar de los que menos valen, por la misma regla de plaza que el personaje.
    const todosInteresados = conLosPeores.map((n) => (n.genetica && n.rasgos ? { ...n, rasgos: { ...n.rasgos, intereses: { futbol: 3 } } } : n));
    expect(recluta(todosInteresados)).toEqual(mejores);
  }, 60000);
});
