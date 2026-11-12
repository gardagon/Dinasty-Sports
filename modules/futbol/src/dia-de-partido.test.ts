import { describe, expect, it } from 'vitest';
import { DIA_DE_PARTIDO, conocimientoPorVer, llegadaDelPNJ, partidoAnteriorEnElCampo } from './dia-de-partido';

describe('cómo llega un PNJ al día de partido', () => {
  const muchos = (disciplina: number, n = 3000) => Array.from({ length: n }, (_, i) => llegadaDelPNJ({ semilla: 7, npcId: `n${i}`, semana: 12, disciplina }));

  it('es estable (la misma semana y jugador, lo mismo) y cambia de una semana a otra', () => {
    const a = llegadaDelPNJ({ semilla: 7, npcId: 'n1', semana: 5, disciplina: 0.5 });
    expect(llegadaDelPNJ({ semilla: 7, npcId: 'n1', semana: 5, disciplina: 0.5 })).toEqual(a);
    const semanas = new Set(Array.from({ length: 60 }, (_, w) => llegadaDelPNJ({ semilla: 7, npcId: 'n1', semana: w, disciplina: 0.2 }).tarde));
    expect(semanas.size).toBeGreaterThan(3);
  });

  it('la mayoría llega puntual (hasta 8 minutos de retraso); algunos, tarde (de 11 a 30); muy pocos no se presentan; los disciplinados, menos', () => {
    const medio = muchos(0.5);
    const impuntuales = medio.filter((x) => !x.ausente && x.tarde > DIA_DE_PARTIDO.tolerancia);
    expect(impuntuales.length / medio.length).toBeGreaterThan(0.08);
    expect(impuntuales.length / medio.length).toBeLessThan(0.22);
    for (const x of impuntuales) expect(x.tarde).toBeLessThanOrEqual(30);
    for (const x of medio.filter((y) => !y.ausente && y.tarde <= DIA_DE_PARTIDO.tolerancia)) expect(x.tarde).toBeLessThanOrEqual(DIA_DE_PARTIDO.pnj.retrasoMaximoDeLosPuntuales);
    const faltan = medio.filter((x) => x.ausente).length / medio.length;
    expect(faltan).toBeGreaterThan(0.005);
    expect(faltan).toBeLessThan(0.05);
    // Con más disciplina, menos impuntuales y menos faltas; con menos, más.
    const cuenta = (xs: ReturnType<typeof muchos>) => xs.filter((x) => x.ausente || x.tarde > DIA_DE_PARTIDO.tolerancia).length;
    expect(cuenta(muchos(1))).toBeLessThan(cuenta(muchos(0.5)));
    expect(cuenta(muchos(0))).toBeGreaterThan(cuenta(muchos(0.5)));
  });
});

describe('el partido anterior de un campo y lo que se aprende viéndolo', () => {
  const partidos: [number, number, string][] = [[5, 9, 'complejo:1'], [5, 11, 'complejo:1'], [5, 13, 'complejo:1'], [5, 9, 'complejo:2'], [6, 9, 'complejo:1']];
  const inicio = 70; // el lunes de la semana, en días

  it('es el de la franja anterior en el mismo campo y el mismo día (el primero de un campo no tiene anterior)', () => {
    expect(partidoAnteriorEnElCampo(partidos, [5, 13, 'complejo:1'], inicio)).toBe((inicio + 5) * 1440 + 11 * 60);
    expect(partidoAnteriorEnElCampo(partidos, [5, 11, 'complejo:1'], inicio)).toBe((inicio + 5) * 1440 + 9 * 60);
    expect(partidoAnteriorEnElCampo(partidos, [5, 9, 'complejo:1'], inicio)).toBeUndefined();
    expect(partidoAnteriorEnElCampo(partidos, [5, 11, 'complejo:2'], inicio)).toBe((inicio + 5) * 1440 + 9 * 60);
    expect(partidoAnteriorEnElCampo(partidos, [6, 11, 'complejo:1'], inicio)).toBe((inicio + 6) * 1440 + 9 * 60);
  });

  it('da conocimiento en proporción a lo que ve entre que llega y se abre el vestuario: llegando a la convocatoria ve lo que queda del partido anterior; llegando tarde, menos; llegando con él acabado, nada', () => {
    const anteriorDesde = 11 * 60; // el partido anterior empieza a las 11:00 y dura 90 minutos
    const saque = 13 * 60; // el nuestro, a las 13:00: convocatoria a las 12:00 y vestuario a las 12:30
    // Llega a las 12:00: ve de 12:00 a 12:30 (30 minutos: el vestuario se abre a las 12:30).
    expect(conocimientoPorVer({ anteriorDesde, ahora: saque - 60, saque })).toBeCloseTo(DIA_DE_PARTIDO.conocimientoPorPartidoVisto * (30 / 90), 5);
    // Llega a las 12:20: ve 10 minutos.
    expect(conocimientoPorVer({ anteriorDesde, ahora: saque - 40, saque })).toBeCloseTo(DIA_DE_PARTIDO.conocimientoPorPartidoVisto * (10 / 90), 5);
    // Llega con el vestuario ya abierto: no ve nada.
    expect(conocimientoPorVer({ anteriorDesde, ahora: saque - 30, saque })).toBe(0);
    // Con el partido anterior más temprano (que ya acabó cuando llega), nada; con uno que empieza más tarde, ve todo lo que dura hasta el vestuario.
    expect(conocimientoPorVer({ anteriorDesde: 9 * 60, ahora: saque - 60, saque })).toBe(0);
    expect(conocimientoPorVer({ anteriorDesde: 11 * 60 + 30, ahora: saque - 60, saque })).toBeCloseTo(DIA_DE_PARTIDO.conocimientoPorPartidoVisto * (30 / 90), 5);
  });
});
