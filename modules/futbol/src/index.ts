import {
  conLaPierna,
  type IdentityService,
  APORTES,
  GEN,
  SERVICES,
  TAGS,
  claveDeDeporte,
  datosDeDeporte,
  defineModule,
  inHours,
  ligarALugares,
  CORE_EVENTS,
  MINUTES_PER_DAY,
  SHARED_EVENTS,
  semanasDeTemporada,
  CAMPOS_DEL_COMPLEJO,
  conLugar,
  type ActionContext,
  type ActionDef,
  type EstadisticasDeTemporada,
  type TemporadaCerrada,
  type ProfileService,
  MORAL_DEL_BANQUILLO,
  aprendizajeDe,
  cerrarTemporadaDeJugador,
  experienciaTrasElPartido,
  factorDeExperienciaDelPuesto,
  notaMedia,
  sumarPartido,
  type ActionDoneData,
  type ClubImpuntualData,
  type JugadorDelPartido,
  type PartidoDeJugador,
  type PartidosService,
  type CompetitionResultData,
  type IrAData,
  type JugadorDeEquipoView,
  type LogTable,
  type RelationsService,
  type SeccionDeDeporte,
  type PartidoDelMundoData,
  type DeporteView,
  type LectorDePersona,
  type NpcDirectory,
  type ReadContext,
} from '@ds/contracts';
import {
  accionesDeClubes,
  repartirLosPartidos,
  campamento,
  categoriaDelJugador as categoriaDelJugadorEn,
  clubDelJugador as clubDelJugadorEn,
  conLosAmigos,
  dejarClub,
  entrenadorDelJugador as entrenadorDelJugadorEn,
  manejadoresDeDeporte,
  modificadorDeCampamento,
  modificadorDeConocimiento,
  modificadorDeLlegadaTarde,
  modificadorDeSobrecarga,
  modificadorPorTuCuenta,
  pedirConsejo,
  nombreDeCategoria,
  sedeDelClub as sedeDelClubEn,
  semillaDeSesionDeEquipo,
  sesionDeClubConEjercicios,
  sinEntrenarPorLibreEnSesion,
  textoDeSesiones,
  tramitesDe,
  valorEfectivo,
  verEnLaTele,
  type ConfigDeporte,
  type EstadoBaseDeDeporte,
} from '@ds/kit-deporte';
import { EJERCICIOS_DE_FUTBOL, JUEGO_INFORMAL, SIEMPRE, sesgoDelEntrenador } from './ejercicios';
import { DATOS_FUTBOL, FICHA_FUTBOL, LUGARES_FUTBOL } from './datos';
import { CONOCIMIENTO, DEPORTE, HABILIDADES_DE_FUTBOL, STATS_DE_FUTBOL } from './habilidades';
import { PUESTOS_DE_FUTBOL } from './puestos';
import { cerrarTemporada, categoriaAcabada, jugarSabadoDeUnaCategoria, nuevaLiga, partidosDeLaSemana, tablasDeLaDivision, type JugarPartido, type LigaDelMundo } from './liga';
import { DIA_DE_PARTIDO, conocimientoPorVer, llegadaDelPNJ, partidoAnteriorEnElCampo } from './dia-de-partido';
import { convocarYAlinear, equipoDePartido, estadoDelPersonaje, jugadoresDelPartido, paraConvocar, posicionEquivalente, type Convocatoria } from './convocatoria';
import { INTENSIDADES, PARAMETROS_DEL_PERSONAJE, YO, cronicaDelPartido, nombreDeIntensidad, proximoPartido, situacionEnLaLiga, textoDeResultados, ultimosResultados, type LineaDeCronica } from './personaje';
import { PARAMETROS_DE_PARTIDO, jugarPartido, tandaDePenaltis, type Intensidad, type ResultadoDePartido } from './partido';

export { CATEGORIAS_ESPANA, DATOS_FUTBOL, FICHA_FUTBOL, LUGARES_FUTBOL } from './datos';
export { CONOCIMIENTO, HABILIDADES_DE_FUTBOL, STATS_DE_FUTBOL } from './habilidades';
export { DIA_DE_PARTIDO, conocimientoPorVer, llegadaDelPNJ, partidoAnteriorEnElCampo } from './dia-de-partido';
export { PUESTOS_DE_FUTBOL } from './puestos';
export { tandaDePenaltis, PARAMETROS_DE_PENALTIS, jugarPartido, valorEnPartido, rendimientoPorCansancio, cansancioDelTramo, PARAMETROS_DE_PARTIDO, POTENCIADOR_POR_CATEGORIA, PARTICIPACION_DEL_PUESTO, HABILIDADES_DE_LA_ZONA } from './partido';
export { PARAMETROS_DE_CONVOCATORIA, convocarYAlinear, equipoDePartido, estadoDelPersonaje, paraConvocar, jugadoresDelPartido, posicionEquivalente, prioridadDelEntrenador } from './convocatoria';
export type { Convocatoria, JugadorParaConvocar } from './convocatoria';
export { archivarTemporada, cerrarTemporada, categoriaAcabada, jugarSabadoDeUnaCategoria, nuevaLiga, partidosDeLaSemana, tablasDeLaDivision } from './liga';
export type { PartidoDeLaSemana } from './liga';
export type { LigaDelMundo, LigaDeCategoria, TemporadaArchivada, CategoriaArchivada, DivisionArchivada, GrupoArchivado, RondaArchivada } from './liga';
export type { Lanzamiento, ResultadoDeTanda, EquipoDePartido, EstadisticasDeJugador, Intensidad, JugadorDePartido, OpcionesDePartido, ReglaDeCambios, ResultadoDePartido, Zona } from './partido';
export { EJERCICIOS_DE_FUTBOL, sesgoDelEntrenador } from './ejercicios';
export { INTENSIDADES, PARAMETROS_DEL_PERSONAJE, YO, cronicaDelPartido, proximoPartido, situacionEnLaLiga, textoDeResultados, ultimosResultados } from './personaje';
export type { LineaDeCronica, ProximoPartido, SituacionEnLaLiga } from './personaje';

/**
 * MÓDULO FÚTBOL (id `futbol`): fútbol 11, deporte de equipo. **F1: habilidades, conocimiento, entreno por libre y club del colegio.** Todavía no hay
 * partidos, liga ni gente propia más allá del equipo y el entrenador del colegio (F2); posiciones y roles, F3; derivadas y ocultas, F4; clubes de fuera, F5.
 * Lo común a cualquier deporte con club (clubes, entrenador, verano, tele, sobrecarga, conocimiento) lo pone el kit de deporte.
 */

/** Estado del fútbol: los campos comunes del kit y la liga del mundo (todos los equipos de todas las categorías). */
export type FutbolState = EstadoBaseDeDeporte & {
  liga?: LigaDelMundo;
  /** La intensidad con que el personaje sale a jugar (se queda elegida de un partido al siguiente; por defecto, normal). */
  intensidad?: Intensidad;
  /** El equipo del personaje esta temporada (club, categoría y letra A a D): se fija al empezar la liga, como el de todos. */
  personaje?: { curso: number; club: string; categoria: string; letra: string };
  /** Las sesiones del club que ha hecho cada semana (las últimas): su asistencia pesa en la convocatoria como la de cualquiera. */
  sesiones?: Record<string, number>;
  /** Sus últimos partidos (sin la crónica) y el último entero, con la crónica. */
  partidos?: ResumenDePartido[];
  ultimoPartido?: PartidoDelPersonaje;
  /** El partido de su equipo de esta semana, ya jugado por él en el campo: al cerrar la semana la liga lo cuenta tal cual (mismo resultado) en vez de volver a jugarlo. */
  partidoJugado?: { semana: number; id: string; goles: [number, number]; jugadores: JugadorDelPartido[] };
  /** Los partidos a los que estaba convocado y no fue, por semana (las últimas): rebajan su asistencia en la convocatoria. */
  faltas?: Record<string, number>;
  /** Sus estadísticas de la temporada, su historial de temporadas cerradas y su experiencia en cada puesto (F2.4): las mismas que guarda cada PNJ. */
  estadisticas?: EstadisticasDeTemporada;
  historial?: TemporadaCerrada[];
  experiencia?: Record<string, number>;
  /** El día de partido del personaje esta semana: si se ha unido a los compañeros (con cuántos minutos de retraso sobre la hora de la convocatoria), si ha pasado al vestuario y si lo convoca el entrenador, tal como estaba por la mañana del día del partido (`papel`: al cerrar la semana el resto del mundo ya ha cambiado —recuperaciones de lesiones— y la convocatoria podría salir distinta). */
  diaDePartido?: { semana: number; unido: boolean; tarde: number; vestuario?: boolean; papel?: 'titular' | 'suplente' | 'no_convocado' | 'lesionado' | 'sin_puesto' };
  /** Cuándo y dónde se juega cada partido de esta semana (id → [día de la semana, hora, campo]): se reparte el lunes con los partidos de la jornada (`repartirLosPartidos`). */
  calendario?: { curso: number; semana: number; partidos: Record<string, [number, number, string]>; sinSitio: number };
};

/** Un partido del personaje, en pocas cifras. */
export interface ResumenDePartido {
  curso: number;
  semana: number;
  categoria: string;
  /** «Jornada 5» o «Playoff · final». */
  texto: string;
  equipos: [string, string];
  goles: [number, number];
  /** 0 si el personaje es del local, 1 si es del visitante. */
  lado: 0 | 1;
  resultado: 'victoria' | 'empate' | 'derrota';
  /** Si jugó (minutos, de titular o no, nota, goles y asistencias) o por qué no. */
  juega: boolean;
  motivo?: string;
  titular?: boolean;
  puesto?: string;
  minutos?: number;
  nota?: number;
  golesMios?: number;
  asistencias?: number;
}

export interface PartidoDelPersonaje extends ResumenDePartido {
  cronica: LineaDeCronica[];
}

const ENTRENOS_LIBRES = ['futbol.balon', 'futbol.tiro', 'futbol.fisico', 'futbol.porteria'];

/** Lo que el kit de deporte necesita saber del fútbol. */
const CONFIG: ConfigDeporte = {
  id: DEPORTE,
  nombre: 'fútbol',
  rendimiento: (ctx) => rendimiento(ctx),
  // Lo que vale el personaje en cada puesto, con su pierna buena (la misma regla que los PNJ: `conLaPierna`).
  puestos: (ctx) => conLaPierna(rendimientoPorPuestos(ctx), ctx.service<IdentityService>(SERVICES.identidad)?.view().leftHanded ? 'izquierda' : 'derecha', PUESTOS_DE_FUTBOL.pierna?.ventajaDelLado ?? 0.25),
  puestosDelDeporte: PUESTOS_DE_FUTBOL.puestos.map((p) => ({ id: p.id, nombre: p.nombre })),
  entrenosLibres: ENTRENOS_LIBRES,
  juegoInformal: JUEGO_INFORMAL,
};

const clubDelJugador = (ctx: ReadContext) => clubDelJugadorEn(ctx, DEPORTE);
const sedeDelClub = (ctx: ReadContext) => sedeDelClubEn(ctx, CONFIG);
const categoriaDelJugador = (ctx: ReadContext) => categoriaDelJugadorEn(ctx, CONFIG);
const entrenadorDelJugador = (ctx: ReadContext) => entrenadorDelJugadorEn(ctx, DEPORTE);

/**
 * Cuánto depende cada habilidad de entender el juego (de 0 a 1): lo táctico y lo mental, del todo; lo técnico, a medias; lo físico, nada.
 * Se usa con el valor efectivo del kit (conocimiento: de ×0,85 a ×1,15).
 */
const SENSIBILIDAD = { vision: 1, posicionamiento: 1, decisiones: 1, juego_colectivo: 1, control: 0.3, pase: 0.5, regate: 0.3, tecnica: 0.3 };
const efectivo = (ctx: LectorDePersona, key: keyof typeof SENSIBILIDAD) => valorEfectivo(ctx, DEPORTE, `futbol.${key}`, SENSIBILIDAD[key]);

/**
 * Rendimiento 0..100 del jugador de campo (sirve para las pruebas de acceso a los clubes). Es provisional: con los partidos (F2) y las posiciones
 * (F3) cada puesto pesará sus propias habilidades.
 */
