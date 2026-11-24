import { clamp } from './util-numerica';
import { deudaEfectiva, fatigaPorSueno } from './sueno';
import type { TamanoDeClub } from './deporte-datos';

/**
 * SALUD Y LESIONES (E12, F1; plan en `docs/relevo/salud-lesiones.md`, decisiones del 24/11 en `docs/DECISIONES.md`). Reglas puras, una sola copia para el personaje y para cualquier PNJ,
 * como `estado-de-jugador.ts` y `sueno.ts`. **SIN ACTIVAR: nadie llama a nada de aquí todavía** (la F2 activa el sueño, la F3 las lesiones tipadas y la F4 el partido), así que la huella de
 * las partidas no cambia. Todas las cifras son provisionales y se calibran con `npm run sim:salud` (F1 del plan); la fuente de cada una está en el relevo (§2 y §11).
 *
 * Cómo se usa (la firma que se ha acordado con el motor de partidos, `docs/relevo/partidos-reales.md` §4):
 *  1. Una vez por persona y actividad (por partido, no por minuto): `perfilDeRiesgo(persona, actividad)` → lesiones por hora de cada tipo, con todo lo propio de la persona ya aplicado
 *     (edad, constitución, perks, salud, sueño, historial, sexo, estirón, superficie, club).
 *  2. En cada exposición: `riesgoPorExposicion(perfil, { horas, contacto, intensidad, cansancio })` → probabilidad y reparto por tipo. El que tira el dado es quien pregunta, con su azar propio
 *     (`rngEstable('partido-lesiones', semilla, partido, jugador)` en el fútbol; `rngEstable('lesion', semilla, id, semana)` en el paso semanal).
 *  3. Si hay lesión: `sortearLesion(perfil, porTipo, azarTipo, azarGravedad, ajustes)` → `{ t, z, d, n }` (tipo, zona y días de baja).
 */

// ---------------------------------------------------------------------------------------------------- tipos

export type TipoDeLesion = 'golpe' | 'esguince' | 'muscular' | 'sobrecarga' | 'fractura' | 'conmocion' | 'ligamento' | 'otras';
export const TIPOS_DE_LESION: readonly TipoDeLesion[] = ['golpe', 'esguince', 'muscular', 'sobrecarga', 'fractura', 'conmocion', 'ligamento', 'otras'];
export type ZonaDelCuerpo = 'cabeza' | 'brazo' | 'espalda' | 'cadera' | 'muslo' | 'rodilla' | 'pierna' | 'tobillo' | 'pie' | 'cuerpo';
export type ActividadDeRiesgo = 'partido' | 'sesion' | 'otra';

/**
 * Una lesión en curso, como se guarda (números cortos): tipo, zona, días de baja que le quedan (`d`) y días de baja que tuvo al empezar (`n`; de él sale la fase).
 * `'antigua'` es la lesión de una partida guardada antes de contar la baja en días (`migrarBaja`): no se sabe de qué era.
 */
export interface Lesion {
  t: TipoDeLesion | 'antigua';
  z: ZonaDelCuerpo;
  d: number;
  n: number;
}

/** Una lesión ya curada, para el historial y para el riesgo de volver a lesionarse: tipo, zona y día (absoluto) del alta. */
export interface LesionCurada {
  t: TipoDeLesion | 'antigua';
  z: ZonaDelCuerpo;
  alta: number;
}

/** Qué se le puede lesionar a quien hace cada cosa: la zona más probable de cada tipo (con el azar de la zona). Para el sorteo de `sortearLesion`. */
const ZONAS_DE_TIPO: Readonly<Record<TipoDeLesion, readonly (readonly [ZonaDelCuerpo, number])[]>> = {
  golpe: [['pierna', 4], ['muslo', 3], ['cuerpo', 2], ['brazo', 1]],
  esguince: [['tobillo', 7], ['rodilla', 3]],
  muscular: [['muslo', 8], ['cadera', 2], ['pierna', 1]],
  sobrecarga: [['rodilla', 4], ['pie', 3], ['espalda', 2], ['cadera', 1]],
  fractura: [['brazo', 4], ['pierna', 3], ['pie', 2], ['cuerpo', 1]],
  conmocion: [['cabeza', 1]],
  ligamento: [['rodilla', 1]],
  otras: [['cuerpo', 3], ['pierna', 2], ['brazo', 2], ['pie', 1]],
};

// ---------------------------------------------------------------------------------------------------- la tasa base

