import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { rngEstable, type LectorDePersona } from '@ds/contracts';
import { DIAGNOSTICO_DE_CACHE, jugarPartido, type EquipoDePartido, type JugadorDePartido } from './partido';
import { azarDeLesionEnPartido, conMinutos, flujosDelPartido, vistaDeCronica } from './registro';

/** Un lector de prueba: lo que vale cada habilidad depende del nombre de la stat, así que cada jugador es distinto de los demás. */
const lector = (valor: number, inmutable = false): LectorDePersona => ({ stat: (id) => (id.startsWith('gen.') ? valor : valor + ((id.length * 7) % 13)), norm: (id) => (id === 'gen.resistencia' ? 0.4 : 0.5), ...(inmutable ? { inmutable: true as const } : {}) });
const TITULARES = ['GK', 'CB', 'CB', 'LB', 'RB', 'CM', 'CM', 'CDM', 'LW', 'RW', 'ST'];
const SUPLENTES = ['GK', 'CB', 'CM', 'LW', 'ST'];
const equipo = (id: string, valor: number, inmutable = false): EquipoDePartido => ({
  id,
  nombre: id,
  jugadores: [...TITULARES.map((p) => [p, true] as const), ...SUPLENTES.map((p) => [p, false] as const)].map(([puesto, titular], i): JugadorDePartido => ({ id: `${id}_${i}`, nombre: id, puesto, titular, rinde: 0.9 + (i % 4) * 0.03, energia: 70 + i, lector: lector(valor + i, inmutable) })),
});
const CAMBIOS = { maximo: 5, despuesDeTramos: [1, 3, 4] };

describe('el motor no cambia al ponerle registro, flujos de azar y caché (P0)', () => {
  it('da exactamente los mismos partidos que antes (huella de 60 partidos, tomada del motor anterior)', () => {
    const h = createHash('sha1');
    for (let i = 0; i < 60; i++) {
      const r = jugarPartido(equipo('a', 20 + (i % 7) * 5), equipo('b', 30), { id: `g${i}`, semilla: 11, categoria: ['benjamin', 'infantil', 'senior'][i % 3], cambios: CAMBIOS });
      const { goles, porTramo, tiros, jugadores, alineaciones, jugadas, cronica } = r;
      h.update(JSON.stringify({ goles, porTramo, tiros, jugadores, alineaciones, jugadas, cronica }));
    }
    expect(h.digest('hex')).toBe('0ecd749069f0b4a2fab272c8866b1c262cecb53e');
  });

  it('la crónica es la vista del registro, y el registro tiene minutos creíbles y en orden', () => {
    for (let i = 0; i < 40; i++) {
      const r = jugarPartido(equipo('a', 30), equipo('b', 30), { id: `r${i}`, semilla: 3, categoria: 'infantil', cambios: CAMBIOS });
      expect(r.cronica).toEqual(vistaDeCronica(r.registro));
      expect(r.registro.length).toBe(r.cronica.length);
      for (const s of r.registro) {
        expect(s.minuto).toBeGreaterThanOrEqual(s.tramo * 15);
        expect(s.minuto).toBeLessThan((s.tramo + 1) * 15);
        if (s.tipo === 'cambio') expect(s.minuto).toBe(s.tramo * 15);
      }
      // Los que no son cambios van en orden creciente dentro de cada tramo (los cambios, al empezar el tramo).
      for (let t = 0; t < 6; t++) {
        const m = r.registro.filter((s) => s.tramo === t && s.tipo !== 'cambio').map((s) => s.minuto);
        expect(m).toEqual([...m].sort((x, y) => x - y));
      }
    }
  });

  it('los minutos tienen su propio azar: son siempre los mismos y no cambian el marcador', () => {
    const o = { id: 'm1', semilla: 9, categoria: 'alevin', cambios: CAMBIOS };
    const a = jugarPartido(equipo('a', 28), equipo('b', 31), o);
    const b = jugarPartido(equipo('a', 28), equipo('b', 31), o);
    expect(a.registro).toEqual(b.registro);
    const sinMinutos = conMinutos(a.cronica, rngEstable('otro'), 15);
    expect(sinMinutos.map(({ minuto: _m, ...x }) => x)).toEqual(a.cronica);
  });
});

