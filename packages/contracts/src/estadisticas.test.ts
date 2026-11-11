import { describe, expect, it } from 'vitest';
import type { PuestosDeDeporte } from './deporte-datos';
import { aprendizajeDe, cerrarTemporadaDeJugador, estadisticasVacias, experienciaTrasElPartido, factorDeExperienciaDelPuesto, notaMedia, sumarPartido } from './estadisticas';
import { MORAL_DEL_BANQUILLO, trasElBanquillo } from './estado-de-jugador';

/** Unos puestos mínimos: solo importa la pierna buena. */
const PUESTOS_DE_FUTBOL_DE_PRUEBA = { puestos: [], reparto: [], pierna: { ventajaDelLado: 0.25, factorDeExperienciaDelLado: 1.25 } } as unknown as PuestosDeDeporte;

describe('las estadísticas de temporada', () => {
  it('cada partido jugado suma partidos, titularidades, minutos, goles, asistencias y nota; la media sale de la suma', () => {
    let e = sumarPartido(undefined, 3, { minutos: 90, titular: true, goles: 2, asistencias: 1, nota: 8 });
    e = sumarPartido(e, 3, { minutos: 30, titular: false, nota: 6 });
    expect(e).toEqual({ curso: 3, pj: 2, ti: 1, min: 120, g: 2, a: 1, nota: 14 });
    expect(notaMedia(e)).toBe(7);
  });

  it('quien no jugó (0 minutos) no suma partido; otra temporada empieza de cero', () => {
    const e = sumarPartido(estadisticasVacias(1), 1, { minutos: 0 });
    expect(e.pj).toBe(0);
    expect(sumarPartido({ curso: 1, pj: 5, ti: 5, min: 450, g: 1, a: 0, nota: 30 }, 2, { minutos: 90, titular: true, nota: 7 })).toEqual({ curso: 2, pj: 1, ti: 1, min: 90, g: 0, a: 0, nota: 7 });
  });

  it('la temporada cerrada es compacta: [curso, pj, ti, min, g, a, nota media × 10]', () => {
    expect(cerrarTemporadaDeJugador({ curso: 4, pj: 3, ti: 2, min: 200, g: 1, a: 2, nota: 20 })).toEqual([4, 3, 2, 200, 1, 2, 67]);
    expect(cerrarTemporadaDeJugador(estadisticasVacias(2))).toEqual([2, 0, 0, 0, 0, 0, 0]);
  });
});

describe('la experiencia en un puesto', () => {
  it('el primer partido de un niño normal da unos 9 puntos y cada vez se gana menos', () => {
    const a = aprendizajeDe([0.5, 0.5, 0.5]);
    expect(a).toBeCloseTo(1, 5);
    const primero = experienciaTrasElPartido(0, { minutos: 90, aprendizaje: a });
    expect(primero).toBeCloseTo(9, 1);
    let exp = 0;
    const ganancias: number[] = [];
    for (let i = 0; i < 12; i++) { const n = experienciaTrasElPartido(exp, { minutos: 90, aprendizaje: a }); ganancias.push(n - exp); exp = n; }
    for (let i = 1; i < ganancias.length; i++) expect(ganancias[i]).toBeLessThan(ganancias[i - 1]);
    // Un curso de titular (12 partidos) lleva a unos 65.
    expect(exp).toBeGreaterThan(60);
    expect(exp).toBeLessThan(70);
  });

  it('quien aprende más (listo y atento) y quien juega en el lado de su pierna buena (×1,25) sube más deprisa; con menos minutos, menos', () => {
    expect(aprendizajeDe([1, 1, 1])).toBeCloseTo(1.3, 5);
    expect(aprendizajeDe([0, 0, 0])).toBeCloseTo(0.7, 5);
    const base = experienciaTrasElPartido(0, { minutos: 90, aprendizaje: 1 });
    expect(experienciaTrasElPartido(0, { minutos: 90, aprendizaje: 1.3 })).toBeGreaterThan(base);
    expect(experienciaTrasElPartido(0, { minutos: 90, aprendizaje: 1, factorDelLado: 1.25 })).toBeCloseTo(base * 1.25, 0);
    expect(experienciaTrasElPartido(0, { minutos: 45, aprendizaje: 1 })).toBeCloseTo(base / 2, 1);
    expect(experienciaTrasElPartido(99.9, { minutos: 90, aprendizaje: 1.3, factorDelLado: 1.25 })).toBeLessThanOrEqual(100);
  });

  it('el ×1,25 solo vale en los puestos del lado de su pierna buena', () => {
    expect(factorDeExperienciaDelPuesto(PUESTOS_DE_FUTBOL_DE_PRUEBA, 'LB', 'izquierda')).toBe(1.25);
    expect(factorDeExperienciaDelPuesto(PUESTOS_DE_FUTBOL_DE_PRUEBA, 'LB', 'derecha')).toBe(1);
    expect(factorDeExperienciaDelPuesto(PUESTOS_DE_FUTBOL_DE_PRUEBA, 'CB', 'izquierda')).toBe(1);
  });
});

describe('la moral del banquillo', () => {
  it('quien se queda en el banquillo baja su moral, más cuanto más ambicioso, y no cambia su forma', () => {
    const e = { fisica: 80, moral: 60, forma: 70, salud: 100 };
    const conformista = trasElBanquillo(e, 0);
    const ambicioso = trasElBanquillo(e, 1);
    expect(conformista.moral).toBeCloseTo(60 + MORAL_DEL_BANQUILLO * 0.5, 5);
    expect(ambicioso.moral).toBeCloseTo(60 + MORAL_DEL_BANQUILLO * 1.5, 5);
    expect(ambicioso.moral).toBeLessThan(conformista.moral);
    expect(ambicioso.forma).toBe(70);
    expect(trasElBanquillo({ ...e, moral: 1 }, 1).moral).toBe(0);
  });
});
