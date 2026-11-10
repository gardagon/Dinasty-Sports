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
  type ActionContext,
  type PartidoDelMundoData,
  type DeporteView,
  type LectorDePersona,
  type NpcDirectory,
  type ReadContext,
} from '@ds/contracts';
import {
  accionesDeClubes,
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
import { cerrarTemporada, categoriaAcabada, jugarSabadoDeUnaCategoria, nuevaLiga, type JugarPartido, type LigaDelMundo } from './liga';
import { convocarYAlinear, equipoDePartido, jugadoresDelPartido, paraConvocar } from './convocatoria';
import { jugarPartido } from './partido';

export { CATEGORIAS_ESPANA, DATOS_FUTBOL, FICHA_FUTBOL, LUGARES_FUTBOL } from './datos';
export { HABILIDADES_DE_FUTBOL, STATS_DE_FUTBOL } from './habilidades';
export { PUESTOS_DE_FUTBOL } from './puestos';
export { jugarPartido, valorEnPartido, rendimientoPorCansancio, cansancioDelTramo, PARAMETROS_DE_PARTIDO, POTENCIADOR_POR_CATEGORIA, PARTICIPACION_DEL_PUESTO, HABILIDADES_DE_LA_ZONA } from './partido';
export { PARAMETROS_DE_CONVOCATORIA, convocarYAlinear, equipoDePartido, estadoDelPersonaje, paraConvocar, jugadoresDelPartido, posicionEquivalente, prioridadDelEntrenador } from './convocatoria';
export type { Convocatoria, JugadorParaConvocar } from './convocatoria';
export { cerrarTemporada, categoriaAcabada, jugarSabadoDeUnaCategoria, nuevaLiga, tablasDeLaDivision } from './liga';
export type { LigaDelMundo, LigaDeCategoria } from './liga';
export type { EquipoDePartido, EstadisticasDeJugador, Intensidad, JugadorDePartido, OpcionesDePartido, ReglaDeCambios, ResultadoDePartido, Zona } from './partido';
export { EJERCICIOS_DE_FUTBOL, sesgoDelEntrenador } from './ejercicios';

/**
 * MÓDULO FÚTBOL (id `futbol`): fútbol 11, deporte de equipo. **F1: habilidades, conocimiento, entreno por libre y club del colegio.** Todavía no hay
 * partidos, liga ni gente propia más allá del equipo y el entrenador del colegio (F2); posiciones y roles, F3; derivadas y ocultas, F4; clubes de fuera, F5.
 * Lo común a cualquier deporte con club (clubes, entrenador, verano, tele, sobrecarga, conocimiento) lo pone el kit de deporte.
 */

/** Estado del fútbol: los campos comunes del kit y la liga del mundo (todos los equipos de todas las categorías). */
export type FutbolState = EstadoBaseDeDeporte & { liga?: LigaDelMundo };

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

/** La pestaña del fútbol. Todavía sin partidos: enseña las habilidades y los datos del club. */
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
      proxima: 'Los partidos de liga llegan en la siguiente fase del fútbol: de momento se entrena.',
      pruebas: [],
      nombreDePruebas: 'Partidos',
    },
    clasificaciones: [],
    temporadasAnteriores: [],
  };
}

/** Lo que entrenan las sesiones, de menos a más: libre (técnica o físico), club y campamento. */
const t = (stat: string, amount: number) => ({ stat, amount });

/** Para medir (`npm run liga`): se avisa de cada sábado de liga con lo que ha tardado y cuántos partidos ha jugado. No cambia nada del juego. */
export const DIAGNOSTICO_DE_LIGA: { alSabado?: (d: { ms: number; partidos: number; semana: number }) => void } = {};

/** Los cambios de un partido de liga (dato por categoría y nivel; de momento 5 en 3 paradas, para todas: `MOTOR_PARTIDOS.md` §6). */
const CAMBIOS_DE_LIGA = { maximo: 5, despuesDeTramos: [1, 3, 4] };

