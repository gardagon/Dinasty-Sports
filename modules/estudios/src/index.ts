import {
  CORE_EVENTS,
  GEN,
  SERVICES,
  TAGS,
  defineModule,
  inHours,
  isSchoolHours,
  minutesUntilHour,
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
}

export const ASIGNATURAS: readonly Asignatura[] = [
  { key: 'matematicas', name: 'Matemáticas' },
  { key: 'lengua', name: 'Lengua' },
  { key: 'ciencias', name: 'Ciencias' },
];

export interface EstudiosState {
  /** Últimas notas por asignatura (más reciente al final). */
  notas: Record<string, number[]>;
  faltas: number;
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
    speedFrom: [
      { stat: GEN.concentracion, weight: 0.6 },
      { stat: GEN.memoria, weight: 0.4 },
    ],
    cap: {
      base: 0.55,
      from: [
        { stat: GEN.concentracion, weight: 0.25 },
        { stat: GEN.memoria, weight: 0.2 },
      ],
    },
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
    { stat: GEN.memoria, amount: 0.4 },
    { stat: GEN.concentracion, amount: 0.4 },
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
        if (t.isWeekend) return 'Hoy no hay clase';
        if (ctx.state<EstudiosState>().ultimaAsistencia === t.day) return 'Ya has ido a clase hoy';
        return inHours(t, MIN_HORA_CLASE, MAX_HORA_CLASE) ? true : 'Las clases empiezan a las 8:00';
      },
      delta: { [GEN.energia]: -15, [GEN.estres]: 3 },
      train: [
        ...ASIGNATURAS.map((a) => ({ stat: statId(a.key), amount: 0.5 })),
        { stat: GEN.concentracion, amount: 0.3 },
        { stat: GEN.disciplina, amount: 0.3 },
        { stat: GEN.trabajoEquipo, amount: 0.1 },
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
        { stat: GEN.disciplina, amount: 0.3 },
      ],
    },
  ],

  on: {
    [CORE_EVENTS.DAY_END]: (ctx, ev) => {
      const { day } = ev.data as DayEventData;
      const weekday = day % 7;
      const s = ctx.state<EstudiosState>();
      if (weekday >= 5) return;

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
        ctx.log(`Controles del viernes: ${partes.join(' · ')}`, 'resultado');
        if (m >= 7) ctx.addStat(GEN.motivacion, 3);
        else if (m < 5) {
          ctx.addStat(GEN.motivacion, -3);
          ctx.addStat(GEN.estres, 5);
        }
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
