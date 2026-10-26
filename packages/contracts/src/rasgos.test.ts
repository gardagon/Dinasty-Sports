import { describe, expect, it } from 'vitest';
import {
  CARA, DISTINTIVOS, EJES, INTERESES, OJOS, ORIGENES, PELO_COLOR, PELO_TIPO, PIEL,
  aparienciaAlAzar, aparienciaHeredada, atraccion, nombreSegunEdad, caracterAlAzar, caracterHeredado, compatibilidad, describirApariencia, describirCaracter,
  describirOrigen, factorDeCompatibilidad, gustosAlAzar, interesesAlAzar, interesesDe, interesesHeredados, origenAlAzar, origenHeredado,
  perfilHeredado, rasgosAlAzar,
  rasgosHeredadosNpc, type Apariencia,
} from './rasgos';
import type { Rng } from './rng';

function rngDe(semilla: number): Rng {
  let s = semilla | 0 || 1;
  const next = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
  return {
    next,
    int: (a, b) => a + Math.floor(next() * (b - a + 1)),
    range: (a, b) => a + next() * (b - a),
    chance: (p) => next() < p,
    pick: (xs) => xs[Math.floor(next() * xs.length)],
    normal: () => {
      let t = 0;
      for (let i = 0; i < 12; i++) t += next();
      return t - 6;
    },
  };
}
const media = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
const frac = <T,>(xs: T[], f: (x: T) => boolean) => xs.filter(f).length / xs.length;

describe('carácter', () => {
  it('son ocho ejes, entre −50 y 50, con extremos raros', () => {
    expect(EJES).toHaveLength(8);
    const rng = rngDe(1);
    const cs = Array.from({ length: 4000 }, () => caracterAlAzar(rng));
    for (const c of cs) for (const e of EJES) expect(Math.abs(c[e.id])).toBeLessThanOrEqual(50);
    expect(frac(cs, (c) => Math.abs(c.sociabilidad) >= 40)).toBeLessThan(0.05);
    expect(Math.abs(media(cs.map((c) => c.sociabilidad)))).toBeLessThan(2);
  });

  it('el sesgo por papel mueve la media del eje', () => {
    const rng = rngDe(2);
    const cs = Array.from({ length: 2000 }, () => caracterAlAzar(rng, { disciplina: 15 }));
    expect(media(cs.map((c) => c.disciplina))).toBeGreaterThan(10);
  });

  it('el heredado se parece a los padres pero atenuado', () => {
    const rng = rngDe(3);
    const padre = Object.fromEntries(EJES.map((e) => [e.id, 40]));
    const madre = Object.fromEntries(EJES.map((e) => [e.id, -40]));
    const hs = Array.from({ length: 2000 }, () => caracterHeredado(padre, madre, rng));
    const v = hs.flatMap((h) => EJES.map((e) => h[e.id]));
    expect(frac(v, (x) => x > 10)).toBeGreaterThan(0.4);
    expect(frac(v, (x) => x < -10)).toBeGreaterThan(0.4);
    expect(frac(v, (x) => Math.abs(x) < 8)).toBeLessThan(0.1);
    expect(Math.max(...v.map(Math.abs))).toBeLessThanOrEqual(50);
  });

  it('se describe con sus extremos', () => {
    expect(describirCaracter({ disciplina: 30, sociabilidad: -25, optimismo: 3 })).toBe('disciplinado, solitario');
    expect(describirCaracter({})).toBe('equilibrado');
  });
});

