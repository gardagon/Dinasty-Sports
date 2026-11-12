import { afterEach, describe, expect, it, vi } from 'vitest';
import { PAIS_CIUDAD_DE_PRUEBA, PROGRESO_DE_CREACION, avisarDelProgreso, registrarPais } from '@ds/contracts';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';

vi.setConfig({ testTimeout: 240000, hookTimeout: 240000 });
registrarPais(PAIS_CIUDAD_DE_PRUEBA);
afterEach(() => {
  PROGRESO_DE_CREACION.alAvanzar = undefined;
});

/** La pantalla de «creando el mundo» (`apps/web`): crear la partida avisa de cada paso, de menos a más, para enseñar lo que se hace y cuánto se lleva. */
describe('crear la partida avisa de cómo va', () => {
  it('sin nadie escuchando no hace nada; con alguien, avisa de los pasos de la creación, que solo avanzan, y del último («Dejando listo el mundo…»)', () => {
    expect(() => avisarDelProgreso('nada', 0.5)).not.toThrow();
    const pasos: { texto: string; fraccion: number }[] = [];
    PROGRESO_DE_CREACION.alAvanzar = (texto, fraccion) => pasos.push({ texto, fraccion });
    nuevaPartida({ seed: 31, pais: PAIS_CIUDAD_DE_PRUEBA.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    expect(new Set(pasos.map((p) => p.texto)).size).toBeGreaterThanOrEqual(6);
    expect(pasos[0].texto).toMatch(/Dando vida a las personas/);
    expect(pasos[pasos.length - 1].texto).toBe('Dejando listo el mundo…');
    for (let i = 1; i < pasos.length; i++) expect(pasos[i].fraccion).toBeGreaterThanOrEqual(pasos[i - 1].fraccion - 1e-9);
    expect(pasos.every((p) => p.fraccion >= 0 && p.fraccion <= 1)).toBe(true);
    // Incluye el avance por personas de la historia deportiva y el reparto por categorías del fútbol.
    expect(pasos.some((p) => /historia deportiva… \(/.test(p.texto))).toBe(true);
    expect(pasos.some((p) => /clubes y sus equipos \(/.test(p.texto))).toBe(true);
  });

  it('el avisador acota la fracción entre 0 y 1', () => {
    const vistos: number[] = [];
    PROGRESO_DE_CREACION.alAvanzar = (_t, f) => vistos.push(f);
    avisarDelProgreso('a', -3);
    avisarDelProgreso('b', 7);
    expect(vistos).toEqual([0, 1]);
  });
});
