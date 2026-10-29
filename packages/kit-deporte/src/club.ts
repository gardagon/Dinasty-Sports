import {
  GEN,
  SERVICES,
  SHARED_EVENTS,
  TAGS,
  conLugar,
  inHours,
  type ActionDef,
  type ClubDirectory,
  type ClubJoinData,
  type ClubLeaveData,
  type ClubView,
  type IdentityService,
  type ModifierDef,
  type NpcDirectory,
  type NpcView,
  type PresenciaService,
  type ReadContext,
  type StatId,
} from '@ds/contracts';
import { idDeConocimiento } from './habilidades';
import type { ConfigDeporte, Entreno, EstadoBaseDeDeporte, HabilidadDeConsejo } from './tipos';

/** Semanas que hay que esperar para repetir la prueba de acceso de un club. */
export const SEMANAS_ENTRE_PRUEBAS = 8;
/** Semanas que vale una plaza ganada en la prueba de un club antes de decidirse. */
export const SEMANAS_DE_OFERTA = 8;
/** Los miembros del club están en su sede 10 minutos antes de la sesión: desde entonces se puede entrar a entrenar (o incorporarse más tarde, con la parte proporcional). */
export const MINUTOS_ANTES_DE_SESION = 10;
/** Entrenar solo, sin entrenador ni grupo, rinde menos que una sesión de club. */
export const EFICIENCIA_POR_TU_CUENTA = 0.85;
/** Lo que sube el conocimiento con un consejo (15 minutos): como media sesión de técnica, pero solo una vez al día. */
export const CONOCIMIENTO_POR_CONSEJO = 1;
export const HABILIDAD_POR_CONSEJO = 0.3;

const estado = (ctx: ReadContext) => ctx.state<EstadoBaseDeDeporte>();

/** El club del personaje en este deporte, si es de alguno. */
export const clubDelJugador = (ctx: ReadContext, deporte: string): ClubView | undefined => ctx.service<ClubDirectory>(SERVICES.clubes)?.membership(deporte);

/** Dónde entrena el club del personaje: la sede del club del colegio o la de los de fuera (sin club, la del colegio). */
export const sedeDelClub = (ctx: ReadContext, cfg: ConfigDeporte): readonly string[] => (clubDelJugador(ctx, cfg.id)?.esColegio === false ? [cfg.sedes.fuera] : [cfg.sedes.colegio]);

/** Dónde se hacen los trámites de un club: la administración del colegio o la sala del club. */
export const tramitesDe = (c: ClubView | undefined): readonly string[] => (!c || c.esColegio ? ['administracion'] : [`sala_${c.id}`]);

const edadDelJugador = (ctx: ReadContext): number => ctx.service<IdentityService>(SERVICES.identidad)?.view().age ?? 8;
const edadDelJugadorDeTemporada = (ctx: ReadContext): number => ctx.service<IdentityService>(SERVICES.identidad)?.view().seasonAge ?? 8;

const DIAS_DE_LA_SEMANA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
/** «lunes y miércoles de 15 a 17»: cuándo entrena un club. */
export function textoDeSesiones(s: ClubView['sesiones']): string {
  const dias = s.weekdays.map((d) => DIAS_DE_LA_SEMANA[d]);
  return `${dias.length > 1 ? `${dias.slice(0, -1).join(', ')} y ${dias[dias.length - 1]}` : dias[0]} de ${s.desde} a ${s.hasta}`;
}
/** Lo que se cuenta de un club antes de apuntarse: cuándo entrena y cuándo se compite. */
const infoDeClub = (cfg: ConfigDeporte, c: ClubView): string => `Entrena ${textoDeSesiones(c.sesiones)}. ${cfg.textoDeCompeticion}`;

/** ¿Está en marcha (o a punto de empezar) la sesión del club del personaje y aún no ha entrenado con él hoy? Entonces no se entrena por libre: se va al club. */
export function sesionDelClubAhora(ctx: ReadContext, deporte: string): ClubView | undefined {
  const club = clubDelJugador(ctx, deporte);
  const t = ctx.time;
  if (!club || !club.sesiones.weekdays.includes(t.weekday) || estado(ctx).ultimaSesionClub === t.day) return undefined;
  return t.minuteOfDay >= club.sesiones.desde * 60 - MINUTOS_ANTES_DE_SESION && t.minuteOfDay < club.sesiones.hasta * 60 ? club : undefined;
}