/**
 * Lo que vale el jugador **en cada uno de los 16 puestos** (de 0 a 100): la media de sus habilidades ponderada por lo que pesa cada una en el puesto (`PUESTOS_DE_FUTBOL`), con el efecto
 * del conocimiento del deporte que ya tiene cada habilidad (lo táctico y lo mental, del todo; lo técnico, a medias; lo físico, nada). Es el servicio con que los clubes valoran a cualquiera.
 */
const SENSIBILIDAD_POR_GRUPO: Readonly<Record<string, number>> = { mental: 1, técnica: 0.3, portería: 0.3, física: 0 };
const GRUPO_DE_HABILIDAD = new Map(STATS_DE_FUTBOL.map((d) => [d.id, (d.group ?? '').toLowerCase()]));
export function rendimientoPorPuestos(ctx: LectorDePersona): Record<string, number> {
  const valor = (stat: string): number => {
    if (stat.startsWith('gen.')) return ctx.stat(stat);
    const grupo = GRUPO_DE_HABILIDAD.get(stat) ?? '';
    const sens = Object.entries(SENSIBILIDAD_POR_GRUPO).find(([g]) => grupo.includes(g))?.[1] ?? 0.3;
    return valorEfectivo(ctx, DEPORTE, stat, (SENSIBILIDAD as Record<string, number>)[stat.slice(7)] ?? sens);
  };
  const memo = new Map<string, number>();
  const v = (stat: string): number => memo.get(stat) ?? (memo.set(stat, valor(stat)), memo.get(stat)!);
  return Object.fromEntries(PUESTOS_DE_FUTBOL.puestos.map((p) => [p.id, Object.entries(p.pesos).reduce((t, [stat, peso]) => t + peso * v(stat), 0)]));
}

export function rendimiento(ctx: LectorDePersona): number {
  const tecnica = (efectivo(ctx, 'control') + efectivo(ctx, 'pase') + efectivo(ctx, 'regate') + efectivo(ctx, 'tecnica')) / 4;
  const cabeza = (efectivo(ctx, 'vision') + efectivo(ctx, 'posicionamiento') + efectivo(ctx, 'decisiones')) / 3;
  return 0.15 * ctx.stat(GEN.velocidad) + 0.1 * ctx.stat(GEN.resistencia) + 0.1 * ctx.stat('futbol.arrancada') + 0.25 * tecnica + 0.2 * cabeza + 0.2 * efectivo(ctx, 'juego_colectivo');
}

const horarioEntreno = (ctx: ReadContext): true | string => {
  const t = ctx.time;
  // Sin clase (fines de semana y vacaciones) los campos abren todo el día.
  if (!t.isSchoolDay) return inHours(t, 8, 20) ? true : 'Los campos abren de 8 a 20 sin clase (fines de semana y vacaciones)';
  return inHours(t, 15, 21) ? true : 'Entrenamientos entre semana de 15 a 21';
};

/** Las habilidades que sube un poco un consejo del entrenador, por turnos según el día. */
const HABILIDADES_DE_CONSEJO = [
  { stat: 'futbol.tecnica', nombre: 'técnica' },
  { stat: 'futbol.pase', nombre: 'pase' },
  { stat: 'futbol.juego_colectivo', nombre: 'juego colectivo' },
  { stat: 'futbol.posicionamiento', nombre: 'posicionamiento' },
];


// ---------------------------------------------------------------------------------------------------- el partido del personaje

const nivelDe = (v: number): string => (v >= 80 ? 'excelente' : v >= 60 ? 'bien' : v >= 40 ? 'regular' : 'mal');
const nombreDePuesto = (id: string): string => PUESTOS_DE_FUTBOL.puestos.find((x) => x.id === id)?.nombre ?? id;
const notaTexto = (n: number): string => n.toFixed(1).replace('.', ',');

/** Qué parte de las sesiones del club hizo el personaje en la semana anterior y la actual (hasta `hastaDia`, 0 = lunes): la misma cuenta que las de los PNJ. */
function asistenciaDelPersonaje(ctx: ReadContext, semana: number, hastaDia: number): number {
  const club = clubDelJugador(ctx);
  if (!club) return 1;
  const dias = club.sesiones.weekdays;
  const esperadas = dias.length + dias.filter((d) => d <= hastaDia).length;
  if (!esperadas) return 1;
  const { sesiones: hechas = {}, faltas = {} } = ctx.state<FutbolState>();
  const base = Math.min(1, ((hechas[semana] ?? 0) + (hechas[semana - 1] ?? 0)) / esperadas);
  return Math.max(0, base - PARAMETROS_DEL_PERSONAJE.faltaAPartido * ((faltas[semana] ?? 0) + (faltas[semana - 1] ?? 0)));
}

interface EquipoDelPersonaje {
  club: string;
  categoria: string;
  letra: string;
  /** Id del equipo en la liga (`club|letra`). */
  clave: string;
}

/** El equipo en que juega el personaje este curso: el que se fijó al empezar la liga o, si aún no, el que le toca. */
function miEquipo(ctx: ReadContext, curso: number): EquipoDelPersonaje | undefined {
  const club = clubDelJugador(ctx);
  const dir = ctx.service<NpcDirectory>(SERVICES.npcs);
  if (!club || !dir?.equipoDelPersonaje) return undefined;
  const g = ctx.state<FutbolState>().personaje;
  const e = g && g.curso === curso && g.club === club.id ? g : dir.equipoDelPersonaje(DEPORTE);
  return e ? { club: e.club, categoria: e.categoria, letra: e.letra, clave: `${e.club}|${e.letra}` } : undefined;
}

/** El personaje como un jugador más de la plantilla de su equipo: con lo que vale en cada puesto (con su pierna buena), su estado y su asistencia a los entrenamientos. */
function yoComoJugador(ctx: ReadContext, plantilla: readonly JugadorDeEquipoView[], semana: number, hastaDia: number): JugadorDeEquipoView | undefined {
  const puesto = ctx.state<FutbolState>().puesto;
  const valores = CONFIG.puestos?.(ctx);
  if (!puesto || !valores) return undefined;
  return {
    id: YO,
    nombre: 'Tú',
    puesto,
    valores,
    valor: valores[puesto] ?? 0,
    estado: estadoDelPersonaje(ctx),
    resiliencia: ctx.stat(GEN.resiliencia) / 100,
    ambicion: 0.5,
    asistencia: asistenciaDelPersonaje(ctx, semana, hastaDia),
    disciplinaDelEntrenador: plantilla[0]?.disciplinaDelEntrenador ?? 0.5,
    lector: ctx,
    ...(ctx.state<FutbolState>().estadisticas ? { estadisticas: ctx.state<FutbolState>().estadisticas } : {}),
    ...(ctx.state<FutbolState>().experiencia ? { experiencia: ctx.state<FutbolState>().experiencia } : {}),
  };
}

/** Cómo está el personaje de cara al partido: si el entrenador lo convoca (titular o suplente), si no, o si está lesionado. */
type Papel = 'titular' | 'suplente' | 'no_convocado' | 'lesionado' | 'sin_puesto';

interface Previa {
  equipo: EquipoDelPersonaje;
  /** La plantilla de su equipo con él dentro (si tiene puesto). */
  plantilla: JugadorDeEquipoView[];
  c: Convocatoria;
  papel: Papel;
}

/**
 * La convocatoria de su equipo con el personaje dentro, como la hace el entrenador (la misma regla que para cualquiera: sus entrenamientos y su relación con el entrenador pesan). Sirve para la pestaña, para saber si puede
 * elegir intensidad y para el día de partido. **El papel (convocado o no) sale de la foto de la mañana del día del partido** (`fotoDelDiaDePartido`) y la alineación (`c`) se calcula con la situación de cada momento: dentro del
 * día no hace falta que salgan de la misma foto porque nada de lo que decide la convocatoria cambia entre semana (el estado de los PNJ y su asistencia solo cambian al cerrar la semana, y las sesiones del club son de lunes a
 * viernes); al cerrar la semana, quien lo necesita (el equipo sin él) vuelve a convocar sin el personaje (`ladoDelPartido`).
 */
function previaDelPartido(ctx: ReadContext, curso: number, semana: number, hastaDia: number, vivoSiempre = false): Previa | undefined {
  const dir = ctx.service<NpcDirectory>(SERVICES.npcs);
  const equipo = miEquipo(ctx, curso);
  if (!equipo || !dir?.plantillaDelEquipo) return undefined;
  const dia = ctx.state<FutbolState>().liga ? { semilla: ctx.state<FutbolState>().liga!.semilla, semana } : undefined;
  const base = dir.plantillaDelEquipo(DEPORTE, equipo.club, equipo.categoria, equipo.letra).filter((j) => !seAusenta(j, dia));
  const yo = yoComoJugador(ctx, base, semana, hastaDia);
  const plantilla = yo ? [...base, yo] : base;
  const entrenador = entrenadorDelJugador(ctx);
  const afinidad = entrenador ? ctx.service<RelationsService>(SERVICES.relaciones)?.get(entrenador.id)?.afinidad : undefined;
  const relacion = afinidad === undefined ? undefined : (afinidad + 100) / 2;
  const c = convocarYAlinear(plantilla.map((j) => paraConvocar(j, j.id === YO ? relacion : undefined)));
  const vivo: Papel = !yo ? 'sin_puesto' : (yo.estado.baja ?? 0) > 0 ? 'lesionado' : c.titulares.some((x) => x.id === YO) ? 'titular' : c.suplentes.some((x) => x.id === YO) ? 'suplente' : 'no_convocado';
  // El día de su partido, por la mañana, se anota si lo convoca el entrenador (`fotoDelDiaDePartido`): todo el día (y el cierre de la semana) cuenta con esa convocatoria, no con la de cada momento.
  const foto = ctx.state<FutbolState>().diaDePartido;
  const papel: Papel = !vivoSiempre && foto?.semana === semana && foto.papel ? foto.papel : vivo;
  return { equipo, plantilla, c, papel };
}

const MOTIVO_DE_NO_JUGAR: Record<Papel, string> = {
  titular: '',
  suplente: '',
  no_convocado: 'Tu entrenador no te convoca esta semana',
  lesionado: 'Estás lesionado y no puedes jugar',
  sin_puesto: 'Todavía no tienes puesto en el equipo',
};

/** ¿Puede el personaje elegir ahora la intensidad (`id`)? Solo si tiene partido esta semana y juega (convocado, titular o suplente). */
function puedeElegirIntensidad(ctx: ReadContext, id: Intensidad): true | string {
  if (!clubDelJugador(ctx)) return 'No juegas en ningún equipo de fútbol';
  const s = ctx.state<FutbolState>();
  const liga = s.liga && s.liga.curso === ctx.time.schoolYear && !s.liga.cerrada ? s.liga : undefined;
  const previa = previaDelPartido(ctx, ctx.time.schoolYear, ctx.time.week, ctx.time.weekday);
  if (!liga || !previa) return 'Todavía no hay partidos: la liga empieza tras la pretemporada';
  const l = liga.categorias[previa.equipo.categoria];
  if (!l || !proximoPartido(l, previa.equipo.clave)) return 'Tu equipo no juega esta semana';
  if (s.partidoJugado?.semana === ctx.time.week) return 'Ya has jugado el partido de esta semana';
  if (previa.papel !== 'titular' && previa.papel !== 'suplente') return `${MOTIVO_DE_NO_JUGAR[previa.papel]}: no eliges intensidad, solo verás el resultado y la crónica`;
  return (s.intensidad ?? 'normal') === id ? 'Ya llevas elegida esa intensidad' : true;
}

/** Las acciones de elegir la intensidad con que sale a jugar el próximo partido: se quedan elegidas hasta que se cambien. */
const ACCIONES_DE_INTENSIDAD: ActionDef[] = INTENSIDADES.map((i) => ({
  id: `futbol.intensidad_${i.id}`,
  name: `Salir a jugar: ${i.nombre.toLowerCase()}`,
  description: `${i.descripcion} Vale para el próximo partido y se queda elegida hasta que la cambies; hasta el sábado puedes cambiarla.`,
  tags: ['futbol'],
  group: 'Partido',
  duration: 5,
  available: (ctx) => puedeElegirIntensidad(ctx, i.id),
  run: (ctx) => {
    ctx.updateState<FutbolState>((s) => ({ ...s, intensidad: i.id }));
    ctx.log(`Saldrás a jugar a intensidad ${i.nombre.toLowerCase()}.`, 'info');
  },
}));

