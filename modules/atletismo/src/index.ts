import {
  GEN,
  SERVICES,
  SHARED_EVENTS,
  TAGS,
  APORTES,
  CORE_EVENTS,
  MINUTES_PER_DAY,
  factorDeCompeticion,
  factorPorForma,
  type CategoriaDef,
  type CompeticionDelMundoData,
  type FormatoDeCarrera,
  type TimeView,
  datosDeDeporte,
  semanasDeTemporada,
  textoConPais,
  categoriaSuperior,
  defineModule,
  inHours,
  ligarALugares,
  type ActionContext,
  type CompetitionResultData,
  type DeporteView,
  type LogTable,
  claveDeDeporte,
  type NpcDirectory,
  rngEstable,
  type LectorDePersona,
  type ReadContext,
  type Rng,
} from '@ds/contracts';
import {
  accionesDeCategoria,
  accionesDeClubes,
  campamento,
  categoriaDelJugador as categoriaDelJugadorEn,
  categoriasDe,
  clubDelJugador as clubDelJugadorEn,
  conLosAmigos,
  conocimientoDelDeporte,
  dejarClub,
  entrenadorDelJugador as entrenadorDelJugadorEn,
  habilidadDeportiva,
  idDeConocimiento,
  manejadoresDeDeporte,
  modificadorDeCampamento,
  modificadorDeConocimiento,
  modificadorDeLlegadaTarde,
  modificadorDeSobrecarga,
  modificadorPorTuCuenta,
  nombreDeCategoria as nombreDeCategoriaEn,
  orden,
  pedirConsejo,
  recorte,
  sedeDelClub as sedeDelClubEn,
  sesionDeClub,
  sinEntrenarPorLibreEnSesion,
  textoDeSesiones,
  tramitesDe,
  valorEfectivo,
  verEnLaTele,
  type Apoyo,
  type ConfigDeporte,
  type EstadoBaseDeDeporte,
} from '@ds/kit-deporte';
import {
  anotarEnTabla,
  clasificarPrueba,
  finalistasDe,
  ordenDeTabla,
  plazasConReservas,
  probabilidadDeAcudir,
  recortarPruebas,
  repartirEnSeries,
  type FilaGuardada,
  type PruebaGuardada,
  type PuestoEnPrueba,
  type ResultadoDeSemifinal,
  type TablaDeCategoria,
  type TipoDePrueba,
  type UltimoPuesto,
} from './temporada';
import { DATOS_ATLETISMO, FICHA_ATLETISMO, LUGARES_ATLETISMO } from './datos';
import { CONOCIMIENTO, DEPORTE, JUEGO_INFORMAL, SESION_DE_CLUB, STATS_DE_ATLETISMO } from './habilidades';

export { CATEGORIAS_ESPANA, DATOS_ATLETISMO, LUGARES_ATLETISMO } from './datos';

/**
 * MÓDULO ATLETISMO (id `atletismo`) — el deporte más sencillo de modelar:
 * individual, sin posiciones ni tácticas. Prueba: 400 m lisos.
 *
 * 3 habilidades propias apoyadas en genéricas, entrenamientos por la tarde, competición semanal y resultado publicado con el
 * evento compartido `competicion.resultado` (los NPCs reaccionan sin conocer este módulo). Lo común a cualquier deporte con
 * club (clubes, entrenador, categorías, verano, tele, sobrecarga, conocimiento) lo pone el kit de deporte (`@ds/kit-deporte`);
 * aquí queda lo propio del atletismo: el rendimiento, la marca, las carreras y sus clasificaciones.
 */

/** Las clasificaciones por categoría (cada corredor por su id, `yo` el personaje): ver `anotarEnTabla`. */
export interface TablasDeAtletismo {
  curso: number;
  trimestre: number;
  temporada: Record<string, TablaDeCategoria>;
  trimestres: Record<string, TablaDeCategoria>;
}

/** Estado del atletismo: los campos comunes del kit (`EstadoBaseDeDeporte`) y los de las carreras. */
export interface AtletismoState extends EstadoBaseDeDeporte {
  mejorMarca: number | null;
  carreras: { week: number; position: number; total: number; mark: number; categoria?: string; superior?: boolean }[];
  ultimaSemanaCarrera: number;
  /** Cómo quedó cada rival la última vez que corrió (puesto y corredores de su serie): quien quedó último falla más la próxima. */
  ultimoPuesto?: Record<string, UltimoPuesto>;
  /** Las clasificaciones de las categorías con todas las pruebas del mundo (no solo las del personaje): la de la temporada y la del trimestre en curso. De la del trimestre salen las plazas de la semifinal. */
  tablas?: TablasDeAtletismo;
  /** Quiénes pasan de la semifinal a la final en cada categoría (el trimestre en curso): las series de la semifinal por puesto y todos por tiempo (`yo` = el personaje). */
  finales?: Record<string, { curso: number; trimestre: number; sf: ResultadoDeSemifinal }>;
  /** Las pruebas que el personaje ya ha corrido esa semana (`categoria|tipo`): el mundo no las repite. */
  corridasPorElJugador?: { semana: number; claves: string[] };
  /** Todas las pruebas que ha disputado, con la clasificación completa de las de este curso y el anterior (para la pestaña del deporte). */
  resultados?: PruebaGuardada[];
  /** Resultados de semifinales y finales (`clasificatoria` es el nombre antiguo de las semifinales). */
  campeonatos?: { curso: number; categoria: string; tipo: Exclude<TipoDePrueba, 'regular'>; position: number; total: number }[];
}

const DISCIPLINA = '400 m';
const ENTRENOS_LIBRES = ['atletismo.series', 'atletismo.rodaje', 'atletismo.tecnica'];

/** Lo que el kit de deporte necesita saber del atletismo. */
const CONFIG: ConfigDeporte = {
  id: DEPORTE,
  nombre: 'atletismo',
  rendimiento: (ctx) => rendimiento(ctx),
  entrenosLibres: ENTRENOS_LIBRES,
  juegoInformal: JUEGO_INFORMAL,
};

const clubDelJugador = (ctx: ReadContext) => clubDelJugadorEn(ctx, DEPORTE);
const sedeDelClub = (ctx: ReadContext) => sedeDelClubEn(ctx, CONFIG);
const categoriaDelJugador = (ctx: ReadContext) => categoriaDelJugadorEn(ctx, CONFIG);
const entrenadorDelJugador = (ctx: ReadContext) => entrenadorDelJugadorEn(ctx, DEPORTE);
const nombreDeCategoria = (ctx: ReadContext, id: string) => nombreDeCategoriaEn(ctx, CONFIG, id);

const mediana = (xs: number[]): number => {
  const o = [...xs].sort((a, b) => a - b);
  return o.length ? (o.length % 2 ? o[(o.length - 1) / 2] : (o[o.length / 2 - 1] + o[o.length / 2]) / 2) : 0;
};

