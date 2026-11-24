/**
 * EL MOTOR DE PARTIDO (`docs/MOTOR_PARTIDOS.md`; plan en `docs/relevo/partidos-reales.md`): cómo los valores de los jugadores se convierten en un partido. **Motor B (P1): posesiones y ocasiones.** El partido son
 * unos 215 posesiones repartidas por minutos; en cada una se decide quién tiene el balón (la creación de un equipo frente a la del otro), si hay falta, si llega hasta el último tercio, si acaba en tiro, de qué tipo, **con
 * qué calidad (xG)**, quién tira, si el tiro se bloquea, sale fuera, va a puerta, lo para el portero o es gol; y de ahí salen las faltas, las tarjetas, los penaltis, los córners y los pases de cada jugador. Todo se
 * decide **comparando** (duelos relativos) con una parte pequeña contra una dificultad fija, y antes del pitido todo se lleva a escala de adulto con el potenciador de la categoría (§3 ter del análisis), así que el motor se
 * calibra una sola vez y vale para todas las categorías.
 *
 * **Es una máquina de estados** (`EstadoDePartido`, JSON puro): `crearPartido` → `avanzarPartido(estado, equipos, hasta)` las veces que haga falta → `resultadoDelPartido`. El azar de cada minuto sale solo de la semilla, el
 * partido y el minuto (`registro.ts`), sin estado que guardar: un partido parado en el minuto 40, guardado y seguido después, juega exactamente los mismos minutos que uno jugado de un tirón. Así se podrá ver en directo, o parar
 * para decidir (F7). `jugarPartido` los encadena de una vez. Son funciones puras: mismos equipos, misma semilla y mismo `id`, mismo partido; y un partido entero tarda menos de un milisegundo.
 *
 * Qué entra (`EquipoDePartido`): los jugadores con su lector de habilidades y capacidades, su puesto y la energía con que llegan. Qué sale (`ResultadoDePartido`): el marcador, el de cada tramo, **el registro de sucesos con
 * su minuto** (de él salen la crónica y las estadísticas) y, por jugador, minutos, goles, asistencias, tiros, tiros a puerta, xG, paradas, faltas, tarjetas, pases y nota. Las lesiones se preguntan (con el perfil de riesgo de
 * `salud.ts`) detrás de un dato desactivado (`PARAMETROS_DE_PARTIDO.lesiones.activas`).
 */
import { rngEstable, GEN, riesgoPorExposicion, sortearLesion, type LectorDePersona, type PerfilDeRiesgo, type PersonaDeRiesgo, type Rng } from '@ds/contracts';
import { valorEfectivo } from '@ds/kit-deporte';
import { DEFINICIONES_DEL_ADDON, STATS_DE_FUTBOL, apoyosDe } from './habilidades';
import { PUESTOS_DE_FUTBOL } from './puestos';
import { azarDeLesionEnPartido, flujosDelPartido, vistaDeCronica, type MomentoDeCronica, type SucesoDePartido, type TipoDeSuceso } from './registro';

export type { MomentoDeCronica, SucesoDePartido, TipoDeSuceso };

export type Intensidad = 'relajado' | 'normal' | 'a_tope';
export type Zona = 'porteria' | 'defensa' | 'creacion' | 'ataque';

/** Las habilidades (y capacidades) que forman cada zona (§4 del diseño); el balón parado va aparte (lanzadores y rematadores). */
export const HABILIDADES_DE_LA_ZONA: Readonly<Record<Zona, readonly string[]>> = {
  porteria: ['futbol.reflejos', 'futbol.blocaje', 'futbol.mano_a_mano', 'futbol.alcance_aereo', 'futbol.dominio_area', 'futbol.posicionamiento'],
  defensa: ['futbol.marcaje', 'futbol.entrada', 'futbol.posicionamiento', 'futbol.anticipacion', 'futbol.cabeza', 'gen.velocidad', 'gen.fuerza'],
  creacion: ['futbol.pase', 'futbol.control', 'futbol.vision', 'futbol.decisiones', 'futbol.juego_colectivo', 'futbol.tecnica'],
  ataque: ['futbol.definicion', 'futbol.desmarque', 'futbol.regate', 'futbol.arrancada', 'futbol.disparo_lejano', 'futbol.centros', 'futbol.cabeza'],
};
const ZONAS: readonly Zona[] = ['porteria', 'defensa', 'creacion', 'ataque'];

/** Los números del motor, como datos (los ajusta el banco de realismo, `npm run partidos:banco`, con `--parametros`). */
export const PARAMETROS_DE_PARTIDO = {
  /** Un partido son 90 minutos en 6 tramos de 15 (3 por parte): el tramo es la unidad de los cambios, del resumen de posesión y de la crónica. */
  tramos: 6,
  minutosPorTramo: 15,
  /** Posesiones por minuto (las de los dos equipos juntos). */
  posesionesPorMinuto: 2.45,
  /** Probabilidad base de que una posesión llegue al último tercio (con equipos iguales), la dificultad fija (en escala de adulto) y cuánto pesa la comparación entre equipos. */
  avanceBase: 0.4,
  dificultadDelAvance: 22,
  potenciaDelAvance: 1,
  /** Probabilidad base de que una llegada al último tercio acabe en tiro, y cuánto pesa la comparación entre el ataque y la defensa rival. */
  tiroDelAvance: 0.34,
  /** Cómo es cada tiro: el reparto de los tipos (el resto, de juego), su calidad media (xG) y cuánto varía de un tiro a otro. */
  tiposDeTiro: { cabeza: 0.2, lejano: 0.18 },
  xgDeJuego: 0.135,
  xgDeCabeza: 0.088,
  xgDeLejano: 0.04,
  ruidoDelXg: 1.1,
  /** Tiros que se bloquean, tiros que salen fuera y cuánto pesa en el gol la comparación del tirador con el portero. */
  bloqueado: 0.27,
  fuera: 0.55,
  potenciaDelGol: 1.2,
  /** Faltas por minuto (las dos), probabilidad de amarilla por falta, de roja directa, de penalti y de tiro libre peligroso. */
  faltasPorMinuto: 0.26,
  amarilla: 0.17,
  rojaDirecta: 0.0025,
  penaltiPorFalta: 0.012,
  tiroLibrePorFalta: 0.15,
  xgDeTiroLibre: 0.06,
  xgDePenalti: 0.76,
  /** Un penalti se marca con esta probabilidad con tirador y portero iguales. */
  golDePenalti: 0.75,
  /** Córners: probabilidad de que un tiro parado o bloqueado acabe en córner, y de que el córner acabe en remate; calidad de ese remate. */
  cornerDeParada: 0.25,
  /** Probabilidad de que una llegada al último tercio sin tiro acabe en córner (un despeje a córner, un centro desviado). */
  cornerDeAvance: 0.13,
  cornerDeBloqueo: 0.35,
  remateDeCorner: 0.35,
  xgDeCorner: 0.09,
  /** Pases por posesión (media). */
  pasesPorPosesion: 4.0,
  /** Ventaja de jugar en casa: más en las zonas del local (+4 %). */
  ventajaDeCasa: 0.04,
  /** El partido se abre: la probabilidad de avanzar crece hacia el final (`1 + apertura × (minuto / 90 − 0,5)`) y el que va perdiendo arriesga más, el que gana menos (por gol de diferencia, hasta dos). */
  apertura: 0.6,
  ritmoDelMarcador: 0.06,
  /** Cuánto cuenta en la nota lo que vale el jugador en su zona frente a lo esperado para su puesto (por cada 100 % de diferencia). */
  pesoDelRendimientoEnLaNota: 2,
  /** Cansancio: lo que sube por tramo a un jugador típico a intensidad normal (6 tramos ⇒ unos 45) y lo que rinde y comete de faltas a cada intensidad. */
  cansancioPorTramo: 7.5,
  intensidades: {
    relajado: { cansancio: 0.7, rinde: 0.93, faltas: 0.8 },
    normal: { cansancio: 1, rinde: 1, faltas: 1 },
    a_tope: { cansancio: 1.4, rinde: 1.07, faltas: 1.3 },
  } as Record<Intensidad, { cansancio: number; rinde: number; faltas: number }>,
  /** Capacidad típica de un adulto, contra la que se comparan las capacidades de apoyo (de ×0,6 a ×1,2). */
  capacidadTipicaDeAdulto: 40,
  /** Tabla de rendimiento por frescura (100 − cansancio): desde, multiplicador. */
  frescura: [
    { desde: 70, rinde: 1 },
    { desde: 50, rinde: 0.9 },
    { desde: 30, rinde: 0.75 },
    { desde: 10, rinde: 0.55 },
    { desde: 0, rinde: 0.3 },
  ],
  /**
   * **Lesiones en el partido** (decisión del 24/11: contactos y carga por minuto en los niveles 1 y 2; la activación va con la F4 de salud). **Desactivadas**: con `activas: false` el motor ni pregunta, y el partido
   * es exactamente el mismo. Cuando se activen, cada minuto, cada jugador en el campo: `riesgoPorExposicion(perfil, { horas: 1/60, contacto, cansancio, intensidad })`; el dado sale de `azarDeLesionEnPartido`.
   * `contacto` normalizado para que su media sea ≈ 0,5 (la tasa base de `salud.ts` ya cuenta los contactos medios): 1 para quien recibe o comete una falta ese minuto, 0,8 para los demás de un minuto con falta, 0,4 si no la hubo.
   */
  lesiones: { activas: false, contactoDeLaFalta: 1, contactoConFaltaCerca: 0.8, contactoNormal: 0.4 },
};

