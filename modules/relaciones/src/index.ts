import {
  CORE_EVENTS,
  GEN,
  SERVICES,
  SHARED_EVENTS,
  TAGS,
  defineModule,
  inHours,
  isSchoolHours,
  NIVEL_ESTADO,
  type ActionContext,
  type ActionDef,
  type CompetitionResultData,
  type NpcDirectory,
  type NpcView,
  type ProfileService,
  type ReadContext,
  compatibilidad,
  factorDeCompatibilidad,
  type RelationView,
  type RelationsService,
} from '@ds/contracts';
import { AFINIDAD_PARA_AYUDAR, ESPERA, interesFavorito, mejorInteresEnComun, perdidaPorDiscusion, probabilidadDePaces } from './acciones';
import { conCambio, conContacto, nuevoVinculo, pasarDia, type Vinculo } from './vinculo';

/**
 * MÓDULO RELACIONES (id `relaciones`).
 *
 * Cómo se vive con cada persona. La población (quién existe, sus rivales, su edad, su club) es del módulo `npcs`,
 * que se consulta por su servicio; aquí vive el vínculo con cada una: afinidad, confianza, estado e historia.
 * Quien aparece en el reparto ya se conoce (vínculo en 0, "conocido"); los rivales se conocen al competir contra ellos.
 *
 * - Acciones con cada persona (ver `acciones.ts`): quedar, charlar, ayudar, hacer planes, tener un detalle, discutir y hacer las paces
 *   (con compañeros y amigos); hablar, plantar cara y pedir disculpas (entrenador y tutor); charlar, encararse y hacer las paces
 *   (rivales ya conocidos). Cada una con su duración, coste, efecto y entrenamiento de las genéricas sociales; el carácter de la
 *   otra persona decide cuánto duele una discusión y si acepta las paces.
 * - Apoyo: quien te cae bien (afinidad ≥ 40) y apoya una etiqueta de acción te da eficiencia.
 * - Se enfría con los días sin verse y cambia con los resultados de las carreras.
 * - Publica el servicio `relaciones`.
 */

export interface RelacionesState {
  /** Solo hay vínculo guardado de quien ya ha tenido contacto o un cambio; el resto es "conocido" en 0 de forma implícita. */
  vinculos: Record<string, Vinculo>;
  /** Hasta qué día (excluido) no se puede repetir una acción con una persona: `detalle.<id>`, `paces.<id>`. */
  espera?: Record<string, number>;
}

const UMBRAL_APOYO = 40;
/** Cuántos rivales conocidos ofrecen acciones a la vez (los de mayor afinidad, a favor o en contra). */
const RIVALES_CON_ACCIONES = 5;

const dirDe = (ctx: ReadContext) => ctx.service<NpcDirectory>(SERVICES.npcs);

/** ¿Conoce el personaje a esta persona? Los rivales, solo tras competir contra ellos. */
const conocida = (n: NpcView) => n.known !== false;

const vinculoDe = (s: RelacionesState, n: NpcView, dia: number): Vinculo => s.vinculos[n.id] ?? nuevoVinculo(n.id, dia);

const vista = (v: Vinculo): RelationView => ({
  npcId: v.npcId,
  estado: v.estado,
  nivel: NIVEL_ESTADO[v.estado],
  afinidad: v.afinidad,
  confianza: v.confianza,
  ultimoContacto: v.ultimoContacto,
});

const fueraDeClase = (desde: number, hasta: number) => (ctx: ReadContext) =>
  !isSchoolHours(ctx.time) && inHours(ctx.time, desde, hasta) ? true : `Disponible de ${desde} a ${hasta}, fuera de clase`;

const nombreCorto = (n: NpcView) => n.name.split(' ')[0];
const esAutoridad = (n: NpcView) => n.role === 'entrenador' || n.role === 'profesor';

