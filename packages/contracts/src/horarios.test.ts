import { describe, expect, it } from 'vitest';
import { CIUDAD_INICIAL, abiertoEn } from './lugares';
import { timeView } from './time';

const lugar = (id: string) => CIUDAD_INICIAL.lugares.find((l) => l.id === id)!;
const en = (dia: number, hora: number, min = 0) => timeView(dia * 1440 + hora * 60 + min);

describe('horarios de los lugares', () => {
  it('el colegio abre los días de clase de 7:00 a 19:00 y los lunes y miércoles por la tarde por el club', () => {
    const colegio = lugar('colegio');
    expect(abiertoEn(colegio, en(0, 6, 59))).toBe(false);
    expect(abiertoEn(colegio, en(0, 7))).toBe(true);
    expect(abiertoEn(colegio, en(0, 18, 59))).toBe(true);
    expect(abiertoEn(colegio, en(0, 19))).toBe(false);
    expect(abiertoEn(colegio, en(5, 10))).toBe(false); // sábado
    expect(abiertoEn(colegio, en(6, 16))).toBe(false); // domingo
  });

  it('el supermercado abre de lunes a sábado de 9 a 21 y el domingo de 10 a 15', () => {
    const s = lugar('supermercado');
    expect(abiertoEn(s, en(1, 8, 59))).toBe(false);
    expect(abiertoEn(s, en(1, 9))).toBe(true);
    expect(abiertoEn(s, en(5, 20, 59))).toBe(true);
    expect(abiertoEn(s, en(5, 21))).toBe(false);
    expect(abiertoEn(s, en(6, 9, 59))).toBe(false);
    expect(abiertoEn(s, en(6, 10))).toBe(true);
    expect(abiertoEn(s, en(6, 15))).toBe(false);
  });

  it('el restaurante abre de 13 a 16 y de 20 a 23 todos los días', () => {
    const r = lugar('restaurante');
    for (const dia of [0, 5, 6]) {
      expect(abiertoEn(r, en(dia, 12, 59))).toBe(false);
      expect(abiertoEn(r, en(dia, 13))).toBe(true);
      expect(abiertoEn(r, en(dia, 16))).toBe(false);
      expect(abiertoEn(r, en(dia, 20))).toBe(true);
      expect(abiertoEn(r, en(dia, 23))).toBe(false);
    }
  });
});
