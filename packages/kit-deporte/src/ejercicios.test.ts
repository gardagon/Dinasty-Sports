import { describe, expect, it } from 'vitest';
import { elegirEjercicios, listaDeEjercicios, type Ejercicio } from './ejercicios';

const e = (id: string, foco: string, ...entrena: [string, number][]): Ejercicio => ({ id, nombre: id, foco, entrena: entrena.map(([stat, amount]) => ({ stat, amount })) });
const CATALOGO: Ejercicio[] = [
  e('rondos', 'tecnica', ['pase', 3]),
  e('regate', 'tecnica', ['regate', 3]),
  e('tiro', 'ataque', ['tiro', 3]),
  e('marcaje', 'defensa', ['marcaje', 3]),
  { ...e('porteros', 'porteros', ['reflejos', 3]), soloPuesto: 'portero' },
];
const sin = (niveles: Record<string, number>) => (stat: string) => niveles[stat] ?? 50;

describe('elegir los ejercicios de la sesión', () => {
  it('elige los que más le faltan al jugador, de tipos distintos', () => {
    const r = elegirEjercicios(CATALOGO, { nivel: sin({ pase: 90, regate: 90, tiro: 5, marcaje: 20 }), semilla: ['a', 1] });
    expect(r.map((x) => x.id).sort()).toEqual(['marcaje', 'tiro']);
    // Dos ejercicios del mismo tipo (técnica) no se repiten aunque ambos falten.
    const t = elegirEjercicios(CATALOGO, { nivel: sin({ pase: 0, regate: 0, tiro: 100, marcaje: 100 }), semilla: ['a', 1] });
    expect(new Set(t.map((x) => x.foco)).size).toBe(t.length);
    expect(t).toHaveLength(2);
  });

  it('es una función pura: los mismos datos dan la misma elección; otro día puede tocar otra cosa', () => {
    const c = { nivel: sin({}), semilla: ['club', 10] };
    expect(elegirEjercicios(CATALOGO, c)).toEqual(elegirEjercicios(CATALOGO, c));
    const dias = new Set(Array.from({ length: 30 }, (_, d) => elegirEjercicios(CATALOGO, { nivel: sin({}), semilla: ['club', d] }).map((x) => x.id).join()));
    expect(dias.size).toBeGreaterThan(2);
  });

  it('los de un puesto solo salen para quien juega en él', () => {
    const portero = { nivel: sin({ reflejos: 0, pase: 100, regate: 100, tiro: 100, marcaje: 100 }) };
    const dias = Array.from({ length: 10 }, (_, d) => d);
    expect(dias.every((d) => !elegirEjercicios(CATALOGO, { ...portero, semilla: ['x', d] }).some((x) => x.id === 'porteros'))).toBe(true);
    expect(dias.every((d) => elegirEjercicios(CATALOGO, { ...portero, puesto: 'portero', semilla: ['x', d] }).some((x) => x.id === 'porteros'))).toBe(true);
  });

  it('la importancia en el puesto y el carácter del entrenador inclinan la elección', () => {
    const base = { nivel: sin({}), semilla: ['k', 1] };
    const defensa = (importancia?: (s: string) => number, sesgo?: Record<string, number>) =>
      Array.from({ length: 40 }, (_, d) => elegirEjercicios(CATALOGO, { ...base, importancia, sesgo, semilla: ['k', d] })).filter((r) => r.some((x) => x.id === 'marcaje')).length;
    const neutro = defensa();
    expect(defensa((s) => (s === 'marcaje' ? 3 : 1))).toBeGreaterThan(neutro);
    expect(defensa(undefined, { defensa: 1.2, tecnica: 0.8 })).toBeGreaterThan(neutro);
  });

  it('cuenta cuántos: por defecto 2, y la lista se lee bien', () => {
    expect(elegirEjercicios(CATALOGO, { nivel: sin({}), semilla: [1] })).toHaveLength(2);
    expect(elegirEjercicios(CATALOGO, { nivel: sin({}), semilla: [1], cuantos: 3 })).toHaveLength(3);
    expect(listaDeEjercicios([CATALOGO[0], CATALOGO[2]])).toBe('rondos y tiro');
    expect(listaDeEjercicios([CATALOGO[0], CATALOGO[2], CATALOGO[3]])).toBe('rondos, tiro y marcaje');
  });
});
