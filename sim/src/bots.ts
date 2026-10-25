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

export const id = (x: string): Pred => (o) => o.id === x;
export const tag = (t: string): Pred => (o) => o.tags.includes(t);
export const all = (...ps: Pred[]): Pred => (o) => ps.every((p) => p(o));
export const not = (p: Pred): Pred => (o) => !p(o);

/** Entre las opciones que cumplen, la menos usada (reparte el entrenamiento). */
function leastUsed(opts: ActionOption[], p: Pred, mem: BotMemory): ActionOption | undefined {
  let best: ActionOption | undefined;
  for (const o of opts) {
    if (!p(o)) continue;
    if (!best || (mem.total[o.id] ?? 0) < (mem.total[best.id] ?? 0)) best = o;
  }
  return best;
}

export const entrenoDeporte = all(tag(TAGS.entrenamiento), not(id('gen.gimnasio')));
/** Sesión con entrenador y grupo del club (si el bot pertenece a uno). */
export const sesionDeClub = tag(TAGS.club);
/** Aceptar la propuesta del entrenador de competir en la categoría superior (solo está disponible si destaca mucho). */
export const subirDeCategoria = id('atletismo.subir_categoria');
/** Verano con buenas notas: campamento del deporte; con notas aceptables: practicar con los amigos. */
export const campamento = id('atletismo.campamento');
export const conAmigos = id('atletismo.amigos');
export const volverACategoria = id('atletismo.volver_categoria');

/** En la categoría superior, ¿los últimos resultados son de media tabla para abajo? Entonces no compensa seguir allí. */
export function flojoEnLaSuperior(game: Game): boolean {
  const st = game.moduleState<{ carreras: { position: number; total: number; superior?: boolean }[] } | undefined>('atletismo');
  const ultimas = (st?.carreras ?? []).slice(-3);
  return ultimas.length === 3 && ultimas.every((c) => c.superior && c.position > c.total / 2);
}

/** Entrar en el club del colegio, el primer paso de quien se toma en serio un deporte. */
export const apuntarseAlClub = id('atletismo.apuntarse_colegio');
/** Las clases del colegio (una acción por hora del horario). */
export const clase: Pred = (o) => /^estudios\.clase_\d$/.test(o.id);
export const estudio = all(tag(TAGS.estudio), not(clase), not(tag(TAGS.social)));
/** Acciones de relación constructivas (quedar, charlar, ayudar...): los bots nunca discuten. */
export const relacion = (o: ActionOption) => o.id.startsWith('relaciones.') && !/^relaciones\.(discutir|paces)\./.test(o.id);

/** Reglas de supervivencia comunes: dormir de noche, ir a clase, competir, no reventar. */
export function basicas(
  game: Game,
  opts: ActionOption[],
  cfg: { horaDormir: number; clase: boolean; competir: boolean; energiaMin: number },
): string | undefined {
  const h = game.time.hour;
  const has = (x: string) => opts.some((o) => o.id === x);
  const noche = h >= cfg.horaDormir || h < 6;
  if (noche && has('gen.dormir')) return 'gen.dormir';
  const aClase = opts.find(clase);
  if (cfg.clase && aClase) return aClase.id;
  // La academia de verano es obligatoria para quien suspende: los que van a clase también van a ella.
  if (cfg.clase && has('estudios.academia')) return 'estudios.academia';
  if (cfg.competir) {
    const comp = opts.find(tag(TAGS.competicion));
    if (comp && game.stat(GEN.energia) >= 40) return comp.id;
  }
  if (game.stat(GEN.energia) < cfg.energiaMin) return has('gen.dormir') ? 'gen.dormir' : 'gen.descansar';
  return undefined;
}

/** Lista de preferencias del día: [clave de cupo, máximo por día, predicado]. */
type Plan = [string, number, Pred][];

export function seguirPlan(opts: ActionOption[], mem: BotMemory, plan: Plan): string | undefined {
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

export const descansarOEsperar = (opts: ActionOption[]) =>
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
          ['subir', 1, subirDeCategoria],
          ['volver', 1, (o) => volverACategoria(o) && flojoEnLaSuperior(game)],
          ['campamento', 1, campamento],
          ['club', 1, sesionDeClub],
          ['deporte', 1, entrenoDeporte],
          ['estudio', 1, estudio],
          ['relacion', 1, relacion],
          ['tele', 1, id('atletismo.ver_tele')],
          ['amigos', 1, conAmigos],
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
          ['subir', 1, subirDeCategoria],
          ['volver', 1, (o) => volverACategoria(o) && flojoEnLaSuperior(game)],
          ['campamento', 1, campamento],
          ['club', 1, sesionDeClub],
          ['deporte', 2, entrenoDeporte],
          ['entrenador', 1, (o) => relacion(o) && /entrenador/.test(o.name)],
          ['tele', 1, id('atletismo.ver_tele')],
          ['gym', 1, id('gen.gimnasio')],
          ['amigos', 1, conAmigos],
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
          ['subir', 1, subirDeCategoria],
          ['volver', 1, (o) => volverACategoria(o) && flojoEnLaSuperior(game)],
          ['campamento', 1, campamento],
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
      // Decide una vez al día si va a clase; si va, va a todas las horas.
      if (mem.hoy['clase-decidida'] === undefined && opts.some(clase)) mem.hoy['clase-decidida'] = rng.chance(0.6) ? 2 : 1;
      if (mem.hoy['clase-decidida'] === 2) {
        const aClase = opts.find(clase);
        if (aClase) return aClase.id;
      }
      return (
        basicas(game, opts, { horaDormir: 23, clase: false, competir: false, energiaMin: 30 }) ??
        seguirPlan(opts, mem, [
          ['amigos', 1, conAmigos],
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
