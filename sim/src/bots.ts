import { GEN, JORNADA_ESCOLAR, SERVICES, TAGS, azarDe, rutaA, tiempoEntre, MINUTOS_ANTES_DE_CLASE, type LugaresService, type Rng } from '@ds/contracts';
import type { ActionOption, Game } from '@ds/core';
import type { OpcionesDelBot } from './pasos';

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
  choose(game: Game, opts: OpcionesDelBot, rng: Rng, mem: BotMemory): string;
  /** El bot que elige al azar entre todas las acciones necesita todas evaluadas (no solo lo que ofrece la interfaz). */
  todasLasAcciones?: boolean;
}

type Pred = (o: ActionOption) => boolean;

export const id = (x: string): Pred => (o) => o.id === x;
export const tag = (t: string): Pred => (o) => o.tags.includes(t);
export const all = (...ps: Pred[]): Pred => (o) => ps.every((p) => p(o));
export const not = (p: Pred): Pred => (o) => !p(o);

/**
 * Entre las opciones que cumplen, la menos usada (reparte el entrenamiento). Las acciones de relación con cada persona no vienen evaluadas (`OpcionesDelBot.relaciones`): se piden aquí, solo
 * las primeras por uso, y la elegida se añade a las opciones (para poder viajar hasta su sitio). A igual uso gana la que está antes en el orden del juego, que es la de la lista.
 */
