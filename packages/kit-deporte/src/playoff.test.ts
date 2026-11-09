import { describe, expect, it } from 'vitest';
import { ascensosYDescensos, calendarioDobleVuelta, tablaDeClasificacion, type Divisiones, type FilaDeTabla, type FormatoDeDivisiones, type ResultadoDeLiga } from './liga';
import { clasificadosAlPlayoff, ganadorDelCruce, ordenDeAscenso, plazasDePlayoff, rondaDePlayoff, sembrar, type Clasificado } from './playoff';

const F: FormatoDeDivisiones = { tamano: 10, fijas: 2, grupo: { max: 12 }, suben: 2, bajan: 2, playoff: { jornadasObjetivo: 18 } };
const clubDe = (id: string): string => id.slice(0, -1);
const fila = (id: string, puntos: number, pj = 12, dg = 0, gf = 0): FilaDeTabla => ({ id, pj, g: 0, e: 0, p: 0, gf, gc: 0, dg, puntos });
const cl = (id: string, grupo: number, puesto: number, puntos = 20, dg = 0): Clasificado => ({ id, grupo, puesto, puntos, pj: 12, dg, gf: 0 });

describe('las ligas con un número impar de equipos', () => {
  for (const n of [7, 9, 11]) {
    it(`con ${n} equipos descansa uno cada jornada, todos lo mismo (una vez por vuelta), nunca dos jornadas seguidas, y el descanso no cuenta como partido`, () => {
      const ids = Array.from({ length: n }, (_, i) => `e${i}`);
      const cal = calendarioDobleVuelta(ids);
      expect(cal).toHaveLength(2 * n);
      const descansos = new Map<string, number[]>(ids.map((id) => [id, []]));
      cal.forEach((j, k) => {
        expect(j).toHaveLength((n - 1) / 2);
        const juegan = new Set(j.flatMap((p) => [p.local, p.visitante]));
        expect(juegan.size).toBe(n - 1);
        const descansa = ids.filter((id) => !juegan.has(id));
        expect(descansa).toHaveLength(1);
        descansos.get(descansa[0])!.push(k);
      });
      for (const [id, js] of descansos) {
        expect(js, id).toHaveLength(2); // una vez por vuelta: todos descansan lo mismo
        expect(js[1] - js[0], id).toBeGreaterThan(1); // nunca dos seguidas
        expect(js[0], id).toBeLessThan(n);
        expect(js[1], id).toBeGreaterThanOrEqual(n);
      }
      // Cada pareja se enfrenta dos veces, una en cada campo.
      const partidos = cal.flat();
      expect(partidos).toHaveLength(n * (n - 1));
      for (const a of ids) for (const b of ids) if (a !== b) expect(partidos.filter((p) => p.local === a && p.visitante === b)).toHaveLength(1);
      // En la tabla, el descanso no es un partido: todos juegan 2 × (n − 1).
      const resultados: ResultadoDeLiga[] = partidos.map((p) => ({ local: p.local, visitante: p.visitante, golesLocal: 1, golesVisitante: 0 }));
      for (const f of tablaDeClasificacion(ids, resultados)) expect(f.pj).toBe(2 * (n - 1));
    });
  }
});

