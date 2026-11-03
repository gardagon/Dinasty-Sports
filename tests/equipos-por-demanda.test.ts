import { beforeAll, describe, expect, it } from 'vitest';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol, rendimiento as rendimientoDeFutbol } from '@ds/mod-futbol';
import {
  MAX_EQUIPOS_POR_CATEGORIA,
  capacidadDe,
  edadNpc,
  equiposPorDemanda,
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
  it('con demanda de sobra un club abre otro equipo y lo llena con los interesados; con poca demanda no abre', () => {
    const pob0 = pobDeFutbol();
    // Solo el club mediano y el del colegio, sin equipos extra, y todos los niños sin deporte.
    const sinNadie = (interesados: Set<string>) =>
      estado().npcs.map((n) => (n.genetica ? { ...(n.deporte === 'futbol' ? sinDeporte(n, pob0, false) : n), rasgos: n.rasgos && { ...n.rasgos, intereses: interesados.has(n.id) ? { futbol: 3 } : {} } } : n));
    const pob: PoblacionGuardada = { ...pob0, equipos: pob0.equipos.filter((e) => e.club === 'club_mediano').map((e) => ({ ...e, equiposPorCategoria: undefined })) };
    const infantiles = estado().npcs.filter((n) => n.genetica && n.colegio === undefined && (edadNpc(n, 0) ?? -1) >= 12 && (edadNpc(n, 0) ?? -1) <= 13);
    // 40 interesados en infantil: el mediano (18) se llena, y los 22 que sobran bastan para otro equipo (mínimo 14).
    const muchos = new Set(infantiles.slice(0, 40).map((n) => n.id));
    const m = mercado(sinNadie(muchos), pob);
    equiposPorDemanda(m, rngNulo);
    const e = m.pobs[0].equipos[0];
    expect(e.equiposPorCategoria?.infantil).toBe(2);
    const equipo = [...m.lista.values()].filter((n) => n.deporte === 'futbol' && n.equipo === 'club_mediano' && (edadNpc(n, 0) ?? -1) >= 12 && (edadNpc(n, 0) ?? -1) <= 13);
    expect(equipo.length).toBeGreaterThan(18);
    expect(equipo.length).toBeLessThanOrEqual(36);
    expect(m.lista.has('entrenador_club_mediano_infantil_2')).toBe(true);
    // Con 25 interesados no sobra para otro equipo (25 - 18 = 7 < 14): no abre.
    const pocos = new Set(infantiles.slice(0, 25).map((n) => n.id));
    const m2 = mercado(sinNadie(pocos), pob);
    equiposPorDemanda(m2, rngNulo);
    expect(m2.pobs[0].equipos[0].equiposPorCategoria?.infantil).toBeUndefined();
  });

  it('un club cierra el equipo que no llega al mínimo de jugadores: se va con su entrenador y los que sobran buscan club', () => {
    const pob0 = pobDeFutbol();
    // El club grande tiene 2 equipos en infantil pero solo 18 + 5 jugadores: el segundo no llega a 14.
    const pob: PoblacionGuardada = { ...pob0, equipos: pob0.equipos.filter((e) => e.club === 'club_grande').map((e) => ({ ...e, equiposPorCategoria: { infantil: 2 } })) };
    const grande = estado().npcs.filter((n) => n.deporte === 'futbol' && n.equipo === 'club_grande' && (edadNpc(n, 0) ?? -1) >= 12 && (edadNpc(n, 0) ?? -1) <= 13);
    const libres = estado().npcs.filter((n) => n.genetica && n.deporte === undefined && (edadNpc(n, 0) ?? -1) >= 12 && (edadNpc(n, 0) ?? -1) <= 13).slice(0, 23 - grande.length);
    const lista = estado().npcs.map((n) => (libres.some((l) => l.id === n.id) ? { ...n, deporte: 'futbol', equipo: 'club_grande', levels: { ...n.levels, futbol: 5 } } : n)).filter((n) => !(n.deporte === 'futbol' && n.equipo !== 'club_grande' && n.genetica && false));
    const m = mercado(
      [...lista.map((n) => (n.deporte === 'futbol' && n.equipo !== 'club_grande' ? sinDeporte(n, pob0, true) : n)), { ...estado().npcs.find((n) => n.role === 'entrenador')!, id: 'entrenador_club_grande_infantil_2' }],
      pob,
    );
    equiposPorDemanda(m, rngNulo);
    expect(m.pobs[0].equipos[0].equiposPorCategoria?.infantil).toBeUndefined();
    expect(m.lista.has('entrenador_club_grande_infantil_2')).toBe(false);
    const quedan = [...m.lista.values()].filter((n) => n.deporte === 'futbol' && n.equipo === 'club_grande' && (edadNpc(n, 0) ?? -1) >= 12 && (edadNpc(n, 0) ?? -1) <= 13);
    expect(quedan.length).toBeLessThanOrEqual(18);
  });
});

describe('el personaje del montón encuentra equipo en su categoría dentro del primer plazo', () => {
  it('en 12 semillas, con las acciones de verdad (apuntarse a un club de la zona con la regla de plaza), entra en algún equipo de fútbol de su categoría', () => {
    const noEntra: number[] = [];
    for (let seed = 1; seed <= 12; seed++) {
      const j = nuevaPartida({ seed, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
      advanceToWeek(j, 'gen.descansar', 1, 2, 17);
      const candidatos = ['futbol.apuntarse.club_pequeno', 'futbol.apuntarse.club_mediano', 'futbol.apuntarse.club_grande', 'futbol.apuntarse_colegio'];
      const id = candidatos.find((a) => posible(j, a));
      if (!id || !hacer(j, id).ok) noEntra.push(seed);
    }
    expect(noEntra, `semillas en que no encuentra equipo: ${noEntra.join(', ')}`).toEqual([]);
  }, 400000);
});
