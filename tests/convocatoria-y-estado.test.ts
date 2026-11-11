import { describe, expect, it, vi } from 'vitest';
import { CARGA, ESTADO_INICIAL, GEN, valoracionDelPuesto, PAIS_CIUDAD_DE_PRUEBA, SERVICES, SHARED_EVENTS, defineModule, eficienciaDeEstado, factorDeCompeticion, registrarPais, trasUnaCompeticion, type JugadorDeEquipoView, type NpcDirectory } from '@ds/contracts';
import { MODULOS, nuevaPartida } from '@ds/game';
import { PARAMETROS_DE_CONVOCATORIA, paraConvocar, estadoDelPersonaje, posicionEquivalente, PUESTOS_DE_FUTBOL, convocarYAlinear, equipoDePartido, futbol, jugarPartido, jugadoresDelPartido, prioridadDelEntrenador, type JugadorParaConvocar } from '@ds/mod-futbol';
import { asistenciaDeLasDosUltimasSemanas, plantillaDeUnEquipo, type NpcsState } from '@ds/mod-npcs';

vi.setConfig({ testTimeout: 240000, hookTimeout: 240000 });
registrarPais(PAIS_CIUDAD_DE_PRUEBA);

/**
 * La convocatoria y la alineación por el entrenador (`MOTOR_PARTIDOS.md` §8, F2.2) y el estado de los jugadores en el partido: la condición física es la energía al empezar, la forma y la salud pesan en el rendimiento
 * (los mismos factores del atletismo) y al acabar el estado cambia como tras una carrera (`trasUnaCompeticion`), para el personaje y para todos los PNJ.
 */
const NATURAL: Record<string, string[]> = { GK: ['GK'], CB: ['CB'], LB: ['LB', 'RB'], CM: ['CM', 'CDM', 'LCR', 'RCR'], LW: ['LW', 'RW', 'LM', 'RM'], ST: ['ST', 'LST', 'RST', 'CAM'] };
/** Un jugador que vale `valor` en los puestos de su grupo y la mitad en los demás. */
const jugador = (id: string, puesto: string, valor: number, o: Partial<JugadorParaConvocar> = {}): JugadorParaConvocar => ({
  id,
  puesto,
  valor,
  valores: Object.fromEntries(PUESTOS_DE_FUTBOL.puestos.map((p) => [p.id, (NATURAL[puesto] ?? []).includes(p.id) ? valor : valor / 2])),
  estado: { ...ESTADO_INICIAL },
  ...o,
});
const PLANTILLA = (n = 18): JugadorParaConvocar[] =>
  ['GK', 'GK', 'CB', 'CB', 'CB', 'LB', 'LB', 'LB', 'CM', 'CM', 'CM', 'CM', 'LW', 'LW', 'LW', 'ST', 'ST', 'ST'].slice(0, n).map((p, i) => jugador(`j${i}`, p, 30 + i));

