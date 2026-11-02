import { rngEstable, type ActionDef, type EjercicioDeClub, type ReadContext, type StatId } from '@ds/contracts';
import { sesionDeClub } from './club';
import type { ConfigDeporte, Entreno } from './tipos';

/**
 * EJERCICIOS DE LAS SESIONES DEL CLUB. En un deporte de equipo el entrenador no entrena todo a la vez: cada sesión elige unos pocos ejercicios y la sesión
 * sube solo lo que entrenan esos. El catálogo de ejercicios es un dato del deporte; elegirlos es una función pura (`elegirEjercicios`) que más adelante podrá
 * usar también el jugador-entrenador.
 */

/** Un ejercicio de entrenamiento: un nombre y las pocas habilidades que sube (el tipo vive en contracts: lo guardan los datos del deporte y lo usan los PNJ). */
export type Ejercicio = EjercicioDeClub;

/** Con qué se elige: el nivel de quien entrena, lo que importa cada habilidad en su puesto, el carácter del entrenador y un azar estable. */
export interface ContextoDeEleccion {
  /** Nivel (0 a 100) de una habilidad del jugador (o la media del equipo): cuanto menos tiene, más falta le hace. */
  nivel: (stat: StatId) => number;
  /** Cuánto importa una habilidad en el puesto (por defecto, 1 para todas). */
  importancia?: (stat: StatId) => number;
  /** Cuánto le gusta cada tipo de ejercicio a este entrenador (por defecto, 1): sale de su carácter. */
  sesgo?: Readonly<Record<string, number>>;
  /** El puesto del jugador, para los ejercicios de `soloPuesto`. */
  puesto?: string;
  /** Claves del azar estable de la sesión (p. ej. el club y el día): la misma sesión elige siempre lo mismo, y otro día, otra cosa. */
  semilla: readonly (string | number)[];
  /** Cuántos ejercicios (por defecto, 2). */
  cuantos?: number;
}

/** El azar mueve la puntuación de un ejercicio ±25 %: el mejor suele ganar, pero no siempre toca lo mismo. */
const VARIACION_AL_AZAR = 0.25;
/** Mínimo de «falta» de una habilidad (aunque esté al máximo): así nada se descarta del todo. */
const FALTA_MINIMA = 0.05;

/**
 * Los ejercicios que toca hoy: los de mayor puntuación, de tipos distintos. La puntuación de un ejercicio es lo que le falta al jugador en lo que entrena
 * (la cantidad de cada habilidad por su importancia en el puesto y por lo lejos que está del máximo), por lo que le gusta ese tipo de ejercicio al entrenador
 * y por un azar estable. Es una función pura: mismos datos, misma elección.
 */
export function elegirEjercicios(catalogo: readonly Ejercicio[], c: ContextoDeEleccion): Ejercicio[] {
  const puntuados = catalogo
    .filter((e) => !e.soloPuesto || e.soloPuesto === c.puesto)
    .map((e) => {
      const falta = e.entrena.reduce((t, x) => t + x.amount * (c.importancia?.(x.stat) ?? 1) * Math.max(FALTA_MINIMA, 1 - c.nivel(x.stat) / 100), 0);
      const azar = 1 - VARIACION_AL_AZAR + 2 * VARIACION_AL_AZAR * rngEstable('ejercicio', ...c.semilla, e.id).next();
      return { e, puntos: falta * (c.sesgo?.[e.foco] ?? 1) * azar };
    })
    .sort((a, b) => b.puntos - a.puntos || (a.e.id < b.e.id ? -1 : 1));
  const elegidos: Ejercicio[] = [];
  for (const { e } of puntuados) {
    if (elegidos.length >= (c.cuantos ?? 2)) break;
    if (!elegidos.some((x) => x.foco === e.foco)) elegidos.push(e);
  }
  return elegidos;
}

/** «rondos y finalización», «rondos, defensa y balón parado». */
export const listaDeEjercicios = (es: readonly Ejercicio[]): string => (es.length < 2 ? (es[0]?.nombre ?? '') : `${es.slice(0, -1).map((e) => e.nombre).join(', ')} y ${es[es.length - 1].nombre}`);

/**
 * La sesión con el club donde el entrenador elige los ejercicios (`<deporte>.club_sesion`, como `sesionDeClub`): la descripción y el registro cuentan cuáles
 * tocan hoy, y la sesión sube solo lo que entrenan esos ejercicios más lo de `siempre` (el conocimiento, un poco de lo físico...).
 */
export function sesionDeClubConEjercicios(
  cfg: ConfigDeporte,
  def: {
    description: string;
    tags: string[];
    delta: Record<StatId, number>;
    catalogo: readonly Ejercicio[];
    /** Lo que sube siempre, hagan los ejercicios que hagan. */
    siempre: Entreno;
    /** Cómo se elige hoy: el nivel, el puesto y el carácter del entrenador del personaje. */
    contexto: (ctx: ReadContext) => Omit<ContextoDeEleccion, 'semilla'>;
    /** Claves del azar estable de la sesión de hoy (por defecto, el deporte y el día). */
    semilla?: (ctx: ReadContext) => readonly (string | number)[];
  },
): ActionDef {
  const hoy = (ctx: ReadContext): Ejercicio[] => elegirEjercicios(def.catalogo, { ...def.contexto(ctx), semilla: def.semilla?.(ctx) ?? [cfg.id, ctx.time.day] });
  const base = sesionDeClub(cfg, { description: def.description, tags: def.tags, delta: def.delta, train: [] });
  return {
    ...base,
    description: (ctx) => `${def.description} Hoy: ${listaDeEjercicios(hoy(ctx))}.`,
    run: (ctx) => {
      const ejercicios = hoy(ctx);
      ctx.log(`Hoy toca: ${listaDeEjercicios(ejercicios)}.`, 'info');
      for (const t of [...ejercicios.flatMap((e) => e.entrena), ...def.siempre]) ctx.train(t.stat, t.amount);
      base.run?.(ctx);
    },
  };
}
