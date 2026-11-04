import { beforeAll, describe, expect, it } from 'vitest';
import { cuposPorGrupo, grupoDePuesto, parecidoDePuestos } from '@ds/contracts';
import { MODULOS, nuevaPartida } from '@ds/game';
import { PUESTOS_DE_FUTBOL, futbol, rendimientoPorPuestos, rendimiento as rendimientoDeFutbol } from '@ds/mod-futbol';
import { edadNpc, ofertaAlCandidato, valoracionDe, valoresPorPuestoDe, type Npc, type NpcsState, type PoblacionGuardada } from '@ds/mod-npcs';
import { ofertaDePuesto, ofertasDePuesto, probabilidadDeAceptarPuesto, puestoDondeMasVale, type JugadorConPuesto } from '../modules/npcs/src/puestos';

/**
 * Puestos (adelanto de la F3, `CIUDAD_Y_LIGAS.md` §5): el nivel de cada jugador en cada uno de los 16 puestos, el reparto de una plantilla por puestos y la regla de plaza por puesto,
 * la misma para el personaje y para los niños del mundo.
 */

const REND = new Map([['futbol', Object.assign((p: Parameters<typeof rendimientoDeFutbol>[0]) => rendimientoDeFutbol(p), { puestos: rendimientoPorPuestos })]]);
const P = PUESTOS_DE_FUTBOL;

describe('los 16 puestos del fútbol y el reparto de la plantilla', () => {
  it('son los 16 del JSON del fútbol, con sus pesos normalizados y su parecido con los demás', () => {
    expect(P.puestos.map((p) => p.id)).toEqual(['GK', 'CB', 'LB', 'RB', 'CDM', 'LCR', 'RCR', 'CM', 'LM', 'RM', 'CAM', 'LW', 'RW', 'ST', 'LST', 'RST']);
    for (const p of P.puestos) expect(Object.values(p.pesos).reduce((a, b) => a + b, 0), p.id).toBeCloseTo(1, 6);
    expect(parecidoDePuestos(P, 'LB', 'LB')).toBe(1);
    expect(parecidoDePuestos(P, 'LB', 'RB')).toBe(0.2); // el mayor de los dos sentidos del addon
    expect(parecidoDePuestos(P, 'GK', 'ST')).toBe(0);
    expect(parecidoDePuestos(P, 'CB', 'LB')).toBe(0.4);
  });

  it('una plantilla de 18 reparte 2 porteros, 3 centrales, 3 laterales, 4 mediocentros, 3 de banda o extremos y 3 delanteros; una de 14 y otra de 36, en proporción', () => {
    expect(cuposPorGrupo(P, 18)).toEqual({ portero: 2, central: 3, lateral: 3, medio: 4, banda: 3, delantero: 3 });
    const c14 = cuposPorGrupo(P, 14);
    expect(Object.values(c14).reduce((a, b) => a + b, 0)).toBe(14);
    expect(c14.portero).toBeGreaterThanOrEqual(1);
    expect(cuposPorGrupo(P, 36)).toEqual({ portero: 4, central: 6, lateral: 6, medio: 8, banda: 6, delantero: 6 });
    expect(grupoDePuesto(P, 'RW')).toBe('banda');
    expect(grupoDePuesto(P, 'CAM')).toBe('delantero');
  });
});

