import {
  CORE_EVENTS,
  GEN,
  SERVICES,
  SHARED_EVENTS,
  TAGS,
  conLugar,
  defineModule,
  inHours,
  isSchoolHours,
  enRecreo,
  enHuecoEntreClases,
  type PerfilDelPersonaje,
  type IdentityService,
  NIVEL_ESTADO,
  type ActionContext,
  type ActionDef,
  type AreaDeAyuda,
  type ClubAbandonoData,
  type ClubDirectory,
  type CompetitionResultData,
  type LugaresService,
  type PresenciaService,
  type DatoPersonal,
  type DatoPersonalData,
  type PlanView,
  type PresentacionData,
  NIVEL_AGENDA,
  MINUTOS_ANTES_DE_CLASE,
  claseQueVaAEmpezar,
  LLEGADA_AL_COLEGIO,
  JORNADA_ESCOLAR,
  timeView,
  ubicacionEn,
  azarDe,
  aforoCercano,
  descripcionDeDesconocido,
  edadAparente,
  nombreSegunEdad,
  type NpcDirectory,
  type NpcView,
  type ProfileService,
  type ReadContext,
  aptitudDe,
  compatibilidad,
  factorDeCompatibilidad,
  type RelationView,
  type RelationsService,
} from '@ds/contracts';
import {
  AFINIDAD_PARA_AYUDAR,
  ESPERA,
  PLAN,
  PLANES,
  responderAPlan,
  type ActividadDePlan,
  HABILIDADES_DE_ACCION,
  HABILIDADES_DE_PACES,
  disposicion,
  factorDeHabilidad,
  usoDelAspecto,
  interesFavorito,
  mejorInteresEnComun,
  perdidaPorDiscusion,
  probabilidadDePaces,
} from './acciones';
import { conCambio, conContacto, nuevoVinculo, pasarDia, type Vinculo } from './vinculo';

const limitar = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

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
  /** Planes acordados (y los de los últimos días, para dejar margen entre uno y otro). */
  planes?: PlanAcordado[];
  /** Charlas de 5 minutos de hoy con cada persona (como mucho `CHARLAS_AL_DIA`). */
  charlas?: Record<string, { dia: number; n: number }>;
  /** Día de la última actividad «grande» (quedar, ayudar, discutir...) con cada persona: una al día. */
  grandes?: Record<string, number>;
}

/** Un plan acordado: hecho o plantado cuando ya no está pendiente (se guarda unos días por el margen entre planes). */
export interface PlanAcordado extends PlanView {
  actividad: ActividadDePlan;
  resuelto?: boolean;
}

/** Las charlas son de 5 minutos y se pueden acumular hasta 6 al día con la misma persona (30 minutos en total). */
const MINUTOS_DE_CHARLA = 5;
const CHARLAS_AL_DIA = 6;
/** Una charla vale una parte de lo que valía la de 30 minutos. */
const PARTE_DE_CHARLA = MINUTOS_DE_CHARLA / (MINUTOS_DE_CHARLA * CHARLAS_AL_DIA);

/** Afinidad con la que alguien ayuda del todo: por debajo ayuda en proporción (se os da mejor cuanto más os conocéis). */
const AFINIDAD_AYUDA_COMPLETA = 40;
/** Lo máximo que sube la eficiencia de lo que hacéis juntos cuando la otra persona es muy buena en eso. */
const AYUDA_MAXIMA = 0.3;
/** Qué área cuenta en cada actividad conjunta (el sufijo del id de la acción). */
const AREA_DE_ACCION: Readonly<Record<string, AreaDeAyuda>> = { estudiar: 'estudio', quedar: 'social', planes: 'social' };
const MOTIVO_DE_AREA: Readonly<Record<AreaDeAyuda, string>> = { estudio: 'se te da bien estudiar y te ayuda', social: 'es muy sociable y te contagia', deporte: 'es buen deportista y te ayuda' };

/** Ayuda (0 a `AYUDA_MAXIMA`) de una persona en un área: su aptitud por encima de lo típico (0,4 → nada, 0,8 → todo) y cuánto os conocéis. */
function ayudaDe(n: NpcView, area: AreaDeAyuda, afinidad: number): number {
  const apt = limitar((aptitudDe(area, n.rasgos, n.levels) - 0.4) / 0.4, 0, 1);
  return AYUDA_MAXIMA * apt * limitar(afinidad / AFINIDAD_AYUDA_COMPLETA, 0, 1);
}
/** Cuántos rivales conocidos ofrecen acciones a la vez (los de mayor afinidad, a favor o en contra). */
const RIVALES_CON_ACCIONES = 5;

/** Lo que empeora la relación con el entrenador y con cada miembro del equipo de un club al que dejas plantado (ver `docs/ANEXO_DEPORTE.md`). */
const PLANTON = { entrenador: { afinidad: 15, confianza: 10 }, equipo: { afinidad: 6, confianza: 3 } };

const dirDe = (ctx: ReadContext) => ctx.service<NpcDirectory>(SERVICES.npcs);

/** ¿Conoce el personaje a esta persona? Los rivales, solo tras competir contra ellos. */
const conocida = (n: NpcView) => n.known !== false;

/**
 * Cómo empieza el vínculo con alguien. Todos parten de 0 (conocido), salvo los hermanos: llevan toda la vida juntos y empiezan
 * con una afinidad de 5 a 25 según lo compatibles que sean (intereses y carácter) y lo lejos que estén en edad.
 */
function vinculoInicial(ctx: ReadContext, n: NpcView, dia: number): Vinculo {
  if (n.role !== 'familia') return nuevoVinculo(n.id, dia);
  // Los padres: toda la vida juntos y un vínculo más hondo que con un hermano.
  if (n.tags.includes('progenitor')) return { ...nuevoVinculo(n.id, dia, true), afinidad: limitar(15 + 40 * (compatDe(ctx, n) - 0.2), 15, 35), confianza: 30 };
  const yo = ctx.service<IdentityService>(SERVICES.identidad)?.view();
  const diferencia = n.age !== undefined && yo ? Math.abs(n.age - yo.seasonAge) : 0;
  const afinidad = limitar(5 + 40 * (compatDe(ctx, n) - 0.2) - 1.5 * Math.max(0, diferencia - 3), 5, 25);
  return { ...nuevoVinculo(n.id, dia, true), afinidad, confianza: 15 };
}

