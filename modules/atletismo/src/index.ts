import {
  CORE_EVENTS,
  GEN,
  SERVICES,
  SHARED_EVENTS,
  TAGS,
  defineModule,
  inHours,
  type ActionDoneData,
  type CompetitionResultData,
  type NpcDirectory,
  type ReadContext,
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
  carreras: { week: number; position: number; total: number; mark: number }[];
  ultimaSemanaCarrera: number;
  /** Sesiones de entrenamiento hechas hoy (para la sobrecarga). */
  sesionesHoy: { day: number; n: number };
  /** Último día que vio atletismo en la tele (una vez al día; ausente en partidas antiguas). */
  ultimaTele?: number;
  /** Última semana en que cada rival corrió contra el jugador (para rotar la serie). */
  ultimaCarreraRival?: Record<string, number>;
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
  growth: {
    rate: 0.5,
    curve: 1.5,
    speedFrom: [...apoyos, { stat: GEN.determinacion, weight: 0.2 }],
    cap: {
      base: 0.55,
      from: [...apoyos.map((a) => ({ stat: a.stat, weight: a.weight / 2 })), { stat: GEN.determinacion, weight: 0.15 }],
    },
  },
  decay: { graceDays: 4, ratePerDay: 0.012, floorRatio: 0.7 },
});

/** Semanas de pretemporada al empezar cada curso: se entrena pero todavía no hay carreras. */
const SEMANAS_PRETEMPORADA = 4;

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

  actions: [
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
      run: (ctx) => {
        const t = ctx.time;
        // El día cuenta: cansancio, salud, motivación... ya vienen en la eficiencia.
        const forma = 0.85 + 0.15 * Math.min(1.2, ctx.efficiency);
        const miMarca = marca400(rendimiento(ctx) * forma, ctx.rng);

        const npcs = ctx.service<NpcDirectory>(SERVICES.npcs);
        const conocidos: Corredor[] = npcs
          ? npcs.list({ tag: 'atleta' }).map((n) => ({ npcId: n.id, name: n.name, level: n.levels.atletismo ?? 30 }))
          : [];
        const previa = ctx.state<AtletismoState>().ultimaCarreraRival ?? {};
        const elegidos = elegirRivales(conocidos, PARTICIPANTES - 1, t.week, ctx.state<AtletismoState>().carreras.length, previa, ctx.rng);
        const rivales: Corredor[] = [
          ...elegidos,
          ...rivalesGenericos(Math.max(0, PARTICIPANTES - 1 - elegidos.length), t.week, ctx.rng),
        ];

        const participants: CompetitionResultData['participants'] = [
          { name: 'Tú', mark: miMarca, isPlayer: true },
          ...rivales.map((r) => ({ npcId: r.npcId, name: r.name, mark: marca400(r.level, ctx.rng) })),
        ].sort((a, b) => a.mark - b.mark);
        const position = participants.findIndex((p) => p.isPlayer) + 1;
        const total = participants.length;

        const s = ctx.state<AtletismoState>();
        const record = s.mejorMarca === null || miMarca < s.mejorMarca;
        ctx.setState<AtletismoState>({
          ...s,
          mejorMarca: record ? miMarca : s.mejorMarca,
          carreras: [...s.carreras, { week: t.week, position, total, mark: miMarca }].slice(-52),
          ultimaSemanaCarrera: t.week,
          ultimaCarreraRival: {
            ...previa,
            ...Object.fromEntries(elegidos.filter((r) => r.npcId).map((r) => [r.npcId!, t.week])),
          },
        });

        const ganador = participants[0].mark;
        const tabla = {
          header: ['Pos.', 'Corredor', 'Tiempo', 'Dif.'],
          rows: participants.map((p, i) => [
            `${i + 1}º`,
            p.name,
            `${p.mark.toFixed(2)} s`,
            i === 0 ? '—' : `+${(p.mark - ganador).toFixed(2)}`,
          ]),
          highlight: position - 1,
        };
        const dif = position === 1 ? '' : `, a ${(miMarca - ganador).toFixed(2)} s del 1º`;
        ctx.log(
          `${DISCIPLINA}: ${position}º de ${total} con ${miMarca.toFixed(2)} s${dif}${record ? ' (¡mejor marca personal!)' : ''}`,
          'resultado',
          tabla,
        );
        if (position === 1) ctx.addStat(GEN.motivacion, 6);
        else if (position <= 3) ctx.addStat(GEN.motivacion, 3);
        else if (position === total) ctx.addStat(GEN.motivacion, -3);
        if (record) ctx.addStat(GEN.motivacion, 2);
        // Los golpes curten: perder entrena la resiliencia mucho más que ganar.
        ctx.train(GEN.resiliencia, position > total / 2 ? 0.8 : 0.2);

        ctx.emit<CompetitionResultData>({
          type: SHARED_EVENTS.COMPETITION_RESULT,
          data: { module: 'atletismo', discipline: DISCIPLINA, position, total, mark: miMarca, unit: 's', participants },
        });
      },
    },
  ],

  modifiers: [
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
