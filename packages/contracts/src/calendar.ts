/**
 * Calendario escolar como DATO por país. No usa fechas absolutas (el año de la partida es el año 0):
 * se expresa en semanas desde el inicio del curso. El motor y los módulos solo consultan el `TimeView`;
 * para añadir un país basta con otro `CalendarioPais`, sin tocar el motor.
 */

export type Periodo = 'clase' | 'navidad' | 'semana_santa' | 'verano';

/** 0 = no es trimestre (vacaciones). */
export type Trimestre = 0 | 1 | 2 | 3;

export interface TramoCalendario {
  /** Semana del curso en que empieza (0 = primera) y en la que acaba, ambas incluidas. */
  desde: number;
  hasta: number;
  periodo: Periodo;
  trimestre: Trimestre;
}

export interface CalendarioPais {
  id: string;
  nombre: string;
  /** Semanas de un curso completo (con vacaciones). El curso siguiente empieza justo después. */
  semanasPorCurso: number;
  tramos: readonly TramoCalendario[];
  /** Semanas del curso en cuyo último día lectivo hay evaluación de trimestre. */
  evaluaciones: readonly number[];
}

/**
 * España. ESTIMACIÓN constante, igual todos los años: la Semana Santa real es móvil (primer domingo
 * tras la primera luna llena posterior al equinoccio de primavera, entre el 22 de marzo y el 25 de abril),
 * pero el juego no tiene lunas y su año es el año 0.
 * Semana 0 = lunes de la segunda semana de septiembre.
 */
export const CALENDARIO_ESPANA: CalendarioPais = {
  id: 'espana',
  nombre: 'España',
  semanasPorCurso: 52,
  tramos: [
    { desde: 0, hasta: 14, periodo: 'clase', trimestre: 1 },
    { desde: 15, hasta: 16, periodo: 'navidad', trimestre: 0 },
    { desde: 17, hasta: 28, periodo: 'clase', trimestre: 2 },
    { desde: 29, hasta: 29, periodo: 'semana_santa', trimestre: 0 },
    { desde: 30, hasta: 40, periodo: 'clase', trimestre: 3 },
    { desde: 41, hasta: 51, periodo: 'verano', trimestre: 0 },
  ],
  evaluaciones: [14, 28, 40],
};

export const CALENDARIOS: Readonly<Record<string, CalendarioPais>> = { espana: CALENDARIO_ESPANA };

export const NOMBRE_PERIODO: Readonly<Record<Periodo, string>> = {
  clase: 'Curso',
  navidad: 'Vacaciones de Navidad',
  semana_santa: 'Semana Santa',
  verano: 'Vacaciones de verano',
};

/** Tramo del calendario que contiene una semana del curso (0..semanasPorCurso-1). */
export function tramoDeSemana(cal: CalendarioPais, semanaCurso: number): TramoCalendario {
  return cal.tramos.find((t) => semanaCurso >= t.desde && semanaCurso <= t.hasta) ?? cal.tramos[cal.tramos.length - 1];
}

/**
 * Año de nacimiento y edad de competición. Las categorías deportivas se deciden por el AÑO de nacimiento (no por la
 * fecha exacta), como en la vida real: dos niños nacidos el mismo año compiten en la misma categoría aunque uno
 * cumpla años antes. La partida no tiene fechas absolutas; se supone que el curso empieza hacia el 10 de septiembre,
 * así que el año natural cambia unos 113 días después y el día 0 cae en el día 253 del año 0.
 */
export const DIAS_DE_ENERO_AL_INICIO_DEL_CURSO = 252;

/** Año natural (relativo: el año 0 es aquel en que empieza la partida) de un día de la partida; admite días negativos. */
export const anioNatural = (day: number): number => Math.floor((day + DIAS_DE_ENERO_AL_INICIO_DEL_CURSO) / 365);

/** Primer día de un año natural relativo. */
export const primerDiaDelAnio = (anio: number): number => anio * 365 - DIAS_DE_ENERO_AL_INICIO_DEL_CURSO;

/**
 * Edad de competición: año del curso (el de su inicio, en septiembre) menos año de nacimiento.
 * Es constante durante todo el curso y es la que decide la categoría.
 */
export const edadDeCompeticion = (diaDeNacimiento: number, primerDiaDelCurso: number): number =>
  anioNatural(primerDiaDelCurso) - anioNatural(diaDeNacimiento);