const vinculoDe = (ctx: ReadContext, s: RelacionesState, n: NpcView, dia: number): Vinculo => s.vinculos[n.id] ?? vinculoInicial(ctx, n, dia);

const vista = (v: Vinculo): RelationView => ({
  npcId: v.npcId,
  estado: v.estado,
  nivel: NIVEL_ESTADO[v.estado],
  afinidad: v.afinidad,
  confianza: v.confianza,
  ultimoContacto: v.ultimoContacto,
});

const entreMinutos = (ctx: ReadContext, desde: number, hasta: number): boolean => ctx.time.minuteOfDay >= desde && ctx.time.minuteOfDay < hasta;

/** Antes de las clases ya están en el colegio: desde las 7:30 se puede hablar con quien llega (las clases empiezan a las 8:00). */
const DESDE_LA_LLEGADA = JORNADA_ESCOLAR.clases[0][0] - LLEGADA_AL_COLEGIO;

/** Fuera de clase y entre `desde` y `hasta`; con `recreo`, también en el recreo (lo corto se puede hacer entre clase y clase). */
const fueraDeClase = (desde: number, hasta: number, recreo = false) => (ctx: ReadContext) =>
  (!isSchoolHours(ctx.time) || (recreo && (enRecreo(ctx.time) || enHuecoEntreClases(ctx.time)))) && (inHours(ctx.time, desde, hasta) || (recreo && ctx.time.isSchoolDay && entreMinutos(ctx, DESDE_LA_LLEGADA, desde * 60)))
    ? true
    : `Disponible de ${desde} a ${hasta}, fuera de clase${recreo ? ' (o en el recreo)' : ''}`;

/** El horario de las preguntas y las propuestas (se crea una sola vez: se evalúa en cada acción). */
const HORARIO_DE_PREGUNTAS = fueraDeClase(8, 22, true);

const nombreCorto = (n: NpcView) => n.name.split(' ')[0];
const esAutoridad = (n: NpcView) => n.role === 'entrenador' || n.role === 'profesor';

/** Horario de hablar con cada tipo de persona. */
function horarioDe(n: NpcView): (ctx: ReadContext) => true | string {
  // Al entrenador se le habla antes y después de la sesión o la carrera (durante, está ocupado: ver `ocupado` en las agendas).
  if (n.role === 'entrenador') return (c) => (entreMinutos(c, c.time.isSchoolDay ? 14 * 60 + 45 : 8 * 60 + 45, c.time.isSchoolDay ? 21 * 60 : 14 * 60) ? true : 'Al entrenador se le habla antes o después de la sesión');
  if (n.role === 'profesor') return (c) => ((c.time.isSchoolDay && inHours(c.time, 14, 17)) || enRecreo(c.time) ? true : 'Tutorías los días de clase, de 14 a 17 (o en el recreo)');
  return fueraDeClase(10, 21);
}

/** Nivel (0..1, «para su edad») de las habilidades del personaje que cuentan en una acción, ponderadas. */
const nivelDeHabilidad = (ctx: ReadContext, pesos: readonly { stat: string; peso: number }[]): number => pesos.reduce((t, h) => t + h.peso * ctx.norm(h.stat), 0);

/** «hermana», «padre»...: el parentesco de la familia. */
const parentesco = (n: NpcView): string =>
  n.tags.includes('progenitor') ? (n.gender === 'f' ? 'madre' : 'padre') : n.gender === 'f' ? 'hermana' : 'hermano';
const grupoDe = (n: NpcView) => `Relaciones · ${nombreCorto(n)}${n.role === 'familia' ? ` (${parentesco(n)})` : ''}`;
const perfilDe = (ctx: ReadContext) => ctx.service<ProfileService>(SERVICES.perfil)?.view();
const compatDe = (ctx: ReadContext, n: NpcView): number => {
  const yo = perfilDe(ctx);
  return n.rasgos && yo ? compatibilidad(n.rasgos, yo) : 0.4;
};

/**
 * Hablar con alguien exige que esté donde tú estás (entre la gente que tienes cerca). Si no está, no hay forma de hablarle ni de saber dónde
 * anda: hasta que haya teléfono, solo se habla con quien coincide contigo. Sin los servicios `presencia` y `lugares` no se restringe nada.
 */
const presenteAqui = (n: NpcView) => (ctx: ReadContext): true | string => {
  const cerca = cercanosConClave(ctx);
  if (!cerca) return true;
  return cerca.ids.has(n.id) ? true : `${nombreCorto(n)} no está aquí`;
};

/** Requisitos comunes: un solo contacto al día con cada persona y que esté contigo. */
function disponible(n: NpcView, horario: (ctx: ReadContext) => true | string, extra?: (ctx: ReadContext, v: Vinculo) => true | string, sinPresencia = false, charla = false) {
  const presente = presenteAqui(n);
  return (ctx: ReadContext): true | string => {
    const s = ctx.state<RelacionesState>();
    if (charla) {
      const c = s.charlas?.[n.id];
      if (c?.dia === ctx.time.day && c.n >= CHARLAS_AL_DIA) return `Ya has charlado con ${nombreCorto(n)} todo lo que da de sí hoy`;
    } else if (s.grandes?.[n.id] === ctx.time.day) return `Ya has estado con ${nombreCorto(n)} hoy`;
    const h = horario(ctx);
    if (h !== true) return h;
    const otro = extra ? extra(ctx, vinculoDe(ctx, s, n, ctx.time.day)) : true;
    return otro !== true || sinPresencia ? otro : presente(ctx);
  };
}

