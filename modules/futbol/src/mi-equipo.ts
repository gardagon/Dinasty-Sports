import { rngEstable } from '@ds/contracts';

/**
 * «MI EQUIPO» (decidido el 21/11/2026): lo que el personaje cree de sus compañeros por lo que les ha visto hacer, no el dato exacto del motor (VISION, principio 7).
 *
 * Al entrenar con el club o jugar un partido con ellos, el personaje **ve** a cada compañero: desbloquea su puesto y se forma una impresión de si es mejor o peor que él.
 * La impresión es la diferencia entre lo que vale en su puesto y lo que vale él en el suyo (de 0 a 100 las dos) **con un error** de cada vez, que es menor cuanto más sabe
 * de fútbol (el conocimiento), y se va afinando: es la media de lo que ha visto (hasta `veces` ocasiones; después pesa más lo último). Por debajo de `parecido` puntos de
 * diferencia, «parecido». Por persona se guardan cuatro datos: el puesto visto, la diferencia estimada, cuántas veces y la semana de la última.
 */
export const PARAMETROS_DE_PERCEPCION = {
  /** Desviación del error de cada vistazo (en puntos de 0 a 100): con el conocimiento a 0 y a 100. */
  ruido: { sinConocimiento: 8, conTodo: 3 },
  /** Hasta qué diferencia (en puntos) se ve «parecido». */
  parecido: 5,
  /** Cuántas veces cuenta la media; con más, cada vistazo pesa 1/veces. */
  veces: 8,
  /** Cuántos compañeros se recuerdan como máximo (se olvidan los vistos hace más). */
  guardados: 60,
} as const;

/** Lo que recuerda de alguien: [puesto en que lo vio, diferencia estimada (tú − él, redondeada), veces que lo ha visto, semana absoluta de la última]. */
export type Impresion = [puesto: string, diferencia: number, veces: number, semana: number];

export type Juicio = 'mejor' | 'peor' | 'parecido';

/** Lo que se equivoca al valorar (desviación típica, en puntos) con este conocimiento del fútbol (de 0 a 1). */
export const ruidoDeLaVista = (conocimiento: number): number => {
  const r = PARAMETROS_DE_PERCEPCION.ruido;
  return r.sinConocimiento + (r.conTodo - r.sinConocimiento) * Math.max(0, Math.min(1, conocimiento));
};

/** La impresión tras verlo otra vez: el puesto en que lo ve ahora y la media de lo estimado hasta ahora con la estimación de hoy (con su error: sale del compañero y el día, no del azar de la partida). */
export function verDeNuevo(previa: Impresion | undefined, o: { id: string; puesto: string; mio: number; suyo: number; conocimiento: number; dia: number; semana: number }): Impresion {
  const estimacion = o.mio - o.suyo + rngEstable('mi-equipo', o.id, o.dia).normal() * ruidoDeLaVista(o.conocimiento);
  const antes = Math.min(previa?.[2] ?? 0, PARAMETROS_DE_PERCEPCION.veces - 1);
  const media = previa ? (previa[1] * antes + estimacion) / (antes + 1) : estimacion;
  return [o.puesto, Math.round(media), Math.min(PARAMETROS_DE_PERCEPCION.veces, (previa?.[2] ?? 0) + 1), o.semana];
}

export function juicioDe(i: Impresion): Juicio {
  const d = i[1];
  return d >= PARAMETROS_DE_PERCEPCION.parecido ? 'mejor' : d <= -PARAMETROS_DE_PERCEPCION.parecido ? 'peor' : 'parecido';
}

/** Lo que dice la ficha, sin números. */
export function textoDelJuicio(j: Juicio, genero: 'f' | 'm'): string {
  const el = genero === 'f' ? 'ella' : 'él';
  return j === 'mejor' ? `Crees que eres mejor que ${el}.` : j === 'peor' ? `Crees que eres peor que ${el}.` : `Crees que jugáis más o menos igual de bien.`;
}

/** Se olvida de los vistos hace más tiempo cuando hay demasiados (que el guardado no crezca con los años). */
export function recordarSoloLosUltimos(m: Record<string, Impresion>): Record<string, Impresion> {
  const ids = Object.keys(m);
  if (ids.length <= PARAMETROS_DE_PERCEPCION.guardados) return m;
  const quedan = ids.sort((a, b) => m[b][3] - m[a][3]).slice(0, PARAMETROS_DE_PERCEPCION.guardados);
  return Object.fromEntries(quedan.map((id) => [id, m[id]]));
}
