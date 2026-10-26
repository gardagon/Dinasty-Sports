import { CALENDARIO_ESPANA, tramoDeSemana, type CalendarioPais, type Periodo, type Trimestre } from './calendar';

/** El tiempo es tiempo de juego, medido en minutos desde el inicio de la partida. */
export const MINUTES_PER_HOUR = 60;
export const MINUTES_PER_DAY = 1440;
export const DAYS_PER_WEEK = 7;

/** La partida empieza el lunes del día 0 a esta hora (el lunes de la segunda semana de septiembre). */
export const START_MINUTE = 7 * MINUTES_PER_HOUR;

/** 0 = lunes ... 6 = domingo. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface TimeView {
  /** Minuto absoluto desde el inicio. */
  minute: number;
  /** Día absoluto (0 = primer lunes). */
  day: number;
  /** Semana absoluta (0 = primera semana). */
  week: number;
  weekday: Weekday;
  hour: number;
  /** Minuto dentro del día (0..1439). */
  minuteOfDay: number;
  isWeekend: boolean;
  /** Curso escolar (0 = el primero). */
  schoolYear: number;
  /** Semana dentro del curso (0 = la primera, de septiembre). */
  schoolWeek: number;
  /** Momento del calendario: curso o vacaciones. */
  period: Periodo;
  /** Trimestre en curso (0 en vacaciones). */
  term: Trimestre;
  /** ¿Hay clase hoy? Es de lunes a viernes y solo en periodo lectivo. */
  isSchoolDay: boolean;
  /** ¿Esta semana cierra un trimestre (evaluación el último día lectivo)? */
  isEvaluationWeek: boolean;
  /** 1 o 2 si esta semana es la del primer o segundo parcial del trimestre; 0 si no. */
  parcial: 0 | 1 | 2;
}

export function timeView(minute: number, calendar: CalendarioPais = CALENDARIO_ESPANA): TimeView {
  const day = Math.floor(minute / MINUTES_PER_DAY);
  const minuteOfDay = minute - day * MINUTES_PER_DAY;
  const weekday = (day % DAYS_PER_WEEK) as Weekday;
  const week = Math.floor(day / DAYS_PER_WEEK);
  const schoolWeek = week % calendar.semanasPorCurso;
  const tramo = tramoDeSemana(calendar, schoolWeek);
  const isWeekend = weekday >= 5;
  return {
    minute,
    day,
    week,
    weekday,
    hour: Math.floor(minuteOfDay / MINUTES_PER_HOUR),
    minuteOfDay,
    isWeekend,
    schoolYear: Math.floor(week / calendar.semanasPorCurso),
    schoolWeek,
    period: tramo.periodo,
    term: tramo.trimestre,
    isSchoolDay: !isWeekend && tramo.periodo === 'clase',
    isEvaluationWeek: calendar.evaluaciones.includes(schoolWeek),
    parcial: calendar.parciales.includes(schoolWeek) ? ((calendar.parciales.indexOf(schoolWeek) % 2) + 1 as 1 | 2) : 0,
  };
}

/** ¿La hora actual está en [desde, hasta)? Admite franjas que cruzan medianoche (p. ej. 21 → 6). */
export function inHours(t: TimeView, from: number, to: number): boolean {
  return from <= to ? t.hour >= from && t.hour < to : t.hour >= from || t.hour < to;
}

/** Horario escolar común: días lectivos (no fines de semana ni vacaciones) de 8 a 14. */
export function isSchoolHours(t: TimeView): boolean {
  return t.isSchoolDay && inHours(t, 8, 14);
}

/**
 * La jornada escolar de un día lectivo, en minutos del día: 4 clases que empiezan cada 80 minutos y un recreo de 40 entre la segunda y
 * la tercera (de 8:00 a 14:00, como `isSchoolHours`). Cada clase termina 5 minutos antes de la hora de la siguiente (`HUECO_ENTRE_CLASES`):
 * esos 5 minutos se pasan en el aula, con los compañeros de clase. La usan estudios (las clases) y relaciones (con quién se charla).
 */
export const JORNADA_ESCOLAR = {
  clases: [[480, 555], [560, 635], [680, 755], [760, 835]],
  recreo: [640, 680],
} as const;

/** Minutos libres al acabar cada clase (hasta la hora en punto de la siguiente): se pasan con los compañeros de clase. */
export const HUECO_ENTRE_CLASES = 5;

/** Minutos antes de que empiece una clase en los que se abre la oportunidad de entrar (repasar, hablar con alguien o entrar ya). */
export const MINUTOS_ANTES_DE_CLASE = 10;

/** La clase que va a empezar en menos de `MINUTOS_ANTES_DE_CLASE` minutos (índice, inicio y fin), si es el caso. */
export function claseQueVaAEmpezar(t: TimeView): { indice: number; inicio: number; fin: number } | undefined {
  if (!t.isSchoolDay) return undefined;
  const indice = JORNADA_ESCOLAR.clases.findIndex(([inicio]) => t.minuteOfDay >= inicio - MINUTOS_ANTES_DE_CLASE && t.minuteOfDay < inicio);
  return indice < 0 ? undefined : { indice, inicio: JORNADA_ESCOLAR.clases[indice][0], fin: JORNADA_ESCOLAR.clases[indice][1] };
}

/** ¿Es uno de los 5 minutos que hay al acabar una clase (con los compañeros de clase)? */
export function enHuecoEntreClases(t: TimeView): boolean {
  return t.isSchoolDay && JORNADA_ESCOLAR.clases.some(([, fin]) => t.minuteOfDay >= fin && t.minuteOfDay < fin + HUECO_ENTRE_CLASES);
}

/** ¿Es el recreo de un día lectivo? */
export function enRecreo(t: TimeView): boolean {
  return t.isSchoolDay && t.minuteOfDay >= JORNADA_ESCOLAR.recreo[0] && t.minuteOfDay < JORNADA_ESCOLAR.recreo[1];
}

/** Minutos que faltan hasta la próxima vez que el reloj marque `hour`:00. */
export function minutesUntilHour(minute: number, hour: number): number {
  const mod = minute % MINUTES_PER_DAY;
  const target = hour * MINUTES_PER_HOUR;
  const diff = target - mod;
  return diff > 0 ? diff : diff + MINUTES_PER_DAY;
}