/** Horario de hablar con cada tipo de persona. */
function horarioDe(n: NpcView): (ctx: ReadContext) => true | string {
  if (n.role === 'entrenador') return (c) => (!c.time.isSchoolDay ? fueraDeClase(9, 14)(c) : fueraDeClase(15, 21)(c));
  if (n.role === 'profesor') return (c) => (c.time.isSchoolDay && inHours(c.time, 14, 17) ? true : 'Tutorías los días de clase, de 14 a 17');
  return fueraDeClase(10, 21);
}

const grupoDe = (n: NpcView) => `Relaciones · ${nombreCorto(n)}`;
const perfilDe = (ctx: ReadContext) => ctx.service<ProfileService>(SERVICES.perfil)?.view();
const compatDe = (ctx: ReadContext, n: NpcView): number => {
  const yo = perfilDe(ctx);
  return n.rasgos && yo ? compatibilidad(n.rasgos, yo) : 0.4;
};

/** Requisitos comunes: un solo contacto al día con cada persona. */
function disponible(n: NpcView, horario: (ctx: ReadContext) => true | string, extra?: (ctx: ReadContext, v: Vinculo) => true | string) {
  return (ctx: ReadContext): true | string => {
    const s = ctx.state<RelacionesState>();
    if (s.vinculos[n.id]?.ultimoContacto === ctx.time.day) return `Ya has estado con ${nombreCorto(n)} hoy`;
    const h = horario(ctx);
    if (h !== true) return h;
    return extra ? extra(ctx, vinculoDe(s, n, ctx.time.day)) : true;
  };
}

const espera = (s: RelacionesState, clave: string, dia: number): number => Math.max(0, (s.espera?.[clave] ?? -1) - dia);
const ponerEspera = (ctx: ActionContext, clave: string, dias: number) =>
  ctx.updateState<RelacionesState>((s) => ({ ...s, espera: { ...s.espera, [clave]: ctx.time.day + dias } }));

function interaccion(
  n: NpcView,
  cfg: {
    suffix: string;
    name: string;
    duration: number;
    tags: string[];
    /** Afinidad y confianza que suma (se escalan con la eficiencia). */
    ganancia: number;
    confianza: number;
    /** Genéricas que entrena la interacción. */
    train: { stat: string; amount: number }[];
    horario: (ctx: ReadContext) => true | string;
    delta?: Record<string, number>;
    description?: string;
    extra?: (ctx: ReadContext, v: Vinculo) => true | string;
    /** Multiplicador de la ganancia según el momento (p. ej. un interés en común). */
    factor?: (ctx: ReadContext) => number;
    /** Algo más que hacer al terminar (apuntar una espera, un mensaje...). */
    alTerminar?: (ctx: ActionContext) => void;
  },
): ActionDef {
  return {
    id: `relaciones.${cfg.suffix}.${n.id}`,
    name: cfg.name,
    description: cfg.description,
    tags: cfg.tags,
    group: grupoDe(n),
    duration: cfg.duration,
    available: disponible(n, cfg.horario, cfg.extra),
    delta: cfg.delta ?? (cfg.tags.includes(TAGS.ocio) ? { [GEN.energia]: -6, [GEN.estres]: -6 } : { [GEN.energia]: -3 }),
    train: cfg.train,
    run: (ctx) => {
      const dia = ctx.time.day;
      const f = (cfg.factor?.(ctx) ?? 1) * ctx.efficiency;
      ctx.updateState<RelacionesState>((s) => ({
        ...s,
        vinculos: { ...s.vinculos, [n.id]: conContacto(s.vinculos[n.id] ?? nuevoVinculo(n.id, dia), dia, cfg.ganancia * f, cfg.confianza * f) },
      }));
      cfg.alTerminar?.(ctx);
    },
  };
}

