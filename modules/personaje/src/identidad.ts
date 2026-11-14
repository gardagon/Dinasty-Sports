import { PROPORCION_DE_ZURDOS, SD_Z_HIJO, alturaEn as alturaDeCuerpo, anioNatural, complexion, edadDeCompeticion, pasoDeSemanaDelCuerpo, pesoDe, primerDiaDelAnio, type BodyType, type IdentityView, type PerfilDelPersonaje, type PerksDe, type Rng } from '@ds/contracts';

/**
 * Identidad del personaje: edad, altura, peso, dominancia lateral y complexión.
 * Funciones puras (sin motor) para poder probarlas y ajustarlas sin tocar el módulo.
 */

/**
 * La edad de su clase al empezar la partida (3.º de primaria: niños que cumplen 8 años en el año natural en que empieza). Es la edad con la que se calculan los
 * valores de partida, y de ella sale su año de nacimiento: ver `initIdentidad`. Cámbialo aquí para empezar en otro curso.
 */
export const EDAD_INICIAL = 8;

/** Por debajo de esta edad (años), quedar con alguien cuenta la mitad de su duración como actividad del cuerpo (etiqueta `actividadDeNino`). */
export const EDAD_DE_QUEDAR_COMO_JUEGO = 12;

/** Hoy el personaje es chico (el sexo entra en las reglas del cuerpo igual que en las de cualquier persona). */
export const SEXO_DEL_PERSONAJE = 'm' as const;

export interface HabitosSemana {
  /** Minutos de la semana en acciones de fuerza, aeróbicas y físicas en general, y de descanso/sueño. */
  fuerza: number;
  cardio: number;
  activo: number;
  descanso: number;
  /** Sesiones de club y competiciones de la semana (su carga para el riesgo de lesión). Ausente en partidas anteriores. */
  cargas?: number;
}

export const SIN_HABITOS: HabitosSemana = { fuerza: 0, cardio: 0, activo: 0, descanso: 0 };

export interface IdentidadState {
  /** Años cumplidos al empezar la partida (7 o 8: nace como el resto de su clase, un día al azar del mismo año natural). */
  edadInicial: number;
  /** Parte del año ya transcurrida al empezar (0..1): reparte los cumpleaños. */
  fraccionInicial: number;
  /** Semilla de la partida: de ella salen los sorteos estables del personaje (sus lesiones), como los de los PNJ. Ausente en partidas anteriores (entonces 0). */
  semilla?: number;
  /** Altura adulta objetivo (cm). Hoy sale de la semilla; con padres saldrá de la herencia. */
  alturaAdulta: number;
  /** Años de adelanto (+) o retraso (−) en el crecimiento. */
  madurez: number;
  /** Genética del cuerpo en puntuación típica (de `ctx.herencia`): facilidad para engordar y para ganar músculo. Ausente en partidas anteriores (0). */
  metabolismo?: number;
  musculatura?: number;
  /** Su pierna buena (y su mano): zurdo o diestro. La misma proporción que los PNJ (`PROPORCION_DE_ZURDOS`, en torno a un 20 %: la del pie, no la de la mano, que era el 11 %). */
  zurdo: boolean;
  /** 0..100. Se forma con fuerza sostenida y se pierde sin ella. */
  musculo: number;
  /** 0..100. Sube con el sedentarismo sostenido y baja con la actividad. */
  grasa: number;
  cuerpo: BodyType;
  /** Su historial anual: una foto por cumpleaños (`[edad de la primera foto, músculo, grasa, …]`, en enteros), como el de cualquier persona (`conFotoDelCumple`, en contracts). Ausente en partidas anteriores. */
  hc?: number[];
  /** Hábitos acumulados en la semana en curso. */
  semana: HabitosSemana;
  /** Perks: los activos (como mucho 3, los que afectan) y el pool que pasa a los hijos. */
  perks: PerksDe;
  /** Origen, apariencia, carácter, intereses y gustos. Los intereses suben con lo que el personaje hace; el resto es fijo. */
  perfil: PerfilDelPersonaje;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** `zAltura`: genética de la estatura del personaje (puntuación típica del hijo de `ctx.herencia('estatura')`). */
export function initIdentidad(rng: Rng, zAltura: number, perks: PerksDe, perfil: PerfilDelPersonaje, alturaExtraCm = 0, genetica: { metabolismo?: number; musculatura?: number } = {}): IdentidadState {
  // Nace como los PNJ: un día al azar del año natural de su clase (los que cumplen EDAD_INICIAL años ese año). Así empieza con entre 7,7 y 8,7 años según el día en que cae el
  // inicio del curso, nunca un año mayor que sus compañeros (antes tenía entre 8,0 y 9,0, y en 3 de cada 10 partidas nacía un año antes que su clase).
  const nacimiento = primerDiaDelAnio(anioNatural(0) - EDAD_INICIAL) + rng.int(0, 364);
  const anios = -nacimiento / 365;
  const edadInicial = Math.floor(anios);
  return {
    edadInicial,
    fraccionInicial: anios - edadInicial,
    alturaAdulta: Math.round(clamp(171 + (zAltura / SD_Z_HIJO) * 8, 150, 195) * 10 + alturaExtraCm * 10) / 10,
    madurez: clamp(rng.normal() * 0.8, -1.5, 1.5),
    ...(genetica.metabolismo !== undefined ? { metabolismo: genetica.metabolismo } : {}),
    ...(genetica.musculatura !== undefined ? { musculatura: genetica.musculatura } : {}),
    zurdo: rng.chance(PROPORCION_DE_ZURDOS),
    musculo: rng.range(18, 30),
    grasa: rng.range(34, 44),
    cuerpo: 'normal',
    semana: { ...SIN_HABITOS },
    perks,
    perfil,
  };
}

/** Día de nacimiento respecto al inicio de la partida (negativo): de él salen la edad, los cumpleaños y el año de nacimiento. */
export const diaDeNacimiento = (s: IdentidadState): number => Math.round(-(s.edadInicial + s.fraccionInicial) * 365);

/** Edad con decimales en un día de la partida. */
export const edadDecimal = (s: IdentidadState, day: number): number => s.edadInicial + s.fraccionInicial + day / 365;

/** Altura y peso de hoy: las reglas del cuerpo son de contracts (`cuerpo.ts`), las mismas para todas las personas. */
export const alturaEn = (s: IdentidadState, day: number): number => alturaDeCuerpo(s.alturaAdulta, edadDecimal(s, day), s.madurez);

export const pesoEn = (s: IdentidadState, day: number): number => pesoDe(alturaEn(s, day), edadDecimal(s, day), s.musculo, s.grasa);

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

/** Fin de semana: el cuerpo se mueve despacio hacia lo que dicen los hábitos (`pasoDeSemanaDelCuerpo`, en contracts). */
export function actualizarCuerpo(s: IdentidadState, day: number): IdentidadState {
  const { musculo, grasa } = pasoDeSemanaDelCuerpo(s, s.semana, { edad: edadDecimal(s, day), madurez: s.madurez, sexo: SEXO_DEL_PERSONAJE, metabolismo: s.metabolismo, musculatura: s.musculatura });
  return { ...s, grasa, musculo, cuerpo: complexion(musculo, grasa), semana: { ...SIN_HABITOS } };
}

export const NOMBRE_COMPLEXION: Record<BodyType, string> = {
  delgado: 'delgada',
  normal: 'normal',
  atletico: 'atlética',
  musculado: 'musculosa',
  con_sobrepeso: 'con sobrepeso',
};
