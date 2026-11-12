import { beforeAll, describe, expect, it, vi } from 'vitest';
import { PAIS_CIUDAD_DE_PRUEBA, SERVICES, SHARED_EVENTS, defineModule, registrarPais, type NpcDirectory, type PartidoDeJugador, type PartidosService, type PresenciaService } from '@ds/contracts';
import { advanceToWeek, advanceUntil } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { CONOCIMIENTO, DIA_DE_PARTIDO, futbol, type FutbolState } from '@ds/mod-futbol';
import { categoriaDe, edadDeJuego, entrenadorDelEquipo, type NpcsState } from '@ds/mod-npcs';
import { hacer, llegarA, posible } from './ayudas';

vi.setConfig({ testTimeout: 480000, hookTimeout: 480000 });
registrarPais(PAIS_CIUDAD_DE_PRUEBA);

/**
 * El día de partido de los PNJ (`MOTOR_PARTIDOS.md` §15, 3.ª parte): con las mismas reglas que el personaje, los convocados de cada equipo y sus entrenadores están en el campo desde su convocatoria (los impuntuales, desde que llegan), en el
 * vestuario media hora antes del partido, jugando durante él y otra vez en el vestuario al acabar; ganan conocimiento viendo el partido anterior de su campo; y el personaje puede ver partidos de otros como espectador.
 */
