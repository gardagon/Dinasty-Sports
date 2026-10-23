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
  type SummerPath,
  type WeekEventData,
} from '@ds/contracts';
import {
  ASIGNATURAS,
  CURSO_DE_MODALIDAD,
  asignatura,
  asignaturasDelCurso,
  cursoDef,
  elegirModalidad,
  type Asignatura,
  type Modalidad,
} from './curriculo';

/**
 * MÓDULO ESTUDIOS (id `estudios`).
 * Asignaturas como habilidades, según el currículo del curso (ver `curriculo.ts`): cambian con la etapa y heredan
 * lo aprendido. Clase por la mañana, estudio por la tarde, control de las asignaturas del curso los viernes y
 * evaluación al final de cada trimestre. Las notas quedan disponibles para otros módulos a través del servicio
 * `estudios` (p. ej. una futura beca deportiva).
 */

export { ASIGNATURAS } from './curriculo';

export interface EstudiosState {
  /** Últimas notas por asignatura (más reciente al final). */
  notas: Record<string, number[]>;
  faltas: number;
  /** Media semanal de los controles del trimestre en curso (se vacía en cada evaluación). */
  controlesTrimestre?: number[];
  /** Notas medias de cada evaluación de trimestre. */
  boletines?: { curso: number; trimestre: number; media: number }[];
  /** Modalidad de bachillerato (se elige al empezarlo según las notas). */
  modalidad?: Modalidad;
  /** Último curso del que ya se han aplicado los cambios de asignaturas. */
  cursoAplicado?: number;
  /** El verano según las notas del curso. En la academia, sesiones exigidas y hechas. */
  verano?: { curso: number; tipo: SummerPath; exigidas: number; hechas: number; superada: boolean };
  /** Último día que fue a la academia (una sesión al día). */
  ultimaAcademia?: number;
  /** Último día con asistencia a clase. */
  ultimaAsistencia: number;
}

const statId = (key: string) => `estudios.${key}`;
const NOTAS_GUARDADAS = 12;
const MIN_HORA_CLASE = 7;
const MAX_HORA_CLASE = 9;
/** Todos parten de un 5 (nivel ~40 ⇒ nota ≈ 5): la inteligencia y el trabajo marcan la evolución. */
const NIVEL_INICIAL = { min: 38, max: 42 };
/** Nota media del curso por debajo de la cual toca academia obligatoria en verano, y por encima de la cual se puede pedir campamento. */
const NOTA_ACADEMIA = 5;
const NOTA_CAMPAMENTO = 7.5;
/** Sesiones de academia exigidas: 25, más 6 por cada punto de nota que falte para el 5 (máximo 45). */
const SESIONES_BASE_ACADEMIA = 25;

const asignaturaStat = (a: Asignatura): StatDef => ({
  id: statId(a.key),
  name: a.name,
  group: 'Asignaturas',
  category: 'habilidad',
  initial: NIVEL_INICIAL,
  talentSpread: 0.2,
  // El tope de una asignatura no se hereda: sale de las genéricas que la apoyan más una aptitud propia (±10 %).
  genetics: { derivedFrom: a.apoyos, aptitude: 0.1 },
  growth: {
    rate: 0.5,
    curve: 1.5,
    speedFrom: a.apoyos,
    // El techo pesa 0,45 en total, repartido igual que el ritmo.
    cap: { base: 0.55, from: a.apoyos.map((x) => ({ stat: x.stat, weight: Math.round(x.weight * 0.45 * 1000) / 1000 })) },
  },
  decay: { graceDays: 10, ratePerDay: 0.006, floorRatio: 0.75 },
});

/** Asignaturas que se cursan ahora (ids de stat). */
const activasKeys = (curso: number, modalidad?: Modalidad): string[] => asignaturasDelCurso(curso, modalidad);

