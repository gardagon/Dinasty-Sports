import {
  CORE_EVENTS,
  GEN,
  SERVICES,
  TAGS,
  defineModule,
  conLugar,
  inHours,
  ligarALugares,
  isSchoolHours,
  nivelTipicoPorEdad,
  MINUTES_PER_DAY,
  NOMBRE_PERIODO,
  minutesUntilHour,
  timeView,
  type ActionContext,
  type ActionDef,
  type DayEventData,
  type IdentityService,
  type ExamInfo,
  type NivelDeAsignatura,
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
  diaDeExamen,
  type TipoDeExamen,
  elegirModalidad,
  horarioDeClases,
  horarioSemanal,
  pesoDeClase,
  CLASES_POR_DIA,
  type Asignatura,
  type Modalidad,
} from './curriculo';

/**
 * MÓDULO ESTUDIOS (id `estudios`).
 * Cada asignatura es una PREPARACIÓN de 0 a 100 (= la nota que se espera sacar × 10), que el jugador ve como un nivel con
 * texto (Mal, Regular, Bien, Muy bien, Excelente). Sube yendo a clase (solo las asignaturas que se dan ese día, según el
 * horario semanal) y estudiando, más rápido cuantas mejores capacidades de apoyo se tienen; y cae un poco cada día
 * (más rápido con peores capacidades), de modo que hay que estudiar para mantenerla. No hay controles semanales: cada
 * trimestre hay una semana de exámenes, con aviso una semana antes, y su nota sale de la preparación del día del examen.
 * Faltar ese día es un 0. Las notas quedan disponibles para otros módulos a través del servicio `estudios`.
 */

export { ASIGNATURAS } from './curriculo';

export interface EstudiosState {
  /** Últimas notas por asignatura (más reciente al final). */
  notas: Record<string, number[]>;
  faltas: number;
  /** Notas de los exámenes del trimestre en curso, con clave `asignatura:parcial1|parcial2|global` (se vacía en cada evaluación). */
  examenes?: Record<string, number>;
  /** Notas medias de cada evaluación de trimestre. */
  boletines?: { curso: number; trimestre: number; media: number }[];
  /** Modalidad de bachillerato (se elige al empezarlo según las notas). */
  modalidad?: Modalidad;
  /** Lo aprendido de base en cada asignatura: el olvido diario no baja de aquí. Sale de la aptitud del alumno (su preparación inicial menos un margen). */
  base?: Record<string, number>;
  /** Último curso del que ya se han aplicado los cambios de asignaturas. */
  cursoAplicado?: number;
  /** El verano según las notas del curso. En la academia, sesiones exigidas y hechas. */
  verano?: { curso: number; tipo: SummerPath; exigidas: number; hechas: number; superada: boolean };
  /** Último día que fue a la academia (una sesión al día). */
  ultimaAcademia?: number;
  /** Clases a las que ha ido hoy (0 = primera hora): faltar a una no tiene castigo, solo no sube lo que tocaba, pero se cuenta. */
  asistencia: { day: number; clases: number[] };
}

const statId = (key: string) => `estudios.${key}`;
const NOTAS_GUARDADAS = 12;
const MIN_HORA_CLASE = 7;
const MAX_HORA_CLASE = 9;
/** Todos parten de un Regular (~50), de 40 a 78 según las capacidades que apoyan la asignatura. */
const PREPARACION_INICIAL = { min: 30, max: 92 };
/** Puntos de preparación que se pierden al día por olvido, antes del ajuste por capacidades (0,6× con muy buenas, 1,5× con muy malas). */
const CAIDA_DIARIA = 0.8;
/** Puntos que pierde la preparación al empezar un curso: los contenidos son más difíciles. */
const SALTO_DE_CURSO = 3;
/** Cuánto por debajo de la preparación inicial queda lo aprendido de base: un alumno brillante lo es siempre aunque no estudie. */
const MARGEN_DE_BASE = 22;
/** Techo de una asignatura = 100 × (TECHO_BASE + media ponderada de las capacidades de apoyo): con ellas a 40 es 80, a 50 es 90 y a 60 llega a 100. */
const TECHO_BASE = 0.5;
const CURVA = 0.6;
/** Las capacidades de los niños son parecidas (40–60): se multiplica su peso en la velocidad para que se note. */
const VELOCIDAD_POR_CAPACIDADES = 2;
const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes'];
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
  initial: PREPARACION_INICIAL,
  initialFrom: a.apoyos,
  talentSpread: 0.2,
  // Sin tope genético: la dificultad la ponen las capacidades que apoyan la asignatura (techo, ritmo de subida y olvido).
  growth: {
    rate: 1,
    curve: CURVA,
    speedFrom: a.apoyos.map((x) => ({ stat: x.stat, weight: x.weight * VELOCIDAD_POR_CAPACIDADES })),
    cap: { base: TECHO_BASE, from: a.apoyos },
  },
});