/**
 * El potenciador de cada categoría (§3 ter del análisis): lo que lleva lo mejor de la categoría a la escala de adulto, de la curva por edad que ya existe (benjamín ×2,8 ... juvenil ×1,1, sénior ×1). Dato del
 * deporte; en una división más floja haría falta un poco más (con una sola división por categoría, el nivel del partido no cambia nada).
 */
export const POTENCIADOR_POR_CATEGORIA: Readonly<Record<string, number>> = { prebenjamin: 4, benjamin: 2.8, alevin: 2, infantil: 1.6, cadete: 1.33, juvenil: 1.1, senior: 1 };

/** Un jugador que sale al campo (o espera en el banquillo). */
export interface JugadorDePartido {
  id: string;
  nombre: string;
  /** Id del puesto (`GK`, `CB`...). */
  puesto: string;
  lector: LectorDePersona;
  /** Energía con que llega (0 a 100); por defecto 100. Cuanta menos, más se cansa. */
  energia?: number;
  /** Cuánto rinde el día del partido por su estado (forma y salud: `factorDeCompeticion` de su eficiencia; el mismo factor que en el atletismo); por defecto 1. */
  rinde?: number;
  titular: boolean;
  /** La intensidad a la que juega este jugador (la elige el personaje antes del partido); sin ella, la de su equipo (normal). */
  intensidad?: Intensidad;
}

export interface EquipoDePartido {
  id: string;
  nombre: string;
  jugadores: readonly JugadorDePartido[];
  /** La intensidad elegida antes del partido (los demás equipos, normal). */
  intensidad?: Intensidad;
}

/** Los cambios (dato por categoría y nivel, `MOTOR_PARTIDOS.md` §6): cuántos, en qué tramos (después de ese tramo) y si son volantes (se puede volver a entrar). */
export interface ReglaDeCambios {
  maximo: number;
  /** Después de qué tramos (1 a 5) se puede cambiar; el descanso es después del 3.º. */
  despuesDeTramos: readonly number[];
  volantes?: boolean;
}

/**
 * Cómo se piden las lesiones al motor (solo cuando están activas): el perfil de riesgo de cada jugador de `salud.ts`, que se calcula **una vez por jugador y partido**; y, para el tipo y la gravedad, los datos que el
 * motor entrega a `sortearLesion` (constitución, salud y perks de la persona).
 */
export interface RiesgoDeLesionDelPartido {
  perfil: (jugadorId: string) => PerfilDeRiesgo | undefined;
  persona: (jugadorId: string) => Pick<PersonaDeRiesgo, 'constitucion' | 'salud' | 'perks'>;
}

export interface OpcionesDePartido {
  /** Un texto único del partido (liga, jornada, local y visitante) y la semilla de la partida: con ellos el azar es siempre el mismo. */
  id: string;
  semilla: number;
  categoria: string;
  cambios?: ReglaDeCambios;
  /**
   * El nivel de detalle (`DECISIONES.md`, 24/11): el 1 es el de los partidos del personaje y los que ve (su registro se guarda dos temporadas); el 2, el de los de su zona (solo se guardan el resultado y las estadísticas
   * de cada jugador). El motor es el mismo; el nivel lo usa quien guarda. Por defecto, 2.
   */
  nivel?: 1 | 2;
  /** Las lesiones: solo se preguntan si están activas (`PARAMETROS_DE_PARTIDO.lesiones.activas`) y se da esto. */
  lesiones?: RiesgoDeLesionDelPartido;
}

export interface EstadisticasDeJugador {
  minutos: number;
  goles: number;
  asistencias: number;
  tiros: number;
  /** Tiros que fueron a puerta (los goles también). */
  alPuerta: number;
  /** Suma de la calidad (xG) de sus tiros. */
  xg: number;
  paradas: number;
  golesEncajados: number;
  faltas: number;
  faltasRecibidas: number;
  amarillas: number;
  roja: boolean;
  /** Pases intentados y completados. */
  pases: number;
  pasesOk: number;
  nota: number;
  puesto: string;
  titular: boolean;
  /** El cansancio con que acaba (0 a 100) si ha jugado: el personaje pierde de energía una parte de él. */
  cansancio?: number;
}

/** Una lesión que ocurre en el partido (solo con las lesiones activas): quién, cuándo y qué (`sortearLesion`). */
export interface LesionDelPartido {
  jugador: string;
  equipo: 0 | 1;
  minuto: number;
  lesion: { t: string; z: string; d: number; n: number };
}

export interface ResultadoDePartido {
  /** [local, visitante]. */
  goles: [number, number];
  /** Los goles y la posesión de cada tramo (la posesión es la parte del local). */
  porTramo: { goles: [number, number]; posesion: [number, number] }[];
  /** Tiros de cada equipo (también los de balón parado y los penaltis), tiros a puerta, calidad de sus ocasiones (xG), faltas, amarillas, rojas, córners y pases. */
  tiros: [number, number];
  alPuerta: [number, number];
  xg: [number, number];
  faltas: [number, number];
  amarillas: [number, number];
  rojas: [number, number];
  corners: [number, number];
  pases: [number, number];
  pasesOk: [number, number];
  jugadores: Record<string, EstadisticasDeJugador>;
  /** Los ids de los convocados de cada equipo ([local, visitante]). */
  alineaciones: [string[], string[]];
  /** Los goles, en orden: tramo, equipo (0 local, 1 visitante), goleador y asistente. */
  jugadas: { tramo: number; equipo: 0 | 1; goleador: string; asistente?: string; tipo: 'juego' | 'balon_parado' }[];
  /** **El registro del partido**: lo que pasó, en orden y con su minuto. De él salen la crónica y las estadísticas. */
  registro: SucesoDePartido[];
  /** La crónica del partido: una **vista derivada del registro** (`vistaDeCronica`), sin minutos y solo con lo que cuenta el relato. */
  cronica: MomentoDeCronica[];
  /** Las lesiones del partido (vacío con las lesiones desactivadas). */
  lesiones: LesionDelPartido[];
  nivel: 1 | 2;
}

// ---------------------------------------------------------------------------------------------------- lo que vale cada jugador en el partido

