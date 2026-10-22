import { GEN, TAGS, type Rng } from '@ds/contracts';
import type { ActionOption, Game } from '@ds/core';

/**
 * Bots: jugadores automáticos con estrategias distintas. Eligen sobre todo por
 * ETIQUETAS (no por ids concretos), así siguen funcionando cuando se añaden módulos:
 * un deporte nuevo con la etiqueta `entrenamiento` lo entrenan sin tocar nada aquí.
 */

export interface BotMemory {
  day: number;
  /** Cuántas veces ha hecho hoy cada tipo de cosa. */
  hoy: Record<string, number>;
  /** Cuántas veces ha hecho cada acción en total (para repartir). */
  total: Record<string, number>;
}

export interface Bot {
  id: string;
  name: string;
  description: string;
  choose(game: Game, opts: ActionOption[], rng: Rng, mem: BotMemory): string;
}

type Pred = (o: ActionOption) => boolean;

const id = (x: string): Pred => (o) => o.id === x;
const tag = (t: string): Pred => (o) => o.tags.includes(t);
const all = (...ps: Pred[]): Pred => (o) => ps.every((p) => p(o));
const not = (p: Pred): Pred => (o) => !p(o);

/** Entre las opciones que cumplen, la menos usada (reparte el entrenamiento). */
function leastUsed(opts: ActionOption[], p: Pred, mem: BotMemory): ActionOption | undefined {
  let best: ActionOption | undefined;
  for (const o of opts) {
    if (!p(o)) continue;
    if (!best || (mem.total[o.id] ?? 0) < (mem.total[best.id] ?? 0)) best = o;
  }
  return best;
}

const entrenoDeporte = all(tag(TAGS.entrenamiento), not(id('gen.gimnasio')));
/** Sesión con entrenador y grupo del club (si el bot pertenece a uno). */
const sesionDeClub = tag(TAGS.club);
/** Entrar en el club del colegio, el primer paso de quien se toma en serio un deporte. */
const apuntarseAlClub = id('atletismo.apuntarse_colegio');
const estudio = all(tag(TAGS.estudio), not(id('estudios.clase')), not(tag(TAGS.social)));
const relacion = (o: ActionOption) => o.group === 'Relaciones';

/** Reglas de supervivencia comunes: dormir de noche, ir a clase, competir, no reventar. */
function basicas(
  game: Game,
  opts: ActionOption[],
  cfg: { horaDormir: number; clase: boolean; competir: boolean; energiaMin: number },
): string | undefined {
  const h = game.time.hour;
  const has = (x: string) => opts.some((o) => o.id === x);
  const noche = h >= cfg.horaDormir || h < 6;
  if (noche && has('gen.dormir')) return 'gen.dormir';
  if (cfg.clase && has('estudios.clase')) return 'estudios.clase';
  if (cfg.competir) {
    const comp = opts.find(tag(TAGS.competicion));
    if (comp && game.stat(GEN.energia) >= 40) return comp.id;
  }
  if (game.stat(GEN.energia) < cfg.energiaMin) return has('gen.dormir') ? 'gen.dormir' : 'gen.descansar';
  return undefined;
}

/** Lista de preferencias del día: [clave de cupo, máximo por día, predicado]. */
type Plan = [string, number, Pred][];

function seguirPlan(opts: ActionOption[], mem: BotMemory, plan: Plan): string | undefined {
  for (const [clave, max, p] of plan) {
    if ((mem.hoy[clave] ?? 0) >= max) continue;
    const o = leastUsed(opts, p, mem);
    if (o) {
      mem.hoy[clave] = (mem.hoy[clave] ?? 0) + 1;
      return o.id;
    }
  }
  return undefined;
}

const descansarOEsperar = (opts: ActionOption[]) =>
  opts.find(id('gen.leer'))?.id ?? opts.find(id('gen.descansar'))?.id ?? opts[0].id;