const tiempoDeEstudio = (ctx: ReadContext): true | string => {
  if (isSchoolHours(ctx.time)) return 'Estás en horario de clase';
  return inHours(ctx.time, 7, 23) ? true : 'Demasiado tarde para estudiar';
};

/** ¿Se cursa esta asignatura en el curso en que está el personaje? */
const seCursa = (ctx: ReadContext, key: string): boolean =>
  activasKeys(ctx.time.schoolYear, ctx.state<EstudiosState>().modalidad).includes(key);

const estudiar = (a: Asignatura): ActionDef => ({
  id: `estudios.estudiar_${a.key}`,
  name: `Estudiar ${a.name.toLowerCase()}`,
  tags: [TAGS.estudio, TAGS.mental],
  group: 'Estudiar',
  duration: 90,
  available: (ctx) => (seCursa(ctx, a.key) ? tiempoDeEstudio(ctx) : 'No cursas esta asignatura este curso'),
  delta: { [GEN.energia]: -10, [GEN.estres]: 6 },
  train: [
    { stat: statId(a.key), amount: 3 },
    { stat: GEN.inteligencia, amount: 0.4 },
    { stat: GEN.concentracion, amount: 0.4 },
    ...(a.entrena ? [a.entrena] : []),
  ],
});

/**
 * Nota de un control: 30 → ~4.2, 50 → ~6, 70 → ~7.8, 90 → ~9.6 (± azar y estrés). Cada curso exige un poco más:
 * con el mismo nivel, la nota baja 0,15 por curso (hay que seguir estudiando para mantenerla).
 */
export function notaControl(nivel: number, estres: number, ruido: number, curso = 0): number {
  const penalizacionEstres = Math.max(0, estres - 60) / 20;
  const n = 1.5 + nivel * 0.09 + ruido * 0.6 - penalizacionEstres - 0.15 * curso;
  return Math.round(Math.min(10, Math.max(0, n)) * 10) / 10;
}

/** Media de las últimas notas de las asignaturas que se cursan ahora. */
const media = (s: EstudiosState, activas: readonly string[]): number | null => {
  const ultimas = activas.flatMap((k) => (s.notas[k] ?? []).slice(-3));
  return ultimas.length ? ultimas.reduce((a, b) => a + b, 0) / ultimas.length : null;
};

/**
 * Cambio de curso: se elige modalidad al llegar a bachillerato, las asignaturas nuevas heredan el nivel de las que
 * las sustituyen (ciencias naturales → biología, ciencias sociales → historia...) y se avisa de lo que entra y sale.
 */
function cambiarCurso(ctx: ActionContext, curso: number): void {
  const st = ctx.state<EstudiosState>();
  const anterior = st.cursoAplicado ?? 0;
  if (curso === anterior) return;
  let modalidad = st.modalidad;
  if (modalidad === undefined && curso >= CURSO_DE_MODALIDAD) {
    modalidad = elegirModalidad((k) => ctx.stat(statId(k)));
    ctx.log(`Para el bachillerato eliges ${modalidad === 'ciencias' ? 'ciencias' : 'humanidades'}, que es donde mejor te va.`, 'info');
  }
  const antes = activasKeys(anterior, modalidad);
  const ahora = activasKeys(curso, modalidad);
  const nuevas = ahora.filter((k) => !antes.includes(k));
  const salen = antes.filter((k) => !ahora.includes(k));
  for (const k of nuevas) {
    const heredada = asignatura(k).hereda;
    if (heredada) ctx.addStat(statId(k), ctx.stat(statId(heredada)) - ctx.stat(statId(k)));
  }
  // Si se acaba el verano sin haber terminado la academia, no se repite curso pero se empieza flojo y con mala moral.
  if (academiaPendiente(st)) {
    ctx.log('No has terminado la academia: empiezas el curso con las asignaturas flojas.', 'aviso');
    ctx.addStat(GEN.motivacion, -8);
    ctx.addStat(GEN.estres, 10);
  }
  ctx.updateState<EstudiosState>((s) => ({ ...s, modalidad, cursoAplicado: curso, verano: undefined }));
  const nombres = (keys: string[]) => keys.map((k) => asignatura(k).name).join(', ');
  ctx.log(
    `Empiezas ${cursoDef(curso).nombre}.${nuevas.length ? ` Asignaturas nuevas: ${nombres(nuevas)}.` : ''}${salen.length ? ` Dejas: ${nombres(salen)}.` : ''}`,
    'info',
  );
}

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
    elegirVerano(ctx, curso, mediaCurso);
  }
}

