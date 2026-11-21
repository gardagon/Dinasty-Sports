import { describe, expect, it } from 'vitest';
import { PESOS_DE_PROBAR_FUERA, type CategoriaDef } from '@ds/contracts';
import { losQueSeQuedan, probabilidadBase, probabilidadConAmigos } from './probar-fuera';
import { type Npc } from './index';
import { type Aspirante } from './plantillas';

const cat = (probarFuera: number): CategoriaDef => ({ id: 'infantil', nombre: 'Infantil', edadMin: 12, edadMax: 13, probarFuera });
const nino = (i: number, colegio: string, ambicion = 0): Aspirante => ({
  npc: { id: `n${i}`, name: `n${i}`, role: 'companero', gender: 'm', tags: [], levels: {}, potential: {}, nacimiento: -Math.round((12 + (i % 2)) * 365), genetica: { semilla: i }, rasgos: { caracter: { ambicion } } } as unknown as Npc,
  colegio, interes: 1, potencial: 50, valor: i % 50,
});

describe('quién va a probar fuera (losQueSeQuedan)', () => {
  const todos = Array.from({ length: 1000 }, (_, i) => nino(i, i % 2 ? 'propio' : 'colegio9'));
  it('solo cuentan los colegios con club: los demás no se quedan en ninguno', () => {
    const q = losQueSeQuedan(todos, new Set(['propio']), cat(0.35), 0);
    expect([...q].every((id) => todos.find((a) => a.npc.id === id)!.colegio === 'propio')).toBe(true);
  });
  it('la proporción de los que prueban es la de la categoría (con tolerancia)', () => {
    for (const p of [0.15, 0.35, 0.55]) {
      const q = losQueSeQuedan(todos, new Set(['propio']), cat(p), 0);
      const prueban = 500 - q.size;
      expect(Math.abs(prueban / 500 - p)).toBeLessThan(0.07);
    }
  });
  it('es estable (mismo resultado) y cambia con la temporada', () => {
    const a = losQueSeQuedan(todos, new Set(['propio']), cat(0.35), 0);
    expect([...losQueSeQuedan(todos, new Set(['propio']), cat(0.35), 0)]).toEqual([...a]);
    expect([...losQueSeQuedan(todos, new Set(['propio']), cat(0.35), 365)]).not.toEqual([...a]);
  });
  it('el ambicioso prueba más que el conformista', () => {
    const lista = Array.from({ length: 1000 }, (_, i) => nino(i, 'propio', i % 2 ? 50 : -50));
    const q = losQueSeQuedan(lista, new Set(['propio']), cat(0.35), 0);
    const seQuedan = (par: number) => lista.filter((a, i) => i % 2 === par && q.has(a.npc.id)).length;
    expect(seQuedan(0)).toBeGreaterThan(seQuedan(1));
  });
});

describe('probabilidades', () => {
  it('la ambición sube la probabilidad y el nivel no la cambia; los amigos la bajan; hay techo', () => {
    expect(probabilidadBase(0.35, 1, 0)).toBeGreaterThan(probabilidadBase(0.35, 0, 0));
    expect(probabilidadBase(0.35, -1, 0)).toBeLessThan(probabilidadBase(0.35, 0, 0));
    expect(probabilidadBase(0.35, 0, 1)).toBe(probabilidadBase(0.35, 0, -1));
    expect(probabilidadBase(0.9, 1, 1)).toBeLessThanOrEqual(PESOS_DE_PROBAR_FUERA.techo);
    expect(probabilidadConAmigos(0.35, 0.35, 1)).toBeLessThan(probabilidadConAmigos(0.35, 0.35, 0.2));
    expect(probabilidadConAmigos(0.35, 0.35, 0.65)).toBeCloseTo(0.35, 5);
  });
});