describe('el entrenador convoca y alinea', () => {
  it('convoca a 16 (11 titulares con la formación y 5 suplentes, con un portero de reserva) y deja fuera al resto', () => {
    const c = convocarYAlinear(PLANTILLA(18));
    expect(c.titulares).toHaveLength(11);
    expect(c.suplentes).toHaveLength(5);
    expect(c.noConvocados).toHaveLength(2);
    const puestos = c.titulares.map((t) => t.puesto).sort();
    expect(puestos).toEqual(['CB', 'CB', 'CDM', 'CM', 'CM', 'GK', 'LB', 'LW', 'RB', 'RW', 'ST'].sort());
    expect(c.suplentes.some((s) => s.puesto === 'GK')).toBe(true);
    expect(new Set([...c.titulares, ...c.suplentes].map((x) => x.id)).size).toBe(16);
  });

  it('con 14 a 16 jugadores se convoca a todos', () => {
    for (const n of [14, 15, 16]) {
      const c = convocarYAlinear(PLANTILLA(n));
      expect(c.titulares.length + c.suplentes.length).toBe(n);
      expect(c.noConvocados).toEqual([]);
    }
  });

  it('en cada puesto juega el que más vale, y un lesionado no se convoca aunque sea el mejor', () => {
    const p = PLANTILLA(18);
    const mejorDelantero = p.filter((x) => x.puesto === 'ST').sort((a, b) => b.valor - a.valor)[0];
    expect(convocarYAlinear(p).titulares.find((t) => t.puesto === 'ST')!.id).toBe(mejorDelantero.id);
    const conBaja = p.map((x) => (x.id === mejorDelantero.id ? { ...x, estado: { ...x.estado, baja: 3 } } : x));
    const c = convocarYAlinear(conBaja);
    expect(c.noConvocados).toContain(mejorDelantero.id);
    expect([...c.titulares, ...c.suplentes].some((x) => x.id === mejorDelantero.id)).toBe(false);
    expect(c.titulares).toHaveLength(11);
  });

  it('si falta alguien de un puesto, juega ahí el que mejor se adapte (aunque no sea el suyo)', () => {
    // Sin porteros: el que más vale de portero (valen la mitad fuera de lo suyo) lo cubre.
    const sinPorteros = PLANTILLA(18).filter((x) => x.puesto !== 'GK');
    const c = convocarYAlinear(sinPorteros);
    const portero = c.titulares.find((t) => t.puesto === 'GK');
    expect(portero).toBeDefined();
    expect(c.titulares).toHaveLength(11);
  });

  it('la asistencia y la relación con el entrenador pesan en el personaje: quien falta pierde el puesto ante un rival casi igual', () => {
    const p = PLANTILLA(18);
    const rivales = p.filter((x) => x.puesto === 'ST').sort((a, b) => b.valor - a.valor);
    const delantero = rivales[0];
    const segundo = rivales[1];
    const conPrioridad = (prioridad: number) => p.map((x) => (x.id === delantero.id ? { ...x, valor: segundo.valor + 0.5, valores: { ...x.valores, ST: segundo.valor + 0.5 }, prioridad } : x));
    expect(convocarYAlinear(conPrioridad(1)).titulares.find((t) => t.puesto === 'ST')!.id).toBe(delantero.id);
    expect(convocarYAlinear(conPrioridad(prioridadDelEntrenador({ asistencia: 0, relacion: 50, disciplinaDelEntrenador: 1 }))).titulares.find((t) => t.puesto === 'ST')!.id).toBe(segundo.id);
    // La prioridad: de ×0,75 (falta siempre ante un entrenador disciplinado y mala relación) a ×1,05.
    expect(prioridadDelEntrenador({ asistencia: 1, relacion: 100, disciplinaDelEntrenador: 1 })).toBeCloseTo(1 + PARAMETROS_DE_CONVOCATORIA.efectoDeLaRelacion, 5);
    expect(prioridadDelEntrenador({ asistencia: 0, relacion: 0, disciplinaDelEntrenador: 1 })).toBeCloseTo((1 - PARAMETROS_DE_CONVOCATORIA.efectoDeLaRelacion) * (1 - PARAMETROS_DE_CONVOCATORIA.penalizacionPorFaltar), 5);
    // Un entrenador menos disciplinado perdona más.
    expect(prioridadDelEntrenador({ asistencia: 0, relacion: 50, disciplinaDelEntrenador: 0 })).toBeGreaterThan(prioridadDelEntrenador({ asistencia: 0, relacion: 50, disciplinaDelEntrenador: 1 }));
    // Con mejor relación, más.
    expect(prioridadDelEntrenador({ asistencia: 1, relacion: 90, disciplinaDelEntrenador: 0.5 })).toBeGreaterThan(prioridadDelEntrenador({ asistencia: 1, relacion: 10, disciplinaDelEntrenador: 0.5 }));
  });
});