/** Aptitud del alumno en una asignatura (0–100): su preparación de partida, que es permanente. */
const aptitudDe = (ctx: ReadContext, k: string): number => {
  const base = ctx.state<EstudiosState>().base?.[k];
  return base === undefined ? ctx.stat(statId(k)) : base + MARGEN_DE_BASE;
};

/** Cuánto rinde el estudio según la aptitud: de ×0,85 con aptitud baja a ×1,5 con la más alta (la típica, 60, es ×1). */
const factorDeAptitud = (ctx: ReadContext, k: string): number => Math.min(1.5, Math.max(0.85, aptitudDe(ctx, k) / 60));

/** Olvido diario de una asignatura: no baja de lo aprendido de base. */
function olvidar(ctx: ActionContext, k: string): void {
  const base = ctx.state<EstudiosState>().base?.[k] ?? 0;
  const perdida = Math.min(Math.max(0, ctx.stat(statId(k)) - base), caidaDeHoy(aptitudDe(ctx, k)));
  if (perdida > 0) ctx.addStat(statId(k), -perdida);
}

/**
 * Habilidad en una asignatura práctica (0–100): las capacidades que la apoyan frente a lo típico de la edad.
 * Con el nivel típico de su edad vale 55 (un Regular alto); entrenando mucho esas capacidades sube hasta 100.
 */
function habilidadDe(ctx: ReadContext, a: Asignatura): number {
  const media = a.apoyos.reduce((x, y) => x + y.weight * ctx.stat(y.stat), 0) / a.apoyos.reduce((x, y) => x + y.weight, 0);
  const edad = ctx.service<IdentityService>(SERVICES.identidad)?.view().age ?? 8;
  // Con lo típico de su edad vale 55; cada 10 % por encima o por debajo suma o resta 11 puntos (mínimo 30: participar siempre da algo).
  return Math.min(100, Math.max(30, 55 + 110 * (media / nivelTipicoPorEdad(edad) - 1)));
}

/** Preparación que se enseña: la efectiva, sin bajar de la nota mínima de la asignatura (Educación física: 5). */
const nivelVisible = (ctx: ReadContext, k: string): number => Math.max((asignatura(k).notaMinima ?? 0) * 10, preparacionEfectiva(ctx, k));

/** Preparación con la que se llega a un examen: en las asignaturas prácticas pesan las habilidades además del estudio. */
function preparacionEfectiva(ctx: ReadContext, k: string): number {
  const a = asignatura(k);
  const estudio = ctx.stat(statId(k));
  return a.practica ? (1 - a.practica) * estudio + a.practica * habilidadDe(ctx, a) : estudio;
}

/** Texto del nivel: la preparación es la nota que se espera sacar (× 10). */
export function nivelDeAsignatura(preparacion: number): NivelDeAsignatura {
  if (preparacion < 40) return 'Mal';
  if (preparacion < 60) return 'Regular';
  if (preparacion < 75) return 'Bien';
  if (preparacion < 93) return 'Muy bien';
  return 'Excelente';
}