/** Mientras hay entrenamiento del club no se entrena por libre. */
export const sinEntrenarPorLibreEnSesion = (cfg: ConfigDeporte, acciones: readonly ActionDef[]): ActionDef[] =>
  acciones.map((a) =>
    cfg.entrenosLibres.includes(a.id)
      ? {
          ...a,
          available: (ctx: ReadContext) => {
            const otro = a.available?.(ctx) ?? true;
            return otro === true && sesionDelClubAhora(ctx, cfg.id) ? 'Ahora es el entrenamiento de tu club: únete a la sesión' : otro;
          },
        }
      : a,
  );

/**
 * Acciones de los clubes del deporte (acciones dinámicas): apuntarse al del colegio, en la administración (antes de aceptar
 * se cuenta cuándo entrena y cuándo se compite); y, de cada club de fuera, su prueba de acceso (se puede hacer estando en
 * otro club) y aceptar la plaza ganada.
 */
export function accionesDeClubes(cfg: ConfigDeporte): (ctx: ReadContext) => ActionDef[] {
  const { id: deporte, nombre } = cfg;
  return (ctx) => {
    const clubes = ctx.service<ClubDirectory>(SERVICES.clubes);
    if (!clubes) return [];
    const actual = clubes.membership(deporte);
    const colegio = clubes.list(deporte).find((c) => c.esColegio);
    const apuntarse: ActionDef[] =
      colegio && !actual
        ? [
            conLugar(tramitesDe(colegio), {
              id: `${deporte}.apuntarse_colegio`,
              name: `Apuntarte al club de ${nombre} del colegio`,
              description: `El club del colegio entrena con su entrenador en sesiones fijas. ${infoDeClub(cfg, colegio)} Es el primer paso para competir con un equipo.`,
              tags: [deporte],
              group: 'Club',
              duration: 30,
              available: () => true,
              run: (c2) => c2.emit<ClubJoinData>({ type: SHARED_EVENTS.CLUB_JOIN, data: { sport: deporte, clubId: colegio.id } }),
            }),
          ]
        : [];
    return [...apuntarse, ...clubes
      .list(deporte)
      .filter((c) => !c.esColegio && c.id !== actual?.id && c.acceso?.[deporte])
      .flatMap((c): ActionDef[] => {
        const acceso = c.acceso![deporte];
        const aceptar = conLugar(tramitesDe(c), {
          id: `${deporte}.aceptar_plaza.${c.id}`,
          name: `Aceptar la plaza en ${c.nombre}`,
          description: `Pasaste la prueba y te ofrecen entrar. Si todavía eres de otro club y no lo has dejado antes, lo dejas plantado: empeora tu relación con su entrenador y su equipo y te estresa. La plaza vale ${SEMANAS_DE_OFERTA} semanas.`,
          tags: [deporte],
          group: 'Club',
          duration: 15,
          available: (c2) => {
            const semana = estado(c2).ofertas?.[c.id];
            return semana !== undefined && c2.time.week - semana < SEMANAS_DE_OFERTA ? true : 'No tienes una plaza en este club (haz su prueba de acceso)';
          },
          run: (c2) => {
            c2.updateState<EstadoBaseDeDeporte>((st) => {
              const { [c.id]: _usada, ...resto } = st.ofertas ?? {};
              return { ...st, ofertas: resto };
            });
            c2.emit<ClubJoinData>({ type: SHARED_EVENTS.CLUB_JOIN, data: { sport: deporte, clubId: c.id } });
          },
        });
        const prueba = conLugar(tramitesDe(c), {
          id: `${deporte}.prueba.${c.id}`,
          name: `Prueba de acceso: ${c.nombre}`,
          description: `El ${c.nombre} hace pruebas a quien quiere entrar, solo en sus horas de entrenamiento. ${infoDeClub(cfg, c)} Exige edad (${acceso.edadMin}+) y nivel; si no pasas, puedes repetirla pasadas ${SEMANAS_ENTRE_PRUEBAS} semanas.`,
          tags: [TAGS.fisico, deporte],
          group: 'Club',
          duration: 150,
          available: (c2) => {
            const t = c2.time;
            if (edadDelJugador(c2) < acceso.edadMin) return `Hay que tener ${acceso.edadMin} años para probar en el ${c.nombre}`;
            const ultima = estado(c2).pruebas?.[c.id];
            if (ultima !== undefined && t.week - ultima < SEMANAS_ENTRE_PRUEBAS) return 'Hiciste la prueba hace poco: espera unas semanas';
            // Las pruebas se hacen en las sesiones de entrenamiento del club.
            return c.sesiones.weekdays.includes(t.weekday) && inHours(t, c.sesiones.desde, c.sesiones.hasta - 1) ? true : `Las pruebas se hacen en los entrenamientos: ${textoDeSesiones(c.sesiones)}`;
          },
          delta: { [GEN.energia]: -25, [GEN.estres]: 6 },
          run: (c2) => {
            const t = c2.time;
            const forma = 0.85 + 0.15 * Math.min(1.2, c2.efficiency);
            const rinde = cfg.rendimiento(c2) * forma + c2.rng.normal() * 3;
            c2.updateState<EstadoBaseDeDeporte>((s) => ({ ...s, pruebas: { ...(s.pruebas ?? {}), [c.id]: t.week } }));
            if (rinde >= acceso.nivel && !c2.service<ClubDirectory>(SERVICES.clubes)?.membership(deporte)) {
              c2.emit<ClubJoinData>({ type: SHARED_EVENTS.CLUB_JOIN, data: { sport: deporte, clubId: c.id } });
            } else if (rinde >= acceso.nivel) {
              // Con otro club, la plaza se ofrece y decides: salir antes de él no cuesta nada; aceptarla sin salir sí.
              c2.updateState<EstadoBaseDeDeporte>((st) => ({ ...st, ofertas: { ...(st.ofertas ?? {}), [c.id]: t.week } }));
              c2.log(`Has pasado la prueba del ${c.nombre}: te ofrecen plaza. Antes de aceptarla conviene dejar tu club actual.`, 'logro');
            } else {
              c2.log(`Prueba en el ${c.nombre}: todavía no tienes el nivel que piden. Sigue entrenando y vuelve a intentarlo.`, 'aviso');
              c2.addStat(GEN.motivacion, -3);
            }
          },
        });
        return [prueba, aceptar];
      })];
  };
}

