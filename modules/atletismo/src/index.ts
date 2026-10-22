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
  type ActionDoneData,
  type ActionContext,
  type ActionDef,
  type CategoriaDef,
  type ClubDirectory,
  type ClubJoinData,
  type ClubLeaveData,
  type ClubView,
  type CompetitionResultData,
  type IdentityService,
  type NpcDirectory,
  type ReadContext,
  type StudiesService,
  type Rng,
  type StatDef,
} from '@ds/contracts';

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
  /** Último día que fue al campamento o practicó con los amigos en verano (uno al día). */
  ultimoVerano?: number;
  /** Campeonato del curso: si se clasificó en la autonómica y quiénes corren la final. */
  campeonato?: { curso: number; clasificado: boolean; finalistas: string[] };
  /** Resultados de clasificatorias y finales. */
  campeonatos?: { curso: number; categoria: string; tipo: 'clasificatoria' | 'final'; position: number; total: number }[];
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

const habilidad = (key: string, name: string, apoyos: Apoyo[], description: string): StatDef => ({
  id: `atletismo.${key}`,
  name,
  description,
  group: 'Atletismo',
  category: 'habilidad',
  initial: { min: 5, max: 15 },
  talentSpread: 0.2,
  genetics: { family: 'fisico' },
  growth: {
    rate: 0.5,
    curve: 1.5,
    speedFrom: [...apoyos, { stat: GEN.determinacion, weight: 0.2 }],
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
/** Semanas del curso (0 = la primera) de la clasificatoria autonómica y de la final del campeonato de España. */
const SEMANA_CLASIFICATORIA = 24;
const SEMANA_FINAL = 38;
/** Corredores de la clasificatoria (el jugador y 15 rivales) y puestos que dan acceso a la final. */
const CORREDORES_CLASIFICATORIA = 16;
const PUESTOS_PARA_LA_FINAL = 8;
/** Semanas que hay que esperar para repetir la prueba de acceso de un club. */
const SEMANAS_ENTRE_PRUEBAS = 8;
/** Entrenar solo, sin entrenador ni grupo, rinde menos que una sesión de club. */
const EFICIENCIA_POR_TU_CUENTA = 0.85;
const ENTRENOS_LIBRES = ['atletismo.series', 'atletismo.rodaje', 'atletismo.tecnica'];

const DEPORTE = 'atletismo';
/** El campamento de verano rinde más que cualquier otro entrenamiento: entrenadores, grupo y todo el día. */
const EFICIENCIA_CAMPAMENTO = 1.2;
const caminoDeVerano = (ctx: ReadContext) => ctx.service<StudiesService>(SERVICES.estudios)?.summerPath() ?? null;
const clubDelJugador = (ctx: ReadContext): ClubView | undefined => ctx.service<ClubDirectory>(SERVICES.clubes)?.membership(DEPORTE);
const edadDelJugador = (ctx: ReadContext): number => ctx.service<IdentityService>(SERVICES.identidad)?.view().age ?? 8;

/** Pruebas de acceso a los clubes de fuera del colegio, que el personaje todavía no tiene. */
function accionesDeClubes(ctx: ReadContext): ActionDef[] {
  const clubes = ctx.service<ClubDirectory>(SERVICES.clubes);
  if (!clubes) return [];
  const actual = clubes.membership(DEPORTE);
  return clubes
    .list(DEPORTE)
    .filter((c) => !c.esColegio && c.id !== actual?.id && c.acceso?.[DEPORTE])
    .map((c): ActionDef => {
      const acceso = c.acceso![DEPORTE];
      return {
        id: `atletismo.prueba.${c.id}`,
        name: `Prueba de acceso: ${c.nombre}`,
        description: `El ${c.nombre} hace pruebas a quien quiere entrar. Exige edad (${acceso.edadMin}+) y nivel; si no pasas, puedes repetirla pasadas ${SEMANAS_ENTRE_PRUEBAS} semanas.`,
        tags: [TAGS.fisico, 'atletismo'],
        group: 'Club',
        duration: 150,
        available: (c2) => {
          const t = c2.time;
          if (edadDelJugador(c2) < acceso.edadMin) return `Hay que tener ${acceso.edadMin} años para probar en el ${c.nombre}`;
          const ultima = c2.state<AtletismoState>().pruebas?.[c.id];
          if (ultima !== undefined && t.week - ultima < SEMANAS_ENTRE_PRUEBAS) return 'Hiciste la prueba hace poco: espera unas semanas';
          return inHours(t, t.isSchoolDay ? 16 : 10, t.isSchoolDay ? 19 : 13) ? true : 'Las pruebas son los días de clase de 16 a 19 y sin clase de 10 a 13';
        },
        delta: { [GEN.energia]: -25, [GEN.estres]: 6 },
        run: (c2) => {
          const t = c2.time;
          const forma = 0.85 + 0.15 * Math.min(1.2, c2.efficiency);
          const rinde = rendimiento(c2) * forma + c2.rng.normal() * 3;
          c2.updateState<AtletismoState>((s) => ({ ...s, pruebas: { ...(s.pruebas ?? {}), [c.id]: t.week } }));
          if (rinde >= acceso.nivel) {
            c2.emit<ClubJoinData>({ type: SHARED_EVENTS.CLUB_JOIN, data: { sport: DEPORTE, clubId: c.id } });
          } else {
            c2.log(`Prueba en el ${c.nombre}: todavía no tienes el nivel que piden. Sigue entrenando y vuelve a intentarlo.`, 'aviso');
            c2.addStat(GEN.motivacion, -3);
          }
        },
      };
    });
}

const horarioEntreno = (ctx: ReadContext): true | string => {
  const t = ctx.time;
  // Sin clase (fines de semana y vacaciones) las pistas abren todo el día.
  if (!t.isSchoolDay) return inHours(t, 8, 20) ? true : 'Las pistas abren de 8 a 20 sin clase (fines de semana y vacaciones)';
  return inHours(t, 15, 21) ? true : 'Entrenamientos entre semana de 15 a 21';
};

/** Rendimiento 0..100 a partir de las stats (el corazón del deporte; ajustable sin tocar nada más). */
export function rendimiento(ctx: ReadContext): number {
  return (
    0.25 * ctx.stat(GEN.velocidad) +
    0.2 * ctx.stat(GEN.resistencia) +
    0.25 * ctx.stat('atletismo.tecnica') +
    0.15 * ctx.stat('atletismo.ritmo') +
    0.15 * ctx.stat('atletismo.salida')
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


type TipoCarrera = 'regular' | 'clasificatoria' | 'final';

const NOMBRE_TIPO: Record<TipoCarrera, string> = {
  regular: '',
  clasificatoria: ' · clasificatoria autonómica',
  final: ' · final del campeonato de España',
};

/** Corre una carrera (semanal, clasificatoria o final) y aplica todas sus consecuencias. */
function disputar(ctx: ActionContext, tipo: TipoCarrera): void {
  const t = ctx.time;
  // El día cuenta: cansancio, salud, motivación... ya vienen en la eficiencia.
  const forma = 0.85 + 0.15 * Math.min(1.2, ctx.efficiency);
  const miMarca = marca400(rendimiento(ctx) * forma, ctx.rng);

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
  const enCategoria = estado.carreras.filter((c) => c.categoria === competida.id).length;

  let elegidos: Corredor[];
  let plazas = PARTICIPANTES - 1;
  if (tipo === 'regular') {
    elegidos = elegirRivales(conocidos, plazas, t.week, enCategoria, previa, ctx.rng);
  } else if (tipo === 'clasificatoria') {
    // Toda la categoría de la zona: el jugador y 15 rivales (los que haya; el resto, corredores genéricos).
    plazas = CORREDORES_CLASIFICATORIA - 1;
    const resto = [...conocidos];
    elegidos = [];
    while (elegidos.length < plazas && resto.length) elegidos.push(...resto.splice(Math.floor(ctx.rng.next() * resto.length), 1));
  } else {
    // La final la corren los clasificados (los 7 mejores de la clasificatoria); si faltan, los mejores de la categoría.
    plazas = PARTICIPANTES - 1;
    const ids = estado.campeonato?.finalistas ?? [];
    const finalistas = conocidos.filter((c) => c.npcId && ids.includes(c.npcId));
    const otros = conocidos.filter((c) => !finalistas.includes(c)).sort((a, b) => b.level - a.level);
    elegidos = [...finalistas, ...otros].slice(0, plazas);
  }
  const rivales: Corredor[] = [...elegidos, ...rivalesGenericos(Math.max(0, plazas - elegidos.length), t.week, ctx.rng)];

  const miClub = clubDelJugador(ctx)?.nombre;
  const clubes = new Map<string, string>(rivales.filter((r) => r.club).map((r) => [r.name, r.club!]));
  if (miClub) clubes.set('Tú', miClub);
  const marcas = rivales.map((r) => ({ npcId: r.npcId, name: r.name, mark: marca400(r.level, ctx.rng) }));
  const participants: CompetitionResultData['participants'] = [{ name: 'Tú', mark: miMarca, isPlayer: true }, ...marcas].sort(
    (a, b) => a.mark - b.mark,
  );
  const position = participants.findIndex((p) => p.isPlayer) + 1;
  const total = participants.length;
  const record = estado.mejorMarca === null || miMarca < estado.mejorMarca;
  const base = {
    ...estado,
    mejorMarca: record ? miMarca : estado.mejorMarca,
    ultimaSemanaCarrera: t.week,
    categoriaPropia: propia.id,
    categoriaSuperior: superior,
  };

  let cierre = '';
  if (tipo === 'regular') {
    ctx.setState<AtletismoState>({
      ...base,
      carreras: [...estado.carreras, { week: t.week, position, total, mark: miMarca, categoria: competida.id, superior }].slice(-52),
      ultimaCarreraRival: {
        ...previa,
        ...Object.fromEntries(elegidos.filter((r) => r.npcId).map((r) => [r.npcId!, t.week])),
      },
    });
  } else {
    const resultados = [...(estado.campeonatos ?? []), { curso: t.schoolYear, categoria: competida.id, tipo, position, total }].slice(-20);
    if (tipo === 'clasificatoria') {
      const clasificado = position <= PUESTOS_PARA_LA_FINAL;
      // A la final pasan los 7 rivales mejor clasificados (más el jugador, si se ha clasificado).
      const finalistas = participants.filter((p) => !p.isPlayer && p.npcId).slice(0, PARTICIPANTES - 1).map((p) => p.npcId!);
      ctx.setState<AtletismoState>({ ...base, campeonatos: resultados, campeonato: { curso: t.schoolYear, clasificado, finalistas } });
      cierre = clasificado
        ? ` ¡Te clasificas para la final del campeonato de España, el sábado de la semana ${SEMANA_FINAL + 1}!`
        : ' No te clasificas para la final: a por la del año que viene.';
    } else {
      ctx.setState<AtletismoState>({ ...base, campeonatos: resultados });
      const medalla = ['oro', 'plata', 'bronce'][position - 1];
      cierre = medalla ? ` ¡Medalla de ${medalla}!` : '';
    }
  }

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
  ctx.log(
    `${DISCIPLINA} ${competida.nombre}${NOMBRE_TIPO[tipo]}: ${position}º de ${total} con ${miMarca.toFixed(2)} s${dif}${record ? ' (¡mejor marca personal!)' : ''}.${cierre}`,
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

export const atletismo = defineModule<AtletismoState>({
  id: 'atletismo',
  name: 'Atletismo',
  description: '400 metros lisos. Entrena por la tarde y compite los sábados.',
  dependsOn: ['gen'],
  stats: [
    habilidad('tecnica', 'Técnica de carrera', [{ stat: GEN.coordinacion, weight: 0.4 }, { stat: GEN.agilidad, weight: 0.2 }], 'Zancada eficiente y postura.'),
    habilidad('ritmo', 'Gestión del ritmo', [{ stat: GEN.resistencia, weight: 0.4 }, { stat: GEN.inteligencia, weight: 0.2 }], 'Repartir el esfuerzo en la vuelta.'),
    {
      id: CONOCIMIENTO,
      name: 'Conocimiento de atletismo',
      description: 'Entender el deporte: ritmos, tácticas, quién sale mejor. Sube entrenando, compitiendo y, en menor medida, viendo atletismo; casi no se olvida.',
      group: 'Conocimiento',
      category: 'conocimiento',
      initial: 0,
      talentSpread: 0,
      growth: {
        rate: 0.15,
        curve: 1.2,
        // Quien presta atención y razona bien aprende más de lo mismo.
        speedFrom: [
          { stat: GEN.atencion, weight: 0.9 },
          { stat: GEN.inteligencia, weight: 0.6 },
        ],
      },
      decay: { graceDays: 30, ratePerDay: 0.003, floorRatio: 0.95 },
    },
    habilidad('salida', 'Salida y aceleración', [{ stat: GEN.velocidad, weight: 0.4 }, { stat: GEN.fuerza, weight: 0.2 }], 'Arrancar rápido desde los tacos.'),
  ],

  initState: () => ({
    mejorMarca: null,
    carreras: [],
    ultimaSemanaCarrera: -1,
    sesionesHoy: { day: -1, n: 0 },
    ultimaTele: -1,
  }),

  dynamicActions: accionesDeClubes,

  actions: [
    {
      id: 'atletismo.apuntarse_colegio',
      name: 'Apuntarte al club de atletismo del colegio',
      description: 'El club del colegio entrena con su entrenador en sesiones fijas. Es el primer paso para competir con un equipo.',
      tags: ['atletismo'],
      group: 'Club',
      duration: 30,
      available: (ctx) => {
        if (clubDelJugador(ctx)) return 'Ya perteneces a un club de atletismo';
        const t = ctx.time;
        return t.isSchoolDay && inHours(t, 14, 19) ? true : 'Puedes apuntarte los días de clase, de 14 a 19';
      },
      run: (ctx) => ctx.emit<ClubJoinData>({ type: SHARED_EVENTS.CLUB_JOIN, data: { sport: DEPORTE, clubId: 'colegio' } }),
    },
    {
      id: 'atletismo.club_sesion',
      name: 'Entrenamiento con el club',
      description: 'Sesión completa con el entrenador y el grupo del club: técnica, ritmo, salida y táctica. Rinde más que entrenar por tu cuenta, y más aún en los clubes de fuera del colegio.',
      tags: [TAGS.fisico, TAGS.cardio, TAGS.entrenamiento, TAGS.club, 'atletismo'],
      group: 'Club',
      duration: 120,
      available: (ctx) => {
        const club = clubDelJugador(ctx);
        if (!club) return 'No perteneces a ningún club de atletismo';
        const t = ctx.time;
        if (!club.sesiones.weekdays.includes(t.weekday)) return `Las sesiones de ${club.nombre} son otros días`;
        if (ctx.state<AtletismoState>().ultimaSesionClub === t.day) return 'Ya has entrenado con el club hoy';
        return inHours(t, club.sesiones.desde, club.sesiones.hasta - 1) ? true : `La sesión es de ${club.sesiones.desde} a ${club.sesiones.hasta}`;
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
      id: 'atletismo.clasificatoria',
      name: 'Competir: clasificatoria autonómica',
      description: `Una vez por curso (sábado de la semana ${SEMANA_CLASIFICATORIA + 1}), con 16 corredores. Los 8 primeros se clasifican para la final del campeonato de España.`,
      tags: [TAGS.fisico, TAGS.cardio, TAGS.competicion, 'atletismo'],
      group: 'Competición',
      duration: 180,
      available: (ctx) => {
        const t = ctx.time;
        if (t.period !== 'clase' || t.schoolWeek !== SEMANA_CLASIFICATORIA) return `La clasificatoria autonómica es en la semana ${SEMANA_CLASIFICATORIA + 1} del curso`;
        if (ctx.state<AtletismoState>().ultimaSemanaCarrera === t.week) return 'Ya has competido esta semana';
        return t.weekday === 5 && inHours(t, 9, 13) ? true : 'Es el sábado, de 9 a 13';
      },
      delta: { [GEN.energia]: -35, [GEN.estres]: 7 },
      train: [
        { stat: 'atletismo.ritmo', amount: 1.5 },
        { stat: 'atletismo.salida', amount: 0.8 },
        { stat: CONOCIMIENTO, amount: 3 },
      ],
      run: (ctx) => disputar(ctx, 'clasificatoria'),
    },
    {
      id: 'atletismo.final',
      name: 'Competir: final del campeonato de España',
      description: `Para quien se clasificó en la autonómica (sábado de la semana ${SEMANA_FINAL + 1}): ocho corredores, los mejores de la categoría. Hay medallas.`,
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
        if (t.schoolWeek === SEMANA_CLASIFICATORIA) return 'Esta semana es la clasificatoria autonómica';
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
  ],

  modifiers: [
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
