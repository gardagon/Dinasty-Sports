import { describe, expect, it } from 'vitest';
import { CLASIFICADOS_POR_SERIE, FACTOR_DE_CAMPEONATO, FINALISTAS, probabilidadDeAcudir, repartirEnSeries, type FilaGuardada, PUNTOS_POR_PUESTO, clasificacionPorPuntos, mejoresMarcas, puntosDe, recortarPruebas, type PruebaGuardada } from './temporada';

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

  it('las series se reparten en serpiente para que sean parejas', () => {
    const corredores = Array.from({ length: 18 }, (_, i) => ({ id: i, nivel: 100 - i }));
    const [a, b] = repartirEnSeries(corredores);
    expect(a).toHaveLength(9);
    expect(b).toHaveLength(9);
    expect(a.map((c) => c.id)).toEqual([0, 3, 4, 7, 8, 11, 12, 15, 16]);
    expect(b.map((c) => c.id)).toEqual([1, 2, 5, 6, 9, 10, 13, 14, 17]);
    const media = (xs: { nivel: number }[]) => xs.reduce((s, c) => s + c.nivel, 0) / xs.length;
    expect(Math.abs(media(a) - media(b))).toBeLessThan(1.5);
    expect(repartirEnSeries(corredores.slice(0, 5)).map((s) => s.length)).toEqual([3, 2]); // con menos corredores, una más en la A
  });

  it('el campeonato clasifica a 4 por serie: 8 finalistas', () => {
    expect(CLASIFICADOS_POR_SERIE).toBe(4);
    expect(FINALISTAS).toBe(8);
  });
});
