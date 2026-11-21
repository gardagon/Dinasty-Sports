import { describe, expect, it } from 'vitest';
import { CIUDAD_GRANDE, demografiaDelLugar, parejasDelLugar } from './ciudad';
import { origenDePadre, origenDeJugador } from './nombres';
import { PAIS_ARGENTINA, PAIS_ESPANA, PAIS_INGLATERRA, PAIS_CIUDAD_GRANDE, validarPais } from './paises';
import { ORIGENES, origenAlAzar, origenesDePareja, type ParejasDef } from './rasgos';
import { rngEstable } from './rng';

const fuera = (o: { id: string }[]): boolean => o.some((x) => !x.id.startsWith('espana_'));

describe('parejas por tipo (demografía de orígenes)', () => {
  it('las frecuencias de España suman 1 y el 19 % es de fuera', () => {
    const total = ORIGENES.reduce((a, o) => a + o.frecuencia, 0);
    expect(total).toBeCloseTo(1, 6);
    expect(ORIGENES.filter((o) => !o.id.startsWith('espana_')).reduce((a, o) => a + o.frecuencia, 0)).toBeCloseTo(0.19, 6);
  });

  it('la ciudad grande, como Madrid: 19 % de fuera repartido por continente (más de la mitad de América), distinto del de España', () => {
    const d = CIUDAD_GRANDE.demografia!;
    const total = Object.values(d).reduce((a, b) => a + b, 0);
    const fuera = Object.entries(d).filter(([k]) => !k.startsWith('espana_')).reduce((a, [, v]) => a + v, 0);
    expect(total).toBeCloseTo(1, 6);
    expect(fuera).toBeCloseTo(0.19, 6);
    expect(d.latinoamerica / fuera).toBeGreaterThan(0.5);
    expect(demografiaDelLugar(PAIS_CIUDAD_GRANDE)).toBe(d);
    expect(demografiaDelLugar(PAIS_ESPANA)).toBe(PAIS_ESPANA.demografia);
    expect(PAIS_ESPANA.demografia.latinoamerica).toBe(0.06);
  });

  it('España y su ciudad grande traen parejas; Argentina e Inglaterra, no (sortean a los padres por separado, como antes)', () => {
    expect(parejasDelLugar(PAIS_ESPANA)).toEqual({ ambosExtranjeros: 0.13, mixtas: 0.12, mismoOrigen: 0.7 });
    expect(parejasDelLugar(PAIS_CIUDAD_GRANDE)).toEqual(CIUDAD_GRANDE.parejas);
    expect(PAIS_ARGENTINA.parejas).toBeUndefined();
    expect(PAIS_INGLATERRA.parejas).toBeUndefined();
  });

  it('sin parejas, el origen de los padres sale igual que antes (el mismo sorteo por separado)', () => {
    for (const pais of [PAIS_ARGENTINA, PAIS_INGLATERRA]) {
      for (let seed = 1; seed <= 20; seed++) {
        for (const lado of ['padre', 'madre'] as const) {
          expect(origenDePadre(seed, lado, pais)).toEqual(origenAlAzar(rngEstable('origen', seed, lado), demografiaDelLugar(pais)));
        }
      }
    }
  });

  it('con parejas, los padres de una semilla son siempre los mismos y el hijo hereda de los dos', () => {
    expect(origenDePadre(5, 'padre', PAIS_ESPANA)).toEqual(origenDePadre(5, 'padre', PAIS_ESPANA));
    expect(origenDeJugador(5, PAIS_ESPANA).reduce((a, x) => a + x.peso, 0)).toBeCloseTo(1, 6);
  });

  it('el reparto de tipos sale como se pide (muestra grande)', () => {
    const rng = rngEstable('test-parejas', 1);
    const parejas: ParejasDef = PAIS_ESPANA.parejas!;
    const N = 20000;
    let dos = 0, uno = 0, mismo = 0;
    for (let i = 0; i < N; i++) {
      const [a, b] = origenesDePareja(rng, PAIS_ESPANA.demografia, PAIS_ESPANA.origenesLocales, parejas);
      if (fuera(a) && fuera(b)) { dos++; if (a.length === 1 && b.length === 1 && a[0].id === b[0].id) mismo++; } else if (fuera(a) || fuera(b)) uno++;
    }
    expect(dos / N).toBeGreaterThan(0.12); expect(dos / N).toBeLessThan(0.14);
    expect(uno / N).toBeGreaterThan(0.105); expect(uno / N).toBeLessThan(0.135);
    expect(mismo / dos).toBeGreaterThan(0.66); expect(mismo / dos).toBeLessThan(0.78);
  });

  it('valida las parejas del paquete y de la ciudad', () => {
    expect(validarPais({ ...PAIS_ESPANA, parejas: { ambosExtranjeros: 0.7, mixtas: 0.5, mismoOrigen: 0.5 } }).join()).toMatch(/no puede pasar de 1/);
    expect(validarPais({ ...PAIS_ESPANA, parejas: { ambosExtranjeros: 2, mixtas: 0, mismoOrigen: 0 } }).join()).toMatch(/entre 0 y 1/);
    expect(validarPais(PAIS_CIUDAD_GRANDE)).toEqual([]);
  });
});