const escalar = (d: Record<string, number>, f: number): Record<string, number> => (f === 1 ? d : Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v * f])));

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
    /** No hace falta que esté entre la gente que tienes cerca (un plan acordado: ya estáis citados). */
    sinPresencia?: boolean;
    /** Sitio donde se hace (un plan se hace en el sitio acordado). */
    lugar?: readonly string[];
    /** Una charla: dura 5 minutos y vale una sexta parte de lo indicado (que es lo que daría media hora); hasta 6 al día. */
    charla?: boolean;
  },
): ActionDef {
  const def: ActionDef = {
    id: `relaciones.${cfg.suffix}.${n.id}`,
    name: cfg.name,
    description: cfg.description,
    tags: cfg.tags,
    group: grupoDe(n),
    duration: cfg.charla ? MINUTOS_DE_CHARLA : cfg.duration,
    available: disponible(n, cfg.horario, cfg.extra, cfg.sinPresencia, cfg.charla),
    delta: escalar(cfg.delta ?? (cfg.tags.includes(TAGS.ocio) ? { [GEN.energia]: -6, [GEN.estres]: -6 } : { [GEN.energia]: -3 }), cfg.charla ? PARTE_DE_CHARLA : 1),
    train: cfg.charla ? cfg.train.map((t) => ({ ...t, amount: t.amount * PARTE_DE_CHARLA })) : cfg.train,
    run: (ctx) => {
      const dia = ctx.time.day;
      const f = (cfg.factor?.(ctx) ?? 1) * ctx.efficiency * (cfg.charla ? PARTE_DE_CHARLA : 1);
      ctx.updateState<RelacionesState>((s) => ({
        ...s,
        vinculos: { ...s.vinculos, [n.id]: conContacto(vinculoDe(ctx, s, n, dia), dia, cfg.ganancia * f, cfg.confianza * f) },
        ...(cfg.charla ? { charlas: { ...s.charlas, [n.id]: { dia, n: (s.charlas?.[n.id]?.dia === dia ? s.charlas[n.id].n : 0) + 1 } } } : { grandes: { ...s.grandes, [n.id]: dia } }),
      }));
      cfg.alTerminar?.(ctx);
    },
  };
  return cfg.lugar ? conLugar(cfg.lugar, def) : def;
}

// ------------------------------------------------------------------------------------------------------------------ planes

/** El plan acordado con esta persona para ahora mismo (desde la hora acordada hasta pasada la cortesía), si lo hay. */
function planDeAhora(ctx: ReadContext, npcId: string, actividad: ActividadDePlan): PlanAcordado | undefined {
  const t = ctx.time;
  return ctx.state<RelacionesState>().planes?.find(
    (p) => !p.resuelto && p.npcId === npcId && p.actividad === actividad && p.dia === t.day && t.minuteOfDay >= p.minuto && t.minuteOfDay <= p.minuto + PLAN.cortesia,
  );
}

function cerrarPlan(ctx: ActionContext, npcId: string, actividad: ActividadDePlan): void {
  const t = ctx.time;
  ctx.updateState<RelacionesState>((s) => ({
    ...s,
    planes: (s.planes ?? []).map((p) => (!p.resuelto && p.npcId === npcId && p.actividad === actividad && p.dia === t.day ? { ...p, resuelto: true } : p)),
  }));
}

const textoDeDia = (hoy: number, dia: number): string => (dia === hoy ? 'hoy' : dia === hoy + 1 ? 'mañana' : `dentro de ${dia - hoy} días`);
const hhmm = (m: number): string => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;

/** Por qué no puede esa persona a esa hora (clase, entreno, carrera...), si no puede: se mira su agenda en tres momentos del plan. */
function ocupacionDe(ctx: ReadContext, n: NpcView, dia: number, minuto: number, duracion: number): string | undefined {
  const agenda = ctx.service<PresenciaService>(SERVICES.presencia)?.agenda(n.id);
  if (!agenda?.length) return undefined;
  for (const m of [minuto, minuto + Math.floor(duracion / 2), minuto + duracion - 1]) {
    const u = ubicacionEn(agenda, timeView(dia * 1440 + m), n.id);
    if (u.ocupado || u.nivel >= NIVEL_AGENDA.pertenencia) return u.tipo === 'club' || u.tipo === 'rival' || u.tipo === 'entrenador' ? 'tiene entrenamiento o carrera a esa hora' : 'tiene clase a esa hora';
  }
  return undefined;
}

/**
 * Proponer un plan (hoy o mañana a la hora de la actividad): la otra persona decide según lo que tenga que hacer, la amistad y la confianza,
 * y deja margen entre plan y plan. Solo se le puede proponer a quien tienes delante (aún no hay teléfono).
 */
