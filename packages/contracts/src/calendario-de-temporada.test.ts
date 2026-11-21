import { describe, expect, it } from 'vitest';
import { CALENDARIO_ESPANA, diaConFecha, situacionDeTemporada, type TemporadaDeDeporte } from './index';

const LIGA: TemporadaDeDeporte = { semanasDePretemporada: 4, liga: { vueltas: 2, equiposPorCategoria: { min: 6, max: 7 } } };
const hoy = (week: number, schoolWeek: number, period: 'clase' | 'navidad' | 'semana_santa' | 'verano' = 'clase') => ({ week, schoolWeek, period });
const liga = { competicion: { nombre: 'liga', articulo: 'la' }, diaDeJornada: 5 };

describe('situación de la temporada: tramo y cuándo empieza el siguiente', () => {
  it('el día se dice con su día de la semana y su fecha (el día 0 es el lunes 10 de septiembre)', () => {
    expect(diaConFecha(0)).toBe('el lunes 10 de septiembre');
    expect(diaConFecha(5)).toBe('el sábado 15 de septiembre');
  });

  it('pretemporada: dice cuándo empieza la liga (la primera semana de competición, el sábado)', () => {
    for (const w of [0, 2, 3]) expect(situacionDeTemporada(CALENDARIO_ESPANA, LIGA, hoy(w, w), liga)).toMatchObject({ tramo: 'pretemporada', texto: 'Pretemporada. La liga empieza el sábado 13 de octubre.', empieza: 'el sábado 13 de octubre' });
  });

  it('liga en marcha: dice cuándo empieza el verano; con la liga terminada, también', () => {
    const e = situacionDeTemporada(CALENDARIO_ESPANA, LIGA, hoy(6, 6), liga);
    expect(e.tramo).toBe('competicion');
    expect(e.texto).toMatch(/^Liga\. El verano empieza el lunes \d+ de [a-z]+\.$/);
    expect(e.texto).toContain(diaConFecha(41 * 7)); // el verano del calendario de España empieza en la semana 41
    const t = situacionDeTemporada(CALENDARIO_ESPANA, LIGA, hoy(20, 20), { ...liga, terminada: true });
    expect(t).toMatchObject({ tramo: 'terminada' });
    expect(t.texto).toMatch(/^Liga terminada\. El verano empieza/);
  });

  it('vacaciones en plena temporada: parada, y dice cuándo se reanuda', () => {
    const e = situacionDeTemporada(CALENDARIO_ESPANA, LIGA, hoy(15, 15, 'navidad'), liga);
    expect(e.tramo).toBe('parada');
    expect(e.texto).toBe(`Liga, parada por las vacaciones. Se reanuda ${diaConFecha(17 * 7 + 5)}.`); // la semana 17 es la primera de clase tras Navidad
  });

  it('verano: dice cuándo empieza la pretemporada y la liga del curso que viene', () => {
    const e = situacionDeTemporada(CALENDARIO_ESPANA, LIGA, hoy(45, 45, 'verano'), liga);
    expect(e.tramo).toBe('verano');
    expect(e.texto).toBe(`Verano. La pretemporada empieza ${diaConFecha(52 * 7)} y la liga empieza ${diaConFecha(56 * 7 + 5)}.`);
  });

  it('el mismo código vale para otro deporte con temporada: las carreras, en plural; y en el segundo curso las semanas son las del curso', () => {
    const carreras = { competicion: { nombre: 'carreras', articulo: 'las', plural: true }, diaDeJornada: 5 };
    const t = { semanasDePretemporada: 4 } as TemporadaDeDeporte;
    expect(situacionDeTemporada(CALENDARIO_ESPANA, t, hoy(2, 2), carreras).texto).toBe('Pretemporada. Las carreras empiezan el sábado 13 de octubre.');
    // Segundo curso: semana absoluta 52 + 2.
    expect(situacionDeTemporada(CALENDARIO_ESPANA, t, hoy(54, 2), carreras).primeraJornada.dia).toBe(56 * 7 + 5);
  });
});
