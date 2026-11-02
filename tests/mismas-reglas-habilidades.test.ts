import { describe, expect, it } from 'vitest';
import { CAPACIDADES_GENETICAS, GEN, SEMANAS_DE_JUEGO_INFORMAL, SERVICES, defineModule, nivelDeInteresDelPersonaje, type ProfileService } from '@ds/contracts';
import { Game } from '@ds/core';
import { nuevaPartida } from '@ds/game';
import { atletismo, rendimiento } from '@ds/mod-atletismo';
import { DATOS_ATLETISMO } from '@ds/mod-atletismo';
import { personaje, type IdentidadState } from '@ds/mod-personaje';
import type { NpcsState } from '@ds/mod-npcs';
import { aGuardarHabilidades, fijarTalentosDeCapacidades, fijosDeNino, lectorDe, practicar, prepararTrabajo, type HabilidadesDe } from '../modules/npcs/src/rutina';
import { historiaDeportiva, listaDeSesion, semanaDeNino, type NinoDeportista } from '../modules/npcs/src/semana';
import type { Genetica } from '../modules/npcs/src/deportistas';
import { JUEGO_INFORMAL, SESION_DE_CLUB } from '../modules/atletismo/src/habilidades';

/**
 * Personaje y PNJ con las mismas reglas: HABILIDADES (`docs/MISMAS_REGLAS.md`, P2a). Un niño que entrena con la rutina de su club acaba con los mismos valores que el
 * personaje que hace lo mismo; el lector de persona da lo mismo que el contexto del motor; y la historia por bloques da lo mismo que semana a semana.
 */

const RUTINA = DATOS_ATLETISMO.paises.espana.poblacion.rutina!;
const HABILIDADES = RUTINA.stats.map((d) => d.id);

/** Un módulo de prueba: entrenar una sesión (la del club de atletismo) sin ninguna etiqueta, así que sin modificadores, y leer el rendimiento con el contexto del motor. */
const entreno = defineModule<{ rendimiento: number }>({
  id: 'entreno',
  name: 'Entreno',
  dependsOn: ['gen'],
  initState: () => ({ rendimiento: -1 }),
  actions: [
    { id: 'entreno.sesion', name: 'Sesión', tags: [], duration: 1, train: [...SESION_DE_CLUB] },
    { id: 'entreno.leer', name: 'Leer', tags: [], duration: 1, run: (ctx) => ctx.setState({ rendimiento: rendimiento(ctx) }) },
  ],
});
const nueva = (seed: number) => Game.create([personaje, atletismo, entreno], { seed });

/** Un niño con la genética y los valores del personaje, para entrenarlo con la rutina de los PNJ y compararlo con él. */
function comoElPersonaje(g: Game) {
  const ident = g.moduleState<IdentidadState>('gen') as IdentidadState;
  const genetica = {
    topes: Object.fromEntries(CAPACIDADES_GENETICAS.map((c) => [c, g.hiddenPotential(c)!])),
    perks: { activos: [], pool: [] },
    desfase: ident.madurez,
    ventaja: 1,
    padres: { padre: 'ninguna', madre: 'ninguna' },
  } as unknown as Genetica;
  const caps = CAPACIDADES_GENETICAS.map((c) => g.stat(c));
  const hab: HabilidadesDe = { v: HABILIDADES.map((id) => g.stat(id)), pico: HABILIDADES.map((id) => g.stat(id)), ult: 0 };
  const nacimiento = -(ident.edadInicial + ident.fraccionInicial) * 365;
  const t = prepararTrabajo({ id: 'nino_x', genetica, nacimiento, cap: caps, pico: caps }, caps, 'atletismo', RUTINA, hab, CAPACIDADES_GENETICAS.map(() => -1e9), 0);
  // Lo que el motor sortea para el personaje (su talento y su tope en cada habilidad), igual para el niño; y el vigor que el motor tiene guardado el día 0.
  const fijos = fijosDeNino('nino_x', genetica, 'atletismo', RUTINA);
  RUTINA.stats.forEach((d, i) => {
    fijos.talento[i] = g.talent(d.id);
    fijos.tope[i] = g.hiddenPotential(d.id);
  });
  fijarTalentosDeCapacidades('nino_x', CAPACIDADES_GENETICAS.map((c) => g.talent(c)));
  t.edad = ident.edadInicial + ident.fraccionInicial;
  t.vigores = { madurez: g.stat(GEN.madurez), fisico: g.stat(GEN.vigorFisico), tecnico: g.stat(GEN.vigorTecnico), mental: g.stat(GEN.vigorMental), social: g.stat(GEN.vigorSocial) };
  return { t, ident };
}

