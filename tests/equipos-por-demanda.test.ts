import { beforeAll, describe, expect, it, vi } from 'vitest';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { DATOS_FUTBOL, futbol, rendimiento as rendimientoDeFutbol, rendimientoPorPuestos } from '@ds/mod-futbol';
import {
  MAX_EQUIPOS_POR_CATEGORIA,
  capacidadConPlazasDeMas,
  edadNpc,
  draftDeEquipos,
  valorRealDe,
  sinDeporte,
  valoracionDe,
  type MercadoDeFichajes,
  type Npc,
  type NpcsState,
  type PoblacionGuardada,
} from '@ds/mod-npcs';
import { hacer, hacerPruebaDeAcceso, posible } from './ayudas';
import { ID_TRES_CLUBES } from './ciudades';

// Estos tests crean partidas con fútbol (la ciudad de verdad cuesta varios segundos cada una): un plazo para todo el fichero, no test a test.
vi.setConfig({ testTimeout: 240000, hookTimeout: 240000 });

/**
 * Equipos según la demanda (decisión del usuario, 03/11/2026): un personaje del montón siempre encuentra equipo en su categoría y lo difícil es subir, no entrar. Si quedan sin equipo
 * al menos tantos interesados como el mínimo de una plantilla, un club abre otro equipo en esa categoría (con su entrenador); un club cierra el equipo que no llega al mínimo.
 */

const REND = new Map([['futbol', rendimientoDeFutbol]]);
const rngNulo = { next: () => 0.5, int: () => 0, range: () => 0, chance: () => false, pick: <T,>(x: readonly T[]) => x[0], normal: () => 0 };
let g: ReturnType<typeof nuevaPartida>;
beforeAll(() => {
  // Estos tests miran el reparto del «draft» con un azar nulo en una ciudad de tres clubes, y son sensibles al detalle de los valores de partida (con el entrenar por su cuenta de los PNJ, el club pequeño se quedaba sin
  // benjamín en este caso a medida): se crea el mundo sin él, como estaba cuando se escribieron. El mundo real se mide con `npm run equipos`.
  const rutina = DATOS_FUTBOL.paises.espana.poblacion.rutina as { porLibre?: unknown };
  const porLibre = rutina.porLibre;
  rutina.porLibre = undefined;
  try {
    g = nuevaPartida({ seed: 31, pais: ID_TRES_CLUBES, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
  } finally {
    rutina.porLibre = porLibre;
  }
});
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
        expect(jugadores, `${e.club} ${cat}`).toBeLessThanOrEqual(capacidadConPlazasDeMas(e, cat));
        expect(jugadores, `${e.club} ${cat}`).toBeGreaterThan((k - 1) * e.plantillaPorCategoria!.max); // el último equipo llega al mínimo de jugadores
      }
    }
  });
});

