import { describe, expect, it } from 'vitest';
import { FACTOR_DE_CAMPEONATO, anotarEnTabla, clasificarPrueba, finalistasDe, ordenDeTabla, plazasConReservas, probabilidadDeAcudir, repartirEnSeries, type FilaGuardada, PUNTOS_POR_PUESTO, clasificacionPorPuntos, mejoresMarcas, puntosDe, recortarPruebas, type PruebaGuardada } from './temporada';

const prueba = (curso: number, semana: number, marcas: Record<string, number>, tipo: PruebaGuardada['tipo'] = 'regular'): PruebaGuardada => {
  const filas: FilaGuardada[] = Object.entries(marcas).map(([nombre, marca]) => ({ nombre: nombre === 'Tú' ? 'Tú' : nombre, club: nombre === 'Tú' ? 'Mi club' : 'Otro', marca, ...(nombre === 'Tú' ? { yo: true } : { npcId: nombre }) }));
  const orden = [...filas].sort((a, b) => a.marca - b.marca);
  const yo = orden.findIndex((f) => f.yo) + 1;
  return { curso, semana, tipo, categoria: 'sub10', superior: false, posicion: yo, total: filas.length, marca: marcas['Tú'], record: false, filas };
};

describe('temporada de atletismo (reglas puras)', () => {
  it('puntos por puesto: del 10 al 1 en los ocho primeros y nada después; los campeonatos puntúan el doble', () => {
    expect(PUNTOS_POR_PUESTO).toEqual([10, 8, 6, 5, 4, 3, 2, 1]);
    expect(puntosDe(1, 'regular')).toBe(10);
    expect(puntosDe(8, 'regular')).toBe(1);
    expect(puntosDe(9, 'regular')).toBe(0);
    expect(puntosDe(1, 'clasificatoria')).toBe(10 * FACTOR_DE_CAMPEONATO);
    expect(puntosDe(2, 'final')).toBe(8 * FACTOR_DE_CAMPEONATO);
  });

  it('la clasificación suma los puntos de cada prueba y ordena por puntos y, a igualdad, por mejor marca', () => {
    const pruebas = [prueba(0, 5, { Tú: 70, A: 68, B: 72 }), prueba(0, 6, { Tú: 69, A: 71, B: 66 })];
    // Prueba 1: A 10, Tú 8, B 6. Prueba 2: B 10, Tú 8, A 6. → A 16, B 16, Tú 16.
    const c = clasificacionPorPuntos(pruebas);
    expect(c.map((f) => f.puntos)).toEqual([16, 16, 16]);
    expect(c.map((f) => f.nombre)).toEqual(['B', 'A', 'Tú']); // mejor marca: B 66, A 68, Tú 69
    expect(c.find((f) => f.yo)).toMatchObject({ puntos: 16, pruebas: 2, mejorMarca: 69, club: 'Mi club' });
  });

  it('las pruebas de campeonato puntúan doble y el puesto sale de la marca, no del orden guardado', () => {
    const c = clasificacionPorPuntos([prueba(0, 24, { A: 80, Tú: 70, B: 75 }, 'clasificatoria')]);
    expect(c.find((f) => f.yo)!.puntos).toBe(20);
    expect(c.find((f) => f.nombre === 'B')!.puntos).toBe(16);
    expect(c.find((f) => f.nombre === 'A')!.puntos).toBe(12);
  });

  it('un mismo rival es la misma persona en todas las pruebas, y las mejores marcas guardan la mejor de cada uno', () => {
    const m = mejoresMarcas([prueba(0, 5, { Tú: 70, A: 68 }), prueba(0, 6, { Tú: 67, A: 69 })]);
    expect(m.map((f) => [f.nombre, f.mejorMarca])).toEqual([['Tú', 67], ['A', 68]]);
  });

  it('sin filas guardadas no hay clasificación', () => {
    expect(clasificacionPorPuntos([{ ...prueba(0, 5, { Tú: 70 }), filas: undefined }])).toEqual([]);
  });

  it('solo se guarda la clasificación completa del curso en curso y el anterior, y hay un máximo de pruebas', () => {
    const todas = [prueba(0, 5, { Tú: 70, A: 68 }), prueba(1, 60, { Tú: 70, A: 68 }), prueba(2, 120, { Tú: 70, A: 68 })];
    const r = recortarPruebas(todas, 2);
    expect(r[0].filas).toBeUndefined(); // curso 0: ya no
    expect(r[1].filas).toHaveLength(2); // curso 1: el anterior
    expect(r[2].filas).toHaveLength(2);
    expect(r.map((p) => p.posicion)).toEqual(todas.map((p) => p.posicion)); // el resumen se conserva
    expect(recortarPruebas(Array.from({ length: 300 }, (_, i) => prueba(2, i, { Tú: 70 })), 2)).toHaveLength(200);
  });
});

