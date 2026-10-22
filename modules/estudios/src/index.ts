import {
  CORE_EVENTS,
  GEN,
  SERVICES,
  TAGS,
  defineModule,
  inHours,
  isSchoolHours,
  MINUTES_PER_DAY,
  NOMBRE_PERIODO,
  minutesUntilHour,
  timeView,
  type ActionContext,
  type ActionDef,
  type DayEventData,
  type ReadContext,
  type StatDef,
  type StudiesService,
} from '@ds/contracts';

/**
 * MÓDULO ESTUDIOS (id `estudios`).
 * Asignaturas como habilidades. Clase por la mañana, estudio por la tarde,
 * control de cada asignatura los viernes. Las notas quedan disponibles para
 * otros módulos a través del servicio `estudios` (p. ej. una futura beca deportiva).
 */

interface Asignatura {
  key: string;
  name: string;
  /** Genéricas que aceleran la asignatura (suman 1) y que además entrena estudiarla. */
  apoyos: { stat: string; weight: number }[];
  /** Genérica extra que entrena estudiar esta asignatura (si la hay). */
  entrena?: { stat: string; amount: number };
}

export const ASIGNATURAS: readonly Asignatura[] = [
  {
    key: 'matematicas',
    name: 'Matemáticas',
    apoyos: [{ stat: GEN.inteligencia, weight: 0.5 }, { stat: GEN.concentracion, weight: 0.5 }],
  },
  {
    key: 'lengua',
    name: 'Lengua',
    apoyos: [{ stat: GEN.inteligencia, weight: 0.35 }, { stat: GEN.comunicacion, weight: 0.35 }, { stat: GEN.concentracion, weight: 0.3 }],
    entrena: { stat: GEN.comunicacion, amount: 0.3 },
  },
  {
    key: 'ciencias',
    name: 'Ciencias',
    apoyos: [{ stat: GEN.inteligencia, weight: 0.4 }, { stat: GEN.atencion, weight: 0.3 }, { stat: GEN.creatividad, weight: 0.3 }],
    entrena: { stat: GEN.creatividad, amount: 0.3 },
  },
];

export interface EstudiosState {
  /** Últimas notas por asignatura (más reciente al final). */
  notas: Record<string, number[]>;
  faltas: number;
  /** Media semanal de los controles del trimestre en curso (se vacía en cada evaluación). */
  controlesTrimestre?: number[];
  /** Notas medias de cada evaluación de trimestre. */
  boletines?: { curso: number; trimestre: number; media: number }[];
  /** Último día con asistencia a clase. */
  ultimaAsistencia: number;
}

const statId = (key: string) => `estudios.${key}`;
const NOTAS_GUARDADAS = 12;
const MIN_HORA_CLASE = 7;
const MAX_HORA_CLASE = 9;

const asignaturaStat = (a: Asignatura): StatDef => ({
  id: statId(a.key),
  name: a.name,
  group: 'Asignaturas',
  category: 'habilidad',
  initial: { min: 15, max: 30 },
  talentSpread: 0.2,
  growth: {
    rate: 0.5,
    curve: 1.5,
    speedFrom: a.apoyos,
    // El techo pesa 0,45 en total, repartido igual que el ritmo.
    cap: { base: 0.55, from: a.apoyos.map((x) => ({ stat: x.stat, weight: Math.round(x.weight * 0.45 * 1000) / 1000 })) },
  },
  decay: { graceDays: 10, ratePerDay: 0.006, floorRatio: 0.75 },
});

const tiempoDeEstudio = (ctx: ReadContext): true | string => {
  if (isSchoolHours(ctx.time)) return 'Estás en horario de clase';
  return inHours(ctx.time, 7, 23) ? true : 'Demasiado tarde para estudiar';
};

const estudiar = (a: Asignatura): ActionDef => ({
  id: `estudios.estudiar_${a.key}`,
  name: `Estudiar ${a.name.toLowerCase()}`,
  tags: [TAGS.estudio, TAGS.mental],
  group: 'Estudiar',
  duration: 90,
  available: tiempoDeEstudio,
  delta: { [GEN.energia]: -10, [GEN.estres]: 6 },
  train: [
    { stat: statId(a.key), amount: 3 },
    { stat: GEN.inteligencia, amount: 0.4 },
    { stat: GEN.concentracion, amount: 0.4 },
    ...(a.entrena ? [a.entrena] : []),
  ],
});

/** Nota de un control: 30 → ~4.2, 50 → ~6, 70 → ~7.8, 90 → ~9.6 (± azar y estrés). */
export function notaControl(nivel: number, estres: number, ruido: number): number {
  const penalizacionEstres = Math.max(0, estres - 60) / 20;
  const n = 1.5 + nivel * 0.09 + ruido * 0.6 - penalizacionEstres;
  return Math.round(Math.min(10, Math.max(0, n)) * 10) / 10;
}

const media = (s: EstudiosState): number | null => {
  const ultimas = Object.values(s.notas).flatMap((n) => n.slice(-3));
  return ultimas.length ? ultimas.reduce((a, b) => a + b, 0) / ultimas.length : null;
};