/** Lesiones con baja por 1.000 horas de exposición, a la edad de referencia (16–19). Fútbol base: partido 14,4 y entrenamiento 2,8 (de Ste Croix y otros, 2022); «otra» sin dato directo. */
export const TASA_BASE_POR_1000_H: Readonly<Record<ActividadDeRiesgo, number>> = { partido: 14, sesion: 2.8, otra: 1 };

/** Cómo se reparten las lesiones por tipo según la actividad (cada fila suma 1). Mezclando partido y entrenamiento a partes iguales sale el reparto global del relevo (§2.3). */
export const CUOTA_POR_ACTIVIDAD: Readonly<Record<ActividadDeRiesgo, Readonly<Record<TipoDeLesion, number>>>> = {
  partido: { golpe: 0.3, esguince: 0.22, muscular: 0.2, sobrecarga: 0.05, fractura: 0.05, conmocion: 0.05, ligamento: 0.01, otras: 0.12 },
  sesion: { golpe: 0.12, esguince: 0.18, muscular: 0.31, sobrecarga: 0.26, fractura: 0.01, conmocion: 0.01, ligamento: 0.01, otras: 0.1 },
  otra: { golpe: 0.35, esguince: 0.22, muscular: 0.12, sobrecarga: 0.08, fractura: 0.06, conmocion: 0.03, ligamento: 0.01, otras: 0.13 },
};

/** Cuánto se lesiona cada edad frente a la de referencia: menos de pequeño, más de mayor (3,7 por 1.000 h en edades menores frente a 7,9 en mayores). Por edad cumplida. */
export function factorDeEdad(edad: number): number {
  const e = Math.floor(edad);
  return e <= 10 ? 0.5 : e <= 12 ? 0.65 : e <= 15 ? 0.9 : e <= 19 ? 1 : 0.9;
}

/** Los tipos que dependen del contacto del momento (golpes, torceduras y roturas por un choque) y los que dependen de la carga y el cansancio. */
const POR_CONTACTO: ReadonlySet<TipoDeLesion> = new Set<TipoDeLesion>(['golpe', 'esguince', 'fractura', 'conmocion', 'otras']);

// ---------------------------------------------------------------------------------------------------- lo propio de la persona

/** Los perks que importan para la salud (por su id, `perks.ts`): los de resistencia (a lesionarse) y los de recuperación (a curarse). */
export const PERKS_DE_SALUD = {
  /** Más fácil lesionarse (además de la constitución más baja que ya da). */
  endeble: 'endeble',
  /** Más difícil lesionarse (además de la constitución más alta que ya da). */
  constitucionDeToro: 'constitucion_de_toro',
  /** Las lesiones duran menos. */
  recuperacionRapida: 'recuperacion_rapida',
  /** Las lesiones duran más. */
  recuperacionLenta: 'recuperacion_lenta',
} as const;

/** Lo que multiplican los perks: el riesgo de lesionarse (resistencia) y lo que duran (recuperación). La constitución se cuenta aparte, así que ya hay una parte que viene del tope que modifican. */
export const EFECTO_DE_PERKS = {
  riesgo: { [PERKS_DE_SALUD.endeble]: 1.25, [PERKS_DE_SALUD.constitucionDeToro]: 0.8 },
  duracion: { [PERKS_DE_SALUD.recuperacionRapida]: 0.8, [PERKS_DE_SALUD.recuperacionLenta]: 1.25 },
} as const;

/** El factor de la constitución en el riesgo (0 a 100): de ×1,4 a ×0,6. El mismo del modelo anterior (`riesgoDeLesion`). */
export const factorPorConstitucion = (constitucion: number): number => 1.4 - (0.8 * clamp(constitucion, 0, 100)) / 100;

/**
 * La **resistencia a lesiones** de una persona: lo que multiplica su riesgo por ser robusta o frágil, con la constitución y los perks. Menos de 1 es más resistente. La constitución que se pasa
 * ya lleva el tope de los perks (Endeble −8, Constitución de toro +8), así que el perk suma su propio factor encima (×1,25 y ×0,8): con constitución 50, Endeble da ×1,33 y Constitución de toro ×0,75.
 */
export function resistenciaALesiones(constitucion: number, perks: readonly string[] = []): number {
  let f = factorPorConstitucion(constitucion);
  if (perks.includes(PERKS_DE_SALUD.endeble)) f *= EFECTO_DE_PERKS.riesgo.endeble;
  if (perks.includes(PERKS_DE_SALUD.constitucionDeToro)) f *= EFECTO_DE_PERKS.riesgo.constitucion_de_toro;
  return f;
}