function proponerPlan(n: NpcView, actividad: ActividadDePlan, cuando: 'hoy' | 'manana'): ActionDef {
  const cfg = PLANES[actividad];
  const dias = cuando === 'hoy' ? 0 : 1;
  const clave = `plan.${n.id}.${actividad}.${cuando}`;
  const presente = presenteAqui(n);
  return {
    id: `relaciones.plan_${cuando}.${n.id}`,
    name: `Proponer a ${nombreCorto(n)} ${cfg.nombre} ${cuando === 'hoy' ? 'hoy' : 'mañana'} a las ${hhmm(cfg.hora)}`,
    description: `${cfg.lugarTexto[0].toUpperCase()}${cfg.lugarTexto.slice(1)}, ${cfg.duracion} min. Acepta según lo que tenga que hacer, lo bien que os llevéis y cuándo fue la última vez: entre un plan y otro hace falta un día de margen, salvo que seáis muy amigos.`,
    tags: [TAGS.social],
    group: grupoDe(n),
    duration: MINUTOS_DE_CHARLA,
    available: (ctx) => {
      const s = ctx.state<RelacionesState>();
      const dia = ctx.time.day + dias;
      if (cuando === 'hoy' && ctx.time.minuteOfDay > cfg.hora - PLAN.antelacion) return 'Ya es tarde para quedar hoy';
      if (s.planes?.some((p) => p.npcId === n.id && p.dia === dia)) return `Ya habéis quedado ${textoDeDia(ctx.time.day, dia)}`;
      if (espera(s, clave, ctx.time.day) > 0) return `Ya se lo has propuesto: ${textoDeDia(ctx.time.day, dia)} ya no cambiará de idea`;
      const horario = HORARIO_DE_PREGUNTAS(ctx);
      return horario !== true ? horario : presente(ctx);
    },
    run: (ctx) => {
      const s = ctx.state<RelacionesState>();
      const dia = ctx.time.day + dias;
      const v = vinculoDe(ctx, s, n, ctx.time.day);
      const respuesta = responderAPlan({
        afinidad: v.afinidad,
        confianza: v.confianza,
        ocupadoPorAgenda: ocupacionDe(ctx, n, dia, cfg.hora, cfg.duracion),
        planPegado: !!s.planes?.some((p) => p.npcId === n.id && Math.abs(p.dia - dia) === 1),
        azarOcupado: azarDe('plan.ocupado', n.id, dia),
        azarGusto: azarDe('plan.gusto', n.id, dia, actividad),
      });
      // Lo propuesto para ese día no se vuelve a preguntar (hasta que pase).
      ponerEspera(ctx, clave, dias + 1);
      if (!respuesta.acepta) {
        ctx.log(`${nombreCorto(n)} no puede ${textoDeDia(ctx.time.day, dia)}: ${respuesta.motivo}.`, 'info');
        return;
      }
      ctx.updateState<RelacionesState>((st) => ({
        ...st,
        planes: [...(st.planes ?? []), { npcId: n.id, actividad, dia, minuto: cfg.hora, lugar: cfg.lugar }],
        vinculos: { ...st.vinculos, [n.id]: conCambio(vinculoDe(ctx, st, n, ctx.time.day), ctx.time.day, 1) },
      }));
      ctx.log(`${nombreCorto(n)} acepta: ${cfg.nombre} ${textoDeDia(ctx.time.day, dia)} a las ${hhmm(cfg.hora)} ${cfg.lugarTexto}. Se espera que llegues a tiempo.`, 'logro');
    },
  };
}

