import { beforeAll, describe, expect, it, vi } from 'vitest';
import { cuposPorGrupo, grupoDePuesto } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { PUESTOS_DE_FUTBOL, futbol, rendimientoPorPuestos, rendimiento as rendimientoDeFutbol } from '@ds/mod-futbol';
import { colegioDeNinoPublico as colegioDeNino, edadDeJuego, edadNpc, equiposDelClub, favoritoDe, ofertaAlCandidato, piernaDe, valoracionDe, valoresPorPuestoDe, type NpcsState, type PoblacionGuardada } from '@ds/mod-npcs';
import { repartirEnEquipos, suplentesDe, type MiembroDeClub } from '../modules/npcs/src/equipos';

// Estos tests crean partidas con fútbol (la ciudad de verdad cuesta varios segundos cada una): un plazo para todo el fichero, no test a test.
vi.setConfig({ testTimeout: 240000, hookTimeout: 240000 });

/**
 * Equipos A, B, C y D de un club por categoría (`CIUDAD_Y_LIGAS.md` §5): los grandes, por año; los demás, por nivel; cada equipo con su reparto por puestos; los suplentes y los equipos nuevos.
 */

const P = PUESTOS_DE_FUTBOL;
const REND = new Map([['futbol', Object.assign((p: Parameters<typeof rendimientoDeFutbol>[0]) => rendimientoDeFutbol(p), { puestos: rendimientoPorPuestos })]]);

/** Una plantilla de `n` jugadores repartida como manda el reparto, de valor decreciente, con los años alternados. */
function plantilla(n: number, valorBase = 50): MiembroDeClub[] {
  const cupos = cuposPorGrupo(P, 18);
  const puestos = P.reparto.flatMap((r) => Array.from({ length: Math.ceil((cupos[r.grupo] * n) / 18) }, () => r.puestos[0]));
  return puestos.slice(0, n).map((puesto, i) => ({ id: `j${String(i).padStart(2, '0')}`, puesto, valor: valorBase - i * 0.1, anio: (i % 2 === 0 ? 1 : 2) as 1 | 2 }));
}