/** Lo que multiplican los perks de recuperación la duración de una lesión (el rápido y el lento a la vez se anulan). */
export function factorDeDuracionPorPerks(perks: readonly string[] = []): number {
  let f = 1;
  if (perks.includes(PERKS_DE_SALUD.recuperacionRapida)) f *= EFECTO_DE_PERKS.duracion.recuperacion_rapida;
  if (perks.includes(PERKS_DE_SALUD.recuperacionLenta)) f *= EFECTO_DE_PERKS.duracion.recuperacion_lenta;
  return f;
}

/** El factor de la fatiga: `(1 + fatiga/40)`, normalizado para que una fatiga típica (48) valga ×1. La fatiga incluye lo que suma el sueño atrasado (`fatigaPorSueno`). */
export const FATIGA_TIPICA = 48;
export const factorPorFatiga = (fatiga: number): number => (1 + Math.max(0, fatiga) / 40) / (1 + FATIGA_TIPICA / 40);

/** Lo que añade directamente el sueño atrasado al riesgo, además de la fatiga que suma: `1 + 0,05·deudaEfectiva` (con 5 h efectivas, ×1,25 y, con la fatiga, ~×1,6: Milewski 2014 da ×1,7). */
export const factorPorSuenoEnLesion = (deuda: number): number => 1 + 0.05 * deudaEfectiva(deuda);

/** Con la salud por debajo de 60, más riesgo: `1 + (60 − salud)/100`. */
export const factorPorSaludEnLesion = (salud: number): number => (salud >= 60 ? 1 : 1 + (60 - clamp(salud, 0, 100)) / 100);

/** El desgaste crónico (oculto, 0 a 100; F6): con 50 o más, el cuerpo no acaba de recuperarse (lesiones ×1,15). */
export const factorPorDesgasteEnLesion = (desgaste: number): number => (desgaste >= 50 ? 1.15 : 1);

/** Dónde se juega: césped natural ×1, artificial ×1,1, tierra o mal estado ×1,25, asfalto (patio) ×1,3. Evidencia débil en niños: dato del campo, de poco peso. */
export type Superficie = 'natural' | 'artificial' | 'tierra' | 'asfalto';
export const FACTOR_DE_SUPERFICIE: Readonly<Record<Superficie, number>> = { natural: 1, artificial: 1.1, tierra: 1.25, asfalto: 1.3 };

/**
 * El historial: haber tenido una lesión en esa zona en el último año sube el riesgo en esa zona, hasta ×1,5 nada más volver y de forma lineal hasta ×1 al cabo de 365 días. Es la predisposición;
 * la **recaída** de la misma lesión se cuenta aparte (`riesgoDiarioDeRecaida`), para no contarla dos veces. `dia` es el día absoluto de hoy.
 */
export const factorPorHistorial = (zona: ZonaDelCuerpo | undefined, curadas: readonly LesionCurada[] | undefined, dia: number): number => {
  if (!zona || !curadas) return 1;
  let f = 1;
  for (const c of curadas) {
    if (c.z !== zona) continue;
    const dias = dia - c.alta;
    if (dias >= 0 && dias < 365) f = Math.max(f, 1 + 0.5 * (1 - dias / 365));
  }
  return f;
};

// ---------------------------------------------------------------------------------------------------- el estirón y el sexo

/** Los anios de edad a los que es el pico de crecimiento (la edad de referencia; con la `madurez` de la persona se adelanta o retrasa): chicas 12 y chicos 14 (van der Sluis 2014 y revisiones). */
export const EDAD_DEL_PICO_DE_CRECIMIENTO = { f: 12, m: 14 } as const;

/** Años que han pasado desde el pico de crecimiento (negativo, antes; positivo, después), con el adelanto o retraso del desarrollo (`madurez`). */
export const aniosDesdeElPico = (edad: number, madurez: number, sexo: 'f' | 'm'): number => edad + madurez - EDAD_DEL_PICO_DE_CRECIMIENTO[sexo];

/**
 * Lo que cambia el estirón en el riesgo de cada tipo: en la ventana del pico (±6 meses) las lesiones traumáticas (golpe, esguince, fractura, conmoción) ×1,25; y en el año siguiente la sobrecarga
 * (apofisitis, tendinopatías) ×1,6. Sin `anios` (no se sabe), ×1.
 */
export function factorPorEstiron(tipo: TipoDeLesion, anios: number | undefined): number {
  if (anios === undefined) return 1;
  if (Math.abs(anios) <= 0.5 && (tipo === 'golpe' || tipo === 'esguince' || tipo === 'fractura' || tipo === 'conmocion')) return 1.25;
  if (tipo === 'sobrecarga' && anios > 0.5 && anios <= 1.5) return 1.6;
  return 1;
}