/** Las acciones propias de un compañero o un amigo (la vida de todos los días). */
function accionesDeAmistad(n: NpcView): ActionDef[] {
  const yo = nombreCorto(n);
  return [
    interaccion(n, {
      suffix: 'quedar',
      name: `Quedar con ${yo}`,
      description: 'Pasar la tarde juntos: lo que más acerca, pero lleva tiempo.',
      duration: 120,
      tags: [TAGS.social, TAGS.ocio],
      ganancia: 5,
      confianza: 3,
      train: [
        { stat: GEN.carisma, amount: 0.8 },
        { stat: GEN.empatia, amount: 0.4 },
        { stat: GEN.cooperacion, amount: 0.3 },
      ],
      horario: fueraDeClase(10, 22),
    }),
    interaccion(n, {
      suffix: 'charlar',
      name: `Charlar un rato con ${yo}`,
      description: 'Un rato corto para mantener el contacto. Sube poco, pero cuesta casi nada.',
      duration: 30,
      tags: [TAGS.social],
      ganancia: 2.5,
      confianza: 1.5,
      train: [
        { stat: GEN.comunicacion, amount: 0.4 },
        { stat: GEN.empatia, amount: 0.2 },
      ],
      delta: { [GEN.energia]: -1 },
      horario: fueraDeClase(8, 22),
    }),
    interaccion(n, {
      suffix: 'ayudar',
      name: `Ayudar a ${yo} con algo`,
      description: 'Echarle una mano genera confianza más que simpatía. Hace falta conocerse un poco.',
      duration: 60,
      tags: [TAGS.social],
      ganancia: 4,
      confianza: 4.5,
      train: [
        { stat: GEN.empatia, amount: 0.6 },
        { stat: GEN.cooperacion, amount: 0.5 },
        { stat: GEN.determinacion, amount: 0.2 },
      ],
      delta: { [GEN.energia]: -6 },
      horario: fueraDeClase(10, 21),
      extra: (_ctx, v) => (v.afinidad >= AFINIDAD_PARA_AYUDAR ? true : `Primero tenéis que conoceros un poco más (charlad o quedad)`),
    }),
    interaccionDePlanes(n),
    interaccion(n, {
      suffix: 'detalle',
      name: `Tener un detalle con ${yo}`,
      description: 'Un gesto pensado para lo que le gusta. Una vez a la semana como mucho.',
      duration: 15,
      tags: [TAGS.social],
      ganancia: 3,
      confianza: 1,
      train: [
        { stat: GEN.empatia, amount: 0.3 },
        { stat: GEN.creatividad, amount: 0.3 },
      ],
      delta: { [GEN.energia]: -1 },
      horario: fueraDeClase(8, 22),
      extra: (ctx) => {
        const falta = espera(ctx.state<RelacionesState>(), `detalle.${n.id}`, ctx.time.day);
        return falta > 0 ? `Ya has tenido un detalle hace poco (en ${falta} día${falta === 1 ? '' : 's'} otra vez)` : true;
      },
      // Acierta más si es de su interés favorito (de ×1,15 a ×1,45).
      factor: () => 1 + 0.15 * (interesFavorito(n.rasgos)?.intensidad ?? 0),
      alTerminar: (ctx) => ponerEspera(ctx, `detalle.${n.id}`, ESPERA.detalle),
    }),
  ];
}

/** Hacer algo que les gusta a los dos: solo si ya comparten algún interés. */
function interaccionDePlanes(n: NpcView): ActionDef {
  const base = interaccion(n, {
    suffix: 'planes',
    name: `Hacer planes con ${nombreCorto(n)}`,
    description: 'Hacer juntos algo que os gusta a los dos. Rinde más cuanto más comparten.',
    duration: 90,
    tags: [TAGS.social, TAGS.ocio],
    ganancia: 6,
    confianza: 3,
    train: [
      { stat: GEN.carisma, amount: 0.5 },
      { stat: GEN.comunicacion, amount: 0.3 },
    ],
    horario: fueraDeClase(10, 22),
    extra: (ctx) => (mejorInteresEnComun(n.rasgos, perfilDe(ctx)?.intereses ?? {}) ? true : 'Todavía no habéis descubierto nada que os guste a los dos'),
    factor: (ctx) => 0.8 + 0.2 * (mejorInteresEnComun(n.rasgos, perfilDe(ctx)?.intereses ?? {})?.intensidad ?? 0),
  });
  return base;
}

