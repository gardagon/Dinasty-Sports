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
    const q = { edad: 25, madurez: 0, sexo: 'm' as const };
    const o = objetivoDeCuerpo(h, q);
    const p = pasoDeSemanaDelCuerpo({ musculo: 20, grasa: 50 }, h, q);
    expect(p.musculo).toBeCloseTo(20 + (o.musculo - 20) * 0.08, 9);
    expect(p.grasa).toBeCloseTo(50 + (o.grasa - 50) * 0.08, 9);
  });

  describe('músculo y grasa con la edad y el sexo', () => {
    const gym = { fuerza: 900, activo: 600 };
    const hombre = (edad: number, madurez = 0) => ({ edad, madurez, sexo: 'm' as const });
    const mujer = (edad: number, madurez = 0) => ({ edad, madurez, sexo: 'f' as const });

    it('un niño de 8 años no se pone musculado aunque haga mucha fuerza; con la pubertad sí puede', () => {
      expect(complexion(objetivoDeCuerpo(gym, hombre(8)).musculo, 40)).not.toBe('musculado');
      expect(objetivoDeCuerpo(gym, hombre(11)).musculo).toBeLessThan(60);
      expect(objetivoDeCuerpo(gym, hombre(20)).musculo).toBeGreaterThanOrEqual(60);
      // el adelanto del desarrollo sube el tope
      expect(objetivoDeCuerpo(gym, hombre(12, 1.5)).musculo).toBeGreaterThan(objetivoDeCuerpo(gym, hombre(12, -1.5)).musculo);
    });

    it('las mujeres tienen menos músculo objetivo y más grasa base', () => {
      const medio = { fuerza: 900, activo: 200 };
      const h = objetivoDeCuerpo(medio, hombre(25));
      const m = objetivoDeCuerpo(medio, mujer(25));
      expect(m.musculo).toBeCloseTo(h.musculo * 0.75, 6);
      expect(m.grasa).toBeCloseTo(h.grasa + 8, 6);
    });

    it('sarcopenia desde los 40 y metabolismo desde los 30 (máximo +12)', () => {
      const poco = { fuerza: 300, activo: 300 };
      const a = objetivoDeCuerpo(poco, hombre(40));
      const b = objetivoDeCuerpo(poco, hombre(60));
      expect(a.musculo - b.musculo).toBeCloseTo(10, 6);
      expect(objetivoDeCuerpo(poco, hombre(40)).grasa - objetivoDeCuerpo(poco, hombre(30)).grasa).toBeCloseTo(3, 6);
      expect(objetivoDeCuerpo(poco, hombre(90)).grasa - objetivoDeCuerpo(poco, hombre(70)).grasa).toBeCloseTo(0, 6);
    });
  });
});