describe('el día de partido de los PNJ', () => {
  let g: ReturnType<typeof nuevaPartida>;
  const semana = 7;
  const partidos = () => g.service<PartidosService>(SERVICES.partidos)!;
  const presencia = () => g.service<PresenciaService>(SERVICES.presencia)!;
  const hasta = (minuto: number): void => advanceUntil(g, 'gen.esperar', (t) => t.minute >= minuto);
  const npcs = () => (g.moduleState<NpcsState>('npcs') as NpcsState).npcs;
  beforeAll(() => {
    g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    advanceToWeek(g, 'gen.descansar', 1, 3, 15);
    if (posible(g, 'futbol.apuntarse_colegio')) hacer(g, 'futbol.apuntarse_colegio');
    // El lunes se reparte el calendario de la semana.
    advanceToWeek(g, 'gen.descansar', semana, 0, 9);
  });

  it('el servicio da los partidos de la semana y, de cada convocado, cuándo llega (puntual o tarde), dónde y cuánto aprende viendo el partido anterior; también de cada equipo, para su entrenador', () => {
    const semanal = partidos().deLaSemana();
    expect(semanal.length).toBeGreaterThanOrEqual(5);
    for (const p of semanal) {
      expect(p.saque).toBeGreaterThan(g.time.minute);
      expect(p.lugar).toBe('campo_municipal');
    }
    const equipo = semanal[0];
    const [club, letra] = equipo.local.split('|');
    const delEquipo = partidos().deEquipo(club, equipo.categoria, letra)!;
    expect(delEquipo.saque).toBe(equipo.saque);
    // El entrenador, a la hora de la convocatoria, sin retraso.
    expect(delEquipo.llegada).toBe(equipo.saque - DIA_DE_PARTIDO.convocatoria);
    expect(delEquipo.tarde).toBe(0);
    const jugadores = npcs().filter((n) => n.deporte === 'futbol').map((n) => ({ id: n.id, p: partidos().deJugador(n.id) })).filter((x): x is { id: string; p: PartidoDeJugador } => !!x.p);
    // Convocados: 16 por equipo como mucho; con todos los equipos, cientos.
    expect(jugadores.length).toBeGreaterThan(100);
    for (const { p } of jugadores) {
      expect(p.llegada).toBeGreaterThanOrEqual(p.saque - DIA_DE_PARTIDO.convocatoria);
      expect(p.llegada - (p.saque - DIA_DE_PARTIDO.convocatoria)).toBe(p.tarde);
      expect(p.vestuario).toBe('vestuario_campo_municipal');
    }
    // Hay puntuales (la mayoría), algún impuntual y quien ve el partido anterior de su campo.
    expect(jugadores.filter(({ p }) => p.tarde <= DIA_DE_PARTIDO.tolerancia).length).toBeGreaterThan(jugadores.length * 0.6);
    expect(jugadores.some(({ p }) => p.tarde > DIA_DE_PARTIDO.tolerancia)).toBe(true);
    expect(jugadores.some(({ p }) => p.conocimiento > 0)).toBe(true);
    // Ve menos del anterior quien llega tarde que quien llega a la hora, y nada quien no tiene partido antes en su campo.
    expect(Math.max(...jugadores.map(({ p }) => p.conocimiento))).toBeLessThanOrEqual(DIA_DE_PARTIDO.conocimientoPorPartidoVisto);
  });

  it('en el mapa: en el campo desde que llegan, en el vestuario media hora antes, jugando durante el partido y otra vez en el vestuario al acabar; los impuntuales llegan más tarde; el entrenador, desde la convocatoria', () => {
    const jugadores = npcs().filter((n) => n.deporte === 'futbol').map((n) => ({ n, p: partidos().deJugador(n.id) })).filter((x): x is { n: (typeof x)['n']; p: PartidoDeJugador } => !!x.p);
    // Un puntual y un impuntual de partidos a la misma hora (el mismo día y saque), para seguirlos en una sola línea de tiempo.
    const puntual = jugadores.find(({ p }) => p.tarde === 0 && jugadores.some((x) => x.p.saque === p.saque && x.p.tarde > DIA_DE_PARTIDO.tolerancia))!;
    const tarde = jugadores.find(({ p }) => p.tarde > DIA_DE_PARTIDO.tolerancia && p.saque === puntual.p.saque)!;
    expect(puntual && tarde).toBeTruthy();
    const { saque } = puntual.p;
    const donde = (x: typeof puntual): string | null | undefined => presencia().donde(x.n.id);
    hasta(puntual.p.llegada - 5);
    expect(donde(puntual), 'puntual antes de llegar').not.toBe('campo_municipal');
    hasta(puntual.p.llegada + 1);
    expect(donde(puntual), 'puntual llega a la convocatoria').toBe('campo_municipal');
    // El impuntual todavía no ha llegado.
    expect(donde(tarde), 'impuntual aún sin llegar').not.toBe('campo_municipal');
    // El entrenador está en el campo desde la convocatoria.
    expect(presencia().en('campo_municipal').some((x) => x.role === 'entrenador')).toBe(true);
    hasta(tarde.p.llegada + 1);
    expect(donde(tarde), 'impuntual llega tarde').toBe('campo_municipal');
    hasta(saque - DIA_DE_PARTIDO.vestuario + 1);
    expect(donde(puntual), 'puntual en el vestuario').toBe('vestuario_campo_municipal');
    expect(donde(tarde), 'impuntual en el vestuario').toBe('vestuario_campo_municipal');
    hasta(saque + 5);
    // Jugando: sigue en el campo pero ocupado (no se le puede hablar).
    for (const x of [puntual, tarde]) {
      expect(presencia().ocupadosEn('campo_municipal').some((o) => o.persona.id === x.n.id && /jugando/.test(o.motivo)), `${x.n.id} jugando`).toBe(true);
      expect(presencia().en('campo_municipal').some((y) => y.id === x.n.id)).toBe(false);
    }
    hasta(saque + 100);
    expect(donde(puntual), 'puntual acabado').toBe('vestuario_campo_municipal');
    hasta(saque + 200);
    expect(donde(puntual), 'puntual ya se ha ido').not.toBe('vestuario_campo_municipal');
    // El de la convocatoria a tiempo llegó antes que el impuntual.
    expect(puntual.p.llegada).toBeLessThan(tarde.p.llegada);
  });
});

