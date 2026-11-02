import { describe, expect, it } from 'vitest';
import { SERVICES, anioNatural, type IdentityService, type NpcDirectory } from '@ds/contracts';
import { Game } from '@ds/core';
import { cargarPartida, nuevaPartida } from '@ds/game';
import { personaje, type IdentidadState } from '@ds/mod-personaje';

/**
 * La edad del personaje al empezar: nace como los PNJ, un día al azar del mismo año natural que su clase (antes tenía entre 8,0 y 9,0 años y en el 31 % de las
 * partidas nacía un año antes que sus compañeros: era un año mayor que toda su clase y jugaba de benjamín de segundo año).
 */

const SEMILLAS = Array.from({ length: 200 }, (_, i) => i + 1);
const nacimientoDe = (i: IdentidadState) => Math.round(-(i.edadInicial + i.fraccionInicial) * 365);

describe('el personaje nace el mismo año natural que su clase', () => {
  it('empieza con entre 7,3 y 8,7 años, nunca más', () => {
    for (const seed of SEMILLAS) {
      const i = Game.create([personaje], { seed }).moduleState<IdentidadState>('gen') as IdentidadState;
      const edad = i.edadInicial + i.fraccionInicial;
      expect(edad, `semilla ${seed}`).toBeGreaterThan(7.3);
      expect(edad, `semilla ${seed}`).toBeLessThan(8.7);
    }
  });

  it('en el 100 % de las partidas es de la edad de competición de su clase (benjamín de primer año), no de la de un curso por encima', () => {
    for (const seed of SEMILLAS.slice(0, 60)) {
      const g = Game.create([personaje], { seed });
      expect(g.service<IdentityService>(SERVICES.identidad)!.view().seasonAge, `semilla ${seed}`).toBe(8);
      expect(anioNatural(nacimientoDe(g.moduleState<IdentidadState>('gen') as IdentidadState)), `semilla ${seed}`).toBe(anioNatural(0) - 8);
    }
  });

  it('nace en el mismo año natural que los compañeros de su clase, con los días repartidos por todo el año', () => {
    const g = nuevaPartida({ seed: 31 });
    const companeros = g.service<NpcDirectory>(SERVICES.npcs)!.list({ role: 'companero' }).filter((n) => n.age === 8);
    expect(companeros.length).toBeGreaterThan(20);
    const anios = new Set(companeros.map((n) => anioNatural(n.nacimiento!)));
    expect([...anios]).toEqual([anioNatural(0) - 8]);
    expect(anioNatural(nacimientoDe(g.moduleState<IdentidadState>('gen') as IdentidadState))).toBe(anioNatural(0) - 8);
    // Los cumpleaños se reparten por todo el año: el curso empieza en septiembre, así que unos dos tercios (los nacidos de enero a agosto) ya tienen 8 años y el tercio
    // restante cumple los 8 durante el curso.
    const edades = Array.from({ length: 200 }, (_, i) => {
      const s = Game.create([personaje], { seed: i + 1 }).moduleState<IdentidadState>('gen') as IdentidadState;
      return s.edadInicial + s.fraccionInicial;
    });
    expect(edades.filter((e) => e < 8).length / edades.length).toBeGreaterThan(0.2);
    expect(edades.filter((e) => e < 8).length / edades.length).toBeLessThan(0.45);
  });

  it('las partidas guardadas conservan la edad con la que empezaron', () => {
    const g = nuevaPartida({ seed: 31 });
    const guardado = JSON.parse(JSON.stringify(g.serialize()));
    (guardado.modules.gen as IdentidadState).edadInicial = 8;
    (guardado.modules.gen as IdentidadState).fraccionInicial = 0.5;
    const cargada = cargarPartida(guardado);
    const i = cargada.moduleState<IdentidadState>('gen') as IdentidadState;
    expect([i.edadInicial, i.fraccionInicial]).toEqual([8, 0.5]);
  });
});
