import { describe, expect, it } from 'vitest';
import { GEN } from './tags';
import { MAX_PERKS_ACTIVOS, PERKS, efectosDe, eficienciaDePerks, heredarPerks, perk, perksDePadre, type PerksDe } from './perks';
import type { Rng } from './rng';

/** Generador determinista mínimo para las pruebas (xorshift). */
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

describe('catálogo de perks', () => {
  it('tiene 28 perks con ids distintos (13 pares de opuestos, Ambidiestro y Mano de palo)', () => {
    expect(PERKS).toHaveLength(28);
    expect(new Set(PERKS.map((x) => x.id)).size).toBe(28);
  });

  it('los opuestos son simétricos y existen', () => {
    for (const x of PERKS) {
      expect(x.opuesto).toBeDefined();
      expect(perk(x.opuesto!)?.opuesto).toBe(x.id);
    }
  });

  it('los efectos sobre topes apuntan a capacidades que existen', () => {
    const validas = new Set<string>(Object.values(GEN));
    for (const x of PERKS) for (const stat of Object.keys(x.efectos.tope ?? {})) expect(validas.has(stat)).toBe(true);
  });

  it('los excepcionales son más raros', () => {
    expect(perk('ambidiestro')!.rareza).toBeLessThan(1);
    expect(perk('mano_de_palo')!.rareza).toBeLessThan(1);
  });

  it('los efectos se suman y las eficiencias se multiplican por etiquetas', () => {
    expect(efectosDe(['zancada_larga', 'constitucion_de_toro'])).toEqual({ tope: { [GEN.velocidad]: 5, [GEN.constitucion]: 8 }, alturaCm: 0 });
    expect(efectosDe(['gigante']).alturaCm).toBe(10);
    expect(eficienciaDePerks(['sangre_fria'], ['competicion']).factor).toBeCloseTo(1.08);
    expect(eficienciaDePerks(['sangre_fria'], ['entrenamiento']).factor).toBe(1);
    expect(eficienciaDePerks(['memoria_motora_fotografica', 'sangre_fria'], ['entrenamiento', 'competicion']).factor).toBeCloseTo(1.1 * 1.08);
  });
});

describe('herencia de perks', () => {
  const vacio: PerksDe = { activos: [], pool: [] };
  const hijos = (n: number, padres?: () => [PerksDe, PerksDe]) => {
    const rng = rngDe(99);
    return Array.from({ length: n }, () => {
      const [a, b] = padres ? padres() : [perksDePadre(rng), perksDePadre(rng)];
      return heredarPerks(a, b, rng);
    });
  };

  it('nunca hay más de 3 activos ni un perk con su opuesto', () => {
    for (const h of hijos(5000)) {
      expect(h.activos.length).toBeLessThanOrEqual(MAX_PERKS_ACTIVOS);
      for (const id of h.activos) expect(h.activos).not.toContain(perk(id)!.opuesto);
      expect(new Set([...h.activos, ...h.pool]).size).toBe(h.activos.length + h.pool.length);
    }
  });

  it('lo normal es tener 0 o 1 perk; tener 3 es raro', () => {
    const n = hijos(20000).map((h) => h.activos.length);
    const frac = (k: number) => n.filter((x) => x === k).length / n.length;
    expect(frac(0) + frac(1)).toBeGreaterThan(0.8);
    expect(frac(0)).toBeGreaterThan(0.35);
    expect(frac(3)).toBeLessThan(0.05);
    expect(media(n)).toBeLessThan(1.1);
    expect(media(n)).toBeGreaterThan(0.4);
  });

  it('los padres de la generación 0 también tienen pocos', () => {
    const rng = rngDe(5);
    const n = Array.from({ length: 5000 }, () => perksDePadre(rng).activos.length);
    expect(media(n)).toBeLessThan(0.9);
    expect(n.filter((x) => x === 3).length / n.length).toBeLessThan(0.03);
  });

  it('un perk de los padres se hereda con probabilidad, venga del padre o de la madre', () => {
    const delPadre = hijos(20000, () => [{ activos: ['fibroso'], pool: [] }, vacio]).filter((h) => h.activos.includes('fibroso')).length / 20000;
    const delaMadre = hijos(20000, () => [vacio, { activos: ['fibroso'], pool: [] }]).filter((h) => h.activos.includes('fibroso')).length / 20000;
    expect(delPadre).toBeGreaterThan(0.33);
    expect(delPadre).toBeLessThan(0.47);
    expect(Math.abs(delPadre - delaMadre)).toBeLessThan(0.03);
  });

  it('si los dos padres lo tienen es más probable', () => {
    const uno = hijos(20000, () => [{ activos: ['fibroso'], pool: [] }, vacio]).filter((h) => h.activos.includes('fibroso')).length / 20000;
    const dos = hijos(20000, () => [{ activos: ['fibroso'], pool: [] }, { activos: ['fibroso'], pool: [] }]).filter((h) => h.activos.includes('fibroso')).length / 20000;
    expect(dos).toBeGreaterThan(uno + 0.15);
  });

  it('un perk en el pool de un padre se hereda menos (salto de generación)', () => {
    const activo = hijos(20000, () => [{ activos: ['fibroso'], pool: [] }, vacio]).filter((h) => h.activos.includes('fibroso')).length / 20000;
    const pool = hijos(20000, () => [{ activos: [], pool: ['fibroso'] }, vacio]).filter((h) => h.activos.includes('fibroso')).length / 20000;
    expect(pool).toBeGreaterThan(0.12);
    expect(pool).toBeLessThan(activo - 0.1);
  });

  it('puede aparecer un perk que ningún padre tiene, pero casi nunca', () => {
    const f = hijos(30000, () => [vacio, vacio]).filter((h) => h.activos.length > 0).length / 30000;
    expect(f).toBeGreaterThan(0.1);
    expect(f).toBeLessThan(0.4);
  });

  it('lo que los padres tenían y el hijo no activa pasa a su pool', () => {
    const rng = rngDe(3);
    const h = heredarPerks({ activos: ['fibroso', 'gigante'], pool: ['sangre_fria'] }, { activos: ['asmatico'], pool: [] }, rng);
    for (const id of ['fibroso', 'gigante', 'sangre_fria', 'asmatico']) expect([...h.activos, ...h.pool]).toContain(id);
  });

  it('con más de tres, los que sobran van al pool del hijo', () => {
    const rng = rngDe(1);
    const muchos: PerksDe = { activos: ['fibroso', 'gigante', 'sangre_fria'], pool: ['zancada_larga', 'pulmones_grandes'] };
    for (let i = 0; i < 300; i++) {
      const h = heredarPerks(muchos, muchos, rng);
      expect(h.activos.length).toBeLessThanOrEqual(3);
    }
  });
});