/**
 * ¿Puede pedir competir en la categoría superior? Solo si destaca mucho en la suya (sube al podio casi siempre)
 * y sería competitivo arriba (al menos en la mitad de la categoría superior): subir para quedar en la cola no tiene sentido.
 */
function puedeSubir(ctx: ReadContext): true | string {
  const { propia, superior } = categoriaDelJugador(ctx);
  if (superior) return 'Ya compites en la categoría superior';
  const sup = categoriaSuperior(categoriasDe(ctx, CONFIG), propia);
  if (!sup) return 'No hay categoría superior';
  const recientes = ctx.state<AtletismoState>().carreras.filter((c) => c.categoria === propia.id && !c.superior).slice(-5);
  if (recientes.length < 4) return 'Aún no has competido lo suficiente en tu categoría';
  if (recientes.filter((c) => c.position <= 2).length < 3) return 'Todavía no destacas lo bastante en tu categoría';
  const arriba = ctx.service<NpcDirectory>(SERVICES.npcs)?.list({ tag: 'atleta', minAge: sup.edadMin, maxAge: sup.edadMax });
  if (arriba?.length && rendimiento(ctx) < mediana(arriba.map((n) => n.levels.atletismo ?? 0))) {
    return `En ${sup.nombre} todavía no serías competitivo`;
  }
  return true;
}

/**
 * La temporada, en semanas del curso (0 = la primera) y con el calendario del país: la pretemporada (se entrena pero todavía no hay carreras) y las
 * semifinales y la final del campeonato (sábados consecutivos). Salen de los datos del deporte (`datos.ts`), que las dan relativas al final de las clases.
 */
// Un campeonato al final de cada trimestre (semanas relativas al final del trimestre, en los datos del deporte).
const semanas = (ctx: ReadContext) => semanasDeTemporada(ctx.pais.calendario, datosDeDeporte(ctx, DEPORTE).temporada);
/** El campeonato nacional del país de la partida («campeonato de España»). */
const campeonato = (ctx: ReadContext) => textoConPais(datosDeDeporte(ctx, DEPORTE).competiciones.campeonato, ctx);

const horarioEntreno = (ctx: ReadContext): true | string => {
  const t = ctx.time;
  // Sin clase (fines de semana y vacaciones) las pistas abren todo el día.
  if (!t.isSchoolDay) return inHours(t, 8, 20) ? true : 'Las pistas abren de 8 a 20 sin clase (fines de semana y vacaciones)';
  return inHours(t, 15, 21) ? true : 'Entrenamientos entre semana de 15 a 21';
};

/**
 * Lo que depende de entender la carrera vale de ×0,85 (no conoces el deporte: fallas la colocación, el ritmo, el momento
 * de la salida) a ×1,15 (lo conoces a fondo) según el conocimiento (`valorEfectivo`, del kit). Lo puramente físico
 * (velocidad, resistencia) no cambia: saber de atletismo no te hace más lento. La sensibilidad dice cuánto depende cada
 * habilidad del conocimiento.
 */
const SENSIBILIDAD = { tecnica: 0.5, ritmo: 1, salida: 1 };

/** Valor efectivo de una habilidad táctica en competición: su nivel por el efecto del conocimiento. */
const efectivo = (ctx: LectorDePersona, key: keyof typeof SENSIBILIDAD): number => valorEfectivo(ctx, DEPORTE, `atletismo.${key}`, SENSIBILIDAD[key]);

/** Rendimiento 0..100 a partir de las stats (el corazón del deporte; ajustable sin tocar nada más). */
export function rendimiento(ctx: LectorDePersona): number {
  return (
    0.25 * ctx.stat(GEN.velocidad) +
    0.2 * ctx.stat(GEN.resistencia) +
    0.25 * efectivo(ctx, 'tecnica') +
    0.15 * efectivo(ctx, 'ritmo') +
    0.15 * efectivo(ctx, 'salida')
  );
}

/** Marca de 400 m (segundos) a partir del rendimiento: 30 → ~69 s, 70 → ~57 s. */
export function marca400(perf: number, rng: Rng): number {
  const t = 78 - perf * 0.3 + rng.normal() * 0.9;
  return Math.round(t * 100) / 100;
}

/** Sin personas del mundo (el módulo solo) la prueba se completa con corredores genéricos hasta una serie. */
const GENERICOS_SIN_MUNDO = 7;
/** Las cifras de las pruebas si los datos del deporte no las traen (los de España las traen). */
const FORMATO_POR_DEFECTO: FormatoDeCarrera = { maxPorSerie: 8, semifinal: { plazas: 16, reservas: 2 }, final: { plazas: 8, porSerie: 4, reservasPorSerie: 2 } };
const formatoDeCarrera = (ctx: ReadContext): FormatoDeCarrera => datosDeDeporte(ctx, DEPORTE).temporada.formatoDeCarrera ?? FORMATO_POR_DEFECTO;

interface Corredor {
  npcId?: string;
  name: string;
  /** Cómo se le llama en los textos (su apodo o su nombre de pila). */
  corto?: string;
  club?: string;
  level: number;
}

/** Rivales genéricos: sin personas del mundo, rellenan la prueba hasta completar una serie. */
function rivalesGenericos(n: number, week: number, rng: Rng) {
  return Array.from({ length: n }, (_, i) => ({
    name: `Corredor ${i + 1}`,
    level: Math.min(85, 25 + week * 0.5 + rng.range(0, 20)),
  }));
}

type TipoCarrera = 'regular' | 'semifinal' | 'final';

const nombreDeTipo = (ctx: ReadContext, tipo: TipoDePrueba): string =>
  // `clasificatoria` es el nombre antiguo de las semifinales (partidas guardadas).
  ({ regular: '', clasificatoria: ' · semifinal del campeonato', semifinal: ' · semifinal del campeonato', final: ` · final del ${campeonato(ctx)}` })[tipo];

/** Un corredor que corre una prueba: con su marca ya sorteada y, si es el personaje, `isPlayer`. */
interface Corre extends Corredor {
  mark: number;
  isPlayer?: boolean;
}

/**
 * Quiénes de los candidatos se presentan a una prueba: los mejores casi siempre y los peores (y quien quedó último la vez anterior) bastante menos
 * (`probabilidadDeAcudir`). La tirada de cada uno es solo suya (él, la semana y el tipo de prueba), no cambia con lo que haga el personaje. **Corre todo el que se presenta**:
 * no hay límite de plazas ni se completa con nadie que no haya acudido.
 */