/** La acción de jugar el partido de su equipo, en el campo y a la hora de la jornada (como las carreras del atletismo). */
const ACCION_DE_JUGAR_EL_PARTIDO: ActionDef = {
  id: 'futbol.jugar_partido',
  name: 'Jugar el partido',
  description: 'El partido de liga de tu equipo: en el campo, a la hora de la jornada, si tu entrenador te ha convocado. Juegas con la condición física y el estado que tengas entonces y, al acabar, ves el resultado y la crónica. Si estás convocado y no vas, cuenta como una falta: tu equipo juega sin ti y tu entrenador te penaliza.',
  tags: [TAGS.fisico, TAGS.cardio, TAGS.competicion, 'futbol'],
  group: 'Competición',
  duration: 120,
  available: puedeJugarElPartido,
  run: jugarElPartidoDelPersonaje,
};

/** Cuándo se convoca y qué hay que hacer el día del partido (para la pestaña): la convocatoria una hora antes, el vestuario a y media y el aviso de la falta. */
function convocatoriaTexto(ctx: ReadContext, previa: Previa): string {
  const h = suHoraYCampo(ctx, previa, ctx.time.week);
  if (!h) return 'Ve al campo y elige «Jugar el partido»: si estás convocado y no vas, cuenta como una falta.';
  return `El entrenador convoca a las ${horaTexto(h.hora - 1)}: ve al campo y «Unirte a los compañeros» (más de 10 minutos tarde, tu entrenador pierde relación contigo); el vestuario se abre a las ${enMinutos(h.hora * 60 - 30)}. Si llegas después de la hora del partido no juegas y cuenta como una falta.`;
}

/** Lo que ve el personaje del partido en la pestaña: el próximo (rival, puestos en la tabla, si lo convocan, su estado, intensidad y últimos resultados) y el último, con su crónica. */
function seccionesDelPartido(ctx: ReadContext): SeccionDeDeporte[] {
  const s = ctx.state<FutbolState>();
  const secciones: SeccionDeDeporte[] = [];
  const dir = ctx.service<NpcDirectory>(SERVICES.npcs);
  const curso = ctx.time.schoolYear;
  const previa = clubDelJugador(ctx) ? previaDelPartido(ctx, curso, ctx.time.week, ctx.time.weekday) : undefined;
  const liga = s.liga && s.liga.curso === curso ? s.liga : undefined;
  const l = previa && liga ? liga.categorias[previa.equipo.categoria] : undefined;
  if (previa && liga && l) {
    const nombres = new Map((dir?.equiposDeLaCategoria?.(DEPORTE, previa.equipo.categoria) ?? []).map((e) => [e.id, e.nombre]));
    const nombre = (id: string): string => nombres.get(id) ?? id.replace('|', ' ');
    const situacion = (id: string): string => {
      const x = situacionEnLaLiga(l, id);
      return x ? `${x.puesto}.º de ${x.de} (${x.division === 1 ? 'Primera' : x.division === x.divisiones ? 'última división' : `${x.division}.ª división`}, ${x.puntos} pts)` : '—';
    };
    const jugadoEstaSemana = s.partidoJugado?.semana === ctx.time.week;
    const sig = liga.cerrada || jugadoEstaSemana ? undefined : proximoPartido(l, previa.equipo.clave);
    if (sig) {
      const yo = previa.plantilla.find((j) => j.id === YO);
      const intensidad = s.intensidad ?? 'normal';
      const juega = previa.papel === 'titular' || previa.papel === 'suplente';
      const puestoEnElOnce = previa.c.titulares.find((x) => x.id === YO)?.puesto;
      const papel = previa.papel === 'titular' ? `Convocado: titular de ${nombreDePuesto(puestoEnElOnce ?? yo?.puesto ?? '')}` : previa.papel === 'suplente' ? 'Convocado: suplente' : MOTIVO_DE_NO_JUGAR[previa.papel];
      const e = yo?.estado;
      const tabla: LogTable = {
        header: ['', ''],
        rows: [
          ['Competición', `${sig.texto} · ${sig.local ? 'en casa' : 'fuera'}`],
          ['Dónde y cuándo', `${suHoraYCampo(ctx, previa, ctx.time.week)?.texto ?? datosDeDeporte(ctx, DEPORTE).competiciones.jornada.texto}${juega ? `. ${convocatoriaTexto(ctx, previa)}` : ''}`],
          ['Rival', `${nombre(sig.rival)} · ${situacion(sig.rival)}`],
          ['Tu equipo', `${nombre(previa.equipo.clave)} · ${situacion(previa.equipo.clave)}`],
          ['Tu papel (hoy)', papel],
          ...(e ? [['Tu estado', `condición ${nivelDe(e.fisica)}, forma ${nivelDe(e.forma)}, moral ${nivelDe(e.moral)}, salud ${nivelDe(e.salud)}${e.baja ? ` · de baja ${e.baja} ${e.baja === 1 ? 'semana' : 'semanas'}` : ''}`]] : []),
          ['Intensidad', juega ? `${nombreDeIntensidad(intensidad)} (puedes cambiarla hasta el sábado)` : 'No eliges: solo verás el resultado y la crónica'],
          ['Últimos de tu equipo', textoDeResultados(ultimosResultados(l, previa.equipo.clave))],
          ['Últimos del rival', textoDeResultados(ultimosResultados(l, sig.rival))],
        ],
        align: ['left', 'left'],
      };
      secciones.push({ titulo: 'Próximo partido', texto: 'El entrenador decide la convocatoria el sábado, con lo que haya entonces: lo de hoy puede cambiar. Si no puedes jugar, el sábado solo verás el resultado y la crónica.', tabla });
    }
  }
  const u = s.ultimoPartido;
  if (u) {
    const resumen = `${u.equipos[0]} ${u.goles[0]}–${u.goles[1]} ${u.equipos[1]}. ${u.juega ? `Jugaste ${u.minutos} minutos${u.titular ? ' de titular' : ' desde el banquillo'}${u.puesto ? ` como ${nombreDePuesto(u.puesto).toLowerCase()}` : ''}; tu nota: ${notaTexto(u.nota ?? 0)}.` : `${u.motivo}.`}`;
    secciones.push({ titulo: `Último partido · ${u.texto}`, texto: resumen, lineas: u.cronica });
  }
  if (previa && liga && l) secciones.push(...seccionesDeLaTemporada(ctx, previa, liga, l, dir));
  return secciones;
}


const decimal = (n: number, d = 1): string => n.toFixed(d).replace('.', ',');

/**
 * La temporada del personaje en la pestaña (F2.4): la **tabla de su división** (la clasificación de su grupo, con su equipo resaltado), la **plantilla de su equipo** con las estadísticas de cada jugador (partidos, titularidades,
 * minutos, goles, asistencias y nota media: las de verdad, de todos) y **su temporada** (sus estadísticas, su experiencia en cada puesto y sus temporadas anteriores).
 */
