import type { ActionContext, ReadContext } from './context';
import type { StatId } from './stats';

/**
 * Una acción cuesta tiempo de juego. Todas pasan por el mismo pipeline:
 * requisitos → modificadores → coste → entrenamiento → `run` → avance del tiempo → eventos.
 */
export interface ActionDef {
  /** `<idModulo>.<nombre>` */
  id: string;
  /** Puede depender de la partida (p. ej. el nombre del campeonato del país). */
  name: string | ((ctx: ReadContext) => string);
  description?: string | ((ctx: ReadContext) => string);
  /**
   * Etiquetas: el lenguaje común entre módulos. Los modificadores se enganchan a etiquetas,
   * nunca a ids concretos. Ej.: `fisico`, `mental`, `social`, `estudio`, `entrenamiento`, `ocio`.
   */
  tags: string[];
  /** Duración base en minutos de juego. */
  duration: number | ((ctx: ReadContext) => number);
  /**
   * Cambios directos en stats. Un valor negativo sobre una stat `resource` (energía) es un coste:
   * se escala con los modificadores de coste y bloquea la acción si no alcanza.
   */
  delta?: Record<StatId, number>;
  /** Requisitos mínimos/máximos de stats. */
  requires?: { stat: StatId; min?: number; max?: number; label?: string }[];
  /** Condición libre. Devuelve `true` o el motivo por el que no está disponible. */
  available?: (ctx: ReadContext) => true | string;
  /** Entrenamiento. `amount` = puntos que ganaría un personaje a nivel 0 con eficiencia 1. */
  train?: { stat: StatId; amount: number }[];
  /** Lógica adicional (examen, carrera, relación...). */
  run?: (ctx: ActionContext) => void;
  /** Grupo visual en la interfaz. Por defecto, el nombre del módulo. */
  group?: string;
  /**
   * Dónde se hace (ids de `lugares`; el primero es el sitio al que va quien quiere hacerla). Es solo información: quien la declara
   * debe además exigirlo en `available` (ver `conLugar`, en contracts). Sin esto, la acción vale en cualquier parte.
   */
  lugar?: readonly string[] | ((ctx: ReadContext) => readonly string[]);
  /**
   * Agrupación en la lista: las acciones del mismo `group` con el mismo `desplegable.id` salen como UN solo botón (`nombre`, «Entrenar…») que abre un desplegable con ellas
   * (cada una, con su nombre, su duración y, si no está disponible, su motivo). Las acciones siguen existiendo con su id: solo cambia cómo las dibuja la interfaz. Si en toda la lista solo hay una
   * acción con ese desplegable (un deporte instalado, no dos), se dibuja como un botón normal.
   */
  desplegable?: DesplegableDeAcciones;
  /**
   * ¿Se puede cortar si pisa una obligación? (clase, entrenamiento, partido, plan acordado: lo que declaran los módulos con `GameModule.obligaciones`).
   * Si faltan menos minutos para la próxima obligación que lo que dura la acción, dura solo los que faltan y todo lo que sube o gasta se
   * reduce en proporción (el motor lo hace: `corte` en la previsión). Sí: charlar, estudiar, entrenar por libre, ocio. No: viajes, partidos, exámenes,
   * pruebas, dormir y lo que no tiene sentido a medias (una tutoría, tener un detalle, aceptar plaza). Por defecto, no.
   */
  cortable?: boolean;
}

/**
 * Algo a lo que hay que llegar a tiempo (clase, sesión del club, convocatoria de un partido, plan acordado). Lo declara cada módulo que lleva
 * obligaciones (`GameModule.obligaciones`) y el motor solo sabe que existen: una acción `cortable` no se pasa de `hasta`.
 */
export interface Obligacion {
  /** Minuto absoluto de la partida hasta el que se puede dedicar el tiempo a otra cosa: el inicio de la obligación menos lo que cuesta llegar hasta ella desde donde se está. */
  hasta: number;
  /** Cómo se lo cuenta el jugador, completando «(…)» junto a la duración: «entras a clase a las 9:00». */
  texto: string;
}

/** Cuando una acción se ha cortado porque pisaba una obligación (lo que ve el jugador antes de hacerla). */
export interface CorteDeAccion {
  /** Lo que habría durado entera. */
  deMinutos: number;
  /** Lo que durará: los minutos que faltan. */
  minutos: number;
  /** Qué parte del efecto se aplica (minutos / deMinutos). */
  parte: number;
  texto: string;
}

/** Cómo se agrupan varias acciones en un solo botón con desplegable (dato; la interfaz no sabe de qué trata). */
export interface DesplegableDeAcciones {
  /** Identifica el grupo (único dentro del `group` de la acción), p. ej. `atletismo.entrenar`. */
  id: string;
  /** El texto del botón que lo abre: «Entrenar…». */
  nombre: string;
  /** Lo que se elige en el desplegable («Entrenamiento»). */
  etiqueta: string;
  /** El texto del botón que lanza la elegida: `{opcion}` es lo elegido en minúscula (su `opcion`, o su nombre) y `{nombre}` es el nombre completo de la acción, tal cual («Estudiar lengua»). */
  boton: string;
  /** Cómo se llama esta acción dentro del desplegable («Lengua», «Fútbol»), si el nombre de la acción es largo o repite lo que ya dice el botón. Por defecto, su nombre. */
  opcion?: string;
}

/** Lo que el motor sabe de una acción cuando evalúa modificadores. */
export interface ActionView {
  id: string;
  module: string;
  tags: readonly string[];
}