/** Las acciones propias de un compañero o un amigo (la vida de todos los días). */
function accionesDeAmistad(n: NpcView): ActionDef[] {
  const yo = nombreCorto(n);
  return [
    interaccion(n, {
      suffix: 'quedar',
      name: n.role === 'familia' ? `Pasar la tarde con ${yo}` : `Quedar con ${yo}`,
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
      description: 'Cinco minutos de charla para mantener el contacto; se pueden juntar hasta seis al día (media hora). Sube poco, pero cuesta casi nada.',
      charla: true,
      duration: 30,
      tags: [TAGS.social],
      ganancia: 2.5,
      confianza: 1.5,
      train: [
        { stat: GEN.comunicacion, amount: 0.4 },
        { stat: GEN.empatia, amount: 0.2 },
      ],
      delta: { [GEN.energia]: -1 },
      horario: fueraDeClase(8, 22, true),
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
      description: 'Un gesto pensado para lo que le gusta (5 minutos). Una vez a la semana como mucho.',
      duration: 5,
      tags: [TAGS.social],
      ganancia: 3,
      confianza: 1,
      train: [
        { stat: GEN.empatia, amount: 0.3 },
        { stat: GEN.creatividad, amount: 0.3 },
      ],
      delta: { [GEN.energia]: -1 },
      horario: fueraDeClase(8, 22, true),
      extra: (ctx) => {
        const falta = espera(ctx.state<RelacionesState>(), `detalle.${n.id}`, ctx.time.day);
        return falta > 0 ? `Ya has tenido un detalle hace poco (en ${falta} día${falta === 1 ? '' : 's'} otra vez)` : true;
      },
      // Acierta más si es de su interés favorito (de ×1,15 a ×1,45).
      factor: () => 1 + 0.15 * (interesFavorito(n.rasgos)?.intensidad ?? 0),
      alTerminar: (ctx) => ponerEspera(ctx, `detalle.${n.id}`, ESPERA.detalle),
    }),
    // Estudiar se acuerda antes (ver `proponerPlan`) y se hace a la hora y en el sitio acordados. Va después de las demás: el hermano pequeño solo usa la primera y el detalle.
    interaccion(n, {
      suffix: 'estudiar',
      name: `Estudiar con ${yo} (plan acordado)`,
      description: 'Estudiar juntos, como habéis quedado. Rinde más si la otra persona se te da bien estudiar y os conocéis.',
      duration: PLANES.estudiar.duracion,
      tags: [TAGS.estudio, TAGS.mental, TAGS.social],
      ganancia: 2.5,
      confianza: 2,
      train: [
        { stat: GEN.concentracion, amount: 0.6 },
        { stat: GEN.inteligencia, amount: 0.3 },
        { stat: GEN.cooperacion, amount: 0.2 },
      ],
      delta: { [GEN.energia]: -8 },
      horario: (ctx) => (planDeAhora(ctx, n.id, 'estudiar') ? true : 'Primero hay que quedar: propónselo para hoy o mañana'),
      sinPresencia: true,
      lugar: [PLANES.estudiar.lugar],
      alTerminar: (ctx) => cerrarPlan(ctx, n.id, 'estudiar'),
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
        vinculos: { ...s.vinculos, [n.id]: conContacto(vinculoDe(ctx, s, n, dia), dia, -perdida, -5) },
        grandes: { ...s.grandes, [n.id]: dia },
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
      const v = vinculoDe(ctx, ctx.state<RelacionesState>(), n, dia);
      const p = probabilidadDePaces(n.rasgos, NIVEL_ESTADO[v.estado], compatDe(ctx, n), nivelDeHabilidad(ctx, HABILIDADES_DE_PACES));
      if (ctx.rng.chance(p)) {
        ctx.updateState<RelacionesState>((s) => ({
          ...s,
          vinculos: { ...s.vinculos, [n.id]: conContacto({ ...vinculoDe(ctx, s, n, dia), afinidad: -2, estado: 'conocido' }, dia, 5, 5) },
          grandes: { ...s.grandes, [n.id]: dia },
        }));
        ctx.log(`Hacéis las paces con ${yo}. Volvéis a ser conocidos y se puede empezar de nuevo.`, 'logro');
      } else {
        ctx.updateState<RelacionesState>((s) => ({
          ...s,
          vinculos: { ...s.vinculos, [n.id]: conContacto(vinculoDe(ctx, s, n, dia), dia, -3, -2) },
          grandes: { ...s.grandes, [n.id]: dia },
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
    charla: true,
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
    charla: true,
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
const memoPaces = new Map<string, ActionDef>();
function pacesDe(n: NpcView): ActionDef {
  const clave = `${n.id}|${n.role}|${n.name}|${n.gender}`;
  let a = memoPaces.get(clave);
  if (!a) memoPaces.set(clave, (a = hacerLasPaces(n)));
  return a;
}
/**
 * Preguntas de 2 minutos para conocer mejor a alguien que tienes delante: cuántos años tiene (y cuándo cumple), a qué colegio va y a qué
 * clase (los niños) o a qué se dedica y dónde trabaja (los adultos). Solo se ofrece lo que todavía no sabes y lo que tiene sentido (el colegio de un compañero ya lo sabes; la clase, solo si es de tu
 * colegio). Lo aprendido lo guarda `npcs` (evento `persona.dato`).
 */
const PREGUNTAS: Readonly<Record<DatoPersonal, { nombre: (n: NpcView) => string; descripcion: string }>> = {
  edad: { nombre: (n) => `Preguntar a ${nombreCorto(n)} cuántos años tiene y cuándo cumple`, descripcion: 'Si no lo sabes, a simple vista solo ves si es mayor o menor que tú.' },
  colegio: { nombre: (n) => `Preguntar a ${nombreCorto(n)} a qué colegio va`, descripcion: 'Dos minutos de conversación.' },
  clase: { nombre: (n) => `Preguntar a ${nombreCorto(n)} a qué clase va`, descripcion: 'Solo con quien es de tu colegio.' },
  profesion: { nombre: (n) => `Preguntar a ${nombreCorto(n)} a qué se dedica`, descripcion: 'Dos minutos de conversación.' },
  trabajo: { nombre: (n) => `Preguntar a ${nombreCorto(n)} dónde trabaja`, descripcion: 'Dos minutos de conversación.' },
};
const memoPreguntas = new Map<string, ActionDef>();
function preguntarDe(n: NpcView, dato: DatoPersonal): ActionDef {
  const clave = `${n.id}|${dato}|${n.name}|${n.gender}`;
  let a = memoPreguntas.get(clave);
  if (!a) {
    const presente = presenteAqui(n);
    a = {
      id: `relaciones.preguntar_${dato}.${n.id}`,
      name: PREGUNTAS[dato].nombre(n),
      description: PREGUNTAS[dato].descripcion,
      tags: [TAGS.social],
      group: grupoDe(n),
      duration: 2,
      available: (ctx) => {
        if (dirDe(ctx)?.get(n.id)?.sabe?.includes(dato)) return 'Ya lo sabes';
        const horario = HORARIO_DE_PREGUNTAS(ctx);
        return horario !== true ? horario : presente(ctx);
      },
      run: (ctx) => {
        ctx.emit<DatoPersonalData>({ type: SHARED_EVENTS.DATO_PERSONAL, data: { npcId: n.id, dato } });
        // Interesarse por alguien le gusta un poco.
        const dia = ctx.time.day;
        ctx.updateState<RelacionesState>((s) => ({ ...s, vinculos: { ...s.vinculos, [n.id]: conCambio(vinculoDe(ctx, s, n, dia), dia, 0.4, 0.2) } }));
      },
    };
    memoPreguntas.set(clave, a);
  }
  return a;
}
/** Qué se le puede preguntar a esta persona: lo que aplica y todavía no sabes. */
const preguntasPendientes = (n: NpcView): DatoPersonal[] => {
  const sabe = n.sabe ?? [];
  const lista: DatoPersonal[] = [];
  if (n.nacimiento !== undefined && !sabe.includes('edad')) lista.push('edad');
  if (n.colegio !== undefined && !sabe.includes('colegio')) lista.push('colegio');
  if (n.clase !== undefined && !sabe.includes('clase')) lista.push('clase');
  if (n.profesion !== undefined && !sabe.includes('profesion')) lista.push('profesion');
  if (n.trabajo !== undefined && !sabe.includes('trabajo')) lista.push('trabajo');
  return lista;
};

/** Con quién se acuerdan planes: compañeros, amigos y hermanos (no los padres). Las propuestas solo se ofrecen a quien tienes delante. */
const aceptaPlanes = (n: NpcView) => n.role === 'companero' || n.role === 'amigo' || (n.tags.includes('hermano') && (n.age ?? 8) >= 6);
const memoPropuestas = new Map<string, ActionDef[]>();
function propuestasDe(n: NpcView): ActionDef[] {
  const clave = `${n.id}|${n.name}|${n.gender}`;
  let a = memoPropuestas.get(clave);
  if (!a) memoPropuestas.set(clave, (a = (['hoy', 'manana'] as const).map((cuando) => proponerPlan(n, 'estudiar', cuando))));
  return a;
}

function accionesDe(n: NpcView): ActionDef[] {
  const clave = `${n.id}|${n.role}|${n.name}|${n.gender}|${n.role === 'familia' && (n.age ?? 8) < 6 ? 'pequeño' : ''}`;
  let lista = memoAcciones.get(clave);
  if (!lista) {
    if (n.role === 'companero' || n.role === 'amigo') lista = [...accionesDeAmistad(n), discutir(n)];
    // Un hermano pequeño (menos de 6 años) solo da para jugar con él y tener un detalle; con los demás hay todo el catálogo.
    else if (n.role === 'familia') {
      const todas = accionesDeAmistad(n);
      // Con los padres no se queda para estudiar (de momento: acordar planes es con hermanos, compañeros y amigos).
      lista = n.tags.includes('progenitor') ? [...todas.filter((a) => !/\.estudiar\./.test(a.id)), discutir(n)] : (n.age ?? 8) < 6 ? [todas[0], todas[4]] : [...todas, discutir(n)];
    }
    else if (esAutoridad(n)) lista = [hablarConAutoridad(n), discutir(n)];
    else if (n.role === 'rival') lista = [saludarRival(n), discutir(n)];
    else lista = [];
    memoAcciones.set(clave, lista);
  }
  return lista;
}

/**
 * Preguntar el nombre a alguien que no conoces y tienes cerca: cuesta 2 minutos y pasa de desconocido a conocido (lo hace el módulo
 * `npcs`, que escucha el evento compartido). Una acción por persona; se guardan por persona para que el motor las compile una vez.
 */
const memoPresentaciones = new Map<string, ActionDef>();
function presentarse(n: NpcView): ActionDef {
  const clave = `${n.id}|${n.gender}|${nombreSegunEdad(n.gender, edadAparente(n))}`;
  let a = memoPresentaciones.get(clave);
  if (!a) {
    const quien = n.rasgos ? descripcionDeDesconocido(n.rasgos.apariencia, n.gender, edadAparente(n)).toLowerCase() : n.gender === 'f' ? 'una chica' : 'un chico';
    a = {
      id: `relaciones.presentarse.${n.id}`,
      name: `Preguntar el nombre a ${quien}`,
      description: 'Te presentas y preguntas cómo se llama.',
      tags: [TAGS.social],
      group: 'Gente aquí',
      duration: 2,
      available: (ctx) => (cercanos(ctx).some((x) => x.id === n.id) ? true : 'Ya no está aquí'),
      run: (ctx) => ctx.emit<PresentacionData>({ type: SHARED_EVENTS.PRESENTACION, data: { npcId: n.id } }),
    };
    memoPresentaciones.set(clave, a);
  }
  return a;
}

/**
 * Las personas que tienes cerca ahora (las que ves en el lugar donde estás). Se piden en cada acción de presentarse (hasta 40 a la vez),
 * así que se recuerdan mientras no cambie la presencia (su versión) ni el lugar: lo único que las cambia es un cambio de tramo o moverte.
 */
interface Cercanos {
  clave: string;
  lista: NpcView[];
  ids: Set<string>;
  acciones?: ActionDef[];
}
/** La última lista de cercanos: se pide en cada acción de relación (cientos por jugada) y solo cambia con la versión de la presencia o el lugar. */
let ULTIMOS_CERCANOS: Cercanos | undefined;
function cercanosConClave(ctx: ReadContext): Cercanos | undefined {
  const lugar = ctx.service<LugaresService>(SERVICES.lugares)?.actual().id;
  const presencia = ctx.service<PresenciaService>(SERVICES.presencia);
  if (!lugar || !presencia) return undefined;
  // La presencia solo cambia con su versión (un cambio de tramo, de día o de personas): no hace falta recalcularla en cada acción.
  const clave = `${presencia.version}|${lugar}`;
  if (ULTIMOS_CERCANOS?.clave === clave) return ULTIMOS_CERCANOS;
  const lista = presencia.en(lugar, aforoCercano(lugar, presencia.version));
  return (ULTIMOS_CERCANOS = { clave, lista, ids: new Set(lista.map((n) => n.id)) });
}

const cercanos = (ctx: ReadContext): NpcView[] => cercanosConClave(ctx)?.lista ?? [];

/** Las acciones de preguntar el nombre a quien tienes cerca y no conoces (se recuerdan junto a la lista de cercanos). */
function presentaciones(ctx: ReadContext): ActionDef[] {
  const c = cercanosConClave(ctx);
  if (!c) return [];
  return (c.acciones ??= c.lista.filter((n) => n.known === false).map(presentarse));
}

/** El servicio de personas y el perfil del personaje, recordados por minuto de juego: los piden los modificadores de cada acción de cada persona. */
const SOCIAL = new WeakMap<ReadContext, { minuto: number; dir?: NpcDirectory; perfil?: PerfilDelPersonaje; edad?: number }>();
function social(ctx: ReadContext) {
  let c = SOCIAL.get(ctx);
  if (!c || c.minuto !== ctx.time.minute) {
    c = { minuto: ctx.time.minute, dir: dirDe(ctx), perfil: ctx.service<ProfileService>(SERVICES.perfil)?.view(), edad: ctx.service<IdentityService>(SERVICES.identidad)?.view().age };
    SOCIAL.set(ctx, c);
  }
  return c;
}

/** De un id `relaciones.<acción>.<persona>` saca la acción y la persona (los de presentarse, discutir y paces no cuentan para hablar). */
const MEMO_ACCION_Y_PERSONA = new Map<string, { accion: string; npc: string } | undefined>();
function accionYPersona(id: string): { accion: string; npc: string } | undefined {
  if (MEMO_ACCION_Y_PERSONA.has(id)) return MEMO_ACCION_Y_PERSONA.get(id);
  const [modulo, accion, ...resto] = id.split('.');
  const r = modulo === 'relaciones' && resto.length ? { accion, npc: resto.join('.') } : undefined;
  MEMO_ACCION_Y_PERSONA.set(id, r);
  return r;
}

const NOMBRE_HABILIDAD: Record<string, string> = {
  [GEN.comunicacion]: 'comunicación',
  [GEN.carisma]: 'carisma',
  [GEN.empatia]: 'empatía',
  [GEN.cooperacion]: 'cooperación',
  [GEN.creatividad]: 'creatividad',
};

export const relaciones = defineModule<RelacionesState>({
  id: 'relaciones',
  name: 'Relaciones',
  description: 'Vínculos con las personas que rodean al personaje.',
  dependsOn: ['gen'],

  initState: () => ({ vinculos: {} }),

  actions: [
    // Los 10 minutos antes de clase se pueden gastar hablando con alguien de los que hay por allí (al azar: ves con quién te toca).
    // Si ya has entrado a clase no hay tiempo; es un extra de relación.
    conLugar(['colegio'], {
      id: 'relaciones.al_azar',
      name: 'Charlar con alguien de los que hay antes de clase',
      description: 'Hasta que empiece la clase hablas con alguien al azar de los que hay por allí. Cuanto más rato, más sube la relación; si no lo conocías, se presenta.',
      tags: [TAGS.social],
      group: 'Colegio',
      duration: (ctx) => {
        const c = claseQueVaAEmpezar(ctx.time);
        return c ? Math.max(1, c.inicio - ctx.time.minuteOfDay) : 1;
      },
      available: (ctx) => {
        if (!claseQueVaAEmpezar(ctx.time)) return `Solo en los ${MINUTOS_ANTES_DE_CLASE} minutos antes de una clase`;
        return cercanosConClave(ctx)?.lista.length ? true : 'No hay nadie con quien hablar';
      },
      delta: { [GEN.energia]: -1 },
      run: (ctx) => {
        const lista = cercanosConClave(ctx)?.lista ?? [];
        const n = lista.length ? ctx.rng.pick(lista) : undefined;
        const c = claseQueVaAEmpezar(ctx.time);
        if (!n || !c) return;
        // Cuánto rato se habla: de lo que queda hasta la clase, la parte de media hora que vale una charla.
        const parte = (c.inicio - ctx.time.minuteOfDay) / 30;
        const dia = ctx.time.day;
        if (n.known === false) ctx.emit<PresentacionData>({ type: SHARED_EVENTS.PRESENTACION, data: { npcId: n.id } });
        ctx.updateState<RelacionesState>((s) => ({
          ...s,
          vinculos: { ...s.vinculos, [n.id]: conContacto(vinculoDe(ctx, s, n, dia), dia, 2.5 * parte, 1.5 * parte) },
        }));
        ctx.train(GEN.comunicacion, 0.4 * parte);
        ctx.train(GEN.empatia, 0.2 * parte);
        ctx.log(`Mientras llega la clase hablas con ${n.known === false ? `${nombreSegunEdad(n.gender, edadAparente(n)).toLowerCase()} que no conocías` : n.name}.`, 'info');
      },
    }),
  ],

  dynamicActions: (ctx) => {
    const dir = dirDe(ctx);
    if (!dir) return [];
    const lista: ActionDef[] = [];
    const s = ctx.state<RelacionesState>();
    const rivales: NpcView[] = [];
    // Hacer las paces solo se ofrece cuando hay algo que arreglar (un vínculo negativo) o se acaba de intentar y falló.
    const conPaces = (n: NpcView) => {
      const v = s.vinculos[n.id];
      return v !== undefined && (NIVEL_ESTADO[v.estado] < 0 || (s.espera?.[`paces.${n.id}`] ?? -1) > ctx.time.day);
    };
    const cerca = cercanosConClave(ctx);
    for (const n of dir.list({ known: true })) {
      if (!conocida(n)) continue;
      if (n.role === 'rival') rivales.push(n);
      else {
        lista.push(...accionesDe(n));
        if (conPaces(n)) lista.push(pacesDe(n));
        if (aceptaPlanes(n) && cerca?.ids.has(n.id)) lista.push(...propuestasDe(n));
      }
    }
    // De los rivales conocidos solo se ofrecen los que más han marcado la relación (los demás son un nombre en una clasificación).
    rivales.sort((a, b) => Math.abs(s.vinculos[b.id]?.afinidad ?? 0) - Math.abs(s.vinculos[a.id]?.afinidad ?? 0));
    for (const n of rivales.slice(0, RIVALES_CON_ACCIONES)) lista.push(...accionesDe(n), ...(conPaces(n) ? [pacesDe(n)] : []));
    // A quien conoces y tienes delante le puedes preguntar lo que no sepas de él o de ella.
    if (cerca) for (const n of cerca.lista) if (conocida(n) && n.role !== 'familia') lista.push(...preguntasPendientes(n).map((d) => preguntarDe(n, d)));
    // A quien no conoces y tienes cerca le puedes preguntar el nombre.
    lista.push(...presentaciones(ctx));
    return lista;
  },

  modifiers: [
    {
      // Compatibilidad: con quien comparte intereses y se parece en carácter, lo que sube la afinidad rinde más (×0,7 a ×1,4).
      id: 'relaciones.compatibilidad',
      tags: ['*'],
      apply: (ctx, action) => {
        // Solo lo que sube la relación (no preguntar el nombre ni proponer un plan).
        if (!action.id.startsWith('relaciones.') || action.id.startsWith('relaciones.plan_') || action.id.startsWith('relaciones.preguntar_') || action.id.startsWith('relaciones.presentarse.')) return null;
        const { dir, perfil: yo } = social(ctx);
        const n = dir?.get(action.id.split('.').pop()!);
        if (!n?.rasgos || !yo) return null;
        const f = factorDeCompatibilidad(compatibilidad(n.rasgos, yo));
        return Math.abs(f - 1) < 0.02 ? null : { efficiency: f, reason: `Compatibilidad con ${n.name.split(' ')[0]}` };
      },
    },
    {
      // Habilidad: comunicación, carisma, empatía... según la conversación (×0,8 a ×1,3).
      id: 'relaciones.habilidad',
      tags: [TAGS.social],
      apply: (ctx, action) => {
        const p = accionYPersona(action.id);
        const pesos = p && HABILIDADES_DE_ACCION[p.accion];
        if (!pesos) return null;
        const f = factorDeHabilidad(nivelDeHabilidad(ctx, pesos));
        if (Math.abs(f - 1) < 0.02) return null;
        const de = pesos.map((h) => NOMBRE_HABILIDAD[h.stat]).join(' y ');
        return { efficiency: f, reason: f > 1 ? `Se te da bien hablar (${de})` : `Te falta soltura (${de})` };
      },
    },
    {
      // Disposición: lo sociable y optimista que es la otra persona y la primera impresión que le causas (sus gustos) (×0,75 a ×1,3).
      id: 'relaciones.disposicion',
      tags: [TAGS.social],
      apply: (ctx, action) => {
        const p = accionYPersona(action.id);
        if (!p || !HABILIDADES_DE_ACCION[p.accion]) return null;
        const { dir, perfil, edad } = social(ctx);
        const n = dir?.get(p.npc);
        if (!n) return null;
        const { factor, motivo } = disposicion(n.rasgos, perfil, usoDelAspecto(edad, n.age));
        return Math.abs(factor - 1) < 0.02 ? null : { efficiency: factor, reason: `${motivo ?? 'Su forma de ser'} (${n.name.split(' ')[0]})` };
      },
    },
    {
      // Compañía: lo que sabe hacer la otra persona decide cuánto ayuda cuando hacéis algo juntos (hasta +30 %): estudiar con alguien aplicado,
      // salir con alguien sociable. Si no es bueno en eso no ayuda (de momento tampoco estorba). Hace falta confianza: cuenta lo bien que os conocéis.
      id: 'relaciones.compania',
      tags: ['*'],
      apply: (ctx, action) => {
        const p = accionYPersona(action.id);
        const area = p && AREA_DE_ACCION[p.accion];
        if (!p || !area) return null;
        const n = dirDe(ctx)?.get(p.npc);
        if (!n) return null;
        const ayuda = ayudaDe(n, area, vinculoDe(ctx, ctx.state<RelacionesState>(), n, ctx.time.day).afinidad);
        return ayuda < 0.02 ? null : { efficiency: 1 + ayuda, reason: `${nombreCorto(n)} ${MOTIVO_DE_AREA[area]}` };
      },
    },
  ],

  on: {
    [CORE_EVENTS.DAY_END]: (ctx, ev) => {
      const { day } = ev.data as { day: number };
      const dir = dirDe(ctx);
      ctx.updateState<RelacionesState>((s) => {
        const vinculos: Record<string, Vinculo> = {};
        for (const [id, v] of Object.entries(s.vinculos)) vinculos[id] = pasarDia(v, day);
        // Un plan al que no se llegó a tiempo se da por plantado: pierdes afinidad y confianza con esa persona. Los resueltos se guardan unos días (margen).
        const planes: PlanAcordado[] = [];
        for (const p of s.planes ?? []) {
          if (!p.resuelto && p.dia <= day) {
            const n = dir?.get(p.npcId);
            if (n) {
              vinculos[n.id] = conCambio(vinculoDe(ctx, { ...s, vinculos }, n, day), day, -PLAN.planton.afinidad, -PLAN.planton.confianza);
              ctx.log(`Dejaste plantado a ${nombreCorto(n)}: ${PLANES[p.actividad].nombre} ${PLANES[p.actividad].lugarTexto} a las ${hhmm(p.minuto)}.`, 'aviso');
            }
            planes.push({ ...p, resuelto: true });
          } else if (p.dia >= day - 2) planes.push(p);
        }
        return { ...s, vinculos, planes };
      });
    },

    // Cambiarse de club sin haber dejado el anterior: su entrenador y su equipo lo notan.
    [SHARED_EVENTS.CLUB_ABANDONO]: (ctx, ev) => {
      const { sport, clubId } = ev.data as ClubAbandonoData;
      const dir = dirDe(ctx);
      if (!dir) return;
      const nombre = ctx.service<ClubDirectory>(SERVICES.clubes)?.list(sport).find((c) => c.id === clubId)?.nombre;
      const dia = ctx.time.day;
      const afectados = dir.list({ known: true }).filter((n) => (n.role === 'entrenador' ? n.club === clubId : clubId === 'colegio' ? n.tags.includes('equipo') : n.club === nombre));
      if (!afectados.length) return;
      ctx.updateState<RelacionesState>((s) => {
        const vinculos = { ...s.vinculos };
        for (const n of afectados) {
          const castigo = n.role === 'entrenador' ? PLANTON.entrenador : PLANTON.equipo;
          vinculos[n.id] = conCambio(vinculoDe(ctx, s, n, dia), dia, -castigo.afinidad, -castigo.confianza);
        }
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
        const club = ctx.service<ClubDirectory>(SERVICES.clubes)?.membership(r.module);
        for (const n of dir.list({ role: 'entrenador' })) {
          // Solo los de tu club (sin club, el del colegio).
          if (n.club !== undefined && n.club !== (club?.id ?? 'colegio')) continue;
          if (n.tags.includes(r.module)) vinculos[n.id] = conCambio(vinculoDe(ctx, s, n, dia), dia, r.position <= 3 ? 3 : 1);
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
        planes: () => (s.planes ?? []).filter((p) => !p.resuelto && p.dia >= dia).map(({ npcId, actividad, dia: d, minuto, lugar }) => ({ npcId, actividad, dia: d, minuto, lugar })),
        get: (npcId) => {
          const guardado = s.vinculos[npcId];
          if (guardado) return vista(guardado);
          const n = dir?.get(npcId);
          return n && conocida(n) ? vista(vinculoInicial(ctx, n, dia)) : undefined;
        },
        list: () => {
          const lista = new Map<string, RelationView>();
          for (const n of dir?.list({ known: true }) ?? []) if (conocida(n)) lista.set(n.id, vista(vinculoDe(ctx, s, n, dia)));
          for (const v of Object.values(s.vinculos)) lista.set(v.npcId, vista(v));
          return [...lista.values()];
        },
      };
    },
  },
});

export default relaciones;
