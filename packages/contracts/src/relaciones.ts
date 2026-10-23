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

export interface RelationsService {
  /** Vínculo con una persona, o `undefined` si el personaje aún no la conoce. */
  get(npcId: string): RelationView | undefined;
  /** Todos los vínculos con personas que el personaje conoce. */
  list(): RelationView[];
}