describe('lo que dejan en los PNJ el conocimiento y llegar tarde (el mismo evento de un partido del mundo)', () => {
  it('ver el partido anterior sube el conocimiento (también del convocado que no juega) y llegar tarde baja la relación con el entrenador; quien no hace ni una cosa ni otra no cambia', () => {
    let ids: string[] = [];
    const modulo = defineModule({
      id: 'diaprueba',
      name: 'Día de prueba',
      description: 'Emite un partido del mundo con conocimiento y llegadas tarde.',
      dependsOn: ['gen'],
      actions: [{
        id: 'diaprueba.emitir',
        name: 'Emitir',
        tags: [],
        group: 'prueba',
        duration: 1,
        run: (ctx) => {
          ctx.emit({
            type: SHARED_EVENTS.PARTIDO_MUNDO,
            data: {
              deporte: 'futbol',
              semana: 20,
              curso: 0,
              categoria: 'infantil',
              jugadores: [
                { npcId: ids[0], minutos: 90, valoracion: 0, titular: true, puesto: 'CM', goles: 0, asistencias: 0, nota: 6, aprendizaje: 1, conocimiento: 1.5, tarde: 20 },
                { npcId: ids[1], minutos: 0, valoracion: 0, titular: false, puesto: 'CM', conocimiento: 1.5 },
                { npcId: ids[2], minutos: 90, valoracion: 0, titular: true, puesto: 'CM', goles: 0, asistencias: 0, nota: 6, aprendizaje: 1 },
                { npcId: ids[3], minutos: 0, valoracion: 0, falta: true },
              ],
            },
          });
        },
      }],
    });
    const g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol, modulo]);
    const jugadores = (g.moduleState<NpcsState>('npcs') as NpcsState).npcs.filter((n) => n.deporte === 'futbol' && n.hab?.futbol && n.genetica && (edadDeJuego(n, 0) ?? 0) >= 10); // no de benjamín: al empezar la partida (antes del primer entrenamiento) su relación con el entrenador aún no cuenta
    ids = jugadores.slice(0, 4).map((n) => n.id);
    const conocimiento = (id: string): number => {
      const n = (g.moduleState<NpcsState>('npcs') as NpcsState).npcs.find((x) => x.id === id)!;
      const poblacion = (g.moduleState<NpcsState>('npcs') as NpcsState).poblaciones!.find((p) => p.deporte === 'futbol')!;
      return n.hab!.futbol.v[poblacion.rutina!.stats.findIndex((s) => s.id === CONOCIMIENTO)];
    };
    const antes = ids.map(conocimiento);
    expect(g.perform('diaprueba.emitir').ok).toBe(true);
    const despues = ids.map(conocimiento);
    // El que jugó y vio el partido anterior y el suplente que lo vio suben; el que no lo vio, no.
    expect(despues[0]).toBeGreaterThan(antes[0]);
    expect(despues[1]).toBeGreaterThan(antes[1]);
    expect(despues[2]).toBe(antes[2]);
    // Llegar tarde baja la relación con el entrenador (−3 de afinidad); quien llegó a tiempo no pierde nada.
    const todos = (g.moduleState<NpcsState>('npcs') as NpcsState).npcs;
    const estado = g.moduleState<NpcsState>('npcs') as NpcsState;
    const pob = estado.poblaciones!.find((q) => q.deporte === 'futbol')!;
    const inicioCurso = (g.time.week - g.time.schoolWeek) * 7;
    const deSuEquipo = (id: string) => {
      const n = todos.find((x) => x.id === id)!;
      return entrenadorDelEquipo(todos, pob, n.equipo!, categoriaDe(pob, edadDeJuego(n, inicioCurso)!)!, n.letra!.futbol)!;
    };
    const entrenador = deSuEquipo(ids[0]);
    expect(todos.find((n) => n.id === ids[0])!.afin).toEqual({ [entrenador.id]: [-3, -1] });
    expect(todos.find((n) => n.id === ids[1])!.afin).toBeUndefined();
    expect(todos.find((n) => n.id === ids[2])!.afin).toBeUndefined();
    // La relación es con ese entrenador como persona: en la plantilla de su equipo pesa, y si pasa a otro equipo con otro entrenador no se la lleva; si vuelve a coincidir con él, sigue ahí.
    const n0 = todos.find((n) => n.id === ids[0])!;
    const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
    const relacion = (letra: string): number | undefined => dir.plantillaDelEquipo!('futbol', n0.equipo!, categoriaDe(pob, edadDeJuego(n0, inicioCurso)!)!.id, letra).find((j) => j.id === ids[0])?.relacionConElEntrenador;
    const letra0 = n0.letra!.futbol;
    expect(relacion(letra0)).toBeCloseTo(48.5, 5);
    const otra = (['A', 'B', 'C', 'D'] as const).find((l) => l !== letra0 && entrenadorDelEquipo(todos, pob, n0.equipo!, categoriaDe(pob, edadDeJuego(n0, inicioCurso)!)!, l)?.id !== entrenador.id);
    if (otra) {
      n0.letra = { ...n0.letra, futbol: otra };
      expect(relacion(otra)).toBeUndefined();
      n0.letra = { ...n0.letra, futbol: letra0 };
      expect(relacion(letra0)).toBeCloseTo(48.5, 5);
    }
    // Quien estaba convocado y no se presentó recibe una falta: su asistencia baja 0,5 las dos semanas siguientes (la misma regla que el personaje) y no cambia su ánimo ni sus estadísticas; quien jugó o llegó tarde, no.
    expect(todos.find((n) => n.id === ids[3])!.faltas?.futbol).toEqual([20]);
    expect(todos.find((n) => n.id === ids[3])!.est?.futbol?.pj ?? 0).toBe(0);
    for (const i of [0, 1, 2]) expect(todos.find((n) => n.id === ids[i])!.faltas?.futbol).toBeUndefined();
    // El suplente que no jugó pierde moral por el banquillo (otra regla, la misma de siempre).
    expect(todos.find((n) => n.id === ids[1])!.estado!.moral).toBeLessThan(60);
  });
});