describe('el reparto de un club en equipos A a D', () => {
  it('los medianos, pequeños y el del colegio reparten por nivel con los años mezclados: el A con los mejores y el B con los siguientes, cada uno con su reparto por puestos', () => {
    const miembros = plantilla(36);
    const r = repartirEnEquipos(miembros, P, 2, 18, false);
    expect(r.A.length).toBeGreaterThan(0);
    expect(r.B.length).toBeGreaterThan(0);
    const valor = (id: string) => miembros.find((m) => m.id === id)!.valor;
    // En cada puesto, el A tiene a los mejores: nadie del B vale más que alguien del A de su mismo grupo.
    for (const g of P.reparto) {
      const delGrupo = (ids: string[]) => ids.filter((id) => g.puestos.includes(miembros.find((m) => m.id === id)!.puesto)).map(valor);
      const a = delGrupo(r.A);
      const b = delGrupo(r.B);
      if (a.length && b.length) expect(Math.min(...a)).toBeGreaterThanOrEqual(Math.max(...b));
    }
    // Años mezclados en el A.
    const anios = new Set(r.A.map((id) => miembros.find((m) => m.id === id)!.anio));
    expect(anios.size).toBe(2);
    // Ningún equipo pasa de sus cupos por puesto.
    const cupos = cuposPorGrupo(P, 18);
    for (const equipo of [r.A, r.B]) for (const g of P.reparto) expect(equipo.filter((id) => g.puestos.includes(miembros.find((m) => m.id === id)!.puesto)).length).toBeLessThanOrEqual(cupos[g.grupo]);
  });

  it('los grandes reparten por año: A, los de segundo año más los de primer año que destacan; B, los de primer año; C, los de segundo año que no entran en el A; D, los de primer año que no entran en el B', () => {
    const miembros = plantilla(72);
    const r = repartirEnEquipos(miembros, P, 4, 18, true, 3);
    const anio = (id: string) => miembros.find((m) => m.id === id)!.anio;
    // El B y el D son de primer año; el C, de segundo.
    expect(r.B.every((id) => anio(id) === 1)).toBe(true);
    expect(r.D.every((id) => anio(id) === 1)).toBe(true);
    expect(r.C.every((id) => anio(id) === 2)).toBe(true);
    // El A lo forman sobre todo los de segundo año.
    expect(r.A.filter((id) => anio(id) === 2).length).toBeGreaterThanOrEqual(r.A.filter((id) => anio(id) === 1).length);
  });

  it('con el listón, un jugador de primer año solo es titular en el A de un grande si vale más que el de segundo año por ese margen', () => {
    const miembros: MiembroDeClub[] = [
      { id: 'viejo', puesto: 'GK', valor: 50, anio: 2 },
      { id: 'joven', puesto: 'GK', valor: 52, anio: 1 },
    ];
    // Un solo hueco de portero en el A: hace falta que el de primer año supere al de segundo por más del listón.
    const cupos = { ...cuposPorGrupo(P, 18) };
    void cupos;
    const sinListon = repartirEnEquipos(miembros, { ...P, reparto: P.reparto.map((r) => (r.grupo === 'portero' ? { ...r, jugadores: 1 } : { ...r, jugadores: 0 })) }, 2, 1, true, 0, 0);
    expect(sinListon.A).toEqual(['joven']);
    const conListon = repartirEnEquipos(miembros, { ...P, reparto: P.reparto.map((r) => (r.grupo === 'portero' ? { ...r, jugadores: 1 } : { ...r, jugadores: 0 })) }, 2, 1, true, 4, 0);
    expect(conListon.A).toEqual(['viejo']);
    expect(conListon.B).toEqual(['joven']);
  });

  it('un jugador no sube al equipo de arriba si deja a su equipo con menos de 14 o si el de arriba está completo; todos los clubes reparten por año', () => {
    // 16 de primer año y 6 de segundo: solo pueden subir al A los que dejan al B con 14 (los 2 mejores de primer año).
    const miembros: MiembroDeClub[] = [
      ...Array.from({ length: 16 }, (_, i) => ({ id: `p${String(i).padStart(2, '0')}`, puesto: ['GK', 'CB', 'LB', 'CM', 'LM', 'ST'][i % 6], valor: 90 - i, anio: 1 as const })),
      ...Array.from({ length: 6 }, (_, i) => ({ id: `s${i}`, puesto: ['GK', 'CB', 'LB', 'CM', 'LM', 'ST'][i % 6], valor: 20 - i, anio: 2 as const })),
    ];
    const r = repartirEnEquipos(miembros, P, 2, 18, true, 0);
    expect(r.A.filter((id) => id.startsWith('p')).length).toBeLessThanOrEqual(2); // 16 - 14
    expect(r.B.length).toBeGreaterThanOrEqual(14);
    expect(r.B.every((id) => id.startsWith('p'))).toBe(true);
    // Con tres equipos, el C es una mezcla de los dos años; con cuatro, el C son los de segundo año (completados con los de primer año si no llegan al mínimo) y el D los de primer año.
    const muchos: MiembroDeClub[] = [...Array.from({ length: 40 }, (_, i) => ({ id: `p${i}`, puesto: P.puestos[i % P.puestos.length].id, valor: 50 - i * 0.1, anio: 1 as const })), ...Array.from({ length: 40 }, (_, i) => ({ id: `s${i}`, puesto: P.puestos[i % P.puestos.length].id, valor: 49 - i * 0.1, anio: 2 as const }))];
    const tres = repartirEnEquipos(muchos, P, 3, 18, true, 0);
    expect(tres.C.length).toBeGreaterThan(0); // mezcla: entran de los dos años por lo que valen
    const cuatro = repartirEnEquipos(muchos, P, 4, 18, true, 0);
    expect(cuatro.C.every((id) => id.startsWith('s')) && cuatro.D.every((id) => id.startsWith('p'))).toBe(true);
  });

  it('los suplentes de un equipo son los que no están entre sus titulares (1 portero, 2 centrales, 2 laterales, 3 mediocentros, 2 de banda y 1 delantero)', () => {
    const miembros = plantilla(18);
    const suplentes = suplentesDe(miembros, P, P.equipos!.titulares);
    expect(suplentes).toHaveLength(18 - 11);
    const titulares = miembros.filter((m) => !suplentes.includes(m.id));
    expect(titulares).toHaveLength(11);
    const delGrupo = (g: string) => titulares.filter((m) => P.reparto.find((r) => r.grupo === g)!.puestos.includes(m.puesto)).length;
    expect([delGrupo('portero'), delGrupo('central'), delGrupo('lateral'), delGrupo('medio'), delGrupo('banda'), delGrupo('delantero')]).toEqual([1, 2, 2, 3, 2, 1]);
  });
});