/** Lo que cambia el sexo: en las chicas, tras el estirón, el ligamento cruzado y la sobrecarga ×2 (decidido el 24/11; los demás tipos igual). Sin sexo o sin `anios`, ×1. */
export function factorPorSexo(tipo: TipoDeLesion, sexo: 'f' | 'm' | undefined, anios: number | undefined): number {
  if (sexo !== 'f' || anios === undefined || anios < 0.5) return 1;
  return tipo === 'ligamento' || tipo === 'sobrecarga' ? 2 : 1;
}

/**
 * El ciclo menstrual: **el hueco está reservado y no se modela** (decidido el 24/11; otra sesión analizará el personaje chica). Hoy no cambia nada (×1); cuando se modele, lo que haga entrará
 * aquí y en la salud general sin tocar las firmas, porque `PersonaDeRiesgo.ciclo` ya viaja hasta `perfilDeRiesgo`.
 */
export interface CicloDeRiesgo {
  /** Día del ciclo (reservado: nadie lo lee todavía). */
  dia?: number;
}
export const factorPorCiclo = (_ciclo: CicloDeRiesgo | undefined): number => 1;

// ---------------------------------------------------------------------------------------------------- el perfil de riesgo de una persona

/** Todo lo propio de la persona que cambia su riesgo. Lo que no se sabe se deja sin poner y vale ×1 (el cálculo sale igual para el personaje y para cualquier PNJ). */
export interface PersonaDeRiesgo {
  edad: number;
  sexo?: 'f' | 'm';
  /** Años de adelanto (+) o retraso (−) del desarrollo (`madurez` del personaje, `desfase` de un PNJ). */
  madurez?: number;
  /** 0 a 100. Con el tope de los perks ya aplicado. */
  constitucion: number;
  /** 0 a 100. */
  salud: number;
  /** Fatiga que trae (`fatigaDeLaSemana`, 0 o más), sin contar el sueño: se suma aquí. Sin ella, la típica. */
  fatiga?: number;
  /** Horas de sueño atrasado (`gen.sueno`). */
  deuda?: number;
  /** Desgaste crónico (F6). */
  desgaste?: number;
  /** Ids de los perks activos (se miran los de `PERKS_DE_SALUD`). */
  perks?: readonly string[];
  /** Lesiones curadas recientes, para la predisposición. */
  curadas?: readonly LesionCurada[];
  /** El día absoluto de hoy (para el historial). */
  dia?: number;
  /** Dónde se juega o entrena (`FACTOR_DE_SUPERFICIE`); sin ella, césped natural. */
  superficie?: Superficie;
  /** El club: da prevención (`atencionDelClub`). */
  clubDe?: TamanoDeClub;
  /** Reservado, sin modelar (menstruación). */
  ciclo?: CicloDeRiesgo;
}

/** Lesiones por hora de cada tipo, con todo lo propio de la persona ya aplicado (falta lo del momento: contacto, cansancio de ahora e intensidad). */
export type PerfilDeRiesgo = Readonly<Record<TipoDeLesion, number>>;

/**
 * El perfil de riesgo de una persona en una actividad: **una llamada por persona y actividad** (en un partido, una por jugador, no una por minuto). El motor del partido lo multiplica después
 * por lo del momento (`riesgoPorExposicion`). La predisposición del historial se aplica por zona al sortear la lesión; aquí se aplica la media de las zonas del tipo.
 */
export function perfilDeRiesgo(p: PersonaDeRiesgo, actividad: ActividadDeRiesgo): PerfilDeRiesgo {
  const anios = p.sexo ? aniosDesdeElPico(p.edad, p.madurez ?? 0, p.sexo) : undefined;
  const tasa = TASA_BASE_POR_1000_H[actividad] / 1000;
  const comunes =
    factorDeEdad(p.edad) *
    resistenciaALesiones(p.constitucion, p.perks) *
    factorPorFatiga((p.fatiga ?? FATIGA_TIPICA) + fatigaPorSueno(p.deuda ?? 0)) *
    factorPorSuenoEnLesion(p.deuda ?? 0) *
    factorPorSaludEnLesion(p.salud) *
    factorPorDesgasteEnLesion(p.desgaste ?? 0) *
    FACTOR_DE_SUPERFICIE[p.superficie ?? 'natural'] *
    atencionDelClub(p.clubDe).prevencion *
    factorPorCiclo(p.ciclo);
  const perfil = {} as Record<TipoDeLesion, number>;
  for (const t of TIPOS_DE_LESION) {
    const zonas = ZONAS_DE_TIPO[t];
    const total = zonas.reduce((s, [, w]) => s + w, 0);
    // Predisposición del historial: la media, ponderada por lo probable que es cada zona de ese tipo.
    const historial = zonas.reduce((s, [z, w]) => s + w * factorPorHistorial(z, p.curadas, p.dia ?? 0), 0) / total;
    perfil[t] = tasa * CUOTA_POR_ACTIVIDAD[actividad][t] * comunes * historial * factorPorEstiron(t, anios) * factorPorSexo(t, p.sexo, anios);
  }
  return perfil;
}