const SENSIBILIDAD: Readonly<Record<string, number>> = { 'futbol.vision': 1, 'futbol.posicionamiento': 1, 'futbol.decisiones': 1, 'futbol.juego_colectivo': 1, 'futbol.control': 0.3, 'futbol.pase': 0.5, 'futbol.regate': 0.3, 'futbol.tecnica': 0.3 };
const GRUPO_DE_STAT = new Map(STATS_DE_FUTBOL.map((d) => [d.id, (d.group ?? '').toLowerCase()]));
/** Las capacidades que apoyan cada habilidad (las secundarias del addon que son capacidades, con su peso: la primera pesa más). */
const APOYOS = new Map<string, { stat: string; weight: number }[]>([
  ...DEFINICIONES_DEL_ADDON.map((d) => [`futbol.${d.key}`, apoyosDe(d).filter((a) => a.stat.startsWith('gen.'))] as const),
  ['futbol.juego_colectivo', [GEN.cooperacion, GEN.comunicacion, GEN.autoridad].map((stat, i) => ({ stat, weight: [0.4, 0.3, 0.2][i] }))],
]);
const sensibilidadDe = (stat: string): number => SENSIBILIDAD[stat] ?? (GRUPO_DE_STAT.get(stat)?.includes('ment') ? 1 : GRUPO_DE_STAT.get(stat)?.includes('f') && !GRUPO_DE_STAT.get(stat)?.includes('t') ? 0 : 0.3);

/**
 * Lo que vale el jugador en una habilidad **en el partido**: lo entrenado, con el efecto del conocimiento del fútbol (lo táctico del todo, lo técnico a medias, lo físico nada), por el potenciador de la
 * categoría y por el factor de sus capacidades de apoyo frente a lo típico de un adulto (de ×0,6 a ×1,2, pesando más la primera). Las capacidades también llevan el potenciador (§3 ter, punto 5).
 */
export function valorEnPartido(lector: LectorDePersona, stat: string, potenciador: number): number {
  if (stat.startsWith('gen.')) return lector.stat(stat) * potenciador;
  const entrenado = valorEfectivo(lector, 'futbol', stat, sensibilidadDe(stat));
  const apoyos = APOYOS.get(stat) ?? [];
  const peso = apoyos.reduce((t, a) => t + a.weight, 0);
  const apoyo = peso > 0 ? (apoyos.reduce((t, a) => t + a.weight * lector.stat(a.stat), 0) / peso) * potenciador : PARAMETROS_DE_PARTIDO.capacidadTipicaDeAdulto;
  const factor = Math.min(1.2, Math.max(0.6, apoyo / PARAMETROS_DE_PARTIDO.capacidadTipicaDeAdulto));
  return entrenado * potenciador * factor;
}

/** Cuánto aporta cada puesto a cada zona (suma 1 por puesto): la parte de lo que pesa en el puesto (`PUESTOS_DE_FUTBOL`) que cae en las habilidades de la zona. */
export const PARTICIPACION_DEL_PUESTO: Readonly<Record<string, Readonly<Record<Zona, number>>>> = Object.fromEntries(
  PUESTOS_DE_FUTBOL.puestos.map((p) => {
    const por = Object.fromEntries(ZONAS.map((z) => [z, Object.entries(p.pesos).reduce((t, [stat, peso]) => t + (HABILIDADES_DE_LA_ZONA[z].includes(stat) ? peso : 0), 0)])) as Record<Zona, number>;
    const total = ZONAS.reduce((t, z) => t + por[z], 0) || 1;
    return [p.id, Object.fromEntries(ZONAS.map((z) => [z, por[z] / total])) as Record<Zona, number>];
  }),
);

const media = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Lo que rinde un jugador con el cansancio que lleva (tabla del addon) y la intensidad a la que juega. */
export function rendimientoPorCansancio(cansancio: number, intensidad: Intensidad): number {
  const frescura = 100 - cansancio;
  const tabla = PARAMETROS_DE_PARTIDO.frescura;
  let f = tabla[tabla.length - 1].rinde;
  for (const t of tabla) {
    if (frescura >= t.desde) {
      f = t.rinde;
      break;
    }
  }
  return f * PARAMETROS_DE_PARTIDO.intensidades[intensidad].rinde;
}

/** Lo que sube el cansancio de un jugador en un tramo: según su resistencia (frente a lo típico de su edad), la energía con que empezó y la intensidad. */
export function cansancioDelTramo(j: JugadorDePartido, intensidad: Intensidad): number {
  const resistencia = j.lector.norm('gen.resistencia');
  return PARAMETROS_DE_PARTIDO.cansancioPorTramo * PARAMETROS_DE_PARTIDO.intensidades[intensidad].cansancio * (1.5 - resistencia) * (1 + (100 - (j.energia ?? 100)) / 100);
}


/** Las habilidades que usa el motor a título individual (tirador, portero, faltas, pases, penaltis…), además de las de cada zona. */
const HABILIDADES_INDIVIDUALES = ['definicion', 'disparo_lejano', 'cabeza', 'faltas', 'corners', 'penaltis', 'pase', 'regate', 'entrada', 'reflejos'] as const;

/** Lo que vale un jugador en el partido antes de su estado del día (`rinde`): las cuatro zonas y sus habilidades. Solo depende de su lector y del potenciador. */
interface ValoresBase {
  zona: Record<Zona, number>;
  h: Record<string, number>;
}

/**
 * **Caché de la fuerza por jugador** (P0): los valores base se guardan por lector y potenciador cuando el lector es `inmutable` (una foto: sus stats no cambian mientras exista el objeto; `lectorDeUnNpc` lo marca
 * y a su vez devuelve el mismo objeto mientras no cambie nada de lo que lo forma). El resultado es **exactamente** el mismo que recalculándolo; el estado del día (`rinde`) se multiplica después, fuera de la caché.
 */
const CACHE_DE_VALORES = new WeakMap<LectorDePersona, Map<number, ValoresBase>>();
export const DIAGNOSTICO_DE_CACHE = { activa: true, aciertos: 0, fallos: 0 };

function valoresBase(lector: LectorDePersona, potenciador: number): ValoresBase {
  const guardable = DIAGNOSTICO_DE_CACHE.activa && lector.inmutable === true;
  if (guardable) {
    const guardado = CACHE_DE_VALORES.get(lector)?.get(potenciador);
    if (guardado) {
      DIAGNOSTICO_DE_CACHE.aciertos++;
      return guardado;
    }
  }
  DIAGNOSTICO_DE_CACHE.fallos++;
  const v = new Map<string, number>();
  const val = (stat: string): number => v.get(stat) ?? (v.set(stat, valorEnPartido(lector, stat, potenciador)), v.get(stat)!);
  const zona = Object.fromEntries(ZONAS.map((z) => [z, media(HABILIDADES_DE_LA_ZONA[z].map(val))])) as Record<Zona, number>;
  const base: ValoresBase = { zona, h: Object.fromEntries(HABILIDADES_INDIVIDUALES.map((k) => [k, val(`futbol.${k}`)])) };
  if (guardable) {
    const porPotenciador = CACHE_DE_VALORES.get(lector) ?? CACHE_DE_VALORES.set(lector, new Map()).get(lector)!;
    porPotenciador.set(potenciador, base);
  }
  return base;
}

const mejorQue = (a: number, b: number, potencia: number): number => {
  if (potencia === 1) {
    const u = Math.max(a, 1e-6);
    return u / (u + Math.max(b, 1e-6));
  }
  const x = Math.pow(Math.max(a, 1e-6), potencia);
  return x / (x + Math.pow(Math.max(b, 1e-6), potencia));
};

/** Sortea entre los de campo con pesos (la probabilidad es proporcional al peso). */
function sortear<T>(rng: Rng, xs: readonly T[], peso: (x: T) => number): T | undefined {
  const total = xs.reduce((t, x) => t + Math.max(0, peso(x)), 0);
  if (total <= 0) return undefined;
  let r = rng.next() * total;
  for (const x of xs) {
    r -= Math.max(0, peso(x));
    if (r <= 0) return x;
  }
  return xs[xs.length - 1];
}

const GRUPOS_POR_PUESTO = new Map<string, string>(PUESTOS_DE_FUTBOL.reparto.flatMap((g) => g.puestos.map((p) => [p, g.grupo] as const)));
const GRUPO_DE_PUESTO = (puesto: string): string => GRUPOS_POR_PUESTO.get(puesto) ?? puesto;

// ---------------------------------------------------------------------------------------------------- el partido

// ---------------------------------------------------------------------------------------------------- el estado del partido (JSON)

