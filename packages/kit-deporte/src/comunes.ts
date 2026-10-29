import {
  CORE_EVENTS,
  GEN,
  SERVICES,
  TAGS,
  conocimientoDeCrianza,
  inHours,
  sePractica,
  type ActionDef,
  type ActionDoneData,
  type EventHandler,
  type FamilyService,
  type ModifierDef,
  type ReadContext,
  type StatId,
  type StudiesService,
} from '@ds/contracts';
import { idDeConocimiento } from './habilidades';
import type { ConfigDeporte, Entreno, EstadoBaseDeDeporte } from './tipos';

/** El campamento de verano rinde más que cualquier otro entrenamiento: entrenadores, grupo y todo el día. */
export const EFICIENCIA_CAMPAMENTO = 1.2;
/** Sesiones de entrenamiento al día sin sobrecarga: a partir de la siguiente rinden menos, cuestan más y castigan el cuerpo. */
export const SESIONES_SIN_SOBRECARGA = 2;
/** Efecto del conocimiento sobre la eficiencia de entrenar y competir: de ×0,90 (0) a ×1,15 (100). */
export const EFECTO_CONOCIMIENTO = { min: 0.9, rango: 0.25 };

/**
 * Solo se ofrece lo del deporte que se practica: las acciones de un deporte que el personaje no practica se ocultan y no se pueden hacer
 * (el motivo es el que se vería al forzarlas). Envuelve las acciones fijas del deporte y, con `soloSiSePracticaDinamicas`, las dinámicas.
 */
export const soloSiSePractica = (cfg: ConfigDeporte, acciones: readonly ActionDef[]): ActionDef[] => acciones.map((a) => ocultarSiNoSePractica(cfg, a));

export const soloSiSePracticaDinamicas =
  (cfg: ConfigDeporte, acciones: (ctx: ReadContext) => ActionDef[]) =>
  (ctx: ReadContext): ActionDef[] =>
    sePractica(ctx, cfg.id) ? acciones(ctx) : [];

function ocultarSiNoSePractica(cfg: ConfigDeporte, a: ActionDef): ActionDef {
  return {
    ...a,
    oculta: (ctx) => !sePractica(ctx, cfg.id) || (a.oculta?.(ctx) ?? false),
    available: (ctx) => (sePractica(ctx, cfg.id) ? (a.available?.(ctx) ?? true) : `No practicas ${cfg.nombre}`),
  };
}

const estado = (ctx: ReadContext) => ctx.state<EstadoBaseDeDeporte>();
const caminoDeVerano = (ctx: ReadContext) => ctx.service<StudiesService>(SERVICES.estudios)?.summerPath() ?? null;

/** Campamento del deporte en verano (`<deporte>.campamento`), para quien saca buenas notas: una jornada completa con entrenadores. */
export function campamento(cfg: ConfigDeporte, def: { tags: string[]; delta: Record<StatId, number>; train: Entreno }): ActionDef {
  return {
    id: `${cfg.id}.campamento`,
    name: `Campamento de ${cfg.nombre}`,
    description: 'Con buenas notas, tus padres te dejan ir a un campamento del deporte que practicas: una jornada completa de entrenamiento con entrenadores. Mejoras más que de ninguna otra forma.',
    tags: def.tags,
    group: 'Verano',
    duration: 300,
    available: (ctx) => {
      if (caminoDeVerano(ctx) !== 'campamento') return 'Solo puedes pedir campamento en verano si has sacado buenas notas';
      const t = ctx.time;
      if (t.weekday === 6) return 'El campamento no abre los domingos';
      if (estado(ctx).ultimoVerano === t.day) return 'Ya has ido al campamento hoy';
      return inHours(t, 9, 10) ? true : 'El campamento empieza a las 9';
    },
    delta: def.delta,
    train: def.train,
    run: (ctx) => ctx.updateState<EstadoBaseDeDeporte>((s) => ({ ...s, ultimoVerano: ctx.time.day })),
  };
}

/** Practicar con los amigos en verano (`<deporte>.amigos`), con notas aceptables: sienta bien, pero no se mejora igual. */
export function conLosAmigos(cfg: ConfigDeporte, def: { description: string; tags: string[]; delta: Record<StatId, number>; train: Entreno }): ActionDef {
  return {
    id: `${cfg.id}.amigos`,
    name: 'Practicar con los amigos',
    description: def.description,
    tags: def.tags,
    group: 'Verano',
    duration: 120,
    available: (ctx) => {
      if (caminoDeVerano(ctx) !== 'amigos') return 'Solo en verano, con notas aceptables';
      const t = ctx.time;
      if (estado(ctx).ultimoVerano === t.day) return 'Ya has quedado con los amigos hoy';
      return inHours(t, 10, 19) ? true : 'De 10 a 19';
    },
    delta: def.delta,
    train: def.train,
    run: (ctx) => ctx.updateState<EstadoBaseDeDeporte>((s) => ({ ...s, ultimoVerano: ctx.time.day })),
  };
}