function quienesAcuden(candidatos: readonly Corredor[], previos: Record<string, UltimoPuesto>, week: number, tipo: TipoCarrera): { acuden: Corredor[]; faltan: Corredor[] } {
  const orden = [...candidatos].sort((a, b) => b.level - a.level);
  const bono = tipo === 'regular' ? 0 : BONO_DE_CAMPEONATO;
  const acuden: Corredor[] = [];
  const faltan: Corredor[] = [];
  orden.forEach((c, i) => {
    const percentil = orden.length > 1 ? i / (orden.length - 1) : 0;
    const p = probabilidadDeAcudir(percentil, c.npcId ? previos[c.npcId] : undefined, bono);
    (rngEstable('asistencia', c.npcId ?? c.name, week, tipo).chance(p) ? acuden : faltan).push(c);
  });
  return { acuden, faltan };
}

/** En las pruebas de campeonato se presenta más gente (se preparan más). */
const BONO_DE_CAMPEONATO = 0.08;

/** Los atletas de una categoría que pueden correr (los de baja no), con su nivel por su estado. */
function candidatosDe(ctx: ReadContext, cat: CategoriaDef): Corredor[] {
  const npcs = ctx.service<NpcDirectory>(SERVICES.npcs);
  if (!npcs) return [];
  return npcs
    .list({ tag: 'atleta', minAge: cat.edadMin, maxAge: cat.edadMax })
    .filter((n) => !n.estadoDeJuego?.baja)
    .map((n) => ({ npcId: n.id, name: n.name, corto: n.nombreCorto, club: n.club, level: (n.levels.atletismo ?? 30) * factorDeCompeticion(n.estadoDeJuego?.eficiencia ?? 1) }));
}

/** Qué prueba toca una semana de clase: la semifinal o la final del campeonato de su trimestre, o la jornada normal. */
function pruebaDeLaSemana(ctx: ReadContext, t: TimeView): TipoCarrera {
  const c = semanas(ctx).campeonatos?.find((x) => x.trimestre === t.term);
  return c && t.schoolWeek === c.semifinal ? 'semifinal' : c && t.schoolWeek === c.final ? 'final' : 'regular';
}

/** La clasificación del trimestre de una categoría (solo si es la del trimestre en curso). */
const tablaDelTrimestre = (s: AtletismoState, t: TimeView, categoria: string): TablaDeCategoria | undefined =>
  s.tablas && s.tablas.curso === t.schoolYear && s.tablas.trimestre === t.term ? s.tablas.trimestres[categoria] : undefined;

/** Quiénes corren una prueba: los atletas que acuden y, si el personaje compite, si tiene sitio. */
interface Convocatoria {
  corren: Corredor[];
  faltan: Corredor[];
  conJugador: boolean;
}

/**
 * La convocatoria única de una prueba (la misma para todas las categorías, con o sin el personaje). Regular: corre todo el que se presenta. Semifinal: de la clasificación del
 * trimestre en su categoría, los que acuden entre los mejores (con reservas para las bajas y ausencias). Final: los mejores de cada serie de la semifinal (y sus reservas).
 * `jugadorCompite` dice si el personaje decide correr: si no, no ocupa plaza.
 */
function convocar(ctx: ReadContext, cat: CategoriaDef, tipo: TipoCarrera, semana: number, t: TimeView, jugadorCompite: boolean): Convocatoria {
  const fmt = formatoDeCarrera(ctx);
  const s = ctx.state<AtletismoState>();
  const previos = s.ultimoPuesto ?? {};
  const candidatos = candidatosDe(ctx, cat);
  if (tipo === 'regular') {
    const { acuden, faltan } = quienesAcuden(candidatos, previos, semana, tipo);
    return { corren: acuden, faltan, conJugador: jugadorCompite };
  }
  const porId = new Map(candidatos.map((c) => [c.npcId!, c]));
  const deNpc = (ids: readonly string[]) => ids.map((id) => porId.get(id)).filter((c): c is Corredor => !!c);
  if (tipo === 'semifinal') {
    const claves = ordenDeTabla(tablaDelTrimestre(s, t, cat.id)).slice(0, fmt.semifinal.plazas + fmt.semifinal.reservas);
    const { acuden, faltan } = quienesAcuden(deNpc(claves), previos, semana, tipo);
    const acudenIds = new Set(acuden.map((c) => c.npcId));
    const elegidos = new Set(plazasConReservas(claves.map((k) => ({ clave: k, acude: k === 'yo' ? jugadorCompite : acudenIds.has(k) })), fmt.semifinal.plazas, fmt.semifinal.reservas).map((e) => e.clave));
    return { corren: acuden.filter((c) => elegidos.has(c.npcId!)), faltan, conJugador: elegidos.has('yo') };
  }
  const fin = s.finales?.[cat.id];
  if (!fin || fin.curso !== t.schoolYear || fin.trimestre !== t.term) return { corren: [], faltan: [], conJugador: false };
  const { acuden, faltan } = quienesAcuden(deNpc(fin.sf.general), previos, semana, tipo);
  const acudenIds = new Set(acuden.map((c) => c.npcId));
  const elegidos = new Set(finalistasDe(fin.sf, (id) => (id === 'yo' ? jugadorCompite : acudenIds.has(id)), fmt.final));
  return { corren: acuden.filter((c) => elegidos.has(c.npcId!)), faltan, conJugador: elegidos.has('yo') };
}

/** Una prueba ya corrida: las series con cada corredor clasificado (puesto en su serie y en la general) y los que no se presentaron. */
interface ResultadoDePrueba {
  cat: CategoriaDef;
  tipo: TipoCarrera;
  semana: number;
  series: (Corre & PuestoEnPrueba)[][];
  /** Todos, por la clasificación general (por tiempos). */
  todos: (Corre & PuestoEnPrueba)[];
  faltan: Corredor[];
}

/**
 * Corre una prueba de una categoría: la convocatoria única, las marcas (cada rival con su propio azar, el mismo con o sin el personaje) y las series equilibradas con su
 * clasificación general. Con menos de 2 corredores no se corre (`undefined`). No cambia el estado: eso lo hace `registrar`.
 */
function correrPrueba(ctx: ActionContext, cat: CategoriaDef, tipo: TipoCarrera, semana: number, jugador?: { level: number; mark: number }): ResultadoDePrueba | undefined {
  const t = ctx.timeAt(semana * 7 * MINUTES_PER_DAY);
  const conv = convocar(ctx, cat, tipo, semana, t, !!jugador);
  const rivales: Corre[] = conv.corren.map((r) => ({ ...r, mark: marca400(r.level, rngEstable('marca', r.npcId ?? r.name, semana, tipo)) }));
  if (!ctx.service<NpcDirectory>(SERVICES.npcs)) {
    for (const g of rivalesGenericos(GENERICOS_SIN_MUNDO - rivales.length, semana, ctx.rng)) rivales.push({ ...g, mark: marca400(g.level, rngEstable('marca', g.name, semana, tipo)) });
  }
  const todos: Corre[] = [...(jugador ? [{ name: 'Tú', level: jugador.level, mark: jugador.mark, isPlayer: true }] : []), ...rivales];
  if (todos.length < 2) return undefined;
  const series = clasificarPrueba(repartirEnSeries(todos.map((c) => ({ ...c, nivel: c.level })), formatoDeCarrera(ctx).maxPorSerie));
  return { cat, tipo, semana, series, todos: series.flat().sort((a, b) => a.puesto - b.puesto || a.serie - b.serie), faltan: conv.faltan };
}