describe('la regla de plaza por puesto', () => {
  const cupos = cuposPorGrupo(P, 18);
  const jugador = (id: string, puesto: string, valor: number): JugadorConPuesto => ({ id, nombre: id, puesto, valor });
  /** Un equipo completo: cada grupo con tantos jugadores como su cupo, todos de valor `valor`. */
  const completo = (valor: number): JugadorConPuesto[] => P.reparto.flatMap((r) => Array.from({ length: cupos[r.grupo] }, (_, i) => jugador(`${r.grupo}${i}`, r.puestos[0], valor)));
  const valores = (v: number, extra: Record<string, number> = {}): Record<string, number> => ({ ...Object.fromEntries(P.puestos.map((p) => [p.id, v])), ...extra });

  it('con hueco en un puesto, entra en él; con el equipo completo, solo si vale más que el peor de ese puesto', () => {
    const equipo = completo(40);
    expect(ofertaDePuesto(equipo, cupos, P, valores(10))).toBeUndefined(); // completo en todos los puestos y vale menos
    const sinPortero = equipo.filter((j) => j.id !== 'portero1');
    expect(ofertaDePuesto(sinPortero, cupos, P, valores(10, { GK: 12 }))).toMatchObject({ puesto: 'GK', estado: 'libre' });
    // Vale 50 de extremo: supera al peor de la banda (40) y entra por mérito.
    expect(ofertaDePuesto(equipo, cupos, P, valores(10, { LW: 50 }))).toMatchObject({ puesto: 'LW', estado: 'por_merito', peor: { id: 'banda2' } });
    // Vale 40 (igual que el peor): no entra.
    expect(ofertaDePuesto(equipo, cupos, P, valores(10, { LW: 40 }))).toBeUndefined();
  });

  it('el club mira al candidato en todos los puestos: le ofrece aquel en que entraría, y primero el favorito', () => {
    const equipo = completo(40).filter((j) => j.id !== 'portero1' && j.id !== 'delantero0');
    const v = valores(10, { GK: 20, ST: 30, LW: 45 });
    const ofertas = ofertasDePuesto(equipo, cupos, P, v);
    expect(ofertas.map((o) => o.puesto).sort()).toEqual(['GK', 'LW', 'ST'].sort()); // hueco de portero y de delantero, y por mérito en la banda
    expect(ofertaDePuesto(equipo, cupos, P, v, 'ST')).toMatchObject({ puesto: 'ST' }); // su favorito, si entra
    expect(ofertaDePuesto(equipo, cupos, P, v)).toMatchObject({ puesto: 'LW' }); // sin favorito, aquel en que más vale
    expect(puestoDondeMasVale(v)).toBe('LW');
  });

  it('un niño acepta un puesto que no es el suyo según su carácter, lo que se parece y si sería titular; el favorito, siempre', () => {
    const base = probabilidadDeAceptarPuesto(P, {}, 'CB', 'LB', false);
    expect(probabilidadDeAceptarPuesto(P, {}, 'CB', 'CB', false)).toBe(1);
    // Más disciplinado y sacrificado, más fácil.
    expect(probabilidadDeAceptarPuesto(P, { disciplina: 50, sacrificio: 50 }, 'CB', 'LB', false)).toBeGreaterThan(base);
    expect(probabilidadDeAceptarPuesto(P, { disciplina: -50, sacrificio: -50 }, 'CB', 'LB', false)).toBeLessThan(base);
    // Cuanto más se parece el puesto, más fácil (de central a lateral, 0,4; a delantero, 0).
    expect(probabilidadDeAceptarPuesto(P, {}, 'CB', 'LB', false)).toBeGreaterThan(probabilidadDeAceptarPuesto(P, {}, 'CB', 'ST', false));
    // Si sería titular, más fácil.
    expect(probabilidadDeAceptarPuesto(P, {}, 'CB', 'LB', true)).toBeGreaterThan(base);
    for (const c of [{ disciplina: 50, sacrificio: 50 }, { disciplina: -50, sacrificio: -50 }]) {
      const p = probabilidadDeAceptarPuesto(P, c, 'GK', 'ST', false);
      expect(p).toBeGreaterThanOrEqual(0.05);
      expect(p).toBeLessThanOrEqual(0.95);
    }
  });
});