/** Discutir: la única acción que resta. Es una decisión del jugador (desahogo a cambio de afinidad y confianza). */
function discutir(n: NpcView): ActionDef {
  const yo = nombreCorto(n);
  const nombre = n.role === 'rival' ? `Encararte con ${yo}` : esAutoridad(n) ? `Plantar cara a ${yo}` : `Discutir con ${yo}`;
  return {
    id: `relaciones.discutir.${n.id}`,
    name: nombre,
    description: 'Te desahogas, pero la relación sale tocada: pierdes afinidad y confianza, más con quien se toma mal las broncas o con quien manda.',
    tags: [TAGS.social],
    group: grupoDe(n),
    duration: 30,
    available: disponible(n, n.role === 'rival' ? fueraDeClase(10, 21) : horarioDe(n)),
    delta: { [GEN.energia]: -4, [GEN.estres]: -8 },
    train: [
      { stat: GEN.autoridad, amount: 0.6 },
      { stat: GEN.picardia, amount: 0.2 },
    ],
    run: (ctx) => {
      const dia = ctx.time.day;
      const perdida = perdidaPorDiscusion(n.rasgos, n.role);
      ctx.updateState<RelacionesState>((s) => ({
        ...s,
        vinculos: { ...s.vinculos, [n.id]: conContacto(vinculoDe(s, n, dia), dia, -perdida, -5) },
      }));
      ctx.log(`Discutes con ${yo}. Te desahogas, pero la relación se resiente.`, 'aviso');
    },
  };
}

/** Hacer las paces: solo si hay algo que arreglar, y no siempre sale bien. */
function hacerLasPaces(n: NpcView): ActionDef {
  const yo = nombreCorto(n);
  return {
    id: `relaciones.paces.${n.id}`,
    name: esAutoridad(n) ? `Pedir disculpas a ${yo}` : `Hacer las paces con ${yo}`,
    description: 'Solo si estáis a malas. Depende de cómo sea la otra persona y de lo enconado que esté; si sale mal, hay que esperar unos días para volver a intentarlo.',
    tags: [TAGS.social],
    group: grupoDe(n),
    duration: 30,
    available: disponible(n, n.role === 'rival' ? fueraDeClase(10, 21) : horarioDe(n), (ctx, v) => {
      if (NIVEL_ESTADO[v.estado] >= 0) return 'No hay nada que arreglar';
      const falta = espera(ctx.state<RelacionesState>(), `paces.${n.id}`, ctx.time.day);
      return falta > 0 ? `${yo} todavía no quiere hablar (inténtalo en ${falta} día${falta === 1 ? '' : 's'})` : true;
    }),
    delta: { [GEN.energia]: -3, [GEN.estres]: 3 },
    train: [
      { stat: GEN.empatia, amount: 0.5 },
      { stat: GEN.comunicacion, amount: 0.4 },
    ],
    run: (ctx) => {
      const dia = ctx.time.day;
      const v = vinculoDe(ctx.state<RelacionesState>(), n, dia);
      const p = probabilidadDePaces(n.rasgos, NIVEL_ESTADO[v.estado], compatDe(ctx, n));
      if (ctx.rng.chance(p)) {
        ctx.updateState<RelacionesState>((s) => ({
          ...s,
          vinculos: { ...s.vinculos, [n.id]: conContacto({ ...vinculoDe(s, n, dia), afinidad: -2, estado: 'conocido' }, dia, 5, 5) },
        }));
        ctx.log(`Hacéis las paces con ${yo}. Volvéis a ser conocidos y se puede empezar de nuevo.`, 'logro');
      } else {
        ctx.updateState<RelacionesState>((s) => ({
          ...s,
          vinculos: { ...s.vinculos, [n.id]: conContacto(vinculoDe(s, n, dia), dia, -3, -2) },
        }));
        ponerEspera(ctx, `paces.${n.id}`, ESPERA.paces);
        ctx.log(`${yo} no está listo para hablar de esto. Habrá que esperar unos días.`, 'aviso');
      }
    },
  };
}