/**
 * Anota pruebas ya corridas en el mundo: la clasificación del trimestre y de la temporada de cada categoría (con todas sus pruebas), cómo quedó cada uno la última vez, quiénes pasan
 * de la semifinal a la final, y avisa con `competicion.mundo` para que cada jugador guarde su historial y su ánimo cambie.
 */
function registrar(ctx: ActionContext, pruebas: readonly ResultadoDePrueba[], t: TimeView): void {
  if (!pruebas.length) return;
  const s = ctx.state<AtletismoState>();
  const delCurso = s.tablas && s.tablas.curso === t.schoolYear ? s.tablas : { curso: t.schoolYear, trimestre: t.term, temporada: {}, trimestres: {} };
  let tablas: TablasDeAtletismo = delCurso.trimestre === t.term ? delCurso : { ...delCurso, trimestre: t.term, trimestres: {} };
  const ultimoPuesto = { ...s.ultimoPuesto };
  const finales = { ...s.finales };
  for (const p of pruebas) {
    const filas = p.todos.filter((c) => c.isPlayer || c.npcId).map((c) => ({ clave: c.isPlayer ? 'yo' : c.npcId!, puesto: c.puesto, marca: c.mark }));
    tablas = {
      ...tablas,
      temporada: { ...tablas.temporada, [p.cat.id]: anotarEnTabla(tablas.temporada[p.cat.id], filas, p.tipo) },
      trimestres: { ...tablas.trimestres, [p.cat.id]: anotarEnTabla(tablas.trimestres[p.cat.id], filas, p.tipo) },
    };
    for (const serie of p.series) for (const c of serie) if (c.npcId) ultimoPuesto[c.npcId] = { posicion: c.puestoEnSerie, total: serie.length };
    if (p.tipo === 'semifinal') {
      const id = (c: Corre) => (c.isPlayer ? 'yo' : c.npcId);
      const conId = (xs: Corre[]) => xs.map(id).filter((x): x is string => !!x);
      finales[p.cat.id] = { curso: t.schoolYear, trimestre: t.term, sf: { series: p.series.map((serie) => conId([...serie].sort((a, b) => a.puestoEnSerie - b.puestoEnSerie))), general: conId(p.todos) } };
    }
  }
  const mias = pruebas.filter((p) => p.todos.some((c) => c.isPlayer)).map((p) => `${p.cat.id}|${p.tipo}`);
  const previas = s.corridasPorElJugador?.semana === pruebas[0].semana ? s.corridasPorElJugador.claves : [];
  ctx.updateState<AtletismoState>((e) => ({
    ...e,
    tablas,
    ultimoPuesto,
    finales,
    corridasPorElJugador: mias.length || previas.length ? { semana: pruebas[0].semana, claves: [...previas, ...mias] } : e.corridasPorElJugador,
  }));
  ctx.emit<CompeticionDelMundoData>({
    type: SHARED_EVENTS.COMPETICION_MUNDO,
    data: {
      deporte: DEPORTE,
      semana: pruebas[0].semana,
      curso: t.schoolYear,
      pruebas: pruebas.map((p) => ({
        tipo: p.tipo,
        categoria: p.cat.id,
        resultados: p.todos.filter((c) => c.npcId).map((c) => ({ npcId: c.npcId!, puesto: c.puesto, total: p.todos.length, marca: c.mark, serie: c.serie + 1 })),
      })),
    },
  });
}

/**
 * LAS PRUEBAS DEL MUNDO: cada semana de competición se corre una prueba en cada categoría (la jornada normal, o la semifinal o la final del campeonato del trimestre),
 * corra o no el personaje. Si el personaje ya la ha corrido en su categoría esta semana, esa prueba es la del mundo (no se corre dos veces): lo que él haga cuenta para los
 * demás (puestos, historial, ánimo), pero no cambia el azar de ninguno.
 */
function carrerasDelMundo(ctx: ActionContext, semana: number): void {
  if (!ctx.service<NpcDirectory>(SERVICES.npcs)) return;
  const t = ctx.timeAt(semana * 7 * MINUTES_PER_DAY);
  if (t.period !== 'clase' || t.schoolWeek < semanas(ctx).primeraCompeticion) return;
  const tipo = pruebaDeLaSemana(ctx, t);
  const s = ctx.state<AtletismoState>();
  const hechas = new Set(s.corridasPorElJugador?.semana === semana ? s.corridasPorElJugador.claves : []);
  const pruebas: ResultadoDePrueba[] = [];
  for (const cat of categoriasDe(ctx, CONFIG)) {
    if (hechas.has(`${cat.id}|${tipo}`)) continue;
    const r = correrPrueba(ctx, cat, tipo, semana);
    if (r) pruebas.push(r);
  }
  registrar(ctx, pruebas, t);
}

/** Las semanas del curso de la semifinal o la final de cada trimestre, para los textos: «la semana 14», «las semanas 14, 28 y 40». */
function semanasDelCampeonato(ctx: ReadContext, cual: 'semifinal' | 'final'): string {
  const n = (semanas(ctx).campeonatos ?? []).map((c) => c[cual] + 1);
  if (n.length < 2) return `la semana ${n[0] ?? '?'} del curso`;
  return `las semanas ${n.slice(0, -1).join(', ')} y ${n[n.length - 1]} del curso`;
}

/** ¿Puede el personaje correr hoy esta prueba? `true` o el motivo (en español). */
function puedeCorrer(ctx: ReadContext, tipo: TipoCarrera): true | string {
  const t = ctx.time;
  if (ctx.stat(GEN.baja) > 0) return 'Estás de baja por una lesión: no puedes competir';
  if (ctx.state<AtletismoState>().ultimaSemanaCarrera === t.week) return 'Ya has competido esta semana';
  if (t.period !== 'clase') return 'No hay carreras en vacaciones';
  const sem = semanas(ctx);
  if (t.schoolWeek < sem.primeraCompeticion) return 'Pretemporada: todavía no hay carreras';
  const toca = pruebaDeLaSemana(ctx, t);
  if (toca !== tipo) {
    if (tipo === 'regular') return toca === 'semifinal' ? 'Esta semana son las semifinales del campeonato' : 'Esta semana es la final del campeonato';
    const c = sem.campeonatos?.find((x) => x.trimestre === t.term);
    return c ? `${tipo === 'semifinal' ? 'Las semifinales' : 'La final'} del campeonato son en la semana ${(tipo === 'semifinal' ? c.semifinal : c.final) + 1} del curso` : 'No hay campeonato este trimestre';
  }
  if (!(t.weekday === 5 && inHours(t, 9, 13))) return 'Las carreras son los sábados de 9 a 13';
  const conv = convocar(ctx, categoriaDelJugador(ctx).competida, tipo, t.week, t, true);
  if (!conv.conJugador) {
    return tipo === 'semifinal'
      ? `No estás entre los ${formatoDeCarrera(ctx).semifinal.plazas} mejores de la clasificación del trimestre en tu categoría`
      : 'No has pasado la semifinal de este trimestre';
  }
  if (!conv.corren.length && ctx.service<NpcDirectory>(SERVICES.npcs)) return 'Hoy no se ha presentado nadie más: no se corre';
  return true;
}