describe('los equipos de los clubes en la partida', () => {
  let g: ReturnType<typeof nuevaPartida>;
  beforeAll(() => {
    g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
  });
  const estado = () => g.moduleState<NpcsState>('npcs') as NpcsState;
  const pob = (): PoblacionGuardada => estado().poblaciones!.find((p) => p.deporte === 'futbol')!;
  const categorias = () =>
    pob()
      .categorias!.filter((x) => ['benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'].includes(x.id))
      .map((c) => ({ id: c.id, edadMin: c.edadMin, edades: Array.from({ length: c.edadMax - c.edadMin + 1 }, (_, i) => c.edadMin + i).filter((x) => x <= 19) }));

  /** Ningún equipo de ningún club ni colegio con menos de 14: cada categoría, o no tiene equipo, o tiene al menos 14 jugadores por equipo (el colegio también: si no llega, ese curso no saca equipo). */
  const sinEquiposDeMenosDe14 = (): string[] => {
    const dia = (g.time.week - g.time.schoolWeek) * 7;
    const mal: string[] = [];
    for (const e of pob().equipos.filter((x) => x.plantillaPorCategoria)) {
      for (const c of categorias()) {
        const n = estado().npcs.filter((x) => x.deporte === 'futbol' && x.equipo === e.club && c.edades.includes(edadDeJuego(x, dia) ?? -1)).length;
        const k = e.equiposPorCategoria?.[c.id] ?? 1;
        if (n > 0 && n < 14 * k) mal.push(`${e.club} ${c.id}: ${n} jugadores con ${k} equipos`);
      }
    }
    return mal;
  };

  it('ningún equipo de ningún club ni colegio tiene menos de 14 jugadores tras crear la partida, y el colegio saca equipo en la mayoría de las categorías', () => {
    expect(sinEquiposDeMenosDe14()).toEqual([]);
    const colegio = pob().equipos.find((e) => e.club === 'colegio')!;
    const conEquipo = categorias().filter((c) => estado().npcs.filter((x) => x.deporte === 'futbol' && x.equipo === 'colegio' && c.edades.includes(edadNpc(x, 0) ?? -1)).length >= 14).length;
    expect(colegio).toBeDefined();
    expect(conEquipo).toBeGreaterThanOrEqual(3); // con la población de ahora, un equipo de colegio de verdad en la mayoría de las categorías
  });

  it('los clubes grandes tienen siempre dos equipos por categoría (A y B, por año) y cada club respeta su plantilla por puestos', () => {
    const lista = new Map(estado().npcs.map((n) => [n.id, n]));
    const grande = pob().equipos.find((e) => e.club === 'club_grande')!;
    const val = valoracionDe(REND);
    for (const c of categorias()) {
      expect(grande.equiposPorCategoria?.[c.id], c.id).toBeGreaterThanOrEqual(2);
      const r = equiposDelClub(lista, pob(), grande, c, 0, val);
      expect(r.equipos.A.length, c.id).toBeGreaterThan(10);
      expect(r.equipos.B.length, c.id).toBeGreaterThan(5);
      // El B de un grande es de primer año.
      expect(r.equipos.B.every((id) => (edadNpc(lista.get(id)!, 0) ?? 0) === c.edadMin), c.id).toBe(true);
    }
  });

  it('los primeros años en el A de un grande son pocos: con el listón y las posiciones obligadas, de media por debajo de 5 por categoría', () => {
    const lista = new Map(estado().npcs.map((n) => [n.id, n]));
    const grande = pob().equipos.find((e) => e.club === 'club_grande')!;
    const val = valoracionDe(REND);
    const primeros = categorias().map((c) => equiposDelClub(lista, pob(), grande, c, 0, val).equipos.A.filter((id) => (edadNpc(lista.get(id)!, 0) ?? 0) === c.edadMin).length);
    expect(primeros.reduce((a, b) => a + b, 0) / primeros.length).toBeLessThan(5);
  });

  it('ningún club tiene en una categoría más jugadores que equipos × el máximo de un equipo, y los que más tienen reparten en equipos hasta la D', () => {
    const lista = new Map(estado().npcs.map((n) => [n.id, n]));
    const val = valoracionDe(REND);
    for (const e of pob().equipos.filter((x) => x.plantillaPorCategoria)) {
      for (const c of categorias()) {
        const r = equiposDelClub(lista, pob(), e, c, 0, val);
        expect(r.miembros.length, `${e.club} ${c.id}`).toBeLessThanOrEqual((e.equiposPorCategoria?.[c.id] ?? 1) * e.plantillaPorCategoria!.max);
      }
    }
  });

  /**
   * Los interesados sin equipo que tendrían sitio libre en su puesto favorito en un club que los coja (equipo de su categoría, con hueco en el grupo de su puesto favorito y, si es un equipo de
   * colegio, de su colegio): tiene que haber ninguno, o ese niño se estaría quedando fuera con hueco.
   */
  const conHuecoEnSuPuesto = (): string[] => {
    const lista = new Map(estado().npcs.map((n) => [n.id, n]));
    const val = valoracionDe(REND);
    const interesa = (n: { rasgos?: { intereses: Record<string, number> } }) => Math.max(n.rasgos?.intereses.futbol ?? 0, n.rasgos?.intereses.deporte ?? 0) > 0;
    const dia = (g.time.week - g.time.schoolWeek) * 7;
    const sin = estado().npcs.filter((n) => n.genetica && n.deporte === undefined && interesa(n) && !n.dejado?.includes('futbol') && !n.apartado?.includes('futbol') && n.cap);
    const casos: string[] = [];
    for (const n of sin) {
      const edad = edadNpc(n, dia);
      const c = categorias().find((x) => edad !== undefined && x.edades.includes(edad));
      if (!c) continue;
      const valores = valoresPorPuestoDe(n, pob(), val, dia);
      if (!valores) continue;
      const favorito = favoritoDe(n, pob(), val, dia);
      for (const e of pob().equipos.filter((x) => x.plantillaPorCategoria && (x.categorias ?? [c.id]).includes(c.id) && (x.colegio === undefined || colegioDeNino(n) === x.colegio))) {
        const jugadores = equiposDelClub(lista, pob(), e, c, dia, val).miembros.map((x) => x.n);
        // Con una mala prueba (×0,75 de lo que vale) todavía pasaría: el azar del día no cuenta como hueco guardado.
        const oferta = ofertaAlCandidato(jugadores, (e.equiposPorCategoria?.[c.id] ?? 1) * e.plantillaPorCategoria!.max, pob(), e.colegio === undefined ? Object.fromEntries(Object.entries(valores).map(([p, v]) => [p, v * 0.75])) : valores, favorito, val, dia, piernaDe(n, pob()), e.colegio === undefined ? {} : undefined); // los clubes de fuera hacen prueba: con hueco, hay que superar al suplente que mejor juega en el puesto
        if (oferta?.estado === 'libre' && favorito && grupoDePuesto(P, oferta.puesto) === grupoDePuesto(P, favorito)) casos.push(`${n.id}@${e.club}:${oferta.puesto}`);
      }
    }
    return casos;
  };

  it('sin huecos guardados: tras crear la partida, ningún interesado se queda sin equipo mientras haya hueco en su puesto favorito en un club que lo coja', () => {
    expect(conHuecoEnSuPuesto()).toEqual([]);
  });

  it('y tras el primer verano (fichajes, equipos nuevos y relleno de plantillas) tampoco', () => {
    advanceToWeek(g, 'gen.descansar', 52 + 2, 2, 15);
    expect(conHuecoEnSuPuesto()).toEqual([]);
  });

  it('ni tras cada verano: sigue sin haber equipos de menos de 14 (el primero y el segundo)', () => {
    expect(sinEquiposDeMenosDe14()).toEqual([]); // tras el primero (el test anterior ya lo avanzó)
    advanceToWeek(g, 'gen.descansar', 2 * 52 + 2, 2, 15);
    expect(sinEquiposDeMenosDe14()).toEqual([]);
  });
});
