/**
 * EL MOTOR DE PARTIDO (`docs/MOTOR_PARTIDOS.md`): cómo los valores de los jugadores se convierten en un partido (marcador, minutos, goles, nota). Son funciones puras: dados los dos equipos, la intensidad elegida antes y una
 * semilla, el resultado es siempre el mismo (reproducible) y un partido entero tarda milisegundos. Todo se decide **comparando** (duelos relativos) con una parte pequeña contra una dificultad fija, y antes del pitido
 * todo se lleva a escala de adulto con el potenciador de la categoría (§3 ter del análisis), así que el motor se calibra una sola vez y vale para todas las categorías.
 *
 * Qué entra (`EquipoDePartido`): los jugadores con su lector de habilidades y capacidades (`LectorDePersona`: el mismo que usan las pruebas de acceso), su puesto y la energía con que llegan. Qué sale
 * (`ResultadoDePartido`): el marcador, el de cada tramo, y por jugador minutos, goles, asistencias, tiros, paradas y nota. Lo que llega después (experiencia por puesto, roles, tarjetas, lesiones, decisiones dentro
 * del partido) se enchufa sin cambiar la estructura (F3, F4, F7).
 */
import { rngEstable, GEN, type LectorDePersona, type Rng } from '@ds/contracts';
import { valorEfectivo } from '@ds/kit-deporte';
import { DEFINICIONES_DEL_ADDON, STATS_DE_FUTBOL, apoyosDe } from './habilidades';
import { PUESTOS_DE_FUTBOL } from './puestos';

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