/** Corre la prueba del personaje (jornada, semifinal o final) y aplica todas sus consecuencias. */
function disputar(ctx: ActionContext, tipo: TipoCarrera): void {
  const t = ctx.time;
  // El día cuenta: cansancio, salud, motivación y su forma ya vienen en la eficiencia.
  const miNivel = rendimiento(ctx) * factorDeCompeticion(ctx.efficiency) * factorPorForma(ctx.stat(GEN.forma));
  const miMarca = marca400(miNivel, ctx.rng);

  // Compite en su categoría por edad (o en la superior si ha subido): solo corren atletas de esas edades.
  const { propia, competida, superior } = categoriaDelJugador(ctx);
  const r = correrPrueba(ctx, competida, tipo, t.week, { level: miNivel, mark: miMarca });
  if (!r) {
    ctx.log('No se ha presentado nadie más: hoy no se corre.', 'aviso');
    return;
  }
  registrar(ctx, [r], t);
  const estado = ctx.state<AtletismoState>();
  const fmt = formatoDeCarrera(ctx);
  const yo = r.todos.find((c) => c.isPlayer)!;
  const position = yo.puesto;
  const total = r.todos.length;
  const miSerie = r.series[yo.serie];
  const participants: CompetitionResultData['participants'] = r.todos.map((c) => ({ name: c.name, mark: c.mark, ...(c.npcId ? { npcId: c.npcId } : {}), ...(c.isPlayer ? { isPlayer: true } : {}) }));
  const rivales = r.todos.filter((c) => !c.isPlayer);
  const faltan = r.faltan;

  const miClub = clubDelJugador(ctx)?.nombre;
  const clubes = new Map<string, string>(rivales.filter((c) => c.club).map((c) => [c.name, c.club!]));
  if (miClub) clubes.set('Tú', miClub);
  const record = estado.mejorMarca === null || miMarca < estado.mejorMarca;
  // Se guarda la clasificación general de la prueba (todas las series juntas por tiempos): así puntúa la temporada.
  const filas: FilaGuardada[] = r.todos.map((c) => ({ nombre: c.name, club: clubes.get(c.name) ?? '', marca: c.mark, ...(c.npcId ? { npcId: c.npcId } : {}), ...(c.isPlayer ? { yo: true } : {}) }));
  const prueba: PruebaGuardada = { curso: t.schoolYear, semana: t.week, tipo, categoria: competida.id, superior, posicion: position, total, marca: miMarca, record, filas, serie: yo.serie + 1, series: r.series.length };
  const base = {
    ...estado,
    resultados: recortarPruebas([...(estado.resultados ?? []), prueba], t.schoolYear),
    mejorMarca: record ? miMarca : estado.mejorMarca,
    ultimaSemanaCarrera: t.week,
    categoriaPropia: propia.id,
    categoriaSuperior: superior,
  };

  let cierre = '';
  if (tipo === 'regular') {
    ctx.setState<AtletismoState>({ ...base, carreras: [...estado.carreras, { week: t.week, position, total, mark: miMarca, categoria: competida.id, superior }].slice(-52) });
  } else {
    const resultados = [...(estado.campeonatos ?? []), { curso: t.schoolYear, categoria: competida.id, tipo, position, total }].slice(-20);
    ctx.setState<AtletismoState>({ ...base, campeonatos: resultados });
    if (tipo === 'semifinal') {
      const pasa = yo.puestoEnSerie <= fmt.final.porSerie;
      const reserva = !pasa && yo.puestoEnSerie <= fmt.final.porSerie + fmt.final.reservasPorSerie;
      const campeonatos = semanas(ctx).campeonatos?.find((c) => c.trimestre === t.term);
      const dondeFinal = campeonatos ? ` el sábado de la semana ${campeonatos.final + 1}` : '';
      const otras = r.series.filter((s) => s !== miSerie).map((s) => [...s].sort((a, b) => a.puestoEnSerie - b.puestoEnSerie).slice(0, fmt.final.porSerie).map((c) => c.corto ?? c.name.split(' ')[0]).join(', '));
      cierre =
        (pasa
          ? ` ¡Pasas a la final del ${campeonato(ctx)},${dondeFinal}!`
          : reserva
            ? ` Quedas de reserva para la final: entras si algún finalista no acude.`
            : ` No pasas a la final (pasan los ${fmt.final.porSerie} primeros de cada serie): a por la del próximo trimestre.`) + (otras.length ? ` De ${otras.length > 1 ? 'las otras series pasan' : 'la otra serie pasan'}: ${otras.join(' / ')}.` : '');
    } else {
      const medalla = ['oro', 'plata', 'bronce'][position - 1];
      cierre = medalla ? ` ¡Medalla de ${medalla}!` : '';
    }
  }
  if (faltan.length) cierre += ` No se han presentado ${faltan.length} ${faltan.length === 1 ? 'corredor' : 'corredores'}.`;

  const ganador = r.todos[0].mark;
  const variasSeries = r.series.length > 1;
  const tabla = {
    header: variasSeries ? ['Pos.', 'Corredor', 'Club', 'Serie', 'Tiempo', 'Dif.'] : ['Pos.', 'Corredor', 'Club', 'Tiempo', 'Dif.'],
    rows: r.todos.map((p, i) => [
      `${i + 1}º`,
      p.name,
      clubes.get(p.name) ?? '—',
      ...(variasSeries ? [String(p.serie + 1)] : []),
      `${p.mark.toFixed(2)} s`,
      i === 0 ? '—' : `+${(p.mark - ganador).toFixed(2)}`,
    ]),
    highlight: position - 1,
    align: (variasSeries ? ['left', 'left', 'left', 'right', 'right', 'right'] : ['left', 'left', 'left', 'right', 'right']) as ('left' | 'right')[],
  };
  const dif = position === 1 ? '' : `, a ${(miMarca - ganador).toFixed(2)} s del 1º`;
  const serieTexto = variasSeries ? ` (serie ${yo.serie + 1} de ${r.series.length}: ${yo.puestoEnSerie}º)` : '';
  ctx.log(
    `${DISCIPLINA} ${competida.nombre}${nombreDeTipo(ctx, tipo)}${serieTexto}: ${position}º de ${total} con ${miMarca.toFixed(2)} s${dif}${record ? ' (¡mejor marca personal!)' : ''}.${cierre}`,
    tipo === 'regular' ? 'resultado' : 'logro',
    tabla,
  );
  const bono = tipo === 'regular' ? 1 : 1.6;
  if (position === 1) ctx.addStat(GEN.motivacion, 6 * bono);
  else if (position <= 3) ctx.addStat(GEN.motivacion, 3 * bono);
  else if (position === total) ctx.addStat(GEN.motivacion, -3);
  if (record) ctx.addStat(GEN.motivacion, 2);
  // Cuanto más fuertes son los rivales frente a uno, más se aprende (competir contra mayores desarrolla más).
  const nivelRivales = rivales.reduce((a, c) => a + c.level, 0) / Math.max(1, rivales.length);
  const desafio = Math.min(1.2, Math.max(0, (nivelRivales - rendimiento(ctx)) / 25));
  if (desafio > 0.05) {
    ctx.train('atletismo.ritmo', desafio);
    ctx.train('atletismo.salida', 0.5 * desafio);
    ctx.train(CONOCIMIENTO, 1.5 * desafio);
    if (desafio >= 0.5) ctx.log('Competir contra rivales más fuertes te ha hecho aprender más.');
  }
  // Los golpes curten: perder entrena la resiliencia mucho más que ganar.
  ctx.train(GEN.resiliencia, position > total / 2 ? 0.8 : 0.2);

  ctx.emit<CompetitionResultData>({
    type: SHARED_EVENTS.COMPETITION_RESULT,
    data: { module: 'atletismo', discipline: `${DISCIPLINA}${nombreDeTipo(ctx, tipo)}`, position, total, mark: miMarca, unit: 's', participants },
  });
}


