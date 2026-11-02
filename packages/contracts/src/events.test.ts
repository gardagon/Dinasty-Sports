import { describe, expect, it } from 'vitest';
import { elPersonajeLeGana, fueUnExito, type CompetitionResultData } from './events';

const prueba = (mark: number, extra: Partial<CompetitionResultData> = {}) => ({ mark, ...extra });

describe('competicion.resultado: quién le gana a quién', () => {
  it('en una prueba individual gana la menor marca (como en atletismo) y un empate no es ganar', () => {
    expect(elPersonajeLeGana(prueba(50), { mark: 52 })).toBe(true);
    expect(elPersonajeLeGana(prueba(50), { mark: 48 })).toBe(false);
    expect(elPersonajeLeGana(prueba(50), { mark: 50 })).toBe(false);
  });

  it('con mayorEsMejor gana la mayor', () => {
    expect(elPersonajeLeGana(prueba(10, { mayorEsMejor: true }), { mark: 8 })).toBe(true);
    expect(elPersonajeLeGana(prueba(10, { mayorEsMejor: true }), { mark: 12 })).toBe(false);
  });

  it('en un partido no se comparan marcas: se le gana al bando rival si el equipo gana', () => {
    const eq = (resultado: 'victoria' | 'empate' | 'derrota') => prueba(7, { equipo: { resultado, propio: 2, rival: 1, equipoPropio: 'A', equipoRival: 'B' } });
    expect(elPersonajeLeGana(eq('victoria'), { mark: 99, bando: 'rival' })).toBe(true);
    expect(elPersonajeLeGana(eq('victoria'), { mark: 0, bando: 'companero' })).toBe(false);
    expect(elPersonajeLeGana(eq('empate'), { mark: 0, bando: 'rival' })).toBe(false);
    expect(elPersonajeLeGana(eq('derrota'), { mark: 0, bando: 'rival' })).toBe(false);
  });

  it('un buen resultado es el podio, o ganar el partido', () => {
    expect(fueUnExito({ position: 3 })).toBe(true);
    expect(fueUnExito({ position: 4 })).toBe(false);
    expect(fueUnExito({ position: 12, equipo: { resultado: 'victoria', propio: 1, rival: 0, equipoPropio: 'A', equipoRival: 'B' } })).toBe(true);
    expect(fueUnExito({ position: 1, equipo: { resultado: 'empate', propio: 1, rival: 1, equipoPropio: 'A', equipoRival: 'B' } })).toBe(false);
  });
});