export const BOTS: Bot[] = [
  {
    id: 'equilibrado',
    name: 'Equilibrado',
    description: 'Va a clase, entrena 1-2 sesiones, estudia y cuida relaciones y descanso.',
    choose(game, opts, _rng, mem) {
      return (
        basicas(game, opts, { horaDormir: 22, clase: true, competir: true, energiaMin: 25 }) ??
        seguirPlan(opts, mem, [
          ['unirse', 1, apuntarseAlClub],
          ['club', 1, sesionDeClub],
          ['deporte', 1, entrenoDeporte],
          ['estudio', 1, estudio],
          ['relacion', 1, relacion],
          ['tele', 1, id('atletismo.ver_tele')],
          ['ocio', 1, (o) => game.stat(GEN.estres) > 35 && tag(TAGS.ocio)(o)],
          ['gym', 1, id('gen.gimnasio')],
        ]) ??
        descansarOEsperar(opts)
      );
    },
  },
  {
    id: 'empollon',
    name: 'Empollón',
    description: 'Todo para los estudios. No hace deporte.',
    choose(game, opts, _rng, mem) {
      return (
        basicas(game, opts, { horaDormir: 23, clase: true, competir: false, energiaMin: 25 }) ??
        seguirPlan(opts, mem, [
          // Hasta el más empollón necesita desconectar cuando el estrés aprieta.
          ['ocio', 3, (o) => game.stat(GEN.estres) > 35 && tag(TAGS.ocio)(o)],
          ['estudio', 3, (o) => game.stat(GEN.estres) < 60 && estudio(o)],
          ['tutoria', 1, (o) => relacion(o) && o.tags.includes(TAGS.estudio)],
        ]) ??
        descansarOEsperar(opts)
      );
    },
  },
  {
    id: 'atleta',
    name: 'Atleta',
    description: 'Va a clase pero vive para el deporte: entrena con cabeza (sin sobrecarga).',
    choose(game, opts, _rng, mem) {
      return (
        basicas(game, opts, { horaDormir: 22, clase: true, competir: true, energiaMin: 25 }) ??
        seguirPlan(opts, mem, [
          ['unirse', 1, apuntarseAlClub],
          ['club', 1, sesionDeClub],
          ['deporte', 2, entrenoDeporte],
          ['entrenador', 1, (o) => relacion(o) && /entrenador/.test(o.name)],
          ['tele', 1, id('atletismo.ver_tele')],
          ['gym', 1, id('gen.gimnasio')],
          ['ocio', 1, (o) => game.stat(GEN.estres) > 40 && tag(TAGS.ocio)(o)],
        ]) ??
        descansarOEsperar(opts)
      );
    },
  },
  {
    id: 'sobreentrena',
    name: 'Sobreentrena',
    description: 'Entrena todo lo que puede, duerme poco y no descansa.',
    choose(game, opts, _rng, mem) {
      return (
        basicas(game, opts, { horaDormir: 24, clase: true, competir: true, energiaMin: 12 }) ??
        seguirPlan(opts, mem, [
          ['unirse', 1, apuntarseAlClub],
          ['club', 1, sesionDeClub],
          ['deporte', 6, entrenoDeporte],
          ['gym', 2, id('gen.gimnasio')],
        ]) ??
        descansarOEsperar(opts)
      );
    },
  },
  {
    id: 'vago',
    name: 'Vago',
    description: 'Ocio y amigos. Va a clase a veces y duerme mucho.',
    choose(game, opts, rng, mem) {
      const fueAClase = mem.hoy['clase-decidida'] === 1;
      if (!fueAClase && opts.some(id('estudios.clase'))) {
        mem.hoy['clase-decidida'] = 1;
        if (rng.chance(0.6)) return 'estudios.clase';
      }
      return (
        basicas(game, opts, { horaDormir: 23, clase: false, competir: false, energiaMin: 30 }) ??
        seguirPlan(opts, mem, [
          ['quedar', 1, (o) => relacion(o) && o.tags.includes(TAGS.ocio)],
          ['ocio', 3, tag(TAGS.ocio)],
        ]) ??
        opts.find(id('gen.descansar'))?.id ??
        opts[0].id
      );
    },
  },
  {
    id: 'abandono',
    name: 'Abandona el deporte',
    description: 'Atleta las 8 primeras semanas; después solo estudia. Sirve para medir la caída.',
    choose(game, opts, rng, mem) {
      const fase = game.time.week < 8 ? BOTS.find((b) => b.id === 'atleta')! : BOTS.find((b) => b.id === 'empollon')!;
      return fase.choose(game, opts, rng, mem);
    },
  },
  {
    id: 'aleatorio',
    name: 'Aleatorio',
    description: 'Elige al azar entre lo disponible. Busca combinaciones raras que rompan cosas.',
    choose(_game, opts, rng) {
      return rng.pick(opts).id;
    },
  },
];