// ---------------------------------------------------------------------------------------------------- pestaña del deporte


const tablaDeLaPrueba = (p: PruebaGuardada): LogTable | undefined => {
  if (!p.filas?.length) return undefined;
  const filas = [...p.filas].sort((a, b) => a.marca - b.marca);
  const ganador = filas[0].marca;
  return {
    header: ['Pos.', 'Corredor', 'Club', 'Tiempo', 'Dif.'],
    rows: filas.map((f, i) => [orden(i + 1), f.nombre, f.club || '—', `${f.marca.toFixed(2)} s`, i === 0 ? '—' : `+${(f.marca - ganador).toFixed(2)}`]),
    highlight: filas.findIndex((f) => f.yo),
    align: ['left', 'left', 'left', 'right', 'right'],
  };
};


function proximaPrueba(ctx: ReadContext, s: AtletismoState): string {
  const t = ctx.time;
  if (t.period !== 'clase') return 'No hay carreras en vacaciones: la temporada empieza en septiembre.';
  const sem = semanas(ctx);
  if (t.schoolWeek < sem.primeraCompeticion) return `Pretemporada: la primera carrera es la semana ${sem.primeraCompeticion + 1} del curso.`;
  const toca = pruebaDeLaSemana(ctx, t);
  const fmt = formatoDeCarrera(ctx);
  const hecha = s.ultimaSemanaCarrera === t.week;
  if (toca === 'semifinal' && !hecha) return `Esta semana, el sábado de 9 a 13: semifinales del campeonato (los ${fmt.semifinal.plazas} mejores de la clasificación del trimestre en cada categoría).`;
  if (toca === 'final' && !hecha) return `Esta semana, el sábado de 9 a 13: final del ${campeonato(ctx)} (${fmt.final.plazas} corredores: los ${fmt.final.porSerie} primeros de cada serie de la semifinal).`;
  // El próximo campeonato: el primero de este trimestre o de los siguientes que aún no ha pasado.
  const siguiente = (sem.campeonatos ?? []).find((c) => c.final > t.schoolWeek || (c.final === t.schoolWeek && !hecha));
  const resto = siguiente ? ` El campeonato de este trimestre: semifinales la semana ${siguiente.semifinal + 1} y final la semana ${siguiente.final + 1}.` : '';
  if (hecha) return `Ya has corrido esta semana: la próxima prueba es el sábado que viene, de 9 a 13.${resto}`;
  return `Carrera semanal: el sábado, de 9 a 13.${resto}`;
}

/** Las habilidades que sube un poco un consejo del entrenador, por turnos según el día (técnica, ritmo, salida). */
const HABILIDADES_DE_CONSEJO = [
  { stat: 'atletismo.tecnica', nombre: 'técnica' },
  { stat: 'atletismo.ritmo', nombre: 'ritmo' },
  { stat: 'atletismo.salida', nombre: 'salida' },
];