// ---------------------------------------------------------------------------------------------------- lo del momento: la exposición

export type Intensidad = 'relajado' | 'normal' | 'a_tope';

/** Cuánto sube el riesgo con la intensidad: relajado ×0,7, normal ×1, a tope ×1,35 (`MOTOR_PARTIDOS.md` §6). */
export const FACTOR_DE_INTENSIDAD: Readonly<Record<Intensidad, number>> = { relajado: 0.7, normal: 1, a_tope: 1.35 };

/** El cansancio del partido (0 a 100) en el riesgo de lo que depende de la carga (músculo, ligamento, sobrecarga): ×0,75 descansado, ×1,25 con 45 y ×1,75 con 90; un partido entero da ×1 de media. */
export const factorPorCansancioDelPartido = (cansancio: number): number => 0.75 + clamp(cansancio, 0, 100) / 90;

/** Lo que pasa en este momento: cuántas horas dura, cuánto contacto hay (0 a 1; 0,5, el normal de un partido), a qué intensidad y con qué cansancio del partido. Lo que falta vale lo normal. */
export interface Exposicion {
  horas: number;
  contacto?: number;
  intensidad?: Intensidad;
  cansancio?: number;
}

/** El resultado de una pregunta de riesgo: la probabilidad de lesionarse en esa exposición y el riesgo de cada tipo (sus pesos sirven para sortear el tipo si hay lesión). */
export interface RiesgoPorExposicion {
  p: number;
  porTipo: Readonly<Record<TipoDeLesion, number>>;
}

/**
 * La probabilidad de lesionarse en una exposición: `1 − e^(−Σ tasa_tipo × horas × lo del momento)`. Lo que depende del contacto (golpe, esguince, fractura, conmoción, otras) se multiplica por
 * `2 × contacto` (neutro con 0,5) y lo que depende de la carga (músculo, sobrecarga, ligamento) por el cansancio del partido; todo, por la intensidad. Sin contacto ni cansancio, lo normal.
 */
export function riesgoPorExposicion(perfil: PerfilDeRiesgo, e: Exposicion): RiesgoPorExposicion {
  const intensidad = FACTOR_DE_INTENSIDAD[e.intensidad ?? 'normal'];
  const contacto = clamp(2 * (e.contacto ?? 0.5), 0, 2);
  const carga = e.cansancio === undefined ? 1 : factorPorCansancioDelPartido(e.cansancio);
  const porTipo = {} as Record<TipoDeLesion, number>;
  let suma = 0;
  for (const t of TIPOS_DE_LESION) {
    const tasa = perfil[t] * Math.max(0, e.horas) * intensidad * (POR_CONTACTO.has(t) ? contacto : carga);
    porTipo[t] = tasa;
    suma += tasa;
  }
  return { p: 1 - Math.exp(-suma), porTipo };
}

// ---------------------------------------------------------------------------------------------------- sortear la lesión: tipo, zona y días

/**
 * La duración de cada tipo en días de baja, por grados: `[hasta qué azar, mínimo, máximo]`. Un esguince es leve (40 %), de grado I (38 %), II (16 %) o III (6 %); un tirón o rotura muscular, leve (35 %), I (37 %), II (22 %) o III (6 %); la sobrecarga avisa antes y casi la mitad es una molestia que se queda en días.
 * Los rangos siguen las categorías de baja del consenso de fútbol (leve 1–3, mínima 4–7, moderada 8–28, grave más de 28 días).
 */
export const DURACION_POR_TIPO: Readonly<Record<TipoDeLesion, readonly (readonly [number, number, number])[]>> = {
  golpe: [[0.8, 1, 3], [1, 4, 7]],
  esguince: [[0.4, 2, 7], [0.78, 8, 21], [0.94, 22, 56], [1, 57, 120]],
  muscular: [[0.35, 3, 7], [0.72, 8, 14], [0.94, 15, 35], [1, 36, 80]],
  sobrecarga: [[0.55, 3, 14], [0.9, 15, 35], [1, 36, 56]],
  fractura: [[1, 28, 84]],
  conmocion: [[1, 7, 28]],
  ligamento: [[1, 180, 270]],
  otras: [[1, 1, 3]],
};