/**
 * **LA LIGA DEL MUNDO** (F2.3b): cada sábado de clase, desde que acaba la pretemporada, todos los equipos de todas las categorías juegan su jornada (o el playoff de la última división), esté o no el personaje: el motor
 * con las plantillas de verdad (convocatoria del entrenador, estado de cada jugador), y a quienes juegan les cambia el estado como tras una carrera (`partido.mundo`). Al empezar un curso se arman las divisiones (al
 * crear la partida, por lo que vale cada equipo; después, con los ascensos y descensos de la temporada anterior) y al acabar la temporada se cierran.
 */
function ligaDelMundo(ctx: ActionContext, semana: number): void {
  const dir = ctx.service<NpcDirectory>(SERVICES.npcs);
  const datos = datosDeDeporte(ctx, DEPORTE);
  const f = datos.temporada.liga?.divisiones;
  if (!dir?.equiposDeLaCategoria || !dir.plantillaDelEquipo || !f) return;
  const t = ctx.timeAt(semana * 7 * MINUTES_PER_DAY);
  let liga = ctx.state<FutbolState>().liga;
  const guardar = (l: LigaDelMundo): void => void ctx.updateState<FutbolState>((s) => ({ ...s, liga: l }));
  // Un curso nuevo cierra la temporada anterior si no se había cerrado (una temporada cortada se decide por la clasificación).
  if (liga && liga.curso !== t.schoolYear && !liga.cerrada) {
    liga = cerrarTemporada(liga, f, liga.semilla);
    guardar(liga);
  }
  if (t.period !== 'clase' || t.schoolWeek < semanasDeTemporada(ctx.pais.calendario, datos.temporada).primeraCompeticion) return;
  if (!liga || liga.curso !== t.schoolYear) {
    const equipos = Object.fromEntries(datos.categorias.map((c) => [c.id, dir.equiposDeLaCategoria!(DEPORTE, c.id)]).filter(([, es]) => (es as unknown[]).length));
    liga = nuevaLiga(t.schoolYear, liga?.semilla ?? Math.floor(ctx.rng.next() * 2 ** 31), equipos as never, f, liga?.siguiente, liga?.campeones);
  }
  if (liga.cerrada) return;
  const jugar: JugarPartido = (categoria, local, visitante, id) => {
    const lado = (clave: string) => {
      const [club, letra] = clave.split('|');
      const plantilla = dir.plantillaDelEquipo!(DEPORTE, club, categoria, letra);
      const c = convocarYAlinear(plantilla.map((j) => paraConvocar(j)));
      return { plantilla, c };
    };
    const a = lado(local);
    const b = lado(visitante);
    // Un equipo que no puede alinear a once pierde el partido por 3 a 0 (no pasa con las plantillas de la ciudad: tienen al menos 14).
    if (a.c.titulares.length < 11 || b.c.titulares.length < 11) return { goles: a.c.titulares.length < 11 ? [0, 3] : [3, 0], jugadores: [] };
    const r = jugarPartido(equipoDePartido(local, local, a.plantilla, a.c), equipoDePartido(visitante, visitante, b.plantilla, b.c), { id, semilla: liga!.semilla, categoria, cambios: CAMBIOS_DE_LIGA });
    return { goles: r.goles, jugadores: [...jugadoresDelPartido(r, 0), ...jugadoresDelPartido(r, 1)] };
  };
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
  },

  // Apuntarse al club del colegio (kit).
  dynamicActions: accionesDeClubes(CONFIG),

  actions: ligarALugares(
    sinEntrenarPorLibreEnSesion(CONFIG, [
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
    ]),
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
      [CORE_EVENTS.WEEK_END]: (ctx, ev) => {
        comunes[CORE_EVENTS.WEEK_END]?.(ctx, ev);
        ligaDelMundo(ctx, (ev.data as { week: number }).week);
      },
    };
  })(),
});

export default futbol;
