import { describe, expect, it } from 'vitest';
import type { ResultadoDePartido } from './partido';
import { YO, cronicaDelPartido, jugadorPorSuDorsal, proximoPartido, situacionEnLaLiga, textoDeResultados, ultimosResultados } from './personaje';
import type { LigaDeCategoria } from './liga';

const ids = ['a|A', 'b|A', 'c|A', 'd|A'];
/** Una liga de 4 equipos con dos jornadas jugadas (a gana a b 2–1, c empata con d 0–0; luego a pierde con c 0–3 y b gana a d 1–0). */
const liga = (): LigaDeCategoria => ({ jornada: 2, divisiones: [{ grupos: [{ equipos: ids, resultados: [[0, 1, 2, 1], [2, 3, 0, 0], [0, 2, 0, 3], [1, 3, 1, 0]] }] }] });

describe('la liga vista desde un equipo', () => {
  it('el puesto en la tabla, con sus puntos', () => {
    const s = situacionEnLaLiga(liga(), 'c|A')!;
    expect(s).toMatchObject({ division: 1, puesto: 1, de: 4, puntos: 4, pj: 2 });
    expect(situacionEnLaLiga(liga(), 'zzz')).toBeUndefined();
  });

  it('el próximo partido sale del calendario de su grupo (con el campo) y el último resultado, de lo jugado', () => {
    const l = liga();
    const rivales = ids.map((id) => proximoPartido(l, id)!);
    // Cada uno juega la jornada 3 contra otro, y los rivales son recíprocos.
    for (const [i, p] of rivales.entries()) {
      expect(p.texto).toBe('Jornada 3');
      expect(proximoPartido(l, p.rival)!.rival).toBe(ids[i]);
      expect(proximoPartido(l, p.rival)!.local).toBe(!p.local);
    }
    expect(ultimosResultados(l, 'a|A')).toEqual([{ letra: 'G', propios: 2, rival: 1 }, { letra: 'P', propios: 0, rival: 3 }]);
    expect(textoDeResultados(ultimosResultados(l, 'a|A'))).toBe('G 2–1 · P 0–3');
    expect(textoDeResultados([])).toBe('sin partidos aún');
    expect(ultimosResultados(l, 'a|A', 1)).toHaveLength(1);
  });

  it('sin jornadas por jugar ni playoff, no hay próximo partido', () => {
    const l = liga();
    l.jornada = 99;
    expect(proximoPartido(l, 'a|A')).toBeUndefined();
  });
});

describe('la crónica', () => {
  const r = {
    goles: [1, 1],
    porTramo: [{ goles: [1, 0], posesion: [0.6, 0.4] }, { goles: [0, 1], posesion: [0.5, 0.5] }],
    tiros: [3, 2],
    jugadores: {},
    alineaciones: [[], []],
    jugadas: [],
    cronica: [
      { tramo: 0, tipo: 'gol', equipo: 0, jugador: YO, otro: 'x', portero: 'p2' },
      { tramo: 0, tipo: 'ocasion', equipo: 1, jugador: 'y', portero: YO },
      { tramo: 1, tipo: 'cambio', equipo: 0, jugador: 'z', otro: YO },
      { tramo: 1, tipo: 'gol', equipo: 1, jugador: 'y', portero: 'p1' },
    ],
  } as unknown as ResultadoDePartido;
  const lineas = cronicaDelPartido(r, { equipos: ['Local', 'Visitante'], nombres: { x: 'Xavi', y: 'Yeray', z: 'Zaid', p1: 'Pau', p2: 'Pol' } });

  it('cuenta el partido entero tramo a tramo, con el marcador de cada tramo y el final', () => {
    expect(lineas.filter((l) => l.titulo).map((l) => l.texto)).toEqual(['Minutos 0–15', 'Minutos 15–30', 'Final: Local 1–1 Visitante']);
    expect(lineas.some((l) => l.texto.includes('Local 1–0 Visitante'))).toBe(true);
    expect(lineas.some((l) => l.texto.includes('Local 1–1 Visitante · posesión 50 %'))).toBe(true);
    // Los goles y las ocasiones de los dos equipos.
    expect(lineas.some((l) => l.texto.includes('Yeray marca'))).toBe(true);
  });

  it('lo que hace el personaje sale destacado: su gol, la ocasión que para, cuando sale; lo de los demás, no', () => {
    const d = lineas.filter((l) => l.destacada).map((l) => l.texto);
    expect(d).toHaveLength(3);
    expect(d[0]).toMatch(/Marcas tú, con pase de Xavi/);
    expect(d[1]).toMatch(/lo paras tú/);
    expect(d[2]).toMatch(/Sales del campo: entra Zaid/);
    expect(lineas.filter((l) => !l.destacada && !l.titulo).every((l) => !/ tú|Tú/.test(l.texto))).toBe(true);
  });
});