/** Cuánto se olvida al día de una asignatura: menos cuanto mayor es la aptitud del alumno (×0,6 con la más alta, ×1,4 con la más baja; la típica, 60, es ×1). */
const caidaDeHoy = (aptitud: number): number => CAIDA_DIARIA * Math.min(1.4, Math.max(0.6, 1.6 - aptitud / 100));

/** Asignaturas que se dan un día de la semana (0 = lunes ... 4 = viernes) del curso. */
const asignaturasDeHoy = (curso: number, modalidad: Modalidad | undefined, weekday: number): string[] =>
  [...(horarioDeClases(activasKeys(curso, modalidad))[weekday] ?? [])];

/** Días de la semana en que se da una asignatura del curso (los exámenes caen en uno de ellos). */
const diasDe = (curso: number, modalidad: Modalidad | undefined, key: string): number[] => horarioSemanal(activasKeys(curso, modalidad))[key] ?? [];

/** Clases a las que se ha ido hoy. */
const clasesDeHoy = (ctx: ReadContext): number[] => {
  const a = ctx.state<EstudiosState>().asistencia;
  return a.day === ctx.time.day ? a.clases : [];
};

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
    { stat: GEN.inteligencia, amount: 0.4 },
    { stat: GEN.concentracion, amount: 0.4 },
    ...(a.entrena ? [a.entrena] : []),
  ],
  run: (ctx) => ctx.train(statId(a.key), 1.2 * factorDeAptitud(ctx, a.key)),
});

/**
 * Nota de un examen: la preparación /10, con azar (más cuanto peor concentrado) y una penalización si se llega muy estresado.
 */
export function notaExamen(preparacion: number, estres: number, concentracion: number, ruido: number): number {
  const penalizacionEstres = Math.max(0, estres - 60) / 20;
  const desviacion = 0.5 + Math.max(0, 60 - concentracion) / 100;
  const n = preparacion / 10 + ruido * desviacion - penalizacionEstres;
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
    if (heredada) {
      ctx.addStat(statId(k), ctx.stat(statId(heredada)) - ctx.stat(statId(k)));
      // Lo aprendido de base se hereda con el nivel.
      ctx.updateState<EstudiosState>((x) => ({ ...x, base: { ...x.base, [k]: x.base?.[heredada] ?? x.base?.[k] ?? 0 } }));
    }
  }
  // Si se acaba el verano sin haber terminado la academia, no se repite curso pero se empieza flojo y con mala moral.
  if (academiaPendiente(st)) {
    ctx.log('No has terminado la academia: empiezas el curso con las asignaturas flojas.', 'aviso');
    ctx.addStat(GEN.motivacion, -8);
    ctx.addStat(GEN.estres, 10);
  }
  // Cada curso exige más: lo aprendido pierde un poco de peso frente a los contenidos nuevos.
  for (const k of ahora) ctx.addStat(statId(k), -SALTO_DE_CURSO);
  ctx.updateState<EstudiosState>((s) => ({ ...s, modalidad, cursoAplicado: curso, verano: undefined }));
  const nombres = (keys: string[]) => keys.map((k) => asignatura(k).name).join(', ');
  ctx.log(
    `Empiezas ${cursoDef(curso).nombre}.${nuevas.length ? ` Asignaturas nuevas: ${nombres(nuevas)}.` : ''}${salen.length ? ` Dejas: ${nombres(salen)}.` : ''}`,
    'info',
  );
}

/** Peso de los parciales (su media) y del global en la nota final de cada asignatura. */
const PESO_PARCIALES = 0.4;
const PESO_GLOBAL = 0.6;

/** Nota final de una asignatura en el trimestre: 40 % la media de los dos parciales y 60 % el global (lo no hecho cuenta 0). */
export const notaFinal = (parcial1: number | undefined, parcial2: number | undefined, global: number | undefined): number =>
  Math.round((PESO_PARCIALES * (((parcial1 ?? 0) + (parcial2 ?? 0)) / 2) + PESO_GLOBAL * (global ?? 0)) * 10) / 10;