describe('quién corre: asistencia y series', () => {
  it('los mejores casi nunca faltan y los peores faltan más', () => {
    expect(probabilidadDeAcudir(0)).toBeCloseTo(0.98, 5);
    expect(probabilidadDeAcudir(1)).toBeCloseTo(0.6, 5);
    expect(probabilidadDeAcudir(0.5)).toBeGreaterThan(probabilidadDeAcudir(0.9));
    for (let p = 0.1; p <= 1; p += 0.1) expect(probabilidadDeAcudir(p)).toBeLessThanOrEqual(probabilidadDeAcudir(p - 0.1));
  });

  it('quien quedó último la vez anterior falla más; quien ganó, no; y no baja del 50 % ni pasa del 99 %', () => {
    const base = probabilidadDeAcudir(0.8);
    expect(probabilidadDeAcudir(0.8, { posicion: 1, total: 18 })).toBeCloseTo(base, 10);
    expect(probabilidadDeAcudir(0.8, { posicion: 18, total: 18 })).toBeCloseTo(base - 0.15, 10);
    expect(probabilidadDeAcudir(0.8, { posicion: 12, total: 18 })).toBeLessThan(base);
    expect(probabilidadDeAcudir(0.8, { posicion: 12, total: 18 })).toBeGreaterThan(probabilidadDeAcudir(0.8, { posicion: 18, total: 18 }));
    expect(probabilidadDeAcudir(1, { posicion: 18, total: 18 })).toBe(0.5);
    expect(probabilidadDeAcudir(0, undefined, 0.5)).toBe(0.99);
    expect(probabilidadDeAcudir(0.8, { posicion: 3, total: 1 })).toBeCloseTo(base, 10); // sin carrera real a la que mirar
  });

  const gente = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i, nivel: 100 - i }));

  it('las series: ceil(n / 8) series, con el mismo número de corredores en cada una o uno de diferencia', () => {
    for (const n of [0, 1, 2, 7, 8, 9, 13, 16, 17, 25, 40]) {
      const series = repartirEnSeries(gente(n), 8);
      expect(series.flat()).toHaveLength(n);
      expect(series).toHaveLength(Math.max(1, Math.ceil(n / 8)));
      const tam = series.map((x) => x.length);
      expect(Math.max(...tam), `n=${n}`).toBeLessThanOrEqual(8);
      expect(Math.max(...tam) - Math.min(...tam), `n=${n}`).toBeLessThanOrEqual(1);
    }
    expect(repartirEnSeries(gente(13), 8).map((x) => x.length).sort()).toEqual([6, 7]);
    expect(repartirEnSeries(gente(17), 8).map((x) => x.length).sort()).toEqual([5, 6, 6]);
    expect(repartirEnSeries(gente(15), 8).map((x) => x.length).sort()).toEqual([7, 8]);
    expect(repartirEnSeries(gente(11), 8).map((x) => x.length).sort()).toEqual([5, 6]);
  });

  it('el reparto es en serpentina por nivel: 1.º a la A, 2.º y 3.º a la B, 4.º a la A...', () => {
    const [a, b] = repartirEnSeries(gente(8), 4);
    expect(a.map((c) => c.id)).toEqual([0, 3, 4, 7]);
    expect(b.map((c) => c.id)).toEqual([1, 2, 5, 6]);
    const [x, y] = repartirEnSeries(gente(18), 9);
    const media = (xs: { nivel: number }[]) => xs.reduce((t, c) => t + c.nivel, 0) / xs.length;
    expect(Math.abs(media(x) - media(y))).toBeLessThan(1.5);
  });

  it('la clasificación general junta las series por tiempos y cada uno conserva su puesto en la serie', () => {
    const series = clasificarPrueba([
      [{ mark: 60 }, { mark: 62 }],
      [{ mark: 59 }, { mark: 61 }],
    ]);
    expect(series.flat().map((c) => [c.serie, c.puestoEnSerie, c.puesto])).toEqual([
      [0, 1, 2],
      [0, 2, 4],
      [1, 1, 1],
      [1, 2, 3],
    ]);
  });

  it('la semifinal: los 16 mejores acuden; las bajas y ausencias las cubren los 2 reservas; con menos, corren los que hay', () => {
    const clasif = Array.from({ length: 20 }, (_, i) => ({ clave: `c${i}`, acude: true }));
    expect(plazasConReservas(clasif, 16, 2).map((c) => c.clave)).toEqual(clasif.slice(0, 16).map((c) => c.clave));
    const dos = clasif.map((c, i) => ({ ...c, acude: i !== 3 && i !== 7 }));
    expect(plazasConReservas(dos, 16, 2).map((c) => c.clave)).toEqual([...dos.slice(0, 16).filter((c) => c.acude), dos[16], dos[17]].map((c) => c.clave));
    const tres = clasif.map((c, i) => ({ ...c, acude: i !== 1 && i !== 2 && i !== 3 }));
    expect(plazasConReservas(tres, 16, 2)).toHaveLength(15); // solo hay 2 reservas: nadie más entra
    expect(plazasConReservas(clasif.slice(0, 11), 16, 2)).toHaveLength(11);
  });

  const semis = { series: [['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8'], ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7']], general: ['a1', 'b1', 'a2', 'b2', 'a3', 'b3', 'a4', 'b4', 'a5', 'b5', 'a6', 'b6', 'a7', 'b7', 'a8'] };
  const formato = { plazas: 8, porSerie: 4, reservasPorSerie: 2 };

  it('la final: los 4 primeros de cada serie; si uno no acude entra su reserva', () => {
    expect(finalistasDe(semis, () => true, formato)).toEqual(['a1', 'a2', 'a3', 'a4', 'b1', 'b2', 'b3', 'b4']);
    expect(finalistasDe(semis, (id) => id !== 'a2', formato)).toEqual(['a1', 'a3', 'a4', 'a5', 'b1', 'b2', 'b3', 'b4']);
  });

  it('la final con series incompletas: lo que falta lo cubre el mejor tiempo de los no clasificados; con menos de 8, corren todos los que quedan', () => {
    // En la serie B solo hay 3 que acudan: el hueco lo ocupa el mejor tiempo de los que quedaban (a5).
    expect(finalistasDe(semis, (id) => !['b4', 'b5', 'b6'].includes(id), formato)).toEqual(['a1', 'a2', 'a3', 'a4', 'b1', 'b2', 'b3', 'a5']);
    const pocos = { series: [['x1', 'x2', 'x3']], general: ['x1', 'x2', 'x3'] };
    expect(finalistasDe(pocos, () => true, formato)).toEqual(['x1', 'x2', 'x3']);
    expect(finalistasDe(pocos, (id) => id !== 'x2', formato)).toEqual(['x1', 'x3']);
  });

  it('la clasificación acumula los puntos de todas las pruebas de la categoría (×2 en el campeonato) y ordena por puntos y marca', () => {
    let t = anotarEnTabla(undefined, [{ clave: 'a', puesto: 1, marca: 60 }, { clave: 'b', puesto: 2, marca: 61 }, { clave: 'yo', puesto: 9, marca: 70 }], 'regular');
    t = anotarEnTabla(t, [{ clave: 'b', puesto: 1, marca: 59.5 }, { clave: 'a', puesto: 2, marca: 60.5 }], 'regular');
    expect(t.a).toEqual({ pt: 18, pr: 2, mm: 60 });
    expect(t.b).toEqual({ pt: 18, pr: 2, mm: 59.5 });
    expect(t.yo).toEqual({ pt: 0, pr: 1, mm: 70 });
    expect(ordenDeTabla(t)).toEqual(['b', 'a', 'yo']); // empatan a puntos: gana la mejor marca
    expect(anotarEnTabla(t, [{ clave: 'a', puesto: 1, marca: 60 }], 'semifinal').a.pt).toBe(18 + 20);
  });
});
