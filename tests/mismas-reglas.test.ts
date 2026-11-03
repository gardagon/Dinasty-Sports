import { describe, expect, it } from 'vitest';
import { CAPACIDADES_GENETICAS, GEN } from '@ds/contracts';
import { Game, advanceToWeek } from '@ds/core';
import { personaje, type IdentidadState } from '@ds/mod-personaje';
import { cargarPartida, nuevaPartida } from '@ds/game';
import type { Npc, NpcsState } from '@ds/mod-npcs';
import type { Practica } from '@ds/contracts';
import { EDAD_DE_PARTIDA, avanzarSemana, edadDeEmpezar, capacidadesIniciales, historiaDe, type CapacidadesDe } from '../modules/npcs/src/capacidades';
import type { Genetica } from '../modules/npcs/src/deportistas';
import { DATOS_ATLETISMO } from '@ds/mod-atletismo';
import { fijarTalentosDeCapacidades, fijosDeNino, practicar, prepararTrabajo } from '../modules/npcs/src/rutina';
import { huecosQueHace } from '../modules/npcs/src/semana';

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

describe('de dónde parten el personaje y un niño con su genética', () => {
  // Un niño y el personaje con los mismos topes empiezan igual en media: el valor inicial sale de la misma función (`valorInicialDeCapacidad`), con su tope propio y su
  // factor de herencia. Antes el niño usaba la ventaja de crianza (×0,95–1,10) como factor y el personaje un factor de 0,7–0,9 sobre el tope de su progenitor:
  // con un tope de 62, el niño empezaba en torno a 14,9 y el personaje en torno a 12,1 (+23 %). Este test fallaba con esa diferencia.
  const SEMILLAS = Array.from({ length: 60 }, (_, i) => i + 1);

  it('en media empiezan en el mismo sitio (diferencia < 0,4 puntos), en cada una de las 18 capacidades y en conjunto', () => {
    const dePersonaje: number[][] = [];
    const deNino: number[][] = [];
    for (const seed of SEMILLAS) {
      const g = Game.create([personaje], { seed });
      dePersonaje.push(CAPACIDADES_GENETICAS.map((c) => g.stat(c)));
      // El niño, por el camino de los PNJ, con la genética del personaje (sus topes) y un identificador propio.
      const genetica = { topes: Object.fromEntries(CAPACIDADES_GENETICAS.map((c) => [c, g.hiddenPotential(c)!])), desfase: 0, ventaja: 1.1 } as unknown as Genetica;
      deNino.push(capacidadesIniciales(`nino_${seed}`, genetica).cap);
    }
    const media = (m: number[][], i?: number) => m.reduce((t, f) => t + (i === undefined ? f.reduce((a, b) => a + b, 0) / f.length : f[i]), 0) / m.length;
    expect(Math.abs(media(dePersonaje) - media(deNino))).toBeLessThan(0.4);
    CAPACIDADES_GENETICAS.forEach((c, i) => expect(Math.abs(media(dePersonaje, i) - media(deNino, i)), c).toBeLessThan(1.5));
  });

  it('la ventaja de crianza no cambia las capacidades de partida de un niño (a ninguno)', () => {
    const g = Game.create([personaje], { seed: 5 });
    const topes = Object.fromEntries(CAPACIDADES_GENETICAS.map((c) => [c, g.hiddenPotential(c)!]));
    const con = (ventaja: number) => capacidadesIniciales('nino_7', { topes, desfase: 0, ventaja } as unknown as Genetica).cap;
    expect(con(0.95)).toEqual(con(1.1));
  });
});

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

describe('la edad de empezar de los niños', () => {
  const muestra = (interes: number, padres: Practica, n = 2000) =>
    Array.from({ length: n }, (_, i) => edadDeEmpezar(`nino_${i}`, 'futbol', interes, { padre: padres, madre: padres }));
  const cuenta = (xs: number[], f: (e: number) => boolean) => xs.filter(f).length / xs.length;

  it('es estable: la misma edad para el mismo niño y deporte, y puede ser otra en otro deporte', () => {
    expect(edadDeEmpezar('nino_1', 'futbol', 2, { padre: 'ninguna', madre: 'federado' })).toBe(edadDeEmpezar('nino_1', 'futbol', 2, { padre: 'ninguna', madre: 'federado' }));
    const deportes = new Set(['futbol', 'atletismo', 'tenis', 'natacion', 'baloncesto', 'rugby'].map((d) => edadDeEmpezar('nino_1', d, 1, { padre: 'ninguna', madre: 'ninguna' })));
    expect(deportes.size).toBeGreaterThan(1);
  });

  it('la mayoría empieza entre los 8 y los 10; algunos desde los 6 y otros más tarde', () => {
    const todos = [...muestra(1, 'ninguna'), ...muestra(2, 'aficionado'), ...muestra(1, 'federado')];
    expect(cuenta(todos, (e) => e >= 8 && e <= 10)).toBeGreaterThan(0.5);
    expect(cuenta(todos, (e) => e <= 7)).toBeGreaterThan(0.03);
    expect(cuenta(todos, (e) => e >= 11)).toBeGreaterThan(0.03);
    expect(Math.min(...todos)).toBeGreaterThanOrEqual(6);
    expect(Math.max(...todos)).toBeLessThanOrEqual(13);
  });

  it('empiezan antes los muy interesados o con padres deportistas, y más tarde los poco interesados', () => {
    const pronto = (interes: number, padres: Practica) => cuenta(muestra(interes, padres), (e) => e <= 7);
    expect(pronto(3, 'profesional')).toBeGreaterThan(0.4);
    expect(pronto(3, 'profesional')).toBeGreaterThan(pronto(1, 'ninguna') + 0.2);
    expect(pronto(3, 'ninguna')).toBeGreaterThan(pronto(0, 'ninguna'));
    expect(pronto(0, 'profesional')).toBeGreaterThan(pronto(0, 'ninguna'));
    const tarde = (interes: number) => cuenta(muestra(interes, 'ninguna'), (e) => e >= 11);
    expect(tarde(0)).toBeGreaterThan(tarde(3));
  });
});