function leastUsed(opts: OpcionesDelBot, p: Pred, mem: BotMemory): ActionOption | undefined {
  let best: ActionOption | undefined;
  for (const o of opts) {
    if (!p(o)) continue;
    if (!best || (mem.total[o.id] ?? 0) < (mem.total[best.id] ?? 0)) best = o;
  }
  const rel = opts.relaciones?.menosUsada(p, mem.total);
  if (rel && (!best || (mem.total[rel.id] ?? 0) < (mem.total[best.id] ?? 0))) {
    if (!opts.includes(rel)) opts.push(rel);
    best = rel;
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
/** Los deberes (30 minutos) son para esperar al entrenamiento de quien juega al fútbol: los bots estudian en sesiones largas, como siempre. */
export const deberes: Pred = (o) => o.id.startsWith('estudios.deberes_');
export const estudio = all(tag(TAGS.estudio), not(clase), not(tag(TAGS.social)), not(deberes));
/** Acciones de relación constructivas (quedar, charlar, ayudar...): los bots nunca discuten. */
export const relacion = (o: ActionOption) => o.id.startsWith('relaciones.') && !/^relaciones\.(discutir|paces|presentarse)\./.test(o.id);

/** Preguntar el nombre a las cuatro personas del reparto (tutor, entrenador y dos compañeros), que al empezar son desconocidas: las demás, ni se evalúan. */
export const conocer = (o: ActionOption) => /^relaciones\.presentarse\.(entrenador|tutor|companero_estudio|companero_social)$/.test(o.id);

/** Reglas de supervivencia comunes: dormir de noche, ir a clase, competir, no reventar. */
/** Cuántos ratos de 5 minutos juega en el recreo el que juega ese día (media hora, como un niño). */
const RATOS_DE_RECREO = 6;

/**
 * `recreo` es la probabilidad (0 a 1) de que juegue en el recreo cada día de clase («Jugar con otros niños» o «Jugar con X»): su perfil (el vago, menos). Hace falta pasar `mem`
 * para contar los ratos del día. Es cosa del bot, no del juego: el recreo cuenta como actividad del cuerpo del personaje.
 */
export function basicas(
  game: Game,
  opts: OpcionesDelBot,
  cfg: { horaDormir: number; clase: boolean; competir: boolean; energiaMin: number; recreo?: number },
  mem?: BotMemory,
): string | undefined {
  const h = game.time.hour;
  const has = (x: string) => opts.some((o) => o.id === x);
  const noche = h >= cfg.horaDormir || h < 6;
  if (noche && has('gen.dormir')) return 'gen.dormir';
  const aClase = opts.find(clase);
  if (cfg.clase && aClase) return aClase.id;
  // La academia de verano es obligatoria para quien suspende: los que van a clase también van a ella.
  if (cfg.clase && has('estudios.academia')) return 'estudios.academia';
  const t = game.time;
  if (cfg.recreo && mem && t.isSchoolDay && t.minuteOfDay >= JORNADA_ESCOLAR.recreo[0] && t.minuteOfDay < JORNADA_ESCOLAR.recreo[1] && (mem.hoy.recreo ?? 0) < RATOS_DE_RECREO && azarDe('recreo-bot', t.day, cfg.recreo) < cfg.recreo) {
    // Se juega en el patio: si no está allí, va (el juego no se ofrece desde otro sitio: no hay niños con quienes jugar).
    const lugares = game.service<LugaresService>(SERVICES.lugares);
    const ruta = lugares ? rutaA(lugares.mapa(), lugares.actual().id, 'patio') : [];
    if (ruta.length) return `lugares.ir_${ruta[0]}`;
    const juego = opts.find(id('relaciones.jugar_con_otros')) ?? opts.find((o) => /^relaciones\.jugar\./.test(o.id)) ?? opts.relaciones?.primera((o) => /^relaciones\.jugar\./.test(o.id));
    if (juego && !opts.includes(juego)) opts.push(juego);
    if (juego) {
      mem.hoy.recreo = (mem.hoy.recreo ?? 0) + 1;
      return juego.id;
    }
  }
  if (cfg.competir) {
    const comp = opts.find(tag(TAGS.competicion));
    if (comp && game.stat(GEN.energia) >= 40) return comp.id;
  }
  if (game.stat(GEN.energia) < cfg.energiaMin) return has('gen.dormir') ? 'gen.dormir' : 'gen.descansar';
  // Quien va a clase sale con tiempo para estar en el aula cuando se abre (10 minutos antes): el viaje es por tramos (calle, colegio, aula) y se suma lo que cuesta desde donde esté.
  if (cfg.clase && t.isSchoolDay) {
    const lugares = game.service<LugaresService>(SERVICES.lugares);
    const inicio = JORNADA_ESCOLAR.clases.map(([i]) => i).find((i) => i - MINUTOS_ANTES_DE_CLASE > t.minuteOfDay);
    const ruta = lugares && inicio !== undefined ? rutaA(lugares.mapa(), lugares.actual().id, 'aula') : [];
    if (lugares && inicio !== undefined && ruta.length) {
      let previo = lugares.actual().id;
      let viaje = 0;
      for (const parada of ruta) {
        viaje += tiempoEntre(lugares.mapa(), previo, parada) ?? 0;
        previo = parada;
      }
      if (inicio - MINUTOS_ANTES_DE_CLASE - t.minuteOfDay <= viaje && inicio - t.minuteOfDay <= 60) return `lugares.ir_${ruta[0]}`;
    }
  }
  // Solo se entra a clase 10 minutos antes: si falta menos de una hora para la próxima, se espera en vez de empezar algo largo.
  if (cfg.clase && game.time.isSchoolDay && has('gen.esperar')) {
    const falta = JORNADA_ESCOLAR.clases.map(([inicio]) => inicio - game.time.minuteOfDay).find((m) => m > 0);
    if (falta !== undefined && falta <= 60) return 'gen.esperar';
  }
  return undefined;
}

/** Lista de preferencias del día: [clave de cupo, máximo por día, predicado]. */
type Plan = [string, number, Pred][];

export function seguirPlan(opts: OpcionesDelBot, mem: BotMemory, plan: Plan): string | undefined {
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

/**
 * Un deportista de cualquier deporte con club: el mismo plan que el `Atleta` (va a clase, entra en el club, hace su sesión, entrena con cabeza, ve el deporte en la tele,
 * campamento y amigos en verano), con los ids del deporte. Sirve para medir cuánto se aprende en un curso en cada deporte frente al atletismo (`npm run sim:futbol`).
 */
export function deportistaDe(deporte: string): Bot {
  const d = (x: string) => id(`${deporte}.${x}`);
  // El campamento: el único del deporte, o el de jugadores si tiene dos (el de porteros es para quien juega de portero: este bot juega en el campo).
  const campamentoDelDeporte: Pred = (o) => o.id === `${deporte}.campamento` || o.id === `${deporte}.campamento_jugadores`;
  // Entrenar por libre con cabeza: el de portería es de quien juega de portero (este bot juega en el campo), así que no lo elige.
  const entrenoDeCampo: Pred = (o) => entrenoDeporte(o) && !/^futbol\.entrena_(reflejos|balones_aereos|mano_a_mano|pies_de_portero|mando_del_area)$/.test(o.id);
  return {
    id: `deportista_${deporte}`,
    name: `Deportista de ${deporte}`,
    description: `Como el Atleta, pero en ${deporte}.`,
    choose(game, opts, _rng, mem) {
      return (
        basicas(game, opts, { horaDormir: 22, clase: true, competir: true, energiaMin: 25, recreo: 0.8 }, mem) ??
        seguirPlan(opts, mem, [
          ['unirse', 1, d('apuntarse_colegio')],
          ['campamento', 1, campamentoDelDeporte],
          ['club', 1, sesionDeClub],
          ['deporte', 2, (o) => entrenoDeCampo(o) && (mem.hoy.club ?? 0) + (mem.hoy.deporte ?? 0) < 2],
          ['entrenador', 1, (o) => relacion(o) && /entrenador/.test(o.name)],
          ['tele', 1, d('ver_tele')],
          ['gym', 1, id('gen.gimnasio')],
          ['amigos', 1, d('amigos')],
          ['ocio', 1, (o) => game.stat(GEN.estres) > 40 && tag(TAGS.ocio)(o)],
        ]) ??
        descansarOEsperar(opts)
      );
    },
  };
}

export const BOTS: Bot[] = [
  {
    id: 'equilibrado',
    name: 'Equilibrado',
    description: 'Va a clase, entrena 1-2 sesiones, estudia y cuida relaciones y descanso.',
    choose(game, opts, _rng, mem) {
      return (
        basicas(game, opts, { horaDormir: 22, clase: true, competir: true, energiaMin: 25, recreo: 0.8 }, mem) ??
        seguirPlan(opts, mem, [
          ['unirse', 1, apuntarseAlClub],
          ['subir', 1, subirDeCategoria],
          ['volver', 1, (o) => volverACategoria(o) && flojoEnLaSuperior(game)],
          ['campamento', 1, campamento],
          ['club', 1, sesionDeClub],
          ['deporte', 1, entrenoDeporte],
          ['estudio', 1, estudio],
          ['conocer', 1, conocer],
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
    id: 'madrugador',
    name: 'Madruga y trasnocha',
    description: 'Como el Equilibrado, pero sale de casa antes de las 7:30 (pasa por la calle del colegio antes de las 8:10 y espera allí a que abran) y de noche está en casa, despierto, hasta las 23:00. Sirve para medir los eventos de antes de clase y de la noche.',
    choose(game, opts, _rng, mem) {
      const t = game.time;
      const lugares = game.service<LugaresService>(SERVICES.lugares);
      const ir = (destino: string): string | undefined => {
        const ruta = lugares ? rutaA(lugares.mapa(), lugares.actual().id, destino) : [];
        return ruta.length ? `lugares.ir_${ruta[0]}` : undefined;
      };
      const noche = t.hour >= 23 || t.hour < 6;
      // De tarde y de noche, en casa: vuelve del colegio, del parque o de donde esté (y allí hace lo de casa: leer, descansar, estudiar, ver la tele).
      if (!noche && t.hour >= 19 && lugares && lugares.actual().id !== 'casa') return ir('casa') ?? descansarOEsperar(opts);
      // Los días de clase se levanta temprano y sale de casa antes de las 7:30: pasa por la calle del colegio mucho antes de que abran.
      const dondeEsta = lugares?.actual().id ?? '';
      if (t.isSchoolDay && t.minuteOfDay >= 6 * 60 + 30 && t.minuteOfDay < 7 * 60 + 30 && ['casa', 'calle_casa', 'avenida_parque'].includes(dondeEsta)) {
        const paso = ir('calle_colegio');
        if (paso) return paso;
      }
      return (
        basicas(game, opts, { horaDormir: 23, clase: true, competir: true, energiaMin: 15, recreo: 0.8 }, mem) ??
        // Esperar en la calle hasta que sea hora de entrar: el resto del tiempo antes de clase es de ir despacio.
        (t.isSchoolDay && t.minuteOfDay < 7 * 60 + 40 && lugares?.actual().id === 'calle_colegio' && opts.some(id('gen.esperar')) ? 'gen.esperar' : undefined) ??
        seguirPlan(opts, mem, [
          ['unirse', 1, apuntarseAlClub],
          ['subir', 1, subirDeCategoria],
          ['volver', 1, (o) => volverACategoria(o) && flojoEnLaSuperior(game)],
          ['campamento', 1, campamento],
          ['club', 1, sesionDeClub],
          ['deporte', 1, entrenoDeporte],
          ['estudio', 1, estudio],
          ['conocer', 1, conocer],
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
        basicas(game, opts, { horaDormir: 23, clase: true, competir: false, energiaMin: 25, recreo: 0.5 }, mem) ??
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
        basicas(game, opts, { horaDormir: 22, clase: true, competir: true, energiaMin: 25, recreo: 0.8 }, mem) ??
        seguirPlan(opts, mem, [
          ['unirse', 1, apuntarseAlClub],
          ['subir', 1, subirDeCategoria],
          ['volver', 1, (o) => volverACategoria(o) && flojoEnLaSuperior(game)],
          ['campamento', 1, campamento],
          ['club', 1, sesionDeClub],
          // Con la sesión del club, otra más como mucho: más es sobrecarga y lesiona (el bot entrena con cabeza).
          ['deporte', 2, (o) => entrenoDeporte(o) && (mem.hoy.club ?? 0) + (mem.hoy.deporte ?? 0) < 2],
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
        basicas(game, opts, { horaDormir: 24, clase: true, competir: true, energiaMin: 12, recreo: 0.8 }, mem) ??
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
        basicas(game, opts, { horaDormir: 23, clase: false, competir: false, energiaMin: 30, recreo: 0.2 }, mem) ??
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
    todasLasAcciones: true,
    choose(_game, opts, rng) {
      return rng.pick(opts).id;
    },
  },
];