/** Todo lo que enseña la pestaña de atletismo. */
function vistaDeAtletismo(ctx: ReadContext): DeporteView {
  const t = ctx.time;
  const s = ctx.state<AtletismoState>();
  const { competida, superior } = categoriaDelJugador(ctx);
  const club = clubDelJugador(ctx);
  const datos = datosDeDeporte(ctx, DEPORTE);
  // Tu entrenador: el de tu club que lleva tu edad (los clubes tienen varios, cada uno con unas categorías).
  const entrenador = entrenadorDelJugador(ctx);
  const todas = s.resultados ?? [];
  const deEsteCurso = todas.filter((p) => p.curso === t.schoolYear);
  const mejor = deEsteCurso.reduce<PruebaGuardada | undefined>((m, p) => (!m || p.posicion < m.posicion ? p : m), undefined);
  const campeonatoDelCurso = (s.campeonatos ?? []).filter((c) => c.curso === t.schoolYear);
  const estadoDelCampeonato = campeonatoDelCurso.length ? campeonatoDelCurso.map((c) => `${c.tipo === 'final' ? 'final' : 'semifinal'}: ${c.position}º de ${c.total}`).join(' · ') : 'Sin disputar';

  const clasificaciones = [...new Set(deEsteCurso.map((p) => p.categoria))].flatMap((cat) => {
    // La clasificación es la de todo el mundo (todas las pruebas de la categoría, corra o no el personaje).
    const tabla = s.tablas?.curso === t.schoolYear ? s.tablas.temporada[cat] : undefined;
    if (!tabla) return [];
    const personas = ctx.service<NpcDirectory>(SERVICES.npcs);
    const fila = (k: string) => ({ yo: k === 'yo', nombre: k === 'yo' ? 'Tú' : (personas?.get(k)?.name ?? k), club: k === 'yo' ? (club?.nombre ?? '') : (personas?.get(k)?.club ?? ''), ...tabla[k] });
    const puntos = recorte(ordenDeTabla(tabla).map(fila), (f, i) => [orden(i), f.nombre, f.club || '—', String(f.pt), String(f.pr), `${f.mm.toFixed(2)} s`]);
    const marcas = recorte(Object.keys(tabla).sort((a, b) => tabla[a].mm - tabla[b].mm || (a < b ? -1 : 1)).map(fila), (f, i) => [orden(i), f.nombre, f.club || '—', `${f.mm.toFixed(2)} s`]);
    return [
      { titulo: `Clasificación por puntos · ${nombreDeCategoria(ctx, cat)}`, tabla: { header: ['Pos.', 'Corredor', 'Club', 'Puntos', 'Carreras', 'Mejor marca'], align: ['left', 'left', 'left', 'right', 'right', 'right'] as ('left' | 'right')[], ...puntos } },
      { titulo: `Mejores marcas · ${nombreDeCategoria(ctx, cat)}`, tabla: { header: ['Pos.', 'Corredor', 'Club', 'Mejor marca'], align: ['left', 'left', 'left', 'right'] as ('left' | 'right')[], ...marcas } },
    ];
  });

  const anteriores = [...new Set(todas.filter((p) => p.curso < t.schoolYear).map((p) => p.curso))].sort((a, b) => b - a).map((curso) => {
    const ps = todas.filter((p) => p.curso === curso);
    const m = ps.reduce((x, p) => (p.posicion < x.posicion ? p : x));
    return { etiqueta: `Curso ${curso + 1}`, pruebas: ps.length, mejorPuesto: `${orden(m.posicion)} de ${m.total}`, mejorMarca: `${Math.min(...ps.map((p) => p.marca)).toFixed(2)} s` };
  });

  return {
    id: DEPORTE,
    nombre: 'Atletismo',
    disciplina: DISCIPLINA,
    inactivo: club ? undefined : 'Apúntate a un club de atletismo (en el colegio o en el estadio) para ver aquí tu deporte',
    resumen: [
      { etiqueta: 'Categoría', valor: `${competida.nombre}${superior ? ' (compites en la superior)' : ''}` },
      { etiqueta: 'Federación', valor: `${datos.competiciones.federacion}${datos.deRespaldo ? ` (con los datos de España: ${ctx.pais.nombre} aún no tiene los suyos)` : ''}` },
      { etiqueta: 'Club', valor: club?.nombre ?? 'Sin club' },
      { etiqueta: 'Entrenador', valor: entrenador?.name ?? '—' },
      { etiqueta: 'Entrenamientos', valor: club ? textoDeSesiones(club.sesiones) : '—' },
      { etiqueta: 'Carreras', valor: 'Los sábados de 9 a 13, en el estadio' },
      { etiqueta: 'Mejor marca', valor: s.mejorMarca === null ? '—' : `${s.mejorMarca.toFixed(2)} s` },
      { etiqueta: 'Carreras este curso', valor: String(deEsteCurso.length) },
      { etiqueta: 'Mejor puesto del curso', valor: mejor ? `${orden(mejor.posicion)} de ${mejor.total}` : '—' },
      { etiqueta: 'Campeonato', valor: estadoDelCampeonato },
    ],
    habilidades: ['atletismo.tecnica', 'atletismo.ritmo', 'atletismo.salida', CONOCIMIENTO],
    temporada: {
      etiqueta: `Curso ${t.schoolYear + 1}`,
      proxima: proximaPrueba(ctx, s),
      pruebas: deEsteCurso
        .slice()
        .sort((a, b) => a.semana - b.semana)
        .map((p) => ({
          semana: p.semana - (t.week - t.schoolWeek) + 1,
          titulo: `${DISCIPLINA} ${nombreDeCategoria(ctx, p.categoria)}${nombreDeTipo(ctx, p.tipo)}`,
          posicion: p.posicion,
          total: p.total,
          marca: `${p.marca.toFixed(2)} s`,
          record: p.record,
          tabla: tablaDeLaPrueba(p),
        })),
    },
    clasificaciones,
    temporadasAnteriores: anteriores,
  };
}

