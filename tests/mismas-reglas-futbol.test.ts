import { describe, expect, it } from 'vitest';
import { CAPACIDADES_GENETICAS, TAGS, defineModule, type Entrenamiento, type RutinaDeDeporte } from '@ds/contracts';
import { Game, advanceToWeek } from '@ds/core';
import { DATOS_FUTBOL, EJERCICIOS_DE_FUTBOL, futbol } from '@ds/mod-futbol';
import { personaje, type IdentidadState } from '@ds/mod-personaje';
import { SIEMPRE } from '../modules/futbol/src/ejercicios';
import { fijarTalentosDeCapacidades, fijosDeNino, prepararTrabajo, type HabilidadesDe } from '../modules/npcs/src/rutina';
import { pasoDeSemana } from '../modules/npcs/src/semana';
import type { Genetica } from '../modules/npcs/src/deportistas';
import { GEN } from '@ds/contracts';

/**
 * Personaje y PNJ con las mismas reglas, FÚTBOL: con ejercicios distintos en cada sesión, las habilidades que no se entrenan esa semana caen (el motor lleva el último día
 * entrenado de **cada** stat). Un PNJ tiene que olvidar lo mismo que el personaje: el atletismo, con la misma lista siempre, no lo ve.
 */

const RUTINA: RutinaDeDeporte = DATOS_FUTBOL.paises.espana.poblacion.rutina!;
const IDS = RUTINA.stats.map((d) => d.id);
/** Los ejercicios de campo (sin el de porteros), para que cada sesión toque unas habilidades distintas. */
const CAMPO = EJERCICIOS_DE_FUTBOL.filter((e) => !e.soloPuesto);

/**
 * La sesión número `k`: durante las ocho primeras semanas (16 sesiones) el equipo trabaja unos ejercicios (balón y finalización) y durante las ocho siguientes otros
 * (defensa y físico): las habilidades de los primeros llevan semanas sin entrenarse y tienen que caer, mientras otras suben.
 */
const EJERCICIOS_POR_FASE = [['rondos', 'finalizacion'], ['defensa', 'fisico']];
const sesion = (k: number): Entrenamiento[] => {
  const ids = EJERCICIOS_POR_FASE[k < 16 ? 0 : 1];
  return [...ids.flatMap((id) => CAMPO.find((e) => e.id === id)!.entrena), ...SIEMPRE];
};

/** Un módulo de prueba: una sesión del club (etiquetas de entrenamiento y de fútbol, así que con el modificador del conocimiento) que sube la sesión `k`. */
const entreno = defineModule<{ k: number }>({
  id: 'entrenof',
  name: 'Entrenof',
  dependsOn: ['gen', 'futbol'],
  initState: () => ({ k: 0 }),
  actions: [
    {
      id: 'entrenof.sesion',
      name: 'Sesión',
      tags: [TAGS.entrenamiento, 'futbol'],
      duration: 90,
      run: (ctx) => {
        const k = ctx.state<{ k: number }>().k;
        for (const e of sesion(k)) ctx.train(e.stat, e.amount);
        ctx.setState({ k: k + 1 });
      },
    },
  ],
});

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
  const hab: HabilidadesDe = { v: IDS.map((id) => g.stat(id)), pico: IDS.map((id) => g.stat(id)), ult: IDS.map(() => 0) };
  const nacimiento = -(ident.edadInicial + ident.fraccionInicial) * 365;
  const t = prepararTrabajo({ id: 'nino_f', genetica, nacimiento, cap: caps, pico: caps }, caps, 'futbol', RUTINA, hab, CAPACIDADES_GENETICAS.map(() => -1e9), 0);
  const fijos = fijosDeNino('nino_f', genetica, 'futbol', RUTINA);
  RUTINA.stats.forEach((d, i) => {
    fijos.talento[i] = g.talent(d.id);
    fijos.tope[i] = g.hiddenPotential(d.id);
    fijos.inicial[i] = g.stat(d.id); // el suelo de la caída: el valor con el que empezó
  });
  fijarTalentosDeCapacidades('nino_f', CAPACIDADES_GENETICAS.map((c) => g.talent(c)));
  return t;
}

describe('fútbol: el personaje y un niño con sus valores, con ejercicios distintos cada sesión', () => {
  for (const seed of [3, 11, 27]) {
    it(`dieciséis semanas de dos sesiones, con ejercicios distintos las ocho últimas: las 29 habilidades y el conocimiento coinciden, también las que no se entrenan (semilla ${seed})`, () => {
      const g = Game.create([personaje, futbol, entreno], { seed });
      const t = comoElPersonaje(g);
      const SEMANAS = 16;
      for (let w = 0; w < SEMANAS; w++) {
        // El personaje: martes y jueves por la tarde.
        advanceToWeek(g, 'gen.descansar', w, 1, 16);
        expect(g.perform('entrenof.sesion').ok).toBe(true);
        advanceToWeek(g, 'gen.descansar', w, 3, 16);
        expect(g.perform('entrenof.sesion').ok).toBe(true);
        // El niño: la misma semana, con las mismas dos sesiones (la `k` de cada una).
        pasoDeSemana(t, (w + 1) * 7, { huecos: [0, 1], informal: false, lista: (semana, hueco) => sesion(2 * semana + hueco) });
      }
      advanceToWeek(g, 'gen.descansar', SEMANAS, 0, 7);
      let peor = 0;
      let peorId = '';
      IDS.forEach((id, i) => {
        const d = Math.abs(g.stat(id) - t.hab.v[i]);
        if (d > peor) [peor, peorId] = [d, id];
      });
      expect(peor, `la que más se aleja: ${peorId}`).toBeLessThan(0.35);
      // La comprobación no es trivial: hay habilidades que han caído (no las entrenaron las últimas sesiones) y otras que han subido.
      const bajaron = IDS.filter((id, i) => g.stat(id) < t.hab.pico[i] - 0.05).length;
      expect(bajaron).toBeGreaterThan(3);
      expect(t.hab.v.some((v, i) => v > t.fijos.inicial[i] + 2)).toBe(true);
      // Y las capacidades que entrenan los ejercicios (velocidad, resistencia...) también coinciden.
      for (const c of [GEN.velocidad, GEN.resistencia, GEN.fuerza, GEN.cooperacion]) {
        expect(Math.abs(g.stat(c) - t.cap[CAPACIDADES_GENETICAS.indexOf(c)]), c).toBeLessThan(0.5);
      }
    });
  }
});
