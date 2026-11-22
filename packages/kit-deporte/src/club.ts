import {
  GEN,
  factorDeCompeticion,
  SERVICES,
  SHARED_EVENTS,
  TAGS,
  conLugar,
  fichasDeDeporte,
  datosDeDeporte,
  diaConFecha,
  inHours,
  plazoDeFichajesAbierto,
  proximaAperturaDelPlazo,
  type ActionContext,
  type ActionDef,
  type ClubDirectory,
  type ClubJoinData,
  type ClubLeaveData,
  type ClubView,
  type IdentityService,
  type ModifierDef,
  type PuestoPropuestoData,
  valorDeLaPrueba,
  type NpcDirectory,
  type NpcView,
  type PresenciaService,
  type ReadContext,
  type Obligacion,
  minutosParaLlegar,
  fraseDeEntrenamiento,
  fraseDeLectura,
  type LecturaDePuesto,
  type StatId,
  TOLERANCIA_DE_SESION,
  type ClubImpuntualData,
  type PruebaEmpiezaData,
  type SucesosService,
} from '@ds/contracts';
import { idDeConocimiento } from './habilidades';
import type { ConfigDeporte, Entreno, EntrenoRecomendable, EstadoBaseDeDeporte, HabilidadDeConsejo } from './tipos';

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

/** Dónde entrena el club del personaje: la sede de su sección (sin club, la que dan los datos del deporte para quien aún no tiene). */
export const sedeDelClub = (ctx: ReadContext, cfg: ConfigDeporte): readonly string[] => [clubDelJugador(ctx, cfg.id)?.sede ?? datosDeDeporte(ctx, cfg.id).sedes.colegio];

/** Dónde se hacen los trámites de un club: la administración del colegio o la sala del club. */
export const tramitesDe = (c: ClubView | undefined): readonly string[] => [c?.tramites ?? 'administracion'];

const edadDelJugador = (ctx: ReadContext): number => ctx.service<IdentityService>(SERVICES.identidad)?.view().age ?? 8;
const edadDelJugadorDeTemporada = (ctx: ReadContext): number => ctx.service<IdentityService>(SERVICES.identidad)?.view().seasonAge ?? 8;

const DIAS_DE_LA_SEMANA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
/** «lunes y miércoles de 15 a 17»: cuándo entrena un club. */
export function textoDeSesiones(s: ClubView['sesiones']): string {
  const dias = s.weekdays.map((d) => DIAS_DE_LA_SEMANA[d]);
  return `${dias.length > 1 ? `${dias.slice(0, -1).join(', ')} y ${dias[dias.length - 1]}` : dias[0]} de ${s.desde} a ${s.hasta}`;
}
/** Lo que se cuenta de un club antes de apuntarse: cuándo entrena y cuándo se compite. */
const infoDeClub = (ctx: ReadContext, cfg: ConfigDeporte, c: ClubView): string => `Entrena ${textoDeSesiones(c.sesiones)}. ${datosDeDeporte(ctx, cfg.id).competiciones.jornada.texto}`;

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
 * **Se compite en un solo deporte** (y en un solo club o equipo): quien está en el club o el equipo de otro deporte no puede apuntarse, pedir prueba, unirse a la prueba ni aceptar plaza
 * en este (antes tiene que dejar el otro). Entrenar por su cuenta otros deportes sigue valiendo. Se mira con la pertenencia a clubes (`ClubDirectory`) y las fichas de los deportes de
 * la partida: ningún deporte conoce a otro. Devuelve el motivo o `undefined`.
 */
export function motivoDeCompetirEnOtroDeporte(ctx: ReadContext, deporte: string): string | undefined {
  const otro = fichasDeDeporte(ctx).find((f) => f.id !== deporte && !!clubDelJugador(ctx, f.id));
  return otro ? `Ya compites en ${otro.nombre.toLowerCase()}: déjalo antes` : undefined;
}

/** Las acciones para entrar a competir en este deporte (apuntarse, pedir o hacer la prueba, aceptar plaza) salen no disponibles si ya compite en otro. */
const soloSiNoCompiteEnOtro = (deporte: string, acciones: readonly ActionDef[]): ActionDef[] =>
  acciones.map((a) => ({
    ...a,
    available: (ctx: ReadContext) => motivoDeCompetirEnOtroDeporte(ctx, deporte) ?? a.available?.(ctx) ?? true,
  }));

/**
 * Los entrenamientos por libre del deporte (`cfg.entrenosLibres`) salen en la lista como una sola acción «Entrenar…» con un desplegable (ver `ActionDef.desplegable`). Las acciones
 * conservan sus ids. Cualquier otra lista larga puede agruparse igual poniendo `desplegable` a sus acciones.
 */
export const entrenosAgrupados = (cfg: ConfigDeporte, acciones: readonly ActionDef[]): ActionDef[] =>
  acciones.map((a) =>
    cfg.entrenosLibres.includes(a.id)
      ? {
          ...a,
          cortable: true,
          // La opción y su apartado («Portería», «Físico»…) los pone cada acción; el resto es común.
          desplegable: { id: `${cfg.id}.entrenar`, nombre: 'Entrenar…', etiqueta: 'Entrenamiento', boton: 'Entrenar: {opcion}', ...(a.desplegable?.opcion ? { opcion: a.desplegable.opcion } : {}), ...(a.desplegable?.grupoDeOpcion ? { grupoDeOpcion: a.desplegable.grupoDeOpcion } : {}) },
        }
      : a,
  );

/**
 * Por qué el personaje no entra en el equipo de su categoría de un club: si está completo y todos los que juegan son mejores que él. Si es mejor que alguno,
 * entra y el peor pierde su plaza (lo hace `npcs` al recibir `club.unirse`). `undefined` si puede entrar.
 */
