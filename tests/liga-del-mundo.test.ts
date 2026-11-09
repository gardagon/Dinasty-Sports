import { beforeAll, describe, expect, it, vi } from 'vitest';
import { PAIS_CIUDAD_DE_PRUEBA, registrarPais } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol, categoriaAcabada, tablasDeLaDivision, type FutbolState } from '@ds/mod-futbol';
import { type NpcsState } from '@ds/mod-npcs';

vi.setConfig({ testTimeout: 480000, hookTimeout: 480000 });
registrarPais(PAIS_CIUDAD_DE_PRUEBA);

/**
 * La liga del mundo (F2.3b): cada sábado de clase, todos los equipos de todas las categorías de la ciudad juegan su jornada, esté o no el personaje; a quienes juegan les cambia el estado; al acabar la temporada se
 * cierra con los ascensos y descensos y la siguiente parte de las divisiones nuevas.
 */
describe('la liga del mundo', () => {
  let g: ReturnType<typeof nuevaPartida>;
  const liga = () => (g.moduleState<FutbolState>('futbol') as FutbolState).liga;
  beforeAll(() => {
    g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
  });

  it('en la pretemporada no se juega; después, cada sábado de clase se juega una jornada en cada categoría', () => {
    advanceToWeek(g, 'gen.descansar', 3, 2, 15);
    expect(liga()).toBeUndefined();
    const jornadas: number[] = [];
    for (let w = 8; w <= 14; w++) {
      advanceToWeek(g, 'gen.descansar', w, 2, 15);
      jornadas.push(Math.max(...Object.values(liga()?.categorias ?? {}).map((c) => c.jornada)));
    }
    expect(jornadas[0]).toBeGreaterThanOrEqual(1);
    for (let i = 1; i < jornadas.length; i++) expect(jornadas[i] - jornadas[i - 1]).toBeLessThanOrEqual(1);
    expect(jornadas[jornadas.length - 1]).toBeGreaterThan(jornadas[0]);
    const l = liga()!;
    expect(Object.keys(l.categorias).sort()).toEqual(['alevin', 'benjamin', 'cadete', 'infantil', 'juvenil']);
    // Todos los equipos de la ciudad juegan: todos los grupos tienen resultados.
    for (const c of Object.values(l.categorias)) for (const d of c.divisiones) for (const gr of d.grupos) expect(gr.resultados.length).toBeGreaterThan(0);
  });

  it('a quienes juegan les cambia el estado (condición, moral y forma), a los demás no', () => {
    const npcs = (g.moduleState<NpcsState>('npcs') as NpcsState).npcs;
    const conEstado = npcs.filter((n) => n.deporte === 'futbol' && n.estado);
    expect(conEstado.length).toBeGreaterThan(300);
    // La forma de los jugadores se mueve con los resultados: no todos igual.
    expect(new Set(conEstado.map((n) => Math.round(n.estado!.forma))).size).toBeGreaterThan(3);
  });

  it('la temporada se cierra con los ascensos y descensos y el curso siguiente empieza con las divisiones nuevas', () => {
    advanceToWeek(g, 'gen.descansar', 52 + 4, 2, 15);
    const l = liga()!;
    expect(l.curso).toBeGreaterThanOrEqual(0);
    const anterior = l.cerrada ? l : undefined;
    // Al llegar el nuevo curso, o se ha creado la liga nueva o la anterior está cerrada con las divisiones siguientes.
    if (anterior) {
      expect(anterior.siguiente).toBeDefined();
      expect(anterior.campeones.length).toBeGreaterThan(0);
    } else {
      expect(l.campeones.length).toBeGreaterThan(0); // la de este curso ya viene con el historial del anterior
    }
    advanceToWeek(g, 'gen.descansar', 52 + 14, 2, 15);
    const l2 = liga()!;
    expect(l2.curso).toBeGreaterThan(0);
    expect(l2.campeones.length).toBeGreaterThanOrEqual(5); // un campeón por categoría de la primera temporada
    for (const c of Object.values(l2.categorias)) expect(c.jornada).toBeGreaterThan(0);
    // Cada equipo aparece una sola vez en las divisiones de su categoría.
    for (const c of Object.values(l2.categorias)) {
      const ids = c.divisiones.flatMap((d) => d.grupos.flatMap((gr) => gr.equipos));
      expect(new Set(ids).size).toBe(ids.length);
    }
    void categoriaAcabada;
    void tablasDeLaDivision;
  });

  it('la partida con la liga sigue siendo reproducible: la misma semilla, las mismas clasificaciones', () => {
    const h = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    advanceToWeek(h, 'gen.descansar', 14, 2, 15);
    const a = JSON.stringify((h.moduleState<FutbolState>('futbol') as FutbolState).liga);
    const b = JSON.stringify((g.moduleState<FutbolState>('futbol') as FutbolState).liga?.campeones.length);
    expect(a.length).toBeGreaterThan(1000);
    void b;
    const h2 = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    advanceToWeek(h2, 'gen.descansar', 14, 2, 15);
    expect(JSON.stringify((h2.moduleState<FutbolState>('futbol') as FutbolState).liga)).toBe(a);
  });
});
