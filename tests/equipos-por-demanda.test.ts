import { beforeAll, describe, expect, it } from 'vitest';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol, rendimiento as rendimientoDeFutbol } from '@ds/mod-futbol';
import {
  MAX_EQUIPOS_POR_CATEGORIA,
  capacidadDe,
  edadNpc,
  equiposPorDemanda,
  reclutarEnTodos,
  sinDeporte,
  valoracionDe,
  type MercadoDeFichajes,
  type Npc,
  type NpcsState,
  type PoblacionGuardada,
} from '@ds/mod-npcs';
import { hacer, posible } from './ayudas';

/**
 * Equipos según la demanda (decisión del usuario, 03/11/2026): un personaje del montón siempre encuentra equipo en su categoría y lo difícil es subir, no entrar. Si quedan sin equipo
 * al menos tantos interesados como el mínimo de una plantilla, un club abre otro equipo en esa categoría (con su entrenador); un club cierra el equipo que no llega al mínimo.
 */

const REND = new Map([['futbol', rendimientoDeFutbol]]);
const rngNulo = { next: () => 0.5, int: () => 0, range: () => 0, chance: () => false, pick: <T,>(x: readonly T[]) => x[0], normal: () => 0 };
let g: ReturnType<typeof nuevaPartida>;
beforeAll(() => {
  g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
}, 90000);
const estado = () => g.moduleState<NpcsState>('npcs') as NpcsState;
const pobDeFutbol = (): PoblacionGuardada => estado().poblaciones!.find((p) => p.deporte === 'futbol')!;
const interesa = (n: Npc) => Math.max(n.rasgos?.intereses.futbol ?? 0, n.rasgos?.intereses.deporte ?? 0) > 0;
const mercado = (npcs: Npc[], pob: PoblacionGuardada): MercadoDeFichajes => ({ lista: new Map(npcs.map((n) => [n.id, n])), pobs: [pob], dia: 0, val: valoracionDe(REND), reservas: new Map() });

describe('al crear la partida (dentro del plazo) los interesados tienen equipo', () => {
  it('en cada categoría de benjamín a juvenil quedan sin equipo menos interesados que el mínimo de una plantilla (14), y hay varios equipos por club', () => {
    const pob = pobDeFutbol();
    const sinEquipo = estado().npcs.filter((n) => n.genetica && n.deporte === undefined && interesa(n) && !n.dejado?.includes('futbol') && !n.apartado?.includes('futbol'));
    for (const cat of pob.categorias!.filter((c) => ['benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'].includes(c.id))) {
      const sin = sinEquipo.filter((n) => (edadNpc(n, 0) ?? -1) >= cat.edadMin && (edadNpc(n, 0) ?? -1) <= cat.edadMax);
      expect(sin.length, `${cat.id}`).toBeLessThan(14);
    }
    // Hay clubes con más de un equipo en una categoría, y ninguno pasa del tope.
    const abiertos = pob.equipos.flatMap((e) => Object.values(e.equiposPorCategoria ?? {}));
    expect(abiertos.length).toBeGreaterThan(0);
    expect(Math.max(...abiertos)).toBeLessThanOrEqual(MAX_EQUIPOS_POR_CATEGORIA);
  });

  it('cada equipo abierto tiene su entrenador, y ningún club tiene más jugadores en una categoría que equipos × el máximo de un equipo', () => {
    const pob = pobDeFutbol();
    const entrenadores = new Set(estado().npcs.filter((n) => n.role === 'entrenador').map((n) => n.id));
    for (const e of pob.equipos.filter((x) => x.plantillaPorCategoria)) {
      for (const [cat, k] of Object.entries(e.equiposPorCategoria ?? {})) {
        for (let n = 2; n <= k; n++) expect(entrenadores.has(`entrenador_${e.club}_${cat}_${n}`), `${e.club} ${cat} equipo ${n}`).toBe(true);
        const c = pob.categorias!.find((x) => x.id === cat)!;
        const jugadores = estado().npcs.filter((n) => n.deporte === 'futbol' && n.equipo === e.club && (edadNpc(n, 0) ?? -1) >= c.edadMin && (edadNpc(n, 0) ?? -1) <= c.edadMax).length;
        expect(jugadores, `${e.club} ${cat}`).toBeLessThanOrEqual(capacidadDe(e, cat));
        expect(jugadores, `${e.club} ${cat}`).toBeGreaterThan((k - 1) * e.plantillaPorCategoria!.max); // el último equipo llega al mínimo de jugadores
      }
    }
  });
});

