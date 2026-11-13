import { describe, expect, it } from 'vitest';
import { alturaDe } from './personas';
import { alturaEn, complexion, objetivoDeCuerpo, pasoDeSemanaDelCuerpo, perdidaDeAltura, pesoDe } from './cuerpo';

describe('cuerpo: una sola regla para todas las personas', () => {
  it('la altura crece hasta los 18, se mantiene y se pierde en la vejez', () => {
    expect(alturaEn(180, 18)).toBe(180);
    expect(alturaEn(180, 8)).toBeCloseTo(180 * 0.73, 6);
    expect(alturaEn(180, 50)).toBe(180);
    expect(perdidaDeAltura(70)).toBeCloseTo(3, 9);
    expect(perdidaDeAltura(90)).toBeCloseTo(9, 9);
    expect(alturaEn(180, 95)).toBeLessThan(alturaEn(180, 70));
  });

  it('el desfase adelanta o retrasa el crecimiento y no cambia la altura adulta', () => {
    expect(alturaEn(180, 12, 1)).toBeGreaterThan(alturaEn(180, 12, 0));
    expect(alturaEn(180, 12, -1)).toBeLessThan(alturaEn(180, 12, 0));
    expect(alturaEn(180, 30, 1.5)).toBe(alturaEn(180, 30, -1.5));
    // la altura de los PNJ (alturaDe) usa la misma curva y admite el desfase
    expect(alturaDe('m', 12, 0, 1)).toBeGreaterThan(alturaDe('m', 12, 0));
    expect(alturaDe('m', 12, 0, 0)).toBe(alturaDe('m', 12, 0));
  });

  it('el IMC de referencia también existe de adulto', () => {
    const imc = (edad: number) => pesoDe(100, edad, 30, 40) / 1;
    expect(imc(18)).toBeCloseTo(21.5, 6);
    expect(imc(30)).toBeCloseTo(23, 6);
    expect(imc(50)).toBeCloseTo(24.5, 6);
    expect(imc(70)).toBeCloseTo(24.5, 6);
    expect(imc(90)).toBeCloseTo(23, 6);
    // 0,04 por punto de músculo y 0,09 por punto de grasa sobre 30 y 40
    expect(pesoDe(100, 30, 40, 40)).toBeCloseTo(23.4, 6);
    expect(pesoDe(100, 30, 30, 50)).toBeCloseTo(23.9, 6);
  });

  it('la complexión no ha cambiado', () => {
    expect(complexion(20, 70)).toBe('con_sobrepeso');
    expect(complexion(65, 40)).toBe('musculado');
    expect(complexion(40, 40)).toBe('atletico');
    expect(complexion(20, 20)).toBe('delgado');
    expect(complexion(30, 40)).toBe('normal');
  });

  it('el paso semanal se acerca al objetivo un 8 %', () => {
    const h = { fuerza: 300, activo: 400 };
    const o = objetivoDeCuerpo(h);
    const p = pasoDeSemanaDelCuerpo({ musculo: 20, grasa: 50 }, h);
    expect(p.musculo).toBeCloseTo(20 + (o.musculo - 20) * 0.08, 9);
    expect(p.grasa).toBeCloseTo(50 + (o.grasa - 50) * 0.08, 9);
  });
});