/** Lo que cambia de un jugador durante el partido (todo números, textos y booleanos: JSON puro). */
export interface EstadoDeJugadorEnPartido {
  id: string;
  /** El puesto en que juega ahora (el que sale por un cambio deja su puesto al que entra). */
  puesto: string;
  titular: boolean;
  enCampo: boolean;
  expulsado: boolean;
  lesionado: boolean;
  cans: number;
  minutos: number;
  amarillas: number;
  goles: number;
  asistencias: number;
  tiros: number;
  alPuerta: number;
  xg: number;
  paradas: number;
  golesEncajados: number;
  faltas: number;
  faltasRecibidas: number;
  pases: number;
  pasesOk: number;
}

/** Un partido en marcha: se puede guardar como JSON, parar en cualquier minuto y seguir (los equipos, con sus lectores, se vuelven a dar al seguir). */
export interface EstadoDePartido {
  version: 1;
  id: string;
  semilla: number;
  categoria: string;
  nivel: 1 | 2;
  /** La regla de cambios con que se juega (dato por categoría y nivel). */
  cambiosRegla?: ReglaDeCambios;
  /** Minutos ya jugados (0 a 90): el siguiente que se juega. */
  minuto: number;
  /** Para cada equipo, en el orden de `EquipoDePartido.jugadores`. */
  jugadores: [EstadoDeJugadorEnPartido[], EstadoDeJugadorEnPartido[]];
  cambios: [number, number];
  goles: [number, number];
  posesiones: [number, number];
  tiros: [number, number];
  alPuerta: [number, number];
  xg: [number, number];
  faltas: [number, number];
  amarillas: [number, number];
  rojas: [number, number];
  corners: [number, number];
  /** Por tramo: goles y posesiones de cada equipo. */
  porTramo: { goles: [number, number]; posesiones: [number, number] }[];
  jugadas: ResultadoDePartido['jugadas'];
  registro: SucesoDePartido[];
  lesiones: LesionDelPartido[];
}

export const crearPartido = (local: EquipoDePartido, visitante: EquipoDePartido, o: OpcionesDePartido): EstadoDePartido => {
  const P = PARAMETROS_DE_PARTIDO;
  const de = (e: EquipoDePartido): EstadoDeJugadorEnPartido[] =>
    e.jugadores.map((j) => ({ id: j.id, puesto: j.puesto, titular: j.titular, enCampo: j.titular, expulsado: false, lesionado: false, cans: 0, minutos: 0, amarillas: 0, goles: 0, asistencias: 0, tiros: 0, alPuerta: 0, xg: 0, paradas: 0, golesEncajados: 0, faltas: 0, faltasRecibidas: 0, pases: 0, pasesOk: 0 }));
  return {
    version: 1, id: o.id, semilla: o.semilla, categoria: o.categoria, nivel: o.nivel ?? 2, ...(o.cambios ? { cambiosRegla: o.cambios } : {}), minuto: 0,
    jugadores: [de(local), de(visitante)], cambios: [0, 0], goles: [0, 0], posesiones: [0, 0], tiros: [0, 0], alPuerta: [0, 0], xg: [0, 0], faltas: [0, 0], amarillas: [0, 0], rojas: [0, 0], corners: [0, 0],
    porTramo: Array.from({ length: P.tramos }, () => ({ goles: [0, 0] as [number, number], posesiones: [0, 0] as [number, number] })),
    jugadas: [], registro: [], lesiones: [],
  };
};

// ---------------------------------------------------------------------------------------------------- el partido en marcha

type Linea = 'GK' | 'DEF' | 'MID' | 'ATT';
const LINEA = (puesto: string): Linea => {
  const g = GRUPO_DE_PUESTO(puesto);
  return g === 'portero' ? 'GK' : g === 'central' || g === 'lateral' ? 'DEF' : g === 'delantero' || g === 'banda' ? 'ATT' : 'MID';
};

/** Quién tira, por puesto (el delantero centro más que el central): lo que pesa en el sorteo del tirador, de cabeza y en un córner. */
const PESO_DE_TIRADOR: Readonly<Record<string, number>> = { ST: 3, LST: 2.6, RST: 2.6, LW: 2, RW: 2, CAM: 2.2, LM: 1.7, RM: 1.7, CM: 1.8, LCR: 1.8, RCR: 1.8, CDM: 0.9, LB: 0.18, RB: 0.18, CB: 0.08, GK: 0 };
const PESO_DE_REMATADOR_EN_CORNER: Readonly<Record<string, number>> = { ST: 2.4, LST: 2.2, RST: 2.2, LW: 1.2, RW: 1.2, CAM: 1.2, LM: 0.9, RM: 0.9, CM: 1.3, LCR: 1.3, RCR: 1.3, CDM: 1, LB: 0.25, RB: 0.25, CB: 0.6, GK: 0 };
/** Quién crea (da el pase del gol y los pases en general) y quién comete faltas, por línea. */
const PESO_DE_PASE: Readonly<Record<Linea, number>> = { GK: 0.4, DEF: 1, MID: 1.7, ATT: 0.9 };
const PESO_DE_FALTA: Readonly<Record<Linea, number>> = { GK: 0.03, DEF: 1, MID: 1.1, ATT: 0.55 };
const PESO_DE_VICTIMA: Readonly<Record<Linea, number>> = { GK: 0, DEF: 0.5, MID: 1, ATT: 1.5 };

interface Jug {
  e: EstadoDeJugadorEnPartido;
  j: JugadorDePartido;
  /** El estado del día (forma y salud). */
  r: number;
  /** Lo que vale en cada zona, ya con el estado del día. */
  zona: Record<Zona, number>;
  /** Sus habilidades en el partido (sin el estado del día: se multiplica al usarlas). */
  h: Record<string, number>;
  linea: Linea;
  /** Cuánto rinde ahora por su cansancio y su intensidad (se calcula al empezar cada minuto). */
  rm: number;
  /** Raíz de su pase en el partido (para el peso de los pases). */
  sqrtPase: number;
  /** Cuánto se cansa por minuto (su resistencia, la energía con que llegó y su intensidad no cambian durante el partido). */
  cpm: number;
}
interface Lado {
  equipo: EquipoDePartido;
  intensidad: Intensidad;
  todos: Jug[];
  campo: Jug[];
  /** La tabla de pesos de los pases (se rehace cuando cambia quién está en el campo). */
  pases?: Tabla;
}

const rindeAhora = (e: EstadoDeJugadorEnPartido, intensidad: Intensidad): number => rendimientoPorCansancio(e.cans, intensidad);

function armar(estado: EstadoDePartido, equipos: readonly [EquipoDePartido, EquipoDePartido]): [Lado, Lado] {
  const potenciador = POTENCIADOR_POR_CATEGORIA[estado.categoria] ?? 1;
  const lado = (i: 0 | 1): Lado => {
    const eq = equipos[i];
    const todos = eq.jugadores.map((j, k): Jug => {
      const b = valoresBase(j.lector, potenciador);
      const r = j.rinde ?? 1;
      const e = estado.jugadores[i][k];
      return { e, j, r, zona: Object.fromEntries(ZONAS.map((z) => [z, b.zona[z] * r])) as Record<Zona, number>, h: b.h, linea: LINEA(e.puesto), rm: 1, sqrtPase: Math.sqrt(Math.max(b.h.pase * r, 1e-6)), cpm: cansancioDelTramo(j, j.intensidad ?? eq.intensidad ?? 'normal') / PARAMETROS_DE_PARTIDO.minutosPorTramo };
    });
    return { equipo: eq, intensidad: eq.intensidad ?? 'normal', todos, campo: todos.filter((x) => x.e.enCampo && !x.e.expulsado && !x.e.lesionado) };
  };
  return [lado(0), lado(1)];
}

const intensidadDe = (l: Lado, x: Jug): Intensidad => x.j.intensidad ?? l.intensidad;

/** Cuánto se comete falta en este equipo ahora, por la intensidad de los que están en el campo (la media de sus factores). */
function faltasDelEquipo(l: Lado): number {
  let t = 0;
  for (const x of l.campo) t += PARAMETROS_DE_PARTIDO.intensidades[intensidadDe(l, x)].faltas;
  return l.campo.length ? t / l.campo.length : 1;
}

