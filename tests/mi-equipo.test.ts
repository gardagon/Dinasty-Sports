import { beforeAll, describe, expect, it, vi } from 'vitest';
import { PAIS_CIUDAD_DE_PRUEBA, SERVICES, claveDeDeporte, registrarPais, servicioDeComparacion, type ComparacionService, type DeporteService, type NpcDirectory } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol, type FutbolState } from '@ds/mod-futbol';
import { conFutbolFuerte, hacer, posible } from './ayudas';

vi.setConfig({ testTimeout: 480000, hookTimeout: 480000 });
registrarPais(PAIS_CIUDAD_DE_PRUEBA);

/**
 * «Mi equipo» (decidido el 21/11/2026): la subpestaña del deporte con el equipo (letra y club) y los compañeros: sin nombre quien no se conoce, el puesto solo de quien se ha visto jugar (al entrenar o jugar con él)
 * y, en la ficha de Gente, «crees que eres mejor / peor / parecido». Las habilidades del deporte, agrupadas (dato del deporte).
 */
describe('Mi equipo', () => {
  let g: ReturnType<typeof nuevaPartida>;
  const estado = () => g.moduleState<FutbolState>('futbol') as FutbolState;
  const vista = () => g.service<DeporteService>(claveDeDeporte('futbol'))!.view();
  beforeAll(() => {
    g = conFutbolFuerte(nuevaPartida({ seed: 40, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]), [...MODULOS, futbol]);
    advanceToWeek(g, 'gen.descansar', 1, 2, 15);
    if (posible(g, 'futbol.apuntarse_colegio')) hacer(g, 'futbol.apuntarse_colegio');
    advanceToWeek(g, 'gen.descansar', 3, 2, 12);
  });

  it('las habilidades salen agrupadas por el deporte (portería, físico, mental, técnico) y sin perder ninguna', () => {
    const v = vista();
    expect(v.gruposDeHabilidades!.map((x) => x.titulo)).toEqual(['Portería', 'Físico', 'Mental', 'Técnico', 'Conocimiento']);
    expect(v.gruposDeHabilidades!.flatMap((x) => x.habilidades).sort()).toEqual([...v.habilidades].sort());
  });

  it('al empezar: el equipo con su letra y el club, compañeros sin nombre si no se conocen y sin puesto', () => {
    const m = vista().miEquipo!;
    expect(m.titulo).toMatch(/^Equipo [A-D] · /);
    expect(m.companeros[0]).toMatchObject({ id: 'personaje', yo: true });
    const otros = m.companeros.filter((c) => !c.yo);
    expect(otros.length).toBeGreaterThanOrEqual(10);
    const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
    for (const c of otros) {
      const n = dir.get(c.id)!;
      expect(c.aspecto).toBeTruthy();
      // Nunca el nombre de quien no conoce.
      if (n.known === false) expect(c.nombre).toBeUndefined();
      else expect(c.nombre).toBe(n.name);
      expect(c.puesto).toBeUndefined();
    }
    expect(otros.some((c) => !c.nombre)).toBe(true);
    // Ningún nombre de desconocido se cuela en el JSON de la vista ni en la plantilla de la pestaña.
    const desconocidos = otros.filter((c) => !c.nombre).map((c) => dir.get(c.id)!.name);
    const texto = JSON.stringify(vista());
    for (const nombre of desconocidos) expect(texto).not.toContain(nombre);
    expect(g.service<ComparacionService>(servicioDeComparacion('futbol'))!.sobre(otros[0].id)).toBeUndefined();
  });

  it('cada jugador lleva su dorsal (el personaje también), sin repetir; los porteros, el 1, el 13 o desde el 16; y la comparación sale «—» hasta que le has visto jugar', () => {
    const m = vista().miEquipo!;
    const dorsales = m.companeros.map((c) => c.dorsal);
    expect(dorsales.every((d) => d !== undefined)).toBe(true);
    expect(new Set(dorsales).size).toBe(m.companeros.length);
    const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
    const plantilla = dir.plantillaDelEquipo!('futbol', estado().personaje?.club ?? dir.equipoDelPersonaje!('futbol')!.club, dir.equipoDelPersonaje!('futbol')!.categoria, dir.equipoDelPersonaje!('futbol')!.letra);
    for (const j of plantilla) {
      if (j.puesto === 'GK') expect([1, 13].includes(j.dorsal!) || j.dorsal! >= 16).toBe(true);
      else expect(j.dorsal! >= 2).toBe(true);
    }
    expect(m.companeros.filter((c) => !c.yo).every((c) => c.comparacion === undefined)).toBe(true);
    expect(m.companeros.filter((c) => !c.nombre && !c.yo).every((c) => c.aspectoCorto && c.aspectoCorto.length < 40)).toBe(true);
    // Lo guardado es ligero: un número por jugador.
    expect(JSON.stringify(estado().dorsal ?? []).length).toBeLessThan(60);
  });

  it('tras entrenar con el club se desbloquea el puesto de los compañeros y la comparación (sin números); lo guardado es pequeño', () => {
    advanceToWeek(g, 'gen.descansar', 3, 3, 15);
    expect(hacer(g, 'futbol.club_sesion').ok).toBe(true);
    const vistos = estado().companeros!;
    const ids = Object.keys(vistos);
    expect(ids.length).toBeGreaterThanOrEqual(8);
    const m = vista().miEquipo!;
    for (const c of m.companeros.filter((x) => !x.yo && vistos[x.id])) expect(c.puesto).toBeTruthy();
    const servicio = g.service<ComparacionService>(servicioDeComparacion('futbol'))!;
    const c = servicio.sobre(ids[0])!;
    expect(c.titulo).toBe('Comparado contigo');
    expect(c.texto).toMatch(/^Crees que (eres (mejor|peor) que (él|ella)|jugáis más o menos igual de bien)\.$/);
    expect(c.texto).not.toMatch(/\d/);
    expect(JSON.stringify(estado().companeros).length).toBeLessThan(4000);
    const antes = new Map(m.companeros.map((x) => [x.id, x.dorsal]));
    for (const x of m.companeros.filter((y) => !y.yo && vistos[y.id])) expect(x.comparacion).toMatch(/^(mejor|peor|parecido)$/);
    expect(vista().miEquipo!.companeros.every((x) => x.dorsal === antes.get(x.id))).toBe(true);
  });

  it('tras varias semanas de partidos la plantilla de la pestaña enseña el puesto solo de quien se ha visto, y el nombre solo de quien se conoce', () => {
    advanceToWeek(g, 'gen.descansar', 14, 2, 15);
    const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
    const m = vista().miEquipo!;
    const plantilla = vista().secciones!.find((x) => x.titulo.startsWith('Plantilla'))!.tabla!;
    const otras = plantilla.rows.filter((r) => r[0] !== 'Tú');
    const vistos = m.companeros.filter((c) => !c.yo && c.puesto).length;
    expect(otras.filter((r) => r[1] !== '—')).toHaveLength(vistos);
    // Todo lo que se llama por su nombre en la tabla es alguien que se conoce.
    const nombres = new Set(m.companeros.filter((c) => c.nombre).map((c) => c.nombre));
    for (const r of otras) {
      const esNombre = [...Object.keys(estado().companeros ?? {})].some((id) => dir.get(id)?.name === r[0]);
      if (esNombre) expect(nombres.has(r[0])).toBe(true);
    }
  });

  it('quien no ha jugado ni entrenado con el personaje sigue sin comparación', () => {
    const servicio = g.service<ComparacionService>(servicioDeComparacion('futbol'))!;
    const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
    const ajeno = dir.list({}).find((n) => !estado().companeros?.[n.id]);
    expect(ajeno).toBeDefined();
    expect(servicio.sobre(ajeno!.id)).toBeUndefined();
  });
});