/** Los días de baja de una lesión de ese tipo (`azar` de 0 a 1): primero el grado y luego, dentro de él, la posición. Sin ajustes, lo típico de una persona. */
export function diasBaseDeLesion(tipo: TipoDeLesion, azar: number): number {
  const grados = DURACION_POR_TIPO[tipo];
  const a = clamp(azar, 0, 0.999999);
  let desde = 0;
  for (const [hasta, min, max] of grados) {
    if (a < hasta) return Math.round(min + (max - min) * ((a - desde) / (hasta - desde)));
    desde = hasta;
  }
  const [, min, max] = grados[grados.length - 1];
  return Math.round((min + max) / 2);
}

/** Cómo se atiende la lesión: ir al médico no cambia lo que dura (da el diagnóstico); el fisio la acorta en las moderadas y graves; forzar la vuelta le quita un cuarto (con más riesgo de recaída). */
export interface AtencionDeLesion {
  fisio?: boolean;
  forzado?: boolean;
}

/** A partir de cuántos días el fisio acorta la baja (moderada: 8 días o más) y cuánto (×0,8). */
export const FISIO = { desdeDias: 8, factor: 0.8 } as const;
/** Lo que se acorta la baja forzando la vuelta (×0,75). */
export const FACTOR_DE_FORZAR = 0.75;

/** La duración final de una lesión: la del tipo por la constitución (de ×1,15 con 0 a ×0,85 con 100), los perks de recuperación, la salud baja (más) y la atención. Nunca menos de 1 día. */
export function duracionDeLesion(tipo: TipoDeLesion, azar: number, p: Pick<PersonaDeRiesgo, 'constitucion' | 'salud' | 'perks'>, atencion: AtencionDeLesion = {}): number {
  const base = diasBaseDeLesion(tipo, azar);
  let f = (1.15 - (0.3 * clamp(p.constitucion, 0, 100)) / 100) * factorDeDuracionPorPerks(p.perks);
  if (p.salud < 60) f *= 1 + (60 - clamp(p.salud, 0, 100)) / 200;
  if (atencion.fisio && base >= FISIO.desdeDias) f *= FISIO.factor;
  if (atencion.forzado) f *= FACTOR_DE_FORZAR;
  return Math.max(1, Math.round(base * f));
}

/** Elige una cosa de una lista de pesos con un azar de 0 a 1. */
function elegir<T>(opciones: readonly (readonly [T, number])[], azar: number): T {
  const total = opciones.reduce((s, [, w]) => s + w, 0);
  let x = clamp(azar, 0, 0.999999) * total;
  for (const [valor, w] of opciones) {
    if (x < w) return valor;
    x -= w;
  }
  return opciones[opciones.length - 1][0];
}

/**
 * Cuando ya hay lesión: el tipo (por lo que pesa cada uno en esa exposición, `riesgo.porTipo`), la zona y los días de baja. Usa dos azares de la persona (`azarTipo` y `azarGravedad`; la zona sale del
 * segundo, desplazado), así que con la misma persona, semana y partido sale lo mismo.
 */
export function sortearLesion(riesgo: RiesgoPorExposicion, azarTipo: number, azarGravedad: number, p: Pick<PersonaDeRiesgo, 'constitucion' | 'salud' | 'perks'>, atencion: AtencionDeLesion = {}): Lesion {
  const tipo = elegir(TIPOS_DE_LESION.map((t) => [t, riesgo.porTipo[t]] as const), azarTipo);
  const zona = elegir(ZONAS_DE_TIPO[tipo], (azarGravedad * 7.3) % 1);
  const d = duracionDeLesion(tipo, azarGravedad, p, atencion);
  return { t: tipo, z: zona, d, n: d };
}

// ---------------------------------------------------------------------------------------------------- baja: días, semanas y fases

/** Las semanas de baja que quedan (lo que ve el resto del juego: `baja` en semanas): se derivan de los días, redondeando hacia arriba. 0 días, 0 semanas. */
export const semanasDeBaja = (dias: number): number => (dias > 0 ? Math.ceil(dias / 7) : 0);

/**
 * Pasan unos días de baja: devuelve la lesión con los días que quedan o `undefined` si ya está curada. En el paso semanal, 7 días. Las lesiones nunca bajan de 0.
 */
export function pasarDiasDeBaja(l: Lesion | undefined, dias: number): Lesion | undefined {
  if (!l) return undefined;
  const d = l.d - Math.max(0, dias);
  return d > 0 ? { ...l, d } : undefined;
}

export type FaseDeLesion = 'aguda' | 'rehabilitacion' | 'vuelta';

