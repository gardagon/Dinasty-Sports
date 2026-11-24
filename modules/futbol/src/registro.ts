/**
 * **EL REGISTRO DEL PARTIDO Y LOS FLUJOS DE AZAR** (P0 de `docs/relevo/partidos-reales.md` §6; bases del motor de partidos nuevo, sin cambiar un solo resultado).
 *
 * 1. **Flujos de azar por subsistema.** Hasta ahora el partido entero salía de un único generador (`rngEstable('partido', semilla, id)`): cualquier dado nuevo en medio habría cambiado todos los
 *    marcadores siguientes. Ahora cada subsistema tiene su flujo propio, que sale de las mismas partes más el nombre del subsistema, y **solo gasta quien lo usa**: añadir lesiones, tarjetas o minutos
 *    no cambia el resultado. El flujo `resultado` es exactamente el de siempre (mismos números en el mismo orden), así que los partidos de hoy no cambian.
 * 2. **El registro de sucesos** es lo que pasó en el partido, en orden y con su minuto: el único sitio del que leen la crónica de hoy, el visualizador y las estadísticas de mañana. La crónica
 *    (`MomentoDeCronica`) es una **vista derivada** de él (`vistaDeCronica`). Un motor nuevo (posesiones y xG, jugadas por zonas, espacial) solo tiene que llenar el registro con más tipos de suceso.
 */
import { rngEstable, type Rng } from '@ds/contracts';

// ---------------------------------------------------------------------------------------------------- flujos de azar por subsistema

/**
 * Los subsistemas del partido con azar propio. `resultado` es el del motor (goles, tiros, tirador, asistente, balón parado) y no cambia. El resto están reservados para lo que llega: los minutos de
 * los sucesos (ya en uso), las tarjetas, las lesiones y los cambios tácticos.
 */
export type SubsistemaDeAzar = 'resultado' | 'minutos' | 'tarjetas' | 'lesiones' | 'cambios';

export interface FlujosDeAzar {
  /** El generador de un subsistema (se crea al pedirlo la primera vez; pedir uno no gasta ni cambia los demás). */
  de(subsistema: SubsistemaDeAzar): Rng;
  /** El del resultado: el de siempre. */
  readonly resultado: Rng;
}

/** Los flujos de un partido: mismos `semilla` e `id`, mismos números. El del `resultado` es `rngEstable('partido', semilla, id)`, como antes de existir los flujos. */
export function flujosDelPartido(semilla: number, id: string): FlujosDeAzar {
  const resultado = rngEstable('partido', semilla, id);
  const otros = new Map<SubsistemaDeAzar, Rng>();
  return {
    resultado,
    de: (s) => (s === 'resultado' ? resultado : (otros.get(s) ?? (otros.set(s, rngEstable('partido', s, semilla, id)), otros.get(s)!))),
  };
}

/**
 * El azar de lesión de **un jugador en un momento de un partido** (lo pide la sesión de salud, `docs/relevo/salud-lesiones.md` §5.2): sale del jugador, del partido y del tramo (o del minuto), no de
 * lo que ha pasado en el resto, así que que otro jugador se lesione, o que se añadan jugadores al partido, no cambia las tiradas de este.
 */
export const azarDeLesionEnPartido = (semilla: number, partido: string, jugador: string, momento: number): Rng => rngEstable('lesion-partido', semilla, jugador, partido, momento);

// ---------------------------------------------------------------------------------------------------- el registro de sucesos

/** Un momento del partido para la crónica y las estadísticas (sin minuto): goles, ocasiones, balón parado y cambios. Es lo que cuenta la crónica de hoy. */
export interface MomentoDeCronica {
  /** 0 a 5. */
  tramo: number;
  tipo: 'gol' | 'ocasion' | 'balon_parado' | 'cambio';
  /** 0 (local) o 1 (visitante): el equipo al que le pasa. */
  equipo: 0 | 1;
  /** Quien tira o marca (en un cambio, quien entra). */
  jugador: string;
  /** El que da el pase del gol (o, en un cambio, quien sale). */
  otro?: string;
  /** El portero que para (en un gol o una ocasión, el que defiende). */
  portero?: string;
  /** En un lanzamiento de balón parado, si fue gol. */
  gol?: boolean;
}

/**
 * Un suceso del registro: lo del momento de crónica más su **minuto** (0 a 89). Los motores nuevos añaden tipos (`tiro_fuera`, `falta`, `amarilla`, `corner`, `lesion`…) y campos opcionales (`xg`, `zona`) sin
 * romper a quien lee los de hoy: quien no conoce un tipo, lo ignora.
 */
export interface SucesoDePartido extends MomentoDeCronica {
  minuto: number;
}

/**
 * Pone minuto a cada suceso, con su propio flujo de azar (`minutos`): los cambios, al empezar el tramo; lo demás, repartido por el tramo en orden creciente. El orden de los sucesos no cambia, solo se
 * les pone un minuto que no existía.
 */
export function conMinutos(momentos: readonly MomentoDeCronica[], rng: Rng, minutosPorTramo: number): SucesoDePartido[] {
  const porTramo = new Map<number, number[]>();
  momentos.forEach((m, i) => {
    if (m.tipo === 'cambio') return;
    const l = porTramo.get(m.tramo) ?? porTramo.set(m.tramo, []).get(m.tramo)!;
    l.push(i);
  });
  const minuto = new Map<number, number>();
  for (const [tramo, indices] of [...porTramo.entries()].sort((a, b) => a[0] - b[0])) {
    const sorteados = indices.map(() => tramo * minutosPorTramo + Math.min(minutosPorTramo - 1, Math.floor(rng.next() * minutosPorTramo))).sort((a, b) => a - b);
    indices.forEach((i, k) => minuto.set(i, sorteados[k]));
  }
  return momentos.map((m, i) => ({ ...m, minuto: m.tipo === 'cambio' ? m.tramo * minutosPorTramo : minuto.get(i)! }));
}

/** La crónica como vista del registro: lo mismo de siempre, sin el minuto. Solo los tipos que la crónica conoce. */
export function vistaDeCronica(registro: readonly SucesoDePartido[]): MomentoDeCronica[] {
  const CONOCIDOS: ReadonlySet<string> = new Set(['gol', 'ocasion', 'balon_parado', 'cambio']);
  return registro.filter((s) => CONOCIDOS.has(s.tipo)).map(({ minuto: _minuto, ...momento }) => momento);
}