describe('la asistencia a los entrenamientos cuenta para todos', () => {
  const vista = (p: JugadorParaConvocar, asistencia: number, disciplina = 1): JugadorDeEquipoView => ({ id: p.id, nombre: p.id, puesto: p.puesto, valores: p.valores, valor: p.valor, estado: p.estado, resiliencia: 0.5, ambicion: 0.5, asistencia, disciplinaDelEntrenador: disciplina, lector: { stat: () => 30, norm: () => 0.5 } });

  it('un PNJ que falta a todo tiene la misma penalización que el personaje que falta a todo (con una relación normal); la relación solo cuenta en el personaje', () => {
    for (const disciplina of [0, 0.3, 0.7, 1]) {
      const pnj = prioridadDelEntrenador({ asistencia: 0, disciplinaDelEntrenador: disciplina });
      const personaje = prioridadDelEntrenador({ asistencia: 0, relacion: 50, disciplinaDelEntrenador: disciplina });
      expect(pnj).toBeCloseTo(personaje, 10);
      expect(pnj).toBeCloseTo(1 - PARAMETROS_DE_CONVOCATORIA.penalizacionPorFaltar * (0.5 + 0.5 * disciplina), 10);
      // La relación (±5 %) solo la tiene el personaje: con buena relación pesa más que un PNJ igual.
      expect(prioridadDelEntrenador({ asistencia: 0, relacion: 100, disciplinaDelEntrenador: disciplina })).toBeGreaterThan(pnj);
    }
    // Sin faltar, un PNJ no pierde nada.
    expect(prioridadDelEntrenador({ asistencia: 1, disciplinaDelEntrenador: 1 })).toBe(1);
  });

  it('un PNJ que falta a los entrenamientos pierde el puesto ante uno casi igual que no falta', () => {
    const p = PLANTILLA(18);
    const rivales = p.filter((x) => x.puesto === 'ST').sort((a, b) => b.valor - a.valor);
    const [mejor, segundo] = rivales;
    const mejorCasiIgual = { ...mejor, valor: segundo.valor + 0.5, valores: { ...mejor.valores, ST: segundo.valor + 0.5 } };
    const plantilla = (asistencia: number) => p.map((x) => (x.id === mejor.id ? paraConvocar(vista(mejorCasiIgual, asistencia)) : paraConvocar(vista(x, 1))));
    expect(convocarYAlinear(plantilla(1)).titulares.find((t) => t.puesto === 'ST')!.id).toBe(mejor.id);
    expect(convocarYAlinear(plantilla(0)).titulares.find((t) => t.puesto === 'ST')!.id).toBe(segundo.id);
  });

  it('en el mundo, la asistencia de cada jugador sale de las sesiones a las que va (`huecosQueHace`) en las dos últimas semanas, y su entrenador tiene una disciplina', () => {
    const g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    const s = g.moduleState<NpcsState>('npcs') as NpcsState;
    const pob = s.poblaciones!.find((p) => p.deporte === 'futbol')!;
    const semana = 12;
    const plantilla = plantillaDeUnEquipo(s.npcs, [pob], 'futbol', 'club_grande', 'infantil', 'A', 0, semana);
    expect(plantilla.length).toBeGreaterThanOrEqual(14);
    for (const j of plantilla) {
      const n = s.npcs.find((x) => x.id === j.id)!;
      expect(j.asistencia).toBeCloseTo(asistenciaDeLasDosUltimasSemanas(n as never, 'futbol', pob.rutina!, semana), 10);
      expect(j.asistencia).toBeGreaterThanOrEqual(0);
      expect(j.asistencia).toBeLessThanOrEqual(1);
      expect(j.disciplinaDelEntrenador).toBeGreaterThanOrEqual(0);
      expect(j.disciplinaDelEntrenador).toBeLessThanOrEqual(1);
    }
    expect(new Set(plantilla.map((j) => j.disciplinaDelEntrenador)).size).toBe(1); // el mismo entrenador
    // Casi todos van a casi todo (la asistencia del niño es de un 55 % a un 100 %), pero no todos a todo.
    expect(plantilla.reduce((t, j) => t + j.asistencia, 0) / plantilla.length).toBeGreaterThan(0.55);
    expect(plantilla.some((j) => j.asistencia < 1)).toBe(true);
    // Otra semana, otras faltas.
    const otra = plantillaDeUnEquipo(s.npcs, [pob], 'futbol', 'club_grande', 'infantil', 'A', 0, semana + 5);
    expect(otra.map((j) => j.asistencia)).not.toEqual(plantilla.map((j) => j.asistencia));
  });
});