/** Lo que vale el equipo en cada zona este minuto: la media de lo que valen los que están en el campo en esa zona, ponderada por lo que su puesto aporta a ella y por lo cansados que están; con diez, ×10/11. Una sola pasada. */
function fuerzasDe(lado: Lado, casa: number): Fuerzas {
  let sp = 0, sd = 0, sc = 0, sa = 0, wp = 0, wd = 0, wc = 0, wa = 0;
  for (const x of lado.campo) {
    const p = PARTICIPACION_DEL_PUESTO[x.e.puesto];
    if (!p) continue;
    const rm = x.rm;
    sp += p.porteria * x.zona.porteria * rm; wp += p.porteria;
    sd += p.defensa * x.zona.defensa * rm; wd += p.defensa;
    sc += p.creacion * x.zona.creacion * rm; wc += p.creacion;
    sa += p.ataque * x.zona.ataque * rm; wa += p.ataque;
  }
  const k = (1 + casa) * Math.min(1, lado.campo.length / 11);
  return { porteria: wp > 0 ? (sp / wp) * k : 0, defensa: wd > 0 ? (sd / wd) * k : 0, creacion: wc > 0 ? (sc / wc) * k : 0, ataque: wa > 0 ? (sa / wa) * k : 0 };
}

interface Fuerzas {
  porteria: number;
  defensa: number;
  creacion: number;
  ataque: number;
}

const redondea = (x: number, d: number): number => Math.round(x * 10 ** d) / 10 ** d;

/** Sortea con pesos entre los que están en el campo. */
function elegir<T>(rng: Rng, xs: readonly T[], peso: (x: T) => number): T | undefined {
  return sortear(rng, xs, peso);
}

/** Una tabla de pesos ya sumados para sortear muchas veces entre los mismos (los pases de un minuto). */
interface Tabla {
  xs: Jug[];
  acum: number[];
}
const tabla = (xs: Jug[], peso: (x: Jug) => number): Tabla => {
  let t = 0;
  return { xs, acum: xs.map((x) => (t += Math.max(0, peso(x)))) };
};
const sacar = (rng: Rng, t: Tabla): Jug | undefined => {
  const total = t.acum[t.acum.length - 1];
  if (!(total > 0)) return undefined;
  const r = rng.next() * total;
  for (let k = 0; k < t.acum.length; k++) if (r < t.acum[k]) return t.xs[k];
  return t.xs[t.xs.length - 1];
};

const minutosDelPartido = (): number => PARAMETROS_DE_PARTIDO.tramos * PARAMETROS_DE_PARTIDO.minutosPorTramo;

/**
 * Juega los minutos que faltan hasta `hasta` (como mucho 90). Cambia el estado que se le da (es el propio estado del partido, que siempre queda guardable como JSON); los equipos, con los lectores de sus jugadores,
 * tienen que ser los mismos con que se creó. El azar de cada minuto es solo de ese minuto: partir el partido en trozos da exactamente el mismo partido que jugarlo de una vez.
 */
