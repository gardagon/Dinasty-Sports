import { edadDeCompeticion, type BodyType, type IdentityView, type Rng } from '@ds/contracts';

/**
 * Identidad del personaje: edad, altura, peso, dominancia lateral y complexión.
 * Funciones puras (sin motor) para poder probarlas y ajustarlas sin tocar el módulo.
 */

/** Años cumplidos al empezar la partida. Cámbialo aquí para empezar con otra edad. */
export const EDAD_INICIAL = 8;

export interface HabitosSemana {
  /** Minutos de la semana en acciones de fuerza, aeróbicas y físicas en general, y de descanso/sueño. */
  fuerza: number;
  cardio: number;
  activo: number;
  descanso: number;
}

export const SIN_HABITOS: HabitosSemana = { fuerza: 0, cardio: 0, activo: 0, descanso: 0 };

export interface IdentidadState {
  edadInicial: number;
  /** Parte del año ya transcurrida al empezar (0..1): reparte los cumpleaños. */
  fraccionInicial: number;
  /** Altura adulta objetivo (cm). Hoy sale de la semilla; con padres saldrá de la herencia. */
  alturaAdulta: number;
  /** Años de adelanto (+) o retraso (−) en el crecimiento. */
  madurez: number;
  zurdo: boolean;
  /** 0..100. Se forma con fuerza sostenida y se pierde sin ella. */
  musculo: number;
  /** 0..100. Sube con el sedentarismo sostenido y baja con la actividad. */
  grasa: number;
  cuerpo: BodyType;
  /** Hábitos acumulados en la semana en curso. */
  semana: HabitosSemana;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function initIdentidad(rng: Rng): IdentidadState {
  return {
    edadInicial: EDAD_INICIAL,
    fraccionInicial: rng.range(0, 1),
    alturaAdulta: Math.round(clamp(171 + rng.normal() * 8, 150, 195) * 10) / 10,
    madurez: clamp(rng.normal() * 0.8, -1.5, 1.5),
    zurdo: rng.chance(0.11),
    musculo: rng.range(18, 30),
    grasa: rng.range(34, 44),
    cuerpo: 'normal',
    semana: { ...SIN_HABITOS },
  };
}

/** Día de nacimiento respecto al inicio de la partida (negativo): de él salen la edad, los cumpleaños y el año de nacimiento. */
export const diaDeNacimiento = (s: IdentidadState): number => Math.round(-(s.edadInicial + s.fraccionInicial) * 365);

/** Edad con decimales en un día de la partida. */
export const edadDecimal = (s: IdentidadState, day: number): number => s.edadInicial + s.fraccionInicial + day / 365;

/** Interpolación lineal sobre una tabla [edad, valor] ordenada por edad. */
function curva(tabla: readonly (readonly [number, number])[], edad: number): number {
  if (edad <= tabla[0][0]) return tabla[0][1];
  for (let i = 1; i < tabla.length; i++) {
    if (edad <= tabla[i][0]) {
      const [x0, y0] = tabla[i - 1];
      const [x1, y1] = tabla[i];
      return y0 + ((y1 - y0) * (edad - x0)) / (x1 - x0);
    }
  }
  return tabla[tabla.length - 1][1];
}

/** Fracción de la altura adulta a cada edad (media aproximada). */
const CRECIMIENTO = [[6, 0.67], [8, 0.73], [10, 0.79], [12, 0.86], [14, 0.94], [16, 0.985], [18, 1]] as const;
/** IMC de referencia sano a cada edad. */
const IMC_SANO = [[6, 15.2], [10, 16.2], [12, 17.4], [14, 18.8], [16, 20.2], [18, 21.5]] as const;

export function alturaEn(s: IdentidadState, day: number): number {
  return s.alturaAdulta * curva(CRECIMIENTO, edadDecimal(s, day) + s.madurez);
}

export function pesoEn(s: IdentidadState, day: number): number {
  const m = alturaEn(s, day) / 100;
  const imc = curva(IMC_SANO, edadDecimal(s, day)) + 0.04 * (s.musculo - 30) + 0.09 * (s.grasa - 40);
  return imc * m * m;
}

export function viewIdentidad(s: IdentidadState, day: number, primerDiaDelCurso: number): IdentityView {
  return {
    age: Math.floor(edadDecimal(s, day)),
    seasonAge: edadDeCompeticion(diaDeNacimiento(s), primerDiaDelCurso),
    heightCm: Math.round(alturaEn(s, day) * 10) / 10,
    weightKg: Math.round(pesoEn(s, day) * 10) / 10,
    leftHanded: s.zurdo,
    bodyType: s.cuerpo,
  };
}

/** Complexión a partir de músculo y grasa. El orden importa: lo más marcado manda. */
export function complexion(musculo: number, grasa: number): BodyType {
  if (grasa >= 65) return 'con_sobrepeso';
  if (musculo >= 60) return 'musculado';
  if (musculo >= 35 && grasa <= 45) return 'atletico';
  if (grasa <= 25 && musculo <= 30) return 'delgado';
  return 'normal';
}

/** Minutos físicos semanales hacia los que tiende la grasa/músculo. Ajustable con la simulación. */
export const CUERPO = {
  /** Ritmo semanal al que el cuerpo se acerca a su objetivo. */
  inercia: 0.08,
  grasaBase: 78,
  grasaPorMinutoActivo: 0.1,
  /** Juego libre y recreos: actividad mínima semanal aunque el jugador no haga deporte. */
  actividadBasica: 60,
  musculoBase: 12,
  musculoPorMinutoFuerza: 0.1,
};

/** Fin de semana: el cuerpo se mueve despacio hacia lo que dicen los hábitos. */
export function actualizarCuerpo(s: IdentidadState): IdentidadState {
  const grasaObj = clamp(CUERPO.grasaBase - (s.semana.activo + CUERPO.actividadBasica) * CUERPO.grasaPorMinutoActivo, 20, 80);
  const musculoObj = clamp(CUERPO.musculoBase + s.semana.fuerza * CUERPO.musculoPorMinutoFuerza, 10, 90);
  const grasa = s.grasa + (grasaObj - s.grasa) * CUERPO.inercia;
  const musculo = s.musculo + (musculoObj - s.musculo) * CUERPO.inercia;
  return { ...s, grasa, musculo, cuerpo: complexion(musculo, grasa), semana: { ...SIN_HABITOS } };
}

export const NOMBRE_COMPLEXION: Record<BodyType, string> = {
  delgado: 'delgada',
  normal: 'normal',
  atletico: 'atlética',
  musculado: 'musculosa',
  con_sobrepeso: 'con sobrepeso',
};