/** Verlo en la tele (`<deporte>.ver_tele`): una vez al día; ayuda a entender el deporte, pero no sustituye a entrenar ni a competir. */
export function verEnLaTele(cfg: ConfigDeporte, description: string): ActionDef {
  return {
    id: `${cfg.id}.ver_tele`,
    name: `Ver ${cfg.nombre} en la tele`,
    description,
    tags: [TAGS.mental],
    group: 'Tiempo libre',
    duration: 90,
    available: (ctx) => {
      const t = ctx.time;
      if ((estado(ctx).ultimaTele ?? -1) === t.day) return `Ya has visto ${cfg.nombre} hoy`;
      return inHours(t, t.isSchoolDay ? 18 : 10, 23) ? true : 'Retransmisiones: días de clase de 18 a 23, sin clase de 10 a 23';
    },
    delta: { [GEN.energia]: -2, [GEN.estres]: -4 },
    train: [
      { stat: idDeConocimiento(cfg.id), amount: 0.6 },
      { stat: GEN.atencion, amount: 0.2 },
    ],
    run: (ctx) => ctx.updateState<EstadoBaseDeDeporte>((s) => ({ ...s, ultimaTele: ctx.time.day })),
  };
}

/** El campamento rinde más (solo el de este deporte). */
export function modificadorDeCampamento(cfg: ConfigDeporte): ModifierDef {
  return {
    id: `${cfg.id}.campamento`,
    tags: ['campamento'],
    apply: (_ctx, action) => (action.tags.includes(cfg.id) ? { efficiency: EFICIENCIA_CAMPAMENTO, reason: 'Campamento con entrenadores' } : null),
  };
}

/** El conocimiento del deporte da un bonus (o un malus, si es poco) al entrenar y al competir. */
export function modificadorDeConocimiento(cfg: ConfigDeporte): ModifierDef {
  return {
    id: idDeConocimiento(cfg.id),
    tags: [cfg.id],
    apply: (ctx, action) => {
      if (!action.tags.includes(TAGS.entrenamiento) && !action.tags.includes(TAGS.competicion)) return null;
      const f = EFECTO_CONOCIMIENTO.min + EFECTO_CONOCIMIENTO.rango * ctx.norm(idDeConocimiento(cfg.id));
      if (Math.abs(f - 1) < 0.02) return null;
      return { efficiency: f, reason: f < 1 ? 'Conoces poco el deporte' : 'Conocimiento del deporte' };
    },
  };
}

/** Más de `SESIONES_SIN_SOBRECARGA` sesiones de entrenamiento del deporte en el día: rinden menos y cuestan más. */
export function modificadorDeSobrecarga(cfg: ConfigDeporte): ModifierDef {
  return {
    id: `${cfg.id}.sobrecarga`,
    tags: [cfg.id],
    apply: (ctx, action) => {
      if (!action.tags.includes(TAGS.entrenamiento)) return null;
      const s = estado(ctx).sesionesHoy;
      const n = s.day === ctx.time.day ? s.n : 0;
      if (n < SESIONES_SIN_SOBRECARGA) return null;
      return { efficiency: 0.6, cost: 1.3, reason: 'Sobrecarga: demasiadas sesiones hoy' };
    },
  };
}

/**
 * Manejadores comunes de un deporte:
 * - el primer día se suma el conocimiento del deporte que le viene de casa (si sus padres lo practicaron, algo sabe; más si llegaron lejos);
 * - cada sesión de entrenamiento cuenta para la sobrecarga, y entrenar con sobrecarga castiga el cuerpo y puede lesionar.
 */
export function manejadoresDeDeporte(cfg: ConfigDeporte): Record<string, EventHandler> {
  return {
    [CORE_EVENTS.DAY_END]: (ctx) => {
      if (estado(ctx).herenciaAplicada) return;
      ctx.updateState<EstadoBaseDeDeporte>((s) => ({ ...s, herenciaAplicada: true }));
      const padres = ctx.service<FamilyService>(SERVICES.familia)?.parents();
      const conocimiento = padres ? conocimientoDeCrianza(padres, cfg.id) : 0;
      if (conocimiento > 0) {
        ctx.addStat(idDeConocimiento(cfg.id), conocimiento);
        ctx.log(`Has crecido oyendo hablar de ${cfg.nombre} en casa: ya sabes algo del deporte.`, 'info');
      }
    },
    [CORE_EVENTS.ACTION_DONE]: (ctx, ev) => {
      const d = ev.data as ActionDoneData;
      if (d.module !== cfg.id || !d.tags.includes(TAGS.entrenamiento)) return;
      // El día se toma del momento en que empezó la sesión (antes de avanzar el reloj).
      const dia = Math.floor((ctx.time.minute - d.duration) / 1440);
      const prev = estado(ctx).sesionesHoy;
      const n = prev.day === dia ? prev.n + 1 : 1;
      ctx.updateState<EstadoBaseDeDeporte>((s) => ({ ...s, sesionesHoy: { day: dia, n } }));
      if (n > SESIONES_SIN_SOBRECARGA) {
        ctx.addStat(GEN.salud, -4);
        if (ctx.rng.chance(0.15)) {
          ctx.addStat(GEN.salud, -10);
          ctx.log('Molestias musculares: te has pasado entrenando.', 'aviso');
        }
      }
    },
  };
}