export function avanzarPartido(estado: EstadoDePartido, local: EquipoDePartido, visitante: EquipoDePartido, hasta: number = minutosDelPartido(), extra: { lesiones?: RiesgoDeLesionDelPartido } = {}): EstadoDePartido {
  const P = PARAMETROS_DE_PARTIDO;
  const total = minutosDelPartido();
  const fin = Math.min(total, hasta);
  const azar = flujosDelPartido(estado.semilla, estado.id);
  const lados = armar(estado, [local, visitante]);
  const regla = estado.cambiosRegla;
  const reconstruirCampo = (l: Lado): void => {
    l.campo = l.todos.filter((x) => x.e.enCampo && !x.e.expulsado && !x.e.lesionado);
    l.pases = undefined;
  };
  const perfiles = P.lesiones.activas && extra.lesiones ? new Map<string, PerfilDeRiesgo | undefined>() : undefined;

  // Lo que cambia de un minuto a otro; los cierres de abajo lo leen (así no se crean de nuevo cada minuto).
  let minuto = 0;
  let tramo = 0;
  let rng: Rng = azar.de('resultado');
  let fz: [Fuerzas, Fuerzas] = [{ porteria: 0, defensa: 0, creacion: 0, ataque: 0 }, { porteria: 0, defensa: 0, creacion: 0, ataque: 0 }];
  const huboFalta = new Set<string>();
  const suceso = (s: Omit<SucesoDePartido, 'minuto' | 'tramo'>): void => void estado.registro.push({ minuto, tramo, ...s });
  // ---- lo que pasa en un tiro (de juego, de cabeza, lejano, tras un córner, tiro libre): bloqueado, fuera, a puerta, parada o gol.
  const tirar = (i: 0 | 1, origen: 'juego' | 'cabeza' | 'lejano' | 'corner' | 'libre', tirador: Jug, xg: number, lanzador?: Jug, asistente?: Jug): void => {
    const A = lados[i];
    const D = lados[1 - i];
    const hab = origen === 'lejano' ? tirador.h.disparo_lejano : origen === 'cabeza' || origen === 'corner' ? tirador.h.cabeza : origen === 'libre' ? tirador.h.faltas : tirador.h.definicion;
    const valorTiro = hab * tirador.r * tirador.rm;
    const portero = D.campo.find((x) => x.linea === 'GK');
    estado.tiros[i]++;
    estado.xg[i] += xg;
    tirador.e.tiros++;
    tirador.e.xg += xg;
    const xgRegistrado = redondea(xg, 3);
    if (rng.chance(P.bloqueado)) {
      suceso({ equipo: i, tipo: 'tiro_bloqueado', jugador: tirador.e.id, xg: xgRegistrado });
      if (rng.chance(P.cornerDeBloqueo)) corner(i);
      return;
    }
    if (rng.chance(P.fuera)) {
      suceso({ equipo: i, tipo: 'tiro_fuera', jugador: tirador.e.id, xg: xgRegistrado });
      return;
    }
    estado.alPuerta[i]++;
    tirador.e.alPuerta++;
    const valorPortero = portero ? portero.zona.porteria * portero.rm : 1;
    const dePuerta = (1 - P.bloqueado) * (1 - P.fuera);
    if (rng.chance(Math.min(0.95, (xg / dePuerta) * 2 * mejorQue(valorTiro, valorPortero, P.potenciaDelGol)))) {
      anotar(i, origen === 'corner' || origen === 'libre' ? 'balon_parado' : 'juego', tirador, xgRegistrado, asistente, lanzador);
      return;
    }
    if (portero) portero.e.paradas++;
    if (origen === 'corner' || origen === 'libre') suceso({ equipo: i, tipo: 'balon_parado', jugador: (lanzador ?? tirador).e.id, gol: false, ...(portero ? { portero: portero.e.id } : {}), xg: xgRegistrado });
    else suceso({ equipo: i, tipo: 'ocasion', jugador: tirador.e.id, ...(portero ? { portero: portero.e.id } : {}), xg: xgRegistrado });
    if (rng.chance(P.cornerDeParada)) corner(i);
  };

  const anotar = (i: 0 | 1, tipo: 'juego' | 'balon_parado', goleador: Jug, xg: number, asistente?: Jug, lanzador?: Jug, penalti = false): void => {
    const D = lados[1 - i];
    estado.goles[i]++;
    estado.porTramo[tramo].goles[i]++;
    goleador.e.goles++;
    if (asistente) asistente.e.asistencias++;
    const quien = asistente ?? (tipo === 'balon_parado' && lanzador && lanzador !== goleador ? lanzador : undefined);
    estado.jugadas.push({ tramo, equipo: i, goleador: goleador.e.id, ...(quien ? { asistente: quien.e.id } : {}), tipo });
    for (const x of D.campo) x.e.golesEncajados++;
    const portero = D.campo.find((x) => x.linea === 'GK');
    suceso({ equipo: i, tipo: 'gol', jugador: goleador.e.id, ...(quien ? { otro: quien.e.id } : {}), ...(portero ? { portero: portero.e.id } : {}), ...(tipo === 'balon_parado' ? { gol: true } : {}), ...(penalti ? { penalti: true } : {}), xg });
  };

  // ---- un córner: lo saca el que mejor los saca y lo remata el que más pesa de cabeza.
  const corner = (i: 0 | 1): void => {
    const A = lados[i];
    const lanzador = A.campo.filter((x) => x.linea !== 'GK').reduce<Jug | undefined>((m, x) => (!m || x.h.corners * x.r > m.h.corners * m.r ? x : m), undefined);
    if (!lanzador) return;
    estado.corners[i]++;
    suceso({ equipo: i, tipo: 'corner', jugador: lanzador.e.id });
    if (!rng.chance(P.remateDeCorner)) return;
    const rematador = elegir(rng, A.campo.filter((x) => x !== lanzador && x.linea !== 'GK'), (x) => (PESO_DE_REMATADOR_EN_CORNER[x.e.puesto] ?? 1) * Math.pow(Math.max(x.h.cabeza * x.r, 1e-6), 1.5));
    if (!rematador) return;
    const q = mejorQue(fz[i].ataque, fz[1 - i].defensa, 1);
    tirar(i, 'corner', rematador, Math.min(0.85, P.xgDeCorner * Math.exp((rng.next() + rng.next() + rng.next() - 1.5) * P.ruidoDelXg) * (0.4 + 1.2 * q) * (0.7 + 0.6 * mejorQue(lanzador.h.corners * lanzador.r, 25, 1))), lanzador);
  };

  // ---- un penalti.
  const penalti = (i: 0 | 1): void => {
    const A = lados[i];
    const D = lados[1 - i];
    const tirador = A.campo.filter((x) => x.linea !== 'GK').reduce<Jug | undefined>((m, x) => (!m || x.h.penaltis * x.r > m.h.penaltis * m.r ? x : m), undefined);
    if (!tirador) return;
    const portero = D.campo.find((x) => x.linea === 'GK');
    estado.tiros[i]++;
    estado.alPuerta[i]++;
    estado.xg[i] += P.xgDePenalti;
    tirador.e.tiros++;
    tirador.e.alPuerta++;
    tirador.e.xg += P.xgDePenalti;
    const valorPortero = portero ? portero.h.reflejos * portero.r * portero.rm : 1;
    if (rng.chance(Math.min(0.95, P.golDePenalti * 2 * mejorQue(tirador.h.penaltis * tirador.r * tirador.rm, valorPortero, P.potenciaDelGol)))) anotar(i, 'balon_parado', tirador, P.xgDePenalti, undefined, undefined, true);
    else {
      if (portero) portero.e.paradas++;
      suceso({ equipo: i, tipo: 'penalti', jugador: tirador.e.id, gol: false, ...(portero ? { portero: portero.e.id } : {}), xg: P.xgDePenalti });
    }
  };

  // ---- una expulsión.
  const expulsar = (infractor: Jug, i: 0 | 1, doble: boolean): void => {
    infractor.e.expulsado = true;
    infractor.e.enCampo = false;
    reconstruirCampo(lados[i]);
    estado.rojas[i]++;
    suceso({ equipo: i, tipo: 'roja', jugador: infractor.e.id, dobleAmarilla: doble });
  };

  // ---- una falta del equipo que defiende (`i` ataca): quién la comete, a quién, tarjetas y lo que viene después (penalti, tiro libre).
  const falta = (i: 0 | 1): void => {
    const A = lados[i];
    const D = lados[1 - i];
    // Quien ya tiene una amarilla se cuida (comete menos faltas): así las dobles amarillas son raras, como en un partido de verdad.
    const infractor = elegir(rng, D.campo, (x) => PESO_DE_FALTA[x.linea] * (x.e.amarillas > 0 ? 0.25 : 1) * (1.5 - (x.h.entrada * x.r) / (x.h.entrada * x.r + 40)));
    const victima = elegir(rng, A.campo, (x) => PESO_DE_VICTIMA[x.linea] * (x.h.regate * x.r + 10));
    if (!infractor || !victima) return;
    infractor.e.faltas++;
    victima.e.faltasRecibidas++;
    estado.faltas[1 - i]++;
    huboFalta.add(infractor.e.id);
    huboFalta.add(victima.e.id);
    suceso({ equipo: (1 - i) as 0 | 1, tipo: 'falta', jugador: infractor.e.id, otro: victima.e.id });
    if (rng.chance(P.amarilla)) {
      infractor.e.amarillas++;
      estado.amarillas[1 - i]++;
      suceso({ equipo: (1 - i) as 0 | 1, tipo: 'amarilla', jugador: infractor.e.id, otro: victima.e.id });
      if (infractor.e.amarillas >= 2) expulsar(infractor, (1 - i) as 0 | 1, true);
    } else if (rng.chance(P.rojaDirecta)) expulsar(infractor, (1 - i) as 0 | 1, false);
    if (rng.chance(P.penaltiPorFalta)) penalti(i);
    else if (rng.chance(P.tiroLibrePorFalta)) {
      const lanzador = A.campo.filter((x) => x.linea !== 'GK').reduce<Jug | undefined>((m, x) => (!m || x.h.faltas * x.r > m.h.faltas * m.r ? x : m), undefined);
      if (lanzador) tirar(i, 'libre', lanzador, P.xgDeTiroLibre * Math.exp((rng.next() + rng.next() + rng.next() - 1.5) * P.ruidoDelXg) * (0.5 + mejorQue(lanzador.h.faltas * lanzador.r, 25, 1)), lanzador);
    }
  };

  while (estado.minuto < fin) {
    minuto = estado.minuto;
    tramo = Math.floor(minuto / P.minutosPorTramo);
    rng = azar.deMinuto('resultado', minuto);
    huboFalta.clear();

    // Los cambios, al empezar un tramo (el descanso, después del tercero).
    if (minuto > 0 && minuto % P.minutosPorTramo === 0 && regla?.despuesDeTramos.includes(tramo)) for (const i of [0, 1] as const) hacerCambios(estado, lados[i], i, regla, suceso);

    // Cómo está cada equipo este minuto: lo que rinde cada uno por su cansancio y el valor de cada zona.
    for (const l of lados) for (const x of l.campo) x.rm = rendimientoPorCansancio(x.e.cans, intensidadDe(l, x));
    fz = [fuerzasDe(lados[0], P.ventajaDeCasa), fuerzasDe(lados[1], 0)];
    const poseedor = mejorQue(fz[0].creacion, fz[1].creacion, 2);
    const faltasDe: [number, number] = [faltasDelEquipo(lados[0]), faltasDelEquipo(lados[1])];
    const apertura = 1 + P.apertura * (minuto / total - 0.5);
    const pases = lados.map((l) => (l.pases ??= tabla(l.campo, (x) => PESO_DE_PASE[x.linea] * x.sqrtPase))) as [Tabla, Tabla];

    // ---- las posesiones del minuto.
    const n = Math.floor(P.posesionesPorMinuto) + (rng.chance(P.posesionesPorMinuto - Math.floor(P.posesionesPorMinuto)) ? 1 : 0);
    for (let k = 0; k < n; k++) {
      const i: 0 | 1 = rng.chance(poseedor) ? 0 : 1;
      const A = lados[i];
      const fa = fz[i];
      const fd = fz[1 - i];
      estado.posesiones[i]++;
      estado.porTramo[tramo].posesiones[i]++;
      // Los pases de la posesión: cada uno lo da quien más crea y sale bien o mal según su pase frente a la defensa rival.
      const nPases = Math.max(1, Math.round(P.pasesPorPosesion + (rng.next() + rng.next() - 1) * 3));
      for (let p = 0; p < nPases; p++) {
        const pasador = sacar(rng, pases[i]);
        if (!pasador) break;
        pasador.e.pases++;
        if (rng.chance(Math.min(0.97, Math.max(0.3, 1.75 * mejorQue(pasador.h.pase * pasador.r * pasador.rm, fd.defensa, 1))))) pasador.e.pasesOk++;
      }
      // ¿Falta del que defiende?
      if (rng.chance(Math.min(0.5, (P.faltasPorMinuto / P.posesionesPorMinuto) * faltasDe[1 - i]))) {
        falta(i);
        continue;
      }
      // Avanzar hasta el último tercio: el poder del ataque frente a la defensa rival, por una parte de dificultad fija; el partido se abre y el que pierde arriesga más.
      const poder = 0.4 * fa.creacion + 0.6 * fa.ataque;
      const marcador = estado.goles[i] - estado.goles[1 - i];
      const ritmo = apertura * (1 - P.ritmoDelMarcador * Math.max(-2, Math.min(2, marcador)));
      const relativo = mejorQue(poder, fd.defensa, 1);
      const absoluto = poder / (poder + P.dificultadDelAvance);
      const ref = 40 / (40 + P.dificultadDelAvance);
      if (!rng.chance(Math.min(0.9, P.avanceBase * 2 * relativo * (absoluto / ref) * ritmo))) continue;
      // Tiro.
      const q = mejorQue(fa.ataque, fd.defensa, 1);
      if (!rng.chance(Math.min(0.9, P.tiroDelAvance * 2 * q))) {
        if (rng.chance(P.cornerDeAvance)) corner(i);
        continue;
      }
      const u = rng.next();
      const origen = u < P.tiposDeTiro.cabeza ? 'cabeza' : u < P.tiposDeTiro.cabeza + P.tiposDeTiro.lejano ? 'lejano' : 'juego';
      const habilidad = (x: Jug): number => (origen === 'lejano' ? x.h.disparo_lejano : origen === 'cabeza' ? x.h.cabeza : x.h.definicion) * x.r * x.rm;
      const tirador = elegir(rng, A.campo.filter((x) => x.linea !== 'GK'), (x) => (PESO_DE_TIRADOR[x.e.puesto] ?? 1) * Math.pow(Math.max(habilidad(x), 1e-6), 1.5));
      if (!tirador) continue;
      const asistente = origen !== 'lejano' && rng.chance(origen === 'cabeza' ? 0.85 : 0.7) ? elegir(rng, A.campo.filter((x) => x !== tirador && x.linea !== 'GK'), (x) => PESO_DE_PASE[x.linea] * x.h.pase * x.r) : undefined;
      const base = origen === 'cabeza' ? P.xgDeCabeza : origen === 'lejano' ? P.xgDeLejano : P.xgDeJuego;
      tirar(i, origen, tirador, Math.min(0.85, Math.max(0.01, base * Math.exp((rng.next() + rng.next() + rng.next() - 1.5) * P.ruidoDelXg) * (0.4 + 1.2 * q))), undefined, asistente);
    }

    // ---- las lesiones del minuto (solo si están activas): cada jugador en el campo, con su perfil de riesgo y el contacto y el cansancio de este minuto.
    if (perfiles && extra.lesiones) {
      for (const [i, l] of lados.entries()) {
        for (const x of [...l.campo]) {
          if (!perfiles.has(x.e.id)) perfiles.set(x.e.id, extra.lesiones.perfil(x.e.id));
          const perfil = perfiles.get(x.e.id);
          if (!perfil) continue;
          const contacto = huboFalta.has(x.e.id) ? P.lesiones.contactoDeLaFalta : huboFalta.size ? P.lesiones.contactoConFaltaCerca : P.lesiones.contactoNormal;
          const riesgo = riesgoPorExposicion(perfil, { horas: 1 / 60, contacto, cansancio: x.e.cans, intensidad: intensidadDe(l, x) });
          const dado = azarDeLesionEnPartido(estado.semilla, estado.id, x.e.id, minuto);
          if (dado.next() >= riesgo.p) continue;
          const lesion = sortearLesion(riesgo, dado.next(), dado.next(), extra.lesiones.persona(x.e.id));
          x.e.lesionado = true;
          x.e.enCampo = false;
          reconstruirCampo(l);
          estado.lesiones.push({ jugador: x.e.id, equipo: i as 0 | 1, minuto, lesion: { t: lesion.t, z: lesion.z, d: lesion.d, n: lesion.n } });
          suceso({ equipo: i as 0 | 1, tipo: 'lesion', jugador: x.e.id, lesion: { t: lesion.t, z: lesion.z, d: lesion.d } });
          // Si quedan cambios, entra un suplente del mismo grupo; si no, el equipo juega con uno menos.
          if (regla && estado.cambios[i] < regla.maximo) {
            const entra = l.todos.filter((b) => !b.e.enCampo && !b.e.expulsado && !b.e.lesionado && b.e.minutos === 0 && GRUPO_DE_PUESTO(b.e.puesto) === GRUPO_DE_PUESTO(x.e.puesto)).sort((a, b) => a.e.cans - b.e.cans)[0];
            if (entra) {
              entra.e.enCampo = true;
              entra.e.puesto = x.e.puesto;
              entra.linea = LINEA(x.e.puesto);
              estado.cambios[i]++;
              reconstruirCampo(l);
              suceso({ equipo: i as 0 | 1, tipo: 'cambio', jugador: entra.e.id, otro: x.e.id });
            }
          }
        }
      }
    }

    // ---- el cansancio y los minutos de los que han jugado este minuto.
    for (const l of lados) {
      for (const x of l.campo) {
        x.e.cans += x.cpm;
        x.e.minutos++;
      }
    }
    estado.minuto++;
  }
  return estado;
}