/**
 * Sesión con el club (`<deporte>.club_sesion`): dura lo que queda de sesión y, si te incorporas tarde, solo entrenas la parte
 * proporcional (modificador `<deporte>.llegada_tarde`). Una al día.
 */
export function sesionDeClub(cfg: ConfigDeporte, def: { description: string; tags: string[]; delta: Record<StatId, number>; train: Entreno }): ActionDef {
  const { id: deporte, nombre } = cfg;
  return {
    id: `${deporte}.club_sesion`,
    name: 'Entrenamiento con el club',
    description: def.description,
    tags: def.tags,
    group: 'Club',
    duration: (ctx) => Math.max(1, (clubDelJugador(ctx, deporte)?.sesiones.hasta ?? 0) * 60 - ctx.time.minuteOfDay),
    available: (ctx) => {
      const club = clubDelJugador(ctx, deporte);
      if (!club) return `No perteneces a ningún club de ${nombre}`;
      const t = ctx.time;
      if (!club.sesiones.weekdays.includes(t.weekday)) return `Las sesiones de ${club.nombre} son otros días`;
      if (estado(ctx).ultimaSesionClub === t.day) return 'Ya has entrenado con el club hoy';
      return t.minuteOfDay >= club.sesiones.desde * 60 - MINUTOS_ANTES_DE_SESION && t.minuteOfDay < club.sesiones.hasta * 60
        ? true
        : `La sesión es de ${club.sesiones.desde} a ${club.sesiones.hasta} (se puede entrar desde ${MINUTOS_ANTES_DE_SESION} minutos antes)`;
    },
    delta: def.delta,
    train: def.train,
    run: (ctx) => ctx.updateState<EstadoBaseDeDeporte>((s) => ({ ...s, ultimaSesionClub: ctx.time.day })),
  };
}

/** Dejar el club del deporte (sin coste: quien lo deja antes de aceptar otra plaza no deja plantado a nadie). */
export function dejarClub(cfg: ConfigDeporte): ActionDef {
  return {
    id: `${cfg.id}.dejar_club`,
    name: `Dejar el club de ${cfg.nombre}`,
    tags: [cfg.id],
    group: 'Club',
    duration: 15,
    available: (ctx) => (clubDelJugador(ctx, cfg.id) ? true : `No perteneces a ningún club de ${cfg.nombre}`),
    run: (ctx) => ctx.emit<ClubLeaveData>({ type: SHARED_EVENTS.CLUB_LEAVE, data: { sport: cfg.id } }),
  };
}

