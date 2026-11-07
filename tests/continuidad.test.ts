import { beforeAll, describe, expect, it, vi } from 'vitest';
import { CIUDAD_ACTUAL, ID_PAIS_CIUDAD_DE_PRUEBA, PAIS_CIUDAD_DE_PRUEBA, conClubesDeLaCiudad, registrarPais } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { DATOS_FUTBOL, futbol, rendimiento as rendimientoDeFutbol, rendimientoPorPuestos } from '@ds/mod-futbol';
import { capacidadDe, completarEquipos, edadNpc, recolocarPropios, sinDeporte, valoracionDe, type MercadoDeFichajes, type Npc, type NpcsState, type PoblacionGuardada } from '@ds/mod-npcs';
import { hacer } from './ayudas';

vi.setConfig({ testTimeout: 240000, hookTimeout: 240000 });
registrarPais(PAIS_CIUDAD_DE_PRUEBA);

/**
 * Los años siguientes no hay «draft» (`CIUDAD_Y_LIGAS.md` §5): cada niño sigue en su club; la bolsa (los que empiezan o se quedaron sin equipo) completa los huecos; un equipo con menos de 14 se completa con
 * la bolsa o se cierra; dos plazos antes de dejarlo para siempre; colegios de fuera con club; y el entrenador le propone al personaje otro puesto al recolocar.
 */
const REND = new Map([['futbol', Object.assign((p: Parameters<typeof rendimientoDeFutbol>[0]) => rendimientoDeFutbol(p), { puestos: rendimientoPorPuestos })]]);
const rngNulo = { next: () => 0.5, int: () => 0, range: () => 0, chance: () => false, pick: <T,>(x: readonly T[]) => x[0], normal: () => 0 };

describe('continuidad: los años siguientes cada niño sigue en su club', () => {
  it('tras un cambio de curso, la gran mayoría de los futbolistas que siguen jugando están en el mismo club (solo cambia un porcentaje pequeño)', () => {
    const g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    const antes = new Map((g.moduleState<NpcsState>('npcs') as NpcsState).npcs.filter((n) => n.deporte === 'futbol' && n.equipo).map((n) => [n.id, n.equipo]));
    advanceToWeek(g, 'gen.descansar', 52 + 2, 2, 15);
    const despues = new Map((g.moduleState<NpcsState>('npcs') as NpcsState).npcs.filter((n) => n.deporte === 'futbol' && n.equipo).map((n) => [n.id, n.equipo]));
    const siguen = [...antes].filter(([id]) => despues.has(id));
    const mismoClub = siguen.filter(([id, club]) => despues.get(id) === club).length;
    expect(siguen.length).toBeGreaterThan(200);
    expect(mismoClub / siguen.length).toBeGreaterThan(0.85);
  });
});

describe('un equipo con menos de 14 se completa con la bolsa o se cierra', () => {
  let g: ReturnType<typeof nuevaPartida>;
  beforeAll(() => {
    g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
  });
  const estado = () => g.moduleState<NpcsState>('npcs') as NpcsState;
  const pob = (): PoblacionGuardada => estado().poblaciones!.find((p) => p.deporte === 'futbol')!;
  const cat = () => pob().categorias!.find((c) => c.id === 'infantil')!;
  const delClub = (m: MercadoDeFichajes, club: string) => [...m.lista.values()].filter((n) => n.deporte === 'futbol' && n.equipo === club && (edadNpc(n, 0) ?? -1) >= cat().edadMin && (edadNpc(n, 0) ?? -1) <= cat().edadMax);
  /** El club mediano con solo 10 jugadores de infantil (el resto, a la bolsa) y un solo equipo; los de la bolsa, interesados o no según `bolsaInteresada`. */
  const escenario = (bolsaInteresada: boolean) => {
    const pob0 = pob();
    const e0 = pob0.equipos.find((e) => e.club === 'club_mediano')!;
    const p: PoblacionGuardada = { ...pob0, equipos: pob0.equipos.map((e) => (e.club === 'club_mediano' ? { ...e, equiposPorCategoria: undefined } : e)) };
    const lista = new Map(estado().npcs.map((n) => [n.id, n]));
    const suyos = [...lista.values()].filter((n) => n.deporte === 'futbol' && n.equipo === 'club_mediano' && (edadNpc(n, 0) ?? -1) >= cat().edadMin && (edadNpc(n, 0) ?? -1) <= cat().edadMax);
    for (const n of suyos.slice(10)) lista.set(n.id, sinDeporte(n, pob0, false));
    for (const [id, n] of lista) {
      if (!n.genetica || n.deporte !== undefined) continue;
      lista.set(id, { ...n, rasgos: n.rasgos && { ...n.rasgos, intereses: bolsaInteresada ? { futbol: 3 } : {} }, dejado: undefined, apartado: undefined });
    }
    expect(e0).toBeDefined();
    const m: MercadoDeFichajes = { lista, pobs: [p], dia: 0, val: valoracionDe(REND), reservas: new Map() };
    return { m, antes: delClub(m, 'club_mediano').map((n) => n.id) };
  };

  it('con bolsa, el equipo se completa hasta los 14 (y los suyos siguen siendo suyos)', () => {
    const { m, antes } = escenario(true);
    expect(antes).toHaveLength(10);
    completarEquipos(m, rngNulo, { conPrueba: false });
    const despues = delClub(m, 'club_mediano');
    expect(despues.length).toBeGreaterThanOrEqual(14);
    for (const id of antes) expect(m.lista.get(id)!.equipo).toBe('club_mediano'); // nadie de los que estaban se va
  });

  it('sin bolsa (nadie quiere entrar), no llega a 14: se cierra y sus jugadores buscan otro equipo, sin volver al que se cierra', () => {
    const { m, antes } = escenario(false);
    completarEquipos(m, rngNulo, { conPrueba: false });
    expect(delClub(m, 'club_mediano')).toHaveLength(0);
    for (const id of antes) {
      const n = m.lista.get(id)!;
      expect(n.equipo).not.toBe('club_mediano');
      // O encuentran otro club (con hueco) o quedan sin equipo (apartados ese curso, o en la bolsa si la cadena se cortó): nunca dejados para siempre de golpe.
      expect(n.dejado ?? []).not.toContain('futbol');
    }
  });

  it('el colegio, igual que un club: sin prioridad, si no llega a 14 se cierra', () => {
    const { m } = escenario(false);
    const colegio = [...m.lista.values()].filter((n) => n.deporte === 'futbol' && n.equipo === 'colegio' && (edadNpc(n, 0) ?? -1) >= cat().edadMin && (edadNpc(n, 0) ?? -1) <= cat().edadMax);
    for (const n of colegio.slice(5)) m.lista.set(n.id, sinDeporte(n, m.pobs[0], false));
    completarEquipos(m, rngNulo, { conPrueba: false });
    expect(delClub(m, 'colegio').length === 0 || delClub(m, 'colegio').length >= 14).toBe(true);
  });
});