/** Los cambios de una interrupción: los más cansados salen por un suplente del mismo grupo de puestos, hasta el máximo de la categoría (con cambios volantes, los que salieron pueden volver). */
function hacerCambios(estado: EstadoDePartido, l: Lado, i: 0 | 1, regla: ReglaDeCambios, suceso: (s: Omit<SucesoDePartido, 'minuto' | 'tramo'>) => void): void {
  const candidatos = [...l.campo].filter((x) => x.linea !== 'GK').sort((a, b) => b.e.cans - a.e.cans);
  for (const sale of candidatos) {
    if (!regla.volantes && regla.maximo - estado.cambios[i] <= 0) break;
    if (regla.volantes && estado.cambios[i] >= regla.maximo * 3) break;
    const grupo = GRUPO_DE_PUESTO(sale.e.puesto);
    const entra = l.todos
      .filter((b) => !b.e.enCampo && !b.e.expulsado && !b.e.lesionado && GRUPO_DE_PUESTO(b.e.puesto) === grupo && (regla.volantes || b.e.minutos === 0))
      .sort((a, b) => a.e.cans - b.e.cans)[0];
    if (!entra || entra.e.cans >= sale.e.cans - 10) continue;
    sale.e.enCampo = false;
    entra.e.enCampo = true;
    entra.e.puesto = sale.e.puesto;
    entra.linea = LINEA(sale.e.puesto);
    estado.cambios[i]++;
    suceso({ equipo: i, tipo: 'cambio', jugador: entra.e.id, otro: sale.e.id });
    l.campo = l.todos.filter((x) => x.e.enCampo && !x.e.expulsado && !x.e.lesionado);
    l.pases = undefined;
  }
}