describe('el estado del jugador en el partido', () => {
  const lector = (v: number) => ({ stat: (id: string) => (id.startsWith('gen.') ? v : v), norm: () => 0.5 });
  const vista = (p: JugadorParaConvocar, estado = p.estado): JugadorDeEquipoView => ({ id: p.id, nombre: p.id, puesto: p.puesto, valores: p.valores, valor: p.valor, estado, resiliencia: 0.5, ambicion: 0.5, asistencia: 1, disciplinaDelEntrenador: 0.5, lector: lector(p.valor) });
  const equipo = (id: string, estado: Partial<typeof ESTADO_INICIAL>) => {
    const plantilla = PLANTILLA(18).map((p) => jugador(`${id}${p.id}`, p.puesto, 30, { estado: { ...ESTADO_INICIAL, ...estado } }));
    return equipoDePartido(id, id, plantilla.map((p) => vista(p)), convocarYAlinear(plantilla));
  };

  it('la condición física es la energía con que empieza y la forma y la salud entran en el rendimiento con los factores del atletismo', () => {
    const e = equipo('a', { fisica: 55, forma: 20, salud: 100 });
    const j = e.jugadores[0];
    expect(j.energia).toBe(55);
    expect(j.rinde).toBeCloseTo(factorDeCompeticion(eficienciaDeEstado({ ...ESTADO_INICIAL, fisica: 55, forma: 20 }, false)), 10);
    expect(equipo('b', { forma: 90 }).jugadores[0].rinde!).toBeGreaterThan(equipo('b', { forma: 10 }).jugadores[0].rinde!);
  });

  it('un equipo cansado y en baja forma rinde menos que el mismo equipo descansado y en forma', () => {
    const r = Array.from({ length: 300 }, (_, i) => jugarPartido(equipo('a', { fisica: 30, forma: 10, salud: 70 }), equipo('b', { fisica: 100, forma: 90, salud: 100 }), { id: `p${i}`, semilla: 1, categoria: 'infantil' }));
    const cansados = r.filter((x) => x.goles[0] > x.goles[1]).length;
    const frescos = r.filter((x) => x.goles[1] > x.goles[0]).length;
    expect(frescos).toBeGreaterThan(cansados * 1.2);
  });

  it('al acabar, a los que jugaron les cambia el estado como tras una carrera: la valoración va de −1 a +1 por el resultado y la nota', () => {
    const r = jugarPartido(equipo('a', {}), equipo('b', {}), { id: 'x', semilla: 1, categoria: 'infantil', cambios: { maximo: 5, despuesDeTramos: [1, 3, 4] } });
    for (const lado of [0, 1] as const) {
      const todos = jugadoresDelPartido(r, lado);
      // Salen los convocados: los que no jugaron, con 0 minutos y sin cambiar su forma.
      for (const x of todos.filter((y) => y.minutos === 0)) expect(x.valoracion).toBe(0);
      const js = todos.filter((y) => y.minutos > 0);
      expect(js.length).toBeGreaterThanOrEqual(11);
      for (const x of js) {
        expect(x.minutos).toBeGreaterThan(0);
        expect(x.valoracion).toBeGreaterThanOrEqual(-1);
        expect(x.valoracion).toBeLessThanOrEqual(1);
      }
      expect(js.every((x) => x.npcId.startsWith(lado === 0 ? 'a' : 'b'))).toBe(true);
    }
    // El que ganó con buena nota sube más que el que perdió con mala.
    const ganador = r.goles[0] === r.goles[1] ? undefined : r.goles[0] > r.goles[1] ? 0 : 1;
    if (ganador !== undefined) expect(Math.max(...jugadoresDelPartido(r, ganador).filter((x) => x.minutos > 0).map((x) => x.valoracion))).toBeGreaterThan(Math.min(...jugadoresDelPartido(r, (1 - ganador) as 0 | 1).filter((x) => x.minutos > 0).map((x) => x.valoracion)));
  });
});