const RUTINA_ATLETISMO = DATOS_ATLETISMO.paises.espana.poblacion.rutina!;

describe('la semilla de la partida entra en los sorteos de cada niño', () => {
  const nino = (semilla?: number) => {
    const g = nuevaPartida({ seed: 31 });
    const n = (g.moduleState<NpcsState>('npcs') as NpcsState).npcs.find((x) => x.genetica && x.nacimiento !== undefined && x.id.startsWith('alumno_'))!;
    return { n, genetica: { ...n.genetica!, semilla } as Genetica };
  };

  it('todos los niños de una partida llevan su semilla (también los que llegan después)', () => {
    const g = nuevaPartida({ seed: 31 });
    const lista = (g.moduleState<NpcsState>('npcs') as NpcsState).npcs.filter((x) => x.genetica);
    expect(lista.length).toBeGreaterThan(1000);
    expect(lista.every((x) => x.genetica!.semilla === 31)).toBe(true);
    advanceToWeek(g, 'gen.descansar', 53, 0, 7); // empieza otro curso: llegan niños nuevos
    expect((g.moduleState<NpcsState>('npcs') as NpcsState).npcs.filter((x) => x.genetica).every((x) => x.genetica!.semilla === 31)).toBe(true);
  });

  it('el mismo niño con otra semilla tiene otro valor inicial, otro talento, otra asistencia y otra edad de empezar; con la misma, lo mismo', () => {
    const { n, genetica } = nino(1);
    const otra = { ...genetica, semilla: 2 } as Genetica;
    const igual = { ...genetica } as Genetica;
    expect(capacidadesIniciales(n.id, genetica).cap).not.toEqual(capacidadesIniciales(n.id, otra).cap);
    expect(capacidadesIniciales(n.id, genetica).cap).toEqual(capacidadesIniciales(n.id, igual).cap);
    const stats = RUTINA_ATLETISMO.stats;
    expect(fijosDeNino(n.id, genetica, 'atletismo', RUTINA_ATLETISMO).talento).not.toEqual(fijosDeNino(n.id, otra, 'atletismo', RUTINA_ATLETISMO).talento);
    expect(fijosDeNino(n.id, genetica, 'atletismo', RUTINA_ATLETISMO).inicial).not.toEqual(fijosDeNino(n.id, otra, 'atletismo', RUTINA_ATLETISMO).inicial);
    expect(stats.length).toBeGreaterThan(0);
    const asiste = (g: Genetica) => Array.from({ length: 60 }, (_, w) => huecosQueHace({ id: n.id, genetica: g, equipo: 'colegio', ritmo: { atletismo: 0.8 } }, 'atletismo', RUTINA_ATLETISMO, w).join());
    expect(asiste(genetica)).not.toEqual(asiste(otra));
    expect(asiste(genetica)).toEqual(asiste(igual));
    const empieza = (g: Genetica) => Array.from({ length: 40 }, (_, i) => edadDeEmpezar(`nino_${i}`, 'atletismo', 2, { padre: 'ninguna', madre: 'ninguna' }, g.semilla));
    expect(empieza(genetica)).not.toEqual(empieza(otra));
  });

  it('la caché de talentos de las capacidades distingue semillas', () => {
    fijarTalentosDeCapacidades('nino_z', CAPACIDADES_GENETICAS.map(() => 1.1), 1);
    fijarTalentosDeCapacidades('nino_z', CAPACIDADES_GENETICAS.map(() => 0.9), 2);
    const t = (semilla: number) => prepararTrabajo({ id: 'nino_z', genetica: { topes: Object.fromEntries(CAPACIDADES_GENETICAS.map((c) => [c, 60])), perks: { activos: [], pool: [] }, desfase: 0, ventaja: 1, padres: { padre: 'ninguna', madre: 'ninguna' }, semilla } as unknown as Genetica, nacimiento: -3000, cap: CAPACIDADES_GENETICAS.map(() => 10), pico: CAPACIDADES_GENETICAS.map(() => 10) }, CAPACIDADES_GENETICAS.map(() => 10), 'atletismo', RUTINA_ATLETISMO, { v: RUTINA_ATLETISMO.stats.map(() => 10), pico: RUTINA_ATLETISMO.stats.map(() => 10), ult: RUTINA_ATLETISMO.stats.map(() => 0) }, CAPACIDADES_GENETICAS.map(() => -1e9), 0);
    const a = t(1);
    const b = t(2);
    practicar(a, [{ stat: 'gen.velocidad', amount: 3 }], 1);
    practicar(b, [{ stat: 'gen.velocidad', amount: 3 }], 1);
    // Con más talento sube más: no se mezclan las semillas.
    expect(a.cap[0]).toBeGreaterThan(b.cap[0]);
  });
});
