import {
  CORE_EVENTS,
  GEN,
  SERVICES,
  SHARED_EVENTS,
  TAGS,
  categoriaDeEdad,
  categoriaSuperior,
  defineModule,
  inHours,
  conLugar,
  ligarALugares,
  type ActionDoneData,
  type ActionContext,
  type ActionDef,
  type CategoriaDef,
  type ClubDirectory,
  type ClubJoinData,
  type ClubLeaveData,
  type ClubView,
  type CompetitionResultData,
  type DeporteView,
  type LogTable,
  claveDeDeporte,
  type IdentityService,
  type NpcDirectory,
  type NpcView,
  type FamilyService,
  conocimientoDeCrianza,
  rngEstable,
  type PresenciaService,
  type ReadContext,
  type StudiesService,
  type Rng,
  type StatDef,
} from '@ds/contracts';
import {
  CLASIFICADOS_POR_SERIE,
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

/**
 * MÓDULO ATLETISMO (id `atletismo`) — el deporte más sencillo de modelar:
 * individual, sin posiciones ni tácticas. Prueba: 400 m lisos.
 *
 * Plantilla para futuros deportes: 3 habilidades propias apoyadas en genéricas,
 * entrenamientos por la tarde, competición semanal y resultado publicado con el
 * evento compartido `competicion.resultado` (los NPCs reaccionan sin conocer este módulo).
 */

export interface AtletismoState {
  mejorMarca: number | null;
  carreras: { week: number; position: number; total: number; mark: number; categoria?: string; superior?: boolean }[];
  ultimaSemanaCarrera: number;
  /** Sesiones de entrenamiento hechas hoy (para la sobrecarga). */
  sesionesHoy: { day: number; n: number };
  /** Último día que vio atletismo en la tele (una vez al día; ausente en partidas antiguas). */
  ultimaTele?: number;
  /** ¿Ya se ha sumado el conocimiento de partida por lo que practicaron los padres? Se hace el primer día. */
  herenciaAplicada?: boolean;
  /** Último día que pidió consejo a su entrenador (una vez al día). */
  ultimoConsejo?: number;
  /** Última semana en que cada rival corrió contra el jugador (para rotar la serie). */
  ultimaCarreraRival?: Record<string, number>;
  /** ¿Compite en la categoría superior a la que le toca por edad? */
  categoriaSuperior?: boolean;
  /** Categoría que le tocaba por edad la última vez (para saber cuándo cambia). */
  categoriaPropia?: string;
  /** Último día que fue a una sesión de su club (una al día). */
  ultimaSesionClub?: number;
  /** Última semana en que hizo la prueba de acceso de cada club (para no repetirla enseguida). */
  pruebas?: Record<string, number>;
  /** Plazas ofrecidas por clubes de fuera tras pasar su prueba: semana en que se ofreció (valen unas semanas). */
  ofertas?: Record<string, number>;
  /** Último día que fue al campamento o practicó con los amigos en verano (uno al día). */
  ultimoVerano?: number;
  /** Campeonato del curso: si se clasificó en la autonómica y quiénes corren la final. */
  campeonato?: { curso: number; clasificado: boolean; finalistas: string[]; reservas?: string[] };
  /** Cómo quedó cada rival la última vez que corrió (puesto y corredores de su serie): quien quedó último falla más la próxima. */
  ultimoPuesto?: Record<string, UltimoPuesto>;
  /** Todas las pruebas que ha disputado, con la clasificación completa de las de este curso y el anterior (para la pestaña del deporte). */
  resultados?: PruebaGuardada[];
  /** Resultados de semifinales y finales (`clasificatoria` es el nombre antiguo de las semifinales). */
  campeonatos?: { curso: number; categoria: string; tipo: Exclude<TipoDePrueba, 'regular'>; position: number; total: number }[];
}

/**
 * Categorías de la federación española de atletismo (por edad). Es un DATO por país: otro país o deporte
 * tendrá las suyas. Los de 23 años o más compiten en absoluta.
 */
export const CATEGORIAS_ESPANA: readonly CategoriaDef[] = [
  { id: 'sub10', nombre: 'Sub-10', edadMin: 0, edadMax: 9 },
  { id: 'sub12', nombre: 'Sub-12', edadMin: 10, edadMax: 11 },
  { id: 'sub14', nombre: 'Sub-14', edadMin: 12, edadMax: 13 },
  { id: 'sub16', nombre: 'Sub-16', edadMin: 14, edadMax: 15 },
  { id: 'sub18', nombre: 'Sub-18', edadMin: 16, edadMax: 17 },
  { id: 'sub20', nombre: 'Sub-20', edadMin: 18, edadMax: 19 },
  { id: 'sub23', nombre: 'Sub-23', edadMin: 20, edadMax: 22 },
  { id: 'absoluta', nombre: 'Absoluta', edadMin: 23, edadMax: 200 },
];
const CATEGORIAS = CATEGORIAS_ESPANA;

interface CategoriaJugador {
  /** La que le toca por edad. */
  propia: CategoriaDef;
  /** En la que compite (la superior si ha subido). */
  competida: CategoriaDef;
  superior: boolean;
}

/** Categoría del jugador según su edad y si ha subido de categoría. */
function categoriaDelJugador(ctx: ReadContext): CategoriaJugador {
  // La categoría depende de la edad de temporada (la que se tenía al empezar el curso), como en la federación.
  const edad = ctx.service<IdentityService>(SERVICES.identidad)?.view().seasonAge ?? 8;
  const propia = categoriaDeEdad(CATEGORIAS, edad);
  const s = ctx.state<AtletismoState>();
  const sup = categoriaSuperior(CATEGORIAS, propia);
  const superior = !!s.categoriaSuperior && s.categoriaPropia === propia.id && !!sup;
  return { propia, competida: superior ? sup! : propia, superior };
}

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
  const sup = categoriaSuperior(CATEGORIAS, propia);
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

const DISCIPLINA = '400 m';
const CONOCIMIENTO = 'atletismo.conocimiento';
/** Efecto del conocimiento sobre la eficiencia de entrenar y competir: de ×0,90 (0) a ×1,15 (100). */
const EFECTO_CONOCIMIENTO = { min: 0.9, rango: 0.25 };
const SESIONES_SIN_SOBRECARGA = 2;

/** Genérica que apoya a una habilidad y su peso sobre el ritmo de subida (el techo pesa la mitad). */
type Apoyo = { stat: string; weight: number };

const habilidad = (key: string, name: string, apoyos: Apoyo[], description: string, tope: Apoyo[]): StatDef => ({
  id: `atletismo.${key}`,
  name,
  description,
  group: 'Atletismo',
  category: 'habilidad',
  initial: { min: 5, max: 15 },
  talentSpread: 0.2,
  // El tope no se hereda: sale de las genéricas físicas (y mentales) que la apoyan más una aptitud propia (±15 %).
  genetics: { derivedFrom: tope, aptitude: 0.15 },
  growth: {
    rate: 0.36,
    curve: 1.5,
    speedFrom: [...apoyos, { stat: GEN.determinacion, weight: 0.2 }],
    potentialFactor: GEN.vigorTecnico,
    cap: {
      // El techo de una habilidad deportiva crece con el desarrollo por la edad: nadie llega a su máximo antes de madurar.
      base: 0.15,
      from: [
        ...apoyos.map((a) => ({ stat: a.stat, weight: a.weight / 2 })),
        { stat: GEN.determinacion, weight: 0.15 },
        { stat: GEN.madurez, weight: 0.45 },
      ],
    },
  },
  decay: { graceDays: 4, ratePerDay: 0.012, floorRatio: 0.7 },
});

/** Semanas de pretemporada al empezar cada curso: se entrena pero todavía no hay carreras. */
const SEMANAS_PRETEMPORADA = 4;
/** Semanas del curso (0 = la primera) de las semifinales y de la final del campeonato de España (sábados consecutivos). */
const SEMANA_SEMIFINAL = 37;
const SEMANA_FINAL = 38;
/** Semanas que hay que esperar para repetir la prueba de acceso de un club. */
const SEMANAS_ENTRE_PRUEBAS = 8;
/** Semanas que vale una plaza ganada en la prueba de un club antes de decidirse. */
const SEMANAS_DE_OFERTA = 8;
/** Entrenar solo, sin entrenador ni grupo, rinde menos que una sesión de club. */
const EFICIENCIA_POR_TU_CUENTA = 0.85;
const ENTRENOS_LIBRES = ['atletismo.series', 'atletismo.rodaje', 'atletismo.tecnica'];

const DEPORTE = 'atletismo';
/** El campamento de verano rinde más que cualquier otro entrenamiento: entrenadores, grupo y todo el día. */
const EFICIENCIA_CAMPAMENTO = 1.2;
const caminoDeVerano = (ctx: ReadContext) => ctx.service<StudiesService>(SERVICES.estudios)?.summerPath() ?? null;
const clubDelJugador = (ctx: ReadContext): ClubView | undefined => ctx.service<ClubDirectory>(SERVICES.clubes)?.membership(DEPORTE);
/** Dónde entrena el club del personaje: la pista del colegio si es el del colegio y, si no, el estadio (sin club, la pista del colegio). */
const sedeDelClub = (ctx: ReadContext): readonly string[] => (clubDelJugador(ctx)?.esColegio === false ? ['estadio'] : ['pista_colegio']);
/** Los miembros del club están en la pista 10 minutos antes de la sesión: desde entonces se puede entrar a entrenar (o incorporarse más tarde, con la parte proporcional). */
const MINUTOS_ANTES_DE_SESION = 10;
/** ¿Está en marcha (o a punto de empezar) la sesión del club del personaje y aún no ha entrenado con él hoy? Entonces no se entrena por libre: se va al club. */
function sesionDelClubAhora(ctx: ReadContext): ClubView | undefined {
  const club = clubDelJugador(ctx);
  const t = ctx.time;
  if (!club || !club.sesiones.weekdays.includes(t.weekday) || ctx.state<AtletismoState>().ultimaSesionClub === t.day) return undefined;
  return t.minuteOfDay >= club.sesiones.desde * 60 - MINUTOS_ANTES_DE_SESION && t.minuteOfDay < club.sesiones.hasta * 60 ? club : undefined;
}
/** Mientras hay entrenamiento del club no se entrena por libre. */
const sinEntrenarPorLibreEnSesion = (acciones: readonly ActionDef[]): ActionDef[] =>
  acciones.map((a) =>
    ENTRENOS_LIBRES.includes(a.id)
      ? {
          ...a,
          available: (ctx: ReadContext) => {
            const otro = a.available?.(ctx) ?? true;
            return otro === true && sesionDelClubAhora(ctx) ? 'Ahora es el entrenamiento de tu club: únete a la sesión' : otro;
          },
        }
      : a,
  );
const edadDelJugadorDeTemporada = (ctx: ReadContext): number => ctx.service<IdentityService>(SERVICES.identidad)?.view().seasonAge ?? 8;
const edadDelJugador = (ctx: ReadContext): number => ctx.service<IdentityService>(SERVICES.identidad)?.view().age ?? 8;

const DIAS_DE_LA_SEMANA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
/** «lunes y miércoles de 15 a 17»: cuándo entrena un club. */
function textoDeSesiones(s: ClubView['sesiones']): string {
  const dias = s.weekdays.map((d) => DIAS_DE_LA_SEMANA[d]);
  return `${dias.length > 1 ? `${dias.slice(0, -1).join(', ')} y ${dias[dias.length - 1]}` : dias[0]} de ${s.desde} a ${s.hasta}`;
}
/** Lo que se cuenta de un club antes de apuntarse: cuándo entrena y cuándo hay carreras. */
const infoDeClub = (c: ClubView): string => `Entrena ${textoDeSesiones(c.sesiones)}. Carreras: los sábados de 9 a 13 en el estadio.`;
/** Dónde se hacen los trámites de un club: la administración del colegio o la sala del club en el estadio. */
const tramitesDe = (c: ClubView | undefined): readonly string[] => (!c || c.esColegio ? ['administracion'] : [`sala_${c.id}`]);

/** Pruebas de acceso a los clubes de fuera del colegio (se pueden hacer estando en otro club) y aceptar la plaza ganada. */
function accionesDeClubes(ctx: ReadContext): ActionDef[] {
  const clubes = ctx.service<ClubDirectory>(SERVICES.clubes);
  if (!clubes) return [];
  const actual = clubes.membership(DEPORTE);
  const colegio = clubes.list(DEPORTE).find((c) => c.esColegio);
  // Apuntarse al club del colegio: en la administración, y antes de aceptar se cuenta cuándo entrena y compite.
  const apuntarse: ActionDef[] =
    colegio && !actual
      ? [
          conLugar(tramitesDe(colegio), {
            id: 'atletismo.apuntarse_colegio',
            name: 'Apuntarte al club de atletismo del colegio',
            description: `El club del colegio entrena con su entrenador en sesiones fijas. ${infoDeClub(colegio)} Es el primer paso para competir con un equipo.`,
            tags: ['atletismo'],
            group: 'Club',
            duration: 30,
            available: () => true,
            run: (c2) => c2.emit<ClubJoinData>({ type: SHARED_EVENTS.CLUB_JOIN, data: { sport: DEPORTE, clubId: colegio.id } }),
          }),
        ]
      : [];
  const ofertas = ctx.state<AtletismoState>().ofertas ?? {};
  return [...apuntarse, ...clubes
    .list(DEPORTE)
    .filter((c) => !c.esColegio && c.id !== actual?.id && c.acceso?.[DEPORTE])
    .flatMap((c): ActionDef[] => {
      const acceso = c.acceso![DEPORTE];
      const aceptar = conLugar(tramitesDe(c), {
        id: `atletismo.aceptar_plaza.${c.id}`,
        name: `Aceptar la plaza en ${c.nombre}`,
        description: `Pasaste la prueba y te ofrecen entrar. Si todavía eres de otro club y no lo has dejado antes, lo dejas plantado: empeora tu relación con su entrenador y su equipo y te estresa. La plaza vale ${SEMANAS_DE_OFERTA} semanas.`,
        tags: ['atletismo'],
        group: 'Club',
        duration: 15,
        available: (c2) => {
          const semana = c2.state<AtletismoState>().ofertas?.[c.id];
          return semana !== undefined && c2.time.week - semana < SEMANAS_DE_OFERTA ? true : 'No tienes una plaza en este club (haz su prueba de acceso)';
        },
        run: (c2) => {
          c2.updateState<AtletismoState>((st) => {
            const { [c.id]: _usada, ...resto } = st.ofertas ?? {};
            return { ...st, ofertas: resto };
          });
          c2.emit<ClubJoinData>({ type: SHARED_EVENTS.CLUB_JOIN, data: { sport: DEPORTE, clubId: c.id } });
        },
      });
      const prueba = conLugar(tramitesDe(c), {
        id: `atletismo.prueba.${c.id}`,
        name: `Prueba de acceso: ${c.nombre}`,
        description: `El ${c.nombre} hace pruebas a quien quiere entrar, solo en sus horas de entrenamiento. ${infoDeClub(c)} Exige edad (${acceso.edadMin}+) y nivel; si no pasas, puedes repetirla pasadas ${SEMANAS_ENTRE_PRUEBAS} semanas.`,
        tags: [TAGS.fisico, 'atletismo'],
        group: 'Club',
        duration: 150,
        available: (c2) => {
          const t = c2.time;
          if (edadDelJugador(c2) < acceso.edadMin) return `Hay que tener ${acceso.edadMin} años para probar en el ${c.nombre}`;
          const ultima = c2.state<AtletismoState>().pruebas?.[c.id];
          if (ultima !== undefined && t.week - ultima < SEMANAS_ENTRE_PRUEBAS) return 'Hiciste la prueba hace poco: espera unas semanas';
          // Las pruebas se hacen en las sesiones de entrenamiento del club.
          return c.sesiones.weekdays.includes(t.weekday) && inHours(t, c.sesiones.desde, c.sesiones.hasta - 1) ? true : `Las pruebas se hacen en los entrenamientos: ${textoDeSesiones(c.sesiones)}`;
        },
        delta: { [GEN.energia]: -25, [GEN.estres]: 6 },
        run: (c2) => {
          const t = c2.time;
          const forma = 0.85 + 0.15 * Math.min(1.2, c2.efficiency);
          const rinde = rendimiento(c2) * forma + c2.rng.normal() * 3;
          c2.updateState<AtletismoState>((s) => ({ ...s, pruebas: { ...(s.pruebas ?? {}), [c.id]: t.week } }));
          if (rinde >= acceso.nivel && !c2.service<ClubDirectory>(SERVICES.clubes)?.membership(DEPORTE)) {
            c2.emit<ClubJoinData>({ type: SHARED_EVENTS.CLUB_JOIN, data: { sport: DEPORTE, clubId: c.id } });
          } else if (rinde >= acceso.nivel) {
            // Con otro club, la plaza se ofrece y decides: salir antes de él no cuesta nada; aceptarla sin salir sí.
            c2.updateState<AtletismoState>((st) => ({ ...st, ofertas: { ...(st.ofertas ?? {}), [c.id]: t.week } }));
            c2.log(`Has pasado la prueba del ${c.nombre}: te ofrecen plaza. Antes de aceptarla conviene dejar tu club actual.`, 'logro');
          } else {
            c2.log(`Prueba en el ${c.nombre}: todavía no tienes el nivel que piden. Sigue entrenando y vuelve a intentarlo.`, 'aviso');
            c2.addStat(GEN.motivacion, -3);
          }
        },
      });
      return [prueba, aceptar];
    })];
}

const horarioEntreno = (ctx: ReadContext): true | string => {
  const t = ctx.time;
  // Sin clase (fines de semana y vacaciones) las pistas abren todo el día.
  if (!t.isSchoolDay) return inHours(t, 8, 20) ? true : 'Las pistas abren de 8 a 20 sin clase (fines de semana y vacaciones)';
  return inHours(t, 15, 21) ? true : 'Entrenamientos entre semana de 15 a 21';
};

/**
 * Efecto del conocimiento del deporte sobre las habilidades que dependen de entender la carrera: de ×0,85 (no conoces
 * el deporte: fallas la colocación, el ritmo, el momento de la salida) a ×1,15 (lo conoces a fondo: sacas más de lo que
 * tu cuerpo da). Lo puramente físico (velocidad, resistencia) no cambia: saber de atletismo no te hace más lento.
 * La sensibilidad dice cuánto depende cada habilidad del conocimiento.
 */
const CONOCIMIENTO_EN_COMPETICION = { min: 0.85, rango: 0.3 };
const SENSIBILIDAD = { tecnica: 0.5, ritmo: 1, salida: 1 };

/** Valor efectivo de una habilidad táctica en competición: su nivel por el efecto del conocimiento. */
const efectivo = (ctx: ReadContext, key: keyof typeof SENSIBILIDAD): number => {
  const f = CONOCIMIENTO_EN_COMPETICION.min + CONOCIMIENTO_EN_COMPETICION.rango * ctx.norm(CONOCIMIENTO);
  return ctx.stat(`atletismo.${key}`) * (1 + SENSIBILIDAD[key] * (f - 1));
};

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

const NOMBRE_TIPO: Record<TipoDePrueba, string> = {
  regular: '',
  clasificatoria: ' · semifinal del campeonato', // nombre antiguo de las semifinales (partidas guardadas)
  semifinal: ' · semifinal del campeonato',
  final: ' · final del campeonato de España',
};

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
        .map((n) => ({ npcId: n.id, name: n.name, club: n.club, level: n.levels.atletismo ?? 30 }))
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
    const plazas = CORREDORES_POR_CARRERA - 1;
    rivalesQueCorren = acuden.length > plazas ? elegirRivales(acuden, plazas, t.week, enCategoria, previa, ctx.rng) : acuden;
  }
  // Sin base de personas (solo el módulo) se completa con corredores genéricos hasta una serie (o las dos de la semifinal).
  if (!npcs) {
    const plazas = tipo === 'semifinal' ? CORREDORES_POR_CARRERA - 1 : PARTICIPANTES - 1;
    rivalesQueCorren = [...rivalesQueCorren, ...rivalesGenericos(Math.max(0, plazas - rivalesQueCorren.length), t.week, ctx.rng)];
  }

  // La suerte de cada rival en esta carrera es solo suya (él, la semana y el tipo de carrera): no cambia con lo que haga el jugador.
  const todos: Corre[] = [
    { name: 'Tú', level: miNivel, mark: miMarca, isPlayer: true },
    ...rivalesQueCorren.map((r) => ({ ...r, mark: marca400(r.level, rngEstable('marca', r.npcId ?? r.name, t.week, tipo)) })),
  ];
  // La semifinal se corre en dos series de nueve repartidas por cabezas de serie; las demás, en una.
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
      const pasanDeLaOtra = otra ? otra.slice(0, CLASIFICADOS_POR_SERIE).map((c) => c.name.split(' ')[0]).join(', ') : '';
      cierre =
        (clasificado
          ? ` ¡Te clasificas para la final del campeonato de España, el sábado de la semana ${SEMANA_FINAL + 1}!`
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
    `${DISCIPLINA} ${competida.nombre}${NOMBRE_TIPO[tipo]}${serieTexto}: ${position}º de ${total} con ${miMarca.toFixed(2)} s${dif}${record ? ' (¡mejor marca personal!)' : ''}.${cierre}`,
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
    data: { module: 'atletismo', discipline: `${DISCIPLINA}${NOMBRE_TIPO[tipo]}`, position, total, mark: miMarca, unit: 's', participants },
  });
}


