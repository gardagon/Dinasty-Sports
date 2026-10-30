import {
  GEN,
  SERVICES,
  SHARED_EVENTS,
  TAGS,
  APORTES,
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
  CLASIFICADOS_POR_SERIE,
  CORREDORES_DE_SEMIFINAL,
  CORREDORES_POR_CARRERA,
  FINALISTAS,
  MINIMO_DE_RIVALES,
  RESERVAS_POR_SERIE,
  clasificacionPorPuntos,
  mejoresMarcas,
  probabilidadDeAcudir,
  recortarPruebas,
  repartirEnSeries,
  type FilaDeClasificacion,
  type FilaGuardada,
  type PruebaGuardada,
  type TipoDePrueba,
  type UltimoPuesto,
} from './temporada';
import { DATOS_ATLETISMO, FICHA_ATLETISMO } from './datos';

export { CATEGORIAS_ESPANA } from './datos';

/**
 * MÓDULO ATLETISMO (id `atletismo`) — el deporte más sencillo de modelar:
 * individual, sin posiciones ni tácticas. Prueba: 400 m lisos.
 *
 * 3 habilidades propias apoyadas en genéricas, entrenamientos por la tarde, competición semanal y resultado publicado con el
 * evento compartido `competicion.resultado` (los NPCs reaccionan sin conocer este módulo). Lo común a cualquier deporte con
 * club (clubes, entrenador, categorías, verano, tele, sobrecarga, conocimiento) lo pone el kit de deporte (`@ds/kit-deporte`);
 * aquí queda lo propio del atletismo: el rendimiento, la marca, las carreras y sus clasificaciones.
 */

/** Estado del atletismo: los campos comunes del kit (`EstadoBaseDeDeporte`) y los de las carreras. */
export interface AtletismoState extends EstadoBaseDeDeporte {
  mejorMarca: number | null;
  carreras: { week: number; position: number; total: number; mark: number; categoria?: string; superior?: boolean }[];
  ultimaSemanaCarrera: number;
  /** Última semana en que cada rival corrió contra el jugador (para rotar la serie). */
  ultimaCarreraRival?: Record<string, number>;
  /** Campeonato del curso: si se clasificó en la autonómica y quiénes corren la final. */
  campeonato?: { curso: number; clasificado: boolean; finalistas: string[]; reservas?: string[] };
  /** Cómo quedó cada rival la última vez que corrió (puesto y corredores de su serie): quien quedó último falla más la próxima. */
  ultimoPuesto?: Record<string, UltimoPuesto>;
  /** Todas las pruebas que ha disputado, con la clasificación completa de las de este curso y el anterior (para la pestaña del deporte). */
  resultados?: PruebaGuardada[];
  /** Resultados de semifinales y finales (`clasificatoria` es el nombre antiguo de las semifinales). */
  campeonatos?: { curso: number; categoria: string; tipo: Exclude<TipoDePrueba, 'regular'>; position: number; total: number }[];
}

const DEPORTE = 'atletismo';
const DISCIPLINA = '400 m';
const CONOCIMIENTO = idDeConocimiento(DEPORTE);
const ENTRENOS_LIBRES = ['atletismo.series', 'atletismo.rodaje', 'atletismo.tecnica'];