/** Incorporarse tarde a la sesión del club: solo se entrena la parte de sesión que queda. */
export function modificadorDeLlegadaTarde(cfg: ConfigDeporte): ModifierDef {
  return {
    id: `${cfg.id}.llegada_tarde`,
    tags: [cfg.id],
    apply: (ctx, action) => {
      if (action.id !== `${cfg.id}.club_sesion`) return null;
      const club = clubDelJugador(ctx, cfg.id);
      if (!club) return null;
      const [desde, hasta] = [club.sesiones.desde * 60, club.sesiones.hasta * 60];
      const parte = (hasta - Math.max(ctx.time.minuteOfDay, desde)) / (hasta - desde);
      return parte >= 0.995 ? null : { efficiency: parte, reason: `Llegas tarde: solo entrenas el ${Math.round(parte * 100)} % de la sesión` };
    },
  };
}

/** Entrenar por libre rinde menos que con el club. */
export function modificadorPorTuCuenta(cfg: ConfigDeporte): ModifierDef {
  return {
    id: `${cfg.id}.por_tu_cuenta`,
    tags: [cfg.id],
    apply: (_ctx, action) =>
      cfg.entrenosLibres.includes(action.id) ? { efficiency: EFICIENCIA_POR_TU_CUENTA, reason: 'Entrenas por tu cuenta, sin entrenador' } : null,
  };
}

/** Tu entrenador: el de tu club que lleva tu edad (los clubes tienen varios, cada uno con unas categorías) y que ya conoces. */
export function entrenadorDelJugador(ctx: ReadContext, deporte: string): NpcView | undefined {
  const club = clubDelJugador(ctx, deporte);
  if (!club) return undefined;
  const edad = edadDelJugadorDeTemporada(ctx);
  return ctx.service<NpcDirectory>(SERVICES.npcs)?.list({ role: 'entrenador', known: true }).find((n) => n.club === club.id && (!n.edades || (edad >= n.edades[0] && edad <= n.edades[1])));
}

/**
 * Pedir consejo a tu entrenador (`<deporte>.pedir_consejo`): una vez al día y cuando está en su sede, libre (antes o después
 * de la sesión). Sube el conocimiento y un poco una habilidad, cada día otra (por turnos).
 */
export function pedirConsejo(cfg: ConfigDeporte, habilidades: readonly HabilidadDeConsejo[]): ActionDef {
  const { id: deporte, nombre } = cfg;
  return {
    id: `${deporte}.pedir_consejo`,
    name: 'Pedir consejo a tu entrenador',
    description: 'Le preguntas qué mejorar y cómo. Solo una vez al día y cuando está contigo (antes o después de la sesión): sube tu conocimiento del deporte y un poco una habilidad. Hablar con él solo mejora la relación.',
    tags: [TAGS.mental, deporte],
    group: `Entrenar ${nombre}`,
    duration: 15,
    available: (ctx) => {
      if ((estado(ctx).ultimoConsejo ?? -1) === ctx.time.day) return 'Ya le has pedido consejo hoy';
      if (!clubDelJugador(ctx, deporte)) return 'Necesitas un entrenador: apúntate a un club';
      const entrenador = entrenadorDelJugador(ctx, deporte);
      if (!entrenador) return 'Todavía no conoces a tu entrenador';
      const presencia = ctx.service<PresenciaService>(SERVICES.presencia);
      // Sin el módulo de presencia no se comprueba. Con él, el entrenador tiene que estar en su sitio (no ocupado en la sesión).
      if (presencia && presencia.donde(entrenador.id) !== sedeDelClub(ctx, cfg)[0]) return `${entrenador.nombreCorto} ahora no está disponible: búscalo antes o después de la sesión`;
      return true;
    },
    delta: { [GEN.energia]: -1 },
    train: [
      { stat: idDeConocimiento(deporte), amount: CONOCIMIENTO_POR_CONSEJO },
      { stat: GEN.atencion, amount: 0.15 },
    ],
    run: (ctx) => {
      // Además, un poco de una habilidad del deporte (cada día, otra).
      const habilidad = habilidades[ctx.time.day % habilidades.length];
      ctx.train(habilidad.stat, HABILIDAD_POR_CONSEJO * ctx.efficiency);
      ctx.updateState<EstadoBaseDeDeporte>((s) => ({ ...s, ultimoConsejo: ctx.time.day }));
      const entrenador = entrenadorDelJugador(ctx, deporte);
      ctx.log(`${entrenador ? entrenador.nombreCorto : 'Tu entrenador'} te da un consejo para mejorar tu ${habilidad.nombre}.`, 'info');
    },
  };
}
