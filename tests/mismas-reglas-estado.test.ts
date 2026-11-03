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
import { advanceToWeek } from '@ds/core';
import { nuevaPartida } from '@ds/game';
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
    let h = anotarCompeticion(undefined, 1, 'regular', 1, 8, 50);
    for (let i = 2; i <= 30; i++) h = anotarCompeticion(h, i, 'regular', 5, 8, 52);
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
