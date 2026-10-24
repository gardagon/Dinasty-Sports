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

/** Minutos que faltan hasta la próxima vez que el reloj marque `hour`:00. */
export function minutesUntilHour(minute: number, hour: number): number {
  const mod = minute % MINUTES_PER_DAY;
  const target = hour * MINUTES_PER_HOUR;
  const diff = target - mod;
  return diff > 0 ? diff : diff + MINUTES_PER_DAY;
}
