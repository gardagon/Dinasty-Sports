import { describe, expect, it } from 'vitest';
import { CIUDAD_ACTUAL, CIUDAD_DE_PRUEBA, ID_PAIS_CIUDAD_DE_PRUEBA, PAIS_CIUDAD_DE_PRUEBA, PAIS_ESPANA, conCiudadDePrueba, idsDeColegiosDeFuera, registrarPais, validarPais } from '@ds/contracts';
import { nuevaPartida } from '@ds/game';
import type { Npc, NpcsState } from '@ds/mod-npcs';

/**
 * La ciudad como datos (`CIUDAD_Y_LIGAS.md` §10, paso 1): cuántos colegios, clases y vecinos hay es un dato del paquete de país. Con los valores de ahora no cambia nada; la
 * ciudad pequeña de prueba hace los mismos papeles con una quinta parte de la gente, para los tests que crean muchas partidas.
 */

registrarPais(PAIS_CIUDAD_DE_PRUEBA);
const gente = (g: ReturnType<typeof nuevaPartida>): Npc[] => (g.moduleState<NpcsState>('npcs') as NpcsState).npcs;

describe('la ciudad como datos', () => {
  it('España trae la ciudad de ahora: 4 colegios de fuera, 2 clases de 25 por curso, 17 alumnos por curso en cada colegio de fuera y 80 vecinos', () => {
    expect(PAIS_ESPANA.ciudad).toBeUndefined(); // sin ciudad propia usa la de ahora
    expect(CIUDAD_ACTUAL).toEqual({ colegiosDeFuera: 4, aulasPorCurso: 2, alumnosPorAula: 25, alumnosPorCursoDeCadaColegio: 17, vecinos: 80 });
    expect(idsDeColegiosDeFuera(CIUDAD_ACTUAL)).toEqual(['colegio1', 'colegio2', 'colegio3', 'colegio4']);
    const g = nuevaPartida({ seed: 31 });
    const npcs = gente(g);
    expect(npcs.filter((n) => n.id.startsWith('vecino_')).length).toBe(80);
    expect(new Set(npcs.filter((n) => n.colegio?.startsWith('colegio')).map((n) => n.colegio)).size).toBe(4);
    expect(npcs.filter((n) => n.tipos?.some((t) => t.tipo === 'alumno') && n.nacimiento !== undefined).length).toBeGreaterThan(450); // 9 cursos de 50 + los de 8 años
  });

  it('la ciudad pequeña de prueba tiene los mismos datos que España y mucha menos gente', () => {
    expect(PAIS_CIUDAD_DE_PRUEBA.ciudad).toEqual(CIUDAD_DE_PRUEBA);
    expect(PAIS_CIUDAD_DE_PRUEBA.demografia).toEqual(PAIS_ESPANA.demografia);
    expect(PAIS_CIUDAD_DE_PRUEBA.cursos).toEqual(PAIS_ESPANA.cursos);
    const grande = gente(nuevaPartida({ seed: 31 })).length;
    const pequena = gente(nuevaPartida({ seed: 31, pais: ID_PAIS_CIUDAD_DE_PRUEBA })).length;
    expect(pequena).toBeLessThan(grande / 3);
    expect(new Set(gente(nuevaPartida({ seed: 31, pais: ID_PAIS_CIUDAD_DE_PRUEBA })).filter((n) => n.colegio?.startsWith('colegio')).map((n) => n.colegio)).size).toBe(2);
  });

  it('en la ciudad pequeña el personaje tiene su clase (con sus compañeros) y la partida funciona', () => {
    const g = nuevaPartida({ seed: 7, pais: ID_PAIS_CIUDAD_DE_PRUEBA });
    const companeros = gente(g).filter((n) => n.role === 'companero' && n.tipos?.some((t) => t.tipo === 'alumno' && t.tuClase));
    expect(companeros.length).toBeGreaterThanOrEqual(CIUDAD_DE_PRUEBA.alumnosPorAula - 2);
    for (let i = 0; i < 5; i++) expect(g.perform('gen.esperar').ok).toBe(true);
  });

  it('un paquete de país valida su ciudad', () => {
    expect(validarPais(PAIS_CIUDAD_DE_PRUEBA)).toEqual([]);
    expect(validarPais(conCiudadDePrueba(PAIS_ESPANA))).toEqual([]);
    expect(validarPais({ ...PAIS_ESPANA, ciudad: { ...CIUDAD_ACTUAL, colegiosDeFuera: 0 } }).join()).toMatch(/ciudad\.colegiosDeFuera/);
    expect(validarPais({ ...PAIS_ESPANA, ciudad: { ...CIUDAD_ACTUAL, alumnosPorAula: 1.5 } }).join()).toMatch(/ciudad\.alumnosPorAula/);
  });
});