describe('intereses', () => {
  it('un NPC tiene de 2 a 4, con intensidad de 1 a 3', () => {
    const rng = rngDe(4);
    for (let i = 0; i < 500; i++) {
      const r = interesesAlAzar(rng, ['deporte']);
      expect(Object.keys(r).length).toBeGreaterThanOrEqual(2);
      expect(Object.keys(r).length).toBeLessThanOrEqual(4);
      for (const v of Object.values(r)) expect([1, 2, 3]).toContain(v);
      for (const id of Object.keys(r)) expect(INTERESES.some((x) => x.id === id)).toBe(true);
    }
  });

  it('los preferidos de un papel salen con más frecuencia', () => {
    const rng = rngDe(5);
    const con = frac(Array.from({ length: 2000 }, () => interesesAlAzar(rng, ['estudio'])), (r) => 'estudio' in r);
    const sin = frac(Array.from({ length: 2000 }, () => interesesAlAzar(rng)), (r) => 'estudio' in r);
    expect(con).toBeGreaterThan(sin + 0.3);
  });

  it('el personaje hereda algunos de los de sus padres a un nivel bajo', () => {
    const rng = rngDe(6);
    for (let i = 0; i < 300; i++) {
      const r = interesesHeredados({ deporte: 3, lectura: 1 }, { musica: 2 }, rng);
      expect(Object.keys(r).length).toBeGreaterThanOrEqual(1);
      for (const v of Object.values(r)) expect(v).toBeLessThan(50);
    }
  });

  it('lo que hace alimenta intereses por etiquetas', () => {
    expect(interesesDe(['entrenamiento', 'atletismo']).sort()).toEqual(['atletismo', 'deporte']);
    expect(interesesDe(['estudio'])).toEqual(['estudio']);
    expect(interesesDe(['descanso'])).toEqual([]);
  });
});

describe('apariencia, origen y herencia', () => {
  it('los catálogos son de rasgos distintos y las tablas de origen alinean con ellos', () => {
    for (const o of ORIGENES) {
      expect(o.peloColor).toHaveLength(PELO_COLOR.length);
      expect(o.peloTipo).toHaveLength(PELO_TIPO.length);
      expect(o.ojos).toHaveLength(OJOS.length);
      expect(o.piel).toHaveLength(PIEL.length);
    }
    expect(ORIGENES.reduce((a, o) => a + o.frecuencia, 0)).toBeCloseTo(1, 6);
  });

  it('el origen del mundo es casi siempre España y a veces mezcla de dos', () => {
    const rng = rngDe(7);
    const os = Array.from({ length: 5000 }, () => origenAlAzar(rng));
    expect(frac(os, (o) => o.every((x) => x.id.startsWith('espana')))).toBeGreaterThan(0.65);
    expect(frac(os, (o) => o.length === 2)).toBeGreaterThan(0.03);
    for (const o of os) expect(o.reduce((a, x) => a + x.peso, 0)).toBeCloseTo(1, 6);
  });

  it('la apariencia al azar sigue la tendencia del origen y siempre es válida', () => {
    const rng = rngDe(8);
    const sur = Array.from({ length: 3000 }, () => aparienciaAlAzar(rng, [{ id: 'espana_sur', peso: 1 }]));
    const norte = Array.from({ length: 3000 }, () => aparienciaAlAzar(rng, [{ id: 'europa_norte', peso: 1 }]));
    expect(frac(norte, (a) => a.ojos === 'azul')).toBeGreaterThan(frac(sur, (a) => a.ojos === 'azul') + 0.2);
    expect(frac(sur, (a) => a.peloColor === 'negro')).toBeGreaterThan(frac(norte, (a) => a.peloColor === 'negro') + 0.2);
    for (const a of [...sur, ...norte]) {
      expect(PELO_COLOR as readonly string[]).toContain(a.peloColor);
      expect(PIEL as readonly string[]).toContain(a.piel);
      expect(CARA as readonly string[]).toContain(a.cara);
      for (const d of a.distintivos) expect(DISTINTIVOS as readonly string[]).toContain(d);
    }
  });

  const base: Apariencia = { peloColor: 'negro', peloTipo: 'liso', ojos: 'marron_oscuro', piel: 'media', cara: 'ovalada', distintivos: [] };

  it('los hijos se parecen a sus padres: cada rasgo viene de uno o es un intermedio', () => {
    const rng = rngDe(9);
    const padre: Apariencia = { ...base, peloColor: 'negro', piel: 'clara', cara: 'redonda', distintivos: ['pecas'] };
    const madre: Apariencia = { ...base, peloColor: 'rubio', piel: 'oscura', cara: 'cuadrada', distintivos: ['pecas'] };
    const hs = Array.from({ length: 4000 }, () => aparienciaHeredada(padre, madre, rng));
    expect(frac(hs, (h) => ['redonda', 'cuadrada'].includes(h.cara))).toBe(1);
    expect(frac(hs, (h) => h.piel === 'clara' || h.piel === 'oscura')).toBeGreaterThan(0.2);
    expect(frac(hs, (h) => ['media', 'oliva', 'morena'].includes(h.piel))).toBeGreaterThan(0.3);
    expect(frac(hs, (h) => h.distintivos.includes('pecas'))).toBeGreaterThan(0.65);
  });

  it('el pelo rojo es recesivo: solo con los dos padres suele salir', () => {
    const rng = rngDe(10);
    const rojo: Apariencia = { ...base, peloColor: 'pelirrojo' };
    const uno = frac(Array.from({ length: 4000 }, () => aparienciaHeredada(rojo, base, rng)), (h) => h.peloColor === 'pelirrojo');
    const dos = frac(Array.from({ length: 4000 }, () => aparienciaHeredada(rojo, rojo, rng)), (h) => h.peloColor === 'pelirrojo');
    const ninguno = frac(Array.from({ length: 4000 }, () => aparienciaHeredada(base, base, rng)), (h) => h.peloColor === 'pelirrojo');
    expect(dos).toBeGreaterThan(0.9);
    expect(uno).toBeLessThan(0.3);
    expect(ninguno).toBeLessThan(0.05);
  });

  it('el origen del hijo mezcla los de sus padres a partes iguales', () => {
    const o = origenHeredado([{ id: 'espana_sur', peso: 1 }], [{ id: 'magreb', peso: 1 }]);
    expect(o).toEqual([{ id: 'espana_sur', peso: 0.5 }, { id: 'magreb', peso: 0.5 }]);
    expect(origenHeredado([{ id: 'espana_sur', peso: 1 }], [{ id: 'espana_sur', peso: 1 }])).toEqual([{ id: 'espana_sur', peso: 1 }]);
    expect(describirOrigen(o)).toBe('España (sur) y Magreb');
  });

  it('se describe en español', () => {
    expect(describirApariencia({ ...base, distintivos: ['pecas', 'hoyuelos'] })).toBe('pelo negro liso, ojos marrones oscuros, piel media, cara ovalada, con pecas y hoyuelos');
  });
});