/** Evaluación de fin de trimestre: nota final de cada asignatura (parciales + global) y media, con consecuencias en ánimo y estrés. */
function evaluarTrimestre(ctx: ActionContext, curso: number, trimestre: number): void {
  const st = ctx.state<EstudiosState>();
  const ex = st.examenes ?? {};
  const activas = activasKeys(curso, st.modalidad);
  const finales = activas.map((k) => notaFinal(ex[`${k}:parcial1`], ex[`${k}:parcial2`], ex[`${k}:global`]));
  const media = finales.length ? finales.reduce((a, b) => a + b, 0) / finales.length : 0;
  const boletines = [...(st.boletines ?? []), { curso, trimestre, media }].slice(-12);
  ctx.updateState<EstudiosState>((x) => {
    const notas = { ...x.notas };
    activas.forEach((k, n) => (notas[k] = [...(x.notas[k] ?? []), finales[n]].slice(-NOTAS_GUARDADAS)));
    return { ...x, notas, examenes: {}, boletines };
  });
  const fmt = (n: number | undefined) => (n === undefined ? '—' : n.toFixed(1));
  ctx.log(`Notas del ${trimestre}.º trimestre.`, 'resultado', {
    header: ['Asignatura', 'Parcial 1', 'Parcial 2', 'Global', 'Final'],
    rows: activas.map((k, n) => [asignatura(k).name, fmt(ex[`${k}:parcial1`]), fmt(ex[`${k}:parcial2`]), fmt(ex[`${k}:global`]), finales[n].toFixed(1)]),
    align: ['left', 'right', 'right', 'right', 'right'],
  });
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

/** Qué examen toca en una semana: el parcial 1 o 2 de su trimestre, el global de la evaluación o ninguno. */
const tipoDeSemana = (t: { isEvaluationWeek: boolean; parcial: 0 | 1 | 2 }): TipoDeExamen | null =>
  t.isEvaluationWeek ? 'global' : t.parcial === 1 ? 'parcial1' : t.parcial === 2 ? 'parcial2' : null;

const NOMBRE_DE_EXAMEN: Record<TipoDeExamen, string> = { parcial1: 'Parcial 1', parcial2: 'Parcial 2', global: 'Global' };

/** Exámenes de hoy: la nota sale de la preparación de ahora; quien falta a clase se queda con un 0. */
function examinar(ctx: ActionContext, keys: string[], tipo: TipoDeExamen, estuvo: (key: string) => boolean): void {
  const filas: string[][] = [];
  const nuevas: Record<string, number> = {};
  for (const k of keys) {
    const presente = estuvo(k);
    const bruta = presente ? notaExamen(preparacionEfectiva(ctx, k), ctx.stat(GEN.estres), ctx.stat(GEN.concentracion), ctx.rng.normal()) : 0;
    // En las asignaturas con nota mínima (Educación física) no se suspende, pero quien no se presenta sigue con un 0.
    const nota = presente ? Math.max(asignatura(k).notaMinima ?? 0, bruta) : 0;
    nuevas[`${k}:${tipo}`] = nota;
    filas.push([asignatura(k).name, presente ? nota.toFixed(1) : 'No presentado']);
  }
  ctx.updateState<EstudiosState>((st) => ({ ...st, examenes: { ...st.examenes, ...nuevas } }));
  const m = Object.values(nuevas).reduce((x, n) => x + n, 0) / keys.length;
  ctx.log(`${NOMBRE_DE_EXAMEN[tipo]}: nota media ${m.toFixed(1)}.`, 'resultado', { header: ['Asignatura', 'Nota'], rows: filas, align: ['left', 'right'] });
  if (m >= 7) ctx.addStat(GEN.motivacion, 3);
  else if (m < 5) {
    ctx.addStat(GEN.motivacion, -3);
    ctx.addStat(GEN.estres, 5);
  }
}

/** Calendario de exámenes de la semana absoluta `semana`: asignatura y día. */
function calendarioDeExamenes(semana: number, modalidad: Modalidad | undefined): { key: string; weekday: number; tipo: TipoDeExamen }[] {
  const t = timeView(semana * 7 * MINUTES_PER_DAY);
  const tipo = tipoDeSemana(t);
  if (!tipo) return [];
  return activasKeys(t.schoolYear, modalidad)
    .map((key) => ({ key, tipo, weekday: diaDeExamen(t.schoolYear, t.term, key, tipo, diasDe(t.schoolYear, modalidad, key)) }))
    .sort((a, b) => a.weekday - b.weekday);
}

/** ¿Está el personaje en verano con academia pendiente? */
const academiaPendiente = (s: EstudiosState): boolean => s.verano?.tipo === 'academia' && !s.verano.superada;

/**
 * La jornada: 4 clases de 80 minutos y un recreo de 40 entre la segunda y la tercera, de 8:00 a 14:00 (minutos del día).
 * Se puede ir a una clase desde una hora antes de que empiece (esperando en el colegio) hasta 15 minutos tarde; la acción dura
 * hasta que acaba la clase. Faltar a una no tiene castigo (solo no sube lo que tocaba), pero se cuenta en `faltas`.
 */
const JORNADA = { clases: [[480, 560], [560, 640], [680, 760], [760, 840]], recreo: [640, 680] } as const;
const ANTES_DE_CLASE = 60;
const TARDE_A_CLASE = 15;
/** Estrés que cuesta un día de clase entero (y lo mismo, faltar a todo el día). */
const ESTRES_POR_DIA_DE_CLASE = 3;
const ORDINAL = ['1.ª', '2.ª', '3.ª', '4.ª'];
const hora = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;

/** Una clase concreta (hora del día y asignatura). Se crean una vez y se reutilizan: el motor las compila una sola vez. */
const CLASES_CACHE = new Map<string, ActionDef>();
const accionDeClase = (hora_: number, key: string): ActionDef => {
  const id = `estudios.clase_${hora_ + 1}:${key}`;
  let def = CLASES_CACHE.get(id);
  if (!def) {
    const [inicio, fin] = JORNADA.clases[hora_];
    def = conLugar(['colegio'], {
      id: `estudios.clase_${hora_ + 1}`,
      name: `Clase de ${asignatura(key).name.toLowerCase()} (${ORDINAL[hora_]} hora)`,
      description: `De ${hora(inicio)} a ${hora(fin)}. Faltar no tiene castigo, pero no avanzas en la asignatura y cuenta como falta.`,
      tags: [TAGS.estudio, TAGS.mental, TAGS.social],
      group: 'Colegio',
      duration: (ctx: ReadContext) => Math.max(1, fin - ctx.time.minuteOfDay),
      available: (ctx: ReadContext) => {
        const m = ctx.time.minuteOfDay;
        if (clasesDeHoy(ctx).includes(hora_)) return 'Ya has ido a esta clase';
        if (m < inicio - ANTES_DE_CLASE) return `Esta clase empieza a las ${hora(inicio)}`;
        return m > inicio + TARDE_A_CLASE ? 'Esta clase ya ha empezado' : true;
      },
      delta: { [GEN.energia]: -15 / CLASES_POR_DIA, [GEN.estres]: ESTRES_POR_DIA_DE_CLASE / CLASES_POR_DIA },
      train: [
        { stat: GEN.concentracion, amount: 0.3 / CLASES_POR_DIA },
        { stat: GEN.atencion, amount: 0.3 / CLASES_POR_DIA },
        { stat: GEN.determinacion, amount: 0.3 / CLASES_POR_DIA },
        { stat: GEN.cooperacion, amount: 0.1 / CLASES_POR_DIA },
      ],
      run: (ctx: ActionContext) => {
        ctx.updateState<EstudiosState>((st) => ({ ...st, asistencia: { day: ctx.time.day, clases: [...clasesDeHoy(ctx), hora_] } }));
        // Cada clase vale lo que valían las horas del currículo de la asignatura repartidas en los huecos del horario.
        const activas = activasKeys(ctx.time.schoolYear, ctx.state<EstudiosState>().modalidad);
        ctx.train(statId(key), 1.35 * factorDeAptitud(ctx, key) * pesoDeClase(activas, key));
      },
    });
    CLASES_CACHE.set(id, def);
  }
  return def;
};

/** Los días sin clase se ve «Ir a clase» no disponible, con el motivo (fin de semana, Navidad, verano...). */
const SIN_CLASE: ActionDef = {
  id: 'estudios.sin_clase',
  name: 'Ir a clase',
  tags: [TAGS.estudio, TAGS.mental, TAGS.social],
  group: 'Colegio',
  duration: 1,
  available: (ctx) => (ctx.time.isWeekend ? 'Hoy no hay clase' : `${NOMBRE_PERIODO[ctx.time.period]}: no hay clase`),
};

/** Las clases de hoy según el horario del curso. */
function clasesDeHoyAcciones(ctx: ReadContext): ActionDef[] {
  const t = ctx.time;
  if (!t.isSchoolDay) return [SIN_CLASE];
  return asignaturasDeHoy(t.schoolYear, ctx.state<EstudiosState>().modalidad, t.weekday).map((k, h) => accionDeClase(h, k));
}

const RECREO: ActionDef = {
  id: 'estudios.recreo',
  name: 'Recreo',
  description: `De ${hora(JORNADA.recreo[0])} a ${hora(JORNADA.recreo[1])}: patio con los compañeros.`,
  tags: [TAGS.social, TAGS.ocio],
  group: 'Colegio',
  duration: (ctx) => Math.max(1, JORNADA.recreo[1] - ctx.time.minuteOfDay),
  available: (ctx) => {
    const t = ctx.time;
    if (!t.isSchoolDay) return 'No hay clase';
    return t.minuteOfDay >= JORNADA.recreo[0] && t.minuteOfDay < JORNADA.recreo[1] ? true : `El recreo es de ${hora(JORNADA.recreo[0])} a ${hora(JORNADA.recreo[1])}`;
  },
  delta: { [GEN.estres]: -2 },
  train: [
    { stat: GEN.carisma, amount: 0.2 },
    { stat: GEN.cooperacion, amount: 0.1 },
  ],
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
    asistencia: { day: -1, clases: [] },
  }),

  dynamicActions: (ctx) => clasesDeHoyAcciones(ctx),

  actions: ligarALugares([
    RECREO,
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
        for (const k of activasKeys(ctx.time.schoolYear, ctx.state<EstudiosState>().modalidad)) ctx.train(statId(k), 0.9 * factorDeAptitud(ctx, k));
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
        for (const [k] of flojas) ctx.train(statId(k), 9 * factorDeAptitud(ctx, k));
        const verano = { ...s.verano!, hechas: s.verano!.hechas + 1 };
        verano.superada = verano.hechas >= verano.exigidas;
        ctx.updateState<EstudiosState>((st) => ({ ...st, verano, ultimaAcademia: ctx.time.day }));
        if (verano.superada) {
          ctx.log('Has sacado los aprobados en la academia. ¡Se acabó, a disfrutar del verano!', 'logro');
          ctx.addStat(GEN.motivacion, 6);
        }
      },
    },
  ], {
    'estudios.recreo': ['colegio'],
    'estudios.repaso': ['casa', 'colegio'],
    'estudios.academia': ['colegio'],
    ...Object.fromEntries(ASIGNATURAS.map((a) => [`estudios.estudiar_${a.key}`, ['casa', 'colegio']])),
  }),

  on: {
    [CORE_EVENTS.WEEK_END]: (ctx, ev) => {
      const { week } = ev.data as WeekEventData;
      // Si la semana que viene empieza un curso nuevo, cambian las asignaturas.
      const proximo = timeView((week + 1) * 7 * MINUTES_PER_DAY);
      if (proximo.schoolWeek === 0) cambiarCurso(ctx, proximo.schoolYear);
      // Los exámenes se avisan con una semana de antelación: cuando la semana que empieza es la anterior a la de evaluación.
      const examenes = calendarioDeExamenes(week + 2, ctx.state<EstudiosState>().modalidad);
      if (examenes.length) {
        const filas = examenes.map((e) => [DIAS[e.weekday], asignatura(e.key).name]);
        ctx.log(`La semana que viene: ${NOMBRE_DE_EXAMEN[examenes[0].tipo].toLowerCase()} del trimestre.`, 'aviso', { header: ['Día', 'Examen'], rows: filas, align: ['left', 'left'] });
      }
    },

    [CORE_EVENTS.DAY_END]: (ctx, ev) => {
      const { day } = ev.data as DayEventData;
      // La primera vez se fija lo aprendido de base de cada asignatura a partir de la aptitud de arranque.
      if (!ctx.state<EstudiosState>().base) {
        ctx.updateState<EstudiosState>((x) => ({ ...x, base: Object.fromEntries(ASIGNATURAS.map((a) => [a.key, Math.max(0, ctx.stat(statId(a.key)) - MARGEN_DE_BASE)])) }));
      }
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
      if (!hoy.isSchoolDay) {
        // Fuera del horario escolar (fines de semana y vacaciones) también se olvida.
        for (const k of activasKeys(hoy.schoolYear, s.modalidad)) olvidar(ctx, k);
        return;
      }

      const fue = s.asistencia.day === day ? s.asistencia.clases : [];
      const faltadas = CLASES_POR_DIA - fue.length;
      if (faltadas > 0) {
        ctx.updateState<EstudiosState>((st) => ({ ...st, faltas: st.faltas + faltadas }));
        // Faltar sube el estrés lo mismo que ir a clase (3 al día repartido en las clases). Habrá más consecuencias.
        ctx.addStat(GEN.estres, (ESTRES_POR_DIA_DE_CLASE / CLASES_POR_DIA) * faltadas);
        ctx.log(faltadas === CLASES_POR_DIA ? 'Has faltado a clase todo el día.' : `Has faltado a ${faltadas} ${faltadas === 1 ? 'clase' : 'clases'}.`, 'aviso');
      }

      const activas = activasKeys(hoy.schoolYear, s.modalidad);
      const tipo = tipoDeSemana(hoy);
      if (tipo) {
        const hechos = s.examenes ?? {};
        const hoyToca = activas.filter((k) => diaDeExamen(hoy.schoolYear, hoy.term, k, tipo, diasDe(hoy.schoolYear, s.modalidad, k)) === weekday && hechos[`${k}:${tipo}`] === undefined);
        // Se examina quien fue a la clase de esa asignatura de hoy.
        const dia = asignaturasDeHoy(hoy.schoolYear, s.modalidad, weekday);
        if (hoyToca.length) examinar(ctx, hoyToca, tipo, (k) => fue.includes(dia.indexOf(k)));
        if (weekday === 4 && tipo === 'global') evaluarTrimestre(ctx, hoy.schoolYear, hoy.term);
      }
      // Olvido diario: cada asignatura pierde un poco, más si las capacidades que la apoyan son flojas.
      for (const k of activas) olvidar(ctx, k);
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
        levelText: (subject) => (ASIGNATURAS.some((a) => statId(a.key) === subject) ? nivelDeAsignatura(nivelVisible(ctx, subject.replace('estudios.', ''))) : null),
        timetable: (weekday) => asignaturasDeHoy(ctx.time.schoolYear, s.modalidad, weekday).map(statId),
        upcomingExams: (days): ExamInfo[] => {
          const salida: ExamInfo[] = [];
          for (let d = 0; d < Math.min(days, 14); d++) {
            const t = timeView((ctx.time.day + d) * MINUTES_PER_DAY);
            // Solo se conocen los de la semana en curso y la siguiente a la que se avisó.
            if (!t.isSchoolDay || t.week - ctx.time.week > 1) continue;
            for (const e of calendarioDeExamenes(t.week, s.modalidad)) {
              if (e.weekday !== t.weekday || (d === 0 && s.examenes?.[`${e.key}:${e.tipo}`] !== undefined)) continue;
              salida.push({ subject: statId(e.key), name: asignatura(e.key).name, tipo: e.tipo, day: t.day, inDays: d });
            }
          }
          return salida;
        },
      };
    },
  },
});

export default estudios;
