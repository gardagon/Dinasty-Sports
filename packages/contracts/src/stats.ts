/**
 * Características del personaje.
 *
 * Convención de ids: `<idModulo>.<nombre>`, p. ej. `gen.fuerza`, `estudios.matematicas`.
 * El registro rechaza ids que no empiecen por el id del módulo que los declara.
 */
export type StatId = string;

/**
 * - `generica`: base física/mental/social que apoya a todas las habilidades (gen.*).
 * - `estado`: recursos que suben y bajan constantemente (energía, estrés...). No usan progresión.
 * - `habilidad`: específicas de un módulo (un deporte, una asignatura...).
 */
export type StatCategory = 'generica' | 'estado' | 'habilidad';

/** Influencia de otra característica (normalmente genérica) sobre esta. */
export interface StatInfluence {
  stat: StatId;
  /** Peso aplicado sobre el valor normalizado 0..1 de `stat`. */
  weight: number;
}

/** Cómo sube una característica cuando se entrena. */
export interface GrowthDef {
  /** Multiplicador global de ganancia. Por defecto 1. */
  rate?: number;
  /** Exponente de rendimientos decrecientes al acercarse al techo. Por defecto 1.5. */
  curve?: number;
  /** Características que aceleran (o frenan) la ganancia. Centradas en 0.5: una genérica media es neutra. */
  speedFrom?: StatInfluence[];
  /**
   * Techo alcanzable = max × (base + Σ peso × valorNormalizado).
   * Si no se define, el techo es `max`.
   */
  cap?: { base: number; from?: StatInfluence[] };
}

/** Cómo cae una característica cuando no se practica. */
export interface DecayDef {
  /** Días sin practicar antes de empezar a caer. */
  graceDays: number;
  /** Fracción de la distancia al suelo que se pierde cada día. */
  ratePerDay: number;
  /** Suelo = máximo alcanzado × floorRatio ("memoria muscular"). Nunca baja del valor inicial. */
  floorRatio: number;
}

export interface StatDef {
  id: StatId;
  name: string;
  category: StatCategory;
  description?: string;
  min?: number;
  max?: number;
  /** Valor inicial fijo o rango aleatorio (con la semilla de la partida). */
  initial: number | { min: number; max: number };
  /** Dispersión del talento oculto (multiplicador 1 ± spread). Por defecto 0.15; 0 = sin talento. */
  talentSpread?: number;
  growth?: GrowthDef;
  decay?: DecayDef;
  /**
   * Recurso que se consume (p. ej. energía). Un delta negativo sobre un recurso es un COSTE:
   * se escala con los modificadores de coste y bloquea la acción si no hay suficiente.
   * En el resto de stats un delta negativo es simplemente un cambio (p. ej. bajar el estrés).
   */
  resource?: boolean;
  /** Grupo visual en la interfaz (p. ej. "Físico", "Mental"). */
  group?: string;
  hidden?: boolean;
}