/** Los números del motor, como datos (los ajusta el banco de partidos, `npm run sim:partidos`). */
export const PARAMETROS_DE_PARTIDO = {
  /** Tramos de un partido (6 de 15 minutos). */
  tramos: 6,
  minutosPorTramo: 15,
  /** Ataques por tramo, entre los dos equipos (el «ritmo» de la categoría; el mismo en todas por ahora). */
  ataquesPorTramo: 6,
  /** Probabilidad base de que un ataque llegue a ocasión (con equipos iguales), la dificultad fija (en escala de adulto) y cuánto pesa la comparación entre equipos. */
  ocasionBase: 0.47,
  dificultadDeLaOcasion: 22,
  potenciaDeLaOcasion: 1,
  /** Probabilidad base de que una ocasión acabe en gol con tirador y portero iguales, y cuánto pesa la comparación. */
  golBase: 0.19,
  potenciaDelGol: 1.2,
  /** Balón parado por tramo y equipo (media), y su probabilidad de gol con lanzador y portero iguales. */
  balonParadoPorTramo: 1.2,
  golDeBalonParado: 0.07,
  /** Cuánto cuenta en la nota lo que vale el jugador en su zona frente a lo esperado para su puesto (por cada 100 % de diferencia). */
  pesoDelRendimientoEnLaNota: 2,
  /** Ventaja de jugar en casa: más en las zonas del local (+4 %). */
  ventajaDeCasa: 0.04,
  /** Cansancio: lo que sube por tramo a un jugador típico a intensidad normal (6 tramos ⇒ unos 45) y lo que rinde a cada intensidad. */
  cansancioPorTramo: 7.5,
  intensidades: {
    relajado: { cansancio: 0.7, rinde: 0.93 },
    normal: { cansancio: 1, rinde: 1 },
    a_tope: { cansancio: 1.4, rinde: 1.07 },
  } as Record<Intensidad, { cansancio: number; rinde: number }>,
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

export interface OpcionesDePartido {
  /** Un texto único del partido (liga, jornada, local y visitante) y la semilla de la partida: con ellos el azar es siempre el mismo. */
  id: string;
  semilla: number;
  categoria: string;
  cambios?: ReglaDeCambios;
}

export interface EstadisticasDeJugador {
  minutos: number;
  goles: number;
  asistencias: number;
  tiros: number;
  paradas: number;
  golesEncajados: number;
  nota: number;
  puesto: string;
  titular: boolean;
  /** El cansancio con que acaba (0 a 100) si ha jugado: el personaje pierde de energía una parte de él. */
  cansancio?: number;
}

/**
 * Un momento del partido para la crónica (tramo a tramo): `gol`, `ocasion` (el tiro que paró el portero), `balon_parado` (falta o córner con gol o con parada), `cambio` y `tramo` (el resumen de cada tramo, al final de él).
 * Solo cuentan lo que pasó: no cambian el azar del partido.
 */
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

export interface ResultadoDePartido {
  /** [local, visitante]. */
  goles: [number, number];
  porTramo: { goles: [number, number]; posesion: [number, number] }[];
  /** Tiros (ocasiones) de cada equipo. */
  tiros: [number, number];
  jugadores: Record<string, EstadisticasDeJugador>;
  /** Los ids de los convocados de cada equipo ([local, visitante]). */
  alineaciones: [string[], string[]];
  /** Los goles, en orden: tramo, equipo (0 local, 1 visitante), goleador y asistente. */
  jugadas: { tramo: number; equipo: 0 | 1; goleador: string; asistente?: string; tipo: 'juego' | 'balon_parado' }[];
  /** Lo que pasó, en orden: goles, ocasiones, balón parado y cambios (la crónica del partido). */
  cronica: MomentoDeCronica[];
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
  const f = PARAMETROS_DE_PARTIDO.frescura.find((x) => frescura >= x.desde)!.rinde;
  return f * PARAMETROS_DE_PARTIDO.intensidades[intensidad].rinde;
}

/** Lo que sube el cansancio de un jugador en un tramo: según su resistencia (frente a lo típico de su edad), la energía con que empezó y la intensidad. */
export function cansancioDelTramo(j: JugadorDePartido, intensidad: Intensidad): number {
  const resistencia = j.lector.norm('gen.resistencia');
  return PARAMETROS_DE_PARTIDO.cansancioPorTramo * PARAMETROS_DE_PARTIDO.intensidades[intensidad].cansancio * (1.5 - resistencia) * (1 + (100 - (j.energia ?? 100)) / 100);
}

// ---------------------------------------------------------------------------------------------------- el partido

interface EnCampo {
  j: JugadorDePartido;
  cansancio: number;
  minutos: number;
  /** Valor de cada zona (media de sus habilidades en el partido) y de las habilidades que se sortean. */
  zona: Record<Zona, number>;
  tiro: number;
  cabeza: number;
  lanzamiento: number;
  pase: number;
}

interface Lado {
  equipo: EquipoDePartido;
  intensidad: Intensidad;
  campo: EnCampo[];
  banquillo: EnCampo[];
  todos: EnCampo[];
  cambios: number;
  stats: Map<string, EstadisticasDeJugador>;
}

function prepararJugador(j: JugadorDePartido, potenciador: number): EnCampo {
  const v = new Map<string, number>();
  const val = (stat: string): number => v.get(stat) ?? (v.set(stat, valorEnPartido(j.lector, stat, potenciador)), v.get(stat)!);
  const zona = Object.fromEntries(ZONAS.map((z) => [z, media(HABILIDADES_DE_LA_ZONA[z].map(val))])) as Record<Zona, number>;
  const r = j.rinde ?? 1;
  return { j, cansancio: 0, minutos: 0, zona: Object.fromEntries(ZONAS.map((z) => [z, zona[z] * r])) as Record<Zona, number>, tiro: r * (0.6 * val('futbol.definicion') + 0.25 * val('futbol.disparo_lejano') + 0.15 * val('futbol.cabeza')), cabeza: r * val('futbol.cabeza'), lanzamiento: r * (0.6 * val('futbol.faltas') + 0.4 * val('futbol.corners')), pase: r * val('futbol.pase') };
}

/** El valor de una zona del equipo en un tramo: la media de lo que valen los que están en el campo en esa zona, ponderada por lo que su puesto aporta a ella y por lo cansados que están. */
function valorDeLaZona(lado: Lado, zona: Zona, casa: number): number {
  let suma = 0;
  let pesos = 0;
  for (const e of lado.campo) {
    const peso = PARTICIPACION_DEL_PUESTO[e.j.puesto]?.[zona] ?? 0;
    suma += peso * e.zona[zona] * rendimientoPorCansancio(e.cansancio, e.j.intensidad ?? lado.intensidad);
    pesos += peso;
  }
  return pesos > 0 ? (suma / pesos) * (1 + casa) : 0;
}

const mejorQue = (a: number, b: number, potencia: number): number => {
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

const GRUPO_DE_PUESTO = (puesto: string): string => PUESTOS_DE_FUTBOL.reparto.find((g) => g.puestos.includes(puesto))?.grupo ?? puesto;

/** El partido: 6 tramos; en cada uno, cansancio, posesión, ataques, ocasiones, goles y balón parado; entre tramos, los cambios; al final, las notas. */
export function jugarPartido(local: EquipoDePartido, visitante: EquipoDePartido, o: OpcionesDePartido): ResultadoDePartido {
  const P = PARAMETROS_DE_PARTIDO;
  const potenciador = POTENCIADOR_POR_CATEGORIA[o.categoria] ?? 1;
  const rng = rngEstable('partido', o.semilla, o.id);
  const lado = (e: EquipoDePartido): Lado => {
    const todos = e.jugadores.map((j) => prepararJugador(j, potenciador));
    const stats = new Map(e.jugadores.map((j) => [j.id, { minutos: 0, goles: 0, asistencias: 0, tiros: 0, paradas: 0, golesEncajados: 0, nota: 6, puesto: j.puesto, titular: j.titular }]));
    return { equipo: e, intensidad: e.intensidad ?? 'normal', campo: todos.filter((x) => x.j.titular), banquillo: todos.filter((x) => !x.j.titular), todos, cambios: 0, stats };
  };
  const lados: [Lado, Lado] = [lado(local), lado(visitante)];
  const goles: [number, number] = [0, 0];
  const tiros: [number, number] = [0, 0];
  const porTramo: ResultadoDePartido['porTramo'] = [];
  const jugadas: ResultadoDePartido['jugadas'] = [];
  const anotados: number[][] = [[], []];
  const cronica: MomentoDeCronica[] = [];

  for (let tramo = 0; tramo < P.tramos; tramo++) {
    // Cambios antes del tramo (después del anterior): los más cansados salen por un suplente del mismo grupo de puestos.
    if (tramo > 0 && o.cambios?.despuesDeTramos.includes(tramo)) for (const [i, l] of lados.entries()) hacerCambios(l, o.cambios, (entra, sale) => cronica.push({ tramo, tipo: 'cambio', equipo: i as 0 | 1, jugador: entra, otro: sale }));
    // Cansancio a mitad del tramo para valorar a cada uno (empieza con el que ya lleva y suma la mitad de lo de este tramo).
    for (const l of lados) for (const e of l.campo) e.cansancio += cansancioDelTramo(e.j, e.j.intensidad ?? l.intensidad) / 2;
    const zonas = lados.map((l, i) => Object.fromEntries(ZONAS.map((z) => [z, valorDeLaZona(l, z, i === 0 ? P.ventajaDeCasa : 0)])) as Record<Zona, number>);
    const posesionLocal = mejorQue(zonas[0].creacion, zonas[1].creacion, 2);
    const g0 = goles.slice() as [number, number];
    let ataquesLocal = 0;
    for (let a = 0; a < P.ataquesPorTramo; a++) if (rng.chance(posesionLocal)) ataquesLocal++;
    const ataques = [ataquesLocal, P.ataquesPorTramo - ataquesLocal];
    for (const i of [0, 1] as const) {
      const atq = lados[i];
      const def = lados[1 - i];
      const za = zonas[i];
      const zd = zonas[1 - i];
      const poder = 0.4 * za.creacion + 0.6 * za.ataque;
      const portero = def.campo.find((e) => e.j.puesto === 'GK');
      for (let k = 0; k < ataques[i]; k++) {
        // Ocasión: comparación (cociente) entre el poder del ataque y la defensa rival, por la parte de dificultad fija.
        const relativo = mejorQue(poder, zd.defensa, P.potenciaDeLaOcasion);
        const absoluto = poder / (poder + P.dificultadDeLaOcasion);
        const ref = 40 / (40 + P.dificultadDeLaOcasion);
        if (!rng.chance(Math.min(0.95, P.ocasionBase * 2 * relativo * (absoluto / ref)))) continue;
        tiros[i]++;
        const tirador = sortear(rng, atq.campo.filter((e) => e.j.puesto !== 'GK'), (e) => (PARTICIPACION_DEL_PUESTO[e.j.puesto]?.ataque ?? 0) * Math.pow(e.zona.ataque * rendimientoPorCansancio(e.cansancio, e.j.intensidad ?? atq.intensidad), 1.5));
        if (!tirador) continue;
        atq.stats.get(tirador.j.id)!.tiros++;
        const valorPortero = portero ? portero.zona.porteria * rendimientoPorCansancio(portero.cansancio, portero.j.intensidad ?? def.intensidad) : 1;
        const valorTiro = tirador.tiro * rendimientoPorCansancio(tirador.cansancio, tirador.j.intensidad ?? atq.intensidad);
        if (rng.chance(Math.min(0.9, P.golBase * 2 * mejorQue(valorTiro, valorPortero, P.potenciaDelGol)))) {
          const asistente = rng.chance(0.65) ? sortear(rng, atq.campo.filter((e) => e !== tirador && e.j.puesto !== 'GK'), (e) => (PARTICIPACION_DEL_PUESTO[e.j.puesto]?.creacion ?? 0) * e.pase) : undefined;
          anotar(atq, def, tirador, asistente, i, tramo, 'juego');
        } else {
          if (portero) def.stats.get(portero.j.id)!.paradas++;
          cronica.push({ tramo, tipo: 'ocasion', equipo: i, jugador: tirador.j.id, ...(portero ? { portero: portero.j.id } : {}) });
        }
      }
      // Balón parado (faltas y córners): los lanza el mejor lanzador y remata el mejor de cabeza, contra la portería.
      const nBP = rng.chance(P.balonParadoPorTramo - Math.floor(P.balonParadoPorTramo)) ? Math.ceil(P.balonParadoPorTramo) : Math.floor(P.balonParadoPorTramo);
      for (let k = 0; k < nBP; k++) {
        const lanzador = atq.campo.reduce((m, e) => (e.lanzamiento > m.lanzamiento ? e : m), atq.campo[0]);
        const valorPortero = portero ? portero.zona.porteria * rendimientoPorCansancio(portero.cansancio, portero.j.intensidad ?? def.intensidad) : 1;
        const valor = (0.5 * lanzador.lanzamiento + 0.5 * media(atq.campo.filter((e) => e.j.puesto !== 'GK').map((e) => e.cabeza))) * rendimientoPorCansancio(lanzador.cansancio, lanzador.j.intensidad ?? atq.intensidad);
        tiros[i]++;
        if (rng.chance(Math.min(0.5, P.golDeBalonParado * 2 * mejorQue(valor, valorPortero, P.potenciaDelGol)))) {
          const rematador = sortear(rng, atq.campo.filter((e) => e.j.puesto !== 'GK'), (e) => Math.pow(e.cabeza, 2)) ?? lanzador;
          anotar(atq, def, rematador, rematador === lanzador ? undefined : lanzador, i, tramo, 'balon_parado');
        } else {
          if (portero) def.stats.get(portero.j.id)!.paradas++;
          cronica.push({ tramo, tipo: 'balon_parado', equipo: i, jugador: lanzador.j.id, gol: false, ...(portero ? { portero: portero.j.id } : {}) });
        }
      }
    }
    // El resto del cansancio del tramo y los minutos.
    for (const l of lados) {
      for (const e of l.campo) {
        e.cansancio += cansancioDelTramo(e.j, e.j.intensidad ?? l.intensidad) / 2;
        e.minutos += P.minutosPorTramo;
        l.stats.get(e.j.id)!.minutos += P.minutosPorTramo;
      }
    }
    porTramo.push({ goles: [goles[0] - g0[0], goles[1] - g0[1]], posesion: [posesionLocal, 1 - posesionLocal] });
  }

  function anotar(atq: Lado, def: Lado, goleador: EnCampo, asistente: EnCampo | undefined, i: 0 | 1, tramo: number, tipo: 'juego' | 'balon_parado'): void {
    goles[i]++;
    atq.stats.get(goleador.j.id)!.goles++;
    if (asistente) atq.stats.get(asistente.j.id)!.asistencias++;
    jugadas.push({ tramo, equipo: i, goleador: goleador.j.id, ...(asistente ? { asistente: asistente.j.id } : {}), tipo });
    for (const e of def.campo) def.stats.get(e.j.id)!.golesEncajados++;
    anotados[i].push(tramo);
    const portero = def.campo.find((e) => e.j.puesto === 'GK');
    cronica.push({ tramo, tipo: 'gol', equipo: i, jugador: goleador.j.id, ...(asistente ? { otro: asistente.j.id } : {}), ...(portero ? { portero: portero.j.id } : {}), ...(tipo === 'balon_parado' ? { gol: true } : {}) });
  }

  for (const l of lados) for (const e of l.todos) if (e.minutos > 0) l.stats.get(e.j.id)!.cansancio = Math.round(e.cansancio);

  // Notas (de 1 a 10): parten de 6 y suben o bajan con lo que hace, el resultado y, en defensa y portería, los goles encajados y las paradas.
  for (const [i, l] of lados.entries()) {
    const dif = goles[i] - goles[1 - i];
    for (const [id, s] of l.stats) {
      if (s.minutos === 0) {
        s.nota = 0;
        continue;
      }
      const parte = s.minutos / (P.tramos * P.minutosPorTramo);
      const grupo = GRUPO_DE_PUESTO(s.puesto);
      // Lo que rinde frente a lo esperado para su puesto: lo que vale en la zona que más pesa en él, frente a la media de los que juegan en esa zona en el partido (los dos equipos).
      const zonaPrincipal = ZONAS.reduce((m, z) => ((PARTICIPACION_DEL_PUESTO[s.puesto]?.[z] ?? 0) > (PARTICIPACION_DEL_PUESTO[s.puesto]?.[m] ?? 0) ? z : m), 'creacion' as Zona);
      const jugador = l.todos.find((x) => x.j.id === id)!;
      const esperado = media(lados.flatMap((x) => x.todos.filter((y) => y.j.puesto === s.puesto || GRUPO_DE_PUESTO(y.j.puesto) === GRUPO_DE_PUESTO(s.puesto)).map((y) => y.zona[zonaPrincipal])));
      const relativo = esperado > 0 ? Math.min(1.2, Math.max(-1, P.pesoDelRendimientoEnLaNota * (jugador.zona[zonaPrincipal] / esperado - 1))) : 0;
      let nota = 6 + 1 * s.goles + 0.6 * s.asistencias + Math.sign(dif) * 0.3 + relativo;
      if (grupo === 'portero') nota += 0.2 * s.paradas - 0.4 * s.golesEncajados;
      else if (grupo === 'central' || grupo === 'lateral') nota -= 0.15 * s.golesEncajados * parte;
      else nota -= 0.05 * s.golesEncajados * parte;
      s.nota = Math.round(Math.min(10, Math.max(1, 6 + (nota - 6) * (0.4 + 0.6 * parte))) * 10) / 10;
      void id;
    }
  }
  return { goles, porTramo, tiros, jugadores: Object.fromEntries(lados.flatMap((l) => [...l.stats])), alineaciones: [local.jugadores.map((j) => j.id), visitante.jugadores.map((j) => j.id)], jugadas, cronica };
}

/** Los cambios de una interrupción: los más cansados salen por un suplente del mismo grupo de puestos, hasta el máximo de la categoría (con cambios volantes, los que salieron pueden volver). */
function hacerCambios(l: Lado, regla: ReglaDeCambios, avisar?: (entra: string, sale: string) => void): void {
  const quedan = (): number => regla.maximo - l.cambios;
  const candidatos = [...l.campo].filter((e) => e.j.puesto !== 'GK').sort((a, b) => b.cansancio - a.cansancio);
  for (const sale of candidatos) {
    if (!regla.volantes && quedan() <= 0) return;
    if (regla.volantes && l.cambios >= regla.maximo * 3) return;
    const grupo = GRUPO_DE_PUESTO(sale.j.puesto);
    const entra = l.banquillo.filter((b) => GRUPO_DE_PUESTO(b.j.puesto) === grupo && (regla.volantes || b.minutos === 0)).sort((a, b) => a.cansancio - b.cansancio)[0];
    if (!entra || entra.cansancio >= sale.cansancio - 10) continue;
    l.campo = l.campo.map((e) => (e === sale ? entra : e));
    l.banquillo = l.banquillo.map((e) => (e === entra ? sale : e));
    l.cambios++;
    avisar?.(entra.j.id, sale.j.id);
    // El que entra juega en el puesto del que sale.
    entra.j = { ...entra.j, puesto: sale.j.puesto };
    l.stats.get(entra.j.id)!.puesto = sale.j.puesto;
  }
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