/**
 * El verano depende de las notas: no se repite curso, el castigo de las notas malas es la academia obligatoria
 * para sacar los aprobados; con buenas notas se puede pedir un campamento del deporte; con notas aceptables, amigos.
 */
function elegirVerano(ctx: ActionContext, curso: number, media: number): void {
  let tipo: SummerPath;
  let exigidas = 0;
  if (media < NOTA_ACADEMIA) {
    tipo = 'academia';
    exigidas = Math.min(45, Math.round(SESIONES_BASE_ACADEMIA + (NOTA_ACADEMIA - media) * 6));
    ctx.log(`Notas flojas: este verano toca academia obligatoria (${exigidas} sesiones) para sacar los aprobados.`, 'aviso');
  } else if (media >= NOTA_CAMPAMENTO) {
    tipo = 'campamento';
    ctx.log('Buenas notas: este verano puedes pedir a tus padres ir a un campamento de tu deporte.', 'logro');
  } else {
    tipo = 'amigos';
    ctx.log('Notas aceptables: este verano podrás jugar y practicar con tus amigos.');
  }
  ctx.updateState<EstudiosState>((s) => ({ ...s, verano: { curso, tipo, exigidas, hechas: 0, superada: false } }));
}

/** ¿Está el personaje en verano con academia pendiente? */
const academiaPendiente = (s: EstudiosState): boolean => s.verano?.tipo === 'academia' && !s.verano.superada;

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
        { stat: GEN.concentracion, amount: 0.3 },
        { stat: GEN.atencion, amount: 0.3 },
        { stat: GEN.determinacion, amount: 0.3 },
        { stat: GEN.cooperacion, amount: 0.1 },
      ],
      run: (ctx) => {
        ctx.updateState<EstudiosState>((s) => ({ ...s, ultimaAsistencia: ctx.time.day }));
        // En clase se avanza un poco en cada asignatura del curso.
        for (const k of activasKeys(ctx.time.schoolYear, ctx.state<EstudiosState>().modalidad)) ctx.train(statId(k), 0.5);
      },
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
      train: [{ stat: GEN.determinacion, amount: 0.3 }],
      run: (ctx) => {
        for (const k of activasKeys(ctx.time.schoolYear, ctx.state<EstudiosState>().modalidad)) ctx.train(statId(k), 1.2);
      },
    },
    {
      id: 'estudios.academia',
      name: 'Ir a la academia',
      description: 'Academia de verano obligatoria para sacar los aprobados: refuerza las asignaturas más flojas. Faltar tiene consecuencias.',
      tags: [TAGS.estudio, TAGS.mental],
      group: 'Verano',
      duration: 180,
      available: (ctx) => {
        const s = ctx.state<EstudiosState>();
        const t = ctx.time;
        if (!s.verano || s.verano.tipo !== 'academia') return 'No tienes academia este verano';
        if (s.verano.superada) return 'Ya has sacado los aprobados';
        if (t.period !== 'verano' || t.isWeekend) return 'La academia es en verano, de lunes a viernes';
        if (s.ultimaAcademia === t.day) return 'Ya has ido a la academia hoy';
        return inHours(t, 10, 13) ? true : 'La academia es de 10 a 13';
      },
      delta: { [GEN.energia]: -15, [GEN.estres]: 5 },
      run: (ctx) => {
        const s = ctx.state<EstudiosState>();
        // Se refuerzan las tres asignaturas más flojas del curso.
        const flojas = activasKeys(ctx.time.schoolYear, s.modalidad)
          .map((k) => [k, ctx.stat(statId(k))] as const)
          .sort((a, b) => a[1] - b[1])
          .slice(0, 3);
        for (const [k] of flojas) ctx.train(statId(k), 2.5);
        const verano = { ...s.verano!, hechas: s.verano!.hechas + 1 };
        verano.superada = verano.hechas >= verano.exigidas;
        ctx.updateState<EstudiosState>((st) => ({ ...st, verano, ultimaAcademia: ctx.time.day }));
        if (verano.superada) {
          ctx.log('Has sacado los aprobados en la academia. ¡Se acabó, a disfrutar del verano!', 'logro');
          ctx.addStat(GEN.motivacion, 6);
        }
      },
    },
  ],

  on: {
    [CORE_EVENTS.WEEK_END]: (ctx, ev) => {
      const { week } = ev.data as WeekEventData;
      // Si la semana que viene empieza un curso nuevo, cambian las asignaturas.
      const proximo = timeView((week + 1) * 7 * MINUTES_PER_DAY);
      if (proximo.schoolWeek === 0) cambiarCurso(ctx, proximo.schoolYear);
    },

    [CORE_EVENTS.DAY_END]: (ctx, ev) => {
      const { day } = ev.data as DayEventData;
      // El evento llega al cerrar el día: se mira el calendario de ESE día, no el del siguiente.
      const hoy = timeView(day * MINUTES_PER_DAY);
      const weekday = hoy.weekday;
      const s = ctx.state<EstudiosState>();
      // Academia obligatoria: faltar un día de academia cuenta como falta y sube el estrés.
      if (academiaPendiente(s) && hoy.period === 'verano' && !hoy.isWeekend && s.ultimaAcademia !== day) {
        ctx.updateState<EstudiosState>((st) => ({ ...st, faltas: st.faltas + 1 }));
        ctx.addStat(GEN.estres, 3);
        ctx.log('Has faltado a la academia.', 'aviso');
      }
      if (!hoy.isSchoolDay) return;

      if (s.ultimaAsistencia !== day) {
        ctx.updateState<EstudiosState>((st) => ({ ...st, faltas: st.faltas + 1 }));
        ctx.addStat(GEN.estres, 3);
        ctx.log('Has faltado a clase.', 'aviso');
      }

      if (weekday === 4) {
        const activas = activasKeys(hoy.schoolYear, s.modalidad);
        const notas: Record<string, number[]> = { ...s.notas };
        const filas: string[][] = [];
        for (const k of activas) {
          const nota = notaControl(ctx.stat(statId(k)), ctx.stat(GEN.estres), ctx.rng.normal(), hoy.schoolYear);
          notas[k] = [...(s.notas[k] ?? []), nota].slice(-NOTAS_GUARDADAS);
          filas.push([asignatura(k).name, nota.toFixed(1)]);
        }
        ctx.updateState<EstudiosState>((st) => ({ ...st, notas }));
        const m = activas.reduce((x, k) => x + notas[k][notas[k].length - 1], 0) / activas.length;
        ctx.updateState<EstudiosState>((st) => ({ ...st, controlesTrimestre: [...(st.controlesTrimestre ?? []), m] }));
        ctx.log(`Controles del viernes: nota media ${m.toFixed(1)}.`, 'resultado', { header: ['Asignatura', 'Nota'], rows: filas, align: ['left', 'right'] });
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
      const activas = activasKeys(ctx.time.schoolYear, s.modalidad);
      return {
        average: () => media(s, activas),
        absences: () => s.faltas,
        activeSubjects: () => activas.map(statId),
        courseName: () => cursoDef(ctx.time.schoolYear).nombre,
        summerPath: () => (ctx.time.period === 'verano' ? (s.verano?.tipo ?? null) : null),
      };
    },
  },
});

export default estudios;