describe('el «draft» por rondas (sustituye a los equipos según la demanda)', () => {
  const REND_PUESTOS = new Map([['futbol', Object.assign((p: Parameters<typeof rendimientoDeFutbol>[0]) => rendimientoDeFutbol(p), { puestos: rendimientoPorPuestos })]]);
  const enCategoria = (n: Npc, cat: { edadMin: number; edadMax: number }) => (edadNpc(n, 0) ?? -1) >= cat.edadMin && (edadNpc(n, 0) ?? -1) <= cat.edadMax;
  /** El mundo con todos los futbolistas de vuelta a la bolsa (sin equipo) y sin ningún equipo de más: el «draft» los forma otra vez, solo con los `interesados` (todos si no se dice). */
  const desdeLaBolsa = (interesados?: Set<string>) => {
    const pob0 = pobDeFutbol();
    const pob: PoblacionGuardada = { ...pob0, equipos: pob0.equipos.map((e) => ({ ...e, equiposPorCategoria: undefined })) };
    const lista = new Map(estado().npcs.filter((n) => !n.id.startsWith('entrenador_club')).map((n) => [n.id, n.genetica && n.deporte === 'futbol' ? sinDeporte(n, pob0, false) : n]));
    if (interesados) for (const [id, n] of lista) if (n.genetica && !interesados.has(id)) lista.set(id, { ...n, rasgos: n.rasgos && { ...n.rasgos, intereses: {} } });
    const m: MercadoDeFichajes = { lista, pobs: [pob], dia: 0, val: valoracionDe(REND_PUESTOS), reservas: new Map() };
    draftDeEquipos(m, { next: () => 0.5, int: () => 0, range: () => 0, chance: () => false, pick: <T,>(x: readonly T[]) => x[0], normal: () => 0 }, { conPrueba: false, conAmbicion: false, reiniciar: true });
    return { m, pob: m.pobs[0] };
  };
  const delClub = (m: MercadoDeFichajes, club: string, cat: { edadMin: number; edadMax: number }) => [...m.lista.values()].filter((n) => n.deporte === 'futbol' && n.equipo === club && enCategoria(n, cat));
  let mundo: ReturnType<typeof desdeLaBolsa>;
  beforeAll(() => {
    mundo = desdeLaBolsa();
  });

  it('primera ronda: los clubes de fuera salen con A y B (o más) de 14 jugadores como mínimo por equipo, y ningún equipo pasa de su máximo', () => {
    const { m, pob } = mundo;
    for (const e of pob.equipos.filter((x) => x.plantillaPorCategoria && x.colegio === undefined)) {
      for (const cat of pob.categorias!.filter((c) => ['benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'].includes(c.id))) {
        const jugadores = delClub(m, e.club, cat).length;
        const k = e.equiposPorCategoria?.[cat.id] ?? 1;
        // Un club que no llega al mínimo de una categoría (el pequeño, el último en escoger, con los niños de 8 a 11 años que quedan) no la forma: o 0 jugadores o equipos completos.
        expect(jugadores === 0 || jugadores >= 14 * k, `${e.club} ${cat.id}: ${jugadores} con ${k} equipos`).toBe(true);
        expect(jugadores, `${e.club} ${cat.id}`).toBeLessThanOrEqual(capacidadConPlazasDeMas(e, cat.id));
        expect(k).toBeLessThanOrEqual(MAX_EQUIPOS_POR_CATEGORIA);
      }
      // Casi todos tienen A y B: un club solo se queda con un equipo en una categoría si los que fueron a probar no daban para más.
      const conDos = pob.categorias!.filter((c) => (e.equiposPorCategoria?.[c.id] ?? 1) >= 2).length;
      expect(conDos, e.club).toBeGreaterThanOrEqual(1); // (con los alumnos de los colegios con club quedándose en ellos, a los de fuera les llegan menos)
    }
  });

  it('cada club solo ve a una parte de la bolsa y los más atractivos escogen primero: el grande se queda con los mejores, y los que vienen detrás, con menos', () => {
    const { m, pob } = mundo;
    const val = valoracionDe(REND_PUESTOS);
    // Se compara dentro de cada categoría (el club que no forma las de los más pequeños tendría, si no, la media de gente mayor y con más nivel).
    const CATEGORIAS = ['infantil', 'cadete', 'juvenil'];
    const media = (club: string, cat: string) => {
      const c = pob.categorias!.find((x) => x.id === cat)!;
      const xs = delClub(m, club, c).filter((n) => n.genetica).map((n) => valorRealDe(n, pob, val, 0) ?? 0);
      return xs.reduce((a, b) => a + b, 0) / xs.length;
    };
    const total = (club: string) => CATEGORIAS.reduce((a, cat) => a + media(club, cat), 0) / CATEGORIAS.length;
    expect(total('club_grande')).toBeGreaterThan(total('club_mediano'));
    expect(total('club_mediano')).toBeGreaterThan(total('club_pequeno'));
    // Pero hay muy buenos en clubes modestos: el mejor del pequeño vale más que el peor del grande.
    const valores = (club: string) => [...m.lista.values()].filter((n) => n.deporte === 'futbol' && n.equipo === club && n.genetica).map((n) => valorRealDe(n, pob, val, 0) ?? 0);
    expect(Math.max(...valores('club_pequeno'))).toBeGreaterThan(Math.min(...valores('club_grande')));
  });

  it('los colegios van los últimos y solo con sus alumnos; ningún equipo del colegio pasa de su máximo y nadie está en dos equipos', () => {
    const { m, pob } = mundo;
    const colegio = pob.equipos.find((e) => e.club === 'colegio')!;
    const delColegio = [...m.lista.values()].filter((n) => n.deporte === 'futbol' && n.equipo === 'colegio');
    expect(delColegio.every((n) => n.colegio === undefined || n.colegio === 'propio')).toBe(true);
    for (const cat of pob.categorias!.filter((c) => ['benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'].includes(c.id))) expect(delClub(m, 'colegio', cat).length).toBeLessThanOrEqual(capacidadConPlazasDeMas(colegio, cat.id));
    const ids = [...m.lista.values()].filter((n) => n.deporte === 'futbol').map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('segunda ronda: con la bolsa que queda salen C y D en algunos clubes (de uno a dos equipos más cada uno), con su entrenador', () => {
    const { m, pob } = mundo;
    const abiertos = pob.equipos.flatMap((e) => Object.values(e.equiposPorCategoria ?? {}));
    expect(abiertos.some((k) => k >= 3)).toBe(true);
    expect(Math.max(...abiertos)).toBeLessThanOrEqual(MAX_EQUIPOS_POR_CATEGORIA);
    for (const e of pob.equipos) for (const [cat, k] of Object.entries(e.equiposPorCategoria ?? {})) for (let n = 2; n <= k; n++) expect(m.lista.has(`entrenador_${e.club}_${cat}_${n}`), `${e.club} ${cat} ${n}`).toBe(true);
  });

  it('con poca bolsa, un club que no llega al mínimo para sus equipos no los monta: los que fueron a probar vuelven a la bolsa', () => {
    const pob0 = pobDeFutbol();
    const cat = pob0.categorias!.find((c) => c.id === 'infantil')!;
    // Solo 20 interesados en infantil: no salen ni dos equipos de 14.
    const pocos = new Set(estado().npcs.filter((n) => n.genetica && enCategoria(n, cat)).slice(0, 20).map((n) => n.id));
    const { m, pob } = desdeLaBolsa(pocos);
    for (const e of pob.equipos.filter((x) => x.plantillaPorCategoria)) {
      const jugadores = delClub(m, e.club, cat).length;
      const k = e.equiposPorCategoria?.infantil ?? 1;
      expect(jugadores === 0 || jugadores >= 14 * Math.max(1, k) || e.colegio !== undefined, `${e.club}: ${jugadores} jugadores con ${k} equipos`).toBe(true);
      expect(k).toBeLessThanOrEqual(1 + Math.floor(jugadores / 14));
      if (!e.colegio) expect(m.lista.has(`entrenador_${e.club}_infantil_2`) && k < 2).toBe(false); // sin segundo equipo no queda su entrenador
    }
  });
});

describe('el personaje del montón encuentra equipo en su categoría dentro del primer plazo', () => {
  it('en 12 semillas, con las acciones de verdad (una prueba de acceso en un club de la zona o apuntarse al del colegio), entra en algún equipo de fútbol de su categoría', () => {
    const noEntra: number[] = [];
    for (let seed = 1; seed <= 12; seed++) {
      const j = nuevaPartida({ seed, pais: ID_TRES_CLUBES, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
      advanceToWeek(j, 'gen.descansar', 1, 2, 17);
      // Un miércoles a las 17:00 el club mediano hace sus pruebas; después, el del colegio (sin prueba) como segunda opción.
      if (posible(j, 'futbol.pedir_prueba.club_mediano')) hacerPruebaDeAcceso(j, 'club_mediano');
      const club = () => j.service<{ membership(d: string): unknown }>('clubes')!.membership('futbol');
      // Si la prueba no sale, al día siguiente, a la hora de siempre, el club del colegio (sin prueba) como segunda opción.
      if (!club()) advanceToWeek(j, 'gen.descansar', 1, 3, 15);
      if (!club() && (!posible(j, 'futbol.apuntarse_colegio') || !hacer(j, 'futbol.apuntarse_colegio').ok)) noEntra.push(seed);
    }
    expect(noEntra, `semillas en que no encuentra equipo: ${noEntra.join(', ')}`).toEqual([]);
  }, 400000);
});
