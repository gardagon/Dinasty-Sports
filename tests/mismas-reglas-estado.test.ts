import { describe, expect, it } from 'vitest';
import {
  CARGA,
  ESTADO_INICIAL,
  eficienciaDeEstado,
  factorPorCansancio,
  factorPorSalud,
  pasoDeSemanaDelEstado,
  trasUnaCompeticion,
  valoracionDelPuesto,
  type EstadoDeJugador,
} from '@ds/contracts';
import { GEN, factorPorForma, formaTrasLaSemana, formaTrasUnaCompeticion, gravedadDeLesion, riesgoDeLesion, fatigaDeLaSemana } from '@ds/contracts';
import { Game, advanceToWeek } from '@ds/core';
import { personaje } from '@ds/mod-personaje';
import { defineModule, SHARED_EVENTS } from '@ds/contracts';
import { cargarPartida, nuevaPartida } from '@ds/game';
import { hacer, posible } from './ayudas';
import { DATOS_ATLETISMO } from '@ds/mod-atletismo';
import { anotarCompeticion, type NpcsState } from '@ds/mod-npcs';
import { semanaDeNino, listaDeSesion, type NinoDeportista } from '../modules/npcs/src/semana';
import { rendimiento } from '@ds/mod-atletismo';

/**
 * Personaje y PNJ con las mismas reglas: ESTADO DE LOS JUGADORES (`docs/MISMAS_REGLAS.md`, P2a-2). Condición física, moral, forma y salud: se actualizan cada
 * semana y en cada competición, y rinden con los mismos factores que la energía, la motivación y la salud del personaje.
 */

const RUTINA = DATOS_ATLETISMO.paises.espana.poblacion.rutina!;
const SANO = (e: Partial<EstadoDeJugador> = {}): EstadoDeJugador => ({ ...ESTADO_INICIAL, ...e });
const SEMANA = { sesiones: 0, azarDeLesion: 0.999, azarDeGravedad: 0.5, animo: 0.5, constitucion: 50 };

describe('el estado de un jugador', () => {
  it('rinde con los mismos factores que el personaje: cansancio y salud', () => {
    const descansado = eficienciaDeEstado(SANO({ fisica: 100 }));
    const agotado = eficienciaDeEstado(SANO({ fisica: 10 }));
    expect(agotado / descansado).toBeCloseTo(factorPorCansancio(10), 5);
    const enfermo = eficienciaDeEstado(SANO({ salud: 20 }));
    expect(enfermo / descansado).toBeCloseTo(factorPorSalud(20), 5);
  });

  it('descansar recupera la condición; las sesiones y las competiciones la gastan', () => {
    const cansado = SANO({ fisica: 40 });
    expect(pasoDeSemanaDelEstado(cansado, SEMANA).fisica).toBeGreaterThan(cansado.fisica);
    const entrenando = pasoDeSemanaDelEstado(SANO({ fisica: 100 }), { ...SEMANA, sesiones: 3 }).fisica;
    expect(entrenando).toBeLessThan(100);
    expect(trasUnaCompeticion(SANO({ fisica: 90 }), 0, 0.5).fisica).toBe(90 - CARGA.competicion);
  });

  it('ganar anima y perder desanima; la resiliencia amortigua el golpe', () => {
    const gana = trasUnaCompeticion(SANO(), valoracionDelPuesto(1, 8), 0.5);
    const pierde = trasUnaCompeticion(SANO(), valoracionDelPuesto(8, 8), 0.5);
    expect(gana.moral).toBeGreaterThan(SANO().moral);
    expect(pierde.moral).toBeLessThan(SANO().moral);
    expect(gana.forma).toBeGreaterThan(pierde.forma);
    expect(SANO().moral - trasUnaCompeticion(SANO(), -1, 1).moral).toBeLessThan(SANO().moral - trasUnaCompeticion(SANO(), -1, 0).moral);
  });

  it('una lesión da semanas de baja, quita salud y se cura', () => {
    let e = pasoDeSemanaDelEstado(SANO(), { ...SEMANA, azarDeLesion: 0, azarDeGravedad: 0.5 });
    expect(e.baja).toBeGreaterThan(0);
    expect(e.salud).toBeLessThan(100);
    for (let i = 0; i < 12 && e.baja; i++) e = pasoDeSemanaDelEstado(e, SEMANA);
    expect(e.baja).toBeUndefined();
    for (let i = 0; i < 6; i++) e = pasoDeSemanaDelEstado(e, SEMANA);
    expect(e.salud).toBe(100);
  });

  it('el historial guarda totales y solo las últimas competiciones', () => {
    let h = anotarCompeticion(undefined, { semana: 1, tipo: 'regular', puesto: 1, total: 8, marca: 50 });
    for (let i = 2; i <= 30; i++) h = anotarCompeticion(h, { semana: i, tipo: 'regular', puesto: 5, total: 8, marca: 52 });
    expect(h.pruebas).toBe(30);
    expect(h.victorias).toBe(1);
    expect(h.podios).toBe(1);
    expect(h.mejorMarca).toBe(50);
    expect(h.ultimas.length).toBeLessThanOrEqual(12);
  });
});