/** La parte inicial de la baja que es fase aguda (reposo): el 40 %. El resto, hasta el alta, es rehabilitación. */
export const PARTE_AGUDA = 0.4;
/** Los días de la fase de vuelta tras el alta (con riesgo de recaída), según el tipo. */
export const DIAS_DE_VUELTA: Readonly<Record<TipoDeLesion | 'antigua', number>> = { golpe: 7, esguince: 28, muscular: 42, sobrecarga: 42, fractura: 28, conmocion: 14, ligamento: 56, otras: 7, antigua: 28 };

/** La fase en que está quien tiene esta lesión (siempre aguda o rehabilitación; `vuelta` es la de después del alta, que se sigue con los días desde el alta, `faseTrasElAlta`). */
export function faseDeLesion(l: Lesion): FaseDeLesion {
  const hechos = l.n > 0 ? (l.n - l.d) / l.n : 1;
  return hechos < PARTE_AGUDA ? 'aguda' : 'rehabilitacion';
}

/** La fase de quien ya está de alta: `vuelta` mientras duran los días de vuelta de ese tipo; después, `undefined` (del todo bien). */
export const faseTrasElAlta = (tipo: TipoDeLesion | 'antigua', diasDesdeElAlta: number): FaseDeLesion | undefined => (diasDesdeElAlta >= 0 && diasDesdeElAlta < DIAS_DE_VUELTA[tipo] ? 'vuelta' : undefined);

/** Qué se puede hacer en cada fase: la aguda, nada físico; la rehabilitación, entrenar sin contacto (rinde ×0,6 y no cuenta como sesión de club) pero no jugar; la vuelta, todo. */
export const EFECTO_DE_FASE: Readonly<Record<FaseDeLesion, { fisico: boolean; sinContacto: boolean; jugar: boolean; rendimiento: number }>> = {
  aguda: { fisico: false, sinContacto: false, jugar: false, rendimiento: 0 },
  rehabilitacion: { fisico: false, sinContacto: true, jugar: false, rendimiento: 0.6 },
  vuelta: { fisico: true, sinContacto: true, jugar: true, rendimiento: 1 },
};

// ---------------------------------------------------------------------------------------------------- recaída

/** La probabilidad de recaer en las 8 semanas tras el alta, por tipo (un tirón muscular ronda el 12 %). Se reparte con un riesgo diario que baja linealmente hasta cero. */
export const RECAIDA_EN_8_SEMANAS: Readonly<Record<TipoDeLesion | 'antigua', number>> = { golpe: 0.02, esguince: 0.08, muscular: 0.12, sobrecarga: 0.15, fractura: 0.01, conmocion: 0.03, ligamento: 0.05, otras: 0.01, antigua: 0.05 };
/** Los días en que dura el riesgo de recaída tras el alta (8 semanas). */
export const VENTANA_DE_RECAIDA = 56;
/** Forzar la vuelta antes de tiempo triplica el riesgo de recaída. */
export const FACTOR_DE_RECAIDA_FORZADA = 3;

/** El riesgo de recaer hoy, a `diasDesdeElAlta` días del alta: baja linealmente y la suma de todos los días da la probabilidad de la tabla. Pasados los 56 días, 0. */
export function riesgoDiarioDeRecaida(tipo: TipoDeLesion | 'antigua', diasDesdeElAlta: number, forzado = false): number {
  if (diasDesdeElAlta < 0 || diasDesdeElAlta >= VENTANA_DE_RECAIDA) return 0;
  const p = RECAIDA_EN_8_SEMANAS[tipo] * (forzado ? FACTOR_DE_RECAIDA_FORZADA : 1);
  return (2 * p * (1 - diasDesdeElAlta / VENTANA_DE_RECAIDA)) / VENTANA_DE_RECAIDA;
}

/** Una recaída es una lesión nueva del mismo tipo y zona, con la duración del tipo más un 30 % (`azar` de 0 a 1 para la gravedad). */
export function recaida(anterior: LesionCurada, azarGravedad: number, p: Pick<PersonaDeRiesgo, 'constitucion' | 'salud' | 'perks'>, atencion: AtencionDeLesion = {}): Lesion {
  const tipo: TipoDeLesion = anterior.t === 'antigua' ? 'muscular' : anterior.t;
  const d = Math.max(1, Math.round(duracionDeLesion(tipo, azarGravedad, p, atencion) * 1.3));
  return { t: tipo, z: anterior.z, d, n: d };
}

// ---------------------------------------------------------------------------------------------------- secuelas (se activan en F7)