describe('abrir y cerrar equipos', () => {
  const infantil = (n: Npc) => (edadNpc(n, 0) ?? -1) >= 12 && (edadNpc(n, 0) ?? -1) <= 13;
  /** Un club (el mediano) en el que todos los niños están sin deporte y solo les interesa el fútbol a los `interesados`. */
  const escenario = (interesados: Set<string>) => {
    const pob0 = pobDeFutbol();
    const pob: PoblacionGuardada = { ...pob0, equipos: pob0.equipos.filter((e) => e.club === 'club_mediano').map((e) => ({ ...e, equiposPorCategoria: undefined })) };
    const libres = estado().npcs.map((n) => (n.genetica ? { ...(n.deporte === 'futbol' ? sinDeporte(n, pob0, false) : n), rasgos: n.rasgos && { ...n.rasgos, intereses: interesados.has(n.id) ? { futbol: 3 } : {} } } : n));
    return { pob, npcs: reclutarEnTodos(libres, [pob], 0, new Map(), REND) };
  };
  const delMediano = (m: MercadoDeFichajes) => [...m.lista.values()].filter((n) => n.deporte === 'futbol' && n.equipo === 'club_mediano' && infantil(n));
  const candidatos = () => estado().npcs.filter((n) => n.genetica && n.colegio === undefined && infantil(n));

  it('con demanda de sobra un club abre otro equipo con los mejores que quedaban sin equipo (hasta el mínimo, con huecos); con poca demanda no abre', () => {
    // 40 interesados en infantil: el mediano (18) se llena y los 22 que sobran bastan para otro equipo (mínimo 14).
    const { pob, npcs } = escenario(new Set(candidatos().slice(0, 40).map((n) => n.id)));
    const m = mercado(npcs, pob);
    expect(delMediano(m)).toHaveLength(18);
    equiposPorDemanda(m, rngNulo);
    expect(m.pobs[0].equipos[0].equiposPorCategoria?.infantil).toBe(2);
    expect(delMediano(m)).toHaveLength(18 + 14); // el equipo nuevo nace con el mínimo (hay huecos hasta 36)
    expect(m.lista.has('entrenador_club_mediano_infantil_2')).toBe(true);
    // Con 25 interesados no sobra para otro equipo (25 - 18 = 7 < 14): no abre.
    const poco = escenario(new Set(candidatos().slice(0, 25).map((n) => n.id)));
    const m2 = mercado(poco.npcs, poco.pob);
    equiposPorDemanda(m2, rngNulo);
    expect(m2.pobs[0].equipos[0].equiposPorCategoria?.infantil).toBeUndefined();
  });

  it('un club cierra el equipo que no llega al mínimo de jugadores: se va con su entrenador y los que sobran buscan club', () => {
    // El mediano tiene dos equipos en infantil pero solo 23 jugadores: el segundo tendría 5 (< 14).
    const { pob, npcs } = escenario(new Set(candidatos().slice(0, 23).map((n) => n.id)));
    const m = mercado(npcs, { ...pob, equipos: pob.equipos.map((e) => ({ ...e, equiposPorCategoria: { infantil: 2 } })) });
    // Los 23 interesados caben (capacidad 36): están todos en el club.
    const antes = [...npcs.filter((n) => n.deporte === 'futbol' && n.equipo === 'club_mediano' && infantil(n))];
    expect(antes.length).toBeLessThanOrEqual(23);
    // Se fuerzan a 23 jugadores en el club.
    const faltan = 23 - antes.length;
    const extra = npcs.filter((n) => n.genetica && n.deporte === undefined && infantil(n)).slice(0, faltan);
    for (const n of extra) m.lista.set(n.id, { ...n, deporte: 'futbol', equipo: 'club_mediano', levels: { ...n.levels, futbol: 5 } });
    m.lista.set('entrenador_club_mediano_infantil_2', { ...npcs.find((n) => n.role === 'entrenador')!, id: 'entrenador_club_mediano_infantil_2' });
    expect(delMediano(m)).toHaveLength(23);
    equiposPorDemanda(m, rngNulo);
    expect(m.pobs[0].equipos[0].equiposPorCategoria?.infantil).toBeUndefined();
    expect(m.lista.has('entrenador_club_mediano_infantil_2')).toBe(false);
    expect(delMediano(m)).toHaveLength(18);
  });
});

describe('el personaje del montón encuentra equipo en su categoría dentro del primer plazo', () => {
  it('en 12 semillas, con las acciones de verdad (una prueba de acceso en un club de la zona o apuntarse al del colegio), entra en algún equipo de fútbol de su categoría', () => {
    const noEntra: number[] = [];
    for (let seed = 1; seed <= 12; seed++) {
      const j = nuevaPartida({ seed, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
      advanceToWeek(j, 'gen.descansar', 1, 2, 17);
      // Un miércoles a las 17:00 el club mediano hace sus pruebas; después, el del colegio (sin prueba) como segunda opción.
      if (posible(j, 'futbol.prueba.club_mediano')) hacer(j, 'futbol.prueba.club_mediano');
      const club = () => j.service<{ membership(d: string): unknown }>('clubes')!.membership('futbol');
      // Si la prueba no sale, al día siguiente, a la hora de siempre, el club del colegio (sin prueba) como segunda opción.
      if (!club()) advanceToWeek(j, 'gen.descansar', 1, 3, 15);
      if (!club() && (!posible(j, 'futbol.apuntarse_colegio') || !hacer(j, 'futbol.apuntarse_colegio').ok)) noEntra.push(seed);
    }
    expect(noEntra, `semillas en que no encuentra equipo: ${noEntra.join(', ')}`).toEqual([]);
  }, 400000);
});