describe('un jugador de baja o cansado entrena menos', () => {
  const g = nuevaPartida({ seed: 31 });
  const n = (g.moduleState<NpcsState>('npcs') as NpcsState).npcs.find((x) => x.hab?.atletismo && x.equipo && x.genetica && x.nacimiento !== undefined)!;
  const lista = (semana: number, hueco: number, lector: { stat(id: string): number }) => listaDeSesion(RUTINA, (id) => lector.stat(id), ['atletismo', n.id, semana, hueco]);
  const semana = (estado?: { baja: boolean; eficiencia: number }) => semanaDeNino(n as unknown as NinoDeportista, 'atletismo', RUTINA, rendimiento, 7 * 30, lista, estado);

  it('de baja no hace ninguna sesión', () => {
    expect(semana({ baja: true, eficiencia: 1 }).sesiones).toBe(0);
  });

  it('con menos eficiencia sube menos', () => {
    const suma = (r: ReturnType<typeof semana>) => r.hab.v.reduce((a, b) => a + b, 0);
    const bien = suma(semana({ baja: false, eficiencia: 1.1 }));
    const mal = suma(semana({ baja: false, eficiencia: 0.6 }));
    expect(mal).toBeLessThanOrEqual(bien);
  });
});

describe('el mundo juega aunque el personaje no mire', () => {
  it('tras unas semanas los jugadores tienen estado y los atletas, historial de carreras con totales coherentes', () => {
    const g = nuevaPartida({ seed: 31 });
    advanceToWeek(g, 'gen.descansar', 14, 1, 8);
    const { npcs } = g.moduleState<NpcsState>('npcs') as NpcsState;
    const jugadores = npcs.filter((x) => x.hab?.atletismo);
    expect(jugadores.length).toBeGreaterThan(80);
    expect(jugadores.every((x) => x.estado && x.estado.fisica >= 0 && x.estado.fisica <= 100)).toBe(true);
    const con = jugadores.filter((x) => x.historial?.atletismo);
    // Los que se presentan (los de baja y los peores faltan más) tienen carreras anotadas; ninguno tiene más podios que pruebas.
    expect(con.length).toBeGreaterThan(jugadores.length * 0.5);
    for (const x of con) {
      const h = x.historial!.atletismo;
      expect(h.victorias).toBeLessThanOrEqual(h.podios);
      expect(h.podios).toBeLessThanOrEqual(h.pruebas);
      expect(h.ultimas.length).toBeLessThanOrEqual(12);
    }
    // En cada prueba gana uno: las victorias del mundo no pueden ser más que las pruebas disputadas (ni cero).
    const victorias = con.reduce((a, x) => a + x.historial!.atletismo.victorias, 0);
    expect(victorias).toBeGreaterThan(0);
  }, 120000);
});