/** La baja a partir de la que una lesión es grave: más de 28 días. */
export const DIAS_DE_LESION_GRAVE = 28;

/** Lo que deja una lesión grave: algo menos de constitución y, a veces, un perk latente (por su id, que se crea en F7). */
export interface Secuela {
  /** Puntos de constitución que se pierden (−1 a −3). */
  constitucion: number;
  /** El perk latente que sale, si sale: `rodilla_delicada`, `tobillo_fragil`… (aún no está en `perks.ts`). */
  perkLatente?: string;
}

/** Perks latentes sugeridos por zona (F7: hay que crearlos en `perks.ts`). */
export const PERK_DE_SECUELA_POR_ZONA: Readonly<Partial<Record<ZonaDelCuerpo, string>>> = { rodilla: 'rodilla_delicada', tobillo: 'tobillo_fragil', espalda: 'espalda_delicada' };

/** La probabilidad de que una lesión deje secuela: ninguna si no es grave (28 días o menos) y, si lo es, `0,08 + 0,0015 × (días − 28)` hasta un 50 % (un cruzado de 270 días, ~44 %; una fractura de 60, ~13 %). */
export const probabilidadDeSecuela = (diasDeBaja: number): number => (diasDeBaja > DIAS_DE_LESION_GRAVE ? Math.min(0.5, 0.08 + 0.0015 * (diasDeBaja - DIAS_DE_LESION_GRAVE)) : 0);

/**
 * Si la lesión deja secuela y cuál: `azarSecuela` decide si la hay (por probabilidad: no siempre); si la hay, la constitución perdida sale de lo larga que fue (29–59 días, −1; 60–119, −2; 120 o más, −3)
 * y, con `azarPerk` por debajo de 0,4 y una zona con perk sugerido, también un perk latente. Sin secuela, `undefined`.
 */
export function secuelaDeLesion(l: Pick<Lesion, 'z' | 'n'>, azarSecuela: number, azarPerk: number): Secuela | undefined {
  if (azarSecuela >= probabilidadDeSecuela(l.n)) return undefined;
  const constitucion = l.n >= 120 ? -3 : l.n >= 60 ? -2 : -1;
  const perk = PERK_DE_SECUELA_POR_ZONA[l.z];
  return azarPerk < 0.4 && perk ? { constitucion, perkLatente: perk } : { constitucion };
}

// ---------------------------------------------------------------------------------------------------- atención médica: el club y la clínica

/**
 * La atención de un club: **solo los clubes grandes tienen fisio incluido**; en el resto (y sin club) se va a una clínica privada (tiempo ahora, dinero cuando haya economía, E16). La prevención del
 * club (calentamiento, preparación) baja el riesgo: ×0,8 en el grande con fisio y ×0,9 en el mediano (provisional; FIFA 11+ da −30 %: Soligard 2008).
 */
export interface AtencionDelClub {
  fisioIncluido: boolean;
  /** Multiplica el riesgo de lesionarse. */
  prevencion: number;
}
export const ATENCION_POR_TAMANO: Readonly<Record<TamanoDeClub, AtencionDelClub>> = {
  grande: { fisioIncluido: true, prevencion: 0.8 },
  mediano: { fisioIncluido: false, prevencion: 0.9 },
  pequeno: { fisioIncluido: false, prevencion: 1 },
};
export const atencionDelClub = (tamano: TamanoDeClub | undefined): AtencionDelClub => (tamano ? ATENCION_POR_TAMANO[tamano] : { fisioIncluido: false, prevencion: 1 });

/** Lo que cuesta ir al médico o al fisio fuera del club: minutos de la acción (el dinero llegará con la economía; `undefined` mientras tanto). */
export const COSTE_DE_ATENCION = { medico: { minutos: 60, dinero: undefined }, fisio: { minutos: 60, dinero: undefined } } as const;

// ---------------------------------------------------------------------------------------------------- la migración de las partidas guardadas (se conecta en la F3)

/**
 * Una partida guardada con la baja en semanas (`EstadoDeJugador.baja`, `gen.baja`) pasa a días: `d = 7 × semanas`, de tipo `'antigua'` y zona `'cuerpo'`. Las semanas se derivan después de los días
 * (`semanasDeBaja`), así que quien las lee no nota el cambio. **Se llama desde el `alCargar` de `npcs` (y del personaje) en la F3**, junto con la subida de `SAVE_VERSION`; hasta entonces no se usa.
 */
export function migrarBaja(semanas: number | undefined): Lesion | undefined {
  if (!semanas || semanas <= 0) return undefined;
  const d = Math.round(7 * semanas);
  return { t: 'antigua', z: 'cuerpo', d, n: d };
}