// ---------------------------------------------------------------------------------------------------- pestaña del deporte

const nombreDeCategoria = (id: string): string => CATEGORIAS.find((c) => c.id === id)?.nombre ?? id;
const orden = (n: number) => `${n}º`;

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

/** Las 10 primeras filas de una clasificación y, si el personaje no está entre ellas, su fila al final con su puesto real. */
function recorte(filas: FilaDeClasificacion[], fila: (f: FilaDeClasificacion, puesto: number) => string[]): { rows: string[][]; highlight: number } {
  const top = filas.slice(0, 10);
  const yo = filas.findIndex((f) => f.yo);
  const rows = top.map((f, i) => fila(f, i + 1));
  if (yo >= 10) rows.push(fila(filas[yo], yo + 1));
  return { rows, highlight: yo < 0 ? -1 : Math.min(yo, rows.length - 1) };
}

function proximaPrueba(ctx: ReadContext, s: AtletismoState): string {
  const t = ctx.time;
  if (t.period !== 'clase') return 'No hay carreras en vacaciones: la temporada empieza en septiembre.';
  if (t.schoolWeek < SEMANAS_PRETEMPORADA) return `Pretemporada: la primera carrera es la semana ${SEMANAS_PRETEMPORADA + 1} del curso.`;
  const hechas = (s.campeonatos ?? []).filter((c) => c.curso === t.schoolYear);
  if (t.schoolWeek === SEMANA_SEMIFINAL && !hechas.some((c) => c.tipo === 'semifinal' || c.tipo === 'clasificatoria')) return 'Esta semana, el sábado de 9 a 13: semifinales del campeonato.';
  if (t.schoolWeek === SEMANA_FINAL && s.campeonato?.clasificado && s.campeonato.curso === t.schoolYear && !hechas.some((c) => c.tipo === 'final')) {
    return 'Esta semana, el sábado de 9 a 13: final del campeonato de España.';
  }
  const resto =
    t.schoolWeek < SEMANA_SEMIFINAL
      ? ` Las semifinales del campeonato son la semana ${SEMANA_SEMIFINAL + 1}.`
      : t.schoolWeek < SEMANA_FINAL && s.campeonato?.clasificado && s.campeonato.curso === t.schoolYear
        ? ` La final del campeonato es la semana ${SEMANA_FINAL + 1}.`
        : '';
  if (s.ultimaSemanaCarrera === t.week) return `Ya has corrido esta semana: la próxima carrera es el sábado que viene, de 9 a 13.${resto}`;
  return `Carrera semanal: el sábado, de 9 a 13.${resto}`;
}

