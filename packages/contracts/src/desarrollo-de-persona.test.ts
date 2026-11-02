import { describe, expect, it } from 'vitest';
import { CAIDA_POR_GRUPO, DESARROLLO_NATURAL, evolucionDiaria, evolucionSemanal, vigoresPorEdad, type EntradaDeEvolucion } from './desarrollo-de-persona';
import { factorPorEdad, madurezPorEdad } from './development';

const regla = { decay: CAIDA_POR_GRUPO.fisico, natural: DESARROLLO_NATURAL };

/** Siete días con la regla diaria, como hace el motor con el personaje. */
function sieteDias(e: EntradaDeEvolucion): number {
  let { valor, pico } = e;
  for (let d = 0; d < 7; d++) {
    valor = evolucionDiaria(regla, { ...e, valor, pico, diasSinEntrenar: e.diasSinEntrenar + d });
    pico = Math.max(pico, valor);
  }
  return valor;
}

describe('una semana de una vez frente a siete días', () => {
  const casos: [string, EntradaDeEvolucion][] = [
    ['un niño que crece solo (por debajo de lo natural)', { valor: 8, pico: 8, base: 8, diasSinEntrenar: 1e6, techo: 40, envejece: false }],
    ['cerca de lo natural', { valor: 17.5, pico: 18, base: 10, diasSinEntrenar: 1e6, techo: 40, envejece: false }],
    ['por encima de lo natural: cae hacia su suelo', { valor: 40, pico: 40, base: 12, diasSinEntrenar: 1e6, techo: 60, envejece: false }],
    ['recién entrenado: dentro de los días de gracia', { valor: 30, pico: 30, base: 12, diasSinEntrenar: 0, techo: 60, envejece: false }],
    ['a punto de acabar la gracia', { valor: 30, pico: 30, base: 12, diasSinEntrenar: 3, techo: 60, envejece: false }],
    ['envejeciendo: por encima de lo que permite la edad', { valor: 70, pico: 70, base: 12, diasSinEntrenar: 1e6, techo: 55, envejece: true }],
    ['sin tope genético', { valor: 20, pico: 20, base: 10, diasSinEntrenar: 1e6, techo: undefined, envejece: false }],
  ];
  for (const [nombre, e] of casos) {
    it(`da lo mismo, ${nombre}`, () => {
      expect(Math.abs(evolucionSemanal(regla, e) - sieteDias(e))).toBeLessThan(0.15);
    });
  }

  it('sin entrenar, crece solo hasta el 45 % de lo que permite su edad y se queda ahí', () => {
    let e: EntradaDeEvolucion = { valor: 5, pico: 5, base: 5, diasSinEntrenar: 1e6, techo: 60, envejece: false };
    for (let w = 0; w < 80; w++) e = { ...e, valor: evolucionSemanal(regla, e), pico: Math.max(e.pico, evolucionSemanal(regla, e)) };
    expect(e.valor).toBeGreaterThan(60 * DESARROLLO_NATURAL - 1.5);
    expect(e.valor).toBeLessThan(60 * DESARROLLO_NATURAL + 0.5);
  });
});

describe('lo que permite la edad', () => {
  it('es la curva de siempre: la madurez y los vigores, con el adelanto o retraso propio hasta los 24 años', () => {
    const v = vigoresPorEdad(10, 1);
    expect(v.madurez).toBeCloseTo(100 * madurezPorEdad(11), 9);
    expect(v.fisico).toBeCloseTo(100 * factorPorEdad('fisico', 11), 9);
    expect(v.tecnico).toBeCloseTo(100 * factorPorEdad('tecnico', 11), 9);
    // Lo mental y lo social siguen la edad real, sin adelanto.
    expect(v.mental).toBeCloseTo(100 * factorPorEdad('mental', 10), 9);
    expect(v.social).toBeCloseTo(100 * factorPorEdad('social', 10), 9);
    // Pasados los 24, la edad es la que es.
    expect(vigoresPorEdad(30, 1.5).fisico).toBeCloseTo(100 * factorPorEdad('fisico', 30), 9);
  });
});
