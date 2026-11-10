import { describe, expect, it } from 'vitest';
import type { ResultadoDePartido } from './partido';
import { YO, cronicaDelPartido, proximoPartido, situacionEnLaLiga, textoDeResultados, ultimosResultados } from './personaje';
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
