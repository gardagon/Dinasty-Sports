import { describe, expect, it } from 'vitest';
import type { CalendarioDeJornada } from '@ds/contracts';
import { camposNecesarios, repartirLosPartidos, type PartidoPorColocar } from './calendario-de-partidos';

const CAL: CalendarioDeJornada = {
  franjas: [9, 11, 13, 16, 18],
  dias: [{ dia: 5, categorias: ['benjamin', 'alevin', 'infantil'] }, { dia: 6, categorias: ['juvenil'] }],
  siCabe: [{ categoria: 'cadete', dia: 5, siNoCabe: 6 }],
};
const partidos = (categoria: string, n: number, o: { campoPropio?: boolean; club?: (i: number) => string } = {}): PartidoPorColocar[] =>
  Array.from({ length: n }, (_, i) => ({ id: `${categoria}${i}`, categoria, club: o.club?.(i) ?? `c${i}`, campoPropio: o.campoPropio ?? false }));

describe('el reparto de los partidos de una jornada', () => {
  it('cada categoría juega en su día; los pequeños, en las primeras franjas; el complejo se llena franja a franja', () => {
    const r = repartirLosPartidos([...partidos('juvenil', 4), ...partidos('infantil', 4), ...partidos('benjamin', 4)], CAL, 4);
    expect(r.sinSitio).toEqual([]);
    // Benjamín en la primera franja (9:00) en los 4 campos, infantil en la segunda; juvenil, el domingo.
    expect([...Array(4).keys()].map((i) => r.partidos.get(`benjamin${i}`)!)).toEqual([1, 2, 3, 4].map((n) => ({ dia: 5, hora: 9, campo: `complejo:${n}` })));
    expect(r.partidos.get('infantil0')).toEqual({ dia: 5, hora: 11, campo: 'complejo:1' });
    expect(r.partidos.get('juvenil2')).toEqual({ dia: 6, hora: 9, campo: 'complejo:3' });
  });

  it('en un mismo campo los partidos empiezan cada franja y un club con campo propio juega sus partidos en casa uno tras otro', () => {
    const r = repartirLosPartidos([...partidos('benjamin', 3, { campoPropio: true, club: () => 'grande' }), ...partidos('alevin', 2, { campoPropio: true, club: () => 'grande' })], CAL, 1);
    const horas = ['benjamin0', 'benjamin1', 'benjamin2', 'alevin0', 'alevin1'].map((id) => r.partidos.get(id)!);
    expect(horas.map((h) => h.hora)).toEqual([9, 11, 13, 16, 18]);
    expect(new Set(horas.map((h) => h.campo))).toEqual(new Set(['propio:grande']));
    // Un sexto partido en casa no cabe en su campo: se juega en el complejo municipal (y si el complejo no tiene campos, no cabe).
    const seis = partidos('benjamin', 6, { campoPropio: true, club: () => 'grande' });
    expect(repartirLosPartidos(seis, CAL, 1).partidos.get('benjamin5')).toEqual({ dia: 5, hora: 9, campo: 'complejo:1' });
    expect(repartirLosPartidos(seis, CAL, 0).sinSitio).toEqual(['benjamin5']);
  });

  it('cadete juega el sábado si cabe y, si no, pasa al domingo', () => {
    // 5 franjas × 2 campos = 10 partidos el sábado: con 6 de benjamín y 4 de cadete caben; con 7 de benjamín, cadete pasa al domingo.
    const cabe = repartirLosPartidos([...partidos('benjamin', 6), ...partidos('cadete', 4)], CAL, 2);
    expect(cabe.diaDeCategoria.cadete).toBe(5);
    expect(cabe.sinSitio).toEqual([]);
    expect(cabe.partidos.get('cadete0')!.hora).toBeGreaterThanOrEqual(11);
    const noCabe = repartirLosPartidos([...partidos('benjamin', 7), ...partidos('cadete', 4)], CAL, 2);
    expect(noCabe.diaDeCategoria.cadete).toBe(6);
    expect(noCabe.sinSitio).toEqual([]);
    expect(noCabe.partidos.get('cadete0')!.dia).toBe(6);
  });

  it('los partidos que no caben salen aparte, y los campos que hacen falta son el mínimo con que todo cabe', () => {
    const todos = [...partidos('benjamin', 12), ...partidos('alevin', 12), ...partidos('infantil', 12)];
    expect(repartirLosPartidos(todos, CAL, 1).sinSitio.length).toBeGreaterThan(0);
    const n = camposNecesarios(todos, CAL);
    expect(n).toBe(Math.ceil(36 / 5));
    expect(repartirLosPartidos(todos, CAL, n).sinSitio).toEqual([]);
    expect(repartirLosPartidos(todos, CAL, n - 1).sinSitio.length).toBeGreaterThan(0);
  });

  it('es determinista y no depende del orden en que vienen los partidos', () => {
    const todos = [...partidos('infantil', 5), ...partidos('benjamin', 5), ...partidos('juvenil', 3)];
    const a = repartirLosPartidos(todos, CAL, 3);
    const b = repartirLosPartidos([...todos].reverse(), CAL, 3);
    expect([...a.partidos]).toEqual([...b.partidos].sort(([x], [y]) => [...a.partidos.keys()].indexOf(x) - [...a.partidos.keys()].indexOf(y)));
  });
});