describe('el personaje se lesiona y tiene forma con las mismas reglas que los demás', () => {
  it('misma carga y misma constitución dan el mismo riesgo y la misma gravedad (el estado de un PNJ y la función que usa el personaje)', () => {
    for (const sesiones of [0, 2, 5]) {
      for (const constitucion of [10, 50, 90]) {
        const fatiga = fatigaDeLaSemana(SANO().fisica, sesiones);
        const riesgo = riesgoDeLesion(fatiga, constitucion);
        // Por debajo del riesgo, el PNJ se lesiona; por encima, no.
        const ent = { sesiones, azarDeGravedad: 0.7, animo: 0.5, constitucion };
        expect(pasoDeSemanaDelEstado(SANO(), { ...ent, azarDeLesion: riesgo * 0.99 }).baja).toBe(gravedadDeLesion(0.7).baja);
        expect(pasoDeSemanaDelEstado(SANO(), { ...ent, azarDeLesion: riesgo * 1.01 }).baja).toBeUndefined();
        expect(pasoDeSemanaDelEstado(SANO(), { ...ent, azarDeLesion: 0 }).salud).toBe(gravedadDeLesion(0.7).salud);
      }
    }
    // Más carga, más riesgo; más constitución, menos.
    expect(riesgoDeLesion(60, 50)).toBeGreaterThan(riesgoDeLesion(10, 50));
    expect(riesgoDeLesion(30, 90)).toBeLessThan(riesgoDeLesion(30, 10));
  });

  it('la misma racha de resultados da la misma forma al personaje y a un PNJ', () => {
    // El personaje: tres resultados seguidos (el último puesto, la victoria, un puesto medio) emitidos con el evento compartido de resultados.
    const racha: [number, number][] = [[8, 8], [1, 8], [4, 8]];
    // Un módulo de prueba que emite resultados de competición (como cualquier deporte).
    const resultados = defineModule<Record<string, never>>({
      id: 'resultados',
      name: 'Resultados',
      dependsOn: ['gen'],
      initState: () => ({}),
      actions: racha.map(([position, total], i) => ({
        id: `resultados.r${i}`,
        name: `Resultado ${i}`,
        tags: [],
        duration: 1,
        run: (ctx) => ctx.emit({ type: SHARED_EVENTS.COMPETITION_RESULT, data: { module: 'x', discipline: 'x', position, total, mark: 60, unit: 's', participants: [] } }),
      })),
    });
    const g = Game.create([personaje, resultados], { seed: 7 });
    let esperada = g.stat(GEN.forma);
    racha.forEach(([position, total], i) => {
      expect(g.perform(`resultados.r${i}`).ok).toBe(true);
      esperada = formaTrasUnaCompeticion(esperada, valoracionDelPuesto(position, total));
    });
    expect(g.stat(GEN.forma)).toBeCloseTo(esperada, 6);
    // Un PNJ con la misma forma de partida: la misma racha por su camino (`trasUnaCompeticion`) da la misma forma.
    let e = SANO({ forma: 60 });
    for (const [position, total] of racha) e = trasUnaCompeticion(e, valoracionDelPuesto(position, total), 0.5);
    expect(e.forma).toBeCloseTo(esperada, 6);
    // Y la forma se olvida igual cada semana.
    expect(formaTrasLaSemana(90, 1)).toBeLessThan(90);
    expect(factorPorForma(80)).toBeGreaterThan(factorPorForma(20));
  });

  it('una lesión del personaje le impide competir y entrenar con el club', () => {
    // Busca una partida (semilla) en que se lesione pronto: con constitución muy baja el riesgo semanal es mayor.
    let g;
    for (let seed = 1; seed <= 40 && !g; seed++) {
      const base = nuevaPartida({ seed });
      const guardado = base.serialize();
      guardado.stats['gen.constitucion'] = 0;
      const p = cargarPartida(guardado);
      for (let w = 3; w <= 44; w++) {
        advanceToWeek(p, 'gen.descansar', w, 5, 10);
        if (p.stat(GEN.baja) > 0) {
          g = p;
          break;
        }
      }
    }
    expect(g, 'ninguna semilla se lesionó en 40 semanas').toBeDefined();
    if (!g) return;
    expect(g.stat(GEN.baja)).toBeGreaterThan(0);
    expect(g.stat(GEN.salud)).toBeLessThan(90);
    expect(g.preview('atletismo.carrera')!.available).toBe(false);
    expect(g.preview('atletismo.carrera')!.reason).toMatch(/baja|lesi/i);
    expect(posible(g, 'atletismo.club_sesion')).toBe(false);
    // Se cura: pasadas las semanas de baja vuelve a poder competir.
    const semanas = g.stat(GEN.baja);
    advanceToWeek(g, 'gen.descansar', g.time.week + semanas + 1, 5, 10);
    expect(g.stat(GEN.baja)).toBe(0);
  }, 120000);
});

describe('el personaje corre siempre que decide competir', () => {
  it('en cada jornada normal entra en la prueba y sale en la clasificación', () => {
    const g = nuevaPartida({ seed: 51 });
    for (let w = 5; w <= 9; w++) {
      advanceToWeek(g, 'gen.descansar', w, 5, 10);
      const r = hacer(g, 'atletismo.carrera');
      expect(r.ok, `semana ${w}`).toBe(true);
      const tabla = r.log.find((l) => l.table)!.table!;
      expect(tabla.rows.some((f) => f[1] === 'Tú')).toBe(true);
      expect(tabla.rows.length).toBeGreaterThanOrEqual(2);
    }
  }, 60000);
});

describe('el historial de un jugador guarda una entrada por temporada', () => {
  it('con categoría, club, pruebas, victorias, podios y mejor marca', () => {
    let h = anotarCompeticion(undefined, { semana: 5, tipo: 'regular', puesto: 1, total: 12, marca: 60, curso: 0, categoria: 'sub12', club: 'cc' });
    h = anotarCompeticion(h, { semana: 6, tipo: 'regular', puesto: 5, total: 12, marca: 61, curso: 0, categoria: 'sub12', club: 'cc' });
    h = anotarCompeticion(h, { semana: 60, tipo: 'regular', puesto: 3, total: 9, marca: 59, curso: 1, categoria: 'sub12', club: 'cc' });
    expect(h.temporadas).toEqual([
      { curso: 0, categoria: 'sub12', club: 'cc', pruebas: 2, victorias: 1, podios: 1, mejorMarca: 60 },
      { curso: 1, categoria: 'sub12', club: 'cc', pruebas: 1, victorias: 0, podios: 1, mejorMarca: 59 },
    ]);
    expect(h.pruebas).toBe(3);
  });
});
