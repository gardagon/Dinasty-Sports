import { describe, expect, it } from 'vitest';
import { CALENDARIO_ESPANA, MINUTES_PER_DAY, START_MINUTE, anioNatural, edadDeCompeticion, primerDiaDelAnio, timeView } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { nuevaPartida } from '@ds/game';

/** Vista del calendario en un día (a las 10:00) de una semana del primer curso. */
const enSemana = (semana: number, weekday = 0) => timeView((semana * 7 + weekday) * MINUTES_PER_DAY + 10 * 60);

describe('calendario escolar (España)', () => {
  it('la partida empieza un lunes a las 7:00, primer día del curso', () => {
    const t = timeView(START_MINUTE);
    expect(t.weekday).toBe(0);
    expect(t.hour).toBe(7);
    expect(t.schoolYear).toBe(0);
    expect(t.schoolWeek).toBe(0);
    expect(t.period).toBe('clase');
    expect(t.term).toBe(1);
    expect(t.isSchoolDay).toBe(true);
  });

  it('reparte el curso: trimestres, Navidad, Semana Santa y verano', () => {
    const periodo = (s: number) => `${enSemana(s).period}/${enSemana(s).term}`;
    expect(periodo(0)).toBe('clase/1');
    expect(periodo(14)).toBe('clase/1');
    expect(periodo(15)).toBe('navidad/0');
    expect(periodo(16)).toBe('navidad/0');
    expect(periodo(17)).toBe('clase/2');
    expect(periodo(28)).toBe('clase/2');
    expect(periodo(29)).toBe('semana_santa/0');
    expect(periodo(30)).toBe('clase/3');
    expect(periodo(40)).toBe('clase/3');
    expect(periodo(41)).toBe('verano/0');
    expect(periodo(51)).toBe('verano/0');
  });

  it('hay 38 semanas lectivas: 15 + 12 + 11', () => {
    const lectivas = [1, 2, 3].map(
      (trim) => Array.from({ length: 52 }, (_, s) => enSemana(s)).filter((t) => t.term === trim).length,
    );
    expect(lectivas).toEqual([15, 12, 11]);
  });

  it('no hay clase en fin de semana ni en vacaciones', () => {
    expect(enSemana(3, 4).isSchoolDay).toBe(true); // viernes lectivo
    expect(enSemana(3, 5).isSchoolDay).toBe(false); // sábado
    expect(enSemana(15, 2).isSchoolDay).toBe(false); // Navidad
    expect(enSemana(29, 1).isSchoolDay).toBe(false); // Semana Santa
    expect(enSemana(45, 3).isSchoolDay).toBe(false); // verano
  });

  it('el curso siguiente empieza tras las 52 semanas y se repite', () => {
    const t = enSemana(52);
    expect(t.schoolYear).toBe(1);
    expect(t.schoolWeek).toBe(0);
    expect(t.period).toBe('clase');
    expect(enSemana(52 + 15).period).toBe('navidad');
  });

  it('las evaluaciones cierran cada trimestre', () => {
    expect(CALENDARIO_ESPANA.evaluaciones).toEqual([14, 28, 40]);
    expect(enSemana(14).isEvaluationWeek).toBe(true);
    expect(enSemana(13).isEvaluationWeek).toBe(false);
  });

  it('en vacaciones no hay clase y se anuncia el motivo', () => {
    const g = nuevaPartida({ seed: 1 });
    advanceToWeek(g, 'gen.descansar', 15, 1, 8);
    const clase = g.preview('estudios.clase')!;
    expect(clase.available).toBe(false);
    expect(clase.reason).toMatch(/Navidad/);
  });

  it('al acabar cada trimestre hay una evaluación con nota media', () => {
    const g = nuevaPartida({ seed: 1 });
    advanceToWeek(g, 'gen.descansar', 15, 0, 9);
    expect(g.log.some((l) => /Evaluación del 1\.º trimestre: nota media/.test(l.text))).toBe(true);
    // Los controles de los viernes solo existen en semanas lectivas: ninguno durante Navidad.
    const controles = g.log.filter((l) => /Controles del viernes/.test(l.text)).length;
    expect(controles).toBe(15);
  });

  describe('año de nacimiento y edad de competición', () => {
    it('el año natural cambia a primeros de enero, unos 113 días después de empezar el curso', () => {
      expect(anioNatural(0)).toBe(0);
      expect(anioNatural(primerDiaDelAnio(1) - 1)).toBe(0); // 31 de diciembre
      expect(anioNatural(primerDiaDelAnio(1))).toBe(1); // 1 de enero
      expect(primerDiaDelAnio(1)).toBe(113);
      expect(anioNatural(-1000)).toBe(-3);
    });

    it('dos nacidos el mismo año tienen la misma edad de competición aunque cumplan años en días distintos', () => {
      const inicioCurso = 0;
      const enero = primerDiaDelAnio(-8) + 3; // nace el 4 de enero del año -8
      const diciembre = primerDiaDelAnio(-7) - 2; // nace el 30 de diciembre del año -8
      expect(edadDeCompeticion(enero, inicioCurso)).toBe(8);
      expect(edadDeCompeticion(diciembre, inicioCurso)).toBe(8);
    });

    it('un día de diferencia en Nochevieja separa dos categorías', () => {
      const nocheVieja = primerDiaDelAnio(-8) - 1; // 31 de diciembre del año -9
      const anoNuevo = primerDiaDelAnio(-8); // 1 de enero del año -8
      expect(edadDeCompeticion(nocheVieja, 0)).toBe(9);
      expect(edadDeCompeticion(anoNuevo, 0)).toBe(8);
    });

    it('la edad de competición no cambia durante el curso y sube un año al empezar el siguiente', () => {
      const nacimiento = primerDiaDelAnio(-8) + 200;
      expect(edadDeCompeticion(nacimiento, 0)).toBe(8);
      expect(edadDeCompeticion(nacimiento, 364)).toBe(9);
      expect(edadDeCompeticion(nacimiento, 728)).toBe(10);
    });
  });
});