function seccionesDeLaTemporada(ctx: ReadContext, previa: Previa, liga: LigaDelMundo, l: LigaDelMundo['categorias'][string], dir: NpcDirectory | undefined): SeccionDeDeporte[] {
  const nombres = new Map((dir?.equiposDeLaCategoria?.(DEPORTE, previa.equipo.categoria) ?? []).map((e) => [e.id, e.nombre]));
  const nombre = (id: string): string => nombres.get(id) ?? id.replace('|', ' ');
  const clave = previa.equipo.clave;
  const secciones: SeccionDeDeporte[] = [];
  // La tabla de su grupo.
  const di = l.divisiones.findIndex((d) => d.grupos.some((g) => g.equipos.includes(clave)));
  if (di >= 0) {
    const d = l.divisiones[di];
    const gi = d.grupos.findIndex((g) => g.equipos.includes(clave));
    const tabla = tablasDeLaDivision(d)[gi];
    const etiqueta = di === 0 ? 'Primera' : di === l.divisiones.length - 1 ? 'última división' : `${di + 1}.ª división`;
    secciones.push({
      titulo: `Clasificación · ${etiqueta}${d.grupos.length > 1 ? ` (grupo ${gi + 1})` : ''}`,
      tabla: {
        header: ['Pos.', 'Equipo', 'PJ', 'G', 'E', 'P', 'GF', 'GC', 'DG', 'Pts'],
        rows: tabla.map((f, i) => [`${i + 1}.º`, nombre(f.id), ...[f.pj, f.g, f.e, f.p, f.gf, f.gc, f.dg, f.puntos].map(String)]),
        highlight: tabla.findIndex((f) => f.id === clave),
        align: ['left', 'left', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right'],
      },
    });
  }
  // La plantilla con las estadísticas de la temporada de cada jugador.
  const de = (j: JugadorDeEquipoView): EstadisticasDeTemporada | undefined => (j.estadisticas?.curso === liga.curso ? j.estadisticas : undefined);
  const plantilla = [...previa.plantilla].sort((a, b) => (de(b)?.min ?? 0) - (de(a)?.min ?? 0) || (a.nombre < b.nombre ? -1 : 1));
  secciones.push({
    titulo: `Plantilla · ${nombre(clave)}`,
    tabla: {
      header: ['Jugador', 'Puesto', 'PJ', 'Tit.', 'Min.', 'G', 'A', 'Nota'],
      rows: plantilla.map((j) => {
        const e = de(j);
        return [j.id === YO ? 'Tú' : j.nombre, nombreDePuesto(j.puesto), ...[e?.pj ?? 0, e?.ti ?? 0, e?.min ?? 0, e?.g ?? 0, e?.a ?? 0].map(String), e?.pj ? decimal(notaMedia(e)) : '—'];
      }),
      highlight: plantilla.findIndex((j) => j.id === YO),
      align: ['left', 'left', 'right', 'right', 'right', 'right', 'right', 'right'],
    },
  });
  // Su temporada: estadísticas, experiencia por puesto e historial.
  const s = ctx.state<FutbolState>();
  const e = s.estadisticas?.curso === liga.curso ? s.estadisticas : undefined;
  const experiencia = Object.entries(s.experiencia ?? {}).filter(([, v]) => v >= 0.5).sort((a, b) => b[1] - a[1]);
  secciones.push({
    titulo: 'Tu temporada',
    texto: experiencia.length ? `Experiencia en cada puesto: ${experiencia.map(([p, v]) => `${nombreDePuesto(p).toLowerCase()} ${Math.round(v)}`).join(' · ')}.` : 'Todavía no tienes experiencia en ningún puesto: se gana jugando.',
    tabla: {
      header: ['Curso', 'PJ', 'Tit.', 'Min.', 'G', 'A', 'Nota'],
      rows: [
        ...(e ? [[`${liga.curso + 1} (este)`, ...[e.pj, e.ti, e.min, e.g, e.a].map(String), e.pj ? decimal(notaMedia(e)) : '—']] : [[`${liga.curso + 1} (este)`, '0', '0', '0', '0', '0', '—']]),
        ...[...(s.historial ?? [])].reverse().map((t) => [`${t[0] + 1}`, ...t.slice(1, 6).map(String), t[1] ? decimal(t[6] / 10) : '—']),
      ],
      highlight: 0,
      align: ['left', 'right', 'right', 'right', 'right', 'right', 'right'],
    },
  });
  return secciones;
}

/** El día de partido de todos los equipos de la semana (se calcula una vez por calendario: la alineación de cada equipo no cambia entre semana). */
interface DiaDeLaSemana {
  version: string;
  jugadores: Map<string, PartidoDeJugador>;
  equipos: Map<string, PartidoDeJugador>;
  partidos: ReturnType<PartidosService['deLaSemana']>;
}
const VACIO: DiaDeLaSemana = { version: 'sin-calendario', jugadores: new Map(), equipos: new Map(), partidos: [] };
const DIAS_CALCULADOS = new WeakMap<object, DiaDeLaSemana>();

/**
 * **El día de partido de la semana, para todos** (`MOTOR_PARTIDOS.md` §15): para cada partido del calendario y cada uno de sus dos equipos, la convocatoria del entrenador (la misma regla que para el personaje), cuándo llega cada convocado (puntual,
 * tarde o no se presenta: `llegadaDelPNJ`) y el conocimiento que gana viendo el partido anterior de su campo. Los equipos que llevan al personaje se calculan con él dentro (sin contarlo entre los PNJ).
 */
function elDiaDeLaSemana(ctx: ReadContext): DiaDeLaSemana {
  const s = ctx.state<FutbolState>();
  const cal = s.calendario;
  const dir = ctx.service<NpcDirectory>(SERVICES.npcs);
  if (!cal || !s.liga || cal.semana !== ctx.time.week || cal.curso !== s.liga.curso || !dir?.plantillaDelEquipo) return VACIO;
  const hecho = DIAS_CALCULADOS.get(cal);
  if (hecho) return hecho;
  const semana = cal.semana;
  const previa = previaDelPartido(ctx, s.liga.curso, semana, ctx.time.weekday);
  const campoMunicipal = datosDeDeporte(ctx, DEPORTE).competiciones.jornada.lugar;
  const todos = Object.values(cal.partidos);
  const res: DiaDeLaSemana = { version: `${cal.curso}:${cal.semana}`, jugadores: new Map(), equipos: new Map(), partidos: [] };
  for (const [id, h] of Object.entries(cal.partidos)) {
    const p = id.split('|');
    const categoria = p[1];
    const equipos = [`${p[3]}|${p[4]}`, `${p[5]}|${p[6]}`];
    const saque = (semana * 7 + h[0]) * MINUTES_PER_DAY + h[1] * 60;
    res.partidos.push({ id, categoria, local: equipos[0], visitante: equipos[1], saque, campo: h[2], lugar: campoMunicipal });
    const contexto: ContextoDelDia = { semilla: s.liga.semilla, semana, saque, mio: h, partidos: todos };
    for (const clave of equipos) {
      const [club, letra] = clave.split('|');
      const mio = !!previa && previa.equipo.clave === clave && previa.equipo.categoria === categoria;
      const plantilla = mio ? previa!.plantilla : dir.plantillaDelEquipo(DEPORTE, club, categoria, letra).filter((j) => !seAusenta(j, contexto));
      const c = mio ? previa!.c : convocarYAlinear(plantilla.map((j) => paraConvocar(j)));
      const base = { dia: h[0], saque, campo: campoMunicipal, vestuario: VESTUARIO };
      res.equipos.set(`${clave}|${categoria}`, { ...base, llegada: saque - DIA_DE_PARTIDO.convocatoria, tarde: 0, conocimiento: 0 });
      const convocados = new Set([...c.titulares.map((x) => x.id), ...c.suplentes.map((x) => x.id)]);
      for (const j of plantilla) {
        if (j.id === YO || !convocados.has(j.id)) continue;
        const d = elDiaDeUnJugador(j, contexto);
        res.jugadores.set(j.id, { ...base, llegada: saque - DIA_DE_PARTIDO.convocatoria + d.tarde, tarde: d.tarde, conocimiento: d.conocimiento });
      }
    }
  }
  DIAS_CALCULADOS.set(cal, res);
  return res;
}

const NOMBRES_DE_EQUIPOS = new WeakMap<object, Map<string, string>>();

/** Los partidos que se están jugando ahora (de cualquier categoría): del calendario de la semana, los que han empezado y no han acabado. */
function partidosEnCurso(ctx: ReadContext): { id: string; categoria: string; local: string; visitante: string; saque: number; campo: string }[] {
  const s = ctx.state<FutbolState>();
  const cal = s.calendario;
  const t = ctx.time;
  if (!cal || !s.liga || cal.semana !== t.week || cal.curso !== s.liga.curso) return [];
  const res: ReturnType<typeof partidosEnCurso> = [];
  for (const [id, h] of Object.entries(cal.partidos)) {
    if (h[0] !== t.weekday) continue;
    const saque = (t.week * 7 + h[0]) * MINUTES_PER_DAY + h[1] * 60;
    if (t.minute < saque || t.minute >= saque + DIA_DE_PARTIDO.duracionDelPartido) continue;
    const p = id.split('|');
    res.push({ id, categoria: p[1], local: `${p[3]}|${p[4]}`, visitante: `${p[5]}|${p[6]}`, saque, campo: h[2] });
  }
  return res;
}

/**
 * **Ver partidos de otros, como espectador** (`MOTOR_PARTIDOS.md` §15): cualquier sábado o domingo, en el campo municipal, el personaje puede ver un partido que se esté jugando (el suyo no: con los suyos está jugando o esperando) y eso le da
 * conocimiento del fútbol en proporción a lo que ve (la misma regla que ver el partido anterior mientras espera, `conocimientoPorVer`). Cada acción es media hora del partido; un partido entero son tres. Más adelante dará información de los jugadores.
 */
function accionesDeEspectador(ctx: ReadContext): ActionDef[] {
  const enCurso = partidosEnCurso(ctx);
  if (!enCurso.length) return [];
  const cal = ctx.state<FutbolState>().calendario!;
  const dir = ctx.service<NpcDirectory>(SERVICES.npcs);
  const suEquipo = clubDelJugador(ctx) ? miEquipo(ctx, ctx.time.schoolYear) : undefined;
  const nombres = (categoria: string): Map<string, string> => {
    const clave = `${categoria}`;
    let porCategoria = NOMBRES_DE_EQUIPOS.get(cal);
    if (!porCategoria) NOMBRES_DE_EQUIPOS.set(cal, (porCategoria = new Map()));
    if (!porCategoria.has(`${clave}|cargada`)) {
      for (const e of dir?.equiposDeLaCategoria?.(DEPORTE, categoria) ?? []) porCategoria.set(e.id, e.nombre);
      porCategoria.set(`${clave}|cargada`, '');
    }
    return porCategoria;
  };
  const lugar = datosDeDeporte(ctx, DEPORTE).competiciones.jornada.lugar;
  return enCurso
    .filter((p) => !suEquipo || suEquipo.categoria !== p.categoria || (p.local !== suEquipo.clave && p.visitante !== suEquipo.clave))
    .sort((a, b) => Number(b.categoria === suEquipo?.categoria) - Number(a.categoria === suEquipo?.categoria) || (a.id < b.id ? -1 : 1))
    .slice(0, 8)
    .map((p) => {
      const n = nombres(p.categoria);
      const local = n.get(p.local) ?? p.local.replace('|', ' ');
      const visitante = n.get(p.visitante) ?? p.visitante.replace('|', ' ');
      const sitio = p.campo.startsWith('complejo:') ? `campo ${p.campo.slice(9)} del complejo` : 'campo del club';
      return conLugar([lugar], {
        id: `futbol.ver_partido.${p.categoria}.${p.local.replace('|', '_')}.${p.visitante.replace('|', '_')}`,
        name: `Ver ${local} – ${visitante} (${nombreDeCategoria(ctx, CONFIG, p.categoria).toLowerCase()}, ${sitio})`,
        description: 'Ver un partido de otros equipos desde la grada, media hora: aprendes cómo se mueve un equipo (conocimiento del fútbol, en proporción a lo que ves).',
        tags: [TAGS.social, 'futbol'],
        group: 'Ver partidos',
        duration: 30,
        delta: { [GEN.energia]: -1 },
        available: (c: ReadContext) => (partidosEnCurso(c).some((x) => x.id === p.id) ? true : 'Ese partido ya no se está jugando'),
        run: (c: ActionContext) => {
          const actual = partidosEnCurso(c).find((x) => x.id === p.id);
          if (!actual) return;
          const minutos = Math.min(30, actual.saque + DIA_DE_PARTIDO.duracionDelPartido - c.time.minute);
          c.train(CONOCIMIENTO, DIA_DE_PARTIDO.conocimientoPorPartidoVisto * (minutos / DIA_DE_PARTIDO.duracionDelPartido));
          c.log(`Ves desde la grada ${local} – ${visitante}: aprendes cómo se mueve un equipo.`, 'info');
        },
      });
    });
}

/** El texto de «próxima prueba» de la pestaña. */
function textoDeProximoPartido(ctx: ReadContext): string {
  const s = ctx.state<FutbolState>();
  const liga = s.liga && s.liga.curso === ctx.time.schoolYear ? s.liga : undefined;
  const eq = clubDelJugador(ctx) ? miEquipo(ctx, ctx.time.schoolYear) : undefined;
  const l = eq && liga ? liga.categorias[eq.categoria] : undefined;
  if (liga?.cerrada) return 'La temporada ha terminado: la liga vuelve tras la pretemporada.';
  if (eq && l) {
    if (s.partidoJugado?.semana === ctx.time.week) return 'Ya has jugado el partido de esta semana: la crónica, más abajo.';
    const sig = proximoPartido(l, eq.clave);
    const h = suHoraYCampo(ctx, previaDelPartido(ctx, ctx.time.schoolYear, ctx.time.week, ctx.time.weekday), ctx.time.week);
    return sig ? `${h ? `${h.texto}` : 'Este fin de semana'}: ${sig.texto.toLowerCase()}, ${sig.local ? 'en casa' : 'fuera'}. Más abajo, el rival y tu convocatoria; el partido se juega en el campo, con la acción «Jugar el partido».` : 'Tu equipo no juega esta semana.';
  }
  return datosDeDeporte(ctx, DEPORTE).competiciones.jornada.texto;
}

/** La pestaña del fútbol: las habilidades, los datos del club, el próximo partido y el último con su crónica. */
function vistaDeFutbol(ctx: ReadContext): DeporteView {
  const t = ctx.time;
  const { competida } = categoriaDelJugador(ctx);
  const club = clubDelJugador(ctx);
  const datos = datosDeDeporte(ctx, DEPORTE);
  const entrenador = entrenadorDelJugador(ctx);
  return {
    id: DEPORTE,
    nombre: 'Fútbol',
    disciplina: 'Fútbol 11',
    inactivo: club ? undefined : 'Apúntate al club de fútbol del colegio (en la administración) para ver aquí tu deporte',
    resumen: [
      { etiqueta: 'Categoría', valor: competida.nombre },
      { etiqueta: 'Federación', valor: `${datos.competiciones.federacion}${datos.deRespaldo ? ` (con los datos de España: ${ctx.pais.nombre} aún no tiene los suyos)` : ''}` },
      { etiqueta: 'Club', valor: club?.nombre ?? 'Sin club' },
      { etiqueta: 'Entrenador', valor: entrenador?.name ?? '—' },
      { etiqueta: 'Entrenamientos', valor: club ? textoDeSesiones(club.sesiones) : '—' },
      { etiqueta: 'Partidos', valor: datos.competiciones.jornada.texto },
    ],
    habilidades: [...HABILIDADES_DE_FUTBOL, CONOCIMIENTO],
    temporada: {
      etiqueta: `Curso ${t.schoolYear + 1}`,
      proxima: textoDeProximoPartido(ctx),
      pruebas: [],
      nombreDePruebas: 'Partidos',
    },
    clasificaciones: [],
    temporadasAnteriores: [],
    secciones: seccionesDelPartido(ctx),
  };
}

/** Lo que entrenan las sesiones, de menos a más: libre (técnica o físico), club y campamento. */
const t = (stat: string, amount: number) => ({ stat, amount });

/** Para medir (`npm run liga`): se avisa de cada sábado de liga con lo que ha tardado y cuántos partidos ha jugado. No cambia nada del juego. */
export const DIAGNOSTICO_DE_LIGA: { alSabado?: (d: { ms: number; partidos: number; semana: number }) => void } = {};

/** Los cambios de un partido de liga (dato por categoría y nivel; de momento 5 en 3 paradas, para todas: `MOTOR_PARTIDOS.md` §6). */
const CAMBIOS_DE_LIGA = { maximo: 5, despuesDeTramos: [1, 3, 4] };


/**
 * **Lo que deja el partido en el personaje** (decisiones del usuario, 10/11): se guarda el partido entero con su crónica (tramo a tramo, con lo suyo resaltado); si jugó, ve su nota y cambian su condición física (pierde parte del
 * cansancio con que acabó), su motivación y su forma como tras una carrera (`competicion.resultado`); si no pudo jugar (lesionado o no convocado), solo ve el resultado y la crónica; y si estaba convocado y no fue (`ausente`),
 * su equipo juega sin él y el entrenador lo apunta como una falta (rebaja su asistencia las dos semanas siguientes).
 */
function registrarPartidoDelPersonaje(ctx: ActionContext, p: { r: ResultadoDePartido; lado: 0 | 1; nombres: Record<string, string>; local: string; visitante: string; previa: Previa; curso: number; semana: number; texto: string; nombreDeEquipo: (id: string) => string; ausente?: boolean; papel?: Papel }): void {
  const { r, lado, previa } = p;
  const papel = p.papel ?? previa.papel;
  const equipos: [string, string] = [p.nombreDeEquipo(p.local), p.nombreDeEquipo(p.visitante)];
  const [propios, rival] = [r.goles[lado], r.goles[1 - lado]];
  const resultado = propios > rival ? 'victoria' : propios < rival ? 'derrota' : 'empate';
  const yo = r.jugadores[YO];
  const juega = !!yo && yo.minutos > 0;
  const motivo = p.ausente ? 'No te presentas al partido: tu equipo juega sin ti' : papel === 'titular' || papel === 'suplente' ? 'Te quedas en el banquillo todo el partido' : MOTIVO_DE_NO_JUGAR[papel];
  const cronica: LineaDeCronica[] = [
    ...(juega ? [{ destacada: true, texto: yo.titular ? `Eres titular de ${nombreDePuesto(yo.puesto).toLowerCase()}.` : 'Empiezas en el banquillo.' }] : [{ texto: `${motivo}: sigues el partido desde fuera.` }]),
    ...cronicaDelPartido(r, { equipos, nombres: { ...p.nombres, [YO]: 'Tú' } }),
  ];
  const resumen: ResumenDePartido = {
    curso: p.curso, semana: p.semana, categoria: previa.equipo.categoria, texto: p.texto, equipos, goles: r.goles, lado, resultado, juega,
    ...(juega ? { titular: yo.titular, puesto: yo.puesto, minutos: yo.minutos, nota: yo.nota, golesMios: yo.goles, asistencias: yo.asistencias } : { motivo }),
  };
  // Sus estadísticas, su historial de temporadas y su experiencia en el puesto: las mismas reglas que las de cualquier jugador. Quien estaba convocado y no jugó (banquillo) baja su moral, más cuanto más ambicioso.
  const banquillo = !juega && !p.ausente && (papel === 'titular' || papel === 'suplente');
  const aprendizaje = aprendizajeDe([ctx.norm(GEN.inteligencia), ctx.norm(GEN.atencion), ctx.norm(CONOCIMIENTO)]);
  const pierna = ctx.service<IdentityService>(SERVICES.identidad)?.view().leftHanded ? 'izquierda' : 'derecha';
  const ambicion = ((ctx.service<ProfileService>(SERVICES.perfil)?.view().caracter?.ambicion ?? 0) + 50) / 100;
  if (juega || banquillo) {
    ctx.updateState<FutbolState>((s) => {
      const anterior = s.estadisticas;
      const cerrada = anterior && anterior.curso !== p.curso ? cerrarTemporadaDeJugador(anterior) : undefined;
      return {
        ...s,
        estadisticas: sumarPartido(anterior, p.curso, juega ? { minutos: yo.minutos, titular: yo.titular, goles: yo.goles, asistencias: yo.asistencias, nota: yo.nota } : { minutos: 0 }),
        ...(cerrada ? { historial: [...(s.historial ?? []), cerrada] } : {}),
        ...(juega ? { experiencia: { ...s.experiencia, [yo.puesto]: experienciaTrasElPartido(s.experiencia?.[yo.puesto] ?? 0, { minutos: yo.minutos, aprendizaje, factorDelLado: factorDeExperienciaDelPuesto(PUESTOS_DE_FUTBOL, yo.puesto, pierna), ritmo: PUESTOS_DE_FUTBOL.experiencia?.ritmo }) } } : {}),
      };
    });
  }
  if (banquillo) ctx.addStat(GEN.motivacion, Math.round(MORAL_DEL_BANQUILLO * (0.5 + ambicion)));
  ctx.updateState<FutbolState>((s) => ({
    ...s,
    partidos: [...(s.partidos ?? []), resumen].slice(-PARAMETROS_DEL_PERSONAJE.partidosGuardados),
    ultimoPartido: { ...resumen, cronica },
    ...(p.ausente ? { faltas: { ...Object.fromEntries(Object.entries(s.faltas ?? {}).filter(([k]) => Number(k) >= p.semana - 2)), [p.semana]: 1 } } : {}),
  }));
  const marcador = `${equipos[0]} ${r.goles[0]}–${r.goles[1]} ${equipos[1]}`;
  if (!juega) {
    if (p.ausente) ctx.log(`${p.texto}: ${marcador}. Estabas convocado y no te presentaste: tu equipo ha jugado sin ti y tu entrenador lo apunta como una falta.`, 'aviso');
    else ctx.log(`${p.texto}: ${marcador}. ${motivo}: no juegas. Tienes la crónica en la pestaña del deporte.`, resultado === 'victoria' ? 'logro' : 'resultado');
    return;
  }
  const valoracion = jugadoresDelPartido(r, lado).find((x) => x.npcId === YO)?.valoracion ?? 0;
  ctx.addStat(GEN.energia, -Math.round((yo.cansancio ?? 0) * PARAMETROS_DEL_PERSONAJE.energiaPorCansancio));
  ctx.addStat(GEN.motivacion, PARAMETROS_DEL_PERSONAJE.motivacion[resultado] + Math.round((yo.nota - 6) / 2));
  ctx.train(GEN.resiliencia, resultado === 'derrota' ? 0.8 : 0.2);
  const aportes = [yo.goles ? `${yo.goles} ${yo.goles === 1 ? 'gol' : 'goles'}` : '', yo.asistencias ? `${yo.asistencias} ${yo.asistencias === 1 ? 'asistencia' : 'asistencias'}` : ''].filter(Boolean).join(' y ');
  ctx.log(`${p.texto}: ${marcador}. Juegas ${yo.minutos} minutos${yo.titular ? ' de titular' : ' desde el banquillo'}${aportes ? ` (${aportes})` : ''}; tu nota: ${notaTexto(yo.nota)}.`, resultado === 'victoria' ? 'logro' : 'resultado');
  const { position, total } = posicionEquivalente(valoracion);
  ctx.emit<CompetitionResultData>({
    type: SHARED_EVENTS.COMPETITION_RESULT,
    data: {
      module: DEPORTE,
      discipline: `Fútbol · ${p.texto}`,
      position,
      total,
      mark: yo.nota,
      unit: 'nota',
      mayorEsMejor: true,
      participants: [
        { name: 'Tú', mark: yo.nota, isPlayer: true },
        ...Object.entries(r.jugadores)
          .filter(([id, x]) => id !== YO && x.minutos > 0)
          .map(([id, x]) => ({ npcId: id, name: p.nombres[id] ?? id, mark: x.nota, bando: (r.alineaciones[lado].includes(id) ? 'companero' : 'rival') as 'companero' | 'rival' })),
      ],
      equipo: { resultado, propio: propios, rival, equipoPropio: equipos[lado], equipoRival: equipos[1 - lado] },
    },
  });
}

/** Lo que hace falta para el día de partido de los jugadores del mundo: la semilla de la liga, la semana y, si se sabe, la hora y el campo del partido y todos los de la semana (para ver el anterior de su campo). */
interface ContextoDelDia {
  semilla: number;
  semana: number;
  saque?: number;
  mio?: [number, number, string];
  partidos?: [number, number, string][];
}

/** El día de partido de un partido concreto de la semana (`id` de la liga), con lo que hay en el calendario. */
function contextoDelDia(ctx: ReadContext, semana: number, id: string): ContextoDelDia | undefined {
  const s = ctx.state<FutbolState>();
  const cal = s.calendario;
  if (!s.liga) return undefined;
  const h = cal && cal.semana === semana && cal.curso === s.liga.curso ? cal.partidos[id] : undefined;
  return { semilla: s.liga.semilla, semana, ...(h && cal ? { saque: (semana * 7 + h[0]) * MINUTES_PER_DAY + h[1] * 60, mio: h, partidos: Object.values(cal.partidos) } : {}) };
}

/** ¿No se presenta este jugador del mundo al partido de esta semana? (Quien falta no se convoca: el entrenador convoca a los demás.) El personaje decide él. */
const seAusenta = (j: JugadorDeEquipoView, c: Pick<ContextoDelDia, 'semilla' | 'semana'> | undefined): boolean => !!c && j.id !== YO && llegadaDelPNJ({ semilla: c.semilla, npcId: j.id, semana: c.semana, disciplina: j.disciplina ?? 0.5 }).ausente;

/** Cuánto llega tarde un jugador del mundo a la convocatoria y cuánto conocimiento gana viendo el partido anterior de su campo mientras espera: la regla del personaje, con el azar del jugador. */
function elDiaDeUnJugador(j: JugadorDeEquipoView, c: ContextoDelDia): { tarde: number; conocimiento: number } {
  const { tarde } = llegadaDelPNJ({ semilla: c.semilla, npcId: j.id, semana: c.semana, disciplina: j.disciplina ?? 0.5 });
  if (c.saque === undefined || !c.mio || !c.partidos) return { tarde, conocimiento: 0 };
  const anterior = partidoAnteriorEnElCampo(c.partidos, c.mio, c.semana * 7);
  return { tarde, conocimiento: anterior === undefined ? 0 : conocimientoPorVer({ anteriorDesde: anterior, ahora: c.saque - DIA_DE_PARTIDO.convocatoria + tarde, saque: c.saque }) };
}

/**
 * Un lado de un partido de liga: la plantilla del equipo, la convocatoria del entrenador y el equipo listo para el motor. En el equipo del personaje, la plantilla lleva al personaje (a la intensidad que eligió) o, si estaba
 * convocado y no va (`sinMi`), no lo lleva: el entrenador convoca a los demás. **Lo usan igual el partido del personaje en su hora y la liga del mundo al cerrar la semana**, para que den el mismo resultado.
 */
function ladoDelPartido(dir: NpcDirectory, previa: Previa | undefined, clave: string, categoria: string, intensidad: Intensidad, sinMi = false, dia?: ContextoDelDia) {
  const [club, letra] = clave.split('|');
  if (previa && clave === previa.equipo.clave && categoria === previa.equipo.categoria) {
    const plantilla = sinMi ? previa.plantilla.filter((j) => j.id !== YO) : previa.plantilla;
    const c = sinMi ? convocarYAlinear(plantilla.map((j) => paraConvocar(j))) : previa.c;
    const base = equipoDePartido(clave, clave, plantilla, c);
    return { plantilla, c, equipo: { ...base, jugadores: base.jugadores.map((j) => (j.id === YO ? { ...j, intensidad } : j)) }, mio: true };
  }
  const plantilla = dir.plantillaDelEquipo!(DEPORTE, club, categoria, letra).filter((j) => !seAusenta(j, dia));
  const c = convocarYAlinear(plantilla.map((j) => paraConvocar(j)));
  return { plantilla, c, equipo: equipoDePartido(clave, clave, plantilla, c), mio: false };
}

/** Juega un partido de liga con el motor. Un equipo que no puede alinear a once pierde por 3 a 0 (no pasa con las plantillas de la ciudad: tienen al menos 14), sin crónica. */
function partidoDeLiga(dir: NpcDirectory, previa: Previa | undefined, semilla: number, o: { categoria: string; local: string; visitante: string; id: string; intensidad: Intensidad; sinMi?: boolean; dia?: ContextoDelDia }) {
  const a = ladoDelPartido(dir, previa, o.local, o.categoria, o.intensidad, o.sinMi, o.dia);
  const b = ladoDelPartido(dir, previa, o.visitante, o.categoria, o.intensidad, o.sinMi, o.dia);
  if (a.c.titulares.length < 11 || b.c.titulares.length < 11) return { goles: (a.c.titulares.length < 11 ? [0, 3] : [3, 0]) as [number, number], jugadores: [], mio: a.mio || b.mio };
  const r = jugarPartido(a.equipo, b.equipo, { id: o.id, semilla, categoria: o.categoria, cambios: CAMBIOS_DE_LIGA });
  // Cuánto aprende jugando cada uno (inteligencia, atención y conocimiento del fútbol, frente a lo típico de su edad).
  const jugadoresPorId = new Map([...a.plantilla, ...b.plantilla].map((j) => [j.id, j]));
  const lectores = new Map([...a.plantilla, ...b.plantilla].map((j) => [j.id, j.lector]));
  const aprender = (id: string): number | undefined => {
    const l = lectores.get(id);
    return l ? aprendizajeDe([l.norm(GEN.inteligencia), l.norm(GEN.atencion), l.norm(CONOCIMIENTO)]) : undefined;
  };
  return {
    r,
    goles: r.goles,
    // Los del personaje no cuentan para el estado de los PNJ. Cada convocado lleva además cuánto llegó tarde a la convocatoria y el conocimiento que ganó viendo el partido anterior (el día de partido, para todos).
    jugadores: [...jugadoresDelPartido(r, 0, aprender), ...jugadoresDelPartido(r, 1, aprender)]
      .filter((j) => j.npcId !== YO)
      .map((j) => {
        const p = o.dia ? jugadoresPorId.get(j.npcId) : undefined;
        const d = p && o.dia ? elDiaDeUnJugador(p, o.dia) : undefined;
        return d ? { ...j, ...(d.tarde > DIA_DE_PARTIDO.tolerancia ? { tarde: d.tarde } : {}), ...(d.conocimiento > 0 ? { conocimiento: d.conocimiento } : {}) } : j;
      }),
    mio: a.mio || b.mio,
    lado: (a.mio ? 0 : 1) as 0 | 1,
    nombres: Object.fromEntries([...a.plantilla, ...b.plantilla].map((j) => [j.id, j.nombre])),
  };
}

/** Los nombres de los equipos de una categoría (para la crónica y el registro). */
const nombresDeEquipos = (dir: NpcDirectory, categoria: string): ((id: string) => string) => {
  const m = new Map((dir.equiposDeLaCategoria?.(DEPORTE, categoria) ?? []).map((e) => [e.id, e.nombre]));
  return (id) => m.get(id) ?? id.replace('|', ' ');
};

/**
 * **La liga existe desde el lunes de la primera semana de competición** (y la temporada anterior se cierra al empezar el curso si no se había cerrado): así el personaje puede jugar su partido el sábado a su hora, antes de que
 * la semana se cierre. También fija el equipo del personaje, como el de todos, para toda la temporada. Devuelve la liga del curso, o `undefined` si aún es pretemporada, vacaciones o el deporte no tiene liga.
 */
function prepararLiga(ctx: ActionContext, t: { schoolYear: number; period: string; schoolWeek: number; week: number }): LigaDelMundo | undefined {
  const dir = ctx.service<NpcDirectory>(SERVICES.npcs);
  const datos = datosDeDeporte(ctx, DEPORTE);
  const f = datos.temporada.liga?.divisiones;
  if (!dir?.equiposDeLaCategoria || !dir.plantillaDelEquipo || !f) return undefined;
  let liga = ctx.state<FutbolState>().liga;
  const guardar = (l: LigaDelMundo): void => void ctx.updateState<FutbolState>((s) => ({ ...s, liga: l }));
  // Un curso nuevo cierra la temporada anterior si no se había cerrado (una temporada cortada se decide por la clasificación).
  if (liga && liga.curso !== t.schoolYear && !liga.cerrada) {
    liga = cerrarTemporada(liga, f, liga.semilla);
    guardar(liga);
  }
  if (t.period !== 'clase' || t.schoolWeek < semanasDeTemporada(ctx.pais.calendario, datos.temporada).primeraCompeticion) return undefined;
  if (!liga || liga.curso !== t.schoolYear) {
    const equipos = Object.fromEntries(datos.categorias.map((c) => [c.id, dir.equiposDeLaCategoria!(DEPORTE, c.id)]).filter(([, es]) => (es as unknown[]).length));
    liga = nuevaLiga(t.schoolYear, liga?.semilla ?? Math.floor(ctx.rng.next() * 2 ** 31), equipos as never, f, liga?.siguiente, liga?.campeones, liga?.historial);
    guardar(liga);
  }
  const e = miEquipo(ctx, t.schoolYear);
  const g = ctx.state<FutbolState>().personaje;
  if (e && (!g || g.curso !== t.schoolYear || g.club !== e.club || g.categoria !== e.categoria || g.letra !== e.letra)) ctx.updateState<FutbolState>((s) => ({ ...s, personaje: { curso: t.schoolYear, club: e.club, categoria: e.categoria, letra: e.letra } }));
  if (!liga.cerrada) prepararElCalendario(ctx, liga, t.week);
  return liga;
}

/**
 * **El calendario de la semana** (`MOTOR_PARTIDOS.md` §15): reparte los partidos de la jornada de todas las categorías en días, horas en punto y campos (`repartirLosPartidos`): los clubes grandes y medianos juegan en casa en sus
 * instalaciones y los pequeños y los colegios en el complejo municipal (con los campos que tenga la ciudad). Se hace una vez por semana, con la liga tal como está antes de jugar.
 */
function prepararElCalendario(ctx: ActionContext, liga: LigaDelMundo, semana: number): void {
  const actual = ctx.state<FutbolState>().calendario;
  if (actual && actual.curso === liga.curso && actual.semana === semana) return;
  const dir = ctx.service<NpcDirectory>(SERVICES.npcs);
  const datos = datosDeDeporte(ctx, DEPORTE);
  const f = datos.temporada.liga?.divisiones;
  const cal = datos.competiciones.jornada.calendario;
  if (!dir?.equiposDeLaCategoria || !f || !cal) return;
  const porColocar = Object.entries(liga.categorias).flatMap(([cat, l]) => {
    const equipos = new Map(dir.equiposDeLaCategoria!(DEPORTE, cat).map((e) => [e.id, e]));
    return partidosDeLaSemana(l, f).map((p) => ({ id: `${liga.curso}|${cat}|${p.ref}`, categoria: cat, club: p.local.split('|')[0], campoPropio: !!equipos.get(p.local)?.campoPropio }));
  });
  const r = repartirLosPartidos(porColocar, cal, ctx.pais.ciudad?.camposDelComplejo ?? CAMPOS_DEL_COMPLEJO);
  ctx.updateState<FutbolState>((s) => ({ ...s, calendario: { curso: liga.curso, semana, partidos: Object.fromEntries([...r.partidos].map(([id, h]) => [id, [h.dia, h.hora, h.campo]])), sinSitio: r.sinSitio.length } }));
}

/** El vestuario del campo (una zona del campo municipal que se abre media hora antes de cada partido). */
const VESTUARIO = 'vestuario_campo_municipal';
const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const horaTexto = (h: number): string => `${h}:00`;

/** Cuándo y dónde juega el personaje su próximo partido (según el calendario de la semana), o `undefined` si no tiene partido o aún no se ha repartido. */
function suHoraYCampo(ctx: ReadContext, previa: Previa | undefined, semana: number): { dia: number; hora: number; campo: string; texto: string } | undefined {
  const s = ctx.state<FutbolState>();
  const liga = s.liga && s.liga.curso === ctx.time.schoolYear ? s.liga : undefined;
  const l = previa && liga ? liga.categorias[previa.equipo.categoria] : undefined;
  const sig = previa && l ? proximoPartido(l, previa.equipo.clave) : undefined;
  const h = sig && previa && s.calendario?.curso === ctx.time.schoolYear && s.calendario.semana === semana ? s.calendario.partidos[`${ctx.time.schoolYear}|${previa.equipo.categoria}|${sig.ref}`] : undefined;
  if (!h) return undefined;
  const [dia, hora, campo] = h;
  const donde = campo.startsWith('complejo:') ? `el campo ${campo.slice(9)} del complejo municipal` : sig!.local ? 'las instalaciones de tu club' : 'las instalaciones del club local';
  return { dia, hora, campo, texto: `${DIAS[dia][0].toUpperCase()}${DIAS[dia].slice(1)} a las ${horaTexto(hora)}, en ${donde}` };
}

/** Los datos del día de partido del personaje (su partido de esta semana, su hora de saque en minutos absolutos y su equipo), o el motivo por el que no tiene partido que jugar. */
function datosDelDiaDePartido(ctx: ReadContext): { previa: Previa; h: { dia: number; hora: number; campo: string; texto: string }; saque: number } | string {
  if (!clubDelJugador(ctx)) return 'No juegas en ningún equipo de fútbol';
  if (ctx.stat(GEN.baja) > 0) return 'Estás de baja por una lesión: no puedes jugar';
  const t = ctx.time;
  const s = ctx.state<FutbolState>();
  const liga = s.liga && s.liga.curso === t.schoolYear && !s.liga.cerrada ? s.liga : undefined;
  const previa = previaDelPartido(ctx, t.schoolYear, t.week, t.weekday);
  if (!liga || !previa) return 'Todavía no hay partidos: la liga empieza tras la pretemporada';
  const l = liga.categorias[previa.equipo.categoria];
  if (!l || !proximoPartido(l, previa.equipo.clave)) return 'Tu equipo no juega esta semana';
  if (s.partidoJugado?.semana === t.week) return 'Ya has jugado el partido de esta semana';
  if (previa.papel !== 'titular' && previa.papel !== 'suplente') return `${MOTIVO_DE_NO_JUGAR[previa.papel]}: no juegas`;
  const h = suHoraYCampo(ctx, previa, t.week);
  if (!h) return 'Todavía no se sabe a qué hora juega tu equipo';
  // La hora de saque en minutos absolutos de la partida: el lunes de esta semana más el día y la hora de su partido.
  const saque = (t.day - t.weekday + h.dia) * MINUTES_PER_DAY + h.hora * 60;
  return { previa, h, saque };
}

const enMinutos = (m: number): string => `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, '0')}`;
const horaDelDia = (minutoAbsoluto: number): string => enMinutos(minutoAbsoluto % MINUTES_PER_DAY);
const minusculaInicial = (x: string): string => `${x.charAt(0).toLowerCase()}${x.slice(1)}`;

/** El día de su partido, por la mañana, se anota si el entrenador lo convoca (con lo que valen todos ese día): la convocatoria no cambia después, al cerrar la semana. */
function fotoDelDiaDePartido(ctx: ActionContext): void {
  const t = ctx.time;
  const previa = previaDelPartido(ctx, t.schoolYear, t.week, t.weekday, true);
  const h = suHoraYCampo(ctx, previa, t.week);
  if (!previa || !h || h.dia !== t.weekday || ctx.state<FutbolState>().diaDePartido?.semana === t.week) return;
  ctx.updateState<FutbolState>((s) => ({ ...s, diaDePartido: { semana: t.week, unido: false, tarde: 0, papel: previa.papel } }));
}

/** ¿Está el personaje con sus compañeros esta semana (se ha unido)? */
const estaUnido = (ctx: ReadContext): boolean => ctx.state<FutbolState>().diaDePartido?.semana === ctx.time.week && !!ctx.state<FutbolState>().diaDePartido?.unido;

/**
 * **¿Puede unirse a los compañeros?** Desde una hora antes del partido hasta su hora, en el campo, si el entrenador lo ha convocado (titular o suplente). Con la hora de saque a la vista, dice qué pasa si llega pronto, tarde o ya empezado.
 */
function puedeUnirseALosCompaneros(ctx: ReadContext): true | string {
  const d = datosDelDiaDePartido(ctx);
  if (typeof d === 'string') return d;
  const t = ctx.time;
  if (t.weekday !== d.h.dia) return `Tu partido es el ${minusculaInicial(d.h.texto)}`;
  if (estaUnido(ctx)) return 'Ya estás con tus compañeros';
  if (t.minute < d.saque - DIA_DE_PARTIDO.convocatoria) return `La convocatoria es una hora antes del partido (a las ${horaDelDia(d.saque - DIA_DE_PARTIDO.convocatoria)})`;
  if (t.minute >= d.saque) return 'Tu equipo ya ha empezado el partido sin ti: has llegado tarde y no juegas (cuenta como una falta)';
  return true;
}

/** El personaje se une a los compañeros (o entra en el vestuario): llega `tarde` minutos después de la hora de la convocatoria; con más de 10, su entrenador pierde relación con él por impuntual. */
function unirse(ctx: ActionContext, d: { saque: number }): void {
  const tarde = Math.max(0, ctx.time.minute - (d.saque - DIA_DE_PARTIDO.convocatoria));
  ctx.updateState<FutbolState>((s) => ({ ...s, diaDePartido: { semana: ctx.time.week, unido: true, tarde, vestuario: s.diaDePartido?.semana === ctx.time.week ? s.diaDePartido.vestuario : undefined, ...(s.diaDePartido?.semana === ctx.time.week && s.diaDePartido.papel ? { papel: s.diaDePartido.papel } : {}) } }));
  if (tarde > DIA_DE_PARTIDO.tolerancia) {
    ctx.emit<ClubImpuntualData>({ type: SHARED_EVENTS.CLUB_IMPUNTUAL, data: { sport: DEPORTE, minutos: tarde } });
    ctx.log(`Llegas ${Math.round(tarde)} minutos tarde a la convocatoria: tu entrenador lo nota y no le hace gracia.`, 'aviso');
  }
}

/**
 * **Unirse a los compañeros** (`MOTOR_PARTIDOS.md` §15): desde una hora antes del partido, en el campo, el personaje está con su equipo hasta que se abre el vestuario (media hora antes): habla con ellos y, si el suyo no es el primer
 * partido del campo, **ve el partido anterior**, que le da conocimiento del fútbol (en proporción a lo que ve). Si se une más de 10 minutos tarde, el entrenador pierde relación con él por impuntual.
 */
const ACCION_DE_UNIRSE_A_LOS_COMPANEROS: ActionDef = {
  id: 'futbol.unirse_companeros',
  name: 'Unirte a los compañeros',
  description: 'Una hora antes de tu partido, en el campo, tu entrenador convoca al equipo: te unes a tus compañeros, hablas con ellos y, si antes juega otro equipo en tu campo, ves su partido (aprendes algo de fútbol). Si te unes más de 10 minutos tarde, tu entrenador pierde relación contigo por impuntual; si llegas después de la hora del partido, no juegas y cuenta como una falta.',
  tags: [TAGS.social, 'futbol'],
  group: 'Competición',
  duration: (ctx) => {
    const d = datosDelDiaDePartido(ctx);
    // Hasta que se abre el vestuario (media hora antes); si ya es más tarde, un rato corto.
    return typeof d === 'string' ? 5 : Math.min(60, Math.max(5, d.saque - DIA_DE_PARTIDO.vestuario - ctx.time.minute));
  },
  available: puedeUnirseALosCompaneros,
  run: (ctx) => {
    const d = datosDelDiaDePartido(ctx);
    if (typeof d === 'string') return;
    unirse(ctx, d);
    // El partido anterior en su campo (el de la franja anterior): lo que ve mientras espera hasta que se abre el vestuario le da conocimiento del fútbol, con la misma regla que a los PNJ.
    const cal = ctx.state<FutbolState>().calendario;
    const inicioDeSemana = ctx.time.day - ctx.time.weekday;
    const anterior = cal ? partidoAnteriorEnElCampo(Object.values(cal.partidos), [d.h.dia, d.h.hora, d.h.campo], inicioDeSemana) : undefined;
    const aprende = anterior === undefined ? 0 : conocimientoPorVer({ anteriorDesde: anterior, ahora: ctx.time.minute, saque: d.saque });
    if (aprende > 0) {
      ctx.train(CONOCIMIENTO, aprende);
      ctx.log('Mientras esperas ves el final del partido anterior en tu campo: aprendes cómo se mueve un equipo.', 'info');
    }
    ctx.log(`Te unes a tus compañeros (${horaDelDia(ctx.time.minute)}): el vestuario se abre a las ${horaDelDia(d.saque - DIA_DE_PARTIDO.vestuario)}.`, 'info');
  },
};

/** ¿Puede entrar en el vestuario? Desde media hora antes del partido hasta su hora: estando con los compañeros pasa allí con ellos; si llega entonces, se une dentro. */
function puedeIrAlVestuario(ctx: ReadContext): true | string {
  const d = datosDelDiaDePartido(ctx);
  if (typeof d === 'string') return d;
  const t = ctx.time;
  if (t.weekday !== d.h.dia) return `Tu partido es el ${minusculaInicial(d.h.texto)}`;
  if (t.minute < d.saque - DIA_DE_PARTIDO.vestuario) return `El vestuario se abre media hora antes del partido (a las ${horaDelDia(d.saque - DIA_DE_PARTIDO.vestuario)})`;
  if (t.minute >= d.saque) return 'Tu equipo ya ha empezado el partido sin ti: has llegado tarde y no juegas (cuenta como una falta)';
  return true;
}

/** **Ir al vestuario**: la zona del campo que se abre media hora antes de cada partido. Con los compañeros, pasa allí con ellos; si llega entonces, se une dentro (con los minutos de retraso que lleve sobre la convocatoria). */
const ACCION_DE_IR_AL_VESTUARIO: ActionDef = {
  id: 'futbol.ir_vestuario',
  name: 'Ir al vestuario',
  description: 'El vestuario del campo se abre media hora antes de tu partido: pasas allí con tus compañeros a cambiarte. Si llegas ahora y no te habías unido a ellos, te unes dentro del vestuario (y llegas tarde a la convocatoria).',
  tags: [TAGS.social, 'futbol'],
  group: 'Competición',
  duration: 2,
  available: puedeIrAlVestuario,
  run: (ctx) => {
    const d = datosDelDiaDePartido(ctx);
    if (typeof d === 'string') return;
    if (!estaUnido(ctx)) unirse(ctx, d);
    ctx.updateState<FutbolState>((s) => ({ ...s, diaDePartido: { ...s.diaDePartido!, vestuario: true } }));
    ctx.emit<IrAData>({ type: SHARED_EVENTS.IR_A, data: { destino: VESTUARIO } });
    ctx.log('Pasas al vestuario con tus compañeros: el entrenador da las últimas indicaciones.', 'info');
  },
};

/** ¿Puede el personaje jugar ahora el partido de su equipo? Solo desde la hora del partido, con sus compañeros (se ha unido a ellos a tiempo: si llega después de la hora, no juega y cuenta como falta). */
function puedeJugarElPartido(ctx: ReadContext): true | string {
  const d = datosDelDiaDePartido(ctx);
  if (typeof d === 'string') return d;
  const t = ctx.time;
  if (t.weekday !== d.h.dia) return `Tu partido es el ${minusculaInicial(d.h.texto)}`;
  if (t.minute < d.saque - DIA_DE_PARTIDO.convocatoria) return `Todavía es pronto: la convocatoria es a las ${horaDelDia(d.saque - DIA_DE_PARTIDO.convocatoria)}, una hora antes del partido`;
  if (!estaUnido(ctx)) return t.minute < d.saque ? 'Únete antes a tus compañeros (o pasa al vestuario): el entrenador convoca una hora antes' : 'Tu equipo ya ha empezado el partido sin ti: has llegado tarde y no juegas (cuenta como una falta)';
  if (t.minute < d.saque) return `El partido empieza a las ${horaDelDia(d.saque)}`;
  if (t.minute >= d.saque + 120) return 'El partido ya ha acabado';
  return true;
}

/**
 * **Jugar el partido** (decisión del usuario, 11/11): el partido de su equipo se juega en el campo, a la hora de la jornada, con la condición física y el estado que tenga entonces (lo que haya hecho esa mañana cuenta). Se juega ya, con
 * el mismo código que la liga, y se guarda: al cerrar la semana la liga cuenta ese mismo resultado. Al acabar ve el resultado y la crónica.
 */
function jugarElPartidoDelPersonaje(ctx: ActionContext): void {
  const t = ctx.time;
  const dir = ctx.service<NpcDirectory>(SERVICES.npcs)!;
  const liga = ctx.state<FutbolState>().liga!;
  const previa = previaDelPartido(ctx, t.schoolYear, t.week, t.weekday)!;
  const sig = proximoPartido(liga.categorias[previa.equipo.categoria], previa.equipo.clave)!;
  const [local, visitante] = sig.local ? [previa.equipo.clave, sig.rival] : [sig.rival, previa.equipo.clave];
  const id = `${liga.curso}|${previa.equipo.categoria}|${sig.ref}`;
  const o = partidoDeLiga(dir, previa, liga.semilla, { categoria: previa.equipo.categoria, local, visitante, id, intensidad: ctx.state<FutbolState>().intensidad ?? 'normal', dia: contextoDelDia(ctx, t.week, id) });
  ctx.updateState<FutbolState>((s) => ({ ...s, partidoJugado: { semana: t.week, id, goles: o.goles, jugadores: o.jugadores } }));
  if (o.r && o.lado !== undefined) registrarPartidoDelPersonaje(ctx, { r: o.r, lado: o.lado, nombres: o.nombres, local, visitante, previa, curso: liga.curso, semana: t.week, texto: sig.texto, nombreDeEquipo: nombresDeEquipos(dir, previa.equipo.categoria) });
  // Al acabar el partido aparece en el vestuario.
  ctx.emit<IrAData>({ type: SHARED_EVENTS.IR_A, data: { destino: VESTUARIO } });
}

/**
 * **LA LIGA DEL MUNDO** (F2.3b): cada sábado de clase, desde que acaba la pretemporada, todos los equipos de todas las categorías juegan su jornada (o el playoff de la última división), esté o no el personaje: el motor
 * con las plantillas de verdad (convocatoria del entrenador, estado de cada jugador), y a quienes juegan les cambia el estado como tras una carrera (`partido.mundo`). Los partidos del mundo se calculan al cerrar la semana;
 * **el de su equipo, si el personaje lo ha jugado en el campo, se cuenta tal cual** (el mismo resultado), y si estaba convocado y no fue, su equipo juega sin él y se le apunta una falta. Al empezar un curso se arman las
 * divisiones (al crear la partida, por lo que vale cada equipo; después, con los ascensos y descensos de la temporada anterior) y al acabar la temporada se cierran.
 */
function ligaDelMundo(ctx: ActionContext, semana: number): void {
  const dir = ctx.service<NpcDirectory>(SERVICES.npcs);
  const f = datosDeDeporte(ctx, DEPORTE).temporada.liga?.divisiones;
  if (!dir?.equiposDeLaCategoria || !dir.plantillaDelEquipo || !f) return;
  const t = ctx.timeAt(semana * 7 * MINUTES_PER_DAY);
  let liga = prepararLiga(ctx, t);
  if (!liga || liga.cerrada) return;
  const guardar = (l: LigaDelMundo): void => void ctx.updateState<FutbolState>((s) => ({ ...s, liga: l }));
  const previa = previaDelPartido(ctx, t.schoolYear, semana, 6);
  const ligaDeMiEquipo = previa ? liga.categorias[previa.equipo.categoria] : undefined;
  const sigDeMiEquipo = previa && ligaDeMiEquipo ? proximoPartido(ligaDeMiEquipo, previa.equipo.clave) : undefined;
  const intensidad = ctx.state<FutbolState>().intensidad ?? 'normal';
  const jugado = ctx.state<FutbolState>().partidoJugado;
  const yaJugado = jugado?.semana === semana ? jugado : undefined;
  // Si lo convoca el entrenador, como estaba el día del partido (la convocatoria no cambia por lo que pase al cerrar la semana). Convocado y sin haber ido al campo: falta; no convocado o lesionado: su equipo juega sin él, sin falta.
  const papel = previa?.papel;
  const convocado = papel === 'titular' || papel === 'suplente';
  const ausente = !!previa && !yaJugado && convocado;
  const fuera = !!previa && !yaJugado && !convocado;
  let delPersonaje: (ReturnType<typeof partidoDeLiga> & { local: string; visitante: string }) | undefined;
  const jugar: JugarPartido = Object.assign(
    (categoria: string, local: string, visitante: string, id: string) => {
      // El partido que el personaje ya jugó en el campo: el mismo resultado, sin volver a jugarlo.
      if (yaJugado && id === yaJugado.id) return { goles: yaJugado.goles, jugadores: yaJugado.jugadores };
      const esMio = !!previa && categoria === previa.equipo.categoria && (local === previa.equipo.clave || visitante === previa.equipo.clave);
      const o = partidoDeLiga(dir, previa, liga!.semilla, { categoria, local, visitante, id, intensidad, sinMi: esMio && (ausente || fuera), dia: contextoDelDia(ctx, semana, id) });
      if (o.mio && o.r) delPersonaje = { ...o, local, visitante };
      return { goles: o.goles, jugadores: o.jugadores };
    },
    {
      // La tanda de penaltis de un cruce empatado del playoff: cinco por equipo y después uno a uno, cada penalti un duelo entre el que tira y el portero.
      tanda: (categoria: string, a: string, b: string, id: string) => {
        const r = tandaDePenaltis(ladoDelPartido(dir, previa, a, categoria, intensidad).equipo, ladoDelPartido(dir, previa, b, categoria, intensidad).equipo, { id, semilla: liga!.semilla, categoria });
        return { ganador: r.ganador, goles: r.goles };
      },
    },
  );
  const categorias = { ...liga.categorias };
  const empezo = performance.now();
  let partidos = 0;
  for (const [cat, l] of Object.entries(categorias)) {
    if (categoriaAcabada(l)) continue;
    const r = jugarSabadoDeUnaCategoria(cat, l, liga.curso, f, jugar, liga.semilla);
    categorias[cat] = r.liga;
    partidos += r.jugadores.length / 22;
    if (r.jugadores.length) ctx.emit<PartidoDelMundoData>({ type: SHARED_EVENTS.PARTIDO_MUNDO, data: { deporte: DEPORTE, semana, curso: t.schoolYear, categoria: cat, jugadores: r.jugadores } });
  }
  // Su partido de esta semana, si no lo ha jugado él (no convocado, lesionado o ausente): se cuenta con el resultado y la crónica, y la falta si la hay.
  if (delPersonaje && delPersonaje.r && delPersonaje.lado !== undefined && previa) {
    registrarPartidoDelPersonaje(ctx, { r: delPersonaje.r, lado: delPersonaje.lado, nombres: delPersonaje.nombres, local: delPersonaje.local, visitante: delPersonaje.visitante, previa, curso: t.schoolYear, semana, texto: sigDeMiEquipo?.texto ?? 'Liga', nombreDeEquipo: nombresDeEquipos(dir, previa.equipo.categoria), ausente, ...(papel ? { papel } : {}) });
  }
  if (jugado) ctx.updateState<FutbolState>((s) => ({ ...s, partidoJugado: undefined }));
  liga = { ...liga, categorias };
  // Si todas las categorías han acabado (liga y playoff), se cierra la temporada: ascensos y descensos para la siguiente.
  if (Object.values(categorias).every(categoriaAcabada)) liga = cerrarTemporada(liga, f, liga.semilla);
  guardar(liga);
  DIAGNOSTICO_DE_LIGA.alSabado?.({ ms: performance.now() - empezo, partidos: Math.round(partidos), semana });
}

export const futbol = defineModule<FutbolState>({
  id: 'futbol',
  name: 'Fútbol',
  description: 'Fútbol 11. Entrena con el equipo del colegio y por tu cuenta.',
  dependsOn: ['gen'],
  aportes: { [APORTES.fichaDeDeporte]: [FICHA_FUTBOL], [APORTES.datosDeDeporte]: [DATOS_FUTBOL], [APORTES.lugaresDeDeporte]: [LUGARES_FUTBOL], [APORTES.rendimientoDeDeporte]: [{ id: DEPORTE, rendimiento, puestos: rendimientoPorPuestos }] },
  stats: [...STATS_DE_FUTBOL],

  initState: () => ({ sesionesHoy: { day: -1, n: 0 }, ultimaTele: -1 }),

  services: {
    [claveDeDeporte(DEPORTE)]: (ctx) => ({ view: () => vistaDeFutbol(ctx) }),
    // Lo que hacen los jugadores del mundo el día de su partido (convocatoria, llegada, vestuario): las mismas reglas que el personaje; `npcs` lo pone en el mapa.
    [SERVICES.partidos]: (ctx): PartidosService => {
      const d = elDiaDeLaSemana(ctx);
      return { version: d.version, deJugador: (id) => d.jugadores.get(id), deEquipo: (club, categoria, letra) => d.equipos.get(`${club}|${letra}|${categoria}`), deLaSemana: () => d.partidos };
    },
  },

  // Apuntarse al club del colegio (kit).
  dynamicActions: (() => {
    const deClubes = accionesDeClubes(CONFIG);
    return (ctx: ReadContext) => [...deClubes(ctx), ...accionesDeEspectador(ctx)];
  })(),

  actions: ligarALugares(
    [...sinEntrenarPorLibreEnSesion(CONFIG, [
      // El entrenador elige dos ejercicios de tipos distintos; la sesión sube solo lo que entrenan (más lo de `SIEMPRE`).
      sesionDeClubConEjercicios(CONFIG, {
        description: 'Entrenamiento con el entrenador y el equipo: él elige dos ejercicios (lo que más te falta, según su criterio) y trabajáis solo eso. Rinde más que entrenar por tu cuenta.',
        tags: [TAGS.fisico, TAGS.cardio, TAGS.entrenamiento, TAGS.club, 'futbol'],
        delta: { [GEN.energia]: -24 },
        catalogo: EJERCICIOS_DE_FUTBOL,
        siempre: SIEMPRE,
        // Los ejercicios los elige el entrenador según lo que le falta al equipo (club y categoría) y son los mismos para todos los que entrenan juntos: los jugadores del
        // equipo, con la misma semilla (club, categoría, semana y número de sesión de la semana), y el personaje.
        contexto: (ctx) => {
          const niveles = ctx.service<NpcDirectory>(SERVICES.npcs)?.nivelesDelEquipo?.(DEPORTE, clubDelJugador(ctx)?.id ?? '', categoriaDelJugador(ctx).competida.id);
          return { nivel: (stat) => niveles?.[stat] ?? ctx.stat(stat), sesgo: sesgoDelEntrenador(entrenadorDelJugador(ctx)?.rasgos?.caracter) };
        },
        semilla: (ctx) => {
          const club = clubDelJugador(ctx);
          return semillaDeSesionDeEquipo(DEPORTE, club?.id ?? 'club', categoriaDelJugador(ctx).competida.id, ctx.time.week, Math.max(0, club?.sesiones.weekdays.indexOf(ctx.time.weekday) ?? 0));
        },
      }),
      dejarClub(CONFIG),
      campamento(CONFIG, {
        tags: [TAGS.fisico, TAGS.cardio, TAGS.entrenamiento, 'futbol', 'campamento'],
        delta: { [GEN.energia]: -35 },
        train: [
          t('futbol.control', 2), t('futbol.pase', 2), t('futbol.regate', 1.5), t('futbol.tecnica', 2), t('futbol.definicion', 1.5), t('futbol.vision', 1.5),
          t('futbol.posicionamiento', 1.5), t('futbol.juego_colectivo', 2.5), t('futbol.arrancada', 1),
          t(GEN.velocidad, 1), t(GEN.resistencia, 1), t(GEN.cooperacion, 0.6), t(CONOCIMIENTO, 3),
        ],
      }),
      conLosAmigos(CONFIG, {
        description: 'Con notas aceptables, el verano se pasa jugando al fútbol con los amigos: sienta bien, pero no se mejora igual que entrenando.',
        tags: [TAGS.fisico, TAGS.social, 'futbol'],
        delta: { [GEN.energia]: -12, [GEN.estres]: -6 },
        train: [...JUEGO_INFORMAL],
      }),

      {
        id: 'futbol.balon',
        name: 'Trabajo con balón',
        description: 'Controles, pases contra la pared, conducciones y regates por tu cuenta.',
        tags: [TAGS.fisico, TAGS.entrenamiento, 'futbol'],
        group: 'Entrenar fútbol',
        duration: 60,
        available: horarioEntreno,
        delta: { [GEN.energia]: -14 },
        train: [t('futbol.control', 2), t('futbol.pase', 1.5), t('futbol.regate', 1.5), t('futbol.tecnica', 2), t(GEN.coordinacion, 0.5), t(CONOCIMIENTO, 0.8)],
      },
      {
        id: 'futbol.tiro',
        name: 'Tiro y remate',
        description: 'Tiros a puerta desde dentro y fuera del área, faltas, penaltis y córners.',
        tags: [TAGS.fisico, TAGS.entrenamiento, 'futbol'],
        group: 'Entrenar fútbol',
        duration: 60,
        available: horarioEntreno,
        delta: { [GEN.energia]: -14 },
        train: [t('futbol.definicion', 2), t('futbol.disparo_lejano', 1.5), t('futbol.penaltis', 1), t('futbol.faltas', 1), t('futbol.corners', 0.6), t('futbol.cabeza', 0.6), t(GEN.fuerza, 0.4), t(CONOCIMIENTO, 0.8)],
      },
      {
        id: 'futbol.fisico',
        name: 'Preparación física',
        description: 'Carreras, cambios de ritmo, saltos y resistencia para aguantar un partido.',
        tags: [TAGS.fisico, TAGS.cardio, TAGS.entrenamiento, 'futbol'],
        group: 'Entrenar fútbol',
        duration: 75,
        available: horarioEntreno,
        delta: { [GEN.energia]: -22, [GEN.estres]: -2 },
        train: [t('futbol.arrancada', 2.5), t('futbol.salto', 1.5), t(GEN.velocidad, 1), t(GEN.resistencia, 1.2), t(GEN.agilidad, 0.5), t(CONOCIMIENTO, 0.5)],
      },
      {
        id: 'futbol.porteria',
        name: 'Entrenar de portero',
        description: 'Paradas, blocajes, salidas y despejes bajo palos.',
        tags: [TAGS.fisico, TAGS.entrenamiento, 'futbol'],
        group: 'Entrenar fútbol',
        duration: 60,
        available: horarioEntreno,
        delta: { [GEN.energia]: -14 },
        train: [t('futbol.reflejos', 2), t('futbol.mano_a_mano', 1.2), t('futbol.blocaje', 1.5), t('futbol.despeje', 1), t('futbol.alcance_aereo', 1), t('futbol.dominio_area', 1), t(GEN.coordinacion, 0.5), t(CONOCIMIENTO, 0.8)],
      },
      verEnLaTele(CONFIG, 'Partidos y resúmenes de otros: aprendes cómo se mueve un equipo y por qué un pase abre la defensa.'),
      pedirConsejo(CONFIG, HABILIDADES_DE_CONSEJO),
    ]), ...ACCIONES_DE_INTENSIDAD, ACCION_DE_UNIRSE_A_LOS_COMPANEROS, ACCION_DE_IR_AL_VESTUARIO, ACCION_DE_JUGAR_EL_PARTIDO],
    {
      // El club del colegio entrena en el campo del colegio. Se puede entrenar por libre en el campo del colegio, el municipal y el parque.
      'futbol.club_sesion': sedeDelClub,
      'futbol.dejar_club': (ctx) => tramitesDe(clubDelJugador(ctx)),
      'futbol.campamento': ['campo_municipal'],
      'futbol.amigos': ['parque'],
      'futbol.balon': ['campo_colegio', 'campo_municipal', 'parque'],
      'futbol.tiro': ['campo_colegio', 'campo_municipal'],
      'futbol.fisico': ['campo_colegio', 'campo_municipal', 'parque'],
      'futbol.porteria': ['campo_colegio', 'campo_municipal'],
      'futbol.ver_tele': ['casa'],
      'futbol.unirse_companeros': (ctx) => [datosDeDeporte(ctx, DEPORTE).competiciones.jornada.lugar],
      'futbol.ir_vestuario': (ctx) => [datosDeDeporte(ctx, DEPORTE).competiciones.jornada.lugar],
      // Se juega en el campo o desde el vestuario (donde puede estar esperando).
      'futbol.jugar_partido': (ctx) => [datosDeDeporte(ctx, DEPORTE).competiciones.jornada.lugar, VESTUARIO],
      'futbol.pedir_consejo': sedeDelClub,
    },
  ),

  // Llegar tarde a la sesión, campamento, entrenar por tu cuenta, conocimiento y sobrecarga (kit), en este orden.
  modifiers: [
    modificadorDeLlegadaTarde(CONFIG),
    modificadorDeCampamento(CONFIG),
    modificadorPorTuCuenta(CONFIG),
    modificadorDeConocimiento(CONFIG),
    modificadorDeSobrecarga(CONFIG),
  ],

  // El primer día, el conocimiento que viene de casa; cada sesión, la cuenta de la sobrecarga (kit); y cada semana, la liga del mundo.
  on: (() => {
    const comunes = manejadoresDeDeporte(CONFIG);
    return {
      ...comunes,
      // La liga del curso existe desde el lunes de la primera semana de competición: el personaje puede jugar su partido el sábado, antes de que se cierre la semana.
      [CORE_EVENTS.DAY_START]: (ctx, ev) => {
        comunes[CORE_EVENTS.DAY_START]?.(ctx, ev);
        if (prepararLiga(ctx, ctx.time)) fotoDelDiaDePartido(ctx);
      },
      // Cada sesión del club cuenta para su asistencia (de las dos últimas semanas): el entrenador la mira al convocar, igual que con cualquiera.
      [CORE_EVENTS.ACTION_DONE]: (ctx, ev) => {
        comunes[CORE_EVENTS.ACTION_DONE]?.(ctx, ev);
        if ((ev.data as ActionDoneData).actionId !== `${DEPORTE}.club_sesion`) return;
        const w = ctx.time.week;
        ctx.updateState<FutbolState>((s) => {
          const recientes = Object.fromEntries(Object.entries(s.sesiones ?? {}).filter(([k]) => Number(k) >= w - 2));
          return { ...s, sesiones: { ...recientes, [w]: (recientes[w] ?? 0) + 1 } };
        });
      },
      [CORE_EVENTS.WEEK_END]: (ctx, ev) => {
        comunes[CORE_EVENTS.WEEK_END]?.(ctx, ev);
        ligaDelMundo(ctx, (ev.data as { week: number }).week);
      },
    };
  })(),
});

export default futbol;