describe('el playoff de la última división', () => {
  it('juegan los 2 o los 4 primeros de cada grupo según las jornadas hasta unas 18', () => {
    expect(plazasDePlayoff(18, F)).toBe(2);
    expect(plazasDePlayoff(22, F)).toBe(2);
    expect(plazasDePlayoff(16, F)).toBe(2);
    expect(plazasDePlayoff(14, F)).toBe(4); // 7 equipos
    expect(plazasDePlayoff(12, F)).toBe(4);
    expect(plazasDePlayoff(10, F)).toBe(4);
  });

  it('con 2 por grupo: semifinales cruzadas (el 1.º de un grupo contra el 2.º del otro) a ida y vuelta, y final a partido único', () => {
    const tablas = [[fila('a1', 30), fila('a2', 25), fila('a3', 10)], [fila('b1', 28), fila('b2', 26), fila('b3', 9)]];
    const c = clasificadosAlPlayoff(tablas, 2);
    expect(c.map((x) => x.id).sort()).toEqual(['a1', 'a2', 'b1', 'b2']);
    const semis = rondaDePlayoff(c);
    expect(semis.nombre).toBe('semifinal');
    expect(semis.pasan).toEqual([]);
    expect(semis.cruces.every((x) => x.idaYVuelta)).toBe(true);
    const pares = semis.cruces.map((x) => [x.a, x.b].sort().join('-')).sort();
    expect(pares).toEqual(['a1-b2', 'a2-b1']);
    const final = rondaDePlayoff([c[0], c[2]]);
    expect(final.nombre).toBe('final');
    expect(final.cruces).toHaveLength(1);
    expect(final.cruces[0].idaYVuelta).toBe(false);
  });

  it('con 4 por grupo hay además cuartos, y todos los cruces son entre grupos distintos; el mejor sembrado se enfrenta al peor del otro grupo', () => {
    const tablas = [[fila('a1', 30), fila('a2', 25), fila('a3', 20), fila('a4', 15)], [fila('b1', 29), fila('b2', 24), fila('b3', 19), fila('b4', 14)]];
    const c = clasificadosAlPlayoff(tablas, 4);
    const cuartos = rondaDePlayoff(c);
    expect(cuartos.nombre).toBe('cuartos');
    expect(cuartos.cruces).toHaveLength(4);
    for (const x of cuartos.cruces) expect(clubDe(x.a)).not.toBe(clubDe(x.b)); // a1 con b…, grupos distintos
    expect(cuartos.cruces[0]).toMatchObject({ a: 'a1', b: 'b4' });
    expect(cuartos.cruces.every((x) => x.idaYVuelta)).toBe(true);
  });

  it('con un número de equipos que no es potencia de dos, los mejor sembrados pasan sin jugar', () => {
    const tablas = [[fila('a1', 30), fila('a2', 20)], [fila('b1', 29), fila('b2', 19)], [fila('c1', 28), fila('c2', 18)]];
    const r = rondaDePlayoff(clasificadosAlPlayoff(tablas, 2));
    expect(r.nombre).toBe('cuartos');
    expect(r.pasan).toEqual(['a1', 'b1']);
    expect(r.cruces).toHaveLength(2);
  });

  it('pasa el que más goles suma y, si empatan, el mejor sembrado', () => {
    const a = cl('a1', 0, 1, 30);
    const b = cl('b2', 1, 2, 25);
    expect(ganadorDelCruce(a, b, [[0, 2], [3, 0]]).id).toBe('a1'); // 3-2 en el global
    expect(ganadorDelCruce(a, b, [[0, 2], [1, 0]]).id).toBe('b2');
    expect(ganadorDelCruce(a, b, [[1, 1], [2, 2]]).id).toBe('a1'); // empate: el mejor sembrado
    expect(sembrar([b, a]).map((x) => x.id)).toEqual(['a1', 'b2']);
  });
});