describe('los flujos de azar por subsistema', () => {
  it('el del resultado es exactamente el de siempre', () => {
    const f = flujosDelPartido(7, 'liga-1');
    const antes = rngEstable('partido', 7, 'liga-1');
    for (let i = 0; i < 50; i++) expect(f.resultado.next()).toBe(antes.next());
  });

  it('pedir o gastar el de otro subsistema no cambia el del resultado, y cada subsistema tiene el suyo', () => {
    const solo = flujosDelPartido(7, 'liga-1');
    const con = flujosDelPartido(7, 'liga-1');
    for (let i = 0; i < 30; i++) con.de('lesiones').next();
    for (let i = 0; i < 30; i++) con.de('tarjetas').next();
    for (let i = 0; i < 40; i++) expect(con.resultado.next()).toBe(solo.resultado.next());
    const primeros = (s: 'minutos' | 'tarjetas' | 'lesiones' | 'cambios') => flujosDelPartido(7, 'liga-1').de(s).next();
    expect(new Set([primeros('minutos'), primeros('tarjetas'), primeros('lesiones'), primeros('cambios'), flujosDelPartido(7, 'liga-1').resultado.next()]).size).toBe(5);
    expect(flujosDelPartido(7, 'liga-1').de('resultado')).toBeDefined();
  });

  it('el azar de lesión de un jugador no depende de los demás jugadores del partido ni del resto del azar', () => {
    const a = azarDeLesionEnPartido(7, 'liga-1', 'npc-4', 2);
    azarDeLesionEnPartido(7, 'liga-1', 'npc-5', 2).next();
    flujosDelPartido(7, 'liga-1').resultado.next();
    const b = azarDeLesionEnPartido(7, 'liga-1', 'npc-4', 2);
    expect(a.next()).toBe(b.next());
    expect(azarDeLesionEnPartido(7, 'liga-1', 'npc-4', 3).next()).not.toBe(azarDeLesionEnPartido(7, 'liga-1', 'npc-4', 2).next());
  });
});

describe('la caché de lo que vale cada jugador', () => {
  it('con lectores inmutables da el mismo partido que sin caché, y la segunda vez acierta', () => {
    const o = { id: 'c1', semilla: 5, categoria: 'cadete', cambios: CAMBIOS };
    const sinCache = jugarPartido(equipo('a', 27), equipo('b', 33), o);
    DIAGNOSTICO_DE_CACHE.aciertos = 0;
    const a = equipo('a', 27, true);
    const b = equipo('b', 33, true);
    const primero = jugarPartido(a, b, o);
    const aciertosDespuesDelPrimero = DIAGNOSTICO_DE_CACHE.aciertos;
    const segundo = jugarPartido(a, b, o);
    expect(primero).toEqual(sinCache);
    expect(segundo).toEqual(sinCache);
    expect(DIAGNOSTICO_DE_CACHE.aciertos - aciertosDespuesDelPrimero).toBe(a.jugadores.length + b.jugadores.length);
  });

  it('un lector que no es una foto (el del personaje) no se guarda, aunque sea el mismo objeto', () => {
    const a = equipo('a', 27);
    const b = equipo('b', 33);
    const o = { id: 'c2', semilla: 5, categoria: 'cadete' };
    jugarPartido(a, b, o);
    DIAGNOSTICO_DE_CACHE.aciertos = 0;
    jugarPartido(a, b, o);
    expect(DIAGNOSTICO_DE_CACHE.aciertos).toBe(0);
  });

  it('el estado del día (`rinde`) cuenta aunque el lector esté guardado', () => {
    const a = equipo('a', 30, true);
    const b = equipo('b', 30, true);
    const o = { id: 'c3', semilla: 5, categoria: 'cadete' };
    const normal = jugarPartido(a, b, o);
    const cansados = jugarPartido({ ...a, jugadores: a.jugadores.map((j) => ({ ...j, rinde: 0.5 })) }, b, o);
    expect(cansados.porTramo).not.toEqual(normal.porTramo);
  });
});
