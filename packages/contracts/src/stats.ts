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
 * - `conocimiento`: comprensión de un deporte (táctica, rivales, ritmos). Progresa como una habilidad,
 *   pero no es una habilidad: actúa como bonus o malus sobre las acciones del deporte y se olvida muy despacio.
 */
export type StatCategory = 'generica' | 'estado' | 'habilidad' | 'conocimiento';

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

/**
 * Tope genético de una característica. Hay dos formas:
 * - Directa (sin `derivedFrom`): se hereda de los padres, que tienen un perfil de topes (ver `herencia.ts`).
 * - Derivada: no se hereda, sale de la media ponderada de los topes de otras características (p. ej. una
 *   asignatura de la inteligencia y la concentración) más una aptitud propia de la característica.
 */
export interface GeneticsDef {
  /** Categoría de la capacidad (p. ej. `fisico`, `mental`, `social`): los padres concentran sus puntos fuertes por categorías. */
  grupo?: string;
  derivedFrom?: StatInfluence[];
  /** Solo con `derivedFrom`: aptitud propia, como variación ± sobre el tope derivado (0,1 = ±10 %). Por defecto 0,1. */
  aptitude?: number;
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
  /**
   * Tope genético individual (oculto). Se fija al crear la partida y hace dos cosas: ninguna capacidad pasa de
   * él y, a igual entrenamiento, quien tiene un tope más alto sube más rápido. Sale de la herencia de los padres
   * (capacidades) o de otros topes (habilidades y asignaturas, con `derivedFrom`).
   */
  genetics?: GeneticsDef;
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