/** Hablar con quien manda (entrenador, tutor): lo de siempre. */
function hablarConAutoridad(n: NpcView): ActionDef {
  return interaccion(n, {
    suffix: 'hablar',
    name: `Hablar con ${nombreCorto(n)} (${n.role === 'entrenador' ? (n.gender === 'f' ? 'entrenadora' : 'entrenador') : n.gender === 'f' ? 'tutora' : 'tutor'})`,
    duration: 30,
    tags: n.role === 'profesor' ? [TAGS.social, TAGS.estudio] : [TAGS.social],
    ganancia: 4,
    confianza: 2.5,
    train: [
      { stat: GEN.comunicacion, amount: 0.6 },
      { stat: GEN.carisma, amount: 0.3 },
    ],
    horario: horarioDe(n),
  });
}

/** Saludar y charlar con un rival conocido: la rivalidad también puede ser respeto. */
function saludarRival(n: NpcView): ActionDef {
  return interaccion(n, {
    suffix: 'charlar',
    name: `Charlar con ${nombreCorto(n)} (rival)`,
    description: 'Hablar con quien compite contigo: la rivalidad también puede acabar en respeto.',
    duration: 30,
    tags: [TAGS.social],
    ganancia: 2,
    confianza: 1,
    train: [
      { stat: GEN.comunicacion, amount: 0.3 },
      { stat: GEN.carisma, amount: 0.2 },
    ],
    delta: { [GEN.energia]: -1 },
    horario: fueraDeClase(10, 21),
  });
}

/**
 * Las acciones de una persona. Se guardan por persona (las definiciones solo dependen de ella, el estado se lee al evaluarlas),
 * así el motor las compila una vez y no cada vez que se piden las acciones disponibles.
 */
const memoAcciones = new Map<string, ActionDef[]>();
function accionesDe(n: NpcView): ActionDef[] {
  const clave = `${n.id}|${n.role}|${n.name}|${n.gender}`;
  let lista = memoAcciones.get(clave);
  if (!lista) {
    if (n.role === 'companero' || n.role === 'amigo') lista = [...accionesDeAmistad(n), discutir(n), hacerLasPaces(n)];
    else if (esAutoridad(n)) lista = [hablarConAutoridad(n), discutir(n), hacerLasPaces(n)];
    else if (n.role === 'rival') lista = [saludarRival(n), discutir(n), hacerLasPaces(n)];
    else lista = [];
    memoAcciones.set(clave, lista);
  }
  return lista;
}