describe('los niños del mundo con puestos', () => {
  let g: ReturnType<typeof nuevaPartida>;
  beforeAll(() => {
    g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
  }, 90000);
  const estado = () => g.moduleState<NpcsState>('npcs') as NpcsState;
  const pob = (): PoblacionGuardada => estado().poblaciones!.find((p) => p.deporte === 'futbol')!;
  const jugadores = (): Npc[] => estado().npcs.filter((n) => n.deporte === 'futbol' && n.equipo && n.genetica);

  it('cada futbolista tiene un puesto y un puesto favorito (aquel en que más valía al empezar); los dos lados están en juego', () => {
    for (const n of jugadores()) {
      expect(P.puestos.some((p) => p.id === n.puesto?.futbol), n.id).toBe(true);
      expect(P.puestos.some((p) => p.id === n.puestoFavorito?.futbol), n.id).toBe(true);
    }
    const puestos = new Set(jugadores().map((n) => n.puesto!.futbol));
    for (const lado of ['LB', 'RB', 'LW', 'RW', 'LCR', 'RCR']) expect(puestos.has(lado), lado).toBe(true);
    // Muchos juegan en su favorito (los que no, lo aceptaron por el club).
    const enSuFavorito = jugadores().filter((n) => n.puesto!.futbol === n.puestoFavorito!.futbol).length;
    expect(enSuFavorito / jugadores().length).toBeGreaterThan(0.5);
  });

  it('ningún equipo queda descompensado por puestos: todos los grupos tienen jugadores y ninguno pasa de su cupo', () => {
    const val = valoracionDe(REND);
    void val;
    const p = pob();
    for (const e of p.equipos.filter((x) => x.plantillaPorCategoria)) {
      for (const c of p.categorias!.filter((x) => ['benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'].includes(x.id))) {
        const del = jugadores().filter((n) => n.equipo === e.club && (edadNpc(n, 0) ?? -1) >= c.edadMin && (edadNpc(n, 0) ?? -1) <= c.edadMax);
        const cupos = cuposPorGrupo(P, e.plantillaPorCategoria!.max * (e.equiposPorCategoria?.[c.id] ?? 1));
        const cuenta: Record<string, number> = {};
        for (const n of del) cuenta[grupoDePuesto(P, n.puesto!.futbol)!] = (cuenta[grupoDePuesto(P, n.puesto!.futbol)!] ?? 0) + 1;
        for (const r of P.reparto) {
          expect(cuenta[r.grupo] ?? 0, `${e.club} ${c.id} ${r.grupo}`).toBeGreaterThan(0);
          expect(cuenta[r.grupo] ?? 0, `${e.club} ${c.id} ${r.grupo}`).toBeLessThanOrEqual(cupos[r.grupo]);
        }
      }
    }
  });

  it('el valor de una persona en cada puesto sale de sus habilidades: el portero vale por su portería y el delantero por su definición', () => {
    const lector = (stats: Record<string, number>) => ({ stat: (id: string) => stats[id] ?? 20, norm: (id: string) => (stats[id] ?? 20) / 100 });
    const portero = rendimientoPorPuestos(lector({ 'futbol.reflejos': 80, 'futbol.blocaje': 80, 'futbol.mano_a_mano': 80, 'futbol.alcance_aereo': 80, 'futbol.dominio_area': 80 }));
    const delantero = rendimientoPorPuestos(lector({ 'futbol.definicion': 80, 'futbol.desmarque': 80, 'futbol.sangre_fria': 80, 'futbol.cabeza': 80 }));
    expect(portero.GK).toBeGreaterThan(delantero.GK);
    expect(delantero.ST).toBeGreaterThan(portero.ST);
    // El portero vale más de portero que de cualquier otra cosa, y el delantero más de delantero que de portero.
    expect(puestoDondeMasVale(portero)).toBe('GK');
    expect(['ST', 'LST', 'RST']).toContain(puestoDondeMasVale(delantero));
    // Todos los valores salen entre 0 y 100.
    for (const v of [...Object.values(portero), ...Object.values(delantero)]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it('la oferta del club a un candidato con el equipo completo es por puesto: solo entra quien vale más que el peor de ese puesto', () => {
    const val = valoracionDe(REND);
    const p = pob();
    const e = p.equipos.find((x) => x.club === 'club_grande')!;
    const del = jugadores().filter((n) => n.equipo === 'club_grande' && (edadNpc(n, 0) ?? -1) >= 8 && (edadNpc(n, 0) ?? -1) <= 9);
    const max = e.plantillaPorCategoria!.max * (e.equiposPorCategoria?.benjamin ?? 1);
    const flojo = Object.fromEntries(P.puestos.map((x) => [x.id, 1]));
    // Con el equipo en sus cupos, un candidato que vale 1 en todo no entra en ningún puesto completo.
    const oferta = ofertaAlCandidato(del, max, p, flojo, 'CB', val, 0);
    if (oferta) expect(oferta.estado).toBe('libre'); // solo si hay hueco en algún puesto
    const crack = Object.fromEntries(P.puestos.map((x) => [x.id, 99]));
    expect(ofertaAlCandidato(del, max, p, crack, 'CB', val, 0)).toBeDefined();
  });
});

describe('la pierna buena: todos son diestros o zurdos, con la misma regla y la misma proporción', () => {
  it('el personaje y los PNJ salen zurdos en torno a un 20 % (dato del deporte)', async () => {
    const { Game } = await import('@ds/core');
    const { personaje } = await import('@ds/mod-personaje');
    const { PROPORCION_DE_ZURDOS } = await import('@ds/contracts');
    expect(PROPORCION_DE_ZURDOS).toBe(0.2);
    expect(P.pierna?.proporcionDeZurdos).toBe(0.2);
    // El personaje: 400 semillas (solo el módulo del personaje: baratas).
    let zurdos = 0;
    for (let seed = 1; seed <= 400; seed++) if (Game.create([personaje], { seed }).moduleState<{ zurdo: boolean }>('gen').zurdo) zurdos++;
    expect(zurdos / 400).toBeGreaterThan(0.14);
    expect(zurdos / 400).toBeLessThan(0.26);
  });

  it('los niños del mundo llevan la pierna como rasgo estable, en torno a un 20 % de zurdos', () => {
    const g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    const jugadores = (g.moduleState<NpcsState>('npcs') as NpcsState).npcs.filter((n) => n.deporte === 'futbol' && n.equipo && n.genetica);
    expect(jugadores.every((n) => n.pierna === 'izquierda' || n.pierna === 'derecha')).toBe(true);
    const zurdos = jugadores.filter((n) => n.pierna === 'izquierda').length / jugadores.length;
    expect(zurdos).toBeGreaterThan(0.12);
    expect(zurdos).toBeLessThan(0.3);
  }, 90000);

  it('la pierna buena da de base ±0,25 en los puestos del lado de cada pierna, y a los centrales nada; es la misma regla para todos', async () => {
    const { conLaPierna, ladoDePuesto } = await import('@ds/contracts');
    const base = Object.fromEntries(P.puestos.map((x) => [x.id, 50]));
    const zurdo = conLaPierna(base, 'izquierda', 0.25);
    const diestro = conLaPierna(base, 'derecha', 0.25);
    for (const x of ['LB', 'LCR', 'LM', 'LW', 'LST']) {
      expect(zurdo[x], x).toBe(50.25);
      expect(diestro[x], x).toBe(49.75);
    }
    for (const x of ['RB', 'RCR', 'RM', 'RW', 'RST']) {
      expect(zurdo[x], x).toBe(49.75);
      expect(diestro[x], x).toBe(50.25);
    }
    for (const x of ['GK', 'CB', 'CDM', 'CM', 'CAM', 'ST']) {
      expect(zurdo[x], x).toBe(50);
      expect(ladoDePuesto(x)).toBeUndefined();
    }
    // Un diestro de extremo izquierdo juega en su lado malo; un zurdo, en el bueno.
    expect(ladoDePuesto('LW')).toBe('izquierda');
  });

  it('si dos jugadores empatan en un puesto de banda, decide la pierna: entra el que juega en el lado de su pierna buena', () => {
    const cupos = cuposPorGrupo(P, 18);
    const equipo: JugadorConPuesto[] = P.reparto.flatMap((r) => Array.from({ length: cupos[r.grupo] }, (_, i) => ({ id: `${r.grupo}${i}`, nombre: `${r.grupo}${i}`, puesto: r.puestos[0], valor: 40, pierna: 'derecha' as const })));
    // En la banda juegan LM, LM y LM: diestros en el lado izquierdo (su lado malo), con 40.
    const valores = Object.fromEntries(P.puestos.map((p) => [p.id, 10]));
    valores.LM = 40;
    // Un zurdo que vale lo mismo (40) en el interior izquierdo les quita el sitio al empatar; un diestro, no.
    expect(ofertaDePuesto(equipo, cupos, P, valores, 'LM', 'izquierda')).toMatchObject({ puesto: 'LM', estado: 'por_merito' });
    expect(ofertaDePuesto(equipo, cupos, P, valores, 'LM', 'derecha')).toBeUndefined();
    // Si el que juega ahí es zurdo (su lado bueno), el empate no cambia nada.
    const conZurdos = equipo.map((j) => (j.puesto === 'LM' ? { ...j, pierna: 'izquierda' as const } : j));
    expect(ofertaDePuesto(conZurdos, cupos, P, valores, 'LM', 'izquierda')).toBeUndefined();
  });

  it('el factor de experiencia del lado de la pierna buena está preparado en los datos (para la experiencia por puesto de la F2 y la F3)', () => {
    expect(P.pierna!.factorDeExperienciaDelLado).toBeGreaterThan(1);
  });
});