/** Lo que el kit de deporte necesita saber del atletismo. */
const CONFIG: ConfigDeporte = {
  id: DEPORTE,
  nombre: 'atletismo',
  // El club del colegio entrena en la pista del colegio; los de fuera, en el estadio.
  sedes: { colegio: 'pista_colegio', fuera: 'estadio' },
  textoDeCompeticion: 'Carreras: los sábados de 9 a 13 en el estadio.',
  rendimiento: (ctx) => rendimiento(ctx),
  entrenosLibres: ENTRENOS_LIBRES,
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

const habilidad = (key: string, name: string, apoyos: Apoyo[], description: string, tope: Apoyo[]) =>
  habilidadDeportiva(DEPORTE, 'Atletismo', key, name, apoyos, description, tope);

/**
 * La temporada, en semanas del curso (0 = la primera) y con el calendario del país: la pretemporada (se entrena pero todavía no hay carreras) y las
 * semifinales y la final del campeonato (sábados consecutivos). Salen de los datos del deporte (`datos.ts`), que las dan relativas al final de las clases.
 */
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
const efectivo = (ctx: ReadContext, key: keyof typeof SENSIBILIDAD): number => valorEfectivo(ctx, DEPORTE, `atletismo.${key}`, SENSIBILIDAD[key]);

/** Rendimiento 0..100 a partir de las stats (el corazón del deporte; ajustable sin tocar nada más). */
export function rendimiento(ctx: ReadContext): number {
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

/** Corredores por serie (el jugador incluido). Sin NPCs se completa con corredores genéricos. */
const PARTICIPANTES = 8;
/** Las primeras carreras corren siempre los mejores rivales; después la serie rota. */
const CABEZAS_DE_SERIE = 3;
const CARRERAS_CON_CABEZAS = 8;

interface Corredor {
  npcId?: string;
  name: string;
  /** Cómo se le llama en los textos (su apodo o su nombre de pila). */
  corto?: string;
  club?: string;
  level: number;
}

/**
 * Elige los rivales de la serie entre los conocidos.
 * - Las primeras carreras corren siempre los mejores (cabezas de serie), para que haya referentes claros.
 * - El resto de plazas rota: más probable quien lleva más semanas sin correr. Se puede repetir.
 */
export function elegirRivales(
  conocidos: Corredor[],
  plazas: number,
  week: number,
  carrerasHechas: number,
  ultima: Record<string, number>,
  rng: Rng,
): Corredor[] {
  if (conocidos.length <= plazas) return [...conocidos];
  const pool = [...conocidos].sort((a, b) => b.level - a.level);
  const elegidos = carrerasHechas < CARRERAS_CON_CABEZAS ? pool.splice(0, Math.min(CABEZAS_DE_SERIE, plazas)) : [];
  while (elegidos.length < plazas) {
    const pesos = pool.map((c) => 1 + Math.min(4, week - (c.npcId ? (ultima[c.npcId] ?? -5) : -5)));
    let tirada = rng.range(0, pesos.reduce((a, b) => a + b, 0));
    let i = 0;
    while (i < pool.length - 1 && tirada >= pesos[i]) tirada -= pesos[i++];
    elegidos.push(...pool.splice(i, 1));
  }
  return elegidos;
}

/** Rivales genéricos: rellenan la carrera hasta completar la serie (o todos, si no hay NPCs). */
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

/** Un corredor que corre una carrera: con su marca ya sorteada y, si es el personaje, `isPlayer`. */
interface Corre extends Corredor {
  mark: number;
  isPlayer?: boolean;
}

/**
 * Quiénes de los de la categoría se presentan a una carrera: los mejores casi siempre y los peores (y quien quedó último la vez anterior)
 * bastante menos (`probabilidadDeAcudir`). La tirada de cada uno es solo suya (él, la semana y el tipo de carrera), no cambia con lo que haga el jugador.
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
  // Siempre hay carrera: si casi nadie se presenta, corren los mejores de los que faltaban.
  while (acuden.length < MINIMO_DE_RIVALES && faltan.length) acuden.push(faltan.shift()!);
  return { acuden, faltan };
}

/** En las carreras de campeonato se presenta más gente (se preparan más). */
const BONO_DE_CAMPEONATO = 0.08;

/** Corre una carrera (semanal, semifinal o final) y aplica todas sus consecuencias. */
function disputar(ctx: ActionContext, tipo: TipoCarrera): void {
  const t = ctx.time;
  // El día cuenta: cansancio, salud, motivación... ya vienen en la eficiencia.
  const forma = 0.85 + 0.15 * Math.min(1.2, ctx.efficiency);
  const miNivel = rendimiento(ctx) * forma;
  const miMarca = marca400(miNivel, ctx.rng);

  // Compite en su categoría por edad (o en la superior si ha subido): solo corren rivales de esas edades.
  const { propia, competida, superior } = categoriaDelJugador(ctx);
  const npcs = ctx.service<NpcDirectory>(SERVICES.npcs);
  const conocidos: Corredor[] = npcs
    ? npcs
        .list({ tag: 'atleta', minAge: competida.edadMin, maxAge: competida.edadMax })
        .map((n) => ({ npcId: n.id, name: n.name, corto: n.nombreCorto, club: n.club, level: n.levels.atletismo ?? 30 }))
    : [];
  const estado = ctx.state<AtletismoState>();
  const previa = estado.ultimaCarreraRival ?? {};
  const previos = estado.ultimoPuesto ?? {};
  const enCategoria = estado.carreras.filter((c) => c.categoria === competida.id).length;

  // Quiénes corren contra el personaje (y quiénes no se han presentado).
  let rivalesQueCorren: Corredor[];
  let faltan: Corredor[] = [];
  if (tipo === 'final') {
    // La final la corren los clasificados de las semifinales; si alguno no se presenta, entra el siguiente reserva de su serie.
    const campeonato = estado.campeonato;
    const porId = new Map(conocidos.map((c) => [c.npcId, c]));
    const quienes = (ids: readonly string[]) => ids.map((id) => porId.get(id)).filter((c): c is Corredor => !!c);
    const { acuden, faltan: noVienen } = quienesAcuden([...quienes(campeonato?.finalistas ?? []), ...quienes(campeonato?.reservas ?? [])], previos, t.week, tipo);
    const orden = [...(campeonato?.finalistas ?? []), ...(campeonato?.reservas ?? [])];
    rivalesQueCorren = acuden.sort((a, b) => orden.indexOf(a.npcId ?? '') - orden.indexOf(b.npcId ?? '')).slice(0, FINALISTAS - 1);
    faltan = noVienen.filter((c) => (campeonato?.finalistas ?? []).includes(c.npcId ?? ''));
    if (rivalesQueCorren.length < FINALISTAS - 1) {
      // Sin base de personas (o sin suficientes clasificados) se completa con los mejores de la categoría.
      const usados = new Set(rivalesQueCorren.map((c) => c.npcId));
      const otros = conocidos.filter((c) => !usados.has(c.npcId)).sort((a, b) => b.level - a.level);
      rivalesQueCorren = [...rivalesQueCorren, ...otros].slice(0, FINALISTAS - 1);
    }
  } else {
    const { acuden, faltan: noVienen } = quienesAcuden(conocidos, previos, t.week, tipo);
    faltan = noVienen;
    const plazas = (tipo === 'semifinal' ? CORREDORES_DE_SEMIFINAL : CORREDORES_POR_CARRERA) - 1; // en la semifinal, 16: los otros 2 rotan
    rivalesQueCorren = acuden.length > plazas ? elegirRivales(acuden, plazas, t.week, enCategoria, previa, ctx.rng) : acuden;
  }
  // Sin base de personas (solo el módulo) se completa con corredores genéricos hasta una serie (o las dos de la semifinal).
  if (!npcs) {
    const plazas = tipo === 'semifinal' ? CORREDORES_DE_SEMIFINAL - 1 : PARTICIPANTES - 1;
    rivalesQueCorren = [...rivalesQueCorren, ...rivalesGenericos(Math.max(0, plazas - rivalesQueCorren.length), t.week, ctx.rng)];
  }

  // La suerte de cada rival en esta carrera es solo suya (él, la semana y el tipo de carrera): no cambia con lo que haga el jugador.
  const todos: Corre[] = [
    { name: 'Tú', level: miNivel, mark: miMarca, isPlayer: true },
    ...rivalesQueCorren.map((r) => ({ ...r, mark: marca400(r.level, rngEstable('marca', r.npcId ?? r.name, t.week, tipo)) })),
  ];
  // La semifinal se corre en dos series de ocho repartidas por cabezas de serie; las demás, en una.
  const series: Corre[][] = tipo === 'semifinal' ? repartirEnSeries(todos.map((c) => ({ ...c, nivel: c.level }))) : [todos];
  for (const serie of series) serie.sort((a, b) => a.mark - b.mark);
  const miSerie = series.find((x) => x.some((c) => c.isPlayer))!;
  const participants: CompetitionResultData['participants'] = miSerie.map((c) => ({ name: c.name, mark: c.mark, ...(c.npcId ? { npcId: c.npcId } : {}), ...(c.isPlayer ? { isPlayer: true } : {}) }));
  const position = miSerie.findIndex((c) => c.isPlayer) + 1;
  const total = miSerie.length;
  const rivales = todos.filter((c) => !c.isPlayer);

  const miClub = clubDelJugador(ctx)?.nombre;
  const clubes = new Map<string, string>(rivales.filter((r) => r.club).map((r) => [r.name, r.club!]));
  if (miClub) clubes.set('Tú', miClub);
  const record = estado.mejorMarca === null || miMarca < estado.mejorMarca;
  // Se guarda la clasificación de toda la prueba (en la semifinal, las dos series juntas por tiempos: así puntúa la temporada).
  const filas: FilaGuardada[] = [...todos]
    .sort((a, b) => a.mark - b.mark)
    .map((c) => ({ nombre: c.name, club: clubes.get(c.name) ?? '', marca: c.mark, ...(c.npcId ? { npcId: c.npcId } : {}), ...(c.isPlayer ? { yo: true } : {}) }));
  const prueba: PruebaGuardada = { curso: t.schoolYear, semana: t.week, tipo, categoria: competida.id, superior, posicion: position, total, marca: miMarca, record, filas };
  // Cómo ha quedado cada rival en su serie: de ahí depende que se presente la próxima vez (quien queda último, falla más).
  const ultimoPuesto: Record<string, UltimoPuesto> = { ...previos };
  for (const serie of series) serie.forEach((c, i) => c.npcId && (ultimoPuesto[c.npcId] = { posicion: i + 1, total: serie.length }));
  const base = {
    ...estado,
    resultados: recortarPruebas([...(estado.resultados ?? []), prueba], t.schoolYear),
    mejorMarca: record ? miMarca : estado.mejorMarca,
    ultimaSemanaCarrera: t.week,
    categoriaPropia: propia.id,
    categoriaSuperior: superior,
    ultimoPuesto,
  };

  let cierre = '';
  if (tipo === 'regular') {
    ctx.setState<AtletismoState>({
      ...base,
      carreras: [...estado.carreras, { week: t.week, position, total, mark: miMarca, categoria: competida.id, superior }].slice(-52),
      ultimaCarreraRival: {
        ...previa,
        ...Object.fromEntries(rivales.filter((r) => r.npcId).map((r) => [r.npcId!, t.week])),
      },
    });
  } else {
    const resultados = [...(estado.campeonatos ?? []), { curso: t.schoolYear, categoria: competida.id, tipo, position, total }].slice(-20);
    if (tipo === 'semifinal') {
      const clasificado = position <= CLASIFICADOS_POR_SERIE;
      // Pasan a la final los cuatro primeros de cada serie (los reservas son los dos siguientes de cada una); aquí solo cuentan los rivales (el personaje corre si se clasifica).
      const rivalesDe = (xs: Corre[]) => xs.filter((c) => !c.isPlayer && c.npcId).map((c) => c.npcId!);
      const clasificados = series.flatMap((serie) => serie.slice(0, CLASIFICADOS_POR_SERIE));
      const finalistas = rivalesDe([...clasificados].sort((a, b) => a.mark - b.mark));
      const reservas = rivalesDe(series.flatMap((serie) => serie.slice(CLASIFICADOS_POR_SERIE, CLASIFICADOS_POR_SERIE + RESERVAS_POR_SERIE)).sort((a, b) => a.mark - b.mark));
      ctx.setState<AtletismoState>({ ...base, campeonatos: resultados, campeonato: { curso: t.schoolYear, clasificado, finalistas, reservas } });
      const otra = series.find((serie) => serie !== miSerie);
      const pasanDeLaOtra = otra ? otra.slice(0, CLASIFICADOS_POR_SERIE).map((c) => c.corto ?? c.name.split(' ')[0]).join(', ') : '';
      cierre =
        (clasificado
          ? ` ¡Te clasificas para la final del ${campeonato(ctx)}, el sábado de la semana ${semanas(ctx).final + 1}!`
          : ' No te clasificas para la final (pasan los cuatro primeros de cada serie): a por la del año que viene.') + (pasanDeLaOtra ? ` De la otra serie pasan: ${pasanDeLaOtra}.` : '');
    } else {
      ctx.setState<AtletismoState>({ ...base, campeonatos: resultados });
      const medalla = ['oro', 'plata', 'bronce'][position - 1];
      cierre = medalla ? ` ¡Medalla de ${medalla}!` : '';
    }
  }
  if (faltan.length) cierre += ` No se han presentado ${faltan.length} ${faltan.length === 1 ? 'corredor' : 'corredores'}.`;

  const ganador = participants[0].mark;
  const tabla = {
    header: ['Pos.', 'Corredor', 'Club', 'Tiempo', 'Dif.'],
    rows: participants.map((p, i) => [
      `${i + 1}º`,
      p.name,
      clubes.get(p.name) ?? '—',
      `${p.mark.toFixed(2)} s`,
      i === 0 ? '—' : `+${(p.mark - ganador).toFixed(2)}`,
    ]),
    highlight: position - 1,
    align: ['left', 'left', 'left', 'right', 'right'] as ('left' | 'right')[],
  };
  const dif = position === 1 ? '' : `, a ${(miMarca - ganador).toFixed(2)} s del 1º`;
  const serieTexto = series.length > 1 ? ` (serie ${series.indexOf(miSerie) + 1} de ${series.length})` : '';
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
  const nivelRivales = rivales.reduce((a, r) => a + r.level, 0) / Math.max(1, rivales.length);
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
  const hechas = (s.campeonatos ?? []).filter((c) => c.curso === t.schoolYear);
  if (t.schoolWeek === sem.semifinal && !hechas.some((c) => c.tipo === 'semifinal' || c.tipo === 'clasificatoria')) return 'Esta semana, el sábado de 9 a 13: semifinales del campeonato.';
  if (t.schoolWeek === sem.final && s.campeonato?.clasificado && s.campeonato.curso === t.schoolYear && !hechas.some((c) => c.tipo === 'final')) {
    return `Esta semana, el sábado de 9 a 13: final del ${campeonato(ctx)}.`;
  }
  const resto =
    t.schoolWeek < sem.semifinal
      ? ` Las semifinales del campeonato son la semana ${sem.semifinal + 1}.`
      : t.schoolWeek < sem.final && s.campeonato?.clasificado && s.campeonato.curso === t.schoolYear
        ? ` La final del campeonato es la semana ${sem.final + 1}.`
        : '';
  if (s.ultimaSemanaCarrera === t.week) return `Ya has corrido esta semana: la próxima carrera es el sábado que viene, de 9 a 13.${resto}`;
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
  const campeonato = s.campeonato?.curso === t.schoolYear ? (s.campeonato.clasificado ? 'Clasificado para la final' : 'No clasificado') : 'Sin disputar';

  const clasificaciones = [...new Set(deEsteCurso.map((p) => p.categoria))].flatMap((cat) => {
    const pruebas = deEsteCurso.filter((p) => p.categoria === cat);
    const puntos = recorte(clasificacionPorPuntos(pruebas), (f, i) => [orden(i), f.yo ? 'Tú' : f.nombre, f.club || '—', String(f.puntos), String(f.pruebas), `${f.mejorMarca.toFixed(2)} s`]);
    const marcas = recorte(mejoresMarcas(pruebas), (f, i) => [orden(i), f.yo ? 'Tú' : f.nombre, f.club || '—', `${f.mejorMarca.toFixed(2)} s`]);
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
      { etiqueta: 'Campeonato', valor: campeonato },
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
  // La ficha (para listarlo al crear la partida) y sus datos por país (categorías, temporada, competiciones).
  aportes: { [APORTES.fichaDeDeporte]: [FICHA_ATLETISMO], [APORTES.datosDeDeporte]: [DATOS_ATLETISMO] },
  stats: [
    habilidad('tecnica', 'Técnica de carrera', [{ stat: GEN.coordinacion, weight: 0.4 }, { stat: GEN.agilidad, weight: 0.2 }], 'Zancada eficiente y postura.', [{ stat: GEN.coordinacion, weight: 0.5 }, { stat: GEN.agilidad, weight: 0.3 }, { stat: GEN.determinacion, weight: 0.2 }]),
    habilidad('ritmo', 'Gestión del ritmo', [{ stat: GEN.resistencia, weight: 0.4 }, { stat: GEN.inteligencia, weight: 0.2 }], 'Repartir el esfuerzo en la vuelta.', [{ stat: GEN.resistencia, weight: 0.5 }, { stat: GEN.inteligencia, weight: 0.25 }, { stat: GEN.determinacion, weight: 0.25 }]),
    conocimientoDelDeporte(
      DEPORTE,
      'Conocimiento de atletismo',
      'Entender el deporte: ritmos, tácticas, quién sale mejor. Sube entrenando, compitiendo y, en menor medida, viendo atletismo; casi no se olvida.',
    ),
    habilidad('salida', 'Salida y aceleración', [{ stat: GEN.velocidad, weight: 0.4 }, { stat: GEN.fuerza, weight: 0.2 }], 'Arrancar rápido desde los tacos.', [{ stat: GEN.velocidad, weight: 0.5 }, { stat: GEN.fuerza, weight: 0.3 }, { stat: GEN.coordinacion, weight: 0.2 }]),
  ],

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
      train: [
        { stat: 'atletismo.tecnica', amount: 2 },
        { stat: 'atletismo.ritmo', amount: 2 },
        { stat: 'atletismo.salida', amount: 2 },
        { stat: GEN.velocidad, amount: 0.6 },
        { stat: GEN.resistencia, amount: 0.6 },
        { stat: GEN.coordinacion, amount: 0.4 },
        // Con entrenador y grupo se aprende el deporte como en ningún otro entrenamiento.
        { stat: CONOCIMIENTO, amount: 1.6 },
      ],
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
      train: [
        { stat: 'atletismo.tecnica', amount: 0.4 },
        { stat: 'atletismo.ritmo', amount: 0.4 },
        { stat: 'atletismo.salida', amount: 0.4 },
        { stat: GEN.carisma, amount: 0.4 },
        { stat: GEN.cooperacion, amount: 0.3 },
      ],
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
      description: (ctx) => `Una vez por curso (sábado de la semana ${semanas(ctx).semifinal + 1}), con ${CORREDORES_DE_SEMIFINAL} corredores de tu categoría (los otros ${CORREDORES_POR_CARRERA - CORREDORES_DE_SEMIFINAL} rotan) repartidos en dos series de ocho. Pasan a la final los ${CLASIFICADOS_POR_SERIE} primeros de cada serie.`,
      tags: [TAGS.fisico, TAGS.cardio, TAGS.competicion, 'atletismo'],
      group: 'Competición',
      duration: 180,
      available: (ctx) => {
        const t = ctx.time;
        if (t.period !== 'clase' || t.schoolWeek !== semanas(ctx).semifinal) return `Las semifinales del campeonato son en la semana ${semanas(ctx).semifinal + 1} del curso`;
        if (ctx.state<AtletismoState>().ultimaSemanaCarrera === t.week) return 'Ya has competido esta semana';
        return t.weekday === 5 && inHours(t, 9, 13) ? true : 'Es el sábado, de 9 a 13';
      },
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
      description: (ctx) => `Para quien se clasificó en las semifinales (sábado de la semana ${semanas(ctx).final + 1}): ocho corredores, los cuatro primeros de cada serie. Hay medallas.`,
      tags: [TAGS.fisico, TAGS.cardio, TAGS.competicion, 'atletismo'],
      group: 'Competición',
      duration: 180,
      available: (ctx) => {
        const t = ctx.time;
        if (t.period !== 'clase' || t.schoolWeek !== semanas(ctx).final) return `La final es en la semana ${semanas(ctx).final + 1} del curso`;
        const c = ctx.state<AtletismoState>().campeonato;
        if (!c?.clasificado || c.curso !== t.schoolYear) return 'No te has clasificado para la final';
        if (ctx.state<AtletismoState>().ultimaSemanaCarrera === t.week) return 'Ya has competido esta semana';
        return t.weekday === 5 && inHours(t, 9, 13) ? true : 'Es el sábado, de 9 a 13';
      },
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
      description: 'Carrera semanal en temporada (los sábados de 9 a 13). No hay carreras en pretemporada ni en vacaciones.',
      tags: [TAGS.fisico, TAGS.cardio, TAGS.competicion, 'atletismo'],
      group: 'Competición',
      duration: 180,
      available: (ctx) => {
        const t = ctx.time;
        if (ctx.state<AtletismoState>().ultimaSemanaCarrera === t.week) return 'Ya has competido esta semana';
        if (t.period !== 'clase') return 'No hay carreras en vacaciones';
        const sem = semanas(ctx);
        if (t.schoolWeek < sem.primeraCompeticion) return 'Pretemporada: todavía no hay carreras';
        if (t.schoolWeek === sem.semifinal) return 'Esta semana son las semifinales del campeonato';
        if (t.schoolWeek === sem.final && ctx.state<AtletismoState>().campeonato?.clasificado) return 'Esta semana es la final del campeonato';
        return t.weekday === 5 && inHours(t, 9, 13) ? true : 'Las carreras son los sábados de 9 a 13';
      },
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
  on: manejadoresDeDeporte(CONFIG),
});

export default atletismo;
