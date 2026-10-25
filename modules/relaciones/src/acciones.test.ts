import { describe, expect, it } from 'vitest';
import type { RasgosDe } from '@ds/contracts';
import { interesFavorito, mejorInteresEnComun, perdidaPorDiscusion, probabilidadDePaces } from './acciones';

const rasgos = (caracter: Record<string, number> = {}, intereses: Record<string, number> = {}): RasgosDe =>
  ({ origen: {} as RasgosDe['origen'], apariencia: {} as RasgosDe['apariencia'], caracter, intereses, gustos: {} as RasgosDe['gustos'] });

describe('acciones de relación (reglas puras)', () => {
  it('discutir duele más con un carácter agresivo y más con quien manda', () => {
    expect(perdidaPorDiscusion(rasgos({ agresividad: -50 }), 'companero')).toBeCloseTo(6, 6);
    expect(perdidaPorDiscusion(rasgos({ agresividad: 0 }), 'companero')).toBeCloseTo(10, 6);
    expect(perdidaPorDiscusion(rasgos({ agresividad: 50 }), 'companero')).toBeCloseTo(14, 6);
    expect(perdidaPorDiscusion(rasgos({ agresividad: 0 }), 'entrenador')).toBeCloseTo(15, 6);
    expect(perdidaPorDiscusion(undefined, 'amigo')).toBeCloseTo(10, 6);
  });

  it('las paces son más probables con alguien sociable, optimista y honesto, y menos cuanto más enconado esté el vínculo', () => {
    const amable = rasgos({ sociabilidad: 40, optimismo: 40, honestidad: 40 });
    const seco = rasgos({ sociabilidad: -40, optimismo: -40, honestidad: -40 });
    expect(probabilidadDePaces(amable, -1, 0.4)).toBeGreaterThan(probabilidadDePaces(seco, -1, 0.4));
    expect(probabilidadDePaces(amable, -1, 0.4)).toBeGreaterThan(probabilidadDePaces(amable, -2, 0.4));
    expect(probabilidadDePaces(amable, -2, 0.4)).toBeGreaterThan(probabilidadDePaces(amable, -3, 0.4));
    expect(probabilidadDePaces(amable, -1, 0.8)).toBeGreaterThan(probabilidadDePaces(amable, -1, 0.1));
  });

  it('la probabilidad de las paces siempre está entre 0,08 y 0,85', () => {
    for (const n of [-3, -2, -1]) {
      for (const c of [0, 0.5, 1]) {
        const alto = probabilidadDePaces(rasgos({ sociabilidad: 50, optimismo: 50, honestidad: 50 }), n, c);
        const bajo = probabilidadDePaces(rasgos({ sociabilidad: -50, optimismo: -50, honestidad: -50 }), n, c);
        expect(alto).toBeLessThanOrEqual(0.85);
        expect(bajo).toBeGreaterThanOrEqual(0.08);
      }
    }
  });

  it('el interés en común es el que más le gusta a la otra persona entre los que ya tiene el personaje', () => {
    const r = rasgos({}, { deporte: 3, cine: 2, cocina: 1 });
    expect(mejorInteresEnComun(r, {})).toBeUndefined();
    expect(mejorInteresEnComun(r, { cine: 10 })).toBeUndefined(); // por debajo de 15 no cuenta
    expect(mejorInteresEnComun(r, { cine: 40, cocina: 90 })?.id).toBe('cine'); // intensidad 2 × 0,9 frente a 1 × 1,4
    expect(mejorInteresEnComun(r, { cine: 20, deporte: 50 })?.id).toBe('deporte');
  });

  it('el interés favorito es el de mayor intensidad', () => {
    expect(interesFavorito(rasgos({}, { deporte: 1, cine: 3, cocina: 2 }))?.id).toBe('cine');
    expect(interesFavorito(rasgos())).toBeUndefined();
  });
});
