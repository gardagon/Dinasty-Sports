import { describe, expect, it } from 'vitest';
import { CAPACIDADES_GENETICAS, GEN } from '@ds/contracts';
import { Game, advanceToWeek } from '@ds/core';
import { personaje, type IdentidadState } from '@ds/mod-personaje';
import { cargarPartida, nuevaPartida } from '@ds/game';
import type { Npc, NpcsState } from '@ds/mod-npcs';
import { EDAD_DE_PARTIDA, avanzarSemana, capacidadesIniciales, historiaDe, type CapacidadesDe } from '../modules/npcs/src/capacidades';
import type { Genetica } from '../modules/npcs/src/deportistas';

/**
 * Personaje y PNJ con las mismas reglas (`docs/MISMAS_REGLAS.md`, fase P1): un niño con la misma genética que el personaje, sin entrenar, acaba con las mismas
 * capacidades que él. Si alguien cambia una regla para uno solo, este test falla.
 */

/** Un niño con la genética del personaje (sus topes y su adelanto o retraso) y sus mismas capacidades de partida. */
function comoElPersonaje(g: Game) {
  const ident = g.moduleState<IdentidadState>('gen') as IdentidadState;
  const genetica = { topes: Object.fromEntries(CAPACIDADES_GENETICAS.map((c) => [c, g.hiddenPotential(c)!])), desfase: ident.madurez } as unknown as Genetica;
  const inicial = CAPACIDADES_GENETICAS.map((c) => g.stat(c));
  const c: CapacidadesDe = { cap: [...inicial], pico: [...inicial], base: [...inicial] };
  // El día 0 tiene la edad con la que empezó; el niño nace ese mismo número de años antes.
  const nacimiento = -(ident.edadInicial + ident.fraccionInicial) * 365;
  return { genetica, c, nacimiento };
}

describe('el personaje y un niño con su genética, sin entrenar', () => {
  // Medido con 3 semillas: la diferencia máxima es de 0,1 puntos tras dos años, con cambios de 1 a 2 puntos de media.
  for (const seed of [3, 11, 27]) {
    it(`acaban con las mismas capacidades al cabo de 6 meses y de 2 años (semilla ${seed})`, () => {
      const g = Game.create([personaje], { seed });
      const { genetica, c, nacimiento } = comoElPersonaje(g);
      let semana = 0;
      for (const hasta of [26, 104]) {
        advanceToWeek(g, 'gen.descansar', hasta, 0, 7);
        for (; semana < hasta; semana++) avanzarSemana(c, genetica, nacimiento, (semana + 1) * 7);
        const peor = CAPACIDADES_GENETICAS.map((id, i) => ({ id, d: Math.abs(g.stat(id) - c.cap[i]) }))
          // La constitución se forja con hábitos sostenidos (el personaje la entrena una vez a la semana): no es "sin entrenar".
          .filter((x) => x.id !== GEN.constitucion)
          .reduce((m, x) => (x.d > m.d ? x : m));
        expect(peor.d, `${peor.id} tras ${hasta} semanas`).toBeLessThan(0.25);
      }
    });
  }
});

describe('los niños de la partida tienen sus capacidades reales', () => {
  const nueva = () => nuevaPartida({ seed: 31 });
  const niños = (g: ReturnType<typeof nueva>) => g.moduleState<NpcsState>('npcs').npcs.filter((n) => n.genetica && n.nacimiento !== undefined);
  const edad = (n: Npc) => Math.floor(-n.nacimiento! / 365);

  it('todos los niños con genética llevan las 18 capacidades y su máximo, y ninguna pasa de su tope', () => {
    const lista = niños(nueva());
    expect(lista.length).toBeGreaterThan(1000);
    for (const n of lista) {
      expect(n.cap, n.id).toHaveLength(18);
      expect(n.pico, n.id).toHaveLength(18);
      CAPACIDADES_GENETICAS.forEach((c, i) => {
        expect(n.cap![i]).toBeLessThanOrEqual(n.genetica!.topes[c] + 0.01);
        expect(n.pico![i]).toBeGreaterThanOrEqual(n.cap![i] - 0.01);
      });
    }
  });

  it('los mayores tienen más que los pequeños: llevan más años desarrollándose', () => {
    const lista = niños(nueva());
    const media = (e: number) => {
      const c = lista.filter((n) => edad(n) === e);
      return c.reduce((t, n) => t + n.cap!.reduce((a, b) => a + b, 0) / 18, 0) / c.length;
    };
    expect(media(8)).toBeGreaterThan(8);
    expect(media(8)).toBeLessThan(18); // el rango inicial del personaje
    expect(media(12)).toBeGreaterThan(media(8));
    expect(media(16)).toBeGreaterThan(media(12));
  });

  it('cada semana se desarrollan un poco más, y se guarda y se carga igual', () => {
    const g = nueva();
    const antes = new Map(niños(g).map((n) => [n.id, n.cap!.reduce((a, b) => a + b, 0)]));
    advanceToWeek(g, 'gen.descansar', 3, 0, 7);
    const despues = niños(g);
    const subieron = despues.filter((n) => n.cap!.reduce((a, b) => a + b, 0) > (antes.get(n.id) ?? Infinity) + 1e-6).length;
    expect(subieron).toBeGreaterThan(despues.length / 2);
    const g2 = cargarPartida(JSON.parse(JSON.stringify(g.serialize())));
    expect(niños(g2).map((n) => n.cap)).toEqual(despues.map((n) => n.cap));
  });

  it('la historia calculada por bloques da lo mismo que semana a semana (dentro de un margen pequeño)', () => {
    const lista = niños(nueva()).filter((n) => edad(n) >= 12);
    let peor = 0;
    for (const n of lista.slice(0, 120)) {
      const c = capacidadesIniciales(n.id, n.genetica!);
      for (let d = EDAD_DE_PARTIDA * 365 + n.nacimiento! + 7; d <= 0; d += 7) avanzarSemana(c, n.genetica!, n.nacimiento!, d);
      const porBloques = historiaDe(n.id, n.genetica!, n.nacimiento!, 0);
      c.cap.forEach((v, i) => (peor = Math.max(peor, Math.abs(v - porBloques.cap[i]))));
    }
    expect(peor).toBeLessThan(0.35);
  });

  it('la historia de todos los niños se calcula en menos de 2 segundos', () => {
    const lista = niños(nueva());
    const t0 = performance.now();
    for (const n of lista) historiaDe(n.id, n.genetica!, n.nacimiento!, 0);
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(2000);
  });

  it('un niño que llega nuevo al colegio también tiene las suyas, con 8 años', () => {
    const g = nueva();
    advanceToWeek(g, 'gen.descansar', 40, 0, 7); // el curso siguiente empieza en la semana 52 (unas 12 semanas de verano más)
    advanceToWeek(g, 'gen.descansar', 53, 0, 7);
    const nuevos = niños(g).filter((n) => /^alumno_(4[5-9]\d|[5-9]\d\d)$/.test(n.id));
    expect(nuevos.length).toBeGreaterThan(0);
    expect(nuevos.every((n) => n.cap?.length === 18)).toBe(true);
  });
});