/** El resultado de un partido (acabado o a medias): marcador, estadísticas de cada jugador y de los equipos, el registro, la crónica y las notas. */
export function resultadoDelPartido(estado: EstadoDePartido, local: EquipoDePartido, visitante: EquipoDePartido): ResultadoDePartido {
  const P = PARAMETROS_DE_PARTIDO;
  const lados = armar(estado, [local, visitante]);
  const dif0 = estado.goles[0] - estado.goles[1];
  const jugadores: Record<string, EstadisticasDeJugador> = {};
  for (const [i, l] of lados.entries()) {
    const dif = i === 0 ? dif0 : -dif0;
    for (const x of l.todos) {
      const e = x.e;
      const base = { minutos: e.minutos, goles: e.goles, asistencias: e.asistencias, tiros: e.tiros, alPuerta: e.alPuerta, xg: redondea(e.xg, 2), paradas: e.paradas, golesEncajados: e.golesEncajados, faltas: e.faltas, faltasRecibidas: e.faltasRecibidas, amarillas: e.amarillas, roja: e.expulsado && (e.amarillas >= 2 || estado.registro.some((s) => s.tipo === 'roja' && s.jugador === e.id)), pases: e.pases, pasesOk: e.pasesOk, puesto: e.puesto, titular: e.titular };
      if (e.minutos === 0) {
        jugadores[e.id] = { ...base, nota: 0 };
        continue;
      }
      const parte = e.minutos / (P.tramos * P.minutosPorTramo);
      const grupo = GRUPO_DE_PUESTO(e.puesto);
      // Lo que rinde frente a lo esperado para su puesto: lo que vale en la zona que más pesa en él, frente a la media de los que juegan en esa zona en el partido (los dos equipos).
      const zonaPrincipal = ZONAS.reduce((m, z) => ((PARTICIPACION_DEL_PUESTO[e.puesto]?.[z] ?? 0) > (PARTICIPACION_DEL_PUESTO[e.puesto]?.[m] ?? 0) ? z : m), 'creacion' as Zona);
      const esperado = media(lados.flatMap((y) => y.todos.filter((z) => z.e.puesto === e.puesto || GRUPO_DE_PUESTO(z.e.puesto) === grupo).map((z) => z.zona[zonaPrincipal])));
      const relativo = esperado > 0 ? Math.min(1.2, Math.max(-1, P.pesoDelRendimientoEnLaNota * (x.zona[zonaPrincipal] / esperado - 1))) : 0;
      const sanciones = 0.3 * e.amarillas + (base.roja ? 1.5 : 0);
      let nota = 6 + e.goles + 0.6 * e.asistencias + Math.sign(dif) * 0.3 + relativo - sanciones;
      if (grupo === 'portero') nota += 0.2 * e.paradas - 0.4 * e.golesEncajados;
      else if (grupo === 'central' || grupo === 'lateral') nota -= 0.15 * e.golesEncajados * parte;
      else nota -= 0.05 * e.golesEncajados * parte;
      jugadores[e.id] = { ...base, nota: Math.round(Math.min(10, Math.max(1, 6 + (nota - 6) * (0.4 + 0.6 * parte))) * 10) / 10, cansancio: Math.round(e.cans) };
    }
  }
  const pasesDe = (i: 0 | 1): [number, number] => [lados[i].todos.reduce((t, x) => t + x.e.pases, 0), lados[i].todos.reduce((t, x) => t + x.e.pasesOk, 0)];
  const [pl, pv] = [pasesDe(0), pasesDe(1)];
  const registro = estado.registro;
  return {
    goles: [...estado.goles], porTramo: estado.porTramo.map((t) => ({ goles: [...t.goles] as [number, number], posesion: [t.posesiones[0] / Math.max(1, t.posesiones[0] + t.posesiones[1]), t.posesiones[1] / Math.max(1, t.posesiones[0] + t.posesiones[1])] as [number, number] })),
    tiros: [...estado.tiros], alPuerta: [...estado.alPuerta], xg: [redondea(estado.xg[0], 2), redondea(estado.xg[1], 2)], faltas: [...estado.faltas], amarillas: [...estado.amarillas], rojas: [...estado.rojas], corners: [...estado.corners],
    pases: [pl[0], pv[0]], pasesOk: [pl[1], pv[1]], jugadores, alineaciones: [local.jugadores.map((j) => j.id), visitante.jugadores.map((j) => j.id)], jugadas: estado.jugadas, registro, cronica: vistaDeCronica(registro), lesiones: estado.lesiones, nivel: estado.nivel,
  };
}

/** El partido de una vez: lo crea, lo juega entero y da su resultado. */
export function jugarPartido(local: EquipoDePartido, visitante: EquipoDePartido, o: OpcionesDePartido): ResultadoDePartido {
  const estado = crearPartido(local, visitante, o);
  avanzarPartido(estado, local, visitante, minutosDelPartido(), { lesiones: o.lesiones });
  return resultadoDelPartido(estado, local, visitante);
}

// ---------------------------------------------------------------------------------------------------- la tanda de penaltis

/** Los números de la tanda de penaltis, como datos. */
export const PARAMETROS_DE_PENALTIS = {
  /** Penaltis por equipo antes de pasar a uno a uno. */
  porEquipo: 5,
  /** Probabilidad de marcar con tirador y portero iguales (un penalti se marca casi siempre) y cuánto pesa la comparación entre los dos. */
  golBase: 0.75,
  potencia: 1.2,
  /** Tope de lanzamientos (por si todos fallaran siempre): pasado él, gana el mejor sembrado... aquí, el que lanza primero. */
  maximoDeRondas: 40,
};

export interface Lanzamiento {
  /** 0 (local) o 1 (visitante). */
  equipo: 0 | 1;
  tirador: string;
  portero: string;
  gol: boolean;
}

export interface ResultadoDeTanda {
  /** Goles de la tanda de cada equipo ([local, visitante]). */
  goles: [number, number];
  ganador: 0 | 1;
  lanzamientos: Lanzamiento[];
}

/** Lo que vale un tirador de penaltis: el golpeo del penalti y la compostura (sangre fría), por su estado (forma y salud) y el potenciador de la categoría. */
function valorDePenalti(j: JugadorDePartido, potenciador: number): number {
  return (j.rinde ?? 1) * (0.6 * valorEnPartido(j.lector, 'futbol.penaltis', potenciador) + 0.4 * valorEnPartido(j.lector, 'futbol.sangre_fria', potenciador));
}

/**
 * **La tanda de penaltis** (`MOTOR_PARTIDOS.md` §5, punto 9): cinco por equipo (empieza el local, sin prórroga antes) y, si siguen empatados, uno a uno hasta que uno marque y el otro no. Cada penalti es un duelo entre el que tira y el portero
 * rival, con sus habilidades y su estado: marca con `golBase` si valen lo mismo, más si el tirador vale más que el portero. Tiran los titulares por orden de lo que valen en los penaltis (el portero, el último); si hay que repetir, vuelven a
 * empezar por el primero. El azar es el de la tanda (`rngEstable`), reproducible con la misma semilla.
 */
export function tandaDePenaltis(local: EquipoDePartido, visitante: EquipoDePartido, o: { id: string; semilla: number; categoria: string }): ResultadoDeTanda {
  const P = PARAMETROS_DE_PENALTIS;
  const potenciador = POTENCIADOR_POR_CATEGORIA[o.categoria] ?? 1;
  const rng = rngEstable('penaltis', o.semilla, o.id);
  const equipos = [local, visitante] as const;
  const portero = equipos.map((e) => e.jugadores.find((j) => j.titular && j.puesto === 'GK') ?? e.jugadores.find((j) => j.titular));
  const tiradores = equipos.map((e) => {
    const en = e.jugadores.filter((j) => j.titular);
    const campo = en.filter((j) => j.puesto !== 'GK').sort((a, b) => valorDePenalti(b, potenciador) - valorDePenalti(a, potenciador) || (a.id < b.id ? -1 : 1));
    return [...campo, ...en.filter((j) => j.puesto === 'GK')];
  });
  const goles: [number, number] = [0, 0];
  const lanzamientos: Lanzamiento[] = [];
  const lanza = (i: 0 | 1, n: number): void => {
    const t = tiradores[i][n % tiradores[i].length];
    const p = portero[1 - i];
    const valorPortero = p ? (p.rinde ?? 1) * valorEnPartido(p.lector, 'futbol.reflejos', potenciador) : 1;
    const gol = !!t && rng.chance(Math.min(0.95, P.golBase * 2 * mejorQue(valorDePenalti(t, potenciador), valorPortero, P.potencia)));
    if (gol) goles[i]++;
    lanzamientos.push({ equipo: i, tirador: t?.id ?? '', portero: p?.id ?? '', gol });
  };
  // Los cinco primeros de cada uno (alternando, empieza el local); se acaba antes si uno ya no puede alcanzar al otro.
  for (let n = 0; n < P.porEquipo; n++) {
    for (const i of [0, 1] as const) {
      lanza(i, n);
      const quedan = (k: 0 | 1): number => P.porEquipo - (n + (k <= i ? 1 : 0));
      if (goles[0] + quedan(0) < goles[1] || goles[1] + quedan(1) < goles[0]) return { goles, ganador: goles[0] > goles[1] ? 0 : 1, lanzamientos };
    }
  }
  // Uno a uno: cada ronda tira el local y el visitante; gana quien marca si el otro falla.
  for (let n = P.porEquipo; n < P.porEquipo + P.maximoDeRondas && goles[0] === goles[1]; n++) {
    lanza(0, n);
    lanza(1, n);
  }
  return { goles, ganador: goles[0] === goles[1] ? 0 : goles[0] > goles[1] ? 0 : 1, lanzamientos };
}