export const atletismo = defineModule<AtletismoState>({
  id: 'atletismo',
  name: 'Atletismo',
  description: '400 metros lisos. Entrena por la tarde y compite los sábados.',
  dependsOn: ['gen'],
  // La ficha (para listarlo al crear la partida), sus datos por país (categorías, temporada, competiciones, clubes) y lo que pone en el mapa de la ciudad.
  aportes: { [APORTES.fichaDeDeporte]: [FICHA_ATLETISMO], [APORTES.datosDeDeporte]: [DATOS_ATLETISMO], [APORTES.lugaresDeDeporte]: [LUGARES_ATLETISMO], [APORTES.rendimientoDeDeporte]: [{ id: DEPORTE, rendimiento }] },
  stats: [...STATS_DE_ATLETISMO],

  initState: () => ({
    mejorMarca: null,
    carreras: [],
    ultimaSemanaCarrera: -1,
    sesionesHoy: { day: -1, n: 0 },
    ultimaTele: -1,
  }),

  services: {
    [claveDeDeporte(DEPORTE)]: (ctx) => ({ view: () => vistaDeAtletismo(ctx) }),
  },

  // Apuntarse al club del colegio, pruebas de acceso a los de fuera y aceptar la plaza ganada (kit).
  dynamicActions: accionesDeClubes(CONFIG),

  actions: ligarALugares(sinEntrenarPorLibreEnSesion(CONFIG, [
    sesionDeClub(CONFIG, {
      description: 'Sesión completa con el entrenador y el grupo del club: técnica, ritmo, salida y táctica. Rinde más que entrenar por tu cuenta, y más aún en los clubes de fuera del colegio.',
      tags: [TAGS.fisico, TAGS.cardio, TAGS.entrenamiento, TAGS.club, 'atletismo'],
      delta: { [GEN.energia]: -24 },
      train: [...SESION_DE_CLUB],
    }),
    dejarClub(CONFIG),
    campamento(CONFIG, {
      tags: [TAGS.fisico, TAGS.cardio, TAGS.entrenamiento, 'atletismo', 'campamento'],
      delta: { [GEN.energia]: -35 },
      train: [
        { stat: 'atletismo.tecnica', amount: 4 },
        { stat: 'atletismo.ritmo', amount: 4 },
        { stat: 'atletismo.salida', amount: 4 },
        { stat: GEN.velocidad, amount: 1 },
        { stat: GEN.resistencia, amount: 1 },
        { stat: GEN.coordinacion, amount: 0.8 },
        { stat: CONOCIMIENTO, amount: 3 },
      ],
    }),
    conLosAmigos(CONFIG, {
      description: 'Con notas aceptables, el verano se pasa jugando y corriendo con los amigos: sienta bien, pero no se mejora igual que entrenando.',
      tags: [TAGS.fisico, TAGS.social, 'atletismo'],
      delta: { [GEN.energia]: -12, [GEN.estres]: -6 },
      train: [...JUEGO_INFORMAL],
    }),

    {
      id: 'atletismo.series',
      name: 'Series de velocidad',
      tags: [TAGS.fisico, TAGS.cardio, TAGS.entrenamiento, 'atletismo'],
      group: 'Entrenar atletismo',
      duration: 90,
      available: horarioEntreno,
      delta: { [GEN.energia]: -25 },
      train: [
        { stat: GEN.velocidad, amount: 1 },
        { stat: 'atletismo.salida', amount: 3 },
        { stat: 'atletismo.tecnica', amount: 1 },
        // Todo entrenamiento es con entrenador: siempre se aprende algo del deporte.
        { stat: CONOCIMIENTO, amount: 0.8 },
      ],
    },
    {
      id: 'atletismo.rodaje',
      name: 'Rodaje largo',
      tags: [TAGS.fisico, TAGS.cardio, TAGS.entrenamiento, 'atletismo'],
      group: 'Entrenar atletismo',
      duration: 75,
      available: horarioEntreno,
      delta: { [GEN.energia]: -20, [GEN.estres]: -3 },
      train: [
        { stat: GEN.resistencia, amount: 1.2 },
        { stat: 'atletismo.ritmo', amount: 3 },
        // Repartir el esfuerzo tiene parte táctica.
        { stat: CONOCIMIENTO, amount: 1 },
      ],
    },
    {
      id: 'atletismo.tecnica',
      name: 'Sesión de técnica',
      tags: [TAGS.fisico, TAGS.entrenamiento, 'atletismo'],
      group: 'Entrenar atletismo',
      duration: 60,
      available: horarioEntreno,
      delta: { [GEN.energia]: -12 },
      train: [
        { stat: 'atletismo.tecnica', amount: 3.5 },
        { stat: GEN.coordinacion, amount: 0.6 },
        { stat: CONOCIMIENTO, amount: 1.2 },
      ],
    },
    verEnLaTele(CONFIG, 'Retransmisiones y carreras de otros: aprendes cómo se corre y quién sale mejor.'),
    pedirConsejo(CONFIG, HABILIDADES_DE_CONSEJO),
    ...accionesDeCategoria(CONFIG, puedeSubir),

    {
      id: 'atletismo.semifinal',
      name: 'Competir: semifinales del campeonato',
      description: (ctx) => {
        const f = formatoDeCarrera(ctx);
        return `Al final de cada trimestre (sábado de ${semanasDelCampeonato(ctx, 'semifinal')}): los ${f.semifinal.plazas} mejores de la clasificación del trimestre en tu categoría (con ${f.semifinal.reservas} de reserva para las bajas y ausencias), en series de ${f.maxPorSerie} como mucho. Pasan a la final los ${f.final.porSerie} primeros de cada serie.`;
      },
      tags: [TAGS.fisico, TAGS.cardio, TAGS.competicion, 'atletismo'],
      group: 'Competición',
      duration: 180,
      available: (ctx) => puedeCorrer(ctx, 'semifinal'),
      delta: { [GEN.energia]: -35, [GEN.estres]: 7 },
      train: [
        { stat: 'atletismo.ritmo', amount: 1.5 },
        { stat: 'atletismo.salida', amount: 0.8 },
        { stat: CONOCIMIENTO, amount: 3 },
      ],
      run: (ctx) => disputar(ctx, 'semifinal'),
    },
    {
      id: 'atletismo.final',
      name: (ctx) => `Competir: final del ${campeonato(ctx)}`,
      description: (ctx) => {
        const f = formatoDeCarrera(ctx);
        return `Para quien pasó la semifinal (sábado de ${semanasDelCampeonato(ctx, 'final')}): ${f.final.plazas} corredores, los ${f.final.porSerie} primeros de cada serie. Hay medallas.`;
      },
      tags: [TAGS.fisico, TAGS.cardio, TAGS.competicion, 'atletismo'],
      group: 'Competición',
      duration: 180,
      available: (ctx) => puedeCorrer(ctx, 'final'),
      delta: { [GEN.energia]: -35, [GEN.estres]: 8 },
      train: [
        { stat: 'atletismo.ritmo', amount: 1.5 },
        { stat: 'atletismo.salida', amount: 0.8 },
        { stat: CONOCIMIENTO, amount: 3.5 },
      ],
      run: (ctx) => disputar(ctx, 'final'),
    },
    {
      id: 'atletismo.carrera',
      name: `Competir: ${DISCIPLINA}`,
      description: 'Carrera semanal en temporada (los sábados de 9 a 13): corre todo el que se presenta, en series de 8 como mucho. No hay carreras en pretemporada ni en vacaciones, ni en las semanas del campeonato.',
      tags: [TAGS.fisico, TAGS.cardio, TAGS.competicion, 'atletismo'],
      group: 'Competición',
      duration: 180,
      available: (ctx) => puedeCorrer(ctx, 'regular'),
      delta: { [GEN.energia]: -30, [GEN.estres]: 5 },
      // Competir también enseña.
      train: [
        { stat: 'atletismo.ritmo', amount: 1 },
        { stat: 'atletismo.salida', amount: 0.5 },
        // La experiencia de carrera es la mejor escuela del deporte.
        { stat: CONOCIMIENTO, amount: 2 },
      ],
      run: (ctx) => disputar(ctx, 'regular'),
    },
  ]), {
    // El club del colegio entrena en la pista del colegio; los de fuera, en el estadio. La pista del colegio, el parque y el estadio valen para entrenar solo.
    'atletismo.club_sesion': sedeDelClub,
    'atletismo.dejar_club': (ctx) => tramitesDe(clubDelJugador(ctx)),
    'atletismo.subir_categoria': sedeDelClub,
    'atletismo.volver_categoria': sedeDelClub,
    'atletismo.campamento': ['estadio'],
    'atletismo.amigos': ['parque'],
    'atletismo.series': ['pista_colegio', 'estadio', 'parque'],
    'atletismo.rodaje': ['parque', 'pista_colegio', 'estadio'],
    'atletismo.tecnica': ['pista_colegio', 'estadio', 'parque'],
    'atletismo.semifinal': ['estadio'],
    'atletismo.final': ['estadio'],
    'atletismo.carrera': ['estadio'],
    'atletismo.ver_tele': ['casa'],
    // Tu entrenador está en la sede de tu club antes y después de las sesiones.
    'atletismo.pedir_consejo': sedeDelClub,
  }),

  // Llegar tarde a la sesión, campamento, entrenar por tu cuenta, conocimiento y sobrecarga (kit), en este orden.
  modifiers: [
    modificadorDeLlegadaTarde(CONFIG),
    modificadorDeCampamento(CONFIG),
    modificadorPorTuCuenta(CONFIG),
    modificadorDeConocimiento(CONFIG),
    modificadorDeSobrecarga(CONFIG),
  ],

  // El primer día, el conocimiento que viene de casa; cada sesión, la cuenta de la sobrecarga (kit).
  on: (() => {
    const comunes = manejadoresDeDeporte(CONFIG);
    return {
      ...comunes,
      [CORE_EVENTS.WEEK_END]: (ctx, ev) => {
        comunes[CORE_EVENTS.WEEK_END]?.(ctx, ev);
        carrerasDelMundo(ctx, (ev.data as { week: number }).week);
      },
    };
  })(),
});

export default atletismo;
