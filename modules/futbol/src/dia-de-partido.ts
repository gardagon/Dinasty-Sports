/**
 * **EL DÍA DE PARTIDO, PARA TODOS** (`MOTOR_PARTIDOS.md` §15): las reglas del día de partido que valen igual para el personaje y para cualquier PNJ, como funciones puras con sus números como datos. El entrenador convoca una hora antes; quien se
 * une más de 10 minutos tarde es impuntual (su entrenador pierde relación con él); quien llega después de la hora del partido no juega y cuenta como falta; el vestuario se abre media hora antes; y quien espera con los compañeros ve el
 * partido anterior de su campo, que le da conocimiento del fútbol en proporción a lo que ve. Los tiempos son minutos absolutos de la partida.
 */
import { rngEstable } from '@ds/contracts';

/** Los números del día de partido, en minutos (y puntos de conocimiento). */
export const DIA_DE_PARTIDO = {
  /** El entrenador convoca una hora antes del partido. */
  convocatoria: 60,
  /** El vestuario se abre media hora antes del partido y sigue abierto media hora después de acabar. */
  vestuario: 30,
  vestuarioDespues: 30,
  /** Quien se une a la convocatoria con más minutos de retraso que estos es impuntual. */
  tolerancia: 10,
  /** Lo que dura el partido (los 6 tramos de 15 minutos) y el conocimiento que da ver uno entero. */
  duracionDelPartido: 90,
  conocimientoPorPartidoVisto: 1.5,
  /** Cómo llegan los PNJ: según lo disciplinados que son, algunos llegan tarde (de 11 a 30 minutos) o no se presentan (y su equipo juega sin ellos). */
  pnj: { probabilidadDeImpuntual: 0.15, retrasoMaximoDeLosPuntuales: 8, retrasoMaximoDeLosImpuntuales: 30, probabilidadDeFaltar: 0.02 },
} as const;

/**
 * Cómo llega un PNJ convocado (la regla del personaje, con el azar del PNJ): puntual (de 0 a 8 minutos de retraso sobre la hora de la convocatoria), impuntual (de 11 a 30) o no se presenta. Cuanto más disciplinado
 * (`disciplina` de 0 a 1), menos impuntual y menos falta. Es estable: depende de la semilla, el jugador y la semana.
 */
export function llegadaDelPNJ(o: { semilla: number; npcId: string; semana: number; disciplina: number }): { tarde: number; ausente: boolean } {
  const P = DIA_DE_PARTIDO.pnj;
  const rng = rngEstable('llegada', o.semilla, o.npcId, o.semana);
  const peso = 1.5 - Math.min(1, Math.max(0, o.disciplina));
  const [u0, u1] = [rng.next(), rng.next()];
  if (u0 < P.probabilidadDeFaltar * peso) return { tarde: 0, ausente: true };
  if (u0 < P.probabilidadDeFaltar * peso + P.probabilidadDeImpuntual * peso) return { tarde: Math.round(DIA_DE_PARTIDO.tolerancia + 1 + u1 * (P.retrasoMaximoDeLosImpuntuales - DIA_DE_PARTIDO.tolerancia - 1)), ausente: false };
  return { tarde: Math.round(u1 * P.retrasoMaximoDeLosPuntuales), ausente: false };
}

/** Cuánto aprende del fútbol viendo el partido anterior de su campo: lo que ve (los minutos de ese partido entre que llega y se abre el vestuario) sobre lo que dura, por lo que da ver uno entero. */
export function conocimientoPorVer(o: { anteriorDesde: number; ahora: number; saque: number }): number {
  const hasta = Math.min(o.anteriorDesde + DIA_DE_PARTIDO.duracionDelPartido, o.saque - DIA_DE_PARTIDO.vestuario);
  const visto = Math.max(0, hasta - Math.max(o.anteriorDesde, o.ahora));
  return DIA_DE_PARTIDO.conocimientoPorPartidoVisto * (visto / DIA_DE_PARTIDO.duracionDelPartido);
}

/** El partido anterior de un campo (el de la franja anterior): la hora de su saque en minutos absolutos, entre los partidos `[día, hora, campo]` de la semana. */
export function partidoAnteriorEnElCampo(partidos: readonly [number, number, string][], mio: [number, number, string], inicioDeSemana: number): number | undefined {
  const anterior = partidos.filter(([dia, hora, campo]) => dia === mio[0] && campo === mio[2] && hora < mio[1]).sort((a, b) => b[1] - a[1])[0];
  return anterior ? (inicioDeSemana + anterior[0]) * 1440 + anterior[1] * 60 : undefined;
}