describe('el personaje entra en el partido por las mismas reglas', () => {
  it('su estado es el de cualquier jugador: la energía es la condición física y la motivación, la moral', () => {
    const stats: Record<string, number> = { [GEN.energia]: 71, [GEN.motivacion]: 55, [GEN.forma]: 64, [GEN.salud]: 90, [GEN.baja]: 0 };
    expect(estadoDelPersonaje({ stat: (id) => stats[id] ?? 0, norm: () => 0.5 })).toEqual({ fisica: 71, moral: 55, forma: 64, salud: 90 });
    expect(estadoDelPersonaje({ stat: (id) => (id === GEN.baja ? 3 : stats[id] ?? 0), norm: () => 0.5 }).baja).toBe(3);
  });

  it('su valoración del partido se traduce al puesto de una carrera: la misma reacción que tras competir', () => {
    for (const v of [-1, -0.5, 0, 0.5, 1]) {
      const { position, total } = posicionEquivalente(v);
      expect(valoracionDelPuesto(position, total)).toBeCloseTo(v, 1);
    }
  });
});

describe('en el mundo, el estado de los PNJ cambia con el partido', () => {
  it('quienes jugaron un partido pierden condición física (CARGA.competicion) y cambian su moral y su forma como tras una carrera; los que no jugaron, no', () => {
    // Un módulo de prueba juega un partido entre dos equipos del mundo con el servicio de plantillas y emite el evento del partido.
    let datos: { jugaron: string[]; antes: Record<string, unknown>; valoraciones: Record<string, number> } | undefined;
    const partido = defineModule<Record<string, never>>({
      id: 'partidoprueba',
      name: 'Partido de prueba',
      dependsOn: ['gen'],
      initState: () => ({}),
      actions: [{
        id: 'partidoprueba.jugar',
        name: 'Jugar',
        tags: [],
        duration: 1,
        run: (ctx) => {
          const dir = ctx.service<NpcDirectory>(SERVICES.npcs)!;
          const lista = (club: string) => dir.plantillaDelEquipo!('futbol', club, 'infantil', 'A');
          const a = lista('club_grande');
          const b = lista('club_mediano');
          const ea = equipoDePartido('a', 'A', a, convocarYAlinear(a.map((j) => paraConvocar(j))));
          const eb = equipoDePartido('b', 'B', b, convocarYAlinear(b.map((j) => paraConvocar(j))));
          const r = jugarPartido(ea, eb, { id: 'prueba', semilla: 1, categoria: 'infantil' });
          const jugadores = [...jugadoresDelPartido(r, 0), ...jugadoresDelPartido(r, 1)].filter((x) => x.minutos > 0);
          const todos = [...a, ...b];
          datos = { jugaron: jugadores.map((x) => x.npcId), antes: Object.fromEntries(todos.map((j) => [j.id, j.estado])), valoraciones: Object.fromEntries(jugadores.map((x) => [x.npcId, x.valoracion])) };
          ctx.emit({ type: SHARED_EVENTS.PARTIDO_MUNDO, data: { deporte: 'futbol', semana: 1, categoria: 'infantil', jugadores } });
        },
      }],
    });
    const g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol, partido]);
    expect(g.perform('partidoprueba.jugar').ok).toBe(true);
    const npcs = (g.moduleState<NpcsState>('npcs') as NpcsState).npcs;
    expect(datos!.jugaron.length).toBeGreaterThanOrEqual(22);
    for (const id of datos!.jugaron) {
      const antes = datos!.antes[id] as typeof ESTADO_INICIAL;
      const ahora = npcs.find((n) => n.id === id)!.estado!;
      const resil = (npcs.find((n) => n.id === id)!.cap?.[0] ?? 50) / 100;
      void resil;
      expect(ahora.fisica, id).toBeCloseTo(Math.max(0, antes.fisica - CARGA.competicion), 5);
      expect(Math.sign(ahora.forma - antes.forma), id).toBe(Math.sign(trasUnaCompeticion(antes, datos!.valoraciones[id], 0.5).forma - antes.forma));
    }
    // Los que no jugaron (los no convocados) siguen igual.
    const noJugaron = Object.keys(datos!.antes).filter((id) => !datos!.jugaron.includes(id));
    for (const id of noJugaron) expect(npcs.find((n) => n.id === id)!.estado ?? ESTADO_INICIAL).toEqual(datos!.antes[id]);
  });
});