describe('entrenar: el niño y el personaje suben lo mismo con la misma sesión', () => {
  for (const seed of [3, 11, 27]) {
    it(`30 sesiones de club (semilla ${seed})`, () => {
      const g = nueva(seed);
      const { t } = comoElPersonaje(g);
      for (let i = 0; i < 30; i++) {
        expect(g.perform('entreno.sesion').ok).toBe(true);
        practicar(t, SESION_DE_CLUB, 1);
      }
      // Las habilidades del deporte, su conocimiento y las capacidades que entrena la sesión.
      HABILIDADES.forEach((id, i) => expect(Math.abs(g.stat(id) - t.hab.v[i]), id).toBeLessThan(0.01));
      for (const c of [GEN.velocidad, GEN.resistencia, GEN.coordinacion]) expect(Math.abs(g.stat(c) - t.cap[CAPACIDADES_GENETICAS.indexOf(c)]), c).toBeLessThan(0.01);
      // Y se ha entrenado de verdad (la comprobación no es trivial).
      expect(g.stat('atletismo.tecnica')).toBeGreaterThan(t.fijos.inicial[0] + 1);
    });
  }
});

describe('el lector de persona da lo mismo que el contexto del motor', () => {
  it('el rendimiento de atletismo del personaje es el mismo con su contexto que con el lector de un niño con sus valores', () => {
    for (const seed of [3, 11, 27]) {
      const g = nueva(seed);
      const { t } = comoElPersonaje(g);
      for (let i = 0; i < 20; i++) {
        g.perform('entreno.sesion');
        practicar(t, SESION_DE_CLUB, 1);
      }
      g.perform('entreno.leer');
      const delMotor = (g.moduleState<{ rendimiento: number }>('entreno') as { rendimiento: number }).rendimiento;
      expect(delMotor).toBeGreaterThan(0);
      expect(Math.abs(rendimiento(lectorDe(t)) - delMotor)).toBeLessThan(0.01);
    }
  });
});

describe('el juego informal: la misma regla para el personaje y los niños', () => {
  it('el personaje sube, el primer día, lo mismo que un niño con las mismas semanas de juego con los amigos', () => {
    let comprobadas = 0;
    for (let seed = 1; seed <= 60 && comprobadas < 4; seed++) {
      const g = nueva(seed);
      const intereses = g.service<ProfileService>(SERVICES.perfil)!.view().intereses;
      const semanas = SEMANAS_DE_JUEGO_INFORMAL[nivelDeInteresDelPersonaje(Math.max(intereses.atletismo ?? 0, intereses.deporte ?? 0))];
      if (!semanas) continue;
      comprobadas++;
      const { t } = comoElPersonaje(g);
      const inicial = HABILIDADES.map((id) => g.stat(id));
      for (let w = 0; w < semanas; w++) practicar(t, RUTINA.informal, 1);
      while (g.time.day < 1) g.perform('gen.descansar');
      // La técnica, el ritmo y la salida (el conocimiento lo suma, además, lo que practicaron sus padres).
      HABILIDADES.filter((id) => id !== 'atletismo.conocimiento').forEach((id) => {
        const i = HABILIDADES.indexOf(id);
        expect(Math.abs(g.stat(id) - t.hab.v[i]), `${id} semilla ${seed}`).toBeLessThan(0.05);
        expect(g.stat(id), `${id} no baja`).toBeGreaterThanOrEqual(inicial[i] - 1e-9);
      });
      // Es un plus pequeño, pero se nota en alguna habilidad.
      expect(HABILIDADES.some((id, i) => g.stat(id) > inicial[i] + 0.005 && id !== 'atletismo.conocimiento')).toBe(true);
    }
    expect(comprobadas).toBeGreaterThanOrEqual(3);
  });

  it('un niño sin interés no juega informal; con más interés, más semanas (4, 8 o 12)', () => {
    expect([...SEMANAS_DE_JUEGO_INFORMAL]).toEqual([0, 4, 8, 12]);
    expect([0, 20, 28, 36, 44, 90].map(nivelDeInteresDelPersonaje)).toEqual([0, 0, 1, 2, 3, 3]);
    expect(RUTINA.informal).toEqual([...JUEGO_INFORMAL]);
  });
});

