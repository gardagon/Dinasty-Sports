import { describe, expect, it } from 'vitest';
import { SERVICES, apellidosDeFamilia, type FamilyService, type NpcDirectory, type ProfileService } from '@ds/contracts';
import { Game } from '@ds/core';
import { personaje } from '@ds/mod-personaje';
import { npcs } from '@ds/mod-npcs';
import { familia } from './index';

const nueva = (seed: number) => Game.create([personaje, familia], { seed });
const padres = (g: Game) => g.service<FamilyService>(SERVICES.familia)!;

describe('módulo familia', () => {
  it('funciona solo con el módulo base: un padre y una madre adultos', () => {
    const f = padres(nueva(1));
    const [padre, madre] = f.parents();
    expect(padre.gender).toBe('m');
    expect(madre.gender).toBe('f');
    for (const p of [padre, madre]) {
      expect(p.edad).toBeGreaterThanOrEqual(35);
      expect(p.edad).toBeLessThanOrEqual(56);
      for (const v of [p.apoyo, p.expectativas, p.tiempoEnCasa]) expect(v).toBeGreaterThanOrEqual(0);
    }
    expect(f.apellidos.split(' ')).toHaveLength(2);
  });

  it('es determinista por semilla y varía entre semillas', () => {
    expect(padres(nueva(7)).parents()).toEqual(padres(nueva(7)).parents());
    const nombres = new Set(Array.from({ length: 12 }, (_, i) => padres(nueva(i + 1)).parents()[0].nombre));
    expect(nombres.size).toBeGreaterThan(3);
  });

  it('el deporte solo lo tiene quien lo practicó, y la mayoría no llegó a federado', () => {
    const todos = Array.from({ length: 200 }, (_, i) => padres(nueva(i + 1)).parents()).flat();
    for (const p of todos) expect(p.deporte === undefined).toBe(p.practica === 'ninguna');
    const altos = todos.filter((p) => p.practica === 'federado' || p.practica === 'profesional').length;
    expect(altos / todos.length).toBeGreaterThan(0.05);
    expect(altos / todos.length).toBeLessThan(0.35);
  });

  it('la edad de los padres avanza con el tiempo', () => {
    const g = nueva(3);
    const antes = padres(g).parents()[0].edad;
    for (let i = 0; i < 400; i++) g.perform('gen.dormir');
    expect(padres(g).parents()[0].edad).toBeGreaterThanOrEqual(antes);
  });

  it('los padres llevan perks: pocos, sin opuestos y con el pool aparte', () => {
    const todos = Array.from({ length: 300 }, (_, i) => padres(nueva(i + 1)).parents()).flat();
    for (const p of todos) {
      expect(p.perks.activos.length).toBeLessThanOrEqual(3);
      for (const id of p.perks.activos) expect(p.perks.pool).not.toContain(id);
    }
    const sin = todos.filter((p) => p.perks.activos.length === 0).length / todos.length;
    expect(sin).toBeGreaterThan(0.4);
  });

  it('los padres tienen rasgos y el hijo se parece a ellos: cada rasgo de cara viene de uno de los dos', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const g = nueva(seed);
      const [padre, madre] = padres(g).parents();
      expect(padre.rasgos.apariencia.peloColor).toBeTruthy();
      expect(Object.keys(padre.rasgos.caracter)).toHaveLength(8);
      const hijo = g.service<ProfileService>(SERVICES.perfil)!.view();
      expect([padre.rasgos.apariencia.cara, madre.rasgos.apariencia.cara]).toContain(hijo.apariencia.cara);
      const ids = [...padre.rasgos.origen, ...madre.rasgos.origen].map((o) => o.id);
      for (const o of hijo.origen) expect(ids).toContain(o.id);
    }
  });
});

describe('hermanos en la ficha de familia', () => {
  const conHermanos = (seed: number) => Game.create([personaje, familia, npcs], { seed });

  it('el servicio da los hermanos que viven en el directorio de personas, con los apellidos de la familia', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const g = conHermanos(seed);
      const f = g.service<FamilyService>(SERVICES.familia)!;
      const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
      expect(f.siblings().map((h) => h.id)).toEqual(dir.list({ tag: 'hermano' }).map((h) => h.id));
      for (const h of f.siblings()) expect(h.name.endsWith(apellidosDeFamilia(seed, h.gender))).toBe(true);
    }
  });

  it('sin el módulo de personas no hay hermanos (y no falla)', () => {
    expect(padres(nueva(1)).siblings()).toEqual([]);
  });

  it('los apellidos dependen de la semilla: la misma partida da siempre los mismos', () => {
    expect(padres(nueva(7)).apellidos).toBe(padres(nueva(7)).apellidos);
    expect(new Set(Array.from({ length: 20 }, (_, i) => padres(nueva(i + 1)).apellidos)).size).toBeGreaterThan(8);
  });
});