describe('si hay 14 que pueden formar un equipo, se forma (aunque el reparto por puestos no cuadre)', () => {
  it('un colegio sin equipo con 20 alumnos interesados que quieren jugar todos de lateral monta su equipo: los que no caben en su grupo entran en su puesto favorito', () => {
    const g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    const s = g.moduleState<NpcsState>('npcs') as NpcsState;
    const pob = s.poblaciones!.find((p) => p.deporte === 'futbol')!;
    const cat = pob.categorias!.find((c) => c.id === 'infantil')!;
    const enCat = (n: Npc) => (edadNpc(n, 0) ?? -1) >= cat.edadMin && (edadNpc(n, 0) ?? -1) <= cat.edadMax;
    const lista = new Map(s.npcs.map((n) => [n.id, n]));
    // El colegio sin equipo en infantil: sus jugadores a la bolsa.
    for (const n of s.npcs.filter((x) => x.deporte === 'futbol' && x.equipo === 'colegio' && enCat(x))) lista.set(n.id, sinDeporte(n, pob, false));
    // 20 alumnos del colegio, interesados y de lateral (el grupo de lateral cabe 3 por equipo de 18): todos sin equipo.
    const alumnos = [...lista.values()].filter((n) => n.genetica && n.deporte === undefined && n.colegio === undefined && n.tipos?.some((t) => t.tipo === 'alumno') && enCat(n) && !n.dejado?.includes('futbol')).slice(0, 20);
    expect(alumnos.length).toBe(20);
    for (const n of alumnos) lista.set(n.id, { ...n, puestoFavorito: { futbol: 'LB' }, rasgos: n.rasgos && { ...n.rasgos, intereses: { futbol: 3 }, caracter: { ...n.rasgos.caracter, disciplina: -50, sacrificio: -50 } }, apartado: undefined });
    // Los demás interesados, fuera de la bolsa (no quieren jugar): solo cuentan estos 20.
    for (const [id, n] of lista) if (n.genetica && n.deporte === undefined && !alumnos.some((a) => a.id === id)) lista.set(id, { ...n, rasgos: n.rasgos && { ...n.rasgos, intereses: {} } });
    const m: MercadoDeFichajes = { lista, pobs: [pob], dia: 0, val: valoracionDe(REND), reservas: new Map() };
    completarEquipos(m, rngNulo, { conPrueba: false });
    const delColegio = [...m.lista.values()].filter((n) => n.deporte === 'futbol' && n.equipo === 'colegio' && enCat(n));
    expect(delColegio.length).toBeGreaterThanOrEqual(14); // se forma, aunque solo caben 3 laterales por equipo
    expect(delColegio.filter((n) => n.puesto?.futbol === 'LB').length).toBeGreaterThan(3); // los de más entran en su puesto favorito
  });
});