export const relaciones = defineModule<RelacionesState>({
  id: 'relaciones',
  name: 'Relaciones',
  description: 'Vínculos con las personas que rodean al personaje.',
  dependsOn: ['gen'],

  initState: () => ({ vinculos: {} }),

  dynamicActions: (ctx) => {
    const dir = dirDe(ctx);
    if (!dir) return [];
    const lista: ActionDef[] = [];
    const s = ctx.state<RelacionesState>();
    const rivales: NpcView[] = [];
    for (const n of dir.list()) {
      if (!conocida(n)) continue;
      if (n.role === 'rival') rivales.push(n);
      else lista.push(...accionesDe(n));
    }
    // De los rivales conocidos solo se ofrecen los que más han marcado la relación (los demás son un nombre en una clasificación).
    rivales.sort((a, b) => Math.abs(s.vinculos[b.id]?.afinidad ?? 0) - Math.abs(s.vinculos[a.id]?.afinidad ?? 0));
    for (const n of rivales.slice(0, RIVALES_CON_ACCIONES)) lista.push(...accionesDe(n));
    return lista;
  },

  modifiers: [
    {
      // Compatibilidad: con quien comparte intereses y se parece en carácter, lo que sube la afinidad rinde más (×0,7 a ×1,4).
      id: 'relaciones.compatibilidad',
      tags: ['*'],
      apply: (ctx, action) => {
        if (!action.id.startsWith('relaciones.')) return null;
        const n = dirDe(ctx)?.get(action.id.split('.').pop()!);
        const yo = ctx.service<ProfileService>(SERVICES.perfil)?.view();
        if (!n?.rasgos || !yo) return null;
        const f = factorDeCompatibilidad(compatibilidad(n.rasgos, yo));
        return Math.abs(f - 1) < 0.02 ? null : { efficiency: f, reason: `Compatibilidad con ${n.name.split(' ')[0]}` };
      },
    },
    {
      id: 'relaciones.apoyo',
      tags: ['*'],
      apply: (ctx, action) => {
        const dir = dirDe(ctx);
        if (!dir) return null;
        let bonus = 0;
        const quienes: string[] = [];
        for (const v of Object.values(ctx.state<RelacionesState>().vinculos)) {
          if (v.afinidad < UMBRAL_APOYO) continue;
          const n = dir.get(v.npcId);
          if (!n || !n.supports.some((t) => action.tags.includes(t))) continue;
          bonus += Math.min(0.15, (v.afinidad - UMBRAL_APOYO) / 400);
          quienes.push(n.name.split(' ')[0]);
        }
        if (bonus < 0.01) return null;
        return { efficiency: 1 + Math.min(0.3, bonus), reason: `Apoyo de ${quienes.join(', ')}` };
      },
    },
  ],

  on: {
    [CORE_EVENTS.DAY_END]: (ctx, ev) => {
      const { day } = ev.data as { day: number };
      ctx.updateState<RelacionesState>((s) => {
        const vinculos: Record<string, Vinculo> = {};
        for (const [id, v] of Object.entries(s.vinculos)) vinculos[id] = pasarDia(v, day);
        return { ...s, vinculos };
      });
    },

    [SHARED_EVENTS.COMPETITION_RESULT]: (ctx, ev) => {
      const r = ev.data as CompetitionResultData;
      const dir = dirDe(ctx);
      if (!dir) return;
      const dia = ctx.time.day;
      ctx.updateState<RelacionesState>((s) => {
        const vinculos = { ...s.vinculos };
        // El entrenador de ese deporte valora el esfuerzo y más aún el podio.
        for (const n of dir.list({ role: 'entrenador' })) {
          if (n.supports.includes(r.module)) vinculos[n.id] = conCambio(vinculoDe(s, n, dia), dia, r.position <= 3 ? 3 : 1);
        }
        // Los rivales que te ganan se crecen; los que pierden, te respetan un poco más. Competir con alguien es conocerlo.
        for (const p of r.participants) {
          const n = p.npcId ? dir.get(p.npcId) : undefined;
          if (!n || n.role !== 'rival') continue;
          vinculos[n.id] = conCambio(vinculos[n.id] ?? nuevoVinculo(n.id, dia), dia, p.mark > r.mark ? 1 : -0.5);
        }
        return { ...s, vinculos };
      });
    },
  },

  services: {
    [SERVICES.relaciones]: (ctx): RelationsService => {
      const s = ctx.state<RelacionesState>();
      const dir = dirDe(ctx);
      const dia = ctx.time.day;
      return {
        get: (npcId) => {
          const guardado = s.vinculos[npcId];
          if (guardado) return vista(guardado);
          const n = dir?.get(npcId);
          return n && conocida(n) ? vista(nuevoVinculo(n.id, dia)) : undefined;
        },
        list: () => {
          const lista = new Map<string, RelationView>();
          for (const n of dir?.list() ?? []) if (conocida(n)) lista.set(n.id, vista(vinculoDe(s, n, dia)));
          for (const v of Object.values(s.vinculos)) lista.set(v.npcId, vista(v));
          return [...lista.values()];
        },
      };
    },
  },
});

export default relaciones;