describe('gustos, compatibilidad y perfil', () => {
  it('los gustos son válidos y se puede calcular la atracción de 0 a 1', () => {
    const rng = rngDe(11);
    const a = aparienciaAlAzar(rng, [{ id: 'espana_centro', peso: 1 }]);
    for (let i = 0; i < 200; i++) {
      const g = gustosAlAzar(rng, a);
      const x = atraccion(g, aparienciaAlAzar(rng, [{ id: 'espana_centro', peso: 1 }]), caracterAlAzar(rng));
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
    }
  });

  it('quien coincide con los gustos atrae más', () => {
    const base: Apariencia = { peloColor: 'negro', peloTipo: 'liso', ojos: 'marron', piel: 'media', cara: 'ovalada', distintivos: [] };
    const gustos = { fisicos: { peloColor: ['negro'], ojos: ['marron'], piel: ['media'], cara: ['ovalada'] }, caracter: { sociabilidad: 30 } };
    expect(atraccion(gustos, base, { sociabilidad: 30 })).toBeGreaterThan(atraccion(gustos, { ...base, peloColor: 'rubio', ojos: 'azul', piel: 'clara', cara: 'cuadrada' }, { sociabilidad: -30 }));
  });

  it('la compatibilidad sube con los intereses en común y con el parecido de carácter, y siempre está entre ×0,7 y ×1,4', () => {
    const c0 = Object.fromEntries(EJES.map((e) => [e.id, 0]));
    const npc = { caracter: c0, intereses: { estudio: 3, lectura: 2 } };
    const sin = compatibilidad(npc, { caracter: c0, intereses: {} });
    const con = compatibilidad(npc, { caracter: c0, intereses: { estudio: 80, lectura: 80 } });
    const opuesto = compatibilidad(npc, { caracter: Object.fromEntries(EJES.map((e) => [e.id, 50])), intereses: { estudio: 80, lectura: 80 } });
    expect(con).toBeGreaterThan(sin + 0.4);
    expect(con).toBeGreaterThan(opuesto);
    for (const c of [sin, con, opuesto]) {
      expect(factorDeCompatibilidad(c)).toBeGreaterThanOrEqual(0.7);
      expect(factorDeCompatibilidad(c)).toBeLessThanOrEqual(1.4);
    }
    expect(factorDeCompatibilidad(con)).toBeGreaterThan(factorDeCompatibilidad(sin) + 0.3);
  });

  it('el perfil del personaje sale de los padres', () => {
    const rng = rngDe(12);
    const padre = rasgosAlAzar(rng);
    const madre = rasgosAlAzar(rng);
    const p = perfilHeredado(padre, madre, rng);
    expect(p.origen.reduce((a, x) => a + x.peso, 0)).toBeCloseTo(1, 6);
    expect([padre.apariencia.cara, madre.apariencia.cara]).toContain(p.apariencia.cara);
    expect(Object.keys(p.intereses).length).toBeGreaterThan(0);
  });
});