describe('colegios de fuera con club (dato de la ciudad)', () => {
  const datos = DATOS_FUTBOL.paises.espana;
  it('por defecto, la mitad de los colegios de fuera tiene club, con las mismas reglas que el del colegio del personaje (solo para sus alumnos); es un dato de la ciudad', () => {
    const colegios = (c: typeof CIUDAD_ACTUAL) => conClubesDeLaCiudad(datos, c).poblacion.equipos.filter((e) => e.colegio !== undefined && e.colegio !== 'propio');
    expect(colegios(CIUDAD_ACTUAL).map((e) => e.colegio)).toEqual(['colegio1', 'colegio2']); // 4 colegios de fuera: la mitad
    expect(colegios({ ...CIUDAD_ACTUAL, colegiosConClub: 0 })).toHaveLength(0);
    expect(colegios({ ...CIUDAD_ACTUAL, colegiosConClub: 3 }).map((e) => e.colegio)).toEqual(['colegio1', 'colegio2', 'colegio3']);
    for (const e of colegios(CIUDAD_ACTUAL)) expect(e.plantillaPorCategoria).toEqual(datos.poblacion.equipos.find((x) => x.colegio === 'propio')!.plantillaPorCategoria);
  });

  it('en la partida, esos colegios tienen su club y su entrenador, y solo juegan sus alumnos', () => {
    const g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    const s = g.moduleState<NpcsState>('npcs') as NpcsState;
    const p = s.poblaciones!.find((x) => x.deporte === 'futbol')!;
    const ids = p.equipos.filter((e) => e.colegio !== undefined && e.colegio !== 'propio').map((e) => e.club);
    expect(ids).toEqual(['colegio1', 'colegio2']);
    for (const club of ids) {
      expect(capacidadDe(p.equipos.find((e) => e.club === club)!, 'infantil')).toBeGreaterThan(0);
      for (const n of s.npcs.filter((x) => x.deporte === 'futbol' && x.equipo === club)) expect(n.colegio).toBe(club);
    }
  });
});

describe('el entrenador le propone al personaje otro puesto al recolocar', () => {
  it('si sobran en su puesto y faltan en otro, se le propone el cambio (no se le mueve); lo decide él con las acciones', () => {
    const g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    const s = g.moduleState<NpcsState>('npcs') as NpcsState;
    const pob = s.poblaciones!.find((x) => x.deporte === 'futbol')!;
    const cat = pob.categorias!.find((c) => c.id === 'infantil')!;
    const e = { ...pob.equipos.find((x) => x.club === 'club_mediano')!, equiposPorCategoria: undefined };
    const p: PoblacionGuardada = { ...pob, equipos: pob.equipos.map((x) => (x.club === 'club_mediano' ? e : x)) };
    const lista = new Map(s.npcs.map((n) => [n.id, n]));
    // Todo el equipo de delanteros (sobran en su grupo y faltan en los demás) y el personaje, el que menos vale, de delantero también.
    for (const n of s.npcs.filter((x) => x.deporte === 'futbol' && x.equipo === 'club_mediano' && (edadNpc(x, 0) ?? -1) >= cat.edadMin && (edadNpc(x, 0) ?? -1) <= cat.edadMax)) lista.set(n.id, { ...n, puesto: { futbol: 'ST' } });
    const yo: Npc = { id: 'personaje@futbol', name: 'Tú', role: 'companero', gender: 'm', tags: [], levels: { futbol: 0.1 }, potential: {}, deporte: 'futbol', equipo: 'club_mediano', puesto: { futbol: 'ST' }, nacimiento: -4400, vp: { futbol: { valor: 0.1, puestos: { ...Object.fromEntries(pob.puestos!.puestos.map((q) => [q.id, 0.1])), CB: 9 } } } };
    lista.set(yo.id, yo);
    const m: MercadoDeFichajes = { lista, pobs: [p], dia: 0, val: valoracionDe(REND), reservas: new Map() };
    recolocarPropios(m);
    expect(m.lista.get(yo.id)!.puesto!.futbol).toBe('ST'); // no se le mueve
    const propuesta = m.propuestas?.find((x) => x.deporte === 'futbol');
    expect(propuesta).toBeDefined();
    expect(propuesta!.puesto).not.toBe('ST');
    // Las acciones: aceptar cambia su puesto (y el equipo cuenta con él en el nuevo); sin propuesta no hay nada que aceptar.
    const h = nuevaPartida({ seed: 7, pais: ID_PAIS_CIUDAD_DE_PRUEBA, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    expect(h.preview('futbol.aceptar_cambio_de_puesto')!.reason).toMatch(/no te ha propuesto/);
    (h.moduleState('futbol') as { propuestaDePuesto?: string }).propuestaDePuesto = 'CB';
    expect(hacer(h, 'futbol.aceptar_cambio_de_puesto').ok).toBe(true);
    expect((h.moduleState('futbol') as { puesto?: string; propuestaDePuesto?: string }).puesto).toBe('CB');
    expect((h.moduleState('futbol') as { propuestaDePuesto?: string }).propuestaDePuesto).toBeUndefined();
    expect((h.moduleState('npcs') as NpcsState).puestoDelPersonaje?.futbol).toBe('CB');
  });
});