describe('la historia por bloques da lo mismo que semana a semana', () => {
  it('los jugadores de atletismo de una partida: diferencia pequeña en cada habilidad y en el rendimiento', () => {
    const g = nuevaPartida({ seed: 31 });
    const s = g.moduleState<NpcsState>('npcs');
    const rend = rendimiento;
    const lista = (fin: number, i: number, lector: { stat(id: string): number }) => listaDeSesion(RUTINA, (id) => lector.stat(id), ['atletismo', 'x', fin, i]);
    let peor = 0;
    let peorNivel = 0;
    for (const n of s.npcs.filter((x) => x.hab?.atletismo && x.nacimiento !== undefined && x.genetica).slice(0, 40)) {
      const nino = { ...n, cap: undefined, pico: undefined } as unknown as NinoDeportista;
      const porBloques = historiaDeportiva(nino, 'atletismo', RUTINA, rend, 0, lista);
      const semanal = historiaDeportiva(nino, 'atletismo', RUTINA, rend, 0, lista, 1);
      porBloques.hab.v.forEach((v, i) => (peor = Math.max(peor, Math.abs(v - semanal.hab.v[i]))));
      peorNivel = Math.max(peorNivel, Math.abs(porBloques.nivel - semanal.nivel));
    }
    expect(peor).toBeLessThan(1);
    expect(peorNivel).toBeLessThan(1);
  });
});

describe('los jugadores de una partida llevan sus habilidades y su nivel sale de ellas', () => {
  it('cada jugador de atletismo tiene las 4 stats del deporte y su `levels` es el rendimiento calculado con ellas', () => {
    const g = nuevaPartida({ seed: 31 });
    const jugadores = (g.moduleState<NpcsState>('npcs') as NpcsState).npcs.filter((n) => n.deporte === 'atletismo' && n.genetica);
    expect(jugadores.length).toBeGreaterThan(80);
    for (const n of jugadores) {
      expect(n.hab!.atletismo.v).toHaveLength(RUTINA.stats.length);
      const t = prepararTrabajo({ id: n.id, genetica: n.genetica!, nacimiento: n.nacimiento!, cap: n.cap!, pico: n.pico! }, n.cap!, 'atletismo', RUTINA, n.hab!.atletismo, n.capUlt!, 0);
      expect(Math.abs(rendimiento(lectorDe(t)) - n.levels.atletismo), n.id).toBeLessThan(0.05);
    }
  });

  it('una semana más: entrenan, suben un poco y su nivel sigue saliendo de sus habilidades', () => {
    const g = nuevaPartida({ seed: 31 });
    const s = g.moduleState<NpcsState>('npcs') as NpcsState;
    const n = s.npcs.find((x) => x.deporte === 'atletismo' && x.hab && x.genetica)!;
    const antes = [...n.hab!.atletismo.v];
    const r = semanaDeNino(n as unknown as NinoDeportista, 'atletismo', RUTINA, rendimiento, 7, (i, l) => listaDeSesion(RUTINA, (id) => l.stat(id), ['atletismo', 'x', 7, i]));
    expect(aGuardarHabilidades(r.hab).v.length).toBe(antes.length);
    expect(r.nivel).toBeGreaterThan(0);
  });
});