describe('rasgos de un hermano', () => {
  it('hereda de los dos padres: carácter atenuado, intereses de alguno de ellos y al menos dos', () => {
    const rng = rngDe(21);
    for (let i = 0; i < 100; i++) {
      const padre = rasgosAlAzar(rng);
      const madre = rasgosAlAzar(rng);
      const h = rasgosHeredadosNpc(padre, madre, rng);
      expect(Object.keys(h.caracter)).toHaveLength(8);
      expect(Object.keys(h.intereses).length).toBeGreaterThanOrEqual(2);
      for (const v of Object.values(h.intereses)) {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(3);
      }
    }
  });

  it('dos hermanos de los mismos padres se parecen más en carácter que dos desconocidos', () => {
    const rng = rngDe(33);
    let hermanos = 0;
    let desconocidos = 0;
    const N = 300;
    const distancia = (a: Record<string, number>, b: Record<string, number>) => Object.keys(a).reduce((s, k) => s + Math.abs(a[k] - b[k]), 0);
    for (let i = 0; i < N; i++) {
      const padre = rasgosAlAzar(rng);
      const madre = rasgosAlAzar(rng);
      const a = rasgosHeredadosNpc(padre, madre, rng);
      const b = rasgosHeredadosNpc(padre, madre, rng);
      hermanos += distancia(a.caracter, b.caracter);
      desconocidos += distancia(a.caracter, rasgosAlAzar(rng).caracter);
    }
    expect(hermanos / N).toBeLessThan(desconocidos / N);
  });
});

describe('cómo se llama a alguien según su edad', () => {
  it('niño, chico, hombre, señor y anciano (y sus femeninos) según los años', () => {
    const f = (e?: number) => nombreSegunEdad('f', e);
    const m = (e?: number) => nombreSegunEdad('m', e);
    expect([m(5), m(11)]).toEqual(['Un niño', 'Un niño']);
    expect([f(5), f(11)]).toEqual(['Una niña', 'Una niña']);
    expect([m(12), m(25)]).toEqual(['Un chico', 'Un chico']);
    expect([f(12), f(25)]).toEqual(['Una chica', 'Una chica']);
    expect([m(26), m(54)]).toEqual(['Un hombre', 'Un hombre']);
    expect([f(26), f(54)]).toEqual(['Una mujer', 'Una mujer']);
    expect([m(55), m(69)]).toEqual(['Un señor', 'Un señor']);
    expect([f(55), f(69)]).toEqual(['Una señora', 'Una señora']);
    expect([m(70), m(95)]).toEqual(['Un anciano', 'Un anciano']);
    expect([f(70), f(95)]).toEqual(['Una anciana', 'Una anciana']);
    expect([m(undefined), f(undefined)]).toEqual(['Un chico', 'Una chica']);
  });
});
