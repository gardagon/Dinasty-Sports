import type { Gender } from './services';

/**
 * Estados de un vínculo. La relación con cada persona es una escala con positivos y negativos que arranca en 0
 * ("conocido"): todo el que aparece ya se conoce, y por sí solo nada baja de ahí a "desconocido". Los vínculos
 * positivos se enfrían hacia "conocido"; los negativos solo se suavizan hasta la primera antipatía (nivel −1) y
 * no vuelven a conocido sin reconciliarse.
 */
export type EstadoVinculo = 'antagonista' | 'enemigo' | 'antipatia' | 'conocido' | 'amigo' | 'mejor_amigo';

export const NIVEL_ESTADO: Record<EstadoVinculo, number> = {
  antagonista: -3,
  enemigo: -2,
  antipatia: -1,
  conocido: 0,
  amigo: 1,
  mejor_amigo: 2,
};

/** [femenino, masculino]. Los textos concuerdan con el género de la otra persona. */
const NOMBRE_ESTADO: Record<EstadoVinculo, readonly [string, string]> = {
  antagonista: ['Antagonista', 'Antagonista'],
  enemigo: ['Enemiga', 'Enemigo'],
  antipatia: ['Antipática', 'Antipático'],
  conocido: ['Conocida', 'Conocido'],
  amigo: ['Amiga', 'Amigo'],
  mejor_amigo: ['Mejor amiga', 'Mejor amigo'],
};

export const nombreEstado = (estado: EstadoVinculo, gender: Gender): string => NOMBRE_ESTADO[estado][gender === 'f' ? 0 : 1];

export const AFINIDAD_MIN = -100;
export const AFINIDAD_MAX = 100;

export interface RelationView {
  npcId: string;
  estado: EstadoVinculo;
  /** −3 a 2 (ver `NIVEL_ESTADO`). */
  nivel: number;
  /** −100..100. Los umbrales entre estados son internos: la interfaz los enseña solo en desarrollo. */
  afinidad: number;
  /** 0..100. Cuánto se fía el personaje de esta persona. */
  confianza: number;
  /** Día del último contacto, o −1 si aún no ha habido ninguno. */
  ultimoContacto: number;
}

/** Un plan acordado con alguien: qué, qué día (absoluto), a qué hora (minuto del día) y dónde. */
export interface PlanView {
  npcId: string;
  actividad: string;
  dia: number;
  minuto: number;
  lugar: string;
  /** Cómo se llama lo que se hace («estudiar», «pasar el rato»). */
  nombre: string;
  /** Id de la acción que cancela este plan. */
  cancelar: string;
}

/** Cuándo es un plan: hoy o mañana. */
export type CuandoDePlan = 'hoy' | 'manana';

/**
 * Lo que se puede elegir al proponer un plan a alguien: la actividad, el sitio y, según el día, las horas posibles (las que deja el horario del sitio).
 * Son los desplegables de «Proponer quedar para…»; la otra persona acepta o no al recibir la propuesta.
 */
export interface FormularioDePlan {
  /** Si ahora no se le puede proponer nada (no está aquí, no es momento de preguntar), por qué. */
  motivo?: string;
  actividades: {
    id: string;
    nombre: string;
    /** Lo que dura (minutos). */
    duracion: number;
    lugares: {
      id: string;
      /** «en tu casa», «en la biblioteca». */
      texto: string;
      dias: Record<CuandoDePlan, { /** Minutos del día en que puede empezar. */ horas: number[]; /** Por qué no hay horas (cerrado, ya quedasteis, ya se lo propusiste). */ motivo?: string }>;
    }[];
  }[];
}

/** El id de la acción de proponer un plan: `relaciones.proponer.<persona>.<actividad>.<lugar>.<hoy|manana>.<minuto del día>`. */
export const idDeProponerPlan = (npcId: string, actividad: string, lugar: string, cuando: CuandoDePlan, minuto: number): string =>
  `relaciones.proponer.${npcId}.${actividad}.${lugar}.${cuando}.${minuto}`;

export interface RelationsService {
  /** Lo que se puede elegir al proponerle un plan a esta persona. */
  formularioDePlan(npcId: string): FormularioDePlan;
  /** Planes acordados que todavía no han llegado (hoy o más adelante). */
  planes(): PlanView[];
  /** Vínculo con una persona, o `undefined` si el personaje aún no la conoce. */
  get(npcId: string): RelationView | undefined;
  /** Todos los vínculos con personas que el personaje conoce. */
  list(): RelationView[];
}
