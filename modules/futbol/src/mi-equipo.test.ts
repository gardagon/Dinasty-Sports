import { describe, expect, it } from 'vitest';
import { PARAMETROS_DE_PERCEPCION as P, juicioDe, recordarSoloLosUltimos, ruidoDeLaVista, textoDelJuicio, verDeNuevo, type Impresion } from './mi-equipo';
import { GRUPOS_DE_HABILIDADES, HABILIDADES_DE_FUTBOL, CONOCIMIENTO } from './habilidades';

const ver = (previa: Impresion | undefined, o: Partial<Parameters<typeof verDeNuevo>[1]> = {}) =>
  verDeNuevo(previa, { id: 'npc1', puesto: 'CB', mio: 50, suyo: 50, conocimiento: 0, dia: 10, semana: 2, ...o });

describe('la impresión de un compañero («Mi equipo»)', () => {
  it('el error es menor cuanto más sabe de fútbol', () => {
    expect(ruidoDeLaVista(0)).toBe(P.ruido.sinConocimiento);
    expect(ruidoDeLaVista(1)).toBe(P.ruido.conTodo);
    expect(ruidoDeLaVista(0.5)).toBeLessThan(ruidoDeLaVista(0));
  });

  it('es determinista por compañero y día, y cambia de un día a otro', () => {
    expect(ver(undefined)).toEqual(ver(undefined));
    expect(ver(undefined, { dia: 11 })[1] === ver(undefined)[1] && ver(undefined, { dia: 12 })[1] === ver(undefined)[1]).toBe(false);
  });

  it('guarda el puesto visto, las veces y la semana', () => {
    const a = ver(undefined, { puesto: 'ST', semana: 5 });
    expect([a[0], a[2], a[3]]).toEqual(['ST', 1, 5]);
    const b = ver(a, { puesto: 'LB', semana: 7, dia: 30 });
    expect([b[0], b[2], b[3]]).toEqual(['LB', 2, 7]);
  });

  it('con mucha diferencia se ve «mejor» o «peor»; con poca (o con error pequeño y diferencia nula), «parecido»', () => {
    const sin = { conocimiento: 1 };
    expect(juicioDe(ver(undefined, { ...sin, mio: 70, suyo: 40 }))).toBe('mejor');
    expect(juicioDe(ver(undefined, { ...sin, mio: 30, suyo: 60 }))).toBe('peor');
    expect(juicioDe(ver(undefined, { ...sin, mio: 50, suyo: 50 }))).toBe('parecido');
    expect(juicioDe(['CB', P.parecido, 1, 0])).toBe('mejor');
    expect(juicioDe(['CB', P.parecido - 1, 1, 0])).toBe('parecido');
    expect(juicioDe(['CB', -P.parecido, 1, 0])).toBe('peor');
  });

  it('con más veces se afina: la media se acerca a la diferencia real y el error baja', () => {
    const real = 12;
    let i: Impresion | undefined;
    const errores: number[] = [];
    for (let d = 0; d < 40; d++) {
      i = ver(i, { mio: 50 + real, suyo: 50, dia: d, semana: d });
      errores.push(Math.abs(i[1] - real));
    }
    expect(i![2]).toBe(P.veces);
    const media = (xs: number[]) => xs.reduce((t, x) => t + x, 0) / xs.length;
    expect(media(errores.slice(-20))).toBeLessThan(media(Array.from({ length: 200 }, (_, d) => Math.abs(ver(undefined, { mio: 50 + real, suyo: 50, dia: d })[1] - real))));
  });

  it('los textos no llevan números y concuerdan con el género', () => {
    expect(textoDelJuicio('mejor', 'm')).toBe('Crees que eres mejor que él.');
    expect(textoDelJuicio('peor', 'f')).toBe('Crees que eres peor que ella.');
    expect(textoDelJuicio('parecido', 'f')).not.toMatch(/\d/);
  });

  it('el guardado no crece: solo se recuerdan los últimos vistos', () => {
    const muchos: Record<string, Impresion> = Object.fromEntries(Array.from({ length: P.guardados + 25 }, (_, k) => [`n${k}`, ['GK', 0, 1, k] as Impresion]));
    const r = recordarSoloLosUltimos(muchos);
    expect(Object.keys(r)).toHaveLength(P.guardados);
    expect(r[`n${P.guardados + 24}`]).toBeDefined();
    expect(r.n0).toBeUndefined();
    expect(JSON.stringify(r).length).toBeLessThan(4000);
  });
});

describe('habilidades agrupadas (dato del deporte)', () => {
  it('portería, físico, mental y técnico, en ese orden, y el conocimiento aparte; cada habilidad en un solo grupo', () => {
    expect(GRUPOS_DE_HABILIDADES.map((g) => g.titulo)).toEqual(['Portería', 'Físico', 'Mental', 'Técnico', 'Conocimiento']);
    const todas = GRUPOS_DE_HABILIDADES.flatMap((g) => g.habilidades);
    expect(new Set(todas).size).toBe(todas.length);
    expect([...todas].sort()).toEqual([...HABILIDADES_DE_FUTBOL, CONOCIMIENTO].sort());
    expect(GRUPOS_DE_HABILIDADES[0].habilidades).toContain('futbol.reflejos');
    expect(GRUPOS_DE_HABILIDADES[1].habilidades).toContain('futbol.arrancada');
    expect(GRUPOS_DE_HABILIDADES[2].habilidades).toContain('futbol.juego_colectivo');
    expect(GRUPOS_DE_HABILIDADES[3].habilidades).toContain('futbol.pase');
  });
});
