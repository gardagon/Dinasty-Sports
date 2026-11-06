import { describe, expect, it } from 'vitest';
import { CIUDAD_ACTUAL, CIUDAD_DE_PRUEBA, clubesDeLaZona, conClubesDeLaCiudad, personasDeLaCiudad, ID_PAIS_CIUDAD_DE_PRUEBA, PAIS_CIUDAD_DE_PRUEBA, PAIS_ESPANA, conCiudadDePrueba, idsDeColegiosDeFuera, registrarPais, validarPais } from '@ds/contracts';
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

describe('el número de clubes, en proporción a la población (dato de la ciudad)', () => {
  const x = (k: number) => ({ ...CIUDAD_ACTUAL, colegiosDeFuera: CIUDAD_ACTUAL.colegiosDeFuera * k, aulasPorCurso: CIUDAD_ACTUAL.aulasPorCurso * k, vecinos: CIUDAD_ACTUAL.vecinos * k });

  it('con la población de ahora (unas 1.450 personas) salen 2 clubes; con la mitad, 1; con tres veces más, 6; con cinco veces más, 11; y se puede cambiar con `personasPorClub`', () => {
    expect(personasDeLaCiudad(CIUDAD_ACTUAL)).toBeGreaterThan(1300);
    expect(clubesDeLaZona(CIUDAD_ACTUAL)).toBe(2);
    expect(clubesDeLaZona(CIUDAD_DE_PRUEBA)).toBe(1);
    expect(clubesDeLaZona(x(3))).toBe(6);
    expect(clubesDeLaZona(x(5))).toBe(11);
    expect(clubesDeLaZona({ ...CIUDAD_ACTUAL, personasPorClub: 480 })).toBe(3);
  });

  it('los clubes del catálogo (grande, mediano, pequeño) son los modelos: con 2 salen el grande y el mediano; con 3, los tres; con 11, un grande, tres medianos y siete pequeños, con otro id y otro nombre, y el del colegio siempre', async () => {
    const { DATOS_FUTBOL } = await import('@ds/mod-futbol');
    const datos = DATOS_FUTBOL.paises.espana;
    const ids = (k: number) => conClubesDeLaCiudad(datos, x(k)).poblacion.equipos.map((e) => e.club);
    expect(ids(1)).toEqual(expect.arrayContaining(['colegio', 'club_grande', 'club_mediano']));
    expect(ids(1)).not.toContain('club_pequeno');
    expect(conClubesDeLaCiudad(datos, { ...CIUDAD_ACTUAL, personasPorClub: 480 }).poblacion.equipos.map((e) => e.club)).toEqual(expect.arrayContaining(['club_grande', 'club_mediano', 'club_pequeno']));
    const once = conClubesDeLaCiudad(datos, x(5));
    const fuera = once.poblacion.equipos.filter((e) => e.colegio === undefined);
    expect(fuera.filter((e) => e.tamano === 'grande')).toHaveLength(1);
    expect(fuera.filter((e) => e.tamano === 'mediano')).toHaveLength(3);
    expect(fuera.filter((e) => e.tamano === 'pequeno')).toHaveLength(7);
    expect(new Set(fuera.map((e) => e.club)).size).toBe(11);
    expect(new Set(fuera.map((e) => e.nombre)).size).toBe(11);
    expect(once.poblacion.equipos.some((e) => e.club === 'colegio')).toBe(true);
    // El catálogo del personaje lleva los mismos clubes (los mismos ids), cada uno con sus sesiones y sede.
    expect(once.clubes.map((c) => c.id).sort()).toEqual(once.poblacion.equipos.map((e) => e.club).sort());
  });
});

