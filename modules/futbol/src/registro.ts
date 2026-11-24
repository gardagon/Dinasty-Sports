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
  /**
   * El generador de un subsistema **en un minuto del partido**: sale solo de las partes (subsistema, semilla, partido y minuto), sin estado que guardar. Es lo que hace reanudable el motor: un partido parado en
   * el minuto 40 y seguido después juega los mismos minutos que uno jugado de un tirón.
   */
  deMinuto(subsistema: SubsistemaDeAzar, minuto: number): Rng;
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
    deMinuto: (s, minuto) => rngEstable('partido', s, semilla, id, minuto),
  };
}

/**
 * El azar de lesión de **un jugador en un momento de un partido** (lo pide la sesión de salud, `docs/relevo/salud-lesiones.md` §5.2): sale del jugador, del partido y del tramo (o del minuto), no de
 * lo que ha pasado en el resto, así que que otro jugador se lesione, o que se añadan jugadores al partido, no cambia las tiradas de este.
 */
export const azarDeLesionEnPartido = (semilla: number, partido: string, jugador: string, momento: number): Rng => rngEstable('lesion-partido', semilla, jugador, partido, momento);

// ---------------------------------------------------------------------------------------------------- el registro de sucesos

/**
 * Los tipos de suceso del registro. Los cuatro primeros son los de siempre (la crónica de la F2): `gol`, `ocasion` (el tiro a puerta que para el portero), `balon_parado` (un lanzamiento de falta o córner, con su
 * remate) y `cambio`. El motor de posesiones y ocasiones (P1) añade el resto. En todos, `equipo` es el equipo **de quien hace** el suceso (el que marca, el que tira, el que comete la falta, el que sale lesionado).
 */
export type TipoDeSuceso = 'gol' | 'ocasion' | 'balon_parado' | 'cambio' | 'tiro_fuera' | 'tiro_bloqueado' | 'falta' | 'amarilla' | 'roja' | 'corner' | 'penalti' | 'lesion';

/** Un momento del partido para la crónica y las estadísticas (sin minuto). */
export interface MomentoDeCronica {
  /** 0 a 5. */
  tramo: number;
  tipo: TipoDeSuceso;
  /** 0 (local) o 1 (visitante): el equipo de quien lo hace. */
  equipo: 0 | 1;
  /** Quien tira o marca (en un cambio, quien entra; en una falta o tarjeta, el infractor; en una lesión, el lesionado). */
  jugador: string;
  /** El que da el pase del gol (en un cambio, quien sale; en una falta, el que la recibe; en un lanzamiento de balón parado, el lanzador). */
  otro?: string;
  /** El portero que para (en un gol o una ocasión, el que defiende). */
  portero?: string;
  /** En un lanzamiento de balón parado o un penalti, si fue gol. */
  gol?: boolean;
  /** Un gol de penalti. */
  penalti?: boolean;
  /** La calidad de la ocasión (probabilidad de gol del tiro, de 0 a 1), en los tiros. */
  xg?: number;
  /** Segunda amarilla (una `roja` que viene de dos amarillas) o roja directa (`false`). */
  dobleAmarilla?: boolean;
  /** En una lesión: tipo, zona del cuerpo y días de baja (`salud.ts`). */
  lesion?: { t: string; z: string; d: number };
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

/** Los tipos de suceso que cuenta la crónica (los demás —faltas sin tarjeta, tiros fuera lejanos, córners— están en el registro para las estadísticas, pero no salen en el relato). */
const SALEN_EN_LA_CRONICA: ReadonlySet<string> = new Set(['gol', 'ocasion', 'balon_parado', 'cambio', 'amarilla', 'roja', 'penalti', 'lesion']);
/** Un tiro fuera o bloqueado sale en el relato solo si fue una ocasión clara (probabilidad de gol de al menos esto). */
export const XG_DE_OCASION_CLARA = 0.15;

/** La crónica como vista del registro: lo que cuenta el relato, sin el minuto. */
export function vistaDeCronica(registro: readonly SucesoDePartido[]): MomentoDeCronica[] {
  return registro
    .filter((s) => SALEN_EN_LA_CRONICA.has(s.tipo) || ((s.tipo === 'tiro_fuera' || s.tipo === 'tiro_bloqueado') && (s.xg ?? 0) >= XG_DE_OCASION_CLARA))
    .map(({ minuto: _minuto, ...momento }) => momento);
}