export function motivoSinPlaza(ctx: ReadContext, cfg: ConfigDeporte, club: string): string | undefined {
  const plaza = ctx.service<NpcDirectory>(SERVICES.npcs)?.plaza?.(cfg.id, club, cfg.rendimiento(ctx), cfg.puestos?.(ctx));
  if (plaza?.estado === 'completo' && plaza.sinCupo) return 'En el equipo de tu categoría no queda sitio para un jugador de tu puesto, ni siquiera con una plaza de más: prueba en otro club o espera al siguiente plazo de fichajes';
  return plaza?.estado === 'completo'
    ? `El equipo de tu categoría está completo y todos juegan mejor que tú (el peor, ${plaza.peor?.nombre}, tiene nivel ${Math.round(plaza.peor?.nivel ?? 0)} y tú ${Math.round(cfg.rendimiento(ctx))}): sigue entrenando por tu cuenta y vuelve a intentarlo`
    : undefined;
}

/**
 * El personaje entra en un club: con la regla de plaza (por puesto, si el deporte tiene puestos), el club le ofrece el puesto en que entraría; se guarda y el equipo mide su plaza (y a quién
 * desplaza) en ese puesto.
 */
export function unirseA(ctx: ActionContext, cfg: ConfigDeporte, clubId: string, tras?: { puesto: string; valores: Record<string, number> }): void {
  const nivel = cfg.rendimiento(ctx);
  // Tras una prueba de acceso entra en el puesto de la prueba, con lo que valió; sin ella (el club del colegio), en el que le ofrece la regla de plaza.
  const puesto = tras?.puesto ?? ctx.service<NpcDirectory>(SERVICES.npcs)?.plaza?.(cfg.id, clubId, nivel, cfg.puestos?.(ctx))?.puesto;
  // Sin prueba (el club del colegio) no hay puesto pedido: se olvida el de una prueba anterior.
  ctx.updateState<EstadoBaseDeDeporte>((s) => {
    const { puestoPedido: _p, ...resto } = s;
    return { ...resto, ...(tras && s.puestoPedido ? { puestoPedido: s.puestoPedido } : {}), puesto };
  });
  ctx.emit<ClubJoinData>({ type: SHARED_EVENTS.CLUB_JOIN, data: { sport: cfg.id, clubId, nivel, ...(puesto ? { puesto } : {}), ...(tras ? { valores: tras.valores } : {}) } });
}

/**
 * Por qué el personaje no puede entrar hoy en un club (o cambiarse a él), con las reglas del plazo de fichajes (del verano a la primera competición; las mismas que los niños del mundo):
 * dentro del plazo, entra con hueco o siendo mejor que el peor del equipo; fuera de plazo, quien está en un club no puede cambiarse, quien dejó el suyo fuera de plazo no entra en
 * otro hasta el siguiente plazo, y quien no tiene club solo entra si hay hueco, sin sacar a nadie. `undefined` si puede.
 */