/** Tu entrenador: el de tu club que lleva tu edad (los clubes tienen varios, cada uno con unas categorías) y que ya conoces. */
function entrenadorDelJugador(ctx: ReadContext): NpcView | undefined {
  const club = clubDelJugador(ctx);
  if (!club) return undefined;
  const edad = edadDelJugadorDeTemporada(ctx);
  return ctx.service<NpcDirectory>(SERVICES.npcs)?.list({ role: 'entrenador', known: true }).find((n) => n.club === club.id && (!n.edades || (edad >= n.edades[0] && edad <= n.edades[1])));
}

const NOMBRE_DE_HABILIDAD: Readonly<Record<string, string>> = { 'atletismo.tecnica': 'técnica', 'atletismo.ritmo': 'ritmo', 'atletismo.salida': 'salida' };
/** Las habilidades que sube un poco un consejo del entrenador, por turnos según el día (técnica, ritmo, salida). */
const HABILIDADES_DE_CONSEJO = ['atletismo.tecnica', 'atletismo.ritmo', 'atletismo.salida'] as const;
/** Lo que sube el conocimiento con un consejo (15 minutos): como media sesión de técnica, pero solo una vez al día. */
const CONOCIMIENTO_POR_CONSEJO = 1;
const HABILIDAD_POR_CONSEJO = 0.3;

