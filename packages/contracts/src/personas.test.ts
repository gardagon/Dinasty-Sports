import { describe, expect, it } from 'vitest';
import { DIAS_DE_ENERO_AL_INICIO_DEL_CURSO } from './calendar';
import { alturaDe, alturaRelativa, cumpleaños, edadCumplida, edadRelativa, estaturaZ, nacimientoDeProgenitor, nacimientoParaEdad } from './personas';

describe('datos de las personas', () => {
  it('el cumpleaños sale del día de nacimiento: 1 de enero, 31 de diciembre y un día intermedio', () => {
    expect(cumpleaños(-DIAS_DE_ENERO_AL_INICIO_DEL_CURSO).texto).toBe('1 de enero');
    expect(cumpleaños(-DIAS_DE_ENERO_AL_INICIO_DEL_CURSO + 364).texto).toBe('31 de diciembre');
    expect(cumpleaños(-DIAS_DE_ENERO_AL_INICIO_DEL_CURSO + 31 + 28 + 14).texto).toBe('15 de marzo');
    // Un año antes o después, el mismo día.
    expect(cumpleaños(-DIAS_DE_ENERO_AL_INICIO_DEL_CURSO - 365 * 8 + 59).texto).toBe(cumpleaños(-DIAS_DE_ENERO_AL_INICIO_DEL_CURSO + 59).texto);
  });

  it('quien nace para tener una edad la cumple al empezar el curso o poco antes', () => {
    for (let i = 0; i < 100; i++) {
      const n = nacimientoParaEdad(`p${i}`, 8);
      expect(edadCumplida(n, 0)).toBeGreaterThanOrEqual(7);
      expect(edadCumplida(n, 0)).toBeLessThanOrEqual(8);
    }
  });

  it('los padres tienen entre 38 y 54 años, siempre los mismos para una semilla', () => {
    for (let semilla = 1; semilla <= 100; semilla++) {
      for (const id of ['padre', 'madre'] as const) {
        const edad = edadCumplida(nacimientoDeProgenitor(semilla, id), 0);
        expect(edad).toBeGreaterThanOrEqual(38);
        expect(edad).toBeLessThanOrEqual(54);
        expect(nacimientoDeProgenitor(semilla, id)).toBe(nacimientoDeProgenitor(semilla, id));
      }
    }
  });

  it('la altura crece con la edad hasta los 18 y depende de la estatura heredada', () => {
    for (const g of ['f', 'm'] as const) {
      let antes = 0;
      for (const edad of [2, 5, 8, 11, 14, 17, 18, 30]) {
        const a = alturaDe(g, edad, 0);
        expect(a).toBeGreaterThanOrEqual(antes);
        antes = a;
      }
      expect(alturaDe(g, 30, 1.5)).toBeGreaterThan(alturaDe(g, 30, -1.5));
    }
    expect(alturaDe('m', 30, 0)).toBeGreaterThan(alturaDe('f', 30, 0));
    const zs = Array.from({ length: 500 }, (_, i) => estaturaZ(`x${i}`));
    expect(Math.abs(zs.reduce((a, b) => a + b, 0) / zs.length)).toBeLessThan(0.15);
    expect(estaturaZ('x1')).toBe(estaturaZ('x1'));
  });

  it('a simple vista: de tu edad, un poco, bastante más o mucho más mayor o menor', () => {
    expect(edadRelativa(9, 8)).toBe('De tu edad, más o menos');
    expect(edadRelativa(7, 8)).toBe('De tu edad, más o menos');
    expect(edadRelativa(10, 8)).toBe('Un poco mayor que tú');
    expect(edadRelativa(5, 8)).toBe('Un poco menor que tú');
    expect(edadRelativa(14, 8)).toBe('Bastante más mayor que tú');
    expect(edadRelativa(1, 8)).toBe('Bastante más menor que tú');
    expect(edadRelativa(40, 8)).toBe('Mucho más mayor que tú');
  });

  it('la altura se ve respecto a la tuya y concuerda con el género', () => {
    expect(alturaRelativa(127, 125, 'm')).toBe('De tu altura, más o menos');
    expect(alturaRelativa(132, 125, 'm')).toBe('Un poco más alto que tú');
    expect(alturaRelativa(118, 125, 'f')).toBe('Un poco más baja que tú');
    expect(alturaRelativa(140, 125, 'f')).toBe('Bastante más alta que tú');
    expect(alturaRelativa(175, 125, 'm')).toBe('Mucho más alto que tú');
  });
});