describe('la cadena de ascensos desde el playoff', () => {
  /** Primera y Segunda de 10 equipos de clubes distintos y la última en dos grupos de 7 (la de abajo, con sus equipos de otros clubes). */
  const mundo = (): { d: Divisiones; tablas: FilaDeTabla[][][] } => {
    const primera = Array.from({ length: 10 }, (_, i) => `p${i}A`);
    const segunda = Array.from({ length: 10 }, (_, i) => `s${i}A`);
    const g0 = ['f0A', 'q0A', 'r0A', 'r1A', 'r2A', 'r3A', 'r4A'];
    const g1 = ['f1A', 'q1A', 'r5A', 'r6A', 'r7A', 'r8A', 'r9A'];
    const d: Divisiones = [{ grupos: [primera] }, { grupos: [segunda] }, { grupos: [g0, g1] }];
    return { d, tablas: d.map((x) => x.grupos.map((g) => g.map((id, i) => fila(id, 100 - i)))) };
  };
  const resultado = { campeon: 'f0A', subcampeon: 'f1A', eliminados: [{ ronda: 'cuartos' as const, ids: ['r0A', 'r5A'] }, { ronda: 'semifinal' as const, ids: ['q0A', 'q1A'] }] };
  const clasif: Clasificado[] = [cl('f0A', 0, 1, 40, 10), cl('f1A', 1, 1, 38, 8), cl('q0A', 0, 2, 30, 5), cl('q1A', 1, 2, 30, 7), cl('r0A', 0, 3, 20, 1), cl('r5A', 1, 3, 20, 1)];

  it('el orden de ascenso: los finalistas, después los semifinalistas por puntos, diferencia de goles y sorteo, y después los cuartofinalistas', () => {
    const o = ordenDeAscenso(resultado, clasif, 7);
    expect(o.slice(0, 2)).toEqual(['f0A', 'f1A']);
    expect(o.slice(2, 4)).toEqual(['q1A', 'q0A']); // los mismos puntos: más diferencia de goles
    expect(o.slice(4).sort()).toEqual(['r0A', 'r5A']);
    // Con los mismos puntos y la misma diferencia, decide un sorteo estable (el mismo con la misma semilla).
    const iguales = clasif.map((c) => (c.id === 'q0A' || c.id === 'q1A' ? { ...c, dg: 5 } : c));
    expect(ordenDeAscenso(resultado, iguales, 7).slice(2, 4)).toEqual(ordenDeAscenso(resultado, iguales, 7).slice(2, 4));
    const ordenes = new Set(Array.from({ length: 30 }, (_, s) => ordenDeAscenso(resultado, iguales, s).slice(2, 4).join()));
    expect(ordenes.size).toBe(2); // según la semilla, sube uno u otro: es un sorteo
  });

  it('suben los 2 finalistas', () => {
    const { d, tablas } = mundo();
    const o = ordenDeAscenso(resultado, clasif, 1);
    const n = ascensosYDescensos(d, tablas, clubDe, F, o);
    expect(n[1].grupos[0]).toEqual(expect.arrayContaining(['f0A', 'f1A']));
    expect(n.map((x) => x.grupos.flat().length)).toEqual([10, 10, 14]);
  });

  it('si un finalista no puede subir (tiene otro equipo de su club en Segunda), el ascenso pasa a los semifinalistas', () => {
    const { d, tablas } = mundo();
    // El finalista f0 es el B de un club cuyo A se queda en Segunda (no entra entre los dos últimos): no puede subir.
    d[1].grupos[0][3] = 'f0B';
    const t = d.map((x) => x.grupos.map((g) => g.map((id, i) => fila(id, 100 - i))));
    const res = { ...resultado, campeon: 'f0A', subcampeon: 'f1A' };
    const o = ordenDeAscenso(res, clasif, 1);
    // El finalista f0A comparte club (f0) con el f0B que se queda en la división de arriba.
    const n = ascensosYDescensos(d, t, clubDe, F, o);
    expect(n[1].grupos[0]).not.toContain('f0A');
    expect(n[1].grupos[0]).toContain('f1A');
    expect(n[1].grupos[0]).toContain('q1A'); // el primer semifinalista (más diferencia de goles)
    expect(n[2].grupos.flat()).toContain('f0A');
    expect(n.map((x) => x.grupos.flat().length)).toEqual([10, 10, 14]);
  });

  it('si no pueden subir ni los finalistas ni los semifinalistas, suben los cuartofinalistas', () => {
    const { d, tablas } = mundo();
    d[1].grupos[0][3] = 'f0B';
    d[1].grupos[0][4] = 'f1B';
    d[1].grupos[0][5] = 'q0B';
    d[1].grupos[0][6] = 'q1B';
    const t = d.map((x) => x.grupos.map((g) => g.map((id, i) => fila(id, 100 - i))));
    const o = ordenDeAscenso(resultado, clasif, 1);
    const n = ascensosYDescensos(d, t, clubDe, F, o);
    const suben = n[1].grupos[0].filter((id) => d[2].grupos.some((g) => g.includes(id)));
    expect(suben.sort()).toEqual(['r0A', 'r5A']);
    expect(n.map((x) => x.grupos.flat().length)).toEqual([10, 10, 14]);
  });

  it('el C que subiría cede el ascenso al B de su club que baja de Segunda: no se cambian, y hay un ascenso y un descenso menos', () => {
    const { d } = mundo();
    // El B del club k es de los dos últimos de Segunda (bajaría) y el C del club k es finalista de la última: no se cambian.
    d[1].grupos[0][8] = 'kB';
    d[2].grupos[0][0] = 'kC';
    const t = d.map((x) => x.grupos.map((g) => g.map((id, i) => fila(id, 100 - i))));
    const res = { campeon: 'kC', subcampeon: 'f1A', eliminados: [{ ronda: 'cuartos' as const, ids: ['r0A', 'r5A'] }, { ronda: 'semifinal' as const, ids: ['q0A', 'q1A'] }] };
    const o = ordenDeAscenso(res, [cl('kC', 0, 1, 40), cl('f1A', 1, 1, 38), cl('q0A', 0, 2, 30), cl('q1A', 1, 2, 30), cl('r0A', 0, 3, 20), cl('r5A', 1, 3, 20)], 1);
    const n = ascensosYDescensos(d, t, clubDe, F, o);
    expect(n[1].grupos[0]).toContain('kB'); // el B mantiene su plaza
    expect(n[1].grupos[0]).not.toContain('kC');
    expect(n[2].grupos.flat()).toContain('kC'); // el C se queda en la última
    // Solo se cambia el otro: f1A sube y el otro de los dos últimos de Segunda baja.
    expect(n[1].grupos[0]).toContain('f1A');
    expect(n[2].grupos.flat()).toContain('s9A');
    expect(n[1].grupos[0]).toHaveLength(10);
    expect(n.map((x) => x.grupos.flat().length)).toEqual([10, 10, 14]);
    // Un solo ascenso y un solo descenso entre Segunda y la última.
    const sube = n[1].grupos[0].filter((id) => d[2].grupos.some((g) => g.includes(id)));
    const baja = n[2].grupos.flat().filter((id) => d[1].grupos[0].includes(id));
    expect(sube).toHaveLength(1);
    expect(baja).toHaveLength(1);
  });
});
