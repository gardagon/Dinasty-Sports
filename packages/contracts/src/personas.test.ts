import { describe, expect, it } from 'vitest';
import { aforoCercano } from './agendas';
import { DIAS_DE_ENERO_AL_INICIO_DEL_CURSO } from './calendar';
import { cursoDeEdad, nombreDeClase, letraDeClaseDe, fechaDelDia, alturaDe, alturaRelativa, cumpleaños, edadCumplida, edadRelativa, estaturaZ, nacimientoDeProgenitor, nacimientoParaEdad, OFICIOS_DE_PADRES, anioDelCalendario, oficioDeProgenitor, oficioDeProgenitorAlAzar } from './personas';

describe('datos de las personas', () => {
  it('el cumpleaños sale del día de nacimiento: 1 de enero, 31 de diciembre y un día intermedio', () => {
    expect(cumpleaños(-DIAS_DE_ENERO_AL_INICIO_DEL_CURSO).texto).toBe('1 de enero');
    expect(cumpleaños(-DIAS_DE_ENERO_AL_INICIO_DEL_CURSO + 364).texto).toBe('31 de diciembre');
    expect(cumpleaños(-DIAS_DE_ENERO_AL_INICIO_DEL_CURSO + 31 + 28 + 14).texto).toBe('15 de marzo');
    // Un año antes o después, el mismo día.
    expect(cumpleaños(-DIAS_DE_ENERO_AL_INICIO_DEL_CURSO - 365 * 8 + 59).texto).toBe(cumpleaños(-DIAS_DE_ENERO_AL_INICIO_DEL_CURSO + 59).texto);
  });

  it('la fecha del día: el día 0 es el 10 de septiembre y el año da la vuelta; el cumpleaños sale en formato corto', () => {
    expect(fechaDelDia(0).texto).toBe('10 de septiembre');
    expect(fechaDelDia(0).corto).toBe('10/09');
    expect(fechaDelDia(0 + 365).corto).toBe('10/09');
    expect(fechaDelDia(-DIAS_DE_ENERO_AL_INICIO_DEL_CURSO).corto).toBe('01/01');
    expect(fechaDelDia(-DIAS_DE_ENERO_AL_INICIO_DEL_CURSO + 115).corto).toBe('26/04'); // 31+28+31+25 días después del 1 de enero
    expect(cumpleaños(-DIAS_DE_ENERO_AL_INICIO_DEL_CURSO + 115).corto).toBe('26/04');
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

  it('las clases tienen curso y letra: a los 8 años, 3.º de primaria; los cursos van de infantil a bachillerato', () => {
    expect(nombreDeClase(8, 'A')).toBe('3.ºA de primaria');
    expect(nombreDeClase(8, 'B')).toBe('3.ºB de primaria');
    expect(nombreDeClase(11, 'A')).toBe('6.ºA de primaria');
    expect(nombreDeClase(12, 'B')).toBe('1.ºB de ESO');
    expect(cursoDeEdad(12)).toEqual({ numero: 1, etapa: 'ESO' });
    expect(cursoDeEdad(16)).toEqual({ numero: 1, etapa: 'bachillerato' });
    expect(cursoDeEdad(17)).toEqual({ numero: 2, etapa: 'bachillerato' });
    expect(cursoDeEdad(4)).toEqual({ numero: 2, etapa: 'infantil' });
    expect(cursoDeEdad(2)).toBeUndefined();
    expect(nombreDeClase(30, 'A')).toBeUndefined();
    const letras = new Set(Array.from({ length: 100 }, (_, i) => letraDeClaseDe(`n${i}`)));
    expect(letras).toEqual(new Set(['A', 'B']));
    expect(letraDeClaseDe('n1')).toBe(letraDeClaseDe('n1'));
  });

  it('la gente cerca varía en torno a 40: de 34 a 46, estable mientras no cambie la presencia', () => {
    const valores = Array.from({ length: 400 }, (_, i) => aforoCercano('colegio', i));
    expect(Math.min(...valores)).toBeGreaterThanOrEqual(34);
    expect(Math.max(...valores)).toBeLessThanOrEqual(46);
    expect(Math.min(...valores)).toBeLessThanOrEqual(36);
    expect(Math.max(...valores)).toBeGreaterThanOrEqual(44);
    expect(Math.abs(valores.reduce((a, b) => a + b, 0) / valores.length - 40)).toBeLessThan(1);
    expect(aforoCercano('colegio', 7)).toBe(aforoCercano('colegio', 7));
    expect(new Set([aforoCercano('colegio', 1), aforoCercano('parque', 1)]).size).toBeGreaterThanOrEqual(1);
  });
});

describe('profesión de los padres', () => {
  it('el índice sale de la semilla, es estable y siempre vale; cada oficio se dice en masculino y femenino', () => {
    for (let seed = 0; seed < 200; seed++) {
      for (const id of ['padre', 'madre']) {
        const i = oficioDeProgenitorAlAzar(seed, id);
        expect(i).toBe(oficioDeProgenitorAlAzar(seed, id));
        expect(i).toBeGreaterThanOrEqual(0);
        expect(i).toBeLessThan(OFICIOS_DE_PADRES.length);
      }
    }
    expect(oficioDeProgenitor(2, 'm')).toEqual({ profesion: 'Médico', trabajo: 'Hospital' });
    expect(oficioDeProgenitor(2, 'f')).toEqual({ profesion: 'Médica', trabajo: 'Hospital' });
    expect(new Set(Array.from({ length: 200 }, (_, s) => oficioDeProgenitorAlAzar(s, 'padre'))).size).toBe(OFICIOS_DE_PADRES.length);
  });
});

describe('año del calendario', () => {
  it('la partida empieza el 10 de septiembre del año 1 y el año cambia cada 1 de enero', () => {
    expect(fechaDelDia(0)).toMatchObject({ texto: '10 de septiembre', anio: 1, conAnio: '10 de septiembre del año 1' });
    const primeroDeEnero = 365 - DIAS_DE_ENERO_AL_INICIO_DEL_CURSO;
    expect(fechaDelDia(primeroDeEnero - 1)).toMatchObject({ texto: '31 de diciembre', anio: 1 });
    expect(fechaDelDia(primeroDeEnero)).toMatchObject({ texto: '1 de enero', anio: 2 });
    expect(anioDelCalendario(365)).toBe(2); // un año después, otro 10 de septiembre
    expect(anioDelCalendario(-1)).toBe(1);
    expect(anioDelCalendario(-DIAS_DE_ENERO_AL_INICIO_DEL_CURSO - 1)).toBe(0); // antes del 1 de enero del año 1: el pasado
  });
});