export function motivoSinFichaje(ctx: ReadContext, cfg: ConfigDeporte, club: string, conPrueba = false): string | undefined {
  const t = ctx.time;
  /** Cuándo se abren las pruebas y los fichajes: el primer día de la próxima semana con el plazo abierto (el verano), con su fecha. Genérico: lo dicen el calendario del país y la temporada del deporte. */
  const apertura = (desdeSemana: number): string => diaConFecha(proximaAperturaDelPlazo(ctx.pais.calendario, datosDeDeporte(ctx, cfg.id).temporada, desdeSemana) * 7);
  // Con prueba de acceso, que haya plaza o no lo decide la prueba (su resultado), no lo que vale el personaje de media.
  if (plazoDeFichajesAbierto(ctx.pais.calendario, datosDeDeporte(ctx, cfg.id).temporada, t.schoolWeek)) return conPrueba ? undefined : motivoSinPlaza(ctx, cfg, club);
  if (clubDelJugador(ctx, cfg.id)) return `El plazo de fichajes está cerrado hasta el verano: mientras estés en un club no puedes cambiarte. Las pruebas de acceso se abren ${apertura(t.week)}`;
  const sinFichajesHasta = estado(ctx).sinFichajesHasta ?? -1;
  if (sinFichajesHasta > t.week) return `Dejaste tu club fuera de plazo: no puedes entrar en otro club de ${cfg.nombre} hasta el siguiente plazo de fichajes (el verano). Las pruebas de acceso se abren ${apertura(t.week)}`;
  const plaza = ctx.service<NpcDirectory>(SERVICES.npcs)?.plaza?.(cfg.id, club, cfg.rendimiento(ctx), cfg.puestos?.(ctx));
  return plaza && plaza.estado !== 'libre' ? `El plazo de fichajes está cerrado hasta el verano: ya solo se entra en un club con hueco, sin sacar a nadie, y el equipo de tu categoría está completo. Las pruebas de acceso se abren ${apertura(t.week)}` : undefined;
}

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
              description: `El club del colegio entrena con su entrenador en sesiones fijas. ${infoDeClub(ctx, cfg, colegio)} Es el primer paso para competir con un equipo.`,
              tags: [deporte],
              group: 'Club',
              duration: 30,
              available: (c2) => motivoSinFichaje(c2, cfg, colegio.id) ?? true,
              run: (c2) => unirseA(c2, cfg, colegio.id),
            }),
          ]
        : [];
    // Con puestos (el fútbol), a todos los clubes de la zona se entra con una prueba de acceso (`prueba.<club>`), también a los que no exigen nivel: solo el club del colegio se salta la prueba.
    const conPuestos = !!cfg.puestos;
    const cambioDePuesto: ActionDef[] = conPuestos && cfg.puestosDelDeporte?.length ? accionesDeCambioDePuesto(cfg) : [];
    // Los clubes de la zona sin prueba de acceso (deportes sin puestos): cualquiera puede apuntarse con la regla de plaza (hueco, o mejor que el peor del equipo de su categoría), dentro del plazo de fichajes.
    const deLaZona: ActionDef[] = !actual && !conPuestos
      ? clubes
          .list(deporte)
          .filter((c) => !c.esColegio && !c.acceso?.[deporte])
          .map((c) =>
            conLugar(tramitesDe(c), {
              id: `${deporte}.apuntarse.${c.id}`,
              name: `Apuntarte a ${c.nombre}`,
              description: `Te apuntas al equipo de tu categoría de ${c.nombre}: entras si hay hueco o si eres mejor que el peor de los que juegan, dentro del plazo de fichajes (del verano a la primera competición). ${infoDeClub(ctx, cfg, c)}`,
              tags: [deporte],
              group: 'Club',
              duration: 30,
              available: (c2) => motivoSinFichaje(c2, cfg, c.id) ?? true,
              run: (c2) => unirseA(c2, cfg, c.id),
            }),
          )
      : [];
    const entrar = [...apuntarse, ...deLaZona, ...clubes
      .list(deporte)
      .filter((c) => !c.esColegio && c.id !== actual?.id && (c.acceso?.[deporte] || conPuestos))
      .flatMap((c): ActionDef[] => {
        const acceso = c.acceso?.[deporte];
        const aceptar = conLugar(tramitesDe(c), {
          id: `${deporte}.aceptar_plaza.${c.id}`,
          name: `Aceptar la plaza en ${c.nombre}`,
          description: `Pasaste la prueba y te ofrecen entrar. Si todavía eres de otro club y no lo has dejado antes, lo dejas plantado: empeora tu relación con su entrenador y su equipo y te estresa. La plaza vale ${SEMANAS_DE_OFERTA} semanas.`,
          tags: [deporte],
          group: 'Club',
          desplegable: { id: `${deporte}.aceptar_plaza`, nombre: 'Aceptar plaza…', etiqueta: 'Club', boton: '{nombre}', opcion: c.nombre },
          duration: 15,
          available: (c2) => {
            const semana = estado(c2).ofertas?.[c.id];
            if (semana === undefined || c2.time.week - semana >= SEMANAS_DE_OFERTA) return 'No tienes una plaza en este club (haz su prueba de acceso)';
            if (!conPuestos) return motivoSinFichaje(c2, cfg, c.id) ?? true;
            // Con puestos, la plaza es la de la prueba (su puesto y lo que valió): se comprueba que siga habiendo sitio en ese puesto.
            const o = estado(c2).plazasOfrecidas?.[c.id];
            if (!o) return 'No tienes una plaza en este club (haz su prueba de acceso)';
            const plaza = c2.service<NpcDirectory>(SERVICES.npcs)?.plaza?.(deporte, c.id, cfg.rendimiento(c2), o.valores, { puesto: o.puesto, yaPasada: true });
            if (plaza && plaza.estado !== 'libre' && plaza.estado !== 'por_merito') return 'Ya no queda sitio en ese puesto: la plaza que te ofrecieron se ha ocupado';
            return motivoSinFichaje(c2, cfg, c.id, true) ?? true;
          },
          run: (c2) => {
            const tras = estado(c2).plazasOfrecidas?.[c.id];
            c2.updateState<EstadoBaseDeDeporte>((st) => {
              const { [c.id]: _usada, ...resto } = st.ofertas ?? {};
              const { [c.id]: _plaza, ...restoPlazas } = st.plazasOfrecidas ?? {};
              return { ...st, ofertas: resto, plazasOfrecidas: restoPlazas };
            });
            unirseA(c2, cfg, c.id, tras);
          },
        });
        /** Lo que impide hacer la prueba de un club, salvo la hora (baja, plazo, edad, espera desde la última). */
        const noPuedeProbar = (c2: ReadContext): string | undefined => {
          const t = c2.time;
          if (c2.stat(GEN.baja) > 0) return 'Estás de baja por una lesión';
          const sinFichaje = motivoSinFichaje(c2, cfg, c.id, conPuestos);
          if (sinFichaje) return sinFichaje;
          if (acceso && edadDelJugador(c2) < acceso.edadMin) return `Hay que tener ${acceso.edadMin} años para probar en el ${c.nombre}`;
          const ultima = estado(c2).pruebas?.[c.id];
          if (ultima !== undefined && t.week - ultima < SEMANAS_ENTRE_PRUEBAS) return 'Hiciste la prueba hace poco: espera unas semanas';
          return undefined;
        };
        /** Las pruebas se hacen en las sesiones de entrenamiento del club. */
        const enHorasDelClub = (c2: ReadContext): string | undefined => (c.sesiones.weekdays.includes(c2.time.weekday) && inHours(c2.time, c.sesiones.desde, c.sesiones.hasta - 1) ? undefined : `Las pruebas se hacen en los entrenamientos: ${textoDeSesiones(c.sesiones)}`);
        if (conPuestos) return [...pruebaPorPuestosEnPasos(cfg, c, ctx, noPuedeProbar, enHorasDelClub), aceptar];
        const prueba = conLugar(tramitesDe(c), {
          id: `${deporte}.prueba.${c.id}`,
          name: `Prueba de acceso: ${c.nombre}`,
          description: conPuestos
            ? `El ${c.nombre} hace una prueba a quien quiere entrar, solo en sus horas de entrenamiento: cuenta lo que vales ese día en el puesto en que pidas jugar (elígelo antes; el entrenador puede proponerte otro). ${c.esColegio ? '' : `En los clubes grandes hay que superar al peor de tu puesto aunque haya hueco; en los demás, no ser muy malo. `}${infoDeClub(ctx, cfg, c)} Si no pasas, puedes repetirla pasadas ${SEMANAS_ENTRE_PRUEBAS} semanas.`
            : `El ${c.nombre} hace pruebas a quien quiere entrar, solo en sus horas de entrenamiento. ${infoDeClub(ctx, cfg, c)} Exige edad (${acceso!.edadMin}+) y nivel; si no pasas, puedes repetirla pasadas ${SEMANAS_ENTRE_PRUEBAS} semanas.`,
          tags: [TAGS.fisico, deporte],
          group: 'Club',
          desplegable: { id: `${deporte}.prueba`, nombre: 'Prueba de acceso…', etiqueta: 'Club', boton: '{nombre}', opcion: c.nombre },
          duration: 150,
          available: (c2) => noPuedeProbar(c2) ?? enHorasDelClub(c2) ?? true,
          delta: { [GEN.energia]: -25, [GEN.estres]: 6 },
          run: (c2) => {
            const t = c2.time;
            if (conPuestos) return pruebaPorPuestos(c2, cfg, c);
            const acceso = c.acceso![deporte];
            const rinde = cfg.rendimiento(c2) * factorDeCompeticion(c2.efficiency) + c2.rng.normal() * 3;
            c2.updateState<EstadoBaseDeDeporte>((s) => ({ ...s, pruebas: { ...(s.pruebas ?? {}), [c.id]: t.week } }));
            if (rinde >= acceso.nivel && !c2.service<ClubDirectory>(SERVICES.clubes)?.membership(deporte)) {
              unirseA(c2, cfg, c.id);
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
    return [...soloSiNoCompiteEnOtro(deporte, entrar), ...cambioDePuesto];
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
      if (ctx.stat(GEN.baja) > 0) return 'Estás de baja por una lesión: no puedes entrenar con el club';
      const t = ctx.time;
      if (!club.sesiones.weekdays.includes(t.weekday)) return `Las sesiones de ${club.nombre} son otros días`;
      if (estado(ctx).ultimaSesionClub === t.day) return 'Ya has entrenado con el club hoy';
      return t.minuteOfDay >= club.sesiones.desde * 60 - MINUTOS_ANTES_DE_SESION && t.minuteOfDay < club.sesiones.hasta * 60
        ? true
        : `La sesión es de ${club.sesiones.desde} a ${club.sesiones.hasta} (se puede entrar desde ${MINUTOS_ANTES_DE_SESION} minutos antes)`;
    },
    delta: def.delta,
    train: def.train,
    run: (ctx) => {
      ctx.updateState<EstadoBaseDeDeporte>((s) => ({ ...s, ultimaSesionClub: ctx.time.day }));
      // Incorporarse tarde ya cuesta la parte de sesión perdida; además se avisa, por si alguien quiere contarlo (los sucesos).
      const tarde = ctx.time.minuteOfDay - (clubDelJugador(ctx, deporte)?.sesiones.desde ?? 24) * 60;
      if (tarde > TOLERANCIA_DE_SESION) ctx.emit<ClubImpuntualData>({ type: SHARED_EVENTS.SESION_TARDE, data: { sport: deporte, minutos: tarde } });
    },
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
    run: (ctx) => {
      // Dejar el club fuera del plazo de fichajes cierra la puerta a los demás clubes del deporte hasta el siguiente plazo.
      const temporada = datosDeDeporte(ctx, cfg.id).temporada;
      if (!plazoDeFichajesAbierto(ctx.pais.calendario, temporada, ctx.time.schoolWeek)) {
        const hasta = proximaAperturaDelPlazo(ctx.pais.calendario, temporada, ctx.time.week);
        ctx.updateState<EstadoBaseDeDeporte>((s) => ({ ...s, sinFichajesHasta: hasta }));
        ctx.log(`Has dejado tu club fuera del plazo de fichajes: no podrás entrar en otro club de ${cfg.nombre} hasta el verano.`, 'aviso');
      }
      ctx.emit<ClubLeaveData>({ type: SHARED_EVENTS.CLUB_LEAVE, data: { sport: cfg.id } });
    },
  };
}

/**
 * La sesión del club como obligación (`GameModule.obligaciones`): hasta que empieza, las acciones cortables (entrenar por libre, charlar, estudiar...) no la pisan; se resta lo que cuesta llegar a la sede.
 * Solo cuenta si hoy hay sesión, aún no ha empezado, no se ha entrenado ya con el club y no se está de baja.
 */
export const obligacionDeSesionDeClub =
  (cfg: ConfigDeporte) =>
  (ctx: ReadContext): Obligacion[] => {
    const club = clubDelJugador(ctx, cfg.id);
    const t = ctx.time;
    if (!club || !club.sesiones.weekdays.includes(t.weekday) || estado(ctx).ultimaSesionClub === t.day || ctx.stat(GEN.baja) > 0) return [];
    const desde = club.sesiones.desde * 60;
    if (t.minuteOfDay >= desde) return [];
    const viaje = minutosParaLlegar(ctx, club.sede);
    const hh = `${club.sesiones.desde}:00`;
    return [{ hasta: t.minute - t.minuteOfDay + desde - viaje, texto: viaje ? `para llegar al entrenamiento de las ${hh}` : `entrenas con el club a las ${hh}` }];
  };

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
export function pedirConsejo(cfg: ConfigDeporte, habilidadesDe: readonly HabilidadDeConsejo[] | ((ctx: ReadContext) => readonly HabilidadDeConsejo[])): ActionDef {
  const { id: deporte, nombre } = cfg;
  const habilidadesDeHoy = (ctx: ReadContext) => (typeof habilidadesDe === 'function' ? habilidadesDe(ctx) : habilidadesDe);
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
      const entrenador = entrenadorDelJugador(ctx, deporte);
      ctx.updateState<EstadoBaseDeDeporte>((s) => ({ ...s, ultimoConsejo: ctx.time.day }));
      // Con puestos y con textos del deporte: el entrenador mira lo que más frena a tu puesto y te recomienda un entrenamiento por su nombre; la habilidad que sube es la que más te frena.
      const recomendacion = recomendarEntrenamiento(ctx, cfg);
      if (recomendacion) {
        if (recomendacion.stat) ctx.train(recomendacion.stat, HABILIDAD_POR_CONSEJO * ctx.efficiency);
        ctx.log(`${entrenador ? entrenador.nombreCorto : 'Tu entrenador'} te dice: «${recomendacion.frase}»`, 'info');
        return;
      }
      // Sin eso, un poco de una habilidad del deporte (cada día, otra; la lista puede ser distinta según el puesto).
      const habilidades = habilidadesDeHoy(ctx);
      const habilidad = habilidades[ctx.time.day % habilidades.length];
      ctx.train(habilidad.stat, HABILIDAD_POR_CONSEJO * ctx.efficiency);
      ctx.log(`${entrenador ? entrenador.nombreCorto : 'Tu entrenador'} te da un consejo para mejorar tu ${habilidad.nombre}.`, 'info');
    },
  };
}

/** El puesto del personaje (el que juega o, sin equipo, aquel en que más vale), o `undefined` si el deporte no tiene puestos. */
function puestoDelPersonaje(ctx: ReadContext, cfg: ConfigDeporte): string | undefined {
  const juega = estado(ctx).puesto;
  if (juega) return juega;
  const valores = Object.entries(cfg.puestos?.(ctx) ?? {}).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  return valores[0]?.[0];
}

/**
 * Cuánto sube un entrenamiento lo que frena al puesto: suma de lo que entrena en cada stat que frena, con más peso a la que más frena (la primera de la lista). Es la regla con la que el entrenador
 * elige: se lee de los datos del entrenamiento (`Entreno`), así que sirve igual con los de hoy que con los que lleguen.
 */
export function utilidadDeUnEntreno(e: EntrenoRecomendable, frenan: readonly string[]): number {
  return frenan.reduce((t, stat, i) => t + (e.entrena.find((x) => x.stat === stat)?.amount ?? 0) / (i + 1), 0);
}

/** El entrenamiento del catálogo que más sube lo que frena (`frenan`, de más a menos); en un empate, el de id menor. `undefined` si ninguno sube nada de eso. */
export function elegirEntrenamiento(catalogo: readonly EntrenoRecomendable[], frenan: readonly string[]): EntrenoRecomendable | undefined {
  return [...catalogo]
    .map((e) => ({ e, u: utilidadDeUnEntreno(e, frenan) }))
    .filter((x) => x.u > 0)
    .sort((a, b) => b.u - a.u || (a.e.id < b.e.id ? -1 : 1))[0]?.e;
}

/**
 * La recomendación del entrenador: de lo que más frena al puesto del personaje (`NpcDirectory.lecturaDePuesto`, comparado con los de su edad), el entrenamiento del catálogo del deporte que más lo sube, **por su
 * nombre** y con las palabras del deporte (`PistasDePuestos`). Si nada le frena, le dice que vaya bien. `undefined` si el deporte no da pistas o no tiene puestos (el consejo de siempre).
 */
export function recomendarEntrenamiento(ctx: ReadContext, cfg: ConfigDeporte): { frase: string; stat?: StatId } | undefined {
  const puesto = puestoDelPersonaje(ctx, cfg);
  const lectura = puesto ? ctx.service<NpcDirectory>(SERVICES.npcs)?.lecturaDePuesto?.(cfg.id, puesto) : undefined;
  const catalogo = cfg.catalogoDeEntrenos?.(ctx);
  if (!lectura?.pistas || !catalogo) return undefined;
  const entrenador = entrenadorDelJugador(ctx, cfg.id);
  const quien = entrenador ? { nombre: entrenador.nombreCorto, gender: entrenador.gender } : undefined;
  const entreno = elegirEntrenamiento(catalogo, lectura.frenan);
  if (!entreno) return { frase: fraseDeEntrenamiento(lectura.pistas, lectura.familia.nombre, lectura.falta, undefined, quien) };
  const stat = lectura.frenan.find((s) => entreno.entrena.some((x) => x.stat === s));
  return { frase: fraseDeEntrenamiento(lectura.pistas, lectura.familia.nombre, lectura.falta, entreno.nombre, quien, entreno.soloClub), ...(stat ? { stat } : {}) };
}

/**
 * «Preguntar por un puesto» a tu entrenador (`<deporte>.preguntar_puesto.<familia>`, decisión del usuario, 21/11/2026): eliges un puesto sin lado en un desplegable y te dice qué tienes y qué te falta para
 * él, en palabras, comparándote con los de tu edad y contigo mismo. Una vez al día y cuando está en su sede. Solo los deportes con puestos y textos (`PistasDePuestos`) lo ofrecen.
 */
export function preguntarPorUnPuesto(cfg: ConfigDeporte): (ctx: ReadContext) => ActionDef[] {
  return (ctx) => {
    const familias = ctx.service<NpcDirectory>(SERVICES.npcs)?.familiasDePuestos?.().find((d) => d.deporte === cfg.id)?.familias ?? [];
    return familias.map((f): ActionDef => ({
      id: `${cfg.id}.preguntar_puesto.${f.id}`,
      name: `Preguntarle a tu entrenador por el puesto de ${f.nombre.toLowerCase()}`,
      description: 'Le preguntas qué te falta para ese puesto. Te lo explica con palabras, comparándote con los de tu edad. Una vez al día y cuando está contigo (antes o después de la sesión).',
      tags: [TAGS.social, cfg.id],
      group: `Entrenar ${cfg.nombre}`,
      duration: 15,
      lugar: (c) => sedeDelClub(c, cfg),
      desplegable: { id: `${cfg.id}.preguntar_puesto`, nombre: 'Preguntar por un puesto…', etiqueta: 'Puesto', opcion: f.nombre, boton: 'Preguntarle por: {opcion}' },
      available: (c) => {
        if ((estado(c).ultimaPreguntaDePuesto ?? -1) === c.time.day) return 'Ya le has preguntado por un puesto hoy';
        if (!clubDelJugador(c, cfg.id)) return 'Necesitas un entrenador: apúntate a un club';
        const entrenador = entrenadorDelJugador(c, cfg.id);
        if (!entrenador) return 'Todavía no conoces a tu entrenador';
        const presencia = c.service<PresenciaService>(SERVICES.presencia);
        if (presencia && presencia.donde(entrenador.id) !== sedeDelClub(c, cfg)[0]) return `${entrenador.nombreCorto} ahora no está disponible: búscalo antes o después de la sesión`;
        return true;
      },
      delta: { [GEN.energia]: -1 },
      run: (c) => {
        c.updateState<EstadoBaseDeDeporte>((s) => ({ ...s, ultimaPreguntaDePuesto: c.time.day }));
        const entrenador = entrenadorDelJugador(c, cfg.id);
        const lectura: LecturaDePuesto | undefined = c.service<NpcDirectory>(SERVICES.npcs)?.lecturaDePuesto?.(cfg.id, f.id);
        const frase = lectura ? fraseDeLectura(lectura, entrenador ? { nombre: entrenador.nombreCorto, gender: entrenador.gender } : undefined) : undefined;
        c.log(frase ? `${entrenador ? entrenador.nombreCorto : 'Tu entrenador'} te contesta: «${frase}»` : `${entrenador ? entrenador.nombreCorto : 'Tu entrenador'} se encoge de hombros: «De ese puesto todavía no sé qué decirte».`, 'info');
      },
    }));
  };
}

/** El nombre de un puesto del deporte («lateral izquierdo»), o su id. */
const nombreDePuesto = (cfg: ConfigDeporte, id: string): string => cfg.puestosDelDeporte?.find((p) => p.id === id)?.nombre ?? id;

/** La propuesta del entrenador al empezar el curso: aceptarla o dejarla. (Pedir jugar en un puesto ya no es una acción de la lista: en la prueba lo pregunta el entrenador y, ya en el equipo, se le pide desde su ficha: `pedirPuesto`.) */
function accionesDeCambioDePuesto(cfg: ConfigDeporte): ActionDef[] {
  const { id: deporte } = cfg;
  // La propuesta del entrenador al empezar el curso: aceptarla (el equipo cuenta con él en el nuevo puesto) o dejarla.
  const propuesta = (aceptar: boolean): ActionDef => ({
    id: `${deporte}.${aceptar ? 'aceptar' : 'rechazar'}_cambio_de_puesto`,
    name: aceptar ? 'Aceptar el cambio de puesto que te propone tu entrenador' : 'Quedarte en tu puesto (rechazar la propuesta del entrenador)',
    description: 'Al empezar el curso, en tu puesto sobran jugadores y en otro faltan: tu entrenador te propone cambiar. Tú decides.',
    tags: [deporte],
    group: 'Puesto',
    duration: 5,
    available: (ctx) => (ctx.state<EstadoBaseDeDeporte>().propuestaDePuesto ? true : 'Tu entrenador no te ha propuesto ningún cambio de puesto'),
    run: (ctx) => {
      const puesto = ctx.state<EstadoBaseDeDeporte>().propuestaDePuesto;
      ctx.updateState<EstadoBaseDeDeporte>((s) => {
        const { propuestaDePuesto: _p, ...resto } = s;
        return aceptar && puesto ? { ...resto, puesto } : resto;
      });
      if (aceptar && puesto) {
        ctx.emit<PuestoPropuestoData>({ type: SHARED_EVENTS.CAMBIO_DE_PUESTO, data: { sport: deporte, puesto } });
        ctx.log(`Aceptas el cambio: este curso juegas de ${nombreDePuesto(cfg, puesto)}.`, 'info');
      }
    },
  });
  return [propuesta(true), propuesta(false)];
}

/**
 * La prueba de acceso de un club con puestos: lo que vale el personaje ese día en cada puesto (`valorDeLaPrueba`: su estado y un azar, la misma que los niños) y la regla de plaza se mide con ello
 * en el puesto que pidió. Si no entra ahí pero el entrenador ve otro puesto donde sí, se lo propone y el personaje decide (aceptar la plaza). Con club ya, la plaza se ofrece y decide cuándo.
 */
function pruebaPorPuestos(ctx: ActionContext, cfg: ConfigDeporte, c: ClubView): void {
  const deporte = cfg.id;
  const npcs = ctx.service<NpcDirectory>(SERVICES.npcs);
  const z = ctx.rng.normal();
  const valores = Object.fromEntries(Object.entries(cfg.puestos!(ctx)).map(([p, v]) => [p, valorDeLaPrueba(v, ctx.efficiency, z)]));
  const nivel = valorDeLaPrueba(cfg.rendimiento(ctx), ctx.efficiency, z);
  const elegido = estado(ctx).pruebaEnCurso?.puesto;
  const pedido = elegido && valores[elegido] !== undefined ? elegido : undefined;
  const entra = (p?: { estado: string }): boolean => p?.estado === 'libre' || p?.estado === 'por_merito';
  let plaza = npcs?.plaza?.(deporte, c.id, nivel, valores, { puesto: pedido });
  let propuesto = false;
  if (!entra(plaza) && pedido) {
    const otra = npcs?.plaza?.(deporte, c.id, nivel, valores, {});
    if (entra(otra)) {
      plaza = otra;
      propuesto = true;
    }
  }
  ctx.updateState<EstadoBaseDeDeporte>((s) => {
    const { pruebaEnCurso: _en, pruebaPedida: pedidas, ...resto } = s;
    const { [c.id]: _pedida, ...restoPedidas } = pedidas ?? {};
    const { puestoPedido: _viejo, ...sinPedido } = resto;
    return { ...sinPedido, ...(pedido ? { puestoPedido: pedido } : {}), pruebas: { ...(s.pruebas ?? {}), [c.id]: ctx.time.week }, ...(Object.keys(restoPedidas).length ? { pruebaPedida: restoPedidas } : {}) };
  });
  if (!plaza || !entra(plaza) || !plaza.puesto) {
    const motivo = plaza?.estado === 'no_llega' ? 'no llegas a lo que pide el club en ese puesto' : 'el equipo de tu categoría está completo en ese puesto y juegan mejor que tú';
    ctx.log(`Prueba en ${c.nombre}: ${motivo}. Sigue entrenando y vuelve a intentarlo (otro puesto, otro club o más adelante).`, 'aviso');
    ctx.addStat(GEN.motivacion, -3);
    return;
  }
  const tras = { puesto: plaza.puesto, valores };
  const nombre = nombreDePuesto(cfg, plaza.puesto);
  const club = clubDelJugador(ctx, deporte);
  if (propuesto || (club && club.id !== c.id)) {
    ctx.updateState<EstadoBaseDeDeporte>((st) => ({ ...st, ofertas: { ...(st.ofertas ?? {}), [c.id]: ctx.time.week }, plazasOfrecidas: { ...(st.plazasOfrecidas ?? {}), [c.id]: tras } }));
    ctx.log(
      propuesto
        ? `Prueba en ${c.nombre}: en el puesto que pedías no hay sitio, pero el entrenador te propone jugar de ${nombre}. Si lo aceptas, acepta la plaza.`
        : `Has pasado la prueba de ${c.nombre} (de ${nombre}): te ofrecen plaza. Antes de aceptarla conviene dejar tu club actual.`,
      'logro',
    );
    return;
  }
  unirseA(ctx, cfg, c.id, tras);
  ctx.log(`Has pasado la prueba de ${c.nombre}: entras en el equipo de tu categoría, de ${nombre}.`, 'logro');
}

/** Los puestos donde a un equipo le faltan jugadores: aquellos en que un candidato que valiera 100 entraría «por hueco» (no por superar al peor). */
export function huecosDelEquipo(ctx: ReadContext, cfg: ConfigDeporte, club: string): string[] {
  const npcs = ctx.service<NpcDirectory>(SERVICES.npcs);
  if (!npcs?.plaza || !cfg.puestosDelDeporte) return [];
  const ceros = Object.fromEntries(cfg.puestosDelDeporte.map((p) => [p.id, 0]));
  return cfg.puestosDelDeporte.filter((p) => npcs.plaza(cfg.id, club, 100, { ...ceros, [p.id]: 100 }, { puesto: p.id }).estado === 'libre').map((p) => p.id);
}

/** Hasta cuántos grupos de puestos nombra el entrenador en la prueba: con más grupos con hueco dice que necesita «varios». */
export const GRUPOS_QUE_NOMBRA_EL_ENTRENADOR = 2;

/**
 * Lo que el entrenador dice que más necesita en la prueba de acceso (`NpcDirectory.huecosPorGrupo`): los grupos de puestos con más jugadores que le faltan (cupo − los que hay), y a igualdad, aquel en que
 * falta mayor parte del cupo. Con **a lo sumo 2 grupos** con hueco los nombra («centrales y laterales»); con más, `necesita` queda vacío (dice que necesita en varios). `nGrupos` cuenta todos los que tienen hueco.
 */
export function necesidadesDelEquipo(ctx: ReadContext, deporte: string, club: string, huecos: readonly string[]): { nGrupos: number; necesita: string } {
  const grupos = (ctx.service<NpcDirectory>(SERVICES.npcs)?.huecosPorGrupo?.(deporte, club) ?? []).filter((g) => g.puestos.some((p) => huecos.includes(p)));
  const orden = [...grupos].sort((a, b) => b.huecos - a.huecos || b.huecos / b.cupo - a.huecos / a.cupo);
  return { nGrupos: grupos.length, necesita: grupos.length <= GRUPOS_QUE_NOMBRA_EL_ENTRENADOR ? orden.map((g) => g.nombre.toLowerCase()).join(' y ') : '' };
}

/** El entrenador de un club que lleva la edad del personaje (los clubes tienen varios): conocido o no. */
export function entrenadorDeClub(ctx: ReadContext, club: string): NpcView | undefined {
  const edad = edadDelJugadorDeTemporada(ctx);
  return ctx.service<NpcDirectory>(SERVICES.npcs)?.list({ role: 'entrenador' }).find((n) => n.club === club && (!n.edades || (edad >= n.edades[0] && edad <= n.edades[1])));
}

/**
 * La prueba de acceso de un club con puestos, en tres pasos (el entrenador pregunta dónde quiere jugar en medio, con un suceso: `sucesoDePruebaDeAcceso`):
 *  1. **Pedir hacer una prueba** (en los trámites del club, en sus horas): te dicen cuándo entrena el equipo que te toca.
 *  2. **Unirte al entrenamiento de prueba** (en su sede, en esas horas): sale el suceso, el entrenador se presenta, dice qué puestos necesita (los 2 en que más le faltan, o «varios») y te deja elegir puesto: si es un hueco, te prueba ahí; si no, te prueba donde decida él.
 *  3. **Entrenar a prueba con el equipo**: al acabar te dicen qué tal ha ido y la plaza se mide en el puesto en que te han probado (`pruebaPorPuestos`).
 * Solo salen los pasos que tocan (el 2 y el 3 del club que has pedido) para no llenar la lista.
 */
function pruebaPorPuestosEnPasos(
  cfg: ConfigDeporte,
  c: ClubView,
  ctx: ReadContext,
  noPuedeProbar: (c2: ReadContext) => string | undefined,
  enHorasDelClub: (c2: ReadContext) => string | undefined,
): ActionDef[] {
  const deporte = cfg.id;
  /** Los tres pasos de la prueba salen en el mismo desplegable «Prueba de acceso…» que la de los demás clubes. */
  const desplegableDePrueba = (opcion: string): NonNullable<ActionDef['desplegable']> => ({ id: `${deporte}.prueba`, nombre: 'Prueba de acceso…', etiqueta: 'Club', boton: '{nombre}', opcion });
  const pedida = estado(ctx).pruebaPedida?.[c.id];
  const enCurso = estado(ctx).pruebaEnCurso;
  const sucesoPendiente = (c2: ReadContext): boolean => !!c2.service<SucesosService>(SERVICES.sucesos)?.pendientes().some((p) => p.suceso === idDeSucesoDePrueba(deporte));
  const pedir = conLugar(tramitesDe(c), {
    id: `${deporte}.pedir_prueba.${c.id}`,
    name: `Pedir hacer una prueba en ${c.nombre}`,
    description: `Pides probar con el equipo que te toca por edad. Te dicen cuándo entrena (${textoDeSesiones(c.sesiones)}): te presentas a esa hora y te unes al entrenamiento. ${infoDeClub(ctx, cfg, c)} Si no pasas, puedes repetirla pasadas ${SEMANAS_ENTRE_PRUEBAS} semanas.`,
    tags: [TAGS.social, deporte],
    group: 'Club',
    desplegable: desplegableDePrueba(c.nombre),
    duration: 10,
    available: (c2) => noPuedeProbar(c2) ?? enHorasDelClub(c2) ?? (estado(c2).pruebaPedida?.[c.id] === c2.time.week ? 'Ya has pedido la prueba: presentarte al entrenamiento' : true),
    run: (c2) => {
      c2.updateState<EstadoBaseDeDeporte>((st) => {
        const { pruebaEnCurso: _abandonada, ...resto } = st;
        return { ...resto, pruebaPedida: { ...(st.pruebaPedida ?? {}), [c.id]: c2.time.week } };
      });
      c2.log(`Has pedido hacer una prueba en ${c.nombre}: el equipo que te toca entrena ${textoDeSesiones(c.sesiones)}. Preséntate a esa hora y únete al entrenamiento.`, 'info');
    },
  });
  const unirte = conLugar(tramitesDe(c), {
    id: `${deporte}.prueba.${c.id}`,
    name: `Unirte al entrenamiento de prueba de ${c.nombre}`,
    description: 'Llegas al entrenamiento: el entrenador se presenta, dice qué puestos necesita y te pregunta dónde quieres jugar. Después entrenas con ellos y, al acabar, te dicen qué tal ha ido.',
    tags: [TAGS.fisico, deporte],
    group: 'Club',
    desplegable: desplegableDePrueba(`${c.nombre} · entrenamiento de prueba`),
    duration: 5,
    available: (c2) => {
      if (estado(c2).pruebaPedida?.[c.id] === undefined) return `Primero pide hacer una prueba en ${c.nombre}`;
      if (estado(c2).pruebaEnCurso) return 'Ya estás en una prueba: entrena con el equipo';
      return noPuedeProbar(c2) ?? enHorasDelClub(c2) ?? true;
    },
    run: (c2) => {
      const huecos = huecosDelEquipo(c2, cfg, c.id);
      const entrenador = entrenadorDeClub(c2, c.id);
      c2.updateState<EstadoBaseDeDeporte>((st) => ({ ...st, pruebaEnCurso: { club: c.id } }));
      c2.emit<PruebaEmpiezaData>({ type: SHARED_EVENTS.PRUEBA_EMPIEZA, data: { sport: deporte, club: c.id, huecos, nHuecos: huecos.length, ...necesidadesDelEquipo(c2, deporte, c.id, huecos), participants: entrenador ? [{ npcId: entrenador.id }] : [] } });
    },
  });
  const entrenar = conLugar(tramitesDe(c), {
    id: `${deporte}.prueba_entrenar.${c.id}`,
    name: `Entrenar a prueba con el equipo de ${c.nombre}`,
    description: 'El resto del entrenamiento de la prueba: cuenta lo que vales ese día en el puesto en que te han probado. Al acabar te dicen qué tal ha ido y, si pasas, entras en el equipo.',
    tags: [TAGS.fisico, deporte],
    group: 'Club',
    desplegable: desplegableDePrueba(`${c.nombre} · entrenar a prueba`),
    duration: 145,
    available: (c2) => {
      if (estado(c2).pruebaEnCurso?.club !== c.id) return 'Primero únete al entrenamiento de prueba';
      if (sucesoPendiente(c2)) return 'El entrenador te está esperando: decide dónde quieres jugar';
      return noPuedeProbar(c2) ?? enHorasDelClub(c2) ?? true;
    },
    delta: { [GEN.energia]: -25, [GEN.estres]: 6 },
    run: (c2) => pruebaPorPuestos(c2, cfg, c),
  });
  return [pedir, ...(pedida !== undefined && !enCurso ? [unirte] : []), ...(enCurso?.club === c.id ? [entrenar] : [])];
}

/** El id del suceso de la prueba de acceso de un deporte (lo construye `sucesoDePruebaDeAcceso`). */
export const idDeSucesoDePrueba = (deporte: string): string => `${deporte}.prueba_de_acceso`;