describe('ver partidos de otros como espectador', () => {
  it('con un partido en juego, en el campo, ver media hora da conocimiento del fútbol; el partido propio no se puede ver', () => {
    const g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    advanceToWeek(g, 'gen.descansar', 1, 3, 15);
    if (posible(g, 'futbol.apuntarse_colegio')) hacer(g, 'futbol.apuntarse_colegio');
    advanceToWeek(g, 'gen.descansar', 7, 0, 9);
    const cal = (g.moduleState<FutbolState>('futbol') as FutbolState).calendario!;
    const primero = Object.entries(cal.partidos).sort((a, b) => a[1][0] - b[1][0] || a[1][1] - b[1][1])[0];
    const saque = (cal.semana * 7 + primero[1][0]) * 1440 + primero[1][1] * 60;
    // Antes de que empiece nada, no hay nada que ver.
    expect(g.listActions().filter((a) => a.id.startsWith('futbol.ver_partido.')).length).toBe(0);
    // Va al campo y, con los partidos de la primera franja en juego, puede ver uno.
    advanceUntil(g, 'gen.descansar', (t) => t.minute >= saque - 90);
    llegarA(g, 'campo_municipal', Math.floor(((saque + 10) % 1440) / 60), (saque + 10) % 60);
    const ver = g.listActions().filter((a) => a.id.startsWith('futbol.ver_partido.'));
    expect(ver.length).toBeGreaterThan(0);
    const disponible = ver.find((a) => a.available)!;
    expect(disponible, ver.map((a) => `${a.id}: ${a.reason}`).join(' | ')).toBeDefined();
    const antes = g.stat(CONOCIMIENTO);
    expect(g.perform(disponible.id).ok).toBe(true);
    expect(g.stat(CONOCIMIENTO)).toBeGreaterThan(antes);
    // El partido de su equipo no sale entre los que se pueden ver.
    const p = (g.moduleState<FutbolState>('futbol') as FutbolState).personaje!;
    expect(ver.some((a) => a.id.includes(`${p.categoria}.${p.club}_${p.letra}.`) || a.id.endsWith(`.${p.club}_${p.letra}`))).toBe(false);
  });
});