/** Todo lo que enseña la pestaña de atletismo. */
function vistaDeAtletismo(ctx: ReadContext): DeporteView {
  const t = ctx.time;
  const s = ctx.state<AtletismoState>();
  const { competida, superior } = categoriaDelJugador(ctx);
  const club = clubDelJugador(ctx);
  // Tu entrenador: el de tu club que lleva tu edad (los clubes tienen varios, cada uno con unas categorías).
  const edadDeTemporada = edadDelJugadorDeTemporada(ctx);
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
      { titulo: `Clasificación por puntos · ${nombreDeCategoria(cat)}`, tabla: { header: ['Pos.', 'Corredor', 'Club', 'Puntos', 'Carreras', 'Mejor marca'], align: ['left', 'left', 'left', 'right', 'right', 'right'] as ('left' | 'right')[], ...puntos } },
      { titulo: `Mejores marcas · ${nombreDeCategoria(cat)}`, tabla: { header: ['Pos.', 'Corredor', 'Club', 'Mejor marca'], align: ['left', 'left', 'left', 'right'] as ('left' | 'right')[], ...marcas } },
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
          titulo: `${DISCIPLINA} ${nombreDeCategoria(p.categoria)}${NOMBRE_TIPO[p.tipo]}`,
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
  stats: [
    habilidad('tecnica', 'Técnica de carrera', [{ stat: GEN.coordinacion, weight: 0.4 }, { stat: GEN.agilidad, weight: 0.2 }], 'Zancada eficiente y postura.', [{ stat: GEN.coordinacion, weight: 0.5 }, { stat: GEN.agilidad, weight: 0.3 }, { stat: GEN.determinacion, weight: 0.2 }]),
    habilidad('ritmo', 'Gestión del ritmo', [{ stat: GEN.resistencia, weight: 0.4 }, { stat: GEN.inteligencia, weight: 0.2 }], 'Repartir el esfuerzo en la vuelta.', [{ stat: GEN.resistencia, weight: 0.5 }, { stat: GEN.inteligencia, weight: 0.25 }, { stat: GEN.determinacion, weight: 0.25 }]),
    {
      id: CONOCIMIENTO,
      name: 'Conocimiento de atletismo',
      description: 'Entender el deporte: ritmos, tácticas, quién sale mejor. Sube entrenando, compitiendo y, en menor medida, viendo atletismo; casi no se olvida.',
      group: 'Conocimiento',
      category: 'conocimiento',
      initial: 0,
      talentSpread: 0,
      growth: {
        // Sube rápido al principio (la primera carrera da ~1 punto) y cada vez más despacio: a 70 puntos, ver atletismo
        // en la tele da apenas centésimas. Todo el mundo puede llegar a 100, pero el último tramo cuesta años.
        rate: 0.3,
        curve: 2.5,
        // Quien presta atención y razona bien aprende más de lo mismo.
        speedFrom: [
          { stat: GEN.atencion, weight: 0.9 },
          { stat: GEN.inteligencia, weight: 0.6 },
        ],
      },
      decay: { graceDays: 30, ratePerDay: 0.003, floorRatio: 0.95 },
    },
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

  dynamicActions: accionesDeClubes,

  actions: ligarALugares(sinEntrenarPorLibreEnSesion([
    {
      id: 'atletismo.club_sesion',
      name: 'Entrenamiento con el club',
      description: 'Sesión completa con el entrenador y el grupo del club: técnica, ritmo, salida y táctica. Rinde más que entrenar por tu cuenta, y más aún en los clubes de fuera del colegio.',
      tags: [TAGS.fisico, TAGS.cardio, TAGS.entrenamiento, TAGS.club, 'atletismo'],
      group: 'Club',
      // Lo que queda de sesión: si te incorporas tarde solo entrenas la parte proporcional (modificador `atletismo.llegada_tarde`).
      duration: (ctx) => Math.max(1, (clubDelJugador(ctx)?.sesiones.hasta ?? 0) * 60 - ctx.time.minuteOfDay),
      available: (ctx) => {
        const club = clubDelJugador(ctx);
        if (!club) return 'No perteneces a ningún club de atletismo';
        const t = ctx.time;
        if (!club.sesiones.weekdays.includes(t.weekday)) return `Las sesiones de ${club.nombre} son otros días`;
        if (ctx.state<AtletismoState>().ultimaSesionClub === t.day) return 'Ya has entrenado con el club hoy';
        return t.minuteOfDay >= club.sesiones.desde * 60 - MINUTOS_ANTES_DE_SESION && t.minuteOfDay < club.sesiones.hasta * 60
          ? true
          : `La sesión es de ${club.sesiones.desde} a ${club.sesiones.hasta} (se puede entrar desde ${MINUTOS_ANTES_DE_SESION} minutos antes)`;
      },
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
      run: (ctx) => ctx.updateState<AtletismoState>((s) => ({ ...s, ultimaSesionClub: ctx.time.day })),
    },
    {
      id: 'atletismo.dejar_club',
      name: 'Dejar el club de atletismo',
      tags: ['atletismo'],
      group: 'Club',
      duration: 15,
      available: (ctx) => (clubDelJugador(ctx) ? true : 'No perteneces a ningún club de atletismo'),
      run: (ctx) => ctx.emit<ClubLeaveData>({ type: SHARED_EVENTS.CLUB_LEAVE, data: { sport: DEPORTE } }),
    },
    {
      id: 'atletismo.campamento',
      name: 'Campamento de atletismo',
      description: 'Con buenas notas, tus padres te dejan ir a un campamento del deporte que practicas: una jornada completa de entrenamiento con entrenadores. Mejoras más que de ninguna otra forma.',
      tags: [TAGS.fisico, TAGS.cardio, TAGS.entrenamiento, 'atletismo', 'campamento'],
      group: 'Verano',
      duration: 300,
      available: (ctx) => {
        if (caminoDeVerano(ctx) !== 'campamento') return 'Solo puedes pedir campamento en verano si has sacado buenas notas';
        const t = ctx.time;
        if (t.weekday === 6) return 'El campamento no abre los domingos';
        if (ctx.state<AtletismoState>().ultimoVerano === t.day) return 'Ya has ido al campamento hoy';
        return inHours(t, 9, 10) ? true : 'El campamento empieza a las 9';
      },
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
      run: (ctx) => ctx.updateState<AtletismoState>((s) => ({ ...s, ultimoVerano: ctx.time.day })),
    },
    {
      id: 'atletismo.amigos',
      name: 'Practicar con los amigos',
      description: 'Con notas aceptables, el verano se pasa jugando y corriendo con los amigos: sienta bien, pero no se mejora igual que entrenando.',
      tags: [TAGS.fisico, TAGS.social, 'atletismo'],
      group: 'Verano',
      duration: 120,
      available: (ctx) => {
        if (caminoDeVerano(ctx) !== 'amigos') return 'Solo en verano, con notas aceptables';
        const t = ctx.time;
        if (ctx.state<AtletismoState>().ultimoVerano === t.day) return 'Ya has quedado con los amigos hoy';
        return inHours(t, 10, 19) ? true : 'De 10 a 19';
      },
      delta: { [GEN.energia]: -12, [GEN.estres]: -6 },
      train: [
        { stat: 'atletismo.tecnica', amount: 0.4 },
        { stat: 'atletismo.ritmo', amount: 0.4 },
        { stat: 'atletismo.salida', amount: 0.4 },
        { stat: GEN.carisma, amount: 0.4 },
        { stat: GEN.cooperacion, amount: 0.3 },
      ],
      run: (ctx) => ctx.updateState<AtletismoState>((s) => ({ ...s, ultimoVerano: ctx.time.day })),
    },
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
    {
      id: 'atletismo.ver_tele',
      name: 'Ver atletismo en la tele',
      description: 'Retransmisiones y carreras de otros: aprendes cómo se corre y quién sale mejor.',
      tags: [TAGS.mental],
      group: 'Tiempo libre',
      duration: 90,
      available: (ctx) => {
        const t = ctx.time;
        if ((ctx.state<AtletismoState>().ultimaTele ?? -1) === t.day) return 'Ya has visto atletismo hoy';
        return inHours(t, t.isSchoolDay ? 18 : 10, 23) ? true : 'Retransmisiones: días de clase de 18 a 23, sin clase de 10 a 23';
      },
      delta: { [GEN.energia]: -2, [GEN.estres]: -4 },
      train: [
        // Ayuda a entender el deporte, pero no sustituye a entrenar ni a competir.
        { stat: CONOCIMIENTO, amount: 0.6 },
        { stat: GEN.atencion, amount: 0.2 },
      ],
      run: (ctx) => ctx.updateState<AtletismoState>((s) => ({ ...s, ultimaTele: ctx.time.day })),
    },
    {
      id: 'atletismo.pedir_consejo',
      name: 'Pedir consejo a tu entrenador',
      description: 'Le preguntas qué mejorar y cómo. Solo una vez al día y cuando está contigo (antes o después de la sesión): sube tu conocimiento del deporte y un poco una habilidad. Hablar con él solo mejora la relación.',
      tags: [TAGS.mental, 'atletismo'],
      group: 'Entrenar atletismo',
      duration: 15,
      available: (ctx) => {
        if ((ctx.state<AtletismoState>().ultimoConsejo ?? -1) === ctx.time.day) return 'Ya le has pedido consejo hoy';
        if (!clubDelJugador(ctx)) return 'Necesitas un entrenador: apúntate a un club';
        const entrenador = entrenadorDelJugador(ctx);
        if (!entrenador) return 'Todavía no conoces a tu entrenador';
        const presencia = ctx.service<PresenciaService>(SERVICES.presencia);
        // Sin el módulo de presencia no se comprueba. Con él, el entrenador tiene que estar en su sitio (no ocupado en la sesión).
        if (presencia && presencia.donde(entrenador.id) !== sedeDelClub(ctx)[0]) return `${entrenador.name.split(' ')[0]} ahora no está disponible: búscalo antes o después de la sesión`;
        return true;
      },
      delta: { [GEN.energia]: -1 },
      train: [
        { stat: CONOCIMIENTO, amount: CONOCIMIENTO_POR_CONSEJO },
        { stat: GEN.atencion, amount: 0.15 },
      ],
      run: (ctx) => {
        // Además, un poco de una habilidad del deporte (cada día, otra).
        const habilidad = HABILIDADES_DE_CONSEJO[ctx.time.day % HABILIDADES_DE_CONSEJO.length];
        ctx.train(habilidad, HABILIDAD_POR_CONSEJO * ctx.efficiency);
        ctx.updateState<AtletismoState>((s) => ({ ...s, ultimoConsejo: ctx.time.day }));
        const entrenador = entrenadorDelJugador(ctx);
        ctx.log(`${entrenador ? entrenador.name.split(' ')[0] : 'Tu entrenador'} te da un consejo para mejorar tu ${NOMBRE_DE_HABILIDAD[habilidad]}.`, 'info');
      },
    },
    {
      id: 'atletismo.subir_categoria',
      name: 'Aceptar competir en la categoría superior',
      description: 'Tu entrenador propone que compitas con los mayores si destacas mucho en tu categoría y puedes ser competitivo. Contra rivales más fuertes se aprende más.',
      tags: ['atletismo'],
      group: 'Competición',
      duration: 15,
      available: puedeSubir,
      run: (ctx) => {
        const { propia } = categoriaDelJugador(ctx);
        const sup = categoriaSuperior(CATEGORIAS, propia)!;
        ctx.updateState<AtletismoState>((s) => ({ ...s, categoriaSuperior: true, categoriaPropia: propia.id }));
        ctx.log(`Tu entrenador te propone competir en ${sup.nombre}, aunque te toca ${propia.nombre}. Aceptas.`, 'logro');
      },
    },
    {
      id: 'atletismo.volver_categoria',
      name: 'Volver a competir en tu categoría',
      tags: ['atletismo'],
      group: 'Competición',
      duration: 15,
      available: (ctx) => (categoriaDelJugador(ctx).superior ? true : 'Ya compites en tu categoría'),
      run: (ctx) => {
        const { propia } = categoriaDelJugador(ctx);
        ctx.updateState<AtletismoState>((s) => ({ ...s, categoriaSuperior: false }));
        ctx.log(`Vuelves a competir en ${propia.nombre}.`);
      },
    },
    {
      id: 'atletismo.semifinal',
      name: 'Competir: semifinales del campeonato',
      description: `Una vez por curso (sábado de la semana ${SEMANA_SEMIFINAL + 1}), con hasta ${CORREDORES_POR_CARRERA} corredores de tu categoría repartidos en dos series de nueve. Pasan a la final los ${CLASIFICADOS_POR_SERIE} primeros de cada serie.`,
      tags: [TAGS.fisico, TAGS.cardio, TAGS.competicion, 'atletismo'],
      group: 'Competición',
      duration: 180,
      available: (ctx) => {
        const t = ctx.time;
        if (t.period !== 'clase' || t.schoolWeek !== SEMANA_SEMIFINAL) return `Las semifinales del campeonato son en la semana ${SEMANA_SEMIFINAL + 1} del curso`;
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
      name: 'Competir: final del campeonato de España',
      description: `Para quien se clasificó en las semifinales (sábado de la semana ${SEMANA_FINAL + 1}): ocho corredores, los cuatro primeros de cada serie. Hay medallas.`,
      tags: [TAGS.fisico, TAGS.cardio, TAGS.competicion, 'atletismo'],
      group: 'Competición',
      duration: 180,
      available: (ctx) => {
        const t = ctx.time;
        if (t.period !== 'clase' || t.schoolWeek !== SEMANA_FINAL) return `La final es en la semana ${SEMANA_FINAL + 1} del curso`;
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
        if (t.schoolWeek < SEMANAS_PRETEMPORADA) return 'Pretemporada: todavía no hay carreras';
        if (t.schoolWeek === SEMANA_SEMIFINAL) return 'Esta semana son las semifinales del campeonato';
        if (t.schoolWeek === SEMANA_FINAL && ctx.state<AtletismoState>().campeonato?.clasificado) return 'Esta semana es la final del campeonato';
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

  modifiers: [
    {
      // Incorporarse tarde a la sesión del club: solo se entrena la parte de sesión que queda.
      id: 'atletismo.llegada_tarde',
      tags: ['atletismo'],
      apply: (ctx, action) => {
        if (action.id !== 'atletismo.club_sesion') return null;
        const club = clubDelJugador(ctx);
        if (!club) return null;
        const [desde, hasta] = [club.sesiones.desde * 60, club.sesiones.hasta * 60];
        const parte = (hasta - Math.max(ctx.time.minuteOfDay, desde)) / (hasta - desde);
        return parte >= 0.995 ? null : { efficiency: parte, reason: `Llegas tarde: solo entrenas el ${Math.round(parte * 100)} % de la sesión` };
      },
    },
    {
      id: 'atletismo.campamento',
      tags: ['campamento'],
      apply: () => ({ efficiency: EFICIENCIA_CAMPAMENTO, reason: 'Campamento con entrenadores' }),
    },
    {
      id: 'atletismo.por_tu_cuenta',
      tags: ['atletismo'],
      apply: (_ctx, action) =>
        ENTRENOS_LIBRES.includes(action.id) ? { efficiency: EFICIENCIA_POR_TU_CUENTA, reason: 'Entrenas por tu cuenta, sin entrenador' } : null,
    },
    {
      id: 'atletismo.conocimiento',
      tags: ['atletismo'],
      apply: (ctx, action) => {
        if (!action.tags.includes(TAGS.entrenamiento) && !action.tags.includes(TAGS.competicion)) return null;
        const f = EFECTO_CONOCIMIENTO.min + EFECTO_CONOCIMIENTO.rango * ctx.norm(CONOCIMIENTO);
        if (Math.abs(f - 1) < 0.02) return null;
        return { efficiency: f, reason: f < 1 ? 'Conoces poco el deporte' : 'Conocimiento del deporte' };
      },
    },
    {
      id: 'atletismo.sobrecarga',
      tags: ['atletismo'],
      apply: (ctx, action) => {
        if (!action.tags.includes(TAGS.entrenamiento)) return null;
        const s = ctx.state<AtletismoState>().sesionesHoy;
        const n = s.day === ctx.time.day ? s.n : 0;
        if (n < SESIONES_SIN_SOBRECARGA) return null;
        return { efficiency: 0.6, cost: 1.3, reason: 'Sobrecarga: demasiadas sesiones hoy' };
      },
    },
  ],

  on: {
    // El primer día se suma el conocimiento del deporte que le viene de casa: si sus padres practicaron atletismo, algo sabe (más si llegaron lejos).
    [CORE_EVENTS.DAY_END]: (ctx) => {
      if (ctx.state<AtletismoState>().herenciaAplicada) return;
      ctx.updateState<AtletismoState>((s) => ({ ...s, herenciaAplicada: true }));
      const padres = ctx.service<FamilyService>(SERVICES.familia)?.parents();
      const conocimiento = padres ? conocimientoDeCrianza(padres, DEPORTE) : 0;
      if (conocimiento > 0) {
        ctx.addStat(CONOCIMIENTO, conocimiento);
        ctx.log(`Has crecido oyendo hablar de atletismo en casa: ya sabes algo del deporte.`, 'info');
      }
    },
    [CORE_EVENTS.ACTION_DONE]: (ctx, ev) => {
      const d = ev.data as ActionDoneData;
      if (d.module !== 'atletismo' || !d.tags.includes(TAGS.entrenamiento)) return;
      // El día se toma del momento en que empezó la sesión (antes de avanzar el reloj).
      const dia = Math.floor((ctx.time.minute - d.duration) / 1440);
      const prev = ctx.state<AtletismoState>().sesionesHoy;
      const n = prev.day === dia ? prev.n + 1 : 1;
      ctx.updateState<AtletismoState>((s) => ({ ...s, sesionesHoy: { day: dia, n } }));
      // Entrenar con sobrecarga castiga el cuerpo y puede lesionar.
      if (n > SESIONES_SIN_SOBRECARGA) {
        ctx.addStat(GEN.salud, -4);
        if (ctx.rng.chance(0.15)) {
          ctx.addStat(GEN.salud, -10);
          ctx.log('Molestias musculares: te has pasado entrenando.', 'aviso');
        }
      }
    },
  },
});

export default atletismo;
