/** El tiempo es tiempo de juego, medido en minutos desde el inicio de la partida. */
export const MINUTES_PER_HOUR = 60;
export const MINUTES_PER_DAY = 1440;
export const DAYS_PER_WEEK = 7;

/** La partida empieza el lunes del día 0 a esta hora. */
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
}

export function timeView(minute: number): TimeView {
  const day = Math.floor(minute / MINUTES_PER_DAY);
  const minuteOfDay = minute - day * MINUTES_PER_DAY;
  const weekday = (day % DAYS_PER_WEEK) as Weekday;
  return {
    minute,
    day,
    week: Math.floor(day / DAYS_PER_WEEK),
    weekday,
    hour: Math.floor(minuteOfDay / MINUTES_PER_HOUR),
    minuteOfDay,
    isWeekend: weekday >= 5,
  };
}

/** ¿La hora actual está en [desde, hasta)? Admite franjas que cruzan medianoche (p. ej. 21 → 6). */
export function inHours(t: TimeView, from: number, to: number): boolean {
  return from <= to ? t.hour >= from && t.hour < to : t.hour >= from || t.hour < to;
}

/** Horario escolar común: lunes a viernes de 8 a 14. */
export function isSchoolHours(t: TimeView): boolean {
  return !t.isWeekend && inHours(t, 8, 14);
}

/** Minutos que faltan hasta la próxima vez que el reloj marque `hour`:00. */
export function minutesUntilHour(minute: number, hour: number): number {
  const mod = minute % MINUTES_PER_DAY;
  const target = hour * MINUTES_PER_HOUR;
  const diff = target - mod;
  return diff > 0 ? diff : diff + MINUTES_PER_DAY;
}