describe('la crónica sin nombres de desconocidos (dorsales)', () => {
  const r = {
    goles: [1, 1],
    porTramo: [{ goles: [1, 1], posesion: [0.6, 0.4] }],
    tiros: [3, 2],
    jugadores: {},
    alineaciones: [['a', 'b', YO], ['c', 'd']],
    jugadas: [],
    cronica: [
      { tramo: 0, tipo: 'gol', equipo: 0, jugador: 'a', otro: 'b', portero: 'd' },
      { tramo: 0, tipo: 'ocasion', equipo: 1, jugador: 'c', portero: YO },
      { tramo: 0, tipo: 'gol', equipo: 1, jugador: 'd', otro: 'c', portero: YO },
      { tramo: 0, tipo: 'cambio', equipo: 0, jugador: 'b', otro: 'a' },
    ],
  } as unknown as ResultadoDePartido;
  const base = { equipos: ['Colegio B', 'Rayo A'] as [string, string], dorsales: { a: 7, b: 4, c: 9, d: 1 }, generos: { a: 'm', b: 'f', c: 'f', d: 'm' } as const, lado: 0 as const };

  it('quien no conoces sale por su dorsal, con concordancia: «vuestro 7», «vuestra 4», «la 9 del Rayo»', () => {
    const t = cronicaDelPartido(r, { ...base, nombres: {} }).map((l) => l.texto).join('\n');
    expect(t).toContain('Vuestro 7 marca, asistido por vuestra 4');
    expect(t).toContain('La 9 del Rayo dispara y lo paras tú');
    expect(t).toContain('El 1 del Rayo marca y no puedes evitarlo');
    expect(t).toContain('Cambio en Colegio B: entra vuestra 4 por vuestro 7');
    expect(t).not.toContain('un jugador');
  });

  it('quien conoces sale por su nombre, y el personaje, siempre «tú»', () => {
    const t = cronicaDelPartido(r, { ...base, nombres: { a: 'Álex', c: 'Carla' } }).map((l) => l.texto).join('\n');
    expect(t).toContain('Álex marca, asistido por vuestra 4');
    expect(t).toContain('Carla (Rayo A) dispara y lo paras tú');
    expect(t).not.toMatch(/vuestro 7|la 9 del Rayo/);
  });

  it('sin dorsal ni nombre queda «un jugador»; los nombres de equipo con artículo o femeninos concuerdan', () => {
    expect(cronicaDelPartido(r, { equipos: ['Colegio B', 'Rayo A'], nombres: {} }).some((l) => l.texto.includes('Un jugador marca'))).toBe(true);
    expect(jugadorPorSuDorsal(5, 'La Salle', false)).toBe('el 5 de La Salle');
    expect(jugadorPorSuDorsal(5, 'Escuela Norte', false, 'f')).toBe('la 5 de la Escuela Norte');
    expect(jugadorPorSuDorsal(5, 'Rayo', false)).toBe('el 5 del Rayo');
  });
});

describe('la crónica con la descripción de cada jugador que no conoces (decisión del 22/11/2026)', () => {
  const r = {
    goles: [1, 0],
    porTramo: [{ goles: [1, 0], posesion: [0.6, 0.4] }],
    tiros: [3, 2],
    jugadores: {},
    alineaciones: [['a', 'b', YO], ['c', 'd']],
    jugadas: [],
    cronica: [
      { tramo: 0, tipo: 'ocasion', equipo: 1, jugador: 'c', portero: YO },
      { tramo: 0, tipo: 'gol', equipo: 0, jugador: 'a', otro: 'b', portero: 'd' },
      { tramo: 0, tipo: 'ocasion', equipo: 1, jugador: 'c', portero: YO },
      { tramo: 0, tipo: 'ocasion', equipo: 0, jugador: 'b', portero: 'd' },
    ],
  } as unknown as ResultadoDePartido;
  const base = {
    equipos: ['Colegio B', 'Rayo A'] as [string, string],
    dorsales: { a: 7, b: 4, c: 9, d: 1 },
    generos: { a: 'm', b: 'f', c: 'f', d: 'm' } as const,
    descripciones: { a: 'Un niño de pelo negro liso, ojos marrones y piel clara', b: 'Una niña de pelo rubio, ojos verdes y piel clara', c: 'Una niña de pelo castaño, ojos marrones y piel morena', d: 'Un niño de pelo rojo' },
    lado: 0 as const,
  };

  it('de quien no conoces, del tuyo y del rival, la primera vez que sale se dice el dorsal y cómo es; después, solo el dorsal', () => {
    const t = cronicaDelPartido(r, { ...base, nombres: {} }).map((l) => l.texto).join('\n');
    expect(t).toContain('La 9 del Rayo (una niña de pelo castaño, ojos marrones y piel morena) dispara y lo paras tú');
    expect(t).toContain('Vuestro 7 (un niño de pelo negro liso, ojos marrones y piel clara) marca, asistido por vuestra 4 (una niña de pelo rubio, ojos verdes y piel clara)');
    // La segunda vez que dispara la 9, ya sin descripción.
    expect(t.match(/La 9 del Rayo/g)).toHaveLength(2);
    expect(t.match(/una niña de pelo castaño/g)).toHaveLength(1);
    // El portero rival se describe donde se nombra por primera vez.
    expect(t).toContain('Vuestra 4 dispara y el 1 del Rayo (un niño de pelo rojo) se lo para');
  });

  it('quien conoces sale por su nombre, sin descripción ni dorsal; sin descripciones, como antes', () => {
    const t = cronicaDelPartido(r, { ...base, nombres: { c: 'Carla' } }).map((l) => l.texto).join('\n');
    expect(t).toContain('Carla (Rayo A) dispara');
    expect(t).not.toContain('una niña de pelo castaño');
    const sin = cronicaDelPartido(r, { ...base, descripciones: undefined, nombres: {} }).map((l) => l.texto).join('\n');
    expect(sin).toContain('La 9 del Rayo dispara y lo paras tú');
    expect(sin).not.toContain('(');
  });
});