/** Evaluación de fin de trimestre: nota media de los controles, con consecuencias en ánimo y estrés. */
function evaluarTrimestre(ctx: ActionContext, curso: number, trimestre: number): void {
  const st = ctx.state<EstudiosState>();
  const controles = st.controlesTrimestre ?? [];
  const media = controles.length ? controles.reduce((a, b) => a + b, 0) / controles.length : 0;
  const boletines = [...(st.boletines ?? []), { curso, trimestre, media }].slice(-12);
  ctx.updateState<EstudiosState>((s) => ({ ...s, controlesTrimestre: [], boletines }));
  const aprobado = media >= 5;
  ctx.log(
    `Evaluación del ${trimestre}.º trimestre: nota media ${media.toFixed(1)}. ${aprobado ? 'Apruebas.' : 'Suspendes.'}`,
    aprobado ? 'logro' : 'aviso',
  );
  if (media >= 7) ctx.addStat(GEN.motivacion, 6);
  else if (!aprobado) {
    ctx.addStat(GEN.motivacion, -6);
    ctx.addStat(GEN.estres, 8);
  }
  if (trimestre === 3) {
    const delCurso = boletines.filter((b) => b.curso === curso);
    const mediaCurso = delCurso.reduce((a, b) => a + b.media, 0) / delCurso.length;
    ctx.log(
      mediaCurso >= 5 ? `Curso ${curso + 1} terminado: nota final ${mediaCurso.toFixed(1)}.` : `Curso ${curso + 1} suspendido: nota final ${mediaCurso.toFixed(1)}.`,
      mediaCurso >= 5 ? 'logro' : 'aviso',
    );
  }
}

export const estudios = defineModule<EstudiosState>({
  id: 'estudios',
  name: 'Estudios',
  description: 'El colegio: clases, estudio y controles.',
  dependsOn: ['gen'],
  stats: ASIGNATURAS.map(asignaturaStat),

  initState: () => ({
    notas: Object.fromEntries(ASIGNATURAS.map((a) => [a.key, []])),
    faltas: 0,
    ultimaAsistencia: -1,
  }),

  actions: [
    {
      id: 'estudios.clase',
      name: 'Ir a clase',
      description: 'Jornada escolar hasta las 14:00. Faltar tiene consecuencias.',
      tags: [TAGS.estudio, TAGS.mental, TAGS.social],
      group: 'Colegio',
      duration: (ctx) => minutesUntilHour(ctx.time.minute, 14),
      available: (ctx) => {
        const t = ctx.time;
        if (!t.isSchoolDay) return t.isWeekend ? 'Hoy no hay clase' : `${NOMBRE_PERIODO[t.period]}: no hay clase`;
        if (ctx.state<EstudiosState>().ultimaAsistencia === t.day) return 'Ya has ido a clase hoy';
        return inHours(t, MIN_HORA_CLASE, MAX_HORA_CLASE) ? true : 'Las clases empiezan a las 8:00';
      },
      delta: { [GEN.energia]: -15, [GEN.estres]: 3 },
      train: [
        ...ASIGNATURAS.map((a) => ({ stat: statId(a.key), amount: 0.5 })),
        { stat: GEN.concentracion, amount: 0.3 },
        { stat: GEN.atencion, amount: 0.3 },
        { stat: GEN.determinacion, amount: 0.3 },
        { stat: GEN.cooperacion, amount: 0.1 },
      ],
      run: (ctx) => ctx.updateState<EstudiosState>((s) => ({ ...s, ultimaAsistencia: ctx.time.day })),
    },
    ...ASIGNATURAS.map(estudiar),
    {
      id: 'estudios.repaso',
      name: 'Repaso general',
      tags: [TAGS.estudio, TAGS.mental],
      group: 'Estudiar',
      duration: 120,
      available: tiempoDeEstudio,
      delta: { [GEN.energia]: -14, [GEN.estres]: 8 },
      train: [
        ...ASIGNATURAS.map((a) => ({ stat: statId(a.key), amount: 1.2 })),
        { stat: GEN.determinacion, amount: 0.3 },
      ],
    },
  ],

  on: {
    [CORE_EVENTS.DAY_END]: (ctx, ev) => {
      const { day } = ev.data as DayEventData;
      // El evento llega al cerrar el día: se mira el calendario de ESE día, no el del siguiente.
      const hoy = timeView(day * MINUTES_PER_DAY);
      const weekday = hoy.weekday;
      const s = ctx.state<EstudiosState>();
      if (!hoy.isSchoolDay) return;

      if (s.ultimaAsistencia !== day) {
        ctx.updateState<EstudiosState>((st) => ({ ...st, faltas: st.faltas + 1 }));
        ctx.addStat(GEN.estres, 3);
        ctx.log('Has faltado a clase.', 'aviso');
      }

      if (weekday === 4) {
        const notas: Record<string, number[]> = {};
        const partes: string[] = [];
        for (const a of ASIGNATURAS) {
          const nota = notaControl(ctx.stat(statId(a.key)), ctx.stat(GEN.estres), ctx.rng.normal());
          notas[a.key] = [...(s.notas[a.key] ?? []), nota].slice(-NOTAS_GUARDADAS);
          partes.push(`${a.name} ${nota.toFixed(1)}`);
        }
        ctx.updateState<EstudiosState>((st) => ({ ...st, notas }));
        const semana = Object.values(notas).map((n) => n[n.length - 1]);
        const m = semana.reduce((x, y) => x + y, 0) / semana.length;
        ctx.updateState<EstudiosState>((st) => ({ ...st, controlesTrimestre: [...(st.controlesTrimestre ?? []), m] }));
        ctx.log(`Controles del viernes: ${partes.join(' · ')}`, 'resultado');
        if (m >= 7) ctx.addStat(GEN.motivacion, 3);
        else if (m < 5) {
          ctx.addStat(GEN.motivacion, -3);
          ctx.addStat(GEN.estres, 5);
        }
        if (hoy.isEvaluationWeek) evaluarTrimestre(ctx, hoy.schoolYear, hoy.term);
      }
    },
  },

  services: {
    [SERVICES.estudios]: (ctx): StudiesService => {
      const s = ctx.state<EstudiosState>();
      return { average: () => media(s), absences: () => s.faltas };
    },
  },
});

export default estudios;
